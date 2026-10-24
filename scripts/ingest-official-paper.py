#!/usr/bin/env python3
# ingest-official-paper.py: QP + answer-key PDFs -> verified papers.json.
#
# For each sources entry with qpUrl+keyUrl and status in (need-ingest,
# partial): download both, parse, join, strictly validate, and write ONLY
# fully-verified questions into papers.json. Anything uncertain is dropped
# with a logged reason — a partial honest paper beats complete fiction.
#
# Provenance carried per question: pyqExam, pyqYear, officialPdf (QP URL),
# source=official-pyq. Verified entries SUPERSEDE overlapping unverified
# paper questions (keeping their 27B explanations when present).
# English-only: Hindi pages extract as mojibake (font encoding) and are
# excluded by letter-density gating.
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, 'data', 'official-paper-sources.json')
PAPERS = os.path.join(ROOT, 'data', 'papers.json')
TMP = os.environ.get('TMPDIR', '/tmp')
UA = {'User-Agent': 'dimsred-paper-ingest/1.0 (educational archive)'}


def log(m):
    print('ingest: ' + m, flush=True)


def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        while True:
            chunk = r.read(1024 * 256)
            if not chunk:
                break
            f.write(chunk)
    return dest


def eng_ratio(t):
    if not t:
        return 0.0
    letters = sum(1 for c in t if c.isascii() and c.isalpha())
    return letters / max(1, len(t))


def clean(s):
    s = re.sub(r'\s+', ' ', s or '').strip()
    # UPSC booklet codes leak inline (XDTG-F-GST/6~A etc.)
    s = re.sub(r'\b[A-Z]{3,5}-[A-Z]-[A-Z]{2,5}/\S*', '', s)
    # Page-turn markers leak into options, often unclosed: (P.T.O. I I I .
    # Cut everything from the marker (it is always trailing junk).
    s = re.sub(r'\(P\.T\.O\..*$', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def parse_qp(pdf_path):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    pages = []  # (text, has_images)
    for p in reader.pages:
        try:
            t = p.extract_text() or ''
        except Exception:
            t = ''
        try:
            has_img = len(p.images) > 0
        except Exception:
            has_img = False
        pages.append((t, has_img))
    # English pages only.
    eng = [(t, img) for (t, img) in pages if t and eng_ratio(t) >= 0.6]
    if not eng:
        return None, 'no-english-pages'
    # Booklet set letter (needed to pick the right key column). It can sit
    # anywhere (cover, last page: "Series \nA") so search all English text.
    # No letter = no join (guessing a set risks 100 wrong answers).
    joined_all = '\n'.join(t for (t, _) in eng)
    set_m = re.search(r'(?:SET|Series|TEST BOOKLET SERIES)\s*[-:]?\s*([A-D])\b', joined_all, re.I)
    booklet_set = set_m.group(1).upper() if set_m else None
    # Char offsets -> page index, for image-dependence checks. Furniture
    # (booklet codes, standalone page numbers, blank lines) is stripped PER
    # PAGE first so ^N anchoring survives and offsets stay valid.
    text = ''
    spans = []  # (start, end, has_images)
    for (t, img) in eng:
        keep = []
        for ln in t.split('\n'):
            s = ln.strip()
            if not s:
                continue
            if re.match(r'^[A-Z]{2,}-[A-Z][-\w/]*.*$', s):
                continue
            if re.match(r'^\d{1,3}$', s):
                continue
            keep.append(ln)
        ct = '\n'.join(keep)
        s = len(text)
        text += ct + '\n'
        spans.append((s, len(text), img))

    def page_has_image(a, b):
        for (s, e, img) in spans:
            if img and not (e <= a or s >= b):
                return True
        return False

    parts = re.split(r'(?m)^(\d{1,3})\.\s', text)
    # --- Question assembly: stems OPEN, sub-segments ACCUMULATE, option
    # blocks CLOSE. UPSC anatomy: "N. <stem>" + "1./2./3. <subs>" + "<last
    # sub> How many...? (a)..(d)". Stems carry NO options; options arrive
    # ONLY in the terminal segment (small sub-number, not N).
    # Numbering is MONOTONIC, never expect-tracked (expectations freeze on a
    # single glitch; monotonicity cannot freeze): every kept question carries
    # a number strictly greater than the last kept one, so the key join can
    # never misalign. Anything violating that is skipped, never guessed.
    questions = []
    VISUAL = re.compile(r'\b(map|figure|diagram|chart|table|picture|given below|shown below)\b', re.I)
    last_kept = 0
    open_num = None
    open_chunks = []
    dropped = 0

    def has_opts(body):
        return all(('(%s)' % L) in body for L in 'abcd')

    def assemble(num, chunks):
        body = '\n'.join(chunks)
        om = re.search(r'\(a\)(.*?)\(b\)(.*?)\(c\)(.*?)\(d\)(.*)', body, re.S)
        if not om:
            return None
        stem = clean(body[:om.start()])
        opts = [clean(om.group(g)) for g in range(1, 5)]
        tail = clean(body[om.end():])
        # Tail is usually a booklet footer; fold in ONLY when clearly so
        # (short, no question mark) so glued neighbor text can never pollute.
        if tail and len(tail) < 80 and '?' not in tail:
            stem = clean(stem + ' ' + tail.split('XDTG')[0])
        if len(stem) < 30 or len(stem) > 1500:
            return None
        if eng_ratio(stem) < 0.6:
            return None
        if any(len(o) < 2 or len(o) > 400 for o in opts):
            return None
        return {'n': num, 'q': stem, 'options': opts, 'body': body}

    # Linearize into a mutable stream: embedded splits insert recovered
    # segments back into it (see below).
    segs = []
    for k in range(1, len(parts) - 1, 2):
        try:
            segs.append([int(parts[k]), parts[k + 1]])
        except ValueError:
            continue
    idx = 0
    while idx < len(segs):
        num, body = segs[idx]
        # Embedded-question split: one block hiding TWO full questions (a
        # question number glued mid-line after the previous option group, so
        # the second question never split out). Detect ONLY when the block
        # holds 2+ complete option groups AND a question start whose number
        # is just past the last kept one exists between them. Statement
        # sub-numbers fail the range test (they sit at/below last_kept);
        # annexures fail it too (far ahead).
        if body.count('(a)') >= 2:
            m1 = re.search(r'\(a\)(.*?)\(b\)(.*?)\(c\)(.*?)\(d\)', body, re.S)
            if m1:
                after1 = body[m1.end():]
                for m in re.finditer(r'(\d{1,3})\.\s+', after1):
                    cand = int(m.group(1))
                    if cand > last_kept and cand <= last_kept + 8:
                        rest = after1[m.end():]
                        if re.search(r'\(a\).*?\(b\).*?\(c\).*?\(d\)', rest, re.S):
                            cut = m1.end() + m.start()
                            tail = body[cut:]
                            body = body[:cut]
                            segs[idx][1] = body
                            segs.insert(idx + 1, [cand, tail])
                            print('ingest: note: split embedded Q%d out of prior block' % cand, flush=True)
                            break
                # fall through to normal processing of (possibly split) body
        # Second paper/section starting over: stop, ignore the rest.
        if num == 1 and len(questions) >= 20 and open_num is None:
            break
        if has_opts(body):
            if open_num is not None:
                done = assemble(open_num, open_chunks + [body])
                if done and done['n'] > last_kept:
                    questions.append(done)
                    last_kept = done['n']
                else:
                    dropped += 1
                open_num, open_chunks = None, []
            elif num > last_kept and num <= last_kept + 3:
                # Single-segment question (stem + options together).
                done = assemble(num, [body])
                if done and done['n'] > last_kept:
                    questions.append(done)
                    last_kept = done['n']
                else:
                    dropped += 1
            else:
                # Orphan options block: skip (stem garbled beyond numbering,
                # or a tail whose stem was dropped). Monotonic kept-numbers
                # guarantee neighbors hold alignment for the key join.
                dropped += 1
        else:
            if open_num is not None:
                open_chunks.append(body)
            else:
                # Optimistic open: any numbered block may be a stem. If wrong
                # (instructions/front-matter), completion fails validation and
                # only that block is lost - never a freeze, never misalignment
                # (monotonicity enforced on every append above).
                open_num, open_chunks = num, [body]
        idx += 1
    # Validate: first kept at 1..3 (front-matter pollution may cost Q1/Q2),
    # long, strictly increasing (enforced above, so the key join is exact).
    # Gaps inside are fine - the join is by number, never position.
    if not questions or questions[0]['n'] > 3 or len(questions) < 85:
        return None, 'no-sequential-run:%d' % len(questions)
    # Image-dependence: visual reference + images on spanned pages = drop.
    kept = []
    for q in questions:
        abs_pos = text.find(q['body'][:60])
        if VISUAL.search(q['q']) and abs_pos != -1 and page_has_image(abs_pos, abs_pos + len(q['body'])):
            dropped += 1
            continue
        del q['body']
        kept.append(q)
    if len(kept) < 50:
        return None, 'too-few-questions:%d' % len(kept)
    if dropped:
        print('ingest: note: %d blocks dropped (garbled options)' % dropped, flush=True)
    return {'set': booklet_set, 'questions': kept}, None


def parse_key(pdf_path):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    text = '\n'.join([(p.extract_text() or '') for p in reader.pages])
    # Per-series sections: "Series A" ... tables of Q.No./Key pairs.
    sections = re.split(r'Series\s+([A-D])\b', text, flags=re.I)
    # sections[0] = preamble, then (letter, body) pairs.
    tables = {}
    for k in range(1, len(sections) - 1, 2):
        letter = sections[k].upper()
        body = sections[k + 1]
        pairs = re.findall(r'(\d{1,3})\s+([A-Da-dxX])\b', body)
        mp = {}
        for num, ans in pairs:
            a = ans.upper()
            if a == 'X':
                mp[int(num)] = 'X'
            elif a in 'ABCD':
                # First occurrence wins (tables repeat across pages).
                mp.setdefault(int(num), a)
        if len(mp) >= 50:
            tables[letter] = mp
    if not tables:
        # Fallback: whole-document pairs (single-set key).
        mp = {}
        for num, ans in re.findall(r'(\d{1,3})\s+([A-Da-dxX])\b', text):
            a = ans.upper()
            mp.setdefault(int(num), a if a in 'ABCDX' else None)
        mp = {k: v for k, v in mp.items() if v}
        if len(mp) >= 50:
            tables['?'] = mp
    if not tables:
        return None, 'no-key-table'
    return tables, None


def word_overlap(a, b):
    wa = [w for w in re.sub(r'[^a-z ]', '', (a or '').lower()).split() if len(w) > 3]
    if not wa:
        return 0.0
    sb = set(re.sub(r'[^a-z ]', '', (b or '').lower()).split())
    return sum(1 for w in wa if w in sb) / len(wa)


def main():
    with open(SOURCES, encoding='utf-8') as f:
        reg = json.load(f)
    with open(PAPERS, encoding='utf-8') as f:
        papers = json.load(f)
    if not isinstance(papers.get('papers'), list):
        papers['papers'] = []
    by_id = {p.get('id'): p for p in papers['papers']}
    changed = False
    for entry in reg.get('papers', []):
        if entry.get('status') == 'done':
            continue
        qp, key = entry.get('qpUrl'), entry.get('keyUrl')
        if not qp or not key:
            continue
        pid = entry.get('id')
        log('ingesting %s (%s)' % (pid, entry.get('exam', '')))
        os.makedirs(TMP, exist_ok=True)
        qp_path = os.path.join(TMP, 'qp-%s.pdf' % pid)
        key_path = os.path.join(TMP, 'key-%s.pdf' % pid)
        try:
            download(qp, qp_path)
            download(key, key_path)
        except Exception as e:
            log('%s download failed: %s' % (pid, str(e)[:120]))
            continue
        qp, qerr = parse_qp(qp_path)
        if qerr:
            log('%s QP parse failed: %s' % (pid, qerr))
            entry['status'] = 'qp-failed'
            entry['note'] = qerr
            changed = True
            continue
        keys, kerr = parse_key(key_path)
        if kerr:
            log('%s key parse failed: %s' % (pid, kerr))
            entry['status'] = 'key-failed'
            entry['note'] = kerr
            changed = True
            continue
        # Pick the key column for the QP's booklet set.
        bset = (qp.get('set') or '').upper()
        table = keys.get(bset) or keys.get('?')
        if table is None:
            log('%s booklet set %s not in key (have %s)' % (pid, bset or '?', ','.join(sorted(keys))))
            entry['status'] = 'set-mismatch'
            changed = True
            continue
        paper = by_id.get(pid)
        if paper is None:
            paper = {
                'id': pid, 'exam': entry.get('exam'), 'year': entry.get('year'),
                'paper': entry.get('paper', ''), 'totalQuestions': len(qp['questions']),
                'duration': entry.get('duration'), 'marks': entry.get('marks'),
                'cutoff': None, 'officialPdf': qp,
                'source': 'official-pyq', 'official': True, 'questions': []
            }
            papers['papers'].append(paper)
            by_id[pid] = paper
            changed = True
        have = {q.get('id') for q in (paper.get('questions') or []) if q and q.get('id')}
        added = replaced = skipped = 0
        for item in qp['questions']:
            ans = table.get(item['n'])
            if ans is None:
                skipped += 1  # no key row: unverifiable, never invent
                continue
            if ans == 'X':
                skipped += 1  # officially dropped from scoring
                continue
            idx = 'ABCD'.index(ans)
            if idx >= len(item['options']):
                skipped += 1
                continue
            qid = 'pyq-%s-%d' % (pid, item['n'])
            if qid in have:
                continue
            # Supersede overlapping unverified questions (keep their 27B work).
            old_explain = None
            for q in (paper.get('questions') or []):
                if not q.get('pyqExam') and word_overlap(item['q'], q.get('q', '')) > 0.7:
                    if q.get('explain') and len(q['explain']) >= 150:
                        old_explain = q['explain']
                    paper['questions'] = [x for x in paper['questions'] if x is not q]
                    replaced += 1
                    break
            paper['questions'].append({
                'n': item['n'],
                'id': qid,
                'q': item['q'],
                'options': item['options'],
                'subject': '',
                'answer': item['options'][idx],
                'pyqExam': entry.get('exam'),
                'pyqYear': entry.get('year'),
                'officialPdf': qp,
                'explain': old_explain,
            })
            have.add(qid)
            added += 1
        # Renumber sequentially, adopt PDF URL if unanimous (it is: single QP).
        paper['questions'].sort(key=lambda q: q.get('n', 0))
        for i, q in enumerate(paper['questions']):
            q['n'] = i + 1
        if not paper.get('officialPdf'):
            paper['officialPdf'] = qp
        entry['status'] = 'done' if added + replaced > 0 else 'partial'
        entry['ingestedAt'] = __import__('datetime').datetime.utcnow().strftime('%Y-%m-%d')
        entry['counts'] = {'added': added, 'replaced': replaced, 'skipped': skipped}
        changed = True
        log('%s: +%d verified, ~%d superseded, %d skipped' % (pid, added, replaced, skipped))
    if changed:
        with open(PAPERS, 'w', encoding='utf-8') as f:
            json.dump(papers, f, indent=1, ensure_ascii=False)
            f.write('\n')
        with open(SOURCES, 'w', encoding='utf-8') as f:
            json.dump(reg, f, indent=1, ensure_ascii=False)
            f.write('\n')
        print('papers + sources updated')
    else:
        print('nothing to ingest')


if __name__ == '__main__':
    main()

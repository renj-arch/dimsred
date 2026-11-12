#!/usr/bin/env python3
# solve-paper-agent.py: fetch an OFFICIAL question paper (QP) and let the
# workflow's local model solve it, batch by batch.
#
# Why this exists: the official-key ingestor (ingest-official-paper.py) can
# only ship answers it can parse from an official answer-key PDF. Several
# UPSC keys (e.g. CSP-2023) are scanned images with no text layer, so their
# questions could never be keyed. This script downloads the official QP
# (original paper — provenance kept), parses the questions, and asks the
# local Ollama model to answer each one. Every candidate is then gated by
# scripts/apply-paper-solve.js (Node) before anything reaches papers.json,
# and shipped items are labelled source=agent-solved (never "official").
#
# Idempotent: question numbers already present in papers.json for that paper
# id are skipped, so re-runs only fill the gaps.
#
# Usage: python scripts/solve-paper-agent.py [paper-id]
# Env:   OLLAMA_HOST (default http://127.0.0.1:11434)
#        OLLAMA_MODEL (default qwen3.5:9b)
#        SOLVE_BATCH (questions per LLM call, default 5)
#        SOLVE_DEADLINE_MIN (default 100)
import importlib.util
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, 'data', 'official-paper-sources.json')
PAPERS = os.path.join(ROOT, 'data', 'papers.json')
CANDIDATES = os.path.join(ROOT, 'data', 'paper-solve-candidates.json')
TMP = os.environ.get('TMPDIR', '/tmp')
HOST = (os.environ.get('OLLAMA_HOST') or 'http://127.0.0.1:11434').rstrip('/')
MODEL = os.environ.get('OLLAMA_MODEL') or 'qwen3.5:9b'
BATCH = int(os.environ.get('SOLVE_BATCH') or '5')
DEADLINE_MIN = float(os.environ.get('SOLVE_DEADLINE_MIN') or '100')
START = time.time()
UA = {'User-Agent': 'dimsred-paper-solve/1.0 (educational archive)'}


def log(m):
    print('solve: ' + m, flush=True)


def out_of_time():
    return (time.time() - START) / 60 > DEADLINE_MIN


# Reuse the proven QP parser from the ingestor (same file, loaded by path
# because the filename contains dashes).
def load_parser():
    spec = importlib.util.spec_from_file_location(
        'ingest_official_paper', os.path.join(ROOT, 'scripts', 'ingest-official-paper.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def valid_pdf(path):
    # A truncated Wayback stream still starts with %PDF-, so pypdf used to
    # crash with "Stream has ended unexpectedly" (run #41423475747). Check
    # the header, the trailer and a sane size BEFORE handing it to pypdf.
    try:
        size = os.path.getsize(path)
        if size < 4096:
            return False, 'too small (%d bytes)' % size
        with open(path, 'rb') as f:
            head = f.read(5)
            f.seek(max(0, size - 4096))
            tail = f.read()
    except OSError as ex:
        return False, str(ex)
    if head != b'%PDF-':
        return False, 'not a PDF (starts with %r)' % head
    if b'%%EOF' not in tail:
        return False, 'truncated PDF (no %%EOF trailer)'
    return True, ''


def download(url, dest, tries=4):
    # upsc.gov.in intermittently 504s; retry with backoff, then fall back to
    # the Wayback Machine snapshot of the exact same URL (run #41415587800
    # died on a single 504 with no retry).
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r, open(dest, 'wb') as f:
                while True:
                    chunk = r.read(1024 * 256)
                    if not chunk:
                        break
                    f.write(chunk)
            ok, why = valid_pdf(dest)
            if not ok:
                raise RuntimeError(why)
            return dest
        except Exception as ex:
            last = ex
            log('download attempt %d/%d for %s failed: %s' % (i + 1, tries, url, str(ex)[:100]))
            time.sleep(min(30, 5 * (i + 1)))
    try:
        wb = 'https://web.archive.org/web/2id_/' + url
        log('trying Wayback fallback for %s' % url)
        req = urllib.request.Request(wb, headers=UA)
        with urllib.request.urlopen(req, timeout=300) as r, open(dest, 'wb') as f:
            while True:
                chunk = r.read(1024 * 256)
                if not chunk:
                    break
                f.write(chunk)
        ok, why = valid_pdf(dest)
        if not ok:
            raise RuntimeError('Wayback copy is unusable: ' + why)
        return dest
    except Exception as ex:
        last = ex
    raise last


def call_llm(system, user, max_tokens=2048):
    payload = {
        'model': MODEL,
        'stream': False,
        'options': {'num_predict': max_tokens, 'temperature': 0.1},
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
    }
    req = urllib.request.Request(
        HOST + '/api/chat',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', **UA},
    )
    with urllib.request.urlopen(req, timeout=3600) as r:
        d = json.load(r)
    return ((d.get('message') or {}).get('content') or '').strip()


SYS = (
    'You are a veteran UPSC/govt-exam solver. You receive official exam '
    'questions with their four options. For EACH question, choose the single '
    'best option (A/B/C/D) and give a short worked solution. Reply with STRICT '
    'JSON only, no markdown fences: {"answers": [{"n": <question number>, '
    '"letter": "A"|"B"|"C"|"D", "solution": "2-6 lines of working"}]}. '
    'If a question is genuinely unanswerable from the text, use letter "X" '
    'and say why in the solution.'
)


def solve_batch(questions):
    lines = []
    for q in questions:
        opts = '\n'.join('  %s) %s' % (chr(65 + i), o) for i, o in enumerate(q['options']))
        lines.append('Q%d. %s\n%s' % (q['n'], q['q'], opts))
    user = 'Solve these official exam questions:\n\n' + '\n\n'.join(lines)
    txt = call_llm(SYS, user)
    s, e = txt.find('{'), txt.rfind('}')
    if s < 0 or e <= s:
        log('batch unparseable (no JSON) — skipping batch')
        return []
    try:
        j = json.loads(txt[s:e + 1])
    except Exception as ex:
        log('batch JSON error: %s' % str(ex)[:80])
        return []
    out = []
    for a in j.get('answers') or []:
        try:
            n = int(a.get('n'))
            letter = str(a.get('letter') or '').strip().upper()
            sol = re.sub(r'\s+', ' ', str(a.get('solution') or '')).strip()
            if letter in 'ABCD' and sol:
                out.append({'n': n, 'letter': letter, 'solution': sol})
        except Exception:
            continue
    return out


def main():
    want_id = sys.argv[1] if len(sys.argv) > 1 else None
    with open(SOURCES, encoding='utf-8') as f:
        reg = json.load(f)
    with open(PAPERS, encoding='utf-8') as f:
        papers = json.load(f)
    existing = {p.get('id'): p for p in papers.get('papers', [])}

    solved_ids = set()
    for p in papers.get('papers', []):
        for q in (p.get('questions') or []):
            if q.get('source') == 'agent-solved' and q.get('id'):
                solved_ids.add(q['id'])

    try:
        cand = json.load(open(CANDIDATES, encoding='utf-8'))
    except Exception:
        cand = {'candidates': []}
    known = {(c.get('paperId'), c.get('n')) for c in cand.get('candidates', [])}

    entries = [e for e in reg.get('papers', []) if e.get('qpUrl') and e.get('status') == 'need-solve']
    if want_id:
        entries = [e for e in entries if e.get('id') == want_id]
    if not entries:
        log('no papers with status need-solve (and qpUrl) — nothing to do')
        return

    entry = entries[0]
    pid = entry['id']
    log('solving %s (%s %s) model=%s batch=%d' % (pid, entry.get('exam'), entry.get('year'), MODEL, BATCH))

    os.makedirs(TMP, exist_ok=True)
    qp_path = os.path.join(TMP, 'solve-qp-%s.pdf' % pid)
    try:
        download(entry['qpUrl'], qp_path)
    except Exception as ex:
        log('QP download failed: %s' % str(ex)[:120])
        print('::warning::QP unavailable for %s; nothing solved, next run will retry' % pid)
        return

    parser = load_parser()
    try:
        qp, qerr = parser.parse_qp(qp_path, pid)
    except Exception as ex:
        # Never let a corrupt PDF take the workflow down: skip cleanly so the
        # QA gate and the next scheduled retry still run.
        log('QP parse crashed: %s' % str(ex)[:120])
        print('::warning::QP unreadable for %s; nothing solved, next run will retry' % pid)
        return
    if qerr:
        log('QP parse failed: %s' % qerr)
        print('::warning::QP unreadable for %s (%s); next run will retry' % (pid, qerr))
        return
    log('parsed %d questions (booklet set %s)' % (len(qp['questions']), qp.get('set')))

    todo = [q for q in qp['questions']
            if ('agentsolve-%s-%d' % (pid, q['n'])) not in solved_ids
            and (pid, q['n']) not in known]
    log('%d questions unsolved' % len(todo))

    added = 0
    for i in range(0, len(todo), BATCH):
        if out_of_time():
            log('deadline reached — stopping (progress saved)')
            break
        batch = todo[i:i + BATCH]
        log('batch %d-%d ...' % (batch[0]['n'], batch[-1]['n']))
        try:
            answers = solve_batch(batch)
        except Exception as ex:
            log('LLM call failed: %s' % str(ex)[:120])
            continue
        by_n = {a['n']: a for a in answers}
        for q in batch:
            a = by_n.get(q['n'])
            if not a:
                continue
            idx = 'ABCD'.index(a['letter'])
            if idx >= len(q['options']):
                continue
            cand['candidates'].append({
                'paperId': pid,
                'exam': entry.get('exam'),
                'year': entry.get('year'),
                'paper': entry.get('paper', ''),
                'qpUrl': entry['qpUrl'],
                'n': q['n'],
                'q': q['q'],
                'options': q['options'],
                'letter': a['letter'],
                'answer': q['options'][idx],
                'solution': a['solution'],
                'model': MODEL,
                'solvedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })
            added += 1
        # Save incrementally so a timeout keeps the progress.
        with open(CANDIDATES, 'w', encoding='utf-8') as f:
            json.dump(cand, f, indent=1, ensure_ascii=False)
            f.write('\n')
        log('batch done: +%d candidates (total %d)' % (len([a for a in answers]), len(cand['candidates'])))

    log('done: %d new candidates written to %s' % (added, CANDIDATES))


if __name__ == '__main__':
    main()
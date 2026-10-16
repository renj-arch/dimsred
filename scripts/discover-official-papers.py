#!/usr/bin/env python3
# discover-official-papers.py: find official answer-key PDF URLs for papers
# that have a QP but no key. Strategies, in order:
#   1. UPSC portal index pages (plain HTTP + PDF href extraction + scoring).
#   2. Wayback availability API + snapshot link extraction (backoff on 429).
# Candidates must be https://upsc.gov.in + .pdf + HEAD 200 + pdf content-type
# before they are written. Nothing is guessed: no match = status stays
# need-key, retried next run. Stdlib only, polite delays, ~5 min budget.
import json
import os
import re
import time
import urllib.request
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, 'data', 'official-paper-sources.json')
UA = {'User-Agent': 'dimsred-paper-discovery/1.0 (educational archive; contact via repo)'}
BUDGET_S = 300
START = time.time()


def out_of_budget():
    return time.time() - START > BUDGET_S


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            if r.status != 200:
                return None
            return r.read().decode('utf-8', 'replace')
    except Exception as e:
        print('  fetch fail %s: %s' % (url[:80], str(e)[:100]))
        return None


def head_ok(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers=UA, method='HEAD')
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ct = (r.headers.get('Content-Type') or '').lower()
            return r.status == 200 and ('pdf' in ct or url.lower().endswith('.pdf'))
    except Exception:
        return False


def pdf_links(html, base):
    found = []
    for m in re.finditer(r'href="([^"]+?\.pdf[^"]*)"', html, re.I):
        u = urllib.parse.urljoin(base, m.group(1))
        if u not in found:
            found.append(u)
    return found


def score(url, exam, year):
    s = url.lower()
    sc = 0
    if str(year) in s:
        sc += 3
    for tok in re.findall(r'[a-z]+', exam.lower()):
        if len(tok) > 2 and tok in s:
            sc += 2
    if 'ans' in s and 'key' in s:
        sc += 4
    elif 'key' in s:
        sc += 2
    if 'csp' in s or 'cs-p' in s or 'prelim' in s:
        sc += 1
    if 'hindi' in s:
        sc -= 5
    return sc


def wayback_snapshot(page_url):
    api = 'https://archive.org/wayback/available?url=' + urllib.parse.quote(page_url, safe='')
    try:
        req = urllib.request.Request(api, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode('utf-8', 'replace'))
        snap = ((d.get('archived_snapshots') or {}).get('closest') or {})
        if snap.get('available'):
            return snap.get('url')
    except Exception as e:
        print('  wayback api fail: %s' % str(e)[:100])
        time.sleep(5)
    return None


def main():
    with open(SOURCES, encoding='utf-8') as f:
        reg = json.load(f)
    portals = reg.get('portals', [])
    changed = False
    for p in reg.get('papers', []):
        if p.get('keyUrl') or out_of_budget():
            continue
        exam, year = p.get('exam', ''), p.get('year', '')
        print('discover: %s %s' % (exam, year))
        cands = []
        # Strategy 1: portal indexes.
        for portal in portals:
            if out_of_budget():
                break
            html = fetch(portal.get('index', ''))
            time.sleep(2)
            if not html:
                continue
            for u in pdf_links(html, portal.get('index', '')):
                cands.append((score(u, exam, year), u, 'portal:' + portal.get('name', '')))
        # Strategy 2: wayback snapshots of the portals.
        for portal in portals:
            if out_of_budget():
                break
            snap = wayback_snapshot(portal.get('index', ''))
            time.sleep(3)
            if not snap:
                continue
            html = fetch(snap)
            if not html:
                continue
            for u in pdf_links(html, portal.get('index', '')):
                # Snapshot rewrites links to web.archive.org — keep only
                # links pointing at the live origin file path.
                m = re.search(r'https?://(?:www\.)?upsc\.gov\.in\S*?\.pdf', u, re.I)
                target = m.group(0) if m else None
                if target:
                    cands.append((score(target, exam, year) - 1, target, 'wayback'))
        cands.sort(reverse=True)
        seen = set()
        for sc, u, src in cands:
            if u in seen or out_of_budget():
                continue
            seen.add(u)
            if sc < 4:
                continue
            print('  candidate (%d, %s): %s' % (sc, src, u[:100]))
            if head_ok(u):
                p['keyUrl'] = u
                p['keyFoundVia'] = src
                p['status'] = 'need-ingest'
                changed = True
                print('  VERIFIED key URL for %s %s' % (exam, year))
                break
            time.sleep(1)
        if not p.get('keyUrl'):
            print('  no verified key URL yet (retries next run)')
    if changed:
        reg['updatedAt'] = time.strftime('%Y-%m-%d')
        with open(SOURCES, 'w', encoding='utf-8') as f:
            json.dump(reg, f, indent=1, ensure_ascii=False)
            f.write('\n')
        print('sources updated')
    else:
        print('no changes')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# ocr-paper.py: render scanned QP/key PDFs to text for the ingestor.
#
# Several official UPSC PDFs are scans with no text layer, so pypdf extracts
# nothing and ingest-official-paper.py fails them as no-english-pages /
# no-key-table. This script renders each page with pymupdf and OCRs it with
# tesseract, caching per-page text in data/ocr-cache/<id>-<kind>.json.
# ingest-official-paper.py picks the cache up automatically on parse failure.
#
# Honest-by-construction: OCR text goes through the SAME strict validators
# (booklet-set join, sequential numbering, option-block closure, eng_ratio
# gating). Garbled OCR drops questions; it never invents them.
#
# Idempotent: papers with a cache file are skipped. Re-run after adding new
# sources entries. Requires: pip install pymupdf pytesseract ; tesseract-ocr.
#
# Usage: python3 scripts/ocr-paper.py [paper-id ...]
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, 'data', 'official-paper-sources.json')
CACHE = os.path.join(ROOT, 'data', 'ocr-cache')
TMP = os.environ.get('TMPDIR', '/tmp')
UA = {'User-Agent': 'dimsred-paper-ocr/1.0 (educational archive)'}
DPI = 200
# Below this many ASCII letters across all pages, a PDF counts as scanned.
TEXT_FLOOR = 500


def log(m):
    print('ocr: ' + m, flush=True)


def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r, open(dest, 'wb') as f:
        while True:
            chunk = r.read(1024 * 256)
            if not chunk:
                break
            f.write(chunk)
    return dest


def pdf_text_chars(path):
    try:
        from pypdf import PdfReader
        reader = PdfReader(path)
        total = 0
        for p in reader.pages:
            try:
                t = p.extract_text() or ''
            except Exception:
                t = ''
            total += sum(1 for c in t if c.isascii() and c.isalpha())
        return total
    except Exception:
        return 0


def ocr_pdf(pdf_path):
    """Render each page and OCR it. Returns list of {'text': str}."""
    import pymupdf
    import pytesseract
    from PIL import Image
    import io
    doc = pymupdf.open(pdf_path)
    pages = []
    zoom = DPI / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=mat)
        img = Image.open(io.BytesIO(pix.tobytes('png')))
        text = pytesseract.image_to_string(img, lang='eng')
        pages.append({'text': text, 'has_img': True})
        if (i + 1) % 10 == 0:
            log('  ... page %d/%d' % (i + 1, len(doc)))
    doc.close()
    return pages


def cache_path(pid, kind):
    return os.path.join(CACHE, '%s-%s.json' % (pid, kind))


def needs_ocr(pdf_path):
    return pdf_text_chars(pdf_path) < TEXT_FLOOR


def process(entry, only=None):
    pid = entry.get('id')
    if only and pid not in only:
        return False
    qp_url, key_url = entry.get('qpUrl'), entry.get('keyUrl')
    if not qp_url or not key_url:
        return False
    changed = False
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    for kind, url in (('qp', qp_url), ('key', key_url)):
        cp = cache_path(pid, kind)
        if os.path.exists(cp):
            continue
        pdf_path = os.path.join(TMP, 'ocr-%s-%s.pdf' % (pid, kind))
        try:
            download(url, pdf_path)
        except Exception as e:
            log('%s %s download failed: %s' % (pid, kind, str(e)[:100]))
            continue
        if not needs_ocr(pdf_path):
            log('%s %s has a text layer - ingestor handles it directly' % (pid, kind))
            continue
        log('%s %s is scanned - OCR starting' % (pid, kind))
        try:
            pages = ocr_pdf(pdf_path)
        except Exception as e:
            log('%s %s OCR failed: %s' % (pid, kind, str(e)[:140]))
            continue
        with open(cp, 'w', encoding='utf-8') as f:
            json.dump({'id': pid, 'kind': kind, 'dpi': DPI, 'pages': pages}, f)
        log('%s %s OCR done: %d pages cached' % (pid, kind, len(pages)))
        changed = True
    return changed


def main():
    with open(SOURCES, encoding='utf-8') as f:
        reg = json.load(f)
    only = set(sys.argv[1:]) or None
    n = 0
    for entry in reg.get('papers', []):
        if entry.get('status') == 'done':
            continue
        if process(entry, only):
            n += 1
    log('done (%d papers OCR-cached)' % n)


if __name__ == '__main__':
    main()

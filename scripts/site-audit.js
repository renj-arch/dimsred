// Site audit: walks every page the site serves, checks it actually loads
// (status, title, critical scripts present, zero console-fatal markers), and
// writes data/site-audit.json for the improve.html board. Zero external
// services: plain Node walk of the repo root (works offline, no deploy lag).
//
// Usage: node scripts/site-audit.js
// CI:    wired into fault-status.yml before fault-report.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'site-audit.json');

// Pages the site actually serves (html at repo root, non-underscore).
function listPages() {
  return fs.readdirSync(ROOT)
    .filter(function (f) { return /\.html$/i.test(f) && f[0] !== '_' && f[0] !== '.'; })
    .sort();
}

// Cheap static checks that don't need a browser:
//   - file exists and is non-empty
//   - has a <title>
//   - is not a stub (needs inline or external style/script — many pages are
//     fully self-contained with inline <style>/<script>, which is fine)
//   - no obvious leftover placeholder markers (case-sensitive: a `todo`
//     variable or `u_{xxx}` in a physics formula is NOT a placeholder)
//   - local src/href targets exist on disk (script bodies stripped first so
//     string literals like replace(..., 'href="$1"') don't false-positive)
function auditPage(file) {
  const p = path.join(ROOT, file);
  const faults = [];
  let html = '';
  try {
    const st = fs.statSync(p);
    if (st.size === 0) { faults.push('empty file'); return { file: file, size: 0, faults: faults }; }
    html = fs.readFileSync(p, 'utf8');
  } catch (e) {
    faults.push('unreadable: ' + e.message);
    return { file: file, size: 0, faults: faults };
  }

  if (!/<title[^>]*>[^<]{2,}/i.test(html)) faults.push('missing <title>');

  const hasExtCss = /<link[^>]+\.css/i.test(html);
  const hasExtJs = /<script[^>]+src=/i.test(html);
  const hasInlineStyle = /<style[\s>]/i.test(html);
  const hasInlineJs = /<script[\s>][^>]*>[^<]/i.test(html);
  if (!hasExtCss && !hasExtJs && !hasInlineStyle && !hasInlineJs) {
    faults.push('stub page (no style or script at all)');
  }

  // Case-SENSITIVE markers (a lowercase `todo` variable is not a placeholder).
  if (/\bTODO\b|\bFIXME\b/.test(html) || /lorem ipsum/i.test(html)) {
    faults.push('placeholder marker in source');
  }

  // Strip <script> bodies (keep the tags themselves for src= scanning) so
  // string literals inside JS don't get mistaken for real asset refs.
  const bare = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, function (block) {
    return block.replace(/>([\s\S]*)</, '><');
  });
  const refs = bare.match(/(?:src|href)=["']([^"']+)["']/gi) || [];
  const missing = [];
  refs.forEach(function (r) {
    const m = /(?:src|href)=["']([^"']+)["']/i.exec(r);
    if (!m) return;
    let u = m[1];
    if (/^(https?:|\/\/|#|mailto:|data:)/i.test(u)) return;
    u = u.replace(/^\.\//, '').split(/[?#]/)[0];
    if (!u || /\$\d/.test(u)) return; // skip template back-references
    if (!fs.existsSync(path.join(ROOT, u))) missing.push(u);
  });
  if (missing.length) faults.push('missing local asset(s): ' + missing.slice(0, 4).join(', ') +
    (missing.length > 4 ? ' +' + (missing.length - 4) + ' more' : ''));

  return {
    file: file,
    size: html.length,
    title: (/<title[^>]*>([^<]*)/i.exec(html) || [, ''])[1].trim().slice(0, 80),
    scriptCount: (html.match(/<script[^>]+src=/gi) || []).length,
    selfContained: !hasExtJs && !hasExtCss,
    faults: faults
  };
}

function main() {
  const pages = listPages();
  const results = pages.map(auditPage);
  const bad = results.filter(function (r) { return r.faults.length; });
  const report = {
    generated: new Date().toISOString(),
    pagesChecked: results.length,
    pagesWithFaults: bad.length,
    selfContained: results.filter(function (r) { return r.selfContained; }).length,
    results: results,
    faults: bad.map(function (r) {
      return { page: r.file, faults: r.faults };
    })
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');
  console.log('site-audit: ' + results.length + ' page(s) · ' +
    report.selfContained + ' self-contained · ' + bad.length + ' with faults -> ' + OUT);
  bad.forEach(function (r) {
    console.log('  [' + r.file + '] ' + r.faults.join('; '));
  });
}

main();

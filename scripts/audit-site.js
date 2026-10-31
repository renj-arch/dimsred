'use strict';
// audit-site.js — static audit of the deployed site.
//
// Catches failures that a Windows working copy hides:
//   * internal links whose target does not exist
//   * case-only mismatches (Windows resolves Index.html; production 404s)
//   * directory URLs that are not backed by index.html
//   * duplicate id attributes on a page
//   * inline classic scripts that do not parse
//   * missing title / description / viewport
//   * images without alt text
//   * UTF-8 replacement characters (U+FFFD), the signature of lossy encoding
//
// By default it audits the files Git tracks (what actually deploys), using the
// index as the source of truth for link targets. That matters in a sparse or
// partial clone: a media file can be tracked but absent locally, and it is not
// a 404 in production. Use --include-untracked to audit files that are not yet
// staged, e.g. a page you are about to add.
//
// It never edits anything. Run it after a build or before a deploy:
//
//   node scripts/audit-site.js
//   node scripts/audit-site.js --verbose      (list every finding)
//   node scripts/audit-site.js --max=200      (cap listed findings)
//   node scripts/audit-site.js --include-untracked
//
// Skips: node_modules, data/questions (served by a Pages function), live-dist,
// templates (build-time partials, not standalone pages), and anything ignored.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.indexOf('--verbose') !== -1;
const INCLUDE_UNTRACKED = args.indexOf('--include-untracked') !== -1;
const MAX = (function () {
  const hit = args.filter(function (a) { return a.indexOf('--max=') === 0; })[0];
  return hit ? parseInt(hit.split('=')[1], 10) || 50 : 50;
})();

const SKIP_DIRS = new Set(['node_modules', '.git', 'live-dist', 'chunks', 'tmp', 'templates']);
const SKIP_PATHS = [path.join('data', 'questions')];

function isSkipped(rel) {
  const parts = rel.split('/');
  if (parts.some(function (p) { return SKIP_DIRS.has(p); })) return true;
  return SKIP_PATHS.some(function (p) { return rel === p || rel.indexOf(p + '/') === 0; });
}

function gitList(extraArgs) {
  const r = cp.spawnSync('git', ['-C', ROOT, 'ls-files', '-z'].concat(extraArgs || []), {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024
  });
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  entries.forEach(function (ent) {
    const abs = path.join(dir, ent.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (isSkipped(rel)) return;
    if (ent.isDirectory()) walk(abs, out);
    else if (ent.isFile()) out.push(rel);
  });
  return out;
}

const TRACKED = gitList();
const LOCAL = walk(ROOT, []);
const DEPLOYABLE = new Set(TRACKED || LOCAL);
if (INCLUDE_UNTRACKED) LOCAL.forEach(function (f) { DEPLOYABLE.add(f); });

// Link targets follow the deployed tree even when a blob is absent locally.
const FILE_SET = DEPLOYABLE;
const LOWER_MAP = new Map();
Array.from(FILE_SET).sort().forEach(function (f) { LOWER_MAP.set(f.toLowerCase(), f); });

const HTML_FILES = LOCAL.filter(function (f) {
  return /\.html?$/i.test(f) && DEPLOYABLE.has(f) && !isSkipped(f);
}).sort();

const findings = {
  broken: [],
  caseMismatch: [],
  duplicateId: [],
  scriptError: [],
  missingTitle: [],
  missingDescription: [],
  missingViewport: [],
  noAlt: [],
  replacementChars: []
};

const TEXT_RE = /\.(?:html?|js|cjs|mjs|json|md|css|txt|xml|svg|csv|tsv|ya?ml|webmanifest)$/i;

function resolveTarget(fromRel, raw) {
  let p = raw.split('#')[0].split('?')[0];
  if (!p) return null;
  try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
  let rel;
  if (p.charAt(0) === '/') {
    rel = p.replace(/^\/+/, '');
  } else {
    const dir = path.posix.dirname(fromRel);
    rel = path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, p));
  }
  // Directory URLs such as /cgl/ are served as cgl/index.html.
  if (rel.slice(-1) === '/') rel = rel.slice(0, -1);
  return rel;
}

function candidatesFor(rel) {
  if (!rel || rel === '.') return [''];
  const out = [rel];
  if (!/\.[a-z0-9]+$/i.test(rel)) out.push(rel + '.html');
  out.push(rel.replace(/\/+$/, '') + '/index.html');
  return out;
}

function checkLink(fromRel, raw, kind) {
  if (!raw) return;
  const v = raw.trim();
  if (!v) return;
  if (/^(https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(v)) return;
  if (v.charAt(0) === '#' || v.charAt(0) === '?') return;
  if (v.indexOf('{{') !== -1 || v.indexOf('${') !== -1) return;
  // Pages functions and proxied corpus are intentionally server-side.
  if (/^\/(api|functions|cdn-cgi)\//.test(v)) return;
  if (v.indexOf('/data/questions/') === 0 || v.indexOf('data/questions/') === 0) return;

  const target = resolveTarget(fromRel, v);
  if (target === null) return;
  const candidates = candidatesFor(target);

  const exact = candidates.filter(function (c) { return c === '' || FILE_SET.has(c); });
  if (exact.length) return;

  const lower = candidates.map(function (c) { return c.toLowerCase(); })
    .filter(function (c) { return LOWER_MAP.has(c); })[0];
  if (lower) {
    findings.caseMismatch.push({ file: fromRel, link: v, actual: LOWER_MAP.get(lower), kind: kind });
    return;
  }
  findings.broken.push({ file: fromRel, link: v, kind: kind });
}

function attr(tag, name) {
  const re = new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
  const m = tag.match(re);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
}

function maskBlock(text) {
  // Keep newlines so reported line numbers still match the source file.
  return text.replace(/[^\n]/g, ' ');
}

function hasMeta(html, name) {
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const n = attr(m[0], 'name');
    if (n && n.toLowerCase() === name) return true;
  }
  return false;
}

function auditHtml(rel) {
  let html;
  try { html = decodeText(fs.readFileSync(path.join(ROOT, rel))); } catch (e) { return; }

  // Markup scan must ignore tags that only exist inside code samples: inline
  // scripts build <a> elements from strings, and those are not real links.
  const markup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, maskBlock)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, maskBlock)
    .replace(/<!--[\s\S]*?-->/g, maskBlock);

  if (!/<title[^>]*>[\s\S]*?\S[\s\S]*?<\/title>/i.test(html)) findings.missingTitle.push(rel);
  if (!hasMeta(html, 'description')) findings.missingDescription.push(rel);
  if (!hasMeta(html, 'viewport')) findings.missingViewport.push(rel);

  const tagRe = /<(a|link|script|img|form|source|iframe)\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(markup))) {
    const tag = m[0];
    const name = m[1].toLowerCase();
    if (name === 'a') {
      checkLink(rel, attr(tag, 'href'), 'href');
    } else if (name === 'link') {
      checkLink(rel, attr(tag, 'href'), 'link');
    } else if (name === 'script') {
      checkLink(rel, attr(tag, 'src'), 'script');
    } else if (name === 'img') {
      checkLink(rel, attr(tag, 'src'), 'img');
      if (!/\balt\s*=/i.test(tag)) findings.noAlt.push({ file: rel, tag: tag.slice(0, 120) });
    } else if (name === 'form') {
      checkLink(rel, attr(tag, 'action'), 'form');
    } else if (name === 'source') {
      checkLink(rel, attr(tag, 'src'), 'source');
    } else if (name === 'iframe') {
      checkLink(rel, attr(tag, 'src'), 'iframe');
    }
  }

  // Duplicate ids
  const ids = {};
  const idRe = /\bid\s*=\s*("([^"]*)"|'([^']*)')/g;
  while ((m = idRe.exec(markup))) {
    const id = m[2] !== undefined ? m[2] : m[3];
    if (!id) continue;
    ids[id] = (ids[id] || 0) + 1;
  }
  Object.keys(ids).forEach(function (id) {
    if (ids[id] > 1) findings.duplicateId.push({ file: rel, id: id, count: ids[id] });
  });

  // Inline classic scripts
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html))) {
    const attrs = m[1] || '';
    const code = m[2] || '';
    if (!code.trim()) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/\btype\s*=\s*["'](?:application\/(?:ld\+)?json|importmap|text\/template|text\/x-template)["']/i.test(attrs)) continue;
    if (/\btype\s*=\s*["']module["']/i.test(attrs)) continue; // import/export are not vm.Script
    const line = html.slice(0, m.index).split('\n').length;
    try {
      new vm.Script(code, { filename: rel + ':' + line });
    } catch (e) {
      findings.scriptError.push({ file: rel, line: line, error: e.message });
    }
  }
}

HTML_FILES.forEach(auditHtml);

// Replacement characters are invisible in a browser but corrupt the meaning of
// the text (Greek letters, degree signs, dashes). Decode UTF-16 with a BOM so
// legacy files are not reported merely because they are not UTF-8.
function decodeText(buf) {
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.slice(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const body = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      body[i - 2] = buf[i + 1];
      body[i - 1] = buf[i];
    }
    return body.toString('utf16le');
  }
  return buf.toString('utf8');
}

Array.from(FILE_SET).filter(function (f) {
  return TEXT_RE.test(f) && !isSkipped(f);
}).sort().forEach(function (rel) {
  let buf;
  try { buf = fs.readFileSync(path.join(ROOT, rel)); } catch (e) { return; }
  const text = decodeText(buf);
  const count = (text.match(/\uFFFD/g) || []).length;
  if (count) findings.replacementChars.push({ file: rel, count: count });
});

function uniqueBy(list, keyFn) {
  const seen = new Set();
  return list.filter(function (x) {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const uniqueBroken = uniqueBy(findings.broken, function (f) { return f.file + '|' + f.link; });
const uniqueCase = uniqueBy(findings.caseMismatch, function (f) { return f.file + '|' + f.link; });

console.log('Site audit');
console.log('  HTML files'.padEnd(38) + HTML_FILES.length);
console.log('  files checked'.padEnd(38) + FILE_SET.size);
if (!TRACKED) console.log('  warning: git ls-files unavailable; audited the working tree');
console.log('');

console.log('Broken internal links'.padEnd(38) + uniqueBroken.length);
console.log('Case-only link mismatches'.padEnd(38) + uniqueCase.length);
console.log('Duplicate ids'.padEnd(38) + findings.duplicateId.length);
console.log('Inline script parse errors'.padEnd(38) + findings.scriptError.length);
console.log('Pages without <title>'.padEnd(38) + findings.missingTitle.length);
console.log('Pages without meta description'.padEnd(38) + findings.missingDescription.length);
console.log('Pages without viewport'.padEnd(38) + findings.missingViewport.length);
console.log('Images without alt'.padEnd(38) + findings.noAlt.length);
console.log('Files with replacement characters'.padEnd(38) + findings.replacementChars.length);

function list(title, rows, render) {
  if (!rows.length) return;
  console.log('\n' + title + (rows.length > MAX && !VERBOSE ? ' (first ' + MAX + ' of ' + rows.length + ')' : ''));
  rows.slice(0, VERBOSE ? rows.length : MAX).forEach(function (r) {
    console.log('  ' + render(r));
  });
}

list('Broken links', uniqueBroken, function (f) {
  return f.file + ' -> ' + f.link + '  [' + f.kind + ']';
});
list('Case mismatches', uniqueCase, function (f) {
  return f.file + ' -> ' + f.link + '  (exists as ' + f.actual + ')';
});
list('Duplicate ids', findings.duplicateId, function (f) {
  return f.file + '  #' + f.id + ' x' + f.count;
});
list('Inline script errors', findings.scriptError, function (f) {
  return f.file + ':' + f.line + '  ' + f.error;
});
list('Pages without meta description', findings.missingDescription, function (f) { return f; });
list('Pages without viewport', findings.missingViewport, function (f) { return f; });
list('Pages without <title>', findings.missingTitle, function (f) { return f; });
list('Images without alt', findings.noAlt, function (f) { return f.file + '  ' + f.tag; });
list('Files with replacement characters', findings.replacementChars, function (f) { return f.file + '  (' + f.count + ')'; });

const hardFailures = uniqueBroken.length + uniqueCase.length + findings.scriptError.length +
  findings.duplicateId.length + findings.replacementChars.length;
process.exit(hardFailures ? 1 : 0);

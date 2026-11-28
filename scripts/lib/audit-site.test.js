'use strict';
// Regression suite for scripts/audit-site.js.
//
// The auditor is the gate that caught 88 HTML files committed as git directory
// listings, hundreds of broken internal links, and inline scripts that no
// longer parse. It runs against the deployed tree through `git ls-files`, so
// the fixture here is a throwaway git repository with one page per failure
// class. Running the real CLI (rather than importing internals) keeps the
// tracked/untracked contract under test too.
//
//   node scripts/lib/audit-site.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const AUDITOR = path.join(ROOT, 'scripts', 'audit-site.js');

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-site-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(AUDITOR, path.join(dir, 'scripts', 'audit-site.js'));
  Object.keys(files).forEach(function (rel) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, files[rel], 'utf8');
  });
  const init = cp.spawnSync('git', ['init', '-q'], { cwd: dir, encoding: 'utf8' });
  if (init.status !== 0) throw new Error('git init failed: ' + init.stderr);
  const add = cp.spawnSync('git', ['add', '-A'], { cwd: dir, encoding: 'utf8' });
  if (add.status !== 0) throw new Error('git add failed: ' + add.stderr);
  return dir;
}

function run(dir, args) {
  const r = cp.spawnSync(process.execPath, ['scripts/audit-site.js'].concat(args || []), {
    cwd: dir, encoding: 'utf8'
  });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function count(out, label) {
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(\\d+)');
  const m = out.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const HEAD = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="description" content="fixture">' +
  '<title>Fixture</title></head><body>';

console.log('--- one page per failure class ---');
(function () {
  const dir = makeRepo({
    'index.html': HEAD + '<a href="sub/">sub</a><a href="Case.html">Case</a></body></html>',
    'sub/index.html': HEAD + 'sub</body></html>',
    'Case.html': HEAD + 'case</body></html>',
    'bad-link.html': HEAD + '<a href="missing.html">missing</a></body></html>',
    'bad-case.html': HEAD + '<a href="case.html">lowercase target</a></body></html>',
    'dupe.html': HEAD + '<div id="x"></div><div id="x"></div></body></html>',
    'bad-script.html': HEAD + '<script>var x = ;</script></body></html>',
    'broken.js': 'var x = ;\n',
    'ext-script.html': HEAD + '<script src="broken.js" defer></script></body></html>',
    'sup.html': HEAD + '<p>Distance 5 × 10' + '\u00b9' + '5 m and 6.022 × 10' + '\u00b2' + '\u00b0 mol⁻¹.</p></body></html>',
    'corrupt.html': HEAD + '<p>bad \uFFFD text</p></body></html>',
    'no-title.html': '<!DOCTYPE html><html><head></head><body><img src="index.html"></body></html>',
    'importmap.html': HEAD + '<script type="importmap">{"imports":</script></body></html>',
    'module.html': HEAD + '<script type="module">import x from "y"</script></body></html>',
    'templates/partial.html': HEAD + '<a href="missing.html">partial</a></body></html>',
    'style.css': '',
    'app.js': '',
    'pic.png': ''
  });
  fs.writeFileSync(path.join(dir, 'untracked.html'),
    '<!DOCTYPE html><html><head></head><body><a href="missing.html">untracked</a></body></html>', 'utf8');
  fs.writeFileSync(path.join(dir, 'utf16.json'), Buffer.concat([
    Buffer.from([0xFF, 0xFE]),
    Buffer.from('{"ok":true}', 'utf16le')
  ]));
  cp.spawnSync('git', ['add', 'utf16.json'], { cwd: dir });
  try {
    const r = run(dir);
    assert(count(r.out, 'Broken internal links') === 1, 'default mode audits only tracked files', JSON.stringify(count(r.out, 'Broken internal links')));
    assert(count(r.out, 'Case-only link mismatches') === 1, 'case-only mismatch is reported');
    assert(count(r.out, 'Duplicate ids') === 1, 'duplicate id is reported');
    assert(count(r.out, 'Inline script parse errors') === 1, 'unparseable inline script is reported');
    assert(count(r.out, 'External script parse errors') === 1, 'unparseable external script is reported');
    assert(/broken\.js\s+\(loaded by ext-script\.html\)/.test(r.out), 'external script error names file and page');
    assert(count(r.out, 'Mixed superscript exponents') === 1, 'mixed superscript exponents are reported', JSON.stringify(count(r.out, 'Mixed superscript exponents')));
    assert(/sup\.html\s+\(2\)/.test(r.out) && r.out.indexOf('10\u00b95') !== -1, 'mixed-superscript finding shows a sample');
    assert(count(r.out, 'UTF-16 text assets') === 1, 'UTF-16 data asset is reported');
    assert(/utf16\.json/.test(r.out), 'UTF-16 finding names the file');
    assert(count(r.out, 'Pages without <title>') === 1, 'missing title is reported');
    assert(count(r.out, 'Pages without meta description') === 1, 'missing description is reported');
    assert(count(r.out, 'Pages without viewport') === 1, 'missing viewport is reported');
    assert(count(r.out, 'Images without alt') === 1, 'missing alt is reported');
    assert(count(r.out, 'Files with replacement characters') === 1, 'replacement characters are reported');
    assert(/corrupt\.html\s+\(1\)/.test(r.out), 'replacement-character file names the source');
    assert(/bad-link\.html -> missing\.html/.test(r.out), 'broken link names the source and target');
    assert(/bad-case\.html -> case\.html\s+\(exists as Case\.html\)/.test(r.out), 'case mismatch names the real file');
    assert(/no-title\.html/.test(r.out), 'metadata page is listed');
    assert(!/templates\/partial\.html/.test(r.out), 'build-time partials are skipped');
    assert(!/importmap\.html/.test(r.out) && !/module\.html/.test(r.out), 'importmap/module scripts are not parsed as classic');
    assert(!/untracked\.html/.test(r.out), 'untracked pages stay out of the default audit');
    assert(r.status === 1, 'hard failures exit non-zero');

    const u = run(dir, ['--include-untracked']);
    assert(count(u.out, 'Broken internal links') === 2, '--include-untracked adds untracked links', JSON.stringify(count(u.out, 'Broken internal links')));
    assert(/untracked\.html -> missing\.html/.test(u.out), '--include-untracked names the untracked page');
    assert(count(u.out, 'Pages without <title>') === 2, '--include-untracked adds untracked metadata gaps');
  } finally {
    cleanup(dir);
  }
})();

console.log('\n--- a clean tree exits zero ---');
(function () {
  const dir = makeRepo({
    'index.html': HEAD + '<a href="sub/">sub</a><img src="pic.png" alt="pic"></body></html>',
    'sub/index.html': HEAD + 'sub</body></html>',
    'pic.png': ''
  });
  // A legacy UTF-16 page with a BOM must not be mistaken for mojibake.
  fs.writeFileSync(path.join(dir, 'legacy.html'), Buffer.concat([
    Buffer.from([0xFF, 0xFE]),
    Buffer.from(HEAD + 'legacy ok</body></html>', 'utf16le')
  ]));
  cp.spawnSync('git', ['add', 'legacy.html'], { cwd: dir });
  try {
    const r = run(dir);
    assert(r.status === 0, 'clean site passes', 'exit ' + r.status + '\n' + r.out);
    ['Broken internal links', 'Case-only link mismatches', 'Duplicate ids', 'Inline script parse errors',
      'External script parse errors', 'Pages without <title>', 'Pages without meta description', 'Pages without viewport',
      'Images without alt', 'Files with replacement characters', 'Mixed superscript exponents', 'UTF-16 text assets'
    ].forEach(function (label) {
      assert(count(r.out, label) === 0, 'clean site: ' + label + ' is zero', JSON.stringify(count(r.out, label)));
    });
  } finally {
    cleanup(dir);
  }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

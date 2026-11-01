'use strict';
// Regression suite for the full-screen modal pattern.
//
// map.html copied the `.revision-modal` overlay from revision.html but left out
// `display:none` on the base rule. The overlay therefore covered the timeline
// on load, and closeTimeframe() only removed `.active`, which changed nothing.
// The page looked permanently blocked by the timeframe panel and its
// "Export as Markdown" / "Copy to Clipboard" buttons.
//
//   node scripts/lib/site-ui.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

function htmlFiles(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'question-bank') return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (/\.html$/i.test(e.name)) out.push(p);
  });
  return out;
}

function rule(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(html);
  return m ? m[1] : null;
}

const files = htmlFiles(ROOT, []);
const overlays = [];

console.log('--- every .revision-modal overlay is hidden until opened ---');
files.forEach(function (file) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('.revision-modal') === -1) return;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const base = rule(html, '.revision-modal');
  const active = rule(html, '.revision-modal.active');
  overlays.push(rel);
  assert(base !== null, rel + ': has a .revision-modal base rule');
  if (base !== null) {
    assert(/display\s*:\s*none\b/.test(base),
      rel + ': base rule hides the overlay by default',
      'base rule: ' + base.slice(0, 120));
  }
  assert(active !== null, rel + ': has a .revision-modal.active rule');
  if (active !== null) {
    assert(/display\s*:\s*(block|flex|grid)\b/.test(active),
      rel + ': .active shows the overlay',
      'active rule: ' + active.slice(0, 120));
  }
});

assert(overlays.length >= 2, 'both revision.html and map.html use the overlay', overlays.join(', '));

console.log('\n--- the map timeframe panel can be opened and closed ---');
(function () {
  const html = read('map.html');
  assert(html.indexOf('id="timeframeModal"') !== -1, 'map.html contains the timeframe dialog');
  assert(/function\s+openTimeframe\b/.test(html), 'openTimeframe() is defined');
  assert(/classList\.add\(['"]active['"]\)/.test(html), 'openTimeframe() adds .active');
  assert(/function\s+closeTimeframe\b/.test(html), 'closeTimeframe() is defined');
  assert(/getElementById\(['"]timeframeModal['"]\)\.classList\.remove\(['"]active['"]\)/.test(html),
    'closeTimeframe() removes .active from the same dialog');
  assert(html.indexOf('onclick="closeTimeframe()"') !== -1, 'the close control is wired to closeTimeframe()');
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

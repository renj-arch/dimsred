// Compares the graph-resolver functions that are currently duplicated across
// flowchart.html, scripts/gen-topic-layers.js, scripts/build-timeline.js and
// map.html, and reports exactly which copies AGREE and which DIVERGE.
// Nothing may be unified until this prints zero divergences.
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || '.';

const FILES = {
  flowchart: 'flowchart.html',
  gentlayers: 'scripts/gen-topic-layers.js',
  buildtimeline: 'scripts/build-timeline.js',
  map: 'map.html',
  revcontent: 'scripts/generate-revision-content.js',
  ownership: 'scripts/lib/entity-ownership.js'
};

// name -> regex that captures the whole definition (var X=/re/; or function X(){...})
const DEFS = {
  canon: /function\s+canon\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  isJunk: /function\s+isJunk\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  isHub: /function\s+isHub\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  byProminence: /function\s+byProminence\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  findByName: /function\s+findByName\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  resolveItem: /function\s+resolveItem\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  isCrediblePerson: /function\s+isCrediblePerson\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  facetOf: /function\s+facetOf\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  relPrio: /function\s+relPrio\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  cleanDesc: /function\s+cleanDesc\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  briefOf: /function\s+briefOf\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
  JUNK_KIN: /var\s+JUNK_KIN\s*=\s*\/(?:[^\/\\]|\\.)*\/[a-z]*\s*;/,
  JUNK_KIN_NAME: /var\s+JUNK_KIN_NAME\s*=\s*\/(?:[^\/\\]|\\.)*\/[a-z]*\s*;/,
  REJECT_PERSON: /var\s+REJECT_PERSON\s*=\s*\/(?:[^\/\\]|\\.)*\/[a-z]*\s*;/,
  KIN_RELS: /var\s+KIN_RELS\s*=\s*\[[^\]]*\]\s*;/,
  FAMILY: /var\s+FAMILY\s*=\s*\/(?:[^\/\\]|\\.)*\/[a-z]*\s*;/,
  PLACE_WORDS: /var\s+PLACE_WORDS\s*=\s*\[[^\]]*\]\s*;/,
  PLACE_CAT: /var\s+PLACE_CAT\s*=\s*\/(?:[^\/\\]|\\.)*\/[a-z]*\s*;/,
  NOISE_TYPES: /var\s+NOISE_TYPES\s*=\s*(?:\{[^}]*\}|\[[^\]]*\])\s*;/,
  HUB_COUNT: /(?:isHub[^\n]*?count\s*\)\s*)?(?:>=)\s*(\d{3,6})/
};

// normalise whitespace + comment noise so pure-formatting edits are not
// reported as logic divergences
function norm(s) {
  return s
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*/g, ';')
    .trim();
}

const found = {};
Object.keys(FILES).forEach(k => {
  const p = path.join(ROOT, FILES[k]);
  if (!fs.existsSync(p)) { found[k] = null; return; }
  const src = fs.readFileSync(p, 'utf8');
  found[k] = {};
  Object.keys(DEFS).forEach(name => {
    const m = src.match(DEFS[name]);
    if (m) found[k][name] = norm(m[0]);
  });
});

const present = Object.keys(DEFS).filter(n => Object.keys(found).some(k => found[k] && found[k][n]));
const absent = Object.keys(DEFS).filter(n => !present.includes(n));

console.log('=== presence (out of ' + Object.keys(DEFS).length + ' tracked symbols) ===');
console.log('symbol'.padEnd(20) + Object.keys(found).map(k => k.slice(0, 12).padEnd(14)).join(''));
present.forEach(n => {
  console.log(n.padEnd(20) + Object.keys(found).map(k => (found[k] && found[k][n] ? 'yes' : '-').padEnd(14)).join(''));
});
if (absent.length) console.log('\nnot found anywhere: ' + absent.join(', '));

console.log('\n=== divergences ===');
let div = 0, agree = 0;
present.forEach(n => {
  const variants = {};
  Object.keys(found).forEach(k => { if (found[k] && found[k][n]) variants[k] = found[k][n]; });
  const uniq = [...new Set(Object.values(variants))];
  if (uniq.length === 1) { agree++; return; }
  div++;
  console.log('\n### DIVERGES: ' + n + '  (' + Object.keys(variants).join(' vs ') + ')');
  const keys = Object.keys(variants);
  for (let i = 1; i < keys.length; i++) {
    if (variants[keys[i]] === variants[keys[0]]) continue;
    // find first differing offset to keep the report readable
    const A = variants[keys[0]], B = variants[keys[i]];
    let o = 0; while (o < Math.min(A.length, B.length) && A[o] === B[o]) o++;
    console.log('  ' + keys[0] + ' len=' + A.length + ' | ' + keys[i] + ' len=' + B.length + ' | first diff @' + o);
    console.log('    ' + keys[0].padEnd(13) + ': ...' + A.slice(Math.max(0, o - 40), o + 90));
    console.log('    ' + keys[i].padEnd(13) + ': ...' + B.slice(Math.max(0, o - 40), o + 90));
  }
});
console.log('\n' + agree + ' identical, ' + div + ' divergent, across ' + present.length + ' shared symbols.');
process.exit(div ? 1 : 0);

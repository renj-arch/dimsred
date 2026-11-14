// Validates data/relations.json against the rules the renderer relies on.
// Fails loudly rather than letting a bad triple reach the screen.
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || '.';
const file = process.argv[3] || path.join(ROOT, 'data', 'relations.json');

const R = JSON.parse(fs.readFileSync(file, 'utf8'));
const errs = [], warns = [];

const famOf = {};
Object.keys(R.families || {}).forEach(f => {
  (R.families[f].verbs || []).forEach(v => {
    if (famOf[v]) errs.push('verb "' + v + '" is in two families: ' + famOf[v] + ' and ' + f);
    famOf[v] = f;
  });
  if (!R.families[f].label) errs.push('family ' + f + ' has no label');
  if (!/^#[0-9a-f]{6}$/i.test(R.families[f].color || '')) errs.push('family ' + f + ' has a bad color: ' + R.families[f].color);
});

const TOPICS = Object.keys(R.topics || {});
if (!TOPICS.length) errs.push('no topics in store');

let n = 0;
const names = new Set();
const pairSeen = {};
TOPICS.forEach(tk => {
  const T = R.topics[tk];
  const edges = T.edges || [];
  if (!edges.length) warns.push('topic "' + tk + '" has no edges');
  edges.forEach((e, i) => {
    n++;
    const at = tk + '[' + i + '] ' + JSON.stringify(e.a) + ' -' + e.rel + '-> ' + JSON.stringify(e.b);
    ['a', 'b', 'rel'].forEach(k => { if (!e[k] || typeof e[k] !== 'string') errs.push(at + ': missing/invalid "' + k + '"'); });
    if (e.a && e.b && e.a === e.b) errs.push(at + ': self-loop');
    if (e.a) names.add(e.a);
    if (e.b) names.add(e.b);
    if (e.rel && !famOf[e.rel]) errs.push(at + ': verb not in any family -> would render unstyled');
    if (e.rel && R.inverse && !R.inverse[e.rel]) warns.push(at + ': no inverse label, reverse reading will show the bare verb');
    // The core guarantee: an arrow needs provenance.
    const authored = e.src === 'authored';
    const hasEv = typeof e.ev === 'string' && e.ev.trim().length >= 20;
    if (!authored && !hasEv) errs.push(at + ': no provenance (src!=authored and no ev sentence) -> renderer MUST refuse this');
    if (e.ev && /_{3,}/.test(e.ev)) errs.push(at + ': evidence sentence contains a cloze blank');
    if (e.ev && e.ev.trim().length > 400) warns.push(at + ': evidence sentence is ' + e.ev.length + ' chars, too long for a hover');
    if (e.src && !['authored', 'corpus'].includes(e.src)) errs.push(at + ': unknown src "' + e.src + '"');
    // duplicate / contradictory pair
    const k = tk + '|' + [e.a, e.b].sort().join('|');
    if (pairSeen[k]) {
      const prev = pairSeen[k];
      if (prev.rel === e.rel && prev.a === e.a) warns.push(at + ': exact duplicate of an earlier triple');
      else warns.push(at + ': second relation on the same pair as "' + prev.rel + '" (both will draw)');
    }
    pairSeen[k] = { rel: e.rel, a: e.a };
  });
});

console.log('store            :', file.replace(ROOT + path.sep, ''));
console.log('topics           :', TOPICS.length, '(' + TOPICS.join(', ') + ')');
console.log('relations        :', n);
console.log('verbs in families:', Object.keys(famOf).length, 'across', Object.keys(R.families || {}).length, 'families');
console.log('distinct entities:', names.size);
if (warns.length) { console.log('\n--- warnings (' + warns.length + ') ---'); warns.forEach(w => console.log('  ! ' + w)); }
if (errs.length) { console.log('\n--- ERRORS (' + errs.length + ') ---'); errs.forEach(e => console.log('  x ' + e)); process.exit(1); }
console.log('\nOK: every relation has provenance and a verb family.');

/*
 * spain-probe.js -- why are 45 of the 78 authored Spain items unresolvable?
 *
 * Spain is the regression fixture for the whole pipeline, so this answers the
 * funnel question directly rather than guessing:
 *
 *   78 authored candidates
 *     -> was the name ever mined into the graph at all?
 *     -> does it match under canon() (strict) or only under canonLoose()?
 *     -> was a match found but then rejected, and by WHICH gate?
 *     -> is the surviving candidate the requested type?
 *
 * A high "key-space only" count means the missing nodes are a NORMALISATION
 * BUG, not absent data, and no amount of hand-authoring will fix it.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GC = require('./lib/graph-core.js');
const OVERRIDES = require('./lib/graph-type-overrides.js');
const TYPE_AUTHORITY = require('./lib/type-authority.js');

const ROOT = process.argv[2] || '.';
const TOPIC = process.argv[3] || 'world-geography-70|Spain';

const layers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/topic-layers.json'), 'utf8'));
const layer = layers[TOPIC];
if (!layer) {
  console.error('no authored layer for ' + TOPIC);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const parts = meta.nodesParts || 10;
const byName = Object.create(null);
for (let p = 0; p < parts; p++) {
  const nodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
  for (let i = 0; i < nodes.length; i++) {
    const c = GC.canon(nodes[i].name || '');
    (byName[c] || (byName[c] = [])).push(nodes[i]);
  }
}
const byLoose = Object.create(null);
for (let p = 0; p < parts; p++) {
  const nodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
  for (let i = 0; i < nodes.length; i++) {
    const c = GC.canonLoose(nodes[i].name || '');
    (byLoose[c] || (byLoose[c] = [])).push(nodes[i]);
  }
}

// Edge index, so the shared type authority can identify people by family edges
// exactly as flowchart.html does. Built from the same data/timeline.json.
const ADJ = Object.create(null);
try {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
  (meta.edges || []).forEach(function (e) {
    (ADJ[e.a] || (ADJ[e.a] = [])).push({ to: e.b, r: e.rel });
    (ADJ[e.b] || (ADJ[e.b] = [])).push({ to: e.a, r: e.rel });
  });
} catch (err) {
  console.error('could not build the edge index: ' + err.message);
  process.exit(2);
}

const R = GC.makeResolver({
  byName: byName,
  prominence: 'graph',
  hubThreshold: 5000,
  // Curated type corrections. Without these a polity typed `concept` loses its
  // own `place`/`org` lookup and the topic falls back to a placeholder.
  // The probe must measure the SAME authority the page uses, or it reports on a
  // pipeline that no longer exists. It previously read the curated table alone,
  // which is why it could not see a gazetteer correction at all.
  typeAuthority: TYPE_AUTHORITY.makeTypeAuthority({ adjacencyFn: function () { return ADJ; } })
});

// flatten the authored layer into leaf items: branches[].items[] are the
// real candidates; the branch headers themselves are not items to resolve.
const items = [];
(layer.branches || []).forEach(function (b) {
  (b.items || []).forEach(function (it) { items.push(it); });
});

const tally = { resolved: 0, wrongType: 0, refined: 0, unclassified: 0, keyspaceOnly: 0, rejected: 0, neverMined: 0 };
const rows = [];

items.forEach(function (it) {
  const name = it.name || '';
  const want = it.type || '';
  const hit = R.resolveItem(name, want);

  if (hit) {
    // Compare the type the resolver ACTS ON, which is the curated-corrected
    // type, not the raw mined type. Reporting the raw type is what made the
    // overrides look like they had done nothing.
    const eff = R.typeOf(hit);
    // Three outcomes, not two. An authored `concept` against a resolved `place`
    // is the canonical resolver REFINING a deliberately coarse editorial label,
    // which is the entire point of the type authority. Counting it as a failure
    // hid that improvement: Aragon moving from `concept` to `place` is a fix,
    // not a regression. A real contradiction is a resolved type that is
    // incompatible with a PRECISE authored label, or a `misc` that asserts
    // nothing and so leaves the item unclassified.
    const COARSE = { concept: true, misc: true };
    const refined = want && eff !== want && COARSE[want] && eff !== 'misc';
    const unknown = eff === 'misc';
    const right = !want || eff === want;
    if (right) tally.resolved++;
    else if (refined) tally.refined++;
    else if (unknown) tally.unclassified++;
    else tally.wrongType++;
    rows.push({
      r: right ? 'OK' : 'TYPE', name: name, want: want, got: hit.id, t: eff,
      c: hit.count || 0,
      note: hit.typeCorrectedFrom ? ('mined as ' + hit.type + ', corrected to ' + eff) : ''
    });
    return;
  }

  // nothing resolved -- find out why
  const strict = byName[GC.canon(name)] || [];
  const loose = byLoose[GC.canonLoose(name)] || [];
  if (!strict.length && !loose.length) {
    tally.neverMined++;
    rows.push({ r: 'NONE', name: name, want: want });
    return;
  }
  if (!strict.length && loose.length) {
    tally.keyspaceOnly++;
    rows.push({ r: 'KEY', name: name, want: want, got: loose.length + ' loose-only match(es)' });
    return;
  }
  // matched but the resolver rejected every candidate -- which gate?
  const good = strict.filter(function (n) { return !GC.isJunk(n) && !GC.isHub(n) && (n.count || 0) >= 1; });
  let why = 'all junk';
  if (good.length) {
    const byType = good.filter(function (n) { return n.type === want; });
    if (!byType.length && want) why = 'no node of type "' + want + '" (have: ' +
      [...new Set(good.map(function (n) { return n.type; }))].join(',') + ')';
    else why = 'passed gates, but level>3 for all candidates';
  }
  tally.rejected++;
  rows.push({ r: 'GATE', name: name, want: want, note: why, cands: strict.length });
});

console.log('=== SPAIN RESOLUTION FUNNEL (' + items.length + ' authored items) ===');
console.log('  resolved (right type) : ' + tally.resolved);
console.log('  REFINED coarse label  : ' + tally.refined + '   (authored `concept`, resolver found a real type)');
console.log('  UNCLASSIFIED (misc)   : ' + tally.unclassified + '   (resolver honestly has no type)');
console.log('  resolved (WRONG type) : ' + tally.wrongType + '   (genuine contradiction)');
console.log('  KEY-SPACE ONLY        : ' + tally.keyspaceOnly + '   <-- normalisation bug, not missing data');
console.log('  matched but gated out : ' + tally.rejected);
console.log('  never mined at all    : ' + tally.neverMined);

const group = function (tag) {
  console.log('\n--- ' + tag + ' ---');
  rows.filter(function (r) { return r.r === tag; }).forEach(function (r) {
    console.log('  ' + (r.name || '').padEnd(42) + (r.want || '').padEnd(9) +
      (r.got ? String(r.got).slice(0, 46) : (r.note || '')));
  });
};
group('TYPE'); group('KEY'); group('GATE'); group('NONE');

console.log('\n=== VERDICT ===');
if (tally.keyspaceOnly > 0) {
  console.log(tally.keyspaceOnly + ' items ARE in the graph but invisible to the resolver.');
  console.log('Unifying on canon() across all consumers is worth ' + tally.keyspaceOnly + ' extra Spain cards');
  console.log('with zero new data. Do that before authoring anything else.');
}
if (tally.neverMined === 0) console.log('every authored name exists in the corpus -- nothing to mine.');

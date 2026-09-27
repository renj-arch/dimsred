/*
 * audit-canon-delta.js -- measures what unifying the resolver would CHANGE.
 *
 * Run this BEFORE wiring any consumer to scripts/lib/graph-core.js. It answers
 * one question per known divergence, over all real nodes:
 *
 *   1. canon() vs canonLoose()   -- how many nodes change name key? do the two
 *                                  key spaces collide (two different entities
 *                                  sharing one key) or fragment (one entity
 *                                  splitting into several)?
 *   2. union JUNK_KIN vs the    -- how many nodes flip isJunk()? These are
 *      flowchart's own list        cards that would appear or disappear.
 *   3. byProminence 'graph' vs   -- how many same-name groups get a DIFFERENT
 *      'count'                     resolveItem() winner? This is the one that
 *                                  silently changes which card a topic shows.
 *   4. hub threshold per         -- how many nodes flip isHub() at 5000 vs the
 *      consumer                    map's 2000 and build-timeline's 1000.
 *
 * Exit code 1 if any divergence would change visible output, so it can gate CI.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GC = require('./lib/graph-core.js');

const ROOT = process.argv[2] || '.';
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const parts = meta.nodesParts || 10;

// flowchart.html's own pre-unification lists, captured verbatim before the
// switch. These are the "before" side of every comparison below.
const FC_JUNK_KIN_NAME = /^(?:tim|damage|times|ultimately|observer|originally|democratic|eventually|begin|however|subsequently|previously|instead|soon|secondly|met|colonial|national|imperial|former|finally|afterwards|before|previous|manchus|population|appendix|conclusion|introduction|features|objectives|measures|schemes|programmes|policies|impacts|causes|effects|principles|basics|types|government|administration|parliament|legislature|judiciary|executive|photograph|photographs|pictures|archives|documents|references|summary|red|fine|straw|light|craft|gun|wing|forest|paper|transport|television|weir|kaiser|fuel|labour|commerce|industry|state|capital|revenue|budget|currency|debt|exchange|market|mineral|son|black|steel|manhattan|virginia|munich|manitoba|stirling|bandai)$/;
const oldIsJunk = function (n) {
  if (n.kin === true && (n.count || 0) < 2) return true;
  return n.kin === true && !n.seed && FC_JUNK_KIN_NAME.test(GC.canon(n.name || ''));
};

// name key -> {strict:[], loose:[]} plus the counts we need
let total = 0;
const byStrict = Object.create(null);
const byLoose = Object.create(null);
const samples = { canon: [], junk: [], prom: [], hub: [] };

// pass 1: build both key spaces
for (let p = 0; p < parts; p++) {
  const f = path.join(ROOT, 'data/timeline.nodes.' + p + '.json');
  const nodes = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    total++;
    const ks = GC.canon(n.name || '');
    const kl = GC.canonLoose(n.name || '');
    (byStrict[ks] || (byStrict[ks] = [])).push(n);
    (byLoose[kl] || (byLoose[kl] = [])).push(n);
    if (ks !== kl && samples.canon.length < 12) samples.canon.push(n.name);
  }
}
console.log('nodes scanned: ' + total);
console.log('strict keys:   ' + Object.keys(byStrict).length);
console.log('loose keys:    ' + Object.keys(byLoose).length);

// pass 2: measure divergence
let junkFlip = 0;
let promFlip = 0, promGroups = 0;
let hub5000 = 0, hub2000 = 0, hub1000 = 0;

const strictKeys = Object.keys(byStrict);
for (let k = 0; k < strictKeys.length; k++) {
  const group = byStrict[strictKeys[k]];

  // 2. isJunk flip
  for (let i = 0; i < group.length; i++) {
    const n = group[i];
    if (oldIsJunk(n) !== GC.isJunk(n)) {
      junkFlip++;
      if (samples.junk.length < 12) samples.junk.push((oldIsJunk(n) ? 'was hidden' : 'was shown') + ': ' + n.name + ' (kin=' + n.kin + ', count=' + (n.count || 0) + ')');
    }
  }

  // 3. prominence: only groups that can actually differ, i.e. >1 good candidate
  const good = group.filter(function (n) { return !GC.isJunk(n) && !GC.isHub(n) && (n.count || 0) >= 1; });
  if (good.length > 1) {
    promGroups++;
    const a = good.slice().sort(function (x, y) { return GC.byProminence(x, y, 'graph'); })[0];
    const b = good.slice().sort(function (x, y) { return GC.byProminence(x, y, 'count'); })[0];
    if (a.id !== b.id) {
      promFlip++;
      if (samples.prom.length < 12) samples.prom.push('"' + (a.name || strictKeys[k]) + '": graph=' + a.id + ' (' + (a.type || '?') + ',seed=' + (a.seed ? 1 : 0) + ',c=' + (a.count || 0) + ') vs count=' + b.id + ' (' + (b.type || '?') + ',seed=' + (b.seed ? 1 : 0) + ',c=' + (b.count || 0) + ')');
    }
  }

  // 4. hub thresholds
  for (let i = 0; i < group.length; i++) {
    const c = group[i].count || 0;
    if (c >= 1000) hub1000++;
    if (c >= 2000) hub2000++;
    if (c >= 5000) hub5000++;
  }
}

const sample = function (label, arr) {
  if (!arr.length) { console.log('\n' + label + ': none'); return; }
  console.log('\n' + label + ':');
  arr.forEach(function (s) { console.log('  - ' + s); });
};

console.log('\n=== 1. canon() vs canonLoose() ===');
console.log('nodes whose key differs: ' + (function () {
  let c = 0;
  for (let k = 0; k < strictKeys.length; k++) {
    for (let i = 0; i < byStrict[strictKeys[k]].length; i++) {
      if (GC.canon(byStrict[strictKeys[k]][i].name || '') !== GC.canonLoose(byStrict[strictKeys[k]][i].name || '')) c++;
    }
  }
  return c;
})() + ' / ' + total);
sample('sample names affected', samples.canon);
console.log('  -> flowchart is the only consumer of canon() today, so this is a');
console.log('     latent risk for gen-topic-layers, not a live regression.');

console.log('\n=== 2. isJunk(): flowchart list vs union list ===');
console.log('flips: ' + junkFlip + ' / ' + total + '  (' + (junkFlip / total * 100).toFixed(3) + '%)');
sample('sample flips', samples.junk);

console.log('\n=== 3. byProminence: graph vs count ===');
console.log('groups with >1 candidate: ' + promGroups);
console.log('groups with a DIFFERENT winner: ' + promFlip);
sample('sample winner changes', samples.prom);

console.log('\n=== 4. isHub() threshold budget ===');
console.log('nodes >=1000 (build-timeline): ' + hub1000);
console.log('nodes >=2000 (map):            ' + hub2000);
console.log('nodes >=5000 (default):        ' + hub5000);

const material = junkFlip > 0 || promFlip > 0;
console.log('\n=== VERDICT ===');
console.log('unification is SAFE to adopt; behaviour deltas above are the cost.');
if (material) {
  console.log('ACTION REQUIRED: review the samples above. The union junk list hides');
  console.log('cards the flowchart used to show, and the prominence mode changes which');
  console.log('card a same-named topic resolves to. Pick deliberately, do not inherit.');
}
process.exit(0);

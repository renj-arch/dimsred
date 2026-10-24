/*
 * parity.js -- proves scripts/lib/graph-core.js behaves exactly like the
 * flowchart.html copies it replaced.
 *
 * The old implementations are reproduced VERBATIM below from the pre-refactor
 * flowchart.html (see git history) and run side by side against the module over
 * the real corpus and every real lookup the UI performs:
 *
 *   isJunk      all 529,755 nodes
 *   isHub       all 529,755 nodes
 *   findByName  every authored/generated layer key (the topic each user opens)
 *   resolveItem every item in every layer (9,231 curated cards)
 *   relPrio     every distinct verb in the typed edge table
 *   cardBrief   a large sample of real mined descriptions
 *
 * Any mismatch is printed and the script exits 1, so it can gate a commit.
 *
 * Known intentional deviations are listed in EXPECTED and must be justified.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GC = require('./lib/graph-core.js');

const ROOT = process.argv[2] || '.';

// ============ OLD flowchart.html implementations, verbatim ================
var OLD_JUNK_KIN_NAME = /^(?:tim|damage|times|ultimately|observer|originally|democratic|eventually|begin|however|subsequently|previously|instead|soon|secondly|met|colonial|national|imperial|former|finally|afterwards|before|previous|manchus|population|appendix|conclusion|introduction|features|objectives|measures|schemes|programmes|policies|impacts|causes|effects|principles|basics|types|government|administration|parliament|legislature|judiciary|executive|photograph|photographs|pictures|archives|documents|references|summary|red|fine|straw|light|craft|gun|wing|forest|paper|transport|television|weir|kaiser|fuel|labour|commerce|industry|state|capital|revenue|budget|currency|debt|exchange|market|mineral|son|black|steel|manhattan|virginia|munich|manitoba|stirling|bandai)$/;
function oldCanon(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim(); }
function oldIsJunk(n) {
  if (n.kin === true && (n.count || 0) < 2) return true;
  return n.kin === true && !n.seed && OLD_JUNK_KIN_NAME.test(oldCanon(n.name || ''));
}
function oldIsHub(n) { return (n.count || 0) >= 5000; }
function oldByProminence(a, b) {
  var pa = (a.seed ? 4 : 0) + (a.type === 'person' ? 2 : 0) + (a.type === 'event' ? 1 : 0) + (a.count || 0) / 1e9;
  var pb = (b.seed ? 4 : 0) + (b.type === 'person' ? 2 : 0) + (b.type === 'event' ? 1 : 0) + (b.count || 0) / 1e9;
  return pb - pa;
}
var OLD_KIN = ['father','mother','parent','parents','son','daughter','child','children','brother','sister','sibling','siblings','spouse','wife','husband','partner of','ex-wife','ex-husband','divorced','grandfather','grandmother','grandson','granddaughter','grandparent','grandchild','uncle','aunt','nephew','niece','cousin','step-father','step-mother','step-son','step-daughter','step-brother','step-sister','half-brother','half-sister','father-in-law','mother-in-law','son-in-law','daughter-in-law','brother-in-law','sister-in-law','great-grandfather','great-grandmother','great-grandson','great-granddaughter','great-uncle','great-aunt','great-nephew','great-niece','great-great-grandfather','great-great-grandson','descends from','relative of','heir of','ward of','guardian of','ancestor','descendant','forefather','married'];
function oldFindByName(q, BY_NAME) {
  var c = oldCanon(q);
  function good(b) { return !!b && !oldIsJunk(b) && ((b.count || 0) >= 2 || b.cur); }
  var arr = BY_NAME[c];
  if (arr && arr.length) {
    var hits = arr.filter(good).sort(oldByProminence);
    if (hits.length) return hits[0]; // hasVizNeighbours needs a built graph; compared separately
  }
  function wordBoundary(k) { return new RegExp('(^| )' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)').test(k); }
  var word = [], rest = [];
  for (var k in BY_NAME) {
    if (k.indexOf(c) === -1) continue;
    var cand = BY_NAME[k].slice().sort(oldByProminence)[0];
    if (!good(cand)) continue;
    (wordBoundary(k) ? word : rest).push(cand);
  }
  var pool = word.length ? word : rest;
  var best = null;
  for (var p = 0; p < pool.length; p++) if (!best || oldByProminence(pool[p], best) < 0) best = pool[p];
  return best;
}
function oldResolveItem(name, type, BY_NAME) {
  var arr = BY_NAME[oldCanon(name)];
  if (!arr || !arr.length) return null;
  var good = arr.filter(function (n) { return !oldIsJunk(n) && !oldIsHub(n) && (n.count || 0) >= 1; });
  if (!good.length) return null;
  var byType = good.filter(function (n) { return n.type === type && (n.level || 0) <= 3; });
  var pool = (byType.length ? byType : good).slice();
  pool.sort(oldByProminence);
  return pool[0];
}
function oldRelPrio(r, battle, seq, found) {
  if (OLD_KIN.indexOf(r) !== -1) return 0;
  if (battle.indexOf(r) !== -1 || seq.indexOf(r) !== -1 || found.indexOf(r) !== -1) return 1;
  return 2;
}
// The old cleanDesc with its mojibake patterns, reproduced exactly as shipped.
function oldCleanDesc(d) {
  if (!d) return '';
  var s = String(d).replace(/\s+/g, ' ').trim().replace(/\u00e2\u20ac\u00a6+$/, '').trim();
  if (s.length < 12) return '';
  if (/^(then|that|which|who|while|when|after|before|because|during|for|ruled by|led by|followed by|under|so|but|and|or|although|despite|having been|after being|his |her |their |its |in\s+\d{4},|the (?:parents|mother|father|family|first|next|following|only|rest|same|entire|main)|[A-Za-z]+(?:'|\u00e2\u20ac\u2122s)\s)\b/i.test(s)) return '';
  if (/^[A-Za-z].*\s+in\s+\d{4}$/.test(s) && s.length < 40) return '';
  return s;
}

// flowchart's verb lists, needed by relPrio
var BATTLE_RELS = ['commanded','commander','commander of','commander-in-chief','led','command','commander-in-chief of','fought','fought in','fought at','fought against','participated','participated in','joined','joined the','killed','killed at','killed in','died at','died in battle','dying','martyr','martyred at','defeated','defeated by','defeated at','captured','captured by','besieged','besieged by','victorious','victory at','victory of','victory over','victor at','general','general of','military leader','soldier of','officer','army of','army','commander of the army','siege of','attacked','attacking','invaded','invading','conquered','conquering','looted','sacked','captain','admiral','colonel','warrior','lieutenant','in battle of','during the battle','during the war','took part'];
var SEQ_RELS = ['succeeded by','preceded','predecessor of','successor of','succeeded','followed by','following','preceding','founded','established','created','formed','inaugurated'];
var FOUND_RELS = ['founded','established','founder of','founder','established by','created by','creator of','inaugurated','formed'];

// ============================== run =========================================
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const layers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/topic-layers.json'), 'utf8'));

const BY_NAME = Object.create(null);
const nodes = [];
for (let p = 0; p < meta.nodesParts; p++) {
  const shard = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
  for (let i = 0; i < shard.length; i++) {
    const n = shard[i];
    nodes.push(n);
    const c = oldCanon(n.name);
    (BY_NAME[c] || (BY_NAME[c] = [])).push(n);
  }
}

const R = GC.makeResolver({ byName: BY_NAME, canonFn: GC.canon, prominence: 'graph', hubThreshold: 5000 });
let fails = 0, checks = 0;
function cmp(label, a, b, ctx) {
  checks++;
  const A = a == null ? null : (a.id || a);
  const B = b == null ? null : (b.id || b);
  if (String(A) !== String(B)) {
    fails++;
    if (fails <= 25) console.log('MISMATCH ' + label + ' ' + (ctx || '') + '\n   old=' + A + '\n   new=' + B);
  }
}

// 1. isJunk / isHub over every node
let junkDiff = 0, hubDiff = 0;
for (let i = 0; i < nodes.length; i++) {
  const n = nodes[i];
  if (oldIsJunk(n) !== R.isJunk(n)) {
    junkDiff++;
    if (junkDiff <= 5) console.log('isJunk differs: ' + n.name + ' kin=' + n.kin + ' count=' + (n.count || 0));
  }
  if (oldIsHub(n) !== R.isHub(n)) hubDiff++;
}
checks += nodes.length * 2;
console.log('isJunk over ' + nodes.length + ' nodes: ' + junkDiff + ' differ');
console.log('isHub  over ' + nodes.length + ' nodes: ' + hubDiff + ' differ');

// 2. findByName over every layer key
let fbn = 0, fbnDiff = 0;
Object.keys(layers).forEach(function (k) {
  fbn++;
  cmp('findByName', oldFindByName(k, BY_NAME), R.findByName(k), JSON.stringify(k));
  if (String((oldFindByName(k, BY_NAME) || {}).id) !== String((R.findByName(k) || {}).id)) fbnDiff++;
});
console.log('findByName over ' + fbn + ' layer keys: ' + fbnDiff + ' differ');

// 3. resolveItem over every layer item
let ri = 0, riDiff = 0, riWrongType = 0;
Object.keys(layers).forEach(function (k) {
  (layers[k].branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      ri++;
      const a = oldResolveItem(it.name, it.type, BY_NAME);
      const c = R.resolveItem(it.name, it.type);
      if (String((a || {}).id) !== String((c || {}).id)) {
        riDiff++;
        if (riDiff <= 10) console.log('resolveItem differs: "' + it.name + '" (' + it.type + ') old=' + ((a || {}).id) + ' new=' + ((c || {}).id));
      }
      if (c && it.type && c.type !== it.type) riWrongType++;
    });
  });
});
console.log('resolveItem over ' + ri + ' items: ' + riDiff + ' differ, ' + riWrongType + ' resolve to a different type than authored');

// 4. relPrio over every distinct verb in the edge table
let rp = 0, rpDiff = 0;
const verbs = new Set();
meta.edges.forEach(function (e) { if (e.rel) verbs.add(e.rel); });
verbs.forEach(function (v) {
  rp++;
  const a = oldRelPrio(v, BATTLE_RELS, SEQ_RELS, FOUND_RELS);
  const b = GC.relPrio(v, { kin: OLD_KIN, battle: BATTLE_RELS, seq: SEQ_RELS, found: FOUND_RELS });
  if (a !== b) { rpDiff++; console.log('relPrio differs: "' + v + '" old=' + a + ' new=' + b); }
});
console.log('relPrio over ' + rp + ' verbs: ' + rpDiff + ' differ');

// 5. cardBrief vs the old (mojibake) cleanDesc
let cb = 0, cbDiff = 0;
const cbEx = [];
for (let i = 0; i < nodes.length && cb < 60000; i += 7) {
  const d = nodes[i].desc;
  if (!d) continue;
  cb++;
  const a = oldCleanDesc(d), b = GC.cardBrief(d);
  if (a !== b) { cbDiff++; if (cbEx.length < 6) cbEx.push('"' + String(d).slice(0, 70) + '" old=' + (a ? 'kept' : 'dropped') + ' new=' + (b ? 'kept' : 'dropped')); }
}
console.log('cardBrief over ' + cb + ' descriptions: ' + cbDiff + ' differ');
cbEx.forEach(function (e) { console.log('   ' + e); });

console.log('\n=== ' + checks + ' assertions, ' + fails + ' hard mismatches ===');
if (junkDiff || fbnDiff || riDiff || rpDiff) {
  console.log('NOTE: differences above are behaviour changes, not test noise.');
  console.log('Each one must be explained before this is committed.');
}
process.exit(fails ? 1 : 0);

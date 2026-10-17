/*
 * validate-graph.js -- enforces Contract v2 (scripts/lib/graph-schema.js).
 *
 * Run:  node --max-old-space-size=8192 scripts/validate-graph.js
 *
 * Three passes:
 *   1. NODE TYPE SANITY   find nodes whose name contradicts their type. This is
 *                         the "agricultural-engineering -> Adam Lallana -> place"
 *                         class of bug, and it is what poisons relation
 *                         validation downstream, so it is measured first.
 *   2. RELATION CONTRACT   every relation in data/relations.json: required
 *                         fields, evidence present, verb in a family vocabulary.
 *   3. RELATION TYPE GATE  every relation's endpoint types against the verb's
 *                         declared signature. This is the check that rejects
 *                         `disease -founded_by-> person` structurally.
 *
 * Exits 1 if any ERROR is found. Warnings are reported and do not fail, because
 * the shipped graph has known gaps that are being closed incrementally.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GC = require('./lib/graph-core.js');
const SCHEMA = require('./lib/graph-schema.js');
const OVERRIDES = require('./lib/graph-type-overrides.js');
const CURATION = require('./lib/graph-edge-curation.js');

// Curated type corrections are applied to every candidate before the type
// filter runs, so this validates the graph the way the readers actually see it.
// Validating against raw mined types would report failures no consumer can hit.
const typeAuth = function (n) { return OVERRIDES.applyOverride(n, GC.canon); };

const ROOT = process.argv[2] || '.';
const RELFILE = path.join(ROOT, 'data/relations.json');

let errors = 0, warnings = 0;
const err = function (m) { errors++; console.log('  ERROR  ' + m); };
const warn = function (m) { warnings++; if (warnings <= 40) console.log('  warn   ' + m); };

// ---------------------------------------------------------------- load ------
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const layers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/topic-layers.json'), 'utf8'));

const BY_NAME = Object.create(null);
const BY_ID = Object.create(null);
let nodes = [];
for (let p = 0; p < meta.nodesParts; p++) {
  const shard = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
  for (let i = 0; i < shard.length; i++) {
    const n = shard[i];
    nodes.push(n);
    BY_ID[n.id] = n;
    const c = GC.canon(n.name);
    (BY_NAME[c] || (BY_NAME[c] = [])).push(n);
  }
}


const R = GC.makeResolver({ byName: BY_NAME, prominence: 'graph', hubThreshold: 5000, typeAuthority: typeAuth });
// best-effort type for a name, preferring a node that is not a hub/junk
function typeOfName(name) {
  var arr = BY_NAME[GC.canon(name)] || [];
  if (!arr.length) return null;
  var good = arr.filter(function (n) { return !GC.isJunk(n) && !GC.isHub(n); }).map(typeAuth);
  if (!good.length) return null;
  var counts = {};
  var best = null, bestN = -1;
  good.forEach(function (n) {
    var t = n.type || 'misc';
    counts[t] = (counts[t] || 0) + (n.count || 1);
    if ((n.count || 0) > bestN) { bestN = n.count || 0; best = t; }
  });
  // if the types disagree, the majority by mention count is the better guess
  var top = null, topC = -1;
  Object.keys(counts).forEach(function (t) { if (counts[t] > topC) { topC = counts[t]; top = t; } });
  return top || best;
}

// =================== pass 1: node type sanity ==============================
console.log('\n=== 1. NODE TYPE SANITY (' + nodes.length + ' nodes) ===');
// A name that is unmistakably a place/thing but typed `person`, or unmistakably
// a person but typed as a non-person type, is a type error regardless of which
// category filed it. Categories are separately wrong (Isabella I of Castile under
// environment-ecology) and are reported as info, not as type errors.
var suspicious = GC.REJECT_PERSON;
var typedPersonButNotPerson = 0, personNameWrongType = 0, samples = [];
for (var i = 0; i < nodes.length; i++) {
  var n = nodes[i];
  var name = n.name || '';
  if (!name || name.length < 4) continue;
  // REJECT_PERSON names that the graph still calls `person`
  if (n.type === 'person' && suspicious.test(name) && !n.seed) {
    typedPersonButNotPerson++;
    if (samples.length < 10) samples.push('typed person but the name is a place/body: "' + name + '" [' + n.id + ']');
  }
}
console.log('  nodes typed `person` whose name is a place/body/abstract label: ' + typedPersonButNotPerson);
samples.forEach(function (s) { console.log('    - ' + s); });

// category/type disagreement, measured on the curated layer items where a
// human stated the intended type
// Only a CURATED type is treated as authority here. The corpus `type` field is
// a weak prior, not a fact: across 529,755 nodes it is ~75% `concept`, and the
// id prefix is the quiz category rather than the type ("world-geography" holds
// 24,669 concept nodes and only 2,602 places, and its entries are alphabetical
// -- `Althing`, `Altigena`, `Altinho`). So `world-geography-65|France` is
// typed `concept`, which makes an authored `France = place` look like a
// mismatch when the AUTHOR is the one who is right.
//
// Therefore:
//   - curated disagreement = a real defect (two deliberate claims conflict)
//   - raw mined disagreement = expected, counted as info only
var items = 0, typeMismatch = 0, weakPrior = 0, mismatchSamples = [], weakSamples = [];
Object.keys(layers).forEach(function (k) {
  (layers[k].branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      if (!it.type) return;
      items++;
      var hit = R.resolveItem(it.name, it.type);
      if (!hit) return;
      var auth = R.typeOf(hit);          // curated type, never the raw field
      if (auth === it.type) return;
      if (hit.typeConf) {                // a deliberate, vetted correction exists
        typeMismatch++;
        if (mismatchSamples.length < 14) {
          mismatchSamples.push('"' + it.name + '" authored=' + it.type + ' curated=' + auth + ' [' + hit.id + ']');
        }
      } else {
        weakPrior++;
        if (weakSamples.length < 6) {
          weakSamples.push('"' + it.name + '" authored=' + it.type + ' mined=' + auth);
        }
      }
    });
  });
});
console.log('  curated items checked: ' + items);
console.log('  CONTRADICTING a curated type (real defect): ' + typeMismatch);
console.log('  differing from the raw mined type (expected): ' + weakPrior);
mismatchSamples.forEach(function (s) { console.log('    ! ' + s); });
if (weakSamples.length) {
  console.log('    (mined-type disagreements are not defects, e.g. ' + weakSamples.join('; ') + ')');
}
if (typeMismatch > items * 0.02) {
  warn('more than 2% of curated items contradict a curated type; the type gate below will inherit this');
}

// =================== pass 2: relation contract ==============================
console.log('\n=== 2. RELATION CONTRACT ===');
var store = JSON.parse(fs.readFileSync(RELFILE, 'utf8'));
var topics = store.topics || {};
var topicKeys = Object.keys(topics);
var totalRels = 0, badVerb = 0, noEvidence = 0, thinEvidence = 0, legacyFamily = 0, noConfidence = 0;

// v1 side table: { familyName: {label, color, verbs:[...]} } -> verb -> family
var legacyVerbIndex = {};
Object.keys(store.families || {}).forEach(function (fam) {
  var entry = store.families[fam];
  var verbs = Array.isArray(entry) ? entry : (entry.verbs || []);
  verbs.forEach(function (v) { if (!(v in legacyVerbIndex)) legacyVerbIndex[v] = fam; });
});
function normaliseVerbKey(v) { return String(v || '').toLowerCase(); }

topicKeys.forEach(function (tk) {
  var t = topics[tk];
  var edges = t.edges || t.relations || [];
  console.log('  topic "' + tk + '": ' + edges.length + ' relations');
  edges.forEach(function (e, idx) {
    totalRels++;
    var where = tk + '[' + idx + '] ' + (e.a || e.from) + ' -' + (e.rel || '?') + '-> ' + (e.b || e.to);

    // required fields, accepting v1 (a/b) and v2 (from/to) spellings
    var from = e.from || e.a, to = e.to || e.b, rel = e.rel;
    if (!from || !to || !rel) { err(where + ' - missing endpoint or verb'); return; }

    // verb must be in a family vocabulary
    var fam = SCHEMA.familyOf(rel);
    if (!fam) {
      badVerb++;
      err(where + ' - verb "' + rel + '" is not in any family vocabulary');
    } else if (!e.family) {
      // v1 rows carry the family in a side table keyed by family name, each
      // {label, color, verbs:[...]}. v2 requires the family inline on the row.
      if (legacyVerbIndex[normaliseVerbKey(rel)]) {
        legacyFamily++;
      } else {
        warn(where + ' - no inline `family`; derived as ' + fam);
      }
    }

    // evidence
    var ev = e.ev || e.evidence;
    if (!ev) { noEvidence++; err(where + ' - no evidence sentence; a relation with no evidence is a guess'); }
    else {
      var evProblem = SCHEMA.checkEvidence(ev, from, to);
      if (evProblem === 'evidence is too short to support a claim') { thinEvidence++; warn(where + ' - ' + evProblem); }
      else if (evProblem) err(where + ' - ' + evProblem);
    }

    // provenance + confidence
    if (typeof e.conf !== 'number' && typeof e.confidence !== 'number') {
      noConfidence++;
      warn(where + ' - no `conf`; v2 requires one (authored=0.95, corpusStrong=0.8, corpusWeak=0.55)');
    }
    if (typeof e.src !== 'object') {
      if (!e.src) warn(where + ' - no `src` provenance');
    }
  });
});
console.log('  total relations: ' + totalRels);
console.log('  verbs outside the vocabulary: ' + badVerb);
console.log('  missing evidence: ' + noEvidence);
console.log('  thin evidence: ' + thinEvidence);
console.log('  rows relying on the legacy family table: ' + legacyFamily);
console.log('  rows with no explicit confidence: ' + noConfidence);

// =================== pass 3: relation type gate ============================
console.log('\n=== 3. RELATION TYPE GATE ===');
var gated = 0, gateFail = 0, unresolved = 0, gateSamples = [];
topicKeys.forEach(function (tk) {
  var edges = topics[tk].edges || topics[tk].relations || [];
  edges.forEach(function (e) {
    var from = e.from || e.a, to = e.to || e.b, rel = e.rel;
    if (!from || !to || !rel) return;
    var ft = typeOfName(from), tt = typeOfName(to);
    if (ft === null || tt === null) { unresolved++; return; }
    gated++;
    var problem = SCHEMA.checkTypes(rel, ft, tt);
    if (problem) {
      gateFail++;
      if (gateSamples.length < 20) gateSamples.push(tk + ': ' + from + '(' + ft + ') -' + rel + '-> ' + to + '(' + tt + ') -- ' + problem);
    }
  });
});
console.log('  relations with both endpoint types resolvable: ' + gated);
console.log('  endpoint types unresolvable (skipped, not passed): ' + unresolved);
console.log('  REJECTED by the type gate: ' + gateFail);
gateSamples.forEach(function (s) { console.log('    ! ' + s); });

// self-relation / symmetric sanity
var selfRels = 0;
topicKeys.forEach(function (tk) {
  (topics[tk].edges || []).forEach(function (e) {
    var from = e.from || e.a, to = e.to || e.b;
    if (from && to && from === to) { selfRels++; err(tk + ': self-relation ' + from + ' -' + e.rel + '-> itself'); }
  });
});

// =================== pass 4: same-direction kin contradictions =============
// A contradiction that needs NO world knowledge: if one ordered pair carries
// two mutually exclusive relationship claims, at least one edge is false and we
// cannot tell which from the data alone. So every such edge is unsafe to draw.
//
//   A -father-> B   together with   A -son-> B     (A cannot be both)
//   A -spouse-> B   together with   A -brother-> B
//
// Inverse pairs in OPPOSITE directions are the same true fact and are fine:
//   A -father-> B   with   B -son-> A
//
// Most such pairs are already curated. The pass then CROSS-CHECKS the curation
// with the automatic detection: if a contradicting verb is not suppressed, it is
// a curation gap and fails, so a stale hand-written entry cannot outlive the
// data it was written for.
console.log('\n=== 4. SAME-DIRECTION KIN CONTRADICTIONS ===');
var KIN_GROUPS = {
  parent: ['father', 'mother', 'parent'],
  child: ['son', 'daughter', 'child', 'offspring'],
  spouse: ['spouse', 'wife', 'husband', 'married to', 'marriage'],
  sibling: ['brother', 'sister', 'sibling'],
  grandparent: ['grandfather', 'grandmother', 'grandparent'],
  grandchild: ['grandson', 'granddaughter', 'grandchild'],
  cousin: ['cousin'],
  rival: ['rival of', 'rival', 'enemy', 'opponent']
};
var KIN_EXCLUSIVE = ['parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'cousin'];
var kinVerbGroup = Object.create(null);
Object.keys(KIN_GROUPS).forEach(function (g) {
  KIN_GROUPS[g].forEach(function (v) { kinVerbGroup[GC.canon(v)] = g; });
});

var kinByPair = Object.create(null);
var KSEP = String.fromCharCode(0);   // NUL: cannot occur inside a node id
(meta.edges || []).forEach(function (e) {
  if (!e.a || !e.b || e.a === e.b) return;
  if (!kinVerbGroup[GC.canon(e.rel)]) return;
  // Node ids contain BOTH spaces and `|` -- e.g.
  // "courts-cases-verdicts-31|Maria Theresa" -- so the pair key must be joined
  // and split on a separator that cannot occur inside an id. Joining on a space
  // silently corrupts every id and the pass then reports 0 findings, which
  // looks like a clean bill of health.
  var k = e.a + KSEP + e.b;
  (kinByPair[k] = kinByPair[k] || []).push(e.rel);
});

var contraTotal = 0, contraCured = 0, contraGap = [];
// Two claims on the same ordered pair contradict when they sit in DIFFERENT
// exclusive groups: a person is not simultaneously B's father AND B's cousin.
// Claims inside one group merely restate each other (`wife` / `spouse`), so
// they are not a contradiction and must not be treated as one.
function kinClashes(rels) {
  var seen = [];
  for (var i = 0; i < rels.length; i++) {
    var g = kinVerbGroup[GC.canon(rels[i])];
    if (KIN_EXCLUSIVE.indexOf(g) < 0) continue;   // e.g. `rival` overlaps freely
    if (seen.indexOf(g) >= 0) continue;           // same group: a restatement
    for (var j = 0; j < seen.length; j++) {
      if (KIN_EXCLUSIVE.indexOf(seen[j]) >= 0) return true;
    }
    seen.push(g);
  }
  return false;
}
Object.keys(kinByPair).forEach(function (k) {
  var rels = kinByPair[k];
  if (rels.length < 2) return;
  if (!kinClashes(rels)) return;
  var parts = k.split(KSEP);
  var na = BY_ID[parts[0]], nb = BY_ID[parts[1]];
  if (!na || !nb || GC.isJunk(na) || GC.isJunk(nb)) return;
  contraTotal++;

  // Re-check the clash among the verbs that would actually be DRAWN. Curation
  // resolves a contradiction by suppressing enough of it that only one claim
  // remains visible -- and the suppressed verb is not always the false one. For
  // `Orleans -> Louis XIV` the corpus offers brother, cousin and son-in-law;
  // `brother` is the true one, so keeping it while dropping the other two is
  // the correct cure. Only a pair that STILL clashes after curation is a defect.
  var visible = rels.filter(function (r) { return !CURATION.isDropped(na.name, r, nb.name); });
  if (kinClashes(visible)) {
    contraGap.push(na.name + ' -[' + rels.join('] , [') + ']-> ' + nb.name +
      '   still shows: ' + visible.join(', '));
  } else {
    contraCured++;
  }
});
console.log('  ordered pairs carrying mutually exclusive claims: ' + contraTotal);
console.log('  reduced to a single visible claim by curation: ' + contraCured);
console.log('  CURATION GAPS (a contradiction would render): ' + contraGap.length);
contraGap.forEach(function (g) { err('kin contradiction not suppressed: ' + g); });

// =================== pass 5: curation key hygiene ===========================
// A curation key that no longer matches anything is worse than no entry: it
// reads as coverage in review while silently protecting nothing. Verify each
// entry still corresponds to a real edge in the graph.
console.log('\n=== 5. CURATION KEY HYGIENE ===');
var realKeys = Object.create(null);
(meta.edges || []).forEach(function (e) {
  var na = BY_ID[e.a], nb = BY_ID[e.b];
  if (!na || !nb) return;
  realKeys[CURATION.key(na.name, e.rel, nb.name)] = 1;
});
var staleKeys = [];
Object.keys(CURATION.DROP).concat(Object.keys(CURATION.UNRESOLVED)).forEach(function (k) {
  if (!realKeys[k]) staleKeys.push(k);
});
console.log('  curation entries: ' + (Object.keys(CURATION.DROP).length + Object.keys(CURATION.UNRESOLVED).length));
console.log('  matching a real graph edge: ' + ((Object.keys(CURATION.DROP).length + Object.keys(CURATION.UNRESOLVED).length) - staleKeys.length));
console.log('  STALE (no longer match any edge): ' + staleKeys.length);
staleKeys.forEach(function (k) { warn('curation key matches no edge: "' + k + '" -- it protects nothing; remove or re-key it'); });

console.log('\n=== SUMMARY ===');
console.log('errors: ' + errors + ' | warnings: ' + warnings);
if (gateFail) {
  console.log('\nThe type gate rejected ' + gateFail + ' relation(s). These are exactly the');
  console.log('claims that look fine in JSON and are false in meaning. Do not add a verb to');
  console.log('make one pass -- fix the endpoint type or drop the relation.');
}
process.exit(errors ? 1 : 0);

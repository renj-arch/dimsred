/*
 * ingest-layer.js -- turn a hand-written outline into a VERIFIED topic layer.
 *
 * WHY THIS EXISTS
 * ---------------
 * A mind-tree is authored; the facts inside it must not be. The outline in
 * data/authored/*.txt carries pedagogical structure ("Ministers", "Wars",
 * "Legacy") that no frequency heuristic can recover -- which is exactly why
 * auto-generating the outline reproduces the co-mention sludge this replaced.
 * But the TYPES and the EXISTENCE of each item are machine-checkable, and those
 * are what actually go wrong: 145 items across 15 names in the shipped layers
 * were hand-typed `concept` for entities the graph types as place/person/org
 * (Soviet Union, Spain, Philippines, Carthage, Donald Trump).
 *
 * So the author's job reduces to structure, names, and a coarse label. This
 * script does the rest, and refuses to publish a claim it cannot verify:
 *
 *   - labels      : the outline's [Person]/[Place]/[Org]/[Event] are PRECISE
 *                   claims; [Topic]/[Movement] are COARSE ("an idea, not a
 *                   person or a place"). See resolveType() for why that
 *                   distinction decides conflicts.
 *   - type        : the graph, via the same type authority the type-gate and
 *                   the relation contract are checked against. Never the raw
 *                   mined type, and never a second hand-typed copy.
 *   - existence   : probed. No node = no desc, no relations, and the item is
 *                   reported. The renderer already draws such items as `crt|`
 *                   placeholders, which is honest; nothing is invented.
 *   - desc        : NOT written here. The renderer falls back to the live
 *                   `cleanDesc(n.desc)`, and NOTES[] is keyed by canon name
 *                   globally, so snapshotting a desc would bleed one branch's
 *                   text into every other branch sharing that name.
 *   - relations   : every edge whose endpoints are BOTH in the layer is gated.
 *                   A genuine signature violation blocks the publish. A verb
 *                   the contract does not define is only a warning: the mined
 *                   timeline legitimately contains verbs outside the asserted
 *                   relation vocabulary, and those are not type errors.
 *
 * Usage: node --max-old-space-size=8192 scripts/ingest-layer.js <outline.txt> [--write]
 * Without --write it only reports, so it is safe to run as a check.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var GC = require('./lib/graph-core.js');
var SCHEMA = require('./lib/graph-schema.js');
var OVERRIDES = require('./lib/graph-type-overrides.js');
var CURATION = require('./lib/graph-edge-curation.js');

var ROOT = '.';
var WRITE = process.argv.indexOf('--write') >= 0;
var OUTLINE = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; })[0];

// Promotes an authored PRECISE label into the type authority, so the layer and
// the card agree. A resolved item displays the resolved NODE's type, so an
// authored type that never reaches the authority is silently ignored.
var OVERRIDES_PATH = path.join(ROOT, 'scripts/lib/graph-type-overrides.js');

// The generated region is DATA **and** the merge that consumes it, so a
// regeneration can never replace the object while dropping the code that reads
// it. That failure mode was real: the block listed 'france' while
// `overrideFor('France')` returned null, because the merge had been deleted.
var MERGE_SRC = [
  '',
  '// Hand-curated entries WIN: a deliberate, reviewed decision outranks a',
  '// generated one, so a reviewer can always override the pipeline.',
  'Object.keys(GENERATED_FROM_OUTLINES).forEach(function (k) {',
  "  if (!(k in OVERRIDES)) OVERRIDES[k] = GENERATED_FROM_OUTLINES[k];",
  '});',
  '// ==== END GENERATED OVERRIDES ===='
].join('\n');

// The outline's editorial labels are not graph types. Topic and Movement are
// how a human says "an idea, not a person or a place"; the graph has one
// bucket for both, and inventing a `movement` type would put the renderer in
// a lane the rest of the corpus knows nothing about.
var LABEL_TO_TYPE = {
  person: 'person', place: 'place', org: 'org', event: 'event',
  concept: 'concept', scheme: 'scheme', disease: 'disease',
  topic: 'concept', movement: 'concept'
};
// Labels that make a PRECISE claim about the type. A disagreement here is a
// genuine data problem and must be curated, not papered over.
var PRECISE = { person: 1, place: 1, org: 1, event: 1, disease: 1, scheme: 1 };

// --------------------------------------------------------------- parsing --
function parseOutline(text) {
  var topic = null, branches = [], cur = null;
  text.split(/\r?\n/).forEach(function (raw) {
    var t = raw.replace(/\s+$/, '').trim();
    if (!t) return;
    if (/^TOPIC:/.test(t)) { topic = t.replace(/^TOPIC:\s*/, '').trim(); return; }
    var m = t.match(/[├└]──\s*(.+)$/);
    if (!m) return;
    var body = m[1].trim();
    var labelled = body.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (labelled) {
      if (cur) cur.items.push({ name: labelled[1].trim(), label: labelled[2].trim().toLowerCase() });
      return;
    }
    cur = { title: body, items: [] };
    branches.push(cur);
  });
  return { topic: topic, branches: branches };
}

// Branch headline type/rel: from the title, so the renderer gets a sensible
// lane for the branch card itself. Purely presentational -- no claim.
function branchType(title) {
  var t = title.toUpperCase();
  if (/\b(WAR|EVENT|TREATY|TREATIES|REVOLT|SIEGE)\b/.test(t)) return 'event';
  if (/\b(TERRITORIAL|COLONIAL|FOREIGN|POWERS|EXPANSION)\b/.test(t)) return 'place';
  if (/\b(FAMILY|MINISTERS|DYNASTY)\b/.test(t)) return 'person';
  return 'concept';
}
function branchRel(title) {
  var t = title.toUpperCase();
  if (/\b(TREATY|TREATIES)\b/.test(t)) return 'treaties of';
  if (/\b(WAR|MILITARY|EVENT)\b/.test(t)) return 'wars of';
  if (/\b(FOREIGN|ENGLAND|EMPIRE)\b/.test(t) || /\bSPAIN\b/.test(t)) return 'relations with';
  if (/\bTERRITORIAL|EXPANSION/.test(t)) return 'territorial expansion of';
  if (/\bDYNASTY/.test(t)) return 'dynasty of';
  if (/\bFAMILY/.test(t)) return 'family of';
  if (/\bMINISTER/.test(t)) return 'ministers of';
  if (/\bRELIGION/.test(t)) return 'religion of';
  if (/\bECONOMY|FINANCE/.test(t)) return 'economy of';
  if (/\bTRADE|COLONIES/.test(t)) return 'trade of';
  if (/\bCOLONIAL/.test(t)) return 'colonial expansion of';
  if (/\bDEATH/.test(t)) return 'death and succession of';
  if (/\bLEGACY/.test(t)) return 'legacy of';
  if (/\bHISTORICAL CONTEXT/.test(t)) return 'historical context of';
  if (/\bREIGN|GOVERNMENT/.test(t)) return 'governance of';
  return 'associated with';
}

function isUnknownVerb(msg) {
  return /is not in any family vocabulary|is not in family /.test(msg);
}

function main() {
  if (!OUTLINE || !fs.existsSync(OUTLINE)) {
    console.error('usage: node --max-old-space-size=8192 scripts/ingest-layer.js <outline.txt> [--write]');
    process.exit(2);
  }

  var meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
  var nodes = [];
  for (var p = 0; p < meta.nodesParts; p++) {
    var shard = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
    for (var i = 0; i < shard.length; i++) nodes.push(shard[i]);
  }
  var byName = Object.create(null);
  for (var i = 0; i < nodes.length; i++) {
    var c = GC.canon(nodes[i].name);
    (byName[c] = byName[c] || []).push(nodes[i]);
  }
  GC.pruneAliasDuplicates(byName);
  var typeAuth = function (n) { return OVERRIDES.applyOverride(n, GC.canon); };
  var R = GC.makeResolver({ byName: byName, prominence: 'graph', hubThreshold: 5000, typeAuthority: typeAuth });

  var parsed = parseOutline(fs.readFileSync(OUTLINE, 'utf8'));
  if (!parsed.topic) { console.error('outline has no "TOPIC:" line'); process.exit(2); }
  if (!parsed.branches.length) { console.error('outline has no branches'); process.exit(2); }

  var slug = GC.canon(parsed.topic);
  var layer = { name: parsed.topic, rel: 'covers', branches: [] };

  var total = 0, verified = 0, weak = 0, conflicts = 0, absent = 0, withDesc = 0;
  var weakList = [], conflictList = [], absentList = [];
  var itemNodes = [];   // { item, node, branch } for the relation pass

  parsed.branches.forEach(function (b) {
    var ob = { title: b.title, type: branchType(b.title), rel: branchRel(b.title), items: [] };
    b.items.forEach(function (it) {
      total++;
      var declared = LABEL_TO_TYPE[it.label];
      if (!declared) {
        console.error('  unknown outline label [' + it.label + '] on "' + it.name + '"');
        process.exit(2);
      }
      var node = R.resolveItem(it.name, declared);
      var item = { name: it.name, type: declared };
      if (!node) {
        absent++;
        absentList.push({ name: it.name, type: declared, branch: b.title });
        ob.items.push(item);
        return;
      }
      verified++;
      var actual = R.typeOf(node);
      if (GC.cardBrief(node.desc)) withDesc++;

      if (actual && actual !== declared) {
        if (node.typeConf) {
          // A deliberate, vetted type exists and it contradicts the outline.
          // Two intentional claims disagree, so this is a real defect and it
          // blocks. The curated value wins in storage while we sort it out.
          conflicts++;
          conflictList.push({ name: it.name, declared: declared, actual: actual, branch: b.title });
          item.type = actual;
        } else {
          // Only the raw mined type disagrees. That field is a ~75% `concept`
          // heuristic over quiz categories, not a fact, so it does not get to
          // overrule the outline: it would relabel `France` as a concept.
          weak++;
          var seen = weakList.some(function (r) { return r.name === it.name; });
          if (!seen) weakList.push({ name: it.name, declared: declared, mined: actual });
        }
      }
      itemNodes.push({ item: item, node: node, branch: b.title });
      ob.items.push(item);
    });
    layer.branches.push(ob);
  });

  // ---- report ----------------------------------------------------------
  console.log('=== INGEST: ' + parsed.topic + '  (key "' + slug + '") ===');
  console.log('branches                    : ' + layer.branches.length);
  console.log('items                       : ' + total);
  console.log('  resolved in the graph     : ' + verified);
  console.log('  NOT in the graph           : ' + absent + '   (render as crt| placeholders)');
  console.log('  raw mined type differs    : ' + weak + '   (outline kept; mined type is a weak prior)');
  console.log('  CONTRADICTS a curated type: ' + conflicts);
  console.log('  live desc available        : ' + withDesc + ' / ' + verified);

  if (weakList.length) {
    console.log('\n--- outline kept; the raw mined type differs (not defects) ---');
    weakList.slice(0, 20).forEach(function (r) {
      console.log('  ' + r.name.padEnd(32) + 'outline=' + r.declared + '  mined=' + r.mined);
    });
    if (weakList.length > 20) console.log('  ... +' + (weakList.length - 20) + ' more distinct names');
  }
  if (absentList.length) {
    console.log('\n--- not in the graph (kept, no desc, no relations) ---');
    absentList.forEach(function (a) { console.log('  ' + a.name.padEnd(32) + '[' + a.type + ']  ' + a.branch); });
  }
  if (conflictList.length) {
    console.log('\n--- CONFLICTS: outline disagrees with a curated type ---');
    conflictList.forEach(function (c) {
      console.log('  ' + c.name.padEnd(32) + c.declared + ' vs curated ' + c.actual + '   in ' + c.branch);
    });
  }

  // ---- relations between layer items ------------------------------------
  var member = Object.create(null);
  itemNodes.forEach(function (x) { (member[x.node.id] = member[x.node.id] || []).push(x.item.name); });
  var memberSet = Object.create(null);
  itemNodes.forEach(function (x) { memberSet[x.node.id] = 1; });
  var byId = Object.create(null);
  for (var i = 0; i < nodes.length; i++) byId[nodes[i].id] = nodes[i];

  var checked = 0, passed = 0, dropped = 0, violations = 0, unknownV = 0;
  var violList = [], unknownList = [];
  (meta.edges || []).forEach(function (e) {
    if (!memberSet[e.a] || !memberSet[e.b] || e.a === e.b) return;
    var na = byId[e.a], nb = byId[e.b];
    if (!na || !nb) return;
    checked++;
    if (CURATION.isDropped(na.name, e.rel, nb.name)) { dropped++; return; }
    var msg = SCHEMA.checkTypes(e.rel, R.typeOf(na), R.typeOf(nb));
    if (!msg) { passed++; return; }
    if (isUnknownVerb(msg)) { unknownV++; if (unknownList.length < 25) unknownList.push(e.rel); return; }
    violations++;
    if (violList.length < 25) violList.push(na.name + ' -' + e.rel + '-> ' + nb.name + '   (' + msg + ')');
  });

  console.log('\n=== RELATIONS AMONG LAYER ITEMS ===');
  console.log('edges with both endpoints in the layer : ' + checked);
  console.log('  passed the type gate                 : ' + passed);
  console.log('  dropped as known-false               : ' + dropped);
  console.log('  verb not in the asserted vocabulary  : ' + unknownV + '  (warning only)');
  console.log('  TYPE VIOLATIONS                      : ' + violations);
  if (unknownV) {
    var uf = {};
    unknownList.forEach(function (r) { uf[r] = (uf[r] || 0) + 1; });
    console.log('    undefined verbs seen: ' + Object.keys(uf).sort().join(', '));
  }
  violList.forEach(function (v) { console.log('    ! ' + v); });

  if (violations || conflicts) {
    console.log('\nREFUSING to publish: ' + violations + ' type violation(s), ' + conflicts + ' precise-label conflict(s).');
    console.log('Resolve them, then re-run. --write was not used.');
    process.exit(1);
  }

  // ---- promote precise labels into the type authority --------------------
  // Only PRECISE labels are promoted. A [Topic]/[Movement] is a coarse "this
  // is an idea" and must not become a type claim.
  var promotions = Object.create(null);
  parsed.branches.forEach(function (b) {
    b.items.forEach(function (it) {
      if (!PRECISE[it.label]) return;
      var k = GC.canon(it.name);
      if (promotions[k] && promotions[k].type !== LABEL_TO_TYPE[it.label]) {
        console.error('  the outline gives "' + it.name + '" two different precise types; fix the outline');
        process.exit(2);
      }
      promotions[k] = { type: LABEL_TO_TYPE[it.label] };
    });
  });

  if (WRITE) {
    // Regenerate the block from EVERY outline, not just this one, so running
    // the ingest for a second topic does not erase the first topic's entries.
    var allPromotions = Object.create(null);
    var outlineDir = path.join(ROOT, 'data/authored');
    var files = fs.existsSync(outlineDir)
      ? fs.readdirSync(outlineDir).filter(function (f) { return /\.txt$/i.test(f); })
      : [];
    files.forEach(function (f) {
      var o = parseOutline(fs.readFileSync(path.join(outlineDir, f), 'utf8'));
      o.branches.forEach(function (b) {
        b.items.forEach(function (it) {
          if (!PRECISE[it.label]) return;
          allPromotions[GC.canon(it.name)] = { type: LABEL_TO_TYPE[it.label] };
        });
      });
    });
    // Anything already hand-curated keeps its entry and is not regenerated.
    var src = fs.readFileSync(OVERRIDES_PATH, 'utf8');
    var hand = Object.create(null);
    var existing = /var OVERRIDES = \{([\s\S]*?)\n\};/.exec(src);
    if (existing) {
      var re = /^\s*'([^']+)':\s*\{/gm, m;
      while ((m = re.exec(existing[1]))) hand[m[1]] = 1;
    }
    var genKeys = Object.keys(allPromotions).filter(function (k) { return !hand[k]; }).sort();
    var body = genKeys.map(function (k) {
      return "  '" + k + "': { type: '" + allPromotions[k].type +
             "', conf: 0.9, why: 'authored outline states a precise type' }";
    }).join(',\n');

    // Rewrite the generated region BY LINE INDEX between two explicit markers.
    // A regex was tried first and failed twice: the non-greedy
    // /var GENERATED_FROM_OUTLINES = \{[\s\S]*?\n\};/ swallowed the merge loop
    // and then the AMBIGUOUS declaration, and the anchored rewrite still failed
    // to re-match its own output. Line indices cannot over-consume, cannot
    // mis-escape, and fail loudly when a marker is missing.
    var BEGIN = '// ==== BEGIN GENERATED OVERRIDES ====';
    var END = '// ==== END GENERATED OVERRIDES ====';
    var lines = src.split(/\r?\n/);
    var bi = lines.indexOf(BEGIN), ei = lines.indexOf(END);
    if (bi < 0 || ei < 0 || ei < bi) {
      console.error('\ncould not find the generated-region markers in ' + OVERRIDES_PATH);
      console.error('  expected "' + BEGIN + '" and "' + END + '" on their own lines');
      process.exit(2);
    }
    var region = ['var GENERATED_FROM_OUTLINES = {']
      .concat(body ? body.split('\n') : [])
      .concat(['};', ''].concat(MERGE_SRC.split('\n')));
    var out = lines.slice(0, bi + 1)
      .concat(region)
      .concat(lines.slice(ei))
      .join('\n');
    fs.writeFileSync(OVERRIDES_PATH, out, 'utf8');
    console.log('\nWROTE ' + OVERRIDES_PATH);
    console.log('  generated type entries: ' + genKeys.length +
                ' (from ' + files.length + ' outline(s); ' + Object.keys(hand).length + ' hand-curated kept)');
  }

  if (WRITE) {
    var lp = path.join(ROOT, 'data/topic-layers.json');
    var all = JSON.parse(fs.readFileSync(lp, 'utf8'));
    var before = Object.keys(all).length;
    all[slug] = layer;
    fs.writeFileSync(lp, JSON.stringify(all, null, 1) + '\n', 'utf8');
    console.log('\nWROTE ' + lp);
    console.log('  topics ' + before + ' -> ' + Object.keys(all).length);
  } else {
    console.log('\ndry run: pass --write to publish');
  }
}

main();

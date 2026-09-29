// Regenerate the machine-derived node-type corrections in
// scripts/lib/graph-type-overrides.js from the node shards, and collapse the
// duplicated END markers left behind by earlier regenerations.
//
// WHY A GENERATED BLOCK AND NOT A SHARD REWRITE
// ---------------------------------------------
// `concept` is the miner's default bucket: 392,872 of 529,755 nodes. That
// makes it a dumping ground, and real bodies get stranded in it -- parties,
// congresses, governments, unions, brigades all render with the wrong colour
// and the wrong label, and a `place`/body lookup misses them. The shards are the
// source of truth, but rewriting 182MB of tracked JSON to fix a label is a
// large diff for a read-time problem, and the file's own header already sets the
// precedent: correct at resolve time, in one auditable place.
//
// SCOPE RULE
// ----------
// Only names whose HEAD NOUN is an institutional word, with exclusions for the
// three ways this misfires: a person holding an office ("Member of the
// Provincial Assembly"), an event ("... speech to a joint session of Congress"),
// and an abstraction ("General line of the party"). Hand-curated entries in the
// file WIN over anything generated here.
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var OVR_PATH = path.join(ROOT, 'scripts/lib/graph-type-overrides.js');
var OVERRIDES = require(OVR_PATH);

var canon = function (s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
};

// Head-noun test: the keyword must be the name's last word, optionally followed
// by a short "of/for/on/and" tail, so "Communist Party of the Soviet Union" and
// "Estonian Biathlon Union" match but "Antisemitism in the Soviet Union" does
// not -- there the keyword is in the middle of a phrase about something else.
var ORG_HEAD = /\b(Party|Union|Association|Society|Foundation|Academy|Institute|Commission|Council|Committee|Assembly|Parliament|Legislature|Government|Ministry|Department|Secretariat|Authority|Board|Court|Corps|Brigade|Regiment|Congress|Organisation|Organization)\b(?:\s+(?:of|for|on|and|the)\b[\w\s]{0,40})?$/i;
var NOT_ORG = /(constituency|school of|schism|ism\b|\bwar\b|treaty|doctrine|theory|\bin the\b|\bcase of\b)/i;
var NOT_PERSON = /\b(Member|Physician|Chairman|President|Secretary|Speaker|Senator|Minister|Governor|Officer|Delegate|Lawyer|Judge|Chief|Director|Head|Chaplain|Envoy|Representative)\s+of\b/i;
var NOT_EVENT = /(speech|address|remarks|debate|resolution|motion|hearing|ceremony|line of|policy of|platform of|programme of|program of|anniversary|centenary|centennial|celebration|birthday|commemoration|constitution of|awards?|petition|plaza|prize|medal|championship|tournament|election|referendum|plenary session)\b/i;
// Wikipedia year-articles: "1923 in fine arts of the Soviet Union",
// "1924 constitution of the Soviet Union". The trailing noun belongs to a topic,
// not to an institution. Only 4-digit years 1000-2099 count, so a real unit
// designator like "055 Brigade" or "10th Politburo" is not caught; the cost of
// that asymmetry is a few real institutions left as `concept`, which is the
// safe direction -- a wrong `org` is what this whole exercise exists to prevent.
var YEAR_ARTICLE = /^(1[0-9]{3}|20[0-9]{2})\s/;
// Wikipedia topic-articles: "politics of the Soviet Union", "geography of the
// African Union", "accession of Serbia to the European Union". The institution
// is the object of the article, not its subject, so the entry stays `concept`.
// Matched on the LEAD word, which is what separates these from a real body
// named "... of the ..." such as "Communist Party of the Soviet Union".
var TOPIC_ARTICLE = /^(accession|geography|politics|history|membership|structure|outline|list|timeline|seats|relations|debate|future|role|impact|economy|reform|reforms|policy|policies|division|divisions)\s/;
// A title, not a body: "A Vindication of Natural Society" is a book.
var TITLE_ARTICLE = /^(a|an|the)\s/;
// "41 Union" / "31st Union" -- a bare designator with no body name, so the
// reading is genuinely open (a numbered union local, a place). Left as
// `concept` rather than asserted.
var BARE_DESIGNATOR = /^\d+(?:st|nd|rd|th)?\s+(union|society)$/;
function reject(n) {
  // Tested against a lowercased copy: the node name is raw-cased ("Politics of
  // the Soviet Union", "41 Union"), and the leading-word patterns below are
  // anchored, so they must not depend on the capitalisation of the first token.
  var s = String(n).toLowerCase();
  return NOT_ORG.test(s) || NOT_PERSON.test(s) || NOT_EVENT.test(s) ||
         YEAR_ARTICLE.test(s) || TOPIC_ARTICLE.test(s) || TITLE_ARTICLE.test(s) ||
         BARE_DESIGNATOR.test(s) || /\bcivil society\b/.test(s);
}

var idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
var src = fs.readFileSync(OVR_PATH, 'utf8');

// Keys this generator emitted on a previous run. They are OURS to regenerate,
// so they must be excluded from the "already handled by a curated entry" test
// (OVERRIDES contains them after the previous write, which would otherwise make
// a second run find nothing to do and write an empty block) -- but they are
// still candidates, because they are derived from the shards every time.
var priorGenerated = Object.create(null);
var prevBlock = src.match(/var GENERATED_ORG_HEADS = \{([\s\S]*?)\n\};/);
if (prevBlock) {
  prevBlock[1].replace(/^\s*"((?:[^"\\]|\\.)*)"/gm, function (_, k) { priorGenerated[k] = 1; });
}

var curated = Object.create(null);
Object.keys(OVERRIDES.OVERRIDES).forEach(function (k) { curated[k] = 1; });

var hits = Object.create(null);
for (var i = 0; i < (idx.nodesParts || 0); i++) {
  var arr = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + i + '.json'), 'utf8'));
  for (var j = 0; j < arr.length; j++) {
    var n = arr[j];
    if (!n || n.type !== 'concept' || !n.name) continue;
    if (reject(n.name) || !ORG_HEAD.test(n.name)) continue;
    var k = canon(n.name);
    if (!k) continue;
    if (curated[k] && !priorGenerated[k]) continue;   // hand-curated wins
    hits[k] = n.name;
  }
}

var keys = Object.keys(hits).sort();
var block = keys.map(function (k) {
  return '  ' + JSON.stringify(k) + ": { type: 'org', conf: 0.9, why: 'institutional head noun; mined as the default concept bucket' }";
}).join(',\n');

// Transformation, in order, on the raw text:
//   1. drop any ORG HEADS block this script wrote before (so re-running
//      replaces it instead of appending a second one);
//   2. collapse the run of duplicate END GENERATED OVERRIDES markers that
//      earlier regenerations left behind, back to one;
//   3. insert the new block after that single marker, so the file reads
//      hand-curated -> outlines -> org heads.
src = src.replace(/^\/\/ ==== BEGIN GENERATED ORG HEADS ====[\s\S]*?\/\/ ==== END GENERATED ORG HEADS ====\r?\n?/gm, '');
src = src.replace(/(\/\/ ==== END GENERATED OVERRIDES ====\r?\n)+/g,
  '// ==== END GENERATED OVERRIDES ====\n');
var marker = '// ==== END GENERATED OVERRIDES ====\n';
if (src.indexOf(marker) === -1) throw new Error('graph-type-overrides: END marker not found; refusing to guess where to insert');
src = src.replace(marker, marker + '\n' +
  '// ==== BEGIN GENERATED ORG HEADS ====\nvar GENERATED_ORG_HEADS = {\n' + block + '\n};\n' +
  'Object.keys(GENERATED_ORG_HEADS).forEach(function (k) {\n' +
  '  if (!(k in OVERRIDES)) OVERRIDES[k] = GENERATED_ORG_HEADS[k];\n' +
  '});\n' +
  '// ==== END GENERATED ORG HEADS ====\n');

fs.writeFileSync(OVR_PATH, src);

console.log('org-head corrections written: ' + keys.length);
console.log('replaced prior block: ' + (prevBlock ? 'yes' : 'none'));
keys.slice(0, 6).forEach(function (k) { console.log('   ' + hits[k]); });

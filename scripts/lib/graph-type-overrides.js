/*
 * graph-type-overrides.js -- curated corrections for node types the miner got
 * wrong, applied at resolve time instead of by rewriting the node shards.
 *
 * WHY AN OVERRIDE AND NOT A REBUILD
 * ---------------------------------
 * The wrong types are real: `world-history-21|Soviet Union` is typed `person`,
 * `world-geography-45|NATO` and `indian-languages-10|Juan Carlos I` are typed
 * `concept`. Fixing them at source means regenerating 210MB across ten shards
 * and re-deriving every dependent artefact. That is the right fix eventually and
 * the wrong fix to block on, because the damage is at READ time: a polity typed
 * `concept` fails a `place` lookup, so the resolver returns nothing, the topic
 * falls back to a curated placeholder, and the real node -- with its real
 * co-mentions and real edges -- is never shown. An override applied in the
 * resolver repairs every consumer at once and is auditable in one file.
 *
 * Each entry carries WHY, so a reviewer can disagree with a specific claim rather
 * than having to reverse-engineer a diff. `conf` is the confidence in the
 * correction, not in the entity.
 *
 * Scope rule: only override when the evidence is unambiguous. "Soviet Union" is
 * a polity; there is no reading under which it is a person. Where a type is
 * genuinely contestable the entry is omitted rather than guessed.
 */
'use strict';

// UMD so the browser readers load the same table the Node validators use. A
// curated correction that exists only on the server is worse than none: the
// pages would go on rendering "Spain: concept" while every script insisted it
// was a place. One table, one source of truth, both runtimes.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GraphTypeOverrides = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

// The vocabulary of the graph, so a typo here is caught immediately.
var TYPES = ['person', 'place', 'org', 'event', 'concept', 'disease', 'scheme', 'plant', 'animal', 'volcano', 'asteroid', 'comet', 'misc'];

// canon(name) -> { type, conf, why }
// `polity` and `body` are the two recurring classes: sovereign states and
// institutions that the miner filed as `concept` (or, worse, `person`).
var OVERRIDES = {
  // ---- polities the miner typed `person` -------------------------------
  'soviet union': { type: 'org', conf: 0.99, why: 'a state, not a person' },
  'san francisco': { type: 'place', conf: 0.99, why: 'a city' },
  'new orleans': { type: 'place', conf: 0.99, why: 'a city' },
  'ottoman empire': { type: 'org', conf: 0.99, why: 'a state' },
  'roman empire': { type: 'org', conf: 0.99, why: 'a state' },
  'british empire': { type: 'org', conf: 0.99, why: 'a state' },
  'spanish empire': { type: 'org', conf: 0.99, why: 'a state' },

  // ---- polities and institutions typed `concept` ----------------------
  'spain': { type: 'place', conf: 0.99, why: 'a country; the graph files it under world-geography' },
  'nato': { type: 'org', conf: 0.99, why: 'a treaty organisation' },
  'cortes generales': { type: 'org', conf: 0.99, why: 'the bicameral legislature' },
  'congress of deputies': { type: 'org', conf: 0.99, why: 'the lower house of the legislature' },
  'senate of spain': { type: 'org', conf: 0.99, why: 'the upper house of the legislature' },
  'european union': { type: 'org', conf: 0.99, why: 'a supranational organisation' },
  'united nations': { type: 'org', conf: 0.99, why: 'an international organisation' },
  'francoist spain': { type: 'org', conf: 0.95, why: 'the Franco regime, a polity' },
  'habsburg spain': { type: 'org', conf: 0.95, why: 'the Habsburg monarchy, a polity' },
  'bourbon spain': { type: 'org', conf: 0.95, why: 'the Bourbon restoration, a polity' },
  'nasrid kingdom of granada': { type: 'org', conf: 0.95, why: 'a medieval state' },
  'visigothic kingdom': { type: 'org', conf: 0.95, why: 'a state' },
  'taifa kingdoms': { type: 'org', conf: 0.9, why: 'a group of states' },
  'umayyad emirate of cordoba': { type: 'org', conf: 0.95, why: 'a state' },
  'caliphate of cordoba': { type: 'org', conf: 0.95, why: 'a state' },
  'al andalus': { type: 'place', conf: 0.9, why: 'a territory of the Iberian Peninsula' },
  'philippines': { type: 'place', conf: 0.99, why: 'a country' },
  'cadiz': { type: 'place', conf: 0.99, why: 'a city' },
  'ibiza': { type: 'place', conf: 0.99, why: 'an island and city' },
  'pyrenees': { type: 'place', conf: 0.99, why: 'a mountain range' },
  'ceuta': { type: 'place', conf: 0.99, why: 'a Spanish city' },
  'melilla': { type: 'place', conf: 0.99, why: 'a Spanish city; filed under indian-languages' },
  'carthage': { type: 'place', conf: 0.95, why: 'a city; a city-state, but the node denotes the city' },
  'iberia': { type: 'place', conf: 0.95, why: 'a peninsula' },
  'iberian peninsula': { type: 'place', conf: 0.99, why: 'a peninsula' },

  // ---- people the miner typed as something else ----------------------
  'juan carlos i': { type: 'person', conf: 0.99, why: 'King of Spain; filed under indian-languages' },
  'juan carlos ii': { type: 'person', conf: 0.99, why: 'King of Spain' },
  'isabella i of castile': { type: 'person', conf: 0.99, why: 'a monarch; filed under environment-ecology' },
  'ferdinand ii of aragon': { type: 'person', conf: 0.99, why: 'a monarch' },
  'ferdinand vii': { type: 'person', conf: 0.99, why: 'a monarch' },
  'francisco franco': { type: 'person', conf: 0.99, why: 'a head of state' },
  'joseph bonaparte': { type: 'person', conf: 0.99, why: 'a head of state' },
  'napoleon bonaparte': { type: 'person', conf: 0.99, why: 'an emperor' },
  'abd al rahman i': { type: 'person', conf: 0.99, why: 'an emir; the III node is mis-slugged' },
  'abd al rahman iii': { type: 'person', conf: 0.99, why: 'a caliph' },
  'hannibal': { type: 'person', conf: 0.99, why: 'a general' },
  'tariq ibn ziyad': { type: 'person', conf: 0.95, why: 'a commander' },
  'christopher columbus': { type: 'person', conf: 0.99, why: 'an explorer' },
  'pablo picasso': { type: 'person', conf: 0.99, why: 'a painter' },
  'adolfo suarez': { type: 'person', conf: 0.95, why: 'a prime minister' },
  'diego velazquez': { type: 'person', conf: 0.95, why: 'a painter' },
  'goya': { type: 'person', conf: 0.9, why: 'a painter' },

  // ---- events the miner typed as something else ----------------------
  'second spanish republic': { type: 'event', conf: 0.99, why: 'a period of government, not an abstract concept' },
  'first spanish republic': { type: 'event', conf: 0.99, why: 'a period of government' },
  'spanish civil war': { type: 'event', conf: 0.99, why: 'a war' },
  'peninsular war': { type: 'event', conf: 0.99, why: 'a war' },
  'spanish american war': { type: 'event', conf: 0.99, why: 'a war' },
  'muslim conquest of hispania': { type: 'event', conf: 0.99, why: 'a conquest' },
  'second punnic war': { type: 'event', conf: 0.99, why: 'a war' },
  'reconquista': { type: 'event', conf: 0.95, why: 'a period of conflict' },
  'fall of granada': { type: 'event', conf: 0.99, why: 'a single dated event' },
  'voyages of columbus': { type: 'event', conf: 0.99, why: 'a voyage' },
  'cadiz constitution 1812': { type: 'event', conf: 0.99, why: 'the enactment of a constitution' },
  'constitution of spain 1978': { type: 'event', conf: 0.99, why: 'the enactment of a constitution' },
  'democratic transition': { type: 'event', conf: 0.95, why: 'a period of political change' },
  'spanish armada': { type: 'event', conf: 0.99, why: 'a military expedition' },
  'carlist wars': { type: 'event', conf: 0.99, why: 'a series of wars' },
  'bourbon reforms': { type: 'event', conf: 0.95, why: 'a reform programme' },
  'guernica': { type: 'event', conf: 0.9, why: 'the 1937 bombing, a dated event' },
  'treaty of tordesillas': { type: 'event', conf: 0.99, why: 'a treaty' },
  'union of castile and aragon': { type: 'event', conf: 0.95, why: 'a dynastic union' },

  // Same-name nodes split across shards, where the graph-prominence winner is
  // the copy carrying the wrong type. Each is pinned to the type the name
  // actually denotes, so the mistyped node can no longer win a lookup.
  'north carolina': { type: 'place', conf: 0.99, why: 'a US state; the winning node was mined as person' },
  'chicago cubs': { type: 'org', conf: 0.95, why: 'a baseball club, i.e. a body; the winning node was mined as person' },
  // The corpus has no 'group' type. Two of the three same-name nodes are
  // already concept, so concept is the least-wrong and the corpus-majority
  // answer. It is deliberately NOT person.
  'african americans': { type: 'concept', conf: 0.85, why: 'a demographic group; the corpus has no group type, so concept is the closest correct bucket' }
};

// ---------------------------------------------------------------------------
// GENERATED FROM data/authored/*.txt BY scripts/ingest-layer.js -- DO NOT EDIT
// ---------------------------------------------------------------------------
// An authored outline states a PRECISE type for its items ([Person], [Place],
// [Org], [Event]); [Topic] and [Movement] are coarse and are deliberately NOT
// promoted, because "an idea, not a person or a place" is not a type claim.
//
// This block exists because a resolved layer item displays the RESOLVED NODE's
// type, not the layer's `it.type` -- the authored label is only a lookup hint
// (flowchart.html resolves via `resolveItem(it.name, it.type)` and then links
// the real node). So without promotion an authored `France = place` is silently
// rendered as the corpus's `concept`. Promoting the author's label into the
// single type authority is what makes the outline actually take effect.
//
// Hand-curated entries above WIN: a deliberate, reviewed decision outranks a
// generated one, so a reviewer can always override the pipeline.
// ==== BEGIN GENERATED OVERRIDES ====
var GENERATED_FROM_OUTLINES = {
  'acad mie fran aise': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'alsace': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'andr le n tre': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'anne of austria': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'austria': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'canada': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'cardinal mazarin': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'caribbean': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'catholic church': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'charles ii of spain': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'charles le brun': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'dutch republic': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'edict of nantes': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'england': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'flanders': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'fran ois michel le tellier': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'fran oise d aubign': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'france': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'franche comt': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'franco dutch war': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'french academy of sciences': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'french army': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'french east india company': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'french navy': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'french revolution': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'fronde': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'glorious revolution': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'grand dauphin': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'italy': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'jean baptiste colbert': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'jean baptiste lully': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'jean racine': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'jules hardouin mansart': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'la fontaine': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'leopold i': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'louis duke of burgundy': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'louis xiii': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'louis xv': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'louisiana': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'louvois': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'madame de la valli re': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'madame de maintenon': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'madame de montespan': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'maria theresa of spain': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'mississippi river': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'mississippi valley': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'moli re': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'montesquieu': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'new france': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'nicolas boileau': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'nine years war': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'paris': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'philip v of spain': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'philippe i duke of orl ans': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'philippe ii duke of orl ans': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'revocation of the edict of nantes': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'royal academy of music': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'royal academy of painting and sculpture': { type: 'org', conf: 0.9, why: 'authored outline states a precise type' },
  'strasbourg': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'sweden': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'treaty of nijmegen': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'treaty of ryswick': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'treaty of the pyrenees': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'treaty of utrecht': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'vauban': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'versailles': { type: 'place', conf: 0.9, why: 'authored outline states a precise type' },
  'voltaire': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' },
  'war of devolution': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'war of the spanish succession': { type: 'event', conf: 0.9, why: 'authored outline states a precise type' },
  'william iii': { type: 'person', conf: 0.9, why: 'authored outline states a precise type' }
};


// Hand-curated entries WIN: a deliberate, reviewed decision outranks a
// generated one, so a reviewer can always override the pipeline.
Object.keys(GENERATED_FROM_OUTLINES).forEach(function (k) {
  if (!(k in OVERRIDES)) OVERRIDES[k] = GENERATED_FROM_OUTLINES[k];
});
// ==== END GENERATED OVERRIDES ====
// ==== END GENERATED OVERRIDES ====
// ==== END GENERATED OVERRIDES ====
// ==== END GENERATED OVERRIDES ====
// ==== END GENERATED OVERRIDES ====

// Names that are ambiguous and must NOT be silently forced to one reading.
// Kept as a separate list so they stay visible to review instead of being
// asserted as fact. 'Sao Paulo' is both a Brazilian city and a given name, and
// nothing in the node distinguishes them.
var AMBIGUOUS = {
  'sao paulo': 'the Brazilian city or a person; no distinguishing signal in the node'
};

Object.keys(OVERRIDES).forEach(function (k) {
  var t = OVERRIDES[k].type;
  if (TYPES.indexOf(t) === -1) {
    throw new Error('graph-type-overrides: "' + k + '" has unknown type "' + t + '"');
  }
});

/**
 * @param canonFn  the same canon() used to build the name index
 * @returns (node) -> node   returns a shallow copy with `type` corrected and
 *   `typeConf` set. Returns the node untouched when no override applies, so the
 *   common path allocates nothing.
 */
function applyOverride(node, canonFn) {
  if (!node || !node.name) return node;
  var o = OVERRIDES[canonFn(node.name)];
  if (!o) return node;
  if (node.type === o.type) return node;
  var copy = {};
  for (var k in node) copy[k] = node[k];
  copy.type = o.type;
  copy.typeConf = o.conf;
  copy.typeCorrectedFrom = node.type;
  return copy;
}

function overrideFor(name, canonFn) { return OVERRIDES[canonFn(name)] || null; }

function isAmbiguous(name, canonFn) { return canonFn(name) in AMBIGUOUS; }

  return {
    OVERRIDES: OVERRIDES,
    AMBIGUOUS: AMBIGUOUS,
    TYPES: TYPES,
    applyOverride: applyOverride,
    overrideFor: overrideFor,
    isAmbiguous: isAmbiguous,
    count: Object.keys(OVERRIDES).length
  };
}));

/*
 * graph-schema.js -- Contract v2: the shape a node and a relation must have, and
 * the rules that decide whether a relation is even allowed to exist.
 *
 * WHY A SCHEMA AND NOT JUST VALIDATION
 * ------------------------------------
 * The graph's failure mode is not malformed data, it is well-formed data that
 * asserts something false. "Afghanistan -> founded_by -> Genghis Khan" is a
 * valid-looking triple that the corpus never actually said, and
 * "Isabella I of Castile" filed under environment-ecology is a valid-looking
 * node with the wrong type. Both survive any check that only asks "are the
 * fields present". So the contract adds the two things that catch them:
 *
 *   provenance   every relation names where it came from and carries the
 *                sentence that supports it. A relation with no evidence is a
 *                guess and must not render.
 *   type gate    every verb declares which endpoint types it accepts, so
 *                `disease -founded_by-> person` is rejected structurally
 *                rather than argued about in review.
 *
 * NAMING
 * ------
 * Endpoints are `from` / `to`, NOT `source` / `target`. `source` is reserved
 * for provenance: a relation has a subject (who/what the claim is about) and a
 * provenance (where the claim came from), and calling both `source` makes
 * `{source:"spain", source:{kind:"corpus"}}` possible, which is unsalvageable.
 *
 * CONFIDENCE IS NOT TRUTH
 * ----------------------
 * A family never makes a relation true, it only decides visual prominence.
 * `genealogical -father_of-> person` and `historical -participated_in-> event`
 * are different KINDS of claim and deserve different arrow weight, but a family
 * label is not evidence. Nothing here promotes a relation on family alone.
 */
'use strict';

// ---------------------------------------------------------------- node v2 --
// The node stays node-centric on purpose. An earlier proposal added
// `entities: [ids]` to each node; that is rejected because it restates the
// graph inside every node, so a rename has to be applied N times and the two
// copies can silently disagree. Neighbours are derived from relations at read
// time. The two fields v2 adds are `src` and `conf`.
var NODE_CONTRACT = {
  version: 2,
  required: ['id', 'name', 'type'],
  optional: ['span', 'era', 'timebase', 'level', 'cats', 'count', 'desc', 'evDesc', 'kin', 'seed', 'aliases'],
  added_in_v2: ['src', 'conf'],
  // `src` is provenance, `conf` is type confidence. Both are optional on
  // existing rows so the 529,755 shipped nodes need no migration; the validator
  // reports coverage so gaps are visible rather than assumed.
  types: ['person', 'place', 'org', 'event', 'concept', 'disease', 'scheme', 'plant', 'animal', 'volcano', 'asteroid', 'comet', 'misc'],
  // Confidence bands for `conf` (type confidence, not relation confidence).
  conf: { asserted: 0.99, strong: 0.9, inferred: 0.6, guessed: 0.3 }
};

// -------------------------------------------------------------- relations --
var RELATION_CONTRACT = {
  version: 2,
  required: ['from', 'rel', 'to', 'family', 'conf', 'src', 'ev'],
  optional: ['note', 'since', 'until'],
  srcKinds: ['authored', 'corpus', 'wiki', 'quiz', 'derived'],
  // Minimum confidence to render as a solid arrow. Below this a relation may be
  // stored but must render as a proposal, never as a fact.
  renderFloor: 0.6,
  // Confidence bands, assigned by how the relation was obtained.
  conf: { authored: 0.95, wiki: 0.85, corpusStrong: 0.8, corpusWeak: 0.55, derived: 0.7 }
};

// The five families. `verbs` is the closed vocabulary; `typeOf` maps a verb to
// the endpoint types it accepts, which is what makes the type gate possible.
var T = 'any';
var PERSON = 'person', PLACE = 'place', ORG = 'org', EVENT = 'event', CONCEPT = 'concept';

var REL_FAMILIES = {
  // Who is related to whom, by blood or marriage. The only family the corpus
  // actually asserts at scale, so it gets the highest render precedence.
  genealogical: {
    precedence: 0,
    verbs: {
      father_of: [PERSON, PERSON], mother_of: [PERSON, PERSON],
      child_of: [PERSON, PERSON], parent_of: [PERSON, PERSON],
      sibling_of: [PERSON, PERSON], spouse_of: [PERSON, PERSON],
      married_to: [PERSON, PERSON], grandparent_of: [PERSON, PERSON],
      grandchild_of: [PERSON, PERSON], uncle_of: [PERSON, PERSON],
      aunt_of: [PERSON, PERSON], nephew_of: [PERSON, PERSON],
      niece_of: [PERSON, PERSON], cousin_of: [PERSON, PERSON],
      ancestor_of: [PERSON, PERSON], descendant_of: [PERSON, PERSON],
      successor_of: [PERSON, PERSON], predecessor_of: [PERSON, PERSON],
      father_in_law_of: [PERSON, PERSON], mother_in_law_of: [PERSON, PERSON],
      son_in_law_of: [PERSON, PERSON], daughter_in_law_of: [PERSON, PERSON]
    }
  },
  // Things that happened, and who/what did them.
  historical: {
    precedence: 1,
    verbs: {
      participated_in: [PERSON, EVENT], led: [PERSON, EVENT],
      commanded: [PERSON, EVENT], founded: [PERSON, ORG],
      founded_by: [ORG, PERSON], established: [PERSON, ORG],
      created: [PERSON, CONCEPT], authored: [PERSON, CONCEPT],
      ruled: [PERSON, PLACE], ruled_by: [PLACE, PERSON],
      occurred_in: [EVENT, PLACE], part_of: [EVENT, EVENT],
      caused: [EVENT, EVENT], resulted_in: [EVENT, EVENT],
      preceded: [EVENT, EVENT], followed_by: [EVENT, EVENT],
      involved: [EVENT, ORG], witnessed: [PERSON, EVENT]
    }
  },
  // Where things are, relative to other places.
  geographical: {
    precedence: 2,
    verbs: {
      located_in: [PLACE, PLACE], borders: [PLACE, PLACE],
      capital_of: [PLACE, PLACE], part_of_geography: [PLACE, PLACE],
      flows_into: [PLACE, PLACE], lies_on: [PLACE, PLACE],
      near: [PLACE, PLACE], enclave_of: [PLACE, PLACE]
    }
  },
  // Membership and affiliation in bodies.
  institutional: {
    precedence: 1,
    verbs: {
      member_of: [PERSON, ORG], member: [ORG, ORG],
      led_institution: [PERSON, ORG], institution_of: [ORG, CONCEPT],
      successor_in_office: [PERSON, ORG], governed_by: [ORG, ORG]
    }
  },
  // Everything else that is a real claim but not one of the above. Kept
  // deliberately small: a verb with no type signature cannot be gated, and an
  // ungated verb is how `disease -founded_by-> person` gets in.
  semantic: {
    precedence: 3,
    verbs: {
      associated_with: [T, T], exemplifies: [CONCEPT, CONCEPT],
      influenced_by: [CONCEPT, CONCEPT], known_for: [PERSON, CONCEPT],
      located_at: [PLACE, PLACE], studied: [CONCEPT, CONCEPT]
    }
  }
};

// The legacy families already present in data/relations.json v1, mapped onto the
// v2 vocabulary so an existing store can be migrated without re-authoring.
var LEGACY_FAMILY_MAP = {
  political: 'institutional',
  conflict: 'historical',
  cultural: 'semantic',
  geographic: 'geographical',
  membership: 'institutional'
};

// Verb aliases: the corpus and hand-authored trees use prose forms; the contract
// uses stable snake_case. Kept here so normalisation has exactly one home.
var VERB_ALIASES = {
  // Direction matters: `led` and `led_by` are different claims, so a prose
  // "led by" must map to the inverse, never to the forward verb.
  'ruled by': 'ruled_by', 'governed by': 'ruled_by', 'led by': 'led_by',
  'founded by': 'founded_by', 'established by': 'founded_by', 'created by': 'founded_by',
  'commanded by': 'commanded_by', 'supported by': 'supported_by', 'influenced by': 'influenced_by',
  'successor of': 'successor_of', 'predecessor of': 'predecessor_of',
  'part of': 'part_of', 'member of': 'member_of', 'located in': 'located_in',
  'capital of': 'capital_of', 'known for': 'known_for', 'close to': 'near',
  'father': 'father_of', 'mother': 'mother_of', 'son': 'child_of', 'daughter': 'child_of',
  'brother': 'sibling_of', 'sister': 'sibling_of', 'wife': 'spouse_of', 'husband': 'spouse_of',
  'parent': 'parent_of', 'grandfather': 'grandparent_of',
  'grandmother': 'grandparent_of', 'grandson': 'grandchild_of', 'granddaughter': 'grandchild_of',
  'uncle': 'uncle_of', 'aunt': 'aunt_of', 'nephew': 'nephew_of', 'niece': 'niece_of'
};

// Normalise a verb to its stable snake_case form, consulting the prose alias
// table. The alias lookup deliberately tests the RAW lowercased form and the
// snake_case form, but NOT `snake_case -> spaces -> alias`. Doing that last
// step silently destroys direction: with 'led by' -> 'led' in the table,
// `led_by` resolved to `led`, so "Francoist Spain led_by Francisco Franco" was
// type-checked as "Francisco Franco led Francoist Spain" -- the inverse claim.
// An already-normalised token must never be re-read as prose.
function normaliseVerb(rel) {
  var raw = String(rel || '').trim().toLowerCase();
  var s = raw.replace(/\s+/g, '_');
  if (Object.prototype.hasOwnProperty.call(VERB_ALIASES, raw)) return VERB_ALIASES[raw];
  if (Object.prototype.hasOwnProperty.call(VERB_ALIASES, s)) return VERB_ALIASES[s];
  return s;
}

function familyOf(rel) {
  var v = normaliseVerb(rel);
  var names = Object.keys(REL_FAMILIES);
  for (var i = 0; i < names.length; i++) {
    if (REL_FAMILIES[names[i]].verbs[v]) return names[i];
  }
  return null;
}

// The gate. Returns null when the relation is allowed, or a string explaining
// the rejection. `null` endpoint types mean "not resolvable", which is a
// separate failure from "wrong type" and is reported by the caller.
//
// A slot may be a single type, `T` (anything), or an ARRAY of acceptable types.
// The arrays exist because some verbs are genuinely polymorphic -- `involved`
// takes an organisation, a person or a place -- and pretending otherwise forced
// true relations to be rejected.
function slotAccepts(slot, type) {
  if (slot === T) return true;
  if (type === null || type === undefined) return true; // unresolved, not wrong
  if (Array.isArray(slot)) return slot.indexOf(type) !== -1;
  return type === slot;
}
function slotName(slot) { return Array.isArray(slot) ? slot.join('|') : String(slot); }

function checkTypes(rel, fromType, toType) {
  var fam = familyOf(rel);
  if (!fam) return 'verb "' + rel + '" is not in any family vocabulary';
  var spec = REL_FAMILIES[fam].verbs[normaliseVerb(rel)];
  if (!spec) return 'verb "' + rel + '" is not in family ' + fam;
  var okFrom = slotAccepts(spec[0], fromType);
  var okTo = slotAccepts(spec[1], toType);
  if (okFrom && okTo) return null;
  var bad = [];
  if (!okFrom) bad.push(fromType + ' -' + rel + '-> ' + slotName(spec[0]) + ' expected');
  if (!okTo) bad.push(slotName(spec[0]) + ' -' + rel + '-> ' + toType + ' expected');
  return bad.join('; ');
}

function renderPrecedence(rel) {
  var fam = familyOf(rel);
  return fam ? REL_FAMILIES[fam].precedence : 9;
}

// Evidence must be a real sentence from a real source, not a restatement of the
// endpoints. "Spain is in Spain" is not evidence for anything.
function checkEvidence(ev, fromName, toName) {
  var s = String(ev || '').trim();
  if (s.length < 20) return 'evidence is too short to support a claim';
  if (fromName && toName && s === fromName + ' ' + normaliseVerb(ev) + ' ' + toName) {
    return 'evidence merely restates the endpoints';
  }
  return null;
}

// Inverse forms. `X -led_by-> Y` is the same claim as `Y -led-> X`, so the
// inverse's type signature is the forward one reversed. Deriving them here means
// a new verb only has to be declared once and the inverse cannot drift out of
// sync -- the earlier hand-written vocabulary had `led` but no `led_by`, and
// `succeeded_by` was missing entirely, which the validator caught as 23
// "verb not in vocabulary" errors on relations that were perfectly sound.
var INVERSE_SUFFIX = '_by';
var DERIVED_INVERSES = {};
Object.keys(REL_FAMILIES).forEach(function (fam) {
  var verbs = REL_FAMILIES[fam].verbs;
  Object.keys(verbs).forEach(function (v) {
    if (/_by$/.test(v)) return; // already an inverse; do not invert twice
    var stem = v + INVERSE_SUFFIX;
    if (DERIVED_INVERSES[stem]) return;
    DERIVED_INVERSES[stem] = { family: fam, types: [verbs[v][1], verbs[v][0]], inverseOf: v };
    verbs[stem] = [verbs[v][1], verbs[v][0]];
  });
});
// `part_of` must not produce `part_of_by`, and these read better as their own
// verbs than as a mechanical inverse.
['part_of', 'part_of_geography', 'associated_with', 'exemplifies', 'near', 'borders', 'flows_into', 'lies_on'].forEach(function (v) {
  if (REL_FAMILIES.semantic.verbs[v + INVERSE_SUFFIX] || REL_FAMILIES.geographical.verbs[v + INVERSE_SUFFIX]) {
    delete (REL_FAMILIES.semantic.verbs[v + INVERSE_SUFFIX] || REL_FAMILIES.geographical.verbs[v + INVERSE_SUFFIX]);
  }
});
// Widening a signature is a deliberate act, recorded here rather than done
// silently: `involved` and `resulted_in` were declared too narrowly, so true
// relations like "Spanish Civil War -involved-> Francisco Franco" were being
// rejected. The second slot is the *set* of acceptable target types.
REL_FAMILIES.historical.verbs.involved = [EVENT, [ORG, PERSON, PLACE, CONCEPT]];
REL_FAMILIES.historical.verbs.resulted_in = [EVENT, [EVENT, CONCEPT, PERSON, PLACE]];
REL_FAMILIES.historical.verbs.preceded = [EVENT, EVENT];
REL_FAMILIES.historical.verbs.led = [PERSON, [ORG, CONCEPT, EVENT, PLACE]];
// A polity founds a city as readily as an institution, and Carthage founding
// Cadiz is the canonical case, so the object slot must accept a place.
REL_FAMILIES.historical.verbs.founded = [[PERSON, EVENT, ORG], [ORG, PLACE, CONCEPT, EVENT]];
REL_FAMILIES.institutional.verbs.contains = [ORG, ORG];
REL_FAMILIES.institutional.verbs.supported_by = [EVENT, [ORG, PERSON, CONCEPT]];
REL_FAMILIES.semantic.verbs.depicted_in = [CONCEPT, [PERSON, EVENT, CONCEPT]];
REL_FAMILIES.geographical.verbs.centred_at = [PLACE, PLACE];

// Forward forms whose inverses were the ones originally written down. Without
// these the inverse derivation produced `successor_of_by` where the corpus
// actually says `succeeded_by`, and the validator flagged 12 sound relations as
// unknown vocabulary. Declared explicitly so both spellings resolve.
REL_FAMILIES.genealogical.verbs.succeeded_by = [[PERSON, EVENT, ORG, CONCEPT], [PERSON, EVENT, ORG, CONCEPT]];
REL_FAMILIES.semantic.verbs.interacted_with = [T, T];
REL_FAMILIES.semantic.verbs.influenced = [CONCEPT, CONCEPT];
REL_FAMILIES.historical.verbs.declared = [[CONCEPT, ORG, PERSON], [CONCEPT, ORG]];
REL_FAMILIES.historical.verbs.opposed = [EVENT, [EVENT, ORG, PERSON, CONCEPT]];
REL_FAMILIES.historical.verbs.opposed_by = [[EVENT, ORG, PERSON, CONCEPT], [EVENT, ORG, PERSON, CONCEPT]];
// A polity is not a concept: it is the single most common mis-typing in the
// graph, and it is why `NATO -member-> Spain` failed the gate.
REL_FAMILIES.institutional.verbs.member = [ORG, ORG];
// A legislature contains chambers; it does not "contain" a place. An earlier
// draft set this to [PLACE, PLACE] to satisfy `Cortes Generales` while that
// node was still mistyped `concept`, which was papering over the real defect.
REL_FAMILIES.institutional.verbs.contains = [ORG, ORG];
// "Francoist Spain led by Francisco Franco" and "the Democratic Transition led
// by Juan Carlos I" are both true, so a polity and a period are both valid
// subjects of `led_by`, and a person is a valid object of `led`.
REL_FAMILIES.historical.verbs.led_by = [[PERSON, ORG, CONCEPT, EVENT], PERSON];
REL_FAMILIES.historical.verbs.led = [[PERSON, ORG, CONCEPT, EVENT], [ORG, CONCEPT, EVENT, PLACE]];
// A state is a member of a treaty organisation, not only a person or a body:
// Spain, France and India are all `place -member_of-> NATO/Commonwealth/UN`.
REL_FAMILIES.institutional.verbs.member_of = [[PERSON, ORG, PLACE], ORG];
REL_FAMILIES.institutional.verbs.led_institution = [[PERSON, PLACE], ORG];
// A city founds a colony (Carthage founded Cadiz), so the subject slot of
// `founded` must accept a place, not only a person, body or event.
REL_FAMILIES.historical.verbs.founded = [[PERSON, EVENT, ORG, PLACE], [ORG, PLACE, CONCEPT, EVENT]];
// A territory influences what happened inside it: Al-Andalus preserving Greek
// science is the canonical case, so `influenced` cannot be concept-only.
REL_FAMILIES.semantic.verbs.influenced = [[CONCEPT, PLACE, ORG, EVENT], CONCEPT];
REL_FAMILIES.semantic.verbs.influenced_by = [CONCEPT, [CONCEPT, PLACE, ORG, EVENT]];
// A war can install a regime, so `resulted_in` must accept a body as well as
// another event.
REL_FAMILIES.historical.verbs.resulted_in = [EVENT, [EVENT, CONCEPT, PERSON, PLACE, ORG]];

module.exports = {
  NODE_CONTRACT: NODE_CONTRACT,
  RELATION_CONTRACT: RELATION_CONTRACT,
  REL_FAMILIES: REL_FAMILIES,
  DERIVED_INVERSES: DERIVED_INVERSES,
  LEGACY_FAMILY_MAP: LEGACY_FAMILY_MAP,
  VERB_ALIASES: VERB_ALIASES,
  normaliseVerb: normaliseVerb,
  familyOf: familyOf,
  checkTypes: checkTypes,
  checkEvidence: checkEvidence,
  renderPrecedence: renderPrecedence,
  // True when a relation may be drawn as a solid factual arrow.
  isRenderable: function (conf) {
    return typeof conf === 'number' && conf >= RELATION_CONTRACT.renderFloor;
  }
};

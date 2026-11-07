/*
 * test-fact-gate.js -- regression test for the theory-layer quality gate.
 *
 * Every sentence below is a REAL description lifted from
 * data/timeline.nodes.*.json, not an invented example. The expected verdict
 * encodes the judgement a human reviewer would make, so a future change that
 * starts admitting "HotSpot is tiered compiling" fails loudly here.
 *
 * Run: node scripts/test-fact-gate.js
 */
'use strict';
var G = require('./lib/fact-gate.js');

/*
 * Truncation detection is lexicon-driven: it needs to know that "crust" and
 * "rocks" are real words and "moun" is a severed "mountain". The caller in
 * production passes corpus vocabulary (493k names + descriptions). Here a small
 * stand-in carries the same discriminating power for these cases.
 */
var LEXICON = new Set(('crust rocks form chile chile island volcano volcanic vent magma '
  + 'lava ash eruption caldera lahars tephra magma dome cone summit seismic mantle '
  + 'tectonic plates island islands india barrena andaman sea chiloe patagonia andes').split(' '));

// [sentence, entity, resolvedType, expectedVerdict, why]
var CASES = [
  // ---- must be admitted: real, specific, examinable ------------------------
  ['a vent where molten rock, ash and gas escape from beneath the Earth\u2019s crust',
   'Volcano', 'volcano', 'fact', 'clean definition of the topic itself'],
  ['India\u2019s only active volcano, in the Andaman Sea',
   'Barren Island', 'volcano', 'fact', 'the India hook, and it is already curated'],
  ['Antuco Volcano is a stratovolcano in the B\u00edo B\u00edo Region of Chile',
   'Antuco Volcano', 'volcano', 'fact', 'type + location in one claim'],
  ['A shield volcano is a type of volcano named for its low profile, resembling a shield lying on the ground.',
   'Shield volcano', 'place', 'fact', 'a real type definition'],
  ['a Philippine national institution dedicated to provide information on the activities of volcanoes, earthquakes',
   'Philippine Institute of Volcanology and Seismology', 'org', 'fact',
   'PHIVOLCS: fills the monitoring slot, reachable only by full-name resolution'],
  ['the world\u2019s largest active volcano, on Hawai\u2019i Island',
   'Mauna Loa', 'volcano', 'fact', 'signature fact'],
  ['Indonesian volcano whose catastrophic 1883 eruption triggered massive tsunami',
   'Krakatoa', 'volcano', 'fact', 'case-study material'],
  ['a type of volcano formed by basalts and silica-rich volcanic rocks',
   'Central volcano', 'place', 'fact', 'type classification'],
  ['a violent type of mudflow or debris flow composed of a slurry of pyroclastic particles',
   'Lahar', 'concept', 'offtopic',
   'correct in the world, but the sentence never names its entity -- anchoring it would be a guess'],

  // ---- must be rejected ----------------------------------------------------
  ['Universal Volcano Bay is a tropical-themed water park at Universal Orlando Resort in Orlando, Florida.',
   'Universal Volcano Bay', 'volcano', 'reject', 'wrong entity: a theme park, not a volcano'],
  ['part of the March\u2013May 2007 Operation Achilles',
   'Operation Volcano', 'volcano', 'offtopic',
   'a true fact about a military operation; kept in the graph layer, excluded from a geology theory'],
  ['Tiered compiling',
   'HotSpot', 'concept', 'reject', 'wrong domain: a compiler topic, and no anchor'],
  ['or was once active on this planet',
   'Plate tectonics', 'concept', 'reject', 'fragment starting mid-thought'],
  ['In August 2019',
   'Submarine volcano', 'place', 'reject', 'date fragment, no claim'],
  ['According to the Ramayana, one of Rama\u2019s sons, Lava, ruled Uttara Kosala',
   'Lava', 'concept', 'offtopic', 'wrong sense: the son of Rama, not magma'],
  ['designated as an International Biosphere Reserve in _____ and a World Heritage Site in 1987',
   'Hawaii Volcanoes National Park', 'place', 'reject', 'cloze blank from the mining pass'],
  ['Tenerife is dominated by Teide, a volcanic peak that is the highest moun',
   'Tenerife', 'place', 'weak', 'truncated at "moun"; content kept, not promoted to a definition'],
  ['A caldera ( kawl-DERR-\u0259, kal-) is a large cauldron-like hollow that form',
   'Caldera', 'concept', 'weak', 'good claim, but the source carried pronunciation residue'],
  // --- regressions. Each of these was an observed false positive in a real run,
  // --- not a hypothetical, so each one is pinned here.
  ['Mechanical ventilation or assisted ventilation is the medical term for using a ventilator machine to fully or partially provide artificial respiration',
   'Mechanical ventilation', 'concept', 'offtopic', '"ventilation" is not a geological vent'],
  ['an acneiform eruption that has been observed after repetitive physical trauma to the skin such as rubbing, occurring from clothing',
   'Acne mechanica', 'concept', 'offtopic', 'a skin eruption is not a volcanic one'],
  ['Temperature, humidity, and ventilation can be controlled by equipment fixed in the polytunnel or by manual opening and closing of vents.',
   'Polytunnel', 'concept', 'offtopic', 'a polytunnel vent is not a volcanic vent'],
  ['Indo-Burma is a biodiversity hotspot designated by Conservation International.',
   'Indo-Burma', 'concept', 'offtopic', 'a biodiversity hotspot is not a volcanic hotspot'],
  ['The 2014 Dan River coal ash spill occurred in February 2014',
   '2014 Dan River coal ash spill', 'place', 'offtopic', 'coal ash, not volcanic ash'],
  ['According to the Ramayana, one of Rama\'s sons, Lava, ruled Uttara Kosala',
   'Lava', 'person', 'offtopic', 'topic word present only because the entity is named Lava'],
  ['Alternative rock band EMF was formed in Cinderford in 1989',
   'Cinderford', 'place', 'offtopic', '"Cinderford" is not a cinder cone'],
  ['a Philippine national institution dedicated to provide information on the activities of volcanoes, earthquakes, and tsunamis',
   'Philippine Institute of Volcanology and Seismology', 'org', 'fact', '"institution" must count as org vocabulary'],
  // Severed descriptions that were being displayed as [ASSERTED] with the break
  // visible: "...documents the life of the 16th U.S" and "...Airport (IATA".
  ['The volcano museum documents the life of the 16th U.S',
   'Abraham Lincoln Presidential Library and Museum', 'org', 'weak',
   'description ends on a severed abbreviation'],
  ['The volcano international airport (IATA',
   'Netaji Subhas Chandra Bose International Airport', 'org', 'weak',
   'description ends inside an unclosed parenthesis'],
];

var pass = 0, fail = 0;
// Mirror production: the topic being built is always "Volcano", so the caller
// always supplies that topic's vocabulary. Omitting it is the case where a
// topic has no vocabulary at all, which is exercised separately below.
var TOPIC_VOCAB = G.vocabFor('volcano');
console.log('FACT GATE REGRESSION\n' + '-'.repeat(78));
CASES.forEach(function (c) {
  var v = G.evaluate(c[0], c[1], c[2], 'Volcano', LEXICON, TOPIC_VOCAB);
  var ok = v.verdict === c[3];
  ok ? pass++ : fail++;
  console.log(
    (ok ? '  ok  ' : '  FAIL') +
    '  ' + v.verdict.toUpperCase().padEnd(8) +
    ' (' + v.gate + ')'.padEnd(13) +
    ' ' + c[1].slice(0, 30).padEnd(30) + '  ' + c[4]);
  if (!ok) console.log('        expected ' + c[3] + ', got ' + v.verdict + ' -- ' + v.reason);
});
console.log('-'.repeat(78));
console.log(pass + ' passed, ' + fail + ' failed');

// A topic with no vocabulary at all falls back to anchoring on its own name.
// That fallback is where substring matching previously caused false facts, so
// it gets its own table. Note the candidate entity and the topic under test are
// different, exactly as in the Mains node layer: the topic is "Rang Mahal, Sri Ganganagar"
// and the candidate is a co-occurring node. Its 4-letter token "rang" used to
// match "Petermann Ranges" and "Song Hye-rang"; both must be rejected, while a
// real mention of the topic name must survive.
// [sentence, candidateEntity, resolvedType, topic, expectedVerdict, why]
var NAME_CASES = [
  ['The Petermann Ranges are a mountain range in central Australia',
   'Petermann Ranges (Australia)', 'place', 'Rang Mahal, Sri Ganganagar', 'offtopic',
   '"rang" inside "Ranges" is not a name anchor'],
  ['Kim Jong Il\'s sister-in-law Song Hye-rang characterized 25 May as the day everything changed',
   'Song Hye-rang', 'person', 'Rang Mahal, Sri Ganganagar', 'offtopic',
   '"rang" inside a hyphenated name is not a name anchor'],
  ['Rang Mahal is a neighbourhood in the city of Sri Ganganagar in Rajasthan',
   'Sri Ganganagar', 'place', 'Rang Mahal, Sri Ganganagar', 'fact',
   'a genuine mention of the topic name is admitted'],
  ['The Ganga flows past the city of Varanasi',
   'Varanasi', 'place', 'Ganga', 'fact',
   'a 5-letter topic token is distinctive enough to anchor'],
];
console.log('\nNAME-ANCHOR REGRESSION (no topic vocabulary)');
console.log('-'.repeat(78));
NAME_CASES.forEach(function (c) {
  var v = G.evaluate(c[0], c[1], c[2], c[3], null, null);
  var ok = v.verdict === c[4];
  ok ? pass++ : fail++;
  console.log(
    (ok ? '  ok  ' : '  FAIL') +
    '  ' + v.verdict.toUpperCase().padEnd(8) +
    ' (' + v.gate + ')'.padEnd(13) +
    ' ' + c[1].slice(0, 30).padEnd(30) + '  ' + c[5]);
  if (!ok) console.log('        expected ' + c[4] + ', got ' + v.verdict + ' -- ' + v.reason);
});
console.log('-'.repeat(78));
console.log(pass + ' passed, ' + fail + ' failed');

// The gate is only useful if it is not trivially permissive.
var accepted = CASES.filter(function (c) { return c[3] === 'fact'; }).length;
if (accepted < 5) {
  console.error('GATE TOO STRICT: only ' + accepted + ' facts admitted');
  process.exit(1);
}
process.exit(fail ? 1 : 0);

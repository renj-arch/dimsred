/*
 * figure-auto-score.test.js -- regression tests for figure auto-pick relevance.
 *
 * Run: node scripts/lib/figure-auto-score.test.js
 *
 * The test that matters most is "Long Island" vs "Easter Island map-fr.svg". That
 * pair shipped in the geography pack: an Easter Island map was published under
 * the heading "Long Island", because the old rule gave full relevance credit for
 * the shared generic token "island" and never required the distinctive "long".
 */
'use strict';
var FAS = require('./figure-auto-score.js');

var pass = 0, fail = 0;

function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

console.log('figure-auto-score');

console.log('\n[the shipped bug]');
var bug = FAS.topicRelevance(FAS.norm('Easter Island map-fr.svg'), 'Long Island');
check('Easter Island map is NOT relevant to "Long Island"',
  bug.score < 0, 'score=' + bug.score + ' reason=' + bug.reason);
check('  ...because no distinctive token matched',
  bug.matched.length === 0 && bug.key.length === 1 && bug.key[0] === 'long',
  'key=' + JSON.stringify(bug.key) + ' matched=' + JSON.stringify(bug.matched));

console.log('\n[the fix must not reject correct picks]');
check('"Long Island (New York) map.png" IS relevant to "Long Island"',
  FAS.isRelevant('Long Island (New York) map.png', 'Long Island'));
check('"Longisland Ny right.svg" IS relevant to "Long Island"',
  FAS.isRelevant('Longisland Ny right.svg', 'Long Island'));
check('"Amazon River Basin map.png" IS relevant to "Amazon River"',
  FAS.isRelevant('Amazon River Basin map.png', 'Amazon River'));
check('"Canary Islands locator map.svg" IS relevant to "Canary Islands"',
  FAS.isRelevant('Canary Islands locator map.svg', 'Canary Islands'));
check('"Easter Island map-fr.svg" is NOT relevant to "Canary Islands"',
  !FAS.isRelevant('Easter Island map-fr.svg', 'Canary Islands'));
check('"Marshall Islands location map.png" IS relevant to "Marshall Islands"',
  FAS.isRelevant('Marshall Islands location map.png', 'Marshall Islands'));
check('"Heard Island and McDonald Islands locator.png" IS relevant to "Heard Island & McDonald Islands"',
  FAS.isRelevant('Heard Island and McDonald Islands locator.png', 'Heard Island & McDonald Islands'));
check('single-token topic still works: "Suez Canal" needs "suez" or "canal"',
  FAS.isRelevant('Suez Canal map.png', 'Suez Canal'));
check('single-token topic rejects a file sharing only the generic word: "Suez Canal" vs "Panama Canal map.png"',
  !FAS.isRelevant('Panama Canal map.png', 'Suez Canal'),
  'the old any-token rule accepted this on the shared word "canal"');

console.log('\n[single-token topics keep requiring that token]');
check('"Ganga river" does not match "Amazon River Basin"',
  !FAS.isRelevant('Amazon River Basin map.png', 'Ganga River'),
  'generic fallback: "river" is generic, "ganga" is key and absent');
check('"Ganga river" matches a file containing "ganga"',
  FAS.isRelevant('Ganga river map.png', 'Ganga River'));

console.log('\n[generic-only topics fall back, they do not reject everything]');
var gen = FAS.topicRelevance(FAS.norm('Japan islands map.png'), 'Islands');
check('topic "Islands" falls back to any-token and accepts',
  gen.score > 0, gen.reason);
check('  ...and the fallback is reported, not silently treated as distinctive',
  /fell back/.test(gen.reason) && gen.key.length === 0, gen.reason);

console.log('\n[abstract nouns must not carry relevance on their own]');
check('"Powers chart.svg" is NOT relevant to "Axis powers"',
  !FAS.isRelevant('Powers chart.svg', 'Axis powers'),
  'second shipped instance of the same bug class');
check('"Axis Powers Zenith.png" IS relevant to "Axis powers"',
  FAS.isRelevant('Axis Powers Zenith.png', 'Axis powers'));
check('"Balance of Power 1942.png" IS relevant to "Balance of Power"',
  FAS.isRelevant('Balance of Power 1942.png', 'Balance of Power'),
  '"balance" is the distinctive token and it is present');

console.log('\n[no topic, no crash]');
check('empty topic does not throw and scores 0',
  FAS.topicRelevance(FAS.norm('anything.svg'), '').score === 0);
check('empty candidate does not throw',
  FAS.topicRelevance('', 'Long Island').score < 0);

console.log('\n[diacritics are folded, matching the old tokens()]');
check('"Sao Paulo" style folding works',
  FAS.topicTokens('São Paulo').key.indexOf('paulo') !== -1,
  JSON.stringify(FAS.topicTokens('São Paulo').key));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

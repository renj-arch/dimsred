/*
 * figure-resolve-guards.test.js -- regression tests for the two correctness
 * guards that let false positives reach a published figure pack.
 *
 * Run: node scripts/lib/figure-resolve-guards.test.js
 *
 * Both cases here were published. The scheduled Figures Build run resolved two
 * topics that every earlier check had refused to touch, because those topics
 * were deliberate gaps rather than misses:
 *
 *   "colonial architecture india"  -> "Architecture coloniale a Neves (Sao Tome).jpg"
 *   "national science day india"   -> "National Science Board Members, July 1951.jpg"
 *
 * The first is colonial architecture in an island nation 8,000km from India; the
 * scope check could not catch it because neither "sao" nor "tome" was a known
 * country token. The second is a photograph of the board that runs the observance,
 * not the observance. Neither is a scoring problem -- both are type and identity
 * problems, and a higher confidence threshold would not have caught either one.
 */
'use strict';
var FR = require('./figure-resolve.js');

var pass = 0, fail = 0;

function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

function r(file, article, label) {
  return { file: file, article: article || '', label: label || '' };
}

console.log('figure-resolve-guards');

console.log('\n[shipped bug 1: wrong country]');
var st = r('Architecture coloniale a Neves (Sao Tome).jpg', 'Neves');
check('Sao Tome architecture is NOT valid for "colonial architecture india"',
  !FR.respectsScope(st, 'colonial architecture india'));
check('  ...but the same file IS fine unscoped',
  FR.respectsScope(st, 'colonial architecture'),
  'an unscoped topic makes no country claim, so it must not be blocked');
check('  ...and fine when the topic itself names the country',
  FR.respectsScope(st, 'colonial architecture sao tome'),
  'a topic that names the figure\'s own country must be allowed');
check('accents are stripped, so the accented spelling is caught too',
  !FR.respectsScope(r('Arquitectura colonial em Sao Tome.jpg'), 'colonial architecture india'));

console.log('\n[shipped bug 2: photograph of people for a non-person topic]');
var board = r('National Science Board Members, July 1951.jpg',
  'National Science Board', 'National Science Board');
check('board-members photo is NOT valid for "national science day india"',
  !FR.plausibleFigureType(board, 'national science day india'));
check('  ...but a non-people photo is fine',
  FR.plausibleFigureType(r('National Science Day poster.jpg'), 'national science day india'));
check('  ...and a leadership topic still accepts a people photo',
  FR.plausibleFigureType(board, 'national science board leadership'),
  'narrowing must not break the topics that genuinely want a person');

console.log('\n[the fix must not over-block real figures]');
[
  ['stupa architecture india', r('Stupa 1, Sanchi 02.jpg')],
  ['gandhara and mathura school art', r('Gandhara Buddha, Indian Museum.jpg')],
  ['mangrove forests india', r('Mangrove forests of Qeshm.jpg', 'Qeshm')],
  ['mughal architecture india', r('Taj Mahal, Agra, India.jpg')],
  ['indian wildlife national parks', r('Royal Tiger Reserve, Ranthambore.jpg')],
  ['monuments and buildings india', r('Red Fort, Delhi.jpg')],
  ['sports india', r('Dhyan Chand playing field hockey.jpg')]
].forEach(function (p) {
  check('"' + p[0] + '" still resolves', FR.plausibleFigureType(p[1], p[0]));
});
check('a figure naming no country at all is allowed (Qeshm case)',
  FR.respectsScope(r('Mangrove forests of Qeshm.jpg', 'Qeshm'), 'mangrove forests india'),
  'the guard refuses a NAMED contradiction only; a place name carrying no ' +
  'country word is not detectable here and stays a known blind spot');

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'all ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
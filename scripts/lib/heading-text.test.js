'use strict';
// Guard for scripts/lib/heading-text.js. A leaked "Deep-1:" / "Section 2:"
// label is a reader-facing defect, so the stripper is tested rather than
// trusted, and this file is run by slim-live.yml before deploy.
const assert = require('assert');
const { stripHeadingPrefix, stripHeadingPrefixes } = require('./heading-text');

let pass = 0;
let fail = 0;

function ok(name, actual, expected) {
  try {
    assert.strictEqual(actual, expected);
    pass++;
    console.log('  PASS  ' + name);
  } catch (e) {
    fail++;
    console.log('  FAIL  ' + name);
    console.log('        expected: ' + JSON.stringify(expected));
    console.log('        actual:   ' + JSON.stringify(actual));
  }
}

console.log('heading-text: leaked label removal');

// The real defects observed on 2026-11-14.
ok('ascii hyphen label', stripHeadingPrefix('Deep-1: Taxonomy of RC Question Types'), 'Taxonomy of RC Question Types');
ok('non-breaking hyphen label', stripHeadingPrefix('Deep\u20111: Taxonomy'), 'Taxonomy');
ok('en dash label', stripHeadingPrefix('Deep\u20131: Taxonomy'), 'Taxonomy');
ok('section label', stripHeadingPrefix('Section 3: Governance'), 'Governance');
ok('part label with em dash', stripHeadingPrefix('Part 2 \u2014 Federalism'), 'Federalism');
ok('upper case', stripHeadingPrefix('SECTION 4) Health'), 'Health');
ok('dot separator', stripHeadingPrefix('Section 1. Preamble'), 'Preamble');
ok('spaced hyphen', stripHeadingPrefix('Section 1 - Preamble'), 'Preamble');

// Things that must not change.
ok('year heading', stripHeadingPrefix('1857: The Revolt'), '1857: The Revolt');
ok('section without separator', stripHeadingPrefix('Section 1 of the RBI Act'), 'Section 1 of the RBI Act');
ok('ordinary word', stripHeadingPrefix('Deepening Democracy'), 'Deepening Democracy');
ok('plain title', stripHeadingPrefix('Taxonomy of RC Question Types'), 'Taxonomy of RC Question Types');
ok('label only is kept', stripHeadingPrefix('Section 1:'), 'Section 1:');

// HTML level: ids and inline markup survive, prose is untouched.
const html = [
  '<h2 id="deep-1">Deep-1: Taxonomy</h2>',
  '<h3>1.1 <strong>Core</strong> categories</h3>',
  '<p>Section 1: this paragraph is body text and must not change.</p>',
  '<h2>Section 2: <em>Federalism</em></h2>'
].join('\n');
const out = stripHeadingPrefixes(html);
ok('keeps the id attribute', out.includes('<h2 id="deep-1">Taxonomy</h2>'), true);
ok('keeps h3 numbering', out.includes('<h3>1.1 <strong>Core</strong> categories</h3>'), true);
ok('keeps body text', out.includes('<p>Section 1: this paragraph is body text and must not change.</p>'), true);
ok('keeps inline markup', out.includes('<h2><em>Federalism</em></h2>'), true);
ok('idempotent', stripHeadingPrefixes(out), out);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

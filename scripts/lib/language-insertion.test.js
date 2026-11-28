'use strict';
// The language lane appends sections to hand-built shells. A wrong insertion
// point silently places content outside the body or into the wrong container,
// which is worse than skipping the page. These tests pin the Paper A and CTET
// insertion points.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const lane = require('../expand-language-pages');

const ROOT = path.resolve(__dirname, '..', '..');
const BLOCK = '<h3>New section</h3><p>Body text.</p>';

// Paper A pages use <p class=...>, <h2> and a trailing script.
const paper = fs.readFileSync(path.join(ROOT, 'upsc', 'mains', 'language', 'bodo.html'), 'utf8');
const paperOut = lane.applyInsertion(paper, { file: 'upsc/mains/language/bodo.html', kind: 'mains' }, BLOCK);
assert.ok(paperOut, 'Paper A insertion returned null');
assert.ok(paperOut.indexOf('<div class="language-section">') !== -1, 'no language-section wrapper');
const pBody = paperOut.indexOf('<body');
const pIns = paperOut.indexOf('class="language-section"');
const pEnd = paperOut.lastIndexOf('</body>');
assert.ok(pIns > pBody && pIns < pEnd, 'Paper A insertion is outside the body');
assert.ok(pIns < paperOut.indexOf('language-practice.js'), 'Paper A insertion is after the practice script');

// CTET lessons use div.lesson-body; the block must land before its closing tag.
const ctet = fs.readFileSync(path.join(ROOT, 'ctet', 'course', 'language', 'lesson-comprehension.html'), 'utf8');
const ctetOut = lane.applyInsertion(ctet, { file: 'ctet/course/language/lesson-comprehension.html', kind: 'ctet' }, BLOCK);
assert.ok(ctetOut, 'CTET insertion returned null');
assert.ok(ctetOut.indexOf('<div class="language-section">') !== -1, 'no CTET language-section');

console.log('PASS  language insertion: Paper A body-tail and CTET lesson-body');
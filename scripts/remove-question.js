'use strict';
// Remove a broken question item by id, by text surgery.
//
// The banks and papers carry mojibake bytes (a mangled "²" in gate.json reads
// as an invalid UTF-8 sequence), so a JSON.parse -> JSON.stringify round trip
// is not byte-identical and would rewrite the whole file. Cut the object out of
// the raw text instead, using brace counting from the item's opening brace.
//
//   node scripts/remove-question.js question-bank/gate.json 1945
var fs = require('fs');
var path = require('path');

var file = process.argv[2];
var id = parseInt(process.argv[3], 10);
if (!file || !id) { console.error('usage: node scripts/remove-question.js <file> <id>'); process.exit(2); }

var raw = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
var needle = '"id": ' + id;
var at = raw.indexOf(needle);
if (at === -1) { console.log(file + ': id ' + id + ' not present'); process.exit(0); }

// Walk back to the brace that encloses the id. Counting backwards finds the
// item's own opening brace: every nested object (options, tableData, {} values)
// is balanced between the id and that brace, so the first unmatched '{' going
// back IS the item's. The last '{' before the id is not -- the item carries
// nested empty objects between its opening brace and its id.
var open = -1, depth = 0;
for (var b = at - 1; b >= 0; b--) {
  var ch = raw[b];
  if (ch === '}') depth++;
  else if (ch === '{') { if (depth === 0) { open = b; break; } depth--; }
}
if (open === -1) { console.error('could not find the opening brace'); process.exit(1); }

// Forward to the matching brace, ignoring braces inside strings.
var depth = 0, i = open, inStr = false, esc = false;
for (; i < raw.length; i++) {
  var c = raw[i];
  if (inStr) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
}

// Remove the object and exactly one joining comma. If a comma follows the
// closing brace, the item was not last: drop the comma after it. Otherwise it
// was last: drop the comma that preceded it, so the array stays closed.
var close = i; // i is one past the closing brace
var lineStart = raw.lastIndexOf('\n', open - 1) + 1;
var after = raw.slice(close);
var fwd = after.match(/^[ \t\r\n]*,/);
var cutFrom, cutTo;
if (fwd) {
  cutFrom = lineStart;
  cutTo = close + fwd[0].length;
} else {
  var back = raw.slice(0, lineStart);
  var pm = back.match(/,[ \t\r\n]*$/);
  cutFrom = pm ? back.length - pm[0].length : lineStart;
  cutTo = close;
}
var out = raw.slice(0, cutFrom) + raw.slice(cutTo);
fs.writeFileSync(path.join(__dirname, '..', file), out, 'utf8');

// Prove it still parses and the item is gone.
var check = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
console.log(file + ': removed id ' + id + ', file still parses (' + JSON.stringify(check).length + ' bytes of JSON)');
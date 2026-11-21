'use strict';
// Self-test for the shard splitter in build-ask-qb.js.
//
// A production rebuild is the only other thing that exercises writeShard on an
// oversized category, and it runs weekly at best, so the splitter gets its own
// check: a fabricated > PART_LIMIT category is written through the real
// function, every part is verified parseable and under the limit, and the
// concatenation of the parts must equal the original row list. It writes under
// a scratch category id that nothing references, then removes what it wrote.
var fs = require('fs');
var path = require('path');
var builder = require('./build-ask-qb.js');

var ROOT = path.join(__dirname, '..');
var CI = 999999; // no real category index; nothing may reference this shard

// The scratch parts are written under data/ask-qb; the directory may not exist
// in a checkout that never ran a build (the write path only needs the folder).
var OUT = path.join(ROOT, 'data', 'ask-qb');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function makeList(targetBytes) {
  var list = [];
  var bytes = 0;
  var i = 0;
  while (bytes < targetBytes) {
    var n = 'entity ' + i;
    var s = ('sentence about the test entity number ' + i + ' ').repeat(40).trim();
    var row = [n, [s + ' first.', s + ' second.'], ['test-cat'], [{ source: 'test', pubDate: '' }]];
    bytes += JSON.stringify(row).length + 1;
    list.push(row);
    i++;
  }
  return list;
}

var ok = true;
function fail(msg) { ok = false; console.log('  FAIL ' + msg); }

var list = makeList(builder.PART_LIMIT + 5 * 1024 * 1024); // just over one part
var shard = builder.writeShard(list, CI);

if (shard.parts < 2) fail('expected at least 2 parts, got ' + shard.parts);
if (shard.files.length !== shard.parts) fail('files/parts mismatch');
if (shard.partBytes.length !== shard.parts) fail('partBytes/parts mismatch');
if (shard.bytes !== Buffer.byteLength(JSON.stringify(list))) fail('bytes total mismatch');
if (shard.files[0].indexOf('ask-qb.' + CI + '.p0.json') === -1) fail('part naming wrong: ' + shard.files[0]);

var combined = [];
shard.files.forEach(function (f, i) {
  var p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { fail('part missing on disk: ' + f); return; }
  var rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  var sz = fs.statSync(p).size;
  if (sz > builder.PART_LIMIT) fail('part ' + i + ' exceeds PART_LIMIT: ' + sz);
  if (shard.partBytes[i] !== sz) fail('partBytes[' + i + '] mismatch');
  combined = combined.concat(rows);
});
if (JSON.stringify(combined) !== JSON.stringify(list)) fail('concatenated parts differ from the original list');

// An under-limit shard still lands as one plain file with the historical name.
var small = builder.writeShard([['tiny', ['one sentence here'], ['x'], [{}]]], CI + 1);
if (small.parts !== 1) fail('small shard split into ' + small.parts + ' parts');
if (small.files[0] !== 'data/ask-qb/ask-qb.' + (CI + 1) + '.json') fail('small shard naming wrong: ' + small.files[0]);

shard.files.concat(small.files).forEach(function (f) { try { fs.unlinkSync(path.join(ROOT, f)); } catch (e) {} });

console.log(ok ? 'shard split self-test passed (' + shard.parts + ' parts, largest category verified)' : 'SHARD SPLIT SELF-TEST FAILED');
process.exit(ok ? 0 : 1);

'use strict';
// The entity -> bucket hash, in its own module.
//
// It has to be a module of its own and not a local function in the builder: the
// browser has to compute exactly the same value from exactly the same input, and
// a single character of drift would send every question to the wrong file and
// every answer would come back empty. Keeping one implementation, loaded by both
// sides, is what makes that impossible rather than merely unlikely.

var BUCKETS = 512;

// FNV-1a over the entity name, normalised the same way the entity table
// normalises: lowercased, non-alphanumerics collapsed to single spaces.
//
// The 32-bit prime multiply is written as shifts because JavaScript has no
// 32-bit integer type; the naive `h * 16777619` loses precision once h exceeds
// 2^53, which would make the result depend on rounding and differ between
// engines.
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function bucketOf(name, n) {
  var count = n || BUCKETS;
  var s = norm(name);
  // A name that normalises to nothing still needs a home, or it would be
  // unfetchable. Hashing the empty string is stable and lands in bucket 0.
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h % count;
}

module.exports = { bucketOf: bucketOf, norm: norm, BUCKETS: BUCKETS };
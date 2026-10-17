'use strict';
// Build the question-bank index for the Ask engine.
//
// The timeline index (build-ask-index.js) covers 537,888 nodes. The question
// bank under data/questions is 15.38M records across 1,152 files / 8.5 GB and
// holds the material a timeline node cannot: the actual sentences behind a
// fill-in-the-blank item. Measured on the full bank, India-relevant records
// include 292 on Article 370, 61 on the Sixth Schedule, 37 on Article 371 and
// 141 on autonomous districts -- none of which the timeline index could answer.
//
// This does NOT try to index all 15.38M records in one pass. It emits a
// per-category shard, the same shape archive.html already streams, so the
// browser only ever downloads the categories a question plausibly needs.
//
// Why streaming: holding 15.38M parsed records in memory is what OOMs. Each
// file is parsed, reduced to quotable sentences, and released before the next.

var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');

var ROOT = path.join(__dirname, '..');
var QDIR = path.join(ROOT, 'data', 'questions');
var OUTDIR = path.join(ROOT, 'data', 'ask-qb');

// Sentences per record cap. A record's `fact` is a paragraph reused across many
// fill-blank items about the same entity; keeping the whole paragraph for each
// one is what would multiply 15.38M records into gigabytes of index. The first
// few sentences carry the definitional content, which is what answers a
// question, so the tail is dropped.
var MAX_SENTENCES_PER_RECORD = 4;
// There is deliberately no per-entity ceiling.
//
// There was one, at 24 sentences, and it was the single reason Ask could say
// "nothing found" about material the corpus plainly held. "Common ostrich" exists
// in Animal Husbandry & Dairy with a paragraph long enough to state that water
// mass is 68% of adult body weight -- and its row was cut at exactly 24
// sentences, so the sentence that answers the question was not in the index. A
// limit that is invisible at retrieval time reads as a fact about the corpus, which
// is the one confusion this project keeps having to undo.
//
// Size is the cost, and it is paid honestly: the buckets grow toward the full
// record count, which is why they are deployed from object storage rather than
// committed. Deduplication below already removes the real waste -- the same
// Wikipedia paragraph backing many fill-blank items -- so what remains is genuine
// distinct content, not repetition.
var MAX_SENTENCES_PER_ENTITY = Infinity;
var MIN_SENTENCE_WORDS = 8;

// Largest single shard file the browser can fetch. Two ceilings matter and the
// lower one binds: raw.githubusercontent.com refuses to serve files over
// 100 MiB (the corpus rides its own branch precisely because main cannot hold
// these artefacts), and the deploy target enforces 25 MiB per file, which is
// why the CF direct upload never carried them and the client fetches from the
// raw fallback instead. 60 MiB keeps every part comfortably servable raw while
// still being large enough that a category needs at most a handful of fetches.
var PART_LIMIT = 60 * 1024 * 1024;

// Write one category's rows, split into parts when the serialised shard exceeds
// PART_LIMIT. Returns { files, partBytes, bytes, parts }. The rows are split
// whole -- an entity's sentence array never straddles two files -- so every
// part is a valid shard of the same shape, and a reader that concatenates the
// parts sees exactly the unsplit row list.
function writeShard(list, ci) {
  var base = 'ask-qb.' + String(ci);
  var text = JSON.stringify(list);
  var bytes = Buffer.byteLength(text);
  if (bytes <= PART_LIMIT) {
    var one = base + '.json';
    fs.writeFileSync(path.join(OUTDIR, one), text);
    var rel1 = 'data/ask-qb/' + one;
    return { files: [rel1], partBytes: [bytes], bytes: bytes, parts: 1 };
  }

  var nParts = Math.ceil(bytes / PART_LIMIT);
  var per = Math.ceil(bytes / nParts);
  var groups = [];
  var cur = [];
  var curBytes = 2; // the enclosing [ ]
  for (var i = 0; i < list.length; i++) {
    var rowText = JSON.stringify(list[i]);
    var rb = rowText.length + 1; // comma
    // Close the current part when it is at its share and later parts remain.
    // Rounding can leave the final group slightly over `per`; PART_LIMIT is
    // 40 MiB below raw's hard ceiling, so that is absorbed with room to spare.
    if (cur.length && curBytes + rb > per && groups.length < nParts - 1) {
      groups.push(cur);
      cur = [];
      curBytes = 2;
    }
    cur.push(rowText);
    curBytes += rb;
  }
  groups.push(cur);

  var files = [];
  var partBytes = [];
  for (var k = 0; k < groups.length; k++) {
    var name = base + '.p' + k + '.json';
    var body = '[' + groups[k].join(',') + ']';
    fs.writeFileSync(path.join(OUTDIR, name), body);
    files.push('data/ask-qb/' + name);
    partBytes.push(Buffer.byteLength(body));
  }
  // A leftover unsplit file from an earlier run must not linger next to the
  // parts: nothing references it, but a stale copy hides split regressions.
  try { fs.unlinkSync(path.join(OUTDIR, base + '.json')); } catch (e) {}
  return { files: files, partBytes: partBytes, bytes: bytes, parts: files.length };
}

function readCatIndex() {
  var p = path.join(QDIR, 'archive-cat-index.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function splitSentences(text) {
  var parts = String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
  return parts;
}

// A record is reduced to quotable sentences plus provenance. Nothing is
// generated: every sentence is a verbatim slice of the record's own `fact`.
//
// Each sentence keeps the source and date of the record it came from, because a
// quote whose provenance has been thrown away cannot be checked by a reader, and
// the corpus is largely `source: Wiki` with 2026 dates -- exactly the kind of
// material that needs a visible caveat rather than silent trust.
function sentencesOf(rec) {
  var fact = String(rec.fact || '').trim();
  if (!fact) return [];
  var out = [];
  var sents = splitSentences(fact);
  for (var i = 0; i < sents.length && out.length < MAX_SENTENCES_PER_RECORD; i++) {
    var s = sents[i].trim();
    if (ask.wordCount(s) < MIN_SENTENCE_WORDS) continue;
    if (!ask.isQuoteable(s)) continue;
    out.push({ text: s, source: rec.source, pubDate: rec.pubDate });
  }
  return out;
}

// Records arrive as cat -> subSubjects -> items, but the exact depth has varied
// across commits, so the walk is depth-agnostic.
function walk(node, ctx, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(function (x) { walk(x, ctx, out); }); return; }
  if (node.subSubjects && typeof node.subSubjects === 'object' && !Array.isArray(node.subSubjects)) {
    var subs = node.subSubjects;
    Object.keys(subs).forEach(function (sk) {
      if (sk === '__proto__' || sk === 'constructor') return;
      walk(subs[sk], { cat: ctx.cat, sub: sk }, out);
    });
    return;
  }
  if (node.subSubjects && Array.isArray(node.subSubjects)) { walk(node.subSubjects, ctx, out); return; }
  if (node.question !== undefined || node.fact !== undefined) { out.push({ ctx: ctx, r: node }); return; }
  Object.keys(node).forEach(function (k) { walk(node[k], { cat: ctx.cat || k, sub: ctx.sub }, out); });
}

function entityOf(ctx, rec) {
  return String(rec.subSubject || ctx.sub || rec.subject || rec.category || ctx.cat || '').trim();
}

// ── pass 1: per-category entity + sentence harvest ──────────────────────────

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}

function main() {
  var cats = readCatIndex();
  process.stderr.write('categories: ' + cats.length + '\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  // entityKey -> entity record. Per category, not global, so memory tracks the
  // largest single category rather than the whole bank.
  var perCat = {};
  var stats = { files: 0, records: 0, keptSent: 0, dupes: 0, parseErr: 0 };
  var t0 = Date.now();

  cats.forEach(function (cat, ci) {
    var files = cat.file;
    if (!Array.isArray(files)) files = [files];
    // Skip the Bloom-filter shards: they are hash arrays, not records.
    files = files.filter(function (f) { return !/^data[\\/]questions[\\/]search-filter\./.test(f); });
    var ents = {};
    var seenSent = {};

    files.forEach(function (rel) {
      var p = path.join(ROOT, rel);
      if (!fs.existsSync(p)) return;
      var data;
      try { data = JSON.parse(fs.readFileSync(p, 'utf8')); }
      catch (e) { stats.parseErr++; return; }
      stats.files++;
      var out = [];
      walk(data, { cat: cat.name }, out);
      out.forEach(function (x) {
        stats.records++;
        var name = entityOf(x.ctx, x.r);
        if (!name) return;
        var sents = sentencesOf(x.r);
        if (!sents.length) return;
        var ek = slug(name);
        if (!ents[ek]) ents[ek] = { name: name, sents: [], cats: {}, meta: [] };
        ents[ek].cats[cat.name] = 1;
        sents.forEach(function (s) {
          // Dedupe per entity: the same Wikipedia paragraph backs many
          // fill-blank items, and a repeated sentence must not occupy several
          // evidence slots.
          var k = s.text.slice(0, 160);
          if (seenSent[ek + '\u0000' + k]) { stats.dupes++; return; }
          seenSent[ek + '\u0000' + k] = 1;
          if (ents[ek].sents.length >= MAX_SENTENCES_PER_ENTITY) return;
          ents[ek].sents.push(s.text);
          // Provenance is a parallel array, not part of the sentence string, so
          // the sentence stays byte-identical to the corpus and the shard's
          // retrieval shape is unchanged for existing readers. A missing entry
          // means "no provenance", which reads as unverified rather than fine.
          ents[ek].meta.push({ source: s.source || '', pubDate: s.pubDate || '' });
          stats.keptSent++;
        });
      });
    });

    var list = Object.keys(ents).map(function (k) {
      var e = ents[k];
      // [entity, [sentences], [categories], [{source, pubDate}, ...]]
      return [e.name, e.sents, Object.keys(e.cats), e.meta];
    }).filter(function (r) { return r[1].length; });

    if (!list.length) return;
    var shard = writeShard(list, ci);
    perCat[ci] = {
      name: cat.name,
      file: shard.files[0],
      files: shard.files,
      partBytes: shard.partBytes,
      parts: shard.parts,
      entities: list.length,
      sentences: list.reduce(function (a, r) { return a + r[1].length; }, 0),
      bytes: shard.bytes
    };
    process.stderr.write('  [' + (ci + 1) + '/' + cats.length + '] ' + cat.name + ': ' +
      list.length + ' entities, ' + perCat[ci].sentences + ' sentences, ' +
      (perCat[ci].bytes / 1048576).toFixed(2) + ' MB\n');
  });

  var manifest = {
    builtAt: new Date().toISOString(),
    builtFrom: 'data/questions/*.json (archive-cat-index category files)',
    categories: Object.keys(perCat).map(function (k) { return perCat[k]; }),
    stats: stats
  };
  fs.writeFileSync(path.join(OUTDIR, 'manifest.json'), JSON.stringify(manifest));
  var total = manifest.categories.reduce(function (a, c) { return a + c.bytes; }, 0);
  process.stderr.write('\nwrote manifest.json: ' + manifest.categories.length +
    ' categories, ' + (total / 1048576).toFixed(1) + ' MB total, ' +
    stats.records.toLocaleString() + ' records walked, ' +
    stats.keptSent.toLocaleString() + ' sentences kept, ' +
    ((Date.now() - t0) / 1000).toFixed(0) + 's\n');
}
if (require.main === module) main();
// Exported for the split self-test (scripts/test-ask-shard-split.js): the
// oversized-shard path cannot be exercised by a full rebuild in CI time, and an
// untested splitter is the piece that would take the corpus branch down.
module.exports = { writeShard: writeShard, PART_LIMIT: PART_LIMIT };

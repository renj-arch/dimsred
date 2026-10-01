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
var MAX_SENTENCES_PER_ENTITY = 24;
var MIN_SENTENCE_WORDS = 8;

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
    var outName = 'ask-qb.' + String(ci) + '.json';
    fs.writeFileSync(path.join(OUTDIR, outName), JSON.stringify(list));
    perCat[ci] = {
      name: cat.name,
      file: 'data/ask-qb/ask-qb.' + ci + '.json',
      entities: list.length,
      sentences: list.reduce(function (a, r) { return a + r[1].length; }, 0),
      bytes: fs.statSync(path.join(OUTDIR, outName)).size
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
main();

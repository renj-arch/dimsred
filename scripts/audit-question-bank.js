/*
 * audit-question-bank.js -- measure how much of data/questions/ is off-subject.
 *
 * WHY
 * ---
 * The figure packs were found to advertise "History of the Democratic Party
 * (United States)" and "James K. Polk" under Animal Husbandry & Dairy. The
 * obvious suspect is scripts/build-subject-figures.js, which picks each
 * subject's six most-questioned subtopics and auto-picks a figure for each. But
 * that code is behaving correctly: those six really are the six
 * highest-questioned subtopics in the bank. The defect is upstream, in the
 * question bank itself.
 *
 * THE DEFECT
 * ----------
 * The numbered shards (data/questions/<subject>-<n>.json) are not subject
 * corpora. Each subject label owns one complete A-Z run of English Wikipedia,
 * split into ~15k-question files:
 *
 *   world-geography-4    330 .. A&F Quarterly
 *   world-geography-5    A&P Group .. Ada Louise Huxtable
 *   world-geography-6    Ada Sari .. Afsin
 *   environment-ecology-13   Bhutan .. Boyzone
 *   environment-ecology-14   Brachylophosaurus .. Calouste Gulbenkian Museum
 *
 * So "Environment & Ecology" contains Anna Boleyn and Compsognathidae, and
 * "Ancient India" contains the Megamouth shark. A real syllabus-shaped
 * subject would concentrate on a few letters; these span all 65.
 *
 * HOW THIS TOOL MEASURES IT
 * -------------------------
 * Two independent structural signals, because neither one is sufficient alone.
 *
 * 1. SHARDING (the reliable one). A subject spread across many numbered shards
 *    (data/questions/<subject>-2.json, -3.json, ...) is a slice of the sweep.
 *    All 22 subjects with TVD < 0.16 have >= 9 files, and every subject with
 *    >= 3 files holds 454,384 of the bank's 472,883 subtopics (96%).
 *
 * 2. TVD -- total-variation distance between a subject's subtopic first-letter
 *    distribution and the bank-wide one. Structural, so it needs no dictionary
 *    and cannot be fooled by a plausibly-named off-subject topic. A subject
 *    built from topical material has a lopsided letter distribution and scores
 *    high; a slice of an alphabetical sweep looks like the bank and scores near
 *    zero.
 *
 * NEITHER SIGNAL DECIDES ON ITS OWN -- measured, not assumed:
 *   - Animal Husbandry & Dairy has 22 files and 11,759 subtopics (clearly a
 *     sweep) yet scores TVD 0.222, just above any plausible cutoff. A binary
 *     threshold would have called it clean.
 *   - Conversely Mining & Minerals and Indian Philosophy & Thinkers live in a
 *     SINGLE file and are still sweeps ("1,2-Dimethyldiborane", "Rot an der
 *     Rot Abbey"). File count alone would have cleared them.
 *   - And Art & Culture / Languages & Linguistics, also small, are genuinely
 *     topical ("Onam", "Sindhi language").
 *
 * So the output is TRIAGE, not a verdict. Every subject is printed with a
 * spread sample of its subtopic names, because reading five names settles in
 * seconds what neither metric can.
 *
 * KNOWN LIMITATIONS -- do not over-read the numbers
 * -------------------------------------------------
 *   - 43 subjects sit in the ambiguous TVD band 0.16-0.34 and are not
 *     classified either way. They need human review, not a verdict.
 *   - The `?` prefix on a subtopic is NOT a quality marker. It comes from
 *     scripts/classify-subtopics.js:10 as the "moved-in sub-topic" tick, and
 *     those shards are equally contaminated.
 *   - The typed vocabularies in data/wiki-*.json (22,803 entities) are good
 *     ground truth for CONFIRMING a good topic but cover only ~5% of slots, so
 *     they can never measure how much is bad.
 *   - This tool CANNOT decide the correct home for an off-subject topic. It
 *     measures damage; it does not repair it. Note that
 *     scripts/remap-misplaced-wiki-questions.js hand-remaps one subtopic at a
 *     time, which cannot scale to the ~473k slots here.
 *   - This tool CANNOT decide the correct home for an off-subject topic. It
 *     measures damage; it does not repair it. Note that
 *     scripts/remap-misplaced-wiki-questions.js hand-remaps one subtopic at a
 *     time, which cannot scale to the ~473k slots here.
 *
 * READ-ONLY: this script never writes to data/questions/ or anywhere else.
 *
 * Usage:
 *   node scripts/audit-question-bank.js                 full report
 *   node scripts/audit-question-bank.js --subject "Environment & Ecology"
 *   node scripts/audit-question-bank.js --csv           machine-readable dump
 *
 * A subject with fewer than MIN_TOPICS subtopics is reported as "too small to
 * judge" rather than being given a TVD it cannot support.
 *
 * Note: the bank is ~8.3 GB, so a full pass takes several minutes and needs
 * --max-old-space-size=8192 on some machines.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const QUESTIONS_DIR = path.join(ROOT, 'data', 'questions');
const ARGS = process.argv.slice(2);
const ONLY = argVal('--subject');
const AS_CSV = ARGS.indexOf('--csv') >= 0;
const TICK = /^[\u2713\u2714\u2705]\s*/;

function argVal(flag) {
  const i = ARGS.indexOf(flag);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : null;
}

// The `?` tick and any leading punctuation are noise for a letter test.
function letterOf(s) {
  const k = String(s).replace(TICK, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return k.charAt(0) || '#';
}

// Keys that are not subjects at all: single letters ("w", "m"), bare integers,
// and manifest field names ("generatedAt", "manifestFileCount"). These appear
// as the top-level key of files that hold no questions -- the build writes a
// manifest into the same directory. They are counted and reported separately
// rather than mixed into the per-subject report, because calling them
// "subjects" would overstate the blast radius.
const NOT_A_SUBJECT = /^(?:\d+|w|m|v|common|shards|files|total|subjects|generatedAt|fileCount|manifestFileCount|updatedAt)$/i;

// Below this many subtopics a letter distribution carries no signal, so the
// subject is reported but not scored. See KNOWN LIMITATIONS.
const MIN_TOPICS = 25;

// The TVD band that neither signal resolves. Inside it sit subjects that are
// demonstrably sweeps (Animal Husbandry & Dairy, 0.222) and subjects that are
// demonstrably topical, so no cutoff here is honest. Measured on this bank.
const TVD_LOW = 0.16;
const TVD_HIGH = 0.34;

// A subject spread across this many numbered shards is a sweep. All 22
// subjects with TVD < TVD_LOW have >= 9 files; the lowest-file-count sweep
// found by sampling holds just 1 file, so this is a strong signal, not a
// sufficient one. Used to prioritise, never to auto-delete.
const SHARD_SUSPECT = 3;

const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => /\.json$/i.test(f)).sort();

const bankHist = Object.create(null);
const perLabel = Object.create(null);
let bankTopics = 0;
let bankQuestions = 0;
let manifestKeys = 0;
const seenTopics = new Set();

let emptyFiles = 0;
for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf8')); }
  catch (e) { console.error('unparseable: ' + f + ' -- ' + e.message); continue; }
  let hadQuestions = false;
  for (const label of Object.keys(d)) {
    const ss = (d[label] && d[label].subSubjects) || {};
    const keys = Object.keys(ss);
    if (!keys.length) {
      // An empty block is a build manifest, not question data. Counted per FILE,
      // not per label: some manifests carry several keys (generatedAt, files,
      // total) and counting keys would overstate how many files are junk.
      if (NOT_A_SUBJECT.test(label)) manifestKeys++;
      continue;
    }
    hadQuestions = true;
    if (NOT_A_SUBJECT.test(label)) {
      // A non-subject name holding real questions would be a distinct and
      // worse problem. Flag it loudly rather than folding it into the report.
      console.error('WARNING: non-subject key "' + label + '" holds ' + keys.length +
        ' subtopics in ' + f);
    }
    if (!perLabel[label]) perLabel[label] = { hist: Object.create(null), topics: 0, questions: 0, files: 0, shards: 0, sample: [] };
    const P = perLabel[label];
    P.files++;
    if (/-\d+\.json$/i.test(f)) P.shards++;
    for (const t of keys) {
      const L = letterOf(t);
      bankHist[L] = (bankHist[L] || 0) + 1;
      P.hist[L] = (P.hist[L] || 0) + 1;
      P.topics++;
      bankTopics++;
      const q = (ss[t] || []).length;
      P.questions += q;
      bankQuestions += q;
      seenTopics.add(t);
    }
    // Keep a spread sample: evenly spaced across the file, not just the head,
    // so a topical head cannot make a sweep look clean.
    const stride = Math.max(1, Math.floor(keys.length / 5));
    for (let i = 0; i < keys.length; i += stride) {
      if (P.sample.length < 12) P.sample.push(keys[i]);
    }
  }
  if (!hadQuestions) emptyFiles++;
}

const bankTotal = Object.keys(bankHist).reduce((a, k) => a + bankHist[k], 0) || 1;

// Total-variation distance: 0 means "indistinguishable from the bank",
// 1 means "uses completely different letters from the bank".
function tvd(P) {
  let tv = 0;
  for (const L of Object.keys(bankHist)) {
    tv += Math.abs((P.hist[L] || 0) / P.topics - bankHist[L] / bankTotal);
  }
  return tv / 2;
}

const rows = Object.keys(perLabel).map((label) => {
  const P = perLabel[label];
  return {
    label, files: P.files, shards: P.shards,
    topics: P.topics, questions: P.questions,
    tvd: P.topics >= MIN_TOPICS ? tvd(P) : null,
    sample: P.sample
  };
}).sort((a, b) => b.topics - a.topics);

// TRIAGE, not a verdict. Two signals that each catch what the other misses.
const scorable = rows.filter((r) => r.tvd !== null);
const tooSmall = rows.filter((r) => r.tvd === null);

// A: sharded and low-TVD. Both signals agree, so this is the safe list.
const certain = scorable.filter((r) => r.shards >= SHARD_SUSPECT && r.tvd < TVD_LOW);
// B: sharded but TVD in the ambiguous band, OR low TVD in few files.
//    One signal fires and the other is silent. Real, but needs a human look.
const review = scorable.filter((r) => !certain.includes(r) &&
  (r.shards >= SHARD_SUSPECT || r.tvd < TVD_HIGH));
// C: neither signal fires. Mostly genuinely topical, but Mining & Minerals and
//    Indian Philosophy are single-file sweeps that land here, so it is "least
//    suspicious", not "clean".
const least = scorable.filter((r) => !certain.includes(r) && !review.includes(r));

const sum = (a, f) => a.reduce((x, r) => x + f(r), 0);
const topicPct = (n) => (100 * n / bankTopics).toFixed(1) + '%';

function table(list, n) {
  console.log('\n--- ' + n + ' (' + list.length + ' subjects, ' + sum(list, (r) => r.topics) +
    ' subtopics, ' + topicPct(sum(list, (r) => r.topics)) + ' of bank) ---\n');
  console.log('label'.padEnd(34) + 'files'.padStart(6) + 'subtopics'.padStart(10) +
    'questions'.padStart(11) + 'TVD'.padStart(8));
  list.slice(0, 30).forEach((r) => {
    console.log(r.label.slice(0, 33).padEnd(34) + String(r.files).padStart(6) +
      String(r.topics).padStart(10) + String(r.questions).padStart(11) +
      r.tvd.toFixed(3).padStart(8));
  });
  if (list.length > 30) console.log('  ... and ' + (list.length - 30) + ' more');
}

if (ONLY) {
  const r = rows.find((x) => x.label === ONLY);
  if (!r) { console.error('no such subject label: ' + ONLY); process.exit(2); }
  const hist = perLabel[r.label].hist;
  const top = Object.keys(hist).sort((a, b) => hist[b] - hist[a]).slice(0, 12);
  console.log('\n' + r.label);
  console.log('  files       : ' + r.files + '  (' + r.shards + ' numbered shards' +
    (r.files - r.shards ? ', ' + (r.files - r.shards) + ' base' : '') + ')');
  console.log('  subtopics   : ' + r.topics);
  console.log('  questions   : ' + r.questions);
  console.log('  TVD         : ' + (r.tvd === null
    ? 'not scored (fewer than ' + MIN_TOPICS + ' subtopics)'
    : r.tvd.toFixed(3) + '   (0 = looks like the bank, 1 = uses its own letters)'));
  console.log('  letter hist : ' + top.map((L) => "'" + L + "' " + hist[L]).join('  '));
  console.log('\n  sample subtopics (spread across the shard, not just the head):');
  r.sample.forEach((s) => console.log('    ' + s));
  console.log('\n  These names are the real verdict. A subject holding thousands of subtopics whose');
  console.log('  sample is American towns, sports teams and films is a sweep regardless of its TVD.');
  process.exit(0);
}

if (AS_CSV) {
  console.log('label,files,shards,topics,questions,tvd,triage');
  rows.forEach((r) => console.log([
    r.label, r.files, r.shards, r.topics, r.questions,
    r.tvd === null ? '' : r.tvd.toFixed(4),
    r.tvd === null ? 'too-small-to-score'
      : certain.includes(r) ? 'A-sharded-and-uniform'
      : review.includes(r) ? 'B-review-one-signal'
      : 'C-least-suspicious'
  ].map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(',')));
  process.exit(0);
}

console.log('=== QUESTION BANK AUDIT (read-only) ===\n');
console.log('files scanned          : ' + files.length);
console.log('  holding question data : ' + (files.length - emptyFiles));
console.log('  holding no questions  : ' + emptyFiles +
  (manifestKeys ? '  [' + manifestKeys + ' manifest keys: "w", "generatedAt", "total", ...]' : ''));
console.log('subject labels         : ' + rows.length);
console.log('subtopic slots         : ' + bankTopics);
console.log('distinct subtopic names: ' + seenTopics.size);
console.log('questions              : ' + bankQuestions);
console.log('distinct first letters : ' + Object.keys(bankHist).length);

const shardedRows = rows.filter((r) => r.shards >= SHARD_SUSPECT);
console.log('\n--- STRUCTURE ---');
console.log('  subjects in >= ' + SHARD_SUSPECT + ' numbered shards : ' + shardedRows.length +
  '  holding ' + sum(shardedRows, (r) => r.topics) + ' subtopics (' +
  topicPct(sum(shardedRows, (r) => r.topics)) + ')');
console.log('  subjects in <  ' + SHARD_SUSPECT + ' shards          : ' + (rows.length - shardedRows.length) +
  '  holding ' + (bankTopics - sum(shardedRows, (r) => r.topics)) + ' subtopics (' +
  topicPct(bankTopics - sum(shardedRows, (r) => r.topics)) + ')');

console.log('\n--- TRIAGE (read the sample names; the label is a priority, not a verdict) ---');
console.log('  A  sharded AND low TVD    : both signals agree, safe to act on');
console.log('  B  one signal fires       : real, but confirm by reading the names');
console.log('  C  neither fires          : least suspicious, NOT clean -- single-file sweeps exist here');
table(certain, 'A: SWEEP, both signals agree');
table(review, 'B: REVIEW, one signal fires');
table(least, 'C: LEAST SUSPICIOUS, still unverified');

if (tooSmall.length) {
  console.log('\n--- TOO SMALL TO SCORE (excluded) ---\n');
  console.log('  ' + tooSmall.length + ' subjects hold < ' + MIN_TOPICS + ' subtopics each, so their');
  console.log('  letter distribution cannot resemble a ' + Object.keys(bankHist).length + '-letter bank.');
  console.log('  Names: ' + tooSmall.slice(0, 14).map((r) => r.label).join(', ') +
    (tooSmall.length > 14 ? ', +' + (tooSmall.length - 14) + ' more' : ''));
}

console.log('\nInspect any subject before acting on it:');
console.log('  node scripts/audit-question-bank.js --subject "Environment & Ecology"');
console.log('  node scripts/audit-question-bank.js --csv > audit.csv');
console.log('\nLIMITATIONS: neither signal decides alone. Animal Husbandry & Dairy is a 22-file sweep');
console.log('that scores TVD 0.222; Mining & Minerals is a 1-file sweep scoring 0.223. High TVD is');
console.log('evidence of topicality, not proof. The `?` prefix is not a quality marker but the');
console.log('"moved-in sub-topic" tick from scripts/classify-subtopics.js, and those shards are equally');
console.log('contaminated. Typed vocabularies (data/wiki-*.json, 22,803 entities) can confirm a good');
console.log('topic but cover ~5% of slots, so they cannot measure how much is bad.');
console.log('\nThis measures damage. It does not repair it, and it cannot say where an off-subject topic');
console.log('belongs. Do not delete shards on the strength of a label here: repair needs a');
console.log('subject->topic mapping that does not exist in the repo yet.');

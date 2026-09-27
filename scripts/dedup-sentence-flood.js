const fs = require('fs');
const path = require('path');
const { iterQuizQuestions, createStreamingShardWriter } = require('./lib/quiz-store');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');

// Decode common HTML entities so "&amp;" matches "&", "&#160;" matches a space,
// and entity-flavoured questions dedup against plain versions of the same text.
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;/g, "'");
}

function baseText(q) {
  return decodeEntities(q.question).toLowerCase().replace(/_{5,}/g, '___').replace(/\s+/g, ' ').trim();
}

function norm(s) { return decodeEntities(s).toLowerCase().replace(/\s+/g, ' ').trim(); }

function tokens(s) {
  return norm(s).replace(/_{2,}/g, ' ').split(/\s+/).filter(Boolean);
}

// Token-level Levenshtein distance
function levDist(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

// Ensure every question in the list has a unique id (reuse the id of the first
// occurrence; append a numeric suffix to later collisions).
function repairIds(questions) {
  const used = new Set();
  let repaired = 0;
  for (const q of questions) {
    if (!q || !q.id) continue;
    if (!used.has(q.id)) { used.add(q.id); continue; }
    let n = 2;
    let next = q.id + '_' + n;
    while (used.has(next)) { n++; next = q.id + '_' + n; }
    q.id = next;
    used.add(next);
    repaired++;
  }
  return repaired;
}

// Remove "same sentence, different blank" near-duplicates: questions derived
// from the same fact (same subSubject + fact) whose wording differs only by the
// blanked tokens (e.g. "6 September _____" vs "6 _____ 2019" for the same fact).
function cleanNearDups(questions) {
  const groups = new Map();
  for (const q of questions) {
    const k = norm(q.subSubject) + '||' + norm(q.fact);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  }
  const removed = [];
  const kept = [];
  const addAll = (target, items) => { for (const item of items) target.push(item); };
  for (const list of groups.values()) {
    if (list.length < 2) { addAll(kept, list); continue; }
    const keptHere = [];
    for (const q of list) {
      const tq = tokens(q.question);
      let isNearDup = false;
      for (const kq of keptHere) {
        if (levDist(tq, tokens(kq.question)) <= 2) { isNearDup = true; break; }
      }
      if (isNearDup) {
        removed.push({ question: q.question, answer: q.answer, keptAnswer: keptHere[0].answer });
      } else {
        keptHere.push(q);
      }
    }
    addAll(kept, keptHere);
  }
  return { kept, removed };
}

function clean(questions, source) {
  const seen = new Map(); // baseText → first question
  const removed = [];
  const kept = [];
  for (const q of questions) {
    const key = baseText(q);
    if (seen.has(key)) {
      removed.push({ question: q.question, answer: q.answer, keptAnswer: seen.get(key).answer });
    } else {
      seen.set(key, q);
      kept.push(q);
    }
  }
  const near = cleanNearDups(kept);
  kept.length = 0;
  for (const kq of near.kept) kept.push(kq);
  for (const rq of near.removed) removed.push(rq);
  return { kept, removed };
}

// Regroup cleaned questions back into subject/subSubject and repair id collisions
// per subSubject (ids only need to be unique within a subSubject; reusing a
// numeric id across different subSubjects is harmless and pre-existing).
function regroup(data, kept, owner) {
  const out = {};
  for (const q of kept) {
    const [subject, ss] = owner.get(q);
    if (!out[subject]) out[subject] = { subSubjects: {} };
    if (!out[subject].subSubjects[ss]) out[subject].subSubjects[ss] = [];
    out[subject].subSubjects[ss].push(q);
  }
  let repaired = 0;
  for (const subject of Object.keys(data)) {
    if (!out[subject] || !out[subject].subSubjects) continue;
    for (const [ss, qs] of Object.entries(out[subject].subSubjects)) {
      repaired += repairIds(qs);
    }
  }
  return { out, repaired };
}

async function main() {
  let totalRemoved = 0;
  let totalKept = 0;

  // ── Clean quiz.json if it exists ──
  // The monolithic quiz is sharded across ~4 files totalling ~1GB+ (~6M question
  // objects) after a 27-chunk merge. `readQuiz()` reassembles ALL shards into one
  // in-memory array; combined with the `seen` Map and the near-dup groups map
  // this blew the 8GB heap and killed the merge job with a FATAL OOM (exit 134,
  // run #482 step:12). So the quiz pass streams shards one at a time via
  // iterQuizQuestions(), keeping only (a) a bounded Set of seen question-text
  // keys and (b) one shard's buffer in memory at once — the same pattern that
  // merge-chunks.js already runs successfully.
  //
  // The fuzzy Levenshtein near-dup pass is inherently "group every question by
  // subSubject+fact and compare within the group", which needs all questions
  // resident. That is NOT done here for the giant quiz anymore: after this step
  // the quiz is split into per-category files (split-quiz-to-categories.js) and
  // each file's fuzzy near-dup removal runs in the per-file loop below, where a
  // single file (~8MiB) is trivially in-memory. Cross-file fuzz dedup is lost,
  // but same-article same-sentence near-dups (the flood this targets) land in
  // the same category file after split, so they are still caught.
  if (fs.existsSync(QUIZ_PATH)) {
    const seen = new Set();
    let kept = 0;
    let removed = 0;
    let readErr = null;
    const TMP = QUIZ_PATH + '.dedup-tmp';
    try { for (let i = 0; i < 1000; i++) { try { require('fs').unlinkSync(TMP + '.part.' + i); } catch (e) { break; } } } catch (e) {}
    try { require('fs').unlinkSync(TMP); } catch (e) {}
    const writer = createStreamingShardWriter(TMP);
    try {
      iterQuizQuestions(QUIZ_PATH, (q) => {
        const key = baseText(q);
        if (seen.has(key)) { removed++; return; }
        seen.add(key);
        writer.add(q);
        kept++;
      });
    } catch (e) {
      readErr = e;
      console.error(`Warning: Could not parse quiz.json (${e.message}). Skipping.`);
    }
    const res = writer.finish();
    if (readErr) {
      // Leave the partial temp writer output for cleanup below and move on.
      try { require('fs').unlinkSync(TMP); for (let i = 0; i < 1000; i++) { try { require('fs').unlinkSync(TMP + '.part.' + i); } catch (e) { break; } } } catch (e) {}
    } else if (res.shards) {
      for (let i = 0; i < 1000; i++) {
        const sp = QUIZ_PATH + '.part.' + i;
        try { require('fs').unlinkSync(sp); } catch (e) { break; }
      }
      for (let i = 0; i < res.shards; i++) {
        require('fs').renameSync(TMP + '.part.' + i, QUIZ_PATH + '.part.' + i);
      }
      require('fs').renameSync(TMP, QUIZ_PATH);
    }
    seen.clear();
    totalRemoved += removed;
    totalKept += kept;
    console.log(`quiz.json: removed ${removed} duplicate questions, kept ${kept}`);
  }

  // Clean data/questions/*.json
  if (fs.existsSync(QUESTIONS_DIR)) {
    const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'archive-cat-index.json');
    for (const f of files) {
      const fp = path.join(QUESTIONS_DIR, f);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
      } catch (e) {
        console.error(`Warning: Could not parse ${f} (${e.message}). Skipping.`);
        continue;
      }
      // Flatten every subSubject in the file so dedup is FILE-WIDE: duplicate
      // question text is removed even when it appears under different
      // subSubjects (e.g. a case listed in both "Legal & Constitutional" and
      // "SC Landmark Judgments").
      const flat = [];
      const owner = new Map(); // question -> [subject, subSubject]
      for (const [subject, subjData] of Object.entries(data)) {
        if (!subjData.subSubjects) continue;
        for (const [ss, qs] of Object.entries(subjData.subSubjects)) {
          for (const q of qs) { flat.push(q); owner.set(q, [subject, ss]); }
        }
      }
      const { kept, removed } = clean(flat, f);
      const fileKept = kept.length, fileRemoved = removed.length;
      // Regroup deduped questions back into their original subject/subSubject
      // and repair id collisions within each subSubject.
      const { out, repaired } = regroup(data, kept, owner);
      if (fileRemoved > 0 || repaired > 0) {
        fs.writeFileSync(fp, JSON.stringify(out));
        console.log(`${f}: removed ${fileRemoved} duplicate questions, repaired ${repaired} id collisions, kept ${fileKept}`);
        totalRemoved += fileRemoved;
        totalKept += fileKept;
      }
    }
  }

  console.log(`\nTotal: removed ${totalRemoved} questions, kept ${totalKept}`);
}

main().catch(e => { console.error(e); process.exit(1); });

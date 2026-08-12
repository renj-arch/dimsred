// Sharded persistence for the monolithic quiz.json (and per-chunk variants).
//
// V8 caps a single JS string at ~2^29-24 chars (~536MB). The wiki corpus has
// grown past that, so a single JSON.stringify({questions:[...]}) now throws
// "RangeError: Invalid string length". This module transparently splits the
// questions array across multiple "part" files while keeping the primary file
// valid JSON, so all existing consumers keep working through readQuiz/writeQuiz.
//
// Layout for a path P that is too big to serialize as one string:
//   P            → { ...other top-level fields, questions: [], shardCount: N }
//   P.part.0     → { questions: [ ... ] }
//   P.part.1     → { questions: [ ... ] }
//   ...          → P.part.(N-1)
//
// When the content fits, P is written normally (no shards, no shardCount).

const fs = require('fs');

// Keep each shard comfortably under V8's ~536MB string ceiling, leaving room
// for the object wrappers and heap while parsing.
const MAX_SHARD_BYTES = 300 * 1024 * 1024;

function shardPaths(p) {
  const paths = [];
  let i = 0;
  while (true) {
    const sp = p + '.part.' + i;
    if (fs.existsSync(sp)) { paths.push(sp); i++; }
    else break;
  }
  return paths;
}

// Read the full quiz object, reassembling sharded questions arrays.
function readQuiz(p) {
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (obj.shardCount) {
    const all = [];
    for (let i = 0; i < obj.shardCount; i++) {
      const s = JSON.parse(fs.readFileSync(p + '.part.' + i, 'utf8'));
      const qs = s.questions || [];
      for (let j = 0; j < qs.length; j++) all.push(qs[j]);
    }
    delete obj.shardCount;
    obj.questions = all;
  }
  return obj;
}

// Read only the questions array (empty array if the file is missing).
function readQuizQuestions(p) {
  if (!fs.existsSync(p)) return [];
  return readQuiz(p).questions || [];
}

// Split the questions array into chunks whose serialized size stays under the
// per-shard budget. Never stringifies the whole array at once.
function splitQuestions(questions) {
  const HEADER = Buffer.byteLength('{"questions":[]}');
  const shards = [];
  let cur = [];
  let curLen = HEADER;
  for (const q of questions) {
    const qLen = Buffer.byteLength(JSON.stringify(q));
    if (cur.length && curLen + qLen + 1 > MAX_SHARD_BYTES) {
      shards.push(cur);
      cur = [];
      curLen = HEADER;
    }
    cur.push(q);
    curLen += qLen + 1; // +1 for the comma separator
  }
  if (cur.length) shards.push(cur);
  return shards;
}

function removeShards(p) {
  for (const sp of shardPaths(p)) fs.unlinkSync(sp);
}

// Write the full quiz object, sharding the questions array if needed.
function writeQuiz(p, obj) {
  const questions = obj.questions || [];
  const shards = splitQuestions(questions);
  if (shards.length <= 1) {
    removeShards(p);
    const body = JSON.stringify(obj);
    fs.writeFileSync(p, body);
    return { shards: 1 };
  }
  const rest = {};
  for (const k of Object.keys(obj)) {
    if (k !== 'questions') rest[k] = obj[k];
  }
  const primary = Object.assign({}, rest, { questions: [], shardCount: shards.length });
  fs.writeFileSync(p, JSON.stringify(primary));
  shards.forEach((sh, i) => {
    fs.writeFileSync(p + '.part.' + i, JSON.stringify({ questions: sh }));
  });
  return { shards: shards.length };
}

// Write only the questions array.
function writeQuizQuestions(p, questions) {
  return writeQuiz(p, { questions });
}

module.exports = { readQuiz, readQuizQuestions, writeQuiz, writeQuizQuestions, splitQuestions, MAX_SHARD_BYTES };

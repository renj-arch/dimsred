// The full-paper lane lost a whole English section to one malformed JSON
// array (2026-11-07 run 42359163841: "Expected ',' or '}' after property
// value ... position 207"). These cases pin the repair path so a raw newline,
// a trailing comma or a truncated final object no longer throws away every
// usable question in the batch.
const assert = require('assert');
const llm = require('./ollama');

// Raw newline inside a JSON string.
let arr = llm.extractArray('[{"text":"line one\nline two","correct":0}]');
assert.strictEqual(arr.length, 1);
assert.strictEqual(arr[0].text, 'line one\nline two');

// Trailing comma before the closing bracket.
arr = llm.extractArray('[{"text":"a","correct":0},{"text":"b","correct":1},]');
assert.strictEqual(arr.length, 2);

// Truncated output: the last object is never closed.
arr = llm.extractArray('[{"text":"complete","correct":0},{"text":"cut off","correct":');
assert.strictEqual(arr.length, 1);
assert.strictEqual(arr[0].text, 'complete');

// Truncated array with no closing bracket at all.
arr = llm.extractArray('[{"text":"one","correct":0}');
assert.strictEqual(arr.length, 1);

// A clean array is untouched.
arr = llm.extractArray('```json\n[{"text":"x","correct":2}]\n```');
assert.strictEqual(arr.length, 1);
assert.strictEqual(arr[0].correct, 2);

console.log('PASS  ollama JSON repair: newlines, trailing commas and truncation salvaged');

// Transport guards. The 27B CPU lane died at the old fixed 55-minute cap
// (run 43457466546) even though its own workflow documents 60-120 min per
// lesson, so the guards must be readable from the lane's environment.
assert.deepStrictEqual(
  llm.transportGuards(),
  { hardCapMin: 55, firstByteMin: 25, idleMin: 12, curlMaxTime: '5400' },
  'defaults unchanged'
);

const prev = { cap: process.env.OLLAMA_HARD_CAP_MIN, idle: process.env.OLLAMA_IDLE_MIN };
process.env.OLLAMA_HARD_CAP_MIN = '150';
process.env.OLLAMA_IDLE_MIN = '30';
delete require.cache[require.resolve('./ollama')];
const llm2 = require('./ollama');
assert.strictEqual(llm2.transportGuards().hardCapMin, 150, 'hard cap overridden per lane');
assert.strictEqual(llm2.transportGuards().idleMin, 30, 'idle guard overridden per lane');
// curl must outlast the guard, otherwise a slow stream dies as "curl exit 28".
assert.strictEqual(llm2.transportGuards().curlMaxTime, String((150 + 5) * 60), 'curl max-time follows the cap');
// A junk value must not disable the guards.
process.env.OLLAMA_HARD_CAP_MIN = 'abc';
delete require.cache[require.resolve('./ollama')];
assert.strictEqual(require('./ollama').transportGuards().hardCapMin, 55, 'non-numeric cap falls back to default');
if (prev.cap === undefined) delete process.env.OLLAMA_HARD_CAP_MIN; else process.env.OLLAMA_HARD_CAP_MIN = prev.cap;
if (prev.idle === undefined) delete process.env.OLLAMA_IDLE_MIN; else process.env.OLLAMA_IDLE_MIN = prev.idle;
delete require.cache[require.resolve('./ollama')];

console.log('PASS  ollama transport guards: default 55/25/12, overridable per lane, junk rejected');

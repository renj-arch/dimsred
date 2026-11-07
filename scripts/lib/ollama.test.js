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

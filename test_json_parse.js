const fs = require('fs');

// Test JSON parsing with various escaping patterns
const tests = [
  '{"key": "value\\\\" end"}',     // \\" in JSON
  '{"key": "value\\\\\\" end"}',   // \\\" in JSON
  '{"key": "value\\\\\\\\" end"}', // \\\\" in JSON
];

for (const test of tests) {
  try {
    const result = JSON.parse(test);
    console.log('OK: ' + result.key);
  } catch (e) {
    console.log('FAIL: ' + test);
    console.log('  Error: ' + e.message);
  }
}

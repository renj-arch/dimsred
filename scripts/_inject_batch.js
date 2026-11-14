// Generic batch injector for course content.
// Usage: node scripts/_inject_batch.js <batch.json>
// Batch format:
// {
//   "opt-xxx/overview": {
//     "html": "<h3>...</h3>...",
//     "qs": [
//       { "text": "...", "options": ["a","b","c","d"], "correct": 0, "sol": "..." }
//     ]
//   }
// }
const fs = require('fs');
const path = require('path');

const batchPath = process.argv[2];
if (!batchPath) {
  console.error('Usage: node scripts/_inject_batch.js <batch.json>');
  process.exit(1);
}

const batch = batchPath.endsWith('.js')
  ? require(path.resolve(batchPath))
  : JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const DATA = path.join(__dirname, 'course-data.json');
const PRACTICE = path.join(__dirname, 'course-practice.json');

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const practice = JSON.parse(fs.readFileSync(PRACTICE, 'utf8'));

let idBase = 5001;
const keys = Object.keys(batch);
keys.forEach((key) => {
  const entry = batch[key];
  if (!entry.html || !Array.isArray(entry.qs) || entry.qs.length === 0) {
    throw new Error('Bad entry for ' + key + ': needs html and qs[]');
  }
  data[key] = entry.html;
  practice[key] = entry.qs.map((q, i) => ({
    id: idBase + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  idBase += 10;
  console.log('Injected ' + key + ' (' + entry.qs.length + ' MCQs)');
});

fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
console.log('Done: ' + keys.length + ' lessons injected.');

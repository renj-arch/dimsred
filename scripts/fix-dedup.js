const fs = require('fs');
const path = require('path');

const practicePath = path.join(__dirname, 'course-practice.json');
const data = JSON.parse(fs.readFileSync(practicePath, 'utf-8'));

const keys = Object.keys(data);
let maxId = 0;
let totalBefore = 0;
let totalAfter = 0;

keys.forEach(key => {
  const qs = data[key];
  totalBefore += qs.length;
  const seen = new Set();
  const unique = [];
  qs.forEach(q => {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      unique.push(q);
    }
    if (q.id > maxId) maxId = q.id;
  });
  data[key] = unique;
  totalAfter += unique.length;
  if (unique.length !== qs.length) {
    console.log(key + ': ' + qs.length + ' -> ' + unique.length + ' (removed ' + (qs.length - unique.length) + ' dupes)');
  }
});

fs.writeFileSync(practicePath, JSON.stringify(data, null, 2), 'utf-8');
console.log('\nTotal: ' + totalBefore + ' -> ' + totalAfter + ' unique questions');
console.log('Max ID: ' + maxId);

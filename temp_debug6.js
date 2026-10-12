const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

// Find all ' characters in the chunk around position 20000
let count = 0;
for (let i = 19980; i < Math.min(chunk.length, 21000); i++) {
  if (chunk[i] === "'") {
    const prev = i > 0 ? chunk[i-1] : '';
    const ctx = chunk.substring(Math.max(0, i-20), i+20).replace(/\n/g, '\\n');
    console.log(`' at ${i}, prev='${prev}', context: ...${ctx}...`);
    count++;
    if (count > 20) break;
  }
}

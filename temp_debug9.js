const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

let depth = 1, endIdx = 0;
let inSQ = false, inDQ = false, inBT = false;
let sqOpens = 0, sqCloses = 0;

for (let i = 0; i < 100000; i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') inBT = false;
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') inDQ = false;
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { 
      const nc = chunk[i+1];
      if (nc === "'" || nc === '\\') { i++; continue; }
      i++; continue;
    }
    if (c === "'") {
      inSQ = false;
      sqCloses++;
    }
  } else {
    if (c === "'") { 
      inSQ = true; 
      sqOpens++;
    }
    else if (c === '"') { inDQ = true; }
    else if (c === '`') { inBT = true; }
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('sqOpens:', sqOpens, 'sqCloses:', sqCloses);
console.log('depth:', depth, 'endIdx:', endIdx);
if (sqOpens !== sqCloses) {
  console.log('MISMATCH!');
}

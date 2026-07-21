const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 80000);

let inSQ = false, inDQ = false, inBT = false;
let depth = 1;

for (let i = 67020; i <= 67060; i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') inBT = false;
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') inDQ = false;
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === "'") inSQ = false;
  } else {
    if (c === "'") inSQ = true;
    else if (c === '"') inDQ = true;
    else if (c === '`') inBT = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; }
  }
  const ctx = JSON.stringify(chunk.slice(Math.max(0,i-15), i+15));
  console.log(`${i}: c=${JSON.stringify(c)} dq=${inDQ} sq=${inSQ} bt=${inBT} depth=${depth} ctx=${ctx}`);
}

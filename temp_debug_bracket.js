const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
console.log('startIdx:', startIdx);

const afterOpen = html.indexOf('[', startIdx) + 1;
console.log('afterOpen:', afterOpen);

const chunk = html.slice(afterOpen, afterOpen + 500);

let depth = 1, endIdx = 0;
let inSQ = false, inDQ = false, inBT = false;
for (let i = 0; i < chunk.length; i++) {
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
    else if (c === '[') { depth++; console.log(`[ at ${i}, depth=${depth}`); }
    else if (c === ']') { depth--; console.log(`] at ${i}, depth=${depth}`); if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('endIdx:', endIdx);
console.log('chunk length:', chunk.length);
if (endIdx > 0) {
  const content = chunk.slice(0, endIdx);
  const lines = content.split('\n').filter(l => l.trim().startsWith('{n:'));
  console.log('Found', lines.length, 'existing entries');
  console.log('First:', lines[0]?.substring(0, 100));
  console.log('Last:', lines[lines.length-1]?.substring(0, 100));
}

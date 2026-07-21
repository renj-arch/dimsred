const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

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
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('endIdx:', endIdx);
if (endIdx > 0) {
  const content = chunk.slice(0, endIdx);
  const lines = content.split('\n').filter(l => l.trim().startsWith('{n:'));
  console.log('Found', lines.length, 'existing entries');
} else {
  console.log('Array end not found!');
  console.log('Final depth:', depth);
  // Show the last 200 chars to see what's happening
  console.log('Last 200 chars:', chunk.slice(chunk.length - 200));
}

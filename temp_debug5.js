const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

// Count total brackets
let totalBrackets = 0;
for (let i = 0; i < chunk.length; i++) {
  if (chunk[i] === '[' || chunk[i] === ']') totalBrackets++;
}
console.log('Total [ or ] in chunk:', totalBrackets);

// FIXED logic with debug
let depth2 = 1, endIdx2 = 0;
let inSQ = false, inDQ = false, inBT = false;
let skippedBrackets = 0;
let bracketCount = 0;
for (let i = 0; i < Math.min(chunk.length, 70000); i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') inBT = false;
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') inDQ = false;
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === "'") {
      inSQ = false;
    }
  } else {
    if (c === "'") inSQ = true;
    else if (c === '"') inDQ = true;
    else if (c === '`') inBT = true;
    else if (c === '[') { depth2++; bracketCount++; }
    else if (c === ']') { depth2--; bracketCount++; if (depth2 === 0) { endIdx2 = i; break; } }
  }
  if (i % 10000 === 0) {
    console.log(`i=${i}, inSQ=${inSQ}, inDQ=${inDQ}, inBT=${inBT}, depth=${depth2}, brackets=${bracketCount}`);
  }
}
console.log(`Final: depth=${depth2}, endIdx=${endIdx2}, brackets=${bracketCount}`);

const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

// ORIGINAL logic
let depth1 = 1, endIdx1 = 0;
for (let i = 0; i < chunk.length; i++) {
  if (chunk[i] === '[') depth1++;
  else if (chunk[i] === ']') { depth1--; if (depth1 === 0) { endIdx1 = i; break; } }
}
console.log('ORIGINAL: endIdx=' + endIdx1 + ', depth=' + depth1);

// FIXED logic
let depth2 = 1, endIdx2 = 0;
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
    else if (c === '[') depth2++;
    else if (c === ']') { depth2--; if (depth2 === 0) { endIdx2 = i; break; } }
  }
}
console.log('FIXED: endIdx=' + endIdx2 + ', depth=' + depth2);

// Show where the issue might be - find brackets in the chunk
if (endIdx1 !== endIdx2) {
  console.log('DIFFERENT results!');
  // Find the first bracket that might cause issues
  for (let i = 0; i < Math.min(chunk.length, 5000); i++) {
    if (chunk[i] === '[' || chunk[i] === ']') {
      const ctx = chunk.substring(Math.max(0, i-30), i+30);
      console.log(`Position ${i}: '${chunk[i]}' context: ...${ctx.replace(/\n/g, '\\n')}...`);
    }
  }
}

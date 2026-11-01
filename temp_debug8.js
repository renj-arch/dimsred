const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

// Use the EXACT same logic from the fill script
let depth = 1, endIdx = 0;
let inSQ = false, inDQ = false, inBT = false;

// Track when the string opens
let sqOpenPos = -1;

for (let i = 0; i < 25000; i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') { inBT = false; console.log('BT close at', i); }
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') { inDQ = false; }
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { 
      i++; // skip escaped char
      continue; 
    }
    if (c === "'") {
      inSQ = false;
      // console.log('SQ close at', i, 'context:', chunk.substring(Math.max(0,i-10), i+10).replace(/\n/g,'\\n'));
    }
  } else {
    if (c === "'") { 
      inSQ = true; 
      sqOpenPos = i;
      console.log('SQ open at', i, 'context:', chunk.substring(Math.max(0,i-30), i+50).replace(/\n/g,'\\n'));
    }
    else if (c === '"') { inDQ = true; }
    else if (c === '`') { inBT = true; }
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('\nFinal: inSQ=' + inSQ + ', sqOpenPos=' + sqOpenPos + ', depth=' + depth + ', endIdx=' + endIdx);
console.log('Context at sqOpenPos:');
if (sqOpenPos >= 0) {
  console.log(chunk.substring(Math.max(0, sqOpenPos-50), Math.min(chunk.length, sqOpenPos+100)).replace(/\n/g, '\\n'));
}

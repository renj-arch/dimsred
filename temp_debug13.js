const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

// Find the physiographic array
const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;

// Find the closing ]; of the physiographic array (line 11586)
const closeMatch = html.indexOf('];', afterOpen);
// But the FIRST ]; after afterOpen might be the one at line 11586
// Let's check: find all ]; after afterOpen within a reasonable range

// The actual close should be at ],\n]; pattern
// Search for the specific pattern
for (let i = afterOpen; i < afterOpen + 300000; i++) {
  if (html[i] === ']' && html[i+1] === ';') {
    console.log('First ]; after afterOpen at position', i, 'line', html.slice(0,i).split('\n').length);
    console.log('Context:', JSON.stringify(html.slice(i-20, i+20)));
    break;
  }
}

// Now find the actual last entry position before ];
// Look for },\n  ];
const lastEntry = html.indexOf('},\n];', afterOpen);
console.log('Last entry pattern "},\\n];" at position', lastEntry, 'line', html.slice(0,lastEntry).split('\n').length);

// Now let's scan the chunk with string-aware bracket counting with a LARGER range
const chunk = html.slice(afterOpen, afterOpen + 300000);
console.log('Chunk length:', chunk.length);

let inSQ = false, inDQ = false, inBT = false;
let depth = 1, endIdx = -1;
const maxSQ = chunk.length;

for (let i = 0; i < maxSQ; i++) {
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
    if (c === "'") { inSQ = true; }
    else if (c === '"') { inDQ = true; }
    else if (c === '`') { inBT = true; }
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('String-aware result: depth=', depth, 'endIdx=', endIdx);
console.log('endIdx line:', html.slice(0, afterOpen + endIdx).split('\n').length);
console.log('inSQ at end:', inSQ, 'inDQ:', inDQ, 'inBT:', inBT);

// Also do the ORIGINAL bracket counting for comparison
depth = 1; let origEndIdx = -1;
for (let i = 0; i < maxSQ; i++) {
  if (chunk[i] === '[') depth++;
  if (chunk[i] === ']') { depth--; if (depth === 0) { origEndIdx = i; break; } }
}
console.log('Original result: depth=', depth, 'endIdx=', origEndIdx);
console.log('Original endIdx line:', html.slice(0, afterOpen + origEndIdx).split('\n').length);

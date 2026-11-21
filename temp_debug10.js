const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 80000);

let inSQ = false, inDQ = false, inBT = false;
const openPositions = [];
let closeCount = 0;

for (let i = 0; i < chunk.length; i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') inBT = false;
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') inDQ = false;
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { 
      i++; continue;
    }
    if (c === "'") {
      inSQ = false;
      closeCount++;
    }
  } else {
    if (c === "'") {
      inSQ = true;
      openPositions.push(i);
    }
    else if (c === '"') { inDQ = true; }
    else if (c === '`') { inBT = true; }
  }
}

console.log('Open count:', openPositions.length, 'Close count:', closeCount);
console.log('Last open position:', openPositions[openPositions.length - 1]);
console.log('Last 10 open positions:', openPositions.slice(-10));
console.log('Remaining open:', openPositions.length - closeCount);

if (openPositions.length > closeCount) {
  // The unmatched one is the last one that hasn't been closed
  // Let's trace through until we find which one doesn't get closed
  inSQ = false;
  const unmatched = [];
  for (let i = 0; i < chunk.length; i++) {
    const c = chunk[i];
    if (inBT) {
      if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
      if (c === '`') inBT = false;
    } else if (inDQ) {
      if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
      if (c === '"') inDQ = false;
    } else if (inSQ) {
      if (c === '\\' && i + 1 < chunk.length) { 
        i++; continue;
      }
      if (c === "'") {
        inSQ = false;
        unmatched.pop(); // pair it
      }
    } else {
      if (c === "'") {
        inSQ = true;
        unmatched.push(i);
      }
      else if (c === '"') { inDQ = true; }
      else if (c === '`') { inBT = true; }
    }
  }
  console.log('Unmatched opens:', unmatched.length, unmatched);
  if (unmatched.length > 0) {
    const idx = unmatched[0];
    console.log('Unmatched at', idx, 'context:', JSON.stringify(chunk.slice(Math.max(0,idx-30), idx+30)));
  }
}

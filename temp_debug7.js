const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);

let depth = 1, endIdx = 0;
let inSQ = false, inDQ = false, inBT = false;
let lastSQClose = -1;

for (let i = 0; i < 25000; i++) {
  const c = chunk[i];
  if (inBT) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '`') { inBT = false; }
  } else if (inDQ) {
    if (c === '\\' && i + 1 < chunk.length) { i++; continue; }
    if (c === '"') { inDQ = false; }
  } else if (inSQ) {
    if (c === '\\' && i + 1 < chunk.length) { 
      const nextC = chunk[i+1];
      if (nextC === "'") {
        // escaped quote inside string - correct
        i++;
        continue;
      }
      // other escape sequences
      i++;
      continue;
    }
    if (c === "'") {
      // Check if this is really a closer
      // Only close if not an apostrophe-like pattern
      const prev = i > 0 ? chunk[i-1] : '';
      const nextChar = i + 1 < chunk.length ? chunk[i+1] : '';
      // A ' that closes a string is typically followed by , } ] ) or : for next key
      if (/[,}\]:;]/.test(nextChar) || nextChar === '') {
        inSQ = false;
        lastSQClose = i;
      }
      // If it looks like an apostrophe, don't close
      // Just continue (stay in string)
    }
  } else {
    if (c === "'") { 
      inSQ = true;
      continue;
    }
    else if (c === '"') { inDQ = true; continue; }
    else if (c === '`') { inBT = true; continue; }
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
}

console.log('inSQ:', inSQ, 'lastSQClose:', lastSQClose);
console.log('depth:', depth, 'endIdx:', endIdx);

// Find where the string state goes wrong
// Let me find all ' in the chunk and their context
let inSQ2 = false;
for (let i = 0; i < 25000; i++) {
  const c = chunk[i];
  if (inSQ2) {
    if (c === '\\' && i + 1 < chunk.length && chunk[i+1] === "'") {
      i++;
      continue;
    }
    if (c === "'") {
      const nextChar = i + 1 < chunk.length ? chunk[i+1] : '';
      if (/[,}\]:;]/.test(nextChar) || nextChar === '') {
        inSQ2 = false;
      }
      // otherwise it's an apostrophe, stay in string
    }
  } else {
    if (c === "'") {
      inSQ2 = true;
    }
  }
}
console.log('Alternative tracking inSQ2:', inSQ2);

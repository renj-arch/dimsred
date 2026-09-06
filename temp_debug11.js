const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 81000);

let inSQ = false, inDQ = false, inBT = false;
let depth = 1;
const states = [];

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
    }
  } else {
    if (c === "'") { inSQ = true; }
    else if (c === '"') { inDQ = true; }
    else if (c === '`') { inBT = true; }
    else if (c === '[') depth++;
    else if (c === ']') { depth--; }
  }
  if (i >= 79700 && i <= 80020) {
    states.push({i, c: chunk[i], inSQ, depth});
  }
}

states.forEach(s => {
  const ctx = JSON.stringify(chunk.slice(Math.max(0,s.i-10), s.i+10));
  console.log(`${s.i}: char=${JSON.stringify(s.c)} inSQ=${s.inSQ} depth=${s.depth} ctx=${ctx}`);
});

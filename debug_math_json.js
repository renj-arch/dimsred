const fs = require('fs');
const t = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json', 'utf8');

// Find problematic areas - positions where a " would break the string
let inStr = false;
let escape = false;
let strStart = -1;

for (let i = 0; i < t.length; i++) {
  const ch = t[i];
  
  if (escape) {
    escape = false;
    continue;
  }
  
  if (ch === '\\' && inStr) {
    escape = true;
    continue;
  }
  
  if (ch === '"') {
    if (!inStr) {
      inStr = true;
      strStart = i;
    } else {
      inStr = false;
    }
  }
}

// Now let's try to parse and catch specific issues
try {
  JSON.parse(t);
  console.log('JSON is valid!');
} catch (e) {
  const pos = parseInt(e.message.match(/position (\d+)/)[1]);
  console.log('Error at position ' + pos);
  console.log('Context:');
  const start = Math.max(0, pos - 60);
  const end = Math.min(t.length, pos + 60);
  const ctx = t.slice(start, end);
  // Show each character
  for (let i = 0; i < ctx.length; i++) {
    const p = start + i;
    const ch = ctx[i];
    const code = ch.charCodeAt(0);
    if (code > 127 || ch === '"' || ch === '\\') {
      process.stderr.write('[' + p + ':' + ch + '/U+' + code.toString(16) + ']');
    }
  }
  process.stderr.write('\nRaw:\n' + ctx + '\n');
}

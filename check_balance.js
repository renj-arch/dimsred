const fs = require('fs');
const t = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.js.new', 'utf8');
let depth = 0;
let inStr = false;
let escape = false;
let minDepth = 0;
let pos = 0;
for (let i = 0; i < t.length; i++) {
  const ch = t[i];
  if (escape) { escape = false; continue; }
  if (ch === '\\' && inStr) { escape = true; continue; }
  if (ch === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (ch === '{' || ch === '[') { depth++; }
  if (ch === '}' || ch === ']') { depth--; }
  if (depth < minDepth) { minDepth = depth; pos = i; }
}
console.log('Final depth: ' + depth + ' (should be 0)');
console.log('Min depth: ' + minDepth + ' at position ' + pos);
if (pos > 0) {
  console.log('Context at min: ...' + t.slice(Math.max(0,pos-30), pos+30) + '...');
}

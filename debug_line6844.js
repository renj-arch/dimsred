const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js','utf8');
const lines = c.split('\n');
const l = lines[6843]; // 0-indexed
console.log('Line 6844 length:', l.length);
// Find the first weird pattern
const srIdx = l.indexOf('sets_relations');
if (srIdx >= 0) {
  const s = l.substring(srIdx, srIdx + 400);
  console.log(s);
  console.log('---');
  // Check for A\'
  const aIdx = s.indexOf("A\\'");
  if (aIdx >= 0) {
    console.log('Found A\\' at', aIdx);
    console.log('Context:', s.substring(Math.max(0,aIdx-10), aIdx+20));
  }
}

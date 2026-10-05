const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
const l = fs.readFileSync(file, 'utf8');
const lines = l.split('\n');
let count1 = 0, count2 = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("→ ' + ('' + ")) count1++;
  if (lines[i].includes("') + ' = ' + (")) count2++;
}
console.log("Has → ' + ('' + : " + count1);
console.log("Has ') + ' = ' + ( : " + count2);
if (count1 > 0) {
  const sample = lines.find(l => l.includes("→ ' + ('' + "));
  console.log('Sample:');
  console.log(sample.substring(0, 500));
  const eqIdx = sample.indexOf("') + ' = ' + (");
  console.log('Eq index:', eqIdx);
  if (eqIdx >= 0) {
    console.log('Context:', sample.substring(eqIdx - 20, eqIdx + 30));
  }
}
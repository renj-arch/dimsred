const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const idx = content.indexOf('GENERATORS.math.continuity');
const end = content.indexOf('];', idx);
const line = content.substring(idx, end + 2);

// Find f'(0)
const fpos = line.indexOf("f'(0)");
if (fpos >= 0) {
  console.log('Found f\'(0) at pos ' + fpos);
  console.log('Context: ' + JSON.stringify(line.substring(Math.max(0,fpos-30), Math.min(line.length, fpos+30))));
}
// Find f\'(0)
const fEscPos = line.indexOf("f\\'");
if (fEscPos >= 0) {
  console.log('Found f\\\' at pos ' + fEscPos);
  console.log('Context: ' + JSON.stringify(line.substring(Math.max(0,fEscPos-30), Math.min(line.length, fEscPos+30))));
}

// List each ' and what precedes it
for (let i = 0; i < line.length; i++) {
  if (line[i] === "'") {
    const prev = i > 0 ? line[i-1] : 'START';
    const context = JSON.stringify(line.substring(Math.max(0,i-15), Math.min(line.length, i+15)));
    console.log('pos=' + i + ' prev=' + JSON.stringify(prev) + ' ctx=' + context);
  }
}

// Check the very last part of line
console.log('\nLast 100 chars: ' + JSON.stringify(line.slice(-100)));

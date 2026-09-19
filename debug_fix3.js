const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// Run the fix algorithm and check if it actually changes lines
const lines = text.split('\n');
const before = lines[122];
console.log('Before:');
console.log(before.substring(0, 300));
console.log('---');

const arrowIdx = before.indexOf("→ ' + ('' + ");
console.log('arrowIdx:', arrowIdx);

if (arrowIdx >= 0) {
  const rest = before.substring(arrowIdx);
  const eqStart = rest.indexOf("') + ' = ' + (");
  console.log('eqStart:', eqStart);
  
  if (eqStart >= 0) {
    const valueStart = eqStart + "') + ' = ' + (".length;
    let depth = 1;
    let closeIdx = -1;
    for (let j = valueStart; j < rest.length; j++) {
      if (rest[j] === '(') depth++;
      if (rest[j] === ')') { depth--; if (depth === 0) { closeIdx = j; break; } }
    }
    console.log('closeIdx:', closeIdx);
    const computedValue = rest.substring(valueStart, closeIdx);
    console.log('Computed value:', computedValue);
    
    let afterLastClose = '';
    for (let j = closeIdx + 1; j < rest.length; j++) {
      if (rest[j] === "'") { afterLastClose = rest.substring(j + 1); break; }
    }
    console.log('After last close:', JSON.stringify(afterLastClose));
    
    const line2 = before.substring(0, arrowIdx) + '→ ' + computedValue + afterLastClose;
    console.log('Result:');
    console.log(line2.substring(0, 300));
    
    // Check if it's valid
    lines[0] = line2;
    const newText = lines.join('\n');
    fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\test_fix_out.js', newText, 'utf8');
    console.log('Written to test file');
  }
}
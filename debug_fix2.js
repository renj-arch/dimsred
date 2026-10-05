const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
const l = fs.readFileSync(file, 'utf8').split('\n');
const ln = l[122];
console.log('Line 123 length:', ln.length);

const arrowIdx = ln.indexOf("→ ' + ('' + ");
console.log('arrowIdx:', arrowIdx);

if (arrowIdx >= 0) {
  const rest = ln.substring(arrowIdx);
  console.log('Rest:');
  console.log(rest);
  console.log('---');
  
  const eqStart = rest.indexOf("') + ' = ' + (");
  console.log('eqStart:', eqStart);
  
  if (eqStart >= 0) {
    const valueStart = eqStart + "') + ' = ' + (".length;
    console.log('Value starts at:', valueStart);
    console.log('Value raw:', rest.substring(valueStart, valueStart + 80));
    
    let depth = 1;
    let closeIdx = -1;
    for (let j = valueStart; j < rest.length; j++) {
      if (rest[j] === '(') depth++;
      if (rest[j] === ')') {
        depth--;
        if (depth === 0) { closeIdx = j; break; }
      }
    }
    console.log('closeIdx:', closeIdx);
    if (closeIdx >= 0) {
      console.log('Computed value:', rest.substring(valueStart, closeIdx));
    } else {
      console.log('Failed to find closing paren');
    }
  }
}
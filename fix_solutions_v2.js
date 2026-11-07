const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// The broken pattern is inside solution: strings that have:
// → ' + ('' + 'Math.sqrt' + '(' + ... + ... + ') + ' = ' + (computedExpr)
// computedExpr is the actual computed value like (2*u*Math.sin(...).toFixed(2)+' s')
// or Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s'
// Basically anything between the last ( and the last ) before }; 

// Better approach: find each → ' + ('' + pattern, 
// then find the last ) before the next function or end of line
// Extract everything inside that last ( ... ) as the computed value

const lines = text.split('\n');
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  const arrowIdx = line.indexOf("→ ' + ('' + ");
  if (arrowIdx < 0) continue;

  // Find the last closing paren before the line's end
  const rest = line.substring(arrowIdx);
  // The pattern in the rest is:
  // → ' + ('' + ...MATHED_EXPR... + ') + ' = ' + (COMPUTED_VALUE)
  // COMPUTED_VALUE might contain nested parens like Math.sqrt(...).toFixed(...)
  
  // Find: ') + ' = ' + (
  const eqStart = rest.indexOf("') + ' = ' + (");
  if (eqStart < 0) continue;
  
  // Find the matching close for this (
  let depth = 1;
  let closeIdx = -1;
  for (let j = eqStart + "') + ' = ' + (".length; j < rest.length; j++) {
    if (rest[j] === '(') depth++;
    if (rest[j] === ')') {
      depth--;
      if (depth === 0) { closeIdx = j; break; }
    }
  }
  if (closeIdx < 0) continue;
  
  // The computed value is between eqStart + len and closeIdx
  const valueStart = eqStart + "') + ' = ' + (".length;
  const computedValue = rest.substring(valueStart, closeIdx);
  
  // Now replace the entire solution from arrowIdx to closeIdx+1
  const beforeArrow = line.substring(0, arrowIdx);
  // The afterEnd still has the remnant of the broken string concatenation
  // The computedValue is the last expression inside (...)
  // Find where the actual line continues after the ) that closes the solution value
  // Look for '; }' after our closeIdx (accounting for the ') that originally followed)
  const afterComputed = rest.substring(closeIdx);
  // afterComputed = ') + ' = ' + (value) + '); },'
  // after the last ) we need: '; },
  let afterLastClose = '';
  for (let j = closeIdx + 1; j < rest.length; j++) {
    if (rest[j] === "'") {
      // The ' closes the string, everything after is actual code
      afterLastClose = rest.substring(j + 1);
      break;
    }
  }
  
  // Construct the replacement
  line = beforeArrow + '→ ' + computedValue + afterLastClose;
  fixed++;
}

console.log('Fixed ' + fixed + ' lines');
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('File written');
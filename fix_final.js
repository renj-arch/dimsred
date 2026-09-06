const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// PROBLEM: The original file has ~1425 solution: values that look like:
// solution:'Formula: ... → ' + ('' + ...string concatenation nonsense... + ') + ' = ' + (computedExpression)
// This produces JS syntax errors because the generated code is structurally broken.

// SOLUTION: Replace solution: values containing the broken pattern with a clean version that 
// uses the computed expression directly. We extract the computed expression (the last (..) group)
// and use it as the solution value prefix by the description text.

// Step 1: Find ALL solution: properties that have → 
// Step 2: For each, extract the description text before → 
// Step 3: Extract the last top-level (expr) group
// Step 4: Rebuild as: solution:'desc → ' + expr

let count = 0;

// Strategy A: match pattern:
// solution:'TEXT → ' + ('' + ...MATH... + ') + ' = ' + (VALUE)
// Replace with: solution:'TEXT → ' + VALUE

text = text.replace(
  /(solution:'[^']+ → ' \+ \('' \+ )(?:'[^']*' \+ )*\([^)]+\)(?: \+ '[^']*')* \+ '\) \+ ' = ' \+ \(([^)]+(?:\([^)]*\))*)\)/g,
  (match, prefix, value) => {
    count++;
    return "solution:'... → ' + " + value;
  }
);

console.log('Fix 1: ' + count + ' matches');

// Step 2: simpler case - skip, use only Step 1 and Step 3

// Step 3: most general - find → ' + ('' + and replace the garbage
count = 0;
let lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const start = line.indexOf("→ ' + ('' +");
  if (start < 0) continue;
  
  // Find the last ) that closes the entire outer expression
  // The pattern is: → ' + ('' + ...garbage... + ') + ' = ' + (computedValue)
  // We need to find: text after arrow up to the computed value
  const rest = line.substring(start);
  
  // Find the computed value by finding: ') + ' = ' + (
  const eqPos = rest.indexOf("') + ' = ' + (");
  if (eqPos < 0) continue;
  
  // The computed value start is right after the (
  const valStart = eqPos + "') + ' = ' + (".length;
  
  // Find the matching close paren
  let depth = 1;
  let closePos = -1;
  for (let j = valStart; j < rest.length; j++) {
    if (rest[j] === '(') depth++;
    if (rest[j] === ')') { depth--; if (depth === 0) { closePos = j; break; } }
  }
  if (closePos < 0) continue;
  
  const valueExpr = rest.substring(valStart, closePos);
  
  // Now we need to strip the trailing part
  // after closePos, the rest should contain the rest of the outer expression
  // Original: ... + ') + ' = ' + (valueExpr) + rest_of_string
  // The ) at closePos closes the ( around valueExpr
  // Then what follows is the closing bits: maybe )' or '); }, etc
  
  // Construct: everything before start + '→ ' + valueExpr + everything after the relevant close
  // We need to find and strip whatever follows the value expression's closing paren
  const afterValue = rest.substring(closePos + 1);
  
  // The afterValue looks like: ') + '; or '; or ); etc.
  // Find the end of the original string: look for ' followed by ; or ,
  let afterClean = '';
  for (let j = 0; j < afterValue.length; j++) {
    if (afterValue[j] === "'") {
      // This ' closes the string started after the value
      // Everything after is regular code
      afterClean = afterValue.substring(j + 1);
      break;
    }
  }
  if (afterClean === '') {
    // Try: maybe the afterValue is just a ' that was part of original pattern
    // After ) the original has: ' + ')'; the ' starts a string
    // Actually the original concat was: + ') + ' = ' + (value) + "'"  ?
    // Let me re-examine what follows: (value)')} => the ) closes (value)
    // then ' is from ... ' + ')   but that closes something... 
    // This is too fragile. Let me just take a simpler approach.
    continue;
  }
  
  const before = line.substring(0, start);
  lines[i] = before + '→ ' + valueExpr + afterClean;
  count++;
}

console.log('Fix 3: ' + count + ' matches');

// Write result
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('File written');
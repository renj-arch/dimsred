const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// The pattern in the original file is:
// solution:'description → ' + ('' + ...broken_concat... + ') + ' = ' + (computed_expression)
// 
// Replace the ENTIRE solution value from the first ' after solution: to the last ' before }; 
// with just the description and the computed result

// Strategy: find lines with the broken pattern, extract the "hint text" before →, 
// extract the computed expression, and rebuild solution as: 'hint → ' + computedExpr

const lines = text.split('\n');
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check for the broken pattern
  if (!line.includes("→ ' + ('' + ")) continue;
  
  // Extract the hint text (everything between the last 'hint:' and →)
  // Actually, let me rebuild the solution from scratch
  
  // Find the description text before the arrow
  const arrowIdx = line.indexOf("→");
  // Find where the solution property starts
  const solIdx = line.indexOf("solution:");
  if (solIdx < 0 || arrowIdx < 0) continue;
  
  // Extract the description: everything between solution:' and →
  const solPart = line.substring(solIdx + "solution:".length, arrowIdx);
  // solPart looks like: 'Formula: v² = u² + 2as → ' + ('' +
  // Strip it to just the description: remove leading ' and trailing  → ' + ('' +
  const descMatch = solPart.match(/^'([^']+)'/);
  if (!descMatch) continue;
  const description = descMatch[1]; // "Formula: v² = u² + 2as "
  
  // Find the computed value from the rest of the line
  const rest = line.substring(arrowIdx);
  const eqStart = rest.indexOf("') + ' = ' + (");
  if (eqStart < 0) continue;
  
  const valueStart = eqStart + "') + ' = ' + (".length;
  let depth = 1;
  let closeIdx = -1;
  for (let j = valueStart; j < rest.length; j++) {
    if (rest[j] === '(') depth++;
    if (rest[j] === ')') { depth--; if (depth === 0) { closeIdx = j; break; } }
  }
  if (closeIdx < 0) continue;
  
  const computedValue = rest.substring(valueStart, closeIdx);
  
  // Now rebuild: we need to wrap computedValue appropriately
  // If computedValue is a string expression like "' + u + ' m/s'", 
  // we need to call eval on it to get the string, but that's not possible at build time.
  // Instead, let's keep it as a runtime expression:
  // solution: description + computedValue
  // But the computedValue uses variables like u, a, s which are local to the function
  
  // Actually the simplest: replace solution:'desc → ' + (...) with solution:'desc → ' + cleanComputed
  // where cleanComputed doesn't have the broken concat
  
  // The issue is that the 'desc → ' string is already valid JS. The broken part is:
  // ' + ('' + 'Math.sqrt' + '(' + u + ... + ') + ' = ' + (computedValue)
  // We want to replace this with: computedValue (which is already valid JS expression)
  
  // Extract everything before the broken concat
  // The line structure is:
  // ...solution:'desc → ' + ('' + broken + ') + ' = ' + (computedValue) + rest_of_line
  // We want: ...solution:'desc → ' + computedValue + rest_of_line
  
  // Find where the actual broken concat starts (the ( after → ')
  const concatStart = line.indexOf("' + ('' + '", arrowIdx);
  if (concatStart < 0) continue;
  
  // Build fixed line
  const beforeConcat = line.substring(0, concatStart); // up to ' + ''
  const afterValue = rest.substring(closeIdx + 1);
  
  // afterValue starts with ')}; },' where the first ) closes the computedValue paren
  // and then the ' was part of ' + ' = ' + (value)' so after ) we have '; },
  // We need to find the ' that closes the original string after computedValue
  // In the original, after computedValue we have:
  // ... ' m/s') + ';  (NO, the value IS inside the outer paren)
  
  // Let me think about what afterValue contains:
  // rest = "→ ' + ('' + Math... + ') + ' = ' + (Math.sqrt(...).toFixed(1)+' m/s')}; },"
  // closeIdx points to the ) that closes the outer ( after ') + ' = ' + (
  // afterValue = rest.substring(closeIdx+1) = ")}; },\r"
  // The first char of afterValue is the ) from the original string concat pattern's closing
  
  // We need to strip the trailing ) from afterValue if it was part of the concat
  // and also handle the original ' + ' = ' + (value) which no longer applies
  let cleanedRest = afterValue;
  // Remove the ) that was closing the ('' + ... + ') + ' = ' + (value) structure
  // Actually the structure is: ('' + expr + ') + ' = ' + (value) + rest
  // The ' after value's ) is actually: ...' m/s') + rest 
  // where ') + ' = ' + (value)' is all inside the outer ORIGINAL paren
  // No wait. The outer paren is ('' + expr + ') + ' = ' + (value))
  // The closeIdx=130 is the ) after value, which marks the OUTER paren closing
  // So afterValue is everything after the outer ) 
  // which is: '; } 
  // But wait: the ' after ) [...]  ' m/s')}; } The ) at 130 is the close of (value).
  // Then after that: '; }  or maybe )}; }
  
  // Let me just check what afterValue looks like from debug
  // It was: ")}; },\r"
  // So it starts with ) which is the ) from ...' + ' = ' + (value)
  // That ) was the inner ) from the string ') + ' = '
  // Actually in the string: + ') + ' = ' + (..., the ') + ' part:
  // ' + ')' + ' = '  — the ')' is a string containing the char ), then + ' = ' is a string ' = '
  // No that's wrong. ') + ' = ' means: the string literal ') followed by + ' = ' 
  // Actually: + ')' + ' = ' — this IS concatenating the string ")" with the string " = "
  // No wait: ... + s + ') + ' = ' + (value)
  // This is: + s (number) + ') (string ")") + ' = ' (string " = ") + (value expression)
  // So: + s + ')' + ' = ' + (value)
  // The closing paren for the outer ( is AFTER value: ('' + ... + s + ')' + ' = ' + (value))
  //                                                                                ^ this )
  // So after value: ) — this closes the outer paren
  // Then: '; },
  
  // So afterValue begins with ) which is the outer paren close
  // Then ; }, completes the line
  
  // Hmm but the ' after the ) was part of ' = ' as string. No: after ) we have ; } or ; },
  // because the line is: ...' + ') + ' = ' + (value)); }
  // Wait, the line ends with '})}; }'  — the ) closes the return object, } closes function
  
  // This is getting nowhere. Let me just manually verify what the computation looks like
  // and do a direct string replacement.
  
  // Actually, let me take the SIMPLEST approach: just search for the exact substring
  // "→ ' + ('' + " and replace it and everything up to ") + ' = ' + (" with just "→ "
  // But keep (computedValue) and fix the remaining ' 
  
  const brokenStart = "→ ' + ('' + ";
  const brokenEnd = ") + ' = ' + (";
  const start = line.indexOf(brokenStart);
  if (start < 0) continue;
  const end = line.indexOf(brokenEnd, start);
  if (end < 0) continue;
  
  // Replace: → ' + ('' + ...stuff...) + ' = ' + (value)
  // With: → value
  // But we need the value with its closing ') 
  const afterBroken = line.substring(end + brokenEnd.length);
  // afterBroken = "computedValue)}; or )};"
  // Find the ) that closes this (value)
  let d = 1;
  let endIdx = -1;
  for (let j = 0; j < afterBroken.length; j++) {
    if (afterBroken[j] === '(') d++;
    if (afterBroken[j] === ')') { d--; if (d === 0) { endIdx = j; break; } }
  }
  if (endIdx < 0) continue;
  
  const valueExpr = afterBroken.substring(0, endIdx);
  const afterClose = afterBroken.substring(endIdx + 1);
  
  // Now piece together: before the arrow + '→ ' + valueExpr + afterClose
  const before = line.substring(0, start);
  line = before + '→ ' + valueExpr + afterClose;
  fixed++;
}

console.log('Fixed ' + fixed + ' lines');
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Done');
const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// Pattern: → '' + ...expression... + ') + ' = ' + (value)
// The expression is a concatenation of literals and variables
// The value is the computed answer

// Step 1: Find each → '' + 
// Step 2: Scan forward to find ') + ' = ' + (
// Step 3: The content between → '' and ') + ' = ' is the "showing work" that got mangled
// Step 4: Replace entire → '' + ... + ') + ' = ' + (value) with just → value
// Step 5: Handle the case where value includes .toFixed(...) etc.

// But the root problem: the → '' is inside a string literal: solution:'...formula → '' + expr...
// The '' is an empty string in JS concatenation: '' + something
// This is technically valid JS, it just looks weird

// Let's see what the ACTUAL syntax error is:
// The original: solution:'Formula: v² = u² + 2as → '' + 'Math.sqrt' + ...
// After our apostrophe escaping: the '' should have been correctly handled
// Let me check the current state of line 124

let lines = text.split('\n');
console.log('Line 124:', lines[123].substring(0, 400));

// The issue is: → has following '' that creates an empty string
// But 'Math.sqrt' after '' is fine in JS: '' + 'Math.sqrt' + '(' + ...
// The syntax error is likely somewhere else

// Let me find ALL lines with → '' and analyze them
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("→ ''")) {
    count++;
    if (count <= 3) console.log('Line ' + (i+1) + ': ' + lines[i].substring(0, 200));
  }
}
console.log('Total lines with arrow+empty: ' + count);
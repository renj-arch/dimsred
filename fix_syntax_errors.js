const fs = require('fs');

// Read the broken file
let code = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.js.new', 'utf8');

// Strategy: Process the entire file and properly escape ALL single quotes inside single-quoted strings.
// We walk through each character, tracking string boundaries.
// When we're inside a '...' string and encounter an unescaped ',
// we check if it's a delimiter (ends the string) or an apostrophe (needs escaping).

// Delimiter detection: a ' is a closing delimiter if:
// - prev char is NOT a letter/digit (i.e., it's after : , ( [ space etc.)
// - OR next char is , ) } ] ; + (i.e., valid after a string value)

// Apostrophe detection: a ' is an apostrophe if:
// - prev char is a letter/digit AND
// - next char is a letter/digit/- (i.e., part of a word)
// - OR prev char is a letter/digit AND next char is space followed by non-punctuation

function fixQuotes(code) {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && (inSingle || inDouble)) { result += ch; escape = true; continue; }
    
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue; }
    
    if (ch === "'" && !inDouble) {
      if (inSingle) {
        // We're inside a single-quoted string - this ' might close the string or be an apostrophe
        
        // Look at prev non-space char
        let prevIdx = i - 1;
        let prevChar = '';
        while (prevIdx >= 0 && code[prevIdx] === ' ') prevIdx--;
        if (prevIdx >= 0) prevChar = code[prevIdx];
        
        // Look at next non-space char
        let nextIdx = i + 1;
        let nextChar = '';
        while (nextIdx < code.length && code[nextIdx] === ' ') nextIdx++;
        if (nextIdx < code.length) nextChar = code[nextIdx];
        
        // Determine if this is a closing delimiter
        const prevIsAlnum = /[a-zA-Z0-9)]/.test(prevChar);
        const nextIsValidDelimiter = /[,);\]}+:]/.test(nextChar);
        const nextIsAlnum = /[a-zA-Z-]/.test(nextChar);
        
        // Closing delimiter if:
        // 1. prev is NOT alnum (prev is : , ( [ space etc.)  OR
        // 2. next is a valid delimiter char
        const isClosingDelimiter = !prevIsAlnum || nextIsValidDelimiter;
        
        if (isClosingDelimiter) {
          // Close the string
          inSingle = false;
          result += ch;
        } else {
          // This is an apostrophe inside a string, escape it
          result += "\\'";
        }
      } else {
        // Start a single-quoted string
        inSingle = true;
        result += ch;
      }
      continue;
    }
    
    result += ch;
  }
  
  return result;
}

let fixed = fixQuotes(code);
fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.js.new', fixed, 'utf8');
console.log('Fixed. Size: ' + fixed.length + ' bytes');

// Count braces
let opens = (fixed.match(/[{[]/g) || []).length;
let closes = (fixed.match(/[}\]]/g) || []).length;
console.log('Braces: ' + opens + ' open, ' + closes + ' close, balanced=' + (opens === closes));

// Check simple string count
let singleQuotes = (fixed.match(/'/g) || []).length;
console.log('Single quotes: ' + singleQuotes + ' (should be even)');

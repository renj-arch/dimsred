const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// Pattern: → '' + expression + ') + ' = '
// This appears in physics solutions where the LLM generated:
// solution:'Formula: description → '' + ... + ') + ' = ' + ...
// Instead of the intended: solution:'Formula: description → ' + computedValue + '' 
// or even solution:'Formula: ... = ' + result

// Strategy: 
// 1. Split on → 
// 2. For each halve, find the actual computed value expression (usually after ' = ')
// 3. Replace the broken pattern with just the description and result

// Simple approach: replace → '' + with → '  (remove the empty string concatenation abuse)
let count = 0;
let prev = '';
while (text !== prev) {
  prev = text;
  // Pattern: → '' + 'anytext' + ') + ' = ' + ... 
  // This is: formula → '' + 'string' + ') + ' = ' + (result)
  // The intended was likely: formula → result
  // But we can't just remove it all. Let's extract what comes after ' = '
  
  // Actually, the pattern is: → '' + ...expr... + ') + ' = ' + (valueExpr)
  // The ...expr... part is the "showing work" that got mangled
  // The valueExpr is the actual computed answer
  
// Strategy: find → '' and replace everything from → '' to the final + ' = ' + (answer)
// But be careful about nested parens: the expression before ') + ' = ' may contain parens
// Use a balanced-paren-aware approach

function fixBrokenSolution(text) {
  const arrowEmpty = '→ \'\' ';
  let idx = text.indexOf(arrowEmpty);
  let count = 0;
  while (idx >= 0) {
    // Find the ') + ' = ' + (' after
    const searchStart = idx + arrowEmpty.length;
    const closeParen = text.indexOf(") + ' = ' + (", searchStart);
    if (closeParen < 0) { idx = text.indexOf(arrowEmpty, idx + 1); continue; }
    const nextClose = text.indexOf(")", closeParen + ") + ' = ' + (".length);
    const nextPlus = text.indexOf("'", nextClose); // the ' after (value)
    
    if (nextClose >= 0 && nextPlus >= 0) {
      const value = text.substring(closeParen + "') + ' = ' + (".length - 0, nextClose);
      const oldLen = nextPlus + 1 - idx;
      const replacement = '→ ' + value;
      text = text.substring(0, idx) + replacement + text.substring(nextPlus + 1);
      count++;
    }
    idx = text.indexOf(arrowEmpty, idx + 1);
  }
  console.log('Fixed ' + count + ' instances');
  return text;
}

text = fixPatternSolution(text);
}
console.log('Fixed ' + count + ' instances');
console.log('File size: ' + (text.length/1024).toFixed(0) + ' KB');

// Now also fix: → '' + variable) + ' = ' + (value)
// Where the expr part ends with just a variable  
text = text.replace(/→ '' \+ [a-zA-Z0-9_.()]+\) \+ ' = ' \+ \(([^)]+)\)/g, (match, val) => {
  count++;
  return '→ ' + val;
});

fs.writeFileSync(file, text, 'utf8');
console.log('Total fixed: ' + count);
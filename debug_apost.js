const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const lines = content.split('\n');
const line = lines[6867];

// Find the relevant section
const diffIdx = line.indexOf('calculus_diff');
console.log('Has calculus_diff: ' + (diffIdx >= 0));
if (diffIdx >= 0) {
  const section = line.substring(diffIdx, diffIdx + 600);
  console.log('Full section:');
  console.log(section);
  console.log('---');
  
  // Find all `'` positions in the first function
  const fn1 = section.substring(0, section.indexOf('},function'));
  console.log('\nFirst function:');
  console.log(fn1);
  
  // Show character-by-character around y'
  const yIdx = fn1.indexOf("y'");
  console.log('\nAround y\':');
  console.log(fn1.substring(Math.max(0, yIdx - 5), Math.min(fn1.length, yIdx + 15)));
  
  // Show ALL quotes in single-quoted contexts
  let processed = '';
  let inSingle = false;
  for (let i = 0; i < fn1.length; i++) {
    const ch = fn1[i];
    if (ch === "'") {
      if (inSingle) {
        const peek = fn1[i + 1] || 'END';
        const prev = i > 0 ? fn1[i - 1] : 'START';
        const isDelimiter = /[\s,;:})\]]/.test(peek) || /[a-zA-Z0-9_]/.test(prev);
        console.log(`' at ${i}: prev="${prev}" peek="${peek}" isDel=${isDelimiter} → ${isDelimiter ? 'CLOSE' : 'ESCAPE'}`);
        if (isDelimiter) {
          processed += "'";
          inSingle = false;
        } else {
          processed += "\\'";
          // stay inSingle=true
        }
      } else {
        inSingle = true;
        processed += "'";
        console.log(`' at ${i}: OPEN STRING`);
      }
    } else {
      processed += ch;
    }
  }
  console.log('\nProcessed function:');
  console.log(processed);
}

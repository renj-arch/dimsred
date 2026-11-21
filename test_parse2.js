// Let me paren-by-paren check the expression
// Original solution string:
// 'Formula: v² = u² + 2as → ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')

// Let's simplify: what does this evaluate to?
// '' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s  →  "Math.sqrt(2*2+2*3*10"
// Then + ')  →  "Math.sqrt(2*2+2*3*10)"
// Then + ' = '  → "Math.sqrt(2*2+2*3*10) = "
// Then + (Math.sqrt(...).toFixed(1)+' m/s')  → "Math.sqrt(2*2+2*3*10) = 8.7 m/s"

// The outer paren: ('' + 'Math.sqrt' + ... + ') + ' = ' + (...)) 
// Wait: the outer expr starts after → ' + ('' + ...
// So: ( IS the outer paren that contains the whole expression
// The inner ) is after ' + ' = ' + (...) — there's no matching close paren for the outer (

// Let me count: ('' + 'Math.sqrt' ... + s + ') + ' = ' + (...).toFixed(1)+' m/s')
// (        outer open
// '' + ... + s +    inner expression  
// )                  THIS IS the outer close (matches the outer open)
// But then: + ' = ' + (Math.sqrt...).toFixed...  
// This is OUTSIDE the ( ... ) because ) already closed it
// So the expression becomes:
// '... → ' + (outerExpr) + ' = ' + (Math.sqrt...)
// That IS valid!

// Wait, no. Let me re-read the exact source:
// solution:'Formula:... → ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(...))

// The + ')' is a STRING LITERAL ')'. Then + ' = ' + (...)
// So: ( '' + 'Math.sqrt' + ... + s + ') + ' = ' + (Math.sqrt...) )
//     |___________________expr1___________________________|
// expr1 = "Math.sqrt(2*2+2*3*10) = 8.7 m/s"
// Then: solution:'Formula: v² = u² + 2as → ' + expr1
// This is valid!

// But wait - what does the RAW imposing look like? Let me get it from the test file
const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const lines = c.split('\n');
let l = lines[122]; // 0-indexed line 123
console.log('Line 123 full:');
console.log(l);
console.log('---');
// Find solution:
const idx = l.indexOf("solution:");
console.log('Solution part:');
console.log(l.substring(idx, idx + 300));
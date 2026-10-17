const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';

let text = fs.readFileSync(file, 'utf8');

// Fix 1: "b,', '+" pattern — comma should be plus
// Example: hint:'Product='+b,', '+'β=...
// The 'b,' is code (b variable + comma), followed by string ' + '
// This should be: hint:'Product='+b+', '+'β=...
// Pattern: after a variable/expression, a comma followed by a string that is meant
// to be concatenated

// Replace: )+', '+   (when ) or similar is followed by comma and string)
// Actually the pattern is more specific: +b,', '+
// This means: + variable b, then COMMA (property separator), then string ', '
// which SHOULD be + ', '
// Replace: (+[a-zA-Z]+),', ' → $1+\', \'

text = text.replace(/(\+[a-zA-Z][a-zA-Z0-9_]*),',' /g, "$1 + ', '");

// Fix 2: generalized version — any code expression followed by ,', '+  
// [,']' followed by '+' means the string was meant to be concatenated
text = text.replace(/,', '\+/g, " + ', '+");

// Fix 3: Fix the ')','  pattern
// Like:  )', ' → ) + ', '
text = text.replace(/\)',' /g, ") + ', ");

fs.writeFileSync(file, text, 'utf8');
console.log('Applied fixes');

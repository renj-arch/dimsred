const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';

let text = fs.readFileSync(file, 'utf8');

// Fix 1: comma-instead-of-plus pattern
// variable,', ' → variable+', '
text = text.replace(/([a-zA-Z_][a-zA-Z0-9_]*),', '/g, "$1 + ', '");

// Fix 2: closing paren followed by ,', '
text = text.replace(/\),', '/g, ") + ', ");

// Fix 3: stray "\\' + (" pattern followed immediately by string literal
// e.g. ...' + ('Radial symmetry') → 'Radial symmetry'
// But NOT ' + (variable expression) like '+a+')t
text = text.replace(/'\)\s*\+\s*\('([A-Z][^']*)'\)/g, "'$1'");

// Fix 4: stray "')" at end of expression (from broken concat)  
text = text.replace(/'\)\)'\)/g, "')");
text = text.replace(/'\)'\)/g, "')");

fs.writeFileSync(file, text, 'utf8');
console.log('Applied all fixes');

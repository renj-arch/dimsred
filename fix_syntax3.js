const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', 'utf8');

// Fix: variable,', ' → variable+', '
c = c.replace(/([a-zA-Z_][a-zA-Z0-9_]*),', '/g, "$1 + ', '");

// Fix: ),', ' → ) + ', '
c = c.replace(/\),', '/g, ") + ', ");

fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', c, 'utf8');
console.log('Fixed comma->plus patterns');
const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', 'utf8');

// Fix: replace \''+ with ' + 
let fixed = c.replace(/\\''\+/g, "' + '");

fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', fixed, 'utf8');
console.log('Fixed patterns');
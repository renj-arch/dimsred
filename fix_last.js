const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', 'utf8');

// Replace: '' =  → ' =  
c = c.replace(/'' = /g, "' = ");

// Replace: ''?  → '?
c = c.replace(/''\?/g, "'?");

// Replace ' + '' =  → ' =  
c = c.replace(/' \+ '' = /g, "' = ");

fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', c, 'utf8');
console.log('Done');
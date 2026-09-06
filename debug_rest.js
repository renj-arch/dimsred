const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
const l = fs.readFileSync(file, 'utf8');
const lines = l.split('\n');
const before = lines[122];
const rest = before.substring(before.indexOf("→ ' + ('' + "));
const closeIdx = 130;
console.log('Char at 131:', rest.charCodeAt(131), rest[131]);
console.log('Rest from 130:', JSON.stringify(rest.substring(130, 140)));
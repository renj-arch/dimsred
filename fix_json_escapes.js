const fs = require('fs');
const files = [
  'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json',
  'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\biology_generators_complete.json',
  'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json'
];
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\\'/g, "'");
  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed: ' + f);
}

const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js','utf8');
const lines = c.split('\n');
const l = lines[6867];
const idx = l.indexOf('calculus_diff');
if (idx >= 0) {
  const s = l.substring(idx, idx + 500);
  const ri = s.indexOf('return{q:');
  const fun = s.substring(ri, ri + 200);
  console.log('Return section:');
  for (let i = 0; i < fun.length; i++) {
    console.log(i + ': ' + fun.charCodeAt(i) + ' (' + fun[i] + ')');
  }
}

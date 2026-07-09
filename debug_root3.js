const fs = require('fs');
const m = JSON.parse(fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json','utf8'));
const cd = m.deepened_topics.calculus_application;
const ci = cd.indexOf('Cyclist');
const section = cd.substring(ci, ci + 300);
const sIdx = section.indexOf("') + '");
if (sIdx >= 0) {
  for (let i = sIdx - 3; i <= sIdx + 8; i++) {
    console.log(i + ': ' + section.charCodeAt(i) + ' (' + section[i] + ')');
  }
}
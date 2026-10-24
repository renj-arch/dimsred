const fs = require('fs');
const m = JSON.parse(fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json','utf8'));
const cd = m.deepened_topics.calculus_application;
const ci = cd.indexOf('Cyclist');
console.log('ci:', ci);

// Look for something like: s + ')
const closeIdx = cd.indexOf("') + '", ci);
if (closeIdx >= 0) {
  console.log('Close pattern at:', closeIdx);
  for (let i = closeIdx - 3; i <= closeIdx + 8; i++) {
    console.log(i + ': ' + cd.charCodeAt(i) + ' (' + cd[i] + ')');
  }
} else {
  console.log('Pattern not found');
  // Try alternative patterns
  console.log('Looking for alternatives...');
  for (const pat of ["s + ')", "' + ' = '", ") + ' = '", "') + ' = ' + ("]) {
    const idx = cd.indexOf(pat, ci);
    if (idx >= 0) {
      console.log('Found "' + pat + '" at ' + idx + ': ' + JSON.stringify(cd.substring(idx, idx + 20)));
    }
  }
}
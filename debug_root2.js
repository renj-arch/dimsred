const fs = require('fs');
const l = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js','utf8');
const ln = l.split('\n')[122];
const idx = ln.indexOf("') + ' = '");
if (idx >= 0) {
  console.log("Found at " + idx);
  console.log("Context: " + JSON.stringify(ln.substring(idx - 5, idx + 15)));
}
// Check the original JSON source
const m = JSON.parse(fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json','utf8'));
const cd = m.deepened_topics.calculus_application;
const ci = cd.indexOf("Cyclist");
if (ci >= 0) {
  console.log("\nOriginal JSON context:");
  const section = cd.substring(ci, ci + 300);
  console.log(section);
  console.log("\nChar codes around ') + ':");
  const sIdx = section.indexOf("') + '");
  if (sIdx >= 0) {
    for (let i = sIdx - 3; i <= sIdx + 8; i++) {
      console.log(i + ": " + section.charCodeAt(i) + " (" + section[i] + ")");
    }
  }
}
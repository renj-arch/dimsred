const fs = require('fs');
const m = JSON.parse(fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json','utf8'));
// Search ALL keys for 'Cyclist'
for (const section of ['new_topics', 'deepened_topics']) {
  for (const [topic, code] of Object.entries(m[section] || {})) {
    const ci = code.indexOf('Cyclist');
    if (ci >= 0) {
      console.log('Found in ' + section + '.' + topic);
      const closeIdx = code.indexOf("') + '", ci);
      if (closeIdx >= 0) {
        console.log('Close pattern at:', closeIdx);
        for (let i = closeIdx - 3; i <= closeIdx + 8; i++) {
          console.log(i + ': ' + code.charCodeAt(i) + ' (' + code[i] + ')');
        }
      }
      break;
    }
  }
}
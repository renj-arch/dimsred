const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const lines = content.split('\n');
const line = lines[6867]; // 0-indexed, line 6868
console.log('Line 6868 length: ' + line.length);

// Find y\'' pattern
const idx = line.indexOf("y\\''");
if (idx >= 0) {
  console.log('Found y\\'\' at ' + idx);
  console.log('Context: ' + JSON.stringify(line.substring(Math.max(0,idx-30), Math.min(line.length, idx+30))));
} else {
  console.log('No y\\'\' found');
  // Find y\' instead
  const idx2 = line.indexOf("y\\'");
  if (idx2 >= 0) {
    console.log('Found y\\' at ' + idx2);
    console.log('Context: ' + JSON.stringify(line.substring(Math.max(0,idx2-30), Math.min(line.length, idx2+30))));
  }
}
// Check all ' patterns after y^
const afterY = line.substring(line.indexOf("y=x^"));
console.log('\nAfter y=x^: ' + JSON.stringify(afterY.substring(0, 80)));

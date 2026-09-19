const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js','utf8');

// Find the Cyclist function
const idx = c.indexOf('Cyclist');
const lineStart = c.lastIndexOf('\n', idx) + 1;
const lineEnd = c.indexOf('\n', lineStart);
const line = c.substring(lineStart, lineEnd);

console.log('Line from test.js:');
console.log(line.substring(0, 500));
console.log('...');
console.log('Length:', line.length);

// Extract just the function body and try to parse it
const fnIdx = line.indexOf('function () {');
const fnEnd = line.lastIndexOf('}');
const fnBody = line.substring(fnIdx, fnEnd + 1);

try {
  new Function('rand', fnBody);
  console.log('\nFunction compiles OK');
} catch(e) {
  console.log('\nCompile error:', e.message);
  
  // Try stripping the syntax
  const lines = fnBody.split('\n');
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    console.log(i + ': ' + JSON.stringify(lines[i].substring(0, 200)));
  }
}
const fs = require('fs');
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js';
let text = fs.readFileSync(file, 'utf8');

// Create a copy, then fix line by line
const lines = text.split('\n');
let fixed = 0;
const output = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  const orig = line;
  
  // Pattern 1: solution contains → ' + ('' + ... + ') + ' = ' + (computedValue)
  // Replace the broken concat with just: solution:'...value'
  if (line.includes("→ ' + ('' + ")) {
    // Extract the computed value from the last (computedValue)
    const match = line.match(/→ ' \+ \('' \+ .+?\) \+ ' = ' \+ \(([^)]+(?:\.toFixed\([^)]+\))?)\)/);
    if (match) {
      // Preserve the hint text before the arrow
      const beforeArrow = line.substring(0, line.indexOf("→"));
      const afterArrow = line.substring(line.indexOf("→"));
      // Instead of the broken expression, just show the computed value
      const replacement = "→ " + match[1];
      line = beforeArrow + replacement +
        line.substring(line.lastIndexOf(")") + 1);
      fixed++;
    }
  }
  
  output.push(line);
}

console.log('Fixed ' + fixed + ' lines');
fs.writeFileSync(file, output.join('\n'), 'utf8');
console.log('File written: ' + (text.length/1024).toFixed(0) + ' KB');
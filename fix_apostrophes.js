const fs = require('fs');
const t = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.js.new', 'utf8');

// Find all places where ' is followed by a letter/dash inside JS single-quoted strings
// Simulate a basic JS tokenizer to find string boundaries
let lines = t.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("'")) {
    // Quick check: if line has odd number of apostrophes, it might be broken
    let count = (lines[i].match(/'/g) || []).length;
    if (count % 2 !== 0) {
      // Find the problematic apostrophe
      let parts = lines[i].split("'");
      for (let j = 0; j < parts.length; j++) {
        // Check if part contains an even number of " to avoid confusing with double-quoted strings
        if (j > 0 && j < parts.length - 1) {
          let prev = parts[j-1];
          let next = parts[j];
          // The apostrophe between these parts - is it a delimiter or text?
          // If prev ends with alphanumeric and next starts with alphanumeric, it's text
          if (prev.match(/[a-zA-Z0-9)]$/) && next.match(/^[a-zA-Z-]/)) {
            console.log('Line ' + (i+1) + ': ' + lines[i].substring(0, 120) + '...');
            break;
          }
        }
      }
    }
  }
}

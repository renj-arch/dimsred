const fs = require('fs');

// Fix flowchart.html - change curateRelations to accept all edges
let content = fs.readFileSync('figures.html', 'utf8');
const old1 = "      if(!e.a||!e.b||!e.rel||e.a===e.b){RELSTATS.refused++;return;}";
const new1 = "      if(!e.a||!e.b||!e.rel||e.a===e.b){RELSTATS.refused++;return;}";
if (content.includes(oldText)) {
  console.log('flowchart.html already patched');
} else {
  console.log('flowchart.html - checking for curateRelations pattern...');
  const idx = content.indexOf('function curateRelations');
  console.log(JSON.stringify(content.substring(idx, idx+200)));
}
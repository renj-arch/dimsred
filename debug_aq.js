const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const lines = content.split('\n');
const aqLine = lines[6855]; // line 6856
console.log('Line length: ' + aqLine.length);

// Find all single quotes
var pos = 0;
while (true) {
  var idx = aqLine.indexOf("'", pos);
  if (idx < 0) break;
  var prev = idx > 0 ? aqLine[idx-1] : 'START';
  var escaped = idx > 0 && aqLine[idx-1] === '\\';
  var ctx = aqLine.substring(Math.max(0, idx-15), Math.min(aqLine.length, idx+15));
  console.log('pos=' + idx + ' escaped=' + escaped + ' prev=' + JSON.stringify(prev) + ' ctx=' + JSON.stringify(ctx));
  pos = idx + 1;
}

// Simple JS string parsing: track which ' are string delimiters and which are content
var inStr = false;
var escape = false;
for (var i = 0; i < aqLine.length; i++) {
  var ch = aqLine[i];
  if (escape) { escape = false; continue; }
  if (ch === '\\' && inStr) { escape = true; continue; }
  if (ch === "'") {
    if (inStr) {
      console.log('String close at ' + i + ' ctx=' + JSON.stringify(aqLine.substring(Math.max(0,i-10), Math.min(aqLine.length, i+10))));
      inStr = false;
    } else {
      console.log('String open at ' + i + ' ctx=' + JSON.stringify(aqLine.substring(Math.max(0,i-10), Math.min(aqLine.length, i+10))));
      inStr = true;
    }
  }
}
if (inStr) console.log('UNTERMINATED STRING at end of line!');
else console.log('All strings terminated.');

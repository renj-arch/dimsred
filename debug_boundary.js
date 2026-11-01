const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js', 'utf8');
const lines = content.split('\n');

// Line 6854 (index 6853) should be continuity
const contLine = lines[6853];
console.log('Line 6854 last 50 chars: ' + JSON.stringify(contLine.slice(-50)));

// Line 6856 (index 6855) 
const nextLine = lines[6855];
console.log('Line 6856 first 80 chars: ' + JSON.stringify(nextLine.slice(0, 80)));

// Find all single quotes and their context in the continuity block
// Focus on the last portion (last 200 chars)
const lastPart = contLine.slice(-200);
console.log('\nLast 200 chars of continuity:');
var pos = 0;
while (true) {
  var idx = lastPart.indexOf("'", pos);
  if (idx < 0) break;
  var ctx = lastPart.substring(Math.max(0, idx - 10), Math.min(lastPart.length, idx + 10));
  var escaped = idx > 0 && lastPart[idx - 1] === '\\';
  console.log('  pos=' + idx + ' escaped=' + escaped + ' ctx=' + JSON.stringify(ctx));
  pos = idx + 1;
}

// Now check if there's a "f\\'" or similar pattern that's wrong
// Check the last function specifically
const lastFuncStart = contLine.lastIndexOf('function(){');
if (lastFuncStart >= 0) {
  const lastFunc = contLine.substring(lastFuncStart);
  console.log('\nLast function:');
  console.log('  ' + JSON.stringify(lastFunc.slice(0, 100)) + '...');
  console.log('  ends with: ' + JSON.stringify(lastFunc.slice(-30)));
  
  // Check for any unescaped ' inside the last function
  var inStr = false;
  var escape = false;
  for (var i = 0; i < lastFunc.length; i++) {
    var ch = lastFunc[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === "'") {
      if (inStr) {
        // Check previous char to help decide
        var prev = i > 0 ? lastFunc[i-1] : '';
        console.log('String close at ' + i + ' prev=' + JSON.stringify(prev) + ' ctx=' + JSON.stringify(lastFunc.substring(Math.max(0,i-10), Math.min(lastFunc.length, i+10))));
        inStr = false;
      } else {
        console.log('String open at ' + i + ' ctx=' + JSON.stringify(lastFunc.substring(Math.max(0,i-10), Math.min(lastFunc.length, i+10))));
        inStr = true;
      }
    }
  }
  if (inStr) console.log('WARNING: Unterminated string at end of last function!');
  else console.log('All strings properly terminated in last function.');
}

var fs = require('fs');
var content = fs.readFileSync('js/science-training.js', 'utf8');
var lines = content.split('\n');

// Search for specific patterns known to cause errors
for (var i = 0; i < lines.length; i++) {
  var l = lines[i];
  
  // Check for 'D is not defined' - look for reference to unbound D
  if (l.includes('D>0') && !l.includes('var D=') && !l.includes('D=') && !l.includes('var D;')) {
    // See if a preceding line in same function has var D
    var j = i;
    while (j >= 0 && !lines[j].includes('function ()')) j--;
    var hasVarD = false;
    for (var k = j; k <= i; k++) {
      if (lines[k].includes('var D=') || lines[k].includes('var D;')) hasVarD = true;
    }
    if (!hasVarD) console.log('BUG (D not defined): line ' + (i+1) + ': ' + l.trim().substring(0, 120));
  }
  
  // Check for unbound 'm' variable
  if (l.includes('m is not defined')) console.log('BUG (m ref): line ' + (i+1) + ': ' + l.trim().substring(0, 120));
  
  // Check for unbound 'r' variable  
  if (l.includes('r is not defined')) console.log('BUG (r ref): line ' + (i+1) + ': ' + l.trim().substring(0, 120));
  
  // Check for unbound 'b' in coordinate
  if (l.includes('b is not defined')) console.log('BUG (b ref): line ' + (i+1) + ': ' + l.trim().substring(0, 120));
}

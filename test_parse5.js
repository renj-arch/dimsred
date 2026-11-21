// The exact solution expression from line 123
var expr = "'Formula: v² = u² + 2as → ' + ('' + 'Math.sqrt' + '(' + 2 + '*' + 2 + '+' + '2' + '*' + 3 + '*' + 10 + ') + ' = ' + (Math.sqrt(2*2+2*3*10).toFixed(1)+' m/s')";
try {
  var result = eval(expr);
  console.log('Result:', result);
} catch(e) {
  console.log('ERROR: ' + e.message);
}

// Check the explicit issue: the ') + ' = ' +  part
var test = "'' + 'Math.sqrt' + '(' + '2' + '*' + '2' + '+' + '2' + '*' + '3' + '*' + '10' + ') + ' = ' + '8.7 m/s'";
console.log('Inner test:', eval(test));
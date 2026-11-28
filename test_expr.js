// Test if the EXACT expression from the file is valid
var u=10, a=5, s=50;
var expr = "'Formula: v² = u² + 2as → ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')";
console.log('Eval:', eval(expr));

// Also test with the return object
var ret = {q:'Cyclist u='+u+' m/s, a='+a+' m/s², covers '+s+' m. Final speed?',a:Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s',hint:'v² = u² + 2as',solution: eval(expr)};
console.log('Result:', ret.solution);
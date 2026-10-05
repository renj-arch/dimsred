// Exact code from line 123 - as a function expression
var code = `var x = function () { var u=2; var a=3; var s=10; return {q:'Cyclist u='+u+' m/s, a='+a+' m/s\\u00B2, covers '+s+' m. Final speed?',a:Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s',hint:'v\\u00B2 = u\\u00B2 + 2as',solution:'Formula: v\\u00B2 = u\\u00B2 + 2as \\u2192 ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')}; }`;

try {
  new Function(code);
  console.log('VALID');
} catch(e) {
  console.log('ERROR: ' + e.message);
  // Show what part errors at
  const out = x();
  console.log(out);
}
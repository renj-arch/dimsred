// Exact code from line 123
var code = `function () { var u=rand(2,10); var a=rand(1,5); var s=rand(10,50); return {q:'Cyclist u='+u+' m/s, a='+a+' m/s\\u00B2, covers '+s+' m. Final speed?',a:Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s',hint:'v\\u00B2 = u\\u00B2 + 2as',solution:'Formula: v\\u00B2 = u\\u00B2 + 2as \\u2192 ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')}; }`;

try {
  new Function('rand', code);
  console.log('VALID');
} catch(e) {
  console.log('ERROR: ' + e.message);
}
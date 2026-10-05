var u=10, a=5, s=50;
var sol = "'Formula: v² = u² + 2as → ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ')') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')";
try {
  var result = eval(sol);
  console.log('Result:', result);
} catch(e) {
  console.log('Error:', e.message);
}
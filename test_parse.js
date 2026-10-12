const code = "var u=2,a=3,s=10; solution:'Formula: v² = u² + 2as → ' + ('' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')";
try {
  new Function(code);
  console.log('VALID');
} catch(e) {
  console.log('ERROR: ' + e.message);
}
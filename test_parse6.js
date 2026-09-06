// Check the expression step by step
// The issue is: '' + 'Math.sqrt' + '(' + '2' + '*' + '2' + '+' + '2' + '*' + '3' + '*' + '10' + ') + ' = ' + '8.7 m/s'
// The ') + '  part: the + ') is string concat, then + ' = ' is string concat
// This should be valid...

// Let me test JUST the part with the ') + '
var a = "'Math.sqrt' + '(' + '2' + '*' + '2' + '+' + '2' + '*' + '3' + '*' + '10' + ')'";
console.log('Part A: ' + eval(a));

// Wait, the ')' in the raw string... inside eval, the string has ') + ' which is 
// containing a ) as a literal character, then + ' starts a new string.
// In JS source code: ')  is: '+'\' )\'+ ' - the ) is inside a single-quoted string
// Destroying my head trying to read this.

// Let me use template literals
var b = 'Math.sqrt(' + '2*2+2*3*10) = ' + '8.7 m/s';
console.log('Simple test: ' + b);
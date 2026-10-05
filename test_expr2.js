var u=10, a=5, s=50;

// Build the expression piece by piece
var part1 = "'Formula: v² = u² + 2as → '";
var part2 = "'' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')";
console.log('Part1:', eval(part1));
try {
  console.log('Part2:', eval(part2));
} catch(e) {
  console.log('Part2 error:', e.message);
}

// The '(' inside the outer () is being parsed as a GROUPING operator, not a string!
// Let me check: + '(' + u  -- the '(' is a string literal inside the concatenation
// But the outer ( starts as: ('' + ...)  -- the ( is a grouping operator
// Inside: '' + 'Math.sqrt' + '(' + u  -- the '(' is a string literal ')(' 
// Wait no: + '(' + u  -- the '(' is a string literal in JS: + "(" + u
// That should be fine...

// Let me try without the outer ()
var test1 = "'' + 'Math.sqrt' + '(' + u + '*' + u + '+' + '2' + '*' + a + '*' + s + ') + ' = ' + (Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s')";
console.log('Test1:', eval(test1));
const fs = require('fs');
const t = fs.readFileSync('archive.html', 'utf8');
const lines = t.split('\n');
const scriptSrc = lines.slice(5031, 5040).join('\n');
console.log('=== Script source excerpt ===');
console.log(scriptSrc);
console.log('=== END ===');
try {
  new Function(scriptSrc);
  console.log('PARSED OK');
} catch (e) {
  console.log('PARSE ERROR:', e.message);
  // Binary search for error
  for (let i = 0; i < scriptSrc.length; i++) {
    try {
      new Function(scriptSrc.substring(0, i + 1));
    } catch (e2) {
      const msg = e2.message;
      if (msg.includes('Unexpected') && !msg.includes('end of input')) {
        const sofar = scriptSrc.substring(0, i + 1);
        const lineNum = (sofar.match(/\n/g) || []).length + 1;
        console.log('First syntax error at pos', i, 'line', lineNum, ':', msg);
        console.log('Context:', JSON.stringify(scriptSrc.substring(Math.max(0, i - 30), i + 30)));
        break;
      }
    }
  }
}
// Cleanup
fs.unlinkSync('tmp_debug.js');

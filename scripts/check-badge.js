var fs = require('fs');
var p = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\agniveer\\index.html';
var buf = fs.readFileSync(p);
var f = buf.toString('utf-8');
var idx = f.indexOf('class="badge"');
var end = f.indexOf('</div>', idx);
console.log('BADGE:', JSON.stringify(f.substring(idx, end+6)));
var frag = buf.slice(idx, end+6);
console.log('HEX:', Array.from(frag).map(function(b) { return b.toString(16).padStart(2,'0'); }).join(' '));

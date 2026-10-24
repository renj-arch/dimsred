const fs = require('fs');
const h = fs.readFileSync('3d-globe.html', 'utf8');
const lines = h.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const rx = /([a-zA-Z])'([ \n\r\t,}\])])/g;
  let m;
  while ((m = rx.exec(l)) !== null) {
    if (m.index === 0 || l[m.index - 1] !== '\\') {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(l.length, m.index + 30);
      console.log('Line ' + (i + 1) + ': ...' + l.substring(start, end) + '...');
    }
  }
}

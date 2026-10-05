const fs = require('fs');
const h = fs.readFileSync('3d-globe.html', 'utf8');
const lines = h.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  let j = 0;
  while (j < l.length) {
    const idx = l.indexOf("'", j);
    if (idx === -1) break;
    if (idx > 0 && l[idx - 1] !== '\\') {
      const prev = l[idx - 1] || '';
      const next = l[idx + 1] || '';
      console.log('Line ' + (i + 1) + ': col ' + idx + ': ...' + l.substring(Math.max(0, idx - 15), idx + 15) + '...');
    }
    j = idx + 1;
  }
}

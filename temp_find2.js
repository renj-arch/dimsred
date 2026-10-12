const fs = require('fs');
const h = fs.readFileSync('3d-globe.html', 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
const js = h.substring(ms + 23, me);

// Find all D.xxx arrays and check for unescaped s' within them
const lines = js.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (!l.includes("'s ")) continue;
  // Check if this is a data line (starts with {n:)
  if (!l.trim().startsWith('{n:')) continue;
  
  // Find all 's occurrences that are NOT preceded by \
  const rx = /([a-zA-Z])'s /g;
  let m;
  let lineOutput = false;
  while ((m = rx.exec(l)) !== null) {
    if (m.index === 0 || l[m.index - 1] !== '\\') {
      if (!lineOutput) {
        console.log('Line ' + (i + 1) + ' (HTML ' + (i + ms + 23) + '): ' + l.substring(0, 120) + '...');
        lineOutput = true;
      }
      const ctx = l.substring(Math.max(0, m.index - 20), Math.min(l.length, m.index + 20));
      console.log('  FOUND: ...' + ctx + '...');
    }
  }
}

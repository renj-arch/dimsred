const fs = require('fs');
const h = fs.readFileSync('3d-globe.html', 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
const js = h.substring(ms + 23, me);
fs.writeFileSync('globe-check.mjs', js);
console.log('Wrote', js.length, 'bytes');

const fs = require('fs');
const path = require('path');

const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
const h = fs.readFileSync(GLOBE_PATH, 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
const js = h.substring(ms + 23, me);
const outPath = path.join(__dirname, '..', 'tmp-globe-check.mjs');
fs.writeFileSync(outPath, js, 'utf8');
console.log('Extracted', js.length, 'bytes');

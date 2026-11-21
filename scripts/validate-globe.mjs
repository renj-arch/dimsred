import fs from 'fs';
let h = fs.readFileSync('3d-globe.html', 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
const js = h.substring(ms + 23, me);
fs.writeFileSync('C:\\Users\\Renjith\\AppData\\Local\\Temp\\globe-check.mjs', js);
console.log('OK - extracted ' + js.length + ' bytes');

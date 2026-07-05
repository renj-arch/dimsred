const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '3d-globe.html');
let h = fs.readFileSync(filePath, 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
const outerPrefix = h.substring(0, ms + 23);
let js = h.substring(ms + 23, me);
const outerSuffix = h.substring(me);

let result = '';
let inSQ = false, inDQ = false, inBacktick = false;
let fixed = 0;

for (let i = 0; i < js.length; i++) {
  const ch = js[i];

  if (inBacktick) {
    if (ch === '\\' && i + 1 < js.length) { result += ch + js[++i]; continue; }
    result += ch;
    if (ch === '`') inBacktick = false;
  } else if (inDQ) {
    if (ch === '\\' && i + 1 < js.length) { result += ch + js[++i]; continue; }
    result += ch;
    if (ch === '"') inDQ = false;
  } else if (inSQ) {
    if (ch === '\\' && i + 1 < js.length) { result += ch + js[++i]; continue; }
    if (ch === "'") {
      let nextNonSpace = '';
      for (let j = i + 1; j < Math.min(i + 20, js.length); j++) {
        const nc = js[j];
        if (nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t') {
          nextNonSpace = nc;
          break;
        }
      }
      if (/[a-zA-Z0-9_"']/.test(nextNonSpace)) {
        result += "\\'";
        fixed++;
      } else {
        inSQ = false;
        result += ch;
      }
    } else {
      result += ch;
    }
  } else {
    if (ch === '/' && i + 1 < js.length && js[i + 1] === '/') {
      while (i < js.length && js[i] !== '\n') { result += js[i]; i++; }
      if (i < js.length) { result += '\n'; }
    } else if (ch === '/' && i + 1 < js.length && js[i + 1] === '*') {
      result += '/*'; i += 2;
      while (i < js.length - 1 && !(js[i] === '*' && js[i + 1] === '/')) { result += js[i]; i++; }
      if (i < js.length - 1) { result += '*/'; i++; }
    } else if (ch === "'") { inSQ = true; result += ch; }
    else if (ch === '"') { inDQ = true; result += ch; }
    else if (ch === '`') { inBacktick = true; result += ch; }
    else { result += ch; }
  }
}

h = outerPrefix + result + outerSuffix;
fs.writeFileSync(filePath, h);
console.log(`Fixed ${fixed} apostrophes`);

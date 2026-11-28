const fs = require('fs');
const h = fs.readFileSync('3d-globe.html', 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
let js = h.substring(ms + 23, me);

// Find the problematic line area
const targetLine = "Gongoni Danga";
const idx = js.indexOf(targetLine);
console.log("Found at index:", idx);
console.log("Context:");
console.log(js.substring(Math.max(0, idx - 200), idx + 500));
console.log("---");

// Now reproduce the fix-apostrophes logic
const unicodeSpace = /[\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/;

let result = '';
let inSQ = false, inDQ = false, inBacktick = false;
let fixed = 0, line = 1, col = 0;

for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '\n') { line++; col = 0; } else { col++; }

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
        if (nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t' && !unicodeSpace.test(nc)) {
          nextNonSpace = nc;
          break;
        }
      }
      const prev = i > 0 ? js[i - 1] : '';
      const nextChar = i + 1 < js.length ? js[i + 1] : '';
      const isApostropheChar = /[a-zA-Z0-9_]/.test(prev) && /[a-z]/.test(nextChar);
      let snippet = '';
      for (let j = i + 1; j < Math.min(i + 10, js.length); j++) {
        const nc = js[j];
        if (nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t' && !unicodeSpace.test(nc)) {
          snippet += nc;
          if (snippet.length >= 3) break;
        }
      }
      const isEndOfString = /^[,}\]\)]/.test(snippet) || /^['"`]/.test(snippet);
      if (isApostropheChar && !isEndOfString) {
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

// Check if the result around the target area looks right
const idx2 = result.indexOf(targetLine);
console.log("\nProcessed context:");
console.log(result.substring(Math.max(0, idx2 - 200), idx2 + 500));
console.log("---");
console.log("Fixed:", fixed);

// Check for the Gongoni line
const gongoniRegex = /Gongoni Danga[^}]+/;
const gongoniMatch = result.match(gongoniRegex);
if (gongoniMatch) {
  console.log("\nGongoni line in result:", gongoniMatch[0].substring(0, 200));
}

// Syntax check
try {
  new Function(result);
  console.log("\nSyntax OK!");
} catch (e) {
  console.log("\nSyntax error:", e.message);
  // Find the line number
  const lineMatch = e.message.match(/at (\d+):\d+/);
  if (lineMatch) {
    const errLine = parseInt(lineMatch[1]);
    const lines = result.split('\n');
    console.log("Error at line", errLine);
    for (let i = Math.max(0, errLine - 3); i < Math.min(lines.length, errLine + 2); i++) {
      console.log((i + 1) + ": " + lines[i].substring(0, 200));
    }
  }
}

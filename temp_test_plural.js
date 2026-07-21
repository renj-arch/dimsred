// Test the fix-apostrophes logic on plural possessives
const line = "{n:'Mekedatu',la:12.25818,ln:77.44866,sub:'Bengaluru',desc:'test goats' hooves test',fact:'test',tag:''}";
console.log('INPUT:', line);

let result = '';
let inSQ = false;
for (let i = 0; i < line.length; i++) {
  const ch = line[i];
  if (inSQ) {
    if (ch === '\\' && i + 1 < line.length) { result += ch + line[++i]; continue; }
    if (ch === "'") {
      const prev = i > 0 ? line[i - 1] : '';
      const nextChar = i + 1 < line.length ? line[i + 1] : '';
      const isApostropheChar = /[a-zA-Z0-9_]/.test(prev) && /[a-z]/.test(nextChar);
      let snippet = '';
      for (let j = i + 1; j < Math.min(i + 10, line.length); j++) {
        const nc = line[j];
        if (nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t') {
          snippet += nc;
          if (snippet.length >= 3) break;
        }
      }
      const isEndOfString = /^[,}\]\)]/.test(snippet) || /^['"`]/.test(snippet);
      if (isApostropheChar && !isEndOfString) {
        result += "\\'";
      } else {
        inSQ = false;
        result += ch;
      }
    } else {
      result += ch;
    }
  } else {
    if (ch === "'") { inSQ = true; result += ch; }
    else { result += ch; }
  }
}
console.log('OUTPUT:', result);
console.log('inSQ at end:', inSQ);

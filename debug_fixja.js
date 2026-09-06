const fs = require('fs');
const code = "solution:'Concept: Cnidarians have radial symmetry → ' + ('Radial symmetry')";

function fixJsApostrophes(code) {
  let result = '';
  let inSingle = false;
  let escape = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\') { result += ch; escape = true; continue; }
    if (ch === "'") {
      console.log(`Pos ${i}: inSingle=${inSingle}, ch='${ch}', prev='${code[i-1]||'START'}', next='${code[i+1]||'END'}'`);
      if (inSingle) {
        const nextCh = i + 1 < code.length ? code[i + 1] : '\0';
        if (nextCh === "'") { result += "\\'"; console.log('  -> consecutive quote -> escaped'); continue; }
        if (/[+,;\]}:]/.test(nextCh)) { inSingle = false; result += "'"; console.log('  -> next is delim -> close string'); continue; }
        if (nextCh === ')') {
          let close = true;
          for (let j = i + 2; j < code.length; j++) { if (!' \n\r\t'.includes(code[j])) { close = /[+,;\]}:]/.test(code[j]); break; } }
          if (close) { inSingle = false; result += "'"; console.log('  -> next is ) and after is delim -> close string'); continue; }
        }
        let isPrecededByOpen = false;
        for (let j = i - 1; j >= 0; j--) { if (!' \n\r\t'.includes(code[j])) { isPrecededByOpen = code[j] === '('; break; } }
        if (isPrecededByOpen) { inSingle = false; result += "'"; console.log('  -> preceded by ( -> close string'); continue; }
        for (let j = i - 1; j >= 0; j--) { if (!' \n\r\t'.includes(code[j])) { if (/[a-zA-Z0-9='?]/.test(code[j])) { result += "\\'"; console.log('  -> preceded by word -> escaped'); break; } else { inSingle = false; result += "'"; console.log('  -> preceded by other -> close string'); break; } } break; }
      } else {
        inSingle = true;
        result += "'";
        console.log('  -> open string');
      }
      continue;
    }
    result += ch;
  }
  return result;
}

const output = fixJsApostrophes(code);
console.log('\nInput:', code);
console.log('Output:', output);
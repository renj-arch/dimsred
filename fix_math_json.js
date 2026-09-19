const fs = require('fs');
const path = require('path');

// Fix math JSON — it has broken escaping like "\\\\\\\\" (4 backslashes + quote)
// that makes JSON.parse fail. Fix it character-by-character with JSON context awareness.
function fixJsonFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  let result = '';
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    
    if (escape) {
      // Previous char was \ — current char is escaped
      if (ch === "'") {
        // \' is invalid in JSON — just output '
        result += "'";
        escape = false;
        continue;
      }
      result += '\\' + ch;
      escape = false;
      continue;
    }
    
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    
    if (inString && ch === '\\') {
      // Check what follows to detect broken escapes
      const next = text[i + 1];
      
      if (next === '"') {
        // \" — valid escaped quote, keep it
        result += '\\"';
        i++;
        continue;
      }
      
      if (next === '\\') {
        // \\ — escaped backslash
        // Check further to detect \\" vs \\\" patterns
        const next2 = text[i + 2];
        
        if (next2 === '"') {
          // \\" — broken! The intent was to include a " in the output
          // Should be \" (just escaped quote)
          result += '\\"';
          i += 2;
          continue;
        }
        
        if (next2 === '\\') {
          const next3 = text[i + 3];
          if (next3 === '"') {
            // \\\\" — 4 backslashes + quote
            // Should be \" (escaped quote produces ")
            result += '\\"';
            i += 3;
            continue;
          }
          if (next3 === '\\') {
            const next4 = text[i + 4];
            if (next4 === '"') {
              // \\\\\\" — 6 backslashes + quote
              // Should be \" 
              result += '\\"';
              i += 4;
              continue;
            }
          }
        }
        
        // Two backslashes followed by non-quote — keep both
        result += '\\\\';
        i++;
        continue;
      }
      
      if (next === "'") {
        // \' — invalid JSON, just keep the '
        result += "'";
        i++;
        continue;
      }
      
      // \ followed by something else — valid escape sequence or unknown
      result += '\\';
      escape = true;
      continue;
    }
    
    result += ch;
  }
  
  fs.writeFileSync(filePath, result, 'utf8');
  console.log('Fixed: ' + path.basename(filePath));
}
const file = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json';
fixJsonFile(file);
try { JSON.parse(fs.readFileSync(file,'utf8')); console.log('NOW VALID JSON'); }
catch(e) { console.log('STILL BROKEN: ' + e.message.split('\n')[0]); }

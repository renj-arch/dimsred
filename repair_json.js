const fs = require('fs');

function repairJsonFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let result = '';
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    
    if (escape) {
      // Previous char was \ inside a string — ch is the escaped character
      // Valid JSON escapes: " \ / b f n r t uXXXX
      if (ch === "'") {
        // \' is NOT valid JSON escape. Just output ' (no backslash)
        result += "'";
        escape = false;
        continue;
      }
      // For all other chars, keep the backslash and char
      result += '\\' + ch;
      escape = false;
      continue;
    }
    
    if (!inString) {
      if (ch === '"') {
        inString = true;
        result += ch;
      } else {
        result += ch;
      }
      continue;
    }
    
    // We are inside a JSON string value
    if (ch === '\\') {
      // Peek at next char
      const next = text[i + 1];
      if (next === '"') {
        // \" is a valid quote escape — keep it
        result += '\\"';
        i++; // skip the "
        continue;
      }
      if (next === '\\') {
        // \\ starts a backslash escape
        // Check what follows the second backslash
        const next2 = text[i + 2];
        if (next2 === '"') {
          // \\" — this means: \\ (backslash literal) followed by " (string terminator)
          // But the INTENT was probably: \\ followed by " inside the string
          // We need \\\" to keep the " inside the string
          result += '\\\\\\"';
          i += 2;
          continue;
        }
        if (next2 === '\\') {
          // \\\\ — four backslashes
          // Check for \\\\"
          const next3 = text[i + 3];
          if (next3 === '"') {
            // \\\\" — should be \\\\\" (string terminator was meant to be escaped)
            result += '\\\\\\\\\\"';
            i += 3;
            continue;
          }
        }
        // For \\ followed by anything else, just keep it
        result += '\\\\';
        i++;
        continue;
      }
      if (next === "'") {
        // \' is invalid JSON escape — just output '
        result += "'";
        i++;
        continue;
      }
      // Other valid escapes: \/, \b, \f, \n, \r, \t
      if ("/bfnrt".includes(next)) {
        result += '\\' + next;
        i++;
        continue;
      }
      if (next === 'u') {
        // Unicode escape \uXXXX
        result += '\\u';
        i++;
        // Copy the 4 hex digits
        for (let j = 0; j < 4 && i + 1 < text.length; j++) {
          result += text[i + 1];
          i++;
        }
        continue;
      }
      // Unknown escape — just keep the backslash and next char
      result += '\\' + next;
      i++;
      continue;
    }
    
    if (ch === '"') {
      // End of JSON string value
      inString = false;
      result += ch;
      continue;
    }
    
    result += ch;
  }
  
  fs.writeFileSync(filePath, result, 'utf8');
  console.log('Repaired: ' + filePath + ' (' + (result.length/1024).toFixed(1) + ' KB)');
}

repairJsonFile('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json');
repairJsonFile('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\biology_generators_complete.json');
repairJsonFile('C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json');

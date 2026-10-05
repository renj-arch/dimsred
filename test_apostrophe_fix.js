const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json', 'utf8'));
const c = obj.new_topics.continuity;

function fixJsApostrophes(code) {
  let result = '';
  let inSingle = false;
  let escape = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && inSingle) { result += ch; escape = true; continue; }
    if (ch === "'") {
      if (inSingle) {
        let nextChar = '';
        for (let j = i + 1; j < code.length; j++) {
          if (code[j] !== ' ' && code[j] !== '\n' && code[j] !== '\r') { nextChar = code[j]; break; }
        }
        let prevChar = '';
        for (let j = i - 1; j >= 0; j--) {
          if (code[j] !== ' ' && code[j] !== '\n' && code[j] !== '\r') { prevChar = code[j]; break; }
        }
        const isDelimiter = !/[a-zA-Z0-9)]/.test(prevChar) || /[,);\]}+:]/.test(nextChar);
        if (isDelimiter) { inSingle = false; result += ch; }
        else { result += "\\'"; }
      } else {
        inSingle = true;
        result += ch;
      }
      continue;
    }
    result += ch;
  }
  return result;
}

var fixed = fixJsApostrophes(c);
var opens = (fixed.match(/[{[]/g)||[]).length;
var closes = (fixed.match(/[}\]]/g)||[]).length;
console.log('After fixJsApostrophes: opens=' + opens + ' closes=' + closes + ' diff=' + (opens-closes));

// Now check with brace stack
var stack = [];
for (var i = 0; i < fixed.length; i++) {
  var ch = fixed[i];
  if ('[{'.includes(ch)) {
    stack.push({ch:ch, pos:i});
  } else if ('}]'.includes(ch)) {
    var expected = ch === '}' ? '{' : '[';
    if (stack.length && stack[stack.length-1].ch === expected) {
      stack.pop();
    }
  }
}
console.log('Stack remaining after brace matching: ' + stack.length);
if (stack.length) {
  console.log('---Unmatched opens---');
  stack.forEach(function(item, idx) {
    console.log('  [' + idx + '] pos=' + item.pos + ' ch=' + item.ch + ' ctx=' + JSON.stringify(fixed.substring(Math.max(0,item.pos-30), Math.min(fixed.length, item.pos+30))));
  });
}

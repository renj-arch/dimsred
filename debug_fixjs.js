const fs = require("fs");
const m = JSON.parse(fs.readFileSync("C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json","utf8"));
const sr = m.new_topics.sets_relations;

// Find the first De Morgan function  
const dmIdx = sr.indexOf("De Morgan");
const secondIdx = sr.indexOf("Second De Morgan");
const firstFn = sr.substring(dmIdx, secondIdx);

// Extract just the solution part
const solStart = firstFn.indexOf("solution:");
const solCode = firstFn.substring(solStart);

console.log("=== Input ===");
console.log(solCode);
console.log("");

// Run fixJsApostrophes
function fixJsApostrophes(code) {
  let result = "";
  let inSingle = false;
  let escape = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === "\\") { result += ch; escape = true; continue; }
    if (ch === "'") {
      if (inSingle) {
        const nextCh = i + 1 < code.length ? code[i + 1] : "\0";
        const prevCh = i > 0 ? code[i - 1] : "\0";
        if (nextCh === "'") { result += "\\'"; continue; }
        const isNextWord = /\w/.test(nextCh);
        const isPrevWord = /\w/.test(prevCh);
        let isCodeDelim = false;
        if (/[+,;\]}:]/.test(nextCh)) { isCodeDelim = true; }
        else if (nextCh === ")") {
          const afterParen = i + 2 < code.length ? code[i + 2] : "\0";
          if (/[,;\]}:]/.test(afterParen) || afterParen === "\0") { isCodeDelim = true; }
        }
        if (isCodeDelim) { inSingle = false; result += "'"; }
        else if (isNextWord || isPrevWord) { result += "\\'"; }
        else { inSingle = false; result += "'"; }
      } else {
        inSingle = true;
        result += "'";
      }
      continue;
    }
    result += ch;
  }
  return result;
}

const output = fixJsApostrophes(solCode);
console.log("=== Output ===");
console.log(output);
console.log("");

// Check each quote position
console.log("=== Output character analysis ===");
for (let i = 0; i < output.length; i++) {
  const c = output[i];
  if (c === "'" || c === "\\") {
    const context = output.substring(Math.max(0,i-5), Math.min(output.length,i+5));
    console.log("Pos " + i + ": " + c + " context: " + JSON.stringify(context));
  }
}

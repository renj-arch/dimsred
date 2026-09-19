const fs = require("fs");
const m = JSON.parse(fs.readFileSync("C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json","utf8"));
const sr = m.new_topics.sets_relations;
const dmIdx = sr.indexOf("De Morgan");
console.log("=== First De Morgan function ===");
const firstEnd = sr.indexOf("Second De Morgan");
const firstFn = sr.substring(dmIdx, firstEnd);
console.log(firstFn);
console.log("\n=== RAW chars of solution ===");
const solStart = firstFn.indexOf("Concept:");
const sol = firstFn.substring(solStart);
console.log(sol);
console.log("\n=== Char codes ===");
for (let i = 0; i < sol.length; i++) {
  console.log(i + ": " + sol.charCodeAt(i) + " (" + sol[i] + ")");
}

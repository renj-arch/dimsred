const fs = require("fs");
const path = require("path");
const fp = path.join(__dirname, "gen-jee-maths-chapters.js");
let content = fs.readFileSync(fp, "utf-8");

content = content.replace(/{l:"D"},v:/g, '{l:"D",v:');
content = content.replace(/{l:"C"},v:/g, '{l:"C",v:');
content = content.replace(/{l:"B"},v:/g, '{l:"B",v:');

var lines = content.split("\n");
var result = [];
var inArray = false;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i];
  if (line.includes("MATH_CHAPTERS = [")) {
    inArray = true;
    result.push(line);
    continue;
  }
  if (inArray && line.trim() === "];") {
    result.push(",");
    continue;
  }
  result.push(line);
}

content = result.join("\n");

// Remove trailing comma before final ]
content = content.replace(/,\s*\n\s*\]/, "\n]");

fs.writeFileSync(fp, content, "utf-8");
console.log("Fixed structure.");

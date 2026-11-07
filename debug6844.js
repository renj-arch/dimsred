var fs = require("fs");
var c = fs.readFileSync("C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\science-training.test.js","utf8");
var lines = c.split("\n");
var l = lines[6843];
var idx = l.indexOf("sets_relations");
var s = l.substring(idx, idx + 500);
console.log(s);
console.log("---");
// find A\' in the log output

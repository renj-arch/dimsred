const fs = require("fs");
const m = JSON.parse(fs.readFileSync("C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json","utf8"));
// calculus_application could be in deepened_topics
const ca = m.deepened_topics.calculus_application;
if (!ca) { console.log("Not in deepened_topics, checking new_topics"); process.exit(1); }
const idx = ca.indexOf("Local minimum");
console.log(ca.substring(Math.max(0,idx-50), Math.min(ca.length, idx+100)));

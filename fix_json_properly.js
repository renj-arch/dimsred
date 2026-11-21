const fs = require('fs');

function fixJsonFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Fix invalid JSON escapes while preserving JS-correct escaping
  // In JSON: \' is invalid (single quote doesn't need escaping)
  // To represent the string "Baker's" in JSON, just write "Baker's"
  // But in the JS code (which is the JSON string value), we need "Baker\'s"
  // So the JSON should contain: "Baker\\'s" which decodes to: Baker\'s
  
  // Replace invalid \' with \\' (proper JSON encoding for \' JS escape)
  content = content.replace(/\\'/g, "\\\\'");
  
  // Also fix \\" -> the issue: in JSON, \\" means backslash-escape followed by string-terminator
  // The JS code intended \\" as: backslash backslash quote (for escaping double-quotes in single-quoted strings)
  // But in single-quoted JS strings, \" is just " — the backslash is unnecessary!
  // So we just strip the double-backslash before quotes: \\" -> \"
  content = content.replace(/\\\\"/g, '\\"');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed: ' + filePath);
}

fixJsonFile('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json');
fixJsonFile('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\biology_generators_complete.json');
fixJsonFile('C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json');

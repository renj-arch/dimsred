const fs = require('fs');

function testJson(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('OK: ' + filePath);
    console.log('  Keys: ' + Object.keys(data).join(', '));
    if (data.new_topics) console.log('  New topics: ' + Object.keys(data.new_topics).join(', '));
    if (data.deepened_topics) console.log('  Deepened: ' + Object.keys(data.deepened_topics).join(', '));
    if (data.new_topic_names) console.log('  Names: ' + data.new_topic_names.join(', '));
  } catch (e) {
    console.log('FAIL: ' + filePath);
    console.log('  Error: ' + e.message);
    // Show context around error position
    const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
    if (pos) {
      const text = fs.readFileSync(filePath, 'utf8');
      console.log('  Context: ...' + text.slice(Math.max(0,pos-50), pos+50) + '...');
    }
  }
}

testJson('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\math_generators.json');
testJson('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\biology_generators_complete.json');
testJson('C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json');

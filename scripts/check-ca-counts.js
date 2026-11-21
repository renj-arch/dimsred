var h = require('fs').readFileSync('archive.html', 'utf8');

// Check sidebar current affairs count
var idx = h.indexOf('Current Affairs');
var before = h.substring(Math.max(0, idx-5), idx+200);
console.log('=== Around first "Current Affairs" ===');
console.log(before);

// Check CAT_INDEX
var ciIdx = h.indexOf('"Current Affairs"');
if (ciIdx > -1) {
  var ciStr = h.substring(ciIdx, ciIdx + 100);
  console.log('\n=== CAT_INDEX entry ===');
  console.log(ciStr);
}

// Count how many "Current Affairs" exist
var count = 0;
var pos = -1;
while ((pos = h.indexOf('Current Affairs', pos+1)) !== -1) {
  count++;
  console.log('Occurrence #' + count + ' at index ' + pos + ': ' + h.substring(Math.max(0,pos-20), pos+80));
}

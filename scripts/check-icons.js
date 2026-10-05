var fs = require('fs');
var root = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study';
var exams = ['upsc','ibps-po','sbi-clerk','ssc-gd','ctet'];

exams.forEach(function(f) {
  var p = root + '/' + f + '/index.html';
  var content = fs.readFileSync(p, 'utf-8');

  // Check feature card icons (these should have correct emojis)
  var featIdx = content.indexOf('feat-card');
  while (featIdx >= 0) {
    var iconStart = content.indexOf('class="icon"', featIdx);
    if (iconStart >= 0) {
      var closeSpan = content.indexOf('</span>', iconStart);
      var icon = content.substring(iconStart, closeSpan);
      console.log(f + ' icon: ' + icon);
    }
    featIdx = content.indexOf('feat-card', featIdx + 5);
    if (featIdx > iconStart + 50) break; // prevent infinite loop
  }
});

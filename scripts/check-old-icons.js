var fs = require('fs');
var root = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study';
['cgl','rbi','jee','neet','gate','agniveer','upsc','ibps-po','sbi-clerk','ssc-gd','ctet'].forEach(function(f) {
  var content = fs.readFileSync(root + '/' + f + '/index.html', 'utf-8');
  var featIdx = content.indexOf('feat-grid');
  var section = content.substring(featIdx, featIdx + 2000);
  var icons = [];
  var iIdx = 0;
  while ((iIdx = section.indexOf('class="icon"', iIdx)) >= 0) {
    var close = section.indexOf('</span>', iIdx);
    icons.push(section.substring(iIdx, close+7));
    iIdx = close + 7;
  }
  console.log(f + ':');
  icons.forEach(function(ic) { console.log('  ' + ic); });
});

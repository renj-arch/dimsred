var fs = require('fs');
var path = require('path');
var exams = ['cgl','rbi','jee','neet','gate','agniveer','upsc','ibps-po','sbi-clerk','ssc-gd','ctet'];
var root = 'C:/Users/Renjith/Desktop/icode (2)/study';
var count = 0;

for (var i = 0; i < exams.length; i++) {
  var fp = path.join(root, exams[i], 'index.html');
  if (!fs.existsSync(fp)) continue;
  var html = fs.readFileSync(fp, 'utf-8');
  var orig = html;

  // Add Dashboard and Community links after "../index.html">Home
  html = html.replace(
    '<a href="../index.html">Home</a>',
    '<a href="../index.html">Home</a><a href="../dashboard.html">Dashboard</a><a href="../community.html">Community</a>'
  );

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf-8');
    count++;
  }
}

console.log('Updated ' + count + ' exam index pages');

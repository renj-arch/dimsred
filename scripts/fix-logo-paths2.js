const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function getAllHtmlFiles(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  for (var i = 0; i < list.length; i++) {
    var file = path.join(dir, list[i]);
    var stat = fs.statSync(file);
    if (stat.isDirectory() && file.indexOf('node_modules') === -1) {
      results = results.concat(getAllHtmlFiles(file));
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  }
  return results;
}

var files = getAllHtmlFiles(root).filter(function(f) {
  return f.indexOf('node_modules') === -1;
});

var fixCount = 0;

for (var fi = 0; fi < files.length; fi++) {
  var filePath = files[fi];
  var html = fs.readFileSync(filePath, 'utf-8');
  var original = html;

  // Fix broken nav logo paths where "/" is missing before logo.png
  // Case: src="../..logo.png" -> src="../../logo.png"  
  // Case: src="..logo.png" -> src="../logo.png"
  html = html.replace(/src="(\.\.(?:\/\.\.)*)logo\.png"/g, function(m, dots) {
    return 'src="' + dots + '/logo.png"';
  });

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf-8');
    fixCount++;
  }
}

console.log('Fixed broken paths in ' + fixCount + ' files');

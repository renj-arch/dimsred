var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var files = [];
function walk(dir) {
  var entries = fs.readdirSync(dir);
  entries.forEach(function(e) {
    if (e === 'node_modules' || e === '.git') return;
    var fp = path.join(dir, e);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (e.endsWith('.html')) files.push(fp);
  });
}
walk(root);

var count = 0;
files.forEach(function(fp) {
  var content = fs.readFileSync(fp, 'utf-8');
  var original = content;
  content = content.replace(/\uFFFD/g, '');
  content = content.replace(/(class="badge">)\?+(?:\s*)/g, '$1');
  content = content.replace(/(>)\?+\s*(Sign In|Dashboard|Unlock Lab)/g, '$1$2');
  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf-8');
    count++;
    console.log('Fixed: ' + path.relative(root, fp));
  }
});
console.log('Done. Fixed ' + count + ' files.');

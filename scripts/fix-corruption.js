var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');

var files = [];
function walk(dir) {
  var entries = fs.readdirSync(dir);
  entries.forEach(function(e) {
    var fp = path.join(dir, e);
    if (fs.statSync(fp).isDirectory()) {
      if (e !== 'node_modules' && e !== '.git') walk(fp);
    } else if (e.endsWith('.html')) {
      files.push(fp);
    }
  });
}
walk(root);

var count = 0;
files.forEach(function(fp) {
  var content = fs.readFileSync(fp, 'utf-8');
  var original = content;

  content = content.replace(/>\?\?<\/a>/g, '>\uD83C\uDFC6</a>');
  content = content.replace(/>\?\? Sign In<\/a>/g, '>Sign In</a>');
  content = content.replace(/>dYs\? Sign In<\/a>/g, '>Sign In</a>');
  content = content.replace(/>\?\? Dashboard<\/a>/g, '>Dashboard</a>');
  content = content.replace(/>\?\? Unlock Lab<\/a>/g, '>Unlock Lab</a>');
  content = content.replace(/<div class="badge">\?+\s*/g, '<div class="badge">');
  content = content.replace(/<div class="badge">dY\?\uFFFD/g, '<div class="badge">');
  content = content.replace(/<div class="badge">dYs?\uFFFD/g, '<div class="badge">');
  content = content.replace(/dYs\?/g, '');
  content = content.replace(/dY\?/g, '');

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf-8');
    count++;
    console.log('  Fixed ' + path.relative(root, fp));
  }
});
console.log('\nFixed ' + count + ' files');

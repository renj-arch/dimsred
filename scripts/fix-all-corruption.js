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

  // Remove replacement characters
  content = content.replace(/\uFFFD/g, '');

  // Fix badge: "badge">???... -> "badge">
  content = content.replace(/(class="badge">)\s*\?+\s*/g, '$1');

  // Fix feature card icons: <span class="icon">???</span> -> <span class="icon">🎯</span>
  content = content.replace(/<span class="icon">\s*\?+\s*<\/span>/g, '<span class="icon">🎯</span>');

  // Fix "View Paper ?" -> "View Paper →"
  content = content.replace(/View Paper \?/g, 'View Paper →');

  // Fix "Start Practice ?" -> "Start Practice →"
  content = content.replace(/Start Practice \?/g, 'Start Practice →');

  // Fix lab page icons
  content = content.replace(/>\?\? Topic Drill/g, '>🎯 Topic Drill');
  content = content.replace(/>\? Custom Mock/g, '>🎯 Custom Mock');

  // Fix nav: \? in leaderboard link -> trophy
  content = content.replace(/>\?\s*<\/a>/g, '>🏆</a>');

  // Fix auth: \? Sign In -> Sign In
  content = content.replace(/>\?\s*Sign In<\/a>/g, '>Sign In</a>');

  // Fix dY? pattern
  content = content.replace(/dYs?\?/g, '');

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf-8');
    count++;
    console.log('  Fixed: ' + path.relative(root, fp));
  }
});
console.log('\nFixed ' + count + ' files.');

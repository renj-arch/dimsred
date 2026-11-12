var fs = require('fs');
var path = require('path');
var { requireRoot, isApply } = require('./lib/cli-root');

// One-off nav fixer. It used to hardcode one developer machine's absolute path,
// so a bare run rewrote exam index pages under a directory you did not choose.
// Root is now explicit and writing is opt-in.
//
//   node scripts/nav-update.js --root <dir>            # dry run
//   node scripts/nav-update.js --root <dir> --apply    # write
var root = requireRoot();
var apply = isApply();

var exams = ['cgl','rbi','jee','neet','gate','agniveer','upsc','ibps-po','sbi-clerk','ssc-gd','ctet'];
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
    if (apply) fs.writeFileSync(fp, html, 'utf-8');
    else console.log('  would update ' + path.relative(root, fp));
    count++;
  }
}

console.log((apply ? 'Updated ' : 'Would update ') + count + ' exam index pages');

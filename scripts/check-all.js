var fs = require('fs');
var root = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study';
var exams = ['cgl','rbi','jee','neet','gate','agniveer','upsc','ibps-po','sbi-clerk','ssc-gd','ctet',''];

exams.forEach(function(f) {
  var p = root + (f ? '/' + f + '/index.html' : '/lab.html');
  var content = fs.readFileSync(p, 'utf-8');

  var badgeIdx = content.indexOf('class="badge"');
  if (badgeIdx >= 0) {
    var end = content.indexOf('</div>', badgeIdx);
    var badge = content.substring(badgeIdx, end);
    if (badge.indexOf('?') >= 0) console.log(f + ': BADGE has ?: ' + badge.substring(0,50));
  }

  var lbIdx = content.indexOf('leaderboard');
  if (lbIdx >= 0) {
    var closeA = content.indexOf('</a>', lbIdx);
    var link = content.substring(lbIdx, closeA);
    if (link.indexOf('?') >= 0) console.log(f + ': LEADERBOARD has ?: ' + link);
  }

  if (content.indexOf('?') >= 0) {
    var qmark = content;
    var found = [];
    var idx = -1;
    while ((idx = qmark.indexOf('?', idx + 1)) >= 0 && found.length < 3) {
      var start = Math.max(0, idx - 15);
      var end = Math.min(qmark.length, idx + 15);
      var ctx = qmark.substring(start, end);
      if (!ctx.includes('ca-pub') && !ctx.includes('family=') && !ctx.includes('client=')) {
        found.push(ctx.trim());
      }
    }
    if (found.length > 0) console.log(f + ': Remaining ?: ' + found.join(' | '));
  }
});
console.log('Done.');

var fs = require('fs');
var root = __dirname.replace('scripts', '');
var exams = ['cgl','rbi','jee','neet','gate','agniveer','upsc','ibps-po','sbi-clerk','ssc-gd','ctet'];
exams.forEach(function(f) {
  var content = fs.readFileSync(root + f + '/index.html', 'utf-8');
  // Check badge
  var badgeIdx = content.indexOf('<div class="badge">');
  if (badgeIdx > -1) {
    var badgeText = content.substring(badgeIdx, badgeIdx + 70);
    console.log(f + ' BADGE: ' + badgeText.trim());
  }
  // Check leaderboard
  var lbIdx = content.indexOf('leaderboard');
  if (lbIdx > -1) {
    var lbText = content.substring(lbIdx - 5, lbIdx + 30);
    console.log(f + ' LEADERBOARD: ' + lbText.trim());
  }
  // Check auth
  var authIdx = content.indexOf('auth-btn');
  if (authIdx > -1) {
    var authText = content.substring(authIdx, authIdx + 40);
    console.log(f + ' AUTH: ' + authText.trim());
  }
  console.log('');
});

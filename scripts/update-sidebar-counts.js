const fs = require('fs');

// New month counts from current-affairs.json after cleaning
var monthCounts = {
  'January 2026': 318,
  'February 2026': 486,
  'March 2026': 1080,
  'April 2026': 1248,
  'May 2026': 1038,
  'June 2026': 1110,
  'July 2026': 331
};
var total = 5611;

var html = fs.readFileSync('archive.html', 'utf8');

// Update CAT_INDEX total + month subSubject counts
// Build the new CAT_INDEX entry for Current Affairs
var subSubjectEntries = [];
Object.keys(monthCounts).sort(function(a, b) {
  var ma = 'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(a.slice(0,3));
  var mb = 'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(b.slice(0,3));
  return (parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1])) || (ma - mb);
}).forEach(function(k) {
  subSubjectEntries.push('{"name":"' + k.replace(/"/g, '\\"') + '","count":' + monthCounts[k] + '}');
});

var newEntry = '"name":"Current Affairs","total":' + total + ',"icon":"📰","file":"data/questions/current-affairs.json","subjects":[{"name":"Current Affairs","total":' + total + ',"subSubjects":[' + subSubjectEntries.join(',') + ']}]}';

// Find existing Current Affairs entry in CAT_INDEX
var pattern = /"name":"Current Affairs"[^}]+?subSubjects":\[[^\]]*\]\}\]\}/;
var match = pattern.exec(html);
if (match) {
  html = html.replace(pattern, newEntry);
  console.log('Updated CAT_INDEX entry');
} else {
  console.log('WARN: Could not find Current Affairs CAT_INDEX entry');
}

// Update sidebar month counts
var months = ['January 2026','February 2026','March 2026','April 2026','May 2026','June 2026','July 2026'];
months.forEach(function(m) {
  var re = new RegExp('(sidebar-label">' + m.replace(/ /g, '\\s+') + '</span><span class="sidebar-count">)(\\d+)');
  var m2 = re.exec(html);
  if (m2) {
    html = html.replace(re, '$1' + monthCounts[m]);
    console.log('Updated sidebar count for ' + m + ': ' + monthCounts[m]);
  } else {
    console.log('WARN: Could not find sidebar count for ' + m);
  }
});

// Update welcome grid subj-card count
var gridRe = /(Current Affairs[^<]*?subj-card-count">)(\d+)/;
var gridMatch = gridRe.exec(html);
if (gridMatch) {
  html = html.replace(gridRe, '$1' + total);
  console.log('Updated welcome grid count: ' + total);
} else {
  console.log('WARN: Could not find welcome grid count');
}

fs.writeFileSync('archive.html', html, 'utf8');
console.log('\nDone. Total Current Affairs: ' + total);

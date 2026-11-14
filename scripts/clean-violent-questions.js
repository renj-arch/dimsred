const fs = require('fs');

const VIOLENT_WORDS = [
  'killed','killing','kills','kill','died','dies','death','deaths','dead','murder','murdered',
  'shooting','shot','gunshot','explosion','blast','bomb','bombing',
  'casualty','casualties','suicide','suicide bomber','massacre',
  'assassination','assassinated','kidnapped','kidnapping','mass shooting',
  'terrorist attack','terror attack','lynching','riots','riot','clash','clashes',
  'firing','open fire','gunfire','stabbing','stabbed','beheaded',
  'executed','execution','ambush','insurgency','militant','militants','militant attack','naxal attack','IED',
  'shelling','bloodshed',
  'war crime','war crimes','genocide','crimes against humanity'
];

function isViolent(text) {
  var lower = (text || '').toLowerCase();
  for (var i = 0; i < VIOLENT_WORDS.length; i++) {
    var w = VIOLENT_WORDS[i];
    if (w.indexOf(' ') > 0) {
      if (lower.indexOf(w) !== -1) return true;
    } else {
      var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) return true;
    }
  }
  return false;
}

function cleanFile(filePath) {
  var data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  var ca = data['Current Affairs'];
  if (!ca || !ca.subSubjects) {
    console.error(filePath + ': No Current Affairs.subSubjects found');
    return;
  }

  var totalBefore = 0;
  var totalRemoved = 0;

  Object.keys(ca.subSubjects).forEach(function(monthKey) {
    var items = ca.subSubjects[monthKey];
    var before = items.length;
    totalBefore += before;
    items = items.filter(function(q) {
      var text = (q.question || '') + ' ' + (q.answer || '') + ' ' + (q.fact || '');
      return !isViolent(text);
    });
    var removed = before - items.length;
    totalRemoved += removed;
    ca.subSubjects[monthKey] = items;
    if (removed > 0) {
      console.error('  ' + monthKey + ': removed ' + removed + '/' + before);
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.error(filePath + ': removed ' + totalRemoved + '/' + totalBefore + ' violent questions');
  console.error('  Remaining: ' + (totalBefore - totalRemoved));
}

cleanFile('data/questions/current-events.json');
cleanFile('data/questions/current-affairs.json');

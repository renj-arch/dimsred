const fs = require('fs');

var w = ['killed','killing','kills','kill','died','dies','death','deaths','dead',
  'murder','murdered','shooting','shot','gunshot','explosion','blast','bomb','bombing',
  'casualty','casualties','suicide','massacre','assassination','assassinated',
  'kidnapped','kidnapping','lynching','riots','riot','clash','clashes','firing',
  'gunfire','stabbing','stabbed','beheaded','executed','execution','ambush',
  'insurgency','militant','shelling','bloodshed','IED','war crime','war crimes',
  'genocide','crimes against humanity'];

function check(fn) {
  var d = JSON.parse(fs.readFileSync('data/questions/' + fn, 'utf8'));
  var ss = d['Current Affairs'].subSubjects;
  var total = 0, violent = 0;
  Object.keys(ss).forEach(function(k) {
    ss[k].forEach(function(q) {
      total++;
      var txt = ((q.question||'') + ' ' + (q.answer||'') + ' ' + (q.fact||'')).toLowerCase();
      for (var i = 0; i < w.length; i++) {
        var word = w[i];
        var match = false;
        if (word.indexOf(' ') > 0) {
          match = txt.indexOf(word) !== -1;
        } else {
          var re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
          match = re.test(txt);
        }
        if (match) {
          violent++;
          console.log('  ' + fn + ':' + k + ' => "' + word + '" in: ' + (q.question||'').substring(0,100));
          break;
        }
      }
    });
  });
  console.log(fn + ': ' + violent + '/' + total + ' violent (word-boundary regex)');
}

check('current-events.json');
check('current-affairs.json');

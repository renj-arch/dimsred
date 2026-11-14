const fs = require('fs');

var w = ['killed','killing','kills','kill','died','dies','death','deaths','dead','murder','murdered','shooting','shot','gunshot','explosion','blast','bomb','bombing','casualty','casualties','suicide','massacre','assassination','assassinated','kidnapped','kidnapping','lynching','riots','riot','clash','clashes','firing','gunfire','stabbing','stabbed','beheaded','executed','execution','ambush','insurgency','militant','shelling','bloodshed','IED'];

function find(fn) {
  var d = JSON.parse(fs.readFileSync('data/questions/' + fn, 'utf8'));
  var ss = d['Current Affairs'].subSubjects;
  Object.keys(ss).forEach(function(k) {
    ss[k].forEach(function(q) {
      var txt = ((q.question||'') + ' ' + (q.answer||'') + ' ' + (q.fact||'')).toLowerCase();
      for (var i = 0; i < w.length; i++) {
        if (txt.indexOf(w[i]) !== -1) {
          console.log('[' + fn + '][' + k + '] "' + w[i] + '" matched in: ' + (q.question||'').substring(0, 100));
          console.log('  ANSWER: ' + (q.answer||'').substring(0, 80));
          console.log('  FACT: ' + (q.fact||'').substring(0, 120));
          break;
        }
      }
    });
  });
}

find('current-events.json');
find('current-affairs.json');

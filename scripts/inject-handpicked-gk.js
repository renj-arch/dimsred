var fs = require('fs');
var path = require('path');

var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var MANUAL_DIR = path.resolve(__dirname, '..', 'data/manual-curated');

function inject() {
  var ca = JSON.parse(fs.readFileSync(CA_PATH, 'utf8'));

  var files = fs.readdirSync(MANUAL_DIR).filter(function(f) { return f.endsWith('.json'); });

  files.forEach(function(f) {
    var data = JSON.parse(fs.readFileSync(path.join(MANUAL_DIR, f), 'utf8'));
    var subKeys = Object.keys(data);

    subKeys.forEach(function(sk) {
      var qs = data[sk];
      if (!qs || !qs.length) return;
      if (!ca['Current Affairs'].subSubjects[sk]) {
        ca['Current Affairs'].subSubjects[sk] = [];
        console.error('  Created subSubject "' + sk + '" with ' + qs.length + ' questions');
      }
      var existing = {};
      ca['Current Affairs'].subSubjects[sk].forEach(function(q) { existing[q.id] = true; });
      var added = 0;
      qs.forEach(function(q) {
        if (!existing[q.id]) {
          ca['Current Affairs'].subSubjects[sk].push(q);
          added++;
        }
      });
      if (added > 0) console.error('  Added ' + added + ' new questions to "' + sk + '"');
    });
  });

  fs.writeFileSync(CA_PATH, JSON.stringify(ca, null, 2), 'utf8');
  console.error('Injected handpicked GK into current-affairs.json');
}

inject();

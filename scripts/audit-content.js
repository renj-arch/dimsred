const fs = require('fs');

function showSamples(fn, maxPerMonth) {
  var d = JSON.parse(fs.readFileSync('data/questions/' + fn, 'utf8'));
  var ss = d['Current Affairs'].subSubjects;
  var keys = Object.keys(ss).sort();
  keys.forEach(function(k) {
    var items = ss[k];
    console.log('\n=== ' + fn + ' / ' + k + ' (' + items.length + ' questions) ===');
    var count = 0;
    items.forEach(function(q) {
      if (count >= maxPerMonth) return;
      var question = (q.question || '').replace(/_____/g, '___').substring(0, 130);
      var answer = (q.answer || '').substring(0, 50);
      console.log('  Q: ' + question);
      console.log('  A: ' + answer);
      console.log('');
      count++;
    });
  });
}

// Just show 3 samples from each month to get a sense
showSamples('current-events.json', 3);

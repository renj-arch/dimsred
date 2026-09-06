var fs = require('fs');
var files = [
  'cgl/papers/13-sep-2025-s2.html',
  'agniveer/papers/2025-paper.html',
  'neet/papers/2025-paper1.html',
  'jee/papers/2025-jan-s1.html',
  'ctet/papers/2025-paper1.html',
  'upsc/papers/2025-prelims.html',
  'cgl/papers/practice-set-01.html',
  'gate/papers/2025-cs.html'
];
for (var i = 0; i < files.length; i++) {
  var h = fs.readFileSync('C:/Users/Renjith/Desktop/icode (2)/study/' + files[i], 'utf-8');
  var t = h.match(/<title>(.*?)<\/title>/)[1];
  var d = h.match(/<meta name="description" content="(.*?)">/)[1];
  console.log(files[i]);
  console.log('  TITLE: ' + t);
  console.log('  DESC: ' + d);
  console.log();
}

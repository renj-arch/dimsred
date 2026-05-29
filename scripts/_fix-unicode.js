var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var dataDir = path.join(root, 'papers-data');
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer'];

function toAscii(s) {
  if (!s) return s;
  return s
    // Math symbols
    .replace(/\u00B2/g, '^2')
    .replace(/\u221A/g, 'sqrt')
    .replace(/\u03C0/g, 'pi')
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00D7/g, 'x')
    .replace(/\u2248/g, '~')
    .replace(/\u2260/g, '!=')
    .replace(/\u00B0/g, ' degrees ')
    // Arrows
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u21D2/g, '=>')
    .replace(/\u2191/g, '->')
    // Box drawing / special
    .replace(/\u2502/g, '|')
    .replace(/\u2551/g, '||')
    // Misc
    .replace(/\u2713/g, 'OK')
    .replace(/\u2714/g, 'YES')
    .replace(/\u2716/g, 'X')
    .replace(/\u2665/g, '<3')
    .replace(/\u2605/g, '*')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/\u00BB/g, '>>')
    .replace(/\u00AB/g, '<<')
    .replace(/\u00B7/g, '.')
    .replace(/\u00A9/g, '(c)')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2122/g, '(TM)')
    // Remove any remaining non-ASCII
    .replace(/[^\x20-\x7E\n\r]/g, '');
}

// Load all banks into memory
var banks = {};
for (var ei = 0; ei < EXAMS.length; ei++) {
  var exam = EXAMS[ei];
  var bankPath = path.join(bankDir, exam + '.json');
  if (fs.existsSync(bankPath)) {
    try {
      var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
      banks[exam] = bank;
      // Convert bank content to ASCII
      if (bank.questions) {
        bank.questions.forEach(function(q) {
          q.text = toAscii(q.text);
          q.solution = toAscii(q.solution);
          if (q.options) q.options.forEach(function(o) { o.text = toAscii(o.text); });
        });
      }
      if (bank.sections) bank.sections.forEach(function(s) { s.name = toAscii(s.name); });
      bank.exam = toAscii(bank.exam);
      if (bank.paperDefaults) {
        bank.paperDefaults.titlePrefix = toAscii(bank.paperDefaults.titlePrefix);
        bank.paperDefaults.pageTitleTemplate = toAscii(bank.paperDefaults.pageTitleTemplate);
        bank.paperDefaults.pageDescTemplate = toAscii(bank.paperDefaults.pageDescTemplate);
        bank.paperDefaults.metaTemplate = toAscii(bank.paperDefaults.metaTemplate);
      }
      fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf-8');
      console.log('Fixed bank: ' + exam + '.json (' + (bank.questions ? bank.questions.length : 0) + ' questions)');
    } catch (e) { console.log('Error processing bank ' + exam + ': ' + e.message); }
  } else {
    console.log('Bank not found: ' + exam + '.json');
  }
}

// Fix paper files - sync solutions from corresponding bank
var paperFiles = fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); });
paperFiles.forEach(function(pf) {
  var pp = path.join(dataDir, pf);
  try {
    var paper = JSON.parse(fs.readFileSync(pp, 'utf-8'));
    // Determine which exam this paper belongs to
    var examKey = null;
    for (var ei = 0; ei < EXAMS.length; ei++) {
      if (pf.indexOf(EXAMS[ei] + '-') === 0) { examKey = EXAMS[ei]; break; }
    }
    var bank = examKey ? banks[examKey] : null;
    var changed = 0;
    if (paper.questions) {
      paper.questions.forEach(function(pq) {
        if (bank && bank.questions) {
          var bq = bank.questions.find(function(b) { return b.id === pq.id; });
          if (bq) {
            if (bq.solution && bq.solution !== pq.solution) { pq.solution = bq.solution; changed++; }
            if (bq.text && bq.text !== pq.text) { pq.text = bq.text; }
            if (pq.options && bq.options) {
              pq.options.forEach(function(po, i) {
                if (bq.options[i] && bq.options[i].text && bq.options[i].text !== po.text) po.text = bq.options[i].text;
              });
            }
          }
        }
        // Also sanitize any remaining non-ASCII
        pq.text = toAscii(pq.text);
        pq.solution = toAscii(pq.solution);
        if (pq.options) pq.options.forEach(function(o) { o.text = toAscii(o.text); });
      });
    }
    if (paper.sections) paper.sections.forEach(function(s) { s.name = toAscii(s.name); });
    fs.writeFileSync(pp, JSON.stringify(paper, null, 2), 'utf-8');
    console.log('Fixed paper (' + changed + ' solutions synced): ' + pf);
  } catch (e) { console.log('Error processing paper ' + pf + ': ' + e.message); }
});

console.log('Done.');

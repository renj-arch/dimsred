var fs = require('fs');
var path = require('path');

var questionDir = path.resolve(__dirname, '..', 'question-bank');
var dataDir = path.resolve(__dirname, '..', 'data');
var topicDir = path.join(dataDir, 'topics');
var indexFile = path.join(dataDir, 'topic-index.json');

var EXAM_NAMES = {
  cgl: 'SSC CGL', rbi: 'RBI Grade B', jee: 'JEE Main', neet: 'NEET UG',
  gate: 'GATE', upsc: 'UPSC CSE', 'ibps-po': 'IBPS PO', 'sbi-clerk': 'SBI Clerk',
  'ssc-gd': 'SSC GD', ctet: 'CTET', agniveer: 'Agniveer', nda: 'NDA',
  cds: 'CDS', clat: 'CLAT'
};

if (!fs.existsSync(topicDir)) fs.mkdirSync(topicDir, { recursive: true });

var masterIndex = {};
var totalQuestions = 0;

var files = fs.readdirSync(questionDir);
for (var f of files) {
  if (!f.endsWith('.json') || f.endsWith('-meta.json') || f === '_last-response.txt') continue;
  var key = f.replace('.json', '');
  if (!EXAM_NAMES[key]) continue;

  var raw = JSON.parse(fs.readFileSync(path.join(questionDir, f), 'utf-8'));
  if (!raw.questions || !raw.questions.length) continue;

  var sections = {};
  for (var q of raw.questions) {
    var sec = q.section || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push({
      id: q.id,
      text: q.text,
      options: q.options.map(function(o) { return { label: o.label, text: o.text }; }),
      answer: q.options.findIndex(function(o) { return o.correct; }),
      solution: q.solution || ''
    });
  }

  var sectionList = [];
  for (var sec in sections) {
    sectionList.push({
      name: sec,
      count: sections[sec].length,
      questions: sections[sec]
    });
  }
  sectionList.sort(function(a, b) { return b.count - a.count; });

  // Write per-exam file
  var examData = { exam: key, name: EXAM_NAMES[key], total: raw.questions.length, sections: sectionList };
  fs.writeFileSync(path.join(topicDir, key + '.json'), JSON.stringify(examData));
  // JS version for file:// (script tag loading)
  fs.writeFileSync(path.join(topicDir, key + '.js'), 'window.__examData=' + JSON.stringify(examData) + ';');

  // Add lightweight entry to master index
  masterIndex[key] = {
    name: EXAM_NAMES[key],
    total: raw.questions.length,
    sections: sectionList.map(function(s) { return { name: s.name, count: s.count }; })
  };
  totalQuestions += raw.questions.length;
}

var indexData = { updatedAt: new Date().toISOString(), totalQuestions: totalQuestions, exams: masterIndex };
fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
// JS version for file:// (script tag loading)
fs.writeFileSync(path.join(dataDir, 'topic-index.js'), 'window.__topicIndex=' + JSON.stringify(indexData) + ';');

console.log('Topic index built: ' + Object.keys(masterIndex).length + ' exams, ' + totalQuestions + ' questions');
console.log('Per-exam files in data/topics/');

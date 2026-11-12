var fs = require('fs');
var path = require('path');

var questionDir = path.resolve(__dirname, '..', 'question-bank');
var dataDir = path.resolve(__dirname, '..', 'data');
var topicDir = path.join(dataDir, 'topics');
var indexFile = path.join(dataDir, 'topic-index.json');

// Combined / curated drills (general-knowledge, general-studies, mathematics,
// english, reasoning, science) are not one question-bank file: each pools
// sections from every exam. They are deliberately absent from EXAM_NAMES, and
// the builder used to rebuild `exams` from scratch, so every regeneration
// silently dropped them. That is exactly what happened on 2026-11-10: the
// "Auto-generate practice papers" run (daily-papers.yml) rewrote this file with
// only the 14 bank-backed exams and the six combined drills vanished from the
// page, even though their data/topics/<key>.json files were still in the repo.
// Preserve any entry this script does not own, refreshing its counts from its
// own topic file so the numbers stay honest.
var previous = null;
try { previous = JSON.parse(fs.readFileSync(indexFile, 'utf-8')); } catch (e) { /* first run */ }
var curatedKeys = [];
if (previous && previous.exams) {
  for (var pk in previous.exams) {
    if (!EXAM_NAMES[pk]) curatedKeys.push(pk);
  }
}

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

// Re-attach the curated/combined exams the bank loop cannot see.
for (var ck of curatedKeys) {
  var curatedFile = path.join(topicDir, ck + '.json');
  if (!fs.existsSync(curatedFile)) {
    // Its data file is gone too — keep the previous entry rather than dropping
    // the exam, and say so loudly.
    console.warn('WARN: curated exam "' + ck + '" has no data/topics/' + ck + '.json; keeping the previous index entry');
    masterIndex[ck] = previous.exams[ck];
    totalQuestions += Number(previous.exams[ck].total) || 0;
    continue;
  }
  var curated = JSON.parse(fs.readFileSync(curatedFile, 'utf-8'));
  masterIndex[ck] = {
    name: curated.name || (previous.exams[ck] && previous.exams[ck].name) || ck,
    total: curated.total || 0,
    sections: (curated.sections || []).map(function (s) { return { name: s.name, count: s.count }; })
  };
  totalQuestions += curated.total || 0;
  console.log('Kept curated exam "' + ck + '" (' + (curated.total || 0) + ' questions)');
}

var indexData = { updatedAt: new Date().toISOString(), totalQuestions: totalQuestions, exams: masterIndex };
fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
// JS version for file:// (script tag loading)
fs.writeFileSync(path.join(dataDir, 'topic-index.js'), 'window.__topicIndex=' + JSON.stringify(indexData) + ';');

console.log('Topic index built: ' + Object.keys(masterIndex).length + ' exams, ' + totalQuestions + ' questions');
console.log('Per-exam files in data/topics/');

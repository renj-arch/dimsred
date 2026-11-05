#!/usr/bin/env node
'use strict';
// Import the authored practice questions embedded in course lesson pages into
// the exam question banks.
//
// data/course-questions.json is built by scripts/build-course-questions.js and
// holds 1,300+ questions that were hand-written inside the course pages. Three
// exams advertised by the site (NDA, CDS, CLAT) have no previous-year papers
// in the corpus, so their banks stayed empty and every daily-paper run skipped
// them. Their courses, however, already carry real authored questions. This
// script copies those questions into the banks with the same shape the paper
// generator expects, dedupes them against anything already in the bank, and
// tags them source:"course" so provenance stays visible.
//
//   node scripts/import-course-questions-to-banks.js
//   node scripts/import-course-questions-to-banks.js --dry-run
//   node scripts/import-course-questions-to-banks.js nda cds clat
//
// Nothing is invented here: question, options, answer and lesson path all come
// from data/course-questions.json.

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var BANK_DIR = path.join(ROOT, 'question-bank');
var COURSE_FILE = path.join(ROOT, 'data', 'course-questions.json');

var DRY = process.argv.includes('--dry-run');
var REFRESH = process.argv.includes('--refresh-course');
var ARGS = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; });

var SECTION_COLORS = ['#a855f7', '#60a5fa', '#34d399', '#fb923c', '#6366f1', '#f59e0b'];

var EXAM_META = {
  cgl: { name: 'CGL', sections: ['General Intelligence & Reasoning', 'Quantitative Aptitude', 'General Awareness', 'English Language'] },
  rbi: { name: 'RBI Grade B', sections: ['General Awareness', 'Quantitative Aptitude', 'Reasoning', 'English Language'] },
  jee: { name: 'JEE Main', sections: ['Physics', 'Chemistry', 'Mathematics'] },
  neet: { name: 'NEET UG', sections: ['Physics', 'Chemistry', 'Biology'] },
  gate: { name: 'GATE', sections: ['General Aptitude', 'Engineering Mathematics', 'Core Subject'] },
  agniveer: { name: 'Agniveer', sections: ['Science', 'General Knowledge', 'Mathematics', 'Reasoning'] },
  upsc: { name: 'UPSC Civil Services', sections: ['General Studies', 'CSAT', 'General Awareness', 'English Language'] },
  'ibps-po': { name: 'IBPS PO', sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Awareness'] },
  'sbi-clerk': { name: 'SBI Clerk', sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Awareness'] },
  'ssc-gd': { name: 'SSC GD Constable', sections: ['General Knowledge', 'Mathematics', 'Reasoning', 'English Language'] },
  ctet: { name: 'CTET', sections: ['Child Development & Pedagogy', 'Environmental Studies', 'Quantitative Aptitude', 'Language'] },
  nda: { name: 'NDA', sections: ['Mathematics', 'General Knowledge'] },
  cds: { name: 'CDS', sections: ['English Language', 'General Knowledge', 'Mathematics'] },
  clat: { name: 'CLAT', sections: ['English Language', 'Current Affairs & GK', 'Reasoning', 'Quantitative Aptitude'] }
};

// Course questions carry the lesson's subject label. Map those labels onto the
// bank section each exam actually uses. Longest/clearest matches first.
var SUBJECT_ALIASES = {
  'General Knowledge': ['General Knowledge', 'General Awareness', 'General Studies', 'Current Affairs & GK'],
  'General Awareness': ['General Awareness', 'General Knowledge', 'General Studies', 'Current Affairs & GK'],
  'Current Affairs': ['Current Affairs & GK', 'General Awareness', 'General Knowledge'],
  'Quantitative Aptitude': ['Quantitative Aptitude', 'Mathematics'],
  'Mathematics': ['Mathematics', 'Quantitative Aptitude'],
  'Reasoning': ['Reasoning', 'General Intelligence & Reasoning', 'Logical Reasoning'],
  'English': ['English Language', 'English'],
  'Science': ['Science', 'General Knowledge'],
  'Physics': ['Physics'],
  'Chemistry': ['Chemistry'],
  'Biology': ['Biology']
};

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function stripPrefix(s) {
  return String(s || '')
    .replace(/^\s*[\(\[]?\s*[A-Ea-e]\s*[\)\].:-]\s*/, '')
    .replace(/^\s*[A-Ea-e]\s*[\)\].:-]\s+/, '')
    .trim();
}

function optionLetter(s) {
  var m = /^\s*[\(\[]?\s*([A-Ea-e])\s*[\)\].:-]/.exec(String(s || ''));
  return m ? m[1].toUpperCase() : '';
}

function sectionFor(exam, subject, sections) {
  var aliases = SUBJECT_ALIASES[subject] || [subject];
  for (var i = 0; i < aliases.length; i++) {
    for (var j = 0; j < sections.length; j++) {
      if (norm(sections[j]) === norm(aliases[i])) return sections[j];
    }
  }
  // Last resort: a section containing the subject word (e.g. "English
  // Language" for "English"), but never the other way round.
  for (var k = 0; k < sections.length; k++) {
    if (norm(sections[k]).indexOf(norm(subject)) !== -1) return sections[k];
  }
  return '';
}

function makeBank(exam, meta) {
  return {
    exam: meta.name,
    folder: exam,
    sections: meta.sections.map(function (s, i) { return { name: s, color: SECTION_COLORS[i % SECTION_COLORS.length] }; }),
    timerMinutes: 60,
    paperDefaults: {
      titlePrefix: meta.name + ' Practice Set',
      pageTitleTemplate: meta.name + ' Practice Set {number} — Solved Paper',
      pageDescTemplate: 'Free ' + meta.name + ' practice paper set {number} with detailed solutions.',
      metaTemplate: '{questionCount} Q · Solved with answers'
    },
    questions: [],
    generatedPapers: []
  };
}

function loadBank(exam) {
  var p = path.join(BANK_DIR, exam + '.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
  }
  return makeBank(exam, EXAM_META[exam]);
}

function main() {
  if (!fs.existsSync(COURSE_FILE)) {
    console.error('Missing ' + COURSE_FILE + ' — run scripts/build-course-questions.js first.');
    process.exit(1);
  }
  var data = JSON.parse(fs.readFileSync(COURSE_FILE, 'utf8'));
  var questions = Array.isArray(data.questions) ? data.questions : [];
  var exams = ARGS.length ? ARGS.map(function (x) { return x.toLowerCase(); }) : Object.keys(EXAM_META);
  var totalAdded = 0;

  if (!fs.existsSync(BANK_DIR) && !DRY) fs.mkdirSync(BANK_DIR, { recursive: true });

  exams.forEach(function (exam) {
    var meta = EXAM_META[exam];
    if (!meta) { console.log(exam + ': unknown exam, skipped'); return; }
    var bank = loadBank(exam);
    if (!bank) { console.log(exam + ': unreadable bank, skipped'); return; }
    var sections = (bank.sections || []).map(function (s) { return s.name; });
    if (!sections.length) sections = meta.sections;
    var oldCourse = [];
    var courseCursor = 0;
    if (REFRESH) {
      oldCourse = (bank.questions || []).filter(function (q) { return q.source === 'course'; });
      bank.questions = (bank.questions || []).filter(function (q) { return q.source !== 'course'; });
    }
    var used = {};
    (bank.questions || []).forEach(function (q) { used[norm(q.text)] = 1; });
    var nextId = (bank.questions || []).reduce(function (m, q) { return Math.max(m, Number(q.id) || 0); }, 0) + 1;
    var added = 0, skipped = 0;

    questions.filter(function (q) { return String(q._exam || '').toLowerCase() === exam; }).forEach(function (q) {
      var text = String(q.q || '').replace(/\s+/g, ' ').trim();
      if (text.length < 8 || used[norm(text)]) { skipped++; return; }
      var section = sectionFor(exam, q.subject, sections);
      if (!section) { skipped++; return; }
      var rawOpts = Array.isArray(q.opts) ? q.opts : [];
      if (rawOpts.length < 2 || rawOpts.length > 5) { skipped++; return; }
      var answerText = stripPrefix(q.a);
      var answerLetter = optionLetter(q.a);
      var correctIndex = -1;
      var opts = rawOpts.map(function (o, i) {
        var raw = typeof o === 'string' ? o : (o && (o.t || o.text)) || '';
        var body = stripPrefix(raw);
        if (correctIndex === -1) {
          if (answerLetter && optionLetter(raw) === answerLetter) correctIndex = i;
          else if (norm(body) && norm(body) === norm(answerText)) correctIndex = i;
        }
        return { label: String.fromCharCode(65 + i), text: body };
      });
      if (correctIndex === -1) { skipped++; return; }
      opts.forEach(function (o, i) { o.correct = i === correctIndex; });
      var solution = String(q.sol || '').replace(/\s+/g, ' ').trim();
      if (!solution) solution = 'Correct answer: ' + opts[correctIndex].text + '.';
      var reused = oldCourse[courseCursor];
      courseCursor++;
      var id = reused && reused.id != null ? reused.id : nextId;
      if (id >= nextId) nextId = id + 1;
      bank.questions.push({
        id: id,
        q: (bank.questions || []).length + 1,
        section: section,
        text: text,
        options: opts,
        solution: solution,
        source: 'course',
        lesson: q._lesson || ''
      });
      used[norm(text)] = 1;
      added++;
    });

    if (added) {
      bank.sections = sections.map(function (s, i) {
        var found = (bank.sections || []).filter(function (x) { return x.name === s; })[0];
        return { name: s, color: (found && found.color) || SECTION_COLORS[i % SECTION_COLORS.length] };
      });
      if (!DRY) fs.writeFileSync(path.join(BANK_DIR, exam + '.json'), JSON.stringify(bank, null, 2) + '\n', 'utf8');
    }
    totalAdded += added;
    console.log(exam + ': +' + added + ' course questions (bank ' + bank.questions.length + ', skipped ' + skipped + ')');
  });

  console.log((DRY ? 'DRY RUN: would import ' : 'Imported ') + totalAdded + ' course question(s) into exam banks');
}

main();

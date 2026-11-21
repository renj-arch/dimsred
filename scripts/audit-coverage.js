#!/usr/bin/env node
'use strict';
// Whole-site coverage audit.
//
// One report that answers "what does the site actually cover?" across the four
// content surfaces a visitor can hit:
//
//   * exam hubs      — question bank, previous/practice papers, course lessons
//   * UPSC mains     — papers, optional subjects, language papers, fresh pool
//   * figures        — topic pages, published images, known gaps
//   * archive        — category/subject inventory and empty categories
//
// It writes data/coverage-gaps.json and prints a compact summary. Structural
// gaps (a missing course page, an exam with no bank and no papers) make
// --strict exit non-zero; sparse content that the local-model workflows are
// already filling is reported but does not fail the build.
//
//   node scripts/audit-coverage.js
//   node scripts/audit-coverage.js --strict
//   node scripts/audit-coverage.js --json

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var OUT = path.join(ROOT, 'data', 'coverage-gaps.json');
var STRICT = process.argv.includes('--strict');
var JSON_ONLY = process.argv.includes('--json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function exists(file) { try { return fs.existsSync(file); } catch (e) { return false; } }
function countFiles(dir, re) {
  if (!exists(dir)) return 0;
  return fs.readdirSync(dir).filter(function (f) { return !re || re.test(f); }).length;
}

function auditExams() {
  var configs = readJson(path.join(ROOT, 'scripts', 'exam-configs.json'), {});
  var out = [];
  var gaps = [];
  Object.keys(configs).forEach(function (id) {
    var cfg = configs[id] || {};
    var dir = cfg.dir || id;
    var bank = readJson(path.join(ROOT, 'question-bank', id + '.json'), null);
    var bankQuestions = bank && Array.isArray(bank.questions) ? bank.questions.length : 0;
    var bankSections = bank && Array.isArray(bank.sections) ? bank.sections : [];
    var emptySections = [];
    if (bank && Array.isArray(bank.questions) && bankSections.length) {
      bankSections.forEach(function (s) {
        if (!bank.questions.some(function (q) { return q && q.section === s.name; })) emptySections.push(s.name);
      });
    }
    var papers = countFiles(path.join(ROOT, dir, 'papers'), /\.html$/);
    var modules = cfg.modules || {};
    var lessonSlots = 0, lessonsPresent = 0, missingLessons = [];
    Object.keys(modules).forEach(function (mKey) {
      var mod = modules[mKey] || {};
      (mod.lessons || []).forEach(function (lesson) {
        if (!lesson || !lesson.slug) return;
        lessonSlots++;
        var rel = path.join(dir, 'course', mKey, 'lesson-' + lesson.slug + '.html');
        if (exists(path.join(ROOT, rel))) lessonsPresent++;
        else missingLessons.push(rel.replace(/\\/g, '/'));
      });
    });
    var courseIndex = exists(path.join(ROOT, dir, 'course', 'index.html'));
    var exam = {
      id: id,
      name: cfg.examName || id.toUpperCase(),
      papers: papers,
      bankQuestions: bankQuestions,
      bankSections: bankSections.length,
      emptySections: emptySections,
      courseModules: Object.keys(modules).length,
      courseLessonSlots: lessonSlots,
      courseLessonsPresent: lessonsPresent,
      courseIndex: courseIndex,
      gaps: []
    };
    if (!bankQuestions) {
      exam.gaps.push('no question bank');
      gaps.push({ area: 'exam', id: id, severity: 'high', detail: 'no question bank' });
    }
    if (!papers) {
      exam.gaps.push('no papers');
      gaps.push({ area: 'exam', id: id, severity: 'high', detail: 'no practice or previous-year papers' });
    }
    if (emptySections.length) {
      exam.gaps.push('empty bank sections: ' + emptySections.join(', '));
      gaps.push({ area: 'exam', id: id, severity: 'medium', detail: 'empty bank sections: ' + emptySections.join(', ') });
    }
    if (!courseIndex) {
      exam.gaps.push('no course index');
      gaps.push({ area: 'exam', id: id, severity: 'high', detail: 'no course index' });
    }
    if (missingLessons.length) {
      exam.gaps.push(missingLessons.length + ' missing lesson page(s)');
      gaps.push({ area: 'exam', id: id, severity: 'high', detail: 'missing lesson pages: ' + missingLessons.slice(0, 8).join(', ') });
    }
    out.push(exam);
  });
  return { exams: out, gaps: gaps };
}

function auditMains() {
  var bank = readJson(path.join(ROOT, 'data', 'mains-questions.json'), {});
  var fresh = readJson(path.join(ROOT, 'data', 'mains-fresh.json'), { items: [] });
  var papers = Array.isArray(bank.papers) ? bank.papers : [];
  var subjects = Array.isArray(bank.optionalSubjects) ? bank.optionalSubjects : [];
  var questions = Array.isArray(bank.questions) ? bank.questions : [];
  var freshItems = Array.isArray(fresh.items) ? fresh.items : [];
  var all = questions.concat(freshItems);
  var perPaper = {};
  papers.forEach(function (p) { perPaper[p.id] = 0; });
  all.forEach(function (q) { if (q && perPaper[q.paper] != null) perPaper[q.paper]++; });
  var subjectCounts = {};
  subjects.forEach(function (s) { subjectCounts[s.id] = 0; });
  all.forEach(function (q) {
    if (q && q.paper && /^optional/.test(q.paper) && subjectCounts[q.subject] != null) subjectCounts[q.subject]++;
  });
  var uncovered = Object.keys(subjectCounts).filter(function (id) { return !subjectCounts[id]; });
  var languages = {
    'lang-indian': perPaper['lang-indian'] || 0,
    'lang-english': perPaper['lang-english'] || 0
  };
  var gaps = [];
  papers.forEach(function (p) {
    if (!perPaper[p.id]) gaps.push({ area: 'mains', id: p.id, severity: 'medium', detail: 'no question/model answer yet' });
  });
  uncovered.forEach(function (id) {
    gaps.push({ area: 'mains', id: 'optional/' + id, severity: 'low', detail: 'optional subject has no practice question yet' });
  });
  if (!languages['lang-indian']) gaps.push({ area: 'mains', id: 'lang-indian', severity: 'medium', detail: 'no Hindi language paper item' });
  if (!languages['lang-english']) gaps.push({ area: 'mains', id: 'lang-english', severity: 'medium', detail: 'no English language paper item' });
  return {
    papers: papers.length,
    questions: questions.length,
    freshItems: freshItems.length,
    perPaper: perPaper,
    optionalSubjects: subjects.length,
    optionalCovered: subjects.length - uncovered.length,
    optionalUncovered: uncovered,
    languages: languages,
    gaps: gaps
  };
}

function auditFigures() {
  var figuresDir = path.join(ROOT, 'figures');
  var topicPages = countFiles(figuresDir, /^topic-.+\.html$/);
  var allPages = countFiles(figuresDir, /\.html$/);
  var published = readJson(path.join(ROOT, 'data', 'figure-published.json'), {});
  var files = published && published.files ? Object.keys(published.files).length : 0;
  var gapsFile = readJson(path.join(ROOT, 'data', 'figure-gaps.json'), {});
  var gaps = [];
  if (!topicPages) gaps.push({ area: 'figures', id: 'topics', severity: 'high', detail: 'no figure topic pages' });
  if (!exists(path.join(ROOT, 'figures.html'))) gaps.push({ area: 'figures', id: 'library', severity: 'medium', detail: 'no curated UPSC figure library page' });
  return {
    topicPages: topicPages,
    allPages: allPages,
    publishedFiles: files,
    knownGaps: Number(gapsFile.totalGaps) || 0,
    curatedLibrary: exists(path.join(ROOT, 'figures.html')),
    gaps: gaps
  };
}

function auditArchive() {
  var catalog = readJson(path.join(ROOT, 'data', 'questions', 'catalog.json'), {});
  var taxonomy = readJson(path.join(ROOT, 'data', 'archive-taxonomy.json'), { cats: {} });
  var cats = taxonomy && taxonomy.cats ? taxonomy.cats : {};
  var catIds = Object.keys(cats);
  var subjects = 0, zero = [];
  catIds.forEach(function (c) {
    var n = Number(cats[c] && cats[c].count) || 0;
    subjects += Object.keys((cats[c] && cats[c].subjects) || {}).length;
    if (!n) zero.push(c);
  });
  var gaps = [];
  zero.forEach(function (c) { gaps.push({ area: 'archive', id: c, severity: 'low', detail: 'empty archive category' }); });
  return {
    total: Number(catalog.total) || 0,
    categories: catIds.length,
    subjects: subjects,
    emptyCategories: zero,
    gaps: gaps
  };
}

function main() {
  var exam = auditExams();
  var mains = auditMains();
  var figures = auditFigures();
  var archive = auditArchive();
  var allGaps = [].concat(exam.gaps, mains.gaps, figures.gaps, archive.gaps);
  var bySeverity = { high: 0, medium: 0, low: 0 };
  allGaps.forEach(function (g) { bySeverity[g.severity] = (bySeverity[g.severity] || 0) + 1; });

  var report = {
    generatedAt: new Date().toISOString(),
    summary: {
      exams: exam.exams.length,
      examsWithBank: exam.exams.filter(function (e) { return e.bankQuestions > 0; }).length,
      examsWithPapers: exam.exams.filter(function (e) { return e.papers > 0; }).length,
      examsWithCourse: exam.exams.filter(function (e) { return e.courseIndex && e.courseLessonSlots === e.courseLessonsPresent; }).length,
      examQuestions: exam.exams.reduce(function (n, e) { return n + e.bankQuestions; }, 0),
      examPapers: exam.exams.reduce(function (n, e) { return n + e.papers; }, 0),
      mainsPapers: mains.papers,
      mainsQuestions: mains.questions + mains.freshItems,
      optionalSubjects: mains.optionalSubjects,
      optionalCovered: mains.optionalCovered,
      figureTopicPages: figures.topicPages,
      archiveQuestions: archive.total,
      archiveCategories: archive.categories,
      gaps: allGaps.length,
      bySeverity: bySeverity
    },
    exams: exam.exams,
    mains: mains,
    figures: figures,
    archive: archive,
    gaps: allGaps
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (JSON_ONLY) {
    console.log(JSON.stringify(report.summary, null, 2));
  } else {
    console.log('=== SITE COVERAGE ===');
    console.log('exams: ' + report.summary.examsWithBank + '/' + report.summary.exams + ' with banks, ' +
      report.summary.examsWithPapers + '/' + report.summary.exams + ' with papers, ' +
      report.summary.examsWithCourse + '/' + report.summary.exams + ' with complete courses');
    console.log('questions in banks: ' + report.summary.examQuestions.toLocaleString('en-US') + ' · papers: ' + report.summary.examPapers);
    console.log('mains: ' + report.summary.mainsPapers + ' papers, ' + report.summary.mainsQuestions + ' questions · optional ' +
      report.summary.optionalCovered + '/' + report.summary.optionalSubjects + ' covered');
    console.log('figures: ' + report.summary.figureTopicPages + ' topic pages · archive: ' +
      report.summary.archiveQuestions.toLocaleString('en-US') + ' questions in ' + report.summary.archiveCategories + ' categories');
    console.log('gaps: ' + allGaps.length + ' (high ' + bySeverity.high + ', medium ' + bySeverity.medium + ', low ' + bySeverity.low + ')');
    console.log('report: data/coverage-gaps.json');
    if (allGaps.length) {
      console.log('\n=== OPEN GAPS ===');
      allGaps.slice(0, 40).forEach(function (g) {
        console.log('  [' + g.severity + '] ' + g.area + '/' + g.id + ': ' + g.detail);
      });
      if (allGaps.length > 40) console.log('  ... ' + (allGaps.length - 40) + ' more in data/coverage-gaps.json');
    }
  }

  if (STRICT && bySeverity.high) process.exit(1);
}

main();

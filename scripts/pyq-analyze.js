// PYQ pattern analyzer: merges the real previous-year-paper weightage tables
// (scripts/pyq-weightage.json) with the site's exam-pattern tables
// (scripts/exam-patterns.json) into one runtime file the exam tutor and the
// improve board can consume: top topics per exam, paper structure, and
// "priorities" — what to study first, ranked by published PYQ share.
//
// Usage: node scripts/pyq-analyze.js
// CI:    wired into fault-status.yml before fault-report.js
// Out:   data/pyq-patterns.json

const fs = require('fs');
const path = require('path');

const WEIGHTAGE = path.join(__dirname, 'pyq-weightage.json');
const PATTERNS = path.join(__dirname, 'exam-patterns.json');
const OUT = path.join(__dirname, '..', 'data', 'pyq-patterns.json');

// exam-key in weightage -> which site pages care (exam-tutor PAGE ids)
const PAGE_MAP = {
  'upsc-prelims': ['ask', 'mains'],
  'ssc-je-mech': ['ssc'],
  'ssc-cgl-tier1': ['mental'],
  'neet-biology': ['science'],
  'jee-physics': ['physics', 'math', 'chemistry']
};

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return fallback; }
}

// Flatten each exam's weightage table into [{topic, weight, detail}]
// Different exams store numbers under different keys (subjects/chapters/sections).
function topTopics(examKey, exam) {
  const out = [];
  if (exam.subjects) {
    Object.keys(exam.subjects).forEach(function (name) {
      const s = exam.subjects[name] || {};
      const weight = s.share != null ? s.share
        : Math.max(s.cbt2_2023 || 0, s.cbt1_2020_2023 || 0, s.cbt1_2024 || 0, s.cbt2_2024 || 0);
      if (!weight) return;
      out.push({
        topic: name,
        weight: weight,
        unit: s.share != null ? 'share%' : 'maxQ',
        detail: s.share != null
          ? s.share + '% of paper' + (s.trend ? ' (trend ' + s.trend + ')' : '')
          : 'up to ' + weight + ' Q in recent papers'
      });
    });
  } else if (exam.chapters) {
    Object.keys(exam.chapters).forEach(function (name) {
      const c = exam.chapters[name] || {};
      const weight = c.share != null ? c.share
        : Math.max(c.fiveYear || 0, c.max || 0);
      if (!weight) return;
      out.push({
        topic: name,
        weight: weight,
        unit: c.share != null ? 'share%' : (c.fiveYear != null ? '5yQ' : 'maxQ'),
        detail: c.fiveYear != null
          ? c.fiveYear + ' Q over 5 years' + (c.share != null ? ' (' + c.share + '%)' : '')
          : c.min != null ? c.min + '–' + c.max + ' Q per paper'
            : c.share + '% of paper'
      });
    });
  } else if (exam.sections) {
    // CGL-style: section -> topic -> {min,max}
    Object.keys(exam.sections).forEach(function (section) {
      const topics = exam.sections[section] || {};
      Object.keys(topics).forEach(function (name) {
        const t = topics[name] || {};
        const weight = t.max != null ? t.max : 0;
        if (!weight) return;
        out.push({
          topic: name,
          weight: weight,
          unit: 'maxQ',
          detail: section + ': ' + (t.min != null ? t.min + '–' + t.max : t.max) + ' Q per paper'
        });
      });
    });
  }
  out.sort(function (a, b) { return b.weight - a.weight; });
  return out.slice(0, 12);
}

// Priorities = top topics, but capped at what one human can actually revise,
// and annotated with whether the site already has a covering wiki category.
function priorities(top, examKey) {
  return top.slice(0, 8).map(function (t, i) {
    return {
      rank: i + 1,
      topic: t.topic,
      weight: t.weight,
      unit: t.unit,
      why: 'PYQ rank #' + (i + 1) + ' — ' + t.detail
    };
  });
}

function main() {
  const w = loadJson(WEIGHTAGE, null);
  const p = loadJson(PATTERNS, null);
  if (!w || !w.exams) {
    console.error('pyq-analyze: scripts/pyq-weightage.json missing or empty');
    process.exit(1);
  }

  const exams = {};
  Object.keys(w.exams).forEach(function (key) {
    const exam = w.exams[key];
    const top = topTopics(key, exam);
    exams[key] = {
      name: exam.name || key,
      window: exam.window || '',
      totalQuestionsAnalyzed: exam.totalQuestionsAnalyzed || null,
      sources: exam.sources || (exam.source ? [exam.source] : []),
      insights: exam.insights || [],
      topTopics: top,
      priorities: priorities(top, key),
      pages: PAGE_MAP[key] || [],
      pattern: null
    };
    // attach paper structure when a matching exam-patterns key exists
    if (p) {
      const patKey = key.indexOf('ssc-je') === 0 ? 'ssc-je'
        : key.indexOf('ssc-cgl') === 0 ? 'cgl'
          : key.indexOf('neet') === 0 ? 'neet'
            : key.indexOf('jee') === 0 ? 'jee'
              : key.indexOf('upsc') === 0 ? 'upsc' : null;
      if (patKey && p[patKey]) {
        exams[key].pattern = {
          fullName: p[patKey].fullName,
          totalQuestions: p[patKey].totalQuestions,
          durationMinutes: p[patKey].durationMinutes,
          negativeMarkingDisplay: p[patKey].negativeMarkingDisplay,
          sections: p[patKey].sections
        };
      }
    }
  });

  const report = {
    generated: new Date().toISOString().slice(0, 10),
    note: 'Derived from scripts/pyq-weightage.json (real published PYQ analyses) + scripts/exam-patterns.json. Consumed by js/exam-tutor.js for "Most asked in past papers" chips and generator prompt bias.',
    exams: exams
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');
  const n = Object.keys(exams).length;
  console.log('pyq-analyze: ' + n + ' exam(s) · ' +
    Object.keys(exams).map(function (k) {
      return k + ' (' + exams[k].topTopics.length + ' topics)';
    }).join(' · ') + ' -> ' + OUT);
}

main();

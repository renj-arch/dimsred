// Exam blueprints drive both daily practice sets and full-length mock papers.
// A blueprint is the real paper structure (papers, sections, counts, marks,
// duration, negative marking) with a source for every number. Anything the
// repo could not verify against an official/native source is flagged
// provisional so a reader (and the UI) can tell the difference.
const fs = require('fs');
const path = require('path');

function load(root) {
  root = root || path.resolve(__dirname, '..', '..');
  var file = path.join(root, 'data', 'exam-blueprints.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function exam(bp, key) {
  var e = bp && bp.exams && bp.exams[key];
  if (!e) throw new Error('no blueprint for exam "' + key + '"');
  return e;
}

function papers(bp, key) {
  return exam(bp, key).papers || [];
}

function paper(bp, key, paperId) {
  var list = papers(bp, key);
  if (!paperId) return list[0];
  for (var i = 0; i < list.length; i++) if (list[i].id === paperId) return list[i];
  throw new Error('no paper "' + paperId + '" for exam "' + key + '"');
}

// Rotate papers for multi-paper exams (UPSC GS1/CSAT, NDA, CDS) so daily
// practice does not keep sampling the same paper.
function paperForDaily(bp, key, setNumber) {
  var list = papers(bp, key);
  if (!list.length) throw new Error('exam "' + key + '" has no papers');
  return list[Math.max(0, (setNumber || 1) - 1) % list.length];
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sectionAccepts(section, bankSection) {
  var b = norm(bankSection);
  if (!b) return false;
  var names = (section.bank && section.bank.length) ? section.bank : [section.name];
  for (var i = 0; i < names.length; i++) {
    if (norm(names[i]) === b) return true;
  }
  return false;
}

// Proportional split of a short daily set across the real sections. Largest
// remainder keeps the total exact; every non-zero section gets at least one
// question whenever the total allows it.
function allocate(total, sections) {
  var live = (sections || []).filter(function (s) { return (s.count || 0) > 0; });
  var base = live.reduce(function (a, s) { return a + s.count; }, 0);
  if (!base) return [];
  var out = live.map(function (s) {
    var raw = total * s.count / base;
    return { section: s, count: Math.floor(raw), rest: raw - Math.floor(raw) };
  });
  var used = out.reduce(function (a, x) { return a + x.count; }, 0);
  out.sort(function (a, b) { return b.rest - a.rest; });
  var i = 0;
  while (used < total) { out[i % out.length].count++; used++; i++; }
  if (total >= live.length) {
    out.forEach(function (x) { if (x.count === 0) x.count = 1; });
    var over = out.reduce(function (a, x) { return a + x.count; }, 0) - total;
    out.sort(function (a, b) { return b.count - a.count; });
    while (over > 0) {
      for (var j = 0; j < out.length && over > 0; j++) {
        if (out[j].count > 1) { out[j].count--; over--; }
      }
    }
  }
  return out.filter(function (x) { return x.count > 0; })
    .map(function (x) { return { name: x.section.name, count: x.count, bank: (x.section.bank && x.section.bank.length) ? x.section.bank : [x.section.name] }; });
}

function verify(paperObj) {
  var sum = (paperObj.sections || []).reduce(function (a, s) { return a + (s.count || 0); }, 0);
  return { ok: sum === paperObj.total, sum: sum, total: paperObj.total };
}

module.exports = { load: load, exam: exam, papers: papers, paper: paper, paperForDaily: paperForDaily, sectionAccepts: sectionAccepts, allocate: allocate, verify: verify, norm: norm };

// Blueprint integrity guard. The full-paper lane and daily-practice generator
// both trust data/exam-blueprints.json, so a typo in a section count, a missing
// source, or a descriptive paper accidentally left in the MCQ rotation would
// publish a wrong pattern. This test checks the real file, not a fixture.
const assert = require('assert');
const path = require('path');
const bp = require('./exam-blueprint');

const root = path.resolve(__dirname, '..', '..');
const blueprints = bp.load(root);

function sum(list, field) {
  return (list || []).reduce(function (n, x) { return n + (x[field] || 0); }, 0);
}

let papers = 0;
for (const key of Object.keys(blueprints.exams)) {
  const exam = blueprints.exams[key];
  assert(Array.isArray(exam.papers) && exam.papers.length, key + ': no papers');
  const ids = {};
  for (const p of exam.papers) {
    papers++;
    assert(!ids[p.id], key + ': duplicate paper id ' + p.id);
    ids[p.id] = 1;
    assert(p.id && p.name, key + ': paper without id/name');
    assert(p.source && p.source.length > 40, key + ':' + p.id + ': missing or too-short source');

    const counts = sum(p.sections, 'count');
    assert.strictEqual(counts, p.total, key + ':' + p.id + ': section counts ' + counts + ' != total ' + p.total);
    const marks = sum(p.sections, 'marks');
    assert.strictEqual(marks, p.marks, key + ':' + p.id + ': section marks ' + marks + ' != paper marks ' + p.marks);

    if (p.mode === 'descriptive' || p.mode === 'mixed') {
      assert.strictEqual(p.mcqLane, false, key + ':' + p.id + ': descriptive/mixed paper must set mcqLane false');
    }
    if (p.mcqLane !== false) {
      for (const s of p.sections) {
        assert(!s.descriptive, key + ':' + p.id + ':' + s.name + ': descriptive section in an MCQ paper');
        if (!p.provisional) {
          assert(Array.isArray(s.bank) && s.bank.length, key + ':' + p.id + ':' + s.name + ': MCQ section has no bank names');
        }
      }
    }
    if (p.daily !== false) {
      assert(p.mcqLane !== false, key + ':' + p.id + ': non-MCQ paper cannot be in daily rotation');
    }
  }
}

// paperForDaily must skip reference-only papers and still rotate the real ones.
const upsc = bp.paperForDaily(blueprints, 'upsc', 1);
assert.strictEqual(upsc.id, 'gs1');
assert.strictEqual(bp.paperForDaily(blueprints, 'upsc', 2).id, 'csat');
assert.strictEqual(bp.paperForDaily(blueprints, 'upsc', 3).id, 'gs1', 'UPSC rotation must wrap without Mains');
assert.strictEqual(bp.paperForDaily(blueprints, 'jee', 1).id, 'paper1', 'JEE daily rotation must skip Paper 2A/2B');
assert.strictEqual(bp.paperForDaily(blueprints, 'cgl', 1).id, 'tier1', 'CGL daily rotation must skip Tier II until its bank is ready');
assert.strictEqual(bp.paperForDaily(blueprints, 'rbi', 1).id, 'phase1', 'RBI daily rotation must skip Phase II');

// The Paper 2 additions must exist and keep their verified shapes.
assert.strictEqual(bp.paper(blueprints, 'cgl', 'tier2').total, 150);
assert.strictEqual(bp.paper(blueprints, 'ctet', 'paper2').total, 150);
assert.strictEqual(bp.paper(blueprints, 'ctet', 'paper2-social').total, 150);
assert.strictEqual(bp.paper(blueprints, 'jee', 'paper2b').total, 100);
assert.strictEqual(bp.paper(blueprints, 'jee', 'paper2a').mcqLane, false);
assert.strictEqual(bp.paper(blueprints, 'upsc', 'mains').mcqLane, false);
assert.strictEqual(bp.paper(blueprints, 'rbi', 'phase2').mcqLane, false);

console.log('PASS  exam blueprints: ' + papers + ' papers, counts and marks balance, MCQ rotation excludes descriptive papers');

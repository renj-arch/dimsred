'use strict';
// Regression tests for the curated question-category mover.
//
//   node scripts/lib/question-category-moves.test.js
//
// The mover must never guess: a missing category, changed shard, or evidence
// that is not literally in the moved questions has to fail closed.

const fs = require('fs');
const os = require('os');
const path = require('path');
const moves = require('./question-category-moves');

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}
function throws(fn, needle, label) {
  try {
    fn();
    assert(false, label, 'expected an error');
  } catch (e) {
    assert(String(e.message).indexOf(needle) !== -1, label, e.message);
  }
}

const ROOT = path.join(__dirname, '..', '..');

console.log('\n--- the shipped move registry is reviewable and specific ---');
(function () {
  let reg = null;
  try { reg = moves.loadRegistry(ROOT); } catch (e) { assert(false, 'registry loads', e.message); }
  if (!reg) return;
  assert(reg.version === 1, 'registry version is 1');
  assert(Array.isArray(reg.moves), 'registry moves is an array (empty allowed)');
  try {
    moves.validateRegistry(reg);
    assert(true, 'every move passes structural validation');
  } catch (e) {
    assert(false, 'every move passes structural validation', e.message);
  }
  // The ARP4761 move was real, but the refreshed corpus no longer contains the
  // subtopic on either side. It must stay recorded for audit and must not be
  // replayed as an active move (that made the Question Quality gate fail).
  const arp = (reg.retired || []).filter(m => m.subSubject === 'ARP4761')[0];
  assert(!!arp, 'the resolved ARP4761 move is recorded as retired');
  assert(!reg.moves.some(m => m.subSubject === 'ARP4761'), 'the ARP4761 move is not replayed');
  if (arp) {
    assert(arp.from === 'Indian Languages' && arp.to === 'Indian Aviation & Shipping',
      'ARP4761 retired from Indian Languages to Indian Aviation & Shipping');
    assert(arp.evidence.length >= 2, 'ARP4761 move keeps literal evidence');
    assert(arp.timelineUndated === true, 'the bogus 1309 timeline year is explicitly dropped');
    assert(String(arp.retiredReason || '').length >= 20, 'the retirement explains itself');
  }
})();

console.log('\n--- invalid moves are refused, not guessed ---');
(function () {
  const base = {
    id: 'test-move', subSubject: 'ARP4761', from: 'Indian Languages',
    to: 'Indian Aviation & Shipping',
    fromFile: 'data/questions/indian-languages-4.json',
    toFile: 'data/questions/indian-aviation-shipping-9.json',
    evidence: ['Aerospace Recommended Practice from SAE International', 'Civil Aircraft'],
    reason: 'The subtopic is aerospace engineering and does not belong to Indian Languages.',
    approvedBy: 'test', approvedAt: '2026-11-02'
  };
  throws(() => moves.validateMove(Object.assign({}, base, { toFile: 'data/questions/../../evil.json' })),
    'must be a data/questions', 'path traversal is rejected');
  throws(() => moves.validateMove(Object.assign({}, base, { fromFile: 'data/questions/world-geography-4.json' })),
    'does not match the source category slug', 'a mismatched source shard is rejected');
  throws(() => moves.validateMove(Object.assign({}, base, { evidence: ['too short'] })),
    'at least two literal evidence', 'thin evidence is rejected');
  const source = { 'Indian Languages': { subSubjects: { ARP4761: [{ question: 'x', fact: 'unrelated text' }] } } };
  throws(() => moves.validateMove(base, { sourceData: source }),
    'evidence not present', 'evidence missing from the actual questions is rejected');
})();

console.log('\n--- a valid move is applied, de-duplicated and reversible by inspection ---');
(function () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qcm-'));
  try {
    fs.mkdirSync(path.join(root, 'data', 'questions'), { recursive: true });
    const move = {
      id: 'arp4761-indian-aviation',
      subSubject: 'ARP4761',
      from: 'Indian Languages',
      to: 'Indian Aviation & Shipping',
      fromFile: 'data/questions/indian-languages-4.json',
      toFile: 'data/questions/indian-aviation-shipping-9.json',
      timelineNode: 'indian-languages-4|ARP4761',
      timelineUndated: true,
      reason: 'ARP4761 is an aerospace engineering standard, not an Indian language topic.',
      evidence: ['Aerospace Recommended Practice from SAE International', 'Civil Aircraft'],
      approvedBy: 'test', approvedAt: '2026-11-02'
    };
    fs.writeFileSync(path.join(root, 'data', 'category-moves.json'),
      JSON.stringify({ version: 1, moves: [move] }));
    fs.writeFileSync(path.join(root, 'data', 'questions', 'indian-languages-4.json'), JSON.stringify({
      'Indian Languages': { subSubjects: { ARP4761: [
        { id: 'q1', category: 'Indian Languages', subject: 'Indian Languages', subSubject: 'ARP4761',
          question: 'What is ARP4761?',
          answer: 'an Aerospace Recommended Practice from SAE International',
          fact: 'ARP4761 covers Civil Aircraft safety assessment.',
          relevance: 'high', examScope: 'exam' }
      ] } }
    }));
    fs.writeFileSync(path.join(root, 'data', 'questions', 'indian-aviation-shipping-9.json'), JSON.stringify({
      'Indian Aviation & Shipping': { subSubjects: {} }
    }));
    fs.writeFileSync(path.join(root, 'data', 'timeline.nodes.0.json'), JSON.stringify([{
      id: 'indian-languages-4|ARP4761', name: 'ARP4761', type: 'concept',
      span: { min: 1309, max: 1309 }, era: 'medieval',
      cats: [{ key: 'indian-languages-4', label: 'Indian Languages', count: 1 }], count: 1
    }]));

    const out = moves.applyRegistry({ root: root });
    assert(out.applied.length === 1 && out.applied[0].moved === 1, 'one question is moved');
    const src = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions', 'indian-languages-4.json'), 'utf8'));
    const dst = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions', 'indian-aviation-shipping-9.json'), 'utf8'));
    assert(!src['Indian Languages'].subSubjects.ARP4761, 'the source subtopic is removed');
    const q = dst['Indian Aviation & Shipping'].subSubjects.ARP4761[0];
    assert(q.category === 'Indian Aviation & Shipping' && q.subject === 'Indian Aviation & Shipping',
      'the moved question carries the target category');
    assert(!q.relevance && !q.examScope, 'stale scope tags are cleared for reclassification');
    const tl = JSON.parse(fs.readFileSync(path.join(root, 'data', 'timeline.nodes.0.json'), 'utf8'))[0];
    assert(tl.cats[0].key === 'indian-aviation-shipping-9' && tl.cats[0].label === 'Indian Aviation & Shipping',
      'the timeline node carries the target category key');
    assert(tl.timebase === 'undated' && !tl.span && !tl.era,
      'the bogus 1309 timeline date is dropped instead of replaced with a guess');

    const again = moves.applyRegistry({ root: root });
    assert(again.applied.length === 1 && again.applied[0].alreadyApplied === true,
      're-running the same registry is a no-op');
  } catch (e) {
    assert(false, 'fixture move completes', e.stack);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})();

console.log('\n--- collisions and missing targets fail closed ---');
(function () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qcm-'));
  try {
    fs.mkdirSync(path.join(root, 'data', 'questions'), { recursive: true });
    const move = {
      id: 'collision-test', subSubject: 'ARP4761', from: 'Indian Languages',
      to: 'Indian Aviation & Shipping',
      fromFile: 'data/questions/indian-languages-4.json',
      toFile: 'data/questions/indian-aviation-shipping-9.json',
      reason: 'A collision must stop the mover before it duplicates or overwrites questions.',
      evidence: ['Aerospace Recommended Practice from SAE International', 'Civil Aircraft'],
      approvedBy: 'test', approvedAt: '2026-11-02'
    };
    fs.writeFileSync(path.join(root, 'data', 'category-moves.json'),
      JSON.stringify({ version: 1, moves: [move] }));
    fs.writeFileSync(path.join(root, 'data', 'questions', 'indian-languages-4.json'), JSON.stringify({
      'Indian Languages': { subSubjects: { ARP4761: [{
        id: 'q1', question: 'ARP4761',
        answer: 'an Aerospace Recommended Practice from SAE International',
        fact: 'ARP4761 covers Civil Aircraft.'
      }] } }
    }));
    fs.writeFileSync(path.join(root, 'data', 'questions', 'indian-aviation-shipping-9.json'), JSON.stringify({
      'Indian Aviation & Shipping': { subSubjects: { ARP4761: [{ id: 'q2' }] } }
    }));
    throws(() => moves.applyRegistry({ root: root }),
      'exists in both source and target', 'a duplicate target subtopic is rejected');
  } catch (e) {
    assert(false, 'collision fixture runs', e.stack);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  const root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'qcm-'));
  try {
    fs.mkdirSync(path.join(root2, 'data', 'questions'), { recursive: true });
    fs.writeFileSync(path.join(root2, 'data', 'category-moves.json'), JSON.stringify({
      version: 1,
      moves: [{
        id: 'missing-target', subSubject: 'ARP4761', from: 'Indian Languages',
        to: 'Indian Aviation & Shipping',
        fromFile: 'data/questions/indian-languages-4.json',
        toFile: 'data/questions/indian-aviation-shipping-9.json',
        reason: 'A target category that does not exist must not be created silently.',
        evidence: ['Aerospace Recommended Practice from SAE International', 'Civil Aircraft'],
        approvedBy: 'test', approvedAt: '2026-11-02'
      }]
    }));
    fs.writeFileSync(path.join(root2, 'data', 'questions', 'indian-languages-4.json'), JSON.stringify({
      'Indian Languages': { subSubjects: { ARP4761: [{
        id: 'q1', question: 'ARP4761',
        answer: 'an Aerospace Recommended Practice from SAE International',
        fact: 'ARP4761 covers Civil Aircraft.'
      }] } }
    }));
    throws(() => moves.applyRegistry({ root: root2 }),
      'does not exist', 'a missing target category is rejected without createTarget');
  } catch (e) {
    assert(false, 'missing-target fixture runs', e.stack);
  } finally {
    fs.rmSync(root2, { recursive: true, force: true });
  }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

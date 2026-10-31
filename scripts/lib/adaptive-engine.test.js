'use strict';
// Regression suite for js/adaptive-engine.js.
//
// The engine decides what a student should study next, so the cases below pin
// the properties that would quietly produce bad advice: 100% mastery after one
// lucky answer, stale results never resurfacing, paper results leaking into
// topic accuracy, or a "new" action pointing at a topic that does not exist.
//
//   node scripts/lib/adaptive-engine.test.js
const AE = require('../../js/adaptive-engine.js');

const NOW = '2026-10-31T12:00:00.000Z';
const DAY = 86400000;

function daysAgo(n) {
  return new Date(new Date(NOW).getTime() - n * DAY).toISOString();
}

const TOPICS = {
  cgl: {
    name: 'SSC CGL',
    sections: [
      { name: 'Mathematics', count: 24 },
      { name: 'English', count: 15 },
      { name: 'General Awareness', count: 9 }
    ]
  },
  rbi: {
    name: 'RBI Grade B',
    sections: [
      { name: 'Economic and Social Issues', count: 12 },
      { name: 'Finance and Management', count: 8 }
    ]
  }
};

function micro(exam, examName, topic, correct, total, when) {
  return {
    exam: exam, examName: examName, topic: topic,
    correct: correct, wrong: total - correct, total: total,
    pct: Math.round(correct / total * 100), date: when
  };
}

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

console.log('--- empty history still yields a usable plan ---');
(function () {
  const p = AE.buildProfile({ topics: TOPICS, now: NOW });
  assert(p.summary.topicsTotal === 5, 'all syllabus topics counted', p.summary.topicsTotal);
  assert(p.summary.topicsPractised === 0, 'nothing practised yet', p.summary.topicsPractised);
  assert(p.summary.microAccuracy === null, 'accuracy is null, not zero', p.summary.microAccuracy);

  const plan = AE.buildPlan(p, { limit: 4 });
  assert(plan.length === 4, 'plan fills to the requested limit', plan.length);
  assert(plan.every(function (a) { return a.kind === 'new'; }), 'all actions are new topics');
  assert(plan.every(function (a) { return a.href.indexOf('micro-test.html?exam=') === 0; }),
    'every action deep-links to its exam', JSON.stringify(plan.map(function (a) { return a.href; })));
  assert(new Set(plan.map(function (a) { return a.exam + '|' + a.topic; })).size === plan.length,
    'no duplicate actions');
})();

console.log('\n--- a weak topic is prioritised ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS,
    now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'Mathematics', 3, 10, daysAgo(2))]
  });
  const st = p.topicByKey['cgl|Mathematics'];
  assert(st.status === 'weak', 'status is weak', st.status);
  assert(Math.abs(st.accuracy - 0.3) < 1e-9, 'accuracy is 30%', st.accuracy);
  assert(st.mastery < 0.5, 'mastery stays below 50%', st.mastery);
  assert(p.summary.weak === 1 && p.summary.due === 0,
    'a weak topic is not also counted as due',
    'weak=' + p.summary.weak + ' due=' + p.summary.due);

  const plan = AE.buildPlan(p, { limit: 3 });
  assert(plan[0].kind === 'weak' && plan[0].topic === 'Mathematics',
    'weak topic leads the plan', JSON.stringify(plan[0]));
  assert(plan[0].reason.indexOf('30%') !== -1, 'reason quotes the accuracy', plan[0].reason);
})();

console.log('\n--- a strong recent topic is not nagged ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS,
    now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'English', 9, 10, daysAgo(1))]
  });
  const st = p.topicByKey['cgl|English'];
  assert(st.status !== 'weak', 'one good test is not called weak', st.status);
  assert(st.dueIn > 0, 'not due yet', st.dueIn);
  const plan = AE.buildPlan(p, { limit: 5 });
  assert(!plan.some(function (a) { return a.exam === 'cgl' && a.topic === 'English'; }),
    'recent strong topic is absent from the plan');
})();

console.log('\n--- strength requires repeat evidence ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS,
    now: NOW,
    micro: [
      micro('cgl', 'SSC CGL', 'English', 9, 10, daysAgo(5)),
      micro('cgl', 'SSC CGL', 'English', 8, 10, daysAgo(1))
    ]
  });
  assert(p.topicByKey['cgl|English'].status === 'strong',
    'two strong sittings mark the topic strong', p.topicByKey['cgl|English'].status);
})();

console.log('\n--- stale evidence comes back as review ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS,
    now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'English', 9, 10, daysAgo(40))]
  });
  const st = p.topicByKey['cgl|English'];
  assert(st.dueIn < 0, 'review is overdue', st.dueIn);
  const plan = AE.buildPlan(p, { limit: 5 });
  const hit = plan.filter(function (a) { return a.exam === 'cgl' && a.topic === 'English'; })[0];
  assert(!!hit, 'overdue topic appears in the plan');
  assert(hit && hit.kind === 'review', 'it is a review, not a new topic', hit && hit.kind);
})();

console.log('\n--- mastery decays with age ---');
(function () {
  const recent = AE.buildProfile({
    topics: TOPICS, now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'Mathematics', 8, 10, daysAgo(1))]
  }).topicByKey['cgl|Mathematics'];
  const old = AE.buildProfile({
    topics: TOPICS, now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'Mathematics', 8, 10, daysAgo(60))]
  }).topicByKey['cgl|Mathematics'];
  assert(old.mastery < recent.mastery,
    'same score, older evidence has lower mastery',
    old.mastery + ' vs ' + recent.mastery);
})();

console.log('\n--- repeated attempts merge instead of overwriting ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS, now: NOW,
    micro: [
      micro('cgl', 'SSC CGL', 'Mathematics', 4, 10, daysAgo(10)),
      micro('cgl', 'SSC CGL', 'Mathematics', 8, 10, daysAgo(3))
    ]
  });
  const st = p.topicByKey['cgl|Mathematics'];
  assert(st.attempts === 2, 'two attempts recorded', st.attempts);
  assert(st.correct === 12 && st.total === 20, 'correct and total accumulate',
    st.correct + '/' + st.total);
  assert(Math.abs(st.accuracy - 0.6) < 1e-9, 'accuracy is 12/20', st.accuracy);
})();

console.log('\n--- paper results stay at exam level ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS, now: NOW,
    papers: [{ exam: 'SSC CGL', paperId: 'p1', date: daysAgo(1), correct: 8, answered: 10, total: 10 }]
  });
  assert(p.summary.paperAccuracy === 0.8, 'paper accuracy is 80%', p.summary.paperAccuracy);
  assert(p.summary.papers === 1, 'paper counted', p.summary.papers);
  assert(p.topics.every(function (st) { return st.attempts === 0; }),
    'no topic gains attempts from a paper');
})();

console.log('\n--- wrong answers aggregate by section ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS, now: NOW,
    wrong: [
      { exam: 'SSC CGL', section: 'Mathematics', date: daysAgo(1) },
      { exam: 'SSC CGL', section: 'Mathematics', date: daysAgo(2) },
      { exam: 'SSC CGL', section: 'English', date: daysAgo(3) }
    ]
  });
  assert(p.errors[0].section === 'Mathematics' && p.errors[0].count === 2,
    'most frequent error section leads', JSON.stringify(p.errors));
})();

console.log('\n--- history survives a syllabus rebuild ---');
(function () {
  const p = AE.buildProfile({
    topics: TOPICS, now: NOW,
    micro: [micro('cgl', 'SSC CGL', 'Removed Topic', 2, 5, daysAgo(5))]
  });
  const st = p.topicByKey['cgl|Removed Topic'];
  assert(!!st, 'removed topic is retained');
  assert(st && st.attempts === 1, 'its attempts are kept', st && st.attempts);
  assert(st && st.available === 0, 'no questions are claimed for it', st && st.available);
})();

console.log('\n--- maths helpers ---');
(function () {
  assert(Math.abs(AE.smoothAccuracy(1, 1) - 2 / 3) < 1e-9,
    'one correct answer is not 100% mastery', AE.smoothAccuracy(1, 1));
  assert(AE.nextReviewDays(1, 0.9) === 14, 'first strong result waits 14 days');
  assert(AE.nextReviewDays(3, 0.9) === 28, 'three attempts double the interval');
  assert(AE.nextReviewDays(6, 0.9) === 42, 'six attempts triple the interval');
  assert(AE.nextReviewDays(1, 0.2) === 2, 'a weak result returns in 2 days');
  assert(AE.recencyFactor(0) === 1, 'today has full recency');
  assert(AE.recencyFactor(3650) === 0.4, 'recency never falls below the floor');
})();

console.log('\n--- reasons use correct grammar for a single question ---');
(function () {
  const p = AE.buildProfile({
    topics: { cgl: { name: 'SSC CGL', sections: [{ name: 'Only Topic', count: 1 }] } },
    now: NOW
  });
  const plan = AE.buildPlan(p, { limit: 1 });
  assert(plan[0].reason.indexOf('1 question available') !== -1,
    'singular question, not "1 questions"', plan[0].reason);
})();

console.log('\n--- deep links are encoded ---');
(function () {
  const href = AE.practiceHref('cgl', 'General Awareness & Current Events', 15);
  assert(href.indexOf('exam=cgl') !== -1, 'exam encoded');
  assert(href.indexOf('n=15') !== -1, 'count encoded');
  assert(href.indexOf(' ') === -1, 'no raw spaces in the href', href);
  assert(href.indexOf('&topic=General%20Awareness%20%26%20Current%20Events') !== -1,
    'topic fully encoded', href);
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

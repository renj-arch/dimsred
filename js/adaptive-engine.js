// adaptive-engine.js — turn practice history into a ranked study plan.
//
// Pure logic, no DOM. It reads the two stores the site already writes:
//   microtest_results  { exam, examName, topic, correct, wrong, total, pct, date }
//   studypro_results   { exam, paperId, date, correct, wrong, total, answered, ... }
// plus data/topic-index.json for the syllabus (exam -> sections/topics).
//
// It does not invent questions or facts: every action links to the existing
// micro-test for that exact exam and topic.
//
// Mastery is deliberately simple and explainable:
//   accuracy   = correct / total
//   smoothed   = (correct + 1) / (total + 2)        // Laplace, avoids 100% on 1/1
//   recency    = max(0.4, 0.5 ^ (daysSince / 30))   // 30-day half-life, floored
//   mastery    = smoothed * (0.6 + 0.4 * recency)   // old evidence decays
//   confidence = min(1, total / 12)                 // 12+ questions = full weight
//
// Review intervals grow with accuracy and repeat attempts:
//   accuracy < 50% -> 2 days, < 65% -> 4, < 80% -> 7, otherwise 14
//   x2 after 3 attempts, x3 after 6
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdaptiveEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var DAY = 86400000;

  // Preferred order for suggesting brand-new topics. Only exams present in the
  // topic index are used, so adding an exam needs no change here.
  var EXAM_ORDER = ['upsc', 'cgl', 'rbi', 'ibps-po', 'sbi-clerk', 'neet', 'jee',
    'gate', 'ctet', 'nda', 'cds', 'clat', 'agniveer', 'ssc-gd', 'kerala-psc'];

  function parseDate(value) {
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function topicKey(exam, topic) { return exam + '|' + topic; }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function daysBetween(from, to) { return (to.getTime() - from.getTime()) / DAY; }

  function smoothAccuracy(correct, total) {
    return (correct + 1) / (total + 2);
  }

  function recencyFactor(daysSince) {
    if (!isFinite(daysSince) || daysSince < 0) daysSince = 0;
    return Math.max(0.4, Math.pow(0.5, daysSince / 30));
  }

  function nextReviewDays(attempts, accuracy) {
    var base = accuracy >= 0.8 ? 14 : accuracy >= 0.65 ? 7 : accuracy >= 0.5 ? 4 : 2;
    var growth = attempts >= 6 ? 3 : attempts >= 3 ? 2 : 1;
    return base * growth;
  }

  function practiceHref(exam, topic, count) {
    return 'micro-test.html?exam=' + encodeURIComponent(exam) +
      '&topic=' + encodeURIComponent(topic) +
      '&n=' + (count || 10);
  }

  function newTopicStat(examKey, examName, topic, available) {
    return {
      key: topicKey(examKey, topic),
      exam: examKey,
      examName: examName,
      topic: topic,
      available: available || 0,
      attempts: 0,
      correct: 0,
      total: 0,
      lastSeen: null,
      accuracy: null,
      mastery: null,
      confidence: 0,
      nextReviewDays: null,
      dueIn: null,
      status: 'new'
    };
  }

  function buildProfile(input) {
    input = input || {};
    var micro = input.micro || [];
    var papers = input.papers || [];
    var wrong = input.wrong || [];
    var topics = input.topics || {};
    var now = input.now ? new Date(input.now) : new Date();

    var stats = {};
    var exams = {};

    function examStat(key, name) {
      if (!exams[key]) {
        exams[key] = {
          key: key, name: name || key,
          topics: 0, practised: 0, attempts: 0, correct: 0, total: 0,
          papers: 0, lastSeen: null
        };
      }
      if (name && exams[key].name === key) exams[key].name = name;
      return exams[key];
    }

    // Syllabus first: every topic exists in the profile even with zero attempts.
    Object.keys(topics).forEach(function (examKey) {
      var exam = topics[examKey] || {};
      var es = examStat(examKey, exam.name);
      (exam.sections || []).forEach(function (section) {
        es.topics++;
        stats[topicKey(examKey, section.name)] =
          newTopicStat(examKey, exam.name, section.name, section.count);
      });
    });

    // Fold micro-test attempts. A topic missing from the current index is kept:
    // the user's history is real even if the syllabus was rebuilt.
    micro.forEach(function (row) {
      if (!row || !row.exam || !row.topic) return;
      var key = topicKey(row.exam, row.topic);
      var st = stats[key];
      if (!st) {
        st = stats[key] = newTopicStat(row.exam, row.examName || row.exam, row.topic, 0);
        examStat(row.exam, row.examName || row.exam);
      }
      var total = row.total || ((row.correct || 0) + (row.wrong || 0));
      if (!total) return;
      st.attempts++;
      st.correct += row.correct || 0;
      st.total += total;
      var d = parseDate(row.date);
      if (d && (!st.lastSeen || d > st.lastSeen)) st.lastSeen = d;

      var es = examStat(row.exam, row.examName || st.examName);
      es.attempts++;
      es.correct += row.correct || 0;
      es.total += total;
      if (d && (!es.lastSeen || d > es.lastSeen)) es.lastSeen = d;
    });

    // Paper results are exam-level only. shared.js records no section breakdown,
    // so attributing them to a topic would be fabrication.
    papers.forEach(function (row) {
      if (!row || !row.exam) return;
      var answered = row.answered || row.total || 0;
      var es = examStat(row.exam, row.exam);
      es.papers++;
      es.correct += row.correct || 0;
      es.total += answered;
      var d = parseDate(row.date);
      if (d && (!es.lastSeen || d > es.lastSeen)) es.lastSeen = d;
    });

    // Finalise each topic.
    var topicList = Object.keys(stats).map(function (key) {
      var st = stats[key];
      var es = exams[st.exam];
      if (st.total > 0) {
        st.accuracy = st.correct / st.total;
        st.confidence = Math.min(1, st.total / 12);
        var daysSince = st.lastSeen ? daysBetween(st.lastSeen, now) : 0;
        st.mastery = smoothAccuracy(st.correct, st.total) * (0.6 + 0.4 * recencyFactor(daysSince));
        st.nextReviewDays = nextReviewDays(st.attempts, st.accuracy);
        st.dueIn = Math.round(st.nextReviewDays - daysSince);
        // One 10-question test is enough evidence to call a topic weak, but not
        // enough to call it strong: mastery needs at least two sittings.
        st.status = (st.accuracy < 0.6 && (st.attempts >= 2 || st.total >= 8)) ? 'weak'
          : (st.accuracy >= 0.8 && st.attempts >= 2) ? 'strong'
            : st.dueIn <= 0 ? 'due' : 'learning';
        if (es && st.attempts > 0) es.practised++;
      } else {
        st.status = 'new';
      }
      st.suggestedCount = Math.min(10, st.available || 10);
      st.href = practiceHref(st.exam, st.topic, st.suggestedCount);
      return st;
    });

    topicList.sort(function (a, b) {
      return a.exam.localeCompare(b.exam) || a.topic.localeCompare(b.topic);
    });

    var topicByKey = {};
    topicList.forEach(function (st) { topicByKey[st.key] = st; });

    // Wrong-answer history is section-level. Surface it as its own signal: it
    // covers paper practice, which has no topic data.
    var errorMap = {};
    wrong.forEach(function (w) {
      if (!w) return;
      var exam = w.exam || 'Other';
      var section = w.section || 'General';
      var key = exam + '|' + section;
      if (!errorMap[key]) {
        errorMap[key] = { exam: exam, section: section, count: 0, lastDate: null };
      }
      errorMap[key].count++;
      var d = parseDate(w.date);
      if (d && (!errorMap[key].lastDate || d > errorMap[key].lastDate)) {
        errorMap[key].lastDate = d;
      }
    });
    var errorSections = Object.keys(errorMap).map(function (k) {
      return errorMap[k];
    }).sort(function (a, b) { return b.count - a.count; });

    var practisedTopics = topicList.filter(function (st) { return st.attempts > 0; });
    var microCorrect = 0;
    var microTotal = 0;
    topicList.forEach(function (st) { microCorrect += st.correct; microTotal += st.total; });

    var paperCorrect = 0;
    var paperTotal = 0;
    papers.forEach(function (row) {
      if (!row) return;
      var answered = row.answered || row.total || 0;
      if (!answered) return;
      paperCorrect += row.correct || 0;
      paperTotal += answered;
    });

    return {
      now: now,
      topics: topicList,
      topicByKey: topicByKey,
      exams: Object.keys(exams).map(function (k) { return exams[k]; }).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      }),
      errors: errorSections,
      summary: {
        topicsTotal: topicList.length,
        topicsPractised: practisedTopics.length,
        attempts: practisedTopics.reduce(function (n, st) { return n + st.attempts; }, 0),
        microAccuracy: microTotal > 0 ? microCorrect / microTotal : null,
        microAnswered: microTotal,
        paperAccuracy: paperTotal > 0 ? paperCorrect / paperTotal : null,
        papers: papers.length,
        weak: topicList.filter(function (st) { return st.status === 'weak'; }).length,
        strong: topicList.filter(function (st) { return st.status === 'strong'; }).length,
        due: topicList.filter(function (st) {
          return st.attempts > 0 && st.dueIn !== null && st.dueIn <= 0;
        }).length,
        lastActivity: topicList.reduce(function (latest, st) {
          if (!st.lastSeen) return latest;
          return !latest || st.lastSeen > latest ? st.lastSeen : latest;
        }, null)
      }
    };
  }

  function reasonFor(st) {
    if (st.status === 'weak') {
      return 'Accuracy ' + Math.round(st.accuracy * 100) + '% across ' + st.attempts +
        ' test' + (st.attempts === 1 ? '' : 's') + ' — below the 60% threshold';
    }
    if (st.attempts === 0) {
      return 'Not started — ' + plural(st.available || 0, 'question') + ' available';
    }
    var overdue = Math.max(0, -(st.dueIn || 0));
    if (overdue > 0) {
      return 'Last practised ' + Math.round(Math.max(0, st.nextReviewDays - st.dueIn)) +
        ' days ago; review was due ' + overdue + ' day' + (overdue === 1 ? '' : 's') + ' ago';
    }
    return 'Due today after a ' + st.nextReviewDays + '-day interval';
  }

  function priority(st) {
    if (st.attempts === 0) return 0;
    var weakness = (1 - st.mastery) * 60;
    var overdue = Math.max(0, -(st.dueIn || 0)) * 2;
    var confidence = 0.5 + st.confidence;
    return weakness * confidence + overdue;
  }

  function buildPlan(profile, opts) {
    opts = opts || {};
    var limit = opts.limit || 8;

    var due = profile.topics.filter(function (st) {
      return st.attempts > 0 && (st.status === 'weak' || (st.dueIn !== null && st.dueIn <= 0));
    }).sort(function (a, b) {
      return priority(b) - priority(a);
    });

    var actions = due.map(function (st) {
      return {
        kind: st.status === 'weak' ? 'weak' : 'review',
        exam: st.exam,
        examName: st.examName,
        topic: st.topic,
        reason: reasonFor(st),
        href: st.href,
        mastery: st.mastery,
        accuracy: st.accuracy,
        attempts: st.attempts,
        dueIn: st.dueIn
      };
    });

    if (actions.length < limit) {
      var rank = {};
      EXAM_ORDER.forEach(function (key, i) { rank[key] = i; });
      var fresh = profile.topics.filter(function (st) {
        return st.attempts === 0;
      }).sort(function (a, b) {
        var ae = profile.exams.filter(function (x) { return x.key === a.exam; })[0] || { practised: 0 };
        var be = profile.exams.filter(function (x) { return x.key === b.exam; })[0] || { practised: 0 };
        // Exams already started first; then editorial order; then more questions.
        if ((be.practised > 0) !== (ae.practised > 0)) return be.practised > 0 ? 1 : -1;
        var ar = rank[a.exam] === undefined ? 99 : rank[a.exam];
        var br = rank[b.exam] === undefined ? 99 : rank[b.exam];
        if (ar !== br) return ar - br;
        return (b.available || 0) - (a.available || 0);
      });

      fresh.slice(0, limit - actions.length).forEach(function (st) {
        actions.push({
          kind: 'new',
          exam: st.exam,
          examName: st.examName,
          topic: st.topic,
          reason: reasonFor(st),
          href: st.href,
          mastery: null,
          accuracy: null,
          attempts: 0,
          dueIn: null
        });
      });
    }

    return actions.slice(0, limit);
  }

  return {
    buildProfile: buildProfile,
    buildPlan: buildPlan,
    practiceHref: practiceHref,
    smoothAccuracy: smoothAccuracy,
    recencyFactor: recencyFactor,
    nextReviewDays: nextReviewDays,
    EXAM_ORDER: EXAM_ORDER
  };
});

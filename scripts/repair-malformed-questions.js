#!/usr/bin/env node
'use strict';
// Repair malformed practice questions: empty stems left behind when an
// equation or image failed to extract, broken answer keys, and duplicate
// options. Idempotent: already-repaired questions are left untouched.
//
//   node scripts/repair-malformed-questions.js
//   node scripts/repair-malformed-questions.js --dry-run

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DRY = process.argv.includes('--dry-run');

function norm(s) {
  return String(s == null ? '' : s)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

function optText(q, i) {
  var o = (q.options || [])[i];
  return o ? String(o.text == null ? '' : o.text).trim() : '';
}

function isTopicQuestion(q) {
  return Object.prototype.hasOwnProperty.call(q, 'answer');
}

function setAnswer(q, idx) {
  if (isTopicQuestion(q)) {
    q.answer = idx;
  } else {
    (q.options || []).forEach(function (o, i) { o.correct = (i === idx); });
  }
}

function setOptionTexts(q, texts) {
  texts.forEach(function (t, i) {
    if (q.options[i]) q.options[i].text = t;
  });
}

var RULES = [
  {
    name: 'earth-core-answer-key',
    match: function (q) {
      return norm(q.text) === "What is the main component of the Earth's core?";
    },
    apply: function (q) {
      var idx = -1;
      (q.options || []).forEach(function (o, i) {
        if (/^Iron and Nickel$/i.test(String(o.text || '').trim())) idx = i;
      });
      if (idx >= 0) setAnswer(q, idx);
      q.solution = "The Earth's core is composed mainly of iron (about 85%) and nickel (about 15%), with lighter elements such as sulphur and oxygen in the outer core.";
    }
  },
  {
    name: 'empty-simplify-surds',
    match: function (q) {
      return norm(q.text) === 'Simplify:' && optText(q, 0) === '0' && optText(q, 1) === '1' && optText(q, 3) === '√3';
    },
    apply: function (q) {
      q.text = 'Simplify: (√5 + √3)/(√5 − √3) − (√5 − √3)/(√5 + √3) − 2√15';
      q.solution = 'Let a = √5 and b = √3. Then (a+b)/(a−b) − (a−b)/(a+b) = [(a+b)² − (a−b)²]/(a²−b²) = 4ab/(a²−b²) = 4√15/2 = 2√15. Therefore 2√15 − 2√15 = 0.';
      setAnswer(q, 0);
    }
  },
  {
    name: 'empty-simplify-decimals',
    match: function (q) {
      return norm(q.text) === 'Simplify:' && optText(q, 0) === '3.45' && optText(q, 1) === '3.65';
    },
    apply: function (q) {
      q.text = 'Simplify: 2¼ + 3.8 − (4/5) × 2¾';
      q.solution = '2¼ = 2.25 and 2¾ = 2.75. First (4/5) × 2.75 = 2.2. Then 2.25 + 3.8 − 2.2 = 6.05 − 2.2 = 3.85.';
      setAnswer(q, 2);
    }
  },
  {
    name: 'empty-evaluate-percent-km',
    match: function (q) {
      return norm(q.text) === 'Evaluate:' && optText(q, 0) === '266.6 km' && optText(q, 2) === '248.6 km';
    },
    apply: function (q) {
      q.text = 'Evaluate: 15⅓% of 480 km + 58⅓% of 300 km';
      q.solution = '15⅓% = 46/3% and 58⅓% = 175/3%. First term = (46/3)/100 × 480 = 73.6 km. Second term = (175/3)/100 × 300 = 175 km. Total = 73.6 + 175 = 248.6 km.';
      setAnswer(q, 2);
    }
  },
  {
    name: 'empty-evaluate-surds',
    match: function (q) {
      return norm(q.text) === 'Evaluate: =?' && optText(q, 0) === '4 + √11' && optText(q, 1) === '3 - √11';
    },
    apply: function (q) {
      q.text = 'Simplify: (√16 − √11) + 2√11';
      q.solution = '√16 = 4, so (4 − √11) + 2√11 = 4 + √11.';
      setAnswer(q, 0);
    }
  },
  {
    name: 'empty-evaluate-fractions',
    match: function (q) {
      return norm(q.text) === 'Evaluate:' && optText(q, 0) === '11/2' && optText(q, 3) === '25/4';
    },
    apply: function (q) {
      q.text = 'Simplify: 7 − 3/4 ÷ 1/2';
      q.solution = 'By BODMAS, divide first: 3/4 ÷ 1/2 = 3/4 × 2/1 = 3/2. Then 7 − 3/2 = 14/2 − 3/2 = 11/2.';
      setAnswer(q, 0);
    }
  },
  {
    name: 'duplicate-options-profit',
    match: function (q) {
      return norm(q.text).indexOf('A man sells an article at a profit of 20%. If he had sold it for Rs. 24 more') === 0;
    },
    apply: function (q) {
      setOptionTexts(q, ['200', '240', '280', '320']);
      q.solution = 'The extra profit is 30% − 20% = 10% of the cost price. Given 10% of CP = Rs. 24, CP = 24 × 10 = Rs. 240.';
      setAnswer(q, 1);
    }
  },
  {
    name: 'duplicate-options-code-y',
    match: function (q) {
      return norm(q.text).indexOf("If 'a' is coded as 'd', 'b' is coded as 'e', and so on, what is the code for 'y'?") === 0;
    },
    apply: function (q) {
      setOptionTexts(q, ['a', 'x', 'c', 'b']);
      q.solution = "Each letter is shifted 3 places forward, wrapping around after z. So y → z → a → b. The code for 'y' is 'b'.";
      setAnswer(q, 3);
    }
  },
  {
    name: 'duplicate-options-code-Z',
    match: function (q) {
      return norm(q.text).indexOf("In a certain code, 'A' is represented by 'D', 'B' by 'E', and so on. What will 'Z' be represented by?") === 0;
    },
    apply: function (q) {
      setOptionTexts(q, ['A', 'B', 'D', 'C']);
      q.solution = "Each letter is shifted 3 places forward, wrapping around after Z. So Z → A → B → C. 'Z' is represented by 'C'.";
      setAnswer(q, 3);
    }
  }
];

function repairQuestion(q) {
  for (var i = 0; i < RULES.length; i++) {
    if (RULES[i].match(q)) {
      RULES[i].apply(q);
      return RULES[i].name;
    }
  }
  return null;
}

function repairQuestions(list, label) {
  var counts = {};
  var hits = 0;
  (list || []).forEach(function (q) {
    var rule = repairQuestion(q);
    if (rule) { hits++; counts[rule] = (counts[rule] || 0) + 1; }
  });
  if (hits) {
    console.log('  ' + label + ': ' + hits + ' repaired (' + Object.keys(counts).map(function (k) { return k + '=' + counts[k]; }).join(', ') + ')');
  }
  return hits;
}

function processBank(file) {
  var data = JSON.parse(fs.readFileSync(file, 'utf8'));
  var n = repairQuestions(data.questions, path.relative(ROOT, file));
  if (n && !DRY) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return n;
}

function processTopicJson(file) {
  var data = JSON.parse(fs.readFileSync(file, 'utf8'));
  var n = 0;
  (data.sections || []).forEach(function (s) {
    n += repairQuestions(s.questions, path.relative(ROOT, file) + ' :: ' + s.name);
  });
  if (n && !DRY) fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  return n;
}

function processTopicJs(file) {
  var raw = fs.readFileSync(file, 'utf8');
  var m = raw.match(/^window\.__examData\s*=\s*([\s\S]*?)\s*;?\s*$/);
  if (!m) return 0;
  var data = JSON.parse(m[1]);
  var n = 0;
  (data.sections || []).forEach(function (s) {
    n += repairQuestions(s.questions, path.relative(ROOT, file) + ' :: ' + s.name);
  });
  if (n && !DRY) {
    var pretty = raw.indexOf('\n') !== -1;
    var prefix = raw.indexOf('window.__examData =') === 0 ? 'window.__examData = ' : 'window.__examData=';
    fs.writeFileSync(file, prefix + JSON.stringify(data, null, pretty ? 2 : 0) + (pretty ? '\n' : ';'), 'utf8');
  }
  return n;
}

var total = 0;

console.log('question-bank:');
['cgl', 'agniveer', 'sbi-clerk', 'ssc-gd'].forEach(function (k) {
  var f = path.join(ROOT, 'question-bank', k + '.json');
  if (fs.existsSync(f)) total += processBank(f);
});

console.log('data/topics (served by the Drill page):');
['cgl', 'agniveer', 'sbi-clerk', 'ssc-gd', 'general-knowledge', 'mathematics', 'reasoning'].forEach(function (k) {
  var j = path.join(ROOT, 'data', 'topics', k + '.json');
  var js = path.join(ROOT, 'data', 'topics', k + '.js');
  if (fs.existsSync(j)) total += processTopicJson(j);
  if (fs.existsSync(js)) total += processTopicJs(js);
});

console.log((DRY ? 'DRY RUN: ' : '') + 'repaired ' + total + ' question record(s)');

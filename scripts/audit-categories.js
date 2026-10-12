const fs = require('fs');

// Patterns that suggest exam-relevant content
var EXAM_RELEVANT = [
  /india/i, /modi/i, /narendra/i, /delhi/i, /parliament/i, /supreme court/i,
  /government/i, /scheme/i, /policy/i, /budget/i, /rupee/i, /rupees/i,
  /election/i, /bill/i, /act\b/i, /legislation/i,
  /united nations/i, /who\b/i, /world bank/i, /imf\b/i, /wto\b/i,
  /brics/i, /g20/i, /g7\b/i, /nato/i, /eu\b/i, /oecd/i,
  /nobel/i, /bharat ratna/i, /padma/i,
  /isro/i, /nasa/i, /space/i, /satellite/i, /chandrayaan/i, /mangalyaan/i,
  /climate/i, /cop\d+/i, /paris agreement/i,
  /vaccine/i, /clinical trial/i, /outbreak/i, /pandemic/i,
  /treaty/i, /summit/i, /agreement/i, /memorandum/i, /protocol/i,
  /defence/i, /defense/i, /missile/i, /navy\b/i, /army\b/i, /drdo/i,
  /appointed/i, /elected/i, /president/i, /prime minister/i,
  /gdp\b/i, /inflation/i, /monetary/i, /fiscal/i, /tariff/i, /sanctions/i,
  /supreme court/i, /high court/i, /verdict/i, /judgment/i,
  /constitution/i, /amendment/i,
  /launch(?:ed|es)?\s+(?:satellite|mission|rocket)/i,
  /world (?:cup|championship)/i, /olympic/i, /asian games/i,
  /world health organization/i, /unesco/i, /unicef/i,
  /exercise|drill/i, /warship/i, /submarine/i, /fighter\s+jet/i,
  /renewable/i, /emissions/i, /carbon/i, /conservation/i, /endangered/i,
  /award(?:ed)?\s+/i, /passed\s+away/i,
  /outbreak/i, /ebola/i, /marburg/i, /virus/i, /disease/i,
  /sign(?:ed)?\s+(?:deal|agreement|pact|accord)/i,
  /visit\s+(?:to|by)/i,
  /nuclear/i, /atomic/i,
  /trade\s+(?:war|deal|agreement)/i,
  /AI\b|artificial\s+intelligence/i,
  /quantum/i, /gene\b/i, /dna\b/i,
  /terroris/i, /militant/i, /insurgent/i
];

function categorize(fn, sampleSize) {
  var d = JSON.parse(fs.readFileSync('data/questions/' + fn, 'utf8'));
  var ss = d['Current Affairs'].subSubjects;
  var keys = Object.keys(ss).sort();
  var total = 0, examRel = 0, nonExam = 0;
  var nonExamExamples = [];
  
  keys.forEach(function(k) {
    ss[k].forEach(function(q) {
      total++;
      var txt = ((q.question||'') + ' ' + (q.answer||'') + ' ' + (q.fact||''));
      var isExam = EXAM_RELEVANT.some(function(re) { return re.test(txt); });
      if (isExam) {
        examRel++;
      } else {
        nonExam++;
        if (nonExamExamples.length < sampleSize) {
          nonExamExamples.push({month: k, q: (q.question||'').substring(0,120), a: (q.answer||'').substring(0,50)});
        }
      }
    });
  });
  
  console.log('=== ' + fn + ' ===');
  console.log('Total: ' + total + ', Exam-relevant: ' + examRel + ' (' + Math.round(examRel/total*100) + '%), Non-exam: ' + nonExam + ' (' + Math.round(nonExam/total*100) + '%)');
  console.log('\nNon-exam samples:');
  nonExamExamples.forEach(function(ex) {
    console.log('  [' + ex.month + '] Q: ' + ex.q);
    console.log('         A: ' + ex.a);
  });
}

categorize('current-events.json', 25);
categorize('current-affairs.json', 25);

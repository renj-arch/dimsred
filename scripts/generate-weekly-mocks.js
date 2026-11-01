var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var patterns = {};
try { patterns = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-patterns.json'), 'utf-8')); } catch(e) {}

var EXAMS = Object.keys(patterns);

function getUnusedCount(examKey) {
  var bankPath = path.join(bankDir, examKey + '.json');
  if (!fs.existsSync(bankPath)) return 0;
  try {
    var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
    var metaPath = path.join(bankDir, examKey + '-meta.json');
    var usedIds = [];
    if (fs.existsSync(metaPath)) {
      try { var m = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); usedIds = m.usedIds || []; } catch(e) {}
    }
    return bank.questions.filter(function(q) { return usedIds.indexOf(q.id) === -1; }).length;
  } catch(e) { return 0; }
}

function run(cmd, desc) {
  console.log('\n' + desc + '...');
  try {
    cp.execSync(cmd, { cwd: root, stdio: 'inherit', timeout: 120000 });
    console.log(desc + ' ✓');
  } catch(e) {
    console.error(desc + ' ✗ ' + e.message);
  }
}

console.log('=== Weekly Mock Test Generation ===\n');
var now = new Date().toISOString().split('T')[0];
console.log('Date: ' + now + '\n');

// Step 1: Refill question banks if needed
console.log('--- Step 1: Check & refill question banks ---');

for (var ei = 0; ei < EXAMS.length; ei++) {
  var exam = EXAMS[ei];
  var pattern = patterns[exam];
  if (!pattern) continue;

  var needed = pattern.totalQuestions || 100;
  var unused = getUnusedCount(exam);
  var shortage = needed - unused;

  if (shortage > 0) {
    var refillCount = Math.min(shortage + 15, 50);
    run('node scripts/generate-daily-questions.js ' + exam + ' --count=' + refillCount + ' --min=' + needed,
        exam + ': refilling ' + refillCount + ' questions (short ' + shortage + ')');
  } else {
    console.log(exam + ': ' + unused + ' unused (needs ' + needed + ') — OK');
  }
}

// Step 2: Generate mock tests
console.log('\n--- Step 2: Generate mock tests ---');
run('node scripts/generate-mock-tests.js', 'Generating mock tests for all exams');

// Step 3: Rebuild topic index
console.log('\n--- Step 3: Rebuild topic index ---');
run('node scripts/build-topic-index.js', 'Building topic index');

console.log('\n=== Weekly mock test generation complete ===');

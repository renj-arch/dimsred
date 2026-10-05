var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var dataDir = path.join(root, 'papers-data');
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];
var MIN_QUESTIONS = 5;

function run() {
  var deleted = [];
  var fixed = [];

  var files = fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); });

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var filePath = path.join(dataDir, file);
    var data;

    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.log('  [ERROR] Cannot parse ' + file + ' — deleting');
      fs.unlinkSync(filePath);
      deleteHtml(dataDir, file);
      deleted.push(file);
      continue;
    }

    var qs = data.questions;
    if (!qs || qs.length < MIN_QUESTIONS) {
      var count = qs ? qs.length : 0;
      var folder = data.folder;
      var slug = data.slug;

      console.log('  [STALE] ' + folder + '/' + slug + ' — only ' + count + ' questions');

      var paperHtml = path.join(root, folder, 'papers', slug + '.html');
      if (fs.existsSync(paperHtml)) {
        fs.unlinkSync(paperHtml);
        console.log('    Removed ' + folder + '/papers/' + slug + '.html');
      }

      var usedIds = [];
      if (qs && qs.length > 0) {
        usedIds = qs.map(function(q) { return q.id; });
      }
      removeUsedIds(folder, usedIds);
      console.log('    Freed ' + usedIds.length + ' question IDs in ' + folder + '-meta.json');

      fs.unlinkSync(filePath);
      console.log('    Removed papers-data/' + file);
      deleted.push(file);
    }
  }

  if (deleted.length === 0) {
    console.log('\nNo stale papers found.');
    return;
  }

  console.log('\n=== Regenerating papers for affected exams ===');

  var affectedExams = {};
  for (var i = 0; i < deleted.length; i++) {
    var parts = deleted[i].match(/^([a-z-]+)-practice-set-/);
    if (parts) {
      affectedExams[parts[1]] = true;
    }
  }

  for (var exam in affectedExams) {
    console.log('\n' + exam + ':');
    try {
      cp.execSync('node "' + path.join(__dirname, 'generate-papers.js') + '" ' + exam, {
        cwd: root,
        stdio: 'inherit'
      });
      fixed.push(exam);
    } catch (e) {
      console.log('  [FAILED] ' + exam + ' — ' + e.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Deleted stale papers: ' + deleted.length);
  if (deleted.length > 0) { deleted.forEach(function(f) { console.log('  - ' + f); }); }
  console.log('Regenerated exams: ' + fixed.length);
  if (fixed.length > 0) { fixed.forEach(function(e) { console.log('  - ' + e); }); }
}

function removeUsedIds(folder, ids) {
  if (!ids || ids.length === 0) return;
  var metaPath = path.join(bankDir, folder + '-meta.json');
  if (!fs.existsSync(metaPath)) return;

  try {
    var meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    var used = meta.usedIds || [];
    var idSet = {};
    for (var i = 0; i < ids.length; i++) { idSet[ids[i]] = true; }
    meta.usedIds = used.filter(function(id) { return !idSet[id]; });
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  } catch (e) {
    console.log('    [WARN] Could not update meta for ' + folder + ': ' + e.message);
  }
}

function deleteHtml(dataDir, jsonFile) {
  var m = jsonFile.match(/^([a-z-]+)-(practice-set-\d+)\.json$/);
  if (!m) return;
  var folder = m[1], slug = m[2];
  var htmlPath = path.join(root, folder, 'papers', slug + '.html');
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }
}

run();

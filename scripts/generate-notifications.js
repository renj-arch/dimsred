var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'data');

var EXAM_LINKS = {
  'ssc cgl': '/cgl/', 'cgl': '/cgl/',
  'rbi grade b': '/rbi/', 'rbi': '/rbi/',
  'ibps po': '/ibps-po/', 'ibps': '/ibps-po/',
  'sbi clerk': '/sbi-clerk/',
  'upsc': '/upsc/',
  'ctet': '/ctet/',
  'ssc gd': '/ssc-gd/',
  'agniveer': '/agniveer/',
  'gate': '/gate/',
  'neet': '/neet/',
  'jee': '/jee/',
};

function findExamLink(tag, title) {
  var lower = (tag + ' ' + title).toLowerCase();
  for (var key in EXAM_LINKS) {
    if (lower.indexOf(key) !== -1) return EXAM_LINKS[key];
  }
  return null;
}

function isExpired(closingStr) {
  if (!closingStr) return false;
  var parts = closingStr.split('/');
  if (parts.length !== 3) return false;
  var d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return d < new Date();
}

function run() {
  var notifPath = path.join(dataDir, 'notifications.json');

  // Load existing, remove expired, reassign links, save back.
  var existing = [];
  if (fs.existsSync(notifPath)) {
    try { existing = JSON.parse(fs.readFileSync(notifPath, 'utf-8')); }
    catch (e) { existing = []; }
  }

  var active = [];
  for (var i = 0; i < existing.length; i++) {
    if (!isExpired(existing[i].closing)) {
      existing[i].link = findExamLink(existing[i].tag, existing[i].title) || existing[i].link || null;
      active.push(existing[i]);
    }
  }

  if (active.length === 0) {
    console.log('No active notifications to save.');
    return;
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(notifPath, JSON.stringify({ notifications: active, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('Kept ' + active.length + ' active notifications (removed ' + (existing.length - active.length) + ' expired).');
}

run();

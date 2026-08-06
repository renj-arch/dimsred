var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });
var expander = require('./expand-row');

function clean(v) {
  return v.replace(/&#160;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\[[\d\s,\-]+\]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  retries = retries || 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'LegalBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429) {
          if (retries > 0) {
            var wait = 30000 + Math.floor(Math.random() * 15000);
            console.error('  (HTTP 429, waiting ' + (wait / 1000) + 's... retries left: ' + (retries - 1) + ')');
            setTimeout(function() { resolve(fetchJSON(url, retries - 1)); }, wait);
          } else {
            reject(new Error('HTTP 429 (exhausted retries)'));
          }
          return;
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function fetchPage(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = [];
    var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rRegex.exec(m[1])) !== null) {
      var cells = [];
      var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(clean(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function pad(n) { return (n < 10 ? '0' : '') + n; }

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'legal_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Legal & Constitutional', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchLandmarks(existingKeys, newQuestions, seq) {
  console.error('\n--- Landmark Cases ---');
  try {
    var html = await fetchPage('List_of_landmark_court_decisions_in_India');
    var tables = extractWikiTables(html);
    if (tables.length === 0) { console.error('  No wikitables found\n'); return; }
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < Math.min(t.length, 50); ri++) {
        var row = t[ri];
        if (row.length < 3) continue;
        var name = clean(row[0]);
        var yearStr = clean(row[1]);
        var significance = clean(row[2]);
        if (!name || name.length < 3 || name === 'Name of the case' || name.indexOf('\u2014') >= 0) continue;
        var yrMatch = yearStr.match(/\b\d{4}\b/);
        if (yrMatch && yrMatch[0] >= '1950') {
          var qText = 'Which landmark case was decided by the Supreme Court of India in ' + yrMatch[0] + '?';
          var q = makeQuestion(qText, name, seq++, 'Landmark Cases', '\u2696', name + ' (' + yrMatch[0] + '): ' + significance.substring(0, 120));
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          var exY = makeQuestion('In which year was the landmark case ' + name + ' decided?', yrMatch[0], seq++, 'Landmark Cases', '\u2696', name + ' was decided in ' + yrMatch[0] + ': ' + significance.substring(0, 100));
          if (exY && !existingKeys[eventKey(exY)]) { newQuestions.push(exY); existingKeys[eventKey(exY)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' landmark case questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8').replace(/^\uFEFF/, '')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Legal & Constitutional';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  await fetchLandmarks(existingKeys, newQuestions, seq);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nLegal & Constitutional: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var DELAY = 600;
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function clean(v) {
  return v.replace(/&#160;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/[[\d\s,\-]+]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, { agent: AGENT, headers: { 'User-Agent': 'ScienceBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve(JSON.parse(d)); });
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
  var id = 'sci_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Science & Technology', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) { return (q.question || '').substring(0, 80) + '|' + (q.answer || ''); }

async function fetchSatellites(existingKeys, newQuestions, seq) {
  console.error('\n--- Indian Satellites ---');
  try {
    var html = await fetchPage('List_of_Indian_satellites');
    var tables = extractWikiTables(html);
    if (tables.length === 0) { console.error('  No wikitables found\n'); return; }
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 5 || t[0].length < 5) return;
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 10) continue;  // Skip continuation rows (1970s table structure)
        if (row[0] === '#' || row[0] === 'Name' || row[0].indexOf('Payload') >= 0) continue;
        var name = row[1] || row[0];
        // Must be a real satellite name (contains letters, not SatCat number)
        if (!name || name.length < 3 || !name.match(/[A-Za-z]/) || name.indexOf('—') >= 0) continue;
        var launchDate = row.length > 6 ? row[6] : '';
        var vehicle = row.length > 7 ? row[7] : '';
        var yearMatch = launchDate.match(/\b(19|20)\d{2}\b/);
        if (!yearMatch) continue;
        var year = yearMatch[0];
        if (year >= '2015') {
          var qText = 'Which satellite was launched by India in ' + year + '?';
          var q = makeQuestion(qText, name, seq++, 'Wikipedia - Indian Satellites', '\uD83D\uDEE0', name + ' (' + year + ') was launched on ' + launchDate + ' via ' + vehicle + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' satellite questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchMissions(existingKeys, newQuestions, seq) {
  console.error('--- ISRO Missions ---');
  try {
    var html = await fetchPage('List_of_ISRO_missions');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < Math.min(t.length, 25); ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = row[0];
        var date = row.length > 1 ? row[1] : '';
        var status = row.length > 2 ? row[2] : '';
        if (!name || name.length < 2 || name.match(/^[\d]+$/) || name === 'Mission name' || name.length > 50) continue;
        var yearMatch = date.match(/\b(19|20)\d{2}\b/);
        if (yearMatch && yearMatch[0] >= '2020') {
          var qText = 'Which ISRO mission was launched in ' + yearMatch[0] + (status.indexOf('success') >= 0 ? ' (successful)' : '') + '?';
          var q = makeQuestion(qText, name, seq++, 'Wikipedia - ISRO Missions', '\uD83D\uDE80', name + ' was launched on ' + date + '. Status: ' + status);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' mission questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Science & Technology';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  await fetchSatellites(existingKeys, newQuestions, seq);
  seq += newQuestions.length;
  await delay(DELAY);
  await fetchMissions(existingKeys, newQuestions, seq);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nScience & Technology: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

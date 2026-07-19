var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'AwardsBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim(); }

function fetchPageText(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractInfoboxField(html, label) {
  var m = html.match(/<table[^>]*class="[^"]*infobox[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return null;
  var table = m[1];
  var rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return null;
  for (var ri = 0; ri < rows.length; ri++) {
    var labelMatch = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var dataMatch = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (labelMatch && dataMatch) {
      var l = strip(labelMatch[1]).toLowerCase();
      if (l.indexOf(label.toLowerCase()) >= 0) return strip(dataMatch[1]);
    }
  }
  return null;
}

function extractWikiTable(html) {
  var tables = [];
  var tableRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tableRegex.exec(html)) !== null) {
    var rows = [];
    var rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rowRegex.exec(m[1])) !== null) {
      var cells = [];
      var cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cellRegex.exec(rm[1])) !== null) {
        cells.push(strip(cm[1]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function makeQuestion(question, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'award_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Awards & Honours', emoji: emoji,
    question: question, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) { return (q.question || '').substring(0, 80) + '|' + (q.answer || ''); }

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Awards & Honours']) existing[CA_KEY].subSubjects['Awards & Honours'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Awards & Honours'].forEach(function(q) { existingKeys[eventKey(q)] = true; });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Awards & Honours'].length + 1;

  // 1. Bharat Ratna - latest award (2024: 5 recipients)
  process.stdout.write('  Bharat Ratna... ');
  var html = await fetchPageText('Bharat_Ratna');
  var latest = extractInfoboxField(html, 'Latest award');
  if (latest) {
    var cleaned = latest.replace(/^\d{4}\s*/, '').replace(/\(.*?\)/g, '').replace(/posthumous/gi, '').trim();
    process.stdout.write('Latest: ' + cleaned.substring(0, 80) + '\n');
    // Split by double-space or "  " (two spaces) between names
    var names = cleaned.split(/\s{2,}/);
    if (names.length < 2) names = [cleaned];
    names.forEach(function(n) {
      n = n.trim();
      if (n.length > 5) {
        var q = makeQuestion('Name a recipient of the Bharat Ratna awarded recently.', n, seq++, 'Wikipedia - Bharat Ratna', '\uD83C\uDFC6', 'Bharat Ratna recipient: ' + n);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
      }
    });
  } else process.stdout.write('Not found\n');

  // 2. Nobel Prize - List of Nobel laureates by year (2025)
  await delay(600);
  process.stdout.write('  Nobel Prize 2025... ');
  try {
    html = await fetchPageText('List_of_Nobel_laureates');
    var tables = extractWikiTable(html);
    if (tables.length > 0) {
      var t = tables[0];
      var categories = t[0]; // ["Year", "Physics", "Chemistry", ...]
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (!row || row.length < 2) continue;
        var yearStr = strip(row[0]).match(/\b2025\b/);
        if (!yearStr) continue;
        for (var ci = 1; ci < Math.min(row.length, categories.length); ci++) {
          var category = categories[ci].replace(/\[.*?\]/g, '').replace(/&#91;.*?&#93;/g, '').replace(/&nbsp;/g, ' ').replace(/^Prize in\s+/i, '').trim();
          var laureate = row[ci] ? row[ci].replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim() : '';
          if (laureate && laureate.length > 2 && laureate !== '\u2014' && laureate.indexOf('not awarded') < 0) {
            // Split multiple winners
            var winners = laureate.split(/[;]/);
            winners.forEach(function(w) {
              w = w.trim();
              if (w.length > 2) {
                var q = makeQuestion('Who won the Nobel Prize in ' + category + ' in 2025?', w, seq++, 'Wikipedia - Nobel Prize', '\uD83C\uDFC6', 'Nobel Prize 2025 - ' + category + ': ' + w);
                if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
              }
            });
          }
        }
      }
      process.stdout.write('OK\n');
    } else process.stdout.write('No tables\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 3. Jnanpith Award
  await delay(600);
  process.stdout.write('  Jnanpith Award... ');
  try {
    html = await fetchPageText('Jnanpith_Award');
    var tables = extractWikiTable(html);
    if (tables.length > 0) {
      for (var ti2 = 0; ti2 < tables.length; ti2++) {
        for (var ri2 = 1; ri2 < tables[ti2].length; ri2++) {
          var row = tables[ti2][ri2];
          if (row.length >= 2) {
            var yearStr = strip(row[0]).match(/\b(2025|2026)\b/);
            if (yearStr) {
              var recipient = strip(row[row.length > 2 ? 1 : row.length - 1]).replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
              if (recipient.length > 2) {
                var q = makeQuestion('Who won the Jnanpith Award in ' + yearStr[0] + '?', recipient, seq++, 'Wikipedia - Jnanpith Award', '\uD83D\uDCDA', 'Jnanpith Award ' + yearStr[0] + ': ' + recipient);
                if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
              }
            }
          }
        }
      }
      process.stdout.write('OK\n');
    } else process.stdout.write('No tables\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 4. Dadasaheb Phalke Award
  await delay(600);
  process.stdout.write('  Dadasaheb Phalke Award... ');
  try {
    html = await fetchPageText('Dadasaheb_Phalke_Award');
    var tables = extractWikiTable(html);
    if (tables.length > 0) {
      var t = tables[0];
      for (var ri3 = 1; ri3 < t.length; ri3++) {
        var yearStr = strip(t[ri3][0]).match(/\b(2025|2026)\b/);
        if (yearStr) {
          var recipient = strip(t[ri3].length > 1 ? t[ri3][1] : '').replace(/\[.*?\]/g, '').trim();
          if (recipient.length > 2) {
            var q = makeQuestion('Who received the Dadasaheb Phalke Award in ' + yearStr[0] + '?', recipient, seq++, 'Wikipedia - Dadasaheb Phalke Award', '\uD83C\uDFAC', 'Dadasaheb Phalke Award ' + yearStr[0] + ': ' + recipient);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
          }
        }
      }
      process.stdout.write('OK\n');
    } else process.stdout.write('No tables\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Awards & Honours'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Awards & Honours'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nAwards & Honours: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function cleanVal(v) {
  return v.replace(/&#160;/g, ' ').replace(/\[[\d\s,\-]+\]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'DefenceBot/1.0' } }, function(res) {
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

function fetchSection(title, sectionIdx) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&section=' + sectionIdx + '&prop=text&format=json').then(function(d) {
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
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'def_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Defence & Exercises', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchExercises(existingKeys, newQuestions, seq) {
  console.error('\n--- Army Exercises ---');
  try {
    var html = await fetchPageText('List_of_exercises_of_the_Indian_Army');
    var tables = extractWikiTables(html);
    if (tables.length > 0) {
      var t = tables[0];
      var recent = [];
      var currentYear = 0;
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        // Colspan row marks the year group
        if (row.length === 1 && row[0].match(/\b(19|20)\d{2}\b/)) {
          currentYear = parseInt(row[0].match(/\b(19|20)\d{2}\b/)[0], 10);
          continue;
        }
        // Some colspan rows have year with 'b' tags
        if (row[0].match(/\b(19|20)\d{2}\b/)) {
          var y = row[0].match(/\b(19|20)\d{2}\b/);
          if (y) currentYear = parseInt(y[0], 10);
          if (row.length < 3) continue;
        }
        var name = cleanVal(row[0]);
        var partner = row.length > 1 ? cleanVal(row[1]) : '';
        if (name.length < 2 || partner.length < 2) continue;
        // Only recent exercises (2020 onwards)
        if (currentYear >= 2020) {
          recent.push({ name: name, partner: partner, year: currentYear });
        }
      }
      // Take latest 10
      recent = recent.slice(0, 10);
      recent.forEach(function(ex) {
        var qText = 'Which military exercise was conducted between India and ' + ex.partner + ' in recent years?';
        var q = makeQuestion(qText, ex.name, seq++, 'Wikipedia - Army Exercises', '\uD83C\uDFC1', 'Exercise ' + ex.name + ' was conducted with ' + ex.partner + ' (' + ex.year + ').');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
      });
      console.error('  ' + recent.length + ' exercises added\n');
    } else console.error('  No wikitables found\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchMissiles(existingKeys, newQuestions, seq) {
  console.error('--- Missiles of India ---');
  try {
    var html = await fetchPageText('Guided_missiles_of_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      // Determine column structure from header row
      var hasFamily = t[0].length >= 9;

      for (var ri = 1; ri < Math.min(t.length, 30); ri++) {
        var row = t[ri];
        if (row.length < 3) continue;
        var off = (hasFamily && row.length >= 9) ? 1 : 0;
        var name = cleanVal(row[off]);
        var type = row.length > off + 1 ? cleanVal(row[off + 1]) : '';
        var range = row.length > off + 2 ? cleanVal(row[off + 2]) : '';
        var status = row.length > off + 6 ? cleanVal(row[off + 6]) : '';

        if (name.length < 2) continue;

        if (range && range.match(/\d+/)) {
          var q = makeQuestion('What is the maximum range of the ' + name + ' missile?', range, seq++, 'Wikipedia - Missiles of India', '\uD83D\uDEE1', name + ' missile: Type=' + type + ', Range=' + range + ', Status=' + status);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' missile questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchAgniMissiles(existingKeys, newQuestions, seq) {
  console.error('--- Agni Missile ---');
  try {
    var html = await fetchPageText('Agni_(missile)');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = strip(row[0]).replace(/\[.*?\]/g, '').trim();
        var type = row.length > 1 ? strip(row[1]).replace(/\[.*?\]/g, '').trim() : '';
        var range = row.length > 2 ? strip(row[2]).replace(/\[.*?\]/g, '').trim() : '';
        var status = row.length > 3 ? strip(row[3]).replace(/\[.*?\]/g, '').trim() : '';

        if (range && range.match(/\d+/) && name.length > 2) {
          var cleanedRange = cleanVal(range);
          var q = makeQuestion('What is the range of the ' + name + ' missile?', cleanedRange, seq++, 'Wikipedia - Agni Missile', '\uD83D\uDEE1', name + ': Type=' + type + ', Range=' + cleanedRange + ', Status=' + status);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' Agni questions added\n');
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
  if (!existing[CA_KEY].subSubjects['Defence & Exercises']) existing[CA_KEY].subSubjects['Defence & Exercises'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Defence & Exercises'].forEach(function(q) { existingKeys[eventKey(q)] = true; });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Defence & Exercises'].length + 1;

  await fetchExercises(existingKeys, newQuestions, seq);
  seq += newQuestions.length;
  await delay(800);

  await fetchMissiles(existingKeys, newQuestions, seq);
  seq += newQuestions.length - (newQuestions.filter(function(q) { return q.id.indexOf('def_missile') >= 0; }).length || 0);
  // Actually seq tracking is rough -- let's just use a running counter
  var runningSeq = existing[CA_KEY].subSubjects['Defence & Exercises'].length + 1 + newQuestions.length;

  await delay(800);
  await fetchAgniMissiles(existingKeys, newQuestions, runningSeq);

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Defence & Exercises'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Defence & Exercises'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nDefence & Exercises: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

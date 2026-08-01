var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var bio = require('./bio-cache');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'SportsBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function fetchPageText(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = [];
    var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rRegex.exec(m[2])) !== null) {
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
  var id = 'spt_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Sports', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractAwardeeTable(t) {
  var recipients = [];
  var colYear = 0, colSport = -1;
  for (var ci = 0; ci < Math.min(t[0].length, 6); ci++) {
    var h = t[0][ci].toLowerCase();
    if (h.indexOf('sport') >= 0 || h.indexOf('discipline') >= 0 || h.indexOf('game') >= 0) colSport = ci;
  }
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 3) continue;
    var name = strip(row[1]);
    if (!name || name.length < 3 || name === 'Name' || name.indexOf('Recipient') >= 0) continue;
    var yrMatch = row[colYear].match(/\b\d{4}\b/);
    var sport = colSport >= 0 && row.length > colSport ? strip(row[colSport]) : '';
    recipients.push({ name: name, sport: sport, year: yrMatch ? yrMatch[0] : row[colYear] });
  }
  return recipients;
}

function extractOlympicTable(t) {
  var medalists = [];
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 3) continue;
    var name = strip(row[1]);
    if (!name || name.length < 3 || name === 'Name' || name.indexOf('—') >= 0) continue;
    var medal = row.length > 2 ? strip(row[2]) : '';
    var sport = row.length > 3 ? strip(row[3]) : '';
    var games = row.length > 0 ? strip(row[0]) : '';
    medalists.push({ name: name, medal: medal, sport: sport, games: games });
  }
  return medalists;
}

async function fetchKhelRatna(existingKeys, newQuestions, seq) {
  console.error('\n--- Khel Ratna Award ---');
  try {
    var html = await fetchPageText('Khel_Ratna_Award');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var recipients = extractAwardeeTable(t);
      recipients.forEach(function(r) {
        var qText = 'Who received the Khel Ratna award' + (r.sport ? ' for ' + r.sport : '') + ' in ' + r.year + '?';
        var q = makeQuestion(qText, r.name, seq++, 'Khel Ratna', '\uD83C\uDFC5', r.name + ' received Khel Ratna in ' + r.year + (r.sport ? ' for ' + r.sport : '') + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Khel Ratna questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchOlympicMedalists(existingKeys, newQuestions, seq) {
  console.error('--- Indian Olympic Medalists ---');
  try {
    var html = await fetchPageText('India_at_the_Olympics');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var medalists = extractOlympicTable(t);
      medalists.forEach(function(m) {
        var qText = 'Who won the ' + m.medal + ' medal for India in ' + m.games + '?';
        var q = makeQuestion(qText, m.name, seq++, 'Indian Olympic Medalists', '\uD83E\uDD47', m.name + ' won ' + m.medal + ' at ' + m.games + (m.sport ? ' (' + m.sport + ')' : '') + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Olympic medalist questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchDronacharya(existingKeys, newQuestions, seq) {
  console.error('--- Dronacharya Award ---');
  try {
    var html = await fetchPageText('Dronacharya_Award');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var recipients = extractAwardeeTable(t);
      recipients.forEach(function(r) {
        var qText = 'Who received the Dronacharya Award' + (r.sport ? ' for ' + r.sport : '') + ' in ' + r.year + '?';
        var q = makeQuestion(qText, r.name, seq++, 'Dronacharya Award', '\uD83C\uDFC5', r.name + ' received Dronacharya Award in ' + r.year + (r.sport ? ' for ' + r.sport : '') + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Dronacharya questions added\n');
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
  var subKey = 'Sports';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  var bioCache = bio.loadBioCache();

  await fetchKhelRatna(existingKeys, newQuestions, seq);
  seq += newQuestions.length;
  await delay(800);
  await fetchOlympicMedalists(existingKeys, newQuestions, seq);
  seq = existing[CA_KEY].subSubjects[subKey].length + 1 + newQuestions.length;
  await delay(800);
  await fetchDronacharya(existingKeys, newQuestions, seq);

  for (var bqi = 0; bqi < newQuestions.length; bqi++) {
    var bq = newQuestions[bqi];
    if (!bio.isSinglePerson(bq.answer)) continue;
    var b = await bio.getBio(bq.answer, bioCache);
    if (b && bq.fact.indexOf(b) === -1) bq.fact += ' ' + b;
  }

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nSports: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');

  bio.saveBioCache(bioCache);
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'BooksBot/1.0' } }, function(res) {
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
  var id = 'bk_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Books & Authors', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractBookTable(t) {
  var books = [];
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 4) continue;
    var title = strip(row[0]);
    var author = strip(row[1]);
    if (!title || !author || title.length < 3 || author.length < 2) continue;
    if (title === 'Title' || title.indexOf('Total') >= 0) continue;
    title = title.replace(/\[.*?\]/g, '').trim();
    author = author.replace(/\[.*?\]/g, '').trim();
    var copies = row.length > 2 ? strip(row[2]).replace(/\[.*?\]/g, '').trim() : '';
    if (title && author) books.push({ title: title, author: author, copies: copies });
  }
  return books;
}

function extractRecipientTable(t) {
  var recipients = [];
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 2) continue;
    var year = strip(row[0]);
    var name = strip(row[1]);
    if (!name || name.length < 3 || name === 'Name' || name.indexOf('Year') >= 0) continue;
    var yrMatch = year.match(/\b\d{4}\b/);
    recipients.push({ name: name, year: yrMatch ? yrMatch[0] : year });
  }
  return recipients;
}

async function fetchBestSellers(existingKeys, newQuestions, seq) {
  console.error('\n--- Best-selling Books ---');
  try {
    var html = await fetchPageText('List_of_best-selling_books');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var books = extractBookTable(t);
      books.forEach(function(b) {
        var qText = 'Who is the author of the best-selling book "' + b.title + '"?';
        var q = makeQuestion(qText, b.author, seq++, 'Best-selling Books', '\uD83D\uDCD6', b.title + ' by ' + b.author + (b.copies ? ' (' + b.copies + ' copies)' : ''));
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' book questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchJnanpith(existingKeys, newQuestions, seq) {
  console.error('--- Jnanpith Award ---');
  try {
    var html = await fetchPageText('Jnanpith_Award');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var recipients = extractRecipientTable(t);
      recipients.forEach(function(r) {
        var qText = 'Who received the Jnanpith Award in ' + r.year + '?';
        var q = makeQuestion(qText, r.name, seq++, 'Jnanpith Award', '\uD83C\uDFC6', r.name + ' received the Jnanpith Award in ' + r.year + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Jnanpith questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchSahityaAkademi(existingKeys, newQuestions, seq) {
  console.error('--- Sahitya Akademi Award ---');
  try {
    var html = await fetchPageText('Sahitya_Akademi_Award');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var recipients = extractRecipientTable(t);
      recipients.forEach(function(r) {
        var qText = 'Who received the Sahitya Akademi Award in ' + r.year + '?';
        var q = makeQuestion(qText, r.name, seq++, 'Sahitya Akademi Award', '\uD83C\uDFC6', r.name + ' received the Sahitya Akademi Award in ' + r.year + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Sahitya Akademi questions added\n');
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
  var subKey = 'Books & Authors';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  await fetchBestSellers(existingKeys, newQuestions, seq);
  seq += newQuestions.length;
  await delay(800);
  await fetchJnanpith(existingKeys, newQuestions, seq);
  seq += newQuestions.length - (existing[CA_KEY].subSubjects[subKey].length + 1 - seq) - (newQuestions.filter(function(q) { return q.source.indexOf('Best-selling') >= 0; }).length || 0);
  // simpler: recalculate seq based on actual newQuestions length
  seq = existing[CA_KEY].subSubjects[subKey].length + 1 + newQuestions.length;
  await delay(800);
  await fetchSahityaAkademi(existingKeys, newQuestions, seq);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nBooks & Authors: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

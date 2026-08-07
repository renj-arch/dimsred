var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var BOOK_CACHE_PATH = path.resolve(__dirname, '..', 'data/book-summaries.json');
var bio = require('./bio-cache');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

// Cap on new summary fetches per run (existing titles are cached, so later runs
// only fill gaps; keeps each workflow step inside its timeout budget).
var MAX_SUMMARY_FETCHES = 250;

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'BooksBot/1.0' } }, function(res) {
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
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(new Error('Request timeout')); });
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function fetchPageText(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json&redirects=1').then(function(d) {
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

function makeQuestion(qText, answer, seq, source, emoji, fact, bookTitle) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'bk_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Books & Authors', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || '',
    _book: bookTitle || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

// ---------- book summary cache ----------
function loadBookCache() {
  var cache = {};
  if (fs.existsSync(BOOK_CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(BOOK_CACHE_PATH, 'utf8'));
      console.error('Read book cache: ' + Object.keys(cache).length + ' titles');
    } catch (e) { console.error('Error reading book cache: ' + e.message); }
  }
  return cache;
}

function saveBookCache(cache) {
  var merged = cache;
  try {
    if (fs.existsSync(BOOK_CACHE_PATH)) {
      var disk = JSON.parse(fs.readFileSync(BOOK_CACHE_PATH, 'utf8'));
      merged = disk;
      Object.keys(cache || {}).forEach(function(k) {
        if (cache[k]) merged[k] = cache[k];
      });
    }
  } catch (e) { merged = cache; }
  fs.writeFileSync(BOOK_CACHE_PATH, JSON.stringify(merged, null, 2), 'utf8');
  console.error('Book cache: ' + Object.keys(merged).length + ' titles');
}

// Fetch a book's full Wikipedia article text (lead + plot + reception/legacy),
// giving a complete overall glimpse of the book rather than only the intro.
var summaryFetches = 0;
async function fetchBookSummary(title, cache) {
  if (cache[title]) return cache[title];
  if (summaryFetches >= MAX_SUMMARY_FETCHES) return '';
  summaryFetches++;
  var out = '';
  try {
    var d = await fetchJSON(API + '?action=query&titles=' + encodeURIComponent(title) + '&prop=extracts&explaintext&format=json&redirects=1');
    var pg = d && d.query && d.query.pages ? Object.keys(d.query.pages).map(function(k){ return d.query.pages[k]; })[0] : null;
    var e = pg ? (pg.extract || '') : '';
    if (e) {
      out = e.replace(/\s+/g, ' ').trim();
      if (/^(may refer to|.*disambiguation page)/i.test(out)) out = '';
    }
  } catch (e) {}
  if (!out) {
    // REST summary fallback (best-effort when plaintext extract is unavailable)
    try {
      var s = await fetchJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/\s+/g, '_')));
      if (s && s.type !== 'disambiguation' && s.extract) out = String(s.extract).replace(/\s+/g, ' ').trim();
    } catch (e) {}
  }
  cache[title] = out;
  if (summaryFetches % 20 === 0) saveBookCache(cache); // incremental persistence
  return out;
}

// Enrich a question's fact with the book's detailed overview (append, don't clobber).
async function enrichWithSummary(q, bookCache) {
  var title = q._book;
  if (!title) return;
  var sum = await fetchBookSummary(title, bookCache);
  if (!sum) return;
  var overview = 'Overview: ' + sum;
  if (q.fact && q.fact.indexOf('Overview:') === -1) q.fact += ' ' + overview;
  else if (!q.fact) q.fact = overview;
}

// ---------- extractors ----------
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

// Sahitya Akademi winner tables are "Year | Book | Writer | Category".
function extractSahityaTable(t) {
  var winners = [];
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 3) continue;
    var year = strip(row[0]);
    var book = strip(row[1]);
    var writer = strip(row[2]);
    if (!book || book.length < 2 || book === 'Book' || book === 'Title') continue;
    if (!writer || writer.length < 2 || writer === 'Writer' || writer === 'Author') continue;
    var yrMatch = year.match(/\b\d{4}\b/);
    winners.push({ book: book, writer: writer, year: yrMatch ? yrMatch[0] : year, category: row.length > 3 ? strip(row[3]) : '' });
  }
  return winners;
}

// ---------- sources ----------
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
        var q = makeQuestion(qText, b.author, seq++, 'Best-selling Books', '\uD83D\uDCD6', b.title + ' by ' + b.author + (b.copies ? ' (' + b.copies + ' copies)' : ''), b.title);
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
        var q = makeQuestion(qText, r.name, seq++, 'Jnanpith Award', '\uD83C\uDFC6', r.name + ' received the Jnanpith Award in ' + r.year + '.', '');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    });
    console.error('  ' + count + ' Jnanpith questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

// Auto-discovery: Sahitya Akademi has per-language "List of ... winners for X"
// pages, each with Year|Book|Writer tables. Iterating them yields a large,
// growing corpus of books/authors beyond the single (empty-table) main page.
var SAHITYA_LANGS = ['English','Hindi','Bengali','Tamil','Telugu','Kannada','Malayalam','Marathi','Gujarati','Odia','Urdu','Punjabi','Assamese','Sanskrit','Rajasthani','Santali','Meitei','Nepali','Konkani','Dogri','Bodo','Maithili','Kashmiri'];
async function fetchSahitya(existingKeys, newQuestions, seq) {
  console.error('--- Sahitya Akademi Award (per-language lists) ---');
  var count = 0;
  for (var i = 0; i < SAHITYA_LANGS.length; i++) {
    var lang = SAHITYA_LANGS[i];
    try {
      var html = await fetchPageText('List_of_Sahitya_Akademi_Award_winners_for_' + lang);
      var tables = extractWikiTables(html);
      var any = 0;
      tables.forEach(function(t) {
        var winners = extractSahityaTable(t);
        winners.forEach(function(w) {
          var qText = 'Who wrote the Sahitya Akademi Award-winning book "' + w.book + '" (' + w.year + ')?';
          var fact = '"' + w.book + '" by ' + w.writer + ' won the Sahitya Akademi Award in ' + w.year + (w.category ? ' in the ' + w.category + ' category.' : '.');
          var q = makeQuestion(qText, w.writer, seq++, 'Sahitya Akademi Award', '\uD83C\uDFC6', fact, w.book);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; any++; }
        });
      });
      console.error('  ' + lang + ': ' + any + ' new');
    } catch (e) { console.error('  ' + lang + ': error ' + e.message); }
    await delay(600);
  }
  console.error('  Total Sahitya: ' + count + ' new\n');
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

  var bioCache = bio.loadBioCache();
  var bookCache = loadBookCache();

  await fetchBestSellers(existingKeys, newQuestions, seq);
  seq = existing[CA_KEY].subSubjects[subKey].length + 1 + newQuestions.length;
  await delay(800);
  await fetchJnanpith(existingKeys, newQuestions, seq);
  seq = existing[CA_KEY].subSubjects[subKey].length + 1 + newQuestions.length;
  await delay(800);
  await fetchSahitya(existingKeys, newQuestions, seq);

  // Enrich facts: author bios for single people, plus detailed book overviews.
  for (var bqi = 0; bqi < newQuestions.length; bqi++) {
    var bq = newQuestions[bqi];
    if (bio.isSinglePerson(bq.answer)) {
      var b = await bio.getBio(bq.answer, bioCache);
      if (b && bq.fact.indexOf(b) === -1) bq.fact += ' ' + b;
    }
    await enrichWithSummary(bq, bookCache);
  }

  newQuestions.forEach(function(q) {
    delete q._book;
    existing[CA_KEY].subSubjects[subKey].push(q);
  });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nBooks & Authors: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');

  bio.saveBioCache(bioCache);
  saveBookCache(bookCache);
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });
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
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'SportsBot/1.0' } }, function(res) {
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

// Header-driven column locator: returns the first column whose header text
// matches any of the given substrings, else -1. This replaces blind fixed
// indexes so table layout changes (rank columns, images) cannot shift answers.
function findCol(header, needles) {
  for (var hi = 0; hi < header.length; hi++) {
    var h = String(header[hi] || '').toLowerCase();
    if (needles.some(function(n) { return h.indexOf(n) >= 0; })) return hi;
  }
  return -1;
}

// Carry the last non-empty year forward so continuation rows (an empty year
// cell for multiple recipients in the same year) reuse the previous year.
function extractAwardeeTable(t) {
  var recipients = [];
  if (!t || t.length < 2 || !t[0]) return recipients;
  var hdr = t[0];
  var colYear = findCol(hdr, ['year']);
  var colName = findCol(hdr, ['recipient', 'winner', 'name', 'awardee']);
  var colSport = findCol(hdr, ['sport', 'discipline', 'game']);
  // Only process the real "year -> recipient" tables; ignore medal tallies
  // ("Event | Medal") and legend/footnote tables entirely.
  if (colYear < 0 || colName < 0) return recipients;
  var prevYear = '';
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 2) continue;
    var name = strip(row[colName]);
    if (!name || name.length < 3 || name === 'Name' || /recipient|—/.test(name)) continue;
    if (/^(gold|silver|bronze)/i.test(name)) continue;
    if (/^#|§|Indicates/i.test(name)) continue;
    if (/^no award$/i.test(name)) continue;
    var yrCell = (colYear < row.length ? strip(row[colYear]) : '').trim();
    var yrMatch = yrCell.match(/\b\d{4}\b/);
    var year = yrMatch ? yrMatch[0] : (yrCell || '');
    if (!year && prevYear) year = prevYear;
    if (year) prevYear = year;
    var sport = colSport >= 0 && row.length > colSport ? strip(row[colSport]) : '';
    recipients.push({ name: name, sport: sport, year: year });
  }
  return recipients;
}

// Medallist row requires a "Medal" header column (value gold/silver/bronze)
// and a "Medalist | Sport | Event" set. Games/event context is supplied from
// the nearest preceding section heading because the medal table itself carries
// no Olympics column.
function extractOlympicTable(t, gamesCtx) {
  var medalists = [];
  if (!t || t.length < 2 || !t[0]) return medalists;
  var hdr = t[0];
  var colMedal = findCol(hdr, ['medal']);
  var colName = findCol(hdr, ['medalist', 'name', 'athlete']);
  var colSport = findCol(hdr, ['sport', 'discipline']);
  var colEvent = findCol(hdr, ['event']);
  if (colMedal < 0 || colName < 0) return medalists;
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length <= colName) continue;
    var medal = strip(row[colMedal]).replace(/^[^A-Za-z]*/, '');
    if (!/^(gold|silver|bronze)/i.test(medal)) continue;
    var name = strip(row[colName]);
    if (!name || name.length < 3 || name === 'Name' || /—/.test(name)) continue;
    var sport = colSport >= 0 ? strip(row[colSport]) : '';
    var event = colEvent >= 0 ? strip(row[colEvent]) : '';
    medalists.push({ name: name, medal: medal.toLowerCase(), sport: sport, games: gamesCtx + (event && !/[0-9]{4}/.test(event) ? ' (' + event + ')' : '') });
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
        if (!r.year) return;
        var qText = 'Who received the Khel Ratna award' + (r.sport ? ' for ' + r.sport : '') + ' in ' + r.year + '?';
        var q = makeQuestion(qText, r.name, seq++, 'Khel Ratna', '\uD83C\uDFC5', r.name + ' received the Khel Ratna award in ' + r.year + (r.sport ? ' for ' + r.sport : '') + '.');
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
    // Grab every <h2>/<h3> heading with its byte offset so each medal table can
    // be paired with the section it sits under (e.g. "1964 Innsbruck").
    var headings = [];
    var hm;
    var hRe = /<(h2|h3)[^>]*>\s*<span[^>]*>([^<]{1,120}?)<\/span>[\s\S]*?<\/\1>/gi;
    while ((hm = hRe.exec(html)) !== null) headings.push({ idx: hm.index, txt: strip(hm[2]) });
    headings.sort(function(a, b) { return a.idx - b.idx; });
    function ctxFor(pos) {
      var ctx = '';
      for (var h2i = 0; h2i < headings.length; h2i++) { if (headings[h2i].idx < pos) ctx = headings[h2i].txt; }
      return ctx.replace(/\s*(?:at the|in)?\s*olympics?.*$/i, '').trim() || 'Olympics';
    }
    var tre2 = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
    var count = 0;
    var tm;
    while ((tm = tre2.exec(html)) !== null) {
      var tHTML = tm[2];
      var rows = [];
      var rRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      var rm;
      while ((rm = rRe.exec(tHTML)) !== null) {
        var cells = [];
        var cRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
        var cm;
        while ((cm = cRe.exec(rm[1])) !== null) cells.push(strip(cm[1]));
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length < 2) continue;
      var medalists = extractOlympicTable(rows, ctxFor(tm.index));
      medalists.forEach(function(m) {
        if (!m.games) return;
        var qText = 'Who won the ' + m.medal + ' medal for India at the Olympics in ' + m.games + '?';
        var q = makeQuestion(qText, m.name, seq++, 'Indian Olympic Medalists', '\uD83E\uDD47', m.name + ' won the ' + m.medal + ' medal for India at the Olympics, ' + m.games + (m.sport ? ' (' + m.sport + ')' : '') + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    }
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

  // Persist before bio enrichment so the 120s watchdog can never lose the cycle.
  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nSports: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions (saved), bio enrichment...');

  for (var bqi = 0; bqi < newQuestions.length; bqi++) {
    var bq = newQuestions[bqi];
    if (!bio.isSinglePerson(bq.answer)) continue;
    var b = await bio.getBio(bq.answer, bioCache);
    if (b && bq.fact.indexOf(b) === -1) bq.fact += ' ' + b;
  }

  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Sports: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');

  bio.saveBioCache(bioCache);
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'FilmBot/2.0' } }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) { var wait = Math.pow(2, 4 - retries) * 3000; return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait); }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date(); var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = subSubject === 'Film & Entertainment Awards' ? 'fil' : 'rec';
  return { id: prefix + '_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
}

function eventKey(q) { var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); }; return n(q.question || '').substring(0, 80) + '|' + n(q.answer || ''); }

function fetchPageText(title) { return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) { if (d && d.parse && d.parse.text) return d.parse.text['*']; return ''; }); }

function extractInfobox(html) {
  var data = {}; var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return data; var rows = m[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi); if (!rows) return data;
  for (var ri = 0; ri < rows.length; ri++) {
    var th = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i); var td = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (th && td) { var label = strip(th[1]); var value = strip(td[1]); if (label && value && label.length > 2) data[label] = value; }
  }
  return data;
}

function extractWikiTables(html) {
  var tables = []; var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m; while ((m = tRegex.exec(html)) !== null) {
    var rows = []; var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi; var rm;
    while ((rm = rRegex.exec(m[2])) !== null) {
      var cells = []; var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi; var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) { try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {} }
  console.error('Read existing');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Film & Entertainment Awards', 'World Records'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { f: {}, w: {} };
  existing[CA_KEY].subSubjects['Film & Entertainment Awards'].forEach(function(q) { ek.f[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['World Records'].forEach(function(q) { ek.w[eventKey(q)] = true; });
  var seq = { f: existing[CA_KEY].subSubjects['Film & Entertainment Awards'].length + 1, w: existing[CA_KEY].subSubjects['World Records'].length + 1 };
  var nq = { f: [], w: [] };

  process.stdout.write('  Film Awards... ');
  var AWARD_PAGES = [
    { page: 'National_Film_Awards_(India)', name: 'National Film Awards' },
    { page: 'Filmfare_Awards', name: 'Filmfare Awards' },
    { page: 'IIFA_Awards', name: 'IIFA Awards' },
    { page: 'Dadasaheb_Phalke_Award', name: 'Dadasaheb Phalke Award' },
    { page: 'Academy_Awards', name: 'Oscars' },
    { page: 'Grammy_Awards', name: 'Grammy Awards' }
  ];
  var fCount = 0;
  for (var ai = 0; ai < AWARD_PAGES.length; ai++) {
    try {
      var html = await fetchPageText(AWARD_PAGES[ai].page);
      var info = extractInfobox(html);
      var name = AWARD_PAGES[ai].name;
      ['Awarded for', 'Presented by', 'First awarded', 'Last awarded', 'Most awards'].forEach(function(k) {
        if (info[k] && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + name + '?', info[k], 'Film & Entertainment Awards', seq.f++, '' + AWARD_PAGES[ai].page, '\uD83C\uDFAC', name + ': ' + k + ' = ' + info[k] + '.');
          if (q && !ek.f[eventKey(q)]) { nq.f.push(q); ek.f[eventKey(q)] = true; fCount++; }
        }
      });
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(fCount + ' items\n');

  // ── World Records (Guinness) ──
  process.stdout.write('  World Records... ');
  try {
    var html = await fetchPageText('List_of_Indian_records_in_the_Guinness_World_Records');
    var tables = extractWikiTables(html);
    var wCount = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 15; ri++) {
        var row = t[ri]; if (row.length < 2) continue;
        var person = strip(row[0] || ''); var record = strip(row.length > 1 ? row[1] : '');
        if (person.length > 2 && record.length > 5 && person.indexOf('Name') < 0) {
          var q = makeQuestion('What Guinness World Record does ' + person + ' hold?', record, 'World Records', seq.w++, 'Guinness records in India', '\uD83C\uDF1F', person + ' holds the record: ' + record + '.');
          if (q && !ek.w[eventKey(q)]) { nq.w.push(q); ek.w[eventKey(q)] = true; wCount++; }
        }
      }
    });
    process.stdout.write(wCount + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  nq.f.forEach(function(q) { existing[CA_KEY].subSubjects['Film & Entertainment Awards'].push(q); });
  nq.w.forEach(function(q) { existing[CA_KEY].subSubjects['World Records'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Film Awards: ' + existing[CA_KEY].subSubjects['Film & Entertainment Awards'].length + ' total, ' + nq.f.length + ' new');
  console.error('World Records: ' + existing[CA_KEY].subSubjects['World Records'].length + ' total, ' + nq.w.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });


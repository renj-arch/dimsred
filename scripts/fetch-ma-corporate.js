var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'MergerBot/2.0' } }, function(res) {
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
  return { id: 'mac_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
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
  ['Mergers & Acquisitions'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}; existing[CA_KEY].subSubjects['Mergers & Acquisitions'].forEach(function(q) { ek[eventKey(q)] = true; });
  var seq = existing[CA_KEY].subSubjects['Mergers & Acquisitions'].length + 1;
  var nq = [];

  process.stdout.write('  Mergers & Acquisitions... ');
  var MA_PAGES = [
    { page: 'List_of_mergers_and_acquisitions_by_Microsoft', name: 'Microsoft acquisitions' },
    { page: 'List_of_mergers_and_acquisitions_by_Google', name: 'Google acquisitions' },
    { page: 'List_of_mergers_and_acquisitions_by_Amazon', name: 'Amazon acquisitions' },
    { page: 'Insights into Indian M&A 2024', fallback: true }
  ];
  var count = 0;
  for (var mi = 0; mi < MA_PAGES.length; mi++) {
    try {
      if (MA_PAGES[mi].fallback) continue;
      var html = await fetchPageText(MA_PAGES[mi].page);
      var tables = extractWikiTables(html);
      tables.forEach(function(t) {
        for (var ri = 1; ri < t.length && ri < 8; ri++) {
          var row = t[ri]; if (row.length < 3) continue;
          var acquirer = strip(MA_PAGES[mi].page.match(/^List_of_mergers_and_acquisitions_by_(\w+)/i) ? RegExp.$1 : '');
          var target = strip(row[0] || '');
          var year = strip(row.length > 1 ? row[1] : '');
          var value = strip(row.length > 2 ? row[2] : '');
          if (target.length > 2 && target.indexOf('Company') < 0 && (value.match(/[\d.]+/) || year.match(/20\d{2}/))) {
            var q = makeQuestion('What was the value of ' + acquirer + '\'s acquisition of ' + target + '?', value || year, 'Mergers & Acquisitions', seq++, '' + MA_PAGES[mi].page, '\uD83E\uDD1D', acquirer + ' acquired ' + target + ' for ' + (value || year) + '.');
            if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
          }
        }
      });
    } catch (e) {}
    await delay(350);
  }

  // Also try to extract from major Indian M&A pages
  try {
    var html = await fetchPageText('List_of_largest_companies_in_India');
    var tables = extractWikiTables(html);
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 10; ri++) {
        var row = t[ri]; if (row.length < 3) continue;
        var name = strip(row[0] || ''); var revenue = strip(row[row.length - 1] || '');
        if (name.length > 2 && name.indexOf('Company') < 0 && revenue.match(/[\d,]+/)) {
          var q = makeQuestion('What is the revenue of ' + name + '?', revenue, 'Mergers & Acquisitions', seq++, 'Largest companies in India', '\uD83D\uDCA5', name + ' revenue: ' + revenue + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
        }
      }
    });
  } catch (e) {}
  process.stdout.write(count + ' items\n');

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Mergers & Acquisitions'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Mergers & Acquisitions: ' + existing[CA_KEY].subSubjects['Mergers & Acquisitions'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

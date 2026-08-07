var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'MergerBot/2.0' } }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) { var wait = Math.pow(2, 4 - retries) * 3000; return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait); }
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
    { page: 'List_of_mergers_and_acquisitions_by_Microsoft', acquirer: 'Microsoft' },
    { page: 'List_of_mergers_and_acquisitions_by_Google', acquirer: 'Google' },
    { page: 'List_of_mergers_and_acquisitions_by_Amazon', acquirer: 'Amazon' },
    { page: 'List_of_mergers_and_acquisitions_by_Apple', acquirer: 'Apple' },
    { page: 'List_of_mergers_and_acquisitions_by_Meta_Platforms', acquirer: 'Meta' },
    { page: 'List_of_mergers_and_acquisitions_by_IBM', acquirer: 'IBM' },
    { page: 'List_of_acquisitions_by_Intel', acquirer: 'Intel' }
  ];
  var count = 0;
  var rowCap = 40; // cap rows per table/run so later reruns pick up remaining rows (dedup skips already-added)
  for (var mi = 0; mi < MA_PAGES.length; mi++) {
    try {
      var html = await fetchPageText(MA_PAGES[mi].page);
      var tables = extractWikiTables(html);
      var perPage = 0;
      for (var ti = 0; ti < tables.length && perPage < rowCap; ti++) {
        var t = tables[ti];
        for (var ri = 1; ri < t.length && perPage < rowCap; ri++) {
          var row = t[ri]; if (row.length < 3) continue;
          var acquirer = MA_PAGES[mi].acquirer || '';
          var target = strip(row[0] || '');
          var year = strip(row.length > 1 ? row[1] : '');
          var value = strip(row.length > 2 ? row[2] : '');
          if (acquirer && target.length > 2 && target.indexOf('Company') < 0 && (value.match(/[\d.]+/) || year.match(/20\d{2}/))) {
            var ans = value || year;
            var q = makeQuestion('What was the value of ' + acquirer + '\'s acquisition of ' + target + '?', ans, 'Mergers & Acquisitions', seq++, 'M&A', '\uD83E\uDD1D', acquirer + ' acquired ' + target + ' for ' + ans + ' in ' + year + '.');
            if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; perPage++; }
          }
        }
      }
      console.error('  ' + MA_PAGES[mi].acquirer + ': ' + perPage + ' new');
    } catch (e) { console.error('  ' + MA_PAGES[mi].acquirer + ': error ' + e.message); }
    await delay(350);
  }

  // Also try to extract from major Indian M&A pages
  try {
    var html = await fetchPageText('List_of_largest_companies_in_India');
    var tables = extractWikiTables(html);
    var coCount = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri]; if (row.length < 3) continue;
        var name = strip(row[0] || ''); var revenue = strip(row[row.length - 1] || '');
        if (name.length > 2 && name.indexOf('Company') < 0 && revenue.match(/[\d,]+/)) {
          var q = makeQuestion('What is the revenue of ' + name + '?', revenue, 'Mergers & Acquisitions', seq++, 'Largest companies in India', '\uD83D\uDCA5', name + ' revenue: ' + revenue + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; coCount++; }
        }
      }
    });
    console.error('  Largest companies: ' + coCount + ' new');
  } catch (e) {}
  process.stdout.write(count + ' items\n');

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Mergers & Acquisitions'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Mergers & Acquisitions: ' + existing[CA_KEY].subSubjects['Mergers & Acquisitions'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

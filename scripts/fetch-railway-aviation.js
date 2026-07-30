var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'RailBot/2.0' } }, function(res) {
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
  var prefix = subSubject === 'Railways' ? 'rail' : 'avi';
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
  ['Railways', 'Aviation'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { r: {}, a: {} };
  existing[CA_KEY].subSubjects['Railways'].forEach(function(q) { ek.r[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Aviation'].forEach(function(q) { ek.a[eventKey(q)] = true; });
  var seq = { r: existing[CA_KEY].subSubjects['Railways'].length + 1, a: existing[CA_KEY].subSubjects['Aviation'].length + 1 };
  var nq = { r: [], a: [] };

  // ── Indian Railways ──
  process.stdout.write('  Railways... ');
  var RAIL_PAGES = [
    { page: 'Indian_Railways', name: 'Indian Railways' },
    { page: 'Bharat_Gaurav_Train', name: 'Bharat Gaurav Train' },
    { page: 'Vande_Bharat_Express', name: 'Vande Bharat Express' },
    { page: 'Ministry_of_Railways_(India)', name: 'Ministry of Railways' },
    { page: 'Railway_Board', name: 'Railway Board' }
  ];
  var rCount = 0;
  for (var pi = 0; pi < RAIL_PAGES.length; pi++) {
    try {
      var html = await fetchPageText(RAIL_PAGES[pi].page);
      var info = extractInfobox(html);
      var name = RAIL_PAGES[pi].name;
      ['Headquarters', 'Founded', 'Minister', 'Chairperson', 'CEO', 'Revenue', 'Length', 'Lines'].forEach(function(k) {
        if (info[k] && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + name + '?', info[k], 'Railways', seq.r++, '' + name, '\uD83D\uDE82', name + ' ' + k + ': ' + info[k] + '.');
          if (q && !ek.r[eventKey(q)]) { nq.r.push(q); ek.r[eventKey(q)] = true; rCount++; }
        }
      });
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(rCount + ' items\n');

  // ── Aviation ──
  process.stdout.write('  Aviation... ');
  var AV_PAGES = [
    { page: 'Ministry_of_Civil_Aviation_(India)', name: 'Ministry of Civil Aviation' },
    { page: 'Directorate_General_of_Civil_Aviation_(India)', name: 'DGCA' },
    { page: 'Air_India', name: 'Air India' },
    { page: 'IndiGo', name: 'IndiGo' },
    { page: 'SpiceJet', name: 'SpiceJet' },
    { page: 'Airports_Authority_of_India', name: 'AAI' }
  ];
  var aCount = 0;
  for (var pi2 = 0; pi2 < AV_PAGES.length; pi2++) {
    try {
      var html = await fetchPageText(AV_PAGES[pi2].page);
      var info = extractInfobox(html);
      var name = AV_PAGES[pi2].name;
      ['Headquarters', 'Founded', 'Minister', 'Chairperson', 'CEO', 'Revenue', 'Hubs', 'Fleet size', 'Destinations'].forEach(function(k) {
        if (info[k] && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + name + '?', info[k], 'Aviation', seq.a++, '' + AV_PAGES[pi2].page, '\u2708\uFE0F', name + ' ' + k + ': ' + info[k] + '.');
          if (q && !ek.a[eventKey(q)]) { nq.a.push(q); ek.a[eventKey(q)] = true; aCount++; }
        }
      });
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(aCount + ' items\n');

  nq.r.forEach(function(q) { existing[CA_KEY].subSubjects['Railways'].push(q); });
  nq.a.forEach(function(q) { existing[CA_KEY].subSubjects['Aviation'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Railways: ' + existing[CA_KEY].subSubjects['Railways'].length + ' total, ' + nq.r.length + ' new');
  console.error('Aviation: ' + existing[CA_KEY].subSubjects['Aviation'].length + ' total, ' + nq.a.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

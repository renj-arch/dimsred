var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ParkBot/2.0' } }, function(res) {
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

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = subSubject === 'National Parks & Wildlife' ? 'npw' : 'ram';
  return { id: prefix + '_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

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

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['National Parks & Wildlife']) existing[CA_KEY].subSubjects['National Parks & Wildlife'] = [];
  if (!existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands']) existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'] = [];

  var ekN = {}, ekR = {};
  existing[CA_KEY].subSubjects['National Parks & Wildlife'].forEach(function(q) { ekN[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'].forEach(function(q) { ekR[eventKey(q)] = true; });
  var seqN = existing[CA_KEY].subSubjects['National Parks & Wildlife'].length + 1;
  var seqR = existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'].length + 1;
  var newN = [], newR = [];

  // ── Fetch National Parks from List of national parks of India ──
  process.stdout.write('  National Parks... ');
  try {
    var html = await fetchPageText('List_of_national_parks_of_India');
    // Split by h2 headings to associate tables with states
    var sections = html.split(/<h2[^>]*>/i);
    var npCount = 0;
    for (var si = 1; si < sections.length; si++) {
      var sec = sections[si];
      // Extract state name from the first span or text after h2
      var state = '';
      var editMatch = sec.match(/<span class="mw-editsection">/i);
      if (editMatch) {
        var beforeEdit = sec.substring(0, editMatch.index);
        state = strip(beforeEdit).replace(/\(\d+\)$/, '').trim();
      }
      if (!state || state === 'State-wise List of National Parks' || state === 'See also' || state === 'References') continue;
      
      var tables = extractWikiTables(sec);
      tables.forEach(function(t) {
        for (var ri = 1; ri < t.length; ri++) {
          var row = t[ri];
          if (row.length < 1) continue;
          var name = strip(row[0] || '');
          if (name.length > 2 && name.indexOf('Name') < 0 && name.indexOf('National Park') > 0) {
            var q = makeQuestion('Which state is the ' + name + ' located in?', state, 'National Parks & Wildlife', seqN++, 'List of national parks of India', '\uD83E\uDD81', name + ' is located in ' + state + '.');
            if (q && !ekN[eventKey(q)]) { newN.push(q); ekN[eventKey(q)] = true; npCount++; }
          }
        }
      });
    }
    process.stdout.write(npCount + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(600);

  // ── Fetch Ramsar Sites from List of Ramsar sites in India ──
  process.stdout.write('  Ramsar Sites... ');
  try {
    var html = await fetchPageText('List_of_Ramsar_sites_in_India');
    var tables = extractWikiTables(html);
    var rsCount = 0;
    tables.forEach(function(t) {
      // Find the table with State/UT and Name of site columns
      var firstRow = t[0] || [];
      var hasState = firstRow.some(function(c) { return c.toLowerCase().indexOf('state') >= 0 || c.toLowerCase().indexOf('site') >= 0; });
      if (!hasState) return;
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 3) continue;
        var state = strip(row[0] || '');
        var name = strip(row[2] || '');
        if (state.length > 2 && name.length > 2 && state.indexOf('State') < 0 && name.indexOf('Name') < 0) {
          var q = makeQuestion('Which Ramsar site is located in ' + state + '?', name, 'Ramsar Sites & Wetlands', seqR++, 'Ramsar sites in India', '\uD83C\uDF0A', name + ' is a Ramsar site in ' + state + '.');
          if (q && !ekR[eventKey(q)]) { newR.push(q); ekR[eventKey(q)] = true; rsCount++; }
        }
      }
    });
    process.stdout.write(rsCount + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  newN.forEach(function(q) { existing[CA_KEY].subSubjects['National Parks & Wildlife'].push(q); });
  newR.forEach(function(q) { existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('National Parks & Wildlife: ' + existing[CA_KEY].subSubjects['National Parks & Wildlife'].length + ' total, ' + newN.length + ' new');
  console.error('Ramsar Sites & Wetlands: ' + existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'].length + ' total, ' + newR.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

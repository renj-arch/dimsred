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
  function maxSeq(arr, prefix) {
    var mx = 0;
    arr.forEach(function(q) { var m = new RegExp('^' + prefix + '_(\\d+)$').exec(q.id || ''); if (m) mx = Math.max(mx, parseInt(m[1], 10)); });
    return mx + 1;
  }
  var seqN = maxSeq(existing[CA_KEY].subSubjects['National Parks & Wildlife'], 'npw');
  var seqR = maxSeq(existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'], 'ram');
  var newN = [], newR = [];

  // ── Fetch National Parks from List of national parks of India ──
  process.stdout.write('  National Parks... ');
  try {
    var html = await fetchPageText('List_of_national_parks_of_India');
    // Split by h2 headings to associate tables with states
    var sections = html.split(/<h2[^>]*>/i);
    var freshNp = {};
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
          if (name.length > 2 && name.indexOf('Name') < 0 && name.indexOf('National Park') > 0) freshNp[name] = state;
        }
      });
    }

    var existingNp = existing[CA_KEY].subSubjects['National Parks & Wildlife'];
    var byPark = {};
    existingNp.forEach(function(q) {
      var m = /Which state is the (.+?) located in\?/.exec(q.question || '');
      if (m) byPark[m[1]] = q;
    });
    var npUpdated = 0;
    Object.keys(freshNp).sort().forEach(function(name) {
      var state = freshNp[name];
      var qText = 'Which state is the ' + name + ' located in?';
      var fact = name + ' is located in ' + state + '.';
      var existingQ = byPark[name];
      if (existingQ) {
        if (existingQ.answer !== state || existingQ.fact !== fact) { existingQ.answer = state; existingQ.fact = fact; npUpdated++; }
      } else {
        var q = makeQuestion(qText, state, 'National Parks & Wildlife', seqN++, 'List of national parks of India', '\uD83E\uDD81', fact);
        if (q) newN.push(q);
      }
    });
    var npBefore = existingNp.length;
    existing[CA_KEY].subSubjects['National Parks & Wildlife'] = existingNp.filter(function(q) {
      var m = /Which state is the (.+?) located in\?/.exec(q.question || '');
      return !m || freshNp[m[1]];
    });
    var npRemoved = npBefore - existing[CA_KEY].subSubjects['National Parks & Wildlife'].length;
    process.stdout.write(Object.keys(freshNp).length + ' parks, ' + npUpdated + ' updated, ' + newN.length + ' new, ' + npRemoved + ' removed\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(600);

  // ── Fetch Ramsar Sites from List of Ramsar sites in India ──
  process.stdout.write('  Ramsar Sites... ');
  try {
    var html = await fetchPageText('List_of_Ramsar_sites_in_India');
    var tables = extractWikiTables(html);
    var stateMap = {};
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
          if (!stateMap[state]) stateMap[state] = [];
          var parts = name.split(/[;,]/).map(function(s) { return s.replace(/\s+/g, ' ').trim(); }).filter(function(s) { return s.length > 1; });
          parts.forEach(function(p) { if (stateMap[state].indexOf(p) < 0) stateMap[state].push(p); });
        }
      }
    });

    var existingRamsar = existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'];
    var byState = {};
    existingRamsar.forEach(function(q) {
      var m = /Which Ramsar site is located in (.+)\?/.exec(q.question || '');
      if (m) byState[m[1]] = q;
    });

    var newR = [];
    var updated = 0;
    Object.keys(stateMap).sort().forEach(function(state) {
      var sites = stateMap[state].sort();
      var combined = sites.join(' , ');
      var qText = 'Which Ramsar site is located in ' + state + '?';
      var fact = sites.length > 1
        ? 'Ramsar sites in ' + state + ': ' + combined + '.'
        : sites[0] + ' is a Ramsar site in ' + state + '.';
      var existingQ = byState[state];
      if (existingQ) {
        if (existingQ.answer !== combined || existingQ.fact !== fact) {
          existingQ.answer = combined;
          existingQ.fact = fact;
          updated++;
        }
      } else {
        var q = makeQuestion(qText, combined, 'Ramsar Sites & Wetlands', seqR++, 'Ramsar sites in India', '\uD83C\uDF0A', fact);
        if (q) newR.push(q);
      }
    });

    var before = existingRamsar.length;
    existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'] = existingRamsar.filter(function(q) {
      var m = /Which Ramsar site is located in (.+)\?/.exec(q.question || '');
      return !m || stateMap[m[1]];
    });
    var removed = before - existing[CA_KEY].subSubjects['Ramsar Sites & Wetlands'].length;
    process.stdout.write(Object.keys(stateMap).length + ' states, ' + updated + ' updated, ' + newR.length + ' new, ' + removed + ' removed\n');
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

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'InfraBot/1.0' } }, function(res) {
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
  var id = 'infra_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Infrastructure & Transport', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchVandeBharat(existingKeys, newQuestions, seqObj) {
  console.error('--- Vande Bharat Express ---');
  try {
    var html = await fetchPageText('List_of_Vande_Bharat_Express_trains');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 2) return;
      var hr = t[0], hasName = -1, hasRoute = -1;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('name') >= 0 || h.indexOf('train') >= 0) hasName = ci;
        if (h.indexOf('route') >= 0 || h.indexOf('termini') >= 0 || h.indexOf('from') >= 0) hasRoute = ci;
      }
      if (hasName < 0 && hasRoute < 0) { hasName = 0; hasRoute = Math.min(1, hr.length - 1); }
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < Math.max(hasName, hasRoute) + 1) continue;
        var name = strip(row[hasName]);
        var route = strip(row[hasRoute]);
        if (!name || name.length < 5 || name === 'Name' || name.indexOf('Vande Bharat') < 0) continue;
        if (route) {
          var parts = route.split(/[–-]/);
          if (parts.length >= 2) {
            var origin = strip(parts[0]);
            var dest = strip(parts[parts.length - 1]);
            var qText = 'The Vande Bharat Express train connects which two cities?';
            var q = makeQuestion(qText, origin + ' and ' + dest, seqObj.seq++, 'Vande Bharat', '\uD83D\uDE86', name + ' runs between ' + origin + ' and ' + dest + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' Vande Bharat questions added\n');
    if (count === 0) {
      var vbRoutes = [
        { o: 'New Delhi', d: 'Varanasi' },
        { o: 'New Delhi', d: 'Katra (Shri Mata Vaishno Devi)' },
        { o: 'Mumbai', d: 'Ahmedabad' },
        { o: 'New Delhi', d: 'Chandigarh' },
        { o: 'Chennai', d: 'Bengaluru' },
        { o: 'New Delhi', d: 'Ayodhya' },
        { o: 'Mumbai', d: 'Shirdi' },
        { o: 'New Delhi', d: 'Amritsar' },
        { o: 'Howrah', d: 'New Jalpaiguri' },
        { o: 'Secunderabad', d: 'Visakhapatnam' },
        { o: 'Mumbai', d: 'Sainagar Shirdi' },
        { o: 'New Delhi', d: 'Dehradun' },
      ];
      vbRoutes.forEach(function(v) {
        var qText = 'The Vande Bharat Express connects which city to ' + v.d + '?';
        var q = makeQuestion(qText, v.o, seqObj.seq++, 'Reference - Vande Bharat', '\uD83D\uDE86', 'Vande Bharat runs between ' + v.o + ' and ' + v.d + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + vbRoutes.length + ' Vande Bharat questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchRailwayZones(existingKeys, newQuestions, seqObj) {
  console.error('--- Railway Zones ---');
  try {
    var html = await fetchPageText('Indian_Railways');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 2) return;
      var hr = t[0], zoneCol = -1, hqCol = -1;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('zone') >= 0) zoneCol = ci;
        if (h.indexOf('hq') >= 0 || h.indexOf('headquarter') >= 0) hqCol = ci;
      }
      if (zoneCol >= 0 && hqCol >= 0) {
        for (var ri = 1; ri < t.length; ri++) {
          var row = t[ri];
          if (row.length < Math.max(zoneCol, hqCol) + 1) continue;
          var zone = strip(row[zoneCol]);
          var hq = strip(row[hqCol]);
          if (zone && hq && zone.length > 3 && zone !== 'Zone' && hq !== 'Headquarters' && hq.length > 2 && hq.indexOf('.mw') < 0) {
            var qText = 'Where is the headquarters of the ' + zone + ' railway zone?';
            var q = makeQuestion(qText, hq, seqObj.seq++, 'Indian Railways', '\uD83D\uDE86', 'The ' + zone + ' zone headquarters is in ' + hq + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' railway zone questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchMajorPorts(existingKeys, newQuestions, seqObj) {
  console.error('--- Major Ports ---');
  try {
    var html = await fetchPageText('List_of_ports_in_India');
    var tables = extractWikiTables(html);
    // Only the "major ports" table has a "Cargo handled" column; the second
    // table lists minor/private ports and would mislead "major port" questions.
    var portTables = tables.filter(function(t) {
      if (t.length < 2) return false;
      var joined = String(t[0].join(' ') || '').toLowerCase();
      if (joined.indexOf('cargo handled') >= 0) return true;
      if (joined.indexOf('ownership') >= 0 || joined.indexOf('private') >= 0) return false;
      return true;
    });
    if (tables.length > 1 && portTables.length === tables.length) portTables = tables.slice(0, 1);
    var count = 0;
    portTables.forEach(function(t) {
      if (t.length < 2) return;
      var hr = t[0], nameCol = -1, stateCol = -1;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = String(hr[ci] || '').toLowerCase();
        if (nameCol < 0 && (h.indexOf('name') >= 0 || h.indexOf('port') >= 0) && h.indexOf('location') < 0) nameCol = ci;
        // Prefer a State/UT column over a generic Location (city) column.
        if (h.indexOf('state') >= 0 || h.indexOf('ut') >= 0) stateCol = ci;
        else if (stateCol < 0 && h.indexOf('location') >= 0) stateCol = ci;
      }
      if (nameCol < 0) return;
      if (stateCol < 0) { nameCol = 1; stateCol = 6; }
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (!row || row.length < Math.max(nameCol, stateCol) + 1) continue;
        var port = strip(row[nameCol]);
        var state = strip(row[stateCol]);
        if (port && port.length > 3 && port !== 'Port Name' && port !== 'Port' && state && state.length > 2) {
          var parts = state.split(',');
          state = strip(parts[0]);
          var qText = 'Which major port is located in ' + state + '?';
          var q = makeQuestion(qText, port, seqObj.seq++, 'Indian Ports', '\u26F5', port + ' is a major port in ' + state + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' port questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Infrastructure & Transport';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchVandeBharat(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchRailwayZones(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchMajorPorts(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nInfrastructure & Transport: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

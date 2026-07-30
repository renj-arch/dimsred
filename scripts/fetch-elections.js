var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ElectionsBot/2.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
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
  return { id: 'ele_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractInfobox(html) {
  var data = {}; var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return data; var rows = m[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi); if (!rows) return data;
  for (var ri = 0; ri < rows.length; ri++) {
    var th = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i); var td = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (th && td) { var label = strip(th[1]); var value = strip(td[1]); if (label && value && label.length > 2) data[label] = value; }
  }
  return data;
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
  ['Elections'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {};
  existing[CA_KEY].subSubjects['Elections'].forEach(function(q) { ek[eventKey(q)] = true; });
  var seq = existing[CA_KEY].subSubjects['Elections'].length + 1;
  var nq = [];

  // ── 2024 General Election results ──
  process.stdout.write('  General Elections... ');
  var elPages = [
    '2024_Indian_general_election',
    '2024_Indian_general_election_in_%s'
  ];
  try {
    var html = await fetchPageText('2024_Indian_general_election');
    var info = html.match(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    var eCount = 0;
    // Extract party vote shares from infobox
    var tables = extractWikiTables(html);
    tables.forEach(function(t) {
      if (t.length < 2) return;
      var header = t[0].join(' ').toLowerCase();
      if (header.indexOf('party') >= 0 && header.indexOf('seats') >= 0 && header.indexOf('vote') >= 0) {
        for (var ri = 1; ri < t.length && ri < 12; ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var party = strip(row[0] || '');
          var seats = strip(row[1] || '');
          var votePct = strip(row.length > 2 ? row[row.length - 1] : '');
          if (party.length > 2 && party.indexOf('Party') < 0 && seats.match(/\d+/)) {
            var q = makeQuestion('How many seats did ' + party + ' win in the 2024 Lok Sabha election?', seats, 'Elections', seq++, '2024 Indian general election', '\uD83D\uDDF3', party + ' won ' + seats + ' seats in 2024 LS election' + (votePct ? ' (' + votePct + ')' : '') + '.');
            if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; eCount++; }
          }
        }
      }
    });
    // Also try to find turnout / overall data
    var turnout = html.match(/(?:voter\s+turnout|turnout)[^<]*?([\d.]+%)/i);
    if (turnout) {
      var q = makeQuestion('What was the voter turnout in the 2024 Indian general election?', turnout[1], 'Elections', seq++, '2024 Indian general election', '\uD83D\uDDF3', 'Voter turnout in 2024: ' + turnout[1] + '.');
      if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; eCount++; }
    }
    process.stdout.write(eCount + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(600);

  // ── State Assembly elections recent ──
  process.stdout.write('  Assembly Elections... ');
  try {
    var html = await fetchPageText('2025_elections_in_India');
    var tables = extractWikiTables(html);
    var aCount = 0;
    tables.forEach(function(t) {
      var hdr = t[0] || [];
      var isStateTable = hdr.some(function(c) { return c.toLowerCase().indexOf('state') >= 0 || c.toLowerCase().indexOf('ut') >= 0; });
      if (!isStateTable) return;
      for (var ri = 1; ri < t.length && ri < 20; ri++) {
        var row = t[ri];
        if (row.length < 4) continue;
        var state = strip(row[1] || '');
        var afterParty = strip(row.length > 6 ? row[6] : '');
        var afterCM = strip(row.length > 7 ? row[7] : '');
        var result = afterParty || afterCM;
        if (state.length > 2 && state.indexOf('State') < 0 && state.indexOf('Date') < 0 && result.length > 2) {
          var q = makeQuestion('Which party won the ' + state + ' assembly election?', result, 'Elections', seq++, '2025 elections in India', '\uD83D\uDDF3', state + ' assembly election result: ' + result + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; aCount++; }
        }
      }
    });
    process.stdout.write(aCount + ' items\n');
  } catch (e) { process.stdout.write('Not found: ' + e.message + '\n'); }
  await delay(600);

  // ── Election Commission of India / key facts ──
  process.stdout.write('  Election bodies... ');
  try {
    var html = await fetchPageText('Election_Commission_of_India');
    var info = extractInfobox(html);
    var ecCount = 0;
    Object.keys(info).forEach(function(k) {
      if (k.indexOf('executive') >= 0 || k.indexOf('Commissioner') >= 0 || k === 'Chairperson') {
        var val = info[k];
        var cecMatch = val.match(/Chief Election Commissioner\s+of\s+India\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/) || val.match(/Chief Election Commissioner[^,]*,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i) || val.match(/,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*,\s*Chief Election Commissioner/i);
        var cec = cecMatch ? cecMatch[1].trim() : '';
        if (cec.length > 3) {
          var q = makeQuestion('Who is the Chief Election Commissioner of India?', cec, 'Elections', seq++, 'ECI', '\uD83D\uDDF3', 'CEC: ' + cec + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; ecCount++; }
        }
      }
    });
    process.stdout.write(ecCount + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Elections'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Elections: ' + existing[CA_KEY].subSubjects['Elections'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

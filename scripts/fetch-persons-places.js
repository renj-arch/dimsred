var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var bio = require('./bio-cache');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'PersonsPlacesBot/2.0' } }, function(res) {
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
  var prefix = subSubject === 'Persons in News' ? 'per' : 'pla';
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

function extractInfobox(html) {
  var data = {};
  var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return data;
  var rows = m[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return data;
  for (var ri = 0; ri < rows.length; ri++) {
    var th = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var td = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (th && td) { var label = strip(th[1]); var value = strip(td[1]); if (label && value && label.length > 2) data[label] = value; }
  }
  return data;
}

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Persons in News', 'Places in News'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { pe: {}, pl: {} };
  existing[CA_KEY].subSubjects['Persons in News'].forEach(function(q) { ek.pe[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Places in News'].forEach(function(q) { ek.pl[eventKey(q)] = true; });
  var seq = { pe: existing[CA_KEY].subSubjects['Persons in News'].length + 1, pl: existing[CA_KEY].subSubjects['Places in News'].length + 1 };
  var nq = { pe: [], pl: [] };

  var bioCache = bio.loadBioCache();

  // ── Fetch CM / Governors / Cabinet ministers from infobox ──
  process.stdout.write('  Incumbents (Persons in News)... ');
  var OFFICES = [
    { page: 'List_of_current_Indian_chief_ministers', q: 'Who is the Chief Minister of %s?', field: 'Chief Minister' },
    { page: 'List_of_current_Indian_governors', q: 'Who is the Governor of %s?', field: 'Governor' }
  ];
  var peCount = 0;
  for (var oi = 0; oi < OFFICES.length; oi++) {
    try {
      var html = await fetchPageText(OFFICES[oi].page);
      var tables = html.match(/<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
      if (tables) {
        tables.forEach(function(tbl) {
          var rows = tbl.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          if (!rows || rows.length < 2) return;
          for (var ri = 1; ri < rows.length && ri < 25; ri++) {
            var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
            if (!cells || cells.length < 2) continue;
            var person = strip(cells.length > 1 ? cells[1] : cells[0]);
            var state = strip(cells[0]);
            if (person.length > 2 && state.length > 2 && person.indexOf('Name') < 0 && state.indexOf('State') < 0) {
              var q = makeQuestion(OFFICES[oi].q.replace('%s', state), person, 'Persons in News', seq.pe++, '' + OFFICES[oi].page, '\uD83D\uDC64', state + ' ' + OFFICES[oi].field + ': ' + person + '.');
              if (q && !ek.pe[eventKey(q)]) { nq.pe.push(q); ek.pe[eventKey(q)] = true; peCount++; }
            }
          }
        });
      }
    } catch (e) {}
    await delay(400);
  }
  process.stdout.write(peCount + ' items\n');

  // ── Places in News: capital cities, major infrastructure ──
  process.stdout.write('  State Capitals (Places in News)... ');
  try {
    var html = await fetchPageText('List_of_state_and_union_territory_capitals_in_India');
    var tables = html.match(/<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
    if (tables) {
      tables.forEach(function(tbl) {
        var rows = tbl.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        if (!rows || rows.length < 2) return;
        for (var ri = 1; ri < rows.length && ri < 20; ri++) {
          var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
          if (!cells || cells.length < 2) continue;
          var state = strip(cells.length > 1 ? cells[1] : cells[0]);
          var cap = strip(cells[0]);
          if (state.length > 2 && cap.length > 2 && state.indexOf('State') < 0) {
            var q = makeQuestion('What is the capital of ' + state + '?', cap, 'Places in News', seq.pl++, 'State capitals', '\uD83D\uDCCD', 'Capital of ' + state + ' is ' + cap + '.');
            if (q && !ek.pl[eventKey(q)]) { nq.pl.push(q); ek.pl[eventKey(q)] = true; }
          }
        }
      });
    }
  } catch (e) {}
  await delay(400);

  // ── Major Indian cities population data ──
  process.stdout.write('  Cities (Places in News)... ');
  try {
    var html = await fetchPageText('List_of_cities_in_India_by_population');
    var tables = html.match(/<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
    if (tables) {
      tables.forEach(function(tbl) {
        var rows = tbl.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        if (!rows || rows.length < 2) return;
        for (var ri = 1; ri < rows.length && ri < 15; ri++) {
          var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
          if (!cells || cells.length < 2) continue;
          var city = strip(cells[0]);
          var state = strip(cells.length > 2 ? cells[2] : cells[1]);
          if (city.length > 2 && city.indexOf('City') < 0 && state.length > 2) {
            var q = makeQuestion('Which state is ' + city + ' located in?', state, 'Places in News', seq.pl++, 'Cities by population', '\uD83C\uDFD9', city + ' is in ' + state + '.');
            if (q && !ek.pl[eventKey(q)]) { nq.pl.push(q); ek.pl[eventKey(q)] = true; }
          }
        }
      });
    }
  } catch (e) {}

  for (var bqi = 0; bqi < nq.pe.length; bqi++) {
    var bq = nq.pe[bqi];
    if (!bio.isSinglePerson(bq.answer)) continue;
    var b = await bio.getBio(bq.answer, bioCache);
    if (b && bq.fact.indexOf(b) === -1) bq.fact += ' ' + b;
  }

  nq.pe.forEach(function(q) { existing[CA_KEY].subSubjects['Persons in News'].push(q); });
  nq.pl.forEach(function(q) { existing[CA_KEY].subSubjects['Places in News'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Persons in News: ' + existing[CA_KEY].subSubjects['Persons in News'].length + ' total, ' + nq.pe.length + ' new');
  console.error('Places in News: ' + existing[CA_KEY].subSubjects['Places in News'].length + ' total, ' + nq.pl.length + ' new');

  bio.saveBioCache(bioCache);
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

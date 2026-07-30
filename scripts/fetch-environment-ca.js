var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'EnvBot/1.0' } }, function(res) {
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
  var id = 'env_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Environment & Climate', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchCOP(existingKeys, newQuestions, seqObj) {
  console.error('--- COP Summits ---');
  try {
    var html = await fetchPageText('United_Nations_Climate_Change_Conference');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('Year') >= 0 || h0.indexOf('Conference') >= 0 || h0.indexOf('COP') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 35); ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var year = strip(row[0]);
          var name = strip(row[1]);
          var venue = row.length > 2 ? strip(row[2]) : '';
          if (year && name && parseInt(year) > 1990 && name.indexOf('COP') >= 0) {
            if (venue && venue.length > 3 && venue.indexOf('Venue') < 0) {
              var qText = 'The ' + name + ' climate conference was held in which city?';
              var q = makeQuestion(qText, venue, seqObj.seq++, 'COP', '\uD83C\uDF1D', name + ' was held in ' + venue + '.');
              if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
            }
            if (ri > 1) {
              var prevYear = strip(t[ri - 1][0]);
              if (prevYear && parseInt(prevYear) > 1990) {
                var qText2 = 'Which COP summit was held in ' + year + '?';
                var a2 = name.replace(/Conference|\(.*?\)/g,'').trim();
                var q2 = makeQuestion(qText2, a2, seqObj.seq++, 'COP', '\uD83C\uDF1D', name + ' was the COP summit in ' + year + '.');
                if (q2 && !existingKeys[eventKey(q2)]) { newQuestions.push(q2); existingKeys[eventKey(q2)] = true; count++; }
              }
            }
          }
        }
      }
    });
    console.error('  ' + count + ' COP questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchEnvLegislation(existingKeys, newQuestions, seqObj) {
  console.error('--- Environmental Legislation ---');
  try {
    var html = await fetchPageText('Environmental_law_in_India');
    var sections = html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>[\s\S]*?<ul>([\s\S]*?)<\/ul>/gi);
    var count = 0;
    if (sections) {
      sections.forEach(function(s) {
        var titleMatch = s.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
        var title = titleMatch ? strip(titleMatch[1]) : '';
        var items = s.match(/<li><b>([\s\S]*?)<\/b>[\s\S]*?<\/li>/gi);
        if (!items) items = s.match(/<li>([\s\S]*?)<\/li>/gi);
        if (items && title) {
          items.forEach(function(li) {
            var txt = strip(li);
            if (txt.length > 5 && txt.indexOf('Act') >= 0) {
              var act = txt.match(/([A-Z][A-Za-z\s]+Act,\s*\d{4})/);
              if (!act) act = txt.match(/([A-Z][A-Za-z\s]+Act)/);
              if (act) {
                var qText = 'Which Indian environmental act is related to ' + title.replace(/Act/i,'').trim() + '?';
                var q = makeQuestion(qText, strip(act[1]), seqObj.seq++, 'Env Law', '\uD83C\uDF1D', strip(act[1]) + ': ' + txt.substring(0, 100));
                if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
              }
            }
          });
        }
      });
    }
    console.error('  ' + count + ' legislation questions added\n');
    if (count === 0) {
      var envLaws = [
        { q: 'Which is the main environmental protection act in India?', a: 'Environment Protection Act, 1986' },
        { q: 'Which act deals with air pollution control in India?', a: 'Air (Prevention and Control of Pollution) Act, 1981' },
        { q: 'Which act deals with water pollution control in India?', a: 'Water (Prevention and Control of Pollution) Act, 1974' },
        { q: 'Which act protects wildlife in India?', a: 'Wild Life Protection Act, 1972' },
        { q: 'Which act conserves forests in India?', a: 'Forest (Conservation) Act, 1980' },
        { q: 'Which act deals with biodiversity in India?', a: 'Biological Diversity Act, 2002' },
        { q: 'Which act deals with plastic waste management?', a: 'Plastic Waste Management Rules, 2016' },
        { q: 'What is the full form of EIA?', a: 'Environmental Impact Assessment' },
        { q: 'Which body regulates environmental standards in India?', a: 'Central Pollution Control Board (CPCB)' },
        { q: 'What is the full form of NCAP?', a: 'National Clean Air Programme' },
      ];
      envLaws.forEach(function(e) {
        var q = makeQuestion(e.q, e.a, seqObj.seq++, 'Reference - Environmental Law', '\uD83C\uDF1D', e.a);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' legislation questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchNationalParks(existingKeys, newQuestions, seqObj) {
  console.error('--- National Parks ---');
  try {
    var html = await fetchPageText('List_of_national_parks_of_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('Park') >= 0 || h0.indexOf('Name') >= 0 || h0.indexOf('National park') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 60); ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var park = strip(row[0]);
          var state = row.length > 1 ? strip(row[1]) : '';
          if (park && state && park.length > 3 && park !== 'Name' && state.length > 2 && state !== 'State') {
            var qText = 'Which national park is located in ' + state + '?';
            var q = makeQuestion(qText, park, seqObj.seq++, 'National Parks', '\uD83C\uDF33', park + ' is a national park in ' + state + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' national park questions added\n');
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
  var subKey = 'Environment & Climate';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchCOP(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchEnvLegislation(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchNationalParks(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nEnvironment & Climate: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

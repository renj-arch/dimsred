var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'SummitsBot/1.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

var SUMMITS = [
  {
    page: '2025_G20_Johannesburg_summit',
    label: '2025 G20 Summit',
    date: '2025',
    emoji: '\uD83C\uDF0D',
    questions: [
      { q: 'The 2025 G20 summit was held in which country?', field: 'Host country', type: 'host' },
      { q: 'The 2025 G20 summit was held in which city?', field: 'Cities', type: 'city' },
      { q: 'Who was the chair of the 2025 G20 summit?', field: 'Chair', type: 'chair' }
    ]
  },
  {
    page: '2026_G20_Miami_summit',
    label: '2026 G20 Summit',
    date: '2026',
    emoji: '\uD83C\uDF0D',
    questions: [
      { q: 'The 2026 G20 summit will be held in which country?', field: 'Host country', type: 'host' },
      { q: 'The 2026 G20 summit will be held in which city?', field: 'Cities', type: 'city' },
      { q: 'Who is the chair of the 2026 G20 summit?', field: 'Chair', type: 'chair' }
    ]
  },
  {
    page: '17th_BRICS_summit',
    label: '2025 BRICS Summit',
    date: '2025',
    emoji: '\uD83E\uDD1D',
    questions: [
      { q: 'The 2025 BRICS summit was held in which country?', field: 'Host country', type: 'host' },
      { q: 'The 2025 BRICS summit was held in which city?', field: 'Cities', type: 'city' },
      { q: 'What is the motto of the 2025 BRICS summit?', field: 'Motto', type: 'motto' }
    ]
  },
  {
    page: '2025_Tianjin_SCO_summit',
    label: '2025 SCO Summit',
    date: '2025',
    emoji: '\uD83C\uDF0F',
    questions: [
      { q: 'The 2025 SCO summit was held in which country?', field: 'Host country', type: 'host' },
      { q: 'The 2025 SCO summit was held in which city?', field: 'Cities', type: 'city' },
      { q: 'Who was the chair of the 2025 SCO summit?', field: 'Chair', type: 'chair' }
    ]
  },
  {
    page: 'Quadrilateral_Security_Dialogue',
    label: 'QUAD',
    date: '2025',
    emoji: '\uD83C\uDF0D',
    questions: [
      { q: 'Which countries are members of the QUAD (Quadrilateral Security Dialogue)?', field: 'Members', type: 'members' }
    ]
  }
];

function parseInfobox(html) {
  var data = {};
  var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return data;
  var table = m[1];
  var rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return data;
  for (var ri = 0; ri < rows.length; ri++) {
    var labelMatch = rows[ri].match(/<th[^>]*class="[^"]*infobox-label[^"]*"[^>]*>([\s\S]*?)<\/th>/i);
    var dataMatch = rows[ri].match(/<td[^>]*class="[^"]*infobox-data[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    if (labelMatch && dataMatch) {
      var label = strip(labelMatch[1]);
      var value = strip(dataMatch[1]);
      data[label] = value;
    }
  }
  return data;
}

async function fetchSummitData(summit) {
  try {
    var res = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(summit.page) + '&prop=text&section=0&format=json');
    if (!res || !res.parse || !res.parse.text) return {};
    return parseInfobox(res.parse.text['*']);
  } catch (e) {
    return {};
  }
}

function makeQuestion(summit, qDef, value, factStr, seq) {
  if (!value || value.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'summit_' + pad(seq);
  var blank = qDef.q;

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia - ' + summit.page,
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'Summits & Conferences',
    emoji: summit.emoji,
    question: blank,
    answer: value,
    hint: '',
    fact: factStr
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) { console.error('Error reading pib-archive.json: ' + e.message); }
  }

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Summits & Conferences']) existing[CA_KEY].subSubjects['Summits & Conferences'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Summits & Conferences'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Summits & Conferences'].length + 1;

  for (var si = 0; si < SUMMITS.length; si++) {
    process.stdout.write('  ' + SUMMITS[si].label + '... ');
    var infobox = await fetchSummitData(SUMMITS[si]);
    var fields = Object.keys(infobox);
    process.stdout.write('fields: ' + fields.join(', ') + '\n');

    for (var qi = 0; qi < SUMMITS[si].questions.length; qi++) {
      var qDef = SUMMITS[si].questions[qi];
      var value = infobox[qDef.field];
      if (!value) continue;

      var fact = SUMMITS[si].label + ': ' + qDef.field + ' = ' + value + '. ';
      fact += 'Other details: ' + fields.map(function(f) { return f + ': ' + infobox[f]; }).join('; ') + '.';

      var q = makeQuestion(SUMMITS[si], qDef, value, fact, seq);
      if (q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
          process.stdout.write('    \u2713 ' + qDef.q.substring(0, 50) + '... [' + value.substring(0, 30) + ']\n');
        }
      }
    }

    await delay(600);
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Summits & Conferences'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Summits & Conferences'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nSummits & Conferences: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

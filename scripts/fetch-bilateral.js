var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });
var RICH_FACTS = require('./bilateral-explanations.js').RICH_FACTS;

function clean(v) {
  return v.replace(/&#160;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\[[\d\s,\-]+\]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'BilateralBot/1.0' } }, function(res) {
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

function fetchPage(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = [];
    var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rRegex.exec(m[1])) !== null) {
      var cells = [];
      var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(clean(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function pad(n) { return (n < 10 ? '0' : '') + n; }

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'bilat_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'International Relations', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || '',
    updatedAt: now.toISOString()
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function addContext(s, notes) {
  if (!notes) return s;
  var n = notes.replace(/<[^>]+>/g, '').replace(/\[.*?\]/g, '').trim();
  if (n.length < 3) return s;
  return s + ' ' + n;
}

var REL_CONTEXT = {
  'Namibia': 'Namibia gained independence from South Africa on 21 March 1990.',
  'Estonia': 'Estonia restored its independence following the dissolution of the Soviet Union.',
  'Latvia': 'Latvia restored its independence following the dissolution of the Soviet Union.',
  'Ukraine': 'Ukraine became independent following the dissolution of the Soviet Union.',
  'Israel': 'India had recognized Israel in 1950 but established full diplomatic relations in 1992.',
  'Kazakhstan': 'Kazakhstan became independent following the dissolution of the Soviet Union.',
  'Lithuania': 'Lithuania restored its independence following the dissolution of the Soviet Union.',
  'Azerbaijan': 'Azerbaijan became independent following the dissolution of the Soviet Union.',
  'Kyrgyzstan': 'Kyrgyzstan became independent following the dissolution of the Soviet Union.',
  'Uzbekistan': 'Uzbekistan became independent following the dissolution of the Soviet Union.',
  'Moldova': 'Moldova became independent following the dissolution of the Soviet Union.',
  'Belarus': 'Belarus became independent following the dissolution of the Soviet Union.',
  'Turkmenistan': 'Turkmenistan became independent following the dissolution of the Soviet Union.',
  'Slovenia': 'Slovenia became independent following the breakup of Yugoslavia.',
  'Croatia': 'Croatia became independent following the breakup of Yugoslavia.',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina became independent following the breakup of Yugoslavia.',
  'Tajikistan': 'Tajikistan became independent following the dissolution of the Soviet Union.',
  'Armenia': 'Armenia became independent following the dissolution of the Soviet Union.',
  'Georgia': 'Georgia became independent following the dissolution of the Soviet Union.',
  'Slovakia': 'Slovakia became independent after the dissolution of Czechoslovakia on 1 January 1993.',
  'Eritrea': 'Eritrea gained independence from Ethiopia on 24 May 1993.',
  'South Africa': 'South Africa was transitioning to democracy after the end of apartheid.',
  'Palau': 'Palau gained independence on 1 October 1994 under a Compact of Free Association with the United States.',
  'North Macedonia': 'North Macedonia (then known as Macedonia) became independent following the breakup of Yugoslavia.',
  'Federated States of Micronesia': 'The Federated States of Micronesia became independent in 1986 under a Compact of Free Association with the United States.',
  'Marshall Islands': 'The Marshall Islands became independent in 1986 under a Compact of Free Association with the United States.',
  'Cook Islands': 'The Cook Islands are a self-governing state in free association with New Zealand.',
  'Timor-Leste': 'Timor-Leste gained independence on 20 May 2002.',
  'Montenegro': 'Montenegro became independent after the dissolution of the State Union of Serbia and Montenegro on 3 June 2006.',
  'South Sudan': 'South Sudan gained independence from Sudan on 9 July 2011.',
  'Niue': 'Niue is a self-governing state in free association with New Zealand.'
};

function hasDateColumn(t) {
  for (var hi = 0; hi < Math.min(2, t.length); hi++) {
    var hdr = t[hi];
    if (!hdr) continue;
    for (var ci = 0; ci < hdr.length; ci++) {
      if (hdr[ci] === 'Date' || /^Date$/i.test(hdr[ci])) return true;
    }
  }
  return false;
}

async function fetchRelations(existingKeys, newQuestions, seq) {
  console.error('\n--- Diplomatic Relations ---');
  try {
    var html = await fetchPage('Foreign_relations_of_India');
    var tables = extractWikiTables(html);
    if (tables.length === 0) { console.error('  No wikitables found\n'); return; }
    var relTable = null;
    for (var ti = 0; ti < tables.length; ti++) {
      if (hasDateColumn(tables[ti])) { relTable = tables[ti]; break; }
    }
    if (!relTable) { console.error('  Could not identify diplomatic relations table\n'); return; }
    var count = 0;
    for (var ri = 0; ri < Math.min(relTable.length, 200); ri++) {
      var row = relTable[ri];
      if (row.length < 3) continue;
      var country = row[1];
      var date = row[2];
      var notes = row.length > 3 ? row[3] : '';
      if (!country || country.length < 3 || country === 'Country' || country.indexOf('\u2014') >= 0) continue;
      var yrMatch = date.match(/\b(19|20)\d{2}\b/);
      if (yrMatch && yrMatch[0] >= '1990') {
        var yr = yrMatch[0];
        var qText = 'With which country did India establish diplomatic relations in ' + yr + '?';
        var rich = RICH_FACTS[country];
        var fact;
        if (rich) {
          fact = rich;
        } else {
          fact = 'India established diplomatic relations with ' + country + ' on ' + date + '.';
          var ctx = addContext('', notes);
          if (ctx) fact += ' ' + ctx;
          var enrich = REL_CONTEXT[country];
          if (enrich) fact += ' ' + enrich;
        }
        var q = makeQuestion(qText, country, seq++, 'Foreign Relations', '\uD83C\uDF0D', fact);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      }
    }
    console.error('  ' + count + ' diplomatic relations questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'International Relations';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  var beforeClean = existing[CA_KEY].subSubjects[subKey].length;
  existing[CA_KEY].subSubjects[subKey] = existing[CA_KEY].subSubjects[subKey].filter(function(q) {
    if (q.fact && q.type === 'fill_blank' && q.category === 'Current Affairs') {
      if (q.fact.match(/ in \d{4}\.$/) && !q.fact.match(/ \d{1,2} \d{4}\./) && !q.fact.match(/January|February|March|April|May|June|July|August|September|October|November|December/)) {
        console.error('  Removing wrong question: "' + (q.question || '').substring(0, 60) + '"');
        return false;
      }
    }
    return true;
  });
  var removed = beforeClean - existing[CA_KEY].subSubjects[subKey].length;
  if (removed > 0) console.error('  Removed ' + removed + ' wrong diplomatic relations questions\n');
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  await fetchRelations(existingKeys, newQuestions, seq);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nInternational Relations: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

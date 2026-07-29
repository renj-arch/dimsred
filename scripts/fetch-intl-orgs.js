var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'IntlOrgBot/1.0' } }, function(res) {
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
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

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
  var id = 'io_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'International Organizations', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractInfoboxField(html, label) {
  var m = html.match(/<table[^>]*class="[^"]*infobox[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return null;
  var rows = m[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return null;
  for (var ri = 0; ri < rows.length; ri++) {
    var l = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var d = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (l && d) {
      var ltxt = strip(l[1]).toLowerCase();
      if (ltxt.indexOf(label.toLowerCase()) >= 0) return strip(d[1]);
    }
  }
  return null;
}

var ORG_HEADS = [
  { page: 'Secretary-General_of_the_United_Nations', name: 'UN Secretary-General', nameCol: 2, yearCol: 3, emoji: '\uD83C\uDF0D' },
  { page: 'Managing_Director_of_the_International_Monetary_Fund', name: 'IMF Managing Director', nameCol: 1, yearCol: 2, emoji: '\uD83D\uDCB1' },
  { page: 'President_of_the_World_Bank', name: 'World Bank President', nameCol: 1, yearCol: 2, emoji: '\uD83C\uDFE6' },
  { page: 'Director-General_of_the_World_Trade_Organization', name: 'WTO Director-General', nameCol: 2, yearCol: 3, emoji: '\uD83C\uDF0D' },
  { page: 'Secretary-General_of_NATO', name: 'NATO Secretary-General', nameCol: 1, yearCol: 2, emoji: '\uD83C\uDFF0' },
];

function cleanName(v) {
  v = v.replace(/<[^>]+>/g, ' ').replace(/&#160;/g, ' ').replace(/\([^)]*\)/g, '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
  return v;
}

function extractRowName(row, nameCol) {
  if (nameCol >= row.length) return '';
  var v = row[nameCol];
  return cleanName(v);
}

function extractRowYear(row, yearCol) {
  if (yearCol >= row.length) return '';
  var v = strip(row[yearCol]);
  var m = v.match(/\b(20|19)\d{2}\b/);
  if (m && m[0] >= '2000') return m[0];
  return '';
}

async function fetchOrgHeads(existingKeys, newQuestions, seqObj) {
  for (var oi = 0; oi < ORG_HEADS.length; oi++) {
    var org = ORG_HEADS[oi];
    console.error('\n--- ' + org.name + ' ---');
    try {
      var html = await fetchPageText(org.page);
      var tables = extractWikiTables(html);
      var count = 0;
      tables.forEach(function(t) {
        if (t.length < 2) return;
        for (var ri = 1; ri < Math.min(t.length, 40); ri++) {
          var row = t[ri];
          if (row.length < 2) continue;
          var name = extractRowName(row, org.nameCol);
          if (!name || name.length < 3) continue;
          if (name.match(/^(Name|No\.|Portrait|Took office|Start|End)/i)) continue;

          var yr = extractRowYear(row, org.yearCol);
          if (!yr) continue;

          var qText = 'Who served as ' + org.name + ' in ' + yr + '?';
          var fact = name + ' served as ' + org.name + ' starting in ' + yr + '.';
          var q = makeQuestion(qText, name, seqObj.seq++, 'Wikipedia - ' + org.name, org.emoji, fact);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      });
      console.error('  ' + count + ' questions added');
      if (count === 0 && ORG_KNOWN_DATA[org.name]) {
        console.error('  (using hardcoded fallback data)');
        ORG_KNOWN_DATA[org.name].forEach(function(item) {
          var qText = 'Who served as ' + org.name + ' in ' + item.year + '?';
          var fact = item.name + ' served as ' + org.name + ' starting in ' + item.year + '.';
          var q = makeQuestion(qText, item.name, seqObj.seq++, 'Reference Data - ' + org.name, org.emoji, fact);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        });
        console.error('  (fallback added ' + count + ' questions)');
      }
      console.error('');
    } catch (e) { console.error('  Error: ' + e.message + '\n'); }
    await delay(800);
  }
}

var ORG_KNOWN_DATA = {
  'IMF Managing Director': [
    { name: 'Kristalina Georgieva', year: '2019' },
    { name: 'Christine Lagarde', year: '2011' },
    { name: 'Dominique Strauss-Kahn', year: '2007' },
    { name: 'Rodrigo Rato', year: '2004' },
    { name: 'Horst Köhler', year: '2000' },
  ],
  'World Bank President': [
    { name: 'Ajay Banga', year: '2023' },
    { name: 'David Malpass', year: '2019' },
    { name: 'Jim Yong Kim', year: '2012' },
    { name: 'Robert Zoellick', year: '2007' },
    { name: 'Paul Wolfowitz', year: '2005' },
    { name: 'James Wolfensohn', year: '1995' },
  ],
  'NATO Secretary-General': [
    { name: 'Mark Rutte', year: '2024' },
    { name: 'Jens Stoltenberg', year: '2014' },
    { name: 'Anders Fogh Rasmussen', year: '2009' },
    { name: 'Jaap de Hoop Scheffer', year: '2004' },
    { name: 'George Robertson', year: '1999' },
  ],
};

var ORG_INFOS = [
  { page: 'BRICS', name: 'BRICS', emoji: '\uD83C\uDF0D', questions: function() {
    return [
      { q: 'How many member countries are there in BRICS as of 2026?', a: '10', f: 'BRICS expanded in 2024-2025 to include Iran, Egypt, Ethiopia, UAE, Saudi Arabia, plus original 5 (Brazil, Russia, India, China, South Africa).' },
      { q: 'Which country hosted the 2025 BRICS Summit?', a: 'Brazil', f: 'Brazil hosted the 2025 BRICS summit in Rio de Janeiro.' },
    ];
  }},
  { page: 'Shanghai_Cooperation_Organisation', name: 'SCO', emoji: '\uD83C\uDF0D', questions: function() {
    return [
      { q: 'How many member states are there in the Shanghai Cooperation Organisation (SCO) as of 2026?', a: '10', f: 'SCO full members: China, India, Iran, Kazakhstan, Kyrgyzstan, Pakistan, Russia, Tajikistan, Uzbekistan, Belarus (joined 2024).' },
      { q: 'Who is the current Secretary-General of the SCO?', a: 'Nurlan Yermekbayev', f: 'Nurlan Yermekbayev of Kazakhstan has been SCO Secretary-General since 2025.' },
    ];
  }},
  { page: 'ASEAN', name: 'ASEAN', emoji: '\uD83C\uDF0D', questions: function() {
    return [
      { q: 'How many member states are there in ASEAN?', a: '10', f: 'ASEAN members: Brunei, Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand, Vietnam.' },
      { q: 'Which country is the current ASEAN Chair for 2026?', a: 'Philippines', f: 'The Philippines holds the ASEAN Chairmanship for 2026.' },
    ];
  }}
];

async function fetchOrgInfos(existingKeys, newQuestions, seqObj) {
  for (var oi = 0; oi < ORG_INFOS.length; oi++) {
    var org = ORG_INFOS[oi];
    console.error('\n--- ' + org.name + ' Info ---');
    try {
      var qList = org.questions();
      qList.forEach(function(item) {
        var q = makeQuestion(item.q, item.a, seqObj.seq++, 'Reference Data - ' + org.name, org.emoji, item.f);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
      });
      console.error('  ' + qList.length + ' questions added\n');
    } catch (e) { console.error('  Error: ' + e.message + '\n'); }
    await delay(100);
  }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'International Organizations';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchOrgHeads(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchOrgInfos(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nInternational Organizations: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

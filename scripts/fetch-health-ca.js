var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'HealthBot/1.0' } }, function(res) {
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
  var id = 'hlth_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Health & Medicine', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchAyushman(existingKeys, newQuestions, seqObj) {
  console.error('--- Ayushman Bharat ---');
  try {
    var html = await fetchPageText('Ayushman_Bharat');
    var tables = extractWikiTables(html);
    var count = 0;
    for (var ti = 0; ti < tables.length; ti++) {
      var t = tables[ti];
      if (t.length < 3) continue;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('State') >= 0 || h0.indexOf('Scheme') >= 0 || h0.indexOf('Parameter') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 40); ri++) {
          var row = t[ri];
          if (row.length < 2) continue;
          var a = strip(row[0]);
          var b = strip(row[1]);
          if (a && b && a.length > 2 && b.length > 2 && a !== 'State/UT' && a !== 'Scheme') {
            var qText = 'Under Ayushman Bharat, what is the value associated with ' + a.replace(/:$/,'').substring(0, 60) + '?';
            var q = makeQuestion(qText, b, seqObj.seq++, 'Wikipedia - Ayushman Bharat', '\uD83C\uDFE5', a + ': ' + b);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    }
    console.error('  ' + count + ' Ayushman questions added\n');
    if (count === 0) {
      var ayushmanData = [
        { q: 'What is the annual health coverage per family under Ayushman Bharat?', a: 'Rs. 5 lakh' },
        { q: 'How many families are targeted under Ayushman Bharat?', a: '10.74 crore' },
        { q: 'What is the full form of PM-JAY?', a: 'Pradhan Mantri Jan Arogya Yojana' },
        { q: 'What is the full form of AB-PMJAY?', a: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana' },
        { q: 'When was Ayushman Bharat launched?', a: '23 September 2018' },
        { q: 'What type of healthcare coverage does Ayushman Bharat provide?', a: 'Secondary and tertiary care' },
        { q: 'Is Ayushman Bharat a central or state scheme?', a: 'Central sector scheme' },
        { q: 'What is the full form of EMI in Ayushman Bharat?', a: 'Eligible Medical Institution' },
      ];
      ayushmanData.forEach(function(d) {
        var q = makeQuestion(d.q, d.a, seqObj.seq++, 'Reference - Ayushman Bharat', '\uD83C\uDFE5', d.a);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' Ayushman questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchIndianHealth(existingKeys, newQuestions, seqObj) {
  console.error('--- Health Infrastructure ---');
  try {
    var html = await fetchPageText('Healthcare_in_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('State') >= 0 || h0.indexOf('Rank') >= 0 || h0.indexOf('Indicator') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 40); ri++) {
          var row = t[ri];
          if (row.length < 2) continue;
          var a = strip(row[0]);
          var b = row.length > 1 ? strip(row[1]) : '';
          var c = row.length > 2 ? strip(row[2]) : '';
          if (a && b && a.length > 2 && a !== 'State/UT' && a !== 'Rank') {
            var val = c || b;
            var qText = 'What is the ' + a.substring(0, 50) + ' metric in Indian healthcare?';
            var q = makeQuestion(qText, val, seqObj.seq++, 'Wikipedia - Healthcare in India', '\uD83C\uDFE5', a + ': ' + val);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' health infra questions added\n');
    if (count === 0) {
      var healthData = [
        { q: 'What is the life expectancy in India as of 2024?', a: '70.8 years' },
        { q: 'What is India\'s infant mortality rate (per 1000 live births)?', a: '30' },
        { q: 'What is the full form of NFHS?', a: 'National Family Health Survey' },
        { q: 'What is the full form of WHO?', a: 'World Health Organization' },
        { q: 'What is the full form of ICMR?', a: 'Indian Council of Medical Research' },
        { q: 'What is the full form of MMR in health?', a: 'Maternal Mortality Ratio' },
        { q: 'What is the full form of IMR in health?', a: 'Infant Mortality Rate' },
        { q: 'What is the full form of U5MR?', a: 'Under-5 Mortality Rate' },
        { q: 'What is the full form of PHC in healthcare?', a: 'Primary Health Centre' },
        { q: 'What is the full form of CHC in healthcare?', a: 'Community Health Centre' },
        { q: 'What is the full form of ASHA worker?', a: 'Accredited Social Health Activist' },
        { q: 'What is the full form of ANM in healthcare?', a: 'Auxiliary Nurse Midwife' },
        { q: 'What is the full form of AYUSH?', a: 'Ayurveda, Yoga and Naturopathy, Unani, Siddha, and Homeopathy' },
      ];
      healthData.forEach(function(d) {
        var q = makeQuestion(d.q, d.a, seqObj.seq++, 'Reference - Health', '\uD83C\uDFE5', d.a);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' health questions)\n');
    }
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
  var subKey = 'Health & Medicine';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchAyushman(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchIndianHealth(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nHealth & Medicine: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'EduBot/1.0' } }, function(res) {
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
  var id = 'edu_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Education', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchIITs(existingKeys, newQuestions, seqObj) {
  console.error('--- IITs ---');
  try {
    var html = await fetchPageText('Indian_Institutes_of_Technology');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('Institute') >= 0 || h0.indexOf('Name') >= 0 || h0.indexOf('IIT') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 30); ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var name = strip(row[0]);
          var location = strip(row[1]);
          if (name && location && name.indexOf('IIT') >= 0 && location.length > 2 && location !== 'Location') {
            var parts = location.split(',');
            var city = strip(parts[0]);
            var qText = 'Which IIT is located in ' + city + '?';
            var q = makeQuestion(qText, name, seqObj.seq++, 'IITs', '\uD83C\uDF93', name + ' is located in ' + location + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' IIT questions added\n');
    if (count === 0) {
      var iitFallback = [
        { c: 'Kharagpur', n: 'IIT Kharagpur' },
        { c: 'Mumbai', n: 'IIT Bombay' },
        { c: 'Chennai', n: 'IIT Madras' },
        { c: 'Kanpur', n: 'IIT Kanpur' },
        { c: 'Delhi', n: 'IIT Delhi' },
        { c: 'Guwahati', n: 'IIT Guwahati' },
        { c: 'Roorkee', n: 'IIT Roorkee' },
        { c: 'Bhubaneswar', n: 'IIT Bhubaneswar' },
        { c: 'Jodhpur', n: 'IIT Jodhpur' },
        { c: 'Patna', n: 'IIT Patna' },
        { c: 'Hyderabad', n: 'IIT Hyderabad' },
        { c: 'Varanasi', n: 'IIT BHU Varanasi' },
        { c: 'Ropar', n: 'IIT Ropar' },
        { c: 'Mandla', n: 'IIT Mandla' },
        { c: 'Palakkad', n: 'IIT Palakkad' },
        { c: 'Tirupati', n: 'IIT Tirupati' },
      ];
      iitFallback.forEach(function(i) {
        var qText = 'Which IIT is located in ' + i.c + '?';
        var q = makeQuestion(qText, i.n, seqObj.seq++, 'Reference - IITs', '\uD83C\uDF93', i.n + ' is located in ' + i.c + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' IIT questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchIIMs(existingKeys, newQuestions, seqObj) {
  console.error('--- IIMs ---');
  try {
    var html = await fetchPageText('Indian_Institutes_of_Management');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('Institute') >= 0 || h0.indexOf('Name') >= 0 || h0.indexOf('IIM') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 30); ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var name = strip(row[0]);
          var location = strip(row[1]);
          if (name && location && name.indexOf('IIM') >= 0 && location.length > 2 && location !== 'Location') {
            var parts = location.split(',');
            var city = strip(parts[0]);
            var qText = 'Which IIM is located in ' + city + '?';
            var q = makeQuestion(qText, name, seqObj.seq++, 'IIMs', '\uD83C\uDF93', name + ' is located in ' + location + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' IIM questions added\n');
    if (count === 0) {
      var iimData = [
        { c: 'Ahmedabad', n: 'IIM Ahmedabad' },
        { c: 'Bengaluru', n: 'IIM Bangalore' },
        { c: 'Kolkata', n: 'IIM Calcutta' },
        { c: 'Lucknow', n: 'IIM Lucknow' },
        { c: 'Kozhikode', n: 'IIM Kozhikode' },
        { c: 'Indore', n: 'IIM Indore' },
        { c: 'Shillong', n: 'IIM Shillong' },
        { c: 'Rohtak', n: 'IIM Rohtak' },
        { c: 'Ranchi', n: 'IIM Ranchi' },
        { c: 'Raipur', n: 'IIM Raipur' },
        { c: 'Tiruchirappalli', n: 'IIM Tiruchirappalli' },
        { c: 'Kashipur', n: 'IIM Kashipur' },
        { c: 'Nagpur', n: 'IIM Nagpur' },
        { c: 'Jammu', n: 'IIM Jammu' },
        { c: 'Bodh Gaya', n: 'IIM Bodh Gaya' },
        { c: 'Sambalpur', n: 'IIM Sambalpur' },
        { c: 'Visakhapatnam', n: 'IIM Visakhapatnam' },
        { c: 'Sirmaur', n: 'IIM Sirmaur' },
      ];
      iimData.forEach(function(i) {
        var qText = 'Which IIM is located in ' + i.c + '?';
        var q = makeQuestion(qText, i.n, seqObj.seq++, 'Reference - IIMs', '\uD83C\uDF93', i.n + ' is located in ' + i.c + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' IIM questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchAIIMS(existingKeys, newQuestions, seqObj) {
  console.error('--- AIIMS ---');
  try {
    var html = await fetchPageText('All_India_Institute_of_Medical_Sciences');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 3) return;
      var h0 = t[0] && t[0][0] ? t[0][0] : '';
      if (h0.indexOf('Institute') >= 0 || h0.indexOf('Name') >= 0 || h0.indexOf('AIIMS') >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 25); ri++) {
          var row = t[ri];
          if (row.length < 3) continue;
          var name = strip(row[0]);
          var location = strip(row[1]);
          if (name && location && name.indexOf('AIIMS') >= 0 && location.length > 2 && location !== 'Location') {
            var parts = location.split(',');
            var city = strip(parts[0]);
            var qText = 'Which AIIMS is located in ' + city + '?';
            var q = makeQuestion(qText, name, seqObj.seq++, 'AIIMS', '\uD83C\uDFE5', name + ' is located in ' + location + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' AIIMS questions added\n');
    if (count === 0) {
      var aiimsData = [
        { c: 'New Delhi', n: 'AIIMS Delhi' },
        { c: 'Bhopal', n: 'AIIMS Bhopal' },
        { c: 'Bhubaneswar', n: 'AIIMS Bhubaneswar' },
        { c: 'Jodhpur', n: 'AIIMS Jodhpur' },
        { c: 'Patna', n: 'AIIMS Patna' },
        { c: 'Raipur', n: 'AIIMS Raipur' },
        { c: 'Rishikesh', n: 'AIIMS Rishikesh' },
        { c: 'Nagpur', n: 'AIIMS Nagpur' },
        { c: 'Mangalagiri', n: 'AIIMS Mangalagiri' },
        { c: 'Gorakhpur', n: 'AIIMS Gorakhpur' },
        { c: 'Guwahati', n: 'AIIMS Guwahati' },
        { c: 'Bathinda', n: 'AIIMS Bathinda' },
        { c: 'Kalyani', n: 'AIIMS Kalyani' },
        { c: 'Deoghar', n: 'AIIMS Deoghar' },
      ];
      aiimsData.forEach(function(a) {
        var qText = 'Which AIIMS is located in ' + a.c + '?';
        var q = makeQuestion(qText, a.n, seqObj.seq++, 'Reference - AIIMS', '\uD83C\uDFE5', a.n + ' is located in ' + a.c + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' AIIMS questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchNEP(existingKeys, newQuestions, seqObj) {
  console.error('--- NEP 2020 ---');
  try {
    var html = await fetchPageText('National_Education_Policy_2020');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 2) return;
      for (var ri = 1; ri < Math.min(t.length, 20); ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var a = strip(row[0]);
        var b = strip(row[1]);
        if (a && b && a.length > 3 && b.length > 2 && a !== 'Key area') {
          var qText = 'According to NEP 2020, what is the detail regarding ' + a.substring(0, 50) + '?';
          var q = makeQuestion(qText, b, seqObj.seq++, 'NEP 2020', '\uD83C\uDF93', 'NEP 2020: ' + a + ' - ' + b);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' NEP questions added\n');
    if (count === 0) {
      var nepData = [
        { q: 'In which year was NEP 2020 approved?', a: '2020' },
        { q: 'What is the new school structure under NEP 2020?', a: '5+3+3+4' },
        { q: 'What is the full form of NEP?', a: 'National Education Policy' },
        { q: 'What is the new curriculum structure called under NEP?', a: 'National Curriculum Framework (NCF)' },
        { q: 'What is the medium of instruction recommended until Class 5 under NEP?', a: 'Mother tongue / local language' },
        { q: 'What is the full form of HEI in NEP?', a: 'Higher Education Institution' },
        { q: 'What is the full form of ABC under NEP?', a: 'Academic Bank of Credits' },
        { q: 'What is the full form of NHEQF in NEP?', a: 'National Higher Education Qualifications Framework' },
        { q: 'What is the full form of NCrF?', a: 'National Credit Framework' },
        { q: 'What is the full form of IKS in NEP?', a: 'Indian Knowledge Systems' },
        { q: 'What is the full form of SEDG in NEP?', a: 'Socio-Economically Disadvantaged Groups' },
        { q: 'What is the full form of NTA?', a: 'National Testing Agency' },
        { q: 'What is the full form of RTE?', a: 'Right to Education' },
        { q: 'What is the full form of DIKSHA?', a: 'Digital Infrastructure for Knowledge Sharing' },
      ];
      nepData.forEach(function(n) {
        var q = makeQuestion(n.q, n.a, seqObj.seq++, 'Reference - NEP 2020', '\uD83C\uDF93', n.a);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' NEP questions)\n');
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
  var subKey = 'Education';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchIITs(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchIIMs(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchAIIMS(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchNEP(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nEducation: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

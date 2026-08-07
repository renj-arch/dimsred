var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function cleanVal(v) {
  return v.replace(/&#160;/g, ' ').replace(/\[[\d\s,\-]+\]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'DefenceBot/1.0' } }, function(res) {
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
  var id = 'def_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Defence & Exercises', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractExerciseTable(t) {
  var recent = [];
  var currentYear = 0;
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    if (row.length < 2) continue;
    if (row.length === 1 && row[0].match(/\b(19|20)\d{2}\b/)) {
      currentYear = parseInt(row[0].match(/\b(19|20)\d{2}\b/)[0], 10);
      continue;
    }
    if (row[0].match(/\b(19|20)\d{2}\b/)) {
      var y = row[0].match(/\b(19|20)\d{2}\b/);
      if (y) currentYear = parseInt(y[0], 10);
      if (row.length < 3) continue;
    }
    var name = cleanVal(row[0]);
    var partner = row.length > 1 ? cleanVal(row[1]) : '';
    if (name.length < 2 || partner.length < 2) continue;
    if (currentYear >= 2020) {
      recent.push({ name: name, partner: partner, year: currentYear, force: '' });
    }
  }
  return recent;
}

async function fetchExercises(existingKeys, newQuestions, seqObj) {
  var pages = [
    { title: 'List_of_exercises_of_the_Indian_Army', label: 'Army', force: 'Indian Army' },
    { title: 'List_of_exercises_of_the_Indian_Air_Force', label: 'Air Force', force: 'Indian Air Force' }
  ];
  for (var pi = 0; pi < pages.length; pi++) {
    var p = pages[pi];
    console.error('\n--- ' + p.label + ' Exercises ---');
    try {
      var html = await fetchPageText(p.title);
      var tables = extractWikiTables(html);
      if (tables.length === 0) { console.error('  No wikitables found\n'); continue; }
      var recent = [];
      for (var ti = 0; ti < tables.length; ti++) {
        recent = recent.concat(extractExerciseTable(tables[ti]));
      }
      recent = recent.slice();
      recent.forEach(function(ex) {
        var qText = 'Which military exercise was conducted between India and ' + ex.partner + ' by the ' + p.force + ' in recent years?';
        var q = makeQuestion(qText, ex.name, seqObj.seq++, '' + p.label + ' Exercises', '\uD83C\uDFC1', 'Exercise ' + ex.name + ' (' + p.force + ') was conducted with ' + ex.partner + ' (' + ex.year + ').');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
      });
      console.error('  ' + recent.length + ' exercises added\n');
    } catch (e) { console.error('  Error: ' + e.message + '\n'); }
    await delay(800);
  }
}

async function fetchMissiles(existingKeys, newQuestions, seqObj) {
  console.error('--- Missiles of India ---');
  try {
    var html = await fetchPageText('Guided_missiles_of_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      var hasFamily = t[0].length >= 9;
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 3) continue;
        var off = (hasFamily && row.length >= 9) ? 1 : 0;
        var name = cleanVal(row[off]);
        var type = row.length > off + 1 ? cleanVal(row[off + 1]) : '';
        var range = row.length > off + 2 ? cleanVal(row[off + 2]) : '';
        var status = row.length > off + 6 ? cleanVal(row[off + 6]) : '';
        if (name.length < 2) continue;
        if (range && range.match(/\d+/)) {
          var q = makeQuestion('What is the maximum range of the ' + name + ' missile?', range, seqObj.seq++, 'Missiles of India', '\uD83D\uDEE1', name + ' missile: Type=' + type + ', Range=' + range + ', Status=' + status);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' missile questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchAgniMissiles(existingKeys, newQuestions, seqObj) {
  console.error('--- Agni Missile ---');
  try {
    var html = await fetchPageText('Agni_(missile)');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = strip(row[0]).replace(/\[.*?\]/g, '').trim();
        var type = row.length > 1 ? strip(row[1]).replace(/\[.*?\]/g, '').trim() : '';
        var range = row.length > 2 ? strip(row[2]).replace(/\[.*?\]/g, '').trim() : '';
        var status = row.length > 3 ? strip(row[3]).replace(/\[.*?\]/g, '').trim() : '';
        if (range && range.match(/\d+/) && name.length > 2) {
          var cleanedRange = cleanVal(range);
          var q = makeQuestion('What is the range of the ' + name + ' missile?', cleanedRange, seqObj.seq++, 'Agni Missile', '\uD83D\uDEE1', name + ': Type=' + type + ', Range=' + cleanedRange + ', Status=' + status);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' Agni questions added\n');
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
  if (!existing[CA_KEY].subSubjects['Defence & Exercises']) existing[CA_KEY].subSubjects['Defence & Exercises'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Defence & Exercises'].forEach(function(q) { existingKeys[eventKey(q)] = true; });

  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects['Defence & Exercises'].length + 1 };

  await fetchExercises(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchMissiles(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchAgniMissiles(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Defence & Exercises'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Defence & Exercises'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nDefence & Exercises: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

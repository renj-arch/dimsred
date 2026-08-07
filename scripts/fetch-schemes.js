var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function clean(v) {
  v = v.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, function(m, c) { return String.fromCharCode(c); });
  return v.replace(/\[[\d\s,\-]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'SchemeBot/1.0' } }, function(res) {
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

function fetchPage(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractWikiTablesFromBlock(block) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(block)) !== null) {
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

function categoryMembers(category) {
  return fetchJSON(API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=300&cmtype=page&format=json').then(function(d) {
    var out = [];
    if (d && d.query && d.query.categorymembers) {
      d.query.categorymembers.forEach(function(p) { if (p.title) out.push(p.title); });
    }
    return out;
  });
}

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'sch_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Government Schemes', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

var TEMPLATES = [
  function(row, seq) {
    var name = clean(row[0]);
    var ministry = clean(row[2]);
    var year = clean(row[3]);
    var yrMatch = year.match(/\b(19|20)\d{2}\b/);
    return makeQuestion('Which ' + ministry + ' scheme' + (yrMatch ? ' was launched in ' + yrMatch[0] : '') + '?', name, seq, 'Government Schemes', '\uD83C\uDFE6', name + ' was launched in ' + year + ' under ' + ministry + '.');
  },
  function(row, seq) {
    var name = clean(row[0]);
    var description = clean(row[1]);
    if (!description || description.length < 10) return null;
    var shortDesc = description.substring(0, 100);
    var lines = shortDesc.split(/[.\n]/);
    var firstLine = lines[0].trim();
    if (!firstLine || firstLine.length < 8) return null;
    var qText = 'Which government scheme is described as: "' + firstLine + '"';
    if (qText.length > 200) qText = qText.substring(0, 197) + '..."';
    return makeQuestion(qText, name, seq, 'Government Schemes', '\uD83C\uDFE6', name + ': ' + description.substring(0, 200));
  },
  function(row, seq) {
    var name = clean(row[0]);
    var sector = row.length > 4 ? clean(row[4]) : '';
    if (!sector) return null;
    return makeQuestion('Which government scheme falls under the ' + sector + ' sector?', name, seq, 'Government Schemes', '\uD83C\uDFE6', name + ' falls under ' + sector + '.');
  }
];

async function fetchSchemes(existingKeys, newQuestions, seqObj) {
  console.error('\n--- Government Schemes ---');
  try {
    var html = await fetchPage('List_of_schemes_of_the_government_of_India');
    var tables = extractWikiTablesFromBlock(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 4) continue;
        var name = clean(row[0]);
        if (!name || name.length < 3 || name === 'Scheme' || name.length > 70) continue;
        if (name.match(/^\d/) || name.indexOf('Total') >= 0 || name.indexOf('Source') >= 0) continue;

        for (var ti = 0; ti < TEMPLATES.length; ti++) {
          var q = TEMPLATES[ti](row, seqObj.n++);
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' scheme questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchCategorySchemes(existingKeys, newQuestions, seqObj) {
  console.error('--- Government Schemes (category discovery) ---');
  var cats = ['Government_schemes_in_India', 'Pradhan_Mantri_Jan_Dhan_Yojana', 'Social_justice_programmes_of_the_government_of_India'];
  var count = 0;
  for (var ci = 0; ci < cats.length; ci++) {
    try {
      var members = await categoryMembers(cats[ci]);
      for (var mi = 0; mi < members.length; mi++) {
        var name = clean(members[mi]);
        if (!name || name.length < 3 || name.length > 70) continue;
        if (name.indexOf('Category:') === 0 || name.indexOf('List of') === 0 || name.match(/^\d/)) continue;
        var q = makeQuestion('Which is a flagship scheme of the Government of India?', name, seqObj.n++, 'Government Schemes', '\uD83C\uDFE6', name + ' is listed under ' + cats[ci] + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      }
      await delay(400);
    } catch (e) { console.error('  Error on category ' + cats[ci] + ': ' + e.message); }
  }
  console.error('  ' + count + ' category-expanded scheme questions added\n');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Government Schemes';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { n: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchSchemes(existingKeys, newQuestions, seqObj);
  await delay(400);
  await fetchCategorySchemes(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nGovernment Schemes: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

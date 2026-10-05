var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ConstBodiesBot/1.0' } }, function(res) {
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

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function fetchPageText(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function categoryMembers(category) {
  return fetchJSON(API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=300&cmtype=page&format=json').then(function(d) {
    var out = [];
    if (d && d.query && d.query.categorymembers) {
      d.query.categorymembers.forEach(function(p) { if (p.title) out.push(p.title); });
    }
    return out;
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
  var id = 'cb_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Constitutional Bodies', emoji: emoji,
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

var BODIES = [
  { page: 'Election_Commission_of_India', name: 'Election Commission of India', label: 'CEC', emoji: '\uD83D\uDDF3' },
  { page: 'Comptroller_and_Auditor_General_of_India', name: 'CAG', label: 'CAG', emoji: '\uD83D\uDCCA' },
  { page: 'Union_Public_Service_Commission', name: 'UPSC', label: 'Chairperson', emoji: '\uD83C\uDFDB' },
  { page: 'Finance_Commission_(India)', name: 'Finance Commission', label: 'Chairman', emoji: '\uD83D\uDCB0' },
  { page: 'National_Human_Rights_Commission_of_India', name: 'NHRC', label: 'Chairperson', emoji: '\uD83D\uDCED' },
  { page: 'Central_Information_Commission', name: 'CIC', label: 'Chief Information Commissioner', emoji: '\uD83D\uDCC4' },
  { page: 'Law_Commission_of_India', name: 'Law Commission', label: 'Chairperson', emoji: '\uD83D\uDCD6' },
  { page: 'National_Commission_for_Scheduled_Castes', name: 'NCSC', label: 'Chairperson', emoji: '\u2696' },
  { page: 'National_Commission_for_Scheduled_Tribes', name: 'NCST', label: 'Chairperson', emoji: '\u2696' },
  { page: 'Unique_Identification_Authority_of_India', name: 'UIDAI', label: 'Chairperson', emoji: '\uD83C\uDFDB' },
  { page: 'National_Commission_for_Women_(India)', name: 'NCW', label: 'Chairperson', emoji: '\u2696' },
  { page: 'National_Green_Tribunal', name: 'NGT', label: 'Chairperson', emoji: '\uD83C\uDF3F' },
  { page: 'Competition_Commission_of_India', name: 'CCI', label: 'Chairperson', emoji: '\uD83D\uDCCA' },
  { page: 'National_Commission_for_Backward_Classes', name: 'NCBC', label: 'Chairperson', emoji: '\u2696' },
  { page: 'National_Commission_for_Protection_of_Child_Rights', name: 'NCPCR', label: 'Chairperson', emoji: '\uD83E\uDDD2' },
  { page: 'Commission_for_Agricultural_Costs_and_Prices', name: 'CACP', label: 'Chairperson', emoji: '\uD83C\uDF3E' },
  { page: 'National_Medical_Commission', name: 'NMC', label: 'Chairperson', emoji: '\uD83D\uDC89' },
  { page: 'National_Commission_for_Minorities', name: 'NCM', label: 'Chairperson', emoji: '\u2696' },
  { page: 'Election_Commission_of_India_State_Election_Commissions', name: 'State Election Commissions', label: 'Chairperson', emoji: '\uD83D\uDDF3' },
  { page: 'Central_Administrative_Tribunal', name: 'CAT', label: 'Chairperson', emoji: '\u2696' }
];

function findNameAndYearCol(t) {
  var nameScores = {}, yearScores = {};
  for (var ri = 1; ri < t.length; ri++) {
    var row = t[ri];
    for (var ci = 0; ci < Math.min(row.length, 6); ci++) {
      var val = strip(row[ci]);
      if (!val) continue;
      if (val.match(/\b(19|20)\d{2}\b/)) yearScores[ci] = (yearScores[ci] || 0) + 1;
      if (val.length > 6 && !val.match(/^\d/) && val.indexOf('[') === -1 && !/^(no\.|sl\.|name|date|office|term)/i.test(val) && val.indexOf('Commission') === -1 && val.indexOf('Chairperson') === -1 && val.indexOf('City') === -1) {
        nameScores[ci] = (nameScores[ci] || 0) + 1;
      }
    }
  }
  var bestName = -1, bestYear = -1, maxScore = 0;
  Object.keys(nameScores).forEach(function(k) { var ci = parseInt(k); if (!isNaN(ci) && nameScores[ci] > maxScore) { maxScore = nameScores[ci]; bestName = ci; } });
  var maxYr = 0;
  Object.keys(yearScores).forEach(function(k) { var ci = parseInt(k); if (!isNaN(ci) && yearScores[ci] > maxYr) { maxYr = yearScores[ci]; bestYear = ci; } });
  if (bestName === bestYear && bestYear >= 0) {
    bestName = bestYear + 1 > 5 ? bestYear - 1 : bestYear + 1;
  }
  if (bestName < 0 && t[0].length >= 2) bestName = 1;
  if (bestYear < 0 && bestName >= 1) bestYear = bestName - 1;
  if (bestName < 0) bestName = 0;
  if (bestYear < 0) bestYear = 0;
  return { nameCol: bestName, yearCol: bestYear };
}

function getRowName(row, nameCol) {
  for (var d = -2; d <= 2; d++) {
    var ci = nameCol + d;
    if (ci >= 0 && ci < row.length) {
      var v = strip(row[ci]);
      if (v && v.length > 5 && !v.match(/^\d/) && v.indexOf('\u2014') === -1) return v;
    }
  }
  return '';
}

function getRowYear(row, yearCol, nameCol) {
  var checked = {};
  for (var d = -2; d <= 2; d++) {
    var ci = yearCol + d;
    if (ci >= 0 && ci < row.length && ci !== nameCol && !checked[ci]) {
      checked[ci] = true;
      var v = strip(row[ci]);
      var m = v.match(/\b(19|20)\d{2}\b/);
      if (m && m[0] >= '2000') return m[0];
    }
  }
  return '';
}

async function fetchBodyInfo(existingKeys, newQuestions, seqObj) {
  for (var bi = 0; bi < BODIES.length; bi++) {
    var body = BODIES[bi];
    console.error('\n--- ' + body.name + ' ---');
    try {
      var html = await fetchPageText(body.page);
      var tables = extractWikiTables(html);
      var count = 0;
      var foundName = body.name;

      if (tables.length > 0) {
        for (var ti = 0; ti < tables.length; ti++) {
          var t = tables[ti];
          if (t.length < 2) continue;

          // Skip tables that are not chairperson lists (report lists, state commissions, etc.)
          var headerText = t[0].join(' ').toLowerCase();
          if (headerText.indexOf('report no.') >= 0 || headerText.indexOf('title of report') >= 0 ||
              headerText.indexOf('presented in') >= 0 || headerText.indexOf('date of presentation') >= 0 ||
              headerText.indexOf('state commission') >= 0) continue;

          var colInfo = findNameAndYearCol(t);
          if (colInfo.nameCol < 0) continue;

          for (var ri = 1; ri < t.length; ri++) {
            var row = t[ri];
            if (row.length < 2) continue;
            var name = getRowName(row, colInfo.nameCol);
            if (!name || name.length < 4) continue;
            name = name.replace(/\[.*?\]/g, '').trim();

            var yr = getRowYear(row, colInfo.yearCol, colInfo.nameCol);
            if (!yr || yr < '2000') continue;

            var role = foundName === body.label ? foundName : (foundName + ' ' + body.label);
            var qText = 'Who served as the ' + role + ' in ' + yr + '?';
            var fact = name + ' served as ' + role + '.';
            var q = makeQuestion(qText, name, seqObj.seq++, '' + foundName, body.emoji, fact);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
      console.error('  ' + count + ' questions added\n');
    } catch (e) { console.error('  Error: ' + e.message + '\n'); }
    await delay(800);
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
  var subKey = 'Constitutional Bodies';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  console.error('Auto-expanding bodies from categories...');
  try {
    var CATS = ['Constitutional_bodies_of_India', 'Indian_statutory_commissions', 'Government_bodies_of_India'];
    for (var cci = 0; cci < CATS.length; cci++) {
      try {
        var membs = await categoryMembers(CATS[cci]);
        for (var midx = 0; midx < membs.length; midx++) {
          var tt = membs[midx];
          if (tt.indexOf('Category:') === 0 || tt.indexOf('List of') === 0 || tt.indexOf('Template:') === 0) continue;
          var already = false;
          for (var bi = 0; bi < BODIES.length; bi++) {
            if (BODIES[bi].page === tt.replace(/ /g, '_') || BODIES[bi].name.toLowerCase() === tt.toLowerCase()) { already = true; break; }
          }
          if (already) continue;
          BODIES.push({ page: tt.replace(/ /g, '_'), name: tt, label: 'Chairperson', emoji: '\uD83D\uDCDD' });
        }
      } catch (e) { console.error('  Category ' + CATS[cci] + ' error: ' + e.message); }
      await delay(300);
    }
    console.error('  Now tracking ' + BODIES.length + ' bodies');
  } catch (e) { console.error('  Error expanding bodies: ' + e.message); }

  await fetchBodyInfo(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nConstitutional Bodies: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

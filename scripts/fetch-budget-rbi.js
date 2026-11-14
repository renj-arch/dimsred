var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'BudgetRBIBot/2.0' } }, function(res) {
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

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = subSubject === 'Union Budget & Economic Survey' ? 'bud' : 'rbi';
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
    if (th && td) {
      var label = strip(th[1]);
      var value = strip(td[1]);
      if (label && value && label.length > 2) data[label] = value;
    }
  }
  return data;
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

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Union Budget & Economic Survey', 'RBI Monetary Policy'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { b: {}, r: {} };
  existing[CA_KEY].subSubjects['Union Budget & Economic Survey'].forEach(function(q) { ek.b[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['RBI Monetary Policy'].forEach(function(q) { ek.r[eventKey(q)] = true; });
  var seq = { b: existing[CA_KEY].subSubjects['Union Budget & Economic Survey'].length + 1, r: existing[CA_KEY].subSubjects['RBI Monetary Policy'].length + 1 };
  var nq = { b: [], r: [] };

  // ── Union Budget infobox ──
  process.stdout.write('  Union Budget... ');
  try {
    var html = await fetchPageText('2026_Union_Budget_of_India');
    var info = extractInfobox(html);
    var bCount = 0;
    Object.keys(info).forEach(function(k) {
      var v = info[k];
      if (k.indexOf('Total') >= 0 || k.indexOf('Budget') >= 0 || k.indexOf('Deficit') >= 0 || k.indexOf('GDP') >= 0) {
        var q = makeQuestion('What is the ' + k + ' as per the Union Budget?', v, 'Union Budget & Economic Survey', seq.b++, 'Union Budget 2026', '\uD83D\uDCB0', 'Union Budget: ' + k + ' = ' + v);
        if (q && !ek.b[eventKey(q)]) { nq.b.push(q); ek.b[eventKey(q)] = true; bCount++; }
      }
    });
    // Also extract fiscal deficit, GDP numbers from text
    var fd = html.match(/(?:fiscal\s+deficit|revenue\s+deficit|primary\s+deficit)[^<]*?(?:Rs\.?\s*)?([\d,]+(?:\s+crore|\s+lakh\s+crore)?)/gi);
    if (fd) {
      fd.forEach(function(m) {
        var q = makeQuestion('What is a key budget term mentioned in the Union Budget?', strip(m), 'Union Budget & Economic Survey', seq.b++, 'Union Budget 2026', '\uD83D\uDCB0', strip(m));
        if (q && !ek.b[eventKey(q)]) { nq.b.push(q); ek.b[eventKey(q)] = true; bCount++; }
      });
    }
    process.stdout.write(bCount + ' items\n');
  } catch (e) { process.stdout.write('Not found: ' + e.message + '\n'); }
  await delay(600);

  // ── Economic Survey ──
  process.stdout.write('  Economic Survey... ');
  try {
    var html = await fetchPageText('Economic_Survey_of_India');
    var tables = extractWikiTables(html);
    var esCount = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 10; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var yr = strip(row[0] || '');
        var gdp = strip(row.length > 1 ? row[1] : '');
        if (yr.match(/202[4-6]/) && gdp.length > 2) {
          var q = makeQuestion('What was India\'s GDP growth rate projected in the Economic Survey ' + yr + '?', gdp, 'Union Budget & Economic Survey', seq.b++, 'Economic Survey', '\uD83D\uDCCA', 'Economic Survey ' + yr + ' projected GDP growth at ' + gdp + '.');
          if (q && !ek.b[eventKey(q)]) { nq.b.push(q); ek.b[eventKey(q)] = true; esCount++; }
        }
      }
    });
    process.stdout.write(esCount + ' items\n');
  } catch (e) { process.stdout.write('Not found: ' + e.message + '\n'); }
  await delay(600);

  process.stdout.write('  RBI Repo Rate... ');
  try {
    var html = await fetchPageText('Repurchase_agreement');
    var info = extractInfobox(html);
    var rCount = 0;
    // Try RBI page
    var html2 = await fetchPageText('Reserve_Bank_of_India');
    var info2 = extractInfobox(html2);
    ['Repo rate', 'Reverse repo rate', 'CRR', 'SLR', 'Bank rate'].forEach(function(key) {
      var v = info[key] || info2[key] || '';
      if (v.length > 0) {
        var q = makeQuestion('What is the current ' + key + ' as set by RBI?', v, 'RBI Monetary Policy', seq.r++, 'General Knowledge', '\uD83C\uDFE6', 'RBI ' + key + ' is ' + v + '.');
        if (q && !ek.r[eventKey(q)]) { nq.r.push(q); ek.r[eventKey(q)] = true; rCount++; }
      }
    });
    process.stdout.write(rCount + ' items\n');
  } catch (e) { process.stdout.write('Not found: ' + e.message + '\n'); }

  nq.b.forEach(function(q) { existing[CA_KEY].subSubjects['Union Budget & Economic Survey'].push(q); });
  nq.r.forEach(function(q) { existing[CA_KEY].subSubjects['RBI Monetary Policy'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Budget & Survey: ' + existing[CA_KEY].subSubjects['Union Budget & Economic Survey'].length + ' total, ' + nq.b.length + ' new');
  console.error('RBI Monetary Policy: ' + existing[CA_KEY].subSubjects['RBI Monetary Policy'].length + ' total, ' + nq.r.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});


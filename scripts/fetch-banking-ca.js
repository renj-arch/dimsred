var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'BankBot/1.0' } }, function(res) {
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
  var id = 'bank_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Banking & Finance', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchPSBanks(existingKeys, newQuestions, seqObj) {
  console.error('--- Public Sector Banks ---');
  try {
    var html = await fetchPageText('Banking_in_India');
    var tables = extractWikiTables(html);
    var count = 0;
    for (var ti = 0; ti < tables.length; ti++) {
      var t = tables[ti];
      if (t.length < 3) continue;
      var hr = t[0];
      var hasFailed = false, isPSB = false;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('fail') >= 0) hasFailed = true;
      }
      if (hasFailed) continue;
      var hqCol = -1, nameCol = 0;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('name') >= 0) nameCol = ci;
        if (h.indexOf('hq') >= 0 || h.indexOf('headquarter') >= 0) hqCol = ci;
      }
      if (hqCol < 0 && hr.length > 2) hqCol = 2;
      if (hqCol < 0) continue;
      for (var ri = 1; ri < Math.min(t.length, 25); ri++) {
        var row = t[ri];
        if (row.length < Math.max(nameCol, hqCol) + 1) continue;
        var name = strip(row[nameCol]);
        var hq = strip(row[hqCol]);
        if (name && name.length > 3 && name !== 'Name' && hq && hq.length > 2 && hq !== 'Headquarters') {
          var qText = 'Where is the headquarters of ' + name + '?';
          var q = makeQuestion(qText, hq, seqObj.seq++, 'Banking in India', '\uD83C\uDFE6', name + ' is headquartered in ' + hq + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    }
    console.error('  ' + count + ' PSB questions added');
    if (count === 0) {
      var psbFallback = [
        { n: 'State Bank of India', h: 'Mumbai' },
        { n: 'Bank of Baroda', h: 'Vadodara' },
        { n: 'Punjab National Bank', h: 'New Delhi' },
        { n: 'Canara Bank', h: 'Bengaluru' },
        { n: 'Union Bank of India', h: 'Mumbai' },
        { n: 'Indian Bank', h: 'Chennai' },
        { n: 'Bank of India', h: 'Mumbai' },
        { n: 'Central Bank of India', h: 'Mumbai' },
        { n: 'Indian Overseas Bank', h: 'Chennai' },
        { n: 'UCO Bank', h: 'Kolkata' },
        { n: 'Bank of Maharashtra', h: 'Pune' },
        { n: 'Punjab and Sind Bank', h: 'New Delhi' },
      ];
      psbFallback.forEach(function(b) {
        var qText = 'Where is the headquarters of ' + b.n + '?';
        var q = makeQuestion(qText, b.h, seqObj.seq++, 'Reference - PSBs', '\uD83C\uDFE6', b.n + ' is headquartered in ' + b.h + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' PSB questions)');
    }
    console.error('\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchUPIData(existingKeys, newQuestions, seqObj) {
  console.error('--- UPI ---');
  try {
    var html = await fetchPageText('Unified_Payments_Interface');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      if (t.length < 2) return;
      var hr = t[0];
      var hasTransVol = false;
      for (var ci = 0; ci < hr.length; ci++) {
        if (hr[ci].toLowerCase().indexOf('transaction') >= 0) hasTransVol = true;
      }
      if (hasTransVol) return;
      var appCol = -1, provCol = -1;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('app') >= 0) appCol = ci;
        if (h.indexOf('provider') >= 0 || h.indexOf('psp') >= 0) provCol = ci;
      }
      if (appCol < 0) { appCol = 0; provCol = 1; }
      if (appCol >= 0) {
        for (var ri = 1; ri < Math.min(t.length, 15); ri++) {
          var row = t[ri];
          if (row.length < Math.max(appCol, provCol) + 1) continue;
          var app = strip(row[appCol]);
          var provider = provCol >= 0 ? strip(row[provCol]) : '';
          if (app && app.length > 2 && app !== 'App' && app !== 'Application') {
            var qText = 'Which organization developed the UPI app ' + app + '?';
            var a = provider || 'NPCI';
            var q = makeQuestion(qText, a, seqObj.seq++, 'UPI', '\uD83D\uDCB1', app + ' is a UPI app by ' + a + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      }
    });
    console.error('  ' + count + ' UPI questions added\n');
    if (count === 0) {
      var upiFallback = [
        { a: 'Google Pay', p: 'Google' },
        { a: 'PhonePe', p: 'Flipkart / Walmart' },
        { a: 'Paytm', p: 'One97 Communications' },
        { a: 'BHIM', p: 'NPCI' },
        { a: 'Amazon Pay', p: 'Amazon' },
        { a: 'CRED', p: 'CRED' },
        { a: 'Mobikwik', p: 'Mobikwik' },
        { a: 'WhatsApp Pay', p: 'Meta / NPCI' },
      ];
      upiFallback.forEach(function(u) {
        var qText = 'Which organization developed the UPI app ' + u.a + '?';
        var q = makeQuestion(qText, u.p, seqObj.seq++, 'Reference - UPI', '\uD83D\uDCB1', u.a + ' is a UPI app by ' + u.p + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + count + ' UPI questions)\n');
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
  var subKey = 'Banking & Finance';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchPSBanks(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchUPIData(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nBanking & Finance: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

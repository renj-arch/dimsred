var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'EconBot/1.0' } }, function(res) {
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
  return fetchJSON(API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=200&cmtype=page&format=json').then(function(d) {
    var out = [];
    if (d && d.query && d.query.categorymembers) {
      d.query.categorymembers.forEach(function(e) { if (e.title) out.push(e.title); });
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
  var id = 'econ_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Economy & Finance', emoji: emoji,
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

async function fetchBudgetData(existingKeys, newQuestions, seqObj) {
  console.error('\n--- Union Budget Data ---');
  try {
    var html = await fetchPageText('Union_budget_of_India');
    var tables = extractWikiTables(html);
    var count = 0;

    var fiscalTable = null;
    var yrCol, recCol, deficitCol, budgetCol, gdpCol;
    for (var ti = 0; ti < tables.length; ti++) {
      var t = tables[ti];
      if (t.length < 5) continue;
      var hr = t[0];
      yrCol = -1; recCol = -1; deficitCol = -1; budgetCol = -1; gdpCol = -1;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('year') >= 0) yrCol = ci;
        if (h.indexOf('receipt') >= 0) recCol = ci;
        if (h.indexOf('fiscal deficit') >= 0 || h.indexOf('fiscal') >= 0) deficitCol = ci;
        if (h.indexOf('total budget') >= 0 || h.indexOf('total') >= 0) budgetCol = ci;
        if (h.indexOf('gdp') >= 0) gdpCol = ci;
      }
      if (yrCol >= 0 && (deficitCol >= 0 || budgetCol >= 0)) { fiscalTable = t; break; }
    }
    if (fiscalTable) {
      for (var ri = 1; ri < fiscalTable.length; ri++) {
        var row = fiscalTable[ri];
        if (row.length < Math.max(yrCol, deficitCol, budgetCol) + 1) continue;
        var year = strip(row[yrCol]);
        if (!year || year.length < 4) continue;
        var y = parseInt(year.substring(0, 4));
        if (!y || y < 2014) continue;
        var deficit = deficitCol >= 0 ? strip(row[deficitCol]) : '';
        var totalBudget = budgetCol >= 0 ? strip(row[budgetCol]) : '';
        if (deficit && deficit.length > 1 && deficit !== 'Fiscal Deficit') {
          var qText = 'What was India\'s fiscal deficit target in the Union Budget for FY' + year + '?';
          var q = makeQuestion(qText, deficit, seqObj.seq++, 'Union Budget', '\uD83D\uDCB0', 'Fiscal deficit in FY' + year + ' was ' + deficit + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
        if (totalBudget && totalBudget.length > 1 && totalBudget !== 'Total Budget') {
          var qText2 = 'What was the total Union Budget allocation for FY' + year + '?';
          var q2 = makeQuestion(qText2, totalBudget, seqObj.seq++, 'Union Budget', '\uD83D\uDCB0', 'Total budget for FY' + year + ' was ' + totalBudget + '.');
          if (q2 && !existingKeys[eventKey(q2)]) { newQuestions.push(q2); existingKeys[eventKey(q2)] = true; count++; }
        }
      }
    }
    console.error('  ' + count + ' budget questions added\n');
    if (count === 0) {
      var budgetData = [
        { y: '2025-26', f: '4.4% of GDP', b: '\u20B948.21 lakh crore' },
        { y: '2024-25', f: '4.9% of GDP', b: '\u20B947.66 lakh crore' },
        { y: '2023-24', f: '5.8% of GDP', b: '\u20B945.03 lakh crore' },
        { y: '2022-23', f: '6.4% of GDP', b: '\u20B939.45 lakh crore' },
        { y: '2021-22', f: '6.8% of GDP', b: '\u20B934.83 lakh crore' },
      ];
      budgetData.forEach(function(b) {
        var qText = 'What was India\'s fiscal deficit target for FY' + b.y + '?';
        var q = makeQuestion(qText, b.f, seqObj.seq++, 'Reference - Union Budget', '\uD83D\uDCB0', 'Fiscal deficit for FY' + b.y + ' was ' + b.f + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        var qText2 = 'What was the total Union Budget outlay for FY' + b.y + '?';
        var q2 = makeQuestion(qText2, b.b, seqObj.seq++, 'Reference - Union Budget', '\uD83D\uDCB0', 'Total budget for FY' + b.y + ' was ' + b.b + '.');
        if (q2 && !existingKeys[eventKey(q2)]) { newQuestions.push(q2); existingKeys[eventKey(q2)] = true; count++; }
      });
      console.error('  (fallback added ' + (budgetData.length * 2) + ' budget questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchGSTData(existingKeys, newQuestions, seqObj) {
  console.error('--- GST Data ---');
  try {
    var html = await fetchPageText('Goods_and_Services_Tax_(India)');
    var tables = extractWikiTables(html);
    var count = 0;

    for (var ti = 0; ti < tables.length; ti++) {
      var t = tables[ti];
      if (t.length < 3) continue;
      var hr = t[0];
      var isCouncil = false;
      for (var ci = 0; ci < hr.length; ci++) {
        var h = hr[ci].toLowerCase();
        if (h.indexOf('member') >= 0 || h.indexOf('portfolio') >= 0) isCouncil = true;
      }
      if (isCouncil) {
        for (var ri = 1; ri < t.length; ri++) {
          var row = t[ri];
          if (row.length < 2) continue;
          var member = strip(row[1]);
          var portfolio = strip(row[2] || row[1]);
          if (member && portfolio && member.length > 3 && member !== 'Member') {
            var qText = 'Who is the ' + portfolio.replace(/^Union\s+/,'') + ' in the GST Council?';
            var q = makeQuestion(qText, member, seqObj.seq++, 'GST Council', '\uD83D\uDCB0', member + ' serves as ' + portfolio + ' in the GST Council.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
        break;
      }
    }
    console.error('  ' + count + ' GST questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchNitiAayog(existingKeys, newQuestions, seqObj) {
  console.error('--- NITI Aayog ---');
  try {
    var html = await fetchPageText('NITI_Aayog');
    var tables = extractWikiTables(html);
    var count = 0;
    var fullTimeTable = null;
    for (var ti = 0; ti < tables.length; ti++) {
      if (tables[ti].length >= 5 && tables[ti][0][0] && (tables[ti][0][0].indexOf('Portfolio') >= 0 || tables[ti][0][0].indexOf('Member') >= 0)) {
        fullTimeTable = tables[ti];
        break;
      }
    }
    if (fullTimeTable) {
      for (var ri = 1; ri < fullTimeTable.length; ri++) {
        var row = fullTimeTable[ri];
        if (row.length < 2) continue;
        var name = strip(row[0]);
        var role = row.length > 1 ? strip(row[1]) : '';
        if (name && name.length > 3 && name !== 'Name' && role) {
          var qText = 'Who serves as ' + role + ' of NITI Aayog?';
          var q = makeQuestion(qText, name, seqObj.seq++, 'NITI Aayog', '\uD83D\uDCB0', name + ' is ' + role + ' of NITI Aayog.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    }
    console.error('  ' + count + ' NITI Aayog questions added\n');
    if (count === 0) {
      var nitiData = [
        { q: 'Who is the Chairperson of NITI Aayog?', a: 'Prime Minister (Narendra Modi)' },
        { q: 'Who is the CEO of NITI Aayog?', a: 'B. V. R. Subrahmanyam' },
        { q: 'Who is the Vice Chairperson of NITI Aayog?', a: 'Suman Bery' },
        { q: 'What is the full form of NITI?', a: 'National Institution for Transforming India' },
        { q: 'When was NITI Aayog established?', a: '1 January 2015' },
        { q: 'What did NITI Aayog replace?', a: 'Planning Commission' },
        { q: 'What is the full form of SDG in NITI Aayog?', a: 'Sustainable Development Goals' },
        { q: 'What is India\'s rank in NITI Aayog\'s SDG Index 2024?', a: 'Rank 109' },
      ];
      nitiData.forEach(function(n) {
        var q = makeQuestion(n.q, n.a, seqObj.seq++, 'Reference - NITI Aayog', '\uD83D\uDCB0', n.a);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + nitiData.length + ' NITI Aayog questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchBudgetByYear(existingKeys, newQuestions, seqObj) {
  console.error('\n--- Union Budget (year-wise) ---');
  try {
    var now = new Date();
    var cur = now.getFullYear();
    var pages = {};
    try {
      var members = await categoryMembers('Union_budgets_of_India');
      members.forEach(function(t) {
        var ym = t.match(/\b(19|20)\d{2}\b/);
        if (ym && ym[0] >= '2014') pages[t.replace(/ /g, '_')] = ym[0];
      });
    } catch (e) {}
    for (var off = 0; off < 3; off++) {
      var y = cur - off;
      pages[y + '_Union_Budget_of_India'] = '' + y;
    }
    var KEYS = ['Total expenditure', 'Total revenue', 'Expenditure', 'Fiscal deficit', 'Revenue deficit', 'Total receipts', 'FinanceMinister'];
    var count = 0;
    var titles = Object.keys(pages);
    for (var pi = 0; pi < titles.length; pi++) {
      try {
        var html = await fetchPageText(titles[pi]);
        var info = extractInfobox(html);
        var yr2 = pages[titles[pi]];
        for (var k = 0; k < KEYS.length; k++) {
          if (info[KEYS[k]] && info[KEYS[k]].length > 2) {
            var qText = 'In the ' + yr2 + ' Union Budget, what was allocated under ' + KEYS[k] + '?';
            var q = makeQuestion(qText, info[KEYS[k]], seqObj.seq++, 'Union Budget', '\uD83D\uDCB0', yr2 + ' Union Budget: ' + KEYS[k] + ' = ' + info[KEYS[k]] + '.');
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
          }
        }
      } catch (e) {}
      await delay(300);
    }
    console.error('  ' + count + ' year-wise budget questions added\n');
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
  var subKey = 'Economy & Finance';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchBudgetData(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchBudgetByYear(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchGSTData(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchNitiAayog(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nEconomy & Finance: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

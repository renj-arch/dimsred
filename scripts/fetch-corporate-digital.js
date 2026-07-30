var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'CorpBot/2.0' } }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) { var wait = Math.pow(2, 4 - retries) * 3000; return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait); }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = { 'Corporate & Startups': 'corp', 'Stock Market': 'stk', 'Digital Payments': 'pay', 'Telecom & 5G': 'tel', 'Cyber Security': 'cyb' }[subSubject] || 'dig';
  return { id: prefix + '_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
}

function eventKey(q) { var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); }; return n(q.question || '').substring(0, 80) + '|' + n(q.answer || ''); }

function fetchPageText(title) { return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) { if (d && d.parse && d.parse.text) return d.parse.text['*']; return ''; }); }

function extractInfobox(html) {
  var data = {}; var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return data; var rows = m[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi); if (!rows) return data;
  for (var ri = 0; ri < rows.length; ri++) {
    var th = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i); var td = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (th && td) { var label = strip(th[1]); var value = strip(td[1]); if (label && value && label.length > 2) data[label] = value; }
  }
  return data;
}

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = []; var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi; var rm;
    while ((rm = rRegex.exec(m[2])) !== null) {
      var cells = []; var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi; var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) { try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {} }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Corporate & Startups', 'Stock Market', 'Digital Payments', 'Telecom & 5G', 'Cyber Security'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}, seq = {};
  ['Corporate & Startups', 'Stock Market', 'Digital Payments', 'Telecom & 5G', 'Cyber Security'].forEach(function(s) {
    ek[s] = {}; existing[CA_KEY].subSubjects[s].forEach(function(q) { ek[s][eventKey(q)] = true; }); seq[s] = existing[CA_KEY].subSubjects[s].length + 1;
  });
  var nq = {};

  // ── Corporate: Top companies from NIFTY / Sensex pages ──
  process.stdout.write('  Corporate & Startups... ');
  try {
    var html = await fetchPageText('List_of_companies_of_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 12; ri++) {
        var row = t[ri]; if (row.length < 2) continue;
        var name = strip(row[0] || ''); var sector = strip(row.length > 2 ? row[2] : (row[1] || ''));
        if (name.length > 2 && name.indexOf('Company') < 0 && name.indexOf('Name') < 0 && sector.length > 2 && sector.indexOf('Industry') < 0) {
          var q = makeQuestion('Which sector does ' + name + ' belong to?', sector, 'Corporate & Startups', seq['Corporate & Startups']++, 'Companies of India', '\uD83C\uDFED', name + ' belongs to the ' + sector + ' sector.');
          if (q && !ek['Corporate & Startups'][eventKey(q)]) { if (!nq['Corporate & Startups']) nq['Corporate & Startups'] = []; nq['Corporate & Startups'].push(q); ek['Corporate & Startups'][eventKey(q)] = true; count++; }
        }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── SEBI / Stock Market regulators ──
  process.stdout.write('  Stock Market... ');
  try {
    var html = await fetchPageText('Securities_and_Exchange_Board_of_India');
    var info = extractInfobox(html);
    var count = 0;
    ['Chairperson', 'Headquarters', 'Formed'].forEach(function(k) {
      if (info[k] && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of SEBI?', info[k], 'Stock Market', seq['Stock Market']++, 'SEBI', '\uD83D\uDCC8', 'SEBI ' + k + ': ' + info[k] + '.');
        if (q && !ek['Stock Market'][eventKey(q)]) { if (!nq['Stock Market']) nq['Stock Market'] = []; nq['Stock Market'].push(q); ek['Stock Market'][eventKey(q)] = true; count++; }
      }
    });
    // BSE/NSE
    var html2 = await fetchPageText('Bombay_Stock_Exchange');
    var info2 = extractInfobox(html2);
    if (info2['Headquarters']) {
      var q = makeQuestion('Where is the Bombay Stock Exchange headquartered?', info2['Headquarters'], 'Stock Market', seq['Stock Market']++, 'BSE', '\uD83D\uDCC8', 'BSE HQ: ' + info2['Headquarters'] + '.');
      if (q && !ek['Stock Market'][eventKey(q)]) { if (!nq['Stock Market']) nq['Stock Market'] = []; nq['Stock Market'].push(q); ek['Stock Market'][eventKey(q)] = true; count++; }
    }
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Digital Payments / UPI ──
  process.stdout.write('  Digital Payments... ');
  try {
    var html = await fetchPageText('Digital_payment_in_India');
    var info = extractInfobox(html);
    var count = 0;
    var hadData = false;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(volume|value|transaction|users|adoption)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of digital payments in India?', info[k], 'Digital Payments', seq['Digital Payments']++, 'Digital payment in India', '\uD83D\uDCB3', 'Digital payments: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Digital Payments'][eventKey(q)]) { if (!nq['Digital Payments']) nq['Digital Payments'] = []; nq['Digital Payments'].push(q); ek['Digital Payments'][eventKey(q)] = true; hadData = true; count++; }
      }
    });
    if (!hadData) {
      var txt = strip(html);
      var leads = txt.match(/(?:UPI|digital|payment|transaction)\s+[^.]*(?:\d+[\d,.]*\s*(?:crore|million|billion|trillion|rupee|lakh))[^.]*\./gi) || [];
      leads.slice(0,3).forEach(function(lead) {
        var numM = lead.match(/(\d+[\d,.]*\s*(?:crore|million|billion|trillion|lakh)?)/);
        if (numM && numM[0].length > 2) {
          var q = makeQuestion('What digital payments statistic is: ' + lead.substring(0,50).trim() + '?', numM[0].trim(), 'Digital Payments', seq['Digital Payments']++, 'General Knowledge', '\uD83D\uDCB3', lead + '.');
          if (q && !ek['Digital Payments'][eventKey(q)]) { if (!nq['Digital Payments']) nq['Digital Payments'] = []; nq['Digital Payments'].push(q); ek['Digital Payments'][eventKey(q)] = true; count++; }
        }
      });
    }
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Telecom/5G ──
  process.stdout.write('  Telecom & 5G... ');
  try {
    var html = await fetchPageText('Telecommunications_in_India');
    var info = extractInfobox(html);
    var count = 0;
    var hadData = false;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(subscriber|users|mobile|teledensity|operator|revenue)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of telecom in India?', info[k], 'Telecom & 5G', seq['Telecom & 5G']++, 'Telecom in India', '\uD83D\uDCF6', 'Telecom: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Telecom & 5G'][eventKey(q)]) { if (!nq['Telecom & 5G']) nq['Telecom & 5G'] = []; nq['Telecom & 5G'].push(q); ek['Telecom & 5G'][eventKey(q)] = true; hadData = true; count++; }
      }
    });
    if (!hadData) {
      var txt = strip(html);
      var leads = txt.match(/(?:subscriber|mobile|telecom|wireless|broadband|5G)\s+[^.]*(?:\d+[\d,.]*\s*(?:million|billion|crore|lakh|million))[^.]*\./gi) || [];
      leads.slice(0,3).forEach(function(lead) {
        var numM = lead.match(/(\d+[\d,.]*\s*(?:million|billion|crore|lakh)?)/);
        if (numM && numM[0].length > 2) {
          var q = makeQuestion('What telecom statistic is: ' + lead.substring(0,50).trim() + '?', numM[0].trim(), 'Telecom & 5G', seq['Telecom & 5G']++, 'General Knowledge', '\uD83D\uDCF6', lead + '.');
          if (q && !ek['Telecom & 5G'][eventKey(q)]) { if (!nq['Telecom & 5G']) nq['Telecom & 5G'] = []; nq['Telecom & 5G'].push(q); ek['Telecom & 5G'][eventKey(q)] = true; count++; }
        }
      });
    }
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Cyber Security ──
  process.stdout.write('  Cyber Security... ');
  try {
    var html = await fetchPageText('Cybercrime_in_India');
    var info = extractInfobox(html);
    var count = 0;
    if (info && Object.keys(info).length > 0) {
      Object.keys(info).forEach(function(k) {
        if (info[k].length > 2 && info[k].match(/\d+/)) {
          var q = makeQuestion('What is the ' + k + ' related to cybercrime in India?', info[k], 'Cyber Security', seq['Cyber Security']++, 'Cybercrime in India', '\uD83D\uDD10', 'Cybercrime: ' + k + ' = ' + info[k] + '.');
          if (q && !ek['Cyber Security'][eventKey(q)]) { if (!nq['Cyber Security']) nq['Cyber Security'] = []; nq['Cyber Security'].push(q); ek['Cyber Security'][eventKey(q)] = true; count++; }
        }
      });
    } else {
      var txt = strip(html);
      var leads = txt.match(/(?:cybercrime|cyber|cases|incidents|reported)\s+[^.]*(?:\d+[\d,.]*\s*(?:cases|incidents|crore|lakh))[^.]*\./gi) || [];
      leads.slice(0,3).forEach(function(lead) {
        var numM = lead.match(/(\d+[\d,.]*\s*(?:cases|incidents)?)/);
        if (numM && numM[0].length > 2) {
          var q = makeQuestion('What cybercrime statistic is: ' + lead.substring(0,50).trim() + '?', numM[0].trim(), 'Cyber Security', seq['Cyber Security']++, 'General Knowledge', '\uD83D\uDD10', lead + '.');
          if (q && !ek['Cyber Security'][eventKey(q)]) { if (!nq['Cyber Security']) nq['Cyber Security'] = []; nq['Cyber Security'].push(q); ek['Cyber Security'][eventKey(q)] = true; count++; }
        }
      });
    }
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  Object.keys(nq).forEach(function(cat) { (nq[cat] || []).forEach(function(q) { existing[CA_KEY].subSubjects[cat].push(q); }); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  ['Corporate & Startups', 'Stock Market', 'Digital Payments', 'Telecom & 5G', 'Cyber Security'].forEach(function(s) { console.error(s + ': ' + existing[CA_KEY].subSubjects[s].length + ' total'); });
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

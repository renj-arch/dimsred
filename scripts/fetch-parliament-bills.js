var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ParliamentBills/1.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function stripHtml(html) { return html.replace(/<[^>]+>/g, '').trim(); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function fetchPageContent(title) {
  var url = API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json';
  return fetchJSON(url).then(function(data) {
    if (data && data.parse && data.parse.text) return data.parse.text['*'] || '';
    return '';
  });
}

function extractBillCells(html, year) {
  var bills = [];
  var yearStr = '' + year;
  
  var tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tables) return bills;
  
  for (var ti = 0; ti < tables.length; ti++) {
    var rows = tables[ti].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!rows) continue;
    for (var ri = 1; ri < rows.length; ri++) {
      var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
      if (!cells || cells.length < 3) continue;
      
      var title = stripHtml(cells[0]).replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').trim();
      var y = stripHtml(cells[1]).replace(/\s+/g, ' ').trim();
      var actNo = stripHtml(cells[2]).replace(/\s+/g, ' ').trim();
      
      if (y !== yearStr) continue;
      if (title.length < 5) continue;
      
      title = title.replace(/^The\s+/i, '').trim();
      bills.push({ title: title, year: year, actNo: actNo });
    }
  }
  return bills;
}

async function fetchBillsForYear(year) {
  var html;
  try {
    html = await fetchPageContent('List_of_acts_of_the_Parliament_of_India');
  } catch (e) {
    console.error('  Error: ' + e.message);
    return [];
  }
  if (!html) return [];
  
  var bills = extractBillCells(html, year);
  console.error('  Found ' + bills.length + ' bills for ' + year);
  return bills;
}

function makeBillQuestion(bill, seq) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var year = bill.year || now.getFullYear();
  var id = 'bill_' + pad(seq);

  var qText = bill.title;
  var actNum = bill.actNo || '';
  if (qText.length > 180) qText = qText.substring(0, 177) + '...';

  var blankText = qText;
  var answer = actNum ? 'Act No. ' + actNum + ' of ' + year : year;

  var answerEscaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var wordRe = new RegExp('\\b' + answerEscaped + '\\b', 'i');
  var m = wordRe.exec(blankText);
  if (m) {
    blankText = blankText.substring(0, m.index) + '_____' + blankText.substring(m.index + m[0].length);
  } else if (actNum) {
    var yearText = '"' + qText + '" was passed as Act No. _____ of ' + year + ' by the Parliament of India.';
    blankText = yearText;
    answer = actNum;
  }

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia - Parliament of India',
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'Parliament & Bills',
    emoji: '\uD83D\uDCD6',
    question: blankText,
    answer: answer,
    hint: '',
    fact: 'The "' + qText + '" was passed by the Parliament of India in ' + year + '. ' + (actNum ? 'Act No. ' + actNum + ' of ' + year + '.' : '')
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) {
      console.error('Error reading pib-archive.json: ' + e.message);
    }
  }

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Parliament & Bills']) existing[CA_KEY].subSubjects['Parliament & Bills'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Parliament & Bills'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Parliament & Bills'].length + 1;

  var now = new Date();
  var years = [now.getFullYear(), now.getFullYear() - 1];
  for (var yi = 0; yi < years.length; yi++) {
    console.error('Fetching bills for ' + years[yi] + '...');
    var bills = await fetchBillsForYear(years[yi]);
    bills.forEach(function(bill) {
      var q = makeBillQuestion(bill, seq);
      if (q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
        }
      }
    });
    await delay(1000);
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Parliament & Bills'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Parliament & Bills'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Parliament & Bills: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

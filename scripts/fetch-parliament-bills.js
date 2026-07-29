var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ParliamentBills/2.0' } }, function(res) {
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
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function stripHtml(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }
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

function makeBillQuestions(bill, seq) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var year = bill.year || now.getFullYear();
  var results = [];

  var idBase = 'bill_' + pad(seq);

  // Question 1: Act number
  var actNum = bill.actNo || '';
  if (actNum) {
    results.push({
      id: idBase,
      type: 'fill_blank',
      category: 'Current Affairs',
      region: '',
      source: 'Wikipedia - Parliament of India',
      pubDate: pubDate,
      subject: 'Current Affairs',
      subSubject: 'Parliament & Bills',
      emoji: '\uD83D\uDCD6',
      question: 'The "' + bill.title + '" was passed as Act No. _____ of ' + year + ' by the Parliament of India.',
      answer: actNum,
      hint: '',
      fact: 'The "' + bill.title + '" was passed by the Parliament of India in ' + year + '. Act No. ' + actNum + ' of ' + year + '.'
    });
  }

  // Question 2: Bill title fill-in-blank
  var escTitle = bill.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var wordCount = bill.title.split(/\s+/).length;
  if (wordCount > 3 && bill.title.length < 120) {
    var words = bill.title.split(/\s+/);
    var blankIdx = Math.floor(wordCount / 3);
    var blankWord = words[blankIdx].replace(/[",'.;:!?()]/g, '');
    if (blankWord.length > 2) {
      var blankQ = bill.title.replace(new RegExp('\\b' + blankWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '_____');
      if (blankQ !== bill.title) {
        results.push({
          id: idBase + '_t',
          type: 'fill_blank',
          category: 'Current Affairs',
          region: '',
          source: 'Wikipedia - Parliament of India',
          pubDate: pubDate,
          subject: 'Current Affairs',
          subSubject: 'Parliament & Bills',
          emoji: '\uD83D\uDCD6',
          question: blankQ + ' was passed by the Parliament of India in ' + year + '.',
          answer: blankWord,
          hint: '',
          fact: 'The "' + bill.title + '" was passed by the Parliament of India in ' + year + '.'
        });
      }
    }
  }

  return results;
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
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
      var qs = makeBillQuestions(bill, seq);
      qs.forEach(function(q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
        }
      });
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

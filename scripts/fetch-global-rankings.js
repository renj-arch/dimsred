var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'GlobalRankings/2.0' } }, function(res) {
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

function fetchJSONWithRetry(url, retries) {
  retries = retries || 3;
  return fetchJSON(url).catch(function(err) {
    if (retries > 0 && (err.message.indexOf('429') >= 0 || err.message.indexOf('429') >= 0)) {
      console.error('  429, retrying after 3s... (' + retries + ' left)');
      return delay(3000).then(function() { return fetchJSONWithRetry(url, retries - 1); });
    }
    throw err;
  });
}
function stripHtml(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function fetchPageContent(title) {
  var url = API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json';
  return fetchJSONWithRetry(url).then(function(data) {
    if (data && data.parse && data.parse.text) return data.parse.text['*'] || '';
    return '';
  });
}

function findIndiaRank(text) {
  var t = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/,/g, '').toLowerCase();
  var patterns = [
    /india\s+(?:is\s+)?ranked\s+(?:#?\s*)?(\d+)(?:st|nd|rd|th)?/i,
    /india\s+(?:is\s+)?placed\s+(?:#?\s*)?(\d+)(?:st|nd|rd|th)?/i,
    /india\s+\w+\s+rank\s+(?:of\s+)?(\d+)/i,
    /india[^.]*?rank[s]?\s+(\d+)/i,
    /rank[^.]*?india[^.]*?(\d+)/i,
    /india[^.]*?(?:\bout\s+of\s+|\/)\s*(\d+)\s+countr/i,
    /india[^.]*?(\d+)(?:st|nd|rd|th)\s+(?:position|place|rank)/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = t.match(patterns[i]);
    if (m) {
      var rank = m[1].replace(/[^0-9]/g, '');
      if (rank && parseInt(rank) > 0 && parseInt(rank) < 250) return rank;
    }
  }
  return '';
}

function findIndiaRankInTable(html) {
  var tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tables) return '';

  for (var ti = 0; ti < tables.length; ti++) {
    var rows = tables[ti].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!rows) continue;

    for (var ri = 0; ri < rows.length; ri++) {
      var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
      if (!cells || cells.length < 2) continue;

      var firstCell = stripHtml(cells[0]).replace(/\s+/g, ' ').trim();
      if (firstCell.toLowerCase().indexOf('india') < 0) continue;

      var rankVal = '';
      for (var ci = 1; ci < cells.length; ci++) {
        var val = stripHtml(cells[ci]).replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').trim();
        var numM = val.match(/(\d+)/);
        if (numM) {
          var n = parseInt(numM[1]);
          if (n > 0 && n < 250) {
            if (!rankVal) rankVal = '' + n;
          }
        }
      }
      if (rankVal) return rankVal;
    }
  }
  return '';
}

var RANKINGS = [
  { page: 'World_Happiness_Report', name: 'World Happiness Report' },
  { page: 'Global_Hunger_Index', name: 'Global Hunger Index' },
  { page: 'Corruption_Perceptions_Index', name: 'Corruption Perceptions Index' },
  { page: 'Global_Competitiveness_Report', name: 'Global Competitiveness Index' },
  { page: 'Ease_of_doing_business_index', name: 'Ease of Doing Business' },
  { page: 'Press_Freedom_Index', name: 'Press Freedom Index' },
  { page: 'Democracy_Index', name: 'Democracy Index' },
  { page: 'Human_Development_Index', name: 'Human Development Index' },
  { page: 'Global_Innovation_Index', name: 'Global Innovation Index' },
  { page: 'Environmental_Performance_Index', name: 'Environmental Performance Index' },
  { page: 'Global_Terrorism_Index', name: 'Global Terrorism Index' },
  { page: 'World_Tourism_rankings', name: 'World Tourism Rankings' },
  { page: 'World_Press_Freedom_Index', name: 'World Press Freedom Index' },
  { page: 'Global_Gender_Gap_Report', name: 'Global Gender Gap Index' },
  { page: 'Social_Progress_Index', name: 'Social Progress Index' },
  { page: 'World_Competitiveness_Ranking', name: 'IMD World Competitiveness' },
  { page: 'Henley_Passport_Index', name: 'Henley Passport Index' }
];

function makeRankingQuestion(index, rank, seq) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var id = 'rank_' + pad(seq);

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia - ' + index.name,
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'India Rankings',
    emoji: '\uD83C\uDFC6',
    question: 'India\'s rank in the ' + index.name + ' as of ' + monthLabel + ' is _____.',
    answer: rank,
    hint: '',
    fact: 'India ranks ' + rank + ' in the ' + index.name + '. This is an important global index for competitive exams.'
  };
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
  if (!existing[CA_KEY].subSubjects['India Rankings']) existing[CA_KEY].subSubjects['India Rankings'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['India Rankings'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['India Rankings'].length + 1;

  for (var ri = 0; ri < RANKINGS.length; ri++) {
    var idx = RANKINGS[ri];
    console.error('Fetching ' + idx.name + '...');
    var html;
    try {
      html = await fetchPageContent(idx.page);
    } catch (e) {
      console.error('  Error: ' + e.message);
      await delay(200);
      continue;
    }
    await delay(800);

    var rank = findIndiaRankInTable(html);
    if (!rank) rank = findIndiaRank(html);

    if (rank) {
      console.error('  India rank: ' + rank);
      var q = makeRankingQuestion(idx, rank, seq);
      if (q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
        }
      }
    } else {
      console.error('  Rank not found');
    }
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['India Rankings'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['India Rankings'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('India Rankings: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'GlobalRankings/3.0' } }, function(res) {
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
    if (retries > 0 && (err.message.indexOf('429') >= 0)) {
      console.error('  429, retrying after 3s... (' + retries + ' left)');
      return delay(3000).then(function() { return fetchJSONWithRetry(url, retries - 1); });
    }
    throw err;
  });
}

function stripHtml(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }
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
    if (!rows || rows.length < 2) continue;

    // Identify a "rank" column from the header row if present.
    var rankCol = -1;
    var headerCells = rows[0].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
    if (headerCells) {
      for (var hci = 0; hci < headerCells.length; hci++) {
        var hText = stripHtml(headerCells[hci]).replace(/\s+/g, ' ').trim().toLowerCase();
        if (hText.indexOf('rank') >= 0 || hText === 'pos') { rankCol = hci; break; }
      }
    }

    for (var ri = 1; ri < rows.length; ri++) {
      var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
      if (!cells || cells.length < 2) continue;

      var indiaRow = false;
      for (var ci = 0; ci < cells.length; ci++) {
        var cellText = stripHtml(cells[ci]).replace(/\s+/g, ' ').trim();
        if (cellText.toLowerCase().indexOf('india') >= 0) { indiaRow = true; break; }
      }
      if (!indiaRow) continue;

      if (rankCol >= 0 && rankCol < cells.length) {
        var rankVal = stripHtml(cells[rankCol]).replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').trim();
        var numM = rankVal.match(/\b(\d+)\b/);
        if (numM) {
          var n = parseInt(numM[1]);
          if (n > 0 && n < 250) return '' + n;
        }
        continue;
      }

      // No rank column header: prefer the LAST numeric cell (rank usually last),
      // avoiding scores/years that appear earlier in the row.
      var candidates = [];
      for (var ci2 = 0; ci2 < cells.length; ci2++) {
        var val = stripHtml(cells[ci2]).replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').trim();
        var numM2 = val.match(/\b(\d+)\b/);
        if (numM2) {
          var n2 = parseInt(numM2[1]);
          if (n2 > 0 && n2 < 250) candidates.push(n2);
        }
      }
      if (candidates.length) return '' + candidates[candidates.length - 1];
    }
  }
  return '';
}

// Curated overrides for indexes where Wikipedia's own table is stale or the
// wikitable parsing returns a wrong cell (e.g. EPI's Rank 2024 col is 149, but
// the published EPI 2024 ranks India 176/180). Overrides take priority over
// the live Wikipedia table so the answer stays correct for competitive exams.
var RANK_OVERRIDES = {
  'Environmental Performance Index': {
    rank: '176',
    fact: 'India ranked 176th out of 180 countries in the Environmental Performance Index (EPI) 2024, scoring 27.6. Published by Yale & Columbia universities, EPI ranks countries on climate change, environmental health and ecosystem vitality. India slid from 155th (2014) to 176th (2024), weighed down by air quality and climate-policy metrics.'
  }
};

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
  { page: 'Global_Gender_Gap_Report', name: 'Global Gender Gap Index' },
  { page: 'Social_Progress_Index', name: 'Social Progress Index' },
  { page: 'World_Competitiveness_Ranking', name: 'IMD World Competitiveness' },
  { page: 'Henley_Passport_Index', name: 'Henley Passport Index' },
  { page: 'Global_peace_index', name: 'Global Peace Index' },
  { page: 'World_Justice_Project_Rule_of_Law_Index', name: 'World Justice Project Rule of Law Index' },
  { page: 'Network_Readiness_Index', name: 'Network Readiness Index' },
  { page: 'Sustainable_Development_Goals_Index', name: 'SDG Index' },
  { page: 'Global_Slavery_Index', name: 'Global Slavery Index' },
  { page: 'World_Press_Freedom_Index', name: 'World Press Freedom Index' },
  { page: 'Travel_and_Tourism_Competitiveness_Report', name: 'Travel & Tourism Competitiveness Index' },
  { page: 'Global_Retirement_Index', name: 'Global Retirement Index' },
  { page: 'Energy_Transition_Index', name: 'Energy Transition Index' },
  { page: 'Global_Financial_Centres_Index', name: 'Global Financial Centres Index' },
];

function makeRankingQuestions(index, rank, seq, fact) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var results = [];

  results.push({
    id: 'rank_' + pad(seq),
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: '' + index.name,
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'India Rankings',
    emoji: '\uD83C\uDFC6',
    question: 'India\'s rank in the ' + index.name + ' as of ' + monthLabel + ' is _____.',
    answer: rank,
    hint: '',
    fact: fact || ('India ranks ' + rank + ' in the ' + index.name + '. This is an important global index for competitive exams.')
  });

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

    // Curated override: use the published rank instead of the stale Wikipedia table.
    var override = RANK_OVERRIDES[idx.name];
    if (override) {
      var qsOverride = makeRankingQuestions(idx, override.rank, seq, override.fact);
      qsOverride.forEach(function(q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
        }
      });
      console.error('  India rank (curated override): ' + override.rank);
      await delay(200);
      continue;
    }

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
      var qs = makeRankingQuestions(idx, rank, seq);
      qs.forEach(function(q) {
        var key = eventKey(q);
        if (!existingKeys[key]) {
          newQuestions.push(q);
          existingKeys[key] = true;
          seq++;
        }
      });
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

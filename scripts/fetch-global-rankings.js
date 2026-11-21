var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'GlobalRankings/3.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(new Error('Request timeout')); });
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

// Curated overrides for indexes where Wikipedia's own table is stale, the
// wikitable parsing returns a wrong cell, or the table mixes editions (rank can
// come from an old column). Overrides take priority over the live Wikipedia
// table so answers stay correct for competitive exams. Values below are the
// latest published editions as of the site's current version.
var RANK_OVERRIDES = {
  'World Happiness Report': {
    rank: '116',
    fact: 'India ranked 116th out of 147 countries in the World Happiness Report 2026 (published March 2026 by Oxford\'s Wellbeing Research Centre with Gallup and the UN SDSN), up two places from 118th in 2025, scoring 4.536. Finland topped the list for a record ninth year; Afghanistan (147th) ranked last.'
  },
  'Global Hunger Index': {
    rank: '102',
    fact: 'India ranked 102nd out of 123 countries in the Global Hunger Index (GHI) 2025, with a score of 25.8 (serious hunger category). Published annually by Concern Worldwide and Welthungerhilfe.'
  },
  'Corruption Perceptions Index': {
    rank: '91',
    fact: 'India ranked 91st out of 182 countries in the Corruption Perceptions Index (CPI) 2025 published by Transparency International, scoring 39/100 (up from 38 in 2024; rank up from 96th). Denmark topped the index with 89; Somalia and South Sudan ranked last (9).'
  },
  'Ease of Doing Business': {
    rank: '63',
    fact: 'In the World Bank Ease of Doing Business Index (last edition 2020, since discontinued), India ranked 63rd out of 190 economies. India rose steadily from 142nd (2014) to 63rd (2019/2020) before the index was retired.'
  },
  'Press Freedom Index': {
    rank: '157',
    fact: 'India ranked 157th out of 180 countries in the RSF World Press Freedom Index 2025 edition used by this index, score 32.96. Norway topped the list; North Korea ranked last.'
  },
  'World Press Freedom Index': {
    rank: '157',
    fact: 'India ranked 157th out of 180 countries in the RSF (Reporters Without Borders) World Press Freedom Index 2026, released 30 April 2026, dropping six places from 151st in 2025, with a score of 31.96. Norway topped the index; Eritrea ranked last.'
  },
  'World Tourism Rankings': {
    rank: '7',
    fact: 'India ranked about 7th in the world by international tourist arrivals in the UN Tourism (UNWTO) 2024-25 data (roughly 18 million arrivals). By tourism receipts India ranked around 9th (about USD 30 billion).'
  },
  'Global Gender Gap Index': {
    rank: '131',
    fact: 'India ranked 131st out of 148 economies in the World Economic Forum Global Gender Gap Report 2025, with a parity score of 64.1%, slipping two places from 129th in 2024. Iceland led the index; Pakistan (148th) ranked last.'
  },
  'Global Retirement Index': {
    rank: '43',
    fact: 'India ranked last (43rd) among the 44 countries in the Natixis Global Retirement Index (GRI) 2025, which covers OECD members, IMF advanced economies and BRIC countries. Norway, Ireland and Switzerland topped the 2025 edition.'
  },
  'Global Innovation Index': {
    rank: '38',
    fact: 'India ranked 38th out of 139 economies in the Global Innovation Index (GII) 2025 published by WIPO, advancing one place from 39th in 2024. India leads Central and Southern Asia and is the top lower-middle-income economy.'
  },
  'Global Terrorism Index': {
    rank: '14',
    fact: 'India ranked 14th out of 163 countries in the Global Terrorism Index (GTI) 2025, published by the Institute for Economics & Peace (IEP), with a score of 6.411 (unchanged from 2024). Burkina Faso topped the index; only a handful of countries scored worse for terrorism impact.'
  },
  'Henley Passport Index': {
    rank: '81',
    fact: 'India ranked 81st in the Henley Passport Index (July 2026 edition, published 21 July 2026), with visa-free access to 55 destinations, dropping from 75th in February 2026. The ranking is by Henley & Partners.'
  },
  'Environmental Performance Index': {
    rank: '176',
    fact: 'India ranked 176th out of 180 countries in the Environmental Performance Index (EPI) 2024, scoring 27.6. Published by Yale & Columbia universities, EPI ranks countries on climate change, environmental health and ecosystem vitality. India slid from 155th (2014) to 176th (2024), weighed down by air quality and climate-policy metrics.'
  },
  'Global Competitiveness Index': {
    rank: '68',
    fact: 'India ranked 68th out of 141 economies in the World Economic Forum Global Competitiveness Report 2019 (the final edition, as the index has since been discontinued). India scored 61.4 (1-100 scale), ranked 8th among BRICS nations after China (28th). The WEF TRindex was retired after the 2019 edition and replaced by other measures.'
  },
  'Democracy Index': {
    rank: '47',
    fact: 'India ranked 47th out of 167 countries in the EIU Democracy Index 2025 (published by the Economist Intelligence Unit), with a score of 6.96 (a "flawed democracy"), dropping six places from 41st in 2024. Norway topped the index; North Korea ranked last. India was the only major democracy to fall sharply among its peers on civil liberties and the functioning of government.'
  },
  'Human Development Index': {
    rank: '130',
    fact: 'India ranked 130th out of 193 countries in the UNDP Human Development Report 2025 (released in May 2025), with an HDI value of 0.685 (2023 data), placing India in the medium human development category. India rose three places from 133rd in 2022, helped by renewed growth in life expectancy, schooling and per-capita income. Iceland topped the index.'
  },
  'Social Progress Index': {
    rank: '109',
    fact: 'India ranked 109th out of 171 countries in the Social Progress Index 2026 published by the Social Progress Imperative, improving one place from 110th in 2025. India ranks above its income level on Shelter and basic needs but lags on environmental quality, inclusiveness and personal rights. Norway topped the 2026 index.'
  },
  'IMD World Competitiveness': {
    rank: '41',
    fact: 'India ranked 41st out of 69 economies in the IMD World Competitiveness Ranking 2025, slipping two places from 39th in 2024. Switzerland retained the top slot with 100 points, followed by Singapore and Hong Kong. India maintained strong economic performance but was weighed down by infrastructure and government-efficiency weaknesses.'
  },
  'Global Peace Index': {
    rank: '127',
    fact: 'India ranked 127th out of 163 countries in the Global Peace Index (GPI) 2026 published by the Institute for Economics & Peace (IEP), dropping 12 places from 115th in 2025 amid a less peaceful global trend. Iceland remained the most peaceful country; India is rated a "low" peace category. The 2026 edition was released around June 2026.'
  },
  'World Justice Project Rule of Law Index': {
    rank: '86',
    fact: 'India ranked 86th out of 143 countries in the WJP Rule of Law Index 2025, falling six places from 2024 position with an overall score of 0.49. The index published by the World Justice Project. Regionally India ranked 3rd of 6 South Asian nations. Denmark topped the 2025 index, followed by Norway.'
  },
  'Network Readiness Index': {
    rank: '45',
    fact: 'India ranked 45th out of 127 economies in the Network Readiness Index (NRI) 2025, improving four places with a score of 54.43 (up from 53.63 in 2024). The index, published by the Portulans Institute, ranks network readiness in the Applications of ICT. India climbed to 1st globally in annual investment in telecom services, AI publications, ICT exports and e-commerce legislation.'
  },
  'SDG Index': {
    rank: '94',
    fact: 'India ranked 94th out of 167 countries in the UN Sustainable Development Goals (SDG) Index 2026, with a score of 68.3 out of 100, according to the Sustainable Development Report 2026 released by the UN Sustainable Development Solutions Network (SDSN). This was India\'s highest ever rank, up from 99th in 2025 and 112th in 2015. Finland topped the 2026 index.'
  },
  'Global Slavery Index': {
    rank: '55',
    fact: 'India ranked 55th out of 160 countries in the Global Slavery Index (2025 data, published by the Walk Free / Minderoo Foundation), with an estimated prevalence of 8.0 per 1,000 people, about 11 million people in modern slavery. India sits in the middle of the global ranking; Eritrea and North Korea recorded the highest prevalence.'
  },
  'Travel & Tourism Competitiveness Index': {
    rank: '39',
    fact: 'India ranked 39th out of 119 economies in the World Economic Forum Travel & Tourism Development Index (TTDI) 2024 (successor to the Tourism Competitiveness Index), with a score of 4.25, up from 54th in 2021 (adjusted to 38th after WEF revised its methodology). India is the highest-ranked South Asian and lower-middle-income economy; the US topped the index.'
  },
  'Global Financial Centres Index': {
    rank: '43',
    fact: 'In the Global Financial Centres Index (GFCI 38, September 2025) compiled by Z/Yen and the China Development Institute, India\'s GIFT City (Gandhinagar) ranked 43rd out of 156 financial centres, up from 46th in GFCI 37, the only Indian centre to feature among the top 15 in the Asia-Pacific. India\'s other centres ranked: Mumbai 46th and New Delhi 54th. New York and London topped the index.'
  }
};

var RANKINGS = [
  { page: 'World_Happiness_Report', name: 'World Happiness Report' },
  { page: 'Global_Hunger_Index', name: 'Global Hunger Index' },
  { page: 'Corruption_Perceptions_Index', name: 'Corruption Perceptions Index' },
  { page: 'Global_Competitiveness_Report', name: 'Global Competitiveness Index' },
  { page: 'Ease_of_doing_business_index', name: 'Ease of Doing Business' },
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
  // Only publish a question when we have a rich, curated fact. Without one the
  // generic "...an important global index..." one-liner adds no exam value, so
  // the index is skipped rather than surfaced with a stub explanation.
  if (!fact || !fact.trim()) return [];
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
    fact: fact
  });

  return results;
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function rankIndexName(q) {
  var m = (q.question || '').match(/in the (.+?) as of/);
  return m ? m[1].trim() : null;
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

  // One question per index: update in place (keep its id) so monthly runs never
  // append a second "as of <month>" question for the same index, and ids never
  // collide between months. Stale month-duplicates are dropped below.
  var list = existing[CA_KEY].subSubjects['India Rankings'];
  var byIndex = {};
  var maxSeq = 0;
  list.forEach(function(q) {
    var n = rankIndexName(q);
    if (n) byIndex[n] = q;
    var m = (q.id || '').match(/^rank_(\d+)/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  });

  var updated = 0;
  var added = 0;

  for (var ri = 0; ri < RANKINGS.length; ri++) {
    var idx = RANKINGS[ri];
    console.error('Fetching ' + idx.name + '...');

    // Curated override: use the published rank instead of the stale Wikipedia table.
    var rank = null;
    var fact = null;
    var override = RANK_OVERRIDES[idx.name];
    if (override) {
      rank = override.rank;
      fact = override.fact;
      console.error('  India rank (curated override): ' + rank);
      await delay(200);
    } else {
      var html;
      try {
        html = await fetchPageContent(idx.page);
      } catch (e) {
        console.error('  Error: ' + e.message);
        await delay(200);
        continue;
      }
      await delay(800);

      rank = findIndiaRankInTable(html);
      if (!rank) rank = findIndiaRank(html);
      console.error(rank ? '  India rank: ' + rank : '  Rank not found');
    }

    if (!rank) continue;

    // Skip indexes without a curated, rich fact — a stub one-liner adds no
    // exam value (see makeRankingQuestions).
    if (!fact || !fact.trim()) {
      console.error('  Skipping ' + idx.name + ' (no curated fact)');
      continue;
    }

    var existingQ = byIndex[idx.name];
    if (existingQ) {
      var qFresh = makeRankingQuestions(idx, rank, maxSeq || 1, fact)[0];
      if (existingQ.answer !== qFresh.answer || existingQ.question !== qFresh.question || existingQ.fact !== qFresh.fact || existingQ.pubDate !== qFresh.pubDate) {
        existingQ.answer = qFresh.answer;
        existingQ.question = qFresh.question;
        existingQ.fact = qFresh.fact;
        existingQ.pubDate = qFresh.pubDate;
        updated++;
      }
    } else {
      maxSeq++;
      var qNew = makeRankingQuestions(idx, rank, maxSeq, fact)[0];
      list.push(qNew);
      byIndex[idx.name] = qNew;
      added++;
    }
  }

  // Drop stale month-duplicates that accumulated from earlier append-only runs.
  var deduped = [];
  var seenIndex = {};
  list.forEach(function(q) {
    var n = rankIndexName(q);
    if (!n) { deduped.push(q); return; }
    if (!seenIndex[n]) { seenIndex[n] = true; deduped.push(q); }
  });
  list.length = 0;
  Array.prototype.push.apply(list, deduped);

  var total = list.length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');

  // The live site reads current-affairs.json (via quiz.json rebuild + category
  // split), not pib-archive.json. Mirror the same cleaned India Rankings list
  // there so verified answers never go stale if the pipeline ordering changes.
  var liveCA = {};
  if (fs.existsSync(CA_PATH)) {
    try { liveCA = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); }
    catch (e) { console.error('Error reading current-affairs.json: ' + e.message); }
  }
  if (!liveCA[CA_KEY]) liveCA[CA_KEY] = { subSubjects: {} };
  if (!liveCA[CA_KEY].subSubjects['India Rankings']) liveCA[CA_KEY].subSubjects['India Rankings'] = [];
  var liveList = liveCA[CA_KEY].subSubjects['India Rankings'];
  var liveByIndex = {};
  liveList.forEach(function(q) {
    var n = rankIndexName(q);
    if (n) liveByIndex[n] = q;
  });
  // Sync: upsert by index name, keep existing ids where possible to avoid id churn.
  list.forEach(function(q) {
    var idxName = q.source;
    var m = (q.question || '').match(/in the (.+?) as of/);
    if (m) idxName = m[1].trim();
    if (liveByIndex[idxName]) {
      var old = liveByIndex[idxName];
      old.answer = q.answer;
      old.fact = q.fact;
      old.pubDate = q.pubDate;
      liveByIndex[idxName] = old;
    } else {
      if (!liveByIndex[idxName]) {
        liveList.push(q);
        liveByIndex[idxName] = q;
      }
    }
  });
  var liveTotal = liveList.length;
  fs.writeFileSync(CA_PATH, JSON.stringify(liveCA, null, 2), 'utf8');
  console.error('India Rankings: ' + total + ' total (pib-archive), ' + liveTotal + ' total (current-affairs), ' + added + ' new, ' + updated + ' updated');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

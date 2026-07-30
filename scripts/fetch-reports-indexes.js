var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ReportsBot/2.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
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

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = subSubject === 'Reports & Indexes' ? 'rpt' : 'glo';
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
    if (th && td) { var label = strip(th[1]); var value = strip(td[1]); if (label && value && label.length > 2) data[label] = value; }
  }
  return data;
}

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Reports & Indexes']) existing[CA_KEY].subSubjects['Reports & Indexes'] = [];
  if (!existing[CA_KEY].subSubjects['Global Rankings']) existing[CA_KEY].subSubjects['Global Rankings'] = [];

  var ek = { r: {}, g: {} };
  existing[CA_KEY].subSubjects['Reports & Indexes'].forEach(function(q) { ek.r[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Global Rankings'].forEach(function(q) { ek.g[eventKey(q)] = true; });
  var seq = { r: existing[CA_KEY].subSubjects['Reports & Indexes'].length + 1, g: existing[CA_KEY].subSubjects['Global Rankings'].length + 1 };
  var nq = { r: [], g: [] };

  process.stdout.write('  Reports & Indexes... ');
  var INDEX_PAGES = [
    { page: 'India', name: 'Human Development Index', grp: 'r', rankIdx: 0, nameIdx: 0, scoreIdx: 1, useInfobox: true, infoboxKey: 'HDI' },
    { page: 'Global_Hunger_Index', name: 'Global Hunger Index', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'Corruption_Perceptions_Index', name: 'Corruption Perceptions Index', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'Global_Peace_Index', name: 'Global Peace Index', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'Ease_of_doing_business_index', name: 'Ease of Doing Business Index', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'World_Happiness_Report', name: 'World Happiness Report', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'Global_Terrorism_Index', name: 'Global Terrorism Index', grp: 'r', rankIdx: 0, nameIdx: 1, scoreIdx: 2 },
    { page: 'World_Press_Freedom_Index', name: 'Press Freedom Index', grp: 'r', rankIdx: 1, nameIdx: 0, scoreIdx: 1 }
  ];
  var rCount = 0;
  for (var pi = 0; pi < INDEX_PAGES.length; pi++) {
    try {
      var html = await fetchPageText(INDEX_PAGES[pi].page);
      var info = extractInfobox(html);
      var foundInTable = null;
      var indiaTextMatch = null;
      // For useInfobox pages, skip table/text search — rely on infobox only
      if (!INDEX_PAGES[pi].useInfobox) {
        var txt = strip(html);
        indiaTextMatch = txt.match(/India\s+(\d+)(?:st|nd|rd|th)?/i) || txt.match(/India\s+.*?(?:ranked?|scores?)\s+(\d+)/i);
        var tables = html.match(/<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || [];
        for (var ti = 0; ti < tables.length && !foundInTable; ti++) {
          var rows = tables[ti].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
          for (var ri = 1; ri < rows.length; ri++) {
            var rtxt = strip(rows[ri]);
            if (rtxt.toLowerCase().indexOf('india') < 0) continue;
            var allCells = rows[ri].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
            var cellTexts = allCells.map(function(c) { return strip(c); });
            var rankC = cellTexts.length > INDEX_PAGES[pi].rankIdx ? cellTexts[INDEX_PAGES[pi].rankIdx] : '';
            var nameC = cellTexts.length > INDEX_PAGES[pi].nameIdx ? cellTexts[INDEX_PAGES[pi].nameIdx] : '';
            var scoreC = '';
            if (INDEX_PAGES[pi].scoreIdx >= 0 && cellTexts.length > INDEX_PAGES[pi].scoreIdx) scoreC = cellTexts[INDEX_PAGES[pi].scoreIdx];
            if (rankC.length >= 1 && nameC.toLowerCase().indexOf('india') >= 0) {
              var rankNum = rankC.match(/\d+/);
              var rankText = rankNum ? rankNum[0] : rankC;
              var scoreText = scoreC || '';
              var val = 'Rank ' + rankText;
              if (scoreText && scoreText.match(/[\d.]+/)) val += ' | Score: ' + scoreText;
              foundInTable = val;
              break;
            }
          }
        }
      }
      var resultText = foundInTable || (indiaTextMatch ? indiaTextMatch[1] : null);
      if (!resultText && INDEX_PAGES[pi].useInfobox && INDEX_PAGES[pi].infoboxKey) {
        var iInfo = INDEX_PAGES[pi];
        Object.keys(info).forEach(function(k) {
          if (k.match(new RegExp(iInfo.infoboxKey, 'i')) && info[k].length > 2) {
            resultText = info[k];
          }
        });
      }
      if (resultText) {
        var q = makeQuestion('What is India\'s rank in the ' + INDEX_PAGES[pi].name + '?', resultText, 'Reports & Indexes', seq.r++, 'General Knowledge', '\uD83D\uDCCA', INDEX_PAGES[pi].name + ' rank: ' + resultText + '.');
        if (q && !ek.r[eventKey(q)]) { nq.r.push(q); ek.r[eventKey(q)] = true; rCount++; }
      }
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(rCount + ' items\n');

  // ── Global Rankings (country comparisons) ──
  process.stdout.write('  Global Rankings... ');
  var RANK_PAGES = [
    { page: 'List_of_countries_by_GDP_(nominal)', name: 'GDP', rankCol: 0, nameCol: 1, valCol: 2 },
    { page: 'List_of_countries_by_population_(United_Nations)', name: 'population', rankCol: 0, nameCol: 1, valCol: 2 },
    { page: 'List_of_countries_by_military_expenditures', name: 'military expenditure', rankCol: 0, nameCol: 1, valCol: 2 }
  ];
  var gCount = 0;
  for (var pi2 = 0; pi2 < RANK_PAGES.length; pi2++) {
    try {
      var html = await fetchPageText(RANK_PAGES[pi2].page);
      var tables = html.match(/<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
      if (tables) {
        tables.forEach(function(tbl) {
          var rows = tbl.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          if (!rows || rows.length < 2) return;
          for (var ri = 1; ri < rows.length && ri < 15; ri++) {
            var cells = rows[ri].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
            if (!cells || cells.length < 2) continue;
            var rp = RANK_PAGES[pi2];
            var country = strip(rows[ri].match(/<a[^>]*>([\s\S]*?)<\/a>/i) ? rows[ri].match(/<a[^>]*>([\s\S]*?)<\/a>/i)[1] : strip(cells[rp.nameCol] || cells[1] || cells[0]));
            var rank = strip(cells[rp.rankCol] || cells[0]);
            var value = strip(cells[rp.valCol] || cells[cells.length > 2 ? 2 : 1]);
            var countryIsNumber = !country.match(/[a-zA-Z]/) && country.match(/[\d,]+/);
            if (country && country.length > 2 && value && value.match(/[\d,]+/) && country !== 'Country' && country !== 'Country/territory' && !countryIsNumber) {
              var isWorld = country.indexOf('World') >= 0;
              var qText = isWorld ? ('What is the total global ' + rp.name + '?') : ('What is the ' + rp.name + ' of ' + country + '?');
              var q = makeQuestion(qText, value, 'Global Rankings', seq.g++, '' + rp.page, '\uD83C\uDF10', country + ' ' + rp.name + ': ' + value + (rank && rank.match(/^\d+$/) ? ' (rank ' + rank + ')' : '') + '.');
              if (q && !ek.g[eventKey(q)]) { nq.g.push(q); ek.g[eventKey(q)] = true; gCount++; }
            }
          }
        });
      }
    } catch (e) {}
    await delay(350);
  }

  nq.r.forEach(function(q) { existing[CA_KEY].subSubjects['Reports & Indexes'].push(q); });
  nq.g.forEach(function(q) { existing[CA_KEY].subSubjects['Global Rankings'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Reports: ' + existing[CA_KEY].subSubjects['Reports & Indexes'].length + ' total, ' + nq.r.length + ' new');
  console.error('Global Rankings: ' + existing[CA_KEY].subSubjects['Global Rankings'].length + ' total, ' + nq.g.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});


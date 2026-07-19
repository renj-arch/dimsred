var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'RBIDataFill/2.0' } }, function(res) {
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
function extractFirstNumber(str) { var m = str.match(/(\d+\.?\d*)/); return m ? m[1] : ''; }

function fetchPageContent(title) {
  var url = API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json';
  return fetchJSON(url).then(function(data) {
    if (data && data.parse && data.parse.text) return data.parse.text['*'] || '';
    return '';
  });
}

function parseRatesTable(html) {
  var result = { repoRate: '', reverseRepoRate: '', crr: '', slr: '', gdpForecast: '' };
  var tableMatch = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  var rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return result;

  rows.forEach(function(r) {
    var cells = r.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
    if (!cells || cells.length < 2) return;
    var label = stripHtml(cells[0]).replace(/\s+/g, ' ').toLowerCase().trim();
    var value = stripHtml(cells[1]).replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').trim();
    if (label.indexOf('repo rate') >= 0 && label.indexOf('reverse') === -1) result.repoRate = extractFirstNumber(value);
    else if (label.indexOf('reverse repo') >= 0) result.reverseRepoRate = extractFirstNumber(value);
    else if (label.indexOf('crr') >= 0 || label.indexOf('cash reserve') >= 0) result.crr = extractFirstNumber(value);
    else if (label.indexOf('slr') >= 0 || label.indexOf('statutory liquidity') >= 0) result.slr = extractFirstNumber(value);
    else if (label.indexOf('gdp') >= 0 || label.indexOf('growth') >= 0) result.gdpForecast = extractFirstNumber(value);
  });

  return result;
}

function makeRbiQuestions(data, seq) {
  var now = new Date();
  var monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var qs = [];
  var idBase = 'rbi_' + now.getFullYear() + '_' + pad(now.getMonth() + 1);

  if (data.repoRate && /^\d/.test(data.repoRate)) {
    qs.push({
      id: idBase + '_repo',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - RBI Monetary Policy',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83C\uDFE6',
      question: 'The current repo rate in India as of ' + monthLabel + ' is _____%.',
      answer: data.repoRate,
      hint: '',
      fact: 'Repo rate is the rate at which RBI lends short-term funds to commercial banks. Current repo rate: ' + data.repoRate + '%. It is the key policy rate used by the Monetary Policy Committee (MPC) to control inflation and stimulate growth.'
    });
  }

  if (data.reverseRepoRate && /^\d/.test(data.reverseRepoRate)) {
    qs.push({
      id: idBase + '_rrr',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - RBI Monetary Policy',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83C\uDFE6',
      question: 'The current reverse repo rate in India as of ' + monthLabel + ' is _____%.',
      answer: data.reverseRepoRate,
      hint: '',
      fact: 'Reverse repo rate is the rate at which RBI borrows from commercial banks. Current reverse repo rate: ' + data.reverseRepoRate + '%. It is always lower than the repo rate.'
    });
  }

  if (data.crr && /^\d/.test(data.crr)) {
    qs.push({
      id: idBase + '_crr',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - RBI Monetary Policy',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83C\uDFE6',
      question: 'The current Cash Reserve Ratio (CRR) in India as of ' + monthLabel + ' is _____%.',
      answer: data.crr,
      hint: '',
      fact: 'CRR is the portion of deposits that banks must keep with RBI. Current CRR: ' + data.crr + '%. It is used by RBI to control money supply in the economy.'
    });
  }

  if (data.slr && /^\d/.test(data.slr)) {
    qs.push({
      id: idBase + '_slr',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - RBI Monetary Policy',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83C\uDFE6',
      question: 'The current Statutory Liquidity Ratio (SLR) in India as of ' + monthLabel + ' is _____%.',
      answer: data.slr,
      hint: '',
      fact: 'SLR is the portion of deposits that banks must invest in government-approved securities. Current SLR: ' + data.slr + '%.'
    });
  }

  if (data.gdpGrowth && /^\d/.test(data.gdpGrowth) && data.gdpGrowth !== 'N/A') {
    qs.push({
      id: idBase + '_gdp',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - Economy of India',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83D\uDCC8',
      question: 'India\'s GDP growth rate as of ' + monthLabel + ' is _____%.',
      answer: data.gdpGrowth,
      hint: '',
      fact: 'India\'s GDP growth rate: ' + data.gdpGrowth + '%. India is one of the fastest-growing major economies in the world.'
    });
  }

  if (data.gdpForecast && /^\d/.test(data.gdpForecast) && data.gdpForecast !== 'N/A') {
    qs.push({
      id: idBase + '_gdpf',
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia - RBI Monetary Policy',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'RBI & Banking',
      emoji: '\uD83D\uDCC8',
      question: 'India\'s GDP growth forecast for the current fiscal year as of ' + monthLabel + ' is _____%.',
      answer: data.gdpForecast,
      hint: '',
      fact: 'RBI projects India\'s GDP growth at ' + data.gdpForecast + '% for the current fiscal year.'
    });
  }

  return qs;
}

function eventKey(q) {
  return (q.question || '').substring(0, 60) + '|' + (q.answer || '');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) {
      console.error('Error reading pib-archive.json, starting fresh: ' + e.message);
    }
  }

  var PIB_KEY = 'PIB Releases';
  if (!existing[PIB_KEY]) existing[PIB_KEY] = { subSubjects: {} };
  if (!existing[PIB_KEY].subSubjects['RBI & Banking']) existing[PIB_KEY].subSubjects['RBI & Banking'] = [];

  var existingKeys = {};
  existing[PIB_KEY].subSubjects['RBI & Banking'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var html = await fetchPageContent('Monetary_policy_of_India');
  await delay(300);
  var rates = parseRatesTable(html);
  console.error('Rates fetched: repo=' + rates.repoRate + ' rrr=' + rates.reverseRepoRate + ' crr=' + rates.crr + ' slr=' + rates.slr + ' gdp_forecast=' + rates.gdpForecast);

  var gdpHtml = await fetchPageContent('Economy_of_India');
  var gdpGrowth = '';
  var gdpMatch = gdpHtml.match(/GDP\s*growth[^<]*<td[^>]*>([^<]+)/i);
  if (gdpMatch) gdpGrowth = extractFirstNumber(gdpMatch[1].replace(/%/g, ''));
  console.error('GDP growth: ' + gdpGrowth);

  var data = {
    repoRate: rates.repoRate,
    reverseRepoRate: rates.reverseRepoRate,
    crr: rates.crr,
    slr: rates.slr,
    gdpForecast: rates.gdpForecast,
    gdpGrowth: gdpGrowth
  };

  var newQuestions = makeRbiQuestions(data, 1);
  var added = 0;
  newQuestions.forEach(function(q) {
    var key = eventKey(q);
    if (!existingKeys[key]) {
      existing[PIB_KEY].subSubjects['RBI & Banking'].push(q);
      existingKeys[key] = true;
      added++;
    }
  });

  var total = existing[PIB_KEY].subSubjects['RBI & Banking'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Wrote ' + PIB_PATH + ' - RBI & Banking: ' + total + ' total questions, ' + added + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

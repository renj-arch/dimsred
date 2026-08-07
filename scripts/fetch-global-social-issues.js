var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'GlobalBot/2.0' } }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) { var wait = Math.pow(2, 4 - retries) * 3000; return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait); }
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

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date(); var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = { 'Disasters': 'dis', 'Water Resources': 'wat', 'Poverty & Unemployment': 'pov', 'Tourism': 'tou', 'Global Conflicts': 'con', 'Human Rights': 'hum', 'Census': 'cen' }[subSubject] || 'gsi';
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
  var tables = []; var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m; while ((m = tRegex.exec(html)) !== null) {
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
  console.error('Read existing');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Disasters', 'Water Resources', 'Poverty & Unemployment', 'Tourism', 'Global Conflicts', 'Human Rights', 'Census'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}, seq = {};
  ['Disasters', 'Water Resources', 'Poverty & Unemployment', 'Tourism', 'Global Conflicts', 'Human Rights', 'Census'].forEach(function(s) { ek[s] = {}; existing[CA_KEY].subSubjects[s].forEach(function(q) { ek[s][eventKey(q)] = true; }); seq[s] = existing[CA_KEY].subSubjects[s].length + 1; });
  var nq = {};

  function textFallback(html, ret, patterns, subj, emoji) {
    return 0;
    var txt = strip(html);
    var matches = [];
    patterns.forEach(function(p) {
      var m = txt.match(p);
      if (m) matches.push(m[0]);
    });
    var cf = 0;
    matches.forEach(function(lead) {
      var numM = lead.match(/(\d+[\d,.]*\s*(?:million|billion|crore|lakh|thousand|km|sq)?)/);
      if (numM && numM[0].length > 2) {
        var q = makeQuestion('What statistic is: ' + lead.substring(0,50).trim() + '?', numM[0].trim(), subj, seq[subj]++, 'General Knowledge', emoji, lead + '.');
        if (q && !ek[subj][eventKey(q)]) { if (!nq[subj]) nq[subj] = []; nq[subj].push(q); ek[subj][eventKey(q)] = true; cf++; }
      }
    });
    return cf;
  }

  // ── Disasters: List of natural disasters in India ──
  process.stdout.write('  Disasters... ');
  try {
    var html = await fetchPageText('List_of_natural_disasters_in_India');
    var tables = extractWikiTables(html); var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 12; ri++) {
        var row = t[ri]; if (row.length < 2) continue;
        var event = strip(row[0] || ''); var year = strip(row.length > 1 ? row[1] : ''); var deaths = strip(row.length > 2 ? row[2] : '');
        if (event.length > 3 && event.indexOf('Event') < 0 && deaths.match(/[\d,]+/)) {
          var q = makeQuestion('How many deaths occurred in the ' + event + ' disaster?', deaths, 'Disasters', seq['Disasters']++, 'Natural disasters in India', '\uD83C\uDF2B', event + ' (' + year + '): ' + deaths + ' deaths.');
          if (q && !ek['Disasters'][eventKey(q)]) { if (!nq['Disasters']) nq['Disasters'] = []; nq['Disasters'].push(q); ek['Disasters'][eventKey(q)] = true; count++; }
        }
      }
    });
    if (count === 0) count += textFallback(html, 0, [/(?:disaster|flood|cyclone|earthquake)\s+[^.]*(?:\d+[\d,.]*\s*(?:people|lakh|crore|km|deaths))[^.]*\./gi], 'Disasters', '\uD83C\uDF2B');
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Water Resources ──
  process.stdout.write('  Water Resources... ');
  try {
    var html = await fetchPageText('Water_resources_in_India');
    var info = extractInfobox(html); var count = 0;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(water|river|dam|basin|irrigation|capacity)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of water resources in India?', info[k], 'Water Resources', seq['Water Resources']++, 'Water resources in India', '\uD83D\uDCA7', 'Water resources: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Water Resources'][eventKey(q)]) { if (!nq['Water Resources']) nq['Water Resources'] = []; nq['Water Resources'].push(q); ek['Water Resources'][eventKey(q)] = true; count++; }
      }
    });
    if (count === 0) count += textFallback(html, 0, [/(?:water|river|dam|irrigation|groundwater)\s+[^.]*(?:\d+[\d,.]*\s*(?:km|cubic|million|billion|percent|%))[^.]*\./gi], 'Water Resources', '\uD83D\uDCA7');
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Poverty & Unemployment ──
  process.stdout.write('  Poverty & Unemployment... ');
  try {
    var html = await fetchPageText('Poverty_in_India');
    var info = extractInfobox(html); var count = 0;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(poverty|below|line|rate|population|percentage)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of poverty in India?', info[k], 'Poverty & Unemployment', seq['Poverty & Unemployment']++, 'Poverty in India', '\uD83D\uDCB5', 'Poverty: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Poverty & Unemployment'][eventKey(q)]) { if (!nq['Poverty & Unemployment']) nq['Poverty & Unemployment'] = []; nq['Poverty & Unemployment'].push(q); ek['Poverty & Unemployment'][eventKey(q)] = true; count++; }
      }
    });
    if (count === 0) count += textFallback(html, 0, [/(?:poverty|unemployment|below\s+poverty|BPL)\s+[^.]*(?:\d+[\d,.]*\s*(?:percent|%|million|crore|lakh))[^.]*\./gi], 'Poverty & Unemployment', '\uD83D\uDCB5');
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Tourism ──
  process.stdout.write('  Tourism... ');
  try {
    var html = await fetchPageText('Tourism_in_India');
    var info = extractInfobox(html); var count = 0;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(arrival|visitor|revenue|contribution|GDP|rank)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of tourism in India?', info[k], 'Tourism', seq['Tourism']++, 'Tourism in India', '\u2708\uFE0F', 'Tourism: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Tourism'][eventKey(q)]) { if (!nq['Tourism']) nq['Tourism'] = []; nq['Tourism'].push(q); ek['Tourism'][eventKey(q)] = true; count++; }
      }
    });
    if (count === 0) count += textFallback(html, 0, [/(?:tourist|visitor|arrival|travel|tourism)\s+[^.]*(?:\d+[\d,.]*\s*(?:million|billion|crore|lakh|percent|%))[^.]*\./gi], 'Tourism', '\u2708\uFE0F');
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Global Conflicts (list of ongoing conflicts) ──
  process.stdout.write('  Global Conflicts... ');
  try {
    var html = await fetchPageText('List_of_ongoing_armed_conflicts');
    var tables = extractWikiTables(html); var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 10; ri++) {
        var row = t[ri]; if (row.length < 3) continue;
        var conflict = strip(row[0] || ''); var location = strip(row[1] || ''); var year = strip(row[2] || '');
        if (conflict.length > 3 && conflict.indexOf('Conflict') < 0 && location.length > 2) {
          var q = makeQuestion('Where is the ' + conflict + ' conflict taking place?', location, 'Global Conflicts', seq['Global Conflicts']++, 'Ongoing conflicts', '\uD83C\uDF0D', conflict + ' is ongoing in ' + location + (year ? ' (since ' + year + ')' : '') + '.');
          if (q && !ek['Global Conflicts'][eventKey(q)]) { if (!nq['Global Conflicts']) nq['Global Conflicts'] = []; nq['Global Conflicts'].push(q); ek['Global Conflicts'][eventKey(q)] = true; count++; }
        }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Human Rights ──
  process.stdout.write('  Human Rights... ');
  try {
    var html = await fetchPageText('National_Human_Rights_Commission_of_India');
    var info = extractInfobox(html); var count = 0;
    ['Chairperson', 'Formed', 'Headquarters'].forEach(function(k) {
      if (info[k] && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of NHRC?', info[k], 'Human Rights', seq['Human Rights']++, 'NHRC', '\uD83E\uDDD1\u200D\u2696\uFE0F', 'NHRC ' + k + ': ' + info[k] + '.');
        if (q && !ek['Human Rights'][eventKey(q)]) { if (!nq['Human Rights']) nq['Human Rights'] = []; nq['Human Rights'].push(q); ek['Human Rights'][eventKey(q)] = true; count++; }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Census ──
  process.stdout.write('  Census... ');
  try {
    var html = await fetchPageText('2011_census_of_India');
    var info = extractInfobox(html); var count = 0;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(population|density|sex ratio|literacy|growth)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' as per the 2011 Census of India?', info[k], 'Census', seq['Census']++, '2011 census', '\uD83D\uDCCA', '2011 Census: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Census'][eventKey(q)]) { if (!nq['Census']) nq['Census'] = []; nq['Census'].push(q); ek['Census'][eventKey(q)] = true; count++; }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  Object.keys(nq).forEach(function(cat) { (nq[cat] || []).forEach(function(q) { existing[CA_KEY].subSubjects[cat].push(q); }); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  ['Disasters', 'Water Resources', 'Poverty & Unemployment', 'Tourism', 'Global Conflicts', 'Human Rights', 'Census'].forEach(function(s) { console.error(s + ': ' + existing[CA_KEY].subSubjects[s].length + ' total'); });
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

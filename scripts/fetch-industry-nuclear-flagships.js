var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'IndustryBot/2.0' } }, function(res) {
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
  var prefix = { 'Coal Mining & Minerals': 'coa', 'Ports & Shipping': 'por', 'Nuclear & Defence Exports': 'nuc', 'Flagship Programmes': 'flg' }[subSubject] || 'ind';
  return { id: prefix + '_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
}

function eventKey(q) { var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); }; return n(q.question || '').substring(0, 80) + '|' + n(q.answer || ''); }

function fetchPageText(title) { return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) { if (d && d.parse && d.parse.text) return d.parse.text['*']; return ''; }); }

function categoryMembers(category) {
  return fetchJSON(API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=300&cmtype=page&format=json').then(function(d) {
    var out = [];
    if (d && d.query && d.query.categorymembers) {
      d.query.categorymembers.forEach(function(p) { if (p.title) out.push(p.title); });
    }
    return out;
  });
}

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
  ['Coal Mining & Minerals', 'Ports & Shipping', 'Nuclear & Defence Exports', 'Flagship Programmes'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}; Object.keys({ 'Coal Mining & Minerals': 1, 'Ports & Shipping': 1, 'Nuclear & Defence Exports': 1, 'Flagship Programmes': 1 }).forEach(function(k) { ek[k] = {}; });
  Object.keys(ek).forEach(function(s) { existing[CA_KEY].subSubjects[s].forEach(function(q) { ek[s][eventKey(q)] = true; }); });
  var seq = {}; Object.keys(ek).forEach(function(s) { seq[s] = existing[CA_KEY].subSubjects[s].length + 1; });
  var nq = {};

  // ── Coal Mining ──
  process.stdout.write('  Coal Mining & Minerals... ');
  try {
    var html = await fetchPageText('Coal_in_India');
    var info = extractInfobox(html); var count = 0;
    Object.keys(info).forEach(function(k) {
      if (k.match(/(production|reserve|resource|consumption|import|export)/i) && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of coal in India?', info[k], 'Coal Mining & Minerals', seq['Coal Mining & Minerals']++, 'Coal in India', '\u26AB', 'Coal in India: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Coal Mining & Minerals'][eventKey(q)]) { if (!nq['Coal Mining & Minerals']) nq['Coal Mining & Minerals'] = []; nq['Coal Mining & Minerals'].push(q); ek['Coal Mining & Minerals'][eventKey(q)] = true; count++; }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Ports ──
  process.stdout.write('  Ports & Shipping... ');
  try {
    var html = await fetchPageText('Ministry_of_Ports,_Shipping_and_Waterways');
    var info = extractInfobox(html); var count = 0;
    ['Minister', 'Minister of State', 'Headquarters', 'Formed'].forEach(function(k) {
      if (info[k] && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of the Ministry of Ports, Shipping and Waterways?', info[k], 'Ports & Shipping', seq['Ports & Shipping']++, 'Ministry of Ports', '\u26F5', 'Ministry of Ports: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Ports & Shipping'][eventKey(q)]) { if (!nq['Ports & Shipping']) nq['Ports & Shipping'] = []; nq['Ports & Shipping'].push(q); ek['Ports & Shipping'][eventKey(q)] = true; count++; }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Nuclear & Defence ──
  process.stdout.write('  Nuclear & Defence Exports... ');
  try {
    var html = await fetchPageText('Department_of_Atomic_Energy');
    var info = extractInfobox(html); var count = 0;
    ['Minister', 'Headquarters', 'Formed', 'Annual budget'].forEach(function(k) {
      if (info[k] && info[k].length > 2) {
        var q = makeQuestion('What is the ' + k + ' of the Department of Atomic Energy?', info[k], 'Nuclear & Defence Exports', seq['Nuclear & Defence Exports']++, 'DAE', '\u2622', 'DAE: ' + k + ' = ' + info[k] + '.');
        if (q && !ek['Nuclear & Defence Exports'][eventKey(q)]) { if (!nq['Nuclear & Defence Exports']) nq['Nuclear & Defence Exports'] = []; nq['Nuclear & Defence Exports'].push(q); ek['Nuclear & Defence Exports'][eventKey(q)] = true; count++; }
      }
    });
    process.stdout.write(count + ' items\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(400);

  // ── Flagship Programmes (again, different pages) ──
  process.stdout.write('  Flagship Programmes (more)... ');
  var FLAG_PAGES = [
    { page: 'Ayushman_Bharat', name: 'Ayushman Bharat', emoji: '\uD83C\uDFE5' },
    { page: 'Swachh_Bharat_Mission', name: 'Swachh Bharat Mission', emoji: '\uD83E\uDDF9' },
    { page: 'Digital_India', name: 'Digital India', emoji: '\uD83D\uDCF1' },
    { page: 'Make_in_India', name: 'Make in India', emoji: '\uD83C\uDFED' },
    { page: 'Pradhan_Mantri_Awas_Yojana', name: 'Pradhan Mantri Awas Yojana', emoji: '\uD83C\uDFE0' },
    { page: 'Pradhan_Mantri_Kisan_Samman_Nidhi', name: 'PM-KISAN', emoji: '\uD83C\uDF3E' },
    { page: 'Pradhan_Mantri_Jan_Dhan_Yojana', name: 'Jan Dhan Yojana', emoji: '\uD83C\uDFE6' },
    { page: 'Pradhan_Mantri_Ujjwala_Yojana', name: 'Ujjwala Yojana', emoji: '\uD83D\uDD25' },
    { page: 'Mission_Indradhanush', name: 'Mission Indradhanush', emoji: '\uD83D\uDC89' },
    { page: 'Namami_Gange', name: 'Namami Gange', emoji: '\uD83D\uDCA7' },
    { page: 'National_Digital_Literacy_Mission', name: 'National Digital Literacy Mission', emoji: '\uD83D\uDCF1' },
    { page: 'Pradhan_Mantri_Suryodaya_Yojana', name: 'PM Suryodaya Yojana', emoji: '\u2600\uFE0F' },
    { page: 'Pradhan_Mantri_Vishwakarma_Yojana', name: 'PM Vishwakarma Yojana', emoji: '\uD83D\uDD28' }
  ];
  var fCount = 0;
  for (var pi = 0; pi < FLAG_PAGES.length; pi++) {
    try {
      var html = await fetchPageText(FLAG_PAGES[pi].page);
      var info = extractInfobox(html);
      var launched = info['Launched'] || info['Launch date'] || info['Started'] || '';
      var budget = info['Budget'] || info['Allocation'] || info['Funding'] || '';
      var ministry = info['Ministry'] || info['Minister'] || '';
      if (launched) {
        var q = makeQuestion('When was ' + FLAG_PAGES[pi].name + ' launched?', launched, 'Flagship Programmes', seq['Flagship Programmes']++, '' + FLAG_PAGES[pi].name, FLAG_PAGES[pi].emoji, FLAG_PAGES[pi].name + ' launched: ' + launched + '.');
        if (q && !ek['Flagship Programmes'][eventKey(q)]) { if (!nq['Flagship Programmes']) nq['Flagship Programmes'] = []; nq['Flagship Programmes'].push(q); ek['Flagship Programmes'][eventKey(q)] = true; fCount++; }
      }
    } catch (e) {}
    await delay(300);
  }
  process.stdout.write(fCount + ' items\n');

  process.stdout.write('  Category discovery... ');
  var DISCOVERY = [
    { cats: ['Coal_by_country', 'Mines_in_India'], map: 'Coal Mining & Minerals', keys: ['Production', 'Proven reserves', 'Reserves', 'Major products', 'Founded', 'Headquarters'] },
    { cats: ['Ports_in_India', 'Seaports_in_India'], map: 'Ports & Shipping', keys: ['Operator', 'Opened', 'Location', 'Headquarters', 'Coordinates'] },
    { cats: ['Nuclear_power_plants_in_India'], map: 'Nuclear & Defence Exports', keys: ['Operator', 'Location', 'Commissioned', 'Capacity', 'Modelling'] },
    { cats: ['Government_schemes_in_India'], map: 'Flagship Programmes', keys: ['Launched', 'Launch date', 'Started', 'Date launched', 'Budget', 'Ministry'] }
  ];
  var catCount = 0;
  for (var di = 0; di < DISCOVERY.length; di++) {
    var cfg = DISCOVERY[di];
    for (var dc = 0; dc < cfg.cats.length; dc++) {
      var title2;
      try {
        var members = await categoryMembers(cfg.cats[dc]);
        for (var mm = 0; mm < members.length; mm++) {
          title2 = members[mm];
          if (title2.indexOf('Category:') === 0 || title2.indexOf('List of') === 0) continue;
          try {
            var ch3 = await fetchPageText(title2.replace(/ /g, '_'));
            var ci3 = extractInfobox(ch3);
            for (var ck = 0; ck < cfg.keys.length; ck++) {
              var k3 = cfg.keys[ck];
              if (ci3[k3] && ci3[k3].length > 2) {
                var catS = cfg.map;
                var q = makeQuestion('What is the ' + k3 + ' of ' + title2 + '?', strip(ci3[k3]), catS, seq[catS]++, '' + title2, '\u2699\uFE0F', title2 + ' ' + k3 + ': ' + ci3[k3] + '.');
                if (q && !ek[catS][eventKey(q)]) { if (!nq[catS]) nq[catS] = []; nq[catS].push(q); ek[catS][eventKey(q)] = true; catCount++; }
              }
            }
          } catch (e) {}
          await delay(120);
        }
      } catch (e) {}
    }
  }
  process.stdout.write(catCount + ' category items\n');

  Object.keys(nq).forEach(function(cat) { (nq[cat] || []).forEach(function(q) { existing[CA_KEY].subSubjects[cat].push(q); }); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  ['Coal Mining & Minerals', 'Ports & Shipping', 'Nuclear & Defence Exports', 'Flagship Programmes'].forEach(function(s) { console.error(s + ': ' + existing[CA_KEY].subSubjects[s].length + ' total, ' + (nq[s] ? nq[s].length : 0) + ' new'); });
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

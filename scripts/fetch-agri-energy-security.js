var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'AgriBot/2.0' } }, function(res) {
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
  var prefix = { 'Agriculture & Food': 'agr', 'Energy & Renewable': 'enr', 'Internal Security': 'sec' }[subSubject] || 'oth';
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

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = [];
    var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rRegex.exec(m[2])) !== null) {
      var cells = [];
      var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Agriculture & Food', 'Energy & Renewable', 'Internal Security'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { a: {}, e: {}, s: {} };
  existing[CA_KEY].subSubjects['Agriculture & Food'].forEach(function(q) { ek.a[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Energy & Renewable'].forEach(function(q) { ek.e[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Internal Security'].forEach(function(q) { ek.s[eventKey(q)] = true; });
  var seq = { a: existing[CA_KEY].subSubjects['Agriculture & Food'].length + 1, e: existing[CA_KEY].subSubjects['Energy & Renewable'].length + 1, s: existing[CA_KEY].subSubjects['Internal Security'].length + 1 };
  var nq = { a: [], e: [], s: [] };

  // ── Agriculture: Major crops, production from infobox ──
  process.stdout.write('  Agriculture... ');
  var AGRI_PAGES = [
    { page: 'Agriculture_in_India', name: 'Agriculture in India', useText: true },
    { page: 'National_Food_Security_Mission', name: 'National Food Security Mission', useText: false },
    { page: 'Food_Corporation_of_India', name: 'Food Corporation of India', useText: false },
    { page: 'Pradhan_Mantri_Fasal_Bima_Yojana', name: 'PM Fasal Bima Yojana', useText: false }
  ];
  var aCount = 0;
  for (var pi = 0; pi < AGRI_PAGES.length; pi++) {
    try {
      var html = await fetchPageText(AGRI_PAGES[pi].page);
      var info = extractInfobox(html);
      var hadData = false;
      Object.keys(info).forEach(function(k) {
        if (k.match(/(production|output|crop|area|yield|scheme|mission)/i) && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' as per ' + AGRI_PAGES[pi].name + '?', info[k], 'Agriculture & Food', seq.a++, '' + AGRI_PAGES[pi].page, '\uD83C\uDF3E', AGRI_PAGES[pi].name + ': ' + k + ' = ' + info[k] + '.');
          if (q && !ek.a[eventKey(q)]) { nq.a.push(q); ek.a[eventKey(q)] = true; aCount++; hadData = true; }
        }
      });
      if (!hadData && AGRI_PAGES[pi].useText) {
        var txt = strip(html);
        var leads = txt.match(/(?:India|Indian)\s+[^.]*(?:\d+[\d,.]*\s*(?:million|billion|tonnes|hectare|rupees|crore|lakh))[^.]*\./gi) || [];
        leads.slice(0,5).forEach(function(lead) {
          var numM = lead.match(/(\d+[\d,.]*\s*(?:million|billion|lakh|crore|tonnes|hectare)?)/);
          var num = numM ? numM[0].trim() : '';
          var subj = lead.match(/(?:producer|exporter|production|consumption|produce|export|import|yield)\s+of\s+([a-zA-Z\s]+?)(?:\s+in|\s+at|\s+was|\s+is|$)/i);
          var subjText = subj ? subj[1].trim() : '';
          if (num) {
            var topic = subjText;
            if (topic && topic.length > 3) {
              var q = makeQuestion('What is ' + topic + ' production statistic?', num, 'Agriculture & Food', seq.a++, 'General Knowledge', '\uD83C\uDF3E', lead + '.');
              if (q && !ek.a[eventKey(q)]) { nq.a.push(q); ek.a[eventKey(q)] = true; aCount++; }
            }
          }
        });
      }
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(aCount + ' items\n');

  // ── Energy: Renewable capacity, sources from infobox ──
  process.stdout.write('  Energy & Renewable... ');
  var ENERGY_PAGES = [
    { page: 'Energy_in_India', name: 'Energy in India', useText: false },
    { page: 'Renewable_energy_in_India', name: 'Renewable energy in India', useText: false },
    { page: 'Solar_power_in_India', name: 'Solar power in India', useText: false },
    { page: 'Wind_power_in_India', name: 'Wind power in India', useText: false },
    { page: 'Nuclear_power_in_India', name: 'Nuclear power in India', useText: false }
  ];
  var eCount = 0;
  for (var pi2 = 0; pi2 < ENERGY_PAGES.length; pi2++) {
    try {
      var html = await fetchPageText(ENERGY_PAGES[pi2].page);
      var info = extractInfobox(html);
      var hadData = false;
      Object.keys(info).forEach(function(k) {
        if (k.match(/(capacity|generation|production|installed|target)/i) && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + ENERGY_PAGES[pi2].name + '?', info[k], 'Energy & Renewable', seq.e++, '' + ENERGY_PAGES[pi2].page, '\u26A1', ENERGY_PAGES[pi2].name + ': ' + k + ' = ' + info[k] + '.');
          if (q && !ek.e[eventKey(q)]) { nq.e.push(q); ek.e[eventKey(q)] = true; eCount++; hadData = true; }
        }
      });
      if (!hadData && ENERGY_PAGES[pi2].useText) {
        var txt = strip(html);
        var leads = txt.match(/(?:India|Indian)\s+[^.]*(?:\d+[\d,.]*\s*(?:GW|MW|gigawatt|megawatt|billion|capacity))[^.]*\./gi) || [];
        leads.slice(0,4).forEach(function(lead) {
          var numM = lead.match(/(\d+[\d,.]*\s*(?:GW|MW|billion)?)/);
          var num = numM ? numM[0].trim() : '';
          if (num && num.length > 2) {
            var q = makeQuestion('What energy statistic is indicated in "' + lead.substring(0,30).trim() + '"?', num, 'Energy & Renewable', seq.e++, 'General Knowledge', '\u26A1', lead + '.');
            if (q && !ek.e[eventKey(q)]) { nq.e.push(q); ek.e[eventKey(q)] = true; eCount++; }
          }
        });
      }
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(eCount + ' items\n');

  // ── Internal Security: Forces, agencies ──
  process.stdout.write('  Internal Security... ');
  var SEC_PAGES = [
    { page: 'Indian_Armed_Forces', name: 'Indian Armed Forces' },
    { page: 'National_Security_Guard', name: 'NSG' },
    { page: 'Border_Security_Force', name: 'BSF' },
    { page: 'Central_Industrial_Security_Force', name: 'CISF' },
    { page: 'Central_Reserve_Police_Force', name: 'CRPF' },
    { page: 'National_Investigation_Agency', name: 'NIA' }
  ];
  var sCount = 0;
  for (var pi3 = 0; pi3 < SEC_PAGES.length; pi3++) {
    try {
      var html = await fetchPageText(SEC_PAGES[pi3].page);
      var info = extractInfobox(html);
      var motto = info['Motto'] || '';
      var strength = info['Personnel'] || info['Workforce'] || info['Strength'] || '';
      var hq = info['Headquarters'] || info['HQ'] || '';
      if (motto) {
        var q = makeQuestion('What is the motto of ' + SEC_PAGES[pi3].name + '?', motto, 'Internal Security', seq.s++, '' + SEC_PAGES[pi3].page, '\uD83D\uDD12', SEC_PAGES[pi3].name + ' motto: ' + motto + '.');
        if (q && !ek.s[eventKey(q)]) { nq.s.push(q); ek.s[eventKey(q)] = true; sCount++; }
      }
      if (strength) {
        var q = makeQuestion('What is the personnel strength of ' + SEC_PAGES[pi3].name + '?', strength, 'Internal Security', seq.s++, '' + SEC_PAGES[pi3].page, '\uD83D\uDD12', SEC_PAGES[pi3].name + ' strength: ' + strength + '.');
        if (q && !ek.s[eventKey(q)]) { nq.s.push(q); ek.s[eventKey(q)] = true; sCount++; }
      }
    } catch (e) {}
    await delay(350);
  }

  nq.a.forEach(function(q) { existing[CA_KEY].subSubjects['Agriculture & Food'].push(q); });
  nq.e.forEach(function(q) { existing[CA_KEY].subSubjects['Energy & Renewable'].push(q); });
  nq.s.forEach(function(q) { existing[CA_KEY].subSubjects['Internal Security'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Agriculture: ' + existing[CA_KEY].subSubjects['Agriculture & Food'].length + ' total, ' + nq.a.length + ' new');
  console.error('Energy: ' + existing[CA_KEY].subSubjects['Energy & Renewable'].length + ' total, ' + nq.e.length + ' new');
  console.error('Security: ' + existing[CA_KEY].subSubjects['Internal Security'].length + ' total, ' + nq.s.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

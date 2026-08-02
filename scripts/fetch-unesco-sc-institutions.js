var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'UNESCOSCBot/2.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
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
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function makeQuestion(qText, answer, subSubject, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = subSubject === 'UNESCO & World Heritage' ? 'une' : (subSubject === 'SC Landmark Judgments' ? 'scj' : 'inst');
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
  ['UNESCO & World Heritage', 'SC Landmark Judgments', 'New Institutions & IITs'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = { u: {}, s: {}, i: {} };
  existing[CA_KEY].subSubjects['UNESCO & World Heritage'].forEach(function(q) { ek.u[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['SC Landmark Judgments'].forEach(function(q) { ek.s[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['New Institutions & IITs'].forEach(function(q) { ek.i[eventKey(q)] = true; });
  function maxSeq(arr, prefix) {
    var mx = 0;
    arr.forEach(function(q) { var m = new RegExp('^' + prefix + '_(\\d+)$').exec(q.id || ''); if (m) mx = Math.max(mx, parseInt(m[1], 10)); });
    return mx + 1;
  }
  var seq = { u: maxSeq(existing[CA_KEY].subSubjects['UNESCO & World Heritage'], 'une'), s: maxSeq(existing[CA_KEY].subSubjects['SC Landmark Judgments'], 'scj'), i: maxSeq(existing[CA_KEY].subSubjects['New Institutions & IITs'], 'inst') };
  var nq = { u: [], s: [], i: [] };

  // ── UNESCO World Heritage Sites in India ──
  process.stdout.write('  UNESCO World Heritage Sites... ');
  try {
    var html = await fetchPageText('List_of_World_Heritage_Sites_in_India');
    var tables = extractWikiTables(html);
    var freshU = {};
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 30; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = strip(row[0] || '');
        var state = strip(row.length > 2 ? row[2] : (row[1] || ''));
        var year = strip(row.length > 3 ? row[3] : '');
        if (name.length > 2 && name.indexOf('Site') < 0 && name.indexOf('Property') < 0 && state.length > 2) {
          freshU[name] = { state: state, year: year };
        }
      }
    });
    var existingU = existing[CA_KEY].subSubjects['UNESCO & World Heritage'];
    var byU = {};
    existingU.forEach(function(q) {
      var m = /^(.+?) is a UNESCO World Heritage Site located in which state\?/.exec(q.question || '');
      if (m) byU[m[1]] = q;
    });
    var uUpdated = 0;
    Object.keys(freshU).sort().forEach(function(name) {
      var st = freshU[name].state;
      var year = freshU[name].year;
      var qText = name + ' is a UNESCO World Heritage Site located in which state?';
      var fact = name + ' is a UNESCO site in ' + st + (year ? ' (inscribed ' + year + ')' : '') + '.';
      var existingQ = byU[name];
      if (existingQ) {
        if (existingQ.answer !== st || existingQ.fact !== fact) { existingQ.answer = st; existingQ.fact = fact; uUpdated++; }
      } else {
        var q = makeQuestion(qText, st, 'UNESCO & World Heritage', seq.u++, 'World Heritage Sites in India', '\uD83C\uDFDB', fact);
        if (q) nq.u.push(q);
      }
    });
    var uBefore = existingU.length;
    existing[CA_KEY].subSubjects['UNESCO & World Heritage'] = existingU.filter(function(q) {
      var m = /^(.+?) is a UNESCO World Heritage Site located in which state\?/.exec(q.question || '');
      return !m || freshU[m[1]];
    });
    var uRemoved = uBefore - existing[CA_KEY].subSubjects['UNESCO & World Heritage'].length;
    process.stdout.write(Object.keys(freshU).length + ' sites, ' + uUpdated + ' updated, ' + nq.u.length + ' new, ' + uRemoved + ' removed\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(600);

  process.stdout.write('  SC Landmark Judgments... ');
  try {
    var html = await fetchPageText('List_of_landmark_court_decisions_in_India');
    var tables = extractWikiTables(html);
    var freshS = {};
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length && ri < 20; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var caseName = strip(row[0] || '');
        var yearStr = strip(row.length > 1 ? row[1] : '');
        var yr = yearStr.match(/\b(19\d{2}|20\d{2})\b/);
        if (caseName.length > 5 && caseName.indexOf('Case') < 0 && caseName.indexOf('Year') < 0) {
          freshS[caseName] = yr ? yr[1] : '20th century';
        }
      }
    });
    var existingS = existing[CA_KEY].subSubjects['SC Landmark Judgments'];
    var byCase = {};
    existingS.forEach(function(q) { byCase[q.answer] = q; });
    var sUpdated = 0;
    Object.keys(freshS).forEach(function(caseName) {
      var year = freshS[caseName];
      var qText = 'Which landmark case was decided by the Supreme Court of India in ' + year + '?';
      var fact = caseName + ' was a landmark judgment of ' + year + '.';
      var existingQ = byCase[caseName];
      if (existingQ) {
        if (existingQ.question !== qText || existingQ.fact !== fact) { existingQ.question = qText; existingQ.fact = fact; sUpdated++; }
      } else {
        var q = makeQuestion(qText, caseName, 'SC Landmark Judgments', seq.s++, 'Landmark court decisions in India', '\u2696', fact);
        if (q) nq.s.push(q);
      }
    });
    var sBefore = existingS.length;
    existing[CA_KEY].subSubjects['SC Landmark Judgments'] = existingS.filter(function(q) { return freshS[q.answer]; });
    var sRemoved = sBefore - existing[CA_KEY].subSubjects['SC Landmark Judgments'].length;
    process.stdout.write(Object.keys(freshS).length + ' cases, ' + sUpdated + ' updated, ' + nq.s.length + ' new, ' + sRemoved + ' removed\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  await delay(600);

  process.stdout.write('  IITs / Institutions... ');
  try {
    var freshI = {};
    var html = await fetchPageText('Indian_Institutes_of_Technology');
    var tables = extractWikiTables(html);
    tables.forEach(function(t) {
      // Identify columns: find Name and State/UT indices from header
      var hdr = t[0] || [];
      var nameIdx = -1, locIdx = -1, yearIdx = -1;
      hdr.forEach(function(c, i) {
        var cl = c.toLowerCase();
        if (cl.indexOf('name') >= 0 || cl.indexOf('institute') >= 0) nameIdx = i;
        if (cl.indexOf('state') >= 0 || cl.indexOf('location') >= 0 || cl.indexOf('city') >= 0) locIdx = i;
        if (cl.indexOf('founded') >= 0 || cl.indexOf('established') >= 0 || cl.indexOf('year') >= 0) yearIdx = i;
      });
      if (nameIdx < 0) nameIdx = 0;
      if (locIdx < 0) locIdx = 2;
      for (var ri = 1; ri < t.length && ri < 20; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var nameI = (nameIdx >= 0 && nameIdx < row.length) ? nameIdx : 0;
        var locI = (locIdx >= 0 && locIdx < row.length) ? locIdx : (row.length > 2 ? 2 : 1);
        var yrI = (yearIdx >= 0 && yearIdx < row.length) ? yearIdx : (row.length > 3 ? 3 : -1);
        var name = strip(row[nameI] || '');
        var loc = strip(row[locI] || '');
        var yr = strip((yrI >= 0 && row[yrI]) ? row[yrI] : '');
        if (name && name.indexOf('IIT') >= 0 && name.indexOf('Name') < 0 && loc.length > 2 && !/^\d|^N\/A$|^[0-9]+[,\d]*\s*[–-]\s*[0-9]+$/.test(loc)) {
          var year = yr.match(/\b(19\d{2}|20\d{2})\b/);
          freshI[name] = { loc: loc, year: year ? year[1] : '', src: 'IITs' };
        }
      }
    });
    // Also try IIMs
    var html2 = await fetchPageText('Indian_Institutes_of_Management');
    var tables2 = extractWikiTables(html2);
    tables2.forEach(function(t) {
      // Identify columns: find Name and State/UT indices from header
      var hdr = t[0] || [];
      var nameIdx = -1, locIdx = -1;
      hdr.forEach(function(c, i) {
        var cl = c.toLowerCase();
        if (cl.indexOf('name') >= 0 || cl.indexOf('institute') >= 0) nameIdx = i;
        if (cl.indexOf('state') >= 0 || cl.indexOf('location') >= 0 || cl.indexOf('city') >= 0) locIdx = i;
      });
      for (var ri = 1; ri < t.length && ri < 15; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var nameI = (nameIdx >= 0 && nameIdx < row.length) ? nameIdx : 0;
        var locI = (locIdx >= 0 && locIdx < row.length) ? locIdx : (row.length > 2 ? 2 : 1);
        var name = strip(row[nameI] || '');
        var loc = strip(row[locI] || '');
        if (name && name.indexOf('IIM') >= 0 && name.indexOf('Name') < 0 && loc.length > 2 && !/^\d|^N\/A$|^[0-9]+[,\d]*\s*[–-]\s*[0-9]+$/.test(loc)) {
          freshI[name] = { loc: loc, year: '', src: 'IIMs' };
        }
      }
    });

    var existingI = existing[CA_KEY].subSubjects['New Institutions & IITs'];
    var byInst = {};
    existingI.forEach(function(q) {
      var m = /Where is (.+?) located\?/.exec(q.question || '');
      if (m) byInst[m[1]] = q;
    });
    var iUpdated = 0;
    Object.keys(freshI).sort().forEach(function(name) {
      var info = freshI[name];
      var qText = 'Where is ' + name + ' located?';
      var fact = name + ' is located in ' + info.loc + (info.year ? ', established in ' + info.year : '') + '.';
      var existingQ = byInst[name];
      if (existingQ) {
        if (existingQ.answer !== info.loc || existingQ.fact !== fact) { existingQ.answer = info.loc; existingQ.fact = fact; iUpdated++; }
      } else {
        var q = makeQuestion(qText, info.loc, 'New Institutions & IITs', seq.i++, info.src, '\uD83C\uDF93', fact);
        if (q) nq.i.push(q);
      }
    });
    var iBefore = existingI.length;
    existing[CA_KEY].subSubjects['New Institutions & IITs'] = existingI.filter(function(q) {
      var m = /Where is (.+?) located\?/.exec(q.question || '');
      return !m || freshI[m[1]];
    });
    var iRemoved = iBefore - existing[CA_KEY].subSubjects['New Institutions & IITs'].length;
    process.stdout.write(Object.keys(freshI).length + ' institutions, ' + iUpdated + ' updated, ' + nq.i.length + ' new, ' + iRemoved + ' removed\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  Object.keys(nq).forEach(function(k) {
    nq[k].forEach(function(q) { existing[CA_KEY].subSubjects[k === 'u' ? 'UNESCO & World Heritage' : (k === 's' ? 'SC Landmark Judgments' : 'New Institutions & IITs')].push(q); });
  });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('UNESCO & World Heritage: ' + existing[CA_KEY].subSubjects['UNESCO & World Heritage'].length + ' total, ' + nq.u.length + ' new');
  console.error('SC Landmark Judgments: ' + existing[CA_KEY].subSubjects['SC Landmark Judgments'].length + ' total, ' + nq.s.length + ' new');
  console.error('New Institutions & IITs: ' + existing[CA_KEY].subSubjects['New Institutions & IITs'].length + ' total, ' + nq.i.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});


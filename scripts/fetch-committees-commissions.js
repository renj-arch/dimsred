var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'CommitteesBot/2.0' } }, function(res) {
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
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = (subSubject === 'Committees & Commissions') ? 'com' : subSubject.match(/\b(\w)/g).join('').toLowerCase().substring(0, 3);
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

// Reduce an infobox "Established" value to the bare ISO date, dropping the
// relative-age noise Wikipedia appends ("…; 76 years ago (1950-01-25)").
function cleanEstDate(v) {
  var s = String(v || '').replace(/&#160;/g, ' ').replace(/\s+/g, ' ').trim();
  var iso = s.match(/\(?\s*(\d{4}-\d{2}-\d{2})\s*\)?/);
  if (iso) return iso[1];
  var m = s.match(/\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/i);
  if (m) return m[1];
  var y = s.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  if (y) return y[1];
  return s;
}

function categoryMembers(category) {
  return fetchJSON(API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=300&cmtype=page&format=json').then(function(d) {
    var out = [];
    if (d && d.query && d.query.categorymembers) {
      d.query.categorymembers.forEach(function(p) { if (p.title) out.push(p.title); });
    }
    return out;
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
  if (!existing[CA_KEY].subSubjects['Committees & Commissions']) existing[CA_KEY].subSubjects['Committees & Commissions'] = [];
  if (!existing[CA_KEY].subSubjects['Flagship Programmes']) existing[CA_KEY].subSubjects['Flagship Programmes'] = [];

  var ek = { c: {}, f: {} };
  existing[CA_KEY].subSubjects['Committees & Commissions'].forEach(function(q) { ek.c[eventKey(q)] = true; });
  existing[CA_KEY].subSubjects['Flagship Programmes'].forEach(function(q) { ek.f[eventKey(q)] = true; });
  var seq = { c: existing[CA_KEY].subSubjects['Committees & Commissions'].length + 1, f: existing[CA_KEY].subSubjects['Flagship Programmes'].length + 1 };
  var nq = { c: [], f: [] };

  // ── Committees from NITI Aayog / Finance Commission etc ──
  process.stdout.write('  Committees & Commissions... ');
  var COMMITTEE_PAGES = [
    'Finance_Commission_of_India',
    'Law_Commission_of_India',
    'Election_Commission_of_India',
    'Union_Public_Service_Commission',
    'National_Human_Rights_Commission_of_India',
    'NITI_Aayog',
    'National_Commission_for_Backward_Classes',
    'National_Commission_for_Protection_of_Child_Rights',
    'Competition_Commission_of_India',
    'Central_Vigilance_Commission',
    'Central_Information_Commission',
    'National_Water_Commission',
    'National_Commission_for_Scheduled_Castes',
    'National_Commission_for_Scheduled_Tribes',
    'National_Commission_for_Women_(India)',
    'Telecom_Regulatory_Authority_of_India',
    'Securities_and_Exchange_Board_of_India',
    'Reserve_Bank_of_India',
    'University_Grants_Commission_(India)',
    'National_Medical_Commission',
    'Press_Council_of_India',
    'National_Statistical_Commission_(India)'
  ];
  var cCount = 0;
  for (var pi = 0; pi < COMMITTEE_PAGES.length; pi++) {
    try {
      var html = await fetchPageText(COMMITTEE_PAGES[pi]);
      var info = extractInfobox(html);
      var chair = info['Chairperson'] || info['Chairman'] || info['Chair'] || info['President'] || '';
      if (chair.length > 2) {
        var name = COMMITTEE_PAGES[pi].replace(/_/g, ' ');
        var q = makeQuestion('Who is the chairperson of the ' + name + '?', chair, 'Committees & Commissions', seq.c++, '' + name, '\uD83D\uDCDD', name + ' chairperson: ' + chair + '.');
        if (q && !ek.c[eventKey(q)]) { nq.c.push(q); ek.c[eventKey(q)] = true; cCount++; }
      }
      if ((info['Established'] || info['Founded'] || info['Formed'] || info['Founding year'] || '').length > 2) {
        var name2 = COMMITTEE_PAGES[pi].replace(/_/g, ' ');
        var est = cleanEstDate(info['Established'] || info['Founded'] || info['Formed'] || info['Founding year'] || '');
        var q = makeQuestion('When was the ' + name2 + ' established?', est, 'Committees & Commissions', seq.c++, '' + name2, '\uD83D\uDCDD', name2 + ' was established in ' + est + '.');
        if (q && !ek.c[eventKey(q)]) { nq.c.push(q); ek.c[eventKey(q)] = true; cCount++; }
      }
    } catch (e) {}
    await delay(300);
  }
  process.stdout.write(cCount + ' items\n');

  process.stdout.write('  Flagship Programmes... ');
  var PROG_PAGES = [
    { page: 'Ayushman_Bharat', name: 'Ayushman Bharat', emoji: '\uD83C\uDFE5' },
    { page: 'Swachh_Bharat_Mission', name: 'Swachh Bharat Mission', emoji: '\uD83E\uDDF9' },
    { page: 'Digital_India', name: 'Digital India', emoji: '\uD83D\uDCF1' },
    { page: 'Make_in_India', name: 'Make in India', emoji: '\uD83C\uDFED' },
    { page: 'Pradhan_Mantri_Awas_Yojana', name: 'Pradhan Mantri Awas Yojana', emoji: '\uD83C\uDFE0' },
    { page: 'Pradhan_Mantri_Kisan_Samman_Nidhi', name: 'PM-KISAN', emoji: '\uD83C\uDF3E' },
    { page: 'Pradhan_Mantri_Ujjwala_Yojana', name: 'Ujjwala Yojana', emoji: '\uD83D\uDD25' },
    { page: 'Pradhan_Mantri_Jan_Dhan_Yojana', name: 'Jan Dhan Yojana', emoji: '\uD83C\uDFE6' },
    { page: 'Skill_India', name: 'Skill India', emoji: '\uD83D\uDCBC' },
    { page: 'Smart_Cities_Mission', name: 'Smart Cities Mission', emoji: '\uD83C\uDFD9' },
    { page: 'Pradhan_Mantri_Mudra_Yojana', name: 'PM Mudra Yojana', emoji: '\uD83D\uDCB5' },
    { page: 'Pradhan_Mantri_Krishi_Sinchai_Yojana', name: 'PM Krishi Sinchai Yojana', emoji: '\uD83D\uDCA7' },
    { page: 'Pradhan_Mantri_Fasal_Bima_Yojana', name: 'PM Fasal Bima Yojana', emoji: '\uD83C\uDF31' },
    { page: 'Pradhan_Mantri_Matsya_Sampada_Yojana', name: 'PM Matsya Sampada Yojana', emoji: '\uD83D\uDC1F' },
    { page: 'Pradhan_Mantri_Garib_Kalyan_Yojana', name: 'PM Garib Kalyan Yojana', emoji: '\uD83D\uDCB3' },
    { page: 'Pradhan_Mantri_Shram_Yogi_Maandhan', name: 'PM Shram Yogi Maandhan', emoji: '\uD83C\uDFF5' },
    { page: 'Beti_Bachao_Beti_Padhao', name: 'Beti Bachao Beti Padhao', emoji: '\uD83D\uDC69' },
    { page: 'Poshan_Abhiyaan', name: 'Poshan Abhiyaan', emoji: '\uD83C\uDF3F' },
    { page: 'Deen_Dayal_Antyodaya_Yojana', name: 'Deen Dayal Antyodaya Yojana', emoji: '\uD83C\uDF3E' },
    { page: 'Atal_Mission_for_Rejuvenation_and_Urban_Transformation', name: 'AMRUT', emoji: '\uD83C\uDFD9' }
  ];
  var fCount = 0;
  for (var pi2 = 0; pi2 < PROG_PAGES.length; pi2++) {
    try {
      var html = await fetchPageText(PROG_PAGES[pi2].page);
      var info = extractInfobox(html);
      var launched = info['Launched'] || info['Launch date'] || info['Started'] || info['Date launched'] || '';
      var motto = info['Motto'] || info['Tagline'] || info['Mission statement'] || '';
      var ministry = info['Ministry'] || info['Minister'] || info['Responsible ministry'] || '';
      if (launched.length > 2) {
        var q = makeQuestion('When was ' + PROG_PAGES[pi2].name + ' launched?', launched, 'Flagship Programmes', seq.f++, '' + PROG_PAGES[pi2].name, PROG_PAGES[pi2].emoji, PROG_PAGES[pi2].name + ' was launched in ' + launched + '.');
        if (q && !ek.f[eventKey(q)]) { nq.f.push(q); ek.f[eventKey(q)] = true; fCount++; }
      }
      if (ministry.length > 2) {
        var q = makeQuestion('Which ministry is responsible for ' + PROG_PAGES[pi2].name + '?', ministry, 'Flagship Programmes', seq.f++, '' + PROG_PAGES[pi2].name, PROG_PAGES[pi2].emoji, PROG_PAGES[pi2].name + ' is under ' + ministry + '.');
        if (q && !ek.f[eventKey(q)]) { nq.f.push(q); ek.f[eventKey(q)] = true; fCount++; }
      }
    } catch (e) {}
    await delay(300);
  }
  process.stdout.write(fCount + ' items\n');

  process.stdout.write('  Committees (category discovery)... ');
  var catCount = 0;
  var COM_CATS = ['Committees_of_the_Government_of_India', 'Commissions_of_India', 'Statutory_bodies_of_India'];
  for (var cc = 0; cc < COM_CATS.length; cc++) {
    try {
      var cmembers = await categoryMembers(COM_CATS[cc]);
      for (var cmi = 0; cmi < cmembers.length; cmi++) {
        var ctitle = strip(cmembers[cmi]);
        if (!ctitle || ctitle.length < 3 || ctitle.indexOf('Category:') === 0 || ctitle.indexOf('List of') === 0) continue;
        try {
          var cinfo = extractInfobox(await fetchPageText(ctitle.replace(/ /g, '_')));
          if (cinfo['Chairperson'] || cinfo['Chairman'] || cinfo['Chair'] || cinfo['President'] || cinfo['Established'] || cinfo['Founded'] || cinfo['Formed']) {
            var cname = strip(ctitle).replace(/_/g, ' ');
            if (cinfo['Chairperson'] || cinfo['Chairman'] || cinfo['Chair'] || cinfo['President']) {
              var chair = cinfo['Chairperson'] || cinfo['Chairman'] || cinfo['Chair'] || cinfo['President'];
              var q = makeQuestion('Who is the chairperson of the ' + cname + '?', chair, 'Committees & Commissions', seq.c++, '' + cname, '\uD83D\uDCDD', cname + ' chairperson: ' + chair + '.');
              if (q && !ek.c[eventKey(q)]) { nq.c.push(q); ek.c[eventKey(q)] = true; catCount++; }
            }
            if (cinfo['Established'] || cinfo['Founded'] || cinfo['Formed']) {
              var est = cleanEstDate(cinfo['Established'] || cinfo['Founded'] || cinfo['Formed']);
              var q = makeQuestion('When was the ' + cname + ' established?', est, 'Committees & Commissions', seq.c++, '' + cname, '\uD83D\uDCDD', cname + ' was established in ' + est + '.');
              if (q && !ek.c[eventKey(q)]) { nq.c.push(q); ek.c[eventKey(q)] = true; catCount++; }
            }
          }
        } catch (e) {}
        await delay(150);
      }
    } catch (e) {}
  }
  process.stdout.write(catCount + ' items\n');

  nq.c.forEach(function(q) { existing[CA_KEY].subSubjects['Committees & Commissions'].push(q); });
  nq.f.forEach(function(q) { existing[CA_KEY].subSubjects['Flagship Programmes'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Committees & Commissions: ' + existing[CA_KEY].subSubjects['Committees & Commissions'].length + ' total, ' + nq.c.length + ' new');
  console.error('Flagship Programmes: ' + existing[CA_KEY].subSubjects['Flagship Programmes'].length + ' total, ' + nq.f.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});


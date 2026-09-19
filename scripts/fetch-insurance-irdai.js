var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'InsuranceBot/2.0' } }, function(res) {
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
  return { id: 'ins_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
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

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) { try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {} }
  console.error('Read existing');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Insurance & IRDAI'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}; existing[CA_KEY].subSubjects['Insurance & IRDAI'].forEach(function(q) { ek[eventKey(q)] = true; });
  var seqObj = { n: existing[CA_KEY].subSubjects['Insurance & IRDAI'].length + 1 };
  var nq = [];

  process.stdout.write('  Insurance & IRDAI... ');
  var INS_PAGES = [
    'Insurance_Regulatory_and_Development_Authority_of_India',
    'Life_Insurance_Corporation_of_India',
    'General_Insurance_Corporation_of_India',
    'New_India_Assurance',
    'United_India_Insurance',
    'National_Insurance_Company',
    'HDFC_Life_Insurance',
    'SBI_Life_Insurance_Company_Limited',
    'ICICI_Prudential_Life_Insurance',
    'Max_Life_Insurance',
    'Bajaj_Allianz_Life_Insurance',
    'The_Oriental_Insurance_Company',
    'India_First_Life_insurance',
    'Export_Credit_Guarantee_Corporation_of_India'
  ];
  var count = 0;
  for (var ii = 0; ii < INS_PAGES.length; ii++) {
    try {
      var html = await fetchPageText(INS_PAGES[ii]);
      var info = extractInfobox(html);
      var name = INS_PAGES[ii].replace(/_/g, ' ');
      ['Chairperson', 'CEO', 'Headquarters', 'Founded', 'Formed', 'Revenue', 'Assets'].forEach(function(k) {
        if (info[k] && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + name + '?', info[k], 'Insurance & IRDAI', seqObj.n++, '' + name, '\uD83C\uDFE6', name + ' ' + k + ': ' + info[k] + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
        }
      });
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(count + ' items\n');

  process.stdout.write('  Category discovery... ');
  var CATS = ['Insurance_companies_of_India', 'Life_insurance_companies_of_India'];
  var INS_KEYS = ['Chairperson', 'CEO', 'Headquarters', 'Founded', 'Formed', 'Revenue', 'Assets'];
  var catCount = 0;
  for (var ii2 = 0; ii2 < CATS.length; ii2++) {
    try {
      var members = await categoryMembers(CATS[ii2]);
      for (var mi = 0; mi < members.length; mi++) {
        var title = members[mi];
        if (title.indexOf('Category:') === 0 || title.indexOf('List of') === 0) continue;
        try {
          var ch2 = await fetchPageText(title.replace(/ /g, '_'));
          var cinfo = extractInfobox(ch2);
          for (var ik = 0; ik < INS_KEYS.length; ik++) {
            if (cinfo[INS_KEYS[ik]] && cinfo[INS_KEYS[ik]].length > 2) {
              var q = makeQuestion('What is the ' + INS_KEYS[ik] + ' of ' + title + '?', cinfo[INS_KEYS[ik]], 'Insurance & IRDAI', seqObj.n++, '' + title, '\uD83C\uDFE6', title + ' ' + INS_KEYS[ik] + ': ' + cinfo[INS_KEYS[ik]] + '.');
              if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; catCount++; }
            }
          }
        } catch (e) {}
        await delay(120);
      }
    } catch (e) {}
  }
  process.stdout.write(catCount + ' category items\n');

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Insurance & IRDAI'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Insurance & IRDAI: ' + existing[CA_KEY].subSubjects['Insurance & IRDAI'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

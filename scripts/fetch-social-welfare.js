var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'WelfareBot/2.0' } }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) { var wait = Math.pow(2, 4 - retries) * 3000; return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait); }
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
  var prefix = { 'Women & Child Development': 'wcd', 'Tribal Affairs': 'tri', 'SC/ST/OBC Welfare': 'scs', 'Rural Development': 'rur', 'Urban Development': 'urb' }[subSubject] || 'wel';
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

async function main() {
  var existing = {};
  if (fs.existsSync(CA_PATH)) { try { existing = JSON.parse(fs.readFileSync(CA_PATH, 'utf8')); } catch (e) {} }
  console.error('Read existing current-affairs.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  ['Women & Child Development', 'Tribal Affairs', 'SC/ST/OBC Welfare', 'Rural Development', 'Urban Development'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}, seq = {};
  ['Women & Child Development', 'Tribal Affairs', 'SC/ST/OBC Welfare', 'Rural Development', 'Urban Development'].forEach(function(s) {
    ek[s] = {}; existing[CA_KEY].subSubjects[s].forEach(function(q) { ek[s][eventKey(q)] = true; }); seq[s] = existing[CA_KEY].subSubjects[s].length + 1;
  });
  var nq = {};

  var MINISTRIES = [
    { page: 'Ministry_of_Women_and_Child_Development', cat: 'Women & Child Development' },
    { page: 'Ministry_of_Tribal_Affairs', cat: 'Tribal Affairs' },
    { page: 'Ministry_of_Social_Justice_and_Empowerment', cat: 'SC/ST/OBC Welfare' },
    { page: 'Ministry_of_Rural_Development_(India)', cat: 'Rural Development' },
    { page: 'Ministry_of_Housing_and_Urban_Affairs', cat: 'Urban Development' },
    { page: 'Ministry_of_Panchayati_Raj', cat: 'Rural Development' }
  ];

  for (var mi = 0; mi < MINISTRIES.length; mi++) {
    process.stdout.write('  ' + MINISTRIES[mi].cat + '... ');
    var count = 0;
    var cat = MINISTRIES[mi].cat;
    try {
      var html = await fetchPageText(MINISTRIES[mi].page);
      var info = extractInfobox(html);
      ['Minister', 'Minister of State', 'Headquarters', 'Formed', 'Preceding Ministry', 'Responsible ministry'].forEach(function(key) {
        if (info[key] && info[key].length > 2) {
          var qText = key === 'Formed' ? 'When was ' + MINISTRIES[mi].page.replace(/_/g, ' ') + ' established?' : 'Who is the ' + key + ' of ' + MINISTRIES[mi].page.replace(/_/g, ' ') + '?';
          var q = makeQuestion(qText, info[key], cat, seq[cat]++, '' + MINISTRIES[mi].page, '\uD83C\uDFE5', MINISTRIES[mi].page.replace(/_/g, ' ') + ': ' + key + ' = ' + info[key] + '.');
          if (q && !ek[cat][eventKey(q)]) { if (!nq[cat]) nq[cat] = []; nq[cat].push(q); ek[cat][eventKey(q)] = true; count++; }
        }
      });
    } catch (e) {}
    process.stdout.write(count + ' items\n');
    await delay(350);
  }

  Object.keys(nq).forEach(function(cat) {
    (nq[cat] || []).forEach(function(q) { existing[CA_KEY].subSubjects[cat].push(q); });
  });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  ['Women & Child Development', 'Tribal Affairs', 'SC/ST/OBC Welfare', 'Rural Development', 'Urban Development'].forEach(function(s) {
    console.error(s + ': ' + existing[CA_KEY].subSubjects[s].length + ' total');
  });
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

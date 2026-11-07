var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'WelfareBot/2.0' } }, function(res) {
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
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var prefix = { 'Women & Child Development': 'wcd', 'Tribal Affairs': 'tri', 'SC/ST/OBC Welfare': 'scs', 'Rural Development': 'rur', 'Urban Development': 'urb' }[subSubject] || 'wel';
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

  function cleanInfo(v) {
    return strip(v).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  for (var mi = 0; mi < MINISTRIES.length; mi++) {
    process.stdout.write('  ' + MINISTRIES[mi].cat + '... ');
    var count = 0;
    var cat = MINISTRIES[mi].cat;
    try {
      var html = await fetchPageText(MINISTRIES[mi].page);
      var info = extractInfobox(html);
      ['Minister', 'Minister of State', 'Headquarters', 'Formed', 'Preceding Ministry', 'Responsible ministry'].forEach(function(key) {
        var val = cleanInfo(info[key]);
        if (val.length > 2 && val.length < 120) {
          var base = MINISTRIES[mi].page.replace(/_/g, ' ');
          var qText;
          if (key === 'Formed') qText = 'When was ' + base + ' established?';
          else if (key === 'Headquarters') qText = 'What is the headquarters of ' + base + '?';
          else qText = 'Who is the ' + key + ' of ' + base + '?';
          var q = makeQuestion(qText, val, cat, seq[cat]++, '' + MINISTRIES[mi].page, '\uD83C\uDFE5', base + ': ' + key + ' = ' + val + '.');
          if (q && !ek[cat][eventKey(q)]) { if (!nq[cat]) nq[cat] = []; nq[cat].push(q); ek[cat][eventKey(q)] = true; count++; }
        }
      });
    } catch (e) {}
    process.stdout.write(count + ' items\n');
    await delay(350);
  }

  process.stdout.write('  Category discovery... ');
  var CAT_START = [
    { cat: 'Women_in_India', map: 'Women & Child Development' },
    { cat: 'Child_welfare_in_India', map: 'Women & Child Development' },
    { cat: 'Scheduled_Tribes_of_India', map: 'Tribal Affairs' },
    { cat: 'Caste_related_legislation', map: 'SC/ST/OBC Welfare' },
    { cat: 'Rural_development_in_India', map: 'Rural Development' },
    { cat: 'Urban_planning_in_India', map: 'Urban Development' }
  ];
  var CAT_FIELDS = ['Minister', 'Minister of State', 'Headquarters', 'Formed', 'Chairperson', 'Established'];
  var catCount = 0;
  for (var ci = 0; ci < CAT_START.length; ci++) {
    try {
      var members = await categoryMembers(CAT_START[ci].cat);
      var map = CAT_START[ci].map;
      for (var mi = 0; mi < members.length; mi++) {
        var title = members[mi];
        if (title.indexOf('Category:') === 0 || title.indexOf('List of') === 0 || title.indexOf('Template:') === 0) continue;
        try {
          var ch = await fetchPageText(title.replace(/ /g, '_'));
          var cinfo = extractInfobox(ch);
          for (var f = 0; f < CAT_FIELDS.length; f++) {
            var key = CAT_FIELDS[f];
            var v = cleanInfo(cinfo[key]);
            if (v.length > 2 && v.length < 120) {
              var base = title.replace(/_/g, ' ');
              var qText;
              if (key === 'Formed' || key === 'Established') qText = 'When was ' + base + ' established?';
              else if (key === 'Headquarters') qText = 'What is the headquarters of ' + base + '?';
              else qText = 'Who is the ' + key + ' of ' + base + '?';
              var q = makeQuestion(qText, v, map, seq[map]++, '' + base, '\uD83C\uDFE5', base + ': ' + key + ' = ' + v + '.');
              if (q && !ek[map][eventKey(q)]) { if (!nq[map]) nq[map] = []; nq[map].push(q); ek[map][eventKey(q)] = true; catCount++; }
            }
          }
        } catch (e) {}
        await delay(120);
      }
    } catch (e) {}
  }
  process.stdout.write(catCount + ' category items\n');

  Object.keys(nq).forEach(function(cat) {
    (nq[cat] || []).forEach(function(q) { existing[CA_KEY].subSubjects[cat].push(q); });
  });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  ['Women & Child Development', 'Tribal Affairs', 'SC/ST/OBC Welfare', 'Rural Development', 'Urban Development'].forEach(function(s) {
    console.error(s + ': ' + existing[CA_KEY].subSubjects[s].length + ' total');
  });
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

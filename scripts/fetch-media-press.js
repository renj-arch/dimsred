var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'MediaBot/2.0' } }, function(res) {
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
  return { id: 'med_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
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
  ['Media & Press'].forEach(function(s) { if (!existing[CA_KEY].subSubjects[s]) existing[CA_KEY].subSubjects[s] = []; });

  var ek = {}; existing[CA_KEY].subSubjects['Media & Press'].forEach(function(q) { ek[eventKey(q)] = true; });
  var seqObj = { n: existing[CA_KEY].subSubjects['Media & Press'].length + 1 };
  var nq = [];

  process.stdout.write('  Media & Press... ');
  var MEDIA_PAGES = [
    'Press_Trust_of_India', 'Press_Information_Bureau', 'Doordarshan',
    'All_India_Radio', 'Broadcasting_Corporation_of_India',
    'Press_Council_of_India', 'Registrar_of_Newspapers_for_India',
    'Indian_Readership_Survey',
    'Asian_News_International', 'Indo-Asian_News_Service', 'United_News_of_India',
    'The_Hindu', 'The_Times_of_India', 'Hindustan_Times', 'The_Indian_Express',
    'NDTV', 'India_Today', 'NewsonAIR', 'DD_News', 'PTI_News_Service'
  ];
  var count = 0;
  for (var mi = 0; mi < MEDIA_PAGES.length; mi++) {
    try {
      var html = await fetchPageText(MEDIA_PAGES[mi]);
      var info = extractInfobox(html);
      var name = MEDIA_PAGES[mi].replace(/_/g, ' ');
      ['Founded', 'Headquarters', 'Chairperson', 'CEO', 'Key people', 'Owner'].forEach(function(k) {
        if (info[k] && info[k].length > 2) {
          var q = makeQuestion('What is the ' + k + ' of ' + name + '?', info[k], 'Media & Press', seqObj.n++, '' + name, '\uD83D\uDCF0', name + ' ' + k + ': ' + info[k] + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
        }
      });
    } catch (e) {}
    await delay(350);
  }
  process.stdout.write(count + ' items\n');

  process.stdout.write('  Media (category discovery)... ');
  var CATS = ['Newspapers_published_in_India', 'Indian_news_websites', 'News_agencies'];
  var catCount = 0;
  var FIELD_KEYS = ['Founded', 'Headquarters', 'Chairperson', 'CEO', 'Key people', 'Owner'];
  for (var mi2 = 0; mi2 < CATS.length; mi2++) {
    try {
      var members = await categoryMembers(CATS[mi2]);
      for (var mm = 0; mm < members.length; mm++) {
        var title = members[mm];
        if (title.indexOf('Category:') === 0 || title.indexOf('List of') === 0 || title.indexOf('Template:') === 0) continue;
        try {
          var chtml = await fetchPageText(title.replace(/ /g, '_'));
          var cinfo = extractInfobox(chtml);
          for (var kk = 0; kk < FIELD_KEYS.length; kk++) {
            if (cinfo[FIELD_KEYS[kk]] && cinfo[FIELD_KEYS[kk]].length > 2) {
              var q = makeQuestion('What is the ' + FIELD_KEYS[kk] + ' of ' + title + '?', cinfo[FIELD_KEYS[kk]], 'Media & Press', seqObj.n++, '' + title, '\uD83D\uDCF0', title + ' ' + FIELD_KEYS[kk] + ': ' + cinfo[FIELD_KEYS[kk]] + '.');
              if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; catCount++; }
            }
          }
        } catch (e) {}
        await delay(120);
      }
    } catch (e) {}
  }
  process.stdout.write(catCount + ' category items\n');

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Media & Press'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Media & Press: ' + existing[CA_KEY].subSubjects['Media & Press'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

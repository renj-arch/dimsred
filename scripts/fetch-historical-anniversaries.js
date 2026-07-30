var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'AnnivBot/2.0' } }, function(res) {
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
  var now = new Date(); var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return { id: 'ann_' + pad(seq), type: 'fill_blank', category: 'Current Affairs', region: '', source: source, pubDate: pubDate, subject: 'Current Affairs', subSubject: subSubject, emoji: emoji, question: qText, answer: answer, hint: '', fact: fact || '' };
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
  console.error('Read existing');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Historical Anniversaries']) existing[CA_KEY].subSubjects['Historical Anniversaries'] = [];

  var ek = {}; existing[CA_KEY].subSubjects['Historical Anniversaries'].forEach(function(q) { ek[eventKey(q)] = true; });
  var seq = existing[CA_KEY].subSubjects['Historical Anniversaries'].length + 1;
  var nq = [];

  // ── Fetch birth/death years of notable Indians for anniversaries ──
  process.stdout.write('  Historical Anniversaries... ');
  var FIGURES = [
    'Mahatma_Gandhi', 'Jawaharlal_Nehru', 'B._R._Ambedkar', 'Sardar_Vallabhbhai_Patel',
    'Subhas_Chandra_Bose', 'Bhagat_Singh', 'Rajendra_Prasad', 'Sarojini_Naidu',
    'Rabindranath_Tagore', 'Swami_Vivekananda', 'Mother_Teresa', 'Indira_Gandhi',
    'Atal_Bihari_Vajpayee', 'Lal_Bahadur_Shastri', 'Jawaharlal_Nehru', 'Mangal_Pandey',
    'Jawaharlal_Nehru', 'Dadabhai_Naoroji', 'Bal_Gangadhar_Tilak', 'Gopal_Krishna_Gokhale',
    'Muhammad_Ali_Jinnah', 'C._Rajagopalachari', 'M._S._Swaminathan', 'A._P._J._Abdul_Kalam',
    'Vikram_Sarabhai', 'C._V._Raman', 'Homi_J._Bhabha', 'Satyajit_Ray', 'Lata_Mangeshkar',
    'Ramanuja', 'Guru_Nanak', 'Kabir', 'Tulsidas', 'Mirabai', 'Shivaji', 'Tipu_Sultan',
    'Ashoka', 'Akbar', 'Chandragupta_Maurya', 'Samudragupta'
  ];
  var count = 0;
  for (var fi = 0; fi < FIGURES.length; fi++) {
    try {
      var html = await fetchPageText(FIGURES[fi]);
      var info = extractInfobox(html);
      var born = info['Born'] || '';
      var died = info['Died'] || '';
      var birthY = born.match(/\b(1[0-9]{3}|2[0-9]{3})\b/);
      var deathY = died.match(/\b(1[0-9]{3}|2[0-9]{3})\b/);
      var name = FIGURES[fi].replace(/_/g, ' ');
      if (birthY) {
        var yr = parseInt(birthY[1]);
        var nowYr = new Date().getFullYear();
        var anniv = nowYr - yr;
        if (anniv > 0 && anniv % 10 === 0 && anniv >= 50) {
          var q = makeQuestion('Which birth anniversary of ' + name + ' is observed in ' + nowYr + '?', anniv + 'th birth anniversary', 'Historical Anniversaries', seq++, '' + name, '\uD83C\uDF89', name + ' was born in ' + birthY[1] + ', marking ' + anniv + ' years in ' + nowYr + '.');
          if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
        }
        // General "when born"
        var q = makeQuestion('When was ' + name + ' born?', birthY[1], 'Historical Anniversaries', seq++, '' + name, '\uD83C\uDF89', name + ' was born in ' + birthY[1] + '.');
        if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
      }
      if (deathY) {
        var q = makeQuestion('When did ' + name + ' die?', deathY[1], 'Historical Anniversaries', seq++, '' + name, '\uD83C\uDF89', name + ' died in ' + deathY[1] + '.');
        if (q && !ek[eventKey(q)]) { nq.push(q); ek[eventKey(q)] = true; count++; }
      }
    } catch (e) {}
    await delay(300);
  }
  process.stdout.write(count + ' items\n');

  nq.forEach(function(q) { existing[CA_KEY].subSubjects['Historical Anniversaries'].push(q); });
  fs.writeFileSync(CA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Historical Anniversaries: ' + existing[CA_KEY].subSubjects['Historical Anniversaries'].length + ' total, ' + nq.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

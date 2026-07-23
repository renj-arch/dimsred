var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var DELAY = 600;
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function clean(v) {
  return v.replace(/&#160;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/[[\d\s,\-]+]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url, { agent: AGENT, headers: { 'User-Agent': 'ObitBot/1.0' } }, function(res) {
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

function fetchPage(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function pad(n) { return (n < 10 ? '0' : '') + n; }

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'obit_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Obituaries', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function extractDateEntries(html) {
  // Find all h3 day headings and their following ul/li entries
  var entries = [];
  var h3Regex = /<h3[^>]*>[\s\S]*?<\/h3>/gi;
  var ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;

  // Split HTML into blocks: h3 followed by ul
  var blocks = html.split(/<div class="mw-heading mw-heading3">/);
  for (var bi = 1; bi < blocks.length; bi++) {
    var block = blocks[bi];
    var dayMatch = block.match(/<h3[^>]*id="(\d+)"[^>]*>/);
    if (!dayMatch) continue;
    var day = parseInt(dayMatch[1], 10);
    var month = 'July 2026'; // assume July for current year
    if (html.indexOf('June') >= 0 && day > 20) month = 'June 2026'; // rough check

    // Get all li items in this block
    var liRegex = /<li>([\s\S]*?)<\/li>/gi;
    var lm;
    while ((lm = liRegex.exec(block)) !== null) {
      var liContent = lm[1];
      // Extract name from first <a> tag
      var nameMatch = liContent.match(/<a[^>]*>([\s\S]*?)<\/a>/);
      if (!nameMatch) continue;
      var name = clean(nameMatch[1]);
      if (!name || name.length < 3) continue;

      // Get description after name
      var desc = liContent.substring(nameMatch.index + nameMatch[0].length);
      desc = clean(desc);

      // Check if the person is Indian or globally notable (Nobel, President, PM etc.)
      var isNotable = false;
      if (desc.indexOf('Indian') >= 0 || desc.indexOf('India') >= 0) isNotable = true;
      if (desc.indexOf('Nobel') >= 0 || desc.indexOf('President') >= 0 || desc.indexOf('Prime Minister') >= 0) isNotable = true;
      if (desc.indexOf('Chief Justice') >= 0 || desc.indexOf('Chief Minister') >= 0) isNotable = true;

      if (isNotable) {
        entries.push({ name: name, desc: desc, day: day, month: month });
      }
    }
  }
  return entries;
}

async function fetchDeaths(existingKeys, newQuestions, seq) {
  console.error('\n--- Notable Deaths 2026 ---');
  try {
    var html = await fetchPage('Deaths_in_2026');
    var entries = extractDateEntries(html);
    var count = 0;
    entries.forEach(function(e) {
      var qText = 'Who died in ' + e.month + ' who was an Indian ' + (e.desc.indexOf('politician') >= 0 ? 'politician' : e.desc.indexOf('actor') >= 0 ? 'actor' : e.desc.indexOf('writer') >= 0 ? 'writer' : e.desc.indexOf('singer') >= 0 ? 'singer' : 'personality') + '?';
      // Simplify question for notable entries
      if (e.desc.indexOf('politician') >= 0) {
        qText = 'Which Indian politician died in July 2026?';
      } else if (e.desc.indexOf('actor') >= 0 || e.desc.indexOf('actress') >= 0) {
        qText = 'Which Indian actor died in 2026?';
      } else if (e.desc.indexOf('writer') >= 0 || e.desc.indexOf('poet') >= 0 || e.desc.indexOf('author') >= 0) {
        qText = 'Which Indian writer died in 2026?';
      } else if (e.desc.indexOf('singer') >= 0 || e.desc.indexOf('musician') >= 0) {
        qText = 'Which Indian musician died in 2026?';
      } else {
        qText = 'Which Indian personality died in July 2026?';
      }
      var q = makeQuestion(qText, e.name, seq++, 'Wikipedia - Deaths in 2026', '\uD83D\uDD4A', e.name + ': ' + e.desc.substring(0, 150));
      if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
    });
    console.error('  ' + count + ' obituary questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Obituaries';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[subKey].length + 1;

  await fetchDeaths(existingKeys, newQuestions, seq);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nObituaries: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });

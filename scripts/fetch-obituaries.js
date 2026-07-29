var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function clean(v) {
  return v.replace(/&#160;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/[[\d\s,\-]+]|&#91;[\d\s,\-]+&#93;/g, '').replace(/\s+/g, ' ').trim();
}

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url, { agent: AGENT, headers: { 'User-Agent': 'ObitBot/2.0' } }, function(res) {
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

function isIndianNotable(name, desc) {
  var text = (name + ' ' + desc);

  if (/Indian|India\b/i.test(text)) return true;

  if (/Bollywood|Tollywood|Kollywood|Mollywood/i.test(text)) return true;

  if (/Padma Shri|Padma Bhushan|Padma Vibhushan|Bharat Ratna|Sahitya Akademi|Dadasaheb Phalke|National Film Award/i.test(text)) return true;

  if (/Chief Minister|Chief Justice|Governor of|Cabinet Secretary|Comptroller and Auditor General|Election Commissioner|Attorney General|Solicitor General/i.test(text)) return true;

  if (/Lok Sabha|Rajya Sabha|Member of Parliament|MP from|MLA from|former MP|former MLA|Union Minister|Deputy Speaker/i.test(text)) return true;

  if (/IIT |IIM |AIIMS|NIT |ISRO|DRDO|BARC|TIFR|ICAR|CSIR|ICMR/i.test(text)) return true;

  if (/\bPresident of India\b|\bPrime Minister of India\b|\bVice President of India\b/i.test(text)) return true;

  if (/Nobel (laureate|Prize|winner)/i.test(text)) return true;

  if (/Maharashtra|Tamil Nadu|Uttar Pradesh|Karnataka|Gujarat|Rajasthan|Kerala|Odisha|West Bengal|Andhra Pradesh|Telangana|Madhya Pradesh|Bihar|Punjab|Haryana|Assam|Jharkhand|Chhattisgarh|Uttarakhand|Himachal Pradesh|Goa|Manipur|Meghalaya|Nagaland|Tripura|Mizoram|Sikkim|Arunachal Pradesh|Puducherry|Delhi|Jammu and Kashmir|Ladakh|Andaman|Nicobar|Lakshadweep|Dadra|Daman|Diu/i.test(text)) return true;

  var lc = text.toLowerCase();
  if (/(?:noted|veteran|renowned|eminent|distinguished|prominent)\s+(?:indian\s+)?(?:actor|actress|singer|musician|dancer|filmmaker|director|producer|writer|poet|author|artist|painter|scientist|educationist|philanthropist|industrialist|journalist|lawyer|diplomat|bureaucrat|cricketer|sportsperson|athlete|historian|economist|social worker|freedom fighter|gandhian|spiritual|yogi|politician)/i.test(lc)) return true;

  if (/indian\s+(?:actor|actress|singer|musician|dancer|filmmaker|director|producer|writer|poet|author|artist|painter|scientist|educationist|philanthropist|industrialist|journalist|lawyer|diplomat|bureaucrat|cricketer|sportsperson|athlete|historian|economist|social worker|freedom fighter|gandhian|politician|saint|guru|swami|scholar)/i.test(lc)) return true;

  if (/\b(?:India Today|The Hindu|Times of India|Hindustan Times|Indian Express|NDTV|Doordarshan|All India Radio|Prasar Bharati)\b/i.test(text)) return true;

  return false;
}

function extractDateEntries(html) {
  var entries = [];
  var currentMonth = 'July 2026';
  var year = new Date().getFullYear();

  var blocks = html.split(/<div class="mw-heading mw-heading[23]">/);
  for (var bi = 1; bi < blocks.length; bi++) {
    var block = blocks[bi];

    var monthMatch = block.match(/<h2[^>]*id="(January|February|March|April|May|June|July|August|September|October|November|December)"[^>]*>/);
    if (monthMatch) {
      currentMonth = monthMatch[1] + ' ' + year;
      continue;
    }

    var dayMatch = block.match(/<h3[^>]*id="(\d+)"[^>]*>/);
    if (!dayMatch) continue;
    var day = parseInt(dayMatch[1], 10);

    var liRegex = /<li>([\s\S]*?)<\/li>/gi;
    var lm;
    while ((lm = liRegex.exec(block)) !== null) {
      var liContent = lm[1];
      var nameMatch = liContent.match(/<a[^>]*>([\s\S]*?)<\/a>/);
      if (!nameMatch) continue;
      var name = clean(nameMatch[1]);
      if (!name || name.length < 3) continue;

      var desc = liContent.substring(nameMatch.index + nameMatch[0].length);
      desc = clean(desc);

      if (isIndianNotable(name, desc)) {
        entries.push({ name: name, desc: desc, day: day, month: currentMonth });
      }
    }
  }
  return entries;
}

function findCategory(desc) {
  var lc = desc.toLowerCase();
  if (/politician|chief minister|governor|mp |mla |minister|speaker|member of parliament|member of legislative/i.test(lc)) return 'politician';
  if (/actor|actress|film |cinema|movie|director|producer|theatre/i.test(lc)) return 'actor';
  if (/writer|poet|author|novelist|playwright|journalist|columnist|correspondent|editor/i.test(lc)) return 'writer';
  if (/singer|musician|composer|vocalist|flautist|pianist|guitarist|violinist|percussionist/i.test(lc)) return 'singer';
  if (/scientist|physicist|chemist|biologist|mathematician|engineer|researcher|professor|academician/i.test(lc)) return 'scientist';
  if (/sport|cricketer|cricket|football|hockey|athlete|olympian|badminton|tennis|boxer|wrestler|player|chess/i.test(lc)) return 'sportsperson';
  if (/artist|painter|sculptor|dancer|choreographer/i.test(lc)) return 'artist';
  if (/justice|judge|lawyer|advocate|jurist/i.test(lc)) return 'judge';
  if (/industrialist|business|entrepreneur|tycoon|banker/i.test(lc)) return 'industrialist';
  if (/social worker|activist|philanthropist|gandhian|freedom fighter/i.test(lc)) return 'social worker';
  if (/spiritual|guru|swami|saint|mahant|yogi|religious/i.test(lc)) return 'religious leader';
  if (/diplomat|ambassador|foreign service|envoy|high commissioner/i.test(lc)) return 'diplomat';
  if (/bureaucrat|secretary|commissioner|officer|ias|ips|ifs/i.test(lc)) return 'bureaucrat';
  return 'personality';
}

var QUESTION_TEMPLATES = {
  'politician': [
    'Which Indian politician died in {month}?',
    'Which Indian political leader passed away in {month}?',
    'Who among the following Indian politicians died in {month}?'
  ],
  'actor': [
    'Which Indian actor died in {month}?',
    'Which Indian film personality passed away in {month}?',
    'Who among the following Indian actors died in {month}?'
  ],
  'writer': [
    'Which Indian writer died in {month}?',
    'Which Indian author passed away in {month}?',
    'Which Indian literary figure died in {month}?'
  ],
  'singer': [
    'Which Indian musician died in {month}?',
    'Which Indian singer passed away in {month}?',
    'Who among the following Indian singers died in {month}?'
  ],
  'scientist': [
    'Which Indian scientist died in {month}?',
    'Which Indian academician passed away in {month}?'
  ],
  'sportsperson': [
    'Which Indian sportsperson died in {month}?',
    'Which Indian athlete passed away in {month}?'
  ],
  'artist': [
    'Which Indian artist died in {month}?',
    'Which Indian painter/sculptor passed away in {month}?'
  ],
  'judge': [
    'Which Indian judge died in {month}?',
    'Which former Indian judge passed away in {month}?'
  ],
  'industrialist': [
    'Which Indian industrialist died in {month}?',
    'Which Indian business leader passed away in {month}?'
  ],
  'social worker': [
    'Which Indian social worker died in {month}?',
    'Which Indian activist passed away in {month}?'
  ],
  'religious leader': [
    'Which Indian religious leader died in {month}?',
    'Which Indian spiritual leader passed away in {month}?'
  ],
  'diplomat': [
    'Which Indian diplomat died in {month}?',
    'Which former Indian diplomat passed away in {month}?'
  ],
  'bureaucrat': [
    'Which Indian bureaucrat died in {month}?',
    'Which former Indian civil servant passed away in {month}?'
  ],
  'personality': [
    'Which Indian personality died in {month}?',
    'Which noted Indian personality passed away in {month}?',
    'Who among the following notable Indians died in {month}?'
  ]
};

function pickTemplate(category, month) {
  var templates = QUESTION_TEMPLATES[category] || QUESTION_TEMPLATES['personality'];
  var tmpl = templates[Math.floor(Math.random() * templates.length)];
  return tmpl.replace('{month}', month);
}

async function fetchDeaths(existingKeys, newQuestions, seq) {
  console.error('\n--- Notable Deaths 2026 ---');
  try {
    var html = await fetchPage('Deaths_in_2026');
    var entries = extractDateEntries(html);
    var count = 0;
    entries.forEach(function(e) {
      var cat = findCategory(e.desc);
      var qText = pickTemplate(cat, e.month);
      var q = makeQuestion(qText, e.name, seq++, 'Wikipedia - Deaths in 2026', '\uD83D\uDD4A', e.name + ': ' + e.desc.substring(0, 200));
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

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ApptBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

var OFFICES = [
  { page: 'Chief_of_the_Army_Staff_(India)', label: 'Chief of the Army Staff', field: 'title', q: 'Who is the current Chief of the Army Staff (COAS) of India?', emoji: '\uD83C\uDFC1' },
  { page: 'Chief_of_the_Naval_Staff_(India)', label: 'Chief of the Naval Staff', field: 'title', q: 'Who is the current Chief of the Naval Staff (CNS) of India?', emoji: '\uD83D\uDEE5' },
  { page: 'Chief_of_the_Air_Staff_(India)', label: 'Chief of the Air Staff', field: 'title', q: 'Who is the current Chief of the Air Staff (CAS) of India?', emoji: '\u2708' },
  { page: 'Chief_Election_Commissioner_of_India', label: 'Chief Election Commissioner', field: 'title', q: 'Who is the current Chief Election Commissioner (CEC) of India?', emoji: '\uD83D\uDDF3' },
  { page: 'Comptroller_and_Auditor_General_of_India', label: 'Comptroller and Auditor General', field: 'title', q: 'Who is the current Comptroller and Auditor General (CAG) of India?', emoji: '\uD83D\uDCCA' },
  { page: 'Chief_Justice_of_India', label: 'Chief Justice of India', field: 'title', q: 'Who is the current Chief Justice of India (CJI)?', emoji: '\u2696' },
  { page: 'Cabinet_Secretary_(India)', label: 'Cabinet Secretary', field: 'title', q: 'Who is the current Cabinet Secretary of India?', emoji: '\uD83C\uDFE2' },
  { page: 'Attorney_General_of_India', label: 'Attorney General', field: 'title', q: 'Who is the current Attorney General of India?', emoji: '\uD83D\uDC68\u200D\u2696' },
  // { page: 'Union_Public_Service_Commission', label: 'UPSC Chairperson', field: 'chairperson', q: 'Who is the current Chairperson of the Union Public Service Commission (UPSC)?', emoji: '\uD83C\uDFDB' },
  { page: 'Governor_of_the_Reserve_Bank_of_India', label: 'RBI Governor', field: 'title', q: 'Who is the current Governor of the Reserve Bank of India (RBI)?', emoji: '\uD83C\uDFE6' },
  { page: 'National_Security_Advisor_(India)', label: 'National Security Advisor', field: 'title', q: 'Who is the current National Security Advisor (NSA) of India?', emoji: '\uD83D\uDD12' }
];

function extractIncumbent(html) {
  var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return null;

  var section = m[1];
  var incIdx = section.indexOf('Incumbent');
  if (incIdx < 0) return null;

  // Take only up to the next closing </tr> to avoid including the organization row
  var rowEnd = section.indexOf('</tr>', incIdx);
  var incRow = rowEnd > incIdx ? section.substring(incIdx, rowEnd) : section.substring(incIdx, incIdx + 300);

  // Find all <a> tags after "Incumbent<br />" and take the first non-rank one
  var links = [];
  var linkRe = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  var lr;
  // Set lastIndex to start searching after "Incumbent<br />"
  linkRe.lastIndex = incRow.indexOf('Incumbent<br') + 14;
  while ((lr = linkRe.exec(incRow)) !== null) {
    var t = strip(lr[1]).replace(/\s+/g, ' ').trim();
    if (t.length > 0) links.push(t);
    if (links.length > 5) break;
  }

  var skipRanks = ['general', 'admiral', 'air chief marshal', 'marshal', 'justice'];
  for (var li = 0; li < links.length; li++) {
    var lower = links[li].toLowerCase();
    var isRank = false;
    for (var sr = 0; sr < skipRanks.length; sr++) {
      if (lower === skipRanks[sr] || lower.indexOf(skipRanks[sr] + ' ') === 0) { isRank = true; break; }
    }
    if (isRank) continue;
    var name = links[li].replace(/,?\s*(PVSM|UYSM|AVSM|VSM|SM|KC|SC|ADC|PHSM|PSM|MVC|KCMG|OM|AC|PC|AFMC|Bar)\b/gi, '').trim();
    name = name.replace(/\s+/g, ' ').trim();
    if (name.length >= 3 && name.length < 100) return name;
  }

  return null;
}

async function fetchAppointment(office) {
  try {
    var res = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(office.page) + '&prop=text&section=0&format=json');
    if (!res || !res.parse || !res.parse.text) return null;
    return extractIncumbent(res.parse.text['*']);
  } catch (e) {
    return null;
  }
}

function makeQuestion(office, name, seq) {
  if (!name) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'appt_' + pad(seq);

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia - ' + office.page,
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'Appointments',
    emoji: office.emoji,
    question: office.q,
    answer: name,
    hint: '',
    fact: 'The current ' + office.label + ' of India is ' + name + '. (as per Wikipedia)'
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) { console.error('Error reading pib-archive.json: ' + e.message); }
  }

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Appointments']) existing[CA_KEY].subSubjects['Appointments'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Appointments'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Appointments'].length + 1;

  for (var oi = 0; oi < OFFICES.length; oi++) {
    process.stdout.write('  ' + OFFICES[oi].label + '... ');
    var name = await fetchAppointment(OFFICES[oi]);
    if (name) {
      process.stdout.write(name.substring(0, 50) + '\n');
    } else {
      process.stdout.write('NOT FOUND\n');
    }

    var q = makeQuestion(OFFICES[oi], name, seq);
    if (q) {
      var key = eventKey(q);
      if (!existingKeys[key]) {
        newQuestions.push(q);
        existingKeys[key] = true;
        seq++;
        process.stdout.write('    \u2713\n');
      } else {
        process.stdout.write('    (dup)\n');
      }
    }

    await delay(600);
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Appointments'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Appointments'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nAppointments: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

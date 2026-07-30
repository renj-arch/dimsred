var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ApptBot/2.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

var OFFICES = [
  { page: 'Chief_of_the_Army_Staff_(India)', label: 'Chief of the Army Staff', q: 'Who is the current Chief of the Army Staff (COAS) of India?', emoji: '\uD83C\uDFC1' },
  { page: 'Chief_of_the_Naval_Staff_(India)', label: 'Chief of the Naval Staff', q: 'Who is the current Chief of the Naval Staff (CNS) of India?', emoji: '\uD83D\uDEE5' },
  { page: 'Chief_of_the_Air_Staff_(India)', label: 'Chief of the Air Staff', q: 'Who is the current Chief of the Air Staff (CAS) of India?', emoji: '\u2708' },
  { page: 'Chief_of_Defence_Staff_(India)', label: 'Chief of Defence Staff', q: 'Who is the current Chief of Defence Staff (CDS) of India?', emoji: '\uD83C\uDFC1' },
  { page: 'Chief_Election_Commissioner_of_India', label: 'Chief Election Commissioner', q: 'Who is the current Chief Election Commissioner (CEC) of India?', emoji: '\uD83D\uDDF3' },
  { page: 'Comptroller_and_Auditor_General_of_India', label: 'Comptroller and Auditor General', q: 'Who is the current Comptroller and Auditor General (CAG) of India?', emoji: '\uD83D\uDCCA' },
  { page: 'Chief_Justice_of_India', label: 'Chief Justice of India', q: 'Who is the current Chief Justice of India (CJI)?', emoji: '\u2696' },
  { page: 'Cabinet_Secretary_(India)', label: 'Cabinet Secretary', q: 'Who is the current Cabinet Secretary of India?', emoji: '\uD83C\uDFE2' },
  { page: 'Attorney_General_of_India', label: 'Attorney General', q: 'Who is the current Attorney General of India?', emoji: '\uD83D\uDC68\u200D\u2696' },
  { page: 'Solicitor_General_of_India', label: 'Solicitor General', q: 'Who is the current Solicitor General of India?', emoji: '\uD83D\uDC68\u200D\u2696' },
  { page: 'Governor_of_the_Reserve_Bank_of_India', label: 'RBI Governor', q: 'Who is the current Governor of the Reserve Bank of India (RBI)?', emoji: '\uD83C\uDFE6' },
  { page: 'National_Security_Advisor_(India)', label: 'National Security Advisor', q: 'Who is the current National Security Advisor (NSA) of India?', emoji: '\uD83D\uDD12' },
  { page: 'Union_Public_Service_Commission', label: 'UPSC Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the Union Public Service Commission (UPSC)?', emoji: '\uD83C\uDFDB' },
  { page: 'National_Human_Rights_Commission_of_India', label: 'NHRC Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Human Rights Commission (NHRC) of India?', emoji: '\uD83D\uDCED' },
  { page: 'Central_Vigilance_Commission_(India)', label: 'CVC', labelField: 'Commissioner', q: 'Who is the current Central Vigilance Commissioner (CVC) of India?', emoji: '\uD83D\uDD0D' },
  { page: 'Central_Information_Commission', label: 'CIC', labelField: 'Chief Information Commissioner', q: 'Who is the current Chief Information Commissioner (CIC) of India?', emoji: '\uD83D\uDCC4' },
  { page: 'Law_Commission_of_India', label: 'Law Commission Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the Law Commission of India?', emoji: '\uD83D\uDCD6' },
  { page: 'Finance_Commission_(India)', label: 'Finance Commission Chairperson', labelField: 'Chairman', q: 'Who is the current Chairman of the Finance Commission of India?', emoji: '\uD83D\uDCB0' },
  { page: 'Securities_and_Exchange_Board_of_India', label: 'SEBI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of SEBI?', emoji: '\uD83D\uDCCA' },
  { page: 'Telecom_Regulatory_Authority_of_India', label: 'TRAI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of TRAI?', emoji: '\uD83D\uDCF1' },
  { page: 'Competition_Commission_of_India', label: 'CCI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the Competition Commission of India (CCI)?', emoji: '\u2696' },
  { page: 'Insurance_Regulatory_and_Development_Authority', label: 'IRDAI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of IRDAI?', emoji: '\uD83D\uDCB3' },
  { page: 'National_Commission_for_Scheduled_Castes', label: 'NCSC Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Scheduled Castes (NCSC)?', emoji: '\uD83E\uDDD1\u200D\u2696' },
  { page: 'National_Commission_for_Scheduled_Tribes', label: 'NCST Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Scheduled Tribes (NCST)?', emoji: '\uD83E\uDDD1\u200D\u2696' },
  { page: 'National_Commission_for_Women_(India)', label: 'NCW Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Women (NCW)?', emoji: '\uD83D\uDC69\u200D\u2696' },
];

function extractIncumbent(html, labelField) {
  var m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return null;
  var section = m[1];

  var labelsToTry = ['Incumbent'];
  if (labelField) {
    labelsToTry.push(labelField);
    if (labelField === 'Chairperson') labelsToTry.push('Chairman');
    if (labelField === 'Commissioner') labelsToTry.push('Chief Commissioner');
  }

  var rows = section.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return null;

  var skipWords = ['general', 'admiral', 'air chief marshal', 'marshal', 'chairperson', 'chairman', 'commissioner', 'secretary'];

  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri];
    var thMatch = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var tdMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!tdMatch) continue;

    var thText = thMatch ? strip(thMatch[1]).toLowerCase() : '';
    var tdContent = tdMatch[1];
    var tdText = strip(tdContent).toLowerCase();

    var matchedLabel = null;
    for (var li = 0; li < labelsToTry.length; li++) {
      if (thText.indexOf(labelsToTry[li].toLowerCase()) >= 0 || tdText.indexOf(labelsToTry[li].toLowerCase()) >= 0) {
        matchedLabel = labelsToTry[li];
        break;
      }
    }
    if (!matchedLabel) continue;

    var labelInTd = tdText.indexOf(matchedLabel.toLowerCase()) >= 0;
    var labelPos = labelInTd ? tdContent.toLowerCase().indexOf(matchedLabel.toLowerCase()) : -1;

    var allLinks = [];
    var linkRe = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    var lr;
    while ((lr = linkRe.exec(tdContent)) !== null) {
      allLinks.push({ text: strip(lr[1]).replace(/\s+/g, ' ').trim(), pos: lr.index });
    }

    var candidateLinks = labelInTd ? allLinks.filter(function(l) { return l.pos < labelPos; }) : allLinks;

    for (var ni = 0; ni < candidateLinks.length; ni++) {
      var text = candidateLinks[ni].text;
      var lower = text.toLowerCase();
      var isSkip = false;
      for (var sw = 0; sw < skipWords.length; sw++) {
        if (lower === skipWords[sw]) { isSkip = true; break; }
      }
      if (isSkip) continue;
      if (/^(www\.|https?:)/.test(lower) || lower.indexOf('.gov') >= 0 || lower.indexOf('.nic') >= 0) continue;
      var name = text.replace(/,?\s*(PVSM|UYSM|AVSM|VSM|SM|KC|SC|ADC|PHSM|PSM|MVC|KCMG|OM|AC|PC|AFMC|Bar)\b/gi, '').trim();
      name = name.replace(/\s+/g, ' ').trim();
      if (name.length >= 3 && name.length < 100) return name;
    }

    // Plain text fallback (for rows with no <a> tags around the name)
    var plainText = tdContent.replace(/<[^>]+>/g, ' ').replace(/\[.*?\]/g, '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    var segments = plainText.split(/[,;]/);
    for (var si = 0; si < segments.length; si++) {
      var seg = segments[si].trim();
      if (seg.length < 3) continue;
      var segLower = seg.toLowerCase();
      var isSkip = false;
      for (var sw2 = 0; sw2 < skipWords.length; sw2++) {
        if (segLower.indexOf(skipWords[sw2]) >= 0) { isSkip = true; break; }
      }
      if (isSkip) continue;
      if (segLower.indexOf('.gov') >= 0 || segLower.indexOf('.nic') >= 0 || segLower.indexOf('www') >= 0 || segLower.indexOf('https') >= 0) continue;
      if (seg.length < 100) return seg;
    }
  }

  return null;
}

async function fetchAppointment(office) {
  try {
    var res = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(office.page) + '&prop=text&section=0&format=json');
    if (!res || !res.parse || !res.parse.text) return null;
    return extractIncumbent(res.parse.text['*'], office.labelField);
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
  var found = 0, notFound = 0;

  for (var oi = 0; oi < OFFICES.length; oi++) {
    process.stdout.write('  ' + OFFICES[oi].label + '... ');
    var name = await fetchAppointment(OFFICES[oi]);
    if (name) {
      process.stdout.write(name.substring(0, 50) + '\n');
      found++;
    } else {
      process.stdout.write('NOT FOUND\n');
      notFound++;
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

  console.error('\nFound: ' + found + ', Not found: ' + notFound);

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

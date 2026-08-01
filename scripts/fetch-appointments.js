var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var bio = require('./bio-cache');

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
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

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
  { page: 'Central_Vigilance_Commission', label: 'CVC', labelField: 'Commissioner', q: 'Who is the current Central Vigilance Commissioner (CVC) of India?', emoji: '\uD83D\uDD0D' },
  { page: 'Central_Information_Commission', label: 'CIC', labelField: 'Chief Information Commissioner', q: 'Who is the current Chief Information Commissioner (CIC) of India?', emoji: '\uD83D\uDCC4' },
  { page: 'Law_Commission_of_India', label: 'Law Commission Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the Law Commission of India?', emoji: '\uD83D\uDCD6' },
  { page: 'Finance_Commission', label: 'Finance Commission Chairperson', labelField: 'Chairman', q: 'Who is the current Chairman of the Finance Commission of India?', emoji: '\uD83D\uDCB0' },
  { page: 'Securities_and_Exchange_Board_of_India', label: 'SEBI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of SEBI?', emoji: '\uD83D\uDCCA' },
  { page: 'Telecom_Regulatory_Authority_of_India', label: 'TRAI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of TRAI?', emoji: '\uD83D\uDCF1' },
  { page: 'Competition_Commission_of_India', label: 'CCI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the Competition Commission of India (CCI)?', emoji: '\u2696' },
  { page: 'Insurance_Regulatory_and_Development_Authority', label: 'IRDAI Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of IRDAI?', emoji: '\uD83D\uDCB3' },
  { page: 'National_Commission_for_Scheduled_Castes', label: 'NCSC Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Scheduled Castes (NCSC)?', emoji: '\uD83E\uDDD1\u200D\u2696' },
  { page: 'National_Commission_for_Scheduled_Tribes', label: 'NCST Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Scheduled Tribes (NCST)?', emoji: '\uD83E\uDDD1\u200D\u2696' },
  { page: 'National_Commission_for_Women', label: 'NCW Chairperson', labelField: 'Chairperson', q: 'Who is the current Chairperson of the National Commission for Women (NCW)?', emoji: '\uD83D\uDC69\u200D\u2696' },
];

var DECOR = ['PVSM','UYSM','AVSM','VSM','SM','KC','SC','ADC','PHSM','PSM','MVC','KCMG','OM','AC','PC','AFMC','Bar','IRSE','ITS','IAS','IPS','IFS','IRS','CAF','AVSM'];
var BAD_WORDS = ['incumbent','chairperson','chairman','commissioner','secretary','member','members','general','admiral','marshal','since','appointed','ex-officio','part-time','permanent','full-time','member-secretary','the','of','and','in','on','at','for','with','took','charge','assumed','official','officer','present','current','former'];

function cleanName(s) {
  if (!s) return '';
  return s
    .replace(/\s+/g, ' ')
    .replace(/&#\d+;?/g, ' ')
    .replace(/\b(?:Incumbent|Justice|Justice \(Retd\)|Retd|Hon'ble|Shri|Shri\.|Dr|Prof|Mr|Mrs|Ms|Sir|Smt|General|Admiral|Air Chief Marshal|Marshal|Air Marshal|Vice Admiral|Rear Admiral|Lt Gen|Lieutenant General)\b/gi, ' ')
    .replace(new RegExp('\\b(?:' + DECOR.join('|') + ')\\b', 'gi'), ' ')
    .replace(/\bsince\b.*$/i, ' ')
    .replace(/\b(?:since|as of)?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\s*$/i, ' ')
    .replace(new RegExp('\\b(?:' + BAD_WORDS.join('|') + ')\\b', 'gi'), ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

function isPersonName(s) {
  if (!s) return false;
  var t = s.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/(?:^|\s)(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{2,4})?|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b20\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i.test(t)) return false;
  var words = t.split(/\s+/);
  var namey = words.filter(function(w) {
    if (!w) return false;
    if (/^\d/.test(w)) return false;
    if (w === w.toLowerCase() && w.indexOf('.') === -1) return false;
    return true;
  });
  if (namey.length === 0) return false;
  var joined = namey.join(' ');
  if (new RegExp('\\b(?:' + BAD_WORDS.join('|') + ')\\b', 'i').test(joined)) return false;
  return true;
}

function extractNameFromCell(tdContent) {
  var allLinks = [];
  var linkRe = /<a[^>]*>([\s\S]*?)<\/a>/gi, lr;
  while ((lr = linkRe.exec(tdContent)) !== null) {
    allLinks.push(strip(lr[1]).replace(/\s+/g, ' ').trim());
  }
  for (var i = 0; i < allLinks.length; i++) {
    var cand = cleanName(allLinks[i]);
    if (isPersonName(cand)) return cand;
  }
  var text = strip(tdContent);
  var segments = text.split(/[,;|]/);
  for (var s = 0; s < segments.length; s++) {
    var seg = cleanName(segments[s]);
    if (isPersonName(seg)) return seg;
  }
  return null;
}

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

  var parsed = [];
  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri];
    var thMatch = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var tdMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!tdMatch) continue;
    parsed.push({ th: thMatch ? strip(thMatch[1]).toLowerCase() : '', td: tdMatch[1] });
  }

  var l, r, n;
  for (r = 0; r < parsed.length; r++) {
    for (l = 0; l < labelsToTry.length; l++) {
      if (parsed[r].th.indexOf(labelsToTry[l].toLowerCase()) >= 0) {
        n = extractNameFromCell(parsed[r].td);
        if (n) return n;
      }
    }
  }
  for (r = 0; r < parsed.length; r++) {
    var tdText = strip(parsed[r].td).toLowerCase();
    for (l = 0; l < labelsToTry.length; l++) {
      if (tdText.indexOf(labelsToTry[l].toLowerCase()) >= 0) {
        n = extractNameFromCell(parsed[r].td);
        if (n) return n;
      }
    }
  }

  var FALLBACK_HDRS = ['executive', 'key people', 'leaders', 'officials'];
  for (r = 0; r < parsed.length; r++) {
    var matched = false;
    for (l = 0; l < FALLBACK_HDRS.length; l++) {
      if (parsed[r].th.indexOf(FALLBACK_HDRS[l]) >= 0) { matched = true; break; }
    }
    if (!matched) continue;
    n = extractNameFromCell(parsed[r].td);
    if (n) return n;
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
    source: '' + office.page,
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'Appointments',
    emoji: office.emoji,
    question: office.q,
    answer: name,
    hint: '',
    fact: 'The current ' + office.label + ' of India is ' + name + '. '
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function questionKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim().toLowerCase(); };
  return n(q.question || '');
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

  var bioCache = bio.loadBioCache();

  var list = existing[CA_KEY].subSubjects['Appointments'];
  var byQuestion = {};
  var usedIds = {};
  list.forEach(function(q) {
    byQuestion[questionKey(q)] = q;
    var m = (q.id || '').match(/^appt_(\d+)$/);
    if (m) usedIds[parseInt(m[1], 10)] = true;
  });

  var maxSeq = 0;
  Object.keys(usedIds).forEach(function(k) { if (parseInt(k, 10) > maxSeq) maxSeq = parseInt(k, 10); });
  var seq = maxSeq + 1;

  var found = 0, notFound = 0, updated = 0, added = 0;

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
    if (!q) continue;

    var personBio = await bio.getBio(name, bioCache);
    if (personBio) q.fact += ' ' + personBio;

    var qkey = questionKey(q);
    var existingQ = byQuestion[qkey];
    if (existingQ) {
      if ((existingQ.answer || '').trim().toLowerCase() !== (q.answer || '').trim().toLowerCase()) {
        var old = existingQ.answer;
        existingQ.answer = q.answer;
        existingQ.fact = q.fact;
        existingQ.pubDate = q.pubDate;
        existingQ.source = q.source;
        updated++;
        process.stdout.write('    updated ' + old + ' -> ' + q.answer + '\n');
      } else {
        var bareFact = 'The current ' + OFFICES[oi].label + ' of India is ' + name + '. ';
        if (personBio && existingQ.fact === bareFact) {
          existingQ.fact = q.fact;
          process.stdout.write('    (bio enriched)\n');
        } else {
          process.stdout.write('    (unchanged)\n');
        }
      }
    } else {
      q.id = 'appt_' + pad(seq);
      seq++;
      list.push(q);
      byQuestion[qkey] = q;
      added++;
      process.stdout.write('    \u2713 added\n');
    }

    await delay(600);
  }

  console.error('\nFound: ' + found + ', Not found: ' + notFound + ', Updated: ' + updated + ', Added: ' + added);

  var total = list.length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nAppointments: ' + total + ' total questions (' + updated + ' refreshed, ' + added + ' new)');

  bio.saveBioCache(bioCache);
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

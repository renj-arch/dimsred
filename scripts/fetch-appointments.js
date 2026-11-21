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
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ApptBot/2.0' } }, function(res) {
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
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(new Error('Request timeout')); });
  });
}

function httpPost(url, data, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var parsed = new URL(url);
    var opts = {
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data), 'User-Agent': 'ApptBot/2.0' }
    };
    var req = https.request(opts, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if ((res.statusCode === 429 || res.statusCode >= 500) && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP ' + res.statusCode + ', retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { httpPost(url, data, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200)));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
    req.setTimeout(180000, function() { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

var OFFICES_CONST = [
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

// Curated position lists that Wikidata does NOT model with a current officeholder
// (P1308), so the auto-discovery query below can't return them. The incumbent
// is still fetched live each run from each position's Wikipedia "List of ..."
// infobox, so answers stay current automatically. Includes all state Governors,
// all state Chief Ministers, and the Chief Justices of the High Courts.
var STATE_GOVERNORS = [];
var STATE_CMS = [];
var HC_CHIEF_JUSTICES = [];
(function () {
  const GOV = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
  GOV.forEach(function (s) {
    var page = 'List_of_governors_of_' + s.replace(/\s+/g, '_');
    if (s === 'Punjab') page = 'List_of_governors_of_Punjab,_India';
    STATE_GOVERNORS.push({ page: page, label: 'Governor of ' + s, labelField: 'Incumbent', q: 'Who is the current Governor of ' + s + '?', emoji: '\uD83C\uDFDB' });
  });
  ['Jharkhand','Manipur','Meghalaya','Punjab','Sikkim'].forEach(function (s) {
    var page = 'List_of_chief_ministers_of_' + s.replace(/\s+/g, '_');
    if (s === 'Punjab') page = 'Chief_Minister_of_Punjab,_India';
    STATE_CMS.push({ page: page, label: 'Chief Minister of ' + s, labelField: 'Incumbent', q: 'Who is the current Chief Minister of ' + s + '?', emoji: '\uD83C\uDFE2' });
  });
  // Chief Justices of the High Courts are all listed (with the current incumbent)
  // in one consolidated Wikipedia article, not in per-court infoboxes. We parse
  // that table at runtime, so no per-HC page fetch is needed. `hcCourt` is the
  // exact "High Court" column value we match against.
  const HCS = {
    'Allahabad': 'Allahabad', 'Andhra Pradesh': 'Andhra Pradesh', 'Bombay': 'Bombay', 'Calcutta': 'Calcutta', 'Chhattisgarh': 'Chhattisgarh', 'Delhi': 'Delhi', 'Gauhati': 'Gauhati', 'Gujarat': 'Gujarat', 'Himachal Pradesh': 'Himachal Pradesh', 'Jammu and Kashmir and Ladakh': 'Jammu &amp; Kashmir and Ladakh', 'Jharkhand': 'Jharkhand', 'Karnataka': 'Karnataka', 'Kerala': 'Kerala', 'Madhya Pradesh': 'Madhya Pradesh', 'Madras': 'Madras', 'Manipur': 'Manipur', 'Meghalaya': 'Meghalaya', 'Mizoram': 'Mizoram', 'Nagaland': 'Nagaland', 'Orissa': 'Orissa', 'Patna': 'Patna', 'Punjab and Haryana': 'Punjab &amp; Haryana', 'Rajasthan': 'Rajasthan', 'Sikkim': 'Sikkim', 'Telangana': 'Telangana', 'Tripura': 'Tripura', 'Uttarakhand': 'Uttarakhand'
  };
  Object.keys(HCS).forEach(function (hc) {
    HC_CHIEF_JUSTICES.push({ page: 'List_of_Chief_Justices_of_High_Courts_of_India', courtKey: HCS[hc], label: 'Chief Justice of the ' + hc + ' High Court', q: 'Who is the current Chief Justice of the ' + hc + ' High Court?', emoji: '\u2696' });
  });
})();
var OFFICES = OFFICES_CONST.concat(STATE_GOVERNORS).concat(STATE_CMS).concat(HC_CHIEF_JUSTICES);

// Parse the consolidated "List of Chief Justices of High Courts of India" article
// into a map of "High Court" column value -> current Chief Justice name. One
// fetch + one table parse for all High Courts. Returns {} on any failure.
async function fetchHighCourtJustices() {
  const TITLE = 'List_of_Chief_Justices_of_High_Courts_of_India';
  try {
    var res = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(TITLE) + '&redirects=1&prop=text&format=json');
    if (!res || !res.parse || !res.parse.text) return {};
    var html = res.parse.text['*'];
    var tbls = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || [];
    var t = tbls[tbls.length - 1];
    if (!t) return {};
    var rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    var out = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var th = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      if (!th) continue;
      var hcName = strip(th[1]).replace(/\s+/g, ' ').trim();
      if (!/High Court/.test(hcName)) continue;
      var tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (tds.length < 2) continue;
      var name = extractNameFromCell(tds[1]);
      if (name) out[hcName] = name;
    }
    return out;
  } catch (e) {
    return {};
  }
}

var WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

// Auto-discovery of India office-holder positions with a current incumbent.
// Uses the Wikidata "office holder position" (Q4164871) subclass tree scoped to
// India (P17=Q668), returning positions that currently have an officeholder
// (P1308). This finds far more posts than the curated OFFICES list (state CMs,
// governors, ministers, HC chief justices, service chiefs, etc.) and stays
// current automatically as incumbents change.
var DISCOVER_QUERY = `
SELECT ?position ?positionLabel ?holderLabel ?article WHERE {
  ?position wdt:P31/wdt:P279* wd:Q4164871 .
  ?position p:P1308 ?st .
  ?st ps:P1308 ?holder .
  FILTER NOT EXISTS { ?st pq:P582 ?end . }
  { ?position wdt:P17 wd:Q668 . }
  UNION
  { ?holder wdt:P27 wd:Q668 . }
  OPTIONAL {
    ?article schema:about ?position .
    ?article schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

// Convert a Wikipedia article URL (or Q-id) into a wiki page title.
function articleToPage(articleUrl) {
  if (!articleUrl) return '';
  var m = /\/wiki\/([^#?]+)/.exec(articleUrl);
  if (m) return decodeURIComponent(m[1]);
  var q = /entity\/(Q\d+)/.exec(articleUrl);
  return q ? q[1] : '';
}

// Convert a position label into a best-guess Wikipedia article title.
function labelToPage(label) {
  return (label || '').replace(/\s+/g, '_');
}

// Batch-resolve position titles to their final article titles (following
// redirects), in chunks of 50. Single API call per chunk. Returns a map of
// originalTitle -> finalTitle.
async function resolvePages(titles) {
  var map = {};
  var uniq = [];
  titles.forEach(function(t) { if (t && uniq.indexOf(t) === -1) uniq.push(t); });
  if (!uniq.length) return map;
  var CHUNK = 50;
  for (var c = 0; c < uniq.length; c += CHUNK) {
    var chunk = uniq.slice(c, c + CHUNK);
    try {
      var res = await fetchJSON(API + '?action=query&redirects=1&titles=' + encodeURIComponent(chunk.join('|')) + '&format=json');
      var pages = res && res.query && res.query.pages;
      if (!pages) continue;
      var normalized = {};
      var redirects = {};
      (res.query.normalized || []).forEach(function(r) { normalized[r.from] = r.to; });
      (res.query.redirects || []).forEach(function(r) { redirects[r.from] = r.to; });
      Object.keys(pages).forEach(function(id) {
        var p = pages[id];
        if (p.missing) return;
        var final = p.title;
        // Map each requested title -> final title: normalize, then follow redirects.
        chunk.forEach(function(t) {
          var step = normalized[t] || t;
          if (redirects[step]) {
            if (redirects[step] === final) map[t] = final;
          } else {
            if (step === final) map[t] = final;
          }
        });
      });
    } catch (e) {
      continue;
    }
  }
  return map;
}

// Post labels that are NOT useful exam-style appointment questions.
var NOISE_PATTERNS = [
  /\bMayor of\b/i,
  /\bPrincipal of\b/i,
  /\bschool\b/i,
  /\bcollege\b/i,
  /\buniversity\b/i,
  /\bGrand Mufti\b/i,
  /\bBishop of\b/i,
  /Leader of (?:the )?Opposition of [A-Z]/i, // state-level LoP, not national
  /Minister of .+ \(/,                     // state ministers (anything with a state qualifier)
  /Minister of .+, \w+/,                   // state ministers (Kerala, etc.)
  /Minister of Legislative Affairs/,       // niche
  /Deputy Leader of/,                      // niche deputy roles
  /Deputy leader of opposition/,           // niche deputy roles
  /Legislative Assembly/,                  // state-assembly staff roles
  /General Secretary/,                     // generic body secretary
  /Head of the Mission/,                   // redundant with ambassador/high-commissioner
  /\bCounsel to\b/,
  /\bQ\d+\b/                                 // label-less Q-entities
];

function isNoiseLabel(label) {
  for (var i = 0; i < NOISE_PATTERNS.length; i++) {
    if (NOISE_PATTERNS[i].test(label)) return true;
  }
  return false;
}

function normLabel(s) {
  return (s || '').toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

// Canonical key for deduping a position label: lowercase, parens stripped,
// trailing "(India)"/" of India"/" India" removed.
function dedupKey(s) {
  return normLabel(s).replace(/\s+(?:of\s+)?india\s*$/, '');
}

// Discover India office-holder positions from Wikidata. Returns a list of
// { position, positionLabel, holderLabel, page } deduped by normalized label.
// `page` is the position's English Wikipedia article title (used to verify the
// incumbent), or '' if none exists.
async function discoverPositions() {
  var res = await httpPost(WIKIDATA_SPARQL, 'format=json&query=' + encodeURIComponent(DISCOVER_QUERY));
  if (!res || !res.results || !res.results.bindings) return [];
  var seen = {};
  var out = [];
  for (var i = 0; i < res.results.bindings.length; i++) {
    var b = res.results.bindings[i];
    var label = b.positionLabel ? b.positionLabel.value : '';
    if (!label || isNoiseLabel(label)) continue;
    var key = normLabel(label);
    if (seen[key]) continue;
    seen[key] = true;
    out.push({
      position: b.position ? b.position.value : '',
      positionLabel: label,
      holderLabel: b.holderLabel ? b.holderLabel.value : '',
      page: articleToPage(b.article ? b.article.value : '')
    });
  }
  for (var j = 0; j < out.length; j++) {
    if (!out[j].page) out[j].page = labelToPage(out[j].positionLabel);
  }
  // Batch-resolve titles (following redirects) in one API call. Positions whose
  // guessed title doesn't exist are kept with the Wikidata holder fallback (their
  // incumbents are still known via Wikidata even without an English article).
  try {
    var map = await resolvePages(out.map(function(d) { return d.page; }));
    out.forEach(function(d) { if (map[d.page]) d.page = map[d.page]; });
  } catch (e) {}
  out.sort(function(a, b2) { return normLabel(a.positionLabel) < normLabel(b2.positionLabel) ? -1 : 1; });
  return out;
}

// Build a Wikipedia-backed "office" spec for a discovered position. The
// incumbent is preferred from the position's Wikipedia infobox (via
// fetchAppointment) so stale/vandalized Wikidata entries can't produce wrong
// answers. If the position has no English Wikipedia article (or its infobox
// has no incumbent row — e.g. governors, ambassadors), fall back to the
// Wikidata officeholder label carried over from the discovery query.
function discoveredToOffice(discovered) {
  var label = discovered.positionLabel;
  if (!label) return null;
  return {
    page: discovered.page || labelToPage(label),
    label: label,
    holderLabel: discovered.holderLabel || '',
    labelField: 'Incumbent',
    q: 'Who is the current ' + label + '?',
    emoji: '\uD83D\uDC68\u200D\uD83D\uDCBC',
    discovered: true
  };
}

var DECOR = ['PVSM','UYSM','AVSM','VSM','SM','KC','SC','ADC','PHSM','PSM','MVC','KCMG','OM','AC','PC','AFMC','Bar','IRSE','ITS','IAS','IPS','IFS','IRS','CAF','AVSM'];
var BAD_WORDS = ['incumbent','chairperson','chairman','commissioner','secretary','member','members','general','admiral','marshal','since','appointed','ex-officio','part-time','permanent','full-time','member-secretary','the','of','and','in','on','at','for','with','took','charge','assumed','official','officer','present','current','former'];

function cleanName(s) {
  if (!s) return '';
  return s
    .replace(/\s+/g, ' ')
    .replace(/&#\d+;?/g, ' ')
    .replace(/\b(?:Incumbent|Justice|Justice \(Retd\)|Retd|Hon'ble|Shri|Shri\.|Dr|Prof|Mr|Mrs|Ms|Sir|Smt|General|Admiral|Air Chief Marshal|Marshal|Air Marshal|Vice Admiral|Rear Admiral|Lt Gen|Lieutenant General)\b/gi, ' ')
    .replace(new RegExp('\\b(?:' + DECOR.join('|') + ')\\b', 'g'), ' ')
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
    if (/^[A-Z]{2,}$/.test(w) && w.indexOf('.') === -1) return false;
    return true;
  });
  if (namey.length === 0) return false;
  var joined = namey.join(' ');
  if (new RegExp('\\b(?:' + BAD_WORDS.join('|') + ')\\b', 'i').test(joined)) return false;
  if (/\b(?:ministry|department|board|council|commission|secretariat|university|committee|foundation|institute|authority|trust|forum|division|office of|government of|scheme|mission|programme|program|logo|emblem|insignia)\b/i.test(t)) return false;
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
  if (!labelField || labelField === 'Incumbent') {
    labelsToTry.push('Minister responsible', 'Ministers responsible', 'Minister');
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
    var res = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(office.page) + '&redirects=1&prop=text&section=0&format=json');
    if (!res || !res.parse || !res.parse.text) return null;
    return extractIncumbent(res.parse.text['*'], office.labelField);
  } catch (e) {
    return null;
  }
}

function makeQuestion(office, name, seq, fromWikiData) {
  if (!name) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'appt_' + pad(seq);
  var qText = office.q.replace(/\s*\?$/, '') + ' (' + now.getFullYear() + ')?';

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
    question: qText,
    answer: name,
    hint: '',
    fact: 'The current ' + office.label + ' of India is ' + name + ' (as of ' + now.getFullYear() + '). ',
    _fromWikiData: fromWikiData ? true : false
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

function questionKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\(\d{4}\)\s*\.?\??/g,'').replace(/\s+/g,' ').trim().toLowerCase(); };
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

  // Pre-fetch the consolidated High Court Chief Justice table (one fetch for all
  // 25 High Courts), used by candidates that carry a `courtKey`.
  var hcJustices = {};
  try { hcJustices = await fetchHighCourtJustices(); } catch (e) {}

  // Build dedup keys for curated offices (skip discovered positions that match,
  // e.g. a Wikidata "Chief of the Army Staff" vs curated COAS entry).
  var curatedKeys = [];
  OFFICES.forEach(function(o) {
    curatedKeys.push(dedupKey(o.page.replace(/_/g, ' ')));
    curatedKeys.push(dedupKey(o.label));
  });
  curatedKeys = curatedKeys.filter(Boolean);

  var candidates = OFFICES.map(function(o) { return { office: o }; });
  try {
    var discovered = await discoverPositions();
    var addedDisc = 0;
    for (var di = 0; di < discovered.length; di++) {
      var d = discovered[di];
      var dk = dedupKey(d.positionLabel);
      if (curatedKeys.indexOf(dk) >= 0) continue;
      var office = discoveredToOffice(d);
      if (!office) continue;
      curatedKeys.push(dk);
      candidates.push({ office: office });
      addedDisc++;
    }
    console.error('Discovered ' + discovered.length + ' Wikidata positions, added ' + addedDisc + ' new (incumbent via infobox or Wikidata fallback)');
  } catch (e) {
    console.error('Wikidata discovery failed (using curated list only): ' + e.message);
  }

  for (var oi = 0; oi < candidates.length; oi++) {
    var cand = candidates[oi];
    var label = cand.office.label;
    process.stdout.write('  ' + label + '... ');
    var name = null;
    var fromWikiData = false;
    if (cand.office.courtKey) {
      // High Court CJ: look up in the consolidated table (already fetched once).
      var hcName = hcJustices[cand.office.courtKey] || hcJustices[cand.office.courtKey + ' High Court'];;
      if (hcName) name = hcName;
    } else {
      name = await fetchAppointment(cand.office);
    }
    if (name) {
      process.stdout.write(name.substring(0, 50) + '\n');
      found++;
    } else if (cand.office.holderLabel) {
      // Fall back to the Wikidata officeholder (clean + validate it looks like a person).
      var wName = cleanName(cand.office.holderLabel);
      if (isPersonName(wName)) {
        name = wName;
        fromWikiData = true;
        process.stdout.write(wName.substring(0, 50) + ' (from Wikidata)\n');
        found++;
      } else {
        process.stdout.write('NOT FOUND\n');
        notFound++;
      }
    } else {
      process.stdout.write('NOT FOUND\n');
      notFound++;
    }

    var q = makeQuestion(cand.office, name, seq, fromWikiData);
    if (!q) continue;

    var personBio = await bio.getBio(name, bioCache);
    if (personBio) q.fact += ' ' + personBio;

    var qkey = questionKey(q);
    var existingQ = byQuestion[qkey];
    if (existingQ) {
      var sameAnswer = (existingQ.answer || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
      // Guard against a stale Wikidata fallback overwriting a good infobox answer:
      // if we only got the incumbent via Wikidata this run and we already have an
      // answer, keep the existing (likely fresher/sourced) answer.
      var staleOverride = fromWikiData && existingQ.answer && !existingQ._fromWikiData;
      if (!sameAnswer && !staleOverride) {
        var old = existingQ.answer;
        existingQ.answer = q.answer;
        existingQ.fact = q.fact;
        existingQ.pubDate = q.pubDate;
        existingQ.source = q.source;
        existingQ._fromWikiData = fromWikiData;
        updated++;
        process.stdout.write('    updated ' + old + ' -> ' + q.answer + '\n');
      } else {
        var bareFact = 'The current ' + label + ' of India is ' + name + ' (as of ' + (new Date().getFullYear()) + '). ';
        if (personBio && (existingQ.fact === bareFact || existingQ.fact.indexOf('of India is ' + name + ' (as of') === 0)) {
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

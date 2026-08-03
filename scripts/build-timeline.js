// Builds data/timeline.json — a zoomable chronological knowledge map.
// Every sub-topic + seed entity gets a time span (from topic names + fact-text years),
// a type, an era, and question counts per category.
// Usage: node scripts/build-timeline.js
var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data', 'questions');
var OUT = path.join(__dirname, '..', 'data', 'timeline.json');

// All year signals in text: { min, max, trusted } where trusted marks years that
// were written with BC/BCE/AD/CE or a century (safe to keep even below 1800).
// - "2500 BCE" / "326 BC"  -> negative year (2500 BC = -2500)
// - "AD 200" / "320 AD"    -> positive year
// - "3rd century BC"       -> range [-300, -201]
// - bare "1857"            -> positive year (trusted only by caller rules)
function yearSignals(text) {
  var t = String(text || '');
  // Normalize era-before-number ("AD 200", "BC 300") into number-before-era.
  t = t.replace(/\b(BC|BCE|AD|CE)\s*(\d{1,4})\b/gi, function (mm, era, num) { return num + ' ' + era; });
  var re = /\b(\d{1,4})\s*(st|nd|rd|th)\s+centur(?:y|ies)\s+(BC|BCE|AD|CE)\b|\b(\d{1,4})\s*(BC|BCE|AD|CE)\b|\b(1[0-9]{3}|20[0-2][0-9])\b/gi;
  var points = [];
  var trusted = {};
  var m;
  while ((m = re.exec(t))) {
    if (m[1] !== undefined && m[3] !== undefined) {          // "3rd century BC"
      var n = +m[1];
      var isBC = /^BC/i.test(m[3]);
      var lo, hi;
      if (isBC) { lo = -n * 100; hi = -(n * 100 - 99); }
      else { lo = (n - 1) * 100; hi = n * 100 - 1; }
      if (lo > 2026) continue;
      points.push(lo, hi);
      trusted[lo] = trusted[hi] = true;
    } else if (m[4] !== undefined && m[5] !== undefined) {   // "2500 BCE" / "320 AD"
      var y = +m[4];
      y = /^BC/i.test(m[5]) ? -y : y;
      if (y < -10000 || y > 2026) continue;
      points.push(y);
      trusted[y] = true;
    } else if (m[6] !== undefined) {                          // bare "1857"
      var y2 = +m[6];
      if (y2 <= 2026) points.push(y2);
    }
  }
  if (!points.length) return null;
  return { min: Math.min.apply(null, points), max: Math.max.apply(null, points), trusted: trusted };
}

function yearsFrom(text) {
  var s = yearSignals(text);
  return s ? { min: s.min, max: s.max } : null;
}

// Birth–death span for a person, e.g. "14 April 1891 – 6 December 1956" or "(1869–1948)".
function bioSpan(text) {
  var m = String(text || '').match(/\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})\s*[-\u2013]\s*\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})/);
  if (m) return { min: +m[1], max: +m[2] };
  m = String(text || '').match(/\(\s*(\d{3,4})\s*[-\u2013]\s*(\d{3,4})\s*\)/);
  if (m && +m[1] < +m[2] && +m[2] <= 2026) return { min: +m[1], max: +m[2] };
  return null;
}

var ERAS = [
  { id: 'ancient',       label: 'Ancient India',       min: -3300, max: 1199 },
  { id: 'medieval',      label: 'Medieval India',      min: 1200,  max: 1799 },
  { id: 'colonial',      label: 'Colonial Era',        min: 1800,  max: 1856 },
  { id: 'freedom',       label: 'Freedom Struggle',    min: 1857,  max: 1947 },
  { id: 'republic',      label: 'Republic / Post-independence', min: 1948, max: 1990 },
  { id: 'contemporary',  label: 'Contemporary India',  min: 1991,  max: 2026 }
];

// Curated spine: every group has an explicit type + zoom level.
// level 1 = era/movement scale · 2 = people/events · 3 = orgs/schemes/diseases · 4 = fine topics
var SEED = {
  movements: { type: 'event', level: 1, list: [
    'Indian independence movement', 'Non-cooperation movement', 'Civil disobedience movement', 'Quit India movement',
    'Khilafat movement', 'Partition of India', 'Simon Commission', 'Salt march', 'Jallianwala Bagh massacre',
    'Revolt of 1857', 'Swadeshi movement', 'Indian National Congress', 'Constituent Assembly of India',
    'Sepoy Mutiny', 'Bardoli Satyagraha', 'Champaran Satyagraha', 'Dandi March'
  ]},
  wars: { type: 'event', level: 1, list: [
    'Battle of Plassey', 'Battle of Buxar', 'First Battle of Panipat', 'Second Battle of Panipat',
    'Third Battle of Panipat', 'Battle of Haldighati', 'Battle of Talikota', 'Battle of Wandiwash',
    'Anglo-Mysore Wars', 'Anglo-Maratha Wars', 'First Anglo-Sikh War', 'Second Anglo-Sikh War',
    'Sino-Indian War', 'Indo-Pakistani War of 1965', 'Bangladesh Liberation War', 'Kargil War'
  ]},
  reforms: { type: 'event', level: 1, list: [
    'Economic liberalisation in India', 'LPG reforms', 'Demonetisation in India',
    'Goods and Services Tax (India)', 'Five-Year Plans (India)', 'Bank nationalisation in India'
  ]},
  people: { type: 'person', level: 2, list: [
    'Mahatma Gandhi', 'B. R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Subhas Chandra Bose',
    'Bal Gangadhar Tilak', 'Gopal Krishna Gokhale', 'Bhagat Singh', 'Mohammad Ali Jinnah', 'Rabindranath Tagore',
    'Lal Bahadur Shastri', 'Indira Gandhi', 'Sarojini Naidu', 'Rajendra Prasad', 'C. Rajagopalachari',
    'Mangal Pandey', 'Rani Lakshmibai', 'Vinayak Damodar Savarkar', 'Annie Besant', 'Dadabhai Naoroji',
    'Lala Lajpat Rai', 'Bipin Chandra Pal',
    'Gautama Buddha', 'Mahavira', 'Chandragupta Maurya', 'Ashoka', 'Chanakya', 'Samudragupta',
    'Harsha', 'Kanishka', 'Panini', 'Charaka', 'Sushruta', 'Kalidasa', 'Aryabhata', 'Alexander the Great'
  ]},
  empires: { type: 'event', level: 1, list: [
    'Indus Valley Civilization', 'Vedic period', 'Maurya Empire', 'Gupta Empire', 'Kalinga War',
    'Kushan Empire', 'Sunga Empire', 'Chola Empire', 'Harsha Empire', 'Rashtrakuta Empire',
    'Delhi Sultanate', 'Vijayanagara Empire', 'Mughal Empire', 'Maratha Empire'
  ]},
  sportspeople: { type: 'person', level: 2, list: [
    'Milkha Singh', 'Dhyan Chand', 'Kapil Dev', 'Sachin Tendulkar', 'P. T. Usha', 'Mary Kom',
    'Neeraj Chopra', 'Abhinav Bindra', 'Saina Nehwal', 'Viswanathan Anand'
  ]},
  science: { type: 'event', level: 2, list: [
    'Chandrayaan-1', 'Chandrayaan-3', 'Mangalyaan', 'Pokhran-II', 'Nuclear tests of India', 'Smallpox eradication'
  ]},
  sports: { type: 'event', level: 2, list: [
    'Olympic Games', 'Commonwealth Games', 'Asian Games', 'Cricket World Cup', 'T20 World Cup',
    'Hockey World Cup', 'Khelo India'
  ]},
  diseases: { type: 'disease', level: 3, list: [
    'COVID-19', 'Smallpox', 'Cholera', 'Plague', 'Tuberculosis', 'Leprosy', 'Polio', 'Malaria',
    'Dengue', 'Spanish flu', 'Chikungunya', 'Kala-azar', 'Famine'
  ]},
  schemes: { type: 'scheme', level: 3, list: [
    'National Health Mission', 'Swachh Bharat Mission', 'Poshan Abhiyan', 'Ayushman Bharat',
    'National Rural Health Mission', 'Green Revolution', 'Operation Flood',
    'Pradhan Mantri Jan Dhan Yojana', 'Bharat Nirman'
  ]},
  commissions: { type: 'org', level: 3, list: [
    'Sarkaria Commission', 'Mandal Commission', 'Kothari Commission', 'Finance Commission of India',
    'Election Commission of India', 'Law Commission of India', 'National Human Rights Commission of India',
    'Second Administrative Reforms Commission'
  ]},
  orgs: { type: 'org', level: 3, list: [
    'Indian Space Research Organisation', 'Defence Research and Development Organisation',
    'Bhabha Atomic Research Centre', 'Council of Scientific and Industrial Research', 'Indian Institute of Technology',
    'Reserve Bank of India', 'State Bank of India', 'Coal India', 'Oil and Natural Gas Corporation',
    'Indian Oil Corporation', 'Nuclear power in India'
  ]},
  geography: { type: 'concept', level: 4, list: [
    'Suez Canal', 'Panama Canal', 'McMahon Line', 'Line of Actual Control', 'Line of Control',
    'Siachen Glacier', 'Doklam'
  ]}
};

// Extra colloquial / shortened names per entity (merged with the auto aliases).
var EXTRA_ALIASES = {
  'Demonetisation in India': ['demonetisation', 'notebandi'],
  'Economic liberalisation in India': ['liberalisation', 'new economic policy'],
  'Bangladesh Liberation War': ['bangladesh war', 'liberation war 1971', '1971 war'],
  'Indo-Pakistani War of 1965': ['1965 war', 'indo-pak war'],
  'Sino-Indian War': ['1962 war', 'sino-indian conflict'],
  'Goods and Services Tax (India)': ['gst', 'goods and services tax'],
  'Five-Year Plans (India)': ['five year plan', 'planning commission'],
  'Swadeshi movement': ['swadeshi'],
  'Smallpox eradication': ['smallpox'],
  'National Rural Health Mission': ['nrh'],
  'Pradhan Mantri Jan Dhan Yojana': ['jan dhan'],
  'Indian National Congress': ['congress'],
  'Reserve Bank of India': ['rbi'],
  'State Bank of India': ['sbi'],
  'Oil and Natural Gas Corporation': ['ongc'],
  'Indian Oil Corporation': ['ioc'],
  'Election Commission of India': ['eci'],
  'Chandrayaan-1': ['chandrayaan 1'],
  'Mangalyaan': ['mars orbiter mission'],
  'Alexander the Great': ['alexander', 'alexander invasion'],
  'Indus Valley Civilization': ['harappan civilization', 'indus valley'],
  'Gupta Empire': ['guptas'],
  'Maurya Empire': ['mauryan empire', 'mauryas'],
  'Mughal Empire': ['mughals'],
  'Delhi Sultanate': ['sultanate'],
  'Ashoka': ['ashoka the great', 'asoka'],
  'Gautama Buddha': ['siddhartha']
};

// Manual, authoritative time spans for the curated spine (stable well-known facts).
// Auto-extraction from fact text remains the fallback for everything else.
var MANUAL_SPANS = {
  'Mahatma Gandhi': [1869, 1948], 'B. R. Ambedkar': [1891, 1956], 'Jawaharlal Nehru': [1889, 1964],
  'Sardar Vallabhbhai Patel': [1875, 1950], 'Subhas Chandra Bose': [1897, 1945], 'Bal Gangadhar Tilak': [1856, 1920],
  'Gopal Krishna Gokhale': [1866, 1915], 'Bhagat Singh': [1907, 1931], 'Mohammad Ali Jinnah': [1876, 1948],
  'Rabindranath Tagore': [1861, 1941], 'Lal Bahadur Shastri': [1904, 1966], 'Indira Gandhi': [1917, 1984],
  'Sarojini Naidu': [1879, 1949], 'Rajendra Prasad': [1884, 1963], 'C. Rajagopalachari': [1878, 1972],
  'Mangal Pandey': [1827, 1857], 'Rani Lakshmibai': [1828, 1858], 'Vinayak Damodar Savarkar': [1883, 1966],
  'Annie Besant': [1847, 1933], 'Dadabhai Naoroji': [1825, 1917], 'Lala Lajpat Rai': [1865, 1928],
  'Bipin Chandra Pal': [1858, 1932],
  'Gautama Buddha': [-563, -483], 'Mahavira': [-599, -527], 'Chandragupta Maurya': [-340, -298],
  'Ashoka': [-304, -232], 'Chanakya': [-350, -275], 'Samudragupta': [335, 380], 'Harsha': [590, 647],
  'Kanishka': [78, 144], 'Panini': [-500, -400], 'Charaka': [100, 200], 'Sushruta': [-600, -500],
  'Kalidasa': [400, 455], 'Aryabhata': [476, 550], 'Alexander the Great': [-356, -323],
  'Milkha Singh': [1929, 2021], 'Dhyan Chand': [1905, 1979], 'Kapil Dev': [1959, 2026], 'Sachin Tendulkar': [1973, 2026],
  'P. T. Usha': [1964, 2026], 'Mary Kom': [1982, 2026], 'Neeraj Chopra': [1997, 2026], 'Abhinav Bindra': [1982, 2026],
  'Saina Nehwal': [1990, 2026], 'Viswanathan Anand': [1969, 2026],
  'Indian independence movement': [1857, 1947], 'Non-cooperation movement': [1920, 1922],
  'Civil disobedience movement': [1930, 1934], 'Quit India movement': [1942, 1942], 'Khilafat movement': [1919, 1924],
  'Partition of India': [1947, 1947], 'Simon Commission': [1928, 1928], 'Salt march': [1930, 1930],
  'Jallianwala Bagh massacre': [1919, 1919], 'Revolt of 1857': [1857, 1857], 'Swadeshi movement': [1905, 1908],
  'Indian National Congress': [1885, 2026], 'Constituent Assembly of India': [1946, 1950], 'Sepoy Mutiny': [1857, 1857],
  'Bardoli Satyagraha': [1928, 1928], 'Champaran Satyagraha': [1917, 1917], 'Dandi March': [1930, 1930],
  'Battle of Plassey': [1757, 1757], 'Battle of Buxar': [1764, 1764], 'First Battle of Panipat': [1526, 1526],
  'Second Battle of Panipat': [1556, 1556], 'Third Battle of Panipat': [1761, 1761], 'Battle of Haldighati': [1576, 1576],
  'Battle of Talikota': [1565, 1565], 'Battle of Wandiwash': [1760, 1760], 'Anglo-Mysore Wars': [1767, 1799],
  'Anglo-Maratha Wars': [1775, 1819], 'First Anglo-Sikh War': [1845, 1846], 'Second Anglo-Sikh War': [1848, 1849],
  'Sino-Indian War': [1962, 1962], 'Indo-Pakistani War of 1965': [1965, 1965], 'Bangladesh Liberation War': [1971, 1971],
  'Kargil War': [1999, 1999],
  'Indus Valley Civilization': [-3300, -1300], 'Vedic period': [-1500, -500], 'Maurya Empire': [-322, -185],
  'Gupta Empire': [320, 550], 'Kalinga War': [-261, -261], 'Kushan Empire': [30, 375], 'Sunga Empire': [-185, -73],
  'Chola Empire': [850, 1279], 'Harsha Empire': [606, 647], 'Rashtrakuta Empire': [753, 982],
  'Delhi Sultanate': [1206, 1526], 'Vijayanagara Empire': [1336, 1646], 'Mughal Empire': [1526, 1857],
  'Maratha Empire': [1674, 1818],
  'Economic liberalisation in India': [1991, 1991], 'LPG reforms': [1991, 1991], 'Demonetisation in India': [2016, 2016],
  'Goods and Services Tax (India)': [2017, 2026], 'Five-Year Plans (India)': [1951, 2017],
  'Bank nationalisation in India': [1969, 1980],
  'Chandrayaan-1': [2008, 2009], 'Chandrayaan-3': [2023, 2023], 'Mangalyaan': [2013, 2014], 'Pokhran-II': [1998, 1998],
  'Nuclear tests of India': [1974, 1998], 'Smallpox eradication': [1975, 1980],
  'Olympic Games': [1896, 2026], 'Commonwealth Games': [1930, 2026], 'Asian Games': [1951, 2026],
  'Cricket World Cup': [1975, 2026], 'T20 World Cup': [2007, 2026], 'Hockey World Cup': [1971, 2026],
  'Khelo India': [2018, 2026],
  'COVID-19': [2019, 2026], 'Smallpox': [1800, 1980], 'Cholera': [1817, 2026], 'Plague': [1896, 2026],
  'Tuberculosis': [1800, 2026], 'Leprosy': [1800, 2026], 'Polio': [1900, 2014], 'Malaria': [1800, 2026],
  'Dengue': [1900, 2026], 'Spanish flu': [1918, 1920], 'Chikungunya': [1950, 2026], 'Kala-azar': [1800, 2026],
  'Famine': [1769, 1943],
  'National Health Mission': [2005, 2026], 'Swachh Bharat Mission': [2014, 2026], 'Poshan Abhiyan': [2018, 2026],
  'Ayushman Bharat': [2018, 2026], 'National Rural Health Mission': [2005, 2026], 'Green Revolution': [1960, 1980],
  'Operation Flood': [1970, 1996], 'Pradhan Mantri Jan Dhan Yojana': [2014, 2026], 'Bharat Nirman': [2005, 2014],
  'Sarkaria Commission': [1983, 1988], 'Mandal Commission': [1979, 1990], 'Kothari Commission': [1964, 1966],
  'Finance Commission of India': [1951, 2026], 'Election Commission of India': [1950, 2026],
  'Law Commission of India': [1955, 2026], 'National Human Rights Commission of India': [1993, 2026],
  'Second Administrative Reforms Commission': [2005, 2009],
  'Indian Space Research Organisation': [1969, 2026], 'Defence Research and Development Organisation': [1958, 2026],
  'Bhabha Atomic Research Centre': [1954, 2026], 'Council of Scientific and Industrial Research': [1942, 2026],
  'Indian Institute of Technology': [1951, 2026], 'Reserve Bank of India': [1935, 2026], 'State Bank of India': [1955, 2026],
  'Coal India': [1975, 2026], 'Oil and Natural Gas Corporation': [1956, 2026], 'Indian Oil Corporation': [1964, 2026],
  'Nuclear power in India': [1969, 2026],
  'Suez Canal': [1869, 2026], 'Panama Canal': [1914, 2026], 'McMahon Line': [1914, 2026],
  'Line of Actual Control': [1962, 2026], 'Line of Control': [1972, 2026], 'Siachen Glacier': [1984, 2026],
  'Doklam': [2017, 2026]
};

function loadAll() {
  var cats = {};
  var all = [];
  for (var f of fs.readdirSync(DATA)) {
    if (!f.endsWith('.json') || f === 'manifest.json') continue;
    var key = f.replace('.json', '');
    var parsed = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    var label = Object.keys(parsed)[0] || key;
    var questions = [];
    for (var subj of Object.keys(parsed)) {
      var subs = parsed[subj].subSubjects || {};
      for (var ss of Object.keys(subs)) {
        var arr = subs[ss];
        if (Array.isArray(arr)) {
          for (var q of arr) { q._topic = ss; questions.push(q); }
        }
      }
    }
    cats[key] = { key: key, label: label, questions: questions };
    all = all.concat(questions.map(function (q) { return { cat: key, q: q }; }));
  }
  return { cats: cats, all: all };
}

function archiveYears(qs) {
  var py = [];
  for (var q of qs) {
    var d = q.pubDate ? new Date(q.pubDate).getUTCFullYear() : null;
    if (d && d >= 1000 && d <= 2026) py.push(d);
  }
  if (!py.length) return null;
  return { min: Math.min.apply(null, py), max: Math.max.apply(null, py) };
}

function topicYears(name, qs) {
  var ny = yearSignals(name);
  var ys = [];
  var trusted = {};
  for (var q of qs) {
    var fy = yearSignals([q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' '));
    if (fy) {
      ys.push(fy.min); ys.push(fy.max);
      for (var k of Object.keys(fy.trusted)) trusted[k] = true;
    }
  }
  // Keep a year if: the topic name carries years, or the year is trusted
  // (came with BC/BCE/AD/CE/century), or it's a negative/BC year, or a modern bare year >= 1800.
  var fl = ys.filter(function (y) { return ny || trusted[y] || y < 0 || y >= 1800; });
  if (ny) { fl.push(ny.min); fl.push(ny.max); }
  if (!fl.length) {
    // No event-year signal: anchor to the years these questions entered the archive.
    var ap = archiveYears(qs);
    return ap ? { min: ap.min, max: ap.max, archive: true } : null;
  }
  return { min: Math.min.apply(null, fl), max: Math.max.apply(null, fl) };
}

function typeOf(name) {
  var n = name.toLowerCase();
  if (/movement|rebellion|revolt|revolution|protest|uprising|agitation|campaign|satyagraha|march|massacre|mutiny|jallianwala/i.test(n)) return 'event';
  if (/scheme|yojana|mission|programme|program|policy|act\b|treaty|agreement|organisation|organization|department|commission|committee|bank|corporation|authority|university|institute|association/i.test(n)) return 'org';
  if (/disease|virus|flu|pandemic|epidemic|malaria|cholera|smallpox|polio|leprosy|tuberculosis|covid|famine|plague|dengue|chikungunya/i.test(n)) return 'disease';
  return 'concept';
}

function eraOf(y) {
  if (y == null) return null;
  for (var e of ERAS) { if (y >= e.min && y <= e.max) return e.id; }
  return null;
}

function aliasesFor(name, isPerson) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) {
    a.push(parts.join(' '));
    if (isPerson) {
      var sur = parts[parts.length - 1].toLowerCase();
      // surname alias only for real surnames (avoid "Great" from "Alexander the Great")
      if (parts[parts.length - 1].length >= 3 && ['great', 'the', 'of', 'de', 'saint', 'junior', 'senior'].indexOf(sur) === -1) {
        a.push(parts[parts.length - 1]);
      }
    }
  }
  return a;
}

// Full-name aliases only (no bare surnames) — used for cross-entity links to avoid noise.
function linkAliasesFor(name) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) a.push(parts.join(' '));
  return a;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function modeSpan(spans) {
  var freq = {};
  for (var sp of spans) {
    if (!sp) continue;
    var k = sp.min + '-' + sp.max;
    freq[k] = (freq[k] || 0) + 1;
  }
  var bestK = null, bestN = 0;
  for (var kk of Object.keys(freq)) { if (freq[kk] > bestN) { bestN = freq[kk]; bestK = kk; } }
  if (!bestK) return null;
  var b = bestK.split('-');
  return { min: +b[0], max: +b[1] };
}

function main() {
  var all = loadAll();
  var nodes = [];
  var seen = {};

  // Sub-topic nodes
  for (var key of Object.keys(all.cats)) {
    var c = all.cats[key];
    var byTopic = {};
    for (var q of c.questions) {
      var t = q.subSubject || q._topic || 'General';
      (byTopic[t] = byTopic[t] || []).push(q);
    }
    for (var tname of Object.keys(byTopic)) {
      var id = key + '|' + tname;
      if (seen[id]) {
        seen[id].cats.push({ key: key, label: c.label, count: byTopic[tname].length });
        seen[id].count += byTopic[tname].length;
        continue;
      }
      var qs = byTopic[tname];
      var span = topicYears(tname, qs);
      var node = {
        id: id,
        name: tname,
        type: typeOf(tname),
        span: span,
        era: eraOf(span && span.min),
        level: 4,
        cats: [{ key: key, label: c.label, count: qs.length }],
        count: qs.length
      };
      if (span && span.archive) node.timebase = 'archive';
      seen[id] = node;
      nodes.push(node);
    }
  }

  // Seed entity nodes: match aliases across all questions
  var seedNodes = [];
  for (var grp of Object.keys(SEED)) {
    var g = SEED[grp];
    for (var ename of g.list) {
      var isPerson = g.type === 'person';
      var aliases = aliasesFor(ename, isPerson).concat(EXTRA_ALIASES[ename] || []);
      var hitQs = [];
      var catMap = {};
      for (var it of all.all) {
        var txt = [it.q.question, it.q.answer, it.q.fact, it.q.hint].filter(Boolean).join(' ').toLowerCase();
        if (aliases.some(function (a) { return a && txt.indexOf(a.toLowerCase()) !== -1; })) {
          hitQs.push(it);
          catMap[it.cat] = catMap[it.cat] || 0;
          catMap[it.cat]++;
        }
      }
      var ys = [];
      var trusted = {};
      var bioSpans = [];
      var ownTopics = {}; // sub-topic name -> {n, firstBioSpan}
      var canonical = ename.replace(/^(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/i, '').replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      for (var hq of hitQs) {
        var allText = [hq.q.question, hq.q.answer, hq.q.fact, hq.q.hint].filter(Boolean).join(' ');
        var fy = yearSignals(allText);
        if (fy) {
          ys.push(fy.min); ys.push(fy.max);
          for (var tk of Object.keys(fy.trusted)) trusted[tk] = true;
        }
        var bs = bioSpan(allText);
        if (bs) bioSpans.push(bs);
        if (isPerson) {
          var tname = hq.q.subSubject || hq.q._topic || '';
          var tnorm = tname.replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          var tnormStrip = tnorm.replace(/^(dr|sir|saint|mahatma|sardar|bapu)\s+/, '');
          if (tnorm === canonical || tnormStrip === canonical || tnorm === ename.toLowerCase()) {
            if (!ownTopics[tname]) ownTopics[tname] = { n: 0, first: null };
            ownTopics[tname].n++;
            if (ownTopics[tname].first === null && bs) ownTopics[tname].first = bs;
          }
        }
      }
      var span = null;
      if (MANUAL_SPANS[ename]) {
        span = { min: MANUAL_SPANS[ename][0], max: MANUAL_SPANS[ename][1] };
      } else if (isPerson) {
        // Prefer the largest own-topic's first (birth–death) span.
        var bestTopic = null;
        for (var tn of Object.keys(ownTopics)) {
          if (!bestTopic || ownTopics[tn].n > bestTopic.n) bestTopic = ownTopics[tn];
        }
        span = bestTopic && bestTopic.first ? bestTopic.first : modeSpan(bioSpans);
      }
      if (!span && ys.length) {
        var fl = ys.filter(function (y) { return trusted[y] || y < 0 || y >= 1800; });
        if (fl.length) span = { min: Math.min.apply(null, fl), max: Math.max.apply(null, fl) };
      }
      if (!span) {
        var ap = archiveYears(hitQs);
        if (ap) span = { min: ap.min, max: ap.max, archive: true };
      }
      var node = {
        id: 'seed|' + ename,
        name: ename,
        type: g.type,
        level: g.level,
        span: span,
        era: eraOf(span && span.min),
        cats: Object.keys(catMap).map(function (k) { return { key: k, label: all.cats[k] ? all.cats[k].label : k, count: catMap[k] }; }),
        count: hitQs.length,
        seed: true,
        aliases: aliases
      };
      if (span && span.archive) node.timebase = 'archive';
      nodes.push(node);
      seedNodes.push(node);
    }
  }

  // Cross-entity links: co-occurrence of two seed entities inside one question.
  var aliasMap = {};
  for (var sn of seedNodes) {
    for (var al of linkAliasesFor(sn.name)) aliasMap[al.toLowerCase()] = sn.id;
  }
  var aliasList = Object.keys(aliasMap).sort(function (x, y) { return y.length - x.length; });
  var linkRe = new RegExp('(' + aliasList.map(escapeRe).join('|') + ')', 'g');
  var pairCount = {};
  for (var it2 of all.all) {
    var lt = [it2.q.question, it2.q.answer, it2.q.fact, it2.q.hint].filter(Boolean).join(' ').toLowerCase();
    var found = {};
    var m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(lt))) {
      var id = aliasMap[m[1]];
      if (id) found[id] = true;
      if (m.index === linkRe.lastIndex) linkRe.lastIndex++;
    }
    var ids = Object.keys(found);
    if (ids.length >= 2 && ids.length <= 10) {
      for (var i = 0; i < ids.length; i++) {
        for (var j = i + 1; j < ids.length; j++) {
          var k = ids[i] < ids[j] ? ids[i] + '\u0000' + ids[j] : ids[j] + '\u0000' + ids[i];
          pairCount[k] = (pairCount[k] || 0) + 1;
        }
      }
    }
  }
  var links = [];
  for (var pk of Object.keys(pairCount)) {
    if (pairCount[pk] >= 2) {
      var sp = pk.split('\u0000');
      links.push({ a: sp[0], b: sp[1], w: pairCount[pk] });
    }
  }
  links.sort(function (x, y) { return y.w - x.w; });

  var out = { builtAt: new Date().toISOString(), eras: ERAS, nodes: nodes, links: links };
  fs.writeFileSync(OUT, JSON.stringify(out));
  var withSpan = nodes.filter(function (n) { return n.span; }).length;
  console.log('Wrote ' + OUT);
  console.log('nodes: ' + nodes.length + ' (with time span: ' + withSpan + ', ' + (withSpan / nodes.length * 100).toFixed(1) + '%)');
  var totalSeeds = 0;
  var seedTypeCounts = {};
  for (var gk of Object.keys(SEED)) { totalSeeds += SEED[gk].list.length; seedTypeCounts[SEED[gk].type] = (seedTypeCounts[SEED[gk].type] || 0) + SEED[gk].list.length; }
  console.log('seed entities: ' + totalSeeds + ' across ' + JSON.stringify(seedTypeCounts));
  console.log('links: ' + links.length + ' (top: ' + links.slice(0, 5).map(function (l) { return l.a.replace('seed|', '') + '↔' + l.b.replace('seed|', '') + ':' + l.w; }).join(', ') + ')');
}

main();

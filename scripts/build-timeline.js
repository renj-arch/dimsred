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
// - "1950s" / "1960s"      -> the decade's starting year (e.g. 1950)
// - bare "5th century"     -> AD range 400–499 (no BC/AD suffix means AD)
function yearSignals(text) {
  var t = String(text || '');
  // Normalize era-before-number ("AD 200", "BC 300") into number-before-era.
  t = t.replace(/\b(BC|BCE|AD|CE)\s*(\d{1,4})\b/gi, function (mm, era, num) { return num + ' ' + era; });
  var points = [];
  var trusted = {};
  function add(y, trust) {
    if (y < -10000 || y > 2026) return;
    points.push(y);
    if (trust) trusted[y] = true;
  }
  var m;
  // "3rd century BC" / "3rd century AD" — an explicit era suffix.
  var re1 = /\b(\d{1,4})\s*(st|nd|rd|th)\s+centur(?:y|ies)\s+(BC|BCE|AD|CE)\b/gi;
  while ((m = re1.exec(t))) {
    var n = +m[1], isBC = /^BC/i.test(m[3]);
    var lo, hi;
    if (isBC) { lo = -n * 100; hi = -(n * 100 - 99); }
    else { lo = (n - 1) * 100; hi = Math.min(n * 100 - 1, 2026); }
    if (lo > 2026) continue;
    add(lo, true); add(hi, true);
  }
  // "2500 BCE" / "320 AD" — an explicit year + era.
  var re2 = /\b(\d{1,4})\s*(BC|BCE|AD|CE)\b/gi;
  while ((m = re2.exec(t))) {
    var y2 = +m[1];
    add(/^BC/i.test(m[2]) ? -y2 : y2, true);
  }
  // Bare century with no era suffix ("5th century") — implied AD.
  var re3 = /\b(\d{1,2})\s*(st|nd|rd|th)\s+centur(?:y|ies)\b(?!\s*(BC|BCE|AD|CE))/gi;
  while ((m = re3.exec(t))) {
    var lo3 = (m[1] - 1) * 100, hi3 = Math.min(m[1] * 100 - 1, 2026);
    if (lo3 > 2026) continue;
    add(lo3, true); add(hi3, true);
  }
  // Decade ("1950s", "in the 1990s") — take the starting year.
  var re4 = /\b(1[0-9]{3}|20[0-2][0-9])s\b/gi;
  while ((m = re4.exec(t))) { add(+m[1], true); }
  // Bare year "1857" — but NOT when it is a quantity, e.g. "1500 metres",
  // "1500-metre run", "about 1000 tractors", "1000 li", "1000 years",
  // "Masters 1000", or part of a distance list "200, 300, 400, 600, 1000
  // & 1200 kilometres". Units are blocked both before and after the number.
  var UNITS = '(?:metres?|meters?|m\\b|km\\b|kgs?|kilograms?|kilometres?|kilometers?|miles?|li\\b|feet|ft\\b|inches?|cm\\b|mm\\b|acres?|hectares?|tonnes?|tons?|grams?|litres?|liters?|ml\\b|points?|pts\\b|percent|%|rupees?|rs\\b|lakh|crore|dollars?|paise|tractors|markets?|messages?|people|persons|students|soldiers|troops|workers|farmers|villagers|monks?|nuns?|monasteries?|horses?|elephants?|cattle\\b|cows?|camels?|sheep\\b|goats?|buffaloes?|houses?|buildings?|villages?|states?|districts?|coins?|years?|yrs?|masters?)';
  var re5 = new RegExp('(?<!\\b(?:' + UNITS + ')[\\s-]|&\\s)\\b(1[0-9]{3}|20[0-2][0-9])\\b(?!' + '[\\s-]*(?:' + UNITS + ')\\b|' + '[\\s-]*&[\\s-]*\\d)', 'gi');
  while ((m = re5.exec(t))) { add(+m[1]); }
  if (!points.length) return null;
  return { min: Math.min.apply(null, points), max: Math.max.apply(null, points), trusted: trusted };
}

function yearsFrom(text) {
  var s = yearSignals(text);
  return s ? { min: s.min, max: s.max } : null;
}

// A year embedded in a topic NAME is only trusted when the name clearly frames it as a
// year — "Revolt of 1857", "Indo-Pakistani War of 1965", "1857 rebellion" — not when it
// is a quantity or part of a title ("ATP Masters 1000", "1500 metres", "1000 Islands").
function nameYears(name) {
  var s = yearSignals(name);
  if (!s) return null;
  var n = ' ' + String(name).toLowerCase().replace(/\s+/g, ' ') + ' ';
  var yf = /(^|\s)(of|in|from|since|by|the|and|around|circa|during|after|before|post)\s+(1[0-9]{3}|20[0-2][0-9])(\s|$)/.test(n)
    || /(^|\s)(1[0-9]{3}|20[0-2][0-9])\s+(revolt|rebellion|revolution|movement|war|battle|act|mutiny|partition|uprising|massacre|era|period|decade)(\s|$)/.test(n)
    || /^\s*(1[0-9]{3}|20[0-2][0-9])\s*$/.test(name);
  return yf ? s : null;
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
  'Gautama Buddha': ['siddhartha', 'gautam buddha'],
  'Mahavira': ['mahavir', 'vardhamana'],
  'Chanakya': ['kautilya', 'vishnugupta'],
  'Charaka': ['charak'],
  'Aryabhata': ['aryabhatta'],
  'Harsha': ['harshavardhana', 'harsha vardhana'],
  'Samudragupta': ['samudra gupta'],
  'Mahatma Gandhi': ['mohandas karamchand gandhi', 'gandhi ji'],
  'B. R. Ambedkar': ['babasaheb', 'bhimrao ambedkar', 'bhimrao ramji ambedkar'],
  'Jawaharlal Nehru': ['pandit nehru'],
  'Sardar Vallabhbhai Patel': ['sardar patel', 'vallabhbhai patel'],
  'Subhas Chandra Bose': ['netaji', 'subhas bose', 'subhash chandra bose', 'subhash bose'],
  'Bal Gangadhar Tilak': ['lokmanya tilak'],
  'Mohammad Ali Jinnah': ['mohammed ali jinnah'],
  'Vinayak Damodar Savarkar': ['veer savarkar'],
  'C. Rajagopalachari': ['rajaji', 'chakravarti rajagopalachari'],
  'P. T. Usha': ['pt usha', 'p t usha'],
  'Rani Lakshmibai': ['rani lakshmi bai', 'lakshmi bai', 'rani of jhansi'],
  'Lala Lajpat Rai': ['lajpat rai'],
  'Viswanathan Anand': ['vishwanathan anand'],
  'Five-Year Plans (India)': ['five year plan', 'five-year plan', 'five year plans']
};

// Homonym guards: when the alias also names a DIFFERENT entity (same words), exclude
// questions that clearly refer to the other one. Keeps profiles from cross-contaminating.
var NEGATIVE_ALIASES = {
  'Bhagat Singh': ['koshyari', 'thind'],
  'Mahatma Gandhi': ['indira gandhi', 'rajiv gandhi', 'rahul gandhi', 'sonia gandhi', 'feroze gandhi'],
  'Jawaharlal Nehru': ['nehru university', 'nehru stadium', 'nehru park', 'nehru port'],
  'Sachin Tendulkar': ['tendulkar committee'],
  'Neeraj Chopra': ['priyanka chopra'],
  'C. Rajagopalachari': ['rajaji national park'],
  'Ashoka': ['ashoka tree', 'ashoka university'],
  'Alexander the Great': ['alexander graham bell', 'alexander fleming']
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

// Curated spans for sub-topics (non-seed) where extracted year clusters cannot
// separate the topic's genuine dates from reception/reference years — e.g. the
// Manusmriti's composition (~200 BCE–200 CE) vs centuries of commentaries,
// editions and colonial-era publications.
var TOPIC_OVERRIDES = {
  'Manusmriti': [-200, 200],
  '1885 Kashmir earthquake': [1885, 1885]
};

// Curated, authoritative descriptors for the curated-spine persons.
var PERSON_DESCS = {
  'Mahatma Gandhi': 'Indian independence leader', 'B. R. Ambedkar': 'jurist and social reformer',
  'Jawaharlal Nehru': 'first Prime Minister of India', 'Sardar Vallabhbhai Patel': 'independence leader and first Deputy PM of India',
  'Subhas Chandra Bose': 'Indian nationalist leader', 'Bal Gangadhar Tilak': 'freedom fighter and social reformer',
  'Gopal Krishna Gokhale': 'freedom fighter and politician', 'Bhagat Singh': 'revolutionary freedom fighter',
  'Mohammad Ali Jinnah': 'founder of Pakistan', 'Rabindranath Tagore': 'poet and Nobel laureate',
  'Lal Bahadur Shastri': 'third Prime Minister of India', 'Indira Gandhi': 'first woman Prime Minister of India',
  'Sarojini Naidu': 'poet and freedom fighter', 'Rajendra Prasad': 'first President of India',
  'C. Rajagopalachari': 'freedom fighter and statesman', 'Mangal Pandey': 'sepoy of the Revolt of 1857',
  'Rani Lakshmibai': 'queen and freedom fighter', 'Vinayak Damodar Savarkar': 'freedom fighter and writer',
  'Annie Besant': 'theosophist and social reformer', 'Dadabhai Naoroji': 'Indian political leader',
  'Lala Lajpat Rai': 'freedom fighter', 'Bipin Chandra Pal': 'freedom fighter',
  'Gautama Buddha': 'founder of Buddhism', 'Mahavira': 'founder of Jainism',
  'Chandragupta Maurya': 'founder of the Maurya Empire', 'Ashoka': 'Mauryan emperor',
  'Chanakya': 'ancient Indian philosopher and strategist', 'Samudragupta': 'Gupta emperor',
  'Harsha': 'Indian emperor', 'Kanishka': 'Kushan emperor', 'Panini': 'Sanskrit grammarian',
  'Charaka': 'ancient Indian physician', 'Sushruta': 'ancient Indian surgeon',
  'Kalidasa': 'Sanskrit poet and playwright', 'Aryabhata': 'ancient Indian mathematician and astronomer',
  'Alexander the Great': 'Macedonian conqueror',
  'Milkha Singh': 'Indian sprinter', 'Dhyan Chand': 'Indian hockey player',
  'Kapil Dev': 'Indian cricketer', 'Sachin Tendulkar': 'Indian cricketer',
  'P. T. Usha': 'Indian sprinter', 'Mary Kom': 'Indian boxer',
  'Neeraj Chopra': 'Indian javelin thrower', 'Abhinav Bindra': 'Indian shooter',
  'Saina Nehwal': 'Indian badminton player', 'Viswanathan Anand': 'Indian chess grandmaster',
  'Xuanzang': 'Chinese Buddhist monk and scholar',
  'Prem Behari Narain Raizada': 'Indian calligrapher',
  'Roy Mugerwa': 'Ugandan physician and academic',
  'Ali Sardar Jafri': 'Indian writer'
};

// Person-role keyword gate: an auto-extracted descriptor is only attached when it
// reads like a person's role/profession, so a topic like "World War II" ("Global
// conflict (1939–1945)") never gets a descriptor.
var PERSON_ROLE = /\b(?:monk|nun|scholar|philosopher|poet|writer|author|novelist|playwright|painter|artist|sculptor|musician|singer|vocalist|composer|dancer|actor|actress|filmmaker|director|producer|athlete|cricketer|footballer|boxer|wrestler|shooter|archer|sprinter|runner|hockey player|badminton|chess grandmaster|grandmaster|tennis|javelin|swimmer|gymnast|king|queen|emperor|empress|prince|princess|ruler|monarch|sultan|raja|maharaja|nawab|politician|statesman|president|minister|governor|parliamentarian|senator|diplomat|ambassador|jurist|judge|lawyer|advocate|reformer|activist|revolutionary|leader|saint|guru|mystic|prophet|founder|pioneer|scientist|physicist|chemist|biologist|astronomer|mathematician|botanist|zoologist|geologist|engineer|physician|doctor|surgeon|psychologist|economist|sociologist|anthropologist|archaeologist|historian|linguist|philologist|orientalist|missionary|philanthropist|industrialist|businessman|entrepreneur|banker|educator|academic|professor|journalist|editor|photographer|explorer|navigator|conqueror|warrior|general|admiral|commander|soldier|officer|astronaut|pilot|inventor|administrator|bureaucrat|agronomist|planter|craftsman|priest|bishop|cardinal|pope|caliph|imam|chancellor|viceroy|governor-general|politician|spiritualist|theologian|reformer|economist|activist)\b/i;

function normNameForDesc(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function nameMatchesForDesc(qName, topic) {
  var a = normNameForDesc(qName), b = normNameForDesc(topic);
  if (!a || !b) return false;
  if (a === b) return true;
  var bBase = b.replace(/\s*\(.*\)\s*$/, '').trim();
  if (a === bBase) return true;
  if (b.length >= 4 && a.indexOf(b) === 0) return true;
  if (a.length >= 4 && b.indexOf(a) === 0) return true;
  return false;
}
function cleanDesc(s) {
  var d = String(s).replace(/[}\]]+$/, '').trim();
  d = d.split(/\.\s+|\u2014\s+|\u2013\s+/)[0];
  return d.replace(/[,;\s]+$/, '').replace(/\s+/g, ' ').trim();
}
// Extract a person's descriptor ("profession") from the topic's own questions, e.g.
// "What is Xuanzang? Chinese Buddhist monk and scholar (602–664)". Only returns when
// the quoted name is the topic itself, the descriptor reads as a person role, and the
// year range looks like a lifespan (so wars/conflicts are excluded).
function personDescFor(name, qs) {
  if (PERSON_DESCS[name]) return PERSON_DESCS[name];
  var reA = /What is\s+([A-Z][^?()]{1,60}?)\??\s*[:.\u2013-]?\s*([A-Za-z][^()?]{2,90}?)\s*\(\s*(?:c\.?\s*)?(-?\d{3,4})\s*[-\u2013]\s*(-?\d{3,4})\s*\)/gi;
  var reB = /(?:The|A|An)\s*_\s+(?:was|is)\s+([A-Za-z][^()?]{2,90}?)\s*\(\s*(?:c\.?\s*)?(-?\d{3,4})\s*[-\u2013]\s*(-?\d{3,4})\s*\)/gi;
  for (var i = 0; i < qs.length; i++) {
    var q = qs[i];
    var txt = [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' ');
    var m;
    reA.lastIndex = 0;
    while ((m = reA.exec(txt))) {
      var d = cleanDesc(m[2]);
      if (nameMatchesForDesc(m[1], name) && PERSON_ROLE.test(d) && (+m[4] - +m[3]) >= 20 && (+m[4] - +m[3]) <= 130) return d;
    }
    reB.lastIndex = 0;
    while ((m = reB.exec(txt))) {
      var d2 = cleanDesc(m[1]);
      if (PERSON_ROLE.test(d2) && (+m[3] - +m[2]) >= 20 && (+m[3] - +m[2]) <= 130) return d2;
    }
  }
  return null;
}

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

// News/time-stamped feeds — for these, the date the question entered the archive
// is a fair proxy for when the topic is relevant, so archive-anchoring stays on.
var NEWS_CATS = ['current-affairs', 'pib-archive', 'announcements', 'rbi-press-releases'];

// Keyword → era classifier. Used ONLY when a topic has no dateable content, so a
// year-less topic still lands in the right era band instead of being dumped at "now".
var ERA_KEYWORDS = {
  ancient: /indus|harappa|vedic|vedas|maurya|gupta|sunga|kushan|satavahana|nanda|saka|pallava|chalukya|chola|chera|pandya|sangam|buddha|ashoka|kalinga|panini|aryabhata|sushruta|charaka|kalidasa|mahajanapada|bhimbetka|prehistoric|stone age|bronze age|iron age|ganapati/i,
  medieval: /sultanate|mughal|mamluk|khilji|tughlaq|sayyid|lodi|vijayanagara|maratha|rashtrakuta|pratihara|gurjara|bhakti|sufi|bahmani|ahom|rajput|kakatiya|adil shahi|qutub|iqta|mansabdar|delhi sultanate/i,
  freedom: /1857|sepoy|mutiny|swadeshi|satyagraha|non-cooperation|civil disobedience|quit india|partition|jallianwala|khilafat|salt march|bardoli|champaran|gandhi|nehru|tilak|gokhale|bose|congress|independence movement|revolt of 1857|british|east india|viceroy/i,
  republic: /constitution|planning commission|five year|green revolution|liberalisation|gst|election commission|rajya sabha|lok sabha|republic day|sarkaria|mandal commission|nehruvian/i
};
var CATEGORY_ERA = {
  'ancient-india': 'ancient',
  'medieval-modern-india': 'medieval'
};

function eraForTopic(tname, catKey) {
  var t = String(tname || '').toLowerCase();
  for (var eid of ['ancient', 'medieval', 'freedom', 'republic']) {
    if (ERA_KEYWORDS[eid].test(t)) return eid;
  }
  return CATEGORY_ERA[catKey] || null;
}

// A topic's question text often cross-references years in answers/facts (e.g. "Battle
// of Plassey" mentions 1885, 1994, 2025), so naive min..max stretches the span across
// centuries. BUT trimming by raw count is also wrong: a topic like "World Trade
// Organization" has questions that skew toward recent years, so the densest cluster
// (2012–2026) wrongly deletes its real history (GATT 1947 → WTO 1995 → present).
// Rule: drop a separated cluster only when it is BOTH isolated by a large gap AND a
// minority of the points; keep everything connected by small gaps as the true range.
// A very large internal gap (>= HUGE) means the years are about two different subjects
// (e.g. Indus Valley's ancient era vs its 1920s–2020s excavation references). For
// categories with a known era, keep the side that holds more of that era's years, but
// ONLY when the losing side is essentially outside the era (<= 10% of its own points in
// it) — otherwise both sides are real chronological content and the ordinary minority
// rule decides. And never drop a minority side when the surviving side still spans most
// of the range: a sparse-but-huge side ("Human history"'s ancient era) is real content,
// not cross-reference noise.
function robustSpan(ys, catKey, trustedSet) {
  var GAP = 60;         // years — a larger gap separates distinct periods
  var HUGE = 300;       // years — different subject/reference era
  var MIN_FRAC = 0.25;  // a separated cluster is noise only if it holds < this fraction
  var s = ys.slice().sort(function (a, b) { return a - b; });
  if (s.length <= 2) return { min: s[0], max: s[s.length - 1] };
  var changed = true;
  while (changed && s.length > 2) {
    changed = false;
    var bestGap = -1, bestIdx = -1;
    for (var i = 1; i < s.length; i++) {
      var g = s[i] - s[i - 1];
      if (g > bestGap) { bestGap = g; bestIdx = i; }
    }
    if (bestGap < GAP) break; // connected series — keep the whole range
    var left = bestIdx, right = s.length - bestIdx, n = s.length;
    if (bestGap > HUGE) {
      // Trusted-anchor: years written with BC/AD/CE or a century are authoritative.
      // When one side of a huge gap is a coherent cluster of trusted years (span < 200y,
      // >= 2 distinct) and the other side is almost entirely untrusted, the untrusted
      // side is reference/citation noise (Xuanzang's 7th-century life vs 19th–21st
      // century book citations and "1000 li" quantities) and is dropped.
      if (trustedSet) {
        var lT = trustedStats(s, 0, bestIdx, trustedSet);
        var rT = trustedStats(s, bestIdx, s.length, trustedSet);
        // The kept side must be a coherent trusted cluster that is also a
        // substantial part of the topic's own years (>= 20% of points) — a stray
        // ancient "7th century" mention inside a modern topic must not override the
        // majority. The dropped side must be a scattered, mostly-untrusted reference
        // range spanning >= 150 years (book citations, quantities).
        var dropR = lT.fraction >= 0.5 && lT.span < 200 && lT.distinct >= 2 && left / n >= 0.2 && rT.fraction <= 0.15 && (s[s.length - 1] - s[bestIdx]) >= 150;
        var dropL = rT.fraction >= 0.5 && rT.span < 200 && rT.distinct >= 2 && right / n >= 0.2 && lT.fraction <= 0.15 && (s[bestIdx - 1] - s[0]) >= 150;
        if (dropR) { s = s.slice(0, bestIdx); changed = true; continue; }
        if (dropL) { s = s.slice(bestIdx); changed = true; continue; }
      }
      var pref = CATEGORY_ERA[catKey];
      if (pref) {
        var lCnt = countInEra(s, 0, bestIdx, pref);
        var rCnt = countInEra(s, bestIdx, s.length, pref);
        var lFrac = lCnt / bestIdx, rFrac = rCnt / (s.length - bestIdx);
        if (lCnt > rCnt && rFrac <= 0.1) { s = s.slice(0, bestIdx); changed = true; continue; }
        if (rCnt > lCnt && lFrac <= 0.1) { s = s.slice(bestIdx); changed = true; continue; }
      }
      // else fall through to the ordinary minority rule
    }
    // Drop a separated cluster only when it is a clear minority. A 1–2 year cluster is
    // cross-reference noise (a Red Fort question mentioning "2600 BCE Harappa") and is
    // always dropped. A multi-year minority is real chronological content only if the
    // surviving side is also broad (e.g. "History of Eurasia", "Human history") — when
    // the surviving side is tight, the minority is noise there too (e.g. Plassey's
    // stray 1400/1500/2025 references).
    var dropSide = null;
    if (left < right && left / n < MIN_FRAC) dropSide = 'R';
    else if (right < left && right / n < MIN_FRAC) dropSide = 'L';
    if (dropSide) {
      var dropArr = dropSide === 'R' ? s.slice(0, bestIdx) : s.slice(bestIdx);
      var distinct = {}, nD = 0;
      for (var d of dropArr) { if (!distinct[d]) { distinct[d] = 1; nD++; } }
      if (nD > 2) {
        var remain = dropSide === 'R' ? s.slice(bestIdx) : s.slice(0, bestIdx);
        var remainRange = remain[remain.length - 1] - remain[0];
        var totalRange = s[s.length - 1] - s[0];
        if (remainRange / totalRange > 0.6) dropSide = null;
      }
    }
    if (dropSide === 'R') { s = s.slice(bestIdx); changed = true; }
    else if (dropSide === 'L') { s = s.slice(0, bestIdx); changed = true; }
    else break;
  }
  return { min: s[0], max: s[s.length - 1] };
}
function countInEra(s, a, b, eraId) {
  var n = 0;
  for (var i = a; i < b; i++) if (eraOf(s[i]) === eraId) n++;
  return n;
}
function trustedStats(s, a, b, trustedSet) {
  var cnt = 0, mn = Infinity, mx = -Infinity, distinct = {};
  for (var i = a; i < b; i++) {
    if (trustedSet[s[i]]) {
      cnt++;
      if (s[i] < mn) mn = s[i];
      if (s[i] > mx) mx = s[i];
      distinct[s[i]] = 1;
    }
  }
  return {
    fraction: (b - a) ? cnt / (b - a) : 0,
    span: (mx === -Infinity) ? Infinity : mx - mn,
    distinct: Object.keys(distinct).length
  };
}

// A blank-fill ANSWER that is a pure number is a year only when the blank asks for a
// year. If the blank sits right next to a measurement word ("the _____ metres run",
// "about _____ tractors"), the number is a quantity and must not date the topic.
var MEAS_NEAR_BLANK = /_+[- ]?(?:metres?|meters?|m\b|km\b|kg\b|kgs?|kilometres?|kilometers?|miles?|li\b|feet|ft\b|inches?|cm\b|mm\b|grams?|tonnes?|tons?|litres?|liters?|ml\b|points?|pts\b|percent|%|rupees?|rs\b|lakh|crore|tractors|markets?|messages?|altitude|height|distance|weight|mass|speed|monks?|nuns?|monasteries?|monastaries?|soldiers|troops|students|workers|farmers|people|persons|years?|yrs?)/i;

function topicYears(name, qs, catKey) {
  var ys = [];
  var trusted = {};
  for (var q of qs) {
    var qtext = [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' ');
    var ansIsNum = /^\s*(1[0-9]{3}|20[0-2][0-9])\s*$/.test(q.answer || '');
    if (ansIsNum && MEAS_NEAR_BLANK.test(String(q.question || ''))) {
      qtext = [q.question, q.fact, q.hint].filter(Boolean).join(' ');
    }
    var fy = yearSignals(qtext);
    if (fy) {
      ys.push(fy.min); ys.push(fy.max);
      for (var k of Object.keys(fy.trusted)) trusted[k] = true;
    }
  }
  // A sub-topic's own questions are topically coherent, so every extracted year is
  // about the topic — keep BC/AD/century years always, and bare years 1000+ too
  // (previously bare 1000–1799 like "1066" or "1757" were wrongly dropped).
  var fl = ys.filter(function (y) { return trusted[y] || y < 0 || (y >= 1000 && y <= 2026); });
  var nY = nameYears(name);
  if (nY) { fl.push(nY.min); fl.push(nY.max); }
  if (!fl.length) return null;
  if (TOPIC_OVERRIDES[name]) {
    return { min: TOPIC_OVERRIDES[name][0], max: TOPIC_OVERRIDES[name][1] };
  }
  return robustSpan(fl, catKey, trusted);
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

// Surnames too common in India to act as a person's alias (they match unrelated people,
// e.g. "Singh" -> Manmohan Singh, "Bose" -> Bose-Einstein, "Chand" -> Chandigarh).
var COMMON_SURNAMES = ['singh', 'kumar', 'kumari', 'sharma', 'prasad', 'lal', 'ram', 'das', 'dev', 'roy', 'rao', 'nair', 'menon', 'iyer', 'iyengar', 'pillai', 'patil', 'khan', 'ahmed', 'ali', 'begum', 'kaur', 'pal', 'anand', 'rai', 'patel', 'bose', 'chand', 'pandey', 'naidu', 'chopra'];

// Trailing words that are NOT surnames (e.g. "Alexander the Great" -> "Great").
var NON_SURNAMES = ['great', 'the', 'of', 'de', 'junior', 'senior', 'saint', 'ii', 'iii', 'iv', 'v'];

// Entities whose bare surname is too ambiguous to reuse — match full name only.
// ("Gandhi" usually means Mahatma; Indira must be named explicitly.)
var NO_SURNAME_ALIAS = ['Indira Gandhi'];

function aliasesFor(name, isPerson) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) {
    a.push(parts.join(' '));
    if (isPerson && NO_SURNAME_ALIAS.indexOf(name) === -1) {
      var sur = parts[parts.length - 1].toLowerCase().replace(/\.$/, '');
      // distinctive surnames only (never "Singh"/"Patel"/"Bose"/"Great"...)
      if (sur.length >= 3 && COMMON_SURNAMES.indexOf(sur) === -1 && NON_SURNAMES.indexOf(sur) === -1) a.push(parts[parts.length - 1]);
    }
  }
  return a;
}

// Common adjectival/possessive tails that still refer to the same entity:
// "Gandhian" -> Gandhi, "Ashokan" -> Ashoka, "Gandhiji" -> Gandhi, "Gandhi's" -> Gandhi.
// Anything else after the alias (e.g. "GandhiNagar", "Chandigarh") is NOT a hit.
var INFLEX = ['an', 'ian', 'vian', 'ean', 'in', 'ine', 'ite', 'ist', 'ese', 'ers', 'ans', 'ians', 'ites', 'ji', 's', "'s"];

function buildAliasRe(aliases) {
  var seen = {};
  var alts = [];
  for (var a of aliases) {
    if (!a) continue;
    var k = a.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    alts.push(a);
  }
  if (!alts.length) return null;
  alts.sort(function (x, y) { return y.length - x.length; });
  return new RegExp('(^|[^a-z0-9])(' + alts.map(escapeRe).join('|') + ')([a-z]*)(?=[^a-z0-9]|$)', 'gi');
}

// Whole-word match with a short whitelist of inflections; resets lastIndex safely.
function aliasHit(re, txt) {
  if (!re) return false;
  re.lastIndex = 0;
  var m;
  while ((m = re.exec(txt))) {
    var alias = m[2];
    var suffix = m[3].toLowerCase();
    if (suffix === '' ) return true;
    if (alias.length >= 4 && INFLEX.indexOf(suffix) !== -1) return true;
  }
  return false;
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
      var span = topicYears(tname, qs, key);
      var timebase = null;
      var eraId = null;
      if (!span) {
        // No dateable content. Prefer a proper home over a fake "2026":
        // 1) news feeds keep their archive date, 2) historical topics land in
        // their era band, 3) everything else is left genuinely undated.
        if (NEWS_CATS.indexOf(key) !== -1) {
          var ap = archiveYears(qs);
          if (ap) { span = { min: ap.min, max: ap.max }; timebase = 'archive'; }
        }
        if (!span) {
          eraId = eraForTopic(tname, key);
          if (eraId) {
            var eobj = ERAS.find(function (x) { return x.id === eraId; });
            var mid = Math.round((eobj.min + eobj.max) / 2);
            span = { min: mid, max: mid };
            timebase = 'era';
          } else {
            timebase = 'undated';
          }
        }
      }
      var node = {
        id: id,
        name: tname,
        type: typeOf(tname),
        span: span,
        era: timebase === 'era' ? eraId : eraOf(span && span.min),
        timebase: timebase,
        level: 4,
        cats: [{ key: key, label: c.label, count: qs.length }],
        count: qs.length,
        desc: personDescFor(tname, qs)
      };
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
      var alRe = buildAliasRe(aliases);
      var negatives = (NEGATIVE_ALIASES[ename] || []).map(function (x) { return x.toLowerCase(); });
      var hitQs = [];
      var catMap = {};
      for (var it of all.all) {
        var txt = [it.q.question, it.q.answer, it.q.fact, it.q.hint].filter(Boolean).join(' ').toLowerCase();
        var negHit = negatives.length && negatives.some(function (x) { return txt.indexOf(x) !== -1; });
        if (!negHit && aliasHit(alRe, txt)) {
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
        if (fl.length) span = robustSpan(fl, null, trusted);
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
        aliases: aliases,
        desc: isPerson ? personDescFor(ename, hitQs) : null
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
  var linkRe = new RegExp('(^|[^a-z0-9])(' + aliasList.map(escapeRe).join('|') + ')([a-z]*)(?=[^a-z0-9]|$)', 'gi');
  var pairCount = {};
  for (var it2 of all.all) {
    var lt = [it2.q.question, it2.q.answer, it2.q.fact, it2.q.hint].filter(Boolean).join(' ').toLowerCase();
    var found = {};
    var m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(lt))) {
      var al = m[2].toLowerCase();
      var suffix = m[3].toLowerCase();
      if (suffix !== '' && (al.length < 4 || INFLEX.indexOf(suffix) === -1)) continue;
      var id = aliasMap[al];
      if (id) {
        var negs = NEGATIVE_ALIASES[id.slice(5)] || [];
        var negHit = negs.length && negs.some(function (x) { return lt.indexOf(x.toLowerCase()) !== -1; });
        if (!negHit) found[id] = true;
      }
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

  var MANUAL_LINKS = [
    ['seed|Mahatma Gandhi', 'seed|Indian independence movement', 5],
    ['seed|Mahatma Gandhi', 'seed|Indian National Congress', 4],
    ['seed|Mahatma Gandhi', 'seed|Non-cooperation movement', 4],
    ['seed|Mahatma Gandhi', 'seed|Civil disobedience movement', 4],
    ['seed|Mahatma Gandhi', 'seed|Salt march', 3],
    ['seed|Mahatma Gandhi', 'seed|Dandi March', 3],
    ['seed|Mahatma Gandhi', 'seed|Champaran Satyagraha', 3],
    ['seed|Mahatma Gandhi', 'seed|Quit India movement', 3],
    ['seed|Mahatma Gandhi', 'seed|Jawaharlal Nehru', 3],
    ['seed|Mahatma Gandhi', 'seed|B. R. Ambedkar', 3],
    ['seed|Mahatma Gandhi', 'seed|Rabindranath Tagore', 3],
    ['seed|Mahatma Gandhi', 'seed|Gopal Krishna Gokhale', 3],
    ['seed|Mahatma Gandhi', 'seed|Sardar Vallabhbhai Patel', 2],
    ['seed|Mahatma Gandhi', 'seed|C. Rajagopalachari', 2],
    ['seed|Mahatma Gandhi', 'seed|Jallianwala Bagh massacre', 2],
    ['seed|Indian National Congress', 'seed|Quit India movement', 3],
    ['seed|Indian National Congress', 'seed|Jawaharlal Nehru', 3],
    ['seed|Indian National Congress', 'seed|Indira Gandhi', 3],
    ['seed|Indian National Congress', 'seed|Partition of India', 2],
    ['seed|Indian National Congress', 'seed|Swadeshi movement', 2],
    ['seed|Indian National Congress', 'seed|Sarojini Naidu', 2],
    ['seed|Indian National Congress', 'seed|Annie Besant', 2],
    ['seed|Indian National Congress', 'seed|C. Rajagopalachari', 2],
    ['seed|Jawaharlal Nehru', 'seed|Five-Year Plans (India)', 3],
    ['seed|Jawaharlal Nehru', 'seed|Bangladesh Liberation War', 2],
    ['seed|Indira Gandhi', 'seed|Bangladesh Liberation War', 3],
    ['seed|Indira Gandhi', 'seed|Bank nationalisation in India', 3],
    ['seed|Indira Gandhi', 'seed|Pokhran-II', 2],
    ['seed|Subhas Chandra Bose', 'seed|Indian independence movement', 3],
    ['seed|Subhas Chandra Bose', 'seed|Quit India movement', 2],
    ['seed|B. R. Ambedkar', 'seed|Constituent Assembly of India', 3],
    ['seed|B. R. Ambedkar', 'seed|Partition of India', 2],
    ['seed|Sardar Vallabhbhai Patel', 'seed|Partition of India', 3],
    ['seed|Sardar Vallabhbhai Patel', 'seed|Constituent Assembly of India', 2],
    ['seed|Bhagat Singh', 'seed|Indian independence movement', 3],
    ['seed|Bhagat Singh', 'seed|Jallianwala Bagh massacre', 2],
    ['seed|Mohammad Ali Jinnah', 'seed|Partition of India', 3],
    ['seed|Mohammad Ali Jinnah', 'seed|Indian National Congress', 2],
    ['seed|Bal Gangadhar Tilak', 'seed|Swadeshi movement', 3],
    ['seed|Bal Gangadhar Tilak', 'seed|Indian National Congress', 2],
    ['seed|Lala Lajpat Rai', 'seed|Simon Commission', 3],
    ['seed|Mangal Pandey', 'seed|Revolt of 1857', 3],
    ['seed|Mangal Pandey', 'seed|Sepoy Mutiny', 3],
    ['seed|Rani Lakshmibai', 'seed|Revolt of 1857', 3],
    ['seed|Rani Lakshmibai', 'seed|Sepoy Mutiny', 2],
    ['seed|Rani Lakshmibai', 'seed|Indian independence movement', 2],
    ['seed|Khilafat movement', 'seed|Non-cooperation movement', 3],
    ['seed|Chandragupta Maurya', 'seed|Maurya Empire', 3],
    ['seed|Chanakya', 'seed|Chandragupta Maurya', 3],
    ['seed|Chanakya', 'seed|Maurya Empire', 2],
    ['seed|Ashoka', 'seed|Maurya Empire', 3],
    ['seed|Ashoka', 'seed|Kalinga War', 3],
    ['seed|Vedic period', 'seed|Maurya Empire', 2],
    ['seed|Samudragupta', 'seed|Gupta Empire', 3],
    ['seed|Gupta Empire', 'seed|Kushan Empire', 2],
    ['seed|Gupta Empire', 'seed|Chola Empire', 2],
    ['seed|Delhi Sultanate', 'seed|Vijayanagara Empire', 2],
    ['seed|Delhi Sultanate', 'seed|First Battle of Panipat', 3],
    ['seed|Mughal Empire', 'seed|Second Battle of Panipat', 3],
    ['seed|Mughal Empire', 'seed|Maratha Empire', 3],
    ['seed|Mughal Empire', 'seed|Battle of Plassey', 2],
    ['seed|Maratha Empire', 'seed|Third Battle of Panipat', 3],
    ['seed|Battle of Plassey', 'seed|Battle of Buxar', 3],
    ['seed|Anglo-Mysore Wars', 'seed|Anglo-Maratha Wars', 2],
    ['seed|First Anglo-Sikh War', 'seed|Second Anglo-Sikh War', 3],
    ['seed|Battle of Plassey', 'seed|Anglo-Mysore Wars', 2],
    ['seed|Sino-Indian War', 'seed|Indo-Pakistani War of 1965', 2],
    ['seed|Indo-Pakistani War of 1965', 'seed|Bangladesh Liberation War', 2],
    ['seed|Kargil War', 'seed|Sino-Indian War', 2],
    ['seed|Green Revolution', 'seed|Five-Year Plans (India)', 2],
    ['seed|Operation Flood', 'seed|Green Revolution', 2],
    ['seed|Economic liberalisation in India', 'seed|Demonetisation in India', 2],
    ['seed|Goods and Services Tax (India)', 'seed|Economic liberalisation in India', 2],
    ['seed|Reserve Bank of India', 'seed|Bank nationalisation in India', 2],
    ['seed|Chandrayaan-1', 'seed|Indian Space Research Organisation', 3],
    ['seed|Chandrayaan-1', 'seed|Chandrayaan-3', 3],
    ['seed|Mangalyaan', 'seed|Indian Space Research Organisation', 3],
    ['seed|Pokhran-II', 'seed|Nuclear tests of India', 3],
    ['seed|Polio', 'seed|Smallpox', 2],
    ['seed|Olympic Games', 'seed|Neeraj Chopra', 3],
    ['seed|Olympic Games', 'seed|Abhinav Bindra', 3],
    ['seed|Olympic Games', 'seed|Mary Kom', 2],
    ['seed|Olympic Games', 'seed|Saina Nehwal', 2],
    ['seed|Olympic Games', 'seed|Asian Games', 2],
    ['seed|Olympic Games', 'seed|Khelo India', 2],
    ['seed|Cricket World Cup', 'seed|T20 World Cup', 3],
    ['seed|Cricket World Cup', 'seed|Kapil Dev', 3],
    ['seed|Cricket World Cup', 'seed|Sachin Tendulkar', 3],
    ['seed|T20 World Cup', 'seed|Sachin Tendulkar', 2],
    ['seed|Milkha Singh', 'seed|P. T. Usha', 2]
  ];
  var linkMap = {};
  for (var li of links) linkMap[li.a + '\u0000' + li.b] = li.w;
  var addedManual = 0;
  for (var ml of MANUAL_LINKS) {
    var mk = ml[0] + '\u0000' + ml[1];
    var prev = linkMap[mk] || 0;
    if (ml[2] > prev) { linkMap[mk] = ml[2]; if (!prev) addedManual++; }
  }
  links = Object.keys(linkMap).map(function (k) {
    var sp = k.split('\u0000');
    return { a: sp[0], b: sp[1], w: linkMap[k] };
  });
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
  console.log('links: ' + links.length + ' (manual added: ' + addedManual + ', top: ' + links.slice(0, 5).map(function (l) { return l.a.replace('seed|', '') + '↔' + l.b.replace('seed|', '') + ':' + l.w; }).join(', ') + ')');
}

main();

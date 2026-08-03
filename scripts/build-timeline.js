// Builds data/timeline.json — a zoomable chronological knowledge map.
// Every sub-topic + seed entity gets a time span (from topic names + fact-text years),
// a type, an era, and question counts per category.
// Usage: node scripts/build-timeline.js
var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data', 'questions');
var OUT = path.join(__dirname, '..', 'data', 'timeline.json');

var YEAR_RE = /\b(1[0-9]{3}|20[0-2][0-9])\b/g;

var ERAS = [
  { id: 'ancient',       label: 'Ancient India',       min: -3000, max: 1199 },
  { id: 'medieval',      label: 'Medieval India',      min: 1200,  max: 1799 },
  { id: 'colonial',      label: 'Colonial Era',        min: 1800,  max: 1856 },
  { id: 'freedom',       label: 'Freedom Struggle',    min: 1857,  max: 1947 },
  { id: 'republic',      label: 'Republic / Post-independence', min: 1948, max: 1990 },
  { id: 'contemporary',  label: 'Contemporary India',  min: 1991,  max: 2026 }
];

// Curated spine: movements, people, diseases, schemes that anchor the story.
var SEED = {
  movements: ['Indian independence movement', 'Non-cooperation movement', 'Civil disobedience movement', 'Quit India movement', 'Khilafat movement', 'Partition of India', 'Simon Commission', 'Salt march', 'Jallianwala Bagh massacre', 'Revolt of 1857', 'Swadeshi movement', 'Indian National Congress', 'Constituent Assembly of India', 'Sepoy Mutiny', 'Bardoli Satyagraha', 'Champaran Satyagraha', 'Dandi March'],
  people: ['Mahatma Gandhi', 'B. R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Subhas Chandra Bose', 'Bal Gangadhar Tilak', 'Gopal Krishna Gokhale', 'Bhagat Singh', 'Mohammad Ali Jinnah', 'Rabindranath Tagore', 'Lal Bahadur Shastri', 'Indira Gandhi', 'Sarojini Naidu', 'Rajendra Prasad', 'C. Rajagopalachari', 'Mangal Pandey', 'Rani Lakshmibai', 'Vinayak Damodar Savarkar', 'Annie Besant', 'Dadabhai Naoroji', 'Lala Lajpat Rai', 'Bipin Chandra Pal'],
  diseases: ['COVID-19', 'Smallpox', 'Cholera', 'Plague', 'Tuberculosis', 'Leprosy', 'Polio', 'Malaria', 'Dengue', 'Spanish flu', 'Chikungunya', 'Kala-azar', 'Famine'],
  schemes: ['National Health Mission', 'Swachh Bharat Mission', 'Poshan Abhiyan', 'Ayushman Bharat', 'National Rural Health Mission', 'Green Revolution', 'Operation Flood', 'Pradhan Mantri Jan Dhan Yojana', 'Bharat Nirman']
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
  'Indian independence movement': [1857, 1947], 'Non-cooperation movement': [1920, 1922],
  'Civil disobedience movement': [1930, 1934], 'Quit India movement': [1942, 1942], 'Khilafat movement': [1919, 1924],
  'Partition of India': [1947, 1947], 'Simon Commission': [1928, 1928], 'Salt march': [1930, 1930],
  'Jallianwala Bagh massacre': [1919, 1919], 'Revolt of 1857': [1857, 1857], 'Swadeshi movement': [1905, 1908],
  'Indian National Congress': [1885, 2026], 'Constituent Assembly of India': [1946, 1950], 'Sepoy Mutiny': [1857, 1857],
  'Bardoli Satyagraha': [1928, 1928], 'Champaran Satyagraha': [1917, 1917], 'Dandi March': [1930, 1930],
  'COVID-19': [2019, 2026], 'Smallpox': [1800, 1980], 'Cholera': [1817, 2026], 'Plague': [1896, 2026],
  'Tuberculosis': [1800, 2026], 'Leprosy': [1800, 2026], 'Polio': [1900, 2014], 'Malaria': [1800, 2026],
  'Dengue': [1900, 2026], 'Spanish flu': [1918, 1920], 'Chikungunya': [1950, 2026], 'Kala-azar': [1800, 2026],
  'Famine': [1769, 1943],
  'National Health Mission': [2005, 2026], 'Swachh Bharat Mission': [2014, 2026], 'Poshan Abhiyan': [2018, 2026],
  'Ayushman Bharat': [2018, 2026], 'National Rural Health Mission': [2005, 2026], 'Green Revolution': [1960, 1980],
  'Operation Flood': [1970, 1996], 'Pradhan Mantri Jan Dhan Yojana': [2014, 2026], 'Bharat Nirman': [2005, 2014]
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

function yearsFrom(text) {
  var m = String(text || '').match(YEAR_RE);
  if (!m) return null;
  var ys = m.map(Number).filter(function (y) {
    if (y < 1000 || y > 2026) return false;
    return true;
  });
  if (!ys.length) return null;
  return { min: Math.min.apply(null, ys), max: Math.max.apply(null, ys) };
}

// Birth–death span for a person, e.g. "14 April 1891 – 6 December 1956" or "(1869–1948)".
function bioSpan(text) {
  var m = String(text || '').match(/\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})\s*[-\u2013]\s*\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})/);
  if (m) return { min: +m[1], max: +m[2] };
  m = String(text || '').match(/\(\s*(\d{3,4})\s*[-\u2013]\s*(\d{3,4})\s*\)/);
  if (m && +m[1] < +m[2] && +m[2] <= 2026) return { min: +m[1], max: +m[2] };
  return null;
}

function topicYears(name, qs) {
  var ny = yearsFrom(name);
  var ys = [];
  for (var q of qs) {
    var fy = yearsFrom([q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' '));
    if (fy) { ys.push(fy.min); ys.push(fy.max); }
  }
  // Topic-name years are authoritative; otherwise drop suspiciously early years
  // (4-digit numbers like ₹1000) unless the topic is genuinely ancient.
  var fl = ys.filter(function (y) { return ny || y >= 1800; });
  if (ny) { fl.push(ny.min); fl.push(ny.max); }
  if (!fl.length) return null;
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

function aliasesFor(name, grp) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) {
    a.push(parts.join(' '));
    if (grp === 'people') a.push(parts[parts.length - 1]); // surname only for people
  }
  return a;
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
        seen[id].cats.push({ key: key, label: c.label });
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
        cats: [{ key: key, label: c.label }],
        count: qs.length
      };
      seen[id] = node;
      nodes.push(node);
    }
  }

  // Seed entity nodes: match aliases across all questions
  for (var grp of Object.keys(SEED)) {
    for (var ename of SEED[grp]) {
      var aliases = aliasesFor(ename, grp);
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
      var bioSpans = [];
      var ownTopics = {}; // sub-topic name -> {n, firstBioSpan}
      var canonical = ename.replace(/^(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/i, '').replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      for (var hq of hitQs) {
        var allText = [hq.q.question, hq.q.answer, hq.q.fact, hq.q.hint].filter(Boolean).join(' ');
        var fy = yearsFrom(allText);
        if (fy) { ys.push(fy.min); ys.push(fy.max); }
        var bs = bioSpan(allText);
        if (bs) bioSpans.push(bs);
        if (grp === 'people') {
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
      } else if (grp === 'people') {
        // Prefer the largest own-topic's first (birth–death) span.
        var bestTopic = null;
        for (var tn of Object.keys(ownTopics)) {
          if (!bestTopic || ownTopics[tn].n > bestTopic.n) bestTopic = ownTopics[tn];
        }
        span = bestTopic && bestTopic.first ? bestTopic.first : modeSpan(bioSpans);
      }
      if (!span && ys.length) {
        var fl = ys.filter(function (y) { return y >= 1800; });
        if (fl.length) span = { min: Math.min.apply(null, fl), max: Math.max.apply(null, fl) };
      }
      var seedType = grp === 'people' ? 'person' : grp === 'movements' ? 'event' : grp === 'schemes' ? 'scheme' : 'disease';
      var node = {
        id: 'seed|' + ename,
        name: ename,
        type: seedType,
        level: seedType === 'event' ? 1 : seedType === 'person' ? 2 : 3,
        span: span,
        era: eraOf(span && span.min),
        cats: Object.keys(catMap).map(function (k) { return { key: k, label: all.cats[k] ? all.cats[k].label : k }; }),
        count: hitQs.length,
        seed: true
      };
      nodes.push(node);
    }
  }

  var out = { builtAt: new Date().toISOString(), eras: ERAS, nodes: nodes };
  fs.writeFileSync(OUT, JSON.stringify(out));
  var withSpan = nodes.filter(function (n) { return n.span; }).length;
  console.log('Wrote ' + OUT);
  console.log('nodes: ' + nodes.length + ' (with time span: ' + withSpan + ', ' + (withSpan / nodes.length * 100).toFixed(1) + '%)');
  console.log('seed entities: ' + SEED.movements.length + ' movements, ' + SEED.people.length + ' people, ' + SEED.diseases.length + ' diseases, ' + SEED.schemes.length + ' schemes');
}

main();

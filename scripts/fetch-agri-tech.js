var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var OUT_PATH = path.resolve(__dirname, '..', 'data/questions/agriculture-food.json');
var SUBJECT = 'Agriculture & Food';
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'AgriTechMiner/1.0 (contact: bot@vlymbooq.qzz.io)' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function makeQuestion(subTopic, qText, answer, source, factSentence) {
  if (!answer || answer.length < 2) return null;
  if (!qText || qText.length < 25) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var fact = factSentence ? factSentence.replace(/\s+/g, ' ').trim() : '';
  return {
    id: 'agritech_' + Math.round(Math.random() * 1e9),
    type: 'fill_blank',
    category: SUBJECT,
    region: '',
    source: source,
    pubDate: pubDate,
    subject: SUBJECT,
    subSubject: subTopic,
    emoji: '',
    question: qText,
    answer: answer,
    hint: '',
    fact: fact
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  return n(q.question || '') + '|' + n(q.answer || '');
}

function fetchExtract(title) {
  var url = API + '?action=query&prop=extracts&explaintext=1&exlimit=1&titles=' + encodeURIComponent(title) + '&format=json';
  return fetchJSON(url).then(function(d) {
    var pages = (d && d.query && d.query.pages) ? d.query.pages : {};
    var page = Object.values(pages).find(function(p) { return p && p.title && !p.missing; });
    if (!page || !page.extract) return '';
    return page.extract.replace(/\s+/g, ' ').trim();
  });
}

// Split text into sentences (periods of abbreviations protected)
function splitSentences(text) {
  if (!text) return [];
  // drop any heading bandit lines produced by the extractor (=== Section ===, "See also", lists)
  var drop = /^\s*(?:={2,}|#+)/;
  var sectionJunk = /^(?:see also|references|notes|external links|further reading|footnotes|bibliography|intro|lead|summary|watch)/i;
  var noHeadings = text
    .split('\n')
    .map(function(l) {
      var t = l.trim();
      if (drop.test(t) || sectionJunk.test(t) || /^[=#]/.test(t)) return '';
      return l;
    })
    .join(' ');
  var protected_ = noHeadings
    .replace(/[=\"']*\[\d+\][=\"']*/g, ' ')
    .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, '$1\u0001')
    .replace(/\b(\d+\.\d+)\b/g, function(m) { return m.replace('.', '\u0001'); });
  return protected_
    .split(/\.\s+/)
    .map(function(s) { return s.replace(/\u0001/g, '.').trim(); })
    .filter(function(s) { return s.length > 0; });
}

var STOP = /^(The|This|It|He|She|They|We|I|You|His|Her|Its|Their|An|A|India|Many|Most|Some|Few|All|Each|Every|Both|Such|These|Those|That|Which|What|Who|When|Where|How|Would|Could|Should|After|Before|During|Until|Since|Within|Without|About|Between|Among|Also|Only|Just|Very|Still|Even|Well|Year|Years|Name|New|Old|National|Public|General|Known|Established|Founded|Introduced|Developed|The|Of|In|On|At|By|For|From|With|Used|Type|Types|Part|Parts|Group|Groups|Form|Forms|Basis|Set|Made|Called|List)$/i;

// Blank a single proper-noun term or year mid-sentence (like the main miner).
function blankTerm(sent, title) {
  title = title || '';
  var titleWords = new Set(title.toLowerCase().split(/\s+/));
  var all = [];
  var re = /([A-Z][a-z]+(?:\.[a-z]{2,})?(?:\s+[A-Z]\.(?:\s+[A-Z][a-z]+)?|\s+[A-Z][a-z]+){0,5})/g, m;
  while ((m = re.exec(sent)) !== null) all.push(m[1]);
  re = /\b([A-Z]{2,6})\b/g;
  while ((m = re.exec(sent)) !== null) all.push(m[1]);

  var candidates = all.filter(function(t) {
    if (t.length < 4) return false;
    if (STOP.test(t)) return false;
    if (t === title) return false;
    if (/^\d+$/.test(t)) return false;
    var tw = t.toLowerCase().split(/\s+/);
    if (tw.every(function(w) { return titleWords.has(w); })) return false;
    if (new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s,;:]', 'i').test(sent.trim())) return false;
    return true;
  });
  if (!candidates.length) return null;

  // Prefer multi-word / long terms
  var multi = candidates.filter(function(c) { return c.split(/\s+/).length > 1 || c.length > 6; });
  var pool = multi.length ? multi : candidates;
  var target = pool.sort(function(a, b) { return b.length - a.length; })[0];
  var idx = sent.indexOf(target);
  if (idx < 0) return null;
  // enforce whole-word boundaries so we never blank a mid-word fragment
  var before = idx === 0 ? '' : sent[idx - 1];
  var after = sent[idx + target.length] || '';
  if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) return null;
  var q = sent.substring(0, idx) + '_____' + sent.substring(idx + target.length);
  // reject leading blank or blank adjacent to nothing
  if (/^_____/.test(q.trim())) return null;
  if (q.length < 25 || q.length > 280) return null;
  if (/_____\s*$/.test(q)) return null;
  return { question: q.trim().replace(/[,\s;]+$/g, ''), answer: target };
}

// Blank a year after verbs like established/founded/commenced/began
function blankYear(sent) {
  var m = sent.match(/\b(began|started|commenced|initiated|established|founded|created|introduced|launched|enacted|implemented|passed|signed|ratified|opened|declared|announced)\s+(?:in\s+)?(1[0-9]{3}|20[0-9]{2})\b/i);
  if (!m) return null;
  var year = m[2];
  var idx = sent.lastIndexOf(year);
  if (idx < 0) return null;
  var q = sent.substring(0, idx) + '_____' + sent.substring(idx + year.length);
  if (/^_____\s/.test(q)) return null;
  if (q.length < 25 || q.length > 280) return null;
  return { question: q.trim().replace(/[.,\s;]+$/, ''), answer: year };
}

// "...such as A, B and C" — blank the last item, keep the rest as hints.
function blankList(sent) {
  var ml = sent.match(/\b(?:such as|including|like|these include)\s+([A-Za-z][^.]{8,160})/i);
  if (!ml) return null;
  var markers = /\b(?:which|who|whom|whose|this|that|these|those|have|has|had|was|were|is|are|may|might|although|because|while|since|however|argued|state|stated|said|suggest|suggested|described|included|including)\b/i;
  var region = ml[1].replace(/\.$/, '').replace(/,\s+as well as\b[\s\S]*$/i, '');
  if (markers.test(region)) return null;
  var items = region.split(/[,;]|\s+and\s+|\s+or\s+/)
    .map(function(x) { return x.replace(/^[\s"'\[(]+|[\s"'\])]+$/g, '').trim(); })
    .filter(function(x) { return x.length > 3 && !/^(and|or)$/i.test(x); });
  if (items.length < 3) return null;
  var last = items[items.length - 1];
  if (last.split(/\s+/).length > 4 || last.length > 30) return null;
  var li = sent.lastIndexOf(last);
  if (li < 0) return null;
  var before = li === 0 ? '' : sent[li - 1];
  var after = sent[li + last.length] || '';
  if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) return null;
  var context = (sent.substring(0, li) + '_____' + sent.substring(li + last.length))
    .replace(/[\s,"')\]]+$/g, '').trim();
  if (context.length < 25 || context.length > 280) return null;
  if (/^_____/.test(context) || /_____\s*$/.test(context)) return null;
  return { question: context, answer: last };
}

var TOPICS = {
  'Agronomy': ['Agronomy', 'Crop rotation', 'Multiple cropping', 'Strip cropping', 'Cover crop', 'Kharif crop', 'Rabi crop'],
  'Soil Science': ['Soil science', 'Soil horizon', 'Pedology', 'Soil fertility', 'Soil texture', 'Soil organic matter'],
  'Plant Pathology': ['Plant pathology', 'Fungicide', 'Mycology', 'Fungal plant pathogens'],
  'Agricultural Entomology': ['Entomology', 'Integrated pest management', 'Biological pest control', 'Insecticide'],
  'Plant Breeding & Genetics': ['Plant breeding', 'Hybrid seed', 'Mutation breeding', 'Cultivar', 'Marker-assisted selection'],
  'Horticulture': ['Horticulture', 'Pomology', 'Olericulture', 'Floriculture', 'Landscaping'],
  'Irrigation & Water Management': ['Irrigation', 'Drip irrigation', 'Sprinkler irrigation', 'Water resources management', 'Crop coefficient'],
  'Agricultural Engineering': ['Agricultural engineering', 'Tractor', 'Combine harvester', 'Irrigation sprinkler'],
  'Agricultural Economics & Extension': ['Agricultural economics', 'Agricultural extension', 'Minimum support price', 'Agribusiness'],
  'Weed Science': ['Weed', 'Herbicide', 'Mulch', 'Pesticide'],
  'Seed Science': ['Seed', 'Germination', 'Seed bank', 'Seed treatment'],
  'Agricultural Meteorology': ['Agroecology', 'Growing degree-day', 'Microclimate', 'Photosynthesis']
};

async function mine(topic, title) {
  var extract = await fetchExtract(title);
  if (!extract) return [];
  var sents = splitSentences(extract);
  var out = [], seen = {};
  for (var i = 0; i < sents.length; i++) {
    var s = sents[i];
    if (s.length < 40 || s.length > 280) continue;
    // skip list/boilerplate sentences
    if (/^(List of|See also|References|Notes|External links|Archived from|Retrieved|This article|The article|This article is about|For the)/i.test(s)) continue;
    if (/[=#\[\]{}]/.test(s)) continue;
    var f = blankYear(s) || blankList(s) || blankTerm(s, title);
    if (!f) continue;
    var key = (f.question + '|' + f.answer).toLowerCase();
    if (seen[key]) continue;
    seen[key] = 1;
    out.push(makeQuestion(topic, f.question, f.answer, 'Wiki', s));
    if (out.length >= 4) break;
  }
  return out;
}

// Fill the `fact` field for existing questions that somehow have an empty fact,
// by locating the sentence in the source extract that contains the answer.
async function backfillFacts(topic) {
  var list = existing[SUBJECT].subSubjects[topic];
  if (!list) return;
  var empty = list.filter(function(q) { return !q.fact || !String(q.fact).trim(); });
  if (!empty.length) return;
  var titles = TOPICS[topic] || [];
  for (var ti = 0; ti < titles.length; ti++) {
    var extract = await fetchExtract(titles[ti]);
    if (!extract) continue;
    var sents = splitSentences(extract);
    empty.forEach(function(q) {
      if (q.fact && String(q.fact).trim()) return;
      var ans = (q.answer || '').replace(/\s+/g, ' ').trim();
      if (!ans) return;
      for (var i = 0; i < sents.length; i++) {
        if (sents[i].indexOf(ans) >= 0) {
          q.fact = sents[i].replace(/\s+/g, ' ').trim();
          break;
        }
      }
    });
  }
  await delay(400);
}

// Fill the `fact` field for existing questions that somehow have an empty fact,
// by locating the sentence in the source extract that contains the answer.
async function backfillFacts(existing, topic) {
  var list = existing[SUBJECT].subSubjects[topic];
  if (!list) return;
  var empty = list.filter(function(q) { return !q.fact || !String(q.fact).trim(); });
  if (!empty.length) return;
  var titles = TOPICS[topic] || [];
  for (var ti = 0; ti < titles.length; ti++) {
    var extract = await fetchExtract(titles[ti]);
    if (!extract) continue;
    var sents = splitSentences(extract);
    empty.forEach(function(q) {
      if (q.fact && String(q.fact).trim()) return;
      var ans = (q.answer || '').replace(/\s+/g, ' ').trim();
      if (!ans) return;
      for (var i = 0; i < sents.length; i++) {
        if (sents[i].indexOf(ans) >= 0) {
          q.fact = sents[i].replace(/\s+/g, ' ').trim();
          break;
        }
      }
    });
  }
  await delay(400);
}

async function main() {
  var existing = {};
  if (fs.existsSync(OUT_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')); } catch (e) { existing = {}; }
  }
  if (!existing[SUBJECT]) existing[SUBJECT] = { subSubjects: {} };
  var seen = {};
  Object.keys(existing[SUBJECT].subSubjects).forEach(function(ss) {
    existing[SUBJECT].subSubjects[ss].forEach(function(q) { seen[eventKey(q)] = true; });
  });

  var totalAdded = 0;
  process.stdout.write('Mining ' + Object.keys(TOPICS).reduce(function(s, k) { return s + TOPICS[k].length; }, 0) + ' technical pages...\n');

  for (var topic in TOPICS) {
    if (!existing[SUBJECT].subSubjects[topic]) existing[SUBJECT].subSubjects[topic] = [];
    for (var ti = 0; ti < TOPICS[topic].length; ti++) {
      var title = TOPICS[topic][ti];
      var pageKey = title.toLowerCase();
      // only cap per-topic growth so repeat runs stay clean
      var pageQ = (existing[SUBJECT].subSubjects[topic] || []).filter(function(q) { return (q.source === 'Wiki'); });
      var addedNow = 0;
      try {
        var mined = await mine(topic, title);
        for (var mi = 0; mi < mined.length; mi++) {
          var q = mined[mi];
          if (seen[eventKey(q)]) continue;
          existing[SUBJECT].subSubjects[topic].push(q);
          seen[eventKey(q)] = true;
          totalAdded++;
        }
      } catch (e) { /* tolerate */ }
      await delay(600);
    }
    await backfillFacts(existing, topic);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(existing), 'utf8');
  console.log('Agriculture tech fetch done: ' + totalAdded + ' new questions across ' + Object.keys(TOPICS).length + ' sub-topics');
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
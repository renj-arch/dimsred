var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'EnvNewsBot/1.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function stripHtml(html) { return html.replace(/<[^>]+>/g, ' ').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim(); }

function eventKey(q) {
  return (q.question || q.text || '').substring(0, 80) + '|' + (q.answer || q.entity || '');
}

function extractEntity(eventHtml) {
  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+?)(?:#[^"]*)?"[^>]*>/g;
  var links = [], m;
  while ((m = linkRe.exec(eventHtml)) !== null) {
    var title = decodeURIComponent(m[1].replace(/_/g, ' '));
    if (title.length > 2 && title.length < 80 && title.indexOf(':') === -1 && title.indexOf('/') === -1) {
      links.push(title);
    }
  }
  return links.length > 0 ? links[0] : '';
}

function categorizeEnvEvent(text) {
  var t = text.toLowerCase();
  if (/climate|global warming|greenhouse|emission|carbon|paris agreement|cop\d+/i.test(t)) return 'Environment & Climate';
  if (/forest|deforestation|wildlife|endangered|species|national park|tiger reserve|sanctuary/i.test(t)) return 'Environment & Climate';
  if (/pollution|air quality|water quality|waste|plastic|recycling/i.test(t)) return 'Environment & Climate';
  if (/renewable|solar|wind|green energy|clean energy|net zero/i.test(t) && /india/i.test(t)) return 'Environment & Climate';
  if (/flood|drought|cyclone|heatwave|landslide|natural disaster/i.test(t) && /india/i.test(t)) return 'Environment & Climate';
  if (/unfccc|ipcc|unep|environment\s+programme|world\s+environment/i.test(t)) return 'Environment & Climate';
  return null;
}

function makeQuestion(event, seq) {
  var id = 'env_' + event.year + '_' + pad(event.month) + '_' + pad(seq);
  var pubDate = event.year + '-' + pad(event.month) + '-' + pad(event.day) + 'T12:00:00.000Z';
  var qText = event.text;
  var answer = event.entity;
  if (qText.length > 250) qText = qText.substring(0, 247) + '...';
  var blankText = qText;
  var finalAnswer = answer;
  var answerEscaped = answer.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var wordRe = new RegExp('\\b' + answerEscaped + '\\b', 'i');
  var m = wordRe.exec(blankText);
  if (m) {
    blankText = blankText.substring(0, m.index) + '_____' + blankText.substring(m.index + m[0].length);
  } else {
    var stemRe = new RegExp('\\b' + answerEscaped + '\\w*\\b', 'i');
    var m2 = stemRe.exec(blankText);
    if (m2) {
      blankText = blankText.substring(0, m2.index) + '_____' + blankText.substring(m2.index + m2[0].length);
      finalAnswer = m2[0];
    }
  }
  return {
    id: id,
    type: 'fill_blank',
    category: 'PIB',
    region: '',
    source: 'Wikipedia Environment',
    pubDate: pubDate,
    subject: 'PIB Releases',
    subSubject: 'Environment & Climate',
    emoji: '\uD83C\uDF3F',
    question: blankText,
    answer: finalAnswer,
    hint: '',
    fact: event.text.substring(0, 500)
  };
}

function parseDateFromLabel(label) {
  var parts = label.replace(/,.*$/, '').trim().split(' ');
  var day = parseInt(parts[parts.length - 1], 10);
  if (isNaN(day)) day = parseInt(parts[0], 10);
  return day;
}

function parseDaySections(html) {
  var sections = [];
  var dayBlockRe = /<div[^>]*role="region"[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  var m;
  while ((m = dayBlockRe.exec(html)) !== null) {
    var dayLabel = m[1].trim();
    var dayContent = m[2];
    var events = [];
    var liRe = /<li>(.*?)<\/li>/g;
    var lm;
    while ((lm = liRe.exec(dayContent)) !== null) {
      events.push({ text: stripHtml(lm[1]), html: lm[1] });
    }
    if (events.length > 0) sections.push({ label: dayLabel, events: events });
  }
  if (sections.length === 0) {
    var altRe = /<div class="current-events[^"]*">[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    while ((m = altRe.exec(html)) !== null) {
      var content = m[1];
      var labelMatch = content.match(/<b>\s*([A-Z][a-z]+ \d+)/);
      var dayLabel = labelMatch ? labelMatch[1] : '';
      if (!dayLabel) continue;
      var events = [];
      var liRe = /<li>(.*?)<\/li>/g;
      while ((lm = liRe.exec(content)) !== null) {
        events.push({ text: stripHtml(lm[1]), html: lm[1] });
      }
      if (events.length > 0) sections.push({ label: dayLabel, events: events });
    }
  }
  return sections;
}

async function fetchMonthEvents(year, month) {
  var page = 'Portal:Current_events/' + MONTHS[month - 1] + '_' + year;
  var url = API + '?action=parse&page=' + encodeURIComponent(page) + '&prop=text&format=json';
  var data;
  try { data = await fetchJSON(url); } catch (e) { return null; }
  if (!data || !data.parse || !data.parse.text) return null;
  var html = data.parse.text['*'] || '';
  var sections = parseDaySections(html);
  return { html: html, sections: sections };
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
    } catch (e) { existing = {}; }
  }
  var PIB_KEY = 'PIB Releases';
  if (!existing[PIB_KEY]) existing[PIB_KEY] = { subSubjects: {} };
  ['Environment & Climate', 'Agriculture', 'Health'].forEach(function(cat) {
    if (!existing[PIB_KEY].subSubjects[cat]) existing[PIB_KEY].subSubjects[cat] = [];
  });

  var existingKeys = {};
  var seqCounter = { event: 0 };
  existing[PIB_KEY].subSubjects['Environment & Climate'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
    var parts = q.id.split('_');
    var seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > seqCounter.event) seqCounter.event = seq;
  });
  existing[PIB_KEY].subSubjects['Agriculture'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });
  existing[PIB_KEY].subSubjects['Health'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var now = new Date();
  var cy = now.getFullYear();
  var cm = now.getMonth() + 1;
  var cd = now.getDate();
  var DAYS_BACK = 30;
  var cutoff = new Date(cy, cm - 1, cd - DAYS_BACK + 1);

  var monthsToFetch = {};
  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthsToFetch[key] = { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  var monthlySections = {};
  var monthKeys = Object.keys(monthsToFetch).sort();
  for (var i = 0; i < monthKeys.length; i++) {
    var mk = monthKeys[i];
    var my = monthsToFetch[mk].year;
    var mm = monthsToFetch[mk].month;
    var result = await fetchMonthEvents(my, mm);
    if (result) monthlySections[mk] = result.sections;
    if (i < monthKeys.length - 1) await delay(500);
  }

  var newEnvQuestions = [], newAgriQuestions = [], newHealthQuestions = [];

  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var mk = y + '-' + pad(m);
    if (!monthlySections[mk]) continue;
    var daySections = monthlySections[mk].filter(function(s) { return parseDateFromLabel(s.label) === day; });
    if (daySections.length === 0) continue;

    daySections[0].events.forEach(function(ev) {
      var cat = categorizeEnvEvent(ev.text);
      if (!cat) return;
      var entity = extractEntity(ev.html);
      if (!entity) return;
      var key = eventKey({ text: ev.text, entity: entity });
      if (existingKeys[key]) return;
      existingKeys[key] = true;
      seqCounter.event++;
      var q = makeQuestion({ year: y, month: m, day: day, text: ev.text, entity: entity }, seqCounter.event);
      if (cat === 'Agriculture') newAgriQuestions.push(q);
      else if (cat === 'Health') newHealthQuestions.push(q);
      else newEnvQuestions.push(q);
    });
  }

  newEnvQuestions.forEach(function(q) { existing[PIB_KEY].subSubjects['Environment & Climate'].push(q); });
  newAgriQuestions.forEach(function(q) { existing[PIB_KEY].subSubjects['Agriculture'].push(q); });
  newHealthQuestions.forEach(function(q) { existing[PIB_KEY].subSubjects['Health'].push(q); });

  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Environment: ' + existing[PIB_KEY].subSubjects['Environment & Climate'].length + ' (' + newEnvQuestions.length + ' new)');
  console.error('Agriculture: ' + existing[PIB_KEY].subSubjects['Agriculture'].length + ' (' + newAgriQuestions.length + ' new)');
  console.error('Health: ' + existing[PIB_KEY].subSubjects['Health'].length + ' (' + newHealthQuestions.length + ' new)');
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});

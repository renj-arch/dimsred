const https = require('https');
const fs = require('fs');

const API = 'https://en.wikipedia.org/w/api.php';
const OUTPUT = 'data/questions/current-events.json';
const ARCHIVE = 'archive.html';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_BACK = 5;

const AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'CurrentEventsFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { var d = new Date(); console.error('[' + d.toISOString().slice(11,19) + '] ' + msg); }

function stripHtml(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function extractEntity(eventHtml) {
  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+?)(?:#[^"]*)?"[^>]*>/g;
  var links = [];
  var m;
  while ((m = linkRe.exec(eventHtml)) !== null) {
    var title = decodeURIComponent(m[1].replace(/_/g, ' '));
    if (title.length > 2 && title.length < 80 && title.indexOf(':') === -1 && title.indexOf('/') === -1) {
      links.push(title);
    }
  }
  return links.length > 0 ? links[0] : '';
}

function scoreEvent(ev) {
  var text = ev.text.toLowerCase();
  var entity = ev.entity.toLowerCase();
  var score = 0;

  if (/india/i.test(text)) {
    score += 4;
    if (/government|pm|modi|minist|scheme|policy|budget|parliament|election|bill|act|rupee|rupees|billion|crore/i.test(text)) score += 3;
    if (/sign|deal|agreement|visit|summit|meeting|bilateral/i.test(text)) score += 3;
    if (/defence|defense|missile|navy|air force|army|border|drdo|isro|space/i.test(text)) score += 3;
    if (/supreme court|high court|verdict|judgment|ruling/i.test(text)) score += 3;
  }
  if (/indian/i.test(entity)) score += 3;

  if (/\b(united nations|who|world bank|imf|wto|nato|eu|brics|g20|scos?|oecd|opec|aib|adb|ndb|unicef|unesco|icj|icc|fao|ilo|iaea|wipo|international atomic energy agency|international monetary fund|world health organization|world trade organization|united nations children.s fund|united nations educational|international court of justice|international criminal court)\b/i.test(text)) score += 4;
  if (/\b(who|united nations|world bank|imf|brics|g20|nato)\b/i.test(entity)) score += 3;

  if (/^(usa|united states|china|russia|uk|japan|germany|france|iran|israel|pakistan|australia|canada|south korea|north korea|indonesia|turkey|italy|spain)\b/i.test(entity)) score += 2;
  if (/^(bangladesh|nepal|sri lanka|afghanistan|myanmar|ukraine|taiwan)\b/i.test(entity)) score += 2;
  if (/\b(usa|united states|china|russia|uk|japan|germany|france|iran|israel|pakistan|australia|canada|south korea|north korea|turkey|ukraine|taiwan)\b/i.test(text)) score += 1;

  if (/treaty|summit|agreement|pact|accord|memorandum|protocol|convention|ceasefire|truce|prisoner\s+exchange/i.test(text)) score += 3;
  if (/election|elected|appointed|re-elected|sworn\s+in|referendum|president|prime minister\b/i.test(text)) score += 3;
  if (/gdp|inflation|budget|fiscal|monetary|deficit|tariff|sanctions|trade\s+(war|deal)/i.test(text)) score += 3;
  if (/launch(?:ed|es)?\s+(?:satellite|mission|rocket|spacecraft)|isro|nasa|space\s+(?:station|mission)|discover(?:y|ed)|clinical\s+trial|vaccine|gene|dna|quantum|ai\s+|artificial\s+intelligence/i.test(text)) score += 3;
  if (/exercise|drill|missile|warship|submarine|fighter\s+jet|defence|defense|military\s+(?:exercise|drill|aid)|nuclear\s+(?:weapon|test|program|facility)/i.test(text)) score += 2;
  if (/climate|emissions|carbon|renewable|conservation|endangered|species|habitat|deforestation|paris\s+agreement|cop\d+/i.test(text)) score += 2;
  if (/nobel|prize|award(?:ed)?|passed\s+away|obituary|cremation|funeral/i.test(text)) score += 3;
  if (/supreme\s+court|verdict|judgment|ruling|amendment|bill|legislation|law|enact|enacted|cleared|approved|court\s+rules|court\s+sentence|war\s+crime|war\s+crimes|genocide|crimes\s+against\s+humanity/i.test(text)) score += 2;
  if (/outbreak|pandemic|epidemic|ebola|marburg|virus|disease|clinical|trial/i.test(text)) score += 2;

  // Violent/death content: strongly penalize
  if (/\b(killed|killing|kills|kill|dead|die|died|dies|death|deaths|murder|murdered|shooting|shot|gunshot|explosion|blast|bomb|bombing|casualty|casualties|suicide|massacre|assassination|assassinated|kidnapped|kidnapping|lynching|riots?|clash(?:es)?|firing|gunfire|stabbing|stabbed|beheaded|executed|execution|ambush|insurgency|militant|militants|IED|shelling|bloodshed|genocide)\b/i.test(text)) score -= 15;

  if (/\b(bus|car|truck|van|train|plane|vehicle|lorry|ambulance)\s+(crash|collision|accident|overturn|plunge|ram|hit|struck|collided|plows?|ploughs?)\b/i.test(text)) score -= 8;
  if (/\b(collides?|collided?|collision)\s+with\s+(a\s+)?(bus|car|truck|van|train|tractor)\b/i.test(text)) score -= 8;
  if (/fire\s+(?:at|in|kills|destroys?|gut)/i.test(text) && !/government|investigation|compensation/i.test(text) && !/industry/i.test(text)) score -= 3;
  if (/\b(tennis|football|cricket|basketball|golf|hockey|baseball|badminton|swimming|athletics|auto racing)\b/i.test(entity) && !/\b(world\s+(?:cup|championship)|olympic|asian\s+games|grand\s+slam|super\s+(?:bowl|league))\b/i.test(text)) score -= 6;
  if (/ipl|indian premier league/i.test(text) && !/award|ban|scandal|investigation/i.test(text)) score -= 6;
  if (/\b(actress|actor|singer|film|movie|album|concert|song|musician|director|producer)\b/i.test(entity) && !/died|award|nobel|funeral/i.test(text)) score -= 6;
  if (/(?:shooting|stabbing|robbery|murder)\s+(?:at|in|near|of|kills)/i.test(text) && !/terroris|militant|government|police\s+(?:operation|action|kill)/i.test(text)) score -= 5;
  if (/acquire|merger|stocks?|shares?|bought|purchased|sold/i.test(text) && !/india|regulator|approved|ban|government|policy/i.test(text)) score -= 3;
  if (/\b(storm|rain|snow|heatwave?|hail)\b/i.test(entity) && !/india|die|killed|destroy|flood/i.test(text)) score -= 3;
  if (text.length < 60) score -= 2;
  if (entity.split(' ').length > 3 && !/india|united nations|who|world|international|china|russia|usa|uk|iran|israel/i.test(text)) score -= 2;

  return score;
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
      var txt = stripHtml(lm[1]);
      if (txt.length > 40 && txt.length < 400 && txt.indexOf('_____') === -1 && txt.indexOf('___') === -1) {
        var entity = extractEntity(lm[1]);
        if (entity) {
          events.push({ text: txt, entity: entity });
        }
      }
    }
    if (events.length > 0) {
      sections.push({ label: dayLabel, events: events });
    }
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
      var lm;
      while ((lm = liRe.exec(content)) !== null) {
        var txt = stripHtml(lm[1]);
        if (txt.length > 40 && txt.length < 400 && txt.indexOf('_____') === -1 && txt.indexOf('___') === -1) {
          var entity = extractEntity(lm[1]);
          if (entity) {
            events.push({ text: txt, entity: entity });
          }
        }
      }
      if (events.length > 0) {
        sections.push({ label: dayLabel, events: events });
      }
    }
  }
  return sections;
}

function parseDateFromLabel(label) {
  var parts = label.replace(/,.*$/, '').trim().split(' ');
  var day = parseInt(parts[parts.length - 1], 10);
  if (isNaN(day)) day = parseInt(parts[0], 10);
  return day;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function makeQuestion(event, seq) {
  var id = 'ce_' + event.year + '_' + pad(event.month) + '_' + pad(seq);
  var monthLabel = MONTHS[event.month - 1] + ' ' + event.year;
  var day = event.day || 15;
  var pubDate = event.year + '-' + pad(event.month) + '-' + pad(day) + 'T12:00:00.000Z';

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
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia Current Events',
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: monthLabel,
    emoji: '',
    question: blankText,
    answer: finalAnswer,
    hint: '',
    fact: event.text.substring(0, 500)
  };
}

function eventKey(ev) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(ev.question || ev.text || '').substring(0, 80) + '|' + n(ev.answer || ev.entity || '');
}

function updateArchiveHtml(entryStr, total) {
  var path = ARCHIVE;
  if (!fs.existsSync(path)) {
    console.error('  WARN: ' + path + ' not found, skipping CAT_INDEX update');
    return;
  }
  var html = fs.readFileSync(path, 'utf8');
  var pattern = /"name":"Current Affairs"[^}]+?subSubjects":\[[^\]]*\]\}\]\}/;
  if (!pattern.test(html)) {
    console.error('  WARN: Current Affairs entry not found in ' + path + ', skipping update');
    return;
  }
  html = html.replace(pattern, entryStr);

  html = html.replace(/(Current Affairs[^<]*?sidebar-count">)\d+(<\/span>)/g, '$1' + total + '$2');

  html = html.replace(/(Current Affairs[^<]*?subj-card-count">)\d+/g, '$1' + total);

  fs.writeFileSync(path, html, 'utf8');
  console.error('  Updated CAT_INDEX and sidebar counts in ' + path);
}

async function fetchMonthEvents(year, month) {
  var page = 'Portal:Current_events/' + MONTHS[month - 1] + '_' + year;
  var url = API + '?action=parse&page=' + encodeURIComponent(page) + '&prop=text&format=json';

  var data;
  try {
    data = await fetchJSON(url);
  } catch (e) {
    console.error('  Error fetching ' + page + ': ' + e.message);
    return null;
  }

  if (!data || !data.parse || !data.parse.text) {
    console.error('  No data for ' + page);
    return null;
  }

  var html = data.parse.text['*'] || '';
  var sections = parseDaySections(html);
  console.error('  ' + page + ': ' + sections.length + ' day sections found');
  return { html: html, sections: sections };
}

async function main() {
  var now = new Date();
  var cy = now.getFullYear();
  var cm = now.getMonth() + 1;
  var cd = now.getDate();

  log('Reading existing file...');
  var existing = { 'Current Affairs': { subSubjects: {} } };
  if (fs.existsSync(OUTPUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8').replace(/^\uFEFF/, ''));
      log('Read existing file with ' + Object.keys(existing['Current Affairs'].subSubjects).length + ' months');
    } catch (e) {
      log('Error reading existing file, starting fresh: ' + e.message);
    }
  }

  var todayStr = cy + '-' + pad(cm) + '-' + pad(cd);
  var cutoff = new Date(cy, cm - 1, cd - DAYS_BACK + 1);
  log('Fetching events from ' + (cutoff.getMonth() + 1) + '/' + cutoff.getDate() + '/' + cutoff.getFullYear() + ' to ' + todayStr);

  var monthsToFetch = {};
  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthsToFetch[key] = { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  var monthKeys = Object.keys(monthsToFetch).sort();
  log('Months to fetch: ' + monthKeys.join(', '));

  var monthlySections = {};
  for (var i = 0; i < monthKeys.length; i++) {
    var mk = monthKeys[i];
    var my = monthsToFetch[mk].year;
    var mm = monthsToFetch[mk].month;
    log('Fetching ' + MONTHS[mm - 1] + ' ' + my + '...');
    var t0 = Date.now();
    var result = await fetchMonthEvents(my, mm);
    log('  API + parse: ' + (Date.now() - t0) + 'ms');
    if (result) {
      monthlySections[mk] = result.sections;
    }
    if (i < monthKeys.length - 1) await delay(500);
  }

  log('Processing ' + monthKeys.length + ' month(s) of events...');
  var newCount = 0;
  var skipCount = 0;
  var totalEvents = 0;

  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var monthKey = MONTHS[m - 1] + ' ' + y;
    var mk = y + '-' + pad(m);

    if (!monthlySections[mk]) continue;

    var daySections = monthlySections[mk].filter(function(s) {
      return parseDateFromLabel(s.label) === day;
    });

    if (daySections.length === 0) continue;

    var events = daySections[0].events;
    totalEvents += events.length;

    events.forEach(function(ev) { ev.score = scoreEvent(ev); });
    events.sort(function(a, b) { return b.score - a.score; });
    var kept = events.filter(function(ev) { return ev.score >= 2; });

    if (kept.length === 0) continue;

    if (!existing['Current Affairs'].subSubjects[monthKey]) {
      existing['Current Affairs'].subSubjects[monthKey] = [];
    }

    var existingKeys = {};
    existing['Current Affairs'].subSubjects[monthKey].forEach(function(q) {
      existingKeys[eventKey(q)] = true;
    });

    kept.forEach(function(ev) {
      var key = eventKey(ev);
      if (!existingKeys[key]) {
        ev.year = y;
        ev.month = m;
        ev.day = day;
        existingKeys[key] = true;
        newCount++;
      } else {
        skipCount++;
      }
    });
  }

  log('Scored ' + totalEvents + ' events. New: ' + newCount + ', skipped (duplicates): ' + skipCount);

  if (newCount === 0) {
    log('No new events to add. Updating CAT_INDEX with current totals anyway.');
  }

  var monthKeys_sorted = Object.keys(existing['Current Affairs'].subSubjects).sort(function(a, b) {
    var pa = a.split(' '), pb = b.split(' ');
    var ma = MONTHS.indexOf(pa[0]), mb = MONTHS.indexOf(pb[0]);
    var ya = parseInt(pa[1], 10), yb = parseInt(pb[1], 10);
    return yb - ya || mb - ma;
  });

  var seqCounters = {};
  monthKeys_sorted.forEach(function(mk) {
    var items = existing['Current Affairs'].subSubjects[mk];
    var maxSeq = 0;
    items.forEach(function(q) {
      var parts = q.id.split('_');
      var seq = parseInt(parts[parts.length - 1], 10);
      if (seq > maxSeq) maxSeq = seq;
    });
    var parts = mk.split(' ');
    var mi = MONTHS.indexOf(parts[0]) + 1;
    var y = parseInt(parts[1], 10);
    var key = y + '-' + pad(mi);
    seqCounters[key] = maxSeq;
  });

  var allNewQuestions = [];

  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var monthKey = MONTHS[m - 1] + ' ' + y;
    var mk = y + '-' + pad(m);

    if (!monthlySections[mk]) continue;

    var daySections = monthlySections[mk].filter(function(s) {
      return parseDateFromLabel(s.label) === day;
    });
    if (daySections.length === 0) continue;

    var events = daySections[0].events;
    events.forEach(function(ev) { ev.score = scoreEvent(ev); });
    events.sort(function(a, b) { return b.score - a.score; });
    var kept = events.filter(function(ev) { return ev.score >= 2; });

    if (!existing['Current Affairs'].subSubjects[monthKey]) {
      existing['Current Affairs'].subSubjects[monthKey] = [];
    }

    var existingIds = {};
    existing['Current Affairs'].subSubjects[monthKey].forEach(function(q) {
      existingIds[q.id] = true;
    });

    kept.forEach(function(ev) {
      var key = eventKey(ev);
      var alreadyExists = existing['Current Affairs'].subSubjects[monthKey].some(function(q) {
        return eventKey(q) === key;
      });
      if (!alreadyExists) {
        seqCounters[mk] = (seqCounters[mk] || 0) + 1;
        var q = makeQuestion({ year: y, month: m, day: day, text: ev.text, entity: ev.entity }, seqCounters[mk]);
        allNewQuestions.push(q);
      }
    });
  }

  allNewQuestions.forEach(function(q) {
    var mk = q.subSubject;
    existing['Current Affairs'].subSubjects[mk].push(q);
  });

  var totalQuestions = 0;
  monthKeys_sorted.forEach(function(mk) {
    existing['Current Affairs'].subSubjects[mk].sort(function(a, b) {
      return a.id.localeCompare(b.id);
    });
    totalQuestions += existing['Current Affairs'].subSubjects[mk].length;
  });

  var tJson = Date.now();
  fs.writeFileSync(OUTPUT, JSON.stringify(existing, null, 2), 'utf8');
  log('Wrote ' + OUTPUT + ' (' + totalQuestions + ' total questions) in ' + (Date.now() - tJson) + 'ms');

  var subSubjectEntries = [];
  monthKeys_sorted.forEach(function(mk) {
    var count = existing['Current Affairs'].subSubjects[mk].length;
    log('  ' + mk + ': ' + count + ' questions');
    subSubjectEntries.push('{"name":"' + mk.replace(/"/g, '\\"') + '","count":' + count + '}');
  });

  var total = totalQuestions;
  var entryStr = '"name":"Current Affairs","total":' + total + ',"icon":"📰","file":"data/questions/current-events.json","subjects":[{"name":"Current Affairs","total":' + total + ',"subSubjects":[' + subSubjectEntries.join(',') + ']}]}';
  var tArc = Date.now();
  updateArchiveHtml(entryStr, total);
  log('updateArchiveHtml done in ' + (Date.now() - tArc) + 'ms');
  log('Total: ' + total + ' events');
}

main().then(function() { process.exit(0); }).catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var OUTPUT = path.resolve(__dirname, '..', 'data/questions/indian-current-affairs.json');
var ARCHIVE = path.resolve(__dirname, '..', 'archive.html');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAYS_BACK = 3;

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'IndianCAFill/1.0' } }, function(res) {
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

function stripHtml(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

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

function scoreIndiaEvent(ev) {
  var text = ev.text.toLowerCase();
  var entity = ev.entity.toLowerCase();
  var score = 0;

  if (/india/i.test(text) || /indian/i.test(text)) {
    score += 6;
    if (/government|pm|modi|minist|scheme|policy|budget|parliament|election|bill|act|rupee|rupees|billion|crore|rupees?/i.test(text)) score += 4;
    if (/sign|deal|agreement|visit|summit|meeting|bilateral|moU|memorandum/i.test(text)) score += 4;
    if (/defence|defense|missile|navy|air force|army|border|drdo|isro|space|gaganyaan|chandrayaan/i.test(text)) score += 4;
    if (/supreme court|high court|verdict|judgment|ruling/i.test(text)) score += 4;
    if (/appoint|assumes charge|sworn\s+in|takes\s+charge|secretary|chairperson/i.test(text)) score += 4;
    if (/award|prize|honour|confer|felicitat|recogni/i.test(text)) score += 4;
    if (/sport|cricket|hockey|badminton|chess|olympi|medal|championship/i.test(text)) score += 4;
    if (/launch(?:ed|es)?\s+(?:satellite|mission|rocket|spacecraft|scheme|portal|initiative)/i.test(text)) score += 4;
    if (/economy|gdp|inflation|budget|trade|export|import|fdi|investment|market/i.test(text)) score += 3;
    if (/railway|highway|port|airport|infrastructure|corridor/i.test(text)) score += 3;
    if (/climate|renewable|solar|wind|emission|green|conservation|forest|wildlife/i.test(text)) score += 3;
    if (/agriculture|farmer|crop|kisan|food\s+security/i.test(text)) score += 3;
    if (/education|school|college|university|nep|skill|digital/i.test(text)) score += 3;
    if (/health|hospital|ayushman|vaccine|medicine|disease|healthcare/i.test(text)) score += 3;
  }

  if (/\b(india|delhi|mumbai|bengaluru|kolkata|chennai|hyderabad)\b/i.test(entity)) score += 3;
  if (/^[A-Z][a-z]+ (Pradesh|Rajasthan|Gujarat|Maharashtra|Karnataka|Kerala|Tamil|Bengal|Bihar|Assam|Odisha|Punjab|Haryana|Jharkhand|Chhattisgarh|Uttarakhand|Himachal|Manipur|Tripura|Meghalaya|Mizoram|Nagaland|Arunachal|Sikkim|Goa)/i.test(entity)) score += 3;
  if (/^(bangladesh|nepal|sri lanka|pakistan|china|russia|usa|uk|japan|france|germany|iran|israel|myanmar|maldives|afghanistan|bhutan)\b/i.test(entity)) score += 2;

  if (/\b(election|appointed|elected|re-elected|sworn\s+in|referendum|president|prime minister|governor|chief minister)\b/i.test(text)) score += 4;
  if (/\b(nobel|prize|award(?:ed)?|passed\s+away|obituary)\b/i.test(text)) score += 3;
  if (/\b(treaty|summit|agreement|pact|accord|memorandum|protocol|convention)\b/i.test(text)) score += 4;
  if (/\b(climate|emissions|carbon|renewable|conservation|endangered|species|habitat)\b/i.test(text)) score += 3;

  if (/exercise|drill|missile|warship|submarine|fighter\s+jet/i.test(text)) score += 2;
  if (/launch(?:ed|es)?\s+(?:satellite|mission|rocket|spacecraft)|isro|nasa/i.test(text)) score += 3;

  if (/\b(killed|killing|kill|dead|die|died|death|deaths|murder|shooting|explosion|blast|bomb|bombing|casualty|massacre|assassination|lynching|riots?|clash(?:es)?|firing|gunfire|beheaded|executed|genocide)\b/i.test(text)) score -= 6;
  if (/\b(bus|car|truck|train|plane|vehicle)\s+(crash|collision|accident|overturn|plunge|ram|hit|struck)\b/i.test(text)) score -= 5;
  if (/\b(actress|actor|singer|film|movie|album|concert|song|musician|director)\b/i.test(entity) && !/died|award|nobel|funeral/i.test(text)) score -= 4;
  if (text.length < 60) score -= 2;

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
  var id = 'ica_' + event.year + '_' + pad(event.month) + '_' + pad(seq);
  var monthLabel = MONTHS[event.month - 1] + ' ' + event.year;
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
    category: 'Indian Current Affairs',
    region: '',
    source: 'Wikipedia Indian Current Events',
    pubDate: pubDate,
    subject: 'Indian Current Affairs',
    subSubject: monthLabel,
    emoji: '\uD83C\uDDFF\uD83C\uDDE6',
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
  if (!fs.existsSync(ARCHIVE)) {
    console.error('  WARN: ' + ARCHIVE + ' not found, skipping CAT_INDEX update');
    return;
  }
  var html = fs.readFileSync(ARCHIVE, 'utf8');

  var pattern = /\{"name":"Indian Current Affairs"[^}]+?subSubjects":\[[^\]]*\]\}\]\}/;
  if (pattern.test(html)) {
    html = html.replace(pattern, entryStr);
  } else {
    // Find the true end of CAT_INDEX array by bracket matching
    var catStart = html.indexOf('var CAT_INDEX = [');
    if (catStart < 0) {
      console.error('  WARN: Could not find CAT_INDEX in ' + ARCHIVE);
      return;
    }
    var i = catStart + 16;
    var d = 1;
    var inStr = false;
    var esc = false;
    while (d > 0 && i < html.length) {
      i++;
      var c = html[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') inStr = !inStr;
      if (!inStr) {
        if (c === '[') d++;
        else if (c === ']') d--;
      }
    }
    // i is at the closing ]
    var comma = html[i - 1] !== '[' ? ',' : '';
    html = html.substring(0, i) + comma + entryStr + html.substring(i);
  }

  html = html.replace(/(Indian Current Affairs[^<]*?sidebar-count">)\d+(<\/span>)/g, '$1' + total + '$2');
  html = html.replace(/(Indian Current Affairs[^<]*?subj-card-count">)\d+/g, '$1' + total);

  fs.writeFileSync(ARCHIVE, html, 'utf8');
  console.error('  Updated CAT_INDEX and sidebar counts in ' + ARCHIVE);
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

  var existing = { 'Indian Current Affairs': { subSubjects: {} } };
  if (fs.existsSync(OUTPUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8').replace(/^\uFEFF/, ''));
      console.error('Read existing file with ' + Object.keys(existing['Indian Current Affairs'].subSubjects).length + ' months');
    } catch (e) {
      console.error('Error reading existing file, starting fresh: ' + e.message);
    }
  }

  var todayStr = cy + '-' + pad(cm) + '-' + pad(cd);
  var cutoff = new Date(cy, cm - 1, cd - DAYS_BACK + 1);
  console.error('Fetching events from ' + (cutoff.getMonth() + 1) + '/' + cutoff.getDate() + '/' + cutoff.getFullYear() + ' to ' + todayStr);

  var monthsToFetch = {};
  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthsToFetch[key] = { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  var monthKeys = Object.keys(monthsToFetch).sort();
  console.error('Months to fetch: ' + monthKeys.join(', '));

  var monthlySections = {};
  for (var i = 0; i < monthKeys.length; i++) {
    var mk = monthKeys[i];
    var my = monthsToFetch[mk].year;
    var mm = monthsToFetch[mk].month;
    var result = await fetchMonthEvents(my, mm);
    if (result) {
      monthlySections[mk] = result.sections;
    }
    if (i < monthKeys.length - 1) await delay(500);
  }

  var newCount = 0;
  var skipCount = 0;

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

    events.forEach(function(ev) { ev.score = scoreIndiaEvent(ev); });
    events.sort(function(a, b) { return b.score - a.score; });
    var kept = events.filter(function(ev) { return ev.score >= 1; });

    if (kept.length === 0) continue;

    if (!existing['Indian Current Affairs'].subSubjects[monthKey]) {
      existing['Indian Current Affairs'].subSubjects[monthKey] = [];
    }

    var existingKeys = {};
    existing['Indian Current Affairs'].subSubjects[monthKey].forEach(function(q) {
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

  console.error('New events to add: ' + newCount + ', skipped (duplicates): ' + skipCount);

  if (newCount === 0) {
    console.error('No new events to add. Updating CAT_INDEX with current totals anyway.');
  }

  var monthKeys_sorted = Object.keys(existing['Indian Current Affairs'].subSubjects).sort(function(a, b) {
    var pa = a.split(' '), pb = b.split(' ');
    var ma = MONTHS.indexOf(pa[0]), mb = MONTHS.indexOf(pb[0]);
    var ya = parseInt(pa[1], 10), yb = parseInt(pb[1], 10);
    return yb - ya || mb - ma;
  });

  var seqCounters = {};
  monthKeys_sorted.forEach(function(mk) {
    var items = existing['Indian Current Affairs'].subSubjects[mk];
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
    events.forEach(function(ev) { ev.score = scoreIndiaEvent(ev); });
    events.sort(function(a, b) { return b.score - a.score; });
    var kept = events.filter(function(ev) { return ev.score >= 1; });

    if (!existing['Indian Current Affairs'].subSubjects[monthKey]) {
      existing['Indian Current Affairs'].subSubjects[monthKey] = [];
    }

    var existingIds = {};
    existing['Indian Current Affairs'].subSubjects[monthKey].forEach(function(q) {
      existingIds[q.id] = true;
    });

    kept.forEach(function(ev) {
      var key = eventKey(ev);
      var alreadyExists = existing['Indian Current Affairs'].subSubjects[monthKey].some(function(q) {
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
    existing['Indian Current Affairs'].subSubjects[mk].push(q);
  });

  var totalQuestions = 0;
  monthKeys_sorted.forEach(function(mk) {
    existing['Indian Current Affairs'].subSubjects[mk].sort(function(a, b) {
      return a.id.localeCompare(b.id);
    });
    totalQuestions += existing['Indian Current Affairs'].subSubjects[mk].length;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Wrote ' + OUTPUT + ' (' + totalQuestions + ' total questions)');

  var subSubjectEntries = [];
  monthKeys_sorted.forEach(function(mk) {
    var count = existing['Indian Current Affairs'].subSubjects[mk].length;
    console.error('  ' + mk + ': ' + count + ' questions');
    subSubjectEntries.push('{"name":"' + mk.replace(/"/g, '\\"') + '","count":' + count + '}');
  });

  var total = totalQuestions;
  var entryStr = '{"name":"Indian Current Affairs","total":' + total + ',"icon":"\uD83C\uDDEE\uD83C\uDDF3","file":"data/questions/indian-current-affairs.json","subjects":[{"name":"Indian Current Affairs","total":' + total + ',"subSubjects":[' + subSubjectEntries.join(',') + ']}]}';
  updateArchiveHtml(entryStr, total);
  console.error('Total: ' + total + ' Indian current affairs events');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

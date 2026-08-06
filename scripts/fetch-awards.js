var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var bio = require('./bio-cache');

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'AwardsBot/2.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function fetchJSONWithRetry(url, retries) {
  retries = retries || 3;
  return fetchJSON(url).catch(function(err) {
    if (retries > 0 && err.message.indexOf('429') >= 0) {
      console.error('  429, retrying after 3s... (' + retries + ' left)');
      return delay(3000).then(function() { return fetchJSONWithRetry(url, retries - 1); });
    }
    throw err;
  });
}

function fetchPageText(title) {
  return fetchJSONWithRetry(API + '?action=parse&page=' + encodeURIComponent(title) + '&redirects=1&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

// The Padma/Bharat Ratna infoboxes expose the most recent honorees under
// "Final award" (renamed from "Latest award" on some pages), so try both.
function extractLatestAwardField(html) {
  return extractInfoboxField(html, 'Final award') || extractInfoboxField(html, 'Latest award');
}

function extractInfoboxField(html, label) {
  var m = html.match(/<table[^>]*class="[^"]*infobox[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return null;
  var table = m[1];
  var rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return null;
  for (var ri = 0; ri < rows.length; ri++) {
    var labelMatch = rows[ri].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    var dataMatch = rows[ri].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (labelMatch && dataMatch) {
      var l = strip(labelMatch[1]).toLowerCase();
      if (l.indexOf(label.toLowerCase()) >= 0) return dataMatch[1];
    }
  }
  return null;
}

function extractWikiTable(html) {
  var tables = [];
  var tableRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tableRegex.exec(html)) !== null) {
    var rows = [];
    var rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rowRegex.exec(m[1])) !== null) {
      var cells = [];
      var cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cellRegex.exec(rm[1])) !== null) {
        cells.push(strip(cm[1]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function cleanName(s) {
  return strip(s || '').replace(/[\u2020\u2032^]/g, '').replace(/\[.*?\]/g, '').replace(/\([^)]*\)/g, '').replace(/posthumous/gi, '').replace(/\s+/g, ' ').trim();
}

function extractYear(s) {
  if (!s) return '';
  var m = strip(s).match(/\b(18|19|20)\d{2}\b/);
  return m ? m[0] : '';
}

// Parse gallantry recipient tables. Skips legend/footnote tables (e.g. "† Indicates
// posthumous honour", "^ Indicates non-Indian recipient") and returns per-person rows.
function parseGallantryRecipients(html) {
  var tables = extractWikiTable(html);
  var out = [];
  tables.forEach(function(t) {
    if (t.length < 2) return;
    var header = t[0].map(function(c) { return strip(c).toLowerCase(); });
    var joined = header.join(' ');
    // Only process tables that actually list recipients (not legend/footnote tables).
    if (joined.indexOf('name') < 0 && joined.indexOf('recipient') < 0) return;
    var nameCol = -1, yearCol = -1, rankCol = -1, unitCol = -1, actionCol = -1, dateCol = -1;
    header.forEach(function(h, i) {
      if (h === 'name' || h === 'recipient') nameCol = i;
      else if (h === 'year') yearCol = i;
      else if (h.indexOf('rank') >= 0) rankCol = i;
      else if (h.indexOf('unit') >= 0 || h.indexOf('service') >= 0 || h.indexOf('branch') >= 0) unitCol = i;
      else if (h === 'date of action' || h === 'date' || h.indexOf('date of') === 0) dateCol = i;
      else if (h.indexOf('conflict') >= 0 || h.indexOf('operation') >= 0 || h.indexOf('battle') >= 0) actionCol = i;
      else if (h.indexOf('action') >= 0 && h.indexOf('place of action') < 0) actionCol = i;
    });
    if (nameCol < 0) return;
    for (var ri = 1; ri < t.length; ri++) {
      var row = t[ri];
      if (row.length <= nameCol) continue;
      var name = cleanName(row[nameCol]);
      if (name.length < 3 || /indicates|recipient/i.test(name)) continue;
      var year = yearCol >= 0 ? extractYear(row[yearCol]) : (dateCol >= 0 ? extractYear(row[dateCol]) : '');
      var rank = rankCol >= 0 ? strip(row[rankCol] || '').replace(/\s+/g, ' ').trim() : '';
      var unit = unitCol >= 0 ? strip(row[unitCol] || '').replace(/\s+/g, ' ').trim() : '';
      var action = actionCol >= 0 ? strip(row[actionCol] || '').replace(/\s+/g, ' ').trim() : '';
      out.push({ name: name, year: year, rank: rank, unit: unit, action: action });
    }
  });
  return out;
}

function makeQuestion(question, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'award_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Awards & Honours', emoji: emoji,
    question: question, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80);
}

function extractNamesFromHtml(rawHtml) {
  var names = [];
  var linkRe = /<a[^>]*href="\/wiki\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = linkRe.exec(rawHtml)) !== null) {
    var n = strip(m[1]).replace(/\s+/g, ' ').replace(/\([^)]*\)/g, '').replace(/posthumous/gi, '').trim();
    if (n.length > 3 && n.indexOf('of ') !== 0 && n.indexOf('Incumbent') < 0) {
      names.push(n);
    }
  }
  return names;
}

async function fetchTableRecipients(page, yearStr, nameCol, yearCol, awardName, template, emoji) {
  var results = [];
  try {
    var html = await fetchPageText(page);
    var tables = extractWikiTable(html);
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length <= Math.max(nameCol, yearCol)) continue;
        var y = strip(row[yearCol]).match(new RegExp(yearStr));
        if (!y) continue;
        var recipient = strip(row[nameCol]).replace(/\[.*?\]/g, '').replace(/\([^)]*\)/g, '').trim();
        if (recipient.length > 2) {
          results.push({ name: recipient, year: y[0] });
        }
      }
    });
  } catch (e) { console.error('  Error fetching ' + page + ': ' + e.message); }
  return results;
}

// Keep raw HTML per cell so multi-recipient cells (separated by <br>, list items
// or newlines) can be split reliably, unlike extractWikiTable which collapses them.
function extractRawTable(html) {
  var tables = [];
  var tableRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tableRegex.exec(html)) !== null) {
    var rows = [];
    var rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rowRegex.exec(m[1])) !== null) {
      var cells = [];
      var cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cellRegex.exec(rm[1])) !== null) cells.push(cm[1]);
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function splitCellNames(rawHtml) {
  var text = String(rawHtml || '')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, function(m, c) { return String.fromCharCode(c); })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/posthumous/gi, '');
  var parts = [];
  text.split(/\n/).forEach(function(line) {
    line.split(/\s*&\s*/).forEach(function(seg) {
      var n = seg.replace(/\s+/g, ' ').trim();
      if (n.length > 2) parts.push(n);
    });
  });
  var out = [];
  parts.forEach(function(n) { if (out.indexOf(n) < 0) out.push(n); });
  return out;
}

function isValidWinnerName(n) {
  if (!n || n.length < 3 || n.length > 90) return false;
  if (/\d{4}/.test(n)) return false;
  if (/shortlist|announced|to be (announced|held|decided|chosen)|pending|not awarded|cancell?ed|postponed|no pageant|tbd|\u2014|incumbent|\[edit\]/i.test(n)) return false;
  if (n.indexOf('of ') === 0 || /^(winner|year|image|name|recipient|laureate|author)$/i.test(n)) return false;
  return true;
}

function rowHasBold(cells) {
  for (var i = 0; i < cells.length; i++) {
    if (/<b>|<strong>/i.test(cells[i] || '')) return true;
  }
  return false;
}

// Generic extractor for "latest year winners" award tables. Config opts:
//   yearCol, nameCol, citeCol (optional), nameShift (optional: how many columns
//   continuation rows without a year cell shift the name), boldWinner (optional:
//   only count rows that contain a bolded cell, e.g. Pulitzer winners).
// Continuation rows (multiple winners per year) carry the year of the nearest
// preceding explicit-year row within the same table.
async function fetchGenericLatestWinners(page, opts) {
  var html = await fetchPageText(page);
  var tables = extractRawTable(html);
  var byYear = {};
  var thisYear = new Date().getFullYear();
  tables.forEach(function(t) {
    var carry = '';
    for (var ri = 1; ri < t.length; ri++) {
      var row = t[ri] || [];
      if (row.length === 0) continue;
      var y = '';
      if (typeof opts.yearCol === 'number' && opts.yearCol >= 0 && row[opts.yearCol]) {
        var ym = strip(row[opts.yearCol]).match(/\b(19|20)\d{2}\b/);
        if (ym) y = ym[0];
      }
      if (y) carry = y;
      if (opts.boldWinner && !rowHasBold(row)) continue;
      var nameIdx = opts.nameCol;
      if (!y && opts.nameShift) nameIdx = opts.nameCol + opts.nameShift;
      if (nameIdx < 0 || nameIdx >= row.length) nameIdx = -1;
      var names = [];
      if (nameIdx >= 0) names = splitCellNames(row[nameIdx]).filter(isValidWinnerName);
      if (names.length === 0) {
        names = splitCellNames(row[0] || '').filter(isValidWinnerName);
        if (names.length === 0 && row[1]) names = splitCellNames(row[1]).filter(isValidWinnerName);
      }
      if (names.length === 0) continue;
      var yr = y || carry;
      if (!yr || parseInt(yr, 10) > thisYear) continue;
      if (!byYear[yr]) byYear[yr] = [];
      var citation = '';
      var citeIdx = opts.citeCol;
      if (!y && opts.citeShift) citeIdx = opts.citeCol + opts.citeShift;
      if (typeof citeIdx === 'number' && citeIdx >= 0 && row[citeIdx]) {
        citation = strip(row[citeIdx]).replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '').replace(/\s+/g, ' ').trim();
        if (citation.length > 260) citation = citation.slice(0, 257) + '...';
      }
      names.forEach(function(n) { byYear[yr].push({ name: n, citation: citation }); });
    }
  });
  var years = Object.keys(byYear).sort();
  for (var i = years.length - 1; i >= 0; i--) {
    if (parseInt(years[i], 10) > thisYear) continue;
    if (byYear[years[i]].length > 0) return { year: years[i], winners: byYear[years[i]] };
  }
  return null;
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Awards & Honours']) existing[CA_KEY].subSubjects['Awards & Honours'] = [];

  var bioCache = bio.loadBioCache();

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Awards & Honours'].forEach(function(q) { existingKeys[eventKey(q)] = true; });

  // The live site reads current-affairs.json (via quiz.json rebuild + category
  // split), not pib-archive.json. Seed the dedup set from current-affairs.json
  // too so questions already published there are never re-added as duplicates.
  try {
    var liveCA = JSON.parse(fs.readFileSync(CA_PATH, 'utf8'));
    var liveAwards = (liveCA[CA_KEY] && liveCA[CA_KEY].subSubjects && liveCA[CA_KEY].subSubjects['Awards & Honours']) || [];
    liveAwards.forEach(function(q) { existingKeys[eventKey(q)] = true; });
  } catch (e) {}

  var newQuestions = [];
  // Start numbering above every award id already present in either archive, so
  // newly added questions never collide with ids in the live current-affairs.json.
  var seq = 1;
  existing[CA_KEY].subSubjects['Awards & Honours'].forEach(function(q) {
    var m = /^award_(\d+)$/.exec(q.id || '');
    if (m) seq = Math.max(seq, parseInt(m[1], 10) + 1);
  });
  try {
    var liveCA = JSON.parse(fs.readFileSync(CA_PATH, 'utf8'));
    var liveAwards = (liveCA[CA_KEY] && liveCA[CA_KEY].subSubjects && liveCA[CA_KEY].subSubjects['Awards & Honours']) || [];
    liveAwards.forEach(function(q) {
      var m = /^award_(\d+)$/.exec(q.id || '');
      if (m) seq = Math.max(seq, parseInt(m[1], 10) + 1);
    });
  } catch (e) {}

  // 1. Bharat Ratna
  process.stdout.write('  Bharat Ratna... ');
  var html = await fetchPageText('Bharat_Ratna');
  var latest = extractLatestAwardField(html);
  if (latest) {
    var cleaned = latest.replace(/^\d{4}\s*/, '').replace(/<br\s*\/?>/gi, '|').replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, '').replace(/posthumous/gi, '').trim();
    var names = cleaned.split('|').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 5; });
    if (names.length < 2) names = extractNamesFromHtml(latest);
    names.forEach(function(n) {
      if (n.length > 3) {
        var q = makeQuestion('Name a recipient of the Bharat Ratna awarded recently.', n, seq++, 'Bharat Ratna', '\uD83C\uDFC6', 'Bharat Ratna recipient: ' + n);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
      }
    });
    process.stdout.write(names.length + ' recipients\n');
  } else process.stdout.write('Not found\n');

  // 2. Padma Awards (recipients live in dedicated "List of ... award recipients"
  // decade pages, not the award infobox; use the generic latest-year extractor)
  await delay(600);
  var PADMA_PAGES = [
    { page: 'List of Padma Vibhushan award recipients', label: 'Padma Vibhushan', emoji: '\uD83C\uDFC6' },
    { page: 'List of Padma Bhushan award recipients (2020\u20132029)', label: 'Padma Bhushan', emoji: '\uD83C\uDFC6' },
    { page: 'List of Padma Shri award recipients (2020\u20132029)', label: 'Padma Shri', nameShift: -1, emoji: '\uD83C\uDFC6' }
  ];
  for (var pi = 0; pi < PADMA_PAGES.length; pi++) {
    process.stdout.write('  ' + PADMA_PAGES[pi].label + '... ');
    var padmaCount = 0;
    try {
      var pres = await fetchGenericLatestWinners(PADMA_PAGES[pi].page, { yearCol: 0, nameCol: 2, nameShift: PADMA_PAGES[pi].nameShift || 0 });
      if (pres && pres.winners.length > 0) {
        var year = pres.year;
        // One combined question per award-year listing every recipient, mirroring
        // the Arjuna/Nobel pattern. (Per-recipient questions would otherwise
        // collapse to one via eventKey dedup.)
        var names = pres.winners.map(function(w) { return w.name.replace(/[#*\u2020\u2032^]+/g, '').replace(/\s+/g, ' ').trim(); }).filter(function(n) { return n.length >= 3; });
        if (names.length > 0) {
          var combined = names.join(', ');
          var q = makeQuestion('Who was awarded the ' + PADMA_PAGES[pi].label + ' in ' + year + '?', combined, seq++, '' + PADMA_PAGES[pi].label, PADMA_PAGES[pi].emoji, 'The ' + PADMA_PAGES[pi].label + ' ' + year + ' was conferred on ' + combined + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; padmaCount++; }
        }
        process.stdout.write(padmaCount + ' new question (' + year + ', ' + names.length + ' people)\n');
      } else process.stdout.write('Not found\n');
    } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
    await delay(600);
  }

  // 3. Gallantry Awards
  await delay(600);
  var GALLANTRY_PAGES = [
    { page: 'Param_Vir_Chakra', label: 'Param Vir Chakra', emoji: '\uD83C\uDFC6' },
    { page: 'Ashoka_Chakra_(military_decoration)', label: 'Ashoka Chakra', emoji: '\uD83C\uDFC6' },
    { page: 'Shaurya_Chakra', label: 'Shaurya Chakra', emoji: '\uD83C\uDFC6' }
  ];
  for (var gi = 0; gi < GALLANTRY_PAGES.length; gi++) {
    process.stdout.write('  ' + GALLANTRY_PAGES[gi].label + '... ');
    try {
      var htmlG = await fetchPageText(GALLANTRY_PAGES[gi].page);
      var recipientsG = parseGallantryRecipients(htmlG);
      var gc = 0;
      // Group recipients by year so one question covers everyone honoured that year
      var byYear = {};
      recipientsG.forEach(function(r) {
        var y = r.year || 'Recent';
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(r);
      });
      Object.keys(byYear).sort().forEach(function(year) {
        var list = byYear[year];
        var combinedAnswer = list.map(function(r) { return r.name; }).join(', ');
        var parts = list.map(function(r) {
          var d = r.name;
          if (r.rank || r.unit) d += ' (' + [r.rank, r.unit].filter(function(s) { return s; }).join(', ') + ')';
          if (r.action) d += ' - ' + r.action;
          return d;
        });
        var fact = 'In ' + year + ', the ' + GALLANTRY_PAGES[gi].label + ' was awarded to ' + list.length + ' personnel: ' + parts.join('; ') + '.';
        var q = makeQuestion('Who received the ' + GALLANTRY_PAGES[gi].label + ' in ' + year + '?', combinedAnswer, seq++, '' + GALLANTRY_PAGES[gi].label, GALLANTRY_PAGES[gi].emoji, fact);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; gc++; }
      });
      process.stdout.write(gc + ' year-groups\n');
    } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
    await delay(600);
  }

  // 4. Nobel Prize (append-only: only add the most recent announced year, never re-add older ones)
  await delay(600);
  process.stdout.write('  Nobel Prize... ');
  try {
    html = await fetchPageText('List_of_Nobel_laureates');
    var tables = extractWikiTable(html);
    if (tables.length > 0) {
      var t = tables[0];
      var categories = t[0];
      var nobelCount = 0;
      // Find the latest year present in the table so next year's winners are
      // automatically picked up once Wikipedia publishes them.
      var latestNobelYear = '';
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (!row || row.length < 2) continue;
        var ym = strip(row[0]).match(/\b20\d{2}\b/);
        if (ym && ym[0] > latestNobelYear) latestNobelYear = ym[0];
      }
      if (!latestNobelYear) latestNobelYear = '' + (new Date().getFullYear() - 1);
      process.stdout.write('(latest year ' + latestNobelYear + ') ');
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (!row || row.length < 2) continue;
        var yearStr = strip(row[0]).match(new RegExp('\\b' + latestNobelYear + '\\b'));
        if (!yearStr) continue;
        for (var ci = 1; ci < Math.min(row.length, categories.length); ci++) {
          var category = categories[ci].replace(/\[.*?\]/g, '').replace(/&#91;.*?&#93;/g, '').replace(/&nbsp;/g, ' ').replace(/^Prize in\s+/i, '').trim();
          var laureate = row[ci] || '';
          if (laureate && laureate.length > 2 && laureate !== '\u2014' && laureate.indexOf('not awarded') < 0) {
            var winners = laureate.split(/<br\s*\/?>/gi).map(function(s) { return strip(s).replace(/\([^)]*\)/g, '').trim(); }).filter(function(s) { return s.length > 2; });
            if (winners.length < 2) winners = laureate.split(/[;]/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 2; });
            var combinedAnswer = winners.join(', ');
            var citation = laureate.match(/\(([^)]*?)\)/);
            var citationText = citation ? citation[1] : '';
            var combinedFact = 'Nobel Prize ' + latestNobelYear + ' - ' + category + ': ' + combinedAnswer + (citationText ? ' (' + citationText + ')' : '') + '. The Nobel Prize is awarded annually by the Nobel Foundation for outstanding contributions to humanity.';
            var q = makeQuestion('Who won the Nobel Prize in ' + category + ' in ' + latestNobelYear + '?', combinedAnswer, seq++, 'Nobel Prize', '\uD83C\uDFC6', combinedFact);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; nobelCount++; }
          }
        }
      }
      process.stdout.write(nobelCount + ' laureates\n');
    } else process.stdout.write('No tables\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 5. Jnanpith Award
  await delay(600);
  process.stdout.write('  Jnanpith Award... ');
  try {
    html = await fetchPageText('Jnanpith_Award');
    var tables = extractWikiTable(html);
    var jnanpithCount = 0;
    if (tables.length > 0) {
      for (var ti2 = 0; ti2 < tables.length; ti2++) {
        for (var ri2 = 1; ri2 < tables[ti2].length; ri2++) {
          var row = tables[ti2][ri2];
          if (row.length >= 2) {
            var yearStr = strip(row[0]).match(/\b(2024|2025|2026)\b/);
            if (yearStr) {
              var recipient = strip(row[row.length > 2 ? 1 : row.length - 1]).replace(/\[.*?\]/g, '').replace(/\([^)]*\)/g, '').trim();
              if (recipient.length > 2) {
                var q = makeQuestion('Who won the Jnanpith Award in ' + yearStr[0] + '?', recipient, seq++, 'Jnanpith Award', '\uD83D\uDCDA', 'Jnanpith Award ' + yearStr[0] + ': ' + recipient);
                if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; jnanpithCount++; }
              }
            }
          }
        }
      }
    }
    process.stdout.write(jnanpithCount + ' recipients\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 6. Dadasaheb Phalke Award
  await delay(600);
  process.stdout.write('  Dadasaheb Phalke Award... ');
  try {
    html = await fetchPageText('Dadasaheb_Phalke_Award');
    var tables = extractWikiTable(html);
    var phalkeCount = 0;
    if (tables.length > 0) {
      var t = tables[0];
      for (var ri3 = 1; ri3 < t.length; ri3++) {
        var yearStr = strip(t[ri3][0]).match(/\b(2024|2025|2026)\b/);
        if (yearStr) {
          var recipient = strip(t[ri3].length > 1 ? t[ri3][1] : '').replace(/\[.*?\]/g, '').trim();
          if (recipient.length > 2) {
            var q = makeQuestion('Who received the Dadasaheb Phalke Award in ' + yearStr[0] + '?', recipient, seq++, 'Dadasaheb Phalke Award', '\uD83C\uDFAC', 'Dadasaheb Phalke Award ' + yearStr[0] + ': ' + recipient);
            if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; phalkeCount++; }
          }
        }
      }
    }
    process.stdout.write(phalkeCount + ' recipients\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 7. National Film Awards (append-only: only add the latest announced year)
  await delay(600);
  process.stdout.write('  National Film Awards... ');
  try {
    html = await fetchPageText('National_Film_Awards');
    var tables = extractWikiTable(html);
    var nfaCount = 0;
    if (tables.length > 0) {
      var t = tables[0];
      var latestNfaYear = '';
      for (var riN = 1; riN < t.length; riN++) {
        if (!t[riN] || t[riN].length < 2) continue;
        var ym = strip(t[riN][0]).match(/\b20\d{2}\b/);
        if (ym && ym[0] > latestNfaYear) latestNfaYear = ym[0];
      }
      if (latestNfaYear) {
        for (var riN = 1; riN < t.length; riN++) {
          var row = t[riN];
          if (!row || row.length < 5) continue;
          if (strip(row[0]).match(new RegExp('\\b' + latestNfaYear + '\\b'))) {
            var bestFeature = strip(row[3] || '').replace(/\[.*?\]/g, '').trim();
            var bestNonFeature = strip(row[4] || '').replace(/\[.*?\]/g, '').trim();
            if (bestFeature && bestFeature !== '\u2014') {
              var qF = makeQuestion('Which film won the National Film Award for Best Feature Film for the films of ' + latestNfaYear + '?', bestFeature, seq++, 'National Film Awards', '\uD83C\uDFAC', 'Best Feature Film at the National Film Awards ' + latestNfaYear + ': ' + bestFeature + '. The National Film Awards are India\'s most prestigious film awards, presented annually by the Directorate of Film Festivals.');
              if (qF && !existingKeys[eventKey(qF)]) { newQuestions.push(qF); existingKeys[eventKey(qF)] = true; nfaCount++; }
            }
            if (bestNonFeature && bestNonFeature !== '\u2014') {
              var qN = makeQuestion('Which film won the National Film Award for Best Non-Feature Film for the films of ' + latestNfaYear + '?', bestNonFeature, seq++, 'National Film Awards', '\uD83C\uDFAC', 'Best Non-Feature Film at the National Film Awards ' + latestNfaYear + ': ' + bestNonFeature + '. The National Film Awards are India\'s most prestigious film awards, presented annually by the Directorate of Film Festivals.');
              if (qN && !existingKeys[eventKey(qN)]) { newQuestions.push(qN); existingKeys[eventKey(qN)] = true; nfaCount++; }
            }
          }
        }
      }
    }
    process.stdout.write(nfaCount + ' winners\n');
  } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }

  // 8. Sports Awards
  await delay(600);
  var SPORTS_PAGES = [
    { page: 'Khel_Ratna_Award', label: 'Khel Ratna', q: 'Who received the Major Dhyan Chand Khel Ratna Award in {year}?', yearCol: 0, nameCol: 1, nameShift: -1, emoji: '\uD83C\uDFC6' },
    { page: 'List of Arjuna Award recipients (2020\u20132029)', label: 'Arjuna Award', q: 'Who received the Arjuna Award in {year}?', yearCol: 0, nameCol: 1, emoji: '\uD83C\uDFC6' },
    { page: 'Dronacharya_Award', label: 'Dronacharya Award', q: 'Who received the Dronacharya Award in {year}?', yearCol: 0, nameCol: 1, emoji: '\uD83C\uDFC6' }
  ];
  for (var si = 0; si < SPORTS_PAGES.length; si++) {
    process.stdout.write('  ' + SPORTS_PAGES[si].label + '... ');
    var sportCount = 0;
    try {
      var sres = await fetchGenericLatestWinners(SPORTS_PAGES[si].page, SPORTS_PAGES[si]);
      if (sres && sres.winners.length > 0) {
        var sCombinedAnswer = sres.winners.map(function(w) { return w.name; }).join(', ');
        var sFact = sres.winners[0].name + ' received the ' + SPORTS_PAGES[si].label + ' in ' + sres.year + '.';
        var sqText = SPORTS_PAGES[si].q.replace('{year}', sres.year);
        var sq = makeQuestion(sqText, sCombinedAnswer, seq++, '' + SPORTS_PAGES[si].label, SPORTS_PAGES[si].emoji, sFact);
        if (sq && !existingKeys[eventKey(sq)]) { newQuestions.push(sq); existingKeys[eventKey(sq)] = true; sportCount++; }
        process.stdout.write(sportCount + ' recipient question (' + sres.year + ', ' + sres.winners.length + ' people)\n');
      } else process.stdout.write('Not found\n');
    } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
    await delay(600);
  }

  // 9. Additional Indian & international awards (append-only latest-year winners)
  var MORE_AWARDS = [
    { page: 'Gandhi_Peace_Prize', label: 'Gandhi Peace Prize', emoji: '\uD83D\uDE4F', yearCol: 1, nameCol: 2, citeCol: 6, q: 'Who received the Gandhi Peace Prize in {year}?', fact: 'The Gandhi Peace Prize, instituted by the Government of India in 1995 on the 125th birth anniversary of Mahatma Gandhi, honours those who work for peace and Gandhian values.' },
    { page: 'National_Bravery_Award', label: 'National Bravery Award', emoji: '\uD83C\uDF96\uFE0F', yearCol: 0, nameCol: 1, citeCol: 2, q: 'Who received the National Bravery Award in {year}?', fact: 'The National Bravery Awards are presented annually by the Government of India to children below 16 years for meritorious acts of bravery. They include the Bharat Award, Geeta Chopra Award, Sanjay Chopra Award and Bapu Gaidhani Award.' },
    { page: 'Vyas_Samman', label: 'Vyas Samman', emoji: '\uD83D\uDCDA', yearCol: 0, nameCol: 1, citeCol: 2, q: 'Who received the Vyas Samman in {year}?', fact: 'The Vyas Samman is a prestigious Indian literary award given annually for outstanding contribution to Hindi literature.' },
    { page: 'Saraswati_Samman', label: 'Saraswati Samman', emoji: '\uD83D\uDCDA', yearCol: 0, nameCol: 2, citeCol: 3, q: 'Who received the Saraswati Samman in {year}?', fact: 'The Saraswati Samman is awarded annually by the K.K. Birla Foundation for an outstanding literary work in any Indian language.' },
    { page: 'Dhyan_Chand_Award', label: 'Dhyan Chand Award', emoji: '\uD83C\uDFC6', yearCol: 0, nameCol: 1, citeCol: 2, nameShift: -1, q: 'Who received the Dhyan Chand Award in {year}?', fact: 'The Dhyan Chand Award is India\'s lifetime achievement honour in sports, named after hockey legend Major Dhyan Chand.' },
    { page: 'Booker_Prize', label: 'Booker Prize', emoji: '\uD83D\uDCD6', yearCol: 0, nameCol: 1, citeCol: 2, q: 'Who won the Booker Prize in {year}?', fact: 'The Booker Prize is one of the world\'s most prestigious literary prizes, awarded annually to the best work of long-form fiction published in the United Kingdom and Ireland.' },
    { page: 'International_Booker_Prize', label: 'International Booker Prize', emoji: '\uD83D\uDCD6', yearCol: 0, nameCol: 1, citeCol: 5, q: 'Who won the International Booker Prize in {year}?', fact: 'The International Booker Prize is awarded annually for a single book translated into English and published in the UK or Ireland.' },
    { page: 'Ramon_Magsaysay_Award', label: 'Ramon Magsaysay Award', emoji: '\uD83C\uDF0F', yearCol: 0, nameCol: 2, citeCol: 4, nameShift: -1, q: 'Who received the Ramon Magsaysay Award in {year}?', fact: 'The Ramon Magsaysay Award, often called Asia\'s Nobel Prize, recognises individuals and organisations addressing development issues in Asia.' },
    { page: 'Templeton_Prize', label: 'Templeton Prize', emoji: '\uD83D\uDCA1', yearCol: 0, nameCol: 2, citeCol: 3, q: 'Who received the Templeton Prize in {year}?', fact: 'The Templeton Prize honours individuals who advance the intersection of science and religion.' },
    { page: 'Turing_Award', label: 'Turing Award', emoji: '\uD83D\uDCBB', yearCol: 0, nameCol: 1, citeCol: 3, nameShift: -1, q: 'Who received the Turing Award in {year}?', fact: 'The ACM A.M. Turing Award, named after computing pioneer Alan Turing, is regarded as the Nobel Prize of computing.' },
    { page: 'Abel_Prize', label: 'Abel Prize', emoji: '\uD83E\uDDEE', yearCol: 0, nameCol: 1, citeCol: 4, q: 'Who won the Abel Prize in {year}?', fact: 'The Abel Prize, awarded by the Norwegian Academy of Science and Letters, is one of the most prestigious awards in mathematics.' },
    { page: 'Fields_Medal', label: 'Fields Medal', emoji: '\uD83C\uDFC6', yearCol: 0, nameCol: 3, citeCol: 5, nameShift: -2, q: 'Who received the Fields Medal in {year}?', fact: 'The Fields Medal, often described as the Nobel Prize of mathematics, is awarded every four years to mathematicians under 40.' },
    { page: 'Pulitzer_Prize_for_Fiction', label: 'Pulitzer Prize for Fiction', emoji: '\uD83D\uDCD6', yearCol: 0, nameCol: 1, citeCol: 2, boldWinner: true, q: 'Who won the Pulitzer Prize for Fiction in {year}?', fact: 'The Pulitzer Prize for Fiction is awarded annually to a distinguished work of fiction by an American author, preferably dealing with American life.' },
    { page: 'Right_Livelihood_Award', label: 'Right Livelihood Award', emoji: '\uD83C\uDF31', yearCol: 0, nameCol: 2, citeCol: 4, nameShift: -1, q: 'Who received the Right Livelihood Award in {year}?', fact: 'The Right Livelihood Award, also known as the Alternative Nobel Prize, honours people and organisations working on practical solutions to global problems.' },
    { page: 'Miss_Universe', label: 'Miss Universe', emoji: '\uD83D\uDC51', yearCol: 1, nameCol: 3, citeCol: -1, q: 'Who won Miss Universe in {year}?', fact: 'Miss Universe is one of the world\'s most watched international beauty pageants.' }
  ];
  for (var ai = 0; ai < MORE_AWARDS.length; ai++) {
    await delay(600);
    var cfg = MORE_AWARDS[ai];
    process.stdout.write('  ' + cfg.label + '... ');
    try {
      var res = await fetchGenericLatestWinners(cfg.page, cfg);
      if (res && res.winners.length > 0) {
        var combinedAnswer = res.winners.map(function(w) { return w.name; }).join(', ');
        var firstCitation = res.winners.map(function(w) { return w.citation; }).filter(function(c) { return c; })[0] || '';
        var fact = cfg.fact + ' ' + cfg.label + ' ' + res.year + ': ' + combinedAnswer + '.' + (firstCitation ? ' ' + firstCitation : '');
        var qText = cfg.q.replace('{year}', res.year);
        var q = makeQuestion(qText, combinedAnswer, seq++, cfg.label, cfg.emoji, fact);
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
        process.stdout.write(res.winners.length + ' winners (' + res.year + ')\n');
      } else process.stdout.write('Not found\n');
    } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  }

  // 10. National Film Awards - performance categories (append-only latest year)
  var NFA_PERF = [
    { page: 'National_Film_Award_for_Best_Actor_in_a_Leading_Role', label: 'National Film Award for Best Actor', yearCol: 0, nameCol: 1, citeCol: 3, nameShift: -1, citeShift: -1, q: 'Who won the National Film Award for Best Actor for the films of {year}?', fact: 'The National Film Award for Best Actor is presented annually by the Directorate of Film Festivals for the best leading performance in an Indian film.' },
    { page: 'National_Film_Award_for_Best_Actress_in_a_Leading_Role', label: 'National Film Award for Best Actress', yearCol: 0, nameCol: 1, citeCol: 3, nameShift: -1, citeShift: -1, q: 'Who won the National Film Award for Best Actress for the films of {year}?', fact: 'The National Film Award for Best Actress is presented annually by the Directorate of Film Festivals for the best leading performance by an actress in an Indian film.' },
    { page: 'National_Film_Award_for_Best_Direction', label: 'National Film Award for Best Direction', yearCol: 0, nameCol: 1, citeCol: 2, nameShift: 0, q: 'Who won the National Film Award for Best Direction for the films of {year}?', fact: 'The National Film Award for Best Direction is presented annually by the Directorate of Film Festivals for the best directed Indian film.' }
  ];
  for (var npi = 0; npi < NFA_PERF.length; npi++) {
    await delay(600);
    var ncfg = NFA_PERF[npi];
    process.stdout.write('  ' + ncfg.label + '... ');
    try {
      var nres = await fetchGenericLatestWinners(ncfg.page, ncfg);
      if (nres && nres.winners.length > 0) {
        var nCombinedAnswer = nres.winners.map(function(w) { return w.name; }).join(', ');
        var nParts = nres.winners.map(function(w) { return w.name + (w.citation ? ' (' + w.citation + ')' : ''); });
        var nFact = ncfg.fact + ' ' + ncfg.label + ' ' + nres.year + ': ' + nParts.join('; ') + '.';
        var nqText = ncfg.q.replace('{year}', nres.year);
        var nq = makeQuestion(nqText, nCombinedAnswer, seq++, ncfg.label, '\uD83C\uDFAC', nFact);
        if (nq && !existingKeys[eventKey(nq)]) { newQuestions.push(nq); existingKeys[eventKey(nq)] = true; }
        process.stdout.write(nres.winners.length + ' winners (' + nres.year + ')\n');
      } else process.stdout.write('Not found\n');
    } catch (e) { process.stdout.write('Error: ' + e.message + '\n'); }
  }

  for (var bqi = 0; bqi < newQuestions.length; bqi++) {
    var bq = newQuestions[bqi];
    if (!bio.isSinglePerson(bq.answer)) continue;
    var b = await bio.getBio(bq.answer, bioCache);
    if (b && bq.fact.indexOf(b) === -1) bq.fact += ' ' + b;
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Awards & Honours'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Awards & Honours'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nAwards & Honours: ' + total + ' total questions, ' + newQuestions.length + ' new');

  bio.saveBioCache(bioCache);
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

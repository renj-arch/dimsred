var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
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
  return fetchJSONWithRetry(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
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
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
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

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Awards & Honours'].length + 1;

  // 1. Bharat Ratna
  process.stdout.write('  Bharat Ratna... ');
  var html = await fetchPageText('Bharat_Ratna');
  var latest = extractInfoboxField(html, 'Latest award');
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

  // 2. Padma Awards
  await delay(600);
  var PADMA_PAGES = [
    { page: 'Padma_Vibhushan', label: 'Padma Vibhushan', emoji: '\uD83C\uDFC6' },
    { page: 'Padma_Bhushan', label: 'Padma Bhushan', emoji: '\uD83C\uDFC6' },
    { page: 'Padma_Shri', label: 'Padma Shri', emoji: '\uD83C\uDFC6' }
  ];
  var currentYear = new Date().getFullYear();
  for (var pi = 0; pi < PADMA_PAGES.length; pi++) {
    process.stdout.write('  ' + PADMA_PAGES[pi].label + '... ');
    var recipients = await fetchTableRecipients(PADMA_PAGES[pi].page, '' + currentYear, 1, 0, PADMA_PAGES[pi].label, 'Who received the {award} in {year}?', PADMA_PAGES[pi].emoji);
    if (recipients.length === 0) {
      var htmlP = await fetchPageText(PADMA_PAGES[pi].page);
      var infoboxLatest = extractInfoboxField(htmlP, 'Latest award');
      if (infoboxLatest) {
        recipients = extractNamesFromHtml(infoboxLatest);
      }
    }
    var padmaCount = 0;
    recipients.forEach(function(r) {
      var name = typeof r === 'string' ? r : r.name;
      var year = typeof r === 'string' ? currentYear : r.year;
      var q = makeQuestion('Who was awarded the ' + PADMA_PAGES[pi].label + ' in ' + year + '?', name, seq++, '' + PADMA_PAGES[pi].label, PADMA_PAGES[pi].emoji, name + ' received the ' + PADMA_PAGES[pi].label + ' in ' + year + '.');
      if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; padmaCount++; }
    });
    process.stdout.write(padmaCount + ' recipients\n');
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

  // 4. Nobel Prize
  await delay(600);
  process.stdout.write('  Nobel Prize... ');
  try {
    html = await fetchPageText('List_of_Nobel_laureates');
    var tables = extractWikiTable(html);
    if (tables.length > 0) {
      var t = tables[0];
      var categories = t[0];
      var nobelCount = 0;
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (!row || row.length < 2) continue;
        var yearStr = strip(row[0]).match(/\b2025\b/);
        if (!yearStr) continue;
        for (var ci = 1; ci < Math.min(row.length, categories.length); ci++) {
          var category = categories[ci].replace(/\[.*?\]/g, '').replace(/&#91;.*?&#93;/g, '').replace(/&nbsp;/g, ' ').replace(/^Prize in\s+/i, '').trim();
          var laureate = row[ci] || '';
          if (laureate && laureate.length > 2 && laureate !== '\u2014' && laureate.indexOf('not awarded') < 0) {
            var winners = laureate.split(/<br\s*\/?>/gi).map(function(s) { return strip(s).replace(/\([^)]*\)/g, '').trim(); }).filter(function(s) { return s.length > 2; });
            if (winners.length < 2) winners = laureate.split(/[;]/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 2; });
            var combinedAnswer = winners.join(', ');
            var combinedFact = 'Nobel Prize 2025 - ' + category + ': ' + combinedAnswer;
            var q = makeQuestion('Who won the Nobel Prize in ' + category + ' in 2025?', combinedAnswer, seq++, 'Nobel Prize', '\uD83C\uDFC6', combinedFact);
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

  // 7. Sports Awards
  await delay(600);
  var SPORTS_PAGES = [
    { page: 'Major_Dhyan_Chand_Khel_Ratna_Award', label: 'Khel Ratna', q: 'Who received the Major Dhyan Chand Khel Ratna Award in {year}?', yearCol: 0, nameCol: 1, emoji: '\uD83C\uDFC6' },
    { page: 'Arjuna_Award', label: 'Arjuna Award', q: 'Who received the Arjuna Award in {year}?', yearCol: 0, nameCol: 1, emoji: '\uD83C\uDFC6' },
    { page: 'Dronacharya_Award', label: 'Dronacharya Award', q: 'Who received the Dronacharya Award in {year}?', yearCol: 0, nameCol: 1, emoji: '\uD83C\uDFC6' }
  ];
  for (var si = 0; si < SPORTS_PAGES.length; si++) {
    process.stdout.write('  ' + SPORTS_PAGES[si].label + '... ');
    var recipients = await fetchTableRecipients(SPORTS_PAGES[si].page, '(2024|2025|2026)', SPORTS_PAGES[si].nameCol, SPORTS_PAGES[si].yearCol, SPORTS_PAGES[si].label, SPORTS_PAGES[si].q, SPORTS_PAGES[si].emoji);
    // Group recipients by year for combined questions
    var byYear = {};
    recipients.forEach(function(r) {
      if (!byYear[r.year]) byYear[r.year] = [];
      byYear[r.year].push(r.name);
    });
    var sportCount = 0;
    Object.keys(byYear).forEach(function(year) {
      var names = byYear[year];
      var combinedAnswer = names.join(', ');
      var qText = SPORTS_PAGES[si].q.replace('{year}', year);
      var q = makeQuestion(qText, combinedAnswer, seq++, '' + SPORTS_PAGES[si].label, SPORTS_PAGES[si].emoji, names[0] + ' received the ' + SPORTS_PAGES[si].label + ' in ' + year + '.');
      if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; sportCount++; }
    });
    process.stdout.write(sportCount + ' recipients\n');
    await delay(600);
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

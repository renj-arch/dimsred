var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'data');
var affairsPath = path.join(dataDir, 'current-affairs.json');

var RSS_URL = 'https://news.google.com/rss/search?q=current+affairs+india+2026&hl=en-IN&gl=IN&ceid=IN:en';

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function extractTitle(titleText) {
  return titleText.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImage(desc) {
  var m = desc.match(/src=['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

function parseRSS(xml) {
  var items = [];
  var itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  var itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    var itemContent = itemMatch[1];
    var titleM = itemContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    var descM = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    var linkM = itemContent.match(/<link[^>]*>([^<]*)<\/link>/i);
    var sourceM = itemContent.match(/<source[^>]*>([^<]*)<\/source>/i);
    if (titleM) {
      var desc = descM ? descM[1].replace(/<!\[CDATA\[([^\]]*)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '';
      items.push({
        title: extractTitle(titleM[1]),
        description: desc,
        link: linkM ? linkM[1] : '',
        source: sourceM ? sourceM[1] : 'Google News',
        pubDate: itemContent.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/i) ? RegExp.$1 : '',
        image: desc ? extractImage(descM[1]) : ''
      });
    }
  }
  return items;
}

function formatDate(pubDateStr) {
  if (!pubDateStr) {
    var now = new Date();
    return { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };
  }
  var d = new Date(pubDateStr);
  if (isNaN(d.getTime())) {
    var now = new Date();
    return { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };
  }
  return { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() };
}

function isDuplicate(existing, title) {
  var lower = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var i = 0; i < existing.length; i++) {
    var existingLower = existing[i].headline.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (existingLower.indexOf(lower) !== -1 || lower.indexOf(existingLower) !== -1) return true;
  }
  return false;
}

function trimHeadline(title, maxLen) {
  maxLen = maxLen || 120;
  // Strip source prefix like "[Source] Title" often in Google News
  title = title.replace(/^\[[^\]]*\]\s*/, '');
  // Strip trailing HTTP
  title = title.replace(/\s*https?:\/\/\S+$/, '');
  if (title.length <= maxLen) return title;
  return title.substring(0, title.lastIndexOf(' ', maxLen)) + '...';
}

async function run() {
  console.log('Fetching current affairs RSS from ' + RSS_URL + '...');
  var resp = await fetch(RSS_URL);
  if (!resp.ok) { console.log('HTTP ' + resp.status + ' - failed to fetch feed'); process.exit(1); }
  var xml = await resp.text();
  console.log('Feed fetched (' + xml.length + ' bytes)');

  var items = parseRSS(xml);
  console.log('Parsed ' + items.length + ' items from feed');

  // Filter out trivial/garbage entries
  var skipPatterns = [
    /watch\s+(live|video)/i, /click\s+here/i, /subscribe/i, /sign\s*up/i,
    /correction:/i, /updated:/i, /live:/i, /photo(s)?:/i
  ];
  items = items.filter(function(item) {
    var text = item.title + ' ' + item.description;
    for (var i = 0; i < skipPatterns.length; i++) {
      if (skipPatterns[i].test(text)) return false;
    }
    return item.title && item.title.length > 15 && item.title.length < 200;
  });

  // Sort by pubDate descending (newest first)
  items.sort(function(a, b) {
    var da = new Date(a.pubDate || 0);
    var db = new Date(b.pubDate || 0);
    return db.getTime() - da.getTime();
  });

  // Load existing
  var existing = [];
  if (fs.existsSync(affairsPath)) {
    try { existing = JSON.parse(fs.readFileSync(affairsPath, 'utf-8')); }
    catch (e) { existing = []; }
  }

  // Keep items that are less than 7 days old
  var now = new Date();
  var oneWeek = 7 * 24 * 60 * 60 * 1000;
  var recent = [];
  for (var i = 0; i < existing.length; i++) {
    var itemDate = new Date(existing[i].year, MONTHS.indexOf(existing[i].month), existing[i].day);
    if (now.getTime() - itemDate.getTime() < oneWeek) recent.push(existing[i]);
  }

  var added = 0;
  for (var i = 0; i < items.length && recent.length < 10; i++) {
    var item = items[i];
    var headline = trimHeadline(item.title);
    if (!headline || isDuplicate(recent, headline)) continue;

    var fd = formatDate(item.pubDate);
    recent.push({
      day: fd.day,
      month: fd.month,
      year: fd.year,
      headline: headline,
      source: item.source || 'Google News',
      link: item.link
    });
    added++;
    console.log('  + [' + fd.day + ' ' + fd.month + '] ' + headline);
  }

  // Sort final by date descending
  recent.sort(function(a, b) {
    var da = new Date(a.year, MONTHS.indexOf(a.month), a.day);
    var db = new Date(b.year, MONTHS.indexOf(b.month), b.day);
    return db.getTime() - da.getTime();
  });

  // Keep latest 15 max
  if (recent.length > 15) recent = recent.slice(0, 15);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(affairsPath, JSON.stringify({ items: recent, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('Saved ' + recent.length + ' current affairs items to ' + affairsPath);
  if (added > 0) console.log('Added ' + added + ' new items.');
  else console.log('No new items added.');
}

run().catch(function(e) { console.error(e); process.exit(1); });

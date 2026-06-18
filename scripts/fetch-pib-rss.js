var fs = require('fs');
var path = require('path');
var Parser = require('rss-parser');

var parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  }
});

var PIB_RSS_URL = 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3';
var PIB_ENGLISH_URL = 'https://www.pib.gov.in/AllRelease.aspx?MenuId=4&lang=1&reg=3';

var dataDir = path.resolve(__dirname, '..', 'data');

function parseEnglishHtml(html) {
  var items = [];
  // Structure: <li><a title='...' href='/PressReleseDetail.aspx?PRID=...'>TITLE </a><span class='publishdatesmall'>Posted on: DD Mon YYYY</li>
  var regex = /<a[^>]*title='([^']*)'[^>]*href='([^']*)'[^>]*>([^<]*)<\/a><span[^>]*>Posted on:\s*(\d{1,2}\s+\w+\s+\d{4})/g;
  var match;
  while ((match = regex.exec(html)) !== null) {
    var title = (match[3] || match[1] || '').trim();
    var link = match[2] || '';
    var dateStr = match[4] || '';
    if (!title) continue;
    if (!link.startsWith('http')) link = 'https://www.pib.gov.in' + link;
    var pubDate = new Date(dateStr);
    items.push({
      id: link,
      title: title,
      link: link,
      description: '',
      category: 'PIB Press Releases',
      pubDate: pubDate.toISOString(),
      source: 'PIB'
    });
  }
  return items;
}

async function fetchRss() {
  try {
    var feed = await parser.parseURL(PIB_RSS_URL);
    var items = (feed.items || []).slice(0, 20);
    return items.map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      return {
        id: item.guid || item.link || item.title,
        title: (item.title || '').trim(),
        link: item.link || '',
        description: (item.contentSnippet || item.content || '').trim().slice(0, 500),
        category: 'PIB Press Releases',
        pubDate: pubDate.toISOString(),
        source: 'PIB_RSS'
      };
    });
  } catch (e) {
    console.error('RSS fetch failed: ' + e.message);
    return [];
  }
}

async function fetchEnglish() {
  try {
    var resp = await fetch(PIB_ENGLISH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!resp.ok) { console.error('English page HTTP ' + resp.status); return []; }
    var html = await resp.text();
    return parseEnglishHtml(html);
  } catch (e) {
    console.error('English page fetch failed: ' + e.message);
    return [];
  }
}

async function fetchAll() {
  console.log('Fetching English HTML page...');
  var englishItems = await fetchEnglish();
  console.log('English items: ' + englishItems.length);

  console.log('Fetching Hindi RSS feed...');
  var rssItems = await fetchRss();
  console.log('RSS items: ' + rssItems.length);

  // Merge: English items first (primary), RSS items fill gaps
  var seen = new Set();
  var merged = [];

  for (var item of englishItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (var item of rssItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  // Sort by date descending
  merged.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

  // Merge with existing data
  var existingPath = path.join(dataDir, 'pib-feed.json');
  var existing = [];
  if (fs.existsSync(existingPath)) {
    try {
      var parsed = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
      existing = (parsed && parsed.items && Array.isArray(parsed.items)) ? parsed.items : [];
    }
    catch(e) { existing = []; }
  }

  var existingSeen = new Set();
  for (var x of existing) {
    if (x.id) existingSeen.add(x.id);
  }
  for (var n of merged) {
    if (!existingSeen.has(n.id)) {
      existing.push(n);
    }
  }

  // Keep last 30 days
  var monthAgo = Date.now() - 30 * 86400000;
  existing = existing.filter(function(i) { return new Date(i.pubDate).getTime() > monthAgo; });
  // Sort by date descending (newest first), then cap at 200
  existing.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
  if (existing.length > 200) existing = existing.slice(0, 200);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify({ items: existing, updatedAt: new Date().toISOString(), note: 'English from AllRelease.aspx, Hindi from RSS' }, null, 2), 'utf-8');
  console.log('PIB feed saved: ' + existing.length + ' items (' + englishItems.length + ' English + ' + rssItems.length + ' RSS)');
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

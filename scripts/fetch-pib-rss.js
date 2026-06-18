var fs = require('fs');
var path = require('path');
var Parser = require('rss-parser');

var parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://pib.gov.in/'
  }
});

var FEEDS = [
  { url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', category: 'PIB Press Releases' }
];

var dataDir = path.resolve(__dirname, '..', 'data');

async function fetchAll() {
  var allItems = [];
  var seen = new Set();

  for (var f of FEEDS) {
    try {
      var resp = await fetch(f.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://pib.gov.in/'
        }
      });
      if (!resp.ok) { console.error('HTTP ' + resp.status + ' for ' + f.url); continue; }
      var xml = await resp.text();
      var feed = await parser.parseString(xml);
      var items = (feed.items || []).slice(0, 20);
      for (var item of items) {
        var guid = item.guid || item.link || item.title;
        if (seen.has(guid)) continue;
        seen.add(guid);
        var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        allItems.push({
          id: guid,
          title: (item.title || '').trim(),
          link: item.link || '',
          description: (item.contentSnippet || item.content || '').trim().slice(0, 500),
          category: f.category,
          pubDate: pubDate.toISOString(),
          source: 'PIB'
        });
      }
      console.log('Fetched ' + items.length + ' items from ' + f.url);
    } catch (e) {
      console.error('Failed to fetch ' + f.url + ': ' + e.message);
    }
  }

  allItems.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

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
  for (var n of allItems) {
    if (!existingSeen.has(n.id)) {
      existing.unshift(n);
    }
  }

  var weekAgo = Date.now() - 7 * 86400000;
  existing = existing.filter(function(i) { return new Date(i.pubDate).getTime() > weekAgo; });
  if (existing.length > 100) existing = existing.slice(0, 100);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify({ items: existing, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('PIB feed: ' + existing.length + ' items saved.');
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

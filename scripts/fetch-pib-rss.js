var fs = require('fs');
var path = require('path');
var Parser = require('rss-parser');

var parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; vlymbooq-bot/1.0)' }
});

var FEEDS = [
  { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=20', category: 'PIB Press Releases' },
  { url: 'https://pib.gov.in/RssMain.aspx?ModId=8&Lang=1&Regid=20', category: 'PIB Photos' }
];

var dataDir = path.resolve(__dirname, '..', 'data');

async function fetchAll() {
  var allItems = [];
  var seen = new Set();

  for (var f of FEEDS) {
    try {
      var feed = await parser.parseURL(f.url);
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
    } catch (e) {
      console.error('Failed to fetch ' + f.url + ': ' + e.message);
    }
  }

  // Sort by date descending
  allItems.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

  // Merge with existing data if any
  var existingPath = path.join(dataDir, 'pib-feed.json');
  var existing = [];
  if (fs.existsSync(existingPath)) {
    try { existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8')); }
    catch(e) {}
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

  // Keep last 7 days of items
  var weekAgo = Date.now() - 7 * 86400000;
  existing = existing.filter(function(i) { return new Date(i.pubDate).getTime() > weekAgo; });

  // Limit to 100 items
  if (existing.length > 100) existing = existing.slice(0, 100);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify({ items: existing, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('PIB feed: ' + existing.length + ' items saved.');
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

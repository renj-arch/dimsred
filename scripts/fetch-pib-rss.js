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
var RBI_RSS_URL = 'https://www.rbi.org.in/pressreleases_rss.xml';
var SEBI_RSS_URL = 'https://www.sebi.gov.in/sebirss.xml';
var SC_JUDGMENTS_RSS_URL = 'https://indiankanoon.org/feeds/latest/supremecourt/';

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

async function fetchRBI() {
  try {
    var feed = await parser.parseURL(RBI_RSS_URL);
    var items = (feed.items || []).slice(0, 20);
    return items.map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      return {
        id: item.guid || item.link || item.title,
        title: (item.title || '').trim(),
        link: item.link || '',
        description: (item.contentSnippet || item.content || '').trim().slice(0, 500),
        category: 'RBI Press Releases',
        pubDate: pubDate.toISOString(),
        source: 'RBI'
      };
    });
  } catch (e) {
    console.error('RBI RSS fetch failed: ' + e.message);
    return [];
  }
}

async function fetchSEBI() {
  try {
    var feed = await parser.parseURL(SEBI_RSS_URL);
    var items = (feed.items || []).slice(0, 20);
    return items.map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (isNaN(pubDate.getTime())) pubDate = new Date();
      return {
        id: item.guid || item.link || item.title,
        title: (item.title || '').trim(),
        link: item.link || '',
        description: (item.contentSnippet || item.content || '').trim().slice(0, 500),
        category: 'SEBI Press Releases',
        pubDate: pubDate.toISOString(),
        source: 'SEBI'
      };
    });
  } catch (e) {
    console.error('SEBI RSS fetch failed: ' + e.message);
    return [];
  }
}

async function fetchISRO() {
  try {
    var resp = await fetch('https://www.isro.gov.in/ISRO_EN/Press.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html, */*', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) { console.error('ISRO page HTTP ' + resp.status); return []; }
    var html = await resp.text();
    var items = [];
    // Match all year tabs (2016-2025) + special 2022 tab1
    var yearPanels = html.match(/<div class="tab-pane[^"]*fade[^"]*show[^"]*"[^>]*id="(tab\d+|tab1)"[^>]*>[\s\S]*?<table[\s\S]*?<\/table>/g);
    if (!yearPanels) return [];
    yearPanels.forEach(function(panel) {
      var rows = panel.match(/<tr>[\s\S]*?<\/tr>/g);
      if (!rows) return;
      rows.forEach(function(row) {
        var aMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
        var dateMatch = row.match(/<td[^>]*class="[^"]*date[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/);
        if (!aMatch) return;
        var title = (aMatch[3] || aMatch[2] || '').replace(/<[^>]+>/g, '').trim();
        if (!title) title = (aMatch[2] || '').trim();
        if (!title || title.length < 5) return;
        var link = aMatch[1] || '';
        if (link && !link.startsWith('http')) link = 'https://www.isro.gov.in/ISRO_EN/' + link;
        var dateStr = dateMatch ? dateMatch[1].trim() : '';
        var pubDate = dateStr ? new Date(dateStr.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()) : new Date();
        if (isNaN(pubDate.getTime())) pubDate = new Date();
        items.push({
          id: link || title,
          title: title,
          link: link,
          description: '',
          category: 'ISRO Press Releases',
          pubDate: pubDate.toISOString(),
          source: 'ISRO'
        });
      });
    });
    // Cap to latest 50 items (newest first)
    items.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
    items = items.slice(0, 50);
    return items;
  } catch (e) {
    console.error('ISRO page fetch failed: ' + e.message);
    return [];
  }
}

async function fetchMEA() {
  try {
    var resp = await fetch('https://www.mea.gov.in/FrontEnd/FetchPublicationListingData?publicationId=51&SortBy=new&page=1&PageSize=20&PLngId=1', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html, */*', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) { console.error('MEA AJAX HTTP ' + resp.status); return []; }
    var html = await resp.text();
    var items = [];
    var regex = /<div class="pressRelesastBox">[\s\S]*?<span class="date">([^<]*)<\/span>[\s\S]*?<h3 class="pressTitle"><a href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h3>/g;
    var match;
    while ((match = regex.exec(html)) !== null) {
      var title = (match[3] || '').replace(/<[^>]+>/g, '').trim();
      var link = match[2] || '';
      var dateStr = (match[1] || '').trim();
      if (!title) continue;
      if (link && !link.startsWith('http')) link = 'https://www.mea.gov.in' + link;
      var pubDate = new Date(dateStr);
      if (isNaN(pubDate.getTime())) pubDate = new Date();
      items.push({
        id: link || title,
        title: title,
        link: link,
        description: '',
        category: 'MEA Press Releases',
        pubDate: pubDate.toISOString(),
        source: 'MEA'
      });
    }
    items.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
    items = items.slice(0, 20);
    return items;
  } catch (e) {
    console.error('MEA AJAX fetch failed: ' + e.message);
    return [];
  }
}

async function fetchSCJudgments() {
  try {
    var feed = await parser.parseURL(SC_JUDGMENTS_RSS_URL);
    var items = (feed.items || []).slice(0, 20);
    return items.map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (isNaN(pubDate.getTime())) pubDate = new Date();
      return {
        id: item.guid || item.link || item.title,
        title: (item.title || '').trim(),
        link: item.link || '',
        description: (item.contentSnippet || item.content || '').trim().slice(0, 800),
        category: 'Supreme Court Judgments',
        pubDate: pubDate.toISOString(),
        source: 'SC'
      };
    });
  } catch (e) {
    console.error('SC Judgments RSS fetch failed: ' + e.message);
    return [];
  }
}

async function fetchAll() {
  console.log('Fetching PIB English HTML page...');
  var englishItems = await fetchEnglish();
  console.log('PIB English items: ' + englishItems.length);

  console.log('Fetching PIB RSS feed...');
  var rssItems = await fetchRss();
  console.log('PIB RSS items: ' + rssItems.length);

  console.log('Fetching RBI Press Releases RSS...');
  var rbiItems = await fetchRBI();
  console.log('RBI items: ' + rbiItems.length);

  console.log('Fetching SEBI RSS feed...');
  var sebiItems = await fetchSEBI();
  console.log('SEBI items: ' + sebiItems.length);

  console.log('Fetching SC Judgments RSS...');
  var scItems = await fetchSCJudgments();
  console.log('SC items: ' + scItems.length);

  console.log('Fetching ISRO press releases...');
  var isroItems = await fetchISRO();
  console.log('ISRO items: ' + isroItems.length);

  console.log('Fetching MEA press releases...');
  var meaItems = await fetchMEA();
  console.log('MEA items: ' + meaItems.length);

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
  for (var item of rbiItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (var item of sebiItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (var item of scItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (var item of isroItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (var item of meaItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  // Remove Hindi-language items (Devanagari Unicode range)
  merged = merged.filter(function(item) {
    if (!item.title) return false;
    for (var i = 0; i < item.title.length; i++) {
      var code = item.title.charCodeAt(i);
      if (code >= 0x0900 && code <= 0x097F) return false;
    }
    return true;
  });

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

  // Remove Hindi from existing data too (filtering persisted only from merged previously)
  existing = existing.filter(function(item) {
    if (!item.title) return false;
    for (var i = 0; i < item.title.length; i++) {
      var code = item.title.charCodeAt(i);
      if (code >= 0x0900 && code <= 0x097F) return false;
    }
    return true;
  });

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
  fs.writeFileSync(existingPath, JSON.stringify({ items: existing, updatedAt: new Date().toISOString(), note: 'PIB + RBI + SEBI + SC + ISRO + MEA' }, null, 2), 'utf-8');
  console.log('Feed saved: ' + existing.length + ' items (PIB English ' + englishItems.length + ' + PIB RSS ' + rssItems.length + ' + RBI ' + rbiItems.length + ' + SEBI ' + sebiItems.length + ' + SC ' + scItems.length + ' + ISRO ' + isroItems.length + ' + MEA ' + meaItems.length + ')');
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

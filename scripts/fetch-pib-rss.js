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

var STATE_RSS_FEEDS = [
  { state: 'Telangana', url: 'https://www.telangana.gov.in/feed' },
  { state: 'Goa', url: 'https://dip.goa.gov.in/feed/' },
  { state: 'Assam', url: 'https://assam.gov.in/rss.xml' },
  { state: 'Odisha', url: 'https://odisha.gov.in/rss.xml' },
  { state: 'Puducherry', url: 'https://py.gov.in/rss.xml' },
  { state: null, url: 'https://www.mygov.in/rss.xml' },
  { state: 'Kerala', url: 'https://prd.kerala.gov.in/rss.xml' },
  { state: 'Meghalaya', url: 'https://meghalaya.gov.in/rss.xml' }
];

var dataDir = path.resolve(__dirname, '..', 'data');

function categorizeItem(title, desc) {
  var t = (title + ' ' + (desc || '')).toLowerCase();
  if (/(?:passes away|demise |condolence|cremated|mortal remains|funeral |tributes |death |departed|last rites|state funeral)/.test(t)) return 'Obituaries';
  if (/(?:sport|athlete|olympi|medal |khelo|hockey|football|cricket|badminton|wrestl|fencing|rower|runner|championship|asian games|world cup|player |coach |fitness|fit india|sports minister|youth affairs|sports board|dope|anti.?doping|stadium|yogasana|world championship|tournament|national games)/.test(t)) return 'Sports';
  if (/(?:award|padma|honou|felicitat|recognition|prize |puraskar|gallantry|decorated|honored)/.test(t)) return 'Awards';
  if (/(?:appointed|takes charge|assumes charge|assumes office|sworn in|oath |secretary|chairperson|chairman|board of|committee formed|nominated)/.test(t)) return 'Appointments';
  if (/(?:flood|earthquake|cyclone|disaster|relief |rescue |emergency|landslide|storm |drought|tsunami|avalanche|heatwave|havoc|devastat)/.test(t)) return 'Disasters';
  if (/(?:film |cinema|movie |festival|culture |cultural|music |dance |drama |art |museum|heritage|exhibition|theatre|actor|actress|entertainment|folk |tribal art|handicraft)/.test(t)) return 'Entertainment';
  if (/(?:technology|digital |it\s|computer|software|ai\s|artificial intelli|space |satellite|innovation|internet|cyber |drone |semiconductor|5g |startup |electronic|robotics|supercomputer|quantum)/.test(t)) return 'Tech & Science';
  if (/(?:economy|gdp |gva |trade |budget |investment|commerce|industry|market|finance|tax |gst |banking|manufacturing|export |import |economic|fdi |inflation|fiscal|monetary|revenue)/.test(t)) return 'Business & Economy';
  if (/(?:health |hospital|medical |doctor |patient|disease|ayushman|medicine|vaccine|pharma|drug |nutrition|wellness|healthcare|ayush|dengue|malaria|tuberculosis)/.test(t)) return 'Health';
  if (/(?:defence|defense|army |navy |air force|drdo|military|soldier|border |missile|submarine|warship|security|terrorism|insurgency|coast guard|paramilitary|peacekeeping)/.test(t)) return 'Defence & Security';
  if (/(?:education|school |college|university|student |teacher |exam |scholarship|fellowship|ncert|nep |new education|skill development|vocational)/.test(t)) return 'Education';
  if (/(?:agriculture|farmer|kisan|crop |food grain|wheat|rice |paddy|fertiliser|irrigation|soil health|msp |minimum support|horticulture|dairy |fisher)/.test(t)) return 'Agriculture';
  if (/(?:energy|electricity|coal |oil |petroleum|natural gas|solar |wind |renewable|hydrogen|biofuel|ethanol|power project|power plant|power sector|power generation|power capacity)/.test(t)) return 'Energy';
  if (/(?:environment|climate|forest|wildlife|pollution|ecology|green |emission|carbon |biodiversity|conservation|wetland|river |ganga |swachh)/.test(t)) return 'Environment & Climate';
  return 'PIB Press Releases';
}

function extractRegion(title, desc) {
  var t = (title + ' ' + (desc || '')).toLowerCase().replace(/[.,]/g, '');
  if (/\bandhra\b/.test(t) && /\bpradesh\b/.test(t)) return 'Andhra Pradesh';
  if (/\barunachal\b/.test(t) && /\bpradesh\b/.test(t)) return 'Arunachal Pradesh';
  if (/\bassam\b/.test(t)) return 'Assam';
  if (/\bbihar\b/.test(t)) return 'Bihar';
  if (/\bchhattisgarh\b/.test(t)) return 'Chhattisgarh';
  if (/\bgoa\b/.test(t)) return 'Goa';
  if (/\bgujarat\b/.test(t)) return 'Gujarat';
  if (/\bharyana\b/.test(t)) return 'Haryana';
  if (/\bhimachal\b/.test(t) && /\bpradesh\b/.test(t)) return 'Himachal Pradesh';
  if (/\bjharkhand\b/.test(t)) return 'Jharkhand';
  if (/\bkarnataka\b/.test(t)) return 'Karnataka';
  if (/\bkerala\b/.test(t)) return 'Kerala';
  if (/\bmadhya\b/.test(t) && /\bpradesh\b/.test(t)) return 'Madhya Pradesh';
  if (/\bmaharashtra\b/.test(t)) return 'Maharashtra';
  if (/\bmanipur\b/.test(t)) return 'Manipur';
  if (/\bmeghalaya\b/.test(t)) return 'Meghalaya';
  if (/\bmizoram\b/.test(t)) return 'Mizoram';
  if (/\bnagaland\b/.test(t)) return 'Nagaland';
  if (/\bodisha\b/.test(t)) return 'Odisha';
  if (/\bpunjab\b/.test(t)) return 'Punjab';
  if (/\brajasthan\b/.test(t)) return 'Rajasthan';
  if (/\bsikkim\b/.test(t)) return 'Sikkim';
  if (/\btamil\b/.test(t) && /\bnadu\b/.test(t)) return 'Tamil Nadu';
  if (/\btelangana\b/.test(t)) return 'Telangana';
  if (/\btripura\b/.test(t)) return 'Tripura';
  if (/\bwest\b/.test(t) && /\bbengal\b/.test(t)) return 'West Bengal';
  if (/\buttar\b/.test(t)) {
    if (/\bpradesh\b/.test(t)) return 'Uttar Pradesh';
    if (/\brakhand\b/.test(t)) return 'Uttarakhand';
  }
  if (/\bandaman\b/.test(t) && /\bnicobar\b/.test(t)) return 'Andaman & Nicobar';
  if (/\bchandigarh\b/.test(t)) return 'Chandigarh';
  if (/\bdaman\b/.test(t) && /\bdiu\b/.test(t)) return 'Dadra & Nagar Haveli and Daman & Diu';
  if (/\bdelhi\b/.test(t)) return 'Delhi';
  if (/\bjammu\b/.test(t) && /\bkashmir\b/.test(t)) return 'Jammu & Kashmir';
  if (/\bladakh\b/.test(t)) return 'Ladakh';
  if (/\blakshadweep\b/.test(t)) return 'Lakshadweep';
  if (/\bpuducherry\b/.test(t) || /\bpondicherry\b/.test(t)) return 'Puducherry';
  return '';
}

function isEnglishText(text) {
  if (!text) return false;
  var latin = 0, other = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code > 0x007F && code !== 0x200B && code !== 0x200C && code !== 0x200D) other++;
    else if (code <= 0x007F && code >= 0x0020) latin++;
  }
  return other === 0 || (latin / Math.max(latin + other, 1)) > 0.4;
}

function rewriteItem(item) {
  var title = (item.title || '').trim();
  var desc = (item.description || '').trim();

  title = title.replace(/\s*[-–—]\s*[A-Z][A-Za-z\s.&]+$/g, '').trim();
  title = title.replace(/^(Press Release|PRESS RELEASE|Press Information Bureau|PIB|Release)\s*[:–-]\s*/i, '').trim();

  title = title.replace(/\bPMModi\b/g, 'Prime Minister Narendra Modi');
  title = title.replace(/\bPM\b(?!\s+of\s+India)/g, 'Prime Minister');
  title = title.replace(/\bCJI\b/g, 'Chief Justice of India');
  title = title.replace(/\bVP\b/g, 'Vice President');
  title = title.replace(/\bFM\b/g, 'Finance Minister');
  title = title.replace(/\bHM\b(?!\s+of)/g, 'Home Minister');
  title = title.replace(/\bRM\b/g, 'Defence Minister');
  title = title.replace(/\bRBI\b/g, 'RBI (Reserve Bank of India)');
  title = title.replace(/\bSEBI\b/g, 'SEBI (Securities and Exchange Board of India)');
  title = title.replace(/\bISRO\b/g, 'ISRO (Indian Space Research Organisation)');

  desc = desc.replace(/<[^>]+>/g, '').trim();
  if (desc.length > 200) desc = desc.slice(0, 200) + '...';
  if (!desc || desc.length < 10) desc = title;

  item.title = title;
  item.description = desc;
  return item;
}

function parseEnglishHtml(html) {
  var items = [];
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
      category: categorizeItem(title, ''),
      region: extractRegion(title, ''),
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
      var title = (item.title || '').trim();
      var desc = (item.contentSnippet || item.content || '').trim().slice(0, 500);
      return {
        id: item.guid || item.link || title,
        title: title,
        link: item.link || '',
        description: desc,
        category: categorizeItem(title, desc),
        region: extractRegion(title, desc),
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html, */*', 'Accept-Language': 'en-US,en;q=0.9' }
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
    var yearPanels = html.match(/<div class="tab-pane[^"]*"[^>]*id="(tab\d+|tab1)"[^>]*>[\s\S]*?<table[\s\S]*?<\/table>/g);
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
    var regex = /<div class="pressRelesastBox">[\s\S]*?<span class="date">([^<]*)<\/span>[\s\S]*?<h3 class="pressTitle">[\s\S]*?<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g;
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

async function concurrentMap(items, fn, limit) {
  var results = [];
  var queue = items.slice();
  async function worker() {
    while (queue.length > 0) {
      var item = queue.shift();
      try {
        var r = await fn(item);
        if (r && r.length) results = results.concat(r);
      } catch (e) {}
    }
  }
  var workers = [];
  for (var i = 0; i < Math.min(limit, items.length); i++) { workers.push(worker()); }
  await Promise.all(workers);
  return results;
}

async function fetchGoogleNewsForState(state, query) {
  try {
    var url = GOOGLE_NEWS_TPL.replace('{q}', encodeURIComponent(query));
    var feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 3).map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      var title = (item.title || '').trim();
      var desc = (item.contentSnippet || '').trim().slice(0, 200);
      return {
        id: item.guid || item.link || title + state,
        title: title,
        link: item.link || '',
        description: desc,
        category: categorizeItem(title, desc),
        region: state,
        pubDate: pubDate.toISOString(),
        source: 'GoogleNews'
      };
    });
  } catch (e) {
    return [];
  }
}

async function fetchAllGoogleNews() {
  console.log('Fetching Google News for ' + STATE_QUERIES.length + ' states/UTs...');
  var items = await concurrentMap(STATE_QUERIES, function(q) {
    return fetchGoogleNewsForState(q.state, q.q);
  }, 5);
  console.log('Google News items: ' + items.length);
  return items;
}

async function fetchStateRSSFeed(config) {
  try {
    var feed = await parser.parseURL(config.url);
    return (feed.items || []).slice(0, 10).map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      var title = (item.title || '').trim();
      var desc = (item.contentSnippet || item.content || '').trim().slice(0, 200);
      var region = config.state ? extractRegion(title + ' ' + desc) || config.state : extractRegion(title, desc);
      return {
        id: item.guid || item.link || title + (config.state || ''),
        title: title,
        link: item.link || '',
        description: desc,
        category: categorizeItem(title, desc),
        region: region,
        pubDate: pubDate.toISOString(),
        source: 'StateRSS'
      };
    });
  } catch (e) {
    console.error('StateRSS fetch failed for ' + (config.state || config.url) + ': ' + e.message);
    return [];
  }
}

async function fetchAllStateRSS() {
  console.log('Fetching ' + STATE_RSS_FEEDS.length + ' state RSS feeds...');
  var items = await concurrentMap(STATE_RSS_FEEDS, function(feed) {
    return fetchStateRSSFeed(feed);
  }, 3);
  console.log('State RSS items: ' + items.length);
  return items;
}

async function fetchDelhiGov() {
  try {
    var resp = await fetch('https://delhi.gov.in/whats-new', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html, */*' }
    });
    if (!resp.ok) return [];
    var html = await resp.text();
    var items = [];
    var itemRegex = /<li>[\s\S]*?<div class="notification-view">[\s\S]*?<div class="tab-title">([\s\S]*?)<\/div>[\s\S]*?<div class="tab-date">[^D]*Date\s*:\s*(\d{2}[-/]\d{2}[-/]\d{4})[\s\S]*?<\/div>[\s\S]*?<a[^>]*title="([\s\S]*?)"[^>]*href="([^"]*)"[^>]*>/g;
    var match;
    while ((match = itemRegex.exec(html)) !== null) {
      var title = (match[1] || match[3] || '').replace(/<[^>]+>/g, '').trim();
      var link = match[4] || '';
      var dateStr = match[2] || '';
      if (!title || title.length < 5) continue;
      if (link && !link.startsWith('http')) link = 'https://delhi.gov.in' + link;
      var parts = dateStr.split(/[-/]/);
      var pubDate = new Date(parts[2], parts[1] - 1, parts[0]);
      if (isNaN(pubDate.getTime())) pubDate = new Date();
      items.push({
        id: link || title + 'Delhi',
        title: title,
        link: link,
        description: 'Notification from Delhi Government — ' + title,
        category: categorizeItem(title, ''),
        region: 'Delhi',
        pubDate: pubDate.toISOString(),
        source: 'DelhiGov'
      });
    }
    items.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
    return items.slice(0, 10);
  } catch (e) {
    console.error('DelhiGov fetch failed: ' + e.message);
    return [];
  }
}

async function scrapeGenericGovSite(url, region, linkPrefix, sourceName) {
  try {
    var resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html, */*' }
    });
    if (!resp.ok) return [];
    var html = await resp.text();
    var items = [];
    var links = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]{10,})<\/a>/g) || [];
    var seen = {};
    links.forEach(function(anchor) {
      var hrefMatch = anchor.match(/href="([^"]*)"/);
      var textMatch = anchor.match(/>([^<]{10,})<\/a>/);
      if (!hrefMatch || !textMatch) return;
      var href = hrefMatch[1];
      var text = textMatch[1].trim();
      if (text.length < 10 || text.length > 150) return;
      if (href === '#' || href.startsWith('javascript') || href.startsWith('mailto')) return;
      if (seen[text]) return;
      seen[text] = true;
      if (href && !href.startsWith('http')) href = linkPrefix + href;
      var pubDate = new Date();
      var dateMatch = html.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.{0,200}(\\d{1,2}[-/]\\w+[-/]\\d{2,4})', 'i'));
      if (dateMatch) {
        pubDate = new Date(dateMatch[1]);
        if (isNaN(pubDate.getTime())) pubDate = new Date();
      }
      items.push({
        id: href || text + region,
        title: text,
        link: href || '',
        description: 'Announcement from ' + region + ' Government — ' + text,
        category: categorizeItem(text, ''),
        region: region,
        pubDate: pubDate.toISOString(),
        source: sourceName || region.replace(/\s+/g, '') + 'Gov'
      });
    });
    items.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
    return items.slice(0, 10);
  } catch (e) {
    console.error(region + ' scrape failed: ' + e.message);
    return [];
  }
}

var STATE_SCRAPE_CONFIGS = [
  { state: 'Delhi', source: 'StateGov', urls: ['https://delhi.gov.in/whats-new'] },
  { state: 'Ladakh', source: 'StateGov', urls: ['https://ladakh.gov.in'] },
  { state: 'Dadra & Nagar Haveli and Daman & Diu', source: 'StateGov', urls: ['https://dnh.gov.in'] },
  { state: 'Punjab', source: 'StateGov', urls: ['https://punjab.gov.in/news', 'https://punjab.gov.in'] },
  { state: 'Maharashtra', source: 'StateGov', urls: ['https://maharashtra.gov.in'] },
  { state: 'Andhra Pradesh', source: 'StateGov', urls: ['https://ap.gov.in'] },
  { state: 'Arunachal Pradesh', source: 'StateGov', urls: ['https://arunachal.gov.in', 'https://arunachalpradesh.gov.in', 'https://arun.nic.in'] },
  { state: 'Bihar', source: 'StateGov', urls: ['https://bihar.gov.in', 'https://state.bihar.gov.in', 'https://gov.bih.nic.in'] },
  { state: 'Chhattisgarh', source: 'StateGov', urls: ['https://cgstate.gov.in', 'https://dpr.cg.gov.in', 'https://cg.nic.in'] },
  { state: 'Gujarat', source: 'StateGov', urls: ['https://gujarat.gov.in', 'https://gujaratinformation.gujarat.gov.in', 'https://guj.nic.in'] },
  { state: 'Haryana', source: 'StateGov', urls: ['https://haryana.gov.in/whats-new', 'https://haryana.gov.in'] },
  { state: 'Himachal Pradesh', source: 'StateGov', urls: ['https://himachal.gov.in/whats-new', 'https://himachal.gov.in'] },
  { state: 'Jharkhand', source: 'StateGov', urls: ['https://jharkhand.gov.in'] },
  { state: 'Karnataka', source: 'StateGov', urls: ['https://karnataka.gov.in'] },
  { state: 'Madhya Pradesh', source: 'StateGov', urls: ['https://mp.gov.in/whats-new', 'https://mp.gov.in'] },
  { state: 'Manipur', source: 'StateGov', urls: ['https://manipur.gov.in'] },
  { state: 'Mizoram', source: 'StateGov', urls: ['https://mizoram.gov.in'] },
  { state: 'Nagaland', source: 'StateGov', urls: ['https://nagaland.gov.in'] },
  { state: 'Rajasthan', source: 'StateGov', urls: ['https://rajasthan.gov.in/whats-new', 'https://rajasthan.gov.in'] },
  { state: 'Sikkim', source: 'StateGov', urls: ['https://sikkim.gov.in'] },
  { state: 'Tamil Nadu', source: 'StateGov', urls: ['https://tn.gov.in'] },
  { state: 'Tripura', source: 'StateGov', urls: ['https://tripura.gov.in'] },
  { state: 'Uttar Pradesh', source: 'StateGov', urls: ['https://up.gov.in'] },
  { state: 'Uttarakhand', source: 'StateGov', urls: ['https://uk.gov.in', 'https://pmuk.gov.in', 'https://uk.nic.in'] },
  { state: 'West Bengal', source: 'StateGov', urls: ['https://wb.gov.in'] },
  { state: 'Jammu & Kashmir', source: 'StateGov', urls: ['https://jkgad.gov.in', 'https://jk.gov.in', 'https://dipr.jk.gov.in', 'https://jk.nic.in'] },
  { state: 'Chandigarh', source: 'StateGov', urls: ['https://chandigarh.gov.in', 'https://chd.nic.in'] },
  { state: 'Lakshadweep', source: 'StateGov', urls: ['https://lakshadweep.gov.in/whats-new', 'https://lakshadweep.gov.in'] },
  { state: 'Andaman & Nicobar', source: 'StateGov', urls: ['https://andaman.gov.in', 'https://and.nic.in'] }
];

async function fetchAllHtmlScraped() {
  console.log('Fetching HTML-scraped state pages (' + STATE_SCRAPE_CONFIGS.length + ' states)...');
  var scrapers = STATE_SCRAPE_CONFIGS.map(function(c) {
    if (c.state === 'Delhi') return fetchDelhiGov();
    return (async function() {
      for (var i = 0; i < c.urls.length; i++) {
        var items = await scrapeGenericGovSite(c.urls[i], c.state, c.urls[i].replace(/\/[^/]*$/, '/'), c.source);
        if (items.length > 0) return items;
      }
      return [];
    })();
  });
  var results = await Promise.allSettled(scrapers);
  var total = 0;
  var all = [];
  results.forEach(function(r) {
    if (r.status === 'fulfilled' && r.value && r.value.length) {
      total += r.value.length;
      all = all.concat(r.value);
    }
  });
  console.log('HTML scraped items: ' + total);
  return all;
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

  var stateRssItems = await fetchAllStateRSS();
  var htmlScrapedItems = await fetchAllHtmlScraped();

  // Merge all items
  var seen = new Set();
  var merged = [];

  function addItems(items) {
    for (var item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }

  addItems(englishItems);
  addItems(rssItems);
  addItems(rbiItems);
  addItems(sebiItems);
  addItems(scItems);
  addItems(isroItems);
  addItems(meaItems);
  addItems(stateRssItems);
  addItems(htmlScrapedItems);

  // Remove non-English items (check title)
  merged = merged.filter(function(item) {
    return item.title && isEnglishText(item.title);
  });

  // Apply content rewriting to all items
  merged = merged.map(rewriteItem);

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

  // Filter existing: remove non-English, re-categorize old PIB items
  existing = existing.filter(function(item) {
    if (!item.title) return false;
    if (!isEnglishText(item.title)) return false;
    if (item.source === 'PIB' || item.source === 'PIB_RSS') {
      item.category = categorizeItem(item.title, item.description || '');
      item.region = extractRegion(item.title, item.description || '');
    }
    return true;
  });

  // Add new items not already in existing
  var existingSeen = new Set();
  for (var x of existing) { if (x.id) existingSeen.add(x.id); }
  for (var n of merged) {
    if (!existingSeen.has(n.id)) {
      existing.push(n);
    }
  }

  // Keep last 30 days
  var monthAgo = Date.now() - 30 * 86400000;
  existing = existing.filter(function(i) { return new Date(i.pubDate).getTime() > monthAgo; });
  // Sort by date descending, cap at 200
  existing.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
  if (existing.length > 200) existing = existing.slice(0, 200);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify({
    items: existing,
    updatedAt: new Date().toISOString(),
    note: 'PIB + RBI + SEBI + SC + ISRO + MEA + StateRSS + HTML scraped — original summaries for educational/commercial use (government public sources + rewritten content)'
  }, null, 2), 'utf-8');

  console.log('Feed saved: ' + existing.length + ' items');
  var srcCounts = {};
  existing.forEach(function(i) { srcCounts[i.source] = (srcCounts[i.source] || 0) + 1; });
  console.log('Source breakdown:', JSON.stringify(srcCounts));
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

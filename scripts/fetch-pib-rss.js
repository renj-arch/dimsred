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

var GOOGLE_NEWS_TPL = 'https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en';

var STATE_QUERIES = [
  { state: 'Andhra Pradesh', q: 'Andhra Pradesh government news' },
  { state: 'Arunachal Pradesh', q: 'Arunachal Pradesh government' },
  { state: 'Assam', q: 'Assam government news' },
  { state: 'Bihar', q: 'Bihar government news' },
  { state: 'Chhattisgarh', q: 'Chhattisgarh government news' },
  { state: 'Goa', q: 'Goa government news' },
  { state: 'Gujarat', q: 'Gujarat government news' },
  { state: 'Haryana', q: 'Haryana government news scheme' },
  { state: 'Himachal Pradesh', q: 'Himachal Pradesh government news' },
  { state: 'Jharkhand', q: 'Jharkhand government news' },
  { state: 'Karnataka', q: 'Karnataka government news' },
  { state: 'Kerala', q: 'Kerala government news' },
  { state: 'Madhya Pradesh', q: 'Madhya Pradesh government news' },
  { state: 'Maharashtra', q: 'Maharashtra government news' },
  { state: 'Manipur', q: 'Manipur government news' },
  { state: 'Meghalaya', q: 'Meghalaya government news' },
  { state: 'Mizoram', q: 'Mizoram government news' },
  { state: 'Nagaland', q: 'Nagaland government news' },
  { state: 'Odisha', q: 'Odisha government scheme news' },
  { state: 'Punjab', q: 'Punjab government news' },
  { state: 'Rajasthan', q: 'Rajasthan government news' },
  { state: 'Sikkim', q: 'Sikkim government news' },
  { state: 'Tamil Nadu', q: 'Tamil Nadu government news' },
  { state: 'Telangana', q: 'Telangana government news' },
  { state: 'Tripura', q: 'Tripura government news' },
  { state: 'Uttar Pradesh', q: 'Uttar Pradesh government news' },
  { state: 'Uttarakhand', q: 'Uttarakhand government news' },
  { state: 'West Bengal', q: 'West Bengal government news' },
  { state: 'Delhi', q: 'Delhi government news' },
  { state: 'Jammu & Kashmir', q: 'Jammu Kashmir government news' },
  { state: 'Ladakh', q: 'Ladakh government news' },
  { state: 'Puducherry', q: 'Puducherry government news' },
  { state: 'Chandigarh', q: 'Chandigarh government news' },
  { state: 'Andaman & Nicobar', q: 'Andaman Nicobar Islands tourism development' },
  { state: 'Lakshadweep', q: 'Lakshadweep Islands India scheme' },
  { state: 'Dadra & Nagar Haveli and Daman & Diu', q: 'Daman Diu Dadra Nagar Haveli tourism' }
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
  return 'Announcements';
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

var TEMPLATES = {
  'Agriculture': [ 'In a key development for the farm sector, ', '. This move aims to strengthen agricultural productivity and farmer welfare.' ],
  'Awards': [ 'In recognition of outstanding contributions, ', '. The honour underscores excellence in the respective field.' ],
  'Appointments': [ 'In a significant administrative move, ', '. The appointment is expected to bring fresh leadership to the position.' ],
  'Business & Economy': [ 'In a major economic development, ', '. The decision is set to impact the broader economic landscape.' ],
  'Defence & Security': [ 'On the defence and security front, ', '. The move reinforces India\'s preparedness and strategic capabilities.' ],
  'Disasters': [ 'In a concerning development, ', '. Relief and rescue operations are underway.' ],
  'Education': [ 'In the education sector, ', '. The initiative aims to enhance learning outcomes and access to quality education.' ],
  'Energy': [ 'In the energy sector, ', '. This contributes to India\'s energy security and sustainability goals.' ],
  'Entertainment': [ 'In the world of arts and culture, ', '. The development highlights India\'s vibrant creative landscape.' ],
  'Environment & Climate': [ 'On the environmental front, ', '. This step aligns with India\'s commitment to sustainable development.' ],
  'Health': [ 'In the healthcare domain, ', '. The measure is expected to benefit public health outcomes.' ],
  'Obituaries': [ 'It is with deep sorrow that, ', '. The nation mourns the loss.' ],
  'Sports': [ 'In the world of sports, ', '. The achievement celebrates India\'s sporting spirit.' ],
  'Tech & Science': [ 'In science and technology, ', '. The advancement marks a significant step in India\'s technological progress.' ],
  'default': [ 'In a recent development, ', '.' ]
};

var TEMPLATE_SOURCE = {
  'PIB': 'According to the Press Information Bureau (PIB), ',
  'PIB_RSS': 'As per the Press Information Bureau, ',
  'RBI': 'The Reserve Bank of India (RBI) has announced that ',
  'SEBI': 'The Securities and Exchange Board of India (SEBI) has ',
  'ISRO': 'The Indian Space Research Organisation (ISRO) has ',
  'MEA': 'The Ministry of External Affairs (MEA) has ',
  'SC': 'The Supreme Court of India has '
};

function smartCase(str) {
  // Convert all-caps to readable title case, preserve acronyms
  if (str !== str.toUpperCase()) return str;
  var words = str.split(/\s+/);
  var result = [];
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    if (word.length <= 3 && /^[A-Z]+$/.test(word)) { result.push(word); continue; } // keep short acronyms
    if (/^[A-Z]{2,}[s]?$/.test(word)) { result.push(word); continue; } // keep acronyms like IITs
    result.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return result.join(' ');
}

function handWriteSummary(title, source, category) {
  var t = title;
  var cat = category || 'default';

  // Clean all-caps titles (common in PIB)
  if (t === t.toUpperCase() && t.length > 15) {
    t = smartCase(t);
  }
  // Remove quotes at start/end
  t = t.replace(/^["\u201C\u201D\u2018\u2019]+|["\u201C\u201D\u2018\u2019]+$/g, '').trim();
  // Remove trailing source attribution like ": Lok Sabha Speaker"
  t = t.replace(/\s*:\s*[A-Z][A-Za-z\s.&]+\s*\([^)]+\)\s*$/g, '').trim();
  t = t.replace(/\s*:\s*[A-Z][A-Za-z\s.&]+\s*$/g, '').trim();

  var tmpl = TEMPLATES[cat] || TEMPLATES['default'];
  var src = TEMPLATE_SOURCE[source];
  var lead = src || tmpl[0];

  // Strip redundant official prefixes for cleaner flow
  var body = t;
  body = body.replace(/^(Prime Minister|PM|President|President of India|Vice President|Union Minister|Home Minister|Finance Minister|Defence Minister|Education Minister|Health Minister)\s+(Shri|Smt|Dr)\s+/i, '').trim();
  body = body.replace(/^(Shri|Smt|Dr)\s+/i, '').trim();
  body = body.replace(/^of\s+/i, '').trim();

  var summary = lead + body + '.';
  if (summary.length > 200) summary = summary.slice(0, 197) + '...';
  return summary;
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

  desc = desc.replace(/<[^>]+>/g, '').trim();
  if (desc.length > 200) desc = desc.slice(0, 200) + '...';

  // Always generate hand-written summary
  desc = handWriteSummary(title, item.source, item.category);

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
    return (feed.items || []).slice(0, 4).map(function(item) {
      var pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      var title = (item.title || '').trim();
      var desc = (item.contentSnippet || '').trim().slice(0, 200);
      return {
        id: item.guid || item.link || title + state,
        title: title,
        link: '',
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

  var googleNewsItems = await fetchAllGoogleNews();

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
  addItems(googleNewsItems);

  // Remove non-English items (check title)
  merged = merged.filter(function(item) {
    return item.title && isEnglishText(item.title);
  });

  // Strip all links — this site shows content only, no external navigation
  merged = merged.map(function(item) { item.link = ''; return item; });

  // Apply rewriting: PIB stays original, others get hand-written summaries
  merged = merged.map(function(item) {
    if (item.source === 'PIB' || item.source === 'PIB_RSS') {
      if (item.description) item.description = item.description.replace(/<[^>]+>/g, '').trim().slice(0, 300);
      return item;
    }
    return rewriteItem(item);
  });

  // Priority-weighted sort: PIB/RBI/ISRO/MEA get time boost so they rank above same-age scraped items
  function getSortScore(item) {
    var d = new Date(item.pubDate).getTime();
    var boost = 0;
    if (item.source === 'PIB' || item.source === 'PIB_RSS') boost = 24 * 3600000;
    else if (item.source === 'RBI' || item.source === 'ISRO' || item.source === 'MEA' || item.source === 'SC') boost = 18 * 3600000;
    else if (item.source === 'SEBI') boost = 12 * 3600000;
    return d + boost;
  }
  merged.sort(function(a, b) { return getSortScore(b) - getSortScore(a); });

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

  // Filter existing: remove non-English, remove deprecated sources, re-categorize, strip links, rewrite non-PIB
  existing = existing.filter(function(item) {
    if (!item.title) return false;
    if (!isEnglishText(item.title)) return false;
    if (item.source === 'StateGov' || item.source === 'StateRSS' || item.source === 'DelhiGov') return false;
    if (item.source && /Gov$/.test(item.source) && item.source !== 'StateGov') return false;
    item.link = '';
    item.category = categorizeItem(item.title, item.description || '');
    item.region = extractRegion(item.title, item.description || '');
    return true;
  });
  existing = existing.map(function(item) {
    if (item.source === 'PIB' || item.source === 'PIB_RSS') {
      if (item.description) item.description = item.description.replace(/<[^>]+>/g, '').trim().slice(0, 300);
      return item;
    }
    return rewriteItem(item);
  });

  // Combine: new items first (so same-date items favor new over existing)
  var allItems = merged.concat(existing);

  // Dedup by id (keep first occurrence = new items)
  var seenIds = new Set();
  var deduped = [];
  for (var item of allItems) {
    if (item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduped.push(item);
    }
  }

  // Filter out non-news junk (greetings, speech transcripts, routine observances, film fests, etc.)
  var JUNK_PATTERNS = [
    /yoga\s*(day|celebration|sangam)/i, /international day of yoga/i,
    /english rendering of/i, /address\s+at\s+\d+(th|rd|nd)\s+international/i,
    /extends?\s+(birthday|festival|greeting|wishes|greetings)/i,
    /expresses?\s+grief/i, /pays?\s+(tribute|floral|respect)/i,
    /offers?\s+prayers/i, /shares?\s+highlights\s+from/i,
    /screened\s+at\s+miff/i, /miff\s+2026/i, /miff\s+open\s+forum/i,
    /miff\s+honours/i, /documentary\s+celebrates/i, /short\s+film\s+['\u2018]/i,
    /when\s+technology\s+becomes/i, /ai\s+can\s+make\s+filmmaking/i,
    /timeless\s+classic/i, /soul\s+of\s+film/i,
    /oscar-winning\s+short/i, /swiss\s+documentary/i,
    /celebrating\s+a\s+century\s+of\s+wildlife/i,
    /participates?\s+in\s+(programme|event|celebration|function)/i,
    /leads?\s+the\s+national\s+observance/i, /celebrates?\s+/i,
    /observe\s+\d+(th|rd|nd)\s+international/i,
    /invites?\s+citizens?\s+to\s+join/i,
    /^prime minister\s+(extends|expresses|pays|offers|shares|visits|offers\s+prayers)/i,
    /^president\s+of\s+india\s+and\s+the\s+prime\s+minister/i,
    /completion\s+of\s+two\s+years/i, /marking\s+completion/i,
    /^technological\s+agility/i,
    /^as\s+(artists|filmmakers)/i
  ];
  deduped = deduped.filter(function(i) {
    if (i.source === 'SEBI' && /(?:recovery certificate|release order|notice of demand|rc\s*\d|demand notice)/i.test(i.title)) return false;
    if (i.source === 'PIB' || i.source === 'PIB_RSS') {
      for (var j = 0; j < JUNK_PATTERNS.length; j++) {
        if (JUNK_PATTERNS[j].test(i.title)) return false;
      }
    }
    return true;
  });

  // Keep last 30 days
  var monthAgo = Date.now() - 30 * 86400000;
  deduped = deduped.filter(function(i) { return new Date(i.pubDate).getTime() > monthAgo; });
  // Sort by priority-weighted score descending, cap at 200
  deduped.sort(function(a, b) { return getSortScore(b) - getSortScore(a); });
  if (deduped.length > 200) deduped = deduped.slice(0, 200);
  var existing = deduped;

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify({
    items: existing,
    updatedAt: new Date().toISOString(),
    note: 'PIB + RBI + SEBI + SC + ISRO + MEA + Google News — rewritten regional coverage, original PIB content for educational/commercial use'
  }, null, 2), 'utf-8');

  console.log('Feed saved: ' + existing.length + ' items');
  var srcCounts = {};
  existing.forEach(function(i) { srcCounts[i.source] = (srcCounts[i.source] || 0) + 1; });
  console.log('Source breakdown:', JSON.stringify(srcCounts));
}

fetchAll().catch(function(e) { console.error(e.message); process.exit(1); });

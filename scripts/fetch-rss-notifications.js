var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'data');
var notifPath = path.join(dataDir, 'notifications.json');

var RSS_URL = 'https://www.freejobalert.com/feed/';

var EXAM_KEYWORDS = {
  'ssc cgl': '/cgl/',
  'ssc chsl': null,
  'ssc mts': null,
  'ssc gd': '/ssc-gd/',
  'ssc selection post': null,
  'ssc je': null,
  'rbi grade b': '/rbi/',
  'rbi assistant': null,
  'ibps po': '/ibps-po/',
  'ibps clerk': null,
  'ibps so': null,
  'ibps rrb': null,
  'sbi clerk': '/sbi-clerk/',
  'sbi po': null,
  'upsc': '/upsc/',
  'upsc cse': '/upsc/',
  'ctet': '/ctet/',
  'uptet': null,
  'agniveer': '/agniveer/',
  'gate': '/gate/',
  'neet': '/neet/',
  'neet ug': '/neet/',
  'jee': '/jee/',
  'jee main': '/jee/',
  'rrb': null,
  'railway': null,
  'psc': null,
  'defence': null,
  'army': null,
  'navy': null,
  'air force': null,
  'police': null,
  'teaching': null,
  'professor': null,
  'iit': null,
  'iim': null,
  'aiims': null,
  'niti': null,
  'psu': null,
  'insurance': null,
  'lic': null,
  'sebi': null,
  'nabard': null,
  'sidbi': null,
};

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function matchExam(text) {
  var lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Sort keys by length (longest first) to match most specific first
  var keys = Object.keys(EXAM_KEYWORDS).sort(function(a, b) { return b.length - a.length; });
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    // Use word boundary check for short keys to avoid partial matches
    if (key.length <= 4) {
      var re = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) return { tag: key, link: EXAM_KEYWORDS[key] };
    } else {
      if (lower.indexOf(key) !== -1) return { tag: key, link: EXAM_KEYWORDS[key] };
    }
  }
  return null;
}

function extractClosing(desc) {
  // Patterns like: "last date is 11-06-2026", "closes on 01-07-2026", "deadline 15 June 2026"
  var patterns = [
    /last\s*date[:\s]*(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/i,
    /closes?\s*(?:on)?\s*(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/i,
    /deadline[:\s]*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
    /apply\s*(?:by|before)[:\s]*(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/i,
    /apply\s*(?:by|before)[:\s]*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = desc.match(patterns[i]);
    if (m) {
      if (m[3] && m[3].length === 4 && m[1] && m[2]) {
        var dd = String(parseInt(m[1])).padStart(2,'0');
        var mm = String(parseInt(m[2])).padStart(2,'0');
        if (parseInt(mm) >= 1 && parseInt(mm) <= 12) return dd + '/' + mm + '/' + m[3];
      }
      if (m[2] && isNaN(m[2])) {
        // Month name format: "15 June 2026"
        var monthIdx = MONTHS.indexOf(m[2].charAt(0).toUpperCase() + m[2].slice(1,3).toLowerCase());
        if (monthIdx >= 0) {
          var dd = String(parseInt(m[1])).padStart(2,'0');
          var mm = String(monthIdx + 1).padStart(2,'0');
          return dd + '/' + mm + '/' + m[3];
        }
      }
    }
  }
  return null;
}

function extractVacancy(desc) {
  var m = desc.match(/(\d[\d,]*)\s*(vacanc|post|open|seat)/i);
  if (m) return '~' + m[1].replace(/,/g,'') + '+ vacancies';
  return '';
}

function extractTitle(titleText) {
  return titleText.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
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
    var dateM = itemContent.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/i);
    if (titleM && descM) {
      items.push({
        title: extractTitle(titleM[1]),
        description: descM[1].replace(/<!\[CDATA\[([^\]]*)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
        link: linkM ? linkM[1] : '',
        pubDate: dateM ? dateM[1] : '',
      });
    }
  }
  return items;
}

function isExpired(closingStr) {
  if (!closingStr) return false;
  var parts = closingStr.split('/');
  if (parts.length !== 3) return false;
  var d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return d < new Date();
}

function isDuplicate(existing, tag, title) {
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].tag === tag && existing[i].title === title) return true;
  }
  return false;
}

async function run() {
  console.log('Fetching RSS feed from ' + RSS_URL + '...');
  var resp = await fetch(RSS_URL);
  if (!resp.ok) { console.log('HTTP ' + resp.status + ' - failed to fetch feed'); process.exit(1); }
  var xml = await resp.text();
  console.log('Feed fetched (' + xml.length + ' bytes)');

  var items = parseRSS(xml);
  console.log('Parsed ' + items.length + ' items from feed');

  // Load existing notifications
  var existing = [];
  if (fs.existsSync(notifPath)) {
    try { existing = JSON.parse(fs.readFileSync(notifPath, 'utf-8')); }
    catch (e) { existing = []; }
  }
  // Remove expired
  var active = [];
  for (var i = 0; i < existing.length; i++) {
    if (!isExpired(existing[i].closing)) active.push(existing[i]);
  }

  var added = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var matched = matchExam(item.title + ' ' + item.description);
    if (!matched) continue;

    var closing = extractClosing(item.description);
    if (!closing) {
      // Try title too
      closing = extractClosing(item.title);
    }
    if (!closing || isExpired(closing)) continue;

    var tag = matched.tag.split(' ').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    tag = tag.replace(/\bSsc\b/g, 'SSC').replace(/\bCgl\b/g, 'CGL').replace(/\bGd\b/g, 'GD').replace(/\bChsl\b/g, 'CHSL').replace(/\bMts\b/g, 'MTS');
    tag = tag.replace(/\bRbi\b/g, 'RBI').replace(/\bIbps\b/g, 'IBPS').replace(/\bSbi\b/g, 'SBI').replace(/\bPo\b/g, 'PO');
    tag = tag.replace(/\bNeet\b/g, 'NEET').replace(/\bUg\b/g, 'UG').replace(/\bJee\b/g, 'JEE');
    tag = tag.replace(/\bIit\b/g, 'IIT').replace(/\bIim\b/g, 'IIM').replace(/\bAiims\b/g, 'AIIMS');
    tag = tag.replace(/\bPsc\b/g, 'PSC').replace(/\bRrb\b/g, 'RRB').replace(/\bPsu\b/g, 'PSU');
    tag = tag.replace(/\bLic\b/g, 'LIC').replace(/\bSebi\b/g, 'SEBI').replace(/\bNabard\b/g, 'NABARD');
    tag = tag.replace(/\bSidbi\b/g, 'SIDBI');

    var title = item.title;
    var vacancy = extractVacancy(item.description) || extractVacancy(item.title);

    if (isDuplicate(active, tag, title)) continue;

    // Parse pubDate for startDay/Month/Year
    var now = new Date();
    var startDay = now.getDate();
    var startMonth = MONTHS[now.getMonth()];
    var startYear = now.getFullYear();
    if (item.pubDate) {
      var pd = new Date(item.pubDate);
      if (!isNaN(pd.getTime())) {
        startDay = pd.getDate();
        startMonth = MONTHS[pd.getMonth()];
        startYear = pd.getFullYear();
      }
    }

    active.push({
      tag: tag,
      title: title,
      startDay: startDay,
      startMonth: startMonth,
      startYear: startYear,
      closing: closing,
      vacancy: vacancy || '',
      source: 'freejobalert.com',
      link: matched.link,
      addedAt: new Date().toISOString().split('T')[0]
    });
    added++;
    console.log('  + ' + tag + ': ' + title + ' (closing: ' + closing + ')');
  }

  if (added === 0) {
    console.log('No new matching notifications found.');
  } else {
    console.log('Added ' + added + ' new notifications.');
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(notifPath, JSON.stringify({ notifications: active, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('Saved ' + active.length + ' active notifications to ' + notifPath);
}

run().catch(function(e) { console.error(e); process.exit(1); });

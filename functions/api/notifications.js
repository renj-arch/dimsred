var TAG_MAP = {
  'ssc cgl': 'SSC CGL', 'cgl': 'SSC CGL',
  'rbi': 'RBI Grade B',
  'ibps po': 'IBPS PO', 'ibps': 'IBPS',
  'sbi clerk': 'SBI Clerk', 'sbi': 'SBI',
  'upsc': 'UPSC',
  'ctet': 'CTET',
  'ssc gd': 'SSC GD', 'ssc': 'SSC',
  'agniveer': 'Agniveer', 'army': 'Agniveer',
  'gate': 'GATE',
  'neet': 'NEET UG',
  'jee': 'JEE Main',
  'railway': 'RRB', 'rrb': 'RRB',
  'drdo': 'DRDO', 'coal india': 'Coal India',
  'ssb': 'SSB', 'bsnl': 'BSNL',
  'oil india': 'Oil India', 'nalco': 'NALCO',
  'sail': 'SAIL', 'ncl': 'NCL',
};

var EXAM_FOLDERS = {
  'ssc cgl': '/cgl/', 'cgl': '/cgl/',
  'rbi': '/rbi/',
  'ibps po': '/ibps-po/', 'ibps': '/ibps-po/',
  'sbi clerk': '/sbi-clerk/', 'sbi': '/sbi-clerk/',
  'upsc': '/upsc/',
  'ctet': '/ctet/',
  'ssc gd': '/ssc-gd/', 'ssc': '/cgl/',
  'gate': '/gate/',
  'neet': '/neet/',
  'jee': '/jee/',
};

var MONTHS = { jan:1,feb:1,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function shorten(s, n) {
  if (!s) return s;
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.substring(0, n) + '...' : s;
}

function detectTag(text) {
  var lower = text.toLowerCase();
  for (var key in TAG_MAP) {
    if (lower.indexOf(key) !== -1) return { tag: TAG_MAP[key], link: EXAM_FOLDERS[key] || null };
  }
  return { tag: 'Government', link: null };
}

function parseDate(text) {
  var m = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
  if (m) return { d: parseInt(m[1]), m: m[2].substring(0,3), y: parseInt(m[3]) };
  m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2}),?\s*(\d{4})/i);
  if (m) return { d: parseInt(m[2]), m: m[1].substring(0,3), y: parseInt(m[3]) };
  m = text.match(/\b(\d{4})\b/);
  if (m) return { d: 1, m: 'Jan', y: parseInt(m[1]) };
  return null;
}

function extractClosing(text) {
  var m = text.match(/last\s*date[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
  if (m) return m[1]+'/'+m[2]+'/'+m[3];
  m = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) { var dd=m[1], mm=m[2], yy=m[3]; return (dd.length<2?'0':'')+dd+'/'+(mm.length<2?'0':'')+mm+'/'+yy; }
  return null;
}

function extractVacancy(text) {
  var m = text.match(/(\d[\d,]*)\s*(vacanc|post|recruit|apprentice)/i);
  if (m) return '~'+m[1].replace(/,/g,'')+'+ vacancies';
  return null;
}

export async function onRequest(context) {
  var html;
  try {
    var resp = await fetch('https://www.freejobalert.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    html = await resp.text();
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  var items = [];
  var idx = 0;
  while (true) {
    var aStart = html.indexOf('<a ', idx);
    if (aStart === -1) break;
    var hrefStart = html.indexOf('href="', aStart);
    if (hrefStart === -1 || hrefStart > aStart + 200) { idx = aStart + 3; continue; }
    hrefStart += 6;
    var hrefEnd = html.indexOf('"', hrefStart);
    if (hrefEnd === -1) { idx = aStart + 3; continue; }
    var href = html.substring(hrefStart, hrefEnd).trim();

    var closeTag = html.indexOf('</a>', aStart);
    if (closeTag === -1) { idx = aStart + 3; continue; }

    var inner = html.substring(hrefEnd + 1, closeTag);
    inner = inner.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();

    idx = closeTag + 4;

    if (!inner || inner.length < 15 || inner.length > 200) continue;
    if (!href.startsWith('http') && !href.startsWith('/')) continue;
    if (/google|facebook|twitter|youtube|instagram/i.test(href)) continue;

    items.push({ text: inner, href: href });
    if (items.length > 200) break;
  }

  var filtered = items.filter(function(item) {
    var lower = item.text.toLowerCase();
    for (var key in TAG_MAP) { if (lower.indexOf(key) !== -1) return true; }
    return /recruit|vacanc|notification|online\s*form|post|result|admit|answer\s*key|syllabus|exam/i.test(lower);
  });

  var unique = [];
  var seen = {};
  for (var i = 0; i < filtered.length; i++) {
    var key = filtered[i].text.toLowerCase().replace(/[^a-z0-9]/g,'');
    if (!seen[key]) { seen[key] = true; unique.push(filtered[i]); }
  }

  var today = new Date();
  var notifications = unique.slice(0, 25).map(function(item) {
    var exam = detectTag(item.text);
    var dateInfo = parseDate(item.text);
    var closing = extractClosing(item.text);
    var vacancy = extractVacancy(item.text);
    var title = item.text.replace(/^(Online\s*Form|Notification|Recruitment)\s*/i, '').trim();
    if (title.length > 120) title = title.substring(0, 120) + '...';
    var itemHref = item.href.startsWith('http') ? item.href : 'https://www.freejobalert.com' + item.href;

    return {
      tag: exam.tag,
      title: shorten(title, 100),
      startDay: dateInfo ? dateInfo.d : today.getDate(),
      startMonth: dateInfo ? dateInfo.m : today.toLocaleString('en',{month:'short'}),
      startYear: dateInfo ? dateInfo.y : today.getFullYear(),
      closing: closing || 'Apply soon',
      vacancy: vacancy || '',
      source: 'freejobalert.com',
      link: exam.link,
      href: itemHref,
    };
  });

  return new Response(JSON.stringify({ notifications: notifications, updatedAt: today.toISOString().split('T')[0] }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  });
}

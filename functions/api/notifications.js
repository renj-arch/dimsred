var EXAM_FOLDERS = {
  'ssc cgl': '/cgl/', 'cgl': '/cgl/',
  'rbi grade b': '/rbi/', 'rbi': '/rbi/',
  'ibps': '/ibps-po/', 'ibps po': '/ibps-po/',
  'sbi clerk': '/sbi-clerk/', 'sbi': '/sbi-clerk/',
  'upsc': '/upsc/',
  'ctet': '/ctet/',
  'ssc gd': '/ssc-gd/',
  'agniveer': '/agniveer/',
  'gate': '/gate/',
  'neet': '/neet/',
  'jee': '/jee/',
  'railway': '', 'rrb': '',
  'ssc': '/cgl/',
};

var TAG_MAP = {
  'ssc cgl': 'SSC CGL', 'cgl': 'SSC CGL',
  'rbi': 'RBI Grade B',
  'ibps': 'IBPS', 'ibps po': 'IBPS PO',
  'sbi': 'SBI', 'sbi clerk': 'SBI Clerk',
  'upsc': 'UPSC',
  'ctet': 'CTET',
  'ssc gd': 'SSC GD',
  'agniveer': 'Agniveer', 'army': 'Agniveer',
  'gate': 'GATE',
  'neet': 'NEET UG',
  'jee': 'JEE Main',
  'railway': 'RRB', 'rrb': 'RRB',
  'ssc': 'SSC',
};

var TODAY = new Date();
var TODAY_STR = TODAY.toISOString().split('T')[0];

function extractClosingDate(text) {
  var patterns = [
    /last\s*date[:\s]*(\d{1,2})\s*(?:-|\/|\.)?\s*(\d{1,2})\s*(?:-|\/|\.)?\s*(\d{4})/i,
    /(\d{1,2})\s*(?:-|\/|\.)\s*(\d{1,2})\s*(?:-|\/|\.)\s*(\d{4})/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = text.match(patterns[i]);
    if (m) {
      if (m[3] && m[3].length === 4) {
        var dd = parseInt(m[1]), mm = parseInt(m[2]), yy = parseInt(m[3]);
        return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + yy;
      }
    }
  }
  return null;
}

function extractVacancy(text) {
  var m = text.match(/(\d[\d,]*)\s*(vacanc|post|recruit)/i);
  if (m) return '~' + m[1].replace(/,/g, '') + '+ vacancies';
  m = text.match(/(\d[\d,]*)\s*apprentice/i);
  if (m) return '~' + m[1].replace(/,/g, '') + ' posts';
  return null;
}

function detectExam(text) {
  var lower = text.toLowerCase();
  for (var key in TAG_MAP) {
    if (lower.indexOf(key) !== -1) return { tag: TAG_MAP[key], link: EXAM_FOLDERS[key] || null };
  }
  return { tag: 'Government', link: null };
}

function extractMonthDayYear(text) {
  var months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  var m = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})/i);
  if (m) {
    return { day: parseInt(m[1]), month: m[2].charAt(0).toUpperCase() + m[2].slice(1,3).toLowerCase(), year: parseInt(m[3]) };
  }
  m = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2}),?\s*(\d{4})/i);
  if (m) {
    return { day: parseInt(m[2]), month: m[1].charAt(0).toUpperCase() + m[1].slice(1,3).toLowerCase(), year: parseInt(m[3]) };
  }
  return null;
}

export async function onRequest(context) {
  try {
    var resp = await fetch('https://www.freejobalert.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }
    var html = await resp.text();

    var linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    var links = [];
    var m;
    while ((m = linkRegex.exec(html)) !== null) {
      var href = m[1].trim();
      var inner = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!inner || inner.length < 15 || inner.length > 250) continue;
      if (!href.startsWith('http') && !href.startsWith('/')) continue;
      if (/google|facebook|twitter|youtube|instagram|whatsapp|telegram|addthis|share/i.test(href)) continue;
      if (/^home$|^login$|^register$|^contact|^about|privacy/i.test(inner)) continue;
      links.push({ text: inner, href: href });
    }

    var known = Object.keys(TAG_MAP);
    var filtered = links.filter(function(item) {
      var lower = item.text.toLowerCase();
      if (known.some(function(k) { return lower.indexOf(k) !== -1; })) return true;
      return /(recruit|vacanc|apply|notification|online\s*form|post|result|answer\s*key|admit|syllabus|exam\s*date|score|counselling)/i.test(lower);
    });

    var unique = [];
    var seen = {};
    for (var i = 0; i < filtered.length; i++) {
      var key = filtered[i].text.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen[key]) { seen[key] = true; unique.push(filtered[i]); }
    }

    var notifications = unique.slice(0, 30).map(function(item) {
      var exam = detectExam(item.text);
      var dateInfo = extractMonthDayYear(item.text);
      var closing = extractClosingDate(item.text);
      var vacancy = extractVacancy(item.text);
      if (!dateInfo) {
        dateInfo = { day: TODAY.getDate(), month: TODAY.toLocaleString('en',{month:'short'}), year: TODAY.getFullYear() };
      }
      return {
        tag: item.exam.tag,
        title: item.text.replace(/^(Online\s*Form|Notification|Recruitment)\s*/i, '').trim(),
        startDay: dateInfo.day,
        startMonth: dateInfo.month,
        startYear: dateInfo.year,
        closing: closing || 'Check website',
        vacancy: vacancy || 'Apply online',
        source: 'freejobalert.com',
        link: item.exam.link,
        href: item.href.startsWith('http') ? item.href : 'https://www.freejobalert.com' + item.href,
      };
    });

    return new Response(JSON.stringify({ notifications: notifications, updatedAt: TODAY_STR }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

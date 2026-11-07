#!/usr/bin/env node
/**
 * fetch-news-ca.js - free news -> Current Affairs questions.
 *
 * WHY THIS EXISTS
 * ---------------
 * The wiki miners only read Wikipedia, and English Wikipedia is often days or
 * weeks behind Indian current affairs. On 2026-10-28 the corpus could not
 * answer either of these, although both were national news in the previous
 * week:
 *
 *   - Who became the first Indian physicist to win the Oskar Klein Medal?
 *     (Ashoke Sen; the fact is a single line in his Wikipedia article and a
 *      table row on the award page, which isListPage() deliberately skips.)
 *   - Which state government launched the "Thuli" mascot for its rainwater
 *      harvesting awareness campaign?
 *     (Tamil Nadu, 21 Oct 2026; NO Wikipedia article, Wikinews article, or
 *      portal page mentions it at all.)
 *
 * Wikipedia alone structurally cannot cover that class of fact, so this miner
 * reads free news RSS - no API key, no model, no paid tier:
 *
 *   - Google News RSS search (India edition) for a spread of CA topics
 *   - The Hindu, Indian Express (news + explained), Hindustan Times, PIB
 *
 * It then turns headlines into exam-style Q/A with deterministic patterns
 * (first Indian to win X, wins X, state launches Y, appointed as Z). Nothing is
 * inferred beyond the headline: the answer is always a span of the headline,
 * and the fact keeps the headline, publisher, date and link so a wrong parse is
 * visible instead of silently becoming "knowledge".
 *
 * Output is merged into data/questions/current-affairs.json (the tracked file
 * the site serves through functions/api/quiz-json.js and the raw proxy), with
 * dedup against every question already in that file. Safe to run repeatedly:
 * IDs and dedup keys are deterministic.
 *
 * Env:
 *   NEWS_CA_OUTPUT    override output path (useful for tests)
 *   NEWS_CA_DAYS      lookback window in days (default 21)
 *   NEWS_CA_MAX_NEW   max new questions per run (default 160)
 *   NEWS_CA_DRY=1     parse and report, do not write
 *
 * Flags:
 *   --dry-run         same as NEWS_CA_DRY=1
 *   --test            run the headline patterns on sample titles, no network
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const OUT_PATH = process.env.NEWS_CA_OUTPUT ||
  path.join(__dirname, '..', 'data', 'questions', 'current-affairs.json');
const DAYS_BACK = parseInt(process.env.NEWS_CA_DAYS || '21', 10);
const MAX_NEW = parseInt(process.env.NEWS_CA_MAX_NEW || '160', 10);
const DRY = process.argv.includes('--dry-run') || process.env.NEWS_CA_DRY === '1';
const SHOW = parseInt(process.env.NEWS_CA_SHOW || '12', 10);
const TEST = process.argv.includes('--test');

const UA = 'Mozilla/5.0 (compatible; StudyProGK/2.0; +https://vlymbooq.qzz.io)';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// State names only (not UTs): the launch template asks "which state
// government", which is wrong for a UT. Longest names first so
// "Andhra Pradesh" is preferred over any shorter overlapping match.
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Himachal Pradesh', 'Madhya Pradesh',
  'Uttar Pradesh', 'Tamil Nadu', 'West Bengal', 'Chhattisgarh', 'Maharashtra',
  'Uttarakhand', 'Karnataka', 'Meghalaya', 'Rajasthan', 'Jharkhand',
  'Telangana', 'Tripura', 'Manipur', 'Mizoram', 'Nagaland', 'Sikkim',
  'Assam', 'Bihar', 'Gujarat', 'Haryana', 'Kerala', 'Odisha', 'Punjab', 'Goa',
];

// Google News RSS is the only free index that reliably has a story on day
// one. Queries are deliberately generic - hardcoding "Thuli" or "Ashoke Sen"
// would make this a lookup table, not a miner.
const GOOGLE_QUERIES = [
  'first Indian to win award',
  'first Indian physicist',
  'first Indian scientist',
  'wins award India',
  'India government launches scheme',
  'Chief Minister launches campaign',
  'state government launches scheme',
  'state government launches mascot',
  'rainwater harvesting campaign',
  'appointed Chief Secretary India',
  'sworn in as Chief Justice India',
  'ISRO mission launch',
  'RBI monetary policy India',
  'Supreme Court verdict India',
  'India defence missile test',
  'India GDP growth economy',
  'India sports medal record',
  'new scheme launched for farmers',
  'Union Cabinet approves scheme',
];

// Bing News RSS is queried separately because its <description> is a real
// snippet and its <link> wraps the publisher URL. Google News has neither, so
// both are needed: Google for day-one recall, Bing for evidence.
const BING_QUERIES = [
  'first Indian to win medal award',
  'state government launches campaign mascot',
  'Chief Minister launches scheme',
  'rainwater harvesting campaign India',
  'rainwater harvesting awareness campaign',
  'new scheme launched government India',
  'appointed Chief Secretary',
  'sworn in as Chief Justice',
  'ISRO launch mission',
  'RBI repo rate policy',
  'Supreme Court judgment India',
  'India medal record championship',
];

const DIRECT_FEEDS = [
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'Indian Express', url: 'https://indianexpress.com/section/india/feed/' },
  { name: 'Indian Express Explained', url: 'https://indianexpress.com/section/explained/feed/' },
  { name: 'Indian Express Politics', url: 'https://indianexpress.com/section/political-pulse/feed/' },
  { name: 'Indian Express World', url: 'https://indianexpress.com/section/world/feed/' },
  { name: 'Indian Express Sports', url: 'https://indianexpress.com/section/sports/feed/' },
  { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
  { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
];

const SKIP_TITLE = /\b(live updates?|as it happened|photos?|videos?|web stories?|opinion|editorial|explained|interview|podcast|newsletter|horoscope|weather|results? live|cricket score|match report)\b/i;

const ROLE_WORDS = new Set([
  'physicist', 'scientist', 'professor', 'researcher', 'academic', 'scholar',
  'player', 'team', 'coach', 'captain', 'actor', 'actress', 'singer', 'artist',
  'minister', 'government', 'govt', 'india', 'indian', 'state', 'district',
  'city', 'university', 'institute', 'institution', 'college', 'school',
  'company', 'bank', 'board', 'court', 'police', 'army', 'navy', 'party',
  'committee', 'commission', 'council', 'department', 'ministry', 'agency',
  'organisation', 'organization', 'firm', 'group', 'foundation', 'trust',
  'society', 'association', 'airlines', 'company', 'limited', 'ltd',
]);

function log(msg) { console.log('[news-ca] ' + msg); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function norm(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return m; }
    })
    .replace(/&#(\d+);/g, (m, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return m; }
    })
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&lsquo;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripHtml(s) {
  // Unwrap CDATA first: `<[^>]+>` would otherwise swallow the whole
  // "<![CDATA[ ... ]]>" block, which is how The Hindu, HT, NDTV and TOI wrap
  // every title (they all parsed as zero items before this).
  let t = String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(t).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- network --

function httpGet(url, redirects) {
  if (redirects === undefined) redirects = 0;
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const req = https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return httpGet(next, redirects + 1).then(done);
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; if (data.length > 4e6) req.destroy(); });
      res.on('end', () => done({ status: res.statusCode || 0, body: data }));
    });
    req.on('error', () => done({ status: 0, body: '' }));
    req.setTimeout(15000, () => { req.destroy(); done({ status: 0, body: '' }); });
  });
}

function parseDate(s) {
  const t = Date.parse(String(s || ''));
  return isNaN(t) ? null : new Date(t);
}

function tagText(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  return m ? m[1] : '';
}

function atomLink(block) {
  const m = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1] : '';
}

// Bing News wraps every result in apiclick.aspx?url=<encoded publisher URL>.
// Decoding it gives the real article link, which makes the stored `fact`
// point at the publisher (not an aggregator) and lets og:description
// enrichment work at all - news.google.com article links are JS shells now.
function unwrapBingUrl(link) {
  if (!/bing\.com\/news\/apiclick/i.test(link)) return link;
  try {
    const u = new URL(link);
    const real = u.searchParams.get('url');
    return real && /^https?:\/\//i.test(real) ? real : link;
  } catch (e) {
    return link;
  }
}

function parseFeed(xml, feedName) {
  const out = [];
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[2];
    let title = stripHtml(tagText(b, 'title'));
    let link = stripHtml(tagText(b, 'link')) || atomLink(b);
    const pub = stripHtml(tagText(b, 'pubDate') || tagText(b, 'published') || tagText(b, 'updated'));
    const desc = stripHtml(tagText(b, 'description') || tagText(b, 'summary'));
    let source = stripHtml(tagText(b, 'source')) || stripHtml(tagText(b, 'News:Source')) || feedName;
    if (!title || !link) continue;

    // Google News appends " - Publisher" to every headline and repeats the
    // publisher in <source>. Split it off so dedup sees the real title.
    if (/news\.google\./i.test(link)) {
      const dash = title.match(/\s+-\s*([^\-]{2,45})$/);
      if (dash) {
        if (!source || source === 'Google News') source = dash[1].trim();
        title = title.slice(0, dash.index).trim();
      }
    }

    link = unwrapBingUrl(link);
    // Bing's <News:Source> is often "Press Trust of India on MSN".
    source = source.replace(/\s+on\s+(MSN|Bing)$/i, '').trim() || feedName;

    const when = parseDate(pub) || new Date();
    out.push({ title, link, when, source, desc, feed: feedName });
  }
  return out;
}

// Optional article enrichment: og:description often carries the sentence the
// headline compresses ("...unveiling the logo and mascot 'Thuli'"). Only used
// for launch candidates, capped, and never allowed to fail the run.
async function fetchMetaDescription(link) {
  const res = await httpGet(link);
  if (res.status !== 200 || !res.body) return '';
  const html = res.body;
  const pats = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of pats) {
    const m = html.match(p);
    if (m && m[1]) return stripHtml(m[1]).slice(0, 400);
  }
  return '';
}

// ---------------------------------------------------------------- patterns --

function wordKey(w) {
  return String(w || '').toLowerCase().replace(/[.'\u2019\u201c\u201d\-]+/g, '').trim();
}

const LEAD_ROLE_WORDS = new Set([
  'professor', 'prof', 'dr', 'mr', 'mrs', 'ms', 'shri', 'sri', 'smt',
  'indian', 'physicist', 'scientist', 'renowned', 'noted', 'eminent',
  'veteran', 'padma', 'bhushan', 'vibhushan', 'awardwinning', 'jailed',
  'activist', 'slain', 'former', 'senior', 'young', 'ace',
]);
// Only person roles are stripped from the end of an answer. Organisation
// words ("Police", "College", "Bank") are part of the name: stripping them
// turned "Bengaluru Traffic Police" into "Bengaluru Traffic" and truncated
// "BPS Government Medical College".
const PERSON_ROLE_WORDS = new Set([
  'physicist', 'scientist', 'professor', 'researcher', 'academic', 'scholar',
  'player', 'coach', 'captain', 'actor', 'actress', 'singer', 'artist',
  'minister', 'officer', 'doctor', 'engineer',
]);
const NAME_STOPWORDS = new Set([
  'first', 'to', 'the', 'of', 'for', 'and', 'in', 'on', 'at', 'with', 'by',
  'as', 'is', 'was', 'who', 'india', 'indian', 'new', 'this', 'that',
]);

function nameAtEnd(s) {
  const m = String(s || '').match(/([A-Z][A-Za-z.'\u2019\-]+(?:\s+[A-Z][A-Za-z.'\u2019\-]+){1,5})\s*$/);
  if (!m) return null;
  const words = m[1].split(/\s+/);

  // Drop trailing person roles ("... Ashoke Sen Physicist") and leading
  // honorifics / nationality / roles ("Professor", "Indian Physicist", "Dr").
  // Without this the answer was "Professor Ashoke Sen" or "Indian Physicist
  // Ashoke Sen", which reads as a different entity from the clean name on
  // other outlets.
  while (words.length > 1 && PERSON_ROLE_WORDS.has(wordKey(words[words.length - 1]))) words.pop();
  while (words.length > 2 && LEAD_ROLE_WORDS.has(wordKey(words[0]))) words.shift();

  if (words.length < 2 || words.length > 6) return null;
  // Function words never belong in a person/team name. This rejected
  // "First Indian To" (from "X First Indian To Win ...") and "Indian Physicist".
  for (const w of words) {
    if (NAME_STOPWORDS.has(wordKey(w))) return null;
  }
  const name = words.join(' ').trim();
  if (name.length < 4 || name.length > 60) return null;
  if (/^(The|This|That|These|Those|Which|What|Who|How|Why)\b/.test(name)) return null;
  return name;
}

function cleanAward(s) {
  let a = String(s || '').replace(/\s+/g, ' ').trim();
  a = a.replace(/^[\s'"\u2018\u2019\u201c\u201d\-:|]+|[\s'"\u2018\u2019\u201c\u201d\-:|]+$/g, '');
  a = a.replace(/^the\s+/i, '');
  // "Oskar Klein Medal 2026: First Indian Physicist to Receive the Honour"
  // and "Nobel Prize for work on X" describe the award, then keep talking.
  a = a.split(/\s*:\s*/)[0];
  a = a.split(/\s*[,;]\s*/)[0];
  // "Nobel Prize in Chemistry for solving 'mirror image' mystery" -> the
  // award ends before the explanatory clause. Short tails ("for Excellence")
  // are part of the name and survive.
  a = a.replace(/\s+for\s+\S[\s\S]{15,}$/i, '');
  a = a.replace(/\s+for\s+(?:his|her|their|the|work|pioneering|discovery|research|contributions?|outstanding)\b[\s\S]*$/i, '');
  a = a.replace(/\s*[-\u2013\u2014|]\s*[^-\u2013\u2014|]{2,32}$/, '').trim();
  // "prestigious Oskar Klein Medal 2026", "Oskar Klein Medal" and
  // "Oskar Klein Medal, one of the top prizes..." are the same award; fold
  // them so three outlets do not add three near-duplicate questions.
  a = a.replace(/^(?:the\s+)?prestigious\s+/i, '');
  a = a.replace(/\s+(?:19|20)\d{2}$/, '').trim();
  if (a.length < 3 || a.length > 85) return null;
  if (!/[A-Za-z]/.test(a)) return null;
  if (/\b(photos?|videos?|live|today|tomorrow|yesterday)\b/i.test(a)) return null;
  return a;
}

function findState(text) {
  for (const st of STATES) {
    if (new RegExp('\\b' + escRe(st) + '\\b').test(text)) return st;
  }
  return null;
}

function qa(question, answer, type) {
  return {
    question: String(question).replace(/\s+/g, ' ').trim(),
    answer: String(answer).replace(/\s+/g, ' ').trim(),
    type: type || 'qa',
  };
}

function tagAll(list, sig) {
  for (const q of list) q.sig = sig;
  return list;
}

function personKey(name) {
  return norm(name).replace(/[^a-z ]+/g, ' ')
    .split(' ').filter(Boolean)
    .filter(w => !ROLE_WORDS.has(w) && !LEAD_ROLE_WORDS.has(w))
    .join(' ');
}

// Generic words carry no identity: "Physics Oskar Klein Medal", "2026 Oskar
// Klein Medal" and "Oskar Klein Medal" are one award, not three questions.
const AWARD_NOISE = new Set([
  'the', 'a', 'an', 'for', 'of', 'in', 'on', 'at', 'to', 'and', 'prestigious',
  'physics', 'honour', 'honor', 'award', 'medal', 'prize', 'first', 'indian',
  'work', 'his', 'her', 'their', 'research', 'pioneering', 'contributions',
  'contribution', 'outstanding', 'discovery', 'state', 'today', 'government',
  'govt',
]);

function awardKey(award) {
  return norm(award)
    .replace(/\bkeralam\b/g, 'kerala')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ').filter(Boolean)
    .filter(w => w.length > 1)
    .filter(w => !AWARD_NOISE.has(w) && !/^(19|20)\d{2}$/.test(w))
    .join(' ');
}

// Tokens too generic to identify an award on their own.
const VAGUE_AWARD_TOKENS = new Set([
  'centre', 'central', 'international', 'national', 'state', 'global',
  'special', 'top', 'annual', 'prestigious', 'best', 'first', 'india',
  'indian', 'world', 'grand', 'major',
]);

const FIRST_INDIAN = /^(.{2,90}?)\s+(?:becomes?|became|is|named|wins?|won|receives?|received|gets?|got)\s+(?:the\s+)?first\s+Indian(?:\s+([a-z][a-z\-]{2,24}))?\s+to\s+(?:win|receive|get|be\s+awarded|bag|clinch|achieve)\s+(?:the\s+)?(.{3,95})$/i;
const WINS_RE = /^(.{2,90}?)\s+(?:wins?|won|receives?|received|bags?|bagged|gets?|got|awarded|clinches?|clinched|secures?|secured)\s+(?:the\s+)?(.{3,100})$/i;
const AWARD_WORD = /\b(medal|award|prize|honour|honor|fellowship|trophy|puraskar|ratna|samman|cup|title)\b/i;
const LAUNCH_RE = /\b(launch(?:es|ed|ing)?|unveil(?:s|ed)?|inaugurat(?:es|ed)|flags?\s+off|rolls?\s+out)\b\s+(?:the\s+|a\s+|an\s+)?(.{2,140})$/i;
const APPOINT_RE = /^(.{2,90}?)\s+(?:sworn\s+in\s+as|takes?\s+oath\s+as|appointed\s+as|named\s+as|elected\s+as)\s+(.{3,90})$/i;
const FUTURE_LAUNCH = /\bto\s+(launch|unveil|inaugurate|roll\s+out)\b/i;

function parseLaunched(raw) {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+[-\u2013\u2014|]\s+[^-\u2013\u2014|]{2,32}$/, '').trim();

  let name = null;
  let rest = '';

  // Prefer a quoted name wherever it appears: "new scheme 'X'" and
  // "'Thuli', the rainwater harvesting campaign" both name the thing that was
  // launched, and the quotes are the most reliable delimiter.
  const quoted = s.match(/['"\u2018\u2019\u201c\u201d]([^'"\u2018\u2019\u201c\u201d]{1,60})['"\u2018\u2019\u201c\u201d]/);
  if (quoted) {
    name = quoted[1].trim();
    rest = s.slice(quoted.index + quoted[0].length).replace(/^[\s,\u2013\u2014\-:]+/, '').trim();
  }
  if (!name) {
    s = s.replace(/^(?:(?:the|a|an|new|flagship|statewide|state-wide|its)\s+)+/i, '');
    let m = s.match(/^([A-Z][\w.'\u2019\-]+(?:\s+[A-Z][\w.'\u2019\-]+){0,5})/);
    if (m) {
      name = m[1].trim();
      rest = s.slice(m[1].length).replace(/^[\s,\u2013\u2014\-]+/, '').trim();
    } else {
      name = s;
      rest = '';
    }
  }
  // "Milk Subsidy Scheme To Boost Dairy Sector" -> "Milk Subsidy Scheme".
  name = name.replace(/\s+to\s+\w+.*$/i, '').trim();
  rest = rest.replace(/^(?:the|a|an)\s+/i, '').split(/\s*[,;]\s*/)[0].trim();
  // A quoted campaign name is often followed by the next clause ("'Month-Long
  // Drug-Free Bihar Campaign' Orders Crackdown On Narcotics"). The verb is not
  // part of the name.
  rest = rest.replace(/^(?:orders?|crackdown|launch(?:es|ed)?|begins?|ends?|wins?|says?|calls?|asks?|directs?|announces?)\b[\s\S]*$/i, '').trim();
  // "... schemes to boost inclusive" - the purpose clause is not the name.
  rest = rest.replace(/\s+to\s+\w+.*$/i, '').replace(/\s+(?:to|for|of|with|and|in|on|at|by|from)$/i, '').trim();
  if (rest.length > 90) rest = rest.slice(0, 90).replace(/\s+\S*$/, '').trim();
  name = name.replace(/[.\s]+$/, '').trim();
  if (!name || name.length < 2 || name.length > 45) return null;
  if (name.split(/\s+/).length > 6) return null;
  if (/\b(orders?|crackdown|launch(?:es|ed)?|says?|calls?|wins?|begins?|ends?)\b/i.test(name)) return null;
  // Only proper names make a precise "which state launched X" question.
  // Lowercase descriptors ("month-long campaign against drug abuse") and
  // fragments such as "by Mann government" are headline glue, not the name of
  // the thing that was launched.
  if (!/^[A-Z0-9\u2018\u2019\u201c\u201d']/.test(name)) return null;
  if (/^(by|of|for|to|in|on|with|and|or|as|at|from|after|before|over|under|the|a|an)\b/i.test(name)) return null;
  return { name, rest };
}

// True only when a source sentence mentions a mascot within ~140 characters of
// the launched name ("...unveiling a dedicated logo and a mascot named 'Thuli'",
// "Tamil Nadu launches Thuli rainwater harvesting campaign with mascot").
// Without the window, any article that happens to use the word mascot anywhere
// would justify a mascot question about an unrelated scheme.
function mascotEvidence(blob, name) {
  const text = String(blob || '');
  if (!/\bmascot\b/i.test(text)) return false;
  const re = /mascot/gi;
  let m;
  while ((m = re.exec(text))) {
    const from = Math.max(0, m.index - 140);
    const window = text.slice(from, m.index + 140);
    if (window.toLowerCase().includes(name.toLowerCase())) return true;
  }
  return false;
}

function launchQuestions(title, evidence) {
  const state = findState(title);
  if (!state) return [];
  if (FUTURE_LAUNCH.test(title)) return [];
  const m = title.match(LAUNCH_RE);
  if (!m) return [];
  const parsed = parseLaunched(m[2]);
  if (!parsed) return [];

  const { name, rest } = parsed;
  const thing = rest ? `'${name}' ${rest}` : `'${name}'`;
  const out = [
    qa(`Which state government launched the ${thing}?`, state),
    qa(`The _____ government launched the ${thing}.`, state, 'fill_blank'),
  ];

  // Only call it a mascot when a source says so. This is what makes
  // "Which state government launched the 'Thuli' mascot ...?" evidence-based
  // instead of a guess from a one-word campaign name. The evidence usually
  // comes from a *different* outlet's snippet than the headline that named the
  // campaign, so the caller merges every snippet it saw for this launch.
  if (name.split(/\s+/).length <= 2 && rest && mascotEvidence(evidence, name)) {
    out.push(qa(`Which state government launched the '${name}' mascot for its ${rest}?`, state));
  }
  return tagAll(out, 'launch|' + state + '|' + norm(name));
}

function appointmentQuestions(title) {
  const m = title.match(APPOINT_RE);
  if (!m) return [];
  const person = nameAtEnd(m[1]);
  let position = m[2].replace(/\s+/g, ' ').replace(/[,;].*$/, '').trim();
  if (!person || position.length < 4 || position.length > 80) return [];
  if (/^(the|a|an)\s/i.test(position)) position = position.replace(/^(the|a|an)\s+/i, '');
  position = position.replace(/^(?:India['\u2019]s|the country['\u2019]s)\s+/i, '').trim();
  position = position.replace(/\s+(?:today|yesterday|now)$/i, '').trim();
  if (/\b(team|squad|committee|panel|board|commission)\b/i.test(position)) return [];
  // Headline abbreviations ("the T HC judge") are not a post anyone can name.
  if (/\b[A-Z]\b/.test(position) || /\b[A-Z]{2,}\b/.test(position)) return [];
  if (position.split(/\s+/).length < 2) return [];
  const verb = /sworn|oath/i.test(title) ? 'sworn in as' : 'appointed as';
  return tagAll([qa(`Who was ${verb} the ${position}?`, person)],
    'appoint|' + personKey(person) + '|' + awardKey(position));
}

function firstIndianQuestions(title) {
  const m = title.match(FIRST_INDIAN);
  if (!m) return [];
  // "first Indian college/state/company to win X" needs a different question
  // ("Which Indian college ...?"), and the person answer extractor cannot
  // express it. Keep this template to people.
  if (m[2] && !/^(physicist|scientist|woman|man|person|athlete|player|singer|actor|actress|doctor|engineer|mathematician|economist|writer|author|journalist|officer|mountaineer|chess|shooter|boxer|wrestler|swimmer|runner|archer|weightlifter)$/i.test(m[2])) {
    return [];
  }
  const person = nameAtEnd(m[1]);
  const award = cleanAward(m[3]);
  if (!person || !award) return [];
  const desc = m[2] ? ' ' + m[2].toLowerCase() : '';
  const out = [
    qa(`Who became the first Indian${desc} to win the ${award}?`, person),
    qa(`_____ became the first Indian${desc} to win the ${award}.`, person, 'fill_blank'),
  ];
  return tagAll(out, 'award|' + personKey(person) + '|' + awardKey(award));
}

function winsQuestions(title) {
  const m = title.match(WINS_RE);
  if (!m) return [];
  const award = cleanAward(m[2]);
  if (!award || !AWARD_WORD.test(award)) return [];
  // "Who won the Award For Passenger Satisfaction?" has no answerable proper
  // noun in it. Require the award to be named, not just the word "Award".
  if (/^(award|prize|medal|honour|honor|fellowship|trophy|title|cup)\b/i.test(award)) return [];
  const person = nameAtEnd(m[1]);
  if (!person) return [];
  // "India wins 5 wickets" style noise: the award span must be capitalised.
  if (!/^[A-Z]/.test(award)) return [];
  // Vague modifiers are not award names: "Who won the Centre's award?" and
  // "Who won the International Award?" have no answerable anchor. A single
  // distinctive token is fine ("Nobel Prize" -> nobel), a single vague one is not.
  const sig = awardKey(award).split(' ').filter(Boolean);
  if (!sig.length || (sig.length === 1 && VAGUE_AWARD_TOKENS.has(sig[0]))) return [];
  return tagAll([qa(`Who won the ${award}?`, person)],
    'award|' + personKey(person) + '|' + awardKey(award));
}

const MAJOR_SOURCE = /^(the hindu|indian express|the indian express|ndtv|hindustan times|times of india|the times of india|deccan herald|telegraph india|business today|theprint|the print|the wire|news on air|pib|all india radio)\b/i;

function sourceScore(src) {
  return MAJOR_SOURCE.test(String(src || '').trim()) ? 2 : 0;
}

function baseScore(q) {
  let s = 5;
  if (/^Who became the first Indian/.test(q.question)) s += 5;
  if (/first Indian (physicist|scientist|woman|man|person|athlete|player)\b/i.test(q.question)) s += 2;
  if (/^Which state government launched/.test(q.question)) s += 5;
  if (/\bmascot\b/.test(q.question)) s += 3;
  if (q.type === 'fill_blank') s -= 1; // prefer the direct question
  return s;
}

// Order matters: a launch headline can also match the wins template, and the
// more specific reading is the useful one.
function questionsFor(item) {
  const title = item.title;
  const evidence = [item.metaDesc, item.evidence].filter(Boolean).join(' ');
  let qs = firstIndianQuestions(title);
  if (!qs.length) qs = launchQuestions(title, evidence);
  if (!qs.length) qs = appointmentQuestions(title);
  if (!qs.length) qs = winsQuestions(title);
  for (const q of qs) q.score = baseScore(q) + sourceScore(item.source);
  return qs;
}

// --------------------------------------------------------------- assembly --

function normKey(q) {
  return norm(q.question) + '||' + norm(q.answer);
}

function loadExisting() {
  const seen = new Set();
  const seenSigs = new Set();
  let doc = { 'Current Affairs': { subSubjects: {} } };
  if (fs.existsSync(OUT_PATH)) {
    try {
      const raw = fs.readFileSync(OUT_PATH, 'utf8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') doc = parsed;
    } catch (e) {
      throw new Error('cannot parse ' + OUT_PATH + ': ' + e.message);
    }
  }
  for (const cat of Object.keys(doc)) {
    const subs = (doc[cat] && doc[cat].subSubjects) || {};
    for (const ss of Object.keys(subs)) {
      for (const q of subs[ss] || []) {
        if (!q || !q.question) continue;
        seen.add(normKey(q));
        if (q.newsSig) seenSigs.add(q.newsSig);
      }
    }
  }
  return { doc, seen, seenSigs };
}

function buildFact(item) {
  const d = item.when;
  const day = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
  let fact = item.title.replace(/\s+/g, ' ').trim();
  if (item.metaDesc) fact += '. ' + item.metaDesc.replace(/\s+/g, ' ').trim();
  fact += ' (Source: ' + item.source + ', ' + day + '. ' + item.link + ')';
  if (fact.length > 700) fact = fact.slice(0, 697) + '...';
  return fact;
}

function makeQuestion(c, item) {
  const d = item.when;
  const monthLabel = MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  const id = 'news_' + crypto.createHash('sha1')
    .update(normKey(c)).digest('hex').slice(0, 10);
  return {
    id,
    type: c.type,
    category: 'Current Affairs',
    region: '',
    source: item.source || 'News',
    pubDate: d.toISOString(),
    subject: 'Current Affairs',
    subSubject: monthLabel,
    emoji: '',
    question: c.question,
    answer: c.answer,
    hint: '',
    fact: buildFact(item),
    newsSig: c.sig,
  };
}

function titleKey(t) {
  return norm(t).replace(/[^a-z0-9 ]+/g, '').slice(0, 90);
}

async function main() {
  if (TEST) {
    const samples = [
      ['String theory pioneer Ashoke Sen becomes first Indian to receive Oskar Klein Medal', ''],
      ['Ashoke Sen becomes first Indian physicist to win prestigious Oskar Klein Medal 2026', ''],
      ['Bengaluru physicist Ashoke Sen becomes first Indian to win Oskar Klein Medal', ''],
      ['Tamil Nadu CM Vijay launches \u2018Thuli\u2019, the rainwater harvesting campaign', ''],
      ['Tamil Nadu government launches \u2018Thuli\u2019 rainwater harvesting campaign', ''],
      ['Odisha government launches new scheme \u2018Aame Padhiba Aama Bhasare\u2019', ''],
      ['Justice A B C sworn in as Chief Justice of India', ''],
      ['Indian physicist wins Oskar Klein medal, one of the top prizes in physics', ''],
    ];
    // Same story, two outlets: the headline names the campaign, the other
    // outlet's snippet says it is a mascot. The mascot question must come from
    // that merged evidence, not from the word appearing anywhere.
    const mascotSnippet = 'Chennai, Oct 21 (PTI) Tamil Nadu Chief Minister C Joseph Vijay on ' +
      'Wednesday launched a state-wide awareness campaign to promote rainwater harvesting, ' +
      'unveiling a dedicated logo and a mascot named \u2018Thuli\u2019.';
    for (const [t, extra] of samples) {
      const item = { title: t, evidence: extra };
      if (/Thuli/.test(t)) item.evidence = t + ' . ' + mascotSnippet;
      const qs = questionsFor(item);
      console.log('\n' + t);
      for (const q of qs) console.log('  [' + q.type + '] ' + q.question + ' => ' + q.answer);
      if (!qs.length) console.log('  (no question)');
    }
    // Negative control: a mascot mention far away from the name must not
    // produce a mascot question.
    const noise = 'Kerala government launches \u2018Haritha\u2019 cleanliness drive. ' + 'x'.repeat(400) +
      ' The mascot for the unrelated national games was unveiled.';
    const nq = questionsFor({ title: 'Kerala government launches \u2018Haritha\u2019 cleanliness drive', evidence: noise });
    console.log('\n[negative control] questions=' + nq.length +
      ' mascot=' + nq.some(q => /mascot/.test(q.question)));
    return;
  }

  const cutoff = Date.now() - DAYS_BACK * 86400000;
  const items = [];
  const seenTitles = new Set();
  let feedErrors = 0;

  function take(fresh, label) {
    let kept = 0;
    for (const it of fresh) {
      if (it.when.getTime() < cutoff) continue;
      const k = titleKey(it.title);
      if (!k || seenTitles.has(k)) continue;
      seenTitles.add(k);
      items.push(it);
      kept++;
    }
    log(label + ': ' + fresh.length + ' items, ' + kept + ' new');
    return kept;
  }

  for (const q of GOOGLE_QUERIES) {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) +
      '&hl=en-IN&gl=IN&ceid=IN:en';
    const res = await httpGet(url);
    if (res.status !== 200) {
      feedErrors++;
      log('google query failed (' + res.status + '): ' + q);
      continue;
    }
    take(parseFeed(res.body, 'Google News'), 'google "' + q + '"');
    await sleep(300);
  }

  // Bing News RSS: unlike Google it keeps a real snippet in <description> and
  // hands back the publisher URL. Two things depend on that:
  //   - snippet evidence ("... unveiling a dedicated logo and a mascot named
  //     'Thuli'") is how a mascot question is justified from a source, and
  //   - a resolver-free <link> means the stored fact points at the article.
  for (const q of BING_QUERIES) {
    const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) +
      '&format=RSS&setlang=en-IN&cc=IN';
    const res = await httpGet(url);
    if (res.status !== 200) {
      feedErrors++;
      log('bing query failed (' + res.status + '): ' + q);
      continue;
    }
    take(parseFeed(res.body, 'Bing News'), 'bing "' + q + '"');
    await sleep(300);
  }

  for (const f of DIRECT_FEEDS) {
    const res = await httpGet(f.url);
    if (res.status !== 200) {
      feedErrors++;
      log(f.name + ' feed failed (' + res.status + ')');
      continue;
    }
    take(parseFeed(res.body, f.name), f.name);
    await sleep(200);
  }

  const filtered = items.filter(it =>
    it.title.length >= 25 &&
    it.title.length <= 220 &&
    !SKIP_TITLE.test(it.title) &&
    !/\?$/.test(it.title));

  // Merge every snippet seen for the same launch, keyed by state + name, so a
  // mascot detail published by one outlet can qualify a question written from
  // another outlet's headline. Cheap (no requests) and keeps the evidence
  // attached to the story rather than to one article.
  //
  // The key has to come from headlines (that is where the launched name is
  // reliably cased and delimited), but the *evidence* comes from any item whose
  // title or snippet names that launch - the PTI copy that says "mascot named
  // 'Thuli'" never has a usable headline of its own (it reads "TN CM Vijay
  // launches state-wide rainwater harvesting awareness campaign", no state).
  const launchGroups = new Map();
  for (const it of filtered) {
    const state = findState(it.title);
    if (!state) continue;
    const lm = it.title.match(LAUNCH_RE);
    if (!lm) continue;
    const lp = parseLaunched(lm[2]);
    if (!lp) continue;
    const key = state + '|' + norm(lp.name);
    if (!launchGroups.has(key)) {
      launchGroups.set(key, { state, name: lp.name, texts: [] });
    }
  }

  if (launchGroups.size) {
    for (const it of filtered) {
      const text = it.title + ' . ' + (it.desc || '');
      const low = text.toLowerCase();
      for (const g of launchGroups.values()) {
        if (g.texts.length >= 6) continue;
        if (g.texts.join(' ').length > 2000) continue;
        if (!low.includes(g.name.toLowerCase())) continue;
        g.texts.push(text.slice(0, 500));
      }
    }
  }
  for (const it of filtered) {
    const state = findState(it.title);
    if (!state) continue;
    const lm = it.title.match(LAUNCH_RE);
    if (!lm) continue;
    const lp = parseLaunched(lm[2]);
    if (!lp) continue;
    const g = launchGroups.get(state + '|' + norm(lp.name));
    if (g && g.texts.length) it.evidence = g.texts.join(' . ').slice(0, 2600);
  }

  const { doc, seen, seenSigs } = loadExisting();
  const rootKey = Object.keys(doc)[0] || 'Current Affairs';
  if (!doc[rootKey]) doc[rootKey] = { subSubjects: {} };
  if (!doc[rootKey].subSubjects) doc[rootKey].subSubjects = {};

  // One story, many outlets: TheWire, NDTV, Telegraph, Jagran etc. all rewrote
  // the same Oskar Klein win in one day. Group by a signature (person + award,
  // state + launched name, person + post) and keep the best-worded variant of
  // each, plus one fill-in-the-blank. MAX_NEW then bounds a run, not a story.
  const bySig = new Map();
  const order = [];
  let parsedItems = 0;

  for (const item of filtered) {
    let qs = questionsFor(item);
    if (!qs.length) continue;

    // Article enrichment only for launch items that still have no snippet
    // evidence (Google links are JS shells, so this only helps on a real
    // publisher URL). One request at most, never fatal.
    const isLaunch = qs.some(q => /^Which state government launched/.test(q.question));
    if (isLaunch && !item.evidence && !/news\.google\./i.test(item.link)) {
      try {
        item.metaDesc = await fetchMetaDescription(item.link);
      } catch (e) {
        item.metaDesc = '';
      }
      if (item.metaDesc) qs = questionsFor(item);
    }

    let usable = 0;
    for (const q of qs) {
      if (!q.question || !q.answer || !q.sig) continue;
      if (q.question.length < 25 || q.question.length > 240) continue;
      if (seenSigs.has(q.sig)) continue;
      q.item = item;
      const kind = q.type === 'fill_blank' ? 'blank' : 'qa';
      let slot = bySig.get(q.sig);
      if (!slot) {
        slot = { qa: null, blank: null };
        bySig.set(q.sig, slot);
        order.push(q.sig);
      }
      if (!slot[kind] || q.score > slot[kind].score) slot[kind] = q;
      usable++;
    }
    if (usable) parsedItems++;
  }

  const added = [];
  const launchNames = new Map(); // state -> [normalized name]

  function duplicateLaunch(sig) {
    const parts = String(sig || '').split('|');
    if (parts[0] !== 'launch') return false;
    const state = parts[1] || '';
    const name = parts[2] || '';
    const list = launchNames.get(state) || [];
    for (const n of list) {
      if (n === name || n.startsWith(name + ' ') || name.startsWith(n + ' ')) return true;
    }
    list.push(name);
    launchNames.set(state, list);
    return false;
  }

  for (const sig of order) {
    if (added.length >= MAX_NEW) break;
    if (duplicateLaunch(sig)) continue;
    const slot = bySig.get(sig);
    for (const c of [slot.qa, slot.blank]) {
      if (!c || added.length >= MAX_NEW) continue;
      const key = normKey(c);
      if (seen.has(key)) continue;
      seen.add(key);
      seenSigs.add(sig);
      const q = makeQuestion(c, c.item);
      const ss = q.subSubject;
      if (!doc[rootKey].subSubjects[ss]) doc[rootKey].subSubjects[ss] = [];
      doc[rootKey].subSubjects[ss].push(q);
      added.push(q);
    }
  }

  log('feeds: ' + (GOOGLE_QUERIES.length + DIRECT_FEEDS.length) + ' (' + feedErrors + ' errors)');
  log('items: ' + items.length + ', usable: ' + filtered.length + ', parsed: ' + parsedItems);
  log('new questions: ' + added.length + (DRY ? ' (dry run, not written)' : ''));

  if (added.length) {
    for (const q of added.slice(0, SHOW)) {
      log('  + ' + q.question + '  =>  ' + q.answer + '  [' + q.source + ']');
    }
    if (added.length > SHOW) log('  ... ' + (added.length - SHOW) + ' more');
  }

  if (!DRY && added.length) {
    const tmp = OUT_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(doc), 'utf8');
    fs.renameSync(tmp, OUT_PATH);
    log('wrote ' + OUT_PATH);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[news-ca] fatal: ' + e.stack);
    process.exit(1);
  });
}

module.exports = { parseFeed, httpGet, questionsFor, parseLaunched, cleanAward, nameAtEnd };

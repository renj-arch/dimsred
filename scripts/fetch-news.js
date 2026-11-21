'use strict';
// vlymbooq news wire — deterministic RSS/Atom aggregation.
//
// Rules:
//   * carry only a publisher's own title, link, source and timestamp
//   * every item must pass title + link + source + recent date + allowlisted host
//   * never invent a headline, summary or virality claim
//   * merge with the previous snapshot so a flaky feed cannot blank a section
//   * if every feed fails, leave the old file untouched and exit non-zero
//
// Run: node scripts/fetch-news.js

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Parser = require('rss-parser');
var V = require('./lib/feed-validate');

var ROOT = path.resolve(__dirname, '..');
var SOURCES_FILE = path.join(ROOT, 'data', 'news-sources.json');
var OUT_FILE = path.join(ROOT, 'data', 'news.json');

var TIMEOUT_MS = 20000;
var RETRIES = 2;
var CONCURRENCY = 8;
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

var parser = new Parser({
  timeout: TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
    'Accept-Language': 'en-IN,en;q=0.9'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }]
    ]
  }
});

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function fetchText(url, attempt) {
  attempt = attempt || 1;
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  try {
    var resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-IN,en;q=0.9'
      }
    });
    if ((resp.status === 429 || resp.status >= 500) && attempt <= RETRIES) {
      clearTimeout(timer);
      await sleep(1500 * attempt);
      return fetchText(url, attempt + 1);
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

async function parseFeed(feed) {
  var text = await fetchText(feed.url);
  if (!text || text.length < 80) throw new Error('empty feed body');
  var parsed = await parser.parseString(text);
  return { feed: feed, items: Array.isArray(parsed.items) ? parsed.items : [] };
}

function mapLimit(list, limit, worker) {
  var results = new Array(list.length);
  var next = 0;
  async function run() {
    while (true) {
      var i = next++;
      if (i >= list.length) return;
      try { results[i] = { ok: true, value: await worker(list[i], i) }; }
      catch (e) { results[i] = { ok: false, error: e, input: list[i] }; }
    }
  }
  var runners = [];
  for (var i = 0; i < Math.min(limit, list.length); i++) runners.push(run());
  return Promise.all(runners).then(function () { return results; });
}

function publisherFromTitle(title) {
  var m = String(title || '').match(/\s+[-–—]\s+([^-–—]{2,60})$/);
  return m ? V.stripHtml(m[1]).trim() : '';
}

function deriveSource(item, feed) {
  var raw = item.source;
  if (raw && typeof raw === 'object') raw = raw.name || raw.title || raw._ || raw['#text'] || '';
  var source = V.stripHtml(raw).trim();
  if (!source) source = publisherFromTitle(item.title);
  if (!source) source = feed.source;
  return source || 'Publisher';
}

function summaryOf(item) {
  var raw = item.contentSnippet || item.summary || item.description || item.content || '';
  var text = V.stripHtml(raw);
  if (text.length > 280) text = text.slice(0, 277).replace(/\s+\S*$/, '') + '…';
  return text;
}

function cleanImageUrl(value) {
  if (typeof value !== 'string') return '';
  var url = value.trim();
  // Only publisher-supplied https images; never a data: URI or a tracker.
  if (!/^https:\/\//i.test(url)) return '';
  if (/\.(svg|gif)(\?|#|$)/i.test(url)) return '';
  return url;
}

// Images are used only when the feed itself publishes them (enclosure,
// media:content/thumbnail, or the first inline <img>). We never scrape the
// article page, so the publisher keeps control of its own photography.
function imageOf(raw) {
  var candidates = [];
  var media = [].concat(raw.mediaContent || [], raw.mediaThumbnail || []);
  media.forEach(function (entry) {
    if (!entry) return;
    var attrs = entry.$ || entry;
    if (attrs && typeof attrs.url === 'string') {
      var width = parseInt(attrs.width, 10);
      candidates.push({ url: attrs.url, width: isFinite(width) ? width : 0, kind: 'media' });
    }
  });
  if (raw.enclosure && raw.enclosure.url) {
    var type = String(raw.enclosure.type || '');
    if (!type || /^image\//i.test(type)) candidates.push({ url: raw.enclosure.url, width: 0, kind: 'enclosure' });
  }
  var html = raw['content:encoded'] || raw.content || '';
  var match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) candidates.push({ url: match[1], width: 0, kind: 'inline' });

  candidates.sort(function (a, b) { return b.width - a.width; });
  for (var i = 0; i < candidates.length; i++) {
    var url = cleanImageUrl(candidates[i].url);
    if (url) return url;
  }
  return '';
}

function itemId(link) {
  return crypto.createHash('sha1').update(String(link)).digest('hex').slice(0, 14);
}

function toItem(raw, feed, sectionId, sources, now) {
  if (!raw) return null;
  var rawTitle = V.stripHtml(raw.title);
  // Only Google News appends " - Publisher". Running the stripper on direct
  // feeds would eat a legitimate final clause such as "India - Pakistan talks".
  var isGoogle = /news\.google\.com/i.test(feed.url);
  var title = isGoogle ? V.cleanTitle(rawTitle) : rawTitle;
  var link = typeof raw.link === 'string' ? raw.link.trim() : '';
  var published = raw.isoDate || raw.pubDate || raw.updated || raw.published || '';
  var dateMs = Date.parse(published);
  if (!isFinite(dateMs)) return null;
  if (dateMs < now - sources.maxAgeHours * 3600 * 1000) return null;
  if (dateMs > now + 24 * 3600 * 1000) return null;
  if (title.length < 8 || !V.isHttpUrl(link)) return null;
  var host = V.hostOf(link);
  if (!V.hostAllowed(host, sources.allowDomains)) return null;
  var source = deriveSource(raw, feed);
  if (!source || source.length < 2) return null;
  return {
    id: itemId(link),
    title: title,
    link: link,
    source: source,
    domain: host,
    publishedAt: new Date(dateMs).toISOString(),
    section: sectionId,
    summary: summaryOf(raw),
    image: imageOf(raw)
  };
}

function stateSlug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stateFeed(state, sources) {
  var query = (sources && sources.stateQuery && sources.stateQuery[state]) || (state + ' news');
  return {
    url: 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'Google News · ' + state,
    domain: 'news.google.com'
  };
}

function planStates(sources, existing) {
  var states = sources.states || [];
  if (!states.length) return [];
  if (process.env.NEWS_BOOTSTRAP === '1') return states.slice();
  var oldCount = 0;
  (existing.sections || []).forEach(function (s) {
    if (s.id && s.id.indexOf('state:') === 0) oldCount += (s.items || []).length;
  });
  // Bootstrap: the first run (or a wiped store) fetches every state once.
  if (oldCount === 0) return states.slice();
  var batch = Math.max(1, sources.stateBatchSize || 9);
  var slot = Math.floor(Date.now() / (15 * 60 * 1000));
  var start = (slot * batch) % states.length;
  var picked = [];
  for (var i = 0; i < Math.min(batch, states.length); i++) {
    picked.push(states[(start + i) % states.length]);
  }
  return picked;
}

function dedupe(items) {
  var seenLinks = new Set();
  var seenTitles = new Set();
  return items.filter(function (item) {
    var link = item.link;
    var title = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenLinks.has(link) || seenTitles.has(title)) return false;
    seenLinks.add(link);
    seenTitles.add(title);
    return true;
  });
}

function sortByDate(items) {
  return items.slice().sort(function (a, b) { return Date.parse(b.publishedAt) - Date.parse(a.publishedAt); });
}

function capSection(items, cap) {
  return sortByDate(dedupe(items)).slice(0, cap);
}

async function main() {
  var sources = readJson(SOURCES_FILE, null);
  if (!sources || !Array.isArray(sources.sections)) {
    console.error('news-sources.json is missing or malformed');
    process.exit(1);
  }
  var existing = readJson(OUT_FILE, { sections: [] });
  var now = Date.now();
  var cap = sources.maxItemsPerSection || 80;

  var plan = [];
  sources.sections.forEach(function (section) {
    (section.feeds || []).forEach(function (feed) {
      plan.push({ feed: feed, section: section });
    });
  });

  var stateNames = planStates(sources, existing);
  var stateSections = {};
  stateNames.forEach(function (name) {
    var id = 'state:' + stateSlug(name);
    var section = { id: id, label: name, icon: '📍', accent: '#94a3b8', region: name, statewise: true };
    stateSections[id] = section;
    plan.push({ feed: stateFeed(name, sources), section: section });
  });

  console.log('Fetching ' + plan.length + ' feeds (' + stateNames.length + ' states this run)...');
  var results = await mapLimit(plan, CONCURRENCY, function (job) { return parseFeed(job.feed); });

  var ok = 0, failed = 0;
  var bySection = {};
  results.forEach(function (result, i) {
    var job = plan[i];
    if (!result.ok) {
      failed++;
      var msg = result.error && result.error.message ? result.error.message : String(result.error);
      console.warn('  FAIL ' + job.section.id + ' <- ' + job.feed.source + ': ' + msg);
      return;
    }
    ok++;
    var rawItems = result.value.items.slice(0, sources.maxItemsPerFeed || 25);
    var sectionItems = bySection[job.section.id] || (bySection[job.section.id] = []);
    rawItems.forEach(function (raw) {
      var item = toItem(raw, job.feed, job.section.id, sources, now);
      if (item) sectionItems.push(item);
    });
  });

  console.log('Feeds: ' + ok + ' ok, ' + failed + ' failed');

  if (ok === 0) {
    console.error('Every feed failed. Keeping the previous news snapshot untouched.');
    process.exit(1);
  }

  var oldSections = {};
  (existing.sections || []).forEach(function (s) { if (s && s.id) oldSections[s.id] = s; });

  var sections = [];
  var total = 0;

  sources.sections.forEach(function (def) {
    var incoming = bySection[def.id] || [];
    var old = (oldSections[def.id] && oldSections[def.id].items) || [];
    var items = capSection(incoming.concat(old), cap);
    total += items.length;
    sections.push({
      id: def.id,
      label: def.label,
      icon: def.icon || '',
      accent: def.accent || '#a78bfa',
      disclaimer: def.disclaimer || '',
      items: items
    });
  });

  // States: keep every rotated-out state from the previous snapshot.
  var stateOrder = sources.states || [];
  stateOrder.forEach(function (name) {
    var id = 'state:' + stateSlug(name);
    var incoming = bySection[id] || [];
    var old = (oldSections[id] && oldSections[id].items) || [];
    var items = capSection(incoming.concat(old), Math.min(cap, 30));
    total += items.length;
    sections.push({
      id: id,
      label: name,
      icon: '📍',
      accent: '#94a3b8',
      region: name,
      statewise: true,
      items: items
    });
  });

  if (total === 0) {
    console.error('No valid items survived validation. Keeping the previous snapshot.');
    process.exit(1);
  }

  var output = {
    generatedAt: new Date(now).toISOString(),
    ok: true,
    stats: {
      feedsOk: ok,
      feedsFailed: failed,
      feedsTotal: plan.length,
      items: total,
      sections: sections.length
    },
    disclaimers: sources.disclaimers || {},
    allowDomains: sources.allowDomains,
    sections: sections
  };

  var problems = V.validateNewsData(output, sources, now);
  if (problems.length) {
    console.error('News output failed its own contract:');
    problems.slice(0, 20).forEach(function (p) { console.error('  - ' + p); });
    process.exit(1);
  }

  var tmp = OUT_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(output), 'utf8');
  fs.renameSync(tmp, OUT_FILE);
  console.log('Wrote ' + total + ' items across ' + sections.length + ' sections to data/news.json');
}

main().catch(function (error) {
  console.error('fetch-news crashed: ' + (error && error.stack ? error.stack : error));
  process.exit(1);
});

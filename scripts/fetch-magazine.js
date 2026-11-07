'use strict';
// vlymbooq magazine — deterministic aggregation with open photography.
//
// Stories: publisher RSS only, carried with title/link/source/date.
// Photos:  Wikimedia Commons, with the licence and credit attached to every
//          caption. Categories are mixed round-robin so a single issue cannot
//          collapse into one visual note.
// Books:   Project Gutenberg catalogue entries via Gutendex (public domain).
// Nothing here writes prose about an event or invents a caption.

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Parser = require('rss-parser');
var V = require('./lib/feed-validate');

var ROOT = path.resolve(__dirname, '..');
var SOURCES_FILE = path.join(ROOT, 'data', 'magazine-sources.json');
var OUT_FILE = path.join(ROOT, 'data', 'magazine.json');

var TIMEOUT_MS = 22000;
var CONCURRENCY = 6;
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
var COMMONS_UA = 'vlymbooq-magazine/1.0 (https://vlymbooq.qzz.io; editorial aggregation with attribution)';

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
function hash(text) { return crypto.createHash('sha1').update(String(text)).digest('hex'); }
function itemId(text) { return hash(text).slice(0, 14); }

async function fetchText(url, headers, attempt, timeoutMs) {
  attempt = attempt || 1;
  timeoutMs = timeoutMs || TIMEOUT_MS;
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  try {
    var resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: Object.assign({
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-IN,en;q=0.9'
      }, headers || {})
    });
    if ((resp.status === 429 || resp.status >= 500) && attempt <= 2) {
      clearTimeout(timer);
      await sleep(1500 * attempt);
      return fetchText(url, headers, attempt + 1, timeoutMs);
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, headers, timeoutMs) {
  var text = await fetchText(url, Object.assign({ 'Accept': 'application/json' }, headers || {}), 1, timeoutMs);
  return JSON.parse(text);
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
  var text = V.stripHtml(item.contentSnippet || item.summary || item.description || item.content || '');
  if (text.length > 260) text = text.slice(0, 257).replace(/\s+\S*$/, '') + '…';
  return text;
}

function cleanImageUrl(value) {
  if (typeof value !== 'string') return '';
  var url = value.trim();
  if (!/^https:\/\//i.test(url)) return '';
  if (/\.(svg|gif)(\?|#|$)/i.test(url)) return '';
  return url;
}

function imageOf(raw) {
  var candidates = [];
  [].concat(raw.mediaContent || [], raw.mediaThumbnail || []).forEach(function (entry) {
    if (!entry) return;
    var attrs = entry.$ || entry;
    if (attrs && typeof attrs.url === 'string') {
      var width = parseInt(attrs.width, 10);
      candidates.push({ url: attrs.url, width: isFinite(width) ? width : 0 });
    }
  });
  if (raw.enclosure && raw.enclosure.url && (!raw.enclosure.type || /^image\//i.test(String(raw.enclosure.type)))) {
    candidates.push({ url: raw.enclosure.url, width: 0 });
  }
  var match = String(raw['content:encoded'] || raw.content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) candidates.push({ url: match[1], width: 0 });
  candidates.sort(function (a, b) { return b.width - a.width; });
  for (var i = 0; i < candidates.length; i++) {
    var url = cleanImageUrl(candidates[i].url);
    if (url) return url;
  }
  return '';
}

function toStory(raw, feed, sectionId, sources, now) {
  if (!raw) return null;
  var rawTitle = V.stripHtml(raw.title);
  var isGoogle = /news\.google\.com/i.test(feed.url);
  var title = isGoogle ? V.cleanTitle(rawTitle) : rawTitle;
  var link = typeof raw.link === 'string' ? raw.link.trim() : '';
  var published = raw.isoDate || raw.pubDate || raw.updated || raw.published || '';
  var dateMs = Date.parse(published);
  var maxAge = (sources.maxAgeHours || 504) * 3600 * 1000;
  if (!isFinite(dateMs) || dateMs < now - maxAge || dateMs > now + 24 * 3600 * 1000) return null;
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

function dedupeByLink(items) {
  var seen = new Set();
  return items.filter(function (item) {
    if (!item || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

function sortByDate(items) {
  return items.slice().sort(function (a, b) { return Date.parse(b.publishedAt) - Date.parse(a.publishedAt); });
}

// --- Wikimedia Commons ------------------------------------------------------
function commonsValue(meta, key) {
  if (!meta || !meta[key] || !meta[key].value) return '';
  return V.stripHtml(meta[key].value).replace(/\s+/g, ' ').trim();
}

function photoFromPage(page, categoryLabel) {
  var ii = page.imageinfo && page.imageinfo[0];
  if (!ii || !ii.thumburl) return null;
  if (ii.mime && !/^image\/(jpeg|png|webp)$/i.test(ii.mime)) return null;
  var meta = ii.extmetadata || {};
  var license = commonsValue(meta, 'LicenseShortName');
  var credit = commonsValue(meta, 'Artist') || commonsValue(meta, 'Credit') || 'Wikimedia Commons contributor';
  var title = commonsValue(meta, 'ObjectName') || String(page.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
  var description = commonsValue(meta, 'ImageDescription');
  if (description.length > 190) description = description.slice(0, 187).replace(/\s+\S*$/, '') + '…';
  if (!license) return null;
  return {
    id: itemId(ii.descriptionurl || page.title),
    title: title.slice(0, 140),
    image: ii.thumburl,
    link: ii.descriptionurl,
    credit: credit.slice(0, 120),
    license: license.slice(0, 60),
    description: description,
    kind: categoryLabel || 'Photograph'
  };
}

async function fetchCommonsCategory(category, label) {
  var url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers' +
    '&gcmtitle=' + encodeURIComponent('Category:' + category) +
    '&gcmtype=file&gcmlimit=24&prop=imageinfo' +
    '&iiprop=url|extmetadata|mime&iiurlwidth=1400&format=json&origin=*';
  var json = await fetchJson(url, { 'User-Agent': COMMONS_UA });
  var pages = json && json.query && json.query.pages ? Object.keys(json.query.pages).map(function (k) { return json.query.pages[k]; }) : [];
  var out = [];
  pages.forEach(function (page) {
    var photo = photoFromPage(page, label);
    if (photo) out.push(photo);
  });
  return out;
}

// Round-robin across categories so a photo essay cannot collapse into one
// subject, then rotate deterministically once a day.
function spreadPhotos(categoryLists, count, seed) {
  var queues = categoryLists.map(function (list) {
    return list.slice().sort(function (a, b) { return hash(a.id + seed).localeCompare(hash(b.id + seed)); });
  }).filter(function (q) { return q.length; });
  var out = [];
  var index = 0;
  while (out.length < count && queues.length) {
    var progressed = false;
    for (var i = 0; i < queues.length && out.length < count; i++) {
      var queue = queues[(index + i) % queues.length];
      if (queue.length) {
        out.push(queue.shift());
        progressed = true;
      }
    }
    if (!progressed) break;
    index++;
  }
  var seen = new Set();
  return out.filter(function (photo) {
    var key = photo.link || photo.image;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Postcards: one open photograph per state / UT ---------------------------
var BAD_PAGEIMAGE = /(map|locator|seal|logo|flag|coat[_\s-]?of[_\s-]?arms|emblem|diagram|chart|graph|svg|icon)/i;

function normalizeTitle(title) {
  return decodeURIComponent(String(title || ''))
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchPostcards(states, count, seed) {
  if (!states || !states.length) return [];
  var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
    '&prop=pageimages&piprop=thumbnail|name&pithumbsize=1200&titles=' + encodeURIComponent(states.join('|'));
  var json = await fetchJson(wikiUrl, { 'User-Agent': COMMONS_UA });
  var pages = json && json.query && json.query.pages ? Object.keys(json.query.pages).map(function (k) { return json.query.pages[k]; }) : [];
  var byFile = {};
  pages.forEach(function (page) {
    var name = page.pageimage;
    if (!name || BAD_PAGEIMAGE.test(name)) return;
    byFile[normalizeTitle('File:' + name)] = page.title;
  });
  var titles = Object.keys(byFile);
  var cards = [];
  if (titles.length) {
    var infoUrl = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
      '&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=1400&titles=' +
      encodeURIComponent(titles.slice(0, 40).join('|'));
    var info = await fetchJson(infoUrl, { 'User-Agent': COMMONS_UA });
    var infoPages = info && info.query && info.query.pages ? Object.keys(info.query.pages).map(function (k) { return info.query.pages[k]; }) : [];
    infoPages.forEach(function (page) {
      var state = byFile[normalizeTitle(page.title)];
      if (!state) return;
      var photo = photoFromPage(page, 'Postcard');
      if (!photo) return;
      cards.push({
        id: photo.id,
        title: state,
        image: photo.image,
        link: photo.link,
        credit: photo.credit,
        license: photo.license,
        description: photo.description,
        state: state
      });
    });
  }

  // Some states have no page image, or their page image is a map. Ask Commons
  // for a photograph instead, so "every corner" does not silently lose a UT.
  var present = new Set(cards.map(function (card) { return card.state; }));
  var missing = states.filter(function (state) { return !present.has(state); }).slice(0, 8);
  for (var i = 0; i < missing.length; i++) {
    try {
      var photo = await commonsSearchPhoto(missing[i] + ' India');
      if (!photo) continue;
      cards.push({
        id: photo.id,
        title: missing[i],
        image: photo.image,
        link: photo.link,
        credit: photo.credit,
        license: photo.license,
        description: photo.description,
        state: missing[i]
      });
    } catch (e) {
      console.warn('  POSTCARD SEARCH FAIL ' + missing[i] + ': ' + (e && e.message));
    }
  }

  return cards.sort(function (a, b) { return hash(a.id + seed).localeCompare(hash(b.id + seed)); }).slice(0, count);
}

async function commonsSearchPhoto(query) {
  var url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrsearch=' + encodeURIComponent(query + ' filetype:bitmap') +
    '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=1400';
  var json = await fetchJson(url, { 'User-Agent': COMMONS_UA });
  var pages = json && json.query && json.query.pages ? Object.keys(json.query.pages).map(function (k) { return json.query.pages[k]; }) : [];
  pages.sort(function (a, b) { return (a.index || 999) - (b.index || 999); });
  for (var i = 0; i < pages.length; i++) {
    if (BAD_PAGEIMAGE.test(pages[i].title || '')) continue;
    var photo = photoFromPage(pages[i], 'Postcard');
    if (photo) return photo;
  }
  return null;
}

// --- Public-domain shelves ---------------------------------------------------
async function fetchGutendex(topic, limit) {
  var url = 'https://gutendex.com/books?topic=' + encodeURIComponent(topic) + '&languages=en&sort=popular';
  // Gutendex is occasionally slow; give the catalogue room instead of
  // dropping the shelves on a single slow response.
  var json = await fetchJson(url, { 'User-Agent': COMMONS_UA }, 90000);
  var results = Array.isArray(json.results) ? json.results : [];
  var books = [];
  var seen = new Set();
  results.forEach(function (book) {
    if (books.length >= limit || !book || !book.id || !book.title) return;
    var author = (book.authors || []).map(function (a) { return a.name; }).filter(Boolean).join(', ');
    if (!author || seen.has(book.id)) return;
    seen.add(book.id);
    books.push({
      id: 'gutenberg-' + book.id,
      title: V.stripHtml(book.title).slice(0, 160),
      author: V.stripHtml(author).slice(0, 100),
      link: 'https://www.gutenberg.org/ebooks/' + book.id,
      downloads: book.download_count || 0
    });
  });
  return books;
}

function fallbackBooks(list, limit) {
  return (list || []).slice(0, limit).map(function (book) {
    return {
      id: 'gutenberg-' + book.id,
      title: book.title,
      author: book.author,
      link: 'https://www.gutenberg.org/ebooks/' + book.id,
      downloads: 0,
      fallback: true
    };
  });
}

// --- Issue metadata ----------------------------------------------------------
function isoWeek(date) {
  var d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  var day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function buildEditorNote(sections, cover) {
  var picks = [];
  var used = new Set();
  if (cover) { picks.push({ title: cover.title, link: cover.link, source: cover.source }); used.add(cover.link); }
  ['literature', 'women', 'finance', 'travel', 'culture'].forEach(function (id) {
    var section = sections.filter(function (s) { return s.id === id; })[0];
    var item = section && section.items.filter(function (it) { return !used.has(it.link); })[0];
    if (item && picks.length < 5) { picks.push({ title: item.title, link: item.link, source: item.source }); used.add(item.link); }
  });
  if (!picks.length) return { text: '', links: [] };
  var titles = picks.slice(1).map(function (p) { return '“' + p.title + '”'; });
  var text = 'This issue opens with “' + picks[0].title + '” from ' + picks[0].source + '.';
  if (titles.length) {
    text += ' Also inside: ' + titles.slice(0, 3).join(', ') + '.';
  }
  text += ' Every story keeps its original link; photography is credited individually.';
  return { text: text, links: picks };
}

// --- Main --------------------------------------------------------------------
async function main() {
  var sources = readJson(SOURCES_FILE, null);
  if (!sources || !Array.isArray(sources.sections)) {
    console.error('magazine-sources.json is missing or malformed');
    process.exit(1);
  }
  var existing = readJson(OUT_FILE, { sections: [] });
  var now = Date.now();
  var seed = new Date(now).toISOString().slice(0, 10);
  var cap = sources.maxItemsPerSection || 48;

  var plan = [];
  sources.sections.forEach(function (section) {
    (section.feeds || []).forEach(function (feed) { plan.push({ feed: feed, section: section }); });
  });

  console.log('Fetching ' + plan.length + ' story feeds, ' + (sources.commonsCategories || []).length + ' photo collections, postcards and shelves...');
  var storyResults = await mapLimit(plan, CONCURRENCY, function (job) { return parseFeed(job.feed); });

  var feedsOk = 0, feedsFailed = 0;
  var bySection = {};
  storyResults.forEach(function (result, i) {
    var job = plan[i];
    if (!result.ok) {
      feedsFailed++;
      var msg = result.error && result.error.message ? result.error.message : String(result.error);
      console.warn('  FAIL ' + job.section.id + ' <- ' + job.feed.source + ': ' + msg);
      return;
    }
    feedsOk++;
    var bucket = bySection[job.section.id] || (bySection[job.section.id] = []);
    result.value.items.slice(0, sources.maxItemsPerFeed || 20).forEach(function (raw) {
      var item = toStory(raw, job.feed, job.section.id, sources, now);
      if (item) bucket.push(item);
    });
  });
  console.log('Story feeds: ' + feedsOk + ' ok, ' + feedsFailed + ' failed');

  // Photography, postcards and books are independent: one failing collection
  // must not blank the others.
  var photoLists = [];
  var photoLabels = [];
  var photoResults = await mapLimit(sources.commonsCategories || [], 3, function (entry) {
    return fetchCommonsCategory(entry.category, entry.label);
  });
  photoResults.forEach(function (result, i) {
    if (result.ok && result.value.length) {
      photoLists.push(result.value);
      photoLabels.push(sources.commonsCategories[i].label);
    } else if (!result.ok) {
      console.warn('  PHOTO FAIL ' + sources.commonsCategories[i].category + ': ' + (result.error && result.error.message));
    }
  });
  var photos = spreadPhotos(photoLists, sources.photoCount || 14, seed);
  console.log('Photos: ' + photos.length + ' from ' + photoLists.length + ' collections (' + photoLabels.join(' · ') + ')');

  var postcards = [];
  try {
    postcards = await fetchPostcards(sources.postcardStates || [], sources.postcardCount || 8, seed);
    console.log('Postcards: ' + postcards.length + ' states / UTs');
  } catch (e) {
    console.warn('  POSTCARD FAIL ' + (e && e.message));
  }

  var childrenBooks = [], shelfBooks = [];
  try {
    childrenBooks = await fetchGutendex((sources.children && sources.children.topic) || 'children', (sources.children && sources.children.limit) || 8);
  } catch (e) { console.warn('  BOOKS FAIL (children): ' + (e && e.message)); }
  try {
    shelfBooks = await fetchGutendex((sources.literatureShelf && sources.literatureShelf.topic) || 'short stories', (sources.literatureShelf && sources.literatureShelf.limit) || 6);
  } catch (e) { console.warn('  BOOKS FAIL (shelf): ' + (e && e.message)); }
  var fallback = sources.bookFallback || {};
  if (!childrenBooks.length) childrenBooks = fallbackBooks(fallback.children, (sources.children && sources.children.limit) || 8);
  if (!shelfBooks.length) shelfBooks = fallbackBooks(fallback.shelf, (sources.literatureShelf && sources.literatureShelf.limit) || 6);
  console.log('Books: ' + childrenBooks.length + ' children, ' + shelfBooks.length + ' short reads' + (childrenBooks.some(function (b) { return b.fallback; }) ? ' (verified fallback shelf)' : ''));

  var oldSections = {};
  (existing.sections || []).forEach(function (s) { if (s && s.id) oldSections[s.id] = s; });
  function oldItems(id) { return (oldSections[id] && oldSections[id].items) || []; }

  var usedLinks = new Set();
  var sections = [];
  var storyTotal = 0;
  sources.sections.forEach(function (def) {
    var incoming = bySection[def.id] || [];
    var merged = dedupeByLink(incoming.concat(oldItems(def.id)))
      .filter(function (item) { return !usedLinks.has(item.link); });
    merged = sortByDate(merged).slice(0, cap);
    merged.forEach(function (item) { usedLinks.add(item.link); });
    storyTotal += merged.length;
    sections.push({
      id: def.id,
      label: def.label,
      kind: 'stories',
      icon: def.icon || '',
      accent: def.accent || '#f5b544',
      items: merged
    });
  });

  if (!photos.length) photos = oldItems('photos');
  if (!postcards.length) postcards = oldItems('postcards');
  if (!childrenBooks.length) childrenBooks = oldItems('children');
  if (!shelfBooks.length) shelfBooks = oldItems('shelf');

  var photoSection = {
    id: 'photos',
    label: 'Photo Essay',
    kind: 'photos',
    icon: '◉',
    accent: '#f5b544',
    items: photos
  };
  var postcardSection = {
    id: 'postcards',
    label: 'Postcards from Every Corner',
    kind: 'photos',
    icon: '✉',
    accent: '#22d3ee',
    items: postcards
  };
  var childrenSection = {
    id: 'children',
    label: (sources.children && sources.children.label) || "Children's Shelf",
    kind: 'books',
    icon: (sources.children && sources.children.icon) || '✎',
    accent: '#fb7185',
    items: childrenBooks
  };
  var shelfSection = {
    id: 'shelf',
    label: (sources.literatureShelf && sources.literatureShelf.label) || 'Short Reads',
    kind: 'books',
    icon: (sources.literatureShelf && sources.literatureShelf.icon) || '▤',
    accent: '#c4b5fd',
    items: shelfBooks
  };

  var feature = sections.filter(function (s) { return s.id === 'features'; })[0];
  var coverItem = feature && (feature.items.filter(function (it) { return it.image; })[0] || feature.items[0]);
  if (!coverItem) {
    var allStories = [];
    sections.forEach(function (s) { s.items.forEach(function (it) { allStories.push(it); }); });
    coverItem = allStories.filter(function (it) { return it.image; })[0] || allStories[0] || null;
  }
  var cover = coverItem ? {
    title: coverItem.title,
    link: coverItem.link,
    source: coverItem.source,
    image: coverItem.image || '',
    summary: coverItem.summary || '',
    publishedAt: coverItem.publishedAt,
    section: coverItem.section
  } : null;

  var issueDate = new Date(now);
  var issue = {
    label: 'Vol. I · No. ' + isoWeek(issueDate) + ' · ' +
      issueDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    date: issueDate.toISOString().slice(0, 10)
  };

  var ordered = sections.concat([photoSection, postcardSection, childrenSection, shelfSection]);
  var editorNote = buildEditorNote(ordered, cover);

  var output = {
    generatedAt: new Date(now).toISOString(),
    ok: true,
    issue: issue,
    cover: cover,
    editorNote: editorNote,
    stats: {
      feedsOk: feedsOk,
      feedsFailed: feedsFailed,
      feedsTotal: plan.length,
      stories: storyTotal,
      photos: photos.length,
      postcards: postcards.length,
      books: childrenBooks.length + shelfBooks.length
    },
    disclaimers: sources.disclaimers || {},
    allowDomains: sources.allowDomains,
    sections: ordered
  };

  var contentCount = storyTotal + photos.length + postcards.length + childrenBooks.length + shelfBooks.length;
  if (contentCount === 0) {
    console.error('No magazine content survived validation. Keeping the previous issue.');
    process.exit(1);
  }

  var problems = V.validateMagazineData(output, now);
  if (problems.length) {
    console.error('Magazine output failed its own contract:');
    problems.slice(0, 20).forEach(function (p) { console.error('  - ' + p); });
    process.exit(1);
  }

  var tmp = OUT_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(output), 'utf8');
  fs.renameSync(tmp, OUT_FILE);
  console.log('Wrote magazine.json: ' + storyTotal + ' stories, ' + photos.length + ' photos, ' + postcards.length + ' postcards, ' + (childrenBooks.length + shelfBooks.length) + ' books');
}

main().catch(function (error) {
  console.error('fetch-magazine crashed: ' + (error && error.stack ? error.stack : error));
  process.exit(1);
});

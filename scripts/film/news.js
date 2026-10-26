#!/usr/bin/env node
/*
 * What is happening, from feeds that cost nothing.
 *
 * The slate was written by hand, which meant the films could only be about
 * things someone had already thought of. This reads a pinned list of free RSS
 * feeds, keeps the last week, and ranks stories by whether they are filmable:
 * a decision, a document, a number under dispute, an institution doing
 * something. Violence is downranked on purpose. The film grammar forbids
 * bodies and spectacle, so a body-count story is the wrong raw material even
 * when it is the biggest headline.
 *
 * Ranking is deterministic. This script does not decide truth and does not
 * write prose; it produces candidates for the research step, which must fetch
 * and quote the actual pages.
 *
 * Usage:
 *   node scripts/film/news.js
 *   node scripts/film/news.js --days 3 --limit 15
 *   node scripts/film/news.js --slate 2      # append the best two to the slate
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FEEDS = path.join(ROOT, 'data', 'film-news-feeds.json');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const UA = 'vlymbooq-film-news/1.0 (+https://vlymbooq.qzz.io)';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

const STOP = new Set(('the a an and or of to in on for with by from at as is are was were be been ' +
  'this that these those it its his her their our your my we they he she you i not no but if then ' +
  'after before over under into out up down about more most less least new says say said will ' +
  'would can could may might must should than so such very just also only').split(' '));

/*
 * Words that mean there is something to film: an institution, a document, a
 * number, a rule being made or broken.
 */
/*
 * Two tiers, because one list produced nonsense: "Tiger Shroff" scored on
 * "tiger" and an honorary doctorate scored on "university". A film needs an
 * institution or a document (the strong tier) plus a subject (the theme tier).
 */
const STRONG = [
  'supreme court', 'high court', 'judgment', 'verdict', 'petition', 'tribunal',
  'parliament', 'lok sabha', 'rajya sabha', 'bill', 'ordinance', 'amendment',
  'constitution', 'governor', 'election commission', 'election', 'census',
  'delimitation', 'budget', 'cag', 'audit', 'committee', 'inquiry', 'policy',
  'scheme', 'subsidy', 'tariff', 'sanction', 'treaty', 'rbi', 'repo rate',
  'notification', 'consultation', 'commission'
];

const THEME = [
  'farmer', 'labour', 'migrant', 'factory', 'plant', 'dam', 'river',
  'air quality', 'water', 'pollution', 'heatwave', 'flood', 'drought',
  'monsoon', 'hospital', 'vaccine', 'school', 'university', 'exam',
  'paper leak', 'telecom', 'spectrum', 'privacy', 'data protection',
  'semiconductor', 'power grid', 'coal', 'railway', 'port', 'currency',
  'rupee', 'inflation', 'unemployment', 'price rise', 'land acquisition',
  'forest', 'protest', 'hunger strike', 'displacement', 'rehabilitation',
  'compensation', 'extradition', 'surveillance', 'censor', 'newspaper', 'media'
];

/*
 * Not this channel. A celebrity case is not a documentary subject here, however
 * many keywords it trips.
 */
const EXCLUDE = [
  /\bbollywood\b/i, /\bactor\b/i, /\bactress\b/i, /\bbox office\b/i,
  /\bcricket\b/i, /\bipl\b/i, /\bwedding\b/i, /\bfashion\b/i,
  /\brecipe\b/i, /\bhoroscope\b/i, /\bobituary\b/i, /\bhonorary doctorate\b/i
];

/*
 * Downranked, not banned: the aftermath of a disaster can still be a film, but
 * the first days of one are a body count and that is not what this channel is.
 */
const SPECTACLE = [
  'killed', 'dead', 'death toll', 'bodies', 'body', 'rape', 'murder', 'shot dead',
  'blast', 'explosion', 'shooting', 'stampede', 'crash', 'collapsed', 'militants',
  'terror', 'encounter', 'lynching', 'suicide', 'corpse'
];

function tokenize(text) {
  return new Set(String(text).toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w)));
}

function jaccard(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / (a.size + b.size - shared || 1);
}

function stripTags(text) {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapCdata(text) {
  const m = String(text || '').match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : text;
}

function firstTag(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (m) return unwrapCdata(m[1]).trim();
  }
  return '';
}

function attrHref(block) {
  const m = block.match(/<link[^>]+href="([^"]+)"/i);
  return m ? m[1] : '';
}

function parseFeed(text) {
  const items = [];
  const blocks = String(text).match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    const title = stripTags(firstTag(block, ['title']));
    const link = stripTags(firstTag(block, ['link'])) || attrHref(block);
    const when = firstTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const summary = stripTags(firstTag(block, ['description', 'summary', 'content:encoded', 'content']));
    if (!title || !link) continue;
    const time = Date.parse(when);
    items.push({
      title,
      link,
      summary: summary.slice(0, 400),
      at: Number.isNaN(time) ? null : new Date(time).toISOString(),
    });
  }
  return items;
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'application/rss+xml,application/xml,text/xml,*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Whole words only. Substring matching scored "important" as "port" and
 * "activists" as "act", which put celebrity news above a court judgment.
 */
function mentions(text, word) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

function score(item, region) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const hits = [];
  for (const word of [...STRONG, ...THEME]) {
    if (mentions(text, word)) hits.push(word);
  }
  const strong = hits.filter((h) => STRONG.includes(h)).length;
  const theme = hits.filter((h) => THEME.includes(h)).length;

  // An institution or a document, and something concrete it is about.
  if (strong === 0 || strong + theme < 2) {
    return { value: -99, hits, eligible: false };
  }
  if (EXCLUDE.some((re) => re.test(`${item.title} ${item.summary}`))) {
    return { value: -99, hits, eligible: false };
  }

  let value = strong * 3 + theme * 2;
  for (const word of SPECTACLE) {
    if (mentions(text, word)) value -= 4;
  }
  if (/\d/.test(item.title)) value += 1;
  if (/^(why|how|what|explained|analysis|explainer)\b/i.test(item.title)) value += 1;
  if (region === 'india') value += 2;
  return { value, hits, eligible: true };
}

function cluster(items) {
  const groups = [];
  for (const item of items) {
    const tokens = tokenize(item.title);
    let target = null;
    for (const group of groups) {
      if (jaccard(tokens, group.tokens) >= 0.45) { target = group; break; }
    }
    if (!target) {
      groups.push({ tokens, items: [item] });
    } else {
      target.items.push(item);
      for (const t of tokens) target.tokens.add(t);
    }
  }
  return groups.map((group) => {
    const best = group.items.reduce((a, b) => (b.score.value > a.score.value ? b : a));
    const outlets = new Set(group.items.map((i) => i.source));
    const newest = group.items.map((i) => i.at).filter(Boolean).sort().pop() || null;
    return {
      title: best.title,
      summary: best.summary,
      score: best.score.value + Math.min(outlets.size - 1, 3) * 2,
      hits: [...new Set(group.items.flatMap((i) => i.score.hits))].slice(0, 8),
      outlets: [...outlets],
      at: newest,
      links: group.items.map((i) => ({ source: i.source, url: i.link })),
    };
  }).sort((a, b) => b.score - a.score);
}

function slugify(text) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function main() {
  const days = Number(arg('days', 7));
  const limit = Number(arg('limit', 12));
  const toSlate = Number(arg('slate', 0));
  const config = readJson(FEEDS);
  const feeds = [...(config.india || []), ...(config.world || [])];

  const cutoff = Date.now() - days * 86400000;
  const byRegion = { india: [], world: [] };
  const failures = [];
  const all = [...(config.india || []).map((f) => ({ ...f, region: 'india' })),
    ...(config.world || []).map((f) => ({ ...f, region: 'world' }))];

  for (const feed of all) {
    try {
      const found = await fetchFeed(feed);
      const fresh = found.filter((i) => (i.at ? Date.parse(i.at) >= cutoff : true));
      for (const item of fresh) {
        const scored = score(item, feed.region);
        if (!scored.eligible) continue;
        byRegion[feed.region].push({
          ...item,
          source: feed.source,
          feed: feed.id,
          score: scored,
        });
      }
      console.log(`ok    ${feed.id.padEnd(20)} ${String(fresh.length).padStart(3)} fresh of ${found.length}`);
    } catch (err) {
      failures.push({ feed: feed.id, error: err.message });
      console.log(`fail  ${feed.id.padEnd(20)} ${err.message}`);
    }
  }
  const total = byRegion.india.length + byRegion.world.length;
  if (total < 5) throw new Error('fewer than five fresh stories; feeds are down or quiet');

  const candidates = {
    india: cluster(byRegion.india).slice(0, limit),
    world: cluster(byRegion.world).slice(0, limit),
  };
  const outDir = path.join(ROOT, 'out', 'news', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    days,
    feeds: all.length,
    failures,
    candidates,
  };
  fs.writeFileSync(path.join(outDir, 'candidates.json'), `${JSON.stringify(payload, null, 2)}\n`);

  for (const region of ['india', 'world']) {
    console.log(`\n${region.toUpperCase()}`);
    for (const [i, c] of candidates[region].entries()) {
      console.log(`${String(i + 1).padStart(2)}. [${String(c.score).padStart(2)}] ${c.title}`);
      console.log(`    ${c.outlets.join(', ')}${c.at ? ` · ${c.at.slice(0, 10)}` : ''}${c.hits.length ? ` · ${c.hits.join(', ')}` : ''}`);
    }
  }
  console.log(`\n${total} stories · ${path.relative(ROOT, path.join(outDir, 'candidates.json'))}`);

  if (toSlate > 0) {
    const slate = readJson(SLATE);
    const existing = new Set((slate.topics || []).map((t) => t.id));
    let priority = Math.max(0, ...(slate.topics || []).map((t) => Number(t.priority) || 0));
    const added = [];
    const pool = [...candidates.india, ...candidates.world];
    for (const c of pool) {
      if (added.length >= toSlate) break;
      const id = slugify(c.title);
      if (existing.has(id) || !id) continue;
      /*
       * A single outlet is a report, not a record. Require either a second
       * independent outlet or an official document in the links before the
       * slate may carry the topic.
       */
      const official = c.links.some((l) => /\.(gov|gov\.in|nic\.in|int)\//.test(l.url)
        || /(^|\.)(un|who|worldbank|imf|rbi|sci)\./.test(new URL(l.url).hostname));
      if (c.outlets.length < 2 && !official) {
        console.log(`skip  ${c.title} (single outlet, no official document)`);
        continue;
      }
      priority += 1;
      slate.topics.push({
        id,
        title: c.title,
        status: 'research',
        priority,
        found: 'news',
        firstSeen: new Date().toISOString().slice(0, 10),
        why: c.summary || c.title,
        angle: '',
        sources: c.links.map((l) => l.url).slice(0, 5),
      });
      existing.add(id);
      added.push(id);
    }
    if (added.length) {
      slate.updated = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(SLATE, `${JSON.stringify(slate, null, 2)}\n`);
      console.log(`slate: added ${added.join(', ')}`);
    } else {
      console.log('slate: nothing new to add');
    }
  }
}

main().catch((err) => {
  console.error(`news: ${err.message}`);
  process.exitCode = 1;
});

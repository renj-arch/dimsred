#!/usr/bin/env node
/*
 * Source fetch for the film slate.
 *
 * Every topic in data/film-slate.json carries the URLs its brief is allowed to
 * use. This script fetches those pages, keeps the plain text and a digest, and
 * writes a corpus that the authoring step must quote from. Nothing here decides
 * what is true; it only fixes the text that a claim may be checked against.
 *
 * Wikipedia goes through the public API so the text is the article body rather
 * than the skin around it. Everything else is stripped to text. A source that
 * fails is recorded as failed and the run continues, but a topic with fewer than
 * two readable sources is not authorable.
 *
 * Usage:
 *   node scripts/film/research.js --topic emergency-1975
 *   node scripts/film/research.js --topic emergency-1975 --out out/research/emergency-1975
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const UA = 'vlymbooq-film-research/1.0 (+https://vlymbooq.qzz.io; contact: owner)';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/*
 * One text normal form for both sides of a quote check: no markup, no smart
 * quotes, single spaces. Otherwise a quote "matches" only by accident.
 */
function normalize(text) {
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html) {
  return normalize(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' '));
}

async function fetchText(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { body: await res.text(), contentType: res.headers.get('content-type') || '', finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Wikipedia: use the extract API so the corpus is article prose with no menus.
 */
async function fetchWikipedia(title, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2`
    + `&prop=extracts|info&explaintext=1&inprop=url&redirects=1&titles=${encodeURIComponent(title)}`;
  const { body } = await fetchText(url);
  const data = JSON.parse(body);
  const page = (data.query && data.query.pages && data.query.pages[0]) || null;
  if (!page || page.missing) throw new Error(`no article for ${title}`);
  return {
    text: normalize(page.extract || ''),
    title: page.title,
    canonical: page.fullurl,
    revision: null,
  };
}

function wikipediaTitle(url) {
  const u = new URL(url);
  if (!/(^|\.)wikipedia\.org$/.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/_/g, ' ')) : null;
}

async function readSource(url) {
  const wiki = wikipediaTitle(url);
  if (wiki) {
    const lang = new URL(url).hostname.split('.')[0];
    const page = await fetchWikipedia(wiki, lang);
    return { ...page, kind: 'wikipedia' };
  }
  const { body, contentType } = await fetchText(url);
  if (/json/.test(contentType)) {
    return { text: normalize(body), title: url, kind: 'json' };
  }
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || url;
  return { text: stripHtml(body), title: normalize(stripHtml(title)), kind: 'html' };
}

function sourceId(url, index) {
  const u = new URL(url);
  const slug = `${u.hostname}${u.pathname}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || `source-${index + 1}`;
}

async function main() {
  const topicId = arg('topic');
  if (!topicId) throw new Error('--topic <slate id> is required');
  const slate = readJson(SLATE);
  const topic = (slate.topics || []).find((t) => t.id === topicId);
  if (!topic) throw new Error(`${topicId} is not in data/film-slate.json`);
  if (!Array.isArray(topic.sources) || !topic.sources.length) {
    throw new Error(`${topicId} has no sources in the slate`);
  }

  const outDir = arg('out', path.join(ROOT, 'out', 'research', topicId));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const sources = [];
  const failures = [];
  for (let i = 0; i < topic.sources.length; i += 1) {
    const url = topic.sources[i];
    const id = sourceId(url, i);
    try {
      const page = await readSource(url);
      const text = normalize(page.text);
      if (text.length < 1200) throw new Error(`only ${text.length} characters of text`);
      const record = {
        id,
        url,
        canonical: page.canonical || url,
        title: page.title,
        kind: page.kind,
        fetchedAt: new Date().toISOString(),
        characters: text.length,
        sha256: sha256(text),
      };
      sources.push(record);
      fs.writeFileSync(path.join(outDir, `${id}.txt`), `${text}\n`);
      console.log(`ok    ${id}  ${record.characters} chars  ${page.title || ''}`);
    } catch (err) {
      failures.push({ id, url, error: err.message });
      console.log(`fail  ${id}  ${err.message}`);
    }
  }

  if (sources.length < 2) {
    throw new Error(`${topicId}: only ${sources.length} readable source(s); a film needs at least two`);
  }

  const corpus = {
    topic: topicId,
    title: topic.title,
    angle: topic.angle,
    why: topic.why,
    fetchedAt: new Date().toISOString(),
    sources,
    failures,
  };
  fs.writeFileSync(path.join(outDir, 'corpus.json'), `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`\n${sources.length} readable sources, ${failures.length} failed`);
  console.log(`corpus ${path.relative(ROOT, path.join(outDir, 'corpus.json'))}`);
}

main().catch((err) => {
  console.error(`research: ${err.message}`);
  process.exitCode = 1;
});

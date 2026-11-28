#!/usr/bin/env node
/**
 * research.js — fetch and extract sources for a film topic.
 *
 * Reads the topic-bank entry for --topic, tries to fetch each source URL,
 * extracts key facts (title, summary, dates, entities), and writes a research
 * bundle that author.js can turn into a storyboard.
 *
 * Usage:
 *   node scripts/film/research.js --topic <id> --out <dir>
 *
 * Outputs:
 *   <out>/sources.json     — one entry per source with extracted facts
 *   <out>/summary.md       — human-readable research summary
 *   <out>/manifest.json    — topic metadata + source list
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPIC_BANK = path.join(ROOT, 'data', 'films', 'topic-bank.json');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function flag(name) {
  return process.argv.includes('--' + name);
}

function fail(msg) {
  console.error('research: ' + msg);
  process.exitCode = 1;
}

function fetch(url) {
  const res = spawnSync('curl', [
    '-sS', '--max-time', '15', '--location',
    '-H', 'Accept: text/html,application/xhtml+xml',
    '-H', 'User-Agent: Mozilla/5.0 (research-bot; educational)',
    url
  ], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 20000 });
  if (res.error) return null;
  if (res.status !== 0) return null;
  return res.stdout || '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function extractSummary(html) {
  // Try meta description first
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim();
  // Fallback: first substantial paragraph
  const p = html.match(/<p[^>]*>([\s\S]{100,400})<\/p>/i);
  if (p) return p[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return '';
}

function extractDates(html) {
  const dates = [];
  const m = html.match(/\b(1[7-9]\d{2}|20\d{2})\b/g);
  if (m) {
    const seen = new Set();
    for (const y of m) {
      if (!seen.has(y)) { seen.add(y); dates.push(y); }
    }
  }
  return dates.slice(0, 5);
}

function extractEntities(html) {
  // Very light entity extraction: capitalized multi-word phrases
  const text = html.replace(/<[^>]+>/g, ' ');
  const phrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  const counts = {};
  for (const p of phrases) {
    if (p.length > 3 && p.length < 50) counts[p] = (counts[p] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((e) => e[0]);
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const topicId = arg('topic');
  const outDir = arg('out');
  if (!topicId || !outDir) {
    fail('--topic and --out are required');
    return;
  }

  const bank = JSON.parse(fs.readFileSync(TOPIC_BANK, 'utf8'));
  const topic = bank.topics.find((t) => t.id === topicId);
  if (!topic) {
    fail('topic not found in topic-bank: ' + topicId);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  const sources = [];
  for (const src of topic.sources || []) {
    // topic-bank stores sources either as plain URL strings or as {id,title,url,publisher} objects
    let srcUrl, srcId, srcTitle, srcPublisher;
    if (typeof src === 'string') {
      srcUrl = src;
      srcId = slugify(src);
      srcTitle = '';
      srcPublisher = '';
    } else {
      srcUrl = src.url;
      srcId = src.id || slugify(src.title || src.url);
      srcTitle = src.title || '';
      srcPublisher = src.publisher || '';
    }

    const entry = {
      id: srcId,
      title: srcTitle,
      publisher: srcPublisher,
      url: srcUrl,
      accessed: new Date().toISOString().slice(0, 10),
      fetched: false,
      titleExtracted: '',
      summary: '',
      dates: [],
      entities: [],
      error: ''
    };

    const html = fetch(src.url);
    if (html) {
      entry.fetched = true;
      entry.titleExtracted = extractTitle(html) || entry.title;
      entry.summary = extractSummary(html);
      entry.dates = extractDates(html);
      entry.entities = extractEntities(html);
    } else {
      entry.error = 'fetch failed';
    }

    sources.push(entry);
  }

  const manifest = {
    schema: 'vlymbooq.film-research.v1',
    topicId: topic.id,
    title: topic.title,
    category: topic.category,
    angle: topic.angle,
    why: topic.why,
    sources: sources,
    fetchedAt: new Date().toISOString(),
    sourceCount: sources.length,
    fetchedCount: sources.filter((s) => s.fetched).length
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'sources.json'), JSON.stringify(sources, null, 2) + '\n');

  // Human-readable summary
  let md = '# Research: ' + topic.title + '\n\n';
  md += 'Topic: ' + topic.id + '\n';
  md += 'Category: ' + topic.category + '\n';
  md += 'Angle: ' + topic.angle + '\n';
  md += 'Why: ' + topic.why + '\n\n';
  md += '## Sources\n\n';
  for (const s of sources) {
    md += '### ' + (s.titleExtracted || s.title || s.url) + '\n';
    md += '- URL: ' + s.url + '\n';
    md += '- Publisher: ' + s.publisher + '\n';
    md += '- Fetched: ' + s.fetched + '\n';
    if (s.summary) md += '- Summary: ' + s.summary + '\n';
    if (s.dates.length) md += '- Dates: ' + s.dates.join(', ') + '\n';
    if (s.entities.length) md += '- Entities: ' + s.entities.join(', ') + '\n';
    if (s.error) md += '- Error: ' + s.error + '\n';
    md += '\n';
  }
  fs.writeFileSync(path.join(outDir, 'summary.md'), md + '\n');

  console.log('research: ' + topic.title + ' — ' + sources.filter((s) => s.fetched).length + '/' + sources.length + ' sources fetched');
}

try {
  main();
} catch (err) {
  fail(err.message);
}

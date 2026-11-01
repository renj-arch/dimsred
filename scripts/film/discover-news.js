#!/usr/bin/env node
/*
 * Discover a new film topic from current free news only.
 *
 * Pulls from Wikipedia Current Events portal (credible, free) and the
 * top linked country pages. If the pulled text yields fewer than 5
 * sentences with credible sources, the script exits loudly and writes
 * nothing — the agent never invents a film without evidence.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const NEWS_URLS = [
  'https://en.wikipedia.org/wiki/Portal:Current_events',
  'https://en.wikipedia.org/wiki/Current_events',
  'https://en.wikipedia.org/wiki/2026_in_India',
  'https://www.britannica.com/topic/browse/current-events'
];

function fetch(url) {
  const r = spawnSync('curl', ['-sL','--max-time','15','-A','vlymbooq/1.0',url],
    { encoding: 'utf8', timeout: 25000 });
  return r.stdout || '';
}

function main() {
  const candidates = [];
  for (const url of NEWS_URLS) {
    const text = fetch(url).slice(0, 30000);
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && s.length < 350);
    for (let i = 0; i < Math.min(8, sentences.length); i++) candidates.push({
      id: 'news-' + Date.now() + '-' + i,
      title: 'News Event: ' + sentences[i].trim().slice(0, 60),
      priority: 99,
      status: 'research',
      why: 'Discovered from free current-events archive; needs further sourcing.',
      angle: 'The event through an object: a notice, a register, a photograph, a line.',
      sources: [url]
    });
  }
  const best = candidates.slice(0, 3).filter(c => c.id && c.title.length > 10);
  if (best.length < 5) {
    throw new Error('discover-news: only ' + best.length + ' sentences from current events; refusing to invent a film');
  }
  const outDir = 'data/research';
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, best[0].id + '.json');
  fs.writeFileSync(file, JSON.stringify({
    id: best[0].id,
    title: best[0].title,
    priority: best[0].priority,
    status: 'research',
    why: best[0].why,
    angle: best[0].angle,
    sources: best[0].sources
  }, null, 2) + '\n');
  console.log('discover-news: wrote ' + file + ' (' + best.length + ' candidates); agent must expand sources to 5+ before dispatch.');
}

main();

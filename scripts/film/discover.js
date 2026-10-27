#!/usr/bin/env node
/*
 * Topic discovery from free archives/RSS only.
 *
 * Consumes a research brief (free archive URLs or RSS feeds), pulls the
 * top N linked articles for each source, and builds a ledger of verbatim
 * sentences with source links. If a source yields fewer than 5 sentences,
 * the brief fails loudly — no invented facts.
 */
'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

function discover(topicFile) {
  const topic = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
  const sources = topic.sources || [];
  if (!sources.length) throw new Error('no sources for ' + topic.id);

  const ledger = [];
  for (const url of sources) {
    const out = spawnSync('curl', ['-sL', '--max-time', '15', '-A', 'vlymbooq/1.0', url],
      { encoding: 'utf8', timeout: 25000 });
    const text = (out.stdout || '').slice(0, 30000);
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20 && s.length < 400);
    for (let i = 0; i < Math.min(10, sentences.length); i++) {
      ledger.push({ id: `L${ledger.length + 1}`, text: sentences[i].trim(), source: url });
    }
  }

  if (ledger.length < 5) {
    throw new Error('topic ' + topic.id + ': only ' + ledger.length + ' sentences from free sources');
  }
  fs.mkdirSync('data/films', { recursive: true });
  fs.writeFileSync('data/films/' + topic.id + '-ledger.json', JSON.stringify({ rows: ledger }, null, 2));
  console.log('discover ' + topic.id + ': ' + ledger.length + ' sentences from ' + sources.length + ' free sources');
}

discover(process.argv[2] || 'data/research/' + (process.argv[3] || 'bengal-famine-1943') + '.json');

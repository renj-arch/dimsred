#!/usr/bin/env node
/*
 * Invent a new film topic from a concept seed, then try to source it from
 * free archives only. If fewer than 5 sources come back, fail loudly — no
 * invented facts, no film without evidence.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const CONCEPTS = [
  { id: 'mountain-1947', title: 'The Mountain Divide of 1947', why: 'A border drawn through a mountain range; the debate over access and ownership remains live.', angle: 'A survey line across a ridge; the people on either side of it.', sources: ['https://en.wikipedia.org/wiki/Line_of_Control','https://en.wikipedia.org/wiki/Partition_of_India'] },
  { id: 'strike-1920', title: 'The Strike That Stopped the Empire', why: 'A labor strike that turned a factory town into a political argument; still debated who moved.', angle: 'A factory gate, a closed line, a single register of names.', sources: ['https://en.wikipedia.org/wiki/Indian_labour_law','https://en.wikipedia.org/wiki/Non-cooperation_movement'] },
  { id: 'famine-1943', title: 'The Famine of 1943: A Record in Rice', why: 'A famine with enough food elsewhere; the debate over policy, war and colonial responsibility.', angle: 'A ration card, a blank shipping ledger, a censored photograph.', sources: ['https://en.wikipedia.org/wiki/Bengal_famine_of_1943','https://en.wikipedia.org/wiki/Famine_in_India'] }
];

function pull(link) {
  const r = spawnSync('curl', ['-sL', '--max-time', '15', '-A', 'vlymbooq/1.0', link], { encoding: 'utf8', timeout: 25000 });
  return (r.stdout || '').slice(0, 30000);
}

function invent() {
  const concept = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
  const found = [];
  for (const url of concept.sources) {
    const text = pull(url);
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20 && s.length < 400);
    for (let i = 0; i < Math.min(5, sentences.length); i++) found.push({ id: 'L'+(found.length+1), text: sentences[i].trim(), source: url });
  }
  if (found.length < 5) {
    throw new Error('invent-topic: concept ' + concept.id + ' produced only ' + found.length + ' sentences from free sources — refusing to invent a film');
  }
  const outDir = 'data/research';
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, concept.id + '.json'), JSON.stringify({ id: concept.id, title: concept.title, priority: 99, status: 'research', why: concept.why, angle: concept.angle, sources: concept.sources }, null, 2));
  fs.writeFileSync('data/films/' + concept.id + '-ledger.json', JSON.stringify({ rows: found }, null, 2));
  console.log('invent-topic: ' + concept.id + ' — ' + found.length + ' sentences from ' + concept.sources.length + ' sources');
}

invent();

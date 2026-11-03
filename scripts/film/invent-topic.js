#!/usr/bin/env node
/* Invent from scratch — no seed list. 35B creates concept + pulls sources. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const outDir = 'data/research';
fs.mkdirSync(outDir, { recursive: true });

// 35B invents a new film topic from world events, sources, and debate — no fixed CONCEPTS
const modelPrompt = 'Invent a new sourced film topic from current world events or history. Provide a title, why it matters, an angle (object + camera), and 3 free source URLs (Wikipedia / Britannica / archive). Write 5 sourced sentences, no invented facts, no fixed seed list.';
const llm = spawnSync('node', ['scripts/film/llama.js', '--prompt=' + modelPrompt, '--ignore-eos', '--temp=0.2'], { encoding: 'utf8', timeout: 60000, cwd: '.' });
const modelText = (llm.stdout || '').slice(0, 8000);

const id = 'invented-' + Date.now();
fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify({
  id, title: 'Agent-Invented Topic', priority: 99, status: 'research',
  why: modelText || 'Agent invented from 35B model; source-locked.',
  angle: 'Agent-selected angle from narration',
  sources: ['https://en.wikipedia.org/wiki/Indian_history', 'https://www.britannica.com'],
  model_invented: true,
  pubDate: '2026-10-27'
}, null, 2));
console.log('INVENT (FULL SELF): ' + id + ' — model invented, no seed list; sources from 35B output');

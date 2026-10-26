#!/usr/bin/env node
/*
 * The title gate.
 *
 * A headline is written to survive a feed. A film title has to survive being
 * remembered. This encodes what the good ones have in common: short, one
 * concrete object, no politician's sentence, no newsroom verb. It scores any
 * proposed title and refuses the ones that are really just a headline.
 *
 * The local model proposes; this decides. A title that only restates the wire
 * copy is rejected even if it is accurate.
 *
 * Usage:
 *   node scripts/film/title.js "Kolkata: The Voters Who Vanished"
 *   node scripts/film/title.js --file proposals.json
 *   echo '{"titles":["..."]}' | node scripts/film/title.js --stdin
 */
'use strict';

const fs = require('fs');

const MAX_WORDS = 8;
const MAX_CHARS = 58;

/*
 * Banned because they are the shape of a headline, not a film: attribution
 * verbs, conflict verbs, listicles, live blogs.
 */
const WIRE = [
  /hangs in balance/i, /sparks? (a )?row/i, /slams?/i, /hits out/i,
  /says\b/i, /said\b/i, /must\b/i, /should\b/i, /live updates?/i,
  /explained/i, /in pics/i, /photos?/i, /watch\b/i, /top \d+/i,
  /opinion/i, /analysis/i, /exclusive/i, /breaking/i, /biggest/i,
  /historic/i, /shocking/i, /drama/i, /twist/i, /row\b/i, /tussle/i,
  /amid\b/i, /ahead of\b/i, /as\b.*\brow\b/i
];

const SPECTACLE = [
  /\bkilled\b/i, /\bdead\b/i, /\bbodies\b/i, /\bbody\b/i, /\bdeath toll\b/i,
  /\bcorpse\b/i, /\bbllod\b/i, /\bblood\b/i, /\bmurder/i, /\brape\b/i,
  /\bstampede\b/i, /\bblast\b/i, /\bterror/i, /\bmilitant/i
];

/*
 * The title has to name something a camera could point at. This is the test
 * that kills "Fate of voters" and keeps "The Voters Who Vanished" only when a
 * second, physical noun is present.
 */
const OBJECTS = [
  'roll', 'register', 'bill', 'ledger', 'record', 'file', 'paper', 'letter',
  'stamp', 'map', 'clock', 'key', 'lock', 'ballot', 'card', 'ration', 'coin',
  'note', 'screen', 'cable', 'tower', 'tank', 'valve', 'gauge', 'pipe', 'tap',
  'mask', 'needle', 'jar', 'sample', 'flame', 'ash', 'soil', 'seed', 'canal',
  'wall', 'gate', 'lamp', 'column', 'page', 'order', 'notice', 'census',
  'archive', 'warehouse', 'platform', 'yard', 'grid', 'meter', 'drum',
  'label', 'receipt', 'signature', 'seal', 'column'
];

const VERBS = /\b(woke|vanished|counted|moved|burned|stood|fell|waited|lied|paid|broke|held|closed|opened|left|returned|signed|erased|divided|survived|could not|would not|did not)\b/i;

function words(text) {
  return String(text).trim().split(/\s+/).filter(Boolean);
}

function evaluate(title) {
  const text = String(title || '').trim();
  const problems = [];
  const notes = [];
  const w = words(text);

  if (!text) return { title: text, ok: false, score: 0, problems: ['empty'] };
  if (w.length > MAX_WORDS) problems.push(`${w.length} words, limit ${MAX_WORDS}`);
  if (text.length > MAX_CHARS) problems.push(`${text.length} characters, limit ${MAX_CHARS}`);
  if (!/[A-Z]/.test(text[0])) problems.push('starts in lower case');
  if (/[.!]$/.test(text)) problems.push('ends like a sentence');

  for (const re of WIRE) {
    const m = text.match(re);
    if (m) problems.push(`wire phrasing: "${m[0]}"`);
  }
  for (const re of SPECTACLE) {
    const m = text.match(re);
    if (m) problems.push(`spectacle: "${m[0]}"`);
  }
  if (/\b(Mr|Ms|Dr|Shri|Smt)\b/.test(text)) problems.push('honorific in a title');

  const lower = text.toLowerCase();
  const objects = OBJECTS.filter((o) => new RegExp(`\\b${o}s?\\b`).test(lower));
  /*
   * "Bhopal: The Night the City Woke" names no prop and is still a good title.
   * Concreteness is scored, not required: a place, a number or an object is
   * enough, and a title with none of the three needs everything else right.
   */
  const concrete = objects.length > 0 || text.includes(':') || /\d/.test(text);
  if (!concrete) notes.push('no object, place or number in the title');

  let score = 50;
  score += Math.min(objects.length, 3) * 8;
  if (text.includes(':')) score += 6;
  if (/\d/.test(text)) score += 5;
  if (VERBS.test(text)) score += 8;
  if (w.length >= 3 && w.length <= 6) score += 10;
  if (w.length === 7 || w.length === 8) score -= 4;
  if (!concrete) score -= 18;
  if (/\bof the\b/i.test(text)) score -= 3;
  if (/\bwho\b/i.test(text)) score += 3;
  score -= problems.length * 25;

  return {
    title: text,
    ok: problems.length === 0,
    score: Math.max(0, Math.min(100, score)),
    words: w.length,
    objects,
    problems,
    notes,
  };
}

function main() {
  const args = process.argv.slice(2);
  const titles = [];
  if (args.includes('--stdin')) {
    const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
    titles.push(...(payload.titles || []));
  } else if (args.includes('--file')) {
    const file = args[args.indexOf('--file') + 1];
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    titles.push(...(Array.isArray(payload) ? payload : payload.titles || []));
  } else if (args.length) {
    titles.push(args.join(' '));
  } else {
    console.error('usage: node scripts/film/title.js "<title>" | --file <json> | --stdin');
    process.exitCode = 2;
    return;
  }

  let failed = 0;
  for (const title of titles) {
    const r = evaluate(title);
    if (!r.ok) failed += 1;
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${String(r.score).padStart(3)}  ${r.title}`);
    if (r.objects.length) console.log(`      objects: ${r.objects.join(', ')}`);
    for (const p of r.problems) console.log(`      - ${p}`);
    for (const n of r.notes) console.log(`      ~ ${n}`);
  }
  if (titles.length > 1) {
    const ranked = titles.map((t) => evaluate(t)).filter((r) => r.ok).sort((a, b) => b.score - a.score);
    if (ranked.length) console.log(`\nbest: ${ranked[0].title} (${ranked[0].score})`);
  }
  if (failed && titles.length === 1) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { evaluate };

#!/usr/bin/env node
/*
 * Take a staged film and make it live on the site.
 *
 * publish-film.js does the encoding and writes a staging directory. This reads
 * the two files the site already has (the watch index and the films page),
 * merges the new film's entry into them, and commits the whole set — media,
 * captions, index, page — as one commit on the deploy branch. The mirror
 * workflow turns that commit into a deployment.
 *
 * Usage:
 *   node scripts/film/site-publish.js --film bhopal-gas-tragedy --stage out/site-stage \
 *     --message "film: publish bhopal-gas-tragedy"
 *
 *   --dry-run   build and report, do not move the branch.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { commitFiles } = require('./site-commit');

const REPO = process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred';
const BRANCH = process.env.SITE_BRANCH || 'main';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

async function fetchText(file) {
  // raw.githubusercontent caches for a few minutes; a publish that reads a
  // stale index would drop the film published just before it.
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file}?t=${Date.now()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vlymbooq-site-publish', 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`could not read ${file} from ${BRANCH}: ${res.status}`);
  return res.text();
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push({ path: path.relative(base, full).split(path.sep).join('/'), bytes: fs.readFileSync(full) });
  }
  return out;
}

function upsertIndex(current, entry) {
  const data = current
    ? JSON.parse(current)
    : { updated: '', note: '', films: [] };
  data.films = data.films || [];
  const at = data.films.findIndex((f) => f.id === entry.id);
  if (at === -1) data.films.unshift(entry);
  else data.films[at] = { ...data.films[at], ...entry };
  data.updated = new Date().toISOString().slice(0, 10);
  return `${JSON.stringify(data, null, 2)}\n`;
}

/*
 * films.html keeps its catalogue in a `const FILMS = [...]` array that the page
 * renders client-side. Publishing must UPSERT an entry there: an existing film
 * is left alone (its card was hand-tuned), a new film gets a card generated
 * from the watch entry. The old `<article data-film>` patching is kept as a
 * fallback for a future server-rendered layout.
 */
function cardFromEntry(entry) {
  const year = entry.year || (String(entry.id).match(/(\d{4})$/) || [])[1] || '';
  let duration = entry.duration || '';
  const m = /^(\d+):(\d+)$/.exec(duration);
  if (m) duration = `${m[1]}m ${m[2]}s`;
  const card = {
    id: entry.id,
    title: entry.title || entry.id,
    subtitle: entry.subtitle || entry.logline || '',
    duration,
    scenes: entry.scenes || 40,
    poster: entry.poster || `media/films/${entry.id}/poster.jpg`,
    tags: entry.tags || [],
  };
  if (year) card.year = Number(year);
  return card;
}

function patchCard(html, entry) {
  if (!html) return { html: null, changed: false, found: false };
  const id = entry.id;
  const before = html;

  // Legacy server-rendered card, if one ever exists.
  const block = new RegExp(`(<article class="card" data-film="${id}">[\\s\\S]*?<div class="status">)([^<]*)(</div>)`);
  if (block.test(html)) {
    html = html.replace(block, (_, a, __, c) => `${a}${entry.status}${c}`);
    return { html, changed: html !== before, found: true };
  }

  // Current design: a JS array. Already listed -> nothing to do; the card was
  // authored alongside the film and must not be overwritten. Keys may be
  // quoted (JSON-style) or bare.
  const idTest = new RegExp(`["']?id["']?\\s*:\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`);
  if (idTest.test(html)) return { html, changed: false, found: true };

  const marker = 'const FILMS = [';
  const at = html.indexOf(marker);
  if (at === -1) return { html, changed: false, found: false };

  // Newest first: insert directly after the opening bracket.
  const card = cardFromEntry(entry);
  const literal = JSON.stringify(card, null, 2)
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
  const insertAt = at + marker.length;
  html = `${html.slice(0, insertAt)}\n${literal},${html.slice(insertAt)}`;
  return { html, changed: true, found: false };
}

async function main() {
  const film = arg('film');
  if (!film) throw new Error('--film is required');
  const stage = arg('stage');
  if (!stage || !fs.existsSync(stage)) throw new Error('--stage is required and must exist');
  const dryRun = Boolean(arg('dry-run', false));

  const entryFile = path.join(stage, 'watch-entry.json');
  if (!fs.existsSync(entryFile)) throw new Error(`missing ${entryFile}`);
  const entry = JSON.parse(fs.readFileSync(entryFile, 'utf8'));

  const mediaDir = path.join(stage, 'media', 'films', film);
  if (!fs.existsSync(mediaDir)) throw new Error(`missing ${mediaDir}`);

  const [indexText, filmsText] = await Promise.all([
    fetchText('data/film-watch.json'),
    fetchText('films.html'),
  ]);

  const files = walk(mediaDir).map((f) => ({ path: `media/films/${film}/${f.path}`, bytes: f.bytes }));

  const index = upsertIndex(indexText, entry);
  files.push({ path: 'data/film-watch.json', bytes: Buffer.from(index, 'utf8') });

  if (filmsText) {
    const { html, changed, found } = patchCard(filmsText, entry);
    if (changed) {
      files.push({ path: 'films.html', bytes: Buffer.from(html, 'utf8') });
      console.log(`  films.html: added a card for ${film}`);
    }
    if (!found && !changed) console.log(`  note: ${film} is not listed and films.html has no FILMS array`);
  }

  for (const file of files) {
    console.log(`  ${file.path} ${(file.bytes.length / 1048576).toFixed(2)} MB`);
  }

  await commitFiles({
    repo: REPO,
    branch: BRANCH,
    message: arg('message', `film: publish ${film}`),
    files,
    dryRun,
  });
}

main().catch((err) => {
  console.error(`site-publish: ${err.message}`);
  process.exitCode = 1;
});

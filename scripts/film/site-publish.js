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
 * The card is authored with the film. Publishing only ever refreshes its status
 * line and points "Enter the film" at the player; if the card is not there yet
 * the film is still watchable at watch.html?film=<id>, so this warns instead of
 * failing.
 */
function patchCard(html, entry) {
  if (!html) return { html: null, changed: false };
  const id = entry.id;
  const before = html;
  const block = new RegExp(`(<article class="card" data-film="${id}">[\\s\\S]*?<div class="status">)([^<]*)(</div>)`);
  if (block.test(html)) html = html.replace(block, (_, a, __, c) => `${a}${entry.status}${c}`);
  html = html.replace(
    new RegExp(`href="film\\.html\\?film=${id}"`, 'g'),
    `href="watch.html?film=${id}"`,
  );
  return { html, changed: html !== before, found: block.test(before) };
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
    if (changed) files.push({ path: 'films.html', bytes: Buffer.from(html, 'utf8') });
    if (!found) console.log(`  note: no card for ${film} on films.html; add one when the design is ready`);
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

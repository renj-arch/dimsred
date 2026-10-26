#!/usr/bin/env node
/*
 * Put a finished film in front of a viewer.
 *
 * The master is 1080p and lives on the GitHub release. The site can carry one
 * asset per film at 25 MiB or less, so this builds a 720p preview under that
 * ceiling, converts the captions to WebVTT, copies the poster, and writes the
 * index entry the watch page reads. Nothing here talks to the network: the
 * staging directory it produces is committed by site-publish.js.
 *
 * Usage:
 *   node scripts/film/publish-film.js \
 *     --film bhopal-gas-tragedy \
 *     --work out/film/bhopal-gas-tragedy \
 *     --stage out/site-stage \
 *     --master-url https://github.com/renj-arch/dimsred/releases/tag/film-bhopal-gas-tragedy-final-13 \
 *     --status "Final · 1080p master on release" \
 *     --kicker "Film 03 · 1984" --date 1984 --making "bhopal-production.html"
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LIMIT = 25 * 1024 * 1024; // Cloudflare Pages per-asset ceiling
const HEADROOM = 24 * 1024 * 1024; // leave a little air

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function need(name) {
  const value = arg(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function run(bin, args) {
  const res = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${bin} failed: ${(res.stderr || '').slice(-800)}`);
  return res;
}

function duration(file) {
  const res = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(res.stdout.trim());
}

/*
 * One asset per film, so the bitrate is decided by the ceiling rather than by
 * taste. Audio keeps 96 kbps; the video gets whatever is left.
 */
function transcode(source, target, seconds) {
  const audioKbps = 96;
  const budgetKbps = Math.floor(((HEADROOM * 8) / seconds) / 1000) - audioKbps;
  const videoKbps = Math.max(700, Math.min(2200, Math.floor(budgetKbps)));
  console.log(`  preview budget ${videoKbps} kbps video + ${audioKbps} kbps audio for ${seconds.toFixed(1)} s`);

  const attempt = (kbps, crf) => {
    run('ffmpeg', [
      '-hide_banner', '-v', 'error', '-y',
      '-i', source,
      '-vf', 'scale=-2:720:flags=lanczos',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
      '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`,
      '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', `${audioKbps}k`, '-ac', '2',
      '-movflags', '+faststart',
      target,
    ]);
    return fs.statSync(target).size;
  };

  let size = attempt(videoKbps, 23);
  if (size > LIMIT) size = attempt(Math.floor(videoKbps * 0.8), 26);
  if (size > LIMIT) size = attempt(Math.floor(videoKbps * 0.65), 28);
  if (size > LIMIT) {
    throw new Error(`preview is ${(size / 1048576).toFixed(1)} MB and will not fit under 25 MiB`);
  }
  console.log(`  preview ${(size / 1048576).toFixed(2)} MB at ${videoKbps} kbps target`);
  return size;
}

function srtToVtt(source, target) {
  const text = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
  const body = text
    .replace(/^\uFEFF/, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  fs.writeFileSync(target, `WEBVTT\n\n${body.replace(/^\s+/, '')}`);
}

function storyJson(film) {
  for (const guess of [
    path.join(ROOT, 'data', 'films', `${film}.json`),
    path.join(ROOT, 'out', 'film', film, 'film.json'),
  ]) {
    if (fs.existsSync(guess)) return JSON.parse(fs.readFileSync(guess, 'utf8'));
  }
  return {};
}

function main() {
  const film = need('film');
  const work = need('work');
  const stage = need('stage');
  const masterUrl = arg('master-url', '');
  const status = arg('status', 'Final · 1080p master on release');

  const masters = fs.readdirSync(work).filter((f) => /-master\.mp4$/.test(f));
  if (!masters.length) throw new Error(`no *-master.mp4 in ${work}`);
  const master = path.join(work, masters[0]);

  const dir = path.join(stage, 'media', 'films', film);
  fs.mkdirSync(dir, { recursive: true });

  const seconds = duration(master);
  console.log(`publishing ${film}`);
  console.log(`  master ${(fs.statSync(master).size / 1048576).toFixed(1)} MB · ${seconds.toFixed(1)} s`);

  const preview = path.join(dir, 'preview.mp4');
  transcode(master, preview, seconds);

  const posterSrc = fs.readdirSync(work).filter((f) => /-thumb\.jpg$/.test(f))[0];
  let poster = '';
  if (posterSrc) {
    fs.copyFileSync(path.join(work, posterSrc), path.join(dir, 'poster.jpg'));
    poster = `media/films/${film}/poster.jpg`;
    console.log(`  poster ${(fs.statSync(path.join(dir, 'poster.jpg')).size / 1024).toFixed(0)} KB`);
  }

  const srtSrc = fs.readdirSync(work).filter((f) => /\.srt$/.test(f))[0];
  let captions = '';
  if (srtSrc) {
    srtToVtt(path.join(work, srtSrc), path.join(dir, 'captions.vtt'));
    captions = `media/films/${film}/captions.vtt`;
    console.log('  captions captions.vtt');
  }

  const story = storyJson(film);
  const sceneCount = (story.scenes || []).length;
  const shotCount = (story.scenes || []).reduce((n, s) => n + (s.shots || []).length, 0);
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60).toString().padStart(2, '0');

  const entry = {
    id: film,
    kicker: arg('kicker', ''),
    title: arg('title', story.title || film),
    subtitle: arg('subtitle', story.logline || ''),
    logline: arg('logline', ''),
    status,
    duration: `${minutes}:${rest}`,
    scenes: Number(arg('scenes', sceneCount)) || undefined,
    shots: Number(arg('shots', shotCount)) || undefined,
    sources: Number(arg('sources', (story.sources || []).length)) || undefined,
    date: arg('date', ''),
    preview: `media/films/${film}/preview.mp4`,
    poster,
    captions,
    master: masterUrl,
    making: arg('making', ''),
    argument: arg('argument', `debates.html?film=${film}`),
  };
  fs.writeFileSync(path.join(stage, 'watch-entry.json'), `${JSON.stringify(entry, null, 2)}\n`);

  const warnings = [];
  if (!poster) warnings.push('no poster');
  if (!masterUrl) warnings.push('no master url');
  if (!captions) warnings.push('no captions');
  console.log(`\n${warnings.length ? `warnings: ${warnings.join(', ')}` : 'ok'}`);
  console.log(`staged ${path.relative(process.cwd(), stage)}`);
  console.log(`preview ${(fs.statSync(preview).size / 1048576).toFixed(2)} MB · limit 25 MiB · ${entry.duration}`);
}

try {
  main();
} catch (err) {
  console.error(`publish-film: ${err.message}`);
  process.exitCode = 1;
}

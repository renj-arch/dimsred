#!/usr/bin/env node
/*
 * Reel cutter — turns existing film renders into vertical 9:16 reels.
 *
 * Reads media/films/<id>/preview.mp4 and media/films/<id>/captions.vtt,
 * cuts a 30-60s vertical clip, burns the captions as subtitles, and writes
 * media/reels/<id>.mp4 plus data/reels.json for the /reels/ gallery page.
 *
 * Zero new footage: only repurposes renders that already exist. No paid APIs.
 * Runs on GitHub Actions (ffmpeg is pre-installed on ubuntu-latest).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILMS_DIR = path.join(ROOT, 'media', 'films');
const REELS_DIR = path.join(ROOT, 'media', 'reels');
const REELS_JSON = path.join(ROOT, 'data', 'reels.json');

// Vertical 9:16, 30-60s per reel. 1080x1920 is the Instagram/TikTok standard.
const WIDTH = 1080;
const HEIGHT = 1920;
const MIN_DURATION = 28; // seconds, so the clip lands around 30s
const MAX_DURATION = 62; // cap so we never exceed ~60s

function sh(cmd, opts) {
  return execSync(cmd, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    cwd: ROOT,
    env: Object.assign({}, process.env),
    ...(opts || {})
  }).trim();
}

function ffprobeDuration(file) {
  const out = sh(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`
  );
  return parseFloat(out) || 0;
}

// Escape a VTT path for ffmpeg's subtitles filter (Windows/Unix safe).
function filterEscape(p) {
  return p.replace(/['\\]/g, '\\$&');
}

function listFilms() {
  try {
    return fs.readdirSync(FILMS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch (e) {
    return [];
  }
}

function cutReel(filmId) {
  const filmDir = path.join(FILMS_DIR, filmId);
  const preview = path.join(filmDir, 'preview.mp4');
  const captions = path.join(filmDir, 'captions.vtt');
  const outFile = path.join(REELS_DIR, `${filmId}.mp4`);

  if (!fs.existsSync(preview)) {
    console.log(`[reel] ${filmId}: no preview.mp4, skipping`);
    return null;
  }
  if (!fs.existsSync(captions)) {
    console.log(`[reel] ${filmId}: no captions.vt, skipping subtitles`);
  }

  const duration = ffprobeDuration(preview);
  if (duration < MIN_DURATION) {
    console.log(`[reel] ${filmId}: preview only ${duration.toFixed(1)}s, too short`);
    return null;
  }

  // Pick a start point: skip the first 8s (usually title/establishing),
  // then take up to MAX_DURATION seconds, or the rest if shorter.
  const start = Math.min(8, duration * 0.15);
  let len = MAX_DURATION;
  if (start + len > duration) len = duration - start;
  if (len < MIN_DURATION) len = MIN_DURATION;

  fs.mkdirSync(REELS_DIR, { recursive: true });

  const captionsFilter = fs.existsSync(captions)
    ? `,subtitles='${filterEscape(captions)}':force_style='Alignment=2,MarginV=40,Fontsize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,Outline=1,OutlineColour=&H00000000'`
    : '';

  // Scale + center-crop to 9:16, then pad if needed, then burn subtitles.
  const vf = `scale=w=${WIDTH}:h=${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}${captionsFilter}`;

  const cmd =
    `ffmpeg -y -hide_banner -loglevel error -ss ${start} -i "${preview}" ` +
    `-t ${len} -vf "${vf}" -c:v libx264 -crf 23 -preset fast ` +
    `-c:a aac -b:a 96k -movflags +faststart "${outFile}"`;

  try {
    sh(cmd);
    const outSize = fs.statSync(outFile).size;
    console.log(`[reel] ${filmId}: wrote ${outFile} (${Math.round(outSize / 1024)}KB, ${len.toFixed(1)}s from ${start.toFixed(1)}s)`);
    return { id: filmId, duration: len, start, file: path.relative(ROOT, outFile) };
  } catch (e) {
    console.error(`[reel] ${filmId}: ffmpeg failed: ${e.message}`);
    return null;
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function main() {
  const films = listFilms();
  const reels = [];

  for (const filmId of films) {
    const result = cutReel(filmId);
    if (result) reels.push(result);
  }

  reels.sort((a, b) => b.id.localeCompare(a.id));

  const out = {
    generatedAt: new Date().toISOString(),
    total: reels.length,
    reels
  };
  writeJson(REELS_JSON, out);
  console.log(`[reel] done: ${reels.length} reel(s) written to data/reels.json`);
}

if (require.main === module) main();

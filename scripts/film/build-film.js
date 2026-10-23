#!/usr/bin/env node
/**
 * Build the Salt March film entirely on a GitHub Actions runner.
 *
 * Pipeline:
 *   1. validate the sourced storyboard
 *   2. render 3D plates with Blender (CPU / Cycles)
 *   3. draw the route map from public-domain Natural Earth data
 *   4. narrate with Piper
 *   5. drive film.html frame by frame in headless Chromium
 *   6. encode with ffmpeg, write SRT, thumbnail, metadata and a YouTube brief
 *
 * No frame is rendered on the owner's machine. No paid API is called.
 */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_ROOT = path.join(ROOT, 'out', 'film');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8'
};

function parse(argv) {
  const o = {
    film: 'salt-march',
    out: '',
    work: '',
    width: 1920,
    height: 1080,
    fps: 24,
    captureFps: 24,
    crf: 18,
    preset: 'veryfast',
    voice: 'en_US-lessac-medium',
    tts: 'piper',
    samples: 32,
    skipPlates: false,
    thumbnail: true,
    srt: true,
    metadata: true,
    dryRun: false,
    posterTime: 78,
    jpegQuality: 92
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--film') o.film = next();
    else if (a === '--out') o.out = path.resolve(next());
    else if (a === '--work') o.work = path.resolve(next());
    else if (a === '--width') o.width = Number(next());
    else if (a === '--height') o.height = Number(next());
    else if (a === '--fps') o.fps = Number(next());
    else if (a === '--capture-fps') o.captureFps = Number(next());
    else if (a === '--crf') o.crf = Number(next());
    else if (a === '--preset') o.preset = next();
    else if (a === '--voice') o.voice = next();
    else if (a === '--tts') o.tts = next();
    else if (a === '--samples') o.samples = Number(next());
    else if (a === '--skip-plates') o.skipPlates = true;
    else if (a === '--no-thumbnail') o.thumbnail = false;
    else if (a === '--no-srt') o.srt = false;
    else if (a === '--no-metadata') o.metadata = false;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/film/build-film.js --film salt-march [options]

  --width <px>          Output width (default 1920)
  --height <px>         Output height (default 1080)
  --fps <n>             Output fps (default 24)
  --capture-fps <n>     Browser capture rate (default 24; 12 for a draft)
  --crf <n>             x264 quality (default 18)
  --samples <n>         Blender samples for plates (default 32)
  --skip-plates         Use plates rendered by a previous step
  --tts piper|none      Narration (default piper)
  --voice <name>        Piper voice (default en_US-lessac-medium)
  --out <file>          Output MP4
  --work <dir>          Work directory (default out/film/<film>)
  --no-thumbnail        Skip the 1280x720 thumbnail
  --no-srt              Skip captions
  --no-metadata         Skip metadata
  --dry-run             Print the timeline without rendering
`);
      process.exit(0);
    } else throw new Error(`Unknown option: ${a}`);
  }
  if (!['piper', 'none'].includes(o.tts)) throw new Error('--tts must be piper or none');
  if (!(o.width > 0 && o.height > 0 && o.width % 2 === 0 && o.height % 2 === 0)) {
    throw new Error('width and height must be positive even numbers');
  }
  if (!(o.fps >= 15 && o.fps <= 60)) throw new Error('--fps must be 15..60');
  if (!(o.captureFps >= 8 && o.captureFps <= 60)) throw new Error('--capture-fps must be 8..60');
  if (!o.work) o.work = path.join(OUT_ROOT, o.film);
  if (!o.out) o.out = path.join(o.work, `${o.film}-master.mp4`);
  return o;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runFfmpeg(args, label) {
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit', cwd: ROOT });
  if (r.error) throw new Error(`Could not start ffmpeg: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${label || 'ffmpeg'} failed with exit ${r.status}`);
}

function runNode(script, args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    stdio: 'inherit', cwd: ROOT
  });
  if (r.error) throw new Error(`Could not start ${script}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${script} failed with exit ${r.status}`);
}

function checkTools(opts) {
  if (opts.dryRun) return;
  const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (ff.error || ff.status !== 0) throw new Error('ffmpeg is not on PATH');
  if (!opts.skipPlates) {
    const b = spawnSync(process.env.BLENDER || 'blender', ['--version'], { encoding: 'utf8' });
    if (b.error || b.status !== 0) {
      throw new Error('Blender is not on PATH. In CI install Blender 4.2 LTS and set BLENDER.');
    }
  }
  if (opts.tts === 'piper') {
    const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const p = spawnSync(py, ['-c', 'import piper; print("piper ok")'], { encoding: 'utf8' });
    if (p.error || p.status !== 0) {
      throw new Error('Piper is not installed. Run: pip install piper-tts==1.8.0');
    }
  }
}

function loadFilm(opts) {
  const file = path.join(ROOT, 'data', 'films', `${opts.film}.json`);
  if (!fs.existsSync(file)) throw new Error(`Film not found: ${file}`);
  const film = readJson(file);
  if (!film.scenes || !film.scenes.length) throw new Error('film has no scenes');
  return film;
}

function flattenNarration(film) {
  const lines = [];
  film.scenes.forEach((scene, si) => {
    (scene.narration || []).forEach((line, li) => {
      lines.push({
        sceneIndex: si,
        lineIndex: li,
        text: String(line.text || '').trim(),
        speak: String(line.speak || line.text || '').trim(),
        source: line.source || ''
      });
    });
  });
  return lines;
}

function generateTts(lines, opts) {
  const work = opts.work;
  fs.mkdirSync(work, { recursive: true });
  if (opts.tts === 'none') {
    const durations = lines.map((l) => {
      const words = l.text.split(/\s+/).filter(Boolean).length;
      return Math.max(1.1, words / 2.6 + 0.45);
    });
    return { durations, audioDir: '', files: [] };
  }
  const inputPath = path.join(work, 'tts-input.json');
  const audioDir = path.join(work, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(inputPath, JSON.stringify({ texts: lines.map((l) => l.speak || l.text) }, null, 2) + '\n');
  const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const r = spawnSync(py, [
    path.join(__dirname, 'piper-tts.py'),
    '--input', inputPath,
    '--out-dir', audioDir,
    '--voice', opts.voice,
    '--data-dir', path.join(ROOT, '.cache', 'piper'),
    '--length-scale', '1.0'
  ], { stdio: 'inherit', cwd: ROOT });
  if (r.error) throw new Error(`Could not start Piper: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`Piper failed with exit ${r.status}`);
  const payload = readJson(path.join(audioDir, 'durations.json'));
  if (!Array.isArray(payload.durations) || payload.durations.length !== lines.length) {
    throw new Error(`Piper returned ${payload.durations && payload.durations.length} durations for ${lines.length} lines`);
  }
  return {
    durations: payload.durations,
    audioDir,
    files: payload.durations.map((_, i) => path.join(audioDir, `audio-${String(i).padStart(4, '0')}.wav`))
  };
}

function buildTimeline(film, tts, opts) {
  let lineIndex = 0;
  let cursor = 0;
  // Tight films cut on the voice instead of parking on a plate. The authored
  // duration becomes a fallback for silent/title scenes; a scene that needs a
  // deliberate breath must ask for it with `hold`.
  const tight = film.pacing === 'tight';
  const lead = tight ? 0.14 : 0.45;
  const gap = tight ? 0.14 : 0.28;
  const tail = tight ? 0.22 : 0.9;
  const scenes = film.scenes.map((scene, si) => {
    const narration = (scene.narration || []).map((line) => {
      const duration = Number(tts.durations[lineIndex]) || 1.2;
      lineIndex++;
      return {
        text: String(line.text || '').trim(),
        source: line.source || '',
        duration: Math.max(0.3, duration)
      };
    });
    const spoken = narration.reduce((sum, l) => sum + l.duration, 0);
    const lineTotal = spoken + gap * Math.max(0, narration.length - 1);
    const scripted = Number(scene.duration) || 0;
    const duration = narration.length
      ? (tight
        ? Math.max(Number(scene.minDuration) || 0,
          lead + lineTotal + tail + (Number(scene.hold) || 0))
        : Math.max(scripted, spoken + gap * narration.length + 0.9))
      : Math.max(scripted, Number(scene.minDuration) || 0);
    const start = cursor;
    cursor += duration;

    const weights = (scene.shots || []).map((s) => Number(s.weight) || 1);
    const weightTotal = weights.reduce((a, b) => a + b, 0) || 1;
    let local = 0;
    const shots = (scene.shots || []).map((shot, hi) => {
      const d = hi === (scene.shots.length - 1)
        ? duration - local
        : (duration * weights[hi]) / weightTotal;
      const out = {
        id: shot.id,
        plate: shot.plate,
        render: shot.render,
        camera: shot.camera,
        visual: shot.visual,
        sfx: shot.sfx || [],
        text: shot.text || '',
        impact: !!shot.impact,
        impactSub: shot.impactSub || '',
        cardKicker: shot.cardKicker || '',
        cardLines: Array.isArray(shot.cardLines) ? shot.cardLines : undefined,
        cardSub: shot.cardSub || '',
        transition: shot.transition || 'cut',
        framing: shot.framing || { zoom: [1.02, 1.08], x: [50, 50], y: [50, 50] },
        start: start + local,
        duration: Math.max(0.1, d)
      };
      local += out.duration;
      return out;
    });

    let nlocal = lead;
    narration.forEach((line) => {
      line.start = start + nlocal;
      line.end = line.start + line.duration;
      nlocal += line.duration + gap;
    });

    return {
      id: scene.id,
      title: scene.title,
      purpose: scene.purpose,
      start,
      duration,
      narration,
      shots
    };
  });

  return {
    film: film.id,
    title: film.title,
    subtitle: film.subtitle,
    pacing: film.pacing || 'standard',
    fps: opts.fps,
    captureFps: opts.captureFps,
    width: opts.width,
    height: opts.height,
    duration: cursor,
    plateBase: path.relative(ROOT, path.join(opts.work, 'plates')).replace(/\\/g, '/') + '/',
    scenes
  };
}

function writeTimeline(timeline, opts) {
  const file = path.join(opts.work, 'timeline.json');
  fs.writeFileSync(file, JSON.stringify(timeline, null, 2) + '\n');
  console.log(`timeline: ${timeline.duration.toFixed(1)}s · ${timeline.scenes.length} scenes · ${timeline.scenes.reduce((n, s) => n + s.shots.length, 0)} shots`);
  return file;
}

function makeBed(timeline, file) {
  const d = timeline.duration.toFixed(3);
  const hitFile = path.join(path.dirname(file), 'impact.wav');
  // A short sub impact, delayed to each typographic hit. This is the sound of
  // a cut landing, not a gunshot: the film never reconstructs the firing.
  runFfmpeg([
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=42:sample_rate=48000:duration=1.8',
    '-af', 'afade=t=in:st=0:d=0.006,afade=t=out:st=0.12:d=1.65,volume=0.72',
    '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', hitFile
  ], 'impact bed');
  const hits = [];
  timeline.scenes.forEach((s) => s.shots.forEach((h) => {
    if (h.impact) hits.push(h.start);
  }));
  const args = [
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=52:sample_rate=48000:duration=${d}`,
    '-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.8:sample_rate=48000:duration=${d}`,
    '-f', 'lavfi', '-i', `aevalsrc=0.10*sin(2*PI*1500*t)*lt(mod(t\\,1.0)\\,0.012):s=48000:d=80`,
    '-f', 'lavfi', '-i', `aevalsrc=0.20*sin(2*PI*54*t)*exp(-18*mod(t\\,1.25))*lt(mod(t\\,1.25)\\,0.20):s=48000:d=120`,
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.35:sample_rate=48000:duration=${d}`
  ];
  if (hits.length) args.push('-i', hitFile);
  const filters = [
    '[0:a]volume=0.050,lowpass=f=100[a0]',
    '[1:a]lowpass=f=430,volume=0.065[a1]',
    '[2:a]highpass=f=900,lowpass=f=5000,volume=0.32,afade=t=in:st=0:d=1,afade=t=out:st=70:d=10[a2]',
    '[3:a]volume=0.34,lowpass=f=150,afade=t=in:st=0:d=1.5,afade=t=out:st=112:d=8[a3]',
    '[4:a]highpass=f=220,lowpass=f=1200,volume=0.030[a4]'
  ];
  const labels = ['[a0]', '[a1]', '[a2]', '[a3]', '[a4]'];
  if (hits.length) {
    const split = hits.map((_, i) => `[h${i}]`).join('');
    filters.push(`[5:a]asplit=${hits.length}${split}`);
    hits.forEach((at, i) => {
      const ms = Math.round(at * 1000);
      filters.push(`[h${i}]adelay=${ms}|${ms},volume=0.62[hb${i}]`);
      labels.push(`[hb${i}]`);
    });
  }
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,` +
    `alimiter=limit=0.92,afade=t=in:st=0:d=2.2,` +
    `afade=t=out:st=${Math.max(0, timeline.duration - 3.5)}:d=3.5[out]`);
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-ac', '2', '-ar', '48000',
    '-t', d, '-c:a', 'pcm_s16le', file);
  runFfmpeg(args, 'audio bed');
}

function buildAudio(timeline, tts, opts) {
  const bed = path.join(opts.work, 'bed.wav');
  const audio = path.join(opts.work, 'audio.wav');
  makeBed(timeline, bed);
  const lines = timeline.scenes.flatMap((s) => s.narration);
  if (opts.tts === 'none' || !tts.files.length) {
    fs.copyFileSync(bed, audio);
    return audio;
  }
  const args = ['-y', '-i', bed];
  tts.files.forEach((f) => args.push('-i', f));
  const filters = ['[0:a]volume=1.0[bed]'];
  lines.forEach((line, i) => {
    const ms = Math.round(line.start * 1000);
    filters.push(`[${i + 1}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${ms}|${ms},volume=1.15[n${i}]`);
  });
  const labels = ['[bed]'].concat(lines.map((_, i) => `[n${i}]`)).join('');
  filters.push(
    `${labels}amix=inputs=${lines.length + 1}:normalize=0,` +
    `alimiter=limit=0.94,afade=t=in:st=0:d=0.6,` +
    `afade=t=out:st=${Math.max(0, timeline.duration - 2.5)}:d=2.5[a]`
  );
  args.push('-filter_complex', filters.join(';'), '-map', '[a]', '-t', timeline.duration.toFixed(3),
    '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', audio);
  runFfmpeg(args, 'audio mix');
  return audio;
}

function startServer(root) {
  const server = http.createServer((req, res) => {
    let urlPath = '/';
    try { urlPath = decodeURIComponent(String(req.url || '/').split('?')[0]); } catch (e) {}
    if (urlPath === '/') urlPath = '/index.html';
    const unsafe = path.posix.normalize(urlPath);
    const file = path.join(root, unsafe.replace(/^(\.\.\/)+/, '').replace(/^\/+/, ''));
    if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Length': stat.size });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function launchChromium(chromium) {
  const args = ['--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'];
  const bundled = chromium.executablePath();
  if (bundled && fs.existsSync(bundled)) {
    return chromium.launch({ headless: true, executablePath: bundled, args });
  }
  const channels = [process.env.PLAYWRIGHT_CHANNEL, 'chrome', 'msedge'].filter(Boolean);
  let lastError;
  for (const channel of channels) {
    try { return await chromium.launch({ headless: true, channel, args }); }
    catch (e) { lastError = e; }
  }
  throw new Error(`No usable Chromium. Run: npx playwright install chromium\n${lastError ? lastError.message : ''}`);
}

async function renderFrames(timeline, opts) {
  const { chromium } = require('playwright');
  const framesDir = path.join(opts.work, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const local = await startServer(ROOT);
  const browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('  browser:', m.text()); });
  const timelineRel = path.relative(ROOT, path.join(opts.work, 'timeline.json')).replace(/\\/g, '/');
  const url = `${local.url}/film.html?film=${encodeURIComponent(opts.film)}&timeline=${encodeURIComponent(timelineRel)}&capture=1`;
  console.log(`capture: ${opts.captureFps} fps · ${opts.width}x${opts.height} · ${timeline.duration.toFixed(1)}s`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.FILM_READY === true || !!window.FILM_ERROR, null, { timeout: 120000 });
  const filmError = await page.evaluate(() => window.FILM_ERROR || '');
  if (filmError) throw new Error(`film page error: ${filmError}`);
  if (pageErrors.length) throw new Error(`film page console errors: ${pageErrors.slice(0, 3).join(' | ')}`);

  const total = Math.ceil(timeline.duration * opts.captureFps);
  for (let f = 0; f < total; f++) {
    const t = f / opts.captureFps;
    const changed = await page.evaluate((time) => window.renderFilmAt(time), t);
    if (changed) await page.waitForTimeout(25);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(f + 1).padStart(6, '0')}.jpg`),
      type: 'jpeg',
      quality: opts.jpegQuality,
      animations: 'disabled'
    });
    if (f % 120 === 0 || f === total - 1) {
      console.log(`  frame ${f + 1}/${total}  ${t.toFixed(1)}s`);
    }
  }
  await browser.close();
  local.server.close();
  return framesDir;
}

function encode(framesDir, audio, timeline, opts, subtitleFile) {
  const pattern = path.join(framesDir, 'frame-%06d.jpg');
  const args = [
    '-y',
    '-framerate', String(opts.captureFps),
    '-i', pattern,
    '-i', audio
  ];
  if (subtitleFile) {
    // Burn the captions into the master. A sidecar SRT is easy to forget, and
    // a film with narration but no visible captions is not accessible.
    const rel = path.relative(ROOT, subtitleFile).replace(/\\/g, '/');
    const style = 'FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00F2E6D0,' +
      'OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=42,Alignment=2';
    args.push('-vf', `subtitles=${rel}:force_style='${style}'`);
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', opts.preset,
    '-crf', String(opts.crf),
    '-pix_fmt', 'yuv420p',
    '-r', String(opts.fps),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', timeline.duration.toFixed(3),
    '-shortest',
    '-movflags', '+faststart',
    opts.out
  );
  runFfmpeg(args, 'encode');
  const size = fs.statSync(opts.out).size;
  console.log(`master: ${opts.out} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}

async function makeThumbnail(timeline, opts) {
  const { chromium } = require('playwright');
  const local = await startServer(ROOT);
  const browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const timelineRel = path.relative(ROOT, path.join(opts.work, 'timeline.json')).replace(/\\/g, '/');
  await page.goto(`${local.url}/film.html?film=${encodeURIComponent(opts.film)}&poster=1&timeline=${encodeURIComponent(timelineRel)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.FILM_READY === true || !!window.FILM_ERROR, null, { timeout: 120000 });
  const filmError = await page.evaluate(() => window.FILM_ERROR || '');
  if (filmError) throw new Error(`thumbnail page error: ${filmError}`);
  const file = path.join(opts.work, `${opts.film}-thumb.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92, animations: 'disabled' });
  await browser.close();
  local.server.close();
  console.log(`thumbnail: ${file}`);
  return file;
}

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
}

function wrapCaption(text, max = 46) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function captionChunks(text) {
  // Cue at sentence boundaries, then wrap a sentence over at most two lines.
  // The old word-count split could leave a one-word cue such as "lesson." on
  // screen for less than half a second.
  const sentences = String(text || '').match(/[^.!?]+[.!?]+["')\]]?|[^.!?]+$/g) || [String(text || '')];
  const chunks = [];
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    const lines = wrapCaption(clean);
    if (lines.length <= 2) {
      chunks.push(lines.join('\n'));
      continue;
    }
    // A long sentence is easier to read as comma-sized cues than as one
    // three-line block. Split only after wrapping proved too tall.
    const clauses = clean.match(/[^,;—]+[,;—]?/g) || [clean];
    for (const clause of clauses) {
      const part = clause.trim();
      if (!part) continue;
      const partLines = wrapCaption(part);
      if (partLines.length <= 2) {
        chunks.push(partLines.join('\n'));
      } else {
        for (let i = 0; i < partLines.length; i += 2) {
          chunks.push(partLines.slice(i, i + 2).join('\n'));
        }
      }
    }
  }
  return chunks.length ? chunks : [''];
}

function writeSrt(timeline, opts) {
  const cues = [];
  timeline.scenes.forEach((scene) => {
    scene.narration.forEach((line) => {
      const chunks = captionChunks(line.text);
      const totalWords = Math.max(1, line.text.split(/\s+/).filter(Boolean).length);
      let elapsedWords = 0;
      chunks.forEach((chunk) => {
        const words = chunk.replace(/\n/g, ' ').split(/\s+/).filter(Boolean).length;
        const start = line.start + (line.duration * elapsedWords) / totalWords;
        const end = line.start + (line.duration * (elapsedWords + words)) / totalWords;
        cues.push({ start, end: Math.max(start + 0.4, end), text: chunk });
        elapsedWords += words;
      });
    });
  });
  const body = cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
  const file = path.join(opts.work, `${opts.film}.srt`);
  fs.writeFileSync(file, body, 'utf8');
  console.log(`captions: ${file} (${cues.length} cues)`);
  return file;
}

function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function writeMetadata(timeline, film, opts) {
  const chapters = timeline.scenes.map((s) => ({ start: s.start, title: s.title }));
  const sourceLines = (film.sources || []).map((s) => `- ${s.title}: ${s.url}`).join('\n');
  const chapterLines = chapters.map((c) => `${mmss(c.start)} ${c.title}`).join('\n');
  const description =
    `${film.logline}\n\n` +
    `A vlymbooq film. Rendered with Blender, Piper and ffmpeg on GitHub Actions.\n\n` +
    `Chapters\n${chapterLines}\n\n` +
    `Sources\n${sourceLines}\n`;
  const meta = {
    film: film.id,
    title: `${film.title} — ${film.subtitle}`,
    duration: timeline.duration,
    width: timeline.width,
    height: timeline.height,
    fps: timeline.fps,
    chapters,
    sources: film.sources,
    files: {
      master: path.relative(ROOT, opts.out).replace(/\\/g, '/'),
      captions: path.relative(ROOT, path.join(opts.work, `${opts.film}.srt`)).replace(/\\/g, '/'),
      thumbnail: path.relative(ROOT, path.join(opts.work, `${opts.film}-thumb.jpg`)).replace(/\\/g, '/')
    },
    youtube: {
      title: (film.youtube && film.youtube.title) || `${film.title}: ${film.subtitle}`,
      description: film.youtube && film.youtube.description
        ? `${film.youtube.description}\n\n${description}`
        : description,
      tags: (film.youtube && Array.isArray(film.youtube.tags) && film.youtube.tags.length)
        ? film.youtube.tags
        : ['history', 'Indian history', 'documentary', 'vlymbooq']
    }
  };
  const json = path.join(opts.work, 'metadata.json');
  fs.writeFileSync(json, JSON.stringify(meta, null, 2) + '\n');
  const md = path.join(opts.work, 'youtube.md');
  fs.writeFileSync(md, `# ${meta.youtube.title}\n\n${description}\n\n## Thumbnail\n\n\`${meta.files.thumbnail}\`\n`);
  console.log(`metadata: ${json}`);
}

function writeScript(timeline, film, opts) {
  const lines = [];
  lines.push(`# ${film.title} — ${film.subtitle}`);
  lines.push('');
  lines.push(`**Logline.** ${film.logline}`);
  lines.push('');
  timeline.scenes.forEach((scene, i) => {
    lines.push(`## ${String(i + 1).padStart(2, '0')} · ${scene.title} (${mmss(scene.start)})`);
    lines.push('');
    scene.narration.forEach((line) => {
      lines.push(`> ${line.text}`);
      lines.push(`> _source: ${line.source}_`);
      lines.push('');
    });
    scene.shots.forEach((shot) => {
      lines.push(`- **${shot.id}** ${shot.render} · ${shot.plate} · ${shot.camera}`);
      lines.push(`  ${shot.visual}`);
      lines.push(`  Sound: ${shot.sfx.join(', ')}`);
    });
    lines.push('');
  });
  const file = path.join(opts.work, 'script.md');
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`script: ${file}`);
}

function printTimeline(timeline) {
  console.log(`\n${timeline.title} — ${timeline.subtitle}`);
  console.log(`duration ${timeline.duration.toFixed(1)}s · ${timeline.fps} fps · ${timeline.width}x${timeline.height}\n`);
  timeline.scenes.forEach((s) => {
    console.log(`${s.id} ${mmss(s.start)} +${s.duration.toFixed(1)}s  ${s.title}`);
    s.shots.forEach((h) => console.log(`   ${h.id} ${h.render.padEnd(7)} ${h.plate}`));
    s.narration.forEach((l) => console.log(`   · ${l.text.slice(0, 100)}${l.text.length > 100 ? '…' : ''}`));
  });
}

async function main() {
  const opts = parse(process.argv.slice(2));
  checkTools(opts);
  const film = loadFilm(opts);
  fs.mkdirSync(opts.work, { recursive: true });

  if (!opts.dryRun && !opts.skipPlates) {
    runNode('render-plates.js', [
      '--film', opts.film,
      '--out-dir', path.join(opts.work, 'plates'),
      '--width', String(opts.width),
      '--height', String(opts.height),
      '--samples', String(opts.samples)
    ]);
  }

  const hasMap = film.scenes.some((s) => s.shots.some((h) => h.render === 'map'));
  if (hasMap) runNode('map.js', [opts.work]);

  const narration = flattenNarration(film);
  const tts = generateTts(narration, opts);
  const timeline = buildTimeline(film, tts, opts);
  writeTimeline(timeline, opts);
  printTimeline(timeline);
  if (opts.dryRun) return;

  const audio = buildAudio(timeline, tts, opts);
  const frames = await renderFrames(timeline, opts);
  const srt = opts.srt ? writeSrt(timeline, opts) : '';
  encode(frames, audio, timeline, opts, srt);
  if (opts.thumbnail) await makeThumbnail(timeline, opts);
  if (opts.metadata) writeMetadata(timeline, film, opts);
  writeScript(timeline, film, opts);
  console.log('\nDONE');
  console.log(`  ${opts.out}`);
  console.log(`  ${path.join(opts.work, `${opts.film}.srt`)}`);
  console.log(`  ${path.join(opts.work, `${opts.film}-thumb.jpg`)}`);
}

main().catch((e) => {
  console.error(`FAIL ${e.stack || e.message}`);
  process.exitCode = 1;
});

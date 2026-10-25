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

function defaultTransitionFrames(type) {
  const defaults = {
    'hard-cut': 0,
    'smash-cut': 0,
    'match-cut': 0,
    'whip-left': 6,
    'whip-right': 6,
    'iris': 8,
    'paper-wipe': 8,
    'mask-wipe': 8,
    'dissolve': 12,
    'flash-frame': 2,
    'dip': 6
  };
  return defaults[type] == null ? 0 : defaults[type];
}

function resolveTransitions(film, opts) {
  const transitions = new Map();
  film.scenes.forEach((scene) => {
    (scene.shots || []).forEach((shot) => {
      const raw = shot.transition == null ? 'hard-cut' : shot.transition;
      let spec;
      if (typeof raw === 'string') {
        spec = { type: raw, frames: defaultTransitionFrames(raw), reason: '', sound: null };
      } else {
        spec = Object.assign({}, raw);
        spec.type = String(spec.type || 'hard-cut');
        spec.frames = Math.max(0, Math.round(Number(spec.frames) || 0));
        spec.reason = String(spec.reason || '').trim();
        spec.sound = spec.sound ? String(spec.sound) : null;
        spec.audioLead = Math.max(0, Number(spec.audioLead) || 0);
        spec.audioDuration = Math.max(0, Number(spec.audioDuration) || 0);
      }
      spec.duration = spec.frames / opts.fps;
      transitions.set(shot.id, spec);
    });
  });
  return transitions;
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
  const transitions = resolveTransitions(film, opts);
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
    // A scene can hold the picture before the voice arrives. `narrationStart`
    // is measured from the scene's first frame, so an opening title card can
    // sit in silence instead of carrying a caption it was never meant to share.
    const hasNarrationStart = Number.isFinite(Number(scene.narrationStart));
    const narrationStart = hasNarrationStart ? Math.max(0, Number(scene.narrationStart)) : lead;
    // A shot marked `hold` keeps an exact length (a title card, an end card).
    // The remaining shots divide the rest of the scene by weight.
    const holds = (scene.shots || []).map((s) => Math.max(0, Number(s.hold) || 0));
    const fixedTotal = holds.reduce((a, b) => a + b, 0);
    const postHold = Number(scene.hold) || 0;
    const duration = narration.length
      ? (tight
        ? Math.max(Number(scene.minDuration) || 0,
          fixedTotal,
          narrationStart + lineTotal + tail + postHold)
        : Math.max(scripted, fixedTotal,
          spoken + gap * narration.length + 0.9 + postHold,
          hasNarrationStart ? narrationStart + lineTotal + tail : 0))
      : Math.max(scripted, Number(scene.minDuration) || 0, fixedTotal + postHold);
    const start = cursor;
    cursor += duration;

    let nlocal = narrationStart;
    narration.forEach((line) => {
      line.start = start + nlocal;
      line.end = line.start + line.duration;
      nlocal += line.duration + gap;
    });

    const shotsDef = scene.shots || [];
    // A shot may name the narration line it belongs to. That anchors the cut
    // to the voice, so an impact number lands on the sentence that says it
    // instead of drifting a beat late. Shots that do not name a line divide
    // the silence around their neighbours by weight.
    const anchors = shotsDef.map((shot) => {
      const n = Number(shot.narrationLine);
      return Number.isInteger(n) && n >= 1 && n <= narration.length ? n - 1 : -1;
    });
    const segments = [];
    let segment = { start: 0, end: duration, shots: [] };
    shotsDef.forEach((shot, hi) => {
      if (anchors[hi] >= 0) {
        const at = Math.max(segment.start, Math.min(duration, narration[anchors[hi]].start - start));
        segment.end = at;
        if (segment.shots.length) segments.push(segment);
        segment = { start: at, end: duration, shots: [] };
      }
      segment.shots.push(hi);
    });
    if (segment.shots.length) segments.push(segment);

    const shots = [];
    segments.forEach((seg) => {
      const segHolds = seg.shots.map((hi) => holds[hi]);
      const segFixed = segHolds.reduce((a, b) => a + b, 0);
      const segWeights = seg.shots.map((hi) => (holds[hi] ? 0 : Number(shotsDef[hi].weight) || 1));
      const segWeightTotal = segWeights.reduce((a, b) => a + b, 0);
      const mobileTime = Math.max(0, (seg.end - seg.start) - segFixed);
      let local = seg.start;
      seg.shots.forEach((hi, k) => {
        const shot = shotsDef[hi];
        const d = holds[hi] || (segWeightTotal > 0 ? (mobileTime * segWeights[k]) / segWeightTotal : 0);
        const transitionSpec = transitions.get(shot.id) || {
          type: 'hard-cut', frames: 0, duration: 0, reason: 'Base cut.', sound: null
        };
        shots[hi] = {
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
          transition: transitionSpec.type,
          transitionSpec,
          framing: shot.framing || { zoom: [1.02, 1.08], x: [50, 50], y: [50, 50] },
          start: start + local,
          duration: Math.max(0.1, d)
        };
        local += d;
      });
      // The last shot in the segment absorbs rounding so the cut lands on the
      // next anchor, not a frame before or after it.
      const last = seg.shots[seg.shots.length - 1];
      const consumed = seg.shots.reduce((sum, hi) => sum + shots[hi].duration, 0);
      shots[last].duration = Math.max(0.1, shots[last].duration + (seg.end - seg.start) - consumed);
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
    edit: film.edit || null,
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

function noiseAt(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function synthBridge(name, t, duration) {
  const tau = Math.PI * 2;
  const attack = Math.min(1, t / 0.008);
  const release = Math.min(1, Math.max(0, (duration - t) / 0.025));
  const env = attack * release;
  if (env <= 0) return 0;
  switch (name) {
    case 'title-tone':
      return (Math.sin(tau * 46 * t) * 0.50 + Math.sin(tau * 92 * t) * 0.14) * Math.exp(-1.1 * t) * env;
    case 'valve-ring':
    case 'seal-ring': {
      const click = noiseAt(Math.floor(t * 48000)) * Math.exp(-95 * t);
      const ring = Math.sin(tau * 1400 * t) * Math.exp(-8 * t) +
        Math.sin(tau * 2100 * t) * 0.40 * Math.exp(-11 * t);
      return (click * 0.30 + ring * 0.22) * env;
    }
    case 'clock-tick':
      return (Math.sin(tau * 2400 * t) * Math.exp(-55 * t) +
        Math.sin(tau * 1200 * t) * 0.40 * Math.exp(-30 * t)) * 0.35 * env;
    case 'gas-haze':
    case 'gas-haze-2': {
      const n = noiseAt(Math.floor(t * 48000));
      const swell = 0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t / Math.max(0.1, duration)));
      return (n * 0.10 + Math.sin(tau * 70 * t) * 0.10) * swell * env;
    }
    case 'siren': {
      const f = 620 + 260 * Math.sin(tau * 0.9 * t);
      return (Math.sin(tau * f * t) * 0.18 + Math.sin(tau * f * 1.5 * t) * 0.05) * env;
    }
    case 'number-smash':
      return (noiseAt(Math.floor(t * 48000)) * Math.exp(-120 * t) * 0.45 +
        Math.sin(tau * 90 * t) * Math.exp(-35 * t) * 0.35) * env;
    case 'number-stamp':
      return (Math.sin(tau * 75 * t) * Math.exp(-28 * t) * 0.45 +
        noiseAt(Math.floor(t * 48000)) * Math.exp(-80 * t) * 0.25) * env;
    case 'number-bell':
      return (Math.sin(tau * 520 * t) * 0.22 + Math.sin(tau * 780 * t) * 0.12 +
        Math.sin(tau * 1040 * t) * 0.06) * Math.exp(-2.2 * t) * env;
    case 'match-strike':
      return (noiseAt(Math.floor(t * 48000)) * Math.exp(-60 * t) * 0.35 +
        Math.sin(tau * 180 * t) * Math.exp(-20 * t) * 0.18) * env;
    case 'paper':
    case 'paper-2': {
      const n = noiseAt(Math.floor(t * 48000));
      return n * (0.5 + 0.5 * Math.sin(tau * 1800 * t)) * 0.22 * env;
    }
    case 'water-flame': {
      let out = 0;
      [0, 0.32].forEach((at) => {
        const u = t - at;
        if (u >= 0) {
          out += Math.sin(tau * 1500 * u) * Math.exp(-28 * u) * 0.35 +
            Math.sin(tau * 420 * u) * Math.exp(-16 * u) * 0.12;
        }
      });
      const v = t - 0.45;
      if (v >= 0) out += noiseAt(Math.floor(t * 48000)) * 0.09 * Math.min(1, v / 0.25) * Math.exp(-1.2 * v);
      return out * env;
    }
    case 'end-tone':
      return (Math.sin(tau * 55 * t) * 0.22 + Math.sin(tau * 110 * t) * 0.08) * Math.exp(-0.5 * t) * env;
    default:
      return noiseAt(Math.floor(t * 48000)) * Math.exp(-20 * t) * 0.12 * env;
  }
}

function writeWav16(file, samples, sampleRate) {
  const dataBytes = samples.length * 2 * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    const s = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767);
    buf.writeInt16LE(s, 44 + i * 4);
    buf.writeInt16LE(s, 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

function writeBridgeTrack(events, duration, file) {
  const rate = 48000;
  const samples = new Float32Array(Math.ceil(duration * rate) + 1);
  events.forEach((event) => {
    const start = Math.max(0, Math.round(event.at * rate));
    const length = Math.max(0.05, Number(event.duration) || 0.6);
    const end = Math.min(samples.length, start + Math.round(length * rate));
    for (let i = start; i < end; i++) {
      const t = (i - start) / rate;
      samples[i] += synthBridge(event.audio, t, length) * (event.gain == null ? 1 : event.gain);
    }
  });
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const scale = peak > 0.82 ? 0.82 / peak : 1;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  writeWav16(file, samples, rate);
  console.log(`sound bridges: ${events.length} events · peak ${(peak * scale).toFixed(2)}`);
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
  const bridgeEvents = [];
  timeline.scenes.forEach((s) => s.shots.forEach((h) => {
    const spec = h.transitionSpec;
    if (!spec || !spec.sound) return;
    bridgeEvents.push({
      at: Math.max(0, h.start - (Number(spec.audioLead) || 0)),
      audio: spec.sound,
      duration: Number(spec.audioDuration) || 0.6,
      gain: 0.9
    });
  }));
  let bridgeInput = -1;
  const bridgeFile = path.join(path.dirname(file), 'bridges.wav');
  if (bridgeEvents.length) {
    writeBridgeTrack(bridgeEvents, timeline.duration, bridgeFile);
    args.push('-i', bridgeFile);
    bridgeInput = 5 + (hits.length ? 1 : 0);
  }
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
  if (bridgeInput >= 0) {
    filters.push(`[${bridgeInput}:a]volume=0.9[br]`);
    labels.push('[br]');
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
  // Cues are sampled from disjoint word ranges, but the old 0.4s legibility
  // floor could push a short cue into its successor. Trim each cue before the
  // next one starts and leave a visible gap, so two captions never share a
  // frame and no cue boundary is a zero-gap butt join.
  for (let i = 0; i < cues.length - 1; i++) {
    const latest = cues[i + 1].start - 0.06;
    if (cues[i].end > latest) cues[i].end = latest;
  }
  const visible = cues.filter((c) => c.end - c.start >= 0.12);
  const body = visible.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
  const file = path.join(opts.work, `${opts.film}.srt`);
  fs.writeFileSync(file, body, 'utf8');
  console.log(`captions: ${file} (${visible.length} cues, ${cues.length - visible.length} collapsed)`);
  return { file, cues: visible };
}

function checkEdit(timeline, film, cues, opts) {
  const errors = [];
  const warnings = [];
  const shots = [];
  timeline.scenes.forEach((s) => s.shots.forEach((h) => shots.push(Object.assign({ scene: s.id }, h))));
  const total = shots.length;
  const effectCounts = {};
  const ranges = {
    'match-cut': [0, 2],
    'iris': [7, 10],
    'paper-wipe': [6, 10],
    'dissolve': [8, 14],
    'whip-left': [5, 8],
    'whip-right': [5, 8],
    'flash-frame': [1, 2],
    'dip': [4, 6]
  };
  shots.forEach((h, i) => {
    const spec = h.transitionSpec || {};
    const type = spec.type || h.transition || 'hard-cut';
    if (!spec.reason || String(spec.reason).trim().length < 12) {
      errors.push(`${h.id}: transition needs a one-sentence reason`);
    }
    if (type !== 'hard-cut') {
      effectCounts[type] = (effectCounts[type] || 0) + 1;
      if (!spec.sound) errors.push(`${h.id}: ${type} needs a sound bridge`);
    }
    const range = ranges[type];
    if (range && (spec.frames < range[0] || spec.frames > range[1])) {
      errors.push(`${h.id}: ${type} is ${spec.frames} frames; allowed ${range[0]}-${range[1]}`);
    }
    if (type === 'hard-cut' && spec.frames !== 0) errors.push(`${h.id}: hard-cut must be zero frames`);
    if (type === 'dip' && i !== total - 1) errors.push(`${h.id}: dip is only allowed on the final cut`);
    if (type === 'flash-frame' && i !== 0) errors.push(`${h.id}: flash-frame is only allowed on the opening cut`);
    if (type === 'dissolve' && !/gas|vapou?r|haze|smoke|cloud/i.test(spec.reason)) {
      errors.push(`${h.id}: dissolve is only allowed where gas, vapour or haze is the subject`);
    }
    if (type === 'iris' && !/circle|ring|seal|handwheel|rim/i.test(spec.reason)) {
      errors.push(`${h.id}: iris needs a circular object in the reason`);
    }
    if (type === 'paper-wipe' && !/paper|ledger|newspaper|page|document/i.test(spec.reason)) {
      errors.push(`${h.id}: paper-wipe needs a paper object in the reason`);
    }
    if ((type === 'whip-left' || type === 'whip-right') && !/siren|turn|motion|whip|air/i.test(spec.reason)) {
      errors.push(`${h.id}: whip needs motion or a siren in the reason`);
    }
    if (spec.frames > 0 && Math.abs(Number(spec.duration) - spec.frames / timeline.fps) > 1e-9) {
      errors.push(`${h.id}: transition duration is not frame-accurate`);
    }
  });
  Object.keys(effectCounts).forEach((type) => {
    if (effectCounts[type] > 2) errors.push(`${type} appears ${effectCounts[type]} times; the maximum is 2`);
  });
  const titleShots = shots.filter((h) => h.render === 'title');
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (cue.end - cue.start < 0.12) errors.push(`caption cue ${i + 1} is shorter than 0.12s`);
    if (i < cues.length - 1 && cue.end > cues[i + 1].start - 0.02) {
      errors.push(`caption cue ${i + 1} overlaps or zero-gaps cue ${i + 2}`);
    }
    titleShots.forEach((h) => {
      if (cue.start < h.start + h.duration && cue.end > h.start) {
        errors.push(`caption cue ${i + 1} collides with title ${h.id}`);
      }
    });
  }
  shots.filter((h) => h.impact && /\d/.test(h.text)).forEach((h) => {
    let best = 0;
    cues.forEach((cue) => {
      best = Math.max(best, Math.min(cue.end, h.start + h.duration) - Math.max(cue.start, h.start));
    });
    if (best < 0.2) errors.push(`${h.id}: impact ${h.text} needs a caption on screen for at least 0.2s`);
  });
  const collisions = [];
  shots.forEach((h) => {
    const spec = h.transitionSpec || {};
    if (!spec.duration || h.transition === 'hard-cut') return;
    cues.forEach((cue) => {
      const overlap = Math.min(cue.end, h.start + spec.duration) - Math.max(cue.start, h.start);
      if (overlap > 0.001) {
        collisions.push({
          shot: h.id,
          type: h.transition,
          cue: cue.text.replace(/\n/g, ' '),
          overlap: Number(overlap.toFixed(3))
        });
      }
    });
  });
  collisions.forEach((c) => {
    if (c.overlap > 0.55) errors.push(`${c.shot}: ${c.type} runs under a caption for ${c.overlap}s`);
  });
  const manifest = {
    schema: 'vlymbooq.edit-manifest.v1',
    film: timeline.film,
    fps: timeline.fps,
    grammar: (film.edit && film.edit.grammar) || 'unknown',
    signature: (film.edit && film.edit.signature) || [],
    acts: (film.edit && film.edit.acts) || [],
    shots: shots.map((h) => ({
      id: h.id,
      scene: h.scene,
      start: Number(h.start.toFixed(3)),
      duration: Number(h.duration.toFixed(3)),
      plate: h.plate,
      render: h.render,
      text: h.text || '',
      impact: !!h.impact,
      transition: {
        type: h.transition,
        frames: (h.transitionSpec && h.transitionSpec.frames) || 0,
        duration: Number((((h.transitionSpec && h.transitionSpec.duration) || 0)).toFixed(4)),
        reason: (h.transitionSpec && h.transitionSpec.reason) || '',
        sound: (h.transitionSpec && h.transitionSpec.sound) || null,
        audioLead: (h.transitionSpec && h.transitionSpec.audioLead) || 0,
        audioDuration: (h.transitionSpec && h.transitionSpec.audioDuration) || 0
      }
    })),
    effectCounts,
    captionChecks: {
      cues: cues.length,
      titleOverlaps: 0,
      transitionCaptionOverlaps: collisions,
      statementBand: 'top 16.5vh to about 35vh',
      impactBand: 'centred on 50vh',
      captionBand: 'bottom 8.5vh (MarginV 42, two lines)'
    }
  };
  fs.writeFileSync(path.join(opts.work, 'edit-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(opts.work, 'edit-qc.json'), JSON.stringify({
    ok: errors.length === 0, errors, warnings, effectCounts, collisions
  }, null, 2) + '\n');
  console.log(`edit: ${shots.length} cuts · effects ${Object.keys(effectCounts).map((k) => `${k}×${effectCounts[k]}`).join(', ') || 'none'}`);
  if (collisions.length) {
    console.log(`edit: ${collisions.length} caption/transition overlaps, longest ${Math.max(...collisions.map((c) => c.overlap)).toFixed(2)}s`);
  }
  if (errors.length) {
    console.error('FAIL edit QC');
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error('edit QC failed');
  }
  return manifest;
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
  const srt = opts.srt ? writeSrt(timeline, opts) : { file: '', cues: [] };
  checkEdit(timeline, film, srt.cues, opts);
  if (opts.dryRun) return;

  const audio = buildAudio(timeline, tts, opts);
  const frames = await renderFrames(timeline, opts);
  encode(frames, audio, timeline, opts, srt.file);
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

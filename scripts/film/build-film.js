#!/usr/bin/env node
/**
 * Build the Salt March film entirely on a GitHub Actions runner.
 *
 * Pipeline:
 *   1. validate the sourced storyboard
 *   2. render 3D plates with Blender (CPU / Cycles)
 *   3. draw the route map from public-domain Natural Earth data
 *   4. narrate with Piper
 *   5. composite the timeline on a deterministic Skia canvas
 *   6. encode with ffmpeg, write SRT, thumbnail, metadata and a YouTube brief
 *
 * No frame is rendered on the owner's machine. No paid API is called.
 */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_ROOT = path.join(ROOT, 'out', 'film');
const { repairFilm } = require('./repair-edit');

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
    videoBitrate: '',
    preset: 'veryfast',
    voice: '',
    tts: 'piper',
    rate: '-4%',
    pitch: '-2Hz',
    reuseTts: false,
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
    else if (a === '--video-bitrate') o.videoBitrate = next();
    else if (a === '--preset') o.preset = next();
    else if (a === '--voice') o.voice = next();
    else if (a === '--tts') o.tts = next();
    else if (a === '--rate') o.rate = next();
    else if (a === '--pitch') o.pitch = next();
    else if (a === '--reuse-tts') o.reuseTts = true;
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
  --video-bitrate <rate> x264 target bitrate, e.g. 4M; overrides CRF
  --preset <name>       x264 preset (default veryfast)
  --samples <n>         Blender samples for plates (default 32)
  --skip-plates         Use plates rendered by a previous step
  --tts piper|edge|none Narration (default piper)
  --voice <name>        Piper voice or Edge voice id
  --rate <pct>          Edge speaking rate, e.g. -4%
  --pitch <hz>          Edge pitch, e.g. -2Hz
  --reuse-tts           Reuse an existing audio/durations.json in the work dir
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
  if (!['piper', 'edge', 'none'].includes(o.tts)) throw new Error('--tts must be piper, edge or none');
  if (!o.voice) o.voice = o.tts === 'edge' ? 'en-IN-PrabhatNeural' : 'en_US-lessac-medium';
  if (!(o.width > 0 && o.height > 0 && o.width % 2 === 0 && o.height % 2 === 0)) {
    throw new Error('width and height must be positive even numbers');
  }
  if (!(o.fps >= 15 && o.fps <= 60)) throw new Error('--fps must be 15..60');
  if (!(o.captureFps >= 8 && o.captureFps <= 60)) throw new Error('--capture-fps must be 8..60');
  if (o.videoBitrate && !/^\d+(?:[kKmM])?$/.test(o.videoBitrate)) {
    throw new Error('--video-bitrate must look like 2500k or 4M');
  }
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
  if (opts.tts === 'edge') {
    const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const p = spawnSync(py, ['-c', 'import edge_tts; print(edge_tts.__version__)'], { encoding: 'utf8' });
    if (p.error || p.status !== 0) {
      throw new Error('edge-tts is not installed. Run: pip install edge-tts==7.3.1');
    }
  }
}

function loadFilm(opts) {
  const file = path.join(ROOT, 'data', 'films', `${opts.film}.json`);
  if (!fs.existsSync(file)) throw new Error(`Film not found: ${file}`);
  const original = readJson(file);
  if (!original.scenes || !original.scenes.length) throw new Error('film has no scenes');
  const { film, repairs } = repairFilm(original);
  if (repairs.length) {
    console.log(`edit repair: ${repairs.length} mechanical transition fix(es)`);
    repairs.forEach((repair) => console.log(`  Â· ${repair}`));
  }
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
  const cachedFile = path.join(audioDir, 'durations.json');
  if (opts.reuseTts && fs.existsSync(cachedFile)) {
    const cached = readJson(cachedFile);
    const files = Array.isArray(cached.durations)
      ? cached.durations.map((_, i) => path.join(audioDir, `audio-${String(i).padStart(4, '0')}.wav`))
      : [];
    if (files.length === lines.length && files.every((f) => fs.existsSync(f))) {
      console.log(`tts: reused ${files.length} cached lines`);
      return { durations: cached.durations, audioDir, files };
    }
    console.log('tts: cache is incomplete; synthesising again');
  }
  fs.writeFileSync(inputPath, JSON.stringify({ texts: lines.map((l) => l.speak || l.text) }, null, 2) + '\n');
  const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const script = opts.tts === 'edge' ? 'edge-tts.py' : 'piper-tts.py';
  const args = [
    path.join(__dirname, script),
    '--input', inputPath,
    '--out-dir', audioDir,
    '--voice', opts.voice
  ];
  if (opts.tts === 'edge') {
    // Only pass prosody flags that were actually requested. Bind the value with
    // "=": argparse reads a leading minus (e.g. -4%) as another option when the
    // value arrives as a separate argv token.
    if (opts.rate) args.push(`--rate=${opts.rate}`);
    if (opts.pitch) args.push(`--pitch=${opts.pitch}`);
    args.push('--retries', '3');
  } else {
    args.push('--data-dir', path.join(ROOT, '.cache', 'piper'), '--length-scale', '1.0');
  }
  const r = spawnSync(py, args, { stdio: 'inherit', cwd: ROOT });
  const tool = opts.tts === 'edge' ? 'Edge TTS' : 'Piper';
  if (r.error) throw new Error(`Could not start ${tool}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${tool} failed with exit ${r.status}`);
  const payload = readJson(path.join(audioDir, 'durations.json'));
  if (!Array.isArray(payload.durations) || payload.durations.length !== lines.length) {
    throw new Error(`${tool} returned ${payload.durations && payload.durations.length} durations for ${lines.length} lines`);
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
          graphic: shot.graphic || undefined,
          stamp: shot.stamp || undefined,
          thread: shot.thread || undefined,
          sourceTag: shot.sourceTag || '',
          closing: shot.closing === true,
          impact: !!shot.impact,
          impactSub: shot.impactSub || '',
          impactShift: shot.impactShift || '',
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
  console.log(`timeline: ${timeline.duration.toFixed(1)}s Â· ${timeline.scenes.length} scenes Â· ${timeline.scenes.reduce((n, s) => n + s.shots.length, 0)} shots`);
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
  const scale = peak > 0 ? 0.82 / peak : 1;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  writeWav16(file, samples, rate);
  console.log(`sound bridges: ${events.length} events Â· peak ${(peak * scale).toFixed(2)}`);
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
  // The channel theme opens every film. It is an original recording owned by
  // the channel, mixed low so it colours the room without competing with the
  // narration. Missing theme is not fatal: the bed still works.
  const themeFile = path.join(ROOT, 'out', 'brand', 'vlymbooq-theme.wav');
  let themeInput = -1;
  if (fs.existsSync(themeFile)) {
    args.push('-i', themeFile);
    themeInput = 5 + (hits.length ? 1 : 0) + (bridgeEvents.length ? 1 : 0);
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
  if (themeInput >= 0) {
    filters.push(`[${themeInput}:a]atrim=0:12,volume=0.24,` +
      'afade=t=in:st=0:d=0.8,afade=t=out:st=9.4:d=2.6[th]');
    labels.push('[th]');
  }
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,` +
    `alimiter=limit=0.90:level=false,afade=t=in:st=0:d=2.2,` +
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
    // Sample-peak limiting is not enough: AAC inter-sample peaks landed at
    // +0.6 dBTP even after loudnorm. Upsample, limit hard, then return to
    // 48 kHz so the encoder cannot overshoot.
    `alimiter=limit=0.78:level=false,` +
    `loudnorm=I=-15:TP=-2.5:LRA=11,` +
    `aresample=192000,alimiter=limit=0.62:level=false,aresample=48000,` +
    `afade=t=in:st=0:d=0.6,` +
    `afade=t=out:st=${Math.max(0, timeline.duration - 2.5)}:d=2.5[a]`
  );
  args.push('-filter_complex', filters.join(';'), '-map', '[a]', '-t', timeline.duration.toFixed(3),
    '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', audio);
  runFfmpeg(args, 'audio mix');
  return audio;
}

async function renderFrames(timeline, opts) {
  // The canvas compositor is deterministic and does not depend on a browser's
  // tiled compositor. It draws the same timeline and plate images that the
  // validator and preview page use.
  const { renderFrames: renderCanvasFrames } = require('./render-canvas');
  return renderCanvasFrames(timeline, opts);
}

function doubleRate(rate) {
  const m = String(rate).match(/^(\d+(?:\.\d+)?)([kKmM])?$/);
  if (!m) return rate;
  return `${Math.round(Number(m[1]) * 2)}${m[2] || ''}`;
}

function encode(framesDir, audio, timeline, opts, subtitles) {
  const pattern = path.join(framesDir, 'frame-%06d.jpg');
  const args = [
    '-y',
    '-framerate', String(opts.captureFps),
    '-i', pattern,
    '-i', audio
  ];
  if (subtitles && subtitles.assFile && fs.existsSync(subtitles.assFile)) {
    // Burn the styled ASS master. Spectral carries the caption, amber marks
    // keywords and numbers, and the vendored fonts travel with the repo so the
    // render never depends on a runner's installed fonts.
    const rel = path.relative(ROOT, subtitles.assFile).replace(/\\/g, '/');
    const fonts = path.relative(ROOT, path.join(ROOT, 'assets', 'film-fonts')).replace(/\\/g, '/');
    // JPEG plates arrive tagged full-range (yuvj420p). force the limited-range
    // 4:2:0 output here; -pix_fmt alone keeps the full-range tag.
    args.push('-vf', `ass=${rel}:fontsdir=${fonts},scale=w=iw:h=ih:out_range=limited,format=yuv420p`);
  } else if (subtitles && subtitles.file) {
    // Sidecar-only fallback: still burn readable captions rather than ship a
    // film with narration and no on-screen text.
    const rel = path.relative(ROOT, subtitles.file).replace(/\\/g, '/');
    const style = 'FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00F2E6D0,' +
      'OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=42,Alignment=2';
    args.push('-vf', `subtitles=${rel}:force_style='${style}',scale=w=iw:h=ih:out_range=limited,format=yuv420p`);
  } else {
    // No captions: still normalise the JPEG plate range before encoding.
    args.push('-vf', 'scale=w=iw:h=ih:out_range=limited,format=yuv420p');
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', opts.preset
  );
  if (opts.videoBitrate) {
    // CRF anchors the quality; the bitrate is only a ceiling. A plain -b:v
    // target made x264 undershoot to 738 kbps on this dark, slow film and the
    // encoder then crushed the plates while the ffmpeg captions stayed sharp.
    args.push(
      '-crf', String(opts.crf),
      '-maxrate', opts.videoBitrate,
      '-bufsize', doubleRate(opts.videoBitrate),
      '-x264-params', 'aq-mode=3:aq-strength=1.1'
    );
  } else {
    args.push('-crf', String(opts.crf), '-x264-params', 'aq-mode=3:aq-strength=1.1');
  }
  args.push(
    '-pix_fmt', 'yuv420p',
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
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
  const { renderPoster } = require('./render-canvas');
  return renderPoster(loadFilm(opts), timeline, opts);
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

function splitSentences(text) {
  // Split on terminal punctuation only when it is followed by whitespace or the
  // end of the line. "12.2" and "O.Chidambaram" must never become two cues.
  const s = String(text || '');
  const out = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const next = s[i + 1];
    if (next && !/\s/.test(next) && !/["')\]]/.test(next)) continue;
    let end = i + 1;
    while (end < s.length && /["')\]]/.test(s[end])) end++;
    const piece = s.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end;
    i = end - 1;
  }
  const rest = s.slice(start).trim();
  if (rest) out.push(rest);
  return out.length ? out : [s];
}

function packCaption(text, max = 46) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const lines = wrapCaption(clean, max);
  if (lines.length <= 2) return [lines.join('\n')];
  const words = clean.split(/\s+/).filter(Boolean);
  // A very short tail is not a cue. Let it wrap over the hard limit instead of
  // leaving one word alone for half a second.
  if (words.length <= 5) return [clean];
  // Balance the sentence in two, scoring boundaries a few words either side of
  // the middle. A clause boundary wins; a cue should not begin with a bare
  // year, and it should not leave an article stranded at the end of the line.
  const mid = Math.ceil(words.length / 2);
  let at = mid;
  let best = -Infinity;
  for (let i = Math.max(2, mid - 4); i <= Math.min(words.length - 2, mid + 4); i++) {
    const prev = words[i - 1];
    const next = words[i];
    let score = -Math.abs(i - mid) * 0.3;
    if (/[,;â€”]$/.test(prev)) score += 6;
    if (/^(to|of|in|on|from|with|by|and|but|or|that|which|when|while|as|for|at)$/i.test(next)) score += 3;
    if (/^(a|an|the|of|to|in|on|from|with|by|and|but|or|that|which)$/i.test(prev)) score -= 4;
    if (/^\d/.test(prev) && /^\d/.test(next)) score -= 3;
    if (score > best) {
      best = score;
      at = i;
    }
  }
  if (at <= 1 || at >= words.length - 1) return [clean];
  return [
    ...packCaption(words.slice(0, at).join(' '), max),
    ...packCaption(words.slice(at).join(' '), max)
  ];
}

function captionChunks(text) {
  // One cue per sentence where it fits; a long sentence is balanced into two
  // or more cues, each at most two lines. Cue boundaries never split a number,
  // a hyphenated name, or a one-word tail.
  const chunks = [];
  for (const sentence of splitSentences(text)) {
    chunks.push(...packCaption(sentence));
  }
  return chunks.length ? chunks : [''];
}

function buildCaptionCues(timeline) {
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
  return cues.filter((c) => c.end - c.start >= 0.12);
}

function assTime(sec) {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

const CAPTION_KEYWORDS = [
  'CHAURI CHAURA', 'NON-COOPERATION', 'NON COOPERATION', 'LIFE IMPRISONMENT',
  'DEATH SENTENCE', 'UNITED PROVINCES', 'POLICE STATION', 'GORAKHPUR',
  'CONVICTED', 'CONVICTION', 'ACQUITTED', 'HANGED', 'HANGINGS', 'APPEAL',
  'TRIAL', 'GANDHI', 'FIRE'
];

function assEscape(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/[{}]/g, '');
}

function highlightAssLine(line) {
  const source = `${CAPTION_KEYWORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|\\b\\d[\\d,.]*\\b`;
  const re = new RegExp(source, 'gi');
  let out = '';
  let last = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    out += assEscape(line.slice(last, match.index));
    out += `{\\c&H0058A5D8&\\b1}${assEscape(match[0])}{\\c&H00C6DDE9&\\b0}`;
    last = match.index + match[0].length;
  }
  out += assEscape(line.slice(last));
  return out;
}

function writeAss(cues, opts) {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1920',
    'PlayResY: 1080',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Evidence,Spectral,44,&H00C6DDE9,&H00C6DDE9,&H00000000,&H66000000,0,0,0,0,100,100,0.3,0,1,2.0,0,2,96,96,52,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ];
  cues.forEach((cue) => {
    const text = cue.text.split('\n').map(highlightAssLine).join('\\N');
    header.push(`Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Evidence,,0,0,0,,${text}`);
  });
  const file = path.join(opts.work, `${opts.film}.ass`);
  fs.writeFileSync(file, header.join('\n') + '\n', 'utf8');
  console.log(`captions: ${file} (${cues.length} cues, keywords highlighted)`);
  return file;
}

function writeSrt(timeline, opts) {
  const visible = buildCaptionCues(timeline);
  const body = visible.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
  const file = path.join(opts.work, `${opts.film}.srt`);
  fs.writeFileSync(file, body, 'utf8');
  const assFile = writeAss(visible, opts);
  console.log(`captions: ${file} (${visible.length} cues)`);
  return { file, assFile, cues: visible };
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
    if (type === 'paper-wipe' && !/paper|ledger|newspaper|page|document|sheet/i.test(spec.reason)) {
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
  console.log(`edit: ${shots.length} cuts Â· effects ${Object.keys(effectCounts).map((k) => `${k}Ã—${effectCounts[k]}`).join(', ') || 'none'}`);
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
    title: `${film.title} â€” ${film.subtitle}`,
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
  lines.push(`# ${film.title} â€” ${film.subtitle}`);
  lines.push('');
  lines.push(`**Logline.** ${film.logline}`);
  lines.push('');
  timeline.scenes.forEach((scene, i) => {
    lines.push(`## ${String(i + 1).padStart(2, '0')} Â· ${scene.title} (${mmss(scene.start)})`);
    lines.push('');
    scene.narration.forEach((line) => {
      lines.push(`> ${line.text}`);
      lines.push(`> _source: ${line.source}_`);
      lines.push('');
    });
    scene.shots.forEach((shot) => {
      lines.push(`- **${shot.id}** ${shot.render} Â· ${shot.plate} Â· ${shot.camera}`);
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
  console.log(`\n${timeline.title} â€” ${timeline.subtitle}`);
  console.log(`duration ${timeline.duration.toFixed(1)}s Â· ${timeline.fps} fps Â· ${timeline.width}x${timeline.height}\n`);
  timeline.scenes.forEach((s) => {
    console.log(`${s.id} ${mmss(s.start)} +${s.duration.toFixed(1)}s  ${s.title}`);
    s.shots.forEach((h) => console.log(`   ${h.id} ${h.render.padEnd(7)} ${h.plate}`));
    s.narration.forEach((l) => console.log(`   Â· ${l.text.slice(0, 100)}${l.text.length > 100 ? 'â€¦' : ''}`));
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
  const srt = opts.srt ? writeSrt(timeline, opts) : { file: '', assFile: '', cues: [] };
  checkEdit(timeline, film, srt.cues, opts);
  if (opts.dryRun) return;

  const audio = buildAudio(timeline, tts, opts);
  // Render the poster before the frame loop. Skia's glyph cache can be in a
  // bad state after thousands of frames, and a tiled poster is not publishable.
  if (opts.thumbnail) await makeThumbnail(timeline, opts);
  const frames = await renderFrames(timeline, opts);
  encode(frames, audio, timeline, opts, srt);
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

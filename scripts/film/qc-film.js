#!/usr/bin/env node
/*
 * Independent QC for a rendered film.
 *
 * This is the gate that decides whether a master may be published. It is
 * deliberately mechanical: it measures the file, not the intention. Every check
 * names the number it saw and the number it wanted, and any hard failure makes
 * the process exit non-zero.
 *
 * The blockiness check exists because the Bhopal master measured 738 kbps with
 * 14 KB frames behind it and looked fine in a 640x360 preview. A downscale hides
 * macroblocks, so the check runs on a 1:1 crop and compares differences across
 * 8-pixel block boundaries with differences inside blocks, which is where a
 * starved encode shows up.
 *
 * Usage:
 *   node scripts/film/qc-film.js --film bhopal-gas-tragedy \
 *     --file out/film/bhopal-gas-tragedy/bhopal-gas-tragedy-master.mp4 \
 *     --work out/film/bhopal-gas-tragedy \
 *     --expect-width 1920 --expect-height 1080 \
 *     --min-bitrate 2500000 --max-true-peak -1.0 \
 *     --srt out/film/bhopal-gas-tragedy/bhopal-gas-tragedy.srt
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const outTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-film-'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function num(name, fallback) {
  const raw = arg(name);
  return raw === undefined || raw === null ? fallback : Number(raw);
}

function ffmpegArgs(args, options) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args],
    { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', ...options });
  if (res.error) throw res.error;
  return res;
}

function probe(file) {
  const res = spawnSync('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', file,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`ffprobe failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

/*
 * A master is streamable when the moov atom comes before mdat. Reading the
 * header is enough: the atoms sit at the start of a well-formed file.
 */
function faststart(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(2 * 1024 * 1024);
  const read = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const head = buf.subarray(0, read);
  const moov = head.indexOf('moov');
  const mdat = head.indexOf('mdat');
  if (moov === -1 || mdat === -1) return null;
  return moov < mdat;
}

function loudness(file) {
  const res = ffmpegArgs(['-nostats', '-i', file, '-vn',
    '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const text = `${res.stdout || ''}${res.stderr || ''}`;
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const pick = (label) => {
    const m = summary.match(new RegExp(`${label}:\\s*(-?[\\d.]+)`));
    return m ? Number(m[1]) : null;
  };
  return {
    integrated: pick('I'),
    lra: pick('LRA'),
    truePeak: pick('Peak'),
  };
}

function decodeErrors(file) {
  const res = ffmpegArgs(['-v', 'error', '-i', file, '-f', 'null', '-']);
  const text = `${res.stderr || ''}`.trim();
  return text ? text.split('\n').slice(0, 8) : [];
}

/*
 * Pull one frame as greyscale bytes at 1:1, no scaling anywhere in the chain.
 */
function cropGray(file, seconds, x, y, w, h) {
  const res = spawnSync('ffmpeg', [
    '-hide_banner', '-v', 'error', '-nostdin',
    '-ss', String(seconds), '-i', file,
    '-frames:v', '1',
    '-vf', `crop=${w}:${h}:${x}:${y},format=gray`,
    '-f', 'rawvideo', '-',
  ], { maxBuffer: 64 * 1024 * 1024, encoding: null });
  if (res.error) throw res.error;
  if (!res.stdout || res.stdout.length < w * h) {
    throw new Error(`could not read a ${w}x${h} crop at ${seconds}s`);
  }
  return res.stdout.subarray(0, w * h);
}

/*
 * Boundary energy over interior energy. A healthy frame has texture everywhere,
 * so the two are equal. A crushed encode leaves flat blocks whose edges jump,
 * so the ratio rises. Flat frames carry no signal and are reported as 1.
 */
function blockiness(gray, w, h) {
  let edgeSum = 0;
  let edgeN = 0;
  let innerSum = 0;
  let innerN = 0;
  const tally = (d, position) => {
    if (position % 8 === 0) { edgeSum += d; edgeN += 1; }
    else if (position % 8 === 4) { innerSum += d; innerN += 1; }
  };
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 4; x < w - 4; x += 1) {
      tally(Math.abs(gray[row + x] - gray[row + x - 1]), x);
    }
  }
  for (let x = 0; x < w; x += 1) {
    for (let y = 4; y < h - 4; y += 1) {
      tally(Math.abs(gray[y * w + x] - gray[(y - 1) * w + x]), y);
    }
  }
  const edge = edgeN ? edgeSum / edgeN : 0;
  const inner = innerN ? innerSum / innerN : 0;
  if (!edgeN || edge < 1.2) return { ratio: 1, edge, inner, flat: true };
  return { ratio: edge / Math.max(inner, 0.4), edge, inner, flat: false };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function psnrDb(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  const mse = sum / a.length;
  return mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
}

function rawCrop(source, x, y, w, h, seek) {
  const args = ['-hide_banner', '-v', 'error', '-nostdin'];
  if (seek !== undefined) args.push('-ss', String(seek));
  args.push('-i', source, '-frames:v', '1',
    '-vf', `crop=${w}:${h}:${x}:${y},format=gray`,
    '-f', 'rawvideo', '-');
  const res = spawnSync('ffmpeg', args, { maxBuffer: 64 * 1024 * 1024, encoding: null });
  if (res.error) throw res.error;
  const buf = res.stdout;
  if (!buf || buf.length < w * h) throw new Error(`could not crop ${path.basename(source)}`);
  return buf.subarray(0, w * h);
}

/*
 * Rebuild the authored frame from the plates and timeline, then compare it with
 * the decoded frame at the same index. This is the only check that measures what
 * the encoder did to the picture rather than what the filename claims.
 */
async function codecPsnr(file, filmId, timeline, work, box, fps) {
  const { createCanvas } = require('@napi-rs/canvas');
  const canvasLib = require('./render-canvas.js');
  const film = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'films', `${filmId}.json`), 'utf8'));
  const images = await canvasLib.loadPlateImages(timeline, path.join(work, 'plates'));
  const list = canvasLib.flattenShots(timeline);
  const canvas = createCanvas(box.width, box.height);
  const ctx = canvas.getContext('2d');
  const tmp = path.join(outTmp, `authored-${process.pid}.png`);
  const samples = [];
  for (const scene of timeline.scenes) {
    /*
     * Sample the middle of the scene, away from the lead and the transition,
     * then allow one frame of drift in either direction so a seek rounding
     * difference cannot be mistaken for codec damage.
     */
    const t = Number(scene.start) + Number(scene.duration) * 0.5;
    const index = Math.round(t * fps);
    if (index <= 0 || index / fps >= timeline.duration - 0.05) continue;
    const decoded = rawCrop(file, box.x, box.y, box.w, box.h, index / fps);
    let best = null;
    for (const delta of [-1, 0, 1]) {
      const seconds = (index + delta) / fps;
      canvasLib.drawFrame(ctx, film, timeline, list, seconds, box.width, box.height, images);
      fs.writeFileSync(tmp, await canvas.encode('png'));
      const authored = rawCrop(tmp, box.x, box.y, box.w, box.h);
      const db = psnrDb(authored, decoded);
      if (best === null || db > best) best = db;
    }
    samples.push({ scene: scene.id, frame: index, db: best });
  }
  fs.rmSync(tmp, { force: true });
  return samples;
}

async function main() {
  const film = arg('film', 'film');
  const file = arg('file');
  const work = arg('work', path.dirname(file || '.'));
  const expectW = num('expect-width', 1920);
  const expectH = num('expect-height', 1080);
  const minBitrate = num('min-bitrate', 2500000);
  const maxTruePeak = num('max-true-peak', -1.0);
  const expectFps = num('fps', 24);
  const outDir = arg('out-dir', path.join(work, 'qc'));
  const srt = arg('srt', null);
  const poster = arg('poster', null);
  const maxBlockiness = num('max-blockiness', 1.75);

  if (!file || !fs.existsSync(file)) throw new Error(`no master at ${file}`);
  fs.mkdirSync(outDir, { recursive: true });

  const info = probe(file);
  const video = info.streams.find((s) => s.codec_type === 'video');
  const audio = info.streams.find((s) => s.codec_type === 'audio');
  const seconds = Number(info.format.duration);
  const size = Number(info.format.size);
  const streamRate = Number(video && video.bit_rate) || 0;
  const bitrate = streamRate || Math.round((size * 8) / seconds);

  const checks = [];
  const add = (id, ok, detail, hard = true) => checks.push({ id, ok, detail, hard });

  add('container', path.extname(file).toLowerCase() === '.mp4', `file ${path.basename(file)}`);
  const fast = faststart(file);
  add('faststart', fast !== false, fast === null ? 'moov or mdat not found in the first 2 MB' : `moov before mdat: ${fast}`);

  add('video-codec', video && video.codec_name === 'h264',
    `codec ${video ? video.codec_name : 'missing'}`);
  add('video-size', video && video.width === expectW && video.height === expectH,
    `${video ? `${video.width}x${video.height}` : 'missing'} wanted ${expectW}x${expectH}`);
  add('video-pixfmt', video && /yuv420p/.test(video.pix_fmt || ''),
    `pix_fmt ${video ? video.pix_fmt : 'missing'}`);
  const [rateNum, rateDen] = String((video && video.r_frame_rate) || '0/1').split('/').map(Number);
  const rate = rateDen ? rateNum / rateDen : 0;
  add('video-fps', Math.abs(rate - expectFps) < 0.01, `${rate} fps wanted ${expectFps}`);

  add('video-bitrate', bitrate >= minBitrate,
    `${Math.round(bitrate / 1000)} kbps wanted at least ${Math.round(minBitrate / 1000)} kbps`);

  add('audio-stream', Boolean(audio) && audio.codec_name === 'aac',
    audio ? `${audio.codec_name} ${audio.channels}ch ${audio.sample_rate} Hz` : 'missing');
  const extra = info.streams.length - (video ? 1 : 0) - (audio ? 1 : 0);
  add('streams', extra === 0, `${info.streams.length} streams, ${extra} unexpected`);

  const errors = decodeErrors(file);
  add('decode', errors.length === 0, errors.length ? errors.join(' | ') : 'clean');

  const loud = loudness(file);
  add('loudness', loud.integrated !== null && loud.integrated >= -16.5 && loud.integrated <= -11,
    `I ${loud.integrated} LUFS wanted -16.5 to -11`);
  add('true-peak', loud.truePeak !== null && loud.truePeak <= maxTruePeak,
    `${loud.truePeak} dBTP wanted no higher than ${maxTruePeak}`);
  add('lra', loud.lra !== null && loud.lra > 0.8, `LRA ${loud.lra} LU`);

  let timeline = null;
  const timelineFile = path.join(work, 'timeline.json');
  if (fs.existsSync(timelineFile)) timeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
  if (timeline) {
    add('duration', Math.abs(seconds - timeline.duration) <= 0.7,
      `${seconds.toFixed(3)} s against timeline ${timeline.duration} s`);
  }

  /*
   * Codec damage is not visible in a downscale and a blockiness heuristic did
   * not catch the 738 kbps Bhopal master, so the gate rebuilds the authored
   * frame from the same plates and timeline and compares it with what the file
   * actually decodes. The captions are burned by ffmpeg after the canvas, so the
   * comparison uses a centre crop that no caption reaches.
   */
  const cw = Math.min(640, Math.round(expectW / 3));
  const ch = Math.min(360, Math.round(expectH / 3));
  const x = Math.round((expectW - cw) / 2);
  const y = Math.round((expectH - ch) / 2);
  const scenes = timeline ? timeline.scenes : [{ id: 'film', start: 0, duration: seconds }];
  const samples = [];
  for (const scene of scenes) {
    const t = Number(scene.start) + Math.min(1.0, Number(scene.duration) / 3);
    if (!(t > 0) || t >= seconds - 0.1) continue;
    const gray = cropGray(file, t, x, y, cw, ch);
    const b = blockiness(gray, cw, ch);
    samples.push({ scene: scene.id, t: Number(t.toFixed(2)), ...b });
  }
  const ratio = median(samples.filter((s) => !s.flat).map((s) => s.ratio));
  if (ratio !== null) {
    add('blockiness', ratio <= maxBlockiness,
      `median edge/interior ${ratio.toFixed(2)} wanted at most ${maxBlockiness}`, false);
  }

  if (srt) {
    const exists = fs.existsSync(srt);
    const cues = exists ? (fs.readFileSync(srt, 'utf8').match(/-->/g) || []).length : 0;
    add('captions', exists && cues > 10, `${cues} cues in ${path.basename(srt)}`);
  }
  if (poster) {
    const exists = fs.existsSync(poster);
    const bytes = exists ? fs.statSync(poster).size : 0;
    add('poster', exists && bytes > 30000, `${Math.round(bytes / 1024)} KB`);
  }

  /*
   * Keep the evidence: a 1:1 crop per scene and the numbers beside it, so a
   * human can see exactly what the gate saw.
   */
  for (const s of samples) {
    const png = path.join(outDir, `crop-${String(s.scene).replace(/[^\w-]/g, '_')}.png`);
    spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y',
      '-ss', String(s.t), '-i', file, '-frames:v', '1',
      '-vf', `crop=${cw}:${ch}:${x}:${y}`, png]);
  }

  let psnr = null;
  const minPsnr = num('min-psnr', 36);
  if (timeline && fs.existsSync(path.join(work, 'plates'))) {
    const samplesDb = await codecPsnr(file, film, timeline, work,
      { width: expectW, height: expectH, x, y, w: cw, h: ch }, expectFps);
    const measuredDb = samplesDb.map((s) => s.db);
    const middle = median(measuredDb);
    psnr = { median: middle, samples: samplesDb };
    const worst = samplesDb.reduce((m, s) => (!m || s.db < m.db ? s : m), null);
    add('codec-psnr', middle !== null && middle >= minPsnr,
      middle === null ? 'no frames compared'
        : `median ${middle.toFixed(1)} dB wanted at least ${minPsnr} dB` +
          (worst ? `, worst ${worst.db.toFixed(1)} dB at ${worst.scene}` : ''));
  }

  const failed = checks.filter((c) => c.hard && !c.ok);
  const report = {
    film,
    file: path.basename(file),
    bytes: size,
    seconds,
    bitrate,
    ok: failed.length === 0,
    checks,
    blockiness: { median: ratio, samples },
    psnr,
  };
  const reportFile = path.join(outDir, 'qc.json');
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`film      ${film}  ${(size / 1048576).toFixed(1)} MB  ${seconds.toFixed(3)} s  ${Math.round(bitrate / 1000)} kbps`);
  for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.id.padEnd(14)} ${c.detail}`);
  console.log(`verdict   ${report.ok ? 'PASS' : 'REJECT'}`);
  console.log(`report    ${path.relative(ROOT, reportFile)}`);
  if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`qc-film: ${err.message}`);
  process.exitCode = 1;
});

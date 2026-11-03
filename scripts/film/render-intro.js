'use strict';

/**
 * Render the vlymbooq channel bumper.
 *
 * Eight seconds, one room, one thread, one stamp. The thread draws across the
 * table, lifts into the rule under the title, and the name lands on the beat the
 * theme already marks with a stamp. Silent until the theme arrives.
 *
 * Usage:
 *   node scripts/film/render-intro.js --out out/brand/vlymbooq-intro.mp4
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const {
  ID, FONT, smooth, clamp, setFont, fillSpaced, drawArchiveBackdrop,
  drawPin, threadPoints, strokeThread
} = require('./render-canvas');
const { renderTheme } = require('./theme');

function parse(argv) {
  const o = {
    out: path.join(ROOT, 'out', 'brand', 'vlymbooq-intro.mp4'),
    work: path.join(ROOT, 'out', 'brand', 'intro'),
    width: 1920,
    height: 1080,
    fps: 24,
    duration: 8
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--out') o.out = path.resolve(next());
    else if (a === '--work') o.work = path.resolve(next());
    else if (a === '--width') o.width = Number(next());
    else if (a === '--height') o.height = Number(next());
    else if (a === '--fps') o.fps = Number(next());
    else if (a === '--duration') o.duration = Number(next());
    else throw new Error(`Unknown option: ${a}`);
  }
  return o;
}

function fitFont(ctx, text, maxWidth, start, family, weight = 400) {
  let size = start;
  setFont(ctx, size, family, weight);
  while (size > 6 && ctx.measureText(String(text)).width > maxWidth) {
    size -= 1;
    setFont(ctx, size, family, weight);
  }
  return size;
}

function drawTag(ctx, x, y, text, W, H, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const size = Math.max(7, W * 0.0060);
  setFont(ctx, size, FONT.monoBold, 700);
  const tw = ctx.measureText(text).width;
  const padX = W * 0.012;
  const h = H * 0.040;
  ctx.fillStyle = '#d9cdb5';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetY = W * 0.004;
  ctx.fillRect(x - padX, y - h * 0.68, tw + padX * 2, h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = ID.thread;
  ctx.fillRect(x - padX, y - h * 0.68, tw + padX * 2, Math.max(1, H * 0.0030));
  ctx.fillStyle = 'rgba(8,7,6,0.82)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y + h * 0.16);
  ctx.restore();
}

function drawTitle(ctx, t, W, H) {
  const reveal = smooth((t - 4.25) / 1.1);
  if (reveal <= 0.001) return;
  const push = smooth((t - 4.0) / 3.4);
  const titleSize = fitFont(ctx, 'THE EVIDENCE ROOM', W * 0.78, Math.min(W * 0.145, H * 0.225), FONT.display, 400);
  const y = H * 0.545;
  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.translate(0, (1 - reveal) * H * 0.028);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = reveal * smooth((t - 4.55) / 0.7);
  ctx.fillStyle = ID.amber;
  setFont(ctx, Math.max(8, W * 0.0086), FONT.monoBold, 700);
  fillSpaced(ctx, 'A VLYMBOOQ FILM', W / 2, H * 0.140, Math.max(1.2, W * 0.0034), 'center');
  ctx.globalAlpha = reveal;

  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = W * 0.035;
  ctx.fillStyle = ID.paper;
  setFont(ctx, titleSize, FONT.display, 400);
  ctx.fillText('THE EVIDENCE ROOM', W / 2, y);

  const ruleW = W * 0.34 * smooth((t - 4.9) / 0.8);
  const grad = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
  grad.addColorStop(0, 'rgba(168,50,36,0)');
  grad.addColorStop(0.5, 'rgba(168,50,36,0.96)');
  grad.addColorStop(1, 'rgba(168,50,36,0)');
  ctx.shadowBlur = 0;
  ctx.fillStyle = grad;
  ctx.fillRect(W / 2 - ruleW / 2, y + H * 0.024, ruleW, Math.max(1, H * 0.0022));

  const sub = smooth((t - 6.05) / 0.7);
  if (sub > 0.001) {
    ctx.globalAlpha = reveal * sub;
    ctx.fillStyle = 'rgba(233,221,198,0.72)';
    setFont(ctx, Math.max(8, W * 0.0092), FONT.monoBold, 700);
    fillSpaced(ctx, 'SOURCED HISTORY · ONE CASE FILE AT A TIME', W / 2,
      y + H * 0.072, Math.max(1.1, W * 0.0028), 'center');
  }
  ctx.restore();

  const promise = smooth((t - 6.5) / 0.7);
  if (promise > 0.001) {
    ctx.save();
    ctx.globalAlpha = promise * 0.52;
    ctx.fillStyle = ID.paper;
    ctx.textAlign = 'center';
    setFont(ctx, Math.max(6, W * 0.0057), FONT.mono, 500);
    fillSpaced(ctx, 'EVERY CLAIM HAS A SOURCE · EVERY NUMBER HAS A LEDGER ROW',
      W / 2, H * 0.885, Math.max(0.7, W * 0.0015), 'center');
    ctx.restore();
  }
}

function drawStampMark(ctx, t, W, H) {
  const p = smooth((t - 5.50) / 0.30);
  if (p <= 0.001) return;
  const x = W * 0.50;
  const y = H * 0.285;
  const rot = (-4.5 * Math.PI) / 180;
  const scale = 1.22 - 0.22 * p;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha = p * 0.92;
  const text = 'VLYMBOOQ';
  const size = Math.max(10, W * 0.0205);
  setFont(ctx, size, FONT.monoBold, 700);
  const tw = ctx.measureText(text).width;
  const padX = W * 0.020;
  const boxH = H * 0.086;
  ctx.strokeStyle = ID.thread;
  ctx.lineWidth = Math.max(2, W * 0.0030);
  ctx.strokeRect(-tw / 2 - padX, -boxH / 2, tw + padX * 2, boxH);
  ctx.fillStyle = ID.thread;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -H * 0.004);
  ctx.fillStyle = 'rgba(168,50,36,0.88)';
  setFont(ctx, Math.max(6, W * 0.0068), FONT.mono, 500);
  fillSpaced(ctx, 'CASE FILE · 01', 0, H * 0.024, W * 0.0014, 'center');
  ctx.restore();
}

function drawFrame(ctx, t, W, H) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const push = 1 + 0.035 * smooth(t / 8);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);

  drawArchiveBackdrop(ctx, W, H, { lift: true });

  const lamp = smooth(t / 1.4);
  ctx.save();
  const glow = ctx.createRadialGradient(W * 0.16, H * 0.08, 0, W * 0.16, H * 0.08, W * 0.95);
  glow.addColorStop(0, `rgba(216,165,88,${0.20 * lamp})`);
  glow.addColorStop(0.35, `rgba(216,165,88,${0.055 * lamp})`);
  glow.addColorStop(1, 'rgba(216,165,88,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // The thread draws, then lifts into the rule under the title.
  const draw = smooth((t - 0.55) / 1.85);
  const lift = smooth((t - 3.25) / 1.20);
  if (draw > 0.001) {
    const y = H * (0.600 - 0.085 * lift);
    const sag = H * (0.045 - 0.045 * lift);
    const from = [W * 0.095, y];
    const to = [W * 0.905, y];
    const pts = threadPoints(from, to, sag);
    const n = Math.max(2, Math.round(pts.length * draw));
    const visible = pts.slice(0, n);
    ctx.save();
    strokeThread(ctx, visible, W, W * 0.0044, 'rgba(0,0,0,0.58)');
    strokeThread(ctx, visible, W, W * 0.0021, ID.thread);
    strokeThread(ctx, visible, W, W * 0.0008, 'rgba(255,178,150,0.40)');
    if (draw > 0.02) drawPin(ctx, from[0], from[1], W);
    if (draw > 0.96) drawPin(ctx, to[0], to[1], W);
    ctx.restore();

    const tagA = smooth((t - 1.75) / 0.55);
    const tagB = smooth((t - 2.05) / 0.55);
    drawTag(ctx, W * 0.108, y + H * 0.055, 'THE CLAIM', W, H, tagA);
    drawTag(ctx, W * 0.755, y + H * 0.055, 'THE RECORD', W, H, tagB);
  }

  const wiggle = Math.sin(t * 0.55) * W * 0.0012;
  ctx.save();
  ctx.translate(wiggle, 0);
  drawTitle(ctx, t, W, H);
  drawStampMark(ctx, t, W, H);
  ctx.restore();

  // Vignette: the room falls away at the edges.
  const vignette = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.20, W / 2, H * 0.48, H * 0.82);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.72, 'rgba(0,0,0,0.10)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.56)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const fadeIn = 1 - smooth(t / 0.55);
  const fadeOut = smooth((t - 7.25) / 0.75);
  const black = Math.max(fadeIn, fadeOut);
  if (black > 0.001) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(black)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function encode(opts) {
  const pattern = path.join(opts.work, 'frames', 'frame-%05d.jpg');
  const theme = path.join(opts.work, 'theme.wav');
  renderTheme(theme, 12);
  const args = [
    '-y',
    '-framerate', String(opts.fps),
    '-i', pattern,
    '-i', theme,
    '-af', `afade=t=in:st=0:d=0.18,afade=t=out:st=${Math.max(0, opts.duration - 1.1)}:d=1.1,volume=0.92`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', String(opts.duration),
    '-movflags', '+faststart',
    opts.out
  ];
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit', cwd: ROOT });
  if (r.error) throw new Error(`ffmpeg failed to start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg exited ${r.status}`);
}

function main() {
  const opts = parse(process.argv.slice(2));
  const frames = path.join(opts.work, 'frames');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const total = Math.round(opts.duration * opts.fps);
  for (let i = 0; i < total; i++) {
    const t = i / opts.fps;
    const canvas = createCanvas(opts.width, opts.height);
    const ctx = canvas.getContext('2d');
    drawFrame(ctx, t, opts.width, opts.height);
    fs.writeFileSync(path.join(frames, `frame-${String(i).padStart(5, '0')}.jpg`),
      canvas.toBuffer('image/jpeg', 94));
    if (i % 24 === 0) process.stdout.write(`\rintro frame ${i + 1}/${total}`);
  }
  process.stdout.write('\n');
  encode(opts);
  const size = fs.statSync(opts.out).size;
  console.log(`intro: ${opts.out} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}

try {
  main();
} catch (e) {
  console.error(`FAIL ${e.stack || e.message}`);
  process.exitCode = 1;
}

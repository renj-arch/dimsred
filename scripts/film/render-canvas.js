'use strict';

/**
 * Deterministic frame compositor for the film pipeline.
 *
 * The first Chromium capture pass exposed a tiled-compositor bug: text that
 * crossed a raster tile was painted twice (and sometimes a full plate was
 * repeated). The bug survived screenshots, screencasts and html2canvas. This
 * renderer draws the same timeline on a Skia 2D canvas instead, so every frame
 * is a single, complete surface. It is still CPU-only and runs on the free
 * GitHub runner; no frame is rendered on the owner's machine.
 *
 * The renderer is deliberately data-driven: it consumes the timeline that the
 * validator already checked, and it never invents a shot or a line.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const BONE = '#f2e6d0';
const GOLD = '#d6a14a';
const RUST = '#b14a2f';
const INK = '#070707';

const WIN = process.platform === 'win32' ? 'C:\\Windows\\Fonts\\' : '';

const FONT_FILES = {
  serif: [
    WIN + 'georgia.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
  ],
  serifBold: [
    WIN + 'georgiab.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
  ],
  sans: [
    WIN + 'segoeui.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ],
  sansBold: [
    WIN + 'seguisb.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
  ],
  mono: [
    WIN + 'consola.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
  ]
};

const FALLBACK = {
  serif: 'Liberation Serif',
  serifBold: 'Liberation Serif',
  sans: 'Liberation Sans',
  sansBold: 'Liberation Sans',
  mono: 'Liberation Mono'
};

const FONT = registerFonts();

function registerFonts() {
  const out = {};
  for (const [key, list] of Object.entries(FONT_FILES)) {
    const family = 'Film' + key.charAt(0).toUpperCase() + key.slice(1);
    let registered = false;
    for (const file of list) {
      if (!file || !fs.existsSync(file)) continue;
      try {
        GlobalFonts.registerFromPath(file, family);
        out[key] = family;
        registered = true;
        break;
      } catch (e) {
        // A bad or duplicate font file must not stop the render; try the next.
      }
    }
    if (!registered) out[key] = FALLBACK[key];
  }
  return out;
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function smooth(x) {
  x = clamp(x);
  return x * x * (3 - 2 * x);
}

function lerp(a, b, p) {
  return a + (b - a) * p;
}

function vw(value, width) {
  const m = String(value || '').match(/(-?[\d.]+)\s*vw/i);
  return m ? (Number(m[1]) / 100) * width : Number(value) || 0;
}

function font(size, weight, family) {
  return `${weight || 400} ${Math.max(1, size).toFixed(1)}px "${family}"`;
}

function setFont(ctx, size, family, weight) {
  ctx.font = font(size, weight, family);
}

function spacedWidth(ctx, text, spacing) {
  let width = 0;
  for (const ch of String(text)) width += ctx.measureText(ch).width + spacing;
  return Math.max(0, width - spacing);
}

function fillSpaced(ctx, text, x, y, spacing, align) {
  const value = String(text || '');
  const width = spacedWidth(ctx, value, spacing);
  let cursor = x;
  if (align === 'center') cursor -= width / 2;
  else if (align === 'right') cursor -= width;
  for (const ch of value) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  return width;
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCover(ctx, img, x, y, w, h, focusX = 0.5, focusY = 0.5) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) * focusX;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) * focusY;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPlate(ctx, img, shot, t, W, H) {
  const hp = clamp((t - shot.start) / Math.max(0.01, shot.duration));
  const e = smooth(hp);
  const f = shot.framing || { zoom: [1.02, 1.08], x: [50, 50], y: [50, 50] };
  const z = lerp(Number(f.zoom[0]) || 1, Number(f.zoom[1]) || 1, e);
  const px = (lerp(Number(f.x[0]) || 50, Number(f.x[1]) || 50, e) - 50) * 0.55;
  const py = (lerp(Number(f.y[0]) || 50, Number(f.y[1]) || 50, e) - 50) * 0.55;
  const wx = Math.sin(t * 0.73 + 0.4) * 0.045;
  const wy = Math.cos(t * 0.51 + 1.2) * 0.030;
  const rot = Math.sin(t * 0.37) * 0.028;
  const bw = W * 1.08 * z;
  const bh = H * 1.08 * z;
  const cx = W / 2 + z * ((px + wx) / 100) * (W * 1.08);
  const cy = H / 2 + z * ((py + wy) / 100) * (H * 1.08);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  drawCover(ctx, img, -bw / 2, -bh / 2, bw, bh);
  ctx.restore();
}

function drawGhost(ctx, img, W, H, scale = 1.01, alpha = 1, dx = 0, blur = 0) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur > 0) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.translate(W / 2 + dx, H / 2);
  ctx.scale(scale, scale);
  drawCover(ctx, img, -W / 2, -H / 2, W, H);
  ctx.restore();
}

function drawTitleBackdrop(ctx, W, H) {
  // A pure black card with a barely-there vertical lift. An earlier radial
  // gold glow banded badly at preview bitrates and read as a grey cloud
  // behind the title. The type and the rule carry the card instead.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070606');
  g.addColorStop(0.55, '#050505');
  g.addColorStop(1, '#030303');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawGrade(ctx, W, H, opts = {}) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.62, 'rgba(0,0,0,0.06)');
  v.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const t = ctx.createLinearGradient(0, 0, 0, H);
  t.addColorStop(0, 'rgba(0,0,0,0.30)');
  t.addColorStop(0.24, 'rgba(0,0,0,0)');
  t.addColorStop(0.74, 'rgba(0,0,0,0)');
  t.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = t;
  ctx.fillRect(0, 0, W, H);
  if (opts.warm) {
    const warm = ctx.createRadialGradient(W * 0.52, H * 0.48, 0, W * 0.52, H * 0.48, W * 0.55);
    warm.addColorStop(0, `rgba(214,161,74,${(0.055 * (opts.warmAmount || 1)).toFixed(3)})`);
    warm.addColorStop(1, 'rgba(214,161,74,0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
  }
}

let noiseCanvas = null;

function drawGrain(ctx, W, H, t) {
  if (!noiseCanvas) {
    noiseCanvas = createCanvas(256, 256);
    const nctx = noiseCanvas.getContext('2d');
    const data = nctx.createImageData(256, 256);
    let seed = 0x9e3779b9;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = 96 + (seed % 96);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
  }
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.17;
  ctx.translate(-((t * 19) % 256), -((t * 13) % 256));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

function drawChapter(ctx, scene, sceneIndex, alpha, W, H) {
  if (alpha <= 0.001) return;
  const x = W * 0.052;
  const y = H * 0.064;
  const size = Math.max(8, W * 0.0092);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = GOLD;
  setFont(ctx, size, FONT.mono, 700);
  fillSpaced(ctx, String(sceneIndex + 1).padStart(2, '0'), x, y, size * 0.18, 'left');
  const lineX = x + size * 2.1;
  const lineY = y + size * 0.45;
  const grad = ctx.createLinearGradient(lineX, 0, lineX + W * 0.052, 0);
  grad.addColorStop(0, 'rgba(214,161,74,0.8)');
  grad.addColorStop(1, 'rgba(214,161,74,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(lineX, lineY, W * 0.052, Math.max(1, H * 0.0014));
  ctx.fillStyle = BONE;
  setFont(ctx, Math.max(7, W * 0.0082), FONT.sans, 600);
  fillSpaced(ctx, String(scene.title || '').toUpperCase(), lineX + W * 0.061, y,
    Math.max(0.7, W * 0.0016), 'left');
  ctx.restore();
}

function drawMeta(ctx, W, H) {
  const x = W * 0.95;
  const y = H * 0.063;
  const size = Math.max(6, W * 0.0063);
  ctx.save();
  ctx.fillStyle = 'rgba(242,230,208,0.78)';
  setFont(ctx, size, FONT.sans, 600);
  fillSpaced(ctx, 'A VLYMBOOQ FILM', x, y, size * 0.42, 'right');
  ctx.fillStyle = 'rgba(242,230,208,0.48)';
  setFont(ctx, Math.max(5.5, W * 0.0056), FONT.sans, 500);
  fillSpaced(ctx, '3D · SOUND · HISTORY', x, y + size * 1.85, size * 0.34, 'right');
  ctx.restore();
}

function drawWatermark(ctx, W, H) {
  const size = Math.max(5.5, W * 0.0060);
  ctx.save();
  ctx.fillStyle = 'rgba(242,230,208,0.34)';
  setFont(ctx, size, FONT.sans, 500);
  fillSpaced(ctx, 'vlymbooq · a film in the making', W * 0.948, H * 0.955,
    size * 0.30, 'right');
  ctx.restore();
}

function drawStatement(ctx, shot, alpha, t, W, H) {
  if (alpha <= 0.001 || !shot.text) return;
  const text = String(shot.text);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = W * 0.028;
  ctx.shadowOffsetY = W * 0.004;
  ctx.fillStyle = BONE;
  if (shot.impact) {
    const size = text.length > 8 ? W * 0.080 : text.length > 5 ? W * 0.104 : W * 0.120;
    const cy = H * 0.585;
    // A soft, local scrim keeps the number readable over a newspaper or a
    // gauge without hiding the plate. It is not a full-frame filter.
    ctx.save();
    ctx.shadowBlur = 0;
    const scrim = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, W * 0.34);
    scrim.addColorStop(0, 'rgba(0,0,0,0.58)');
    scrim.addColorStop(0.55, 'rgba(0,0,0,0.30)');
    scrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.shadowBlur = W * 0.028;
    setFont(ctx, size, FONT.serifBold, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, cy);
    ctx.shadowBlur = W * 0.012;
    const label = String(shot.impactSub || '').toUpperCase();
    if (label) {
      ctx.fillStyle = GOLD;
      setFont(ctx, Math.max(7, W * 0.0097), FONT.sans, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      fillSpaced(ctx, label, W / 2, cy + size * 0.66, Math.max(0.8, W * 0.0018), 'center');
    }
  } else {
    const size = Math.max(10, W * 0.026);
    setFont(ctx, size, FONT.serif, 500);
    const maxWidth = W * 0.52;
    const lines = wrapLines(ctx, text, maxWidth);
    const lineHeight = size * 1.03;
    const inS = smooth((t - shot.start) / 0.34);
    const outS = smooth((shot.duration - (t - shot.start)) / 0.28);
    const y = H * 0.165 + Math.max(0, (1 - inS) * 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => ctx.fillText(line, W * 0.052, y + i * lineHeight));
    // The out fade is carried by alpha; keep the return value unused so the
    // intent is explicit in the proof frame.
    void outS;
  }
  ctx.restore();
}

function drawTitle(ctx, film, shot, t, W, H) {
  const local = t - shot.start;
  const alpha = smooth(local / 0.8);
  if (alpha <= 0.001) return;
  const closing = shot.start > 10;
  const lines = Array.isArray(film.titleLines) && film.titleLines.length
    ? film.titleLines.map(String)
    : [String(film.title || '')];
  let size = vw(film.titleSize, W) || W * 0.124;
  size = Math.min(size, H * 0.34);
  const lineHeight = size * 0.82;
  const total = lineHeight * (lines.length - 1) + size;
  const startY = H * 0.49 - total / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = W * 0.04;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = BONE;
  setFont(ctx, size, FONT.serifBold, 900);
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + size + i * lineHeight - size * 0.14);
  });
  const ruleY = startY + total + H * 0.025;
  const ruleW = W * 0.09;
  const grad = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
  grad.addColorStop(0, 'rgba(214,161,74,0)');
  grad.addColorStop(0.5, 'rgba(214,161,74,0.9)');
  grad.addColorStop(1, 'rgba(214,161,74,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(1, H * 0.0014));
  ctx.shadowBlur = W * 0.012;
  ctx.fillStyle = 'rgba(242,230,208,0.82)';
  const sub = closing ? String(shot.text || film.subtitle || '') : String(film.subtitle || '');
  if (sub) {
    setFont(ctx, Math.max(8, W * 0.0102), FONT.sans, 600);
    fillSpaced(ctx, sub.toUpperCase(), W / 2, ruleY + H * 0.035,
      Math.max(0.8, W * 0.0024), 'center');
  }
  ctx.restore();
}

function drawPosterGrade(ctx, W, H) {
  const bottom = ctx.createLinearGradient(0, H * 0.30, 0, H);
  bottom.addColorStop(0, 'rgba(0,0,0,0)');
  bottom.addColorStop(0.58, 'rgba(0,0,0,0.42)');
  bottom.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, W, H);
  const left = ctx.createLinearGradient(0, 0, W * 0.68, 0);
  left.addColorStop(0, 'rgba(0,0,0,0.78)');
  left.addColorStop(0.45, 'rgba(0,0,0,0.30)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, W, H);
}

function renderPosterFrame(film, timeline, images, W = 1280, H = 720) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const plate = images.get(film.posterPlate) || images.get(timeline.scenes[0].shots[1].plate);
  if (plate) {
    const scale = 1.12;
    const bw = W * scale;
    const bh = H * scale;
    drawCover(ctx, plate, (W - bw) / 2 + W * 0.18, (H - bh) / 2 - H * 0.018, bw, bh, 0.5, 0.5);
  }
  drawGrade(ctx, W, H, { warm: true, warmAmount: 1.35 });
  drawPosterGrade(ctx, W, H);
  drawGrain(ctx, W, H, 0.6);

  const x = W * 0.07;
  const bottom = H * 0.91;
  const titleSize = Math.min(vw(film.posterTitleSize, W) || W * 0.106, H * 0.26);
  const lines = Array.isArray(film.titleLines) && film.titleLines.length
    ? film.titleLines.map(String) : [String(film.title || '')];
  const lh = titleSize * 0.8;
  const titleHeight = lh * (lines.length - 1) + titleSize;
  const metaY = bottom;
  const subY = metaY - H * 0.032;
  const titleBottom = subY - H * 0.035;
  const titleTop = titleBottom - titleHeight;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = W * 0.045;
  ctx.fillStyle = BONE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, titleSize, FONT.serifBold, 900);
  lines.forEach((line, i) => ctx.fillText(line, x, titleTop + titleSize * 0.82 + i * lh));
  ctx.shadowBlur = W * 0.016;
  ctx.fillStyle = GOLD;
  setFont(ctx, Math.max(7, W * 0.009), FONT.sans, 700);
  fillSpaced(ctx, 'A VLYMBOOQ FILM', x, titleTop - H * 0.022, Math.max(0.8, W * 0.0022), 'left');
  ctx.fillStyle = 'rgba(242,230,208,0.84)';
  setFont(ctx, Math.max(8, W * 0.0105), FONT.sans, 600);
  fillSpaced(ctx, String(film.subtitle || '').toUpperCase(), x, subY,
    Math.max(0.8, W * 0.0024), 'left');
  ctx.fillStyle = 'rgba(242,230,208,0.58)';
  setFont(ctx, Math.max(6, W * 0.0067), FONT.sans, 600);
  fillSpaced(ctx, String(film.posterMeta || '').toUpperCase(), x, metaY,
    Math.max(0.6, W * 0.0017), 'left');
  ctx.restore();
  return canvas;
}

function findScene(timeline, t) {
  let scene = timeline.scenes[0];
  for (const s of timeline.scenes) {
    if (t >= s.start - 1e-9) scene = s;
    else break;
  }
  return scene;
}

function flattenShots(timeline) {
  const list = [];
  timeline.scenes.forEach((scene) => {
    scene.shots.forEach((shot) => list.push({ shot, scene }));
  });
  return list;
}

function shotAt(list, t) {
  // A scene lead is silent picture: hold the last shot that has actually
  // started, even when it belongs to the previous scene. Returning the first
  // shot of the whole film here made every scene lead flash the title card.
  let found = list[0];
  for (const item of list) {
    if (t >= item.shot.start - 1e-9) found = item;
    else break;
  }
  return found;
}

function transitionSpec(shot) {
  const spec = shot.transitionSpec || {};
  const type = String(spec.type || shot.transition || 'hard-cut');
  const frames = Math.max(0, Math.round(Number(spec.frames) || 0));
  const duration = Number.isFinite(Number(spec.duration))
    ? Math.max(0, Number(spec.duration)) : frames / 24;
  return { type, frames, duration, spec };
}

function drawCurrent(ctx, item, t, W, H, images) {
  const { shot } = item;
  if (shot.render === 'title') {
    drawTitleBackdrop(ctx, W, H);
    return;
  }
  const img = images.get(shot.plate);
  if (img) drawPlate(ctx, img, shot, t, W, H);
  else {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawTransition(ctx, item, previous, t, W, H, images) {
  const { shot } = item;
  const spec = transitionSpec(shot);
  const local = t - shot.start;
  const p = spec.duration > 1e-9 ? clamp(local / spec.duration) : 1;
  const e = smooth(p);
  const prevImg = previous && previous.shot.render !== 'title' ? images.get(previous.shot.plate) : null;
  const type = spec.type;

  if (type === 'dip') {
    drawCurrent(ctx, item, t, W, H, images);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = Math.sin(Math.PI * p);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }
  if (spec.duration <= 1e-9 || type === 'hard-cut' || type === 'smash-cut' || type === 'flash-frame') {
    drawCurrent(ctx, item, t, W, H, images);
    return;
  }

  const current = () => drawCurrent(ctx, item, t, W, H, images);

  if (type === 'iris') {
    if (prevImg) drawGhost(ctx, prevImg, W, H, 1.01, 1);
    const origin = Array.isArray(spec.spec.origin) ? spec.spec.origin : [50, 50];
    const ox = (Number(origin[0]) / 100) * W;
    const oy = (Number(origin[1]) / 100) * H;
    const radius = Math.max(1, e * 0.78 * W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.clip();
    current();
    ctx.restore();
    if (p < 0.98) {
      ctx.save();
      ctx.strokeStyle = `rgba(236,190,118,${0.82 * (1 - p * 0.35)})`;
      ctx.lineWidth = Math.max(1, W * 0.0016);
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (type === 'paper-wipe') {
    if (prevImg) drawGhost(ctx, prevImg, W, H, 1.01, p < 0.999 ? 1 : 0);
    const dir = String(spec.spec.direction || 'right').toLowerCase();
    const edge = e;
    ctx.save();
    if (dir === 'down') ctx.rect(0, 0, W, H * edge);
    else if (dir === 'up') ctx.rect(0, H * (1 - edge), W, H * edge);
    else if (dir === 'left') ctx.rect(0, 0, W * edge, H);
    else ctx.rect(W * (1 - edge), 0, W * edge, H);
    ctx.clip();
    current();
    ctx.restore();
    if (p < 0.98) {
      const x = dir === 'left' ? W * edge : dir === 'right' ? W * (1 - edge) : 0;
      const y = dir === 'up' ? H * (1 - edge) : dir === 'down' ? H * edge : 0;
      ctx.save();
      const g = dir === 'left' || dir === 'right'
        ? ctx.createLinearGradient(x - W * 0.01, 0, x + W * 0.01, 0)
        : ctx.createLinearGradient(0, y - H * 0.01, 0, y + H * 0.01);
      g.addColorStop(0, 'rgba(214,161,74,0)');
      g.addColorStop(0.5, 'rgba(242,230,208,0.82)');
      g.addColorStop(1, 'rgba(214,161,74,0)');
      ctx.fillStyle = g;
      if (dir === 'left' || dir === 'right') ctx.fillRect(x - W * 0.006, 0, W * 0.012, H);
      else ctx.fillRect(0, y - H * 0.006, W, H * 0.012);
      ctx.restore();
    }
    return;
  }

  if (type === 'dissolve') {
    drawCurrent(ctx, item, t, W, H, images);
    if (prevImg) {
      if (spec.spec.throughFog) drawGhost(ctx, prevImg, W, H, 1.01, p < 0.5 ? 1 : 0);
      else drawGhost(ctx, prevImg, W, H, 1.01, 1 - e);
    }
    if (spec.spec.throughFog) {
      const haze = Math.sin(Math.PI * p);
      const fg = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.78);
      fg.addColorStop(0, `rgba(198,206,192,${(0.92 * haze).toFixed(3)})`);
      fg.addColorStop(0.55, `rgba(154,166,154,${(0.72 * haze).toFixed(3)})`);
      fg.addColorStop(1, `rgba(108,122,114,${(0.50 * haze).toFixed(3)})`);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    return;
  }

  if (type === 'whip-left' || type === 'whip-right') {
    const dir = type === 'whip-left' ? -1 : 1;
    current();
    if (prevImg) {
      drawGhost(ctx, prevImg, W, H, 1.04, p < 1 ? 1 : 0, dir * e * W, e * 16);
    }
    // A thin edge of the incoming frame is already visible under the blur.
    ctx.save();
    ctx.globalAlpha = 0.16 * (1 - e);
    ctx.fillStyle = GOLD;
    const edgeX = dir > 0 ? 0 : W;
    const eg = ctx.createLinearGradient(edgeX, 0, edgeX - dir * W * 0.1, 0);
    eg.addColorStop(0, 'rgba(214,161,74,0.6)');
    eg.addColorStop(1, 'rgba(214,161,74,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (type === 'match-cut' || type === 'match' || /cross/i.test(type)) {
    drawCurrent(ctx, item, t, W, H, images);
    if (prevImg) drawGhost(ctx, prevImg, W, H, 1 + e * 0.035, 1 - e);
    return;
  }

  drawCurrent(ctx, item, t, W, H, images);
}

function drawFrame(ctx, film, timeline, list, t, W, H, images) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const scene = findScene(timeline, t);
  const item = shotAt(list, t);
  const idx = list.indexOf(item);
  const previous = idx > 0 ? list[idx - 1] : null;
  drawTransition(ctx, item, previous, t, W, H, images);

  const warm = item.shot.render !== 'title' && /lamp|memorial|flare|desk|window/i.test(String(item.shot.plate || ''));
  drawGrade(ctx, W, H, { warm, warmAmount: warm ? 1 : 0 });
  drawGrain(ctx, W, H, t);

  const sceneLocal = t - scene.start;
  const chapterIn = smooth(sceneLocal / 0.30);
  const chapterOut = smooth((scene.duration - sceneLocal) / 0.32);
  const chapterAlpha = item.shot.render === 'title' ? 0 : Math.min(chapterIn, chapterOut);
  drawChapter(ctx, scene, timeline.scenes.indexOf(scene), chapterAlpha, W, H);
  drawMeta(ctx, W, H);

  if (item.shot.render === 'title') {
    drawTitle(ctx, film, item.shot, t, W, H);
  } else {
    const local = t - item.shot.start;
    const inS = smooth(local / (timeline.pacing === 'tight' ? 0.34 : 0.52));
    const outS = smooth((item.shot.duration - local) / (timeline.pacing === 'tight' ? 0.28 : 0.48));
    const alpha = item.shot.impact ? outS : Math.min(inS, outS);
    drawStatement(ctx, item.shot, alpha, t, W, H);
  }
  drawWatermark(ctx, W, H);

  const filmIn = smooth(t / 0.20);
  const filmOut = smooth((timeline.duration - t) / 0.30);
  const fade = 1 - Math.min(filmIn, filmOut);
  if (fade > 0.001) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}

async function loadPlateImages(timeline, platesDir) {
  const names = new Set();
  timeline.scenes.forEach((scene) => scene.shots.forEach((shot) => {
    if (shot.plate && shot.render !== 'title') names.add(shot.plate);
  }));
  const images = new Map();
  await Promise.all([...names].map(async (name) => {
    const file = path.join(platesDir, `${name}.png`);
    if (!fs.existsSync(file)) throw new Error(`missing plate: ${file}`);
    images.set(name, await loadImage(file));
  }));
  return images;
}

async function renderFrames(timeline, opts) {
  const framesDir = path.join(opts.work, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const platesDir = path.join(opts.work, 'plates');
  const images = await loadPlateImages(timeline, platesDir);
  const film = opts.filmData || loadFilmData(opts.film);
  const list = flattenShots(timeline);
  const canvas = createCanvas(opts.width, opts.height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const total = Math.ceil(timeline.duration * opts.captureFps);
  console.log(`canvas: ${opts.captureFps} fps · ${opts.width}x${opts.height} · ${timeline.duration.toFixed(1)}s`);

  /*
   * The quality argument is not trusted until it is proved. @napi-rs/canvas
   * 1.0.13 silently ignores the 0-1 quality number and writes every frame at
   * its default, which shipped 14 KB frames for a 1080p film, starved the
   * encoder to 738 kbps and turned the plates into macroblocks while the
   * ffmpeg captions stayed sharp. Draw one real frame, encode it twice and
   * refuse to continue unless quality actually changes the bytes.
   */
  const probe = createCanvas(256, 144);
  const probeCtx = probe.getContext('2d');
  const noise = probeCtx.createImageData(256, 144);
  for (let i = 0; i < noise.data.length; i += 4) {
    const v = (i * 2654435761) >>> 0;
    noise.data[i] = v & 0xff;
    noise.data[i + 1] = (v >>> 8) & 0xff;
    noise.data[i + 2] = (v >>> 16) & 0xff;
    noise.data[i + 3] = 255;
  }
  probeCtx.putImageData(noise, 0, 0);
  const lowQ = await probe.encode('jpeg', 50);
  const highQ = await probe.encode('jpeg', 92);
  if (highQ.length < lowQ.length * 1.3) {
    throw new Error('JPEG encoder ignored its quality argument ' +
      `(q92 ${highQ.length} bytes vs q50 ${lowQ.length} bytes on a noise probe)`);
  }
  console.log(`  frame quality: q92 ${(highQ.length / 1024).toFixed(0)} KB, q50 ${(lowQ.length / 1024).toFixed(0)} KB`);

  for (let f = 0; f < total; f++) {
    const t = f / opts.captureFps;
    drawFrame(ctx, film, timeline, list, t, opts.width, opts.height, images);
    const file = path.join(framesDir, `frame-${String(f + 1).padStart(6, '0')}.jpg`);
    await fsp.writeFile(file, await canvas.encode('jpeg', 92));
    if (f % 120 === 0 || f === total - 1) {
      console.log(`  frame ${f + 1}/${total}  ${t.toFixed(1)}s`);
    }
  }

  /*
   * The probe proves the encoder honours quality; this proves the film got the
   * bytes. The silent-default failure averaged 14 KB a frame at 1080p, so a
   * floor well below a dark film and well above the broken encoder catches it.
   */
  const bytes = fs.readdirSync(framesDir)
    .reduce((n, name) => n + fs.statSync(path.join(framesDir, name)).size, 0);
  const average = bytes / total;
  console.log(`  frames: ${(bytes / 1048576).toFixed(1)} MB, ${(average / 1024).toFixed(0)} KB average`);
  if (average < 30 * 1024) {
    throw new Error(`frames averaged only ${(average / 1024).toFixed(0)} KB at ${opts.width}x${opts.height}; ` +
      'the JPEG writer is falling back to its default quality');
  }
  return framesDir;
}

function loadFilmData(id) {
  const file = path.join(__dirname, '..', '..', 'data', 'films', `${id}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function renderPoster(film, timeline, opts) {
  const platesDir = path.join(opts.work, 'plates');
  const images = await loadPlateImages(timeline, platesDir);
  const canvas = renderPosterFrame(film, timeline, images, 1280, 720);
  const file = path.join(opts.work, `${opts.film}-thumb.jpg`);
  await fsp.writeFile(file, await canvas.encode('jpeg', 92));
  console.log(`thumbnail: ${file}`);
  return file;
}

module.exports = {
  renderFrames,
  renderPoster,
  renderPosterFrame,
  drawFrame,
  loadPlateImages,
  loadFilmData
};

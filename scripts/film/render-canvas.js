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

const BONE = '#e9ddc6';
const GOLD = '#d8a558';
const RUST = '#a83224';
const INK = '#080706';

// The channel palette. Every film uses the same five anchors so a frame is
// recognisable before the title arrives: ink, archive paper, thread red,
// sodium light, oxidised green.
const ID = {
  ink: '#080706',
  paper: '#e9ddc6',
  paperDim: '#b9ad96',
  thread: '#a83224',
  amber: '#d8a558',
  oxide: '#5d6b60',
  black: '#020202'
};

const ROOT = path.resolve(__dirname, '..', '..');
const FONT_DIR = path.join(ROOT, 'assets', 'film-fonts');
const WIN = process.platform === 'win32' ? 'C:\\Windows\\Fonts\\' : '';

const FONT_FILES = {
  display: [
    path.join(FONT_DIR, 'Anton-Regular.ttf'),
    '/usr/share/fonts/truetype/anton/Anton-Regular.ttf'
  ],
  serif: [
    path.join(FONT_DIR, 'Spectral-Regular.ttf'),
    WIN + 'georgia.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
  ],
  serifBold: [
    path.join(FONT_DIR, 'Spectral-Bold.ttf'),
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
    path.join(FONT_DIR, 'IBMPlexMono-Regular.ttf'),
    WIN + 'consola.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
  ],
  monoBold: [
    path.join(FONT_DIR, 'IBMPlexMono-Bold.ttf'),
    WIN + 'consolab.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
  ]
};

const FALLBACK = {
  display: 'Liberation Sans',
  serif: 'Liberation Serif',
  serifBold: 'Liberation Serif',
  sans: 'Liberation Sans',
  sansBold: 'Liberation Sans',
  mono: 'Liberation Mono',
  monoBold: 'Liberation Mono'
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
  ctx.fillStyle = ID.thread;
  ctx.fillRect(x, y - size * 0.72, size * 0.62, size * 0.62);
  ctx.fillStyle = ID.amber;
  setFont(ctx, size, FONT.monoBold, 700);
  fillSpaced(ctx, String(sceneIndex + 1).padStart(2, '0'), x + size * 1.15, y, size * 0.14, 'left');
  const lineX = x + size * 3.2;
  const lineY = y + size * 0.45;
  const grad = ctx.createLinearGradient(lineX, 0, lineX + W * 0.052, 0);
  grad.addColorStop(0, 'rgba(216,165,88,0.8)');
  grad.addColorStop(1, 'rgba(216,165,88,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(lineX, lineY, W * 0.052, Math.max(1, H * 0.0014));
  ctx.fillStyle = ID.paper;
  setFont(ctx, Math.max(7, W * 0.0074), FONT.monoBold, 700);
  fillSpaced(ctx, String(scene.title || '').toUpperCase(), lineX + W * 0.061, y,
    Math.max(0.8, W * 0.0014), 'left');
  ctx.restore();
}

function drawMeta(ctx, W, H) {
  const x = W * 0.95;
  const y = H * 0.063;
  const size = Math.max(6, W * 0.0063);
  ctx.save();
  ctx.fillStyle = 'rgba(233,221,198,0.86)';
  setFont(ctx, size, FONT.monoBold, 700);
  fillSpaced(ctx, 'THE EVIDENCE ROOM', x, y, size * 0.30, 'right');
  ctx.fillStyle = 'rgba(233,221,198,0.44)';
  setFont(ctx, Math.max(5.5, W * 0.0054), FONT.mono, 500);
  fillSpaced(ctx, 'A VLYMBOOQ FILM', x, y + size * 1.85, size * 0.26, 'right');
  ctx.restore();
}

function drawWatermark(ctx, W, H) {
  const size = Math.max(5.5, W * 0.0060);
  ctx.save();
  ctx.fillStyle = 'rgba(233,221,198,0.32)';
  setFont(ctx, size, FONT.mono, 500);
  fillSpaced(ctx, 'vlymbooq · the evidence room', W * 0.948, H * 0.955,
    size * 0.22, 'right');
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
    setFont(ctx, size, FONT.display, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text).toUpperCase(), W / 2, cy);
    ctx.shadowBlur = W * 0.012;
    const label = String(shot.impactSub || '').toUpperCase();
    if (label) {
      ctx.fillStyle = GOLD;
      setFont(ctx, Math.max(7, W * 0.0097), FONT.monoBold, 700);
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
  const alpha = smooth(local / 0.9);
  if (alpha <= 0.001) return;
  const closing = shot.closing === true || shot.start > (Number(film.targetDuration) || 300) * 0.78;
  const lines = Array.isArray(film.titleLines) && film.titleLines.length
    ? film.titleLines.map(String)
    : [String(film.title || '')];
  let size = vw(film.titleSize, W) || Math.min(W * 0.150, H * 0.290);
  size = Math.min(size, H * 0.34);
  const lineHeight = size * 0.86;
  const total = lineHeight * (lines.length - 1) + size;
  const startY = H * 0.46 - total / 2;
  ctx.save();
  ctx.globalAlpha = alpha;

  const eyebrow = `${film.caseNumber ? `CASE ${film.caseNumber} · ` : ''}THE EVIDENCE ROOM`;
  ctx.fillStyle = ID.thread;
  setFont(ctx, Math.max(7.5, W * 0.0086), FONT.monoBold, 700);
  fillSpaced(ctx, eyebrow.toUpperCase(), W / 2, startY - H * 0.042,
    Math.max(1.0, W * 0.0020), 'center');

  ctx.shadowColor = 'rgba(0,0,0,0.72)';
  ctx.shadowBlur = W * 0.035;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ID.paper;
  setFont(ctx, size, FONT.display, 400);
  lines.forEach((line, i) => {
    ctx.fillText(String(line).toUpperCase(), W / 2, startY + size * 0.86 + i * lineHeight);
  });

  const ruleY = startY + total + H * 0.022;
  const ruleW = W * 0.22;
  const grad = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
  grad.addColorStop(0, 'rgba(168,50,36,0)');
  grad.addColorStop(0.5, 'rgba(168,50,36,0.95)');
  grad.addColorStop(1, 'rgba(168,50,36,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(1, H * 0.0018));

  ctx.shadowBlur = W * 0.010;
  ctx.fillStyle = 'rgba(233,221,198,0.86)';
  const sub = closing ? String(shot.text || film.subtitle || '') : String(film.subtitle || '');
  if (sub) {
    setFont(ctx, Math.max(8, W * 0.0100), FONT.monoBold, 700);
    fillSpaced(ctx, sub.toUpperCase(), W / 2, ruleY + H * 0.038,
      Math.max(1.0, W * 0.0024), 'center');
  }
  if (closing) {
    ctx.fillStyle = 'rgba(233,221,198,0.44)';
    setFont(ctx, Math.max(6, W * 0.0062), FONT.mono, 500);
    const sourceCount = Array.isArray(film.sources) ? film.sources.length : 0;
    fillSpaced(ctx, `${sourceCount} SOURCES · THE RECORD IS IN THE DESCRIPTION`,
      W / 2, H * 0.855, Math.max(0.8, W * 0.0013), 'center');
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The Evidence Room
//
// The channel format, not a skin. Every film is a case file laid out in one
// room: paper, pins, one lamp, a red thread. The room becomes the world the
// evidence describes, then returns to paper. The thread is the only transition
// that repeats, because it is the argument: claim -> evidence -> consequence.
//
// The graphics below are data-driven and deterministic. They never invent a
// number: the storyboard carries the ledger row behind every figure, and the
// validator checks it.
// ---------------------------------------------------------------------------

const INDIA_BBOX = { minLon: 66, maxLon: 98, minLat: 6, maxLat: 36 };
let INDIA_RINGS = null;

function indiaRings() {
  if (INDIA_RINGS) return INDIA_RINGS;
  const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'countries-110m.json'), 'utf8'));
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  const india = topo.objects.countries.geometries.find(
    (g) => String(g.properties && g.properties.name).toLowerCase() === 'india'
  );
  if (!india) throw new Error('India not found in countries-110m.json');
  const rings = [];
  const addRing = (ringArcs) => {
    const pts = [];
    ringArcs.forEach((i) => {
      const arc = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
      arc.forEach((p) => pts.push(p));
    });
    rings.push(pts);
  };
  if (india.type === 'Polygon') india.arcs.forEach(addRing);
  else if (india.type === 'MultiPolygon') india.arcs.forEach((poly) => poly.forEach(addRing));
  INDIA_RINGS = rings;
  return rings;
}

function projectIndia(lon, lat, rect) {
  return [
    rect.x + ((lon - INDIA_BBOX.minLon) / (INDIA_BBOX.maxLon - INDIA_BBOX.minLon)) * rect.w,
    rect.y + ((INDIA_BBOX.maxLat - lat) / (INDIA_BBOX.maxLat - INDIA_BBOX.minLat)) * rect.h
  ];
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function fitSize(ctx, text, maxWidth, start, family, weight) {
  let size = start;
  setFont(ctx, size, family, weight);
  while (size > 6 && ctx.measureText(String(text)).width > maxWidth) {
    size -= 1;
    setFont(ctx, size, family, weight);
  }
  return size;
}

function drawArchiveBackdrop(ctx, W, H, opts = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0907');
  g.addColorStop(0.52, opts.lift ? '#17130d' : '#12100c');
  g.addColorStop(1, '#070605');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const warm = ctx.createRadialGradient(W * 0.16, H * 0.10, 0, W * 0.16, H * 0.10, W * 0.9);
  warm.addColorStop(0, 'rgba(216,165,88,0.11)');
  warm.addColorStop(0.45, 'rgba(216,165,88,0.035)');
  warm.addColorStop(1, 'rgba(216,165,88,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(233,221,198,0.042)';
  ctx.lineWidth = Math.max(1, W * 0.0007);
  const step = W * 0.046;
  for (let x = step; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = step; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGraphicHeader(ctx, g, W, H, alpha = 1) {
  const x = W * 0.055;
  const y = H * 0.108;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = ID.thread;
  ctx.fillRect(x, y - H * 0.019, Math.max(2, W * 0.0022), H * 0.013);
  ctx.fillStyle = ID.amber;
  setFont(ctx, Math.max(8, W * 0.0088), FONT.monoBold, 700);
  fillSpaced(ctx, String(g.eyebrow || '').toUpperCase(), x + W * 0.015, y, W * 0.0015, 'left');
  const title = String(g.title || '').toUpperCase();
  const size = Math.min(H * 0.078, W * 0.048);
  setFont(ctx, size, FONT.display, 400);
  ctx.fillStyle = ID.paper;
  ctx.fillText(title, x - W * 0.003, y + size * 0.82);
  const ry = y + size * 1.0;
  const grad = ctx.createLinearGradient(x, 0, x + W * 0.42, 0);
  grad.addColorStop(0, 'rgba(168,50,36,0.95)');
  grad.addColorStop(1, 'rgba(168,50,36,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, ry, W * 0.40, Math.max(1, H * 0.0016));
  ctx.restore();
  return ry;
}

function drawSourceTag(ctx, text, W, H, alpha = 1) {
  if (!text) return;
  const x = W * 0.055;
  const y = H * 0.884;
  ctx.save();
  ctx.globalAlpha = clamp(alpha) * 0.66;
  ctx.fillStyle = ID.thread;
  ctx.fillRect(x, y - W * 0.0062, W * 0.0062, W * 0.0062);
  ctx.fillStyle = ID.paper;
  setFont(ctx, Math.max(6.5, W * 0.0070), FONT.mono, 500);
  fillSpaced(ctx, `SOURCE · ${String(text).toUpperCase()}`, x + W * 0.013, y, W * 0.0012, 'left');
  ctx.restore();
}

function drawPin(ctx, x, y, W) {
  const r = W * 0.0068;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(x + r * 0.32, y + r * 0.42, r * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ID.thread;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,205,180,0.62)';
  ctx.beginPath();
  ctx.arc(x - r * 0.30, y - r * 0.34, r * 0.30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function threadPoints(from, to, sag) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + sag;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    pts.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]);
  }
  return pts;
}

function strokeThread(ctx, pts, W, width, color) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = Math.max(1, width);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawThread(ctx, spec, t, shot, W, H) {
  const local = Math.max(0, t - shot.start);
  const drawTime = Math.max(0.5, Number(spec.drawTime) || 1.25);
  const p = smooth(local / drawTime);
  if (p <= 0.001) return;
  const from = [Number(spec.from[0]) * W, Number(spec.from[1]) * H];
  const to = [Number(spec.to[0]) * W, Number(spec.to[1]) * H];
  const sag = (spec.sag == null ? 0.10 : Number(spec.sag)) * H;
  const pts = threadPoints(from, to, sag);
  const n = Math.max(2, Math.round(pts.length * p));
  const visible = pts.slice(0, n);
  ctx.save();
  strokeThread(ctx, visible, W, W * 0.0040, 'rgba(0,0,0,0.55)');
  strokeThread(ctx, visible, W, W * 0.0019, ID.thread);
  strokeThread(ctx, visible, W, W * 0.0007, 'rgba(255,178,150,0.42)');
  if (p > 0.02) drawPin(ctx, from[0], from[1], W);
  if (p > 0.96) drawPin(ctx, to[0], to[1], W);
  const label = String(spec.label || '');
  if (label && p > 0.55) {
    const mid = pts[Math.floor(pts.length * 0.52)];
    ctx.globalAlpha = clamp((p - 0.55) / 0.3) * 0.92;
    ctx.fillStyle = ID.paper;
    setFont(ctx, Math.max(6.5, W * 0.0070), FONT.monoBold, 700);
    fillSpaced(ctx, label.toUpperCase(), mid[0], mid[1] - H * 0.016, W * 0.0016, 'center');
  }
  ctx.restore();
}

function drawStamp(ctx, spec, t, shot, W, H) {
  const local = Math.max(0, t - shot.start);
  const p = smooth((local - 0.10) / 0.42);
  if (p <= 0.001) return;
  const x = Number(spec.x == null ? 0.78 : spec.x) * W;
  const y = Number(spec.y == null ? 0.16 : spec.y) * H;
  const rot = (Number(spec.rotate == null ? -6 : spec.rotate) * Math.PI) / 180;
  const scale = lerp(1.28, 1, p);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha = clamp(p * 1.25) * 0.92;
  const text = String(spec.text || '').toUpperCase();
  const size = Math.max(10, W * 0.0175);
  setFont(ctx, size, FONT.monoBold, 700);
  const tw = ctx.measureText(text).width;
  const padX = W * 0.016;
  const boxH = H * 0.072;
  ctx.strokeStyle = ID.thread;
  ctx.lineWidth = Math.max(2, W * 0.0026);
  ctx.strokeRect(-tw / 2 - padX, -boxH / 2, tw + padX * 2, boxH);
  ctx.fillStyle = ID.thread;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -H * 0.004);
  if (spec.sub) {
    ctx.fillStyle = 'rgba(168,50,36,0.86)';
    setFont(ctx, Math.max(6, W * 0.0062), FONT.mono, 500);
    fillSpaced(ctx, String(spec.sub).toUpperCase(), 0, H * 0.021, W * 0.0011, 'center');
  }
  ctx.restore();
}

function drawMapGraphic(ctx, g, t, shot, W, H, p) {
  const size = Math.min(W * 0.46, H * 0.66);
  const rect = { x: W * 0.085, y: H * 0.235, w: size, h: size };
  const rings = indiaRings();
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x - W * 0.02, rect.y - H * 0.02, (rect.w + W * 0.04) * smooth(p / 0.55), rect.h + H * 0.04);
  ctx.clip();
  for (const ring of rings) {
    ctx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const [x, y] = projectIndia(lon, lat, rect);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(233,221,198,0.055)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,221,198,0.46)';
    ctx.lineWidth = Math.max(1, W * 0.0014);
    ctx.stroke();
  }
  ctx.restore();

  // Graticule and sea labels are deliberately sparse: this is a case map, not
  // an atlas. The eye should land on the pin.
  ctx.save();
  ctx.globalAlpha = 0.40;
  ctx.strokeStyle = 'rgba(233,221,198,0.20)';
  ctx.lineWidth = Math.max(1, W * 0.0007);
  for (let lon = 70; lon <= 95; lon += 5) {
    const [x] = projectIndia(lon, 20, rect);
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.h);
    ctx.stroke();
  }
  for (let lat = 10; lat <= 35; lat += 5) {
    const [, y] = projectIndia(80, lat, rect);
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.w, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(233,221,198,0.34)';
  setFont(ctx, Math.max(6.5, W * 0.0068), FONT.mono, 500);
  fillSpaced(ctx, 'ARABIAN SEA', rect.x + rect.w * 0.18, rect.y + rect.h * 0.72, W * 0.0013, 'center');
  fillSpaced(ctx, 'BAY OF BENGAL', rect.x + rect.w * 0.78, rect.y + rect.h * 0.72, W * 0.0013, 'center');
  fillSpaced(ctx, 'I N D I A', rect.x + rect.w * 0.50, rect.y + rect.h * 0.42, W * 0.0030, 'center');
  ctx.restore();

  // The case card. It is the evidence label, not a lower third.
  const card = { x: W * 0.615, y: H * 0.235, w: W * 0.315, h: H * 0.47 };
  const point = g.points && g.points[0] ? g.points[0] : { lon: 83.581, lat: 26.651 };
  const [px, py] = projectIndia(Number(point.lon), Number(point.lat), rect);
  const mp = smooth((p - 0.44) / 0.35);
  if (mp > 0.001) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const phase = (localPhase(t, shot) + i * 0.33) % 1;
      ctx.globalAlpha = (1 - phase) * 0.52 * mp;
      ctx.strokeStyle = ID.thread;
      ctx.lineWidth = Math.max(1, W * 0.0011);
      ctx.beginPath();
      ctx.arc(px, py, W * (0.012 + phase * 0.040), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // The leader runs all the way to the file card, not into empty space.
    const leadY = card.y + H * 0.105;
    ctx.strokeStyle = 'rgba(233,221,198,0.55)';
    ctx.lineWidth = Math.max(1, W * 0.0009);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(card.x - W * 0.002, leadY);
    ctx.stroke();
    ctx.fillStyle = ID.thread;
    ctx.beginPath();
    ctx.arc(card.x - W * 0.002, leadY, W * 0.0032, 0, Math.PI * 2);
    ctx.fill();
    drawPin(ctx, px, py, W);
    ctx.restore();
  }

  const cp = smooth((p - 0.20) / 0.45);
  if (cp > 0.001) {
    ctx.save();
    ctx.globalAlpha = cp;
    ctx.translate((1 - cp) * W * 0.05, 0);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = W * 0.020;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = W * 0.008;
    ctx.fillStyle = '#171410';
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(233,221,198,0.20)';
    ctx.lineWidth = Math.max(1, W * 0.0008);
    ctx.strokeRect(card.x, card.y, card.w, card.h);
    ctx.fillStyle = ID.thread;
    ctx.fillRect(card.x, card.y, card.w, H * 0.006);

    const ix = card.x + W * 0.026;
    ctx.fillStyle = ID.amber;
    setFont(ctx, Math.max(7, W * 0.0076), FONT.monoBold, 700);
    fillSpaced(ctx, 'THE FILE · 01', ix, card.y + H * 0.055, W * 0.0014, 'left');
    const name = String(point.label || 'CHAURI CHAURA').toUpperCase();
    const nameSize = fitSize(ctx, name, card.w - W * 0.052, H * 0.050, FONT.display, 400);
    setFont(ctx, nameSize, FONT.display, 400);
    ctx.fillStyle = ID.paper;
    ctx.fillText(name, ix, card.y + H * 0.055 + nameSize * 1.02);
    ctx.fillStyle = 'rgba(233,221,198,0.62)';
    setFont(ctx, Math.max(7, W * 0.0080), FONT.mono, 500);
    fillSpaced(ctx, String(point.sub || 'GORAKHPUR DISTRICT').toUpperCase(), ix,
      card.y + H * 0.055 + nameSize * 1.02 + H * 0.026, W * 0.0012, 'left');
    ctx.fillStyle = 'rgba(168,50,36,0.9)';
    ctx.fillRect(ix, card.y + H * 0.205, card.w - W * 0.052, Math.max(1, H * 0.0014));
    const rows = Array.isArray(point.rows) && point.rows.length ? point.rows : [
      ['4 FEBRUARY 1922', 'THE INCIDENT'],
      ['GORAKHPUR DISTRICT', 'THE PLACE'],
      ['UNITED PROVINCES', 'THE PROVINCE']
    ];
    rows.forEach((row, i) => {
      const ry = card.y + H * 0.245 + i * H * 0.062;
      const value = Array.isArray(row) ? row[0] : row && row.value;
      const label = Array.isArray(row) ? row[1] : row && row.label;
      ctx.fillStyle = ID.paper;
      setFont(ctx, Math.max(7, W * 0.0078), FONT.monoBold, 700);
      ctx.fillText(String(value), ix, ry);
      ctx.fillStyle = 'rgba(233,221,198,0.45)';
      setFont(ctx, Math.max(6, W * 0.0062), FONT.mono, 500);
      fillSpaced(ctx, String(label).toUpperCase(), ix, ry + H * 0.020, W * 0.0011, 'left');
    });
    ctx.restore();
  }
}

function localPhase(t, shot) {
  return ((t - shot.start) / Math.max(0.01, shot.duration)) % 1;
}

function drawTimelineGraphic(ctx, g, t, shot, W, H, p) {
  const x0 = W * 0.085;
  const x1 = W * 0.905;
  const y = H * 0.575;
  const events = Array.isArray(g.events) ? g.events.slice(0, 6) : [];
  const n = Math.max(1, events.length);

  // A ghost range fills the band without adding a new claim: it is derived
  // only from the dates already shown on the line, or supplied explicitly.
  let range = String(g.range || '').trim();
  if (!range) {
    const years = events
      .map((ev) => (String(ev.date || '').match(/\b(1[6-9]\d{2}|20\d{2})\b/) || [])[1])
      .filter(Boolean);
    if (years.length > 1) range = `${years[0]} — ${years[years.length - 1]}`;
  }
  if (range) {
    ctx.save();
    ctx.globalAlpha = smooth(p / 0.5) * 0.055;
    ctx.fillStyle = ID.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rsize = Math.min(H * 0.215, W * 0.16);
    setFont(ctx, rsize, FONT.display, 400);
    ctx.fillText(range, W / 2, H * 0.405);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(233,221,198,0.22)';
  ctx.lineWidth = Math.max(1, H * 0.0012);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  const lp = smooth((p - 0.12) / 0.72);
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, 'rgba(168,50,36,0.95)');
  grad.addColorStop(0.75, 'rgba(168,50,36,0.95)');
  grad.addColorStop(1, 'rgba(168,50,36,0.15)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1.6, H * 0.0024);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + (x1 - x0) * lp, y);
  ctx.stroke();
  events.forEach((ev, i) => {
    const ex = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
    const ep = smooth((p - 0.20 - i * 0.11) / 0.28);
    if (ep <= 0.001) return;
    ctx.globalAlpha = ep;
    const up = i % 2 === 0;
    // The first and last labels align inward so neither can be clipped by the
    // frame edge, whatever the event count.
    const align = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
    ctx.strokeStyle = ID.thread;
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.beginPath();
    ctx.moveTo(ex, y);
    ctx.lineTo(ex, y + (up ? -H * 0.045 : H * 0.045));
    ctx.stroke();
    drawPin(ctx, ex, y, W);
    const dateY = up ? y - H * 0.085 : y + H * 0.085;
    const labelY = up ? y - H * 0.135 : y + H * 0.145;
    ctx.fillStyle = ID.amber;
    setFont(ctx, Math.max(7, W * 0.0078), FONT.monoBold, 700);
    fillSpaced(ctx, String(ev.date || '').toUpperCase(), ex, dateY, W * 0.0010, align);
    const label = String(ev.label || '').toUpperCase();
    const lsize = fitSize(ctx, label, W * 0.175, H * 0.030, FONT.display, 400);
    setFont(ctx, lsize, FONT.display, 400);
    ctx.fillStyle = ID.paper;
    const lines = wrapLines(ctx, label, W * 0.175);
    lines.slice(0, 2).forEach((line, k) => {
      fillSpaced(ctx, line, ex, labelY + (up ? -1 : 1) * k * lsize * 0.92, 0, align);
    });
    ctx.fillStyle = 'rgba(233,221,198,0.42)';
    setFont(ctx, Math.max(6, W * 0.0060), FONT.mono, 500);
    fillSpaced(ctx, String(ev.tag || '').toUpperCase(), ex, dateY + H * 0.021, W * 0.0010, align);
  });
  ctx.restore();
}

function drawStatsGraphic(ctx, g, t, shot, W, H, p) {
  const items = Array.isArray(g.items) ? g.items.slice(0, 4) : [];
  const cellW = W * 0.405;
  const cellH = H * 0.242;
  const x0 = W * 0.075;
  const y0 = H * 0.292;
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = x0 + col * (cellW + W * 0.035);
    const y = y0 + row * (cellH + H * 0.040);
    const ep = smooth((p - 0.16 - i * 0.10) / 0.30);
    if (ep <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = ep;
    ctx.fillStyle = 'rgba(233,221,198,0.035)';
    ctx.fillRect(x, y, cellW, cellH);
    ctx.strokeStyle = 'rgba(233,221,198,0.16)';
    ctx.lineWidth = Math.max(1, W * 0.0008);
    ctx.strokeRect(x, y, cellW, cellH);
    ctx.fillStyle = ID.thread;
    ctx.fillRect(x, y, W * 0.004, cellH);
    const raw = String(item.value == null ? '' : item.value);
    const numeric = Number(raw.replace(/[^0-9.]/g, ''));
    const shown = Number.isFinite(numeric) && !/[^0-9.,]/.test(raw)
      ? String(Math.round(numeric * ep)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : raw;
    const valueSize = fitSize(ctx, shown, cellW - W * 0.055, H * 0.135, FONT.display, 400);
    setFont(ctx, valueSize, FONT.display, 400);
    ctx.fillStyle = ID.paper;
    ctx.fillText(shown, x + W * 0.028, y + cellH * 0.60);
    ctx.fillStyle = 'rgba(233,221,198,0.72)';
    setFont(ctx, Math.max(6.5, W * 0.0072), FONT.monoBold, 700);
    fillSpaced(ctx, String(item.label || '').toUpperCase(), x + W * 0.030, y + cellH * 0.81, W * 0.0011, 'left');
    if (item.ledger) {
      ctx.fillStyle = 'rgba(233,221,198,0.34)';
      setFont(ctx, Math.max(5.5, W * 0.0056), FONT.mono, 500);
      fillSpaced(ctx, String(item.ledger).toUpperCase(), x + cellW - W * 0.020, y + cellH - H * 0.018, W * 0.0008, 'right');
    }
    ctx.restore();
  });
}

function drawCompareGraphic(ctx, g, t, shot, W, H, p) {
  const left = g.left || {};
  const right = g.right || {};
  const lv = Number(left.value) || 0;
  const rv = Number(right.value) || 0;
  const max = Math.max(1, lv, rv);
  const baseY = H * 0.72;
  const barMax = H * 0.27;
  const barW = W * 0.115;
  const cols = [
    { data: left, value: lv, x: W * 0.25 },
    { data: right, value: rv, x: W * 0.63 }
  ];
  if (g.mode === 'dots') {
    const startY = H * 0.455;
    const bottomLimit = H * 0.640;
    const drawDots = (data, value, x, color) => {
      const count = Math.max(0, Math.round(value));
      const colsN = 6;
      const rows = Math.max(1, Math.ceil(count / colsN));
      const gapX = W * 0.030;
      const gapY = rows > 1
        ? Math.min(H * 0.038, (bottomLimit - startY) / (rows - 1))
        : H * 0.038;
      const r = Math.min(W * 0.008, gapY * 0.32, gapX * 0.30);
      const hp = smooth((p - 0.16) / 0.30);
      const groupW = (Math.min(Math.max(count, 1), colsN) - 1) * gapX;
      const cx = x + groupW / 2;
      if (hp > 0.001) {
        ctx.save();
        ctx.globalAlpha = hp;
        const shown = String(Math.round(count * hp));
        const vSize = Math.min(H * 0.115, W * 0.080);
        setFont(ctx, vSize, FONT.display, 400);
        ctx.fillStyle = ID.paper;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(shown, cx, H * 0.338);
        ctx.fillStyle = 'rgba(233,221,198,0.76)';
        setFont(ctx, Math.max(7, W * 0.0072), FONT.monoBold, 700);
        const label = String(data.label || '').toUpperCase();
        const lines = wrapLines(ctx, label, W * 0.235);
        lines.slice(0, 2).forEach((line, k) => {
          fillSpaced(ctx, line, cx, H * 0.383 + k * H * 0.022, W * 0.0010, 'center');
        });
        ctx.restore();
      }
      for (let i = 0; i < count; i++) {
        const ep = smooth((p - 0.25 - i * 0.018) / 0.18);
        if (ep <= 0.001) continue;
        const col = i % colsN;
        const row = Math.floor(i / colsN);
        const dx = x + col * gapX;
        const dy = startY + row * gapY;
        ctx.save();
        ctx.globalAlpha = ep;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dx, dy, r * (0.7 + 0.3 * ep), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    drawDots(left, lv, W * 0.13, ID.thread);
    drawDots(right, rv, W * 0.60, ID.paper);
    ctx.save();
    ctx.globalAlpha = smooth((p - 0.55) / 0.3);
    setFont(ctx, Math.max(7, W * 0.0072), FONT.monoBold, 700);
    ctx.fillStyle = ID.amber;
    fillSpaced(ctx, 'EACH DOT = ONE DEATH', W / 2, H * 0.678, W * 0.0016, 'center');
    ctx.restore();
  } else {
    cols.forEach((c, i) => {
      const ep = smooth((p - 0.22 - i * 0.16) / 0.45);
      if (ep <= 0.001) return;
      const h = barMax * (c.value / max) * ep;
      const x = c.x;
      ctx.save();
      ctx.globalAlpha = ep;
      ctx.fillStyle = i === 0 ? 'rgba(168,50,36,0.88)' : 'rgba(233,221,198,0.78)';
      ctx.fillRect(x, baseY - h, barW, h);
      ctx.strokeStyle = 'rgba(233,221,198,0.28)';
      ctx.lineWidth = Math.max(1, W * 0.0008);
      ctx.strokeRect(x, baseY - h, barW, h);
      const valueText = String(c.data.value == null ? '' : c.data.value);
      const vSize = fitSize(ctx, valueText, barW * 1.4, H * 0.105, FONT.display, 400);
      setFont(ctx, vSize, FONT.display, 400);
      ctx.fillStyle = ID.paper;
      ctx.textAlign = 'center';
      ctx.fillText(valueText, x + barW / 2, baseY - h - H * 0.020);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(233,221,198,0.76)';
      setFont(ctx, Math.max(6.5, W * 0.0072), FONT.monoBold, 700);
      const label = String(c.data.label || '').toUpperCase();
      const lines = wrapLines(ctx, label, W * 0.21);
      lines.slice(0, 2).forEach((line, k) => {
        fillSpaced(ctx, line, x + barW / 2, baseY + H * 0.038 + k * H * 0.022, W * 0.0010, 'center');
      });
      ctx.restore();
    });
  }
  const note = String(g.note || '');
  if (note) {
    ctx.save();
    ctx.globalAlpha = smooth((p - 0.55) / 0.3) * 0.82;
    ctx.fillStyle = ID.paper;
    setFont(ctx, Math.max(9, W * 0.0125), FONT.serif, 400);
    const lines = wrapLines(ctx, note, W * 0.70);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(line, W / 2, H * 0.812 + i * H * 0.026);
    });
    ctx.restore();
  }
}

function drawBoardGraphic(ctx, g, t, shot, W, H, p) {
  const cards = Array.isArray(g.cards) ? g.cards.slice(0, 4) : [];
  const slots = [
    { x: 0.075, y: 0.40, r: -3.4 },
    { x: 0.292, y: 0.25, r: 2.1 },
    { x: 0.508, y: 0.43, r: -1.8 },
    { x: 0.725, y: 0.27, r: 3.0 }
  ];
  const cw = W * 0.190;
  const ch = H * 0.315;
  const centers = [];
  cards.forEach((card, i) => {
    const slot = slots[i];
    centers.push({ x: slot.x * W + cw / 2, y: slot.y * H + ch / 2 });
  });
  // The thread is drawn under the cards, like a real board.
  for (let i = 0; i < centers.length - 1; i++) {
    const ep = smooth((p - 0.34 - i * 0.12) / 0.35);
    if (ep <= 0.001) continue;
    ctx.save();
    ctx.globalAlpha = ep;
    const pts = threadPoints([centers[i].x, centers[i].y], [centers[i + 1].x, centers[i + 1].y], H * 0.035);
    strokeThread(ctx, pts, W, W * 0.0052, 'rgba(0,0,0,0.58)');
    strokeThread(ctx, pts, W, W * 0.0030, ID.thread);
    strokeThread(ctx, pts, W, W * 0.0010, 'rgba(255,178,150,0.34)');
    ctx.restore();
  }
  cards.forEach((card, i) => {
    const slot = slots[i];
    const ep = smooth((p - 0.12 - i * 0.14) / 0.30);
    if (ep <= 0.001) return;
    const x = slot.x * W;
    const y = slot.y * H + (1 - ep) * H * 0.035;
    ctx.save();
    ctx.globalAlpha = ep;
    ctx.translate(x + cw / 2, y + ch / 2);
    ctx.rotate((slot.r * Math.PI) / 180);
    ctx.translate(-cw / 2, -ch / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.62)';
    ctx.shadowBlur = W * 0.018;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = W * 0.007;
    ctx.fillStyle = '#d9cdb5';
    ctx.fillRect(0, 0, cw, ch);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(8,7,6,0.06)';
    ctx.fillRect(0, 0, cw, H * 0.008);
    ctx.fillStyle = ID.thread;
    ctx.fillRect(0, 0, cw, H * 0.0045);
    const pad = W * 0.016;
    ctx.fillStyle = ID.thread;
    setFont(ctx, Math.max(7, W * 0.0072), FONT.monoBold, 700);
    fillSpaced(ctx, String(card.tag || String.fromCharCode(65 + i)).toUpperCase(), pad, H * 0.045, W * 0.0012, 'left');
    const title = String(card.title || '').toUpperCase();
    const tsize = fitSize(ctx, title, cw - pad * 2, H * 0.032, FONT.display, 400);
    setFont(ctx, tsize, FONT.display, 400);
    ctx.fillStyle = ID.ink;
    const tlines = wrapLines(ctx, title, cw - pad * 2);
    tlines.slice(0, 2).forEach((line, k) => {
      ctx.fillText(line, pad, H * 0.045 + H * 0.030 + k * tsize * 0.92);
    });
    ctx.fillStyle = 'rgba(8,7,6,0.84)';
    setFont(ctx, Math.max(7, W * 0.0084), FONT.serif, 400);
    const line = String(card.line || '');
    const llines = wrapLines(ctx, line, cw - pad * 2);
    llines.slice(0, 4).forEach((ln, k) => {
      ctx.fillText(ln, pad, H * 0.045 + H * 0.030 + tlines.length * tsize * 0.92 + H * 0.038 + k * H * 0.030);
    });
    ctx.fillStyle = 'rgba(8,7,6,0.46)';
    setFont(ctx, Math.max(5.5, W * 0.0058), FONT.mono, 500);
    fillSpaced(ctx, String(card.ledger || '').toUpperCase(), pad, ch - H * 0.022, W * 0.0009, 'left');
    ctx.restore();
    drawPin(ctx, x + cw * 0.5, y + H * 0.012, W);
  });
}

function drawDocumentGraphic(ctx, g, t, shot, W, H, p, images) {
  const img = images.get(`media:${g.image}`);
  const frame = { x: W * 0.43, y: H * 0.215, w: W * 0.49, h: H * 0.60 };
  if (img) {
    ctx.save();
    ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
    ctx.rotate((-1.2 * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = W * 0.030;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = W * 0.010;
    ctx.fillStyle = '#e2d6be';
    ctx.fillRect(-frame.w / 2 - W * 0.012, -frame.h / 2 - W * 0.012, frame.w + W * 0.024, frame.h + W * 0.024);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const hp = smooth(p / 0.8);
    const zoom = 1.02 + hp * 0.07;
    ctx.beginPath();
    ctx.rect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
    ctx.clip();
    drawCover(ctx, img, -frame.w * zoom / 2, -frame.h * zoom / 2, frame.w * zoom, frame.h * zoom, 0.5, 0.42);
    ctx.fillStyle = 'rgba(168,120,60,0.10)';
    ctx.fillRect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
    ctx.restore();
  }
  const x = W * 0.065;
  const y = H * 0.315;
  ctx.save();
  ctx.globalAlpha = smooth((p - 0.18) / 0.4);
  ctx.fillStyle = ID.amber;
  setFont(ctx, Math.max(7, W * 0.0076), FONT.monoBold, 700);
  fillSpaced(ctx, String(g.kicker || 'THE SITE TODAY').toUpperCase(), x, y, W * 0.0014, 'left');
  const title = String(g.title || '').toUpperCase();
  const tsize = fitSize(ctx, title, W * 0.32, H * 0.070, FONT.display, 400);
  setFont(ctx, tsize, FONT.display, 400);
  ctx.fillStyle = ID.paper;
  const tlines = wrapLines(ctx, title, W * 0.33);
  tlines.slice(0, 3).forEach((line, i) => ctx.fillText(line, x, y + H * 0.040 + tsize * 0.9 + i * tsize * 0.9));
  const body = String(g.body || '');
  ctx.fillStyle = 'rgba(233,221,198,0.78)';
  setFont(ctx, Math.max(9, W * 0.0118), FONT.serif, 400);
  const blines = wrapLines(ctx, body, W * 0.33);
  const by = y + H * 0.070 + tsize * 0.9 + tlines.length * tsize * 0.9;
  blines.slice(0, 5).forEach((line, i) => ctx.fillText(line, x, by + i * H * 0.032));
  ctx.restore();
  if (g.caption) {
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = ID.paper;
    setFont(ctx, Math.max(7, W * 0.0072), FONT.mono, 500);
    fillSpaced(ctx, String(g.caption).toUpperCase(), frame.x, frame.y + frame.h + H * 0.040, W * 0.0011, 'left');
    ctx.restore();
  }
  if (g.credit) {
    ctx.save();
    ctx.globalAlpha = 0.50;
    ctx.fillStyle = ID.paper;
    setFont(ctx, Math.max(5.8, W * 0.0058), FONT.mono, 500);
    fillSpaced(ctx, String(g.credit).toUpperCase(), frame.x, frame.y + frame.h + H * 0.062, W * 0.0009, 'left');
    ctx.restore();
  }
}

function drawSplitGraphic(ctx, g, t, shot, W, H, p, images) {
  const seam = W / 2;
  const open = smooth(p / 0.55);
  const halfGap = W * 0.0016;
  const top = H * 0.215;
  const height = H * 0.585;
  const left = g.left || {};
  const right = g.right || {};
  const drawSide = (side, x, y, w, h) => {
    if (side.kind === 'plate') {
      const img = images.get(side.plate);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        const zoom = 1.04 + smooth(p / 0.8) * 0.05;
        drawCover(ctx, img, x - (w * zoom - w) / 2, y - (h * zoom - h) / 2, w * zoom, h * zoom, 0.5, 0.5);
        ctx.restore();
      }
      ctx.save();
      const scrim = ctx.createLinearGradient(x, y, x, y + h);
      scrim.addColorStop(0, 'rgba(0,0,0,0.20)');
      scrim.addColorStop(0.55, 'rgba(0,0,0,0.30)');
      scrim.addColorStop(1, 'rgba(0,0,0,0.78)');
      ctx.fillStyle = scrim;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    } else {
      // Both panels sit on the same paper stock. The split is the argument,
      // not a difference in exposure.
      const panel = ctx.createLinearGradient(x, y, x, y + h);
      panel.addColorStop(0, '#12100c');
      panel.addColorStop(1, '#0b0907');
      ctx.save();
      ctx.fillStyle = panel;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    const pad = x + W * 0.035;
    ctx.save();
    ctx.globalAlpha = smooth((p - 0.25) / 0.4);
    ctx.fillStyle = ID.amber;
    setFont(ctx, Math.max(6.5, W * 0.0070), FONT.monoBold, 700);
    fillSpaced(ctx, String(side.eyebrow || '').toUpperCase(), pad, y + H * 0.085, W * 0.0013, 'left');
    if (side.kind === 'number') {
      const value = String(side.value == null ? '' : side.value);
      const vSize = fitSize(ctx, value, w - W * 0.07, H * 0.20, FONT.display, 400);
      setFont(ctx, vSize, FONT.display, 400);
      ctx.fillStyle = ID.paper;
      ctx.fillText(value, pad, y + H * 0.325);
    } else {
      const title = String(side.title || '').toUpperCase();
      const tSize = fitSize(ctx, title, w - W * 0.07, H * 0.058, FONT.display, 400);
      setFont(ctx, tSize, FONT.display, 400);
      ctx.fillStyle = ID.paper;
      const lines = wrapLines(ctx, title, w - W * 0.07);
      lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, pad, y + H * 0.225 + i * tSize * 0.92));
      if (side.body) {
        ctx.fillStyle = 'rgba(233,221,198,0.76)';
        setFont(ctx, Math.max(8, W * 0.0105), FONT.serif, 400);
        const bl = wrapLines(ctx, String(side.body), w - W * 0.07);
        bl.slice(0, 3).forEach((line, i) => ctx.fillText(line, pad, y + H * 0.410 + i * H * 0.030));
      }
    }
    ctx.fillStyle = 'rgba(233,221,198,0.74)';
    setFont(ctx, Math.max(6.5, W * 0.0072), FONT.monoBold, 700);
    const label = String(side.label || '').toUpperCase();
    const ll = wrapLines(ctx, label, w - W * 0.07);
    ll.slice(0, 2).forEach((line, i) => {
      fillSpaced(ctx, line, pad, y + h - H * 0.072 + i * H * 0.022, W * 0.0010, 'left');
    });
    if (side.ledger) {
      ctx.fillStyle = 'rgba(233,221,198,0.34)';
      setFont(ctx, Math.max(5.5, W * 0.0056), FONT.mono, 500);
      fillSpaced(ctx, String(side.ledger).toUpperCase(), pad, y + h - H * 0.026, W * 0.0008, 'left');
    }
    ctx.restore();
  };
  drawSide(left, W * 0.0, top, seam - halfGap * open, height);
  drawSide(right, seam + halfGap * open, top, W * 0.5 - halfGap * open, height);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = ID.thread;
  ctx.fillRect(seam - halfGap * open, top, halfGap * 2 * open, height);
  ctx.restore();
  if (g.note) {
    ctx.save();
    ctx.globalAlpha = smooth((p - 0.55) / 0.35) * 0.9;
    ctx.fillStyle = ID.paper;
    setFont(ctx, Math.max(8.5, W * 0.0115), FONT.serif, 400);
    const lines = wrapLines(ctx, String(g.note), W * 0.72);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(line, W / 2, H * 0.835 + i * H * 0.024);
    });
    ctx.restore();
  }
}

function drawGraphic(ctx, shot, t, W, H, images) {
  const g = shot.graphic || {};
  const local = Math.max(0, t - shot.start);
  const p = clamp(local / Math.max(0.4, shot.duration));
  drawArchiveBackdrop(ctx, W, H);
  if (g.type !== 'document') {
    drawGraphicHeader(ctx, g, W, H, smooth(local / 0.45));
  }
  switch (g.type) {
    case 'map':
      drawMapGraphic(ctx, g, t, shot, W, H, p);
      break;
    case 'timeline':
      drawTimelineGraphic(ctx, g, t, shot, W, H, p);
      break;
    case 'stats':
      drawStatsGraphic(ctx, g, t, shot, W, H, p);
      break;
    case 'compare':
      drawCompareGraphic(ctx, g, t, shot, W, H, p);
      break;
    case 'board':
      drawBoardGraphic(ctx, g, t, shot, W, H, p);
      break;
    case 'document':
      drawDocumentGraphic(ctx, g, t, shot, W, H, p, images);
      break;
    case 'split':
      drawSplitGraphic(ctx, g, t, shot, W, H, p, images);
      break;
    default:
      break;
  }
  if (g.source) drawSourceTag(ctx, g.source, W, H, smooth((local - 0.5) / 0.5));
  if (shot.stamp) drawStamp(ctx, shot.stamp, t, shot, W, H);
  if (shot.thread) drawThread(ctx, shot.thread, t, shot, W, H);
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
  const titleSize = Math.min(vw(film.posterTitleSize, W) || W * 0.122, H * 0.27);
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
  setFont(ctx, titleSize, FONT.display, 400);
  lines.forEach((line, i) => ctx.fillText(String(line).toUpperCase(), x, titleTop + titleSize * 0.82 + i * lh));
  ctx.shadowBlur = W * 0.016;
  ctx.fillStyle = ID.thread;
  setFont(ctx, Math.max(7, W * 0.009), FONT.monoBold, 700);
  fillSpaced(ctx, `CASE ${film.caseNumber || '05'} · THE EVIDENCE ROOM`, x, titleTop - H * 0.022, Math.max(0.8, W * 0.0022), 'left');
  ctx.fillStyle = 'rgba(233,221,198,0.84)';
  setFont(ctx, Math.max(8, W * 0.0105), FONT.monoBold, 700);
  fillSpaced(ctx, String(film.subtitle || '').toUpperCase(), x, subY,
    Math.max(0.8, W * 0.0024), 'left');
  ctx.fillStyle = 'rgba(233,221,198,0.58)';
  setFont(ctx, Math.max(6, W * 0.0067), FONT.mono, 500);
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
  if (shot.render === 'graphic') {
    drawGraphic(ctx, shot, t, W, H, images);
    return;
  }
  const img = images.get(shot.plate);
  if (img) drawPlate(ctx, img, shot, t, W, H);
  else {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
  }
}

const STILL_CACHE = new Map();

function previousStill(previous, W, H, images) {
  if (!previous) return null;
  const shot = previous.shot;
  if (shot.render === 'title') return null;
  if (shot.render !== 'graphic') return images.get(shot.plate) || null;
  const key = `${shot.id}:${Math.round(W)}x${Math.round(H)}`;
  if (STILL_CACHE.has(key)) return STILL_CACHE.get(key);
  const canvas = createCanvas(W, H);
  const cctx = canvas.getContext('2d');
  drawGraphic(cctx, shot, shot.start + Math.max(0, shot.duration - 0.001), W, H, images);
  STILL_CACHE.set(key, canvas);
  return canvas;
}

function drawTransition(ctx, item, previous, t, W, H, images) {
  const { shot } = item;
  const spec = transitionSpec(shot);
  const local = t - shot.start;
  const p = spec.duration > 1e-9 ? clamp(local / spec.duration) : 1;
  const e = smooth(p);
  const prevImg = previousStill(previous, W, H, images);
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
  if (item.shot.render !== 'graphic') {
    if (item.shot.thread) drawThread(ctx, item.shot.thread, t, item.shot, W, H);
    if (item.shot.stamp) drawStamp(ctx, item.shot.stamp, t, item.shot, W, H);
    if (item.shot.sourceTag) drawSourceTag(ctx, item.shot.sourceTag, W, H, smooth((t - item.shot.start - 0.4) / 0.5));
  }

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
  const media = new Set();
  timeline.scenes.forEach((scene) => scene.shots.forEach((shot) => {
    if (shot.plate && shot.render !== 'title') names.add(shot.plate);
    if (shot.graphic && shot.graphic.image) media.add(shot.graphic.image);
  }));
  const images = new Map();
  await Promise.all([...names].map(async (name) => {
    const file = path.join(platesDir, `${name}.png`);
    if (!fs.existsSync(file)) throw new Error(`missing plate: ${file}`);
    images.set(name, await loadImage(file));
  }));
  const mediaDir = path.join(ROOT, 'assets', 'film-media');
  await Promise.all([...media].map(async (name) => {
    const file = path.join(mediaDir, name);
    if (!fs.existsSync(file)) throw new Error(`missing media image: ${file}`);
    images.set(`media:${name}`, await loadImage(file));
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
  drawGraphic,
  loadPlateImages,
  loadFilmData,
  flattenShots,
  ID,
  FONT,
  clamp,
  smooth,
  setFont,
  fillSpaced,
  drawArchiveBackdrop,
  drawPin,
  threadPoints,
  strokeThread,
  drawStamp
};

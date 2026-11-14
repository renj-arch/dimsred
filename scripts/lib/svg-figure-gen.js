// svg-figure-gen.js -- deterministic SVG figure renderer for figure-pack gaps.
//
// Commons has no suitable figure for many UPSC syllabus phrases ("writs types",
// "separation of powers india"). This module renders a hand-authored spec
// (data/figure-svg-specs.json) into a print-ready inline SVG. Every label in a
// spec is written by a human and reviewed in the diff -- the generator only
// lays out what it is given; it never invents content.
//
// Spec shape (per subject slug -> topic -> spec):
//   {
//     "kind": "grid|hierarchy|timeline|flow|compare",
//     "title": "...",               // optional; defaults to the topic name
//     ...kind fields...
//   }
//
//   grid:       { nodes: [{label, sub?}] }                    term cards
//   hierarchy:  { root:{label,sub?}, children:[{label,sub?,children?:[]}] }
//   timeline:   { events: [{label, sub?, year?}] }
//   flow:       { steps: [{label, sub?}] }
//   compare:    { left:{label,items:[..]}, right:{label,items:[..]} }
//
// Usage: var svg = require('./svg-figure-gen').render(spec, fallbackTitle);

'use strict';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Palette: light cards so the figure survives both the dark page and A4 print.
var C = {
  ink: '#1e293b',
  sub: '#64748b',
  line: '#cbd5e1',
  card: '#f8fafc',
  cardStroke: '#94a3b8',
  accent: '#0e7490',
  accentSoft: '#cffafe',
  root: '#0e7490',
  leaf: '#f1f5f9'
};

function text(x, y, str, opts) {
  opts = opts || {};
  return '<text x="' + x + '" y="' + y + '" font-size="' + (opts.size || 13) +
    '" font-weight="' + (opts.weight || 400) + '" fill="' + (opts.fill || C.ink) +
    '" text-anchor="' + (opts.anchor || 'middle') + '" font-family="Inter,system-ui,sans-serif">' +
    esc(str) + '</text>';
}

function wrap(str, maxChars) {
  var words = String(str || '').split(/\s+/).filter(Boolean);
  var lines = [], cur = '';
  words.forEach(function (w) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// Measure-free layout: fixed character-width estimate keeps the renderer
// dependency-free. Slightly wide is safe -- cards clip nothing, text may wrap.
function estW(str, size) { return String(str || '').length * size * 0.56; }

function card(x, y, w, h, label, sub, opts) {
  opts = opts || {};
  var out = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
    '" rx="' + (opts.rx == null ? 8 : opts.rx) + '" fill="' + (opts.fill || C.card) +
    '" stroke="' + (opts.stroke || C.cardStroke) + '" stroke-width="1.2"/>';
  var cx = x + w / 2;
  var labelLines = wrap(label, Math.max(8, Math.floor(w / 7.5)));
  var yText = y + h / 2 - (sub ? 6 : 0) - (labelLines.length - 1) * 7;
  labelLines.forEach(function (ln, i) {
    out += text(cx, yText + i * 14, ln, { size: 12.5, weight: 700, fill: C.ink });
  });
  if (sub) {
    var subLines = wrap(sub, Math.max(10, Math.floor(w / 6.2))).slice(0, 2);
    subLines.forEach(function (ln, i) {
      out += text(cx, y + h - 12 - (subLines.length - 1 - i) * 12, ln,
        { size: 10, fill: C.sub });
    });
  }
  return out;
}

function titleBand(title, width) {
  return '<rect x="0" y="0" width="' + width + '" height="44" rx="8" fill="' + C.root + '"/>' +
    text(width / 2, 29, title, { size: 17, weight: 700, fill: '#ffffff' });
}

function renderGrid(spec, title, W) {
  var nodes = (spec.nodes || []).slice(0, 12);
  if (!nodes.length) return null;
  var cols = nodes.length <= 4 ? nodes.length : (nodes.length <= 8 ? 4 : 4);
  var rows = Math.ceil(nodes.length / cols);
  var pad = 28, gap = 14, top = 60;
  var cw = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols);
  var ch = 92;
  var H = top + rows * (ch + gap) + 20;
  var out = titleBand(title, W) + '<g>';
  nodes.forEach(function (n, i) {
    var r = Math.floor(i / cols), c = i % cols;
    var x = pad + c * (cw + gap), y = top + r * (ch + gap);
    out += card(x, y, cw, ch, n.label, n.sub);
  });
  return { svg: out + '</g>', h: H };
}

function renderHierarchy(spec, title, W) {
  var root = spec.root || {};
  var children = spec.children || [];
  if (!children.length) return null;
  var pad = 30, top = 60, lvlH = 118, nodeW = 176, nodeH = 58;
  var maxKids = Math.max.apply(null, [children.length].concat(
    children.map(function (c) { return (c.children || []).length; })));
  var cols = Math.min(maxKids || children.length, 6);
  var rows = Math.ceil(children.length / cols);
  var H = top + (rows ? rows * lvlH : 0) + 150;
  var cx = W / 2;
  var out = titleBand(title, W);
  // root card
  out += card(cx - nodeW / 2, top, nodeW, nodeH, root.label, root.sub,
    { fill: C.accentSoft, stroke: C.accent });
  // children
  var hasGrand = children.some(function (c) { return c.children && c.children.length; });
  var childY = top + lvlH;
  children.forEach(function (c, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var gx = pad + col * ((W - pad * 2) / Math.max(1, cols - 1 || 1));
    if (cols === 1) gx = cx;
    else gx = pad + col * (W - pad * 2) / (cols - 1);
    var x = gx - nodeW / 2, y = childY + row * (hasGrand ? lvlH * 0.9 : 0);
    out += '<line x1="' + cx + '" y1="' + (top + nodeH) + '" x2="' + gx + '" y2="' + (y - 8) +
      '" stroke="' + C.line + '" stroke-width="1.4"/>';
    out += card(x, y, nodeW, nodeH, c.label, c.sub);
    (c.children || []).forEach(function (g, gi) {
      var gcols = Math.max(1, (c.children || []).length);
      var gw = Math.min(150, (W - pad * 2) / gcols - 10);
      var gx2 = x + nodeW / 2 - (gcols * (gw + 10)) / 2 + gi * (gw + 10) + gw / 2;
      var gy = y + nodeH + 26;
      out += '<line x1="' + gx + '" y1="' + (y + nodeH) + '" x2="' + gx2 + '" y2="' + (gy - 6) +
        '" stroke="' + C.line + '" stroke-width="1.2"/>';
      out += card(gx2 - gw / 2, gy, gw, 46, g.label || g, g.sub || '', { fill: C.leaf });
    });
  });
  return { svg: out, h: Math.max(H, top + lvlH * (rows || 1) + (hasGrand ? lvlH : 60) + 40) };
}

function renderTimeline(spec, title, W) {
  var events = (spec.events || []).slice(0, 8);
  if (!events.length) return null;
  var pad = 40, top = 70, axisY = 170, H = 280;
  var n = events.length;
  var stepX = (W - pad * 2) / Math.max(1, n - 1);
  var out = titleBand(title, W);
  out += '<line x1="' + pad + '" y1="' + axisY + '" x2="' + (W - pad) + '" y2="' + axisY +
    '" stroke="' + C.accent + '" stroke-width="2.5"/>';
  events.forEach(function (e, i) {
    var x = pad + i * stepX;
    var above = i % 2 === 0;
    out += '<circle cx="' + x + '" cy="' + axisY + '" r="6" fill="' + C.accent + '"/>';
    if (e.year) out += text(x, axisY + (above ? 20 : -34), e.year, { size: 11, weight: 700, fill: C.accent });
    var ly = above ? axisY - 52 : axisY + 44;
    out += text(x, ly, e.label, { size: 12, weight: 600 });
    if (e.sub) out += text(x, ly + 15, e.sub, { size: 10, fill: C.sub });
  });
  return { svg: out, h: H };
}

function renderFlow(spec, title, W) {
  var steps = (spec.steps || []).slice(0, 6);
  if (!steps.length) return null;
  var n = steps.length, pad = 24, top = 66, gap = 26;
  var sw = Math.floor((W - pad * 2 - gap * (n - 1)) / n);
  var sh = 96, H = top + sh + 30;
  var out = titleBand(title, W);
  steps.forEach(function (s, i) {
    var x = pad + i * (sw + gap), y = top;
    out += card(x, y, sw, sh, s.label, s.sub, { rx: 10 });
    if (i < n - 1) {
      var ax = x + sw + 4, ay = y + sh / 2;
      out += '<path d="M' + ax + ' ' + ay + ' l' + (gap - 8) + ' -7 l0 14 z" fill="' + C.accent + '"/>';
    }
    out += text(x + sw / 2, y + sh + 18, String(i + 1), { size: 10, fill: C.sub });
  });
  return { svg: out, h: H };
}

function renderCompare(spec, title, W) {
  var L = spec.left || {}, R = spec.right || {};
  var items = Math.max((L.items || []).length, (R.items || []).length);
  if (!items) return null;
  var pad = 30, top = 62, colW = (W - pad * 2 - 30) / 2, rowH = 34, H = top + 44 + items * rowH + 16;
  var out = titleBand(title, W);
  out += card(pad, top, colW, 40, L.label, '', { fill: C.accentSoft, stroke: C.accent });
  out += card(pad + colW + 30, top, colW, 40, R.label, '', { fill: '#fef3c7', stroke: '#d97706' });
  for (var i = 0; i < items; i++) {
    var y = top + 44 + i * rowH;
    if (L.items && L.items[i]) out += text(pad + colW / 2, y + 20, L.items[i], { size: 12.5 });
    if (R.items && R.items[i]) out += text(pad + colW + 30 + colW / 2, y + 20, R.items[i], { size: 12.5 });
    if (i < items - 1) {
      out += '<line x1="' + pad + '" y1="' + (y + rowH - 4) + '" x2="' + (pad + colW) + '" y2="' + (y + rowH - 4) + '" stroke="#e2e8f0"/>';
      out += '<line x1="' + (pad + colW + 30) + '" y1="' + (y + rowH - 4) + '" x2="' + (W - pad) + '" y2="' + (y + rowH - 4) + '" stroke="#e2e8f0"/>';
    }
  }
  return { svg: out, h: H };
}

var RENDERERS = { grid: renderGrid, hierarchy: renderHierarchy, timeline: renderTimeline, flow: renderFlow, compare: renderCompare };

// render(spec, fallbackTitle) -> {svg, h} or null when the spec is unusable.
function render(spec, fallbackTitle) {
  if (!spec || typeof spec !== 'object') return null;
  var fn = RENDERERS[spec.kind];
  if (!fn) return null;
  var title = spec.title || fallbackTitle || 'Figure';
  var W = 800;
  var r = fn(spec, title, W);
  if (!r) return null;
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + r.h +
      '" width="100%" role="img" aria-label="' + esc(title) + '">' + r.svg + '</svg>',
    h: r.h
  };
}

module.exports = { render: render, esc: esc };

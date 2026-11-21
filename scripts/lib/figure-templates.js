'use strict';
// Templates for the scheduled figure forge.
//
// The forge exists so "add a diagram" is a data edit, not a drawing session.
// A brief supplies the labels and the template supplies the geometry; the
// renderer then applies the same ink grammar as the hand-authored sketches.
// Nothing here invents a fact: every label comes from data/figure-briefs.json.
//
// The item format is the one consumed by scripts/lib/upsc-svg-figures.js:
// box, arrow, circle, line, path, text.

var INK = '#1f2937';
var MUTED = '#475569';
var FAINT = '#64748b';

function num(n) {
  var v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) throw new Error('non-finite coordinate: ' + n);
  return v;
}

function text(x, y, value, o) {
  o = o || {};
  return {
    type: 'text', x: num(x), y: num(y), text: String(value),
    size: o.size || 12.5, weight: o.weight || 600,
    fill: o.fill || MUTED, anchor: o.anchor || 'middle'
  };
}

function box(x, y, w, h, value, o) {
  o = o || {};
  return {
    type: 'box', x: num(x), y: num(y), w: num(w), h: num(h),
    rx: 2, fill: 'none', stroke: o.stroke || INK, sw: o.sw || 2,
    text: String(value || ''), size: o.size || 12, textFill: o.fill || INK
  };
}

function arrow(x1, y1, x2, y2, o) {
  o = o || {};
  var it = {
    type: 'arrow', x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2),
    color: o.color || INK, sw: o.sw || 1.8, dash: !!o.dash
  };
  if (o.label) {
    it.label = o.label;
    it.lx = num(o.lx == null ? (x1 + x2) / 2 : o.lx);
    it.ly = num(o.ly == null ? (y1 + y2) / 2 - 9 : o.ly);
    it.size = o.size || 11.5;
    it.labelFill = o.labelFill || MUTED;
  }
  return it;
}

function line(x1, y1, x2, y2, o) {
  o = o || {};
  return {
    type: 'line', x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2),
    stroke: o.stroke || INK, sw: o.sw || 1.6, dash: !!o.dash
  };
}

function notes(b) {
  return (b.notes || []).map(function (n, i) {
    return text(48, 372 + i * 22, n, { anchor: 'start', size: 11.5, fill: FAINT });
  });
}

// Axes and one or two hand-drawn curves. Points are normalised 0..1.
function axes(b) {
  var X0 = 92, X1 = 700, Y0 = 330, Y1 = 70;
  var items = [
    line(X0, Y0, X1, Y0, { sw: 1.8 }),
    line(X0, Y0, X0, Y1, { sw: 1.8 }),
    text(X1, Y0 + 24, b.xLabel || 'time', { anchor: 'end', size: 11.5, fill: FAINT }),
    text(X0 - 10, Y1 - 4, b.yLabel || 'value', { anchor: 'end', size: 11.5, fill: FAINT })
  ];
  (b.curves || []).forEach(function (c) {
    var pts = (c.points || []).map(function (p) {
      return [num(X0 + p[0] * (X1 - X0)), num(Y0 - p[1] * (Y0 - Y1))];
    });
    if (pts.length < 2) return;
    items.push({
      type: 'path',
      d: 'M ' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L '),
      stroke: c.color || INK, sw: c.sw || 2.4, dash: !!c.dash
    });
    if (c.label) {
      var last = pts[pts.length - 1];
      items.push(text(last[0] - 4, last[1] - 10, c.label, {
        anchor: 'end', size: 11.5, fill: c.color || INK, weight: 700
      }));
    }
  });
  (b.markers || []).forEach(function (m) {
    items.push({
      type: 'circle', cx: num(X0 + m.x * (X1 - X0)), cy: num(Y0 - m.y * (Y0 - Y1)),
      r: 4, fill: 'none', stroke: m.color || INK, sw: 2
    });
    items.push(text(X0 + m.x * (X1 - X0) + 6, Y0 - m.y * (Y0 - Y1) - 8, m.label, {
      anchor: 'start', size: 11, fill: m.color || INK
    }));
  });
  return items.concat(notes(b));
}

// Stacked bands: atmosphere, soil, waste hierarchy. The top band is the first
// item in the brief, so a preference ladder reads top-down.
function layers(b) {
  var top = 54, bottom = 330, n = b.layers.length;
  var h = (bottom - top) / n;
  var items = [];
  b.layers.forEach(function (L, i) {
    var y = top + i * h;
    items.push(box(64, y, 520, h - 5, '', { sw: 1.8 }));
    items.push(text(84, y + h / 2 - (L.sub ? 7 : 0), L.label, {
      anchor: 'start', size: 14, weight: 800, fill: INK
    }));
    if (L.sub) {
      items.push(text(84, y + h / 2 + 13, L.sub, { anchor: 'start', size: 11, fill: MUTED }));
    }
  });
  items.push(arrow(624, bottom - 12, 624, top + 12, { sw: 1.6 }));
  if (b.sideLabel) {
    items.push(text(636, 200, b.sideLabel, { anchor: 'start', size: 11, fill: FAINT }));
  }
  return items.concat(notes(b));
}

// A single row of four to six steps. Text is wrapped by the brief author.
function flow(b) {
  var n = b.steps.length;
  var w = n <= 5 ? 124 : 104;
  var gap = n <= 5 ? 20 : 14;
  var total = n * w + (n - 1) * gap;
  var x0 = (760 - total) / 2;
  var y = 118;
  var h = 76;
  var size = n <= 5 ? 11 : 9.5;
  var items = [];
  b.steps.forEach(function (s, i) {
    var x = x0 + i * (w + gap);
    items.push(box(x, y, w, h, s, { size: size }));
    if (i > 0) items.push(arrow(x - gap + 2, y + h / 2, x - 2, y + h / 2));
  });
  if (b.flowLabel) {
    items.push(text(380, 96, b.flowLabel, { size: 11.5, fill: FAINT }));
  }
  return items.concat(notes(b));
}

// Nodes around an ellipse with straight arrows between neighbours. A candidate
// draws a cycle exactly this way: five boxes and five arrows.
function cycle(b) {
  var cx = 380, cy = 196, rx = 246, ry = 108;
  var n = b.nodes.length;
  var pts = b.nodes.map(function (_, i) {
    var a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  var items = [];
  pts.forEach(function (p, i) {
    items.push(box(p[0] - 80, p[1] - 25, 160, 50, b.nodes[i], { size: 11.5 }));
  });
  for (var i = 0; i < n; i++) {
    var a = pts[i], c = pts[(i + 1) % n];
    var dx = c[0] - a[0], dy = c[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    items.push(arrow(a[0] + ux * 84, a[1] + uy * 28, c[0] - ux * 84, c[1] - uy * 28, { sw: 1.6 }));
  }
  if (b.center) items.push(text(cx, cy, b.center, { size: 12.5, weight: 700, fill: INK }));
  return items.concat(notes(b));
}

// Events on a line, alternating above and below so labels do not collide.
function timeline(b) {
  var y = 196, n = b.events.length;
  var x0 = 70, x1 = 690;
  var step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  var items = [line(x0, y, x1, y, { sw: 2 })];
  b.events.forEach(function (e, i) {
    var x = x0 + i * step;
    var up = i % 2 === 0;
    items.push({ type: 'circle', cx: num(x), cy: y, r: 5, fill: 'none', stroke: INK, sw: 2 });
    items.push(text(x, up ? y - 18 : y + 30, e.year, {
      anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
      size: 13.5, weight: 800, fill: INK
    }));
    items.push(text(x, up ? y - 40 : y + 52, e.label, {
      anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
      size: 11, fill: MUTED
    }));
    if (e.sub) {
      items.push(text(x, up ? y - 58 : y + 70, e.sub, {
        anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
        size: 10.5, fill: FAINT
      }));
    }
  });
  return items.concat(notes(b));
}

// A 2x2 classification frame with axis labels.
function quadrant(b) {
  var x0 = 150, y0 = 66, w = 460, h = 244;
  var items = [
    box(x0, y0, w, h, '', { sw: 2 }),
    line(x0 + w / 2, y0, x0 + w / 2, y0 + h, { sw: 1.4 }),
    line(x0, y0 + h / 2, x0 + w, y0 + h / 2, { sw: 1.4 })
  ];
  (b.cells || []).slice(0, 4).forEach(function (c, i) {
    var cx = x0 + (i % 2) * w / 2 + w / 4;
    var cy = y0 + Math.floor(i / 2) * h / 2 + h / 4;
    items.push(text(cx, cy - (c.sub ? 8 : 0), c.title, { size: 12.5, weight: 800, fill: INK }));
    if (c.sub) items.push(text(cx, cy + 12, c.sub, { size: 10.5, fill: MUTED }));
  });
  if (b.xLabel) items.push(text(x0 + w / 2, y0 + h + 22, b.xLabel, { size: 11.5, fill: FAINT }));
  if (b.yLabel) items.push(text(x0 - 10, y0 + h / 2, b.yLabel, { anchor: 'end', size: 11.5, fill: FAINT }));
  return items.concat(notes(b));
}

module.exports = {
  axes: axes,
  layers: layers,
  flow: flow,
  cycle: cycle,
  timeline: timeline,
  quadrant: quadrant
};

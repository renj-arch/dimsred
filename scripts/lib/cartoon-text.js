'use strict';
/**
 * cartoon-text.js — geometry helpers for cartoon label legibility.
 *
 * The generation gate in invent-passage-cartoons.js compared label *anchor
 * points* (x,y) with a 20x16 box, which misses long labels whose text runs
 * into a neighbour, and misses labels dropped on top of the full-width caption
 * strip. These helpers estimate a text bounding box from its attributes so the
 * audit and repair can reason about the rectangles the reader actually sees.
 */

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// Rough glyph width as a fraction of font-size. Latin ~0.55; Malayalam and
// Devanagari run a little wider; CJK ~1.0.
function glyphFactor(text) {
  var cjk = /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  if (cjk) return 1.0;
  var indic = /[\u0900-\u0d7f]/.test(text);
  return indic ? 0.62 : 0.55;
}

function attr(tag, name) {
  var m = new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"').exec(tag) ||
          new RegExp("\\b" + name + "\\s*=\\s*'([^']*)'").exec(tag);
  return m ? m[1] : null;
}

/**
 * Parse every <text> element and return [{ x, y, w, h, left, top, right, bottom,
 * anchor, size, text, tag }]. Only the opening tag + inner text are used; a
 * <text> without explicit x/y is skipped (it cannot be placed).
 */
function textBoxes(svg) {
  var out = [];
  var re = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  var m;
  while ((m = re.exec(svg))) {
    var attrs = m[1];
    var x = attr(attrs, 'x');
    var y = attr(attrs, 'y');
    if (x == null || y == null) continue;
    x = parseFloat(x); y = parseFloat(y);
    if (!isFinite(x) || !isFinite(y)) continue;
    var size = parseFloat(attr(attrs, 'font-size')) || 14;
    var anchor = (attr(attrs, 'text-anchor') || 'start').toLowerCase();
    var text = decode(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    var w = Math.max(4, text.length * size * glyphFactor(text));
    var h = size * 1.05;
    var left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    var top = y - size * 0.8;       // ascent above the baseline
    out.push({
      x: x, y: y, w: w, h: h,
      left: left, top: top, right: left + w, bottom: top + h,
      anchor: anchor, size: size, text: text, tag: m[0]
    });
  }
  return out;
}

function overlapArea(a, b) {
  var w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  var h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Pairs of labels whose rendered boxes intersect by more than `minPx` pixels in
 * each dimension (so a 1px brush does not count).
 */
function collidingPairs(svg, minPx) {
  minPx = minPx || 3;
  var boxes = textBoxes(svg);
  var pairs = [];
  for (var i = 0; i < boxes.length; i++) {
    for (var j = i + 1; j < boxes.length; j++) {
      var ox = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left);
      var oy = Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top);
      if (ox > minPx && oy > minPx) {
        pairs.push({ a: boxes[i], b: boxes[j], ox: ox, oy: oy, area: ox * oy });
      }
    }
  }
  return pairs;
}

/**
 * Full-width caption strips at the bottom: <rect> with width ~ canvas width and
 * y in the last ~40px, with a dark fill. Returns their rects.
 */
function captionStrips(svg, W, H) {
  W = W || 560; H = H || 320;
  var out = [];
  var re = /<rect\b([^>]*)\/?>/gi;
  var m;
  while ((m = re.exec(svg))) {
    var a = m[1];
    var w = parseFloat(attr(a, 'width'));
    var y = parseFloat(attr(a, 'y'));
    var h = parseFloat(attr(a, 'height'));
    if (!isFinite(w) || !isFinite(y) || !isFinite(h)) continue;
    var fill = (attr(a, 'fill') || '').toLowerCase();
    var dark = /^#(1f2937|111|0{0,3}|22|initial|black)/.test(fill) || fill === '#1f2937';
    if (w >= W * 0.9 && y >= H - 60 && h <= 60 && h > 8) {
      out.push({ x: 0, y: y, w: w, h: h, right: w, bottom: y + h, fill: fill, dark: dark, full: m[0], index: m.index, end: m.index + m[0].length });
    }
  }
  return out;
}

function parseTextEls(svg) {
  var els = [];
  var re = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  var m;
  while ((m = re.exec(svg))) {
    var attrs = m[1];
    var x = attr(attrs, 'x'), y = attr(attrs, 'y');
    var el = { index: m.index, full: m[0], attrs: attrs, inner: m[2], dropped: false, box: null };
    if (x != null && y != null) {
      x = parseFloat(x); y = parseFloat(y);
      if (isFinite(x) && isFinite(y)) {
        var size = parseFloat(attr(attrs, 'font-size')) || 14;
        var anchor = (attr(attrs, 'text-anchor') || 'start').toLowerCase();
        var text = decode(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        var w = Math.max(4, text.length * size * glyphFactor(text));
        var h = size * 1.05;
        var left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
        var top = y - size * 0.8;
        el.box = { x: x, y: y, w: w, h: h, left: left, top: top, right: left + w, bottom: top + h, anchor: anchor, size: size, text: text };
      }
    }
    els.push(el);
  }
  return els;
}

function setXY(attrs, x, y) {
  var out = attrs;
  if (/\bx\s*=\s*"/.test(out)) out = out.replace(/\bx\s*=\s*"[^"]*"/, 'x="' + round(x) + '"');
  else if (/\bx\s*=\s*'/.test(out)) out = out.replace(/\bx\s*=\s*'[^']*'/, 'x="' + round(x) + '"');
  else out += ' x="' + round(x) + '"';
  if (/\by\s*=\s*"/.test(out)) out = out.replace(/\by\s*=\s*"[^"]*"/, 'y="' + round(y) + '"');
  else if (/\by\s*=\s*'/.test(out)) out = out.replace(/\by\s*=\s*'[^']*'/, 'y="' + round(y) + '"');
  else out += ' y="' + round(y) + '"';
  return out;
}
function round(n) { return Math.round(n * 10) / 10; }

function intersects(box, rect) {
  var ox = Math.min(box.right, rect.right) - Math.max(box.left, rect.x);
  var oy = Math.min(box.bottom, rect.bottom) - Math.max(box.top, rect.y);
  return ox > 3 && oy > 3;
}

/**
 * Repair one SVG in place (returns new svg text).
 *
 * Strategy:
 *   1. If the bottom caption bar collides with any label, remove the bar and its
 *      caption text — the <figcaption> under every cartoon already shows the
 *      section title, so the bar is redundant. This frees the labels instead of
 *      deleting them (the old behaviour lost "Credit System", river names, etc.).
 *   2. Separate any remaining overlapping text boxes by nudging them apart
 *      (vertical first, then horizontal).
 *   3. Drop a label only if it still cannot be separated inside the canvas.
 *
 * Returns { svg, moved, dropped, remaining, captionRemoved }.
 */
function repairSvg(svg, opts) {
  opts = opts || {};
  var vbm = /viewBox="0 0 (-?[\d.]+) (-?[\d.]+)"/i.exec(svg);
  var W = vbm ? +vbm[1] : 560, H = vbm ? +vbm[2] : 320;
  var el = parseTextEls(svg);
  var boxes = el.filter(function (e) { return e.box; });
  if (boxes.length < 2) return { svg: svg, moved: 0, dropped: 0, remaining: 0, captionRemoved: false };

  var strips = captionStrips(svg, W, H);
  var stripTop = strips.length ? Math.min.apply(null, strips.map(function (s) { return s.y; })) : H - 4;

  // The caption is the widest label sitting inside a strip.
  var caption = null, bestW = -1;
  for (var i = 0; i < boxes.length; i++) {
    if (strips.some(function (s) { return intersects(boxes[i].box, s); })) {
      if (boxes[i].box.w > bestW) { bestW = boxes[i].box.w; caption = boxes[i]; }
    }
  }

  // Does the bar / caption collide with any *other* label? If so, drop the bar.
  var captionRemoved = false;
  var removeRects = [];
  if (strips.length) {
    var collides = false;
    for (var bi = 0; bi < boxes.length && !collides; bi++) {
      if (boxes[bi] === caption) continue;
      if (strips.some(function (s) { return intersects(boxes[bi].box, s); }) || (caption && intersects(boxes[bi].box, { x: caption.box.left, y: caption.box.top, right: caption.box.right, bottom: caption.box.bottom }))) {
        collides = true;
      }
    }
    if (collides && caption && opts.keepCaption !== true) {
      caption.dropped = true;
      captionRemoved = true;
      removeRects = strips.map(function (s) { return { start: s.index, end: s.end }; });
      caption = null;
      strips = [];
      stripTop = H;
    }
  }

  var limitBottom = (caption ? Math.min(stripTop, caption.box.top) : H - 6) - 3;
  function overlaps(a, b) {
    var ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return (ox > 3 && oy > 3) ? { ox: ox, oy: oy } : null;
  }
  function clamp(e) {
    var b = e.box;
    var dy = 0, dx = 0;
    if (b.left < 6) dx += 6 - b.left;
    if (b.right > W - 6) dx -= b.right - (W - 6);
    if (b.top < 12) dy += 12 - b.top;
    if (b.bottom > limitBottom) dy -= b.bottom - limitBottom;
    if (dx) { b.left += dx; b.right += dx; b.x += dx; }
    if (dy) { b.top += dy; b.bottom += dy; b.y += dy; }
  }

  // Only labels that remain in the drawing participate in separation.
  var all = boxes.filter(function (e) { return !e.dropped; });
  var movable = all.filter(function (e) { return e !== caption; });

  for (var pass = 0; pass < 160; pass++) {
    var changed = false;
    for (var k = 0; k < movable.length; k++) {
      var e = movable[k], b = e.box;
      if (b.bottom > limitBottom) {
        var shift = limitBottom - b.bottom;
        b.top += shift; b.bottom += shift; b.y += shift; changed = true;
      }
      clamp(e);
    }
    for (var p = 0; p < all.length; p++) {
      for (var q = p + 1; q < all.length; q++) {
        var A = all[p].box, B = all[q].box;
        var ov = overlaps(A, B);
        if (!ov) continue;
        var need = ov.oy + 3;
        var lower = A.y >= B.y ? all[p] : all[q];
        var upper = lower === all[p] ? all[q] : all[p];
        var lowerM = lower !== caption, upperM = upper !== caption;
        var roomDown = limitBottom - lower.box.bottom;
        var roomUp = upper.box.top - 12;
        var did = false;
        if (lowerM && roomDown >= need) {
          lower.box.top += need; lower.box.bottom += need; lower.box.y += need; did = true;
        } else if (upperM && roomUp >= need) {
          upper.box.top -= need; upper.box.bottom -= need; upper.box.y -= need; did = true;
        } else if (lowerM && roomDown > 1) {
          lower.box.top += roomDown; lower.box.bottom += roomDown; lower.box.y += roomDown; did = true;
        } else if (upperM && roomUp > 1) {
          upper.box.top -= roomUp; upper.box.bottom -= roomUp; upper.box.y -= roomUp; did = true;
        }
        if (!did) {
          // Horizontal fallback: nudge the wider-room side left/right.
          var needX = ov.ox + 3;
          var rRoom = (W - 6) - lower.box.right;
          var lRoom = upper.box.left - 6;
          if (lowerM && rRoom >= needX) {
            lower.box.left += needX; lower.box.right += needX; lower.box.x += needX; did = true;
          } else if (upperM && lRoom >= needX) {
            upper.box.left -= needX; upper.box.right -= needX; upper.box.x -= needX; did = true;
          } else if (lowerM && rRoom > 1) {
            lower.box.left += rRoom; lower.box.right += rRoom; lower.box.x += rRoom; did = true;
          } else if (upperM && lRoom > 1) {
            upper.box.left -= lRoom; upper.box.right -= lRoom; upper.box.x -= lRoom; did = true;
          }
        }
        if (did) changed = true;
      }
    }
    if (!changed) break;
  }

  // Clamp first, then drop only labels that still collide (narrower one first).
  var dropped = 0;
  for (var guard = 0; guard < 80; guard++) {
    for (var c1 = 0; c1 < all.length; c1++) clamp(all[c1]);
    var found = null;
    for (var a1 = 0; a1 < all.length && !found; a1++) {
      for (var b1 = a1 + 1; b1 < all.length; b1++) {
        if (!overlaps(all[a1].box, all[b1].box)) continue;
        var cand;
        if (all[a1] === caption) cand = all[b1];
        else if (all[b1] === caption) cand = all[a1];
        else cand = all[a1].box.w <= all[b1].box.w ? all[a1] : all[b1];
        found = cand; break;
      }
    }
    if (!found) break;
    found.dropped = true; dropped++;
    all = all.filter(function (e) { return e !== found; });
  }

  // Unified rebuild: text rewrites/drops + caption-rect removals, in document order.
  var ops = [];
  for (var e2 = 0; e2 < el.length; e2++) {
    var item = el[e2];
    item.end = item.index + item.full.length;
    // If the element was dropped (caption or residual), remove it.
    ops.push({ index: item.index, end: item.end, kind: item.dropped ? 'remove' : 'text', el: item });
  }
  for (var r = 0; r < removeRects.length; r++) {
    ops.push({ index: removeRects[r].start, end: removeRects[r].end, kind: 'remove' });
  }
  // Filter out text ops whose element overlaps a removal range (caption text
  // removed together with the bar is already marked dropped).
  ops.sort(function (x, y) { return x.index - y.index; });
  var out = '', cursor = 0;
  for (var o = 0; o < ops.length; o++) {
    var op = ops[o];
    if (op.index < cursor) continue; // inside an earlier removal
    out += svg.slice(cursor, op.index);
    if (op.kind === 'text') {
      if (op.el.box) {
        var nb = op.el.box;
        out += '<text' + setXY(op.el.attrs, nb.x, nb.y) + '>' + op.el.inner + '</text>';
      } else {
        out += op.el.full; // <text> with no explicit x/y — leave untouched
      }
    }
    cursor = op.end;
  }
  out += svg.slice(cursor);

  var remaining = collidingPairs(out, 3).length;
  var movedCount = 0;
  for (var e3 = 0; e3 < el.length; e3++) {
    if (el[e3].box && !el[e3].dropped) {
      var orig = /<text\b[^>]*\bx="(-?[\d.]+)"[^>]*\by="(-?[\d.]+)"/.exec(el[e3].full);
      if (orig && (Math.abs(+orig[1] - el[e3].box.x) > 0.5 || Math.abs(+orig[2] - el[e3].box.y) > 0.5)) movedCount++;
    }
  }
  return { svg: out, moved: movedCount, dropped: dropped, remaining: remaining, captionRemoved: captionRemoved };
}

module.exports = { textBoxes, collidingPairs, overlapArea, captionStrips, decode, parseTextEls, repairSvg };
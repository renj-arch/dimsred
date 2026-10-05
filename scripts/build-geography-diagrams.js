// Auto-generate a printable GS-Geography diagram pack from data/topic-layers.json.
// One A4 page per geography-relevant topic: a central concept card, its lane boxes
// (People & Leaders / Key Events / Geography & Places / ...) and the item cards
// under each. Co-mention items render with dashed borders + a "w:N" chip (honest
// provenance); typed/asserted items render solid.
// Usage: node scripts/build-geography-diagrams.js

var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data');
var LAYERS_FILE = path.join(DATA, 'topic-layers.json');
var OUT_FILE = path.join(__dirname, '..', 'geography-diagrams.html');

var TOPIC_GEO_REGEX = /canal|glacier|volcan|river|plateau|desert|sea\b|\blake\b|strait|monsoon|cyclone|earthquake|island|mountain|range|coast|peninsula|gulf|bay\b|delta|tectonic|soil|climate|forest|national park|sanctuary|wildlife|wetland|drought|flood|tsunami|hurricane|typhoon|el ni\u00f1o|la ni\u00f1a|ocean|hemisphere|tropic|equator|asteroid|comet|oasis|pollination|watershed|estuary|fjord|atoll|reef|terrain|alluvial|loess|laterite|chernozem|zebu|vicuna|lama|alpaca|yaks|pampas|\bsavanna\b|prairie|steppe|taiga|tundra|mangrove|coral|estuarian/i;

// Names the keyword pass sweeps in but which are not GS-geography topics.
var GEO_EXCLUDE = { 'operation flood': 1, 'battle of lake poyang': 1,
  'pulakeshin ii': 1, 'basavanna': 1, 'helicopter': 1 };

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }

// ---- load layers ----
var layers = JSON.parse(fs.readFileSync(LAYERS_FILE, 'utf8'));

// GS-Geography subjects we curate as seeds but whose names carry no keyword
// (border lines, geopolitical vantage points, climate-ocean cousins). These sit
// in the flowchart spine but would be missed by a pure name-keyword match.
var GEO_CORE = {
  'siachen glacier': 1, 'mcmahon line': 1, 'line of actual control': 1,
  'line of control': 1, 'doklam': 1, 'suez canal': 1, 'panama canal': 1,
  'gir': 1, 'volcano': 1, 'mauna loa': 1, 'barren island': 1,
  'el ni\u00f1o': 1, 'la ni\u00f1a': 1
};

var selects = [];
Object.keys(layers).forEach(function (k) {
  var t = layers[k];
  var name = t.name || k;
  if (!TOPIC_GEO_REGEX.test(name) && !GEO_CORE[norm(name)]) return;
  if (GEO_EXCLUDE[norm(name)]) return;
  var items = 0;
  (t.branches || []).forEach(function (b) { items += (b.items || []).length; });
  selects.push({ key: k, name: name, items: items, branches: t.branches || [] });
});
selects.sort(function (a, b) { return b.items - a.items; });
var MAX_TOPICS = 120;
if (selects.length > MAX_TOPICS) selects = selects.slice(0, MAX_TOPICS);
selects.sort(function (a, b) { return norm(a.name) < norm(b.name) ? -1 : 1; });
var byNormName = {};
selects.forEach(function (s) { byNormName[norm(s.name)] = 1; });

// ---- node lookup (spans/descs) across timeline chunk files ----
var useNames = {};
selects.forEach(function (s) {
  useNames[norm(s.name)] = 1;
  s.branches.forEach(function (b) { (b.items || []).forEach(function (it) { useNames[norm(it.name || '')] = 1; }); });
});
var nodeInfo = {};
for (var i = 0; i <= 9; i++) {
  var p = path.join(DATA, 'timeline.nodes.' + i + '.json');
  if (!fs.existsSync(p)) continue;
  var arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  var list = Array.isArray(arr) ? arr : (arr.nodes || []);
  list.forEach(function (n) {
    if (!n || !useNames[norm(n.name || '')]) return;
    var span = n.span || null;
    nodeInfo[norm(n.name)] = {
      span: span ? (span.min + '-' + span.max) : (n.era || ''),
      era: n.era || '',
      desc: (n.desc || '').slice(0, 90)
    };
  });
}

// ---- SVG helpers ----
var LANE_COLOR = {
  person: '#7e22ce', event: '#1d4ed8', concept: '#15803d',
  org: '#c2410c', disease: '#b91c1c', scheme: '#92400e', volcano: '#b91c1c', place: '#0e7490'
};
function colorFor(t) { return LANE_COLOR[t] || '#374151'; }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(s, maxChars) {
  var words = String(s || '').split(/\s+/);
  var lines = [''];
  words.forEach(function (w) {
    var last = lines[lines.length - 1];
    if ((last + ' ' + w).trim().length > maxChars || /[.,;:)]$/.test(w) && last.length > maxChars / 2) {
      lines.push(w);
    } else {
      lines[lines.length - 1] = (last + ' ' + w).trim();
    }
  });
  if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] += '\u2026'; }
  return lines;
}

// draws a rounded rect + wrapped text, returns height used
function drawBox(text, x, y, w, opts) {
  opts = opts || {};
  var color = opts.color || '#374151';
  var lines = wrapText(text, opts.maxChars || 22);
  var lineH = opts.lineH || 11;
  var pad = opts.pad != null ? opts.pad : 6;
  var h = pad * 2 + lines.length * lineH;
  var dash = opts.dash ? ' stroke-dasharray="4 3"' : '';
  var fill = opts.fill || '#ffffff';
  var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '" stroke="' + color + '" stroke-width="' + (opts.thick ? 2 : 1.2) + '"' + dash + '/>';
  lines.forEach(function (ln, li) {
    var yy = y + pad + li * lineH + (lineH * 0.8);
    var weight = li === 0 && opts.bold != null ? opts.bold : 400;
    s += '<text x="' + (x + pad) + '" y="' + yy + '" font-size="' + (opts.size || 10) + '" font-weight="' + weight + '" fill="' + (opts.tcolor || '#111827') + '">' + esc(ln) + '</text>';
  });
  return { h: h, text: s };
}

function laneTitle(t) { return { person: 'People & Leaders', event: 'Key Events', concept: 'Key Concepts', org: 'Institutions & Organisations', disease: 'Health & Disease', scheme: 'Schemes & Missions', volcano: 'Volcanoes', place: 'Places' }[t] || 'Related'; }

function drawLane(topicBox, b, laneIndex, startX, colW, topY) {
  var color = colorFor(b.type);
  var out = '';
  var X = startX;
  var W = colW - 4;
  var y = topY;
  // lane header
  var hdr = laneTitle(b.type);
  if (b.rel && b.rel !== 'includes' && b.rel !== 'figure in') hdr = hdr + ' \u00b7 ' + esc(b.rel);
  var hb = drawBox(hdr, X, y, W, { color: color, size: 9, maxChars: 18, thick: true, tcolor: color, pad: 4, lineH: 10 });
  y += hb.h + 6;
  // connector topic -> lane header
  out += '<line x1="' + (topicBox.cx) + '" y1="' + (topicBox.bot) + '" x2="' + (X + W / 2) + '" y2="' + (y + 2) + '" stroke="#9ca3af" stroke-width="1.4"/>';
  // items
  var items = (b.items || []).slice(0, 8);
  var remaining = (b.items || []).length - items.length;
  items.forEach(function (it) {
    var typed = it.src !== 'co' && it.rel && /(?:asserted|typed|includes|figure in|located in|concept of|institution of|associated with)/.test(it.rel) && it.src !== 'co';
    var dashed = (it.src === 'co' || it.rel === 'mentioned with' || it.rel === 'related');
    var ic = drawBox(it.name, X, y, W, {
      color: color, maxChars: 20, dash: dashed, thick: it.type === 'person' && typed, pad: 4, lineH: 9
    });
    var chip = '';
    if (typeof it.w === 'number') {
      chip = '<text x="' + (X + W - 4) + '" y="' + (y + 8) + '" font-size="7" text-anchor="end" fill="' + color + '" font-weight="600">w:' + it.w + '</text>';
    }
    out += ic.text + chip;
    y += ic.h + 3;
  });
  if (remaining > 0) {
    out += '<text x="' + X + '" y="' + (y + 8) + '" font-size="7.5" fill="#6b7280" font-style="italic">+ ' + remaining + ' more</text>';
  }
  return { svg: out, h: y + 20 };
}

function diagramFor(s) {
  var name = s.name;
  var info = nodeInfo[norm(name)] || {};
  var color = colorFor('place');
  var branches = s.branches.slice(0, 5).sort(function (a, b) { return (b.items || []).length - (a.items || []).length; });
  var laneW = Math.floor(880 / Math.max(branches.length, 1));
  var maxItems = 0;
  branches.forEach(function (b) { maxItems = Math.max(maxItems, (b.items || []).length); });

  var TOP = 86, HEAD = 150, ITEM_H = maxItems * 14 + 30;
  var laneBlockH = Math.max(150, HEAD + ITEM_H);
  var H = TOP + laneBlockH + 40;
  var W = 895;

  // center box (drawn at y=10 in the svg)
  var cw = Math.min(300, 40 + name.length * 7);
  var cx = 895 / 2;
  var cText = makeCenterText(name, info, color);
  var boxBottom = 10 + cText.h;
  var topicBox = { cx: cx, bot: boxBottom };

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(name) + '">';
  svg += cText.svg;
  // lanes
  var lanesInRow = Math.min(branches.length, 4);
  var perRow = Math.max(2, lanesInRow);
  var colW = Math.floor((W - 20) / perRow);
  var laneTop = boxBottom + 24;
  branches.slice(0, 5).forEach(function (b, i) {
    var col = i % perRow;
    var row = Math.floor(i / perRow);
    var startX = 10 + col * colW;
    var yy = laneTop + row * 260;
    var dl = drawLane(topicBox, b, i, startX, colW, yy);
    svg += dl.svg;
  });
  svg += '</svg>';
  var classes = 'topicpage';
  var meta = [
    'span: ' + (info.span || 'undated'),
    'branches: ' + branches.length,
    info.era ? ('era: ' + info.era) : null
  ].filter(Boolean).join(' \u00b7 ');
  return page(name, meta, svg);
}

function makeCenterText(name, info, color) {
  var w = Math.min(300, 40 + name.length * 7);
  var lines = [name + (info.span ? '  (' + info.span + ')' : '')];
  var h = 26 + (info.span ? 12 : 0) + 18;
  var s = '<rect x="' + (w * 0) + '" y="0" width="' + w + '" height="' + h + '" rx="8" fill="' + color + '"/>';
  s += '<text x="' + (w / 2) + '" y="' + (h / 2 + 4) + '" font-size="12.5" font-weight="700" fill="#fff" text-anchor="middle">' + esc(name) + '</text>';
  if (info.span) {
    s += '<text x="' + (w / 2) + '" y="' + (h - 7) + '" font-size="8" fill="#fef3c7" text-anchor="middle" font-weight="600">' + esc(info.span) + '</text>';
  }
  return { svg: '<g transform="translate(' + ((895 - w) / 2) + ',' + 10 + ')">' + s + '</g>', h: h };
}

function page(name, meta, svg) {
  return '<section class="page">' +
    '<header><span class="num">GS Geography \u00b7 UPSC</span><h1>' + esc(name) + '</h1><p class="meta">' + esc(meta) + '</p></header>' +
    svg +
    '<footer>source: flowchart topic-layers / build-geography-diagrams.js \u00b7 dashed = co-mention \u00b7 w = weight (evidence strength)</footer>' +
    '</section>';
}

// ---- assemble ----
var secList = selects;

var body = '<section class="page"><header><span class="num">GS Geography \u00b7 UPSC</span><h1>Geography Diagram Pack</h1><p class="meta">' + secList.length + ' topic diagrams \u00b7 solid boxes = typed/asserted links \u00b7 dashed = co-mention with weight (w)</p></header>' + indexFor(secList) + '</section>';
secList.forEach(function (s) {
  body += '<div id="' + norm(s.name) + '">' + diagramFor(s) + '</div>';
});

function indexFor(list) {
  return '<ul class="toc">' + list.map(function (s) { return '<li><a href="#' + norm(s.name) + '">' + esc(s.name) + '</a></li>'; }).join('') + '</ul>';
}

var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GS Geography Diagram Pack (UPSC)</title>' +
  '<style>' +
  'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;background:#e5e7eb;color:#111827}' +
  'section.page{background:#fff;max-width:960px;margin:16px auto;padding:28px 26px;box-shadow:0 1px 4px rgba(0,0,0,.18);page-break-after:always}' +
  'section.page:last-child{page-break-after:auto}' +
  'header h1{font-size:17px;margin:0 0 2px}' +
  '.num{font-size:10px;letter-spacing:.12em;color:#0e7490;font-weight:700;text-transform:uppercase}' +
  '.meta{font-size:11px;color:#4b5563;margin:0 0 10px}' +
  'ul.toc{columns:4;font-size:10.5px;line-height:1.7;list-style:none;padding:0;margin:0 0 6px}' +
  'ul.toc a{color:#0e7490;text-decoration:none}' +
  'footer{font-size:8.5px;color:#9ca3af;margin-top:8px;border-top:1px solid #e5e7eb;padding-top:6px}' +
  'svg{display:block;margin:0 auto}' +
  '@page{size:A4;margin:12mm}' +
  '@media print{body{background:#fff}.topicpage{box-shadow:none;margin:0;padding:0}}</style></head><body>' +
  body +
  '</body></html>';

fs.writeFileSync(OUT_FILE, html);
console.log('Wrote ' + OUT_FILE + ' (' + selects.length + ' topics)');

// quick domain sanity for the console
selects.slice(0, 8).forEach(function (s) { console.log('  - ' + s.name + '  [' + s.items + ' items]'); });
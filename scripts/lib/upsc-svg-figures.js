'use strict';
// Shared UPSC hand-drawn SVG figure definitions.
// Consumed by build-upsc-figures-page.js (figures.html gallery),
// build-svg-figure-pages.js (figures/topic-<id>.html) and
// build-figure-pages.js (hero cards on figures/index.html).

var PAPER = {
  GS1: { label: 'GS Paper 1', color: '#60a5fa' },
  GS2: { label: 'GS Paper 2', color: '#a78bfa' },
  GS3: { label: 'GS Paper 3', color: '#34d399' },
  GS4: { label: 'GS Paper 4', color: '#fbbf24' }
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelLines(text, x, y, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split('\n');
  var size = opts.size || 15;
  var weight = opts.weight || 600;
  var fill = opts.fill || '#1f2937';
  var anchor = opts.anchor || 'middle';
  var lh = opts.lh || size * 1.25;
  var start = y - ((lines.length - 1) * lh) / 2;
  return '<text x="' + x + '" y="' + start + '" text-anchor="' + anchor + '" font-size="' + size +
    '" font-weight="' + weight + '" fill="' + fill + '" font-family="Inter, Segoe UI, sans-serif">' +
    lines.map(function (line, i) {
      return '<tspan x="' + x + '" dy="' + (i === 0 ? 0 : lh) + '">' + esc(line) + '</tspan>';
    }).join('') + '</text>';
}

function box(o) {
  var fill = o.fill || '#ffffff';
  var stroke = o.stroke || '#334155';
  var rx = o.rx == null ? 12 : o.rx;
  var dash = o.dash ? ' stroke-dasharray="7 6"' : '';
  var sw = o.sw || 2.2;
  var out = '<rect x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="' + rx +
    '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + dash + '/>';
  if (o.text) out += labelLines(o.text, o.x + o.w / 2, o.y + o.h / 2, { size: o.size || 15, weight: o.weight || 650, fill: o.textFill || '#1f2937' });
  return out;
}

function pill(o) {
  o.rx = o.h / 2;
  return box(o);
}

function arrow(o, uid) {
  var color = o.color || '#334155';
  var sw = o.sw || 2.2;
  var dash = o.dash ? ' stroke-dasharray="8 7"' : '';
  var d = o.d || ('M ' + o.x1 + ' ' + o.y1 + ' L ' + o.x2 + ' ' + o.y2);
  var out = '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + sw +
    '" stroke-linecap="round" marker-end="url(#arrowhead-' + uid + ')"' + dash + '/>';
  return out;
}

function text(o) {
  return labelLines(o.text, o.x, o.y, { size: o.size || 14, weight: o.weight || 600, fill: o.fill || '#334155', anchor: o.anchor || 'middle' });
}

function circle(o) {
  var out = '<circle cx="' + o.cx + '" cy="' + o.cy + '" r="' + o.r + '" fill="' + (o.fill || '#ffffff') +
    '" stroke="' + (o.stroke || '#334155') + '" stroke-width="' + (o.sw || 2.2) + '"/>';
  if (o.text) out += labelLines(o.text, o.cx, o.cy, { size: o.size || 14, weight: 650, fill: o.textFill || '#1f2937' });
  return out;
}

function pathEl(o) {
  return '<path d="' + o.d + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.stroke || '#334155') +
    '" stroke-width="' + (o.sw || 2.2) + '" stroke-linejoin="round" stroke-linecap="round"' +
    (o.dash ? ' stroke-dasharray="7 6"' : '') + '/>';
}

function line(o) {
  return '<line x1="' + o.x1 + '" y1="' + o.y1 + '" x2="' + o.x2 + '" y2="' + o.y2 + '" stroke="' +
    (o.stroke || '#94a3b8') + '" stroke-width="' + (o.sw || 1.4) + '"' + (o.dash ? ' stroke-dasharray="5 5"' : '') + '/>';
}

function svg(d) {
  var uid = String(d.id || 'fig').replace(/[^a-z0-9-]/gi, '');
  var shapes = [];
  var labels = [];
  d.items.forEach(function (it) {
    if (it.type === 'box' || it.type === 'pill') { shapes.push(it.type === 'pill' ? pill(it) : box(it)); }
    else if (it.type === 'arrow') shapes.push(arrow(it, uid));
    else if (it.type === 'circle') shapes.push(circle(it));
    else if (it.type === 'path') shapes.push(pathEl(it));
    else if (it.type === 'line') shapes.push(line(it));
  });
  // Box/circle labels are drawn with their shape. Free text and arrow labels
  // stay in a separate, un-filtered layer so the sketch filter cannot distort
  // the words.
  d.items.forEach(function (it) {
    if (it.type === 'arrow' && it.label) {
      var mx = it.lx != null ? it.lx : ((it.x1 + it.x2) / 2);
      var my = it.ly != null ? it.ly : ((it.y1 + it.y2) / 2 - 8);
      labels.push(labelLines(it.label, mx, my, { size: it.size || 12.5, weight: 600, fill: it.labelFill || '#475569' }));
    } else if (it.type === 'text') {
      labels.push(text(it));
    }
  });
  return '<svg viewBox="0 0 ' + (d.w || 760) + ' ' + (d.h || 420) + '" role="img" aria-label="' + esc(d.aria || d.title) + '">' +
    '<defs><marker id="arrowhead-' + uid + '" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">' +
    '<path d="M0,0 L10,4 L0,8 z" fill="#475569"/></marker>' +
    '<filter id="rough-' + uid + '" x="-5%" y="-5%" width="110%" height="110%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="11" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter></defs>' +
    '<rect x="0" y="0" width="100%" height="100%" fill="#fbf7ec"/>' +
    '<g filter="url(#rough-' + uid + ')">' + shapes.join('') + '</g>' +
    '<g>' + labels.join('') + '</g>' +
    '</svg>';
}


var FIGURES = [
  {
    id: 'monsoon',
    title: 'Indian summer monsoon: the pressure seesaw',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'Draw the ITCZ shift first, then the two branches. This is the skeleton for almost every monsoon answer.',
    items: [
      { type: 'box', x: 35, y: 30, w: 205, h: 72, text: 'ITCZ shifts north\n(summer heating)', fill: '#eff6ff', stroke: '#2563eb' },
      { type: 'box', x: 285, y: 30, w: 190, h: 72, text: 'Low pressure over\nNW India / Tibet', fill: '#fef3c7', stroke: '#d97706' },
      { type: 'box', x: 520, y: 30, w: 205, h: 72, text: 'Himalayan barrier\nforces orographic uplift', fill: '#f1f5f9', stroke: '#64748b' },
      { type: 'arrow', x1: 240, y1: 66, x2: 282, y2: 66 },
      { type: 'arrow', x1: 475, y1: 66, x2: 517, y2: 66 },
      { type: 'box', x: 35, y: 160, w: 205, h: 70, text: 'Cross-equatorial flow\nSomali jet', fill: '#ecfeff', stroke: '#0891b2' },
      { type: 'box', x: 285, y: 160, w: 190, h: 70, text: 'Arabian Sea\nbranch', fill: '#dbeafe', stroke: '#2563eb' },
      { type: 'box', x: 520, y: 160, w: 205, h: 70, text: 'Bay of Bengal\nbranch', fill: '#dcfce7', stroke: '#16a34a' },
      { type: 'arrow', x1: 240, y1: 195, x2: 282, y2: 195, label: 'feeds', lx: 260, ly: 183 },
      { type: 'arrow', x1: 380, y1: 157, x2: 380, y2: 105 },
      { type: 'arrow', x1: 520, y1: 175, x2: 480, y2: 103 },
      { type: 'box', x: 120, y: 300, w: 265, h: 70, text: 'Orographic lift → heavy rain\nWestern Ghats (windward)', fill: '#e0f2fe', stroke: '#0284c7' },
      { type: 'box', x: 430, y: 300, w: 265, h: 70, text: 'Rain shadow\nDeccan interior (leeward)', fill: '#fef2f2', stroke: '#dc2626' },
      { type: 'arrow', x1: 340, y1: 233, x2: 280, y2: 297 },
      { type: 'arrow', x1: 388, y1: 336, x2: 427, y2: 336 },
      { type: 'text', x: 620, y: 278, text: 'NE India & east coast rainfall', size: 13, fill: '#15803d' },
      { type: 'text', x: 380, y: 400, text: 'Withdrawal: September–October; retreating monsoon gives Tamil Nadu its main rainy season.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'plate-boundaries',
    title: 'Three plate boundaries',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'A three-panel sketch answers questions on earthquakes, volcanoes and mountain building in one go.',
    items: [
      { type: 'text', x: 135, y: 32, text: 'Divergent', size: 17, weight: 800, fill: '#2563eb' },
      { type: 'text', x: 380, y: 32, text: 'Convergent', size: 17, weight: 800, fill: '#dc2626' },
      { type: 'text', x: 625, y: 32, text: 'Transform', size: 17, weight: 800, fill: '#7c3aed' },
      { type: 'path', d: 'M 35 230 L 95 190 L 155 230 L 215 190 L 235 205 L 235 300 L 35 300 Z', fill: '#dbeafe', stroke: '#2563eb' },
      { type: 'path', d: 'M 275 300 L 275 215 L 330 185 L 385 225 L 445 200 L 485 230 L 485 300 Z', fill: '#fee2e2', stroke: '#dc2626' },
      { type: 'path', d: 'M 515 190 L 735 190 L 735 300 L 515 300 Z', fill: '#ede9fe', stroke: '#7c3aed' },
      { type: 'path', d: 'M 35 190 Q 80 165 135 190 T 235 190', fill: 'none', stroke: '#1d4ed8', sw: 3 },
      { type: 'arrow', x1: 120, y1: 250, x2: 70, y2: 250, color: '#2563eb' },
      { type: 'arrow', x1: 150, y1: 250, x2: 200, y2: 250, color: '#2563eb' },
      { type: 'text', x: 135, y: 275, text: 'new crust', size: 13, fill: '#1d4ed8' },
      { type: 'path', d: 'M 275 245 L 390 245 L 450 300', fill: 'none', stroke: '#dc2626', sw: 3 },
      { type: 'path', d: 'M 390 245 L 450 210 L 485 245', fill: 'none', stroke: '#dc2626', sw: 3 },
      { type: 'arrow', x1: 315, y1: 220, x2: 360, y2: 220, color: '#dc2626' },
      { type: 'text', x: 380, y: 275, text: 'subduction', size: 13, fill: '#b91c1c' },
      { type: 'text', x: 445, y: 205, text: 'volcano', size: 12, fill: '#b91c1c' },
      { type: 'line', x1: 625, y1: 245, x2: 640, y2: 245, stroke: '#7c3aed', sw: 3, dash: true },
      { type: 'arrow', x1: 590, y1: 215, x2: 590, y2: 260, color: '#7c3aed' },
      { type: 'arrow', x1: 665, y1: 260, x2: 665, y2: 215, color: '#7c3aed' },
      { type: 'text', x: 625, y: 285, text: 'fault', size: 13, fill: '#6d28d9' },
      { type: 'text', x: 135, y: 340, text: 'Mid-ocean ridge\nsea-floor spreading', size: 13, fill: '#475569' },
      { type: 'text', x: 380, y: 340, text: 'Oceanic plate sinks\nunder continental', size: 13, fill: '#475569' },
      { type: 'text', x: 625, y: 340, text: 'Plates slide past\nno crust created', size: 13, fill: '#475569' },
      { type: 'text', x: 380, y: 395, text: 'India–Eurasia collision = continental convergent; Himalaya and Tibetan plateau.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'rock-cycle',
    title: 'The rock cycle',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'Use the triangle to show that the three rock families are processes, not permanent boxes.',
    items: [
      { type: 'circle', cx: 380, cy: 75, r: 52, text: 'Magma', fill: '#fee2e2', stroke: '#dc2626' },
      { type: 'box', x: 280, y: 160, w: 200, h: 62, text: 'Igneous rock', fill: '#fecaca', stroke: '#dc2626' },
      { type: 'box', x: 70, y: 290, w: 210, h: 62, text: 'Sedimentary rock', fill: '#fde68a', stroke: '#d97706' },
      { type: 'box', x: 480, y: 290, w: 210, h: 62, text: 'Metamorphic rock', fill: '#ddd6fe', stroke: '#7c3aed' },
      { type: 'arrow', x1: 380, y1: 130, x2: 380, y2: 157, label: 'cooling', lx: 425, ly: 147 },
      { type: 'arrow', x1: 290, y1: 225, x2: 220, y2: 287, label: 'weathering\n+ deposition', lx: 225, ly: 250 },
      { type: 'arrow', x1: 280, y1: 321, x2: 470, y2: 321, label: 'heat + pressure', lx: 380, ly: 310 },
      { type: 'arrow', x1: 640, y1: 290, x2: 455, y2: 118, label: 'melting', lx: 605, ly: 195 },
      { type: 'arrow', x1: 480, y1: 225, x2: 430, y2: 108, label: 'melting', lx: 525, ly: 175 },
      { type: 'text', x: 380, y: 390, text: 'Intrusive igneous = cooled below surface (granite); extrusive = cooled on surface (basalt).', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'soil-profile',
    title: 'Soil profile: horizons you can label',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'A five-layer sketch is enough for soil, agriculture and land-degradation answers.',
    items: [
      { type: 'box', x: 110, y: 35, w: 300, h: 55, text: 'O — leaf litter / humus', fill: '#ecfccb', stroke: '#65a30d', size: 14 },
      { type: 'box', x: 110, y: 92, w: 300, h: 60, text: 'A — topsoil (humus + roots)', fill: '#fef3c7', stroke: '#d97706', size: 14 },
      { type: 'box', x: 110, y: 154, w: 300, h: 60, text: 'B — subsoil (clay, iron)', fill: '#fed7aa', stroke: '#ea580c', size: 14 },
      { type: 'box', x: 110, y: 216, w: 300, h: 60, text: 'C — weathered rock', fill: '#e2e8f0', stroke: '#64748b', size: 14 },
      { type: 'box', x: 110, y: 278, w: 300, h: 55, text: 'R — bedrock', fill: '#cbd5e1', stroke: '#475569', size: 14 },
      { type: 'arrow', x1: 455, y1: 60, x2: 455, y2: 305, label: 'depth\nincreases', lx: 500, ly: 185, labelFill: '#475569' },
      { type: 'text', x: 570, y: 70, text: 'O: organic', size: 13, fill: '#3f6212', anchor: 'start' },
      { type: 'text', x: 570, y: 120, text: 'A: roots + microbes', size: 13, fill: '#92400e', anchor: 'start' },
      { type: 'text', x: 570, y: 182, text: 'B: illuviation', size: 13, fill: '#9a3412', anchor: 'start' },
      { type: 'text', x: 570, y: 244, text: 'C: parent material', size: 13, fill: '#475569', anchor: 'start' },
      { type: 'text', x: 570, y: 306, text: 'R: unweathered', size: 13, fill: '#334155', anchor: 'start' },
      { type: 'text', x: 380, y: 390, text: 'Alluvial soil is deep and fertile; laterite is leached and acidic; black soil is clay-rich and moisture-retentive.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'el-nino',
    title: 'Normal, El Niño and La Niña',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'Two ocean cross-sections explain the pressure reversal; add the Indian consequence in one line.',
    items: [
      { type: 'text', x: 190, y: 28, text: 'Normal year', size: 16, weight: 800, fill: '#2563eb' },
      { type: 'text', x: 570, y: 28, text: 'El Niño year', size: 16, weight: 800, fill: '#dc2626' },
      { type: 'path', d: 'M 30 90 L 350 90 L 350 250 L 30 250 Z', fill: '#e0f2fe', stroke: '#38bdf8' },
      { type: 'path', d: 'M 410 90 L 730 90 L 730 250 L 410 250 Z', fill: '#e0f2fe', stroke: '#38bdf8' },
      { type: 'path', d: 'M 30 90 Q 190 80 350 90', fill: 'none', stroke: '#0284c7', sw: 2 },
      { type: 'path', d: 'M 410 90 Q 570 80 730 90', fill: 'none', stroke: '#0284c7', sw: 2 },
      { type: 'text', x: 80, y: 125, text: 'warm pool', size: 13, fill: '#b91c1c' },
      { type: 'text', x: 300, y: 125, text: 'cool upwelling', size: 13, fill: '#1d4ed8' },
      { type: 'text', x: 560, y: 140, text: 'warm pool shifts east', size: 13, fill: '#b91c1c' },
      { type: 'text', x: 680, y: 120, text: 'upwelling weak', size: 13, fill: '#1d4ed8' },
      { type: 'arrow', x1: 300, y1: 165, x2: 90, y2: 165, label: 'trade winds', lx: 195, ly: 155, labelFill: '#1d4ed8' },
      { type: 'arrow', x1: 690, y1: 165, x2: 480, y2: 165, label: 'weakened winds', lx: 585, ly: 155, labelFill: '#b91c1c' },
      { type: 'arrow', x1: 250, y1: 215, x2: 250, y2: 185, label: 'upwelling', lx: 300, ly: 208, labelFill: '#1d4ed8' },
      { type: 'arrow', x1: 620, y1: 215, x2: 620, y2: 190, label: 'suppressed', lx: 675, ly: 208, labelFill: '#b91c1c' },
      { type: 'box', x: 30, y: 290, w: 320, h: 62, text: 'India: normal / good monsoon\nrainfall over central India', fill: '#dcfce7', stroke: '#16a34a', size: 13.5 },
      { type: 'box', x: 410, y: 290, w: 320, h: 62, text: 'India: weak monsoon, drought risk\nLa Niña usually the opposite', fill: '#fee2e2', stroke: '#dc2626', size: 13.5 },
      { type: 'text', x: 380, y: 390, text: 'El Niño = weakened Walker circulation; La Niña = strengthened trade winds and a colder eastern Pacific.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'law-making',
    title: 'How a Bill becomes an Act',
    paper: 'GS2',
    tag: 'Polity',
    intro: 'The standard flowchart, with the committee stage kept visible — most answers forget it.',
    items: [
      { type: 'box', x: 30, y: 35, w: 160, h: 60, text: 'Bill introduced', fill: '#f5f3ff', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 220, y: 35, w: 160, h: 60, text: 'First reading', fill: '#f5f3ff', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 410, y: 35, w: 160, h: 60, text: 'Second reading', fill: '#f5f3ff', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 600, y: 35, w: 130, h: 60, text: 'Committee', fill: '#ede9fe', stroke: '#6d28d9', size: 13.5 },
      { type: 'box', x: 600, y: 145, w: 130, h: 60, text: 'Report stage', fill: '#ede9fe', stroke: '#6d28d9', size: 13.5 },
      { type: 'box', x: 410, y: 145, w: 160, h: 60, text: 'Third reading', fill: '#f5f3ff', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 220, y: 145, w: 160, h: 60, text: 'Other House', fill: '#f5f3ff', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 30, y: 145, w: 160, h: 60, text: 'President', fill: '#fef3c7', stroke: '#d97706', size: 13.5 },
      { type: 'box', x: 30, y: 255, w: 700, h: 62, text: 'Act of Parliament  •  notified in the Gazette  •  enforceable', fill: '#dcfce7', stroke: '#16a34a', size: 15 },
      { type: 'arrow', x1: 190, y1: 65, x2: 217, y2: 65 },
      { type: 'arrow', x1: 380, y1: 65, x2: 407, y2: 65 },
      { type: 'arrow', x1: 570, y1: 65, x2: 597, y2: 65 },
      { type: 'arrow', x1: 665, y1: 95, x2: 665, y2: 142 },
      { type: 'arrow', x1: 597, y1: 175, x2: 573, y2: 175 },
      { type: 'arrow', x1: 407, y1: 175, x2: 383, y2: 175 },
      { type: 'arrow', x1: 217, y1: 175, x2: 193, y2: 175 },
      { type: 'arrow', x1: 110, y1: 205, x2: 110, y2: 252 },
      { type: 'text', x: 380, y: 365, text: 'Money Bill: only Lok Sabha, President’s recommendation; Rajya Sabha must return it in 14 days and can only recommend amendments.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 392, text: 'Ordinary Bill: either House may start; disagreement → joint sitting (not for Money/Constitution Amendment Bills).', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'federal-lists',
    title: 'Union, State and Concurrent Lists',
    paper: 'GS2',
    tag: 'Polity',
    intro: 'Three columns plus the residuary clause; use this before any federalism answer.',
    items: [
      { type: 'box', x: 280, y: 20, w: 200, h: 55, text: 'Constitution\nSeventh Schedule', fill: '#f5f3ff', stroke: '#7c3aed', size: 14 },
      { type: 'box', x: 35, y: 130, w: 210, h: 150, text: 'Union List\n\ndefence\natomic energy\nforeign affairs\nrailways\ncurrency', fill: '#ede9fe', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 275, y: 130, w: 210, h: 150, text: 'State List\n\npolice\npublic order\nland\nlocal government\nhealth', fill: '#dbeafe', stroke: '#2563eb', size: 13.5 },
      { type: 'box', x: 515, y: 130, w: 210, h: 150, text: 'Concurrent List\n\neducation\nforests\nmarriage\nbankruptcy\ncriminal law', fill: '#dcfce7', stroke: '#16a34a', size: 13.5 },
      { type: 'arrow', x1: 320, y1: 78, x2: 140, y2: 127 },
      { type: 'arrow', x1: 380, y1: 78, x2: 380, y2: 127 },
      { type: 'arrow', x1: 440, y1: 78, x2: 620, y2: 127 },
      { type: 'box', x: 140, y: 315, w: 480, h: 72, text: 'Residuary powers → Union (Article 248)\nState law repugnant to Union law on Concurrent List\n→ Union prevails (Art. 254)', fill: '#fef3c7', stroke: '#d97706', size: 13 },
      { type: 'text', x: 380, y: 402, text: 'Cooperative federalism: GST Council, NITI Aayog, Finance Commission, inter-state councils.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'separation-powers',
    title: 'Separation of powers and checks',
    paper: 'GS2',
    tag: 'Polity',
    intro: 'Not a rigid separation: draw the triangle, then add the checks in both directions.',
    items: [
      { type: 'box', x: 290, y: 30, w: 180, h: 62, text: 'Legislature\nParliament', fill: '#ede9fe', stroke: '#7c3aed' },
      { type: 'box', x: 70, y: 250, w: 190, h: 62, text: 'Executive\nCouncil of Ministers', fill: '#dbeafe', stroke: '#2563eb' },
      { type: 'box', x: 500, y: 250, w: 190, h: 62, text: 'Judiciary\nSupreme Court', fill: '#dcfce7', stroke: '#16a34a' },
      { type: 'arrow', x1: 290, y1: 75, x2: 190, y2: 247, label: 'laws + confidence', lx: 210, ly: 160 },
      { type: 'arrow', x1: 220, y1: 250, x2: 310, y2: 95, label: 'accountable to', lx: 270, ly: 180, dash: true },
      { type: 'arrow', x1: 560, y1: 247, x2: 472, y2: 92, label: 'interprets laws', lx: 545, ly: 165 },
      { type: 'arrow', x1: 500, y1: 258, x2: 265, y2: 258, label: 'judicial review', lx: 380, ly: 245, dash: true },
      { type: 'arrow', x1: 260, y1: 302, x2: 500, y2: 302, label: 'appoints judges', lx: 380, ly: 320, dash: true },
      { type: 'text', x: 380, y: 370, text: 'Basic structure doctrine (Kesavananda Bharati, 1973) limits constitutional amendments.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 397, text: 'Judicial review: Articles 13, 32 and 226; executive accountability: Article 75(3), 164(2).', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'monetary-transmission',
    title: 'Monetary policy transmission',
    paper: 'GS3',
    tag: 'Economy',
    intro: 'The chain from repo rate to inflation, with the leakages that make transmission slow.',
    items: [
      { type: 'box', x: 25, y: 45, w: 150, h: 66, text: 'RBI policy rate\n(repo)', fill: '#dcfce7', stroke: '#16a34a', size: 14 },
      { type: 'box', x: 205, y: 45, w: 150, h: 66, text: 'Liquidity\nOMO / CRR / SLR', fill: '#ecfccb', stroke: '#65a30d', size: 14 },
      { type: 'box', x: 385, y: 45, w: 155, h: 66, text: 'Bank lending\n& deposit rates', fill: '#fef3c7', stroke: '#d97706', size: 14 },
      { type: 'box', x: 570, y: 45, w: 160, h: 66, text: 'Credit growth\n& investment', fill: '#dbeafe', stroke: '#2563eb', size: 14 },
      { type: 'box', x: 385, y: 190, w: 155, h: 66, text: 'Aggregate\ndemand', fill: '#ede9fe', stroke: '#7c3aed', size: 14 },
      { type: 'box', x: 570, y: 190, w: 160, h: 66, text: 'Inflation\n& output gap', fill: '#fee2e2', stroke: '#dc2626', size: 14 },
      { type: 'arrow', x1: 175, y1: 78, x2: 202, y2: 78 },
      { type: 'arrow', x1: 355, y1: 78, x2: 382, y2: 78 },
      { type: 'arrow', x1: 540, y1: 78, x2: 567, y2: 78 },
      { type: 'arrow', x1: 650, y1: 111, x2: 650, y2: 187, label: 'demand', lx: 683, ly: 145, labelFill: '#475569' },
      { type: 'arrow', x1: 567, y1: 223, x2: 543, y2: 223 },
      { type: 'arrow', x1: 620, y1: 190, x2: 620, y2: 115, label: 'feedback', lx: 600, ly: 145, dash: true, labelFill: '#b91c1c' },
      { type: 'text', x: 380, y: 330, text: 'Leakages: sticky deposit rates, high government borrowing, weak credit demand, bank NPAs.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 360, text: 'Inflation-targeting framework: CPI headline 4% ± 2%; MPC has six members and a casting vote for the Governor.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 390, text: 'Transmission is faster through market-linked instruments than through the base rate.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'inflation-types',
    title: 'Demand-pull vs cost-push inflation',
    paper: 'GS3',
    tag: 'Economy',
    intro: 'Two tiny AD–AS panels are worth more than a page of definitions.',
    items: [
      { type: 'text', x: 190, y: 28, text: 'Demand-pull', size: 16, weight: 800, fill: '#dc2626' },
      { type: 'text', x: 570, y: 28, text: 'Cost-push', size: 16, weight: 800, fill: '#d97706' },
      { type: 'line', x1: 70, y1: 250, x2: 340, y2: 250, stroke: '#475569', sw: 2 },
      { type: 'line', x1: 70, y1: 250, x2: 70, y2: 70, stroke: '#475569', sw: 2 },
      { type: 'text', x: 40, y: 160, text: 'P', size: 15, weight: 800, fill: '#1f2937' },
      { type: 'text', x: 205, y: 275, text: 'Y', size: 15, weight: 800, fill: '#1f2937' },
      { type: 'path', d: 'M 90 240 Q 180 200 300 90', fill: 'none', stroke: '#2563eb', sw: 3 },
      { type: 'path', d: 'M 110 100 Q 190 120 285 225', fill: 'none', stroke: '#dc2626', sw: 3 },
      { type: 'path', d: 'M 145 100 Q 225 120 320 225', fill: 'none', stroke: '#f59e0b', sw: 2.5, dash: true },
      { type: 'line', x1: 70, y1: 150, x2: 235, y2: 150, stroke: '#94a3b8', sw: 1.4, dash: true },
      { type: 'line', x1: 235, y1: 250, x2: 235, y2: 150, stroke: '#94a3b8', sw: 1.4, dash: true },
      { type: 'text', x: 55, y: 145, text: 'P₂', size: 11, fill: '#64748b' },
      { type: 'text', x: 245, y: 265, text: 'Y₂', size: 11, fill: '#64748b' },
      { type: 'text', x: 100, y: 94, text: 'AD₁', size: 13, fill: '#dc2626' },
      { type: 'text', x: 325, y: 232, text: 'AD₂', size: 13, fill: '#d97706' },
      { type: 'text', x: 308, y: 86, text: 'AS', size: 13, fill: '#2563eb' },
      { type: 'line', x1: 450, y1: 250, x2: 720, y2: 250, stroke: '#475569', sw: 2 },
      { type: 'line', x1: 450, y1: 250, x2: 450, y2: 70, stroke: '#475569', sw: 2 },
      { type: 'text', x: 420, y: 160, text: 'P', size: 15, weight: 800, fill: '#1f2937' },
      { type: 'text', x: 585, y: 275, text: 'Y', size: 15, weight: 800, fill: '#1f2937' },
      { type: 'path', d: 'M 480 105 Q 560 125 670 225', fill: 'none', stroke: '#2563eb', sw: 3 },
      { type: 'path', d: 'M 480 240 Q 580 200 690 90', fill: 'none', stroke: '#dc2626', sw: 3 },
      { type: 'path', d: 'M 455 235 Q 555 195 665 90', fill: 'none', stroke: '#f59e0b', sw: 2.5, dash: true },
      { type: 'line', x1: 450, y1: 154, x2: 557, y2: 154, stroke: '#94a3b8', sw: 1.4, dash: true },
      { type: 'line', x1: 557, y1: 250, x2: 557, y2: 154, stroke: '#94a3b8', sw: 1.4, dash: true },
      { type: 'text', x: 435, y: 149, text: 'P₂', size: 11, fill: '#64748b' },
      { type: 'text', x: 567, y: 265, text: 'Y₂', size: 11, fill: '#64748b' },
      { type: 'text', x: 678, y: 232, text: 'AD', size: 13, fill: '#2563eb' },
      { type: 'text', x: 696, y: 108, text: 'AS₁', size: 13, fill: '#dc2626' },
      { type: 'text', x: 625, y: 82, text: 'AS₂', size: 13, fill: '#d97706' },
      { type: 'text', x: 380, y: 330, text: 'Demand-pull: AD shifts right → output and prices rise; typical of loose fiscal/monetary policy.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 360, text: 'Cost-push: AS shifts left → output falls and prices rise; typical of fuel, food or wage shocks.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 390, text: 'Policy: demand-pull → tighten demand; cost-push → supply-side measures, targeted relief, avoid wage-price spiral.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'carbon-cycle',
    title: 'The carbon cycle and the human perturbation',
    paper: 'GS3',
    tag: 'Environment',
    intro: 'Show the natural fluxes, then the fossil-fuel arrow that breaks the balance.',
    items: [
      { type: 'circle', cx: 380, cy: 80, r: 70, text: 'Atmosphere\nCO₂', fill: '#e0f2fe', stroke: '#0284c7', size: 14 },
      { type: 'box', x: 70, y: 210, w: 170, h: 60, text: 'Photosynthesis\n(land + ocean)', fill: '#dcfce7', stroke: '#16a34a', size: 13.5 },
      { type: 'box', x: 520, y: 210, w: 170, h: 60, text: 'Respiration\n& decomposition', fill: '#fef3c7', stroke: '#d97706', size: 13.5 },
      { type: 'box', x: 70, y: 320, w: 170, h: 60, text: 'Fossil fuels\ncoal / oil / gas', fill: '#fecaca', stroke: '#dc2626', size: 13.5 },
      { type: 'box', x: 520, y: 320, w: 170, h: 60, text: 'Ocean sink\n+ acidification', fill: '#dbeafe', stroke: '#2563eb', size: 13.5 },
      { type: 'arrow', x1: 355, y1: 130, x2: 220, y2: 207, label: 'CO₂ uptake', lx: 255, ly: 160 },
      { type: 'arrow', x1: 240, y1: 207, x2: 370, y2: 135, label: 'release', lx: 318, ly: 185, dash: true },
      { type: 'arrow', x1: 520, y1: 210, x2: 420, y2: 135, label: 'respiration', lx: 530, ly: 145 },
      { type: 'arrow', x1: 240, y1: 350, x2: 345, y2: 130, label: 'burning', lx: 260, ly: 275, labelFill: '#b91c1c' },
      { type: 'arrow', x1: 550, y1: 318, x2: 452, y2: 135, label: 'dissolution', lx: 545, ly: 185, labelFill: '#1d4ed8' },
      { type: 'text', x: 380, y: 398, text: 'Net effect: fossil-fuel combustion moves carbon from a long-term geological store', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 418, text: 'into the atmosphere faster than sinks absorb it.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'ethical-decision',
    title: 'Ethical decision-making in a case study',
    paper: 'GS4',
    tag: 'Ethics',
    intro: 'Seven boxes that keep a GS4 answer structured under time pressure.',
    items: [
      { type: 'box', x: 30, y: 40, w: 150, h: 56, text: '1. Facts', fill: '#fef3c7', stroke: '#d97706', size: 14 },
      { type: 'box', x: 220, y: 40, w: 150, h: 56, text: '2. Stakeholders', fill: '#ffedd5', stroke: '#ea580c', size: 14 },
      { type: 'box', x: 410, y: 40, w: 150, h: 56, text: '3. Values', fill: '#fce7f3', stroke: '#db2777', size: 14 },
      { type: 'box', x: 600, y: 40, w: 130, h: 56, text: '4. Options', fill: '#ede9fe', stroke: '#7c3aed', size: 14 },
      { type: 'box', x: 600, y: 150, w: 130, h: 56, text: '5. Consequences', fill: '#e0e7ff', stroke: '#4f46e5', size: 13.5 },
      { type: 'box', x: 410, y: 150, w: 150, h: 56, text: '6. Decision', fill: '#dcfce7', stroke: '#16a34a', size: 14 },
      { type: 'box', x: 220, y: 150, w: 150, h: 56, text: '7. Review', fill: '#dbeafe', stroke: '#2563eb', size: 14 },
      { type: 'arrow', x1: 180, y1: 68, x2: 217, y2: 68 },
      { type: 'arrow', x1: 370, y1: 68, x2: 407, y2: 68 },
      { type: 'arrow', x1: 560, y1: 68, x2: 597, y2: 68 },
      { type: 'arrow', x1: 665, y1: 96, x2: 665, y2: 147 },
      { type: 'arrow', x1: 597, y1: 178, x2: 563, y2: 178 },
      { type: 'arrow', x1: 407, y1: 178, x2: 373, y2: 178 },
      { type: 'box', x: 100, y: 278, w: 560, h: 88, text: 'Name the tension: duty vs consequence,\npublic interest vs private loyalty, rule of law vs compassion.\nThen defend one course with reasons, not slogans.', fill: '#fef9c3', stroke: '#ca8a04', size: 13.5 },
      { type: 'text', x: 380, y: 400, text: 'For a case study, end with the immediate action, the institutional fix and the safeguard against recurrence.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'water-cycle',
    title: 'Water cycle: stores and fluxes',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'Use it to introduce a question on water scarcity, groundwater or irrigation.',
    items: [
      { type: 'circle', cx: 80, cy: 65, r: 35, text: 'Sun', fill: '#fef3c7', stroke: '#d97706', size: 15 },
      { type: 'path', d: 'M 40 150 L 390 150 L 390 300 L 40 300 Z', fill: '#dbeafe', stroke: '#2563eb' },
      { type: 'text', x: 215, y: 285, text: 'Ocean', size: 17, weight: 800, fill: '#1d4ed8' },
      { type: 'path', d: 'M 410 150 L 730 150 L 730 300 L 410 300 Z', fill: '#dcfce7', stroke: '#16a34a' },
      { type: 'text', x: 570, y: 285, text: 'Land', size: 17, weight: 800, fill: '#15803d' },
      { type: 'arrow', x1: 180, y1: 260, x2: 278, y2: 126, label: 'evaporation', lx: 228, ly: 200, labelFill: '#0e7490' },
      { type: 'path', d: 'M 280 90 Q 360 60 440 95 Q 520 60 600 95 Q 640 120 600 145 L 280 145 Q 240 120 280 90 Z', fill: '#f1f5f9', stroke: '#64748b' },
      { type: 'text', x: 450, y: 115, text: 'condensation / cloud', size: 13, fill: '#475569' },
      { type: 'arrow', x1: 470, y1: 148, x2: 470, y2: 215, label: 'precipitation', lx: 528, ly: 185, labelFill: '#1d4ed8' },
      { type: 'arrow', d: 'M 560 220 Q 500 270 385 292', label: 'runoff', lx: 505, ly: 252, labelFill: '#0369a1' },
      { type: 'arrow', x1: 650, y1: 240, x2: 650, y2: 288, label: 'infiltration', lx: 695, ly: 262, labelFill: '#15803d' },
      { type: 'text', x: 650, y: 318, text: 'groundwater', size: 11.5, fill: '#15803d' },
      { type: 'arrow', x1: 655, y1: 240, x2: 610, y2: 140, label: 'transpiration', lx: 690, ly: 195, labelFill: '#15803d' },
      { type: 'text', x: 380, y: 345, text: 'Stores: ocean, glaciers, groundwater, soil moisture, atmosphere.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 368, text: 'Fluxes: evaporation, transpiration, precipitation, runoff, infiltration.', size: 13, fill: '#64748b' },
      { type: 'text', x: 380, y: 391, text: 'India: the southwest monsoon delivers about 75% of annual rainfall in four months.', size: 13, fill: '#64748b' }
    ]
  },
  {
    id: 'budget-cycle',
    title: 'The Union Budget cycle',
    paper: 'GS3',
    tag: 'Economy',
    intro: 'A circular flow that answers “budget process”, “fiscal accountability” and “audit” questions.',
    items: [
      { type: 'box', x: 280, y: 25, w: 200, h: 55, text: '1. Preparation\nFinance Ministry', fill: '#dcfce7', stroke: '#16a34a', size: 13.5 },
      { type: 'box', x: 540, y: 130, w: 185, h: 55, text: '2. Approval\nParliament', fill: '#dbeafe', stroke: '#2563eb', size: 13.5 },
      { type: 'box', x: 540, y: 265, w: 185, h: 55, text: '3. Execution\nMinistries / departments', fill: '#fef3c7', stroke: '#d97706', size: 13.5 },
      { type: 'box', x: 280, y: 330, w: 200, h: 55, text: '4. Audit\nCAG', fill: '#ede9fe', stroke: '#7c3aed', size: 13.5 },
      { type: 'box', x: 35, y: 265, w: 185, h: 55, text: '5. Review\nPAC / Estimates Committee', fill: '#fce7f3', stroke: '#db2777', size: 12.5 },
      { type: 'box', x: 35, y: 130, w: 185, h: 55, text: '6. Next budget\nfeedback loop', fill: '#f1f5f9', stroke: '#64748b', size: 13.5 },
      { type: 'arrow', x1: 480, y1: 52, x2: 585, y2: 127, label: 'estimates', lx: 555, ly: 80 },
      { type: 'arrow', x1: 632, y1: 187, x2: 632, y2: 262, label: 'appropriation', lx: 690, ly: 225 },
      { type: 'arrow', x1: 537, y1: 292, x2: 483, y2: 345, label: 'accounts', lx: 535, ly: 330 },
      { type: 'arrow', x1: 277, y1: 357, x2: 223, y2: 292, label: 'audit report', lx: 220, ly: 345 },
      { type: 'arrow', x1: 127, y1: 262, x2: 127, y2: 188, label: 'recommendations', lx: 75, ly: 225 },
      { type: 'text', x: 380, y: 398, text: 'Constitutional anchors: Annual Financial Statement (Art. 112) · demands for grants (Art. 113)', size: 11.5, fill: '#64748b' },
      { type: 'text', x: 380, y: 415, text: 'Appropriation Bill (Art. 114) · finance bills (Art. 110)', size: 11.5, fill: '#64748b' }
    ]
  }
];

module.exports = { PAPER: PAPER, FIGURES: FIGURES, svg: svg, esc: esc };

// Hand-authored diagram pages that predate the FIGURES array. They live at
// figures/topic-<slug>.html (hand-made inline SVG, not the items format), so
// they carry an explicit href instead of an id the svg- page builder owns.
var EXTRA_FIGURES = [
  { href: 'topic-5g-network-technology.html', title: '5G Network', paper: 'GS3', tag: 'Economy / Infra' },
  { href: 'topic-digital-india-e-commerce.html', title: 'Digital India E-Commerce', paper: 'GS3', tag: 'Economy' },
  { href: 'topic-dowry-system-india.html', title: 'Dowry System - India', paper: 'GS1', tag: 'Society' },
  { href: 'topic-maternity-leave-india.html', title: 'Maternity Leave India', paper: 'GS1', tag: 'Society' },
  { href: 'topic-white-revolution-india-milk-production.html', title: 'White Revolution', paper: 'GS3', tag: 'Agriculture' }
];

module.exports.EXTRA_FIGURES = EXTRA_FIGURES;

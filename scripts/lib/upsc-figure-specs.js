'use strict';
// The second generation of the UPSC figure library: twenty-one label-first
// sketches that fill the gaps the original fourteen left (history, society,
// IR, public finance, agriculture, sci-tech, disaster management, ethics).
//
// The specs are written against a tiny recording renderer that emits the item
// format consumed by scripts/lib/upsc-svg-figures.js (box, arrow, path, text,
// circle, line). That keeps one visual grammar and one page builder: the
// gallery, the per-topic pages and the figures index all read FIGURES, so a
// diagram added here appears everywhere.
//
// Nothing here fetches anything, and nothing is traced from a photograph.

const PALETTE = {
  blue: { fill: '#dbeafe', stroke: '#2563eb' },
  sky: { fill: '#e0f2fe', stroke: '#0284c7' },
  red: { fill: '#fee2e2', stroke: '#dc2626' },
  amber: { fill: '#fef3c7', stroke: '#d97706' },
  green: { fill: '#dcfce7', stroke: '#16a34a' },
  violet: { fill: '#ede9fe', stroke: '#7c3aed' },
  slate: { fill: '#f1f5f9', stroke: '#64748b' },
  rose: { fill: '#ffe4e6', stroke: '#e11d48' }
};

function tone(o) {
  return PALETTE[o.tone || 'slate'] || PALETTE.slate;
}

function num(n) {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) throw new Error('non-finite coordinate: ' + n);
  return v;
}

function makeRecorder(figureId) {
  const items = [];

  function rect(x, y, w, h, o) {
    o = o || {};
    const p = tone(o);
    items.push({
      type: 'box', x: num(x), y: num(y), w: num(w), h: num(h),
      rx: o.rx === undefined ? 12 : o.rx,
      fill: o.fill || p.fill, stroke: o.stroke || p.stroke, sw: o.width || 2.2
    });
  }

  function text(x, y, lines, o) {
    o = o || {};
    const value = Array.isArray(lines) ? lines.join('\n') : String(lines == null ? '' : lines);
    if (!value) return;
    items.push({
      type: 'text', x: num(x), y: num(y), text: value,
      size: o.size || 15, weight: o.weight || 650,
      fill: o.color || '#1f2937', anchor: o.anchor || 'middle'
    });
  }

  function box(x, y, w, h, lines, o) {
    o = o || {};
    rect(x, y, w, h, o);
    text(x + w / 2, y + h / 2, lines, {
      size: o.size || 15, weight: o.weight || 650, color: o.color
    });
  }

  function circle(cx, cy, r, lines, o) {
    o = o || {};
    const p = tone(o);
    const item = {
      type: 'circle', cx: num(cx), cy: num(cy), r: num(r),
      fill: o.fill || p.fill, stroke: o.stroke || p.stroke, sw: o.width || 2.2
    };
    if (lines && lines.length) item.text = Array.isArray(lines) ? lines.join('\n') : String(lines);
    items.push(item);
  }

  function line(x1, y1, x2, y2, o) {
    o = o || {};
    items.push({
      type: 'line', x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2),
      stroke: o.stroke || '#94a3b8', sw: o.width || 2, dash: !!o.dash
    });
  }

  function curve(d, o) {
    o = o || {};
    if (o.marker) throw new Error(figureId + ': the shared renderer cannot put a marker on a path');
    items.push({
      type: 'path', d: d, fill: o.fill || 'none', stroke: o.stroke || '#475569',
      sw: o.width || 2.2, dash: !!o.dash
    });
  }

  function arrow(pts, o) {
    o = o || {};
    if (!Array.isArray(pts) || pts.length !== 2) {
      throw new Error(figureId + ': arrows must be straight, two-point segments');
    }
    const item = {
      type: 'arrow', x1: num(pts[0][0]), y1: num(pts[0][1]),
      x2: num(pts[1][0]), y2: num(pts[1][1]),
      color: o.stroke || '#475569', sw: o.width || 2.2, dash: !!o.dash
    };
    if (o.label) {
      item.label = o.label;
      item.lx = o.labelAt ? num(o.labelAt[0]) : num((pts[0][0] + pts[1][0]) / 2);
      item.ly = o.labelAt ? num(o.labelAt[1]) : num((pts[0][1] + pts[1][1]) / 2 - 9);
      item.size = o.labelSize || 12;
      item.labelFill = o.labelColor || '#334155';
    }
    items.push(item);
  }

  function note(x, y, value, o) {
    text(x, y, value, o);
  }

  return {
    items: items, rect: rect, box: box, circle: circle, line: line,
    curve: curve, arrow: arrow, note: note, text: text
  };
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

const SPECS = [
  // ------------------------------------------------------------------ GS1
  {
    id: 'river-profile',
    paper: 'GS1',
    tag: 'Geography',
    title: 'River long profile: youthful, graded and rejuvenated',
    intro: 'Two curves on one set of axes. The Himalayan river is still cutting down; the peninsular river is already graded.',
    draw: function (r) {
      r.rect(50, 45, 660, 278, { fill: '#ffffff', stroke: '#e2e8f0', rx: 10 });
      r.line(70, 326, 700, 326, { stroke: '#94a3b8', width: 2 });
      r.line(70, 326, 70, 58, { stroke: '#94a3b8', width: 2 });
      r.note(700, 348, 'distance from source', { anchor: 'end', size: 12, color: '#64748b' });
      r.note(78, 54, 'elevation', { size: 12, color: '#64748b' });

      r.curve('M 80 78 C 140 92 180 160 240 210 C 330 272 480 300 690 318',
        { stroke: '#2563eb', width: 3.2 });
      r.curve('M 80 170 C 220 240 400 292 690 318', { stroke: '#16a34a', width: 3.2 });

      r.circle(240, 210, 7, [], { fill: '#dc2626', stroke: '#dc2626', width: 1 });
      r.note(250, 200, 'knick point / waterfall', { size: 12, color: '#b91c1c' });

      r.note(100, 132, 'gorge', { size: 12, color: '#1d4ed8' });
      r.note(470, 284, 'meander belt', { size: 12, color: '#334155' });
      r.note(660, 310, 'delta', { anchor: 'end', size: 12, color: '#334155' });

      r.line(470, 70, 500, 70, { stroke: '#2563eb', width: 3.2 });
      r.note(508, 75, 'Himalayan (youthful)', { size: 12.5 });
      r.line(470, 94, 500, 94, { stroke: '#16a34a', width: 3.2 });
      r.note(508, 99, 'Peninsular (graded)', { size: 12.5 });

      r.note(50, 364, 'Himalayan: antecedent drainage, deep gorges, high sediment load, braided plain.', { size: 12.5 });
      r.note(50, 388, 'Peninsular: superimposed drainage, graded profile, broad valleys, delta at the mouth.', { size: 12.5 });
      r.note(50, 412, 'Rejuvenation: a fall in base level re-steepens the lower course and cuts river terraces.', { size: 11.5, color: '#64748b' });
    }
  },
  {
    id: 'ocean-currents',
    paper: 'GS1',
    tag: 'Geography',
    title: 'Ocean gyre, Coriolis deflection and upwelling',
    intro: 'One basin explains currents, fisheries and climate: wind pushes water, Coriolis bends it, and the eastern edge wells up.',
    draw: function (r) {
      r.rect(50, 70, 430, 260, { fill: '#e0f2fe', stroke: '#7dd3fc', rx: 12 });
      r.note(50, 50, 'Northern basin: the gyre turns clockwise', { size: 13, color: '#0369a1' });

      r.arrow([[80, 96], [220, 96]], { stroke: '#0284c7', label: 'NE trades', labelAt: [150, 86] });
      r.arrow([[300, 96], [440, 96]], { stroke: '#0284c7', label: 'westerlies', labelAt: [370, 86] });

      r.arrow([[115, 125], [400, 125]], { stroke: '#2563eb' });
      r.arrow([[415, 140], [415, 255]], { stroke: '#2563eb' });
      r.arrow([[395, 285], [115, 285]], { stroke: '#2563eb' });
      r.arrow([[95, 265], [95, 145]], { stroke: '#2563eb' });

      r.note(258, 118, 'equatorial current', { size: 11.5, color: '#1e40af' });
      r.note(405, 195, 'warm, fast', { anchor: 'end', size: 11.5, color: '#1e40af' });
      r.note(108, 195, 'cold, slow', { size: 11.5, color: '#1e40af' });

      r.arrow([[62, 262], [62, 150]], { stroke: '#dc2626', dash: true });
      r.note(108, 248, 'upwelling: nutrients rise', { size: 11, color: '#b91c1c' });

      r.box(500, 78, 230, 62, ['Western boundary', 'warm, narrow, fast', 'Gulf Stream, Kuroshio'], { tone: 'red', size: 12.5 });
      r.box(500, 150, 230, 62, ['Eastern boundary', 'cold, broad, slow', 'Canary, California, Peru'], { tone: 'sky', size: 12.5 });
      r.box(500, 222, 230, 62, ['Coriolis effect', 'right in N, left in S', 'sets the gyre direction'], { tone: 'violet', size: 12.5 });
      r.box(500, 294, 230, 56, ['Thermohaline conveyor', 'density-driven, global, slow'], { tone: 'slate', size: 12.5 });

      r.note(50, 362, 'Upwelling: offshore winds push surface water away, cold nutrient-rich water rises.', { size: 12.5 });
      r.note(50, 384, 'That is why Peru and Benguela carry huge fisheries and why El Nino shuts them down.', { size: 12.5 });
      r.note(50, 406, 'Boundary currents: western = warm and narrow, eastern = cold and broad.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'demographic-transition',
    paper: 'GS1',
    tag: 'Society',
    title: 'Demographic transition: five stages',
    intro: 'Death rates fall before birth rates. The gap between the two curves is the population explosion.',
    draw: function (r) {
      for (let i = 0; i < 5; i++) {
        r.rect(70 + i * 126, 70, 126, 240, { fill: i % 2 ? '#ffffff' : '#f8fafc', stroke: '#e2e8f0', rx: 0, width: 1.4 });
      }
      r.line(70, 310, 700, 310, { stroke: '#94a3b8', width: 2 });
      r.line(70, 310, 70, 70, { stroke: '#94a3b8', width: 2 });
      r.note(700, 330, 'time', { anchor: 'end', size: 12, color: '#64748b' });

      r.curve('M 133 100 L 259 112 L 385 170 L 511 250 L 637 290', { stroke: '#dc2626', width: 3.4 });
      r.curve('M 133 100 L 259 215 L 385 272 L 511 292 L 637 286', { stroke: '#2563eb', width: 3.4 });

      r.line(430, 52, 460, 52, { stroke: '#dc2626', width: 3.2 });
      r.note(468, 57, 'birth rate', { size: 12 });
      r.line(560, 52, 590, 52, { stroke: '#2563eb', width: 3.2 });
      r.note(598, 57, 'death rate', { size: 12 });

      const stages = [
        ['I', 'high stationary'], ['II', 'early expanding'], ['III', 'late expanding'],
        ['IV', 'low stationary'], ['V', 'declining']
      ];
      stages.forEach(function (s, i) {
        const cx = 133 + i * 126;
        r.note(cx, 332, s[0], { anchor: 'middle', size: 13, weight: 800, color: '#334155' });
        r.note(cx, 350, s[1], { anchor: 'middle', size: 10.5, color: '#64748b' });
      });

      r.line(470, 78, 470, 305, { stroke: '#d97706', width: 1.8, dash: true });
      r.note(478, 84, 'India today', { size: 11.5, color: '#b45309' });

      r.note(50, 382, 'Falling death rates come first; the lagging birth rate is what produces the population explosion.', { size: 12.5 });
      r.note(50, 404, 'Stage V: births fall below deaths, so the pyramid turns into an urn and the workforce shrinks.', { size: 12.5 });
    }
  },
  {
    id: 'temple-styles',
    paper: 'GS1',
    tag: 'Art & Culture',
    title: 'Nagara, Dravida and Vesara: three temple grammars',
    intro: 'Three silhouettes carry the whole art-and-culture answer: curvilinear tower, stepped vimana with a gateway, and the Deccan hybrid.',
    draw: function (r) {
      r.note(145, 34, 'Nagara · North', { anchor: 'middle', size: 14, weight: 800, color: '#92400e' });
      r.note(380, 34, 'Dravida · South', { anchor: 'middle', size: 14, weight: 800, color: '#5b21b6' });
      r.note(625, 34, 'Vesara · Deccan', { anchor: 'middle', size: 14, weight: 800, color: '#9f1239' });

      // Nagara
      r.rect(70, 300, 150, 22, { tone: 'amber', rx: 4 });
      r.rect(95, 252, 100, 48, { tone: 'amber' });
      r.note(145, 280, 'mandapa', { anchor: 'middle', size: 11.5 });
      r.curve('M 113 252 C 121 196 133 146 145 104 C 157 146 169 196 177 252 Z',
        { fill: '#fde68a', stroke: '#d97706', width: 2.2 });
      r.note(145, 230, 'shikhara', { anchor: 'middle', size: 11 });
      r.circle(145, 94, 13, [], { tone: 'amber' });
      r.curve('M 145 81 L 138 66 L 152 66 Z', { fill: '#d97706', stroke: '#d97706', width: 1 });
      r.line(160, 94, 196, 86, { stroke: '#d97706', width: 1.6 });
      r.note(200, 90, 'amalaka', { size: 11 });
      r.line(152, 68, 190, 58, { stroke: '#d97706', width: 1.6 });
      r.note(194, 62, 'kalasha', { size: 11 });
      r.note(145, 346, 'curvilinear tower, no gopuram', { anchor: 'middle', size: 10.5, color: '#92400e' });

      // Dravida
      r.line(262, 320, 498, 320, { stroke: '#7c3aed', width: 2.2 });
      r.rect(270, 288, 56, 30, { tone: 'violet', rx: 3 });
      r.rect(275, 260, 46, 28, { tone: 'violet', rx: 3 });
      r.rect(280, 232, 36, 28, { tone: 'violet', rx: 3 });
      r.rect(285, 204, 26, 28, { tone: 'violet', rx: 3 });
      r.rect(290, 178, 16, 26, { tone: 'violet', rx: 3 });
      r.note(298, 168, 'gopuram', { anchor: 'middle', size: 11.5, color: '#5b21b6' });
      r.rect(366, 292, 64, 26, { tone: 'violet', rx: 3 });
      r.rect(374, 266, 48, 26, { tone: 'violet', rx: 3 });
      r.rect(382, 240, 32, 26, { tone: 'violet', rx: 3 });
      r.circle(398, 232, 9, [], { tone: 'violet' });
      r.note(420, 224, 'vimana', { size: 11.5, color: '#5b21b6' });
      r.note(398, 346, 'stepped vimana + gateway gopuram', { anchor: 'middle', size: 10.5, color: '#5b21b6' });

      // Vesara
      r.rect(566, 292, 118, 24, { tone: 'rose', rx: 4 });
      r.rect(582, 266, 86, 26, { tone: 'rose', rx: 4 });
      r.curve('M 592 266 C 600 220 616 190 625 160 C 634 190 650 220 658 266 Z',
        { fill: '#ffe4e6', stroke: '#e11d48', width: 2.2 });
      r.note(625, 216, 'hybrid shikhara', { anchor: 'middle', size: 11, color: '#9f1239' });
      r.circle(600, 292, 6, [], { tone: 'rose' });
      r.circle(650, 292, 6, [], { tone: 'rose' });
      r.note(625, 336, 'lathe-turned pillars', { anchor: 'middle', size: 10.5, color: '#9f1239' });
      r.note(625, 350, 'star plan (Hoysala)', { anchor: 'middle', size: 10.5, color: '#9f1239' });

      r.note(50, 386, 'Nagara: curvilinear shikhara on a square sanctum. Dravida: stepped vimana inside a walled court.', { size: 12.5 });
      r.note(50, 408, 'Vesara: Deccan blend at Badami, Pattadakal, Belur and Halebidu.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'national-movement',
    paper: 'GS1',
    tag: 'History',
    title: 'The national movement: six hinges',
    intro: 'Read the timeline as a change of method, from petition to mass action, not as a list of dates.',
    draw: function (r) {
      r.line(60, 170, 712, 170, { stroke: '#cbd5e1', width: 3 });
      const nodes = [
        { x: 105, year: '1885', a: 'INC founded', b: 'Bombay', up: true },
        { x: 225, year: '1905', a: 'Partition of Bengal', b: 'Swadeshi boycott', up: false },
        { x: 345, year: '1919', a: 'Rowlatt Satyagraha', b: 'Punjab wrongs', up: true },
        { x: 465, year: '1930', a: 'Dandi March', b: 'Civil disobedience', up: false },
        { x: 585, year: '1942', a: 'Quit India', b: 'mass upsurge', up: true },
        { x: 690, year: '1947', a: 'Independence', b: 'Partition', up: false }
      ];
      nodes.forEach(function (n) {
        r.circle(n.x, 170, 8, [], { tone: 'blue' });
        r.note(n.x, n.up ? 142 : 200, n.year, { anchor: 'middle', size: 14, weight: 800, color: '#1d4ed8' });
        r.note(n.x, n.up ? 122 : 220, n.a, { anchor: 'middle', size: 11.5 });
        r.note(n.x, n.up ? 106 : 236, n.b, { anchor: 'middle', size: 10.5, color: '#64748b' });
      });

      r.box(60, 276, 200, 62, ['Moderate 1885-1905', 'petitions, council entry'], { tone: 'slate', size: 12.5 });
      r.box(280, 276, 200, 62, ['Extremist 1905-1919', 'boycott, swadeshi, Tilak'], { tone: 'amber', size: 12.5 });
      r.box(500, 276, 210, 62, ['Gandhian 1919-1947', 'mass satyagraha'], { tone: 'green', size: 12.5 });

      r.note(50, 372, 'Each hinge widens the base of the movement: elite petition, then urban boycott, then peasant and worker mass action.', { size: 12.5 });
      r.note(50, 396, 'Pair every date with a method and a consequence; that is what the answer is marked for.', { size: 12.5 });
      r.note(50, 418, '1942 is the last mass hinge; 1947 is the transfer of power, not a movement stage.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'urban-hierarchy',
    paper: 'GS1',
    tag: 'Society',
    title: 'Settlement hierarchy and the rural-urban continuum',
    intro: 'Hierarchy is about functions, not only population: a town sells services a village cannot.',
    draw: function (r) {
      const rows = [
        ['Megacity', 60, 92], ['Metropolis', 105, 130], ['City', 150, 168],
        ['Town', 195, 206], ['Village', 240, 244], ['Hamlet', 285, 282]
      ];
      rows.forEach(function (row, i) {
        const w = row[1];
        const y = row[2];
        r.rect(240 - w / 2, y, w, 30, { tone: i < 2 ? 'violet' : i < 4 ? 'blue' : 'green', rx: 8 });
        r.note(240, y + 20, row[0], { anchor: 'middle', size: 11.5 });
      });
      r.arrow([[70, 300], [70, 96]], { stroke: '#94a3b8', dash: true });
      r.note(80, 86, 'more functions, higher threshold', { size: 11, color: '#64748b' });

      r.box(420, 80, 310, 62, ['Primate city', 'one city dwarfs the urban system', 'Bangkok, Jakarta, Seoul'], { tone: 'rose', size: 12.5 });
      r.box(420, 150, 310, 62, ['Christaller central place', 'hexagonal market areas, k = 3, 4, 7'], { tone: 'slate', size: 12.5 });
      r.box(420, 220, 310, 62, ['Census town', '5,000+, 75% male non-farm, 400/km2'], { tone: 'sky', size: 12.5 });
      r.box(420, 290, 310, 58, ['Rurban / peri-urban', 'the city spills into villages'], { tone: 'green', size: 12.5 });

      r.note(50, 372, 'The continuum runs hamlet, village, town, city, metropolis, megacity; each step adds range and threshold.', { size: 12.5 });
      r.note(50, 396, 'India\'s census towns are villages that crossed the statutory line but still look rural on the ground.', { size: 12.5 });
    }
  },

  // ------------------------------------------------------------------ GS2
  {
    id: 'writs',
    paper: 'GS2',
    tag: 'Polity',
    title: 'The five writs: what each one commands',
    intro: 'One centre, five remedies. In the exam, name the writ, then name who it runs against.',
    draw: function (r) {
      r.circle(380, 208, 70, ['Five writs', 'Art. 32 and 226'], { tone: 'violet', size: 14 });

      r.box(280, 26, 200, 56, ['Habeas Corpus', 'produce the detained person'], { tone: 'blue', size: 12.5 });
      r.box(548, 132, 190, 56, ['Mandamus', 'compel a public duty'], { tone: 'green', size: 12.5 });
      r.box(430, 342, 190, 56, ['Certiorari', 'quash a lower order'], { tone: 'amber', size: 12.5 });
      r.box(140, 342, 190, 56, ['Prohibition', 'stop a lower court'], { tone: 'sky', size: 12.5 });
      r.box(22, 132, 190, 56, ['Quo Warranto', 'test the right to an office'], { tone: 'rose', size: 12.5 });

      r.arrow([[380, 138], [380, 82]], { stroke: '#7c3aed' });
      r.arrow([[440, 160], [548, 160]], { stroke: '#7c3aed' });
      r.arrow([[428, 250], [500, 342]], { stroke: '#7c3aed' });
      r.arrow([[332, 250], [260, 342]], { stroke: '#7c3aed' });
      r.arrow([[320, 160], [212, 160]], { stroke: '#7c3aed' });

      r.note(380, 412, 'Art. 32 is itself a fundamental right; Art. 226 is wider but discretionary.', { anchor: 'middle', size: 12, color: '#5b21b6' });
    }
  },
  {
    id: 'panchayati-raj',
    paper: 'GS2',
    tag: 'Governance',
    title: '73rd and 74th Amendments: the third tier',
    intro: 'Three tiers, two schedules, two commissions. This is the skeleton for every local-government answer.',
    draw: function (r) {
      r.box(280, 70, 200, 58, ['Zilla Parishad', 'district'], { tone: 'violet', size: 13 });
      r.box(280, 160, 200, 58, ['Panchayat Samiti', 'block / taluk'], { tone: 'blue', size: 13 });
      r.box(280, 250, 200, 58, ['Gram Panchayat', 'village'], { tone: 'green', size: 13 });
      r.box(50, 250, 190, 58, ['Gram Sabha', 'all registered voters'], { tone: 'slate', size: 12.5 });

      r.arrow([[380, 160], [380, 128]], { stroke: '#475569' });
      r.arrow([[380, 128], [380, 160]], { stroke: '#475569' });
      r.arrow([[380, 250], [380, 218]], { stroke: '#475569' });
      r.arrow([[380, 218], [380, 250]], { stroke: '#475569' });
      r.arrow([[240, 279], [280, 279]], { stroke: '#475569' });

      r.box(510, 64, 220, 66, ['11th Schedule (73rd)', '29 subjects'], { tone: 'amber', size: 12.5 });
      r.box(510, 144, 220, 66, ['12th Schedule (74th)', '18 subjects'], { tone: 'amber', size: 12.5 });
      r.box(510, 224, 220, 56, ['State Election Commission', 'conducts local polls'], { tone: 'sky', size: 12.5 });
      r.box(510, 294, 220, 56, ['State Finance Commission', 'every five years'], { tone: 'sky', size: 12.5 });

      r.note(50, 372, '73rd: three tiers, five-year term, one-third seats for women, SC/ST reservation, Gram Sabha base.', { size: 12.5 });
      r.note(50, 396, '74th: Nagar Panchayat, Municipal Council, Municipal Corporation; District Planning Committee.', { size: 12.5 });
      r.note(50, 418, 'The gap to remember: functions are listed, but funds and functionaries are still contested.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'constitutional-bodies',
    paper: 'GS2',
    tag: 'Polity',
    title: 'Constitutional, statutory and executive bodies',
    intro: 'The source of a body decides its tenure, its removal procedure and how seriously a report can bite.',
    draw: function (r) {
      const cols = [
        { x: 40, title: 'Constitutional', tone: 'blue', items: ['Election Commission', 'Comptroller and Auditor General', 'UPSC', 'Finance Commission', 'Attorney General', 'NCSC, NCST and NCBC', 'Special Officer for Linguistic Minorities'] },
        { x: 275, title: 'Statutory', tone: 'green', items: ['NHRC', 'NGT', 'Central Information Commission', 'Lokpal', 'National Commission for Women', 'NCPCR', 'CBI (DSPE Act, 1946)'] },
        { x: 510, title: 'Executive', tone: 'amber', items: ['NITI Aayog', 'NDMA', 'National Integration Council', 'Cabinet Committees', 'Zonal Councils'] }
      ];
      cols.forEach(function (col) {
        r.box(col.x, 60, 210, 46, [col.title], { tone: col.tone, size: 13.5 });
        col.items.forEach(function (item, i) {
          const y = 128 + i * 30;
          r.circle(col.x + 12, y - 4, 3.4, [], { fill: '#94a3b8', stroke: '#94a3b8', width: 1 });
          r.note(col.x + 24, y, item, { size: 11.5 });
        });
      });

      r.note(50, 356, 'Constitutional bodies draw power from the Constitution itself; statutory from an Act; executive from a resolution.', { size: 12.5 });
      r.note(50, 378, 'The CAG and the ECI have removal procedures close to a judge\'s, because their tenure is entrenched.', { size: 12.5 });
      r.note(50, 400, 'CBI is statutory, not constitutional, and its superintendence sits with the DoPT.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'foreign-policy',
    paper: 'GS2',
    tag: 'International Relations',
    title: 'From NAM to multi-alignment',
    intro: 'The continuity is strategic autonomy; what changed is the number of partners India is willing to align with, issue by issue.',
    draw: function (r) {
      r.line(60, 158, 712, 158, { stroke: '#cbd5e1', width: 3 });
      const nodes = [
        { x: 105, year: '1961', a: 'NAM founded', b: 'Belgrade', up: true },
        { x: 250, year: '1971', a: 'Indo-Soviet treaty', b: 'Bangladesh war', up: false },
        { x: 395, year: '1991', a: 'Liberalisation', b: 'Look East begins', up: true },
        { x: 540, year: '1998', a: 'Pokhran-II', b: 'nuclear tests', up: false },
        { x: 685, year: '2014+', a: 'Multi-alignment', b: 'issue-based partners', up: true }
      ];
      nodes.forEach(function (n) {
        r.circle(n.x, 158, 8, [], { tone: 'violet' });
        r.note(n.x, n.up ? 130 : 188, n.year, { anchor: 'middle', size: 14, weight: 800, color: '#6d28d9' });
        r.note(n.x, n.up ? 110 : 208, n.a, { anchor: 'middle', size: 11.5 });
        r.note(n.x, n.up ? 94 : 224, n.b, { anchor: 'middle', size: 10.5, color: '#64748b' });
      });

      const pillars = ['Neighbourhood First', 'Act East', 'Link West', 'Indo-Pacific', 'Global South'];
      pillars.forEach(function (p, i) {
        r.box(50 + i * 136, 268, 126, 56, [p], { tone: 'violet', size: 11.5 });
      });

      r.note(50, 356, 'Strategic autonomy means issue-based coalitions, not bloc membership: Quad, BRICS, SCO and G20 at once.', { size: 12.5 });
      r.note(50, 380, 'Institutions matter more than declarations: agreements, exercises, connectivity projects and votes at the UN.', { size: 12.5 });
      r.note(50, 404, 'The exam trap is to treat non-alignment as isolation; it was a bargaining position, not a withdrawal.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'un-organs',
    paper: 'GS2',
    tag: 'International Relations',
    title: 'UN principal organs and the Indian stake',
    intro: 'Six organs, one veto. Reform answers should name the organ, the defect and India\'s specific claim.',
    draw: function (r) {
      r.box(50, 64, 200, 74, ['General Assembly', '193 members, one vote'], { tone: 'blue', size: 12.5 });
      r.box(280, 64, 200, 74, ['Security Council', '15 members, P5 veto'], { tone: 'rose', size: 12.5 });
      r.box(510, 64, 200, 74, ['ECOSOC', '54 members, coordination'], { tone: 'green', size: 12.5 });
      r.box(50, 164, 200, 74, ['Trusteeship Council', 'suspended since 1994'], { tone: 'slate', size: 12.5 });
      r.box(280, 164, 200, 74, ['International Court', 'of Justice, 15 judges'], { tone: 'violet', size: 12.5 });
      r.box(510, 164, 200, 74, ['Secretariat', 'Secretary-General'], { tone: 'amber', size: 12.5 });

      r.box(50, 258, 660, 58, ['India: G4 claim for a permanent UNSC seat, with Brazil, Germany and Japan',
        'top troop contributor to peacekeeping; reform of working methods'], { tone: 'amber', size: 12.5 });

      r.note(50, 350, 'The defect is structural: the 1945 settlement does not represent Africa, Latin America or South Asia.', { size: 12.5 });
      r.note(50, 374, 'Reform asks: categories of membership, the veto, regional representation and working methods.', { size: 12.5 });
      r.note(50, 398, 'India has served several elected terms; the demand is for a permanent seat, not a turn at the table.', { size: 12, color: '#64748b' });
    }
  },

  // ------------------------------------------------------------------ GS3
  {
    id: 'circular-flow',
    paper: 'GS3',
    tag: 'Economy',
    title: 'Circular flow: two sectors, then four',
    intro: 'Draw households and firms first, then bolt on government, the financial market and the rest of the world.',
    draw: function (r) {
      r.box(70, 172, 150, 78, ['Firms', 'produce output'], { tone: 'blue', size: 13 });
      r.box(540, 172, 150, 78, ['Households', 'own the factors'], { tone: 'green', size: 13 });
      r.box(305, 52, 150, 62, ['Government', 'taxes, spending'], { tone: 'amber', size: 12.5 });
      r.box(305, 178, 150, 62, ['Financial market', 'savings, investment'], { tone: 'violet', size: 12.5 });
      r.box(305, 302, 150, 62, ['Rest of world', 'exports, imports'], { tone: 'sky', size: 12.5 });

      r.arrow([[520, 140], [240, 140]], { stroke: '#16a34a', label: 'factor services', labelAt: [380, 130] });
      r.arrow([[240, 284], [520, 284]], { stroke: '#2563eb', label: 'goods and services', labelAt: [380, 274] });

      r.arrow([[145, 172], [305, 110]], { stroke: '#d97706', dash: true });
      r.arrow([[455, 110], [615, 172]], { stroke: '#d97706', dash: true });
      r.arrow([[145, 250], [305, 210]], { stroke: '#7c3aed', dash: true });
      r.arrow([[455, 210], [615, 250]], { stroke: '#7c3aed', dash: true });
      r.arrow([[430, 240], [430, 302]], { stroke: '#0284c7', dash: true });

      r.note(50, 388, 'Leakages: savings, taxes, imports. Injections: investment, government spending, exports.', { size: 12.5 });
      r.note(50, 412, 'The budget and the trade balance are two ways of opening the same two-sector loop.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'laf-corridor',
    paper: 'GS3',
    tag: 'Economy',
    title: 'The liquidity adjustment corridor',
    intro: 'The corridor is the single picture that explains repo, SDF, MSF, CRR and OMO in one answer.',
    draw: function (r) {
      r.rect(150, 96, 400, 214, { fill: '#ecfdf5', stroke: '#a7f3d0', rx: 6 });
      r.line(150, 70, 150, 330, { stroke: '#94a3b8', width: 2 });
      r.note(140, 64, 'policy rate', { anchor: 'end', size: 11.5, color: '#64748b' });

      r.line(150, 96, 550, 96, { stroke: '#dc2626', width: 3 });
      r.line(150, 130, 550, 130, { stroke: '#f59e0b', width: 2, dash: true });
      r.line(150, 205, 550, 205, { stroke: '#2563eb', width: 3.4 });
      r.line(150, 310, 550, 310, { stroke: '#16a34a', width: 3 });

      r.note(560, 101, 'MSF (ceiling)', { size: 12, color: '#b91c1c' });
      r.note(560, 135, 'Bank rate (penal)', { size: 12, color: '#b45309' });
      r.note(560, 210, 'Repo (policy rate)', { size: 12, color: '#1d4ed8' });
      r.note(560, 315, 'SDF (floor)', { size: 12, color: '#15803d' });

      r.note(560, 250, 'Corridor width', { size: 11.5, color: '#334155' });
      r.note(560, 268, 'signals the stance', { size: 11.5, color: '#334155' });

      r.box(40, 350, 220, 56, ['CRR and SLR', 'set the reserve base'], { tone: 'slate', size: 12 });
      r.box(280, 350, 220, 56, ['OMO and VRR', 'manage durable liquidity'], { tone: 'slate', size: 12 });
      r.box(520, 350, 210, 56, ['Call money rate', 'stays inside the corridor'], { tone: 'slate', size: 12 });

      r.note(50, 338, 'Since 2022 the SDF is the floor and the MSF the ceiling; from 2025 the reverse repo auction is retired.', { size: 11, color: '#475569' });
    }
  },
  {
    id: 'bop',
    paper: 'GS3',
    tag: 'Economy',
    title: 'Balance of payments: four blocks',
    intro: 'A current account deficit is not a crisis by itself; the question is always what finances it.',
    draw: function (r) {
      r.box(50, 66, 300, 152, [], { tone: 'blue', rx: 14 });
      r.note(70, 92, 'Current account', { size: 13.5, weight: 800, color: '#1d4ed8' });
      r.note(70, 120, 'goods: the trade balance', { size: 12 });
      r.note(70, 144, 'services: IT, travel, transport', { size: 12 });
      r.note(70, 168, 'primary income: interest, dividends', { size: 12 });
      r.note(70, 192, 'secondary income: remittances', { size: 12 });

      r.box(410, 66, 300, 152, [], { tone: 'green', rx: 14 });
      r.note(430, 92, 'Capital and financial account', { size: 13.5, weight: 800, color: '#15803d' });
      r.note(430, 120, 'FDI: stable, long horizon', { size: 12 });
      r.note(430, 144, 'FPI: volatile, sentiment-driven', { size: 12 });
      r.note(430, 168, 'external commercial borrowings', { size: 12 });
      r.note(430, 192, 'NRI deposits, banking capital', { size: 12 });

      r.box(50, 244, 300, 56, ['Errors and omissions', 'statistical discrepancy'], { tone: 'slate', size: 12.5 });
      r.box(410, 244, 300, 56, ['Reserves', 'RBI holdings, SDR, gold'], { tone: 'amber', size: 12.5 });

      r.arrow([[350, 272], [410, 272]], { stroke: '#475569', dash: true });

      r.note(50, 334, 'Identity: current account + capital account + errors = change in reserves.', { size: 12.5 });
      r.note(50, 358, 'A deficit is financed by inflows; if inflows stop, reserves absorb the gap and the rupee weakens.', { size: 12.5 });
      r.note(50, 382, 'India\'s cushion: services exports and remittances soften a goods deficit.', { size: 12.5 });
      r.note(50, 406, 'Watch the composition, not only the size: FDI is safer than short-term portfolio money.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'gst-chain',
    paper: 'GS3',
    tag: 'Economy',
    title: 'GST chain: tax at each stage, credit at the next',
    intro: 'The invoice is the unit of the whole system: without it there is no credit, and the cascade returns.',
    draw: function (r) {
      r.box(40, 150, 150, 84, ['Manufacturer', 'value 100', 'tax 18'], { tone: 'blue', size: 12.5 });
      r.box(210, 150, 150, 84, ['Wholesaler', 'value 150', 'tax 27 less 18'], { tone: 'sky', size: 12.5 });
      r.box(380, 150, 150, 84, ['Retailer', 'value 200', 'tax 36 less 27'], { tone: 'green', size: 12.5 });
      r.box(550, 150, 150, 84, ['Consumer', 'pays 236', 'no credit'], { tone: 'amber', size: 12.5 });

      r.arrow([[190, 192], [210, 192]], { stroke: '#475569' });
      r.arrow([[360, 192], [380, 192]], { stroke: '#475569' });
      r.arrow([[530, 192], [550, 192]], { stroke: '#475569' });

      r.note(50, 74, 'GST Council (Art. 279A): Centre plus States, weighted voting.', { size: 12.5 });
      r.note(50, 98, 'CGST + SGST for intra-state supply; IGST for inter-state, settled to the destination state.', { size: 12.5 });
      r.note(50, 122, 'Destination-based, value-added, one tax per stage.', { size: 12.5 });

      r.box(40, 268, 320, 62, ['Input tax credit', 'tax on inputs is set off against tax on output'], { tone: 'violet', size: 12 });
      r.box(390, 268, 310, 62, ['Total tax = 18 + 9 + 9 = 36', 'that is 18% of the final value of 200'], { tone: 'slate', size: 12 });

      r.note(50, 366, 'The cascade disappears because each seller pays only on the value it added.', { size: 12.5 });
      r.note(50, 390, 'Exclusions and rate slabs are where the argument lives: petroleum, alcohol, electricity duty.', { size: 12.5 });
      r.note(50, 412, 'Composition scheme: small firms pay a flat rate and give up credit.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'cropping-seasons',
    paper: 'GS3',
    tag: 'Agriculture',
    title: 'Kharif, rabi, zaid and the MSP chain',
    intro: 'Two pictures in one card: the crop calendar, and the six-step machinery that turns a recommendation into a procurement.',
    draw: function (r) {
      r.box(50, 56, 200, 58, ['Kharif', 'sown Jun-Jul, harvest Oct'], { tone: 'green', size: 12.5 });
      r.box(270, 56, 200, 58, ['Rabi', 'sown Oct-Nov, harvest Mar-Apr'], { tone: 'sky', size: 12.5 });
      r.box(490, 56, 200, 58, ['Zaid', 'Mar-Jun, short duration'], { tone: 'amber', size: 12.5 });

      r.box(40, 168, 170, 64, ['CACP', 'recommends the MSP'], { tone: 'slate', size: 12 });
      r.box(250, 168, 170, 64, ['CCEA', 'approves the price'], { tone: 'slate', size: 12 });
      r.box(460, 168, 170, 64, ['Announcement', 'before the sowing season'], { tone: 'blue', size: 12 });
      r.box(460, 268, 170, 64, ['Procurement', 'FCI, NAFED, CCI'], { tone: 'green', size: 12 });
      r.box(250, 268, 170, 64, ['Buffer stock', 'and the PDS'], { tone: 'amber', size: 12 });
      r.box(40, 268, 170, 64, ['Disposal', 'OMSS, exports, aid'], { tone: 'violet', size: 12 });

      r.arrow([[210, 200], [250, 200]], { stroke: '#475569' });
      r.arrow([[420, 200], [460, 200]], { stroke: '#475569' });
      r.arrow([[545, 232], [545, 268]], { stroke: '#475569' });
      r.arrow([[460, 300], [420, 300]], { stroke: '#475569' });
      r.arrow([[250, 300], [210, 300]], { stroke: '#475569' });

      r.note(50, 368, 'MSP is a price floor, not a purchase guarantee for every crop; procurement is concentrated in wheat and paddy.', { size: 12.5 });
      r.note(50, 392, 'The chain explains the farmer\'s real complaint: the announcement is national, the mandi is local.', { size: 12.5 });
      r.note(50, 414, 'Zaid crops bridge the gap between rabi harvest and kharif sowing: watermelon, cucumber, fodder.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'disaster-cycle',
    paper: 'GS3',
    tag: 'Disaster Management',
    title: 'The disaster management cycle',
    intro: 'Pre-event work saves money; post-event work saves lives. Say which half of the cycle your measure belongs to.',
    draw: function (r) {
      r.circle(250, 208, 108, [], { fill: '#ffffff', stroke: '#cbd5e1', width: 2 });
      r.curve('M 250 113 A 95 95 0 1 1 249.9 112.8', { stroke: '#e2e8f0', width: 2, dash: true });
      r.arrow([[314, 82], [350, 116]], { stroke: '#94a3b8' });
      r.note(250, 200, 'Disaster', { anchor: 'middle', size: 15, weight: 800 });
      r.note(250, 222, 'cycle', { anchor: 'middle', size: 13 });
      r.note(250, 242, 'DM Act 2005', { anchor: 'middle', size: 11, color: '#64748b' });

      const ring = [
        { x: 250, y: 64, t: 'Mitigation' }, { x: 376, y: 142, t: 'Preparedness' },
        { x: 376, y: 276, t: 'Early warning' }, { x: 250, y: 354, t: 'Response' },
        { x: 124, y: 276, t: 'Recovery' }, { x: 124, y: 142, t: 'Reconstruction' }
      ];
      ring.forEach(function (p) {
        r.box(p.x - 62, p.y - 18, 124, 36, [p.t], { tone: 'slate', size: 11.5, rx: 10 });
      });

      r.box(452, 66, 280, 62, ['NDMA, SDMA, DDMA', 'national, state, district'], { tone: 'blue', size: 12.5 });
      r.box(452, 140, 280, 62, ['NDRF and SDRF', 'the response force'], { tone: 'green', size: 12.5 });
      r.box(452, 214, 280, 62, ['Sendai Framework 2015-30', 'four priorities, seven targets'], { tone: 'violet', size: 12.5 });
      r.box(452, 288, 280, 56, ['Build back better', 'reconstruction, not replacement'], { tone: 'amber', size: 12.5 });

      r.note(50, 392, 'Mitigation and preparedness are pre-event; relief, recovery and reconstruction are post-event.', { size: 12.5 });
      r.note(50, 414, 'The cycle is a loop: every recovery is the next mitigation.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'semiconductor-chain',
    paper: 'GS3',
    tag: 'Science & Technology',
    title: 'Semiconductor value chain: where India is entering',
    intro: 'Value is high at the two ends and thin in the middle. That single curve explains the policy choices.',
    draw: function (r) {
      r.line(60, 60, 60, 180, { stroke: '#94a3b8', width: 2 });
      r.note(66, 54, 'value added', { size: 11.5, color: '#64748b' });
      r.curve('M 70 78 C 180 66 260 150 380 156 C 500 162 580 74 700 68', { stroke: '#7c3aed', width: 3 });
      r.note(118, 56, 'design', { size: 11, color: '#6d28d9' });
      r.note(380, 142, 'ATMP: thin margin', { anchor: 'middle', size: 11, color: '#6d28d9' });
      r.note(632, 58, 'materials and equipment', { anchor: 'middle', size: 11, color: '#6d28d9' });

      r.box(50, 208, 150, 66, ['Design', 'EDA, IP, fabless'], { tone: 'violet', size: 12 });
      r.box(230, 208, 150, 66, ['Fab', 'wafer fabrication'], { tone: 'blue', size: 12 });
      r.box(410, 208, 150, 66, ['ATMP', 'assembly, test, packaging'], { tone: 'green', size: 12 });
      r.box(590, 208, 150, 66, ['End use', 'devices, autos, defence'], { tone: 'amber', size: 12 });

      r.arrow([[200, 241], [230, 241]], { stroke: '#475569' });
      r.arrow([[380, 241], [410, 241]], { stroke: '#475569' });
      r.arrow([[560, 241], [590, 241]], { stroke: '#475569' });

      r.box(50, 304, 200, 62, ['India Semiconductor Mission', '2021, Rs 76,000 crore'], { tone: 'sky', size: 11.5 });
      r.box(270, 304, 200, 62, ['Design Linked Incentive', 'fabless startups'], { tone: 'sky', size: 11.5 });
      r.box(490, 304, 200, 62, ['ATMP first', 'assembly and testing'], { tone: 'sky', size: 11.5 });

      r.note(50, 394, 'India enters where the capital barrier is lowest: ATMP and design, not leading-edge fabs.', { size: 12.5 });
      r.note(50, 416, 'A fab needs water, uninterrupted power and a supplier base; that is the binding constraint, not the subsidy.', { size: 12, color: '#64748b' });
    }
  },

  // ------------------------------------------------------------------ GS4
  {
    id: 'kohlberg',
    paper: 'GS4',
    tag: 'Ethics',
    title: 'Kohlberg: three levels, six stages',
    intro: 'Each stage is a way of justifying a choice, not the choice itself. Use it to show why the same act can be right for the wrong reason.',
    draw: function (r) {
      const steps = [
        ['1 Obedience', 'punishment'], ['2 Self-interest', 'instrumental'],
        ['3 Good boy', 'approval'], ['4 Law and order', 'duty to system'],
        ['5 Social contract', 'rights, welfare'], ['6 Universal', 'principles']
      ];
      steps.forEach(function (s, i) {
        const x = 60 + i * 106;
        const y = 320 - i * 42;
        r.box(x, y, 112, 40, s, { tone: i < 2 ? 'rose' : i < 4 ? 'amber' : 'green', size: 10.5 });
      });

      r.arrow([[60, 386], [700, 386]], { stroke: '#94a3b8', label: 'moral maturity', labelAt: [380, 400] });
      r.note(116, 372, 'pre-conventional', { anchor: 'middle', size: 10.5, color: '#9f1239' });
      r.note(328, 372, 'conventional', { anchor: 'middle', size: 10.5, color: '#b45309' });
      r.note(540, 372, 'post-conventional', { anchor: 'middle', size: 10.5, color: '#15803d' });

      r.note(50, 52, 'Kohlberg: moral judgement develops in stages, and mature judgement appeals to principles, not consequences.', { size: 12.5 });
      r.note(50, 76, 'Gilligan\'s care critique: an ethic of care can be as mature as an ethic of justice, not a stage below it.', { size: 12.5 });
      r.note(50, 100, 'Use in answers: name the stage, then name what it misses.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'ei-quadrants',
    paper: 'GS4',
    tag: 'Ethics',
    title: 'Emotional intelligence: four quadrants',
    intro: 'Two axes: self versus others, recognition versus regulation. Every EI example in a case study sits in one quadrant.',
    draw: function (r) {
      r.box(170, 80, 220, 130, ['Self-awareness', 'name the emotion', 'accurate self-assessment'], { tone: 'blue', size: 12 });
      r.box(390, 80, 220, 130, ['Self-management', 'self-control, adaptability', 'achievement orientation'], { tone: 'green', size: 12 });
      r.box(170, 210, 220, 130, ['Social awareness', 'empathy, organisational', 'awareness'], { tone: 'violet', size: 12 });
      r.box(390, 210, 220, 130, ['Relationship management', 'influence, conflict', 'teamwork, mentoring'], { tone: 'amber', size: 12 });

      r.note(390, 66, 'Recognition', { anchor: 'middle', size: 11.5, color: '#64748b' });
      r.note(390, 362, 'Regulation', { anchor: 'middle', size: 11.5, color: '#64748b' });
      r.note(152, 150, 'self', { anchor: 'end', size: 11.5, color: '#64748b' });
      r.note(152, 280, 'others', { anchor: 'end', size: 11.5, color: '#64748b' });

      r.note(50, 392, 'Goleman: EI is trainable, and it predicts leadership performance better than IQ alone.', { size: 12.5 });
      r.note(50, 414, 'In a case study, show the quadrant you would use and the behaviour you would change.', { size: 12, color: '#64748b' });
    }
  },
  {
    id: 'probity-cycle',
    paper: 'GS4',
    tag: 'Probity',
    title: 'Corruption cycle and where probity interrupts it',
    intro: 'Corruption is a loop, not an event. Each safeguard below closes one link in it.',
    draw: function (r) {
      r.box(280, 44, 200, 64, ['Opportunity', 'discretion minus accountability'], { tone: 'rose', size: 12 });
      r.box(540, 168, 190, 64, ['Act', 'bribe, embezzlement, favour'], { tone: 'rose', size: 12 });
      r.box(280, 300, 200, 64, ['Concealment', 'benami, shell firms'], { tone: 'rose', size: 12 });
      r.box(30, 168, 190, 64, ['Normalisation', 'collusion and silence'], { tone: 'rose', size: 12 });

      r.arrow([[480, 76], [560, 168]], { stroke: '#e11d48' });
      r.arrow([[590, 232], [480, 300]], { stroke: '#e11d48' });
      r.arrow([[280, 332], [220, 232]], { stroke: '#e11d48' });
      r.arrow([[150, 168], [280, 108]], { stroke: '#e11d48' });

      r.circle(380, 200, 62, ['Probity', 'integrity + transparency'], { tone: 'green', size: 12.5 });

      r.box(50, 60, 160, 50, ['RTI: transparency'], { tone: 'green', size: 11.5 });
      r.box(560, 60, 160, 50, ['CAG: audit'], { tone: 'green', size: 11.5 });
      r.box(560, 310, 160, 50, ['Lokpal + PC Act'], { tone: 'green', size: 11.5 });
      r.box(50, 310, 160, 50, ['Whistleblower law'], { tone: 'green', size: 11.5 });

      r.arrow([[210, 85], [300, 76]], { stroke: '#16a34a', dash: true });
      r.arrow([[560, 85], [480, 76]], { stroke: '#16a34a', dash: true });
      r.arrow([[560, 310], [480, 332]], { stroke: '#16a34a', dash: true });
      r.arrow([[210, 335], [280, 332]], { stroke: '#16a34a', dash: true });

      r.note(50, 388, 'Probity fails where discretion exceeds accountability; each safeguard closes one link in the loop.', { size: 12.5 });
      r.note(50, 412, '2nd ARC: codes of ethics, conflict-of-interest rules and asset disclosure are preventive, not decorative.', { size: 12, color: '#64748b' });
    }
  }
];

// ---------------------------------------------------------------------------
// Coverage map: one row per syllabus theme, every row must resolve to a figure
// ---------------------------------------------------------------------------

const COVERAGE = {
  GS1: [
    { theme: 'Geomorphology', figs: ['plate-boundaries', 'rock-cycle', 'river-profile'] },
    { theme: 'Climatology', figs: ['monsoon', 'el-nino'] },
    { theme: 'Oceanography', figs: ['ocean-currents'] },
    { theme: 'Soils and water', figs: ['soil-profile', 'water-cycle'] },
    { theme: 'Population and society', figs: ['demographic-transition', 'urban-hierarchy'] },
    { theme: 'History and culture', figs: ['national-movement', 'temple-styles'] }
  ],
  GS2: [
    { theme: 'Constitution and polity', figs: ['federal-lists', 'separation-powers', 'writs', 'constitutional-bodies'] },
    { theme: 'Governance', figs: ['law-making', 'panchayati-raj'] },
    { theme: 'International relations', figs: ['foreign-policy', 'un-organs'] }
  ],
  GS3: [
    { theme: 'Macro economy', figs: ['circular-flow', 'bop', 'budget-cycle'] },
    { theme: 'Money and prices', figs: ['monetary-transmission', 'laf-corridor', 'inflation-types'] },
    { theme: 'Public finance', figs: ['gst-chain'] },
    { theme: 'Agriculture', figs: ['cropping-seasons'] },
    { theme: 'Science and technology', figs: ['semiconductor-chain'] },
    { theme: 'Environment and disaster', figs: ['carbon-cycle', 'disaster-cycle'] }
  ],
  GS4: [
    { theme: 'Ethics and human interface', figs: ['ethical-decision', 'kohlberg', 'ei-quadrants'] },
    { theme: 'Probity in governance', figs: ['probity-cycle'] }
  ]
};

// ---------------------------------------------------------------------------
// Coverage map: one row per syllabus theme, every row must resolve to a figure
// ---------------------------------------------------------------------------

const FIGURES = SPECS.map(function (spec) {
  const r = makeRecorder(spec.id);
  spec.draw(r);
  return {
    id: spec.id,
    title: spec.title,
    paper: spec.paper,
    tag: spec.tag,
    intro: spec.intro,
    items: r.items
  };
});

// The scheduled forge writes data/figure-forge.json from the curated briefs.
// A missing file is not fatal: the hand-authored library still renders, and
// the forge workflow creates it on its first run. The theme groups are merged
// into COVERAGE by name, so a forged diagram cannot sit outside the map.
try {
  const FORGED = require('../../data/figure-forge.json');
  (FORGED.figures || []).forEach(function (f) {
    const exists = FIGURES.some(function (x) { return x.id === f.id; });
    if (!exists) FIGURES.push(f);
  });
  (FORGED.themes || []).forEach(function (g) {
    const rows = COVERAGE[g.paper] || (COVERAGE[g.paper] = []);
    let row = rows.filter(function (r) { return r.theme === g.theme; })[0];
    if (!row) {
      row = { theme: g.theme, figs: [] };
      rows.push(row);
    }
    (g.figs || []).forEach(function (id) {
      if (row.figs.indexOf(id) === -1) row.figs.push(id);
    });
  });
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
}

// Figures invented from course content (data/figures/invented.json) join both
// the gallery and the coverage map here, exactly like a forged or hand-written
// one. Without a coverage row figure-library.test.js fails with "figure not
// reachable from the coverage map", so the mapping is part of adding a figure,
// not an afterthought.
try {
  const INVENTED = require('./figure-store.js').all();
  const TAG_THEME = [
    [/^(economy)$/i, /econom|money|finance|public/],
    [/^(environment)$/i, /environment|disaster/],
    [/^(science|science & technology)$/i, /science|technology/],
    [/^(history|art & culture)$/i, /history|culture/],
    [/^(society)$/i, /society|population/],
    [/^(polity|governance)$/i, /polity|constitution|governance/],
    [/^(international relations)$/i, /international/],
    [/^(agriculture)$/i, /agriculture/],
    [/^(disaster management)$/i, /disaster|environment/],
    [/^(geography)$/i, /geomorph|climat|oceanog|soil|water|geograph/],
    [/^(ethics|probity)$/i, /ethic|probity/]
  ];
  INVENTED.forEach(function (f) {
    if (!FIGURES.some(function (x) { return x.id === f.id; })) FIGURES.push(f);
    const rows = COVERAGE[f.paper] || (COVERAGE[f.paper] = []);
    const tag = String(f.tag || '').trim();
    const rule = TAG_THEME.filter(function (r) { return r[0].test(tag); })[0];
    let row = rule ? rows.filter(function (r) { return rule[1].test(r.theme); })[0] : null;
    if (!row) {
      row = rows.filter(function (r) { return r.theme.toLowerCase() === tag.toLowerCase(); })[0];
    }
    if (!row) {
      row = { theme: tag || 'Unsorted', figs: [] };
      rows.push(row);
    }
    if (row.figs.indexOf(f.id) === -1) row.figs.push(f.id);
  });
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
}

const THEME_COUNT = Object.keys(COVERAGE).reduce(function (n, p) {
  return n + COVERAGE[p].length;
}, 0);

module.exports = { FIGURES: FIGURES, COVERAGE: COVERAGE, THEME_COUNT: THEME_COUNT };

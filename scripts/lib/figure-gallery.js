'use strict';
// One renderer for the hand-drawn figure hub.
//
// The library used to live at two URLs with different content: /figures (the
// gallery) and /figures/ (the subject-pack index). They are now one page:
// figures/index.html carries the full ink-sketch gallery, the coverage map and
// the Wikimedia packs. figures.html is only a redirect, so a search result or
// an old bookmark lands on the canonical page instead of a second copy.
//
// Everything here reads FIGURES from upsc-svg-figures.js, which in turn loads
// the generated specs. A diagram therefore appears in the gallery, its own
// svg-<id>.html page and the figures index from one definition.

var FIGLIB = require('./upsc-svg-figures.js');
var SPECS = require('./upsc-figure-specs.js');

var PAPER = FIGLIB.PAPER;
var FIGURES = FIGLIB.FIGURES;
var EXTRA = FIGLIB.EXTRA_FIGURES || [];
var svg = FIGLIB.svg;
var esc = FIGLIB.esc;
var COVERAGE = SPECS.COVERAGE;
var THEME_COUNT = SPECS.THEME_COUNT;

var PAPER_LABEL = {
  GS1: 'GS1 · Geography, History and Society',
  GS2: 'GS2 · Polity, Governance and IR',
  GS3: 'GS3 · Economy, Agriculture, Science and Environment',
  GS4: 'GS4 · Ethics and Probity'
};

function css() {
  return '.figlib{margin:30px 0 10px}' +
    '.figlib-head{max-width:860px}' +
    '.figlib .kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a78bfa;font-weight:800}' +
    '.figlib h2{font-size:clamp(24px,3.4vw,34px);line-height:1.12;letter-spacing:-.03em;margin:8px 0 10px;color:#fafafa}' +
    '.figlib .lede{color:#a1a1aa;font-size:14.5px;max-width:780px}' +
    '.figlib .stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:18px;color:#71717a;font-size:12px}' +
    '.figlib .stats b{display:block;color:#fafafa;font-size:20px;letter-spacing:-.02em}' +
    '.figlib .filters{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 18px}' +
    '.figlib .chip{border:1px solid rgba(255,255,255,.12);background:#111113;color:#a1a1aa;border-radius:100px;padding:8px 14px;font-size:12.5px;font-weight:650;cursor:pointer}' +
    '.figlib .chip[aria-pressed="true"]{background:rgba(167,139,250,.14);border-color:rgba(167,139,250,.45);color:#ddd6fe}' +
    '.fig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}' +
    '.fig-card{background:#111113;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:9px}' +
    '.fig-card[hidden]{display:none}' +
    '.fig-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.fig-card .paper{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--pc);border:1px solid color-mix(in srgb,var(--pc) 40%,transparent);background:color-mix(in srgb,var(--pc) 12%,transparent);padding:4px 9px;border-radius:100px}' +
    '.fig-card .tag{font-size:10.5px;color:#71717a;text-transform:uppercase;letter-spacing:.08em;font-weight:700}' +
    '.fig-card h3{font-size:16.5px;letter-spacing:-.02em;line-height:1.25;margin:0}' +
    '.fig-card h3 a{color:#fafafa;text-decoration:none}' +
    '.fig-card h3 a:hover{color:#ddd6fe}' +
    '.fig-card .intro{font-size:12.5px;color:#a1a1aa;min-height:34px}' +
    '.fig-card .canvas{background:#fffdf7;border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,.14)}' +
    '.fig-card .canvas svg{display:block;width:100%;height:auto}' +
    '.fig-card .open{font-size:11.5px;color:#a78bfa;font-weight:650}' +
    '.extra{margin:26px 0 8px}' +
    '.extra h3{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#71717a;margin-bottom:9px}' +
    '.extra-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}' +
    '.extra-grid a{background:#111113;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:11px 13px;font-size:12.5px;color:#c8ccd2}' +
    '.extra-grid a:hover{border-color:rgba(167,139,250,.45);color:#fafafa}' +
    '.coverage{margin:34px 0 10px;border-top:1px solid rgba(255,255,255,.08);padding-top:24px}' +
    '.coverage h2{font-size:22px;letter-spacing:-.02em;margin-bottom:8px;color:#fafafa}' +
    '.coverage>p{color:#a1a1aa;font-size:13px;max-width:780px}' +
    '.cov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-top:16px}' +
    '.cov-col{background:#111113;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:15px}' +
    '.cov-col h3{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--pc,#a1a1aa);margin-bottom:9px}' +
    '.cov-col ul{list-style:none;display:flex;flex-direction:column;gap:6px;margin:0;padding:0}' +
    '.cov-col li{font-size:12px;color:#a1a1aa}' +
    '.cov-col li b{color:#fafafa;font-weight:650;margin-right:4px}' +
    '.cov-col li a{color:#a1a1aa;text-decoration:none;border-bottom:1px dotted rgba(255,255,255,.18)}' +
    '.cov-col li a:hover{color:#fafafa}' +
    '@media print{.figlib .filters,.figlib .stats,.coverage{display:none}.fig-card{break-inside:avoid}}';
}

function card(f) {
  var meta = PAPER[f.paper] || PAPER.GS1;
  return '<article class="fig-card" data-paper="' + f.paper + '" id="fig-' + f.id + '">' +
    '<div class="fig-head"><span class="paper" style="--pc:' + meta.color + '">' + esc(meta.label) + '</span>' +
    '<span class="tag">' + esc(f.tag) + '</span></div>' +
    '<h3><a href="svg-' + f.id + '.html">' + esc(f.title) + '</a></h3>' +
    '<p class="intro">' + esc(f.intro) + '</p>' +
    '<div class="canvas">' + svg({ id: f.id, w: 760, h: 420, aria: f.title, items: f.items }) + '</div>' +
    '<a class="open" href="svg-' + f.id + '.html">Open the full diagram &rarr;</a>' +
    '</article>';
}

function coverage() {
  var cols = Object.keys(COVERAGE).map(function (paper) {
    var rows = COVERAGE[paper].map(function (row) {
      var links = row.figs.map(function (id) {
        return '<a href="#fig-' + id + '">' + esc(id.replace(/-/g, ' ')) + '</a>';
      }).join(', ');
      return '<li><b>' + esc(row.theme) + '</b> ' + links + '</li>';
    }).join('');
    return '<div class="cov-col" style="--pc:' + PAPER[paper].color + '"><h3>' + esc(PAPER_LABEL[paper]) +
      '</h3><ul>' + rows + '</ul></div>';
  }).join('');
  return '<section class="coverage" id="coverage"><h2>Coverage map: every GS theme has a sketch</h2>' +
    '<p>Each row is a syllabus theme; each link is a diagram you can redraw from memory. ' +
    'The map is generated from the same specs as the cards, so a theme cannot silently lose its figure.</p>' +
    '<div class="cov-grid">' + cols + '</div></section>';
}

function section() {
  var cards = FIGURES.map(card).join('\n');
  var lede = 'A working set of label-first ink sketches, one for every GS syllabus theme: geomorphology, ' +
    'climatology, oceanography, soils, population, art and culture, the national movement, polity, ' +
    'governance, international relations, the economy, money and prices, public finance, agriculture, ' +
    'science and technology, environment, disaster management and ethics. No pastel boxes, no stock ' +
    'photos: just the lines and labels you would put on the answer sheet.';
  return '<section class="figlib" id="hand-drawn">' +
    '<div class="figlib-head"><p class="kicker">Exam-hall sketches</p>' +
    '<h2>Hand-drawn diagrams you can reproduce with a pen</h2>' +
    '<p class="lede">' + lede + '</p>' +
    '<div class="stats"><div><b>' + FIGURES.length + '</b>ink diagrams</div>' +
    '<div><b>' + THEME_COUNT + '</b>syllabus themes</div>' +
    '<div><b>GS1-GS4</b>papers covered</div>' +
    '<div><b>100%</b>inline, printable</div></div></div>' +
    '<div class="filters" role="group" aria-label="Filter figures by paper">' +
    '<button class="chip" data-filter="all" aria-pressed="true">All papers</button>' +
    '<button class="chip" data-filter="GS1" aria-pressed="false">GS1</button>' +
    '<button class="chip" data-filter="GS2" aria-pressed="false">GS2</button>' +
    '<button class="chip" data-filter="GS3" aria-pressed="false">GS3</button>' +
    '<button class="chip" data-filter="GS4" aria-pressed="false">GS4</button>' +
    '</div><div class="fig-grid">' + cards + '</div>' +
    (EXTRA.length ? '<div class="extra"><h3>Hand-authored topic pages</h3><div class="extra-grid">' +
      EXTRA.map(function (f) {
        return '<a href="' + esc(f.href) + '">' + esc(f.title) +
          ' <span style="color:#71717a">&middot; ' + esc(f.tag) + '</span></a>';
      }).join('') + '</div></div>' : '') +
    coverage() +
    '</section>' +
    '<script>(function(){var chips=document.querySelectorAll(".figlib .chip");' +
    'var cards=document.querySelectorAll(".figlib .fig-card");' +
    'chips.forEach(function(c){c.addEventListener("click",function(){var f=c.getAttribute("data-filter");' +
    'chips.forEach(function(x){x.setAttribute("aria-pressed",x===c?"true":"false")});' +
    'cards.forEach(function(card){card.hidden=f!=="all"&&card.getAttribute("data-paper")!==f})})})})();</script>';
}

// figures.html is kept as a redirect stub rather than a second gallery. The
// _redirects file sends both /figures and /figures.html to /figures/, and this
// page is the fallback for hosts that ignore _redirects.
function redirect() {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>UPSC Figure Library | vlymbooq</title>\n' +
    '<link rel="canonical" href="https://vlymbooq.qzz.io/figures/">\n' +
    '<meta name="robots" content="noindex">\n' +
    '<meta http-equiv="refresh" content="0; url=figures/">\n' +
    '</head>\n<body>\n<p>The figure library has moved to ' +
    '<a href="figures/">vlymbooq.qzz.io/figures/</a>.</p>\n</body>\n</html>\n';
}

module.exports = {
  css: css,
  section: section,
  coverage: coverage,
  card: card,
  redirect: redirect,
  FIGURES: FIGURES,
  COVERAGE: COVERAGE,
  THEME_COUNT: THEME_COUNT
};

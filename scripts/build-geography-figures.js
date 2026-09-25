// Auto-generate a printable GS-Geography FIGURES pack (real labelled outline
// images, hotlinked live from Wikimedia Commons / NOAA - zero local storage).
//
// Each entry maps a geography topic (normalized name) to one labelled figure:
//   url   - hotlinked image source (Commons Special:FilePath or direct URL)
//   sec   - section banner text
//   marks - what the student must mark/label in an exam answer
//   src   - attribution / license line
//   topics - normalized topic names this figure answers (from topic-layers keys)
//
// Then it scans data/topic-layers.json for geography topics; names that have a
// matching figure render a page, names WITHOUT a figure are printed to the
// console + listed in the pack footer so future topics are visible for mapping.
//
// Usage: node scripts/build-geography-figures.js

var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data');
var LAYERS_FILE = path.join(DATA, 'topic-layers.json');
var OUT_FILE = path.join(__dirname, '..', 'geography-figures.html');

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function C(name, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=' + (w || 1000); }
function NOAA(p) { return 'https://www.pmel.noaa.gov/elnino/sites/default/files/thumbnails/image/' + p; }

// Topic (normalized) -> figure. Future topics: add one line here, re-run script.
var FIGURES = [
  {
    url: C('India_states_and_union_territories_map.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 States & UTs (Political)',
    marks: ['28 states + 8 UTs', 'capitals', 'neighbouring countries (China / Pak / Nepal / Bangladesh / Myanmar)', 'practice: redraw from a blank outline'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india political map', 'states and union territories of india', 'states of india', 'union territories of india', 'gir']
  },
  {
    url: C('India_physical_map.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 Physical Map',
    marks: ['Himalayas (Great / Middle / Outer)', 'Indo-Gangetic plain', 'Peninsular plateau (Malwa / Deccan / Chota Nagpur)', 'Vindhya\u2013Satpura', 'Western / Eastern Ghats', 'coasts (Konkan / Malabar / Coromandel)', 'Thar desert', 'major rivers (Ganga, Yamuna, Brahmaputra, Godavari, Krishna, Narmada, Kaveri)'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india physical map', 'physical geography of india', 'physical divisions of india']
  },
  {
    url: C('India_map_blank.svg'),
    sec: 'India \u00b7 Maps', title: 'India \u2014 Blank Outline (Practice Sheet)',
    marks: ['trace rivers, ranges, plateaus, passes, ports on the outline', 'then re-draw 2\u20133 examples per topic'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['india blank map', 'india outline map']
  },
  {
    url: C('India_earthquake_zone_map.svg'),
    sec: 'India \u00b7 Geophysics', title: 'India \u2014 Seismic Zones (BIS)',
    marks: ['Zone V (whole NE, Kutch, parts of J&K\u2013Himachal, Andamans)', 'Zone II (peninsular shield)', 'collision front along the Himalayan arc', 'Indo-Australian vs Eurasian plate boundary'],
    src: 'Source: Wikimedia Commons (Planemad) \u00b7 CC BY-SA 3.0',
    topics: ['earthquake', 'seismic zones of india', 'earthquakes in india']
  },
  {
    url: C('India_southwest_summer_monsoon_onset_map_en.svg'),
    sec: 'India \u00b7 Climate', title: 'India \u2014 Southwest Monsoon Onset',
    marks: ['Kerala onset (~1 June)', 'Arabian Sea (Bombay) branch', 'Bay of Bengal branch', 'onset isochrones advancing NW', 'ITCZ shift', 'two branches meet over the Himalayas'],
    src: 'Source: Wikimedia Commons (Saravask) \u00b7 CC BY-SA 3.0',
    topics: ['monsoon', 'southwest monsoon', 'indian monsoon']
  },
  {
    url: C('Indian_monsoon.png'),
    sec: 'India \u00b7 Climate', title: 'Indian Monsoon \u2014 Progress Isochrones',
    marks: ['onset dates (1 June Kerala \u2192 15 July UP/Rajasthan)', 'retreat lines (Sep\u2013Oct)', 'advance (dark) vs retreat (light) isochrones'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['monsoon', 'indian monsoon', 'retreating monsoon']
  },
  {
    url: C('Plates_tect2_en.svg'),
    sec: 'World \u00b7 Geophysics', title: 'Tectonic Plate Boundaries (World)',
    marks: ['convergent (Himalayan front)', 'divergent (Mid-Atlantic ridge, East Pacific rise)', 'transform (San Andreas)', 'Indian plate, Eurasian plate, Pacific ring of fire'],
    src: 'Source: Wikimedia Commons (USGS-derived) \u00b7 Public domain',
    topics: ['plate tectonics', 'tectonic plates', 'continental drift', 'volcano', 'earthquake', 'mauna loa', 'barren island']
  },
  {
    url: C('Tectonic_plate_boundaries.png'),
    sec: 'World \u00b7 Geophysics', title: 'Plate Boundaries \u2014 Cross-section Types',
    marks: ['divergent \u2192 ocean-floor spreading & mid-ocean ridges', 'convergent \u2192 subduction trench + volcanic arc / collision \u2192 mountains', 'transform \u2192 strike-slip fault'],
    src: 'Source: Wikimedia Commons (USGS, Jose F. Vigil) \u00b7 Public domain',
    topics: ['plate tectonics', 'volcano', 'earthquake']
  },
  {
    url: C('Volcano_scheme.svg', 900),
    sec: 'World \u00b7 Geomorphology', title: 'Volcano \u2014 Labelled Structure',
    marks: ['magma chamber', 'conduit / pipe', 'throat', 'crater', 'vent', 'parasitic cone', 'lava flow', 'ash-bed layers', 'flank, base, bedrock (numbered 1\u201315 list)'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 2.5/3.0',
    topics: ['volcano', 'volcanoes', 'volcanic eruption']
  },
  {
    url: C('Stratovolcano_cross-section.svg', 900),
    sec: 'World \u00b7 Geomorphology', title: 'Stratovolcano / Composite Cone \u2014 Cross-section',
    marks: ['alternating lava & pyroclastic layers', 'central vent + conduit', 'magma chamber', 'side vent', 'contrast: shield (Mauna Loa) v/s cinder cone'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA 3.0',
    topics: ['volcano', 'mauna loa', 'volcanic eruption']
  },
  {
    url: C('Epicenter_Diagram.svg', 900),
    sec: 'World \u00b7 Geophysics', title: 'Earthquake \u2014 Focus & Epicentre',
    marks: ['focus / hypocentre (deep rupture point)', 'epicentre (surface projection)', 'seismic waves radiating outward', 'P vs S waves', 'shallow vs deep-focus zones'],
    src: 'Source: Wikimedia Commons (deriv. of Sam Hocevar) \u00b7 CC BY-SA / GFDL',
    topics: ['earthquake', 'earthquakes in india']
  },
  {
    url: C('Hurricane-en.svg'),
    sec: 'World \u00b7 Climate', title: 'Tropical Cyclone \u2014 Anatomy (Hurricane)',
    marks: ['eye (calm centre)', 'eyewall (max winds)', 'spiral rainbands', 'outflow aloft', 'anticlockwise (N-Hemisphere) due to Coriolis', 'warm-core low'],
    src: 'Source: Wikimedia Commons (Kelvinsong) \u00b7 CC BY 3.0',
    topics: ['cyclone', 'tropical cyclone', 'hurricane', 'typhoon']
  },
  {
    url: NOAA('normal-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 1: Normal Conditions',
    marks: ['easterly trade winds push warm pool west', 'thermocline slopes down to the west', 'cold upwelling off Peru / Ecuador', 'rains over the warm pool (so Indonesia / Philippines)'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['el nino', 'la nina']
  },
  {
    url: NOAA('nino-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 2: El Ni\u00f1o',
    marks: ['warm pool migrates eastwards to Central/East Pacific', 'thermocline flattens', 'upwelling suppressed off Peru', 'weak/normal contradiction over India',
      'mark for UPSC: weaker monsoon over India, droughts; heavy rain on W. coast of Americas'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['el nino', 'el nino southern oscillation']
  },
  {
    url: NOAA('nina-only.gif'), cls: 'trio',
    sec: 'World \u00b7 Oceanography', title: 'ENSO \u2014 Panel 3: La Ni\u00f1a',
    marks: ['warm pool pushed further west', 'thermocline steepens', 'upwelling stronger than normal off Peru', 'stronger trade winds', 'often better SW monsoon & floods over India'],
    src: 'Source: NOAA PMEL El Ni\u00f1o Theme Page \u00b7 Public domain (US Gov)',
    topics: ['la nina']
  },
  {
    url: C('Suez_canal_map.jpg'),
    sec: 'World \u00b7 Waterways', title: 'Suez Canal \u2014 Map',
    marks: ['links Mediterranean (Port Said) to Red Sea (Suez)', 'saves the Africa round-trip for Europe\u2013Asia trade', 'lies wholly in Egypt (Sinai to the east)', 'no locks (sea-level canal)', 'mark for UPSC: choke point + trade route answers'],
    src: 'Source: Wikimedia Commons (CIA map) \u00b7 Public domain',
    topics: ['suez canal']
  },
  {
    url: C('Panama_canal.svg'),
    sec: 'World \u00b7 Waterways', title: 'Panama Canal \u2014 Map',
    marks: ['links Atlantic (Col\u00f3n) to Pacific (Panama City)', 'saves the Cape Horn route', 'locks system lifting ships to Gatun Lake', 'cuts across the Isthmus of Panama', 'mark the approximate lock stations'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['panama canal']
  },
  {
    url: C('China_India_western_border_88.jpg'),
    sec: 'India \u00b7 Borders', title: 'India\u2013China Border \u2014 Western Sector (Aksai Chin / Siachen)',
    marks: ['Aksai Chin region & the Karakoram Pass', 'Siachen Glacier (the saltoro ridge) north flank', 'Line of Actual Control (LAC) of the west', 'Kashmir sector proximate to LoC with Pakistan'],
    src: 'Source: Wikimedia Commons (CIA map, 1988) \u00b7 Public domain',
    topics: ['siachen glacier', 'line of actual control', 'aksai chin', 'kashmir']
  },
  {
    url: C('China_India_eastern_border_88.jpg'),
    sec: 'India \u00b7 Borders', title: 'India\u2013China Border \u2014 Eastern Sector (McMahon / Tawang)',
    marks: ['McMahon Line along the crest of the Himalayas', 'NEFA (Arunachal) below the line', 'Tawang sector (disputed; 1962 flashpoint)', 'Doklam / Bhutan trijunction area (west of Tawang)'],
    src: 'Source: Wikimedia Commons (CIA map, 1988) \u00b7 Public domain',
    topics: ['mcmahon line', 'doklam', 'arunachal pradesh']
  },
  {
    url: C('1947_India_showing_Provinces,_States_and_Districts_by_Survey_of_India_(cropped).jpg'),
    sec: 'India \u00b7 Borders', title: 'India 1947 \u2014 Radcliffe Line & McMahon Line (Survey of India)',
    marks: ['Radcliffe Line border with Pakistan (part of today\u2019s LoC/Wagah)', 'McMahon Line border with China in the east', 'borders inherited at Independence, 1947', 'mark historical British-India provinces + princely states'],
    src: 'Source: Wikimedia Commons (Survey of India) \u00b7 Public domain',
    topics: ['line of control', 'radcliffe line', 'mcmahon line']
  },
  {
    url: C('Kashmir_map.svg'),
    sec: 'India \u00b7 Borders', title: 'Kashmir \u2014 LoC & Siachen',
    marks: ['Line of Control (India\u2013Pakistan) dividing J&K', 'Siachen Glacier to the north-east (Saltoro)', 'Gilgit-Baltistan (west of LoC)', 'Pok / Kargil sectors', 'mark for UPSC: border-dispute + mountain-warfare answers'],
    src: 'Source: Wikimedia Commons \u00b7 CC BY-SA',
    topics: ['kashmir', 'line of control', 'siachen glacier']
  }
];

var SECTION = { 'India \u00b7 Maps': 1, 'India \u00b7 Geophysics': 1, 'India \u00b7 Climate': 1, 'World \u00b7 Geophysics': 1, 'World \u00b7 Geomorphology': 1, 'World \u00b7 Climate': 1, 'World \u00b7 Oceanography': 1 };

// ---- load geography topic names from topic-layers.json ----
var TOPIC_GEO_REGEX = /canal|glacier|volcan|river|plateau|desert|sea\b|\blake\b|strait|monsoon|cyclone|earthquake|island|mountain|range|coast|peninsula|gulf|bay\b|delta|tectonic|soil|climate|forest|national park|sanctuary|wildlife|wetland|drought|flood|tsunami|hurricane|typhoon|el ni\u00f1o|la ni\u00f1a|ocean|hemisphere|tropic|equator|atoll|reef|watershed|estuary|fjord|mangrove|coral|savanna|prairie|steppe|taiga|tundra|pampas/i;
var GEO_CORE = { 'siachen glacier': 1, 'mcmahon line': 1, 'line of actual control': 1, 'line of control': 1, 'doklam': 1, 'suez canal': 1, 'panama canal': 1, 'gir': 1, 'volcano': 1, 'mauna loa': 1, 'barren island': 1, 'el ni\u00f1o': 1, 'la ni\u00f1a': 1 };
var GEO_EXCLUDE = { 'operation flood': 1, 'battle of lake poyang': 1, 'pulakeshin ii': 1, 'basavanna': 1, 'helicopter': 1 };

var layerTopics = [];
var layers = fs.existsSync(LAYERS_FILE) ? JSON.parse(fs.readFileSync(LAYERS_FILE, 'utf8')) : {};
Object.keys(layers).forEach(function (k) {
  var name = (layers[k] && layers[k].name) || k;
  if (!TOPIC_GEO_REGEX.test(name) && !GEO_CORE[norm(name)]) return;
  if (GEO_EXCLUDE[norm(name)]) return;
  layerTopics.push({ name: name, n: norm(name) });
});

// ---- match topics -> figures ----
// Token-subset matching: a topic is covered when every token of a figure key
// appears in the topic name (order-insensitive), e.g. key "el nino" covers
// "El Ni\u00f1o\u2013Southern Oscillation", key "volcano" covers "Taal volcano".
function tokens(s) { return norm(String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).split(' ').filter(Boolean); }
function isSubset(a, b) { return a.every(function (x) { return b.indexOf(x) >= 0; }); }
var figureKeys = FIGURES.map(function (f) {
  return { fig: f, keys: (f.topics || []).map(tokens) };
});
var unmatched = [];
layerTopics.forEach(function (t) {
  var tn = tokens(t.name);
  var hit = figureKeys.some(function (fk) {
    return fk.keys.some(function (ks) { return isSubset(ks, tn); });
  });
  if (!hit) unmatched.push(t.name);
});

// ---- build pages ----
function marksHtml(marks) {
  if (!marks || !marks.length) return '';
  return '<div class="marks"><b>Mark in exam:</b><ul>' + marks.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
}

function pageFor(f) {
  var imgs = '';
  if (f.cls === 'trio') {
    imgs = '<div class="fig-img img-em"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>';
  } else {
    imgs = '<div class="fig-img"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>';
  }
  return '<section class="page">' +
    '<div class="num">' + esc(f.sec) + '</div>' +
    '<div class="fig-title">' + esc(f.title) + '</div>' +
    imgs + marksHtml(f.marks) +
    '<div class="fig-src">' + esc(f.src) + '</div>' +
    '</section>';
}

var pages = FIGURES.map(pageFor);

var missingNote = '';
if (unmatched.length) {
  missingNote = '<div class="missing"><b>Future topics not yet assigned a figure</b> (add a matching topic key in scripts/build-geography-figures.js):<br>' +
    esc(unmatched.slice(0, 40).join(' \u00b7 ')) + (unmatched.length > 40 ? ' \u00b7 +' + (unmatched.length - 40) + ' more' : '') + '</div>';
}

var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GS Geography Figures (UPSC Mains)</title>' +
  '<style>' +
  'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;background:#e5e7eb;color:#111827}' +
  'section.page{background:#fff;max-width:980px;margin:16px auto;padding:26px 28px;box-shadow:0 1px 4px rgba(0,0,0,.18);page-break-after:always}' +
  'section.page:last-child{page-break-after:auto}' +
  'header h1{font-size:18px;margin:0 0 2px}' +
  '.num{font-size:10px;letter-spacing:.14em;color:#0e7490;font-weight:700;text-transform:uppercase}' +
  '.fig-title{font-size:15px;font-weight:700;margin:2px 0 6px}' +
  '.fig-src{font-size:9.5px;color:#6b7280;margin:6px 0 0}' +
  '.fig-img{display:flex;justify-content:center;align-items:center;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:8px 0}' +
  '.fig-img img{max-width:100%;height:auto}' +
  '.fig-img.img-em{flex-direction:column;gap:6px}' +
  '.marks{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:11px;line-height:1.7}' +
  '.marks b{color:#166534}.marks ul{margin:4px 0 0;padding-left:16px}.marks li{margin:1px 0}' +
  '.missing{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:9.5px;color:#92400e;line-height:1.6;margin-bottom:8px}' +
  '@page{size:A4;margin:10mm}' +
  '@media print{body{background:#fff}section.page{box-shadow:none;margin:0;padding:0}.fig-img{break-inside:avoid}}</style>' +
  '</head><body>' +
  '<section class="page"><header><span class="num">GS Paper 1 \u00b7 Geography \u00b7 UPSC Mains</span><h1>Geography Figures \u2014 Real Labelled Outlines</h1><p class="meta">' + FIGURES.length + ' figures \u00b7 live images from Wikimedia Commons & NOAA (needs internet) \u00b7 print-ready A4 \u00b7 auto-built by scripts/build-geography-figures.js</p></header>' + missingNote + '</section>' +
  pages.join('') +
  '</body></html>';

fs.writeFileSync(OUT_FILE, html);
console.log('Wrote ' + OUT_FILE + ' (' + FIGURES.length + ' figures)');
console.log('Unmatched geography topics (no figure yet): ' + unmatched.length);
unmatched.slice(0, 25).forEach(function (n) { console.log('  - ' + n); });
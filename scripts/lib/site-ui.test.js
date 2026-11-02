'use strict';
// Regression suite for the full-screen modal pattern.
//
// map.html copied the `.revision-modal` overlay from revision.html but left out
// `display:none` on the base rule. The overlay therefore covered the timeline
// on load, and closeTimeframe() only removed `.active`, which changed nothing.
// The page looked permanently blocked by the timeframe panel and its
// "Export as Markdown" / "Copy to Clipboard" buttons.
//
//   node scripts/lib/site-ui.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

function htmlFiles(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'question-bank') return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (/\.html$/i.test(e.name)) out.push(p);
  });
  return out;
}

function rule(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(html);
  return m ? m[1] : null;
}

const files = htmlFiles(ROOT, []);
const overlays = [];

console.log('--- every .revision-modal overlay is hidden until opened ---');
files.forEach(function (file) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('.revision-modal') === -1) return;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const base = rule(html, '.revision-modal');
  const active = rule(html, '.revision-modal.active');
  overlays.push(rel);
  assert(base !== null, rel + ': has a .revision-modal base rule');
  if (base !== null) {
    assert(/display\s*:\s*none\b/.test(base),
      rel + ': base rule hides the overlay by default',
      'base rule: ' + base.slice(0, 120));
  }
  assert(active !== null, rel + ': has a .revision-modal.active rule');
  if (active !== null) {
    assert(/display\s*:\s*(block|flex|grid)\b/.test(active),
      rel + ': .active shows the overlay',
      'active rule: ' + active.slice(0, 120));
  }
});

assert(overlays.length >= 2, 'both revision.html and map.html use the overlay', overlays.join(', '));

console.log('\n--- the map timeframe panel can be opened and closed ---');
(function () {
  const html = read('map.html');
  assert(html.indexOf('id="timeframeModal"') !== -1, 'map.html contains the timeframe dialog');
  assert(/function\s+openTimeframe\b/.test(html), 'openTimeframe() is defined');
  assert(/classList\.add\(['"]active['"]\)/.test(html), 'openTimeframe() adds .active');
  assert(/function\s+closeTimeframe\b/.test(html), 'closeTimeframe() is defined');
  assert(/getElementById\(['"]timeframeModal['"]\)\.classList\.remove\(['"]active['"]\)/.test(html),
    'closeTimeframe() removes .active from the same dialog');
  assert(html.indexOf('onclick="closeTimeframe()"') !== -1, 'the close control is wired to closeTimeframe()');
})();

console.log('\n--- the map stays responsive while scrolling, zooming and opening timeframes ---');
(function () {
  const html = read('map.html');

  // Timeframe used to build one innerHTML string for every dated topic in the
  // window. At full history that is ~483k cards, synchronously, before the
  // modal could paint. It now paints first, then appends 250-card chunks.
  assert(/var\s+TF_CHUNK\s*=\s*250\b/.test(html), 'timeframe renders 250 cards at a time');
  assert(/var\s+TF_EXPORT_CAP\s*=\s*2000\b/.test(html), 'timeframe export has an explicit 2,000-topic cap');
  assert(/function\s+appendTfChunk\b/.test(html), 'appendTfChunk() appends the next slice');
  assert(/function\s+updateTfMore\b/.test(html), 'updateTfMore() keeps the remaining count honest');
  assert(html.indexOf('id="tfMore"') !== -1, 'the dialog has a Show more container');
  assert(html.indexOf('appendTfChunk()') !== -1, 'the Show more control calls appendTfChunk()');
  assert(/setTimeout\(renderTimeframe,\s*0\)/.test(html), 'openTimeframe() defers the linear scan until after paint');
  assert(/\.slice\(0,\s*TF_EXPORT_CAP\)/.test(html), 'exportTimeframe() slices to the cap');
  assert(html.indexOf('narrow the timeframe for a complete list') !== -1,
    'capped exports say how to get the complete list');

  // Scrolling called render() every 60 ms, which re-filtered and re-placed all
  // 557k nodes. Layout is now cached per window/filter change and the scroll
  // path only swaps the visible slice.
  assert(/var\s+_LAYOUT\s*=\s*null/.test(html), 'render() keeps a cached layout');
  assert(/function\s+emitViewport\b/.test(html), 'emitViewport() emits the visible slice');
  assert(/_LAYOUT\s*=\s*\{\s*nodes:/.test(html), 'render() stores placed nodes in _LAYOUT');
  assert(/_LAYOUT\.ys/.test(html) && /while\s*\(lo\s*<\s*hi\)/.test(html),
    'emitViewport() binary-searches the sorted placement rows');
  assert(/addEventListener\('scroll'[\s\S]{0,220}setTimeout\(emitViewport,\s*50\)/.test(html),
    'the scroll handler debounces emitViewport(), not render()');
  assert(!/addEventListener\('scroll'[\s\S]{0,220}setTimeout\(render,/.test(html),
    'the scroll handler never re-runs the full layout');
  assert(/_suppressScroll\s*=\s*true/.test(html) && /if\s*\(_suppressScroll\)\s*return/.test(html),
    'programmatic scrollToPresent() jumps do not queue a second render');

  assert(/var\s+newStart\b/.test(html) && /fmtYear\(newStart\)/.test(html),
    'zoomBy() labels the window it enters, not the one it leaves');
})();

// ---------------------------------------------------------------------------
// Inline-script integrity.
//
// flowchart.html once lost the opening <script> of its main block and the
// closing </script> at EOF. The page still "validated" (the audit only parses
// script blocks) while ~1,800 lines of JavaScript rendered as page text and
// none of the graph code ran. A missing closing brace in current-affairs.html
// was even worse: putting it at EOF made the file parse, but it left
// `_generateStaticQuestions` open so the following ~300 functions became local
// to it and unreachable from onclick handlers.
//
// These tests parse every inline block and assert that the public functions are
// declared at brace depth 0 -- parsing alone cannot catch the second bug.
function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1] || '')) continue;
    if (!m[2].trim()) continue;
    out.push({ code: m[2], line: html.slice(0, m.index).split(/\r?\n/).length });
  }
  return out;
}

function parses(code) {
  try { new Function(code); return true; } catch (e) { return false; }
}

// Per-character brace depth, ignoring comments and string/template literals.
// The repository has no parser dependency in CI, so this is deliberately small;
// it only has to be right for the scripts it is pointed at.
function depthMap(js) {
  const depths = new Int32Array(js.length);
  let depth = 0, i = 0, mode = 'code';
  while (i < js.length) {
    depths[i] = depth;
    const c = js[i], n = js[i + 1];
    if (mode === 'line') { if (c === '\n') mode = 'code'; i++; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2; } else i++; continue; }
    if (mode !== 'code') {
      if (c === '\\') { i += 2; continue; }
      if (c === mode) mode = 'code';
      i++; continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i += 2; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') { mode = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return { depths: depths, endDepth: depth };
}

function depthOfFunction(js, name) {
  const map = depthMap(js);
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\b', 'g');
  let m, depth = null;
  while ((m = re.exec(js))) {
    const d = map.depths[m.index];
    if (depth === null || d < depth) depth = d;
  }
  return depth;
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

console.log('\n--- flowchart inline scripts are attached, parsed and visible-text clean ---');
(function () {
  const html = read('flowchart.html');
  const blocks = inlineScripts(html);
  assert(blocks.length >= 2, 'flowchart.html has both inline script blocks', 'found ' + blocks.length);
  blocks.forEach(function (b) {
    assert(parses(b.code), 'flowchart.html inline block at line ' + b.line + ' parses');
  });
  const text = visibleText(html);
  assert(text.indexOf('function showRelationshipDialog') === -1,
    'no JavaScript source is rendered as page text');
  assert(text.indexOf('Relationship Dialog listeners') === -1,
    'the relationship-dialog listener source is not visible');

  const base = rule(html, '.rel-dialog');
  const open = rule(html, '.rel-dialog.on');
  assert(base !== null && /display\s*:\s*none\b/.test(base),
    'relationship dialog base rule hides it', 'base rule: ' + base);
  assert(open !== null && /display\s*:\s*flex\b/.test(open),
    '.rel-dialog.on shows the dialog', 'on rule: ' + open);
  assert(!/id="relDialog"[^>]*style="[^"]*display\s*:/.test(html),
    'no inline display on #relDialog can outrank .on');
  assert(/function\s+isCardNeighbour\b/.test(html) && /_cardClickTimer/.test(html),
    'single click and double click are disambiguated');
  assert(/CADJ\[CUR\]/.test(html) && /CADJ\[branchId\]/.test(html),
    'relationship lookup reads authored CADJ edges, not only ADJ');
})();

// ---------------------------------------------------------------------------
// Flowchart draws only hand-authored mind-trees.
//
// data/topic-layers.json carries 32 authored trees and 534 machine-generated
// co-mention buckets (`_gen:true`). The page used to give both the layered
// layout, so "People & Leaders / Geography & Places" wrappers around
// "mentioned with" counts looked like authored structure. The load path must
// skip `_gen` entries outright; a topic with no authored tree falls back to the
// verified graph or an honest empty state.
console.log('\n--- flowchart draws only authored mind-trees ---');
(function () {
  const html = read('flowchart.html');
  assert(/if\(topic\._gen\)\{GEN_SKIPPED\+\+;return;\}/.test(html),
    'generated topic-layers entries are skipped at load');
  assert(html.indexOf('auto-generated layers') === -1,
    'no card can be labelled as auto-generated layers any more');
  assert(/Only hand-written trees are drawn/.test(html),
    'the footer states the authored-only rule');

  const layers = JSON.parse(read('data/topic-layers.json'));
  const authored = Object.keys(layers).filter(function (k) {
    return layers[k] && !layers[k]._gen && (layers[k].branches || []).length;
  });
  assert(authored.length >= 30, 'the authored tree bank is still present',
    'found ' + authored.length);
  let emptyBranch = 0;
  authored.forEach(function (k) {
    (layers[k].branches || []).forEach(function (b) {
      if (!String(b.title || '').trim() || !(b.items || []).length) emptyBranch++;
    });
  });
  assert(emptyBranch === 0, 'every authored branch has a title and items',
    emptyBranch + ' empty branches');
})();

console.log('\n--- current-affairs inline functions stay at top level ---');
(function () {
  const html = read('current-affairs.html');
  const blocks = inlineScripts(html);
  const block = blocks.filter(function (b) { return b.code.indexOf('function _generateStaticQuestions') !== -1; })[0];
  assert(!!block, 'current-affairs.html has the inline quiz script');
  if (!block) return;
  assert(parses(block.code), 'current-affairs.html inline quiz script parses');
  assert(depthMap(block.code).endDepth === 0,
    'inline quiz script braces balance exactly',
    'end depth: ' + depthMap(block.code).endDepth);
  ['_generateStaticQuestions', '_loadCourseStaticQuestions', 'startStaticGk',
   'startCategoryQuiz', 'toggleUpscOnly'].forEach(function (name) {
    assert(depthOfFunction(block.code, name) === 0,
      name + ' is declared at top level',
      'depth: ' + depthOfFunction(block.code, name));
  });
})();

// ---------------------------------------------------------------------------
// Content-source checkboxes.
//
// The filter used to test the Generators branch before Course Lessons. Course
// questions carry `_wikiCat='course-lesson'`, `type='mcq'` and `source='course'`,
// so they matched Generators first: unticking Generators hid course questions
// and unticking Course Lessons changed nothing. Exercise the extracted function
// against a fake DOM so the source mapping stays one-to-one.
function extractNamedFunction(js, name) {
  const start = js.indexOf('function ' + name + '(');
  if (start === -1) return null;
  const brace = js.indexOf('{', start);
  if (brace === -1) return null;
  let depth = 0, i = brace, mode = 'code';
  for (; i < js.length; i++) {
    const c = js[i], n = js[i + 1];
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i++; } continue; }
    if (mode !== 'code') {
      if (c === '\\') { i++; continue; }
      if (c === mode) mode = 'code';
      continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i++; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { mode = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return js.slice(start, i + 1); }
  }
  return null;
}

console.log('\n--- content-source checkboxes map to exactly one source ---');
(function () {
  const html = read('current-affairs.html');
  const src = extractNamedFunction(html, '_passesContentFilter');
  assert(!!src, '_passesContentFilter() is defined');
  if (!src) return;
  const boxes = {};
  const doc = {
    getElementById: function (id) { return { checked: boxes[id] !== false }; }
  };
  let filter;
  try {
    filter = new Function('document', src + '\nreturn _passesContentFilter;')(doc);
  } catch (e) {
    assert(false, '_passesContentFilter() can be evaluated', e.message);
    return;
  }
  const course = { q: 'x', a: 'y', source: 'course', _src: 'course', _wikiCat: 'course-lesson', type: 'mcq', subject: 'General Awareness' };
  const pib = { q: 'x', a: 'y', source: 'pib', type: 'mcq' };
  const gen = { q: 'x', a: 'y', type: 'mcq', _wikiCat: 'politics' };
  const archive = { q: 'x', a: 'y', source: 'archive', type: 'mcq', _wikiCat: 'history' };

  boxes.courseToggle = true; boxes.genToggle = false;
  assert(filter(course) === true, 'course question survives with Course on and Generators off');
  boxes.courseToggle = false; boxes.genToggle = true;
  assert(filter(course) === false, 'course question is hidden when Course is off even if Generators is on');
  boxes.courseToggle = true; boxes.genToggle = true;
  assert(filter(course) === true, 'course question survives with both on');

  boxes.pibToggle = false;
  assert(filter(pib) === false, 'PIB question respects the PIB checkbox');
  boxes.pibToggle = true;
  assert(filter(pib) === true, 'PIB question returns when PIB is enabled');

  boxes.genToggle = false;
  assert(filter(gen) === false, 'generator question respects the Generators checkbox');
  boxes.genToggle = true;
  assert(filter(gen) === true, 'generator question returns when Generators is enabled');

  boxes.archiveToggle = false;
  assert(filter(archive) === false, 'archive question respects the Archive checkbox');
  boxes.archiveToggle = true;
  assert(filter(archive) === true, 'archive question returns when Archive is enabled');
})();


console.log('\n--- the quiz applies curated category moves before display ---');
(function () {
  const html = read('current-affairs.html');
  const src = extractNamedFunction(html, '_applyCategoryMove');
  assert(!!src, '_applyCategoryMove() is defined');
  assert(/await _categoryMovesReady;/.test(html), 'archive loaders wait for the move registry');
  assert((html.match(/await _categoryMovesReady;/g) || []).length >= 3,
    'all three archive entry points wait for the move registry');
  if (!src) return;
  let reg = [];
  try { reg = JSON.parse(read('data/category-moves.json')).moves || []; } catch (e) {}
  assert(reg.length >= 1, 'the shipped category-move registry is readable');
  let apply;
  try {
    apply = new Function('_CATEGORY_MOVES', src + '\nreturn _applyCategoryMove;')(reg);
  } catch (e) {
    assert(false, '_applyCategoryMove() can be evaluated', e.message);
    return;
  }
  const arp = apply({
    subject: 'Indian Languages', subTopic: 'ARP4761', relevance: 'high', examScope: 'exam',
    scopeReasons: ['stale'], scopeEvidence: ['stale'], scopeVersion: 1
  });
  assert(arp.subject === 'Indian Aviation & Shipping' && arp.category === 'Indian Aviation & Shipping',
    'ARP4761 is shown under Indian Aviation & Shipping');
  assert(arp.relevance === '' && arp.examScope === '', 'stale scope tags are cleared so ExamScope recomputes');
  assert(!arp.scopeReasons && !arp.scopeEvidence && !arp.scopeVersion, 'stale scope evidence is removed');
  assert(arp._categoryMoved === 'arp4761-indian-aviation', 'the applied move is traceable');
  const other = apply({ subject: 'Indian Languages', subTopic: 'Hindi literature' });
  assert(other.subject === 'Indian Languages', 'unlisted subtopics are left untouched');
})();

// The figures rebuild used to regenerate geography-diagrams.html from a head
// template with only charset + title, silently dropping the viewport and meta
// description that aeb302c704 had added by hand. Assert the generated artifact
// and the builder template together so a rerun cannot lose them again.
(function () {
  const page = read('geography-diagrams.html');
  const builder = read('scripts/build-geography-diagrams.js');
  assert(/^<!DOCTYPE html>/i.test(page) && /<\/body><\/html>\s*$/i.test(page),
    'geography-diagrams.html is a complete document');
  assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(page) &&
    /<meta\s+name="viewport"\s+content="[^"]+"/i.test(page),
    'geography-diagrams.html has a description and viewport');
  assert(builder.indexOf('name="description"') !== -1 && builder.indexOf('name="viewport"') !== -1,
    'the geography diagram builder emits description and viewport');
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

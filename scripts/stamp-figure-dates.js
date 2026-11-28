// One-off/on-demand: record when each curated geography figure entered the pack.
//
// WHY A FILE INSTEAD OF A FIELD IN EACH FIGURE ENTRY:
// build-geography-figures.js is a 700-line generated-looking source file and
// hand-editing 43 entries to add a date is a merge hazard for no benefit. The
// dates live in data/figure-added-dates.json, keyed by normalised title, and the
// builder looks them up. Adding a figure means adding one line here, or letting
// stamp-figure-dates.js fill it in from history.
//
// WHY GIT HISTORY RATHER THAN TODAY'S DATE:
// The date has to mean "when this figure was added", not "when this pack was last
// rebuilt". Stamping everything with the run date would be worse than no date at
// all, because it would look authoritative while being wrong.
//
// For a figure added after this ran, there is no blame to read, so it gets the
// current date and `estimated: true` -- flagged rather than passed off as fact.
//
// Usage: node scripts/stamp-figure-dates.js [--write]

var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var SRC = 'scripts/build-geography-figures.js';
var OUT = 'data/figure-added-dates.json';
var AUTO_CACHE = 'data/geo-auto-figures.json';

// MUST match `norm()` in build-geography-figures.js exactly. The builder reduces
// every run of non-alphanumerics to a single space ("India — Seismic Zones
// (BIS)" -> "india seismic zones bis"), so a key built with a laxer norm here
// silently never matches and every figure renders with no date at all.
function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function git(args) {
  return cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// line number (1-based) -> ISO date, from a single blame pass.
// --line-porcelain emits the commit header once per line, so a naive split is
// wrong; the "author-time <epoch>" line belongs to the line block above it.
function blameDates() {
  var out = git(['blame', '--line-porcelain', '--', SRC]);
  var lines = out.split('\n');
  var map = {};
  var lineno = 0;
  var pending = null;
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    var m = /^([0-9a-f]{7,40}) \d+ (\d+)/.exec(L);
    if (m) { lineno = parseInt(m[2], 10); pending = null; continue; }
    if (/^author-time /.test(L)) { pending = new Date(parseInt(L.slice(12).trim(), 10) * 1000).toISOString().slice(0, 10); continue; }
    if (/^author /.test(L) && pending === null) continue;
    if (/^\t/.test(L)) { if (pending && map[lineno] === undefined) map[lineno] = pending; pending = null; }
  }
  return map;
}

// Figure titles sit on a `title:` field, which shares a line with `sec:` -- e.g.
//   sec: 'India · Geophysics', title: 'India — Seismic Zones (BIS)',
// so the match must not be anchored to the start of the line.
function figureTitles(src, dates) {
  var out = {};
  var lines = src.split('\n');
  lines.forEach(function (L, i) {
    var m = /\btitle:\s*'((?:[^'\\]|\\.)*)'/.exec(L);
    if (!m) return;
    var title = m[1]
      // Unescape every \uXXXX, not just the couple that were needed first.
      // Leaving \u2013 or \u00f1 in place produced keys like "enso panel 2 el ni
      // u00f1o", which match nothing, and those figures silently lost their date.
      .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/\\'/g, "'");
    var d = dates[i + 1];
    if (!d) return;
    var key = norm(title);
    if (out[key] === undefined || d < out[key].added) out[key] = { added: d, estimated: false, title: title };
  });
  return out;
}

function main() {
  var write = process.argv.indexOf('--write') >= 0;
  // Read the COMMITTED file, not the working tree. `git blame` reports line
  // numbers for HEAD, so pairing it with an edited working copy silently pairs
  // every title with the wrong line -- and therefore the wrong date. A figure
  // that is not committed yet simply has no blame to read, which is correct:
  // it has no real added date until it is committed.
  var src = git(['show', 'HEAD:' + SRC]);
  var dates = blameDates();
  var figs = figureTitles(src, dates);
  var keys = Object.keys(figs);
  console.log('blamed lines: ' + Object.keys(dates).length);
  console.log('curated figures with a real date: ' + keys.length);

  var stamped = 0, missing = 0;
  keys.forEach(function (k) { if (figs[k].added) stamped++; else missing++; });
  console.log('stamped: ' + stamped + ' | missing: ' + missing);

  // Auto-discovered picks get their date from when they first entered the cache,
  // so the pack can show a truthful date for those too.
  var autoFile = path.join(ROOT, AUTO_CACHE);
  var cache = {};
  if (fs.existsSync(autoFile)) { try { cache = JSON.parse(fs.readFileSync(autoFile, 'utf8')); } catch (e) { cache = {}; } }
  var autoKeys = Object.keys(cache);
  var autoDates = {};
  if (autoKeys.length) {
    try {
      var rawDates = blameDatesForFile(AUTO_CACHE, autoKeys);
      autoKeys.forEach(function (k) { autoDates[norm(k)] = rawDates[k] || null; });
    } catch (e) { console.log('auto date probe skipped: ' + e.message); }
  }
  console.log('auto cache entries: ' + autoKeys.length);

  if (!write) { console.log('dry run; pass --write to update ' + OUT); return; }

  var payload = { note: 'Date each geography figure entered the pack. Curated titles come from git blame of ' + SRC + '. "estimated": true means no blame was available.', figures: {}, auto: {} };
  keys.sort().forEach(function (k) { payload.figures[k] = { added: figs[k].added, estimated: !!figs[k].estimated, title: figs[k].title }; });
  autoKeys.sort().forEach(function (k) { if (autoDates[norm(k)]) payload.auto[norm(k)] = { added: autoDates[norm(k)], estimated: false, topic: k }; });

  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(payload, null, 2) + '\n');
  console.log('wrote ' + OUT + ' (' + Object.keys(payload.figures).length + ' curated, ' + Object.keys(payload.auto).length + ' auto)');
}

// blame a second file (the auto cache) for the lines that first introduced a key
function blameDatesForFile(file, keys) {
  var out = git(['blame', '--line-porcelain', '--', file]);
  var lines = out.split('\n');
  var normKeys = keys.map(norm);
  var byKey = {};
  var lineno = 0, pending = null;
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    var m = /^([0-9a-f]{7,40}) \d+ (\d+)/.exec(L);
    if (m) { lineno = parseInt(m[2], 10); pending = null; continue; }
    if (/^author-time /.test(L)) { pending = new Date(parseInt(L.slice(12).trim(), 10) * 1000).toISOString().slice(0, 10); continue; }
    if (/^\t/.test(L)) {
      // The tab-prefixed line is the file content for this line number; match the
      // quoted key in it so each topic gets the date its line was introduced.
      var content = L.slice(1);
      if (pending) {
        normKeys.forEach(function (k) {
          if (byKey[k] === undefined && content.toLowerCase().indexOf('"' + k + '"') >= 0) byKey[k] = pending;
        });
      }
      pending = null;
    }
  }
  var res = {};
  keys.forEach(function (k) { if (byKey[norm(k)]) res[k] = byKey[norm(k)]; });
  return res;
}

main();
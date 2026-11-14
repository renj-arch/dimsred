#!/usr/bin/env node
/*
 * build-production-pages.js -- render standalone production dossiers from
 * data/films/<id>-production.json.
 *
 * Every number on a dossier page comes from the film's approved release:
 * qc.json, edit-manifest.json, timeline.json and metadata.json. The JSON is the
 * source of truth; this renderer only lays it out. Run:
 *
 *   node scripts/build-production-pages.js
 *
 * Pages are written next to the site root as <id>-production.html so a direct
 * link survives without a query string. production.html?film=<id> redirects to
 * them.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var DATA = path.join(ROOT, 'data', 'films');
var CSS = fs.readFileSync(path.join(__dirname, 'templates', 'production.css'), 'utf8').trim();

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function num(n) { return Number(n).toLocaleString('en-GB'); }
function dur(seconds) {
  seconds = Math.round(Number(seconds) || 0);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

function head(p, description) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '<title>Proof of work — ' + esc(p.title) + ' | vlymbooq</title>\n' +
    '<meta name="description" content="' + esc(description) + '" />\n' +
    '<meta property="og:type" content="article" />\n' +
    '<meta property="og:title" content="Proof of work — ' + esc(p.title) + '" />\n' +
    '<meta property="og:description" content="' + esc(description) + '" />\n' +
    '<meta property="og:image" content="' + esc(p.poster) + '" />\n' +
    '<style>\n' + CSS + '\n</style>\n</head>\n<body>\n<div class="grain"></div>\n';
}

function top(p) {
  return '<header class="top">\n  <div class="wrap">\n' +
    '    <a class="brand" href="index.html"><b>vlymbooq</b> · production dossier</a>\n' +
    '    <nav>\n' +
    '      <a href="#cut">The cut</a>\n' +
    '      <a href="#motion">Motion</a>\n' +
    '      <a href="#frames">Frames</a>\n' +
    '      <a href="#sources">Sources</a>\n' +
    '      <a href="#pipeline">Pipeline</a>\n' +
    '      <a href="#record">Record</a>\n' +
    '      <a href="films.html">All films</a>\n' +
    '      <a href="' + esc(p.watchUrl) + '">Watch</a>\n' +
    '    </nav>\n  </div>\n</header>\n';
}

function hero(p) {
  var film = p.edit;
  var total = 0;
  (film.scenes || []).forEach(function (s) { total += Number(s.duration) || 0; });
  var fps = Number(film.fps) || 24;
  var rows = [
    ['Final runtime', dur(total)],
    ['Total frames', num(Math.round(total * fps))],
    ['Capture', fps + ' fps · ' + (film.width || 1920) + '×' + (film.height || 1080)],
    ['Sources', String((p.sources.items || []).length)],
    ['Release', 'run ' + p.release.run],
    ['Master', p.release.masterMiB + ' MiB']
  ];
  return '<main>\n' +
    '  <section class="hero wrap">\n' +
    '    <div class="eyebrow">\n' +
    '      <span>' + esc(p.eyebrow) + '</span>\n' +
    '      <span>Proof of work · run ' + p.release.run + '</span>\n' +
    '    </div>\n' +
    '    <h1>THE<br><em>MAKING</em></h1>\n' +
    '    <p class="lede">' + esc(p.lede) + '</p>\n\n' +
    '    <div class="hero-grid">\n' +
    '      <figure class="poster">\n' +
    '        <img src="' + esc(p.poster) + '" alt="' + esc(p.posterAlt) + '" />\n' +
    '        <span class="stamp">' + esc(p.posterStamp) + '</span>\n' +
    '        <figcaption><span>' + esc(p.subtitle) + '</span><span>vlymbooq</span></figcaption>\n' +
    '      </figure>\n' +
    '      <div class="film-card">\n' +
    '        <div class="status"><i></i><span>' + esc(p.status) + '</span></div>\n' +
    '        <h2>' + esc(p.title) + '</h2>\n' +
    '        <p>' + esc(p.intro) + '</p>\n' +
    '        <div class="actions">\n' +
    '          <a class="btn strong" href="' + esc(p.watchUrl) + '">Watch the cut →</a>\n' +
    '          <a class="btn" href="' + esc(p.debateUrl) + '">Open the argument</a>\n' +
    '        </div>\n' +
    '        <dl class="receipt">\n' +
    rows.map(function (r) {
      return '          <div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>\n';
    }).join('') +
    '        </dl>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </section>\n';
}

function stats(p) {
  return '  <section class="stats" aria-label="Production statistics">\n' +
    '    <div class="wrap">\n' +
    p.stats.map(function (s) {
      return '      <div class="stat"><b>' + esc(s.value) + '</b><span>' + esc(s.label) +
        '</span><small>' + esc(s.note || '') + '</small></div>\n';
    }).join('') +
    '    </div>\n  </section>\n';
}

function sectionHead(no, tag, heading, body) {
  return '    <div class="section-head">\n' +
    '      <div class="no">' + esc(no) + '</div>\n' +
    '      <div>\n' +
    '        <span class="tag">' + esc(tag) + '</span>\n' +
    '        <h2>' + esc(heading) + '</h2>\n' +
    '        <p>' + esc(body) + '</p>\n' +
    '      </div>\n' +
    '    </div>\n';
}

function timeline(film) {
  var all = [];
  (film.scenes || []).forEach(function (scene) {
    (scene.shots || []).forEach(function (shot) {
      all.push(shot);
    });
  });  var total = all.reduce(function (n, s) { return n + (Number(s.duration) || 0); }, 0) || 1;
  var bars = all.map(function (s) {
    var d = Number(s.duration) || 0;
    var pct = Math.max(0.25, d / total * 100);
    var cls = s.render === 'html' ? 'html' : (s.render === 'title' ? 'title' : 'blender');
    var t = s.transition && (s.transition.type || s.transition);
    var label = s.id + ' · ' + d.toFixed(1) + 's · ' + (t || 'cut');
    return '<i class="' + cls + '" style="flex:0 0 ' + pct.toFixed(3) + '%" title="' + esc(label) + '" aria-label="' + esc(label) + '"></i>';
  }).join('');
  return '    <div class="compare">\n' +
    '      <div class="bar-row">\n' +
    '        <div class="bar-label"><b>Final cut</b><span>' + all.length + ' shots · ' + dur(total) + ' · approved</span></div>\n' +
    '        <div class="bar" aria-label="Final cut: ' + all.length + ' shots">' + bars + '</div>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '    <div class="legend">\n' +
    '      <span><b class="blender"></b> Blender set</span>\n' +
    '      <span><b class="html"></b> Typographic card</span>\n' +
    '      <span><b class="title"></b> Title card</span>\n' +
    '    </div>\n';
}

function scenes(film, p) {
  var byId = {};
  (p.sources.items || []).forEach(function (s) { byId[s.id] = s; });
  return '<div class="scenes">\n' +
    (film.scenes || []).map(function (scene, i) {
      var lines = scene.narration || [];
      var shots = scene.shots || [];
      var lineHtml = lines.map(function (l) {
        var s = byId[l.source];
        var label = s ? (s.publisher || 'source') + ' · ' + s.id : l.source;
        return '<li><span class="txt">' + esc(l.text) + '</span><span class="src">' + esc(label) + '</span></li>';
      }).join('');
      var chipHtml = shots.map(function (s) {
        var t = s.transition && (s.transition.type || s.transition);
        return '<span class="chip"><b>' + esc(s.id) + '</b> · ' + esc(s.plate) + ' <em>' + esc(t || 'cut') + '</em></span>';
      }).join('');
      return '<details class="scene"' + (i === 0 ? ' open' : '') + '>' +
        '<summary><span class="n">' + esc(scene.id) + '</span>' +
        '<h3>' + esc(scene.title) + '</h3>' +
        '<span class="meta">' + shots.length + ' shots · ' + Math.round(Number(scene.duration) || 0) + 's · ' + lines.length + ' lines</span>' +
        '<span class="plus">+</span></summary>' +
        '<div class="scene-body"><p class="scene-purpose">' + esc(scene.purpose || '') + '</p>' +
        '<ul class="lines">' + lineHtml + '</ul>' +
        '<div class="chips">' + chipHtml + '</div></div></details>\n';
    }).join('') +
    '</div>\n';
}

function motion(p) {
  var sig = (p.motion.signature || []).map(function (s) {
    return '<span class="chip">' + esc(s) + '</span>';
  }).join('');
  return '  <section class="section wrap" id="motion">\n' +
    sectionHead('02 / MOTION', p.motion.tag, p.motion.heading, p.motion.body) +
    '    <div class="chips" style="margin:0 0 18px">' + sig + '</div>\n' +
    '    <div class="transition-grid">\n' +
    (p.motion.families || []).map(function (f) {
      return '      <article class="trans-card"><div class="count">' + esc(f.count) + '</div>' +
        '<h3>' + esc(f.name) + '</h3><p>' + esc(f.use) + '</p></article>\n';
    }).join('') +
    '    </div>\n  </section>\n';
}

function frames(p) {
  return '  <section class="section wrap" id="frames">\n' +
    sectionHead('03 / FRAMES', p.frames.tag, p.frames.heading, p.frames.body) +
    '    <div class="frame-strip">\n' +
    (p.frames.items || []).map(function (f, i) {
      return '      <figure class="frame"><img loading="lazy" src="' + esc(f.src) + '" alt="' + esc(f.alt) + '" />' +
        '<figcaption><span>' + esc(f.label) + '</span><b>' + String(i + 1).padStart(2, '0') + '</b></figcaption></figure>\n';
    }).join('') +
    '    </div>\n' +
    '    <figure class="contact">\n' +
    '      <img loading="lazy" src="' + esc(p.frames.contact.src) + '" alt="Contact sheet of every scene frame in the approved final cut." />\n' +
    '      <figcaption><span><b>Contact sheet:</b> ' + esc(p.frames.contact.note) + '</span><span>' + esc(p.frames.contact.count) + ' frames</span></figcaption>\n' +
    '    </figure>\n  </section>\n';
}

function sources(p) {
  return '  <section class="section wrap" id="sources">\n' +
    sectionHead('04 / EVIDENCE', p.sources.tag, p.sources.heading, p.sources.body) +
    '    <div class="source-list">\n' +
    (p.sources.items || []).map(function (s) {
      var pub = s.publisher || '';
      if (s.accessed) pub += ' · accessed ' + s.accessed;
      return '      <div class="source-row"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' +
        '<span class="pub">' + esc(pub) + '</span>' +
        '<span class="uses">' + esc(s.lines) + ' lines</span></div>\n';
    }).join('') +
    '    </div>\n  </section>\n';
}

function pipeline(p) {
  return '  <section class="section wrap" id="pipeline">\n' +
    sectionHead('05 / PIPELINE', p.pipeline.tag, p.pipeline.heading, p.pipeline.body) +
    '    <div class="pipeline-grid">\n' +
    (p.pipeline.items || []).map(function (x) {
      return '      <article class="pipe"><div class="step">' + esc(x.step) + '</div>' +
        '<h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p>' +
        '<code>' + esc(x.path) + '</code></article>\n';
    }).join('') +
    '    </div>\n  </section>\n';
}

function record(p) {
  return '  <section class="section wrap" id="record">\n' +
    sectionHead('06 / RECORD', p.record.tag, p.record.heading, p.record.body) +
    '    <div class="iterations">\n' +
    (p.record.items || []).map(function (it) {
      return '      <article class="iter"><div class="when">' + esc(it.date) + '</div>' +
        '<h3>' + esc(it.title) + '</h3><p>' + esc(it.body) + '</p></article>\n';
    }).join('') +
    '    </div>\n  </section>\n';
}

function buildSection(p) {
  return '  <section class="section wrap" id="build">\n' +
    sectionHead('07 / BUILD LOG', p.build.tag, p.build.heading, p.build.body) +
    '    <div class="build-log" id="buildLog">\n' +
    '      <div class="build"><span class="state live">reading</span><span class="what">Fetching the public build log…</span><span class="when">GitHub</span></div>\n' +
    '    </div>\n' +
    '    <p class="build-note">Source: <a href="' + esc(p.links.workflow) + '" target="_blank" rel="noopener">github.com/renj-arch/dimsred/actions/workflows/film.yml</a></p>\n' +
    '  </section>\n';
}

function credits(p) {
  return '  <section class="section wrap" id="credits">\n' +
    sectionHead('08 / CREDITS', p.credits.tag, p.credits.heading, p.credits.body || p.credits.heading) +
    '    <div class="credits">\n' +
    '      <div>\n' +
    '        <dl class="credit-grid">\n' +
    (p.credits.items || []).map(function (c) {
      return '          <div class="credit"><dt>' + esc(c.role) + '</dt><dd>' + esc(c.name) + '</dd></div>\n';
    }).join('') +
    '        </dl>\n' +
    '        <div class="closing">\n' +
    '          <p>' + esc(p.credits.quote) + '</p>\n' +
    '          <p style="margin-top:10px;font-family:var(--sans);font-size:.8rem;color:var(--muted)">' + esc(p.credits.quoteNote) + '</p>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <div>\n' +
    '        <ul class="rules">\n' +
    (p.credits.rules || []).map(function (r) { return '          <li>' + esc(r) + '</li>\n'; }).join('') +
    '        </ul>\n' +
    '      </div>\n' +
    '    </div>\n  </section>\n';
}

function footer(p) {
  return '</main>\n\n<footer>\n  <div class="wrap">\n' +
    '    <span>vlymbooq · production dossier · ' + esc(p.title) + '</span>\n' +
    '    <span>\n' +
    '      <a href="production.html?film=jallianwala-bagh">Jallianwala</a> ·\n' +
    '      <a href="salt-march-production.html">Salt</a> ·\n' +
    '      <a href="the-vatican-archives-production.html">Vatican</a> ·\n' +
    '      <a href="emergency-1975-production.html">Emergency</a> ·\n' +
    '      <a href="bhopal-gas-tragedy-production.html">Bhopal</a> ·\n' +
    '      <a href="films.html">All films</a> ·\n' +
    '      <a href="' + esc(p.links.repository) + '" target="_blank" rel="noopener">Source</a>\n' +
    '    </span>\n' +
    '  </div>\n</footer>\n';
}

function buildLogScript(p) {
  var api = JSON.stringify(p.links.runsApi);
  return '<script>\n(function(){\n' +
    '  "use strict";\n' +
    '  var el = document.getElementById("buildLog");\n' +
    '  if (!el) return;\n' +
    '  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"\\\']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\\\'":"&#39;"}[c]; }); };\n' +
    '  fetch(' + api + ', { headers: { "Accept": "application/vnd.github+json" } })\n' +
    '    .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })\n' +
    '    .then(function(data){\n' +
    '      var runs = (data && data.workflow_runs) || [];\n' +
    '      if (!runs.length) throw new Error("no runs");\n' +
    '      el.innerHTML = runs.map(function(run){\n' +
    '        var status = run.status === "in_progress" ? "running" : (run.conclusion || run.status || "unknown");\n' +
    '        var cls = /success/.test(status) ? "ok" : (/in_progress|queued|running/.test(status) ? "live" : (/cancel|fail/.test(status) ? "bad" : ""));\n' +
    '        var when = run.created_at ? new Date(run.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";\n' +
    '        var title = (run.head_commit && run.head_commit.message ? run.head_commit.message.split("\\n")[0] : "Film pipeline") + " · #" + run.run_number;\n' +
    '        return \'<a class="build" href="\' + esc(run.html_url) + \'" target="_blank" rel="noopener">\' +\n' +
    '          \'<span class="state \' + cls + \'">\' + esc(status) + \'</span>\' +\n' +
    '          \'<span class="what">\' + esc(title) + \'<small>\' + esc(run.event || "workflow_dispatch") + " · " + esc(run.head_branch || "") + \'</small></span>\' +\n' +
    '          \'<span class="when">\' + esc(when) + \'</span></a>\';\n' +
    '      }).join("");\n' +
    '    })\n' +
    '    .catch(function(){\n' +
    '      el.innerHTML = \'<div class="build"><span class="state bad">unavailable</span>\' +\n' +
    '        \'<span class="what">The public API did not answer. The workflow log is still public.<small>GitHub Actions</small></span>\' +\n' +
    '        \'<span class="when"><a href="' + esc(p.links.workflow) + '" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:none">open</a></span></div>\';\n' +
    '    });\n' +
    '})();\n</script>\n';
}

function render(p) {
  var film = p.edit;
  var description = p.title + ' production dossier: ' + (film.scenes || []).length + ' scenes, ' +
    (film.shots || []).length + ' shots, ' + (p.sources.items || []).length + ' sources, ' +
    (p.frames.items || []).length + ' frame studies, and the independent QC that gated the 1080 master.';
  var html = head(p, description) + top(p) + hero(p) + stats(p) +
    '  <section class="section wrap" id="cut">\n' +
    sectionHead('01 / EDIT', p.cut.tag, p.cut.heading, p.cut.body) +
    timeline(film) +
    scenes(film, p) +
    '  </section>\n' +
    motion(p) + frames(p) + sources(p) + pipeline(p) + record(p) + buildSection(p) + credits(p) +
    footer(p) + buildLogScript(p) + '</body>\n</html>\n';
  return html;
}

var files = fs.readdirSync(DATA).filter(function (f) { return /-production\.json$/.test(f); });
var built = 0;
files.forEach(function (file) {
  var p = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
  if (!p.cut || !p.motion || !p.frames || !p.record || !p.edit) return;
  var html = render(p);
  var out = path.join(ROOT, p.film + '-production.html');
  fs.writeFileSync(out, html);
  built++;
  console.log('wrote ' + path.basename(out) + ' · ' + Math.round(html.length / 1024) + ' KB');
});
console.log(built + ' production page(s) built');

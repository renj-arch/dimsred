(function () {
  'use strict';

  var app = document.getElementById('app');
  var data = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function srcMap() {
    var map = {};
    (data.sources || []).forEach(function (s) { map[s.id] = s; });
    return map;
  }

  function sourceLink(id, label) {
    var s = srcMap()[id];
    if (!s) return '';
    return '<a class="src" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
      esc(label || s.title) + '</a>';
  }

  function tag(id) {
    var s = srcMap()[id];
    if (!s) return '';
    return '<a class="tag" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.publisher) + '</a>';
  }

  function renderContext() {
    var html = '<div class="section-head"><h2>The room around the march</h2>' +
      '<p>Nine turns in the political fight. The walk did not happen in a vacuum; it happened because the constitutional road had stalled.</p></div>' +
      '<div class="timeline">';
    (data.context || []).forEach(function (e) {
      html += '<article class="event" id="context-' + esc(e.year).replace(/[^a-z0-9]+/gi, '-') + '">' +
        '<div class="year">' + esc(e.year) + '</div><div class="dot"></div>' +
        '<div class="card"><h3>' + esc(e.title) + '</h3><p>' + esc(e.text) + '</p>' +
        sourceLink(e.source) + '</div></article>';
    });
    return html + '</div>';
  }

  function renderDebates() {
    var html = '<div class="section-head"><h2>The arguments</h2>' +
      '<p>Seven questions that still start fights. Each one gives the strongest case on both sides, then names the fact that makes the argument uncomfortable.</p></div>' +
      '<p class="note">Read this as a debate map. The aim is not to tell you what to think. It is to make the disagreement precise enough that evidence can change your mind.</p>';
    (data.debates || []).forEach(function (d, i) {
      html += '<article class="debate" id="' + esc(d.id) + '">' +
        '<div class="num">Argument ' + String(i + 1).padStart(2, '0') + ' · open verdict</div>' +
        '<h3>' + esc(d.question) + '</h3>' +
        '<p class="hook">' + esc(d.hook) + '</p>' +
        '<p class="stakes"><b>Why it still matters.</b> ' + esc(d.stakes) + '</p>' +
        '<div class="cases">' +
          '<div class="case"><h4>The strongest case for</h4><ul>' +
            (d.caseFor || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          '</ul></div>' +
          '<div class="case against"><h4>The strongest case against</h4><ul>' +
            (d.caseAgainst || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          '</ul></div>' +
        '</div>' +
        '<div class="uncomfortable"><h4>The uncomfortable fact</h4><p>' + esc(d.uncomfortable) + '</p></div>' +
        '<p class="change"><b>What would change your mind:</b> ' + esc(d.whatWouldChange) + '</p>' +
        '<div class="tags">' + (d.sources || []).map(tag).join('') + '</div>' +
        '</article>';
    });
    return html;
  }

  function renderSources() {
    var html = '<div class="section-head"><h2>Sources</h2>' +
      '<p>Every factual claim in the timeline points here. Interpretations are arguments, not facts. A source can be wrong; a source can also be improved.</p></div>' +
      '<div class="sources">';
    (data.sources || []).forEach(function (s) {
      html += '<a class="source" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
        '<b>' + esc(s.title) + '</b><span>' + esc(s.publisher) + '</span></a>';
    });
    return html + '</div>';
  }

  function activate(name, push) {
    var tab = name === 'debate' || name === 'sources' ? name : 'context';
    document.querySelectorAll('.tab').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    });
    app.innerHTML = tab === 'debate' ? renderDebates() : tab === 'sources' ? renderSources() : renderContext();
    if (push !== false) history.replaceState(null, '', '#' + tab);
    if (push === 'scroll') {
      var tabs = document.querySelector('.tabs');
      var top = tabs ? tabs.getBoundingClientRect().top + window.scrollY : 0;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function boot() {
    fetch('data/films/salt-march-debates.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        data = json;
        var initial = (location.hash || '#context').replace('#', '');
        activate(initial, false);
        document.querySelectorAll('.tab').forEach(function (b) {
          b.addEventListener('click', function () { activate(b.dataset.tab, 'scroll'); });
        });
      })
      .catch(function (err) {
        app.innerHTML = '<div class="loading" style="color:#e89775">Could not load the argument map: ' + esc(err.message) + '</div>';
      });
  }

  window.addEventListener('hashchange', function () {
    if (data) activate(location.hash.replace('#', '') || 'context', false);
  });

  boot();
})();

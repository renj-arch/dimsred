(function () {
  'use strict';

  var app = document.getElementById('app');
  var params = new URLSearchParams(location.search);
  var requested = params.get('film') || 'salt-march';
  var film = /^[a-z0-9-]+$/.test(requested) ? requested : 'salt-march';
  var data = null;

  function el(id) { return document.getElementById(id); }

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
    var label = s.short || String(s.title || '').split(':')[0];
    if (label.length > 34) label = label.slice(0, 31).replace(/\s+\S*$/, '') + '…';
    return '<a class="tag" href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' +
      esc(s.title) + '">' + esc(label) + '</a>';
  }

  function labels() { return data.labels || {}; }

  function renderStats() {
    var stats = data.stats;
    if (!Array.isArray(stats) || !stats.length) {
      stats = [
        { value: String((data.context || []).length).padStart(2, '0'), label: 'turning points' },
        { value: String((data.debates || []).length).padStart(2, '0'), label: 'arguments' },
        { value: String((data.sources || []).length).padStart(2, '0'), label: 'sources' }
      ];
    }
    el('heroStats').innerHTML = stats.map(function (s) {
      return '<div class="stat"><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');
  }

  function renderContext() {
    var l = labels();
    var html = '<div class="section-head"><h2>' +
      esc(l.contextTitle || 'The room around the argument') + '</h2>' +
      '<p>' + esc(l.contextDek || 'The turns in the political fight.') + '</p></div>' +
      '<div class="timeline">';
    (data.context || []).forEach(function (e) {
      html += '<article class="event" id="context-' +
        esc(String(e.year).replace(/[^a-z0-9]+/gi, '-')) + '">' +
        '<div class="year">' + esc(e.year) + '</div><div class="dot"></div>' +
        '<div class="card"><h3>' + esc(e.title) + '</h3><p>' + esc(e.text) + '</p>' +
        sourceLink(e.source) + '</div></article>';
    });
    return html + '</div>';
  }

  function renderDebates() {
    var l = labels();
    var html = '<div class="section-head"><h2>' +
      esc(l.debateTitle || 'The arguments') + '</h2>' +
      '<p>' + esc(l.debateDek || 'The questions that still start fights.') + '</p></div>' +
      '<p class="note">Read this as a debate map. The aim is not to tell you what to think. ' +
      'It is to make the disagreement precise enough that evidence can change your mind.</p>';
    (data.debates || []).forEach(function (d, i) {
      html += '<article class="debate" id="' + esc(d.id) + '">' +
        '<div class="num">Argument ' + String(i + 1).padStart(2, '0') + ' &middot; open verdict</div>' +
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
    var l = labels();
    var html = '<div class="section-head"><h2>' +
      esc(l.sourcesTitle || 'Sources') + '</h2>' +
      '<p>' + esc(l.sourcesDek || 'Every factual claim points here.') + '</p></div>' +
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
    app.innerHTML = tab === 'debate' ? renderDebates()
      : tab === 'sources' ? renderSources() : renderContext();
    if (push !== false) history.replaceState(null, '', '#' + tab);
    if (push === 'scroll') {
      var tabs = document.querySelector('.tabs');
      var top = tabs ? tabs.getBoundingClientRect().top + window.scrollY : 0;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function paint() {
    var headline = data.headline || esc(data.title || 'THE ARGUMENT');
    document.title = (data.title || 'The argument').replace(/<br\s*\/?>/gi, ' ') +
      ' \u00b7 ' + (data.filmTitle || data.subtitle || 'vlymbooq');
    var md = document.getElementById('metaDesc');
    if (md) md.setAttribute('content', data.dek || data.subtitle || '');
    el('heroKicker').textContent = data.kicker || 'Politics is not background';
    el('heroTitle').innerHTML = headline;
    el('heroSub').textContent = data.subtitle || '';
    el('heroDek').textContent = data.dek || '';
    var eye = el('heroEye');
    if (data.eyeopener) {
      eye.innerHTML = '<strong>An eye-opener.</strong> ' + esc(data.eyeopener);
      eye.hidden = false;
    } else {
      eye.hidden = true;
    }
    renderStats();
    var filmHref = 'film.html?film=' + encodeURIComponent(film);
    el('backLink').href = filmHref;
    el('footLink').href = filmHref;
  }

  function boot() {
    fetch('data/films/' + film + '-debates.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        data = json;
        paint();
        var initial = (location.hash || '#context').replace('#', '');
        activate(initial, false);
        document.querySelectorAll('.tab').forEach(function (b) {
          b.addEventListener('click', function () { activate(b.dataset.tab, 'scroll'); });
        });
      })
      .catch(function (err) {
        app.innerHTML = '<div class="loading" style="color:#e89775">Could not load the argument map: ' +
          esc(err.message) + '. <a href="debates.html">Open the Salt March argument</a>.</div>';
      });
  }

  window.addEventListener('hashchange', function () {
    if (data) activate(location.hash.replace('#', '') || 'context', false);
  });

  boot();
})();

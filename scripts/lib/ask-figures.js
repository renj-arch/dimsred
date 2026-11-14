// Vlymbooq Ask Figures: attach relevant sketches from the site's figure
// library to an answer, so a UPSC write-up can carry its diagrams.
//
// The library is data/ask-figures.json -- a compact index built from
// data/figure-published.json by scripts/build-ask-figures.js. Matching is
// deliberately conservative: a wrong diagram beside an answer is worse than
// no diagram, so a topic attaches only when the question shares distinctive
// (length >= 4, non-stopword) words with it, and the shared words must add up
// to real signal -- one generic hit is not enough.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VlymbooqAskFigures = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOP = {
    the: 1, and: 1, for: 1, with: 1, from: 1, into: 1, about: 1, that: 1,
    this: 1, what: 1, why: 1, how: 1, when: 1, where: 1, which: 1, who: 1,
    whom: 1, whose: 1, explain: 1, discuss: 1, describe: 1, write: 1,
    short: 1, note: 1, notes: 1, state: 1, assess: 1, examine: 1, comment: 1,
    critically: 1, its: 1, their: 1, have: 1, has: 1, does: 1, doing: 1,
    been: 1, over: 1, under: 1, between: 1, during: 1, before: 1, after: 1,
    while: 1, india: 1, indian: 1, year: 1, years: 1, role: 1, main: 1
  };

  var dataPromise = null;

  function load() {
    if (!dataPromise) {
      dataPromise = fetch('data/ask-figures.json').then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; });
    }
    return dataPromise;
  }

  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /s$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function tokens(text) {
    var out = [];
    String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .forEach(function (w) {
        if (w.length < 4 || STOP[w]) return;
        out.push(stem(w));
      });
    return out;
  }

  function topicTokens(topic) {
    var out = [];
    String(topic || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .forEach(function (w) {
        if (w.length < 4 || STOP[w]) return;
        out.push(stem(w));
      });
    return out;
  }

  function match(t, q) {
    if (t === q) return true;
    // Prefix matching only for long words, so "constitution" meets
    // "constitutional" but "cattle" never meets "category".
    if (t.length >= 6 && q.length >= 6 && (t.indexOf(q) === 0 || q.indexOf(t) === 0)) return true;
    return false;
  }

  function scoreTopic(qtoks, topic) {
    var ttoks = topicTokens(topic);
    if (!ttoks.length) return 0;
    var score = 0, used = {};
    ttoks.forEach(function (t) {
      for (var i = 0; i < qtoks.length; i++) {
        if (used[qtoks[i]]) continue;
        if (match(t, qtoks[i])) {
          used[qtoks[i]] = 1;
          score += Math.min(t.length, 10);
          break;
        }
      }
    });
    // Whole-topic phrase in the question is the strongest signal there is.
    var phrase = String(topic || '').toLowerCase();
    var ql = String(qLower || '').toLowerCase();
    if (phrase.length > 6 && ql.indexOf(phrase) !== -1) score += 6;
    return score;
  }

  // qLower is set by pick() for scoreTopic's phrase bonus; module-scoped so the
  // scorer stays a plain function (same style as the other ask libs).
  var qLower = '';

  function pick(data, q, maxTopics) {
    if (!data || !Array.isArray(data.topics) || !q) return [];
    qLower = String(q).toLowerCase();
    var qtoks = tokens(q);
    if (!qtoks.length) return [];
    var scored = [];
    data.topics.forEach(function (row) {
      var topic = row[0], files = row[1] || [];
      if (!files.length) return;
      var s = scoreTopic(qtoks, topic);
      if (s >= 4) scored.push({ topic: topic, files: files, score: s });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    if (!scored.length) return [];
    var out = [scored[0]];
    var cap = maxTopics || 2;
    for (var i = 1; i < scored.length && out.length < cap; i++) {
      if (scored[i].score >= scored[0].score * 0.6) out.push(scored[i]);
    }
    return out;
  }

  function fileUrl(file, w) {
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(file) + '?width=' + (w || 420);
  }

  function build(picked) {
    var wrap = document.createElement('div');
    wrap.className = 'ask-figs';
    wrap.style.cssText = 'margin-top:22px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02)';
    var h = document.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:.95em;margin-bottom:4px';
    h.textContent = '\uD83D\uDDBC\uFE0F Sketches for your write-up';
    wrap.appendChild(h);
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:.78em;color:#a1a1aa;margin-bottom:10px';
    sub.textContent = 'Diagrams from the site\u2019s figure library matched to this question \u2014 click to open the full-resolution file.';
    wrap.appendChild(sub);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px';
    var shown = 0;
    picked.forEach(function (t) {
      t.files.forEach(function (file) {
        if (shown >= 4) return;
        shown++;
        var a = document.createElement('a');
        a.href = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file);
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.cssText = 'display:block;text-decoration:none;color:inherit';
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = t.topic;
        img.style.cssText = 'width:100%;height:110px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:#111113';
        // A dead hotlink removes its own card instead of leaving a broken icon.
        img.addEventListener('error', function () { a.remove(); });
        img.src = fileUrl(file);
        a.appendChild(img);
        var cap = document.createElement('div');
        cap.style.cssText = 'font-size:.72em;color:#a1a1aa;margin-top:4px;line-height:1.3';
        cap.textContent = t.topic;
        a.appendChild(cap);
        grid.appendChild(a);
      });
    });
    wrap.appendChild(grid);

    var more = document.createElement('a');
    more.href = 'figures/index.html';
    more.target = '_blank';
    more.rel = 'noopener';
    more.style.cssText = 'display:inline-block;margin-top:10px;font-size:.78em;color:#a78bfa';
    more.textContent = 'Browse the full figure library \u2192';
    wrap.appendChild(more);
    return wrap;
  }

  // Called after every answer render; a no-op when nothing matches, when the
  // page is still loading, or when a strip already sits under this answer.
  function decorate(outEl, q) {
    if (!outEl || !q) return;
    if (outEl.querySelector('.ask-figs, .load, .err, .empty')) return;
    if ((outEl.textContent || '').trim().length < 200) return;
    load().then(function (data) {
      var picked = pick(data, q);
      if (!picked.length) return;
      if (outEl.querySelector('.ask-figs, .load, .err')) return;
      outEl.appendChild(build(picked));
    }).catch(function () {});
  }

  // Watch the output pane so every render path (LLM, mains, question bank,
  // timeline, future ones) gets figures without each having to call us.
  function watch(outEl, qGetter) {
    if (!outEl || typeof MutationObserver === 'undefined') return;
    var timer = null;
    new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        try { decorate(outEl, qGetter && qGetter()); } catch (e) {}
      }, 150);
    }).observe(outEl, { childList: true });
  }

  return { decorate: decorate, watch: watch, pick: pick, fileUrl: fileUrl, _tokens: tokens };
}));

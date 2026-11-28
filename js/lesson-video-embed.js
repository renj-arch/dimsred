/* lesson-video-embed.js — show a lesson's lecture video when one is published.
 *
 * Reads /data/lesson-videos.json and matches the current lesson path. Only
 * entries rendered from the audited lesson under media/ are shown; preview or
 * truncated renders are ignored. If nothing matches, the page is untouched.
 */
(function () {
  'use strict';
  function norm(p) { return String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').replace(/\.html$/i, '').toLowerCase(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  fetch('/data/lesson-videos.json?cb=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (!m || !m.lessons) return;
      var here = norm(location.pathname);
      var key = null;
      Object.keys(m.lessons).forEach(function (k) { if (norm(k) === here) key = k; });
      if (!key) return;
      var e = m.lessons[key];
      if (!e || !e.video || e.video.indexOf('media/') !== 0 || e.truncated) return;

      var mins = Math.max(1, Math.round((e.durationSec || 0) / 60));
      var host = document.getElementById('lesson-body') || document.querySelector('.lesson-body') || document.querySelector('h1');
      if (!host) return;
      var section = document.createElement('section');
      section.className = 'lesson-video-embed';
      section.setAttribute('style', 'margin:18px 0 24px;border:1px solid rgba(167,139,250,.28);border-radius:14px;overflow:hidden;background:#111113');
      section.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.07)">' +
          '<div style="font-weight:800;letter-spacing:.02em">🎬 Lecture video <span style="color:#6ee7b7;font-size:.78em;font-weight:700;margin-left:6px">✓ fact-audited</span></div>' +
          '<a href="/lesson-videos.html" style="font-size:.8em;color:#a78bfa;text-decoration:none">All lecture videos →</a>' +
        '</div>' +
        '<video controls preload="metadata" playsinline src="/' + esc(e.video) + '" style="width:100%;display:block;aspect-ratio:16/9;background:#000"></video>' +
        '<div style="padding:8px 16px 12px;color:#a1a1aa;font-size:.78em;line-height:1.5">' +
          mins + ' min · ' + (e.slides || 0) + ' slides · ' + (e.coverage || 100) + '% of this lesson covered' +
          (e.generatedAt ? ' · generated ' + esc(String(e.generatedAt).slice(0, 10)) : '') +
        '</div>';
      if (host.id === 'lesson-body' || host.className === 'lesson-body') host.insertBefore(section, host.firstChild);
      else host.insertAdjacentElement('afterend', section);
    })
    .catch(function () { /* no manifest yet — leave the page alone */ });
})();
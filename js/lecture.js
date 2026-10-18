// Spoken lecture player: loads data/lectures.json and performs each lecture
// with the device's own voice (speechSynthesis). The talk is the content; the
// screen is the companion — words light up as they are spoken, chapters fly
// past on the progress rail, and the script stays available under 📝.
(function () {
  'use strict';

  var DATA = null, topic = null, flat = [], idx = 0;
  var playing = false, finished = false, speechOK = ('speechSynthesis' in window);
  var rate = parseFloat(localStorage.getItem('lecRate') || '1');
  if (!rate || rate < 0.5 || rate > 2) rate = 1;
  var RATES = [0.85, 1, 1.15, 1.35];
  var voices = [], voicePick = null, voiceCursor = -1;
  var waveEl, beatEl, badgeEl, barEl, playBtn;
  var wordStarts = [], speakToken = 0, speakTimer = null, advanceTimer = null;

  var KIND = {
    title:    { badge: '🎬 Opening' },
    say:      { badge: '💡 The core' },
    roadmap:  { badge: '🧭 The route' },
    person:   { badge: '👤 A face' },
    event:    { badge: '⚡ A turning point' },
    idea:     { badge: '💡 An idea' },
    org:      { badge: '🏛️ An institution' },
    remember: { badge: '🧠 Remember this' },
    outro:    { badge: '✨ Carry it away' }
  };

  var FEMALE_HINTS = ['neerja', 'heera', 'swara', 'kalpana', 'aria', 'jenny', 'michelle',
    'zira', 'samantha', 'ava', 'allison', 'susan', 'vicki', 'karen', 'moira', 'tessa',
    'fiona', 'serena', 'kate', 'sonia', 'libby', 'hazel', 'emma', 'olivia', 'amber',
    'salli', 'joanna', 'amy', 'penelope', 'female'];

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function shortName(v) {
    if (!v) return 'auto';
    var n = String(v.name || '').replace(/^Microsoft\s+/i, '').replace(/^Google\s+/i, '');
    n = n.split(/[-(]/)[0].trim();
    return n.length > 16 ? n.slice(0, 15) + '…' : n;
  }

  // ---- voice management ----------------------------------------------------
  function chooseVoice(list) {
    var best = null, bestScore = -1e9;
    for (var i = 0; i < list.length; i++) {
      var v = list[i], nm = String(v.name || '').toLowerCase(), lang = String(v.lang || '');
      var score = 0;
      if (/en[-_]in/i.test(lang)) score += 3;
      else if (/en[-_]gb/i.test(lang)) score += 2;
      else if (/en[-_]us/i.test(lang)) score += 1;
      for (var h = 0; h < FEMALE_HINTS.length; h++) {
        if (nm.indexOf(FEMALE_HINTS[h]) >= 0) { score += 4; break; }
      }
      if (v.localService) score += 1;          // keeps working offline
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best || list[0];
  }

  function refreshVoices() {
    if (!speechOK) return;
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    voices = voices.filter(function (v) { return /^en/i.test(String(v.lang || '')); });
    if (!voices.length) return;
    if (!voicePick || voices.indexOf(voicePick) < 0) voicePick = chooseVoice(voices);
    if (voiceCursor >= voices.length) voiceCursor = -1;
    var nm = el('voiceName');
    if (nm) nm.textContent = shortName(voicePick);
  }

  function cycleVoice() {
    if (!voices.length) { refreshVoices(); if (!voices.length) return; }
    voiceCursor = (voiceCursor + 1) % voices.length;
    voicePick = voices[voiceCursor];
    var nm = el('voiceName');
    if (nm) nm.textContent = shortName(voicePick);
    if (playing) speakBeat();
  }

  // ---- library -------------------------------------------------------------
  function renderGrid(query) {
    var grid = el('lecGrid');
    if (!grid) return;
    if (!DATA) {
      el('lecEmpty').hidden = false;
      el('lecCount').textContent = '';
      return;
    }
    var q = String(query || '').trim().toLowerCase();
    var list = DATA.topics.filter(function (t) {
      if (!q) return true;
      return (t.title + ' ' + t.id + ' ' + (t.dek || '')).toLowerCase().indexOf(q) >= 0;
    });
    grid.innerHTML = list.map(function (t) {
      var mins = Math.max(1, Math.round(t.beats * 7 / 60));
      return '<a class="lec-card" href="?topic=' + encodeURIComponent(t.id) + '" data-topic="' + esc(t.id) + '">' +
        '<div class="ic">🎧</div>' +
        '<div class="t">' + esc(t.title) + '</div>' +
        '<div class="d">' + esc(t.dek || 'The essentials, spoken.') + '</div>' +
        '<div class="m">' + t.chapters.length + ' chapters · ' + t.beats + ' lines · ~' + mins + ' min</div>' +
        '</a>';
    }).join('');
    el('lecCount').textContent = q ? (list.length + ' of ' + DATA.topics.length + ' lectures') : (DATA.topics.length + ' lectures');
  }

  function gridClick(e) {
    var a = e.target.closest ? e.target.closest('.lec-card') : null;
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('data-topic');
    var t = findTopic(id);
    if (t) openTopic(t, true);
  }

  function findTopic(id) {
    if (!DATA) return null;
    var want = String(id || '').toLowerCase();
    for (var i = 0; i < DATA.topics.length; i++) {
      if (DATA.topics[i].id.toLowerCase() === want) return DATA.topics[i];
    }
    return null;
  }

  // ---- stage ---------------------------------------------------------------
  function openTopic(t, autoplay) {
    topic = t;
    flat = [];
    t.chapters.forEach(function (ch, ci) {
      ch.beats.forEach(function (b, bi) {
        flat.push({
          text: b.text, kind: b.kind || 'say',
          chapter: ch.heading, chapterIdx: ci,
          chapterPos: bi + 1, chapterLen: ch.beats.length
        });
      });
    });
    idx = 0; finished = false;
    el('pickerView').hidden = true;
    el('stageView').hidden = false;
    el('stageTitle').textContent = t.title;
    try { history.replaceState(null, '', '?topic=' + encodeURIComponent(t.id)); } catch (e) {}
    buildTranscript();
    renderBeat();
    window.scrollTo(0, 0);
    if (autoplay && speechOK) setPlaying(true);
  }

  function exitStage() {
    setPlaying(false);
    topic = null;
    el('stageView').hidden = true;
    el('pickerView').hidden = false;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function renderBeat() {
    var b = flat[idx];
    if (!b) return;
    if (badgeEl) badgeEl.textContent = (KIND[b.kind] && KIND[b.kind].badge) || '💬';
    if (barEl) barEl.style.width = Math.round(((idx + 1) / flat.length) * 100) + '%';
    var chEl = el('stageChapter');
    if (chEl) {
      chEl.textContent = 'Chapter ' + (b.chapterIdx + 1) + ' of ' + topic.chapters.length +
        ' · ' + b.chapter + ' (' + b.chapterPos + '/' + b.chapterLen + ')';
    }
    setBeatText(b.text);
    var host = beatEl;
    if (host) {
      host.classList.remove('beat-in');
      void host.offsetHeight;
      host.classList.add('beat-in');
    }
    markTranscript();
    var pb = playBtn;
    if (pb) pb.textContent = finished ? '↺' : (playing ? '⏸' : '▶');
  }

  function setBeatText(text) {
    if (!beatEl) return;
    beatEl.textContent = '';
    wordStarts = [];
    var parts = String(text).split(/\s+/);
    var pos = 0;
    parts.forEach(function (w, i) {
      if (i) { beatEl.appendChild(document.createTextNode(' ')); pos += 1; }
      wordStarts.push(pos);
      pos += w.length;
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      beatEl.appendChild(s);
    });
  }

  function litUpTo(charIndex) {
    if (!beatEl) return;
    var words = beatEl.querySelectorAll('.w');
    var upto = -1;
    for (var i = 0; i < wordStarts.length; i++) {
      if (wordStarts[i] <= charIndex) upto = i; else break;
    }
    for (var j = 0; j < words.length; j++) {
      if (j <= upto) words[j].classList.add('lit');
      else words[j].classList.remove('lit');
    }
  }

  function clearLit() {
    if (!beatEl) return;
    var words = beatEl.querySelectorAll('.w.lit');
    for (var i = 0; i < words.length; i++) words[i].classList.remove('lit');
  }

  function waveOn() { if (waveEl) waveEl.hidden = false; }
  function waveOff() { if (waveEl) waveEl.hidden = true; }

  // ---- speech --------------------------------------------------------------
  function speakBeat() {
    if (!speechOK || !flat[idx]) return;
    var token = ++speakToken;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    clearTimeout(speakTimer);
    clearTimeout(advanceTimer);
    speakTimer = setTimeout(function () {
      if (token !== speakToken || !playing) return;
      var b = flat[idx];
      var u = new SpeechSynthesisUtterance(b.text);
      if (voicePick) { u.voice = voicePick; u.lang = voicePick.lang || 'en-IN'; }
      u.rate = rate;
      u.pitch = 1;
      u.onboundary = function (e) {
        if (e && typeof e.charIndex === 'number') litUpTo(e.charIndex);
      };
      u.onend = function () {
        if (token !== speakToken) return;
        waveOff();
        if (!playing) return;
        advanceTimer = setTimeout(function () {
          if (token !== speakToken || !playing) return;
          if (idx >= flat.length - 1) { finishLecture(); return; }
          idx += 1;
          clearLit();
          renderBeat();
          speakBeat();
        }, 620);
      };
      u.onerror = function () { waveOff(); };
      waveOn();
      try { window.speechSynthesis.speak(u); } catch (e) { waveOff(); }
    }, 70);
  }

  function setPlaying(v) {
    playing = !!v && !!topic;
    finished = false;
    var pb = playBtn;
    if (pb) pb.textContent = playing ? '⏸' : '▶';
    if (!topic) return;
    if (playing) {
      speakBeat();
    } else {
      speakToken++;
      clearTimeout(speakTimer);
      clearTimeout(advanceTimer);
      try { window.speechSynthesis.cancel(); } catch (e) {}
      waveOff();
    }
  }

  function finishLecture() {
    playing = false;
    finished = true;
    waveOff();
    if (badgeEl) badgeEl.textContent = '✨ Complete';
    var pb = playBtn;
    if (pb) pb.textContent = '↺';
  }

  function go(delta) {
    if (!topic) return;
    speakToken++;
    clearTimeout(speakTimer);
    clearTimeout(advanceTimer);
    try { window.speechSynthesis.cancel(); } catch (e) {}
    finished = false;
    var np = Math.min(flat.length - 1, Math.max(0, idx + delta));
    idx = np;
    clearLit();
    renderBeat();
    if (playing) speakBeat();
  }

  function replay() {
    if (!topic) return;
    if (!playing) { setPlaying(true); return; }
    speakBeat();
  }

  // ---- transcript ----------------------------------------------------------
  function buildTranscript() {
    var host = el('transcript');
    if (!host) return;
    var html = '';
    var n = 0;
    topic.chapters.forEach(function (ch, ci) {
      html += '<h4>' + esc(ch.heading) + '</h4>';
      ch.beats.forEach(function (b) {
        html += '<button class="tb" data-i="' + n + '">' + esc(b.text) + '</button>';
        n++;
      });
    });
    host.innerHTML = html;
    host.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('.tb') : null;
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      if (isNaN(i)) return;
      speakToken++;
      clearTimeout(speakTimer);
      clearTimeout(advanceTimer);
      try { window.speechSynthesis.cancel(); } catch (e) {}
      finished = false;
      idx = i;
      clearLit();
      renderBeat();
      if (playing) speakBeat();
    };
  }

  function markTranscript() {
    var host = el('transcript');
    if (!host) return;
    var cur = host.querySelector('.tb.cur');
    if (cur) cur.classList.remove('cur');
    var now = host.querySelector('.tb[data-i="' + idx + '"]');
    if (now) {
      now.classList.add('cur');
      if (!host.hidden && now.scrollIntoView) {
        try { now.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      }
    }
  }

  // ---- wiring --------------------------------------------------------------
  function wire() {
    waveEl = el('wave'); beatEl = el('beatText'); badgeEl = el('beatBadge');
    barEl = el('stageBar'); playBtn = el('btnPlay');

    el('btnExit').addEventListener('click', exitStage);
    playBtn.addEventListener('click', function () {
      if (finished) { idx = 0; clearLit(); renderBeat(); setPlaying(true); return; }
      setPlaying(!playing);
    });
    el('btnPrev').addEventListener('click', function () { go(-1); });
    el('btnNext').addEventListener('click', function () { go(1); });
    el('btnReplay').addEventListener('click', replay);
    el('btnSpeed').addEventListener('click', function () {
      var i = RATES.indexOf(rate);
      rate = RATES[(i + 1) % RATES.length];
      try { localStorage.setItem('lecRate', String(rate)); } catch (e) {}
      el('btnSpeed').textContent = rate + '×';
      if (playing) speakBeat();
    });
    el('btnSpeed').textContent = rate + '×';
    el('btnVoice').addEventListener('click', cycleVoice);
    el('btnScript').addEventListener('click', function () {
      var t = el('transcript');
      t.hidden = !t.hidden;
      markTranscript();
    });
    el('lecSearch').addEventListener('input', function () { renderGrid(this.value); });
    el('lecGrid').addEventListener('click', gridClick);

    document.addEventListener('keydown', function (e) {
      if (el('stageView').hidden) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'r') { replay(); }
    });

    window.addEventListener('pagehide', function () {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    });

    if (!speechOK) {
      el('noVoice').hidden = false;
      el('btnVoice').disabled = true;
      el('btnVoice').style.opacity = '.4';
    } else {
      refreshVoices();
      try { window.speechSynthesis.onvoiceschanged = refreshVoices; } catch (e) {}
      setTimeout(refreshVoices, 400);
      setTimeout(refreshVoices, 1500);
    }
  }

  // ---- boot ----------------------------------------------------------------
  function boot() {
    wire();
    fetch('data/lectures.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        DATA = j && j.topics && j.topics.length ? j : null;
        renderGrid('');
        var want = '';
        try { want = new URLSearchParams(location.search).get('topic') || ''; } catch (e) {}
        if (!want) want = String(location.hash || '').replace(/^#topic=/, '');
        if (want) {
          var t = findTopic(want);
          if (t) openTopic(t, false);   // deep links wait for a real click before speaking
        }
      })
      .catch(function () { renderGrid(''); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

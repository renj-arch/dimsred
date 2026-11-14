// The lecture theatre: loads data/lectures.json, turns each chapter into a
// cinematic 16:9 scene, and speaks it with the device's own voice. The screen
// is the companion, not a transcript: one big idea at a time, a chapter rail,
// and a word-level glow that follows the voice. If the browser cannot speak,
// the same scene auto-plays silently so it can still be watched or recorded.
(function () {
  'use strict';

  var DATA = null, topic = null, flat = [], chapterStart = [], idx = 0;
  var playing = false, finished = false, speechOK = ('speechSynthesis' in window);
  var rate = parseFloat(localStorage.getItem('lecRate') || '1');
  if (!rate || rate < 0.5 || rate > 2) rate = 1;
  var RATES = [0.85, 1, 1.15, 1.35];
  var voices = [], voicePick = null, voiceCursor = -1;
  var screenEl, beatEl, badgeEl, barEl, playBtn, waveEl, chapterRailEl, noVoiceEl;
  var wordStarts = [], speakToken = 0, speakTimer = null, advanceTimer = null;
  var silentTimer = null, silentWordTimer = null, idleTimer = null;

  var KIND = {
    title:    { badge: 'Opening',        icon: '✦', label: 'Title' },
    roadmap:  { badge: 'The route',       icon: '⌁', label: 'Route' },
    person:   { badge: 'A face',          icon: '◉', label: 'Person' },
    event:    { badge: 'A turning point', icon: '⚡', label: 'Event' },
    idea:     { badge: 'An idea',         icon: '✺', label: 'Idea' },
    org:      { badge: 'An institution',  icon: '⬡', label: 'Institution' },
    remember: { badge: 'Remember this',   icon: '✷', label: 'Remember' },
    outro:    { badge: 'Carry it away',   icon: '↗', label: 'Outro' },
    say:      { badge: 'The core',        icon: '◇', label: 'Idea' }
  };

  var FEMALE_HINTS = ['neerja', 'heera', 'swara', 'kalpana', 'aria', 'jenny', 'michelle',
    'zira', 'samantha', 'ava', 'allison', 'susan', 'vicki', 'karen', 'moira', 'tessa',
    'fiona', 'serena', 'kate', 'sonia', 'libby', 'hazel', 'emma', 'olivia', 'amber',
    'salli', 'joanna', 'amy', 'penelope', 'female'];

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + pad2(sec % 60);
  }
  function shortName(v) {
    if (!v) return 'auto';
    var n = String(v.name || '').replace(/^Microsoft\s+/i, '').replace(/^Google\s+/i, '');
    n = n.split(/[-(]/)[0].trim();
    return n.length > 15 ? n.slice(0, 14) + '…' : n;
  }
  function initials(title) {
    var parts = String(title || '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
    if (!parts.length) return 'VL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    if (parts[0].charAt(0).toLowerCase() === parts[1].charAt(0).toLowerCase()) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  function hueFor(s) {
    var h = 0;
    for (var i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) % 360;
    return (h + 188) % 360;
  }
  function yearFrom(text) {
    var s = String(text || '');
    var m = s.match(/\b(\d{3,4})\s*(BCE?|BC|CE|AD)\b/i);
    if (m) return m[1] + ' ' + m[2].toUpperCase();
    m = s.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return m ? m[1] : '';
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
      if (v.localService) score += 1;
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
  function showVoiceNote() {
    if (!noVoiceEl) return;
    noVoiceEl.hidden = false;
    noVoiceEl.textContent = '🔇 Voice unavailable — silent auto-play is on.';
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
    grid.innerHTML = list.map(function (t, i) {
      var mins = Math.max(2, Math.round((t.beats || 0) * 9 / 60));
      var hue = hueFor(t.title);
      return '<a class="lec-card" href="?topic=' + encodeURIComponent(t.id) + '" data-topic="' + esc(t.id) + '" style="--hue:' + hue + '">' +
        '<div class="poster">' +
          '<div class="poster-kind">Lecture ' + pad2(i + 1) + '</div>' +
          '<div class="poster-mark">' + esc(initials(t.title)) + '</div>' +
          '<span class="poster-play">▶</span>' +
        '</div>' +
        '<div class="lec-card-body">' +
          '<div class="t">' + esc(t.title) + '</div>' +
          '<div class="d">' + esc(t.dek || 'The essentials, in chapters.') + '</div>' +
          '<div class="m">' + (t.chapters ? t.chapters.length : 0) + ' chapters · ' + (t.beats || 0) + ' scenes · ≈' + mins + ' min</div>' +
        '</div>' +
      '</a>';
    }).join('');
    el('lecEmpty').hidden = list.length > 0;
    el('lecCount').textContent = q ? (list.length + ' of ' + DATA.topics.length + ' lectures') : (DATA.topics.length + ' lectures');
  }

  function gridClick(e) {
    var a = e.target.closest ? e.target.closest('.lec-card') : null;
    if (!a) return;
    e.preventDefault();
    var t = findTopic(a.getAttribute('data-topic'));
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
    chapterStart = [];
    t.chapters.forEach(function (ch, ci) {
      chapterStart[ci] = flat.length;
      ch.beats.forEach(function (b) {
        flat.push({
          text: b.text, kind: b.kind || 'say',
          chapter: ch.heading, chapterIdx: ci,
          chapterPos: flat.length - chapterStart[ci] + 1, chapterLen: ch.beats.length
        });
      });
    });
    idx = 0; finished = false;
    el('pickerView').hidden = true;
    el('stageView').hidden = false;
    el('stageTitle').textContent = t.title;
    try { document.title = t.title + ' — a vlymbooq lecture'; } catch (e) {}
    try { history.replaceState(null, '', '?topic=' + encodeURIComponent(t.id)); } catch (e) {}
    buildTranscript();
    buildChapterRail();
    renderBeat();
    window.scrollTo(0, 0);
    if (autoplay) setPlaying(true);
  }

  function exitStage() {
    setPlaying(false);
    setFocus(false);
    topic = null;
    el('stageView').hidden = true;
    el('pickerView').hidden = false;
    try { document.title = 'Spoken Lectures — history told like a film | vlymbooq'; } catch (e) {}
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function buildChapterRail() {
    if (!chapterRailEl || !topic) return;
    chapterRailEl.innerHTML = topic.chapters.map(function (ch, ci) {
      return '<button data-ch="' + ci + '" title="' + esc(ch.heading) + '">' +
        '<span>' + pad2(ci + 1) + '</span>' + esc(ch.heading) + '</button>';
    }).join('');
  }

  function renderBeat() {
    var b = flat[idx];
    if (!b) return;
    var k = KIND[b.kind] || KIND.say;
    if (screenEl) screenEl.setAttribute('data-kind', b.kind);
    if (badgeEl) badgeEl.textContent = k.badge.toUpperCase();
    if (barEl) barEl.style.width = Math.round(((idx + 1) / flat.length) * 100) + '%';
    var chEl = el('stageChapter');
    if (chEl) {
      chEl.textContent = 'Chapter ' + (b.chapterIdx + 1) + ' of ' + topic.chapters.length +
        ' · ' + b.chapter + ' · scene ' + b.chapterPos + '/' + b.chapterLen;
    }
    var scEl = el('screenChapter');
    if (scEl) scEl.textContent = 'CH ' + pad2(b.chapterIdx + 1) + ' · ' + b.chapter;
    var seEl = el('sceneIndex');
    if (seEl) seEl.textContent = pad2(idx + 1);
    var spEl = el('screenPos');
    if (spEl) spEl.textContent = pad2(idx + 1) + ' / ' + pad2(flat.length);
    var stEl = el('screenTime');
    if (stEl) stEl.textContent = fmtTime((flat.length - idx - 1) * 9 / rate) + ' left';
    var markEl = el('sigilMark');
    if (markEl) markEl.textContent = yearFrom(b.text) || k.icon;
    var labEl = el('sigilLabel');
    if (labEl) labEl.textContent = k.label;
    setBeatText(b.text, b.kind);
    if (beatEl) {
      beatEl.classList.remove('beat-in');
      void beatEl.offsetHeight;
      beatEl.classList.add('beat-in');
    }
    if (chapterRailEl) {
      var buttons = chapterRailEl.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle('on', Number(buttons[i].getAttribute('data-ch')) === b.chapterIdx);
      }
    }
    markTranscript();
    if (playBtn) playBtn.textContent = finished ? '↺' : (playing ? '⏸' : '▶');
  }

  // Split a scene into a display line and a supporting line. A person/event
  // beat usually begins with a name and a full stop: that name becomes the
  // poster-sized line, the rest becomes the explanation. The split is visual
  // only — speech still reads the full sentence, and wordStarts covers both.
  function splitBeat(text, kind) {
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    if (kind === 'title') return words.length;
    if (kind === 'roadmap') {
      var c = text.indexOf(':');
      if (c > 8 && c < 90) return text.slice(0, c).split(/\s+/).filter(Boolean).length;
      return Math.min(7, words.length);
    }
    if (kind === 'person' || kind === 'event' || kind === 'org' || kind === 'idea') {
      var m = text.match(/^(.{2,80}?[.!?])\s+/);
      if (m) return m[1].split(/\s+/).filter(Boolean).length;
      var c2 = text.indexOf(':');
      if (c2 > 8 && c2 < 80) return text.slice(0, c2).split(/\s+/).filter(Boolean).length;
      return Math.min(8, words.length);
    }
    if (kind === 'say') return words.length <= 16 ? words.length : 0;
    if (kind === 'remember' || kind === 'outro') return 0;
    return Math.min(8, words.length);
  }

  function setBeatText(text, kind) {
    if (!beatEl) return;
    var clean = norm(text);
    var words = clean ? clean.split(' ') : [];
    var leadCount = splitBeat(clean, kind);
    beatEl.textContent = '';
    beatEl.setAttribute('aria-label', clean);
    wordStarts = [];
    var leadEl = document.createElement('span');
    leadEl.className = 'lead';
    var detailEl = document.createElement('span');
    detailEl.className = 'detail';
    var pos = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      wordStarts.push(pos);
      pos += w.length + 1;
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      var host = i < leadCount ? leadEl : detailEl;
      host.appendChild(s);
      if (i < words.length - 1) host.appendChild(document.createTextNode(' '));
    }
    if (leadCount > 0) beatEl.appendChild(leadEl);
    if (leadCount < words.length) beatEl.appendChild(detailEl);
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
  function clearTimers() {
    clearTimeout(speakTimer);
    clearTimeout(advanceTimer);
    clearTimeout(silentTimer);
    clearInterval(silentWordTimer);
    silentTimer = null;
    silentWordTimer = null;
  }
  function stopSilent() {
    clearTimeout(silentTimer);
    clearInterval(silentWordTimer);
    silentTimer = null;
    silentWordTimer = null;
  }

  // ---- speech and silent auto-play ----------------------------------------
  function speakBeat() {
    if (!flat[idx]) return;
    if (!speechOK) { playSilentBeat(); return; }
    stopSilent();
    var token = ++speakToken;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    clearTimeout(speakTimer);
    clearTimeout(advanceTimer);
    speakTimer = setTimeout(function () {
      if (token !== speakToken || !playing) return;
      var b = flat[idx];
      var text = norm(b.text);
      var u = new SpeechSynthesisUtterance(text);
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
        }, 650);
      };
      u.onerror = function () {
        if (token !== speakToken) return;
        waveOff();
        if (playing) { showVoiceNote(); playSilentBeat(); }
      };
      waveOn();
      try { window.speechSynthesis.speak(u); } catch (e) { playSilentBeat(); }
    }, 70);
  }

  function playSilentBeat() {
    stopSilent();
    if (!playing || !flat[idx]) return;
    waveOn();
    var words = beatEl ? beatEl.querySelectorAll('.w') : [];
    var duration = Math.max(2600, words.length * (430 / rate));
    var started = Date.now();
    clearLit();
    silentWordTimer = setInterval(function () {
      if (!playing) { stopSilent(); return; }
      var progress = Math.min(1, (Date.now() - started) / duration);
      var upto = Math.floor(progress * words.length) - 1;
      for (var i = 0; i < words.length; i++) {
        if (i <= upto) words[i].classList.add('lit');
        else words[i].classList.remove('lit');
      }
    }, 90);
    silentTimer = setTimeout(function () {
      stopSilent();
      if (!playing) return;
      waveOff();
      if (idx >= flat.length - 1) { finishLecture(); return; }
      idx += 1;
      clearLit();
      renderBeat();
      speakBeat();
    }, duration + 480);
  }

  function setPlaying(v) {
    playing = !!v && !!topic;
    finished = false;
    if (playBtn) playBtn.textContent = playing ? '⏸' : '▶';
    if (!topic) return;
    if (playing) {
      if (idx >= flat.length) idx = 0;
      speakBeat();
    } else {
      speakToken++;
      clearTimers();
      try { window.speechSynthesis.cancel(); } catch (e) {}
      waveOff();
    }
  }

  function finishLecture() {
    playing = false;
    finished = true;
    stopSilent();
    waveOff();
    if (badgeEl) badgeEl.textContent = '✨ COMPLETE';
    if (playBtn) playBtn.textContent = '↺';
  }

  function go(delta) {
    if (!topic) return;
    speakToken++;
    clearTimers();
    try { window.speechSynthesis.cancel(); } catch (e) {}
    finished = false;
    idx = Math.min(flat.length - 1, Math.max(0, idx + delta));
    clearLit();
    renderBeat();
    if (playing) speakBeat();
  }

  function jumpTo(i) {
    if (!topic || i < 0 || i >= flat.length) return;
    speakToken++;
    clearTimers();
    try { window.speechSynthesis.cancel(); } catch (e) {}
    finished = false;
    idx = i;
    clearLit();
    renderBeat();
    if (playing) speakBeat();
  }

  function jumpToChapter(ci) {
    if (!topic || !chapterStart.length) return;
    var i = chapterStart[ci];
    if (typeof i !== 'number') return;
    jumpTo(i);
  }

  function replay() {
    if (!topic) return;
    if (finished) { idx = 0; finished = false; renderBeat(); }
    if (!playing) { setPlaying(true); return; }
    speakBeat();
  }

  // ---- transcript ----------------------------------------------------------
  function buildTranscript() {
    var host = el('transcript');
    if (!host || !topic) return;
    var html = '';
    var n = 0;
    topic.chapters.forEach(function (ch) {
      html += '<h4>' + esc(ch.heading) + '</h4>';
      ch.beats.forEach(function (b) {
        html += '<button class="tb" data-i="' + n + '">' + esc(b.text) + '</button>';
        n++;
      });
    });
    host.innerHTML = html;
    host.hidden = true;
    host.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('.tb') : null;
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      if (!isNaN(i)) jumpTo(i);
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

  // ---- focus / record mode -------------------------------------------------
  function setFocus(on) {
    var active = !!on;
    document.body.classList.toggle('lec-focus', active);
    var btn = el('btnFocus');
    if (btn) btn.textContent = active ? '✕ Exit focus' : '⛶ Focus';
    clearTimeout(idleTimer);
    if (active) {
      document.body.classList.remove('lec-idle');
      idleTimer = setTimeout(function () {
        if (document.body.classList.contains('lec-focus')) document.body.classList.add('lec-idle');
      }, 1800);
      try {
        var p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    } else {
      document.body.classList.remove('lec-idle');
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          var q = document.exitFullscreen();
          if (q && q.catch) q.catch(function () {});
        }
      } catch (e) {}
    }
  }

  // ---- wiring --------------------------------------------------------------
  function wire() {
    screenEl = el('screen'); beatEl = el('beatText'); badgeEl = el('beatBadge');
    barEl = el('stageBar'); playBtn = el('btnPlay'); waveEl = el('wave');
    chapterRailEl = el('chapterRail'); noVoiceEl = el('noVoice');

    el('btnExit').addEventListener('click', exitStage);
    playBtn.addEventListener('click', function () {
      if (finished) { idx = 0; finished = false; clearLit(); renderBeat(); setPlaying(true); return; }
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
    el('btnFocus').addEventListener('click', function () {
      setFocus(!document.body.classList.contains('lec-focus'));
    });
    chapterRailEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-ch]') : null;
      if (!b) return;
      jumpToChapter(parseInt(b.getAttribute('data-ch'), 10));
    });
    el('lecSearch').addEventListener('input', function () { renderGrid(this.value); });
    el('lecGrid').addEventListener('click', gridClick);

    document.addEventListener('keydown', function (e) {
      if (el('stageView').hidden) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (finished) { idx = 0; finished = false; renderBeat(); setPlaying(true); }
        else setPlaying(!playing);
      } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'r' || e.key === 'R') { replay(); }
      else if (e.key === 'f' || e.key === 'F') { setFocus(!document.body.classList.contains('lec-focus')); }
      else if (e.key === 'Escape' && document.body.classList.contains('lec-focus')) { setFocus(false); }
    });

    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && document.body.classList.contains('lec-focus')) setFocus(false);
    });

    document.addEventListener('mousemove', function () {
      if (!document.body.classList.contains('lec-focus')) return;
      document.body.classList.remove('lec-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (document.body.classList.contains('lec-focus')) document.body.classList.add('lec-idle');
      }, 1800);
    });

    window.addEventListener('pagehide', function () {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    });

    if (!speechOK) {
      if (noVoiceEl) { noVoiceEl.hidden = false; noVoiceEl.textContent = '🔇 No voice — silent auto-play is on.'; }
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
          if (t) openTopic(t, false);
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

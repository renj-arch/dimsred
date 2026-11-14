// Recall Deck — topic-level spaced repetition over the site's verified
// revision notes (data/revision-content.json).
//
// HONESTY CONTRACT
// - A card is only a pointer to a revision topic. The facts shown on the back
//   are read from revision-content.json at review time, so a corrected fact
//   replaces an old one instead of lingering in a stale snapshot.
// - Only topics with at least one "primaryFact" can enter the deck. The deck
//   never invents a fact and never hides that a topic has no verified note.
// - Everything is stored in this browser (localStorage key
//   vlymbooq_recall_v1). No network calls, no accounts, no analytics.
//
// SCHEDULING (Anki-style, deliberately small)
// - Again: 10 minutes, ease -0.20, counts a lapse.
// - Hard:  1.2x the current interval (12 h for a new card), ease -0.15.
// - Good:  interval x ease (1 day for a new card).
// - Easy:  interval x ease x 1.3 (3 days for a new card), ease +0.15.
// - Ease is clamped to 1.3–2.8, intervals to 10 minutes–180 days.
(function (root) {
  'use strict';

  var KEY = 'vlymbooq_recall_v1';
  var DAY = 86400000;
  var MINUTE = 60000;
  var EASE_START = 2.3;
  var EASE_MIN = 1.3;
  var EASE_MAX = 2.8;
  var MAX_DAYS = 180;
  var MIN_DAYS = 10 / 1440;
  var LOG_CAP = 1000;
  var GRADES = ['again', 'hard', 'good', 'easy'];

  var state = null;
  var topics = null;      // normalized topic id -> revision-content entry
  var lastUndo = null;
  var speech = { current: null, active: false, utt: null };

  // ── small helpers ────────────────────────────────────────────────────────
  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function num(n, fallback) {
    n = Number(n);
    return isFinite(n) ? n : fallback;
  }
  function emptyState() { return { version: 1, cards: {}, log: [] }; }
  function cardList() { return Object.keys(state.cards).map(function (k) { return state.cards[k]; }); }
  function hasStorage() {
    try {
      var probe = KEY + '_probe';
      root.localStorage.setItem(probe, '1');
      root.localStorage.removeItem(probe);
      return true;
    } catch (e) { return false; }
  }

  function load() {
    if (state) return state;
    state = emptyState();
    var raw = null;
    try { raw = root.localStorage.getItem(KEY); } catch (e) { return state; }
    if (!raw) return state;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.cards && typeof parsed.cards === 'object') {
        state.cards = parsed.cards;
        state.log = Array.isArray(parsed.log) ? parsed.log.slice(-LOG_CAP) : [];
      }
    } catch (e) {
      // Do not destroy a corrupt deck silently: keep one copy aside, then
      // start clean so the page still works. The next save replaces the
      // primary key, the backup stays for the owner to inspect.
      try {
        if (!root.localStorage.getItem(KEY + '_corrupt')) {
          root.localStorage.setItem(KEY + '_corrupt', raw);
        }
      } catch (e2) { /* quota or private mode */ }
      state = emptyState();
    }
    return state;
  }

  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) { return false; }
  }

  // ── revision content ─────────────────────────────────────────────────────
  // setTopics(map) accepts data/revision-content.json as-is. It is optional:
  // the revision page only calls add(), while recall.html also needs content
  // for the card backs.
  function setTopics(map) {
    topics = {};
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (key) {
      topics[norm(key)] = map[key];
    });
  }

  function content(topic) {
    var id = norm(topic);
    var entry = topics ? topics[id] : null;
    if (!entry) return { found: false, facts: [], factTotal: 0, summary: '', links: [] };
    var allFacts = (entry.primaryFacts || []).map(function (f) {
      return String(f && f.fact ? f.fact : '').trim();
    }).filter(Boolean);
    var facts = allFacts.slice(0, 4);
    var summary = String(entry.summary || '').trim();
    // revision-content often stores the first facts again as "summary". Do
    // not repeat them on the card back; keep a summary only when it adds text.
    if (summary) {
      var blob = facts.join(' ').replace(/\s+/g, ' ').toLowerCase();
      if (blob.indexOf(summary.replace(/\s+/g, ' ').toLowerCase()) !== -1) summary = '';
    }
    var links = (entry.neighbors || []).map(function (n) {
      return String(n && (n.entity || n.name) ? (n.entity || n.name) : '').trim();
    }).filter(Boolean).slice(0, 6);
    return { found: true, facts: facts, factTotal: allFacts.length, summary: summary, links: links };
  }

  function hasFacts(topic) {
    var c = content(topic);
    return c.found ? c.facts.length > 0 : false;
  }

  // ── deck management ──────────────────────────────────────────────────────
  function has(topic) {
    load();
    return !!state.cards[norm(topic)];
  }

  function get(topic) {
    load();
    return state.cards[norm(topic)] || null;
  }

  function all() {
    load();
    return cardList().sort(function (a, b) {
      var da = num(a.due, 0), db = num(b.due, 0);
      if (da !== db) return da - db;
      return String(a.topic).localeCompare(String(b.topic));
    });
  }

  function add(topic, entry) {
    load();
    var id = norm(topic);
    if (!id) return { ok: false, reason: 'empty' };
    if (state.cards[id]) return { ok: false, reason: 'exists', card: state.cards[id] };

    var source = entry || (topics ? topics[id] : null);
    if (!source) return { ok: false, reason: 'no-data' };
    var facts = (source.primaryFacts || []).filter(function (f) {
      return f && String(f.fact || '').trim();
    });
    if (!facts.length) return { ok: false, reason: 'no-facts' };

    var now = Date.now();
    var card = {
      id: id,
      topic: String(topic).trim(),
      addedAt: now,
      due: now,
      interval: 0,
      ease: EASE_START,
      reps: 0,
      lapses: 0,
      lastGrade: null,
      lastReviewed: null
    };
    state.cards[id] = card;
    lastUndo = null;
    return { ok: true, card: card, saved: save() };
  }

  function remove(topic) {
    load();
    var id = norm(topic);
    if (!state.cards[id]) return false;
    delete state.cards[id];
    if (lastUndo && lastUndo.id === id) lastUndo = null;
    save();
    return true;
  }

  // ── scheduling ───────────────────────────────────────────────────────────
  function compute(card, grade, at) {
    var ease = clamp(num(card.ease, EASE_START), EASE_MIN, EASE_MAX);
    var interval = Math.max(0, num(card.interval, 0));
    var reps = Math.max(0, Math.floor(num(card.reps, 0)));
    var lapses = Math.max(0, Math.floor(num(card.lapses, 0)));
    var fresh = reps === 0;

    if (grade === 'again') {
      interval = MIN_DAYS;
      ease = Math.max(EASE_MIN, ease - 0.2);
      lapses += 1;
    } else if (grade === 'hard') {
      interval = fresh ? 0.5 : Math.max(0.5, interval * 1.2);
      ease = Math.max(EASE_MIN, ease - 0.15);
    } else if (grade === 'good') {
      interval = fresh ? 1 : Math.max(1, interval * ease);
    } else if (grade === 'easy') {
      interval = fresh ? 3 : Math.max(3, interval * ease * 1.3);
      ease = Math.min(EASE_MAX, ease + 0.15);
    } else {
      return null;
    }

    interval = clamp(interval, MIN_DAYS, MAX_DAYS);
    reps += 1;
    return {
      interval: interval,
      ease: ease,
      reps: reps,
      lapses: lapses,
      due: at + interval * DAY
    };
  }

  function rate(topic, grade, at) {
    load();
    var card = state.cards[norm(topic)];
    if (!card || GRADES.indexOf(grade) === -1) return null;
    var when = num(at, Date.now());
    var before = JSON.parse(JSON.stringify(card));
    var next = compute(card, grade, when);
    if (!next) return null;

    Object.keys(next).forEach(function (k) { card[k] = next[k]; });
    card.lastGrade = grade;
    card.lastReviewed = when;

    state.log.push({
      at: when,
      grade: grade,
      topic: card.topic,
      interval: Math.round(next.interval * 1000) / 1000
    });
    if (state.log.length > LOG_CAP) state.log = state.log.slice(-LOG_CAP);

    lastUndo = { id: card.id, before: before, at: when };
    save();
    return card;
  }

  function canUndo() {
    load();
    return !!(lastUndo && state.cards[lastUndo.id]);
  }

  function undo() {
    load();
    if (!lastUndo || !state.cards[lastUndo.id]) return null;
    var id = lastUndo.id;
    var before = lastUndo.before;
    var at = lastUndo.at;
    state.cards[id] = before;
    var tail = state.log[state.log.length - 1];
    if (tail && tail.at === at && tail.topic === before.topic) state.log.pop();
    lastUndo = null;
    save();
    return state.cards[id];
  }

  function due(now) {
    load();
    var when = num(now, Date.now());
    return cardList().filter(function (c) {
      return num(c.due, 0) <= when;
    }).sort(function (a, b) { return num(a.due, 0) - num(b.due, 0); });
  }

  function nextDue() {
    var cards = all();
    if (!cards.length) return null;
    return num(cards[0].due, 0);
  }

  function preview(topic, grade) {
    load();
    var card = state.cards[norm(topic)];
    if (!card) return '';
    var next = compute(card, grade, Date.now());
    return next ? formatInterval(next.interval) : '';
  }

  function formatInterval(days) {
    var minutes = days * 1440;
    if (minutes < 60) return Math.max(1, Math.round(minutes)) + ' min';
    var hours = days * 24;
    if (hours < 24) return Math.round(hours) + ' h';
    if (days < 30) {
      var d = Math.round(days);
      return d + (d === 1 ? ' day' : ' days');
    }
    var months = days / 30.44;
    return (months < 10 ? Math.round(months * 10) / 10 : Math.round(months)) + ' mo';
  }

  function formatDue(ts, now) {
    var delta = num(ts, 0) - num(now, Date.now());
    if (delta <= 0) return 'Due now';
    return 'in ' + formatInterval(delta / DAY);
  }

  // ── statistics ───────────────────────────────────────────────────────────
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function stats() {
    load();
    var now = Date.now();
    var cards = cardList();
    var dueNow = cards.filter(function (c) { return num(c.due, 0) <= now; }).length;
    var learned = cards.filter(function (c) { return num(c.reps, 0) > 0; }).length;
    var reviews = state.log.length;
    var again = state.log.filter(function (l) { return l && l.grade === 'again'; }).length;
    var retention = reviews ? Math.round(((reviews - again) / reviews) * 100) : null;

    var days = {};
    state.log.forEach(function (l) { if (l && l.at) days[dayKey(l.at)] = true; });
    var streak = 0;
    var cursor = new Date();
    if (!days[dayKey(cursor.getTime())]) cursor.setDate(cursor.getDate() - 1);
    while (days[dayKey(cursor.getTime())]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      total: cards.length,
      due: dueNow,
      learned: learned,
      fresh: cards.length - learned,
      reviews: reviews,
      retention: retention,
      streak: streak
    };
  }

  // ── speech ───────────────────────────────────────────────────────────────
  function canSpeak() {
    return !!(root.speechSynthesis && root.SpeechSynthesisUtterance);
  }

  function cleanSpeech(text) {
    return String(text == null ? '' : text)
      .replace(/[•▪●]/g, ' ')
      .replace(/[#*_`>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stopSpeaking() {
    speech.current = null;
    speech.active = false;
    speech.utt = null;
    if (canSpeak()) {
      try { root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!canSpeak()) return false;
    var clean = cleanSpeech(text);
    if (!clean) return false;
    stopSpeaking();

    var token = {};
    var utter = new root.SpeechSynthesisUtterance(clean);
    utter.lang = opts.lang || 'en-IN';
    utter.rate = clamp(num(opts.rate, 0.95), 0.5, 1.6);
    utter.pitch = 1;
    function done() {
      if (speech.current !== token) return;
      speech.current = null;
      speech.active = false;
      speech.utt = null;
      if (typeof opts.onend === 'function') opts.onend();
    }
    utter.onend = done;
    utter.onerror = done;

    speech.current = token;
    speech.active = true;
    speech.utt = utter;
    try {
      root.speechSynthesis.speak(utter);
    } catch (e) {
      speech.current = null;
      speech.active = false;
      speech.utt = null;
      return false;
    }
    return true;
  }

  function isSpeaking() { return speech.active; }

  function speechFor(topic) {
    var c = content(topic);
    var parts = [String(topic) + '.'];
    if (c.facts.length) parts.push(c.facts.join(' '));
    else if (c.summary) parts.push(c.summary);
    return parts.join(' ');
  }

  // ── housekeeping ─────────────────────────────────────────────────────────
  function reload() {
    state = null;
    lastUndo = null;
  }

  root.RecallDeck = {
    KEY: KEY,
    GRADES: GRADES.slice(),
    storageOk: hasStorage,
    setTopics: setTopics,
    content: content,
    hasFacts: hasFacts,
    has: has,
    get: get,
    all: all,
    add: add,
    remove: remove,
    rate: rate,
    undo: undo,
    canUndo: canUndo,
    due: due,
    nextDue: nextDue,
    stats: stats,
    preview: preview,
    formatInterval: formatInterval,
    formatDue: formatDue,
    canSpeak: canSpeak,
    speak: speak,
    stopSpeaking: stopSpeaking,
    isSpeaking: isSpeaking,
    speechFor: speechFor,
    reload: reload
  };

  // Node-only export so the scheduler can be unit-tested without a browser.
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RecallDeck;
})(typeof window !== 'undefined' ? window : globalThis);

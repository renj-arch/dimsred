// Exam Tutor: wires the site's own WebLLM (VlymbooqAskLLM) into every exam page.
// Auto-detects the page (SSC-JE / Science / Polytechnic / Mental / fallback),
// builds a retrieval corpus from whatever banks that page already exposes, and
// adds two things: (1) an ask-box that composes exam-oriented explanations from
// matched bank items, (2) a practice-set GENERATOR that writes NEW questions on
// demand — especially for weak/never-tried topics found in the page's own history.
//
// Zero API key, zero cost: same WebLLM/Qwen backend as ask.html, runs on the
// visitor's GPU. First use downloads model weights (~1GB, cached by browser).

(function () {
  'use strict';

  var CORPUS = [];   // {q, a, h, s, subj}
  var PAGE = 'generic';
  var PAGE_NAME = 'Exam';
  var SUBJ_MAP = {};        // subj key -> pretty name (page-specific)
  var HIST_KEY = '';        // localStorage history key for this page
  var WEAK_KEY = '';        // localStorage weak-questions key
  var PYQ = null;           // data/pyq-patterns.json entry for this page (or null)
  var PYQ_KEY = '';         // which exams.* key matched

  // SSC-JE subject map (kept here so one file serves all pages)
  var SSC_SUBJ_MAP = {
    som: 'Strength of Materials', tom: 'Theory of Machines', thermo: 'Thermodynamics',
    fluids: 'Fluid Mechanics', design: 'Machine Design', production: 'Production Technology',
    workshop: 'Workshop Technology', industrial: 'Industrial Engineering',
    maths: 'Engineering Mathematics', emech: 'Engineering Mechanics',
    materials: 'Materials & Metallurgy', rac: 'Refrigeration & AC', ice: 'IC Engines',
    hydmach: 'Hydraulic Machines', aircomp: 'Air Compressors', steamturb: 'Steam Turbines',
    steamnozz: 'Steam Nozzles', boilers: 'Boilers', heatt: 'Heat Transfer',
    gasturb: 'Gas Turbines', powerplant: 'Power Plant', nuclear: 'Nuclear Power',
    renew: 'Renewable Energy', mechatronics: 'Mechatronics', maintenance: 'Maintenance',
    imor: 'Industrial Mgmt & OR', esepre: 'ESE Prelims', esemain: 'ESE Mains'
  };

  function pretty(slug) {
    return String(slug || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // Which PYQ weightage entry matches this page. Polytechnic has no published
  // multi-year analysis in pyq-weightage.json, so it stays null (chips hidden).
  function pyqKeyForPage() {
    if (PAGE === 'ssc') return 'ssc-je-mech';
    if (PAGE === 'science') return 'neet-biology';
    if (PAGE === 'mental') return 'ssc-cgl-tier1';
    if (PAGE === 'physics' || PAGE === 'math' || PAGE === 'chemistry') return 'jee-physics';
    return 'upsc-prelims';
  }

  // Fetch data/pyq-patterns.json (written by scripts/pyq-analyze.js). A 404
  // (not yet deployed) or parse error just leaves PYQ null — chips and prompt
  // bias are progressive enhancement, never a hard dependency.
  function loadPyq() {
    if (PYQ !== null) return Promise.resolve(PYQ);
    if (typeof fetch !== 'function') return Promise.resolve(null);
    PYQ_KEY = pyqKeyForPage();
    return fetch('data/pyq-patterns.json').then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    }).then(function (data) {
      PYQ = (data && data.exams && data.exams[PYQ_KEY]) || null;
      return PYQ;
    }).catch(function () {
      PYQ = false; // attempted, unavailable — don't re-fetch
      return null;
    });
  }

  function pyqTopics(n) {
    if (!PYQ || !Array.isArray(PYQ.topTopics)) return [];
    return PYQ.topTopics.slice(0, n || 8);
  }

  function pyqChipRow() {
    var topics = pyqTopics(6);
    if (!topics.length) return '';
    var chips = topics.map(function (t) {
      return '<button class="pyq-chip" data-t="' + String(t.topic).replace(/"/g, '&quot;') + '" ' +
        'style="padding:4px 10px;border-radius:100px;border:1px solid rgba(251,191,36,.35);' +
        'background:rgba(251,191,36,.08);color:#fbbf24;cursor:pointer;font-size:11px" ' +
        'title="' + String(t.detail || '').replace(/"/g, '&quot;') + '">' + t.topic + '</button>';
    }).join('');
    return '<div style="padding:6px 12px;border-bottom:1px solid rgba(255,255,255,.06)">' +
      '<div style="font-size:10.5px;color:#71717a;margin-bottom:4px">Most asked in past papers \u00B7 ' +
      (PYQ.name || PYQ_KEY) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px">' + chips + '</div></div>';
  }

  function wireChips() {
    if (!panel) return;
    panel.querySelectorAll('.pyq-chip').forEach(function (btn) {
      btn.onclick = function () {
        var input = panel.querySelector('input');
        if (input) {
          input.value = btn.dataset.t;
          input.focus();
        }
      };
    });
  }

  function detectPage() {
    var path = (typeof location !== 'undefined' ? location.pathname : '');
    if (Object.keys(window).some(function (k) { return k.indexOf('SSC_JE') === 0 && typeof window[k] === 'object' && window[k]; })) {
      PAGE = 'ssc'; PAGE_NAME = 'SSC-JE'; SUBJ_MAP = SSC_SUBJ_MAP;
      HIST_KEY = 'sscJeHist'; WEAK_KEY = 'sscJeWeak';
    } else if (/polytechnic/i.test(path) && window.SCI_POLY_BANK) {
      PAGE = 'poly'; PAGE_NAME = 'Polytechnic';
      HIST_KEY = 'science_training_data'; WEAK_KEY = 'poly_tutor_weak';
    } else if (typeof window.getScienceTopics === 'function') {
      PAGE = 'science'; PAGE_NAME = 'Science';
      HIST_KEY = 'science_training_data'; WEAK_KEY = 'science_tutor_weak';
    } else if (typeof window.getMentalGenerators === 'function') {
      PAGE = 'mental'; PAGE_NAME = 'Mental Ability';
      HIST_KEY = 'mental_training_data'; WEAK_KEY = 'mental_tutor_weak';
    } else {
      PAGE = 'generic'; PAGE_NAME = 'Exam';
      HIST_KEY = 'exam_tutor_hist'; WEAK_KEY = 'exam_tutor_weak';
    }
  }

  // ---- corpus: whatever the page already has in memory ----
  function buildCorpus() {
    if (CORPUS.length) return;
    if (PAGE === 'ssc') {
      Object.keys(window).filter(function (k) {
        return k.indexOf('SSC_JE') === 0 && typeof window[k] === 'object' && window[k];
      }).forEach(function (k) {
        var bank = window[k];
        Object.keys(bank).forEach(function (subj) {
          var arr = bank[subj];
          if (!Array.isArray(arr)) return;
          arr.forEach(function (item) {
            if (!item || !item.q) return;
            CORPUS.push({ q: item.q, a: item.a || '', h: item.h || '', s: item.s || '', subj: subj });
          });
        });
      });
    } else if (PAGE === 'poly') {
      var bank = window.SCI_POLY_BANK || {};
      ['easy', 'hard'].forEach(function (tier) {
        var groups = bank[tier] || {};
        Object.keys(groups).forEach(function (subj) {
          SUBJ_MAP[subj] = pretty(subj);
          var arr = groups[subj];
          if (!Array.isArray(arr)) return;
          arr.forEach(function (item) {
            if (!item || !item.q) return;
            CORPUS.push({ q: item.q, a: item.a || '', h: item.h || '', s: item.s || '', subj: subj });
          });
        });
      });
      // sample procedural generators once each for extra seeds
      var pGens = bank.generators || {};
      Object.keys(pGens).forEach(function (subj) {
        SUBJ_MAP[subj] = pretty(subj);
        (pGens[subj] || []).forEach(function (fn) {
          if (typeof fn !== 'function') return;
          try {
            var it = fn();
            if (it && it.q) CORPUS.push({ q: it.q, a: it.a || '', h: it.hint || it.h || '', s: it.solution || it.s || '', subj: subj });
          } catch (e) {}
        });
      });
    } else if (PAGE === 'science') {
      var topics = {};
      try { topics = window.getScienceTopics() || {}; } catch (e) {}
      Object.keys(topics).forEach(function (subject) {
        SUBJ_MAP[subject] = pretty(subject);
        (topics[subject] || []).forEach(function (slug) {
          SUBJ_MAP[slug] = pretty(slug);
          CORPUS.push({ q: pretty(slug), a: subject, h: '', s: 'Topic of ' + pretty(subject), subj: slug });
        });
      });
      // invoke each generator once for real sample questions (pure factories)
      var sciGens = {};
      try { sciGens = window.getScienceGenerators() || {}; } catch (e) {}
      Object.keys(sciGens).forEach(function (subject) {
        var byTopic = sciGens[subject] || {};
        Object.keys(byTopic).forEach(function (topic) {
          (byTopic[topic] || []).forEach(function (fn) {
            if (typeof fn !== 'function') return;
            try {
              var it = fn();
              if (it && it.q) {
                CORPUS.push({ q: it.q, a: it.a || '', h: it.hint || it.h || '', s: it.solution || it.s || '', subj: topic });
              }
            } catch (e) {}
          });
        });
      });
    } else if (PAGE === 'mental') {
      var gens = {};
      try { gens = window.getMentalGenerators() || {}; } catch (e) {}
      Object.keys(gens).forEach(function (mode) {
        SUBJ_MAP[mode] = pretty(mode);
        CORPUS.push({ q: pretty(mode) + ' (mental ability mode)', a: mode, h: '', s: '', subj: mode });
        var fn = gens[mode];
        if (typeof fn === 'function') {
          try {
            var it = fn();
            if (it && it.q) {
              CORPUS.push({ q: it.q, a: it.a || '', h: it.hint || it.h || '', s: it.solution || it.s || '', subj: mode });
            }
          } catch (e) {}
        }
      });
    }
  }

  function tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) {
      return w.length > 2;
    });
  }

  function retrieve(query, k) {
    buildCorpus();
    var qTokens = tokenize(query);
    if (!qTokens.length) return [];
    var scored = [];
    for (var i = 0; i < CORPUS.length; i++) {
      var item = CORPUS[i];
      var itemTokens = tokenize(item.q + ' ' + item.a + ' ' + item.h);
      var overlap = 0;
      for (var j = 0; j < qTokens.length; j++) {
        if (itemTokens.indexOf(qTokens[j]) >= 0) overlap++;
      }
      if (overlap > 0) scored.push({ item: item, score: overlap / qTokens.length });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k || 4).map(function (s) { return s.item; });
  }

  // ---- LLM compose: page-aware tutor prompt ----
  function tutorPrompt(question, matches) {
    var lines = [];
    matches.forEach(function (m, i) {
      lines.push('[' + (i + 1) + '] (' + (SUBJ_MAP[m.subj] || m.subj) + ')');
      lines.push('  Q: ' + m.q);
      lines.push('  A: ' + m.a);
      if (m.h) lines.push('  Hint: ' + m.h);
      if (m.s) lines.push('  Solution: ' + m.s.slice(0, 400));
    });
    return [
      'You are a ' + PAGE_NAME + ' exam tutor. Using ONLY the numbered reference Q/A pairs below,',
      'write a clear, exam-focused explanation for the student question.',
      '',
      'Student question: ' + question,
      '',
      'REFERENCE Q/A PAIRS:',
      lines.join('\n'),
      '',
      'Write in this structure:',
      '## Answer',
      'The direct answer in 1-2 sentences.',
      '## How this is asked',
      'One sentence on the typical question pattern (definition, numerical, assertion-reason).',
      '## Key points',
      '2-4 bullet points with formulas, values, or distinctions the examiner tests.',
      '## Common trap',
      'One sentence on the mistake students usually make here.',
      '',
      'Use ONLY facts from the reference pairs. If the pairs do not cover the question, say so honestly.'
    ].join('\n');
  }

  function askLLM(question, matches) {
    var llm = window.VlymbooqAskLLM;
    if (!llm || typeof llm.ensureEngine !== 'function') {
      return Promise.reject(new Error('LLM backend not loaded'));
    }
    return llm.ensureEngine(function (msg) {
      updateTutorStatus(msg);
    }).then(function (eng) {
      return eng.chat.completions.create({
        messages: [{ role: 'user', content: tutorPrompt(question, matches) }],
        temperature: 0.3,
        max_tokens: 1200,
        stream: false
      });
    }).then(function (res) {
      return res && res.choices && res.choices[0] && res.choices[0].message
        ? res.choices[0].message.content : '';
    });
  }

  // ---- UI ----
  var panel = null;
  var statusEl = null;
  var outputEl = null;

  function updateTutorStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  function ensurePanel() {
    if (panel && document.body.contains(panel)) return panel;
    panel = document.createElement('div');
    panel.id = 'ssc-tutor-panel';
    panel.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'width:420px', 'max-height:70vh',
      'background:#111113', 'border:1px solid rgba(255,255,255,.1)', 'border-radius:14px',
      'box-shadow:0 8px 32px rgba(0,0,0,.5)', 'z-index:9999', 'display:flex',
      'flex-direction:column', 'overflow:hidden', 'font-family:Inter,sans-serif'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center';
    header.innerHTML = '<span style="font-weight:700;color:#a78bfa;font-size:13px">\uD83E\uDDE0 ' + PAGE_NAME + ' Tutor</span>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'background:none;border:none;color:#71717a;cursor:pointer;font-size:14px';
    closeBtn.onclick = function () { panel.style.display = 'none'; };
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:8px';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask any ' + PAGE_NAME + ' concept\u2026';
    input.style.cssText = 'flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#09090b;color:#fafafa;font-size:13px';
    var askBtn = document.createElement('button');
    askBtn.textContent = 'Ask';
    askBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:none;background:#8b5cf6;color:#fff;font-weight:700;cursor:pointer;font-size:13px';
    inputRow.appendChild(input);
    inputRow.appendChild(askBtn);
    panel.appendChild(inputRow);

    statusEl = document.createElement('div');
    statusEl.style.cssText = 'padding:6px 14px;font-size:11.5px;color:#71717a;min-height:22px';
    panel.appendChild(statusEl);

    // PYQ chips row (progressive: filled async once pyq-patterns.json loads)
    var chipHost = document.createElement('div');
    chipHost.id = 'ssc-pyq-chips';
    panel.appendChild(chipHost);
    loadPyq().then(function () {
      if (!chipHost || !panel || !document.body.contains(chipHost)) return;
      chipHost.outerHTML = pyqChipRow() || '';
      wireChips();
    });

    outputEl = document.createElement('div');
    outputEl.style.cssText = 'padding:12px 16px;overflow-y:auto;flex:1;font-size:13px;line-height:1.6;color:#d4d4d8';
    outputEl.innerHTML = '<div style="color:#52525b;font-size:12px">Ask a question, or hit \u2728 Generate to have the model write a fresh practice set on your weak topics. First use downloads the AI model (~1GB, cached).</div>';
    panel.appendChild(outputEl);

    document.body.appendChild(panel);
    wireGenerator();

    function doAsk() {
      var q = input.value.trim();
      if (!q) return;
      askBtn.disabled = true;
      askBtn.textContent = '\u2026';
      statusEl.textContent = CORPUS.length ? 'Searching ' + CORPUS.length + ' items\u2026' : 'Composing\u2026';
      outputEl.innerHTML = '';
      var matches = retrieve(q, 4);
      if (!matches.length && CORPUS.length) {
        statusEl.textContent = '';
        outputEl.innerHTML = '<div style="color:#f59e0b">No matching bank item. The model can still try from its general knowledge:</div>';
        askLLM(q, []).then(function (raw) {
          outputEl.innerHTML = renderMD(raw);
          askBtn.disabled = false; askBtn.textContent = 'Ask';
        }).catch(function () {
          askBtn.disabled = false; askBtn.textContent = 'Ask';
        });
        return;
      }
      askLLM(q, matches).then(function (raw) {
        statusEl.textContent = '';
        outputEl.innerHTML = renderMD(raw);
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
      }).catch(function (err) {
        statusEl.textContent = '';
        outputEl.innerHTML = '<div style="color:#ef4444">Model error: ' + (err && err.message || err) + '</div>' +
          (matches.length ? '<div style="margin-top:8px;color:#a1a1aa;font-size:12px">Retrieved from bank (no LLM):</div>' +
            matches.map(function (m) { return '<div style="margin-top:6px;padding:8px;background:#18181b;border-radius:8px;font-size:12px"><b>' + m.q + '</b><br>' + m.a + '</div>'; }).join('') : '');
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
      });
    }
    askBtn.onclick = doAsk;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAsk(); });

    return panel;
  }

  function renderMD(text) {
    return String(text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^## (.+)$/gm, '<div style="font-weight:700;color:#a78bfa;margin:10px 0 4px;font-size:13px">$1</div>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/^[-•] (.+)$/gm, '<div style="margin:2px 0 2px 12px">$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function askAboutQuestion(qText, answer) {
    var p = ensurePanel();
    p.style.display = 'flex';
    var input = p.querySelector('input');
    if (input) input.value = qText;
    var askBtn = p.querySelectorAll('button')[1];
    if (askBtn) askBtn.click();
  }

  function openTutor() {
    var p = ensurePanel();
    p.style.display = p.style.display === 'none' ? 'flex' : 'none';
  }

  // ---- weak-spot analyzer: page-aware history ----
  function analyzeGaps() {
    buildCorpus();
    var weak = {};
    var practiced = {};

    if (PAGE === 'ssc') {
      var hist = [];
      try { hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) {}
      hist.forEach(function (r) {
        if (!r || !r.s) return;
        var pct = r.p || (r.t ? Math.round(r.sc / r.t * 100) : 0);
        var key = r.s.toLowerCase();
        practiced[key] = true;
        if (!weak[key] || pct < weak[key].pct) weak[key] = { pct: pct };
      });
    } else if (PAGE === 'science' || PAGE === 'mental') {
      // state.stats = {modeKey: {attempts, correct}}
      var state = null;
      try { state = JSON.parse(localStorage.getItem(HIST_KEY) || 'null'); } catch (e) {}
      var stats = (state && state.stats) || {};
      Object.keys(stats).forEach(function (mode) {
        var st = stats[mode];
        if (!st || !st.attempts) return;
        var pct = Math.round(st.correct / st.attempts * 100);
        practiced[mode] = true;
        weak[mode] = { pct: pct };
      });
      // sessions[] also carries mode per session (belt & braces)
      var sessions = (state && state.sessions) || [];
      sessions.forEach(function (s) {
        if (!s || !s.mode) return;
        if (!practiced[s.mode]) practiced[s.mode] = true;
      });
    }

    var never = [];
    var lowScore = [];
    Object.keys(SUBJ_MAP).forEach(function (k) {
      if (!CORPUS.some(function (c) { return c.subj === k; })) return;
      var name = SUBJ_MAP[k];
      if (!practiced[k]) never.push({ subj: k, name: name });
      else if (weak[k] && weak[k].pct < 60) lowScore.push({ subj: k, name: name, pct: weak[k].pct });
    });
    lowScore.sort(function (a, b) { return a.pct - b.pct; });
    return { never: never, lowScore: lowScore };
  }

  // ---- generator: WebLLM writes new practice questions ----
  function genPrompt(subjName, seedQs, count) {
    var seeds = (seedQs || []).slice(0, 8).map(function (q) { return '- ' + q; }).join('\n');
    var bias = pyqTopics(6);
    var biasLines = bias.length
      ? ['',
        'MOST-ASKED TOPICS in real ' + (PYQ.name || PAGE_NAME) + ' past papers',
        '(bias your questions toward these; mix them with ' + subjName + ' itself):',
        bias.map(function (t) { return '- ' + t.topic + ' (' + (t.detail || '') + ')'; }).join('\n')]
      : [];
    return [
      'You are a ' + PAGE_NAME + ' exam question setter.',
      'Generate ' + count + ' NEW practice questions on: ' + subjName + '.',
      '',
      'STYLE: exam-pattern mix of definition, numerical, and',
      '"which of the following" conceptual questions. Do NOT copy the',
      'seed questions below — use them only to gauge depth and avoid duplicates.',
      ''
    ].concat(biasLines, [
      '',
      'Existing questions on this topic (DO NOT DUPLICATE):',
      seeds || '(none provided)',
      '',
      'Output STRICT JSON array, no markdown, no explanation. Each element:',
      '{"q":"question text","a":"answer text","h":"one-line hint","s":"2-3 sentence solution/explanation"}',
      '',
      'Rules:',
      '- q must be a real exam-style question, not a topic label.',
      '- a must be the direct correct answer (formula value, term, or short sentence).',
      '- h gives the student a nudge without giving it away.',
      '- s explains WHY, with the formula or reasoning chain.',
      '- Questions must be on DIFFERENT sub-topics within ' + subjName + '.',
      '- Use only standard syllabus content; no made-up facts.',
      '',
      'Return ONLY the JSON array.'
    ]).join('\n');
  }

  function generatePractice(subjKey, count) {
    var subjName = SUBJ_MAP[subjKey] || subjKey;
    buildCorpus();
    var seedQs = CORPUS.filter(function (c) { return c.subj === subjKey; }).map(function (c) { return c.q; });
    var status = statusEl;
    if (status) status.textContent = 'Generating ' + count + ' new ' + subjName + ' questions\u2026 (first use downloads model ~1GB)';
    var llm = window.VlymbooqAskLLM;
    if (!llm || typeof llm.ensureEngine !== 'function') {
      return Promise.reject(new Error('LLM backend not loaded'));
    }
    return llm.ensureEngine(function (msg) { if (status) status.textContent = msg; }).then(function (eng) {
      return eng.chat.completions.create({
        messages: [{ role: 'user', content: genPrompt(subjName, seedQs, count) }],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      });
    }).then(function (res) {
      var raw = res && res.choices && res.choices[0] && res.choices[0].message
        ? res.choices[0].message.content : '';
      if (status) status.textContent = '';
      var clean = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      var arr = JSON.parse(clean);
      if (!Array.isArray(arr)) throw new Error('Model did not return an array');
      var valid = arr.filter(function (x) { return x && x.q && x.a; }).map(function (x) {
        return { q: String(x.q), a: String(x.a), h: String(x.h || ''), s: String(x.s || '') };
      });
      if (!valid.length) throw new Error('No valid questions generated');
      return valid;
    });
  }

  // ---- practice-set renderer: flashcards in the panel ----
  function renderPracticeSet(questions, subjName) {
    if (!outputEl) return;
    var idx = 0, score = 0;
    function renderCard() {
      if (idx >= questions.length) {
        outputEl.innerHTML = '<div style="text-align:center;padding:20px">' +
          '<div style="font-size:20px;font-weight:800;color:#a78bfa">' + score + ' / ' + questions.length + '</div>' +
          '<div style="color:#71717a;font-size:12px;margin-top:4px">generated ' + subjName + ' set complete</div>' +
          '<button id="pp-again" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;font-size:12px">Generate another set</button>' +
          '</div>';
        var again = document.getElementById('pp-again');
        if (again) again.onclick = function () {
          var genBtn = document.getElementById('ssc-gen-btn');
          if (genBtn) genBtn.click();
        };
        return;
      }
      var q = questions[idx];
      var h = '<div style="margin-bottom:12px">';
      h += '<div style="font-size:11px;color:#71717a;margin-bottom:4px">Q' + (idx + 1) + ' / ' + questions.length + ' \u00B7 ' + subjName + '</div>';
      h += '<div style="font-weight:600;color:#fafafa;margin-bottom:8px">' + q.q + '</div>';
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
      h += '<button class="pp-toggle" data-t="h" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:#18181b;color:#a1a1aa;cursor:pointer;font-size:11px">Hint</button>';
      h += '<button class="pp-toggle" data-t="a" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:#18181b;color:#a1a1aa;cursor:pointer;font-size:11px">Answer</button>';
      h += '<button class="pp-toggle" data-t="s" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:#18181b;color:#a1a1aa;cursor:pointer;font-size:11px">Solution</button>';
      h += '</div>';
      h += '<div class="pp-body" data-t="h" style="display:none;padding:8px;background:#18181b;border-radius:8px;font-size:12px;color:#a1a1aa;margin-bottom:4px">' + q.h + '</div>';
      h += '<div class="pp-body" data-t="a" style="display:none;padding:8px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:8px;font-size:13px;color:#34d399;margin-bottom:4px">' + q.a + '</div>';
      h += '<div class="pp-body" data-t="s" style="display:none;padding:8px;background:#18181b;border-radius:8px;font-size:12px;color:#d4d4d8;margin-bottom:8px">' + q.s + '</div>';
      h += '<div style="display:flex;gap:8px;margin-top:8px">';
      h += '<button class="pp-know" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.1);color:#34d399;cursor:pointer;font-weight:700;font-size:12px">Got it \u2713</button>';
      h += '<button class="pp-dunno" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-weight:700;font-size:12px">Didn\'t know</button>';
      h += '</div></div>';
      outputEl.innerHTML = h;
      outputEl.querySelectorAll('.pp-toggle').forEach(function (btn) {
        btn.onclick = function () {
          var t = btn.dataset.t;
          var body = outputEl.querySelector('.pp-body[data-t="' + t + '"]');
          if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
        };
      });
      outputEl.querySelector('.pp-know').onclick = function () { score++; idx++; renderCard(); };
      outputEl.querySelector('.pp-dunno').onclick = function () {
        try {
          var weak = JSON.parse(localStorage.getItem(WEAK_KEY) || '[]');
          weak.push({ q: q.q, subj: subjName, at: Date.now() });
          if (weak.length > 200) weak = weak.slice(-200);
          localStorage.setItem(WEAK_KEY, JSON.stringify(weak));
        } catch (e) {}
        idx++; renderCard();
      };
    }
    renderCard();
  }

  // wire the generate button into the panel
  function wireGenerator() {
    if (!panel) return;
    if (panel.querySelector('#ssc-gen-row')) return;
    var row = document.createElement('div');
    row.id = 'ssc-gen-row';
    row.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:6px;align-items:center;flex-wrap:wrap';
    var sel = document.createElement('select');
    sel.id = 'ssc-gen-subj';
    sel.style.cssText = 'flex:1;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,250,.1);background:#09090b;color:#d4d4d8;font-size:12px;min-width:0';
    var gaps = analyzeGaps();
    var optWeak = document.createElement('option');
    optWeak.value = '__weak';
    optWeak.textContent = gaps.lowScore.length ? '\u26A0 Weak: ' + gaps.lowScore[0].name + ' (' + gaps.lowScore[0].pct + '%)' : 'Weak spots (auto)';
    sel.appendChild(optWeak);
    if (gaps.never.length) {
      var optNever = document.createElement('option');
      optNever.value = gaps.never[0].subj;
      optNever.textContent = '\u2691 Not yet tried: ' + gaps.never[0].name;
      sel.appendChild(optNever);
    }
    var sep = document.createElement('optgroup');
    sep.label = 'All subjects';
    Object.keys(SUBJ_MAP).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      o.textContent = SUBJ_MAP[k];
      sep.appendChild(o);
    });
    sel.appendChild(sep);
    row.appendChild(sel);
    var countSel = document.createElement('select');
    countSel.id = 'ssc-gen-count';
    countSel.style.cssText = 'padding:6px 6px;border-radius:6px;border:1px solid rgba(255,255,250,.1);background:#09090b;color:#d4d4d8;font-size:12px';
    [5, 8, 10].forEach(function (n) {
      var o = document.createElement('option');
      o.value = n; o.textContent = n + ' Q';
      countSel.appendChild(o);
    });
    row.appendChild(countSel);
    var genBtn = document.createElement('button');
    genBtn.id = 'ssc-gen-btn';
    genBtn.textContent = '\u2728 Generate';
    genBtn.style.cssText = 'padding:6px 12px;border-radius:6px;border:none;background:#8b5cf6;color:#fff;font-weight:700;cursor:pointer;font-size:12px';
    row.appendChild(genBtn);
    panel.insertBefore(row, statusEl);
    genBtn.onclick = function () {
      var subj = sel.value;
      var count = parseInt(countSel.value, 10) || 5;
      if (subj === '__weak') {
        var g = analyzeGaps();
        subj = g.lowScore.length ? g.lowScore[0].subj : (g.never.length ? g.never[0].subj : Object.keys(SUBJ_MAP)[0]);
      }
      genBtn.disabled = true;
      outputEl.innerHTML = '<div style="color:#52525b;font-size:12px">Generating\u2026 the model is writing exam-style questions from the syllabus.</div>';
      generatePractice(subj, count).then(function (qs) {
        genBtn.disabled = false;
        renderPracticeSet(qs, SUBJ_MAP[subj] || subj);
      }).catch(function (err) {
        genBtn.disabled = false;
        if (statusEl) statusEl.textContent = '';
        outputEl.innerHTML = '<div style="color:#ef4444">Generation failed: ' + (err && err.message || err) + '</div>' +
          '<div style="color:#71717a;font-size:11px;margin-top:6px">If this is the first use, the model may still be downloading (~1GB). Try again in a minute.</div>';
      });
    };
  }

  // Expose (both names: legacy SscJeTutor + generic ExamTutor)
  window.ExamTutor = window.SscJeTutor = {
    ask: askAboutQuestion,
    open: openTutor,
    retrieve: retrieve,
    corpusSize: function () { buildCorpus(); return CORPUS.length; },
    generatePractice: generatePractice,
    analyzeGaps: analyzeGaps
  };

  // ---- inject "Ask model" button into each quiz card via MutationObserver (ssc only, known DOM) ----
  function injectCardButton() {
    if (PAGE !== 'ssc' || typeof MutationObserver === 'undefined') return;
    var target = document.getElementById('ssc-je-container');
    if (!target) { setTimeout(injectCardButton, 500); return; }
    var obs = new MutationObserver(function () {
      var card = target.querySelector('.ssc-card');
      if (!card) return;
      if (card.querySelector('.ssc-tutor-btn')) return;
      var sections = card.querySelector('.ssc-nav');
      if (!sections) return;
      var btn = document.createElement('button');
      btn.className = 'ssc-tutor-btn';
      btn.innerHTML = '\uD83E\uDDE0 Ask model';
      btn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.1);color:#a78bfa;cursor:pointer;font-size:12px;font-weight:600;margin:0 4px';
      btn.onclick = function (e) {
        e.stopPropagation();
        var qEl = card.querySelector('.ssc-qtext');
        var aEl = card.querySelector('#ssc-ans');
        askAboutQuestion(qEl ? qEl.textContent : '', aEl ? aEl.textContent : '');
      };
      sections.parentNode.insertBefore(btn, sections);
    });
    obs.observe(target, { childList: true, subtree: true });
  }

  // ---- floating tutor toggle button ----
  function addToggleButton() {
    if (document.getElementById('ssc-tutor-toggle')) return;
    var b = document.createElement('button');
    b.id = 'ssc-tutor-toggle';
    b.innerHTML = '\uD83E\uDDE0 Tutor';
    b.title = 'AI tutor \u2014 ask any ' + PAGE_NAME + ' concept, generate practice sets';
    b.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'width:auto', 'padding:10px 16px',
      'border-radius:100px', 'border:none', 'background:#8b5cf6', 'color:#fff',
      'font-weight:700', 'cursor:pointer', 'z-index:9998', 'font-size:13px',
      'box-shadow:0 4px 16px rgba(139,92,246,.4)'
    ].join(';');
    b.onclick = function () {
      var existing = document.getElementById('ssc-tutor-panel');
      if (existing && existing.style.display !== 'none') {
        existing.style.display = 'none';
        b.style.display = 'inline-flex';
      } else {
        ensurePanel().style.display = 'flex';
        b.style.display = 'none';
      }
    };
    document.body.appendChild(b);

    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () {
      var p = document.getElementById('ssc-tutor-panel');
      if (p) b.style.display = p.style.display === 'none' ? 'inline-flex' : 'none';
    });
    if (document.getElementById('ssc-tutor-panel')) {
      obs.observe(document.getElementById('ssc-tutor-panel'), { attributes: true, attributeFilter: ['style'] });
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      detectPage();
      buildCorpus();
      loadPyq();
      addToggleButton();
      injectCardButton();
    });
  }
})();

// SSC-JE Tutor: wires the site's own WebLLM (VlymbooqAskLLM) into ssc-je.html.
// Retrieval is over the ALREADY-IN-MEMORY question banks (window.SSC_JE_*,
// ~6,080 q/a/h/s tuples) — no network fetch, no Ask index needed. The LLM
// composes a deeper exam-oriented explanation from the top-matched tuples.
//
// Zero API key, zero cost: same WebLLM/Qwen backend as ask.html, runs on the
// visitor's GPU. First use downloads model weights (~1GB, cached by browser).

(function () {
  'use strict';

  // ---- retrieval: merge every window.SSC_JE_* bank, score by term overlap ----
  var CORPUS = [];   // {q, a, h, s, subj}
  var SUBJ_MAP = {
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

  function buildCorpus() {
    if (CORPUS.length) return;
    var keys = Object.keys(window).filter(function (k) {
      return k.indexOf('SSC_JE') === 0 && typeof window[k] === 'object' && window[k] !== null;
    });
    keys.forEach(function (k) {
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
      var qTokensSet = tokenize(item.q + ' ' + item.a + ' ' + item.h);
      var overlap = 0;
      for (var j = 0; j < qTokens.length; j++) {
        if (qTokensSet.indexOf(qTokens[j]) >= 0) overlap++;
      }
      if (overlap > 0) scored.push({ item: item, score: overlap / qTokens.length });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k || 4).map(function (s) { return s.item; });
  }

  // ---- LLM compose: exam-oriented tutor prompt, not the UPSC-mains one ----
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
      'You are an SSC-JE Mechanical exam tutor. Using ONLY the numbered reference Q/A pairs below,',
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
      '## How SSC-JE asks this',
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
      var raw = res && res.choices && res.choices[0] && res.choices[0].message
        ? res.choices[0].message.content : '';
      return raw;
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
    header.innerHTML = '<span style="font-weight:700;color:#a78bfa;font-size:13px">\uD83E\uDDE0 SSC-JE Tutor</span>';
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
    input.placeholder = 'Ask any SSC-JE concept\u2026';
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

    outputEl = document.createElement('div');
    outputEl.style.cssText = 'padding:12px 16px;overflow-y:auto;flex:1;font-size:13px;line-height:1.6;color:#d4d4d8';
    outputEl.innerHTML = '<div style="color:#52525b;font-size:12px">Type a question or click "Ask model" on any quiz card. First use downloads the AI model (~1GB, cached).</div>';
    panel.appendChild(outputEl);

    document.body.appendChild(panel);

    function doAsk() {
      var q = input.value.trim();
      if (!q) return;
      askBtn.disabled = true;
      askBtn.textContent = '\u2026';
      statusEl.textContent = 'Searching ' + CORPUS.length + ' questions\u2026';
      outputEl.innerHTML = '';
      var matches = retrieve(q, 4);
      if (!matches.length) {
        statusEl.textContent = '';
        outputEl.innerHTML = '<div style="color:#f59e0b">No matching questions in the SSC-JE bank. Try a more specific term (e.g. "thermal stress", "gate riser casting").</div>';
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
        return;
      }
      askLLM(q, matches).then(function (raw) {
        statusEl.textContent = '';
        outputEl.innerHTML = renderMD(raw);
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
      }).catch(function (err) {
        statusEl.textContent = '';
        outputEl.innerHTML = '<div style="color:#ef4444">Model error: ' + (err && err.message || err) + '</div><div style="margin-top:8px;color:#a1a1aa;font-size:12px">Retrieved from bank (no LLM):</div>' +
          matches.map(function (m) { return '<div style="margin-top:6px;padding:8px;background:#18181b;border-radius:8px;font-size:12px"><b>' + m.q + '</b><br>' + m.a + '</div>'; }).join('');
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

  // Expose for the quiz card button injection
  window.SscJeTutor = {
    ask: askAboutQuestion,
    open: openTutor,
    retrieve: retrieve,
    corpusSize: function () { buildCorpus(); return CORPUS.length; }
  };

  // ---- inject "Ask model" button into each quiz card via MutationObserver ----
  function injectCardButton() {
    if (typeof MutationObserver === 'undefined') return;
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
        var qText = qEl ? qEl.textContent : '';
        var aText = aEl ? aEl.textContent : '';
        askAboutQuestion(qText, aText);
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
    b.title = 'AI tutor — ask any SSC-JE concept';
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

    // hide toggle when panel is open
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
      buildCorpus();
      addToggleButton();
      injectCardButton();
    });
  }
})();

// The composing mind of the engine: a local language model that reads the facts
// the retrieval layer gathered and writes the answer from them.
//
// Retrieval can tell you which sentences exist; it cannot tell you what they
// mean together. "Regulating emerging technologies" has no single entity, so no
// lookup reaches it, and a keyword scorer only finds sentences that happen to
// share a word. This module closes that gap the way a person would: it hands the
// model the question and every relevant sentence the corpus holds, and lets the
// model reason over them into one structured answer.
//
// It runs entirely on the user's machine. WebLLM compiles the weights for the
// visitor's own GPU; there is no API key, no account, and no request leaves the
// browser. The weights (~1 GB) download once from a public CDN and are then
// cached by the browser's own storage, so later visits start instantly.
//
// The model is given the facts, not asked to remember them. Its instructions
// forbid inventing a claim the corpus does not support, and every sentence it
// borrows keeps its source, so the answer stays checkable.
(function (root, factory) {
if (typeof module === 'object' && module.exports) {
  module.exports = factory();
} else {
  root.VlymbooqAskLLM = factory();
}
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

// A small instruction-tuned model is enough: the reasoning is over twenty or
// thirty retrieved sentences, not over world knowledge. Smaller compiles faster
// and runs on hardware without a discrete GPU. Qwen is chosen because its
// instruction following is reliable at this size, which matters more than raw
// breadth for a fixed answer template.
var MODEL_ID = 'Qwen/Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
var LIB_URL = 'https://esm.run/@mlc-ai/web-llm';

var engine = null;
var loading = null;
var engineError = null;

// Progress is reported through a callback because compiling a model takes long
// enough that a silent page looks broken. The caller paints each stage.
function loadLibrary() {
  if (typeof window !== 'undefined' && window.webllm) {
    return Promise.resolve(window.webllm);
  }
  return import(LIB_URL).then(function (mod) {
    if (typeof window !== 'undefined') window.webllm;
    return mod;
  }).catch(function () {
    // The CDN import can be blocked where the page itself is served from disk.
    // Falling back to a classic script tag keeps the feature alive as long as
    // any network is reachable at all.
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/@mlc-ai/web-llm@0.2.79/dist/webllm.js';
      s.onload = function () { resolve(window.webllm); };
      s.onerror = function () { reject(new Error('WebLLM library could not be loaded')); };
      document.head.appendChild(s);
    });
  });
}

// Boot the engine once. Subsequent calls share the same promise, so mashing the
// ask button cannot start three compiles at once.
function ensureEngine(onProgress) {
  if (engine) return Promise.resolve(engine);
  if (engineError) return Promise.reject(engineError);
  if (loading) return loading;

  if (typeof navigator !== 'undefined' && !navigator.gpu) {
    engineError = new Error(
      'This browser has no WebGPU, so the answer writer cannot run. ' +
      'Use a recent Chrome or Edge, or set chrome://flags/#enable-unsafe-webgpu.');
    return Promise.reject(engineError);
  }

  var report = onProgress || function () {};
  loading = loadLibrary().then(function (webllm) {
    report('downloading the writing model (about 1 GB, once)…');
    return webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: function (p) {
        var pct = p.progress == null ? 0 : Math.round(p.progress * 100);
        report(pct < 100
          ? 'preparing the writing model… ' + pct + '%'
          : 'ready');
      }
    });
  }).then(function (eng) {
    engine = eng;
    loading = null;
    return engine;
  }).catch(function (err) {
    loading = null;
    engineError = err;
    throw err;
  });
  return loading;
}

// Decide what to search for, before searching.
//
// This is the step a keyword engine cannot do and a model can. Asked about
// "regulating emerging technologies when innovation develops faster than legal
// frameworks", a literal search finds sentences containing those words and
// nothing about the Artificial Intelligence Act, the GDPR, or risk-tiered
// regulation -- because the corpus files those under entity names the question
// never writes. The model knows that "emerging technologies" is spoken of as
// "artificial intelligence" and "regulation" as "oversight" or "governance", and
// this turns that knowledge into search terms.
//
// The output is a short list, not prose, so it can be handed straight to the
// same retrieval the literal question would have used. Terms the corpus lacks
// cost one cheap index probe each, which is why brevity is requested.
function expand(question, opts) {
  opts = opts || {};
  var onProgress = opts.onProgress || function () {};
  if (!question) return Promise.resolve(null);

  return ensureEngine(onProgress).then(function (eng) {
    onProgress('deciding what to search for…');
    return eng.chat.completions.create({
      messages: [{
        role: 'user',
        content: [
          'A search engine will look up facts to answer a question.',
          'It can only find text that literally contains the terms you give it.',
          'Question: ' + question,
          '',
          'Name up to ' + (opts.max || 8) + ' specific topics, entities, laws,',
          'institutions or technologies this question is really about -- the',
          'things a knowledgeable person would look up to answer it.',
          'Prefer names the corpus would actually use: laws, acts, agencies,',
          'technologies, agreements.',
          '',
          'Reply with the terms only, one per line, no numbering, no prose.'
        ].join('\n')
      }],
      temperature: 0.2,
      max_tokens: 200,
      stream: false
    });
  }).then(function (res) {
    var raw = res && res.choices && res.choices[0] && res.choices[0].message
      ? res.choices[0].message.content : '';
    var list = String(raw).split(/\r?\n/)
      .map(function (s) { return s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim(); })
      .filter(function (s) { return s && s.length >= 3 && s.length <= 80; })
      .slice(0, opts.max || 8);
    onProgress('ready');
    return list.length ? { terms: list, raw: raw } : null;
  });
}

// Build the prompt. The facts come first, numbered, so the model treats them as
// the source of truth; the instruction comes last so it is the most recent thing
// the model reads. Every fact carries its entity name, which is what lets the
// model tell a real citation from a plausible invention.
function buildPrompt(question, facts) {
  var lines = [];
  facts.forEach(function (f, i) {
    lines.push('[' + (i + 1) + '] (' + (f.entity || 'corpus') + ') ' + f.sentence);
  });

  return [
    'You are answering a UPSC mains question using ONLY the numbered facts below.',
    'Question: ' + question,
    '',
    'FACTS:',
    lines.join('\n'),
    '',
    'Write the answer in this exact structure:',
    '',
    '## Introduction',
    'Two or three sentences framing the issue.',
    '',
    '## Challenges',
    'Group the facts into dimensions (institutional, technical, risk/rights,',
    'economic, social, cross-border as they apply). Each point must rest on a',
    'fact. Cite the fact number in brackets after the sentence, like [2].',
    '',
    '## Way forward',
    'Recommendations that follow from the facts. If the facts do not support a',
    'recommendation, say so plainly instead of inventing one.',
    '',
    'Rules:',
    '- Use only facts from the list. Never invent a number, name, or event.',
    '- Keep every fact\'s citation number.',
    '- Write in clear prose for an exam, not bullet fragments.',
    '- If the facts are too thin to answer, say exactly what is missing.'
  ].join('\n');
}

// Parse the model's reply into the sections the page already renders. The
// structure is requested in the prompt, so this only needs to recognise the
// headings; anything the model returns outside them still lands in a body line
// rather than being dropped, because a dropped line is a fact the user cannot
// check.
function parse(text) {
  var sections = [];
  var current = null;
  String(text || '').split(/\r?\n/).forEach(function (raw) {
    var line = raw.trim();
    var m = /^(#{1,3}|\*\*)\s*(.+?)\s*(\*\*|##)?$/.exec(line);
    if (m && /^(introduction|challenges|way\s*forward|conclusion|dimensions)/i.test(m[2])) {
      current = { heading: m[2].replace(/\s*#+$/, '').trim(), lines: [] };
      sections.push(current);
      return;
    }
    if (!line) return;
    if (!current) { current = { heading: 'Answer', lines: [] }; sections.push(current); }
    current.lines.push(line.replace(/^[-*]\s+/, ''));
  });
  return sections;
}

// The one call the page makes. Loads the model on first use, sends the question
// and facts, and returns parsed sections plus the raw text so the caller can
// show either.
function synthesize(question, facts, opts) {
  opts = opts || {};
  var onProgress = opts.onProgress || function () {};
  if (!facts || !facts.length) {
    return Promise.resolve(null);
  }

  return ensureEngine(onProgress).then(function (eng) {
    onProgress('composing the answer…');
    return eng.chat.completions.create({
      messages: [{ role: 'user', content: buildPrompt(question, facts) }],
      temperature: opts.temperature == null ? 0.3 : opts.temperature,
      max_tokens: opts.maxTokens || 900,
      stream: false
    });
  }).then(function (res) {
    var raw = res && res.choices && res.choices[0] && res.choices[0].message
      ? res.choices[0].message.content : '';
    onProgress('ready');
    return { sections: parse(raw), raw: raw, method: 'llm' };
  });
}

return {
  synthesize: synthesize,
  expand: expand,
  ensureEngine: ensureEngine,
  buildPrompt: buildPrompt,
  parse: parse,
  MODEL_ID: MODEL_ID
};
}));

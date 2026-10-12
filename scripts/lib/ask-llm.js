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
//
// Two sizes are offered: the 1.5B that anyone's GPU can drive, and a 3B that
// writes somewhat better prose at roughly twice the wait. The org prefix is
// `mlc-ai/` -- the WebLLM 0.2.86 catalog no longer serves the older `Qwen/`
// prefix, and asking for a record the catalog does not hold fails with a
// ModelNotFoundError before a single weight is fetched.
//
// A third entry appears when it exists: `mine`, the model fine-tuned on this
// page's own answers by the Train Writer Model workflow. Its weights live on
// the repo's `writer-model` branch; probeMine() checks for them and, on a hit,
// adds the option. Until the first training run finishes, only the two stock
// sizes show -- nothing breaks, the option is simply absent.
var MODELS = {
  fast:    { id: 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Fast (1.5B)' },
  quality: { id: 'mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC',   label: 'Quality (3B, slower)' }
};
var DEFAULT_MODEL = 'fast';

// The fine-tuned model's home. WebLLM's GitHub-URL resolver appends
// `resolve/main/` to any raw.githubusercontent URL that does not already
// contain one, so the branch carries a literal `resolve/main/` directory and
// this base URL is the prefix that resolves to it. version.json (at the branch
// root, fetched directly, no resolver) is the small manifest the page reads to
// discover whether a model exists and how many records trained it.
//
// The compiled kernel is the STOCK 0.5B wasm from the WebLLM binary catalog:
// fine-tuning changes weights, not architecture, so the prebuilt kernel runs
// the fine-tuned shards as-is -- CI never has to compile wasm.
var MINE_BASE = 'https://raw.githubusercontent.com/renj-arch/dimsred/writer-model/';
var MINE_VERSION = MINE_BASE + 'version.json';
var MINE_LIB = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_86/base/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm';
var mineMeta = null;
var mineProbe = null;

function mineInfo() { return mineMeta; }

// Probe once per page load (no-store: a newly published model should appear
// without a hard refresh). A 404 or network miss is normal -- the branch does
// not exist until the first training run -- and resolves to null, never
// rejects, so callers can treat "no mine model" as a routine state.
function ensureMine() {
  if (mineProbe) return mineProbe;
  if (typeof fetch !== 'function') return Promise.resolve(null);
  mineProbe = fetch(MINE_VERSION + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) return null;
      return r.json();
    })
    .then(function (meta) {
      if (!meta || !meta.records) return null;
      mineMeta = meta;
      MODELS.mine = {
        id: 'mine',
        label: 'Mine (' + meta.records + ' answers)',
        model: MINE_BASE,
        model_id: 'mine',
        model_lib: MINE_LIB,
        low_resource_required: true,
        vram_required_MB: meta.vram_required_MB || 944.62,
        overrides: { context_window_size: meta.context_window_size || 4096 }
      };
      return meta;
    })
    .catch(function () { return null; });
  return mineProbe;
}

function modelsList() {
  return Object.keys(MODELS).map(function (key) {
    return { key: key, label: MODELS[key].label };
  });
}

function currentModelKey() {
  try {
    var k = typeof localStorage !== 'undefined' && localStorage.getItem('askModel');
    // A stored 'mine' only counts once the probe has confirmed the model
    // exists; otherwise fall back to the default rather than compile a record
    // the branch does not hold yet.
    if (k && MODELS[k]) return k;
  } catch (e) { /* private mode etc. -- fall back */ }
  return DEFAULT_MODEL;
}

function modelId() { return MODELS[currentModelKey()].id; }
// The library is vendored with the page (scripts/vendor/webllm, pinned to the
// version this code was written against) so the only network dependency is the
// model weights themselves. The CDN is a fallback for pages opened straight
// from disk, where a relative module import is refused: file:// cannot serve
// modules, but an https module URL still can. Both routes return the same ES
// module -- the CDN copy is the same file byte for byte (verified by hash) --
// and the raw npm path is used rather than a CDN transform like esm.run,
// whose rewritten bundle failed to resolve this model id.
var VENDOR_URL = 'scripts/vendor/webllm/index.min.js';
var CDN_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/lib/index.min.js';

var engine = null;
var engineKey = null;
var loading = null;
var engineError = null;

// --- pluggable writer ------------------------------------------------------
// The three prompts below (expand / plan / write) are the whole instruction
// set. They are plain strings -- no model knowledge is baked into them -- so
// the engine behind them can be swapped without touching retrieval, scoring,
// or the page. Two ways to plug a different model in, both independent of any
// CDN:
//
//   1. A function: VlymbooqAskLLM.setBackend(function (prompt, opts) {
//        return fetch('http://localhost:8080/v1/completions', ...);  // -> string
//      });
//   2. An OpenAI-compatible engine object (anything shaped like
//      { chat: { completions: { create: ... } } } -- WebLLM's own shape) --
//      set it directly, or define window.AskWriterBackend before loading
//      this file and it is picked up automatically.
//
// Either way the page never fetches a model from a CDN and never needs
// WebGPU; the WebLLM path below is only the default backend.
var customBackend = null;
if (typeof window !== 'undefined' && window.AskWriterBackend) {
  customBackend = window.AskWriterBackend;
}

function setBackend(impl) {
  customBackend = impl || null;
  engine = null;
  engineKey = null;
  loading = null;
  engineError = null;
}

// Normalize whatever was set into the one shape generate() calls.
function backendEngine() {
  if (!customBackend) return null;
  if (typeof customBackend === 'function') {
    var fn = customBackend;
    return {
      chat: { completions: { create: function (req) {
        var msgs = (req && req.messages) || [];
        var last = msgs[msgs.length - 1] || {};
        return Promise.resolve(fn(String(last.content || ''), {
          messages: msgs,
          temperature: req && req.temperature,
          max_tokens: req && req.max_tokens
        })).then(function (text) {
          return { choices: [{ message: { content: String(text == null ? '' : text) } }] };
        });
      } } }
    };
  }
  return customBackend;
}

// Progress is reported through a callback because compiling a model takes long
// enough that a silent page looks broken. The caller paints each stage.
function loadLibrary() {
  if (typeof window !== 'undefined' && window.webllm) {
    return Promise.resolve(window.webllm);
  }
  return import(VENDOR_URL).catch(function () {
    return import(CDN_URL);
  }).catch(function () {
    throw new Error(
      'The writing model library could not be loaded. It is vendored at ' +
      VENDOR_URL + ' and mirrored at ' + CDN_URL + '.');
  });
}

// Boot the engine once. Subsequent calls share the same promise, so mashing the
// ask button cannot start three compiles at once. If the visitor switches
// models mid-session, the old engine is unloaded and the new size compiles.
function ensureEngine(onProgress) {
  // A plugged-in backend replaces WebLLM entirely: no WebGPU, no CDN weights.
  var custom = backendEngine();
  if (custom) return Promise.resolve(custom);

  var key = currentModelKey();
  if (engine && engineKey === key) return Promise.resolve(engine);
  if (loading && engineKey === key) return loading;
  if (engineError && engineKey === key) return Promise.reject(engineError);

  if (typeof navigator !== 'undefined' && !navigator.gpu) {
    engineError = new Error(
      'This browser has no WebGPU, so the answer writer cannot run. ' +
      'Use a recent Chrome or Edge, or set chrome://flags/#enable-unsafe-webgpu.');
    engineKey = key;
    return Promise.reject(engineError);
  }

  // Switching sizes: drop the compiled engine before compiling the new one,
  // or two models sit in VRAM at once.
  var prev = engine;
  engine = null;
  engineError = null;
  engineKey = key;

  var report = onProgress || function () {};
  loading = loadLibrary().then(function (webllm) {
    var drop = (prev && typeof prev.unload === 'function')
      ? Promise.resolve(prev.unload()).catch(function () {})
      : Promise.resolve();
    return drop.then(function () {
      report('downloading the writing model (' + MODELS[key].label + ')…');
      var opts = {
        initProgressCallback: function (p) {
          var pct = p.progress == null ? 0 : Math.round(p.progress * 100);
          report(pct < 100
            ? 'preparing the writing model… ' + pct + '%'
            : 'ready');
        }
      };
      if (key === 'mine') {
        // Passing appConfig REPLACES the default catalog list (the engine does
        // appConfig || prebuilt), so the stock entries ride along only if we
        // put them there -- which is fine, `mine` is the id being compiled.
        var list = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
        opts.appConfig = { model_list: list.concat([MODELS.mine]) };
        return webllm.CreateMLCEngine('mine', opts);
      }
      return webllm.CreateMLCEngine(MODELS[key].id, opts);
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

// ── plan, then write ────────────────────────────────────────────────────────
//
// One pass asked the model to plan the answer AND write it in a single breath,
// and at 1.5B parameters the plan lost: sections arrived unsorted, the same
// dimension repeated under two names, and facts the retrieval layer ranked in
// the top ten sat unused at the bottom of the prompt. Splitting the job fixes
// it the way a person would -- decide WHAT goes where first, then write each
// part knowing what it is for. The plan is a few dozen tokens, costs one extra
// call, and is the thing the second call is then held to.

// Plan prompt: facts are truncated here because the planner only needs enough
// of each sentence to judge relevance; the writer still receives them whole.
function buildPlanPrompt(question, facts) {
  var lines = [];
  facts.forEach(function (f, i) {
    var s = String(f.sentence || '');
    if (s.length > 220) s = s.slice(0, 217) + '...';
    lines.push('[' + (i + 1) + '] (' + (f.entity || 'corpus') + ') ' + s);
  });
  return [
    'Plan a UPSC mains answer using ONLY the numbered facts below.',
    'Question: ' + question,
    '',
    'FACTS:',
    lines.join('\n'),
    '',
    'Reply in EXACTLY this format, one line per entry, nothing else:',
    'INTRO [fact,numbers] <one short line>',
    'POINT <dimension name, 1-3 words> [fact,numbers] <one short line>',
    'POINT ... (four to six points, each a different dimension)',
    'FORWARD <one short line> [fact,numbers]',
    'FORWARD ... (two to four lines)',
    '',
    'Rules:',
    '- Cite a fact number only if that fact supports the line.',
    '- Cover the question\'s own scope and demand, not just its topic words.',
    '- Never invent a fact, number, name or event.'
  ].join('\n');
}

// Parse the planner's reply. Line-shaped input: the format is fixed, so this
// is tokenising rather than interpretation -- and anything unparseable yields
// a null plan, which is what makes the writer fall back to the single-pass
// prompt above instead of failing the answer.
function parsePlan(text) {
  var plan = { intro: null, points: [], forward: [] };
  String(text || '').split(/\r?\n/).forEach(function (raw) {
    var line = raw.trim();
    if (!line) return;
    var m = /^(INTRO|POINT|FORWARD)\b\s*(.*)$/i.exec(line);
    if (!m) return;
    var kind = m[1].toUpperCase();
    var rest = m[2].trim();
    var nums = [];
    var nm = /^\[([0-9,\s]+)\]\s*(.*)$/.exec(rest);
    if (nm) {
      nums = nm[1].split(/[,\s]+/).map(Number).filter(function (n) {
        return n >= 1 && Math.floor(n) === n;
      });
      rest = nm[2].trim();
    }
    if (kind === 'INTRO') plan.intro = { nums: nums, line: rest };
    else if (kind === 'FORWARD') plan.forward.push({ nums: nums, line: rest });
    else {
      // POINT carries its dimension in the prose before the bracket list or
      // after it; when the bracket list came first, the dimension is simply
      // the opening word(s) of what is left -- and the whole remainder still
      // has to reach the writer as the line.
      var pm = /^(\S+(?:\s+\S+){0,2}?)\s+\[([0-9,\s]+)\]\s*(.*)$/.exec(rest);
      if (pm) {
        plan.points.push({
          title: pm[1].trim(),
          nums: pm[2].split(/[,\s]+/).map(Number).filter(function (n) {
            return n >= 1 && Math.floor(n) === n;
          }),
          line: pm[3].trim()
        });
      } else {
        var words = rest.split(/\s+/);
        plan.points.push({
          title: words.shift() || rest,
          nums: nums,
          line: words.join(' ')
        });
      }
    }
  });
  if (!plan.intro && !plan.points.length && !plan.forward.length) return null;
  return plan;
}

// The writer's prompt, when a plan exists. The plan is the skeleton and the
// facts are still listed in full underneath it, so the model writes each
// planned line with the verbatim sentence in front of it rather than from the
// planner's paraphrase.
function buildWritePrompt(question, facts, plan) {
  var lines = [];
  facts.forEach(function (f, i) {
    lines.push('[' + (i + 1) + '] (' + (f.entity || 'corpus') + ') ' + f.sentence);
  });

  var skeleton = [];
  var intro = plan.intro || { nums: [], line: 'Frame the issue.' };
  skeleton.push('## Introduction');
  skeleton.push('- ' + (intro.line || 'Frame the issue.') +
    (intro.nums.length ? ' (facts [' + intro.nums.join(', ') + '])' : ''));
  skeleton.push('');
  skeleton.push('## Challenges');
  (plan.points || []).forEach(function (p) {
    skeleton.push('- ' + (p.title || 'Dimension') +
      (p.line ? ': ' + p.line : '') +
      (p.nums.length ? ' (facts [' + p.nums.join(', ') + '])' : ''));
  });
  skeleton.push('');
  skeleton.push('## Way forward');
  (plan.forward || []).forEach(function (p) {
    skeleton.push('- ' + (p.line || 'Recommendation.') +
      (p.nums.length ? ' (facts [' + p.nums.join(', ') + '])' : ''));
  });

  return [
    'You are answering a UPSC mains question using ONLY the numbered facts below.',
    'Question: ' + question,
    '',
    'FACTS:',
    lines.join('\n'),
    '',
    'This plan was already decided. Follow it: same sections, same order,',
    'same points. Expand each planned line into clear exam prose, citing its',
    'fact numbers in brackets like [2]. Do not add new points, do not drop',
    'planned ones, and do not invent anything the facts do not support.',
    '',
    'PLAN:',
    skeleton.join('\n'),
    '',
    'Rules:',
    '- Use only facts from the list. Never invent a number, name, or event.',
    '- Keep every fact\'s citation number.',
    '- Write in clear prose for an exam, not bullet fragments.'
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

// The one call the page makes. Loads the model on first use, plans the answer
// from the facts, writes it to the plan, and returns parsed sections plus the
// raw text so the caller can show either. A plan the parser could not read
// falls back to the single-pass prompt: a worse answer beats a failed one.
function synthesize(question, facts, opts) {
  opts = opts || {};
  var onProgress = opts.onProgress || function () {};
  if (!facts || !facts.length) {
    return Promise.resolve(null);
  }

  return ensureEngine(onProgress).then(function (eng) {
    // 900 tokens stopped a full Introduction/Challenges/Way-forward answer
    // mid-sentence -- the caller never saw finish_reason, so the page rendered
    // a paragraph that simply ended. 1600 covers the shape the prompts ask
    // for, and the continuation below catches whatever still does not fit.
    var cap = opts.maxTokens || 1600;
    var temp = opts.temperature == null ? 0.3 : opts.temperature;

    function generate(prompt, tokens, t) {
      var messages = [{ role: 'user', content: prompt }];
      return eng.chat.completions.create({
        messages: messages,
        temperature: t,
        max_tokens: tokens,
        stream: false
      }).then(function (res) {
        var raw = res && res.choices && res.choices[0] && res.choices[0].message
          ? res.choices[0].message.content : '';
        var finish = res && res.choices && res.choices[0]
          ? res.choices[0].finish_reason : null;
        if (finish !== 'length' || !raw) return raw;
        // The model stopped on the token budget, not on an ending. Hand it its
        // own partial text and ask for the rest; the transcript keeps the
        // prompt so the continuation is still grounded in the same facts, and
        // one round is bounded so a model that cannot stop talking cannot loop.
        onProgress('finishing the answer…');
        return eng.chat.completions.create({
          messages: messages.concat([
            { role: 'assistant', content: raw },
            { role: 'user', content: 'Continue the answer exactly from where it ' +
              'stopped. Do not repeat anything you already wrote, do not restart ' +
              'any section, do not add a preamble.' }
          ]),
          temperature: t,
          max_tokens: 800,
          stream: false
        }).then(function (res2) {
          var more = res2 && res2.choices && res2.choices[0] && res2.choices[0].message
            ? res2.choices[0].message.content : '';
          if (!more) return raw;
          return raw + (/\s$/.test(raw) ? '' : ' ') + more;
        });
      });
    }

    var planned = Promise.resolve(null);
    if (opts.plan !== false) {
      onProgress('planning the answer…');
      planned = eng.chat.completions.create({
        messages: [{ role: 'user', content: buildPlanPrompt(question, facts) }],
        temperature: 0.2,
        max_tokens: 400,
        stream: false
      }).then(function (res) {
        var txt = res && res.choices && res.choices[0] && res.choices[0].message
          ? res.choices[0].message.content : '';
        return parsePlan(txt);
      }).catch(function () { return null; });
    }

    return planned.then(function (plan) {
      // One point is not a plan; two sections' worth of decisions is. Below
      // that the skeleton would just restate the single-pass template.
      var usePlan = !!(plan && plan.points && plan.points.length >= 2);
      onProgress('composing the answer…');
      var prompt = usePlan
        ? buildWritePrompt(question, facts, plan)
        : buildPrompt(question, facts);
      return generate(prompt, cap, temp).then(function (raw) {
        onProgress('ready');
        return {
          sections: parse(raw),
          raw: raw,
          method: 'llm',
          plan: usePlan ? plan : null
        };
      });
    });
  });
}

return {
  synthesize: synthesize,
  expand: expand,
  ensureEngine: ensureEngine,
  ensureMine: ensureMine,
  mineInfo: mineInfo,
  modelsList: modelsList,
  setBackend: setBackend,
  backendEngine: backendEngine,
  buildPrompt: buildPrompt,
  buildPlanPrompt: buildPlanPrompt,
  buildWritePrompt: buildWritePrompt,
  parsePlan: parsePlan,
  parse: parse,
  MODELS: MODELS,
  currentModelKey: currentModelKey,
  modelId: modelId
};
}));

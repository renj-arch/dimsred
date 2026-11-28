// Owner-only lyric generation.
//
// The studio is a static page, so a model call cannot live in the browser: any
// key shipped to the client is public within a minute. This function keeps the
// keys in Cloudflare env and does the call server-side, behind the same
// Supabase-owner gate as /api/on-demand.
//
// Why not reuse /api/on-demand: that lane dispatches a GitHub Actions run and
// the answer arrives minutes later as a committed JSON file. Writing a verse is
// interactive — you try a line, change the mood, try again — so it needs a
// request that answers in seconds. That is what this is.
//
// Provider order is strongest-first and mirrors scripts/lib/ollama.js:
//   NVIDIA NIM   nvidia/nemotron-3-ultra-550b-a55b
//   OpenRouter   nvidia/nemotron-3-ultra-550b-a55b:free
//   Groq         openai/gpt-oss-120b
// Any provider without a key is skipped.
//
// Setup (Cloudflare Pages -> Settings -> Environment variables):
//   NVIDIA_API_KEY      (or OPENROUTER_API_KEY / GROQ_API_KEY)
//   OWNER_EMAIL         optional, defaults to the owner address below

var SB_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
var SB_ANON = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
var DEFAULT_OWNER = 'red835699@gmail.com';
var ORIGIN = 'https://vlymbooq.qzz.io';

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Cache-Control': 'no-store'
  };
}

function out(status, obj) {
  return new Response(JSON.stringify(obj), { status: status, headers: cors() });
}

function bearer(request) {
  var h = request.headers.get('Authorization') || '';
  var m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

async function supabaseUser(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) return null;
  try {
    var r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return null;
    var u = await r.json();
    return (u && u.email) ? u : null;
  } catch (e) {
    return null;
  }
}

function isOwner(env, email) {
  var owner = (env && env.OWNER_EMAIL) || DEFAULT_OWNER;
  return String(email || '').toLowerCase() === String(owner).toLowerCase();
}

function providers(env) {
  var list = [];
  if (env.NVIDIA_API_KEY) list.push({
    name: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: env.NVIDIA_API_KEY,
    model: env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
    max: 16000
  });
  if (env.OPENROUTER_API_KEY) list.push({
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
    max: 8000
  });
  if (env.GROQ_API_KEY) list.push({
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: env.GROQ_API_KEY,
    model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
    max: 8000
  });
  return list;
}

var LANGS = {
  english: 'English', tamil: 'Tamil', malayalam: 'Malayalam', hindi: 'Hindi',
  telugu: 'Telugu', kannada: 'Kannada', bengali: 'Bengali', marathi: 'Marathi',
  urdu: 'Urdu', punjabi: 'Punjabi', mixed: 'a natural mix of English and the speaker\'s mother tongue'
};

function brief(b) {
  b = b || {};
  var lang = LANGS[String(b.language || 'english').toLowerCase()] || 'English';
  var lines = Math.max(4, Math.min(80, Number(b.lines) || 16));
  var structure = String(b.structure || 'Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus').slice(0, 120);

  // Transcreation: the aspirant supplies an English lyric and wants it sung in
  // Tamil or Malayalam, not translated word for word. That is a different job
  // from writing from a brief, so it gets its own instruction set.
  var source = String(b.source || '').trim();
  if (source) {
    return [
      'You are a film lyricist. You are not translating: you are transcreating — writing a NEW lyric in ' + lang +
        ' that carries the same feeling, images and story as the English source, and sings.',
      '',
      'Target language: ' + lang,
      'Mood: ' + String(b.mood || 'keep the source mood').slice(0, 60),
      'Genre: ' + String(b.genre || 'film').slice(0, 60),
      'Rhyme: ' + String(b.rhyme || 'natural, singable').slice(0, 60),
      '',
      'THE ENGLISH SOURCE (do not reproduce it; write its Tamil/Malayalam counterpart):',
      source.slice(0, 2000),
      '',
      'Rules:',
      '- Keep the section layout and the number of lines per section. A refrain stays a refrain.',
      '- Write in ' + lang + ' script. Every sung line must be in ' + lang + ' script; no Latin-letter transliteration inside the sung line.',
      '- Under each section heading, add ONE bracketed romanised line for pronunciation, prefixed with "Roman:".',
      '- Match the syllable weight of each line closely enough to be sung to the same tune. Prefer short, open vowels.',
      '- Keep the concrete images (lamp, sandalwood, cradle, flower, eyes, sea). Replace an image only when it does not exist in the target culture — and then replace it with one that does.',
      '- Rhyme where the source rhymes; at minimum repeat the same vowel sound at line ends.',
      '- No word-for-word calques that sound like a translated document. It must read as a lyric written in ' + lang + '.',
      '- Do not add lines that are not in the source, and do not drop a section.',
      '',
      'Return only the lyric, with section headings in square brackets.'
    ].join('\n');
  }

  var parts = [
    'Write song lyrics. Return ONLY the lyrics, no commentary, no markdown fences.',
    '',
    'Subject / story: ' + String(b.theme || 'write about what the singer cannot say out loud').slice(0, 600),
    'Language: ' + lang,
    'Mood: ' + String(b.mood || 'bittersweet').slice(0, 60),
    'Genre: ' + String(b.genre || 'pop').slice(0, 60),
    'Point of view: ' + String(b.pov || 'first person').slice(0, 40),
    'Structure: ' + structure,
    'About ' + lines + ' lines in total.',
    'Rhyme: ' + String(b.rhyme || 'natural, not forced').slice(0, 60)
  ];
  if (b.keywords) parts.push('Must use these images or words: ' + String(b.keywords).slice(0, 300));
  if (b.avoid) parts.push('Avoid: ' + String(b.avoid).slice(0, 300));
  if (b.reference) parts.push('In the spirit of (do not copy): ' + String(b.reference).slice(0, 120));
  parts.push(
    '',
    'Rules:',
    '- Tag each section on its own line using the names in the Structure list exactly (for example [Pallavi], [Charanam 1], [Chorus]).',
    '- The chorus must be singable: short lines, one idea, a repeated hook.',
    '- Concrete images over abstractions. No filler like "oh baby" unless the genre needs it.',
    '- Do not invent facts or statistics.',
    '- If the language is not English, write in that script, and add one romanised line in brackets under each section heading.'
  );
  return parts.join('\n');
}

// A transcreation must keep the source's shape. The first live attempt added a
// verse and a bridge that were not in the source, and leaked Latin letters into
// a sung Tamil line ("மounம்"). Both are rejected here so the caller can retry
// instead of shipping a lyric that does not fit the tune.
function transcreationProblems(text, source) {
  var problems = [];
  var src = String(source || '');
  if (!src) return problems;

  var srcSections = (src.match(/\[[^\]]+\]/g) || []).map(function (s) { return s.replace(/[\[\]]/g, '').trim().toLowerCase(); });
  var outSections = (String(text).match(/\[[^\]]+\]/g) || []).map(function (s) { return s.replace(/[\[\]]/g, '').trim().toLowerCase(); });
  if (srcSections.length && outSections.length > srcSections.length + 1) {
    problems.push('added sections that are not in the source');
  }
  if (srcSections.length && outSections.length) {
    var same = srcSections.filter(function (s, i) { return outSections[i] === s; }).length;
    if (same < Math.max(1, srcSections.length - 1)) problems.push('section order does not follow the source');
  }

  // Latin letters are allowed only on the romanisation line and in headings.
  var lines = String(text).split('\n');
  var leaked = lines.filter(function (line) {
    var t = line.trim();
    if (!t) return false;
    if (/^\[.*\]$/.test(t)) return false;
    if (/^roman\s*:/i.test(t.replace(/^[\[(]/, ''))) return false;
    if (/^\(.*\)$/.test(t)) return false;
    return /[A-Za-z]{4,}/.test(t) && !/^\[/.test(t);
  });
  if (leaked.length) problems.push('Latin text inside sung lines (' + leaked[0].slice(0, 40) + ')');

  return problems;
}

async function callProvider(p, system, user, timeoutMs) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
  try {
    var r = await fetch(p.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + p.key
      },
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.8,
        max_tokens: Math.min(12000, p.max),
        stream: false
      }),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!r.ok) return { error: 'HTTP ' + r.status };
    var j = await r.json();
    if (j && j.error) return { error: j.error.message || 'provider error' };
    var text = j && j.choices && j.choices[0] && j.choices[0].message
      ? j.choices[0].message.content : '';
    if (!text || !String(text).trim()) return { error: 'empty answer' };
    return { text: String(text).trim(), model: p.model };
  } catch (e) {
    clearTimeout(timer);
    return { error: e && e.name === 'AbortError' ? 'timed out' : (e.message || 'network error') };
  }
}

// A Tamil or Malayalam lyric written in Latin letters is not what was asked
// for. Check the Unicode block and retry once with a blunter instruction.
var SCRIPTS = {
  tamil: /[\u0B80-\u0BFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  hindi: /[\u0900-\u097F]/,
  telugu: /[\u0C00-\u0C7F]/,
  kannada: /[\u0C80-\u0CFF]/,
  bengali: /[\u0980-\u09FF]/,
  marathi: /[\u0900-\u097F]/,
  punjabi: /[\u0A00-\u0A7F]/,
  urdu: /[\u0600-\u06FF]/
};

function scriptOk(text, lang) {
  var re = SCRIPTS[String(lang || '').toLowerCase()];
  if (!re) return true;
  return re.test(String(text || ''));
}

function stricter(user, lang) {
  var name = LANGS[lang] || lang;
  return user + '\n\nIMPORTANT: the previous answer was rejected because it was not written in ' + name +
    ' script. Write every line in ' + name + ' script. Do not transliterate into Latin letters. ' +
    'Romanisation is allowed only on the single bracketed line under each section heading.';
}

export async function onRequestGet(context) {
  var user = await supabaseUser(bearer(context.request));
  var list = providers(context.env || {});
  return out(200, {
    owner: !!(user && isOwner(context.env, user.email)),
    providers: list.map(function (p) { return p.name + ' (' + p.model + ')'; }),
    configured: list.length > 0
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestPost(context) {
  var body = null;
  try { body = await context.request.json(); } catch (e) {}
  if (!body) return out(400, { error: 'bad request' });

  var token = body.token || bearer(context.request);
  var user = await supabaseUser(token);
  if (!user) return out(401, { error: 'session expired — reload and sign in again' });
  if (!isOwner(context.env, user.email)) return out(403, { error: 'lyric generation is owner-only' });

  var list = providers(context.env || {});
  if (!list.length) {
    // Fallback: the repo's owner runner already holds model credentials, so a
    // missing Cloudflare key should not make the feature dead. Dispatch the
    // on-demand lane with kind=lyrics and let the studio poll for the result.
    var gh = context.env && context.env.GITHUB_DISPATCH_TOKEN;
    if (!gh) {
      return out(503, {
        error: 'no model key configured — add NVIDIA_API_KEY (or OPENROUTER_API_KEY / GROQ_API_KEY) in the Cloudflare dashboard, or GITHUB_DISPATCH_TOKEN for the owner runner'
      });
    }
    var id = crypto.randomUUID();
    var api = 'https://api.github.com/repos/renj-arch/dimsred/actions/workflows/on-demand.yml/dispatches';
    var dr;
    try {
      dr = await fetch(api, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + gh,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'vlymbooq-lyrics',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            request_id: id,
            kind: 'lyrics',
            payload: JSON.stringify({ brief: body.brief || {} }),
            model: 'hosted'
          }
        })
      });
    } catch (e) {
      return out(502, { error: 'could not reach the owner runner' });
    }
    if (dr.status !== 204) {
      return out(502, { error: 'the owner runner refused the request (HTTP ' + dr.status + ')' });
    }
    return out(202, {
      pending: true,
      id: id,
      poll: 'https://api.github.com/repos/renj-arch/dimsred/contents/data/on-demand/' + id + '.json?ref=main',
      note: 'no Cloudflare model key — using the owner runner; this takes a couple of minutes'
    });
  }

  var system = 'You are a professional songwriter. You write lyrics that a real singer can perform: concrete, rhythmic, and honest. You never pad a line to fill a rhyme and you never explain the song.';
  var user = brief(body.brief);

  var reasons = [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var res = await callProvider(p, system, user, 60000);
    if (res.text && !scriptOk(res.text, body.brief && body.brief.language)) {
      var retry = await callProvider(p, system, stricter(user, (body.brief || {}).language), 60000);
      if (retry.text && scriptOk(retry.text, body.brief && body.brief.language)) res = retry;
    }
    if (res.text && body.brief && body.brief.source) {
      var probs = transcreationProblems(res.text, body.brief.source);
      if (probs.length) {
        var retry2 = await callProvider(p, system,
          user + '\n\nYour last answer was rejected: ' + probs.join('; ') +
          '. Keep exactly the source sections and the same number of sung lines, and write every sung line in the target script with no Latin letters.', 60000);
        if (retry2.text) res = retry2;
      }
    }
    if (res.text) {
      return out(200, {
        ok: true,
        lyrics: res.text,
        provider: p.name,
        model: res.model,
        brief: body.brief || {}
      });
    }
    reasons.push(p.name + ': ' + res.error);
  }

  return out(502, { error: 'every model route failed', detail: reasons.join(' | ') });
}
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
    '- Tag each section on its own line: [Verse 1], [Chorus], [Bridge], [Outro].',
    '- The chorus must be singable: short lines, one idea, a repeated hook.',
    '- Concrete images over abstractions. No filler like "oh baby" unless the genre needs it.',
    '- Do not invent facts or statistics.',
    '- If the language is not English, write in that script, and add one romanised line in brackets under each section heading.'
  );
  return parts.join('\n');
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
        max_tokens: Math.min(4000, p.max),
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
    return out(503, {
      error: 'no model key configured — add NVIDIA_API_KEY (or OPENROUTER_API_KEY / GROQ_API_KEY) in the Cloudflare dashboard'
    });
  }

  var system = 'You are a professional songwriter. You write lyrics that a real singer can perform: concrete, rhythmic, and honest. You never pad a line to fill a rhyme and you never explain the song.';
  var user = brief(body.brief);

  var reasons = [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var res = await callProvider(p, system, user, 60000);
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
// Owner-only voice generation (Edge TTS) for the music studio.
//
// The browser's speechSynthesis can only speak Tamil or Malayalam if the device
// has that language pack installed, so "make it sing in Tamil" was a promise the
// studio could not keep. Edge TTS ships real ta-IN and ml-IN neural voices for
// free and needs no key, but it needs a machine with Python — the owner runner.
//
// GET  /api/tts            -> { voices: [...] }        (public, for the picker)
// POST /api/tts            -> { pending, id }          (owner only)
//      body { token, text, voice, rate, pitch }
//
// The runner writes data/on-demand/<id>.mp3 plus a small JSON beside it; the
// studio fetches the audio through the GitHub contents API (already allowed by
// the page's connect-src), so the result is playable in about a minute.

var SB_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
var SB_ANON = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
var DEFAULT_OWNER = 'red835699@gmail.com';
var ORIGIN = 'https://vlymbooq.qzz.io';

// Kept in step with VOICES in scripts/on-demand-generate.js.
var VOICES = [
  { id: 'ta-IN-PallaviNeural', label: 'Tamil · Pallavi (female)' },
  { id: 'ta-IN-ValluvarNeural', label: 'Tamil · Valluvar (male)' },
  { id: 'ta-LK-SaranyaNeural', label: 'Tamil (Sri Lanka) · Saranya (female)' },
  { id: 'ta-LK-KumarNeural', label: 'Tamil (Sri Lanka) · Kumar (male)' },
  { id: 'ml-IN-SobhanaNeural', label: 'Malayalam · Sobhana (female)' },
  { id: 'ml-IN-MidhunNeural', label: 'Malayalam · Midhun (male)' },
  { id: 'hi-IN-SwaraNeural', label: 'Hindi · Swara (female)' },
  { id: 'hi-IN-MadhurNeural', label: 'Hindi · Madhur (male)' },
  { id: 'en-IN-NeerjaNeural', label: 'English (India) · Neerja (female)' },
  { id: 'en-IN-PrabhatNeural', label: 'English (India) · Prabhat (male)' }
];

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Cache-Control': 'no-store'
  };
}
function out(status, obj) { return new Response(JSON.stringify(obj), { status: status, headers: cors() }); }

function bearer(request) {
  var h = request.headers.get('Authorization') || '';
  var m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

async function supabaseUser(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) return null;
  try {
    var r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    var u = await r.json();
    return (u && u.email) ? u : null;
  } catch (e) { return null; }
}

function isOwner(env, email) {
  var owner = (env && env.OWNER_EMAIL) || DEFAULT_OWNER;
  return String(email || '').toLowerCase() === String(owner).toLowerCase();
}

export async function onRequestGet() {
  return out(200, { voices: VOICES });
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

  var user = await supabaseUser(body.token || bearer(context.request));
  if (!user) return out(401, { error: 'session expired — reload and sign in again' });
  if (!isOwner(context.env, user.email)) return out(403, { error: 'voice generation is owner-only' });

  var gh = context.env && context.env.GITHUB_DISPATCH_TOKEN;
  if (!gh) return out(503, { error: 'GITHUB_DISPATCH_TOKEN is not configured in Cloudflare' });

  var text = String(body.text || '').trim();
  if (!text) return out(400, { error: 'nothing to speak' });
  if (text.length > 1200) return out(413, { error: 'text is too long (1200 characters max) — split it into verses' });
  if (!VOICES.some(function (v) { return v.id === body.voice; })) return out(400, { error: 'unknown voice' });

  var id = crypto.randomUUID();
  var api = 'https://api.github.com/repos/renj-arch/dimsred/actions/workflows/on-demand.yml/dispatches';
  var dr;
  try {
    dr = await fetch(api, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + gh,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vlymbooq-voice',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          request_id: id,
          kind: 'tts',
          payload: JSON.stringify({
            text: text,
            voice: body.voice,
            rate: body.rate || '+0%',
            pitch: body.pitch || '+0Hz'
          }),
          model: 'hosted'
        }
      })
    });
  } catch (e) {
    return out(502, { error: 'could not reach the owner runner' });
  }
  if (dr.status !== 204) return out(502, { error: 'the owner runner refused the request (HTTP ' + dr.status + ')' });

  return out(202, {
    pending: true,
    id: id,
    audio: 'https://api.github.com/repos/renj-arch/dimsred/contents/data/on-demand/' + id + '.mp3?ref=main',
    meta: 'https://api.github.com/repos/renj-arch/dimsred/contents/data/on-demand/' + id + '.json?ref=main',
    note: 'rendering the voice on the owner runner — about a minute'
  });
}
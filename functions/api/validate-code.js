var ORIGIN = 'https://vlymbooq.qzz.io';
function CORS() { return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN }; }

export async function onRequestPost(context) {
  try {
    const { code } = await context.request.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ valid: false }), { headers: CORS() });
    }

    var CODES = {};
    try {
      CODES = JSON.parse(context.env.CODES || '{}');
    } catch(e) {
      CODES = {};
    }

    var data = CODES[code.toUpperCase()];
    if (!data) {
      return new Response(JSON.stringify({ valid: false }), { headers: CORS() });
    }

    if (new Date(data.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), { headers: CORS() });
    }

    var exams = data.exams || [];
    return new Response(JSON.stringify({ valid: true, plan: data.plan, expiresAt: data.expiresAt, exams: exams }), { headers: CORS() });
  } catch(e) {
    return new Response(JSON.stringify({ valid: false, error: e.message }), { headers: CORS() });
  }
}

export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, msg: 'Send POST with { code: "XXXX-XXXX" }' }), {
    headers: CORS()
  });
}

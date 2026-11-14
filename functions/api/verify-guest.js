var ORIGIN = 'https://vlymbooq.qzz.io';
function CORS() { return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN }; }

export async function onRequestPost(context) {
  try {
    const { token } = await context.request.json();
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ valid: false }), { headers: CORS() });
    }

    const guestToken = context.env.GUEST_TOKEN;
    if (!guestToken) {
      return new Response(JSON.stringify({ valid: false }), { headers: CORS() });
    }

    if (token === guestToken) {
      return new Response(JSON.stringify({ valid: true }), { headers: CORS() });
    }

    return new Response(JSON.stringify({ valid: false }), { headers: CORS() });
  } catch(e) {
    return new Response(JSON.stringify({ valid: false, error: e.message }), { headers: CORS() });
  }
}

export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, msg: 'Send POST with { token: "your-code" }' }), {
    headers: CORS()
  });
}

var ORIGIN = 'https://vlymbooq.qzz.io';
function CORS() { return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN }; }

export async function onRequestGet(context) {
  try {
    const token = new URL(context.request.url).searchParams.get('token');
    if (!token) {
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

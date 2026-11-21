const ORIGIN = 'https://raw.githubusercontent.com';
const REPO = 'renj-arch/dimsred';
const BRANCH = 'main';
const CACHE_TTL_SECONDS = 3600;

export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
  var pathSegments = context.params.path || [];
  var key = 'data/questions/' + pathSegments.join('/');
  var rawUrl = ORIGIN + '/' + REPO + '/' + BRANCH + '/' + key;

  var cache = caches.default;

  if (request.method === 'GET') {
    var cached = await cache.match(url);
    if (cached) return cached;
  }

  var resp = await fetch(rawUrl);
  if (!resp.ok) {
    return context.env.ASSETS.fetch(new Request(url.origin + '/' + key, request));
  }

  var headers = new Headers(resp.headers);
  headers.set('Content-Type', contentTypeForKey(key));
  headers.set('Cache-Control', 'public, max-age=' + CACHE_TTL_SECONDS);
  headers.set('Access-Control-Allow-Origin', '*');

  var out = new Response(resp.body, { status: resp.status, headers: headers });

  if (request.method === 'GET') {
    try {
      context.waitUntil(cache.put(url, out.clone()));
    } catch (e) {
      // caching is best-effort
    }
  }

  return out;
}

function contentTypeForKey(key) {
  if (/\.json$/i.test(key)) return 'application/json; charset=utf-8';
  if (/\.js$/i.test(key)) return 'application/javascript; charset=utf-8';
  if (/\.css$/i.test(key)) return 'text/css; charset=utf-8';
  if (/\.png$/i.test(key)) return 'image/png';
  if (/\.jpg$/i.test(key) || /\.jpeg$/i.test(key)) return 'image/jpeg';
  if (/\.webp$/i.test(key)) return 'image/webp';
  if (/\.svg$/i.test(key)) return 'image/svg+xml';
  if (/\.html?$/i.test(key)) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}
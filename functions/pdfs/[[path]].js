var ORIGIN = 'https://vlymbooq.qzz.io';
function forbid(msg) {
  return new Response(msg || 'Forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': ORIGIN }
  });
}

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var path = url.pathname.replace(/^\/pdfs\//, '');

  // Allow latest.json publicly (needed by premium.js to list PDFs)
  if (path === 'latest.json') {
    var asset = await context.env.ASSETS.fetch(context.request);
    return new Response(asset.body, {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN, 'Cache-Control': 'no-cache' }
    });
  }

  // Block direct access to PDF files — must use /api/serve-pdf with valid code
  if (/\.pdf$/.test(path)) {
    return forbid('Direct PDF access is not allowed. Use /api/serve-pdf with a valid premium code.');
  }

  // Allow other files (e.g. future non-PDF additions)
  var asset = await context.env.ASSETS.fetch(context.request);
  return asset;
}

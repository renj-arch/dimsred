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

  // Full-length papers are free: their PDF (questions + key + explanations)
  // is part of the public mock-test page. Weekly premium digests stay behind
  // /api/serve-pdf and a valid code.
  if (/^full-[A-Za-z0-9-]+\.pdf$/.test(path)) {
    var paper = await context.env.ASSETS.fetch(context.request);
    return new Response(paper.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + path.replace(/[^A-Za-z0-9.-]/g, '') + '"',
        'Access-Control-Allow-Origin': ORIGIN,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  // Block direct access to premium PDF files — must use /api/serve-pdf
  if (/\.pdf$/.test(path)) {
    return forbid('Direct PDF access is not allowed. Use /api/serve-pdf with a valid premium code.');
  }

  // Allow other files (e.g. future non-PDF additions)
  var asset = await context.env.ASSETS.fetch(context.request);
  return asset;
}

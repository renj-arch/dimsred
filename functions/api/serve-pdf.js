var ORIGIN = 'https://vlymbooq.qzz.io';
function JSONresp(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN }
  });
}

export async function onRequestGet(context) {
  try {
    var url = new URL(context.request.url);
    var code = url.searchParams.get('code');
    var file = url.searchParams.get('file');

    if (!code || !file) {
      return JSONresp({ error: 'Missing code or file parameter' }, 400);
    }

    var CODES = {};
    try { CODES = JSON.parse(context.env.CODES || '{}'); } catch (e) {}
    var data = CODES[code.toUpperCase()];
    if (!data) {
      return JSONresp({ error: 'Invalid access code' }, 403);
    }
    if (!data || !data.expiresAt || new Date(data.expiresAt) < new Date()) {
      return JSONresp({ error: 'Code expired on ' + data.expiresAt }, 403);
    }

    if (!/^weekly-\d{4}-\d{2}-\d{2}-[a-z]+(?:-[a-z]+)?-[a-z0-9]{4}\.pdf$/.test(file)) {
      return JSONresp({ error: 'Invalid file name' }, 403);
    }

    var exam = file.match(/^weekly-\d{4}-\d{2}-\d{2}-([a-z]+(?:-[a-z]+)?)-[a-z0-9]{4}\.pdf$/)[1];
    var allowedExams = data.exams || [];
    if (allowedExams.length > 0 && allowedExams.indexOf(exam) === -1 && allowedExams.indexOf('all') === -1) {
      return JSONresp({ error: 'Your code does not cover ' + exam + ' exams' }, 403);
    }

    var pdfUrl = new URL('/pdfs/' + file, context.request.url);
    var asset = await context.env.ASSETS.fetch(pdfUrl);

    if (!asset.ok) {
      return JSONresp({ error: 'PDF not found' }, 404);
    }

    return new Response(asset.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + file + '"',
        'Access-Control-Allow-Origin': ORIGIN,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return JSONresp({ error: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  return JSONresp({ ok: true, msg: 'Use GET /api/serve-pdf?code=XXXX&file=weekly-YYYY-MM-DD-exam-hash.pdf' });
}
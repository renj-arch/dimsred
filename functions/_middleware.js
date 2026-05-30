var LOG_FORMAT = 'JSON';

export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);

  // Collect visitor data
  var cf = request.cf || {};
  var headers = request.headers;
  var log = {
    time: new Date().toISOString(),
    ip: request.headers.get('CF-Connecting-IP') || 'unknown',
    country: cf.country || '-',
    city: cf.city || '-',
    region: cf.region || '-',
    path: url.pathname,
    method: request.method,
    ua: headers.get('User-Agent') || '-',
    referer: headers.get('Referer') || '-',
    asn: cf.asn || '-',
    colo: cf.colo || '-',
    bot: cf.botManagement ? (cf.botManagement.score < 30 ? 'yes' : 'no') : '-'
  };

  // Log to Cloudflare dashboard (Workers & Pages → {function} → Logs)
  console.log(JSON.stringify(log));

  // Pass through to the next handler
  return await context.next();
}

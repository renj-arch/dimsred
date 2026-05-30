export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
  var cf = request.cf || {};
  var headers = request.headers;

  var log = {
    time: new Date().toISOString(),
    ip: headers.get('CF-Connecting-IP') || 'unknown',
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

  console.log(JSON.stringify(log));

  // Persist to Supabase + cleanup rows older than 24h (fire-and-forget)
  var supabaseUrl = context.env.SUPABASE_URL;
  var serviceKey = context.env.SUPER_SERVICE_KEY;
  if (supabaseUrl && serviceKey) {
    logVisit(supabaseUrl, serviceKey, log);
  }

  return await context.next();
}

async function logVisit(supabaseUrl, serviceKey, log) {
  var h = { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
  try {
    await fetch(supabaseUrl + '/rest/v1/visits', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        ip: log.ip, country: log.country, city: log.city, region: log.region,
        path: log.path, ua: log.ua, referer: log.referer, asn: log.asn, bot: log.bot
      })
    });
    var cutoff = new Date(Date.now() - 86400000).toISOString();
    await fetch(supabaseUrl + '/rest/v1/visits?created_at=lt.' + cutoff, {
      method: 'DELETE', headers: h
    });
  } catch (e) { /* fail silently */ }
}

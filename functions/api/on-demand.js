// Owner runner — dispatches on-demand AI generation to GitHub's runners.
//
// Why it exists: the site is static; the writing models normally run in the
// visitor's browser (WebLLM) behind a consent card. The owner does not want
// that heat on his own machine, and wants generation to happen on the repo's
// GitHub Actions runners instead — but ONLY for his account: if every visitor
// could dispatch runs, the Actions queue (his GitHub) would be flooded.
//
// This function is the gate. It verifies the caller's Supabase login token
// server-side, checks the email against OWNER_EMAIL (Cloudflare env var,
// defaulting to the owner's address), rate-limits to a small number of runs
// per window (so even a leaked token cannot flood the queue), then fires
// workflow_dispatch on on-demand.yml with the request id + payload.
//
// The GitHub credential lives ONLY here (env GITHUB_DISPATCH_TOKEN) — the
// browser never sees it. Nothing heavy runs in this function: it authenticates
// and dispatches, nothing else.
//
// Setup (one time, Cloudflare dashboard -> Pages -> studypro-1j6 -> Settings):
//   GITHUB_DISPATCH_TOKEN  fine-grained PAT, this repo, permission: Actions: write
//   OWNER_EMAIL            optional; defaults to the address below
//
// The browser finds the result at /data/on-demand/<id>.json once the workflow
// commits it, and polls that static file — no database involved.

var SB_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
// Public anon key (same one shipped in js/supabase.js) — used only as the
// apikey header for Supabase's auth endpoint, never to write data.
var SB_ANON = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
var REPO = 'renj-arch/dimsred';
var WORKFLOW = 'on-demand.yml';
var DEFAULT_OWNER = 'red835699@gmail.com';
var DEFAULT_MODEL = 'qwen3.5:9b';
// Requests accepted per window before the runner refuses new ones. Runs take
// minutes; the cap only exists to stop a flood, not normal use.
var MAX_RUNS_PER_WINDOW = 3;
var WINDOW_MIN = 20;
// The kinds on-demand.yml knows how to generate.
var KINDS = { 'writer': 1, 'tutor-questions': 1, 'mental-batch': 1 };
var ORIGIN = 'https://vlymbooq.qzz.io';

function CORS() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN
  };
}

function out(status, obj) {
  return new Response(JSON.stringify(obj), { status: status, headers: CORS() });
}

function bearer(request) {
  var h = request.headers.get('Authorization') || '';
  var m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

// Ask Supabase who the token belongs to. The token is the visitor's own
// access token; Supabase validates it — we never parse or trust it ourselves.
async function supabaseUser(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) return null;
  try {
    var r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) return null;
    var u = await r.json();
    return (u && u.email) ? u : null;
  } catch (e) {
    return null;
  }
}

function isOwner(env, email) {
  var owner = (env && env.OWNER_EMAIL) || DEFAULT_OWNER;
  return String(email || '').toLowerCase() === String(owner).toLowerCase();
}

// GET ?whoami=1 — the owner chip asks "am I allowed / is the runner wired up?"
export async function onRequestGet(context) {
  var user = await supabaseUser(bearer(context.request));
  return out(200, {
    owner: !!(user && isOwner(context.env, user.email)),
    configured: !!(context.env && context.env.GITHUB_DISPATCH_TOKEN)
  });
}

// POST {token, kind, payload, model?} — owner only; dispatches the workflow.
export async function onRequestPost(context) {
  var body = null;
  try { body = await context.request.json(); } catch (e) {}
  if (!body) return out(400, { error: 'bad request' });

  var user = await supabaseUser(body.token);
  if (!user) return out(401, { error: 'session expired — reload the page and sign in again' });
  if (!isOwner(context.env, user.email)) return out(403, { error: 'this feature is owner-only' });

  var gh = context.env && context.env.GITHUB_DISPATCH_TOKEN;
  if (!gh) {
    return out(503, {
      error: 'the runner is not connected yet — add GITHUB_DISPATCH_TOKEN in the Cloudflare dashboard (Pages → the site → Settings → Environment variables)'
    });
  }

  var kind = String(body.kind || '');
  if (!KINDS[kind]) return out(400, { error: 'unknown kind: ' + kind });

  var payloadStr;
  try { payloadStr = JSON.stringify(body.payload || {}); } catch (e) { payloadStr = ''; }
  if (!payloadStr || payloadStr.length > 60000) return out(413, { error: 'payload too large' });

  var model = String(body.model || DEFAULT_MODEL);
  if (!/^[A-Za-z0-9._:/-]{1,60}$/.test(model)) return out(400, { error: 'bad model tag' });

  var api = 'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW;
  var ghHeaders = {
    'Authorization': 'Bearer ' + gh,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'vlymbooq-owner-runner',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Rate limit: count workflow runs started in the last window. Best effort —
  // if the listing call fails we still allow the dispatch (the owner's own
  // click must not be blocked by GitHub having a slow minute).
  try {
    var sinceMs = Date.now() - WINDOW_MIN * 60 * 1000;
    var lr = await fetch(api + '/runs?per_page=20&created=' + encodeURIComponent('>' + new Date(sinceMs).toISOString()), { headers: ghHeaders });
    if (lr.ok) {
      var runs = ((await lr.json()).workflow_runs) || [];
      var recent = runs.filter(function (r) { return Date.parse(r.created_at || 0) >= sinceMs; });
      if (recent.length >= MAX_RUNS_PER_WINDOW) {
        return out(429, {
          error: 'the runner is already chewing through ' + recent.length + ' requests — give it a few minutes, then try again'
        });
      }
    }
  } catch (e) { /* fall through and dispatch */ }

  var id = crypto.randomUUID();
  var dispatch;
  try {
    dispatch = await fetch(api + '/dispatches', {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        ref: 'main',
        inputs: { request_id: id, kind: kind, payload: payloadStr, model: model }
      })
    });
  } catch (e) {
    return out(502, { error: 'could not reach GitHub to start the runner' });
  }
  if (dispatch.status !== 204) {
    var detail = '';
    try { detail = String(await dispatch.text() || '').slice(0, 300); } catch (e) {}
    return out(502, {
      error: dispatch.status === 401 || dispatch.status === 403
        ? 'GitHub rejected the runner token — check GITHUB_DISPATCH_TOKEN (it needs Actions: write on this repo)'
        : 'GitHub would not start the runner (HTTP ' + dispatch.status + ')',
      detail: detail
    });
  }

  // Hand back the run's page when we can find it (best effort — the dispatch
  // API returns no body).
  var runUrl = '';
  try {
    var latest = await fetch(api + '/runs?per_page=1', { headers: ghHeaders });
    if (latest.ok) {
      var lj = await latest.json();
      if (lj.workflow_runs && lj.workflow_runs[0]) runUrl = lj.workflow_runs[0].html_url || '';
    }
  } catch (e) {}

  return out(200, { ok: true, id: id, run: runUrl });
}

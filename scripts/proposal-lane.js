#!/usr/bin/env node
// Proposal Lane — the site's once-a-day "improvement scout".
//
// WHAT IT DOES: on the GitHub runner, the site's own model (Ollama, zero API
// keys) reads a FACTUAL DIGEST of the site's current state — content pools,
// owner-lane results, fault board, browser-test report, recent agent runs —
// and writes 3–5 concrete improvement proposals to data/agent-proposals.json.
// improve.html renders them ("Proposal lane"); the owner approves one by
// filing it as a GitHub issue. NOTHING is implemented automatically.
//
// WHY A DIGEST: the model must reason from real numbers, not vibes. Every
// section below is read from committed files (same copies the site serves),
// so a proposal can be checked against the digest by anyone.
//
// HONESTY RULES (mirroring the site's style):
// - Validation is strict: malformed / duplicate / out-of-range proposals are
//   dropped, and if nothing survives the run FAILS loudly (exit 1) without
//   overwriting the previous file. A failed pass also writes a log entry.
// - The log entry goes into data/agent-log.json (same shape as site-agent.js)
//   so improve.html's existing renderer shows this lane too.
//
// ENV: OLLAMA_MODEL (default qwen3.5:9b), OLLAMA_HOST, PROPOSAL_DEADLINE_MIN
// (default 30 — after this many minutes the script stops waiting and fails
// cleanly so the workflow can still publish), PROPOSAL_FAKE_TEXT (tests only:
// skip Ollama and use this text as the model reply).
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LOG = path.join(ROOT, 'data/agent-log.json');
const OUT = path.join(ROOT, 'data/agent-proposals.json');

const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// ── Wall-clock deadline ──
// A run killed by the job timeout publishes NOTHING. Past the deadline the
// script stops asking the model and fails cleanly, so the publish step still
// commits the failure log and the next day's pass rotates in.
const DEADLINE_MIN = parseInt(process.env.PROPOSAL_DEADLINE_MIN || '30', 10);
const deadlineAnchor = Date.now();
function pastDeadline() {
  return DEADLINE_MIN > 0 && Date.now() - deadlineAnchor > DEADLINE_MIN * 60000;
}

function loadJson(p, dflt) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return dflt; }
}
function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 1) + '\n');
}
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
function daysAgo(t) {
  const d = (Date.now() - new Date(t).getTime()) / 86400000;
  return isFinite(d) ? Math.round(d * 10) / 10 : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORT — copied from scripts/site-agent.js on purpose. That file carries
// two years of hard lessons about this runner (its comment block is the
// source of the rules below); do not "simplify" it:
// - stream:true always — stream:false returns zero bytes for 15–35 min and
//   total-time caps then murder healthy generations.
// - allow up to 25 min with NO first byte (cold load + prompt eval is
//   normal on CPU); 12 min of silence MID-stream is a real wedge.
// - exit 28 → restart the server (kills zombie generations) + ONE retry.
// - think:false by default — thinking models otherwise burn the whole budget
//   in message.thinking and return empty content.
// ─────────────────────────────────────────────────────────────────────────────
function ollamaChat(payload) {
  const body = JSON.parse(payload);
  body.stream = true;
  const args = [
    '-sS', '--max-time', '5400', '-w', '\\n%{http_code}',
    OLLAMA_URL + '/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let stderr = '';
    const started = Date.now();
    let firstByteAt = 0;
    let lastByteAt = Date.now();
    let settled = false;

    function fail(why, status) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) { /* ignore */ }
      const err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status;
      err.stdout = out.slice(0, 2000);
      err.stderr = stderr.slice(0, 400);
      reject(err);
    }

    const mon = setInterval(() => {
      const now = Date.now();
      if (pastDeadline()) return fail('proposal deadline reached mid-call', 'DEADLINE');
      if (now - started > 95 * 60 * 1000) return fail('hard cap 95min');
      if (!firstByteAt) {
        if (now - started > 25 * 60 * 1000) return fail('no first byte in 25min');
      } else if (now - lastByteAt > 12 * 60 * 1000) {
        return fail('no byte for 12min mid-stream (wedged)');
      }
    }, 5000);

    child.stdout.on('data', d => {
      if (!firstByteAt) firstByteAt = Date.now();
      lastByteAt = Date.now();
      out += d.toString('utf8');
      if (out.length > 100 * 1024 * 1024) fail('buffer cap 100MB');
      if (firstByteAt && !ollamaChat._firstByteLogged) {
        ollamaChat._firstByteLogged = true;
        console.log('proposals: LLM stream first bytes at ' + Math.round((firstByteAt - started) / 1000) + 's');
      }
    });
    child.stderr.on('data', d => { stderr += d.toString('utf8'); });
    child.on('error', err => { if (!settled) { settled = true; clearInterval(mon); reject(err); } });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      ollamaChat._firstByteLogged = false;
      if (code === 0) resolve(out);
      else {
        const err = new Error('curl exit ' + code);
        err.status = code;
        err.stdout = out.slice(0, 2000);
        err.stderr = stderr.slice(0, 400);
        reject(err);
      }
    });
    child.stdin.on('error', () => { /* curl died before reading stdin */ });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) {
    httpCode = lines.pop().trim();
  }
  let content = '', thinking = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.charAt(0) !== '{') continue;
    try {
      const j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') content += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') content += j.response;
    } catch (e) { /* partial line */ }
  }
  return { text: content.trim() || thinking.trim(), httpCode: httpCode };
}

async function callLLM(system, user, maxTokens) {
  if (pastDeadline()) throw new Error('deadline reached before the model call');
  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    stream: true,
    think: process.env.OLLAMA_THINK === 'true',
    options: { temperature: 0.4, num_predict: maxTokens || 1600 }
  });
  let out;
  try {
    out = await ollamaChat(payload);
  } catch (e) {
    const detail = 'exit=' + (e.status === undefined ? '?' : e.status) +
      ' stderr=' + String(e.stderr || '').slice(0, 200);
    if (e.status === 28) {
      console.log('proposals: Ollama timed out (' + detail + ') — restarting server, then one retry');
      try { execSync('pkill -f "ollama serve"; sleep 2; OLLAMA_KEEP_ALIVE=60m nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore', timeout: 15000 }); } catch (e0) { /* ignore */ }
      try {
        for (let i = 0; i < 60; i++) {
          try {
            execSync('curl -sf --max-time 5 ' + OLLAMA_URL + '/api/tags', { stdio: 'pipe', timeout: 10000 });
            break;
          } catch (e1) { execSync('sleep 2', { stdio: 'ignore' }); }
        }
        out = await ollamaChat(payload);
      } catch (e2) {
        console.log('proposals: retry failed after restart: exit=' + e2.status);
        return null;
      }
    } else {
      console.log('proposals: Ollama curl failed: ' + detail);
      return null;
    }
  }
  let parsed = parseChatStream(out);
  if (!parsed.text && parsed.httpCode === '400' && process.env.OLLAMA_THINK !== 'true') {
    console.log('proposals: Ollama rejected think:false (HTTP 400) — retrying without it');
    try {
      out = await ollamaChat(JSON.stringify(Object.assign(JSON.parse(payload), { think: undefined })));
      parsed = parseChatStream(out);
    } catch (e4) {
      console.log('proposals: no-think retry failed: exit=' + (e4 && e4.status));
      return null;
    }
  }
  return parsed.text || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE DIGEST — facts, not vibes. Every line is read from a committed file.
// ─────────────────────────────────────────────────────────────────────────────
function buildDigest() {
  const L = [];
  L.push('DATE: ' + new Date().toISOString());

  // Invented pool (mental.html arena)
  try {
    const inv = loadJson(path.join(ROOT, 'data/invented/questions.json'), null);
    if (inv && Array.isArray(inv.questions)) {
      const by = {};
      inv.questions.forEach(q => { const k = q.difficulty || '?'; by[k] = (by[k] || 0) + 1; });
      L.push('invented pool (mental.html "Invented — fresh paper" arena): ' + inv.questions.length +
        ' questions — ' + Object.keys(by).map(k => k + ': ' + by[k]).join(', '));
    }
  } catch (e) { /* section optional */ }

  // Mains bank + frozen AI batch + piped updates
  try {
    const mq = loadJson(path.join(ROOT, 'data/mains-questions.json'), null);
    const bankN = mq && Array.isArray(mq.questions) ? mq.questions.length : null;
    const mf = loadJson(path.join(ROOT, 'data/mains-fresh.json'), null);
    const batchN = mf && Array.isArray(mf.items) ? mf.items.length : null;
    const la = mf && mf.meta && mf.meta.lastAttempt ? (mf.meta.lastAttempt.at || '') : '';
    if (bankN !== null || batchN !== null) {
      L.push('mains page: hand-authored bank ' + (bankN === null ? '?' : bankN) + ' questions; frozen AI batch ' +
        (batchN === null ? '?' : batchN) + ' item(s)' + (la ? ' (last writer attempt ' + String(la).slice(0, 16) + 'Z, ' + daysAgo(la) + 'd ago)' : ''));
    }
  } catch (e) { /* optional */ }
  try {
    const mu = loadJson(path.join(ROOT, 'data/mains-updates.json'), null);
    if (mu && mu.items && typeof mu.items === 'object') {
      L.push('mains updates piped from the news/file lanes: ' + Object.keys(mu.items).length + ' item(s)');
    }
  } catch (e) { /* optional */ }

  // Practice sets
  try {
    const ps = loadJson(path.join(ROOT, 'data/practice-sets/index.json'), null);
    if (ps && ps.sets && typeof ps.sets === 'object') {
      const names = Object.keys(ps.sets);
      L.push('single-click practice sets: ' + names.length + ' exam set(s) — ' + names.slice(0, 8).join(', ') +
        (ps.updatedAt ? ' (updated ' + String(ps.updatedAt).slice(0, 10) + ')' : ''));
    }
  } catch (e) { /* optional */ }

  // On-demand (owner lane) — success/failure tally + recent failures
  try {
    const odDir = path.join(ROOT, 'data/on-demand');
    const files = fs.readdirSync(odDir).filter(f => f.endsWith('.json'));
    const stats = {};
    const fails = [];
    let newest = null;
    files.slice(-60).forEach(f => {
      const j = loadJson(path.join(odDir, f), null);
      if (!j || typeof j !== 'object') return;
      const kind = j.kind || '?';
      const ok = j.status ? j.status === 'ok' || j.status === 'done' : !j.error;
      stats[kind] = stats[kind] || { ok: 0, fail: 0 };
      stats[kind][ok ? 'ok' : 'fail']++;
      const at = j.finishedAt || j.at || '';
      if (at && (!newest || at > newest)) newest = at;
      if (!ok) fails.push({ kind: kind, err: String(j.error || j.reason || 'failed').slice(0, 140), at: String(at).slice(0, 16) });
    });
    if (files.length) {
      L.push('owner on-demand lane: ' + files.length + ' request(s) total — ' +
        Object.keys(stats).map(k => k + ': ' + stats[k].ok + ' ok/' + stats[k].fail + ' fail').join('; ') +
        (newest ? ' (newest ' + String(newest).slice(0, 16) + 'Z)' : ''));
      fails.slice(-4).forEach(f => L.push('  recent on-demand failure: ' + f.kind + ' @' + f.at + ' — ' + f.err));
    }
  } catch (e) { /* optional */ }

  // Question-bank sweep cursor (coverage only — the banks themselves are huge)
  try {
    const cur = loadJson(path.join(ROOT, 'data/questions/_state/cursor.json'), null);
    if (cur && cur.files && typeof cur.files === 'object') {
      const names = Object.keys(cur.files);
      const mb = names.reduce((s, n) => s + ((cur.files[n] && cur.files[n].size) || 0), 0) / 1048576;
      L.push('question-bank files tracked by the sweep cursor: ' + names.length + ' (' + (Math.round(mb * 10) / 10) + ' MB)');
    }
  } catch (e) { /* optional */ }

  // Fault board
  try {
    const ft = loadJson(path.join(ROOT, 'data/faults.json'), null);
    if (ft && ft.counts) {
      L.push('fault board (' + String(ft.generatedAt || '').slice(0, 16) + 'Z): ' +
        (ft.counts.critical || 0) + ' critical, ' + (ft.counts.warn || 0) + ' warn, ' + (ft.counts.info || 0) + ' info');
      const ch = ft.changes || {};
      (ch.new || []).slice(0, 5).forEach(x => {
        L.push('  new fault: [' + (x.severity || '?') + '/' + (x.kind || '?') + '] ' + String(x.title || '').slice(0, 110));
      });
      if (typeof ch.unchanged === 'number') L.push('  unchanged faults: ' + ch.unchanged);
      if (Array.isArray(ft.ideas) && ft.ideas.length) L.push('  idea-badged items already on the board: ' + ft.ideas.length);
    }
  } catch (e) { /* optional */ }

  // Browser test
  try {
    const bt = loadJson(path.join(ROOT, 'data/browser-test.json'), null);
    if (bt && bt.summary) {
      const s = bt.summary;
      L.push('browser test (' + String(bt.testedAt || '').slice(0, 16) + 'Z): ' + s.passed + '/' + s.total +
        ' pages passed; consoleErrors ' + (s.consoleErrors || 0) + ', brokenLinks ' + (s.brokenLinks || 0) +
        ', brokenButtons ' + (s.brokenButtons || 0));
      (bt.issues || []).slice(0, 3).forEach(i => {
        L.push('  issue: ' + (i.type || '?') + ' on ' + (i.page || '?') + ' — ' + String(i.msg || '').slice(0, 100));
      });
    }
  } catch (e) { /* optional */ }

  // Recent agent runs (what the other lanes have been doing)
  try {
    const log = loadJson(LOG, null);
    if (log && Array.isArray(log.runs) && log.runs.length) {
      L.push('recent agent runs (data/agent-log.json, newest last):');
      log.runs.slice(-3).forEach(r => {
        const agents = (r.byAgent || []).filter(a => a.count > 0).map(a => a.agent + ' ' + a.count).join(', ') || 'no action';
        L.push('  ' + String(r.at || '').slice(0, 16) + 'Z — ' + (r.model || '?') + ' — ' + r.totalFixes + ' fix(es) (' + agents + ')');
      });
    }
  } catch (e) { /* optional */ }

  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION — strict on purpose. Garbage in the file would betray the
// "reviewed by the owner" promise, so anything malformed is dropped.
// ─────────────────────────────────────────────────────────────────────────────
function cleanText(s, min, max) {
  const t = String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return (t.length >= min && t.length <= max) ? t : null;
}
function normTitle(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function normalizeLevel(v, allowed) {
  const t = String(v || '').toLowerCase();
  for (const a of allowed) { if (t.indexOf(a) >= 0) return a; }
  return null;
}

function extractArray(text) {
  const s = String(text || '');
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

function validateItems(rawItems, prevTitles) {
  const out = [];
  let dropped = 0;
  const seen = new Set(prevTitles);
  (Array.isArray(rawItems) ? rawItems : []).forEach(it => {
    if (out.length >= 5) return;
    if (!it || typeof it !== 'object') { dropped++; return; }
    const title = cleanText(it.title, 6, 90);
    const why = cleanText(it.why, 20, 400);
    const idea = cleanText(it.idea, 40, 800);
    const effort = normalizeLevel(it.effort, ['small', 'medium', 'large']);
    const risk = normalizeLevel(it.risk, ['low', 'medium', 'high']);
    if (!title || !why || !idea || !effort || !risk) { dropped++; return; }
    const nt = normTitle(title);
    if (seen.has(nt)) { dropped++; return; }
    seen.add(nt);
    out.push({ title: title, why: why, idea: idea, effort: effort, risk: risk });
  });
  return { items: out, dropped: dropped };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG — same shape as site-agent.js's runs[] so improve.html renders it.
// ─────────────────────────────────────────────────────────────────────────────
function appendLog(entry) {
  const log = loadJson(LOG, { runs: [] });
  if (!Array.isArray(log.runs)) log.runs = [];
  log.lastRun = entry.at;
  log.runs.push(entry);
  if (log.runs.length > 15) log.runs = log.runs.slice(-15);
  saveJson(LOG, log);
}

const SYSTEM = [
  'You are the improvement scout for a free, static study-questions website ("vlymbooq") that builds and maintains itself on GitHub Actions with a local AI model — zero API keys, no servers.',
  'You receive a factual digest of the site\'s current state: content pools, writer-lane results, faults, browser-test results, recent runs.',
  'Propose 3 to 5 concrete improvements.',
  'Rules:',
  '- Ground every proposal in the digest (cite its numbers). Never invent facts the digest does not contain.',
  '- Everything must be implementable in THIS project: plain HTML/JS pages, GitHub Actions workflows, Node scripts, data/*.json files, an Ollama model on the runner. No servers, no paid services, no API keys, no analytics accounts.',
  '- Small and certain beats large and speculative. Prefer: growing thin pools, making existing content easier to find, fixing failure patterns, polishing what exists.',
  '- Do NOT propose: implementing code changes automatically without owner approval, removing or weakening honesty labels ("unreviewed practice material"), paid tools, or work that contradicts the site\'s free/self-maintaining design.',
  'Reply with ONLY a JSON array. Each element exactly:',
  '{"title":"short name (max 80 chars)","why":"1-2 sentences citing digest facts","idea":"2-4 sentences, concrete implementation","effort":"small|medium|large","risk":"low|medium|high"}'
].join('\n');

async function main() {
  const startedAt = new Date().toISOString();
  console.log('proposals: start — model=' + MODEL + ' deadline=' + DEADLINE_MIN + 'min');

  const prev = loadJson(OUT, { meta: {}, proposals: [] });
  const prevProposals = Array.isArray(prev.proposals) ? prev.proposals : [];
  const prevTitles = prevProposals.map(p => normTitle(p.title)).filter(Boolean);

  const digest = buildDigest();
  console.log('proposals: digest ' + digest.length + ' chars');
  console.log('--- digest ---\n' + digest + '\n--- end digest ---');

  const user = 'SITE STATE DIGEST:\n' + digest + '\n\n' +
    (prevTitles.length
      ? 'Previous proposals already made (do NOT repeat these titles):\n' + prevTitles.slice(-30).map(t => '- ' + t).join('\n') + '\n\n'
      : '') +
    'Respond with ONLY the JSON array of 3-5 proposals.';

  let text = null;
  let err = null;
  try {
    text = process.env.PROPOSAL_FAKE_TEXT || await callLLM(SYSTEM, user, 1600);
    if (!text) throw new Error('model returned no text');
  } catch (e) {
    err = e;
  }

  let validated = { items: [], dropped: 0 };
  if (!err && text) {
    const raw = extractArray(text);
    if (!raw) err = new Error('model reply contained no JSON array');
    else validated = validateItems(raw, prevTitles);
    if (!err && !validated.items.length) err = new Error('no proposal survived validation (raw items: ' + (raw ? raw.length : 0) + ')');
  }

  if (err) {
    console.error('proposals: FAILED — ' + (err.message || err));
    const at = new Date().toISOString();
    // Keep the file honest: record the attempt, keep the previous proposals.
    saveJson(OUT, {
      meta: Object.assign({}, prev.meta, {
        note: 'Unreviewed improvement suggestions written by the site\'s own runner model. The owner approves by filing one as a GitHub issue — nothing is implemented automatically.',
        lastAttempt: { at: at, ok: false, error: String(err.message || err).slice(0, 240) }
      }),
      proposals: prevProposals
    });
    appendLog({
      at: at,
      model: MODEL,
      totalFixes: 0,
      byAgent: [{ agent: 'proposals', count: 0 }],
      details: [{ agent: 'proposals', fixes: [{ kind: 'proposal-error', fix: 'Proposal pass failed — see the run log', detail: String(err.message || err).slice(0, 180) }] }]
    });
    process.exit(1);
  }

  const at = new Date().toISOString();
  const fresh = validated.items.map((v, i) => ({
    id: 'prp-' + Date.now().toString(36) + '-' + (i + 1),
    at: at,
    title: v.title,
    why: v.why,
    idea: v.idea,
    effort: v.effort,
    risk: v.risk,
    status: 'new'
  }));
  const merged = fresh.concat(prevProposals).slice(0, 60);
  saveJson(OUT, {
    meta: {
      generatedAt: at,
      model: MODEL,
      note: 'Unreviewed improvement suggestions written by the site\'s own runner model. The owner approves by filing one as a GitHub issue — nothing is implemented automatically.',
      count: merged.length,
      lastAttempt: { at: at, ok: true, count: fresh.length, dropped: validated.dropped }
    },
    proposals: merged
  });

  appendLog({
    at: at,
    model: MODEL,
    totalFixes: fresh.length,
    byAgent: [{ agent: 'proposals', count: fresh.length }],
    details: [{
      agent: 'proposals',
      fixes: fresh.map(p => ({ kind: 'proposal', fix: p.title, detail: p.why, text: p.idea }))
    }]
  });

  console.log('proposals: done — ' + fresh.length + ' proposal(s) written, ' + validated.dropped + ' dropped (' +
    ((Date.now() - deadlineAnchor) / 1000 | 0) + 's, ' + prevProposals.length + ' kept from before)');
  fresh.forEach(p => console.log('  → [' + p.effort + '/' + p.risk + '] ' + p.title));
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => {
    console.error('proposals: FATAL — ' + (e && e.message ? e.message : e));
    process.exit(1);
  });
}

// Render the Vlymbooq Research Team page from data/research-solutions.json.
const fs = require('fs');
const path = require('path');
const store = require('./lib/research-store');

const ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(s) {
  const d = String(s || '').slice(0, 10);
  return d || '';
}

function methodHtml(m, i) {
  return '<div class="method">' +
    '<div class="mhead"><span class="mname">' + esc(m.name) + '</span>' +
    '<span class="pill">~' + (parseInt(m.seconds, 10) || 10) + 's</span>' +
    '<span class="kind">' + esc(m.kind || 'shortcut') + '</span></div>' +
    '<p class="idea">' + esc(m.idea) + '</p>' +
    '<ol class="steps">' + (m.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
    '</div>';
}

function cardHtml(s) {
  const methods = Array.isArray(s.methods) ? s.methods.slice().sort(function (a, b) { return (a.seconds || 99) - (b.seconds || 99); }) : [];
  const best = methods[0];
  const rest = methods.slice(1);
  const review = s.status === 'review';
  return '<article class="card' + (review ? ' review' : '') + '" data-exam="' + esc(s.exam) + '" data-text="' + esc((s.question + ' ' + (s.section || '')).toLowerCase()) + '">' +
    '<div class="top"><span class="exam">' + esc(String(s.exam || '').toUpperCase()) + '</span>' +
    '<span class="sec">' + esc(s.section || '') + '</span>' +
    (review ? '<span class="warn">needs review</span>' : '<span class="ok">verified</span>') +
    '<span class="date">' + esc(fmtDate(s.generatedAt)) + '</span></div>' +
    '<div class="q">' + esc(s.question) + '</div>' +
    '<div class="opts">' + (s.options || []).map(function (o) {
      return '<span class="opt' + (String(o.label).toUpperCase() === String(s.answer).toUpperCase() ? ' right' : '') + '">' + esc(o.label) + '. ' + esc(o.text) + '</span>';
    }).join('') + '</div>' +
    '<div class="answer">Answer: <b>' + esc(s.answer) + '</b>' + (s.key && s.key !== s.answer ? ' · paper key: ' + esc(s.key) : '') + '</div>' +
    (review && s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') +
    (best ? methodHtml(best, 0) : '<p class="note">No verified method yet.</p>') +
    (rest.length ? '<details class="more"><summary>More methods (' + rest.length + ')</summary>' + rest.map(methodHtml).join('') + '</details>' : '') +
    '<div class="foot">Verified by an independent solve · ' + esc(s.model || '') + ' · original to this lab' +
    (s.roles ? ' · ' + esc(s.roles.solver) + ' / Inventor / Verifier' : '') +
    (s.paperPath || s.paperSlug ? ' · <a href="' + esc(s.paperPath || (s.paperSlug + '.html')) + '">source paper</a>' : '') + '</div>' +
    '</article>';
}

function page(storeData) {
  const all = (storeData.solutions || []).filter(function (s) { return s && s.question && s.answer; });
  const published = all.filter(function (s) { return s.status === 'published'; });
  const review = all.filter(function (s) { return s.status === 'review'; });
  const exams = {};
  published.forEach(function (s) { exams[s.exam] = (exams[s.exam] || 0) + 1; });
  const examList = Object.keys(exams).sort();
  const totalMethods = published.reduce(function (n, s) { return n + (Array.isArray(s.methods) ? s.methods.length : 0); }, 0);
  const cards = published.map(cardHtml).join('') + review.map(cardHtml).join('');
  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Research Team - original exam solutions | Vlymbooq</title>' +
    '<meta name="description" content="A solver, an inventor and a verifier work on each exam question. Every published method is checked by an independent solve and can be applied in seconds.">' +
    '<style>' +
    '*{box-sizing:border-box}body{margin:0;background:#09090b;color:#fafafa;font:15px/1.55 system-ui,-apple-system,sans-serif}' +
    '.wrap{max-width:900px;margin:0 auto;padding:26px 16px}' +
    '.crumb{color:#71717a;font-size:12px;margin-bottom:12px}.crumb a{color:#60a5fa;text-decoration:none}' +
    'h1{font-size:26px;margin:0 0 6px}.lead{color:#a1a1aa;font-size:14px;margin:0 0 10px}' +
    '.disc{background:#18181b;border:1px solid #27272a;border-radius:10px;padding:10px 14px;color:#a1a1aa;font-size:12.5px;margin:12px 0 18px}' +
    '.stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.stats span{background:#111113;border:1px solid #27272a;border-radius:999px;padding:5px 12px;font-size:12px;color:#d4d4d8}' +
    '.controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}input,select{background:#111113;border:1px solid #27272a;color:#fafafa;border-radius:9px;padding:9px 12px;font-size:13.5px}input{flex:1;min-width:180px}' +
    '.card{background:#111113;border:1px solid #27272a;border-radius:14px;padding:16px 18px;margin:14px 0}.card.review{border-color:#b45309}' +
    '.top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:11.5px}' +
    '.exam{font-weight:800;color:#a78bfa}.sec{color:#a1a1aa}.ok{color:#34d399;border:1px solid rgba(52,211,153,.35);border-radius:999px;padding:1px 8px}.warn{color:#fbbf24;border:1px solid rgba(251,191,36,.4);border-radius:999px;padding:1px 8px}.date{margin-left:auto;color:#71717a}' +
    '.q{font-weight:650;margin-bottom:9px}.opts{display:grid;gap:5px;margin-bottom:9px}.opt{background:#0c0c0f;border:1px solid #27272a;border-radius:8px;padding:6px 9px;font-size:13px;color:#d4d4d8}.opt.right{border-color:#34d399;color:#fafafa}' +
    '.answer{color:#a1a1aa;font-size:13px;margin-bottom:10px}.answer b{color:#34d399}' +
    '.note{color:#fbbf24;font-size:12.5px}.method{background:#0c0c0f;border:1px solid #27272a;border-radius:10px;padding:11px 13px;margin-top:10px}' +
    '.mhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mname{font-weight:800;color:#60a5fa}.pill{background:#172554;color:#93c5fd;border-radius:999px;padding:1px 8px;font-size:11px}.kind{color:#71717a;font-size:11px}' +
    '.idea{color:#d4d4d8;font-size:13px;margin:5px 0}.steps{margin:6px 0 0;padding-left:19px;color:#d4d4d8;font-size:13px}.steps li{margin:3px 0}' +
    '.more{margin-top:10px}.more summary{cursor:pointer;color:#a1a1aa;font-size:12.5px}' +
    '.foot{margin-top:10px;color:#71717a;font-size:11.5px}.foot a{color:#60a5fa;text-decoration:none}' +
    '.empty{background:#111113;border:1px dashed #27272a;border-radius:14px;padding:30px;text-align:center;color:#a1a1aa}' +
    '</style></head><body><div class="wrap">' +
    '<div class="crumb"><a href="index.html">Home</a> / Research Team</div>' +
    '<h1>Research Team</h1>' +
    '<p class="lead">A scientist solves each question, an inventor finds the fastest valid method, and an independent verifier checks the answer again. Only methods that survive the check appear here.</p>' +
    '<div class="disc">"Original" means original to this lab - we do not claim a method is the first in the world. Every method is reproducible from the question and checked by a second solve. Time shown is how long a prepared student needs, not model latency.</div>' +
    '<div class="stats"><span>' + published.length + ' verified questions</span><span>' + totalMethods + ' methods</span><span>' + examList.length + ' exams</span></div>' +
    '<div class="controls"><input id="search" type="search" placeholder="Search a question or topic...">' +
    '<select id="exam"><option value="">All exams</option>' + examList.map(function (e) { return '<option value="' + esc(e) + '">' + esc(e.toUpperCase()) + ' (' + exams[e] + ')</option>'; }).join('') + '</select></div>' +
    '<div id="list">' + (cards || '<div class="empty">The team is starting its first investigations. Check back shortly.</div>') + '</div>' +
    '<div class="foot" style="margin-top:24px;border-top:1px solid #27272a;padding-top:12px">Updated ' + esc(fmtDate(storeData.updatedAt)) + ' · Methods are study aids; verify any factual detail with the official notification.</div>' +
    '</div><script>(function(){var i=document.getElementById("search"),e=document.getElementById("exam");function f(){var t=(i.value||"").toLowerCase().trim(),x=e.value;document.querySelectorAll(".card").forEach(function(c){var ok=(!x||c.getAttribute("data-exam")===x)&&(!t||(c.getAttribute("data-text")||"").indexOf(t)!==-1);c.style.display=ok?"":"none"});}i.oninput=f;e.onchange=f;})();</script></body></html>';
}

function run() {
  const data = store.load(ROOT);
  const html = page(data);
  fs.writeFileSync(path.join(ROOT, 'research-team.html'), html, 'utf-8');
  console.log('research-team.html · ' + (data.solutions || []).length + ' entries');
}

run();



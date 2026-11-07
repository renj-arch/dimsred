// Render full-length paper JSON (kind:"full") into <exam>/mock-tests/ pages
// with the real pattern header, timer, answer key and explanations.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'papers-data');
const BASE = 'https://vlymbooq.qzz.io';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function correctLabel(q) {
  const o = (q.options || []).find(function (x) { return x.correct; });
  return o ? o.label : '';
}

function questionHtml(q, color) {
  const opts = (q.options || []).map(function (o) {
    return '<label class="opt"><input type="radio" name="q' + q.q + '" value="' + esc(o.label) + '"><span class="ol">' + esc(o.label) + '.</span> ' + esc(o.text) + '</label>';
  }).join('');
  return '<article class="q" id="q' + q.q + '" data-correct="' + esc(correctLabel(q)) + '">' +
    '<div class="qhead"><span class="qnum">Q' + q.q + '</span><span class="badge" style="background:' + color + '33;color:' + color + '">' + esc(q.section) + '</span>' +
    (q.source === 'model' || q.reviewed === false ? '<span class="ai">model-generated · ' + esc((q.generatedAt || '').slice(0, 10)) + '</span>' : '') +
    '</div><div class="stem">' + esc(q.text) + '</div><div class="opts">' + opts + '</div>' +
    '<button class="reveal" type="button">Show answer &amp; explanation</button>' +
    '<div class="sol" hidden><strong>Answer: ' + esc(correctLabel(q)) + '</strong><p>' + esc(q.solution || '') + '</p></div></article>';
}

function build(data) {
  const colors = {};
  (data.sections || []).forEach(function (s) { colors[s.name] = s.color || '#a78bfa'; });
  let body = '';
  let n = 0;
  (data.sectionsMeta || []).forEach(function (sm) {
    const qs = data.questions.filter(function (q) { return q.section === sm.name; });
    body += '<h2 class="sec" style="border-color:' + (colors[sm.name] || '#a78bfa') + '">' + esc(sm.name) +
      ' <span>' + qs.length + ' Q · ' + sm.marks + ' marks</span></h2>';
    qs.forEach(function (q) { body += questionHtml(q, colors[sm.name] || '#a78bfa'); n++; });
  });
  const keyRows = data.questions.map(function (q) {
    return '<tr><td>' + q.q + '</td><td>' + esc(q.section) + '</td><td class="k">' + esc(correctLabel(q)) + '</td></tr>';
  }).join('');
  const sols = data.questions.map(function (q) {
    return '<div class="ex"><div class="exq">Q' + q.q + '. ' + esc(q.text) + '</div><div class="exa">Answer: <b>' + esc(correctLabel(q)) + '</b></div><div>' + esc(q.solution || '') + '</div></div>';
  }).join('');
  const metaBits = [
    data.questions.length + ' questions',
    data.totalMarks + ' marks',
    data.timerMinutes + ' minutes',
    data.negativeNote || 'Negative marking as per the exam'
  ];

  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + esc(data.pageTitle) + '</title><meta name="description" content="' + esc(data.pageDesc) + '">' +
    '<link rel="canonical" href="' + BASE + '/' + data.folder + '/mock-tests/' + data.slug + '.html">' +
    '<link rel="icon" type="image/svg+xml" href="../../favicon.svg">' +
    '<style>' +
    '*{box-sizing:border-box}body{margin:0;background:#09090b;color:#fafafa;font:16px/1.55 Inter,system-ui,sans-serif}' +
    '.nav{display:flex;gap:14px;align-items:center;padding:12px 20px;border-bottom:1px solid #27272a;flex-wrap:wrap}.nav a{color:#a1a1aa;text-decoration:none;font-size:.9em}.nav a.active{color:#fff}' +
    '.wrap{max-width:900px;margin:0 auto;padding:22px}' +
    'h1{font-size:1.55em;margin:0 0 6px}.sub{color:#a1a1aa;font-size:.92em;margin:0 0 14px}' +
    '.facts{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.facts span{background:#18181b;border:1px solid #27272a;border-radius:100px;padding:5px 11px;font-size:.8em;color:#d4d4d8}' +
    '.provisional{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.35);color:#fbbf24;border-radius:10px;padding:10px 13px;font-size:.83em;margin:10px 0}' +
    '.timer{position:sticky;top:0;z-index:5;background:#0c0c0f;border:1px solid #27272a;border-radius:12px;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:14px 0}' +
    '.timer b{font-variant-numeric:tabular-nums;font-size:1.2em}.btn{background:#a78bfa;color:#09090b;border:0;border-radius:100px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:.85em}' +
    '.btn.sec{background:#27272a;color:#fafafa}.btn:disabled{opacity:.5;cursor:default}' +
    '.hint{color:#71717a;font-size:.8em}' +
    'h2.sec{margin:28px 0 10px;padding-left:10px;border-left:4px solid;font-size:1.05em}h2.sec span{color:#71717a;font-weight:400;font-size:.8em;margin-left:8px}' +
    '.q{background:#111113;border:1px solid #27272a;border-radius:12px;padding:14px;margin:12px 0}.qhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}' +
    '.qnum{font-weight:800;color:#a78bfa}.badge{font-size:.7em;padding:3px 8px;border-radius:100px}.ai{font-size:.68em;color:#fbbf24;border:1px solid rgba(251,191,36,.35);border-radius:100px;padding:2px 7px}' +
    '.stem{font-weight:600;margin-bottom:10px}.opts{display:grid;gap:6px}.opt{display:flex;gap:8px;background:#0c0c0f;border:1px solid #27272a;border-radius:9px;padding:8px 10px;cursor:pointer;font-size:.92em}' +
    '.opt:hover{border-color:#3f3f46}.opt input{margin-top:4px}.ol{font-weight:700;color:#a1a1aa}' +
    '.reveal{margin-top:10px;background:transparent;border:1px solid #3f3f46;color:#a1a1aa;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:.8em}' +
    '.sol{margin-top:10px;border-top:1px dashed #3f3f46;padding-top:9px;font-size:.9em;color:#d4d4d8}.sol p{margin:4px 0 0}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}' +
    'table{width:100%;border-collapse:collapse;font-size:.85em}td,th{border:1px solid #27272a;padding:6px 8px;text-align:left}th{background:#18181b}.k{font-weight:800;color:#34d399}' +
    '.ex{border-bottom:1px solid #27272a;padding:9px 0;font-size:.88em;color:#d4d4d8}.exq{font-weight:600;color:#fafafa}.exa{color:#34d399;margin:3px 0}' +
    '.footer{margin:28px 0;color:#71717a;font-size:.8em}' +
    '@media print{.nav,.timer,.reveal,.btn{display:none}.sol[hidden]{display:block!important}body{background:#fff;color:#000}.q{border-color:#ccc;background:#fff}}' +
    '</style></head><body>' +
    '<nav class="nav"><a href="../../index.html">Home</a><a href="../index.html">' + esc(data.folder.toUpperCase()) + '</a><a href="index.html" class="active">Mock Tests</a><a href="' + data.slug + '.html">Full paper</a></nav>' +
    '<div class="wrap"><h1>' + esc(data.title) + '</h1>' +
    '<p class="sub">' + esc(data.meta) + '</p>' +
    '<div class="facts">' + metaBits.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</div>' +
    '<p class="hint">Generated ' + esc(data.generatedAt || data.createdDate) + ' · ' + esc(data.generatedBy || '') + ' · Source: ' + esc(data.source || '') + '</p>' +
    (data.provisional ? '<div class="provisional">Section counts for this paper are provisional — they vary by year and could not be checked against one official notification.</div>' : '') +
    (data.note ? '<p class="hint">' + esc(data.note) + '</p>' : '') +
    '<div class="timer"><b id="clock">--:--:--</b><button class="btn" id="start" type="button">Start timer</button><button class="btn sec" id="pause" type="button" disabled>Pause</button><span class="hint">Negative marking: ' + esc(data.negativeNote || data.negativeMarking) + '</span></div>' +
    '<p class="hint">Answer the questions, then press “Show answer” on any question or use the key at the bottom. This page and the PDF are printable.</p>' +
    '<div class="grid" style="margin:12px 0"><button class="btn sec" id="all" type="button">Show all explanations</button><button class="btn sec" id="score" type="button">Score my attempt</button><button class="btn sec" onclick="window.print()" type="button">Print</button><a class="btn sec" href="/pdfs/' + data.slug + '.pdf" download>Download PDF</a></div>' +
    '<div id="scoreOut" class="hint"></div>' +
    body +
    '<h2 class="sec">Answer key</h2><table><thead><tr><th>Q</th><th>Section</th><th>Answer</th></tr></thead><tbody>' + keyRows + '</tbody></table>' +
    '<h2 class="sec">Solutions &amp; explanations</h2>' + sols +
    '<p class="footer">Paper generated ' + esc(data.createdDate) + '. Model-written questions are marked; reviewed bank questions are unmarked. Verify any factual detail against the official notification before relying on it.</p></div>' +
    '<script>(function(){var left=' + (data.timerMinutes * 60) + ',run=null,el=document.getElementById("clock");function fmt(n){n=Math.max(0,n);return String(Math.floor(n/3600)).padStart(2,"0")+":"+String(Math.floor(n%3600/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}el.textContent=fmt(left);function tick(){if(left<=0){clearInterval(run);run=null;el.textContent="00:00:00";return}left--;el.textContent=fmt(left)}document.getElementById("start").onclick=function(){if(run)return;run=setInterval(tick,1000);this.disabled=true;document.getElementById("pause").disabled=false};document.getElementById("pause").onclick=function(){if(run){clearInterval(run);run=null;this.textContent="Resume"}else{run=setInterval(tick,1000);this.textContent="Pause"}};document.getElementById("all").onclick=function(){document.querySelectorAll(".q").forEach(function(q){var s=q.querySelector(".sol");s.hidden=false});};document.getElementById("score").onclick=function(){var right=0,wrong=0,skip=0;document.querySelectorAll(".q").forEach(function(q){var v=q.querySelector("input:checked");if(!v){skip++;return}if(v.value===q.dataset.correct)right++;else wrong++;});var neg=parseFloat(' + JSON.stringify(Number(data.negativeMarking) || 0) + ');var per=' + JSON.stringify(Number(data.totalMarks) / Math.max(1, data.questions.length)) + ';var score=(right-wrong*neg)*per;document.getElementById("scoreOut").textContent="Correct "+right+" · Wrong "+wrong+" · Skipped "+skip+" · Estimated score "+score.toFixed(2)+" / '+data.totalMarks+'";};})();</script></body></html>';
}

function updateIndex(data) {
  const file = path.join(ROOT, data.folder, 'mock-tests', 'index.html');
  if (!fs.existsSync(file)) return 'missing index';
  const html = fs.readFileSync(file, 'utf-8');
  if (html.indexOf(data.slug + '.html') !== -1) return 'already listed';
  const first = html.indexOf('<div class="mock-card">');
  if (first === -1) return 'no card slot';
  const card = '<div class="mock-card"><div class="m-title"><a href="' + data.slug + '.html">' + esc(data.title) + '</a></div>' +
    '<div class="m-meta">' + data.questions.length + ' Questions &middot; ' + data.timerMinutes + ' min &middot; ' + data.totalMarks + ' Marks &middot; Full pattern &middot; PDF with solutions</div>' +
    '<a href="' + data.slug + '.html" class="btn btn-success">Start Full Paper &#x2192;</a></div>\n        ';
  fs.writeFileSync(file, html.slice(0, first) + card + html.slice(first), 'utf-8');
  return 'listed';
}

function run() {
  // Only touch the paper this run produced. Rebuilding every page rewrites
  // 20+ files and makes otherwise-independent paper pushes conflict.
  const slugArg = process.argv.slice(2).find(function (a) { return a.indexOf('--slug=') === 0; });
  const onlySlug = slugArg ? slugArg.slice('--slug='.length) : '';
  const files = fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.json'); });
  let built = 0;
  files.forEach(function (f) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')); } catch (e) { return; }
    if (data.kind !== 'full') return;
    if (onlySlug && data.slug !== onlySlug) return;
    const dir = path.join(ROOT, data.folder, 'mock-tests');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, data.slug + '.html'), build(data), 'utf-8');
    const state = updateIndex(data);
    console.log(data.folder + '/mock-tests/' + data.slug + '.html · ' + data.questions.length + ' Q · ' + state);
    built++;
  });
  console.log('Built ' + built + ' full paper page(s).');
}

run();

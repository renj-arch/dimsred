// Render the Vlymbooq Research Team page.
//
// Grouped the way a student revises: subject first (Mathematics, Reasoning &
// General Intelligence, English Language, General Studies), then topic inside
// it (Simple Interest, Compound Interest, Time and Work ...). Methods come from
// two stores: data/research-solutions.json (paper questions) and
// data/research-invented.json (invented questions, keyed by question text).
const fs = require('fs');
const path = require('path');
const store = require('./lib/research-store');

const ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtDate(s) { return String(s || '').slice(0, 10); }
function keyOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160); }
function loadJson(rel, fb) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { return fb; } }

// Broad subject from a section/topic string.
function groupOf(text) {
  const t = String(text || '').toLowerCase();
  if (/csat/.test(t)) return 'CSAT (Paper II)';
  if (/legal/.test(t)) return 'Legal & Other';
  if (/physics|chemistry|biology/.test(t) && !/general science/.test(t)) return 'Science';
  if (/quant|aptitude|math|interest|work|percentage|profit|ratio|number|mensuration|algebra|geometry|trigono|speed|distance|average/.test(t)) return 'Mathematics';
  if (/reason|intelligen|series|coding|syllog|blood|direction|ranking|puzzle|seating|clock|calendar|analogy|deduct/.test(t)) return 'Reasoning & General Intelligence';
  if (/english|comprehension|grammar|vocab|verbal|antonym|synonym|idiom|sentence|cloze|filler/.test(t)) return 'English Language';
  if (/general|polity|history|geo|economy|science|current|awareness|environment|static/.test(t)) return 'General Studies';
  return 'Other';
}
const GROUP_ORDER = ['Mathematics', 'Reasoning & General Intelligence', 'English Language', 'General Studies', 'Science', 'CSAT (Paper II)', 'Legal & Other', 'Other'];
const GROUP_ICON = { 'Mathematics': '🔢', 'Reasoning & General Intelligence': '🧠', 'English Language': '📖', 'General Studies': '🌏', 'Science': '🔬', 'CSAT (Paper II)': '📝', 'Legal & Other': '⚖️', 'Other': '🧩' };

function methodHtml(m) {
  return '<div class="method">' +
    '<div class="mhead"><span class="mname">' + esc(m.name || 'Method') + '</span>' +
    '<span class="pill">~' + (parseInt(m.seconds, 10) || 10) + 's</span>' +
    (m.kind ? '<span class="kind">' + esc(m.kind) + '</span>' : '') + '</div>' +
    (m.idea ? '<p class="idea">' + esc(m.idea) + '</p>' : '') +
    '<ol class="steps">' + (m.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
    '</div>';
}

function cardHtml(e) {
  const methods = (e.methods || []).slice().sort(function (a, b) { return (a.seconds || 99) - (b.seconds || 99); });
  const best = methods[0];
  const rest = methods.slice(1);
  const review = e.status === 'review';
  return '<article class="card' + (review ? ' review' : '') + '" data-group="' + esc(e.group) + '" data-text="' + esc((e.question + ' ' + e.topic + ' ' + e.group).toLowerCase()) + '">' +
    '<div class="top"><span class="exam">' + esc(e.exam ? String(e.exam).toUpperCase() : 'INVENTED') + '</span>' +
    '<span class="sec">' + esc(e.topic) + '</span>' +
    (e.verified ? '<span class="ok">verified</span>' : (review ? '<span class="warn">needs review</span>' : '')) +
    '<span class="date">' + esc(fmtDate(e.generatedAt)) + '</span></div>' +
    '<div class="q">' + esc(e.question) + '</div>' +
    (e.options && e.options.length ? '<div class="opts">' + e.options.map(function (o) {
      const label = o.label || '';
      const text = o.text != null ? o.text : o;
      const right = String(text).toLowerCase() === String(e.answer).toLowerCase() || String(label).toUpperCase() === String(e.answer).toUpperCase();
      return '<span class="opt' + (right ? ' right' : '') + '">' + (label ? esc(label) + '. ' : '') + esc(text) + '</span>';
    }).join('') + '</div>' : '') +
    '<div class="answer">Answer: <b>' + esc(e.answer) + '</b>' + (e.key && e.key !== e.answer ? ' · paper key: ' + esc(e.key) : '') + '</div>' +
    (review && e.note ? '<p class="note">' + esc(e.note) + '</p>' : '') +
    (best ? methodHtml(best) : '<p class="note">No verified method yet.</p>') +
    (rest.length ? '<details class="more"><summary>More methods (' + rest.length + ')</summary>' + rest.map(methodHtml).join('') + '</details>' : '') +
    '<div class="foot">Checked by an independent solve · original to this lab' +
    (e.paperPath ? ' · <a href="' + esc(e.paperPath) + '">source paper</a>' : '') + '</div>' +
    '</article>';
}

function buildEntries() {
  const entries = [];
  const sol = store.load(ROOT);
  (sol.solutions || []).filter(function (s) { return s && s.question && s.answer && (s.status === 'published' || s.status === 'review'); })
    .forEach(function (s) {
      entries.push({
        group: groupOf(s.section),
        topic: s.subTopic || s.section || 'General',
        exam: s.exam,
        question: s.question,
        answer: s.answer,
        key: s.key,
        options: s.options,
        methods: s.methods,
        status: s.status,
        verified: s.status === 'published',
        note: s.note,
        paperPath: s.paperPath || (s.paperSlug ? s.paperSlug + '.html' : ''),
        generatedAt: s.generatedAt
      });
    });

  const inv = loadJson('data/research-invented.json', { methods: {} });
  const pool = loadJson('data/invented/questions.json', { questions: [] }).questions || [];
  const byStem = {};
  pool.forEach(function (q) { if (q && q.stem) byStem[keyOf(q.stem)] = q; });
  Object.keys(inv.methods || {}).forEach(function (k) {
    const m = inv.methods[k];
    if (!m || !m.steps || !m.steps.length) return;
    const q = byStem[k];
    const section = (q && q.section) || 'quant';
    const topic = (q && (q.topic || q.mentalTopic)) || section;
    entries.push({
      group: groupOf(section + ' ' + topic),
      topic: topic,
      exam: '',
      question: q ? q.stem : k,
      answer: m.answer || (q && q.answer) || '',
      options: q ? (q.options || []).map(function (o) { return { label: '', text: o }; }) : null,
      methods: [{ name: m.name, seconds: m.seconds, steps: m.steps, kind: 'alternative' }],
      verified: true,
      generatedAt: m.generatedAt
    });
  });
  return entries;
}

function page() {
  const entries = buildEntries();
  const groups = {};
  entries.forEach(function (e) { (groups[e.group] = groups[e.group] || []).push(e); });
  const order = GROUP_ORDER.filter(function (g) { return groups[g]; });

  let nav = '<div class="subnav">' + order.map(function (g) {
    return '<a href="#g-' + esc(g.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '">' + GROUP_ICON[g] + ' ' + esc(g) + ' <span>' + groups[g].length + '</span></a>';
  }).join('') + '</div>';

  let body = '';
  order.forEach(function (g) {
    const byTopic = {};
    groups[g].forEach(function (e) { (byTopic[e.topic] = byTopic[e.topic] || []).push(e); });
    const topics = Object.keys(byTopic).sort();
    body += '<h2 id="g-' + esc(g.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '">' + GROUP_ICON[g] + ' ' + esc(g) + ' <span class="cnt">' + groups[g].length + '</span></h2>';
    topics.forEach(function (t) {
      body += '<h3 class="topic">' + esc(t) + ' <span class="cnt">' + byTopic[t].length + '</span></h3>';
      body += byTopic[t].map(cardHtml).join('');
    });
  });

  const examList = {}; entries.forEach(function (e) { if (e.exam) examList[e.exam] = (examList[e.exam] || 0) + 1; });
  const totalMethods = entries.reduce(function (n, e) { return n + (e.methods ? e.methods.length : 0); }, 0);

  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Research Team - original exam solutions | Vlymbooq</title>' +
    '<meta name="description" content="Original solution methods for exam questions, grouped by subject and topic: Mathematics, Reasoning and General Intelligence, English, General Studies.">' +
    '<style>' +
    '*{box-sizing:border-box}body{margin:0;background:#09090b;color:#fafafa;font:15px/1.55 system-ui,-apple-system,sans-serif}' +
    '.wrap{max-width:900px;margin:0 auto;padding:26px 16px}' +
    '.crumb{color:#71717a;font-size:12px;margin-bottom:12px}.crumb a{color:#60a5fa;text-decoration:none}' +
    'h1{font-size:26px;margin:0 0 6px}.lead{color:#a1a1aa;font-size:14px;margin:0 0 10px}' +
    '.disc{background:#18181b;border:1px solid #27272a;border-radius:10px;padding:10px 14px;color:#a1a1aa;font-size:12.5px;margin:12px 0 18px}' +
    '.stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.stats span{background:#111113;border:1px solid #27272a;border-radius:999px;padding:5px 12px;font-size:12px;color:#d4d4d8}' +
    '.subnav{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px}.subnav a{background:#111113;border:1px solid #27272a;border-radius:999px;padding:6px 12px;color:#d4d4d8;text-decoration:none;font-size:12.5px}.subnav a span{color:#60a5fa;font-weight:700}' +
    '.controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}input,select{background:#111113;border:1px solid #27272a;color:#fafafa;border-radius:9px;padding:9px 12px;font-size:13.5px}input{flex:1;min-width:180px}' +
    'h2{font-size:19px;margin:28px 0 6px;border-bottom:1px solid #27272a;padding-bottom:6px}' +
    'h3.topic{font-size:14px;color:#93c5fd;margin:18px 0 4px;letter-spacing:.02em}' +
    '.cnt{color:#71717a;font-size:12px;font-weight:400}' +
    '.card{background:#111113;border:1px solid #27272a;border-radius:14px;padding:16px 18px;margin:12px 0}.card.review{border-color:#b45309}' +
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
    '<p class="lead">A solver, an inventor and a verifier work on each question. Methods are grouped by subject and topic so you can revise one topic at a time.</p>' +
    '<div class="disc">"Original" means original to this lab - no world-first claim. Every published method passed an independent solve. Time is how long a prepared student needs, not model latency.</div>' +
    '<div class="stats"><span>' + entries.length + ' questions</span><span>' + totalMethods + ' methods</span><span>' + order.length + ' subjects</span></div>' +
    nav +
    '<div class="controls"><input id="search" type="search" placeholder="Search a question or topic (interest, work, coding, synonym...)">' +
    '<select id="group"><option value="">All subjects</option>' + order.map(function (g) { return '<option value="' + esc(g) + '">' + esc(g) + '</option>'; }).join('') + '</select></div>' +
    '<div id="list">' + (body || '<div class="empty">The team is starting its first investigations. Check back shortly.</div>') + '</div>' +
    '<div class="foot" style="margin-top:24px;border-top:1px solid #27272a;padding-top:12px">Updated ' + esc(fmtDate(new Date().toISOString())) + ' · Methods are study aids; verify any factual detail with the official notification.</div>' +
    '</div><script>(function(){var i=document.getElementById("search"),g=document.getElementById("group");function f(){var t=(i.value||"").toLowerCase().trim(),x=g.value;document.querySelectorAll(".card").forEach(function(c){var ok=(!x||c.getAttribute("data-group")===x)&&(!t||(c.getAttribute("data-text")||"").indexOf(t)!==-1);c.style.display=ok?"":"none";});}i.oninput=f;g.onchange=f;})();</script></body></html>';
}

fs.writeFileSync(path.join(ROOT, 'research-team.html'), page(), 'utf-8');
const inv = loadJson('data/research-invented.json', { methods: {} });
console.log('research-team.html · papers + ' + Object.keys(inv.methods || {}).length + ' invented methods');
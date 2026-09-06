const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const OUT_DIR = path.join(__dirname, '..', 'questions');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const ROOT_URL = 'https://vlymbooq.qzz.io';

// ── Helpers ──
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function makeExplanation(q) {
  let exp = q.fact || q.question;
  if (q.pubDate) {
    const d = new Date(q.pubDate);
    exp = (q.fact || q.question) + '\n\nSource: ' + (q.source || 'Unknown') + ', ' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }
  return exp;
}

const CAT_ICONS = {
  'Indian History':'📜','World History':'🌍','Art & Culture':'🎨','Polity':'🏛️','Indian Economy':'📊',
  'Geography':'🗺️','World Geography':'🌏','General Science':'🔬','Defence':'⚔️','Environment & Ecology':'🌿',
  'International Relations':'🤝','Constitution':'📜','ISRO & Space':'🚀','Computer & IT':'💻','Sports':'🏆',
  'Society':'👥','Personalities':'👤','State GK':'🗺️','Books & Authors':'📚','Important Days':'📅',
  'Govt Schemes':'📋','Awards':'🏅','Business & Economy':'💼','Tech & Science':'⚙️','Ethics':'⚖️',
  'Announcements':'📢','RBI Press Releases':'🏦'
};

// ── Page template ──
function renderPage(q, prevLink, nextLink) {
  const cat = q.category || 'GK';
  const icon = CAT_ICONS[cat] || '📌';
  const explain = esc(makeExplanation(q)).replace(/\n/g, '<br>');
  const dateStr = q.pubDate ? new Date(q.pubDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(q.question.substring(0, 60))} — ${esc(cat)} GK Question</title>
<meta name="description" content="${esc(q.question.substring(0, 160))} Answer: ${esc(q.answer)}. Free GK practice for competitive exams.">
<link rel="canonical" href="${ROOT_URL}/questions/q-${q.id}.html">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="icon" type="image/png" href="../logo.png">
<link rel="stylesheet" href="../css/style.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--red:#ef4444;--amber:#f59e0b;--radius:12px}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
a{color:var(--purple);text-decoration:none}
a:hover{text-decoration:underline}
.nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:800px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05em;color:var(--text)}
.container{max-width:800px;margin:0 auto;padding:40px 24px}
.q-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.82em;color:var(--text-sec)}
.q-cat{background:rgba(167,139,250,.1);color:var(--purple);padding:2px 10px;border-radius:100px;font-size:.82em}
.q-date{color:var(--text-muted)}
.q-text{font-size:1.15em;font-weight:600;margin-bottom:20px;line-height:1.7}
.q-answer{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px}
.q-answer .label{font-size:.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.q-answer .value{font-size:1em;color:var(--emerald);font-weight:600}
.explain-btn{background:var(--bg-card);border:1px solid var(--border);color:var(--text);padding:10px 18px;border-radius:100px;cursor:pointer;font-size:.85em;margin-bottom:16px}
.explain-btn:hover{background:var(--bg-hover)}
.q-explain{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;font-size:.88em;color:var(--text-sec);line-height:1.7;display:none}
.q-explain.show{display:block}
.nav-links{display:flex;justify-content:space-between;gap:12px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)}
.nav-links a{padding:8px 16px;border-radius:100px;border:1px solid var(--border);font-size:.85em;color:var(--text);transition:all .2s}
.nav-links a:hover{background:var(--bg-card);text-decoration:none}
.breadcrumb{font-size:.82em;color:var(--text-muted);margin-bottom:24px}
.breadcrumb a{color:var(--text-sec)}
.breadcrumb .sep{margin:0 6px;color:var(--text-muted)}
.breadcrumb .current{color:var(--text)}
@media(max-width:600px){.container{padding:24px 16px}}
</style>
</head>
<body>
<nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand">vlymbooq</a><a href="../archive.html">Archive</a></div></nav>
<div class="container">
<div class="breadcrumb"><a href="../archive.html">Archive</a><span class="sep">›</span><a href="../archive.html">${esc(cat)}</a><span class="sep">›</span><span class="current">Question</span></div>

<div class="q-header">
<span class="q-cat">${icon} ${esc(cat)}</span>
${dateStr ? '<span class="q-date">' + dateStr + '</span>' : ''}
</div>

<div class="q-text">${esc(q.question)}</div>

<div class="q-answer">
<div class="label">Answer</div>
<div class="value">${esc(q.answer)}</div>
</div>

<button class="explain-btn" onclick="this.nextElementSibling.classList.toggle('show');this.textContent=this.nextElementSibling.classList.contains('show')?'Hide Explanation':'Show Explanation'">Show Explanation</button>
<div class="q-explain">${explain}</div>

<div class="nav-links">
${prevLink ? '<a href="' + prevLink + '">← Previous</a>' : '<span></span>'}
<a href="../archive.html">Back to Archive</a>
${nextLink ? '<a href="' + nextLink + '">Next →</a>' : '<span></span>'}
</div>
</div>
</body>
</html>`;
}

// ── Main ──
const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
const questions = quiz.questions;

// Create output directory
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Generate individual pages
let count = 0;
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  if (!q.id) continue;
  const prevLink = i > 0 && questions[i-1].id ? 'q-' + questions[i-1].id + '.html' : null;
  const nextLink = i < questions.length - 1 && questions[i+1].id ? 'q-' + questions[i+1].id + '.html' : null;
  const html = renderPage(q, prevLink, nextLink);
  fs.writeFileSync(path.join(OUT_DIR, 'q-' + q.id + '.html'), html);
  count++;
}

console.log('Generated ' + count + ' question pages.');

// Update sitemap
const now = new Date().toISOString().split('T')[0];
const questionUrls = questions.filter(q => q.id).map(q => {
  const lastmod = q.pubDate ? q.pubDate.split('T')[0] : now;
  return `  <url>\n    <loc>${ROOT_URL}/questions/q-${q.id}.html</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.7</priority>\n  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ROOT_URL}/</loc>
    <lastmod>${now}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${ROOT_URL}/archive.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${ROOT_URL}/current-affairs.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${ROOT_URL}/dashboard.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${ROOT_URL}/mental.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.8</priority>
  </url>
${questionUrls}
</urlset>`;

fs.writeFileSync(SITEMAP_PATH, sitemap);
console.log('Updated sitemap.xml with ' + questions.filter(q => q.id).length + ' question URLs.');

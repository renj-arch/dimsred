const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
const outDir = path.join(__dirname, '..', 'data', 'questions');
const archivePath = path.join(__dirname, '..', 'archive.html');

const pibPath = path.join(__dirname, '..', 'data', 'questions', 'pib-archive.json');
let pibQuestions = [];
try {
  const pibData = JSON.parse(fs.readFileSync(pibPath, 'utf8'));
  for (const [, subjData] of Object.entries(pibData)) {
    if (subjData.subSubjects) {
      for (const [, qs] of Object.entries(subjData.subSubjects)) {
        pibQuestions = pibQuestions.concat(qs);
      }
    }
  }
} catch {}

const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const rawQuestions = quiz.questions.concat(pibQuestions);

// ── Dedup by (question + answer) key ──
const seen = new Set();
const allQuestions = [];
rawQuestions.forEach(q => {
  const key = ((q.question || '') + '||' + (q.answer || '')).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!seen.has(key)) {
    seen.add(key);
    allQuestions.push(q);
  }
});
const deduped = allQuestions.length;
console.log('quiz.json: ' + deduped + ' / ' + rawQuestions.length + ' unique (removed ' + (rawQuestions.length - deduped) + ' duplicates)');

const CAT_ICONS = {
  'Ancient India':'🏛️','Medieval & Modern India':'👑','Indian History':'🏛️',
  'World History':'🌍','Indian Geography':'🏔️','World Geography':'🌏',
  'Polity & Governance':'⚖️','Polity':'⚖️',
  'Indian Economy':'📊','General Science':'🔬','Science & Technology':'🤖',
  'Tech & Science':'⚙️','Art & Culture':'🎨','Defence & Security':'⚔️',
  'Defence':'⚔️','Environment & Ecology':'🌿','International Relations':'🤝',
  'Indian Society':'👥','Society':'👥','Ethics & Integrity':'⚖️',
  'Ethics':'⚖️','ISRO & Space':'🚀','Sports':'🏆','Books & Authors':'📚',
  'Awards & Honours':'🏅','Awards':'🏅','Govt Schemes':'📋',
  'Indian States':'🗺️','State GK':'🗺️','Important Days':'📅',
  'Personalities':'👤','Disaster Management':'🆘',
  'Business & Economy':'💼','RBI & Banking':'🏦','RBI Press Releases':'🏦',
  'Indian National Symbols':'🇮🇳','Agriculture & Food':'🌾',
  'Health & Medicine':'🏥','Computer & IT':'💻','Constitution':'📜',
  'Railways & Transport':'🚆','Energy & Power':'⚡',
  'General':'📌','Announcements':'📢'
};

// Group questions by category → subject → subSubject
const tree = {};
allQuestions.forEach(q => {
  const c = q.category || 'Misc';
  const s = q.subject || 'General';
  const ss = q.subSubject || 'General';
  if (!tree[c]) tree[c] = {};
  if (!tree[c][s]) tree[c][s] = {};
  if (!tree[c][s][ss]) tree[c][s][ss] = [];
  tree[c][s][ss].push(q);
});

// Merge Indian Current Affairs into Current Affairs
if (tree['Indian Current Affairs']) {
  if (!tree['Current Affairs']) tree['Current Affairs'] = {};
  var icaSubjects = tree['Indian Current Affairs'];
  Object.keys(icaSubjects).forEach(function(s) {
    if (!tree['Current Affairs'][s]) tree['Current Affairs'][s] = {};
    Object.keys(icaSubjects[s]).forEach(function(ss) {
      if (!tree['Current Affairs'][s][ss]) tree['Current Affairs'][s][ss] = [];
      tree['Current Affairs'][s][ss] = tree['Current Affairs'][s][ss].concat(icaSubjects[s][ss]);
    });
  });
  delete tree['Indian Current Affairs'];
}
// Merge Current Events into Current Affairs
if (tree['Current Events']) {
  if (!tree['Current Affairs']) tree['Current Affairs'] = {};
  var ceSubjects = tree['Current Events'];
  Object.keys(ceSubjects).forEach(function(s) {
    if (!tree['Current Affairs'][s]) tree['Current Affairs'][s] = {};
    Object.keys(ceSubjects[s]).forEach(function(ss) {
      if (!tree['Current Affairs'][s][ss]) tree['Current Affairs'][s][ss] = [];
      tree['Current Affairs'][s][ss] = tree['Current Affairs'][s][ss].concat(ceSubjects[s][ss]);
    });
  });
  delete tree['Current Events'];
}

const sortedCats = Object.keys(tree).sort();

// ── Write per-category JSON files ──
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const catIndex = [];
sortedCats.forEach(c => {
  const subs = tree[c];
  const subjList = [];
  const totalQ = Object.keys(subs).reduce((sum, s) => {
    const ssList = subs[s];
    const sTotal = Object.values(ssList).reduce((a, qs) => a + qs.length, 0);
    const subSubs = Object.keys(ssList).map(ss => ({ name: ss, count: ssList[ss].length }));
    subjList.push({ name: s, total: sTotal, subSubjects: subSubs });
    return sum + sTotal;
  }, 0);

  // Per-category file: { subjects: { "Subject": { subSubjects: { "SubSub": [...questions] } } } }
  const catFile = {};
  Object.keys(subs).forEach(s => {
    catFile[s] = { subSubjects: {} };
    Object.keys(subs[s]).forEach(ss => {
      catFile[s].subSubjects[ss] = subs[s][ss];
    });
  });

  const FILE_OVERRIDE = { 'PIB': 'pib-archive' };
  const baseName = FILE_OVERRIDE[c] || c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filePaths = [];
  const MAX_BYTES = 24 * 1024 * 1024;

  // Flatten to per-subSubject chunks and split if too large
  function writeSubjPart(subjList, partIndex) {
    const partFile = {};
    subjList.forEach(function(entry) {
      const s = entry.subject, ss = entry.subSubject, qs = entry.questions;
      if (!partFile[s]) partFile[s] = { subSubjects: {} };
      partFile[s].subSubjects[ss] = qs;
    });
    const partName = baseName + (partIndex > 0 ? '-' + (partIndex + 1) : '') + '.json';
    const partJson = JSON.stringify(partFile);
    const partSizeMb = (Buffer.byteLength(partJson) / 1024 / 1024).toFixed(1);
    fs.writeFileSync(path.join(outDir, partName), partJson);
    filePaths.push('data/questions/' + partName);
    console.log('  Part ' + (partIndex + 1) + ': ' + partName + ' (' + partSizeMb + ' MiB)');
  }

  if (Buffer.byteLength(JSON.stringify(catFile)) > MAX_BYTES) {
    // Split by subSubject: each entry = {subject, subSubject, questions}
    var splitEntries = [];
    Object.keys(subs).forEach(function(s) {
      Object.keys(subs[s]).forEach(function(ss) {
        splitEntries.push({ subject: s, subSubject: ss, questions: subs[s][ss] });
      });
    });
    var chunk = [], chunkBytes = 0;
    var partIdx = 0;
    console.log('Large category: ' + c + ' (' + totalQ + ' q, ' + splitEntries.length + ' sub-topics, splitting...)');
    splitEntries.forEach(function(entry, i) {
      var entryBytes = Buffer.byteLength(JSON.stringify(entry.questions));
      if (chunk.length > 0 && chunkBytes + entryBytes > MAX_BYTES) {
        writeSubjPart(chunk, partIdx++);
        chunk = []; chunkBytes = 0;
      }
      chunk.push(entry);
      chunkBytes += entryBytes;
    });
    if (chunk.length > 0) writeSubjPart(chunk, partIdx);
  } else {
    writeSubjPart(Object.keys(subs).reduce(function(acc, s) {
      Object.keys(subs[s]).forEach(function(ss) {
        acc.push({ subject: s, subSubject: ss, questions: subs[s][ss] });
      });
      return acc;
    }, []), 0);
  }

  catIndex.push({
    name: c,
    total: totalQ,
    icon: CAT_ICONS[c] || '📌',
    file: filePaths.length === 1 ? filePaths[0] : filePaths,
    subjects: subjList
  });
});

// ── Generate archive.html ──
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderQuestion(q, idx) {
  const catTag = '<span class="tag cat-tag">' + esc(q.category) + '</span>';
  const date = q.pubDate ? new Date(q.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const dateTag = date ? '<span class="tag date-tag">' + date + '</span>' : '';
  return '<div class="q-item">'
    + '<div class="q-num">#' + (idx + 1) + '</div>'
    + '<div class="q-tags">' + catTag + dateTag + '</div>'
    + '<div class="q-question">' + esc(q.question) + '</div>'
    + '<div class="q-answer"><span class="a-label">Answer:</span> <span class="a-value">' + esc(q.answer) + '</span></div>'
    + (q.fact ? '<button class="explain-btn" onclick="toggleExplain(this)">📖 Explanation</button><div class="q-explain">' + esc(q.fact) + '</div>' : '')
    + '</div>';
}

const CAT_INDEX_JSON = JSON.stringify(catIndex);

let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>GK Current Affairs Archive — vlymbooq</title>\n<meta name="description" content="Complete archive of ' + allQuestions.length + ' GK & Current Affairs questions with explanations. Free practice for competitive exams. Browse by subject tree.">\n<link rel="icon" type="image/svg+xml" href="favicon.svg">\n<link rel="icon" type="image/png" href="logo.png">\n<link rel="stylesheet" href="css/style.css">\n<style>\n@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap\');\n*{margin:0;padding:0;box-sizing:border-box}\n:root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--border-hover:rgba(255,255,255,.1);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--red:#ef4444;--amber:#f59e0b;--cyan:#22d3ee;--radius:12px;--radius-lg:16px}\nbody{font-family:\'Inter\',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\na{color:var(--text);text-decoration:none}\n.nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n.nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.brand{display:flex;align-items:center;gap:8px}\n.brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n.nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:var(--text-sec);white-space:nowrap}\n.nav-links a.active,.nav-links a:hover{background:rgba(167,139,250,.1);color:var(--purple)}\n.page-wrap{display:flex;max-width:1100px;margin:0 auto;padding:24px;gap:24px}\n.sidebar{width:280px;flex-shrink:0;position:sticky;top:80px;align-self:flex-start;max-height:calc(100vh - 96px);overflow-y:auto;scrollbar-width:thin}\n.sidebar-title{font-size:.8em;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px}\n.sidebar-cat{margin-bottom:2px}\n.sidebar-link,.sidebar-subj-link,.sidebar-subsub-link{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-radius:8px;font-size:.85em;color:var(--text-sec);cursor:pointer}\n.sidebar-link.active,.sidebar-subj-link.active,.sidebar-subsub-link.active{background:rgba(167,139,250,.12);color:var(--text)}\n.sidebar-icon{margin-right:6px}\n.sidebar-count{font-size:.78em;color:var(--text-muted);padding:1px 6px;border-radius:4px;background:var(--bg-card)}\n.sidebar-subjects{display:none;margin-left:12px}\n.sidebar-subjects.open{display:block}\n.sidebar-subj-link{padding:4px 10px;font-size:.82em}\n.sidebar-subsubs{display:none;margin-left:12px}\n.sidebar-subsubs.open{display:block}\n.sidebar-subsub-link{padding:3px 8px;font-size:.78em}\n.main-content{flex:1;min-width:0}\n.breadcrumb{font-size:.85em;color:var(--text-muted);margin-bottom:20px}\n.breadcrumb span{color:var(--text-sec)}\n.breadcrumb .current{color:var(--text)}\n.page-title{font-size:1.6em;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}\n.page-sub{color:var(--text-sec);font-size:.9em;margin-bottom:24px}\n.loading{text-align:center;padding:40px;color:var(--text-muted)}\n.search-bar{position:relative;margin-bottom:20px}.search-bar input{width:100%;padding:12px 16px;border-radius:100px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:.9em;outline:none;font-family:inherit;transition:border-color .2s}.search-bar input:focus{border-color:var(--purple)}.search-bar input::placeholder{color:var(--text-muted)}.search-results-info{font-size:.85em;color:var(--text-sec);margin-bottom:16px;padding:8px 0}.search-no-results{text-align:center;padding:40px;color:var(--text-muted)}\n.subj-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;display:block}\n.subj-card:hover{background:var(--bg-hover);border-color:var(--border-hover)}\n.subj-card-name{font-weight:600;font-size:.95em;margin-bottom:4px}\n.subj-card-count{font-size:.8em;color:var(--text-muted);margin-bottom:8px}\n.subj-card-preview{font-size:.75em;color:var(--text-muted);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}\n.question-list{display:flex;flex-direction:column;gap:12px}\n.q-item{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px}\n.q-item:hover{background:var(--bg-hover)}\n.q-num{font-size:.75em;color:var(--text-muted);margin-bottom:4px}\n.q-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}\n.tag{font-size:.7em;padding:2px 8px;border-radius:100px;font-weight:500}\n.cat-tag{background:rgba(167,139,250,.12);color:var(--purple)}\n.date-tag{background:rgba(34,211,238,.08);color:var(--cyan)}\n.q-question{font-size:.95em;font-weight:500;margin-bottom:8px;line-height:1.6}\n.q-answer{font-size:.85em;margin-bottom:6px}\n.a-label{color:var(--text-muted)}\n.a-value{color:var(--emerald);font-weight:600}\n.explain-btn{background:transparent;border:1px solid var(--border);color:var(--text-sec);padding:5px 12px;border-radius:100px;cursor:pointer;font-size:.78em}\n.explain-btn:hover{background:var(--bg-hover);border-color:var(--border-hover)}\n.q-explain{background:rgba(167,139,250,.05);border-radius:8px;padding:12px;margin-top:8px;font-size:.82em;color:var(--text-sec);line-height:1.7;display:none}\n.q-explain.show{display:block}\n@media(max-width:768px){.sidebar{display:none}.page-wrap{padding:16px;flex-direction:column}}\n<\/style>\n</head>\n<body>\n';

html += '<nav class="nav"><div class="nav-inner"><div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple)"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"\/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\/><\/svg><span class="brand-text">vlymbooq<\/span><\/div><div class="nav-links"><a href="index.html">Home<\/a><a href="current-affairs.html">Quiz<\/a><a href="dashboard.html">Dashboard<\/a><a class="active" href="archive.html">Archive<\/a><a href="about.html">About<\/a><\/div><\/div><\/nav>';

html += '<div class="page-wrap"><aside class="sidebar"><div class="sidebar-title">Categories</div>';

catIndex.forEach((c, ci) => {
  html += '<div class="sidebar-cat">';
  html += '<a href="#" class="sidebar-link" data-ci="' + ci + '" onclick="return selectCategory(' + ci + ')">';
  html += '<span class="sidebar-icon">' + c.icon + '</span><span class="sidebar-label">' + esc(c.name) + '</span>';
  html += '<span class="sidebar-count">' + c.total + '</span></a>';
  html += '<div class="sidebar-subjects" id="subj-' + ci + '">';
  c.subjects.forEach((subj, si) => {
    html += '<a href="#" class="sidebar-subj-link" data-ci="' + ci + '" data-si="' + si + '" onclick="return selectSubject(' + ci + ',' + si + ')">';
    html += '<span class="sidebar-label">' + esc(subj.name) + '</span>';
    html += '<span class="sidebar-count">' + subj.total + '</span></a>';
    html += '<div class="sidebar-subsubs" id="ss-' + ci + '-' + si + '">';
    subj.subSubjects.forEach((ss, ssi) => {
      html += '<a href="#" class="sidebar-subsub-link" data-ci="' + ci + '" data-si="' + si + '" data-ssi="' + ssi + '" onclick="return selectSubSubject(' + ci + ',' + si + ',' + ssi + ')">';
      html += '<span class="sidebar-label">' + esc(ss.name) + '</span>';
      html += '<span class="sidebar-count">' + ss.count + '</span></a>';
    });
    html += '</div>';
  });
  html += '</div></div>';
});

html += '</aside><main class="main-content">';
html += '<div class="search-bar"><input type="text" id="searchInput" placeholder="Search questions..." oninput="onSearchInput(this.value)" autocomplete="off"></div>';
html += '<div class="breadcrumb" id="breadcrumb">Archive</div>';

// Welcome view
html += '<div class="content-panel" id="view-welcome">';
html += '<h1 class="page-title">📚 GK Current Affairs Archive</h1>';
html += '<p class="page-sub">' + allQuestions.length + ' questions across ' + sortedCats.length + ' categories. Click a category to browse.</p>';
html += '<div class="subj-grid">';
catIndex.forEach((c, ci) => {
  html += '<a href="#" class="subj-card" onclick="return selectCategory(' + ci + ')">';
  html += '<div class="subj-card-name">' + c.icon + ' ' + esc(c.name) + '</div>';
  html += '<div class="subj-card-count">' + c.total + ' questions</div></a>';
});
html += '</div></div>';

// Content panel
html += '<div class="content-panel" id="view-content" style="display:none"></div>';
html += '</main></div>';

// Inline JS
html += '<script>\nvar CAT_INDEX = ' + CAT_INDEX_JSON + ';\n';
html += 'var _cache = {};\n';
html += 'var _currentCat = null, _currentSubj = null, _currentSubSub = null;\n';

html += 'function toggleExplain(btn) {\n  var e = btn.nextElementSibling;\n  e.classList.toggle(\'show\');\n  btn.textContent = e.classList.contains(\'show\') ? \'📘 Hide\' : \'📖 Explanation\';\n}\n';

html += 'function selectCategory(ci) {\n';
html += '  _currentSubj = _currentSubSub = null;\n';
html += '  var c = CAT_INDEX[ci];\n';
html += '  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  var link = document.querySelector(\'.sidebar-link[data-ci="\' + ci + \'"]\');\n';
html += '  if(link) link.classList.add(\'active\');\n';
html += '  var subjs = document.getElementById(\'subj-\' + ci);\n';
html += '  if(subjs) subjs.classList.add(\'open\');\n';
html += '  document.getElementById(\'breadcrumb\').innerHTML = \'<span class="current">\' + escHtml(c.name) + \'</span>\';\n';
html += '  showCategory(ci);\n';
html += '  return false;\n}\n';

html += 'function showCategory(ci) {\n';
html += '  var c = CAT_INDEX[ci];\n';
html += '  _currentCat = ci;\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  panel.style.display = \'block\';\n';
html += '  document.getElementById(\'view-welcome\').style.display = \'none\';\n';
html += '  panel.innerHTML = \'<h2 class="page-title">\' + c.icon + \' \' + escHtml(c.name) + \'</h2><p class="page-sub">Choose a topic:</p><div class="subj-grid">\';\n';
html += '  c.subjects.forEach(function(subj, si) {\n';
html += '    var preview = subj.subSubjects.slice(0, 3).map(function(s){return escHtml(s.name)}).join(\'<br>\');\n';
html += '    panel.innerHTML += \'<a href="#" class="subj-card" onclick="return selectSubject(\' + ci + \',\' + si + \')"><div class="subj-card-name">\' + escHtml(subj.name) + \'</div><div class="subj-card-count">\' + subj.total + \' questions</div><div class="subj-card-preview">\' + preview + \'</div></a>\';\n';
html += '  });\n';
html += '  panel.innerHTML += \'</div>\';\n';
html += '  panel.scrollTop = 0;\n';
html += '  window.scrollTo(0, 0);\n';
html += '}\n';

html += 'function selectSubject(ci, si) {\n';
html += '  _currentSubSub = null;\n';
html += '  var c = CAT_INDEX[ci], subj = c.subjects[si];\n';
html += '  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  var link = document.querySelector(\'.sidebar-link[data-ci="\' + ci + \'"]\');\n';
html += '  if(link) link.classList.add(\'active\');\n';
html += '  var subjs = document.getElementById(\'subj-\' + ci);\n';
html += '  if(subjs) subjs.classList.add(\'open\');\n';
html += '  var subjLink = document.querySelector(\'.sidebar-subj-link[data-ci="\' + ci + \'"][data-si="\' + si + \'"]\');\n';
html += '  if(subjLink) subjLink.classList.add(\'active\');\n';
html += '  var ssEl = document.getElementById(\'ss-\' + ci + \'-\' + si);\n';
html += '  if(ssEl) ssEl.classList.add(\'open\');\n';
html += '  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return selectCategory(\' + ci + \')">\' + escHtml(c.name) + \'</a> <span class="sep">›</span> <span class="current">\' + escHtml(subj.name) + \'</span>\';\n';
html += '  _currentCat = ci; _currentSubj = si;\n';
html += '  showSubject(ci, si);\n';
html += '  return false;\n}\n';

html += 'function showSubject(ci, si) {\n';
html += '  var c = CAT_INDEX[ci], subj = c.subjects[si];\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  panel.style.display = \'block\';\n';
html += '  document.getElementById(\'view-welcome\').style.display = \'none\';\n';
html += '  panel.innerHTML = \'<h2 class="page-title">\' + c.icon + \' \' + escHtml(subj.name) + \'</h2><p class="page-sub">\' + escHtml(c.name) + \' — choose a sub-topic:</p><div class="subj-grid">\';\n';
html += '  subj.subSubjects.forEach(function(ss, ssi) {\n';
html += '    panel.innerHTML += \'<a href="#" class="subj-card" onclick="return selectSubSubject(\' + ci + \',\' + si + \',\' + ssi + \')"><div class="subj-card-name">\' + escHtml(ss.name) + \'</div><div class="subj-card-count">\' + ss.count + \' questions</div></a>\';\n';
html += '  });\n';
html += '  panel.innerHTML += \'</div>\';\n';
html += '  window.scrollTo(0, 0);\n';
html += '}\n';

html += 'function selectSubSubject(ci, si, ssi) {\n';
html += '  var c = CAT_INDEX[ci], subj = c.subjects[si], ss = subj.subSubjects[ssi];\n';
html += '  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n';
html += '  var link = document.querySelector(\'.sidebar-link[data-ci="\' + ci + \'"]\');\n';
html += '  if(link) link.classList.add(\'active\');\n';
html += '  var subjs = document.getElementById(\'subj-\' + ci);\n';
html += '  if(subjs) subjs.classList.add(\'open\');\n';
html += '  var subjLink = document.querySelector(\'.sidebar-subj-link[data-ci="\' + ci + \'"][data-si="\' + si + \'"]\');\n';
html += '  if(subjLink) subjLink.classList.add(\'active\');\n';
html += '  var ssEl = document.getElementById(\'ss-\' + ci + \'-\' + si);\n';
html += '  if(ssEl) ssEl.classList.add(\'open\');\n';
html += '  var ssLink = document.querySelector(\'.sidebar-subsub-link[data-ci="\' + ci + \'"][data-si="\' + si + \'"][data-ssi="\' + ssi + \'"]\');\n';
html += '  if(ssLink) ssLink.classList.add(\'active\');\n';
html += '  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return selectCategory(\' + ci + \')">\' + escHtml(c.name) + \'</a> <span class="sep">›</span> <a href="#" onclick="return selectSubject(\' + ci + \',\' + si + \')">\' + escHtml(subj.name) + \'</a> <span class="sep">›</span> <span class="current">\' + escHtml(ss.name) + \'</span>\';\n';
html += '  _currentCat = ci; _currentSubj = si; _currentSubSub = ssi;\n';
html += '  renderQuestions(ci, si, ssi);\n';
html += '  return false;\n}\n';

html += 'function renderQuestions(ci, si, ssi) {\n';
html += '  var subj = CAT_INDEX[ci].subjects[si], ss = subj.subSubjects[ssi];\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  panel.style.display = \'block\';\n';
html += '  document.getElementById(\'view-welcome\').style.display = \'none\';\n';
html += '  panel.innerHTML = \'<div class="loading">Loading questions...</div>\';\n';
html += '  loadCategory(ci, function() {\n';
html += '    var data = _cache[ci];\n';
html += '    var qs = data[subj.name] && data[subj.name].subSubjects && data[subj.name].subSubjects[ss.name];\n';
html += '    if (!qs) { panel.innerHTML = \'<div class="loading">No questions found.</div>\'; return; }\n';
html += '    var h = \'<h2 class="page-title">\' + CAT_INDEX[ci].icon + \' \' + escHtml(ss.name) + \'</h2>\';\n';
html += '    h += \'<p class="page-sub">\' + escHtml(subj.name) + \' — \' + escHtml(CAT_INDEX[ci].name) + \'</p>\';\n';
html += '    h += \'<div class="question-list">\';\n';
html += '    qs.forEach(function(q, qi) { h += renderQuestionItem(q, qi); });\n';
html += '    h += \'</div>\';\n';
html += '    panel.innerHTML = h;\n';
html += '    window.scrollTo(0, 0);\n';
html += '  });\n';
html += '}\n';

html += 'function loadCategory(ci, cb) {\n';
html += '  if (_cache[ci]) { cb(); return; }\n';
html += '  var files = CAT_INDEX[ci].file;\n';
html += '  if (!Array.isArray(files)) files = [files];\n';
html += '  var merged = {};\n';
html += '  var loaded = 0;\n';
html += '  files.forEach(function(url, fi) {\n';
html += '    var xhr = new XMLHttpRequest();\n';
html += '    xhr.onload = function() {\n';
html += '      if (xhr.status !== 200) { _cache[ci] = {}; cb(); return; }\n';
html += '      var data;\n';
html += '      try { data = JSON.parse(xhr.responseText); } catch(e) { _cache[ci] = {}; cb(); return; }\n';
html += '      for (var sk in data) {\n';
html += '        if (!merged[sk]) merged[sk] = { subSubjects: {} };\n';
html += '        var ss = data[sk].subSubjects;\n';
html += '        for (var ssk in ss) {\n';
html += '          if (ssk === \'__proto__\' || ssk === \'constructor\') continue;\n';
html += '          if (!merged[sk].subSubjects[ssk]) merged[sk].subSubjects[ssk] = [];\n';
html += '          merged[sk].subSubjects[ssk] = merged[sk].subSubjects[ssk].concat(ss[ssk]);\n';
html += '        }\n';
html += '      }\n';
html += '      loaded++;\n';
html += '      if (loaded === files.length) {\n';
html += '        var allKeys = Object.keys(merged);\n';
html += '        if (allKeys.length > 1) {\n';
html += '          var targetKey = CAT_INDEX[ci].subjects[0].name;\n';
html += '          if (!merged[targetKey]) merged[targetKey] = { subSubjects: {} };\n';
html += '          for (var ki = 0; ki < allKeys.length; ki++) {\n';
html += '            if (allKeys[ki] === targetKey) continue;\n';
html += '            var otherSS = merged[allKeys[ki]].subSubjects;\n';
html += '            for (var ssk2 in otherSS) {\n';
html += '              if (ssk2 === \'__proto__\' || ssk2 === \'constructor\') continue;\n';
html += '              if (!merged[targetKey].subSubjects[ssk2]) merged[targetKey].subSubjects[ssk2] = [];\n';
html += '              merged[targetKey].subSubjects[ssk2] = merged[targetKey].subSubjects[ssk2].concat(otherSS[ssk2]);\n';
html += '            }\n';
html += '          }\n';
html += '        }\n';
html += '        _cache[ci] = merged; cb();\n';
html += '      }\n';
html += '    };\n';
html += '    xhr.onerror = function() { _cache[ci] = {}; cb(); };\n';
html += '    xhr.open(\'GET\', url, true);\n';
html += '    xhr.send();\n';
html += '  });\n';
html += '}\n';

html += 'function renderQuestionItem(q, i) {\n';
html += '  var date = q.pubDate ? new Date(q.pubDate).toLocaleDateString(\'en-IN\',{day:\'numeric\',month:\'short\',year:\'numeric\'}) : \'\';\n';
html += '  return \'<div class="q-item"><div class="q-num">#\' + (i+1) + \'</div>\'\n';
html += '    + \'<div class="q-tags"><span class="tag cat-tag">\' + escHtml(q.category) + \'</span>\'\n';
html += '    + (date ? \'<span class="tag date-tag">\' + date + \'</span>\' : \'\') + \'</div>\'\n';
html += '    + \'<div class="q-question">\' + escHtml(q.question) + \'</div>\'\n';
html += '    + \'<div class="q-answer"><span class="a-label">Answer:</span> <span class="a-value">\' + escHtml(q.answer) + \'</span></div>\'\n';
html += '    + (q.fact ? \'<button class="explain-btn" onclick="toggleExplain(this)">📖 Explanation</button><div class="q-explain">\' + escHtml(q.fact) + \'</div>\' : \'\') + \'</div>\';\n';
html += '}\n';

html += 'function escHtml(s) {\n  if(!s) return \'\';\n  return String(s).replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\');\n}\n';

html += 'var _searchTimer = null;\n';
html += 'function onSearchInput(val) {\n';
html += '  clearTimeout(_searchTimer);\n';
html += '  _searchTimer = setTimeout(function(){ doSearch(val); }, 250);\n';
html += '}\n';

html += 'function doSearch(query) {\n';
html += '  query = query.trim().toLowerCase();\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  var welcome = document.getElementById(\'view-welcome\');\n';
html += '  if (!query) {\n';
html += '    if (_currentCat !== null) {\n';
html += '      if (_currentSubSub !== null) { renderQuestions(_currentCat, _currentSubj, _currentSubSub); }\n';
html += '      else if (_currentSubj !== null) { showSubject(_currentCat, _currentSubj); }\n';
html += '      else { showCategory(_currentCat); }\n';
html += '    } else {\n';
html += '      welcome.style.display = \'block\';\n';
html += '      panel.style.display = \'none\';\n';
html += '    }\n';
html += '    return;\n';
html += '  }\n';
html += '  welcome.style.display = \'none\';\n';
html += '  panel.style.display = \'block\';\n';
html += '  panel.innerHTML = \'<div class="loading">Searching...</div>\';\n';
html += '  var results = [];\n';
html += '  var pending = [];\n';
html += '  for (var ci = 0; ci < CAT_INDEX.length; ci++) {\n';
html += '    if (_cache[ci]) { searchInCategory(ci, query, results); }\n';
html += '    else { pending.push(ci); }\n';
html += '  }\n';
html += '  if (pending.length === 0) { showSearchResults(query, results); return; }\n';
html += '  var left = pending.length;\n';
html += '  pending.forEach(function(ci) {\n';
html += '    loadCategory(ci, function() { searchInCategory(ci, query, results); left--; if (left === 0) showSearchResults(query, results); });\n';
html += '  });\n';
html += '}\n';

html += 'function searchInCategory(ci, query, results) {\n';
html += '  var data = _cache[ci];\n';
html += '  var c = CAT_INDEX[ci];\n';
html += '  var words = query.toLowerCase().split(/\\s+/);\n';
html += '  for (var sk in data) {\n';
html += '    var subj = data[sk];\n';
html += '    if (!subj.subSubjects) continue;\n';
html += '    for (var ssk in subj.subSubjects) {\n';
html += '      subj.subSubjects[ssk].forEach(function(q) {\n';
html += '        var haystack = ((q.question||\'\') + \' \' + (q.answer||\'\') + \' \' + (q.fact||\'\')).toLowerCase();\n';
html += '        for (var wi = 0; wi < words.length; wi++) {\n';
html += '          if (haystack.indexOf(words[wi]) === -1) return;\n';
html += '        }\n';
html += '        results.push({category:c.name,icon:c.icon,subject:sk,subSubject:ssk,question:q});\n';
html += '      });\n';
html += '    }\n';
html += '  }\n';
html += '}\n';

html += 'function showSearchResults(query, results) {\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  if (results.length === 0) {\n';
html += '    panel.innerHTML = \'<div class="search-no-results">No questions matching "<strong>\' + escHtml(query) + \'</strong>"</div>\';\n';
html += '    return;\n';
html += '  }\n';
html += '  var h = \'<div class="search-results-info">Found <strong>\' + results.length + \'</strong> result\' + (results.length>1?\'s\':\'\') + \' for "\' + escHtml(query) + \'"</div>\';\n';
html += '  h += \'<div class="question-list">\';\n';
html += '  results.forEach(function(r) {\n';
html += '    var q = r.question;\n';
html += '    var date = q.pubDate ? new Date(q.pubDate).toLocaleDateString(\'en-IN\',{day:\'numeric\',month:\'short\',year:\'numeric\'}) : \'\';\n';
html += '    h += \'<div class="q-item"><div class="q-tags"><span class="tag cat-tag">\' + escHtml(r.category) + \' &rsaquo; \' + escHtml(r.subject) + \' &rsaquo; \' + escHtml(r.subSubject) + \'</span>\' + (date?\'<span class="tag date-tag">\'+date+\'</span>\':\'\') + \'</div>\';\n';
html += '    h += \'<div class="q-question">\' + escHtml(q.question) + \'</div>\';\n';
html += '    h += \'<div class="q-answer"><span class="a-label">Answer:</span> <span class="a-value">\' + escHtml(q.answer) + \'</span></div>\';\n';
html += '    h += (q.fact ? \'<button class="explain-btn" onclick="toggleExplain(this)">📖 Explanation</button><div class="q-explain">\' + escHtml(q.fact) + \'</div>\' : \'\') + \'</div>\';\n';
html += '  });\n';
html += '  h += \'</div>\';\n';
html += '  panel.innerHTML = h;\n';
html += '  window.scrollTo(0, 0);\n';
html += '}\n';

html += '<\/script><script>if(\'serviceWorker\' in navigator){navigator.serviceWorker.register(\'/sw.js\').catch(function(){})}<\/script>\n';
html += '<\/body>\n<\/html>';

fs.writeFileSync(archivePath, html);
const sizeMb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
console.log('\nWrote archive.html (' + sizeMb + ' MiB) - single page with lazy-load');

// Write manifest listing all category files (for Cloudflare Function)
const manifestPath = path.join(outDir, 'manifest.json');
const manifestFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestFiles));
console.log('Wrote manifest.json with ' + manifestFiles.length + ' files');

console.log('Done: ' + catIndex.length + ' category files in data/questions/');

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'data', 'questions');
const archivePath = path.join(__dirname, '..', 'archive.html');

// ── Repair mojibake (UTF-8 bytes misread as Windows-1252) for dedup keys ──
const WIN1252_REV = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};
function normEnc(s) {
  if (!s || typeof s !== 'string') return s;
  if (!/[\u0080-\u00FF]/.test(s)) return s;
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c <= 0xFF) { bytes.push(c); continue; }
    const b = WIN1252_REV[c];
    if (b === undefined) return s;
    bytes.push(b);
  }
  const fixed = Buffer.from(bytes).toString('utf8');
  return fixed.indexOf('\uFFFD') >= 0 ? s : fixed;
}

// ── Read all questions from per-category files ──
const allQuestions = [];
const seen = new Set();
let totalRaw = 0;
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'archive-cat-index.json');
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
    for (const [, subjData] of Object.entries(data)) {
      if (subjData && subjData.subSubjects) {
        for (const [, qs] of Object.entries(subjData.subSubjects)) {
          for (const q of qs) {
            totalRaw++;
            const key = normEnc(((q.question || '') + '||' + (q.answer || '')).toLowerCase().replace(/\s+/g, ' ').trim());
            if (!seen.has(key)) {
              seen.add(key);
              allQuestions.push(q);
            }
          }
        }
      }
    }
  } catch {}
}
const deduped = allQuestions.length;
console.log('Per-category files: ' + deduped + ' / ' + totalRaw + ' unique (removed ' + (totalRaw - deduped) + ' duplicates)');

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
  'General':'📌','Announcements':'📢',
  'Indian Railways':'🚆','Indian Cinema':'🎬','Cyber Security':'🛡️',
  'SDGs & Development':'🎯','Indian Tribes':'👥',
  'Statistics & Mathematics':'📊','Geology & Hydrogeology':'💧',
  'Library & Information Science':'📚','Engineering & Technical':'🔧'
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

// Merge Indian Current Affairs into Current Affairs subject (not as separate subject)
if (tree['Indian Current Affairs']) {
  if (!tree['Current Affairs']) tree['Current Affairs'] = {};
  if (!tree['Current Affairs']['Current Affairs']) tree['Current Affairs']['Current Affairs'] = {};
  var icaSubjects = tree['Indian Current Affairs'];
  Object.keys(icaSubjects).forEach(function(s) {
    Object.keys(icaSubjects[s]).forEach(function(ss) {
      if (!tree['Current Affairs']['Current Affairs'][ss]) tree['Current Affairs']['Current Affairs'][ss] = [];
      tree['Current Affairs']['Current Affairs'][ss] = tree['Current Affairs']['Current Affairs'][ss].concat(icaSubjects[s][ss]);
    });
  });
  delete tree['Indian Current Affairs'];
}
// Also merge subject 'Indian Current Affairs' inside Current Affairs (e.g. July 2026 has category:'Current Affairs' but subject:'Indian Current Affairs')
if (tree['Current Affairs'] && tree['Current Affairs']['Indian Current Affairs']) {
  if (!tree['Current Affairs']['Current Affairs']) tree['Current Affairs']['Current Affairs'] = {};
  var icaSubj = tree['Current Affairs']['Indian Current Affairs'];
  Object.keys(icaSubj).forEach(function(ss) {
    if (!tree['Current Affairs']['Current Affairs'][ss]) tree['Current Affairs']['Current Affairs'][ss] = [];
    tree['Current Affairs']['Current Affairs'][ss] = tree['Current Affairs']['Current Affairs'][ss].concat(icaSubj[ss]);
  });
  delete tree['Current Affairs']['Indian Current Affairs'];
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
// NOTE: stale file removal is deferred until after every part has been written,
// so an interrupted build can never wipe the archive (old parts stay put until
// superseded; only leftovers of removed/merged categories are cleaned at the end).

const catIndex = [];
const expectedFiles = new Set(['catalog.json']);
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
  const MAX_BYTES = 8 * 1024 * 1024;

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
    expectedFiles.add(partName);
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
    // Sort deterministically so the 8 MiB chunk seam is stable across runs.
    // Insertion order is arbitrary and drifts as question counts change, which
    // would otherwise cascade whole ranges of sub-topics between part files
    // every run (churning category keys, timeline node ids and map diffs).
    splitEntries.sort(function(a, b) {
      var ka = (a.subject + '\u0000' + a.subSubject).toLowerCase();
      var kb = (b.subject + '\u0000' + b.subSubject).toLowerCase();
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
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

// Remove only stale leftovers (categories merged/renamed since the last build),
// now that every new part file is safely on disk.
fs.readdirSync(outDir).filter(f => f.endsWith('.json') && f !== 'manifest.json').forEach(f => {
  if (!expectedFiles.has(f)) { try { fs.unlinkSync(path.join(outDir, f)); } catch {} }
});

// ── Write lightweight subject catalog (fast topic picker for current-affairs.html) ──
const catalog = { total: deduped, subjects: {} };
const subjectFiles = {};
fs.readdirSync(outDir).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'catalog.json').forEach(f => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
    for (const sk in data) {
      if (!data[sk] || !data[sk].subSubjects) continue;
      let n = 0;
      for (const ssk in data[sk].subSubjects) n += (data[sk].subSubjects[ssk] || []).length;
      catalog.subjects[sk] = (catalog.subjects[sk] || 0) + n;
      (subjectFiles[sk] = subjectFiles[sk] || []).push('data/questions/' + f);
    }
  } catch {}
});
fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(catalog));
console.log('Wrote catalog.json: ' + Object.keys(catalog.subjects).length + ' subjects, ' + deduped + ' total');

// ── Inline catalog + archive file list + subject→file map into current-affairs.html (file:// safe) ──
// Scans the existing `var NAME = <literal>;` declarations and rewrites them, so the page always
// ships the freshest topic counts and file lists regardless of leftover inline state.
function replaceDecl(src, declName, newValue) {
  const prefix = 'var ' + declName + ' = ';
  const start = src.indexOf(prefix);
  if (start === -1) return null;
  const open = start + prefix.length;
  let end = -1;
  if (src.startsWith('/*', open)) {
    const cEnd = src.indexOf('*/', open);
    if (cEnd === -1) return null;
    const semi = src.indexOf(';', cEnd);
    if (semi === -1) return null;
    const end = semi;
    return src.slice(0, start) + prefix + newValue + src.slice(end + 1).replace(/^;+/, '');
  }
  const ch = src[open];
  if (ch !== '{' && ch !== '[') return null;
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === ch) depth++;
    else if ((ch === '{' && src[k] === '}') || (ch === '[' && src[k] === ']')) { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  if (end === -1) return null;
  return src.slice(0, start) + prefix + newValue + src.slice(end).replace(/^;+/, ';');
}

try {
  const caPath = path.join(__dirname, '..', 'current-affairs.html');
  let ca = fs.readFileSync(caPath, 'utf8');

  let nxt = replaceDecl(ca, 'HOME_CATALOG', JSON.stringify(catalog));
  if (nxt === null) { console.log('WARN: HOME_CATALOG decl not found in current-affairs.html — skipping catalog inline.'); }
  else ca = nxt;

  const archiveFiles = fs.readdirSync(outDir)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'catalog.json')
    .sort();
  const archiveList = archiveFiles.map(f => "{file:'data/questions/" + f + "'}").join(',');
  nxt = replaceDecl(ca, 'CAT_ARCHIVE', '[' + archiveList + ']');
  if (nxt === null) { console.log('WARN: CAT_ARCHIVE decl not found in current-affairs.html — skipping archive inline.'); }
  else ca = nxt;

  nxt = replaceDecl(ca, 'SUBJECT_FILES', JSON.stringify(subjectFiles));
  if (nxt === null) { console.log('WARN: SUBJECT_FILES decl not found in current-affairs.html — skipping subject map inline.'); }
  else ca = nxt;

  fs.writeFileSync(caPath, ca);
  console.log('Inlined HOME_CATALOG/CAT_ARCHIVE/SUBJECT_FILES into current-affairs.html (' + Object.keys(catalog.subjects).length + ' subjects, ' + archiveFiles.length + ' files).');
} catch (e) {
  console.log('WARN: could not inline catalog into current-affairs.html: ' + e.message);
}

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

// The category tree (98 categories, ~240k sub-topic leaves, ~10.6 MB of JSON) is
// no longer baked inline into archive.html — that single blob was the entire
// reason archive.html ballooned past 8 MB. It is written out as a separate
// archive-cat-index.json that the page fetches on demand (see loadIndex below),
// keeping archive.html itself at a few KB while preserving the full taxonomy and
// the existing lazy-load of per-category question files.
fs.writeFileSync(path.join(outDir, 'archive-cat-index.json'), JSON.stringify(catIndex));

let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>GK Current Affairs Archive — vlymbooq</title>\n<meta name="description" content="Complete archive of ' + allQuestions.length + ' GK & Current Affairs questions with explanations. Free practice for competitive exams. Browse by subject tree.">\n<link rel="icon" type="image/svg+xml" href="favicon.svg">\n<link rel="icon" type="image/png" href="logo.png">\n<link rel="stylesheet" href="css/style.css">\n<style>\n@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap\');\n*{margin:0;padding:0;box-sizing:border-box}\n:root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--border-hover:rgba(255,255,255,.1);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--red:#ef4444;--amber:#f59e0b;--cyan:#22d3ee;--radius:12px;--radius-lg:16px}\nbody{font-family:\'Inter\',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\na{color:var(--text);text-decoration:none}\n.nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n.nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.brand{display:flex;align-items:center;gap:8px}\n.brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n.nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:var(--text-sec);white-space:nowrap}\n.nav-links a.active,.nav-links a:hover{background:rgba(167,139,250,.1);color:var(--purple)}\n.page-wrap{display:flex;max-width:1100px;margin:0 auto;padding:24px;gap:24px}\n.sidebar{width:280px;flex-shrink:0;position:sticky;top:80px;align-self:flex-start;max-height:calc(100vh - 96px);overflow-y:auto;scrollbar-width:thin}\n.sidebar-title{font-size:.8em;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px}\n.sidebar-cat{margin-bottom:2px}\n.sidebar-link,.sidebar-subj-link,.sidebar-subsub-link{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-radius:8px;font-size:.85em;color:var(--text-sec);cursor:pointer}\n.sidebar-link.active,.sidebar-subj-link.active,.sidebar-subsub-link.active{background:rgba(167,139,250,.12);color:var(--text)}\n.sidebar-icon{margin-right:6px}\n.sidebar-count{font-size:.78em;color:var(--text-muted);padding:1px 6px;border-radius:4px;background:var(--bg-card)}\n.sidebar-subjects{display:none;margin-left:12px}\n.sidebar-subjects.open{display:block}\n.sidebar-subj-link{padding:4px 10px;font-size:.82em}\n.sidebar-subsubs{display:none;margin-left:12px}\n.sidebar-subsubs.open{display:block}\n.sidebar-subsub-link{padding:3px 8px;font-size:.78em}\n.main-content{flex:1;min-width:0}\n.breadcrumb{font-size:.85em;color:var(--text-muted);margin-bottom:20px}\n.breadcrumb span{color:var(--text-sec)}\n.breadcrumb .current{color:var(--text)}\n.page-title{font-size:1.6em;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}\n.page-sub{color:var(--text-sec);font-size:.9em;margin-bottom:24px}\n.loading{text-align:center;padding:40px;color:var(--text-muted)}\n.search-bar{position:relative;margin-bottom:20px;display:flex;align-items:center;gap:8px}.search-info{cursor:pointer;color:var(--text-muted);font-size:1.2em;flex-shrink:0;transition:color .2s}.search-info:hover{color:var(--purple)}.search-bar input{width:100%;padding:12px 16px;border-radius:100px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:.9em;outline:none;font-family:inherit;transition:border-color .2s}.search-bar input:focus{border-color:var(--purple)}.search-bar input::placeholder{color:var(--text-muted)}.search-results-info{font-size:.85em;color:var(--text-sec);margin-bottom:16px;padding:8px 0}.search-no-results{text-align:center;padding:40px;color:var(--text-muted)}\n.subj-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;display:block}\n.subj-card:hover{background:var(--bg-hover);border-color:var(--border-hover)}\n.subj-card-name{font-weight:600;font-size:.95em;margin-bottom:4px}\n.subj-card-count{font-size:.8em;color:var(--text-muted);margin-bottom:8px}\n.subj-card-preview{font-size:.75em;color:var(--text-muted);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}\n.question-list{display:flex;flex-direction:column;gap:12px}\n.q-item{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px}\n.q-item:hover{background:var(--bg-hover)}\n.q-num{font-size:.75em;color:var(--text-muted);margin-bottom:4px}\n.q-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}\n.tag{font-size:.7em;padding:2px 8px;border-radius:100px;font-weight:500}\n.cat-tag{background:rgba(167,139,250,.12);color:var(--purple)}\n.date-tag{background:rgba(34,211,238,.08);color:var(--cyan)}\n.q-question{font-size:.95em;font-weight:500;margin-bottom:8px;line-height:1.6}\n.q-answer{font-size:.85em;margin-bottom:6px}\n.a-label{color:var(--text-muted)}\n.a-value{color:var(--emerald);font-weight:600}\n.explain-btn{background:transparent;border:1px solid var(--border);color:var(--text-sec);padding:5px 12px;border-radius:100px;cursor:pointer;font-size:.78em}\n.explain-btn:hover{background:var(--bg-hover);border-color:var(--border-hover)}\n.q-explain{background:rgba(167,139,250,.05);border-radius:8px;padding:12px;margin-top:8px;font-size:.82em;color:var(--text-sec);line-height:1.7;display:none}\n.q-explain.show{display:block}\n@media(max-width:768px){.sidebar{display:none}.page-wrap{padding:16px;flex-direction:column}}\n<\/style>\n</head>\n<body>\n';

html += '<nav class="nav"><div class="nav-inner"><div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple)"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"\/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\/><\/svg><span class="brand-text">vlymbooq<\/span><\/div><div class="nav-links"><a href="index.html">Home<\/a><a href="current-affairs.html">Quiz<\/a><a href="dashboard.html">Dashboard<\/a><a class="active" href="archive.html">Archive<\/a><a href="about.html">About<\/a><\/div><\/div><\/nav>';

html += '<div class="page-wrap"><aside class="sidebar"><div class="sidebar-title">Categories</div><div id="sidebar-root"></div></aside><main class="main-content">';
html += '<div class="search-bar"><input type="text" id="searchInput" placeholder="Search questions..." oninput="onSearchInput(this.value)" autocomplete="off"><span class="search-info" onclick="alert(\'Search tips:\\n\\n\u2022 Type any keyword — searches question, answer, explanation\\n\u2022 Multiple words = all must match (AND search)\\n\u2022 date:YYYY-MM-DD — filter by exact date\\n\u2022 date:YYYY-MM — filter by month\\n\u2022 Combine e.g. date:2026-07-22 Arjuna\\n\\nClick a category in sidebar to browse.\')" title="Search help">\u24d8</span></div>';
html += '<div class="breadcrumb" id="breadcrumb">Archive</div>';

// Welcome view
html += '<div class="content-panel" id="view-welcome">';
html += '<h1 class="page-title">📚 GK Current Affairs Archive</h1>';
var buildTime = new Date().toISOString();
html += '<p class="page-sub">' + allQuestions.length + ' questions across ' + sortedCats.length + ' categories — last updated <time id="build-time" datetime="' + buildTime + '">' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC</time>. Click a category to browse.</p>';
html += '<div class="subj-grid" id="welcome-grid"></div></div>';

// Content panel
html += '<div class="content-panel" id="view-content" style="display:none"></div>';
html += '</main></div>';

// Inline JS
html += '<script>\n';
html += 'var CAT_INDEX = [];\n';
html += 'var _indexLoaded = false;\n';
html += 'var _pendingSearch = null;\n';
html += 'var _cache = {};\n';
html += 'var _currentCat = null, _currentSubj = null, _currentSubSub = null;\n';
// Fetch the (large) category tree lazily so archive.html itself stays tiny.
// The index is the only big embedded data that used to blow archive.html past
// 8 MB; everything else (per-category question files) is already lazy-loaded.
html += 'function loadIndex() {\n';
html += '  if (_indexLoaded) return;\n';
html += '  var xhr = new XMLHttpRequest();\n';
html += '  xhr.timeout = 60000;\n';
html += '  xhr.onload = function() {\n';
html += '    if (xhr.status !== 200) { showIndexError(); return; }\n';
html += '    try { CAT_INDEX = JSON.parse(xhr.responseText); }\n';
html += '    catch (e) { showIndexError(); return; }\n';
html += '    _indexLoaded = true;\n';
html += '    buildSidebar();\n';
html += '    buildWelcomeGrid();\n';
html += '    if (_pendingSearch !== null) { var q = _pendingSearch; _pendingSearch = null; doSearch(q); }\n';
html += '  };\n';
html += '  xhr.onerror = xhr.ontimeout = showIndexError;\n';
html += '  xhr.open(\'GET\', \'data/questions/archive-cat-index.json\');\n';
html += '  xhr.send();\n';
html += '}\n';
html += 'function showIndexError() {\n';
html += '  var root = document.getElementById(\'sidebar-root\');\n';
html += '  if (root && !_indexLoaded) root.innerHTML = \'<div class="sidebar-subsub-loading">Could not load archive index. Check your connection.</div>\';\n';
html += '  var grid = document.getElementById(\'welcome-grid\');\n';
html += '  if (grid && !_indexLoaded) grid.innerHTML = \'<div class="loading">Could not load archive index. Check your connection.</div>\';\n';
html += '}\n';

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
html += '  var h = \'<h2 class="page-title">\' + c.icon + \' \' + escHtml(c.name) + \'</h2><p class="page-sub">Choose a topic:</p><div class="subj-grid">\';\n';
html += '  c.subjects.forEach(function(subj, si) {\n';
html += '    var preview = subj.subSubjects.slice(0, 3).map(function(s){return escHtml(s.name)}).join(\'<br>\');\n';
html += '    h += \'<a href="#" class="subj-card" onclick="return selectSubject(\' + ci + \',\' + si + \')"><div class="subj-card-name">\' + escHtml(subj.name) + \'</div><div class="subj-card-count">\' + subj.total + \' questions</div><div class="subj-card-preview">\' + preview + \'</div></a>\';\n';
html += '  });\n';
html += '  h += \'</div>\';\n';
html += '  panel.innerHTML = h;\n';
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
html += '  var ssRk = ci + \'-\' + si;\n';
html += '  if (ssEl && !_ssRendered[ssRk]) renderSubsubs(ssEl, ci, si);\n';
html += '  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return selectCategory(\' + ci + \')">\' + escHtml(c.name) + \'</a> <span class="sep">›</span> <span class="current">\' + escHtml(subj.name) + \'</span>\';\n';
html += '  _currentCat = ci; _currentSubj = si;\n';
html += '  showSubject(ci, si);\n';
html += '  return false;\n}\n';

html += 'function showSubject(ci, si) {\n';
html += '  var c = CAT_INDEX[ci], subj = c.subjects[si];\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  panel.style.display = \'block\';\n';
html += '  document.getElementById(\'view-welcome\').style.display = \'none\';\n';
html += '  var PAGE = 200;\n';
html += '  var total = subj.subSubjects.length;\n';
html += '  var h = \'<h2 class="page-title">\' + c.icon + \' \' + escHtml(subj.name) + \'</h2><p class="page-sub">\' + escHtml(c.name) + \' — choose a sub-topic:</p><div class="subj-grid">\';\n';
html += '  var count = Math.min(PAGE, total);\n';
html += '  for (var ssi = 0; ssi < count; ssi++) {\n';
html += '    var ss = subj.subSubjects[ssi];\n';
html += '    h += \'<a href="#" class="subj-card" onclick="return selectSubSubject(\' + ci + \',\' + si + \',\' + ssi + \')"><div class="subj-card-name">\' + escHtml(ss.name) + \'</div><div class="subj-card-count">\' + ss.count + \' questions</div></a>\';\n';
html += '  }\n';
html += '  h += \'</div>\';\n';
html += '  if (total > PAGE) {\n';
html += '    h += \'<div style="text-align:center;margin:20px 0"><button class="subj-card load-more" onclick="loadMoreSubtopics(\' + ci + \',\' + si + \',\' + PAGE + \')">Show more sub-topics (\' + (total - PAGE) + \' remaining)</button></div>\';\n';
html += '  }\n';
html += '  panel.innerHTML = h;\n';
html += '  window.scrollTo(0, 0);\n';
html += '}\n';

html += 'function loadMoreSubtopics(ci, si, shown) {\n';
html += '  var subj = CAT_INDEX[ci].subjects[si];\n';
html += '  var total = subj.subSubjects.length;\n';
html += '  var PAGE = 200;\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  var grid = panel.querySelector(\'.subj-grid\');\n';
html += '  var next = Math.min(shown + PAGE, total);\n';
html += '  for (var ssi = shown; ssi < next; ssi++) {\n';
html += '    var ss = subj.subSubjects[ssi];\n';
html += '    grid.insertAdjacentHTML(\'beforeend\', \'<a href="#" class="subj-card" onclick="return selectSubSubject(\' + ci + \',\' + si + \',\' + ssi + \')"><div class="subj-card-name">\' + escHtml(ss.name) + \'</div><div class="subj-card-count">\' + ss.count + \' questions</div></a>\');\n';
html += '  }\n';
html += '  var btn = panel.querySelector(\'.load-more\');\n';
html += '  if (next >= total) {\n';
html += '    if (btn) btn.parentNode.parentNode.removeChild(btn.parentNode);\n';
html += '  } else {\n';
html += '    btn.textContent = \'Show more sub-topics (\' + (total - next) + \' remaining)\';\n';
html += '    btn.setAttribute(\'onclick\', \'return loadMoreSubtopics(\' + ci + \',\' + si + \',\' + next + \')\');\n';
html += '  }\n';
html += '  return false;\n';
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
html += '  var ssRk = ci + \'-\' + si;\n';
html += '  if (ssEl && !_ssRendered[ssRk]) renderSubsubs(ssEl, ci, si);\n';
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
html += '  var failed = false;\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  files.forEach(function(url, fi) {\n';
html += '    (function attempt(attemptNum) {\n';
html += '      var xhr = new XMLHttpRequest();\n';
html += '      xhr.timeout = 30000;\n';
html += '      xhr.onload = function() {\n';
html += '        if (xhr.status !== 200) {\n';
html += '          if (attemptNum < 1) { setTimeout(function() { attempt(attemptNum + 1); }, 1000); return; }\n';
html += '          onFail(); return;\n';
html += '        }\n';
html += '        var data;\n';
html += '        try { data = JSON.parse(xhr.responseText); } catch(e) {\n';
html += '          if (attemptNum < 1) { setTimeout(function() { attempt(attemptNum + 1); }, 1000); return; }\n';
html += '          onFail(); return;\n';
html += '        }\n';
html += '        for (var sk in data) {\n';
html += '          if (!merged[sk]) merged[sk] = { subSubjects: {} };\n';
html += '          var ss = data[sk].subSubjects;\n';
html += '          for (var ssk in ss) {\n';
html += '            if (ssk === \'__proto__\' || ssk === \'constructor\') continue;\n';
html += '            if (!merged[sk].subSubjects[ssk]) merged[sk].subSubjects[ssk] = [];\n';
html += '            merged[sk].subSubjects[ssk] = merged[sk].subSubjects[ssk].concat(ss[ssk]);\n';
html += '          }\n';
html += '        }\n';
html += '        loaded++;\n';
html += '        if (loaded === files.length) {\n';
html += '          var allKeys = Object.keys(merged);\n';
html += '          if (allKeys.length > 1) {\n';
html += '            var targetKey = CAT_INDEX[ci].subjects[0].name;\n';
html += '            if (!merged[targetKey]) merged[targetKey] = { subSubjects: {} };\n';
html += '            for (var ki = 0; ki < allKeys.length; ki++) {\n';
html += '              if (allKeys[ki] === targetKey) continue;\n';
html += '              var otherSS = merged[allKeys[ki]].subSubjects;\n';
html += '              for (var ssk2 in otherSS) {\n';
html += '                if (ssk2 === \'__proto__\' || ssk2 === \'constructor\') continue;\n';
html += '                if (!merged[targetKey].subSubjects[ssk2]) merged[targetKey].subSubjects[ssk2] = [];\n';
html += '                merged[targetKey].subSubjects[ssk2] = merged[targetKey].subSubjects[ssk2].concat(otherSS[ssk2]);\n';
html += '              }\n';
html += '            }\n';
html += '          }\n';
html += '          _cache[ci] = merged; cb();\n';
html += '        }\n';
html += '      };\n';
html += '      xhr.onerror = function() { if (attemptNum < 1) { setTimeout(function() { attempt(attemptNum + 1); }, 1000); } else { onFail(); } };\n';
html += '      xhr.ontimeout = function() { if (attemptNum < 1) { setTimeout(function() { attempt(attemptNum + 1); }, 1000); } else { onFail(); } };\n';
html += '      xhr.open(\'GET\', url, true);\n';
html += '      xhr.send();\n';
html += '    })(0);\n';
html += '    function onFail() {\n';
html += '      if (!failed) {\n';
html += '        failed = true;\n';
html += '        _cache[ci] = {};\n';
html += '        panel.innerHTML = \'<div class="loading" style="color:var(--red)">\u26a0\ufe0f Failed to load \' + CAT_INDEX[ci].name + \'. Check your connection and try again.</div>\';\n';
html += '      }\n';
html += '      cb();\n';
html += '    }\n';
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
html += 'var RESULTS_PER_PAGE = 400;\n';
html += 'var MAX_SEARCH_RESULTS = 500000;\n';
html += 'var SEARCH_CHUNK = 2000;\n';
html += 'var _searchAll = [];\n';
html += 'var _searchRendered = 0;\n';
html += 'var _searchQuery = \'\';\n';
html += 'var _searchLoading = false;\n';
html += 'var _searchTotalFiles = 0;\n';
html += 'var _searchDoneFiles = 0;\n';
html += 'var _searchToken = 0;\n';
html += 'var _searchStartToken = 0;\n';
html += 'var _searchDateFilter = null;\n';
html += 'var _searchTextWords = [];\n';
html += 'var _searchCapHit = false;\n';
html += 'var _searchQueue = [];\n';
html += 'var _searchCur = null;\n';
html += 'var _dateStrCache = {};\n';
html += 'function onSearchInput(val) {\n';
html += '  clearTimeout(_searchTimer);\n';
html += '  _searchTimer = setTimeout(function(){ doSearch(val); }, 250);\n';
html += '}\n';
html += 'function _searchCountLabel(n) {\n';
html += '  return n.toLocaleString() + \' result\' + (n === 1 ? \'\' : \'s\');\n';
html += '}\n';

html += 'function doSearch(query) {\n';
html += '  query = query.trim().toLowerCase();\n';
html += '  if (!_indexLoaded) { _pendingSearch = query; return; }\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  var welcome = document.getElementById(\'view-welcome\');\n';
html += '  _searchToken++;\n';
html += '  if (!query) {\n';
html += '    _searchLoading = false;\n';
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
html += '  _searchAll = [];\n';
html += '  _searchRendered = 0;\n';
html += '  _searchQuery = query;\n';
html += '  _searchLoading = true;\n';
html += '  _searchDoneFiles = 0;\n';
html += '  _searchTotalFiles = CAT_INDEX.length;\n';
html += '  _searchCapHit = false;\n';
html += '  _searchStartToken = _searchToken;\n';
html += '  _dateStrCache = {};\n';
html += '  var words = query.split(/\\s+/);\n';
html += '  _searchDateFilter = null;\n';
html += '  _searchTextWords = [];\n';
html += '  for (var wi = 0; wi < words.length; wi++) {\n';
html += '    if (words[wi].indexOf(\'date:\') === 0) { _searchDateFilter = words[wi].slice(5); }\n';
html += '    else { _searchTextWords.push(words[wi]); }\n';
html += '  }\n';
html += '  _searchQueue = [];\n';
html += '  for (var ci = 0; ci < CAT_INDEX.length; ci++) _searchQueue.push(ci);\n';
html += '  _searchCur = null;\n';
html += '  showSearchResults();\n';
html += '  _scanChunk();\n';
html += '}\n';

html += 'function _nextQuestion() {\n';
html += '  while (_searchCur.skI < _searchCur.skKeys.length) {\n';
html += '    var sk = _searchCur.skKeys[_searchCur.skI];\n';
html += '    var subj = _searchCur.data[sk];\n';
html += '    if (!subj.subSubjects) { _searchCur.skI++; continue; }\n';
html += '    if (!_searchCur.sskKeys) _searchCur.sskKeys = Object.keys(subj.subSubjects);\n';
html += '    while (_searchCur.sskI < _searchCur.sskKeys.length) {\n';
html += '      var ssk = _searchCur.sskKeys[_searchCur.sskI];\n';
html += '      var arr = subj.subSubjects[ssk];\n';
html += '      if (_searchCur.qi < arr.length) {\n';
html += '        return { sk: sk, ssk: ssk, q: arr[_searchCur.qi++] };\n';
html += '      }\n';
html += '      _searchCur.qi = 0;\n';
html += '      _searchCur.sskI++;\n';
html += '    }\n';
html += '    _searchCur.sskKeys = null;\n';
html += '    _searchCur.sskI = 0;\n';
html += '    _searchCur.skI++;\n';
html += '  }\n';
html += '  return null;\n';
html += '}\n';

html += 'function _fastDateStr(iso) {\n';
html += '  var m = iso.slice(0, 10).split(\'-\');\n';
html += '  var months = [\'Jan\',\'Feb\',\'Mar\',\'Apr\',\'May\',\'Jun\',\'Jul\',\'Aug\',\'Sep\',\'Oct\',\'Nov\',\'Dec\'];\n';
html += '  return (+m[2]) + \' \' + months[(+m[1])-1] + \' \' + m[0];\n';
html += '}\n';

html += 'function _matchesQuery(q) {\n';
html += '  if (_searchDateFilter) {\n';
html += '    var qDate = (q.pubDate||\'\').split(\'T\')[0];\n';
html += '    if (qDate.indexOf(_searchDateFilter) !== 0) return false;\n';
html += '  }\n';
html += '  if (_searchTextWords.length) {\n';
html += '    var qq = (q.question||\'\').toLowerCase();\n';
html += '    var aa = (q.answer||\'\').toLowerCase();\n';
html += '    var ff = null;\n';
html += '    var dd = null;\n';
html += '    for (var twi = 0; twi < _searchTextWords.length; twi++) {\n';
html += '      var w = _searchTextWords[twi];\n';
html += '      if (qq.indexOf(w) !== -1) continue;\n';
html += '      if (aa.indexOf(w) !== -1) continue;\n';
html += '      if (dd === null) {\n';
html += '        if (!q.pubDate) { dd = \'\'; }\n';
html += '        else {\n';
html += '          if (!_dateStrCache[q.pubDate]) _dateStrCache[q.pubDate] = _fastDateStr(q.pubDate);\n';
html += '          dd = _dateStrCache[q.pubDate];\n';
html += '        }\n';
html += '      }\n';
html += '      if (dd.indexOf(w) !== -1) continue;\n';
html += '      if (ff === null) ff = (q.fact||\'\').toLowerCase();\n';
html += '      if (ff.indexOf(w) === -1) return false;\n';
html += '    }\n';
html += '  }\n';
html += '  return true;\n';
html += '}\n';

html += 'function _scanChunk() {\n';
html += '  if (!_searchLoading || _searchStartToken !== _searchToken) return;\n';
html += '  var scanned = 0;\n';
html += '  while (scanned < SEARCH_CHUNK) {\n';
html += '    if (_searchCapHit) { _finishSearch(); return; }\n';
html += '    if (!_searchCur) {\n';
html += '      if (_searchQueue.length === 0) { _finishSearch(); return; }\n';
html += '      var ci = _searchQueue[0];\n';
html += '      if (!_cache[ci]) {\n';
html += '        loadCategory(ci, function() { _scanChunk(); });\n';
html += '        return;\n';
html += '      }\n';
html += '      _searchQueue.shift();\n';
html += '      _searchCur = { ci: ci, data: _cache[ci], skKeys: Object.keys(_cache[ci]), skI: 0, sskKeys: null, sskI: 0, qi: 0 };\n';
html += '    }\n';
html += '    var item = _nextQuestion();\n';
html += '    if (!item) {\n';
html += '      _searchCur = null;\n';
html += '      _searchDoneFiles++;\n';
html += '      continue;\n';
html += '    }\n';
html += '    scanned++;\n';
html += '    if (_matchesQuery(item.q)) {\n';
html += '      _searchAll.push({category: CAT_INDEX[_searchCur.ci].name, icon: CAT_INDEX[_searchCur.ci].icon, subject: item.sk, subSubject: item.ssk, question: item.q});\n';
html += '      if (_searchAll.length >= MAX_SEARCH_RESULTS) _searchCapHit = true;\n';
html += '    }\n';
html += '  }\n';
html += '  _renderSearchHeader();\n';
html += '  _appendSearchPage();\n';
html += '  setTimeout(_scanChunk, 0);\n';
html += '}\n';

html += 'function _finishSearch() {\n';
html += '  _searchLoading = false;\n';
html += '  _renderSearchHeader();\n';
html += '  _appendSearchPage();\n';
html += '}\n';

html += 'function _renderSearchHeader() {\n';
html += '  var head = document.getElementById(\'searchHead\');\n';
html += '  if (!head) return;\n';
html += '  var txt;\n';
html += '  if (_searchCapHit) {\n';
html += '    txt = \'Found <strong>\' + _searchCountLabel(_searchAll.length) + \'</strong> for "\' + escHtml(_searchQuery) + \'" — showing first \' + MAX_SEARCH_RESULTS.toLocaleString() + \'. Refine your search to see more.\';\n';
html += '  } else if (_searchAll.length === 0 && _searchLoading) {\n';
html += '    txt = \'Searching <strong>\' + _searchDoneFiles + \'/\' + _searchTotalFiles + \'</strong> files…\';\n';
html += '  } else if (_searchLoading) {\n';
html += '    txt = \'Found <strong>\' + _searchCountLabel(_searchAll.length) + \'</strong> so far · searching <strong>\' + _searchDoneFiles + \'/\' + _searchTotalFiles + \'</strong> files…\';\n';
html += '  } else {\n';
html += '    txt = \'Found <strong>\' + _searchCountLabel(_searchAll.length) + \'</strong> for "\' + escHtml(_searchQuery) + \'"\';\n';
html += '  }\n';
html += '  head.innerHTML = txt;\n';
html += '}\n';

html += 'function _searchItemHTML(r) {\n';
html += '  var q = r.question;\n';
html += '  var date = q.pubDate ? new Date(q.pubDate).toLocaleDateString(\'en-IN\',{day:\'numeric\',month:\'short\',year:\'numeric\'}) : \'\';\n';
html += '  var h = \'<div class="q-item"><div class="q-tags"><span class="tag cat-tag">\' + escHtml(r.category) + \' &rsaquo; \' + escHtml(r.subject) + \' &rsaquo; \' + escHtml(r.subSubject) + \'</span>\' + (date?\'<span class="tag date-tag">\'+date+\'</span>\':\'\') + \'</div>\';\n';
html += '  h += \'<div class="q-question">\' + escHtml(q.question) + \'</div>\';\n';
html += '  h += \'<div class="q-answer"><span class="a-label">Answer:</span> <span class="a-value">\' + escHtml(q.answer) + \'</span></div>\';\n';
html += '  h += (q.fact ? \'<button class="explain-btn" onclick="toggleExplain(this)">📖 Explanation</button><div class="q-explain">\' + escHtml(q.fact) + \'</div>\' : \'\') + \'</div>\';\n';
html += '  return h;\n';
html += '}\n';

html += 'function _appendSearchPage() {\n';
html += '  var list = document.getElementById(\'searchQuestionList\');\n';
html += '  if (!list) return;\n';
html += '  var next = Math.min(_searchRendered + RESULTS_PER_PAGE, _searchAll.length);\n';
html += '  if (next <= _searchRendered) return;\n';
html += '  var chunk = [];\n';
html += '  for (var i = _searchRendered; i < next; i++) chunk.push(_searchItemHTML(_searchAll[i]));\n';
html += '  var frag = document.createElement(\'div\');\n';
html += '  frag.innerHTML = chunk.join(\'\');\n';
html += '  while (frag.firstChild) list.appendChild(frag.firstChild);\n';
html += '  _searchRendered = next;\n';
html += '  var btn = document.getElementById(\'searchMoreBtn\');\n';
html += '  if (_searchRendered < _searchAll.length) {\n';
html += '    var left = _searchAll.length - _searchRendered;\n';
html += '    if (!btn) {\n';
html += '      btn = document.createElement(\'button\');\n';
html += '      btn.id = \'searchMoreBtn\';\n';
html += '      btn.style.cssText = \'display:block;margin:18px auto;padding:10px 22px;border-radius:8px;border:1px solid var(--purple);background:rgba(99,102,241,.12);color:var(--purple);cursor:pointer;font-size:.85em;font-weight:700\';\n';
html += '      btn.onclick = function() { _appendSearchPage(); };\n';
html += '      list.parentNode.appendChild(btn);\n';
html += '    }\n';
html += '    btn.textContent = \'Show more (\' + left.toLocaleString() + \' more)\';\n';
html += '  } else if (btn) {\n';
html += '    btn.remove();\n';
html += '  }\n';
html += '}\n';

html += 'function showSearchResults() {\n';
html += '  var panel = document.getElementById(\'view-content\');\n';
html += '  if (_searchAll.length === 0 && !_searchLoading) {\n';
html += '    panel.innerHTML = \'<div class="search-no-results">No questions matching "<strong>\' + escHtml(_searchQuery) + \'</strong>"</div>\';\n';
html += '    return;\n';
html += '  }\n';
html += '  var h = \'<div class="search-results-info" id="searchHead"></div>\';\n';
html += '  h += \'<div class="question-list" id="searchQuestionList"></div>\';\n';
html += '  panel.innerHTML = h;\n';
html += '  _searchRendered = 0;\n';
html += '  _renderSearchHeader();\n';
html += '  _appendSearchPage();\n';
html += '}\n';

html += 'function localizeBuildTime() {\n';
html += '  var el = document.getElementById(\'build-time\');\n';
html += '  if (!el) return;\n';
html += '  var d = new Date(el.getAttribute(\'datetime\'));\n';
html += '  el.textContent = d.toLocaleDateString([], { day: \'numeric\', month: \'short\', year: \'numeric\', hour: \'2-digit\', minute: \'2-digit\', timeZoneName: \'short\' });\n';
html += '}\n';
html += 'localizeBuildTime();\n';

// Build sidebar + welcome grid from CAT_INDEX at runtime instead of baking the
// taxonomy into server-rendered HTML. Without this, archive.html ~25 MiB (the
// sidebar alone was ~21 MiB) and every grow bumped it toward Cloudflare Pages'
// 25 MiB single-file cap that already broke deployments.
html += 'var _ssRendered = {};\n';
html += 'function renderSubsubs(el, ci, si) {\n';
html += '  var c = CAT_INDEX[ci]; if (!c || !c.subjects[si]) return;\n';
html += '  var subj = c.subjects[si];\n';
html += '  var h = \'\';\n';
html += '  for (var ssi = 0; ssi < subj.subSubjects.length; ssi++) {\n';
html += '    var ss = subj.subSubjects[ssi];\n';
html += '    h += \'<a href="#" class="sidebar-subsub-link" data-ci="\' + ci + \'" data-si="\' + si + \'" data-ssi="\' + ssi + \'" onclick="return selectSubSubject(\' + ci + \',\' + si + \',\' + ssi + \')"><span class="sidebar-label">\' + escHtml(ss.name) + \'</span><span class="sidebar-count">\' + ss.count + \'</span></a>\';\n';
html += '  }\n';
html += '  el.innerHTML = h;\n';
html += '  _ssRendered[ci + \'-\' + si] = true;\n';
html += '}\n';
html += 'function buildSidebar() {\n';
html += '  var root = document.getElementById(\'sidebar-root\');\n';
html += '  if (!root) return;\n';
html += '  var h = \'\';\n';
html += '  for (var ci = 0; ci < CAT_INDEX.length; ci++) {\n';
html += '    var c = CAT_INDEX[ci];\n';
html += '    h += \'<div class="sidebar-cat">\';\n';
html += '    h += \'<a href="#" class="sidebar-link" data-ci="\' + ci + \'" onclick="return selectCategory(\' + ci + \')"><span class="sidebar-icon">\' + escHtml(c.icon) + \'</span><span class="sidebar-label">\' + escHtml(c.name) + \'</span><span class="sidebar-count">\' + c.total + \'</span></a>\';\n';
html += '    h += \'<div class="sidebar-subjects" id="subj-\' + ci + \'">\';\n';
html += '    for (var si = 0; si < c.subjects.length; si++) {\n';
html += '      var subj = c.subjects[si];\n';
html += '      h += \'<a href="#" class="sidebar-subj-link" data-ci="\' + ci + \'" data-si="\' + si + \'" onclick="return selectSubject(\' + ci + \',\' + si + \')"><span class="sidebar-label">\' + escHtml(subj.name) + \'</span><span class="sidebar-count">\' + subj.total + \'</span></a>\';\n';
html += '      h += \'<div class="sidebar-subsubs" id="ss-\' + ci + \'-\' + si + \'"><span class="sidebar-subsub-loading">click to load sub-topics</span></div>\';\n';
html += '    }\n';
html += '    h += \'</div></div>\';\n';
html += '  }\n';
html += '  root.innerHTML = h;\n';
html += '}\n';

html += 'function buildWelcomeGrid() {\n';
html += '  var grid = document.getElementById(\'welcome-grid\');\n';
html += '  if (!grid) return;\n';
html += '  var h = \'\';\n';
html += '  CAT_INDEX.forEach(function(c, ci) {\n';
html += '    h += \'<a href="#" class="subj-card" onclick="return selectCategory(\' + ci + \')"><div class="subj-card-name">\' + escHtml(c.icon) + \' \' + escHtml(c.name) + \'</div><div class="subj-card-count">\' + c.total + \' questions</div></a>\';\n';
html += '  });\n';
html += '  grid.innerHTML = h;\n';
html += '}\n';

html += 'loadIndex();\n';

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

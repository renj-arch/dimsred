#!/usr/bin/env node
/**
 * audit-upsc-syllabus.js — answer "is anything missing?" with evidence.
 *
 * Word counts say how much is written; they do not say whether the syllabus is
 * covered. Papers also change shape — a year of application-based, multi-
 * statement and match-the-following questions punishes a corpus that only has
 * one-line recall. So this audit reports two things per topic:
 *
 *   1. coverage: how often the topic is actually taught in the corpus
 *   2. question shape: what kind of questions exist for it
 *
 * It scans every lesson body and a bounded sample of the question bank, then
 * writes data/upsc-syllabus-coverage.json and a readable page at
 * upsc/coverage.html. Nothing is generated here; it only reports, so it is safe
 * to run on every deploy.
 *
 *   node scripts/audit-upsc-syllabus.js
 *   node scripts/audit-upsc-syllabus.js --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'data', 'upsc-syllabus-coverage.json');
const OUT_PAGE = path.join(ROOT, 'upsc', 'coverage.html');

const COVERED = 12;   // mentions before a topic counts as taught
const THIN = 3;       // below this it is a gap

/* ---------------------------------------------------------------------------
 * The syllabus. Keywords are the words a lesson would actually use, not the
 * syllabus wording, because the corpus is written in teaching language.
 * ------------------------------------------------------------------------ */
const SYLLABUS = {
  'Current Affairs': [
    ['National events and schemes', ['scheme', 'mission', 'cabinet approves', 'launched', 'initiative']],
    ['International events', ['summit', 'bilateral', 'g20', 'united nations', 'treaty', 'sanctions']],
    ['Awards, appointments, persons in news', ['appointed', 'award', 'conferred', 'chairperson', 'secretary']],
    ['Reports and indices', ['index', 'report', 'ranking', 'ease of living', 'human development']],
    ['Government data and surveys', ['census', 'survey', 'nfhs', 'sample registration', 'nso']]
  ],
  'History of India': [
    ['Prehistoric and Indus Valley', ['harappa', 'mohenjo', 'indus valley', 'chalcolithic', 'neolithic']],
    ['Vedic period', ['vedic', 'rigveda', 'upanishad', 'brahmana', 'ashrama']],
    ['Mahajanapadas, Buddhism, Jainism', ['mahajanapada', 'buddha', 'jain', 'mahavira', 'sangha']],
    ['Mauryan empire and administration', ['maurya', 'ashoka', 'chanakya', 'arthashastra', 'edict']],
    ['Post-Mauryan and Sangam', ['sunga', 'satavahana', 'kushana', 'sangam', 'chola']],
    ['Gupta and post-Gupta', ['gupta', 'harsha', 'pallava', 'chalukya', 'rashtrakuta']],
    ['Delhi Sultanate', ['sultanate', 'slave dynasty', 'khilji', 'tughlaq', 'sayyid', 'lodi']],
    ['Mughal empire', ['mughal', 'babur', 'akbar', 'aurangzeb', 'mansabdari']],
    ['Vijayanagara and Bahmani', ['vijayanagara', 'bahmani', 'krishnadevaraya', 'hampi']],
    ['Bhakti and Sufi movements', ['bhakti', 'sufi', 'kabir', 'nanak', 'chishti']],
    ['European arrival and Battle of Plassey', ['plassey', 'buxar', 'east india company', 'nawab']],
    ['Revolt of 1857', ['1857', 'sepoy', 'revolt', 'mangal pandey', 'rani lakshmibai']],
    ['Socio-religious reform', ['brahmo', 'arya samaj', 'sati', 'widow remarriage', 'ram mohan']],
    ['Congress and moderates', ['inc', 'moderate', 'extremist', 'partition of bengal', 'swadeshi']],
    ['Gandhian mass movements', ['non-cooperation', 'civil disobedience', 'quit india', 'dandi', 'salt march']],
    ['Revolutionaries and INA', ['revolutionary', 'azad hind', 'subhas chandra', 'ina', 'hsra']],
    ['Constitutional development', ['regulating act', 'government of india act', 'morley minto', 'cripps']],
    ['Partition and integration', ['partition', 'integration', 'princely state', 'hyderabad', 'kashmir']]
  ],
  'Art and Culture': [
    ['Architecture: temple styles', ['nagara', 'dravida', 'gopuram', 'shikhara', 'vesara']],
    ['Buddhist and Jain architecture', ['stupa', 'chaitya', 'vihara', 'sanchi', 'rock cut']],
    ['Indo-Islamic architecture', ['qutub', 'taj mahal', 'charbagh', 'indo-islamic', 'tomb']],
    ['Sculpture and bronzes', ['bronze', 'chola bronze', 'gandhara', 'mathura school', 'sculpture']],
    ['Painting traditions', ['madhubani', 'pattachitra', 'miniature', 'rajput painting', 'mural']],
    ['Classical dances', ['bharatanatyam', 'kathak', 'odissi', 'kuchipudi', 'manipuri', 'sattriya']],
    ['Music traditions', ['hindustani', 'carnatic', 'raga', 'tala', 'dhrupad']],
    ['Theatre, puppetry and martial arts', ['kutiyattam', 'yakshagana', 'puppetry', 'kalaripayattu']],
    ['Fairs, festivals and crafts', ['mela', 'festival', 'handicraft', 'gi tag', 'textile']],
    ['UNESCO heritage', ['unesco', 'world heritage', 'intangible heritage']]
  ],
  'Geography': [
    ['Earth and geomorphology', ['plate tectonics', 'weathering', 'erosion', 'fold', 'fault']],
    ['Atmosphere and climate', ['atmosphere', 'monsoon', 'jet stream', 'el nino', 'climate']],
    ['Oceanography', ['ocean current', 'salinity', 'tide', 'upwelling', 'coral']],
    ['Soil and vegetation', ['soil profile', 'alluvial', 'laterite', 'forest type', 'biome']],
    ['Indian physiography', ['himalaya', 'deccan', 'ganga plain', 'peninsular', 'coastal plain']],
    ['Indian rivers and drainage', ['river system', 'ganga', 'brahmaputra', 'godavari', 'watershed']],
    ['Indian climate and rainfall', ['southwest monsoon', 'northeast monsoon', 'rainfall', 'drought']],
    ['Agriculture and cropping', ['cropping', 'kharif', 'rabi', 'irrigation', 'crop pattern']],
    ['Minerals, industry and transport', ['mineral', 'iron ore', 'industrial region', 'railway', 'port']],
    ['Population and settlement', ['population density', 'urbanisation', 'migration', 'census town']],
    ['World geography and regions', ['latitude', 'longitude', 'strait', 'canal', 'continent']],
    ['Map reading and places in news', ['map', 'locate', 'tropic of cancer', 'border', 'island']]
  ],
  'Polity and Governance': [
    ['Constitutional framework', ['preamble', 'constitution', 'constituent assembly', 'basic structure']],
    ['Fundamental rights and duties', ['fundamental right', 'article 21', 'writ', 'dpsp', 'duty']],
    ['Union executive', ['president', 'prime minister', 'cabinet', 'council of ministers']],
    ['Parliament', ['lok sabha', 'rajya sabha', 'bill', 'ordinance', 'money bill']],
    ['Judiciary', ['supreme court', 'high court', 'judicial review', 'pil', 'collegium']],
    ['Federalism and centre-state', ['federal', 'seventh schedule', 'governor', 'inter-state council']],
    ['Local government', ['panchayat', 'municipality', '73rd amendment', 'gram sabha', 'mayor']],
    ['Constitutional bodies', ['election commission', 'cag', 'upsc', 'finance commission', 'attorney general']],
    ['Statutory and regulatory bodies', ['sebi', 'trai', 'nhrc', 'cvc', 'lokpal']],
    ['Governance and accountability', ['rti', 'civil service', 'e-governance', 'citizen charter']],
    ['Public policy and welfare', ['scheme', 'policy', 'subsidy', 'social justice', 'welfare']],
    ['Elections and representation', ['election', 'electoral', 'delimitation', 'political party', 'anti-defection']],
    ['Emergency provisions', ['emergency', 'article 352', 'article 356', 'president rule']],
    ['Amendment procedure', ['amendment', 'article 368', 'ratification']]
  ],
  'Economy and Social Development': [
    ['National income and growth', ['gdp', 'gva', 'growth rate', 'national income', 'per capita']],
    ['Inflation and prices', ['inflation', 'cpi', 'wpi', 'price index', 'core inflation']],
    ['Money, banking and RBI', ['rbi', 'monetary policy', 'repo', 'crr', 'npa', 'bank']],
    ['Fiscal policy and budget', ['budget', 'fiscal deficit', 'revenue deficit', 'frbm', 'tax']],
    ['Taxation and GST', ['gst', 'direct tax', 'indirect tax', 'cess', 'surcharge']],
    ['External sector', ['balance of payment', 'current account', 'fdi', 'exchange rate', 'export']],
    ['Financial markets', ['sebi', 'stock market', 'bond', 'mutual fund', 'ipo']],
    ['Agriculture and food security', ['msp', 'food security', 'pds', 'procurement', 'buffer stock']],
    ['Poverty, inclusion and inequality', ['poverty line', 'inclusion', 'inequality', 'gini', 'multidimensional']],
    ['Employment and labour', ['unemployment', 'labour code', 'gig', 'mgnrega', 'skill']],
    ['Demographics', ['fertility', 'sex ratio', 'demographic dividend', 'age structure', 'migration']],
    ['Social sector: health and education', ['health', 'nep', 'school', 'hospital', 'immunisation']],
    ['Sustainable development', ['sdg', 'sustainable', 'circular economy', 'esg']],
    ['Infrastructure and investment', ['infrastructure', 'highway', 'power sector', 'investment', 'logistics']]
  ],
  'Environment and Ecology': [
    ['Ecosystems and ecology', ['ecosystem', 'food chain', 'trophic', 'biome', 'ecological pyramid']],
    ['Biodiversity and conservation', ['biodiversity', 'hotspot', 'endangered', 'species', 'conservation']],
    ['Protected areas', ['national park', 'sanctuary', 'tiger reserve', 'ramsar', 'biosphere reserve']],
    ['Climate change', ['climate change', 'greenhouse', 'carbon', 'cop', 'paris agreement']],
    ['Pollution', ['pollution', 'pm2.5', 'aqi', 'effluent', 'plastic waste']],
    ['Environmental institutions and law', ['cpcb', 'ngt', 'environment protection act', 'eia']],
    ['Renewable energy', ['solar', 'wind', 'renewable', 'hydrogen', 'biofuel']],
    ['Disaster management', ['disaster', 'cyclone', 'flood', 'earthquake', 'ndma']],
    ['International environmental conventions', ['unfccc', 'cbd', 'cites', 'montreal protocol', 'kyoto']]
  ],
  'General Science': [
    ['Physics basics', ['force', 'energy', 'electromagnetic', 'optics', 'wave']],
    ['Chemistry basics', ['atom', 'molecule', 'acid', 'polymer', 'periodic table']],
    ['Biology and health', ['cell', 'dna', 'immune', 'vaccine', 'enzyme']],
    ['Space and defence technology', ['satellite', 'launch vehicle', 'isro', 'missile', 'orbit']],
    ['Computing and digital', ['semiconductor', 'artificial intelligence', 'blockchain', 'internet', '5g']],
    ['Biotechnology', ['gene', 'crispr', 'cloning', 'stem cell', 'biotech']],
    ['Nuclear technology', ['nuclear', 'reactor', 'fission', 'fusion', 'radiation']],
    ['Everyday science', ['nutrition', 'vitamin', 'pressure', 'sound', 'light']]
  ]
};

/* ---------------------------------------------------------------------------
 * Question shapes. A paper that moves away from recall is answered from these
 * forms; a corpus with only "one-liners" leaves the aspirant unprepared even
 * when the topic is covered.
 * ------------------------------------------------------------------------ */
const SHAPES = [
  ['multi-statement', /which of the (statements|pairs) given above|consider the following statements|how many of the (above|statements)|statements? (is|are) correct/i],
  ['match-the-following', /match (the )?(list|column|following)|correctly matched|pairs? (is|are) correctly matched/i],
  ['chronology', /chronological order|earliest to latest|arrange the following in/i],
  ['assertion-reason', /assertion|reason \(r\)|a\) both a and r/i],
  ['negative-imperative', /which one of the following is not|not correct|incorrect|except/i],
  ['application', /with reference to|in the context of|consider the following (situation|scenario)/i],
  ['map-based', /in the (given )?map|shown in the map|locate/i],
  ['numerical', /\d+\s?(%|per cent|crore|lakh|billion|million)/i],
  ['definition', /^which of the following (best )?describes|is defined as|means/i]
];

function walkLessons(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkLessons(full, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(full);
  }
  return out;
}

function lessonText(file) {
  const html = fs.readFileSync(file, 'utf8');
  const i = html.indexOf('<div class="lesson-body"');
  const body = i === -1 ? html : html.slice(i);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase();
}

function main() {
  const wantJson = process.argv.includes('--json');

  // --- corpus -------------------------------------------------------------
  const lessons = [];
  for (const exam of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!exam.isDirectory()) continue;
    const course = path.join(ROOT, exam.name, 'course');
    if (fs.existsSync(course)) walkLessons(course, lessons);
  }

  const texts = lessons.map((f) => ({
    rel: path.relative(ROOT, f).replace(/\\/g, '/'),
    text: lessonText(f)
  }));

  // --- question shapes ----------------------------------------------------
  const sample = [];
  const qdir = path.join(ROOT, 'data', 'questions');
  let files = [];
  try { files = fs.readdirSync(qdir).filter((f) => f.endsWith('.json') && f !== 'archive-cat-index.json'); } catch (e) {}
  const prefer = files.filter((f) => /upsc|general|polity|history|geography|economy|environment|science|current/i.test(f));
  const pool = (prefer.length ? prefer : files).slice(0, 24);
  for (const f of pool) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(qdir, f), 'utf8')); } catch (e) { continue; }
    for (const cat of Object.keys(doc)) {
      const subs = (doc[cat] && doc[cat].subSubjects) || {};
      for (const sub of Object.keys(subs)) {
        for (const q of subs[sub] || []) {
          if (q && q.question) sample.push(String(q.question));
          if (sample.length >= 12000) break;
        }
        if (sample.length >= 12000) break;
      }
      if (sample.length >= 12000) break;
    }
    if (sample.length >= 12000) break;
  }

  const shapeCounts = {};
  SHAPES.forEach(([name]) => { shapeCounts[name] = 0; });
  let shaped = 0;
  sample.forEach((q) => {
    let hit = false;
    for (const [name, re] of SHAPES) {
      if (re.test(q)) { shapeCounts[name]++; hit = true; }
    }
    if (hit) shaped++;
  });

  // --- the paper-shape bank -------------------------------------------------
  // Written by scripts/invent-paper-shape.js in the forms a modern paper uses.
  // Reported separately from the legacy recall bank, because the whole point is
  // that the two are not the same thing.
  const paperShapeBank = { total: 0, byShape: {} };
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'upsc-format-questions.json'), 'utf8'));
    (doc.questions || []).forEach((q) => {
      paperShapeBank.total++;
      const k = q.shape || 'unknown';
      paperShapeBank.byShape[k] = (paperShapeBank.byShape[k] || 0) + 1;
    });
  } catch (e) { /* the lane has not run yet */ }

  // --- topic coverage -----------------------------------------------------
  const report = { generatedAt: new Date().toISOString(), lessons: lessons.length, questionsSampled: sample.length, subjects: {} };
  let totalTopics = 0;
  let covered = 0;
  let thin = 0;
  let missing = 0;

  for (const subject of Object.keys(SYLLABUS)) {
    const rows = [];
    for (const [topic, keywords] of SYLLABUS[subject]) {
      totalTopics++;
      let hits = 0;
      const where = [];
      for (const L of texts) {
        let local = 0;
        let kinds = 0;
        for (const k of keywords) {
          let at = 0;
          let found = 0;
          while (true) {
            const i = L.text.indexOf(k, at);
            if (i === -1) break;
            found++;
            at = i + k.length;
            if (found > 40) break;
          }
          if (found) { kinds++; local += found; }
        }
        // One generic word ("bank", "scheme", "health") appears in half the
        // corpus. A lesson only counts for a topic when at least two of the
        // topic's own terms appear in it.
        if (kinds >= 2) { hits += local; where.push({ lesson: L.rel, hits: local, kinds: kinds }); }
      }
      where.sort((a, b) => b.hits - a.hits);
      // Honest thresholds: a topic is "covered" when it is taught across
      // several lessons, not when one generic word ("bank", "health", "scheme")
      // happens to appear in one page many times. Counting lessons and a high
      // hit floor removes the false 100% the first pass produced.
      const distinct = where.length;
      const status = (distinct >= 3 && hits >= 20) ? 'covered'
        : (distinct >= 1 && hits >= 5) ? 'thin'
        : 'missing';
      if (status === 'covered') covered++;
      else if (status === 'thin') thin++;
      else missing++;
      rows.push({ topic: topic, hits: hits, lessonsTaught: distinct, status: status, lessons: where.slice(0, 4) });
    }
    report.subjects[subject] = rows;
  }

  report.summary = {
    topics: totalTopics, covered: covered, thin: thin, missing: missing,
    coveragePct: Math.round((covered / totalTopics) * 1000) / 10,
    questionShapes: shapeCounts,
    shapedShare: sample.length ? Math.round((shaped / sample.length) * 1000) / 10 : 0,
    paperShapeBank: paperShapeBank
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 1) + '\n', 'utf8');

  if (wantJson) { process.stdout.write(JSON.stringify(report.summary, null, 2) + '\n'); return; }

  // --- page ---------------------------------------------------------------
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const colour = { covered: '#34d399', thin: '#fbbf24', missing: '#f87171' };
  let html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>UPSC Prelims syllabus coverage | vlymbooq</title>' +
    '<meta name="description" content="Topic-by-topic coverage of the UPSC Prelims GS syllabus across the vlymbooq course, with the question shapes in the bank.">' +
    '<style>body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1115;color:#e8eaed;margin:0;padding:24px}' +
    '.wrap{max-width:1050px;margin:0 auto}h1{font-size:24px;margin:0 0 6px}.meta{color:#9aa0a6;font-size:13px;margin-bottom:20px}' +
    '.cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}.card{background:#1a1d23;border:1px solid #2a2e37;border-radius:10px;padding:14px 18px;min-width:130px}' +
    '.card b{display:block;font-size:22px}.card span{color:#9aa0a6;font-size:12px;text-transform:uppercase;letter-spacing:.08em}' +
    'h2{font-size:16px;margin:26px 0 10px;letter-spacing:.02em}table{width:100%;border-collapse:collapse;font-size:13px}' +
    'th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #23262d;vertical-align:top}' +
    'th{color:#9aa0a6;font-size:11px;text-transform:uppercase;letter-spacing:.08em}' +
    '.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}' +
    'a{color:#8ab4f8}.small{color:#9aa0a6;font-size:12px}code{background:#14171c;padding:1px 5px;border-radius:4px}' +
    '</style></head><body><div class="wrap">' +
    '<h1>UPSC Prelims — syllabus coverage</h1>' +
    '<p class="meta">Generated ' + esc(new Date(report.generatedAt).toUTCString()) + ' from ' + lessons.length + ' lessons and ' + sample.length + ' sampled questions.</p>' +
    '<div class="cards">' +
    '<div class="card"><b>' + report.summary.coveragePct + '%</b><span>topic coverage</span></div>' +
    '<div class="card"><b>' + covered + '</b><span>covered</span></div>' +
    '<div class="card"><b>' + thin + '</b><span>thin</span></div>' +
    '<div class="card"><b>' + missing + '</b><span>missing</span></div>' +
    '<div class="card"><b>' + report.summary.shapedShare + '%</b><span>questions in a paper shape</span></div>' +
    '</div>' +
    '<h2>Gaps to close</h2>';

  const gapRows = [];
  for (const subject of Object.keys(report.subjects)) {
    report.subjects[subject].forEach(function (r) {
      if (r.status !== 'covered') gapRows.push({ subject: subject, topic: r.topic, status: r.status, hits: r.hits, lessons: r.lessons });
    });
  }
  report.gaps = gapRows;
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 1) + '\n', 'utf8');
  if (!gapRows.length) {
    html += '<p class="small" style="color:#34d399">No thin or missing topic in this reading. The queue is empty; the lanes keep refreshing depth and news.</p>';
  } else {
    html += '<table><tr><th>Subject</th><th>Topic</th><th>Status</th><th>Mentions</th><th>Lesson to expand</th></tr>' +
      gapRows.map(function (r) {
        const link = r.lessons && r.lessons.length
          ? '<a href="../' + esc(r.lessons[0].lesson) + '">' + esc(r.lessons[0].lesson.split('/').slice(-1)[0].replace('.html', '')) + '</a>'
          : '<span class="small">no lesson yet — needs a new chapter</span>';
        return '<tr><td>' + esc(r.subject) + '</td><td>' + esc(r.topic) + '</td>' +
          '<td><span class="tag" style="background:' + colour[r.status] + '22;color:' + colour[r.status] + '">' + r.status + '</span></td>' +
          '<td>' + r.hits + '</td><td class="small">' + link + '</td></tr>';
      }).join('') + '</table>';
  }
  html += '<h2>Question shapes</h2>' +
    '<table><tr><th>Shape</th><th>Legacy bank (sampled)</th><th>Paper-shape bank</th></tr>' +
    SHAPES.map(function (pair) {
      const name = pair[0];
      const old = shapeCounts[name] || 0;
      const now = paperShapeBank.byShape[name] || 0;
      return '<tr><td>' + esc(name) + '</td><td>' + old + '</td><td>' +
        (now ? now : '<span class="small">—</span>') + '</td></tr>';
    }).join('') +
    '</table>' +
    '<p class="small">The first column is the existing bank, sampled (' + sample.length + ' questions): it is recall, so the paper shapes are near zero. ' +
    'The second column is the generated bank (<code>data/upsc-format-questions.json</code>), written shape by shape from the thinnest topics upward, ' +
    'and only items that pass validation 4 options / one key / a real explanation are stored. Total so far: <b>' + paperShapeBank.total + '</b>.</p>';

  for (const subject of Object.keys(report.subjects)) {
    html += '<h2>' + esc(subject) + '</h2><table><tr><th>Topic</th><th>Status</th><th>Mentions</th><th>Taught in</th></tr>';
    report.subjects[subject].forEach((r) => {
      const links = r.lessons.map((l) => '<a href="../' + esc(l.lesson) + '">' + esc(l.lesson.split('/').slice(-1)[0].replace('.html', '')) + '</a>').join(' · ');
      html += '<tr><td>' + esc(r.topic) + '</td><td><span class="tag" style="background:' + colour[r.status] +
        '22;color:' + colour[r.status] + '">' + r.status + '</span></td><td>' + r.hits + '</td><td class="small">' + (links || '—') + '</td></tr>';
    });
    html += '</table>';
  }

  html += '<p class="small" style="margin-top:24px">Mentions are keyword hits in lesson bodies, capped per lesson. "Covered" means at least ' + COVERED +
    ' mentions somewhere in the corpus, "thin" ' + THIN + '–' + (COVERED - 1) + ', below that it is a gap. This is a reading of the corpus, not a promise about the paper.</p>' +
    '</div></body></html>';

  fs.mkdirSync(path.dirname(OUT_PAGE), { recursive: true });
  fs.writeFileSync(OUT_PAGE, html, 'utf8');

  console.log('syllabus coverage: ' + covered + '/' + totalTopics + ' covered (' + report.summary.coveragePct + '%), ' +
    thin + ' thin, ' + missing + ' missing');
  console.log('question shapes: ' + Object.keys(shapeCounts).map((k) => k + ' ' + shapeCounts[k]).join(', '));
  console.log('wrote ' + path.relative(ROOT, OUT_JSON) + ' and ' + path.relative(ROOT, OUT_PAGE));
}

main();
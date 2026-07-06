const fs = require('fs');
const path = require('path');
const https = require('https');

async function httpGet(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const opts = new URL(url);
        opts.headers = { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' };
        const req = https.get(opts, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            if (res.statusCode === 429) return reject(Object.assign(new Error(d.slice(0, 200)), { status: 429 }));
            if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
            resolve(JSON.parse(d));
          });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return result;
    } catch (e) {
      if (e.status === 429 && attempt < retries) {
        const wait = (attempt + 2) * 10000;
        console.log(`  ⏳ rate limited, waiting ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

async function wikiCategoryMembers(category) {
  let all = [], cmcontinue = '';
  while (true) {
    let url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=500&format=json&cmtype=page`;
    if (cmcontinue) url += `&cmcontinue=${encodeURIComponent(cmcontinue)}`;
    const d = await httpGet(url);
    all = all.concat(d.query.categorymembers.map(m => m.title));
    cmcontinue = d.continue?.cmcontinue;
    if (!cmcontinue) break;
    await new Promise(r => setTimeout(r, 200));
  }
  return all.filter(t => !t.startsWith('List of ') && !t.includes('/'));
}

async function titlesToQids(titles) {
  const map = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(batch.join('|'))}&format=json`;
    const d = await httpGet(url);
    for (const [, page] of Object.entries(d.query.pages))
      if (page.pageprops?.wikibase_item) map[page.title] = page.pageprops.wikibase_item;
    await new Promise(r => setTimeout(r, 200));
  }
  return map;
}

function sparql(query) {
  return httpGet('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query));
}

async function wikiSummary(title) {
  if (!title) return null;
  try {
    const d = await httpGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (d.type === 'disambiguation' || !d.extract) return null;
    return { extract: d.extract, thumbnail: d.thumbnail?.source };
  } catch { return null; }
}

// ====== SHARED TEXT UTILITIES (from wikidata-multi-fetch) ======
function cleanText(s) {
  if (!s) return '';
  return s.replace(/\s+\.\s*(\d)/g, '.$1').replace(/(\d)\s+km2/g, '$1 km²').replace(/�/g, '').replace(/\s{2,}/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
}
function sentenceScore(s) {
  let score = 0;
  const t = s.toLowerCase();
  const kw = ['largest','smallest','oldest','newest','highest','lowest','deepest','longest','only','first','unique','world heritage','biosphere reserve','tiger reserve','ramsar','endangered','known for','famous for','rare','origin','meaning','species','population'];
  for (const k of kw) { if (t.includes(k)) score += 2; }
  const nums = s.match(/[\d,]+/g);
  if (nums) score += Math.min(nums.length, 3);
  if (s.length > 30 && s.length < 180) score += 1;
  if (s.length >= 180) score -= 1;
  if (/^(it|this|the)\s+is\s+a/i.test(t)) score -= 2;
  if (/river|lake|mountain|valley|peak|temple|fort|tribe|species|bird|animal|plant/i.test(t)) score += 1;
  return score;
}
function pickSentences(text) {
  if (!text) return [];
  const raw = cleanText(text.replace(/\([^)]*\)/g, ''));
  return raw.split(/(?:\.|!|\?)(?:\s+|$)/).map(s => s.trim()).filter(s => s.length > 15 && !/^[,.\s]*$/.test(s));
}
function buildDesc(text) {
  const sents = pickSentences(text);
  if (!sents.length) return '';
  const scored = sents.map((s, i) => ({ s, i, score: sentenceScore(s) }));
  const kept = scored.filter(x => x.score > -1);
  kept.sort((a, b) => a.i - b.i);
  return kept.slice(0, 3).map(x => x.s).join('. ') + '.';
}
function buildFacts(text, desc) {
  const sents = pickSentences(text);
  if (!sents.length) return '';
  const scored = sents.map(s => ({ s, score: sentenceScore(s) }));
  let pool = scored.filter(x => x.score > -1);
  pool.sort((a, b) => b.score - a.score);
  const descPreviews = new Set();
  if (desc) for (const s of desc.split(/[.!]+/)) descPreviews.add(s.slice(0, 40).toLowerCase().replace(/\s+/g, ''));
  const seen = new Set();
  const out = [];
  for (const x of pool) {
    const key = x.s.slice(0, 40).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key) || descPreviews.has(key)) continue;
    seen.add(key);
    out.push(x.s);
    if (out.length >= 4) break;
  }
  if (out.length < 2 && scored.length >= 2) {
    for (const x of scored) {
      const key = x.s.slice(0, 40).toLowerCase().replace(/\s+/g, '');
      if (!seen.has(key)) { seen.add(key); out.push(x.s); }
      if (out.length >= 4) break;
    }
  }
  return out.slice(0, 4).join(' · ');
}
function assessQuality(e) {
  let s = 0;
  if (e.desc && e.desc.length >= 30) s += 2;
  if (e.fact && e.fact.length >= 30) s += 2;
  if (e.sub && e.sub.length > 5) s += 2;
  if (e.la && e.ln && e.la !== 0 && e.ln !== 0) s += 1;
  if (e.desc && !/^(it|this|the)\s+is\s+a/i.test(e.desc)) s += 2;
  if (e.desc && e.desc.length >= 60) s += 1;
  if (e.fact && e.fact.length >= 60) s += 1;
  return s >= 7 ? 'good' : s >= 3 ? 'low' : 'poor';
}

const NAME_ALIASES = {
  ganga:'ganges', ghaghara:'ghaghra', cauvery:'kaveri', pennar:'penna', sharavati:'sharavathi',
};
function normName(n) {
  let s = n.toLowerCase().replace(/\s+/g,' ')
    .replace(/\bnational park\b/g,'np').replace(/\bn\.p\.\b/g,'np')
    .replace(/\s+(river|lake|dam|peak|mountain|reserve|sanctuary|park|forest|glacier|island|falls|desert|cave|plateau|valley|gulf|bay|sea|point|np|tr|whs)$/i,'')
    .trim();
  return NAME_ALIASES[s] || s;
}

// ====== LOAD EXISTING DATA FOR DEDUP ======
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
const MANUAL_PATH = path.resolve(DATA_DIR, 'globe-manual.json');

function loadDedupSet() {
  const set = new Set();
  try {
    const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
    for (const e of manual) if (e.n) set.add(normName(e.n));
  } catch {}
  try {
    const html = fs.readFileSync(GLOBE_PATH, 'utf8');
    const globCats = ['tiger','wildlife','biosphere','ramsar','peak','desert','waterfall','glacier','volcano','railway','hill','tower','forest','port','airport','island','lake','river','dam','national_park','unesco','city'];
    for (const gc of globCats) {
      const rx = new RegExp(`D\\.${gc}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'i');
      const m = rx.exec(html);
      if (!m) continue;
      const nameRx = /n\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      let nm; while ((nm = nameRx.exec(m[1])) !== null) set.add(normName(nm[1]));
    }
  } catch {}
  // Also load existing wiki-*.json files for same-category dedup
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('wiki-') && f.endsWith('.json'));
    for (const f of files) {
      const entries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      for (const e of entries) if (e.n) set.add(normName(e.n));
    }
  } catch {}
  return set;
}

// ====== CATEGORY CONFIGS ======
const CFG = [
  { id:'tiger', label:'Tiger Reserves', wikiCat:'Category:Tiger_reserves_of_India', subFn:(s,a)=>[s,'Tiger Reserve'].filter(Boolean).join(' · ') },
  { id:'ramsar', label:'Ramsar Sites', wikiCat:'Category:Ramsar_sites_in_India', subFn:(s,a)=>[s,'Ramsar site'].filter(Boolean).join(' · ') },
  { id:'biosphere', label:'Biosphere Reserves', wikiCat:'Category:Biosphere_reserves_of_India', subFn:(s,a)=>[s,'Biosphere Reserve'].filter(Boolean).join(' · ') },
  { id:'wildlife', label:'Wildlife Sanctuaries', wikiCat:'Category:Wildlife_sanctuaries_of_India', subFn:(s,a)=>[s,'Wildlife Sanctuary'].filter(Boolean).join(' · ') },
  { id:'peak', label:'Peaks', wikiCat:'Category:Mountains_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'desert', label:'Deserts', wikiCat:'Category:Deserts_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'waterfall', label:'Waterfalls', wikiCat:'Category:Waterfalls_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'glacier', label:'Glaciers', wikiCat:'Category:Glaciers_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'volcano', label:'Volcanoes', wikiCat:'Category:Volcanoes_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_pass', label:'Mountain Passes', wikiCat:'Category:Mountain_passes_of_India', subFn:(s,a)=>[s,'Pass'].filter(Boolean).join(' · ') },
  { id:'hill', label:'Hills', wikiCat:'Category:Hills_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'railway', label:'Railway Stations', wikiCat:'Category:Railway_stations_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'tower', label:'Towers', wikiCat:'Category:Towers_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'highway', label:'National Highways', wikiCat:'Category:National_highways_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'battle', label:'Battles', wikiCat:'Category:Battles_involving_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'bird', label:'Bird Sanctuaries', wikiCat:'Category:Bird_sanctuaries_of_India', subFn:(s,a)=>[s,'Bird Sanctuary'].filter(Boolean).join(' · ') },
  { id:'crop', label:'Crops', wikiCat:'Category:Crops_originating_from_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'institution', label:'Institutions', wikiCat:'Category:Universities_and_colleges_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'kingdom', label:'Former Kingdoms', wikiCat:'Category:Empires_and_kingdoms_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'mineral', label:'Minerals', wikiCat:'Category:Minerals_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'nuclear', label:'Nuclear Power Stations', wikiCat:'Category:Nuclear_power_stations_in_India', subFn:(s,a)=>[s,'Nuclear Station'].filter(Boolean).join(' · ') },
  { id:'temple', label:'Temples', wikiCat:'Category:Hindu_temples_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
];

// ====== PROCESS CATEGORY ======
async function processCat(cat, dedupSet) {
  console.log(`\n▓ ${cat.label} (${cat.wikiCat})`);
  const titles = await wikiCategoryMembers(cat.wikiCat);
  console.log(`  Wikipedia: ${titles.length} pages in category`);
  if (!titles.length) return [];

  const titleQid = await titlesToQids(titles);
  const valid = Object.entries(titleQid).filter(([, qid]) => qid && /^Q\d+$/.test(qid));
  console.log(`  QIDs found: ${valid.length}`);
  if (!valid.length) return [];

  // Batch SPARQL for coords & state
  let sparqlResult;
  try {
    const qidList = valid.map(([, q]) => `wd:${q}`).join(' ');
    const q = `SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { ${qidList} }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`;
    sparqlResult = await sparql(q);
  } catch (e) { console.log(`  ✗ SPARQL failed: ${e.message}`); return []; }

  const coordMap = new Map();
  for (const b of sparqlResult.results.bindings) {
    const qid = b.item.value.split('/').pop();
    const m = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) continue;
    const e = coordMap.get(qid) || { la: 0, ln: 0, states: [] };
    e.la = parseFloat(parseFloat(m[2]).toFixed(6));
    e.ln = parseFloat(parseFloat(m[1]).toFixed(6));
    if (b.stateLabel?.value && !e.states.includes(b.stateLabel.value)) e.states.push(b.stateLabel.value);
    coordMap.set(qid, e);
  }
  console.log(`  With coords: ${coordMap.size}`);

  const out = [];
  let n = 0, skipped = 0;
  for (const [title, qid] of valid) {
    if (n >= 60) break;
    const coord = coordMap.get(qid);
    if (!coord) continue;
    if (dedupSet.has(normName(title))) { skipped++; continue; }
    dedupSet.add(normName(title)); // prevent future dedup within same run

    const state = coord.states?.join(', ') || '';
    const sub = cat.subFn(state, '');

    let wd;
    try {
      wd = await wikiSummary(title);
      await new Promise(r => setTimeout(r, 600));
    } catch {}
    const txt = wd?.extract || '';
    const desc = buildDesc(txt);
    const fact = buildFacts(txt, desc) || desc || state;
    const factText = fact || desc || state;

    const entry = {
      n: title, la: coord.la, ln: coord.ln, sub,
      desc: desc || factText.slice(0, 200),
      fact: factText,
      img: wd?.thumbnail || '',
      _cat: cat.id,
      _quality: 'good'
    };
    entry._quality = assessQuality(entry);
    if (entry._quality === 'poor' || entry.desc.length < 15 || entry.fact.length < 15 || entry.sub.length < 3 || entry.la === 0) continue;
    out.push(entry);
    n++;
    await new Promise(r => setTimeout(r, 100));
    if (n % 3 === 0) { console.log(`  ...${n} entries`); }
  }
  console.log(`  ${out.length} clean (${skipped} dedup skip)`);
  return out;
}

// ====== MAIN ======
async function main() {
  console.log('=== Wikipedia Category Fetch ===\n');
  const dedupSet = loadDedupSet();
  console.log(`Loaded ${dedupSet.size} names for dedup`);

  // Check which categories already have output files (resume support)
  const skipCats = [];
  const runCats = [];
  for (const cat of CFG) {
    const fp = path.join(DATA_DIR, `wiki-${cat.id}.json`);
    try {
      const existing = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (existing.length > 0) {
        skipCats.push({ ...cat, existing: existing.length });
        continue;
      }
    } catch {}
    runCats.push(cat);
  }

  if (skipCats.length) {
    console.log(`Skipping ${skipCats.length} already-completed categories:`);
    for (const c of skipCats) console.log(`  ✅ ${c.id} (${c.existing} entries)`);
    console.log();
  }

  for (let i = 0; i < runCats.length; i++) {
    const cat = runCats[i];
    console.log(`[${i+1}/${runCats.length}]`);
    const entries = await processCat(cat, dedupSet);
    const fp = path.join(DATA_DIR, `wiki-${cat.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf8');
    console.log(`  → data/wiki-${cat.id}.json`);
    if (i < runCats.length - 1) await new Promise(r => setTimeout(r, 5000));
  }
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
// Force all logging through stderr (unbuffered) so GitHub Actions shows output in real-time
const log = console.log;
console.log = (...a) => { process.stderr.write(a.join(' ') + '\n'); };

// Global rate limiter — enforces minimum gap between all API calls
let lastRequestTime = 0;
let firstRequest = true;
async function rateLimit(minGapMs = 1500) {
  // Warm-up delay on first ever call: give IP a cooldown from previous workflow runs
  if (firstRequest) {
    firstRequest = false;
    console.log(`  🕐 initial cooldown 3s...`);
    await new Promise(r => setTimeout(r, 3000));
    lastRequestTime = Date.now();
    return;
  }
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < minGapMs) {
    await new Promise(r => setTimeout(r, minGapMs - elapsed));
  }
  lastRequestTime = Date.now();
}

async function httpGet(url, retries = 8) {
  await rateLimit(500);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'studypro-wiki/1.0 (gk-bot; contact: bot@vlymbooq.qzz.io)' } }, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            if (res.statusCode === 429) return reject(Object.assign(new Error(d.slice(0, 200)), { status: 429 }));
            if (res.statusCode >= 400) return reject(Object.assign(new Error(d.slice(0, 200)), { status: res.statusCode }));
            resolve(JSON.parse(d.replace(/[\x00-\x1F]/g, ' ')));
          });
        });
        req.on('error', reject);
        req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return result;
    } catch (e) {
      if (attempt < retries && (e.status === 429 || (e.status >= 500 && e.status <= 599))) {
        const wait = Math.min((attempt + 1) * 3000 + Math.floor(Math.random() * 2000), 120000);
        console.log(`  ⏳ retry ${attempt+1}/${retries} (${e.status || 'err'}), waiting ${Math.round(wait/1000)}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

async function wikiCategoryDeepMembers(category, maxPages = 5000, visited = new Set(), depth = 0, maxDepth = 2) {
  if (visited.has(category) || depth > maxDepth) return [];
  visited.add(category);

  let pages = [], subcats = [], cmcontinue = '';
  while (pages.length < maxPages) {
    let url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=500&format=json&cmtype=page|subcat`;
    if (cmcontinue) url += `&cmcontinue=${encodeURIComponent(cmcontinue)}`;
    const d = await httpGet(url);
    for (const m of d.query.categorymembers) {
      if (m.ns === 14 && depth < maxDepth) subcats.push(m.title);
      else if (m.ns === 0) pages.push(m.title);
    }
    cmcontinue = d.continue?.cmcontinue;
    if (!cmcontinue) break;
  }

  let result = pages.filter(t => !t.startsWith('List of ') && !t.includes('/'));

  for (const sc of subcats) {
    if (result.length >= maxPages) break;
    const subPages = await wikiCategoryDeepMembers(sc, maxPages - result.length, visited, depth + 1, maxDepth);
    result = result.concat(subPages);
  }

  return result;
}

async function titlesToQids(titles) {
  const map = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(batch.join('|'))}&format=json`;
    const d = await httpGet(url);
    for (const [, page] of Object.entries(d.query.pages))
      if (page.pageprops?.wikibase_item) map[page.title] = page.pageprops.wikibase_item;
    await new Promise(r => setTimeout(r, 1000));
  }
  return map;
}

async function httpPost(url, data, retries = 8) {
  const postData = typeof data === 'string' ? data : new URLSearchParams(data).toString();
  await rateLimit(2000);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = {
          hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData), 'User-Agent': 'studypro-wiki/1.0 (gk-bot; contact: bot@vlymbooq.qzz.io)' }
        };
        const req = https.request(opts, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            if (res.statusCode === 429) return reject(Object.assign(new Error(d.slice(0, 200)), { status: 429 }));
            if (res.statusCode >= 400) return reject(Object.assign(new Error(d.slice(0, 200)), { status: res.statusCode }));
            resolve(JSON.parse(d.replace(/[\x00-\x1F]/g, ' ')));
          });
        });
        req.on('error', reject);
        req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(postData);
        req.end();
      });
      return result;
    } catch (e) {
      if (attempt < retries && (e.status === 429 || (e.status >= 500 && e.status <= 599))) {
        const wait = Math.min((attempt + 1) * 3000 + Math.floor(Math.random() * 2000), 120000);
        console.log(`  ⏳ SPARQL retry ${attempt+1}/${retries} (${e.status || 'err'}), waiting ${Math.round(wait/1000)}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

function sparql(query) {
  return httpPost('https://query.wikidata.org/sparql', `format=json&query=${encodeURIComponent(query)}`);
}

async function sparqlBatch(queryTemplate, qidArray, batchSize = 500) {
  const allBindings = [];
  for (let i = 0; i < qidArray.length; i += batchSize) {
    const batch = qidArray.slice(i, i + batchSize);
    const q = queryTemplate.replace('QIDS', batch.map(q => `wd:${q}`).join(' '));
    try {
      const result = await sparql(q);
      if (result?.results?.bindings) allBindings.push(...result.results.bindings);
    } catch (e) {
      console.log(`  ⚠ SPARQL batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(qidArray.length / batchSize)} failed: ${e.message}`);
    }
  }
  return { results: { bindings: allBindings } };
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
fs.mkdirSync(DATA_DIR, { recursive: true });

const MANUAL_PATH = path.resolve(DATA_DIR, 'globe-manual.json');

function loadDedupSet() {
  const set = new Set();
  try {
    const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
    for (const e of manual) if (e.n) set.add(normName(e.n));
  } catch {}
  try {
    const html = fs.readFileSync(GLOBE_PATH, 'utf8');
    const globCats = ['tiger','wildlife','biosphere','ramsar','peak','desert','waterfall','glacier','volcano','railway','hill','tower','forest','port','airport','island','lake','river','dam','national_park','unesco','city','i_fort','i_palace','i_lake','i_glacier','i_waterfall','i_island','i_cave','i_bridge','i_tunnel','i_stadium','i_observatory','i_zoo','rl_zone','pipeline','refinery','fertilizer','cement','power_plant','steel_plant','tribe','i_freedom','i_medieval','i_colonial','i_movement','i_pilgrimage','personality','dynasty','organization','irrigation','drainage','physiographic','soil','monsoon','vegetation','seismic_zone','biogeographic_zone','industrial','wind','cloud','rainfall','latitude','trade','phenomena','dfc','i_corridor','border_road','ocean','fjord','atoll','oasis','salt_flat','mangrove','ice_shelf','ocean_ridge','ridge','seamount','capital','ice_cap','biome','climate_zone','cyclone_region','tornado_region','time_zone','basin','crater','ecoregion','estuary','lagoon','mesa','museum','religious','shipwreck','spaceport','statue','wind_farm','zoo','amusement_park','range','sea','valley','folk_dance','longitude','festival','language','cuisine','classical_dance','monument','mosque','church','archaeological_site','monastery','escarpment','geopark','ruler','freedom','traveller','tribal','i_book','invention','movement','corridor','writer','reformer','country','philosopher','artist','architect','w_politician','w_dynasty'];
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
  // Blocklist: alternate names for the same site (removed duplicates or non-Ramsar entries)
  const blocklist = [
    'Sambhar Salt Lake','Bhitarkanika Mangroves','Harike Wetland','Maharana Pratap Sagar',
    'Hokersar','Nandur Madhmeshwar Bird Sanctuary','Asan Barrage','East Calcutta Wetlands',
    'Sultanpur NP (Ramsar)','Point Calimere Wildlife and Bird Sanctuary','Kanjli Wetland',
    'Ropar Lake','Thol Lake Bird Sanctuary','Bhindawas Lake','Karavetti Bird Sanctuary',
    'Kabartal Lake','Koothankulam Bird Sanctuary',
    'Ranganthittu Bird Sanctuary','Vellode Lake','Vedanthangal Lake','Udhayamarthandapuram',
    'Nagi-Nakti Bird Sanctuaries','Kerala backwaters','Kodiyampalayam',
  ];
  for (const name of blocklist) set.add(normName(name));
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
  { id:'railway', label:'Railway Stations', wikiCat:['Category:Railway_stations_in_India','Category:Railway_lines_in_India','Category:Railway_junction_stations_in_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'tower', label:'Skyscrapers', wikiCat:'Category:Skyscrapers',
    subFn:(s,a)=>[s].filter(Boolean).join(' · '),
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'highway', label:'National Highways', wikiCat:['Category:National_highways_in_India','Category:Expressways_in_India','Category:State_highways_in_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'battle', label:'Battles', wikiCat:'Category:Battles_involving_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'w_battle', label:'World Battles', wikiCat:'Category:Battles', subFn:(s,a)=>s },
  { id:'bird', label:'Bird Sanctuaries', wikiCat:'Category:Bird_sanctuaries_of_India', subFn:(s,a)=>[s,'Bird Sanctuary'].filter(Boolean).join(' · ') },
  { id:'crop', label:'Crops', wikiCat:'Category:Crops_originating_from_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'institution', label:'Institutions', wikiCat:['Category:Universities_and_colleges_in_India','Category:Research_institutes_in_India','Category:Museums_in_India','Category:Libraries_in_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'kingdom', label:'Former Kingdoms', wikiCat:'Category:Empires_and_kingdoms_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'mineral', label:'Minerals', wikiCat:'Category:Minerals_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'nuclear', label:'Nuclear Power Stations', wikiCat:'Category:Nuclear_power_stations_in_India', subFn:(s,a)=>[s,'Nuclear Station'].filter(Boolean).join(' · ') },
  { id:'temple', label:'Temples', wikiCat:'Category:Hindu_temples_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_fort', label:'Forts', wikiCat:'Category:Forts_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_palace', label:'Palaces', wikiCat:'Category:Palaces_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_lake', label:'Lakes', wikiCat:'Category:Lakes_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_glacier', label:'Glaciers', wikiCat:'Category:Glaciers_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_waterfall', label:'Waterfalls', wikiCat:'Category:Waterfalls_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_island', label:'Islands', wikiCat:'Category:Islands_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_cave', label:'Caves', wikiCat:'Category:Caves_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_bridge', label:'Bridges', wikiCat:'Category:Bridges_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_tunnel', label:'Tunnels', wikiCat:'Category:Tunnels_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_stadium', label:'Stadiums', wikiCat:'Category:Stadiums_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_observatory', label:'Observatories', wikiCat:'Category:Observatories_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_zoo', label:'Zoos', wikiCat:'Category:Zoos_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'rl_zone', label:'Railway Zones', wikiCat:'Category:Indian_Railway_zones', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'pipeline', label:'Pipelines', wikiCat:'Category:Pipelines_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'refinery', label:'Refineries', wikiCat:'Category:Oil_refineries_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'fertilizer', label:'Fertilizer Plants', wikiCat:'Category:Fertilizer_plants_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'cement', label:'Cement Plants', wikiCat:'Category:Cement_plants_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'power_plant', label:'Power Stations', wikiCat:'Category:Power_stations_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'steel_plant', label:'Steel Plants', wikiCat:'Category:Steel_plants_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'tribe', label:'Tribes', wikiCat:'Category:Tribes_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_freedom', label:'Freedom Movement Sites', wikiCat:'Category:Indian_independence_movement', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_medieval', label:'Medieval Sites', wikiCat:['Category:Archaeological_sites_in_India','Category:Medieval_history_of_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_colonial', label:'Colonial Sites', wikiCat:['Category:Colonial_India','Category:British_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_movement', label:'Social Movements', wikiCat:'Category:Social_movements_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_pilgrimage', label:'Pilgrimage Sites', wikiCat:['Category:Pilgrimage_in_India','Category:Hindu_pilgrimage_sites'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  // Remaining categories to wire into fetch+part11 pipeline
  { id:'dynasty', label:'Dynasties', wikiCat:'Category:Dynasties_of_India',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P36/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_dynasty', label:'World Dynasties', wikiCat:'Category:Dynasties',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P36/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'organization', label:'Organizations', wikiCat:['Category:Indian_nationalist_political_parties','Category:Political_organisations_based_in_India','Category:Social_organisations_of_India'], subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'personality', label:'Historical Figures', wikiCat:['Category:Indian_businesspeople','Category:Indian_educators','Category:Indian_saints','Category:Indian_politicians'],
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }` },
  { id:'irrigation', label:'Irrigation Projects', wikiCat:'Category:Irrigation_in_India', subFn:(s,a)=>s },
  { id:'drainage', label:'Drainage Basins', wikiCat:'Category:Drainage_basins_of_India', subFn:(s,a)=>s },
  { id:'physiographic', label:'Physiographic Divisions', wikiCat:'Category:Landforms_of_India', subFn:(s,a)=>s },
  { id:'soil', label:'Soil Types', wikiCat:'Category:Soils_of_India', subFn:(s,a)=>s },
  { id:'monsoon', label:'Monsoon', wikiCat:'Category:Monsoon', subFn:(s,a)=>s },
  { id:'vegetation', label:'Vegetation Types', wikiCat:'Category:Vegetation_of_India', subFn:(s,a)=>s },
  { id:'seismic_zone', label:'Seismic Zones', wikiCat:'Category:Seismic_zones_of_India', subFn:(s,a)=>s },
  { id:'biogeographic_zone', label:'Biogeographic Zones', wikiCat:'Category:Biogeographic_regions_of_India', subFn:(s,a)=>s },
  { id:'industrial', label:'Industrial Regions', wikiCat:'Category:Industrial_regions_in_India', subFn:(s,a)=>s },
  { id:'wind', label:'Wind Patterns', wikiCat:'Category:Wind', maxDepth:1, subFn:(s,a)=>s },
  { id:'cloud', label:'Cloud Types', wikiCat:['Category:Cloud_types','Category:Clouds','Category:Cloud_and_fog_phenomena'], subFn:(s,a)=>s },
  { id:'rainfall', label:'Rainfall Records', wikiCat:['Category:Weather_records','Category:Rain','Category:Precipitation'], subFn:(s,a)=>s },
  { id:'latitude', label:'Latitude Lines', wikiCat:'Category:Lines_of_latitude', subFn:(s,a)=>s },
  { id:'trade', label:'Trade Routes', wikiCat:'Category:Trade_routes', subFn:(s,a)=>s },
  { id:'phenomena', label:'Natural Phenomena', wikiCat:'Category:Natural_phenomena', subFn:(s,a)=>s },
  { id:'dfc', label:'Dedicated Freight Corridors', wikiCat:'Category:Dedicated_freight_corridors_in_India', subFn:(s,a)=>s },
  { id:'i_corridor', label:'Industrial Corridors', wikiCat:'Category:Industrial_corridors_in_India', subFn:(s,a)=>s },
  { id:'border_road', label:'Border Roads', wikiCat:'Category:Border_Roads_Organisation', subFn:(s,a)=>s },
  { id:'longitude', label:'Lines of Longitude', wikiCat:'Category:Lines_of_longitude', subFn:(s,a)=>s },
  { id:'festival', label:'Festivals', wikiCat:'Category:Festivals_in_India', subFn:(s,a)=>s+' · Festival' },
  { id:'language', label:'Languages', wikiCat:'Category:Languages_of_India', maxDepth:1, subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'cuisine', label:'Regional Cuisines', wikiCat:'Category:Indian_cuisine', subFn:(s,a)=>s+' · Cuisine' },
  { id:'classical_dance', label:'Classical Dances', wikiCat:'Category:Dances_of_India', subFn:(s,a)=>s+' · Classical Dance' },
  { id:'monument', label:'Monuments & Memorials', wikiCat:'Category:Monuments_and_memorials_in_India', subFn:(s,a)=>s },
  { id:'mosque', label:'Mosques', wikiCat:'Category:Mosques_in_India', subFn:(s,a)=>s },
  { id:'church', label:'Churches', wikiCat:'Category:Churches_in_India', subFn:(s,a)=>s },
  { id:'archaeological_site', label:'Archaeological Sites', wikiCat:'Category:Archaeological_sites_in_India', maxDepth:1, subFn:(s,a)=>s },
  { id:'monastery', label:'Monasteries', wikiCat:'Category:Monasteries_in_India', subFn:(s,a)=>s },
  { id:'castle', label:'Castles', wikiCat:'Category:Castles_in_India', subFn:(s,a)=>s },
  { id:'cathedral', label:'Cathedrals', wikiCat:'Category:Cathedrals_in_India', subFn:(s,a)=>s },
  { id:'embassy', label:'Embassies', wikiCat:'Category:Diplomatic_missions_in_India', subFn:(s,a)=>s },
  { id:'harbor', label:'Harbours & Ports', wikiCat:'Category:Ports_and_harbours_of_India', subFn:(s,a)=>s },
  { id:'market', label:'Markets', wikiCat:'Category:Retail_markets_in_India', subFn:(s,a)=>s },
  { id:'park', label:'Parks', wikiCat:'Category:Parks_in_India', subFn:(s,a)=>s },
  { id:'reservoir', label:'Reservoirs', wikiCat:'Category:Reservoirs_in_India', subFn:(s,a)=>s },
  { id:'shrine', label:'Shrines', wikiCat:'Category:Shrines_in_India', subFn:(s,a)=>s },
  { id:'theatre', label:'Theatres', wikiCat:'Category:Theatres_in_India', subFn:(s,a)=>s },
  { id:'tomb', label:'Tombs', wikiCat:'Category:Tombs_in_India', subFn:(s,a)=>s },
  { id:'ruler', label:'Rulers & Emperors', wikiCat:['Category:Indian_monarchs','Category:Maharajas','Category:Monarchs_of_ancient_India','Category:Indian_royalty'],
    subFn:(s,a)=>[s,'Indian monarch'].filter(Boolean).join(' · '),
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }` },
  { id:'freedom', label:'Freedom Fighters', wikiCat:['Category:Indian_revolutionaries','Category:Indian_independence_activists','Category:Indian_independence_movement'],
    subFn:(s,a)=>[s,'Indian revolutionary'].filter(Boolean).join(' · '),
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }` },
  { id:'traveller', label:'Travellers & Explorers', wikiCat:['Category:Indian_explorers','Category:Explorers_of_India','Category:Explorers'],
    subFn:(s,a)=>[s,'Explorer'].filter(Boolean).join(' · '),
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }` },
  { id:'invention', label:'Inventions & Discoveries', wikiCat:['Category:Indian_inventions','Category:Indian_discoveries','Category:Inventions'], subFn:(s,a)=>s },
  { id:'movement', label:'Movements & Protests', wikiCat:['Category:Social_movements_in_India','Category:Indian_independence_movement','Category:Environmental_protests_in_India','Category:Political_movements_in_India'], subFn:(s,a)=>s },
  { id:'i_book', label:'Ancient Books & Texts',
    wikiCat:['Category:Ancient_Indian_literature','Category:Buddhist_texts','Category:Indian_poetry','Category:Indian_philosophical_texts','Category:Indian_religious_texts','Category:Indian_medical_texts','Category:Indian_astronomy_texts','Category:Indian_mathematical_texts','Category:Sangam_literature','Category:Historical_Indian_texts','Category:Indian_legal_texts','Category:Jain_texts','Category:Sikh_texts','Category:Indian_classical_drama','Category:Pali_literature','Category:Sanskrit_literature'],
    maxDepth:2,
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P50 ?author. { ?author wdt:P19/wdt:P625 ?coord. } UNION { ?author wdt:P20/wdt:P625 ?coord. } }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'tribal', label:'Tribal Regions', wikiCat:'Category:Adivasi', subFn:(s,a)=>s },
  { id:'corridor', label:'Wildlife Corridors', wikiCat:['Category:Elephant_reserves_of_India','Category:Wildlife_corridors','Category:Protected_areas_of_India'], subFn:(s,a)=>s },
  { id:'reformer', label:'Reformers & Thinkers', wikiCat:'Category:Indian_social_reformers',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'country', label:'Countries & Currencies', wikiCat:'Category:Member_states_of_the_United_Nations',
    subFn:(s,a,m)=>{
      let sub = s;
      if (m?.currencyLabel?.[0]) sub += ' · ' + m.currencyLabel[0];
      if (m?.capitalLabel?.[0]) sub += ' · ' + m.capitalLabel[0];
      return sub;
    },
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel ?capitalLabel ?currencyLabel WHERE {
      VALUES ?item { QIDS }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P36 ?capital. }
      OPTIONAL { ?item wdt:P38 ?currency. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'writer', label:'Writers & Poets', wikiCat:['Category:Indian_poets','Category:Indian_writers','Category:Indian_novelists','Category:Indian_dramatists_and_playwrights','Category:Indian_women_writers','Category:Indian_scholars'],
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'philosopher', label:'Philosophers', wikiCat:'Category:Indian_philosophers',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'artist', label:'Artists', wikiCat:'Category:Indian_artists',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'architect', label:'Architects', wikiCat:'Category:Indian_architects',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_philosopher', label:'World Philosophers', wikiCat:'Category:Philosophers',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_artist', label:'World Artists', wikiCat:'Category:Artists',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_architect', label:'World Architects', wikiCat:'Category:Architects',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_alliance', label:'World Alliances', wikiCat:'Category:Military_alliances', maxDepth:1, subFn:(s,a)=>s },
  { id:'judiciary', label:'High Courts', wikiCat:'Category:High_courts_of_India', subFn:(s,a)=>[s,'High Court'].filter(Boolean).join(' · ') },
  { id:'w_trade_bloc', label:'Trade Blocs', wikiCat:'Category:Trade_blocs', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_religion', label:'World Religions', wikiCat:'Category:Major_religious_groups', subFn:(s,a)=>s },
  { id:'space_mission', label:'Space Missions', wikiCat:'Category:Space_missions', subFn:(s,a)=>s },
  { id:'border', label:'Border Disputes', wikiCat:'Category:Border_disputes_involving_India', subFn:(s,a)=>s },
  { id:'w_nuclear_power', label:'Nuclear Powers', wikiCat:'Category:Nuclear_weapons_programmes', subFn:(s,a)=>s },
  { id:'scientist', label:'Scientists', wikiCat:'Category:Indian_scientists',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'sports', label:'Sports Figures', wikiCat:'Category:Indian_sportspeople',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  // World historical/political categories
  { id:'w_treaty', label:'World Treaties', wikiCat:'Category:Treaties', subFn:(s,a)=>s },
  { id:'w_war', label:'Major Wars', wikiCat:'Category:Wars', subFn:(s,a)=>s },
  { id:'w_revolution', label:'Revolutions', wikiCat:'Category:Revolutions', subFn:(s,a)=>s },
  { id:'w_disaster', label:'Disasters', wikiCat:'Category:Disasters', subFn:(s,a)=>s },
  { id:'w_civilization', label:'Ancient Civilizations', wikiCat:'Category:Ancient_civilizations', subFn:(s,a)=>s },
  { id:'w_empire', label:'World Empires', wikiCat:'Category:Empires', subFn:(s,a)=>s },
  { id:'w_kingdom', label:'Former Kingdoms', wikiCat:['Category:Former_kingdoms','Category:Empires','Category:Monarchies'], subFn:(s,a)=>s },
  { id:'w_ww1', label:'World War I', wikiCat:'Category:World_War_I', subFn:(s,a)=>s },
  { id:'w_ww2', label:'World War II', wikiCat:'Category:World_War_II', subFn:(s,a)=>s },
  // World landmark categories
  { id:'w_landmark', label:'World Landmarks', wikiCat:'Category:Landmarks', subFn:(s,a)=>s },
  { id:'w_castle', label:'World Castles', wikiCat:'Category:Castles', subFn:(s,a)=>s },
  { id:'w_cathedral', label:'World Cathedrals', wikiCat:'Category:Cathedrals', subFn:(s,a)=>s },
  { id:'w_embassy', label:'World Embassies', wikiCat:'Category:Diplomatic_missions', subFn:(s,a)=>s },
  { id:'w_harbor', label:'World Harbors', wikiCat:'Category:Ports_and_harbors', subFn:(s,a)=>s },
  { id:'w_market', label:'World Markets', wikiCat:'Category:Markets', subFn:(s,a)=>s },
  { id:'w_park', label:'World Parks', wikiCat:'Category:Urban_parks', subFn:(s,a)=>s },
  { id:'w_shrine', label:'World Shrines', wikiCat:'Category:Shrines', subFn:(s,a)=>s },
  { id:'w_theatre', label:'World Theatres', wikiCat:'Category:Theatres', subFn:(s,a)=>s },
  { id:'w_tomb', label:'World Tombs', wikiCat:'Category:Tombs', subFn:(s,a)=>s },
  { id:'w_hospital', label:'World Hospitals', wikiCat:'Category:Hospitals', subFn:(s,a)=>s },
  { id:'w_school', label:'World Schools', wikiCat:'Category:Schools', subFn:(s,a)=>s },
  { id:'w_university', label:'World Universities', wikiCat:'Category:Universities_and_colleges', subFn:(s,a)=>s },
  { id:'w_stadium', label:'World Stadiums', wikiCat:'Category:Stadiums', subFn:(s,a)=>s },
  // World geographic categories
  { id:'w_city', label:'World Cities', wikiCat:'Category:Cities', subFn:(s,a)=>s },
  { id:'w_river', label:'World Rivers', wikiCat:'Category:Rivers', subFn:(s,a)=>s },
  { id:'w_peak', label:'World Peaks', wikiCat:'Category:Mountains', subFn:(s,a)=>s },
  { id:'w_np', label:'World National Parks', wikiCat:'Category:National_parks', subFn:(s,a)=>s },
  { id:'w_bridge', label:'World Bridges', wikiCat:'Category:Bridges', subFn:(s,a)=>s },
  { id:'w_airport', label:'World Airports', wikiCat:'Category:Airports', subFn:(s,a)=>s },
  { id:'w_dam', label:'World Dams', wikiCat:'Category:Dams', subFn:(s,a)=>s },
  { id:'w_pass', label:'World Mountain Passes', wikiCat:'Category:Mountain_passes', subFn:(s,a)=>s },
  { id:'w_bay', label:'World Bays', wikiCat:'Category:Bays', subFn:(s,a)=>s },
  { id:'w_cave', label:'World Caves', wikiCat:'Category:Caves', subFn:(s,a)=>s },
  { id:'w_gorge', label:'World Gorges', wikiCat:'Category:Gorges', subFn:(s,a)=>s },
  { id:'w_archipelago', label:'World Archipelagos', wikiCat:'Category:Archipelagoes', subFn:(s,a)=>s },
  { id:'w_geyser', label:'Geysers', wikiCat:'Category:Geysers', subFn:(s,a)=>s },
  { id:'w_isthmus', label:'Isthmuses', wikiCat:'Category:Isthmuses', subFn:(s,a)=>s },
  { id:'w_spring', label:'Springs', wikiCat:'Category:Springs_(hydrology)', subFn:(s,a)=>s },
  { id:'w_coast', label:'Coasts', wikiCat:'Category:Coasts', subFn:(s,a)=>s },
  { id:'w_trench', label:'Ocean Trenches', wikiCat:'Category:Oceanic_trenches', subFn:(s,a)=>s },
  { id:'w_plate', label:'Tectonic Plates', wikiCat:'Category:Tectonic_plates', subFn:(s,a)=>s },
  { id:'w_meteorite', label:'Meteorites', wikiCat:'Category:Meteorites', subFn:(s,a)=>s },
  { id:'w_organization', label:'World Organizations', wikiCat:'Category:Organizations', subFn:(s,a)=>s },
  { id:'w_inst', label:'World Institutions', wikiCat:['Category:Research_institutes','Category:Educational_institutions','Category:International_institutions'], subFn:(s,a)=>s },
  // General geographic categories
  { id:'strait', label:'Straits', wikiCat:'Category:Straits', subFn:(s,a)=>s },
  { id:'peninsula', label:'Peninsulas', wikiCat:'Category:Peninsulas', subFn:(s,a)=>s },
  { id:'gulf', label:'Gulfs', wikiCat:'Category:Gulfs', subFn:(s,a)=>s },
  { id:'canal', label:'Canals', wikiCat:'Category:Canals', subFn:(s,a)=>s },
  { id:'reef', label:'Reefs', wikiCat:'Category:Reefs', subFn:(s,a)=>s },
  { id:'ridge', label:'Ridges', wikiCat:['Category:Ridges','Category:Escarpments'], subFn:(s,a)=>s },
  { id:'canyon', label:'Canyons', wikiCat:'Category:Canyons_and_gorges', subFn:(s,a)=>s },
  { id:'cape', label:'Capes', wikiCat:'Category:Capes_(geography)', subFn:(s,a)=>s },
  { id:'delta', label:'Deltas', wikiCat:'Category:River_deltas', subFn:(s,a)=>s },
  { id:'plain', label:'Plains', wikiCat:'Category:Plains', subFn:(s,a)=>s },
  { id:'current', label:'Ocean Currents', wikiCat:'Category:Ocean_currents', subFn:(s,a)=>s },
  { id:'lighthouse', label:'Lighthouses', wikiCat:'Category:Lighthouses', subFn:(s,a)=>s },
  { id:'ocean', label:'Oceans', wikiCat:'Category:Oceans', subFn:(s,a)=>s },
  { id:'fjord', label:'Fjords', wikiCat:'Category:Fjords', subFn:(s,a)=>s },
  { id:'atoll', label:'Atolls', wikiCat:'Category:Atolls', subFn:(s,a)=>s },
  { id:'oasis', label:'Oases', wikiCat:'Category:Oases', subFn:(s,a)=>s },
  { id:'salt_flat', label:'Salt Flats', wikiCat:'Category:Salt_flats', subFn:(s,a)=>s },
  { id:'mangrove', label:'Mangroves', wikiCat:'Category:Mangroves', subFn:(s,a)=>s },
  { id:'ice_shelf', label:'Ice Shelves', wikiCat:'Category:Ice_shelves', subFn:(s,a)=>s },
  { id:'ocean_ridge', label:'Ocean Ridges', wikiCat:'Category:Oceanic_ridges', subFn:(s,a)=>s },
  { id:'seamount', label:'Seamounts', wikiCat:'Category:Seamounts', subFn:(s,a)=>s },
  { id:'ice_cap', label:'Ice Caps', wikiCat:'Category:Ice_caps', subFn:(s,a)=>s },
  { id:'biome', label:'Biomes', wikiCat:'Category:Biomes', subFn:(s,a)=>s },
  { id:'climate_zone', label:'Climate Zones', wikiCat:'Category:Climate_zones', subFn:(s,a)=>s },
  { id:'cyclone_region', label:'Cyclone Regions', wikiCat:'Category:Tropical_cyclones', subFn:(s,a)=>s },
  { id:'tornado_region', label:'Tornado Regions', wikiCat:'Category:Tornadoes', subFn:(s,a)=>s },
  { id:'time_zone', label:'Time Zones', wikiCat:'Category:Time_zones', subFn:(s,a)=>s },
  { id:'basin', label:'Drainage Basins', wikiCat:'Category:Drainage_basins', subFn:(s,a)=>s },
  { id:'crater', label:'Impact Craters', wikiCat:'Category:Impact_craters', subFn:(s,a)=>s },
  { id:'ecoregion', label:'Ecoregions', wikiCat:'Category:Ecoregions', subFn:(s,a)=>s },
  { id:'estuary', label:'Estuaries', wikiCat:'Category:Estuaries', subFn:(s,a)=>s },
  { id:'lagoon', label:'Lagoons', wikiCat:'Category:Lagoons', subFn:(s,a)=>s },
  { id:'mesa', label:'Mesas', wikiCat:'Category:Mesas', subFn:(s,a)=>s },
  { id:'museum', label:'Museums', wikiCat:'Category:Museums', subFn:(s,a)=>s },
  { id:'spaceport', label:'Spaceports', wikiCat:'Category:Spaceports', subFn:(s,a)=>s },
  { id:'statue', label:'Statues', wikiCat:'Category:Statues', subFn:(s,a)=>s },
  { id:'geopark', label:'Geoparks', wikiCat:'Category:Geoparks', subFn:(s,a)=>s },
  { id:'waterway', label:'Waterways', wikiCat:'Category:Waterways', subFn:(s,a)=>s },
  { id:'valley', label:'Valleys', wikiCat:'Category:Valleys', subFn:(s,a)=>s },
  { id:'tunnel', label:'Tunnels', wikiCat:'Category:Tunnels', subFn:(s,a)=>s },
  { id:'oil', label:'Oil Fields', wikiCat:'Category:Oil_fields', subFn:(s,a)=>s },
  { id:'wonder', label:'Seven Wonders', wikiCat:'Category:Wonders_of_the_world', subFn:(s,a)=>s },
  { id:'capital', label:'World Capitals', wikiCat:'Category:Capitals', subFn:(s,a)=>s },
  // India-specific categories
  { id:'airport', label:'Airports', wikiCat:'Category:Airports_in_India', subFn:(s,a)=>[s,'Airport'].filter(Boolean).join(' · ') },
  { id:'city', label:'Cities', wikiCat:'Category:Cities_in_India', subFn:(s,a)=>s },
  { id:'dam', label:'Dams', wikiCat:'Category:Dams_in_India', subFn:(s,a)=>[s,'Dam'].filter(Boolean).join(' · ') },
  { id:'forest', label:'Forests', wikiCat:'Category:Forests_of_India', subFn:(s,a)=>s },
  { id:'island', label:'Islands', wikiCat:'Category:Islands_of_India', subFn:(s,a)=>s },
  { id:'lake', label:'Lakes', wikiCat:'Category:Lakes_of_India', subFn:(s,a)=>[s,'Lake'].filter(Boolean).join(' · ') },
  { id:'national_park', label:'National Parks', wikiCat:'Category:National_parks_of_India', subFn:(s,a)=>[s,'National Park'].filter(Boolean).join(' · ') },
  { id:'plateau', label:'Plateaus', wikiCat:'Category:Plateaus_of_India', subFn:(s,a)=>s },
  { id:'port', label:'Ports', wikiCat:'Category:Ports_in_India', subFn:(s,a)=>[s,'Port'].filter(Boolean).join(' · ') },
  { id:'range', label:'Mountain Ranges', wikiCat:'Category:Mountain_ranges_of_India', subFn:(s,a)=>[s,'Range'].filter(Boolean).join(' · ') },
  { id:'river', label:'Rivers', wikiCat:'Category:Rivers_of_India', subFn:(s,a)=>[s,'River'].filter(Boolean).join(' · ') },
  { id:'unesco', label:'UNESCO Sites', wikiCat:'Category:UNESCO_World_Heritage_Sites_in_India', subFn:(s,a)=>s },
  { id:'w_unesco', label:'World UNESCO Sites', wikiCat:'Category:UNESCO_World_Heritage_Sites', subFn:(s,a)=>s },
  { id:'sea', label:'Seas', wikiCat:'Category:Seas', subFn:(s,a)=>s },
  { id:'metro', label:'Metro Systems', wikiCat:'Category:Metro_systems_in_India', subFn:(s,a)=>[s,'Metro'].filter(Boolean).join(' · ') },
  { id:'i_range', label:'Mountain Ranges (India)', wikiCat:'Category:Mountain_ranges_of_India', subFn:(s,a)=>[s,'Range'].filter(Boolean).join(' · ') },
  { id:'mountains', label:'Mountains', wikiCat:'Category:Mountains', subFn:(s,a)=>s },
  { id:'religious', label:'Religious Organizations', wikiCat:'Category:Religious_organizations', subFn:(s,a)=>s },
  { id:'shipwreck', label:'Shipwrecks', wikiCat:'Category:Shipwrecks', subFn:(s,a)=>s },
  { id:'wind_farm', label:'Wind Farms', wikiCat:'Category:Wind_farms', subFn:(s,a)=>[s,'Wind Farm'].filter(Boolean).join(' · ') },
  { id:'zoo', label:'Zoos', wikiCat:'Category:Zoos', subFn:(s,a)=>s },
  { id:'amusement_park', label:'Amusement Parks', wikiCat:'Category:Amusement_parks', subFn:(s,a)=>s },
  { id:'folk_dance', label:'Folk Dances', wikiCat:'Category:Folk_dances', subFn:(s,a)=>s },
  { id:'escarpment', label:'Escarpments', wikiCat:'Category:Escarpments', subFn:(s,a)=>s },
  { id:'w_reservoir', label:'World Reservoirs', wikiCat:'Category:Reservoirs', subFn:(s,a)=>s },
  // Static-fallback categories (use Wikipedia fetch as supplement to static data)
  { id:'w_politician', label:'World Political Leaders', wikiCat:['Category:Heads_of_state','Category:Heads_of_government','Category:Prime_ministers'],
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P20/wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_ideology', label:'Political Ideologies', wikiCat:'Category:Political_ideologies',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_language', label:'Language Families', wikiCat:'Category:Language_families',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'coastline', label:'Coastlines', wikiCat:'Category:Coasts_of_India',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P17/wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_waterfall', label:'World Waterfalls', wikiCat:'Category:Waterfalls', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_volcano', label:'World Volcanoes', wikiCat:'Category:Volcanoes', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_glacier', label:'World Glaciers', wikiCat:'Category:Glaciers', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_forest', label:'World Forests', wikiCat:'Category:Forests', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_desert', label:'World Deserts', wikiCat:'Category:Deserts', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_lake', label:'World Lakes', wikiCat:'Category:Lakes', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_island', label:'World Islands', wikiCat:'Category:Islands', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_bird', label:'Important Bird Areas', wikiCat:'Category:Important_Bird_Areas', subFn:(s,a)=>s },
  { id:'w_temple', label:'World Temples', wikiCat:'Category:Hindu_temples', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_sea', label:'World Seas', wikiCat:'Category:Seas', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_port', label:'World Ports', wikiCat:'Category:Ports', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_plateau', label:'World Plateaus', wikiCat:'Category:Plateaus', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_range', label:'World Mountain Ranges', wikiCat:'Category:Mountain_ranges', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_reef', label:'World Reefs', wikiCat:'Category:Reefs', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_railway', label:'World Railways', wikiCat:'Category:Railway_lines', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_highway', label:'World Highways', wikiCat:'Category:Highways', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_biosphere', label:'World Biosphere Reserves', wikiCat:'Category:Biosphere_reserves', maxDepth:1, subFn:(s,a)=>s },
  { id:'w_ramsar', label:'World Ramsar Sites', wikiCat:'Category:Ramsar_sites', maxDepth:1, subFn:(s,a)=>s },
];

async function fetchSummariesConcurrently(titles, concurrency = 10) {
  const results = {};
  // Batch via MediaWiki API (50 per call) instead of individual REST calls
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&explaintext&pithumbsize=300&titles=${encodeURIComponent(batch.join('|'))}&format=json`;
      const d = await httpGet(url);
      for (const [, page] of Object.entries(d.query.pages)) {
        if (page.missing) continue;
        results[page.title] = { extract: page.extract || '', thumbnail: page.thumbnail?.source || '' };
      }
    } catch { /* skip failed batch */ }
  }
  return results;
}

// ====== PROCESS CATEGORY ======
async function processCat(cat, dedupSet) {
  const cats = Array.isArray(cat.wikiCat) ? cat.wikiCat : [cat.wikiCat];
  console.log(`\n▓ ${cat.label} (${cats.join(', ')})`);
  let allTitles = [];
  for (const wc of cats) {
    const t = await wikiCategoryDeepMembers(wc, 5000, new Set(), 0, cat.maxDepth ?? 2);
    allTitles = allTitles.concat(t);
  }
  const titles = [...new Set(allTitles)];
  console.log(`  Wikipedia: ${titles.length} pages from ${cats.length} categories (deep scan, up to ${cat.maxDepth ?? 2} subcat levels)`);
  if (!titles.length) return [];

  const titleQid = await titlesToQids(titles);
  const valid = Object.entries(titleQid).filter(([, qid]) => qid && /^Q\d+$/.test(qid));
  console.log(`  QIDs found: ${valid.length}`);
  if (!valid.length) return [];

  let sparqlResult;
  try {
    const qidValues = valid.map(([, q]) => q);
    const batchQids = (list) => list.map(q => `wd:${q}`).join(' ');
    let q;
    if (cat.coordSparql) {
      const template = cat.coordSparql;
      sparqlResult = await sparqlBatch(template, qidValues);
    } else {
      q = `SELECT ?item ?itemLabel ?coord ?country ?countryLabel ?stateLabel WHERE {
      VALUES ?item { QIDS }
      OPTIONAL { ?item wdt:P625 ?c1. }
      OPTIONAL { ?item wdt:P19/wdt:P625 ?c2. }
      OPTIONAL { ?item wdt:P20/wdt:P625 ?c3. }
      OPTIONAL { ?item wdt:P17/wdt:P625 ?c4. }
      OPTIONAL { ?item wdt:P131/wdt:P625 ?c5. }
      BIND(COALESCE(?c1, ?c2, ?c3, ?c4, ?c5) AS ?coord)
      OPTIONAL { ?item wdt:P17 ?country. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`;
      sparqlResult = await sparqlBatch(q, qidValues);
    }
  } catch (e) { console.log(`  ✗ SPARQL failed: ${e.message}`); return []; }

  const coordMap = new Map();
  for (const b of sparqlResult.results.bindings) {
    const qid = b.item.value.split('/').pop();
    const m = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) continue;
    const e = coordMap.get(qid) || { la: 0, ln: 0, states: [], meta: {} };
    e.la = parseFloat(parseFloat(m[2]).toFixed(6));
    e.ln = parseFloat(parseFloat(m[1]).toFixed(6));
    if (b.stateLabel?.value && !e.states.includes(b.stateLabel.value)) e.states.push(b.stateLabel.value);
    for (const v of Object.keys(b)) {
      if (!['item','coord','state','stateLabel','itemLabel','country','countryLabel','c1','c2','c3','c4','c5'].includes(v) && b[v]?.value) {
        const val = b[v].value;
        if (!e.meta[v] || !e.meta[v].includes(val)) { if (!e.meta[v]) e.meta[v] = []; e.meta[v].push(val); }
      }
    }
    coordMap.set(qid, e);
  }

  // Universal fallback: for items still without coords, P17 country lookup + default
  const missing = valid.filter(([, qid]) => !coordMap.has(qid));
  if (missing.length > 0) {
    const missingQids = missing.map(([, q]) => q);
    console.log(`  No coord for ${missing.length} items, trying P17 fallback...`);
    try {
      const fallbackQ = `SELECT ?item ?country ?countryLabel WHERE {
        VALUES ?item { QIDS }
        ?item wdt:P17 ?country.
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      }`;
      const fbResult = await sparqlBatch(fallbackQ, missingQids);
      const countryQidSet = new Set();
      const itemCountryMap = new Map();
      for (const b of fbResult.results.bindings) {
        const qid = b.item.value.split('/').pop();
        const cqid = b.country.value.split('/').pop();
        countryQidSet.add(cqid);
        itemCountryMap.set(qid, cqid);
      }
      if (countryQidSet.size > 0) {
        const countryCoordQ = `SELECT ?country ?coord WHERE {
          VALUES ?country { QIDS }
          ?country wdt:P625 ?coord.
        }`;
        const ccResult = await sparqlBatch(countryCoordQ, [...countryQidSet]);
        const countryCoordMap = new Map();
        for (const b of ccResult.results.bindings) {
          const cqid = b.country.value.split('/').pop();
          const m = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
          if (m) countryCoordMap.set(cqid, { la: parseFloat(parseFloat(m[2]).toFixed(6)), ln: parseFloat(parseFloat(m[1]).toFixed(6)) });
        }
        for (const [qid, cqid] of itemCountryMap) {
          if (countryCoordMap.has(cqid)) {
            coordMap.set(qid, { la: countryCoordMap.get(cqid).la, ln: countryCoordMap.get(cqid).ln, states: [], meta: {} });
          }
        }
      }
    } catch (e) { console.log(`  ✗ P17 fallback SPARQL failed: ${e.message}`); }
  }

  // Last resort: assign India center for items still without any coordinate
  const stillMissing = valid.filter(([, qid]) => !coordMap.has(qid));
  if (stillMissing.length > 0) {
    console.log(`  ⚠ Assigning default coords for ${stillMissing.length} unlocatable items`);
    for (const [, qid] of stillMissing) {
      coordMap.set(qid, { la: 20.5937, ln: 78.9629, states: [], meta: { _fallback: 'default' } });
    }
  }

  console.log(`  With coords: ${coordMap.size}`);

  // Phase 1: collect candidates (coord + dedup)
  const candidates = [];
  let skipped = 0;
  for (const [title, qid] of valid) {
    const coord = coordMap.get(qid);
    if (!coord) continue;
    if (dedupSet.has(normName(title))) { skipped++; continue; }
    dedupSet.add(normName(title));
    candidates.push({ title, coord });
  }

  // Phase 2: batch-fetch summaries with concurrency
  console.log(`  Fetching ${candidates.length} summaries...`);
    const summaries = await fetchSummariesConcurrently(candidates.map(c => c.title), 2);

  // Phase 3: build and filter entries
  const out = [];
  let n = 0;
  for (const cand of candidates) {
    const state = cand.coord.states?.join(', ') || '';
    const meta = cand.coord.meta || {};
    const sub = cat.subFn(state, '', meta);
    const wd = summaries[cand.title];
    const txt = wd?.extract || '';
    const desc = buildDesc(txt);
    const fact = buildFacts(txt, desc) || desc || state;
    const factText = fact || desc || state;
    const entry = {
      n: cand.title, la: cand.coord.la, ln: cand.coord.ln, sub,
      desc: desc || factText.slice(0, 200),
      fact: factText,
      img: wd?.thumbnail || '',
      _cat: cat.id,
      _quality: 'good'
    };
    entry._quality = assessQuality(entry);
    if (entry._quality === 'poor' || entry.desc.length < 5 || entry.fact.length < 5 || entry.sub.length < 3 || entry.la === 0) continue;
    out.push(entry);
    n++;
    if (n % 10 === 0) { console.log(`  ...${n} entries`); }
  }
  console.log(`  ${out.length} clean (${skipped} dedup skip)`);
  return out;
}

// ====== MAIN ======
async function main() {
  console.log('=== Wikipedia Category Fetch ===\n');
  const dedupSet = loadDedupSet();
  console.log(`Loaded ${dedupSet.size} names for dedup`);

  // Always re-fetch all categories — new Wikipedia pages may have appeared since last run
  const runCats = [];
  for (const cat of CFG) {
    runCats.push(cat);
  }

  console.log(`Will re-fetch ${runCats.length} categories (group rotation distributes across runs)\n`);

  // Group processing — spread remaining categories across runs
  const processAll = process.env.GLOBE_FILL_ALL === '1';
  const fillGroup = parseInt(process.env.GLOBE_FILL_GROUP || '0', 10);
  const GROUP_COUNT = 10;
  const DAY_GROUPS = Array.from({ length: GROUP_COUNT }, () => []);
  CFG.forEach((_, i) => DAY_GROUPS[i % GROUP_COUNT].push(i));

  let activeRunCats;
  if (processAll) {
    activeRunCats = runCats;
    console.log(`Processing ALL ${runCats.length} remaining categories (GLOBE_FILL_ALL=1)\n`);
  } else if (fillGroup >= 0 && fillGroup < GROUP_COUNT) {
    const activeIdxs = new Set(DAY_GROUPS[fillGroup]);
    activeRunCats = runCats.filter(cat => activeIdxs.has(CFG.indexOf(cat)));
    console.log(`Group ${fillGroup} — processing ${activeRunCats.length} of ${runCats.length} remaining`);
    for (const cat of runCats) {
      if (!activeIdxs.has(CFG.indexOf(cat))) console.log(`  (skipping: ${cat.id})`);
    }
    console.log();
  } else {
    activeRunCats = runCats;
    console.log(`Invalid GLOBE_FILL_GROUP=${fillGroup}, processing all\n`);
  }

  for (let i = 0; i < activeRunCats.length; i++) {
    const cat = activeRunCats[i];
    console.log(`[${i+1}/${activeRunCats.length}]`);
    const newEntries = await processCat(cat, dedupSet);
    const fp = path.join(DATA_DIR, `wiki-${cat.id}.json`);
    const existing = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : [];
    const seen = new Set(existing.map(e => normName(e.n)));
    const merged = [...existing];
    let added = 0;
    for (const e of newEntries) {
      const key = normName(e.n);
      if (!seen.has(key)) { seen.add(key); merged.push(e); added++; }
    }
    console.log(`  merged: ${existing.length} existing + ${added} new = ${merged.length} total`);
    fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
    // Commit and push after each category so results are available immediately
    try {
      const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z/, ' UTC');
      execSync(`git add -A && git commit -m "Wiki ${cat.id} ${ts}" && git pull --rebase || { git rebase --abort 2>/dev/null; git pull --no-rebase -X theirs; } && git push`, { timeout: 120000, stdio:'inherit' });
      console.log(`  ✓ Pushed ${cat.id}`);
    } catch (e) { console.log(`  ⚠ git push failed: ${e.message?.slice(0, 100)}`); }
    if (i < activeRunCats.length - 1) await new Promise(r => setTimeout(r, 5000));
  }
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

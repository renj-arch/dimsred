const fs = require('fs');
const path = require('path');
const https = require('https');

async function httpGet(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' } }, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            if (res.statusCode === 429) return reject(Object.assign(new Error(d.slice(0, 200)), { status: 429 }));
            if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
            resolve(JSON.parse(d));
          });
        });
        req.on('error', reject);
        req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
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

async function wikiCategoryMembers(category, maxPages = 1500) {
  let all = [], cmcontinue = '';
  while (all.length < maxPages) {
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
    const globCats = ['tiger','wildlife','biosphere','ramsar','peak','desert','waterfall','glacier','volcano','railway','hill','tower','forest','port','airport','island','lake','river','dam','national_park','unesco','city','i_fort','i_palace','i_lake','i_glacier','i_waterfall','i_island','i_cave','i_bridge','i_tunnel','i_stadium','i_observatory','i_zoo','rl_zone','pipeline','refinery','fertilizer','cement','power_plant','steel_plant','tribe','i_freedom','i_medieval','i_colonial','i_movement','i_pilgrimage','personality','dynasty','organization','irrigation','drainage','physiographic','soil','monsoon','vegetation','seismic_zone','biogeographic_zone','industrial','wind','cloud','rainfall','latitude','trade','phenomena','dfc','i_corridor','border_road','ocean','fjord','atoll','oasis','salt_flat','mangrove','ice_shelf','ocean_ridge','seamount','capital','ice_cap','biome','climate_zone','cyclone_region','tornado_region','time_zone','basin','crater','ecoregion','estuary','lagoon','mesa','museum','religious','shipwreck','spaceport','statue','wind_farm','zoo','amusement_park','range','sea','valley','folk_dance','longitude','festival','language','cuisine','classical_dance','monument','mosque','church','archaeological_site','monastery','escarpment','geopark','ruler','freedom','traveller','tribal','i_book','invention','movement','corridor','writer','reformer','country','philosopher','artist','architect'];
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
  { id:'i_medieval', label:'Medieval Sites', wikiCat:'Category:Medieval_sites_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_colonial', label:'Colonial Sites', wikiCat:'Category:Colonial_architecture_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_movement', label:'Social Movements', wikiCat:'Category:Social_movements_in_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'i_pilgrimage', label:'Pilgrimage Sites', wikiCat:'Category:Pilgrimage_sites_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  // Remaining categories to wire into fetch+part11 pipeline
  { id:'dynasty', label:'Dynasties', wikiCat:'Category:Dynasties_of_India', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'organization', label:'Organizations', wikiCat:'Category:Indian_nationalist_political_parties', subFn:(s,a)=>[s].filter(Boolean).join(' · ') },
  { id:'personality', label:'Historical Figures', wikiCat:'Category:Indian_historical_figures',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
  { id:'wind', label:'Wind Patterns', wikiCat:'Category:Wind', subFn:(s,a)=>s },
  { id:'cloud', label:'Cloud Types', wikiCat:'Category:Cloud_types', subFn:(s,a)=>s },
  { id:'rainfall', label:'Rainfall Records', wikiCat:'Category:Weather_records', subFn:(s,a)=>s },
  { id:'latitude', label:'Latitude Lines', wikiCat:'Category:Lines_of_latitude', subFn:(s,a)=>s },
  { id:'trade', label:'Trade Routes', wikiCat:'Category:Trade_routes', subFn:(s,a)=>s },
  { id:'phenomena', label:'Natural Phenomena', wikiCat:'Category:Natural_phenomena', subFn:(s,a)=>s },
  { id:'dfc', label:'Dedicated Freight Corridors', wikiCat:'Category:Dedicated_freight_corridors_in_India', subFn:(s,a)=>s },
  { id:'i_corridor', label:'Industrial Corridors', wikiCat:'Category:Industrial_corridors_in_India', subFn:(s,a)=>s },
  { id:'border_road', label:'Border Roads', wikiCat:'Category:Border_Roads_Organisation', subFn:(s,a)=>s },
  { id:'longitude', label:'Lines of Longitude', wikiCat:'Category:Lines_of_longitude', subFn:(s,a)=>s },
  { id:'festival', label:'Festivals', wikiCat:'Category:Festivals_in_India', subFn:(s,a)=>s+' · Festival' },
  { id:'language', label:'Languages', wikiCat:'Category:Languages_of_India', subFn:(s,a)=>s },
  { id:'cuisine', label:'Regional Cuisines', wikiCat:'Category:Indian_cuisine_by_state', subFn:(s,a)=>s+' · Cuisine' },
  { id:'classical_dance', label:'Classical Dances', wikiCat:'Category:Indian_classical_dances', subFn:(s,a)=>s+' · Classical Dance' },
  { id:'monument', label:'Monuments & Memorials', wikiCat:'Category:Monuments_and_memorials_in_India', subFn:(s,a)=>s },
  { id:'mosque', label:'Mosques', wikiCat:'Category:Mosques_in_India', subFn:(s,a)=>s },
  { id:'church', label:'Churches', wikiCat:'Category:Churches_in_India', subFn:(s,a)=>s },
  { id:'archaeological_site', label:'Archaeological Sites', wikiCat:'Category:Archaeological_sites_in_India', subFn:(s,a)=>s },
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
  { id:'ruler', label:'Rulers & Emperors', wikiCat:'Category:Indian_monarchs', subFn:(s,a)=>[s,'Indian monarch'].filter(Boolean).join(' · ') },
  { id:'freedom', label:'Freedom Fighters', wikiCat:'Category:Indian_revolutionaries', subFn:(s,a)=>[s,'Indian revolutionary'].filter(Boolean).join(' · ') },
  { id:'traveller', label:'Travellers & Explorers', wikiCat:'Category:Indian_explorers', subFn:(s,a)=>[s,'Indian explorer'].filter(Boolean).join(' · ') },
  { id:'invention', label:'Inventions & Discoveries', wikiCat:'Category:Indian_inventions', subFn:(s,a)=>s },
  { id:'movement', label:'Movements & Protests', wikiCat:'Category:Environmental_protests_in_India', subFn:(s,a)=>s },
  { id:'i_book', label:'Ancient Books & Texts', wikiCat:'Category:Ancient_Indian_literature',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P50 ?author. { ?author wdt:P19 ?coord. } UNION { ?author wdt:P20 ?coord. } }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'tribal', label:'Tribal Regions', wikiCat:'Category:Adivasi', subFn:(s,a)=>s },
  { id:'corridor', label:'Wildlife Corridors', wikiCat:'Category:Elephant_reserves_of_India', subFn:(s,a)=>s },
  { id:'reformer', label:'Reformers & Thinkers', wikiCat:'Category:Indian_social_reformers',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
  { id:'writer', label:'Writers & Poets', wikiCat:'Category:Indian_poets',
    subFn:(s,a)=>s,
    coordSparql:`SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { QIDS }
      { ?item wdt:P625 ?coord. }
      UNION
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
  { id:'w_alliance', label:'World Alliances', wikiCat:'Category:Military_alliances', subFn:(s,a)=>s },
  { id:'judiciary', label:'High Courts', wikiCat:'Category:High_courts_of_India', subFn:(s,a)=>[s,'High Court'].filter(Boolean).join(' · ') },
  { id:'w_trade_bloc', label:'Trade Blocs', wikiCat:'Category:Trade_blocs', subFn:(s,a)=>s },
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
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
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
      { ?item wdt:P19 ?coord. }
      UNION
      { ?item wdt:P20 ?coord. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`
  },
];

async function fetchSummariesConcurrently(titles, concurrency = 5) {
  const results = {};
  const queue = [...titles];
  async function worker() {
    while (queue.length > 0) {
      const title = queue.shift();
      try { results[title] = await wikiSummary(title); } catch { results[title] = null; }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  const workers = [];
  for (let i = 0; i < concurrency && i < titles.length; i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

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

  let sparqlResult;
  try {
    const qidList = valid.map(([, q]) => `wd:${q}`).join(' ');
    let q;
    if (cat.coordSparql) {
      q = cat.coordSparql.replace('QIDS', qidList);
    } else {
      q = `SELECT ?item ?itemLabel ?coord ?stateLabel WHERE {
      VALUES ?item { ${qidList} }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }`;
    }
    sparqlResult = await sparql(q);
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
      if (!['item','coord','state','stateLabel','itemLabel'].includes(v) && b[v]?.value) {
        const val = b[v].value;
        if (!e.meta[v] || !e.meta[v].includes(val)) { if (!e.meta[v]) e.meta[v] = []; e.meta[v].push(val); }
      }
    }
    coordMap.set(qid, e);
  }
  console.log(`  With coords: ${coordMap.size}`);

  // Phase 1: collect candidates (coord + dedup)
  const candidates = [];
  let skipped = 0;
  for (const [title, qid] of valid) {
    if (candidates.length >= 60) break;
    const coord = coordMap.get(qid);
    if (!coord) continue;
    if (dedupSet.has(normName(title))) { skipped++; continue; }
    dedupSet.add(normName(title));
    candidates.push({ title, coord });
  }

  // Phase 2: batch-fetch summaries with concurrency
  console.log(`  Fetching ${candidates.length} summaries...`);
  const summaries = await fetchSummariesConcurrently(candidates.map(c => c.title), 5);

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
    if (i < runCats.length - 1) await new Promise(r => setTimeout(r, 1000));
  }
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

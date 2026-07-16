const fs = require('fs');
const path = require('path');
const https = require('https');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
  });
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

const BAD_NAME_PATTERNS = [/project/i, /canal/i, /complex/i, /giga/i, /pipeline/i, /refinery/i, /shipping/i, /cement/i, /fertilizer/i, /power\s+plant/i, /steel\s+plant/i, /airport/i, /railway/i, /metro/i, /corridor/i, /highway/i, /plant/i];

function isBadName(name) {
  const n = name.toLowerCase();
  if (n.includes('national park') || n.includes('tiger reserve') || n.includes('wildlife sanctuary') || n.includes('biosphere reserve') || n.includes('ramsar') || n.match(/\bNP\b/) || n.match(/\bTR\b/)) return false;
  return BAD_NAME_PATTERNS.some(r => r.test(name));
}

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

  // Prefer sentences not already used in desc
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
    const fallback = scored.filter(x => !seen.has(x.s.slice(0, 40).toLowerCase().replace(/\s+/g, '')));
    for (const x of fallback) if (out.length < 4) out.push(x.s);
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

// ====== LOAD MANUAL ENTRIES ======
const MANUAL_PATH = path.resolve(__dirname, '..', 'data', 'globe-manual.json');
const NAME_ALIASES = {
  ganga:'ganges',
  ghaghara:'ghaghra',
  cauvery:'kaveri',
  pennar:'penna',
  sharavati:'sharavathi',
};

function normName(n){
  let s = n.toLowerCase().replace(/\s+/g,' ')
    .replace(/\bnational park\b/g,'np')
    .replace(/\bn\.p\.\b/g,'np')
    .replace(/\s+(river|lake|dam|peak|mountain|reserve|sanctuary|park|forest|glacier|island|falls|desert|cave|plateau|valley|gulf|bay|sea|point|np|tr|whs)$/i,'')
    .trim();
  return NAME_ALIASES[s] || s;
}
let manualNames = new Set();
try {
  const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
  for (const e of manual) if (e.n) manualNames.add(normName(e.n));
  console.log(`Loaded ${manual.length} manual entries for dedup`);
} catch {
  console.log('No globe-manual.json found, skipping manual dedup');
}

// ====== LOAD 3D GLOBE ENTRIES FOR DEDUP ======
const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
const GLOBE_CAT_MAP = {
  national_park:'national_park', unesco:'unesco', w_unesco:'w_unesco',
  dams:'dam', rivers:'river', lakes:'lake',
  city:'city', port:'port', airport:'airport',
  desert:'desert', island:'island', waterfall:'waterfall',
  glacier:'glacier', volcano:'volcano', forest:'forest',
  plateau:'plateau', valley:'valley', range:'range', sea:'sea',
  w_city:'w_city', w_river:'w_river', w_kingdom:'w_kingdom', w_battle:'w_battle',
  w_peak:'w_peak', w_np:'w_np', w_inst:'w_inst', w_landmark:'w_landmark',
  w_bridge:'w_bridge', w_airport:'w_airport', w_dam:'w_dam', w_pass:'w_pass',
  strait:'strait', peninsula:'peninsula', gulf:'gulf',
  canal:'canal', reef:'reef', canyon:'canyon', cape:'cape',
  delta:'delta', plain:'plain', tunnel:'tunnel',
  oil:'oil', current:'current',
  lighthouse:'lighthouse', wonder:'wonder',
  w_bay:'w_bay', w_cave:'w_cave', w_gorge:'w_gorge',
  w_archipelago:'w_archipelago', w_geyser:'w_geyser',
  w_isthmus:'w_isthmus', w_spring:'w_spring', w_coast:'w_coast',
  w_empire:'w_empire', w_civilization:'w_civilization',
  w_revolution:'w_revolution', w_treaty:'w_treaty',
  w_disaster:'w_disaster', w_war:'w_war',
  metro:'metro', waterway:'waterway',
  w_trench:'w_trench', w_plate:'w_plate',
  w_ww2:'w_ww2', w_ww1:'w_ww1', w_meteorite:'w_meteorite',
  i_range:'i_range', mountains:'mountains',
  ocean:'ocean', fjord:'fjord', atoll:'atoll', oasis:'oasis',
  salt_flat:'salt_flat', mangrove:'mangrove', ice_shelf:'ice_shelf',
  ocean_ridge:'ocean_ridge', seamount:'seamount',
  capital:'capital',   ice_cap:'ice_cap',
  biome:'biome', climate_zone:'climate_zone',
  cyclone_region:'cyclone_region', tornado_region:'tornado_region',
  time_zone:'time_zone',
  basin:'basin', crater:'crater', ecoregion:'ecoregion',
  estuary:'estuary', lagoon:'lagoon', mesa:'mesa',
  museum:'museum', religious:'religious', shipwreck:'shipwreck',
  spaceport:'spaceport', statue:'statue', wind_farm:'wind_farm',
  zoo:'zoo', amusement_park:'amusement_park',
  escarpment:'escarpment', geopark:'geopark',
  castle:'castle', cathedral:'cathedral', embassy:'embassy',
  harbor:'harbor', market:'market', park:'park',
  reservoir:'reservoir', shrine:'shrine', theatre:'theatre', tomb:'tomb',
  w_castle:'w_castle', w_cathedral:'w_cathedral',
  w_embassy:'w_embassy', w_harbor:'w_harbor',
  w_market:'w_market', w_park:'w_park',
  w_reservoir:'w_reservoir', w_shrine:'w_shrine',
  w_theatre:'w_theatre', w_tomb:'w_tomb',
  w_hospital:'w_hospital', w_school:'w_school',
  w_university:'w_university', w_stadium:'w_stadium',
  folk_dance:'folk_dance', longitude:'longitude',
  festival:'festival', language:'language', cuisine:'cuisine',
  classical_dance:'classical_dance', monument:'monument',
  mosque:'mosque', church:'church',
  archaeological_site:'archaeological_site', monastery:'monastery',
};
let globeNames = new Map(); // catId -> Set of normalized names

try {
  const html = fs.readFileSync(GLOBE_PATH, 'utf8');
  for (const [fetchCat, globeCat] of Object.entries(GLOBE_CAT_MAP)) {
    const rx = new RegExp(`D\\.${globeCat}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'i');
    const m = rx.exec(html);
    if (!m) continue;
    const block = m[1];
    const nameRx = /n\s*:\s*'((?:[^'\\]|\\.)*)'/g;
    const names = new Set();
    let nm;
    while ((nm = nameRx.exec(block)) !== null) names.add(normName(nm[1].replace(/\\(.)/g, '$1')));
    if (names.size) globeNames.set(fetchCat, names);
    console.log(`Globe dedup: ${names.size} entries in "${globeCat}" → fetch "${fetchCat}"`);
  }
} catch { console.log('No 3d-globe.html found, skipping globe dedup'); }

// ====== CATEGORY CONFIGS ======
// Each config specifies:
//   id, label, SPARQL query, wikiSuffix for Wikipedia title,
//   subFrom(b,state,area,incept) -> sub field,
//   prefixFrom(b,state,area) -> prefix for fact field,
//   max: max entries

const CFG = [
  {
    id: 'national_park',
    label: 'National Parks',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?area ?inception ?iucnLabel ?heritageLabel WHERE {
        ?item wdt:P31 wd:Q46169. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P2046 ?area. }
        OPTIONAL { ?item wdt:P571 ?inception. }
        OPTIONAL { ?item wdt:P131 ?state. }
        OPTIONAL { ?item wdt:P141 ?iucn. }
        OPTIONAL { ?item wdt:P1435 ?heritage. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){
      const t=[];
      if(b.heritageLabel?.value?.toLowerCase().includes('world heritage')) t.push('UNESCO WHS');
      return [s,a,i?'est. '+i:''].concat(t).filter(Boolean).join(' · ');
    },
    prefix(b,s,a){ return s+(a?', '+a:''); }
  },
  {
    id: 'unesco',
    label: 'UNESCO World Heritage Sites',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?year WHERE {
        ?item wdt:P1435 wd:Q9259. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P131 ?state. }
        OPTIONAL { ?item wdt:P580 ?year. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){ return [s,i?'UNESCO '+i:'UNESCO WHS'].filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_unesco',
    label: 'World UNESCO Sites',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?year WHERE {
        ?item wdt:P1435 wd:Q9259. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P131 ?state. }
        OPTIONAL { ?item wdt:P580 ?year. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){ return [s,i?'UNESCO '+i:'UNESCO WHS'].filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'dams',
    label: 'Major Dams',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?riverLabel ?height ?inception WHERE {
        ?item wdt:P31 wd:Q12323. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P131 ?state. }
        OPTIONAL { ?item wdt:P30 ?river. }
        OPTIONAL { ?item wdt:P2048 ?height. }
        OPTIONAL { ?item wdt:P571 ?inception. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){
      const p=[s];
      const h=b.height?.value?parseFloat(b.height.value).toFixed(0)+' m':'';
      if(h)p.push(h);
      if(i)p.push('est. '+i);
      if(b.riverLabel?.value)p.push('on '+b.riverLabel.value);
      return p.filter(Boolean).join(' · ');
    },
    prefix(b,s,a){
      return [s,b.height?.value?parseFloat(b.height.value).toFixed(0)+' m':''].filter(Boolean).join(', ');
    }
  },
  {
    id: 'rivers',
    label: 'Major Rivers',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?length WHERE {
        ?item wdt:P31 wd:Q4022. ?item wdt:P17 wd:Q668.
        ?item wdt:P625 ?coord. ?item wdt:P2043 ?length.
        OPTIONAL { ?item wdt:P131 ?state. }
        FILTER(?length > 200)
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY DESC(?length) LIMIT 80`,
    sub(b,s,a,i){ return [s,b.length?.value?parseFloat(b.length.value).toFixed(0)+' km':''].filter(Boolean).join(' · '); },
    prefix(b,s,a){ return b.length?.value?parseFloat(b.length.value).toFixed(0)+' km':''; }
  },
  {
    id: 'mountains',
    label: 'Mountains',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?elevation WHERE {
        ?item wdt:P31 wd:Q8502. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P2044 ?elevation. }
        OPTIONAL { ?item wdt:P131 ?state. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY DESC(?elevation) LIMIT 50`,
    sub(b,s,a,i){
      const p=[s];
      const el=b.elevation?.value?parseFloat(b.elevation.value).toFixed(0)+' m':'';
      if(el)p.push(el);
      return p.filter(Boolean).join(' · ');
    },
    prefix(b,s,a){
      return [s,b.elevation?.value?parseFloat(b.elevation.value).toFixed(0)+' m':''].filter(Boolean).join(', ');
    }
  },
  {
    id: 'lakes',
    label: 'Lakes',
    query: `
      SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?area ?inception WHERE {
        ?item wdt:P31 wd:Q23397. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
        OPTIONAL { ?item wdt:P2046 ?area. }
        OPTIONAL { ?item wdt:P571 ?inception. }
        OPTIONAL { ?item wdt:P131 ?state. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
      } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return [s,a,i?'est. '+i:''].filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s+(a?', '+a:''); }
  },
  {
    id: 'city',
    label: 'Indian Cities',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?pop WHERE {
      ?item wdt:P31 wd:Q515. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      ?item wdt:P1082 ?pop. FILTER(?pop > 100000)
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){ const p=[s]; if(b.pop?.value)p.push(parseInt(b.pop.value).toLocaleString('en-IN')); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'port',
    label: 'Major Ports',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q44782. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'airport',
    label: 'Airports',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q1248784. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'island',
    label: 'Islands',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q23442. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'waterfall',
    label: 'Waterfalls',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?height WHERE {
      ?item wdt:P31 wd:Q34038. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      OPTIONAL { ?item wdt:P2048 ?height. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 50`,
    sub(b,s,a,i){ const p=[s]; if(b.height?.value)p.push(parseFloat(b.height.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'glacier',
    label: 'Glaciers',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q35666. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'desert',
    label: 'Deserts',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q8514. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 20`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  // volcano: no Indian volcanoes with P31=Q8072 in Wikidata
  {
    id: 'forest',
    label: 'Forests',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel ?area WHERE {
      ?item wdt:P31 wd:Q4421. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      OPTIONAL { ?item wdt:P2046 ?area. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return [s,a].filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s+(a?', '+a:''); }
  },
  {
    id: 'plateau',
    label: 'Plateaus',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q75520. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 30`,
    sub(b,s,a,i){ return s||''; },
    prefix(b,s,a){ return s||''; }
  },
  // valley, range, sea: no usable Indian data in Wikidata
  // World categories (no India filter)
  {
    id: 'w_city',
    label: 'World Cities',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?pop WHERE {
      ?item wdt:P31 wd:Q515. ?item wdt:P625 ?coord. ?item wdt:P1082 ?pop.
      FILTER(?pop > 500000)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?pop) LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.pop?.value)p.push((b.pop.value/1000000).toFixed(1)+'M'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_river',
    label: 'World Rivers',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?length WHERE {
      ?item wdt:P31 wd:Q4022. ?item wdt:P625 ?coord. ?item wdt:P2043 ?length.
      FILTER(?length > 500)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?length) LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.length?.value)p.push(parseFloat(b.length.value).toFixed(0)+' km'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_kingdom',
    label: 'Historical Kingdoms & Empires',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?continentLabel WHERE {
      ?item wdt:P31 wd:Q48349. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P30 ?continent. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return b.continentLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_battle',
    label: 'World Battles',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q178561. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 200`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_peak',
    label: 'World Mountains',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?elevation WHERE {
      ?item wdt:P31 wd:Q8502. ?item wdt:P625 ?coord.
      ?item wdt:P2044 ?elevation. FILTER(?elevation > 1000)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); const el=b.elevation?.value?parseFloat(b.elevation.value).toFixed(0)+' m':''; if(el)p.push(el); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_np',
    label: 'World National Parks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?area ?inception WHERE {
      ?item wdt:P31 wd:Q46169. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2046 ?area. }
      OPTIONAL { ?item wdt:P571 ?inception. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(a)p.push(a); if(i)p.push('est. '+i); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_inst',
    label: 'World Institutions',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      { ?item wdt:P31 wd:Q3914. } UNION { ?item wdt:P31 wd:Q4671277. }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      ?item wdt:P1082 ?pop. FILTER(?pop > 5000)
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_landmark',
    label: 'World Landmarks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      { ?item wdt:P31 wd:Q570116. } UNION { ?item wdt:P31 wd:Q358. }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_bridge',
    label: 'World Bridges',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?length WHERE {
      ?item wdt:P31 wd:Q12280. ?item wdt:P625 ?coord.
      ?item wdt:P2043 ?length. FILTER(?length > 100)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?length) LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.length?.value)p.push(parseFloat(b.length.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_airport',
    label: 'World Airports',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?iata WHERE {
      ?item wdt:P31 wd:Q1248784. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      OPTIONAL { ?item wdt:P238 ?iata. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.iata?.value)p.push(b.iata.value); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_dam',
    label: 'World Dams',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?height WHERE {
      ?item wdt:P31 wd:Q12323. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2048 ?height. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?height) LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.height?.value)p.push(parseFloat(b.height.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_pass',
    label: 'Mountain Passes',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?elevation WHERE {
      ?item wdt:P31 wd:Q133056. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2044 ?elevation. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.elevation?.value)p.push(parseFloat(b.elevation.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'strait',
    label: 'Straits',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      VALUES ?type { wd:Q37901 wd:Q37915 }
      ?item wdt:P31 ?type. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'peninsula',
    label: 'Peninsulas',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q34763. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'gulf',
    label: 'Gulfs',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      { ?item wdt:P31 wd:Q1322134. } UNION { ?item wdt:P31 wd:Q165. }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'canal',
    label: 'Canals',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?length WHERE {
      ?item wdt:P31 wd:Q12284. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2043 ?length. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?length) LIMIT 60`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.length?.value)p.push(parseFloat(b.length.value).toFixed(0)+' km'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'reef',
    label: 'Reefs',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q184358. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'canyon',
    label: 'Canyons',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q150784. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'cape',
    label: 'Capes',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q185113. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'delta',
    label: 'River Deltas',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q43197. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'plain',
    label: 'Plains',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q160091. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'tunnel',
    label: 'Tunnels',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?length WHERE {
      ?item wdt:P31 wd:Q44377. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2043 ?length. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?length) LIMIT 60`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.length?.value)p.push(parseFloat(b.length.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'oil',
    label: 'Oil Fields',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q211748. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'current',
    label: 'Ocean Currents',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q129558. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'lighthouse',
    label: 'Lighthouses',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q39715. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'wonder',
    label: 'World Wonders',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q570116. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_bay',
    label: 'Bays',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q39594. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_cave',
    label: 'Caves',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?length WHERE {
      ?item wdt:P31 wd:Q35509. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2043 ?length. }
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.length?.value)p.push(parseFloat(b.length.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_gorge',
    label: 'Gorges',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q150784. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_archipelago',
    label: 'Archipelagos',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q33837. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_geyser',
    label: 'Geysers',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q83471. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_isthmus',
    label: 'Isthmuses',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q93267. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_spring',
    label: 'Springs',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q124714. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_coast',
    label: 'Coasts',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q93352. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_empire',
    label: 'Empires',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?continentLabel WHERE {
      ?item wdt:P31 wd:Q48349. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P30 ?continent. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return b.continentLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_civilization',
    label: 'Civilizations',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?continentLabel WHERE {
      ?item wdt:P31 wd:Q8432. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P30 ?continent. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.continentLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_revolution',
    label: 'Revolutions',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q115523701. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_treaty',
    label: 'Treaties',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q131569. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_disaster',
    label: 'Disasters',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q3839081. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_war',
    label: 'Wars',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q198. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 100`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'metro',
    label: 'Metro Systems',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q5503. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'waterway',
    label: 'Waterways',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q1267889. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_trench',
    label: 'Oceanic Trenches',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q119253. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 30`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_plate',
    label: 'Tectonic Plates',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q215680. ?item wdt:P625 ?coord.
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 30`,
    sub(b,s,a,i){ return ''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_ww2',
    label: 'WWII Sites',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P361 wd:Q362. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_ww1',
    label: 'WWI Sites',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P361 wd:Q361. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_meteorite',
    label: 'Meteorite Craters',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q55818. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'i_range',
    label: 'Indian Mountain Ranges',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?stateLabel WHERE {
      ?item wdt:P31 wd:Q46831. ?item wdt:P17 wd:Q668. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.stateLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'ocean',
    label: 'Oceans',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q9430. ?item wdt:P625 ?coord.
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 10`,
    sub(b,s,a,i){ return 'Ocean'; },
    prefix(b,s,a){ return ''; }
  },
  {
    id: 'fjord',
    label: 'Fjords',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q45776. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'atoll',
    label: 'Atolls',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q42523. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Atoll'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'oasis',
    label: 'Oases',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q43742. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'salt_flat',
    label: 'Salt Flats',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q935277. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Salt flat'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'mangrove',
    label: 'Mangrove Forests',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q19756. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Mangrove'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'ice_shelf',
    label: 'Ice Shelves',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q46966. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Ice shelf'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'ocean_ridge',
    label: 'Ocean Ridges',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q104698. ?item wdt:P625 ?coord.
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return 'Oceanic ridge'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'seamount',
    label: 'Seamounts',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q503269. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Seamount'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'capital',
    label: 'World Capitals',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q5119. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P1376 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?countryLabel LIMIT 80`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Capital'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'ice_cap',
    label: 'Ice Caps & Sheets',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      VALUES ?type { wd:Q878077 wd:Q12599 }
      ?item wdt:P31 ?type. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Ice cap'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'basin',
    label: 'Structural Basins',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q749565. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'crater',
    label: 'Volcanic Craters & Calderas',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      { ?item wdt:P31 wd:Q109391. } UNION { ?item wdt:P31 wd:Q159954. }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Crater'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'ecoregion',
    label: 'Ecoregions',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q295469. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Ecoregion'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'estuary',
    label: 'Estuaries',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q47053. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Estuary'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'lagoon',
    label: 'Lagoons',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q187223. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Lagoon'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'mesa',
    label: 'Mesas & Buttes',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q623319. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Mesa'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'museum',
    label: 'Major Museums',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?visitors WHERE {
      ?item wdt:P31 wd:Q33506. ?item wdt:P625 ?coord.
      ?item wdt:P1082 ?visitors. FILTER(?visitors > 100000)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?visitors) LIMIT 80`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Museum'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'religious',
    label: 'Religious Sites',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q1370598. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 80`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Religious site'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'shipwreck',
    label: 'Shipwrecks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q852190. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Shipwreck'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'spaceport',
    label: 'Spaceports & Launch Sites',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      { ?item wdt:P31 wd:Q194188. } UNION { ?item wdt:P31 wd:Q1353183. }
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Spaceport'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'statue',
    label: 'Statues & Monuments',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel ?height WHERE {
      ?item wdt:P31 wd:Q179700. ?item wdt:P625 ?coord.
      ?item wdt:P2048 ?height. FILTER(?height > 10)
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?height) LIMIT 80`,
    sub(b,s,a,i){ const p=[]; if(b.countryLabel?.value)p.push(b.countryLabel.value); if(b.height?.value)p.push(parseFloat(b.height.value).toFixed(0)+' m'); return p.filter(Boolean).join(' · '); },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'wind_farm',
    label: 'Wind Farms',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q194356. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Wind farm'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'zoo',
    label: 'World Zoos',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q43501. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Zoo'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'amusement_park',
    label: 'Amusement Parks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q194195. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Amusement park'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'range',
    label: 'World Mountain Ranges',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q46831. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||''; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'sea',
    label: 'Seas',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q165. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Sea'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'valley',
    label: 'Valleys',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q39816. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Valley'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'escarpment',
    label: 'Escarpments',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q1174791. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Escarpment'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'geopark',
    label: 'Global Geoparks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q1324355. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 60`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Geopark'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_castle',
    label: 'World Castles',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q23413. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Castle'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_cathedral',
    label: 'World Cathedrals',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q2977. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Cathedral'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_park',
    label: 'World Parks',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q22698. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Park'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_theatre',
    label: 'World Theatres',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q24354. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Theatre'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_harbor',
    label: 'World Harbours',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q132213. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Harbour'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_shrine',
    label: 'World Shrines',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q16970. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Shrine'; },
    prefix(b,s,a){ return s||''; }
  },
  // India-specific SPARQL supplement (categories where Wikipedia returned 0)
  {
    id: 'embassy',
    label: 'Embassies (India)',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q3917681. ?item wdt:P625 ?coord.
      ?item wdt:P17 wd:Q668.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'India'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'shrine',
    label: 'Shrines (India)',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q16970. ?item wdt:P625 ?coord.
      ?item wdt:P17 wd:Q668.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'India'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_tomb',
    label: 'World Tombs',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q381885. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Tomb'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_embassy',
    label: 'World Embassies',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q3917681. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Embassy'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_reservoir',
    label: 'World Reservoirs',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q131681. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Reservoir'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_hospital',
    label: 'World Hospitals',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q16917. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Hospital'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_school',
    label: 'World Schools',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q3914. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'School'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_university',
    label: 'World Universities',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q3918. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'University'; },
    prefix(b,s,a){ return s||''; }
  },
  {
    id: 'w_stadium',
    label: 'World Stadiums',
    query: `SELECT DISTINCT ?item ?itemLabel ?coord ?countryLabel WHERE {
      ?item wdt:P31 wd:Q483110. ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } LIMIT 40`,
    sub(b,s,a,i){ return b.countryLabel?.value||'Stadium'; },
    prefix(b,s,a){ return s||''; }
  },
];

// ====== PROCESS CATEGORY ======

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

async function processCat(cat) {
  console.log(`\n▓ ${cat.label}`);
  let result;
  try { result = await sparql(cat.query); }
  catch(e){ console.log(`  ✗ Query failed: ${e.message}`); return []; }

  const seen = new Map();
  for(const b of result.results.bindings){
    const id=b.item?.value||'';
    if(seen.has(id)){
      const e=seen.get(id);
      if(b.stateLabel?.value&&!e.item.stateLabel)e.item.stateLabel=b.stateLabel;
      if(b.riverLabel?.value&&!e.item.riverLabel)e.item.riverLabel=b.riverLabel;
    } else { seen.set(id,{item:b}); }
  }

  // Phase 1: collect candidates
  const candidates = [];
  let skippedManual=0;
  let skippedGlobe=0;
  const globeCatNames = globeNames.get(cat.id);
  for(const[id,{item:b}]of seen){
    const label=b.itemLabel?.value||'';
    if(!label||/^Q\d+$/.test(label)||isBadName(label))continue;
    if(manualNames.has(normName(label))){ skippedManual++; continue; }
    if(globeCatNames&&globeCatNames.has(normName(label))){ skippedGlobe++; continue; }
    if(candidates.length>=120)break;
    const m=b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if(!m)continue;
    candidates.push({
      label, b,
      la:parseFloat(parseFloat(m[2]).toFixed(6)),
      ln:parseFloat(parseFloat(m[1]).toFixed(6)),
      state:b.stateLabel?.value||'',
      area:b.area?.value?parseFloat(b.area.value).toFixed(1)+' km²':'',
      incept:b.inception?.value?b.inception.value.slice(0,4):'',
    });
  }

  // Phase 2: batch-fetch summaries with concurrency
  console.log(`  Fetching ${candidates.length} summaries...`);
  const summaryResults = await fetchSummariesConcurrently(candidates.map(c => c.label), 5);

  // Phase 3: build and filter entries
  const out=[];
  let n=0;
  for(const cand of candidates){
    const label=cand.label;
    const sub=cat.sub(cand.b, cand.state, cand.area, cand.incept);
    const prefix=cat.prefix(cand.b, cand.state, cand.area);

    let wd=summaryResults[label];
    if(!wd&&cat.id==='dams')wd=await wikiSummary(label)+(/dam$/i.test(label)?'':' Dam');
    if(!wd&&cat.id==='rivers')wd=await wikiSummary(label)+(/river$/i.test(label)?'':' River');

    const txt=wd?.extract||'';
    const wikiDesc=buildDesc(txt);
    const wikiFact=buildFacts(txt,wikiDesc);
    const hasGoodWiki=wikiDesc&&wikiDesc.length>=30;

    let desc,fact;
    if(hasGoodWiki){
      desc=wikiDesc;
      fact=wikiFact||wikiDesc||sub||cat.label||'';
    }else{
      const catType=(cat.label||cat.id).toLowerCase();
      const subParts=sub?sub.split('·').map(s=>s.trim()).filter(Boolean):[];
      const location=subParts[0]||'';
      const extras=subParts.slice(1);
      desc=`${label} is a ${catType}`;
      if(location)desc+=` located in ${location}`;
      if(extras.length)desc+=` with ${extras.join(', ')}`;
      desc+='.';
      fact=sub||catType;
    }

    const entry={
      n:label, la:cand.la, ln:cand.ln, sub,
      desc:desc.slice(0,300),
      fact:fact.slice(0,300),
      img:wd?.thumbnail||'',
      _cat:cat.id,
      _quality:'good'
    };
    entry._quality=assessQuality(entry);
    if(entry._quality==='poor'||entry.sub.length<3||entry.la===0||!entry.n)continue;
    out.push(entry);
    n++;
    if(n%10===0)await new Promise(r=>setTimeout(r,100));
  }

  console.log(`  ${out.length} clean entries (from ${seen.size} raw, ${skippedManual} manual, ${skippedGlobe} globe skip)`);
  return out;
}

// ====== MAIN ======

async function main(){
  console.log('=== Wikidata Multi-Category Fetch ===\n');
  fs.mkdirSync(path.resolve(__dirname,'..','data'),{recursive:true});
  for(const cat of CFG){
    const entries=await processCat(cat);
    const fp=path.resolve(__dirname,'..','data',`wiki-${cat.id}.json`);
    if(entries.length===0){
      // Check if existing file has content (from wikipedia-fetch.js)
      try{
        const existing=JSON.parse(fs.readFileSync(fp,'utf8'));
        if(existing.length>0){
          console.log(`  → data/wiki-${cat.id}.json (kept ${existing.length} existing entries, merging ${entries.length} new)`);
          continue;
        }
      }catch{}
    }
    fs.writeFileSync(fp,JSON.stringify(entries,null,2),'utf8');
    console.log(`  → data/wiki-${cat.id}.json`);
  }
  console.log('\n=== Done ===');
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});

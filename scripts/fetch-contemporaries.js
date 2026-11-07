const fs = require('fs');
const path = require('path');
const https = require('https');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'studypro-wiki/1.0' };
    const req = https.get(opts, res => {
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

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'studypro-wiki/1.0' }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?format=json';
  return httpPost(url, 'query=' + encodeURIComponent(query));
}

const TYPE_MAP = {
  Q11631: 'ruler', Q477: 'ruler', Q31758: 'ruler', Q588767: 'ruler', Q14977072: 'ruler',
  Q171298: 'ruler', Q11424: 'ruler', Q164744: 'ruler', Q232908: 'ruler', Q105040: 'ruler',
  Q10871364: 'freedom_fighter', Q22686: 'freedom_fighter',
  Q611644: 'religious', Q133813: 'religious', Q20643955: 'religious',
  Q201788: 'religious', Q1778155: 'religious',
  Q844069: 'reformer',
  Q34763: 'explorer', Q11905581: 'explorer',
  Q7432: 'scholar', Q169470: 'scholar', Q36180: 'scholar', Q188094: 'scholar',
  Q12737077: 'scholar', Q482980: 'scholar', Q177054: 'scholar', Q170790: 'scholar',
  Q2374149: 'scholar', Q1622272: 'scholar', Q49757: 'scholar', Q1097498: 'scholar',
};

function classifyByDesc(desc) {
  if (!desc) return null;
  const d = desc.toLowerCase();
  if (/\b(king|emperor|ruler|monarch|maharaja|maharani|sultan[ae]?|shah|queen|prince|princess|pharaoh|caliph|nawab|rani|chieftain|rajah|begum)\b/.test(d)) return 'ruler';
  if (/\b(freedom fighter|independence activist|revolutionary|rebel|liberation|martyrs?)\b/.test(d)) return 'freedom_fighter';
  if (/\b(saint|guru|monk|nun|archbishop|patriarch|religious leader|missionary|swami|bhagwan|holy|clergy|buddhist monk|sufi|theologian|yog[iin])\b/.test(d)) return 'religious';
  if (/\b(reformer|social reformer|activist)\b/.test(d)) return 'reformer';
  if (/\b(explorer|navigator|discoverer|exploration)\b/.test(d)) return 'explorer';
  return null;
}

const ERA_BOUNDS = [
  { min: -10000, max: 1206, era: 'Ancient' },
  { min: 1206, max: 1526, era: 'Medieval' },
  { min: 1526, max: 1707, era: 'Mughal' },
  { min: 1707, max: 1947, era: 'Modern' },
  { min: 1947, max: 2030, era: 'Modern' },
];

function classifyEra(year) {
  for (const b of ERA_BOUNDS) {
    if (year >= b.min && year < b.max) return b.era;
  }
  return 'Global';
}

function classifyType(occupations, desc) {
  const fromDesc = classifyByDesc(desc);
  if (fromDesc) return fromDesc;
  if (occupations && occupations.length) {
    for (const o of occupations) {
      if (TYPE_MAP[o]) return TYPE_MAP[o];
    }
  }
  return 'scholar';
}

async function main() {
  console.log('=== Fetch Contemporaries ===\n');

  const INDIA_POLITIES = `wd:Q668 wd:Q39977 wd:Q131416 wd:Q1068147 wd:Q36217 wd:Q134923
    wd:Q189229 wd:Q14621 wd:Q1773283 wd:Q188433 wd:Q132001 wd:Q3816318
    wd:Q1193889 wd:Q26955 wd:Q62697 wd:Q59744 wd:Q1062709 wd:Q754770
    wd:Q208594 wd:Q1143007 wd:Q385073 wd:Q1142577 wd:Q321224 wd:Q736532
    wd:Q200651 wd:Q94588`.replace(/\s+/g,' ');

  const query = `SELECT ?item ?itemLabel ?birth ?death (SAMPLE(?desc) AS ?desc) (GROUP_CONCAT(DISTINCT ?occ; SEPARATOR="|") AS ?occIds) WHERE {
    ?item wdt:P31 wd:Q5. ?item wdt:P27 ?citizenship. ?item wdt:P569 ?birth. ?item wdt:P570 ?death.
    VALUES ?citizenship { ${INDIA_POLITIES} }
    OPTIONAL { ?item wdt:P106 ?occ. }
    OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc)="en") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }
  GROUP BY ?item ?itemLabel ?birth ?death
  ORDER BY ?birth LIMIT 600`;

  // Retry SPARQL up to 3 times with backoff
  let result, lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { result = await sparql(query); break; }
    catch (e) { lastErr = e; console.error(`SPARQL failed (attempt ${attempt}/3):`, e.message); }
    if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 10000));
  }
  if (!result) { console.error('SPARQL failed after 3 attempts, skipping contemporaries fetch'); return; }

  const entries = {};
  for (const b of result.results.bindings) {
    const label = b.itemLabel?.value || '';
    if (!label || /^Q\d+$/.test(label)) continue;

    const birth = b.birth?.value ? parseInt((b.birth.value.match(/^(-?\d+)/)||[])[1]) : null;
    const death = b.death?.value ? parseInt((b.death.value.match(/^(-?\d+)/)||[])[1]) : null;
    if (!birth || !death || isNaN(birth) || isNaN(death)) continue;
    if (birth > 2005 || death > 2025) continue;

    const occIds = b.occIds?.value ? b.occIds.value.split('|').map(u => u.replace(/^.*\//,'')) : [];
    const rawDesc = b.desc?.value || '';
    const type = classifyType(occIds, rawDesc);
    const era = classifyEra(birth);
    const desc = rawDesc ? rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1) : '';
    const title = desc.slice(0, 120) || type;

    entries[label] = { b: birth, d: death, title, type, era };
  }

  console.log(`Fetched ${Object.keys(entries).length} entries`);
  const fp = path.resolve(__dirname, '..', 'data', 'contemporaries.json');
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`→ data/contemporaries.json\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

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

function sparql(query) {
  return httpGet('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query));
}

const TYPE_MAP = {
  Q11631: 'ruler', Q477: 'ruler', Q31758: 'ruler', Q588767: 'ruler', Q14977072: 'ruler',
  Q171298: 'ruler', Q11424: 'ruler', Q164744: 'ruler', Q232908: 'ruler', Q105040: 'ruler',
  Q7432: 'scholar', Q169470: 'scholar', Q36180: 'scholar', Q188094: 'scholar',
  Q12737077: 'scholar', Q482980: 'scholar', Q177054: 'scholar', Q170790: 'scholar',
  Q2374149: 'scholar', Q1622272: 'scholar', Q49757: 'scholar', Q1097498: 'scholar',
  Q5: 'religious', Q611644: 'religious', Q133813: 'religious', Q20643955: 'religious',
  Q201788: 'religious', Q1778155: 'religious',
  Q10871364: 'freedom_fighter', Q22686: 'freedom_fighter',
  Q844069: 'reformer',
  Q34763: 'explorer', Q11905581: 'explorer',
};

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

function classifyType(occupations) {
  if (!occupations || !occupations.length) return 'scholar';
  for (const o of occupations) {
    if (TYPE_MAP[o]) return TYPE_MAP[o];
  }
  return 'scholar';
}

async function main() {
  console.log('=== Fetch Contemporaries ===\n');

  const query = `SELECT ?item ?itemLabel ?birth ?death ?desc (GROUP_CONCAT(DISTINCT ?occupation; SEPARATOR="|") AS ?occIds) (GROUP_CONCAT(DISTINCT ?occLabel; SEPARATOR="|") AS ?occLabels) WHERE {
    ?item wdt:P31 wd:Q5. ?item wdt:P27 wd:Q668. ?item wdt:P569 ?birth. ?item wdt:P570 ?death.
    OPTIONAL { ?item wdt:P106 ?occupation. }
    OPTIONAL { ?item wdt:P106 ?occ. ?occ rdfs:label ?occLabel. FILTER(LANG(?occLabel)="en") }
    OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc)="en") }
  }
  GROUP BY ?item ?itemLabel ?birth ?death ?desc
  ORDER BY ?birth LIMIT 400`;

  let result;
  try { result = await sparql(query); }
  catch (e) { console.error('SPARQL failed:', e.message); process.exit(1); }

  const entries = {};
  for (const b of result.results.bindings) {
    const label = b.itemLabel?.value || '';
    if (!label || /^Q\d+$/.test(label)) continue;

    const birth = b.birth?.value ? parseInt(b.birth.value.substring(0, 4)) * (b.birth.value.includes('-') && b.birth.value.startsWith('-') ? -1 : 1) : null;
    const death = b.death?.value ? parseInt(b.death.value.substring(0, 4)) * (b.death.value.includes('-') && b.death.value.startsWith('-') ? -1 : 1) : null;
    if (!birth || !death || isNaN(birth) || isNaN(death)) continue;
    if (birth > 2005 || death > 2025) continue;

    const occIds = b.occIds?.value ? b.occIds.value.split('|') : [];
    const type = classifyType(occIds);
    const era = classifyEra(birth);
    const desc = b.desc?.value ? b.desc.value.charAt(0).toUpperCase() + b.desc.value.slice(1) : '';
    const occLabels = b.occLabels?.value || '';

    const title = [desc, occLabels].filter(Boolean).join(' · ').slice(0, 120) || type;

    entries[label] = { b: birth, d: death, title, type, era };
  }

  console.log(`Fetched ${Object.keys(entries).length} entries`);
  const fp = path.resolve(__dirname, '..', 'data', 'contemporaries.json');
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`→ data/contemporaries.json\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

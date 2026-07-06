const fs = require('fs');
const path = require('path');
const https = require('https');

function httpGet(url, acceptJson = true) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'globe-fill/1.0 (exam-globe; mailto:bot@example.com)' };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d));
        resolve(acceptJson ? JSON.parse(d) : d);
      });
    }).on('error', reject);
  });
}

async function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
  return httpGet(url);
}

async function wikiSummary(title) {
  if (!title) return '';
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const d = await httpGet(url, true);
    return d.extract || d.description || '';
  } catch { 
    // try with full title
    try {
      const u2 = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title + ' National Park')}`;
      const d2 = await httpGet(u2, true);
      return d2.extract || '';
    } catch { return ''; }
  }
}

function coordFromWKT(wkt) {
  const m = wkt.match(/Point\(([\d.]+)\s+([\d.]+)\)/);
  if (!m) return [0, 0];
  return [parseFloat(m[2]), parseFloat(m[1])];
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }

function toFact(text) {
  // Convert Wikipedia extract to · separated fact string
  const sentences = text
    .replace(/\([^)]*\)/g, '')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
  return sentences.slice(0, 8).join(' · ').slice(0, 500);
}

function esc(s) {
  if (!s) return '';
  return s.replace(/'/g, "\\'").replace(/\n/g, ' ').trim();
}

async function main() {
  console.log('Querying Wikidata for Indian national parks...');
  const result = await sparql(`
    SELECT ?item ?itemLabel ?coord ?area ?inception ?stateLabel ?desc ?image WHERE {
      ?item wdt:P31 wd:Q46169.
      ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2046 ?area. }
      OPTIONAL { ?item wdt:P571 ?inception. }
      OPTIONAL { ?item wdt:P131 ?state. }
      OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc) = 'en') }
      OPTIONAL { ?item wdt:P18 ?image. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }
    ORDER BY ?itemLabel
  `);

  const seen = new Set();
  const parks = [];

  const seenAreas = new Map();
  for (const b of result.results.bindings) {
    const id = b.item.value;
    const areaVal = parseFloat(b.area?.value || '0');
    // Deduplicate: keep the entry with largest area (in case of multiple units)
    if (seenAreas.has(id)) {
      if (areaVal > seenAreas.get(id).area) {
        seenAreas.get(id).area = areaVal;
      }
      continue;
    }
    seenAreas.set(id, { id, item: b, area: areaVal });
  }

  let count = 0;
  for (const [id, { item: b, area: areaVal }] of seenAreas) {
    count++;

    const [la, ln] = coordFromWKT(b.coord?.value || '');
    const label = b.itemLabel?.value || '';
    const state = b.stateLabel?.value || '';
    const areaStr = areaVal > 0 ? areaVal + ' km²' : '';
    const incept = b.inception?.value ? b.inception.value.slice(0, 4) : '';
    const desc = b.desc?.value || '';

    // Attempt Wikipedia summary
    const wikiTitle = label; // Wikipedia titles usually end with " National Park"
    let wikiText = await wikiSummary(wikiTitle);
    if (!wikiText) {
      wikiText = await wikiSummary(wikiTitle + ' National Park');
    }

    const sub = [state, areaStr, incept ? 'est. ' + incept : ''].filter(Boolean).join(' · ');

    // desc: use Wikipedia first paragraph if available
    let finalDesc = desc;
    if (wikiText) {
      const paras = wikiText.split('\n').filter(p => p.trim().length > 30);
      finalDesc = paras[0] || wikiText.slice(0, 250);
    }
    finalDesc = truncate(finalDesc, 250);

    const fact = toFact(wikiText || desc || '');

    parks.push({ label, la, ln, sub: sub || state, desc: finalDesc, fact: fact || finalDesc });

    // Rate limit: 2 requests/sec to be polite
    if (count % 2 === 0) await new Promise(r => setTimeout(r, 500));
  }

  // Generate JS array
  let output = '// Auto-generated from Wikidata+Wikipedia — prototype\n';
  output += '// Run: node scripts/wikidata-fill-prototype.js\n\n';
  output += "const WIKI_NP = [\n";
  for (const p of parks) {
    output += `  {n:'${esc(p.label)}',la:${p.la},ln:${p.ln},sub:'${esc(p.sub)}',desc:'${esc(p.desc)}',fact:'${esc(p.fact)}'},\n`;
  }
  output += '];\n';
  output += `\n// Total: ${parks.length} parks\n`;

  fs.writeFileSync(path.resolve(__dirname, 'wikidata-np-output.txt'), output, 'utf8');
  console.log(`Wrote ${parks.length} entries to wikidata-np-output.txt`);
  console.log('\n--- First 5 entries ---');
  const lines = output.split('\n').slice(2, 7);
  for (const l of lines) console.log(l);
  console.log('--- Last 5 entries ---');
  const allLines = output.split('\n');
  for (const l of allLines.slice(-7, -2)) console.log(l);
}

main().catch(e => { console.error(e); process.exit(1); });

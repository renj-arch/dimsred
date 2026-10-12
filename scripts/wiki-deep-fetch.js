const fs = require('fs');
const path = require('path');
const https = require('https');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpGet(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'studypro-wiki/1.0 (bot)' } }, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            if (res.statusCode === 429) return reject(Object.assign(new Error('rate limited'), { status: 429 }));
            if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
            resolve(JSON.parse(d));
          });
        }).on('error', reject);
      });
    } catch (e) {
      if (e.status === 429 && attempt < retries) { await sleep((attempt + 1) * 10000); continue; }
      throw e;
    }
  }
}

async function wikiCategoryMembers(category) {
  let all = [], cmcontinue = '';
  while (true) {
    let url = 'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + encodeURIComponent(category) + '&cmlimit=500&format=json&cmtype=page&cmprop=title';
    if (cmcontinue) url += '&cmcontinue=' + encodeURIComponent(cmcontinue);
    const d = await httpGet(url);
    all = all.concat(d.query.categorymembers.map(m => m.title));
    cmcontinue = d.continue?.cmcontinue;
    if (!cmcontinue) break;
    await sleep(200);
  }
  return all;
}

// Get coord and QID for each title
async function titlesToData(titles) {
  const coordMap = new Map(), qidMap = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&prop=coordinates|pageprops&titles=' + encodeURIComponent(batch.join('|')) + '&format=json';
    const d = await httpGet(url);
    for (const [, page] of Object.entries(d.query.pages)) {
      if (page.title) {
        if (page.coordinates && page.coordinates.length > 0) {
          const c = page.coordinates[0];
          coordMap.set(page.title, { la: parseFloat(c.lat.toFixed(6)), ln: parseFloat(c.lon.toFixed(6)) });
        }
        if (page.pageprops?.wikibase_item) qidMap.set(page.title, page.pageprops.wikibase_item);
      }
    }
    await sleep(200);
  }
  return { coordMap, qidMap };
}

const DEEP_SPARQL = `SELECT ?item ?itemLabel ?coord ?coordSource ?placeLabel WHERE {
  VALUES ?item { QIDS }
  { ?item wdt:P625 ?coord. BIND("direct" as ?coordSource) }
  UNION { ?item wdt:P276 ?place. ?place wdt:P625 ?coord. BIND("location" as ?coordSource) }
  UNION { ?item wdt:P131 ?place. ?place wdt:P625 ?coord. BIND("admin" as ?coordSource) }
  UNION { ?item wdt:P17 ?place. ?place wdt:P625 ?coord. BIND("country" as ?coordSource) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
const DEEP_SPARQL_PERSON = `SELECT ?item ?itemLabel ?coord ?coordSource ?placeLabel WHERE {
  VALUES ?item { QIDS }
  { ?item wdt:P625 ?coord. BIND("direct" as ?coordSource) }
  UNION { ?item wdt:P19 ?place. ?place wdt:P625 ?coord. BIND("birth" as ?coordSource) }
  UNION { ?item wdt:P20 ?place. ?place wdt:P625 ?coord. BIND("death" as ?coordSource) }
  UNION { ?item wdt:P131 ?place. ?place wdt:P625 ?coord. BIND("admin" as ?coordSource) }
  UNION { ?item wdt:P17 ?place. ?place wdt:P625 ?coord. BIND("country" as ?coordSource) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

async function deepSparql(qids, queryTemplate) {
  if (!qids.length) return new Map();
  const coordMap = new Map();
  for (let i = 0; i < qids.length; i += 100) {
    const batch = qids.slice(i, i + 100);
    const qidList = batch.map(q => 'wd:' + q).join(' ');
    const q = queryTemplate.replace('QIDS', qidList);
    const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q);
    try {
      const d = await httpGet(url);
      for (const b of d.results.bindings) {
        const qid = b.item.value.split('/').pop();
        const m = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
        if (!m) continue;
        const score = { direct: 3, birth: 2, location: 2, death: 2, admin: 1, country: 0 }[b.coordSource?.value] || 0;
        const existing = coordMap.get(qid);
        if (existing && existing._score >= score) continue;
        coordMap.set(qid, { qid, la: parseFloat(parseFloat(m[2]).toFixed(6)), ln: parseFloat(parseFloat(m[1]).toFixed(6)), source: b.coordSource?.value, _score: score });
      }
    } catch (e) { console.log('  SPARQL error: ' + e.message); }
    await sleep(500);
  }
  return coordMap;
}

async function processDeep(id, wikiCat, usePersonQuery, maxEntries) {
  console.log('\n--- ' + id + ' (' + wikiCat + ') ---');

  // Read existing data
  const wikiPath = path.resolve(__dirname, '..', 'data', 'wiki-' + id + '.json');
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(wikiPath, 'utf8')); } catch {}
  const existingNames = new Set(existing.map(e => e.n.toLowerCase().replace(/\s+/g, ' ').trim()));
  console.log('  Existing: ' + existing.length);

  // Read D.* from 3d-globe.html for dedup
  const htmlPath = path.resolve(__dirname, '..', '3d-globe.html');
  let htmlDedup = new Set();
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const rx = new RegExp('D\\.' + id + '\\s*=\\s*\\[([\\s\\S]*?)\\];', 'i');
    const m = rx.exec(html);
    if (m) {
      const nameRx = /n\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      let nm; while ((nm = nameRx.exec(m[1])) !== null) htmlDedup.add(nm[1].toLowerCase().replace(/\s+/g, ' ').trim());
    }
  } catch {}
  console.log('  Existing in HTML: ' + htmlDedup.size);

  const allDedup = new Set([...existingNames, ...htmlDedup]);

  // Get member pages
  const titles = await wikiCategoryMembers(wikiCat);
  console.log('  Pages: ' + titles.length);
  if (!titles.length) return { new: 0, total: existing.length };

  // Get Wikipedia coords + QIDs
  const { coordMap, qidMap } = await titlesToData(titles);
  console.log('  Wiki coords: ' + coordMap.size + ', QIDs: ' + qidMap.size);

  // Deep SPARQL for uncordinated pages
  const qidsWithoutCoords = [...new Set(qidMap.values())].filter(q => ![...coordMap.keys()].some(t => qidMap.get(t) === q));
  const sparqlTemplate = usePersonQuery ? DEEP_SPARQL_PERSON : DEEP_SPARQL;
  const sparqlCoords = await deepSparql(qidsWithoutCoords, sparqlTemplate);
  console.log('  Deep SPARQL: ' + sparqlCoords.size + ' new');

  // Merge coords
  const merged = new Map();
  for (const [t, c] of coordMap) merged.set(t, { la: c.la, ln: c.ln, source: 'wiki' });
  for (const [t, qid] of qidMap) {
    const sc = sparqlCoords.get(qid);
    if (sc && !merged.has(t)) merged.set(t, { la: sc.la, ln: sc.ln, source: sc.source });
  }
  console.log('  Total with coords: ' + merged.size);

  // Find new candidates
  const candidates = [];
  for (const t of titles) {
    const coord = merged.get(t);
    if (!coord) continue;
    const key = t.toLowerCase().replace(/\s+/g, ' ').trim();
    if (allDedup.has(key)) continue;
    candidates.push({ title: t, coord });
    if (candidates.length >= maxEntries) break;
  }
  console.log('  New candidates: ' + candidates.length);
  if (!candidates.length) return { new: 0, total: existing.length };

  // Brief summaries only — single request per title, skip if 429
  const newEntries = [];
  for (const cand of candidates) {
    try {
      const d = await httpGet('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(cand.title));
      const txt = d.extract || '';
      const desc = txt.replace(/\([^)]*\)/g, '').split(/[.!?]+/).filter(s => s.trim().length > 15 && !/^(it|this|the)\s+is\s+a/i.test(s.trim())).slice(0, 3).map(s => s.trim()).join('. ') + '.';
      const factSents = txt.replace(/\([^)]*\)/g, '').split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
      const fact = factSents.slice(0, 4).join(' \u00b7 ');
      if (desc.length < 5 && fact.length < 5) continue;
      newEntries.push({ n: cand.title, la: cand.coord.la, ln: cand.coord.ln, desc: desc || fact.slice(0, 200), fact: fact || desc });
    } catch {}
    await sleep(300);
  }
  console.log('  With summaries: ' + newEntries.length);

  if (!newEntries.length) return { new: 0, total: existing.length };

  // Merge: existing + new
  const mergedList = existing.concat(newEntries);
  fs.writeFileSync(wikiPath, JSON.stringify(mergedList, null, 2), 'utf8');
  console.log('  -> data/wiki-' + id + '.json (' + mergedList.length + ' entries)');
  return { new: newEntries.length, total: mergedList.length };
}

const DEEP_CATS = [
  // Event categories
  ['w_treaty', 'Category:Treaties', false],
  ['w_battle', 'Category:Battles', false],
  ['w_war', 'Category:Wars', false],
  ['w_revolution', 'Category:Revolutions', false],
  ['w_disaster', 'Category:Natural_disasters', false],
  // People categories
  ['personality', 'Category:Indian_historical_figures', true],
  ['writer', 'Category:Indian_poets', true],
  ['reformer', 'Category:Indian_social_reformers', true],
  ['philosopher', 'Category:Indian_philosophers', true],
  ['artist', 'Category:Indian_artists', true],
  ['architect', 'Category:Indian_architects', true],
  ['ruler', 'Category:Indian_monarchs', true],
  ['freedom', 'Category:Indian_revolutionaries', true],
  ['traveller', 'Category:Indian_explorers', true],
  ['invention', 'Category:Indian_inventions', true],
  ['movement', 'Category:Environmental_protests_in_India', false],
  ['i_book', 'Category:Ancient_Indian_literature', false],
  ['tribal', 'Category:Adivasi', false],
  ['corridor', 'Category:Elephant_reserves_of_India', false],
  ['country', 'Category:Member_states_of_the_United_Nations', false],
  // World people
  ['w_philosopher', 'Category:Philosophers', true],
  ['w_artist', 'Category:Artists', true],
  ['w_architect', 'Category:Architects', true],
  // Event/war categories
  ['w_ww1', 'Category:World_War_I', false],
  ['w_ww2', 'Category:World_War_II', false],
  ['w_empire', 'Category:Empires', false],
];

async function main() {
  const startFrom = parseInt(process.argv[2] || '0');
  console.log('=== Deep Fetch v2 (MERGE mode) ===');
  console.log('Start from index: ' + startFrom + '\n');

  let totalNew = 0, totalExisting = 0;
  for (let i = startFrom; i < DEEP_CATS.length; i++) {
    const [id, wikiCat, usePerson] = DEEP_CATS[i];
    console.log('[' + (i + 1) + '/' + DEEP_CATS.length + ']');
    try {
      const r = await processDeep(id, wikiCat, usePerson, 100);
      totalNew += r.new;
      totalExisting += r.total;
    } catch (e) {
      console.log('  ERROR: ' + e.message);
    }
    if (i < DEEP_CATS.length - 1) await sleep(3000);
  }
  console.log('\n=== Done. New: ' + totalNew + ', Total across files: ' + totalExisting + ' ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

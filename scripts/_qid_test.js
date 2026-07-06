const fs = require('fs');
const https = require('https');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' };
    const req = https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sparql(query) {
  return httpGet('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query));
}

async function testQuery(label, query, limit) {
  const q = query.replace('LIMIT 5', `LIMIT ${limit||5}`);
  try {
    const r = await sparql(q);
    console.log(`\n=== ${label} (${r.results.bindings.length} results) ===`);
    for (const b of r.results.bindings.slice(0, Math.min(r.results.bindings.length, 10))) {
      const name = b.itemLabel?.value || '?';
      const state = b.stateLabel?.value || '';
      const extra = Object.keys(b).filter(k => !['item','itemLabel','stateLabel'].includes(k)).map(k => `${k}=${b[k]?.value||''}`).join(', ');
      console.log(`  ${name}${state ? ' · ' + state : ''}${extra ? ' [' + extra.slice(0, 80) + ']' : ''}`);
    }
    return r.results.bindings;
  } catch (e) {
    console.log(`\n=== ${label} === ✗ ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('=== Wikidata QID Discovery ===\n');

  // Alternative approaches for categories with no standard class IDs

  // Test A: Items with Ramsar site ID (P6344) in India
  await testQuery('Ramsar sites (has P6344 code)', `
    SELECT ?item ?itemLabel ?stateLabel ?code WHERE {
      ?item wdt:P6344 ?code. ?item wdt:P17 wd:Q668.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test B: Any item with "tiger reserve" in label (no country filter)
  await testQuery('Items with "Tiger Reserve" in label (no country filter)', `
    SELECT ?item ?itemLabel ?stateLabel WHERE {
      ?item rdfs:label ?label.
      FILTER(LANG(?label) = 'en' && CONTAINS(LCASE(?label), "tiger reserve"))
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test B2: With country filter this time working
  await testQuery('Items with "Tiger Reserve" in label, limited to India', `
    SELECT ?item ?itemLabel ?stateLabel WHERE {
      ?item wdt:P17 wd:Q668.
      ?item rdfs:label ?label.
      FILTER(LANG(?label) = 'en' && CONTAINS(LCASE(?label), "tiger reserve"))
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test C: Any item with "biosphere reserve" in label in India
  await testQuery('Items with "Biosphere Reserve" in label', `
    SELECT ?item ?itemLabel ?stateLabel WHERE {
      ?item wdt:P17 wd:Q668.
      FILTER(CONTAINS(LCASE(?itemLabel), "biosphere"))
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test D: Any item with "wildlife sanctuary" in label in India (limited)
  await testQuery('Items with "Wildlife Sanctuary" in label', `
    SELECT ?item ?itemLabel ?stateLabel WHERE {
      ?item wdt:P17 wd:Q668.
      FILTER(CONTAINS(LCASE(?itemLabel), "wildlife sanctuary"))
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test E: UNESCO sites with coords
  await testQuery('UNESCO WHS with coords', `
    SELECT ?item ?itemLabel ?stateLabel ?coord WHERE {
      ?item wdt:P1435 wd:Q9259. ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test F: Dams with coords (no height filter — broader)
  await testQuery('Dams with coords (no height filter)', `
    SELECT ?item ?itemLabel ?stateLabel ?height WHERE {
      ?item wdt:P31 wd:Q12323. ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2048 ?height. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?height) LIMIT 15`);

  // Test G: Mountains/peaks in India  
  await testQuery('Mountains (P31=Q8502) in India', `
    SELECT ?item ?itemLabel ?stateLabel ?elevation WHERE {
      ?item wdt:P31 wd:Q8502. ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2044 ?elevation. }
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY DESC(?elevation) LIMIT 15`);

  // Test H: Lakes in India with coords
  await testQuery('Lakes (P31=Q23397) in India', `
    SELECT ?item ?itemLabel ?stateLabel WHERE {
      ?item wdt:P31 wd:Q23397. ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P131 ?state. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    } ORDER BY ?itemLabel LIMIT 15`);

  // Test I: Protected areas (Q170584) in India — get count
  await testQuery('Protected areas (P31=Q170584) in India', `
    SELECT (COUNT(?item) AS ?count) WHERE {
      ?item wdt:P31 wd:Q170584. ?item wdt:P17 wd:Q668.
    }`);
}

main().catch(e => console.error('Fatal:', e.message));

const https = require('https');
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'test/1.0' };
    const req = https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}
async function main() {
  const cats = [
    { q: `SELECT ?item ?itemLabel ?coord WHERE { SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch". bd:serviceParam wikibase:endpoint "www.wikidata.org". bd:serviceParam mwapi:search "tiger reserve india". bd:serviceParam mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. } ?item wdt:P625 ?coord. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 30`, label: 'Tiger Reserve (mwapi)' },
    { q: `SELECT ?item ?itemLabel ?coord WHERE { SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch". bd:serviceParam wikibase:endpoint "www.wikidata.org". bd:serviceParam mwapi:search "wildlife sanctuary india". bd:serviceParam mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. } ?item wdt:P625 ?coord. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 20`, label: 'Wildlife Sanc (mwapi)' },
    { q: `SELECT ?item ?itemLabel ?coord WHERE { SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch". bd:serviceParam wikibase:endpoint "www.wikidata.org". bd:serviceParam mwapi:search "biosphere reserve india". bd:serviceParam mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. } ?item wdt:P625 ?coord. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 20`, label: 'Biosphere Res (mwapi)' },
  ];
  for (const c of cats) {
    try {
      const r = await httpGet('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(c.q));
      console.log(`=== ${c.label}: ${r.results.bindings.length} results`);
      for (const b of r.results.bindings.slice(0, 15)) {
        console.log(' ', b.itemLabel?.value || '?', '·', b.coord?.value?.slice(0, 30) || '');
      }
    } catch (e) { console.log(`=== ${c.label}: FAILED - ${e.message}`); }
  }
}
main().catch(e => console.error(e.message));

const fs = require('fs');
const path = require('path');
const https = require('https');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpGet(url) {
  for (let attempt = 0; attempt <= 3; attempt++) {
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
      if (e.status === 429 && attempt < 3) { await sleep((attempt + 1) * 10000); continue; }
      throw e;
    }
  }
}

async function wikiCategoryMembers(category, maxPages = 500) {
  let all = [], cmcontinue = '';
  while (all.length < maxPages) {
    let url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=500&format=json&cmtype=page`;
    if (cmcontinue) url += `&cmcontinue=${encodeURIComponent(cmcontinue)}`;
    const d = await httpGet(url);
    all = all.concat(d.query.categorymembers.map(m => m.title));
    cmcontinue = d.continue?.cmcontinue;
    if (!cmcontinue) break;
    await sleep(200);
  }
  return all.filter(t => !t.startsWith('List of ') && !t.includes('/'));
}

async function fetchCoords(titles) {
  const coordMap = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&titles=' + encodeURIComponent(batch.join('|')) + '&format=json';
    const d = await httpGet(url);
    for (const [, page] of Object.entries(d.query.pages)) {
      if (page.coordinates && page.coordinates.length > 0) {
        const c = page.coordinates[0];
        coordMap.set(page.title, { la: parseFloat(c.lat.toFixed(6)), ln: parseFloat(c.lon.toFixed(6)) });
      }
    }
    await sleep(200);
  }
  return coordMap;
}

async function fetchSummaries(titles) {
  const results = {};
  for (const title of titles) {
    try {
      const d = await httpGet('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
      if (d.type !== 'disambiguation' && d.extract) results[title] = { extract: d.extract, thumbnail: d.thumbnail?.source };
    } catch {}
    await sleep(200);
  }
  return results;
}

function cleanText(s) {
  if (!s) return '';
  return s.replace(/\s+\.\s*(\d)/g, '.$1').replace(/(\d)\s+km2/g, '$1 km\u00b2').replace(/\uFFFD/g, '').replace(/\s{2,}/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
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
  return out.slice(0, 4).join(' \u00b7 ');
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

async function processCategory(id, wikiCat, maxEntries = 40) {
  console.log(`\n--- ${id} (${wikiCat}) ---`);

  const titles = await wikiCategoryMembers(wikiCat);
  console.log(`  Pages: ${titles.length}`);
  if (!titles.length) return 0;

  // Dedup against existing entries in 3d-globe.html
  const dedupSet = new Set();
  const htmlPath = path.resolve(__dirname, '..', '3d-globe.html');
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const rx = new RegExp('D\\.' + id + '\\s*=\\s*\\[([\\s\\S]*?)\\];', 'i');
    const m = rx.exec(html);
    if (m) {
      const nameRx = /n\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      let nm; while ((nm = nameRx.exec(m[1])) !== null) dedupSet.add(nm[1].toLowerCase().replace(/\s+/g, ' ').trim());
    }
  } catch (e) { console.log('  Warning: ' + e.message); }

  // Dedup against existing wiki file
  const wikiPath = path.resolve(__dirname, '..', 'data', 'wiki-' + id + '.json');
  try {
    const existing = JSON.parse(fs.readFileSync(wikiPath, 'utf8'));
    for (const e of existing) if (e.n) dedupSet.add(e.n.toLowerCase().replace(/\s+/g, ' ').trim());
  } catch {}

  console.log('  Existing entries: ' + dedupSet.size);

  // Direct coordinate fetch (skip QID/SPARQL)
  const coordMap = await fetchCoords(titles);
  console.log('  With Wikipedia coords: ' + coordMap.size);

  // Filter candidates
  const candidates = [];
  for (const title of titles) {
    if (candidates.length >= maxEntries) break;
    const coord = coordMap.get(title);
    if (!coord) continue;
    const key = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (dedupSet.has(key)) continue;
    dedupSet.add(key);
    candidates.push({ title, coord });
  }
  console.log('  New candidates: ' + candidates.length);
  if (!candidates.length) return 0;

  // Fetch summaries
  console.log('  Fetching summaries...');
  const summaries = await fetchSummaries(candidates.map(c => c.title));

  // Build entries
  const out = [];
  for (const cand of candidates) {
    const wd = summaries[cand.title];
    const txt = wd?.extract || '';
    const desc = buildDesc(txt);
    const fact = buildFacts(txt, desc);
    const entry = {
      n: cand.title, la: cand.coord.la, ln: cand.coord.ln,
      desc: desc || fact?.slice(0, 200) || '',
      fact: fact || desc || ''
    };
    if (entry.desc.length < 5 && entry.fact.length < 5) continue;
    entry._quality = assessQuality(entry);
    if (entry._quality === 'poor' || entry.la === 0) continue;
    out.push(entry);
    if (out.length % 10 === 0) process.stdout.write('  ...' + out.length + '\n');
  }
  console.log('  Clean entries: ' + out.length);

  if (out.length) {
    fs.writeFileSync(wikiPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('  -> data/wiki-' + id + '.json');
  }
  return out.length;
}

// Categories whose wiki files are empty and that should have coordinates
const TARGETS = [
  // India geographic features that exist
  ['archaeological_site', 'Category:Archaeological_sites_in_India'],
  ['border_road', 'Category:Border_Roads_Organisation'],
  ['canal', 'Category:Canals_in_India'],
  ['cape', 'Category:Capes_of_India'],
  ['cement', 'Category:Cement_plants_in_India'],
  ['church', 'Category:Churches_in_India'],
  ['dfc', 'Category:Dedicated_freight_corridors_in_India'],
  ['drainage', 'Category:Drainage_basins_of_India'],
  ['escarpment', 'Category:Escarpments_of_India'],
  ['fertilizer', 'Category:Fertilizer_plants_in_India'],
  ['fjord', 'Category:Fjords_of_India'],
  ['gulf', 'Category:Gulfs_of_India'],
  ['harbor', 'Category:Ports_and_harbours_of_India'],
  ['highway', 'Category:National_highways_in_India'],
  ['i_colonial', 'Category:Colonial_architecture_in_India'],
  ['i_corridor', 'Category:Industrial_corridors_in_India'],
  ['i_glacier', 'Category:Glaciers_of_India'],
  ['i_lake', 'Category:Lakes_of_India'],
  ['i_medieval', 'Category:Medieval_sites_of_India'],
  ['i_movement', 'Category:Social_movements_in_India'],
  ['i_observatory', 'Category:Observatories_in_India'],
  ['i_pilgrimage', 'Category:Pilgrimage_sites_of_India'],
  ['i_range', 'Category:Mountain_ranges_of_India'],
  ['i_stadium', 'Category:Stadiums_in_India'],
  ['i_tunnel', 'Category:Tunnels_in_India'],
  ['i_waterfall', 'Category:Waterfalls_of_India'],
  ['industrial', 'Category:Industrial_regions_in_India'],
  ['island', 'Category:Islands_of_India'],
  ['kingdom', 'Category:Empires_and_kingdoms_of_India'],
  ['lagoon', 'Category:Lagoons_of_India'],
  ['lighthouse', 'Category:Lighthouses_in_India'],
  ['mineral', 'Category:Minerals_of_India'],
  ['monastery', 'Category:Monasteries_in_India'],
  ['monsoon', 'Category:Monsoon'],
  ['mosque', 'Category:Mosques_in_India'],
  ['oil', 'Category:Oil_fields_of_India'],
  ['organization', 'Category:Indian_nationalist_political_parties'],
  ['peninsula', 'Category:Peninsulas_of_India'],
  ['pipeline', 'Category:Pipelines_in_India'],
  ['plain', 'Category:Plains_of_India'],
  ['plateau', 'Category:Plateaus_of_India'],
  ['power_plant', 'Category:Power_stations_in_India'],
  ['rainfall', 'Category:Weather_records'],
  ['range', 'Category:Mountain_ranges_of_India'],
  ['reef', 'Category:Reefs_of_India'],
  ['rl_zone', 'Category:Indian_Railway_zones'],
  ['sea', 'Category:Seas_of_India'],
  ['seismic_zone', 'Category:Seismic_zones_of_India'],
  ['soil', 'Category:Soils_of_India'],
  ['strait', 'Category:Straits_of_India'],
  ['tunnel', 'Category:Tunnels_in_India'],
  ['valley', 'Category:Valleys_of_India'],
  ['vegetation', 'Category:Vegetation_of_India'],
  ['wind', 'Category:Wind'],
  ['wind_farm', 'Category:Wind_farms_in_India'],
  ['zoo', 'Category:Zoos_in_India'],

  // World categories
  ['w_airport', 'Category:Airports'],
  ['w_archipelago', 'Category:Archipelagoes'],
  ['w_bay', 'Category:Bays'],
  ['w_bridge', 'Category:Bridges'],
  ['w_cave', 'Category:Caves'],
  ['w_city', 'Category:Cities'],
  ['w_civilization', 'Category:Ancient_civilizations'],
  ['w_coast', 'Category:Coasts'],
  ['w_dam', 'Category:Dams'],
  ['w_disaster', 'Category:Natural_disasters'],
  ['w_gorge', 'Category:Gorges'],
  ['w_inst', 'Category:Research_institutes'],
  ['w_isthmus', 'Category:Isthmuses'],
  ['w_kingdom', 'Category:Former_kingdoms'],
  ['w_landmark', 'Category:Landmarks'],
  ['w_market', 'Category:Markets'],
  ['w_meteorite', 'Category:Meteorites'],
  ['w_np', 'Category:National_parks'],
  ['w_organization', 'Category:International_organizations'],
  ['w_pass', 'Category:Mountain_passes'],
  ['w_plate', 'Category:Tectonic_plates'],
  ['w_revolution', 'Category:Revolutions'],
  ['w_river', 'Category:Rivers'],
  ['w_spring', 'Category:Springs'],
  ['w_unesco', 'Category:World_Heritage_Sites'],
  ['w_ww1', 'Category:World_War_I'],
  ['w_ww2', 'Category:World_War_II'],
];

async function main() {
  console.log('=== Wikipedia Direct Coordinate Fetch =====\n');

  // Filter to only empty wiki files
  const dataDir = path.resolve(__dirname, '..', 'data');
  const todo = [];
  for (const [id, wikiCat] of TARGETS) {
    const fp = path.join(dataDir, 'wiki-' + id + '.json');
    try {
      const existing = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (existing.length > 0) {
        console.log('Skip ' + id + ' (already has ' + existing.length + ' entries)');
        continue;
      }
    } catch {}
    todo.push([id, wikiCat]);
  }

  console.log('Categories to retry: ' + todo.length + '\n');

  let total = 0;
  for (let i = 0; i < todo.length; i++) {
    const [id, wikiCat] = todo[i];
    console.log('[' + (i + 1) + '/' + todo.length + ']');
    try {
      const n = await processCategory(id, wikiCat);
      total += n;
    } catch (e) {
      console.log('  ERROR: ' + e.message);
    }
    await sleep(3000);
  }
  console.log('\n=== Done. Total new entries: ' + total + ' ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

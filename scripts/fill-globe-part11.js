const fs = require('fs');
const path = require('path');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');

function esc(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

const CAT_MAP = {
  'wiki-airport.json': 'airport',
  'wiki-battle.json': 'battle',
  'wiki-biosphere.json': 'biosphere',
  'wiki-bird.json': 'bird',
  'wiki-city.json': 'city',
  'wiki-crop.json': 'crop',
  'wiki-dams.json': 'dam',
  'wiki-desert.json': 'desert',
  'wiki-forest.json': 'forest',
  'wiki-glacier.json': 'glacier',
  'wiki-highway.json': 'highway',
  'wiki-hill.json': 'hill',
  'wiki-institution.json': 'institution',
  'wiki-i_fort.json': 'i_fort',
  'wiki-i_palace.json': 'i_palace',
  'wiki-i_pass.json': 'i_pass',
  'wiki-island.json': 'island',
  'wiki-kingdom.json': 'kingdom',
  'wiki-lakes.json': 'lake',
  'wiki-mineral.json': 'mineral',
  'wiki-national_park.json': 'national_park',
  'wiki-nuclear.json': 'nuclear',
  'wiki-peak.json': 'peak',
  'wiki-plateau.json': 'plateau',
  'wiki-port.json': 'port',
  'wiki-railway.json': 'railway',
  'wiki-ramsar.json': 'ramsar',
  'wiki-range.json': 'range',
  'wiki-rivers.json': 'river',
  'wiki-sea.json': 'sea',
  'wiki-temple.json': 'temple',
  'wiki-tiger.json': 'tiger',
  'wiki-tower.json': 'tower',
  'wiki-unesco.json': 'unesco',
  'wiki-w_unesco.json': 'w_unesco',
  'wiki-valley.json': 'valley',
  'wiki-volcano.json': 'volcano',
  'wiki-waterfall.json': 'waterfall',
  'wiki-wildlife.json': 'wildlife',
  'wiki-w_battle.json': 'w_battle',
  'wiki-w_city.json': 'w_city',
  'wiki-w_kingdom.json': 'w_kingdom',
  'wiki-w_river.json': 'w_river',
  'wiki-w_peak.json': 'w_peak',
  'wiki-w_np.json': 'w_np',
  'wiki-w_inst.json': 'w_inst',
  'wiki-w_landmark.json': 'w_landmark',
  'wiki-w_bridge.json': 'w_bridge',
  'wiki-w_airport.json': 'w_airport',
  'wiki-w_dam.json': 'w_dam',
  'wiki-w_pass.json': 'w_pass',
  'wiki-strait.json': 'strait',
  'wiki-peninsula.json': 'peninsula',
  'wiki-gulf.json': 'gulf',
  'wiki-canal.json': 'canal',
  'wiki-reef.json': 'reef',
  'wiki-canyon.json': 'canyon',
  'wiki-cape.json': 'cape',
  'wiki-delta.json': 'delta',
  'wiki-plain.json': 'plain',
  'wiki-tunnel.json': 'tunnel',
  'wiki-oil.json': 'oil',
  'wiki-current.json': 'current',
  'wiki-lighthouse.json': 'lighthouse',
  'wiki-wonder.json': 'wonder',
  'wiki-w_bay.json': 'w_bay',
  'wiki-w_cave.json': 'w_cave',
  'wiki-w_gorge.json': 'w_gorge',
  'wiki-w_archipelago.json': 'w_archipelago',
  'wiki-w_geyser.json': 'w_geyser',
  'wiki-w_isthmus.json': 'w_isthmus',
  'wiki-w_spring.json': 'w_spring',
  'wiki-w_coast.json': 'w_coast',
  'wiki-w_empire.json': 'w_empire',
  'wiki-w_civilization.json': 'w_civilization',
  'wiki-w_revolution.json': 'w_revolution',
  'wiki-w_treaty.json': 'w_treaty',
  'wiki-w_disaster.json': 'w_disaster',
  'wiki-w_war.json': 'w_war',
  'wiki-metro.json': 'metro',
  'wiki-waterway.json': 'waterway',
  'wiki-w_trench.json': 'w_trench',
  'wiki-w_plate.json': 'w_plate',
  'wiki-w_ww2.json': 'w_ww2',
  'wiki-w_ww1.json': 'w_ww1',
  'wiki-w_meteorite.json': 'w_meteorite',
  'wiki-i_range.json': 'i_range',
  'wiki-i_fort.json': 'i_fort',
  'wiki-i_palace.json': 'i_palace',
  'wiki-i_lake.json': 'i_lake',
  'wiki-i_glacier.json': 'i_glacier',
  'wiki-i_waterfall.json': 'i_waterfall',
  'wiki-i_island.json': 'i_island',
  'wiki-i_cave.json': 'i_cave',
  'wiki-i_bridge.json': 'i_bridge',
  'wiki-i_tunnel.json': 'i_tunnel',
  'wiki-i_stadium.json': 'i_stadium',
  'wiki-i_observatory.json': 'i_observatory',
  'wiki-i_zoo.json': 'i_zoo',
  'wiki-rl_zone.json': 'rl_zone',
  'wiki-pipeline.json': 'pipeline',
  'wiki-refinery.json': 'refinery',
  'wiki-fertilizer.json': 'fertilizer',
  'wiki-cement.json': 'cement',
  'wiki-power_plant.json': 'power_plant',
  'wiki-steel_plant.json': 'steel_plant',
  'wiki-tribe.json': 'tribe',
  'wiki-i_freedom.json': 'i_freedom',
  'wiki-i_medieval.json': 'i_medieval',
  'wiki-i_colonial.json': 'i_colonial',
  'wiki-i_movement.json': 'i_movement',
  'wiki-i_pilgrimage.json': 'i_pilgrimage',
  'wiki-personality.json': 'personality',
  'wiki-irrigation.json': 'irrigation',
  'wiki-drainage.json': 'drainage',
  'wiki-physiographic.json': 'physiographic',
  'wiki-soil.json': 'soil',
  'wiki-monsoon.json': 'monsoon',
  'wiki-vegetation.json': 'vegetation',
  'wiki-seismic_zone.json': 'seismic_zone',
  'wiki-biogeographic_zone.json': 'biogeographic_zone',
  'wiki-industrial.json': 'industrial',
  'wiki-wind.json': 'wind',
  'wiki-cloud.json': 'cloud',
  'wiki-rainfall.json': 'rainfall',
  'wiki-latitude.json': 'latitude',
  'wiki-trade.json': 'trade',
  'wiki-phenomena.json': 'phenomena',
  'wiki-dfc.json': 'dfc',
  'wiki-i_corridor.json': 'i_corridor',
  'wiki-border_road.json': 'border_road',
  'wiki-ocean.json': 'ocean',
  'wiki-fjord.json': 'fjord',
  'wiki-atoll.json': 'atoll',
  'wiki-oasis.json': 'oasis',
  'wiki-salt_flat.json': 'salt_flat',
  'wiki-mountains.json': 'mountains',
  'wiki-mangrove.json': 'mangrove',
  'wiki-ice_shelf.json': 'ice_shelf',
  'wiki-ocean_ridge.json': 'ocean_ridge',
  'wiki-seamount.json': 'seamount',
  'wiki-capital.json': 'capital',
  'wiki-ice_cap.json': 'ice_cap',
  'wiki-biome.json': 'biome',
  'wiki-climate_zone.json': 'climate_zone',
  'wiki-cyclone_region.json': 'cyclone_region',
  'wiki-tornado_region.json': 'tornado_region',
  'wiki-time_zone.json': 'time_zone',
  'wiki-basin.json': 'basin',
  'wiki-crater.json': 'crater',
  'wiki-ecoregion.json': 'ecoregion',
  'wiki-estuary.json': 'estuary',
  'wiki-lagoon.json': 'lagoon',
  'wiki-mesa.json': 'mesa',
  'wiki-museum.json': 'museum',
  'wiki-religious.json': 'religious',
  'wiki-shipwreck.json': 'shipwreck',
  'wiki-spaceport.json': 'spaceport',
  'wiki-statue.json': 'statue',
  'wiki-wind_farm.json': 'wind_farm',
  'wiki-zoo.json': 'zoo',
  'wiki-amusement_park.json': 'amusement_park',
  'wiki-folk_dance.json': 'folk_dance',
  'wiki-longitude.json': 'longitude',
  'wiki-festival.json': 'festival',
  'wiki-language.json': 'language',
  'wiki-cuisine.json': 'cuisine',
  'wiki-classical_dance.json': 'classical_dance',
  'wiki-monument.json': 'monument',
  'wiki-mosque.json': 'mosque',
  'wiki-church.json': 'church',
  'wiki-castle.json': 'castle',
  'wiki-cathedral.json': 'cathedral',
  'wiki-embassy.json': 'embassy',
  'wiki-harbor.json': 'harbor',
  'wiki-market.json': 'market',
  'wiki-park.json': 'park',
  'wiki-reservoir.json': 'reservoir',
  'wiki-shrine.json': 'shrine',
  'wiki-theatre.json': 'theatre',
  'wiki-tomb.json': 'tomb',
  'wiki-archaeological_site.json': 'archaeological_site',
  'wiki-monastery.json': 'monastery',
  'wiki-escarpment.json': 'escarpment',
  'wiki-geopark.json': 'geopark',
  'wiki-w_castle.json': 'w_castle',
  'wiki-w_cathedral.json': 'w_cathedral',
  'wiki-w_embassy.json': 'w_embassy',
  'wiki-w_harbor.json': 'w_harbor',
  'wiki-w_market.json': 'w_market',
  'wiki-w_park.json': 'w_park',
  'wiki-w_reservoir.json': 'w_reservoir',
  'wiki-w_shrine.json': 'w_shrine',
  'wiki-w_theatre.json': 'w_theatre',
  'wiki-w_tomb.json': 'w_tomb',
  'wiki-w_hospital.json': 'w_hospital',
  'wiki-w_school.json': 'w_school',
  'wiki-w_university.json': 'w_university',
  'wiki-w_stadium.json': 'w_stadium',
};

let html = fs.readFileSync(GLOBE_PATH, 'utf8');

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

for (const [wikiFile, globeCat] of Object.entries(CAT_MAP)) {
  const wikiPath = path.join(DATA_DIR, wikiFile);
  if (!fs.existsSync(wikiPath)) {
    console.log(`${wikiFile} not found, skipping ${globeCat}`);
    continue;
  }

  const entries = JSON.parse(fs.readFileSync(wikiPath, 'utf8'));
  if (!entries.length) {
    console.log(`${globeCat}: 0 entries in ${wikiFile}, skipped`);
    continue;
  }

  function fixDesc(e) {
    if (!e.desc || e.desc.length < 20 || e.desc === e.sub) {
      const parts = [];
      if (e.sub) {
        const subParts = e.sub.split('·').map(s => s.trim()).filter(Boolean);
        if (subParts.length) parts.push('located in ' + subParts.join(', '));
        if (subParts.length && e.sub.includes('m')) parts.push('with ' + e.sub);
      }
      e.desc = parts.length ? e.n + ' is ' + parts.join(', ') + '.' : e.n + ' is a notable ' + globeCat.replace(/_/g, ' ') + '.';
    }
    if (!e.fact || e.fact.length < 10) e.fact = e.desc;
  }

  const toInsert = [];
  for (const e of entries) {
    if (e._quality === 'poor') continue;
    if (!e.la || !e.ln || !e.n) continue;
    fixDesc(e);
    const entry = {
      n: e.n, la: e.la, ln: e.ln,
      sub: e.sub || '', desc: e.desc || '', fact: e.fact || '',
      tag: e.tag || ''
    };
    if (e.pts && Array.isArray(e.pts) && e.pts.length) entry.pts = e.pts;
    toInsert.push(entry);
  }

  if (!toInsert.length) {
    console.log(`${globeCat}: no valid entries to insert`);
    continue;
  }

  const startMarker = `D.${globeCat} = [`;
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    console.log(`${globeCat}: category not found in globe`);
    continue;
  }

  const afterOpen = html.indexOf('[', startIdx) + 1;
  const chunk = html.slice(afterOpen, afterOpen + 100000);
  let depth = 1, endIdx = 0;
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === '[') depth++;
    else if (chunk[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }

  const existingContent = chunk.slice(0, endIdx);
  const existingLines = existingContent.split('\n').map(l => l.trim()).filter(l => l.startsWith('{n:'));
  const existingMap = new Map(); // name -> { fullText, desc, fact }
  const nameRx = /\{n:'((?:[^'\\]|\\.)*)'/;
  let replaced = 0;
  for (const line of existingLines) {
    const m = nameRx.exec(line);
    if (!m) continue;
    const descM = line.match(/desc:'((?:[^'\\]|\\.)*)'/);
    const factM = line.match(/fact:'((?:[^'\\]|\\.)*)'/);
    existingMap.set(normalize(m[1]), {
      fullText: line,
      desc: descM ? descM[1] : '',
      fact: factM ? factM[1] : ''
    });
  }

  // Check if an entry has meaningful content (not placeholder like district name repeated)
  function hasGoodContent(e) {
    return e.desc && e.desc.length >= 40
      && e.desc !== e.sub
      && e.desc !== (e.sub ? e.sub.split('·')[0].trim() : '');
  }

  const insertIdx = afterOpen + endIdx;
  let insertStr = '';
  let added = 0;
  for (const e of toInsert) {
    const key = normalize(e.n);
    const existing = existingMap.get(key);
    if (existing) {
      // Replace if new entry has better content than the placeholder
      if (hasGoodContent(e) && !hasGoodContent({ desc: existing.desc, fact: existing.fact, sub: e.sub })) {
        const oldLine = existing.fullText;
        const newLine = `  {n:'${esc(e.n)}',la:${e.la},ln:${e.ln},sub:'${esc(e.sub)}',desc:'${esc(e.desc)}',fact:'${esc(e.fact)}',tag:''},`;
        const lineIdx = html.indexOf(oldLine, startIdx);
        if (lineIdx !== -1) {
          html = html.slice(0, lineIdx) + newLine + html.slice(lineIdx + oldLine.length);
          existingMap.set(key, { fullText: newLine, desc: e.desc, fact: e.fact });
          replaced++;
        }
      }
      continue;
    }
    const t = esc(e.tag);
    let ptsStr = '';
    if (e.pts && Array.isArray(e.pts) && e.pts.length) {
      ptsStr = ',pts:[' + e.pts.map(p => `{la:${p.la},ln:${p.ln}}`).join(',') + ']';
    }
    insertStr += `  {n:'${esc(e.n)}',la:${e.la},ln:${e.ln},sub:'${esc(e.sub)}',desc:'${esc(e.desc)}',fact:'${esc(e.fact)}'${ptsStr},tag:'${t}'},\n`;
    added++;
  }

  if (insertStr) {
    const before = html.slice(0, insertIdx).replace(/[\s,]+$/, '');
    if (before.endsWith('}')) insertStr = ',\n' + insertStr;
    html = html.slice(0, insertIdx) + '\n' + insertStr + html.slice(insertIdx);
  }

  const existingCount = existingMap.size;
  console.log(`${globeCat}: ${existingCount} existing, +${added} new, ${replaced} replaced (from ${wikiFile})`);
}

// Fix any remaining poor descs across all D.xxx arrays in the globe
function fixGlobalDescs(html) {
  const entryRx = /\{n:'((?:[^'\\]|\\.)*)',la:[\d.-]+,ln:[\d.-]+,sub:'((?:[^'\\]|\\.)*)',desc:'((?:[^'\\]|\\.)*)',fact:'((?:[^'\\]|\\.)*)'/g;
  let m;
  const fixes = [];
  while ((m = entryRx.exec(html)) !== null) {
    const name = m[1], sub = m[2], desc = m[3], fact = m[4];
    if (desc.length >= 20 && fact.length >= 10) continue;
    let newDesc = desc, newFact = fact;
    if (desc.length < 20) {
      const parts = [];
      if (sub) {
        const subParts = sub.split('·').map(s => s.trim()).filter(Boolean);
        if (subParts.length) parts.push('located in ' + subParts.join(', '));
      }
      newDesc = parts.length ? name + ' is ' + parts.join(', ') + '.' : name + ' is a notable landmark.';
    }
    if (fact.length < 10) newFact = newDesc;
    fixes.push({ idx: m.index, old: m[0], name, sub, desc, fact, newDesc, newFact });
  }
  for (let i = fixes.length - 1; i >= 0; i--) {
    const f = fixes[i];
    const oldStr = `desc:'${f.desc}',fact:'${f.fact}'`;
    const newStr = `desc:'${esc(f.newDesc)}',fact:'${esc(f.newFact)}'`;
    html = html.slice(0, f.idx) + f.old.replace(oldStr, newStr) + html.slice(f.idx + f.old.length);
  }
  return { html, fixed: fixes.length };
}

const { html: fixedHtml, fixed } = fixGlobalDescs(html);
console.log(`Fixed ${fixed} entries with poor desc/fact across all categories`);
fs.writeFileSync(GLOBE_PATH, fixedHtml, 'utf8');
console.log('\nPart 11 done');

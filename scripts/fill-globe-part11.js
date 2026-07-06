const fs = require('fs');
const path = require('path');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');

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

  const toInsert = [];
  for (const e of entries) {
    if (e._quality === 'low') continue;
    if (!e.la || !e.ln || !e.n) continue;
    toInsert.push({
      n: e.n, la: e.la, ln: e.ln,
      sub: e.sub || '', desc: e.desc || '', fact: e.fact || ''
    });
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
  const existingNames = new Set();
  const nameRx = /\{n:'([^']+)'/g;
  let match;
  while ((match = nameRx.exec(existingContent)) !== null) {
    existingNames.add(normalize(match[1]));
  }

  const insertIdx = afterOpen + endIdx;
  let insertStr = '';
  let added = 0;
  for (const e of toInsert) {
    if (existingNames.has(normalize(e.n))) continue;
    insertStr += `  {n:'${e.n.replace(/'/g, "\\'")}',la:${e.la},ln:${e.ln},sub:'${e.sub.replace(/'/g, "\\'")}',desc:'${e.desc.replace(/'/g, "\\'")}',fact:'${e.fact.replace(/'/g, "\\'")}'},\n`;
    added++;
  }

  if (insertStr) {
    const before = html.slice(0, insertIdx).replace(/[\s,]+$/, '');
    if (before.endsWith('}')) insertStr = ',\n' + insertStr;
    html = html.slice(0, insertIdx) + '\n' + insertStr + html.slice(insertIdx);
  }

  const existingCount = existingNames.size;
  console.log(`${globeCat}: ${existingCount} → ${existingCount + added} (added ${added} from ${wikiFile})`);
}

fs.writeFileSync(GLOBE_PATH, html, 'utf8');
console.log('\nPart 11 done');

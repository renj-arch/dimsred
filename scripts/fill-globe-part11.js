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
  'wiki-highway.json': 'highway',
  'wiki-hill.json': 'hill',
  'wiki-institution.json': 'institution',
  'wiki-i_pass.json': 'i_pass',
  'wiki-kingdom.json': 'kingdom',
  'wiki-mineral.json': 'mineral',
  'wiki-national_park.json': 'national_park',
  'wiki-nuclear.json': 'nuclear',
  'wiki-peak.json': 'peak',
  'wiki-port.json': 'port',
  'wiki-ramsar.json': 'ramsar',
  'wiki-rivers.json': 'river',
  'wiki-temple.json': 'temple',
  'wiki-tiger.json': 'tiger',
  'wiki-unesco.json': 'unesco',
  'wiki-wildlife.json': 'wildlife',
  'wiki-w_battle.json': 'w_battle',
  'wiki-w_city.json': 'w_city',
  'wiki-w_kingdom.json': 'w_kingdom',
  'wiki-w_river.json': 'w_river',
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

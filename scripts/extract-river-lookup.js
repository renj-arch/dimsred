const fs = require('fs');
const path = require('path');
const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'data', 'river-pts-lookup.json');

const html = fs.readFileSync(GLOBE_PATH, 'utf8');

function extractEntries(html, arrayName) {
  const rx = new RegExp('D\\.' + arrayName + '\\s*=\\s*\\[([\\s\\S]*?)\\];', 'i');
  const m = rx.exec(html);
  if (!m) return [];
  const block = m[1];
  const entries = [];
  const objRx = /\{n:'([^']+)'([\s\S]*?)\},?(?=\s*\{n:|\s*\];)/g;
  let match;
  while ((match = objRx.exec(block)) !== null) {
    const name = match[1];
    const rest = match[2];
    const ptsRx = /pts:\[([\s\S]*?)\]/;
    const ptsMatch = ptsRx.exec(rest);
    if (ptsMatch) {
      const ptsStr = ptsMatch[1];
      const pts = [];
      const ptRx = /\{la:([-\d.]+),ln:([-\d.]+)\}/g;
      let pm;
      while ((pm = ptRx.exec(ptsStr)) !== null) {
        pts.push({la: parseFloat(pm[1]), ln: parseFloat(pm[2])});
      }
      if (pts.length >= 2) {
        entries.push({n: name.replace(/\\'/g, "'"), pts});
      }
    }
  }
  return entries;
}

const riverEntries = extractEntries(html, 'river');
const wRiverEntries = extractEntries(html, 'w_river');

const lookup = {};
for (const e of riverEntries) {
  const key = e.n.toLowerCase().replace(/[^a-z0-9]/g, '');
  lookup[key] = {n: e.n, pts: e.pts};
}
for (const e of wRiverEntries) {
  const key = e.n.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!lookup[key]) lookup[key] = {n: e.n, pts: e.pts};
}

// Add aliases for SPARQL name mismatches
// SPARQL returns "Yellow River" but globe has "Yellow River (Huang He)"
const yellowKey = 'yellowriverhuanghe';
const yellowRiver = lookup[yellowKey];
if (yellowRiver) {
  lookup['yellowriver'] = {n: 'Yellow River', pts: yellowRiver.pts};
}
// SPARQL returns "Yangtze" but globe has "Yangtze (Chang Jiang)"
const yangtzeKey = 'yangtzechangjiang';
const yangtze = lookup[yangtzeKey];
if (yangtze) {
  lookup['yangtze'] = {n: 'Yangtze', pts: yangtze.pts};
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lookup, null, 2), 'utf8');
console.log(`Extracted ${riverEntries.length} Indian + ${wRiverEntries.length} world rivers`);
console.log(`Lookup has ${Object.keys(lookup).length} entries`);

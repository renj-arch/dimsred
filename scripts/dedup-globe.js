const fs = require('fs');
const path = require('path');

const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
let h = fs.readFileSync(GLOBE_PATH, 'utf8');

// Common words to strip when comparing names
const noise = new Set(['lake','wetland','sanctuary','national','park','wildlife','reserve','bird','np','birsanctuary','tiger']);

function normalizeName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '').replace(new RegExp([...noise].join('|'), 'g'), '').trim();
}

// Find all D.* arrays
const catMatches = [...h.matchAll(/D\.(\w+)\s*=\s*\[/g)];
let totalRemoved = 0;

for (const [fullMatch, cat] of catMatches) {
  const startIdx = fullMatch.index + fullMatch.length;
  const chunk = h.slice(startIdx, startIdx + 200000);
  let depth = 1, endIdx = 0;
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === '[') depth++;
    else if (chunk[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
  }

  const content = chunk.slice(0, endIdx);
  // extract entries: {n:'...',la:...,ln:...,...},
  const entryRx = /\{n:'((?:[^'\\]|\\.)*)',la:([^,]+),ln:([^,]+)[^}]*\}/g;
  const entries = [...content.matchAll(entryRx)].map(m => ({
    full: m[0],
    name: m[1].replace(/\\(.)/g, '$1'),
    la: parseFloat(m[2]),
    ln: parseFloat(m[3])
  }));

  if (entries.length < 2) continue;

  const toRemove = new Set();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      const dLat = Math.abs(a.la - b.la);
      const dLng = Math.abs(a.ln - b.ln);
      if (dLat < 0.05 && dLng < 0.05) {
        const aKey = normalizeName(a.name);
        const bKey = normalizeName(b.name);
        if (aKey && bKey && (aKey === bKey || aKey.includes(bKey) || bKey.includes(aKey))) {
          // Remove the shorter name
          const short = a.name.length <= b.name.length ? a : b;
          toRemove.add(short.full);
        }
      }
    }
  }

  if (toRemove.size) {
    for (const entry of toRemove) {
      // Escape regex special chars
      const esc = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('  ' + esc + '[,\\s]*\\r?\\n', 'g');
      h = h.replace(re, '');
      totalRemoved++;
      console.log(cat + ': removed ' + entry.match(/n:'((?:[^'\\]|\\.)*)'/)[1]);
    }
  }
}

fs.writeFileSync(GLOBE_PATH, h, 'utf8');
console.log('\nTotal: ' + totalRemoved + ' duplicates removed from ' + GLOBE_PATH);

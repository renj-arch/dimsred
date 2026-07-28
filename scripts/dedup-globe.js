const fs = require('fs');
const path = require('path');

const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
let h = fs.readFileSync(GLOBE_PATH, 'utf8');

const noise = new Set(['lake','wetland','sanctuary','national','park','wildlife','reserve','bird','np','birsanctuary','tiger']);

function normalizeName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '').replace(new RegExp([...noise].join('|'), 'g'), '').trim();
}

function findArrayEnd(content, startIdx) {
  let depth = 1, i = startIdx, inStr = false;
  while (i < content.length) {
    const c = content[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === "'") inStr = false;
    } else if (c === "'") {
      inStr = true;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

const catMatches = [...h.matchAll(/D\.(\w+)\s*=\s*\[/g)];
let totalRemoved = 0;

// Process arrays from last to first to preserve positions
for (let m = catMatches.length - 1; m >= 0; m--) {
  const match = catMatches[m];
  const cat = match[1];
  const arrayStart = match.index;
  const contentStart = arrayStart + match[0].length;
  const contentEnd = findArrayEnd(h, contentStart);
  const content = h.slice(contentStart, contentEnd);

  const entries = [];
  let i = 0;
  while (i < content.length) {
    const start = content.indexOf("{n:'", i);
    if (start === -1) break;
    let depth = 0, j = start, inStr = false, name = '', nameStart = -1;
    while (j < content.length) {
      const c = content[j];
      if (inStr) {
        if (c === '\\') { j += 2; continue; }
        if (c === "'") {
          inStr = false;
          if (nameStart >= 0) {
            name = content.slice(nameStart, j).replace(/\\(.)/g, '$1');
            nameStart = -1;
          }
        }
      } else if (c === "'") {
        inStr = true;
        if (j >= 2 && content.slice(j-2, j) === "n:") nameStart = j + 1;
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) {
          const full = content.slice(start, j + 1);
          const laMatch = full.match(/,la:([\d.-]+)/);
          const lnMatch = full.match(/,ln:([\d.-]+)/);
          const la = laMatch ? parseFloat(laMatch[1]) : NaN;
          const ln = lnMatch ? parseFloat(lnMatch[1]) : NaN;
          if (name && !isNaN(la) && !isNaN(ln)) {
            entries.push({ full, name, la, ln, offset: start });
          }
          break;
        }
      }
      j++;
    }
    i = start + 1;
  }

  if (entries.length < 2) continue;

  const removeOffsets = new Set();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (Math.abs(a.la - b.la) < 0.01 && Math.abs(a.ln - b.ln) < 0.01) {
        const aKey = normalizeName(a.name);
        const bKey = normalizeName(b.name);
        if (aKey && bKey && aKey === bKey) {
          const short = a.name.length <= b.name.length ? a : b;
          removeOffsets.add(contentStart + short.offset);
        }
      }
    }
  }

  if (removeOffsets.size) {
    // Convert offsets to actual removal ranges in h
    const removals = [];
    for (const offset of removeOffsets) {
      const entry = entries.find(e => contentStart + e.offset === offset);
      if (!entry) continue;
      let end = offset + entry.full.length;
      if (h[end] === ',') end++;
      while (end < h.length && (h[end] === ' ' || h[end] === '\t')) end++;
      if (h[end] === '\r') end++;
      if (h[end] === '\n') end++;
      removals.push({ start: offset, end, name: entry.name });
    }
    // Sort in reverse order for safe removal
    removals.sort((a, b) => b.start - a.start);
    for (const r of removals) {
      h = h.slice(0, r.start) + h.slice(r.end);
      totalRemoved++;
      console.log(cat + ': removed ' + r.name);
    }
  }
}

fs.writeFileSync(GLOBE_PATH, h, 'utf8');
console.log('\nTotal: ' + totalRemoved + ' duplicates removed');

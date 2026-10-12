const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '3d-globe.html');
let html = fs.readFileSync(filePath, 'utf8');

const CATEGORIES = {
  river: { missingAll: true },
  peak: {},
  temple: {},
  railway: {},
  w_river: { missingAll: true },
  w_peak: {},
  phenomena: {},
  current: { missingAll: true },
  wind: {},
  plateau: {},
  oil: {},
  bird: {},
  lighthouse: {},
  trade: { firstN: 25 }
};

function esc(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function findArrayBounds(str, startIdx) {
  let i = str.indexOf('[', startIdx);
  if (i === -1) return null;
  let depth = 1, inStr = false, strChar = '';
  for (let j = i + 1; j < str.length; j++) {
    const c = str[j];
    if (!inStr) {
      if (c === "'" || c === '"') { inStr = true; strChar = c; continue; }
      if (c === '/' && str[j + 1] === '/') { while (j < str.length && str[j] !== '\n') j++; continue; }
      if (c === '/' && str[j + 1] === '*') { j += 2; while (j < str.length && !(str[j] === '*' && str[j + 1] === '/')) j++; continue; }
      if (c === '{' || c === '[') { depth++; }
      else if (c === '}' || c === ']') { if (depth === 1 && c === ']') return { start: i, end: j + 1 }; depth--; }
    } else {
      if (c === '\\') j++;
      else if (c === strChar) inStr = false;
    }
  }
  return null;
}

function hasFact(text) {
  return /(?:\b|,)fact\s*:\s*'/.test(text);
}

function findEntries(html, catName, pattern) {
  const match = html.match(pattern);
  if (!match) return null;
  const startIdx = match.index;
  const arrStart = html.indexOf('[', startIdx);
  if (arrStart === -1) return null;

  const bounds = findArrayBounds(html, arrStart);
  if (!bounds) return null;

  const section = html.substring(bounds.start + 1, bounds.end - 1);
  const entries = [];
  let i = 0;

  while (i < section.length) {
    const braceStart = section.indexOf('{', i);
    if (braceStart === -1) break;

    let depth = 0, inStr = false, strChar = '';
    let j = braceStart;
    while (j < section.length) {
      const c = section[j];
      if (!inStr) {
        if (c === "'" || c === '"') { inStr = true; strChar = c; }
        else if (c === '/' && section[j + 1] === '/') { while (j < section.length && section[j] !== '\n') j++; }
        else if (c === '/' && section[j + 1] === '*') { j += 2; while (j < section.length && !(section[j] === '*' && section[j + 1] === '/')) j++; }
        else if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) {
          const text = section.substring(braceStart, j + 1);
          entries.push({ text, globalOffset: bounds.start + 1 + braceStart });
          i = j + 1;
          break;
        }}
      } else {
        if (c === '\\') j++;
        else if (c === strChar) inStr = false;
      }
      j++;
    }
    if (j >= section.length) break;
    i = j;
  }

  return entries;
}

function extract(name, sub, desc, cat) {
  const s = (sub || '').replace(/\\'/g, "'");
  const d = (desc || '').replace(/\\'/g, "'");
  const facts = [];

  if (cat === 'current') {
    const parts = s.split('·').map(x => x.trim()).filter(Boolean);
    parts.forEach(p => { if (p && !/^[{,]/.test(p)) facts.push(p); });
    let temp = d.match(/\b(warm|cold)\b/i);
    if (temp && !facts.some(f => new RegExp(temp[1], 'i').test(f))) facts.push(temp[1].charAt(0).toUpperCase() + temp[1].slice(1));
    let range = d.match(/(from\s+[A-Z][a-zA-Z\s]+?)\s+to\s+([A-Z][a-zA-Z\s]+?)[,.]/);
    if (range) { facts.push(range[1].trim().replace(/^from\s+/i, '')); facts.push('to ' + range[2].trim()); }
    let notable = d.match(/(world'?s?\s+(?:largest|longest|deepest|fastest|strongest|biggest))/gi);
    if (notable) notable.forEach(n => { let t = n.trim(); if (!facts.some(f => f.toLowerCase().includes(t.toLowerCase()))) facts.push(t); });
    let nums = d.match(/(\d+\.?\d*\s*(?:Sv|km\/h|m\/s|%))/gi);
    if (nums) nums.forEach(n => { let t = n.trim(); if (!facts.some(f => f.includes(t))) facts.push(t); });
  } else if (cat === 'wind') {
    const parts = s.split('·').map(x => x.trim()).filter(Boolean);
    parts.forEach(p => { if (p && !/^[{,]/.test(p)) facts.push(p); });
    let speed = d.match(/(\d+[\d,]*\s*(?:km\/h|mph|knots))/gi);
    if (speed) speed.forEach(s => { let t = s.trim(); if (!facts.some(f => f.includes(t))) facts.push(t); });
    let dirs = d.match(/\b(northeasterly|northwesterly|southeasterly|southwesterly|easterly|westerly|northerly|southerly|katabatic|foehn|downslope|offshore|onshore|trade|monsoon)\b/gi);
    if (dirs) dirs.forEach(d => { let t = d.charAt(0).toUpperCase() + d.slice(1); if (!facts.some(f => f.toLowerCase().includes(t.toLowerCase()))) facts.push(t); });
    let notable = d.match(/(strongest|world'?s?\s+(?:strongest|fastest|largest)|most\s+frequent|dangerous)/gi);
    if (notable) notable.forEach(n => { if (!facts.some(f => f.toLowerCase().includes(n.toLowerCase()))) facts.push(n); });
    let region = d.match(/(?:across|over|in|off|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*?)(?:[,.]|$)/);
    if (region && region[1].length < 30) { let r = region[1].trim(); if (!facts.some(f => f.includes(r))) facts.push(r); }
  } else if (cat === 'trade') {
    const parts = s.split('·').map(x => x.trim()).filter(Boolean);
    parts.forEach(p => { if (p && !/^[{,]/.test(p)) facts.push(p); });
    let year = d.match(/(\d{1,4}\s*(?:BCE|CE|BC|AD))/gi);
    if (year) year.forEach(y => { let t = y.trim(); if (!facts.some(f => f.includes(t))) facts.push(t); });
    let goods = d.match(/\b(silk|spices?|gold|salt|amber|tea|porcelain|paper|gunpowder|horses|ivory|frankincense|myrrh|coffee|cotton|spice|textiles|diamonds|pepper|cinnamon|cardamom)\b/gi);
    if (goods) { let uniq = [...new Set(goods.map(g => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()))]; facts.push(uniq.slice(0, 3).join('/')); }
    let cities = d.match(/\b(Samarkand|Bukhara|Kashgar|Timbuktu|Muziris|Petra|Antioch|Constantinople|Alexandria|Malacca|Hormuz|Cairo|Venice|Genoa|Calicut|Aden|Baghdad|Damascus|Lijiang|Lhasa|Chang'?an|Kabul|Herat|Merv|Balkh|Dunhuang|Gao|Sijilmasa|Marrakesh|Koumbi\s+Saleh|Jaunpur|Agra|Delhi|Lahore|Kolkata|Surat|Goa|Kochi|Madurai|Hampi|Vijayanagara|Pataliputra|Taxila|Peshawar)\b/g);
    if (cities) { [...new Set(cities)].forEach(c => { if (!facts.some(f => f.includes(c))) facts.push(c); }); }
    let distance = d.match(/(\d[\d,]*\s*km)/gi);
    if (distance) distance.forEach(d => { let t = d.trim(); if (!facts.some(f => f.includes(t))) facts.push(t); });
  } else {
    const parts = s.split('·').map(x => x.trim()).filter(Boolean);
    parts.forEach(p => { if (p && !/^[{,]/.test(p)) facts.push(p); });
    let nums = d.match(/(\d[\d,]*\.?\d*\s*(?:km|m|ft|miles|km²|ha|GW|MW|kg|ton|years?|°C|%|million|billion|trillion|sq\s*km))/gi);
    if (nums) nums.forEach(n => { let t = n.trim(); if (!facts.some(f => f.includes(t))) facts.push(t); });
    let notable = d.match(/(world'?s?\s+(?:largest|longest|deepest|highest|fastest|oldest|busiest|richest|smallest|first|tallest|only|most\s+sacred|most\s+important|most\s+powerful))/gi);
    if (notable) notable.forEach(n => { let t = n.trim(); if (!facts.some(f => f.toLowerCase().includes(t.toLowerCase().substring(0, 12)))) facts.push(t); });
    let places = d.match(/\b(Gangotri|Bay\s+of\s+Bengal|Arabian\s+Sea|Himalayas|Andes|Alps|Sahara|Amazon|Congo|Nile|Ganges|Pacific|Atlantic|Indian|Arctic|Antarctic|Mediterranean|Caspian|Persian|Red\s+Sea|Dead\s+Sea|Gulf\s+of|Western\s+Ghats|Eastern\s+Ghats|Deccan|Tibet|China|Russia|Brazil|India|Africa|Europe|Asia|North\s+America|South\s+America|Australia)\b/g);
    if (places) { [...new Set(places)].forEach(p => { if (!facts.some(f => f.includes(p))) facts.push(p); }); }
  }

  const unique = [];
  const seen = new Set();
  for (const f of facts) {
    const key = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key) && f.trim() && f.trim() !== name) {
      seen.add(key);
      unique.push(f.trim());
    }
  }

  let result = unique.slice(0, 7).join(' · ');
  if (!result) result = s.split('·').map(x => x.trim()).filter(Boolean).slice(0, 3).join(' · ');
  if (!result) result = d.split(/[.·!?]/).filter(x => x.trim().length > 15).slice(0, 2).map(x => x.trim()).join(' · ');
  if (!result) result = 'Key geographical feature';
  return esc(result);
}

const CAT_PATTERNS = {
  river: /D\.river\s*=\s*\[/,
  peak: /D\.peak\s*=\s*\[/,
  temple: /D\.temple\s*=\s*\[/,
  railway: /D\.railway\s*=\s*\[/,
  w_river: /D\.w_river\s*=\s*\[/,
  w_peak: /D\.w_peak\s*=\s*\[/,
  phenomena: /D\.phenomena\s*=\s*\[/,
  current: /D\.current\s*=\s*\[/,
  wind: /D\.wind\s*=\s*\[/,
  plateau: /D\.plateau\s*=\s*\[/,
  oil: /D\.oil\s*=\s*\[/,
  bird: /D\.bird\s*=\s*\[/,
  lighthouse: /D\.lighthouse\s*=\s*\[/,
  trade: /D\.trade\s*=\s*\[/,
};

let totalFixed = 0;

for (const [catName, pattern] of Object.entries(CAT_PATTERNS)) {
  const entries = findEntries(html, catName, pattern);
  if (!entries) {
    console.log(`${catName}: section not found`);
    continue;
  }

  let fixed = 0;
  const modifications = [];

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    if (hasFact(entry.text)) continue;

    const catConfig = CATEGORIES[catName];
    if (catConfig && catConfig.firstN && idx >= catConfig.firstN) continue;

    const nMatch = entry.text.match(/\bn\s*:\s*'([^']*)'/);
    const subMatch = entry.text.match(/\bsub\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const descMatch = entry.text.match(/\bdesc\s*:\s*'((?:[^'\\]|\\.)*)'/);

    const name = nMatch ? nMatch[1] : '';
    const sub = subMatch ? subMatch[1] : '';
    const desc = descMatch ? descMatch[1] : '';

    const fact = extract(name, sub, desc, catName);
    if (!fact) continue;

    const lastBrace = entry.text.lastIndexOf('}');
    const before = entry.text.substring(0, lastBrace).trimEnd();
    const after = entry.text.substring(lastBrace);
    let modified;
    if (before.endsWith(',')) {
      modified = before + `fact:'${fact}'` + after;
    } else {
      modified = before + `,fact:'${fact}'` + after;
    }

    modifications.push({ offset: entry.globalOffset, old: entry.text, new: modified });
    fixed++;
  }

  for (const mod of modifications.reverse()) {
    html = html.substring(0, mod.offset) + mod.new + html.substring(mod.offset + mod.old.length);
  }

  console.log(`${catName}: ${entries.length} entries, ${fixed} fixed`);
  totalFixed += fixed;
}

fs.writeFileSync(filePath, html, 'utf8');
console.log(`\nTotal fixed: ${totalFixed}`);

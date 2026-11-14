/**
 * Comprehensive auto-updater for all time-sensitive GK data
 * Sources: Wikipedia, government sites
 * Run: node scripts/update-all-gk.js
 * Scheduled: GitHub Actions weekly
 *
 * Updates:
 *  - Indian CMs (includes 28-state CM quiz matrix)
 *  - Indian Governors (prose leaders bank)
 *  - Constitutional posts (President, VP, PM, CJI, LS Speaker, CEC, CAG, AG)
 *  - RBI Governor
 *  - World leaders (US, UK, Russia, China, etc.)
 *  - Pageant winners (Miss World, Miss Universe, Miss India)
 *  - Film festival winners (Cannes, Berlin, Venice, Oscars)
 *  - Major sports tournament champions (Cricket WC, T20 WC, FIFA WC)
 *
 * All dynamic values are stored in machine-readable groups inside
 * current-affairs.html (_studyExtra.current and _studyExtra.world) and are
 * regenerated here every run; only values that change are rewritten.
 */
const fs = require('fs');
const https = require('https');

const HTML_PATH = 'current-affairs.html';

const NAMED_ENT = {
  'nbsp': ' ', 'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
  'ndash': '–', 'mdash': '—', 'minus': '-',
  'Iuml': 'İ', 'iuml': 'ï', 'ntilde': 'ñ', 'Ntilde': 'Ñ',
  'aacute': 'á', 'Aacute': 'Á', 'eacute': 'é', 'Eacute': 'É',
  'iacute': 'í', 'Iacute': 'Í', 'oacute': 'ó', 'Oacute': 'Ó',
  'uacute': 'ú', 'Uacute': 'Ú', 'auml': 'ä', 'Auml': 'Ä',
  'ouml': 'ö', 'Ouml': 'Ö', 'uuml': 'ü', 'Uuml': 'Ü', 'szlig': 'ß',
  'ccedil': 'ç', 'Ccedil': 'Ç', 'agrave': 'à', 'egrave': 'è',
  'egravex': 'è', 'oumlx': 'ö', 'uumext': 'ü',
  'aigrave': 'à', '0': ' '
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GK-Updater/1.0)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.setTimeout(25000);
  });
}

function stripHtml(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, function (m, c) { return String.fromCharCode(c); })
    .replace(/&([a-zA-Z]+);/g, function (m, n) { return NAMED_ENT[n] || m; })
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Strip tags/entities but keep bracketed refs & parens for infobox value parsing.
function stripText(html) {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, function (m, c) { return String.fromCharCode(c); })
    .replace(/&([a-zA-Z]+);/g, function (m, n) { return NAMED_ENT[n] || m; })
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

async function apiParse(page) {
  const url = 'https://en.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent(page) + '&redirects=1&prop=text&format=json';
  const parsed = await fetchWithRetry(url);
  if (!parsed || !parsed.parse || !parsed.parse.text) throw new Error('parse failed: ' + page);
  return parsed.parse.text['*'];
}

let _lastFetchAt = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Throttle + retry helper: Wikimedia rate-limits anonymous API clients, and a
// rate-limited response is a 200 HTML page (not JSON), so we retry after backoff.
async function fetchWithRetry(url) {
  const now = Date.now();
  const wait = _lastFetchAt ? Math.max(0, 1200 - (now - _lastFetchAt)) : 0;
  _lastFetchAt = now + wait;
  if (wait) await sleep(wait);
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const data = await fetch(url);
      try { return JSON.parse(data); }
      catch (e) {
        lastErr = new Error('non-JSON API response: ' + data.slice(0, 60));
        await sleep(2000 * Math.pow(2, attempt));
      }
    } catch (e) {
      lastErr = e;
      await sleep(2000 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

function infoboxLines(html) {
  const m = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!m) return [];
  const out = [];
  for (const r of m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const t = stripText(r[1]);
    if (t) out.push(t);
  }
  return out;
}

// === INDIAN CMs (unchanged — patches the CM quiz matrix) ===
async function fetchCMs() {
  let parsed = await fetchWithRetry('https://en.wikipedia.org/w/api.php?action=parse&page=Chief_minister_(India)&prop=text&format=json');
  let html = parsed.parse.text['*'];
  let allTables = html.match(/<table[^>]*class="[^"]*(?:wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  let map = {};
  if (allTables) {
    for (let tbl of allTables) {
      let rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      if (!rows.length) continue;
      let header = [];
      for (let c of rows[0][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) header.push(stripHtml(c[1]));
      let h = header.join(' ').toLowerCase();
      if (!h.includes('officeholder') || !h.includes('political party')) continue;
      for (let r of rows.slice(1)) {
        let cells = [];
        for (let c of r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) cells.push(stripHtml(c[1]));
        let state = cells[0] ? cells[0].trim() : '';
        let name = cells[3] ? cells[3].trim() : '';
        let party = (cells[5] || '').trim();
        if (state && name && party && state.length > 2 && name.length < 60) {
          state = STATE_FIX[state] || state;
          map[state] = { name, party };
        }
      }
    }
  }
  for (let [s, p] of Object.entries(PARTY_OVERRIDE)) {
    if (map[s]) map[s].party = p;
  }
  return map;
}

// === INDIAN GOVERNORS ===
async function fetchGovernors() {
  const html = await apiParse('Governor_(India)');
  const map = {};
  const tables = html.match(/<table[^>]*class="[^"]*(?:wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || [];
  for (const tbl of tables) {
    const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (!rows.length) continue;
    const header = [];
    for (const c of rows[0][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) header.push(stripHtml(c[1]));
    if (!header.join(' ').toLowerCase().includes('officeholder')) continue;
    for (const r of rows.slice(1)) {
      const cells = [];
      for (const c of r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) cells.push(stripHtml(c[1]));
      let state = cells[0] ? cells[0].trim() : '';
      let name = cells[3] ? cells[3].trim() : '';
      state = STATE_FIX[state] || state;
      name = name.replace(/\s*[†‡*▪]+\s*$/, '').trim();
      if (state && name && state.length > 2 && name.length < 60 && GOV_STATES.includes(state)) {
        map[state] = name;
      }
    }
  }
  return map;
}

// Patch the "Important Governors (2025-26)" group inside _studyExtra.personalities.
// Existing rows keep their manual descriptions; only the NAME field is replaced.
// States present on Wikipedia but missing from the bank are appended.
function updateGovernorBank(html, govMap) {
  const lines = html.split(/\r?\n/);
  const marker = "h:'Important Governors (2025-26)'";
  let si = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(marker)) { si = i; break; }
  if (si === -1) return { html, count: 0 };
  let bi = -1;
  for (let i = si; i < Math.min(si + 6, lines.length); i++) if (lines[i].includes('b:[')) { bi = i; break; }
  let ei = -1;
  for (let i = bi + 1; i < lines.length; i++) if (/^\s*\]},\s*$/.test(lines[i])) { ei = i; break; }
  if (bi === -1 || ei === -1) return { html, count: 0 };
  const rowRe = /^\s*\['((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\],?\s*$/;
  const content = [];
  const seen = new Set();
  let count = 0;
  for (let i = bi + 1; i < ei; i++) {
    const line = lines[i];
    const m = line.match(rowRe);
    if (!m) { content.push(line); continue; }
    const name = m[1];
    const desc = m[2];
    const state = desc.split(' — ')[0].trim();
    if (GOV_STATES.includes(state)) {
      seen.add(state);
      if (govMap[state] && govMap[state] !== name) {
        const newName = govMap[state].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const q = line.indexOf("'");
        content.push(line.slice(0, q + 1) + newName + line.slice(q + 1 + name.length));
        count++;
        console.log('  Governor ' + state + ': ' + name + ' -> ' + govMap[state]);
        continue;
      }
    }
    content.push(line);
  }
  const missing = GOV_STATES.filter(s => !seen.has(s) && govMap[s]);
  if (missing.length) {
    const last = content.length - 1;
    if (content.length && !/,\s*$/.test(content[last])) {
      content[last] = content[last].replace(/'\]\s*$/, "'],");
    }
    for (let i = 0; i < missing.length; i++) {
      const s = missing[i];
      const nm = govMap[s].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      content.push("                ['" + nm + "','" + s + " — Governor (auto-updated)']" + (i < missing.length - 1 ? ',' : ''));
      count++;
      console.log('  Governor ' + s + ' (added): ' + nm);
    }
  }
  lines.splice(bi + 1, ei - bi - 1, ...content);
  return { html: lines.join('\n'), count };
}

// === INDIAN GLOBAL OFFICEHOLDERS ===
// Infobox convention: "Incumbent NAME since DATE"
function cleanRefs(s) { return s.replace(/\s*\[\s*\d+\s*\]\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
function collapseParens(s) { return s.replace(/\(\s+/g, '(').replace(/\s+\)\s*/g, ')').trim(); }

async function fetchIncumbent(page) {
  const html = await apiParse(page);
  for (const line of infoboxLines(html)) {
    const m = line.match(/^Incumbent\s+(.*?)(?:\s+since\s+(.+?))?$/i);
    if (!m || !m[1]) continue;
    let name = cleanRefs(m[1]).replace(/,\s*[A-Z]{2,4}\s*$/i, '').trim();
    name = name.replace(/\s*[†‡*▪]+\s*$/, '').trim();
    if (!name) continue;
    const since = cleanRefs(m[2] || '');
    const y = since.match(/\b(?:19\d\d|20\d\d)\b/);
    return { name, year: y ? y[0] : '' };
  }
  throw new Error('Incumbent not found');
}

// General infobox label -> value (e.g. "Currently held by – Fjord (2026)")
async function fetchInfoValue(page, labels) {
  const html = await apiParse(page);
  for (const line of infoboxLines(html)) {
    for (const lab of labels) {
      const m = line.match(new RegExp('^' + lab + '\\s+(.+)$', 'i'));
      if (m && m[1].trim()) {
        return collapseParens(cleanRefs(m[1]));
      }
    }
  }
  return null;
}

// RBI infobox: "Governor Sanjay Malhotra, IAS [2]"
async function fetchRBIGovernor() {
  const html = await apiParse('Reserve_Bank_of_India');
  for (const line of infoboxLines(html)) {
    let m = line.match(/^Governor\s+(.+?)\s*,\s*[A-Z]{2,4}\s*$/i);
    if (m) {
      const name = cleanRefs(m[1]).trim();
      if (name) return { name };
    }
    m = line.match(/^Governor\s+(.+)$/i);
    if (m) {
      const name = cleanRefs(m[1]).replace(/,?\s*[A-Z]{2,4}\s*$/i, '').trim();
      if (name && name.length < 60) return { name };
    }
  }
  throw new Error('RBI Governor not found');
}

// Pageants: "Current titleholder Suchata Chuangsri Thailand"
async function fetchCurrentTitleholder(page) {
  const html = await apiParse(page);
  for (const line of infoboxLines(html)) {
    const m = line.match(/^Current titleholder\s+(.+)$/i);
    if (!m) continue;
    let v = collapseParens(cleanRefs(m[1]));
    if (!v) continue;
    if (v.includes('\"')) v = v.replace(/^\"/, '');
    const mm = v.match(/^(.+?)\s+([A-Z][a-zA-Z]+)$/);
    return mm ? mm[1].trim() + ' (' + mm[2].trim() + ')' : v;
  }
  return null;
}

// Find the latest Year + winner-style row across a page's tables.
function findYearWinner(html, winnerHeaderRx) {
  for (const tbl of html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []) {
    const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rows.length < 4) continue;
    for (let hi = 0; hi < Math.min(3, rows.length); hi++) {
      const header = [];
      for (const c of rows[hi][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) header.push(stripHtml(c[1]));
      const hy = header.findIndex(h => /^year/.test(h.trim()));
      let hw = -1;
      for (let i = 0; i < header.length; i++) {
        if (winnerHeaderRx.test(header[i].trim())) { hw = i; break; }
      }
      if (hy < 0 || hw < 0) continue;
      let best = null;
      for (const r of rows.slice(hi + 1)) {
        const cells = [];
        for (const c of r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) cells.push(stripHtml(c[1]));
        if (!cells[hy]) continue;
        const y = (cells[hy].match(/[12]\d{3}/) || [])[0];
        if (!y) continue;
        let w = (cells[hw] || '').trim();
        if (!w || /^(—|–|-|n\/a)$/.test(w) || /no (winner|champion|pageant)|cancell?ed/i.test(w)) continue;
        if (!best || +y > best.year) best = { year: +y, winner: w };
      }
      if (best) return best;
    }
  }
  return null;
}

// Sports champion from an "X title" infobox line, e.g. "Champions India (3rd title)".
async function championWithYear(page, label) {
  const html = await apiParse(page);
  const yrMatch = page.match(/(20\d\d) /);
  const yr = yrMatch ? yrMatch[1] : '';
  for (const line of infoboxLines(html)) {
    const m = line.match(new RegExp('^' + label + '\\s+(.+)$', 'i'));
    if (m) {
      let v = collapseParens(m[1].replace(/\s*\(\d(?:st|nd|rd|th)\s+title\)\s*$/i, '').trim());
      if (!v) continue;
      return v + (yr ? ' (' + yr + ')' : '');
    }
  }
  return null;
}

// === WORLD LEADERS ===
const WORLD_LEADERS = {
  'United States': { label: 'President of the United States', role: 'President', field: 'hos' },
  'United Kingdom': { label: 'Prime Minister of the United Kingdom', role: 'Prime Minister', field: 'hog' },
  'Russia': { label: 'President of Russia', role: 'President', field: 'hos' },
  'China': { label: 'General Secretary of the Chinese Communist Party', role: 'General Secretary of the Communist Party', field: 'hos' },
  'Germany': { label: 'Chancellor of Germany', role: 'Chancellor', field: 'hog' },
  'France': { label: 'President of France', role: 'President', field: 'hos' },
  'Japan': { label: 'Prime Minister of Japan', role: 'Prime Minister', field: 'hog' },
  'Canada': { label: 'Prime Minister of Canada', role: 'Prime Minister', field: 'hog' },
  'Australia': { label: 'Prime Minister of Australia', role: 'Prime Minister', field: 'hog' },
  'New Zealand': { label: 'Prime Minister of New Zealand', role: 'Prime Minister', field: 'hog' },
  'Brazil': { label: 'President of Brazil', role: 'President', field: 'hos' },
  'South Africa': { label: 'President of South Africa', role: 'President', field: 'hos' }
};

function extractLeaderName(cell, role) {
  if (!cell) return null;
  const segRe = /([A-Z][A-Za-z()\-'’./]*?)\s*[–—-]\s*([^\[\]–—-]+?)(?=\s+(?:[A-Z][A-Za-z()\-'’./]*?)\s*[–—-]\s*|$)/g;
  let m;
  while ((m = segRe.exec(cell))) {
    if (m[1].trim().toLowerCase().indexOf(role.toLowerCase()) > -1) {
      const name = m[2].replace(/\[\d+\]/g, '').replace(/[,;:].*$/, '').trim();
      if (name && name.charAt(0) === name.charAt(0).toUpperCase()) return name;
    }
  }
  const m2 = cell.match(new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[–—-]\\s*([^\\[\\]\\n]+)'));
  if (m2) return m2[1].replace(/\[\d+\]/g, '').replace(/[,;:].*$/, '').trim();
  return null;
}

async function fetchWorldLeaders() {
  const html = await apiParse('List_of_current_heads_of_state_and_government');
  const map = {};
  for (const tbl of html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []) {
    const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (!rows.length) continue;
    const header = [];
    for (const c of rows[0][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) header.push(stripHtml(c[1]));
    const h = header.join(' ').toLowerCase();
    if (!h.includes('head of state') || !h.includes('head of government')) continue;
    for (const r of rows.slice(1)) {
      const cells = [];
      for (const c of r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) cells.push(stripText(c[1]));
      if (cells.length < 1) continue;
      map[cells[0].trim()] = { hos: cells[1] || '', hog: cells[2] || '' };
    }
  }
  // China's HoG is not in the leaders table; take it from its own page.
  try {
    const premier = await fetchIncumbent('Premier_of_China');
    if (premier && premier.name) map['China'].premier = premier.name;
  } catch (e) {}
  return map;
}

// Rewrite rows of a machine-readable group inside _studyExtra (keeps unknown rows).
function rewriteGroup(html, hText, rows) {
  const lines = html.split(/\r?\n/);
  let si = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].includes("h:'" + hText + "'")) { si = i; break; }
  if (si === -1) return { html, count: 0 };
  let bi = -1;
  for (let i = si; i < Math.min(si + 6, lines.length); i++) if (lines[i].includes('b:[')) { bi = i; break; }
  let ei = -1;
  for (let i = bi + 1; i < lines.length; i++) if (/^\s*\]},?\s*$/.test(lines[i])) { ei = i; break; }
  if (bi === -1 || ei === -1) return { html, count: 0 };
  const rowRe = /^\s*\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\],?\s*$/;
  const want = {};
  for (const r of rows) want[r.label] = r.value;
  let count = 0;
  const content = [];
  for (let i = bi + 1; i < ei; i++) {
    const line = lines[i];
    const m = line.match(rowRe);
    if (!m) { content.push(line); continue; }
    const label = m[1];
    const oldVal = m[2];
    if (want[label] !== undefined && want[label] !== oldVal) {
      const newVal = want[label].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const comma = /,\s*$/.test(line) ? ',' : '';
      content.push(line.slice(0, line.indexOf('[')) + "['" + label + "','" + newVal + "']" + comma);
      count++;
      console.log('  ' + label + ': ' + oldVal + ' -> ' + want[label]);
    } else {
      content.push(line);
    }
  }
  lines.splice(bi + 1, ei - bi - 1, ...content);
  return { html: lines.join('\n'), count };
}

// Map Wikipedia state names to our file's state names (matrix rows)
const STATE_FIX = { 'Keralam': 'Kerala' };

const PARTY_OVERRIDE = {
  'Andhra Pradesh': 'TDP', 'Arunachal Pradesh': 'BJP', 'Assam': 'BJP',
  'Bihar': 'BJP', 'Chhattisgarh': 'BJP', 'Goa': 'BJP', 'Gujarat': 'BJP',
  'Haryana': 'BJP', 'Himachal Pradesh': 'INC', 'Jharkhand': 'JMM',
  'Karnataka': 'INC', 'Kerala': 'INC', 'Madhya Pradesh': 'BJP',
  'Maharashtra': 'BJP', 'Manipur': 'BJP', 'Meghalaya': 'NPP',
  'Mizoram': 'ZPM', 'Nagaland': 'NPF', 'Odisha': 'BJP', 'Punjab': 'AAP',
  'Rajasthan': 'BJP', 'Sikkim': 'SKM', 'Tamil Nadu': 'TVK',
  'Telangana': 'INC', 'Tripura': 'BJP', 'Uttar Pradesh': 'BJP',
  'Uttarakhand': 'BJP', 'West Bengal': 'BJP'
};
const MATRIX_STATE_MAP = {
  'Andhra Pradesh': 'Andhra Pradesh',
  'Arunachal Pradesh': 'Arunachal',
  'Assam': 'Assam',
  'Bihar': 'Bihar',
  'Chhattisgarh': 'Chhattisgarh',
  'Goa': 'Goa',
  'Gujarat': 'Gujarat',
  'Haryana': 'Haryana',
  'Himachal Pradesh': 'Himachal',
  'Jharkhand': 'Jharkhand',
  'Karnataka': 'Karnataka',
  'Kerala': 'Kerala',
  'Madhya Pradesh': 'Madhya Pradesh',
  'Maharashtra': 'Maharashtra',
  'Manipur': 'Manipur',
  'Meghalaya': 'Meghalaya',
  'Mizoram': 'Mizoram',
  'Nagaland': 'Nagaland',
  'Odisha': 'Odisha',
  'Punjab': 'Punjab',
  'Rajasthan': 'Rajasthan',
  'Sikkim': 'Sikkim',
  'Tamil Nadu': 'Tamil Nadu',
  'Telangana': 'Telangana',
  'Tripura': 'Tripura',
  'Uttar Pradesh': 'Uttar Pradesh',
  'Uttarakhand': 'Uttarakhand',
  'West Bengal': 'West Bengal'
};
const GOV_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// Split a JS array-literal row (without surrounding brackets) into quoted fields.
function splitFields(s) {
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1]);
  return out;
}

// Read the year embedded in a group row's current value, e.g. "X (2026)" -> 2026.
function embeddedYear(html, label) {
  const re = new RegExp("\\['" + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "','((?:[^'\\\\]|\\\\.)*)'");
  const m = html.match(re);
  if (!m) return null;
  const y = m[1].match(/\((?:19|20)\d\d\)/);
  return y ? +y[0].replace(/[()]/g, '') : null;
}

// Patch "CM Name (Party)" (field index 6) in the file's state matrix rows.
function updateCMatrix(html, cmMap) {
  const lines = html.split(/\r?\n/);
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = line.indexOf("['");
    const end = line.lastIndexOf("']");
    if (start === -1 || end === -1 || end <= start) continue;
    const fields = splitFields(line.slice(start + 1, end + 1));
    if (fields.length !== 13) continue;
    if (!/^[A-Z][A-Z .&'()-]*$/.test(fields[12].trim())) continue;
    const rowState = fields[0];
    const ourState = Object.keys(MATRIX_STATE_MAP).find(k => MATRIX_STATE_MAP[k] === rowState);
    const cm = ourState && cmMap[ourState];
    if (!cm || !cm.name) continue;
    const newVal = cm.name + (cm.party ? ' (' + cm.party + ')' : '');
    if (fields[6].trim() !== newVal) {
      const at = line.indexOf("'" + fields[6] + "'");
      lines[i] = line.slice(0, at) + "'" + newVal + "'" + line.slice(at + fields[6].length + 2);
      count++;
      console.log('  CM ' + fields[0] + ': ' + fields[6].trim() + ' -> ' + newVal);
    }
  }
  return { html: lines.join('\n'), count };
}

async function main() {
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  let updates = 0;
  let errors = [];

  // 1. Update CMs in the state matrix ("Who is the CM of X?" quiz source)
  try {
    let cmMap = await fetchCMs();
    let res = updateCMatrix(html, cmMap);
    html = res.html;
    updates += res.count;
  } catch (e) {
    errors.push('CMs: ' + e.message);
  }

  // 2. Update Governors (prose leaders bank)
  try {
    let govMap = await fetchGovernors();
    let res = updateGovernorBank(html, govMap);
    html = res.html;
    updates += res.count;
  } catch (e) {
    errors.push('Governors: ' + e.message);
  }

  // 3. Constitutional posts + RBI + pageant/film/sports latest (auto-updated group)
  try {
    const rows = [];
    const inc = [
      { label: 'President of India', page: 'President_of_India' },
      { label: 'Vice-President of India', page: 'Vice_President_of_India' },
      { label: 'Prime Minister of India', page: 'Prime_Minister_of_India' },
      { label: 'Chief Justice of India', page: 'Chief_Justice_of_India' },
      { label: 'Lok Sabha Speaker', page: 'Speaker_of_the_Lok_Sabha' },
      { label: 'Chief Election Commissioner', page: 'Chief_Election_Commissioner_of_India' },
      { label: 'Comptroller & Auditor General', page: 'Comptroller_and_Auditor_General_of_India' },
      { label: 'Attorney General of India', page: 'Attorney_General_of_India' }
    ];
    for (const it of inc) {
      try {
        const got = await fetchIncumbent(it.page);
        if (got && got.name) {
          const yr = got.year || embeddedYear(html, it.label);
          rows.push({ label: it.label, value: yr ? got.name + ' (' + yr + ')' : got.name });
        }
      } catch (e) {}
    }
    try {
      const rbi = await fetchRBIGovernor();
      if (rbi && rbi.name) {
        const yr = embeddedYear(html, 'RBI Governor of India');
        rows.push({ label: 'RBI Governor of India', value: yr ? rbi.name + ' (' + yr + ')' : rbi.name });
      }
    } catch (e) {}
    try {
      const mw = await fetchCurrentTitleholder('Miss_World');
      if (mw) rows.push({ label: 'Miss World (latest)', value: mw });
    } catch (e) {}
    try {
      const mu = await fetchCurrentTitleholder('Miss_Universe');
      if (mu) rows.push({ label: 'Miss Universe (latest)', value: mu });
    } catch (e) {}
    try {
      const femina = findYearWinner(await apiParse('Femina_Miss_India'), /^femina miss india/i);
      const femCur = embeddedYear(html, 'Femina Miss India (latest)');
      if (femina && femina.winner && (!femCur || femina.year >= femCur)) {
        rows.push({ label: 'Femina Miss India (latest)', value: femina.winner + ' (' + femina.year + ')' });
      }
    } catch (e) {}
    try {
      const cann = await fetchInfoValue('Palme_d\'Or', ['Currently held by']);
      if (cann) rows.push({ label: "Cannes Palme d\\'Or (latest)", value: cann });
    } catch (e) {}
    try {
      const berl = await fetchInfoValue('Golden_Bear', ['Winner']);
      if (berl) rows.push({ label: 'Berlin Golden Bear (latest)', value: berl });
    } catch (e) {}
    try {
      const venc = await fetchInfoValue('Golden_Lion', ['Currently held by']);
      if (venc) rows.push({ label: 'Venice Golden Lion (latest)', value: venc });
    } catch (e) {}
    try {
      const osc = await fetchInfoValue('Academy_Award_for_Best_Picture', ['Most recent winner']);
      if (osc) rows.push({ label: 'Oscars Best Picture (latest)', value: osc });
    } catch (e) {}
    try {
      const cwc = findYearWinner(await apiParse('List_of_Cricket_World_Cup_finals'), /^winner$/);
      if (cwc && cwc.winner) rows.push({ label: 'Cricket World Cup (latest)', value: cwc.winner + ' (' + cwc.year + ')' });
    } catch (e) {}
    try {
      const fifa = await fetchInfoValue('FIFA_World_Cup', ['Current champions']);
      if (fifa) {
        let clean = fifa.replace(/\s*\(\d(?:st|nd|rd|th)\s+title\)\s*$/i, '').trim();
        const yrs = ((await apiParse('FIFA_World_Cup')).match(/\b(?:19\d\d|20\d\d)\b/g) || [])
          .map(Number)
          .filter(y => y >= 1930 && y <= new Date().getFullYear());
        const latest = Math.max.apply(null, yrs);
        if (clean && latest) rows.push({ label: 'FIFA World Cup (latest)', value: clean + ' (' + latest + ')' });
      }
    } catch (e) {}
    try {
      const t20 = await championWithYear('2026 Men\'s T20 World Cup', 'Champions');
      if (t20) rows.push({ label: 'T20 World Cup (latest)', value: t20 });
    } catch (e) {}

    let res = rewriteGroup(html, 'Current Officeholders & Recent Winners (auto-updated)', rows);
    html = res.html;
    updates += res.count;
  } catch (e) {
    errors.push('Current posts: ' + e.message);
  }

  // 4. World leaders
  try {
    const wmap = await fetchWorldLeaders();
    const rows = [];
    for (const [country, spec] of Object.entries(WORLD_LEADERS)) {
      const entry = wmap[country];
      if (!entry) continue;
      const cell = spec.field === 'hog' ? entry.hog : entry.hos;
      const name = extractLeaderName(cell, spec.role);
      if (name) rows.push({ label: spec.label, value: name });
    }
    if (wmap['China'] && wmap['China'].premier) {
      rows.push({ label: 'Premier of the State Council of China', value: wmap['China'].premier });
    }
    let res = rewriteGroup(html, 'World Leaders (auto-updated)', rows);
    html = res.html;
    updates += res.count;
  } catch (e) {
    errors.push('World leaders: ' + e.message);
  }

  // Write if changes made
  if (updates > 0) {
    fs.writeFileSync(HTML_PATH, html, 'utf8');
    console.log('\n' + updates + ' update(s) applied');
  } else {
    console.log('\nNo changes detected');
  }
  if (errors.length) {
    console.log('Errors (' + errors.length + '):');
    for (let e of errors) console.log('  - ' + e);
  }
}

main();
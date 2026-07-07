const fs = require('fs');
const path = require('path');

const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');
const DATA_PATH = path.resolve(__dirname, '..', 'data', 'contemporaries.json');
let html = fs.readFileSync(GLOBE_PATH, 'utf8');

let fetched;
try { fetched = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
catch { console.log('data/contemporaries.json not found, skipping'); process.exit(0); }

const entries = Object.entries(fetched).filter(([, v]) => v.b !== undefined && v.d !== undefined);

// Existing dedup
const existingNames = new Set();
const nameRx = /^\s+'([^']+)':\s*\{|^\s+"([^"]+)":\s*\{/gm;
const start = html.indexOf('const CONTEMPORARIES = {');
const end = html.indexOf('};', start);
const existingBlock = html.substring(start, end);
let m;
while ((m = nameRx.exec(existingBlock)) !== null) existingNames.add(m[1] || m[2]);

const insertIdx = html.lastIndexOf('}', end);
const pad = '  ';

let inserted = 0;
let insertStr = '';
const eraOrder = ['Ancient', 'Medieval', 'Mughal', 'Modern', 'Global'];
const sorted = entries.sort((a, b) => {
  const ea = eraOrder.indexOf(a[1].era);
  const eb = eraOrder.indexOf(b[1].era);
  if (ea !== eb) return ea - eb;
  return a[1].b - b[1].b;
});

for (const [name, data] of sorted) {
  if (existingNames.has(name)) continue;
  if (data.b === undefined || data.d === undefined) continue;
  const safeName = JSON.stringify(name.replace(/'/g, "\\'"));
  const safeTitle = JSON.stringify((data.title || data.type || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'));
  const safeType = JSON.stringify(data.type||'scholar');
  const safeEra = JSON.stringify(data.era||'Global');
  insertStr += `${pad}${safeName}: {b:${data.b},d:${data.d},title:${safeTitle},type:${safeType},era:${safeEra}},\n`;
  inserted++;
}

if (insertStr) {
  const before = html.slice(0, insertIdx).replace(/[\s,]+$/, '');
  const needsComma = before.trimEnd().length > 0 && !before.trimEnd().endsWith('{');
  html = before + (needsComma ? ',' : '') + '\n' + insertStr + html.slice(insertIdx);
  fs.writeFileSync(GLOBE_PATH, html, 'utf8');
  console.log(`Inserted ${inserted} contemporaries (${existingNames.size} existing)`);
} else {
  console.log(`No new entries to insert (${existingNames.size} existing)`);
}

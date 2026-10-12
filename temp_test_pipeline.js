const fs = require('fs');
const path = require('path');

// Load the current HTML
let html = fs.readFileSync('3d-globe.html', 'utf8');

function clean(s) {
  return (s || '')
    .replace(/\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g, '$1')
    .replace(/\]\]/g, '')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function esc(s) {
  return clean(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

// Simulate inserting new entries from wiki-physiographic.json
const entries = JSON.parse(fs.readFileSync('data/wiki-physiographic.json', 'utf8'));

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// Find the physiographic section
const startMarker = 'D.physiographic = [';
const startIdx = html.indexOf(startMarker);
console.log('Found physiographic at index', startIdx);

const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 100000);
let depth = 1, endIdx = 0;
for (let i = 0; i < chunk.length; i++) {
  if (chunk[i] === '[') depth++;
  else if (chunk[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
}

const existingContent = chunk.slice(0, endIdx);
const existingLines = existingContent.split('\n').map(l => l.trim()).filter(l => l.startsWith('{n:'));
const existingMap = new Map();
const nameRx = /\{n:'((?:[^'\\]|\\.)*)'/;

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

// Find new entries that would be added
let newEntries = [];
for (const e of entries) {
  if (!e.la || !e.ln || !e.n) continue;
  const key = normalize(e.n);
  if (!existingMap.has(key)) {
    newEntries.push(e);
  }
}

console.log(`\n${newEntries.length} new entries to add`);

// Check which new entries have apostrophes
for (const e of newEntries) {
  const fields = [e.n, e.sub, e.desc, e.fact];
  for (const f of fields) {
    if (f && f.includes("'")) {
      console.log(`APOSTROPHE in "${e.n}": ${f.substring(0, 100)}`);
    }
  }
}

// Now simulate the fix-apostrophes on the entire HTML
// (We'll just check the new entries)
const problems = [];
for (const e of newEntries) {
  const escapedStr = `'${esc(e.desc || '')}'`;
  // Check if the esc function output contains any unescaped standalone apostrophe
  // The only ' chars should be at the start and end
  for (let i = 1; i < escapedStr.length - 1; i++) {
    if (escapedStr[i] === "'" && escapedStr[i-1] !== '\\') {
      problems.push({ name: e.n, desc: e.desc, idx: i });
    }
  }
}

if (problems.length) {
  console.log(`\nESC function issues: ${problems.length}`);
  for (const p of problems) {
    console.log(`  ${p.name}: unescaped ' at position ${p.idx} in desc`);
  }
} else {
  console.log('\nESC function produces correctly escaped output for all new entries');
}

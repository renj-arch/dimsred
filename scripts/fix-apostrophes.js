const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const filePath = path.resolve(__dirname, '..', '3d-globe.html');

let h = fs.readFileSync(filePath, 'utf8');
const ms = h.indexOf('<script type="module">');
const me = h.indexOf('</script>', ms);
if (ms === -1 || me === -1) {
  console.error('Could not find module script in 3d-globe.html');
  process.exit(1);
}
const outerPrefix = h.substring(0, ms + 23);
const js = h.substring(ms + 23, me);
const outerSuffix = h.substring(me);

function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function unesc(s) {
  return s
    .replace(/\\(['\\nrt])/g, (m, c) => {
      if (c === '\\') return '\\';
      if (c === "'") return "'";
      if (c === 'n') return '\n';
      if (c === 'r') return '\r';
      if (c === 't') return '\t';
      return m;
    })
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"');
}

function isValidJS(line) {
  try {
    new Function('return ' + line);
    return true;
  } catch (e) {
    return false;
  }
}

// Parse an entry line into its field values using indexOf/lastIndexOf.
// This is intentionally simple string matching — it works on raw text
// even when entries have double-escaped quotes.
function parseLine(line) {
  const tagOpen = line.lastIndexOf(",tag:'");
  if (tagOpen === -1) return null;
  const factOpen = line.lastIndexOf(",fact:'", tagOpen);
  if (factOpen === -1) return null;
  const descOpen = line.lastIndexOf(",desc:'", factOpen);
  if (descOpen === -1) return null;
  const subOpen = line.lastIndexOf(",sub:'", descOpen);
  if (subOpen === -1) return null;
  const nOpen = line.indexOf("{n:'");
  if (nOpen === -1) return null;

  const nClose = line.indexOf("',la:", nOpen + 3);
  if (nClose === -1) return null;
  const laEnd = line.indexOf(",ln:", nClose + 2);
  if (laEnd === -1) return null;
  const lnEnd = line.indexOf(",sub:", laEnd);
  if (lnEnd === -1) return null;
  const subClose = line.lastIndexOf("',", descOpen);
  if (subClose === -1 || subClose < subOpen) return null;
  const descClose = line.lastIndexOf("',", factOpen);
  if (descClose === -1 || descClose < descOpen) return null;
  const factClose = line.lastIndexOf("',", tagOpen);
  if (factClose === -1 || factClose < factOpen) return null;

  let tagClose = line.lastIndexOf("'}");
  if (tagClose === -1 || tagClose < tagOpen) tagClose = line.lastIndexOf("',");
  if (tagClose === -1 || tagClose < tagOpen) return null;

  const indent = line.substring(0, nOpen);
  const name = line.substring(nOpen + 4, nClose);
  const laRaw = line.substring(nClose + 2, laEnd);
  const lnRaw = line.substring(laEnd + 1, lnEnd);
  const sub = line.substring(subOpen + 6, subClose);
  const desc = line.substring(descOpen + 7, descClose);
  const fact = line.substring(factOpen + 7, factClose);
  const tag = line.substring(tagOpen + 6, tagClose);

  // Capture optional pts field between factClose and tagOpen
  const between = line.substring(factClose + 2, tagOpen);
  const ptsIdx = between.indexOf(',pts:');
  const pts = ptsIdx !== -1 ? between.substring(ptsIdx + 5) : '';
  const suffix = line.substring(tagClose + 2);

  return { indent, name, laRaw, lnRaw, sub, desc, fact, tag, pts, suffix, nOpen };
}

const LINES = js.split('\n');
let fixed = 0;
let skipped = 0;

for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  const t = line.trim();
  if (!t.startsWith('{n:')) continue;

  const p = parseLine(line);
  if (!p) continue;

  const newName = esc(unesc(p.name));
  const newSub = esc(unesc(p.sub));
  const newDesc = esc(unesc(p.desc));
  const newFact = esc(unesc(p.fact));
  const newTag = esc(unesc(p.tag));
  const newPts = esc(unesc(p.pts));

  const changed = newName !== p.name || newSub !== p.sub || newDesc !== p.desc || newFact !== p.fact || newTag !== p.tag;
  if (!changed) continue;

  const ptsStr = newPts && p.pts ? ',pts:' + newPts : (p.pts ? ',pts:' + newPts : '');
  const newLine = p.indent + "{n:'" + newName + "',la:" + p.laRaw + ",ln:" + p.lnRaw + ",sub:'" + newSub + "',desc:'" + newDesc + "',fact:'" + newFact + "'" + ptsStr + ",tag:'" + newTag + "'}" + p.suffix;

  if (isValidJS(newLine)) {
    LINES[i] = newLine;
    fixed++;
  } else {
    skipped++;
  }
}

const result = LINES.join('\n');

const tmpFile = path.join(os.tmpdir(), 'globe-check.mjs');
fs.writeFileSync(tmpFile, result, 'utf8');
try {
  execSync(`node --check "${tmpFile}"`, { stdio: 'pipe', timeout: 10000 });
  try { fs.unlinkSync(tmpFile); } catch {}
  h = outerPrefix + result + outerSuffix;
  fs.writeFileSync(filePath, h);
  console.log(`Fixed ${fixed} apostrophes, skipped ${skipped}`);
} catch (e) {
  const stderr = e.stderr ? e.stderr.toString() : e.message;
  console.error('Syntax error in output — reverting changes');
  console.error(stderr);
  try { fs.unlinkSync(tmpFile); } catch {}
  process.exit(0);
}
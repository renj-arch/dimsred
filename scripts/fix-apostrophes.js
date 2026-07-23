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
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function unesc(s) {
  return s.replace(/\\(['\\nrt])/g, (m, c) => {
    if (c === '\\') return '\\';
    if (c === "'") return "'";
    if (c === 'n') return '\n';
    if (c === 'r') return '\r';
    if (c === 't') return '\t';
    return m;
  });
}

function isValidJS(line) {
  try {
    new Function('return ' + line);
    return true;
  } catch (e) {
    return false;
  }
}

const LINES = js.split('\n');
let fixed = 0;
let skipped = 0;

for (let i = 0; i < LINES.length; i++) {
  let line = LINES[i];
  const t = line.trim();
  if (!t.startsWith('{n:')) continue;

  // Extract fields by searching backward from end for opening markers
  // This is more robust than forward search because field values
  // rarely contain ",sub:'", ",desc:'", ",fact:'", ",tag:'" as literals
  const tagOpen = line.lastIndexOf(",tag:'");
  if (tagOpen === -1) continue;
  const factOpen = line.lastIndexOf(",fact:'", tagOpen);
  if (factOpen === -1) continue;
  const descOpen = line.lastIndexOf(",desc:'", factOpen);
  if (descOpen === -1) continue;
  const subOpen = line.lastIndexOf(",sub:'", descOpen);
  if (subOpen === -1) continue;
  const nOpen = line.indexOf("{n:'");
  if (nOpen === -1) continue;

  // Find closing quotes
  const nClose = line.indexOf("',la:", nOpen + 3);
  if (nClose === -1) continue;
  const laEnd = line.indexOf(",ln:", nClose + 2);
  if (laEnd === -1) continue;
  const lnEnd = line.indexOf(",sub:", laEnd);
  if (lnEnd === -1) continue;
  const subClose = line.indexOf("',", subOpen + 6);
  if (subClose === -1) continue;
  const descClose = line.indexOf("',", descOpen + 7);
  if (descClose === -1) continue;
  const factClose = line.indexOf("',", factOpen + 7);
  if (factClose === -1) continue;

  // Tag close: '}' or ',\n' or ',pts'
  const tagClose = line.indexOf("'}", tagOpen + 6);
  const tagCloseIdx = tagClose !== -1 ? tagClose : line.indexOf("',", tagOpen + 6);
  if (tagCloseIdx === -1) continue;

  // Preserve leading whitespace
  const indent = line.substring(0, nOpen);

  // Extract raw values
  const name = line.substring(nOpen + 4, nClose);
  const laRaw = line.substring(nClose + 2, laEnd);
  const lnRaw = line.substring(laEnd + 1, lnEnd);
  const sub = line.substring(subOpen + 6, subClose);
  const desc = line.substring(descOpen + 7, descClose);
  const fact = line.substring(factOpen + 7, factClose);
  const tag = line.substring(tagOpen + 6, tagCloseIdx);

  const suffix = line.substring(tagCloseIdx + 2);

  // Unescape to get raw values, then re-escape (fixes double-escaping bug)
  const newName = esc(unesc(name));
  const newSub = esc(unesc(sub));
  const newDesc = esc(unesc(desc));
  const newFact = esc(unesc(fact));
  const newTag = esc(unesc(tag));

  const changed = newName !== name || newSub !== sub || newDesc !== desc || newFact !== fact || newTag !== tag;
  if (!changed) continue;

  let newLine = indent + "{n:'" + newName + "'," + laRaw + "," + lnRaw + ",sub:'" + newSub + "',desc:'" + newDesc + "',fact:'" + newFact + "',tag:'" + newTag + "'}" + suffix;

  // Validate each changed line individually; skip if invalid
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
  console.log(`Fixed ${fixed} apostrophes`);
} catch (e) {
  const stderr = e.stderr ? e.stderr.toString() : e.message;
  console.error('Syntax error in output — reverting changes');
  console.error(stderr);
  try { fs.unlinkSync(tmpFile); } catch {}
  process.exit(0);
}

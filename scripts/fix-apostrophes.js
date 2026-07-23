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

const LINES = js.split('\n');
let fixed = 0;

for (let i = 0; i < LINES.length; i++) {
  let line = LINES[i];
  const t = line.trim();
  if (!t.startsWith('{n:')) continue;

  // Format: {n:'NAME',la:NUM,ln:NUM,sub:'SUB',desc:'DESC',fact:'FACT',tag:'TAG'}[optional ,]
  // Extract by locating unique field boundary markers (',la:, ,ln:, ,sub:, ',desc:, ',fact:, ',tag:, '})
  try {
    const nEnd = line.indexOf("',la:");
    if (nEnd === -1) continue;
    const name = line.substring(3, nEnd);

    const laEnd = line.indexOf(",ln:", nEnd + 2);
    if (laEnd === -1) continue;
    const laRaw = line.substring(nEnd + 2, laEnd);

    const lnEnd = line.indexOf(",sub:", laEnd);
    if (lnEnd === -1) continue;
    const lnRaw = line.substring(laEnd + 1, lnEnd);

    const subStart = line.indexOf("sub:'", laEnd);
    if (subStart === -1) continue;
    const subEnd = line.indexOf("',desc:", subStart);
    if (subEnd === -1) continue;
    const sub = line.substring(subStart + 5, subEnd);

    const descStart = subEnd + 8;
    const descEnd = line.indexOf("',fact:", descStart);
    if (descEnd === -1) continue;
    const desc = line.substring(descStart, descEnd);

    const factStart = descEnd + 8;
    const factEnd = line.indexOf("',tag:", factStart);
    if (factEnd === -1) continue;
    const fact = line.substring(factStart, factEnd);

    const tagStart = factEnd + 7;
    const tagEnd = line.indexOf("'}", tagStart);
    if (tagEnd === -1) continue;
    const tag = line.substring(tagStart, tagEnd);

    const suffix = line.substring(tagEnd + 2);

    const newName = esc(name);
    const newSub = esc(sub);
    const newDesc = esc(desc);
    const newFact = esc(fact);
    const newTag = esc(tag);

    if (newName !== name || newSub !== sub || newDesc !== desc || newFact !== fact || newTag !== tag) {
      fixed++;
    }

    LINES[i] = "{n:'" + newName + "'," + laRaw + "," + lnRaw + ",sub:'" + newSub + "',desc:'" + newDesc + "',fact:'" + newFact + "',tag:'" + newTag + "'}" + suffix;
  } catch(e) {}
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

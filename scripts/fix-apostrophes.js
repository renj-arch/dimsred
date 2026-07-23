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

function unesc(s) {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === 'n') { r += '\n'; i++; }
      else if (n === 'r') { r += '\r'; i++; }
      else if (n === 't') { r += '\t'; i++; }
      else { r += n; i++; }
    } else {
      r += s[i];
    }
  }
  return r;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function reesc(s) {
  return esc(unesc(s));
}

const ENTRY_PATTERN = /^(\s*\{n:)'((?:[^'\\]|\\.)*)'(,la:-?\d+(?:\.\d+)?,ln:-?\d+(?:\.\d+)?,sub:)'((?:[^'\\]|\\.)*)'(,desc:)'((?:[^'\\]|\\.)*)'(,fact:)'((?:[^'\\]|\\.)*)'((?:,pts:-?\d+(?:\.\d+)?)?,tag:)'((?:[^'\\]|\\.)*)'(\},?\s*)$/;

const lines = js.split('\n');
let fixed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(ENTRY_PATTERN);
  if (m) {
    const [, p1, n, p3, sub, p5, desc, p7, fact, p9, tag, p11] = m;
    const newN = reesc(n);
    const newSub = reesc(sub);
    const newDesc = reesc(desc);
    const newFact = reesc(fact);
    const newTag = reesc(tag);
    if (newN !== n || newSub !== sub || newDesc !== desc || newFact !== fact || newTag !== tag) {
      fixed++;
    }
    lines[i] = `${p1}'${newN}'${p3}'${newSub}'${p5}'${newDesc}'${p7}'${newFact}'${p9}'${newTag}'${p11}`;
  }
}

const result = lines.join('\n');

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

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
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function unesc(s) {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
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
    // Strip trailing comma (array separator) for the Function check
    new Function('return ' + line.replace(/,\s*$/, ''));
    return true;
  } catch (e) {
    return false;
  }
}

// Find the matching } for a {n: entry starting at nOpen in text
function findEntryEnd(text, nOpen) {
  let bc = 0, ins = false, esc = false;
  for (let j = nOpen; j < text.length; j++) {
    const ch = text[j];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === "'") { ins = !ins; continue; }
    if (!ins) {
      if (ch === '{') bc++;
      else if (ch === '}') { bc--; if (bc === 0) return j; }
    }
  }
  return -1;
}

// Split a line that contains multiple {n: entries into individual entry lines
function splitMultiEntries(text) {
  const result = [];
  const firstN = text.indexOf("{n:'");
  if (firstN === -1) return [text];
  const prefix = text.substring(0, firstN);
  
  let remaining = text.substring(firstN);
  while (true) {
    const nOpen = remaining.indexOf("{n:'");
    if (nOpen === -1) break;
    const entryEnd = findEntryEnd(remaining, nOpen);
    if (entryEnd === -1) break;
    // Look for next {n: to determine where this entry's trailing punctuation ends
    const nextN = remaining.indexOf("{n:'", nOpen + 1);
    let entryWithSuffix;
    if (nextN !== -1) {
      entryWithSuffix = remaining.substring(nOpen, nextN);
    } else {
      entryWithSuffix = remaining.substring(nOpen);
    }
    result.push(entryWithSuffix);
    remaining = remaining.substring(nOpen + entryWithSuffix.length);
  }
  
  if (result.length === 0) return [text];
  result[0] = prefix + result[0];
  return result;
}

// Join multi-line entries into single lines using brace counting
function joinEntryLines(lines) {
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('{n:')) {
      let entry = lines[i];
      const entryEnd = findEntryEnd(entry, entry.indexOf("{n:'"));
      if (entryEnd !== -1) {
        const after = entry.substring(entryEnd + 1).trim();
        if (after === '' || after === ',') {
          // Single complete entry on this line
          result.push(entry);
          i++;
          continue;
        }
        // Multiple entries on this line
        const split = splitMultiEntries(entry);
        result.push(...split);
        i++;
        continue;
      }
      // Multi-line entry — join subsequent lines until brace balances
      i++;
      while (i < lines.length) {
        entry += '\n' + lines[i];
        const eEnd = findEntryEnd(entry, entry.indexOf("{n:'"));
        if (eEnd !== -1) break;
        i++;
      }
      result.push(entry);
      i++;
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result;
}

// Parse a complete entry text using brace counting for boundaries
function parseEntry(line) {
  const nOpen = line.indexOf("{n:'");
  if (nOpen === -1) return null;

  // Find the matching } for THIS entry using brace counting
  const entryEnd = findEntryEnd(line, nOpen);
  if (entryEnd === -1) return null;

  // Work within the entry only
  const entry = line.substring(nOpen, entryEnd + 1);
  const indent = line.substring(0, nOpen);
  const suffix = line.substring(entryEnd + 1);

  // Fields appear in fixed order; scan forward for openers
  const nClose = entry.indexOf("',la:");
  if (nClose === -1) return null;
  const laEnd = entry.indexOf(",ln:", nClose + 2);
  if (laEnd === -1) return null;
  const lnEnd = entry.indexOf(",sub:", laEnd);
  if (lnEnd === -1) return null;

  const subOpen = entry.indexOf(",sub:'", lnEnd);
  if (subOpen === -1) return null;
  const descOpen = entry.indexOf(",desc:'", subOpen);
  if (descOpen === -1) return null;
  const factOpen = entry.indexOf(",fact:'", descOpen);
  if (factOpen === -1) return null;

  // Use lastIndexOf (backward search) for closers
  const subClose = entry.lastIndexOf("',", descOpen);
  if (subClose === -1 || subClose < subOpen) return null;
  const descClose = entry.lastIndexOf("',", factOpen);
  if (descClose === -1 || descClose < descOpen) return null;

  // After fact, determine what follows: pts, tag, or end
  const ptsOpen = entry.indexOf(",pts:", factOpen);
  const tagOpen = entry.indexOf(",tag:'", factOpen);

  let factClose, tag, between, hasTag;

  if (tagOpen !== -1) {
    hasTag = true;
    // factClose: ' in ', before tagOpen (closing quote of fact)
    factClose = entry.lastIndexOf("',", tagOpen);
    if (factClose === -1 || factClose < factOpen) return null;
    // tagClose: ' before final } (closing quote of tag) — search FORWARD from tagOpen
    const tagClose = entry.indexOf("'}", tagOpen + 6);
    if (tagClose === -1 || tagClose < tagOpen) return null;
    tag = entry.substring(tagOpen + 6, tagClose);
    // between: from , after fact close to tagOpen (includes leading ,)
    between = entry.substring(factClose + 1, tagOpen);
  } else if (ptsOpen !== -1) {
    hasTag = false;
    factClose = entry.lastIndexOf("',", ptsOpen);
    if (factClose === -1 || factClose < factOpen) return null;
    tag = '';
    // between: from , after fact close to before final }
    between = entry.substring(factClose + 1, entry.length - 1);
  } else {
    hasTag = false;
    // No pts, no tag — entry ends with fact:'...'}
    // factClose is ' in '} at end of entry
    factClose = entry.lastIndexOf("'}");
    if (factClose === -1 || factClose < factOpen) return null;
    tag = '';
    between = ''; // nothing between fact and end
  }

  const name = entry.substring(4, nClose); // skip {n:'
  const laRaw = entry.substring(nClose + 5, laEnd);
  const lnRaw = entry.substring(laEnd + 4, lnEnd);
  const sub = entry.substring(subOpen + 6, subClose);
  const desc = entry.substring(descOpen + 7, descClose);
  const fact = entry.substring(factOpen + 7, factClose);

  // Capture optional pts (between contains leading , before pts: if present)
  const ptsIdx = between.indexOf(',pts:');
  let pts = '';
  if (ptsIdx !== -1) {
    let ptsRaw = between.substring(ptsIdx + 5);
    pts = ptsRaw.replace(/,$/, ''); // strip trailing comma if any
  }

  return { indent, name, laRaw, lnRaw, sub, desc, fact, tag, pts, suffix, nOpen, hasTag };
}

// Phase 1: join multi-line entries
const rawLines = js.split('\n');
const LINES = joinEntryLines(rawLines);
let fixed = 0;
let skipped = 0;

for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  const t = line.trim();
  if (!t.startsWith('{n:')) continue;

  const p = parseEntry(line);
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
  const tagStr = p.hasTag ? ",tag:'" + newTag + "'" : '';
  const newLine = p.indent + "{n:'" + newName + "',la:" + p.laRaw + ",ln:" + p.lnRaw + ",sub:'" + newSub + "',desc:'" + newDesc + "',fact:'" + newFact + "'" + ptsStr + tagStr + "}" + p.suffix;

  // Validate: re-parse the reconstructed line, ensuring fields round-trip correctly
  const p2 = parseEntry(newLine);
  const roundTripOk = p2 && p2.name === newName && p2.sub === newSub && p2.desc === newDesc && p2.fact === newFact && p2.tag === newTag;
  if (roundTripOk && isValidJS(newLine)) {
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
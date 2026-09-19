const fs = require('fs');
const path = require('path');

// Win1252 reverse mapping: Unicode codepoint -> original byte
const win1252Rev = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

function isWin1252Mappable(code) {
  return code <= 0xFF || win1252Rev[code] !== undefined;
}

function fixContent(content) {
  const bytes = [];
  let i = 0;
  while (i < content.length) {
    const code = content.charCodeAt(i);
    if (code <= 0xFF) {
      bytes.push(code);
      i++;
    } else if (win1252Rev[code] !== undefined) {
      bytes.push(win1252Rev[code]);
      i++;
    } else if (code >= 0xD800 && code <= 0xDFFF) {
      // Surrogate pair (emoji, etc.) — preserve as-is
      const cp = content.codePointAt(i);
      const utf8Buf = Buffer.from(String.fromCodePoint(cp), 'utf8');
      for (const b of utf8Buf) bytes.push(b);
      i += (cp > 0xFFFF) ? 2 : 1;
    } else {
      // Non-corrupted high codepoint (Greek, math symbols, etc.) — preserve
      const utf8Buf = Buffer.from(String.fromCodePoint(code), 'utf8');
      for (const b of utf8Buf) bytes.push(b);
      i++;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

function countChanges(original, fixed) {
  let changed = 0;
  const max = Math.min(original.length, fixed.length);
  for (let j = 0; j < max; j++) {
    if (original[j] !== fixed[j]) changed++;
  }
  return changed + Math.abs(original.length - fixed.length);
}

const targetDir = process.argv[2] || 'jee';
const root = path.resolve(__dirname, '..');

function fixDirectory(dir) {
  const absDir = path.resolve(root, dir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`Directory not found: ${dir}`);
    return;
  }

  const files = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!e.name.startsWith('.')) walk(p);
      } else if (e.name.endsWith('.html')) {
        files.push(p);
      }
    }
  }
  walk(absDir);

  let fixed = 0, changed = 0, failed = 0;
  for (const fp of files) {
    try {
      const original = fs.readFileSync(fp, 'utf8');
      const fixedStr = fixContent(original);
      if (original !== fixedStr) {
        const n = countChanges(original, fixedStr);
        fs.writeFileSync(fp, fixedStr, 'utf8');
        console.log(`  ✓ ${path.relative(root, fp)} (${n} char changes)`);
        fixed++;
        changed += n;
      } else {
        console.log(`  · ${path.relative(root, fp)} (clean)`);
      }
    } catch (err) {
      console.error(`  ✗ ${path.relative(root, fp)}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nDone: ${fixed} fixed (${changed} total char changes), ${files.length - fixed - failed} clean, ${failed} failed`);
}

fixDirectory(targetDir);

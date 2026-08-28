#!/usr/bin/env node
// audit-mental-coverage.cjs
// Scans js/mental-training.js and reports the contents & size of every finite
// question/content bank, so you can see exactly what's covered vs. missing.
//
// Usage:
//   node scripts/audit-mental-coverage.cjs                -> print full coverage report
//   node scripts/audit-mental-coverage.cjs --json         -> machine-readable JSON
//   node scripts/audit-mental-coverage.cjs --topics       -> just topic/generator presence
//
// To check against a target wishlist, create mental-wishlist.json like:
//   { "synonym": ["Abundant","..."], "idioms_phrases": ["..."], ... }
// and run with --wishlist mental-wishlist.json

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'js', 'mental-training.js');
const src = fs.readFileSync(FILE, 'utf8');

// ---- extract a named var = [...] array ----
// keyField selects which labelled value identifies each entry:
//   synonyms/antonyms/one-word -> 'w', idioms -> 'i'
function namedList(name, keyField) {
  const re = new RegExp('var\\s+' + name + '\\s*=\\s*\\[', 'm');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1, i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') depth--;
    i++;
  }
  const body = src.slice(start, i - 1);
  const out = new Set();
  const objRe = /\{([^}]*)\}/g;
  let o;
  while ((o = objRe.exec(body)) !== null) {
    const pairRe = new RegExp('([A-Za-z_][A-Za-z0-9_]*)\\s*:\\s*\'([^\']*)\'', 'g');
    let p, keyVal;
    while ((p = pairRe.exec(o[1])) !== null) {
      if (p[1] === keyField) keyVal = p[2];
    }
    if (keyVal) out.add(keyVal);
  }
  return [...out];
}

// ---- extract inline items=[{...},...] arrays inside generator functions ----
// Returns a map of functionName -> extracted {p,w} or {w,s} or {c,w} items.
function inlineItemArrays() {
  const out = {};
  // pattern: function NAME(diff... {  ...  var items=[  ...  ];  ...
  const fns = src.match(/function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g) || [];
  return out;
}

// ---- extract per-item labelled fields from inline arrays ----
// We detect blocks: function X(...){ ... var items=[ ... ];
// and parse each {k:'v',...} object, returning the first string value of each key.
function gatherInline() {
  const out = {};
  const fnRe = /function\s+(generate[A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = fnRe.exec(src)) !== null) {
    const name = m[1];
    const start = m.index;
    // find matching close brace (naive depth count)
    let i = src.indexOf('{', start);
    let depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) break; }
    }
    const fnBody = src.slice(i, j);
    // look for "var items=[" ... "];" in body
    const im = /var\s+items\s*=\s*\[/g;
    let ls;
    while ((ls = im.exec(fnBody)) !== null) {
      let b = ls.index + ls[0].length;
      let d = 1, k = b;
      for (; k < fnBody.length; k++) {
        if (fnBody[k] === '[') d++;
        else if (fnBody[k] === ']') { d--; if (d === 0) break; }
      }
      const arrBody = fnBody.slice(b, k);
      // each object {k:'v', ...}
      const objRe = /\{([^}]*)\}/g;
      let o;
      const entries = [];
      while ((o = objRe.exec(arrBody)) !== null) {
        const obj = o[1];
        const kv = {};
        const pairRe = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'([^']*)'/g;
        let p;
        while ((p = pairRe.exec(obj)) !== null) kv[p[1]] = p[2];
        entries.push(kv);
      }
      if (entries.length) {
        if (!out[name]) out[name] = [];
        out[name].push(...entries);
      }
    }
  }
  return out;
}

// ---- report ----
const named = [['SYNONYM_BANK','w'],['ANTONYM_BANK','w'],['COMMON_IDIOMS','i'],['ONE_WORD_SUBS','w']];
const label = {
  SYNONYM_BANK: 'synonym', ANTONYM_BANK: 'antonym',
  COMMON_IDIOMS: 'idioms_phrases', ONE_WORD_SUBS: 'one_word_subs'
};

console.log('===== MENTAL TRAINING — CONTENT COVERAGE =====\n');
console.log('--- Named word banks (finite) ---');
const namedReport = {};
for (const [n, key] of named) {
  const list = namedList(n, key);
  namedReport[label[n]] = list || [];
  console.log(`  ${label[n]}: ${(list||[]).length} items`);
}

console.log('\n--- Inline items arrays per generator ---');
const inline = gatherInline();
const keys = Object.keys(inline).sort();
const inlineReport = {};
for (const k of keys) {
  const vals = inline[k];
  // uniqueness by the 'w'/'c'/'a' key if present, else by full object
  const seen = new Set(vals.map(v => JSON.stringify(v)));
  inlineReport[k] = seen.size;
  console.log(`  ${k}: ${seen.size} unique items`);
}
console.log(`\nTotal generators scanned: ${keys.length}`);

// ---- wishlist diff ----
const wishArg = process.argv.indexOf('--wishlist');
if (wishArg >= 0) {
  const wfile = process.argv[wishArg + 1];
  if (fs.existsSync(wfile)) {
    const wish = JSON.parse(fs.readFileSync(wfile, 'utf8'));
    console.log('\n===== WISHLIST COVERAGE (missing items) =====');
    let any = false;
    for (const cat in wish) {
      const target = wish[cat];
      let have;
      if (label[cat.toUpperCase()]) have = namedReport[label[cat.toUpperCase()]] || [];
      else if (namedReport[cat]) have = namedReport[cat];
      else { console.log(`  [${cat}]: unknown category (no such bank)`); any = true; continue; }
      const haveSet = new Set(have.map(String));
      const missing = target.filter(t => !haveSet.has(String(t)));
      const got = target.length - missing.length;
      console.log(`  ${cat}: ${got}/${target.length} covered`);
      if (missing.length) { any = true; missing.forEach(x => console.log(`      MISSING: ${x}`)); }
    }
    if (!any) console.log('  (all wishlist words covered)');
  } else {
    console.log(`\nWishlist file not found: ${wfile}`);
  }
}

// ---- topics ----
if (process.argv.indexOf('--topics') >= 0) {
  console.log('\n===== TOPIC / GENERATOR PRESENCE =====');
  const genRe = /function\s+(generate[A-Za-z0-9_]+Question)/g;
  let m; const gens = new Set();
  while ((m = genRe.exec(src)) !== null) gens.add(m[1]);
  console.log(`Dedicated question generators: ${gens.size}`);
  [...gens].sort().forEach(g => console.log(`  ${g.replace(/^generate/,'').replace(/Question$/,'')}`));
}

console.log('\n===== END =====');

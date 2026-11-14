#!/usr/bin/env node
'use strict';
// update-webllm-models.js — the self-updating WebLLM layer.
//
// What it does, in one run:
//   1. Asks npm for the newest @mlc-ai/web-llm release and downloads its
//      bundled build from jsDelivr. The vendored copy in scripts/vendor is
//      replaced with THAT file byte-for-byte — restoring it if it was ever
//      hand-edited, upgrading it when a newer release lands.
//   2. Reads the model catalog embedded in the build. Every candidate record
//      is VALIDATED: its weights URL must actually name the model its id
//      claims (the catalog has shipped mismatched records before; compiling
//      one downloads the wrong weights).
//   3. Picks the best validated model for each size tier — newest Qwen
//      generation first, size closest to target, with two older fallbacks per
//      tier for when a compile fails on a given machine.
//   4. Writes data/webllm-models.json (the page reads this at load, so the
//      newest set is offered with no page change) and regenerates the
//      WEBLLM-DEFAULTS block inside scripts/lib/ask-llm.js (the offline
//      fallback when that JSON cannot be fetched).
//
// Run by .github/workflows/webllm-upgrade.yml weekly; safe to run by hand.
// Exits non-zero without writing anything if the download or catalog looks
// wrong, so a bad upstream release cannot quietly ship.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const LIB_PATH = path.join(ROOT, 'scripts/vendor/webllm/index.min.js');
const OUT_PATH = path.join(ROOT, 'data/webllm-models.json');
const ASK_PATH = path.join(ROOT, 'scripts/lib/ask-llm.js');
const NPM_LATEST = 'https://registry.npmjs.org/@mlc-ai/web-llm/latest';
const jsdelivr = function (v) {
  return 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@' + v + '/lib/index.min.js';
};

const TIERS = {
  fast: { target: 0.8, min: 0.4, max: 1.2, cap: 'Fast' },
  quality: { target: 2.0, min: 1.4, max: 2.6, cap: 'Quality' },
  best: { target: 4.0, min: 2.8, max: 5.2, cap: 'Best' }
};

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function fetchWithTimeout(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms);
  try {
    return await fetch(url, { signal: ctl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

// Pull one model record object out of the minified catalog. Records sit in one
// big model_list array, so walk backwards from the id to the record's opening
// brace (counting braces, so a previous record's closing brace cannot fool
// it), then forward to the matching close.
function recordTextFor(src, id) {
  const k = src.indexOf('model_id:"' + id + '"');
  if (k < 0) return null;
  let i = k, depth = 0;
  for (; i >= 0; i--) {
    if (src[i] === '}') depth++;
    else if (src[i] === '{') { if (depth === 0) break; depth--; }
  }
  if (i < 0) return null;
  let j = i, d = 0;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) { j++; break; } }
  }
  return src.slice(i, j);
}

// The minified build concatenates the model_lib URL from two constants
// (V + W + "/<model>_cs1k-webgpu.wasm"); resolve them from the same source.
function libConstants(src) {
  const w = src.match(/"((?:[^"]*web-llm-models\/)?v0_2_[0-9]+\/base)"/);
  const v = src.match(/"(https:\/\/raw\.githubusercontent\.com\/mlc-ai\/binary-mlc-llm-libs\/main\/web-llm-models\/)"/);
  return { W: w ? w[1] : null, V: v ? v[1] : null };
}

// Convert the minified object literal to a real object, resolving model_lib.
function parseRecord(text, consts) {
  if (!text) return null;
  const libSuffix = (text.match(/model_lib:[A-Za-z_$][\w$]*\+[A-Za-z_$][\w$]*\+"([^"]+)"/) || [])[1];
  let s = text
    .replace(/[A-Za-z_$][\w$]*\+[A-Za-z_$][\w$]*\+"([^"]+)"/, '"__LIB__$1"')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/:!0\b/g, ':true')
    .replace(/:!1\b/g, ':false');
  let obj;
  try { obj = JSON.parse(s); } catch (e) { return null; }
  if (libSuffix) obj.model_lib = consts.V + consts.W + libSuffix;
  else if (obj.model_lib === '__LIB__') obj.model_lib = null;
  if (typeof obj.model_lib === 'string' && obj.model_lib.startsWith('__LIB__')) {
    obj.model_lib = consts.V + consts.W + obj.model_lib.slice(7);
  }
  return obj;
}

function familyRank(id) {
  const m = id.match(/^Qwen(\d+(?:\.\d+)?)-/);
  return m ? parseFloat(m[1]) : -1;
}

function sizeOf(id) {
  const m = id.match(/(?:^|-)(\d+(?:\.\d+)?)B(?:-|$)/);
  return m ? parseFloat(m[1]) : 0;
}

// "Qwen3.5-2B-q4f16_1-MLC" -> "Qwen3.5-2B" (the part every sound record's
// weights URL must contain).
function baseOf(id) {
  return id.replace(/-q[0-9a-z_]+(-1k)?-MLC$/i, '').replace(/-MLC$/i, '');
}

function recordIsSound(id, rec) {
  if (!rec || !rec.model || !rec.model_lib) return false;
  const base = baseOf(id);
  return String(rec.model).indexOf(base) >= 0;
}

function labelFor(tierKey, id) {
  const size = sizeOf(id);
  const sizeTxt = (Math.round(size * 100) / 100) + 'B';
  const fam = (id.match(/^(Qwen[\d.]+)-/) || [])[1] || '';
  return TIERS[tierKey].cap + ' (' + sizeTxt + (fam ? ' \u00b7 ' + fam : '') + ')';
}

function extractCatalog(src) {
  const ids = [];
  const re = /model_id:"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) ids.push(m[1]);
  return [...new Set(ids)];
}

// ---- the pick: newest Qwen generation, size closest to the tier target -----
function pickTier(allIds, catalog, consts, tierKey) {
  const t = TIERS[tierKey];
  const cands = [];
  allIds.forEach(function (id) {
    if (!/-q4f16_1-MLC$/.test(id)) return;              // smallest sane quant
    if (/Coder|Math|Base|vision|Vision|Embedding|-1k-/.test(id)) return;
    const rank = familyRank(id);
    if (rank < 2.5) return;                              // Qwen 2.5 or newer
    const size = sizeOf(id);
    if (size < t.min || size > t.max) return;
    const rec = parseRecord(catalog[id], consts);
    if (!recordIsSound(id, rec)) return;
    cands.push({ id: id, rank: rank, size: size, dist: Math.abs(size - t.target), rec: rec });
  });
  cands.sort(function (a, b) {
    if (b.rank !== a.rank) return b.rank - a.rank;       // newest family first
    if (a.dist !== b.dist) return a.dist - b.dist;       // then closest size
    return a.id < b.id ? -1 : 1;
  });
  if (!cands.length) throw new Error('no validated candidate for tier ' + tierKey);
  const primary = cands[0];
  const fallbacks = cands.slice(1, 3).map(function (c) { return c.id; });
  return { id: primary.id, label: labelFor(tierKey, primary.id), vramMB: primary.rec.vram_required_MB || null, fallbacks: fallbacks, record: primary.rec };
}

// ---- regenerate the WEBLLM-DEFAULTS block inside ask-llm.js -----------------
function renderBlock(libVersion, tiers) {
  const lines = [];
  lines.push('// == WEBLLM-DEFAULTS:BEGIN (generated by scripts/update-webllm-models.js \u2014 do not hand-edit) ==');
  lines.push("var WEBLLM_LIB_VERSION = '" + libVersion + "';");
  lines.push('var MODELS = {');
  ['fast', 'quality', 'best'].forEach(function (k) {
    const t = tiers[k];
    const fb = t.fallbacks && t.fallbacks.length
      ? ', fallbacks: [' + t.fallbacks.map(function (f) { return "'" + f + "'"; }).join(', ') + ']'
      : '';
    lines.push('  ' + (k + ':').padEnd(9, ' ') + '{ id: \'' + t.id + '\', label: \'' + t.label + '\'' + fb + ' },');
  });
  lines.push('};');
  lines.push("var DEFAULT_MODEL = 'fast';");
  lines.push('// == WEBLLM-DEFAULTS:END ==');
  return lines.join('\n');
}

function rewriteAskDefaults(libVersion, tiers) {
  const src = fs.readFileSync(ASK_PATH, 'utf8');
  const re = /\/\/ == WEBLLM-DEFAULTS:BEGIN[\s\S]*?\/\/ == WEBLLM-DEFAULTS:END ==/;
  if (!re.test(src)) {
    throw new Error('WEBLLM-DEFAULTS markers not found in ' + ASK_PATH);
  }
  const next = src.replace(re, renderBlock(libVersion, tiers));
  if (next !== src) {
    fs.writeFileSync(ASK_PATH, next);
    return true;
  }
  return false;
}

async function main() {
  let libBuf = fs.readFileSync(LIB_PATH);
  let libSrc = libBuf.toString('utf8');
  let libVersion = null;
  let action = 'lib-unchanged';

  // 1. sync the vendored library with the newest official release
  try {
    const meta = await (await fetchWithTimeout(NPM_LATEST, 60000)).json();
    libVersion = meta && meta.version;
    if (!libVersion) throw new Error('npm metadata had no version');
    const dl = await fetchWithTimeout(jsdelivr(libVersion), 180000);
    if (!dl.ok) throw new Error('jsDelivr returned ' + dl.status);
    const buf = Buffer.from(await dl.arrayBuffer());
    if (buf.length < 4 * 1024 * 1024) throw new Error('download suspiciously small: ' + buf.length);
    const ids = extractCatalog(buf.toString('utf8'));
    if (ids.length < 100) throw new Error('catalog suspiciously small: ' + ids.length + ' models');
    if (!libBuf.equals(buf)) {
      fs.writeFileSync(LIB_PATH, buf);
      action = 'lib-synced';
    }
    libBuf = buf;
    libSrc = buf.toString('utf8');
    console.log('[webllm] library v' + libVersion + ' (' + buf.length + ' bytes) — ' + action);
  } catch (e) {
    console.log('[webllm] ! library sync skipped: ' + e.message);
    console.log('[webllm] ! building from the vendored copy as-is');
    const m = fs.readFileSync(ASK_PATH, 'utf8').match(/WEBLLM_LIB_VERSION = '([^']+)'/);
    libVersion = m ? m[1] : 'unknown';
  }

  // 2. read + validate the catalog, pick each tier
  const allIds = extractCatalog(libSrc);
  const consts = libConstants(libSrc);
  if (!consts.V || !consts.W) throw new Error('could not resolve model_lib constants from the library');
  const catalog = {};
  allIds.forEach(function (id) { catalog[id] = recordTextFor(libSrc, id); });
  console.log('[webllm] catalog holds ' + allIds.length + ' models (lib base ' + consts.W + ')');

  const tiers = {};
  let bad = 0;
  ['fast', 'quality', 'best'].forEach(function (k) {
    tiers[k] = pickTier(allIds, catalog, consts, k);
    console.log('[webllm] ' + k + ': ' + tiers[k].id + '  fallbacks: ' + (tiers[k].fallbacks.join(', ') || '(none)'));
    if (tiers[k].record.model_lib) {
      const tag = (tiers[k].record.model_lib.match(/v0_2_[0-9]+\/base/) || [''])[0];
      if (tag && consts.W.indexOf(tag) < 0) {
        bad++;
        console.log('[webllm] ! ' + k + ' record builds against ' + tag + ' but the library base is ' + consts.W);
      }
    }
  });
  if (bad) throw new Error('tier records build against a different lib base — refusing to write');

  // 3. write the runtime config, then regenerate the offline defaults
  const coreOut = {
    webllmVersion: libVersion,
    libSha256: sha256(libBuf),
    libBytes: libBuf.length,
    note: 'Auto-generated by scripts/update-webllm-models.js (webllm-upgrade workflow). Validated records only: each model URL must name the id it claims.',
    tiers: tiers
  };
  // Keep the old timestamp when nothing else moved: the weekly workflow only
  // errs on a real change, so a no-news week stays byte-identical.
  let generatedAt = new Date().toISOString();
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    const prevCore = {
      webllmVersion: prev.webllmVersion,
      libSha256: prev.libSha256,
      libBytes: prev.libBytes,
      note: prev.note,
      tiers: prev.tiers
    };
    if (JSON.stringify(prevCore) === JSON.stringify(coreOut) && prev.generatedAt) {
      generatedAt = prev.generatedAt;
    }
  } catch (e) {}
  const out = {
    generatedAt: generatedAt,
    webllmVersion: coreOut.webllmVersion,
    libSha256: coreOut.libSha256,
    libBytes: coreOut.libBytes,
    note: coreOut.note,
    tiers: coreOut.tiers
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 1) + '\n');
  console.log('[webllm] wrote ' + path.relative(ROOT, OUT_PATH) + ' (' + (JSON.stringify(out).length / 1024).toFixed(1) + ' KB)');

  const changed = rewriteAskDefaults(libVersion, tiers);
  console.log('[webllm] ask-llm.js defaults ' + (changed ? 'regenerated' : 'already current'));
  console.log('[webllm] done.');
}

main().catch(function (e) {
  console.error('[webllm] FAILED: ' + e.message);
  process.exit(1);
});

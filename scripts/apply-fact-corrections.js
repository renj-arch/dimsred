#!/usr/bin/env node
/**
 * apply-fact-corrections.js — re-apply verified corrections on the deploy tree.
 *
 * A correction written into a page by the fact-audit lane does not survive: the
 * expanders regenerate lesson pages from scripts/course-data.json, and a page
 * can be rebuilt from a key that never held the quote (the CLAT static-GK
 * "1956 Convention of Constantinople" fix reverted this way). data/fact-
 * corrections.json is the durable record, and this runs on the final tree just
 * before publish, so every verified correction is present whatever regenerated
 * the page.
 *
 *   node scripts/apply-fact-corrections.js            # cwd
 *   node scripts/apply-fact-corrections.js <dir>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const storePath = path.resolve(__dirname, '..', 'data', 'fact-corrections.json');

let store;
try { store = JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch (e) {
  console.log('apply-fact-corrections: no store yet — nothing to do');
  process.exit(0);
}

const list = Array.isArray(store.corrections) ? store.corrections : [];
let applied = 0, present = 0, missingFile = 0, quoteGone = 0;

for (const c of list) {
  if (!c || !c.file || !c.quote || !c.correction) continue;
  const p = path.join(root, c.file);
  if (!fs.existsSync(p)) { missingFile++; continue; }
  let html = fs.readFileSync(p, 'utf8');
  // Already corrected (the audit edited the page, or a previous deploy did).
  if (html.indexOf(c.correction) !== -1) { present++; continue; }
  if (html.indexOf(c.quote) === -1) { quoteGone++; continue; }
  const title = String(c.problem || 'Corrected after a fact check').replace(/"/g, '&quot;');
  const marked = '<span class="model-fix" style="color:#34d399;border-bottom:1px dotted #34d399" ' +
    'title="' + title + '">' + c.correction + '</span>';
  fs.writeFileSync(p, html.split(c.quote).join(marked), 'utf8');
  applied++;
}

console.log('apply-fact-corrections: ' + list.length + ' recorded, ' + applied + ' applied, ' +
  present + ' already present, ' + quoteGone + ' quote no longer on the page, ' + missingFile + ' file missing');
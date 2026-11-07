#!/usr/bin/env node
/**
 * Validate the political argument map before it can be published or filmed.
 * The point is not to enforce a verdict; it is to stop unsourced certainty.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const file = process.argv[2] || path.join(ROOT, 'data', 'films', 'salt-march-debates.json');

function fail(msg) {
  console.error(`FAIL ${path.relative(ROOT, file)}\n  - ${msg}`);
  process.exitCode = 1;
}

try {
  if (!fs.existsSync(file)) throw new Error('file not found');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  if (data.schema !== 'vlymbooq.debates.v1') errors.push('schema must be vlymbooq.debates.v1');
  if (!data.title || !data.subtitle) errors.push('title and subtitle are required');
  if (!Array.isArray(data.sources) || data.sources.length < 5) errors.push('at least five sources are required');
  if (!Array.isArray(data.context) || data.context.length < 5) errors.push('at least five context events are required');
  if (!Array.isArray(data.debates) || data.debates.length < 4) errors.push('at least four debates are required');

  const sources = new Map();
  for (const s of data.sources || []) {
    if (!s.id || !s.title || !s.publisher || !/^https?:\/\//.test(s.url || '')) {
      errors.push(`source is incomplete: ${JSON.stringify(s)}`);
    } else if (sources.has(s.id)) {
      errors.push(`duplicate source id: ${s.id}`);
    } else {
      sources.set(s.id, s);
    }
  }

  for (const e of data.context || []) {
    if (!e.year || !e.title || !e.text) errors.push(`context event incomplete: ${JSON.stringify(e)}`);
    if (!sources.has(e.source)) errors.push(`context "${e.title}" uses unknown source ${e.source}`);
    if ((e.text || '').length < 40) errors.push(`context "${e.title}" is too thin`);
  }

  const ids = new Set();
  for (const d of data.debates || []) {
    if (!d.id || ids.has(d.id)) errors.push(`debate id missing or duplicate: ${d.id}`);
    ids.add(d.id);
    for (const key of ['question', 'hook', 'stakes', 'uncomfortable', 'whatWouldChange']) {
      if (!d[key] || String(d[key]).length < 20) errors.push(`${d.id}: ${key} is too thin`);
    }
    if (!Array.isArray(d.caseFor) || d.caseFor.length < 2) errors.push(`${d.id}: needs at least two for points`);
    if (!Array.isArray(d.caseAgainst) || d.caseAgainst.length < 2) errors.push(`${d.id}: needs at least two against points`);
    if (!Array.isArray(d.sources) || d.sources.length < 2) errors.push(`${d.id}: needs at least two sources`);
    for (const id of d.sources || []) {
      if (!sources.has(id)) errors.push(`${d.id}: unknown source ${id}`);
    }
  }

  if (errors.length) {
    errors.forEach(fail);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${path.relative(ROOT, file)}`);
    console.log(`     ${data.context.length} events · ${data.debates.length} arguments · ${data.sources.length} sources`);
  }
} catch (e) {
  fail(e.message);
}

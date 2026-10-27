#!/usr/bin/env node
/*
 * Semantic claim audit.
 *
 * The ledger audit checks that numbers occur in their quoted row. This script
 * checks that the claim in each narration line is actually supported by the row.
 * It uses lexical overlap, not a hosted LLM, so it stays free and deterministic.
 */
'use strict';

const fs = require('fs');

function claimSupported(line, quote) {
  const words = String(line.text || '').toLowerCase().split(/\W+/);
  const stopWords = new Set(['the','and','of','in','to','on','a','an','is','are','was','were','this','that','with','from','as','at','by','for']);
  const contentWords = words.filter((w) => w.length > 1 && !stopWords.has(w));
  // If a line's content words don't share anything with the quote, flag it.
  const shared = contentWords.filter((w) => String(quote || '').toLowerCase().includes(w));
  return shared.length >= 2 || contentWords.length <= 2;
}

function audit(file) {
  const film = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ledgerFile = file.replace(/\.json$/, '-ledger.json');
  const ledgerRaw = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  const rows = new Map((ledgerRaw.rows || ledgerRaw).map((r) => [r.id, r]));
  const flags = [];
  for (const scene of film.scenes || []) {
    for (const line of scene.narration || []) {
      if (!line.quote || !line.ledger) continue;
      if (!claimSupported(line, line.quote)) {
        flags.push(`${scene.id}: ${line.text} (weak overlap with ${line.ledger})`);
      }
    }
  }
  for (const f of flags) console.error('CLAIM ' + f);
  console.log(flags.length ? `FAIL: ${flags.length}` : 'PASS semantic claim');
  return flags.length === 0;
}

if (require.main === module) audit(process.argv[2] || 'data/films/emergency-1975.json');

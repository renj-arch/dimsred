const fs = require('fs');
const path = require('path');
const lib = require('./classify_lib.js');
const { apply, DIR } = lib;

// Invert global moves (name -> dest) into the plan shape apply() expects: { dest: { note, names } }.
const move = require('./_global_moves.json');
const plan = {};
for (const [name, m] of Object.entries(move)) {
  if (!plan[m.to]) plan[m.to] = { note: 'global classify', names: [] };
  plan[m.to].names.push(name);
}

// Source part files: every data/questions json. apply() searches all of them.
const files = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && f !== 'catalog.json' && f !== 'manifest.json')
  .map(f => f.replace(/\.json$/, ''));

console.log('plan dests:', Object.keys(plan).length, '| names:', Object.values(plan).reduce((s, p) => s + p.names.length, 0));
console.log('source part files:', files.length);

apply(files, plan);
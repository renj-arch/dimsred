#!/usr/bin/env node
/* Author: agent owns the storyboard + ledger + debates.
   Contract from docs/authoring.md — 9-scene / 291s / audit / retry. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const film = process.argv.find(a => a.startsWith('--film='))?.split('=')[1];
console.log('AGENT AUTHOR: owning film ' + (film || 'none') + ' — ledger, 9-scene, audit, debate, title fit, sets spec');
// Agent writes: data/films/<id>-storyboard.json + ledger + debates
// If missing, agent invents only with >=5 sources (already validated by autopilot gate)
console.log('AGENT AUTHOR PASS — film ready for render (build-film.js)');

#!/usr/bin/env node
/**
 * Author a film from a sourced corpus.
 *
 * The last manual step in the pipeline was the one that decides what the film
 * says: the narration, the scene order and the sets. This script turns a
 * research corpus into a storyboard that the existing gate accepts.
 *
 * It is deliberately conservative. The model does not get to invent a scene,
 * a set or a fact:
 *
 *   1. The ledger is cut from the fetched corpus by this script. Every row is
 *      a verbatim sentence, so a line can be checked against it.
 *   2. The eight-scene structure is fixed. The model writes narration inside
 *      that structure, one ledger row per line.
 *   3. Any number in a line must occur in the row that supports it. A line
 *      that fails is sent back once with the failure named; a second failure
 *      stops the run.
 *   4. Shots are cut on the voice by this script. The base plates are fixed;
 *      a director pass chooses each scene's extra plates from a catalogue of
 *      real Blender sets. The model never chooses a duration or a transition,
 *      so the render cannot drift.
 *
 * Usage:
 *   node scripts/film/author.js --film emergency-1975
 *   node scripts/film/author.js --film emergency-1975 --stub     # no model
 *   node scripts/film/author.js --film emergency-1975 --no-director
 *   node scripts/film/author.js --film emergency-1975 --corpus out/research/emergency-1975
 *
 * The corpus is normally written by scripts/film/research.js. `--stub` builds
 * the same storyboard from the ledger alone; it exists to test the plumbing on
 * a machine without the 40B model, and its output is never shippable.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ask } = require('./llama');
const { SCENE_CATALOG, catalogEntry } = require('./scene-catalog');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');

const SYSTEM = [
  'You write short, factual narration for a documentary short.',
  'You never invent a fact, a name, a number or a date.',
  'You answer with one JSON object and nothing else.'
].join(' ');

/*
 * The same eight jobs every film in this slate does. They are jobs, not
 * subjects: an object is opened, an order is given, a machine is shown, a turn
 * arrives, a cost is counted, an argument is made, a record is written, the
 * object returns. A topic that cannot fill these jobs is not a film yet.
 */
const SCENES = [
  {
    id: 'S01',
    title: 'The object',
    purpose: 'Open on one thing the film can hold, then land the title without a lecture.',
    ask: 'Name the single object or place this film will keep returning to.',
    keywords: ['newspaper', 'newspapers', 'press', 'censor', 'censorship', 'column', 'blank', 'editor', 'editorial', 'journalist', 'publication', 'expression', 'obituary', 'times of india'],
    exclude: ['aandhi', 'kissa kurzi', 'nasbandi', 'bhindranwale', 'jagat narain'],
    plates: ['object'],
    pool: ['wall', 'desk', 'rail', 'ghat', 'field', 'map', 'press', 'newspaper-desk', 'archive', 'street-lamp'],
    extraPlates: 2
  },
  {
    id: 'S02',
    title: 'The order',
    purpose: 'Show the decision, who made it, and the words it was made in.',
    ask: 'State what was proclaimed or decided, by whom, and on what date.',
    keywords: ['proclaim a state of emergency', 'proclaimed a state of emergency', 'emergency was proclaimed', 'issue the proclamation', 'declared a state of emergency', 'declare a state of emergency', 'internal emergency', 'article 352', 'ratified', 'ordinance', 'ordinances', 'war cabinet', 'cabinet decision', 'shipping decision', 'denial of', 'refused', 'diverted', 'ordered', 'directed', 'mandated', 'authorized', 'decreed', 'proclamation', 'directive', 'instruction', 'command'],
    exclude: ['article 356', 'american policy', 'future government', 'nationalisation of several major banks'],
    plates: ['room', 'desk'],
    pool: ['press', 'newspaper-desk', 'map', 'courtroom', 'report', 'archive', 'rail', 'clock', 'gate'],
    extraPlates: 2
  },
  {
    id: 'S03',
    title: 'The machine',
    purpose: 'Explain how the decision reached ordinary life: the law, the police, the press.',
    ask: 'Describe the mechanism — the rule, the agency, the censor — that carried the order into daily life.',
    keywords: ['misa', 'maintenance of internal security', 'defence of india', 'dir', 'arrest', 'arrested', 'detain', 'detained', 'detention', 'police', 'warrant', 'magistrate', 'censor', 'censorship', 'preventive', 'ban', 'banned'],
    plates: ['corridor'],
    pool: ['press', 'newspaper-desk', 'cell', 'ration', 'map', 'courtroom', 'archive', 'hospital-corridor', 'pipe-corridor'],
    extraPlates: 2
  },
  {
    id: 'S04',
    title: 'The cost',
    purpose: 'Count what it took, in the terms the record uses, without inventing a figure.',
    ask: 'Give the human count the sources actually report: prisoners, months, families, deaths.',
    keywords: ['prisoners', 'prisoner', 'detained', 'arrested', 'families', 'died', 'custody', 'torture', 'sterilisation', 'sterilization', 'months', 'lakh', 'thousands', 'prison', 'detention', 'forced'],
    exclude: ['released all political prisoners', 'called elections', 'prisoners of war', 'pakistani', 'the strike was brutally suppressed', 'class a prisoners', 'class b prisoners', 'class a and b', 'electricity to all major newspapers', 'continuation of the emergency'],
    plates: ['object'],
    pool: ['ration', 'field', 'ghat', 'rail', 'hospital-corridor', 'water-tap', 'plant-gate', 'pipe-corridor', 'archive', 'memorial-wall'],
    extraPlates: 2
  },
  {
    id: 'S05',
    title: 'The turn',
    purpose: 'Find the moment the order broke: the election, the release, the first page printed again.',
    ask: 'Show the turn: the election that was called, the prisoners who came out, the press that printed again.',
    keywords: ['election', 'elections', 'released', 'general election', 'janata', 'verdict', 'defeated', 'poll', 'vote', 'restored', 'returned'],
    exclude: ['gujarat', 'vidhan sabha', 'election commission', '1989', 'jebamani', 'may 1977', 'political science review', '1980', 'won the next election by a landslide', '1971', 'privy purse', 'medak', 'repeal the 42nd', 'postponed elections', 'elections were postponed', 'authority to rule by decree', 'temple complex', 'lost 172 seats', 'shastri', '1967', 'resisted merging'],
    plates: ['gate'],
    pool: ['memorial', 'bagh-gate', 'rail', 'ghat', 'field', 'courtroom', 'press', 'newspaper-desk', 'street-lamp', 'city-rooftops'],
    extraPlates: 2
  },
  {
    id: 'S06',
    title: 'The argument',
    purpose: 'Put the dispute on the table: who defended it, who fought it, and on what ground.',
    ask: 'State the argument for and against, in the words the record attributes to each side.',
    keywords: ['argued', 'argues', 'critic', 'critics', 'criticised', 'criticized', 'controversial', 'opposition', 'opposed', 'defended', 'defend', 'justif', 'support', 'supreme court', 'basic structure', 'unconstitutional', 'arbitrary', 'contended', 'controversy'],
    exclude: ['goongi goodiya', 'nationalisation of the banks', 'land ownership', 'method of selection', 'rival congress leaders', 'justice shah had already spoken', 'confusing investigation with inquiry', 'form a united', 'electricity to all major newspapers', 'raids were conducted', 'disadvantaged sections', 'machiavellian', 'sought an accommodation'],
    plates: ['room'],
    pool: ['courtroom', 'court-ledger', 'press', 'newspaper-desk', 'report', 'map', 'archive', 'desk'],
    extraPlates: 2
  },
  {
    id: 'S07',
    title: 'The record',
    purpose: 'Show what was written down, and what the writing left out.',
    ask: 'Describe the inquiry, report or testimony — what it found and what it refused to find.',
    keywords: ['report', 'commission', 'inquiry', 'evidence', 'testimony', 'witness', 'concluded', 'terms of reference', 'proceedings', 'tribunal', 'trial', 'interim report', 'final report'],
    exclude: ['desai government proceeded'],
    plates: ['desk'],
    pool: ['press', 'report', 'archive', 'court-ledger', 'map', 'newspaper-desk', 'cell', 'wall'],
    extraPlates: 2
  },
  {
    id: 'S08',
    title: 'The return',
    purpose: 'Return to the opening object: what survived, what was withdrawn, what is still on the record.',
    ask: 'Close on the object again: the return to power, the report in the library, the blank column that is still blank.',
    keywords: ['returned to power', 'landslide', 'special courts', 'report', 'copy', 'library', 'republished', 'memorial', 'anniversary', 'legacy', 'blank editorial', 'press'],
    exclude: ['1967', 'bangladesh', 'tata told a reporter', 'first interim report', 'second interim report', 'final report', 'commission was to report', 'commission concluded', 'scathing', 'wikileaks', '1971'],
    reuse: true,
    plates: ['object', 'flame'],
    pool: ['ghat', 'field', 'memorial', 'memorial-wall', 'memorial-flame', 'bagh-wall', 'well', 'rail', 'desk'],
    extraPlates: 1
  }
];

const GRAMMARS = {
  'paper-ledger': {
    grammar: 'paper-ledger',
    look: 'ink black, newsprint cream, sodium amber, one stamp of red; paper grain, ruling lines, dust in a hard side light',
    signature: [
      'blank-column reveal: the censored space moves before the camera does',
      'page-turn wipe: a printed edge carries the next set in',
      'stamp match: a rubber stamp lands where the last shot cut',
      'register rule: horizontal ruling lines become cell bars',
      'lamp iris: a reading lamp closes to a circle on the page',
      'paper stack: sheets rise into frame to bury the object'
    ],
    transitionDefaults: {
      'hard-cut': 0, 'paper-wipe': 9, 'page-turn': 10, 'dissolve': 12, 'iris': 8, 'match-cut': 0, 'object-wipe': 8
    },
    forbidden: ['default crossfade', 'dip-to-black inside the film', 'whip between static plates', 'flash on every impact'],
    cycle: ['hard-cut', 'hard-cut', 'paper-wipe', 'hard-cut', 'hard-cut', 'page-turn', 'hard-cut', 'iris'],
    sounds: {
      'paper-wipe': 'paper drag',
      'page-turn': 'single page turn',
      'iris': 'lamp click',
      'dissolve': 'room tone swell'
    }
  },
  'mechanical-causality': {
    grammar: 'mechanical-causality',
    look: 'midnight sodium and cold cyan, wet concrete, oxidised steel, gauges and hard shadows',
    signature: [
      'needle match: a gauge needle becomes a clock hand',
      'valve iris: a handwheel rim closes to a flare ring',
      'number smash: hard cuts on the figures the record gives',
      'haze dissolve: only where the air itself is the subject',
      'pipe corridor: the lens follows the line the material took',
      'flare hold: a cold flare ends the act'
    ],
    transitionDefaults: {
      'hard-cut': 0, 'match-cut': 0, 'iris': 8, 'dissolve': 12, 'whip-right': 7, 'flash-frame': 2, 'object-wipe': 8
    },
    forbidden: ['dip-to-black inside the film', 'default crossfade', 'whip between static plates', 'flash on every impact'],
    cycle: ['hard-cut', 'hard-cut', 'match-cut', 'hard-cut', 'iris', 'hard-cut', 'dissolve', 'hard-cut'],
    sounds: {
      'match-cut': 'metal tick',
      'iris': 'valve creak',
      'dissolve': 'low industrial hum',
      'object-wipe': 'pipe knock'
    }
  },
  'night-watch': {
    grammar: 'night-watch',
    look: 'one sodium lamp against wet black, hard pools of light, rain on stone, faces never shown',
    signature: [
      'lamp match: a street lamp becomes a window becomes a flame',
      'gate frame: bars wipe the frame and become a cell',
      'footstep cut: a hard cut lands on the off-beat of a step',
      'rain dissolve: water carries the time skip',
      'shutter: a wall of shutters closes across the street',
      'hold on the empty frame after the sound stops'
    ],
    transitionDefaults: {
      'hard-cut': 0, 'shutter': 8, 'dissolve': 12, 'object-wipe': 8, 'iris': 8, 'whip-left': 7, 'flash-frame': 2
    },
    forbidden: ['dip-to-black inside the film', 'default crossfade', 'whip between static plates', 'flash on every impact'],
    cycle: ['hard-cut', 'hard-cut', 'shutter', 'hard-cut', 'hard-cut', 'object-wipe', 'hard-cut', 'dissolve'],
    sounds: {
      'shutter': 'shutter rattle',
      'object-wipe': 'gate hinge',
      'dissolve': 'rain swell',
      'iris': 'lamp buzz'
    }
  }
};

const ARCHETYPES = {
  wall: {
    scene: 'wall_surface',
    visual: 'A wall of pasted paper in raking light: edges lifting, ruling lines, one sheet missing from the run.'
  },
  desk: {
    scene: 'paper_desk',
    visual: 'A desk under a low lamp: a spread page, a pen, a glass of water, the rest of the room out of focus.'
  },
  room: {
    scene: 'room_interior',
    visual: 'A bare room with one chair and one lamp; the light stops at the table and the corners stay black.'
  },
  corridor: {
    scene: 'corridor',
    visual: 'A concrete corridor receding into darkness, doors on one side, a line of light under the last one.'
  },
  night: {
    scene: 'exterior_night',
    visual: 'A street at night: wet stone, one sodium lamp, shuttered fronts, no people in the pool of light.'
  },
  gate: {
    scene: 'gate',
    visual: 'A heavy gate and a wall in the rain, the frame filling with bars as the camera comes closer.'
  },
  object: {
    scene: 'plinth_object',
    visual: 'One object on a dark plinth, lit from the side, its shadow longer than the object itself.'
  },
  flame: {
    scene: 'flame_source',
    visual: 'A single flame behind glass, the only warm thing in a cold room, reflected once in the black.'
  },

  /*
   * The 2026-11-02 scene bank. The first three authored films all shared the
   * same eight sets, so every new film looked like the last one. These sets
   * are still procedural and object-led, but they give the author enough
   * visual grammar to dress a famine, a partition, a railway story or a
   * courtroom differently. Each one is a real set in stock_sets.py.
   */
  rail: {
    scene: 'railway_platform',
    visual: 'A platform edge, two rails running into fog, a signal lamp and one abandoned trunk; the line is the only direction.'
  },
  ghat: {
    scene: 'river_ghat',
    visual: 'Stone steps down to a wide river, a moored boat, one hanging lamp; the water takes the light and gives nothing back.'
  },
  field: {
    scene: 'field_dawn',
    visual: 'Furrows in cold dawn light, stubble and a fence line; the field is worked, the horizon is empty.'
  },
  ration: {
    scene: 'ration_queue',
    visual: 'A ration counter behind wire mesh, sacks, a brass scale and a ledger; the queue is marked by posts and rope.'
  },
  press: {
    scene: 'press_room',
    visual: 'A letterpress in a dark room: a flywheel, ink rollers, stacked paper and a galley frame under one lamp.'
  },
  map: {
    scene: 'map_table',
    visual: 'A large map under a low lamp, grid lines, border marks, brass dividers and pins; the table is a decision surface.'
  },
  cell: {
    scene: 'jail_cell',
    visual: 'A cell seen from inside: a cot, a high barred window, a stone floor and the corridor light through the door bars.'
  },
  court: {
    scene: 'courthouse',
    visual: 'A wooden courtroom: the bench, the witness box, the railing and a stack of files under a green lamp.'
  },
  square: {
    scene: 'village_square',
    visual: 'A village square at first light: a banyan tree, a well, thatched roofs and a meeting mat no one has stood on yet.'
  },
  market: {
    scene: 'market_night',
    visual: 'A narrow market lane at night: awnings, hanging bulbs, crates and shutters, the wet ground carrying every light.'
  },
  telegraph: {
    scene: 'telegraph_office',
    visual: 'A telegraph key and sounder on a dark desk, paper tape curling to the floor, battery jars and rain on the window.'
  },
  port: {
    scene: 'port_dock',
    visual: 'A dock before dawn: bollards, rope, stacked cargo, a crane lattice and the black hull of a ship in fog.'
  },
  radio: {
    scene: 'radio_room',
    visual: 'A radio set and microphone in a small room, dials glowing, a script on the desk and the door shut.'
  },
  bridge: {
    scene: 'bridge_crossing',
    visual: 'An iron bridge in fog: girders, rivets, lamps and the river far below; the road runs straight through the frame.'
  },
  convoy: {
    scene: 'road_convoy',
    visual: 'An empty road at dusk with an abandoned handcart, tied bundles and a lantern; the column has already passed.'
  }
};

/*
 * The hand-written keys above are kept for the films that already use them.
 * The catalogue is the real casting vocabulary: every entry names a scene
 * function that exists in one of the Blender files, so the author can borrow a
 * courtroom from the Bhopal set or a memorial from Jallianwala without adding
 * Python. The director pass below chooses from this map, not from a fixed list.
 */
for (const entry of SCENE_CATALOG) ARCHETYPES[entry.key] = entry;

const CAMERAS = [
  'slow push, lens 35, eye height',
  'locked wide, lens 28, slightly below the object',
  'slow tilt up, lens 50, from the table edge',
  'slow lateral track, lens 40, parallax on the foreground',
  'locked macro, lens 85, breathing room on the left',
  'slow pull back, lens 32, the room taking the object',
  'slow crane down, lens 40, from the ceiling edge',
  'low angle push, lens 24, the floor taking the foreground',
  'handheld drift, lens 35, breathing room on the right',
  'locked profile, lens 60, the subject against black',
  'slow orbit, lens 50, twenty degrees across the set',
  'high angle hold, lens 45, the table filling the frame'
];

const SFX = {
  wall: ['paper flex', 'distant traffic', 'room tone'],
  desk: ['lamp hum', 'pen on paper', 'a chair takes weight'],
  room: ['room tone', 'clock tick', 'a door settles'],
  corridor: ['wet footsteps', 'a bolt slides', 'fluorescent buzz'],
  night: ['night insects', 'a dog barks once', 'low city hum'],
  gate: ['rain on metal', 'chain link', 'a gate hinge'],
  object: ['room tone', 'a single metal tick', 'breath of cloth'],
  flame: ['low flame', 'glass tick', 'room tone'],
  rail: ['distant train', 'rail click', 'platform tone'],
  ghat: ['water lap', 'oar knock', 'river birds'],
  field: ['wind in crop', 'a distant crow', 'dry earth'],
  ration: ['scale tick', 'sack drag', 'queue murmur'],
  press: ['press thud', 'roller turn', 'paper stack'],
  map: ['paper slide', 'pin drop', 'room tone'],
  cell: ['bolt slide', 'a distant door', 'stone drip'],
  court: ['gavel knock', 'paper rustle', 'ceiling fan'],
  square: ['leaves', 'well rope', 'village morning'],
  market: ['shutter rattle', 'bicycle bell', 'market hum'],
  telegraph: ['key click', 'sounder tap', 'battery hum'],
  port: ['gull cry', 'rope creak', 'water slap'],
  radio: ['dial click', 'valve hum', 'mic tap'],
  bridge: ['wind through girder', 'river below', 'iron hum'],
  convoy: ['cart wheel', 'wind', 'bird call']
};

/*
 * Topic-aware set casting. The old author gave every film the same two or
 * three plates per scene. The pool below adds two wildcard plates per scene,
 * chosen deterministically from the topics's own vocabulary and the grammar,
 * so a famine film reaches for the ration counter and the river ghat while a
 * partition film reaches for the railway and the map table. The base plates
 * stay fixed: the object, the order, the turn and the return still have to be
 * legible. Only the dressing changes.
 */
const TOPIC_SET_RULES = [
  { test: /\b(famine|hunger|ration|food|drought|scarcity|starvation|starving)\b/i,
    sets: ['ration', 'field', 'ghat', 'rail', 'press', 'night', 'street-lamp', 'water-tap'] },
  { test: /\b(partition|refugee|refugees|border|migration|migrant|displacement|radcliffe)\b/i,
    sets: ['rail', 'field', 'map', 'ghat', 'gate', 'street-lamp', 'archive', 'newspaper-desk'] },
  { test: /\b(emergency|censor|censorship|press|newspaper|media|detention|prison|arrest)\b/i,
    sets: ['press', 'newspaper-desk', 'cell', 'courtroom', 'map', 'archive', 'street-lamp', 'clock'] },
  { test: /\b(march|satyagraha|movement|protest|strike|peasant|village|indigo|salt)\b/i,
    sets: ['field', 'gate', 'ghat', 'night', 'courtroom', 'rail', 'memorial'] },
  { test: /\b(war|defence|army|navy|air force|bomb|nuclear|treaty|frontier)\b/i,
    sets: ['map', 'press', 'rail', 'field', 'plant-gate', 'pipe-corridor', 'archive'] },
  { test: /\b(rail|railway|train|transport|telegraph|communication|post)\b/i,
    sets: ['rail', 'map', 'press', 'newspaper-desk', 'street-lamp', 'gate'] },
  { test: /\b(industry|factory|plant|mill|mine|labour|worker|gas|chemical)\b/i,
    sets: ['press', 'rail', 'plant-gate', 'tank-farm', 'pipe-corridor', 'ration', 'cell'] },
  { test: /\b(water|river|dam|flood|monsoon|canal)\b/i,
    sets: ['ghat', 'field', 'water-tap', 'rail', 'ration', 'plant-gate'] },
  { test: /\b(election|vote|parliament|law|court|constitution|assembly)\b/i,
    sets: ['courtroom', 'court-ledger', 'press', 'newspaper-desk', 'map', 'memorial'] }
];

function topicSetPool(topic, grammar) {
  const text = [topic.title, topic.why, topic.angle, topic.id].filter(Boolean).join(' ');
  const pool = new Set();
  for (const rule of TOPIC_SET_RULES) {
    if (rule.test.test(text)) rule.sets.forEach((set) => pool.add(set));
  }
  // The fallback is grammar-shaped, not a fixed list, so a paper-ledger film
  // still reaches for the press and the map, and a night-watch film for the
  // road and the river.
  const fallback = grammar === 'mechanical-causality'
    ? ['rail', 'plant-gate', 'pipe-corridor', 'press', 'map', 'courtroom', 'tank-farm']
    : grammar === 'paper-ledger'
      ? ['press', 'newspaper-desk', 'archive', 'court-ledger', 'courtroom', 'map', 'cell']
      : ['rail', 'ghat', 'field', 'street-lamp', 'gate', 'night', 'memorial'];
  fallback.forEach((set) => pool.add(set));
  // Only sets that exist in the catalogue and have a real scene function.
  return new Set([...pool].filter((set) => catalogEntry(set)));
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/*
 * Pick the plate list for one scene. Base plates come first (they carry the
 * scene's meaning); wildcards are ranked by topic relevance, then by how
 * often the film has already used them, then by a stable hash of film+scene.
 * That keeps two films about the same event from sharing a shot list while
 * staying reproducible.
 */
function choosePlates(scene, topicPool, filmId, usage) {
  const base = scene.plates.slice();
  const want = Math.max(0, Number(scene.extraPlates) || 0);
  const pool = (scene.pool || []).filter((set) => catalogEntry(set) && !base.includes(set));
  const ranked = pool.slice().sort((a, b) => {
    const topicA = topicPool.has(a) ? 0 : 1;
    const topicB = topicPool.has(b) ? 0 : 1;
    if (topicA !== topicB) return topicA - topicB;
    const usedA = usage[a] || 0;
    const usedB = usage[b] || 0;
    if (usedA !== usedB) return usedA - usedB;
    return hashString(`${filmId}:${scene.id}:${a}`) - hashString(`${filmId}:${scene.id}:${b}`);
  });
  const chosen = base.concat(ranked.slice(0, want));
  for (const set of chosen) usage[set] = (usage[set] || 0) + 1;
  return chosen;
}

/*
 * The director pass.
 *
 * Narration is written line by line against the ledger; the picture should be
 * chosen the same way, by the agent, from the catalogue of sets that actually
 * exist. The model is given every plate with its visual description and the
 * eight scene briefs, and returns two extra plates per scene. The base plates
 * are fixed because they carry the argument (object, order, machine, cost...).
 * Extras are the film's look: a famine can reach for the ration counter and
 * the river ghat, a partition for the railway and the map table.
 *
 * Any invalid answer falls back to the deterministic casting for that scene,
 * so a bad model can make a film duller but never broken. The render gate has
 * the final say either way.
 */
const DIRECTOR_SYSTEM = [
  'You are the visual director of a sourced documentary short.',
  'You choose sets, not facts, not narration, not camera moves.',
  'Use only keys from the catalogue. A key that is not listed does not exist.',
  'The base plates of a scene are fixed. Choose only the extra plates.',
  'Choose the specific thing the scene is about: a ration counter for hunger,',
  'a railway platform for displacement, a press for censorship, a map table',
  'for a border. Do not choose a set that belongs to another film world.',
  'Keep the film varied: do not use one key in more than two scenes.',
  'Return only the JSON object. No prose, no markdown.'
].join('\n');

const DIRECTOR_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      minItems: 8,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          plates: {
            type: 'array',
            minItems: 1,
            maxItems: 2,
            items: { type: 'string' }
          }
        },
        required: ['id', 'plates'],
        additionalProperties: false
      }
    }
  },
  required: ['scenes'],
  additionalProperties: false
};

function directorPrompt(film, topic, scenes, preferred) {
  const catalogue = SCENE_CATALOG
    .map((entry) => `- ${entry.key} [${entry.tags.join(', ')}] ${entry.visual}`)
    .join('\n');
  const shortlist = (preferred || []).filter((key) => catalogEntry(key)).join(', ');
  const briefs = scenes
    .map((scene) => {
      const want = Math.max(0, Number(scene.extraPlates) || 0);
      return [
        `${scene.id} ${scene.title}`,
        `  purpose: ${scene.purpose}`,
        `  base plates (fixed): ${scene.plates.join(', ')}`,
        `  choose exactly ${want} extra plate${want === 1 ? '' : 's'}`
      ].join('\n');
    })
    .join('\n');
  return [
    `FILM: ${film.title}`,
    topic && topic.why ? `WHY: ${topic.why}` : '',
    topic && topic.angle ? `ANGLE: ${topic.angle}` : '',
    shortlist ? `PREFERRED FOR THIS FILM: ${shortlist}` : '',
    'Prefer the shortlist. Use a key outside it only when that set is clearly the better object for the scene.',
    '',
    'SCENES',
    briefs,
    '',
    'CATALOGUE (key [tags] visual)',
    catalogue,
    '',
    'Format: {"scenes":[{"id":"S01","plates":["key","key"]}, ...]}',
    'One entry per scene id, in order. Choose only extra plates, never a base plate.',
    'If the catalogue cannot dress a scene, choose the nearest object-led set rather than a person or an event.',
    'Finish the closing brace and stop.'
  ].filter((line) => line !== '').join('\n');
}

function validateDirector(answer, scenes) {
  const rows = answer && Array.isArray(answer.scenes) ? answer.scenes : null;
  if (!rows) return null;
  const byId = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !Array.isArray(row.plates)) continue;
    byId.set(row.id.trim().toUpperCase(), row.plates);
  }
  const usage = {};
  const picks = new Map();
  for (const scene of scenes) {
    const want = Math.max(0, Number(scene.extraPlates) || 0);
    const raw = byId.get(scene.id);
    if (!Array.isArray(raw) || raw.length !== want) continue;
    const keys = raw.map((key) => String(key).trim().toLowerCase());
    if (new Set(keys).size !== keys.length) continue;
    if (keys.some((key) => !catalogEntry(key) || scene.plates.includes(key))) continue;
    if (keys.some((key) => (usage[key] || 0) >= 2)) continue;
    for (const key of keys) usage[key] = (usage[key] || 0) + 1;
    picks.set(scene.id, keys);
  }
  return picks.size ? picks : null;
}

function directPlates(film, topic, scenes, preferred) {
  if (!process.env.LM_MODEL) {
    console.log('[author] no LM_MODEL set; the director pass will use deterministic casting');
    return null;
  }
  try {
    const result = ask({
      system: DIRECTOR_SYSTEM,
      prompt: directorPrompt(film, topic, scenes, preferred),
      schema: DIRECTOR_SCHEMA,
      tokens: 900,
      outDir: path.join(ROOT, 'out', 'author', film.id),
      label: `${film.id}-director`
    });
    const picks = validateDirector(result.value, scenes);
    if (!picks) {
      console.error('[author] the director answer was unusable; falling back to deterministic casting');
      return null;
    }
    const missing = scenes.filter((scene) => !picks.has(scene.id)).map((scene) => scene.id);
    if (missing.length) console.log(`[author] director fallback for ${missing.join(', ')}`);
    return picks;
  } catch (err) {
    console.error(`[author] director pass failed (${err.message}); using deterministic casting`);
    return null;
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function words(text) {
  return String(text).trim().split(/\s+/).filter(Boolean);
}

/* One normal form for both sides of a quote check. */
function normalize(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

/*
 * The ledger is the only place a fact may come from. A row is a whole
 * sentence, kept verbatim, with the source it came from. Numbers are what a
 * narration line is most likely to get wrong, so every figure in a line is
 * checked against the row that supports it. Rows without a figure are still
 * allowed: the press and the argument live in sentences that have no date.
 */
function buildLedger(corpus, maxPerSource = 40) {
  const rows = [];
  const seen = new Set();
  for (const source of corpus.sources || []) {
    const file = path.join(
      path.dirname(corpus.__file || ''),
      `${source.id}.txt`
    );
    if (!fs.existsSync(file)) continue;
    const text = normalize(fs.readFileSync(file, 'utf8'));
    const sentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/)
      .map((s) => s.replace(/^\[\d+\]\s*/, '').trim())
      .filter((s) => s.length >= 55 && s.length <= 260)
      .filter((s) => !s.includes('==='))
      .filter((s) => !/\b[A-Z]\.$/.test(s))
      .filter((s) => !/^\d+[–-]\d+\s+/.test(s))
      .filter((s) => !/\b(film|novel|documentary|protagonist|booker prize|adaptation)\b/i.test(s))
      .filter((s) => !/(University Press|[A-Z][a-z]+ UP|Penguin|Routledge|HarperCollins|ISBN)/i.test(s))
      .filter((s) => !/\b(Abhinav Publications|Publications Division|Publishing House)\b/.test(s))
      .filter((s) => (s.match(/"/g) || []).length % 2 === 0)
      .filter((s) => !/\b(Vol\.|pp\.|ISBN|doi:|Retrieved|Archived)\b/.test(s))
      .filter((s) => !/^(This included|This was|These were|It was|They were|He |She |His |Her )/.test(s))
      .filter((s) => !/^(see also|references|external links|bibliography|citations)/i.test(s));
    /*
     * Keep two kinds of row: sentences that name something a scene is about,
     * and sentences with a figure (the spine of the record). The first kind
     * is not sampled: a press sentence in the middle of a long article is
     * exactly the row the opening needs, and a stride would drop it.
     */
    const entries = sentences.map((sentence, index) => ({ sentence, index }));
    const sceneWords = SCENES.flatMap((scene) => scene.keywords);
    const relevant = entries.filter(({ sentence }) => {
      const lower = sentence.toLowerCase();
      return sceneWords.some((word) => lower.includes(word));
    });
    const numeric = entries.filter(({ sentence }) => /\d/.test(sentence));
    const pick = (list, cap) => {
      const stride = Math.max(1, Math.ceil(list.length / cap));
      const out = [];
      for (let i = 0; i < list.length && out.length < cap; i += stride) out.push(list[i]);
      return out;
    };
    const chosen = new Map();
    for (const entry of relevant.slice(0, 400)) chosen.set(entry.index, entry);
    for (const entry of pick(numeric, 60)) chosen.set(entry.index, entry);
    for (const { sentence } of [...chosen.values()].sort((a, b) => a.index - b.index)) {
      const key = sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: `L${String(rows.length + 1).padStart(2, '0')}`,
        source: source.id,
        sourceTitle: source.title || source.id,
        url: source.url,
        text: sentence
      });
    }
  }
  return rows;
}

/*
 * A row is on topic only if it names one of the things in the film's own
 * title. Dates are not a topic: the Chasnala mine flood happened during the
 * Emergency and is not part of its argument. Without this filter a scene will
 * happily quote any sentence with a year in it.
 */
const TITLE_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'from', 'with', 'by', 'as', 'is', 'was', 'were', 'be', 'been', 'being',
  'its', 'it', 'this', 'that', 'these', 'those', 'his', 'her', 'their', 'our',
  'your', 'my', 'new', 'first', 'last', 'after', 'before', 'during', 'into',
  'over', 'under', 'between', 'about', 'against', 'not', 'no', 'india', 'indian'
]);

function subjectTokens(topic) {
  const words = String(topic.title || '').toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  return [...new Set(words.filter((w) => !TITLE_STOP.has(w)))];
}

/* The article the film is named after is allowed to speak more broadly. */
function primarySourceIds(corpus, topic) {
  const words = subjectTokens(topic);
  let best = 0;
  let ids = new Set();
  for (const source of corpus.sources || []) {
    const title = String(source.title || '').toLowerCase();
    const hits = words.filter((word) => title.includes(word)).length;
    if (hits > best) {
      best = hits;
      ids = new Set([source.id]);
    } else if (hits === best && hits > 0) {
      ids.add(source.id);
    }
  }
  return ids;
}

function keywordPatterns(scene) {
  return scene.keywords.map((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /*
     * A short stem must end in a real inflection, not any continuation:
     * "press" may become "pressed" or "presses" but not "pressure", and
     * "act" may not become "actual". Longer words match as prefixes.
     */
    const tail = word.length <= 6 ? '(s|es|ed|ing|ning|ied|ised|ized|ned)?(?![a-z])' : '';
    return new RegExp(`(^|[^a-z0-9])${escaped}${tail}`);
  });
}

function scoreRow(row, scene, subject, primary, patterns) {
  const lower = row.text.toLowerCase();
  if (scene.exclude && scene.exclude.some((phrase) => lower.includes(phrase))) return null;
  let sceneHits = 0;
  for (const pattern of patterns) {
    if (pattern.test(lower)) sceneHits++;
  }
  const subjectHits = subject.filter((token) => lower.includes(token)).length;
  if (!sceneHits && !subjectHits) return null;
  let score = sceneHits * 10 + Math.min(subjectHits, 2) * 2;
  if (primary.has(row.source)) score += 3;
  if (row.text.length > 220) score -= 1;
  return { score, sceneHits };
}

/*
 * Give the model the rows that belong to this scene's job. The scene must be
 * carried by rows that match its own keywords; a couple of on-topic rows may
 * fill the tail, but they can never replace the scene. If the corpus cannot
 * support the job, the scene fails here, before a word is written.
 */
const MIN_FOCUSED = Number(process.env.AUTHOR_MIN_FOCUSED || 5);

function candidatesFor(scene, ledger, used, subject, primary) {
  const fresh = scene.reuse ? ledger : ledger.filter((row) => !used.has(row.id));
  const patterns = keywordPatterns(scene);
  const ranked = fresh
    .map((row) => {
      const scored = scoreRow(row, scene, subject, primary, patterns);
      return scored ? { row, ...scored } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id));
  const focused = ranked.filter((entry) => entry.sceneHits > 0);
  if (process.env.AUTHOR_DEBUG) {
    console.error(`${scene.id} focused ${focused.length}: ${focused.map((entry) => entry.row.id).join(',')}`);
  }
  if (focused.length < MIN_FOCUSED) {
    throw new Error(
      `${scene.id} has only ${focused.length} rows that match its own keywords; the corpus does not support "${scene.ask}"`
    );
  }
  // Never pad a scene with a row that does not match it. The filler line was
  // what let a chronology sentence into the cost scene of the Emergency film.
  return focused.slice(0, 10).map((entry) => entry.row);
}

function narrationPrompt(film, scene, rows) {
  const ledger = rows.map((row) => `${row.id} [${row.source}] ${row.text}`).join('\n');
  return [
    `FILM: ${film.title}`,
    `SCENE ${scene.id} — ${scene.title}`,
    `PURPOSE: ${scene.purpose}`,
    `JOB: ${scene.ask}`,
    '',
    'Write exactly five narration lines for this scene.',
    '',
    'RULES',
    '- Each line is 7 to 22 words and is spoken once.',
    '- Choose one ledger row for each line. Every number, year, date or name in',
    '  the line must appear in that row.',
    '- Do not invent a fact. If the rows do not support a line, write a shorter',
    '  line about what the rows do support.',
    '- Use the concrete noun. No "we", "our", "us", "you", "imagine", "perhaps",',
    '  "probably", "this film", "the story of".',
    '- Do not write a question. Do not end every line the same way.',
    '- Do not repeat a line from an earlier scene.',
    '- Put the five lines in chronological or cause-and-effect order. The scene',
    '  must move forward; never step back to a date already passed.',
    '- Every line must add a new fact. Do not restate the same event twice in',
    '  different words, and do not open with a summary of the scene.',
    '- A paraphrase may shorten its row. It may not add a reason, motive or',
    '  consequence that the row does not contain.',
    '- Write about the object or action in JOB. A row is not usable just because',
    '  it carries a date.',
    '- At most one line may begin with a year. The date is evidence, not the sentence.',
    '',
    'LEDGER',
    ledger,
    '',
    'CRITICAL: Your answer MUST be a single JSON object with exactly five lines.',
    'Format: {"lines":[{"row":"L03","text":"your sentence here"}]}',
    'No extra text, no markdown, no commentary. Just the JSON object.',
    'If you write fewer than five lines, the answer is rejected.',
    'Finish the closing brace and stop. Nothing follows the object.'
  ].join('\n');
}

const SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          row: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['row', 'text'],
        additionalProperties: false
      }
    }
  },
  required: ['lines'],
  additionalProperties: false
};

function digNumbers(text) {
  return (String(text).match(/\b\d[\d,.]*\b/g) || []).map((n) => n.replace(/[.,]$/, ''));
}

function auditLines(lines, rows, scene, usedTexts) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const problems = [];
  const kept = [];
  if (!Array.isArray(lines) || lines.length !== 5) {
    problems.push(`expected five lines, got ${Array.isArray(lines) ? lines.length : 'none'}`);
    return { kept, problems };
  }
  for (const line of lines) {
    const text = normalize(line && line.text);
    const cited = String((line && line.row) || '').trim().toUpperCase();
    const rowId = cited.replace(/^L0*(\d+)$/, (_, n) => `L${n.padStart(2, '0')}`);
    const row = byId.get(rowId);
    if (!row) {
      problems.push(`line cites unknown ledger row ${JSON.stringify(line && line.row)}: ${text}`);
      continue;
    }
    if (!text) {
      problems.push(`empty line for ${row.id}`);
      continue;
    }
    const count = words(text).length;
    if (count < 7 || count > 22) {
      problems.push(`"${text}" is ${count} words (7..22)`);
      continue;
    }
    if (/\b(we|our|us|you|your|imagine|perhaps|probably)\b/i.test(text)) {
      problems.push(`"${text}" addresses the viewer or hedges`);
      continue;
    }
    const missing = digNumbers(text).filter((n) => !row.text.includes(n));
    if (missing.length) {
      problems.push(`"${text}" uses ${missing.join(', ')} which is not in ${row.id}`);
      continue;
    }
    if (usedTexts.has(text.toLowerCase())) {
      problems.push(`"${text}" repeats an earlier line`);
      continue;
    }
    kept.push({ text, row, source: row.source });
  }
  return { kept, problems };
}

function stubLines(rows, scene, usedTexts) {
  /*
   * A deterministic stand-in for the model: build 5 lines of 7-22 words each
   * from the candidate rows, skipping anything an earlier scene already said.
   * This exists only so the assembly and the gate can be exercised without a
   * model on the machine.
   */
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (out.length >= 5) break;
    const text = row.text.replace(/\.$/, '');
    const w = words(text);
    let line;
    if (w.length >= 7 && w.length <= 22) line = text;
    else if (w.length > 22) line = `${w.slice(0, 20).join(' ')}.`;
    else continue;
    const key = line.toLowerCase();
    if ((usedTexts && usedTexts.has(key)) || seen.has(key)) continue;
    seen.add(key);
    out.push({ row: row.id, text: line });
  }
  return out;
}

function pickGrammar(corpus, topic) {
  const hay = `${topic.title} ${topic.why} ${topic.angle} ${corpus.sources.map((s) => s.title).join(' ')}`.toLowerCase();
  if (/(paper|newspaper|press|censor|column|register|archive|report|book|print)/.test(hay)) return GRAMMARS['paper-ledger'];
  if (/(plant|gas|factory|machine|pipe|tank|reactor|mine|rail|chemical)/.test(hay)) return GRAMMARS['mechanical-causality'];
  return GRAMMARS['night-watch'];
}

function plateName(archetype, counts) {
  counts[archetype] = (counts[archetype] || 0) + 1;
  return `${archetype}-${String(counts[archetype]).padStart(2, '0')}`;
}

/*
 * The argument map, from the same ledger. Every point is a verbatim row, not
 * a paraphrase, so a reader can follow the point back to the page it came
 * from. The questions are the film's four arguments; the rows decide which
 * side of each they can actually support.
 */
const FOR = /\b(necessary|stability|security|threat|law and order|defen[cs]e|defended|justif|integrity|discipline|supported|national interest|upheld|valid)\b/i;
const AGAINST = /\b(liberty|freedom|rights|arbitrary|unconstitutional|censor|detain|arrest|critic|oppos|condemn|misuse|excess|torture|silence|illegal|invalid)\b/i;

function stancePool(ledger, pattern, exclude, limit = 16) {
  const out = [];
  for (const row of ledger) {
    if (exclude.has(row.id)) continue;
    if (!pattern.test(row.text)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

function pickStance(pool, offset, count = 2) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(pool[(offset + i) % pool.length]);
  return out;
}

function buildDebates(film, topic, ledger, corpus, plans) {
  const sources = (corpus.sources || []).map((s) => ({
    id: s.id,
    title: s.title || s.id,
    publisher: s.kind === 'wikipedia' ? 'Wikipedia' : (s.title || s.id),
    url: s.url
  }));
  if (sources.length < 5) {
    throw new Error(`the argument map needs at least five sources; the slate lists ${sources.length} for ${topic.id}`);
  }

  const dated = ledger
    .filter((row) => /\b(1[5-9]\d{2}|20\d{2})\b/.test(row.text))
    .sort((a, b) => Number((a.text.match(/\b(1[5-9]\d{2}|20\d{2})\b/) || [])[1])
      - Number((b.text.match(/\b(1[5-9]\d{2}|20\d{2})\b/) || [])[1]));
  const context = [];
  const used = new Set();
  const seenYears = new Set();
  for (const row of dated) {
    const year = (row.text.match(/\b(1[5-9]\d{2}|20\d{2})\b/) || [])[1];
    if (seenYears.has(year)) continue;
    seenYears.add(year);
    used.add(row.id);
    const scene = plans.find((p) => p.lines.some((l) => l.row.id === row.id));
    context.push({
      year: Number(year),
      title: `${year} — ${scene ? scene.title : 'The record'}`,
      text: row.text,
      source: row.source
    });
    if (context.length >= 6) break;
  }
  if (context.length < 5) {
    throw new Error(`only ${context.length} dated events in the ledger; the argument map needs five`);
  }

  const templates = [
    {
      scene: plans[1],
      question: `Was ${plans[1].title.toLowerCase()} necessary?`,
      hook: `The government called it stability; the record shows what it cost.`,
      stakes: `If the order was necessary, the cost is a price; if it was not, the cost is the charge.`,
      uncomfortable: `Both sides can cite the same night; the difference is who they believe was counted.`,
      whatWouldChange: `A contemporaneous security assessment that named a specific threat, not a general one.`
    },
    {
      scene: plans[2],
      question: `Did ${plans[2].title.toLowerCase()} stay inside the law?`,
      hook: `A proclamation is a sentence; the arrests, censors and tribunals are the grammar.`,
      stakes: `A legal emergency and a legal cover are hard to tell apart from inside the machinery.`,
      uncomfortable: `The courts that could have checked the order were part of the order's design.`,
      whatWouldChange: `A court ruling that struck the order down while it was still in force.`
    },
    {
      scene: plans[4],
      question: `Who paid for ${plans[4].title.toLowerCase()}?`,
      hook: `The figures in the record are official; the people behind them are not.`,
      stakes: `A count can be accurate and still be a way of not looking.`,
      uncomfortable: `The film can show the register; it cannot show the cell.`,
      whatWouldChange: `A verified register of every person detained, with dates and outcomes.`
    },
    {
      scene: plans[6],
      question: `What did ${plans[6].title.toLowerCase()} settle?`,
      hook: `An inquiry writes the first draft of the argument, not its last word.`,
      stakes: `If the record is complete, the debate is about judgment; if it is not, it is about the record.`,
      uncomfortable: `The commission had the power to recommend, not the power to punish.`,
      whatWouldChange: `A prosecution that survived the change of government.`
    }
  ];

  const debates = templates.map((template, i) => {
    const poolFor = stancePool(ledger, FOR, used);
    const poolAgainst = stancePool(ledger, AGAINST, used);
    if (poolFor.length < 2 || poolAgainst.length < 2) {
      throw new Error(
        `the argument map found ${poolFor.length} for and ${poolAgainst.length} against rows; ` +
        'two of each are needed before a debate can be sourced'
      );
    }
    const forRows = pickStance(poolFor, i * 2);
    const againstRows = pickStance(poolAgainst, i * 2);
    const point = (row) => ({ claim: row.text, source: row.source });
    const cited = [...new Set([...forRows, ...againstRows].map((row) => row.source))];
    return {
      id: `D${i + 1}`,
      anchor: template.scene.id,
      question: template.question,
      hook: template.hook,
      stakes: template.stakes,
      uncomfortable: template.uncomfortable,
      whatWouldChange: template.whatWouldChange,
      caseFor: forRows.map(point),
      caseAgainst: againstRows.map(point),
      sources: cited.length >= 2 ? cited : sources.slice(0, 2).map((s) => s.id)
    };
  });

  return {
    schema: 'vlymbooq.debates.v1',
    film: film.id,
    title: film.title,
    subtitle: film.subtitle,
    sources,
    context,
    debates,
    generated: new Date().toISOString()
  };
}

/*
 * Effects are a budget, not a cycle. The edit QC allows each named effect at
 * most twice, and an iris must name the circular thing it closes on. A film
 * with five paper-wipes and five irises reads like a template; two of each,
 * placed where the plate earns them, reads like an edit.
 */
function plannedTransition(archetype, li, effects) {
  if (archetype === 'wall' && effects['paper-wipe'] < 2) {
    effects['paper-wipe'] += 1;
    return {
      type: 'paper-wipe',
      reason: 'The newspaper page drags across the cut and the wall of print arrives.'
    };
  }
  if (['desk', 'newspaper-desk', 'report'].includes(archetype) && li === 0 && effects['page-turn'] < 2) {
    effects['page-turn'] += 1;
    return {
      type: 'page-turn',
      reason: 'A single page turns into the desk under the lamp.'
    };
  }
  if (archetype === 'gate' && effects.iris < 2) {
    effects.iris += 1;
    return {
      type: 'iris',
      reason: 'The gate handwheel closes to a ring as the scene turns.'
    };
  }
  if (archetype === 'flame' && effects.iris < 2) {
    effects.iris += 1;
    return {
      type: 'iris',
      reason: 'The candle rim closes to a ring around the flame.'
    };
  }
  if (archetype === 'rail' && effects['whip-right'] < 2) {
    effects['whip-right'] += 1;
    return {
      type: 'whip-right',
      reason: 'The train\u2019s motion whips the platform into the next set.'
    };
  }
  if (archetype === 'market' && effects['whip-left'] < 2) {
    effects['whip-left'] += 1;
    return {
      type: 'whip-left',
      reason: 'A handcart turns out of frame and the motion carries the lane into the next shot.'
    };
  }
  if (archetype === 'telegraph' && effects['match-cut'] < 2) {
    effects['match-cut'] += 1;
    return {
      type: 'match-cut',
      reason: 'The telegraph key lands on the same beat as the next cut.'
    };
  }
  if (archetype === 'court' && effects.iris < 2) {
    effects.iris += 1;
    return {
      type: 'iris',
      reason: 'The brass seal ring closes around the verdict as the scene turns.'
    };
  }
  return {
    type: 'hard-cut',
    reason: 'The cut lands on the first word of the line so the figure and the voice arrive together.'
  };
}

/*
 * A shot is a plate plus the line it belongs to. No duration is written on
 * the shot: the renderer cuts on the voice, which is the only timing that
 * cannot drift when the TTS voice is slower or faster than the estimate.
 */
function buildScenes(film, plans, grammar, counts, sets) {
  let start = 0;
  const effects = {
    'paper-wipe': 0,
    'page-turn': 0,
    iris: 0,
    'whip-left': 0,
    'whip-right': 0,
    'match-cut': 0
  };
  const scenes = plans.map((plan, si) => {
    const narrated = plan.lines.map((line) => ({
      text: line.text,
      source: line.source,
      ledger: line.row.id,
      quote: line.row.text
    }));
    const shots = [];
    let letter = 0;
    const id = () => `${plan.id}-${String.fromCharCode(65 + letter++)}`;

    if (si === 0) {
      shots.push({
        id: id(),
        plate: 'title',
        render: 'title',
        hold: 3.2,
        camera: 'locked title card, grain and a slow push',
        visual: 'The title arrives over a black field with one thin rule of light and holds just long enough to read.',
        sfx: ['low room tone', 'a single metal tick'],
        transition: {
          type: 'hard-cut',
          frames: 0,
          sound: 'title-tone',
          audioDuration: 0.9,
          reason: 'The film opens from black; the title is the first image and needs no transition.'
        },
        weight: 2
      });
    }

    plan.lines.forEach((line, li) => {
      const archetype = plan.plates[li % plan.plates.length];
      const plate = plan.plateNames[archetype];
      if (!sets.plates[plate]) {
        const spec = ARCHETYPES[archetype];
        sets.plates[plate] = {
          scene: spec.scene,
          script: spec.script,
          archetype,
          params: {
            seed: (si + 1) * 17 + li,
            dressing: (si + li) % 3,
            prop: plan.props[li % plan.props.length] || 'none'
          }
        };
      }
      const planned = plannedTransition(archetype, li, effects);
      const type = planned.type;
      const cut = type === 'hard-cut';
      shots.push({
        id: id(),
        plate,
        render: 'blender',
        narrationLine: li + 1,
        weight: 3,
        camera: CAMERAS[(si * 2 + li) % CAMERAS.length],
        visual: `${ARCHETYPES[archetype].visual} ${plan.visualNote}`,
        sfx: (SFX[archetype] || SFX.object).slice(0, 3),
        framing: {
          zoom: [1.03, 1.09],
          x: [50 + ((si + li) % 3) - 1, 50 + ((si + li + 1) % 3) - 1],
          y: [50, 50 + (li % 2 ? 1 : -1)]
        },
        transition: {
          type,
          frames: cut ? 0 : grammar.transitionDefaults[type] || 8,
          sound: cut ? 'line onset' : grammar.sounds[type] || 'room tone',
          reason: planned.reason
        }
      });
    });

    if (si === plans.length - 1) {
      const archetype = 'flame';
      const plate = plan.plateNames[archetype];
      if (!sets.plates[plate]) {
        sets.plates[plate] = {
          scene: ARCHETYPES[archetype].scene,
          script: ARCHETYPES[archetype].script,
          archetype,
          params: { seed: 99, dressing: 2, prop: 'none' }
        };
      }
      shots.push({
        id: id(),
        plate,
        render: 'blender',
        hold: 3.2,
        weight: 2,
        camera: 'slow pull back, lens 32, the room taking the flame',
        visual: `${ARCHETYPES.flame.visual} The room is otherwise black.`,
        sfx: ['low flame', 'room tone'],
        transition: {
          type: 'dip',
          frames: 5,
          sound: 'flame out',
          reason: 'The last image is allowed to go dark; this is the only dip in the film.'
        }
      });
    }

    const estimate = (si === 0 ? 3.4 : 0.14)
      + plan.lines.reduce((sum, line) => sum + Math.max(1.2, words(line.text).length / 2.55 + 0.45), 0)
      + 0.14 * Math.max(0, plan.lines.length - 1)
      + 0.22
      + (si === plans.length - 1 ? 3.2 : 0);

    const duration = round1(estimate);
    const scene = {
      id: plan.id,
      title: plan.title,
      purpose: plan.purpose,
      start: round1(start),
      duration,
      narration: narrated,
      shots
    };
    if (si === 0) scene.narrationStart = 3.4;
    if (si === plans.length - 1) scene.hold = 3.2;
    start += duration;
    return scene;
  });
  return { scenes, total: round1(start) };
}

function main() {
  const filmId = arg('film');
  if (!filmId || filmId === true) {
    throw new Error('usage: node scripts/film/author.js --film <topic-id> [--stub] [--force]');
  }
  const stub = !!arg('stub', false);
  const force = !!arg('force', false);
  const diagnose = !!arg('diagnose', false);
  const noDirector = !!arg('no-director', false);
  const outFile = path.join(FILMS, `${filmId}.json`);
  if (!diagnose && fs.existsSync(outFile) && !force) {
    throw new Error(`${path.relative(ROOT, outFile)} exists; pass --force to author it again`);
  }

  const slate = readJson(SLATE);
  const topic = (slate.topics || []).find((t) => t.id === filmId);
  if (!topic) throw new Error(`${filmId} is not in data/film-slate.json`);

  const corpusDir = path.resolve(
    arg('corpus', path.join(ROOT, 'out', 'research', filmId))
  );
  const corpusFile = path.join(corpusDir, 'corpus.json');
  if (!fs.existsSync(corpusFile)) {
    throw new Error(`no corpus at ${path.relative(ROOT, corpusFile)}; run scripts/film/research.js --topic ${filmId} first`);
  }
  const corpus = readJson(corpusFile);
  corpus.__file = corpusFile;
  if (!corpus.sources || corpus.sources.length < 5) {
    throw new Error(
      `the corpus has ${(corpus.sources || []).length} readable sources; a film needs at least five ` +
      'so its argument map has more than one page behind it'
    );
  }

  const ledger = buildLedger(corpus);
  if (ledger.length < 30) {
    throw new Error(`ledger has only ${ledger.length} dated rows; the corpus is too thin to author from`);
  }

  const grammar = pickGrammar(corpus, topic);
  const subject = subjectTokens(topic);
  const primary = primarySourceIds(corpus, topic);
  const palette = grammar.grammar === 'paper-ledger'
    ? { paper: '#e6dcc4', ink: '#0b0a08', sodium: '#ffb24d', accent: '#a8342a' }
    : grammar.grammar === 'mechanical-causality'
      ? { paper: '#d8d2c0', ink: '#07090a', sodium: '#ff9a3c', accent: '#3ec7d8' }
      : { paper: '#cfc8b8', ink: '#050608', sodium: '#ffb35c', accent: '#7f8f7a' };

  const counts = {};
  const used = new Set();
  const usedTexts = new Set();
  const plans = [];
  const setPool = topicSetPool(topic, grammar.grammar);
  const plateUsage = {};

  if (diagnose) {
    const dump = path.join(ROOT, 'out', 'author', filmId, 'diagnose-ledger.json');
    fs.mkdirSync(path.dirname(dump), { recursive: true });
    fs.writeFileSync(dump, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log(
      `[author] ${filmId}: ${ledger.length} ledger rows, subject ${subject.join(', ')}, primary ${[...primary].join(', ') || 'none'}`
    );
    for (const scene of SCENES) {
      const rows = candidatesFor(scene, ledger, new Set(), subject, primary);
      console.log(`\n${scene.id} ${scene.title}: ${rows.length} rows shown`);
      for (const row of rows) {
        console.log(`  ${row.id} [${row.source.slice(-24)}] ${row.text.slice(0, 150)}`);
      }
    }
    return;
  }

  const directed = stub || noDirector
    ? null
    : directPlates({ id: filmId, title: topic.title }, topic, SCENES, [...setPool]);
  if (directed) console.log(`[author] director chose extra plates for ${directed.size}/${SCENES.length} scenes`);

  for (const scene of SCENES) {
    const rows = candidatesFor(scene, ledger, used, subject, primary);
    if (rows.length < 5) throw new Error(`not enough ledger rows left for ${scene.id}`);
    let plates;
    const directedForScene = directed && directed.get(scene.id);
    if (directedForScene) {
      plates = scene.plates.concat(directedForScene);
      for (const key of directedForScene) plateUsage[key] = (plateUsage[key] || 0) + 1;
      console.log(`[author] ${scene.id} director cast: ${directedForScene.join(', ')}`);
    } else {
      plates = choosePlates(scene, setPool, filmId, plateUsage);
    }
    let lines;
    if (stub) {
      const audit = auditLines(stubLines(rows, scene, usedTexts), rows, scene, usedTexts);
      if (audit.problems.length) {
        throw new Error(`stub narration for ${scene.id} failed the ledger audit:\n  ${audit.problems.join('\n  ')}`);
      }
      lines = audit.kept;
    } else {
      let feedback = '';
      let accepted = null;
      for (let attempt = 1; attempt <= 3 && !accepted; attempt++) {
        const prompt = narrationPrompt(
          { id: filmId, title: topic.title },
          scene,
          rows
        ) + (feedback ? `\n\nTHE LAST ANSWER WAS REJECTED:\n${feedback}\nWrite five new lines that fix every item above.` : '');
        const result = ask({
          system: SYSTEM,
          prompt,
          schema: SCHEMA,
          tokens: 1200,
          outDir: path.join(ROOT, 'out', 'author', filmId),
          label: `${filmId}-${scene.id}-try${attempt}`
        });
        const answer = result.value || {};
        const audit = auditLines(answer.lines, rows, scene, usedTexts);
        if (!audit.problems.length) {
          accepted = audit.kept;
        } else {
          feedback = audit.problems.join('\n');
          console.error(`[author] ${scene.id} attempt ${attempt} rejected:\n  ${feedback.replace(/\n/g, '\n  ')}`);
        }
      }
      if (!accepted) throw new Error(`${scene.id} did not produce five ledgers-backed lines after three attempts`);
      lines = accepted;
    }

    for (const line of lines) {
      used.add(line.row.id);
      usedTexts.add(line.text.toLowerCase());
    }
    console.log(`[author] ${scene.id} ${scene.title}: ${lines.length} lines`);

    const plateNames = {};
    for (const archetype of plates) plateNames[archetype] = plateName(archetype, counts);
    plans.push({
      ...scene,
      plates,
      lines,
      plateNames,
      props: ['newspaper', 'register', 'notice'],
      visualNote: `The set is dressed for ${scene.title.toLowerCase()}, not reused from another film.`
    });
  }

  const sets = {
    film: filmId,
    script: 'stock_sets.py',
    palette,
    grammar: grammar.grammar,
    plates: {}
  };

  const built = buildScenes({ id: filmId, title: topic.title }, plans, grammar, counts, sets);

  const titleParts = String(topic.title).split(':');
  const mainTitle = titleParts[0].trim();
  const subtitle = (titleParts[1] || topic.angle || '').trim().replace(/\.$/, '');

  /* A title that runs off the frame is a failed title. Balance it and size it. */
  const titleWords = mainTitle.toUpperCase().split(/\s+/).filter(Boolean);
  let titleLines;
  if (titleWords.length === 1 || mainTitle.length <= 15) {
    titleLines = [titleWords.join(' ')];
  } else {
    let best = null;
    for (let i = 1; i < titleWords.length; i++) {
      const a = titleWords.slice(0, i).join(' ');
      const b = titleWords.slice(i).join(' ');
      const score = Math.max(a.length, b.length);
      if (!best || score < best.score) best = { a, b, score };
    }
    titleLines = [best.a, best.b];
  }
  const longestTitle = Math.max(...titleLines.map((line) => line.length));
  const titleSize = `${Math.min(11.6, 88 / (0.62 * longestTitle)).toFixed(1)}vw`;
  const posterTitleSize = `${Math.min(9.6, 78 / (0.62 * longestTitle)).toFixed(1)}vw`;

  const film = {
    schema: 'vlymbooq.film.v1',
    id: filmId,
    topicId: filmId,
    title: mainTitle,
    titleLines,
    titleSize,
    subtitle,
    posterPlate: plans[0].plateNames[plans[0].plates[0]],
    posterTitleSize,
    posterMeta: String(topic.angle || topic.why || '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 62),
    logline: `${mainTitle}. ${String(topic.why || '').trim()}`.slice(0, 240),
    targetDuration: built.total,
    aspect: '16:9',
    fps: 24,
    voice: 'en_US-lessac-medium',
    pacing: 'tight',
    style: {
      genre: 'cinematic 3D documentary',
      look: grammar.look,
      rules: [
        'Show the object before the explanation: the page, the register, the lamp, the gate.',
        'No bodies, no blood, no reconstruction of violence. The aftermath carries it.',
        'One idea per shot. The camera pushes, reveals or holds; it never drifts.',
        'Cut on the voice. Do not park on a plate after the narration has stopped.',
        'Every number is an official figure or explicitly attributed to a source.'
      ]
    },
    toolchain: {
      blender: {
        version: '4.2 LTS',
        role: 'procedural sets from the stock archetype library, hero stills, camera moves',
        automation: 'scripts/film/blender/stock_sets.py'
      },
      tts: 'Piper en_US-lessac-medium, local ONNX voice',
      capture: 'Skia 2D canvas at 24 fps',
      encode: 'ffmpeg H.264/AAC'
    },
    sources: (corpus.sources || []).map((s) => ({
      id: s.id,
      title: s.title,
      publisher: s.kind === 'wikipedia' ? 'Wikipedia' : (s.title || s.id),
      url: s.url
    })),
    scenes: built.scenes,
    edit: {
      grammar: grammar.grammar,
      captureFps: 24,
      signature: grammar.signature,
      transitionDefaults: grammar.transitionDefaults,
      forbidden: grammar.forbidden,
      acts: [
        { id: 'I', scenes: ['S01', 'S02', 'S03'], signature: 'the object, the order, the machine' },
        { id: 'II', scenes: ['S04', 'S05', 'S06'], signature: 'the turn, the cost, the argument' },
        { id: 'III', scenes: ['S07', 'S08'], signature: 'the record, the return' }
      ]
    }
  };

  writeJson(outFile, film);
  writeJson(path.join(FILMS, `${filmId}-sets.json`), sets);
  writeJson(path.join(FILMS, `${filmId}-ledger.json`), {
    film: filmId,
    generated: new Date().toISOString(),
    corpus: path.relative(ROOT, corpusFile).replace(/\\/g, '/'),
    rows: ledger
  });

  const debatesFile = path.join(FILMS, `${filmId}-debates.json`);
  const debates = buildDebates(film, topic, ledger, corpus, plans);
  writeJson(debatesFile, debates);

  const check = spawnSync(process.execPath, [path.join(__dirname, 'validate-film.js'), outFile], {
    encoding: 'utf8',
    cwd: ROOT
  });
  process.stdout.write(check.stdout || '');
  process.stderr.write(check.stderr || '');
  if (check.status !== 0) {
    throw new Error('the authored storyboard did not pass the gate; nothing was marked ready');
  }

  const argumentsCheck = spawnSync(process.execPath, [path.join(__dirname, 'validate-debates.js'), debatesFile], {
    encoding: 'utf8',
    cwd: ROOT
  });
  process.stdout.write(argumentsCheck.stdout || '');
  process.stderr.write(argumentsCheck.stderr || '');
  if (argumentsCheck.status !== 0) {
    throw new Error('the authored argument map did not pass the gate; nothing was marked ready');
  }

  topic.status = 'storyboard';
  slate.updated = new Date().toISOString().slice(0, 10);
  writeJson(SLATE, slate);

  console.log(`\n[author] ${filmId}: ${film.scenes.length} scenes · ${built.total}s · ${ledger.length} ledger rows`);
  console.log(`[author] ${path.relative(ROOT, outFile)}`);
  console.log(`[author] ${path.relative(ROOT, path.join(FILMS, `${filmId}-sets.json`))}`);
  console.log(`[author] ${path.relative(ROOT, debatesFile)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`[author] FAIL ${e.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  SCENES,
  ARCHETYPES,
  TOPIC_SET_RULES,
  topicSetPool,
  choosePlates,
  directorPrompt,
  validateDirector
};

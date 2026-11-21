#!/usr/bin/env node
/*
 * The scene catalogue the authoring agent chooses from.
 *
 * This file is data, not a storyboard. Every entry is a real procedural set
 * that already exists in one of the Blender scene files, so a film can borrow
 * the prison gate from the Salt March set, the map table from the stock bank,
 * or the archive from the Bhopal set without copying Python. The authoring
 * agent picks the plates per scene; render-plates.js routes each plate to the
 * script that owns it.
 *
 * Keys are the authoring vocabulary (ARCHETYPES). `scene` is the function key
 * inside `script`. `tags` are for the director: topic, mood and subject words.
 * Descriptions are deliberately object-led; a plate shows a thing and a light,
 * never a person being harmed.
 */
'use strict';

const SCENE_CATALOG = [
  // ---------------------------------------------------------------------
  // stock archetypes: the default backlot
  // ---------------------------------------------------------------------
  {
    key: 'wall',
    script: 'stock_sets.py',
    scene: 'wall_surface',
    tags: ['paper', 'news', 'notice', 'censor', 'record', 'interior', 'paper-ledger'],
    visual: 'A wall of pasted paper in raking light: edges lifting, ruling lines, one sheet missing from the run.'
  },
  {
    key: 'desk',
    script: 'stock_sets.py',
    scene: 'paper_desk',
    tags: ['document', 'ledger', 'writing', 'record', 'interior', 'paper-ledger'],
    visual: 'A desk under a low lamp: a spread page, a pen, a glass of water, the rest of the room out of focus.'
  },
  {
    key: 'room',
    script: 'stock_sets.py',
    scene: 'room_interior',
    tags: ['interior', 'decision', 'meeting', 'quiet', 'room'],
    visual: 'A bare room with one chair and one lamp; the light stops at the table and the corners stay black.'
  },
  {
    key: 'corridor',
    script: 'stock_sets.py',
    scene: 'corridor',
    tags: ['institution', 'prison', 'hospital', 'power', 'interior', 'night'],
    visual: 'A concrete corridor receding into darkness, doors on one side, a line of light under the last one.'
  },
  {
    key: 'night',
    script: 'stock_sets.py',
    scene: 'exterior_night',
    tags: ['street', 'exterior', 'night', 'city', 'rain', 'curfew'],
    visual: 'A street at night: wet stone, one sodium lamp, shuttered fronts, no people in the pool of light.'
  },
  {
    key: 'gate',
    script: 'stock_sets.py',
    scene: 'gate',
    tags: ['prison', 'border', 'institution', 'barrier', 'exterior', 'night'],
    visual: 'A heavy gate and a wall in the rain, the frame filling with bars as the camera comes closer.'
  },
  {
    key: 'object',
    script: 'stock_sets.py',
    scene: 'plinth_object',
    tags: ['object', 'evidence', 'relic', 'close-up', 'interior'],
    visual: 'One object on a dark plinth, lit from the side, its shadow longer than the object itself.'
  },
  {
    key: 'flame',
    script: 'stock_sets.py',
    scene: 'flame_source',
    tags: ['memory', 'memorial', 'vigil', 'flame', 'interior', 'ending'],
    visual: 'A single flame behind glass, the only warm thing in a cold room, reflected once in the black.'
  },
  {
    key: 'rail',
    script: 'stock_sets.py',
    scene: 'railway_platform',
    tags: ['railway', 'train', 'transport', 'partition', 'famine', 'journey', 'fog', 'exterior'],
    visual: 'A platform edge, two rails running into fog, a signal lamp and one abandoned trunk; the line is the only direction.'
  },
  {
    key: 'ghat',
    script: 'stock_sets.py',
    scene: 'river_ghat',
    tags: ['river', 'water', 'ghat', 'boat', 'famine', 'partition', 'exterior', 'dawn'],
    visual: 'Stone steps down to a wide river, a moored boat, one hanging lamp; the water takes the light and gives nothing back.'
  },
  {
    key: 'field',
    script: 'stock_sets.py',
    scene: 'field_dawn',
    tags: ['field', 'farm', 'village', 'famine', 'dawn', 'exterior', 'peasant'],
    visual: 'Furrows in cold dawn light, stubble and a fence line; the field is worked, the horizon is empty.'
  },
  {
    key: 'ration',
    script: 'stock_sets.py',
    scene: 'ration_queue',
    tags: ['ration', 'famine', 'queue', 'scale', 'food', 'shortage', 'interior'],
    visual: 'A ration counter behind wire mesh, sacks, a brass scale and a ledger; the queue is marked by posts and rope.'
  },
  {
    key: 'press',
    script: 'stock_sets.py',
    scene: 'press_room',
    tags: ['press', 'newspaper', 'censor', 'print', 'media', 'interior', 'machine'],
    visual: 'A letterpress in a dark room: a flywheel, ink rollers, stacked paper and a galley frame under one lamp.'
  },
  {
    key: 'map',
    script: 'stock_sets.py',
    scene: 'map_table',
    tags: ['map', 'border', 'partition', 'war', 'planning', 'interior', 'decision'],
    visual: 'A large map under a low lamp, grid lines, border marks, brass dividers and pins; the table is a decision surface.'
  },
  {
    key: 'cell',
    script: 'stock_sets.py',
    scene: 'jail_cell',
    tags: ['prison', 'detention', 'emergency', 'cell', 'interior', 'night'],
    visual: 'A cell seen from inside: a cot, a high barred window, a stone floor and the corridor light through the door bars.'
  },

  // ---------------------------------------------------------------------
  // Salt March sets: reusable as procession, salt, prison, crowd, hand
  // ---------------------------------------------------------------------
  {
    key: 'march',
    script: 'salt_scenes.py',
    scene: 'march',
    tags: ['march', 'crowd', 'procession', 'movement', 'protest', 'exterior', 'dawn'],
    visual: 'A column on a road at first light, walking away from the camera; the frame is the road, not the faces.'
  },
  {
    key: 'crystal',
    script: 'salt_scenes.py',
    scene: 'crystal',
    tags: ['salt', 'crystal', 'macro', 'object', 'evidence', 'close-up'],
    visual: 'Salt crystals in macro, the grain catching a hard side light like broken glass.'
  },
  {
    key: 'dandi',
    script: 'salt_scenes.py',
    scene: 'dandi',
    tags: ['hand', 'salt', 'shore', 'object', 'gesture', 'exterior', 'dawn'],
    visual: 'A hand lifting wet salt from the shore, the water and the grain in the same plane of focus.'
  },
  {
    key: 'dharasana',
    script: 'salt_scenes.py',
    scene: 'dharasana',
    tags: ['line', 'crowd', 'protest', 'witness', 'exterior', 'day'],
    visual: 'A line of people at a salt works seen from a distance, the ground and the waiting carrying the image.'
  },
  {
    key: 'prison',
    script: 'salt_scenes.py',
    scene: 'prison',
    tags: ['prison', 'gate', 'institution', 'exterior', 'night', 'detention'],
    visual: 'A prison gate in grey light, the wall long and the door small; the building does the talking.'
  },

  // ---------------------------------------------------------------------
  // Jallianwala Bagh sets: wall, gate, well, watch, memorial, report
  // ---------------------------------------------------------------------
  {
    key: 'notice',
    script: 'jallianwala_scenes.py',
    scene: 'notice',
    tags: ['notice', 'order', 'ban', 'paper', 'censor', 'interior'],
    visual: 'A printed notice pinned to a dark board, one corner lifting, the seal catching the lamp.'
  },
  {
    key: 'bagh-wall',
    script: 'jallianwala_scenes.py',
    scene: 'bagh-wall',
    tags: ['wall', 'brick', 'enclosure', 'memory', 'exterior', 'day'],
    visual: 'A high brick wall with a narrow lane of light; the wall is the architecture and the witness.'
  },
  {
    key: 'bagh-wall-empty',
    script: 'jallianwala_scenes.py',
    scene: 'bagh-wall-empty',
    tags: ['wall', 'brick', 'enclosure', 'aftermath', 'exterior', 'day'],
    visual: 'The same brick wall with the ground empty; the absence is the subject.'
  },
  {
    key: 'bagh-gate',
    script: 'jallianwala_scenes.py',
    scene: 'bagh-gate',
    tags: ['gate', 'entrance', 'enclosure', 'narrow', 'exterior', 'day'],
    visual: 'A narrow gate in a brick wall, the opening dark and the lane pressing in from both sides.'
  },
  {
    key: 'bagh-gate-empty',
    script: 'jallianwala_scenes.py',
    scene: 'bagh-gate-empty',
    tags: ['gate', 'entrance', 'empty', 'aftermath', 'exterior', 'day'],
    visual: 'The same narrow gate with nobody passing through; the frame holds on the threshold.'
  },
  {
    key: 'wall-scar',
    script: 'jallianwala_scenes.py',
    scene: 'wall-scar',
    tags: ['wall', 'scar', 'memory', 'evidence', 'close-up', 'interior'],
    visual: 'A wall scar in raking light, the plaster broken back to the brick in one place.'
  },
  {
    key: 'watch',
    script: 'jallianwala_scenes.py',
    scene: 'watch',
    tags: ['watch', 'clock', 'time', 'evidence', 'close-up', 'object'],
    visual: 'A pocket watch stopped at a fixed time on a dark surface, the chain coiled beside it.'
  },
  {
    key: 'well',
    script: 'jallianwala_scenes.py',
    scene: 'well',
    tags: ['well', 'water', 'enclosure', 'memory', 'exterior', 'day'],
    visual: 'A stone well inside a walled garden, the mouth black and the rim worn smooth.'
  },
  {
    key: 'report',
    script: 'jallianwala_scenes.py',
    scene: 'report',
    tags: ['report', 'inquiry', 'record', 'desk', 'paper', 'interior'],
    visual: 'A report open on a desk, the pages ruled and stamped, one lamp holding the centre.'
  },
  {
    key: 'lamp',
    script: 'jallianwala_scenes.py',
    scene: 'lamp',
    tags: ['lamp', 'light', 'night', 'interior', 'quiet', 'object'],
    visual: 'An oil lamp on a dark table, the flame small and the room falling away behind it.'
  },
  {
    key: 'memorial',
    script: 'jallianwala_scenes.py',
    scene: 'memorial',
    tags: ['memorial', 'memory', 'ending', 'stone', 'exterior', 'night'],
    visual: 'A memorial stone in a dark garden, one light on the inscription and the rest held in shadow.'
  },

  // ---------------------------------------------------------------------
  // Bhopal sets: machine, city, hospital, court, archive, memorial
  // ---------------------------------------------------------------------
  {
    key: 'plant-gate',
    script: 'bhopal_scenes.py',
    scene: 'plant-gate',
    tags: ['factory', 'plant', 'gate', 'industry', 'night', 'exterior', 'institution'],
    visual: 'A chemical plant gate at night, the nameboard dark and the flare stack behind it.'
  },
  {
    key: 'tank-farm',
    script: 'bhopal_scenes.py',
    scene: 'tank-farm',
    tags: ['factory', 'tank', 'industry', 'night', 'exterior', 'machine'],
    visual: 'A farm of storage tanks under sodium light, pipes running between them like a second road.'
  },
  {
    key: 'tank-610',
    script: 'bhopal_scenes.py',
    scene: 'tank-610',
    tags: ['factory', 'tank', 'industry', 'night', 'exterior', 'machine', 'evidence'],
    visual: 'One tank in close profile, its ladder and gauge board picked out by a cold work light.'
  },
  {
    key: 'gauge',
    script: 'bhopal_scenes.py',
    scene: 'gauge',
    tags: ['gauge', 'measure', 'machine', 'evidence', 'close-up', 'interior'],
    visual: 'A pressure gauge in macro, the needle past the red line, the glass holding a reflection.'
  },
  {
    key: 'valve',
    script: 'bhopal_scenes.py',
    scene: 'valve',
    tags: ['valve', 'machine', 'handwheel', 'industry', 'close-up', 'interior'],
    visual: 'A handwheel valve, the rim worn bright, the pipe behind it disappearing into the dark.'
  },
  {
    key: 'flare',
    script: 'bhopal_scenes.py',
    scene: 'flare',
    tags: ['flare', 'fire', 'machine', 'night', 'exterior', 'industry'],
    visual: 'A flare stack burning against the night, the flame the only vertical in the frame.'
  },
  {
    key: 'flare-cold',
    script: 'bhopal_scenes.py',
    scene: 'flare-cold',
    tags: ['flare', 'machine', 'night', 'exterior', 'aftermath', 'industry'],
    visual: 'The same flare stack unlit, the metal cold and the sky doing all the work.'
  },
  {
    key: 'control-panel',
    script: 'bhopal_scenes.py',
    scene: 'control-panel',
    tags: ['control', 'machine', 'panel', 'interior', 'night', 'industry'],
    visual: 'A control panel of switches and dials, one lamp on, the rest of the room out of sight.'
  },
  {
    key: 'pipe-corridor',
    script: 'bhopal_scenes.py',
    scene: 'pipe-corridor',
    tags: ['pipe', 'corridor', 'machine', 'industry', 'interior', 'night'],
    visual: 'A pipe corridor receding under a line of sodium lamps, the metal wet and the end dark.'
  },
  {
    key: 'company-sign',
    script: 'bhopal_scenes.py',
    scene: 'company-sign',
    tags: ['company', 'sign', 'institution', 'night', 'exterior', 'evidence'],
    visual: 'A company sign at the edge of a plant, the letters lit from below and the wall behind it blank.'
  },
  {
    key: 'city-rooftops',
    script: 'bhopal_scenes.py',
    scene: 'city-rooftops',
    tags: ['city', 'rooftops', 'night', 'exterior', 'scale', 'aftermath'],
    visual: 'A city of low rooftops at night, one water tank and a few windows, the sky holding most of the frame.'
  },
  {
    key: 'street-lamp',
    script: 'bhopal_scenes.py',
    scene: 'street-lamp',
    tags: ['street', 'lamp', 'night', 'exterior', 'city', 'rain'],
    visual: 'A single street lamp over wet ground, the pole and the pool of light doing all the composition.'
  },
  {
    key: 'hospital-corridor',
    script: 'bhopal_scenes.py',
    scene: 'hospital-corridor',
    tags: ['hospital', 'corridor', 'institution', 'interior', 'night', 'witness'],
    visual: 'A hospital corridor under fluorescent light, empty trolleys and a line of doors.'
  },
  {
    key: 'clinic-window',
    script: 'bhopal_scenes.py',
    scene: 'clinic-window',
    tags: ['clinic', 'window', 'hospital', 'interior', 'witness', 'quiet'],
    visual: 'A clinic window at night, the room dark and the corridor light leaking around the frame.'
  },
  {
    key: 'newspaper-desk',
    script: 'bhopal_scenes.py',
    scene: 'newspaper-desk',
    tags: ['newspaper', 'press', 'desk', 'record', 'interior', 'media'],
    visual: 'A newspaper desk with a page laid out and a lamp close to the paper, the newsroom dark beyond.'
  },
  {
    key: 'courtroom',
    script: 'bhopal_scenes.py',
    scene: 'courtroom',
    tags: ['court', 'law', 'institution', 'interior', 'witness', 'decision'],
    visual: 'A courtroom bench and witness box in dark wood, one green lamp and a file left open.'
  },
  {
    key: 'court-ledger',
    script: 'bhopal_scenes.py',
    scene: 'court-ledger',
    tags: ['court', 'ledger', 'record', 'evidence', 'interior', 'close-up'],
    visual: 'A court ledger open on a table, the page stamped and the pen still beside it.'
  },
  {
    key: 'water-tap',
    script: 'bhopal_scenes.py',
    scene: 'water-tap',
    tags: ['water', 'tap', 'evidence', 'close-up', 'night', 'aftermath'],
    visual: 'A standpipe dripping into a bucket at night, the water catching one thin line of light.'
  },
  {
    key: 'sample-jar',
    script: 'bhopal_scenes.py',
    scene: 'sample-jar',
    tags: ['sample', 'jar', 'evidence', 'science', 'close-up', 'interior'],
    visual: 'A glass sample jar on a dark surface, the liquid inside holding the light.'
  },
  {
    key: 'memorial-wall',
    script: 'bhopal_scenes.py',
    scene: 'memorial-wall',
    tags: ['memorial', 'wall', 'memory', 'ending', 'stone', 'exterior'],
    visual: 'A memorial wall of names in low light, the letters cut deep and the wall running out of frame.'
  },
  {
    key: 'memorial-flame',
    script: 'bhopal_scenes.py',
    scene: 'memorial-flame',
    tags: ['memorial', 'flame', 'memory', 'ending', 'night', 'object'],
    visual: 'A memorial flame under glass, the reflection doubling the light and the stone black around it.'
  },
  {
    key: 'archive',
    script: 'bhopal_scenes.py',
    scene: 'archive',
    tags: ['archive', 'files', 'record', 'institution', 'interior', 'evidence'],
    visual: 'A wall of files in a dark archive, one shelf lit and the rest receding into the dark.'
  },
  {
    key: 'siren',
    script: 'bhopal_scenes.py',
    scene: 'siren',
    tags: ['siren', 'alarm', 'machine', 'night', 'exterior', 'industry'],
    visual: 'A rooftop siren against a night sky, the horn pointed at the city and the pole wet.'
  },
  {
    key: 'clock',
    script: 'bhopal_scenes.py',
    scene: 'clock',
    tags: ['clock', 'time', 'evidence', 'close-up', 'interior', 'object'],
    visual: 'A wall clock in close-up, the hands fixed at the hour the record gives.'
  }
];

const BY_KEY = new Map(SCENE_CATALOG.map((entry) => [entry.key, entry]));

function catalogEntry(key) {
  return BY_KEY.get(key) || null;
}

module.exports = { SCENE_CATALOG, BY_KEY, catalogEntry };

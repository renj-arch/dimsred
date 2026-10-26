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
 *   4. Shots are cut on the voice by this script. The model never chooses a
 *      duration, a transition or a plate, so the render cannot drift.
 *
 * Usage:
 *   node scripts/film/author.js --film emergency-1975
 *   node scripts/film/author.js --film emergency-1975 --stub     # no model
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
    keywords: ['newspaper', 'column', 'register', 'notice', 'order', 'prison', 'delhi', '1975', '1977'],
    plates: ['wall', 'night']
  },
  {
    id: 'S02',
    title: 'The order',
    purpose: 'Show the decision, who made it, and the words it was made in.',
    ask: 'State what was proclaimed or decided, by whom, and on what date.',
    keywords: ['proclaimed', 'proclamation', 'declared', 'president', 'prime minister', 'government', 'emergency', 'order', 'announced'],
    plates: ['room', 'desk']
  },
  {
    id: 'S03',
    title: 'The machine',
    purpose: 'Explain how the decision reached ordinary life: the law, the police, the press.',
    ask: 'Describe the mechanism — the rule, the agency, the censor — that carried the order into daily life.',
    keywords: ['act', 'amendment', 'law', 'powers', 'arrest', 'detain', 'censorship', 'police', 'press', 'magistrate', 'warrant'],
    plates: ['wall', 'corridor']
  },
  {
    id: 'S04',
    title: 'The turn',
    purpose: 'Find the night or morning when it became undeniable.',
    ask: 'Show the moment the order became visible: the first arrests, the first blank page, the first raid.',
    keywords: ['night', 'morning', 'first', 'arrested', 'raid', 'searched', 'taken', 'midnight', 'dawn', 'thousands'],
    plates: ['night', 'desk', 'gate']
  },
  {
    id: 'S05',
    title: 'The cost',
    purpose: 'Count what it took, in the terms the record uses, without inventing a figure.',
    ask: 'Give the human count the sources actually report: prisoners, months, families, deaths.',
    keywords: ['prisoners', 'detained', 'arrested', 'died', 'killed', 'thousands', 'lakh', 'million', 'days', 'months', 'families'],
    plates: ['corridor', 'object']
  },
  {
    id: 'S06',
    title: 'The argument',
    purpose: 'Put the dispute on the table: who defended it, who fought it, and on what ground.',
    ask: 'State the argument for and against, in the words the record attributes to each side.',
    keywords: ['argued', 'said', 'critics', 'support', 'opposed', 'defended', 'court', 'commission', 'constitution', 'opposition'],
    plates: ['room', 'wall']
  },
  {
    id: 'S07',
    title: 'The record',
    purpose: 'Show what was written down, and what the writing left out.',
    ask: 'Describe the inquiry, report or testimony — what it found and what it refused to find.',
    keywords: ['report', 'found', 'evidence', 'inquiry', 'commission', 'testimony', 'records', 'reportedly', 'concluded', 'terms of reference'],
    plates: ['desk', 'wall']
  },
  {
    id: 'S08',
    title: 'The return',
    purpose: 'Return to the opening object, changed by everything between.',
    ask: 'Close on the object again: what the election, the release or the memorial did and did not settle.',
    keywords: ['election', 'released', 'restored', 'later', 'memorial', 'remains', 'since', 'anniversary', 'returned', 'verdict'],
    plates: ['object', 'flame']
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
  }
};

const CAMERAS = [
  'slow push, lens 35, eye height',
  'locked wide, lens 28, slightly below the object',
  'slow tilt up, lens 50, from the table edge',
  'slow lateral track, lens 40, parallax on the foreground',
  'locked macro, lens 85, breathing room on the left',
  'slow pull back, lens 32, the room taking the object'
];

const SFX = {
  wall: ['paper flex', 'distant traffic', 'room tone'],
  desk: ['lamp hum', 'pen on paper', 'a chair takes weight'],
  room: ['room tone', 'clock tick', 'a door settles'],
  corridor: ['wet footsteps', 'a bolt slides', 'fluorescent buzz'],
  night: ['night insects', 'a dog barks once', 'low city hum'],
  gate: ['rain on metal', 'chain link', 'a gate hinge'],
  object: ['room tone', 'a single metal tick', 'breath of cloth'],
  flame: ['low flame', 'glass tick', 'room tone']
};

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
 * sentence, kept verbatim, with the source it came from. Sentences without a
 * digit are dropped: dates and figures are what a narration line is most
 * likely to get wrong, so those are exactly the rows worth checking.
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
      .filter((s) => /\d/.test(s))
      .filter((s) => !/^(see also|references|external links|bibliography|citations)/i.test(s));
    let kept = 0;
    for (const sentence of sentences) {
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
      kept++;
      if (kept >= maxPerSource) break;
    }
  }
  return rows;
}

function scoreRow(row, scene) {
  const lower = row.text.toLowerCase();
  let score = 0;
  for (const word of scene.keywords) {
    if (lower.includes(word)) score += 2;
  }
  if (/\b(19|18|20)\d{2}\b/.test(row.text)) score += 1;
  if (/\b\d[\d,.]*\b/.test(row.text)) score += 1;
  if (row.text.length > 220) score -= 1;
  return score;
}

/*
 * Give the model the rows most likely to belong to this scene's job. It is
 * asked to choose one row per line, so the row text is the fact; the line is
 * only the sentence that carries it.
 */
function candidatesFor(scene, ledger, used) {
  const fresh = ledger.filter((row) => !used.has(row.id));
  const ranked = fresh
    .map((row) => ({ row, score: scoreRow(row, scene) }))
    .sort((a, b) => b.score - a.score || a.row.id.localeCompare(b.row.id));
  const chosen = ranked.filter((r) => r.score > 0).slice(0, 14).map((r) => r.row);
  for (const { row } of ranked) {
    if (chosen.length >= 14) break;
    if (!chosen.includes(row)) chosen.push(row);
  }
  return chosen.slice(0, 14);
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
    '',
    'LEDGER',
    ledger,
    '',
    'Return this JSON shape exactly:',
    '{"lines":[{"row":"L03","text":"one spoken sentence"}]}'
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
    const row = byId.get(String(line && line.row));
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

function stubLines(rows, scene) {
  /*
   * A deterministic stand-in for the model: take the first clause of five
   * candidate rows, long enough to time. This exists only so the assembly and
   * the gate can be exercised without a 40B model on the machine.
   */
  return rows.slice(0, 5).map((row) => {
    const clause = row.text.split(/[;:]/)[0].replace(/\.$/, '');
    const w = words(clause);
    return { row: row.id, text: w.length > 22 ? `${w.slice(0, 20).join(' ')}.` : `${clause}.` };
  });
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
 * A shot is a plate plus the line it belongs to. No duration is written on
 * the shot: the renderer cuts on the voice, which is the only timing that
 * cannot drift when the TTS voice is slower or faster than the estimate.
 */
function buildScenes(film, plans, grammar, counts, sets) {
  let start = 0;
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
          archetype,
          params: {
            seed: (si + 1) * 17 + li,
            dressing: (si + li) % 3,
            prop: plan.props[li % plan.props.length] || 'none'
          }
        };
      }
      const type = grammar.cycle[(si + li) % grammar.cycle.length];
      const cut = type === 'hard-cut' || type === 'match-cut';
      shots.push({
        id: id(),
        plate,
        render: 'blender',
        narrationLine: li + 1,
        weight: 3,
        camera: CAMERAS[(si * 2 + li) % CAMERAS.length],
        visual: `${ARCHETYPES[archetype].visual} ${plan.visualNote}`,
        sfx: SFX[archetype].slice(0, 3),
        framing: {
          zoom: [1.03, 1.09],
          x: [50 + ((si + li) % 3) - 1, 50 + ((si + li + 1) % 3) - 1],
          y: [50, 50 + (li % 2 ? 1 : -1)]
        },
        transition: {
          type,
          frames: cut ? 0 : grammar.transitionDefaults[type] || 8,
          sound: cut ? 'line onset' : grammar.sounds[type] || 'room tone',
          reason: cut
            ? 'The cut lands on the first word of the line so the figure and the voice arrive together.'
            : `The ${type} carries the eye from the last plate into this one without stopping the voice.`
        }
      });
    });

    if (si === plans.length - 1) {
      const archetype = 'flame';
      const plate = plan.plateNames[archetype];
      if (!sets.plates[plate]) {
        sets.plates[plate] = {
          scene: ARCHETYPES[archetype].scene,
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
          frames: 8,
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
  const outFile = path.join(FILMS, `${filmId}.json`);
  if (fs.existsSync(outFile) && !force) {
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
  if (!corpus.sources || corpus.sources.length < 2) {
    throw new Error('the corpus needs at least two readable sources before a film can be authored');
  }

  const ledger = buildLedger(corpus);
  if (ledger.length < 30) {
    throw new Error(`ledger has only ${ledger.length} dated rows; the corpus is too thin to author from`);
  }

  const grammar = pickGrammar(corpus, topic);
  const palette = grammar.grammar === 'paper-ledger'
    ? { paper: '#e6dcc4', ink: '#0b0a08', sodium: '#ffb24d', accent: '#a8342a' }
    : grammar.grammar === 'mechanical-causality'
      ? { paper: '#d8d2c0', ink: '#07090a', sodium: '#ff9a3c', accent: '#3ec7d8' }
      : { paper: '#cfc8b8', ink: '#050608', sodium: '#ffb35c', accent: '#7f8f7a' };

  const counts = {};
  const used = new Set();
  const usedTexts = new Set();
  const plans = [];

  for (const scene of SCENES) {
    const rows = candidatesFor(scene, ledger, used);
    if (rows.length < 5) throw new Error(`not enough ledger rows left for ${scene.id}`);
    let lines;
    if (stub) {
      const audit = auditLines(stubLines(rows, scene), rows, scene, usedTexts);
      if (audit.problems.length) {
        throw new Error(`stub narration for ${scene.id} failed the ledger audit:\n  ${audit.problems.join('\n  ')}`);
      }
      lines = audit.kept;
    } else {
      let feedback = '';
      let accepted = null;
      for (let attempt = 1; attempt <= 2 && !accepted; attempt++) {
        const prompt = narrationPrompt(
          { id: filmId, title: topic.title },
          scene,
          rows
        ) + (feedback ? `\n\nTHE LAST ANSWER WAS REJECTED:\n${feedback}\nWrite five new lines that fix every item above.` : '');
        const result = ask({
          system: SYSTEM,
          prompt,
          schema: SCHEMA,
          tokens: 900,
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
      if (!accepted) throw new Error(`${scene.id} did not produce five ledgers-backed lines after two attempts`);
      lines = accepted;
    }

    for (const line of lines) {
      used.add(line.row.id);
      usedTexts.add(line.text.toLowerCase());
    }
    console.log(`[author] ${scene.id} ${scene.title}: ${lines.length} lines`);

    const plateNames = {};
    for (const archetype of scene.plates) plateNames[archetype] = plateName(archetype, counts);
    plans.push({
      ...scene,
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

  const film = {
    schema: 'vlymbooq.film.v1',
    id: filmId,
    topicId: filmId,
    title: mainTitle,
    titleLines: [mainTitle.toUpperCase()],
    titleSize: '11.6vw',
    subtitle,
    posterPlate: plans[0].plateNames[plans[0].plates[0]],
    posterTitleSize: mainTitle.length > 16 ? '7.4vw' : '10.0vw',
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

  const check = spawnSync(process.execPath, [path.join(__dirname, 'validate-film.js'), outFile], {
    encoding: 'utf8',
    cwd: ROOT
  });
  process.stdout.write(check.stdout || '');
  process.stderr.write(check.stderr || '');
  if (check.status !== 0) {
    throw new Error('the authored storyboard did not pass the gate; nothing was marked ready');
  }

  topic.status = 'storyboard';
  slate.updated = new Date().toISOString().slice(0, 10);
  writeJson(SLATE, slate);

  console.log(`\n[author] ${filmId}: ${film.scenes.length} scenes · ${built.total}s · ${ledger.length} ledger rows`);
  console.log(`[author] ${path.relative(ROOT, outFile)}`);
  console.log(`[author] ${path.relative(ROOT, path.join(FILMS, `${filmId}-sets.json`))}`);
}

try {
  main();
} catch (e) {
  console.error(`[author] FAIL ${e.message}`);
  process.exitCode = 1;
}

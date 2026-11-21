#!/usr/bin/env node
/**
 * design-sets.js — turn a film's own narration into its 3D scene designs.
 *
 * The film pipeline had a hole here. `author.js` writes a storyboard whose
 * shots each carry a `visual` sentence ("a wall of pasted paper in raking
 * light, one sheet missing from the run"), but the renderer only ever got a
 * hand-maintained `-sets.json`. For the three bespoke films that file exists;
 * for every new topic there was none, so `render-plates.js` threw
 *
 *     No Blender scene set registered for film <id>
 *
 * and no new film could be rendered at all. `scene_compiler.py` already
 * supports invented sets (22 spaces x 41 props, per-film palette, dims, lens,
 * light); nothing was generating the spec it reads.
 *
 * This is that generator. For every Blender shot it reads the shot's own
 * narration and `visual` text and composes a scene from the compiler's
 * vocabulary:
 *
 *   1. If the storyboard carries an explicit `set` hint on the shot, that wins
 *      (the storyboard model is allowed to direct the set directly).
 *   2. Otherwise the text is scored against a keyword lexicon: which room is
 *      this, what is the hero object, what two props share the frame.
 *   3. Tone, lens and light are read from the camera line, then the scene is
 *      given its own dimensions and seed.
 *
 * No two shots in a film get the same space/hero/framing fingerprint: a repeat
 * is rotated to the next framing, then the next prop, then the next space.
 *
 * Deterministic, offline, no API key. The same storyboard always designs the
 * same sets, which is what makes a render reproducible.
 *
 * Usage:
 *   node scripts/film/design-sets.js --film chauri-chaura-1922
 *   node scripts/film/design-sets.js --film salt-march --dry-run
 *   node scripts/film/design-sets.js --film salt-march --out /tmp/sets.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');

/* ---------------------------------------------------------------------------
 * The compiler's vocabulary. These lists must stay in step with
 * scripts/film/blender/scene_kit_base.py (SPACES, EXPOSURE) and
 * scene_kit_props.py (PROPS). design-sets.test.js greps the Python and fails
 * if either side drifts.
 * ------------------------------------------------------------------------ */

const SPACES = [
  'hall', 'corridor', 'cell', 'court', 'open', 'street', 'warehouse', 'office',
  'studio', 'ward', 'deck', 'yard', 'vault', 'archive', 'lab', 'hangar',
  'platform', 'market', 'temple', 'tunnel', 'bunker', 'newsroom'
];

const PROPS = [
  'press', 'paper-rack', 'ink-slab', 'stamp', 'ink-pad', 'notes-stack',
  'ledger', 'desk', 'typewriter', 'telephone', 'radio-rack', 'microphone',
  'map-table', 'long-table', 'crates', 'barrel', 'tarp', 'sandbags', 'fence',
  'flag', 'podium', 'ranks', 'cot', 'bars', 'gavel', 'witness-box', 'scales',
  'plinth', 'wreath', 'candles', 'lathe', 'toolboard', 'workbench', 'valve',
  'clock', 'lamp-post', 'bed', 'ballot-box', 'oil-drum', 'pew', 'stage'
];

const TONES = ['dawn', 'day', 'dusk', 'night'];
const LIGHT_KEYS = ['warm', 'cool', 'hard', 'sodium'];
const FRAMINGS = 6;

const DIMS = { w: [7.0, 19.0], d: [5.0, 12.0], h: [3.2, 7.6] };

// Films whose sets were built by hand in a bespoke Blender script. Re-designing
// them from the narration would replace a deliberately art-directed look with a
// generated one, so they are only redesigned when someone asks with --force.
const BESPOKE = new Set(['salt-march', 'jallianwala-bagh', 'bhopal-gas-tragedy']);

/* ---------------------------------------------------------------------------
 * Lexicon. Ordered, first match wins; every entry names a real space or prop.
 * Words are chosen from how the narration actually talks, not from topic names.
 * ------------------------------------------------------------------------ */

const SPACE_WORDS = [
  ['court', /court\s*room|in court|trial|judge|verdict|hearing|lawyer|prosecut|acquit|sentenc|magistrat|tribunal|barrister|cross[- ]examin|jury/],
  ['cell', /prison\s*cell|in a cell|jail|arrest|detain|custody|handcuff|inmate|convict|lock[- ]?up|behind bars/],
  ['archive', /archive|record room|registrar|ledger room|file room|dossier|document room|paperwork|shelves of|library|catalogue|registry/],
  ['newsroom', /newsroom|news ?paper office|editor|journalis|press room|headline|reporter|byline|typesetter|front page/],
  ['warehouse', /factory|chemical plant|the plant|mill\b|warehouse|industrial|machinery|tank farm|pipeline|manufactur|boiler|workshop floor/],
  ['ward', /hospital|clinic|patient|doctor|nurse|ward\b|the injured|victims|gas victims|treatment|medical|ambulance|casualty/],
  ['lab', /laborator|\blab\b|experiment|lab test|sample|scientist|researcher|microscope|toxicolog|assay|analysis/],
  ['vault', /vault|strongroom|safe deposit|the safe|gold reserve|bullion|bank vault/],
  ['hangar', /aircraft|aeroplane|airplane|hangar|airfield|flight|runway|\bjet\b|bomber|squadron/],
  ['platform', /railway|train station|platform\b|railway track|locomotive|carriage|departure board/],
  ['deck', /ship|steamer|harbour|harbor|\bport\b|dock|voyage|vessel|ferry|\bsea\b/],
  ['tunnel', /tunnel|coal mine|mining|mine shaft|underground passage|smuggl|sewer/],
  ['bunker', /bunker|air[- ]?raid shelter|bomb shelter|war room|command post|fortified/],
  ['studio', /studio|broadcast|television|control room|map table|presenter|chart on the wall|news set/],
  ['temple', /temple|shrine|prayer|priest|worship|mosque|church|chapel|ritual|pilgrim|sacred/],
  ['market', /market|stall|vendor|bazaar|trade|price of|grain|merchant|shopfront/],
  ['street', /street|road|march|protest|rally|crowd|lane\b|town square|city|pavement|curfew|procession/],
  ['yard', /yard|compound|grounds|parade ground|enclosure|exercise yard|prison yard/],
  ['open', /field|plain|horizon|landscape|\bsea\b|river|valley|mountain|desert|open ground|skyline/],
  ['corridor', /corridor|hallway|passage way|passageway|institution|stairwell|cellblock|long hall/],
  ['office', /office|bureaucra|clerk|ministry|administrat|permit|licence|license|desk of|department|secretariat/],
  ['hall', /hall\b|chamber|assembly|parliament|gathering|auditorium|meeting room|public meeting|darbar/]
];

const PROP_WORDS = [
  ['ledger', /ledger|register|accounts|the dues|tax roll|balance sheet|receipt|entry in the book|ruled column/],
  ['notes-stack', /stack of paper|notes\b|dossier|report\b|evidence file|carbon copy|bundle of papers/],
  ['paper-rack', /wall of paper|pasted paper|notice|poster|leaflet|pamphlet|handbill|handwritten sheet|noticeboard/],
  ['press', /printing press|printing|typeset|headline|newsprint|print run|edition|the press/],
  ['ink-slab', /ink slab|printing block|movable type|ink roller/],
  ['stamp', /rubber stamp|official stamp|seal\b|decree|sanction order|approval mark|stamped/],
  ['ink-pad', /ink pad|stamp pad/],
  ['typewriter', /typewriter|typed page|manuscript|typing/],
  ['telephone', /telephone|phone call|switchboard|hotline|rings\b/],
  ['radio-rack', /radio\b|wireless|transmitter|signal set|frequency|antenna/],
  ['microphone', /microphone|press conference|press meet|speech at|address to|interview|broadcast/],
  ['map-table', /\bmap\b|route|border|territory|geograph|cartograph|front line/],
  ['long-table', /negotiat|committee table|conference|summit|round table|long table/],
  ['crates', /crate|cargo|supply drop|ration|consignment|wooden box/],
  ['barrel', /barrel|storage drum|solvent|chemical store/],
  ['tarp', /\btarp\b|canvas sheet|covered with cloth|shroud/],
  ['sandbags', /sandbag|barricade|trench|defence line|defense line/],
  ['fence', /fence|barbed wire|perimeter|border fence|razor wire/],
  ['flag', /flag|banner|tricolour|tricolor|standard of|ensign/],
  ['podium', /podium|lectern|soapbox/],
  ['ranks', /police line|constabulary|soldiers|troops|column of police|guards|ranks/],
  ['bars', /\bbars\b|cell door|iron gate|jail door|grille/],
  ['gavel', /gavel|judge s bench|the bench|ruling/],
  ['witness-box', /witness|testimony|sworn statement|deposition/],
  ['scales', /scales of justice|the scales|weighing|weighbridge/],
  ['plinth', /plinth|relic|artefact|artifact|monument|statue|display case/],
  ['wreath', /wreath|memorial|tribute|funeral|mourning|garland/],
  ['candles', /candle|vigil|prayer|grief|flame of/],
  ['lathe', /lathe|machining|turned on a machine/],
  ['toolboard', /toolboard|tools hang|spanner|wrench/],
  ['workbench', /workbench|workshop|smithy|repair bench|carpenter/],
  ['valve', /\bvalve\b|pipe|tank\b|gas leak|pressure gauge|flare|pipework|\bgauge\b/],
  ['clock', /\bclock\b|the time|deadline|\d+ ?(a\.?m\.?|p\.?m\.?)|minutes|the hour|curfew time/],
  ['lamp-post', /street ?lamp|sodium lamp|lamp post|lantern|single bulb/],
  ['bed', /\bbed\b|\bcot\b|sleep|ward bed/],
  ['ballot-box', /ballot|vote|election|polling|referendum/],
  ['oil-drum', /oil drum|drum of|waste drum/],
  ['pew', /\bpew\b|congregation|chapel|church service/],
  ['stage', /\bstage\b|theatre|theater|performance|curtain/],
  ['desk', /\bdesk\b|writing table|bureau/]
];

const PALETTES = {
  paper: { paper: '#f2ece0', ink: '#0b0d0e', accent: '#c2452d' },
  sodium: { paper: '#d8d2c4', ink: '#07090a', accent: '#c8862f' },
  cold: { paper: '#c9d2d6', ink: '#080d14', accent: '#3b7ea1' },
  earth: { paper: '#e6dcc6', ink: '#0d0b08', accent: '#7a5c2e' },
  signal: { paper: '#e9e4d6', ink: '#0a0b0d', accent: '#2f7d5b' }
};

/* ---------------------------------------------------------------------------
 * Small deterministic helpers.
 * ------------------------------------------------------------------------ */

function hash(s) {
  let h = 2166136261;
  const text = String(s);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

function prng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rand, lo, hi, places) {
  const v = lo + rand() * (hi - lo);
  return places ? Number(v.toFixed(places)) : Math.round(v);
}

function firstMatch(table, text) {
  for (const [name, re] of table) {
    if (re.test(text)) return name;
  }
  return null;
}

function matchesAll(table, text) {
  const out = [];
  for (const [name, re] of table) {
    if (re.test(text)) out.push(name);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Reading a shot.
 * ------------------------------------------------------------------------ */

function shotText(shot, scene) {
  const narration = (scene.narration || []).map((line) => line.text).join(' ');
  // What the shot itself shows outranks the surrounding scene context. Without
  // this split, a scene titled "The Hearing" turned every shot inside it into a
  // courtroom, including the press room two shots later.
  const primary = [shot.visual || '', shot.camera || '', shot.plate || ''].join(' ').toLowerCase();
  const secondary = [scene.title || '', scene.purpose || '', narration].join(' ').toLowerCase();
  return { primary, secondary, all: `${primary} ${secondary}` };
}

const SPACE_HERO = {
  hall: 'plinth', corridor: 'lamp-post', cell: 'bars', court: 'gavel', open: 'flag',
  street: 'lamp-post', warehouse: 'valve', office: 'desk', studio: 'map-table',
  ward: 'bed', deck: 'crates', yard: 'fence', vault: 'scales', archive: 'ledger',
  lab: 'notes-stack', hangar: 'crates', platform: 'clock', market: 'crates',
  temple: 'candles', tunnel: 'lamp-post', bunker: 'radio-rack', newsroom: 'press'
};

function toneOf(text, index) {
  if (/night|midnight|dark|blackout|curfew|secret|2 ?a\.?m|3 ?a\.?m|before dawn|under cover/.test(text)) return 'night';
  if (/dawn|first light|sunrise|early morning/.test(text)) return 'dawn';
  if (/dusk|evening|sunset|twilight|half[- ]light/.test(text)) return 'dusk';
  return ['day', 'dawn', 'dusk', 'night'][index % 4];
}

function framingOf(text, index) {
  if (/macro|extreme close|close[- ]up|close up|\bdetail\b|insert shot|hands? on/.test(text)) return 4;
  if (/top[- ]down|overhead|plan view|flat lay|looking down/.test(text)) return 5;
  if (/aerial|crane|high angle|sweeping|bird s eye/.test(text)) return 5;
  if (/orbit|circles?|arc around/.test(text)) return 1;
  if (/push|dolly in|track in|advance|press in/.test(text)) return 2;
  if (/pull|reveal|retreat|widen|step back/.test(text)) return 3;
  if (/wide|establish/.test(text)) return 0;
  return index % FRAMINGS;
}

const BIG = new Set(['open', 'street', 'market', 'temple', 'platform', 'yard', 'warehouse', 'hangar', 'court']);
const NARROW = new Set(['corridor', 'tunnel', 'cell', 'bunker', 'vault']);

function dimsFor(space, seed) {
  const rand = prng(seed + 7);
  if (NARROW.has(space)) {
    return { w: between(rand, 8, 13, 1), d: between(rand, 5, 7.5, 1), h: between(rand, 3.2, 4.4, 1) };
  }
  if (BIG.has(space)) {
    return { w: between(rand, 14, 19, 1), d: between(rand, 8.5, 12, 1), h: between(rand, 4.8, 7.6, 1) };
  }
  return { w: between(rand, 10, 15, 1), d: between(rand, 6.5, 10, 1), h: between(rand, 3.6, 6.0, 1) };
}

function lightFor(tone) {
  const key = tone === 'night' ? 'sodium' : tone === 'day' ? 'hard' : 'warm';
  const practicals = tone === 'day' ? 0 : 2;
  return { key, fill: 'cool', practicals };
}

function paletteFor(text) {
  if (/gas|chemical|night|blackout|sodium|lamp|midnight/.test(text)) return 'sodium';
  if (/sea|ship|cold|winter|rain|cyan|hospital/.test(text)) return 'cold';
  if (/field|village|earth|soil|grain|farm|desert/.test(text)) return 'earth';
  if (/vote|election|flag|republic|assembly|parliament/.test(text)) return 'signal';
  return 'paper';
}

/* ---------------------------------------------------------------------------
 * The designer.
 * ------------------------------------------------------------------------ */

function rotate(list, from) {
  const at = Math.max(0, list.indexOf(from));
  return list.slice(at).concat(list.slice(0, at));
}

function pickFingerprint(space, hero, baseFraming, seen) {
  const spaceOrder = rotate(SPACES, space);
  const heroOrder = rotate(PROPS, hero);

  // Same room, same hero, any lens.
  for (let f = 0; f < FRAMINGS; f++) {
    const framing = (baseFraming + f) % FRAMINGS;
    if (!seen.has(`${space}|${hero}|${framing}`)) return { space, hero, framing };
  }
  // Keep the room, cast a different hero.
  for (const nextHero of heroOrder) {
    if (nextHero === hero) continue;
    for (let f = 0; f < FRAMINGS; f++) {
      const framing = (baseFraming + f) % FRAMINGS;
      if (!seen.has(`${space}|${nextHero}|${framing}`)) return { space, hero: nextHero, framing };
    }
  }
  // Move to another room entirely.
  for (const nextSpace of spaceOrder) {
    for (const nextHero of heroOrder) {
      for (let f = 0; f < FRAMINGS; f++) {
        const framing = (baseFraming + f) % FRAMINGS;
        if (!seen.has(`${nextSpace}|${nextHero}|${framing}`)) {
          return { space: nextSpace, hero: nextHero, framing };
        }
      }
    }
  }
  return { space, hero, framing: baseFraming };
}

function designPlate(shot, scene, index, seen) {
  const text = shotText(shot, scene);

  // 1. A storyboard may direct the set explicitly. Honour it when the grammar
  //    we name actually exists; otherwise fall through to the lexicon.
  const hint = shot.set && typeof shot.set === 'object' ? shot.set : null;

  let space = hint && SPACES.includes(hint.space)
    ? hint.space
    : firstMatch(SPACE_WORDS, text.primary) || firstMatch(SPACE_WORDS, text.secondary);
  if (!space) space = SPACES[hash(shot.plate || String(index)) % SPACES.length];

  let hero = null;
  let props = [];

  if (hint && PROPS.includes(hint.hero)) {
    hero = hint.hero;
    props = (Array.isArray(hint.props) ? hint.props : []).filter((p) => PROPS.includes(p) && p !== hero);
  }

  const propPool = [
    ...matchesAll(PROP_WORDS, text.primary),
    ...matchesAll(PROP_WORDS, text.secondary).filter((p) => !matchesAll(PROP_WORDS, text.primary).includes(p))
  ].filter((p) => p !== hero);

  if (!hero) {
    // Prefer a prop whose word also appears in the plate name, so an author who
    // names a plate "valve-02" gets a valve.
    const plateWord = String(shot.plate || '').toLowerCase();
    hero = propPool.find((p) => plateWord.includes(p.split('-')[0])) || propPool[0] || null;
  }

  if (!hero) {
    // Nothing in the sentence and nothing in the name: cast the object that
    // belongs in this room rather than a random prop.
    hero = SPACE_HERO[space] || PROPS[hash(shot.plate || shot.id || index) % PROPS.length];
  }

  props = props.concat(propPool.filter((p) => p !== hero));
  props = [...new Set(props)].slice(0, 3);

  // 2. Rotate away from a fingerprint this film already used. A board with 80
  //    plates and one obvious hero per plate exhausts six framings quickly, so
  //    widening the search matters: same room first, then a second hero in the
  //    room, then a different room. The vocabulary has 22 x 41 x 6 = 5,412
  //    fingerprints, so this always terminates for a film-length board.
  const rand = prng(hash(shot.plate || shot.id || 'plate') + index);
  const baseFraming = framingOf(`${text.primary} ${text.secondary}`, index);
  const noSpace = space;
  const chosen = pickFingerprint(noSpace, hero, baseFraming, seen);
  space = chosen.space;
  hero = chosen.hero;
  const framing = chosen.framing;
  props = props.filter((p) => p !== hero).slice(0, 3);
  seen.add(`${space}|${hero}|${framing}`);

  const seed = hash(`${shot.plate || shot.id}|${index}`);
  const tone = (hint && TONES.includes(hint.tone)) ? hint.tone : toneOf(`${text.primary} ${text.secondary}`, index);

  return {
    space,
    hero,
    props,
    dims: dimsFor(space, seed),
    tone,
    light: lightFor(tone),
    framing,
    heroScale: Number((0.85 + rand() * 0.5).toFixed(2)),
    seed,
    visual: shot.visual || '',
    sfx: Array.isArray(shot.sfx) ? shot.sfx.slice(0, 3) : []
  };
}

function design(film) {
  const scenes = Array.isArray(film.scenes) ? film.scenes : [];
  const seen = new Set();
  const sets = {
    film: film.id,
    script: 'scene_compiler.py',
    generatedBy: 'scripts/film/design-sets.js',
    palette: PALETTES.paper,
    grammar: (film.edit && film.edit.grammar) || 'adaptive',
    plates: {},
    scenes: {}
  };

  const allText = scenes.map((s) => {
    const narration = (s.narration || []).map((l) => l.text).join(' ');
    return `${s.title || ''} ${s.purpose || ''} ${narration}`;
  }).join(' ').toLowerCase();
  sets.palette = PALETTES[paletteFor(allText)];

  let index = 0;
  for (const scene of scenes) {
    for (const shot of scene.shots || []) {
      if (shot.render !== 'blender') continue;
      if (!shot.plate) continue;
      const key = String(shot.plate);
      const spec = designPlate(shot, scene, index++, seen);
      sets.scenes[key] = spec;
      sets.plates[key] = {
        scene: key,
        script: 'scene_compiler.py',
        params: { seed: spec.seed }
      };
    }
  }

  return sets;
}

/* ---------------------------------------------------------------------------
 * CLI
 * ------------------------------------------------------------------------ */

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

function main() {
  const filmId = arg('film');
  if (!filmId) {
    console.error('usage: node scripts/film/design-sets.js --film <id> [--out <path>] [--dry-run] [--force]');
    process.exitCode = 2;
    return;
  }
  const filmPath = path.join(FILMS, `${filmId}.json`);
  if (!fs.existsSync(filmPath)) {
    console.error(`FAIL no storyboard at ${path.relative(ROOT, filmPath)}`);
    process.exitCode = 1;
    return;
  }
  const film = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const sets = design(film);

  const plateCount = Object.keys(sets.plates).length;
  if (!plateCount) {
    console.error('FAIL the storyboard has no Blender shots to design');
    process.exitCode = 1;
    return;
  }

  const out = arg('out') || path.join(FILMS, `${filmId}-sets.json`);
  const dry = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  if (BESPOKE.has(filmId) && !force && !arg('out')) {
    console.log(`[sets] ${filmId} has a hand-built Blender set; leaving it alone (use --force to redesign)`);
    return;
  }

  if (dry) {
    process.stdout.write(JSON.stringify(sets, null, 2) + '\n');
    return;
  }

  if (fs.existsSync(out) && !force) {
    let existing = null;
    try { existing = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) { existing = null; }
    const ours = existing && existing.generatedBy === 'scripts/film/design-sets.js';
    const handAuthored = existing && existing.script === 'scene_compiler.py' && !ours;
    if (handAuthored) {
      // A human tuned this set (salt-march). Never replace it silently.
      console.log(`[sets] ${path.relative(ROOT, out)} is hand-authored; leaving it alone (use --force to redesign)`);
      return;
    }
    if (ours) {
      // Already designed from this board. Re-running is cheap, so only skip
      // when the board is unchanged.
      const same = JSON.stringify(existing.plates) === JSON.stringify(sets.plates);
      if (same) {
        console.log(`[sets] ${path.relative(ROOT, out)} already matches the board (${plateCount} plates)`);
        return;
      }
    }
  }

  fs.writeFileSync(out, JSON.stringify(sets, null, 2) + '\n');
  const spaces = [...new Set(Object.values(sets.scenes).map((s) => s.space))];
  const heroes = [...new Set(Object.values(sets.scenes).map((s) => s.hero))];
  console.log(`[sets] ${path.relative(ROOT, out)}`);
  console.log(`[sets] ${plateCount} plates · ${spaces.length} spaces · ${heroes.length} heroes · palette ${sets.palette.paper}`);
  console.log(`[sets] spaces: ${spaces.join(', ')}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`FAIL ${e.message}`);
    process.exitCode = 1;
  }
}

module.exports = { design, designPlate, SPACES, PROPS, TONES, LIGHT_KEYS, FRAMINGS };
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
    keywords: ['newspaper', 'newspapers', 'press', 'censor', 'censorship', 'column', 'blank', 'editor', 'editorial', 'journalist', 'publication', 'expression', 'obituary', 'times of india'],
    exclude: ['aandhi', 'kissa kurzi', 'nasbandi', 'bhindranwale', 'jagat narain'],
    plates: ['wall', 'night']
  },
  {
    id: 'S02',
    title: 'The order',
    purpose: 'Show the decision, who made it, and the words it was made in.',
    ask: 'State what was proclaimed or decided, by whom, and on what date.',
    keywords: ['proclaim a state of emergency', 'proclaimed a state of emergency', 'emergency was proclaimed', 'issue the proclamation', 'declared a state of emergency', 'declare a state of emergency', 'internal emergency', 'article 352', 'ratified', 'ordinance', 'ordinances'],
    exclude: ['article 356', 'american policy', 'future government', 'nationalisation of several major banks'],
    plates: ['room', 'desk']
  },
  {
    id: 'S03',
    title: 'The machine',
    purpose: 'Explain how the decision reached ordinary life: the law, the police, the press.',
    ask: 'Describe the mechanism — the rule, the agency, the censor — that carried the order into daily life.',
    keywords: ['misa', 'maintenance of internal security', 'defence of india', 'dir', 'arrest', 'arrested', 'detain', 'detained', 'detention', 'police', 'warrant', 'magistrate', 'censor', 'censorship', 'preventive', 'ban', 'banned'],
    plates: ['wall', 'corridor']
  },
  {
    id: 'S04',
    title: 'The cost',
    purpose: 'Count what it took, in the terms the record uses, without inventing a figure.',
    ask: 'Give the human count the sources actually report: prisoners, months, families, deaths.',
    keywords: ['prisoners', 'prisoner', 'detained', 'arrested', 'families', 'died', 'custody', 'torture', 'sterilisation', 'sterilization', 'months', 'lakh', 'thousands', 'prison', 'detention', 'forced'],
    exclude: ['released all political prisoners', 'called elections', 'prisoners of war', 'pakistani', 'the strike was brutally suppressed', 'class a prisoners', 'class b prisoners', 'class a and b', 'electricity to all major newspapers', 'continuation of the emergency'],
    plates: ['corridor', 'object']
  },
  {
    id: 'S05',
    title: 'The turn',
    purpose: 'Find the moment the order broke: the election, the release, the first page printed again.',
    ask: 'Show the turn: the election that was called, the prisoners who came out, the press that printed again.',
    keywords: ['election', 'elections', 'released', 'general election', 'janata', 'verdict', 'defeated', 'poll', 'vote', 'restored', 'returned'],
    exclude: ['gujarat', 'vidhan sabha', 'election commission', '1989', 'jebamani', 'may 1977', 'political science review', '1980', 'won the next election by a landslide', '1971', 'privy purse', 'medak', 'repeal the 42nd', 'postponed elections', 'elections were postponed', 'authority to rule by decree', 'temple complex', 'lost 172 seats', 'shastri', '1967', 'resisted merging'],
    plates: ['desk', 'room', 'gate']
  },
  {
    id: 'S06',
    title: 'The argument',
    purpose: 'Put the dispute on the table: who defended it, who fought it, and on what ground.',
    ask: 'State the argument for and against, in the words the record attributes to each side.',
    keywords: ['argued', 'argues', 'critic', 'critics', 'criticised', 'criticized', 'controversial', 'opposition', 'opposed', 'defended', 'defend', 'justif', 'support', 'supreme court', 'basic structure', 'unconstitutional', 'arbitrary', 'contended', 'controversy'],
    exclude: ['goongi goodiya', 'nationalisation of the banks', 'land ownership', 'method of selection', 'rival congress leaders', 'justice shah had already spoken', 'confusing investigation with inquiry', 'form a united', 'electricity to all major newspapers', 'raids were conducted', 'disadvantaged sections', 'machiavellian', 'sought an accommodation'],
    plates: ['room', 'wall']
  },
  {
    id: 'S07',
    title: 'The record',
    purpose: 'Show what was written down, and what the writing left out.',
    ask: 'Describe the inquiry, report or testimony — what it found and what it refused to find.',
    keywords: ['report', 'commission', 'inquiry', 'evidence', 'testimony', 'witness', 'concluded', 'terms of reference', 'proceedings', 'tribunal', 'trial', 'interim report', 'final report'],
    exclude: ['desai government proceeded'],
    plates: ['desk', 'wall']
  },
  {
    id: 'S08',
    title: 'The return',
    purpose: 'Return to the opening object: what survived, what was withdrawn, what is still on the record.',
    ask: 'Close on the object again: the return to power, the report in the library, the blank column that is still blank.',
    keywords: ['returned to power', 'landslide', 'special courts', 'report', 'copy', 'library', 'republished', 'memorial', 'anniversary', 'legacy', 'blank editorial', 'press'],
    exclude: ['1967', 'bangladesh', 'tata told a reporter', 'first interim report', 'second interim report', 'final report', 'commission was to report', 'commission concluded', 'scathing', 'wikileaks', '1971'],
    reuse: true,
    plates: ['object', 'flame', 'desk']
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
    'Return this JSON shape exactly:',
    '{"lines":[{"row":"L03","text":"one spoken sentence"}]}',
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
  if (archetype === 'wall_surface' && effects['paper-wipe'] < 2) {
    effects['paper-wipe'] += 1;
    return {
      type: 'paper-wipe',
      reason: 'The newspaper page drags across the cut and the wall of print arrives.'
    };
  }
  if (archetype === 'paper_desk' && li === 0 && effects['page-turn'] < 2) {
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
  const effects = { 'paper-wipe': 0, 'page-turn': 0, iris: 0 };
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

  for (const scene of SCENES) {
    const rows = candidatesFor(scene, ledger, used, subject, primary);
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

try {
  main();
} catch (e) {
  console.error(`[author] FAIL ${e.message}`);
  process.exitCode = 1;
}

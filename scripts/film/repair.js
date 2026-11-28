#!/usr/bin/env node
/**
 * Deterministic repair lane for the film pipeline.
 *
 * The GitHub agent may fix a plate map. It may not write narration, invent a
 * source, rewrite host dialogue, or touch workflow code. This script enforces
 * that boundary:
 *
 *   - classify the failed run from its log;
 *   - for a missing/invalid plate, copy a valid plate from the same prefix and
 *     vary its seed/framing deterministically, or fall back to a stock set;
 *   - for a missing Blender script, remap the plate to a valid donor;
 *   - for a transient infrastructure error, retry without editing anything;
 *   - for QC, storyboard, source, debate or unknown failures, stop and write an
 *     issue body for a human or a creative agent.
 *
 * The only file this script can edit is data/films/<film>-sets.json. Every edit
 * is validated with validate-film, validate-hosts and a plate dry-run before it
 * is kept. A failed validation restores the original file byte for byte.
 *
 * Usage:
 *   node scripts/film/repair.js --film salt-march --attempt 1 \
 *     --log out/repair/failed.log --report out/repair/report.json \
 *     --issue out/repair/issue.md --apply
 *
 *   node scripts/film/repair.js --film salt-march --kind plate-map --apply
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');
const BLENDER = path.join(ROOT, 'scripts', 'film', 'blender');
const MAX_ATTEMPTS = 2;

const STOCK_BY_PREFIX = {
  object: { scene: 'plinth_object' },
  desk: { scene: 'paper_desk' },
  corridor: { scene: 'corridor' },
  night: { scene: 'exterior_night' },
  office: { scene: 'office' },
  index: { scene: 'index' },
  wall: { scene: 'wall_surface' },
  flame: { scene: 'flame_source' },
  gate: { scene: 'gate' },
  map: { scene: 'map' },
  stair: { scene: 'stair' },
  vault: { scene: 'vault' },
  stacks: { scene: 'stacks' },
  archive: { scene: 'archive' },
  room: { scene: 'room_interior' },
  _default: { scene: 'paper_desk' }
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`missing ${path.relative(ROOT, file)}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)} is not valid JSON: ${err.message}`);
  }
}

function hash32(text) {
  return parseInt(crypto.createHash('sha1').update(String(text)).digest('hex').slice(0, 8), 16);
}

function platePrefix(plate) {
  return String(plate).replace(/-\d+[a-z]?$/i, '');
}

function uniquePlates(film) {
  const plates = [];
  const seen = new Set();
  for (const scene of film.scenes || []) {
    for (const shot of scene.shots || []) {
      if (shot.render !== 'blender' || !shot.plate) continue;
      if (seen.has(shot.plate)) continue;
      seen.add(shot.plate);
      plates.push(shot.plate);
    }
  }
  return plates;
}

const choiceCache = new Map();

/** Read the Python SCENES dict so a typo is caught before Blender starts. */
function sceneChoices(script) {
  if (choiceCache.has(script)) return choiceCache.get(script);
  const file = path.join(BLENDER, script);
  if (!fs.existsSync(file)) {
    choiceCache.set(script, null);
    return null;
  }
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/SCENES\s*=\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    choiceCache.set(script, null);
    return null;
  }
  const choices = new Set();
  for (const found of match[1].matchAll(/"([^"]+)"\s*:/g)) choices.add(found[1]);
  choiceCache.set(script, choices);
  return choices;
}

function scriptFor(entry, sets) {
  return entry.script || sets.script || 'stock_sets.py';
}

function entryProblem(entry, sets) {
  if (!entry || !entry.scene) return 'entry has no scene';
  const script = scriptFor(entry, sets);
  if (!fs.existsSync(path.join(BLENDER, script))) return `missing Blender script ${script}`;
  const choices = sceneChoices(script);
  if (choices && !choices.has(entry.scene)) return `scene "${entry.scene}" is not declared in ${script}`;
  return null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Pick a valid donor with the same plate prefix. Copying a real plate keeps the
 * film's authored palette and grammar; only the seed, framing and dressing move
 * so the new shot is not an exact duplicate. If the prefix has no valid donor
 * (a new set was added without a stock plate), fall back to the generic set.
 */
function chooseReplacement(plate, sets, filmId) {
  const prefix = platePrefix(plate);
  const candidates = Object.entries(sets.plates)
    .filter(([name, entry]) => name !== plate && !entryProblem(entry, sets))
    .filter(([name]) => platePrefix(name) === prefix)
    .sort(([a], [b]) => a.localeCompare(b));

  let donor = null;
  let entry;
  if (candidates.length) {
    const index = hash32(`${filmId}:${plate}`) % candidates.length;
    [donor, entry] = candidates[index];
    entry = clone(entry);
  } else {
    const stock = STOCK_BY_PREFIX[prefix] || STOCK_BY_PREFIX._default;
    entry = {
      scene: stock.scene,
      script: 'stock_sets.py',
      params: { seed: 1, dressing: 1, framing: 0 }
    };
  }

  entry.params = { ...(entry.params || {}) };
  const usedSeeds = new Set(
    Object.entries(sets.plates)
      .filter(([name]) => name !== plate)
      .map(([, value]) => value && value.params && Number(value.params.seed))
      .filter((value) => Number.isFinite(value))
  );
  let seed = (Number(entry.params.seed) || 1) + 37 + (hash32(`${filmId}:${plate}:seed`) % 2003);
  while (usedSeeds.has(seed)) seed += 1;
  entry.params.seed = seed;
  if (entry.params.framing !== undefined) {
    entry.params.framing = (Number(entry.params.framing) + 1 + (hash32(`${filmId}:${plate}:frame`) % 3)) % 5;
  }
  if (entry.params.dressing !== undefined) {
    entry.params.dressing = (Number(entry.params.dressing) + 1) % 3;
  }
  return { donor, entry };
}

function planRepairs(film, sets) {
  const changes = [];
  const filmId = film.id || film.film || 'film';
  for (const plate of uniquePlates(film)) {
    const existing = sets.plates[plate];
    const problem = entryProblem(existing, sets);
    if (!problem) continue;
    const { donor, entry } = chooseReplacement(plate, sets, filmId);
    sets.plates[plate] = entry;
    changes.push({
      plate,
      action: !existing ? 'add-plate' : (problem.startsWith('missing Blender script') ? 'replace-script' : 'replace-entry'),
      problem,
      donor,
      scene: entry.scene,
      script: entry.script || sets.script || 'stock_sets.py',
      params: entry.params
    });
  }
  return changes;
}

function classify(log) {
  const text = String(log || '');
  if (/No Blender scene mapped for plate\s+(\S+)\s+in\s+(\S+)/i.test(text)) {
    return { kind: 'plate-map', reason: 'a plate named by the storyboard is not in the sets file' };
  }
  if (/No Blender scene set registered for film\s+(\S+)/i.test(text)) {
    return { kind: 'plate-map', reason: 'the film has no usable plate map' };
  }
  if (/Blender script not found for plate\s+(\S+):/i.test(text)) {
    return { kind: 'plate-script', reason: 'a plate points at a Blender script that is not on disk' };
  }
  if (/(invalid choice|invalid scene|argument --scene|scene .* not found)/i.test(text) && /blender|plate|scene/i.test(text)) {
    return { kind: 'plate-scene', reason: 'a plate names a scene the Blender script does not declare' };
  }
  if (/(ETIMEDOUT|ECONNRESET|EAI_AGAIN|ENOTFOUND|socket hang up|network is unreachable|temporary failure in name resolution|429 Too Many Requests|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout|runner.*lost|The runner has received a shutdown signal|out of memory|No space left on device)/i.test(text)) {
    return { kind: 'transient', reason: 'transient infrastructure failure' };
  }
  if (/(starved master|below the 2\.5 Mbps floor|master video bitrate .* floor)/i.test(text)) {
    return { kind: 'creative', reason: 'the rendered master is starved: the frames are degraded' };
  }
  if (/(verdict\s+REJECT|qc-film:|FAIL\s+(container|faststart|duration|codec|audio|captions|poster|scene|transitions|blockiness|psnr))/i.test(text)) {
    return { kind: 'creative', reason: 'independent QC rejected the master' };
  }
  if (/validate-(film|debates|hosts):/i.test(text)) {
    return { kind: 'creative', reason: 'storyboard, debate or host validation failed' };
  }
  return { kind: 'unknown', reason: 'no deterministic repair pattern matched' };
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return { ok: result.status === 0, status: result.status, output };
}

function validate(filmId) {
  const checks = [
    { name: 'validate-film', ...runNode(['scripts/film/validate-film.js', `data/films/${filmId}.json`]) },
    { name: 'validate-hosts', ...runNode(['scripts/film/validate-hosts.js', '--film', filmId]) },
    { name: 'render-plates-dry-run', ...runNode(['scripts/film/render-plates.js', '--film', filmId, '--dry-run']) }
  ];
  return checks;
}

function sanitize(text) {
  return String(text || '')
    .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, '[redacted-token]')
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, '[redacted-token]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[redacted-key]')
    .replace(/(token|secret|password|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, 'Bearer [redacted]');
}

function logExcerpt(log) {
  const lines = String(log || '').split(/\r?\n/);
  const key = lines.filter((line) =>
    /(error|fail|not found|no blender|invalid|reject|timeout|econn|etimedout|killed|memory|space|traceback)/i.test(line)
  );
  return [...new Set([...key.slice(0, 30), ...lines.slice(-20)])]
    .slice(-50)
    .map((line) => sanitize(line).slice(0, 300));
}

function changeLine(change) {
  const donor = change.donor ? ` from ${change.donor}` : '';
  return `- \`${change.plate}\`: ${change.action} -> ${change.script}/${change.scene}${donor} (${change.problem})`;
}

function issueMarkdown(report) {
  const lines = [
    '# Film repair stopped',
    '',
    `- Film: \`${report.film}\``,
    `- Failed run: ${report.runUrl || `\`${report.runId || 'unknown'}\``}`,
    `- Repair attempt: ${report.attempt} of ${MAX_ATTEMPTS}`,
    `- Classification: \`${report.classification.kind}\``,
    `- Status: \`${report.status}\``,
    `- Reason: ${report.reason}`,
    '',
    'The automated lane only edits `data/films/<film>-sets.json`. It will not invent a source, rewrite narration or host dialogue, or change workflow code. This failure needs a creative or human decision.',
    ''
  ];
  if (report.changes.length) {
    lines.push('## Plate changes proposed', '', ...report.changes.map(changeLine), '');
  } else {
    lines.push('## Plate changes', '', 'No deterministic plate change was available.', '');
  }
  lines.push('## Validators', '');
  if (!report.validators.length) lines.push('No validator was run.');
  for (const check of report.validators) {
    lines.push(`- \`${check.name}\`: ${check.ok ? 'PASS' : 'FAIL'} (exit ${check.status})`);
  }
  lines.push('', '## Log excerpt', '', '```text', ...(report.logExcerpt.length ? report.logExcerpt : ['(no log captured)']), '```', '');
  if (report.reportUrl) lines.push(`Repair report: ${report.reportUrl}`, '');
  return lines.join('\n');
}

function main() {
  const filmId = arg('film', null);
  if (!filmId || filmId === true) throw new Error('--film is required');
  const attempt = Number(arg('attempt', 0));
  if (!Number.isInteger(attempt) || attempt < 0) throw new Error('--attempt must be a non-negative integer');

  const logFile = arg('log', null);
  const log = logFile && logFile !== true
    ? fs.readFileSync(path.resolve(process.cwd(), String(logFile)), 'utf8')
    : '';
  const setsFile = path.resolve(process.cwd(), String(arg('sets', path.join(FILMS, `${filmId}-sets.json`))));
  const reportFile = path.resolve(process.cwd(), String(arg('report', 'out/repair/report.json')));
  const issueFile = path.resolve(process.cwd(), String(arg('issue', 'out/repair/issue.md')));
  const film = readJson(path.join(FILMS, `${filmId}.json`));

  if (!fs.existsSync(setsFile)) {
    throw new Error(`no sets file at ${path.relative(ROOT, setsFile)}; a repair cannot invent a film's visual grammar`);
  }
  const original = fs.readFileSync(setsFile, 'utf8');
  const sets = JSON.parse(original);
  if (!sets.plates || typeof sets.plates !== 'object') {
    throw new Error(`${path.relative(ROOT, setsFile)} has no plates map; a repair cannot invent a film's visual grammar`);
  }

  const override = arg('kind', null);
  const classification = override && override !== true
    ? { kind: String(override), reason: 'manual classification override' }
    : classify(log);

  let changes = [];
  if (['plate-map', 'plate-script', 'plate-scene'].includes(classification.kind)) {
    changes = planRepairs(film, sets);
  }

  let status = 'issue';
  let reason = classification.reason;
  let validators = [];
  let applied = false;

  if (attempt >= MAX_ATTEMPTS) {
    status = 'exhausted';
    reason = `the repair lane has already used ${MAX_ATTEMPTS} attempts`;
  } else if (changes.length) {
    if (!flag('apply')) {
      status = 'planned';
    } else {
      fs.writeFileSync(setsFile, `${JSON.stringify(sets, null, 2)}\n`);
      validators = validate(filmId);
      if (validators.every((check) => check.ok)) {
        status = 'repaired';
        applied = true;
      } else {
        fs.writeFileSync(setsFile, original);
        status = 'issue';
        reason = 'the repaired plate map did not pass validation';
      }
    }
  } else if (classification.kind === 'transient') {
    status = 'retry';
    reason = classification.reason;
  } else if (['plate-map', 'plate-script', 'plate-scene'].includes(classification.kind)) {
    status = 'issue';
    reason = `${classification.reason}; every plate already has a valid entry, so the log is stale`;
  }

  const report = {
    schema: 'vlymbooq.repair.v1',
    film: filmId,
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    classification,
    status,
    applied,
    reason,
    changes,
    validators,
    logExcerpt: logExcerpt(log),
    runId: process.env.REPAIR_RUN_ID || null,
    runUrl: process.env.REPAIR_RUN_URL || null,
    reportUrl: process.env.REPAIR_REPORT_URL || null,
    generatedAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  fs.mkdirSync(path.dirname(issueFile), { recursive: true });
  fs.writeFileSync(issueFile, issueMarkdown(report));

  console.log(`repair ${filmId}: status=${status} attempt=${attempt} changes=${changes.length}`);
  console.log(`report ${path.relative(process.cwd(), reportFile)}`);
  for (const change of changes) console.log(`  ${changeLine(change).slice(2)}`);
  for (const check of validators) console.log(`  ${check.ok ? 'ok  ' : 'FAIL'} ${check.name}`);
  if (status !== 'repaired' && status !== 'retry' && status !== 'planned') {
    console.log(`issue ${path.relative(process.cwd(), issueFile)}`);
  }
}

function failureReport(err) {
  const film = arg('film', 'unknown');
  const attempt = Number(arg('attempt', 0)) || 0;
  const reportFile = path.resolve(process.cwd(), String(arg('report', 'out/repair/report.json')));
  const issueFile = path.resolve(process.cwd(), String(arg('issue', 'out/repair/issue.md')));
  let excerpt = [];
  const logFile = arg('log', null);
  try {
    if (logFile && logFile !== true) {
      excerpt = logExcerpt(fs.readFileSync(path.resolve(process.cwd(), String(logFile)), 'utf8'));
    }
  } catch {
    excerpt = [];
  }
  const report = {
    schema: 'vlymbooq.repair.v1',
    film: film === true ? 'unknown' : film,
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    classification: { kind: 'error', reason: err.message },
    status: 'issue',
    applied: false,
    reason: err.message,
    changes: [],
    validators: [],
    logExcerpt: excerpt,
    runId: process.env.REPAIR_RUN_ID || null,
    runUrl: process.env.REPAIR_RUN_URL || null,
    reportUrl: process.env.REPAIR_REPORT_URL || null,
    generatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  fs.mkdirSync(path.dirname(issueFile), { recursive: true });
  fs.writeFileSync(issueFile, issueMarkdown(report));
  console.error(`repair: ${err.message}`);
  console.error(`report ${path.relative(process.cwd(), reportFile)}`);
}

try {
  main();
} catch (err) {
  try {
    failureReport(err);
  } catch (nested) {
    console.error(`repair: ${err.message}; could not write the failure report: ${nested.message}`);
    process.exitCode = 1;
  }
}

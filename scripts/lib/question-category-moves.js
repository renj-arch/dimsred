'use strict';
/**
 * Curated question-category moves.
 *
 * The question bank is built from Wikipedia A-Z runs. A shard carries a
 * subject label, but the run is not scoped to that subject, so an aerospace
 * standard can end up filed under "Indian Languages". Fixing that by hand
 * inside an 8 MB minified file is not repeatable and not reviewable.
 *
 * A move is declared once in data/category-moves.json with:
 *   - the exact subtopic and source category,
 *   - the source and target shard files,
 *   - literal evidence that must appear in the moved questions,
 *   - an approval note.
 *
 * This module validates the declaration, moves the whole subtopic, clears any
 * stale scope tags so ExamScope reclassifies from the new subject, and patches
 * the matching timeline node. It never invents a target category: a missing
 * category is an error unless the move explicitly sets createTarget.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_REL = 'data/category-moves.json';
const QUESTIONS_REL = 'data/questions';
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function fail(message) {
  const err = new Error(message);
  err.code = 'CATEGORY_MOVE_INVALID';
  throw err;
}

function slugFor(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function norm(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function isSafeRelFile(rel) {
  if (typeof rel !== 'string' || !rel) return false;
  if (rel.indexOf('\\') !== -1) return false;
  if (rel.indexOf('..') !== -1) return false;
  return /^data\/questions\/[a-z0-9][a-z0-9-]*\.json$/.test(rel);
}

function fileMatchesCategory(rel, category) {
  const base = path.posix.basename(rel, '.json');
  const slug = slugFor(category);
  return base === slug || base.replace(/-\d+$/, '') === slug;
}

function categoryText(q) {
  return [q && q.question, q && q.answer, q && q.fact, q && q.subSubject]
    .map(norm).filter(Boolean).join(' \n ');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadRegistry(root) {
  root = root || path.join(__dirname, '..', '..');
  const file = path.join(root, REGISTRY_REL);
  if (!fs.existsSync(file)) fail('missing registry: ' + REGISTRY_REL);
  return readJson(file);
}

function validateRegistry(reg) {
  if (!reg || typeof reg !== 'object') fail('registry must be a JSON object');
  if (reg.version !== 1) fail('registry version must be 1');
  if (!Array.isArray(reg.moves) || !reg.moves.length) fail('registry.moves must be a non-empty array');
  const ids = Object.create(null);
  for (const move of reg.moves) {
    validateMove(move);
    if (ids[move.id]) fail('duplicate move id: ' + move.id);
    ids[move.id] = true;
  }
  return true;
}

function validateMove(move, ctx) {
  if (!move || typeof move !== 'object') fail('move must be an object');
  const where = move.id ? 'move ' + move.id : 'move';
  if (!move.id || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(move.id)) fail(where + ': id must be a lowercase slug');
  if (!move.subSubject || !String(move.subSubject).trim()) fail(where + ': subSubject is required');
  if (!move.from || !String(move.from).trim()) fail(where + ': from is required');
  if (!move.to || !String(move.to).trim()) fail(where + ': to is required');
  if (norm(move.from) === norm(move.to)) fail(where + ': from and to must differ');
  if (slugFor(move.to).length < 3) fail(where + ': to is not a usable category name');
  if (!isSafeRelFile(move.fromFile)) fail(where + ': fromFile must be a data/questions/*.json path');
  if (!isSafeRelFile(move.toFile)) fail(where + ': toFile must be a data/questions/*.json path');
  if (move.fromFile === move.toFile) fail(where + ': fromFile and toFile must differ');
  if (!fileMatchesCategory(move.fromFile, move.from)) {
    fail(where + ': fromFile does not match the source category slug');
  }
  if (!fileMatchesCategory(move.toFile, move.to)) {
    fail(where + ': toFile does not match the target category slug');
  }
  if (!Array.isArray(move.evidence) || move.evidence.length < 2) {
    fail(where + ': at least two literal evidence strings are required');
  }
  const seen = Object.create(null);
  for (const item of move.evidence) {
    if (typeof item !== 'string') fail(where + ': evidence must be strings');
    const value = item.trim();
    if (value.length < 8 || value.length > 160) fail(where + ': evidence must be 8-160 characters: ' + value);
    if (seen[norm(value)]) fail(where + ': duplicate evidence: ' + value);
    seen[norm(value)] = true;
  }
  if (!move.reason || String(move.reason).trim().length < 40) {
    fail(where + ': reason must explain the move in at least 40 characters');
  }
  if (!move.approvedBy || !String(move.approvedBy).trim()) fail(where + ': approvedBy is required');
  if (!DATE_RE.test(String(move.approvedAt || ''))) fail(where + ': approvedAt must be an ISO date');
  if (move.timelineNode != null && (typeof move.timelineNode !== 'string' || !move.timelineNode.trim())) {
    fail(where + ': timelineNode must be a non-empty string when present');
  }
  if (move.createTarget != null && typeof move.createTarget !== 'boolean') {
    fail(where + ': createTarget must be boolean when present');
  }
  if (move.timelineUndated != null && typeof move.timelineUndated !== 'boolean') {
    fail(where + ': timelineUndated must be boolean when present');
  }
  if (ctx && ctx.sourceData) validateEvidence(move, ctx.sourceData);
  return true;
}

function validateEvidence(move, sourceData) {
  const subject = sourceData[move.from];
  const questions = subject && subject.subSubjects && subject.subSubjects[move.subSubject];
  if (!Array.isArray(questions) || !questions.length) {
    fail('move ' + move.id + ': subtopic not found in ' + move.from);
  }
  const text = questions.map(categoryText).join(' \n ');
  for (const item of move.evidence) {
    if (text.indexOf(norm(item)) === -1) {
      fail('move ' + move.id + ': evidence not present in the subtopic: ' + item);
    }
  }
  return true;
}

function assertTargetCategory(data, move) {
  const keys = Object.keys(data || {});
  if (keys.indexOf(move.to) !== -1) return;
  if (keys.length && move.createTarget !== true) {
    fail('move ' + move.id + ': target file has no "' + move.to + '" category (set createTarget to add it)');
  }
  if (!keys.length && move.createTarget !== true) {
    fail('move ' + move.id + ': target category does not exist (set createTarget to create it)');
  }
  data[move.to] = { subSubjects: {} };
}

function moveSubtopic(sourceData, targetData, move) {
  const sourceSubject = sourceData[move.from];
  if (!sourceSubject || !sourceSubject.subSubjects) {
    fail('move ' + move.id + ': source category missing in ' + move.fromFile);
  }
  const questions = sourceSubject.subSubjects[move.subSubject];
  if (!Array.isArray(questions) || !questions.length) {
    fail('move ' + move.id + ': source subtopic "' + move.subSubject + '" not found');
  }
  validateEvidence(move, sourceData);
  assertTargetCategory(targetData, move);
  const targetSubs = targetData[move.to].subSubjects;
  if (targetSubs[move.subSubject]) {
    fail('move ' + move.id + ': target already has subtopic "' + move.subSubject + '"');
  }

  for (const q of questions) {
    q.category = move.to;
    q.subject = move.to;
    q.subSubject = move.subSubject;
    // Scope tags are derived, not source facts. Clear them so ExamScope
    // recomputes from the corrected subject instead of trusting a stale label.
    delete q.relevance;
    delete q.examScope;
    delete q.scopeReasons;
    delete q.scopeEvidence;
    delete q.scopeVersion;
  }
  targetSubs[move.subSubject] = questions;
  delete sourceSubject.subSubjects[move.subSubject];
  return questions.length;
}

function findNodeFile(root, move) {
  const dir = path.join(root, 'data');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => /^timeline\.nodes\.\d+\.json$/.test(f)).sort();
  for (const f of files) {
    const p = path.join(dir, f);
    const data = readJson(p);
    if (!Array.isArray(data)) continue;
    if (data.some(n => n && n.id === move.timelineNode)) return { file: p, data: data };
  }
  return null;
}

function patchTimeline(root, move) {
  if (!move.timelineNode) return { patched: false, reason: 'no timelineNode' };
  const found = findNodeFile(root, move);
  if (!found) return { patched: false, reason: 'node not found in timeline shards' };
  const node = found.data.find(n => n && n.id === move.timelineNode);
  const categoryKey = path.posix.basename(move.toFile, '.json');
  const count = node.count || (node.cats && node.cats[0] && node.cats[0].count) || 0;
  node.cats = [{ key: categoryKey, label: move.to, count: count }];
  if (move.timelineUndated) {
    node.timebase = 'undated';
    delete node.span;
    delete node.era;
  }
  fs.writeFileSync(found.file, JSON.stringify(found.data));
  return { patched: true, file: path.relative(root, found.file).split(path.sep).join('/') };
}

function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function applyRegistry(opts) {
  opts = opts || {};
  const root = opts.root || path.join(__dirname, '..', '..');
  const dryRun = opts.dryRun === true;
  const only = opts.ids || null;
  const reg = opts.registry || loadRegistry(root);
  validateRegistry(reg);

  const qdir = path.join(root, QUESTIONS_REL);
  if (!fs.existsSync(qdir)) {
    return { applied: [], skipped: 'data/questions is not checked out' };
  }

  const results = [];
  for (const move of reg.moves) {
    if (only && only.indexOf(move.id) === -1) continue;
    const sourceFile = path.join(root, move.fromFile.split('/').join(path.sep));
    const targetFile = path.join(root, move.toFile.split('/').join(path.sep));
    if (!fs.existsSync(sourceFile)) fail('move ' + move.id + ': missing ' + move.fromFile);
    const sourceData = readJson(sourceFile);
    let targetData = fs.existsSync(targetFile) ? readJson(targetFile) : {};

    // Idempotent re-run: the subtopic already lives in the target.
    const targetSubject = targetData[move.to];
    if (targetSubject && targetSubject.subSubjects && targetSubject.subSubjects[move.subSubject]) {
      const sourceSubject = sourceData[move.from];
      if (!sourceSubject || !sourceSubject.subSubjects || !sourceSubject.subSubjects[move.subSubject]) {
        results.push({ id: move.id, alreadyApplied: true });
        continue;
      }
      fail('move ' + move.id + ': subtopic exists in both source and target');
    }

    const moved = moveSubtopic(sourceData, targetData, move);
    let timeline = { patched: false, reason: 'dry run' };
    if (!dryRun) {
      writeJson(sourceFile, sourceData);
      writeJson(targetFile, targetData);
      timeline = patchTimeline(root, move);
    }
    results.push({ id: move.id, moved: moved, from: move.from, to: move.to, timeline: timeline });
  }
  return { applied: results };
}

module.exports = {
  REGISTRY_REL,
  slugFor,
  norm,
  loadRegistry,
  validateRegistry,
  validateMove,
  validateEvidence,
  moveSubtopic,
  patchTimeline,
  applyRegistry
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.indexOf('--dry-run') !== -1;
  const idArg = args.filter(a => a.indexOf('--id=') === 0).map(a => a.slice(5));
  try {
    const out = applyRegistry({ dryRun: dryRun, ids: idArg.length ? idArg : null });
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('category-moves: ' + e.message);
    process.exit(1);
  }
}

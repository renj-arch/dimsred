// Shared store for the Vlymbooq Research Team.
//
// The research team writes original solution methods for exam questions. A
// method is published only after an independent verifier reaches the same
// answer. Nothing here claims a world-first: "original" means original to this
// lab, and every method is reproducible from the question itself.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = 'data/research-solutions.json';

function fileFor(root) {
  return path.join(root || path.resolve(__dirname, '..', '..'), FILE);
}

function load(root) {
  try {
    const j = JSON.parse(fs.readFileSync(fileFor(root), 'utf-8'));
    if (j && Array.isArray(j.solutions)) return j;
  } catch (e) {}
  return {
    updatedAt: '',
    note: 'Original methods from the Vlymbooq Research Team. Every published method is checked against an independent solve. "Original" means original to this lab; no world-first claim is made.',
    solutions: []
  };
}

function save(root, store) {
  const file = fileFor(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  store.updatedAt = new Date().toISOString();
  store.solutions = (store.solutions || []).slice(-4000);
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

function questionId(exam, question, options) {
  const parts = [String(exam || '')];
  parts.push(String(question || '').toLowerCase().replace(/\s+/g, ' ').trim());
  (options || []).forEach(function (o) { parts.push(String((o && o.text) || o || '').toLowerCase().replace(/\s+/g, ' ').trim()); });
  return crypto.createHash('sha1').update(parts.join('\u0001')).digest('hex').slice(0, 16);
}

// Index a store by paper slug + question number for the paper renderers.
function indexByPaper(store) {
  const out = {};
  (store.solutions || []).forEach(function (s) {
    if (!s || !s.paperSlug || s.status !== 'published') return;
    const k = s.paperSlug + '#' + s.questionNumber;
    // Keep the newest entry if a question was re-investigated.
    if (!out[k] || String(s.generatedAt) > String(out[k].generatedAt)) out[k] = s;
  });
  return out;
}

function forQuestion(index, slug, qNumber) {
  return index[String(slug) + '#' + String(qNumber)] || null;
}

module.exports = {
  FILE: FILE,
  fileFor: fileFor,
  load: load,
  save: save,
  questionId: questionId,
  indexByPaper: indexByPaper,
  forQuestion: forQuestion
};

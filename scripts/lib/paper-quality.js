'use strict';
// Shared gate for paper questions: an MCQ is only printable if it has a real
// stem and distinct, non-placeholder options. Generated NEET/JEE papers were
// shipping questions like "A) A B) B C) C D) D" and duplicate options.
function optText(o) {
  return String(typeof o === 'string' ? o : (o && (o.text || o.t)) || '').trim();
}
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function badQuestion(q) {
  if (!q) return 'missing';
  const text = String(q.text || q.question || '').trim();
  if (text.length < 12) return 'short text';
  const raw = Array.isArray(q.options) ? q.options : [];
  if (raw.length < 2) return 'too few options';
  const opts = raw.map(optText);
  if (opts.some((o) => !o)) return 'empty option';
  if (new Set(opts.map(norm)).size !== opts.length) return 'duplicate options';
  var letters = opts.map(function (o) { return String(o).trim().toUpperCase(); });
  if (letters.join('') === 'ABCD' || letters.join('') === '1234') return 'placeholder options';
  if (opts.every(function (o) { return /^option [a-d]$/i.test(String(o).trim()); })) return 'placeholder options';
  if (!raw.some((o) => o && o.correct === true) && q.correct == null && q.answer == null) return 'no answer key';
  return '';
}
module.exports = { badQuestion, optText, norm };
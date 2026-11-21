// Shared duplicate detection for question banks and paper assembly.
//
// Exact string matching was not enough: model questions repeat the same fact
// with quotes, HTML entities, superscripts or slightly different wording. This
// helper normalizes hard, keeps numeric tokens (they carry the fact in maths
// and science items), and combines token overlap with quoted key phrases and
// the correct answer to catch paraphrases without merging genuinely different
// templated questions.

function normText(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&#?\w+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set((
  'which following of the in is was are what can be said about statement statements correctly ' +
  'identifies identify select choose option options given below above among from to a an as it its this that these those ' +
  'with by for on at or and not true false the'
).split(' '));

function tokens(s) {
  return new Set(normText(s).split(' ').filter(function (w) {
    if (!w) return false;
    if (/^\d+$/.test(w)) return true;
    return w.length > 2 && !STOP.has(w);
  }));
}

function jaccard(a, b) {
  const A = tokens(a), B = tokens(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

function quoted(s) {
  const out = new Set();
  const re = /['"\u201c\u201d\u2018\u2019]([^'"\u201c\u201d\u2018\u2019]{3,70})['"\u201c\u201d\u2018\u2019]/g;
  let m;
  while ((m = re.exec(String(s || '')))) {
    const n = normText(m[1]);
    if (n.length >= 4) out.add(n);
  }
  return out;
}

function sharedQuoted(a, b) {
  const A = quoted(a), B = quoted(b);
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n;
}

function answerText(q) {
  const o = (q.options || []).find(function (x) { return x && x.correct; });
  return o ? normText(o.text) : '';
}

// Returns a reason string when b duplicates a, else ''.
function duplicateReason(a, b) {
  const na = normText(a && a.text), nb = normText(b && b.text);
  if (!na || !nb) return '';
  if (na === nb) return 'exact text';
  if (na.length >= 40 && nb.length >= 40 && (na.includes(nb) || nb.includes(na))) return 'contained text';
  const j = jaccard(a.text, b.text);
  if (j < 0.55) return '';
  const q = sharedQuoted(a.text, b.text);
  const aa = answerText(a), ab = answerText(b);
  const sameAnswer = aa && aa === ab;
  if (j >= 0.82) return 'similar text (' + j.toFixed(2) + ')';
  if (j >= 0.68 && q >= 1) return 'similar text + key phrase (' + j.toFixed(2) + ')';
  if (j >= 0.55 && q >= 1 && sameAnswer) return 'similar text + key phrase + answer (' + j.toFixed(2) + ')';
  if (j >= 0.72 && sameAnswer && aa.length >= 4) return 'similar text + same answer (' + j.toFixed(2) + ')';
  return '';
}

// Greedy cluster: keep the first (lowest id) of each duplicate group.
function findDuplicates(questions) {
  const qs = (questions || []).slice().sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
  const kept = [];
  const dupes = [];
  for (const q of qs) {
    let reason = '';
    let withQ = null;
    for (const k of kept) {
      reason = duplicateReason(k, q);
      if (reason) { withQ = k; break; }
    }
    if (reason) dupes.push({ question: q, duplicateOf: withQ, reason: reason });
    else kept.push(q);
  }
  return { kept: kept, duplicates: dupes };
}

module.exports = {
  normText: normText,
  tokens: tokens,
  jaccard: jaccard,
  quoted: quoted,
  sharedQuoted: sharedQuoted,
  duplicateReason: duplicateReason,
  findDuplicates: findDuplicates
};

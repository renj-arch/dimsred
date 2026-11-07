'use strict';
// Revalidation for the invented question pool.
//
// The generator's old gates checked shape (four options, answer among them,
// no thinking leaks) but never re-did the arithmetic. A 9B model can write a
// confident solution whose own equation gives a different value from the key:
//
//   9225 - 1.05X - 21 = 4140 => 1.05X = 5064 => X = 72.50
//
// 1.05 * 72.50 is 76.125, not 5064. The item shipped because every check was
// textual. This module re-parses the numeric equations in a solution, solves
// one-variable linear relations, and compares them with each other and with
// the answer. It also checks numeric series, answer echoing and the
// self-correction markers that produce unrelated stems and answers.
//
// It is deliberately conservative: a relation it cannot parse is skipped, not
// guessed at. Hard errors are safe to quarantine; warnings are for review.

const THINK_LEAK = [
  [/\bwait\s*[,!.]/i, 'self-correction pause'],
  [/\blet'?s\s+(?:change|adjust|fix|try|assume|construct|revise|re-?do|make)\b/i, 'rewrite marker'],
  [/\blet me\s+(?:re|adjust|fix|change|try)/i, 'rewrite marker'],
  [/\b(?:my|the) (?:calculation|answer|previous (?:answer|step|attempt)) (?:is|was) wrong\b/i, 'wrong-answer note'],
  [/\boptions?\s+(?:is|are)?\s*not available\b/i, 'missing-option note'],
  [/\bdoes(?:n't| not) match (?:the )?(?:options|choices)\b/i, 'missing-option note'],
  [/\bi (?:made|make) an? (?:error|mistake)\b/i, 'error note'],
  [/\bre-?(?:calculat|evaluat|read|check|compute)/i, 'recheck marker'],
  [/\brevised (?:question|stem|scenario|calculation)\b/i, 'rewrite marker'],
  [/\bfor (?:self-)?consistency with (?:the )?options\b/i, 'option fitting'],
  [/\bto match (?:the )?options?\b/i, 'option fitting'],
  [/\b(?:correction|correct logic)\s*:/i, 'correction note'],
  [/\bthought (?:process|trace)\b/i, 'thinking trace'],
  [/\bfinal consistent scenario\b/i, 'rewrite marker'],
  [/\bthe (?:question|stem) (?:needs|should) (?:to be|be)\b/i, 'rewrite marker'],
  [/\b(?:hmm|okay)\b[,.]/i, 'filler marker'],
  [/\bactually\s*,/i, 'self-correction'],
  [/\bon second thought\b/i, 'self-correction'],
  [/\bno clear pattern\b/i, 'dead-end note'],
  [/\bthis is (?:hard|tricky)\b/i, 'dead-end note'],
  [/\bmental arithmetic\b/i, 'trace marker'],
  [/\brestart(?:ing)? (?:the )?(?:calculation|logic)\b/i, 'restart marker'],
  [/\badjust(?:ing)? (?:the )?(?:numbers|stem|question)/i, 'rewrite marker'],
  [/\bnot in (?:the )?options\b/i, 'option fitting'],
  [/\bmy setup was wrong\b/i, 'self-correction']
];

// Language that means the solution is negotiating with the question instead
// of deriving an answer. These are hard failures: a student cannot learn from
// "assume the question meant something else".
const EVASION = [
  [/\bhypothetically\b/i, 'hypothetical rewrite'],
  [/\bnot fully described\b/i, 'incomplete stem admitted'],
  [/\bwithout external (?:unprovided )?data\b/i, 'incomplete stem admitted'],
  [/\bstandard interpretation\b/i, 'undefined assumption'],
  [/\btest(?:ing)? option\b/i, 'option testing instead of derivation'],
  [/\bmatches? (?:option|the option|calculated)\b/i, 'option fitting'],
  [/\bverification with option\b/i, 'option fitting'],
  [/\bconverges? to\b/i, 'hand-waved limit'],
  [/\bthis sequence converges\b/i, 'hand-waved limit'],
  [/\broughly reduces\b/i, 'hand-waved approximation']
];

const SOFT_FLAGS = [
  [/\bassum(?:e|ing|ption)\b/i, 'assumption language'],
  [/\bapprox(?:imate|imately)?\b/i, 'approximation language'],
  [/\broughly\b/i, 'approximation language'],
  [/\bseems?\b/i, 'hedging language']
];

function str(x) { return String(x == null ? '' : x); }
function norm(x) {
  return str(x).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function numbersIn(text) {
  return (str(text).match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map(x => Number(x.replace(/,/g, '')))
    .filter(n => isFinite(n));
}
function meaningfulNumbers(nums) {
  return nums.filter(n => Math.abs(n) >= 10 || !Number.isInteger(n));
}
function close(a, b, tol) {
  if (!isFinite(a) || !isFinite(b)) return false;
  const t = tol == null ? 0.02 : tol;
  return Math.abs(a - b) <= Math.max(0.02, t * Math.max(Math.abs(a), Math.abs(b)));
}

// ---------------------------------------------------------------------------
// A small linear-expression parser. It only accepts numbers, + - * / ^ ( ),
// and at most one single-letter variable. Everything else returns null, which
// means "not a relation this checker can judge" rather than "wrong".
// ---------------------------------------------------------------------------
function parseExpr(input) {
  let src = str(input)
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    // "25% of 8200" and "85% * 90%" are multiplications; a bare "23.5%"
    // is a unit label. Treating every % as /100 made 23.5% = x look like
    // 0.235 = x, while treating none as /100 made 85% * 90% look like 7650.
    .replace(/(\d+(?:\.\d+)?)\s*%\s*of\b/gi, '($1/100)*')
    .replace(/(\d+(?:\.\d+)?)\s*%\s*(?=[*×])/g, '($1/100)*')
    .replace(/([*×])\s*(\d+(?:\.\d+)?)\s*%/g, '$1($2/100)')
    // "125 - 10%" is shorthand for "subtract 10% of 125", not 10. Do not
    // pretend it is a relation; skip the clause instead of calling it wrong.
    ;
  if (/[+\-]\s*\d+(?:\.\d+)?\s*%/.test(src)) return null;
  src = src.replace(/%/g, '');
  src = src
    .replace(/\*\*/g, '*')
    .replace(/[₹$]/g, '')
    .replace(/\bRs\.?/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  if (!src) return null;
  // A2, H2O, CP, SI are labels, not products/variables. Only a standalone
  // single letter is a variable this checker can solve for.
  if (/[A-Za-z]\d/.test(src)) return null;
  const letters = src.match(/[A-Za-z]+/g) || [];
  for (const run of letters) if (run.length > 1) return null;
  const vars = new Set(letters.map(x => x.toLowerCase()));
  if (vars.size > 1) return null;
  const variable = vars.size ? Array.from(vars)[0] : '';
  // Tokenise. Implicit multiplication (2x, x(3), )( ) is normalised first.
  const text = src
    .replace(/(\d)([A-Za-z])/g, '$1*$2')
    .replace(/([A-Za-z])(\d)/g, '$1*$2')
    .replace(/\)([A-Za-z0-9(])/g, ')*$1')
    .replace(/([A-Za-z0-9)])\(/g, '$1*(');
  if (!/^[0-9A-Za-z.+\-*/^()*]+$/.test(text)) return null;
  const tokens = text.match(/\d+(?:\.\d+)?|[A-Za-z]|[+\-*/^()]/g);
  if (!tokens || tokens.join('').replace(/\*/g, '') !== text.replace(/\*/g, '')) return null;
  let i = 0;
  function peek() { return tokens[i]; }
  function take() { return tokens[i++]; }
  function primary() {
    const t = take();
    if (t == null) return null;
    if (/^\d/.test(t)) return { a: 0, b: Number(t) };
    if (/^[A-Za-z]$/.test(t)) return { a: 1, b: 0 };
    if (t === '(') {
      const e = add();
      if (!e || take() !== ')') return null;
      return e;
    }
    if (t === '-') {
      const e = primary();
      return e && { a: -e.a, b: -e.b };
    }
    if (t === '+') return primary();
    return null;
  }
  function power() {
    let base = primary();
    if (!base) return null;
    while (peek() === '^') {
      take();
      const exp = primary();
      if (!exp || exp.a !== 0 || !Number.isInteger(exp.b) || exp.b < 0) return null;
      if (exp.b === 1) continue;
      if (base.a !== 0) return null;
      base = { a: 0, b: Math.pow(base.b, exp.b) };
    }
    return base;
  }
  function mul() {
    let left = power();
    if (!left) return null;
    while (peek() === '*' || peek() === '/') {
      const op = take();
      const right = power();
      if (!right) return null;
      if (op === '*') {
        if (left.a !== 0 && right.a !== 0) return null;
        left = { a: left.a * right.b + right.a * left.b, b: left.b * right.b };
      } else {
        if (right.a !== 0 || right.b === 0) return null;
        left = { a: left.a / right.b, b: left.b / right.b };
      }
    }
    return left;
  }
  function add() {
    let left = mul();
    if (!left) return null;
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const right = mul();
      if (!right) return null;
      left = { a: left.a + (op === '+' ? right.a : -right.a), b: left.b + (op === '+' ? right.b : -right.b) };
    }
    return left;
  }
  const out = add();
  if (!out || i !== tokens.length) return null;
  return { a: out.a, b: out.b, variable: variable };
}

function solveRelation(left, right) {
  const L = parseExpr(left);
  const R = parseExpr(right);
  if (!L || !R) return null;
  const a = L.a - R.a;
  const b = L.b - R.b;
  if (Math.abs(a) < 1e-12) {
    return { kind: 'constant', lhs: L.b, rhs: R.b, variable: '' };
  }
  return { kind: 'root', root: -b / a, variable: (L.variable || R.variable || '?') };
}

function cleanClause(s) {
  return str(s)
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/≈/g, '=')
    .replace(/(?<=\d),(?=\d)/g, '')
    .replace(/^\s*(?:step\s*)?\d+\s*[).:]\s+/i, '')
    .replace(/^\s*(?:so|thus|hence|therefore|then|and|or)\s+/i, '')
    .trim();
}

function cleanSide(s) {
  let t = str(s).trim();
  t = t.replace(/^(?:step\s*)?\d+\s*[).:]\s+/i, '');
  t = t.replace(/^(?:so|thus|hence|therefore|then|and|or|where)\s+/i, '');
  t = t.replace(/[.!?;]+$/, '');
  t = t.replace(/^[₹$]\s*/, '');
  t = t.replace(/^Rs\.?\s*/i, '');
  // A unit suffix is outside the expression.
  t = t.replace(/\s+(?:days?|hours?|hrs?|minutes?|mins?|years?|months?|km\/h|km|m|sq\.?\s*m\.?|kg|grams?|litres?|units?|marks?|words?)\s*$/i, '');
  // Strip exactly one leading label: "Total Cost: 8200" is checkable, but
  // "CP + Half Initial Profit" is not an expression this parser understands.
  t = t.replace(/^[A-Za-z][A-Za-z ()/%-]{0,28}:\s*/, '');
  return t;
}
function parseSide(s) {
  const t = cleanSide(s);
  // Any surviving word of 2+ letters is a label or prose. Do not guess at
  // it: "CP - SP" and "Half Initial Profit" are not arithmetic claims we can
  // adjudicate, and treating their letters as variables produced false
  // contradictions in perfectly good solutions.
  if (/[A-Za-z]{2,}/.test(t)) return null;
  return parseExpr(t);
}

function relationsIn(solution) {
  const out = [];
  const clauses = str(solution)
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/≈/g, '=')
    .replace(/(?<=\d),(?=\d)/g, '')
    // Keep decimal points, but split sentences so two unrelated statements
    // on one line ("Discount A = 15%. Remaining = 85%.") do not become a
    // fake chain of equalities.
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])|\n|=>|;|,(?=\s*[A-Za-z0-9(])/);
  for (const raw of clauses) {
    const clause = cleanClause(raw);
    if (clause.indexOf('=') < 0) continue;
    const parts = clause.split(/\s*=\s*/);
    for (let i = 0; i < parts.length - 1; i++) {
      // Percentages are unit labels far more often than factors ("23.5% = x",
      // "125 - 10%"). A parser that guesses produces false contradictions, so
      // skip these clauses entirely; the equations that catch bad keys are
      // written as plain arithmetic.
      if (/%/.test(parts[i]) || /%/.test(parts[i + 1])) continue;
      const left = parseSide(parts[i]);
      const right = parseSide(parts[i + 1]);
      if (!left || !right) continue;
      const a = left.a - right.a;
      const b = left.b - right.b;
      if (Math.abs(a) < 1e-12) {
        out.push({ kind: 'constant', lhs: left.b, rhs: right.b, variable: '' });
      } else {
        out.push({ kind: 'root', root: -b / a, variable: left.variable || right.variable || '?' });
      }
      if (process.env.INVENTED_DEBUG) {
        console.error('[rel]', JSON.stringify(parts[i]), '=', JSON.stringify(parts[i + 1]), out[out.length - 1]);
      }
    }
  }
  return out;
}

function answerValue(q) {
  const nums = numbersIn(q && q.answer);
  if (nums.length !== 1) return null;
  return nums[0];
}

function checkRelations(q, errors) {
  const rels = relationsIn(q.solution);
  const constants = rels.filter(r => r.kind === 'constant');
  for (const r of constants) {
    if (!close(r.lhs, r.rhs, 0.01)) {
      errors.push('arithmetic mismatch: ' + round(r.lhs) + ' vs ' + round(r.rhs));
      break;
    }
  }
  const roots = rels.filter(r => r.kind === 'root');
  const byVar = {};
  roots.forEach(r => { (byVar[r.variable] = byVar[r.variable] || []).push(r.root); });
  Object.keys(byVar).forEach(function (v) {
    const xs = byVar[v];
    const min = Math.min.apply(null, xs);
    const max = Math.max.apply(null, xs);
    if (!close(min, max, 0.02) && Math.abs(max - min) > 0.5) {
      errors.push('solution contradicts itself for ' + v + ': ' + xs.map(round).join(' vs '));
    }
  });
  const key = answerValue(q);
  const variables = Object.keys(byVar);
  // Compare with the key only when the solution has one variable to solve
  // for. P=10000, R=5, T=1 are definitions, not competing answers; treating
  // every root as an answer falsely rejected perfectly good questions.
  if (key != null && variables.length === 1) {
    const xs = byVar[variables[0]];
    const consistent = xs.every(x => close(x, xs[0], 0.02));
    if (consistent && !close(xs[0], key, 0.02)) {
      errors.push('solution solves ' + variables[0] + ' to ' + round(xs[0]) + ' but key is ' + key);
    }
  }
}

function round(n) {
  return Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 1000) / 1000;
}

// Numeric series: only simple, unambiguous patterns. A missing pattern is
// "unknown", never an error, so ordinary reasoning items are not punished.
function seriesNext(stem) {
  const s = str(stem);
  if (!/(series|sequence|next term|next number|missing term|missing number|what follows|comes next)/i.test(s)) return null;
  const matches = s.match(/-?\d[\d,]*(?:\.\d+)?/g);
  if (!matches || matches.length < 4) return null;
  const nums = matches.map(x => Number(x.replace(/,/g, ''))).filter(n => isFinite(n));
  if (nums.length < 4) return null;
  const n = nums.length;
  const diffs = [];
  for (let i = 1; i < n; i++) diffs.push(nums[i] - nums[i - 1]);
  if (diffs.every(d => Math.abs(d - diffs[0]) < 1e-9)) return nums[n - 1] + diffs[0];
  const ratios = [];
  for (let i = 1; i < n; i++) if (nums[i - 1] !== 0) ratios.push(nums[i] / nums[i - 1]);
  if (ratios.length && ratios.every(r => Math.abs(r - ratios[0]) < 1e-9)) return nums[n - 1] * ratios[0];
  const second = [];
  for (let i = 1; i < diffs.length; i++) second.push(diffs[i] - diffs[i - 1]);
  if (second.every(d => Math.abs(d - second[0]) < 1e-9)) return nums[n - 1] + diffs[diffs.length - 1] + second[0];
  return null;
}

function auditQuestion(q) {
  const errors = [];
  const warnings = [];
  const stem = str(q && q.stem).trim();
  const solution = str(q && q.solution).trim();
  const options = Array.isArray(q && q.options) ? q.options.map(x => str(x).trim()).filter(Boolean) : [];
  const answer = str(q && q.answer).trim();
  const section = str(q && q.section);

  if (stem.length < 15 || stem.length > 900) errors.push('stem length ' + stem.length);
  if (options.length !== 4) errors.push('options count ' + options.length);
  else if (new Set(options.map(o => o.toLowerCase())).size !== 4) errors.push('duplicate options');
  else if (options.every(o => /^\[?[A-D]\]?[).:]?$/.test(o)) &&
    /(^|\n)\s*['"]?[A-D][).:]\s+\S/.test(stem)) {
    // Options that are only A/B/C/D labels. Person-name options (A, B, C, D)
    // are legitimate in blood-relation questions, so require the stem to
    // actually carry lettered choices before calling this a defect.
    errors.push('options are only letters');
  }
  if (!answer) errors.push('answer missing');
  else if (!options.some(o => o === answer || o.toLowerCase() === answer.toLowerCase())) {
    errors.push('answer not among options');
  }
  if (solution.length < 8) errors.push('solution too short');
  if (!str(q && q.style).trim()) warnings.push('style label missing');
  if (!str(q && q.topic).trim()) warnings.push('topic label missing');

  const leakText = solution + '\n' + str(q && q.hint);
  for (const p of THINK_LEAK) if (p[0].test(leakText)) { errors.push('solution leak: ' + p[1]); break; }
  for (const p of EVASION) if (p[0].test(solution)) { errors.push('evasive solution: ' + p[1]); break; }
  for (const p of SOFT_FLAGS) if (p[0].test(solution)) { warnings.push(p[1]); break; }

  const ansNums = meaningfulNumbers(numbersIn(answer));
  if (ansNums.length === 1) {
    const on = numbersIn(solution);
    if (!on.some(n => close(n, ansNums[0], 0.001))) {
      // A date ("2024") inside a full-sentence English option is not an
      // arithmetic answer. Only quant keys are required to be recomputed.
      (section === 'quant' ? errors : warnings).push('answer value absent from the solution');
    }
  } else if (answer && answer.length <= 80) {
    const keyTokens = norm(answer).split(' ').filter(w => w.length >= 4);
    const sol = norm(solution);
    if (keyTokens.length && !keyTokens.some(w => sol.indexOf(w) !== -1)) {
      warnings.push('answer wording not echoed in the solution');
    }
  }

  if (section === 'quant') {
    if (!/\d/.test(stem)) errors.push('quant stem has no numbers');
    if (options.length === 4 && options.every(o => /^[A-D]\.?$/i.test(o))) errors.push('quant options are only letters');
    const given = meaningfulNumbers(numbersIn(stem));
    if (new Set(given).size >= 2) {
      const solNums = numbersIn(solution);
      if (!given.some(g => solNums.some(n => close(n, g, 0.0001)))) {
        errors.push('solution uses none of the stem numbers');
      }
    }
    if (relationsIn(solution).length === 0) warnings.push('quant solution has no checkable equation');
    checkRelations(q, errors);
    const next = seriesNext(stem);
    const key = answerValue(q);
    if (next != null && key != null && !close(next, key, 0.01)) {
      errors.push('series predicts ' + round(next) + ' but key is ' + key);
    }
  } else if (section === 'reasoning') {
    const next = seriesNext(stem);
    const key = answerValue(q);
    if (next != null && key != null && !close(next, key, 0.01)) {
      errors.push('series predicts ' + round(next) + ' but key is ' + key);
    }
  }

  const stemTokens = norm(stem).split(' ').filter(w => w.length >= 4);
  const solNorm = norm(solution + ' ' + answer);
  const shared = stemTokens.filter(w => solNorm.indexOf(w) !== -1).length;
  if (stemTokens.length >= 6 && shared === 0) warnings.push('solution shares no meaningful word with the stem');
  if (/\.\.\.\s*$/.test(stem)) warnings.push('stem ends mid-sentence');
  if (!/[.!?)]\s*$/.test(solution)) warnings.push('solution has no closing punctuation');

  return { ok: errors.length === 0, errors: errors, warnings: warnings };
}

module.exports = {
  auditQuestion,
  parseExpr,
  relationsIn,
  seriesNext,
  numbersIn,
  close
};

// CLI convenience: `node scripts/lib/invented-quality.js <questions.json>`
if (require.main === module) {
  const fs = require('fs');
  const path = process.argv[2] || path.join('data', 'invented', 'questions.json');
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const items = data.questions || data;
  let bad = 0;
  items.forEach(function (q) {
    const r = auditQuestion(q);
    if (!r.ok) {
      bad++;
      console.log('FAIL ' + q.id + '  ' + r.errors.join('; '));
    } else if (r.warnings.length) {
      console.log('WARN ' + q.id + '  ' + r.warnings.join('; '));
    }
  });
  console.log('\n' + (items.length - bad) + ' ok, ' + bad + ' failed, ' + items.length + ' total');
  process.exit(bad ? 1 : 0);
}

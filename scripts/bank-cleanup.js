#!/usr/bin/env node
/**
 * bank-cleanup.js — quality gate + repair for question-bank/*.json
 *
 * WHY THIS EXISTS
 * The 2026-09 banks (cgl, gate, jee, neet, rbi) were filled by a legacy
 * API-key generation pipeline that had three production bugs:
 *   1. Token-join corruption: spaces inserted mid-word ("locat ed",
 *      "Wher eis the J awaharlal Nehru S tadium") — a broken detokenizer.
 *   2. Unicode stripping (_fix-unicode.js): Devanagari and math symbols
 *      were deleted, leaving blank gaps and formulas like "X= =14705".
 *   3. HTML entities written raw into text ("India&#39;s", "&quot;").
 * Plus the LLM often omitted the "section" field entirely, and the mock
 * generator used to stamp a random section name on such questions — which
 * is how a Geography question ended up under "General Intelligence".
 *
 * WHAT THIS SCRIPT DOES
 *   audit mode (default):  reports how much of each bank is corrupt.
 *   --fix:                 decodes entities, repairs single mid-word
 *                          splits that rejoin into a real word, drops the
 *                          rest, and classifies missing sections with a
 *                          conservative keyword scorer. Writes banks in place.
 *
 *   node scripts/bank-cleanup.js                audit
 *   node scripts/bank-cleanup.js --fix          repair + drop + write
 *   node scripts/bank-cleanup.js --fix --exams=cgl,rbi
 *
 * Detection signals:
 *   ENT   — HTML entity that survived decoding
 *   EQEQ  — "= =" style garbled math (fraction flattener damage)
 *   GAP   — 3+ consecutive spaces (stripped Devanagari left holes)
 *   SPLIT — adjacent words that rejoin into a dictionary word while one
 *           fragment alone is not a word ("locat ed" -> "located")
 *   RARE  — many lowercase tokens absent from the site vocabulary that are
 *           not plausible proper nouns (fragment soup like "appr opriat esynonym")
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var BANK_DIR = path.join(ROOT, 'question-bank');
var EXAMS_ALL = ['cgl', 'gate', 'jee', 'neet', 'rbi'];
// Ambiguous corruption: both fragments are real words, so repairing would be a
// guess ("averages core" could be "average score" or stay "averages core";
// "Ten per sons are sitting" could be "persons" or "per sons"). Dropped rather
// than guessed — ship nothing rather than junk.
var MANUAL_DROPS = {
  cgl: [15, 40, 41, 47, 53, 57, 82, 85]
};
var SKIP_DIRS = new Set(['node_modules', '.git', 'question-bank', 'papers-data', 'data']);

// ---------------------------------------------------------------- vocabulary

// Common short words added unconditionally so "is true" style false splits
// never fire (the vocab builder only keeps 2+ occurrences, which can miss "is").
var COMMON = ('a an the of to in is it as at on or by be we he she no so up us if do my me go am are was were i ' +
  'and for not you all can has had its out one two our who why how get got may new now old see use way who did ' +
  'day man men ask ran ran big say her his him put red run set sit six ten top try yes yet own too any few far op').split(/\s+/);
var COMMON_SET = new Set(COMMON);

function buildVocab() {
  var any = new Map();    // broad: js + scripts + html (used for join/split tests)
  var strong = new Map(); // strong: comments/text only (used by strict mode)
  function feed(map, text) {
    // Only learn lowercase/mixed-case words. Tokens that appear in all caps in
    // the source are acronyms or labels (ISI, NCR, EASY) — if they entered the
    // vocabulary lowercased they would disguise corruption fragments ("isi ncr
    // eased") as legitimate words.
    var re = /[A-Za-z]{2,18}/g, m;
    while ((m = re.exec(text))) {
      var t = m[0];
      if (t === t.toUpperCase()) continue;
      var low = t.toLowerCase();
      map.set(low, (map.get(low) || 0) + 1);
    }
  }
  function feedFile(fp, mapStrong) {
    try {
      // never learn from this file: its comments quote corruption examples
      // ("locat ed", "S tadium") which would otherwise poison the vocabulary
      if (/bank-cleanup\.js$/i.test(fp)) return;
      var st = fs.statSync(fp);
      if (!st.isFile() || st.size > 3 * 1024 * 1024) return;
      var text = fs.readFileSync(fp, 'utf8');
      var isHtml = /\.html$/i.test(fp);
      if (isHtml) {
        // strip script/style/data blobs so base64 noise never enters the vocab
        text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                   .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                   .replace(/data:[^"'\s)]{60,}/g, ' ')
                   .replace(/<[^>]+>/g, ' ');
      }
      // the strong vocabulary (strict mode) never learns from JS code files:
      // identifiers like "sis"/"est"/"countr" must not count as English words.
      var isScriptDir = /[\\/]scripts[\\/]/i.test(fp);
      feed(any, text);
      if (mapStrong && (isHtml || isScriptDir)) feed(strong, text);
    } catch (e) {}
  }
  function walk(dir, depth, mapStrong) {
    if (depth < 0 || !fs.existsSync(dir)) return;
    var entries;
    try { entries = fs.readdirSync(dir); } catch (e) { return; }
    for (var i = 0; i < entries.length; i++) {
      var f = entries[i];
      var fp = path.join(dir, f);
      if (SKIP_DIRS.has(f)) continue;
      var st;
      try { st = fs.statSync(fp); } catch (e) { continue; }
      if (st.isDirectory()) { walk(fp, depth - 1, mapStrong); continue; }
      if (/\.(js|html)$/.test(f)) feedFile(fp, mapStrong);
    }
  }
  walk(path.join(ROOT, 'scripts'), 0, true);   // scripts are mostly English comments
  walk(ROOT, 1, true);                        // root + one-level dirs (js, exam pages)
  var V = new Set(), VS = new Set();
  any.forEach(function (c, w) { if (c >= 2) V.add(w); });
  strong.forEach(function (c, w) { if (c >= 2) VS.add(w); });
  COMMON_SET.forEach(function (w) { V.add(w); VS.add(w); });
  return { any: V, strong: VS };
}

// ------------------------------------------------------------------ repair

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d{2,5});/g, function (m, n) { var c = parseInt(n, 10); return c >= 32 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&#x([0-9a-f]{2,5});/gi, function (m, n) { var c = parseInt(n, 16); return c >= 32 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// UTF-8 text that was once decoded as windows-1252 shows up as mojibake
// ("âˆš" for "√", "â‚‚" for "₂", "Clâ‚‚" for "Cl₂"). Reverse it by decoding
// each mojibake *run* back to UTF-8. Decoding run-by-run (instead of the whole
// string) keeps genuine characters like "•" or "é" — which map to high bytes —
// from poisoning the decode.
var CP1252_HIGH = {
  '\u20AC': 0x80,
  '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
  '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E,
  '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96,
  '\u2014': 0x97, '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F
};

function fixMojibake(s) {
  if (!/[ÂÃâ]/.test(s)) return s;
  var CONT = '\u0080-\u00BF\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178\u20AC';
  var RUN = new RegExp('[\u00C0-\u00C3\u00E0-\u00EF\u00F0][' + CONT + ']+', 'g');
  return s.replace(RUN, function (seq) {
    var bytes = [];
    for (var i = 0; i < seq.length; i++) {
      var ch = seq[i], cc = seq.charCodeAt(i);
      if (cc <= 0xFF) bytes.push(cc);
      else if (CP1252_HIGH[ch] !== undefined) bytes.push(CP1252_HIGH[ch]);
      else return seq;
    }
    var dec = Buffer.from(bytes).toString('utf8');
    if (dec === '' || dec.indexOf('\uFFFD') !== -1) return seq;
    return dec;
  });
}

// A fragment counts as a real word only if it is long enough to be reliable in
// the site vocabulary, or is on the common short-word list. This keeps JS
// identifiers ("ar", "ea", "el") from being treated as legitimate words.
function isWord(t, V) {
  if (COMMON_SET.has(t)) return true;
  return t.length >= 3 && V.has(t);
}

// Like isWord, but hyphenated compounds pass when every part is a real word
// ("op-amp" -> "op" + "amp"), so split-shift repairs can rejoin them.
function isWordTok(t, V) {
  if (isWord(t, V)) return true;
  if (t.indexOf('-') === -1) return false;
  var parts = t.split('-');
  if (parts.length < 2) return false;
  for (var i = 0; i < parts.length; i++) { if (parts[i] && !isWord(parts[i], V)) return false; }
  return true;
}

function keepCase(a, joined) {
  return (a[0] === a[0].toUpperCase() && a[0] !== a[0].toLowerCase()) ? a[0] + joined.slice(1) : joined;
}

// Rejoin adjacent fragments when the joined form is a real word and at least
// one fragment alone is not ("locat ed" -> "located", "S tadium" -> "Stadium").
// Rules:
//   A0  single capital letter joins ("S tadium"   -> "Stadium")
//   C   triple fragments join       ("alt ernativ es" -> "alternatives")
//   A   two fragments join          ("locat ed"   -> "located")
//   B   split shifts across the gap ("Wher eis"   -> "Where is")
//   D   stray single letter trails  ("COUNTR Y"   -> "COUNTRY")
//
// Implemented as a token walk rather than consecutive regex replaces: a global
// replace consumes its matches, so in "sardar vallabh bhai patel" the pair
// ("vallabh","bhai") was never even tested because "sardar vallabh" had already
// consumed the first word. The walk evaluates every overlapping pair.
function repairWordSplits(text, V) {
  var s = String(text);
  for (var pass = 0; pass < 4; pass++) {
    var next = repairOnePass(s, V);
    if (next === s) break;
    s = next;
  }
  return s;
}

function tryJoinRules(w1, w2, w3, V) {
  var j1 = w1.toLowerCase(), j2 = w2.toLowerCase();

  // A0: single capital letter + lowercase fragment ("S tadium", "W omen").
  // When the fragment is itself a word ("omen"), only a letter that is not a
  // word/article ("A", "I") may absorb it — otherwise "A man" could become
  // "Aman". In that case the joined form must be a known word.
  if (w1.length === 1 && w1 === w1.toUpperCase() && !COMMON_SET.has(j1) &&
      w2.length >= 3 && w2 === j2 && (!isWord(j2, V) || (j1 !== 'a' && j1 !== 'i'))) {
    var joinedA0 = j1 + j2;
    if (V.has(joinedA0) || (!isWord(j2, V) && joinedA0.length >= 6)) return { text: w1 + w2, consumed: 3 };
  }

  // C: triple join (requires a third word)
  if (w3) {
    var j3 = w3.toLowerCase();
    if (w1.length >= 2 && w1.length <= 14 && w2.length >= 2 && w2.length <= 14 && w3.length >= 2 && w3.length <= 14 &&
        j1 === w1 && j2 === w2 && j3 === w3) {
      var joinedC = j1 + j2 + j3;
      if (joinedC.length <= 22 && isWord(joinedC, V) &&
          !(isWord(j1, V) && isWord(j2, V) && isWord(j3, V)) &&
          !isWord(j1 + j2, V) && !isWord(j2 + j3, V)) {
        return { text: keepCase(w1, joinedC), consumed: 5 };
      }
      // fallback: the three fragments may really be two words
      // ("isi ncr eased" -> "isincreased" -> "is increased"); prefer the
      // longest first word ("locat ed in" -> "located in", not "locate din")
      if (!(isWord(j1, V) && isWord(j2, V) && isWord(j3, V)) && joinedC.length >= 5) {
        var bestC = null;
        for (var kC = 2; kC <= joinedC.length - 2; kC++) {
          var xC = joinedC.slice(0, kC), yC = joinedC.slice(kC);
          if (isWord(xC, V) && isWord(yC, V)) {
            if (!bestC || xC.length > bestC.x.length) bestC = { x: xC, y: yC };
          }
        }
        if (bestC) return { text: keepCase(w1, bestC.x) + ' ' + bestC.y, consumed: 5 };
      }
    }
  }

  // A: two fragments join. Single-letter fragments on either side are left to
  // rules A0/D, otherwise junk vocab ("cand", "ofc") merges "son of C and the"
  // into "son of Cand the".
  var joinedA = j1 + j2;
  if (j1.length !== 1 && j2.length !== 1 && joinedA.length <= 20 && isWord(joinedA, V) &&
      (!isWord(j1, V) || !isWord(j2, V)) && !(isWord(j1, V) && isWord(j2, V))) {
    var bothUp = (w1 === w1.toUpperCase() && w2 === w2.toUpperCase());
    return { text: bothUp ? joinedA.toUpperCase() : keepCase(w1, joinedA), consumed: 3 };
  }

  // E: the two fragments actually concatenate into two *different* words
  // ("code das" -> "coded as"). Only attempted when at least one fragment is
  // not a real word — re-splitting two valid words ("run sin") is a coin flip
  // that would oscillate between readings across repair passes.
  // Among candidate re-splits prefer the longest first word, and apply it only
  // when it beats the current reading ("idea lop-amp" -> "ideal op-amp" holds,
  // because the reverse split would shave a letter off the better word).
  if (joinedA.length >= 5 && !isWord(joinedA, V) && !(isWord(j1, V) && isWord(j2, V))) {
    var bestE = null;
    for (var kE = 2; kE <= joinedA.length - 2; kE++) {
      var xE = joinedA.slice(0, kE), yE = joinedA.slice(kE);
      if (xE === j1 || yE === j2) continue;
      if (isWord(xE, V) && isWordTok(yE, V)) {
        if (!bestE || xE.length > bestE.x.length) bestE = { x: xE, y: yE };
      }
    }
    if (bestE && bestE.x.length > j1.length) return { text: keepCase(w1, bestE.x) + ' ' + bestE.y, consumed: 3 };
  }

  // B: split shift — "number sis" -> "numbers is", "Wher eis" -> "Where is"
  if (w2.length >= 3 && j2 === w2 && !(isWord(j1, V) && isWord(j2, V))) {
    for (var k = 1; k <= j2.length - 2; k++) {
      var x = j1 + j2.slice(0, k), y = j2.slice(k);
      if (isWord(x, V) && isWordTok(y, V)) return { text: keepCase(w1, x) + ' ' + y, consumed: 3 };
    }
  }

  // D: stray single letter trailing a fragment ("COUNTR Y" -> "COUNTRY")
  if (w2.length === 1) {
    if (!COMMON_SET.has(j2)) {
      var bothUpper = (w1 === w1.toUpperCase() && w2 === w2.toUpperCase());
      if (bothUpper || !isWord(j1, V)) {
        var joinedD = j1 + j2;
        if (isWord(joinedD, V)) {
          if (bothUpper) return { text: joinedD.toUpperCase(), consumed: 3 };
          return { text: keepCase(w1, joinedD), consumed: 3 };
        }
      }
    }
  }

  return null;
}

function repairOnePass(s, V) {
  var raw = s.split(/([A-Za-z]+(?:-[A-Za-z]+)*|[0-9]+|\s+|[^A-Za-z0-9\s]+)/);
  var tok = [];
  for (var i = 1; i < raw.length; i += 2) tok.push(raw[i]);
  var out = [], i2 = 0;
  var isSpace = function (t) { return t !== undefined && /^[ \t]+$/.test(t); };
  var isTokW = function (t) { return t !== undefined && /^[A-Za-z]+(?:-[A-Za-z]+)*$/.test(t); };
  while (i2 < tok.length) {
    if (isTokW(tok[i2]) && isSpace(tok[i2 + 1]) && isTokW(tok[i2 + 2])) {
      var w3 = (isSpace(tok[i2 + 3]) && isTokW(tok[i2 + 4])) ? tok[i2 + 4] : null;
      var res = tryJoinRules(tok[i2], tok[i2 + 2], w3, V);
      if (res) { out.push(res.text); i2 += res.consumed; continue; }
    }
    out.push(tok[i2]);
    i2++;
  }
  return out.join('');
}

// ---------------------------------------------------------------- detectors

function pairSplitHits(text, V) {
  var s = String(text), out = 0;
  var words = [], re = /[a-z]{2,20}/g, m;
  s = s.toLowerCase();
  while ((m = re.exec(s))) words.push({ w: m[0], i: m.index, e: m.index + m[0].length });
  function digitAdjacent(idx0, end) {
    // "48th in" / "ch4 is": letters glued to digits are fragments of a unit,
    // not standalone words — never treat them as split candidates
    var before = s[idx0 - 1], after = s[end];
    return (/[0-9]/.test(before || '')) || (/[0-9]/.test(after || ''));
  }
  for (var k = 0; k < words.length - 1; k++) {
    var a = words[k], b = words[k + 1];
    var gap = s.slice(a.e, b.i);
    if (!/^ +$/.test(gap)) continue;
    if (digitAdjacent(a.i, a.e) || digitAdjacent(b.i, b.e)) continue;
    var j = a.w + b.w;
    if (j.length > 20) continue;
    if (V.has(j) && j.length >= 4 && (!isWord(a.w, V) || !isWord(b.w, V))) out++;
  }
  return out;
}

var UNITS = new Set(['sq', 'cm', 'km', 'kg', 'ml', 'mm', 'sec', 'min', 'hrs', 'hr', 'rs', 'inr', 'nos', 'yr', 'yrs', 'ltd', 'pvt', 'avg', 'std', 'viz', 'etc']);

function rareTokens(text, V) {
  var out = [], re = /\b([A-Za-z]{3,18})\b/g, m;
  text = String(text);
  while ((m = re.exec(text))) {
    var tok = m[1];
    if (tok !== tok.toLowerCase()) continue;   // keep proper nouns out of the count
    if (UNITS.has(tok)) continue;
    if (V.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

function inspectQuestion(q, V, Vstrong) {
  var text = (q.text || '') + ' || ' + (q.options || []).map(function (o) { return o.text || ''; }).join(' || ') + ' || ' + (q.solution || '');
  var reasons = [];
  if (/&#?\w+;/.test(text)) reasons.push('ENT');
  if (/=\s*=/.test(text)) reasons.push('EQEQ');
  // whitespace holes between letters = stripped Devanagari/symbols. Runs that
  // touch punctuation or asterisks are markdown layout, not data loss.
  if (/[A-Za-z]\s{3,}[A-Za-z]/.test(text)) reasons.push('GAP');
  // apostrophe damage: doubled quotes ("mother' ''s") or a possessive whose
  // trailing word is not a real word ("India' srecent"). Quoted phrases like
  // "'FLOWER' is" stay untouched because "is" is a real word.
  var aposBad = /''/.test(text);
  if (!aposBad) {
    var are = /[A-Za-z]'\s+([a-z]+)\b/g, am;
    while ((am = are.exec(text))) {
      if (!isWord(am[1], V)) { aposBad = true; break; }
    }
  }
  if (aposBad) reasons.push('APOS');
  // stripped math: "m + = 6" (lost operand) or "6sqrt6" (lost superscript)
  if (/[+\-*/]\s*=/.test(text) || /\d\s*sqrt\d/i.test(text)) reasons.push('MATH');
  var splits = pairSplitHits(text, V);
  if (splits > 0) reasons.push('SPLIT:' + splits);
  var rare = rareTokens(text, V);
  if (rare.length >= 5) reasons.push('RARE:' + rare.length);
  var rareStrong = Vstrong ? rareTokens(text, Vstrong) : [];
  return { reasons: reasons, rare: rare, rareStrong: rareStrong, splits: splits };
}

// ----------------------------------------------------------------- sections

var SECTION_KEYWORDS = {
  'General Intelligence & Reasoning': ['analogy', 'coding', 'coded', 'blood', 'direction', 'seating', 'sitting', 'syllogism', 'series', 'letter-cluster', 'letter cluster', 'mirror', 'water image', 'figure', 'odd one', 'ranking', 'order', 'arrangement', 'puzzle', 'dice', 'cube', 'classification', 'word formation', 'jumbled', 'statement', 'conclusion', 'pair', 'pattern', 'number series', 'missing number', 'matrix'],
  'General Awareness': ['president', 'prime minister', 'article', 'constitution', 'parliament', 'lok sabha', 'rajya sabha', 'history', 'dynasty', 'empire', 'harappan', 'vedic', 'mughal', 'british', 'river', 'capital', 'currency', 'scheme', 'yojana', 'award', 'national', 'state', 'country', 'city', 'treaty', 'climate', 'mountain', 'dance', 'festival', 'sport', 'cup', 'physics', 'chemistry', 'biology', 'science', 'disease', 'vitamin', 'bank', 'rbi', 'sebi', 'gdp', 'tax', 'budget', 'insurance', 'ministry', 'united nations', 'world', 'day', 'scheme', 'mission', 'satellite', 'isro', 'population', 'birth', 'death', 'anthology', 'fiction', 'novel', 'author', 'poet', 'play', 'theatre', 'book', 'literature'],
  'Quantitative Aptitude': ['ratio', 'percent', 'profit', 'loss', 'interest', 'average', 'speed', 'distance', 'time', 'work', 'mixture', 'area', 'volume', 'perimeter', 'angle', 'triangle', 'circle', 'equation', 'simplify', 'number', 'decimal', 'fraction', 'hcf', 'lcm', 'age', 'partnership', 'mensuration', 'probability', 'statistics', 'data interpretation', 'table', 'graph', 'men', 'days', 'rupees', 'cost price', 'selling price', 'discount'],
  'English Comprehension': ['synonym', 'antonym', 'spelling', 'spelt', 'idiom', 'phrase', 'grammar', 'sentence', 'blank', 'error', 'voice', 'speech', 'cloze', 'paragraph', 'passage', 'word', 'meaning', 'article', 'preposition', 'tense', 'verb', 'noun', 'adjective', 'active', 'passive', 'direct', 'indirect', 'rearrange', 'substitution', 'form of the sentence', 'correct form'],
  'English Language': null, // alias
  'General Intelligence': null,
  'Mathematics': null,
  'English': null,
  'Reasoning': null,
  'General Knowledge': null,
  'General Studies': null,
  'Current Affairs': null,
  'Science': null,
  'Physics': null,
  'Chemistry': null,
  'Biology': null
};
SECTION_KEYWORDS['English Language'] = SECTION_KEYWORDS['English Comprehension'];
SECTION_KEYWORDS['English'] = SECTION_KEYWORDS['English Comprehension'];
SECTION_KEYWORDS['General Intelligence'] = SECTION_KEYWORDS['General Intelligence & Reasoning'];
SECTION_KEYWORDS['Reasoning'] = SECTION_KEYWORDS['General Intelligence & Reasoning'];
SECTION_KEYWORDS['Mathematics'] = SECTION_KEYWORDS['Quantitative Aptitude'];
SECTION_KEYWORDS['General Knowledge'] = SECTION_KEYWORDS['General Awareness'];
SECTION_KEYWORDS['General Studies'] = SECTION_KEYWORDS['General Awareness'];
SECTION_KEYWORDS['Current Affairs'] = SECTION_KEYWORDS['General Awareness'];
SECTION_KEYWORDS['Science'] = ['physics', 'chemistry', 'biology', 'force', 'energy', 'cell', 'reaction', 'element', 'unit'];
SECTION_KEYWORDS['Physics'] = ['force', 'energy', 'motion', 'velocity', 'resistance', 'current', 'light', 'lens', 'thermodynamic'];
SECTION_KEYWORDS['Chemistry'] = ['reaction', 'acid', 'base', 'mole', 'compound', 'oxidation', 'hybridization', 'element'];
SECTION_KEYWORDS['Biology'] = ['cell', 'plant', 'human', 'blood', 'disease', 'organ', 'vitamin', 'photosynthesis'];

function kwHit(text, kw) {
  var e = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('\\b' + e + '\\b').test(text);
}

function classifySection(q, sectionNames) {
  var text = ((q.text || '') + ' ' + (q.options || []).map(function (o) { return o.text || ''; }).join(' ')).toLowerCase();
  var scores = [];
  for (var i = 0; i < sectionNames.length; i++) {
    var name = sectionNames[i];
    var kws = SECTION_KEYWORDS[name];
    if (!kws) continue;
    var score = 0;
    for (var k = 0; k < kws.length; k++) if (kwHit(text, kws[k])) score++;
    scores.push({ name: name, score: score });
  }
  scores.sort(function (a, b) { return b.score - a.score; });
  if (!scores.length || scores[0].score < 2) return null;
  if (scores.length > 1 && scores[0].score - scores[1].score < 1) return null;
  return scores[0].name;
}

function bankSectionNames(bank) {
  return (bank.sections || []).map(function (s) { return (s && s.name) ? s.name : s; });
}

// the four section names used by the full-length mock pattern. A question whose
// stored section cannot be supported by keywords may be re-labelled into these.
var PATTERN_SECTIONS = ['General Intelligence & Reasoning', 'General Awareness', 'Quantitative Aptitude', 'English Comprehension'];

// --------------------------------------------------------------------- main

function processBank(exam, fix, V, strict) {
  var bankPath = path.join(BANK_DIR, exam + '.json');
  if (!fs.existsSync(bankPath)) { console.log(exam + ': bank not found, skipping'); return; }
  var bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  var questions = bank.questions || [];
  var names = bankSectionNames(bank);
  var kept = [], dropped = { ENT: 0, EQEQ: 0, GAP: 0, APOS: 0, MATH: 0, SPLIT: 0, RARE: 0, STRUCT: 0, STRICT: 0, MANUAL: 0, other: 0 };
  var repaired = 0, sectionFixed = 0;

  var manual = MANUAL_DROPS[exam] || [];
  questions.forEach(function (q) {
    if (manual.indexOf(q.id) !== -1) {
      dropped.MANUAL++;
      if (!fix) kept.push({ q: q, why: 'MANUAL' });
      return;
    }
    var textFields = ['text', 'solution'];
    textFields.forEach(function (f) { if (q[f]) { var d = fixMojibake(decodeEntities(q[f])); if (d !== q[f]) { repaired++; q[f] = d; } } });
    (q.options || []).forEach(function (o) { if (o.text) { var d = fixMojibake(decodeEntities(o.text)); if (d !== o.text) { repaired++; o.text = d; } } });

    // repair high-confidence mid-word splits, then re-inspect
    ['text', 'solution'].forEach(function (f) { if (q[f]) { var r = repairWordSplits(q[f], V.any); if (r !== q[f]) { repaired++; q[f] = r; } } });
    (q.options || []).forEach(function (o) { if (o.text) { var r = repairWordSplits(o.text, V.any); if (r !== o.text) { repaired++; o.text = r; } } });

    // Structure repair: legacy parsing concatenated the option sets of several
    // questions into one array (each set restarts at "A"). Keep the first
    // complete label-run — it belongs to the question text above it.
    var rawOpts = q.options || [];
    var labSeen = {}, cut = 0;
    while (cut < rawOpts.length && !labSeen[rawOpts[cut].label]) { labSeen[rawOpts[cut].label] = true; cut++; }
    if (cut >= 2 && cut < rawOpts.length) { q.options = rawOpts.slice(0, cut); repaired++; }

    // Structure drop: a question must have >=2 options, exactly one correct
    // answer, and no duplicated option texts — anything else is parser junk.
    var so = q.options || [];
    var nCorrect = 0, dupOpt = false, seenOpt = {};
    so.forEach(function (o) {
      if (o && o.correct) nCorrect++;
      var t = String((o && o.text) || '').toLowerCase().replace(/\s+/g, '');
      if (seenOpt[t]) dupOpt = true;
      seenOpt[t] = true;
    });
    if (so.length < 2 || nCorrect !== 1 || dupOpt) {
      dropped.STRUCT++;
      if (!fix) kept.push({ q: q, why: 'STRUCT(n=' + so.length + ',correct=' + nCorrect + (dupOpt ? ',dupOpt' : '') + ')' });
      return;
    }

    var res = inspectQuestion(q, V.any, strict ? V.strong : null);
    if (res.reasons.length) {
      var primary = res.reasons[0].split(':')[0];
      if (dropped[primary] !== undefined) dropped[primary]++; else dropped.other++;
      if (!fix) kept.push({ q: q, why: res.reasons.join(',') }); // audit: keep listing for inspection
      return;
    }

    // strict mode (used for banks generated by the broken legacy pipeline):
    // keep only questions whose every lowercase token is a known English word.
    if (strict && res.rareStrong.length > 0) {
      dropped.STRICT++;
      if (!fix) kept.push({ q: q, why: 'STRICT:' + res.rareStrong.slice(0, 5).join('/') });
      return;
    }

    // conservative section classification for missing sections
    if (!q.section) {
      var guess = classifySection(q, names);
      if (guess) { if (fix) { q.section = guess; sectionFixed++; } }
      else if (!fix) { /* audit only */ }
    } else if (SECTION_KEYWORDS[q.section]) {
      // sanity check: a letter-cluster puzzle labelled "General Awareness" is
      // worse than an honest blank. Re-label when the stored section has no
      // keyword support and another pattern section clearly does.
      var ownLow = ((q.text || '') + ' ' + (q.options || []).map(function (o) { return o.text || ''; }).join(' ')).toLowerCase();
      var ownScore = 0;
      var kws = SECTION_KEYWORDS[q.section] || [];
      for (var kk = 0; kk < kws.length; kk++) if (kwHit(ownLow, kws[kk])) ownScore++;
      if (ownScore < 2) {
        var better = classifySection(q, PATTERN_SECTIONS);
        if (better && better !== q.section) { if (fix) { q.section = better; sectionFixed++; } }
      }
    }
    kept.push({ q: q, why: '' });
  });

  var dropTotal = Object.keys(dropped).reduce(function (a, k) { return a + dropped[k]; }, 0);
  console.log('\n' + exam + ': ' + questions.length + ' q -> keep ' + kept.length + ', drop ' + dropTotal +
    ' (' + JSON.stringify(dropped) + '), repaired fields ' + repaired + ', sections assigned ' + sectionFixed);

  if (fix) {
    var keepQs = kept.map(function (r) { return r.q; });
    bank.questions = keepQs;
    fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf8');
    console.log('  written: ' + bankPath + ' (' + keepQs.length + ' questions)');
  } else {
    // full list of dropped questions with reasons, for eyeballing
    kept.forEach(function (r) { if (r.why) { console.log('   DROP[' + r.why + '] id ' + r.q.id + ' :: ' + (r.q.text || '').slice(0, 170).replace(/\s+/g, ' ') + ' |SOL: ' + (r.q.solution || '').slice(0, 90).replace(/\s+/g, ' ')); } });
    var survivors = kept.filter(function (r) { return !r.why; });
    console.log('   survivors: ' + survivors.length);
    survivors.slice(0, 40).forEach(function (r) { console.log('   KEEP id ' + r.q.id + ' sec[' + (r.q.section || '') + '] :: ' + (r.q.text || '').slice(0, 100).replace(/\s+/g, ' ')); });
  }
}

function main() {
  var args = process.argv.slice(2);
  var fix = args.indexOf('--fix') !== -1;
  var exams = EXAMS_ALL;
  args.forEach(function (a) {
    var m = a.match(/^--exams=(.+)$/);
    if (m) exams = m[1].split(',');
  });

  var V = buildVocab();

  // debug helpers
  var wordsArg = null, tryArg = null, strictNames = [];
  args.forEach(function (a) {
    var m = a.match(/^--words=(.+)$/); if (m) wordsArg = m[1].split(',');
    m = a.match(/^--try=(.+)$/); if (m) tryArg = m[1];
    m = a.match(/^--strict=(.+)$/); if (m) strictNames = m[1].split(',');
  });
  if (wordsArg) { wordsArg.forEach(function (w) { console.log(w + ': any ' + (V.any.has(w) ? 'IN' : 'no') + ' / strong ' + (V.strong.has(w) ? 'IN' : 'no')); }); return; }
  if (tryArg) { console.log(JSON.stringify(repairWordSplits(tryArg, V.any))); return; }

  console.log('bank-cleanup: ' + (fix ? 'FIX' : 'audit') + ' mode, exams: ' + exams.join(', ') + (strictNames.length ? ', strict: ' + strictNames.join(',') : ''));
  console.log('vocab: broad ' + V.any.size + ' / strong ' + V.strong.size);
  exams.forEach(function (exam) { processBank(exam, fix, V, strictNames.indexOf(exam) !== -1); });
  console.log('\ndone.');
}

if (require.main === module) main();

module.exports = {
  buildVocab: buildVocab,
  decodeEntities: decodeEntities,
  fixMojibake: fixMojibake,
  repairWordSplits: repairWordSplits,
  tryJoinRules: tryJoinRules,
  repairOnePass: repairOnePass,
  inspectQuestion: inspectQuestion,
  classifySection: classifySection,
  pairSplitHits: pairSplitHits,
  rareTokens: rareTokens,
  isWord: isWord,
  isWordTok: isWordTok,
  processBank: processBank
};

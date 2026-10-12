/*
 * figure-auto-score.js -- relevance scoring for auto-picked Wikimedia figures.
 *
 * WHY THIS EXISTS
 * ---------------
 * Both figure builders (build-geography-figures.js, build-subject-figures.js)
 * auto-pick a Commons image for a topic that has no curated figure. They used to
 * score relevance like this:
 *
 *     rel = tt.some(function (w) { return w.length > 2 && t.indexOf(w) !== -1; }) ? 2 : -3;
 *
 * i.e. ANY ONE topic token of length > 3 earned full relevance credit. For the
 * topic "Long Island" the tokens are ["long", "island"], so the file
 * "Easter Island map-fr.svg" matched on the generic token "island" and scored
 * hint(2) + ext(3) + rel(2) = 7, comfortably over the accept threshold of 3. The
 * pack shipped an Easter Island map under the heading "Long Island".
 *
 * The same hole lets "Cape Verde" match any file containing "verde", "Black Sea"
 * match any file containing "black", and so on: the token that actually
 * distinguishes the topic is never required.
 *
 * THE FIX
 * -------
 * Split the topic's tokens into DISTINCTIVE and GENERIC parts. Generic geographic
 * head-nouns (island, river, sea, ...) are what a wrong candidate is most likely
 * to share, so they must not carry relevance on their own. Relevance now requires
 * at least one DISTINCTIVE token to be present:
 *
 *   - "Long Island"    -> key ["long"]        -> "Easter Island map-fr.svg" rejected
 *   - "Canary Islands" -> key ["canary"]      -> "Easter Island map-fr.svg" rejected
 *   - "Amazon River"   -> key ["amazon"]      -> requires "amazon"
 *   - "Islands"        -> key []              -> falls back to the old any-token rule
 *
 * This deliberately does NOT require every distinctive token. Commons titles use
 * word order and synonyms we do not model, and an over-strict gate would throw
 * away good picks. Requiring one distinctive token is the smallest change that
 * closes the observed hole.
 *
 * Used by: scripts/build-geography-figures.js, scripts/build-subject-figures.js
 * Tests:   scripts/lib/figure-auto-score.test.js
 */
'use strict';

// Geographic head-nouns and other topic words that a wrong candidate is very
// likely to share. Matched against already-normalized tokens.
var GENERIC = {
  island: 1, islands: 1, isle: 1, isles: 1,
  sea: 1, seas: 1, ocean: 1, oceans: 1, gulf: 1, gulfs: 1, bay: 1, bays: 1,
  strait: 1, straits: 1, channel: 1, channels: 1, sound: 1, sounds: 1,
  river: 1, rivers: 1, lake: 1, lakes: 1, canal: 1, canals: 1, creek: 1,
  mountain: 1, mountains: 1, mount: 1, peak: 1, peaks: 1, hill: 1, hills: 1,
  valley: 1, valleys: 1, desert: 1, deserts: 1, plateau: 1, plateaus: 1,
  peninsula: 1, peninsulas: 1, archipelago: 1,
  forest: 1, forests: 1, park: 1, parks: 1, national: 1, wildlife: 1, sanctuary: 1,
  city: 1, cities: 1, town: 1, towns: 1, village: 1, port: 1, harbour: 1, harbor: 1,
  cape: 1, capes: 1, coast: 1, coastal: 1, shore: 1, delta: 1, plain: 1, plains: 1,
  region: 1, regions: 1, state: 1, states: 1, district: 1, province: 1,
  border: 1, borders: 1, republic: 1, kingdom: 1, country: 1, countries: 1,
  map: 1, maps: 1, outline: 1, location: 1, locator: 1, diagram: 1, chart: 1,
  structure: 1, cross: 1, section: 1, type: 1, types: 1, system: 1, systems: 1,
  zone: 1, zones: 1, belt: 1, line: 1, lines: 1, route: 1, network: 1,
  wind: 1, winds: 1, monsoon: 1, rain: 1, climate: 1, temperature: 1,
  // Abstract nouns that carry no identifying information on their own. Without
  // these, topic "Axis powers" accepted "Powers chart.svg" on the shared word
  // "powers" -- the same failure as "Long Island" / "Easter Island".
  power: 1, powers: 1, force: 1, forces: 1, rule: 1, rules: 1,
  war: 1, wars: 1, peace: 1, party: 1, parties: 1, council: 1, union: 1,
  league: 1, association: 1, organization: 1, organisation: 1,
  movement: 1, group: 1, groups: 1, cell: 1, cells: 1, theory: 1,
  model: 1, models: 1, process: 1, period: 1, era: 1, age: 1,
  year: 1, years: 1, new: 1, old: 1, great: 1, little: 1, upper: 1, lower: 1,
  north: 1, south: 1, east: 1, west: 1, eastern: 1, western: 1, northern: 1, southern: 1,
  central: 1, major: 1, minor: 1, main: 1, key: 1, general: 1
};

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(s) {
  return norm(String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .split(' ').filter(Boolean);
}

/**
 * Split a topic's tokens into distinctive / generic parts.
 * @returns {{ all: string[], key: string[], generic: string[] }}
 */
function topicTokens(topic) {
  var all = tokens(topic || '');
  var key = all.filter(function (w) { return w.length > 2 && !GENERIC[w]; });
  return { all: all, key: key, generic: all.filter(function (w) { return GENERIC[w]; }) };
}

/**
 * Score how well an already-normalized candidate title matches a topic.
 * @returns {{ score:number, matched:string[], key:string[], reason:string }}
 *   score is 2 when a distinctive token matched and -3 when none did, which is the
 *   contract the builders' accept threshold (>= 3) relies on.
 */
function topicRelevance(candidateNorm, topic) {
  var t = String(candidateNorm || '');
  var parts = topicTokens(topic);
  if (!parts.all.length) return { score: 0, matched: [], key: parts.key, reason: 'no topic tokens' };

  // No distinctive token survives (e.g. topic is just "Islands"): fall back to the
  // original any-token rule, which is all the information available.
  if (!parts.key.length) {
    var anyHit = parts.all.filter(function (w) { return w.length > 2 && t.indexOf(w) !== -1; });
    return {
      score: anyHit.length ? 2 : -3,
      matched: anyHit,
      key: [],
      reason: 'generic-only topic, fell back to any-token'
    };
  }

  var matched = parts.key.filter(function (w) { return t.indexOf(w) !== -1; });
  return {
    score: matched.length ? 2 : -3,
    matched: matched,
    key: parts.key,
    reason: matched.length
      ? 'distinctive token(s) matched: ' + matched.join(', ')
      : 'no distinctive token matched (need one of: ' + parts.key.join(', ') + ')'
  };
}

/**
 * Would this candidate file be admitted at all? Mirrors the builders' threshold.
 */
function isRelevant(candidateTitle, topic) {
  return topicRelevance(norm(candidateTitle), topic).score > 0;
}

/**
 * The full auto-pick score, shared by both builders so they cannot drift apart.
 *
 * The two builders had near-identical copies of this function that differed only
 * in their hint keywords, which is exactly how a one-line relevance bug ended up
 * shipped twice. The keyword sets are now passed in by the caller so the arithmetic
 * and the relevance rule live in one place.
 *
 * @param {string} titleRaw  candidate file title, e.g. "Long Island location map.svg"
 * @param {string} topic     the topic the figure must illustrate
 * @param {object} [opts]
 * @param {RegExp} [opts.hintRe]   strong visual keywords (map, diagram, ...)  -> +2
 * @param {RegExp} [opts.hint2Re]  weak visual keywords (relief, globe, ...)  -> +1
 * @param {RegExp} [opts.rejectRe] disqualifying keywords (monument, .pdf, ...) -> -4
 * @param {number} [opts.accept]   minimum score to admit a candidate (default 3)
 * @returns {{ score:number, accepted:boolean, rel:object, parts:object }}
 */
function autoScore(titleRaw, topic, opts) {
  opts = opts || {};
  var raw = String(titleRaw).toLowerCase();
  var t = norm(raw);
  var ext = /\.svg$/i.test(raw) ? 3 : (/\.png$/i.test(raw) ? 2 : (/\.jpe?g$/i.test(raw) ? 1.2 : (/\.gif$/i.test(raw) ? 0.8 : -10)));
  var hint = 0;
  if (opts.hintRe && opts.hintRe.test(t)) hint = 2;
  else if (opts.hint2Re && opts.hint2Re.test(t)) hint = 1;
  var bigNum = /[0-9]{4,}/.test(t) ? -1 : 0;
  var rel = topicRelevance(t, topic);
  var reject = (opts.rejectRe && opts.rejectRe.test(t)) ? -4 : 0;
  var accept = typeof opts.accept === 'number' ? opts.accept : 3;
  var score = hint + ext + rel.score + reject + bigNum;
  return {
    score: score,
    accepted: score >= accept,
    rel: rel,
    parts: { ext: ext, hint: hint, rel: rel.score, reject: reject, bigNum: bigNum }
  };
}

module.exports = {
  GENERIC: GENERIC,
  norm: norm,
  tokens: tokens,
  topicTokens: topicTokens,
  topicRelevance: topicRelevance,
  isRelevant: isRelevant,
  autoScore: autoScore
};

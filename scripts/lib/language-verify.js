'use strict';
// Script and structure checks for the UPSC Mains Paper A language pages.
//
// This is deliberately a *gate*, not a language model: it can prove that a
// passage is written in the expected Unicode script, that a page carries the
// required provenance labels, and that the data file covers all 22 Eighth
// Schedule languages. It cannot prove grammar or meaning. The build and check
// scripts therefore report "native-speaker review pending" instead of
// pretending that a script check is a language check.

var SCRIPTS = {
  bengali: {
    name: 'Bengali',
    direction: 'ltr',
    ranges: [[0x0980, 0x09FF]],
    font: 'Noto+Sans+Bengali'
  },
  devanagari: {
    name: 'Devanagari',
    direction: 'ltr',
    ranges: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
    font: 'Noto+Sans+Devanagari'
  },
  gujarati: {
    name: 'Gujarati',
    direction: 'ltr',
    ranges: [[0x0A80, 0x0AFF]],
    font: 'Noto+Sans+Gujarati'
  },
  gurmukhi: {
    name: 'Gurmukhi',
    direction: 'ltr',
    ranges: [[0x0A00, 0x0A7F]],
    font: 'Noto+Sans+Gurmukhi'
  },
  kannada: {
    name: 'Kannada',
    direction: 'ltr',
    ranges: [[0x0C80, 0x0CFF]],
    font: 'Noto+Sans+Kannada'
  },
  malayalam: {
    name: 'Malayalam',
    direction: 'ltr',
    ranges: [[0x0D00, 0x0D7F]],
    font: 'Noto+Sans+Malayalam'
  },
  odia: {
    name: 'Odia',
    direction: 'ltr',
    ranges: [[0x0B00, 0x0B7F]],
    font: 'Noto+Sans+Oriya'
  },
  tamil: {
    name: 'Tamil',
    direction: 'ltr',
    ranges: [[0x0B80, 0x0BFF]],
    font: 'Noto+Sans+Tamil'
  },
  telugu: {
    name: 'Telugu',
    direction: 'ltr',
    ranges: [[0x0C00, 0x0C7F]],
    font: 'Noto+Sans+Telugu'
  },
  olchiki: {
    name: 'Ol Chiki',
    direction: 'ltr',
    ranges: [[0x1C50, 0x1C7F]],
    font: 'Noto+Sans+Ol+Chiki'
  },
  arabic: {
    name: 'Perso-Arabic',
    direction: 'rtl',
    ranges: [
      [0x0600, 0x06FF],
      [0x0750, 0x077F],
      [0x08A0, 0x08FF],
      [0xFB50, 0xFDFF],
      [0xFE70, 0xFEFF]
    ],
    font: 'Noto+Nastaliq+Urdu'
  }
};

var LATIN_RANGES = [[0x0041, 0x005A], [0x0061, 0x007A]];

var EXPECTED_SLUGS = [
  'assamese', 'bengali', 'bodo', 'dogri', 'gujarati', 'hindi', 'kannada',
  'kashmiri', 'konkani', 'maithili', 'malayalam', 'manipuri', 'marathi',
  'nepali', 'odia', 'punjabi', 'sanskrit', 'santali', 'sindhi', 'tamil',
  'telugu', 'urdu'
];

function inRanges(cp, ranges) {
  for (var i = 0; i < ranges.length; i++) {
    if (cp >= ranges[i][0] && cp <= ranges[i][1]) return true;
  }
  return false;
}

function isIgnored(ch) {
  return /[\s\p{P}\p{S}]/u.test(ch);
}

// Count only visible characters. Punctuation and whitespace are ignored, so a
// passage is not penalised for using ASCII commas or Devanagari dandas.
function scriptStats(text, scriptKey) {
  var script = SCRIPTS[scriptKey];
  if (!script) throw new Error('unknown script: ' + scriptKey);
  var source = String(text || '');
  var counts = { script: 0, latin: 0, other: 0, total: 0 };
  var otherSamples = {};
  for (var i = 0; i < source.length; i++) {
    var cp = source.codePointAt(i);
    if (cp > 0xFFFF) i++;
    var ch = String.fromCodePoint(cp);
    if (isIgnored(ch)) continue;
    counts.total++;
    if (inRanges(cp, script.ranges)) {
      counts.script++;
    } else if (inRanges(cp, LATIN_RANGES)) {
      counts.latin++;
    } else {
      counts.other++;
      if (Object.keys(otherSamples).length < 8) otherSamples[ch] = (otherSamples[ch] || 0) + 1;
    }
  }
  counts.coverage = counts.total ? counts.script / counts.total : 0;
  counts.latinCoverage = counts.total ? counts.latin / counts.total : 0;
  counts.otherSamples = Object.keys(otherSamples);
  return counts;
}

function detectScript(text) {
  var best = null;
  Object.keys(SCRIPTS).forEach(function (key) {
    var stats = scriptStats(text, key);
    if (!best || stats.coverage > best.coverage) best = { key: key, coverage: stats.coverage, stats: stats };
  });
  return best;
}

function validateSample(lang, sample) {
  var errors = [];
  var warnings = [];
  if (!sample) return { ok: true, errors: errors, warnings: warnings, stats: null };

  if (sample.sourceType !== 'model-generated-practice') {
    errors.push('sample.sourceType must be "model-generated-practice"');
  }
  if (!sample.model) errors.push('sample.model is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sample.generatedAt || ''))) {
    errors.push('sample.generatedAt must be YYYY-MM-DD');
  }
  if (!sample.verification) errors.push('sample.verification is required');
  if (!Array.isArray(sample.questions) || sample.questions.length < 3) {
    errors.push('sample.questions must contain at least 3 questions');
  } else {
    sample.questions.forEach(function (q, i) {
      if (!q || !String(q.q || '').trim()) errors.push('sample.questions[' + i + '].q is empty');
      if (!q || !String(q.a || '').trim()) errors.push('sample.questions[' + i + '].a is empty');
    });
  }

  var passage = String(sample.passage || '');
  if (passage.length < 80) errors.push('sample.passage is too short');
  if (String(sample.english || '').length < 80) errors.push('sample.english is too short');
  if (/https?:\/\//i.test(passage)) warnings.push('sample.passage contains a URL');
  if (/\b(?:UPSC|official|previous[- ]year|PYQ)\b/i.test(passage)) {
    errors.push('sample.passage must not claim or imply official/PYQ status');
  }

  var stats = scriptStats(passage, lang.scriptKey);
  if (stats.coverage < 0.9) {
    errors.push('sample.passage script coverage is ' + Math.round(stats.coverage * 100) + '% (need >= 90%)');
  }
  if (stats.latin > 0) {
    errors.push('sample.passage contains ' + stats.latin + ' Latin letter(s)');
  }
  if (stats.other > 0) {
    warnings.push('sample.passage contains ' + stats.other + ' character(s) outside ' + SCRIPTS[lang.scriptKey].name + ': ' + stats.otherSamples.join(' '));
  }
  return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
}

function sameRanges(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!Array.isArray(a[i]) || a[i].length !== 2) return false;
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

function validateLanguageData(data) {
  var errors = [];
  var warnings = [];
  if (!data || !Array.isArray(data.languages)) {
    return { ok: false, errors: ['data.languages must be an array'], warnings: warnings };
  }
  if (data.languages.length !== 22) {
    errors.push('expected 22 languages, found ' + data.languages.length);
  }

  var seen = {};
  data.languages.forEach(function (lang, index) {
    var where = 'languages[' + index + ']';
    if (!lang || typeof lang !== 'object') {
      errors.push(where + ' is not an object');
      return;
    }
    ['slug', 'name', 'native', 'code', 'script', 'scriptKey', 'direction', 'unicode', 'font', 'scriptNote'].forEach(function (field) {
      if (!lang[field]) errors.push(where + '.' + field + ' is required');
    });
    if (lang.slug && seen[lang.slug]) errors.push('duplicate slug: ' + lang.slug);
    if (lang.slug) seen[lang.slug] = true;
    if (EXPECTED_SLUGS.indexOf(lang.slug) === -1) errors.push('unexpected slug: ' + lang.slug);

    var script = SCRIPTS[lang.scriptKey];
    if (!script) {
      errors.push(where + '.scriptKey is unknown: ' + lang.scriptKey);
    } else {
      if (lang.direction !== script.direction) {
        errors.push(where + '.direction should be ' + script.direction);
      }
      if (!sameRanges(lang.ranges, script.ranges)) {
        errors.push(where + '.ranges must match the ' + script.name + ' ranges');
      }
      if (lang.script !== script.name) {
        errors.push(where + '.script should be ' + script.name);
      }
      var nativeStats = scriptStats(lang.native, lang.scriptKey);
      if (nativeStats.script < 1) {
        errors.push(where + '.native does not contain any ' + script.name + ' characters');
      }
    }
    if (!Array.isArray(lang.traps) || lang.traps.length < 2) {
      errors.push(where + '.traps must contain at least 2 items');
    }
    var sampleResult = validateSample(lang, lang.sample);
    sampleResult.errors.forEach(function (e) { errors.push(where + ': ' + e); });
    sampleResult.warnings.forEach(function (w) { warnings.push(where + ': ' + w); });
  });

  EXPECTED_SLUGS.forEach(function (slug) {
    if (!seen[slug]) errors.push('missing language slug: ' + slug);
  });

  return { ok: errors.length === 0, errors: errors, warnings: warnings };
}

module.exports = {
  SCRIPTS: SCRIPTS,
  EXPECTED_SLUGS: EXPECTED_SLUGS,
  LATIN_RANGES: LATIN_RANGES,
  inRanges: inRanges,
  scriptStats: scriptStats,
  detectScript: detectScript,
  validateSample: validateSample,
  validateLanguageData: validateLanguageData
};

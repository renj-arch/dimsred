// Auto-generate UPSC revision content from existing data
// Usage: node scripts/generate-revision-content.js

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data');
var TOPIC_LAYERS = path.join(DATA_DIR, 'topic-layers.json');
var TIMELINE = path.join(DATA_DIR, 'timeline.json');
var OUTPUT = path.join(DATA_DIR, 'revision-content.json');

// Load existing data
var topicLayers = JSON.parse(fs.readFileSync(TOPIC_LAYERS, 'utf8'));
var timeline = JSON.parse(fs.readFileSync(TIMELINE, 'utf8'));

var revisionContent = {};

// Sentence splitter that avoids splitting on decimal dots/initials inside a
// sentence ("13.5 crore", "T. N. Seshan"). Splits on sentence punctuation that
// is followed by whitespace + a capital letter or digit.
function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/g)
    .map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
    .filter(function (s) { return s.length >= 12 && s.length <= 220; });
}

function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Template filler produced by the layer writer itself (branch section headers)
// — never revision-worthy.
var TEMPLATE_JUNK = /^(?:the (?:key concepts|key events|major events|people & leaders|people and leaders|institutions & organisations|institutions and organisations|events & milestones|events and milestones) linked to|geography|see also)\b/i;

// City/geography summary boilerplate that shows up as generic `desc` on nodes
// whose evidence note is only a stub. These read like trivia, never like UPSC
// revision content for the topic they sit under.
var BAN_PHRASES = /(?:became a union territory|is the capital and largest city|and largest city of|metropolitan area is the largest|most populous city proper|population of [\d,]+|coastline|coast along|along the bay|along the arabian sea|gulf of |marina beach|geography\b|stands on the river|at the head of a|world cities located in|president of |prime minister of |capital city of|megacity|metropolitan region which is|metropolitan area|officially the|was a (?:ugandan|indian|british|american|pakistani|sri lankan|bangladeshi|nepalese|afghan|chinese|russian|french|german|japanese|italian|spanish|iraqi|iranian|israeli|egyptian|south african|australian|canadian)\b|(?:military officer|dictator who served|general and presiden|liberation army of)\b)/i;

// A sentence only reads like revision content when it carries real substance:
// two or more proper nouns, and either a year/stat or enough length to be an
// excerpt rather than a stub relation phrase ("poet and Nobel laureate").
function hasSubstance(clean) {
  var caps = (String(clean).match(/[A-Z][a-z]{3,}/g) || []).length;
  var hasYear = /\b(1[4-9]\d{2}|20[0-2]\d)\b/.test(clean);
  var hasStat = /\b\d{1,3}(?:,\d{3})*\.?\d*\s*(?:%|percent|million|billion|crore|lakh|thousand|km|tonnes?|states?|districts?|languages?|schemes?)\b/i.test(clean);
  return (hasYear || hasStat) ? caps >= 2 : (caps >= 2 && clean.length >= 45);
}

// Relevance: the routed `note` is evidence tied directly to the topic link;
// `desc` is a generic node description that may drift across topics. Prefer
// notes and only fall back to descs when the note is empty or a stub.
function evidenceSentences(item) {
  var note = (item.note || '').replace(/\s+/g, ' ').trim();
  var desc = (item.desc || '').replace(/\s+/g, ' ').trim();
  var out = [];
  // Routed note is direct evidence; only fall back to the generic desc when the
  // note is empty or a stub. Never mix them (desc can drift to other topics).
  var fromNote = note.length >= 20 || !desc;
  var src = fromNote ? note : desc;
  splitSentences(src).forEach(function (s) {
    var clean = s.trim().replace(/\s+/g, ' ').trim();
    if (!clean || TEMPLATE_JUNK.test(clean) || BAN_PHRASES.test(clean)) return;
    var pared = clean.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ t: pared, fromNote: fromNote });
  });
  return out;
}

// 1. Generate bullet-point summaries from topic-layers
function generateBullets(topicName, topicData) {
  var seen = {};
  var bullets = [];
  var reserve = [];
  var weakLead = /^(?:however|thus|also|also,|so|then|finally|further|moreover|in addition|meanwhile|hence|therefore|this|that|these|those|there|they|he|she|it|and|but|or)\b/i;
  var boilerplate = /^(?:according to|as per|refer|refers to|see also|note:?|read more)\b/i;

  if (topicData.branches) {
    topicData.branches.forEach(function (branch) {
      if (branch.items) {
        branch.items.forEach(function (item) {
          evidenceSentences(item).forEach(function (ce) {
            var clean = ce.t.trim();
            if (clean.length < 15 || clean.length > 160) return;
            if (clean.charAt(0) === '"' || clean.indexOf(' — ') !== -1 ||
                clean.indexOf('==') !== -1 || clean.indexOf('http') !== -1 ||
                /\[(?:citation needed|source needed)\]/.test(clean)) return;
            if (boilerplate.test(clean)) return;
            if (/[:;]$/.test(clean) || /\?\s*$/.test(clean) || /^what|^why|^how\b/i.test(clean)) return;
            var isWeakLead = weakLead.test(clean);
            // score: sentences with a year or stat read like a revision worthy fact;
            // desc-fallback sentences are demoted so genuine topic evidence wins
            var hasYear = /\b(1[4-9]\d{2}|20[0-2]\d)\b/.test(clean);
            var hasStat = /\d(?:\s*(?:%|percent|million|billion|crore|lakh|thousand|km|states|people|years)|,)?\b/.test(clean);
            var score = (hasYear ? 3 : 0) + (hasStat ? 2 : 0) + (isWeakLead ? -3 : 0) +
              (ce.fromNote ? 0 : -4) - (clean.split(/\s+/).length > 26 ? 1 : 0);
            var k = normalizeKey(clean);
            if (!k || seen[k]) return;
            seen[k] = 1;
            var dot = clean.charAt(0).toUpperCase() + clean.slice(1);
            if (score >= 1 && hasSubstance(clean)) {
              bullets.push({ t: dot, s: score });
            } else if (score >= 0 && !isWeakLead && (ce.fromNote ? clean.length >= 15 : clean.length >= 30) && reserve.length < 8) {
              // sparse-topic insurance: keep softer routed notes, capped, so a
              // thin topic never renders with zero revision bullets
              reserve.push({ t: dot, s: score });
            }
          });
        });
      }
    });
  }

  // de-dupe near-duplicates (longest survives) and keep the strongest 6, order preserved
  function dedupe(arr, cap) {
    var byNorm = {};
    arr.forEach(function (b) {
      var stem = normalizeKey(b.t.replace(/[.,:;]+$/, ''));
      if (!byNorm[stem] || b.t.length > byNorm[stem].t.length) byNorm[stem] = b;
    });
    return Object.keys(byNorm).map(function (key) { return byNorm[key]; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, cap)
      .map(function (b) { return '• ' + b.t; });
  }

  if (bullets.length >= 2) return dedupe(bullets, 6);
  return dedupe(bullets.concat(reserve), 4);
}

// 2. Extract facts with numbers/dates - improved quality
function extractFacts(topicName, topicData) {
  var facts = [];
  var seen = {};
  var yearPattern = /\b(1[4-9]\d{2}|20[0-2]\d)\b/g;
  var statPattern = /\b\d{1,3}(?:,\d{3})*\.?\d*\s*(?:%|percent|million|billion|thousand|crore|lakh|people|years|km|tonnes?|states?|districts?|languages?|schemes?|schools?|villages?|districts?)\b/gi;
  var weakLead = /^(?:however|thus|also|so|then|finally|further|moreover|hence|therefore|this|that|these|those|there|according to)\b/i;

  function pushFact(label, sentence) {
    var clean = String(sentence || '').replace(/\s+/g, ' ').trim();
    if (clean.length < 12 || clean.length > 170) return;
    if (weakLead.test(clean)) return;
    if (/\[(?:citation needed|source needed)\]/.test(clean)) return;
    if (!hasSubstance(clean)) return;
    var k = label + normalizeKey(clean);
    if (seen[k]) return;
    seen[k] = 1;
    if (clean.length > 150) clean = clean.slice(0, 147).replace(/\s+\S*$/, '') + '…';
    facts.push(label + ' ' + clean);
  }

  function extractFromText(text) {
    if (!text) return;
    var sents = splitSentences(text);
    sents.forEach(function (s) {
      yearPattern.lastIndex = 0;
      if (yearPattern.test(s)) { pushFact('📅', s); }
      statPattern.lastIndex = 0;
      if (statPattern.test(s)) { pushFact('📊', s); }
    });
  }

  if (topicData.branches) {
    topicData.branches.forEach(function (branch) {
      if (branch.items) {
        branch.items.forEach(function (item) {
          evidenceSentences(item).forEach(function (ce) {
            if (TEMPLATE_JUNK.test(ce.t)) return;
            extractFromText(ce.t);
          });
        });
      }
    });
  }

  return facts.slice(0, 6);
}

// 3. Generate comparison table for similar topics - improved relevance
function generateComparisons(topicName) {
  var comparisons = [];
  var topicWords = topicName.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });

  var scored = Object.keys(topicLayers).map(function (name) {
    if (name === topicName) return null;
    var nameWords = name.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
    var common = 0;
    nameWords.forEach(function (w) { if (topicWords.indexOf(w) !== -1) common++; });
    return { name: name, n: common };
  }).filter(function (x) { return x && x.n > 0; })
    .sort(function (a, b) { return b.n - a.n; })
    .slice(0, 2);

  if (scored.length > 0) {
    var comparison = {
      title: 'Related Topics: ' + scored.map(function (s) { return s.name; }).join(', '),
      table: []
    };
    scored.forEach(function (s) {
      var similarData = topicLayers[s.name];
      var keyPoint = 'Related topic';
      if (similarData.branches && similarData.branches[0]) {
        if (similarData.branches[0].desc) {
          keyPoint = similarData.branches[0].desc.substring(0, 60) + '…';
        } else if (similarData.branches[0].title) {
          keyPoint = similarData.branches[0].title;
        }
      }
      comparison.table.push({ topic: s.name, keyPoint: keyPoint });
    });
    comparisons.push(comparison);
  }

  return comparisons;
}

// 4. Generate quick summary (2-3 sentence overview)
function generateSummary(topicName, topicData) {
  var bullets = generateBullets(topicName, topicData);
  var out = [];
  bullets.forEach(function (b) {
    var t = b.replace(/^[•]\s*/, '');
    var norm = normalizeKey(t);
    if (out.some(function (q) { return normalizeKey(q) === norm; })) return;
    out.push(t);
    if (out.length >= 2) return;
  });
  if (out.length) return out.join(' ');
  // fall back to the first non-template branch overview line
  if (topicData.branches) {
    for (var i = 0; i < topicData.branches.length; i++) {
      var bd = (topicData.branches[i].desc || '').trim();
      if (bd && !TEMPLATE_JUNK.test(bd) && bd.length < 170) return bd;
    }
  }
  return '';
}

// Process all topics
Object.keys(topicLayers).forEach(function (topicName) {
  var topicData = topicLayers[topicName];

  revisionContent[topicName] = {
    summary: generateSummary(topicName, topicData),
    bullets: generateBullets(topicName, topicData),
    facts: extractFacts(topicName, topicData),
    comparisons: generateComparisons(topicName),
    generatedAt: new Date().toISOString()
  };
});

// Save revision content
fs.writeFileSync(OUTPUT, JSON.stringify(revisionContent, null, 2));
console.log('Generated revision content for ' + Object.keys(revisionContent).length + ' topics');
console.log('Saved to: ' + OUTPUT);
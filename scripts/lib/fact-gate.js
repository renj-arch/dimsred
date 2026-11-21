/*
 * fact-gate.js -- turn a raw mined corpus sentence into a usable FACT, or reject it.
 *
 * WHY THIS FILE IS THE KEYSTONE OF THE THEORY LAYER
 * --------------------------------------------------
 * The rule the whole system rests on:
 *
 *     Timeline discovers facts. Graph establishes relationships.
 *     Theory interprets VALIDATED facts. Answer Frame turns theory into writing.
 *
 * Theory may not read raw `n.desc`. Measurement on the Volcano topic showed why.
 * Every one of these is a real node in `data/timeline.nodes.*.json`:
 *
 *   Volcano                 "a vent where molten rock, ash and gas escape from
 *                            beneath the Earth's crust"                    <- FACT
 *   Barren Island           "India's only active volcano, in the Andaman
 *                            Sea"                                          <- FACT
 *   Antuco Volcano          "is a stratovolcano in the Bio Bio Region of
 *                            Chile"                                        <- FACT
 *   Universal Volcano Bay   "a tropical-themed water park"                 <- WRONG ENTITY
 *   Operation Volcano       "part of the March-May 2007 Operation Achilles" <- OFF-DOMAIN
 *   HotSpot                 "Tiered compiling"                             <- OFF-DOMAIN
 *   Plate tectonics         "or was once active on this planet"            <- FRAGMENT
 *   Submarine volcano       "In August 2019"                               <- FRAGMENT
 *   Lava                    "According to the Ramayana, one of Rama's
 *                            sons, Lava, ruled Uttara Kosala"              <- WRONG SENSE
 *   Tenerife                "is dominated by Teide, a volcanic peak that is
 *                            the highest moun"                             <- TRUNCATED
 *   Hawaii Volcanoes NP     "designated as an International Biosphere
 *                            Reserve in _____"                             <- CLOZE
 *
 * Only 4 of 11 are usable. Read raw, theory would teach "HotSpot means tiered
 * compiling" and "Lava is Rama's son".
 *
 * THE GATES (generic; nothing here is topic-specific)
 * ---------------------------------------------------
 *  1. STRUCTURE   reject cloze, fragments, and probable mid-word truncation.
 *  2. CREDIBILITY reject page furniture and promo copy carrying no claim.
 *  3. DOMAIN      the sentence must use the vocabulary of the entity's
 *                 RESOLVED TYPE. This is the gate that separates the graph
 *                 layer from the theory layer: "part of the March-May 2007
 *                 Operation Achilles" is a perfectly good fact about a
 *                 military operation called Operation Volcano, and worthless
 *                 in a geology theory. It is kept, marked `offtopic`.
 *  4. IDENTITY    for generic types (`concept` is the corpus default and
 *                 carries no vocabulary) reject sentences dense in foreign
 *                 proper nouns -- that is the "Lava is Rama's son" test.
 *  5. SPECIFICITY reject self-naming padding and relation-only text that
 *                 teaches nothing beyond two names.
 *
 * VERDICTS
 * --------
 *   fact     usable as theory material
 *   weak     true but thin, padded, or possibly truncated. Retained and ranked
 *            below `fact`; never fills a theory slot on its own.
 *   offtopic valid in the graph layer, irrelevant to THIS theory build
 *   reject   unusable, with the reason recorded
 *
 * HONESTY NOTE ON TRUNCATION
 * --------------------------
 * Detecting a word cut off mid-syllable genuinely requires a dictionary. This
 * gate uses an approximation: a long all-lowercase sentence ending in a short
 * all-lowercase token that is not a known short word is treated as POSSIBLY
 * truncated and downgraded to `weak` rather than rejected. Downgrading keeps
 * real content available while refusing to promote it to a definition. This
 * is deliberately conservative in the safe direction.
 */
'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FactGate = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- structure
  var CLOZE = /_{3,}|\[\s*(?:\.\.\.|\u2026)\s*\]|\(\s*\?\s*\)|<blank>/i;

  // Pronunciation residue from scraped articles: "( kawl-DERR-\u0259, kal-)".
  var IPA = /[([][^)\]]*[ˈˌəɛɪʊɔæʌɑːɒɪʊ][^)\]]*[)\]]/;

  // Sentence that starts mid-thought: "or was once active on this planet".
  var LOWER_START_STOPS = new RegExp(
    '^(or|and|but|which|that|who|with|for|as|at|in|on|to|of|by|from|its|their|'
    + 'there (was|is|were)|it was|he was|she was|they were|this|these)\\b', 'i');

  // Short, all-lowercase words that may legitimately end a phrase. Note the
  // deliberate absence of "form": "that form" at the end of a clause is a
  // truncated "that forms", which is exactly the Caldera case.
  var SAFE_TAIL = new Set((
    'sea lava area asia india china japan java data era oil gas war law tax art age '
    + 'ice key way day set net top map aid ore coal sand clay rock soil lake hill '
    + 'cave peak bay gulf port ford park bank bond fund food crop seed rice wheat '
    + 'fish bird bear wolf deer tree leaf root wind rain snow fire melt burn flow '
    + 'wave tide heat cold warm cool mass size rate rank score part mode unit base '
    + 'core edge site zone west east north south global local rural urban national '
    + 'international federal public private civil military ancient modern medieval '
    + 'colonial contemporary early late first second third main major minor total '
    + 'north south east west').split(/\s+/));

  // -------------------------------------------------------------- credibility
  var SCAFFOLD = new RegExp('\\b('
    + 'click here|read more|learn more|see also|refer to|for more details|'
    + 'this article|this page|as of (writing|latest)|source needed|citation needed|'
    + 'unreferenced|needs? references?|stub|disambig|redirect|'
    + 'tropical-themed|theme park|water park|merchandise|shop for|'
    + 'official website|homepage|wikiwand|wikipedia|commons|'
    + 'compil(?:e|ed|ing)|firmware|toolchain)\\b', 'i');

  // ------------------------------------------------------------- specificity
  // "Tenerife is dominated by Teide" is true but teaches nothing beyond two
  // names. Padding that only restates the entity, and relation-only clauses.
  var CONTENT_FREE = new RegExp('('
    + '^is (dominated|known|noted|famous|located|situated|considered|part)\\b'
    + '|^are (dominated|known|noted|located|situated)\\b'
    + '|^one of the (most|more)\\b'
    + '|^(a|an|the) (type|kind|form|sort|class) of\\s*$'
    + '|^\\w+\\s+(is|was|are|were)\\s+(a|an|the)?\\s*(\\w+\\s+){0,1}(in|of|on|at|for|by|with|to)\\s*$'
    + '|^in\\s+(august|july|january|february|march|april|may|june|september|october|november|december)\\s+\\d{0,4}\\s*$'
    + ')', 'i');

  // --------------------------------------------------------------- grounding
  // Vocabulary a resolved type may legitimately be described in. `concept` is
  // the corpus default type and deliberately anchors nothing.
  //
  // Each type has a STRONG and a WEAK vocabulary, and the split is what keeps
  // theory honest. An earlier version used a single loose pattern with `\w*`
  // suffixes, which was a disaster in practice:
  //
  //     \bash\w*   -> "Ashton-under-Lyne"
  //     \bdome\w*  -> "Domestic violence"   (d-o-m-e-stic)
  //     \bcone\w*  -> "Coney Island"
  //     \bvent\w*  -> "invented", "prevented"
  //
  //  That admitted 3418 candidates for "Volcano", including county cricket
  //  clubs. So stems are now spelled out as whole words.
  //
  //  A second, subtler problem is that some terms are AMBIGUOUS across domains:
  //    "ventilation"  contains "vent"
  //    "acne mechanica" describes an "eruption" of the skin
  //    "plume"        is geology, aerospace and anatomy
  //  So each type now has a UNIQUE vocabulary (safe on its own) and an
  //  AMBIGUOUS one that only counts when corroborated -- by the entity's own
  //  resolved type, or by the sentence naming the topic.
  var TYPE_VOCAB = {
    volcano: {
      // "lava" is AMBIGUOUS, not unique. It looks like a safe domain term, but
      // "one of Rama's sons, Lava, ruled Uttara Kosala" is a description of a
      // person, and treating the word as authoritative promoted that sentence
      // into a volcanology theory. It now counts only when the speaker is
      // itself a place or a landform. "caldera" and "volcano" carry no such
      // risk and stay unique.
      unique: new RegExp('\\b(volcano\\w*|volcanism|volcanic|erupted\\s+(?:in|at|on)|'
        + 'magma\\w*|magmatic|crater\\w*|caldera\\w*|lahar\\w*|tephra|'
        + 'pyroclastic|stratovolcano\\w*|fumarole\\w*|volcanic\\s+hotspot|'
        + 'hotspot\\s+volcanism|ashfall|'
        + 'ash\\s*cloud|cinders?\\b|volcanic\\s*arc|igneous\\s+province|'
        + 'igneous\\s+rock|subduction\\s+zone|ring\\s+of\\s+fire)\\b', 'i'),
      ambig: new RegExp('\\b(lavas?\\b|eruption\\w*|vents?\\b|venting\\b|vented\\b|plume\\w*|'
        + 'cones?\\b|domes?\\b|ash\\b|ashes\\b|fissures?\\b|basalt\\w*|andesite|'
        + 'dacite|pumice|quench\\w*|hotspots?)\\b', 'i')
    },
    river: {
      unique: new RegExp('\\b(river\\w*|tributar\\w+|stream\\w*|watercourse\\w*|'
        + 'catchment\\w*|estuar\\w+|gorge\\w*|alluvial\\w*|riparian|riverine)\\b', 'i'),
      ambig: new RegExp('\\b(basin\\w*|delta\\w*|flood\\w*|drainage|watershed\\w*|'
        + 'confluen\\w+|meander\\w*|reservoir\\w*|channel\\w*|beds?)\\b', 'i')
    },
    mountain: {
      unique: new RegExp('\\b(mountain\\w*|mount\\b|mounts|peak\\w*|summit\\w*|'
        + 'massif\\w*|alpine|foothill\\w*|mountaineer\\w*)\\b', 'i'),
      ambig: new RegExp('\\b(range\\w*|altitude|elevation|slope\\w*|glacier\\w*|'
        + 'climb\\w*|ascent|plateau\\w*|highland\\w*|ridge\\w*)\\b', 'i')
    },
    disease: {
      unique: new RegExp('\\b(disease\\w*|illness\\w*|symptom\\w*|infection\\w*|'
        + 'pathogen\\w*|outbreak\\w*|epidemic\\w*|pandemic\\w*|syndrome\\w*|'
        + 'disorder\\w*)\\b', 'i'),
      ambig: new RegExp('\\b(patient\\w*|mortality|morbidity|treatment\\w*|therapy|'
        + 'immun\\w+|clinic\\w*|injur\\w+|disabilit\\w*|pain\\w*)\\b', 'i')
    },
    org: {
      // ANCHOR-REQUIRED. This vocabulary names a CLASS OF THING, not a domain
      // of study, so it cannot tell one organisation from another: "The Indian
      // Statistical Institute published a report on rainfall" satisfies it
      // exactly as well as a sentence about the Election Commission. Used as a
      // topic vocabulary it made every institutional sentence in the corpus a
      // fact about the topic, and "Election Commission of India" admitted 11,026
      // of them. For these types the sentence must ALSO name the topic, which
      // topicAnchorRe checks. Domain vocabularies such as volcano's -- magma,
      // vent, pyroclastic -- are distinctive enough to stand on their own, so
      // they keep the name as a fallback only.
      anchorRequired: true,
      unique: new RegExp('\\b(institute\\w*|institution\\w*|organisation\\w*|organization\\w*|'
        + 'agency\\w*|commission\\w*|authority\\w*|ministry|ministries|'
        + 'directorate\\w*|secretariat\\w*|observator(?:y|ies)|'
        + 'bureau\\w*|academy|societ(?:y|ies)|federation\\w*|foundation\\w*|'
        + 'universit(?:y|ies)|ministry\\w*)\\b', 'i'),
      ambig: new RegExp('\\b(establish\\w*|mandate\\w*|oversight|dedicated|'
        + 'headquarter\\w*|affiliate\\w*|department\\w*|council\\w*|committee\\w*)\\b', 'i')
    },
    person: {
      // ANCHOR-REQUIRED, for the same reason as org: "born", "president" and
      // "minister" describe a class of people, not this person.
      anchorRequired: true,
      unique: new RegExp('\\b(born|died|politician\\w*|statesman|monarch|sovereign|'
        + 'emperor\\w*|empress\\w*|president\\w*|prime minister|king\\w*|queen\\w*|'
        + 'author\\w*|writer\\w*|general\\w*|senator\\w*|minister\\w*|'
        + 'reigned|ruled|composer\\w*|philosopher\\w*|scientist\\w*)\\b', 'i'),
      ambig: new RegExp('\\b(actor\\w*|player\\w*|leader\\w*|scholar\\w*|poet\\w*|'
        + 'painter\\w*|succeeded|appointed|elected|noble\\w*)\\b', 'i')
    },
    city: {
      unique: new RegExp('\\b(city|cities|town\\w*|municipalit\\w+|metropolitan\\w*|'
        + 'urban\\w*)\\b', 'i'),
      ambig: new RegExp('\\b(district\\w*|province\\w*|population|inhabitants|'
        + 'municipality|borough\\w*|capital)\\b', 'i')
    },
    country: {
      unique: new RegExp('\\b(countr\\w+|nation\\w*|sovereign state|republic\\w*|'
        + 'kingdom\\w*|federation\\w*|nationality)\\b', 'i'),
      ambig: new RegExp('\\b(border\\w*|territor\\w+|independen\\w+|citizen\\w*|'
        + 'foreign|domestic)\\b', 'i')
    },
    battle: {
      // ANCHOR-REQUIRED: "army", "war" and "victory" describe warfare as a
      // class, so they cannot single out one engagement.
      anchorRequired: true,
      unique: new RegExp('\\b(battle\\w*|siege\\w*|arm(?:y|ies)|troops?\\b|'
        + 'campaig\\w*|combat\\w*|skirmish\\w*|invasion\\w*|war\\b|wars\\b)\\b', 'i'),
      ambig: new RegExp('\\b(victor\\w+|defeat\\w*|casualt\\w+|soldier\\w*|'
        + 'command\\w*|regiment\\w*|weapon\\w*)\\b', 'i')
    },
    organisation: null,
    concept: null
  };
  TYPE_VOCAB.organisation = TYPE_VOCAB.org;

  // Corroboration for an AMBIGUOUS term.
  //
  // Deliberately NOT the list of place-ish labels. "2014 Dan River coal ash
  // spill" resolves to type `place`, so a broad "place|region|state" set let
  // the word "ash" -- there, coal ash, not volcanic ash -- pass as a geology
  // claim. Corroboration has to come from the domain itself, not from the
  // entity merely being somewhere.
  var DOMAINISH = new RegExp('\\b(volcano|eruption|lava|magma|crater|caldera|'
    + 'mountain|glacier|valley|ridge|summit|terrain|tephra|pyroclastic)\\b', 'i');
  // A name-based corollary, kept equally narrow: "Mount Redoubt" may vouch for
  // "eruptions", "Dan River" may not. Note the absence of "lava" -- it is a
  // common noun and a personal name, so letting it vouch would let the node
  // "Lava" corroborate its own ambiguous term.
  var DOMAINISH_NAME = new RegExp('\\b(volcano\\w*|volcanic|eruption\\w*|magma\\w*|'
    + 'crater\\w*|caldera\\w*|mount\\b|mounts|peak\\w*)\\b', 'i');

  var STOP = new Set(('a an the of in on at to for from by with as is are was were be '
    + 'been being and or but that this these those it its their his her they he she '
    + 'we you i not no so if then than there here when where which who whom whose '
    + 'what while also more most less least such same other another both each any '
    + 'all some one two three can could may might must will would shall should do '
    + 'does did has have had about into over under between among during before after '
    + 'above below up down out off again further once only own very s t just now '
    + 'according one whose whose other most more such per via').split(' '));

  function words(s) {
    return String(s == null ? '' : s).toLowerCase().match(/[a-z][a-z'-]{1,}/g) || [];
  }
  function content(s) {
    return words(s).filter(function (w) { return !STOP.has(w) && w.length > 2; });
  }

  /**
   * Stem used for identity matching. The corpus is full of morphological
   * variants of the same entity -- "volcano" / "volcanic" / "volcanism" -- and an
   * exact substring test fails on all of them, which would wrongly exclude real
   * material. Trimming a few high-yield suffixes plus a 6-character prefix
   * match resolves the common cases without a full stemmer.
   */
  function stem(w) {
    var s = String(w).toLowerCase();
    return s.replace(/(ic|al|ism|isms|es|s)$/, '');
  }
  function mentions(haystack, token) {
    var h = String(haystack).toLowerCase();
    if (h.indexOf(token) >= 0) return true;
    var st = stem(token);
    if (st.length < 4) return false;
    if (h.indexOf(st) >= 0) return true;
    // The reverse direction (topic stem containing the entity stem) is only
    // safe for substantial tokens. Without the length floor a one- or
    // two-letter name matches almost any topic: "volcano".indexOf("de") is
    // true for Deal, Deism and Dal alike.
    if (token.length < 4) return false;
    return h.indexOf(token.slice(0, 6)) >= 0 || st.indexOf(h.slice(0, 6)) >= 0;
  }
  /**
   * A type's vocabulary, as a testable object.
   *
   *   .test(text)      true if the text speaks the domain. An AMBIGUOUS term
   *                    counts only when corroborated, which is decided here
   *                    from the entity's OWN resolved type. "volcanic cones"
   *                    and "the 2009 eruptions of Mount Redoubt" therefore pass
   *                    for a volcano or a mountain, while a skin "eruption"
   *                    and a fume hood's "vents" do not.
   *   .testUnique(t)   true only for UNAMBIGUOUS terms. Used when the question
   *                    is "is this about the TOPIC", where the corroborating
   *                    type is the speaker, not the sentence.
   *   .ambig           the ambiguous pattern, so callers can apply their own
   *                    corroboration rule.
   */
  function vocabFor(type) {
    var v = resolveVocab(type);
    if (!v) return null;
    var selfDomainish = DOMAINISH.test(String(type || ''));
    var o = {
      unique: v.unique,
      ambig: v.ambig,
      anchorRequired: !!v.anchorRequired,
      testUnique: function (t) { return !!(v.unique && v.unique.test(t)); },
      test: function (t) {
        if (o.testUnique(t)) return true;
        if (!v.ambig || !v.ambig.test(t)) return false;
        return selfDomainish;
      }
    };
    return o;
  }
  /**
   * Weak vocabulary: the AMBIGUOUS terms on their own. Enough to make something a
   * CANDIDATE for a place-like topic, never enough to make it a fact.
   */
  function weakVocabFor(type) {
    var v = resolveVocab(type);
    return v ? v.ambig : null;
  }
  function resolveVocab(type) {
    if (!type) return null;
    if (TYPE_VOCAB[type]) return TYPE_VOCAB[type];
    var t = String(type).toLowerCase();
    if (/volcan|eruption|lava|magma/.test(t)) return TYPE_VOCAB.volcano;
    if (/river|canal|stream|waterway/.test(t)) return TYPE_VOCAB.river;
    if (/mount|hill|peak|range|alpine|mountain/.test(t)) return TYPE_VOCAB.mountain;
    if (/organi|agency|institute|body|commission|ministry|academy/.test(t)) return TYPE_VOCAB.org;
    if (/disease|illness|syndrome|disorder/.test(t)) return TYPE_VOCAB.disease;
    if (/battle|war|military|campaign/.test(t)) return TYPE_VOCAB.battle;
    if (/person|human|leader|politician/.test(t)) return TYPE_VOCAB.person;
    if (/city|town/.test(t)) return TYPE_VOCAB.city;
    if (/country|nation|state/.test(t)) return TYPE_VOCAB.country;
    return null;
  }

  /** Capitalised tokens that are not the first word of the sentence. */
  function properNouns(text) {
    var toks = String(text).match(/[A-Za-z][A-Za-z'\u2019-]*/g) || [];
    return toks.slice(1).filter(function (t) { return /^[A-Z]/.test(t); })
      .map(function (t) { return t.toLowerCase(); });
  }

  /** Tokens of the entity/topic names, for identity comparison. */
  function nameTokens(name) {
    return content(String(name || ''));
  }

  /**
   * Foreign proper nouns: capitalised words that belong to neither the entity
   * nor the topic. A sentence dense in these is describing something else.
   * "Lava -- According to the Ramayana, one of Rama's sons, Lava, ruled
   * Uttara Kosala" carries ramayana/rama/uttara/kosala against entity "lava".
   */
  function foreignProperNouns(text, entity, topic) {
    var mine = new Set(nameTokens(entity).concat(nameTokens(topic)));
    return properNouns(text).filter(function (t) { return !mine.has(t); });
  }

  /** Does the sentence talk about the thing it is filed under? */
  function grounded(text, entity, type, topic, lexicon) {
    var t = String(text).toLowerCase();
    var vocab = vocabFor(type);
    if (vocab && vocab.test(text)) return { ok: true, why: 'type vocabulary: ' + type };
    var toks = nameTokens(entity);
    if (toks.length && toks.some(function (w) { return mentions(t, w); })) {
      return { ok: true, why: 'entity name' };
    }
    var tt = nameTokens(topic);
    if (tt.length && tt.some(function (w) { return mentions(t, w); })) {
      return { ok: true, why: 'topic name' };
    }
    return { ok: false, why: 'no anchor to entity, type or topic' };
  }

  /** A claim needs content beyond merely restating the entity's own name. */
  function hasPayload(text, entity) {
    var nm = String(entity || '').toLowerCase();
    return content(text).filter(function (w) {
      return nm.indexOf(w) < 0 && stem(nm).indexOf(stem(w)) < 0;
    }).length > 0;
  }

  /**
   * Possible mid-word truncation.
   *
   * Shape alone cannot do this job: "the Earth's crust" and "the highest moun"
   * both end in a five-letter lowercase token. The discriminator has to be
   * lexical, so the caller supplies corpus vocabulary as a poor-man's
   * dictionary. A tail token that occurs nowhere in 493k corpus names and
   * descriptions is a truncation artefact; one that does occur is a real word.
   *
   * With no lexicon supplied, truncation is not guessed at -- the gate returns
   * false rather than inventing a judgement it cannot support.
   */
function looksTruncated(s, lexicon) {
    // Structural cuts, which need no vocabulary to recognise. These were being
    // displayed as [ASSERTED] with the break visible: "The Abraham Lincoln
    // Presidential Library and Museum documents the life of the 16th U.S" and
    // "Netaji Subhas Chandra Bose International Airport (IATA". The first ends
    // on a severed abbreviation, because "U.S" contains dots and so failed the
    // word-shape test below; the second is an unclosed parenthesis.
    if (/\([^)]*$/.test(s)) return true;                       // unclosed "(IATA"
    if (/(?:\b[A-Z]\.){1,}[A-Z]?$/.test(s.replace(/[.!?]$/, ''))) return true;
    if (!lexicon || !lexicon.size) return false;
    var body = s.replace(/[.!?,;:]\s*$/, '');
    if (/[.!?]$/.test(s)) return false;
    var toks = body.split(/\s+/);
    if (toks.length < 8) return false;
    var last = toks[toks.length - 1];
    // A token carrying an apostrophe or hyphen ("Hawai'i", "sea-level") is a
    // complete word, not a severed one. Stripping the punctuation to test it
    // would invent a string that appears nowhere in the corpus.
    if (!/^[A-Za-z]+$/.test(last)) return false;
    last = last.toLowerCase();
    if (!/^[a-z]{3,6}$/.test(last)) return false;
    if (SAFE_TAIL.has(last)) return false;
    return !lexicon.has(last);
  }

  /**
   * Whole-word name anchor.
   *
   * `mentions()` is deliberately lenient -- it does substring matching so that
   * morphological variants of a name are caught -- but that leniency is wrong
   * for deciding whether a sentence is ABOUT a topic. The topic "Rang Mahal,
   * Sri Ganganagar" contributed the token "rang", and plain substring matching
   * found "rang" inside "range", so "The Petermann Ranges are a mountain range
   * in central Australia" was accepted as being about Rang Mahal. Anchoring
   * therefore allows only a real inflection suffix, never an arbitrary tail.
   *
   * The five-character floor is the other half of the fix. Four-letter tokens
   * collide with ordinary words too often to identify a topic: "Rang Mahal, Sri
   * Ganganagar" contributes "rang", which matched both "Petermann Ranges" (as
   * rang+es) and "Song Hye-rang". A short token proves nothing, so a topic whose
   * only anchor is that short correctly falls back to NEEDS SOURCE.
   */
  function nameAnchorRe(tokens) {
    var parts = (tokens || []).filter(function (w) { return w.length >= 5; })
      .map(function (w) {
        return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es|ed|ing)?';
      });
    return parts.length ? new RegExp('\\b(?:' + parts.join('|') + ')\\b', 'i') : null;
  }

  /**
   * The distinctive words of a topic name, one per word, each stemmed.
   *
   * A topic name is a phrase, so it must be tokenised before anything is
   * matched against it. Treating the phrase as a single string is what let
   * "vegetation" recruit "Geta Bratescu" and "Geta (footwear)": the substring
   * "geta" occurs inside "veGETAtion". The same mistake made
   * FG.stem("International Year of Soils") return a phrase, "international year
   * of soil", which contains "internation" -- so every node with "International"
   * in its name looked like a member of an observance day.
   *
   * Tokens shorter than five characters are dropped, for the reason given in
   * nameAnchorRe: "year" and "rang" are too common to identify anything. The
   * length test applies to the word as written, not to its stem, so the plural
   * "soils" survives and stems to the four-character "soil".
   */
  function topicTokens(name) {
    var out = [];
    String(name == null ? '' : name).toLowerCase()
      .split(/[^a-z0-9]+/)
      .forEach(function (w) {
        if (w.length < 5) return;
        var s = stem(w);
        if (s.length < 4) return;
        if (out.indexOf(s) < 0) out.push(s);
      });
    return out;
  }

  /**
   * The one word that has to be present for a sentence to be about the topic:
   * the head of the name, i.e. the last distinctive word.
   *
   * Accepting ANY word of a multi-word topic is far too weak. "Marriott
   * International" contains "International", but it is not about the
   * International Year of Soils; the head word "soils" is what carries the
   * meaning, and requiring it keeps "Australian Soil Classification" while
   * dropping "Benina International Airport".
   */
  function topicAnchorRe(name) {
    var words = String(name == null ? '' : name).toLowerCase().split(/[^a-z0-9]+/)
      .filter(function (w) { return w.length >= 5; });
    if (!words.length) return null;
    var head = stem(words[words.length - 1]);
    if (head.length < 4) return null;
    return new RegExp('\\b' + head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?\\b', 'i');
  }

  /**
   * Gate one raw sentence.
   *
   * @param {string} text       raw corpus description
   * @param {string} entity     the node name it is filed under
   * @param {string} type       resolved type of that node
   * @param {string} [topic]    topic currently being built
   * @param {Set}   [lexicon]   corpus vocabulary, for truncation detection
   * @param {RegExp}[topicVocab] STRONG vocabulary of the TOPIC's type
   * @param {boolean}[strictAnchor] require EVERY distinctive word of the topic
   *        name, not just its head. Set when the topic node is only a rough
   *        stand-in for what was asked for, so a generic head word such as the
   *        "systems" of "Advanced Drainage Systems" cannot carry a theory.
   * @returns {{verdict:string,text:string,reason:string,gate:string}}
   */
  function evaluate(text, entity, type, topic, lexicon, topicVocab, strictAnchor) {
    var raw = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    // An empty bracket pair carries no information, so it is not evidence and
    // should not be shown: "Carbonatite () is a type of intrusive rock" is the
    // corpus's "Carbonatite" with an emptied pronunciation slot.
    var shown = raw.replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').trim();
    var mk = function (verdict, reason, gate) {
      return { verdict: verdict, text: shown, reason: reason, gate: gate };
    };
    var ipa = IPA.test(raw);
    // Strip pronunciation residue before the other tests, so "A caldera ( ... )"
    // is judged on its actual claim and merely downgraded, not thrown away.
    // The bracket pair goes too, otherwise stripping leaves a bare "() " that
    // reads as a missing term in the finished sentence.
    var s = raw.replace(IPA, ' ').replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').trim();

    if (!s) return mk('reject', 'empty description', 'structure');
    if (s.length < 15) return mk('reject', 'too short to carry a claim', 'structure');

    // ---- GATE 1: structure
    if (CLOZE.test(s)) return mk('reject', 'cloze blank left by the mining pass', 'structure');
    if (s.split(/\s+/).length < 5) return mk('reject', 'fragment: too few words to be a claim', 'structure');
    if (LOWER_START_STOPS.test(s) && !/^[A-Z]/.test(s)) {
      return mk('reject', 'sentence fragment starting mid-thought', 'structure');
    }

    // ---- GATE 2: credibility
    if (SCAFFOLD.test(s)) return mk('reject', 'scaffold/promotional text, not an examinable claim', 'credibility');

    // ---- GATE 3: domain alignment (the graph-layer / theory-layer split)
    var vocab = vocabFor(type);
    if (vocab && !vocab.test(s)) {
      var tt = nameTokens(topic);
      var tlow = s.toLowerCase();
      var onTopic = tt.length && tt.some(function (w) { return mentions(tlow, w); });
      if (!onTopic) {
        return mk('offtopic', 'valid in the graph layer, but not about ' +
          (type || 'this') + ' -- excluded from this theory', 'domain');
      }
    }

    // ---- GATE 4: identity, for types with no vocabulary of their own
    if (!vocab) {
      var foreign = foreignProperNouns(s, entity, topic);
      if (foreign.length >= 3) {
        return mk('offtopic', 'describes a different entity (' +
          foreign.slice(0, 3).join(', ') + '), not ' + (entity || 'the topic'), 'identity');
      }
    }

    // ---- GATE 5: must still be anchored to its entity
    var g = grounded(s, entity, type, topic, lexicon);
    if (!g.ok) return mk('offtopic', 'not grounded: ' + g.why, 'grounding');

    // ---- GATE 6: topical relevance to the topic being built.
    //
    // This is the gate that enforces the Graph-layer / Theory-layer split, and
    // it is not the same test as GATE 5. A sentence can be impeccably about
    // its own entity and have nothing to do with the topic:
    //
    //   Fume hood          "a type of local exhaust ventilation device that is
    //                       designed to prevent users from being exposed to
    //                       hazardous fumes, vapors, and dusts"
    //   Mechanical ventilation  "...using a ventilator machine to fully or
    //                       partially provide artificial..."
    //   Alpine climbing    "a type of mountaineering that uses any of a broad
    //                       range of advanced climbing techniques..."
    //
    // All of them are real corpus neighbours of the Volcano node, because
    // co-occurrence records which question set an entity appeared in, not what
    // it means. Being grounded in the entity is not the same as belonging to the
    // topic, so a fact must ALSO speak the topic's vocabulary or name it.
    //
    // Note the corroboration here is the MEMBER's own type, not the topic's.
    // "The 2009 eruptions of Mount Redoubt" speaks the topic only through the
    // ambiguous term "eruptions", but Mount Redoubt is itself a mountain, so the
    // speaker's type vouches for it. A polytunnel's "vents" gets no such
    // voucher, and neither does an acne patient's "eruption".
    // The topic anchor is checked for EVERY topic, vocabulary or not. A topic
    // whose resolved type is `misc` has no vocabulary, and that is exactly when
    // the gate is most needed: for "Rang Mahal, Sri Ganganagar" (type misc) the
    // co-occurrence neighbours included Fine Art, Fine Chemical and the
    // American Fine Arts Society -- impeccable descriptions of their own
    // entities, all of them irrelevant. With no vocabulary available, the name
    // anchor is the only evidence there is, so it is used.
    //
    // An earlier version also deleted the entity's own name from the text
    // before asking, to stop "Lava" satisfying the test by being called Lava.
    // That was the wrong tool: it made "A shield volcano is a type of volcano"
    // untestable, because stripping the entity removed every occurrence of the
    // word. The ambiguity is handled where it actually lives, by classifying
    // "lava" as an ambiguous term rather than a unique one.
    var topTok = nameTokens(topic);
    var topRe = topicAnchorRe(topic);
    // Normally the head word alone anchors the topic. Two situations demand
    // every distinctive word instead:
    //   - the topic node is only a rough stand-in for the query, so the generic
    //     "systems" of "Advanced Drainage Systems" must not admit "Male
    //     reproductive system";
    //   - the topic's vocabulary describes a class rather than a domain, so the
    //     name is the only thing that can single the topic out. The head word
    //     alone is no use there either: for "Election Commission of India" the
    //     head is "India", which every Indian sentence contains.
    var useAll = !!strictAnchor || !!(topicVocab && topicVocab.anchorRequired);
    var anchors = useAll
      ? (topicTokens(topic).map(function (s) {
          return new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?\\b', 'i');
        }))
      : (topRe ? [topRe] : []);
    var anchored = function (str) {
      return anchors.length > 0 && anchors.every(function (r) { return r.test(str); });
    };
    if (topicVocab) {
      var saysTopic = topicVocab.testUnique(s);
      if (!saysTopic && topicVocab.ambig && topicVocab.ambig.test(s)) {
        var vouches = DOMAINISH.test(String(type || '')) ||
          DOMAINISH_NAME.test(String(entity || ''));
        saysTopic = vouches;
      }
      if (!saysTopic && anchored(s)) saysTopic = true;
      if (!saysTopic) {
        return mk('offtopic', 'about its own entity but not about ' + (topic || 'the topic') +
          ' \u2014 co-occurrence is not a relation', 'topicality');
      }
      // For a class-generic vocabulary the name anchor is not a fallback, it is
      // the whole point: "institution" cannot mean this particular institution.
      if (topicVocab.anchorRequired && !anchored(s)) {
        return mk('offtopic', 'satisfies the vocabulary of its type but never names ' +
          (topic || 'the topic') + ' \u2014 the word "' +
          String(type || '') + '" is not specific to this entity', 'topicality');
      }
    } else {
      if (!anchored(s)) {
        return mk('offtopic', 'no vocabulary for this topic type, and the sentence does ' +
          'not name ' + (topic || 'it') + ' \u2014 co-occurrence is not a relation',
          'topicality');
      }
    }

    // ---- now it is a real claim; judge its quality
    var trunc = looksTruncated(s, lexicon);
    if (!hasPayload(s, entity)) {
      return mk('weak', 'only restates the entity name, no new content', 'specificity');
    }
    var body = s.replace(/[.!?]\s*$/, '');
    if (CONTENT_FREE.test(body)) {
      return mk('weak', 'true but thin: a relation with no examinable payload', 'specificity');
    }
    if (trunc) return mk('weak', 'possible mid-word truncation; content kept but not promoted', 'structure');
    if (ipa) return mk('weak', 'clean claim, but source sentence carried pronunciation residue', 'structure');
    return mk('fact', 'passed all gates', 'ok');
  }

  /**
   * Bulk use: keep the sentences that may be shown, best-first, capped so a
   * high-count node cannot flood a theory slot (the anti-encyclopedia rule).
   */
  function usable(candidates, entity, type, topic, max) {
    var out = [];
    (candidates || []).forEach(function (text, i) {
      var v = evaluate(text, entity, type, topic);
      if (v.verdict === 'fact' || v.verdict === 'weak') {
        out.push({ text: v.text, verdict: v.verdict, reason: v.reason, gate: v.gate, src: i });
      }
    });
    out.sort(function (a, b) {
      return (a.verdict === b.verdict) ? 0 : (a.verdict === 'fact' ? -1 : 1);
    });
    return max ? out.slice(0, max) : out;
  }

  return {
    evaluate: evaluate, usable: usable, grounded: grounded,
    hasPayload: hasPayload, looksTruncated: looksTruncated,
    vocabFor: vocabFor, weakVocabFor: weakVocabFor, resolveVocab: resolveVocab,
    nameAnchorRe: nameAnchorRe, topicTokens: topicTokens, topicAnchorRe: topicAnchorRe,
    stem: stem, mentions: mentions, content: content, nameTokens: nameTokens
  };
}));

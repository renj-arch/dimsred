/*
 * theory-frame.js -- the capability layer that sits between the graph and the
 *                   answer frame.
 *
 * THE THREE LAYERS
 * ----------------
 *   GRAPH layer   dynamic, evidence-driven: "what is connected to X?"
 *                 Straight from typed edges and co-occurrence. Good for
 *                 discovery. Bad as a syllabus, because it lists 97 peers.
 *
 *   THEORY layer  capability-driven: "what should I understand about X?"
 *                 A fixed set of Mains capability SLOTS, each filled only by
 *                 evidence that actually supports it, and left explicitly
 *                 empty when it does not. This is the anti-encyclopedia layer:
 *                 the number of branches is constant, so a topic can never
 *                 balloon into a list.
 *
 *   ANSWER layer  question-driven: intro / body / challenges / way forward /
 *                 conclusion, assembled from the theory slots. See gen-mains.
 *
 * WHY SLOTS AND NOT CATEGORIES
 * ----------------------------
 * The corpus can tell you a topic appears under 69 category labels summing to
 * 5023 mentions, and that "World Geography" alone accounts for 763 of them.
 * That is a measure of how much material exists, not of what a candidate must
 * know. Presenting it as a branch produces exactly the "Volcano -> 97 items"
 * output this layer exists to replace. So category weight is reported as
 * corpus-relevance evidence and never as a theory branch.
 *
 * NOTHING HERE IS TOPIC-SPECIFIC
 * ------------------------------
 * Dimensions and slots are defined by capability, and each is filled by
 * matching the slot's *intent* against generic vocabulary and the entity's
 * RESOLVED TYPE. Nothing says "volcano", "India's volcanoes", or "Krakatoa".
 * The same frame runs for a river, a war, a disease or a constitutional article;
 * it simply fills fewer slots when the corpus is thinner, and says so.
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TheoryFrame = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =====================================================================
  // DIMENSIONS
  // =====================================================================
  // A Mains answer is expected to sweep a fixed set of lenses. These are the
  // lenses, defined generically. Weight is a prior only; real support comes
  // from matching facts, and an unfilled dimension is reported as empty rather
  // than padded.
  var DIMENSIONS = [
    { key: 'GEOGRAPHICAL', icon: '\u{1F30D}', label: 'Geographical',
      lex: new RegExp('\\b(location|located|geograph\\w+|latitude|longitude|hemisphere|'
        + 'terrain|coast\\w*|coastal|inland|border\\w*|peninsula|delta|plateau|plain|'
        + 'elevation|altitude|territory|territories|distribution|spread|region|regions|'
        + 'valley|basin|island|islands|ocean|sea|continent\\w*|tropic\\w*|equator|'
        + 'hemispheres|whereabouts)\\b', 'i') },
    { key: 'GEOLOGICAL', icon: '\u{1F5A5}', label: 'Geological / Earth science',
      lex: new RegExp('\\b(geolog\\w+|rock|rocks|mineral\\w*|tectonic\\w*|crust|mantle|magma|'
        + 'lava|sediment\\w*|erosion|deposition|strata|stratum|fault\\w*|seismic\\w*|'
        + 'earthquake\\w*|volcan\\w+|plate|plates|basalt|granite|fossil\\w*|'
        + 'topograph\\w+|morpholog\\w+|geomorpholog\\w+|soil|sedimentary|metamorphic)\\b', 'i') },
    { key: 'ENVIRONMENTAL', icon: '\u{1F331}', label: 'Environmental',
      lex: new RegExp('\\b(ecosystem\\w*|habitat\\w*|species|biodiversity|wildlife|forest\\w*|'
        + 'conservation\\w*|pollution\\w*|contaminat\\w*|emission\\w*|carbon|greenhouse|'
        + 'waste|sewage|pollutant\\w*|sanitation|protected area|national park\\w*|'
        + 'deforest\\w*|afforest\\w*|ecolog\\w+|ozone|acid rain)\\b', 'i') },
    { key: 'ECONOMIC', icon: '\u{1F4B0}', label: 'Economic',
      lex: new RegExp('\\b(econom\\w+|cost\\w*|revenue|market\\w*|industr\\w+|agricultur\\w+|'
        + 'employment|unemploy\\w+|gdp|invest\\w+|trade|export\\w*|import\\w*|'
        + 'infrastructur\\w+|tourism|livelihood\\w*|subsid\\w+|budget|finance\\w*|'
        + 'business|commercial|profit\\w*|losses|livestock|fisher\\w+|damages?)\\b', 'i') },
    { key: 'SOCIAL', icon: '\u{1F465}', label: 'Social',
      lex: new RegExp('\\b(population|communit\\w+|displac\\w+|migration|migrant\\w*|'
        + 'household\\w*|caste|tribe\\w*|tribal|gender|women|child\\w*|education\\w*|'
        + 'school\\w*|health\\w*|hospital\\w*|sanit\\w+|social|inequalit\\w+|poverty|poor|'
        + 'vulnerab\\w+|exposure|settle\\w*|livelihoods?)\\b', 'i') },
    { key: 'CLIMATE', icon: '\u{1F321}', label: 'Climate',
      lex: new RegExp('\\b(climat\\w+|temperature\\w*|rainfall|monsoon|aerosol\\w*|'
        + 'sulphur dioxide|sulfur dioxide|so2|cooling effect|global warming|'
        + 'greenhouse gas\\w*|emission\\w*|variabilit\\w+|season\\w*|drought|'
        + 'precipitation|weather\\w*)\\b', 'i') },
    { key: 'DISASTER_MANAGEMENT', icon: '\u{1F6A8}', label: 'Disaster management',
      lex: new RegExp('\\b(disaster\\w*|hazard\\w*|monitor\\w+|early warning|warning system\\w*|'
        + 'evacuat\\w+|preparedness|mitigat\\w+|rescue|relief|resilien\\w+|'
        + 'risk zoning|risk assess\\w+|forecast\\w+|alert\\w*|response plan\\w*|'
        + 'contingenc\\w+|seismolog\\w+|eruption\\w*|outbreak)\\b', 'i') },
    { key: 'POLITICAL', icon: '\u{1F3DB}', label: 'Political / institutional',
      lex: new RegExp('\\b(polic\\w+|legislat\\w+|act\\b|rule\\w*|parliament\\w+|congress|'
        + 'ministry|government\\w*|constitution\\w*|provision\\w*|amendment\\w*|'
        + 'governance|election\\w*|regulat\\w+|compliance|enforcement|'
        + 'authorit\\w+|mandate|jurisdiction)\\b', 'i') },
    { key: 'CULTURAL', icon: '\u{1F3AD}', label: 'Cultural',
      lex: new RegExp('\\b(heritage|tradition\\w*|architectur\\w+|festival\\w*|art\\w*|music\\w*|'
        + 'cuisine|literature\\w*|ritual\\w*|custom\\w*|monument\\w*|temple\\w*|'
        + 'culture\\w*|archaeolog\\w+|histor\\w+|historically)\\b', 'i') },
    { key: 'SCIENCE_TECH', icon: '\u{1F52C}', label: 'Science & technology',
      lex: new RegExp('\\b(technolog\\w+|research\\w*|innovation\\w*|satellite\\w*|instrument\\w*|'
        + 'algorithm\\w*|laborator\\w*|telescope\\w*|sensor\\w*|model\\w*|'
        + 'observation\\w*|detect\\w+|measurement\\w*|survey\\w*)\\b', 'i') },
    { key: 'HEALTH', icon: '\u{1FA7A}', label: 'Health',
      lex: new RegExp('\\b(disease\\w*|illness\\w*|symptom\\w*|infection\\w*|patient\\w*|'
        + 'treatment\\w*|mortality|morbidity|pathogen\\w*|epidemic\\w*|'
        + 'nutrit\\w+|medicine\\w*|therapy|therapies|immun\\w+|clinical)\\b', 'i') }
  ];

  // =====================================================================
  // THEORY SLOTS
  // =====================================================================
  // Constant branch count. Each slot declares how it may be filled, so a slot
  // either has evidence behind it or is reported as NEEDS SOURCE. A slot is
  // never padded to look complete.
  var SLOTS = [
    { key: 'DEFINITION', label: 'Definition',
      hint: 'what the thing is',
      self: true,
      lex: new RegExp('\\b(is|are|means|refers to|known as|defined as|consists of)\\b', 'i') },
    { key: 'FORMATION', label: 'Formation & mechanism',
      hint: 'why or how it arises',
      // A formation claim names a formation, or describes something being
      // brought into being. Bare causal and process verbs are not enough: on
      // the Climate topic they pulled "grow faster as the climate warms" into
      // FORMATION via "produce", and put a sentence of pure causation,
      // "...due to climate change", there too. Each generic verb is therefore
      // either dropped or admitted only in a specific passive/collocation form.
      lex: new RegExp('\\b(formation|formed|forming|origin\\w*|genesis|arise\\w*|arose|'
        + 'emerg\\w*|result\\w*|caused by|created by|generated by|produced by|'
        + 'built|construct\\w*|establish\\w*|mechanism\\w*|process\\w*\\s+of|'
        + 'develop\\w*\\s+(?:over|through|from|during))\\b', 'i') },
    { key: 'TYPES', label: 'Types & classification',
      hint: 'the recognised kinds',
      byMemberType: true,
      // Deliberately phrase-based rather than bare keywords. A loose list of
      // `type|class|form|category` matched "first-class county club" and filed
      // Hampshire County Cricket Club as a kind of volcano. Taxonomy language
      // has to appear as a construction, not as a stray noun.
      //
      // "consists of" and "comprises" were dropped for the same reason: they
      // describe composition, not taxonomy, and they pulled in "The Apollo 17
      // lunar sample display consists of a Moon rock fragment from a lava ..."
      lex: new RegExp('\\b(types? of|categories of|classif\\w+|'
        + 'subtypes?|sub-types?|varieties of|variants? of|'
        + '(is|are) (a|an|the) \\w+ (type|kind|form|class|category) of|'
        + 'classified (as|into|under)|division of|family of|'
        + 'types? include)\\b', 'i') },
    { key: 'DISTRIBUTION', label: 'Distribution & location',
      hint: 'where it is found',
      byResolvedType: ['place', 'country', 'state', 'city', 'region', 'river', 'mountain'],
      lex: new RegExp('\\b(distribut\\w+|located|situated|found in|occurs in|present in|'
        + 'geographic\\w*|spread|range(?!\\s+of\\b)|region\\w*|continent\\w*|'
        + 'concentrat\\w+\\s+(?:in|across|around|near|along|within|over|throughout))\\b', 'i') },
    { key: 'HAZARDS', label: 'Hazards & adverse effects',
      hint: 'what can go wrong',
      lex: new RegExp('\\b(hazard\\w*|risk\\w*|danger\\w*|threat\\w*|damage\\w*|destr\\w+|'
        + 'death\\w*|casualt\\w+|injur\\w+|disast\\w+|catastroph\\w*|'
        + 'erupt\\w+|landslide\\w*|tsunami\\w*|flood\\w*|ash cloud|lahar\\w*)\\b', 'i') },
    { key: 'BENEFITS', label: 'Benefits & utility',
      hint: 'what it is good for',
      // "source of", "supports" and "provides" were doing real damage here:
      // "Atwell Peak was the source of many pyroclastic flows" and PHIVOLCS
      // "provides information on the activities of volcanoes" are not benefits
      // claims, and the bare forms filed both under BENEFITS. They now have to
      // name a benefit to count.
      lex: new RegExp('\\b(benefit\\w*|advantage\\w*|useful|utility|geothermal|fertile|'
        + 'fertil\\w+|productiv\\w+|economic\\w*|tourism|recreation\\w*|'
        + 'conservation\\w*|medicinal|valuable|used\\s+for\\b|'
        + 'source of (?!many|its|their|some|most|all|water|sediment|material|rock|soil)'
        + '[a-z ]{0,20}(food|feed|income|revenue|medicin\\w+|energy|power|'
        + 'hydro\\w*|fertil\\w+|timber|fuel|building|construction|mineral\\w*|ore|'
        + 'aggregate|livelihood|employment|tourism)|'
        + '(support|provide)\\w*\\s+(?!information\\s+(on|about))(?!data\\s+on)'
        + '[a-z ]{0,20}(food|feed|income|revenue|medicin\\w+|energy|power|'
        + 'hydro\\w*|fertil\\w+|timber|fuel|building|construction|mineral\\w*|ore|'
        + 'livelihood|employment|tourism|sustenance))\\b', 'i') },
    { key: 'MONITORING', label: 'Monitoring & observation',
      hint: 'how it is watched',
      byResolvedType: ['org', 'organisation', 'institution'],
      lex: new RegExp('\\b(monitor\\w*|observ\\w+|track\\w*|surveil\\w*|watchdog\\w*|'
        + 'early warning|network of|station\\w*|observator\\w+|'
        + 'seismolog\\w+|volcanolog\\w+|forecast\\w*|detection|'
        // An agency "providing information on the activities of" a hazard is
        // performing monitoring even without saying the word; PHIVOLCS, the
        // only real monitoring body in the Volcano corpus, is phrased this way.
        + '(information|data|bulletin\\w*|update\\w*|warning\\w*)\\s+'
        + '(on|about|regarding|of)\\b|activities\\s+of)\\b', 'i') },
    { key: 'MANAGEMENT', label: 'Management & response',
      hint: 'what is done about it',
      // "response" only counts as management when it is not the passive
      // "in response to" -- "in response to a doubling of the CO2" describes a
      // scientific sensitivity, not anything anyone is doing about the problem.
      lex: new RegExp('\\b(manage\\w+|management|mitigat\\w+|(?<!in )response|remediat\\w+|'
        + 'control\\w*|contain\\w*|prevent\\w+|preparedness|policy|'
        + 'regulat\\w+|zoning|evacuat\\w+|resilien\\w+|restoration|'
        + 'conservation measure\\w*|intervention)\\b', 'i') },
    { key: 'CASE_STUDIES', label: 'Illustrative cases',
      hint: 'concrete instances worth remembering',
      byMember: true }
  ];

  var SLOT_BY_KEY = {};
  SLOTS.forEach(function (s) { SLOT_BY_KEY[s.key] = s; });

  // =====================================================================
  // INDIA HOOK
  // =====================================================================
  // UPSC rewards the India hook, so every topic attempts one. It is derived,
  // never typed in: a member counts as Indian when the graph or a gated fact
  // places it in India. The five sub-branches are fixed; any that the corpus
  // cannot support is reported empty, which is itself useful signal.
  var INDIA_BRANCHES = [
    { key: 'examples',       label: 'Indian examples' },
    { key: 'geography',      label: 'Indian geography' },
    { key: 'institutions',   label: 'Indian institutions' },
    { key: 'policies',       label: 'Indian policies & schemes' },
    { key: 'case_studies',   label: 'Indian case studies' },
    { key: 'challenges',     label: 'Indian challenges' }
  ];

  var INDIA_LEX = new RegExp('\\b(india|indian|bharat|delhi|mumbai|chennai|kolkata|'
    + 'bengaluru|bangalore|hyderabad|pune|ahmedabad|surat|jaipur|lucknow|'
    + 'andaman|nicobar|lakshadweep|ladakh|himachal|uttarakhand|odisha|orissa|'
    + 'bihar|jharkhand|chhattisgarh|madhya pradesh|rajasthan|gujarat|maharashtra|'
    + 'karnataka|tamil nadu|kerala|goa|punjab|haryana|assam|manipur|meghalaya|'
    + 'tripura|nagaland|mizoram|arunachal|sikkim|bengal|pondicherry|'
    + 'amarkantak|chambal|himadri|bhakra|tehri|satpura|deccan|thar|'
    + 'ganga|brahmaputra|indus|godavari|krishna|cavery)\\b', 'i');

  var INDIA_TYPE_HINT = new RegExp('\\b(indian|institute of|ministry of|commission|'
    + 'national|central|state)\\b', 'i');

  // =====================================================================
  // MATCHING
  // =====================================================================

  /** Does a gated fact support a dimension? Returns 0..n evidence count. */
  function dimensionHits(text) {
    var hits = [];
    DIMENSIONS.forEach(function (d) {
      var m = String(text || '').match(new RegExp(d.lex.source, 'gi'));
      if (m && m.length) hits.push({ key: d.key, label: d.label, icon: d.icon, n: m.length,
                                     terms: Array.from(new Set(m.map(function (x) { return x.toLowerCase(); }))).slice(0, 6) });
    });
    return hits;
  }

  /** Does a gated fact support a slot? Returns 0..n evidence count. */
  function slotHits(text) {
    var hits = [];
    SLOTS.forEach(function (s) {
      if (!s.lex) return;
      var m = String(text || '').match(new RegExp(s.lex.source, 'gi'));
      if (m && m.length) hits.push({ key: s.key, label: s.label, hint: s.hint, n: m.length });
    });
    return hits;
  }

  /** Is this entity Indian, and in which sub-branch? */
  function indiaBranch(name, resolvedType, text) {
    var n = String(name || '');
    var t = String(text || '');
    var inIndia = INDIA_LEX.test(n) || INDIA_LEX.test(t);
    if (!inIndia) return null;
    var ty = String(resolvedType || '');
    if (/org|institution|commission|ministry|agency|council/i.test(ty) || INDIA_TYPE_HINT.test(t)) {
      return 'institutions';
    }
    if (/place|country|region|island|mountain|river|city|state/i.test(ty)) return 'geography';
    if (/event|battle|eruption|disaster/i.test(ty)) return 'case_studies';
    if (/schemes?|policy|programme|program|mission|act/i.test(ty)) return 'policies';
    if (/challenge|problem|issue|deficit|shortage/i.test(ty)) return 'challenges';
    return 'examples';
  }

  function indiaLabel(key) {
    var b = INDIA_BRANCHES.filter(function (x) { return x.key === key; })[0];
    return b ? b.label : key;
  }

  return {
    DIMENSIONS: DIMENSIONS,
    SLOTS: SLOTS,
    SLOT_BY_KEY: SLOT_BY_KEY,
    INDIA_BRANCHES: INDIA_BRANCHES,
    INDIA_LEX: INDIA_LEX,
    dimensionHits: dimensionHits,
    slotHits: slotHits,
    indiaBranch: indiaBranch,
    indiaLabel: indiaLabel
  };
}));

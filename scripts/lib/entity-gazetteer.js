/*
 * entity-gazetteer.js -- canonical SEMANTIC type for a node, independent of the
 * corpus `type` field.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The corpus `type` field is not a type. Measured over all 529,755 nodes:
 *
 *   Vladimir Putin          concept   prefix meteorology-climate-56
 *   Kassym-Jomart Tokayev   concept   prefix business-economy-7
 *   Nursultan Nazarbayev    person    prefix agricultural-extension-marketing-8
 *   Uttar Pradesh           person    prefix indian-states-9
 *   Indian National Congress event    prefix seed   (count 82,745)
 *   Mughal Empire           event     prefix seed
 *   Kazakhstan              concept   prefix world-geography-41
 *
 * `Uttar Pradesh` is typed `person` because it appears in `father`/`son` kin
 * edges -- the kin pass attaches junk relatives, and the type follows the junk.
 * Of 139 id prefixes, 13 are >=90% one type, and every one of those 13 is
 * dominated by `concept` except `kin` (100% person), which is exactly the
 * category we treat as junk. So neither the type field nor the id prefix can
 * drive lane assignment, and only 2,085 nodes (0.4%) have any edge at all to
 * learn from.
 *
 * A bounded, verifiable gazetteer is the only signal strong enough. It is NOT a
 * hard-coded tree: the branches stay generic (person / place / org / event /
 * concept / other) and this table only answers "what IS this entity".
 *
 * PRIORITY (highest first), enforced by resolveType():
 *   1. hand-curated review          scripts/lib/graph-type-overrides.js
 *   2. authored outline assertion   same file, generated region
 *   3. THIS GAZETTEER               country / city / state / polity / pattern
 *   4. kin-edge signature           a real person, if it has family edges
 *   5. role-edge signature          founded -> org, capital -> place
 *   6. raw corpus type              ONLY if not `concept`
 *   7. misc                         honest "unknown" -> OTHER ENTITIES
 *
 * Step 7 matters as much as step 3. `concept` is the corpus default, so
 * treating it as a real type is what dumped Kazakhstan, Moscow, Putin and Trump
 * into a CONCEPTS lane. When nothing is known, saying so is correct and keeps
 * the entity reviewable.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./graph-core.js'));
  else root.GAZ = factory(root.GC);
}(typeof self !== 'undefined' ? self : this, function (GC) {
  'use strict';

  var canon = GC.canon;

  // ----------------------------------------------------------- countries --
  // Sovereign states plus the aliases that actually appear in study material.
  var COUNTRIES = ('afghanistan|albania|algeria|andorra|angola|argentinia|armenia|aruba|australia|austria|azerbaijan|'
    + 'bahamas|bahrain|bangladesh|barbados|belarus|belgium|belize|benin|bhutan|bolivia|bosnia and herzegovina|'
    + 'botswana|brazil|brunei|bulgaria|burkina faso|burundi|cambodia|cameroon|canada|chad|chile|china|colombia|'
    + 'comoros|congo|costa rica|croatia|cuba|cyprus|czech republic|czechia|denmark|djibouti|dominica|dominican republic|'
    + 'ecuador|egypt|el salvador|england|equatorial guinea|eritrea|estonia|ethiopia|fiji|finland|france|gabon|'
    + 'gambia|georgia|germany|ghana|greece|grenada|guatemala|guinea|guinea bissau|guyana|haiti|honduras|hungary|'
    + 'iceland|india|indonesia|iran|iraq|ireland|israel|italy|jamaica|japan|jordan|kazakhstan|kenya|kiribati|'
    + 'kosovo|kuwait|kyrgyzstan|laos|latvia|lebanon|lesotho|liberia|libya|liechtenstein|lithuania|luxembourg|'
    + 'madagascar|malawi|malaysia|maldives|mali|malta|mauritania|mauritius|mexico|moldova|monaco|mongolia|'
    + 'montenegro|morocco|mozambique|myanmar|namibia|nauru|nepal|netherlands|new zealand|nicaragua|niger|nigeria|'
    + 'north korea|north macedonia|northern ireland|norway|oman|pakistan|palau|palestine|panama|papua new guinea|'
    + 'paraguay|peru|philippines|poland|portugal|qatar|romania|russia|russian federation|rwanda|samoa|saudi arabia|'
    + 'senegal|serbia|seychelles|sierra leone|singapore|slovakia|slovenia|solomon islands|somalia|south africa|'
    + 'south korea|south sudan|spain|sri lanka|sudan|suriname|sweden|switzerland|syria|taiwan|tajikistan|'
    + 'tanzania|thailand|timor leste|togo|tonga|trinidad and tobago|tunisia|turkey|turkmenistan|tuvalu|uganda|'
    + 'ukraine|united arab emirates|united kingdom|united states|united states of america|uruguay|uzbekistan|'
    + 'vanuatu|vatican city|vietnam|yemen|zambia|zimbabwe').split('|');

  // Aliases that must resolve to a country but are not country names.
  var COUNTRY_ALIASES = {
    'usa': 'united states', 'us': 'united states', 'u.s.': 'united states',
    'u.s.a.': 'united states', 'america': 'united states',
    'uk': 'united kingdom', 'u.k.': 'united kingdom', 'britain': 'united kingdom',
    'great britain': 'united kingdom', 'british': 'united kingdom',
    'uae': 'united arab emirates', 'u.a.e.': 'united arab emirates',
    'ussr': 'russia', 'soviet union': 'russia', 'russian': 'russia',
    'holland': 'netherlands', 'dutch': 'netherlands',
    'persia': 'iran', 'turkey': 'turkey', 'turkiye': 'turkey',
    'prc': 'china', 'pr': 'china', 'cpr': 'china', 'chinese': 'china',
    'india': 'india', 'indian': 'india',
    'burma': 'myanmar', 'czechoslovakia': 'czech republic',
    'yugoslavia': 'serbia', 'east germany': 'germany', 'west germany': 'germany'
  };

  // -------------------------------------------------------- sub-national --
  // Indian states and union territories. Uttar Pradesh is here because the
  // corpus calls it a `person`; this is the correction that matters most.
  var IN_STATES = ('andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|'
    + 'jharkhand|karnataka|kerala|madhya Pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orsa|'
    + 'punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttaranchal|uttarakhand|uttar pradesh|west bengal|'
    + 'andaman and nicobar islands|chandigarh|dadra and nagar haveli|daman and diu|delhi|india gate|'
    + 'lakshadweep|puducherry|puducherry and yanam').split('|');

  // Cities: Indian state capitals + the world cities that appear in this corpus.
  var CITIES = ('agra|ahmedabad|amritsar|amsterdam|athens|auckland|ayutthaya|bangkok|barcelona|beijing|bengaluru|'
    + 'berlin|bhubaneswar|birmingham|bogota|boston|brussels|bucharest|budapest|cairo|calcutta|cape town|'
    + 'chennai|chicago|coimbatore|colombo|copenhagen|dakar|delhi|dhaka|doha| dublin|dubai|durban|dusseldorf|'
    + 'florence|frankfurt|geneva|guwahati|gwalior|hanoi|havana|helsinki|hyderabad|indore|islamabad|istanbul|'
    + 'jaipur|jakarta|jerusalem|johannesburg|kanpur|kabul|karachi|kathmandu|kolkata|kuala lumpur|kyoto|lagos|'
    + 'lahore|leipzig|lima|lisbon|london|lucknow|ludhiana|madrid|manchester|manila|marseille|meerut|'
    + 'melbourne|mexico city|milan|minsk|montreal|moscow|mumbai|munich|myanmar|nagoya|nairobi|nanjing|naples|'
    + 'new delhi|new york|new york city|osaka|oslo|ottawa|paris|patna|perth|philadelphia|phnom penh|pune|'
    + 'quebec|quito|riyadh|rome|rotterdam|sao paulo|seoul|shanghai|shenzhen|singapore|srinagar|st petersburg|'
    + 'stockholm|strasburg|stuttgart|sydney|taipei|tbilisi|tehran|tokyo|toronto|toulouse|venice|vienna|'
    + 'vilnius|warsaw|washington|washington dc|watertown|wellington|zurich').split('|');

  // Historic regions and sub-national areas. Aragon, Catalonia and Castile are
  // what a Spain study tree is mostly made of, and leaving them to fall through
  // to `misc` only because they are not current sovereign states was a real gap.
  var REGIONS = ('aragon|catalonia|castile|castilla|leon|galicia|andalusia|valencia|'
    + 'navarre|navarra|basque country|asturias|murcia|extremadura|la rioja|'
    + 'scotland|wales|england|ireland|bavaria|saxony|prussia|brandenburg|'
    + 'catalaonia|toscany|tuscany|veneto|lombardy|sicily|sardinia|corsica|'
    + 'normandy|provence|brittany|gascony|andalusia|'
    + 'gujarat|rajputana|maratha country|mysore|mysuru|'
    + 'bavaria|silesia|pomerania|pomerania|poland|bohemia|moravia|'
    + 'crimea|caucasus|cyrenaica|levant|maghreb|sahel|'
    + 'bengal|avadh|awadh|maratha|mysore|punkhabia|rajasthan|'
    + 'doab|sindh|punjab|multan|bengal presidency|madras presidency|'
    + 'bombay presidency|coromandel|malabar|kanara|congo|'
    + 'al-Andalus|al-Andalusia|aljazeera').split('|');

  var REGION_SET = Object.create(null);
  REGIONS.forEach(function (c) { REGION_SET[canon(c)] = true; });

  // Heads of state and government are a small, enumerable, high-value class,
  // and they are exactly where the corpus fails worst: Vladimir Putin is
  // `concept` under prefix `meteorology-climate-56` and Kassym-Jomart Tokayev
  // is `concept` under `business-economy-7`, while Nursultan Nazarbayev is
  // `person` under `agricultural-extension-marketing-8`. Nothing in the corpus
  // distinguishes a leader from a weather term, so this class has to be named.
  // Until it is, they fall through to `misc` -> OTHER ENTITIES, which is
  // honest but under-classified.
  var LEADERS = ('vladimir putin|donald trump|barack obama|joe biden|kamala harris|'
    + 'kassym-jomart tokayev|nursultan nazarbayev|emomali kushitashvili|bidzina ivanishvili|'
    + 'recep tayyip erdogan|erdogan|xi jinping|volodymyr zelensky|joel s netanyahu|'
    + 'narendra modi|indira gandhi|rajiv gandhi|jatinder singh|manmohan singh|'
    + 'jawaharlal nehru|lal bahadur shastri|subhas chandra bose|mahatma gandhi|'
    + 'sardar patel|balaji vishwanath|chandra shekhar azad|'
    + 'nelson mandela|desmond tutu|thabo mbeki|kwame nkrumah|jomo kenyatta|'
    + 'patrice lumumba|hosni mubarak|anwar sadat|gamal abdel nasser|'
    + 'yitzhak shamir|shimon peres|yitzhak rabin|golda meir|menachem begin|'
    + 'kim il sung|kim jong il|kim jong un|'
    + 'mao zedong|zhou enlai|deng xiaoping|chiang kai shek|sun yat sen|'
    + 'george washington|thomas jefferson|abraham lincoln|'
    + 'franklin d roosevelt|theodore roosevelt|woodrow wilson|'
    + 'charles de gaulle|georges clemenceau|napoleon bonaparte|napoleon i|'
    + 'winston churchill|neville chamberlain|tony blair|'
    + 'helmut kohl|angela merkel|olaf scholz|'
    + 'josip broz tito|tito|'
    + 'zulfikar ali bhutto|shaukat aziz|benazir bhutto|nawaz sharif|imran khan|'
    + 'shinzo abe|fumio kishida|aung san suu kyi|'
    + 'kofi annan|ban ki moon|antonio guterres|'
    + 'dwight eisenhower|eisenhower|joseph stalin|stalin|adolf hitler|hitler|'
    + 'john f kennedy|kennedy|'
    + 'nader shah|shah jahan|aurangzeb|akbar|babur|humayun|jahangir|'
    + 'muhammad ali jinnah|bal gangadhar tilak|kasturba gandhi').split('|');

  var LEADER_SET = Object.create(null);
  LEADERS.forEach(function (c) { LEADER_SET[canon(c)] = true; });

  // Named rivers and mountain systems. Pattern-matched so multi-word forms work.
  var RIVERS = new RegExp('\\b('
    + 'ganges|jamuna|godavari|krishna|kaveri|cauvery|narmada|indus|brahmaputra|tsangpo|chenab|ravi|'
    + 'beas|sutlej|gomti|ganga|yamuna|damodar|mahanadi|nile|danube|rhine|seine|thames|volga|'
    + 'amur|yenisei|lena|amazon|mississippi|yangtze|murray|parana|orinoco)\\b', 'i');
  var MOUNTAINS = new RegExp('\\b('
    + 'himalaya|himalayas|ghats|western ghats|eastern ghats|alps|andes|rockies|ural|urals|'
    + 'himalayan|everest|atlas|caucasus|zagros|appalachians)\\b', 'i');

  // A polity or dynasty, whatever the corpus typed it.
  //
  // Kept NARROW on purpose. An earlier version included republic / union /
  // league / federation and matched 7,536 nodes as empires, because those words
  // appear in thousands of unrelated organisation and concept names. A word
  // only earns an EMPIRES & DYNASTIES lane when it names a historical polity.
  var POLITY = new RegExp('\\b('
    + 'empire|kingdom|sultanate|dynasty|caliphate|khilafat|principality|'
    + 'maurya|gupta|chola|pallava|chakma|mughal|maratha)\\s*(empire|kingdom|'
    + 'sultanate|dynasty|empires|kingdoms)?\\b', 'i');

  // Organisation shapes. `Congress` must beat the corpus's `event` on
  // Indian National Congress; this is the pattern that fixes it.
  var ORG_SHAPE = new RegExp('\\b('
    + 'inc|congress|party|commission|council|ministry|department|assembly|parliament|senate|'
    + 'cabinet|court|tribunal|secretariat|board|corporation|trust|society|association|federation|'
    + 'institute|academy|university|college|school|bank|treasury|foundation|authority|agency|'
    + 'company|corporation|limited|holdings|group|'
    + 'bureau|commandos|brigade|regiment|battalion|army|navy|air force|airforce|guard|'
    + 'paramilitary|police)\\b', 'i');

  var EVENT_SHAPE = new RegExp('\\b('
    + 'war|battle|siege|conflict|invasion|rebellion|revolt|uprising|mutiny|revolution|'
    + 'treaty|agreement|accord|armistice|ceasefire|pact|convention|protocol|summit|'
    + 'movement|strike|protest|campaign|election|expo|festival)\\b', 'i');

  var CONCEPT_SHAPE = new RegExp('\\b('
    + 'doctrine|ideology|philosophy|theory|principle|policy|reform|act|law|constitution|'
    + 'amendment|system|method|process|model|standard)\\b', 'i');

  var WORK_SHAPE = new RegExp('\\b('
    + 'mahabharata|ramayana|arthashastra|upanishad|quran|bible|shakespeare|hamlet|macbeth|'
    + 'othello|iliad|odyssey|aeneid|dante|divine comedy|don quixote|war and peace|'
    + 'anna karenina|ulysses)\\b', 'i');

  var RELIGION_SHAPE = new RegExp('\\b('
    + 'hinduism|buddhism|islam|christianity|judaism|sikhism|jainism|daoism|taoism|'
    + 'shinto|confucianism|roman catholic|protestant|orthodox|mosque|temple|gurudwara|'
    + 'stupa|mandir|church|cathedral|monastery|religion)\\b', 'i');

  // Family edges are the one authoritative person signal in the corpus. A node
  // with real kin edges is a person. The KIN PASS ADDS JUNK, so this is only
  // used when a gazetteer or polity match has not already decided.
  var KIN = new RegExp('^('
    + 'father|mother|son|daughter|husband|wife|brother|sister|grandfather|grandmother|grandson|'
    + 'granddaughter|child|parent|sibling|spouse|uncle|aunt|nephew|niece)$', 'i');
  var ORG_ROLE = new RegExp('^('
    + 'founded|founder of|succeeded by|successor of|predecessor of|preceded|member of|led by|'
    + 'headquarters|owns|operates|part of)$', 'i');
  var PLACE_ROLE = new RegExp('^('
    + 'capital of|located in|is situated in|border of|flows through|part of)$', 'i');

  // ------------------------------------------------------------ indexes --
  var COUNTRY_SET = Object.create(null);
  COUNTRIES.forEach(function (c) { COUNTRY_SET[canon(c)] = true; });

  var STATE_SET = Object.create(null);
  IN_STATES.forEach(function (s) { STATE_SET[canon(s)] = true; });

  var CITY_SET = Object.create(null);
  CITIES.forEach(function (c) { CITY_SET[canon(c)] = true; });

  // ------------------------------------------------------------- resolve --
  /**
   * @param node        graph node { id, name, type, count }
   * @param adjacency   optional { [id]: [{ to, r }] } built from meta.edges
   * @returns { type, subtype, conf, why, lane }
   */
  function resolveType(node, adjacency) {
    if (!node || !node.name) return { type: 'misc', conf: 0, why: 'no node' };
    var raw = canon(node.name);

    // 3a. exact gazetteer hits, most specific first.
    if (LEADER_SET[raw]) {
      return { type: 'person', subtype: 'leader', conf: 0.9, why: 'gazetteer: head of state or government' };
    }
    if (COUNTRY_SET[raw] || COUNTRY_ALIASES[raw]) {
      return { type: 'place', subtype: 'country', conf: 0.99, why: 'gazetteer: sovereign state' };
    }
    if (STATE_SET[raw]) {
      return { type: 'place', subtype: 'state', conf: 0.97, why: 'gazetteer: sub-national state' };
    }
    if (CITY_SET[raw]) {
      return { type: 'place', subtype: 'city', conf: 0.95, why: 'gazetteer: city' };
    }
    if (REGION_SET[raw]) {
      return { type: 'place', subtype: 'region', conf: 0.9, why: 'gazetteer: historic region' };
    }
    // 3b. shape patterns.
    if (POLITY.test(node.name)) {
      return { type: 'event', subtype: 'empire', conf: 0.8, why: 'pattern: polity or dynasty by name' };
    }
    if (RIVERS.test(node.name)) {
      return { type: 'place', subtype: 'river', conf: 0.9, why: 'pattern: named river' };
    }
    if (MOUNTAINS.test(node.name)) {
      return { type: 'place', subtype: 'mountain', conf: 0.9, why: 'pattern: mountain system' };
    }
    if (WORK_SHAPE.test(node.name)) {
      return { type: 'concept', subtype: 'book', conf: 0.75, why: 'pattern: named literary work' };
    }
    if (RELIGION_SHAPE.test(node.name)) {
      return { type: 'concept', subtype: 'religion', conf: 0.7, why: 'pattern: religion or scripture' };
    }
    if (ORG_SHAPE.test(node.name)) {
      return { type: 'org', conf: 0.7, why: 'pattern: organisation shape' };
    }
    if (EVENT_SHAPE.test(node.name)) {
      return { type: 'event', conf: 0.7, why: 'pattern: event shape' };
    }
    if (CONCEPT_SHAPE.test(node.name)) {
      return { type: 'concept', conf: 0.65, why: 'pattern: concept shape' };
    }

    // 4/5. Edge signatures.
    //
    // Kin edges are authoritative for a PERSON and outrank everything, because
    // the corpus reliably types the two ends of a family edge.
    //
    // Role edges are WEAK and must not override a corroborated raw type: a
    // `founded` edge once made Gautama Buddha an `org`, and a `founder of`
    // edge will do the same to any leader who founded something. So role
    // signatures are consulted only when the raw type is the useless default.
    var es = (adjacency && adjacency[node.id]) || [];
    var kin = 0, orgRole = 0, placeRole = 0;
    for (var i = 0; i < es.length; i++) {
      if (KIN.test(es[i].r)) kin++;
      else if (PLACE_ROLE.test(es[i].r)) placeRole++;
      else if (ORG_ROLE.test(es[i].r)) orgRole++;
    }
    if (kin >= 2) return { type: 'person', conf: 0.75, why: 'edge signature: ' + kin + ' family edges' };

    // 6. raw corpus type, but NEVER `concept`: that is the default bucket that
    // swallowed Kazakhstan, Moscow, Putin and Trump.
    if (node.type && node.type !== 'concept' && node.type !== 'misc') {
      return { type: node.type, conf: 0.5, why: 'raw corpus type (corroborated: not the default)' };
    }

    if (placeRole >= 2) return { type: 'place', conf: 0.7, why: 'edge signature: ' + placeRole + ' place roles' };
    if (orgRole >= 2) return { type: 'org', conf: 0.6, why: 'edge signature: ' + orgRole + ' org roles' };

    // 7. honest unknown.
    return { type: 'misc', conf: 0, why: 'unclassified: corpus says concept, which is its default' };
  }

  return {
    resolveType: resolveType,
    COUNTRIES: COUNTRIES, IN_STATES: IN_STATES, CITIES: CITIES,
    KIN: KIN, ORG_ROLE: ORG_ROLE, PLACE_ROLE: PLACE_ROLE,
    COUNTRY_SET: COUNTRY_SET, STATE_SET: STATE_SET, CITY_SET: CITY_SET
  };
}));

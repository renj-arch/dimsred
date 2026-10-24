/*
 * graph-core.js -- the single implementation of the timeline graph's resolver.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The graph semantics used to be copy-pasted across flowchart.html,
 * scripts/gen-topic-layers.js, scripts/build-timeline.js and map.html, held
 * together by the comment "shared logic copied from flowchart.html (must stay
 * in sync)". A differential audit (scripts/audit-shared-logic.js) found 9 of 20
 * tracked symbols had DIVERGED between copies -- and three of those divergences
 * are load-bearing, not cosmetic:
 *
 *   canon()          3 implementations. flowchart strips punctuation to spaces;
 *                    gen-topic-layers keeps it. canon("Café") is "cafe" in one
 *                    and "café" in the other, so the two files were indexing
 *                    names into DIFFERENT key spaces.
 *   byProminence()   2 implementations. flowchart weights seed/person/event;
 *                    gen-topic-layers sorts on raw count. Different winner,
 *                    therefore different resolveItem() result.
 *   isHub()          4 different thresholds: 100000 / 5000 / 2000 / 1000.
 *                    These are legitimately per-consumer budgets, NOT a bug --
 *                    so the threshold is a parameter here, not a constant.
 *
 * The remaining divergences were same-named functions doing genuinely different
 * jobs (flowchart's cleanDesc() shapes a 44-character card label; build-
 * timeline's cleanDesc() strips trailing brackets). Those are renamed apart
 * rather than merged, because merging them would have been a silent behaviour
 * change dressed up as a refactor.
 *
 * HOW TO CONSUME
 *   Node:     var GC = require('./scripts/lib/graph-core.js');
 *   Browser:  <script src="scripts/lib/graph-core.js"></script>  -> window.GC
 *
 * Nothing here touches the DOM, the filesystem, or any global. The resolver is
 * a factory because it needs the name index; injecting it is what makes one
 * implementation usable from a browser page and from a build script.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.GC = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------- canon --
  // Two key spaces exist in the wild. They are NOT interchangeable: unify them
  // and every name containing punctuation re-keys. canon() is the strict one and
  // is the default, because the UI must key on the same normalisation the data
  // was written with. canonLoose() is kept for the build scripts that still
  // index with it, and scripts/audit-canon-delta.js measures the difference.
  function canon(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function canonLoose(s) {
    return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // ------------------------------------------------------------ predicates --
  // Kin-relation junk: the graph mines "Day", "Will", "Just", "Crown" as people
  // because a family-relation edge mentioned them. This is the union of both
  // historical copies, so it is the stricter of the two.
  var JUNK_KIN = /^(?:day|austrian|earth|albrecht|just|will|mughal|saw|sahib|crown|young|brahmin|nizam|master|royal|weaver|court|civil|bengali|university|revolutionary|high|way|specifically|elder|poor|field|church|universal|low|guardian|judge|god|nun|dowager|common|notably|strong|blood|spirit|witch|action|senate|latin|english|french|dutch|good|small|short|men|count|countess|consort|reverend|pretender|mayor|director|businessman|entered|tim|damage|times|ultimately|observer|originally|democratic|eventually|begin|however|subsequently|previously|instead|soon|secondly|met|colonial|national|imperial|former|finally|afterwards|before|previous|manchus|population|appendix|conclusion|introduction|features|objectives|measures|schemes|programmes|policies|impacts|causes|effects|principles|basics|types|government|administration|parliament|legislature|judiciary|executive|photograph|photographs|pictures|archives|documents|references|summary|red|fine|straw|light|craft|gun|wing|forest|paper|transport|television|weir|kaiser|fuel|labour|commerce|industry|state|capital|revenue|budget|currency|debt|exchange|market|mineral|son|black|steel|manhattan|virginia|munich|manitoba|stirling|bandai)$/;

  // Default hub cut-off. flowchart and gen-topic-layers both used 5000; the map
  // tolerated 2000 and build-timeline 1000, and flowchart's own isHub also read
  // 5000 (the 100000 the audit matched is an unrelated threshold in the same
  // file). Consumers with a different budget pass it in.
  var HUB_DEFAULT = 5000;

  function isJunk(n, junkRe) {
    if (!n) return true;
    var re = junkRe || JUNK_KIN;
    if (n.kin === true && (n.count || 0) < 2) return true;
    return n.kin === true && !n.seed && re.test(canon(n.name || ''));
  }
  function isHub(n, threshold) {
    return (n.count || 0) >= (threshold == null ? HUB_DEFAULT : threshold);
  }

  // A place/regime/abstract term the graph mistyped as `person`. Gating the
  // People lane on this is what keeps "Uttar Pradesh 1500-2026" out of it.
  // The trailing s? matters: the graph types "Hainan Airlines" and "Sino-Soviet
  // Wars" as `person`, and a bare \bairline\b never matches a plural.
  var REJECT_PERSON = /\b(pradesh|arabia|island|city|state|region|province|county|district|republic|kingdom|empire|horde|dynasty|sultanate|caliphate|falls|gulf|desert|river|valley|mountain|plateau|coast|peninsula|sierra|angeles|york|jersey|dakota|hampshire|georgia|france|germany|england|poland|turkey|russia|china|japan|india|egypt|leone|babylon|assyria|persia|greek|roman|ottoman|byzantine|maya|judaism|orthodox|protestant|christian|buddhist|purge|eagles|giants|yankees|league|committee|commission|congress|parliament|government|ministry|department|bureau|university|college|school|company|society|association|party|club|tribunal|court|army|navy|police|programme|program|plan|scheme|policy|reform|movement|revolution|war|battle|treaty|agreement|act|law|code|era|age|period|industry|market|sport|theatre|film|album|song|book|novel|game|series|show|channel|newspaper|herald|times|post|weekly|monthly|tea|tobacco|rice|cotton|railway|airport|rail|route|station|airline|airways|front|brother|church|mosque|temple|fort|harbour|harbor|corporation|company|bank|group|council|union|league|society|federation|alliance|force|army|legion)s?\b/i;

  // Types that never co-mention anything for real. A "Mahatma Gandhi - COVID-19"
  // hook is paragraph noise (a donated dictionary term inside a GS paper).
  var NOISE_TYPES = { disease: 1, scheme: 1, plant: 1, animal: 1, volcano: 1, asteroid: 1, comet: 1 };

  // Family-relation verbs. Kept as one list: the flowchart had 51 entries and
  // build-timeline 20, so a kin edge could be honoured by one and ignored by
  // the other. The longer list is the safer superset.
  var KIN_RELS = ['father', 'mother', 'parent', 'parents', 'son', 'daughter', 'child', 'children', 'brother', 'sister', 'sibling', 'siblings', 'spouse', 'wife', 'husband', 'partner of', 'ex-wife', 'ex-husband', 'divorced', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'grandparent', 'grandchild', 'uncle', 'aunt', 'nephew', 'niece', 'cousin', 'step-father', 'step-mother', 'step-son', 'step-daughter', 'step-brother', 'step-sister', 'half-brother', 'half-sister', 'father-in-law', 'mother-in-law', 'son-in-law', 'daughter-in-law', 'brother-in-law', 'sister-in-law', 'great-grandfather', 'great-grandmother', 'great-grandson', 'great-granddaughter', 'great-uncle', 'great-aunt', 'great-nephew', 'great-niece', 'great-great-grandfather', 'great-great-grandson', 'descends from', 'relative of', 'heir of', 'ward of', 'guardian of', 'ancestor', 'descendant', 'forefather', 'married'];
  var KIN_LONG = ['ancestor', 'descendant', 'descends from', 'forefather', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'grandparent', 'grandchild', 'great-grandfather', 'great-grandmother', 'great-grandson', 'great-granddaughter', 'great-uncle', 'great-aunt', 'great-nephew', 'great-niece', 'great-great-grandfather', 'great-great-grandson', 'heir of', 'ward of', 'relative of'];

  // The narrower family set gen-topic-layers used to build its kin lane.
  var FAMILY = /^(father|mother|parent|parents|son|daughter|child|children|brother|sister|sibling|spouse|wife|husband|partner of|ex-wife|ex-husband|divorced|grandfather|grandmother|grandson|granddaughter|grandparent|grandchild|uncle|aunt|nephew|niece|cousin|brother-in-law|sister-in-law|son-in-law|daughter-in-law|father-in-law|mother-in-law|mentored by|succeded by|succeeded by|successor of|predecessor of)$/;

  // ------------------------------------------------------------ prominence --
  // 'graph' (default): seed and typed entities outrank raw mention count. This
  // is what flowchart.html used, and it matters -- it is why a curated seed
  // beats a higher-count concept of the same name.
  // 'count': pure mention count then id. This is what gen-topic-layers used.
  // The two genuinely disagree, so the mode is explicit rather than accidental.
  function byProminence(a, b, mode) {
    if (mode === 'count') {
      var d = (b.count || 0) - (a.count || 0);
      if (d) return d;
      return String(a.id).localeCompare(String(b.id));
    }
    var pa = (a.seed ? 4 : 0) + (a.type === 'person' ? 2 : 0) + (a.type === 'event' ? 1 : 0) + (a.count || 0) / 1e9;
    var pb = (b.seed ? 4 : 0) + (b.type === 'person' ? 2 : 0) + (b.type === 'event' ? 1 : 0) + (b.count || 0) / 1e9;
    return pb - pa;
  }

  // Which relation to show when several exist between the same pair of cards.
  // Kin first (it is the only family the data actually asserts), then
  // battle/sequence/founding, then everything else.
  //
  // The verb lists are PARAMETERS because the consumers keep different ones:
  // build-timeline scores a 20-verb kin set while flowchart scores 51, and
  // flowchart additionally splits battle/sequence/founding across three lists.
  // Passing regexes here instead of the caller's own lists would silently
  // change which edge wins, so the lists travel with the call.
  function relPrio(r, lists) {
    lists = lists || {};
    var kin = lists.kin || KIN_RELS;
    function has(l) { return l && l.indexOf(r) !== -1; }
    if (has(kin)) return 0;
    if (has(lists.battle) || has(lists.seq) || has(lists.found)) return 1;
    if (/^(commanded|led|fought|attacked|defeated|captured|besieged|battle|war)/.test(r)) return 1;
    if (/^(succeeded by|preceded|predecessor of|successor of|founded|established|created|formed|inaugurated)/.test(r)) return 1;
    return 2;
  }

  // ------------------------------------------------------------- resolver --
  // Factory: the name index is injected, so the same code serves the browser
  // page and the offline scripts without either of them owning a global.
  //
  //   byName          { canonName -> [node, ...] }   required
  //   canonFn         canon | canonLoose              default canon
  //   prominence      'graph' | 'count'               default 'graph'
  //   hubThreshold    number                          default 5000
  //   junkRe          RegExp                          default JUNK_KIN
  //   typeAuthority   fn(node) -> node               optional; applied to every
  //                   candidate before the type filter runs, so a curated type
  //                   correction (see graph-type-overrides.js) lets a real node
  //                   win a lookup it previously lost. Returning the node
  //                   unchanged keeps the common path allocation-free.
  //   hasNeighbours   fn(node) -> boolean             optional; when supplied,
  //                   findByName prefers a same-name node that actually has
  //                   graph edges, so a topic never renders as an empty map
  //                   because an inert duplicate outranked the real node
  //   byName          { canonName -> [node, ...] }, or a function returning
  //                   that map. Pass a FUNCTION when the index is rebuilt by
  //                   reassignment (flowchart.html's buildIndexes() does
  //                   `BY_NAME={}`), because a captured object reference would
  //                   silently go stale.  required
  function makeResolver(opts) {
    opts = opts || {};
    var byName = opts.byName || {};
    var isLazy = typeof byName === 'function';
    var cnf = opts.canonFn || canon;
    var prom = opts.prominence || 'graph';
    var hubT = opts.hubThreshold == null ? HUB_DEFAULT : opts.hubThreshold;
    var junkRe = opts.junkRe || JUNK_KIN;
    var hasNb = opts.hasNeighbours || null;
    var typeAuth = opts.typeAuthority || null;

    function bucket(c) { return (isLazy ? byName() : byName)[c]; }
    function auth(n) { return typeAuth ? typeAuth(n) : n; }
    function junk(n) { return isJunk(n, junkRe); }
    function hub(n) { return isHub(n, hubT); }
    // Rank on the CORRECTED type, not the raw mined one. Selection
    // (`typeOf`) is authority-aware, so ranking must be too: otherwise a node
    // curated from `person` to `place` kept the +2 person prominence bonus and
    // still lost every comparison against an uncorrected `person` node, which
    // is exactly the "world-geography-69|North Carolina is a person" failure.
    // With no authority configured `auth` is the identity, so this is
    // byte-identical to ranking on the raw type and legacy parity holds.
    function order(arr) { return arr.sort(function (a, b) { return byProminence(auth(a), auth(b), prom); }); }

    // The type a node should be treated as, after any curated correction.
    function typeOf(n) { var a = auth(n); return a ? a.type : undefined; }

    // Some node under this name is a credible real person: a curated seed, or a
    // count>=2 person node whose name is not a place/regime/abstract label.
    function isCrediblePerson(name) {
      var arr = bucket(cnf(name)) || [];
      for (var i = 0; i < arr.length; i++) {
        var a = auth(arr[i]);
        if (!a || a.type !== 'person') continue;
        if (a.seed) return true;
        if ((a.count || 0) >= 2 && !REJECT_PERSON.test(a.name || '')) return true;
      }
      return false;
    }

  // The node a topic should hang from. Also the gate curate() uses to decide
  // whether an authored layer is drawable at all, so a bad layer key is
  // dropped here rather than silently rendering nothing.
  function findByName(q) {
      var c = cnf(q);
      var idx = isLazy ? byName() : byName;
      function good(b) { return !!b && !junk(b) && ((b.count || 0) >= 2 || b.cur); }
      var arr = idx[c];
      if (arr && arr.length) {
        var hits = order(arr.filter(good));
        // Two real nodes can share a name but only one carries the corpus
        // links/edges ("world-geography-45|Mount Everest" vs the lone
        // "world-geography-countries|Mount Everest" entry). Prefer a candidate
        // with actual neighbours, or the topic renders as an empty map.
        if (hits.length) {
          if (hasNb) {
            for (var i = 0; i < hits.length; i++) if (hasNb(hits[i], 1)) return hits[i];
          }
          return hits[0];
        }
      }
      // Fallback: keys that CONTAIN the query. If any key has the query as a
      // whole word, ignore mid-word matches ("music" -> "Indian Classical
      // Music", not "Alan Wilson (musician)"); then take the most prominent.
      var esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var wordBoundary = new RegExp('(^| )' + esc + '( |$)');
      var word = [], rest = [];
      for (var k in idx) {
        if (k.indexOf(c) === -1) continue;
        var cand = order(idx[k].slice())[0];
        if (!good(cand)) continue;
        (wordBoundary.test(k) ? word : rest).push(cand);
      }
      var pool = word.length ? word : rest;
      var best = null;
      for (var p = 0; p < pool.length; p++) {
        if (!best || byProminence(pool[p], best, prom) < 0) best = pool[p];
      }
      return best;
    }

    // Best node for an authored/curated item name. Prefers a node of the
    // requested type at a shallow level, then falls back to any good candidate.
    function resolveItem(name, type) {
      var arr = bucket(cnf(name));
      if (!arr || !arr.length) return null;
      var good = arr.filter(function (n) { return !junk(n) && !hub(n) && (n.count || 0) >= 1; });
      if (!good.length) return null;
      var byType = good.filter(function (n) { return typeOf(n) === type && (n.level || 0) <= 3; });
      return order((byType.length ? byType : good).slice())[0];
    }

    return {
      canon: cnf,
      byName: bucket,
      typeOf: typeOf,
      isJunk: junk,
      isHub: hub,
      byProminence: order,
      isCrediblePerson: isCrediblePerson,
      findByName: findByName,
      resolveItem: resolveItem
    };
  }

  // -------------------------------------------------------------- facets --
  // Which lane a co-mentioned node belongs to.
  var PLACE_WORDS = ['city', 'town', 'village', 'place', 'state', 'region', 'province', 'country', 'island', 'mountain', 'river', 'lake', 'sea', 'ocean', 'desert', 'capital', 'district', 'delta', 'coast', 'plateau', 'range', 'archipelago', 'peninsula', 'valley', 'forest', 'kingdom', 'empire', 'republic', 'colony', 'cape', 'bay', 'gulf', 'islands', 'coastline'];
  var PLACE_HINT = new RegExp('(?:^|[^A-Za-z])(' + PLACE_WORDS.join('|') + ')(?:[^A-Za-z]|$)', 'i');
  var PLACE_CAT = /(?:world-geography|physiograph|biogeographic|ecoregion|biome|place|capital|island|mountain|coast|plateau|river-|lake|\bwetland\b|\bdelta\b|\bocean\b|\bsea\b|\bdesert\b|\bvalley\b|\bpeninsula\b|\bhimalaya\b|western.?ghat)/i;

  // The graph types agreements/treaties/reports as `org`; route those to the
  // event lane so they read "event in" rather than "institution of". A generic
  // concept (Empire, Holocaust) must NOT become a place just because a geo
  // keyword appears in its category.
  function facetOf(n) {
    var ty = n.type;
    if (ty === 'org') {
      var nmO = n.name || '';
      if (/^(?:the\s+)?(?:agreement|treaty|act|convention|pact|accord|declaration|report|protocol|charter|conference|summit|election|campaign|movement|battle|war|resolution|reform)\b/i.test(nmO) ||
        /(?:agreement|treaty|convention|pact|accord|declaration|report|protocol|charter|resolution|movement|war)s?$/i.test(nmO)) return 'event';
    }
    if (ty === 'person') return 'person';
    if (ty === 'event') return 'event';
    if (ty === 'org') return 'organisation';
    if (ty === 'disease') return 'disease';
    // A node the type authority has already resolved to `place` belongs in the
    // geography lane. Without this branch a correctly typed place fell through
    // to the final `return 'concept'`, so Gujarat/Delhi/Bihar were filed under
    // Key Concepts even after the gazetteer fixed their type.
    if (ty === 'place') return 'centre';
    if (ty === 'volcano') return 'centre';
    if (ty === 'concept') {
      var nm = n.name || '';
      var catKeys = (n.cats || []).map(function (c) { return c.key || ''; });
      var strongCat = catKeys.length && catKeys.every(function (k) { return PLACE_CAT.test(k); }) && PLACE_HINT.test(nm);
      var strongName = PLACE_HINT.test(nm) && !/^(empire|state|republic|kingdom|colony|movement|war|treaty|organization|society|company|industry|government|committee|commission|group|party|front|union)$/i.test(nm) &&
        !/^(state of|status of|city of|end of|start of)/i.test(nm);
      return (strongCat || strongName) ? 'centre' : 'concept';
    }
    return 'concept';
  }

// The kinship mining pass emitted sentence-level duplicates alongside the
// real nodes: "kin|Sweden~medieval" is typed `person`, is described as
// "John of Bohemia (1370-1596); later Margrave of Moravia...", and sits
// under the same name as the actual country node. That is how a US state or
// a country ends up on the person lane.
//
// Most of these CANNOT simply be dropped: 21,244 of the 24,155 tilde ids are
// the ONLY node carrying their name, so junking them all would erase that
// many entities outright. The 2,911 that duplicate a clean sibling are a
// different matter, and those are provably inert: zero typed edges and zero
// co-mention links reference any of them, so removing them from the index
// cannot orphan a relation. Only those are pruned, and only from the name
// index; the node objects stay in the shards.
function pruneAliasDuplicates(idx) {
  var removed = 0;
  for (var k in idx) {
    var arr = idx[k];
    if (!arr || arr.length < 2) continue;
    var hasClean = false;
    for (var i = 0; i < arr.length; i++) if (String(arr[i].id).indexOf('~') === -1) { hasClean = true; break; }
    if (!hasClean) continue;
    var kept = [];
    for (var j = 0; j < arr.length; j++) {
      if (String(arr[j].id).indexOf('~') !== -1) removed++;
      else kept.push(arr[j]);
    }
    if (kept.length) idx[k] = kept; else delete idx[k];
  }
  return removed;
}

  // ------------------------------------------------------------- briefs --
  // A run of four or more underscores is the corpus's own fill-in-the-blank
  // scaffold, not prose. 8,754 node descriptions contain one, and they render
  // as card text like "established in _____, following wars of independence"
  // or "In 2024, the number of foreign residents who acquired _____ nationalit".
  // These are quiz stems that leaked into the description field, so they are
  // rejected outright rather than trimmed: no card should present a blank as
  // if it described the entity. The word-boundary anchors matter, because
  // taxon names legitimately contain single or double underscores.
  //
  // Deliberately NOT rejected, despite looking like fragments, because the
  // corpus holds them as good descriptions and they were measured first:
  //   "In 2005, China accounted for 80% of the global mollusc catch..."
  //   "It was formerly included within the family Latridiidae but..."
  //   "Google Insights for Search was merged into Google Trends..."
  var DESC_SCAFFOLD = /\b_{4,}\b/;

  // Shapes a mined corpus fragment into a short card label. This is the
  // flowchart's cleanDesc(), renamed: build-timeline.js also had a cleanDesc()
  // that strips trailing brackets, which is a different job and stays there.
  function cardBrief(d) {
    if (!d) return '';
    var s = String(d).replace(/\s+/g, ' ').trim().replace(/…+$/, '').trim();
    if (s.length < 12) return '';
    if (DESC_SCAFFOLD.test(s)) return '';
    if (/^(then|that|which|who|while|when|after|before|because|during|for|ruled by|led by|followed by|under|so|but|and|or|although|despite|having been|after being|his |her |their |its |in\s+\d{4},|the (?:parents|mother|father|family|first|next|following|only|rest|same|entire|main)|[A-Za-z]+(?:'s)\s)\b/i.test(s)) return '';
    if (/^[A-Za-z].*\s+in\s+\d{4}$/.test(s) && s.length < 40) return '';
    return s;
  }

  function dispYear(y) {
    if (y == null) return '';
    if (y < 0) return (-y) + ' BCE';
    return String(y);
  }
  function dispSpan(span) {
    if (!span || span.min == null) return '';
    if (span.min === span.max) return dispYear(span.min);
    return dispYear(span.min) + '–' + dispYear(span.max);
  }

  // A one-line revision brief from a mined corpus sentence, or a synthesised
  // span+era fallback when the corpus text is a bare fragment. `placeholderRe`
  // lets a caller reject gen-topic-layers scaffolding blurbs ("Direct kin and
  // closest relations recorded for X."), which are UI text, not statements
  // about the entity, and were being admitted as facts.
  // "In the ... fragment" lead-ins are stripped only when nothing else is
  // clinging to them; if a comma or ellipsis follows within the first 60 chars
  // the sentence is mid-clause and cutting the lead would mangle it.
  var FRAG_LEAD = /^(?:in\s+(?:the|this|that|a|an)\s+|during\s+(?:the|this|that|a|an)\s+|on\s+(?:the|this|that|a|an)\s+)/i;

  function briefOf(n, opts) {
    opts = opts || {};
    var d = String((n && n.desc) || '').trim().replace(/\s+/g, ' ');
    if (opts.isPlaceholder && opts.isPlaceholder(d)) return '';
    d = d.replace(/^NOTE:\s*/i, '');
    if (d.length > 4 && FRAG_LEAD.test(d) && !/,\s|\.\.\./.test(d.slice(0, 60))) d = d.replace(FRAG_LEAD, '');
    d = d.replace(/\\n+/g, ' ').replace(/\[(?:citation needed|source needed)\]/gi, '');
    if (DESC_SCAFFOLD.test(d)) return '';
    var name = (n && n.name) || '';
    var esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (d.length < 24 || (esc && new RegExp('^' + esc + '$', 'i').test(d)) ||
      d === 'The ' + name || d === name + ' (' || /^(the\s+)?'?$/i.test(d)) d = '';
    var span = n && n.span;
    if (n && n.type === 'event' && span && span.min != null && d && !/^-?\d/.test(d)) {
      d = dispSpan(span) + ' — ' + d;
    }
    if (d.length > 140) d = d.slice(0, 137) + '…';
    if (d.length >= 18) return d;
    var era = { ancient: 'ancient', medieval: 'medieval India', colonial: 'colonial era', freedom: 'freedom struggle era', republic: 'post-independence India', contemporary: 'contemporary' }[(n && n.era)] || '';
    var syn = [name, [era, dispSpan(span)].filter(Boolean).join(', ')].filter(Boolean);
    return syn.join(' — ') + '.';
  }

  // Can these two lives possibly have met? Used to drop a person who neither
  // overlapped nor was contemporaneous with the topic: Akbar (d. 1605) was
  // listed as a "Leader" on Sambhaji (b. 1657) purely because they share
  // question shards. flowchart.html has its own `bornAfter`, but it only tests
  // "starts after the other ends" and so does NOT catch that case -- 1542 is
  // not greater than 1689. This is the full non-overlap test.
  //
  // Deliberately narrow, and callers must restrict it to people: an empire or a
  // war legitimately runs past the death of anyone in it, and a battle
  // legitimately follows the person whose reputation it settled.
  function cannotCoexist(person, topic) {
    if (!person || !topic) return false;
    var a = person.span, b = topic.span;
    if (!a || !b) return false;
    if (a.min == null || a.max == null || b.min == null || b.max == null) return false;
    return a.max < b.min || a.min > b.max;
  }

  return {
    // canon
    canon: canon, canonLoose: canonLoose,
    // predicates + lists
    JUNK_KIN: JUNK_KIN, REJECT_PERSON: REJECT_PERSON, NOISE_TYPES: NOISE_TYPES,
    KIN_RELS: KIN_RELS, KIN_LONG: KIN_LONG, FAMILY: FAMILY,
    HUB_DEFAULT: HUB_DEFAULT,
    isJunk: isJunk, isHub: isHub, byProminence: byProminence, relPrio: relPrio,
    // resolver
    makeResolver: makeResolver,
    pruneAliasDuplicates: pruneAliasDuplicates,
    // facets + briefs
    PLACE_WORDS: PLACE_WORDS, PLACE_HINT: PLACE_HINT, PLACE_CAT: PLACE_CAT,
    facetOf: facetOf, cardBrief: cardBrief, briefOf: briefOf,
    cannotCoexist: cannotCoexist,
    dispYear: dispYear, dispSpan: dispSpan
  };
});

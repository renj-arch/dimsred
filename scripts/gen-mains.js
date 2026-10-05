/*
 * gen-mains.js -- the Mains layer, generated from the same knowledge graph.
 *
 * This is NOT a second database and NOT a model-answer generator. It is a
 * derived layer over the factual backbone, and it is built around a hard line
 * between what the graph can ASSERT and what a human must SUPPLY.
 *
 * WHY THE LINE IS WHERE IT IS (measured, not assumed)
 * ----------------------------------------------------
 * Running the corpus first established three limits that decide this design:
 *
 * 1. THE RELATION VOCABULARY IS KIN-ONLY. All 1,786 typed edges are family
 *    (son, father, spouse, brother), succession (succeeded by, predecessor of)
 *    and a little social contact (rival of, pupil of, mentored by). There is
 *    no `caused by`, no `resulted in`, no `located in`, no `part of`. So a
 *    CAUSE -> EFFECT network and a knowledge path like
 *    `Louis XIV -> Absolutism -> Centralisation -> French monarchy` are NOT
 *    derivable. Inventing them would be the exact failure this system exists to
 *    prevent, so paths are emitted only from real edges and are labelled with
 *    the verb that carries them.
 *
 * 2. THE INDIAN MAINS EVIDENCE BASE IS MOSTLY ABSENT. Corpus-wide there are
 *    only 39 `Article N` nodes, and for the Indian polity topics that matter
 *    most they are simply not there: Article 340, Article 16, Indra Sawhney,
 *    Kaka Kalelkar Commission, Other Backward Classes and Reservation have NO
 *    node. Mandal Commission does exist (229 questions, span 1979-1990) and
 *    so does creamy layer. An EVIDENCE lane that silently filled itself would
 *    therefore assert constitutional law the corpus cannot support.
 *
 * 3. THERE IS NO ARGUMENT CONTENT. Only 2.1% of descriptions contain anything
 *    evaluative, and it is incidental: accounting definitions that happen to
 *    use "must" and "should". An ARGUMENTS FOR / AGAINST bank cannot be
 *    extracted, because there are no arguments in the data.
 *
 * SO: every cell in this output is in exactly one of three states, and the
 * state is always visible.
 *
 *   [ASSERTED]  backed by a node, edge or corpus field, with its source shown
 *   [DERIVED]   computed from asserted facts (counts, spans, type resolution)
 *   [NEEDS SOURCE]  the structure is real, the content is not in the graph
 *
 * An empty EVIDENCE or ARGUMENTS cell is printed, never hidden and never
 * filled with plausible text. A Mains frame that admits what it does not know
 * is usable for revision; one that invents Article 340 teaches the wrong thing
 * with total confidence.
 *
 * The frame -- dimensions, stakeholders, evidence slots, argument slots -- is
 * still generated, because the STRUCTURE of a GS answer is exactly what the
 * student is missing. What the engine supplies is the skeleton plus the list of
 * graph entities that would fill each slot once a source is attached.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var GC = require('./lib/graph-core.js');
var SCHEMA = require('./lib/graph-schema.js');
var CURATION = require('./lib/graph-edge-curation.js');
var TYPE_AUTHORITY = require('./lib/type-authority.js');

var ROOT = '.';
var WRITE = process.argv.indexOf('--write') >= 0;
var TOPIC = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; })[0];
var PER_SLOT = parseInt((process.argv.filter(function (a) { return a.indexOf('--per-slot=') === 0; })[0] || '--per-slot=6').split('=')[1], 10);

// The eleven GS dimensions. A dimension is only reported as PRESENT when the
// graph actually contains a member for it; otherwise it is listed as a gap.
// Claiming all eleven for every topic would be noise.
var DIMENSIONS = [
  ['Historical', /\b(war|battle|empire|dynasty|century|ancient|medieval|colonial|independence|revolt|revolution|treaty|sultanate|mughal|maurya|gupta|bronze|iron age)\b/i],
  ['Political', /\b(congress|party|parliament|assembly|election|president|prime minister|minister|monarch|king|emperor|regime|governance|democra|republic|dictator|coalition|opposition|politician|governor|legislature)\b/i],
  ['Constitutional', /\b(constitution|article|amendment|fundamental right|dpsp|directive|schedule|provision|clause|judgment|verdict|petition|supreme court|high court|tribunal)\b/i],
  ['Social', /\b(caste|community|communal|minority|tribe|social|movement|women|child|education|health|religion|linguistic|caste system|reservation|backward class|inequality|poverty|slum|urban)\b/i],
  ['Economic', /\b(economy|economic|gdp|inflation|fiscal|monetary|budget|tax|revenue|trade|commerce|industry|agriculture|farm|bank|loan|poverty|employment|gross|market|investment|budget|subsidy)\b/i],
  ['Administrative', /\b(administration|administrative|ministry|department|commission|committee|board|corporation|authority|agency|bureaucracy|reform|policy|scheme|programme|planning|district|province|secretariat|bureau)\b/i],
  ['Environmental', /\b(environment|pollution|climate|ecology|biodiversity|forest|wildlife|conservation|emission|carbon|sustainab|renewable|wetland|river|gaseous|waste|recycling)\b/i],
  ['Scientific & Technological', /\b(technolog|science|research|invention|innovation|digital|artificial intelligence|computing|space|satellite|rocket|launch|mission|nuclear|genetic|biotech|engineering)\b/i],
  ['Ethical', /\b(ethic|corrupt|integrity|transparen|accountab|governance|ombudsman|citizen|rights|justice|dignity|equality|liberty|secular|tolerance|inclusive)\b/i],
  ['Security', /\b(security|defen[cs]e|army|navy|air force|police|terroris|border|military|war|insurgen|cyber|national security|internal security)\b/i],
  ['International', /\b(international|united nations|global|world|foreign|bilateral|diplomat|treaty|alliance|organisation|country|nation|states|empire|colonial|un\b|summit|convention)\b/i]
];

// Stakeholders are identified by role shape, not by being asserted anywhere.
var STAKEHOLDERS = [
  ['Government', /\b(government|ministry|department|state|cabinet|secretariat|administration|council|commission|bureau|authority|niti aayog|planning)\b/i],
  ['Legislature', /\b(parliament|assembly|senate|congress|legislature|committee|coalition|opposition party)\b/i],
  ['Judiciary', /\b(supreme court|high court|court|tribunal|judiciary|judge|judgment|verdict|petition|judicial)\b/i],
  ['Local bodies', /\b(municipal|district|panchayat|village|city corporation|local body|zila|ward|block)\b/i],
  ['Private sector', /\b(company|industry|corporate|business|enterprise|firm|market|manufacturer|bank|private)\b/i],
  ['Civil society', /\b(ngo|volunteer|association|society|campaign|movement|protest|activist|awareness|trust|foundation)\b/i],
  ['Vulnerable groups', /\b(backward class|sc\b|st\b|minority|tribe|women|child|disabled|dalit|adivasi|disadvantaged|widow|senior citizen)\b/i],
  ['International organisations', /\b(united nations|un\b|who\b|world bank|imf|nato|asean|implementation network|international (organisation|agency|body)|treaty|convention)\b/i],
  ['Citizens', /\b(citizen|public|people|voter|population|resident|consumer|student|farmer|worker)\b/i]
];

// Value and constitutional links. A link is emitted ONLY when a matching node
// exists, so nothing is asserted by keyword association alone.
var VALUE_LINKS = [
  ['Equality', /\b(equality|equal|reservation|backward class|affirmative action|representation)\b/i],
  ['Dignity', /\b(dignity|human dignity|respect|honour|face)\b/i],
  ['Social justice', /\b(social justice|welfare|poverty alleviation|social security|disadvantaged)\b/i],
  ['Liberty', /\b(liberty|freedom|speech|expression|religion|assembly|movement)\b/i],
  ['Accountability', /\b(accountab|transparen|answerab|ombudsman|rti|audit|integrity)\b/i],
  ['Rule of law', /\b(rule of law|constitutional|legal|law|jurisdiction|judicial review)\b/i],
  ['Environmental protection', /\b(environment|pollution|conservation|sustainab|ecolog|wildlife)\b/i],
  ['Inclusive growth', /\b(inclusive|growth|development|employment|livelihood|poverty)\b/i]
];

var ARG_SLOTS = {
  'ARGUMENTS FOR': ['Representation and voice', 'Historical or structural disadvantage',
                    'Substantive equality', 'Efficiency or capacity gain', 'Precedent in other jurisdictions'],
  'ARGUMENTS AGAINST / CONCERNS': ['Mere formal equality', 'Identification and targeting errors',
                                   'Administrative complexity', 'Perpetuation of category', 'Unintended consequences'],
  'TRADE-OFFS': ['Equality of opportunity vs equality of outcomes',
                 'Speed vs accuracy in implementation', 'Stability vs representativeness'],
  'BALANCING APPROACHES': ['Better and more current data', 'Periodic review',
                           'Complementary non-reservation measures', 'Constitutional safeguards']
};

function main() {
  if (!TOPIC) {
    console.error('usage: node --max-old-space-size=8192 scripts/gen-mains.js <topic> [--write]');
    process.exit(2);
  }
  var meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
  var nodes = [];
  for (var p = 0; p < meta.nodesParts; p++) {
    var sh = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
    for (var i = 0; i < sh.length; i++) nodes.push(sh[i]);
  }
  var BY_ID = Object.create(null), BY_NAME = Object.create(null);
  for (var i = 0; i < nodes.length; i++) {
    BY_ID[nodes[i].id] = nodes[i];
    var c = GC.canon(nodes[i].name);
    (BY_NAME[c] = BY_NAME[c] || []).push(nodes[i]);
  }
  GC.pruneAliasDuplicates(BY_NAME);
  var adj = Object.create(null);
  (meta.edges || []).forEach(function (e) {
    (adj[e.a] = adj[e.a] || []).push({ to: e.b, r: e.rel });
    (adj[e.b] = adj[e.b] || []).push({ to: e.a, r: e.rel });
  });
  var typeAuth = TYPE_AUTHORITY.makeTypeAuthority({ adjacency: adj });
  var R = GC.makeResolver({ byName: BY_NAME, prominence: 'graph', hubThreshold: 5000, typeAuthority: typeAuth });
  var canon = function (n) { return typeAuth.describe(n); };

  var node = R.resolveItem(TOPIC, '') || R.findByName(TOPIC);
  if (!node) { console.error('cannot resolve "' + TOPIC + '"'); process.exit(1); }
  var t = canon(node);

  // ---- the member set: real edges plus thresholded co-occurrence ---------
  var members = Object.create(null);
  (meta.edges || []).forEach(function (e) {
    if (e.a !== node.id && e.b !== node.id) return;
    var inward = e.b === node.id;
    var other = BY_ID[inward ? e.a : e.b];
    if (!other || other.id === node.id || GC.isJunk(other)) return;
    var rel = e.rel;
    if (CURATION.isDropped(node.name, inward ? rel : rel, other.name) ||
        CURATION.isDropped(other.name, rel, node.name)) return;
    var k = GC.canon(other.name);
    (members[k] = members[k] || { node: other, verbs: {} });
    members[k].verbs[rel] = true;
  });
  var hits = [];
  (meta.links || []).forEach(function (l) {
    if (l.a !== node.id && l.b !== node.id) return;
    if ((l.w || 0) < 3) return;
    var other = BY_ID[l.a === node.id ? l.b : l.a];
    if (other && !GC.isJunk(other)) hits.push({ node: other, w: l.w });
  });
  hits.sort(function (a, b) { return b.w - a.w; });
  hits.slice(0, 400).forEach(function (h) {
    var k = GC.canon(h.node.name);
    if (!members[k]) members[k] = { node: h.node, verbs: {}, w: h.w };
  });

  var list = Object.keys(members).map(function (k) {
    var m = members[k];
    return { node: m.node, name: m.node.name, verbs: Object.keys(m.verbs), w: m.w || 0,
             c: canon(m.node), q: m.node.count || 0 };
  }).sort(function (a, b) {
    if (!!a.verbs.length !== !!b.verbs.length) return a.verbs.length ? -1 : 1;
    if (a.w !== b.w) return b.w - a.w;
    return b.q - a.q;
  });

  // A haystack for dimension and stakeholder matching: the member's own
  // attributes, NOT an invented topic summary.
  function hay(it) {
    return it.name + ' ' + (it.c.type || '') + ' ' + (it.c.subtype || '') + ' ' +
           (it.node.desc || '') + ' ' + it.verbs.join(' ');
  }
  var flagged = list.map(function (it) { return { it: it, hay: hay(it) }; });
  function pick(re, limit) {
    return flagged.filter(function (f) { return re.test(f.hay); })
                  .slice(0, limit || PER_SLOT)
                  .map(function (f) { return f.it; });
  }

  // ---- reverse index for IDENTITY CLUES ---------------------------------
  var clues = [];
  (node.aliases || []).forEach(function (a) { clues.push({ clue: a, kind: 'alias' }); });
  var nick = new RegExp('\\b('
    + 'sun king|roi soleil|father of the nation|grand old man|'
    + 'iron lady|philosopher king|liberator|unifier|'
    + 'night of the long knives)\\b', 'i');
  var dn = node.desc || '';
  var m;
  while ((m = nick.exec(dn)) !== null) clues.push({ clue: m[0], kind: 'nickname in the description' });

  var out = [];
  out.push('TOPIC: ' + node.name);
  out.push('source node: ' + node.id);
  out.push('resolved type: ' + t.type + (t.subtype ? '/' + t.subtype : '') + '   via ' + t.why);
  out.push('');

  // 1 CORE IDEA
  out.push('1. CORE IDEA');
  out.push('   Definition      [ASSERTED] ' + oneLine(node.desc));
  out.push('   Date / Period   [DERIVED]  ' + (spanOf(node) || 'no span recorded') +
           (node.era ? '   era: ' + node.era : ''));
  out.push('   Type            [DERIVED]  ' + t.type + (t.subtype ? '/' + t.subtype : ''));
  out.push('   Key number      [DERIVED]  ' + (node.count || 0) + ' practice questions in the corpus');
  out.push('');

  // 2 DIMENSIONS
  out.push('2. DIMENSIONS');
  var present = 0;
  DIMENSIONS.forEach(function (d) {
    var got = pick(d[1]);
    if (!got.length) {
      out.push('   ' + pad(d[0], 28) + '[NEEDS SOURCE] no member of this topic matches the ' + d[0] + ' dimension');
      return;
    }
    present++;
    out.push('   ' + pad(d[0], 28) + got.map(bracket).join(', '));
  });
  out.push('   -> ' + present + ' of ' + DIMENSIONS.length +
           ' dimensions have supporting entities in the graph. The rest are real GS ' +
           'dimensions with no evidence here, and are listed so the gap is visible.');
  out.push('');

  // 3 WHY / SO WHAT / NOW WHAT
  out.push('3. WHY -> SO WHAT -> NOW WHAT');
  out.push('   WHY?     [NEEDS SOURCE] why this emerged. The graph holds no causal verbs at all,');
  out.push('                     so the driver must come from a source, not from co-occurrence.');
  var early = list.filter(function (it) { return it.node.span && it.node.span.min != null; })
                  .sort(function (a, b) { return a.node.span.min - b.node.span.min; }).slice(0, PER_SLOT);
  out.push('                     earliest attested members: ' +
           (early.length ? early.map(bracket).join(', ') : '[none carry a span]'));
  out.push('   SO WHAT? [NEEDS SOURCE] consequences. No `resulted_in` / `caused_by` edge exists corpus-wide.');
  out.push('   NOW WHAT? [NEEDS SOURCE] prescription. Normative, so outside the graph by definition.');
  out.push('');

  // 4 EVIDENCE
  out.push('4. EVIDENCE');
  var evSpecs = [
    ['Constitutional provisions', /^(article|art\.?)\s*\d+|constitution|amendment|schedule/i],
    ['Judgments', /(v\.?|vs\.?)\s|judgment|judgement|landmark case|verdict/i],
    ['Committees and commissions', /(committee|commission|council)\b/i],
    ['Reports and data', /(report|census|survey|index|statistics|data)\b/i],
    ['Acts', /\bact\b/i],
    ['Schemes', /(scheme|yojana|mission|programme|program|abhiyan)/i]
  ];
  var evFound = 0;
  evSpecs.forEach(function (e) {
    var got = pick(e[1]);
    if (!got.length) {
      out.push('   ' + pad(e[0], 30) + '[NEEDS SOURCE] nothing in this topic\'s member set');
      return;
    }
    evFound++;
    out.push('   ' + pad(e[0], 30) + got.map(bracket).join(', '));
  });
  out.push('   -> ' + evFound + ' of ' + evSpecs.length + ' evidence classes are populated from the graph.');
  out.push('      A constitutional link is only printed when the article node actually exists;');
  out.push('      keyword association alone is not treated as a constitutional claim.');
  out.push('');

  // 5 STAKEHOLDER MAP
  out.push('5. STAKEHOLDER MAP');
  STAKEHOLDERS.forEach(function (s) {
    var got = pick(s[1], 4);
    out.push('   ' + pad(s[0], 28) + (got.length ? got.map(bracket).join(', ') : '[NEEDS SOURCE] no member matches this actor'));
  });
  out.push('   Who gains / who bears the cost / who implements / who regulates');
  out.push('   [NEEDS SOURCE] the graph records no interest or incidence data, so the four questions');
  out.push('                 above must be answered from a source. The member list above shows only');
  out.push('                 WHICH actors the graph knows about, never what they want.');
  out.push('');

  // 6 ARGUMENT BANK
  out.push('6. ARGUMENT BANK');
  out.push('   Only 2.1% of corpus descriptions contain anything evaluative, and it is incidental');
  out.push('   (accounting definitions using "must"). There are no arguments in the graph to');
  out.push('   extract, so every slot below is an explicit prompt. The skeleton is the point:');
  out.push('   it teaches the SHAPE of a GS argument, and the student supplies the content.');
  Object.keys(ARG_SLOTS).forEach(function (head) {
    out.push('   ' + head);
    ARG_SLOTS[head].forEach(function (slot) {
      var got = pick(new RegExp('\\b' + slot.split(' ')[0].replace(/[^a-z]/gi, ''), 'i'), 3);
      out.push('      - ' + pad(slot, 42) + '[NEEDS SOURCE]' +
               (got.length ? '  candidate entities: ' + got.map(bracket).join(', ') : ''));
    });
  });
  out.push('');

  // 7 TIME DIMENSION
  out.push('7. TIME DIMENSION');
  var eras = meta.eras || [];
  var ei = -1;
  eras.forEach(function (e, i) { if (e.id === node.era) ei = i; });
  out.push('   PAST          ' + (ei > 0 ? eras[ei - 1].label + ' (' + eras[ei - 1].min + ' to ' + eras[ei - 1].max + ')' : '[earliest era in the corpus]'));
  out.push('   ORIGIN        ' + (spanOf(node) || '[no span recorded]'));
  out.push('   DEVELOPMENT   ' + (ei >= 0 ? eras[ei].label : '[no era assigned]'));
  out.push('   CURRENT       ' + (node.span && node.span.max ? 'attested up to ' + node.span.max : '[no end recorded]'));
  out.push('   EMERGING      [NEEDS SOURCE] requires a dated recent source; the corpus is quiz-era data.');
  var dated = list.filter(function (it) { return it.node.span && it.node.span.min != null; })
                  .sort(function (a, b) { return b.node.span.max - a.node.span.max; }).slice(0, PER_SLOT);
  out.push('   latest attested members: ' + (dated.length ? dated.map(function (it) {
    return it.name + '(' + it.node.span.min + '-' + it.node.span.max + ')';
  }).join(', ') : '[none]'));
  out.push('');

  // 8 CONSTITUTIONAL / VALUE LINK
  out.push('8. CONSTITUTIONAL & VALUE LINK');
  var arts = list.filter(function (it) { return /^(article|art\.?)\s*\d+/i.test(it.name); });
  out.push('   Constitution   ' + (arts.length
    ? 'ASSERTED: ' + arts.map(bracket).join(', ')
    : '[NEEDS SOURCE] no article node is reachable from this topic. The corpus holds only 39 ' +
      '`Article N` nodes in total, so this is a coverage limit, not an absence of constitutional relevance.'));
  VALUE_LINKS.forEach(function (v) {
    var got = pick(v[1], 3);
    out.push('   ' + pad(v[0], 24) + (got.length
      ? 'candidate: ' + got.map(bracket).join(', ')
      : '[NEEDS SOURCE] no supporting member in the graph'));
  });
  out.push('   A value link is a candidate for an argument, never an assertion that the topic');
  out.push('   embodies the value. That judgement needs a source.');
  out.push('');

  // 9 SIGNATURE FACTS
  out.push('9. SIGNATURE FACTS');
  var sig = [];
  if (/sun king|roi soleil/i.test(node.name + ' ' + dn)) sig.push('called the Sun King');
  if (node.span && node.span.max - node.span.min > 300) sig.push('spans ' + (node.span.max - node.span.min) + ' years of attested activity');
  if (node.count >= 200) sig.push(node.count + ' practice questions, so heavily tested it is memorisation-bound');
  (list.filter(function (it) { return it.verbs.length; }).slice(0, 4)).forEach(function (it) {
    sig.push(it.verbs[0] + ' relation: ' + it.name);
  });
  if (sig.length) sig.forEach(function (s) { out.push('   - ' + s); });
  else out.push('   [NEEDS SOURCE] nothing distinctive is derivable for this topic.');
  out.push('');

  // 10 IDENTITY CLUES
  out.push('10. IDENTITY CLUES   (clue -> ' + node.name + ')');
  if (clues.length) clues.forEach(function (c) { out.push('   - "' + c.clue + '"   [' + c.kind + ']'); });
  else out.push('   [NEEDS SOURCE] this node has no recorded alias or nickname. 89.1% of the corpus has none either,');
  out.push('                 so reverse lookup is only possible for a minority of entities.');

  // 11 COMMON CONFUSIONS
  out.push('');
  out.push('11. COMMON CONFUSIONS');
  var conf = [];
  // Contradictions found by the global kin scan are real, reviewed contrasts.
  ['orleans', 'franklin d roosevelt', 'richard grenville', 'ka ahumanu'].forEach(function (k) {
    if (members[GC.canon(k)]) conf.push(k + ': the corpus asserts mutually exclusive kin relations; see scripts/lib/graph-edge-curation.js');
  });
  if (conf.length) conf.forEach(function (c) { out.push('   - ' + c); });
  out.push('   [NEEDS SOURCE] curated contrast pairs (Mandal vs Kaka Kalelkar, Din-i Ilahi vs state');
  out.push('                 religion, Mansabdari vs Jagirdari) are a high-value addition, but they');
  out.push('                 are authored content. The graph cannot infer what confuses a reader.');

  // 12 UPSC
  out.push('');
  out.push('12. UPSC QUESTIONS');
  var cats = node.cats || [];
  out.push('   syllabus buckets  ' + (cats.length ? cats.map(function (c) { return c.label + ' (' + c.count + ')'; }).join(', ') : '[none recorded]'));
  out.push('   question weight   ' + (node.count || 0) + ' questions mention this entity');
  out.push('   PYQ text          [NEEDS SOURCE] served live by the site; 159 question files are');
  out.push('                     currently deleted and intentionally not restored, so no PYQ text is');
  out.push('                     embedded in generated output.');

  // 13 ANSWER FRAME
  out.push('');
  out.push('13. ANSWER FRAME');
  out.push('   Introduction route : definition | constitutional reference | historical context |');
  out.push('                       current-event context | data point | thinker/committee   [NEEDS SOURCE]');
  out.push('   Body order         : the ' + present + ' populated dimensions above, in the order given');
  out.push('   Counterpoint       : from ARGUMENTS AGAINST / CONCERNS            [NEEDS SOURCE]');
  out.push('   Way forward        : from BALANCING APPROACHES                   [NEEDS SOURCE]');
  out.push('   Conclusion         : constitutional value | sustainable development | inclusive growth |');
  out.push('                       institutional reform | forward-looking synthesis   [NEEDS SOURCE]');
  out.push('   Marker compression : 10-mark = 2 dimensions + 1 counterpoint. 15-mark = 3-4 dimensions');
  out.push('                       + evidence + counterpoint + way forward. Essay = all of it as a thesis.');

  // DATA QUALITY, internal
  out.push('');
  out.push('DATA QUALITY (internal, not for display)');
  out.push('   source             corpus shard data/timeline.nodes.*.json, node id ' + node.id);
  out.push('   description        ' + (node.desc ? 'present' : 'ABSENT') +
           (node.evDesc ? '   evDesc: ' + node.evDesc : '   no evDesc'));
  out.push('   type validation    ' + t.why + '   conf ' + t.conf);
  out.push('   contradiction      ' + (conf.length ? conf.length + ' curated kin contradiction(s) touch this topic' : 'none detected'));
  out.push('   relation validation ' + Object.keys(members).filter(function (k) { return members[k].verbs; }).length +
           ' asserted relations, all kin/succession family; no causal or spatial relation exists in the corpus');
  out.push('   confidence         ' + (t.conf >= 0.9 ? 'high' : t.conf >= 0.6 ? 'medium' : 'low') +
           '  (type conf ' + t.conf + ')');
  out.push('   duplicate status   ' + ((BY_NAME[GC.canon(node.name)] || []).length > 1
           ? 'AMBIGUOUS: ' + BY_NAME[GC.canon(node.name)].length + ' same-name nodes' : 'unique'));
  out.push('   members            ' + list.length + ' (' + list.filter(function (x) { return x.verbs.length; }).length +
           ' with a real relation, ' + list.filter(function (x) { return !x.verbs.length; }).length + ' co-occurrence only)');

  console.log(out.join('\n'));

  if (WRITE) {
    var dir = path.join(ROOT, 'data/generated-outlines');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    var fp = path.join(dir, GC.canon(node.name).replace(/ +/g, '-') + '.mains.txt');
    fs.writeFileSync(fp, out.join('\n') + '\n', 'utf8');
    console.log('\nWROTE ' + fp);
  }
}

function bracket(it) { return it.name + '(' + it.c.type + ')'; }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function spanOf(n) {
  if (!n || !n.span || (n.span.min == null && n.span.max == null)) return '';
  return n.span.min === n.span.max ? String(n.span.min) : n.span.min + '-' + n.span.max;
}
function oneLine(s) {
  if (!s) return '[no description in the corpus]';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > 240 ? s.slice(0, 237) + '…' : s;
}

main();

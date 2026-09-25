// gen-topic-layers.js
// Auto-build data/topic-layers.json for every importable seed topic in the
// timeline graph so the flowchart/map never shows a bare co-mention flood.
// Mirrors flowchart.html's own canon / isJunk / resolveItem / findByName logic
// so branch items resolve to real graph nodes (real=cadj links) or fall back to
// crt| placeholder nodes exactly like hand-authored layers do.
//
// Branch derivation per seed:
//   - typed edges (ADJ) touching the seed, grouped by the relation family, if
//     the relation is kin and both endpoints are real people nodes
//   - weighted co-mention links (LADJ), grouped by neighbour node type into:
//     People / Events / Geography / Places / Organisations / Concepts / Health
// Each branch takes the top-N strongest items (by weight), deduped by canon.
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var out = path.join(ROOT, 'data', 'topic-layers.json');

var tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timeline.json'), 'utf8'));
var nodes = [];
for (var p = 0; p < tl.nodesParts; p++) {
  nodes = nodes.concat(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timeline.nodes.' + p + '.json'), 'utf8')));
}
console.log('nodes:', nodes.length, 'edges:', tl.edges.length, 'links:', tl.links.length);

// ---- shared logic copied from flowchart.html (must stay in sync) ----
function canon(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}
var JUNK_KIN = /^(?:day|austrian|earth|albrecht|just|will|mughal|saw|sahib|crown|young|brahmin|nizam|master|royal|weaver|court|civil|bengali|university|revolutionary|high|way|specifically|elder|poor|field|church|universal|low|guardian|judge|god|nun|dowager|common|notably|strong|blood|spirit|witch|action|senate|latin|english|french|dutch|good|small|short|men|count|countess|consort|reverend|pretender|mayor|director|businessman|entered|tim|damage|times|ultimately|observer|originally|democratic|eventually|begin|however|subsequently|previously|instead|soon|secondly|met|colonial|national|imperial|former|finally|afterwards|before|previous|manchus|population|appendix|conclusion|introduction|features|objectives|measures|schemes|programmes|policies|impacts|causes|effects|principles|basics|types|government|administration|parliament|legislature|judiciary|executive|photograph|photographs|pictures|archives|documents|references|summary|red|fine|straw|light|craft|gun|wing|forest|paper|transport|television|weir|kaiser|fuel|labour|commerce|industry|state|capital|revenue|budget|currency|debt|exchange|market|mineral|son|black|steel|manhattan|virginia|munich|manitoba|stirling|bandai)$/;
function isJunk(n) {
  if (!n) return true;
  if (n.kin === true && (n.count || 0) < 2) return true;
  return n.kin === true && !n.seed && JUNK_KIN.test(canon(n.name || ''));
}
function isHub(n) { return (n.count || 0) >= 5000; }
// Personal-name gate for the People & Leaders lane: the graph sometimes types
// places/dynasties/abstract terms as `person` (Uttar Pradesh 1500-2026), so a
// candidate only counts when some node under that name is a credible real
// person — a curated seed, or a count>=2 person node whose name does not look
// like a place/regime/organisation/abstract label.
var REJECT_PERSON = /\b(pradesh|arabia|island|islands|city|state|region|province|county|district|republic|kingdom|empire|horde|dynasty|sultanate|caliphate|falls|gulf|desert|river|valley|mountains?|plateau|coast|peninsula|sierra|angeles|york|jersey|dakota|hampshire|georgia|france|germany|england|poland|turkey|russia|china|japan|india|egypt|leone|babylon|assyria|persia|greek|roman|ottoman|byzantine|maya|judaism|orthodox|protestant|christian|buddhist|purge|eagles|giants|yankees|league|committee|commission|congress|parliament|government|ministry|department|bureau|university|college|school|company|society|association|party|club|tribunal|court|army|navy|police|programme|program|plan|scheme|policy|reform|movement|revolution|war|battle|treaty|agreement|act|law|code|era|age|period|industry|market|sports|theatre|film|album|song|book|novel|game|series|show|channel|newspaper|herald|times|post|weekly|monthly|tea|tobacco|rice|cotton|railway|airport|rail|route|station|airline|front|brothers|good|church|mosque|temple|fort|harbour|harbor)\b/i;
function isCrediblePerson(name) {
  var arr = byName[canon(name)] || [];
  for (var i = 0; i < arr.length; i++) {
    var n = arr[i];
    if (!n || n.type !== 'person') continue;
    if (n.seed) return true;
    if ((n.count || 0) >= 2 && !REJECT_PERSON.test(n.name || '')) return true;
  }
  return false;
}

var byId = {};
var byName = {};
nodes.forEach(function (n) {
  byId[n.id] = n;
  var c = canon(n.name);
  (byName[c] = byName[c] || []).push(n);
});
function byProminence(a, b) {
  var d = (b.count || 0) - (a.count || 0);
  if (d) return d;
  return String(a.id).localeCompare(String(b.id));
}
function findByName(q) {
  var c = canon(q);
  function good(b) { return !!b && !isJunk(b) && ((b.count || 0) >= 2 || b.cur); }
  var arr = byName[c];
  if (arr && arr.length) {
    var hits = arr.filter(good).sort(byProminence);
    if (hits.length) return hits[0];
  }
  return null;
}
function resolveItem(name, type) {
  var c = canon(name);
  var arr = byName[c];
  if (!arr || !arr.length) return null;
  var good = arr.filter(function (n) { return !isJunk(n) && !isHub(n) && (n.count || 0) >= 1; });
  if (!good.length) return null;
  var byType = good.filter(function (n) { return n.type === type && (n.level || 0) <= 3; });
  var pool = (byType.length ? byType : good).slice();
  pool.sort(byProminence);
  return pool[0];
}
// ---- /shared ----

// index typed edges: both endpoints must be real, non-junk, non-hub nodes
var FAMILY = /^(father|mother|parent|parents|son|daughter|child|children|brother|sister|sibling|spouse|wife|husband|partner of|ex-wife|ex-husband|divorced|grandfather|grandmother|grandson|granddaughter|grandparent|grandchild|uncle|aunt|nephew|niece|cousin|brother-in-law|sister-in-law|son-in-law|daughter-in-law|father-in-law|mother-in-law|mentored by|succeded by|succeeded by|successor of|predecessor of)$/;
// Direction-aware asserted verbs for real-real non-family typed edges. The map
// has the forward label (a REL b as "a founded b") and the inverse label (the
// same edge read from b's side, "b founded by a"). Only verbs with a confident
// inverse get upgraded; everything else stays on the honest facet fallback so a
// link is never mis-asserted by the generator.
var VERB_DIR = {
  'founded': { fwd: 'founded', inv: 'founded by' },
  'founder of': { fwd: 'founded', inv: 'founded by' },
  'rival of': { fwd: 'rival of', inv: 'rival of' },
  'friend of': { fwd: 'friend of', inv: 'friend of' },
  'colleague of': { fwd: 'colleague of', inv: 'colleague of' },
  'succeeded by': { fwd: 'succeeded by', inv: 'succeeded' },
  'successor of': { fwd: 'successor of', inv: 'predecessor of' },
  'predecessor of': { fwd: 'predecessor of', inv: 'successor of' },
  'preceded': { fwd: 'preceded', inv: 'succeeded' },
  'mentored by': { fwd: 'mentored by', inv: 'mentor of' },
  'pupil of': { fwd: 'pupil of', inv: null }
};
var tadj = {}; // a -> { b: rel } meaning "a rel b"
tl.edges.forEach(function (e) {
  if (!VERB_DIR.hasOwnProperty(String(e.rel).toLowerCase())) return;
  var na = byId[e.a], nb = byId[e.b];
  if (!na || !nb || isJunk(na) || isJunk(nb) || isHub(na) || isHub(nb)) return;
  var r = String(e.rel).toLowerCase();
  (tadj[e.a] = tadj[e.a] || {})[e.b] = r;
});
function assertedRelFor(seedId, tid) {
  var fwd = tadj[seedId] && tadj[seedId][tid];
  if (fwd) return VERB_DIR[fwd].fwd;
  if (tadj[tid] && tadj[tid][seedId]) {
    var rev = tadj[tid][seedId];
    if (VERB_DIR[rev].inv) return VERB_DIR[rev].inv;
  }
  return '';
}
var adj = {};
tl.edges.forEach(function (e) {
  var na = byId[e.a], nb = byId[e.b];
  if (!na || !nb || isJunk(na) || isJunk(nb)) return;
  if (!FAMILY.test(e.rel)) return;
  (adj[e.a] = adj[e.a] || {})[e.b] = e.rel;
  (adj[e.b] = adj[e.b] || {})[e.a] = e.rel;
});

// index weighted co-mention links
var ladj = {};
tl.links.forEach(function (l) {
  (ladj[l.a] = ladj[l.a] || {})[l.b] = (ladj[l.a][l.b] || 0) + (l.w || 0);
  (ladj[l.b] = ladj[l.b] || {})[l.a] = (ladj[l.b][l.a] || 0) + (l.w || 0);
});

// ---- note bank: attach real long-form prose (wiki dump desc, quiz fact,
// full node desc) to layer items so clicking a card has something to read.
// Picked per item by name; the longest clean text wins.
var NODE_DESC = {};
nodes.forEach(function (n) {
  var c = canon(n.name);
  var d = String(n.desc || '').trim();
  if (d.length > (NODE_DESC[c] ? NODE_DESC[c].length : 0)) NODE_DESC[c] = d;
});

// ---- link-evidence index: links are co-mentions inside one quiz question, so
// the actual corpus sentence for each link is recoverable by re-scanning that
// same text with alias resolution ("Gandhi" must match "Mahatma Gandhi").
var CANON_RE = /[^a-z0-9]/g;
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function linkAliasesFor(name) {
  // seed-curated aliases from the graph node
  var set = {};
  set[canon(name)] = 1;
  var arr = byName[canon(name)] || [];
  arr.forEach(function (n) { (n.aliases || []).forEach(function (a) { var c = canon(a); if (c.length >= 3) set[c] = 1; }); });
  return Object.keys(set).sort(function (a, b) { return b.length - a.length; });
}
// candidate names = every seed + every non-junk neighbour of a seed (mirrors
// pick() without the top-N cuts), so the single quiz pass can index sentences
// only for names a branch can actually emit.
var candNames = {};
var seedCanon = {};
nodes.forEach(function (n) {
  if (String(n.id).indexOf('seed|') === 0 && !isJunk(n) && (n.count || 0) >= 2) {
    seedCanon[canon(n.name)] = 1;
    candNames[canon(n.name)] = 1;
  }
});
Object.keys(ladj).forEach(function (aid) {
  if (!byId[aid] || String(aid).indexOf('seed|') !== 0) return;
  Object.keys(ladj[aid]).forEach(function (tid) {
    var tn = byId[tid];
    if (!tn || isJunk(tn) || isHub(tn)) return;
    if (tn.type === 'person' && !isCrediblePerson(tn.name)) return;
    candNames[canon(tn.name)] = 1;
  });
});
var aliasToCand = {};
Object.keys(candNames).forEach(function (c) {
  linkAliasesFor(c).forEach(function (a) { aliasToCand[a] = c; });
});
var aliasList = Object.keys(aliasToCand).sort(function (a, b) { return b.length - a.length; });
var candLinkRe = new RegExp('(^|[^a-z0-9])(' + aliasList.map(escapeRe).join('|') + ')([a-z]*)(?=[^a-z0-9]|$)', 'gi');
var CAND_AL = {};
Object.keys(candNames).forEach(function (c) { CAND_AL[c] = linkAliasesFor(c); });
var EVID_PAIR = {}; // 'a\u0000b' (a<b) -> [sentence, ...]  (co-mention pair evidence)
var SENT_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(])/g;
function keyPair(a, b) { return a < b ? a + '\u0000' + b : b + '\u0000' + a; }
function evidenceFor(aName, bName) {
  var pair = keyPair(canon(aName), canon(bName));
  var arr = EVID_PAIR[pair];
  if (!arr || !arr.length) return '';
  var clean = arr.filter(function (s) { return s.indexOf('___') === -1 && s.indexOf('____') === -1; });
  var pool = clean.length ? clean : arr;
  pool.sort(function (x, y) { return x.length - y.length; });
  var best = pool[0];
  if (best.indexOf('___') !== -1 || best.indexOf('____') !== -1) return '';
  return cleanEv(best);
}
var WIKI_NOTE = {};
fs.readdirSync(path.join(ROOT, 'data')).forEach(function (f) {
  if (!/^wiki-.*\.json$/.test(f) || f === 'wiki-link-pool.json') return;
  var w;
  try { w = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')); } catch (e) { return; }
  var arr = Array.isArray(w) ? w : (w && w.nodes || Object.keys(w).map(function (k) { return w[k]; }));
  arr.forEach(function (e) {
    if (!e || !e.desc) return;
    var c = canon(e.n || e.name);
    var d = String(e.desc).trim();
    if (d.length > (WIKI_NOTE[c] ? WIKI_NOTE[c].length : 0)) WIKI_NOTE[c] = d;
  });
});
var QUIZ_NOTE = {};
function textOfQ(q) { return [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' '); }
['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'].forEach(function (part) {
  var fp = path.join(ROOT, 'data', 'quiz.json.part.' + part);
  if (!fs.existsSync(fp)) return;
  var qs;
  try { qs = JSON.parse(fs.readFileSync(fp, 'utf8')).questions || []; } catch (e) { return; }
  qs.forEach(function (q) {
    var key = canon(q.subSubject || q.answer || '');
    var d = String(q.fact || q.answer || '').trim();
    if (d.length > (QUIZ_NOTE[key] ? QUIZ_NOTE[key].length : 0)) QUIZ_NOTE[key] = d;
    // evidence: find which candidate names appear in this question + record
    // the shortest sentence that co-mentions each pair (capped, deduped)
    var lt = textOfQ(q).toLowerCase();
    var found = {};
    var m2, c0 = candLinkRe.lastIndex;
    candLinkRe.lastIndex = 0;
    while ((m2 = candLinkRe.exec(lt))) {
      var al = m2[2].toLowerCase();
      var suffix = (m2[3] || '').toLowerCase();
      if (suffix !== '' && (al.length < 4 || ['s', '’s', '\'s', 'es'].indexOf(suffix) === -1)) continue;
      found[aliasToCand[al]] = true;
    }
    candLinkRe.lastIndex = c0;
    var names = Object.keys(found);
    if (names.length < 2) return;
    // split per-field so narrowed sentences never straddle field boundaries
    var sents = [];
    [String(q.question || ''), String(q.answer || ''), String(q.fact || ''), String(q.hint || '')].forEach(function (f) {
      if (!f.trim()) return;
      f.toLowerCase().split(SENT_SPLIT).forEach(function (s) {
        if (s.trim().length >= 24) sents.push(s.trim());
      });
    });
    for (var i = 0; i < names.length; i++) {
      for (var j = i + 1; j < names.length; j++) {
        var aNm = names[i], bNm = names[j];
        if (!seedCanon[aNm] && !seedCanon[bNm]) continue;
        var pk = keyPair(aNm, bNm);
        var plist = EVID_PAIR[pk];
        if (plist && plist.length >= 2) continue;
        var aAl = CAND_AL[aNm], bAl = CAND_AL[bNm];
        for (var s2 = 0; s2 < sents.length; s2++) {
          var cs = sents[s2];
          if (aAl.some(function (x) { return cs.indexOf(x) >= 0; }) &&
              bAl.some(function (x) { return cs.indexOf(x) >= 0; })) {
            var cl = cs.trim();
            if (cl.length < 24) continue;
            plist = plist || (EVID_PAIR[pk] = []);
            if (plist.indexOf(cl) === -1) plist.push(cl);
            break;
          }
        }
      }
    }
  });
});
function cleanEv(s) {
  var t = String(s || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^in __+,\s*/i, '').replace(/^the __+,\s*/i, '');
  t = t.replace(/__+/g, ' ').replace(/\s+/g, ' ').replace(/,\s*,\s*/g, ',').replace(/\s+,/g, ',').replace(/,\s+and\s+/i, ' and ');
  t = t.trim();
  if (t.length > 240) t = t.slice(0, 237) + '…';
  return t;
}
function cleanNote(raw) {
  var s = String(raw || '').trim().replace(/\s+/g, ' ');
  s = s.replace(/^==+[^=]*==+\s*/, '');
  s = s.replace(/\[(?:citation needed|source needed)\]/gi, '');
  // strip a leading section heading line ("History == ... == " noise)
  s = s.replace(/^[^.|!?;]\w[\w\s.&,'’-]{0,60}==+\s*/g, '');
  return s;
}
function noteFor(name) {
  var c = canon(name);
  var cand = [];
  [WIKI_NOTE, QUIZ_NOTE, NODE_DESC].forEach(function (m) {
    var d = m[c];
    if (d) cand.push(cleanNote(d));
  });
  if (!cand.length) return '';
  cand.sort(function (a, b) { return b.length - a.length; });
  var best = cand[0];
  if (best.length > 1200) best = best.slice(0, 1190) + '…';
  return best;
}

// ---- branch-building helpers ----
function fnNeighbors(seed) {
  var fam = [];
  var seen = {};
  var m = adj[seed.id] || {};
  Object.keys(m).forEach(function (tid) {
    var tn = byId[tid];
    // real kin members (Nehru, Rajiv Gandhi) come through typed edges; junk kin
    // (one-token Day/Italian/Powers) is rejected by isJunk below.
    if (!tn || isJunk(tn) || isHub(tn)) return;
    if (tn.type !== 'person') return;
    var c = canon(tn.name);
    if (seen[c]) return;
    seen[c] = 1;
    fam.push({ name: tn.name, type: 'person', rel: m[tid], src: 'graph', weight: tn.count || 1, node: tn });
  });
  fam.sort(function (a, b) { return b.weight - a.weight; });
  return fam;
}
// Co-mention links never get a fabricated relation verb ("figure in"), which
// would read as an asserted fact. They are labelled honestly as a mention; only
// real typed/kin edges keep their asserted verb.
function linkNeighbors(seed) {
  var seen = {};
  var m = ladj[seed.id] || {};
  function relOf(tid, tn) {
    var asserted = assertedRelFor(seed.id, tid);
    var typed = adj[seed.id] && adj[seed.id][tid];
    return asserted || typed || 'mentioned with';
  }
  function srcOf(tid) {
    if (adj[seed.id] && adj[seed.id][tid]) return 'graph';
    if (tadj[seed.id] && tadj[seed.id][tid]) return 'graph';
    if (tadj[tid] && tadj[tid][seed.id]) return 'graph';
    return 'co';
  }
  function pick(allowHub) {
    var rc = {};
    return Object.keys(m).map(function (tid) {
      var tn = byId[tid];
      if (!tn || isJunk(tn) || (!allowHub && isHub(tn)) || tn.id === seed.id) return null;
      if (tn.type === 'person' && !isCrediblePerson(tn.name)) return null;
      var c = canon(tn.name);
      if (rc[c]) return null;
      rc[c] = 1;
      return { name: tn.name, type: tn.type, rel: relOf(tid, tn), src: srcOf(tid), weight: m[tid], node: tn };
    }).filter(Boolean);
  }
  // rich topics: drop hub co-mentions (York/London flood). thin topics: never
  // starve — when removing hubs leaves fewer than 8, keep everything real.
  var all = pick(false);
  all.sort(function (a, b) { return b.weight - a.weight; });
  if (all.length >= 8) {
    var maxW = all[0].weight;
    var floor = Math.max(3, Math.round(maxW * 0.05));
    // The weight floor trims weak co-mention noise; real typed/kin edges are
    // always kept whatever their co-weight.
    var kept = all.filter(function (x) { return x.src === 'graph' || x.weight >= floor; });
    return kept.length >= 8 ? kept : all;
  }
  var wide = pick(true);
  wide.sort(function (a, b) { return b.weight - a.weight; });
  return wide.length ? wide : all;
}
var BRANCH_OF = [
  { key: 'person',        title: 'People & Leaders',    type: 'person',   rel: 'figure in' },
  { key: 'event',         title: 'Key Events',          type: 'event',    rel: 'includes' },
  { key: 'centre',        title: 'Geography & Places',  type: 'concept',  rel: 'located in' },
  { key: 'organisation',  title: 'Institutions & Organisations', type: 'org', rel: 'institution of' },
  { key: 'disease',       title: 'Health & Disease',    type: 'disease',  rel: 'associated with' },
  { key: 'concept',       title: 'Key Concepts',        type: 'concept',  rel: 'concept of' }
];
var PLACE_WORDS = ['city', 'town', 'village', 'place', 'state', 'region', 'province', 'country', 'island', 'mountain', 'river', 'lake', 'sea', 'ocean', 'desert', 'capital', 'district', 'delta', 'coast', 'plateau', 'range', 'archipelago', 'peninsula', 'valley', 'forest', 'kingdom', 'empire', 'republic', 'colony', 'cape', 'bay', 'gulf', 'islands', 'coastline'];
var PLACE_HINT = new RegExp('(?:^|[^A-Za-z])(' + PLACE_WORDS.join('|') + ')(?:[^A-Za-z]|$)', 'i');
var PLACE_CAT = /(?:world-geography|physiograph|biogeographic|ecoregion|biome|place|capital|island|mountain|coast|plateau|river-|lake|\bwetland\b|\bdelta\b|\bocean\b|\bsea\b|\bdesert\b|\bvalley\b|\bpeninsula\b|\bhimalaya\b|western.?ghat)/i;
function facetOf(n) {
  var ty = n.type;
  // the graph sometimes types agreements/treaties/reports as `org`; route those
  // to the event lane so they read "event in" rather than "institution of"
  if (ty === 'org') {
    var nmO = n.name || '';
    if (/^(?:the\s+)?(?:agreement|treaty|act|convention|pact|accord|declaration|report|protocol|charter|conference|summit|election|campaign|movement|battle|war|resolution|reform)\b/i.test(nmO) ||
        /(?:agreement|treaty|convention|pact|accord|declaration|report|protocol|charter|resolution|movement|war)s?$/i.test(nmO)) return 'event';
  }
  if (ty === 'person') return 'person';
  if (ty === 'event') return 'event';
  if (ty === 'org') return 'organisation';
  if (ty === 'disease') return 'disease';
  if (ty === 'concept') {
    var nm = n.name || '';
    // Only clearly-geographic concepts belong to Geography & Places. A generic
    // single-token concept (Empire, Holocaust, State of emergency) must NOT be
    // re-labelled as a place just because a geo keyword appears in its category.
    var catKeys = (n.cats || []).map(function (c) { return c.key || ''; });
    var strongCat = catKeys.length && catKeys.every(function (k) { return PLACE_CAT.test(k); }) && PLACE_HINT.test(nm);
    var strongName = PLACE_HINT.test(nm) && !/^(empire|state|republic|kingdom|colony|movement|war|treaty|organization|society|company|industry|government|committee|commission|group|party|front|union)$/i.test(nm) &&
      !/^(state of|status of|city of|end of|start of)/i.test(nm);
    return (strongCat || strongName) ? 'centre' : 'concept';
  }
  return 'concept';
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
// Clean a mined corpus sentence into a one-line revision brief, or synthesize a
// short fallback (span+era+type) when the corpus text is a bare fragment.
var FRAG_LEAD = /^(?:in\s+(?:the|this|that|a|an)\s+|during\s+(?:the|this|that|a|an)\s+|on\s+(?:the|this|that|a|an)\s+)/i;
function briefOf(n) {
  var raw = String(n.desc || '').trim().replace(/\s+/g, ' ');
  var d = raw;
  // strip leading "In the..." style fragments and dangling newlines
  d = d.replace(/^NOTE:\s*/i, '');
  if (d.length > 4 && FRAG_LEAD.test(d) && !/,\s|\.\.\./.test(d.slice(0, 60))) d = d.replace(FRAG_LEAD, '');
  // drop trailing boilerplate / indexing
  d = d.replace(/\\n+/g, ' ').replace(/\[(?:citation needed|source needed)\]/gi, '');
  var name = n.name || '';
  // a desc that merely restates the title adds nothing — force the fallback
  if (d.length < 24 || new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(d) ||
      d === 'The ' + name || d === name + ' (' || /^(the\s+)?'?$/i.test(d)) d = '';
  var span = n.span;
  if (n.type === 'event' && span && span.min != null && d && !/^-?\d/.test(d)) {
    d = dispSpan(span) + ' — ' + d;
  }
  if (d.length > 140) d = d.slice(0, 137) + '…';
  if (d.length >= 18) return d;
  // synthesize a compact fallback
  var era = { ancient: 'ancient', medieval: 'medieval India', colonial: 'colonial era', freedom: 'freedom struggle era', republic: 'post-independence India', contemporary: 'contemporary' }[n.era] || '';
  var yrs = dispSpan(span);
  var syn = [name, [era, yrs].filter(Boolean).join(', ')].filter(Boolean);
  return syn.join(' — ') + '.';
}
function makeBranches(seed) {
  var bs = [];
  var fam = fnNeighbors(seed);
  if (fam.length >= 2) {
    bs.push({
      title: 'Family & Relations', type: 'person', rel: 'relative of',
      desc: 'Direct kin and closest relations recorded for ' + seed.name + '.',
      items: fam.slice(0, 12).map(function (f) {
        return { name: f.name, type: f.type, rel: f.rel, src: f.src || 'graph', w: f.weight, desc: briefOf(f.node), note: noteFor(f.name), ev: evidenceFor(seed.name, f.name) };
      })
    });
  }
  var links = linkNeighbors(seed);
  var famSeen = {};
  fam.forEach(function (f) { famSeen[canon(f.name)] = 1; });
  links = links.filter(function (L) { return !(L.type === 'person' && famSeen[canon(L.name)]); });
  var buckets = {};
  links.forEach(function (L) {
    var f = facetOf(L.node);
    (buckets[f] = buckets[f] || []).push(L);
  });
  BRANCH_OF.forEach(function (b) {
    var arr = buckets[b.key];
    if (!arr || !arr.length) return;
    var items = arr.slice(0, b.key === 'concept' ? 14 : 10).map(function (L) {
      return { name: L.name, type: L.type, rel: L.rel, src: L.src || 'co', w: L.weight, desc: briefOf(L.node), note: noteFor(L.name), ev: evidenceFor(seed.name, L.name) };
    });
    if (!items.length) return;
    bs.push({ title: b.title, type: b.type, rel: b.rel, desc: 'The ' + b.title.toLowerCase() + ' linked to ' + seed.name + '.', items: items });
  });
  return bs;
}

// ---- generate for every importable seed ----
var seedSet = nodes.filter(function (n) {
  return String(n.id).indexOf('seed|') === 0 && !isJunk(n) && (n.count || 0) >= 2;
});
console.log('seeds:', seedSet.length);

// --- merge: existing entries always win; only missing keys get generated ---
// Hand-authored entries never carry the `_gen` marker, so a re-run preserves
// them verbatim. Generated entries are re-stamped `_gen` and refreshed.
var existing = JSON.parse(fs.readFileSync(out, 'utf8'));

var outLayers = {};
var withBranches = 0, noBranches = 0, skippedHandAuthored = 0;
seedSet.forEach(function (seed) {
  var key = canon(seed.name);
  // A hand-authored entry (no _gen marker) outranks anything the graph can
  // produce — never clobber curated content.
  if (existing[key] && !existing[key]._gen) {
    outLayers[key] = existing[key];
    skippedHandAuthored++;
    return;
  }
  var bs = makeBranches(seed);
  // total item cap so the JSON stays small enough to load fast
  var total = bs.reduce(function (s, b) { return s + b.items.length; }, 0);
  if (total > 90) {
    var budget = 90;
    bs.forEach(function (b) {
      if (budget <= 0) { b.items = []; return; }
      b.items = b.items.slice(0, budget);
      budget -= b.items.length;
    });
    bs = bs.filter(function (b) { return b.items.length; });
  }
  outLayers[key] = { name: seed.name, rel: 'covers', _gen: true, branches: bs };
  if (bs.length) withBranches++; else noBranches++;
});
console.log('with branches:', withBranches, '| empty:', noBranches, '| preserved hand-authored:', skippedHandAuthored);

// preserve any other existing layers (non-seed topics) untouched
Object.keys(existing).forEach(function (k) {
  if (!outLayers[k]) outLayers[k] = existing[k];
});

fs.writeFileSync(out, JSON.stringify(outLayers, null, 1), 'utf8');
console.log('wrote', out, Object.keys(outLayers).length, 'topics');

// self-check resolve rate
var check = ['pokhran-ii', 'mahatma gandhi', 'adolf hitler', 'indira gandhi', 'indian national congress', 'alexander the great', 'covid-19'];
var itemsN = 0, resN = 0;
check.forEach(function (k) {
  var t = outLayers[k];
  if (!t) { console.log('check:', k, 'MISSING'); return; }
  var n = 0, r = 0;
  (t.branches || []).forEach(function (b) { (b.items || []).forEach(function (it) { n++; if (resolveItem(it.name, it.type)) r++; }); });
  itemsN += n; resN += r;
  console.log('check:', k, 'branches', t.branches.length, 'items', n, 'resolve', r);
});
console.log('combined resolve rate:', resN + '/' + itemsN, (itemsN ? Math.round(100 * resN / itemsN) : 0) + '%');
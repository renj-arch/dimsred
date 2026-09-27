/*
 * gen-outline.js -- generate a study-tree outline for ANY topic.
 *
 * ONE ENGINE, NO TOPIC-SPECIFIC TREE
 * ----------------------------------
 * The same code produces the tree for Louis XIV, Uttar Pradesh, Mangalyaan,
 * Spain and World War II. Nothing below is specialised to a subject.
 *
 * THE MODEL
 * ---------
 * A relation is a ROOT ASSERTION, not an invitation to dump a neighbour's
 * graph. The tree stays one level deep: children of the root, never
 * grandchildren. Expanding a neighbour happens on click, in the UI, and
 * nowhere else.
 *
 * Every card carries three INDEPENDENT properties, and the renderer must never
 * conflate them:
 *
 *   identity          the canonical name and node id
 *   semantic type      resolved canonically, never the raw `type` field
 *   relation to root  the verb, and ONLY when a real edge asserts one
 *
 * So `Nazarbayev -- related --> Kazakhstan` keeps `related`, and Kazakhstan is
 * independently classified `place/country`. Proximity never fabricates a verb.
 *
 * WHY THE RAW `type` FIELD CANNOT BE USED
 * ---------------------------------------
 *   Vladimir Putin        concept   prefix meteorology-climate-56
 *   Kassym-Jomart Tokayev concept   prefix business-economy-7
 *   Uttar Pradesh         person    prefix indian-states-9   (it is in kin edges)
 *   Indian National Congress event  prefix seed
 * `Uttar Pradesh` is a `person` only because junk kin edges attached to it.
 * Resolution order lives in lib/type-authority.js and ends at `misc`, an honest
 * unknown, because `concept` is merely the corpus default.
 *
 * MEMBERSHIP IS NOT A RELATION
 * ----------------------------
 * Only 1,786 typed edges exist for 529,755 nodes, so a topic usually has a
 * handful of real relations. Co-occurrence carries the study material, so it
 * is admitted as MEMBERSHIP ONLY and never as a relation. Those cards get no
 * arrow. This is why a lane can be well populated while almost nothing in it
 * claims a relationship with the root.
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
// A second topic turns the COMPARE lane from a placeholder into a real diff.
var COMPARE_TOPIC = argVal('--compare', '');
var PER_LANE = parseInt(argVal('--per-lane', '20'), 10);
var USE_LINKS = process.argv.indexOf('--no-links') < 0;
var MIN_LINK_W = parseInt(argVal('--min-w', '3'), 10);
var MAX_LINK_MEMBERS = 500;

function argVal(flag, dflt) {
  var hit = process.argv.filter(function (a) { return a.indexOf(flag + '=') === 0; })[0];
  return hit ? hit.split('=')[1] : dflt;
}

// ============================================================ lane taxonomy
// Lanes are keyed by the RESOLVED type. Subgroups refine within a lane. Order
// is fixed so a tree always reads the same way for every topic.
var LANES = [
  { key: 'QUICK FACTS', kind: 'header' },
  { key: 'ORIGIN', type: null, groups: [
    ['Background', /background|precondition|origin|root cause|basis/i],
    ['Precursors', /precursor|forerunner|predecessor|earlier|originat/i],
    ['Immediate trigger', /trigger|spark|proximate|catalyst|began|started/i] ] },
  { key: 'CAUSES', type: null, groups: [
    ['Political', /politic|govern|regime|policy|administr|constitution|law|act/i],
    ['Economic', /econom|trade|financ|tax|revenue|market|monetar|industr/i],
    ['Social', /social|societ|communit|caste|tribe|religio|class|demogra|popul/i],
    ['Geographical', /geograph|climat|region|border|territor|locat/i] ] },
  { key: 'DEVELOPMENT', type: 'event', groups: [
    ['Early stage', /began|start|found|establish|inaugurat|launch/i],
    ['Turning points', /turning|crucial|decisive|watershed|pivotal/i],
    ['Major phases', /phase|stage|period|era/i] ] },
  { key: 'KEY ACTORS', type: 'person', groups: [
    ['Leaders', /leader|head|chief|president|prime minister|monarch|ruler|king|emperor|command/i],
    ['Founders', /found|establish|create/i],
    ['Opponents', /oppos|adversar|riv|enemy|against|critic|rebel/i],
    ['Participants', /particip|member|attend|delegat/i] ] },
  { key: 'KEY EVENTS', type: 'event' },
  { key: 'CONSEQUENCES', type: null, groups: [
    ['Immediate', /result|consequen|led to|cause[sd]? effect|aftermath/i],
    ['Long-term', /long.term|ultimately|eventually|in the long run|legacy/i] ] },
  { key: 'GEOGRAPHY', type: 'place', groups: [
    ['Origin', /origin|born|homeland|native/i],
    ['Important locations', /capital|headquarter|seat|center|centre/i],
    ['Routes', /route|path|journey|expedition|march|corridor/i],
    ['Territorial changes', /annex|border|territor|cession|ceded|territor/i] ] },
  { key: 'PRIMARY SOURCES', type: null, groups: [
    ['Acts', /\bact\b|statute|decree|ordinance|legislation/i],
    ['Treaties', /treaty|convention|accord|agreement|protocol|armistice|truce|pact/i],
    ['Constitutions', /constitution|charter|statute book/i],
    ['Reports', /report|commission|inquiry|survey|census/i],
    ['Books', /book|manuscript|text|chronicle|annal|gazetteer|epic|chronicle/i],
    ['Inscriptions', /inscription|epigraph|edict|tablet|coin\b/i] ] },
  { key: 'INSTITUTIONS', type: 'org', groups: [
    ['Created', /found|establish|create|instituted/i],
    ['Controlled', /control|administer|govern|oversee|run by/i],
    ['Opposed', /oppos|against|reform|challenge/i],
    ['Successor institutions', /successor|replaced by|merged|amalgamat/i] ] },
  { key: 'TERMINOLOGY', type: 'concept', groups: [
    ['Important terms', /term|doctrine|principle|ideology|philosoph/i],
    ['Titles', /title|name|named|called|known as/i],
    ['Slogans', /slogan|motto|quote|phrase/i],
    ['Alternate spellings', null] ] },
  { key: 'NUMBERS & DATA', type: null, groups: [
    ['Dates', null], ['Percentages', null], ['Population', /population|inhabit|people|census/i],
    ['Seats', /seat|constituenc|member|mla|lok sabha|parliament/i],
    ['Distances', /distance|km|kilomet|length|area|hectare/i] ] },
  { key: 'MAP CONNECTIONS', type: 'place', bySubtype: true, groups: [
    ['Countries', null], ['Regions', null], ['Cities', null],
    ['Rivers', null], ['Strategic locations', null] ] },
  { key: 'TIMELINE', kind: 'era' },
  { key: 'COMPARE', kind: 'compare' },
  { key: 'RELATED TOPICS', kind: 'related' },
  { key: 'UPSC ANGLE', kind: 'upsc', groups: [
    ['Prelims', null], ['Mains GS-I', null], ['Mains GS-II', null],
    ['Mains GS-III', null], ['Mains GS-IV', null], ['Essay', null] ] },
  { key: 'REVISION', kind: 'revision', groups: [
    ['One-liner', null], ['Key facts', null], ['Common confusion', null],
    ['PYQ connection', null], ['Practice questions', null] ] }
];

// The corpus already tags every node with its own syllabus buckets
// (`cats[].label`, e.g. "History & Culture", "Environment & Ecology"), so
// UPSC ANGLE reads those directly instead of re-guessing a paper from a name.

var CHROME = new RegExp('^('
  + 'announcements?|academic years?|external links|references?|see also|'
  + 'further reading|notes?|bibliography|sources|category|categories|portal|main page|home|'
  + 'wikipedia|templates?|files?|images?|help|contact|about|privacy|terms|cookies?|news|archive|'
  + 'draft|users?|talk|blog|search|'
  + 'category:.*|file:.*|portal:.*|template:.*|help:.*)(\\s.*)?$', 'i');
var YEARISH = new RegExp('^\\s*('
  + '\\d{1,4}(s|st|nd|rd|th)?(\\s+in\\s+\\w+)?'
  + '|\\d{1,2}(st|nd|rd|th)?\\s+(century|decade|year|month)\\b)', 'i');
function isChrome(n) { return CHROME.test(n.name) || YEARISH.test(n.name); }

// A verb like `related to` carries no meaning. It may justify membership but it
// must never be printed on an arrow.
var MEANINGLESS = /^(related|related to|associated with|mentioned with|co mentioned|co occurred|linked to|connected to|same|see also|other|other related|related topics)$/i;

function inverseOf(rel) {
  var fam = SCHEMA.familyOf(rel);
  if (!fam) return '';
  var v = SCHEMA.REL_FAMILIES[fam].verbs[SCHEMA.normaliseVerb(rel)];
  return (v && v.inv) || '';
}

function main() {
  if (!TOPIC) {
    console.error('usage: node --max-old-space-size=8192 scripts/gen-outline.js <topic> [--write]');
    process.exit(2);
  }

  var meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
  var nodes = [];
  for (var p = 0; p < meta.nodesParts; p++) {
    var shard = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.nodes.' + p + '.json'), 'utf8'));
    for (var i = 0; i < shard.length; i++) nodes.push(shard[i]);
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

  var topicNode = R.resolveItem(TOPIC, '') || R.findByName(TOPIC);
  if (!topicNode) {
    console.error('cannot resolve the topic "' + TOPIC + '" in the graph');
    process.exit(1);
  }
  var t = canon(topicNode);
  console.log('=== OUTLINE: ' + topicNode.name + '  [' + topicNode.id + '] ===');
  console.log('    resolved type: ' + t.type + (t.subtype ? '/' + t.subtype : '') +
              '   era: ' + (topicNode.era || '?') +
              '   span: ' + spanOf(topicNode) +
              '   questions: ' + (topicNode.count || 0));

  // ---------------------------------------------------- collect members ---
  // Parameterised on the topic node so COMPARE can collect a second topic's
  // members under exactly the same rules, instead of a hand-rolled guess.
  function collectMembers(node) {
    var members = Object.create(null);   // canon name -> { node, verbs, w, co }
    var stats = { edges: 0, dropped: 0, meaningless: 0, chrome: 0, junk: 0 };

    function add(other, verb) {
      var k = GC.canon(other.name);
      if (GC.canon(node.name) === k) return;
      if (!members[k]) members[k] = { node: other, verbs: Object.create(null), w: 0, co: false };
      if (verb) members[k].verbs[verb] = (members[k].verbs[verb] || 0) + 1;
    }

    (meta.edges || []).forEach(function (e) {
      if (e.a !== node.id && e.b !== node.id) return;
      stats.edges++;
      var inward = e.b === node.id;
      var other = BY_ID[inward ? e.a : e.b];
      if (!other || other.id === node.id) return;
      if (GC.isJunk(other)) { stats.junk++; return; }
      // A known-false edge must never become a tree member.
      if (CURATION.isDropped(node.name, inward ? (inverseOf(e.rel) || e.rel) : e.rel, other.name) ||
          CURATION.isDropped(other.name, e.rel, node.name)) { stats.dropped++; return; }
      var verb = MEANINGLESS.test(e.rel) ? '' : (inward ? (inverseOf(e.rel) || e.rel) : e.rel);
      if (!verb) stats.meaningless++;
      add(other, verb);
    });

    if (USE_LINKS) {
      var hits = [];
      (meta.links || []).forEach(function (l) {
        if (l.a !== node.id && l.b !== node.id) return;
        if ((l.w || 0) < MIN_LINK_W) return;
        var other = BY_ID[l.a === node.id ? l.b : l.a];
        if (!other || other.id === node.id || GC.isJunk(other) || isChrome(other)) return;
        hits.push({ node: other, w: l.w || 0 });
      });
      hits.sort(function (a, b) { return b.w - a.w; });
      hits = hits.slice(0, MAX_LINK_MEMBERS);
      hits.forEach(function (h) {
        var k = GC.canon(h.node.name);
        if (!members[k]) members[k] = { node: h.node, verbs: Object.create(null), w: h.w, co: true };
      });
      stats.links = hits.length;
    }

    var out = Object.keys(members).map(function (k) {
      var m = members[k];
      var verbs = Object.keys(m.verbs).sort(function (a, b) { return m.verbs[b] - m.verbs[a]; });
      return {
        node: m.node, name: m.node.name, verbs: verbs, w: m.w, co: m.co,
        c: canon(m.node), q: m.node.count || 0, span: spanOf(m.node), era: m.node.era
      };
    });
    // A person who could not possibly have met the topic is a shard artifact,
    // not a relation: Akbar (d. 1605) was listed as a "Leader" on Sambhaji
    // (b. 1657) only because they share question shards. `cannotCoexist` is the
    // full non-overlap test (flowchart.html's own `bornAfter` misses this case,
    // since 1542 is not greater than 1689).
    //
    // Two deliberate restrictions:
    //   - people only, because an empire or a war legitimately outlives anyone
    //     in it, and a battle can postdate the person whose reputation it settled;
    //   - members with no verb only, so an asserted edge is never discarded. This
    //     removes an unasserted co-mention or nothing.
    // Gated on the topic having a dated span, so undated topics are untouched.
    if (node.span && node.span.min != null && node.span.max != null) {
      var keptN = out.length;
      out = out.filter(function (m) {
        return !(!m.verbs.length && m.node.type === 'person' &&
                 GC.cannotCoexist(m.node, node));
      });
      stats.impossible = keptN - out.length;
    }

    // Relevance: a real asserted relation first, then the strongest co-occurrence,
    // then the most question-attested. Alphabetical order was tried and it put
    // "13th century" above "Mughal Empire".
    out.sort(function (a, b) {
      if (!!a.verbs.length !== !!b.verbs.length) return a.verbs.length ? -1 : 1;
      if (a.w !== b.w) return b.w - a.w;
      return b.q - a.q;
    });
    return { list: out, stats: stats };
  }

  var collected = collectMembers(topicNode);
  var list = collected.list;
  var stats = collected.stats;

  console.log('    members: ' + list.length + '  (typed edges ' + stats.edges +
              ', co-occurrence ' + (stats.links || 0) + ' w>=' + MIN_LINK_W +
              ', curation dropped ' + stats.dropped + ', junk ' + stats.junk +
              (stats.impossible ? ', anachronistic ' + stats.impossible : '') + ')');

  // ---------------------------------------------------------- assign ------
  // Each member lands in exactly ONE content lane, so nothing is duplicated
  // across the tree. The verb stays on its card.
  var placed = Object.create(null);
  var lanes = Object.create(null);
  function lane(key) { return lanes[key] = lanes[key] || []; }

  function matches(re, s) { return re ? re.test(s) : false; }
  function groupFor(laneDef, item) {
    if (laneDef.bySubtype) {
      if (item.c.subtype === 'city') return 'Cities';
      if (item.c.subtype === 'river') return 'Rivers';
      if (item.c.subtype === 'region') return 'Regions';
      if (item.c.subtype === 'country' || item.c.subtype === 'state') return 'Countries';
    }
    var hay = item.name + ' ' + item.verbs.join(' ') + ' ' + (item.c.subtype || '');
    if (laneDef.groups) {
      for (var i = 0; i < laneDef.groups.length; i++) {
        if (matches(laneDef.groups[i][1], hay)) return laneDef.groups[i][0];
      }
      if (laneDef.bySubtype) return 'Strategic locations';
    }
    return '';
  }

  // Verb-first lanes: these are about the RELATION, so an edge-sourced member
  // with a matching verb belongs here even if its type would fit elsewhere.
  var VERB_LANES = ['ORIGIN', 'CAUSES', 'CONSEQUENCES'];
  list.forEach(function (it) {
    if (!it.verbs.length) return;
    for (var i = 0; i < VERB_LANES.length; i++) {
      var def = byKey(VERB_LANES[i]);
      var g = groupFor(def, it);
      if (g) {
        var k = GC.canon(it.name);
        if (!placed[k]) { lane(VERB_LANES[i]).push(it); placed[k] = VERB_LANES[i]; return; }
      }
    }
  });

  // Type lanes: first matching lane wins, so the order in LANES encodes priority.
  //
  // A grouped lane used to swallow its whole type, because "type matches" was
  // the only test. DEVELOPMENT (type event, grouped) sits before KEY EVENTS
  // (type event, flat), so every event landed in DEVELOPMENT and KEY EVENTS was
  // permanently empty; GEOGRAPHY (type place, grouped) did the same to MAP
  // CONNECTIONS. A grouped lane now has to actually match one of its groups,
  // UNLESS it is the last lane for that type -- otherwise KEY ACTORS,
  // INSTITUTIONS and TERMINOLOGY, which have no plain-type successor, would
  // drop every member that matched no group.
  function lastTypeLaneIndex(type) {
    for (var j = LANES.length - 1; j >= 0; j--) {
      var d = LANES[j];
      if (d.kind || d.type == null) continue;
      if (d.type === type) return j;
    }
    return -1;
  }
  list.forEach(function (it) {
    var k = GC.canon(it.name);
    if (placed[k]) return;
    for (var i = 0; i < LANES.length; i++) {
      var def = LANES[i];
      if (def.kind || def.type == null) continue;
      if (def.type === 'place' && it.c.subtype === 'empire') { /* empires are events */ }
      if (it.c.type !== def.type && !(def.type === 'event' && it.c.subtype === 'empire')) continue;
      // A grouped lane with a later same-type lane to fall through to must earn
      // the member by matching a group.
      if (def.groups && def.groups.length && !def.bySubtype && i < lastTypeLaneIndex(def.type)) {
        if (!groupFor(def, it)) continue;
      }
      lane(def.key).push(it);
      placed[k] = def.key;
      return;
    }
  });

  // PRIMARY SOURCES and NUMBERS are content-driven, not purely type-driven, so
  // they get a second pass over whatever is still unplaced.
  ['PRIMARY SOURCES', 'NUMBERS & DATA', 'TERMINOLOGY'].forEach(function (lk) {
    var def = byKey(lk);
    list.forEach(function (it) {
      var k = GC.canon(it.name);
      if (placed[k]) return;
      var g = groupFor(def, it);
      if (g) { lane(lk).push(it); placed[k] = lk; }
    });
  });

  var leftover = list.filter(function (it) { return !placed[GC.canon(it.name)]; });

  // ------------------------------------------------------------- render ---
  var out = [];
  out.push('TOPIC: ' + topicNode.name);

  // Resolve the comparison topic up front so COMPARE can show a real diff.
  var cmpCtx = {
    topic: TOPIC, topicNode: topicNode, list: list,
    topicType: t.type + (t.subtype ? '/' + t.subtype : ''), topicSpan: spanOf(topicNode),
    compareNode: null, compareList: [], compareType: '', compareSpan: ''
  };
  if (COMPARE_TOPIC) {
    var otherNode = R.resolveItem(COMPARE_TOPIC, '') || R.findByName(COMPARE_TOPIC);
    if (otherNode) {
      var oc = canon(otherNode);
      var ocol = collectMembers(otherNode);
      cmpCtx.compareNode = otherNode;
      cmpCtx.compareList = ocol.list;
      cmpCtx.compareType = oc.type + (oc.subtype ? '/' + oc.subtype : '');
      cmpCtx.compareSpan = spanOf(otherNode);
      console.log('    comparing against: ' + otherNode.name + '  [' + cmpCtx.compareType +
                  ']  ' + ocol.list.length + ' members');
    } else {
      console.log('    comparison topic not resolvable: "' + COMPARE_TOPIC + '"');
    }
  }

  LANES.forEach(function (def) {
    if (def.kind === 'header') { renderQuickFacts(out, topicNode, t); return; }
    if (def.kind === 'era') { renderTimeline(out, meta, topicNode, list); return; }
    if (def.kind === 'compare') { renderCompare(out, list, placed, cmpCtx); return; }
    if (def.kind === 'related') { renderRelated(out, list); return; }
    if (def.kind === 'upsc') { renderUpsc(out, topicNode, list); return; }
    if (def.kind === 'revision') { renderRevision(out, topicNode, t); return; }
    // MAP CONNECTIONS groups by the lane's own declared groups (Countries /
    // Regions / Cities / Rivers / Strategic locations) rather than the raw
    // subtype, which produced a subgroup literally titled "other" for every
    // place whose subtype was missing.
    var grouped = null;
    if (def.bySubtype) {
      grouped = groupBy(lanes[def.key] || [], function (it) { return groupFor(def, it) || 'Other locations'; });
    }
    renderLane(out, def, lanes[def.key] || [], grouped);
  });

  // Anything still unplaced is shown, not hidden. A member that the engine
  // cannot classify is exactly the thing a reviewer needs to see.
  if (leftover.length) {
    out.push('├── UNCLASSIFIED MEMBERS (' + leftover.length + ')');
    out.push('│   ' + note('no lane matched; the resolver has no semantic type for these'));
    leftover.slice(0, PER_LANE).forEach(function (it) { out.push('│   ├── ' + card(it)); });
    if (leftover.length > PER_LANE) {
      out.push('│   └── … ' + (leftover.length - PER_LANE) + ' more');
    }
  }

  console.log('\n' + out.join('\n'));
  console.log('\nlane totals: ' + LANES.map(function (d) {
    return d.key + '=' + ((lanes[d.key] || []).length);
  }).filter(function (s) { return !/=0$/.test(s); }).join('  '));
  console.log('placed ' + (list.length - leftover.length) + '/' + list.length + ' members' +
              ', ' + leftover.length + ' unclassified');

  if (WRITE) {
    var dir = path.join(ROOT, 'data/generated-outlines');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    var fp = path.join(dir, GC.canon(topicNode.name).replace(/ +/g, '-') + '.txt');
    fs.writeFileSync(fp, out.join('\n') + '\n', 'utf8');
    console.log('\nWROTE ' + fp);
    console.log('verify + publish with:');
    console.log('  node --max-old-space-size=8192 scripts/ingest-layer.js ' + fp + ' --write');
  } else {
    console.log('\ndry run: pass --write to save');
  }

  function byKey(k) { for (var i = 0; i < LANES.length; i++) if (LANES[i].key === k) return LANES[i]; return {}; }
  function note(s) { return '[' + s + ']'; }
}

function spanOf(n) {
  if (!n || !n.span) return '';
  var mn = n.span.min, mx = n.span.max;
  if (mn == null && mx == null) return '';
  if (mn === mx) return String(mn);
  return mn + '-' + mx;
}
function isChromeNode(n) { return isChrome(n); }

// `Name [type] (relation)` is the outline grammar. The relation is present
// ONLY when a real edge asserts it.
function card(it) {
  return it.name + ' [' + it.c.type + ']' + (it.verbs.length ? ' (' + it.verbs[0] + ')' : '');
}

// Group items by a key function, preserving first-seen order so the tree is
// stable across runs.
function groupBy(items, keyFn) {
  var g = Object.create(null);
  items.forEach(function (it) {
    var k = keyFn(it);
    (g[k] = g[k] || []).push(it);
  });
  return g;
}

function renderLane(out, def, items, grouped) {
  if (!items.length) {
    out.push('├── ' + def.key + ' — [no members in the graph for this topic]');
    return;
  }
  var kept = items.slice(0, PER_LANE);
  out.push('├── ' + def.key);

  // Build an ordered [heading, members] list for whichever grouping applies.
  var groups = null;
  if (grouped) {
    groups = Object.keys(grouped).map(function (sub) {
      return [sub, grouped[sub].slice(0, PER_LANE)];
    });
  } else if (def.groups && def.groups.length) {
    var g = Object.create(null);
    kept.forEach(function (it) {
      var n = groupNameFor(def, it);
      (g[n] = g[n] || []).push(it);
    });
    groups = Object.keys(g).map(function (n) { return [n, g[n]]; });
  }

  if (groups) {
    // A group heading and its members were both printed at "│   ├── ", so the
    // heading was indistinguishable from a member: MAP CONNECTIONS read as
    // "Countries, Bihar, Bangladesh, Odisha, Strategic locations" with no
    // visible membership. Members now sit one level deeper than their heading.
    var overflow = items.length > kept.length;
    groups.forEach(function (gp, gi) {
      var name = gp[0], arr = gp[1];
      // A member that matched none of the lane's groups still belongs in the
      // lane (it is the last lane for its type), but a bare "other" heading read
      // like a bug. Name the bucket after the lane instead.
      var label = name || 'Other ' + def.key.toLowerCase().replace(/s$/, '');
      var lastGroup = gi === groups.length - 1 && !overflow;
      out.push('│   ' + (lastGroup ? '└── ' : '├── ') + label);
      var pad = lastGroup ? '│       ' : '│   │   ';
      arr.forEach(function (it, i) {
        out.push(pad + (i === arr.length - 1 ? '└── ' : '├── ') + card(it));
      });
    });
  } else {
    kept.forEach(function (it, i) {
      out.push('│   ' + (i === kept.length - 1 && items.length <= kept.length ? '└── ' : '├── ') + card(it));
    });
  }
  if (items.length > kept.length) {
    out.push('│   └── … ' + (items.length - kept.length) + ' more in this lane (cap ' + PER_LANE + ')');
  }
}

function groupNameFor(def, it) {
  var hay = it.name + ' ' + it.verbs.join(' ') + ' ' + (it.c.subtype || '');
  if (def.groups) {
    for (var i = 0; i < def.groups.length; i++) {
      if (def.groups[i][1] && def.groups[i][1].test(hay)) return def.groups[i][0];
    }
  }
  return '';
}

// The corpus records one `cats` entry per question-file that mentioned the
// topic, so a heavily-attested topic carries the same bucket label dozens of
// times ("Ancient India" x10 on the Mughal Empire). Merge them, summing the
// counts, so the bucket list reads as a syllabus map instead of a repetition.
function mergedCats(node) {
  var by = Object.create(null);
  (node.cats || []).forEach(function (c) {
    var label = c && c.label;
    if (!label) return;
    if (!by[label]) by[label] = { label: label, count: 0 };
    by[label].count += (c.count || 0) || 1;
  });
  return Object.keys(by).map(function (k) { return by[k]; })
    .sort(function (a, b) { return b.count - a.count || (a.label < b.label ? -1 : 1); });
}

function renderQuickFacts(out, node, t) {
  out.push('├── QUICK FACTS');
  out.push('│   ├── Definition        : ' + oneLine(node.desc));
  out.push('│   ├── Date / Period     : ' + (spanOf(node) || '[no span in the corpus]') +
           (node.era ? '  (era: ' + node.era + ')' : ''));
  out.push('│   ├── Type              : ' + t.type + (t.subtype ? ' / ' + t.subtype : '') +
           '   [via ' + t.why + ']');
  out.push('│   ├── Corpus id         : ' + node.id);
  // The corpus repeats a node's own name in its alias list, so a seeded entity
  // renders as "Mughal Empire, Mughal Empire, Mughal Empire, mughals".
  var aliases = [], seenAlias = Object.create(null);
  (node.aliases || []).forEach(function (a) {
    var k = GC.canon(a);
    if (!k || seenAlias[k] || k === GC.canon(node.name)) return;
    seenAlias[k] = 1;
    aliases.push(a);
  });
  out.push('│   ├── Alternate names   : ' + (aliases.join(', ') || '[none recorded]'));
  out.push('│   ├── Key number        : ' + (node.count || 0) + ' practice questions mention it');
  out.push('│   └── Syllabus buckets  : ' + (mergedCats(node).map(function (c) { return c.label; }).join(', ') || '[none recorded]'));
}

function renderTimeline(out, meta, node, list) {
  var eras = meta.eras || [];
  var here = node.era;
  var idx = -1;
  eras.forEach(function (e, i) { if (e.id === here) idx = i; });
  out.push('├── TIMELINE');
  if (idx < 0) {
    out.push('│   └── [the corpus does not assign this topic to a defined era]');
    return;
  }
  out.push('│   ├── Previous : ' + (idx > 0 ? eras[idx - 1].label + ' (' + eras[idx - 1].min + ' to ' + eras[idx - 1].max + ')' : '[this is the earliest era]'));
  out.push('│   ├── Current  : ' + eras[idx].label + ' (' + eras[idx].min + ' to ' + eras[idx].max + ')');
  out.push('│   ├── Next     : ' + (idx < eras.length - 1 ? eras[idx + 1].label + ' (' + eras[idx + 1].min + ' to ' + eras[idx + 1].max + ')' : '[this is the latest era]'));
  // Members that carry their own span are placed on the timeline, which is the
  // only honest way to order them: the corpus gives every node a span.
  var dated = list.filter(function (it) { return !!it.span; }).slice(0, PER_LANE);
  if (dated.length) {
    out.push('│   ├── Dated members (from the corpus span, not from the tree)');
    dated.forEach(function (it, i) {
      out.push('│   ' + (i === dated.length - 1 ? '└── ' : '├── ') + it.name + ' [' + it.c.type + '] ' + it.span);
    });
  }
}

function renderCompare(out, list, placed, ctx) {
  out.push('├── COMPARE');
  if (!COMPARE_TOPIC) {
    out.push('│   └── [no second topic given; run: gen-outline.js "' + (ctx && ctx.topic || 'topic') +
             '" --compare="<other topic>" to diff the two trees]');
    return;
  }
  var other = ctx && ctx.compareNode;
  if (!other) {
    out.push('│   └── [cannot resolve the comparison topic "' + COMPARE_TOPIC + '" in the graph]');
    return;
  }
  var olist = ctx.compareList || [];
  function key(n) { return GC.canon(n); }
  var mine = Object.create(null), theirs = Object.create(null);
  list.forEach(function (it) { mine[key(it.name)] = it; });
  olist.forEach(function (it) { theirs[key(it.name)] = it; });
  var shared = [], onlyA = [], onlyB = [];
  Object.keys(mine).forEach(function (k) { (theirs[k] ? shared : onlyA).push(mine[k]); });
  Object.keys(theirs).forEach(function (k) { if (!mine[k]) onlyB.push(theirs[k]); });

  out.push('│   ├── A : ' + ctx.topicNode.name + '  [' + (ctx.topicType || '?') + ']' +
           (ctx.topicSpan ? '  ' + ctx.topicSpan : '') + '  ' + list.length + ' members');
  out.push('│   ├── B : ' + other.name + '  [' + (ctx.compareType || '?') + ']' +
           (ctx.compareSpan ? '  ' + ctx.compareSpan : '') + '  ' + olist.length + ' members');
  out.push('│   ├── Shared members : ' + shared.length);
  shared.slice(0, PER_LANE).forEach(function (it, i) {
    var arr = shared.slice(0, PER_LANE);
    out.push('│   ' + (i === arr.length - 1 ? '└── ' : '├── ') + it.name + ' [' + it.c.type + ']');
  });
  if (shared.length > PER_LANE) out.push('│   └── … ' + (shared.length - PER_LANE) + ' more');
  out.push('│   ├── Only in ' + ctx.topicNode.name + ' : ' + onlyA.length);
  onlyA.slice(0, PER_LANE).forEach(function (it) { out.push('│   │   ├── ' + card(it)); });
  out.push('│   └── Only in ' + other.name + ' : ' + onlyB.length);
  onlyB.slice(0, PER_LANE).forEach(function (it) { out.push('│       ├── ' + card(it)); });
}

// RELATED TOPICS used to render `list.slice(0, PER_LANE)` -- the same member
// list the content lanes had already printed, so every card here was a literal
// duplicate of a card further up the tree. It now shows only what the content
// lanes do NOT: members joined by co-occurrence alone, with no asserted
// relation and therefore nothing to say about why they belong.
function renderRelated(out, list) {
  out.push('├── RELATED TOPICS');
  var seen = Object.create(null);
  var rel = list.filter(function (it) {
    if (it.verbs.length) return false;            // shown in a content lane already
    var k = GC.canon(it.name);
    if (seen[k]) return false;
    seen[k] = 1;
    return true;
  });
  if (!rel.length) {
    out.push('│   └── [every member has an asserted relation, so nothing is left as a bare co-occurrence]');
    return;
  }
  var shown = rel.slice(0, PER_LANE);
  var overflow = rel.length > shown.length;
  shown.forEach(function (it, i) {
    // When an overflow line follows it is the single leaf of the block, so the
    // last visible row must stay a branch. Otherwise the block ended with two
    // "└── " leaves in a row.
    var last = i === shown.length - 1 && !overflow;
    out.push('│   ' + (last ? '└── ' : '├── ') + it.name + ' [' + it.c.type + ']' +
             (it.w ? '  [co-occurs ' + it.w + 'x, no asserted relation]' : ''));
  });
  if (overflow) out.push('│   └── … ' + (rel.length - shown.length) + ' more');
}

function renderUpsc(out, node, list) {
  out.push('├── UPSC ANGLE');
  var cats = mergedCats(node);
  if (!cats.length) {
    out.push('│   └── [the corpus records no syllabus bucket for this topic]');
  } else {
    var top = cats.slice(0, 8);
    top.forEach(function (c, i) {
      out.push('│   ' + (i === top.length - 1 && !list.length ? '└── ' : '├── ') +
               c.label + '  (' + c.count + ' questions)');
    });
    if (cats.length > top.length) {
      out.push('│   └── … ' + (cats.length - top.length) + ' further buckets');
    }
  }
  // High-attestation members are the ones a paper would actually ask about.
  var hot = list.filter(function (it) { return it.q > 0; }).sort(function (a, b) { return b.q - a.q; }).slice(0, PER_LANE);
  if (hot.length) {
    out.push('│   ├── Most question-attested members');
    hot.forEach(function (it, i) {
      out.push('│   ' + (i === hot.length - 1 ? '└── ' : '├── ') + it.name + ' [' + it.c.type + ']  ' + it.q + ' questions');
    });
  }
}

function renderRevision(out, node, t) {
  out.push('├── REVISION');
  out.push('│   ├── One-liner     : ' + oneLine(node.desc));
  out.push('│   ├── Key facts     : ' + (spanOf(node) ? 'period ' + spanOf(node) : '[no period recorded]') +
           (node.era ? ', era ' + node.era : ''));
  out.push('│   ├── Common confusion : ' + (t.type === 'misc'
             ? 'this entity has no reliable type in the corpus; check the source before using it'
             : 'resolved as ' + t.type + ' / ' + (t.subtype || '-') + ' via ' + t.why));
  out.push('│   ├── PYQ connection: ' + (node.count || 0) + ' practice questions in the corpus');
  out.push('│   └── Practice questions : [served live by the site; not duplicated into the outline]');
}

function oneLine(s) {
  if (!s) return '[no description in the corpus]';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > 220 ? s.slice(0, 217) + '…' : s;
}

main();

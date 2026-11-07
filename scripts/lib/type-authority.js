/*
 * type-authority.js -- ONE type authority for every consumer.
 *
 * This is the fix for the "Concept bucket swallowing entities" problem. The
 * pipeline is now:
 *
 *   raw node -> canonical identity -> canonical type -> display lane
 *
 * and the relation to the root stays on the card, independent of the lane. A
 * card therefore has three separate properties -- identity, semantic type,
 * relation to root -- and the renderer never reinterprets a relation because of
 * a lane. `Nazarbayev -- related --> Kazakhstan` keeps `related`; Kazakhstan is
 * independently classified `place/country`.
 *
 * WHY A DEDICATED AUTHORITY
 * -------------------------
 * Every consumer needed the same answer (flowchart.html, validate-graph.js,
 * gen-topic-layers.js) and each one re-derived it slightly
 * differently, which is how `Uttar Pradesh` stayed a `person`. Resolving the
 * type in exactly one place makes the lanes impossible to get wrong
 * individually, and validate-graph.js asserts that every consumer uses this
 * module so the wiring cannot silently regress.
 *
 * ORDER (highest wins)
 *   1. hand-curated review        graph-type-overrides.js, hand section
 *   2. authored outline assertion  graph-type-overrides.js, generated section
 *   3. gazetteer + edge signature  entity-gazetteer.js
 *   4. raw corpus type            only when it is not the `concept` default
 *   5. misc                       honest unknown -> OTHER ENTITIES
 *
 * STEP 5 is load-bearing. Treating `concept` as a real type is precisely what
 * put countries, cities and heads of state into a CONCEPTS lane; 392,872 nodes
 * carry it and it means only "unclassified". They now report `misc` and render
 * in OTHER ENTITIES, where a reviewer can see them, instead of asserting they
 * are concepts.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./graph-core.js'),
                             require('./graph-type-overrides.js'),
                             require('./entity-gazetteer.js'));
  } else {
    // graph-type-overrides.js publishes window.GraphTypeOverrides, not
    // window.TYPE_OVERRIDES. Reading the wrong name left OVERRIDES undefined and
    // every live page threw "Cannot read properties of undefined (reading
    // 'overrideFor')" on the first node.
    root.TYPE_AUTHORITY = factory(root.GC, root.GraphTypeOverrides || root.TYPE_OVERRIDES, root.GAZ);
  }
}(typeof self !== 'undefined' ? self : this, function (GC, OVERRIDES, GAZ) {
  'use strict';

  var canon = GC.canon;

  /**
   * @param opts.adjacency optional { [id]: [{to, r}] } from data/timeline.json.
   *        Present in Node consumers; absent in the browser, where the
   *        gazetteer still works and only the edge signatures are skipped.
   * @returns fn(node) -> node   with corrected `.type` plus `.typeSubtype`,
   *        `.typeConf`, `.typeWhy`. Returns the SAME object when nothing
   *        changes, so the common path stays allocation-free.
   */
  function makeTypeAuthority(opts) {
    opts = opts || {};
    // `adjacency` is a snapshot; `adjacencyFn` is called at resolve time.
    // The lazy form is REQUIRED in flowchart.html, where makeResolver() runs
    // while the edge index is still empty and ADJ is only filled in later by
    // the loader. Capturing the object literal here looked correct but handed
    // the gazetteer an empty graph, so no person could be identified by family
    // edges -- and the memo then cached that wrong answer for the whole page.
    var getAdj = opts.adjacencyFn || function () { return opts.adjacency || null; };
    // Names repeat heavily across 529,755 nodes, so memoising on the canonical
    // name collapses most of the work. The verdict depends only on the name,
    // the raw type and the edge set, and the edge set is fixed per run.
    var memo = Object.create(null);

    function describe(node) {
      if (!node || !node.name) return { type: 'misc', conf: 0, why: 'no node' };
      var key = canon(node.name) + '\0' + (node.type || '');
      var hit = memo[key];
      if (hit) return hit;

      var hand = OVERRIDES.overrideFor(node.name, canon);
      var out = hand
        ? { type: hand.type, subtype: hand.subtype, conf: hand.conf == null ? 1 : hand.conf,
            why: 'hand-curated: ' + (hand.why || 'reviewed') }
        : GAZ.resolveType(node, getAdj());
      memo[key] = out;
      return out;
    }

    function authority(node) {
      var d = describe(node);
      // No change: hand back the original so hot lookup paths do not allocate.
      if (d.type === node.type && !d.subtype) return node;
      var copy = {};
      for (var k in node) copy[k] = node[k];
      copy.type = d.type;
      if (d.subtype) copy.typeSubtype = d.subtype;
      copy.typeConf = d.conf;
      copy.typeWhy = d.why;
      return copy;
    }

    authority.describe = describe;
    /** True when the gazetteer/curation, not the corpus, decided. */
    authority.isAuthoritative = function (node) {
      var d = describe(node);
      return d.why.indexOf('hand-curated') === 0
          || d.why.indexOf('gazetteer') === 0
          || d.why.indexOf('pattern') === 0
          || d.why.indexOf('edge signature') === 0;
    };
    return authority;
  }

  return { makeTypeAuthority: makeTypeAuthority };
}));

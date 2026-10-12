/*
 * graph-edge-curation.js -- relations that are known to be FALSE and must not
 * be drawn, keyed by canon(a) + '|' + rel + '|' + canon(b).
 *
 * WHY A DROP LIST INSTEAD OF AN EDIT TO data/timeline.json
 * ------------------------------------------------------
 * The edge table is a generated artefact (data/timeline.json carries a
 * `builtAt` stamp and is rebuilt wholesale). Deleting rows from it here would
 * silently reappear the next time the producer runs, and the change would be
 * invisible in review. Keeping the curation as data, in a file whose only job
 * is to be wrong out loud, means the decision is reviewable and survives a
 * rebuild. This mirrors graph-type-overrides.js, which corrects node types at
 * read time for the same reason.
 *
 * SCOPE: only relations contradicted by an established fact, and only where the
 * confidence is high. Doubtful-but-unproven claims are listed in UNRESOLVED
 * and are deliberately KEPT, because dropping a real genealogy is worse than
 * showing one odd edge. Each entry records why, so a reviewer can disagree.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GraphEdgeCuration = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // key: canon(a)|rel|canon(b)
  var DROP = {
    // Louis XIV's only full brother was Philippe I, Duke of Orléans, so the
    // same node cannot simultaneously be his brother, his cousin and his
    // son-in-law. The corpus emits all three. "brother" is kept.
    'orleans|cousin|louis xiv':
      'contradicts the retained brother relation; Louis XIV had one full brother, Philippe I',
    'orleans|son in law|louis xiv':
      'contradicts the retained brother relation; Philippe was the brother, not a son-in-law',

    // Maria Theresa of Austria (1635-1683) married Philippe I, Duke of Orléans
    // in 1661, making her Louis XIV's sister-in-law. She was 15 years younger
    // than him and never his spouse.
    'maria theresa|spouse|louis xiv':
      'she married Louis XIV\'s brother Philippe I in 1661, not Louis XIV',

    // Auguste of Baden-Baden (1704-1728) married Louis, Duke of Orléans
    // (1672-1723), who was Louis XIV's brother. She was his sister-in-law.
    'auguste of baden baden|rival of|louis xiv':
      'she was Louis XIV\'s sister-in-law by marriage to his brother Louis of Orleans',

    // Same node, a second false edge. The corpus holds exactly one "Maria
    // Theresa": its description ("replaced Maria Josepha as heir presumptive to
    // the Habsburg realms") and its edges to Marie Antoinette identify her as
    // Maria Theresa of Austria. Philip IV of Spain's wife was Mariana of
    // Austria -- her MOTHER. The edge collapsed mother into daughter.
    'maria theresa|wife|philip iv of spain':
      'Philip IV married Mariana of Austria, Maria Theresa\'s mother; the edge conflated the two',

    // Found by the same-direction contradiction scan in validate-graph.js
    // (scripts/validate-graph.js, "kin contradictions"), which needs no world
    // knowledge: a person cannot be both a spouse and a cousin in the same
    // direction. Eleanor Roosevelt was FDR's wife from 1905.
    'franklin d roosevelt|cousin|eleanor roosevelt':
      'husband and wife since 1905; the same pair also carries a `husband` edge, so `cousin` is impossible',

    // Same contradiction shape: Ka\u02BBahumanu was Kamehameha I's wife and
    // co-ruler, and the pair also carries a `wife` edge.
    'ka ahumanu|cousin|kamehameha i':
      'she was Kamehameha I\'s wife; the same pair also carries a `wife` edge, so `cousin` is impossible',

    // The target node here is named literally "Sir" -- a truncated honorific
    // left behind by the sentence splitter, not a person. Neither relation can
    // be checked because there is no referent, and the pair also contradicts
    // itself (brother + cousin), so both are suppressed. Found by the
    // contradiction scan; the underlying defect is the malformed node.
    'richard grenville|brother|sir':
      'the target node is named "Sir", a truncated honorific rather than a person; unverifiable',
    'richard grenville|cousin|sir':
      'the target node is named "Sir", a truncated honorific rather than a person; unverifiable'
  };

  // Recorded, not dropped. These may well be correct and the corpus offers no
  // way to check them from the data alone, so they stay visible for review.
  var UNRESOLVED = {
    'artus de lionne|son|louis xiv':
      'an Artus de Lionne was a French abbot and Archbishop of Sens; possibly a legitimised son, unproven',
    'louis xiv|great grandfather|louis tocque':
      'plausible via Louis the Grand Dauphin -> Louis of Orleans, but Tocque (b.1736) is the painter; unproven'
  };

  // Same canon() the name index uses, duplicated here so this module has no
  // dependency on graph-core.js and can be loaded standalone in the browser.
  function canon(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/^ +| +$/g, '');
  }

  function key(a, rel, b) { return canon(a) + '|' + canon(rel) + '|' + canon(b); }

  /**
   * @returns true when the edge must not be drawn.
   */
  function isDropped(a, rel, b) { return Object.prototype.hasOwnProperty.call(DROP, key(a, rel, b)); }

  function reason(a, rel, b) { return DROP[key(a, rel, b)] || ''; }

  function isUnresolved(a, rel, b) {
    return Object.prototype.hasOwnProperty.call(UNRESOLVED, key(a, rel, b));
  }

  return {
    DROP: DROP,
    UNRESOLVED: UNRESOLVED,
    canon: canon,
    key: key,
    isDropped: isDropped,
    reason: reason,
    isUnresolved: isUnresolved,
    count: Object.keys(DROP).length
  };
}));

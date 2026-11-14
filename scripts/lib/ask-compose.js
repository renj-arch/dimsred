(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-entity-evidence.js'));
  else root.VlymbooqAskCompose = factory(root.VlymbooqAskEntityEvidence);
}(typeof self !== 'undefined' ? self : this, function (ee) {
  'use strict';
// Compose a structured, grounded answer from retrieved evidence.
//
// WHAT THIS IS, and what it deliberately is not.
//
// It builds the SHAPE of a mains answer: headings in a fixed order, each with the
// corpus's own sentences under it, provenance on every line, and an explicit
// statement where the corpus is silent. It does not write the argument. The
// corpus holds facts, not reasoning: it says Port Blair lies 1,190 km from
// Chennai, and never says that this makes the islands a forward operating base.
// That second step is reasoning, and it is not something retrieval can do.
//
// So the output separates two things a reader must not confuse:
//   QUOTED  -- a sentence from the corpus, verbatim, with entity, source and
//              date. Never altered, never reordered into a claim it does not make.
//   GAP     -- the corpus has no entity for this heading. Stated plainly, with
//              the nearest entities listed so the reader can check.
//
// A heading is never filled from a neighbouring heading, and a gap is never
// dressed up as an answer. That discipline is the point of this module: an
// evidence dossier that quietly overstates itself is worse than one that admits
// what it does not know.
//
// The OUTLINE is authored, not derived. A mains answer's structure is an
// analyst's judgement; there is no way to recover it from a corpus. What this
// module contributes is the filling, the attribution and the honest gaps.

var MAX_EVIDENCE_PER_HEADING = 3;

// Severity decides how a gap is worded. A heading whose claim is central to the
// question is stated as a gap; a heading that is merely absent is noted more
// quietly. Both are visible, because the reader needs to know which is which.
function gapLine(p, opts) {
  var what = (p.terms || []).map(function (t) { return '"' + t + '"'; }).join(' or ');
  if (p.resolved) {
    // A resolved claim can fail for two unrelated reasons, and conflating them
    // makes the answer lie about the corpus. Either the shard was never fetched,
    // or it was fetched and the entity simply has too little text -- which is a
    // property of the corpus, not of this request. The first is a deployment
    // gap the user can fix; the second is not, so they must read differently.
    if (p.picked === 0) {
      return 'Not retrieved. The corpus contains "' + p.resolved +
        '", but its evidence shard was not loaded for this answer. This is a ' +
        'coverage of this deployment, not a hole in the corpus.';
    }
    return 'Too thin to quote. The corpus contains "' + p.resolved +
      '" but only ' + p.picked + ' usable sentence(s) for it, fewer than the ' +
      ((opts && opts.minSupport) || 2) + ' required to support a heading. The ' +
      'entity exists; the corpus says almost nothing about it.';
  }
  // This wording claimed something stronger than was true, and the archive search
  // disproved it in public: asking for "El Nino" here produced "Not covered by this
  // corpus", while archive.html -- reading the same fact sentences from the same
  // source -- found "warm El Nino years" under Pelagic thresher. The corpus does
  // cover the term.
  //
  // What is actually true is narrower and has a different cause. A shard row is
  // named for the record's SUBJECT, so "El Nino" exists verbatim inside sentences
  // belonging to entities like "Pelagic thresher" and "Effects of climate change on
  // livestock", but it is never itself an entity name. Entity-anchored lookup
  // cannot see it, and the hash of "el nino" lands in bucket 114 while the text
  // sits in buckets 2 and 40. So this is a retrieval limitation being reported as a
  // corpus fact, which is the one confusion the three-outcome split exists to
  // prevent.
  var s = 'No entity named "' + what + '" exists in this corpus. ' +
    'The term may still appear inside sentences about other subjects, which ' +
    'entity-anchored lookup cannot reach. The archive search reads full text; ' +
    'this path reads entities.';
  if (p.near && p.near.length) {
    s += ' The corpus has related entries (' + p.near.slice(0, 3).join('; ') + ').';
  }
  return s;
}

// One rendered section. `status` is answered | unquoted | absent, and is carried
// separately from the body so a renderer can style or count each case.
function section(point, opts) {
  var o = opts || {};
  var out = { label: point[0], status: 'absent', lines: [], gaps: [], claims: point[2] || null };

  var r;
  if (o.result && o.result.byLabel) r = o.result.byLabel[point[0]];
  if (!r) {
    out.status = 'absent';
    out.gaps.push({ text: 'No claim was supplied for this heading.' });
    return out;
  }

  out.resolved = r.resolved || null;
  out.how = r.how || null;

  if (r.supported && r.evidence && r.evidence.length) {
    out.status = 'answered';
    // Cap per heading so one prolific entity cannot crowd out the others.
    r.evidence.slice(0, o.perHeading || MAX_EVIDENCE_PER_HEADING).forEach(function (e) {
      out.lines.push({
        text: e.sentence,
        entity: e.entity,
        cats: e.cats,
        trust: e.trust
      });
    });
    return out;
  }

  out.status = r.resolved ? 'unquoted' : 'absent';
  out.gaps.push({ text: gapLine(r, o), resolved: !!r.resolved, near: r.near || [] });
  return out;
}

// Build every section of the answer from a retrieval result and an outline.
//
// `result` is what ask-entity-evidence.js retrieve() returned. `outline` is the
// authored list of [heading, term, alternates].
//
// The returned object is plain data: no DOM, no HTML. ask.html renders it, and
// the offline tests assert on it, so the composition rules can be checked
// without a browser.
function compose(question, outline, result, options) {
  var opts = {};
  Object.keys({ perHeading: MAX_EVIDENCE_PER_HEADING }).forEach(function (k) {
    opts[k] = MAX_EVIDENCE_PER_HEADING;
  });
  Object.keys(options || {}).forEach(function (k) { opts[k] = options[k]; });

  var sections = (outline || []).map(function (p) {
    return section(p, { perHeading: opts.perHeading, result: result });
  });

  var counts = { answered: 0, unquoted: 0, absent: 0 };
  var quoted = 0;
  var prov = { ok: 0, flagged: 0, unverified: 0 };
  var entities = {};
  sections.forEach(function (s) {
    counts[s.status]++;
    s.lines.forEach(function (l) {
      quoted++;
      if (l.trust && l.trust.state === 'ok') prov.ok++;
      else if (l.trust && l.trust.state === 'flagged') prov.flagged++;
      else prov.unverified++;
      entities[l.entity] = 1;
    });
  });

  return {
    question: question,
    sections: sections,
    counts: counts,
    total: sections.length,
    quoted: quoted,
    entities: Object.keys(entities),
    provenance: prov,
    // Carried through deliberately. sections[] is the rendered view and holds only
    // the sentences that were quoted; byLabel is the full per-heading retrieval
    // result (resolved entity plus every candidate sentence). The prose composer
    // needs the candidates in order to score them against the heading's own claim,
    // which the quoted subset has already been trimmed against. Without this the
    // composer sees no entity evidence at all and falls back to escape for
    // headings retrieval actually served -- which is how an entity-resolved heading
    // ended up quoting a wildlife project.
    byLabel: (result && result.byLabel) || {},
    // The single most important field. The corpus states each fact on its own and
    // never states how they connect, so this answer is a dossier of evidence, not
    // an argument. Saying so is not a caveat bolted on afterwards; it is the
    // honest description of what was assembled.
    isArgument: false,
    argumentNote: 'Headings are supplied, not derived. Sentences are quoted ' +
      "verbatim from the corpus and are not combined into a claim. The links " +
      'between them must be argued by the reader.',
    // These two notes had the relationship backwards, and the El Nino case is why it
    // mattered. A heading with no entity name is absent from the ENTITY TABLE; the
    // text may well be in the corpus under some other entity. So the absent case
    // proves less about the corpus than the unquoted case does, not more.
    gapNote: 'A heading with no matching entity is absent from the entity table, ' +
      'which is not the same as absent from the corpus: the term may appear ' +
      'inside sentences about other subjects. The archive search reads full text ' +
      'and will find it; this path reads entities. A heading marked "too thin" ' +
      'names a real entity that the corpus says little about.',
    absentNote: 'No entity of that name. Try the archive search, which reads ' +
      'sentence text rather than entity names.'
  };
}

// A plain-text rendering, used by the CLI verifier and by the offline tests.
// The page builds its own DOM from the same structured result.
function toText(composed) {
  var lines = [];
  lines.push(composed.question);
  lines.push('');
  composed.sections.forEach(function (s) {
    lines.push(s.label);
    if (s.status === 'answered') {
      s.lines.forEach(function (l) {
        lines.push('  - "' + l.text + '"');
        lines.push('    [' + l.entity + ' | ' + (l.trust.source || 'no source') +
          ' | ' + String(l.trust.pubDate || 'undated').slice(0, 10) +
          ' | ' + l.trust.state + ']');
      });
    } else {
      s.gaps.forEach(function (g) { lines.push('  ! ' + g.text); });
    }
    lines.push('');
  });
  lines.push('way forward / conclusion: not retrieved. These are judgement, not');
  lines.push('corpus content, and this system does not generate them.');
  lines.push('');
  lines.push('answered ' + composed.counts.answered + '/' + composed.total +
    ', quoted ' + composed.quoted + ' sentences, ' + composed.entities.length +
    ' distinct entities, provenance ok/flagged/unverified ' +
    composed.provenance.ok + '/' + composed.provenance.flagged + '/' +
    composed.provenance.unverified);
  lines.push('');
  lines.push(composed.argumentNote);
  return lines.join('\n');
}

return {
  compose: compose,
  toText: toText,
  gapLine: gapLine,
  MAX_EVIDENCE_PER_HEADING: MAX_EVIDENCE_PER_HEADING
};
}));

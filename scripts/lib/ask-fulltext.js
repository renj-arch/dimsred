// Full-text retrieval over the quotable-node index, as a fallback source of
// synthesis candidates.
//
// WHY THIS EXISTS. The phrase index answers "which buckets mention this exact
// phrase", which fails completely for an abstract question. "analyse the risks
// posed by technological concentration to India's digital sovereignty" produces
// five bigrams of which one -- "digital sovereignty", df 1 -- exists anywhere in
// the index, so the synthesis path fetched a single bucket and scored zero
// sentences out of 21,520 candidates. No amount of gate tuning fixes that: the
// material is not reachable by phrase.
//
// The BM25 index over node descriptions reads the same corpus by meaning rather
// than by exact phrase. For the question above it returns "Concentration risk",
// "Systemic risk", "Digital India" and "Sovereignty" -- exactly the entities an
// answer needs -- before anyone writes an expansion term.
//
// The candidates it contributes are marked for the relaxed gate downstream
// because BM25 has already ranked them against the whole corpus for topicality;
// re-proving topic membership sentence by sentence would reject on a
// technicality material that was selected precisely because it is on topic.
//
// Loaders differ by environment and that is the whole reason for the split:
// the page already fetches this index for the timeline engine and hands it over,
// while the harness fetches it through the fs-backed stub it installs over
// global.fetch.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-core.js'));
  else root.VlymbooqAskFulltext = factory(root.VlymbooqAsk);
}(typeof self !== 'undefined' ? self : this, function (core) {
  'use strict';

  var META = 'data/ask-index.json';
  var cached = null;
  var loading = null;

  // One node per row in the shard files: [id, name, type, cats, desc].
  function toNode(arr) {
    return {
      id: arr[0],
      name: arr[1],
      type: arr[2],
      cats: arr[3] ? [{ key: arr[3], label: arr[3] }] : [],
      desc: arr[4]
    };
  }

  // Description text is prose, not a single sentence. Splitting it here rather
  // than taking the node whole is what makes a 90-character lead usable as a
  // fact: "Digital India is an initiative by the government of India to provide
  // digital government services" is a quotable fact only once it is its own
  // candidate, separate from whatever the rest of the description says.
  //
  // No lookbehind: the page has to run in browsers that do not support it. The
  // split is a scan for a sentence ender followed by whitespace and a capital,
  // which keeps "U.S." and "Rs." from cutting a sentence in half often enough to
  // matter for retrieval.
  function splitSentences(text) {
    var out = [];
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return out;
    var start = 0;
    for (var i = 0; i < s.length - 1; i++) {
      var ch = s[i];
      if (ch !== '.' && ch !== '!' && ch !== '?') continue;
      var next = s[i + 1];
      if (next !== ' ' && next !== '"') continue;
      var j = i + 1;
      while (j < s.length && (s[j] === ' ' || s[j] === '"')) j++;
      if (j >= s.length) break;
      if (s[j] !== s[j].toUpperCase() || s[j] === s[j].toLowerCase()) continue;
      var piece = s.slice(start, i + 1).trim();
      if (piece.length > 0) out.push(piece);
      start = j;
      i = j - 1;
    }
    var tail = s.slice(start).trim();
    if (tail) out.push(tail);
    return out;
  }

  // The page's already-built index, wrapped in the same shape as candidates().
  // Passing it in rather than rebuilding is the point: buildIndex over 217,598
  // nodes takes about 29 seconds, and the page pays that once at load.
  function fromIndex(idx, question, limit) {
    if (!idx || !idx.N || !core) return [];
    var res;
    try {
      res = core.retrieve(idx, question, limit || 60);
    } catch (e) {
      return [];
    }
    if (!res) return [];
    // `refused` covers two very different things and only one of them blocks.
    // The refusal this path most often sees -- "only N quoteable sentences bear
    // on this question" -- is a statement about evidence sentences, which is
    // exactly what this fallback exists to supply instead, so honouring it would
    // switch off the fix on every question that needs it. A `corpusGap` is the
    // other case: the identifying term is absent from the index, so ranking
    // nodes by it returns scaffolding words and their neighbours, and answering
    // from that is the confident garbage the guard was written to stop.
    if (res.corpusGap) return [];
    if (!res.candidates || !res.candidates.length) return [];
    var out = [];
    (res.candidates || []).forEach(function (n, rank) {
      if (!n) return;
      splitSentences(n.desc).forEach(function (sentence) {
        // Thin fragments carry no claim and no context, and the prose scorer
        // would rank them on a single shared word.
        if (sentence.split(' ').length < 8) return;
        out.push({
          entity: n.name, sentence: sentence, cats: [], terms: [],
          fulltext: true,
          // Position in the whole-corpus ranking, carried so the scorer can weight
          // by it: this is the one signal that already separates a concentration
          // risk from a concentration camp.
          rank: rank
        });
      });
    });
    return out;
  }

  // Harness path: fetch the manifest and the node shards once, build the index
  // once, answer every later question from the cached index.
  function index() {
    if (cached) return Promise.resolve(cached);
    if (loading) return loading;
    loading = fetch(META).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' on ' + META);
      return r.json();
    }).then(function (data) {
      var shards = (data.meta && data.meta.nodeShards) || 0;
      var jobs = [];
      for (var i = 0; i < shards; i++) {
        jobs.push(fetch('data/ask-index-nodes.' + i + '.json').then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' on a node shard');
          return r.json();
        }));
      }
      return Promise.all(jobs).then(function (parts) {
        var rows = shards ? [] : (data.nodes || []);
        parts.forEach(function (p) { rows = rows.concat(p); });
        cached = core.buildIndex({
          nodes: rows.map(toNode),
          links: data.links || {},
          thin: data.thin,
          thinWhy: data.thinWhy
        });
        return cached;
      });
    }).catch(function (err) {
      loading = null;
      throw err;
    });
    return loading;
  }

  function candidates(question, limit) {
    return index().then(function (idx) { return fromIndex(idx, question, limit); });
  }

  return {
    META: META,
    toNode: toNode,
    splitSentences: splitSentences,
    fromIndex: fromIndex,
    index: index,
    candidates: candidates
  };
}));

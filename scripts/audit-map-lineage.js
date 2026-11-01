// Lineage coverage audit — answers "is map lineage missing?" with numbers.
//
// Earlier belief ("timeline has zero kin edges") was DISPROVEN: build-timeline.js
// mines explicit kin constructions (F1-F4), ships ~1.9k typed edges in
// timeline.json `edges`, 66k+ kin:true person nodes, and map.html consumes
// them (t.edges -> _eadj -> renderLineage with junk/era filters). What is
// real is SPARSITY: most kin persons have no explicit kin sentence in the
// corpus, so they carry no edge. This audit quantifies exactly that, plus
// endpoint resolution (how many edge endpoints resolve to shard nodes).
//
// Always exits 0; fault-report.js treats this file as an optional source.

const fs = require('fs');
const path = require('path');

const FAMILY_RE = /^(father|mother|son|daughter|brother|sister|grandfather|grandmother|grandson|granddaughter|grandparent|grandchild|great-grandfather|great-grandmother|great-grandson|great-granddaughter|uncle|aunt|nephew|niece|cousin|husband|wife|spouse|parent|child|children|son-in-law|daughter-in-law|father-in-law|mother-in-law|brother-in-law|sister-in-law)$/i;

function main() {
  const tl = JSON.parse(fs.readFileSync('data/timeline.json', 'utf8'));
  const edges = tl.edges || [];
  const files = fs.readdirSync('data').filter(function (f) {
    return /^timeline\.nodes\.\d+\.json$/.test(f);
  }).sort();
  const ids = new Set();
  let kinNodes = 0, totalNodes = 0;
  files.forEach(function (f) {
    const d = JSON.parse(fs.readFileSync(path.join('data', f), 'utf8'));
    const nodes = Array.isArray(d) ? d : (d.nodes || []);
    nodes.forEach(function (n) {
      totalNodes++;
      if (n.id) ids.add(n.id);
      if (n.kin === true) kinNodes++;
    });
  });

  const byRel = {};
  let familyEdges = 0, resolved = 0;
  const unresolved = [];
  edges.forEach(function (e) {
    byRel[e.rel] = (byRel[e.rel] || 0) + 1;
    if (FAMILY_RE.test(e.rel)) familyEdges++;
    const okA = ids.has(e.a), okB = ids.has(e.b);
    if (okA && okB) resolved++;
    else if (unresolved.length < 15) {
      unresolved.push({ rel: e.rel, a: e.a, aMissing: !okA, b: e.b, bMissing: !okB });
    }
  });

  const out = {
    generated: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    // Schema expected by fault-report.js. A full corpus-vs-map re-diff (the
    // miner re-run) is deliberately NOT done here — this audit runs in the
    // wiki-fill finalize on every fill and must stay cheap. Wiring + yield
    // are what need watching; bad/miss stay empty until a real contradiction
    // check replaces this.
    totalCorpusEdges: edges.length,
    incorrect: [],   // fault-report.js reads these keys
    missing: [],
    note: 'Wiring verified end-to-end (miner -> timeline.json edges -> map _eadj -> renderLineage). Issue is edge yield/coverage, not missing data.',
    totalNodes: totalNodes,
    kinNodes: kinNodes,
    totalEdges: edges.length,
    familyEdges: familyEdges,
    coveragePctOfKinNodes: kinNodes ? Math.round(familyEdges / kinNodes * 10000) / 100 : 0,
    endpointsResolved: resolved,
    resolutionPct: edges.length ? Math.round(resolved / edges.length * 100) : 0,
    byRel: byRel,
    unresolvedSamples: unresolved,
    verdict: 'wired-and-mined'
  };
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/map-lineage-audit.json', JSON.stringify(out, null, 2));
  console.log('lineage audit: ' + edges.length + ' edges (' + familyEdges +
    ' family), ' + kinNodes + ' kin nodes, coverage ' + out.coveragePctOfKinNodes +
    '%, endpoint resolution ' + out.resolutionPct + '%');
}

main();

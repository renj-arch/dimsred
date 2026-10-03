// Regression tests for the defects fixed on 2026-10-03.
//
// Every case here is a real failure that was measured, not a hypothetical:
// each assertion quotes the node names the engine actually returned before the
// fix. They exist because the fix was subtle and general -- a vocabulary gap, a
// tier that could not fall through, a coverage divisor -- and every one of those
// is the kind of change that looks harmless in review and silently reinstates
// last quarter's garbage.
//
// Run: node scripts/test-ask-strategic-dimensions.js

const fs = require('fs');
const path = require('path');
const ask = require('./lib/ask-core.js');

const ROOT = path.join(__dirname, '..');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ask-index.json'), 'utf8'));

const nodes = [];
for (let i = 0; i < 12; i++) {
  const f = path.join(ROOT, 'data', 'ask-index-nodes.' + i + '.json');
  if (!fs.existsSync(f)) continue;
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of (s.nodes || s)) {
    nodes.push({ id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4], ev: r[5] });
  }
}
const idx = ask.buildIndex({ nodes: nodes, links: meta.links });

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}
function run(q) {
  const r = ask.retrieve(idx, q, 12);
  return { r: r, names: (r.evidence || []).map(e => e.node.name) };
}

console.log('=== subject extraction: the "of X" cut must fire ===');
{
  // "applications" was missing from DEMAND_NOUN, so the cut that lifts the
  // real head noun out of the question never ran.
  ok(ask.subjectOf('discuss the potential applications of digital twins in infrastructure planning') === 'digital twins',
    'subject of "applications of digital twins ..." is "digital twins"');
}

console.log('\n=== a shared noun is not a subject ===');
{
  // Tier 2 accepted any node containing any route phrase. The route contained
  // the bare word "infrastructure", so these were admitted by name alone.
  const { names, r } = run('discuss the potential applications of digital twins in infrastructure planning and governance');
  ok(!names.includes('Western Cape'), 'does not answer with Western Cape');
  ok(!names.includes('Civil engineer'), 'does not answer with Civil engineer');
  ok(!names.some(n => /Infrastructure Partners|Infrastructure Leasing|Industrial Infrastructure/.test(n)),
    'does not answer with unrelated infrastructure companies');
  // Only two nodes in the whole index mention "digital" and infrastructure
  // together, and neither is about digital twins, so refusing is the honest
  // outcome. It must refuse rather than pad the answer with near-misses.
  ok(r.refused === true, 'refuses when the corpus has no digital-twin governance material');
  ok(r.coverage < 0.5, 'coverage stays below half (' + r.coverage.toFixed(3) + ')');
}

console.log('\n=== coverage cannot be manufactured ===');
{
  // conceptCov's denominator was the route's whole vocabulary; once it became
  // the subset the question named, a two-phrase denominator hit 1.0 and the
  // engine printed "Coverage 100%" over two irrelevant sentences.
  const { r } = run('discuss the potential applications of digital twins in infrastructure planning and governance');
  ok(!(r.coverage > 0.95), 'refused question does not report ~100% coverage (' + r.coverage.toFixed(3) + ')');
}

console.log('\n=== concept tier must match what the question asked ===');
{
  const { names, r } = run("analyse the importance of the indian ocean islands in India's maritime strategy");
  ok(!names.includes('Andaman and Nicobar Police'), 'does not answer with the A&N Police');
  ok(!names.includes('Andaman and Nicobar Islands Lok Sabha constituency'), 'does not answer with a Lok Sabha constituency');
  ok(!names.includes('Emblem of Andaman and Nicobar Islands'), 'does not answer with the territorial emblem');
  const maritime = names.filter(n => /maritime|ocean|sea|naval|piracy/i.test(n));
  ok(maritime.length >= 3, 'answers with maritime-strategy material (' + maritime.length + ' of ' + names.length + ')');
  ok(r.refused === false, 'does not refuse material it is holding');
}

console.log('\n=== an untitled subject must still answer ===');
{
  // No node is titled "independent regulatory institutions". The subject tier
  // used to run, find no titled node, and void the result -- 15 correct
  // candidates discarded and a false refusal reported.
  const { r, names } = run('analyse the significance of independent regulatory institutions in a market-oriented economy');
  ok(r.refused === false, 'answers an untitled subject');
  ok(names.includes('Regulatory economics'), 'surfaces Regulatory economics');
  ok(names.length >= 2, 'surfaces more than one source (' + names.length + ')');
}

console.log('\n=== honesty: a genuine corpus gap must still refuse ===');
{
  // Measured across all 214,696 nodes: "Loneliness" 0 nodes, "Social isolation"
  // 0 nodes, no Indian-society material on community life. The engine must say
  // so. These fixes must not have made it invent coverage.
  const { r, names } = run('analyse the relationship between loneliness, social isolation and changing patterns of community life in india');
  ok(r.refused === true, 'refuses a topic absent from the corpus');
  ok(names.length < 5, 'does not pad the refusal with unrelated nodes (' + names.length + ')');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
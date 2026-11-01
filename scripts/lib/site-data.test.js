'use strict';
// Data-contract suite for the pages that read the sharded timeline and the
// two graph/revision stores.
//
// map.html shipped with `allNodes = all.concat(p)` (an undefined accumulator)
// in its shard loader. Every load threw, the catch-all printed
// "data/timeline.json not found", and the page looked like missing data when
// the data was deployed and the other consumer (flowchart.html) loaded it
// fine. A static parse cannot see that, so this suite extracts the real loader
// functions from both pages and runs them against a fake fetch. It also pins
// the shape of the stores revision.html and knowledge-graph.html render.
//
//   node scripts/lib/site-data.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };
const readJson = function (rel) { return JSON.parse(read(rel)); };

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

function extractFunction(html, name) {
  const start = html.indexOf('function ' + name + '(');
  if (start === -1) return null;
  const brace = html.indexOf('{', start);
  if (brace === -1) return null;
  let depth = 0;
  for (let i = brace; i < html.length; i++) {
    const ch = html[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      for (i++; i < html.length; i++) {
        if (html[i] === '\\') { i++; continue; }
        if (html[i] === ch) break;
      }
      continue;
    }
    if (ch === '/' && html[i + 1] === '/') { i = html.indexOf('\n', i); if (i === -1) return null; continue; }
    if (ch === '/' && html[i + 1] === '*') { i = html.indexOf('*/', i) + 1; if (i === 0) return null; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  return null;
}

function countShards(prefix) {
  const dir = path.join(ROOT, 'data');
  const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)\\.json$');
  return fs.readdirSync(dir).filter(function (f) { return re.test(f); }).length;
}

const manifest = readJson('data/timeline.json');
const nodeParts = countShards('timeline.nodes.');
const linkParts = countShards('timeline-links.');

function fakeFetch(url) {
  const nodes = /^data\/timeline\.nodes\.(\d+)\.json$/.exec(url);
  const links = /^data\/timeline-links\.(\d+)\.json$/.exec(url);
  let body;
  if (url === 'data/timeline.json') body = manifest;
  else if (nodes) body = [{ id: 'n' + nodes[1], name: 'Node ' + nodes[1], span: { min: 0, max: 1 } }];
  else if (links) body = [{ a: 'n0', b: 'n' + links[1] }];
  else return Promise.reject(new Error('unexpected fetch ' + url));
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(body); } });
}

async function checkShardLoader(file, fetcherName, loaderName) {
  const html = read(file);
  const fetcher = extractFunction(html, fetcherName);
  const loader = extractFunction(html, loaderName);
  assert(!!fetcher, file + ': ' + fetcherName + '() is defined');
  assert(!!loader, file + ': ' + loaderName + '() is defined');
  if (!fetcher || !loader) return;
  let t;
  try {
    t = await new Function('fetch', fetcher + '\n' + loader + '\nreturn ' + loaderName + '();')(fakeFetch);
  } catch (e) {
    assert(false, file + ': the loader can run', e.message);
    return;
  }
  assert(Array.isArray(t.nodes), file + ': returns a nodes array');
  assert(t.nodes && t.nodes.length === manifest.nodesParts,
    file + ': merges all ' + manifest.nodesParts + ' node shards',
    'got ' + (t.nodes ? t.nodes.length : 'none'));
  assert(t.nodes && t.nodes[0] && t.nodes[0].id === 'n0',
    file + ': keeps shard order (first node n0)', t.nodes && t.nodes[0] && t.nodes[0].id);
  assert(t.nodes && t.nodes[t.nodes.length - 1] && t.nodes[t.nodes.length - 1].id === 'n' + (manifest.nodesParts - 1),
    file + ': keeps shard order (last node n' + (manifest.nodesParts - 1) + ')',
    t.nodes && t.nodes[t.nodes.length - 1] && t.nodes[t.nodes.length - 1].id);
  assert(Array.isArray(t.links) && t.links.length === manifest.linksParts,
    file + ': merges all ' + manifest.linksParts + ' link shards',
    'got ' + (t.links ? t.links.length : 'none'));
}

(async function main() {
  console.log('--- the timeline manifest matches the shards on disk ---');
  assert(manifest.nodesParts > 0, 'manifest declares node shards', String(manifest.nodesParts));
  assert(manifest.linksParts > 0, 'manifest declares link shards', String(manifest.linksParts));
  assert(manifest.nodesParts === nodeParts,
    'every declared node shard exists', manifest.nodesParts + ' declared, ' + nodeParts + ' on disk');
  assert(manifest.linksParts === linkParts,
    'every declared link shard exists', manifest.linksParts + ' declared, ' + linkParts + ' on disk');
  assert(!Array.isArray(manifest.nodes), 'the manifest is sharded, not inline nodes');

  console.log('\n--- map.html and flowchart.html merge every shard ---');
  await checkShardLoader('map.html', 'fetchTimelineJson', 'loadTimelineData');
  await checkShardLoader('flowchart.html', 'fetchJson', 'loadData');

  console.log('\n--- revision.html data store ---');
  const rev = readJson('data/revision-content.json');
  const topics = Object.keys(rev);
  assert(topics.length > 400, 'revision store has topics', String(topics.length));
  const shaped = topics.filter(function (k) {
    const d = rev[k];
    return d && typeof d === 'object' &&
      Array.isArray(d.primaryFacts) && Array.isArray(d.neighbors) &&
      Array.isArray(d.directRelationships) && Array.isArray(d.comparisons);
  });
  assert(shaped.length === topics.length, 'every topic has the arrays revision.html renders',
    (topics.length - shaped.length) + ' malformed');
  assert(rev[topics[0]] && rev[topics[0]].generatedAt, 'topics carry a generatedAt stamp');

  console.log('\n--- knowledge-graph.html data store ---');
  const kg = readJson('data/knowledge-graph.json');
  assert(Array.isArray(kg.nodes) && kg.nodes.length > 1000, 'graph has nodes', String(kg.nodes && kg.nodes.length));
  assert(Array.isArray(kg.links) && kg.links.length > 1000, 'graph has links', String(kg.links && kg.links.length));
  const ids = new Set(kg.nodes.map(function (n) { return n.id; }));
  assert(ids.size === kg.nodes.length, 'node ids are unique', (kg.nodes.length - ids.size) + ' duplicates');
  const dangling = kg.links.filter(function (l) { return !ids.has(l.s) || !ids.has(l.t); });
  assert(dangling.length === 0, 'every link points at a real node', dangling.length + ' dangling');
  const badStarters = (kg.starters || []).filter(function (id) { return !ids.has(id); });
  assert(badStarters.length === 0, 'every starter is a real node', badStarters.join(', '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

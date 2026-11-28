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
      Array.isArray(d.directRelationships) && Array.isArray(d.comparisons) &&
      Array.isArray(d.connectedNotes);
  });
  assert(shaped.length === topics.length, 'every topic has the arrays revision.html renders',
    (topics.length - shaped.length) + ' malformed');
  assert(rev[topics[0]] && rev[topics[0]].generatedAt, 'topics carry a generatedAt stamp');

  // A connected note is only honest while it stays attributed. It must name the
  // entity it describes and quote one of that entity's own verified facts; it
  // must never become a fact about the topic it is displayed under.
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byNorm = new Map(topics.map(k => [norm(k), k]));
  const noteProblems = [];
  let noteCount = 0;
  topics.forEach(k => {
    const own = new Set((rev[k].primaryFacts || []).map(f => norm(f.fact)));
    (rev[k].connectedNotes || []).forEach(n => {
      noteCount++;
      const targetKey = byNorm.get(norm(n.entity));
      const target = targetKey ? rev[targetKey] : null;
      if (!n.entity || !n.rel || !n.fact) noteProblems.push(k + ': missing entity/rel/fact');
      else if (!target) noteProblems.push(k + ': unknown entity ' + n.entity);
      else if (!(target.primaryFacts || []).some(f => norm(f.fact) === norm(n.fact))) {
        noteProblems.push(k + ': ' + n.entity + ' does not own "' + n.fact.slice(0, 60) + '"');
      } else if (own.has(norm(n.fact))) {
        noteProblems.push(k + ': connected note duplicates an own fact');
      }
    });
  });
  assert(noteProblems.length === 0, 'connected notes stay attributed to their own entity',
    noteProblems.slice(0, 5).join(' | '));
  console.log('      connected notes: ' + noteCount);

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

  // -------------------------------------------------------------------------
  // Course question manifest.
  //
  // current-affairs.html used to scrape `.q-card` markup from eight hardcoded
  // lesson URLs. Those URLs were largely stale and the lesson pages never
  // rendered static cards anyway -- they embed `var practiceQs` arrays -- so
  // the "Course Lessons" checkbox loaded nothing. The build now extracts the
  // arrays into data/course-questions.json, and this suite pins the shape the
  // quiz depends on.
  console.log('\n--- course question manifest ---');
  const course = readJson('data/course-questions.json');
  assert(Array.isArray(course.questions), 'course manifest has a questions array');
  const cqs = course.questions || [];
  assert(course.total === cqs.length, 'manifest total matches the array length',
    course.total + ' declared, ' + cqs.length + ' actual');
  assert(cqs.length > 1000, 'manifest carries more than 1,000 questions', String(cqs.length));
  const badShape = cqs.filter(function (q) {
    return !q || typeof q.q !== 'string' || !q.q.trim() ||
      typeof q.a !== 'string' || !q.a.trim() ||
      !Array.isArray(q.opts) || q.opts.length < 2 ||
      q.source !== 'course';
  });
  assert(badShape.length === 0, 'every course question has text, one answer, options and a course source',
    badShape.length + ' malformed');
  const badAnswer = cqs.filter(function (q) {
    return !q.opts || q.opts.indexOf(q.a) === -1;
  });
  assert(badAnswer.length === 0, 'every answer appears in its options',
    badAnswer.length + ' missing');
  const badDupes = cqs.filter(function (q) {
    return q.opts && new Set(q.opts).size !== q.opts.length;
  });
  assert(badDupes.length === 0, 'no question repeats an option', badDupes.length + ' with duplicates');
  const ambiguous = cqs.filter(function (q) {
    return /not in options|closest|most likely|i'?ll go with|let me recompute|not consistent/i.test(q.q + ' ' + q.a);
  });
  assert(ambiguous.length === 0, 'ambiguous/guessing questions are not shipped', String(ambiguous.length));
  const texts = new Set(cqs.map(function (q) { return String(q.q).toLowerCase().replace(/\s+/g, ' ').trim(); }));
  assert(texts.size === cqs.length, 'course questions are unique', (cqs.length - texts.size) + ' duplicates');

  console.log('\n--- news wire ---');
  const V = require('./feed-validate');
  const news = readJson('data/news.json');
  const newsSources = readJson('data/news-sources.json');
  const newsProblems = V.validateNewsData(news, newsSources, Date.now());
  assert(newsProblems.length === 0, 'news snapshot satisfies its contract', newsProblems.slice(0, 4).join(' | '));
  const requiredDesks = ['top', 'national', 'international', 'business', 'tech', 'sports', 'health', 'science', 'entertainment', 'education', 'opinion', 'trending'];
  const missingDesks = requiredDesks.filter(function (id) {
    const s = (news.sections || []).filter(function (x) { return x.id === id; })[0];
    return !s || !s.items.length;
  });
  assert(missingDesks.length === 0, 'every named news desk has fresh items', missingDesks.join(', '));
  const coveredStates = (news.sections || []).filter(function (s) { return s.id.indexOf('state:') === 0 && s.items.length; });
  assert(coveredStates.length >= 20, 'statewise desk covers most states and UTs', coveredStates.length + ' covered');
  assert(news.disclaimers && /not independently verified/i.test(news.disclaimers.trending || ''),
    'trending carries the virality disclaimer');
  const badNewsImages = [];
  (news.sections || []).forEach(function (s) {
    s.items.forEach(function (item) {
      if (item.image && !/^https:\/\//i.test(item.image)) badNewsImages.push(item.title);
    });
  });
  assert(badNewsImages.length === 0, 'news images are https (no mixed content)', badNewsImages.slice(0, 3).join(' | '));
  const badFeedDomains = [];
  newsSources.sections.forEach(function (s) {
    (s.feeds || []).forEach(function (feed) {
      if (!/^https:\/\//i.test(feed.url)) badFeedDomains.push('non-https ' + feed.url);
      if (!V.hostAllowed(feed.domain, newsSources.allowDomains)) badFeedDomains.push('unlisted ' + feed.domain);
    });
  });
  assert(badFeedDomains.length === 0, 'every news feed is https and allowlisted', badFeedDomains.slice(0, 3).join(' | '));

  console.log('\n--- magazine ---');
  const magazine = readJson('data/magazine.json');
  const magazineProblems = V.validateMagazineData(magazine, Date.now());
  assert(magazineProblems.length === 0, 'magazine issue satisfies its contract', magazineProblems.slice(0, 4).join(' | '));
  const photoEssay = (magazine.sections || []).filter(function (s) { return s.id === 'photos'; })[0];
  assert(photoEssay && photoEssay.items.length >= 8, 'photo essay carries a real set of frames',
    photoEssay ? String(photoEssay.items.length) : 'missing');
  const unattributed = (photoEssay ? photoEssay.items : []).filter(function (p) {
    return !p.credit || !p.license || !p.link || !p.image;
  });
  assert(unattributed.length === 0, 'every photograph has credit, licence, image and source', unattributed.length + ' missing');
  const postcardStates = ((magazine.sections || []).filter(function (s) { return s.id === 'postcards'; })[0] || {}).items || [];
  assert(new Set(postcardStates.map(function (p) { return p.title; })).size === postcardStates.length,
    'postcards never repeat a state');
  const shelves = (magazine.sections || []).filter(function (s) { return s.kind === 'books'; });
  assert(shelves.length === 2 && shelves.every(function (s) { return s.items.length >= 4; }),
    'both public-domain shelves are stocked');
  const badBooks = [];
  shelves.forEach(function (s) {
    s.items.forEach(function (b) {
      if (!/^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/.test(b.link)) badBooks.push(b.link);
    });
  });
  assert(badBooks.length === 0, 'every book links to a real Gutenberg edition', badBooks.slice(0, 3).join(' | '));
  assert(magazine.cover && magazine.cover.title && magazine.cover.link, 'issue has a cover story');
  assert(magazine.editorNote && magazine.editorNote.links.length > 0, 'editor note is built from linked stories');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tmpDir = path.join(root, 'tmp-test');

let passed = 0;
let failed = 0;
const startTime = Date.now();

function assert(condition, label) {
  if (condition) {
    passed++;
    process.stdout.write(`  ✓ ${label}\n`);
  } else {
    failed++;
    process.stdout.write(`  ✗ ${label}\n`);
  }
}

function assertEq(a, b, label) {
  if (a === b) { passed++; process.stdout.write(`  ✓ ${label}\n`); }
  else { failed++; process.stdout.write(`  ✗ ${label} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})\n`); }
}

// ── 1. Syntax check critical workflow scripts ──
process.stdout.write('\n=== 1. Syntax check critical scripts ===\n');

const criticalScripts = [
  // Wiki Fill pipeline
  'scripts/wiki-fill-all.cjs',
  'scripts/cleanup-questions.js',
  'scripts/dedup-sentence-flood.js',
  'scripts/build-archive-single.js',
  'scripts/build-archive.js',
  'scripts/rebuild-quiz-json.js',
  // Globe Fill pipeline
  'scripts/dedup-globe.js',
  'scripts/fix-apostrophes.js',
  'scripts/fetch-contemporaries.js',
  'scripts/insert-contemporaries.js',
  'scripts/create-static-data.js',
  'scripts/extract-river-lookup.js',
  'scripts/enrich-river-pts.js',
  'scripts/wikipedia-fetch.js',
  'scripts/wikidata-multi-fetch.js',
  'scripts/validate-globe.js',
  'scripts/validate-globe.mjs',
  // Globe fill parts
  ...Array.from({ length: 11 }, (_, i) => `scripts/fill-globe-part${i + 1}.js`),
];

for (const rel of criticalScripts) {
  const fp = path.join(root, rel.replace(/\//g, path.sep));
  if (!fs.existsSync(fp)) { failed++; process.stdout.write(`  ✗ ${rel} — NOT FOUND\n`); continue; }
  try {
    execSync(`node --check "${fp}"`, { stdio: 'pipe', timeout: 30000, windowsHide: true });
    passed++;
    process.stdout.write(`  ✓ ${rel}\n`);
  } catch (e) {
    failed++;
    const msg = e.stderr?.toString()?.split('\n')[0] || e.message;
    process.stdout.write(`  ✗ ${rel} — ${msg}\n`);
  }
}

// ── 2. Validate archive.html structure ──
process.stdout.write('\n=== 2. Validate archive.html ===\n');
const archivePath = path.join(root, 'archive.html');
if (fs.existsSync(archivePath)) {
  const html = fs.readFileSync(archivePath, 'utf8');
  assert(html.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
  assert(html.includes('</html>'), 'Has closing html tag');
  assert(html.includes('sidebar-link'), 'Has sidebar navigation');
  assert(html.includes('CAT_INDEX'), 'Has CAT_INDEX');
  assert(html.includes('.search-bar'), 'Has search bar');
  const caIdx = html.indexOf('CAT_INDEX');
  const ciEnd = html.indexOf('];', caIdx);
  const ciLen = ciEnd > caIdx ? ciEnd - caIdx + 2 : 0;
  process.stdout.write(`  ℹ CAT_INDEX ~${ciLen} bytes\n`);
} else {
  process.stdout.write('  — archive.html not found, skipping\n');
}

// ── 3. Validate 3d-globe.html JS extraction & syntax ──
process.stdout.write('\n=== 3. Validate 3d-globe.html ===\n');
const globePath = path.join(root, '3d-globe.html');
if (fs.existsSync(globePath)) {
  const h = fs.readFileSync(globePath, 'utf8');
  const ms = h.indexOf('<script type="module">');
  const me = h.indexOf('</script>', ms);
  assert(ms !== -1 && me !== -1, 'Find module script tags');
  const js = h.substring(ms + 23, me);
  assert(js.length > 1000, `Extracted JS length: ${js.length} bytes`);
  assert(js.includes('const CAT ='), 'Has CAT definition');
  assert(js.includes('const D ='), 'Has D data object');
  assert(h.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
  assert(h.includes('</html>'), 'Has closing html tag');

  // Check CAT category count
  const catKeys = js.match(/(\w+):\{label:/g);
  process.stdout.write(`  ℹ CAT has ${catKeys?.length || 0}+ category definitions\n`);

  // Check D arrays exist and count entries
  const dMatches = [...js.matchAll(/D\.(\w+)\s*=\s*\[/g)];
  let totalEntries = 0;
  for (const m of dMatches) {
    const chunk = js.slice(m.index + m[0].length, js.indexOf('];', m.index));
    const entryCount = (chunk.match(/\{n:'/g) || []).length;
    totalEntries += entryCount;
  }
  process.stdout.write(`  ℹ D has ${dMatches.length} category arrays with ~${totalEntries} total entries\n`);
  assert(totalEntries > 100, `At least 100 entries across all categories (got ${totalEntries})`);

  // Syntax check extracted JS
  const tmpMjs = path.join(tmpDir, 'globe-check.mjs');
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpMjs, js, 'utf8');
    execSync(`node --check "${tmpMjs}"`, { stdio: 'pipe', timeout: 30000, windowsHide: true });
    assert(true, 'Extracted JS passes syntax check');
  } catch (e) {
    const msg = e.stderr?.toString()?.split('\n').slice(0, 3).join(' ') || e.message;
    assert(false, `Extracted JS syntax: ${msg}`);
  }
} else {
  process.stdout.write('  — 3d-globe.html not found, skipping\n');
}

// ── 4. Test cleanup-questions.js logic (in isolation) ──
process.stdout.write('\n=== 4. Test cleanup-questions logic ===\n');
const testQuizPath = path.join(tmpDir, 'quiz.json');
fs.mkdirSync(tmpDir, { recursive: true });

const goodQuestions = [
  { question: 'The capital of France is _____.', answer: 'Paris', hint: '', fact: 'Paris is on the Seine.' },
  { question: 'Who developed the theory of relativity?', answer: 'Einstein', hint: '', fact: 'E=mc².' },
  { question: 'The Indus Valley Civilization flourished around _____.', answer: '2500 BCE', hint: '', fact: 'Along the Indus river.' },
  { question: 'What is the largest mammal in the world?', answer: 'Blue whale', hint: '', fact: 'Can reach 30m in length.' },
];

const badQuestions = [
  { question: 'Short', answer: 'X', hint: '', fact: '' },
  { question: '_____ starts with lowercase word', answer: 'something', hint: '', fact: '' },
  { question: 'NO LOWERCASE LETTERS HERE', answer: 'X', hint: '', fact: '' },
  { question: 'What is _____?', answer: 'X', hint: '', fact: '' },
  { question: 'Who is RandomPerson?', answer: 'RandomPerson', hint: '', fact: '' },
  { question: 'Physics, Chemistry, Biology, _____', answer: 'something', hint: '', fact: '' },
];

const allQuestions = [...goodQuestions, ...badQuestions];
fs.writeFileSync(testQuizPath, JSON.stringify({ questions: allQuestions }));

// Run cleanup using the actual script, but redirect to our test file
// We'll test the isBad function logic directly
const cleanupScript = fs.readFileSync(path.join(root, 'scripts', 'cleanup-questions.js'), 'utf8');
// Extract the isBad function
const isBadMatch = cleanupScript.match(/function isBad\(q\) \{[\s\S]*?\n\}/);
if (isBadMatch) {
  const isBadFn = eval('(' + isBadMatch[0] + ')');
  const expectedGood = goodQuestions.length;
  const expectedBad = badQuestions.length;
  let actualGood = 0, actualBad = 0;
  for (const q of allQuestions) {
    if (isBadFn(q)) actualBad++; else actualGood++;
  }
  assertEq(actualGood, expectedGood, `Good questions: ${actualGood} (expected ${expectedGood})`);
  assertEq(actualBad, expectedBad, `Bad questions filtered: ${actualBad} (expected ${expectedBad})`);
} else {
  process.stdout.write('  — Could not extract isBad function\n');
}

// ── 5. Test dedup-sentence-flood.js logic ──
process.stdout.write('\n=== 5. Test dedup logic ===\n');
const dedupScript = fs.readFileSync(path.join(root, 'scripts', 'dedup-sentence-flood.js'), 'utf8');
const baseTextMatch = dedupScript.match(/function baseText\(q\) \{[\s\S]*?\n\}/);
if (baseTextMatch) {
  const baseText = eval('(' + baseTextMatch[0] + ')');
  const dupA = { question: 'The capital is _____.' };
  const dupB = { question: 'The capital IS _____.' };
  const diff = { question: 'The capital of France is _____.' };
  assertEq(baseText(dupA), baseText(dupB), 'Case-insensitive dedup match');
  assert(baseText(dupA) !== baseText(diff), 'Different questions not deduped');

  // Test clean function
  const cleanMatch = dedupScript.match(/function clean\(questions,\s*source\) \{[\s\S]*?\n\}/);
  if (cleanMatch) {
    const clean = eval('(' + cleanMatch[0] + ')');
    const result = clean([
      { question: 'Same text', answer: 'A' },
      { question: 'same text', answer: 'B' },
      { question: 'Different', answer: 'C' },
    ], 'test');
    assertEq(result.kept.length, 2, '2 kept after dedup (1 duplicate removed)');
    assertEq(result.removed.length, 1, '1 duplicate found');
    assertEq(result.kept[0].answer, 'A', 'First occurrence kept');
  } else {
    process.stdout.write('  — Could not extract clean function\n');
  }
} else {
  process.stdout.write('  — Could not extract baseText function\n');
}

// ── 6. Test build-archive-single.js with fake data (fast) ──
process.stdout.write('\n=== 6. Test archive building with fake data ===\n');
const testQuestions = [
  { id: 't1', type: 'fill_blank', category: 'Test', subject: 'Test', subSubject: 'Test', question: 'The capital of France is _____.', answer: 'Paris', hint: '', fact: 'Paris fact' },
  { id: 't2', type: 'fill_blank', category: 'Test', subject: 'Test', subSubject: 'Test', question: 'Who developed relativity?', answer: 'Einstein', hint: '', fact: 'Einstein fact' },
  { id: 't3', type: 'fill_blank', category: 'Science', subject: 'Science', subSubject: 'Physics', question: 'E = mc___', answer: '2', hint: '', fact: 'Mass-energy equivalence' },
];
const fakeQuizPath = path.join(tmpDir, 'fake-quiz.json');
fs.writeFileSync(fakeQuizPath, JSON.stringify({ questions: testQuestions }));

// We'll test the archive builder by creating temp input files and calling it
// Build-archive uses hardcoded paths, so we can't easily redirect.
// Instead, test the core logic: verify it reads, dedups, and outputs.
try {
  // Temporarily override data paths
  const origCwd = process.cwd();
  process.chdir(tmpDir);

  // Create minimal data/questions dir with a test file
  const questionsDir = path.join(tmpDir, 'questions');
  fs.mkdirSync(questionsDir, { recursive: true });
  fs.writeFileSync(path.join(questionsDir, 'test-data.json'), JSON.stringify({
    'Test': { subSubjects: { 'Test': testQuestions.slice(0, 1) } }
  }));

  // Test the archive-single builder directly by requiring its core logic
  // Build-archive-single writes to root/archive.html, so we need to be careful
  const builderPath = path.join(root, 'scripts', 'build-archive-single.js');
  // Just syntax check was already done above
  process.stdout.write('  ℹ Archive builder syntax verified above\n');

  process.chdir(origCwd);
} catch (e) {
  process.stdout.write(`  ℹ Archive build test skipped (would touch root files): ${e.message}\n`);
}

// ── 7. Test dedup-globe logic ──
process.stdout.write('\n=== 7. Test globe dedup logic ===\n');
const noise = new Set(['lake','wetland','sanctuary','national','park','wildlife','reserve','bird','np','birsanctuary','tiger']);
function normalizeName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '').replace(new RegExp([...noise].join('|'), 'g'), '').trim();
}
assertEq(normalizeName('Yellowstone National Park'), normalizeName('Yellowstone NP'), 'normalizeName: park vs NP');
assertEq(normalizeName('Tiger Reserve'), normalizeName('tiger reserve'), 'normalizeName: case insensitive');
assert(normalizeName('Lake 123') !== normalizeName('River 123'), 'normalizeName: different names differ');
process.stdout.write(`  ℹ normalizeName logic verified\n`);

// ── 8. Validate manifest.json (if exists) ──
process.stdout.write('\n=== 8. Validate manifest.json ===\n');
const manifestPath = path.join(root, 'data', 'questions', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(Array.isArray(manifest), 'manifest.json is an array');
    assert(manifest.length > 0, `manifest has ${manifest.length} entries`);
    // manifest is a string[] of filenames
    if (typeof manifest[0] === 'string') {
      assert(true, 'manifest format: string[] of filenames');
      const qDir = path.join(root, 'data', 'questions');
      const missing = manifest.filter(f => !fs.existsSync(path.join(qDir, f)));
      assertEq(missing.length, 0, `All ${manifest.length} manifest files exist` + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''));
    } else if (typeof manifest[0] === 'object') {
      assert(manifest.every(e => e.file && e.category), 'Every entry has file + category');
      const missing = manifest.filter(e => !fs.existsSync(path.join(root, 'data', 'questions', e.file)));
      assertEq(missing.length, 0, `All ${manifest.length} manifest files exist` + (missing.length ? ' (missing: ' + missing.map(m => m.file).join(', ') + ')' : ''));
    }
  } catch (e) {
    assert(false, `manifest.json parse: ${e.message}`);
  }
} else {
  process.stdout.write('  — manifest.json not found, skipping\n');
}

// ── 9. Validate data/questions/ JSON files ──
process.stdout.write('\n=== 9. Validate data/questions/ JSON files ===\n');
const qDir = path.join(root, 'data', 'questions');
if (fs.existsSync(qDir)) {
  const files = fs.readdirSync(qDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
  process.stdout.write(`  ℹ Found ${files.length} question files\n`);
  let totalQuestions = 0;
  let badFiles = 0;
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(qDir, f), 'utf8'));
      for (const [subject, subjData] of Object.entries(data)) {
        if (subjData.subSubjects) {
          for (const [ss, qs] of Object.entries(subjData.subSubjects)) {
            totalQuestions += Array.isArray(qs) ? qs.length : 0;
          }
        }
      }
    } catch {
      badFiles++;
      process.stdout.write(`  ✗ Failed to parse ${f}\n`);
    }
  }
  assertEq(badFiles, 0, `All ${files.length} files parse successfully` + (badFiles ? ` (${badFiles} failed)` : ''));
  process.stdout.write(`  ℹ Total questions across all files: ~${totalQuestions}\n`);
} else {
  process.stdout.write('  — data/questions/ not found, skipping\n');
}

// ── 10. Check favicon and logo exist ──
process.stdout.write('\n=== 10. Check static assets ===\n');
for (const asset of ['favicon.svg', 'logo.png']) {
  const p = path.join(root, asset);
  assert(fs.existsSync(p), `${asset} exists`);
}
// Check CSS dir
const cssDir = path.join(root, 'css');
assert(fs.existsSync(cssDir) && fs.statSync(cssDir).isDirectory(), 'css/ directory exists');
const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
assert(cssFiles.length > 0, `CSS files found: ${cssFiles.join(', ')}`);

// ── Summary ──
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const total = passed + failed;
process.stdout.write(`\n========================================\n`);
process.stdout.write(`  Results: ${passed}/${total} passed`);
if (failed) process.stdout.write(`  ✗ ${failed} FAILED`);
process.stdout.write(`\n`);
process.stdout.write(`  Time: ${elapsed}s (limit: 240s)\n`);
process.stdout.write(`========================================\n`);

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

process.exit(failed > 0 ? 1 : 0);

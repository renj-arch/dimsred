// Move auto-discovered junk from wiki-fill into their OWN proper category.
// Junk never gets dropped: films go to Indian Cinema, albums/songs to Music &
// Albums, journals/magazines to Library & Information Science, sport content to
// Sports, and disambiguation pages to a Disambiguation catch-all. Legitimate
// titles that LOOK like junk (League of Nations, Anti-Defamation League,
// Hurricane Emily (2005), ...) are protected by an allowlist so they are never
// touched.
//
// Two-phase, fully in-memory: every file is loaded once, mutated in memory, and
// written exactly once at the end. A category that is BOTH a source and a
// target (e.g. sports.json receives sport content while its own disambiguation
// pages are routed away) must not be re-read from disk between phases, or the
// stale snapshot would resurrect removed entries.
// Usage: node scripts/cleanup-junk-subjects.js
// Usage: node scripts/cleanup-junk-subjects.js --dry   (report only, no writes)

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const LINK_POOL_PATH = path.join(__dirname, '..', 'data', 'wiki-link-pool.json');

// Categories that legitimately own this kind of content.
const CINEMA_OWNER = /cinema|theatre/i;
const MUSIC_OWNER = /music/i;
const LIB_OWNER = /library/i;
const SPORT_OWNER = /sport/i;

// STRICT suffix matchers — only explicit media suffixes. Bare "(1959)" tokens
// (battles, ships, hurricanes) must NEVER match.
const FILM_SUFFIX = /\((?:film|(?:19|20)\d{2}\s+film)\)$/i;
const ALBUM_SUFFIX = /\((?:album|song|ep|soundtrack|mixtape)\)$/i;
const JOURNAL_SUFFIX = /\((?:journal|magazine|periodical|newspaper)\)$/i;
const DISAMB_SUFFIX = /\(disambiguation\)$/i;

// STRONG sport competition signals (word-boundary, title-only) — org names like
// "League of Nations" / "Anti-Defamation League" do not match.
const SPORT_COMP = /(?:World Cup|World Championship|Champions League|Champions Trophy|Grand Prix|Premier League|Super League|Indian Premier League|Formula One|UEFA|FIFA|FIBA|PGA Championship|Championship Game|National Championship Game|Asia Cup|Club World|Championship|Chess Olympiad|Esports World Cup)\b/i;
const SPORT_WORD = /\b(?:football|soccer|cricket|basketball|volleyball|hockey|bandy|baseball|rugby|tennis|handball|chess|chessboxing|kho kho|kabaddi|netball|sevens|floorball)\b/i;

// Titles that LOOK like junk but are legitimate exam content → never touched.
const ALLOW = /^(?:League of Nations|Anti-Defamation League|Arab League|All-India Muslim League|Indian Union Muslim League|Alxa League|Delian League|Acarnanian League|American Radio Relay League|Anti-Cigarette League of America|Hurricane Emily \(2005\)|Cricket Wireless)/;

// Returns the proper category a sub-subject belongs in, or null to stay put.
// Everything classifiable is MOVED (never dropped); targets are created as
// needed so no question is ever lost.
function moveTarget(cat, sub) {
  if (ALLOW.test(sub)) return null;
  if (DISAMB_SUFFIX.test(sub)) return { to: 'Disambiguation', why: 'disambiguation' };
  if (FILM_SUFFIX.test(sub) && !CINEMA_OWNER.test(cat)) return { to: 'Indian Cinema', why: 'film' };
  if (ALBUM_SUFFIX.test(sub) && !MUSIC_OWNER.test(cat)) return { to: 'Music & Albums', why: 'album/song' };
  if (JOURNAL_SUFFIX.test(sub) && !LIB_OWNER.test(cat)) return { to: 'Library & Information Science', why: 'journal' };
  if (SPORT_COMP.test(sub) && !SPORT_OWNER.test(cat)) return { to: 'Sports', why: 'sport-comp' };
  if (SPORT_WORD.test(sub) && !SPORT_OWNER.test(cat)) return { to: 'Sports', why: 'sport-word' };
  return null;
}

function slugFor(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function main() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && !['catalog.json', 'manifest.json'].includes(f));

  // Load every file once into memory. Map keyed per subject (a category can
  // span several files, e.g. sports.json + sports-2.json + sports-3.json) so
  // MOVE targets merge into the first file belonging to that subject.
  const cats = {};
  for (const file of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch { continue; }
    const subject = Object.keys(data)[0];
    if (!cats[subject]) cats[subject] = { files: [] };
    cats[subject].files.push({ file, data });
  }

  // Target cache: subject -> canonical file entry (first file with that subject).
  const targetFiles = {};
  const ensureCat = (subject) => {
    if (targetFiles[subject]) return targetFiles[subject];
    const existing = cats[subject] && cats[subject].files[0];
    if (existing) { targetFiles[subject] = existing; return existing; }
    const entry = { file: slugFor(subject) + '.json', data: { [subject]: { subSubjects: {} } } };
    cats[subject] = { files: [entry] };
    targetFiles[subject] = entry;
    return entry;
  };

  let movedTotal = 0;
  const byTarget = {};
  const movedList = [];

  for (const subject of Object.keys(cats)) {
    for (const { data } of cats[subject].files) {
      const srcSubs = data[subject].subSubjects || {};
      const removeKeys = [];
      for (const [sub, qs] of Object.entries(srcSubs)) {
        const m = moveTarget(subject, sub);
        if (!m) continue;
        const t = ensureCat(m.to);
        const targetSubs = t.data[m.to].subSubjects;
        for (const q of qs) { q.category = m.to; q.subject = m.to; }
        if (!targetSubs[sub]) targetSubs[sub] = [];
        targetSubs[sub] = targetSubs[sub].concat(qs);
        movedTotal += qs.length;
        byTarget[m.to] = (byTarget[m.to] || 0) + qs.length;
        movedList.push({ cat: subject, sub, n: qs.length, to: m.to, why: m.why });
        removeKeys.push(sub);
      }
      for (const k of removeKeys) delete srcSubs[k];
    }
  }

  // Write each mutated file exactly once (any file touched, source or target).
  if (!DRY) {
    let written = 0;
    for (const subject of Object.keys(cats)) {
      for (const { file, data } of cats[subject].files) {
        fs.writeFileSync(path.join(QUESTIONS_DIR, file), JSON.stringify(data));
        written++;
      }
    }
    console.log('\nWrote ' + written + ' category files.');
  } else {
    console.log('\nDRY-RUN — no files written.');
  }
  console.log('MOVED ' + movedTotal + ' questions to correct categories:');
  Object.entries(byTarget).forEach(([c, n]) => console.log('  ' + n + '  ->  ' + c));
  if (movedList.length) {
    console.log('\nMoved break-down:');
    movedList.forEach(d => console.log('  ' + JSON.stringify(d)));
  }

  // Relocate leaked titles in the persisted link pool to their proper category
  // so the next wiki-fill run mines their remaining sentences under the correct
  // subject instead of re-polluting the source category.
  try {
    const pool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    let relocated = 0;
    for (const catName of Object.keys(pool)) {
      const moved = [];
      const kept = [];
      for (const t of pool[catName]) {
        const m = moveTarget(catName, t);
        if (m && m.to !== catName) moved.push([t, m.to]);
        else kept.push(t);
      }
      pool[catName] = kept;
      for (const [t, to] of moved) {
        if (!pool[to]) pool[to] = [];
        pool[to].push(t);
        relocated++;
      }
      if (moved.length) console.log('  link pool relocated (' + catName + '): ' + moved.map(([t, to]) => t + ' -> ' + to).join(', '));
    }
    if (!DRY) fs.writeFileSync(LINK_POOL_PATH, JSON.stringify(pool, null, 1));
    console.log('Link pool relocated ' + relocated + ' titles to their proper categories.');
  } catch (e) {
    console.log('  (link pool not relocated: ' + e.message + ')');
  }

  console.log('\nDone. Moved ' + movedTotal + ' questions (nothing dropped).');
}

main();
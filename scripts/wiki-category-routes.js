// Wikipedia-category → subject routing table.
//
// Wikipedia's own category indexes are ground truth for where an article
// belongs (e.g. "Category:American jazz record labels" on Atlantic Records,
// "Category:Universities UK" on University College London). Title-signature
// classifiers mislabel some of these (Cricket Wireless looks like sport but is
// a telecom MVNO; Ayodhya Airport is an Indian airport, not a foreign one).
//
// This module maps an article's CATEGORY list (from prop=categories) to one of
// our question subjects. Used both at ingest (wiki-fill-all.cjs routes a
// freshly-fetched article by its categories) and by the cleanup mover (routes
// already-fetched junk sub-subjects by looking up their categories).
//
// Rules are checked in order. Each rule:
//   - test:  RegExp tested against every category title of the article.
//   - to:    subject to route to.
//   - why:   reason string for reports/logs.
//   - owner: optional RegExp against the SOURCE subject — when it matches, the
//     content already lives in a category that owns that type, so it is never
//     routed away (e.g. a record label already under Music & Albums stays).

const IN = /(?:\bindia\b|indian|bharat|of india|in india)|\b(?:andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orissa|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|delhi|jammu|kashmir|ladakh|puducherry|chandigarh|andaman|nicobar|lakshadweep|dadra|daman|diu)\b/i;

const ROUTES = [
  // ── Religion/movement leaks (Bahá'í Faith pages under Courts etc.) ──
  {
    name: 'baha-faith',
    test: /bahá|baha['"’ʼ]?i/i,
    to: 'World History',
    why: 'baha-faith (category)',
    owner: /world history|world religion/i,
  },
  // ── Record labels + discographies → Music & Albums ──
  {
    name: 'record-label',
    test: /record\s+labels?|discograph/i,
    to: 'Music & Albums',
    why: 'record-label (category)',
    owner: /music/i,
  },
  // ── Airports: India → Indian Aviation & Shipping, world → World Geography ──
  {
    name: 'airport-india',
    test: /airport/i,
    indian: IN,
    to: 'Indian Aviation & Shipping',
    why: 'airport in India (category)',
    owner: /aviation/i,
  },
  {
    name: 'airport-world',
    test: /airport/i,
    to: 'World Geography',
    why: 'airport (category)',
    owner: /aviation|geography/i,
  },
  // ── Universities: India → Education in India, world → World Geography ──
  // Bare "college" is intentionally NOT a signal — "College football" is a
  // sport, not an institution; real colleges live under "Universities and
  // colleges in X" categories which carry the word "universit*".
  {
    name: 'university-india',
    test: /universit|institute of technology|educational institutions/i,
    indian: IN,
    to: 'Education in India',
    why: 'university in India (category)',
    owner: /education/i,
  },
  {
    name: 'university-world',
    test: /universit|institute of technology|educational institutions/i,
    to: 'World Geography',
    why: 'university (category)',
    owner: /education|geography/i,
  },
  // ── National/state parks & trails: India → Environment, world → World Geography ──
  {
    name: 'park-india',
    test: /national\s+parks?|state\s+parks?|hiking\s+trails?|long-distance\s+trails?|protected\s+areas?|scenic\s+areas?|wilderness\s+areas?|wildlife\s+sanctuaries?/i,
    indian: IN,
    to: 'Environment & Ecology',
    why: 'park/trail in India (category)',
    owner: /environment|wildlife/i,
  },
  {
    name: 'park-world',
    test: /national\s+parks?|state\s+parks?|hiking\s+trails?|long-distance\s+trails?|protected\s+areas?|scenic\s+areas?|wilderness\s+areas?/i,
    to: 'World Geography',
    why: 'park/trail (category)',
    owner: /environment|wildlife|geography/i,
  },
  // ── Olympics / sport competitions → Sports ──
  {
    name: 'olympic',
    test: /olympic/i,
    to: 'Sports',
    why: 'olympic (category)',
    owner: /sport/i,
  },
  {
    name: 'sport-comp',
    test: /world\s+cup|world\s+championship|champions\s+league|champions\s+trophy|grand\s+prix|premier\s+league|super\s+league|formula\s+one|sports\s+competitions?|sporting\s+events?/i,
    to: 'Sports',
    why: 'sport competition (category)',
    owner: /sport/i,
  },
  // ── Quarantine (put aside, never dropped, never mixed into real subjects) ──
  // Cross-category wiki spillover that has no real subject home in our data:
  // video-game years, television years, numerology/numbers, drug & cannabis
  // culture. These get routed (and at ingest, written) into the dedicated
  // "Junk" subject file so they never pollute the graded categories.
  {
    name: 'video-games-junk',
    test: /video\s+games?\s+by\s+year|video\s+games?\s+by\s+decade|\d{3,4}s?\s+in\s+video\s+gam/i,
    to: 'Junk',
    why: 'video game years (put aside)',
    owner: /computer|\bit\b|tech/i,
  },
  {
    name: 'television-by-year-junk',
    test: /television\s+by\s+year|\d{3,4}s?\s+in\s+(?:[a-z-]+\s+)*television/i,
    to: 'Junk',
    why: 'television by year (put aside)',
    owner: /media|\btv\b|cinema|theatre/i,
  },
  {
    name: 'number-junk',
    test: /integers|\d+\s*\(number\)|numerology|millennia/i,
    to: 'Junk',
    why: 'number/millennium (put aside)',
    owner: /mathematics|statistics/i,
  },
  {
    name: 'drug-cannabis-junk',
    test: /cannabis|designer\s+drugs|psychedelic\s+phenethylamines|nbome|entactogens|entheogens|recreational\s+drugs|drug\s+(?:culture|laws?|policy|reform|parties?|act\b)/i,
    to: 'Junk',
    why: 'drug/cannabis (put aside)',
    owner: /health|medicine|drug/i,
  },
];

// Route an article by its Wikipedia category titles. `sourceCat` is the subject
// it was discovered/fetched under; if that subject owns the content type the
// article stays put. Returns { to, why } or null.
function routeByCategories(categories, sourceCat) {
  if (!categories || !categories.length) return null;
  for (const r of ROUTES) {
    if (r.owner && sourceCat && r.owner.test(sourceCat)) continue;
    // India-split rules (airport-india, university-india, park-india) fire when
    // the article has a matching category AND any category mentions India (the
    // two signals often live on different categories — e.g. a university page
    // has both "Category:Universities in Delhi" and "Category:State universities
    // in Delhi"). Without an India signal, the matching non-India rule (checked
    // next) sends it to the world-flavoured target.
    if (r.indian) {
      const hasSignal = categories.some(c => r.test.test(c));
      const isIndian = categories.some(c => r.indian.test(c));
      const hit = hasSignal && isIndian ? categories.find(c => r.test.test(c) || r.indian.test(c)) : null;
      if (hit) return { to: r.to, why: r.why };
      continue;
    }
    const hit = categories.find(c => r.test.test(c));
    if (!hit) continue;
    return { to: r.to, why: r.why };
  }
  return null;
}

module.exports = { ROUTES, routeByCategories, OWNERS: null };

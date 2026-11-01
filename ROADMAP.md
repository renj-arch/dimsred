# Vlymbooq Product Roadmap

## Mission
Transform vlymbooq into a genuinely useful, innovative and technically sophisticated education platform.

## Feature Registry

| ID | Feature | Status | Priority |
|----|---------|--------|----------|
| F001 | Study Progress Tracker | Done | High |
| F002 | Knowledge Graph Explorer | Done | High |
| F003 | Adaptive Learning Engine | Done | High |
| F004 | Examination Intelligence | Planned | Medium |
| F005 | Research Discovery System | Done | High |
| F006 | Site Integrity Audit | Done | High |

## Phase 1: Study Progress Tracker (Current)

### Problem
Users have no way to track their study progress across the platform's hundreds of pages. There's no visibility into what's been covered, what's remaining, or what to study next.

### Solution
A localStorage-based progress tracking system that:
- Records page visits automatically
- Shows a visual progress dashboard
- Recommends next topics based on gaps
- Works offline (no backend required)
- Integrates into every page via a small script

### Implementation
- `js/progress-tracker.js` — core tracking module
- `progress.html` — dedicated progress dashboard
- Integration into `dashboard.html`

## Phase 2: Knowledge Graph Explorer (Done)

### Problem
Topics are siloed across subjects. Users can't see how concepts connect.

### Solution
Interactive graph explorer over the Ask index's co-mention relation.

### Implementation
- `scripts/build-knowledge-graph.js` — reads `data/ask-index.json` + node shards, emits
  `data/knowledge-graph.json` (2,292 nodes, 40,167 deduplicated links, ~1.5 MB).
- `knowledge-graph.html` — vanilla SVG explorer: search, radial neighbourhood,
  click-to-recentre, breadcrumb history, type filter, pointer-drag pan, mobile panel.
- Colours and filters use `type` (concept/person/event/org/place), not the source
  `cat` field, which is too noisy to present as a subject label.
- Wired into `build-timeline.yml` (rebuild + commit) and `generate-sitemap.js`.

## Phase 3: Adaptive Learning Engine (Done)

### Problem
No personalized recommendations based on performance.

### Solution
A plan computed from the practice results the site already stores, with no
server, no new tracking, and no generated content.

### Implementation
- `js/adaptive-engine.js` — pure logic:
  - merges `microtest_results` (exam + topic) with `studypro_results` (paper
    level only; papers have no section breakdown, so they never claim a topic)
  - mastery = Laplace-smoothed accuracy x a 30-day recency half-life (floored)
  - review intervals grow with accuracy and repeat attempts (2-42 days)
  - `buildPlan()` ranks weak topics, then overdue reviews, then unstarted
    topics; every action deep-links to `micro-test.html?exam=&topic=&n=`
- `adaptive.html` — plan, per-exam mastery bars, and mistakes-by-section.
- `js/micro-test.js` — honours the deep link and selects the nearest offered
  question count.
- `scripts/lib/adaptive-engine.test.js` — 42 assertions (`npm run test-adaptive`).

## Phase 4: Examination Intelligence (Planned)

### Problem
No mock exam analytics or error pattern analysis.

### Solution
Mock exam simulator with detailed analytics and error pattern detection.

## Phase 5: Research Discovery System (Done)

### Problem
No way to search across facts, sources, and current affairs. `search.html` only
covered static pages; the 2,292 linked corpus topics behind the knowledge graph
were invisible to it.

### Solution
Unified discovery across the page index and the corpus topic graph.

### Implementation
- `scripts/build-knowledge-graph.js` now also writes `data/topic-search.json`
  (2,292 topics, ~520 KB, descriptions clipped to 140 chars) and keeps each
  node's source `sid` so results can deep-link.
- `search.html` lazy-loads that file on the first query and renders a "Corpus
  topics" group above page results. Each topic opens
  `map.html#id=<encoded source id>`, which the map already resolves.
- Search failures degrade silently: page results still render if the topic file
  is unavailable.
- `scripts/lib/topic-search.test.js` pins the data contract and the page script
  parse (`npm run test-topic-search`).

## Phase 6: Site-wide Integrity Audit (Done)

### Problem
Failures that a Windows working copy hides were reaching production: 88 HTML
files committed as git tree listings, hundreds of broken internal links,
duplicate ids, inline scripts that no longer parsed, missing metadata, and
content corrupted by PDF extraction and lossy encoding. Content corruption is
especially dangerous here because a wrong symbol silently changes an answer.

### Solution
A tracked-file auditor that runs before deploy, plus deterministic repairs
driven by scans of the deployed tree rather than by hand-editing pages.

### Implementation
- `scripts/audit-site.js` audits the files Git tracks (what actually deploys),
  not the working tree, so sparse/partial clones do not produce false 404s.
  It checks broken and case-mismatched internal links, directory URLs without
  `index.html`, duplicate ids, inline and external classic script parse errors,
  title/description/viewport, image alt text, U+FFFD replacement characters,
  mixed superscript/ASCII exponents, and UTF-16 data assets.
- Script tags are preserved by the markup mask, so `<script src>` is now
  link-checked and parsed. That caught `ldc/papers/practice-set-06.html`
  loading `../../js/main.js`, which does not exist; it now uses its exam's
  `../js/main.js` like every sibling paper.
- Six SSC JE banks (`js/ssc-je-extra*.js`, `mechanical`, `thermo-fluids`) were
  stored as UTF-16LE with a BOM. They are now UTF-8, syntax-checked, and
  guarded by the external-script parse check.
- `scripts/lib/audit-site.test.js` runs the real CLI against a throwaway git
  repo with one page per failure class (39 assertions, `npm run test-audit`).
- Content repairs, all scanned and diff-reviewed:
  - restored 88 pages that were committed as tree listings;
  - reversed CP1252-to-UTF-8 mojibake including C1 control bytes, preserving
    genuine operators such as `Â` in quantum mechanics;
  - repaired the corpus lists as well as the pages: `topics.txt` (83,655
    double-encoded lines) and `wiki_coverage.txt` now carry real accents, and
    the `expand-content` LCM template no longer emits `2_*3` corruption;
  - repaired lossy `?`/`×`/`v`/`p`/`O`/`_` substitutions contextually, never by
    blanket replacement, so legitimate series placeholders, percentages,
    cross products and chemical formulae stay intact;
  - regenerated all 26 JEE Maths chapter pages from the repaired generator
    instead of editing derived HTML;
  - fixed shared course-practice data at the source and propagated it to the
    26 generated lesson pages, including a wrong answer key (80013: 40 m).

### Result
`npm run audit-site` reports 1,244 HTML pages with zero findings across every
hard-failure class.

### Known defects (explicitly accepted for now)
These pages contain PDF-extraction or generated-content corruption that cannot
be reconstructed from the repository. They are not silently passed: a rewrite
is required, and the audit does not claim they are clean.
- `cgl/papers/13-sep-2025-s2.html` - lost fraction bars and operators.
- `cgl/papers/12-sep-2025-s3.html` - lost fraction bars and operators.
- `cgl/course/reasoning/lesson-coding-decoding.html` - rambling generated
  reasoning rather than a worked solution.
- `cgl/course/reasoning/lesson-analogy.html` - same, plus `?` placeholders in
  worked steps.

The sitemap is generated in CI because a partial clone cannot enumerate every
deployed URL locally.

## Progress Log

- 2026-10-31: Created roadmap and feature registry
- 2026-10-31: Started Phase 1 implementation
- 2026-10-31: Completed Phase 1 — Study Progress Tracker
  - Created `js/progress-tracker.js` (localStorage-based, offline-capable)
  - Created `progress.html` (dedicated progress dashboard)
  - Integrated tracker into `index.html` and `dashboard.html`
  - Added navigation links to progress page
  - Follow-up fixes caught by `scripts/lib/progress-tracker.test.js`:
    - Visit is now recorded synchronously, so the dashboard shows today's page
      on first paint instead of 0.
    - Directory URLs (`/cgl/`, `/rbi/`) keyed as `index.html` and collapsed into
      one page; now keyed by site-relative path.
    - Subject registry rewritten from one table; removed the dead `/lda/` target
      and the wrong `/ssc-je/` directory (`ssc-je.html` is a page).
    - Recommendations are links with a real destination, not inert text.
    - Dashboard/Progress excluded from "subjects explored".
    - Monotonic visit sequence makes "recent pages" deterministic on tied
      timestamps.
  - Added `npm run test-progress` (18 assertions).
- 2026-10-31: Completed Phase 2 — Knowledge Graph Explorer
  - Created `scripts/build-knowledge-graph.js` and `data/knowledge-graph.json`
  - Created `knowledge-graph.html` (search, radial neighbourhood, pan, type filter)
  - Hooked graph rebuild into `build-timeline.yml`
  - Added both new pages to the sitemap generator (CI regenerates the full sitemap)
- 2026-10-31: Completed Phase 3 — Adaptive Learning Engine
  - Created `js/adaptive-engine.js` and `adaptive.html`
  - Added micro-test deep links (`?exam=&topic=&n=`) so plan actions start a test
  - Paper results stay exam-level; only micro-tests carry topic attribution
  - Added `npm run test-adaptive` (42 assertions)
- 2026-10-31: Completed Phase 5 — Unified corpus search
  - `build-knowledge-graph.js` also emits `data/topic-search.json`
  - `search.html` shows corpus topics and deep-links them into the map
  - Added `npm run test-topic-search` (13 assertions)
- 2026-11-01: Completed Phase 6 — Site-wide integrity audit
  - Added `npm run audit-site` over the tracked deploy tree, with external
    script parsing and lossy-content checks; current run is 0 findings
  - Added `npm run test-audit` (39 assertions, one fixture per failure class)
  - Repaired 88 tree-listing pages, mojibake across 99 pages plus both corpus
    lists, lossy math in 25+ papers and lessons, all 26 generated JEE Maths
    chapters, the shared course-practice bank and its generator templates
  - Recorded four known-bad pages as rewrite targets instead of masking them
- 2026-11-01: Quiz exam-scope ground check (replaces blind "High relevance")
  - Added `js/exam-scope.js`: a deterministic, auditable exam-specific vs
    out-of-exam classifier. Explicit `examScope`/`relevance` metadata wins;
    otherwise a specific syllabus anchor (grounded in `data/upsc-topics.json`
    and `data/pyq-patterns.json`) is required. Broad subject words alone no
    longer stamp an item "high"; biographies, foreign legal trivia and
    off-syllabus material are out or review, each with explicit reasons.
  - Wired `ExamScope.annotate()` into both archive loaders in
    `current-affairs.html` and into `_renderRelevanceTag` / the relevance
    filter so missing tiers default to `low`, never `medium`.
  - Added `scripts/lib/exam-scope.test.js` (32 assertions, `npm run
    test-exam-scope`) covering the reported Addison Brown bar-exam item
    (out/low), a Fundamental Rights item (exam/high), and the off-syllabus
    guard (cricket/film are out).
  - `npm run audit-site` reports 1,244 HTML pages with zero findings; all test
    suites pass (audit 39, ui 15, data 27, quiz-handlers 21, exam-scope 32).
- 2026-11-01: Film source gate for bengal-famine-1943
  - Expanded `data/film-slate.json` bengal-famine-1943 sources from 2 to 5
    (added Winston Churchill, British India, World War II), satisfying the
    authoring gate of at least five readable sources (`scripts/film/author.js`,
    `scripts/film/research.js`). research.js confirms 5/5 readable, 0 failed;
    author.js passes the source-count gate (full authoring/render requires
    LM_MODEL, which runs in GitHub Actions).

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

# Vlymbooq Product Roadmap

## Mission
Transform vlymbooq into a genuinely useful, innovative and technically sophisticated education platform.

## Feature Registry

| ID | Feature | Status | Priority |
|----|---------|--------|----------|
| F001 | Study Progress Tracker | Done | High |
| F002 | Knowledge Graph Explorer | Done | High |
| F003 | Adaptive Learning Engine | Planned | Medium |
| F004 | Examination Intelligence | Planned | Medium |
| F005 | Research Discovery System | Planned | Medium |

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

## Phase 3: Adaptive Learning Engine (Planned)

### Problem
No personalized recommendations based on performance.

### Solution
Track quiz scores per topic, identify weak areas, generate revision paths.

## Phase 4: Examination Intelligence (Planned)

### Problem
No mock exam analytics or error pattern analysis.

### Solution
Mock exam simulator with detailed analytics and error pattern detection.

## Phase 5: Research Discovery System (Planned)

### Problem
No way to search across facts, sources, and current affairs.

### Solution
Unified search across all content types with provenance links.

## Progress Log

- 2026-10-31: Created roadmap and feature registry
- 2026-10-31: Started Phase 1 implementation
- 2026-10-31: Completed Phase 1 — Study Progress Tracker
  - Created `js/progress-tracker.js` (localStorage-based, offline-capable)
  - Created `progress.html` (dedicated progress dashboard)
  - Integrated tracker into `index.html` and `dashboard.html`
  - Added navigation links to progress page
- 2026-10-31: Completed Phase 2 — Knowledge Graph Explorer
  - Created `scripts/build-knowledge-graph.js` and `data/knowledge-graph.json`
  - Created `knowledge-graph.html` (search, radial neighbourhood, pan, type filter)
  - Hooked graph rebuild into `build-timeline.yml`
  - Added both new pages to the sitemap generator (CI regenerates the full sitemap)

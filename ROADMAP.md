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

## Phase 2: Knowledge Graph Explorer (Superseded)

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
- **Superseded:** `knowledge-graph.html` was removed because it duplicated
  `flowchart.html` with a weaker graph and two pages drifted apart. The build
  script and `data/knowledge-graph.json` remain only until the last
  `search.html` consumer moves to `data/topic-search.json`; `flowchart.html` is
  the single visualization page.

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

## Phase 7: Verified flowchart and course-question data (Done)

### Problem
`flowchart.html` lost the opening `<script>` of its main block and the closing
`</script>` at EOF, so ~1,800 lines of JavaScript rendered as page text and the
graph never initialised. A literal `}););` also broke the inline script. The
relationship dialog could never open: an inline `display:none` outranked the
`.on` class, and the code called `.forEach()` on the string values stored in
`ADJ`/`CADJ`. Single click and double click fought over the same card.

Separately, "Course Lessons" in the current-affairs quiz scraped `.q-card`
markup from eight hardcoded lesson URLs. Those pages do not render questions as
static cards (they embed `var practiceQs` arrays), five of the URLs did not
exist, and `_generateStaticQuestions()` checked an empty pool before its async
course XHR completed. The content-source checkboxes also mapped course
questions to Generators first because they carry `_wikiCat='course-lesson'`.

### Implementation
- Restored both inline script tags, fixed the syntax error, and added a
  regression check that parses every inline block and asserts public handlers
  are declared at brace depth 0 (parsing alone misses the swallowed-function
  class of bug).
- Removed the inline `display:none`; the base `.rel-dialog` rule hides the
  dialog and `.rel-dialog.on` shows it. Relationship rendering now normalises
  strings, arrays and objects, deduplicates ADJ/CADJ pairs, and names the
  authored branch an item belongs to.
- Single click opens the relationship dialog after a 220 ms deferral; a
  double click cancels it and opens the full note, so the overlay cannot eat
  the second click.
- Rebuilt the search datalist on every index rebuild instead of appending the
  same 6,000 options again.
- Added `scripts/build-course-questions.js`, which extracts all 290 lesson
  `practiceQs` banks (10,450 raw questions) and applies deterministic gates:
  one correct option, non-empty text/options, no duplicate options, no
  ambiguous "not in options"/"closest"/"most likely" solutions, and one copy of
  each question. It writes `data/course-questions.json` (1,363 questions,
  ~402 KB).
- `_loadCourseStaticQuestions()` now fetches that one manifest with a hard
  timeout and one callback; `_generateStaticQuestions(done)` waits for it.
- `_passesContentFilter()` resolves each question to exactly one source
  (PIB/CA, Course, Archive, Generators) before reading the checkbox, so the
  four toggles are independent.

### Verification
- jsdom sweep renders all 566 topic trees (including 32 authored mind-trees)
  with 0 crashes; all 32 authored trees open the relationship dialog with
  non-empty content, and single/double click behaviour is asserted.
- `site-data` 35 assertions, `site-ui` 43, `exam-scope` 32, `quiz-handlers` 21;
  `audit-site` reports 0 findings.

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
- 2026-11-01: Flowchart repaired and DOM-tested
  - Restored the missing opening/closing `<script>` tags and removed the
    `}););` syntax error; the page no longer renders JavaScript as text.
  - Fixed the relationship dialog (`display` precedence, ADJ/CADJ string
    normalisation, authored-branch context, dedupe) and separated single-click
    (dialog) from double-click (note).
  - Added a jsdom sweep: 566 trees render with 0 crashes; 32 authored trees
    pass 130 click/dialog/lane assertions. `site-ui` adds 43 assertions.
- 2026-11-01: Course question manifest and source filters
  - `scripts/build-course-questions.js` extracts 10,450 raw MCQs from 290
    lesson banks and ships 1,363 unique, quality-gated questions in
    `data/course-questions.json`.
  - `current-affairs.html` loads the one manifest, waits for it before showing
    Static GK, and maps each question to exactly one content-source checkbox.
  - `site-data` now pins the manifest contract (35 assertions total).
- 2026-11-01: Revision panel and wiki-fill pipeline
  - `data/revision-content.json` is generated from the authored mind-trees and
    shown by the flowchart Revision panel instead of the weaker raw note.
  - `daily-wiki-fill.yml` splits git operations out of the matrix job and caps
    `max-parallel` at 8; the expander is resumable and no longer races the
    finalize commit.
  - Removed `knowledge-graph.html` and its navigation links; `flowchart.html`
    is the single visualization page.
- 2026-11-01: Mains coverage rebuilt around a shared planner
  - Added `scripts/lib/mains-plan.js`: the least-covered paper (GS1-GS4, Essay,
    Optional I/II, Indian Language, English) and least-covered optional subject
    are chosen deterministically before the model is called. The prompt states
    the paper, marks, subject and language as fixed facts, and the shape gate
    rejects a reply that drifts to another paper, subject or script.
  - `scripts/site-agent.js` now writes a batch (default 3, cap 90) per heavy
    run and dedupes against the reviewed bank and the live pool; the
    owner-runner lane (`on-demand-generate.js`) uses the same planner, and
    promotion preserves `subject`, `lang` and `task`.
  - `data/mains-questions.json` now has 19 hand-authored items covering all
    nine papers, with `kind`, `guide` and `optionalSubjects` metadata. Every
    item passes `scripts/lib/mains-quality.js`; the old weak GS4 essay item was
    supplied with named values and the short essay was brought over its floor.
  - `data/mains-fresh.json` was pruned from 36 GS3-only items to 12
    quality-passing, non-duplicate items, with coverage and prune metadata so
    the Agent Chain refills the pool. The new batch then rotates across papers.
  - `mains.html` adds an optional-subject selector, a per-paper syllabus guide
    (including the optional subject map), honest empty states, a fresh-batch
    coverage line, and target-aware prompts. Generated replies are never
    relabelled: an unknown paper, wrong paper, wrong subject or wrong language
    is rejected instead of being shown as the selected paper.
  - Added `npm run test-mains` (174 assertions) covering rotation, target
    enforcement, optional/language validation, duplicate suppression, the
    authored-bank quality floor, the fresh-pool contract and a DOM test of the
    page's chips, subject filter, guide, generation guard and fresh coverage.
- 2026-11-02: Map timeframe and zoom responsiveness
  - `map.html` no longer re-filters and re-places all 557k timeline nodes on
    every scroll tick. `render()` caches the placed rows in `_LAYOUT` and
    `emitViewport()` binary-searches the sorted rows and writes only the
    visible window (plus a 1,400 px buffer). The scroll handler debounces
    `emitViewport()`, never `render()`.
  - `scrollToPresent()` suppresses the scroll event its own assignment fires,
    so zoom/focus jumps do not queue a second layout. `zoomBy()` labels the
    window it is entering instead of the one it is leaving.
  - The timeframe dialog paints a loading state first and appends 250 cards per
    click (`TF_CHUNK`); full history is ~483k dated topics, so a single
    `innerHTML` was freezing the page. Markdown export is capped at 2,000 rows
    and says so, instead of silently truncating or hanging.
- 2026-11-02: Curated question-category moves
  - `data/category-moves.json` is the reviewable registry. Each move names the
    source category, target category, source/target shard files and literal
    evidence that must appear in the moved questions. A missing target category,
    a changed shard, a subtopic collision or unmatched evidence fails closed.
  - `scripts/lib/question-category-moves.js` validates and applies a whole
    subtopic, clears stale `relevance`/`examScope` tags so `ExamScope` recomputes
    from the corrected subject, and patches the matching timeline node. The
    first move corrects ARP4761 from `Indian Languages` to
    `Indian Aviation & Shipping` (16 questions) and drops the bogus year 1309
    parsed from `14 CFR 25.1309`.
  - `scripts/apply-question-category-moves.js` runs as a gate in
    `.github/workflows/question-quality.yml`; `site-agent.js` also exposes a
    `QuestionCats` rule lane. `current-affairs.html` applies the same registry at
    display time so the 1-hour raw-GitHub shard cache cannot keep showing the
    old label. `npm run test-category-moves` covers validation, evidence,
    collisions, idempotence and the timeline patch.
- 2026-11-02: Mains fresh-pool prune
  - Removed four weak/duplicate items that blocked the deploy gate
    (`ci-mvxnrfok`, `ci-mvy1er0x`, `ci-mvy2fhd6`, `ci-mvy63b6a`) and kept the
    three newer items that had landed on `main` (GS1, GS2, GS4). The pool is 15
    items, all passing `scripts/lib/mains-quality.js` and the duplicate check;
    the reviewed bank remains 19 items across all nine papers. GS3 still
    dominates at 12, so the next `MainsFresh` run targets the empty papers
    (Essay, Optional I/II, languages) first.
- 2026-11-02: Mind-tree authoring by the scheduled agent
  - `flowchart.html` draws only hand-authored trees. Entries with `_gen:true`
    (currently 534 of 566) are skipped at load; the earlier co-mention buckets
    were duplicates, not explanations, and are no longer presented as answers.
  - `agentGraphNotes` in `scripts/site-agent.js` upgrades one `_gen` tree per
    rotating run: deterministic junk is removed first, then the model writes a
    card description, a specific how-it-relates note and a typed verb. `_gen` is
    dropped only when every remaining card has a real note and no junk remains,
    which promotes that tree to authored authority. This is genuine authoring,
    not relabelling: a tree with any bad note stays skipped.
  - `scripts/merge-mindtree-proposals.js` is the batch path. It merges only
    proposals marked `_agent:true` and `_verified:true`, refuses to change any
    other top-level entry, and validates the new file before swapping it in.
  - So yes, the scheduled agent can author the remaining trees itself, but at
    one tree per GraphNotes turn plus model/QC limits. It will take many runs;
    it never invents a relationship to make a tree look complete.
- 2026-11-01: Film author pipeline
  - `bengal-famine-1943` now has five readable sources; modelling moved from
    the 35B model (download failed at ~84%) to Qwen2.5-7B Q5_K_M with retries.
  - S02 passes the five-line gate; S04 still fails the strict ledger audit on
    the 7B CPU runner, so the film stays unpublished until QC passes. This is
    fail-closed, not a relaxed gate.
 - 2026-11-02: Invented-quiz revalidation and publish gates
   - data/invented/questions.json revalidated item by item: 153 -> 76
     verified items; 77 quarantined with recorded reasons in
     data/invented/quarantine.json; 14 unambiguous repairs applied by
     scripts/apply-invented-quarantine.js (idempotent, --check mode).
   - scripts/lib/invented-quality.js deterministically re-derives what it
     can (linear equations, series, answer-echo, leak/evasion, letter-only
     options) and never guesses at what it cannot (percentage chains, labels);
     scripts/lib/invented-quality.test.js pins 15 regressions.
   - scripts/revalidate-invented.js is the publish gate in
     invent-questions.yml / invent-27b.yml (publish no longer runs on
     if: always()), scripts/invent-questions.js rejects candidates through
     uditQuestion at generation time, and scripts/union-invented.js skips
     quarantined ids so remote snapshots cannot resurrect them.
 - 2026-11-02: Agent-solved official PYQ lane (paper-solve)
   - Where the official answer key is a scanned PDF with no text layer (e.g.
     CSP-2023 AnsKey-CSP-2023-Paper-I-090524.pdf), the key ingestor cannot
     parse answers. New lane .github/workflows/paper-solve.yml runs
     scripts/solve-paper-agent.py: it downloads the OFFICIAL question paper
     from data/official-paper-sources.json (status eed-solve), parses
     questions with the ingestor proven QP parser, and has the local model
     solve them in batches of 5, saving candidates incrementally.
   - scripts/apply-paper-solve.js is the fail-closed gate: every candidate
     goes through uditQuestion, the key must be one of the four options,
     and only clean items merge into data/papers.json labelled
     source: agent-solved, official: false,
     erification: agent-solved-unverified. The publish step is skipped
     when the gate fails. papers.html shows an amber agent-solved badge
     instead of the green official one, and per-question fallbacks say
     Agent answer, not Official answer.
 - 2026-11-02: Wiki Fill restructured to 10 chunks, one wave, ~10 h hard ceiling
   - Was 27 chunks at max-parallel 8 = four sequential waves x up to 300 min
     self-stop each — worst case ~20 h per run. Now 10 chunks at max-parallel 10
     run as a SINGLE wave: fill lands in ~4-6 h typical. Job caps sum to a hard
     ceiling: setup 20 + wiki-chunks 300 (step 280, TIME_BUDGET 240) + merge 45
     + archive 90 + finalize 85 = 540 min ~ 9 h. Chunk input validated 1-10;
     merge/recovery loops already tolerate any chunk count (seq 1 40 sweep).
   - Resume is persisted, not re-scanned: the per-article sentence cursor
     (wikiMinedTo in the shards) lets a partial article continue past consumed
     sentences; wikiDone marks exhausted/barren articles so they are never
     re-fetched; data/wiki-link-pool.json and data/wiki-category-members.json
     persist link + category discovery; pushQ plus the Bloom dedup keys make
     re-minted questions yield 0 new. Network only goes to un-mined content;
     the remaining per-run cost is a local baseline scan, not fetching.
 - 2026-11-02: Improvement pass (owner-approved proposals from the lane)
   - improve.html fault board now has severity triage: chips (critical/warn/
     ideas/info) filter the list and info items are hidden by default, so the
     23 criticals and 44 warns are not buried under 14 info status lines
     (implements the repeated "Improve Fault Board Triage for Info Items" proposal).
   - Proposal lane deduped two ways: proposal-lane.js now drops a new proposal
     when its title is token-Jaccard >= 0.7 similar to an existing one (the model
     kept re-raising "tutor lane parsing" / "auto-resolve faults" in different
     words; 36 kept proposals group into 29 distinct ideas), and improve.html
     groups near-duplicates at render time with a "raised xN" badge, newest
     wording wins, groups sorted by frequency then recency.

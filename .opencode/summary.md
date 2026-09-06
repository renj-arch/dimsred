## Goal
Build and maintain a GK current-affairs archive with 3-level hover-driven tree navigation (Category → Subject → SubSubject) and live quiz, auto-filtered for exam-relevant questions from curated sources.

## Constraints & Preferences
- No copyright/attribution displayed — PIB/RBI/FAO/ISRO/MEA/SEBI/SC are safe (govt/public domain); GoogleNews removed entirely; WIKI avoided due to rate limiting & quality
- Keep only exam-related news — no trash (daily market data, routine RBI reports, appeal numbers, generic fill-ins, placeholder answers)
- Questions must have valid specific answers — no "Various X", "Varies", "Recent reforms", always-True patterns
- Dark theme, no login, vanilla JS/frontend
- Left sidebar tree with hover drill-down: hover category → show subjects, hover subject → show subSubjects, hover subSubject → show questions; click fallback for mobile
- Source labels removed from archive explanations
- "Even minute topic" required for History — taxonomy must be exhaustive

## Progress
### Done
- Fixed regex syntax errors: unescaped `/` in North-East pattern, corrupted Contemporary India (2000s–) pattern replaced from 20KB to clean non-capturing regex
- Added **World History** category to SUB_TAX with 35 subSubjects
- Expanded **International Relations** from 5→25 subSubjects, **Polity** from 7→23, **Sports** from 5→18
- Restored truncated build-archive.js (~200 missing lines re-appended, duplicate renderQuestion removed)
- `node scripts/build-archive.js` now runs cleanly: 226 questions, 26 categories

### In Progress
- Hover-driven sidebar tree navigation working in generated output
- World History / expanded IR/Polity/Sports keyword patterns added but have 0 questions — need data

### Blocked
- None currently

## Key Decisions
- Hover-driven navigation (mouseenter) over click-only; click retained as mobile fallback
- subSubject taxonomy in build script with keyword regex — no `subSubject` field in source data
- Safe IDs for sidebar third-level (`ss_{idx}_{sanitized}`) to avoid `getElementById` mismatch
- GoogleNews removed entirely (copyright risk, trivial fill-ins)
- Source label removed from explanations
- History taxonomy exhaustive (70+ subSubjects) even when 0 questions

## Next Steps
- Generate or fetch data for World History / expanded IR/Polity/Sports to fill empty buckets
- Map `World: *` categories → SUB_TAX keys in build pipeline
- Fill empty subSubject buckets with targeted questions

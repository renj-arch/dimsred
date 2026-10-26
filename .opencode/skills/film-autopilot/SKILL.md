---
name: Film Autopilot
description: End-to-end autonomous production and publication for vlymbooq films. Use when selecting the next topic, writing or repairing a sourced storyboard, directing plates and edit grammar, dispatching draft or final renders on GitHub Actions, running QC, publishing the release and site, or updating the slate.
---

# Film Autopilot

This skill is the operating loop for taking a vlymbooq film from slate to a
verified live page. It assumes a capable agent is the director, not a render
operator. The pipeline is deliberately fail-closed.

## 0. Resolve the worktrees

Read `references/worktrees.md`. Then run:

```bash
git worktree list
git -C <film-worktree> status --short --branch
git -C <publish-worktree> status --short --branch
```

Use the current branch and commit. Do not assume a Temp path still exists. Do
not use an old `out/ci-*` folder as evidence for a new run.

Clear dead proxy variables before `git`/`gh` on the owner's Windows machine:

```powershell
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY -ErrorAction SilentlyContinue
```

## 1. Choose the next film

Read `data/film-slate.json` in the film worktree. The slate is agent-owned.

- Prefer the highest-priority topic with `status: "ready"` that has a validated
  storyboard and debate map.
- If none is ready, take the highest-priority `research` topic and author it.
- Do not render from a topic name alone.
- Do not wait for the owner to choose.

Recommended order after Bhopal: `emergency-1975`, then
`bengal-famine-1943`.

When a film is released, update its slate entry with:

```json
{
  "status": "published",
  "published": "YYYY-MM-DD",
  "film": "film.html?film=<id>",
  "production": "<id>-production.html"
}
```

Use `published` in the slate; use "Released" in the visible UI label.

## 2. Source-lock the film

Load the `film-source-lock` skill. Do not write a line of narration before the
fact ledger exists. The minimum deliverables are:

- `data/films/<id>.json` with schema `vlymbooq.film.v1`;
- `data/films/<id>-debates.json` with schema `vlymbooq.debates.v1`;
- a source list with stable ids and HTTP(S) URLs;
- every narration line pointing at a known source id;
- every shot with `visual`, `camera`, `plate`, `render`, `sfx`, and a transition
  object with a one-sentence reason.

Validate before spending a render:

```bash
node scripts/film/validate-film.js data/films/<id>.json
node scripts/film/validate-debates.js data/films/<id>-debates.json
node --check js/film.js
```

## 3. Direct the film

Read `docs/film-editing.md` in the film worktree before authoring the edit.

Every film needs:

- a distinct grammar tied to its subject, not a template;
- 3-6 signature moves, each used sparingly;
- motivated transitions with a reason and a sound bridge;
- hard cuts as the default;
- no default crossfade, no dip-to-black inside the film;
- no transition type more than twice in one film;
- 20-24 distinct procedural plates, not one plate relabelled;
- most shots 2-4 seconds; no shot parked after the narration has stopped;
- burned-in captions that are readable on a phone.

The Bhopal grammar is mechanical causality: needle match, valve iris, number
smash, water/flame match, gas haze, siren whip, paper edge. Do not reuse it for
the next film. Use the Emergency grammar (print and broadcast) or the Bengal
grammar (supply chain) from `docs/film-editing.md`.

## 4. Build plates on CI

Add or repair the procedural scene source:

```text
scripts/film/blender/<id>_scenes.py
scripts/film/render-plates.js
```

Use the cheap plate preview before a full draft:

```bash
gh workflow run plate-test.yml --ref film-ci \
  -f film=<id> -f width=960 -f height=540 -f samples=12
gh run list --workflow plate-test.yml --branch film-ci --limit 1
gh run download <run-id> -n plates-<id> -D out/plates-preview
```

Inspect every PNG at full size. Reject black, empty, flat, blocked, toy-like,
cropped, duplicated, or factually misleading plates. Fix the procedural source,
not the PNG. Do not run the full render until the plates pass.

## 5. Draft on GitHub Actions

Dispatch on the `film-ci` branch. Never render a master locally.

```bash
gh workflow run film.yml --ref film-ci \
  -f film=<id> -f quality=draft -f release=false
gh run list --workflow film.yml --branch film-ci --limit 1
gh run watch <run-id> --exit-status
gh run download <run-id> -n film-<id>-draft -D out/ci-<run-id>
```

The draft is 1280x720, 24 fps, CRF 20. The workflow uploads:

- `<id>-draft.mp4`
- `<id>.srt`
- `<id>-thumb.jpg`
- `metadata.json`, `youtube.md`, `script.md`
- `timeline.json`, `edit-manifest.json`, `edit-qc.json`, `map.json`
- `plates/*.png`

Load the `film-qc` skill and launch the `film-qc` subagent. Do not publish a
draft. The earlier Bhopal draft `40312489624` is rejected: scene-lead title
flashes, banded title-card glow, and over-compression at CRF 22.

If the draft fails, fix the cause and re-run. Do not hide a weak plate with a
transition.

## 6. Final master and release

Preferred order (do not publish before QC):

```bash
gh workflow run film.yml --ref film-ci \
  -f film=<id> -f quality=final -f release=false
gh run watch <run-id> --exit-status
gh run download <run-id> -n film-<id>-final -D out/ci-<run-id>
```

Run the independent QC. The final must be 1920x1080, 24 fps, H.264/AAC stereo,
about the storyboard duration, with no decode errors, captions intact, true
peak no higher than -0.5 dBFS, and a clean poster.

After PASS, create the GitHub release from the approved artifact:

```bash
gh release create film-<id>-final-<run-number> \
  --prerelease \
  --title "<id> - final - run <run-number>" \
  --notes-file out/ci-<run-id>/youtube.md \
  out/ci-<run-id>/<id>-master.mp4 \
  out/ci-<run-id>/<id>.srt \
  out/ci-<run-id>/<id>-thumb.jpg \
  out/ci-<run-id>/metadata.json \
  out/ci-<run-id>/youtube.md \
  out/ci-<run-id>/script.md \
  out/ci-<run-id>/timeline.json \
  out/ci-<run-id>/edit-manifest.json \
  out/ci-<run-id>/edit-qc.json \
  out/ci-<run-id>/map.json
```

If the workflow was dispatched with `release=true`, treat the release as
unaccepted until the same QC passes; delete the prerelease if it fails. Never
publish a master that has not been watched and measured.

The 1080 master is release-only. It must not be uploaded to Cloudflare Pages.

## 7. Publish the site

Load the `film-publish` skill and launch the `film-publisher` subagent.

At minimum:

- copy the 720 MP4 to `media/films/<id>/preview.mp4`;
- copy the approved poster to `media/films/<id>/poster.jpg`;
- regenerate `current-01..06.jpg` and contact sheets from the clean artifact;
- update `data/films/<id>.json` poster fields;
- reconcile `data/films/<id>-production.json`;
- update `films.html`, `film.html`/`js/film.js`, `production.html`, and
  `<id>-production.html`;
- replace every "Chromium captures" claim with "Skia canvas";
- keep each Pages asset under 25 MiB;
- deploy with the local Wrangler OAuth flow:

```bash
npx wrangler pages deploy . --project-name=studypro --branch=live
```

Verify these live routes return 200 and show the film:

```text
/films
/film.html?film=<id>
/debates.html?film=<id>
/<id>-production.html
/data/films/<id>.json
/media/films/<id>/preview.mp4
```

## 8. Update evidence and hand off

The production record must include:

- the exact run ids, including rejected cuts;
- the actual duration, not the target;
- 9 scenes / 37 shots / 27 hard cuts / 10 authored transitions when those are
  the real counts;
- the limiter value and the measured AAC true peak;
- the 720 preview size and the 1080 release location;
- the plate count and the contact sheet;
- the failed-cut reasons;
- the sources and the debate link.

YouTube upload stays manual. Hand the owner the MP4, SRT, thumbnail, chapters,
sources, and `youtube.md`. Do not claim a public YouTube URL.

## Hard stops

Stop and fix before continuing if any of these is true:

- validator fails;
- a plate is black, blocked, duplicated, or misleading;
- a scene lead flashes a title card;
- the MP4 does not decode cleanly;
- audio clips, drops out, or is missing;
- a caption collides with a transition or covers the subject;
- the poster is blank or unreadable;
- a transition has no reason or no sound bridge;
- the 720 preview exceeds 25 MiB;
- a live URL 404s.

A successful workflow is not a finished film.

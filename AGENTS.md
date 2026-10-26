# Agent guide — vlymbooq

This repository builds a free study site and a small documentary-film studio.
The owner should not have to run a render, upload a file or babysit a queue.

## Non-negotiables

- **No paid API keys.** Narration, 3D plates, motion graphics and encoding run
  on GitHub Actions. Never move a render to the owner's machine.
- **No invented facts.** Every narration line in a film must carry a source id.
  A topic without a sourced storyboard is a research task, not a render.
- **Fail loudly.** A missing plate, a broken caption, a silent audio track or a
  black frame is a defect. Do not paper over it with filler.
- **No graphic reconstruction.** Jallianwala is told through objects, light and
  evidence. Do not generate bodies, blood or a staged killing.
- **Mains stay unreviewed until promoted.** Film work must not silently change
  the reviewed question banks.
- **Owner approval for proposals.** Direct defect fixes are allowed; editorial
  changes to the public argument map should remain reviewable.

## Where the film lives

| File | Role |
| --- | --- |
| `data/films/<id>.json` | sourced storyboard: scenes, shots, narration, camera, sound |
| `data/films/<id>-debates.json` | sourced political argument map |
| `scripts/film/blender/<id>_scenes.py` | procedural Blender plates |
| `scripts/film/render-plates.js` | plate-name → Blender scene mapping |
| `js/film.js`, `film.html` | deterministic timeline and motion layers |
| `scripts/film/build-film.js` | Piper, Skia canvas compositor, ffmpeg, SRT, metadata |
| `.github/workflows/film.yml` | full draft/final render |
| `.github/workflows/plate-test.yml` | cheap stills-only preview |
| `.github/workflows/film-autopilot.yml` | scheduled selector; dispatches only ready films |
| `scripts/film/autopilot.js` | slate validation and dispatch |
| `data/film-slate.json` | agent-owned topic slate |
| `docs/film-runbook.md` | exact operating loop and acceptance gates |
| `docs/film-editing.md` | transition vocabulary, per-film edit grammar and edit QC gate |

## The production loop

1. Validate: `node scripts/film/validate-film.js data/films/<id>.json`
   and `node scripts/film/validate-debates.js data/films/<id>-debates.json`.
2. Preview plates on CI with `plate-test.yml`; download the artifact. **Look at
   every plate at full size.** Do not judge a new run from an old artifact.
3. Fix the scene source, not the PNG. Re-run only the cheap plate preview.
4. Author the per-film edit grammar in `docs/film-editing.md` before the
   draft: 3-6 signature transitions, a reason for each, and sound bridges.
5. Render a draft with `film.yml`; inspect the MP4, captions, audio and every
   transition at 24 fps. A generic transition is a defect.
6. Render the final 1080p/24fps master; verify the file specs and watch it.
7. Publish deliberately: final MP4/SRT/thumbnail, manifest entry, gallery still
   and status, then verify the live routes.

The exact commands, quality rubric and publishing checklist are in
`docs/film-runbook.md`.

## Autopilot

- `node scripts/film/autopilot.js --json` chooses the next topic.
- `--dispatch` renders only a `ready` topic with both a validated storyboard and
  a validated debate map.
- `--require-ready` fails when there is nothing ready, which is the correct
  behaviour for a scheduled run.

The autopilot deliberately does **not** write a script from a topic name. The
free CI model is a 9B model; it is not good enough for a 10/10 sourced essay and
it must not invent quotations or casualty figures.

## Honest autonomy boundary

Production is automated. Creative authorship is not fully automated with zero
paid keys. A capable agent can research, write, direct, inspect renders, fix the
scene code and publish — but it needs a capable model and a vision pass. If the
goal is a fully unattended editorial writer, either provide a model budget or
accept a lower quality ceiling. Do not pretend the 9B CI model clears that bar.

## Environment note (owner's Windows machine)

`gh` and `git` may inherit a dead proxy at `127.0.0.1:8080`. For network
commands, clear `HTTP_PROXY`, `HTTPS_PROXY` and `ALL_PROXY` first. Never commit
tokens or local paths.

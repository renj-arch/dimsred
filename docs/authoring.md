# Authoring a film without a person

Render, QC, release and publishing are wired. Authoring is now a pass too:
`scripts/film/author.js` turns a fetched corpus into a storyboard that the
existing gate accepts, and `scripts/film/blender/stock_sets.py` gives that
storyboard real sets to render. `.github/workflows/author.yml` runs the whole
thing on a free runner and commits the result.

## What exists

| stage | script | state |
| --- | --- | --- |
| fetch the slate's sources into a corpus | `scripts/film/research.js` | done |
| pick a topic from free RSS, gate the title | `scripts/film/news.js`, `title.js` | done |
| cut a verified ledger from the corpus | `scripts/film/author.js` | done |
| write narration from ledger rows | `scripts/film/author.js` + `llama.js` | done |
| assemble scenes, shots and cuts on the voice | `scripts/film/author.js` | done |
| write shots for one scene | `scripts/film/local-model.js` | done, proven on a free runner |
| stock 3D sets for an authored film | `scripts/film/blender/stock_sets.py` | done |
| validate before an expensive render | `validate-film.js`, `validate-debates.js` | done |
| render, QC, release, publish | `film.yml` | done |

## The pass

```
corpus.json ──► ledger.json ──► narration (lines + row ids) ──► sets spec ──► plates
                    │                    │                             │
             verbatim sentences   number check + gate         stock_sets.py
```

### 1. Ledger (deterministic, no model)

For each source in `corpus.json`, `author.js` splits the fetched text into
sentences and keeps those with a digit (55–260 characters, de-duplicated, at
most 40 per source). Each row records `{id, source, sourceTitle, url, text}`.
The text is verbatim, so the fact a line rests on can be read without trusting
the model. The ledger is written to `data/films/<id>-ledger.json` as evidence.

### 2. Narration (local model, one call per scene)

The model is given 14 ledger rows per scene, chosen by the scene's job
(`the object`, `the order`, `the machine`, `the turn`, `the cost`,
`the argument`, `the record`, `the return`). It returns exactly five lines,
each naming one row:

```json
{"lines":[{"row":"L07","text":"..."}]}
```

The audit is stricter than the shot audit:

- the row must exist in the ledger;
- the line must be 7–22 words, no second person, no hedges;
- every number in the line must occur in the row's text;
- no line may repeat an earlier line.

A failed answer is sent back once with the exact failures named. A second
failure stops the authoring run. Nothing is silently dropped.

The prompt lives in `narrationPrompt()` in `author.js`; the llama.cpp
invocation and its flat-prompt fallback live in `llama.js`. The model is
Qwen3.6-35B-A3B, pinned by commit and sha256 in `author.yml`.

### 3. Assembly (deterministic)

`author.js` builds the eight scenes with five lines each, then places one shot
on each line with `narrationLine`. No shot carries a duration: `build-film.js`
cuts on the voice, so a slower TTS voice lengthens the scene instead of
desynchronising it. The title shot and the final flame carry exact holds.

The edit grammar is chosen from the topic text (paper-ledger,
mechanical-causality, night-watch). It supplies the signature moves, the
transition vocabulary, the forbidden defaults and the palette. The model never
chooses a cut.

### 4. Sets

`stock_sets.py` exposes eight dressed archetypes:

| archetype | covers |
| --- | --- |
| `wall_surface` | a notice wall, a register, a censored page |
| `paper_desk` | a ledger, a report, a newspaper on a desk |
| `room_interior` | a room with one chair, one lamp, one window |
| `corridor` | a concrete corridor with doors and slits of light |
| `exterior_night` | a wet street, a lamp, shuttered fronts |
| `gate` | a barred gate, a lock, a wall in the rain |
| `plinth_object` | one object on a plinth: register, paper, notice, lamp, jar |
| `flame_source` | a flame behind glass in a cold room |

A film supplies `data/films/<id>-sets.json`, written by the author:

```json
{
  "film": "emergency-1975",
  "script": "stock_sets.py",
  "palette": { "paper": "#e6dcc4", "ink": "#0b0a08", "sodium": "#ffb24d", "accent": "#a8342a" },
  "plates": {
    "wall-01": { "scene": "wall_surface", "archetype": "wall", "params": { "seed": 17, "dressing": 0 } }
  }
}
```

`render-plates.js` prefers a hand-written `_scenes.py`, falls back to the sets
map, and fails if a plate has neither. Every plate is deterministic from its
`seed`, so a re-render is the same image.

### 5. Dispatch

```
author.yml ──► data/films/<id>.json + sets + ledger + slate (committed)
     │
     └─ gate passes ──► film.yml (quality=final, release=true, publish=true)
```

`author.yml` is manual while the writer is being exercised. Once its output has
been read once, the weekly autopilot should pick a `research` topic, run the
author, and dispatch the render only when the storyboard validates. A topic
that fails the ledger audit stays `research`; it does not render.

## What still needs a person

- Reading a new storyboard once before its first render. The gate checks that
  facts are sourced, not that the film is good.
- The YouTube upload. The release carries MP4, SRT and thumbnail.
- A stock set that looks wrong on the first plate. Fix the archetype, not the
  film's JSON.

## What not to do

- Do not let the model write Blender Python directly. Primitives are the API;
  free-form Python is unreviewable and fails as a black frame.
- Do not let the model write a duration or a transition. Those are the parts
  that make the film feel authored rather than generated.
- Do not fold a new film into an existing `_scenes.py` to save work.
- Do not mark a topic `ready` because the words look plausible. Validation is
  the shape gate; the ledger audit is the fact gate.

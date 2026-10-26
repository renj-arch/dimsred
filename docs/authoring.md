# Authoring a film without a person

Render, QC, release and publishing are wired. Authoring is not: a new topic still
needs narration, a shot list, and about twenty Blender scenes written by hand.
This note is the contract for closing that, so the next step is a build rather
than an argument.

## What exists

| stage | script | state |
| --- | --- | --- |
| fetch the slate's sources into a corpus | `scripts/film/research.js` | done |
| pick a topic from free RSS, gate the title | `scripts/film/news.js`, `title.js` | done |
| write shots for one scene | `scripts/film/local-model.js` | done, proven on a free runner |
| validate storyboard and debate map | `validate-film.js`, `validate-debates.js` | done |
| render, QC, release, publish | `film.yml` | done |

Missing: every narration line must quote a fetched source verbatim, every shot
must name a plate, and every plate must exist in Blender. Nothing currently
produces the last two from a corpus.

## The pass to build

```
corpus.json ──► ledger.json ──► narration (lines + source ids) ──► sets spec ──► plates
                    │                    │                             │
             verified quotes      validate-film.js              generic_sets.py
```

### 1. Ledger (deterministic, no model)

For each source in `corpus.json`, split into sentences, keep those with a date,
a number, or a named actor, and record `{id, sourceId, quote, sha}`. The quote is
a substring of the fetched text, so it can be checked by `indexOf` later. A line
that cannot be traced to a ledger row cannot ship.

### 2. Narration (local model, one call per scene)

Input: the ledger rows for that scene, the film's argument, and the scene's job
(opening, mechanism, turn, consequence). Output: 3-6 lines, each under 18 words,
each with `sourceId` and the supporting `quote` copied from the ledger. The
audit that exists for shots applies unchanged: a line whose quote is not in the
corpus, or whose number is not in the quote, fails.

### 3. Sets (the real gap)

Today each film carries its own `scripts/film/blender/<slug>_scenes.py` with
~20 `scene_*` functions, built on the shared primitives in `salt_scenes.py`
(`cube`, `cylinder`, `plane`, `area`, `dark_world`, `smooth`, ...) and
`jallianwala_scenes.py` (`paper_material`, `flame`, `text_obj`, `render`).

The generic library should expose archetypes, not scenes:

| archetype | parameters | covers |
| --- | --- | --- |
| `plinth_object` | shape, material, scale, light, camera distance | a valve, a gauge, a jar, a watch |
| `wall_surface` | material, marks, key light, tilt | a notice, a memorial wall, a gate |
| `room_interior` | floor, wall, furniture, window light | a courtroom, a newsroom, a corridor |
| `exterior_night` | skyline silhouette, lamps, haze | a street, a plant, a rooftop |
| `paper_desk` | page count, ink, lamp angle | a ledger, a newspaper, a report |
| `flame_source` | size, colour, reflection | a flare, a candle, a memorial |

A film then supplies `data/films/<id>-sets.json`:

```json
{
  "plate_01": { "archetype": "exterior_night", "params": { "lamps": 3, "haze": 0.4 } },
  "plate_02": { "archetype": "plinth_object", "params": { "shape": "valve", "material": "steel" } }
}
```

`render-plates.js` prefers a hand-written `_scenes.py`, falls back to the generic
module, and fails if a plate has neither. The plate-preview workflow
(`plate-test.yml`, 960x540, 12 samples) is the cheap check: a black, blocked or
toy-like plate is a failed generation, not a transition problem.

### 4. Dispatch

Once the storyboard validates in CI, set the topic to `ready` and let
`film-autopilot.yml` dispatch it (it now checks out `film-ci` and asks for
`publish=true`). A film that fails validation stays out of the slate rather than
rendering.

## What not to do

- Do not let the model write Blender Python directly. Primitives are the API;
  free-form Python is unreviewable and fails as a black frame.
- Do not fold a new film into an existing `_scenes.py` to save work. The plates
  are the film's visual argument.
- Do not mark a topic `ready` because the words look plausible. Validation is
  the gate, and the corpus check is the fact gate.

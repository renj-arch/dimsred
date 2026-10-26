---
name: Film Source Lock
description: Research and source-lock a new vlymbooq film. Use when choosing a topic, gathering credible sources, building a fact ledger, writing narration with per-line source ids, designing a debate map, or repairing a storyboard so it passes the film validators.
---

# Film Source Lock

The pipeline refuses to invent facts. A topic without a sourced storyboard is a
research task, not a render. This skill turns a slate entry into a validated,
filmable brief.

## 1. Choose a filmable subject

Read `data/film-slate.json`. Prefer a topic that is:

- historically consequential and still argued about;
- tellable through objects, documents, architecture, light, and aftermath;
- supported by at least three independent, credible sources;
- safe to depict without bodies, blood, or a reconstructed killing;
- visually distinct from the last film.

Do not choose a topic because it has a dramatic body count. Choose it because
the argument can be carried by evidence.

Default order after Bhopal:

1. `emergency-1975` - print, broadcast, censorship, the blank column.
2. `bengal-famine-1943` - the supply chain, the ration card, the ledger.
3. `partition-1947` - maps, trains, the line through the house.

## 2. Build the fact ledger first

For every claim that may become narration, record:

```text
claim:
source id:
source URL:
publisher / author:
date accessed:
exact supporting sentence or paraphrase:
confidence: official / academic / survivor testimony / contested
narration line id:
```

Rules:

- Prefer primary records, court judgments, government reports, academic
  articles, museums, and established archives.
- Wikipedia is orientation, not the sole source for a contested figure. Follow
  its citations to the underlying source.
- Never invent a quotation, a date, a number, a name, or a causal link.
- Attribute contested numbers. For Bhopal, official immediate deaths, the
  Madhya Pradesh figure, and survivors' clinic estimates are different claims;
  do not merge them into one "truth".
- Do not use "some say", "it is believed", or "many historians agree" without a
  named source.
- Mark uncertainty in the source list, not in vague narration.

## 3. Write the storyboard

Use `data/films/<id>.json` with schema `vlymbooq.film.v1`. Read an existing film
for the exact shape. Required fields include:

- `id`, `topicId`, `title`, `subtitle`, `logline`;
- `targetDuration`, `aspect: "16:9"`, `fps`;
- `style.rules` - at least three concrete visual rules;
- `toolchain`;
- `edit` - grammar, at least three signature moves, transition defaults;
- `sources` - stable ids and HTTP(S) URLs;
- `scenes` - id, title, purpose, start, duration, narration, shots.

Every shot needs:

- a unique `id`;
- a `plate` and `render` mode;
- a `camera` cue;
- a `visual` description of at least 30 characters;
- at least one `sfx` cue;
- a `transition` object with `type`, integer `frames` 0-18, a `reason` of at
  least 12 characters, and a `sound` bridge for anything except `hard-cut`.

Narration rules:

- one idea per line;
- every line has a known `source` id;
- no line longer than 260 characters;
- write for breath and picture, not for a lecture;
- do not narrate what the image already says;
- do not end on a summary slide.

Pacing:

- 8-10 scenes, 30-40 shots for a 2-minute film;
- most shots 2-4 seconds;
- hold a shot only when the evidence needs it;
- no shot parked after the narration stops;
- scene leads should hold the previous shot, not flash the next title.

## 4. Design the plates

Aim for 20-24 distinct plates. Each plate must be a different set, angle, or
object, not the same room with new text. For each plate, write:

```text
plate id:
set:
hero object:
camera:
light:
what the audience learns:
source support:
```

Reject a plate if it implies a fact the sources do not support or stages the
killing. Build the sets procedurally in
`scripts/film/blender/<id>_scenes.py`; never hand-edit a PNG.

## 5. Build the debate map

Use `data/films/<id>-debates.json` with schema `vlymbooq.debates.v1`.

Minimum:

- 5 sources with id, title, publisher, URL;
- 5 context events with year, title, text, source;
- 4 debates with:
  - a real question;
  - a hook;
  - stakes;
  - the uncomfortable fact;
  - what would change the argument;
  - at least two `caseFor` points;
  - at least two `caseAgainst` points;
  - at least two source ids.

The debate map is not a verdict. It must let a serious person disagree without
being strawmanned.

## 6. Validate

```bash
node scripts/film/validate-film.js data/films/<id>.json
node scripts/film/validate-debates.js data/films/<id>-debates.json
```

Do not move the slate to `ready` until both pass. Do not dispatch a render from
a `research` entry.

## 7. Handoff

Update the slate entry with the storyboard and debate paths, then hand off to
the `film-autopilot` workflow. Include:

- the one-sentence argument;
- the three strongest sources;
- the contested number and how it is attributed;
- the visual grammar;
- the biggest factual risk.

If a fact cannot be resolved, stop and say so. A missing film is better than a
confident lie.

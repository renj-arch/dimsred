# Film editing and transition grammar

This is the craft standard for every vlymbooq film. It is not a list of effects.
It is how the edit argues.

The owner's bar: **brilliant transitions, brilliant edits, high-budget feel,
and a different edit language for every film.** A generic crossfade between two
plates is a defect, not a transition.

## 1. The standard

A transition is a sentence in the argument. If you cannot finish this sentence,
cut hard:

> "This transition exists because ______."

High-budget does **not** mean more transitions. It means:

- fewer cuts, each one motivated
- the cut lands on the right frame, not near it
- picture and sound arrive together, or deliberately apart
- match cuts actually match shape, direction and screen position
- the grade, grain, lens language and sound stay consistent
- one signature move per act, not one per shot
- the film trusts a hard cut

A cut that calls attention to itself without earning it is worse than a cut you
do not notice.

## 2. The vocabulary

Durations are at 24 fps. "Frames" means frames of overlap or effect, not the
number of frames in the shot.

| Type | Use it when | Frames | Sound | Do not use |
| --- | --- | --- | --- | --- |
| `hard-cut` / `smash-cut` | The idea changes, or a number/impact lands | 0 | Cut on the last consonant or the hit | When you are hiding a weak plate |
| `match-cut` | Two shapes occupy the same screen position | 0-2 | Carry the tick/impact across | If the shapes do not actually match |
| `whip-left` / `whip-right` | The camera or an object is already moving | 5-8 | Pre-lap the next scene by 4-8 frames | As a default between static shots |
| `iris` | A circular object motivates it: valve, gauge, seal, flame ring | 7-10 | Mechanical ring/tick | On a rectangular object |
| `paper-wipe` | A page, ledger, newspaper or document crosses the lens | 6-10 | Paper slide, pen scratch | As a generic wipe |
| `mask-wipe` | Bars, columns, windows or architecture justify it | 6-10 | Room tone continues | For speed |
| `dissolve` | Gas, haze, memory, or a genuine time jump | 8-14 | Crossfade room tone, not narration | Between two hard objects |
| `flash-frame` | One impact, one frame of white | 1-2 | Impact/sub | More than twice in a film |
| `shutter` | A camera shutter, door or blade crosses frame | 4-6 | Mechanical click | As decoration |
| `speed-ramp` | Motion is already in the plate | 6-12 | Whoosh only if motivated | On a locked-off shot |
| `l-cut` / `j-cut` | Sound should lead or trail the picture | 6-18 (audio) | Required | If the audio is generic room tone |
| `frame-burn` / `light-leak` | Film open/close or a memory insert | 2-5 | Optical hiss | In the middle of a clean sequence |
| `object-wipe` | A foreground object passes the lens | 4-6 | Practical whoosh | If the object is not in the plate |
| `dust-wipe` | Dust, smoke or steam physically crosses frame | 8-12 | Practical texture | If the element is fake and soft |
| `page-turn` | A page or broadsheet turns | 8-12 | Paper | On a non-paper cut |
| `scanline` | Broadcast, television, signal | 4-8 | Electrical hum | In a period scene without a screen |

## 3. Rules that are not optional

1. **No dip-to-black except film open and film close.** A black dip inside a
   tight film is a pause the film has not earned.
2. **No default crossfade.** A dissolve must be about gas, haze, memory or time.
3. **No transition repeated more than twice in one film.** If it repeats, it is
   a motif; if it repeats four times, it is a template.
4. **No more than one signature transition per act.**
5. **Every transition gets a reason sentence in the edit manifest.**
6. **Every cut gets handles.** Do not start an effect on the last frame of a
   shot, and do not end it on the first frame of the next.
7. **Sound is part of the transition.** A visual cut with no audio bridge feels
   like a slide change. Use L-cuts and J-cuts.
8. **Caption safety.** A transition must not run under a caption if it reduces
   legibility. Prefer a hard cut, or move the caption.
9. **Do not use a transition to hide a weak plate.** Fix the plate.
10. **Watch it muted, then watch it with sound, then watch it on a phone.**
    All three passes are required.

## 4. Per-film grammar

Each film gets 3-6 signature moves tied to its subject. The grammar is chosen
before the edit, not after.

### Bhopal — mechanical causality

The film is a system failing piece by piece. One object should cause the next.

- **Needle match** — gauge needle to clock minute hand. Hard cut on the tick.
- **Valve iris** — handwheel rim to flare ring to court seal. Circular mask,
  motivated by the object.
- **Number smash** — hard cut on the last syllable of `2,259`, `3,787`, `8,000`.
  No fade. The number lands like a verdict.
- **Water/flame match** — tap drip to memorial flame, same shape and position.
  The drip sound carries over the cut.
- **Gas haze** — a slow dissolve only where gas is the subject. Not a default
  crossfade.
- **Siren whip** — siren horn to street lamp, motion blur, siren pre-lapped.
- **Paper edge** — ledger or newspaper edge physically wipes the frame.

Forbidden in Bhopal: dip-to-black inside the film, generic crossfades, flash on
every impact, whip between two static objects.

### Jallianwala Bagh — architecture as trap

- Arch-to-arch match cuts
- Doorframe cuts that shrink the frame
- Wall-to-wall cuts, dust wipes, sun-to-shadow exposure shifts
- A crowd is never reconstructed; the edit stays on stone, light and evidence
- Signature: the frame narrows, never opens

### The Emergency — print and broadcast

- Page-turn wipes, column masks, scan lines, telegram stutters
- Prison-bar cuts, calendar pages, a blank column
- Sound bridges: radio dial, typewriter, telephone receiver
- Signature: information is delayed, censored or replaced by silence

### Bengal 1943 — the supply chain

- Rail match cuts, ledger lines, rice-to-ration-card cuts
- Ship manifest wipes, sack-to-bowl matches, station clock cuts
- Signature: abundance and starvation in the same frame, never spectacle

### Partition — maps and trains

- Boundary-line wipe, timetable match, level-crossing cut, trunk latch
- Map-to-face-to-map, but no graphic violence
- Sound bridges: train whistle, station announcement, latch
- Signature: the line is drawn before anyone moves

### Chauri Chaura — fire and ash

- Ember match cuts, smoke dissolves, telegram-to-flame
- Halted-march cuts: foot, dust, order, silence
- Signature: the movement stops before the fire is shown

## 5. Implementation in this repo

The storyboard may carry an `edit` block:

```json
"edit": {
  "grammar": "mechanical-causality",
  "captureFps": 30,
  "signature": ["needle-match", "valve-iris", "number-smash", "water-flame-match"],
  "transitionDefaults": { "match-cut": 0, "whip-left": 6, "iris": 8, "dissolve": 12 },
  "forbidden": ["dip", "default-crossfade"]
}
```

A shot may carry either a string or an object:

```json
"transition": {
  "type": "iris",
  "frames": 8,
  "anchor": "valve-wheel",
  "reason": "The handwheel rim becomes the flare ring.",
  "sound": "valve-ring"
}
```

Implementation requirements:

- `js/film.js` must read `film.edit` and per-shot transition objects.
- `transitionDuration()` must accept a frame count and convert to seconds.
- `iris` uses `clip-path: circle()`; `paper-wipe` and `mask-wipe` use
  `clip-path: polygon()`; whip uses translate plus directional blur.
- `match-cut` is a hard cut by default. A 1-2 frame blur is allowed only when
  the plates genuinely align.
- `build-film.js` must mix sound bridges (pre-lap/post-lap) at the cut, not
  merely concatenate narration.
- `captureFps` may be raised to 30 for transition-heavy films; output stays
  24 fps. Do not raise it without checking render time.
- The edit manifest is part of the production record. Publish it.

## 6. QC gate

A cut does not pass until all of these are true:

- Every transition has a one-sentence reason.
- No dip-to-black inside the film.
- No transition type appears more than twice.
- Every cut was stepped through at 24 fps, one to two seconds either side.
- No duplicate frame, black frame, frozen frame or caption collision.
- Sound bridges are audible; no click, pop or abrupt room-tone change.
- The cut works muted.
- The cut works with sound.
- The cut works on a phone.
- A hard-cut version was considered. If the hard cut is better, use it.

## 7. Anti-patterns

- Whip pan between two locked-off plates
- Crossfade on every scene change
- Flash on every impact
- Speed ramp with no motion
- A match cut where the shapes do not match
- Three transitions in two seconds
- A transition that hides a weak plate
- A transition that repeats until it becomes the film's only idea
- A "high-budget" look made of effects instead of timing

## 8. Exercises for the agent

1. Replace every transition in a sequence with a hard cut. If the sequence
   improves, the transitions were decoration.
2. Name the reason for every cut in one sentence. If you cannot, cut hard.
3. Cut a ten-second sequence with only hard cuts and sound bridges. Then add
   one signature transition. Stop.
4. Watch a reference film muted. Mark where the cuts land: on motion, on a
   shape, on a sound, or on a breath.
5. Take the weakest plate and ask whether the edit is disguising it. Fix the
   plate first.

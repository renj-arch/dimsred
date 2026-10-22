# Film runbook

This is the exact loop for taking a sourced storyboard to a finished film
without rendering on the owner's machine.

## 0. Before touching a render

```bash
node scripts/film/validate-film.js data/films/jallianwala-bagh.json
node scripts/film/validate-debates.js data/films/jallianwala-bagh-debates.json
python -m py_compile scripts/film/blender/jallianwala_scenes.py
node --check js/film.js
```

If any command fails, stop. A storyboard defect is cheaper to fix than a render.

## 1. Cheap plate preview

The preview renders only the Blender stills at 960×540 / 12 samples.

```bash
gh workflow run plate-test.yml --ref film-ci \
  -f film=jallianwala-bagh -f width=960 -f height=540 -f samples=12
gh run list --workflow plate-test.yml --branch film-ci --limit 1
```

Wait for completion, then:

```bash
gh run download <run-id> -n plates-jallianwala-bagh -D out/plates-preview
```

Open every PNG in `out/plates-preview` with an image-capable read tool. Do not
review from memory and do not reuse an older folder as evidence.

### Plate rejection rubric

Reject and fix if any of these is true:

- the frame is black, empty, flat, or has no readable focal point;
- a foreground object is a giant black blob or covers the subject;
- crowds or people read as blocky toys, featureless mannequins, or floating;
- a poster, paper, clock or letter is a blank rectangle at the intended size;
- a hero prop (watch, lamp, well, plaque, cases) is cropped or unreadably small;
- the set has no depth: brick wall flat behind an opening, no ground, no haze;
- light is uniform and shadowless, or the only bright area is a clipped blob;
- scale is wrong: huge leaves, giant bricks, a well with no rim, a giant lamp;
- the image implies a fact the sources do not support, or stages the killing.

Fix the procedural source in `scripts/film/blender/<film>_scenes.py`. Re-run the
preview. Do not hand-edit a PNG: the next render will overwrite it.

## 2. Full draft

```bash
gh workflow run film.yml --ref film-ci \
  -f film=jallianwala-bagh -f quality=draft -f release=false
```

Download `film-jallianwala-bagh-draft` and inspect:

- duration is the storyboard duration (Jallianwala: 152 s);
- 1280×720, 12 fps capture rendered into a 24 fps container;
- voice is audible, no clipped words, no missing line;
- SRT timings match the spoken lines;
- every scene change has a purpose; no accidental black frame;
- motion is deterministic and does not jitter or drift off the plate;
- captions do not cover the subject and are readable on a phone;
- thumbnail is not a black frame or a blank card.

If the draft is structurally right, do not iterate the plate loop again. Go to
final.

## 3. Final master

```bash
gh workflow run film.yml --ref film-ci \
  -f film=jallianwala-bagh -f quality=final -f release=false
```

Download `film-jallianwala-bagh-final` and verify:

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of json jallianwala-bagh-master.mp4
```

Acceptance:

- 1920×1080, H.264 video, AAC stereo audio;
- 24 fps, about 152 seconds;
- `+faststart`, no corruption, audio present throughout;
- SRT, thumbnail, `metadata.json`, `youtube.md` and `script.md` present;
- the film is watchable end to end, not merely present.

## 4. Publish

The pipeline produces an artefact and an optional GitHub release; it does not
upload to YouTube. That is a deliberate review gate, not a missing feature.

For a site launch:

1. Put the approved master and subtitle file somewhere the site can serve
   (GitHub release asset or YouTube, whichever the gallery uses).
2. Add the film entry to the site manifest (`data/lecture-videos.json` on the
   main site branch) with title, duration, sources, URL and thumbnail.
3. Replace the gallery status “In production” with the real status and a still
   from the approved master.
4. Keep the argument-map link working: `debates.html?film=<id>`.
5. Verify the live routes return 200 and the player starts:
   - `/films`
   - `/film.html?film=jallianwala-bagh`
   - `/debates?film=jallianwala-bagh`
   - `/data/films/jallianwala-bagh.json`

Do not claim a YouTube upload, a public master or a live video that has not been
checked.

## 5. Autopilot

The selector is safe to run daily and weekly:

```bash
node scripts/film/autopilot.js --json       # choose, do not dispatch
node scripts/film/autopilot.js --dispatch   # only a ready, validated film
node scripts/film/autopilot.js --require-ready
```

A topic moves from `research` to `ready` only when:

- a sourced `data/films/<id>.json` exists;
- a sourced `data/films/<id>-debates.json` exists;
- both validators pass;
- the slate entry says `ready`.

The scheduled workflow uses `--require-ready`. It is allowed to do nothing.

## 6. Known failure modes

- **Free-runner queue.** Renders wait. Cancelling and re-dispatching moves the
  run to the back; it does not prioritise it.
- **Blender API drift.** Blender 4.2 uses `spot.data.spot_size`, not `.angle`;
  socket names differ. Guard optional inputs.
- **Piper.** `build-film.js` can reach Piper even with `--dry-run`; do not run it
  locally just to test the timeline.
- **Stale artefacts.** `out/` is gitignored. Always download the current run
  before judging a plate or master.
- **Partial clone / worktrees.** Film work lives on `film-ci`; the public site
  and gallery live on `main`. Copy only the files you intend to publish.
- **Proxy on the owner's Windows box.** Clear `HTTP_PROXY`, `HTTPS_PROXY` and
  `ALL_PROXY` for `gh`/`git` commands if they fail with `127.0.0.1:8080`.

## 7. What “done” means

A film is done when the master exists, the owner has seen it, the sources and
captions are correct, the argument map is live, and the gallery no longer says
“in production”. A successful workflow alone is not done.

# The film pipeline

`vlymbooq` can now produce a real, narrated film without touching the owner's
machine. The workflow is `.github/workflows/film.yml`; the storyboard is
`data/films/salt-march.json`; the visual timeline is `film.html` + `js/film.js`.

## What runs where

| Step | Runs on | Output |
| --- | --- | --- |
| Storyboard validation | GitHub Actions CPU runner | fail loudly on filler, missing sources, broken scene timings |
| 3D plates | Blender 4.2.3 LTS, Cycles CPU | `out/film/<film>/plates/*.png` |
| Route map | Node + Natural Earth TopoJSON | `out/film/<film>/map.json` |
| Narration | Piper, local ONNX voice | one WAV per line + durations |
| Motion graphics | headless Chromium, 12/24 fps | JPEG frames |
| Master | ffmpeg | H.264/AAC MP4, SRT, thumbnail, metadata |

Nothing is sent to a paid API. Nothing is rendered on the owner's device. The
free GitHub runner is CPU-only, which is why the pipeline uses high-quality 3D
stills with controlled camera moves rather than a 3D animation render.

## Why not run Cascadeur, EmberGen and Adobe on the runner?

Those tools are part of a premium finishing workflow, but they are not available
on a standard GitHub-hosted runner:

- **Cascadeur** cannot export FBX on the free tier, and the Linux runner is
  headless.
- **EmberGen** needs a GPU and a paid licence; free runners have no GPU.
- **After Effects / Premiere** do not run on GitHub Actions.

The automated master is therefore Blender + Chromium + Piper + ffmpeg. The
storyboard still records the optional Cascadeur/EmberGen/Adobe roles so a human
finisher can take the same plates, camera notes and sound cues into those tools
later. The pipeline never pretends those steps ran.

If the owner later adds a self-hosted GPU runner, the same plates and shot list
can be handed to a 3D animation stage without changing the storyboard.

## Commands

Validate only (fast, safe):

```bash
node scripts/film/validate-film.js data/films/salt-march.json
```

Full draft on GitHub Actions:

1. Push the branch.
2. Actions → **Film pipeline** → Run workflow.
3. Pick `salt-march`, `draft`.
4. Download `film-salt-march-draft` from the run artefact, or enable `release`.

The workflow can also be triggered from the CLI:

```bash
gh workflow run film.yml -f film=salt-march -f quality=draft -f release=false
```

## Local commands (optional)

These are useful for code review, not for producing the master. The owner asked
for rendering to stay on GitHub, so use the workflow for real output.

```bash
node scripts/film/render-plates.js --film salt-march --samples 16 --width 1280 --height 720
node scripts/film/build-film.js --film salt-march --width 1280 --height 720 \
  --capture-fps 12 --crf 22 --skip-plates --tts piper
```

## Quality gates

The validator rejects:

- generic lecture filler such as “first the faces, then the events”;
- narration without a known source id;
- a scene with no shots, no narration, or a shot with no camera/sound cue;
- a total runtime that does not match the storyboard;
- a topic id that is not in the lecture library.

The storyboard's narration is source-referenced. The film is a documentary
essay, not a substitute for the reviewed Mains bank.

## YouTube handoff

The workflow exports:

- `<film>-master.mp4` (H.264/AAC, `+faststart`);
- `<film>.srt`;
- `<film>-thumb.jpg` (1280×720);
- `metadata.json` and `youtube.md` with chapters, sources and tags.

Upload is deliberately not automated: a human should check the final cut,
captions, rights and thumbnail before publishing. Once a YouTube URL exists, it
can be placed in the site's film manifest and played through the built-in
theatre.

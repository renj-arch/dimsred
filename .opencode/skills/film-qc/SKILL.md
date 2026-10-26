---
name: Film QC
description: Independent QC for a rendered vlymbooq film. Use after every draft or final render, before accepting an artifact or publishing it. Checks specs, decode, audio peak and loudness, captions, scene leads, transitions, poster, and evidence.
---

# Film QC

Workflow success is not QC. The artifact is the evidence. Download the exact
run, inspect frames, measure the audio, and compare the cut to its timeline and
edit manifest.

## 0. Establish the artifact

```bash
gh run view <run-id> --json status,conclusion,headSha,url
gh run download <run-id> -n film-<id>-<quality> -D out/ci-<run-id>
```

Record the run id, commit, file path, byte size, and SHA-256. If the artifact is
missing a required file, FAIL; do not reconstruct it from an older run.

Required files:

- `<id>-draft.mp4` or `<id>-master.mp4`
- `<id>.srt`
- `<id>-thumb.jpg`
- `metadata.json`
- `youtube.md`
- `script.md`
- `timeline.json`
- `edit-manifest.json`
- `edit-qc.json`
- `map.json`
- `plates/*.png`

## 1. Container and stream specs

```bash
ffprobe -v error -show_entries \
format=duration,size,bit_rate,format_name \
 -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels,channel_layout,pix_fmt \
 -of json <video>
```

Acceptance:

- draft: 1280x720, 24 fps, H.264 video, AAC audio;
- final: 1920x1080, 24 fps, H.264 video, AAC audio;
- stereo, 48 kHz;
- duration matches `timeline.json` within 0.5 s;
- duration is within the storyboard tolerance; if it is materially shorter,
  confirm the tight pacing was intentional and record the real duration;
- `+faststart` for the master;
- no extra audio/video streams.

## 2. Decode cleanly

```bash
ffmpeg -v error -i <video> -f null -
```

Any output is a FAIL. Also check for duplicate/frozen frames:

```bash
ffmpeg -v error -i <video> -vf "mpdecimate" -f null - 2>&1
```

Inspect the cut; do not rely on the filter alone.

## 3. Audio

Measure true peak and integrated loudness:

```bash
ffmpeg -hide_banner -nostats -i <video> \
  -af "ebur128=peak=true" -f null - 2>&1 | Select-String -Pattern "I:|Peak:"
```

```bash
ffmpeg -hide_banner -nostats -i <video> \
  -af "astats=metadata=1:reset=0" -f null - 2>&1 | Select-String -Pattern "Peak level|RMS level|Flat factor"
```

Acceptance:

- true peak no higher than -0.5 dBFS; the pipeline limiter is 0.84 (-1.5 dBFS)
  and a clean Bhopal draft measured -0.867 dBFS;
- integrated loudness in the -16 to -11 LUFS range, target around -14;
- no silence longer than 0.5 s except an intentional beat;
- no clipped words, dropouts, clicks, or abrupt room-tone changes;
- narration audible over music and effects.

## 4. Timeline and edit manifest

Read `timeline.json` and `edit-manifest.json`:

- scene starts and durations;
- shot starts and holds;
- transition type, frames, reason, sound;
- caption cue starts and ends;
- actual scene-lead frame times.

Compare the JSON to the MP4. The MP4 is authoritative for what shipped; the
timeline is authoritative for what was intended.

## 5. Frame inspection

Extract every scene lead, every transition midpoint, the first and last frame,
and the poster frame. Use the exact times from the timeline.

```bash
ffmpeg -v error -ss <seconds> -i <video> -frames:v 1 -q:v 2 <out.png>
```

At each scene lead, inspect at least `t-0.5`, `t`, and `t+0.5` seconds. The
previous shot must hold through the lead. The next scene's title card must not
flash before its shot.

Reject any frame that is:

- black or near-black when it should not be;
- a duplicate of the previous plate;
- tiled, torn, or double-composited;
- a title card from the wrong scene;
- a plate with unreadable or blank text;
- cropped on a hero object;
- showing a body, blood, or a reconstructed killing;
- a caption covering the subject or colliding with a transition.

The first Bhopal canvas draft had title flashes at 23.05, 51.7, 68.2, 88.7,
100.4, and 114.2 seconds. Check those kinds of boundaries explicitly.

## 6. Captions

- SRT parses and has no missing or empty cues.
- Burned-in captions match the SRT.
- No cue extends past its spoken line.
- Caption/transition overlap under 0.55 s is a warning; inspect it visually.
- No more than one line of caption on a phone-sized frame; text is readable at
  720p.
- No caption covers a face, gauge, number, or hero prop.
- Proper nouns and numbers match the sources.

## 7. Transitions

From `edit-qc.json` and the manifest:

- every transition has a one-sentence reason;
- no transition type appears more than twice;
- no dip-to-black inside the film;
- no default crossfade;
- every non-hard transition has a sound bridge;
- effects have frame-accurate handles;
- the cut works muted, with sound, and on a phone;
- a hard cut was considered.

Step through one to two seconds either side at 24 fps. A transition that hides a
weak plate is a defect in the plate, not a pass.

## 8. Poster and thumbnail

- 1280x720;
- not blank, black, or a title card with no image;
- title legible at phone size;
- the poster plate matches the approved `posterPlate`;
- no clipped text or subject;
- file is a JPEG/PNG that Cloudflare will serve.

## 9. Report

Return:

```text
VERDICT: PASS or FAIL
RUN:
COMMIT:
FILE:
BYTES:
SHA256:
DURATION:
VIDEO:
AUDIO:
LOUDNESS:
TRUE PEAK:
FRAMES INSPECTED:
DEFECTS:
REQUIRED FIX:
RELEASE DECISION:
```

A FAIL must name a timecode and the smallest fix. A PASS must name the frames
you actually looked at. Do not accept a render because the workflow was green.

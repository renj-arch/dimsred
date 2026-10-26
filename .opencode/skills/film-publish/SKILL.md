---
name: Film Publish
description: Publish an independently approved vlymbooq film. Use after QC passes to create the GitHub release, stage the 720 preview, poster, current frames, contact sheets, production JSON and HTML, deploy Cloudflare Pages, and verify the live URLs. YouTube remains manual.
---

# Film Publish

Publish only an artifact the independent QC subagent passed. The publisher does
not re-edit the film, rewrite the argument, or hide a defect with page copy.

## 0. Preconditions

- QC verdict is PASS, with measurements and inspected frames.
- You know the final run id and every artifact path.
- `git worktree list` identifies the publish checkout.
- `git -C <publish> status --short --branch` is understood; preserve unrelated
  uncommitted work.
- The 1080 master is attached to a GitHub release, not staged for Pages.
- The 720 preview is under 25 MiB.

## 1. GitHub release

Preferred: the final was rendered with `release=false`, QC passed, and the
release is created from the approved artifact.

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

If the workflow created a release with `release=true`, verify the assets and
the same QC. Delete the prerelease if it fails.

The release body must say the master was generated on a GitHub-hosted CPU
runner with Blender, Piper, the Skia canvas, and ffmpeg. Do not say Chromium.

## 2. Stage the site assets

In the publish checkout:

```text
media/films/<id>/preview.mp4      # 720p, under 25 MiB
media/films/<id>/poster.jpg       # approved poster
media/films/<id>/current-01.jpg   # regenerated from the clean MP4
...
media/films/<id>/current-06.jpg
media/films/<id>/plate-contact-sheet.jpg
```

Regenerate the current frames from the approved 720 MP4. Do not reuse frames
from an old draft, especially `40312489624`. Include the set contact sheet and
the failed-cut evidence where it is honest and useful.

Check sizes:

```powershell
Get-ChildItem media/films/<id> | Select-Object Name,Length
```

Any asset at or above 25 MiB is a Pages failure. Keep the 1080 master out.

## 3. Reconcile the data

Update `data/films/<id>.json`:

- `posterPlate` and `posterTitleSize` match the approved poster;
- preview path points at `media/films/<id>/preview.mp4`;
- production link points at `<id>-production.html`;
- duration and release metadata are accurate.

Reconcile `data/films/<id>-production.json`:

- actual run ids, including rejected cuts;
- actual duration, not the target;
- scene, shot, plate, hard-cut, and authored-transition counts;
- limiter value and measured AAC true peak;
- 720 preview size and 1080 release tag;
- plate count and contact sheet;
- failed-cut reasons;
- sources and debate link;
- `status: "published"` only when the live URLs are verified.

Update `data/film-slate.json`:

```json
{
  "status": "published",
  "published": "YYYY-MM-DD",
  "film": "film.html?film=<id>",
  "production": "<id>-production.html"
}
```

## 4. Update the pages

At minimum:

- `films.html` - film card, real status, actual duration, poster, preview;
- `film.html` / `js/film.js` - poster fields, preview source, production link;
- `production.html` - production index card;
- `<id>-production.html` - dossier with sources, sets, shot map, failed cuts,
  pipeline, transitions, QC;
- `debates.html?film=<id>` - argument map still works.

Replace "Draft QC", "1080 master in render", "Chromium captures", and similar
stale labels with the real state. The visible label may say "Released"; the data
status is `published`.

Do not claim a 1080 preview on the site. The site preview is 720; the master is
release-only.

## 5. Deploy

From the publish checkout:

```bash
npx wrangler pages deploy . --project-name=studypro --branch=live
```

This uses the local Wrangler OAuth session. CI deployment is blocked until
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist; do not pretend the CI
deploy ran.

If OAuth is expired, record the blocker and leave the local evidence committed.
Do not invent a live deployment.

## 6. Verify live

Check each URL, not just the home page:

```text
/films
/film.html?film=<id>
/debates.html?film=<id>
/<id>-production.html
/data/films/<id>.json
/media/films/<id>/preview.mp4
```

Use `curl -I` or `Invoke-WebRequest` and record the status codes. Check that the
preview is served with a video content type and supports range requests. Open
the film page and confirm the poster and player load.

## 7. Commit and report

Commit only the intended publish files:

```bash
git -C <publish> add data/films/<id>.json data/films/<id>-production.json \
  data/film-slate.json films.html film.html js/film.js production.html \
  <id>-production.html media/films/<id>
git -C <publish> commit -m "Publish <id> film"
git -C <publish> push
```

Report:

- release tag;
- deployment id / URL;
- live status codes;
- files changed;
- remaining blocker;
- YouTube handoff path.

YouTube is still manual. Do not say "uploaded" unless a human uploaded it.

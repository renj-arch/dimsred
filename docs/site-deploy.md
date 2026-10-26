# How a film reaches a viewer

The film pipeline ends twice: once when it has a file, and once when a person
can press play. This note is about the second one.

## The path

```
film.yml (render, QC, release)
   └─ publish-film.js     720p preview ≤ 25 MiB, captions.vtt, poster
   └─ site-publish.js     merges the film into data/film-watch.json and films.html
   └─ site-commit.js      one commit to main through the Git data API
        └─ Slim live mirror (slim-live.yml)  rebuilds the `live` branch, pushes it
             └─ Cloudflare Pages (project `studypro`) builds `live`
                  └─ https://vlymbooq.qzz.io/watch?film=<id>
```

Two rules decide the shape:

- **25 MiB per asset.** Cloudflare Pages refuses anything larger, and one
  oversized file fails the whole build, not just that file. So the site carries
  a 720p preview and the 1080p master stays on the GitHub release.
- **One commit.** The index is merged, not overwritten: `site-publish.js` reads
  the current `data/film-watch.json` and the current `films.html` from `main`
  and adds the film to them, so two publishes cannot erase each other.

`film.yml` finishes by dispatching the mirror and waiting for the film id to
appear in the live index. If it does not appear within twelve minutes the run
fails with `Film not live` — a commit on `main` is not a film a viewer can open.

## The current blocker (2026-10-26)

Cloudflare Pages builds have been landing empty since 16:08 UTC: the deployment
is created, listed as active, and serves `404` for `/`, while the previous
deployment keeps serving the old site. The last good production build is
`dca5c38` (15:14 UTC).

That is why the watch page had to be pushed with a direct upload from the
owner's machine:

```
git clone --depth 1 --branch live https://github.com/renj-arch/dimsred.git site-live
cd site-live
npx wrangler pages deploy . --project-name studypro --branch live --commit-dirty=true
```

Direct upload works because it bypasses the build. The mirror already prefers
it when credentials exist; the two secrets are missing:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Account → Cloudflare Pages → Edit** for this account |
| `CLOUDFLARE_ACCOUNT_ID` | `5794536201671c875b783506f5a66fee` |

Create the token at Dashboard → My Profile → API Tokens → Create Token →
"Edit Cloudflare Workers" template, or a custom token with `Pages:Edit`. Then:

```
gh secret set CLOUDFLARE_API_TOKEN --repo renj-arch/dimsred
gh secret set CLOUDFLARE_ACCOUNT_ID --repo renj-arch/dimsred --body 5794536201671c875b783506f5a66fee
```

With those present the mirror uploads the tree itself, the build quota stops
mattering, and `Confirm the film is live` can pass without a person.

Until then every publish needs the clone-and-upload step above.

## Why not serve the canvas player

`film.html?film=<id>` renders the film in the browser from `out/film/<id>/timeline.json`
and its plates. None of that has been deployed since the player was written: the
timeline and every plate return `404` on the live site. The films page now points
at `watch.html`, which plays a real MP4 with captions and a poster. The canvas
player is kept in the repository, not in the navigation.

# Film worktrees

Resolve these paths with `git worktree list` before every task. Temp paths are
disposable and must never be assumed.

Current at 2026-10-26:

| Role | Path | Branch |
| --- | --- | --- |
| Main site / agent config | `C:\Users\Renjith\Desktop\icode (2)\study` | `main` |
| Film build | `C:\Users\Renjith\AppData\Local\Temp\vlymbooq-film-ci` | `film-ci` |
| Publish | `C:\Users\Renjith\AppData\Local\Temp\vlymbooq-publish` | `sync-50cut-preview` |
| Older build worktree | `C:\Users\Renjith\AppData\Local\Temp\vlymbooq-film-worktree` | `film-pipeline-ci` |

The older `vlymbooq-film-worktree` is not the current film build. Check the
branch and commit before using it.

If a worktree is missing, create one from the correct remote branch:

```bash
git worktree add <path> film-ci
```

Do not copy an old `out/` directory into a new worktree. Download the exact
artifact from the current run.

The publish checkout is a git worktree on a sync branch. It is the directory
that Wrangler deploys to Cloudflare Pages. Do not deploy from the film build
worktree.

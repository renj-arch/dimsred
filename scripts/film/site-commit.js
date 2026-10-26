#!/usr/bin/env node
/*
 * Commit a handful of finished files to a branch in one commit, without cloning
 * it.
 *
 * The site lives in a big repository and is deployed from `main` by the mirror
 * workflow. The film runner already has the media it needs to publish, so
 * cloning that tree only to add four files is the wrong trade: this uses the
 * Git data API instead, which uploads exactly what changes and leaves the rest
 * of the branch alone.
 *
 * Usage:
 *   node scripts/film/site-commit.js --message "film: publish bhopal" \
 *     --file films.html --file data/film-watch.json \
 *     --file media/films/bhopal-gas-tragedy/preview.mp4
 *
 *   node scripts/film/site-commit.js --dry-run ...      # build the commit, do not move the ref
 *
 * Environment: GITHUB_TOKEN (or GH_TOKEN), or a logged-in `gh` CLI.
 * Repository: GITHUB_REPOSITORY, or --repo, default renj-arch/dimsred.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API = 'https://api.github.com';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function all(name) {
  const out = [];
  process.argv.forEach((value, i) => {
    if (value === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('no GitHub token: set GITHUB_TOKEN or log in with gh');
  }
}

async function api(method, url, body, auth) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vlymbooq-site-commit',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

/* A push to the same branch can land between our read and our update; reread and retry. */
async function withRef(repo, branch, auth, fn) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ref = await api('GET', `/repos/${repo}/git/ref/heads/${branch}`, null, auth);
    const head = ref.object.sha;
    try {
      return await fn(head);
    } catch (err) {
      if (err.status !== 409 && err.status !== 422) throw err;
      if (attempt === 4) throw err;
      console.warn(`  ref moved, retrying (${attempt})`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

/*
 * files: [{ path, bytes }] — bytes, not paths, so callers can build a file in
 * memory (the patched watch index) and commit it beside the media.
 */
async function commitFiles({ repo = 'renj-arch/dimsred', branch = 'main', message, files, dryRun = false, auth }) {
  if (!message) throw new Error('--message is required');
  if (!files || !files.length) throw new Error('at least one file is required');
  const tokenValue = auth || token();

  console.log(`committing ${files.length} file(s) to ${repo}@${branch}`);

  const blobs = [];
  for (const file of files) {
    const blob = await api(
      'POST',
      `/repos/${repo}/git/blobs`,
      { content: file.bytes.toString('base64'), encoding: 'base64' },
      tokenValue,
    );
    blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  blob ${file.path} ${(file.bytes.length / 1048576).toFixed(2)} MB`);
  }

  const commit = await withRef(repo, branch, tokenValue, async (head) => {
    const headCommit = await api('GET', `/repos/${repo}/git/commits/${head}`, null, tokenValue);
    const tree = await api(
      'POST',
      `/repos/${repo}/git/trees`,
      { base_tree: headCommit.tree.sha, tree: blobs },
      tokenValue,
    );
    const made = await api(
      'POST',
      `/repos/${repo}/git/commits`,
      { message, tree: tree.sha, parents: [head] },
      tokenValue,
    );
    if (!dryRun) {
      await api('PATCH', `/repos/${repo}/git/refs/heads/${branch}`, { sha: made.sha, force: false }, tokenValue);
    }
    return made;
  });

  console.log(`${dryRun ? 'would commit' : 'committed'} ${commit.sha.slice(0, 10)}`);
  console.log(`  ${commit.html_url || `https://github.com/${repo}/commit/${commit.sha}`}`);
  return commit;
}

function readSpec(spec) {
  const [local, remote] = spec.includes('=') ? spec.split('=') : [spec, spec];
  if (!fs.existsSync(local)) throw new Error(`missing file: ${local}`);
  return {
    path: remote.split(path.sep).join('/').replace(/^\.\//, ''),
    bytes: fs.readFileSync(local),
  };
}

if (require.main === module) {
  (async () => {
    await commitFiles({
      repo: arg('repo', process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred'),
      branch: arg('branch', 'main'),
      message: arg('message'),
      dryRun: Boolean(arg('dry-run', false)),
      files: all('file').map(readSpec),
    });
  })().catch((err) => {
    console.error(`site-commit: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { commitFiles, token };

#!/usr/bin/env node
/*
 * Upload the live branch to Cloudflare Pages directly.
 *
 * Cloudflare's git builds have been landing empty (see docs/site-deploy.md), so
 * a commit on main can sit there while viewers still get yesterday's site. This
 * fetches the branch the mirror just rebuilt, uploads it with the owner's
 * wrangler login, and then asks the live domain for a file so the answer is a
 * number rather than a hope.
 *
 * Usage:
 *   node scripts/film/deploy-live.js --verify data/film-watch.json
 *   node scripts/film/deploy-live.js --dir C:/path/to/site-clone --verify watch.html
 *
 * Needs: wrangler logged in (npx wrangler whoami), git, network.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = process.env.SITE_REPO || 'renj-arch/dimsred';
const PROJECT = process.env.SITE_PROJECT || 'studypro';
const BRANCH = process.env.SITE_BRANCH || 'live';
const DOMAIN = process.env.SITE_DOMAIN || 'https://vlymbooq.qzz.io';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function run(cmd, args, options = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (res.status !== 0) throw new Error(`${cmd} exited ${res.status}`);
  return res;
}

async function verify(file) {
  const url = `${DOMAIN}/${file}?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  console.log(`  verify ${res.status} ${url}`);
  if (!res.ok) throw new Error(`${file} is not live (${res.status})`);
  return res;
}

async function main() {
  const dir = path.resolve(arg('dir', path.join(os.tmpdir(), 'vlymbooq-live-site')));
  const verifyFile = arg('verify', null);

  if (fs.existsSync(path.join(dir, '.git'))) {
    run('git', ['-C', dir, 'fetch', '--depth', '1', 'origin', BRANCH]);
    run('git', ['-C', dir, 'reset', '--hard', 'FETCH_HEAD']);
  } else {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    run('git', ['clone', '--depth', '1', '--branch', BRANCH, '--single-branch',
      `https://github.com/${REPO}.git`, dir]);
  }

  run('npx', ['--yes', 'wrangler', 'pages', 'deploy', '.', '--project-name', PROJECT,
    '--branch', BRANCH, '--commit-dirty=true'], { cwd: dir });

  if (verifyFile) await verify(verifyFile);
}

main().catch((err) => {
  console.error(`deploy-live: ${err.message}`);
  process.exitCode = 1;
});

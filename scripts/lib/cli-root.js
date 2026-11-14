// Argument handling for the one-off maintenance scripts in scripts/.
//
// Several of them (cleanup-csp, fix-title-format, nav-update, cleanup-dead, and
// the read-only check-*/verify-seo tools) once hardcoded one developer machine's
// absolute path. A bare `node scripts/cleanup-csp.js` therefore rewrote every
// matching HTML file under that directory on that machine — no confirmation, no
// dry run, no way to point it at a different tree — and cleanup-dead.js deleted
// three pages as well. The paths are gone.
//
//   requireRoot()             read/write scripts: --root is mandatory
//   requireRoot({ readOnly: true })  read-only scripts: defaults to cwd
//   isApply()                 true only when --apply is passed
//
// Writers default to a dry run on purpose: these are one-off fixers, so the
// safe default is to print what would change.

const fs = require('fs');
const path = require('path');

function valueOf(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

function requireRoot(opts) {
  const options = opts || {};
  const argv = process.argv.slice(2);
  const given = valueOf(argv, '--root') || process.env.SITE_ROOT || null;

  if (!given) {
    if (options.readOnly) {
      const cwd = process.cwd();
      console.log('No --root given; reading ' + cwd);
      return cwd;
    }
    console.error('Refusing to run: pass the site directory explicitly.');
    console.error('');
    console.error('  node ' + path.relative(process.cwd(), process.argv[1]).replace(/\\/g, '/') +
      ' --root <dir> [--apply]');
    console.error('');
    console.error('There is deliberately no default. An earlier version defaulted to one');
    console.error("machine's absolute path, so a bare run rewrote and deleted files there.");
    process.exit(2);
  }

  const root = path.resolve(given);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error('--root is not a directory: ' + given);
    process.exit(2);
  }
  if (!options.readOnly) {
    console.log((isApply() ? 'APPLYING to ' : 'DRY RUN over ') + root);
    if (!isApply()) console.log('(nothing will be written; add --apply to make changes)');
  }
  return root;
}

function isApply() {
  return process.argv.slice(2).indexOf('--apply') !== -1;
}

module.exports = { requireRoot, isApply };

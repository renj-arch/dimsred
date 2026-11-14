const fs = require('fs');
const path = require('path');

// One-off local cleanup from 2026-06 (commit e466e4eabc: "cleanup: remove dead
// pages (login, guest-login, community)"); unrelated nav fixes from the same
// era (commit 2791414aec). It is NOT run by any workflow — its work is already
// in the repo.
//
// It used to carry a hardcoded absolute Desktop path to one developer machine.
// A bare `node scripts/cleanup-dead.js` therefore rewrote EVERY .html file under
// that directory and then deleted three pages — silently, with no confirmation
// and no dry run, from any working directory. The path is gone. You now have to
// say which tree, and writing is opt-in:
//
//   node scripts/cleanup-dead.js --root <dir>            # report only (default)
//   node scripts/cleanup-dead.js --root <dir> --apply    # actually write
const args = process.argv.slice(2);
function flag(name) {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1];
}
const apply = args.indexOf('--apply') !== -1;
let root = flag('--root');

if (!root) {
    console.error('Refusing to run: pass the site directory explicitly.');
    console.error('');
    console.error('  node scripts/cleanup-dead.js --root <dir> [--apply]');
    console.error('');
    console.error('There is deliberately no default. An earlier version defaulted to one');
    console.error("machine's hardcoded path, so a bare run could rewrite and delete files there.");
    process.exit(2);
}
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error('--root is not a directory: ' + root);
    process.exit(2);
}
root = path.resolve(root);
console.log((apply ? 'APPLYING to ' : 'DRY RUN over ') + root);
if (!apply) console.log('(nothing will be written; add --apply to make changes)');

function walk(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name !== 'node_modules') files.push(...walk(full));
        } else if (e.name.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

const files = walk(root);
let communityUpdated = 0;
let redirectRemoved = 0;
let signinRemoved = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;

    // 1. Replace community.html nav links to point to dashboard.html
    const c1 = content.replace(/href="\/community\.html">Community/g, 'href="/dashboard.html">Community');
    if (c1 !== content) { content = c1; changed = true; }

    const c2 = content.replace(/href="\.\.\/community\.html">Community/g, 'href="../dashboard.html">Community');
    if (c2 !== content) { content = c2; changed = true; }

    const c3 = content.replace(/href="community\.html">Community/g, 'href="dashboard.html">Community');
    if (c3 !== content) { content = c3; changed = true; }

    // Template placeholder: <!--ROOT-->community.html -> dashboard.html
    const c3b = content.replace(/<!--ROOT-->community\.html/g, '<!--ROOT-->dashboard.html');
    if (c3b !== content) { content = c3b; changed = true; }

    // Remove "Learn More" link to community.html on dashboard
    const c3c = content.replace(/<a href="community\.html" class="social-btn"[^>]*>Learn More<\/a>/g, '');
    if (c3c !== content) { content = c3c; changed = true; }

    // 2. Remove redirect.js script references
    const re = /<script\s+src="[^"]*redirect\.js"[^>]*><\/script>/g;
    const c4 = content.replace(re, '');
    if (c4 !== content) { content = c4; changed = true; redirectRemoved++; }

    // 3. Remove Sign In auth-btn from leaderboard
    if (f.toLowerCase().includes('leaderboard')) {
        const c5 = content.replace(/<a\s+class="auth-btn"[^>]*>.*?<\/a>/g, '');
        if (c5 !== content) { content = c5; changed = true; signinRemoved++; }
    }

    if (changed) {
        if (f.includes('community')) communityUpdated++;
        if (apply) fs.writeFileSync(f, content, 'utf8');
        else console.log('  would update ' + path.relative(root, f));
    }
}

// Delete the dead pages
const deadPages = ['community.html', 'login.html', 'guest-login.html'];
for (const p of deadPages) {
    const full = path.join(root, p);
    if (fs.existsSync(full)) {
        if (apply) {
            fs.unlinkSync(full);
            console.log('Deleted: ' + p);
        } else {
            console.log('would delete: ' + p);
        }
    }
}

console.log('Community links ' + (apply ? 'updated' : 'to update') + ': ' + communityUpdated);
console.log('Redirect.js refs ' + (apply ? 'removed' : 'to remove') + ': ' + redirectRemoved);
console.log('Sign-in buttons ' + (apply ? 'removed' : 'to remove') + ': ' + signinRemoved);
if (!apply) console.log('Dry run complete — re-run with --apply to write these changes.');

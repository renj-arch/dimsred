const fs = require('fs');
const path = require('path');
const { requireRoot, isApply } = require('./lib/cli-root');

// One-off CSP tidier: strips ad-network domains from CSP meta tags.
//
// It used to hardcode one developer machine's absolute path, so a bare run
// rewrote every HTML file under a directory you did not choose. Root is now
// explicit and writing is opt-in.
//
//   node scripts/cleanup-csp.js --root <dir>            # dry run
//   node scripts/cleanup-csp.js --root <dir> --apply    # write
const root = requireRoot();
const apply = isApply();

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
let cleaned = 0;

const adDomains = [
    'pagead2.googlesyndication.com',
    'googleads.g.doubleclick.net',
    'ep2.adtrafficquality.google',
    '*.adtrafficquality.google',
    'static.cloudflareinsights.com',
    'apis.google.com',
    'www.gstatic.com',
    'www.google.com',
];

for (const f of files) {
    let content = fs.readFileSync(f, 'utf8');
    let c = content;
    // Strip ad domains from CSP
    for (const d of adDomains) {
        // Remove domain from script-src, connect-src, frame-src, img-src
        c = c.replace(new RegExp('https://' + d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'g'), '');
    }
    if (c !== content) {
        if (apply) fs.writeFileSync(f, c, 'utf8');
        console.log((apply ? 'Cleaned CSP: ' : 'would clean CSP: ') + path.relative(root, f));
        cleaned++;
    }
}

console.log('Total CSP files ' + (apply ? 'cleaned: ' : 'to clean: ') + cleaned);
if (!apply && cleaned) console.log('Dry run — re-run with --apply to write these changes.');

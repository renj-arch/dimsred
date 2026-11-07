const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\study';

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
        fs.writeFileSync(f, c, 'utf8');
        cleaned++;
        console.log('Cleaned CSP: ' + path.relative(root, f));
    }
}

console.log('Total CSP files cleaned: ' + cleaned);

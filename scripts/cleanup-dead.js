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
        fs.writeFileSync(f, content, 'utf8');
        if (f.includes('community')) communityUpdated++;
    }
}

// Delete the dead pages
const deadPages = ['community.html', 'login.html', 'guest-login.html'];
for (const p of deadPages) {
    const full = path.join(root, p);
    if (fs.existsSync(full)) {
        fs.unlinkSync(full);
        console.log('Deleted: ' + p);
    }
}

console.log('Community links updated: ' + communityUpdated);
console.log('Redirect.js refs removed: ' + redirectRemoved);
console.log('Sign-in buttons removed: ' + signinRemoved);

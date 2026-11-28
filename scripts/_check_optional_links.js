// Check relative and root-relative links on optional lesson pages and the
// UPSC course index. Understands clean URLs (/path -> path.html or path/index.html).
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const files = [];
const courseDir = path.join('upsc', 'course');
fs.readdirSync(courseDir).filter(d => d.startsWith('opt-')).forEach(d => {
  const dir = path.join(courseDir, d);
  if (!fs.statSync(dir).isDirectory()) return;
  fs.readdirSync(dir).filter(f => /^lesson-.*\.html$/.test(f)).forEach(f => files.push(path.join(dir, f)));
});
files.push(path.join(courseDir, 'index.html'));

function exists(target) {
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (!path.extname(target) && fs.existsSync(target + '.html')) return true;
  if (fs.existsSync(path.join(target, 'index.html'))) return true;
  return false;
}

let checked = 0;
const missing = [];
files.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('data:')) continue;
    href = href.split('#')[0].split('?')[0];
    if (!href) continue;
    checked++;
    const target = href.startsWith('/')
      ? path.join(ROOT, href)
      : path.resolve(path.dirname(file), href);
    if (!exists(target)) missing.push(file + ' -> ' + m[1]);
  }
});
console.log('files checked:', files.length);
console.log('links checked:', checked);
console.log('missing targets:', missing.length);
missing.slice(0, 30).forEach(x => console.log('  ' + x));

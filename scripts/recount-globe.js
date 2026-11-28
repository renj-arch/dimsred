const fs = require('fs');
const path = require('path');

const GLOBE_PATH = path.resolve(__dirname, '..', '3d-globe.html');

let html;
try {
  html = fs.readFileSync(GLOBE_PATH, 'utf8');
} catch (e) {
  console.error('recount-globe: cannot read 3d-globe.html');
  process.exit(1);
}

const tag = '<script type="module">';
const tagIdx = html.indexOf(tag);
if (tagIdx === -1) {
  console.error('recount-globe: no module script found');
  process.exit(1);
}
const scriptStart = tagIdx + tag.length;
const scriptEnd = html.indexOf('</script>', scriptStart);
if (scriptEnd === -1) {
  console.error('recount-globe: module script not closed');
  process.exit(1);
}
const js = html.slice(scriptStart, scriptEnd);

// Locate the data section: const D = {}; ... until CONTEMPORARIES or end of D arrays.
const dStart = js.indexOf('const D = {};');
if (dStart === -1) {
  console.error('recount-globe: cannot find data section');
  process.exit(1);
}
// Data arrays are D.<key> = [ ... ]; find the block that reaches CONTEMPORARIES.
const CONT = js.indexOf('const CONTEMPORARIES');
let dataEnd = CONT !== -1 ? CONT : js.length;
// Trim trailing blank lines; if there is a helper function right after data, cut there.
const sectionEnd = js.lastIndexOf('];', dataEnd);
if (sectionEnd === -1) {
  console.error('recount-globe: cannot find end of data section');
  process.exit(1);
}
const dataSrc = js.slice(dStart, sectionEnd + 2);

let D = {};
try {
  D = (function () {
    const D2 = {};
    const D = D2;
    eval(dataSrc.replace('const D = {};', '// const D (recount)'));
    return D2;
  })();
} catch (e) {
  console.error('recount-globe: failed to parse data arrays:', e.message);
  process.exit(1);
}

let total = 0;
let categories = 0;
for (const [k, v] of Object.entries(D)) {
  if (Array.isArray(v)) {
    total += v.length;
    categories++;
  }
}

const newComment = `<!-- Total globe entries: ${total} -->`;
const re = /<!--\s*Total globe entries:\s*\d+\s*-->/g;
const had = re.test(html);
if (had) {
  // Collapse ALL historical count comments into exactly one accurate comment.
  let inserted = false;
  html = html.replace(re, () => (inserted ? '' : ((inserted = true), newComment)));
} else {
  // Insert right before the module script if no comment exists yet.
  html = html.slice(0, tagIdx) + newComment + '\n' + html.slice(tagIdx);
}

fs.writeFileSync(GLOBE_PATH, html, 'utf8');

const perCat = Object.entries(D)
  .filter(([, v]) => Array.isArray(v))
  .map(([k, v]) => `${k}:${v.length}`)
  .sort((a, b) => parseInt(b.split(':')[1], 10) - parseInt(a.split(':')[1], 10));
console.log(`=== Total globe entries (recounted): ${total} across ${categories} categories ===`);
console.log(`Source had existing count comment: ${had}`);
console.log('Top categories:');
perCat.slice(0, 10).forEach((s) => console.log('  ' + s));
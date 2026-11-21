const { execSync } = require('child_process');
const out = execSync('git log --format=%H -- scripts/course-addons.json', { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
console.log('commits touching file: ' + out.length);
let shown = 0;
for (const h of out) {
  let s;
  try { s = execSync('git show ' + h + ':scripts/course-addons.json', { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); } catch (e) { continue; }
  const markers = (s.match(/<<<<<<<|>>>>>>>/g) || []).length;
  let ok = false;
  try { JSON.parse(s); ok = true; } catch (e) {}
  let date = '';
  try { date = execSync('git show -s --format=%ci ' + h, { encoding: 'utf8' }).trim(); } catch (e) {}
  console.log(h.slice(0, 8) + '  ' + date + '  bytes=' + s.length + '  markers=' + markers + '  parses=' + ok);
  if (++shown >= 12) break;
}
const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'data', 'questions');
const archivePath = path.join(__dirname, '..', 'archive.html');

let total = 0;
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'archive-cat-index.json');
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8'));
    for (const [, subj] of Object.entries(data)) {
      if (subj && subj.subSubjects) {
        for (const [, qs] of Object.entries(subj.subSubjects)) {
          total += qs.length;
        }
      }
    }
  } catch {}
}

const now = new Date();
const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const isoStr = now.toISOString().replace(/\.\d+Z$/, 'Z');

let html = fs.readFileSync(archivePath, 'utf8');
const oldMeta = html.match(/Complete archive of \d+ GK & Current Affairs questions/);
const oldSub = html.match(/>\d+ questions across \d+ categories/);
const oldTime = html.match(/<time id="build-time"[^>]*>.*?<\/time>/);

if (!oldMeta && !oldSub && !oldTime) {
  console.log('No patterns found in archive.html');
  process.exit(0);
}

let changed = false;
if (oldMeta) {
  const before = oldMeta[0].match(/\d+/)[0];
  if (Number(before) !== total) {
    html = html.replace(oldMeta[0], `Complete archive of ${total} GK & Current Affairs questions`);
    changed = true;
    console.log(`Meta total: ${before} -> ${total}`);
  }
}
if (oldSub) {
  const before = oldSub[0].match(/\d+/)[0];
  if (Number(before) !== total) {
    html = html.replace(oldSub[0], `>${total} questions across 47 categories`);
    changed = true;
    console.log(`Subtitle total: ${before} -> ${total}`);
  }
}
if (oldTime) {
  const newTime = `<time id="build-time" datetime="${isoStr}">${dateStr}</time>`;
  if (oldTime[0] !== newTime) {
    html = html.replace(oldTime[0], newTime);
    changed = true;
    console.log(`Timestamp updated`);
  }
}

if (changed) {
  fs.writeFileSync(archivePath, html, 'utf8');
  console.log(`Updated archive.html — ${total} total questions`);
} else {
  console.log(`Count unchanged (${total})`);
}

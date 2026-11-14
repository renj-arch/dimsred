// Track when each course lesson's content actually changed.
//
// Users read long lessons while the expander keeps enriching them, and an
// expansion can add sections in the middle of a page. Without a version stamp
// there is no way for a returning student to know what moved. This state file
// (scripts/course-versions.json, tracked in git) records, per lesson key:
//   version  - short hash of the rendered body + practice set
//   updated  - date the content last changed (empty until the first change we
//              can actually observe; we never invent a historical date)
//   headings - the h2/h3 headings in the current body, so a client can list
//              the sections that are new since the reader's last visit
//
// The first time a lesson is recorded we only seed a baseline. The one
// exception is a lesson the expander just wrote (changedHint), whose change is
// real and datable.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, '..', 'course-versions.json');

function load() {
  try {
    const s = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    if (s && typeof s === 'object' && s.lessons) return s;
  } catch (e) { /* first run */ }
  return { meta: { seeded: new Date().toISOString().slice(0, 10) }, lessons: {} };
}

function save(state) {
  state.meta = state.meta || {};
  state.meta.updated = new Date().toISOString();
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function hash(str) {
  return crypto.createHash('sha1').update(String(str)).digest('hex').slice(0, 12);
}

function headings(html) {
  const out = [];
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    const t = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (t && out.indexOf(t) === -1) out.push(t);
  }
  return out;
}

function record(state, key, body, changedHint, today) {
  const version = hash(body);
  const hs = headings(body);
  const prev = state.lessons[key];
  let updated = (prev && prev.updated) || '';
  let added = [];
  if (!prev) {
    if (changedHint) updated = today;
  } else if (prev.version !== version) {
    updated = today;
    added = hs.filter(function (h) { return (prev.headings || []).indexOf(h) === -1; });
  }
  state.lessons[key] = { version: version, updated: updated, headings: hs, checked: today };
  return { version: version, updated: updated, added: added, headings: hs, previous: prev || null };
}

module.exports = { load: load, save: save, record: record, headings: headings, hash: hash, FILE: FILE };

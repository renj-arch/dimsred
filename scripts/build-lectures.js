#!/usr/bin/env node
'use strict';
// build-lectures.js — compiles spoken lectures from the topic graph.
//
// Inputs (all already tracked, all already refreshed by other agents):
//   data/topic-layers.json    — per topic: branches of people / events /
//                               concepts / organisations with one-line descs.
//   data/revision-content.json — per topic: a one-line summary of the core.
//   data/person-bios.json     — fallback one-liners for people whose desc is
//                               missing.
//
// Output: data/lectures.json, read by lecture.html. Each lecture is a deck of
// beats already written as SPOKEN lines — the page only needs a voice system.
// Deterministic: same inputs produce the same file (variant picks are hashed
// from the topic id, not random), so CI runs diff cleanly when nothing moved.

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data/lectures.json');
const MAX_TOPICS = 60;
const MIN_ITEMS = 8;

function readJSON(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch (e) { console.log('[lectures] could not read ' + rel + ': ' + e.message);
    if (fallback === undefined) process.exit(1); return fallback; }
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function clean(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}
function sentence(s) {
  s = clean(s).replace(/[.!,;:]+$/, '');
  return s ? s + '.' : '';
}
function cap(s) {
  s = clean(s);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function titleCase(s) {
  return clean(s).split(' ').map(function (w) {
    return w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(' ');
}
function pickOne(arr, seed) { return arr[hash(String(seed)) % arr.length]; }

// The roadmap / bridge lines vary per topic (hashed) so consecutive lectures
// do not sound like the same voice reading the same template.
const ROADMAP = [
  'We will move through the people, the turning points and the ideas — then close with three lines worth keeping.',
  'First the faces, then the events, then the ideas — and at the end, three lines to carry with you.',
  'Here is the route: the people, the turning points, the ideas — and a closing set of three lines to remember.'
];
const OUTRO = [
  'That is the lecture. Say those three lines back to yourself once more — that is the whole trick.',
  'And that is the story. Repeat those three lines out loud once — they are the ones that stay.',
  'That is all of it. Once more, in your head: the three lines above. That is how a lecture becomes memory.'
];

function firstSentence(text, max) {
  const s = clean(text);
  if (!s) return '';
  const m = s.match(/^[^.!?]+[.!?]/);
  let out = m ? m[0] : s;
  if (out.length > max) out = out.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return out.replace(/[.!?]+$/, '');
}

function itemDesc(it, bios) {
  let d = clean(it.desc || it.note || '');
  if (!d && it.type === 'person' && bios[it.name]) d = firstSentence(bios[it.name].bio, 130);
  return d;
}

// Merge every branch's items by type, dedupe (case-insensitive, keep the
// strongest w), and keep only items that actually carry a description — a
// spoken line with nothing after the dash is worse than no line.
function poolOf(layers) {
  const byType = { person: [], event: [], concept: [], org: [], other: [] };
  const seen = {};
  (layers.branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      const type = byType[it.type] ? it.type : 'other';
      const key = type + '|' + clean(it.name).toLowerCase();
      if (seen[key] != null) {
        const prev = byType[type][seen[key]];
        if ((it.w || 0) > (prev.w || 0)) byType[type][seen[key]] = it;
        return;
      }
      seen[key] = byType[type].length;
      byType[type].push(it);
    });
  });
  Object.keys(byType).forEach(function (t) {
    byType[t].sort(function (a, b) { return (b.w || 0) - (a.w || 0); });
  });
  return byType;
}

function beatsOf(items, bios, kind, max, used) {
  const beats = [];
  for (let i = 0; i < items.length && beats.length < max; i++) {
    const it = items[i];
    const name = clean(it.name);
    if (!name || used[name.toLowerCase()]) continue;
    const d = itemDesc(it, bios);
    if (!d) continue;
    used[name.toLowerCase()] = 1;
    beats.push({ kind: kind, text: sentence(name) + ' ' + sentence(d) });
  }
  return beats;
}

function buildLecture(id, layers, revision, bios) {
  const title = cap(layers.name || titleCase(id));
  const pool = poolOf(layers);
  const total = pool.person.length + pool.event.length + pool.concept.length + pool.org.length;
  if (total < MIN_ITEMS) return null;

  const used = {};
  const chapters = [];

  const rev = revision || {};
  const core = clean(rev.summary || (rev.bullets && rev.bullets[0] ? rev.bullets[0].replace(/^[•\s📅]+/, '') : ''));
  const opening = [{ kind: 'title', text: title + '.' }];
  if (core) opening.push({ kind: 'say', text: 'Here is the one-line core: ' + sentence(cap(core)) });
  opening.push({ kind: 'roadmap', text: pickOne(ROADMAP, 'road|' + id) });
  chapters.push({ heading: 'The big picture', beats: opening });

  const people = beatsOf(pool.person, bios, 'person', 6, used);
  if (people.length >= 2) chapters.push({ heading: 'The people who shaped it', beats: people });

  const events = beatsOf(pool.event, bios, 'event', 5, used);
  if (events.length >= 1) chapters.push({ heading: 'The turning points', beats: events });

  const ideas = beatsOf(pool.concept, bios, 'idea', 4, used);
  if (ideas.length >= 2) chapters.push({ heading: 'The ideas to hold', beats: ideas });

  const orgs = beatsOf(pool.org, bios, 'org', 3, used);
  if (orgs.length >= 1) chapters.push({ heading: 'The institutions', beats: orgs });

  // Recap: the three strongest lines said across the lecture, said again --
  // one from each kind of chapter (a face, a turning point, an idea) so the
  // repeat covers the whole story instead of one corner of it.
  const recap = [];
  const recapPools = [people, events, ideas, orgs];
  for (let i = 0; i < recapPools.length && recap.length < 3; i++) {
    if (recapPools[i].length) recap.push(recapPools[i][0]);
  }
  for (let i = 0; i < recapPools.length && recap.length < 3; i++) {
    for (let j = 1; j < recapPools[i].length && recap.length < 3; j++) recap.push(recapPools[i][j]);
  }
  const remember = recap.slice(0, 3).map(function (b) { return { kind: 'remember', text: b.text }; });
  if (!remember.length) return null;
  remember.push({ kind: 'outro', text: pickOne(OUTRO, 'outro|' + id) });
  chapters.push({ heading: 'Remember these', beats: remember });

  if (chapters.length < 3) return null;

  const beatsCount = chapters.reduce(function (n, c) { return n + c.beats.length; }, 0);
  return {
    id: id,
    title: title,
    dek: core ? cap(core) : 'The essentials, spoken.',
    chapters: chapters,
    beats: beatsCount
  };
}

function main() {
  const layersAll = readJSON('data/topic-layers.json');
  const revision = readJSON('data/revision-content.json', {});
  const bios = readJSON('data/person-bios.json', {});

  const built = [];
  const ids = Object.keys(layersAll);
  for (let i = 0; i < ids.length; i++) {
    const lec = buildLecture(ids[i], layersAll[ids[i]], revision[ids[i]], bios);
    if (lec) built.push(lec);
  }
  built.sort(function (a, b) { return b.beats - a.beats; });
  const topics = built.slice(0, MAX_TOPICS);

  if (topics.length < 5) {
    console.error('[lectures] only ' + topics.length + ' usable lectures found — refusing to write');
    process.exit(1);
  }
  topics.forEach(function (t) {
    if (!t.chapters.length) throw new Error('empty lecture: ' + t.id);
    t.chapters.forEach(function (c) {
      if (!c.beats.length) throw new Error('empty chapter in ' + t.id);
      c.beats.forEach(function (b) {
        if (!b.text || b.text.length < 3) throw new Error('bad beat in ' + t.id);
      });
    });
  });

  const out = {
    builtAt: new Date().toISOString(),
    source: 'topic-layers.json + revision-content.json + person-bios.json',
    note: 'Spoken lectures compiled from the topic graph. Deterministic build — variant lines are hashed from the topic id.',
    count: topics.length,
    topics: topics
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log('[lectures] wrote data/lectures.json — ' + topics.length + ' lectures, ' + kb + ' KB');
  console.log('[lectures] top: ' + topics.slice(0, 6).map(function (t) { return t.title + ' (' + t.beats + ')'; }).join(' | '));
  if (process.argv.includes('--sample')) {
    const s = topics[0];
    console.log('\n=== SAMPLE: ' + s.title + ' (' + s.dek + ')');
    s.chapters.forEach(function (c) {
      console.log('\n## ' + c.heading);
      c.beats.forEach(function (b) { console.log('  [' + b.kind + '] ' + b.text); });
    });
  }
}

main();

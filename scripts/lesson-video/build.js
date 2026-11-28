#!/usr/bin/env node
'use strict';
/**
 * build.js — lesson lecture videos, gated on the fact audit and content drift.
 *
 * Lifecycle (why an expanded lesson cannot slip into an old video):
 *   1. proseHash changes when a lane expands the lesson.
 *   2. audit-gate marks the lesson ineligible until the fact audit re-certifies
 *      that exact proseHash (audit-lesson-facts.js now records it).
 *   3. once certified, `--changed` sees videoHash != manifest.videoHash and
 *      re-renders, so the video always matches the audited page.
 *
 *   node scripts/lesson-video/build.js --check
 *   node scripts/lesson-video/build.js --lesson upsc/course/.../lesson-x.html --preview
 *   node scripts/lesson-video/build.js --changed --limit 3 --tts piper
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseLesson } = require('../lib/lesson-doc');
const { planLesson } = require('./plan');
const { status, recordAudit } = require('./audit-gate');
const { renderVideo } = require('./render');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'data', 'lesson-videos.json');
const courseRoot = path.join(ROOT, 'upsc', 'course');

function arg(name, fb) { const i = process.argv.indexOf('--' + name); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fb; }
function has(n) { return process.argv.indexOf('--' + n) !== -1; }
const LIMIT = parseInt(arg('limit', '0'), 10) || 0;
const MAX_SLIDES = parseInt(arg('max-slides', '0'), 10) || 0;
const TTS = arg('tts', process.env.LESSON_TTS || 'none');
const PIPER_MODEL = arg('piper-model', process.env.PIPER_MODEL || '');
const PIPER_VOICE = arg('voice', process.env.PIPER_VOICE || 'en_US-lessac-medium');
const PIPER_DATA = process.env.PIPER_DATA_DIR || path.join(ROOT, '.cache', 'piper');
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const WIDTH = parseInt(arg('width', '1280'), 10) || 1280;
const HEIGHT = parseInt(arg('height', '720'), 10) || 720;
const FPS = parseInt(arg('fps', '12'), 10) || 12;

function walk(dir, out) {
  out = out || [];
  let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out;
}
function slug(rel) { return rel.replace(/^upsc\/course\//, '').replace(/\.html$/, '').replace(/[\\/]+/g, '-'); }
function loadManifest() { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { return { generatedAt: '', lessons: {} }; } }
function saveManifest(m) { m.generatedAt = new Date().toISOString(); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + '\n', 'utf8'); }
function exists(p) { try { return fs.existsSync(p) && fs.statSync(p).size > 1000; } catch (e) { return false; } }

function lessonInfo(rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const doc = parseLesson(html, { rel });
  const plan = planLesson(doc, {});
  const gate = status(rel, doc);
  const m = loadManifest();
  const entry = m.lessons[rel] || null;
  const videoPath = entry ? path.join(ROOT, entry.video || '') : '';
  const videoOk = entry && exists(videoPath);
  const stale = !entry || entry.videoHash !== doc.videoHash;
  return { rel, doc, plan, gate, entry, videoOk, stale };
}

async function main() {
  let lessons;
  if (has('lesson')) lessons = [arg('lesson')];
  else lessons = walk(courseRoot).sort();

  if (has('check')) {
    const rows = [];
    for (const rel of lessons) {
      let info; try { info = lessonInfo(rel); } catch (e) { rows.push([rel, 'parse-error', e.message]); continue; }
      const state = !info.gate.eligible ? 'BLOCKED (' + info.gate.reasons[0] + ')'
        : info.stale ? 'STALE (needs render)' : 'OK';
      rows.push([rel, state, info.plan.coverage.pct + '% coverage, ' + info.plan.slides.length + ' slides']);
    }
    for (const r of rows) console.log(r[0] + '  |  ' + r[1] + '  |  ' + r[2]);
    console.log('checked ' + rows.length + ' lesson(s)');
    return;
  }

  const m = loadManifest();
  if (!m.lessons) m.lessons = {};
  let done = 0, skipped = 0, blocked = 0;

  for (const rel of lessons) {
    if (LIMIT && done >= LIMIT) break;
    // Owner's rule: a video is made only after the fact audit. With --audit the
    // lane audits this exact lesson first (and records the certified prose hash);
    // the gate below still refuses if anything is unresolved.
    if (has('audit')) {
      console.log('fact-audit before video: ' + rel);
      const ar = spawnSync(process.execPath, ['scripts/audit-lesson-facts.js', '--file', rel, '--apply'],
        { cwd: ROOT, stdio: 'inherit', env: process.env });
      if (ar.error) console.error('  audit could not start: ' + ar.error.message);
      else if (ar.status !== 0) console.log('  audit exited ' + ar.status + ' (the gate still decides)');
    }
    let info;
    try { info = lessonInfo(rel); } catch (e) { console.error('skip ' + rel + ': ' + e.message); skipped++; continue; }

    if (has('record-audit')) {
      const rec = recordAudit(rel, info.doc);
      if (!rec.ok) { console.log('record-audit refused ' + rel + ': ' + rec.reason); }
      else { console.log('recorded audit hash for ' + rel); info = lessonInfo(rel); }
    }

    if (!info.gate.eligible && !has('allow-unaudited')) {
      console.log('BLOCKED ' + rel + ' — ' + info.gate.reasons.join('; '));
      blocked++;
      continue;
    }
    if (has('changed') && !info.stale && !has('force')) { skipped++; continue; }
    if (info.plan.coverage.missing.length) {
      console.error('refuse ' + rel + ': ' + info.plan.coverage.missing.length + ' block(s) not covered by any slide');
      blocked++;
      continue;
    }
    if (has('dry')) {
      console.log('would render ' + rel + ' (' + info.plan.slides.length + ' slides, ' + info.plan.coverage.pct + '% coverage)');
      done++;
      continue;
    }

    let slides = info.plan.slides;
    let truncated = false;
    if (MAX_SLIDES && slides.length > MAX_SLIDES) { slides = slides.slice(0, MAX_SLIDES); truncated = true; }

    const id = slug(rel);
    const preview = has('preview') || has('allow-unaudited') || truncated;
    const outDir = preview ? path.join(ROOT, 'out', 'lesson-video', id) : path.join(ROOT, 'out', 'lesson-video', id);
    fs.mkdirSync(outDir, { recursive: true });
    const manifestRel = path.relative(ROOT, path.join('media', 'lesson-videos', id + '.mp4')).replace(/\\/g, '/');

    console.log('rendering ' + rel + ' → ' + pipelineMsg(slides.length, truncated));
    const t0 = Date.now();
    let audioFiles = null;
    if (TTS === 'piper') {
      try { audioFiles = synthesize(slides, outDir); }
      catch (e) { console.error('piper synthesis failed, rendering silent: ' + e.message); }
    }
    let res;
    try {
      res = await renderVideo(slides, {
        outDir, width: WIDTH, height: HEIGHT, fps: FPS, tts: TTS, piperModel: PIPER_MODEL, audioFiles,
        breadcrumb: [info.doc.exam && info.doc.exam.toUpperCase(), info.doc.subject].filter(Boolean).join(' · '),
        outFile: path.join(outDir, 'lecture.mp4'),
        onProgress: (n, tot, s) => console.log('  [' + n + '/' + tot + '] ' + (s.kind || '') + ' ' + (s.heading || '').slice(0, 48))
      });
    } catch (e) { console.error('render failed ' + rel + ': ' + e.message); skipped++; continue; }

    const dest = path.join(ROOT, 'media', 'lesson-videos', id + '.mp4');
    if (!preview) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(res.video, dest);
    }
    m.lessons[rel] = {
      video: preview ? path.relative(ROOT, res.video).replace(/\\/g, '/') : manifestRel,
      durationSec: res.durationSec,
      slides: res.slides,
      truncated,
      renderedSlides: slides.length,
      proseHash: info.doc.proseHash,
      videoHash: info.doc.videoHash,
      auditedProseHash: info.gate.recordedHash || info.doc.proseHash,
      coverage: info.plan.coverage.pct,
      generatedAt: new Date().toISOString(),
      renderMs: Date.now() - t0
    };
    saveManifest(m);
    console.log('  done: ' + res.video + ' (' + res.durationSec + 's)');
    done++;
  }
  console.log('rendered ' + done + ' | up-to-date ' + skipped + ' | blocked ' + blocked);
}

function pipelineMsg(n, truncated) { return n + ' slides' + (truncated ? ' (preview truncation)' : ''); }

// Batch-synthesize every slide with the repo's Piper wrapper (keeps the voice
// loaded, downloads it on first use). Returns [{file,duration}] for render.js.
function synthesize(slides, outDir) {
  const texts = slides.map((s) => String(s.narration || '').trim());
  const input = path.join(outDir, 'narration.json');
  const vdir = path.join(outDir, 'vo');
  fs.mkdirSync(vdir, { recursive: true });
  fs.writeFileSync(input, JSON.stringify({ texts }, null, 1), 'utf8');
  const r = spawnSync(PYTHON, ['scripts/film/piper-tts.py', '--input', input, '--out-dir', vdir,
    '--voice', PIPER_VOICE, '--data-dir', PIPER_DATA], { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('piper synthesis failed (' + r.status + ')');
  const durations = JSON.parse(fs.readFileSync(path.join(vdir, 'durations.json'), 'utf8')).durations;
  return texts.map((t, i) => ({ file: path.join(vdir, 'audio-' + String(i).padStart(4, '0') + '.wav'), duration: durations[i] || 0 }));
}

main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });
#!/usr/bin/env node
/*
 * The film topic brain.
 *
 * One idea source was never enough. The news selector is the first choice:
 * it carries what is happening now and already refuses a single-outlet story
 * without an official document. When the feeds are quiet or every candidate
 * fails that gate, this reads data/films/topic-bank.json, an authored list of
 * real, well-documented subjects, and promotes one brief to the slate.
 *
 * It does not write prose and it does not decide truth. A bank entry is an
 * idea plus a source trail. Before promotion every source URL must return
 * HTTP 200 (at least five live sources), and author.yml still has to fetch the
 * pages, build the evidence ledger and pass validate-film. The bank exists so
 * the pipeline chooses a proper topic instead of stalling, not so it can skip
 * research.
 *
 * Usage:
 *   node scripts/film/topic-brain.js
 *   node scripts/film/topic-brain.js --json
 *   node scripts/film/topic-brain.js --dry-run
 *   node scripts/film/topic-brain.js --skip-news
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const BANK = path.join(FILMS, 'topic-bank.json');
const OUT = path.join(ROOT, 'out', 'autopilot');
const PENDING = ['research', 'authoring', 'ready', 'storyboard'];
const SOURCE_TIMEOUT_MS = 15000;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Cannot read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function hasPending(slate) {
  return (slate.topics || []).find((topic) => PENDING.includes(topic.status));
}

function knownIds(slate) {
  const ids = new Set((slate.topics || []).map((topic) => topic.id));
  if (fs.existsSync(FILMS)) {
    for (const name of fs.readdirSync(FILMS)) {
      if (name.endsWith('.json') && !name.endsWith('-debates.json')) {
        ids.add(name.replace(/\.json$/, ''));
      }
    }
  }
  const videoData = readJson(path.join(ROOT, 'data', 'lecture-videos.json'), { videos: {} });
  const videos = videoData && videoData.videos ? videoData.videos : {};
  const published = Array.isArray(videos)
    ? videos.map((entry) => entry.film || entry.id).filter(Boolean)
    : Object.keys(videos);
  for (const id of published) ids.add(id);
  return ids;
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'dimsred-topic-brain/1.0 (+https://github.com/renj-arch/dimsred)' },
    });
    return { url, status: res.status, ok: res.status === 200 };
  } catch (err) {
    return { url, status: 'ERR', ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function verify(sources) {
  const unique = [...new Set(sources.filter((url) => /^https?:\/\//.test(url)))];
  const checks = await Promise.all(unique.map(probe));
  const live = checks.filter((check) => check.ok);
  return { checks, live, ok: live.length >= 5 && live.length === unique.length };
}

/*
 * News first. news.js writes candidates and, with --slate, appends only the
 * stories that clear its second-outlet or official-document gate. If it adds
 * one, the brain stops there.
 */
function tryNews(slate, dryRun) {
  const args = [path.join(ROOT, 'scripts', 'film', 'news.js'), '--days', '4', '--limit', '12'];
  if (!dryRun) args.push('--slate', '2');
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    env: process.env,
  });
  if (res.status !== 0) {
    return { added: false, log: (res.stderr || res.stdout || '').trim() };
  }
  const after = readJson(SLATE);
  const added = (after.topics || []).filter((topic) => !(slate.topics || []).some((old) => old.id === topic.id));
  return { added: added.length > 0, topics: added, log: (res.stdout || '').trim() };
}

async function tryBank(slate, dryRun) {
  const bank = readJson(BANK);
  if (!Array.isArray(bank.topics)) throw new Error('topic bank has no topics array');
  const known = knownIds(slate);
  const ranked = bank.topics
    .filter((topic) => topic.id && !known.has(topic.id))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const rejected = [];
  for (const topic of ranked) {
    if (!Array.isArray(topic.sources) || topic.sources.length < 5) {
      rejected.push({ id: topic.id, reason: 'fewer than five sources' });
      continue;
    }
    const checked = await verify(topic.sources);
    if (!checked.ok) {
      rejected.push({
        id: topic.id,
        reason: checked.live.length !== checked.checks.length
          ? 'a source did not return HTTP 200'
          : 'fewer than five live sources',
        dead: checked.checks.filter((check) => !check.ok),
      });
      continue;
    }

    if (!dryRun) {
      let priority = Math.max(0, ...(slate.topics || []).map((entry) => Number(entry.priority) || 0));
      slate.topics.push({
        id: topic.id,
        title: topic.title,
        status: 'research',
        priority: priority + 1,
        found: 'bank',
        category: topic.category,
        firstSeen: new Date().toISOString().slice(0, 10),
        why: topic.why,
        angle: topic.angle,
        sources: topic.sources.slice(),
      });
      slate.updated = new Date().toISOString().slice(0, 10);
      writeJson(SLATE, slate);
    }
    return { added: true, topic, checked, rejected };
  }
  return { added: false, rejected };
}

async function main() {
  const json = process.argv.includes('--json');
  const dryRun = process.argv.includes('--dry-run');
  const skipNews = process.argv.includes('--skip-news');

  const slate = readJson(SLATE);
  if (!Array.isArray(slate.topics)) throw new Error('data/film-slate.json has no topics array');

  const pending = hasPending(slate);
  if (pending) {
    const result = {
      kind: 'pending',
      topic: pending,
      message: `Slate already has ${pending.id} at status ${pending.status}; the brain adds nothing.`,
    };
    if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else process.stdout.write(`topic-brain: ${result.message}\n`);
    return;
  }

  const report = { kind: 'none', generatedAt: new Date().toISOString(), dryRun };

  if (!skipNews) {
    const news = tryNews(slate, dryRun);
    report.news = news;
    if (news.added) {
      report.kind = 'news';
      report.topics = news.topics;
      if (!json) {
        process.stdout.write(`topic-brain: news added ${news.topics.map((topic) => topic.id).join(', ')}\n`);
      }
    } else if (!json) {
      process.stdout.write(`topic-brain: no qualified news story${news.log ? ` (${news.log.split('\n')[0]})` : ''}\n`);
    }
  }

  if (report.kind === 'none') {
    const bank = await tryBank(slate, dryRun);
    report.bank = bank;
    if (bank.added) {
      report.kind = 'bank';
      report.topic = bank.topic;
      if (!json) {
        process.stdout.write(
          `topic-brain: bank added ${bank.topic.id} with ${bank.checked.live.length} live sources\n`
        );
      }
    } else {
      report.kind = 'empty';
      if (!json) {
        process.stdout.write('topic-brain: no qualified news story and no live bank brief; leaving the slate alone\n');
        for (const item of bank.rejected) {
          process.stdout.write(`  skip ${item.id}: ${item.reason}\n`);
        }
      }
    }
  }

  writeJson(path.join(OUT, 'topic-brain.json'), report);
  if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  /*
   * An empty brain is not a fatal error: the existing invent pass may still
   * find a story. The run log and the artifact make the miss visible.
   */
  if (report.kind === 'empty') {
    process.stdout.write('topic-brain: no brief promoted this run\n');
  }
}

main().catch((err) => {
  console.error(`topic-brain: ${err.message}`);
  process.exitCode = 1;
});

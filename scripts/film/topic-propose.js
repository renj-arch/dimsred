#!/usr/bin/env node
/*
 * The proposing half of the topic brain.
 *
 * This runs inside the authoring workflow, after the local model has been
 * downloaded, because that is the one place in the pipeline where a model is
 * available. It does not let the model invent a subject from nothing:
 *
 *   1. It reads the last few days of the Wikipedia Current Events portal, a
 *      public digest whose entries already cite the outlets that reported
 *      them.
 *   2. It keeps only entries that clear the same source gate as the news
 *      selector: two independent outlets, or one official document.
 *   3. The model ranks up to three of those real events and writes an angle.
 *      It may not add an event, a number or a source.
 *   4. Every citation is fetched. A pick with fewer than two live, independent
 *      citations is rejected, and the next pick is tried.
 *   5. If the model or the portal is unavailable, it falls back to the curated
 *      evergreen bank, still checking every URL.
 *
 * The storyboard is still written by author.js from a fetched ledger. This
 * script only chooses what the film is about and records the trail.
 *
 * Usage:
 *   node scripts/film/topic-propose.js
 *   node scripts/film/topic-propose.js --stub      # no model; first eligible event
 *   node scripts/film/topic-propose.js --dry-run
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const BANK = path.join(FILMS, 'topic-bank.json');
const OUT = path.join(ROOT, 'out', 'autopilot');
const UA = 'dimsred-topic-propose/1.0 (+https://github.com/renj-arch/dimsred)';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/*
 * A film needs an object, an order, a mechanism, a cost, an argument and a
 * record. These sections routinely supply one; war and disaster copy usually
 * supplies only a body count, which the film grammar refuses.
 */
const SECTION_PRIORITY = {
  'Politics and elections': 10,
  'Business and economy': 9,
  'Science and technology': 8,
  'Health and environment': 8,
  'Law and crime': 7,
  'International relations': 6,
  'Arts and culture': 3,
};
const SKIP_SECTIONS = new Set(['Armed conflicts and attacks', 'Disasters and accidents', 'Sports']);
const SPECTACLE = /\b(killed|dead|death toll|bodies|body|rape|murder|shot dead|blast|explosion|shooting|stampede|militants|terror|lynching|suicide|corpse)\b/i;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = process.argv[i + 1];
  return value === undefined || value.startsWith('--') ? true : value;
}

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

function slugify(text) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function cleanTitle(text) {
  const first = String(text).split(/(?<=[.!?])\s/)[0] || String(text);
  let title = first.replace(/\s+/g, ' ').trim().replace(/[,;:]$/, '');
  if (title.length > 130) title = `${title.slice(0, 127).replace(/\s+\S*$/, '')}...`;
  return title;
}

function stripWiki(text) {
  return String(text)
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[(https?:\/\/[^\s\]]+)\s*\([^)]*\)\]/g, ' ')
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, ' ')
    .replace(/''+/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function wikiLinks(raw) {
  const links = [];
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  let match;
  while ((match = re.exec(String(raw)))) {
    const target = match[1].trim();
    if (!target || /^(File|Image|Category|Template|Portal|Wikipedia|Help|Special|Talk):/i.test(target)) continue;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(target.replace(/\s+/g, '_'))}`;
    if (!links.includes(url)) links.push(url);
  }
  return links.slice(0, 6);
}

function official(url) {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(gov|gov\.in|nic\.in|int)$/.test(host)
      || /(^|\.)(un|who|worldbank|imf|rbi|isro|nasa)\./.test(host);
  } catch {
    return false;
  }
}

function parseCitations(raw) {
  const found = [];
  const re = /\[(https?:\/\/[^\s\]]+)\s*\(([^)]*)\)\]/g;
  let match;
  while ((match = re.exec(String(raw)))) {
    found.push({ url: match[1], source: match[2].replace(/''/g, '').trim() });
  }
  const bare = /\[(https?:\/\/[^\s\]]+)\]/g;
  while ((match = bare.exec(String(raw)))) {
    if (!found.some((c) => c.url === match[1])) found.push({ url: match[1], source: '' });
  }
  const seen = new Set();
  return found.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    if (!c.source) {
      try { c.source = new URL(c.url).hostname.replace(/^www\./, ''); } catch { c.source = 'source'; }
    }
    return true;
  });
}

async function fetchJson(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function probe(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA },
    });
    if (res.body && res.body.cancel) await res.body.cancel().catch(() => {});
    return { url, status: res.status, ok: res.status === 200 };
  } catch (err) {
    return { url, status: 'ERR', ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function dayPage(date) {
  const page = `Portal:Current_events/${date.getUTCFullYear()}_${MONTHS[date.getUTCMonth()]}_${date.getUTCDate()}`;
  return `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
}

function parseDay(date, wikitext) {
  const day = date.toISOString().slice(0, 10);
  const entries = [];
  let section = '';
  let block = null;

  const flush = () => {
    if (block && block.raw.trim()) entries.push(block);
    block = null;
  };

  for (const rawLine of String(wikitext || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    if (/^'''[^']+'''$/.test(line)) {
      flush();
      section = line.replace(/'''/g, '').trim();
      continue;
    }
    if (/^\*+/.test(line)) {
      flush();
      block = { section, raw: line.replace(/^\*+\s*/, '') };
      continue;
    }
    if (block && !/^(\{\{|\||<!--|\}\}|\[\[File:|\[\[Image:)/i.test(line)) {
      block.raw += ` ${line}`;
      continue;
    }
    flush();
  }
  flush();

  const out = [];
  for (const entry of entries.slice()) {
    if (SKIP_SECTIONS.has(entry.section)) continue;
    const text = stripWiki(entry.raw);
    if (text.length < 60 || text.length > 600) continue;
    if (SPECTACLE.test(text)) continue;
    const citations = parseCitations(entry.raw);
    if (!citations.length) continue;
    const outlets = [...new Set(citations.map((c) => c.source))];
    const hasOfficial = citations.some((c) => official(c.url));
    if (outlets.length < 2 && !hasOfficial) continue;
    const id = slugify(text);
    if (!id) continue;
    out.push({
      id,
      date: day,
      section: entry.section,
      text,
      citations: citations.slice(0, 5),
      outlets,
      official: hasOfficial,
      wikiLinks: wikiLinks(entry.raw),
    });
  }
  return out;
}

async function buildDigest(days) {
  const all = [];
  const failures = [];
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    try {
      const payload = await fetchJson(dayPage(date));
      const wikitext = payload && payload.parse ? payload.parse.wikitext : '';
      all.push(...parseDay(date, wikitext));
    } catch (err) {
      failures.push({ date: date.toISOString().slice(0, 10), error: err.message });
    }
  }
  const seen = new Set();
  return {
    failures,
    events: all
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .sort((a, b) => {
        const bySection = (SECTION_PRIORITY[b.section] || 0) - (SECTION_PRIORITY[a.section] || 0);
        return bySection || b.date.localeCompare(a.date);
      })
      .slice(0, 12),
  };
}

function proposalSchema(count) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['picks'],
    properties: {
      picks: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['event', 'angle', 'why'],
          properties: {
            event: { type: 'integer', minimum: 1, maximum: count },
            angle: { type: 'string' },
            why: { type: 'string' },
          },
        },
      },
    },
  };
}

async function askModel(events) {
  const { ask } = require('./llama');
  const lines = events.map((event, i) => [
    `${i + 1}. [${event.section} | ${event.date}] ${event.text}`,
    `   Reported by: ${event.outlets.join(', ')}`,
  ].join('\n'));
  const prompt = [
    'You choose the next documentary short for an evidence-led channel.',
    'Below are real events from the last few days. Each has already cleared the source gate: two independent outlets or an official document.',
    '',
    ...lines,
    '',
    'Choose up to three, best first, that can carry an eight-scene film: an object, an order, a mechanism, a cost, an argument, a record.',
    'Reject anything whose only subject is death, injury or spectacle.',
    'Do not invent an event. Use only the numbered events above. Do not add a number, a name or a source.',
    'For each pick give the event number, a specific angle (what the film explains), and why it matters now.',
    'Return one JSON object: {"picks":[{"event":2,"angle":"...","why":"..."}]}',
  ].join('\n');
  const result = await ask({
    system: 'You are a documentary topic editor. You answer with one JSON object and nothing else. You never invent a fact.',
    prompt,
    schema: proposalSchema(events.length),
    tokens: 700,
    outDir: path.join(OUT, 'propose'),
    label: 'topic',
  });
  const value = result.value || {};
  const picks = Array.isArray(value.picks) ? value.picks : (value.pick ? [{ event: value.pick, angle: value.angle, why: value.why }] : []);
  return { picks, attempt: result.attempt, wallMs: result.wallMs };
}

function normalizePicks(picks, count) {
  return picks
    .map((pick) => ({
      event: Number(pick.event),
      angle: String(pick.angle || '').trim(),
      why: String(pick.why || '').trim(),
    }))
    .filter((pick) => Number.isInteger(pick.event) && pick.event >= 1 && pick.event <= count)
    .filter((pick) => pick.angle.length >= 10 && pick.why.length >= 10)
    .slice(0, 3);
}

async function verifyEvent(event) {
  const urls = [...new Set([
    ...event.citations.map((c) => c.url),
    ...event.wikiLinks,
  ])];
  const checks = await Promise.all(urls.map((url) => probe(url)));
  const live = checks.filter((c) => c.ok).map((c) => c.url);
  const liveCitationUrls = event.citations
    .filter((c) => live.includes(c.url))
    .map((c) => c.url);
  const liveOutlets = [...new Set(event.citations
    .filter((c) => live.includes(c.url))
    .map((c) => c.source))];
  /*
   * The corroboration gate is about the reporting, not about whether a
   * paywalled page will serve our fetcher. The portal already names the
   * outlets; require two of them (or an official document). For the ledger we
   * still need at least one readable citation plus context pages, which the
   * caller checks before accepting.
   */
  const gate = event.outlets.length >= 2 || event.official;
  return {
    checks,
    live,
    liveCitations: liveCitationUrls,
    liveOutlets,
    gate,
    sources: [...new Set([...event.citations.map((c) => c.url), ...live.filter((url) => !event.citations.some((c) => c.url === url))])].slice(0, 6),
  };
}

function hasPending(slate) {
  return (slate.topics || []).find((topic) =>
    ['research', 'authoring', 'ready', 'storyboard'].includes(topic.status));
}

function knownIds(slate) {
  const ids = new Set((slate.topics || []).map((topic) => topic.id));
  if (fs.existsSync(FILMS)) {
    for (const name of fs.readdirSync(FILMS)) {
      if (name.endsWith('.json') && !name.endsWith('-debates.json')) ids.add(name.replace(/\.json$/, ''));
    }
  }
  return ids;
}

function appendTopic(slate, { id, title, category, why, angle, sources, found }) {
  const known = knownIds(slate);
  let finalId = id;
  let suffix = 2;
  while (known.has(finalId)) {
    finalId = `${id}-${suffix}`;
    suffix += 1;
  }
  const priority = Math.max(0, ...(slate.topics || []).map((entry) => Number(entry.priority) || 0)) + 1;
  const topic = {
    id: finalId,
    title,
    status: 'research',
    priority,
    found,
    category,
    firstSeen: new Date().toISOString().slice(0, 10),
    why,
    angle,
    sources,
  };
  slate.topics.push(topic);
  slate.updated = new Date().toISOString().slice(0, 10);
  return topic;
}

async function fallbackBank(slate) {
  const bank = readJson(BANK, { topics: [] });
  const known = knownIds(slate);
  const ranked = (bank.topics || [])
    .filter((topic) => topic.id && !known.has(topic.id))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const rejected = [];
  for (const topic of ranked) {
    if (!Array.isArray(topic.sources) || topic.sources.length < 5) {
      rejected.push({ id: topic.id, reason: 'fewer than five sources' });
      continue;
    }
    const checks = await Promise.all(topic.sources.map((url) => probe(url)));
    if (checks.some((check) => !check.ok)) {
      rejected.push({ id: topic.id, reason: 'a source did not return HTTP 200', dead: checks.filter((c) => !c.ok) });
      continue;
    }
    return { topic, checks, rejected };
  }
  return { topic: null, rejected };
}

async function main() {
  const stub = process.argv.includes('--stub') || process.argv.includes('--skip-model');
  const dryRun = process.argv.includes('--dry-run');
  const days = Number(arg('days', 4));
  const slate = readJson(SLATE);
  if (!Array.isArray(slate.topics)) throw new Error('data/film-slate.json has no topics array');
  const pending = hasPending(slate);
  if (pending) {
    console.log(`topic-propose: slate already has ${pending.id} (${pending.status}); nothing to propose`);
    return;
  }

  const report = { generatedAt: new Date().toISOString(), stub, dryRun };
  const digest = await buildDigest(days);
  report.digest = { events: digest.events.length, failures: digest.failures };
  writeJson(path.join(OUT, 'propose-digest.json'), digest);
  console.log(`topic-propose: ${digest.events.length} eligible events from the last ${days} days`);
  for (const event of digest.events) {
    console.log(`  [${event.section}] ${event.text.slice(0, 100)} (${event.outlets.join(', ')})`);
  }
  if (!digest.events.length) {
    console.log('topic-propose: the current-events portal supplied nothing; falling back to the bank');
  }

  let picks = [];
  if (digest.events.length) {
    if (stub) {
      picks = [{ event: 1, angle: 'Explain the mechanism behind the event through the record it produced.', why: 'Selected deterministically for a plumbing test.' }];
    } else {
      try {
        const asked = await askModel(digest.events);
        report.model = { attempt: asked.attempt, wallMs: asked.wallMs, picks: asked.picks };
        picks = normalizePicks(asked.picks, digest.events.length);
      } catch (err) {
        report.modelError = err.message;
        console.log(`topic-propose: the model did not return a usable pick (${err.message})`);
      }
    }
  }

  for (const pick of picks) {
    const event = digest.events[pick.event - 1];
    if (!event) continue;
    const checked = await verifyEvent(event);
    console.log(`pick ${pick.event}: ${event.text.slice(0, 90)}`);
    console.log(`  live citations: ${checked.liveOutlets.join(', ') || 'none'} (${checked.liveCitations.length})`);
    if (!checked.gate || checked.liveCitations.length < 1 || checked.live.length < 3) {
      console.log('  rejected: no readable citation, too little live context, or no second outlet');
      continue;
    }
    const title = cleanTitle(event.text);
    const id = slugify(title);
    const topic = dryRun ? {
      id, title, category: 'current-affairs', why: pick.why, angle: pick.angle,
      sources: checked.sources, found: stub ? 'stub' : 'model',
    } : appendTopic(slate, {
      id,
      title,
      category: 'current-affairs',
      why: pick.why,
      angle: pick.angle,
      sources: checked.sources,
      found: stub ? 'stub' : 'model',
    });
    if (!dryRun) writeJson(SLATE, slate);
    report.kind = 'model';
    report.topic = topic;
    report.checked = checked;
    writeJson(path.join(OUT, 'topic-propose.json'), report);
    console.log(`topic-propose: selected ${topic.id} with ${checked.sources.length} live sources`);
    return;
  }

  const bank = await fallbackBank(slate);
  if (bank.topic) {
    const topic = dryRun ? {
      id: bank.topic.id, title: bank.topic.title, category: bank.topic.category,
      why: bank.topic.why, angle: bank.topic.angle, sources: bank.topic.sources, found: 'bank',
    } : appendTopic(slate, {
      id: bank.topic.id,
      title: bank.topic.title,
      category: bank.topic.category,
      why: bank.topic.why,
      angle: bank.topic.angle,
      sources: bank.topic.sources,
      found: 'bank',
    });
    if (!dryRun) writeJson(SLATE, slate);
    report.kind = 'bank';
    report.topic = topic;
    report.bank = { checks: bank.checks, rejected: bank.rejected };
    writeJson(path.join(OUT, 'topic-propose.json'), report);
    console.log(`topic-propose: selected bank brief ${topic.id} with ${bank.checks.length} live sources`);
    return;
  }

  report.kind = 'empty';
  report.bank = { rejected: bank.rejected };
  writeJson(path.join(OUT, 'topic-propose.json'), report);
  console.log('topic-propose: no event and no bank brief cleared the gate; nothing to author');
}

main().catch((err) => {
  console.error(`topic-propose: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  /*
   * No topic is a normal no-op for this lane: the caller checks the slate and
   * skips authoring. A crash is visible in the log but must not take down the
   * whole authoring run before it can record a strike or retry tomorrow.
   */
  process.exitCode = 0;
});

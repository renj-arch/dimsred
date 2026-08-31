const fs = require('fs');
const path = require('path');
const https = require('https');
const { readQuizQuestions, writeQuiz } = require('./lib/quiz-store');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = process.env.QUIZ_PATH || 'data/quiz.json';
const LINK_POOL_PATH = process.env.WIKI_LINK_POOL_PATH || path.join(path.dirname(QUIZ_PATH), 'wiki-link-pool.json');
// Cache of Category:XXX member lists discovered by past chunk jobs. All 27 chunk
// jobs run in parallel and previously each independently re-fetched the members
// of all 115 categories over the network, which both wasted the API budget and
// burned the per-run discovery deadline sequentially. Persisting the member list
// per category lets the first job that discovers a category seed this cache and
// every other job read it instantly instead of re-fetching.
const CAT_MEMBER_CACHE_PATH = process.env.WIKI_CAT_MEMBER_CACHE_PATH || path.join(path.dirname(QUIZ_PATH), 'wiki-category-members.json');

// Wall-clock deadline shared by every fetch/processing loop so a chunk can never
// run past WIKI_FILL_TIME_BUDGET_MIN and get killed by the runner's hard
// timeout (run #434: 10 chunks hit the 360-min cap, cancelling merge+finalize
// and discarding 17 successful chunks' data). Module-scope so fetchAllTopics()
// workers can also honour it mid-batch.
const RUN_START = Date.now();
const TIME_BUDGET_MS = parseInt(process.env.WIKI_FILL_TIME_BUDGET_MIN || '0', 10) * 60000;

// Reserve a guaranteed generation window by capping how much of the run's
// wall-clock budget discovery (category members + recursive link traversal) may
// consume. Discovery spins up an ever-bigger frontier (deep categories, list
// pages, 500 links/article) that could otherwise eat the whole chunk window and
// yield 0 questions; the link/category pools are persisted across runs, so
// anything not reached this run is simply re-mined next run — no data lost.
// Default: cap discovery at 35% of the run budget, guaranteeing ~65% for mining.
const DISCOVERY_BUDGET_MS = parseInt(process.env.WIKI_FILL_DISCOVERY_BUDGET_PCT || '35', 10) / 100 * TIME_BUDGET_MS;
function discoveryDeadline() { return RUN_START + DISCOVERY_BUDGET_MS; }

function log(msg) {
  try { fs.writeSync(1, msg + '\n'); } catch (e) { console.log(msg); }
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          const err = new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 120));
          err.statusCode = res.statusCode;
          const ra = res.headers['retry-after'];
          if (ra) {
            const secs = parseInt(ra, 10);
            if (!isNaN(secs) && secs > 0) err.retryAfter = secs;
          }
          return reject(err);
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('not valid JSON: ' + data.substring(0, 120))); }
      });
    }).on('error', reject);
  });
}

async function fetchPageLinks(title, maxLinks) {
  if (maxLinks === undefined) maxLinks = parseInt(process.env.WIKI_FILL_LINK_FETCH || '500', 10) || 500;
  const links = [];
  let plcontinue = '';
  while (links.length < maxLinks) {
    await delay(parseInt(process.env.WIKI_FILL_LINK_DELAY_MS || '300', 10));
    let url = `${WIKI_API}?action=query&prop=links&titles=${encodeURIComponent(title)}&pllimit=500&format=json&plnamespace=0`;
    if (plcontinue) url += '&plcontinue=' + encodeURIComponent(plcontinue);
    try {
      const d = await fetchJSON(url);
      const pages = d.query ? d.query.pages : {};
      const page = Object.values(pages).find(p => p && p.links);
      if (!page || !page.links) break;
      for (const l of page.links) {
        // Keep list pages and navigational sub-pages too — they can be rich fact
        // sources (e.g. "List of Prime Ministers", "List of Ramsar sites in India").
        if (!l.title.includes('/')) {
          links.push(l.title);
          if (links.length >= maxLinks) break;
        }
      }
      plcontinue = d.continue?.plcontinue;
      if (!plcontinue) break;
    } catch { break; }
  }
  return links;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchCategoryMembers(wikiCat, maxPages = parseInt(process.env.WIKI_FILL_MAX_PAGES || '1000000', 10), sliceMs = 0) {
  // Traverse the category tree recursively: fetch direct pages AND subcategory
  // names, then descend into each subcategory. This is how content that lives in
  // nested categories (e.g. Pushtimarga inside Bhakti_movement -> Vaishnavism)
  // gets discovered, instead of being limited to direct members only.
  // sliceMs (0 = use the global discovery deadline): when Phase 1 runs discovery
  // sequentially across dozens of categories, the GLOBAL discovery budget gets
  // consumed by the first few categories, leaving the rest empty — so the once
  // per-run budget is apportioned to each category here (fair slice) to ensure
  // EVERY category gets some discovery instead of the early ones monopolizing it.
  const MAX_DEPTH = parseInt(process.env.WIKI_FILL_CAT_DEPTH || '30', 10) || 30;
  const pages = new Set();
  const visitedCats = new Set();
  const queue = [{ cat: wikiCat, depth: 0 }];
  // Per-category discovery deadline: when a fair slice is given, discovery for
  // THIS category stops after its own slice so every category gets a chance in
  // the same run. Otherwise fall back to the global discovery deadline.
  const catDeadline = sliceMs > 0 ? Date.now() + sliceMs : discoveryDeadline();

  while (queue.length && pages.size < maxPages) {
    const { cat, depth } = queue.shift();
    const catKey = cat.toLowerCase();
    if (depth > MAX_DEPTH || visitedCats.has(catKey)) continue;
    visitedCats.add(catKey);
    if (DISCOVERY_BUDGET_MS && Date.now() > catDeadline) {
      log('    (stopping category discovery: reachable budget for this category used, reserving time for mining)');
      break;
    }

    let cmcontinue = '';
    let pageNum = 0;
    while (pages.size < maxPages) {
      if (DISCOVERY_BUDGET_MS && Date.now() > catDeadline) {
        log('    (stopping category members: reachable budget for this category used, reserving time for mining)');
        break;
      }
      pageNum++;
      log('    page ' + pageNum + ' (cat ' + cat + ' depth ' + depth + ', ' + pages.size + ' topics so far)');
      let url = `${WIKI_API}?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + cat)}&cmlimit=500&format=json&cmtype=page|subcat`;
      if (cmcontinue) url += '&cmcontinue=' + encodeURIComponent(cmcontinue);
      try {
        const d = await fetchJSON(url);
        for (const m of d.query.categorymembers) {
          if (m.ns === 0) {
            // Keep list pages too ("List of ...") — they are often rich fact
            // sources (e.g. "List of Ramsar sites in India"). Only drop
            // sub-page / file namespace noise.
            if (!m.title.includes(':')) pages.add(m.title);
          } else if (m.ns === 14) {
            queue.push({
              cat: m.title.replace(/^Category:/, ''),
              depth: depth + 1,
            });
          }
        }
        cmcontinue = d.continue?.cmcontinue;
        if (!cmcontinue) break;
        await delay(parseInt(process.env.WIKI_FILL_CAT_DELAY_MS || '300', 10));
      } catch { break; }
    }
  }

  log('    done: ' + pages.size + ' topics');
  return [...pages];
}

async function fetchAllTopics(topics, concurrency, skip) {
  const results = [];
  const queue = [...topics];
  async function worker() {
    while (queue.length > 0) {
      // Honour the shared wall-clock deadline even mid-batch: a huge category's
      // topic fetch could otherwise burn past TIME_BUDGET_MS into the runner's
      // hard timeout. Leftover topics stay un-fetched and are re-picked next run.
      if (TIME_BUDGET_MS && Date.now() - RUN_START > TIME_BUDGET_MS) {
        return;
      }
      const topic = queue.shift();
      // Skip topics the caller wants excluded (e.g. already-covered link pages)
      // BEFORE the HTTP request — the fetch is the expensive part.
      if (skip && skip(topic)) {
        log('  (skip already covered: ' + topic + ')');
        continue;
      }
      log('  Fetching: ' + topic + '...');
      try {
        const a = await fetchArticleExtract(topic);
        if (a && a.extract.length > 200) {
          results.push(a);
          log('  \u2713 ' + topic);
        } else {
          log('  (skip) ' + topic);
        }
      } catch (err) {
        // Never let a single article's non-retryable error abort the whole chunk:
        // log and continue so questions already mined this run are still saved.
        log('  (error fetching ' + topic + ': ' + (err && (err.message || err.code) ? (err.message || err.code) : err) + ')');
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, topics.length); i++) {
    await delay(parseInt(process.env.WIKI_FILL_STAGGER_MS || '1500', 10));
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function fetchArticleExtract(title, retries) {
  retries = retries || 12;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await delay(parseInt(process.env.WIKI_FILL_DELAY_MS || '4000', 10));
      const url = `${WIKI_API}?action=query&prop=extracts|description|revisions&explaintext&exlimit=1&rvprop=content&rvslots=main&titles=${encodeURIComponent(title)}&format=json&formatversion=2`;
      const data = await fetchJSON(url);
      const pages = data.query ? data.query.pages : {};
      const page = Array.isArray(pages) ? pages.find(p => p && p.title && !p.missing) : Object.values(pages).find(p => p && p.title && !p.missing);
      if (page) {
        const wv = page.revisions && page.revisions[0] && page.revisions[0].slots && page.revisions[0].slots.main && page.revisions[0].slots.main.content;
        return {
          title: page.title,
          raw: page.extract || '',
          extract: (page.extract || '').replace(/\s+/g, ' ').trim(),
          description: (page.description || '').replace(/\s+/g, ' ').trim(),
          wikitext: wv || '',
        };
      }
      return null;
    } catch (err) {
      const is5xx = err.statusCode >= 500 && err.statusCode < 600;
      const isRetryable = err.message.includes('429') || err.message.includes('not valid JSON') || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || is5xx;
      const is429 = err.statusCode === 429 || err.message.includes('429');
      if (attempt < retries - 1 && isRetryable) {
        // Honor Retry-After when the API supplies it; otherwise exponential backoff.
        const base = (is429 && err.retryAfter) ? err.retryAfter * 1000 : Math.min(30000 * Math.pow(2, attempt), 120000);
        const wait = base + Math.floor(Math.random() * 2000);
        log('  (HTTP ' + (err.statusCode || err.code || '') + ', waiting ' + Math.round(wait / 1000) + 's...)');
        await delay(wait);
        continue;
      }
      // Don't kill the whole run over a rate-limit/server-error burst: skip the
      // article and let the next run resume it (generation is deterministic + deduped).
      if (is429 || is5xx) {
        log('  (skipping ' + title + ' — persistent HTTP ' + (err.statusCode || err.code || 'err') + ' despite ' + retries + ' attempts)');
        return null;
      }
      throw err;
    }
  }
  return null;
}

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

// Detect table/list row fragments: high comma density, starts with year/name, etc.
function isBadSentence(s) {
  const t = s.trim();
  if (t.length < 20) return true;
  // Comma density > 1 per 15 chars → table row
  const commaCount = (t.match(/,/g) || []).length;
  if (commaCount > 0 && t.length / commaCount < 15) return true;
  // Starts with a year+comma pattern like "1923, Robert..."
  if (/^\d{4}[,\.]\s/.test(t)) return true;
  // Starts with "List of" or "This is a list"
  if (/^(List of|This is a list|The following is a list)/i.test(t)) return true;
  // Contains "William" "Shakespeare" etc — abbreviation period fragments
  // e.g. " Robert A" after splitting on "Robert A. Millikan"
  if (/^[,\s]*[A-Z][a-z]+\s+[A-Z]\.?\s*$/.test(t)) return true;
  // More than 3 entities separated by commas: "Physics, United States, Nobel"
  if (commaCount >= 2 && /^[A-Z][a-z]+[\s,]+[A-Z]/.test(t) && t.length < 60) return true;
  // Fragment ending with parenthesized content: "Name Name (year" or "Name ("
  if (/\([\dA-Z]/.test(t) && t.length < 40) return true;
  // Starts with a name and comma then another name (list entry)
  if (/^[A-Z][a-z]+[,\s]+[A-Z][a-z]+[,\s]+/.test(t) && !/\b(?:and|or|the|was|were|is|are|has|have|had)\b/i.test(t)) return true;
  // Wikipedia section markup ("== See also ==", "== Notes ==", etc.)
  if (/==\s*\w/.test(t)) return true;
  // Boilerplate section headers
  if (/^(See also|References|Notes|External links|Further reading|Bibliography|Sources)\b/i.test(t)) return true;
  // Citation boilerplate: "Archived from the original", "Retrieved", "Retrieved from"
  if (/^(Archived from|Retrieved\s|Retrieved from)/i.test(t)) return true;
  // Citation entry: "Name, Name (date)" or "Surname, Firstname (date)"
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+.*\(\d{4}\)/.test(t)) return true;
  // "Surname (date)" citation pattern
  if (/^[A-Z][a-z]+\s+\([12]\d{3}\)/.test(t)) return true;
  // URL or "Retrieved from" patterns
  if (/https?:\/\//i.test(t)) return true;
  // Ends with a parenthesized year like "(2023)" (citation marker)
  if (/\(\d{4}\)\s*$/.test(t) && t.length < 60) return true;
  // Reference-section citation strings: raw {{cite}} template errors ("Cite
  // journal requires |journal="), quoted article titles with page ranges
  // ("Title": 203–221), and bare quoted titles that are journal/book entries.
  if (/{{cite|^Cite\s+[A-Za-z]+\s+requires/i.test(t)) return true;
  if (/^"[^"]{8,}":\s*\d+/.test(t)) return true;
  if (/\w+":\s*\d+/.test(t)) return true;
  if (/^"[^"]{8,}"\s*$/.test(t)) return true;
  return false;
}

// Strip leading quotes/punctuation so first-word checks see the real first word
// (Wikipedia extracts can begin a sentence with `"` when quoting earlier text).
function stripLeadingNoise(s) {
  return (s || '').replace(/^[\s"'()\[\]{}—-]+/, '');
}

// Split extract into sentences. Periods that are part of an initial ("S. Webb"),
// a decimal ("6.1 m"), or a domain/abbreviation ("Scroll.in", "U.S.") are not
// sentence boundaries. Wikipedia citation markers ([3]) are stripped so they do
// not pollute the start of sentences.
function splitSentences(text) {
  if (!text) return [];
  const protected_ = text
    .replace(/["']?\[\d+\]["']?/g, ' ')
    .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, '$1\u0001')
    .replace(/\b(\d+\.\d+)\b/g, m => m.replace('.', '\u0001'));
  return protected_
    .split(/\.\s+/)
    .map(s => s.replace(/\u0001/g, '.').trim())
    .filter(s => s.length > 0);
}

// Cut reference/appendix boilerplate ("== References ==", "== See also ==",
// "== Bibliography ==", "== External links ==", "== Further reading ==",
// "== Notes ==", "== Sources ==") and everything after it from an extract.
// Without this, the citation strings in a References section ("doi:...",
// "Author, Name (year)", "Place: Publisher.") get turned into fill-blank
// questions. Mirrors the marker list used by isListPage so the prose scoring
// and the question sentence pool see the same body.
function trimBackmatter(extract) {
  const marker = /={2,}\s*(?:References|Notes|Citations|Sources|Bibliography|Further reading|External links|See also|Footnotes)\b/i;
  const idx = (extract || '').search(marker);
  return idx >= 0 ? (extract || '').substring(0, idx) : (extract || '');
}

// Check if Wikipedia extract is a list/table page (not prose)
function isListPage(extract) {
  // Trim reference/bibliography sections before scoring: Wikipedia's extract
  // inlines "Author, Name (year)" citations there, and a prose article with many
  // citations must not be misread as a list page. Works on the collapsed extract.
  let body = extract;
  const markerIdx = body.search(/={2,}\s*(?:References|Notes|Citations|Sources|Bibliography|Further reading|External links|See also|Footnotes)\b/i);
  if (markerIdx >= 0) body = body.substring(0, markerIdx);
  const first500 = body.substring(0, 500);
  const commas = (first500.match(/,/g) || []).length;
  // If comma density > 1 per 20 chars in first 500 → list page
  if (first500.length > 0 && commas > 0 && first500.length / commas < 20) return true;
  // "Name, Name (year)" pattern — typical of award/prize lists
  const nameYearMatches = (body.match(/[A-Z][a-z]+,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(\d{4}\)/g) || []).length;
  if (nameYearMatches > 3) return true;
  // "Name (year)" pattern repeated
  const nameParenYear = (body.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(\d{4}\)/g) || []).length;
  if (nameParenYear > 8) return true;
  return false;
}

function getContext(allSentences, sentText, windowSize) {
  let idx = -1;
  const target = sentText.substring(0, 30).toLowerCase();
  for (let i = 0; i < allSentences.length; i++) {
    if (allSentences[i].toLowerCase().includes(target)) { idx = i; break; }
  }
  if (idx < 0) return allSentences.slice(0, 5).join('. ').substring(0, 1200);
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(allSentences.length, idx + windowSize + 1);
  return allSentences.slice(start, end).join('. ').substring(0, 1200);
}

function findBestTerm(sent, title) {
  const allMatches = [];
  // Title-case words (proper nouns), allowing initials like "Donald S. Lopez"
  let re = /([A-Z][a-z]+(?:\.[a-z]{2,})?(?:\s+[A-Z]\.(?:\s+[A-Z][a-z]+)?|\s+[A-Z][a-z]+){0,5})/g, m;
  while ((m = re.exec(sent)) !== null) allMatches.push(m[1]);
  // ALL-CAPS acronyms (ISRO, NASA, UNESCO, etc.)
  re = /\b([A-Z]{2,6})\b/g;
  while ((m = re.exec(sent)) !== null) allMatches.push(m[1]);
  // Proper noun after "of"
  re = /\bof\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/g;
  while ((m = re.exec(sent)) !== null) allMatches.push(m[1]);
  // Proper noun after "in" / "by" / "at" (city, country, organization)
  re = /\b(?:in|by|at|under|with)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/g;
  while ((m = re.exec(sent)) !== null) allMatches.push(m[1]);

  const titleLower = title.toLowerCase();
  const titleWords = new Set(titleLower.split(/\s+/));
  const candidates = allMatches.filter(t => {
    if (t.length < 4) return false;
    if (/^(The|This|It|He|She|They|We|I|You|His|Her|Its|Their|An|A|India|Many|Most|Some|Few|All|Each|Every|Both|Such|These|Those|That|Who|Which|What|When|Where|How|Would|Could|Should|After|Before|During|Until|Since|Within|Without|About|Between|Among|Because|Also|Only|Just|Very|Still|Even|Well|Here|There|Now|Then|One|Two|New|Old|First|Last|Next|Other|Same|Own|Long|Great|High|Large|Small|Big|Good|Bad|Chief|State|Union|Central|National|Public|General|Supreme|Federal|World|Year|Years|Name|Names|Part|Parts|Type|Types|Form|Forms|Group|Groups|List|Lists|Known|Also|Instituted|Established|Founded|Created|Introduced|Developed|Published|Released|Announced|Launched|Appointed|Elected|Awarded|Received|Won|Played|Worked|Studied|Taught|Led|Built|Designed|Invented|Discovered|Proposed|Suggested|Argued|Stated|Noted|Observed|Reported|Described|Explained|Formed|Made|Given|Taken|Held|Shown|Found|Seen|Heard|Considered|Regarded|Believed|Thought|Felt|Wanted|Needed|Used)$/i.test(t)) return false;
    if (t === title) return false;
    // Reject terms built only from title words (e.g. "Adena" for "Adena culture")
    const tWords = t.toLowerCase().split(/\s+/);
    if (tWords.every(w => titleWords.has(w))) return false;
    // Skip if it's a truncated version of a longer match
    const truncated = allMatches.some(x => x !== t && x.includes(t + ' '));
    if (truncated) return false;
    // Skip pure numeric
    if (/^\d+$/.test(t)) return false;
    // Skip ordinal-like (1st, 2nd, 3rd, 4th, etc.)
    if (/^\d+(st|nd|rd|th)$/.test(t)) return false;
    // Skip if term is just a parenthesized number like "(2014)"
    if (/^\(\d+\)$/.test(t)) return false;
    // Skip if term is the first word of the sentence (too obvious)
    if (new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s,;:]', 'i').test(stripLeadingNoise(sent.trim()))) return false;
    return true;
  });

  if (!candidates.length) return null;

  const uniqueCands = [...new Set(candidates)];

  const scored = uniqueCands.map(t => {
    const words = t.toLowerCase().split(/\s+/);
    const overlap = words.filter(w => titleWords.has(w)).length;
    const pos = sent.indexOf(t);
    const lengthBonus = t.length > 6 ? 5 : 0;
    const earlyBonus = pos < 30 ? 8 : 0;
    return { term: t, score: overlap * 10 + words.length * 3 + earlyBonus + lengthBonus - pos * 0.1 };
  });

  scored.sort((a, b) => b.score - a.score);
  // Prefer multi-word / long terms (more specific), fall back to the full pool
  const multi = scored.filter(s => s.term.split(/\s+/).length > 1 || s.term.length > 5);
  const pool = multi.length ? multi : scored;
  if (!pool.length) return null;
  return pool[0].term;
}

// Closest phrase boundaries around an index, so a long sentence can yield a
// compact local-window question instead of being skipped whole. Backs up to the
// nearest sentence/phrase boundary on the left and hard-caps on the right.
function clauseWindow(sent, idx, beforeLen, afterLen) {
  const from = Math.max(0, idx - beforeLen);
  let start = from;
  const bounds = [];
  for (const sep of ['. ', ', ', '; ', ': ', '\u2014 ']) {
    const p = sent.lastIndexOf(sep, from);
    if (p >= 0) bounds.push(p + sep.length);
  }
  if (bounds.length) start = Math.max(...bounds);
  const hardEnd = Math.min(sent.length, idx + afterLen);
  const dotEnd = sent.indexOf('. ', idx + 1);
  const end = (dotEnd >= 0 && dotEnd <= hardEnd) ? dotEnd : hardEnd;
  return sent.substring(start, end).replace(/\s+\S*$/, '').trim();
}

// Composer attribution: "Title(s) – Composer" lines (e.g. the Popular
// compositions section of a raga/music article, lyric or film-song lists).
// The raw extract keeps each entry on its own newline, so this runs on the RAW
// (non-collapsed) extract. Requires ≥3 matches and caps at 6 so stray "X – Y"
// prose lines can't fire it. Returns [{question, answer}].
function extractComposerAttributions(raw, title) {
  // Gate on music-specific vocabulary, not the generic English words
  // "composition"/"song" (those appear in every article: "composition of the
  // armed forces", "protest songs", "population composition"). A "Title(s) –
  // Composer" list only exists in genuine raga/film/music pages, which name a
  // composer, lyricist, album or soundtrack.
  if (!/\b(?:composer(?:s)?|lyricist(?:s)?|musical(?:ly)?|songwriter|soundtrack|album|raga|ragam|raagam|kr?t(i|ai)|khayaal|bandi|opera|divulged|gazal|bollywood|filmi|musician)\b/i.test(raw || '') &&
      !/\b(?:composed by|sung by|written by [A-Z])\b/i.test(raw || '')) return [];
  const lines = (raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const found = [];
  for (const line of lines) {
    if (line.length > 250 || /^(==|\||\[\[|\bThe\b|\bA\b|\bAn\b)/.test(line)) continue;
    const m = /^(.*?)\s*[-–—]\s*([A-Z][A-Za-z .'’]{2,44})\s*$/.exec(line);
    if (!m) continue;
    const left = m[1].trim();
    const right = m[2].trim();
    if (!/^[A-Z]/.test(left) || /\d{4}/.test(right)) continue;
    // Skip route/service lines (railways, buses, flights): "Agartala – Anand
    // Vihar Terminal Rajdhani Express", "Mumbai – Delhi Superfast" etc. These
    // match the "Title – Composer" shape but are common travel trivia; a real
    // raga/film composition list never names an Express/Mail/Road in the
    // composer slot.
    if (/\b(Express|Superfast|Super Fast|Rajdhani|Humsafar|Shatabdi|Duronto|Jan(shatabdi)?|Cantonment|Terminal|Vihar|Mail|Special|Weekly|Local|Passenger|Circular|Fast Passenger|DEMU|MEMU|Airport|Flight|Bus|Coach|Wagon|Tram|Metro|Subway|Highway|Road|NH-\d|Bypass)\b/i.test(left + ' ' + right)) continue;
    if (/\b(?:also sung|also known|composed by|written for|in the|for the|including|such as|are|is|between|to|from)\b/i.test(left)) continue;
    // Person-name check: a "Title(s) – Composer" list uses Title-Case names on
    // both sides ("Harinama Jihveyolirabeku – Vyasatirtha"). Definition lists,
    // appointment tables and prose lines read "Big data – extremely large
    // datasets", "Governor of RBI – Chairperson", "NH 2 : Dibrugarh – ..." and
    // carry lowercase words, digits, colons or punctuation — reject those.
    if (/\b[a-z][a-z]+\b/.test(left) || /\b[a-z][a-z]+\b/.test(right)) continue;
    if (/[\d:;/=]/.test(left)) continue;
    const first = left.split(/\s*,\s*|\s+and\s+/i)[0].replace(/['"“”‘’]/g, '');
    if (first.length < 3 || first.length > 100) continue;
    found.push({ q: "The composition '" + first + "' was composed by ______", a: right });
  }
  return found.length >= 3 ? found.slice(0, 6) : [];
}

// Parse `{|class="wikitable"` blocks into logical rows of cleaned cells. Works
// on the page wikitext (tables are stripped from prop=extracts plaintext).
function parseWikiTables(wikitext) {
  const tables = [];
  if (!wikitext) return tables;
  const re = /\{\|class="wikitable"[\s\S]*?\n\|}/g;
  let tm;
  while ((tm = re.exec(wikitext)) !== null) {
    const rows = [];
    const parts = tm[0].split(/\n\|-/).slice(1);
    for (const part of parts) {
      const rowCells = part.split('\n')
        .filter(l => /^\s*[|!]/.test(l) && !/^\s*\|\{\|/.test(l))
        .map(l => l.replace(/^\s*[|!]+/, '').trim())
        .map(cleanWikiCell)
        .filter(Boolean);
      if (rowCells.length) rows.push(rowCells);
    }
    if (rows.length >= 3) tables.push(rows);
  }
  return tables;
}

function cleanWikiCell(s) {
  return (s || '')
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''{1,3}/g, '').replace(/''/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Vow/term ↔ definition tables (e.g. the "28 vratas" table in Jain monasticism,
// the unnumbered "Vow | Transgressions" list in Five Vows, "ashtanga" lists,
// samitis etc.). Two row shapes qualify:
//   (1) "N. Term | <prose meaning>"  — numbered vratas/vows
//   (2) "Term | <4+ word prose>"      — unnumbered vow/term tables
// Index-only and ranking tables ("1 | Acharya | Ganini Aryika", "No | Raga |
// Scale") never match because the number lives in its own cell and the
// definition must read like a sentence (≥ 4 words of prose with a lowercase
// word). Returns [{ question, answer }], answer = the Term.
function extractTableTermDefs(wikitext, title) {
  if (!/\{\|class="wikitable"/.test(wikitext || '')) return [];
  const tables = parseWikiTables(wikitext);
  const pairs = [];
  for (const rows of tables) {
    for (const row of rows) {
      if (row.length < 2) continue;
      let termCell = -1;
      for (let j = 0; j < row.length; j++) {
        if (/^\s*\d{1,2}\s*[.\u2013–‑-]\s+[A-Za-z'\u{800}-\u{FFFF}\/]/u.test(row[j])) { termCell = j; break; }
      }
      if (termCell < 0) {
        // Unnumbered shape: term cell followed immediately by a long prose cell.
        for (let j = 0; j < row.length - 1; j++) {
          const trm = row[j];
          const df = row[j + 1];
          if (!trm || trm.length > 30) continue;
          if (!/^[^\d]/.test(trm)) continue;
          if (df && df.split(/\s+/).length >= 4 && /[a-z]/.test(df) && df.length >= 12) { termCell = j; break; }
        }
      }
      if (termCell < 0) continue;
      const defCell = termCell + 1;
      if (defCell >= row.length) continue;
      const term = row[termCell]
        .replace(/^\s*\d{1,2}\s*[.\-–]\s*/u, '')
        .replace(/^\s*[;:]+\s*/, '').trim();
      // Reject when the "term" is itself a big heading/group cell (e.g.
      // "Five vows", "Guna vratas") that merely labels the rows.
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(term) && /(vow|vrata|guna|head|group|class|stack)/i.test(term)) continue;
      if (term.length < 3 || term.length > 42) continue;
      // A "term" must be a real name/acronym — not a number, a percentage, or
      // a bare token like "44.99%". Election-result tables ("Party | seats |
      // % of votes") would otherwise yield "The term whose meaning is
      // 'Communist Party of India' is called 99%". Require at least one letter.
      if (!/[A-Za-z\u{800}-\u{FFFF}]/u.test(term)) continue;
      if (/^\d+(\.\d+)?\s*%?$/.test(term)) continue;
      const def = row[defCell].trim();
      if (def.length < 12 || def.length > 170) continue;
      if (/^[\d%.,]+$/.test(def)) continue;
      const words = def.split(/\s+/).length;
      if (words < 4) continue;
      if (pairs.some(p => p.term === term)) continue;
      pairs.push({ term, def });
    }
  }
  if (pairs.length < 3) return [];
  const out = pairs.slice(0, 8).map(p => {
    const defShort = p.def.length > 95 ? p.def.substring(0, 95).replace(/\s+\S*$/, '') + '…' : p.def;
    return {
      q: 'The term whose meaning is "' + defShort + '" is called ______',
      a: p.term,
    };
  });
  return out;
}

// Expert-style fact questions mined with deterministic patterns (no LLM).
// Each extractor recognises a specific fact shape and builds the question from
// a LOCAL CLAUSE around the answer, so it works on long sentences the shallow
// year/number/superlative/term branches skip. Returns [{question, answer}].
function extractFactQuestions(sent, title) {
  const out = [];

  // 1) Event-year anchor in LONG sentences: "...restrictions that began in 1981
  //    and extended for nearly two decades". The shallow year branch only runs
  //    on sentences < 240 chars, so dated facts in long sentences are lost.
  if (sent.length >= 240) {
    const m = sent.match(/\b(began|started|commenced|initiated|established|founded|created|introduced|launched|enacted|implemented|passed|signed|ratified|opened|ended|declared|announced)\s+(?:in\s+)?(1[0-9]{3}|20[0-9]{2})\b/i);
    if (m) {
      const year = m[2];
      const yearPos = m.index + m[0].lastIndexOf(year);
      let win = clauseWindow(sent, yearPos, 170, 80);
      if (win.includes(year)) {
        let context = win.replace(year, '_____');
        // Cut a leading "..., and X" fragment so the question starts at the subject
        // ("...society, and Chakrabarti described restrictions...that began in _____").
        const blankIdx = context.indexOf('_____');
        if (blankIdx > 0) {
          const leadCut = context.lastIndexOf(', and ', blankIdx);
          if (leadCut >= 0) context = context.substring(leadCut + 6).trim();
        }
        context = stripLeadingNoise(context).replace(/^[,\s;]+/, '')
          .replace(/,\s+(?:and\s+)?(?:thus|therefore|so|how therefore)\s*$/i, '')
          .replace(/[\s"'()[\]]+$/g, '').trim();
        if (context.length >= 25 && context.length <= 250 && !/^_____/.test(context)) {
          out.push({ question: context, answer: year });
        }
      }
    }
  }

  // 2) Reviewer attribution — three common shapes:
  //    (a) "NAME wrote in/for PUBLICATION, "QUOTE""
  //    (b) "In PUBLICATION, NAME wrote the novel/book/film "QUOTE""
  //    (c) "NAME wrote an extensive critique/review of X in PUBLICATION"
  //    The NAME is blanked and the question is restructured to avoid a leading
  //    blank (which the cleanup gate rejects). Regexes are case-sensitive on
  //    names so lowercase words ("anthropologist Irfan Ahmad") are not caught.
  const attributionPatterns = [
    { re: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:wrote|writes)\s+(?:in|for)\s+((?:The\s+)?[A-Z][a-z]+(?:\.[a-z]{2,})?(?:\s+[A-Z][a-z]+){0,2})/,
      build(m) { return { name: m[1], pub: m[2], phrase: 'wrote' }; } },
    { re: /[Ii]n\s+((?:The\s+)?[A-Z][a-z]+(?:\.[a-z]{2,})?(?:\s+[A-Z][a-z]+){0,2})\s*,\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+wrote\s+the\s+(?:novel|book|film)/,
      build(m) { return { name: m[2], pub: m[1], phrase: 'wrote the novel' }; } },
    { re: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(wrote|published)\s+((?:a|an)\s+(?:[a-z]+\s+)?(?:critique|review|analysis|assessment|examination))\s+of\s+[^,.]{0,80}?\bin\s+((?:The\s+)?[A-Z][a-z]+(?:\.[a-z]{2,})?(?:\s+[A-Z][a-z]+){0,2})/,
      build(m) { return { name: m[1], pub: m[4], phrase: m[2] + ' ' + m[3] + ' of the work' }; } },
  ];
  for (const p of attributionPatterns) {
    const ma = sent.match(p.re);
    if (!ma) continue;
    const { name, pub, phrase } = p.build(ma);
    if (/^(She|He|They|It|I|We|You)\b/i.test(name)) continue;
    const afterMatch = sent.substring(ma.index + ma[0].length);
    // Opening quote may lack its closing quote (splitSentences strips the
    // citation marker AND the quote adjacent to it), so the closing `"` is
    // optional; the greedy class stops at the next quote anyway.
    const quote = afterMatch.match(/"([^"]{15,})"?/);
    const quoteShort = quote ? quote[1].replace(/\s+/g, ' ').trim().replace(/\s+\S*$/, '').substring(0, 80) : '';
    let context;
    if (quote && phrase === 'wrote') {
      context = 'In ' + pub + ', _____ wrote that "' + quoteShort + '..."';
    } else if (quote) {
      context = 'In ' + pub + ', _____ ' + phrase + ' "' + quoteShort + '..."';
    } else if (phrase !== 'wrote') {
      context = 'In ' + pub + ', _____ ' + phrase + '.';
    } else {
      continue; // "wrote" without a quote is too weak
    }
    if (context.length <= 220) { out.push({ question: context, answer: name }); }
    break; // only one attribution per sentence
  }

  // 4) Dashed term list ("X – definition X – definition", the classic anatomy
  //    of Indian exam lists like the eight limbs of a painting or six limbs of
  //    chitra). Because extract lines are newline-collapsed, `splitSentences`
  //    merges such lists into ONE giant sentence that the year/number/term
  //    branches skip. Recognise at least three "CapitalTerm – lowercase def"
  //    pairs and turn each pair into a blank-the-term question.
  const termList = [];
  const itemRe = /([A-Z][a-zA-Z'-]{2,18}(?:\s+[A-Z][a-zA-Z'-]{2,18}){0,1})\s*[-–—]\s*(?!a\s|an\s|the\s)([a-zA-Z][a-zA-Z0-9 ,()'/-]{4,90}?)(?=\s+[A-Z][a-zA-Z'-]{2,18}(?:\s+[A-Z][a-zA-Z'-]{2,18}){0,1}\s*[-–—]|\s*$)/g;
  let mp;
  while ((mp = itemRe.exec(sent)) !== null) {
    const item = { term: mp[1], def: mp[2].replace(/\s+/g, ' ').trim() };
    if (item.def.length >= 5 && item.def.length <= 70 && !item.def.includes(title) && !/^[a-z]+\s+[a-z]+\s+[a-z]+,\s*[a-z]+\s+/.test(item.def)) {
      termList.push(item);
    }
  }
  if (termList.length >= 3 && /(six|seven|eight|nine|three|four|five|ten|twelve|several)\s+(limbs?|parts?|stages?|types?|kinds?|classes?|categories?|elements?|components?|techniques?|methods?|branches?)/i.test(sent)) {
    for (const item of termList) {
      if (out.length >= 4) break;
      const q = 'The term ______ refers to ' + item.def + '.';
      if (q.length >= 25 && q.length <= 250 && !/^_____/.test(q) && !/_____\s*$/.test(q)) {
        out.push({ question: q, answer: item.term });
      }
    }
  }

  // 3) Theme/list question: "...such as A, B, C and D" → blank the LAST list
  //    item, leaving the others as hints. Strict guards keep this from firing
  //    on clauses: the list region must not contain verbs/relatives, each item
  //    is a short noun phrase, and the question must not end on the blank.
  const ml = sent.match(/\b(?:such as|including|like|these include)\s+([A-Za-z][^.]{8,160})/i);
  if (ml) {
    const clauseMarkers = 'it|he|she|they|we|you|which|who|whom|whose|this|that|these|those|have|has|had|was|were|is|are|may|might|although|because|while|since|however|believe|argue|argued|state|stated|said|say|account|suggest|suggested|described|included|including';
    let region = ml[1].replace(/\.$/, '');
    region = region
      .replace(new RegExp(',\\s+(?:and\\s+)?(?:' + clauseMarkers + ')\\b[\\s\\S]*$', 'i'), '')
      .replace(/,\s+as well as\b[\s\S]*$/i, '');
    if (!new RegExp('\\b(?:' + clauseMarkers + ')\\b', 'i').test(region)) {
      const items = region.split(/[,;]|\s+and\s+|\s+or\s+/)
        .map(x => x.replace(/^[\s"'\[(]+|[\s"'\])]+$/g, '').trim())
        .filter(x => x.length > 3 && !/^(and|or)$/i.test(x));
      if (items.length >= 3) {
        const last = items[items.length - 1];
        const lastIdx = sent.lastIndexOf(last);
        const badItem = last.split(/\s+/).length > 4 || last.length > 30
          || new RegExp('\\b(?:' + clauseMarkers + ')\\b', 'i').test(last);
        if (!badItem && lastIdx >= 0) {
          let context = (sent.substring(0, lastIdx) + '_____' + sent.substring(lastIdx + last.length))
            .replace(/[\s,"')\]]+$/g, '').trim();
          if (context.length >= 25 && context.length <= 250 && !/^_____/.test(context) && !/_____\s*$/.test(context)) {
            out.push({ question: context, answer: last });
          }
        }
      }
    }
  }

  return out;
}

// Simple paraphrase: shorten to 1-2 most relevant sentences, minor reword
function paraphrase(text, answer) {
  if (!text || text.length < 20) return text;
  const sentences = splitSentences(text).filter(s => s.trim().length > 15);
  if (sentences.length === 0) return text.substring(0, 200);

  // Prefer sentences containing the answer
  const answerLower = (answer || '').toLowerCase();
  let chosen;
  if (answerLower) {
    const matching = sentences.filter(s => s.toLowerCase().includes(answerLower));
    chosen = matching.length > 0 ? matching.slice(0, 2) : sentences.slice(0, 2);
  } else {
    chosen = sentences.slice(0, 2);
  }

  let result = chosen.join('. ').trim();
  // Basic rewrites (NO tense changes — was→is changes meaning for history)
  const swaps = {
    ' established ': ' set up ',
    ' established.': ' set up.',
    ' founded ': ' set up ',
    ' founded.': ' set up.',
    ' located in ': ' in ',
    ' situated in ': ' in ',
    ' known as ': ' called ',
    ' referred to as ': ' called ',
  };
  for (const [from, to] of Object.entries(swaps)) {
    result = result.split(from).join(to);
  }
  if (result.length > 500) result = result.substring(0, 497) + '...';
  // Ensure it ends with a period
  if (result.length > 0 && !/[.!?]$/.test(result)) result += '.';
  return result;
}

function makeDescriptionQuestion(desc, title) {
  // Strip leading articles/verbs so the description reduces to a noun phrase.
  const trimmed = desc
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/^(was|is|were|are|has been|had been)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s*[.!?]+$/, '')
    .trim();
  // A "what/who is X?" question gets deleted by cleanup, and a trailing blank
  // also fails cleanup, so blank the title mid-sentence instead.
  const q = (!trimmed || trimmed.length < 8)
    ? 'The term ' + title + ' refers to ' + desc + '.'
    : 'The ' + title + ' was ' + trimmed + '.';
  return q.replace(title, '_____');
}

const CATEGORIES = [
  // ───────── Ancient India ─────────
  { name:'Ancient India', wikiCat:'History_of_India_by_period', topics:[
    'Indus Valley Civilisation','Vedic period','Maurya Empire','Ashoka',
    'Gupta Empire','Chola Empire','Vijayanagara Empire','Sangam period',
    'Kushan Empire','Satavahana dynasty','Pala Empire','Chera dynasty',
    'Pandya dynasty','Chalukya dynasty','Rashtrakuta dynasty',
    'History of Buddhism in India','History of Jainism','Nalanda mahavihara',
    'Taxila','Ajanta Caves','Ellora Caves','Indica (Megasthenes)','Arthashastra',
    'Sarnath','Sanchi','Bhimbetka rock shelters','Dholavira','Rakhigarhi',
    'Lothal','Harsha','Samudragupta','Kalidasa','Panini','Aryabhata',
    'Varahamihira','Charaka','Sushruta','Chanakya','Gautama Buddha',
    'Mahavira','Adi Shankara','Ramanuja','Guru Nanak','Basava',
    'Meera','Tulsidas','Surdas','Mirabai','Nagarjuna','Moulinak (Moulinak)'
  ]},
  // ───────── Medieval & Modern India ─────────
  { name:'Medieval & Modern India', wikiCat:'Medieval_India', topics:[
    'Delhi Sultanate','Mughal Empire','Maratha Empire','Sikh Empire',
    'Vijayanagara Empire','Bahmani Sultanate','Bengal Sultanate','Ahom kingdom',
    'Rajput','Khalji dynasty','Tughlaq dynasty','Sayyid dynasty','Lodi dynasty',
    'Akbar','Shah Jahan','Aurangzeb','Sher Shah Suri','Shivaji',
    'Guru Gobind Singh','Maharana Pratap','Tipu Sultan','Hyder Ali',
    'Battle of Plassey','Battle of Buxar','Battle of Panipat',
    'Battle of Haldighati','Battle of Talikota','Battle of Wandiwash',
    'British Raj','Indian independence movement','Indian Rebellion of 1857',
    'Partition of India','History of the Republic of India','Jallianwala Bagh massacre',
    'Quit India Movement','Simon Commission','Cripps Mission','Round Table Conferences',
    'Cabinet Mission','Mountbatten Plan','Integration of India',
    'Sino-Indian War','Indo-Pakistani War of 1947','Indo-Pakistani War of 1965',
    'Bangladesh Liberation War','Kargil War','Indo-Pakistani War of 1971',
    'Goa annexation','Operation Blue Star','Emergency (India)','Green Revolution in India',
    'White Revolution (India)','Indian economic reforms of 1991','1998 Indian nuclear tests',
    'Smiling Buddha','Pokhran-II','Swachh Bharat Mission','Demonetisation by the government of India',
    'Goods and Services Tax (India)'
  ]},
  // ───────── World History ─────────
  { name:'World History', wikiCat:'World_history', topics:[
    'World history','Ancient Egypt','Ancient Greece','Ancient Rome',
    'French Revolution','Russian Revolution','Industrial Revolution',
    'World War I','World War II','Cold War','Great Depression',
    'Renaissance','Age of Discovery','History of China','History of Japan',
    'History of the United States','History of Russia','History of the United Kingdom',
    'History of France','History of Germany','History of Italy','History of Spain',
    'History of Africa','History of the Middle East','History of Southeast Asia',
    'History of Australia','History of Brazil','History of Canada',
    'Mongol Empire','Ottoman Empire','Decolonization','American Revolution',
    'Nazism','Fascism','Communism','Capitalism','Socialism',
    'History of the United Nations','League of Nations','European Union',
    'Alexander the Great','Julius Caesar','Genghis Khan','Napoleon Bonaparte',
    'Adolf Hitler','Joseph Stalin','Winston Churchill','Franklin D. Roosevelt',
    'Mao Zedong','Vladimir Lenin','Benito Mussolini','Leon Trotsky',
    'Simon Bolivar','Ho Chi Minh','Nelson Mandela','Martin Luther King Jr.',
    'Mahatma Gandhi','Mother Teresa','Albert Einstein','Sigmund Freud',
    'Battle of Waterloo','Battle of Stalingrad','Battle of Gettysburg',
    'American Civil War','Opium Wars','Scramble for Africa',
    'Holocaust','Atomic bombings of Hiroshima and Nagasaki',
    'Space Race','Cuban Missile Crisis','Fall of the Berlin Wall',
    'September 11 attacks','Iraq War','Arab Spring','War on terror',
    'Cold War (1985–1991)','Korean War','Vietnam War','Afghanistan War',
    'Iranian Revolution','Chinese Civil War','Spanish Civil War',
    'Thirty Years\' War','Hundred Years\' War','Seven Years\' War',
    'French and Indian War','War of the Roses','Crusades',
    'History of the Jews','History of Christianity','History of Islam',
    'Age of Enlightenment','Industrialisation','Globalization',
    'Marco Polo','Vasco da Gama','Christopher Columbus','Ferdinand Magellan',
    'Captain James Cook','Ibn Battuta','Xuanzang'
  ]},
  // ───────── Indian Geography ─────────
  { name:'Indian Geography', wikiCat:'Geography_of_India', topics:[
    'Geography of India','Climate of India','Rivers of India',
    'Soils of India','Minerals of India','Natural vegetation of India',
    'Agriculture in India','Population of India','Urbanization in India',
    'Transport in India','Irrigation in India','Mountain ranges of India',
    'Natural disasters in India','List of rivers of India',
    'List of mountains in India','List of lakes of India',
    'List of waterfalls in India','List of dams and reservoirs in India',
    'List of cities in India by population','List of most populous cities in India',
    'List of Indian states by GDP','List of Indian states by population',
    'Ports in India','Airports in India','List of railway stations in India',
    'Western Ghats','Eastern Ghats','Himalayas','Thar Desert',
    'Indo-Gangetic Plain','Deccan Plateau','Ganges','Brahmaputra',
    'Indus River','Godavari','Krishna River','Narmada River',
    'Mahanadi','Kaveri','Yamuna','Hooghly River','Sutlej',
    'Dal Lake','Chilika Lake','Loktak Lake','Sambhar Salt Lake',
    'Wular Lake','Pulicat Lake','Kolleru Lake',
    'Jog Falls','Kunchikal Falls','Shivasamudra Falls',
    'Bhogavati Falls','Dudhsagar Falls','Nohkalikai Falls',
    'Tehri Dam','Bhakra Dam','Hirakud Dam','Sardar Sarovar Dam',
    'Nagarjuna Sagar Dam','Almatti Dam','Krishna Raja Sagara',
    'Mullaperiyar Dam','Idukki Dam','Nathpa Jhakri Dam',
    'Indira Gandhi Canal','Kosi Project','Damodar Valley Corporation',
    'List of national parks of India','List of tiger reserves of India',
    'List of biosphere reserves of India','List of Ramsar sites in India',
    'List of wildlife sanctuaries of India','List of Indian states by forest cover'
  ]},
  // ───────── World Geography ─────────
  { name:'World Geography', wikiCat:'Physical_geography', topics:[
    'Continent','Climate','Ocean','Atmosphere','Biosphere','Ecosystem','Biome',
    'Plate tectonics','Volcano','Earthquake','Water cycle','Desert','Rainforest',
    'Tundra','Grassland','Taiga','Savanna','Mediterranean climate',
    'Tropical rainforest','Tropical monsoon climate','Semi-arid climate',
    'Types of rocks','Rock (geology)','Mineral','Soil','Erosion',
    'Glacier','Ice age','Sea level rise','El Niño','La Niña',
    'Monsoon','Jet stream','Gulf Stream','Coriolis force',
    'Pacific Ocean','Atlantic Ocean','Indian Ocean','Arctic Ocean','Southern Ocean',
    'Bay of Bengal','Arabian Sea','Mediterranean Sea','Caribbean Sea',
    'South China Sea','Red Sea','Black Sea','Caspian Sea','Baltic Sea',
    'Persian Gulf','Gulf of Mexico','English Channel','Suez Canal',
    'Panama Canal','Strait of Gibraltar','Strait of Malacca',
    'Horn of Africa','Cape of Good Hope','Cape Horn',
    'River Nile','Amazon River','Yangtze','Mississippi River','Danube',
    'Ganges','Volga River','Congo River','Mekong','Rhine',
    'Mount Everest','K2','Kangchenjunga','Mount Kilimanjaro',
    'Mount Fuji','Mount Vesuvius','Mount St. Helens',
    'Andes','Rocky Mountains','Alps','Himalayas','Ural Mountains',
    'Great Dividing Range','Atlas Mountains','Caucasus Mountains',
    'Sahara','Gobi Desert','Kalahari Desert','Arabian Desert',
    'Great Barrier Reef','Amazon rainforest','Congo rainforest',
    'Antarctica','Arctic','Greenland','Iceland',
    'List of countries by population','List of countries by area',
    'List of countries by GDP (nominal)','List of countries by GDP (PPP)',
    'List of countries by Human Development Index',
    'List of countries by military expenditure',
    'List of countries by oil production',
    'List of countries by population density',
    'List of capital cities','List of currencies',
    'United Nations','European Union','African Union','ASEAN','SAARC',
    'NATO','OECD','OPEC','World Trade Organization','G20','BRICS','G7',
    'World Bank','International Monetary Fund','Asian Development Bank',
    'New Development Bank','Asian Infrastructure Investment Bank'
  ]},
  // ───────── Indian Polity & Governance ─────────
  { name:'Polity & Governance', wikiCat:'Government_of_India', topics:[
    'Constitution of India','Fundamental rights in India',
    'Directive principles of India','Fundamental duties in India',
    'Politics of India','Election Commission of India','Parliament of India',
    'Supreme Court of India','Panchayati Raj','Local government in India',
    'Comptroller and Auditor General of India','Union Public Service Commission',
    'Right to Information','President of India','Prime Minister of India',
    'Governor (India)','Union Council of Ministers','State governments of India',
    'Tribunals in India','Elections in India','E-government in India',
    'List of amendments of the Constitution of India',
    'List of presidents of India','List of prime ministers of India',
    'List of vice presidents of India','List of chief justices of India',
    'List of speakers of the Lok Sabha',
    'List of chief ministers of India','List of political parties in India',
    'Lok Sabha','Rajya Sabha','Vidhan Sabha','Vidhan Parishad',
    'Finance Commission of India','NITI Aayog','Planning Commission (India)',
    'Attorney General of India','Solicitor General of India',
    'Comptroller and Auditor General of India',
    'Chief Election Commissioner of India','Election Commission of India',
    'Union Public Service Commission','State Public Service Commission',
    'National Human Rights Commission of India',
    'Central Information Commission','Central Vigilance Commission',
    'Competition Commission of India','Securities and Exchange Board of India',
    'Reserve Bank of India','Insurance Regulatory and Development Authority',
    'Telecom Regulatory Authority of India',
    'National Investigation Agency','Central Bureau of Investigation',
    'Enforcement Directorate','Income Tax Department',
    'Goods and Services Tax (India)','GST Council',
    'Cooperative federalism','Federalism in India',
    'President\'s rule','Sarkaria Commission','Mandal Commission',
    'National Commission for Scheduled Castes',
    'National Commission for Scheduled Tribes',
    'National Commission for Backward Classes',
    'Anti-defection law (India)','Tenth Schedule to the Constitution of India',
    'Basic structure doctrine','Judicial review in India',
    'Public Interest Litigation in India','Writ jurisdiction in India'
  ]},
  // ───────── Indian Economy ─────────
  { name:'Indian Economy', wikiCat:'Economy_of_India', topics:[
    'Economy of India','Economic liberalisation in India','Agriculture in India',
    'Five-year plans of India','NITI Aayog','Reserve Bank of India','Banking in India',
    'Poverty in India','Unemployment in India','Foreign trade of India',
    'Taxation in India','Budget of India','Infrastructure of India',
    'Energy in India','Insurance in India','Healthcare in India',
    'Make in India','Startup India','Food security in India',
    'Green Revolution','White Revolution','Land reforms in India',
    'Public distribution system','Indian agriculture','Indian industrial policy',
    'Small and medium enterprises','Microfinance in India',
    'List of Indian companies by revenue',
    'List of Indian companies by market capitalisation',
    'List of Indian billionaires','List of Indian exports',
    'List of Indian imports','Foreign direct investment in India',
    'Remittances to India','Balance of payments of India',
    'Indian rupee','History of the Indian rupee',
    'SENSEX','BSE SENSEX','NIFTY 50',
    'Bombay Stock Exchange','National Stock Exchange of India',
    'Securities and Exchange Board of India',
    'Monetary policy of India','Fiscal policy of India',
    'Inflation in India','GDP of India','Economic history of India',
    'Poverty in India','Unemployment in India','Employment in India',
    'Labour in India','Organised sector in India','Unorganised sector in India',
    'Cooperative movement in India','Public sector undertakings in India',
    'Disinvestment in India','Privatisation in India',
    'Special economic zones of India','Export processing zones of India',
    'International trade of India','World Trade Organization and India'
  ]},
  // ───────── General Science ─────────
  { name:'General Science', wikiCat:'Science', topics:[
    'Physics','Chemistry','Biology','Human body','Genetics','Cell biology',
    'Evolution','Ecology','Nutrition','Disease','Atomic physics','Nuclear physics',
    'Optics','Electricity','Magnetism','Thermodynamics','Periodic table',
    'Acid','Base (chemistry)','Organic chemistry','Inorganic chemistry',
    'Biochemistry','List of inventions','List of scientific discoveries',
    'Microbiology','Immunology','Botany','Zoology','Marine biology',
    'Molecular biology','Developmental biology','Neuroscience','Psychology',
    'List of Nobel laureates in Physics',
    'List of Nobel laureates in Chemistry',
    'List of Nobel laureates in Physiology or Medicine',
    'List of Indian scientists','List of Indian mathematicians',
    'List of inventions and discoveries by Indians',
    'List of elements','Chemical element','Chemical compound',
    'List of planets','Solar System','Milky Way','Star','Galaxy',
    'Black hole','Big Bang','Theory of relativity','Quantum mechanics',
    'List of diseases','List of medicines','List of vaccines',
    'Vitamin','Mineral (nutrient)','Carbohydrate','Protein','Fat',
    'DNA','RNA','Chromosome','Gene','Enzyme','Hormone',
    'Circulatory system','Digestive system','Nervous system',
    'Respiratory system','Skeletal system','Muscular system',
    'Endocrine system','Excretory system','Reproductive system',
    'Blood','Heart','Brain','Lungs','Liver','Kidney',
    'Bacteria','Virus','Fungus','Protozoa','Parasite',
    'Cancer','HIV/AIDS','COVID-19 pandemic','Tuberculosis','Malaria',
    'Polio','Smallpox','Chickenpox','Measles','Influenza',
    'Antibiotic','Antiviral drug','Vaccine','Immunity (medical)',
    'Photosynthesis','Respiration','Digestion','Metabolism',
    'Mitosis','Meiosis','Mendelian inheritance','Mutation',
    'Ecosystem','Food chain','Food web','Biome','Biodiversity',
    'Conservation biology','Climate change','Global warming',
    'Ozone layer','Greenhouse effect','Greenhouse gas',
    'Renewable energy','Solar power','Wind power','Hydroelectricity',
    'Nuclear power','Geothermal energy','Biomass (energy)',
    'Fossil fuel','Coal','Petroleum','Natural gas',
    'Light','Sound','Heat','Force','Motion','Energy',
    'Gravity','Electromagnetism','Nuclear fission','Nuclear fusion',
    'Laser','Fibre optics','Satellite','Radar','Sonar','GPS'
  ]},
  // ───────── Science & Technology ─────────
  { name:'Science & Technology', wikiCat:'Science_and_technology_in_India', topics:[
    'Science and technology in India','Biotechnology','Nanotechnology',
    'Renewable energy in India','Nuclear power in India','Robotics',
    'Artificial intelligence','Information technology in India',
    'Internet in India','Software industry in India',
    'Telecommunications in India','Cybersecurity',
    'Defence industry of India','Indian space programme',
    'List of Indian satellites','List of Indian space missions',
    'Mars Orbiter Mission','Chandrayaan programme','Gaganyaan',
    'Lunar south pole','Indian astronomy','Indian mathematics',
    'List of Indian inventions and discoveries',
    'Medical tourism in India','Pharmaceutical industry in India',
    'Supercomputer','Param (supercomputer)','TIFR','BARC',
    'IISc','IIT (BHU) Varanasi','IISER','AIIMS Delhi',
    'Council of Scientific and Industrial Research',
    'Indian Council of Medical Research',
    'Department of Space (India)','Department of Atomic Energy (India)',
    'DRDO','HAL (company)','ISRO','NSIL','Antrix Corporation',
    'BrahMos Aerospace','Hindustan Aeronautics Limited'
  ]},
  // ───────── Art, Culture & Heritage ─────────
  { name:'Art & Culture', wikiCat:'Culture_of_India', topics:[
    'Culture of India','Indian classical music','Indian folk music',
    'Indian dance','Indian painting','Indian sculpture',
    'Indian architecture','Indian theatre','Indian cinema',
    'Indian clothing','Indian cuisine','Indian literature',
    'Festivals in India','Fairs in India','Handicrafts of India',
    'UNESCO Intangible Cultural Heritage',
    'UNESCO World Heritage Sites in India',
    'Languages of India','Religion in India','Indian philosophy',
    'List of World Heritage Sites in India',
    'List of Indian dance forms','List of Indian musical instruments',
    'List of Indian painters','List of Indian sculptors',
    'Hindustani classical music','Carnatic music','Kathak',
    'Bharatanatyam','Kathakali','Odissi','Kuchipudi','Manipuri dance',
    'Sattriya','Mohiniyattam','Sitar','Tabla','Veena','Flute',
    'Sarod','Harmonium','Mridangam','Dhol','Shehnai',
    'Yoga','Ayurveda','Vastu shastra','Natya Shastra',
    'Diwali','Holi','Eid al-Fitr','Christmas','Durga Puja',
    'Ganesh Chaturthi','Navaratri','Maha Shivaratri','Raksha Bandhan',
    'Pongal','Onam','Baisakhi','Makar Sankranti','Lohri',
    'Taj Mahal','Red Fort','Qutub Minar','Hawa Mahal',
    'Gateway of India','India Gate','Charminar','Mysore Palace',
    'Golden Temple','Meenakshi Temple','Khajuraho temples',
    'Brihadeeswarar Temple','Konark Sun Temple','Ajanta Caves',
    'Ellora Caves','Elephanta Caves','Badami cave temples',
    'Mahabalipuram','Hampi','Fatehpur Sikri','Agra Fort',
    'Jantar Mantar, Jaipur','Sanchi Stupa','Bodh Gaya',
    'Sarnath','Nalanda University',
    'Indian cinema','Bollywood','Tollywood','Kollywood',
    'Satyajit Ray','Raj Kapoor','M. F. Husain','Ravi Shankar',
    'Lata Mangeshkar','M. S. Subbulakshmi','Bismillah Khan',
    'Amrita Sher-Gil','Raja Ravi Varma','Nandalal Bose',
    'Salman Rushdie','Vikram Seth','Arundhati Roy','R. K. Narayan'
  ]},
  // ───────── Defence & Internal Security ─────────
  { name:'Defence & Security', wikiCat:'Military_of_India', topics:[
    'Indian Armed Forces','Indian Army','Indian Navy','Indian Air Force',
    'Indian Coast Guard','Nuclear weapons of India','Defence industry of India',
    'Internal security of India','Terrorism in India',
    'Naxalite–Maoist insurgency','Border security of India',
    'Indian Police Service','Central Armed Police Forces',
    'Paramilitary forces of India','National security of India',
    'Insurgency in Jammu and Kashmir','Indian Army chiefs',
    'Indian Navy chiefs','Indian Air Force chiefs',
    'Chief of Defence Staff (India)','National Security Council (India)',
    'Strategic Forces Command','Integrated Defence Staff',
    'List of Indian military operations',
    'List of Indian wars','List of Indian nuclear tests',
    'List of Indian missiles','BrahMos','Agni (missile)',
    'Prithvi (missile)','Akash (missile)','Nag (missile)',
    'Trishul (missile)','Pinaka (rocket)','INS Vikramaditya',
    'INS Arihant','INS Chakra','DRDO','HAL Tejas',
    'Sukhoi Su-30MKI','Rafale','Arjun (tank)','INSAS rifle',
    'AK-47','National Security Guard','Special Protection Group',
    'Research and Analysis Wing','Intelligence Bureau (India)',
    'Border Security Force','Central Reserve Police Force',
    'Indo-Tibetan Border Police','Sashastra Seema Bal',
    'Assam Rifles','National Cadet Corps (India)',
    'Territorial Army (India)','Indian Home Guard',
    'Defence Research and Development Organisation',
    'Ordnance Factories Board','Bharat Electronics Limited',
    'Mazagon Dock Shipbuilders Limited','Cochin Shipyard',
    'Indian Ordnance Factories','Military history of India'
  ]},
  // ───────── Environment, Ecology & Climate ─────────
  { name:'Environment & Ecology', wikiCat:'Environment_of_India', topics:[
    'Environment of India','Wildlife of India','Climate change in India',
    'Biodiversity of India','Deforestation in India','Pollution in India',
    'Waste management in India','National parks of India',
    'Biosphere reserves of India','Ramsar sites in India',
    'Wildlife sanctuaries of India','Environmental issues in India',
    'Water pollution in India','Air pollution in India','Forestry in India',
    'Endangered species of India','Conservation in India','Climate change',
    'List of national parks of India','List of tiger reserves of India',
    'List of biosphere reserves of India','List of Ramsar sites in India',
    'List of wildlife sanctuaries of India','List of Indian states by forest cover',
    'Project Tiger','Project Elephant','Project Rhino',
    'Gir Forest National Park','Kaziranga National Park',
    'Sundarbans National Park','Periyar National Park',
    'Kanha National Park','Bandhavgarh National Park',
    'Jim Corbett National Park','Ranthambore National Park',
    'Keoladeo National Park','Nanda Devi National Park',
    'Valley of Flowers National Park','Dachigam National Park',
    'Great Himalayan National Park','Satpura National Park',
    'Silent Valley National Park','Mudumalai National Park',
    'Wayanad Wildlife Sanctuary','Nagarhole National Park',
    'Bandipur National Park','Sariska Tiger Reserve',
    'Corbett Tiger Reserve','Sundarbans Tiger Reserve',
    'Western Ghats','Eastern Himalayas','Indo-Burma hotspot',
    'Sundaland','Biodiversity hotspot','Endemic species of India',
    'Critically endangered species of India','Extinct species of India',
    'National animal of India','National bird of India',
    'National flower of India','National tree of India',
    'Royal Bengal tiger','Indian elephant','Indian rhinoceros',
    'Asiatic lion','Indian leopard','Snow leopard',
    'Ganges river dolphin','Indian peafowl','Great Indian bustard',
    'Indian vulture','Gharial','King cobra','Indian cobra',
    'Tropical rainforest','Mangrove','Coral reef','Wetland',
    'Desert ecology','Mountain ecology','Forest ecology',
    'Paris Agreement','UNFCCC','IPCC','Kyoto Protocol','COP26',
    'Global warming potential','Carbon footprint','Carbon credit',
    'Carbon sequestration','Carbon cycle','Nitrogen cycle',
    'Water cycle','Oxygen cycle','Phosphorus cycle','Food web',
    'Ecological pyramid','Ecological succession','Primary production',
    'Keystone species','Indicator species','Flagship species',
    'Invasive species in India','Alien species in India',
    'Environmental Impact Assessment in India',
    'National Green Tribunal','Ministry of Environment, Forest and Climate Change',
    'Central Pollution Control Board','State Pollution Control Board'
  ]},
  // ───────── International Relations ─────────
  { name:'International Relations', wikiCat:'Foreign_relations_of_India', topics:[
    'Foreign relations of India','United Nations','SAARC','BRICS','G20',
    'Shanghai Cooperation Organisation','ASEAN','World Trade Organization',
    'International Monetary Fund','World Bank','Non-Aligned Movement',
    'India–United States relations','India–China relations',
    'India–Pakistan relations','India–Russia relations',
    'India–Japan relations','India–Bangladesh relations',
    'India–Nepal relations','India–Sri Lanka relations',
    'India–Afghanistan relations','India–Myanmar relations',
    'India–Maldives relations','India–Bhutan relations',
    'India–Iran relations','India–Israel relations',
    'India–France relations','India–Germany relations',
    'India–United Kingdom relations','India–Australia relations',
    'India–Canada relations','India–Brazil relations',
    'India–South Africa relations','India–European Union relations',
    'South Asia','Indian Ocean','Indian diaspora',
    'Nuclear Suppliers Group','Missile Technology Control Regime',
    'Nuclear disarmament','International Atomic Energy Agency',
    'India and weapons of mass destruction',
    'Nuclear power in India','India\'s three-stage nuclear programme',
    'Comprehensive Nuclear-Test-Ban Treaty',
    'Treaty on the Non-Proliferation of Nuclear Weapons',
    'Wassenaar Arrangement','Australia Group',
    'Look East policy (India)','Act East policy (India)',
    'Neighbourhood First policy','Connect Central Asia policy',
    'India–Africa relations','India–Latin America relations',
    'Indian Ocean Rim Association','BIMSTEC','Mekong–Ganga Cooperation',
    'Asia Cooperation Dialogue','East Asia Summit',
    'Commonwealth of Nations','United Nations Security Council',
    'United Nations peacekeeping','UNESCO','UNICEF','WHO',
    'International Labour Organization','World Food Programme',
    'International Court of Justice','International Criminal Court',
    'World Economic Forum','Group of Seven (G7)','Group of 77',
    'International Solar Alliance','Coalition for Disaster Resilient Infrastructure',
    'One Belt One Road','China–Pakistan Economic Corridor',
    'Quadrilateral Security Dialogue','Malabar Exercise',
    'India–Middle East–Europe Economic Corridor',
    'International North–South Transport Corridor',
    'Asia Africa Growth Corridor','Freedom of navigation',
    'Exclusive economic zone','Maritime security','Blue economy',
    'Piracy in Southeast Asia','Anti-piracy measures in India',
    'Terrorism','Counter-terrorism','Global terrorism',
    'Al-Qaeda','ISIS','Taliban','Lashkar-e-Taiba',
    'Jaish-e-Mohammed','Hamas','Hezbollah',
    'Financial Action Task Force','United Nations Security Council Resolution 1373',
    'UN Global Counter-Terrorism Strategy',
    'Human rights','Universal Declaration of Human Rights',
    'Geneva Conventions','International humanitarian law',
    'Climate change diplomacy','Environmental diplomacy',
    'Hydro-diplomacy','Water conflicts between India and Pakistan',
    'Indus Waters Treaty','India–Bangladesh water disputes',
    'Teesta River water dispute','Kishanganga Hydroelectric Project'
  ]},
  // ───────── Indian Society & Social Issues ─────────
  { name:'Indian Society', wikiCat:'Society_of_India', topics:[
    'Indian society','Caste system in India','Education in India',
    'Demographics of India','Health in India','Women in India',
    'Child labour in India','Human rights in India','Hunger in India',
    'Malnutrition in India','Tribes of India','Religious minorities in India',
    'Poverty in India','Unemployment in India','Slums in India',
    'Social issues in India','Public health in India','Sanitation in India',
    'Gender inequality in India','Dowry system in India','Corruption in India',
    'Midday Meal Scheme','Integrated Child Development Services',
    'National Population Policy','National Health Mission',
    'Ayushman Bharat','Janani Suraksha Yojana',
    'Scheduled castes and scheduled tribes',
    'List of Scheduled Tribes in India',
    'List of Scheduled Castes in India',
    'Other Backward Class','Economically Weaker Section',
    'Reservation in India','Creamy layer','Mandal Commission',
    'Sex ratio in India','Child sex ratio in India',
    'Literacy in India','Female literacy in India',
    'Rural development in India','Urbanization in India',
    'Migration in India','Immigration in India',
    'Old age in India','Population ageing in India',
    'Disability in India','Mental health in India',
    'Alcohol in India','Drug abuse in India',
    'Honour killing in India','Domestic violence in India',
    'Human trafficking in India','Child marriage in India',
    'Sexual harassment in India','Rape in India',
    'LGBT rights in India','Transgender rights in India',
    'Right to education','Right to health','Right to food',
    'Right to clean environment','Right to water',
    'Right to housing','Right to livelihood',
    'Land acquisition in India','Displacement in India',
    'Refugees in India','Internally displaced persons in India',
    'Statelessness in India','Citizenship Amendment Act',
    'National Register of Citizens','Assam Accord',
    'Panchayati raj','Self-help group (finance)',
    'Microfinance in India','Women\'s empowerment in India'
  ]},
  // ───────── Ethics & Integrity ─────────
  { name:'Ethics & Integrity', wikiCat:'Ethics', topics:[
    'Ethics','Moral philosophy','Applied ethics','Business ethics',
    'Medical ethics','Environmental ethics','Corporate governance',
    'Code of conduct','Conflict of interest','Whistleblower',
    'Transparency (behavior)','Accountability','Good governance',
    'Civil service','Public administration','Emotional intelligence',
    'Attitude (psychology)','Aptitude','Value (ethics)',
    'Integrity','Honesty','Trust (social sciences)',
    'Compassion','Empathy','Tolerance','Respect',
    'Justice','Fairness','Equality','Equity',
    'Human dignity','Human rights','Social justice',
    'Distributive justice','Procedural justice',
    'Rule of law','Separation of powers','Checks and balances',
    'Constitutional morality','Constitutional patriotism',
    'Citizen\'s charter','Right to information',
    'Public service ethics','Administrative ethics',
    'Police ethics','Judicial ethics','Media ethics',
    'Research ethics','Corporate social responsibility',
    'Sustainability','Sustainable development',
    'Environmental stewardship',
    'Fiduciary duty','Duty of care','Duty of loyalty',
    'Conflict resolution','Mediation','Arbitration',
    'Negotiation','Persuasion','Communication',
    'Leadership','Teamwork','Decision-making',
    'Problem solving','Critical thinking','Creative thinking',
    'Civil servant','All India Services',
    'Indian Administrative Service','Indian Police Service',
    'Indian Forest Service','Neutrality (international relations)',
    'Impartiality','Objectivity (philosophy)',
    'Anonymity','Non-partisanship',
    'Probity','Rectitude','Conscience',
    'Moral courage','Civic virtue','Public interest',
    'Common good','General will','Social contract'
  ]},
  // ───────── ISRO, Space & Nuclear ─────────
  { name:'ISRO & Space', wikiCat:'Space_programme_of_India', topics:[
    'ISRO','Chandrayaan programme','Mangalyaan','Gaganyaan',
    'Satellite navigation','Space research','Indian Space Research Organisation',
    'List of Indian satellites','Launch vehicles of India',
    'Nuclear power in India','Nuclear programme of India',
    'Polar Satellite Launch Vehicle','Geosynchronous Satellite Launch Vehicle',
    'Satish Dhawan Space Centre','Vikram Sarabhai Space Centre',
    'Liquid Propulsion Systems Centre','UR Rao Satellite Centre',
    'Indian Regional Navigation Satellite System','NAVIC',
    'Indian Deep Space Network','Astrosat','Chandrayaan-2',
    'Chandrayaan-3','Mangalyaan (Mars orbiter)','Aditya-L1',
    'XPoSat','INSAT','GSAT','IRNSS','RISAT','Cartosat',
    'Resourcesat','Oceansat','HAMSAT','Kalamsat',
    'Space Applications Centre','Indian Institute of Space Science and Technology',
    'Antrix Corporation','NewSpace India Limited',
    'Vikram (lander)','Pragyan (rover)','Wheeler Island',
    'Integrated Test Range','Missile complex in India',
    'Bhabha Atomic Research Centre','Nuclear fuel cycle in India',
    'India and weapons of mass destruction',
    'Nuclear reactors in India','Pressurized heavy-water reactor',
    'Fast breeder reactor in India','Thorium-based nuclear power',
    'Three-stage nuclear power programme (India)',
    'Nuclear power plants in India','Kudankulam Nuclear Power Plant',
    'Tarapur Atomic Power Station','Rajasthan Atomic Power Station',
    'Madras Atomic Power Station','Narora Atomic Power Station',
    'Kakrapar Atomic Power Station','Kaiga Atomic Power Station',
    'Jaitapur Nuclear Power Project','Kovvada Nuclear Power Project',
    'Department of Space (India)','Department of Atomic Energy (India)',
    'Indian Space Policy','Space Debris','Anti-satellite weapon',
    'Mission Shakti'
  ]},
  // ───────── Sports ─────────
  { name:'Sports', wikiCat:'Sports_in_India', topics:[
    'Sports in India','Cricket in India','Hockey in India','Football in India',
    'Olympic Games','Asian Games','Commonwealth Games','Chess','Badminton',
    'Tennis','Kabbadi','Wrestling in India','Boxing in India',
    'Shooting sports','History of cricket in India','Indian Premier League',
    'Rugby in India','National Games of India','Athletics in India',
    'Cricket World Cup','ICC T20 World Cup','Asia Cup',
    'Border-Gavaskar Trophy','Test cricket','One Day International',
    'Twenty20','Indian Premier League','Ranji Trophy',
    'Duleep Trophy','Irani Cup','Vijay Hazare Trophy',
    'List of Indian cricketers','List of Indian cricket captains',
    'Sachin Tendulkar','Virat Kohli','MS Dhoni','Rahul Dravid',
    'Sunil Gavaskar','Kapil Dev','Anil Kumble','Subramaniam Badrinath',
    'Harbhajan Singh','Zaheer Khan','Jasprit Bumrah','Rohit Sharma',
    'FIFA World Cup','UEFA Champions League','La Liga','Premier League',
    'Sunil Chhetri','I-League','Indian Super League',
    'Asian Cup','SAFF Championship',
    'Olympic Games','Summer Olympic Games','Winter Olympic Games',
    'Youth Olympic Games','Paralympic Games','Special Olympics',
    'List of Indian Olympic medalists','List of Olympic medalists by country',
    'Abhinav Bindra','P. V. Sindhu','Neeraj Chopra','Saina Nehwal',
    'Mary Kom','Karnam Malleswari','Milkha Singh','P. T. Usha',
    'Dhyan Chand','Major Dhyan Chand Khel Ratna',
    'Chess','World Chess Championship','Viswanathan Anand',
    'Badminton World Championships','Thomas & Uber Cup',
    'Australian Open','French Open','Wimbledon','US Open',
    'Commonwealth Games','Asian Games','SEA Games',
    'Asian Athletics Championships','World Athletics Championships',
    'Volleyball in India','Basketball in India','Swimming in India',
    'Weightlifting in India','Archery in India','Judo in India',
    'Taekwondo in India','Cycling in India','Gymnastics in India'
  ]},
  // ───────── Books, Authors & Literature ─────────
  { name:'Books & Authors', wikiCat:'Indian_literature', topics:[
    'Indian literature','Hindi literature','Indian English literature',
    'Sanskrit literature','Tamil literature','Bengali literature',
    'Urdu literature','Marathi literature','Gujarati literature',
    'Malayalam literature','Kannada literature','Telugu literature',
    'Punjabi literature','Oriya literature','Assamese literature',
    'Rabindranath Tagore','Mahatma Gandhi','B. R. Ambedkar',
    'Jawaharlal Nehru','Premchand','Bankim Chandra Chattopadhyay',
    'Kalidasa','Bhagavad Gita','Constitution of India',
    'Indian epic poetry','Vedas','Upanishads','Puranas',
    'Mahabharata','Ramayana','Arthashastra','Manusmriti',
    'Rajatarangini','Mughal-e-Azam','Padmavat','Gitanjali',
    'Satyameva Jayate','Discovery of India','The Indian Struggle',
    'Hind Swaraj','Anandamath','Godan','Guide (novel)',
    'Malgudi Days','Train to Pakistan','Midnight\'s Children',
    'A Suitable Boy','The God of Small Things','The White Tiger',
    'Interpreter of Maladies','The Inheritance of Loss',
    'List of Indian poets','List of Indian writers',
    'List of Indian women writers','List of Indian children\'s writers',
    'List of Indian science fiction writers',
    'Jnanpith Award','Sahitya Akademi Award',
    'Booker Prize','Pulitzer Prize','Nobel Prize in Literature',
    'Mahatma Gandhi','Indira Gandhi','Rajiv Gandhi',
    'Swami Vivekananda','Aurobindo','Sarvepalli Radhakrishnan',
    'C. Rajagopalachari','Bhagat Singh','Subhas Chandra Bose',
    'Lal Bahadur Shastri','Dadabhai Naoroji',
    'V. S. Naipaul','Amartya Sen','Nobel Prize winners by country',
    'List of Indian autobiographies','List of Indian biographies'
  ]},
  // ───────── Awards & Honours ─────────
  { name:'Awards & Honours', wikiCat:'Indian_awards', topics:[
    'National awards of India','Bharat Ratna','Padma awards',
    'Sahitya Akademi Award','Jnanpith Award','Dadasaheb Phalke Award',
    'Arjuna Award','Dronacharya Award','Major Dhyan Chand Khel Ratna',
    'Gallantry awards in India','Param Vir Chakra','Ashoka Chakra',
    'Nobel Prize','Booker Prize','Man Booker Prize',
    'Pulitzer Prize','Oscar','Grammy','Academy Awards',
    'List of Bharat Ratna recipients',
    'List of Padma award recipients',
    'List of Nobel laureates by country',
    'List of Indian Nobel laureates',
    'List of Gallantry award recipients in India',
    'Ramon Magsaysay Award','Templeton Prize',
    'Shanti Swarup Bhatnagar Prize for Science and Technology',
    'Rashtriya Khel Protsahan Puruskar',
    'National Film Awards','Filmfare Awards',
    'List of Dadasaheb Phalke Award recipients',
    'List of Arjuna Award recipients',
    'List of Major Dhyan Chand Khel Ratna awardees',
    'Sahitya Akademi Fellowship','Padma Shri','Padma Bhushan',
    'Padma Vibhushan','Bharat Ratna','Jnanpith Award',
    'Victoria Cross','George Cross','Medal of Honor',
    'Order of the British Empire','L\u00e9gion d\'honneur',
    'Order of the Rising Sun','Order of Australia',
    'List of civil awards and decorations of India'
  ]},
  // ───────── Government Schemes ─────────
  { name:'Govt Schemes', wikiCat:'Government_schemes_in_India', topics:[
    'Government of India','MGNREGA','Ayushman Bharat','Swachh Bharat Mission',
    'Digital India','Make in India','Startup India','Skill India',
    'Pradhan Mantri Jan Dhan Yojana','Pradhan Mantri Awas Yojana',
    'Pradhan Mantri Ujjwala Yojana','Pradhan Mantri Fasal Bima Yojana',
    'Pradhan Mantri Kisan Samman Nidhi','National Health Mission',
    'Midday Meal Scheme','Sarva Shiksha Abhiyan','Beti Bachao Beti Padhao',
    'Atal Pension Yojana','Soil Health Card Scheme','National Food Security Act',
    'Direct Benefit Transfer','Goods and Services Tax','Demonetisation',
    'Pradhan Mantri Mudra Yojana','Stand Up India scheme',
    'Pradhan Mantri Bhartiya Janaaushadhi Kendra',
    'Pradhan Mantri Vaya Vandana Yojana',
    'PM CARES Fund','Khelo India','Fit India Movement',
    'Swasth Bharat Yatra','International Yoga Day',
    'National Education Policy 2020','Rashtriya Madhyamik Shiksha Abhiyan',
    'Samagra Shiksha Abhiyan','National Scholarship Portal',
    'Deendayal Upadhyaya Gram Jyoti Yojana',
    'Saubhagya scheme','UJALA scheme','AMRUT scheme',
    'Smart Cities Mission','Housing for All (India)',
    'Jal Jeevan Mission','Namami Gange','National Mission for Clean Ganga',
    'Atal Mission for Rejuvenation and Urban Transformation',
    'Pradhan Mantri Gramin Digital Saksharta Abhiyan',
    'Pradhan Mantri Kaushal Vikas Yojana',
    'Pradhan Mantri Suraksha Bima Yojana',
    'Pradhan Mantri Jeevan Jyoti Bima Yojana',
    'Sukanya Samriddhi Yojana','Mahila E-Haat',
    'One Rank One Pension','Seventh Pay Commission (India)',
    'Electoral Bond','NOTA','National Voters Day'
  ]},
  // ───────── Indian States ─────────
  { name:'Indian States', wikiCat:'States_and_union_territories_of_India', topics:[
    'States and union territories of India','Maharashtra','Tamil Nadu',
    'Uttar Pradesh','Karnataka','Kerala','Gujarat','Rajasthan','West Bengal',
    'Bihar','Madhya Pradesh','Punjab, India','Haryana','Andhra Pradesh',
    'Telangana','Odisha','Assam','Jharkhand','Chhattisgarh','Uttarakhand',
    'Himachal Pradesh','Jammu and Kashmir (union territory)','Delhi',
    'Goa','Puducherry','Chandigarh','Manipur','Mizoram','Nagaland','Tripura',
    'Meghalaya','Arunachal Pradesh','Sikkim','Ladakh','Dadra and Nagar Haveli and Daman and Diu',
    'List of Indian state emblems','List of Indian state flags',
    'List of Indian state animals','List of Indian state birds',
    'List of Indian state flowers','List of Indian state trees',
    'List of Indian state songs','List of Indian state symbols',
    'List of Indian state capitals','List of Indian state legislative assemblies',
    'List of Indian state legislative councils',
    'List of Indian state high courts','List of Indian state universities',
    'List of Indian state festivals','List of Indian state dances',
    'List of Indian state cuisines','List of Indian state languages'
  ]},
  // ───────── Important Days ─────────
  { name:'Important Days', wikiCat:'United_Nations_observances', topics:[
    'United Nations observances','International days','National days of India',
    'List of International Years','Public holidays in India','Indian calendar',
    'List of commemorative days','List of awareness days',
    'World Health Day','World Environment Day','World Water Day',
    'World Population Day','World AIDS Day','World Cancer Day',
    'World Diabetes Day','World Heart Day','World Mental Health Day',
    'International Women\'s Day','International Youth Day',
    'International Day of the Girl Child','International Day of Older Persons',
    'International Day of Persons with Disabilities',
    'International Day of Yoga','International Mother Language Day',
    'International Day for the Elimination of Violence against Women',
    'International Day of Peace','International Day of Democracy',
    'World Heritage Day','World Tourism Day','World Food Day',
    'World Soil Day','World Wildlife Day','World Sparrow Day',
    'World TB Day','World Malaria Day','World Hepatitis Day',
    'World Blood Donor Day','World Milk Day',
    'International Day of Forests','World Wetlands Day',
    'World Ozone Day','World Science Day',
    'Republic Day (India)','Independence Day (India)',
    'Gandhi Jayanti','Teachers\' Day (India)','Children\'s Day (India)',
    'National Youth Day (India)','National Sports Day (India)',
    'National Voters\' Day (India)','National Science Day (India)',
    'National Technology Day (India)','National Education Day (India)',
    'National Farmers Day (India)','National Energy Conservation Day (India)',
    'National Mathematics Day (India)','National Statistics Day (India)',
    'National Defence Day (India)','National Postal Day (India)',
    'National Flag Day (India)','National Unity Day (India)',
    'National Integration Day (India)','National Brahmin Day (India)'
  ]},
  // ───────── Personalities ─────────
  { name:'Personalities', wikiCat:'Indian_people', topics:[
    'List of Indian leaders','Indian independence activists','Indian scientists',
    'List of Indian philosophers','List of Indian writers','List of Indian poets',
    'List of Indian artists','List of Indian musicians','List of Indian film actors',
    'List of Indian sportspeople','List of Indian inventors',
    'List of Indian businesspeople','List of Indian economists',
    'List of Indian social reformers','List of Indian women',
    'List of Nobel laureates by country',
    'List of Indian philosophers','List of Indian spiritual leaders',
    'List of Indian gurus','List of Indian dancers',
    'List of Indian painters','List of Indian architects',
    'List of Indian singers','List of Indian composers',
    'List of Indian chief ministers','List of Indian governors',
    'List of Indian presidents','List of Indian prime ministers',
    'List of Indian vice presidents','List of Indian chief justices',
    'List of Indian defence ministers','List of Indian finance ministers',
    'List of Indian home ministers','List of Indian external affairs ministers',
    'List of Indian ambassadors to the United States',
    'List of Indian ambassadors to China',
    'List of Indian ambassadors to Russia',
    'List of Indian high commissioners to the United Kingdom',
    'List of Indian billionaires','List of Indian tycoons',
    'List of Indian philanthropists','List of Indian humanitarians',
    'List of Indian innovators','List of Indian pioneers',
    'List of Indian feminists','List of Indian suffragists',
    'List of Indian revolutionaries','List of Indian martyrs',
    'List of Indian freedom fighters','List of Indian nationalists',
    'List of Indian monarchs','List of Indian emperors',
    'List of Indian saints','List of Indian mystics',
    'List of Indian historians','List of Indian archaeologists',
    'List of Indian linguists','List of Indian anthropologists',
    'List of Indian sociologists','List of Indian psychologists',
    'List of Indian educationists','List of Indian reformers',
    'List of Indian environmentalists','List of Indian ornithologists',
    'List of Indian botanists','List of Indian geologists',
    'List of Indian astronauts','Rakesh Sharma',
    'Kalpana Chawla','Sunita Williams','Rajiv Malhotra'
  ]},
  // ───────── Disaster Management ─────────
  { name:'Disaster Management', wikiCat:'Emergency_management_in_India', topics:[
    'Disaster management in India','National Disaster Management Authority',
    'Floods in India','Cyclones in India','Earthquakes in India',
    'Drought in India','Tsunami','Landslide','Heat wave',
    'Climate change adaptation','Disaster risk reduction',
    'Emergency management','National Disaster Response Force',
    'National Institute of Disaster Management',
    'State Disaster Management Authority (India)',
    'District Disaster Management Authority',
    'National Disaster Management Plan (India)',
    'Sendai Framework for Disaster Risk Reduction',
    'Hyogo Framework for Action',
    'Disaster Resilience','Community-based disaster management',
    'Early warning system','Emergency evacuation',
    'Search and rescue','Disaster relief','Humanitarian aid',
    'Flood control in India','Flood forecasting in India',
    'Central Water Commission','Indian Meteorological Department',
    'Cyclone warning system in India','Tsunami warning system in India',
    'Indian National Centre for Ocean Information Services',
    'Earthquake zones of India','Seismic zones in India',
    'Bureau of Indian Standards','Earthquake engineering in India',
    'Fire safety in India','Fire services in India',
    'Industrial disaster','Bhopal disaster','Chemical disaster',
    'Nuclear disaster','Biological disaster','Radiological emergency',
    'Pandemic preparedness','Epidemic','COVID-19 pandemic in India',
    'Biological Weapons Convention','Chemical Weapons Convention',
    'Disaster management in India',
    'National Crisis Management Committee',
    'National Executive Committee (India)',
    'Armed forces and disaster management in India'
  ]},
  // ───────── Business & Economy ─────────
  { name:'Business & Economy', wikiCat:'Business_in_India', topics:[
    'Business in India','Startup India','Make in India','E-commerce in India',
    'Retail in India','Microfinance in India','Small and medium enterprises',
    'Stock exchanges in India','Bombay Stock Exchange',
    'National Stock Exchange of India','Foreign direct investment in India',
    'Outsourcing in India','Multinational corporations in India',
    'Indian rupee','Cryptocurrency in India',
    'Real estate in India','Construction industry in India',
    'Automotive industry in India','Textile industry in India',
    'Pharmaceutical industry in India','Chemical industry in India',
    'Steel industry in India','Cement industry in India',
    'Mining in India','Coal mining in India','Oil and gas industry in India',
    'Power sector in India','Renewable energy in India',
    'Telecommunications in India','Media in India',
    'Advertising in India','Banking in India',
    'Insurance in India','Financial services in India',
    'Capital market in India','Commodity market in India',
    'Derivative market in India','Forex market in India',
    'Bond market in India','Money market in India',
    'Mutual fund in India','Pension fund in India',
    'Sovereign wealth fund of India',
    'Micro, Small and Medium Enterprises (MSME)',
    'Startup ecosystem in India','Venture capital in India',
    'Angel investment in India','Private equity in India',
    'Crowdfunding in India','Initial public offering in India',
    'Franchising in India','Licensing in India',
    'Intellectual property in India','Patent in India',
    'Trademark in India','Copyright in India',
    'Business process outsourcing in India',
    'Knowledge process outsourcing in India',
    'Logistics in India','Supply chain management in India',
    'Warehousing in India','Cold chain in India',
    'International trade of India','Trade agreements of India',
    'Free trade agreements of India','Preferential trade agreements of India',
    'World Trade Organization and India','India and the World Bank',
    'India and the International Monetary Fund',
    'Foreign exchange reserves of India','Balance of payments of India',
    'External debt of India','Current account of India',
    'Capital account of India','Portfolio investment in India',
    'Non-resident Indian investment in India',
    'Brand India','Made in India','India brand equity foundation'
  ]},
  // ───────── RBI & Banking ─────────
  { name:'RBI & Banking', wikiCat:'Banking_in_India', topics:[
    'Reserve Bank of India','Monetary policy of India','Banking in India',
    'National Bank for Agriculture and Rural Development',
    'Securities and Exchange Board of India','Insurance in India',
    'Indian Banking system','Demonetisation','Non-performing asset',
    'Financial inclusion','Digital payment in India','Unified Payments Interface',
    'RBI governor','List of RBI governors',
    'Monetary Policy Committee (India)',
    'Repo rate','Reverse repo rate','Cash reserve ratio',
    'Statutory liquidity ratio','Bank rate','Marginal standing facility',
    'Liquidity adjustment facility','Open market operation',
    'Quantitative easing','Qualitative easing',
    'Moral suasion','Credit control by RBI',
    'Priority sector lending','Priority sector lending certificates',
    'Kisan Credit Card','GST','Goods and Services Tax Network',
    'Digital payment','UPI','BHIM','Aadhaar Pay',
    'National Payments Corporation of India',
    'IMPS','NEFT','RTGS','ECS',
    'Cheque Truncation System','CTS 2010 standard',
    'Banking Ombudsman Scheme (India)',
    'Deposit Insurance and Credit Guarantee Corporation',
    'Credit Information Bureau (India) Limited',
    'Small Industries Development Bank of India',
    'National Housing Bank','Export-Import Bank of India',
    'National Bank for Agriculture and Rural Development',
    'State Bank of India','HDFC Bank','ICICI Bank',
    'Axis Bank','Kotak Mahindra Bank','Yes Bank',
    'Rural banking in India','Regional Rural Bank',
    'Cooperative banking in India','Payment bank',
    'Small finance bank','Local area bank',
    'Wholesale and long-term finance bank',
    'Universal bank','Scheduled bank',
    'Non-banking financial company',
    'Microfinance institution in India',
    'Self-help group (finance)','Joint liability group',
    'Jan Dhan Yojana','Pradhan Mantri Jan Dhan Yojana',
    'Atal Pension Yojana','Pradhan Mantri Jeevan Jyoti Bima Yojana',
    'Pradhan Mantri Suraksha Bima Yojana',
    'Composite index of NPA',
    'Insolvency and Bankruptcy Code (India)',
    'Bankruptcy in India','Debt recovery tribunal in India',
    'SARFAESI Act','Banking regulation act','Negotiable instruments act',
    'Indian Contract Act','Companies Act 2013 (India)',
    'Limited liability partnership in India',
    'Insider trading in India','Takeover code in India',
    'SEBI Act','Depositories Act','Securities Contract Regulation Act'
  ]},
  // ───────── Indian National Symbols ─────────
  { name:'Indian National Symbols', wikiCat:'National_symbols_of_India', topics:[
    'Flag of India','Emblem of India','National anthem of India',
    'National song of India','National calendar of India',
    'National fruit of India','National river of India',
    'National aquatic animal of India','National reptile of India',
    'National heritage animal of India',
    'National currency of India','Indian passport',
    'Vande Mataram','Jana Gana Mana','Satyameva Jayate',
    'Lion Capital of Ashoka','Ashoka Chakra',
    'Tricolour (India)','Flag code of India',
    'National Pledge (India)','Oath of office (India)',
    'Constitution of India','Preamble to the Constitution of India',
    'List of official languages of India',
    'State Emblem of India','National Identity Card of India',
    'Aadhaar','Permanent account number','Voter ID (India)',
    'Driving licence in India','Passport (India)',
    'National population register'
  ]},
  // ───────── Agriculture & Food ─────────
  { name:'Agriculture & Food', wikiCat:'Agriculture_in_India', topics:[
    'Agriculture in India','Green Revolution in India','White Revolution (India)',
    'Land reforms in India','Irrigation in India','Soil conservation in India',
    'List of crops in India','List of agricultural universities in India',
    'Indian Council of Agricultural Research',
    'Kharif crop','Rabi crop','Zaid crop',
    'Rice production in India','Wheat production in India',
    'Sugarcane production in India','Cotton production in India',
    'Tea production in India','Coffee production in India',
    'Spices in India','List of Indian spices',
    'Milk production in India','Egg production in India',
    'Meat production in India','Poultry farming in India',
    'Fisheries in India','Aquaculture in India',
    'Horticulture in India','Floriculture in India',
    'Organic farming in India','Natural farming in India',
    'Precision agriculture','Vertical farming in India',
    'Subsistence agriculture in India','Commercial agriculture in India',
    'Plantation agriculture in India','Mixed farming in India',
    'Agricultural marketing in India','Minimum support price (India)',
    'Public distribution system in India','Food Corporation of India',
    'Food processing in India','Cold storage in India',
    'Nutrients in agriculture','Fertilizer in India',
    'Pesticide in India','Biopesticide','Biofertilizer',
    'Seed industry in India','Genetically modified crops in India',
    'Bt cotton in India','Golden rice','Farmers\' suicides in India',
    'Agriculture debt waiver in India','Kisan Credit Card',
    'Pradhan Mantri Fasal Bima Yojana',
    'Pradhan Mantri Kisan Samman Nidhi',
    'Soil Health Card Scheme','Neem coated urea',
    'National Food Security Mission',
    'National Mission for Sustainable Agriculture',
    'Paramparagat Krishi Vikas Yojana',
    'Mission for Integrated Development of Horticulture',
    'National Livestock Mission','Blue Revolution in India',
    'Animal husbandry in India','Dairy farming in India',
    'World Food Programme','Food and Agriculture Organization',
    'World Food Day','World Hunger Day',
    'Nutrition in India','Calorie consumption in India',
    'Protein consumption in India','Food fortification in India',
    'Food adulteration in India','Food safety in India',
    'Food Safety and Standards Authority of India'
  ]},
  // ───────── Health & Medicine ─────────
  { name:'Health & Medicine', wikiCat:'Health_in_India', topics:[
    'Health in India','Healthcare in India','Public health in India',
    'National Health Mission','Ayushman Bharat','Janani Suraksha Yojana',
    'Ministry of Health and Family Welfare',
    'Indian Council of Medical Research',
    'All India Institutes of Medical Sciences',
    'World Health Organization','WHO India',
    'Life expectancy in India','Infant mortality in India',
    'Maternal mortality in India','Child mortality in India',
    'Malnutrition in India','Anaemia in India','Obesity in India',
    'Diabetes in India','Cardiovascular disease in India',
    'Cancer in India','Tuberculosis in India','Malaria in India',
    'Dengue in India','Chikungunya in India','COVID-19 pandemic in India',
    'HIV/AIDS in India','Leprosy in India','Polio in India',
    'Smallpox in India','Chickenpox in India','Measles in India',
    'Hepatitis in India','Typhoid in India','Cholera in India',
    'Diarrhoea in India','Pneumonia in India','Asthma in India',
    'Mental health in India','Depression in India',
    'Suicide in India','Eye donation in India',
    'Blood donation in India','Organ donation in India',
    'Traditional medicine in India','Ayurveda','Yoga',
    'Naturopathy','Unani medicine','Siddha medicine','Homeopathy',
    'Indian pharmaceutical industry','Generic drugs in India',
    'Medicine prices in India','Drug pricing in India',
    'Clinical trials in India','Medical research in India',
    'Medical education in India','Nursing in India',
    'Rural health in India','Urban health in India',
    'Tribal health in India','School health in India',
    'Indian red cross society','Indian medical association',
    'National Pharmaceutical Pricing Authority',
    'Drugs Controller General of India'
  ]},
  // ───────── Constitution ─────────
  { name:'Constitution', wikiCat:'Constitution_of_India', topics:[
    'Constitution of India','Preamble to the Constitution of India',
    'Fundamental rights in India','Directive principles in India',
    'Fundamental duties in India','Amendment of the Constitution of India',
    'List of amendments of the Constitution of India',
    'Union List','State List','Concurrent List',
    'Federalism in India','Basic structure doctrine',
    'Judicial review in India','Writ jurisdiction in India',
    'Public Interest Litigation in India','Election Commission of India',
    'President of India','Prime Minister of India','Parliament of India',
    'Supreme Court of India','High courts of India','Governor (India)',
    'Panchayati Raj','Municipal governance in India',
    'Finance Commission of India','NITI Aayog',
    'Comptroller and Auditor General of India',
    'Attorney General of India','Solicitor General of India',
    'Chief Election Commissioner of India',
    'Union Public Service Commission','State Public Service Commission',
    'Official language of India','Languages with official status in India'
  ]},
  // ───────── Computer & IT ─────────
  { name:'Computer & IT', wikiCat:'Information_technology_in_India', topics:[
    'Computer','Computer science','Programming language','Operating system',
    'Database','Computer network','Internet','World Wide Web',
    'Cybersecurity','Cryptography','Artificial intelligence',
    'Machine learning','Deep learning','Data science','Cloud computing',
    'Software engineering','Information technology in India',
    'Software industry in India','IT services in India',
    'Business process outsourcing in India',
    'Telecommunications in India','Internet in India',
    'Digital India','E-governance in India','Aadhaar',
    'Unified Payments Interface','BHIM','India Stack',
    'Open Network for Digital Commerce','National Supercomputing Mission',
    'Param (supercomputer)','List of Indian IT companies',
    'Tata Consultancy Services','Infosys','Wipro','HCL Technologies',
    'Tech Mahindra','LTI Mindtree','Cognizant'
  ]},
  // ───────── Railways & Transport ─────────
  { name:'Railways & Transport', wikiCat:'Rail_transport_in_India', topics:[
    'Indian Railways','Rail transport in India','History of Indian Railways',
    'List of railway stations in India','Indian Railway zones',
    'Indian Railway divisions','List of Indian Railways trains',
    'Vande Bharat Express','Rajdhani Express','Shatabdi Express',
    'Duronto Express','Gatimaan Express','Tejas Express',
    'Kolkata Metro','Delhi Metro','Chennai Metro','Mumbai Metro',
    'Namma Metro','Hyderabad Metro','Kochi Metro','Lucknow Metro',
    'Road transport in India','National Highways of India',
    'Golden Quadrilateral','North–South–East–West Corridor',
    'Bharatmala Pariyojana','Sagarmala programme','Ports in India',
    'Civil aviation in India','Airports in India','Air India',
    'IndiGo','SpiceJet','Vistara','Go First','Akasa Air',
    'Water transport in India','Inland waterways in India',
    'National Waterway 1','National Waterway 2',
    'National Waterway 3','Shipping industry in India',
    'Kolkata Port Trust','Mumbai Port Trust','Chennai Port',
    'Jawaharlal Nehru Port','Paradip Port','Visakhapatnam Port'
  ]},
  // ───────── Energy & Power ─────────
  { name:'Energy & Power', wikiCat:'Energy_in_India', topics:[
    'Energy in India','Energy policy of India','Ministry of Power (India)',
    'Power sector in India','Electricity sector in India',
    'National Grid (India)','Coal in India','Coal mining in India',
    'Petroleum in India','Oil and gas industry in India',
    'Indian Oil Corporation','ONGC','Reliance Industries',
    'Natural gas in India','City Gas Distribution in India',
    'Renewable energy in India','Solar power in India',
    'Wind power in India','Hydroelectric power in India',
    'Nuclear power in India','Biomass in India',
    'Nuclear power plants in India','Thermal power stations in India',
    'Hydroelectric projects in India','Solar parks in India',
    'Wind farms in India','National Solar Mission',
    'International Solar Alliance','Power Grid Corporation of India',
    'Coal India','NTPC Limited','NHPC Limited',
    'National Hydroelectric Power Corporation',
    'Nuclear Power Corporation of India',
    'Bharat Heavy Electricals Limited'
  ]},
  // ───────── Indian Judiciary & Laws ─────────
  { name:'Indian Judiciary', wikiCat:'Law_of_India', topics:[
    'Law of India','Judiciary of India','Indian Penal Code','Criminal Procedure Code (India)',
    'Civil Procedure Code (India)','Indian Evidence Act','Legal Services Authorities Act 1987',
    'High courts of India','List of high courts of India','District courts in India',
    'Lok Adalat','National Lok Adalat','Fast-track courts in India','Family court (India)',
    'Consumer court (India)','Income Tax Appellate Tribunal','National Green Tribunal',
    'National Company Law Tribunal','Arbitration in India','Legal aid in India',
    'Public prosecutor (India)','Chief Justice of India','List of judges of the Supreme Court of India',
    'Law commission of India','Bar Council of India','National Law University',
    'Right to constitutional remedies','Fundamental rights in India',
    'Article 370','Article 356 (India)','Article 21 of the Constitution of India',
    'Cyber crimes in India','Information Technology Act, 2000','Data Protection Bill, India',
    'Prevention of Corruption Act, 1988','Candidates\'s List','Money laundering in India',
    'Black money','Benami Transactions (Prohibition) Act, 1988',
    'Custodial violence','Death penalty in India','Capital punishment in India',
    'Three-tier judicial system in India','PIL in India','Contempt of court in India'
  ]},
  // ───────── Tribal & Regional Cultures ─────────
  { name:'Indian Tribes', wikiCat:'Tribes_of_India', topics:[
    'Adivasi','Scheduled Tribes of India','List of Scheduled Tribes in India',
    'Particularly Vulnerable Tribal Groups','Bhil','Gondi people','Santhal people',
    'Munda people','Oraon','Khasi people','Garo people','Nagas','Mizo people',
    'Toda people','Great Andamanese','Jarawa (Andaman Islands)','Sentinelese',
    'Chenchu','Irula people','Kurumba (tribe)','Kani tribe','Padar','Bodo people',
    'Kukis','Apatani people','Adi people','Nishi people','Monpa people',
    'Lepcha people','Sherpa people','Ranjit','Banjara','Kalbelia',
    'Siddi','Pardhi','Tharu people','Rabari','Meena','Garasia people',
    'Dongria Kondh','Saora people','Bonda (tribe)','Kutia Kondh'
  ]},
  // ───────── Education in India ─────────
  { name:'Education in India', wikiCat:'Education_in_India', topics:[
    'Education in India','History of education in India','Gurukula','Nalanda University',
    'Takshashila','Taxila','Madrasa','Sanskrit education','NTA','CBSE','ICSE',
    'National Education Policy 2020','New Education Policy','Right to Education Act',
    'Sarva Shiksha Abhiyan','Midday Meal Scheme','Beti Bachao Beti Padhao',
    'Navodaya Vidyalaya','Kendriya Vidyalaya','Sainik School','Ekalavya model residential school',
    'Demographic dividend in India','Indian Institutes of Technology','Indian Institute of Management',
    'National Institutes of Technology','All India Institute of Medical Sciences',
    'Indian Institute of Science','Central universities of India',
    'UGC','AICTE','NCERT','NIOS','IGNOU','NEET','JEE (Main)','UPSC Civil Services Examination',
    'Median class','Reservation in India','Literacy in India','Sarva Shiksha Abhiyan'
  ]},
  // ───────── Indian Wars & Battles ─────────
  { name:'Indian Battles', wikiCat:'Battles_involving_India', topics:[
    'Military history of India','Kalinga War','Battle of Panipat (1526)',
    'Battle of Khanwa','Battle of Haldighati','Battle of Plassey','Battle of Buxar',
    'Battle of Wandiwash','Anglo-Maratha Wars','Anglo-Mysore Wars','Battle of Seringapatam',
    'First Anglo-Sikh War','Second Anglo-Sikh War','Battle of Sobraon',
    'Battle of Chillianwala','Indian Rebellion of 1857','Siege of Delhi (1857)',
    'Battle of Chinhat','Battle of Kandahar','Third Battle of Panipat',
    'First Battle of Panipat','Battle of Tarain','Battle of Talikota','Battle of Rajarata',
    'Battle of Pavan Khind','Battle of Rakshasbhuvan','Battle of Nainwa','Battle of Ambur',
    'Battle of Karnal','Battle of Colachel','Battle of Talikota','Carnatic Wars',
    'Anglo-Afghan Wars','Sino-Indian War','Indo-Pakistani War of 1947',
    'Indo-Pakistani War of 1965','Indo-Pakistani War of 1971','Kargil War',
    'Battle of Longewala','Operation Blue Star','Operation Vijay (India)',
    'Operation Meghdoot','Battle of Siachen Glacier','Tamil Tigers','LTTE'
  ]},
  // ───────── Tourism & Heritage Sites ─────────
  { name:'Indian Heritage', wikiCat:'World_Heritage_Sites_in_India', topics:[
    'List of World Heritage Sites in India','Sundarbans','Nanda Devi and Valley of Flowers',
    'Kaziranga National Park','Manas National Park','Keoladeo National Park',
    'Great Himalayan National Park','Western Ghats','Western Ghats (UNESCO)',
    'Agra Fort','Ajanta Caves','Ellora Caves','Chhatrapati Shivaji Terminus',
    'Humayun\'s Tomb','Mahabodhi Temple','Charminar','Jaipur City',
    'Jantar Mantar','Rani ki Vav','Hill Forts of Rajasthan','Fatehpur Sikri',
    'Mountain Railways of India','Kalka\u2013Shimla railway','Darjeeling Himalayan Railway',
    'Nilgiri Mountain Railway','Qutub Minar','Red Fort','Taj Mahal','Capitol Complex, Chandigarh',
    'Victorian Gothic and Art Deco Ensembles of Mumbai','Khajuraho Group of Monuments',
    'Group of Monuments at Mahabalipuram','Konark Sun Temple','Archaeological Site of Nalanda',
    'Elephanta Caves','Champaner-Pavagadh Archaeological Park','Bhimbetka rock shelters',
    'Pattadakal','Sanchi Stupa','Great Chola Temples','Brihadisvara Temple, Thanjavur',
    'Churches and convents of Goa','Monuments of Hampi','Monuments at Mahabalipuram',
    'Mansar','Kunchikal','Ramappa Temple','Kakatiya Rudreshwara Temple'
  ]},
  // ───────── Indian Cinema ─────────
  { name:'Indian Cinema', wikiCat:'Cinema_of_India', topics:[
    'Cinema of India','Bollywood','Cinema of South India','Tollywood (Telugu)','Kollywood',
    'Mollywood','Sandalwood','Cinema of West Bengal','Cinema of Assam','Cinema of Odisha',
    'Cinema of Punjab','Cinema of India history','Indian film awards','National Film Awards',
    'Filmfare Awards','Dadasaheb Phalke Award','International Film Festival of India',
    'Satellite based movie channel','Cinematograph Act 1952','Central Board of Film Certification',
    'Indian documentary','Indian animation','VFX in India','Music of Bollywood'
  ]},
  // ───────── Women & Social Issues ─────────
  { name:'Women & Society', wikiCat:'Women_in_India', topics:[
    'Women in India','Women\'s reservation in India','Women\'s Reservation Bill',
    'Sangh Parivar','Women in Indian Armed Forces','Feminism in India','Dowry in India',
    'Dowry death','Female foeticide in India','Child marriage in India','Honor killing in India',
    'Sati (practice)','Devadasi','Triple talaq','Muslim Women (Protection of Rights on Marriage) Act, 2019',
    'Women\'s suffrage in India','Women legislators in India','Women in workforce in India',
    'Sukanya Samriddhi Yojana','Beti Bachao Beti Padhao','Mission Shakti (India)',
    'Rashtriya Mahila Kosh','National Commission for Women','Mahila Court',
    'Kasturba Gandhi Balika Vidyalaya','Ujjwala Scheme','One Stop Centre Scheme',
    'Women in Indian politics','Justice Gyan Sudha Misra','Savita Devi (politician)'
  ]},
  // ───────── Soil Science & Conservation ─────────
  { name:'Soil & Watershed', wikiCat:'Soil_science', topics:[
    'Soil science','Pedology','Soil taxonomy','Soil classification','Soil horizon','Soil profile',
    'Soil texture','Soil structure','Soil organic matter','Humus','Soil fertility','Soil pH',
    'Soil salinity','Soil alkalinity','Soil acidity','Base saturation','Cation-exchange capacity',
    'Soil erosion','Sheet erosion','Rill erosion','Gully erosion','Wind erosion','Splash erosion',
    'Soil conservation','Terrace (agriculture)','Contour plowing','Strip cropping','Mulch','No-till farming',
    'Watershed','Watershed management','Check dam','Gully plug','Gabion','Afforestation','Agroforestry',
    'Waterlogging (agriculture)','Drainage','Field tile drainage','Land reclamation','Salinity control',
    'Soil moisture','Field capacity','Wilting point','Available water capacity','Infiltration (hydrology)',
    'Runoff','Hydrograph','Water table','Aquifer','Groundwater','Hydrology','Hydrology (agriculture)',
    'Surveying','Chain surveying','Level (instrument)','Theodolite','Total station','Contour line',
    'Global Positioning System','Remote sensing','Geographic information system','Photogrammetry',
    'Irrigation','Drip irrigation','Sprinkler irrigation','Surface irrigation','Furrow irrigation',
    'Irrigation tank','Crop coefficient','Irrigation scheduling','Water use efficiency','Pipe flow',
    'Open-channel flow','Weir','Canal','Dam','Barrage','Headworks','Field channel','Watercourse',
    'Land grading','Laser land leveling','Soil test','Fertilizer','Manure','Compost','Biofertilizer',
    'Legume','Nitrogen fixation','Phosphorus','Potassium','Micronutrient','Organic farming','Integrated nutrient management'
  ]},
  // ───────── Horticulture ─────────
  { name:'Horticulture', wikiCat:'Horticulture', topics:[
    'Horticulture','Pomology','Olericulture','Floriculture','Landscaping','Arboriculture','Turf management',
    'Vegetable','Fruit','Spice','Plantation','Orchard','Fruit tree propagation','Grafting','Budding',
    'Layering','Cutting (plant)','Tissue culture','Micropropagation','Plant nursery','Germination',
    'Seed dormancy','Vernalization','Photoperiodism','Trickle irrigation','Greenhouse','Polyhouse',
    'Shade house','Plant propagation','Pollination','Fertigation','Plant nutrition','Deficiency symptom',
    'Banana','Mango','Citrus','Grape','Pomegranate','Guava','Papaya','Pineapple','Apple','Pear','Peach','Plum',
    'Strawberry','Date palm','Coconut','Areca nut','Cashew','Pepper','Cardamom','Turmeric','Ginger',
    'Onion','Garlic','Potato','Tomato','Brinjal','Chilli','Okra','Cabbage','Cauliflower','Carrot','Radish',
    'Spinach','Lettuce','Coriander','Mint','Rose','Marigold','Jasmine','Chrysanthemum','Gladiolus',
    'Tuberose','Orchid','Anthurium'
  ]},
  // ───────── Farm Power & Machinery ─────────
  { name:'Farm Machinery', wikiCat:'Agricultural_machinery', topics:[
    'Agricultural machinery','Tractor','Farm tractor','Power tiller','Combine harvester','Thresher',
    'Mower','Reaper','Seed drill','Planter (farm implement)','Transplanter','Sprayer','Row crop cultivator',
    'Plough','Harrow (tool)','Cultivator','Disc harrow','Subsoiler','Leveler','Ridger','Puddler',
    'Land levelling','Draft animal','Bullock cart','Tractor drawn implements','Three-point hitch',
    'Power take-off','Tillage','Conventional tillage','Conservation tillage','Minimum tillage',
    'Harvesting','Sickle','Sickle bar mower','Fodder','Silage','Hay','Powered machinery','Field sprayer',
    'Duster (agriculture)','Grain handling','Grain dryer','Silo','Grain mill','Rice mill','Flour mill',
    'Oil mill','Agricultural engineering','Ergonomics','Farm mechanisation','Custom hiring centre'
  ]},
  // ───────── Food Processing & Agricultural Engineering ─────────
  { name:'Food Processing', wikiCat:'Food_processing', topics:[
    'Food processing','Unit operation','Food preservation','Food science','Food technology',
    'Food industry','Food microbiology','Food safety','Food additive','Food packaging','Canning',
    'Drying','Freeze drying','Dehydration','Refrigeration','Pasteurization','Sterilization (microbiology)',
    'Fermentation','Pickling','Salting (food)','Smoking (cooking)','Preservative','Antioxidant',
    'Food colouring','Flavour','Texture (food)','Food chemistry','Carbohydrate','Protein','Fat','Starch',
    'Pectin','Enzyme','Heat transfer','Mass transfer','Evaporation','Concentration','Extrusion',
    'Milling (grinding)','Cereal','Wheat flour','Rice processing','Parboiled rice','Maize','Millet','Pulse',
    'Oil extraction','Oilseed','Sugar industry','Jaggery','Dairy processing','Milk','Cheese','Yoghurt','Ghee',
    'Meat processing','Fish processing','Fruit processing','Juice','Jam','Pickle','Sauce','Bakery',
    'Convenience food','Ready-to-eat food','Cold chain','Food cold chain','Food loss and waste','Fortified food','Nutrition'
  ]},
  // ───────── Agricultural Engineering & Bioenergy ─────────
  { name:'Agricultural Engineering', wikiCat:'Agricultural_engineering', topics:[
    'Agricultural engineering','Farm machinery','Irrigation engineering','Soil and water conservation engineering',
    'Food engineering','Postharvest technology','Farm structure','Greenhouse','Animal housing','Farmstead',
    'Renewable energy','Bioenergy','Biogas','Biomass','Biofuel','Biodiesel','Ethanol fuel','Biogas digester',
    'Solar energy','Solar panel','Solar water heater','Wind power','Micro hydro','Hydroelectricity',
    'Energy crop','Jatropha','Sugarcane ethanol','Corn ethanol','Anaerobic digestion','Gasification','Pyrolysis',
    'Combustion','Heat pump','Solar dryer','Solar pumping','Agricultural waste','Crop residue','Straw',
    'Climate change and agriculture','Precision agriculture','Smart agriculture','IoT in agriculture',
    'Farm management','Agribusiness','Agricultural extension','Agricultural economics','Value chain',
    'Warehousing','Cold storage','Supply chain','Jute','Cotton gin'
  ]},
  // ───────── Basic & Applied Sciences (Technical Education) ─────────
  { name:'Applied Sciences', wikiCat:'Applied_science', topics:[
    'Applied science','Engineering','Basic research','Applied mathematics','Numerical analysis','Calculus',
    'Statistics','Probability','Linear algebra','Differential equation','Applied physics','Mechanics','Thermodynamics',
    'Electromagnetism','Optics','Fluid mechanics','Solid mechanics','Material science','Applied chemistry',
    'Chemical engineering','Industrial chemistry','Polymer','Ceramic','Metallurgy','Corrosion',
    'Electrical engineering','Electronics','Instrumentation','Digital electronics','Microprocessor',
    'Computer engineering','Software engineering','Programming language','Operating system','Database',
    'Civil engineering','Structural engineering','Geotechnical engineering','Construction','Concrete','Steel',
    'Mechanical engineering','Machine design','Manufacturing engineering','Machine tool','Automobile','Engine',
    'Thermal engineering','Refrigeration and air conditioning','Workshop','Drafting','Technical drawing',
    'Computer-aided design','Mechatronics','Robotics','Automation','Nanotechnology','Biotechnology'
  ]},
  // ───────── Mechanical Engineering (applied machine-design, fluid, thermo, hydraulics) ─────────
  { name:'Mechanical Engineering', wikiCat:'Mechanical_engineering', topics:[
    'Mechanical engineering','Machine design','Machine element','Machine tool','Workshop','Engine','Internal combustion engine','Diesel engine','Petrol engine',
    'Fluid mechanics','Fluid dynamics','Fluid statics','Hydraulics','Hydraulic machinery','Fluid machinery','Pipe','Nozzle','Venturi effect','Bernoulli principle','Pascal law','Continuity equation',
    'Pump','Centrifugal pump','Reciprocating pump','Turbine','Hydraulic turbine','Water turbine','Steam turbine','Impeller','Propeller','Discharge','Head (hydraulic)','Manometer','Venturimeter','Pitot tube','Flow measurement',
    'Valve','Safety valve','Relief valve','Pressure relief valve','Check valve','Non-return valve','Gate valve','Globe valve','Ball valve','Butterfly valve','Slide valve','Regulating valve','Throttle valve','Pressure regulator','Pressure gauge',
    'Thermodynamics','Thermodynamic cycle','Carnot cycle','Otto cycle','Diesel cycle','Rankine cycle','Heat engine','Heat pump','Refrigeration','Refrigerator','Air conditioning','Cooling tower','Condenser','Evaporator','Compressor','Heat exchanger','Boiler','Steam engine',
    'Hydraulics and pneumatics','Pneumatics','Bearing','Rolling-element bearing','Journal bearing','Gear','Gear train','Clutch','Brake','Flywheel','Coupling','Shaft','Spring (device)','Fastener','Screw','Bolt','Nut (hardware)','Wrench','Gasket','Seal (mechanical)',
    'Strength of materials','Stress (mechanics)','Strain (mechanics)','Young modulus','Hardness','Tensile strength','Compressive strength','Fatigue (material)','Factor of safety','Casting','Forging','Welding','Machining','Drilling','Lathe','Milling (machining)','Grinding (abrasive cutting)','Sheet metal','CNC machine'
  ]},
  // ───────── Meteorology & Climate (Indian monsoon, weather systems) ─────────
  { name:'Meteorology & Climate', wikiCat:'Meteorology', topics:[
    'Meteorology','Indian monsoon','Monsoon of South Asia','Southwest monsoon','Northeast monsoon',
    'El Niño','La Niña','Indian Ocean Dipole','Western Disturbance','Jet stream',
    'Tropical cyclone','Cyclone','Thunderstorm','Cloudburst','Heat wave','Cold wave',
    'Drought','Flood','Meteorological departments in India','India Meteorological Department',
    'IMD cyclone warnings','Monsoon onset','Monsoon retreat','Kerala monsoon','Bay of Bengal cyclone',
    'Arabian Sea cyclone','Cyclone Nivar','Cyclone Amphan','Cyclone Fani','Cyclone Tauktae',
    'Cyclone Yaas','Cyclone Mocha','Cyclone Biparjoy','El Nino Southern Oscillation',
    'Rainfall in India','Indian summer monsoon','Winter monsoon','Southwest Monsoon of 2020'
  ]},
  // ───────── Animal Husbandry, Poultry, Fisheries ─────────
  { name:'Animal Husbandry & Dairy', wikiCat:'Animal_husbandry', topics:[
    'Animal husbandry','Livestock','Poultry farming','Poultry in India','Dairy farming in India',
    'Cattle (cow)','Buffalo','Goat farming','Sheep farming','Pig farming','Horse breeding',
    'Veterinary medicine','Veterinary surgery','Animal breeding','Artificial insemination',
    'Dairy cattle','Milking','Milk','Ghee','Pasteurization','National Dairy Development Board',
    'Operation Flood','White Revolution (India)','Indian Council of Agricultural Research',
    'Indian Veterinary Research Institute','Vaccines in livestock','Poultry disease','Fodder','Silo'
  ]},
  { name:'Fisheries & Aquaculture', wikiCat:'Fishery', topics:[
    'Fishery','Fishing','Aquaculture','Mariculture','Inland fisheries in India',
    'Fisheries in India','Indian fisheries sector','Fish production in India','Pisciculture',
    'Fish hatchery','Fish farming','Freshwater fish','Marine fish','Prawn farming','Shrimp farming',
    'Fish meal','Fish processing','National Fisheries Development Board','Pradhan Mantri Matsya Sampada Yojana',
    'Fisheries Research Institutes of India','Central Institute of Fisheries','Deep sea fishing','Coastal fishing'
  ]},
  // ───────── Telecommunications & Postal ─────────
  { name:'Telecom & Postal', wikiCat:'Telecommunications_in_India', topics:[
    'Telecommunications in India','Telecom Regulatory Authority of India','TRAI',
    'Bharat Sanchar Nigam Limited','BSNL','Mahanagar Telephone Nigam Limited','Reliance Jio',
    'Airtel India','Vodafone Idea','Spectrum auction in India','5G, India','4G LTE',
    'National Optical Fibre Network','BharatNet','Digital India','Bharat Broadband Network',
    'Department of Telecommunications','Sanchar Saathi','Mobile number portability (India)',
    'Indian Postal Service','India Post','India Post Payments Bank','Postal Index Number',
    'Indian postal service history','Philately in India','Department of Posts (India)',
    'Postal savings scheme in India','Public Provident Fund (India)','National Savings Institute'
  ]},
  // ───────── Mining & Mineral Resources ─────────
  { name:'Mining & Minerals', wikiCat:'Mining_in_India', topics:[
    'Mining in India','Ministry of Mines (India)','Coal mining in India','Iron ore in India',
    'Bauxite mining in India','Copper mining in India','Gold mining in India','Mica mining in India',
    'Limestone mining','Dolomite','Manganese in India','Chromite in India','Zinc in India',
    'Rare-earth element mining in India','Ilmenite','Monazite','Mineral wealth of India',
    'Geological Survey of India','Mines and Minerals (Development and Regulation) Act',
    'National Mineral Development Corporation','Hindustan Zinc','Coal India','Neyveli Lignite Corporation',
    'Steel Authority of India','Aluminium in India','Mineral belts of India','Chota Nagpur belt',
    'Singhbhum belt','Dharwar belt','Kolar Gold Fields','Ballari iron ore district',
    'Atomic Minerals Directorate','Uranium mining in India','Jaduguda mine','Sukinda chromite valley'
  ]},
  // ───────── Indian Classical Music, Dance & Fine Arts ─────────
  { name:'Indian Music & Fine Arts', wikiCat:'Music_of_India', topics:[
    'Music of India','Hindustani classical music','Carnatic music','Indian classical music',
    'Raga','Tala (music)','Khyal','Dhrupad','Thumri','Tappa','Ghazal','Khayal',
    'Sitar','Santoor','Tabla','Mridangam','Veena','Sarod','Flute, India','Shehnai',
    'All India Radio','Sangeet Natak Akademi','Tyagaraja','Muthuswami Dikshitar','Syama Sastri',
    'Ravi Shankar','M. S. Subbulakshmi','Bismillah Khan','Zakir Hussain','Amjad Ali Khan',
    'Ustad Allauddin Khan','Bhajan','Kirtan','Rabindra Sangeet','Folk music of India',
    'Bollywood music','Filmi music','Indian pop music','Sufi music','Indian rock music'
  ]},
  // ───────── Indian Languages & Literature ─────────
  { name:'Indian Languages', wikiCat:'Languages_of_India', topics:[
    'Languages of India','List of official languages of India','Eighth Schedule to the Constitution of India',
    'Hindi','Sanskrit','Tamil language','Telugu language','Kannada language','Malayalam language',
    'Bengali language','Marathi language','Gujarati language','Punjabi language','Odia language',
    'Assamese language','Urdu in India','Kashmiri language','Konkani language','Bodo language',
    'Santhali language','Sindhi language','Manipuri language','Nepali language','Maithili language',
    'Scheduled languages of India','Classical languages of India','Official Languages Act, 1963',
    'Mother tongue','Linguistic Survey of India','Census of India languages','Regional language',
    'Vernacular','Indian English'
  ]},
  // ───────── Landmark Supreme Court & High Court Cases ─────────
  { name:'Courts Cases & Verdicts', wikiCat:'Supreme_Court_of_India_cases', topics:[
    'List of landmark court decisions in India','Kesavananda Bharati v. State of Kerala',
    'Golaknath v. State of Punjab','Minerva Mills v. Union of India','S. R. Bommai v. Union of India',
    'Maneka Gandhi v. Union of India','A. K. Gopalan v. State of Madras','ADM Jabalpur v. Shivkant Shukla',
    'Navtej Singh Johar v. Union of India','Indian Union Muslim League v. Union of India',
    'K. S. Puttaswamy v. Union of India','Vishaka v. State of Rajasthan','Sabrimala Temple case',
    'Justice K. S. Puttaswamy privacy case','National Legal Services Authority v. Union of India',
    'Lata Singh v. State of Uttar Pradesh','Hussainara Khatoon case','Sunil Batra v. Delhi Administration',
    'Bandhua Mukti Morcha v. Union of India','E. P. Royappa v. State of Tamil Nadu',
    'Ranjit D. Udeshi v. State of Maharashtra','Ashoka Kumar Thakur v. Union of India',
    'Indra Sawhney v. Union of India','T. M. A. Pai Foundation v. State of Karnataka',
    'R. D. Agarwala case','West Bengal v. Union of India',
    'Supreme Court Advocates-on-Record Association v. Union of India','Delhi Judicial Service case'
  ]},
  // ───────── Ayurveda & Traditional Medicine ─────────
  { name:'Ayurveda & Traditional Medicine', wikiCat:'Ayurveda', topics:[
    'Ayurveda','Ayurvedic medicine','History of Ayurveda','Tridosha','Vata','Pitta','Kapha',
    'Panchakarma','Rasayana','Charaka Samhita','Sushruta Samhita','Ashtanga Hridayam',
    'Ayurvedic herbs','Tulsi','Ashwagandha','Turmeric','Neem','Ginger','Triphala','Amla',
    'Ayurvedic colleges in India','Ministry of AYUSH','AYUSH','National Commission for Indian System of Medicine',
    'Central Council for Research in Ayurvedic Sciences','Unani medicine','Siddha medicine','Homeopathy in India',
    'Yoga','Pranayama','Nadi (yoga)','Chakras','Naturopathy'
  ]},
  // ───────── Architecture & Heritage Monuments ─────────
  { name:'Indian Architecture', wikiCat:'Architecture_of_India', topics:[
    'Architecture of India','Indus Valley architecture','Indian rock-cut architecture','Temple architecture of India',
    'Dravidian architecture','Nagara style','Vesara architecture','Hill Forts of Rajasthan',
    'Mughal architecture','Indo-Islamic architecture','Indo-Saracenic architecture','Colonial architecture in India',
    'Le Corbusier Chandigarh','Bauhaus in India','Laurie Baker','B. V. Doshi',
    'Iron Pillar of Delhi','Kailasa temple, Ellora','Meenakshi Temple','Sun Temple, Konark',
    'Brihadeeswarar Temple','Khajuraho Group of Monuments','Qutb Minar complex','Red Fort',
    'Taj Mahal','Fatehpur Sikri','Humayun\'s Tomb','Charminar','Gol Gumbaz','Hawa Mahal',
    'Victoria Memorial, Kolkata','Rashtrapati Bhavan','Parliament House, India','Gateway of India',
    'India Gate','Howrah Bridge','Indian Heritage Cities Network','Vastu Shastra'
  ]},
  // ───────── Group 10: Broad India coverage (new, high-yield categories) ─────────
  { name:'Indian Wildlife & National Parks', wikiCat:'Wildlife_sanctuaries_of_India', topics:[
    'Wildlife sanctuaries of India','National parks of India','Bandipur National Park','Corbett National Park',
    'Kaziranga National Park','Gir National Park','Sundarbans National Park','Ranthambore National Park',
    'Kanha National Park','Periyar National Park','Jim Corbett','Project Tiger','Project Elephant',
    'Asiatic lion','Bengal tiger','Indian leopard','Indian rhinoceros','Asian elephant','Blackbuck',
    'Great Indian bustard','Gharial','Indian peafowl','Brahmaputra','Chilika Lake','Bharatpur Bird Sanctuary',
    'Western Ghats','Thar Desert','Sundarbans','Nanda Devi','Nokrek','Sundarbans Tiger Reserve'
  ]},
  { name:'Indian Rivers & Water Resources', wikiCat:'Dams_in_India', topics:[
    'Rivers of India','Ganges','Yamuna','Brahmaputra','Godavari','Krishna River','Narmada River','Tapti River',
    'Mahanadi','Kaveri','Beas River','Ravi River','Sutlej','Chenab River','Jhelum River','Damodar River',
    'Periyar River','Tungabhadra River','Bhima River','Gandak','Kosi River','Chambal River','Betwa River',
    'Sardar Sarovar Dam','Hirakud Dam','Bhakra Dam','Nagarjuna Sagar Dam','Tehri Dam','Krishna Raja Sagara',
    'Kallanai','Farakka Barrage','Indira Gandhi Canal','Rajasthan Canal','Upper Bari Doab Canal',
    'Rihand Dam','Dams in India','Peninsular rivers of India','East flowing rivers of India'
  ]},
  { name:'Indian Festivals & Fairs', wikiCat:'Festivals_in_India', topics:[
    'Festivals in India','Diwali','Holi','Dussehra','Raksha Bandhan','Navratri','Durga Puja','Ganesh Chaturthi',
    'Krishna Janmashtami','Maha Shivratri','Ram Navami','Gurpurab','Eid al-Fitr','Eid al-Adha','Muharram',
    'Buddha Purnima','Mahavir Jayanti','Christmas in India','Pongal','Makar Sankranti','Lohri','Onam',
    'Vishu','Bihu','Rath Yatra','Janmashthami','Karva Chauth','Chhath Puja','Bhai Dooj','Hemis Festival',
    'Kumbh Mela','Pushkar Fair','Sonepur cattle fair','Surajkund international crafts mela','Hornbill Festival',
    'Losar Festival','Thrissur Pooram','Ganga Sagar Mela','Rann Utsav','Tarnetar Fair','Kolayat Festival'
  ]},
  { name:'Indian Philosophy & Thinkers', wikiCat:'Indian_philosophy', topics:[
    'Indian philosophy','Advaita Vedanta','Samkhya','Nyaya','Vaisheshika','Yoga (philosophy)','Mimamsa',
    'Buddhist philosophy','Jain philosophy','Charvaka','Karma','Dharma','Moksha','Sutra','Upanishads',
    'Vedanta','Vedas','Bhagavad Gita','Ramayana','Mahabharata','Smriti','Shruti','Arthashastra',
    'Adi Shankara','Ramanuja','Madhvacharya','Nimbarka','Vallabha','Gautama Buddha','Mahavira','Chanakya',
    'Swami Vivekananda','Ramakrishna','Mahatma Gandhi philosophy','Jiddu Krishnamurti','Sri Aurobindo',
    'Rabindranath Tagore philosophy','B.R. Ambedkar philosophy','Nalanda','Taxila','Tattva'
  ]},
  { name:'Indian Theatre & Cinema', wikiCat:'Theatre_in_India', topics:[
    'Theatre in India','Indian classical dance','Bharatanatyam','Kathak','Kathakali','Odissi','Kuchipudi',
    'Mohiniyattam','Manipuri dance','Sattriya','Yakshagana','Nautanki','Tamasha','Ramlila','Raslila',
    'Natya Shastra','Bharata Muni','Abhinavagupta','Indian cinema','Bollywood','Hindi cinema','Tamil cinema',
    'Telugu cinema','Malayalam cinema','Kannada cinema','Bengali cinema','Marathi cinema',
    'Satyajit Ray','Girish Karnad','Natyamandir','Padma Subrahmanyam','Birju Maharaj','Rukmini Devi Arundale'
  ]},
  { name:'Indian Literature & Poets', wikiCat:'Indian_literature', topics:[
    'Indian literature','Sanskrit literature','Tamil literature','Begum of Bengal literature','Hindi literature',
    'Bengali literature','Kannada literature','Telugu literature','Malayalam literature','Marathi literature',
    'Gujarati literature','Punjabi literature','Assamese literature','Oriya literature','Urdu literature',
    'Rabindranath Tagore','Bankim Chandra Chatterjee','Saratchandra Chattopadhyay','Premchand',
    'Mulk Raj Anand','R.K. Narayan','Raja Rao','Manik Bandopadhyay','Mahasweta Devi','Amrita Pritam',
    'C. Subramania Bharati','Subramania Swamy literature','Thiruvalluvar','Kamban','Tulsidas','Surdas',
    'Kabir','Bharatendu Harishchandra','Harsha','Banabhatta','Kalidasa','Bhavabhuti','Bilhana',
    'Jnanpith','Sahitya Akademi'
  ]},
  { name:'Indian Handicrafts & Coins', wikiCat:'Coins_of_India', topics:[
    'Coins of India','Indian rupee','Numismatics','Punch-marked coins','Kushan coinage','Gupta coinage',
    'Rupya','Mohur','Dinar','Tanka (numismatics)','East India Company coinage','Mughal coinage',
    'Indian handloom','Pashmina shawl','Banarasi sari','Kanchi sari','Chanderi saree','Tanjore painting',
    'Madhubani art','Warli art','Gond painting','Phulkari','Zardozi','Chikankari','Bidriware',
    'Moradabad brassware','Sambalpuri sari','Patola sari','Ikat','Jamdani','Pachchi art',
    'Channapatna toys','Dokra art','Mysore painting','Pattachitra','Kalamkari'
  ]},
  { name:'Indian Museums & Heritage Sites', wikiCat:'Museums_in_India', topics:[
    'Museums in India','Indian Museum','National Museum, New Delhi','Salar Jung Museum','Victoria Memorial',
    'Prince of Wales Museum','Calico Museum','National Gallery of Modern Art','Albert Hall Museum',
    'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya','Birla Museum','Government Museum, Chennai',
    'Archaeological Museum, Hampi','Raja Dinkar Kelkar Museum','Sarnath Museum','Iron Pillar of Delhi',
    'UNESCO World Heritage Sites in India','Agra Fort','Fatehpur Sikri','Nalanda','Ajanta Caves','Ellora Caves',
    'Konark Sun Temple','Khajuraho','Mahabalipuram','Hampi','Aihole','Badami','Pattadakal','Jantar Mantar',
    'Champaner-Pavagadh','Great Living Chola Temples','Kakatiya Rudreshwara Temple','Rani ki Vav',
    'Hill Forts of Rajasthan','Archaeological Survey of India'
  ]},
  { name:'Indian Archaeology & Epigraphy', wikiCat:'Archaeology_of_India', topics:[
    'Archaeology of India','Archaeological Survey of India','Indus Valley Civilisation','Mohenjo-daro',
    'Harappa','Dholavira','Lothal','Rakhigarhi','Kalibangan','Banawali','Kot Diji','Sanauli',
    'Arikamedu','Hastinapur','Kampilya','Taxila','Sanchi','Sarnath','Nalanda','Ajanta','Ellora',
    'Ashokan Edicts','Pillar of Ashoka','Askoka inscriptions','Brahmi script','Kharosthi',
    'Gupta inscriptions','Allahabad Pillar','Kalinga rock edicts','Iron Pillar of Delhi',
    'Copper plate inscriptions','Rashtrakuta inscriptions','Mahabalipuram inscriptions'
  ]},
  { name:'Indian Demographics & Census', wikiCat:'Demographics_of_India', topics:[
    'Demographics of India','Census of India','2011 Census of India','2001 Census of India',
    'Population of India','Demographic transition','Sex ratio in India','Literacy in India',
    'Indian diaspora','Languages of India by number of speakers','Religion in India','Hindu population',
    'Muslim population','Christian population','Sikh population','Jain population','Buddhist population',
    'Urbanization in India','Megacity','Mumbai','Delhi','Kolkata','Bangalore','Hyderabad',
    'List of states and union territories by population','Most populous states of India',
    'Age pyramid India','Elderly population in India','Migrant workers in India'
  ]},
  { name:'Indian Aviation & Shipping', wikiCat:'Aviation_in_India', topics:[
    'Aviation in India','Air India','IndiGo','Jet Airways','Vistara','SpiceJet','Go First','Akasa Air',
    'Airports Authority of India','Indira Gandhi International Airport','Rajiv Gandhi International Airport',
    'Jewar Airport','Kempegowda International Airport','Chennai International Airport','Netaji Subhas Chandra Bose International Airport',
    'Airports in India','Ministry of Civil Aviation','Civil aviation in India','J.R.D. Tata',
    'Bharat Airways','Deccan Aviation','Air India Flight 182','Air India Express','Coastal India',
    'Indian Ocean','Port of Mumbai','Port of Chennai','Visakhapatnam Port','Kandla Port','Mormugao Port',
    'Jawaharlal Nehru Port','Mundra Port','Kolkata Port','Shipping Corporation of India','Indian Navy'
  ]},
  // ───────── Group 11: Ag-specialist syllabus gaps ─────────
  { name:'Plant Breeding & Genetics', wikiCat:'Plant_breeding', topics:[
    'Plant breeding','Plant genetics','Genetics','Mendelian inheritance','Heredity','Gene','DNA','Chromosome',
    'Allele','Dominance (genetics)','Hybrid (biology)','Mutation','Polyploidy','Cross-pollination','Self-pollination',
    'Hybrid seed','F1 hybrid','Pure line','Selection (biology)','Cultivar','Landrace','Germplasm',
    'Genotype','Phenotype','Molecular genetics','Genetic engineering','Biotechnology','Transgenic plant',
    'B. T. crop','Marker assisted selection','Somaclonal variation','Tissue culture','Test cross','Backcrossing',
    'Haploid','Diploid','Tetraploid','Gene bank','Seed bank','National Bureau of Plant Genetic Resources'
  ]},
  { name:'Seed Science & Technology', wikiCat:'Seed', topics:[
    'Seed','Germination','Seed dormancy','Seed testing','Seed certification','Seed production',
    'Hybrid seed','Open pollination','Seed treatment','Seedling','Seedling vigor','Scarification (botany)',
    'Stratification (botany)','Viability','Seed bank','Sowing','Sowing depth','Seed drill','Dormancy',
    'After-ripening','Seed coat','Endosperm','Dicotyledon','Monocotyledon','Seed viability','Seed germination test',
    'Seed storage','Tonne','Germination rate','Hard seed','Seed pelleting','Fluid drilling'
  ]},
  { name:'Plant Pathology & Crop Protection', wikiCat:'Plant_diseases', topics:[
    'Plant pathology','Plant disease','Fungus','Bacteria','Virus','Nematode','Phytophthora','Fusarium',
    'Rust (fungus)','Smut (fungus)','Mildew','Blast disease','Sheath blight','Leaf spot','Root rot','Wilt disease',
    'Mosaic virus','Tobacco mosaic virus','Damping off','Downy mildew','Powdery mildew','Black rust','Puccinia',
    'Red rot','Fungicide','Pesticide','Neem oil','Sulphur','Copper fungicide','Bordeaux mixture','Integrated pest management',
    'Biocontrol','Trichoderma','Pseudomonas fluorescens','Phytoplasma','Quarantine','Plant pathology of India',
    'Pest','Pesticide resistance','Fumigation','Seed treatment','Systemic acquired resistance'
  ]},
  { name:'Agricultural Entomology', wikiCat:'Entomology', topics:[
    'Entomology','Insect','Life cycle (insect)','Metamorphosis','Larva','Pupa','Pheromone','Pollinator',
    'Bumblebee','Honey bee','Silkworm','Lac','Termite','Locust','Grasshopper','Aphid','Whitefly','Jassid',
    'Spider mite','Bollworm','Pink bollworm','Stem borer','Cutworm','Armyworm','Thrips','Ladybird','Parasitoid',
    'Predatory insect','Apiculture','Sericulture','Integrated pest management','Insecticide','Neem','Bacillus thuringiensis',
    'Biopesticide','Crop protection','Pest control','Sugarcane borer','Ragi','Mulberry','Honey'
  ]},
  { name:'Agricultural Extension & Marketing', wikiCat:'Agricultural_economics', keywords:[
    'agricultur','agri','farm','crop','food','market','krishi','kisan','extension','produce',
    'producer','price','subsid','insur','cooperat','commodit','farmer','rural','agronom','livestock',
    'horticultur','dairy','economics','policy','supply','distribut','credit','trade','sustain',
    'fertil','yield','cultivat','harvest','irrigat','manure','biotech','value'
  ], topics:[
    'Agricultural extension','Agricultural economics','Agronomy','Farm management','Agricultural marketing',
    'Agricultural price support','Minimum support price','Commodity Futures','Regulated market',
    'Agriculture in India','Agribusiness','Contract farming','Farmers cooperative','Public distribution system',
    'Agricultural insurance','Farm subsidy','Green Revolution','Organic farming','Food security','Agriculture policy of India',
    'Krishi Vigyan Kendra','ATMA','Agri start-up','Digital agriculture','e-NAM','Farmer producer organisation',
    'Cooperative farming','Joint farming','Kisan credit card','Soil health card','Animal husbandry economics'
  ]},
  { name:'Agronomy & Crop Production', wikiCat:'Agronomy', topics:[
    'Agronomy','Crop','Cultivation','Sowing','Irrigation','Fertilization','Crop rotation','Mixed cropping','Intercropping',
    'Cropping system','Monoculture','Organic farming','Green manure','Cover crop','Catch crop','Relay cropping',
    'Tillage','Zero tillage','Mulching','Soil fertility','Plant nutrition','Nitrogen fixation','Manure','Compost',
    'Biofertilizer','Urea','DAP','Potash','Zinc deficiency','Sulphur deficiency','Growth stage','Tillering','Harvesting',
    'Threshing','Winnowing','Grain','Yield (wine)','Soil moisture','Drought tolerance','Waterlogging','Sodic soil'
  ]},
  { name:'Horticulture - Fruit & Vegetable Production', wikiCat:'Pomology', topics:[
    'Pomology','Horticulture','Fruit tree','Orchard','Bonsai','Grafting','Budding','Marcotting','Layering',
    'Mango','Banana','Grape','Apple','Citrus','Papaya','Guava','Pomegranate','Pineapple','Litchi','Sapota',
    'Jackfruit','Cashew','Almond','Walnut','Pear','Plum','Peach','Strawberry','Watermelon','Musk melon',
    'Vegetable','Tomato','Potato','Onion','Okra','Brinjal','Chilli','Cabbage','Cauliflower','Carrot','Radish',
    'Spinach','Fenugreek','Cowpea','Pea','Beetroot','Bottle gourd','Bitter gourd','Ridge gourd','French bean'
  ]},
  { name:'Floriculture & Landscaping', wikiCat:'Floriculture', topics:[
    'Floriculture','Flower','Rose','Marigold','Jasmine','Hibiscus','Sunflower','Chrysanthemum','Gladiolus',
    'Tuberose','Gerbera','Orchid','Lotus','Lilium','Anthurium','Carnation','Aster','Jasmine','Bird of paradise',
    'Landscaping','Garden','Japanese garden','Mughal garden','Vertical garden','Topiary','Greenhouse','Shade net',
    'Cut flower','Dried flower','Floral design','Petal','Steam sterilization','Bedding plant','Bonsai',
    'Hanging basket','Terrace garden','Gardening tool'
  ]},
  { name:'Spices & Plantation Crops', wikiCat:'Spices', topics:[
    'Spice','Spices of India','Black pepper','Cardamom','Turmeric','Ginger','Cinnamon','Clove','Nutmeg','Mace',
    'Cumin','Coriander','Fennel','Fenugreek','Celery','Ajwain','Mustard seed','Saffron','Vanilla','Allspice',
    'Bay leaf','Chilli pepper','Tamarind','Curry leaf','Garcinia','Coconut','Areca nut','Tea','Coffee','Rubber',
    'Cocoa','Perennial crop','Agroforestry','Peppermint','Sandalwood','Eucalyptus','Sal tree','Spice garden'
  ]},
  { name:'Plant Physiology & Nutrition', wikiCat:'Plant_physiology', topics:[
    'Plant physiology','Photosynthesis','Respiration (plant)','Transpiration','Nutrient','Nitrogen','Phosphorus',
    'Potassium','Zinc','Iron','Calcium','Magnesium','Sulphur','Micronutrient','Chlorophyll','Xylem','Phloem',
    'Stomata','Leaf','Root','Stem','Photoperiodism','Vernalization','Gibberellin','Auxin','Cytokinin','Ethylene',
    'Abscisic acid','Transpiration stream','Mineral deficiency','Chlorosis','Necrosis','Plant hormone',
    'Growth regulator','Crop water requirement','Photosynthetic efficiency','C4 carbon fixation','CAM photosynthesis'
  ]},
  { name:'Farm Machinery & Power', wikiCat:'Agricultural_machinery', topics:[
    'Agricultural machinery','Tractor','Plough','Harrow','Cultivator','Seed drill','Transplanter','Sprayer','Duster',
    'Combine harvester','Thresher','Winnower','Planter','Mower','Reaper','Pump','Centrifugal pump',
    'Diesel engine','Petrol engine','Tractor drawn implement','Power tiller','Chaff cutter','Sickle','Hoe',
    'Paddy thresher','Groundnut decorticator','Maize sheller','Bailer','Loader','Conveyor','Silage','Harvester'
  ]},
  { name:'Hydrology & Soil Conservation', wikiCat:'Hydrology', topics:[
    'Hydrology','Water cycle','Groundwater','Aquifer','Watershed','Catchment area','Runoff','Infiltration (hydrology)',
    'Evapotranspiration','Rain gauge','Stream gauging','Flood','Drought','Irrigation in India','Water table',
    'Soil erosion','Sheet erosion','Gully erosion','Wind erosion','Contour ploughing','Terrace (agriculture)',
    'Bunding','Gully plug','Check dam','Earthen dam','Levee','Canwell','Chowalla','Remote sensing','Geographic information system',
    'Watershed management','Soil conservation','Swales','Furrow irrigation','Drip irrigation','Sprinkler irrigation'
  ]},
  // ───────── UPSC: Polity, Governance & Public Administration ─────────
  { name:'Indian Polity & Constitution', wikiCat:'Politics_of_India', topics:[
    'Politics of India','Constitution of India','Preamble to the Constitution of India','Fundamental Rights in India',
    'Directive Principles in India','Fundamental duties in India','President of India','Vice President of India',
    'Prime Minister of India','Union Council of Ministers','Parliament of India','Lok Sabha','Rajya Sabha',
    'Supreme Court of India','High courts of India','District courts of India','Attorney General of India',
    'Comptroller and Auditor General of India','Election Commission of India','Union Public Service Commission',
    'Finance Commission of India','NITI Aayog','Inter-State Council','Parliamentary committees of India',
    'Sarkaria Commission','National Commission for Scheduled Castes','National Commission for Scheduled Tribes',
    'National Commission for Women','Panchayati Raj','Municipal corporation (India)','73rd Amendment',
    '74th Amendment','Federalism in India','Separation of powers','Judicial review in India','Basic structure doctrine',
    'Ordinance (India)','Money bill','Financial bill','Amendment of the Constitution of India','State List, Union List, Concurrent List',
    'Governor (India)','State Legislative Assembly','Legislative Council (India)','Chief Minister (India)',
    'Elections in India','First-past-the-post voting','Anti-defection law','Office of profit','Question Hour','Zero Hour',
    'Leader of the Opposition','Whips in Indian politics','President\'s rule'
  ]},
  { name:'Elections & Political Parties', wikiCat:'Elections_in_India', keywords:[
    'elect','vot','poll','party','candid','constituen','ballot','commission','rajya','lok sabha','assembly','reserv','delimit','campaign','aid','symbol'
  ], topics:[
    'Elections in India','Election Commission of India','Voter ID (India)','Electronic voting in India','Voter-verified paper audit trail',
    'National parties in India','Political parties in India','Indian National Congress','Bharatiya Janata Party',
    'Communist Party of India (Marxist)','Aam Aadmi Party','Bahujan Samaj Party','Rashtriya Janata Dal',
    'Dravida Munnetra Kazhagam','All India Anna Dravida Munnetra Kazhagam','Shiv Sena','Nationalist Congress Party',
    'Telugu Desam Party','Janata Dal (United)','Lok Janshakti Party','Rashtriya Lok Dal','Left Front (India)',
    'National Democratic Alliance','United Progressive Alliance','Indian National Developmental Inclusive Alliance',
    'Election symbols in India','Model Code of Conduct','Free and fair election','Delimitation Commission of India',
    'Anti-defection law','Representation of the People Act, 1951','Representation of the People Act, 1950',
    'General elections in India','State Assembly elections in India','By-election','Mid-term election','Caretaker government',
    'Coalition government','Hung parliament','Motion of no confidence','Vote of confidence','Money bill','EVM'
  ]},
  { name:'Public Administration & Governance', wikiCat:'Public_administration', topics:[
    'Public administration','New Public Management','Good governance','E-governance','Digital India',
    'District collector','District magistrate','Tehsildar','Panchayat','Gram panchayat','Zilla Parishad',
    'Block Development Officer','Sub-Divisional Magistrate','Right to Information Act, 2005','Citizen\'s Charter',
    'E-governance in India','Aadhaar','Direct Benefit Transfer','Jan Dhan Yojana','MGNREGA','Midday Meal Scheme',
    'National Rural Livelihood Mission','Pradhan Mantri Awas Yojana','Swachh Bharat Mission','Beti Bachao Beti Padhao',
    'Public Service Broadcasting','Civil Services of India','Indian Administrative Service','Indian Police Service',
    'Indian Foreign Service','Lateral entry (India)','Mission Karmayogi','Right to Public Services legislation',
    'Social audit','Transparency (behavior)','Accountability','Administrative reform','Neo-liberalism'
  ]},
  // ───────── UPSC: Economy ─────────
  { name:'Indian Economy & Development', wikiCat:'Economic_history_of_India', keywords:[
    'econom','gdp','gross domestic','inflation','fiscal','monetary','budget','finance','tax','bank','rbi','reserve bank','rupee','market','trade','export','import','industry','manufactur','service sector','development','plan','niti','growth','reform','liberali','privatis','globalis','poverty','unemploy','human development'
  ], topics:[
    'Economy of India','Economic history of India','Indian economy','GDP','Nominal GDP','Purchasing power parity',
    'Gross value added','Economic growth in India','Inflation in India','Consumer price index','Wholesale price index',
    'Fiscal policy','Fiscal deficit','Revenue deficit','Primary deficit','Union budget of India','Direct tax','Indirect tax',
    'Goods and Services Tax (India)','GST Council','Income tax in India','Corporate tax','Service tax (India)','Customs duty',
    'Monetary policy of India','Reserve Bank of India','Repo rate','Reverse repo rate','Cash reserve ratio','Statutory liquidity ratio',
    'CRR','MSF','Liquidity adjustment facility','Money supply','Broad money','Narrow money','Inflation targeting in India',
    'Monetary Policy Committee','Five-Year Plans of India','Twelfth Five-Year Plan','NITI Aayog','Planning Commission',
    'New Industrial Policy','Make in India','Startup India','Standup India','Digital India','Foreign direct investment in India',
    'Foreign institutional investor','FII','Balance of payments','Current account','Capital account','Foreign exchange reserves',
    'Rupee','Rupee depreciation','Convertibility of the rupee','India–United States economic relations','Special Economic Zone',
    'SEZ','Infrastructure in India','Public–private partnership','Disinvestment','PSE policy','Navratna','Maharatna','Miniratna',
    'Poverty in India','Poverty line in India','Tendulkar Committee','Rangarajan Committee','Unemployment in India','MGNREGA',
    'Human Development Index','Multidimensional Poverty Index','Inequality in India','Gini coefficient','Kuznets curve'
  ]},
  { name:'Banking & Financial System', wikiCat:'Financial_services_companies_of_India', topics:[
    'Banking in India','Reserve Bank of India','Scheduled Banks in India','Public sector banks in India','Nationalized bank',
    'State Bank of India','Private sector banks in India','Cooperative banking in India','Regional Rural Bank',
    'Small Finance Bank','Payment bank','Banking Ombudsman','Demonetisation by the government of India','Banknote',
    'Currency in India','Indian rupee','Digital payment','Unified Payments Interface','UPI','National Payments Corporation of India',
    'BHIM (app)','Mobile payment','Cheque','Demand draft','Bank account','Savings account','Current account','Fixed deposit',
    'Recurring deposit','Certificate of deposit','NEFT','RTGS','IMPS','ATM','Debit card','Credit card','KYC',
    'Basel III','Bank for International Settlements','Non-performing loan','Bad bank','Insolvency and Bankruptcy Code',
    'Deposit Insurance and Credit Guarantee Corporation','Financial inclusion','Jan Dhan Yojana','Microfinance in India',
    'Self-Help Group (finance)','Money market in India','Call money','Treasury bills','Government securities','Bond market in India',
    'Stock market in India','National Stock Exchange of India','Bombay Stock Exchange','SEBI','Sensex','NIFTY 50',
    'Mutual fund','Systematic Investment Plan','Sovereign gold bond','Gold monetisation scheme'
  ]},
  // ───────── UPSC: Geography & Environment breadth ─────────
  { name:'World & Indian Physical Geography', wikiCat:'Landforms', topics:[
    'Physical geography','Geomorphology','Plate tectonics','Continental drift','Volcano','Earthquake','Tsunami',
    'Weathering','Erosion','Types of rocks','Igneous rock','Sedimentary rock','Metamorphic rock','Rock cycle',
    'Minerals','Fossil','Glacier','Glacial landforms','Desert','Desertification','Soil','Soil formation','Aridity',
    'Latitude','Longitude','Equator','Tropic of Cancer','Tropic of Capricorn','Latitudinal heat zones','Rainforest',
    'Savanna','Tundra','Taiga','Mediterranean climate','Monsoon','Jet stream','El Niño','La Niña','Indian Ocean Dipole',
    'Atmosphere of Earth','Troposphere','Stratosphere','Ozone layer','Global warming','Climate change','Greenhouse effect',
    'Carbon cycle','Nitrogen cycle','Water cycle','Ecosystem','Biome','Biodiversity','Ecology','Food chain','Trophic level',
    'Biogeochemical cycle','Aquifer','Hydrological cycle','River','Delta','Estuary','Wetland','Mangrove','Coral reef',
    'Ocean current','Tides','Ocean floor','Continent','Continentality'
  ]},
  { name:'Indian Physical Geography', wikiCat:'Rivers_of_India', topics:[
    'Geography of India','Physiographic divisions of India','Himalayas','Western Ghats','Eastern Ghats','Vindhya Range',
    'Satpura Range','Aravalli Range','Indo-Gangetic Plain','Deccan Plateau','Thar Desert','Coastline of India',
    'Rivers of India','Indus River','Ganges','Brahmaputra River','Yamuna','Godavari','Krishna River','Kaveri',
    'Narmada River','Tapti River','Mahanadi','Northern rivers of India','Peninsular rivers of India','Estuary of India',
    'Deltas of India','Climate of India','Monsoon of India','Southwest monsoon','Northeast monsoon','El Niño effect on India',
    'Heat wave','Cold wave','Drought in India','Floods in India','Cyclone in India','Soil types of India','Alluvial soil',
    'Black soil','Red soil','Laterite','Arid soil','Forest cover in India','Tropical rainforest','Sal forest','Mangroves of India',
    'Sundarbans','Wetlands of India','National parks of India','Wildlife sanctuaries of India','Biosphere reserves of India',
    'Desert in India','Rann of Kutch','Lakshadweep','Andaman and Nicobar Islands','Plateau of India','Mountain ranges of India'
  ]},
  // ───────── UPSC: History / Art & Culture deeper roots ─────────
  { name:'Indian Art & Architecture', wikiCat:'History_of_Indian_art', keywords:[
    'art','architectur','temple','sculpt','paint','mural','rock','cave','stupa','buddh','hindu','jain','mosque','fort','palace','style','school','dance','music','craft'
  ], topics:[
    'Indian art','Indian architecture','History of Indian architecture','Temple architecture in India','Nagara style',
    'Dravidian architecture','Vesara style','Hoysala architecture','Vijayanagara architecture','Rock-cut architecture in India',
    'Ajanta Caves','Ellora Caves','Elephanta Caves','Badami cave temples','Mahabalipuram','Khajuraho','Konark Sun Temple',
    'Brihadeeswarar Temple','Meenakshi Temple','Sun Temple, Modhera','Jain architecture','Sikh architecture','Indo-Islamic architecture',
    'Mughal architecture','Taj Mahal','Red Fort','Qutb Minar','Charminar','Gol Gumbaz','Fatehpur Sikri','Fatehpur Sikri, India',
    'Madrasa (India)','Garden of Mughal Empire','Colonial architecture in India','Victoria Memorial','Rashtrapati Bhavan',
    'Indian painting','Mughal painting','Rajput painting','Pahari painting','Company style','Bengal School of Art',
    'Madhubani art','Warli painting','Phad painting','Tanja art','Miniature painting','Fresco painting','Mural (India)',
    'Indian sculpture','Bronze sculpture','Chola bronze','Nataraja','Indian folk art','Pattachitra','Kalamkari',
    'Sanjhi art','Thanjavur painting'
  ]},
  { name:'Indian Music Dance & Theatre', wikiCat:'Performing_arts_in_India', keywords:[
    'music','dance','theatre','raga','raag','tala','taal','instrument','classical','carnatic','hindustani','kathak','bharatanatyam','kuchipudi','odissi','kathakali','mohiniyattam','folk','natyam','natya'
  ], topics:[
    'Music of India','Indian classical music','Carnatic music','Hindustani classical music','Raga','Tala (music)',
    'Mela (music)','Thaat','Khayal','Dhrupad','Thumri','Tappa','Ghazal','Qawwali','Bollywood music','Bhajan','Kirtan',
    'Musical instruments of India','Sitar','Tabla','Veena','Mridangam','Sarod','Shehnai','Bansuri','Sarangi','Harmonium',
    'Dance in India','Indian classical dance','Bharatanatyam','Kathak','Kuchipudi','Odissi','Kathakali','Mohiniyattam','Manipuri dance',
    'Sattriya','Chhau dance','Folk dances of India','Bhangra','Garba','Ghoomar','Lavani','Giddha','Tamang Selo',
    'Theatre in India','Indian theatre','Natya Shastra','Sanskrit theatre','Kathakali theatre','Nautanki','Tamasha',
    'Bhavai','Yakshagana','Ram Leela','Indian cinema','Bollywood','Cinema of South India','Malayalam cinema','Kollywood','Tollywood'
  ]},
  { name:'Indian Festivals & Traditions', wikiCat:'Hindu_festivals', keywords:[
    'festiv','puja','prayer','ritual','vrat','fast','pilgrimage','yatra','mela','fair','tradition','custom','ceremony','worship','deity','temple','puran','sankrant','pooja'
  ], topics:[
    'List of Hindu festivals','Diwali','Holi','Navaratri','Durga Puja','Dussehra','Ganesh Chaturthi','Raksha Bandhan',
    'Makar Sankranti','Pongal','Lohri','Baisakhi','Onam','Vishu','Thrissur Pooram','Puthandu','Ugadi','Gudi Padwa',
    'Mahashivratri','Rama Navami','Krishna Janmashtami','Karva Chauth','Bhai Dooj','Eid al-Fitr','Eid al-Adha',
    'Muharram','Milad','Christmas in India','Buddha\'s Birthday','Mahavir Jayanti','Guru Nanak Gurpurab','Gurpurab',
    'Parsi New Year','Jains festival','Kumbh Mela','Pushkar Fair','Hemis Festival','Losar','Onam harvest festival',
    'Ambubachi Mela','Kalaripayattu festival'
  ]},
  // ───────── UPSC: Science, Technology & Defence breadth ─────────
  { name:'Indian Scientists & Nobel Laureates', wikiCat:'Indian_scientists', topics:[
    'List of Indian scientists','C. V. Raman','Homi J. Bhabha','Vikram Sarabhai','A. P. J. Abdul Kalam','Satyendra Nath Bose',
    'Jagadish Chandra Bose','Prafulla Chandra Ray','Salim Ali','Birbal Sahni','Har Gobind Khorana','Subrahmanyan Chandrasekhar',
    'Venkatraman Ramakrishnan','Abhijit Banerjee','G. N. Ramachandran','Yellapragada Subbarow','K. S. Krishnan',
    'Ashoke Sen','Roddam Narasimha','C. N. R. Rao','S. Chandrasekhar','Ramanujan','Niels Bohr connection',
    'List of Nobel laureates from India','Rabindranath Tagore','Mother Teresa','Kailash Satyarthi','Amartya Sen',
    'C. V. Raman','Har Gobind Khorana','Subrahmanyan Chandrasekhar','Venkatraman Ramakrishnan','Indian Nobel laureates'
  ]},
  { name:'Defence & Strategic Affairs', wikiCat:'Indian_Armed_Forces', keywords:[
    'defence','defense','army','navy','air force','military','missile','weapon','war','battle','soldier','regiment','corps','command','strateg','border','operation','exercise','indian armed'
  ], topics:[
    'Indian Armed Forces','Indian Army','Indian Navy','Indian Air Force','Indian Coast Guard','Paramilitary forces of India',
    'Border Security Force','Central Reserve Police Force','Central Armed Police Forces','National Security Guard',
    'Rashtriya Rifles','Territorial Army (India)','Chief of Defence Staff (India)','Chief of the Army Staff (India)',
    'Chief of the Naval Staff (India)','Chief of the Air Staff (India)','Integrated Defence Staff','Defence Research and Development Organisation',
    'Missiles of India','Agni missile','Prithvi (missile)','BrahMos','Akash (missile)','Nag (missile)','Nirbhay',
    'Arjun (tank)','INS Vikrant','INS Viraat','Aircraft carrier India','Submarine fleet of India','INS Arihant',
    'Nuclear doctrine of India','No first use','Strategic Forces Command','Indian space programme','Defence budget of India',
    'Raksha Mantri','National Security Advisor (India)','Indian military academies','National Defence Academy',
    'Indian Military Academy','Kargil War','1962 war India China','Indo-Pakistani wars','Operation Vijay (1961)',
    'Balakot airstrike','Surgical Strike','Exercise (military)','Kunor (India)','INS Vikramaditya'
  ]},
  { name:'Nuclear Energy & Technology', wikiCat:'Nuclear_energy_in_India', topics:[
    'Nuclear power in India','Nuclear energy','Nuclear reactor','Pressurized heavy water reactor','Fast breeder reactor',
    'Bhabha Atomic Research Centre','Indira Gandhi Centre for Atomic Research','Atomic Energy Commission of India',
    'Department of Atomic Energy','NPCIL','Nuclear fuel cycle','Uranium','Thorium','Plutonium','MOX fuel',
    'Three-stage nuclear power programme','Kalpakkam','Kudankulam Nuclear Power Plant','Tarapur Atomic Power Station',
    'Prototype Fast Breeder Reactor','Advanced Heavy Water Reactor','India and weapons of mass destruction',
    'Smiling Buddha','Pokhran-II','Operation Shakti','Nuclear Suppliers Group','India–United States Civil Nuclear Agreement',
    'Nuclear Safety','IAEA','Comprehensive Nuclear-Test-Ban Treaty','Criticality (status)','Nuclear waste'
  ]},
  { name:'Space & Astronomy', wikiCat:'Indian_space_programme', keywords:[
    'space','satellite','rocket','launch','isro','chandrayaan','mangalyaan','orbit','astronom','cosmos','gaganyaan','navic','pslv','gslv','lvm','mission','probe','astro'
  ], topics:[
    'Indian Space Research Organisation','Space programme of India','Chandrayaan-1','Chandrayaan-2','Chandrayaan-3',
    'Mangalyaan','Mars Orbiter Mission','Gaganyaan','Aditya-L1','XPoSat','Shukrayaan','AstroSat','PSLV','GSLV','LVM3',
    'Reusable Launch Vehicle','RLV-TD','Scramjet','NavIC','GAGAN','INSAT','GSAT','Remote sensing satellite','Cartosat',
    'Resourcesat','RISAT','Bhuvan','India\'s moon mission','National Space Policy','IN-SPACe','NRSC','Vikram Sarabhai Space Centre',
    'SDSC SHAR','Satish Dhawan Space Centre','ISRO Telemetry','K. Sivan','S. Somanath','Indian astronomy','Astronomy in India',
    'Aryabhata (satellite)','Jantar Mantar','Twilight Anomaly'
  ]},
  { name:'ICT Digital & Cyber', wikiCat:'Technology_companies_of_India', keywords:[
    'software','digital','computer','internet','cyber','data','network','technology','it','tech','ai','artificial','machine','cloud','semiconductor','chip','5g','telecom','platform'
  ], topics:[
    'Information technology in India','Software industry in India','IT services in India','Bangalore','Bengaluru IT hub',
    'Indian IT sector','Software exports from India','Business process outsourcing in India','Indian tech companies',
    'TCS','Infosys','Wipro','HCL Technologies','Tech Mahindra','Cognizant','Digital India','India Stack','Aadhaar',
    'UPI','NPCI','Artificial intelligence in India','Machine learning','Data protection in India','Digital Personal Data Protection Act, 2023',
    'Cybersecurity in India','Computer Emergency Response Team (India)','Indian Computer Emergency Response Team','CERT-In',
    'Semiconductor industry in India','India Semiconductor Mission','Semiconductor fab in India','5G in India','6G',
    'Telecom Regulatory Authority of India','Jio','BharatNet','National Optical Fibre Network','Cloud computing in India',
    'Quantum computing in India','National Quantum Mission','Supercomputer in India','Param (supercomputer)','AI Mission',
    'Robotics in India','Drones in India','Geospatial data'
  ]},
  // ───────── UPSC: Important Commissions, Reports & Bodies (dynamic) ─────────
  { name:'Commissions Committees & Bodies', wikiCat:'Commissions_in_India', keywords:[
    'commission','committee','committee report','board','council','authority','tribunal','panel','task force','group','committee headed','headed by'
  ], topics:[
    'Union Public Service Commission','Finance Commission of India','Election Commission of India','NITI Aayog',
    'National Human Rights Commission of India','National Commission for Women','National Commission for Minorities',
    'Law Commission of India','Pay Commission (India)','7th Central Pay Commission','Fourteenth Finance Commission',
    'Tenth Finance Commission','Sarkaria Commission','Mandal Commission','Kothari Commission','Radhakrishnan Commission',
    'Kesavan Committee','Justice Verma Committee','Narasimham Committee','RBI committee','Kelkar Committee',
    'Bimal Jalan Committee','Sinha committee','Rangarajan Committee','Tendulkar Committee','Administrative Reforms Commission',
    'National Commission for Scheduled Castes','National Commission for Scheduled Tribes','Competition Commission of India',
    'Securities and Exchange Board of India','Central Vigilance Commission','Central Information Commission',
    'Election Commission','Comptroller and Auditor General of India','National Green Tribunal','Green tribunals in India',
    'Lokpal','Lokayukta','IRDAI','Insurance Regulatory and Development Authority','Telecom Regulatory Authority of India',
    'National Disaster Management Authority','Parliamentary Standing Committee'
  ]},
  // ───────── Regional Language Literatures (UPSC optional / literarture-rich) ─────────
  { name:'Malayalam Literature', wikiCat:'Malayalam_literature', topics:[
    'Malayalam literature','Malayalam poetry','Malayalam novels','History of Malayalam literature','Malayalam Renaissance',
    'Thunchaththu Ezhuthachan','Adhyatma Ramayanam','Kilippattu','Attakkatha','Kathakali literature','Ashtapadi (Malayalam)',
    'Kunchan Nambiar','Ottamthullal','Poonthanam','Narayana Guru','Kumaran Asan','Vallathol Narayana Menon','Ulloor S. Parameswara Iyer',
    'K. P. Kesava Menon','V. T. Bhattathiripad','Thakazhi Sivasankara Pillai','Vaikom Muhammad Basheer','S. K. Pottekkatt',
    'O. V. Vijayan','M. T. Vasudevan Nair','Kamala Surayya','Sugathakumari','O. N. V. Kurup','Ayyappa Paniker',
    'K. Ayyappa Panicker','N. V. Krishna Warrier','G. Sankara Kurup','Changampuzha Krishnapillai','Edasseri Govindan Nair',
    'Vyloppilli Sreedhara Menon','P. Kunhiraman Nair','K. S. Narasimha Swami','Sasthamangalam','Perumbadavam Sreedharan',
    'Kakkanadan','V. K. N.','V. K. N. Krishnan Nair','Pavana Balan','Kavalam Narayana Panicker','C. Radhakrishnan',
    'M. Leelavathy','Sukumar Azhikode','K. M. George','A. R. Rajaraja Varma','V. C. Balakrishna Panicker','M. P. Appan',
    'K. Satchidanandan','D. Vinayachandran','Attoor Ravi Varma','Balachandran Chullikkadu','V. Madhusoodanan Nair',
    'Prabha Varma','S. Ramesan Nair','Vishnunarayanan','K. Jayakumar','R. Ramachandran','Kadavanad Kuttikrishnan',
    'Narangath Bhrathikkabi','Thunchath Ezhuthachan Malayalam University','Kerala Sahitya Akademi','Malayalam Renaissance writers',
    'Malayalam film literature','Jnanpith Award Malayalam','Sahitya Akademi Malayalam'
  ]},
  { name:'Tamil Literature', wikiCat:'Tamil_literature', topics:[
    'Tamil literature','Sangam literature','Thirukkural','Tamil poetry','Tamil epics','Silappatikaram','Manimekalai',
    'Pathuppaattu','Ettuthokai','Tolkappiyam','Naladiyar','Periya Puranam','Kamba Ramayanam','Tamil Bhakti literature',
    'Nayanars','Alvars','Tevaram','Tiruvasagam','Tirumurai','Naalayira Divya Prabandham','Tamil Jain literature',
    'Sangam landscape','Tamil grammar','Eelam literature','Subramania Bharati','Bharathidasan','Tamil renaissance',
    'Tamil modernist poetry','Tamil short story','Novels in Tamil','Tamil cinema literature','Tamil literary criticism'
  ]},
  { name:'Sanskrit & Classical Languages', wikiCat:'Sanskrit_literature', topics:[
    'Sanskrit literature','Vedic Sanskrit','Classical Sanskrit','Vedas','Rigveda','Yajurveda','Samaveda','Atharvaveda',
    'Brahmana','Aranyaka','Upanishads','Vedanga','Puranas','Itihasa','Ramayana','Mahabharata','Bhagavad Gita',
    'Kalidasa','Raghuvamsa','Kumarasambhava','Meghaduta','Abhijnanashakuntalam','Vishakhadatta','Mudrarakshasa',
    'Bharavi','Kiratarjuniya','Magha','Shishupala Vadha','Bhattikavya','Panini','Ashtadhyayi','Patanjali','Yogasutra',
    'Kautilya','Arthashastra','Manusmriti','Natyashastra','Kamasutra','Sanskrit grammar','Sanskrit drama','Sanskrit poetry',
    'Sanskrit metre','Sanskrit philosophy','Adi Shankara','Ramanuja','Madhvacharya','Amarakosha','Mukesh'
  ]},
  { name:'Kannada Literature', wikiCat:'Kannada_literature', topics:[
    'Kannada literature','Old Kannada','Kavirajamarga','Pampa','Pampa Bharata','Ranna','Ranna Saahasabhiman','Nagavarma I',
    'Janna','Haridasa literature','Purandara Dasa','Kanaka Dasa','Dasa Sahitya','Vachana literature','Basava',
    'Allama Prabhu','Akka Mahadevi','Kuvempu','D. R. Bendre','Masti Venkatesha Iyengar','K. Shivaram Karanth',
    'Shivaram Karanth','Girish Karnad','U. R. Ananthamurthy','P. Lankesh','K. P. Poornachandra Tejaswi','Niranjana',
    'T. P. Kailasam','M. G. Ramachandra','Kannada poetry','Kannada novels','Bandaya movement','Navya movement',
    'Kannada cinema literature','Jnanpith Award Kannada'
  ]},
  { name:'Telugu Literature', wikiCat:'Telugu_literature', topics:[
    'Telugu literature','Telugu language','Nannaya','Tikkana','Errana','Mahabharata Telugu','Padmakavi','Srinatha',
    'Sarangapani','Vemana','Tyagaraja','Kancherla Gopanna','Annamacharya','Ksherayya','Telugu poetry','Prabandha',
    'Chandassu','Telugu grammar','Telugu novel','Kandukuri Veeresalingam','Chilakamarti Lakshmi Narasimham',
    'Viswanatha Satyanarayana','Jnanpith Award Telugu','S. V. Joga Rao','Palnati Yuddham','Telugu cinema literature',
    'Telugu Renaissance','Adikavi Nannaya University'
  ]},
  { name:'Bengali Literature', wikiCat:'Bengali_literature', topics:[
    'Bengali literature','Bengali poetry','Bengali novels','Charyapada','Mangalkavya','Vaishnava padavali','Bankim Chandra Chatterjee',
    'Anandamath','Michael Madhusudan Dutt','Rabindranath Tagore','Gitanjali','Kazi Nazrul Islam','Sarat Chandra Chattopadhyay',
    'Jibanananda Das','Sunil Gangopadhyay','Mahasweta Devi','Tarashankar Bandyopadhyay','Bibhutibhushan Bandopadhyay',
    'Pather Panchali','Bimal Kar','Motijheel','Bengali Renaissance','Calcutta Group','Hungryalist movement',
    'Bengali literary criticism','Tagore literary works','Bengali drama','Bengali film literature','Satyajit Ray'
  ]},
  { name:'Marathi & Hindi Literature', wikiCat:'Marathi_literature', keywords:[
    'marathi','hindi','literature','poet','novel','playwright','drama','kavi','sant','abhanga','bhakti','sahitya'
  ], topics:[
    'Marathi literature','Sant Dnyaneshwar','Dnyaneshwari','Sant Tukaram','Abhanga','Namdev','Eknath','Marathi poetry',
    'V. S. Khandekar','P. L. Deshpande','Vijay Tendulkar','Vyankatesh Madgulkar','Arun Kolatkar','Dilip Chitre',
    'Bhalchandra Nemade','S. H. Deshpande','Marathi novels','Marathi theatre','Marathi cinema literature',
    'Hindi literature','Hindi poetry','Bhakti movement Hindi','Kabir','Tulsidas','Ramcharitmanas','Surdas','Sur Sagar',
    'Rahim','Raskhan','Meera','Nirala','Suryakant Tripathi','Mahadevi Verma','Maithili Sharan Gupt','Jaishankar Prasad',
    'Munshi Premchand','Godan','Mahatma Gandhi literature','Harivansh Rai Bachchan','Madhup','Modern Hindi poetry',
    'Nayi Kavita','Hindi novels','Hindi literary criticism'
  ]},
  { name:'Punjabi & Other Regional Literature', wikiCat:'Punjabi_literature', keywords:[
    'punjabi','gujarati','oriya','odia','assamese','bengal','tamil','telugu','kannada','malayalam','literature','poet','novel'
  ], topics:[
    'Punjabi literature','Baba Farid','Guru Nanak','Gurbani','Shah Hussain','Waris Shah','Heer Ranjha','Bulleh Shah',
    'Ranjit Singh literature','Amrita Pritam','Gurdial Singh','Punjabi poetry','Punjabi novels','Punjabi Sufi literature',
    'Gujarati literature','Narsinh Mehta','Premanand','Dayaram','Narmad','Govardhanram Tripathi','K. M. Munshi',
    'Jhaverchand Meghani','Umaswati','Gujarati poetry','Gujarati novels','Odia literature','Fakir Mohan Senapati',
    'Radhanath Ray','Gopabandhu Das','Odia poetry','Sitakant Mahapatra','Assamese literature','Srimanta Shankaradeva',
    'Assamese poetry','Lakshminath Bezbarua','Jyoti Prasad Agarwala','Bhupen Hazarika','Assamese novels'
  ]},
  // ───────── UPSC: International Organizations, Summits & World Bodies ─────────
  { name:'International Organizations & Summits', wikiCat:'International_organizations', keywords:[
    'organization','organisation','united nations','un ','who','imf','world bank','wto','g20','brics','saarc','nato','unicef','unesco','ilo','fao','union','summit','convention','treaty','protocol','agency'
  ], topics:[
    'United Nations','United Nations General Assembly','United Nations Security Council','International Court of Justice',
    'World Health Organization','UNICEF','UNESCO','United Nations Development Programme','United Nations Environment Programme',
    'International Labour Organization','Food and Agriculture Organization','World Food Programme','UN Women',
    'United Nations High Commissioner for Refugees','United Nations Human Rights Council','United Nations Charter',
    'International Monetary Fund','World Bank Group','International Bank for Reconstruction and Development',
    'International Finance Corporation','Asian Development Bank','World Trade Organization','GAATT','Doha Development Round',
    'Bretton Woods Conference','WTO Ministerial Conference','G20','G7','BRICS','Shanghai Cooperation Organisation',
    'SAARC','ASEAN','Association of Southeast Asian Nations','European Union','African Union','NATO','United Nations Peacekeeping',
    'UN Peacekeeping missions','Kyoto Protocol','Paris Agreement','Montreal Protocol','Vienna Convention on the Law of Treaties',
    'Comprehensive Nuclear-Test-Ban Treaty','Non-Proliferation Treaty','Nuclear Suppliers Group','Intergovernmental Panel on Climate Change',
    'International Atomic Energy Agency','World Meteorological Organization','Intellectual Property Organization',
    'International Maritime Organization','International Civil Aviation Organization','Universal Postal Union','OPEC'
  ]},
  { name:'India & International Relations', wikiCat:'Bilateral_relations_of_India', keywords:[
    'india','bilateral','diplomatic','relation','treaty','agreement','pact','summit','visit','foreign','neighbor','strategic','defence cooperation','trade agreement'
  ], topics:[
    'Foreign relations of India','Ministry of External Affairs of India','Indian foreign policy','Non-Aligned Movement','Look East policy','Act East policy',
    'Neighbourhood First policy','India and the United Nations','India–China relations','India–Pakistan relations','India–Nepal relations',
    'India–Bangladesh relations','India–Sri Lanka relations','India–Maldives relations','India–Bhutan relations',
    'India–Myanmar relations','India–Afghanistan relations','India–United States relations','India–Russia relations',
    'India–United Kingdom relations','India–France relations','India–Germany relations','India–Japan relations',
    'India–Israel relations','India–United Arab Emirates relations','India–Saudi Arabia relations','India–Iran relations',
    'Panchsheel','Simla Agreement','Lahore Declaration','Agartala Accord','25 year defence pact','India–Russia defence',
    'Quadrilateral Security Dialogue','Quad','Chabahar Port','International North–South Transport Corridor','India–Middle East–Europe Economic Corridor',
    'Make in India diplomacy','Digital trade','Remittances to India','Indian diaspora','Overseas Citizenship of India','Vande Bharat Mission'
  ]},
  { name:'World Geography & Countries', wikiCat:'Countries', keywords:[
    'country','capital','region','continent','island','mountain','river','ocean','sea','strait','desert','climate','population','flag','currency','borders','landlocked'
  ], topics:[
    'List of sovereign states','List of countries and dependencies by area','List of countries by population','Capital city',
    'List of national capitals','Continent','Africa','Asia','Europe','North America','South America','Oceania','Antarctica',
    'List of mountains','Mount Everest','List of rivers by length','Amazon River','Nile','Mississippi','Danube','Yangtze',
    'List of oceans','Pacific Ocean','Atlantic Ocean','Indian Ocean','Arctic Ocean','Southern Ocean','List of straits','Strait of Gibraltar',
    'Bering Strait','Strait of Hormuz','Malacca Strait','Suez Canal','Panama Canal','List of deserts','Sahara','Gobi','Atacama',
    'List of islands by area','Greenland','List of time zones','International Date Line','Prime Meridian','Map projections',
    'List of currencies','Currency','List of flags','List of countries by GDP','List of countries by Human Development Index',
    'List of monarchies','List of republics','Landlocked country','Enclave and exclave','Geography of the United States'
  ]},
  // ───────── UPSC: Religions, Mythology & Festivals ─────────
  { name:'Indian Religions', wikiCat:'Indian_religions', keywords:[
    'religion','hindu','hinduism','buddh','buddhism','jain','jainism','sikh','sikhism','temple','shrine','pilgrim','monastery','stupa','deity','sect','cult','veda','upanishad','bhakti','sufi','saint','reform','missionary'
  ], topics:[
    'Hinduism','Buddhism','Jainism','Sikhism','Hindu mythology','List of Hindu deities','Vedas','Upanishads','Puranas','Ramayana','Mahabharata','Bhagavad Gita','Dharma','Karma','Moksha','Advaita Vedanta','Bhakti movement',
    'Gautama Buddha','Four Noble Truths','Eightfold Path','Buddhist councils','Ashoka the Great','Dhamma','Mahayana','Theravada','Vajrayana','Nalanda','Taxila',
    'Mahavira','Tirthankara','Ganadhara','Anekantavada','Ahimsa','Jain councils','Acharya','Sravanabelagola','Palitana',
    'Guru Nanak','Guru Granth Sahib','Gurdwara','Khalsa','Gurudwara Amritsar','Golden Temple','Panth','Guru Gobind Singh',
    'Pilgrimage in India','Char Dham','Kumbh Mela','Rameswaram','Varanasi','Haridwar','Tirupati','Sabarimala','Ajmer Sharif','Kashi Vishwanath'
  ]},
  { name:'Hinduism & Mythology', wikiCat:'Hinduism', keywords:[
    'hindu','veda','upanishad','purana','deity','avatar','epic','ramayana','mahabharata','bhagavad','dharma','karma','moksha','temple','yajna','mantra','gayatri','shiva','vishnu','parvati'
  ], topics:[
    'Hinduism','Hindu mythology','List of Hindu deities','Brahma','Vishnu','Shiva','Lakshmi','Saraswati','Parvati','Ganesha','Murugan','Krishna','Rama','Durga','Kali',
    'Vedas','Rigveda','Samaveda','Yajurveda','Atharvaveda','Upanishads','Brihadaranyaka Upanishad','Chandogya Upanishad','Puranas','Bhagavata Purana','Matsya Purana',
    'Ramayana','Mahabharata','Bhagavad Gita','Yoga Sutras','Mimamsa','Vedanta','Samkhya','Nyaya','Vaisheshika','Ayurveda',
    'Dharma','Karma','Samsara','Moksha','Brahman','Atman','Maya','Guru','Sannyasa','Yajna','Homa','Puja','Aarti','Prasada',
    'Dashavatara','Rig Veda deities','Surya','Indra','Agni','Vayu','Varuna','Yama','Kamadeva'
  ]},
  { name:'Buddhism & Jainism', wikiCat:'Buddhism', keywords:[
    'buddh','buddha','dhamma','sangha','bodhisattva','nirvana','stupa','vihara','monastery','jain','tirthankara','ahisma','monk','nun','meditation','sutta','vinaya',
    'four noble truths','eightfold','zen','mahayana','theravada','mahavira','parshvanatha','siddha','kevala','solitary'
  ], topics:[
    'Gautama Buddha','Buddhism','Four Noble Truths','Noble Eightfold Path','Sangha','Dharma','Nirvana','Bodhisattva','Buddhist councils','First Buddhist council','Second Buddhist council','Third Buddhist council','Fourth Buddhist council',
    'Mahayana','Theravada','Vajrayana','Zen','Tibetan Buddhism','Dalai Lama','Ashoka','Emperor Ashoka','Tripitaka','Pali Canon','Vipassana',
    'Mahabodhi Temple','Bodh Gaya','Sarnath','Kushinagar','Lumbini','Sanchi Stupa','Ajanta Caves','Ellora Caves',
    'Mahavira','Jainism','Tirthankara','First Tirthankara','Parshvanatha','Anekantavada','Ahimsa','Aparigraha','Kevala Jnana','Sallekhana',
    'Digambara','Svetambara','Jain Agamas','Jain councils','Sravanabelagola','Mount Abu','Shikharji','Jain symbol','Navkar Mantra'
  ]},
  { name:'Sikhism & Other Faiths', wikiCat:'Sikhism', keywords:[
    'sikh','guru','gurdwara','khalsa','granth','gurbani','amrit','panth','christian','islam','zoroastr','parsi','judais','bahai','faith','prayer','liturgy','worship'
  ], topics:[
    'Sikhism','Guru Nanak','Guru Angad','Guru Amar Das','Guru Ram Das','Guru Arjan','Guru Hargobind','Guru Har Rai','Guru Har Krishan','Guru Tegh Bahadur','Guru Gobind Singh',
    'Guru Granth Sahib','Gurbani','Gurdwara','Golden Temple','Amritsar','Khalsa','Panj Pyare','Amrit Sanskar','Five Ks','Langar','Akhand Path','Nishan Sahib',
    'Christianity in India','St Thomas Christians','Goa','Archbishop','Roman Catholic Church in India',
    'Islam in India','Sufism in India','Chishti Order','Dargah','Madrasa','Waqf',
    'Zoroastrianism','Parsis','Fire temple','Avesta','Gatha','Navjote','Zarathustra','Bahai Faith','Judaism in India','Bene Israel','Cochin Jews'
  ]},
  { name:'Classical & Dravidian Languages', wikiCat:'Classical_languages_of_India', keywords:[
    'classical','sanskrit','tamil','telugu','kannada','malayalam','oda','prakrit','grammar','literature','kavya','natyasastra','tolkappiyam'
  ], topics:[
    'Classical languages of India','Sanskrit','Tamil','Telugu','Kannada','Malayalam','Odia','Prakrit','Pali','Apabhramsha','Vedic Sanskrit',
    'Tolkappiyam','Sangam literature','Thirukkural','Eight Anthologies','Pathuppattu','Sangam poems','Bharathi','Ilango Adigal',
    'Kannada classics','Vachana literature','Basaavanna','Malayalam classics','Thunchath Ezhuthachan','Adhyatma Ramayana','Odiyan',
    'Natyasastra','Kavya','Alankara','Rasa','Arsha','Sanskrit drama','Kalidasa','Abhijnanasakuntalam','Panchatantra','Hitopadesha'
  ]},
  { name:'Indian Languages - National & Regional', wikiCat:'Scheduled_languages_of_India', keywords:[
    'language','official language','mother tongue','bhasha','script','devanagari','linguistic','dialect','tribal language'
  ], topics:[
    'Scheduled languages of India','Eighth Schedule of the Constitution','Official Languages Act','Hindi belt','Devanagari script',
    'Tamil','Telugu','Kannada','Malayalam','Marathi','Gujarati','Bengali','Punjabi','Odia','Assamese','Urdu','Kashmiri','Konkani','Sindhi','Nepali',
    'Sanskrit revival','Prakrit languages','Regional languages of India','Linguistic diversity of India',
    'Sixth Schedule languages','Tribal languages of India','Adivasi language','Gondi','Khasi','Mizo','Garo','Angami','Bodo language'
  ]},
  // ───────── UPSC: Health, Human Body & Lifestyle ─────────
  { name:'Health & Human Body', wikiCat:'Human_anatomy', keywords:[
    'anatomy','human body','organ','bone','muscle','heart','lung','liver','kidney','brain','blood','nerve','skeleton','cell','tissue','system','gland','hormone','enzyme','disease','deficiency','vitamin'
  ], topics:[
    'Human body','Anatomy','List of bones of the human skeleton','Skeleton','Muscular system','Human skeleton','Heart','Lungs','Liver','Kidney','Brain','Nervous system','Blood','Circulatory system','Respiratory system','Digestive system','Endocrine system','Reproductive system',
    'Vitamin','Vitamin A','Vitamin B complex','Vitamin C','Vitamin D','Vitamin E','Vitamin K','Mineral deficiency','Anaemia','Iodine deficiency','Goitre',
    'Blood groups','Haemoglobin','White blood cell','Red blood cell','Plasma','Platelet','Blood donation','Disease','Infectious disease','Vaccine','Immunization','Antibiotic',
    'National Nutrition Mission','Poshan Abhiyaan','Balanced diet','Malnutrition','Protein-energy malnutrition','Bengal Famine','ICDS','Midday Meal Scheme'
  ]},
  { name:'Health & Nutrition', wikiCat:'Human_nutrition', keywords:[
    'nutrition','diet','food','protein','carbohydrate','fat','vitamin','mineral','calorie','malnutrition','obesity','food security','micronutrient','dietary','nutrient'
  ], topics:[
    'Nutrition','Human nutrition','Diet','Balanced diet','Carbohydrate','Protein','Fat','Saturated fat','Omega-3','Vitamins','Minerals','Calcium','Iron','Zinc','Folic acid',
    'Calorie','Metabolism','Malnutrition','Undernutrition','Overnutrition','Food security','Hunger in India','Zero Hunger','Midday Meal Scheme','ICDS','Anganwadi',
    'Breastfeeding','Micronutrient deficiency','Salt iodisation','Fortified foods','Organic food','Dietary Guidelines for Indians','Nutritional labelling',
    'National Institute of Nutrition','Deficiency diseases','Kwashiorkor','Marasmus','Rickets','Scurvy','Beriberi','Pellagra'
  ]},
  { name:'Sports & Physical Education', wikiCat:'Physical_exercise', keywords:[
    'exercise','physical education','fitness','sport','yoga','asana','pranayama','strength','endurance','training','athlete','marathon','olympic','fitness'
  ], topics:[
    'Khelo India','Fit India Movement','Khelo India Youth Games','National Sports Day','Major Dhyan Chand','Rajiv Gandhi Khel Ratna',
    'Physical education','Aerobic exercise','Anaerobic exercise','Strength training','Endurance training','Flexibility','Warm-up','Cool-down','Stretching',
    'Yoga and fitness','Marathon','Athletics','Field and track','Indian Olympic Association','Arjuna Award','Dronacharya'
  ]},
  // ───────── Indian Climate, Monsoon & Seasons ─────────
  { name:'Indian Monsoon & Climate', wikiCat:'Climate_of_India', keywords:[
    'monsoon','southwest','northeast','retreating','advancing','itcz','jet stream','westerlies','south china','heat wave','cold wave','arid','semi-arid','humid','sub-humid','drought','flood','el nino','la nina','indian ocean dipole','orographic'
  ], topics:[
    'Climate of India','Monsoon of South Asia','Southwest monsoon','Northeast monsoon','Retreating monsoon','Advancing monsoon','Monsoon trough','Intertropical Convergence Zone','ITCZ','Thermal equator','Subtropical high',
    'Indian Ocean Dipole','El Nino','La Nina','Southern Oscillation','Rossby wave','Jet stream','Subtropical westerly jet','Tropical easterly jet','Western disturbances',
    'Orographic precipitation','Monsoon burst','Break in monsoon','Monsoon depression','Cyclonic storm','Norwester','Kal Baisakhi','Cherrapunji','Mawsynram',
    'Drought in India','Floods in India','Drought-prone areas in India','Monsoon variability','El Nino effect on Indian monsoon',
    'Koeppen climate classification','Tropical savanna climate','Tropical monsoon climate','Arid climate','Semi-arid climate','Subtropical climate','Himalayan climate'
  ]},
  { name:'Seasons & Weather of India', wikiCat:'Seasons_in_India', keywords:[
    'season','winter','summer','spring','autumn','post-monsoon','pre-monsoon','harvest','kharif','rabi','zaid','temperature','wind','humidity','evaporation','condensation','thunderstorm','cyclone','depression','pressure'
  ], topics:[
    'Seasons in India','Winter in India','Summer in India','Monsoon season in India','Post-monsoon season','Spring in India','Autumn in India',
    'Kharif crop','Rabi crop','Zaid crop','Cropping seasons in India',
    'Temperature','Heat wave in India','Cold wave in India','Wind system of India','Loo','Dust storm','Thunderstorm','Lightning',
    'Tropical cyclones in India','Cyclone Nargis','Cyclone Amphan','Cyclone Fani','Odisha cyclone','Indian Meteorological Department','Cyclone warning',
    'Atmosphere','Humidity','Evaporation','Condensation','Precipitation','Rainfall distribution in India','Normal monsoon','Deficient monsoon'
  ]},
  // ───────── Biological & Life Sciences ─────────
  { name:'Biological Classification & Taxonomy', wikiCat:'Biological_classification', keywords:[
    'taxonomy','classification','kingdom','phylum','class','order','family','genus','species','taxon','nomenclature','dichotomous','prokaryote','eukaryote','kingdom animalia','plantae','fungi','protista','monera','archaea','carolus linnaeus','binomial'
  ], topics:[
    'Biological classification','Taxonomy','Kingdom','Phylum','Class','Order','Family','Genus','Species','Taxon','Carl Linnaeus','Binomial nomenclature','Biological nomen','Dichotomous key','Hierarchy of biological classification',
    'Five kingdoms','Three-domain system','Prokaryote','Eukaryote','Archaea','Bacteria','Monera','Protista','Fungi','Plantae','Animalia','Virus','Viroid','Prion','Lichens','Mycoplasma',
    'Whittaker classification','Haeckel','Woese','Taxonomic rank','Type species','Conservation status','Endemism','Biodiversity hotspot'
  ]},
  { name:'Cell Biology & Genetics', wikiCat:'Cell_biology', keywords:[
    'cell','organelle','nucleus','mitochondria','ribosome','chloroplast','membrane','dna','rna','gene','chromosome','mitosis','meiosis','replication','transcription','translation','heredity','mutation','allele','genome','genetics','protein'
  ], topics:[
    'Cell biology','Cell','Eukaryote cell','Prokaryote cell','Cell membrane','Cytoplasm','Nucleus','Nucleolus','Ribosome','Endoplasmic reticulum','Golgi apparatus','Mitochondria','Chloroplast','Lysosome','Vacuole','Cell wall','Cytoskeleton',
    'DNA','RNA','Gene','Chromosome','Chromatin','Histone','Genome','Genetics','Gregor Mendel','Mendelian inheritance','Allele','Dominant','Recessive','Genotype','Phenotype','Heredity',
    'Mitosis','Meiosis','Cell division','Cell cycle','DNA replication','Transcription','Translation','Central dogma','Protein biosynthesis','Mutation','Genetic code','Nucleic acid',
    'DNA fingerprinting','Recombinant DNA','Plasmid','Stem cell','Gene therapy','Human Genome Project','Genetically modified organism'
  ]},
  { name:'Plant Biology (Botany)', wikiCat:'Botany', keywords:[
    'plant','botany','root','stem','leaf','flower','photosynthesis','transpiration','respiration in plant','germination','pollination','fertilization in plant','seed','fruit','chlorophyll','xylem','phloem','stomata','hormone in plant','tropism','perennation','crop'
  ], topics:[
    'Botany','Plant','Root','Stem','Leaf','Flower','Fruit','Seed','Photosynthesis','Chlorophyll','Chloroplast','Transpiration','Stomata','Xylem','Phloem','Vascular tissue','Vascular bundle',
    'Respiration in plants','Germination','Pollination','Self-pollination','Cross-pollination','Fertilisation (plant)','Double fertilisation','Phototropism','Geotropism','Hydrotropism','Plant hormone','Auxin','Gibberellin','Cytokinin','Ethylene','Abscisic acid',
    'Nitrogen fixation','Rhizobium','Symbiosis (plant)','Parasitic plant','Carnivorous plant','Epiphyte','Xerophyte','Hydrophyte','Halophyte','Algae','Bryophyte','Pteridophyte','Gymnosperm','Angiosperm','Monocotyledon','Dicotyledon',
    'Medicinal plants','Spice','Cash crop','Fibre crop','Oilseed','Pulses','Cereals','Millets','Vegetable farming','Plant breeding','All India Coordinated Project'
  ]},
  { name:'Animal Biology (Zoology)', wikiCat:'Zoology', keywords:[
    'animal','zoology','mammal','reptile','amphibian','bird','fish','invertebrate','vertebrate','arthropod','mollusc','annelid','cnidarian','poriferan','echinoderm','endotherm','ectotherm','camouflage','migration','metamorphosis','wildlife'
  ], topics:[
    'Zoology','Animal','Vertebrate','Invertebrate','Mammal','Reptile','Amphibian','Bird','Fish','Amphioxus','Cnidaria','Porifera','Arthropod','Insect','Arachnid','Crustacean','Mollusc','Gastropod','Bivalve','Annelid','Echinoderm',
    'Endotherm','Ectotherm','Warm-blooded','Cold-blooded','Camouflage','Mimicry','Migration in animals','Hibernation','Metamorphosis','Ecdysis','Regeneration',
    'Wildlife of India','Endangered species in India','Critically endangered species in India','Indian rhinoceros','Bengal tiger','Asiatic lion','Indian elephant','Snow leopard','Nilgiri tahr','Great Indian bustard',
    'IUCN Red List','Wildlife conservation in India','Project Tiger','Project Elephant','Wildlife Sanctuary','National Park','Zoo','Breeding'
  ]},
  { name:'Microbiology & Human Diseases', wikiCat:'Microbiology', keywords:[
    'microbe','microorganism','bacteria','virus','fungus','protozoa','pathogen','infection','disease','antibiotic','vaccine','immunity','host','vector','transmission','epidemic','pandemic','antigen','antibody','parasite'
  ], topics:[
    'Microbiology','Microorganism','Bacteria','Virus','Fungus','Protozoa','Algae','Pathogen','Infection','Infectious disease','Contagious disease','Host','Vector','Parasite','Saprophyte','Saprotroph',
    'Antigen','Antibody','Vaccine','Vaccination','Immunity','Innate immunity','Adaptive immunity','Antibiotic','Antiviral drug','Antiseptic','Disinfectant','Germ theory of disease',
    'Tuberculosis','Malaria','Dengue fever','Chikungunya','Typhoid','Cholera','Polio','Measles','Smallpox','COVID-19 pandemic','Hepatitis','Rabies','Tetanus','Leprosy','Filariasis','Japanese encephalitis','Amoebiasis','Ringworm',
    'Epidemic','Pandemic','Outbreak','Herd immunity','Quarantine','National Immunisation Schedule','Mission Indradhanush'
  ]},
];


// Rotation groups (7 groups, cycled through by 4h time slots)
const DAY_GROUPS = [
  [0,1,2,3],       // Group 0: Ancient India, Medieval & Modern India, World History, Indian Geography
  [4,5,6,7],       // Group 1: World Geography, Polity & Governance, Indian Economy, General Science
  [8,9,10,11],     // Group 2: Science & Technology, Art & Culture, Defence & Security, Environment & Ecology
  [12,13,14,15],   // Group 3: International Relations, Indian Society, Ethics & Integrity, ISRO & Space
  [16,17,18,19],   // Group 4: Sports, Books & Authors, Awards & Honours, Govt Schemes
  [20,21,22,23],   // Group 5: Indian States, Important Days, Personalities, Disaster Management
  [24,25,26,27,28,29,30,31,32], // Group 6: Business & Economy, RBI & Banking, Indian National Symbols, Agriculture & Food, Health & Medicine, Constitution, Computer & IT, Railways & Transport, Energy & Power
  [33,34,35,36,37,38,39], // Group 7: Indian Judiciary, Indian Tribes, Education in India, Indian Battles, Indian Heritage, Indian Cinema, Women & Society
  [40,41,42,43,44,45], // Group 8: Soil & Watershed, Horticulture, Farm Machinery, Food Processing, Agricultural Engineering, Applied Sciences
  [46,47,48,49,50,51,52,53,54,55], // Group 9: Meteorology & Climate, Animal Husbandry & Dairy, Fisheries & Aquaculture, Telecom & Postal, Mining & Minerals, Indian Music & Fine Arts, Indian Languages, Courts Cases & Verdicts, Ayurveda & Traditional Medicine, Indian Architecture
  [56,57,58,59,60,61,62,63,64,65,66], // Group 10: Indian Wildlife & National Parks, Indian Rivers & Water Resources, Indian Festivals & Fairs, Indian Philosophy & Thinkers, Indian Theatre & Cinema, Indian Literature & Poets, Indian Handicrafts & Coins, Indian Museums & Heritage Sites, Indian Archaeology & Epigraphy, Indian Demographics & Census, Indian Aviation & Shipping
  [67,68,69,70,71,72,73,74,75,76,77,78], // Group 11: Plant Breeding & Genetics, Seed Science & Technology, Plant Pathology & Crop Protection, Agricultural Entomology, Agricultural Extension & Marketing, Agronomy & Crop Production, Horticulture - Fruit & Vegetable Production, Floriculture & Landscaping, Spices & Plantation Crops, Plant Physiology & Nutrition, Farm Machinery & Power, Hydrology & Soil Conservation
  [79,80,81,82,83], // Group 12: Indian Polity & Constitution, Elections & Political Parties, Public Administration & Governance, Indian Economy & Development, Banking & Financial System
  [84,85,86,87,88], // Group 13: World & Indian Physical Geography, Indian Physical Geography, Indian Art & Architecture, Indian Music Dance & Theatre, Indian Festivals & Traditions
  [89,90,91,92,93], // Group 14: Indian Scientists & Nobel Laureates, Defence & Strategic Affairs, Nuclear Energy & Technology, Space & Astronomy, ICT Digital & Cyber
  [94,95,96,97,98,99,100,101,102], // Group 15: Commissions Committees & Bodies, Malayalam Literature, Tamil Literature, Sanskrit & Classical Languages, Kannada Literature, Telugu Literature, Bengali Literature, Marathi & Hindi Literature, Punjabi & Other Regional Literature
  [103,104,105], // Group 16: International Organizations & Summits, India & International Relations, World Geography & Countries
  [106,107,108,109,110,111,112,113,114], // Group 17: Indian Religions, Hinduism & Mythology, Buddhism & Jainism, Sikhism & Other Faiths, Classical & Dravidian Languages, Indian Languages - National & Regional, Health & Human Body, Health & Nutrition, Sports & Physical Education
  [115,116,117,118,119,120,121], // Group 18: Indian Monsoon & Climate, Seasons & Weather of India, Biological Classification & Taxonomy, Cell Biology & Genetics, Plant Biology (Botany), Animal Biology (Zoology), Microbiology & Human Diseases
];

async function main() {
  let quizSize = 0;
  try { quizSize = fs.statSync(QUIZ_PATH).size; } catch (e) {}
  log('Loading quiz.json (' + (quizSize / 1024 / 1024).toFixed(0) + ' MiB)...');
  let quiz;
  try { quiz = { questions: readQuizQuestions(QUIZ_PATH) }; }
  catch (e) { quiz = { questions: [] }; console.log('Created new quiz.json (was missing)'); }
  const existingQ = new Set(quiz.questions.map(q => norm(q.question)));

  let nextId = quiz.questions.length;

  function pushQ(qObj) {
    if (existingQ.has(norm(qObj.question))) return false;
    existingQ.add(norm(qObj.question));
    qObj.id = 'q' + (nextId++);
    quiz.questions.push(qObj);
    return true;
  }

  let totalAdded = 0;
  const doneThisRun = new Set();
  // Cursor advances made this run, persisted to quiz questions as wikiMinedTo
  // for the next run (so revisits keep resuming past already-mined sentences).
  const cursorThisRun = new Map(); // norm(title) -> sentences consumed

  // Periodic progress beacon so a running chunk shows live QN-per-minute
  // throughput in the Actions log (not just the per-category end line).
  const progressMs = parseInt(process.env.WIKI_FILL_PROGRESS_MS || '60000', 10);
  let lastProgress = totalAdded;
  let progressStart = Date.now();
  const progressTimer = setInterval(() => {
    const now = Date.now();
    const mins = (now - progressStart) / 60000;
    const rate = mins > 0 ? (totalAdded - lastProgress) / mins : 0;
    log('[progress] chunk=' + process.env.WIKI_FILL_CHUNK + '/' + process.env.WIKI_FILL_CHUNKS +
      ' newThisRun=' + totalAdded + ' (grandTotal=' + quiz.questions.length + ')' +
      ' +' + (totalAdded - lastProgress) + ' in last min (' + rate.toFixed(0) + ' qn/min)');
    lastProgress = totalAdded;
    progressStart = now;
  }, progressMs);
  progressTimer.unref();

  // Determine which group to process
  const processAll = process.env.WIKI_FILL_ALL === '1';
  const fillGroup = parseInt(process.env.WIKI_FILL_GROUP || '0', 10);
  let activeCategories;
  if (processAll) {
    activeCategories = CATEGORIES;
    log('Processing ALL categories (WIKI_FILL_ALL=1)');
  } else if (fillGroup >= 0 && fillGroup < DAY_GROUPS.length) {
    const activeIdxs = new Set(DAY_GROUPS[fillGroup]);
    activeCategories = [...activeIdxs].map(i => CATEGORIES[i]);
    log('Group ' + fillGroup + ' — processing ' + activeCategories.length + ' of ' + CATEGORIES.length + ' categories');
    CATEGORIES.forEach((c, i) => {
      if (!activeIdxs.has(i)) log('  (skipping: ' + c.name + ')');
    });
  } else {
    activeCategories = CATEGORIES;
    log('Invalid WIKI_FILL_GROUP=' + fillGroup + ', processing all');
  }

  const CONCURRENCY = parseInt(process.env.WIKI_FILL_CONCURRENCY || '12', 10);
  const WIKI_FILL_CHUNK = parseInt(process.env.WIKI_FILL_CHUNK || '1', 10);
  const WIKI_FILL_CHUNKS = parseInt(process.env.WIKI_FILL_CHUNKS || '1', 10);

  // Phase 1: Gather topics from all active categories (with auto-discovery).
  // Generation is deterministic and pushQ() dedups by question text, so a
  // re-fetched article only yields questions for sentences not yet consumed —
  // re-processing therefore RESUMES where the article stopped. Give the
  // per-category budget to never-covered content first, then continue
  // partially-covered articles (covered but not yet marked done) so their
  // remaining paragraphs get finished over successive runs.
  // Persisted linked-page pool: titles discovered by link traversal in past
  // runs. They are fed into the revisit budget so their remaining sentences get
  // fully mined across runs (the link pass only touches 50 sentences/run).
  let linkPool = {};
  try { linkPool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8')); }
  catch (e) { linkPool = {}; }
  // Discovered Category:XXX member lists shared across the 27 parallel chunk
  // jobs (persisted read-through cache, see CAT_MEMBER_CACHE_PATH above).
  const catMemberCache = {};
  try { Object.assign(catMemberCache, JSON.parse(fs.readFileSync(CAT_MEMBER_CACHE_PATH, 'utf8'))); }
  catch (e) { /* no cache yet */ }
  const linkedThisRun = {};

  const coveredTitles = new Set();
  const doneTitles = new Set();
  const qCount = new Map();
  // Persisted per-article mining cursor: number of sentences already consumed
  // for each covered title. Deterministic generation re-produces the same
  // questions from the same sentences, and pushQ() rejects those as duplicates,
  // so without a cursor a revisited article re-mints its first N sentences and
  // yields 0 new (stalling partial articles after their first pass). The cursor
  // lets the revisit resume PAST the already-mined sentences each run.
  const minedCursor = new Map(); // norm(title) -> count of sentences consumed
  for (const q of quiz.questions) {
    if (q.source !== 'Wiki' || !q.subSubject) continue;
    const k = norm(q.subSubject);
    coveredTitles.add(k);
    qCount.set(k, (qCount.get(k) || 0) + 1);
    if (q.wikiDone) doneTitles.add(k);
    const v = q.wikiMinedTo || 0;
    if (v > (minedCursor.get(k) || 0)) minedCursor.set(k, v);
  }
  const topicBudget = parseInt(process.env.WIKI_FILL_TOPIC_BUDGET || '200000', 10);
  const revisitBudget = parseInt(process.env.WIKI_FILL_REVISIT_BUDGET || '200000', 10);

  const catTopicMap = {};
  for (const cat of activeCategories) {
    const hardcoded = [...cat.topics].filter(t => !coveredTitles.has(norm(t)));
    let discovered = [];
    if (cat.wikiCat) {
      const cachedMembers = catMemberCache[cat.wikiCat];
      if (Array.isArray(cachedMembers) && cachedMembers.length) {
        discovered = cachedMembers;
        log('  Using cached members for Category:' + cat.wikiCat + ' (' + discovered.length + ' topics)');
      } else {
        log('  Fetching category members from Category:' + cat.wikiCat + '...');
        // Apportion the per-run discovery budget fairly across every active category
        // so no single category (or the first sequential ones) monopolizes it and
        // leaves later categories with empty topic lists (which yielded 0 net-new
        // questions once the category count grew past the ~8 the budget covered).
        const perCatDisco = activeCategories.length
          ? Math.max(1, Math.floor(DISCOVERY_BUDGET_MS / activeCategories.length)) : 0;
        const wikiTopics = await fetchCategoryMembers(cat.wikiCat, parseInt(process.env.WIKI_FILL_MAX_PAGES || '1000000', 10), perCatDisco);
        // Seed the shared cache so the other parallel chunk jobs don't re-fetch
        // this category's members over the network this run (or future runs).
        if (wikiTopics.length) catMemberCache[cat.wikiCat] = wikiTopics;
        discovered = wikiTopics;
      }
      const existing = new Set(cat.topics.map(t => t.toLowerCase()));
      discovered = discovered.filter(t => !existing.has(t.toLowerCase()));
      // Opt-in relevance gate: when a category lists `keywords`, auto-discovered
      // titles must contain at least one (whole-word) keyword. Category member
      // trees like Agricultural_economics recurse into generic sub-topics
      // (economics schools, journals, people, sports), so this keeps discovered
      // topics on-topic without touching the curated hardcoded list.
      if (cat.keywords && cat.keywords.length) {
        const kw = cat.keywords.map(k => k.toLowerCase());
        discovered = discovered.filter(t => {
          const lower = t.toLowerCase();
          return kw.some(k => new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(lower));
        });
        if (discovered.length) log('  Relevance-gated discovered topics: ' + discovered.length);
      }
      if (discovered.length) log('  Auto-discovered ' + discovered.length + ' topics from Category:' + cat.wikiCat);
    }
    // Fresh (never-covered) content first, then partially-covered articles so the
    // remaining sentences of each article get finished over successive runs.
    const uncovered = discovered.filter(t => !coveredTitles.has(norm(t)));
    const pickedDiscovered = uncovered.slice(0, topicBudget);
    if (uncovered.length) {
      log('  Uncovered topics: ' + uncovered.length + ' — budget picks ' + pickedDiscovered.length + ' (new content first)');
    }
    // Revisit articles closest to being done first (fewest questions) so they
    // get finished and released from the budget; larger ones wait their turn.
    // Pooled linked-page titles (discovered by past link traversals) join the
    // candidates so their un-mined sentences get finished over successive runs.
    const pooledLinks = (linkPool[cat.name] || []).filter(t => {
      const k = norm(t);
      return coveredTitles.has(k) && !doneTitles.has(k);
    });
    const partiallyCovered = [...cat.topics, ...discovered, ...pooledLinks]
      .filter(t => {
        const k = norm(t);
        return coveredTitles.has(k) && !doneTitles.has(k);
      })
      .sort((a, b) => (qCount.get(norm(a)) || 0) - (qCount.get(norm(b)) || 0));
    const pickedRevisit = partiallyCovered.slice(0, revisitBudget);
    if (pickedRevisit.length) {
      log('  Continuing ' + pickedRevisit.length + ' partially-covered articles (resume from last fetched sentence)');
    }
    catTopicMap[cat.name] = { cat, topics: hardcoded.concat(pickedDiscovered, pickedRevisit) };
  }

  // Phase 2: Flatten all topics → {cat, topic} entries
  let allEntries = [];
  Object.values(catTopicMap).forEach(({ cat, topics }) => {
    topics.forEach(t => allEntries.push({ cat, topic: t }));
  });

  // Phase 3: Split by chunk at topic level
  if (WIKI_FILL_CHUNKS > 1) {
    const chunkSize = Math.ceil(allEntries.length / WIKI_FILL_CHUNKS);
    const start = (WIKI_FILL_CHUNK - 1) * chunkSize;
    const end = Math.min(start + chunkSize, allEntries.length);
    allEntries = allEntries.slice(start, end);
    const catNames = [...new Set(allEntries.map(e => e.cat.name))];
    log('Chunk ' + WIKI_FILL_CHUNK + '/' + WIKI_FILL_CHUNKS + ' — ' + allEntries.length + ' topics, ' + catNames.length + ' categories: ' + catNames.join(', '));
  }

  // Phase 4: Group chunk's entries by category
  const catGroups = {};
  allEntries.forEach(({ cat, topic }) => {
    if (!catGroups[cat.name]) catGroups[cat.name] = { cat, topics: [] };
    catGroups[cat.name].topics.push(topic);
  });
  const processCats = Object.values(catGroups);
  const processedTitles = new Set();

  // Wall-clock deadline: discovery pools grow run over run (link pool gained
  // ~12k lines in run #418), so a chunk must never exceed the runner timeout
  // regardless of how much budget the pools leave. Once the deadline is hit we
  // stop mid-traversal and save what we have — un-mined linked pages stay in
  // the persisted pool and are re-mined next run (no data is dropped).
  // RUN_START / TIME_BUDGET_MS are module-scope (defined at the top).

  for (const item of processCats) {
    if (TIME_BUDGET_MS && Date.now() - RUN_START > TIME_BUDGET_MS) {
      log('  (stopping: time budget reached, ' + Math.round((Date.now() - RUN_START) / 60000) + 'min elapsed)');
      break;
    }
    try {
    const cat = item.cat;
    const allTopics = item.topics;
    log('\n=== ' + cat.name + ' (' + allTopics.length + ' topics) ===');

    // Fetch and mine IN BATCHES instead of fetch-everything-then-mine. Phase-1
    // `fetchAllTopics` over a huge pooled topic list (budgets were raised to
    // 200000/cat) spends its whole ~330-min window at ~2.5s delay per article
    // (concurrency 5), so by the time it returns the per-article mining loop
    // below immediately hits its own TIME_BUDGET break and yields 0 questions.
    // Interleaving a small batch guarantees mining always runs as articles
    // arrive, so questions are produced continuously regardless of the pool size.
    let added = 0;
    let fetchedThisCat = [];
    const BATCH = 120;
    for (let i = 0; i < allTopics.length; i += BATCH) {
      if (TIME_BUDGET_MS && Date.now() - RUN_START > TIME_BUDGET_MS) {
        log('  (stopping: time budget reached, ' + Math.round((Date.now() - RUN_START) / 60000) + 'min elapsed)');
        break;
      }
      const slice = allTopics.slice(i, i + BATCH);
      let articles = [];
      try {
        articles = await fetchAllTopics(slice, CONCURRENCY);
      } catch (err) {
        log('  (batch fetch failed for this slice: ' + (err && (err.message || err.code) ? (err.message || err.code) : err) + ' — continuing)');
      }
      for (const a of articles) fetchedThisCat.push(a);
      for (const article of articles) {
        if (TIME_BUDGET_MS && Date.now() - RUN_START > TIME_BUDGET_MS) break;
        const ext = article.extract;
      const title = article.title;
      const desc = article.description;

      // Skip only articles verified done. Covered-but-not-done articles are
      // revisited (they were added to the revisit pool above): deterministic
      // generation + pushQ() dedup means already-consumed sentences contribute
      // 0 new questions, so the article resumes from the first unused sentence.
      if (doneTitles.has(norm(title))) {
        log('  (done: ' + title + ')');
        continue;
      }

      // Skip list/table pages — they produce garbled fragments
      if (isListPage(ext)) {
        log('  (skipping list page: ' + title + ')');
        continue;
      }

      const body = trimBackmatter(ext);

      const allSentences = splitSentences(body).filter(s => s.trim().length > 20 && !isBadSentence(s));
      const sentences = allSentences.filter(s => s.trim().length > 25 && !isBadSentence(s));
      const wasCovered = coveredTitles.has(norm(title));
      let articleAdded = 0;
            // Description-based (1 per article)
      if (desc && desc.length > 5 && desc.length < 200) {
        const q = makeDescriptionQuestion(desc, title);
        if (q.length > 15 && q.length < 200 && pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added,
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
          question: q, answer: title, hint: '',
          fact: paraphrase(getContext(allSentences, title, 3), title),
        })) { added++; articleAdded++; }
      }

      const MAX_PER_ARTICLE = parseInt(process.env.WIKI_FILL_PER_ARTICLE || '2000', 10);
      let articleQ = 0;

      // ▸ Composer attribution ("Title – Composer" lines, e.g. Popular
      //   compositions). Runs on the RAW extract so newline-separated entries
      //   stay distinct. These are high-value exam facts, so emit them before
      //   the generic blank branches.
      for (const comp of extractComposerAttributions(article.raw, title)) {
        if (articleQ >= MAX_PER_ARTICLE) break;
        if (pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added + 'c',
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
          question: comp.q, answer: comp.a, hint: '',
          fact: paraphrase(getContext(allSentences, title, 3), comp.a),
        })) { added++; articleAdded++; articleQ++; }
      }

      // ▸ Term–definition tables (wikitext {|class=wikitable}, e.g. the "28
      //   vratas" list). Tables are stripped from prop=extracts, so this uses the
      //   wikitext payload and blanks the Sanskrit/technical term from its meaning.
      for (const tq of extractTableTermDefs(article.wikitext, title)) {
        if (articleQ >= MAX_PER_ARTICLE) break;
        if (pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added + 't-blank',
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
          question: tq.q, answer: tq.a, hint: '',
          fact: paraphrase(getContext(allSentences, title, 3), tq.a),
        })) { added++; articleAdded++; articleQ++; }
      }

      // ▸ Fact-pattern extractors (expert question shapes). Run across ALL
      // sentences — not just in article order — so the most important facts
      // (dated events, reviewer attributions, theme lists such as the "limbs
      //   of a painting") are not starved by shallow term-blank questions
      //   eating the 20-question/article budget first.
      const factsBySentence = sentences.map(sent => extractFactQuestions(sent, title));
      const factAccepted = new Set();
      let factTotal = 0;
      for (let si = 0; si < sentences.length; si++) {
        if (factTotal >= MAX_PER_ARTICLE) break;
        const sentFacts = factsBySentence[si];
        if (!sentFacts.length) continue;
        const sent = sentences[si];
        for (const f of sentFacts) {
          if (factTotal >= MAX_PER_ARTICLE) break;
          if (pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 'f',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: f.question, answer: f.answer, hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), f.answer),
          })) { added++; articleAdded++; articleQ++; factTotal++; factAccepted.add(si); }
        }
      }

      // Resume the blank-out sweep from the persisted cursor (how many sentences
      // were consumed in prior runs) so a revisited article continues past its
      // already-mined front instead of re-minting the same sentences. The fact
      // extractors above are deterministic + pushQ-deduped, so leaving them to
      // scan all sentences is harmless (0 new) — only the volume-driving loop
      // needs the cursor. Track the highest sentence index reached so the cursor
      // can be advanced and persisted for the next run.
      const startSent = Math.min(minedCursor.get(norm(title)) || 0, sentences.length);
      let siReached = startSent;
      for (let si = startSent; si < sentences.length && articleQ < MAX_PER_ARTICLE; si++) {
        siReached = si + 1;
        const sent = sentences[si];
        const sentKey = title + '::' + si;
        let sentUsed = factAccepted.has(si);

        // ▸ Year-based (any year, no trigger word filter)
        if (!sentUsed) {
          const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
          if (years && sent.length < 240) {
            const yearChoice = years[0];
            const context = sent.replace(yearChoice, '_____').trim().substring(0, 200);
            if (/^[^a-z]*[A-Z][a-z]+[,\s].*\(_____\)\s*$/.test(context)) continue;
            if (/^\(?_____\)?\s*$/.test(context)) continue;
            if (/^Archived from/i.test(context)) continue;
            if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+.*\(\d{4}.*\)/.test(sent)) continue;
            if (/^[A-Z][a-z]+\s+\([12]\d{3}\)/.test(sent)) continue;
            if (/\([^)]*_____[^)]*\)/.test(context)) continue;
            if (context.length > 25 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'y',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
              question: context, answer: yearChoice, hint: '',
              fact: paraphrase(getContext(allSentences, sent, 3), yearChoice),
            })) { added++; articleAdded++; articleQ++; sentUsed = true; }
          }
        }

        // ▸ Number-based (%, lakh, crore, million, billion, km, kg)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed) {
          const numRe = /\b(\d+(?:[.,]\d+)?\s*(%|lakh|crore|million|billion|trillion|sq\s*\.?\s*km|km²|km\b|kg|tonnes?|hectares?|megawatts?|kilometres?|kilometers?|metres?|meters?|miles?|feet|ft\b|inches?|yards?|m\b))/i;
          const numMatch = sent.match(numRe);
          if (numMatch && sent.length < 240) {
            const numChoice = numMatch[1];
            const context = sent.replace(numChoice, '_____').trim().substring(0, 200);
            if (context.length > 25 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'n',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: numChoice.trim(), hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), numChoice.trim()),
            })) { added++; articleAdded++; articleQ++; sentUsed = true; }
          }
        }

        // ▸ Superlative-based (first, largest, highest, oldest, etc.)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed) {
          const supMatch = sent.match(/\b(first|second|largest|highest|oldest|deepest|longest|biggest|tallest|smallest|largest|earliest|latest|closest|farthest|most powerful|most populous|most important)\b/i);
          if (supMatch && sent.length < 240) {
            const numberNearby = sent.match(/\b(\d+(?:[.,]\d+)?)\s*(?=%|million|billion|lakh|crore|km|kg|feet|ft|metres?|meters?|miles?|inches?|yards?|m)?/);
            if (numberNearby) {
              const context = sent.replace(numberNearby[1], '_____').trim().substring(0, 200);
              if (context.length > 25 && pushQ({
                id: cat.name.substring(0,3).toLowerCase() + added + 's',
                type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
                pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: numberNearby[1].trim(), hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), numberNearby[1].trim()),
              })) { added++; articleAdded++; articleQ++; sentUsed = true; }
            }
          }
        }

        // ▸ Blank-out key term (every short sentence; long ones are handled by
        //   the fact-pattern extractors above)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed && sent.length <= 260) {
          if (new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(sent)) continue;
          const bestTerm = findBestTerm(sent, title);
          if (!bestTerm) continue;
          if (new RegExp('^' + bestTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(stripLeadingNoise(sent.trim()))) continue;
          const context = sent.replace(bestTerm, '_____').trim().substring(0, 200);
          if (context.length > 25 && context.length < 200 && pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 't',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: bestTerm, hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), bestTerm),
          })) { added++; articleAdded++; articleQ++; sentUsed = true; }
        }
      }

      // Advance the persisted per-article cursor to the highest sentence consumed
      // this run. This is what lets the NEXT run resume past the sentences just
      // scanned, so a partial article is finished over successive runs instead of
      // re-minting its mined front (which pushQ() would reject as duplicates).
      const titleKey = norm(title);
      const cursor = Math.max(minedCursor.get(titleKey) || 0, siReached);
      minedCursor.set(titleKey, cursor);
      cursorThisRun.set(titleKey, cursor);

      // Article produced nothing new this run — its remaining sentences (from the
      // cursor onward) yielded no extractable question material. Because the loop
      // resumes at the cursor, articleAdded===0 here genuinely means this article
      // is exhausted (or barren), so mark it done and stop re-fetching it.
      if (articleAdded === 0) {
        doneTitles.add(titleKey);
        doneThisRun.add(titleKey);
        if (wasCovered) log('  (fully covered: ' + title + ')');
        else log('  (barren, no questions: ' + title + ')');
      }
      }
    }

    // ── Follow internal links recursively until exhausted (budgeted) ──
    let prevFetched = fetchedThisCat;
    let depth = 0;
    const MAX_LINK_FETCHES = parseInt(process.env.WIKI_FILL_LINK_BUDGET || '200000', 10);
    let linkFetched = 0;
    while (prevFetched.length > 0 && linkFetched < MAX_LINK_FETCHES) {
      if (DISCOVERY_BUDGET_MS && Date.now() > discoveryDeadline()) {
        log('  (stopping link traversal: discovery budget reached, reserving time for mining, ' + Math.round((Date.now() - RUN_START) / 60000) + 'min elapsed)');
        break;
      }
      depth++;
      const linkCandidates = [];
      for (const article of prevFetched) {
        if (!article || !article.extract || article.extract.length < 200) continue;
        const titleKey = article.title.toLowerCase();
        if (processedTitles.has(titleKey)) continue;
        processedTitles.add(titleKey);
        const links = await fetchPageLinks(article.title);
        for (const l of links) {
          const lKey = l.toLowerCase();
          if (!processedTitles.has(lKey)) { processedTitles.add(lKey); linkCandidates.push(l); }
        }
      }
      if (linkCandidates.length === 0) break;
      log('  Link depth ' + depth + ': ' + linkCandidates.length + ' new topics...');
      // Fetch+mine link pages in small slices so a huge candidate pool (link
      // budget was raised to 200000) cannot burn the whole discovery window in
      // one fetchAllTopics call before any mining happens — same starvation
      // pattern as the main loop above. Slice results are accumulated into
      // prevFetched so the next depth's link discovery still sees every page.
      const linkSliceTotal = Math.min(linkCandidates.length, MAX_LINK_FETCHES - linkFetched);
      const LINK_BATCH = 120;
      prevFetched = [];
      for (let li = 0; li < linkSliceTotal; li += LINK_BATCH) {
        const linkSlice = linkCandidates.slice(li, li + LINK_BATCH);
        let fetched = [];
        try {
          fetched = await fetchAllTopics(linkSlice, 2, t => coveredTitles.has(norm(t)));
        } catch (err) {
          log('  (link-batch fetch failed: ' + (err && (err.message || err.code) ? (err.message || err.code) : err) + ' — continuing)');
        }
        for (const a of fetched) prevFetched.push(a);
        linkFetched += fetched.length;
        for (const article of fetched) {
        const ext = article.extract, title = article.title, desc = article.description;
        if (isListPage(ext)) continue;
        // Link traversal is for discovering NEW content only; continuation of
        // partially-covered articles is handled by the main revisit pool above
        // (which scans all sentences, unlike this 10-sentence link pass).
        if (coveredTitles.has(norm(title))) continue;
        const addedBeforeLink = added;
        const body = trimBackmatter(ext);
        const allSentences = splitSentences(body).filter(s => s.trim().length > 20 && !isBadSentence(s));
        const sentences = allSentences.filter(s => s.trim().length > 25 && !isBadSentence(s));
        if (desc && desc.length > 5 && desc.length < 200) {
          const q = makeDescriptionQuestion(desc, title);
          if (q.length > 15 && q.length < 200 && pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 'l',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: q, answer: title, hint: '',
            fact: paraphrase(getContext(allSentences, title, 3), title),
          })) added++;
        }
        const LINK_PER_ARTICLE = parseInt(process.env.WIKI_FILL_LINK_PER_ARTICLE || '200', 10);
        for (let si = 0; si < sentences.length && si < LINK_PER_ARTICLE; si++) {
          const sent = sentences[si];
          if (sent.length > 260) continue;

          // ▸ Fact-pattern extractors (dated events, attributions, term lists)
          const linkFacts = extractFactQuestions(sent, title);
          for (const f of linkFacts) {
            if (pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'lf',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
              question: f.question, answer: f.answer, hint: '',
              fact: paraphrase(getContext(allSentences, sent, 3), f.answer),
            })) added++;
          }

          let sentUsed = linkFacts.length > 0;

          // ▸ Year-based
          if (!sentUsed) {
            const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
            if (years && sent.length < 240) {
              const yearChoice = years[0];
              const context = sent.replace(yearChoice, '_____').trim().substring(0, 200);
              if (context.length > 25 && pushQ({
                id: cat.name.substring(0,3).toLowerCase() + added + 'ly',
                type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
                pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
                question: context, answer: yearChoice, hint: '',
                fact: paraphrase(getContext(allSentences, sent, 3), yearChoice),
              })) { added++; sentUsed = true; }
            }
          }

          // ▸ Blank-out key term (cheap, high-yield)
          if (!sentUsed) {
            if (new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(sent)) continue;
            const bestTerm = findBestTerm(sent, title);
            if (!bestTerm) continue;
            if (new RegExp('^' + bestTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(stripLeadingNoise(sent.trim()))) continue;
            const context = sent.replace(bestTerm, '_____').trim().substring(0, 200);
            if (context.length > 25 && context.length < 200 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'lt',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
              question: context, answer: bestTerm, hint: '',
              fact: paraphrase(getContext(allSentences, sent, 3), bestTerm),
            })) added++;
          }
        }
        // Persist this linked page into the pool: it produced questions but the
        // link pass only touched up to LINK_PER_ARTICLE sentences, so the rest
        // should be mined by the main revisit pool in a future run. Record the
        // mined-sentence cursor so the revisit loop resumes PAST these sentences
        // instead of re-minting them (dedup -> 0 new), which previously stranded
        // every linked page at sentence ~200 forever.
        if (added > addedBeforeLink) {
          if (!linkedThisRun[cat.name]) linkedThisRun[cat.name] = [];
          linkedThisRun[cat.name].push(title);
          const linkCursor = Math.min(LINK_PER_ARTICLE, sentences.length);
          const titleKey = norm(title);
          if (linkCursor > (minedCursor.get(titleKey) || 0)) {
            minedCursor.set(titleKey, linkCursor);
            cursorThisRun.set(titleKey, linkCursor);
          }
        }
      }
      }
    }
    if (depth > 0) log('  Link traversal finished at depth ' + depth);

    log('  Added ' + added + ' new questions for ' + cat.name + ' (total: ' + quiz.questions.length + ')');
    totalAdded += added;

    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const catPath = path.join(__dirname, '..', 'data', 'questions', slug + '.json');
    let catFile = {};
    try { catFile = JSON.parse(fs.readFileSync(catPath, 'utf8')); } catch {}
    const seen = new Set();
    Object.entries(catFile).forEach(([subj, subjData]) => {
      if (subjData.subSubjects) {
        Object.entries(subjData.subSubjects).forEach(([subSub, qs]) => {
          qs.forEach(q => seen.add(((q.question||'')+'||'+(q.answer||'')).toLowerCase().replace(/\s+/g,' ').trim()));
        });
      }
    });
    let addedCount = 0;
    quiz.questions.filter(q => q.subject === cat.name).forEach(q => {
      const key = ((q.question||'')+'||'+(q.answer||'')).toLowerCase().replace(/\s+/g,' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        const subj = q.subject;
        const subSub = q.subSubject || 'General';
        if (!catFile[subj]) catFile[subj] = { subSubjects: {} };
        if (!catFile[subj].subSubjects[subSub]) catFile[subj].subSubjects[subSub] = [];
        catFile[subj].subSubjects[subSub].push(q);
        addedCount++;
      }
    });
    fs.writeFileSync(catPath, JSON.stringify(catFile));
    log('  Saved per-category file: data/questions/' + slug + '.json (' + addedCount + ' new questions)');
    } catch (catErr) {
      // A category that throws (network burst, malformed page, OOM edge, etc.)
      // must not abort the whole chunk: log it, keep the questions the category
      // already accumulated in `quiz`, and move on to the next category so the
      // chunk still finishes and persists its output.
      log('  (category error for ' + cat.name + ': ' + (catErr && (catErr.message || catErr.code) ? (catErr.message || catErr.code) : catErr) + ' — continuing)');
    }
  }

  if (doneThisRun.size) {
    for (const q of quiz.questions) {
      if (q.source === 'Wiki' && q.subSubject && doneThisRun.has(norm(q.subSubject))) q.wikiDone = true;
    }
    log('Marked ' + doneThisRun.size + ' articles fully covered (wikiDone)');
  }

  // Persist per-article sentence-progress cursors so the next run's revisit
  // loop resumes past already-mined sentences (instead of re-minting the same
  // ones into the dedup sink, which yields 0 new each run). Without this the
  // 146k linked-page frontier was stuck at sentence ~200 forever.
  if (cursorThisRun.size) {
    let updated = 0;
    for (const q of quiz.questions) {
      if (q.source !== 'Wiki' || !q.subSubject) continue;
      const k = norm(q.subSubject);
      const c = cursorThisRun.get(k);
      if (c != null && (!q.wikiMinedTo || c > q.wikiMinedTo)) { q.wikiMinedTo = c; updated++; }
    }
    log('Persisted mining cursor for ' + updated + ' questions (' + cursorThisRun.size + ' articles)');
  }

  const poolMerged = {};
  Object.keys(linkPool).forEach(c => { poolMerged[c] = linkPool[c]; });
  Object.entries(linkedThisRun).forEach(([c, titles]) => {
    poolMerged[c] = [...new Set([...(poolMerged[c] || []), ...titles])];
  });
  // Embed the merged pool in the chunk output so the merge job can aggregate
  // per-chunk pools into the persisted data/wiki-link-pool.json.
  quiz.linkPool = poolMerged;
  try {
    fs.writeFileSync(LINK_POOL_PATH, JSON.stringify(poolMerged, null, 1));
    const totalPool = Object.values(poolMerged).reduce((s, a) => s + a.length, 0);
    log('Saved linked-page pool: ' + totalPool + ' titles across ' + Object.keys(poolMerged).length + ' categories (' + LINK_POOL_PATH + ')');
  } catch (e) {
    log('  (could not save link pool: ' + e.message + ')');
  }

  // Persist discovered category-member lists so parallel/future chunk jobs read
  // the cache instead of re-fetching every category's members over the network.
  try {
    const finalCache = {};
    try { Object.assign(finalCache, JSON.parse(fs.readFileSync(CAT_MEMBER_CACHE_PATH, 'utf8'))); }
    catch (e2) { /* no prior cache */ }
    let cachedNew = 0;
    Object.entries(catMemberCache).forEach(([c, titles]) => {
      if (Array.isArray(titles) && titles.length && !finalCache[c]) { finalCache[c] = titles; cachedNew++; }
    });
    fs.writeFileSync(CAT_MEMBER_CACHE_PATH, JSON.stringify(finalCache));
    log('Saved category-member cache: ' + Object.keys(finalCache).length + ' categories (' + cachedNew + ' new)');
  } catch (e) {
    log('  (could not save category-member cache: ' + e.message + ')');
  }

  writeQuiz(QUIZ_PATH, quiz);
  if (process.env.RUNNER_TEMP) {
    const tmpPath = process.env.RUNNER_TEMP + '/quiz.json';
    writeQuiz(tmpPath, quiz);
    log('Saved quiz.json to runner temp (' + tmpPath + ')');
  }

  log('Total new: ' + totalAdded + ', Grand total: ' + quiz.questions.length);
}

main().catch(e => { console.error(e); process.exit(1); });

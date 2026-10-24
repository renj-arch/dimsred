// Self-train bootstrap: sample fresh Q/A from the wiki corpus (data/questions)
// and publish them as Ask-style training records on the `training-data`
// branch, where train-writer.yml's push trigger + "+15 new records" gate
// retrains the page's own writer model — no human typing required.
//
// BLANK QUESTIONS ARE REWRITTEN, NEVER TRAINED AS-IS: the corpus is almost
// entirely fill_blank ("The _____ was ..."), which would teach the model
// trivia-slot-filling instead of proper answers. properQuestion() turns a
// blank into a real WH-question ("What was the former landfill in Albany,
// California?"), and blanks are capped to half of each batch so proper
// questions (and the owner's own Ask/improve records) dominate the mix.
//
// WHY DETERMINISTIC, NOT THE MODEL: records teach the exact answer style the
// site trusts — question, corpus fact, short answer — assembled straight from
// the corpus. `model: "corpus-auto"` marks them synthetic; train/audit.js
// still gates duplicates and leakage before any training.
//
// WHY PAT, NOT GITHUB_TOKEN: GitHub suppresses workflow triggers for
// GITHUB_TOKEN pushes, so train-writer would never see the batch.
//
// Sampling is seeded by the UTC date: same day = same slice = idempotent
// (existing q+answer pairs are skipped on merge); next day = different slice.
//
// Env: GITHUB_TOKEN (PAT), GITHUB_REPOSITORY (set by Actions),
//      MAX_RECORDS (default 240), CATEGORIES (default 6),
//      MAX_BLANK_SHARE (default 0.5), DRY_RUN=1 (collect + report only).

const fs = require('fs');
const path = require('path');
const https = require('https');

const QDIR = 'data/questions';
const BRANCH = 'training-data';
const OUT_PATH = 'ask-training.jsonl';
const MAX_RECORDS = parseInt(process.env.MAX_RECORDS || '240', 10);
const CATEGORIES = parseInt(process.env.CATEGORIES || '6', 10);
const MAX_BLANK_SHARE = parseFloat(process.env.MAX_BLANK_SHARE || '0.5');
const DRY = process.env.DRY_RUN === '1';
const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isBlank(it) {
  return /_{2,}/.test(String(it.question || '')) || /blank/i.test(String(it.type || ''));
}

// "The _____ was former landfill in Albany, California." -> "What was the
// former landfill in Albany, California?" — generic, deterministic, works for
// the dominant template; clumsy edge cases are acceptable because the fact
// sentence travels with every record as the ground truth.
function properQuestion(text) {
  var q = String(text).trim();
  if (!/_{2,}/.test(q)) return q;
  q = q.replace(/_{2,}/g, 'what');
  q = q.replace(/^(the|a|an)\s+/i, '');
  q = q.replace(/\s*\.\s*$/, '?');
  if (!/\?$/.test(q)) q += '?';
  q = q.replace(/^what\s+was\s+the\s+/i, 'What was the ');
  return q.charAt(0).toUpperCase() + q.slice(1);
}

function collectItems() {
  const files = fs.readdirSync(QDIR)
    .filter(function (f) { return /^[\w.-]+\.json$/.test(f) && f !== 'state-tracker.json'; })
    .sort();
  const daySeed = Math.floor(Date.now() / 86400000);
  const rnd = mulberry32(daySeed);
  const shuffled = files.slice().sort(function () { return rnd() - 0.5; });
  const picked = shuffled.slice(0, CATEGORIES);
  const items = [];
  picked.forEach(function (f) {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { return; }
    Object.keys(d).forEach(function (subject) {
      const subs = (d[subject] && d[subject].subSubjects) || {};
      Object.keys(subs).forEach(function (sub) {
        (subs[sub] || []).forEach(function (it) {
          if (!it || !it.question || !it.answer) return;
          items.push({ file: f, subject: subject, sub: sub, item: it, blank: isBlank(it) });
        });
      });
    });
  });
  // Proper questions first within the day's slice, blanks after — so the
  // blank cap trims the tail, not the good material.
  items.sort(function (a, b) { return (a.blank ? 1 : 0) - (b.blank ? 1 : 0); });
  return { picked: picked, items: items };
}

function toRecord(e) {
  const it = e.item;
  const fact = String(it.fact || '').trim();
  const q = properQuestion(it.question);
  const answer = fact && fact !== it.answer
    ? it.answer + '. ' + fact
    : String(it.answer);
  return {
    kind: 'answer',
    q: q,
    subject: e.subject + ' — ' + e.sub,
    terms: [e.sub].concat(String(it.answer).split(/\s+/).slice(0, 4)).map(String),
    facts: fact ? [{ sentence: fact, entity: e.sub }] : [],
    plan: null,
    sections: fact ? [{ heading: 'Key fact', lines: [fact] }] : [],
    answer: answer,
    model: 'corpus-auto',
    ts: new Date().toISOString()
  };
}

function gh(method, apiPath, body) {
  return new Promise(function (resolve, reject) {
    const u = new URL('https://api.github.com' + apiPath);
    const req = https.request({
      method: method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'self-train-bootstrap',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      }
    }, function (res) {
      let d = '';
      res.on('data', function (c) { d += c; });
      res.on('end', function () {
        resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const { picked, items } = collectItems();
  console.log('self-train: categories ' + picked.join(', ') + ' -> ' + items.length +
    ' corpus item(s) (' + items.filter(function (i) { return i.blank; }).length + ' blank-type)');

  let existing = new Set();
  if (!DRY) {
    const cur = await gh('GET', '/repos/' + REPO + '/contents/' + OUT_PATH + '?ref=' + BRANCH);
    if (cur.status === 200 && cur.body && cur.body.content) {
      const text = Buffer.from(cur.body.content, 'base64').toString('utf8');
      text.split('\n').forEach(function (l) {
        if (!l.trim()) return;
        try { const r = JSON.parse(l); existing.add(r.q + ' ' + r.answer); } catch (e) { }
      });
      console.log('self-train: training-data has ' + existing.size + ' existing record(s)');
    } else if (cur.status === 404) {
      console.log('self-train: no training-data branch yet — it will be created from main');
    } else {
      console.log('self-train: existing file read -> HTTP ' + cur.status);
    }
  }

  const fresh = [];
  let blanks = 0;
  const blankCap = Math.floor(MAX_RECORDS * MAX_BLANK_SHARE);
  for (let i = 0; i < items.length && fresh.length < MAX_RECORDS; i++) {
    const e = items[i];
    if (e.blank && blanks >= blankCap) continue;
    const rec = toRecord(e);
    if (existing.has(rec.q + ' ' + rec.answer)) continue;
    existing.add(rec.q + ' ' + rec.answer);
    if (e.blank) blanks++;
    fresh.push(rec);
  }
  // Improve records: teach the model to PROPOSE site improvements, not just
  // answer questions. Curated ideas (data/ideas.json) become kind:'improve'
  // records in the same training-data file, so the owner's own model learns
  // the improvement skill too. The improve.html form records already flow
  // here the same way when a visitor submits a correction with a PAT.
  let improveN = 0;
  try {
    const ideasDoc = JSON.parse(fs.readFileSync('data/ideas.json', 'utf8'));
    (ideasDoc.ideas || []).forEach(function (idea) {
      if (!idea || !idea.title) return;
      const rec = {
        kind: 'improve',
        q: String(idea.title),
        subject: 'Site improvement',
        terms: ['improve', 'site'].concat(String(idea.title).split(/\s+/).slice(0, 4)).map(String),
        facts: [],
        plan: null,
        sections: [{ heading: 'Proposal', lines: [String(idea.detail || '')] }],
        answer: String(idea.detail || '') +
          (idea.action && idea.action.fix ? ' Action: ' + idea.action.fix : ''),
        model: 'corpus-auto',
        ts: new Date().toISOString()
      };
      if (existing.has(rec.q + ' ' + rec.answer)) return;
      existing.add(rec.q + ' ' + rec.answer);
      fresh.push(rec);
      improveN++;
    });
  } catch (e) { console.log('self-train: ideas.json unreadable — skipping improve records'); }
  console.log('self-train: ' + fresh.length + ' fresh record(s) this run (' +
    blanks + ' rewritten from blanks, ' + improveN + ' improve)' +
    (fresh.length >= MAX_RECORDS ? ', corpus capped at MAX_RECORDS' : ''));

  if (fresh.length) {
    console.log('self-train: sample -> ' + JSON.stringify(fresh[0]).slice(0, 300));
  }
  if (DRY || !fresh.length) {
    if (fresh.length) console.log('self-train: DRY_RUN — would append ' + fresh.length + ' record(s)');
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        '### Self-train bootstrap\n- categories: ' + picked.length +
        ' · corpus items: ' + items.length + ' · fresh records: ' + fresh.length +
        ' (' + blanks + ' rewritten from blanks)' + (DRY ? ' (dry run)' : '') + '\n');
    }
    return;
  }

  const ref = await gh('GET', '/repos/' + REPO + '/git/ref/heads/' + BRANCH);
  let branchSha;
  if (ref.status === 200) {
    branchSha = ref.body.object.sha;
  } else {
    const mainRef = await gh('GET', '/repos/' + REPO + '/git/ref/heads/main');
    if (mainRef.status !== 200) throw new Error('cannot read main ref');
    const created = await gh('POST', '/repos/' + REPO + '/git/refs', {
      ref: 'refs/heads/' + BRANCH, sha: mainRef.body.object.sha
    });
    if (created.status !== 201) throw new Error('branch create failed: HTTP ' + created.status);
    branchSha = created.body.object.sha;
  }
  const commit = await gh('GET', '/repos/' + REPO + '/git/commits/' + branchSha);
  const oldContent = await gh('GET', '/repos/' + REPO + '/contents/' + OUT_PATH + '?ref=' + BRANCH);
  const merged = (oldContent.status === 200 && oldContent.body && oldContent.body.content
    ? Buffer.from(oldContent.body.content, 'base64').toString('utf8') : '')
    + fresh.map(function (r) { return JSON.stringify(r); }).join('\n') + '\n';
  const blob = await gh('POST', '/repos/' + REPO + '/git/blobs', {
    content: merged, encoding: 'utf-8'
  });
  const tree = await gh('POST', '/repos/' + REPO + '/git/trees', {
    base_tree: commit.body.tree.sha,
    tree: [{ path: OUT_PATH, mode: '100644', type: 'blob', sha: blob.body.sha }]
  });
  const newCommit = await gh('POST', '/repos/' + REPO + '/git/commits', {
    message: 'Self-train bootstrap: ' + fresh.length + ' corpus record(s) ' +
      new Date().toISOString().slice(0, 16) + 'Z',
    tree: tree.body.sha, parents: [branchSha]
  });
  const upd = await gh('PATCH', '/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
    sha: newCommit.body.sha
  });
  if (upd.status !== 200) throw new Error('ref update failed: HTTP ' + upd.status);
  console.log('self-train: pushed ' + fresh.length + ' record(s) to ' + BRANCH +
    ' — train-writer fires automatically via the +15 gate');
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '### Self-train bootstrap\n- categories: ' + picked.length +
      ' · corpus items: ' + items.length +
      ' · **fresh records pushed: ' + fresh.length + '** (' + blanks + ' rewritten from blanks)\n' +
      '- train-writer.yml retrains automatically once +15 accumulate\n');
  }
}

main().catch(function (e) {
  console.error('self-train: FAILED — ' + (e && e.message || e));
  process.exit(1);
});

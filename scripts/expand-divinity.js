#!/usr/bin/env node
'use strict';
/**
 * expand-divinity.js — grow divinity.html a few verified topics every run.
 *
 * Rotates a broad topic list across traditions, has a model write 2-3 accurate
 * paragraphs, an independent model verify it, then appends it to a dedicated
 * container on the page (idempotent by topic key).
 *
 *   node scripts/expand-divinity.js --count 3 --dry
 *   node scripts/expand-divinity.js --count 3
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'divinity.html');
const STATE = path.join(ROOT, 'data', 'divinity-state.json');
const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN', GEMINI: 'GEMINI_API_KEY' };
for (const f of Object.keys(ROUTES)) if (process.env[ROUTES[f]] && process.env[f] !== '0') process.env[f] = '1';

const DRY = process.argv.includes('--dry');
const COUNT = Math.max(1, parseInt((process.argv[process.argv.indexOf('--count') + 1] || '3'), 10) || 3);

const TOPICS = [
  ['gayatri', 'Hinduism — the Gāyatrī Mantra'],
  ['mahamrityunjaya', 'Hinduism — the Mahāmṛtyuñjaya Mantra'],
  ['dashavatara', 'Hinduism — the Daśāvatāra (ten avatars of Viṣṇu)'],
  ['navagraha', 'Hinduism — the Navagraha (nine planetary deities)'],
  ['shakti-peethas', 'Hinduism — the Śakti Pīṭhas'],
  ['kumbh-mela', 'Hinduism — the Kumbh Melā'],
  ['onam', 'Hinduism — Onam and the Vāmana legend'],
  ['pongal', 'Hinduism — Pongal and the Tamil harvest'],
  ['chhath', 'Hinduism — Chhath Pūjā'],
  ['rath-yatra', 'Hinduism — the Jagannātha Rath Yātrā'],
  ['char-dham', 'Hinduism — the Char Dham pilgrimage'],
  ['puranas', 'Hinduism — the Purāṇas'],
  ['four-noble-truths', 'Buddhism — the Four Noble Truths'],
  ['eightfold-path', 'Buddhism — the Eightfold Path'],
  ['theravada-mahayana', 'Buddhism — Theravāda and Mahāyāna'],
  ['vesak', 'Buddhism — Vesākha'],
  ['bodhi-tree', 'Buddhism — the Bodhi tree and Bodh Gayā'],
  ['navkar', 'Jainism — the Ṇamokāra Mantra'],
  ['tirthankaras', 'Jainism — the 24 Tīrthaṅkaras'],
  ['paryushana', 'Jainism — Paryuṣaṇa'],
  ['anekantavada', 'Jainism — anekāntavāda and syādvāda'],
  ['mool-mantar', 'Sikhism — the Mūl Mantar'],
  ['five-ks', 'Sikhism — the Five Ks'],
  ['vaisakhi', 'Sikhism — Vaisākhī and the Khālsā'],
  ['guru-granth', 'Sikhism — the Gurū Granth Sāhib'],
  ['langar', 'Sikhism — laṅgar and sevā'],
  ['five-pillars', 'Islam — the Five Pillars'],
  ['shahada', 'Islam — the Shahāda'],
  ['ramadan', 'Islam — Ramaḍān and ʿĪd'],
  ['hajj', 'Islam — the Ḥajj'],
  ['lords-prayer', 'Christianity — the Lord\'s Prayer'],
  ['trinity', 'Christianity — the Trinity'],
  ['christmas-easter', 'Christianity — Christmas and Easter'],
  ['sacraments', 'Christianity — the sacraments'],
  ['shema', 'Judaism — the Shema'],
  ['ten-commandments', 'Judaism — the Ten Commandments'],
  ['passover', 'Judaism — Passover and Yom Kippur'],
  ['ashem-vohu', 'Zoroastrianism — the Ashem Vohu'],
  ['navroz', 'Zoroastrianism — Navroz and the fire temple'],
  ['bahai-unity', 'Bahá\'í — unity of religion and Naw-Rúz'],
  ['book-of-the-dead', 'Ancient Egypt — the Book of the Dead'],
  ['osiris-myth', 'Ancient Egypt — the Osiris myth'],
  ['maat', 'Ancient Egypt — Ma\'at'],
  ['enuma-elish', 'Mesopotamia — the Enūma Eliš'],
  ['gilgamesh-flood', 'Mesopotamia — Gilgamesh and the flood'],
  ['olympians', 'Greece — the Twelve Olympians'],
  ['delphi', 'Greece — the Oracle at Delphi'],
  ['eleusinian', 'Greece — the Eleusinian Mysteries'],
  ['vestal-virgins', 'Rome — the Vestal Virgins'],
  ['saturnalia', 'Rome — Saturnalia'],
  ['yggdrasil', 'Norse — Yggdrasil and the nine worlds'],
  ['ragnarok', 'Norse — Ragnarök'],
  ['eddas', 'Norse — the Poetic and Prose Eddas'],
  ['samhain', 'Celtic — Samhain and the druids'],
  ['perun', 'Slavic — Perun and Veles'],
  ['dao-de-jing', 'China — the Dào Dé Jīng'],
  ['yin-yang', 'China — yīn-yáng and the Five Phases'],
  ['spring-festival', 'China — the Spring Festival'],
  ['guanyin', 'China — Guānyīn'],
  ['shinto-kami', 'Japan — Shintō and the kami'],
  ['torii', 'Japan — the torii and purification'],
  ['obon', 'Japan — Obon'],
  ['yoruba-orishas', 'Africa — Yoruba orishas'],
  ['ifa', 'Africa — Ifá divination'],
  ['vodun', 'Africa — Vodun'],
  ['popol-vuh', 'Mesoamerica — the Popol Vuh'],
  ['inti', 'Andes — Inti and Pachamama'],
  ['kachina', 'North America — Hopi kachina tradition'],
  ['maori-maui', 'Pacific — Māui and whakapapa'],
  ['dreaming', 'Australia — the Dreaming and songlines'],
  ['pele', 'Hawaii — Pele and the kapu'],
  ['flood-myths', 'Comparative — flood myths across cultures'],
  ['creation-myths', 'Comparative — creation myths'],
  ['afterlife', 'Comparative — afterlife and judgement'],
  ['symbols-cross-crescent', 'Comparative — cross, crescent, wheel and lotus'],
  ['pilgrimage', 'Comparative — pilgrimage across religions'],
  ['fasting', 'Comparative — fasting practices'],
  ['religious-texts', 'Comparative — scriptures and canons']
];

function loadState() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return { done: [] }; } }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function extractJson(t) {
  const i = String(t || '').indexOf('{');
  if (i < 0) return null;
  let d = 0, str = false, es = false;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (str) { if (es) es = false; else if (c === '\\') es = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; } } }
  }
  return null;
}

async function main() {
  if (process.argv.includes('--remaining')) {
    const st = loadState();
    const done = new Set(st.done || []);
    console.log('LANE_REMAINING=' + TOPICS.filter(([k]) => !done.has(k)).length);
    return;
  }
  if (!DRY && !require('./lib/hosted').enabled()) { console.error('no model route'); process.exitCode = 1; return; }
  const hosted = DRY ? null : require('./lib/hosted');
  const state = loadState();
  state.done = state.done || [];
  const todo = TOPICS.filter(([k]) => state.done.indexOf(k) === -1).slice(0, COUNT);
  if (!todo.length) { console.log('divinity: all topics written'); return; }

  let html = fs.readFileSync(PAGE, 'utf8');
  const marker = '<!-- divinity-daily -->';
  if (!html.includes(marker)) {
    html = html.replace('<footer>', marker + '\n<div id="divinity-daily"></div>\n<footer>');
  }
  const insertBefore = html.indexOf('<footer>');
  if (insertBefore < 0) { console.error('no footer insertion point'); process.exitCode = 1; return; }

  const added = [];
  for (const [key, title] of todo) {
    if (state.done.indexOf(key) !== -1) continue;
    if (DRY) { console.log('would add: ' + title); continue; }
    let body = null, why = '';
    for (let attempt = 1; attempt <= 2 && !body; attempt++) {
      let text;
      try {
        text = await hosted.chat(
          'You write concise, accurate study notes on world religions and mythologies for an Indian exam site. Neutral, respectful, factual, no preaching. 2-3 short paragraphs. Mention variants where they exist. Plain HTML: <p> and <ul> only.',
          'Topic: ' + title + '\n\nWrite the note. ' + (attempt > 1 ? 'Return only the HTML.' : ''),
          { numPredict: 2200, temperature: 0.3 });
      } catch (e) { why = e.message; continue; }
      const clean = String(text || '').replace(/```html?/gi, '').replace(/```/g, '').trim();
      if (!/^<(p|ul)/i.test(clean) || clean.length < 200) { why = 'bad shape'; continue; }
      let v = null;
      try {
        v = extractJson(await hosted.chat(
          'You are an independent fact-checker for a religion-studies hub. Is this note accurate, balanced and respectful, with no invented dates or claims? Reject if any statement is dubious. Reply JSON only: {"ok":true|false,"reason":"<=120 chars"}.',
          'TOPIC: ' + title + '\n\nNOTE:\n' + clean, { numPredict: 1200, temperature: 0 }));
      } catch (e) { why = e.message; continue; }
      if (v && v.ok === true) body = clean; else why = (v && v.reason) || 'not verified';
    }
    if (!body) { console.log('  rejected ' + key + ': ' + why); continue; }
    const section = '<section class="card" data-divinity="' + key + '"><h3>' + esc(title) + '</h3>' + body + '</section>\n';
    html = html.slice(0, insertBefore) + section + html.slice(insertBefore);
    state.done.push(key);
    added.push(key);
    fs.writeFileSync(PAGE, html, 'utf8');
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n', 'utf8');
    console.log('  + ' + title);
  }
  if (!DRY) console.log('divinity: added ' + added.length + ', done ' + state.done.length + '/' + TOPICS.length);
  if (!DRY) console.log('LANE_DONE=' + added.length + ' LANE_REMAINING=' + Math.max(0, TOPICS.length - state.done.length));
}
main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });
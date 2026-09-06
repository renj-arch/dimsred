const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

// Polyfill for browser globals used by GK generators
globalThis.pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
globalThis.window = globalThis;

// Load existing GK_DATA and GK_GEN2 from source files
// The source files use "var GK_DATA = ..." which in eval is local scope only.
// We capture them by declaring vars first, then eval assigns to them.
var GK_DATA, GK_GEN2;

const gkDataCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'gk-data.js'), 'utf8');
const gkGenCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'gk-generators.js'), 'utf8');

eval(gkDataCode);
eval(gkGenCode);

if (!GK_DATA) throw new Error('GK_DATA not loaded');
if (!GK_GEN2) throw new Error('GK_GEN2 not loaded');

const SUBJECTS = Object.keys(GK_GEN2);
const QUESTIONS_PER_SUBJECT = 8;

// Utility: generate options (distractors) from related data
function buildOptions(correctAnswer, subject) {
  const pool = [];
  const data = GK_DATA[subject];
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (Array.isArray(item)) {
        item.forEach(val => {
          if (typeof val === 'string' && val.length > 1 && val.length < 60) pool.push(val);
        });
      }
    });
  }
  const unique = [...new Set(pool.filter(v => v.toLowerCase() !== correctAnswer.toLowerCase()))];
  const opts = [correctAnswer];
  while (opts.length < 4 && unique.length > 0) {
    const idx = Math.floor(Math.random() * unique.length);
    const v = unique.splice(idx, 1)[0];
    opts.push(v);
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

// Generate questions
let allNew = [];

SUBJECTS.forEach(subject => {
  const generator = GK_GEN2[subject];
  if (!generator) return;

  const seen = new Set();
  let attempts = 0;
  const maxAttempts = QUESTIONS_PER_SUBJECT * 5;

  while (seen.size < QUESTIONS_PER_SUBJECT && attempts < maxAttempts) {
    attempts++;
    try {
      const q = generator();
      if (!q || !q.q || !q.a) continue;
      const key = (q.q + '|||' + q.a).toLowerCase().trim();
      if (seen.has(key)) continue;
      if (q.q.length < 15 || q.a.length < 1) continue;

      seen.add(key);

      // Determine category based on subject
      const catMap = {
        constitution: 'Constitution', schemes: 'Govt Schemes', sports: 'Sports',
        books: 'Books & Authors', space: 'ISRO & Space', defence: 'Defence',
        national_parks: 'Environment & Ecology', dance: 'Art & Culture',
        orgs: 'International Relations', awards: 'Awards', dams: 'Geography',
        important_days: 'Important Days', history: 'Indian History',
        geography: 'Geography', economy: 'Indian Economy', science: 'General Science',
        environment: 'Environment & Ecology', culture: 'Art & Culture',
        world_geo: 'World Geography', computers: 'Computer & IT',
        polity: 'Polity', state_gk: 'State GK', personalities: 'Personalities',
        ir: 'International Relations', society: 'Society', ethics: 'Ethics',
      };

      const category = catMap[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);

      const options = buildOptions(q.a, subject);

      allNew.push({
        id: 'gk-' + subject + '-' + Buffer.from(key).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '-' + Date.now(),
        type: 'fill_blank',
        category: category,
        region: '',
        source: 'GK_Data',
        pubDate: new Date().toISOString(),
        subject: category,
        emoji: '',
        question: q.q,
        answer: q.a,
        options: options,
        hint: q.hint || '',
        fact: q.fact || '',
      });
    } catch (e) { /* skip bad generator call */ }
  }

  console.log('  ' + subject + ': ' + seen.size + ' questions');
});

// Deduplicate & merge
let existing = { questions: [] };
try { existing = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8')); } catch (e) {}

// Remove old GK_Data questions
const before = existing.questions.length;
existing.questions = existing.questions.filter(q => q.source !== 'GK_Data');

const existingSet = new Set();
existing.questions.forEach(q => {
  existingSet.add((q.question + '|||' + q.answer).toLowerCase().trim());
});

let added = 0;
for (const q of allNew) {
  const key = (q.question + '|||' + q.answer).toLowerCase().trim();
  if (!existingSet.has(key)) {
    existing.questions.push(q);
    existingSet.add(key);
    added++;
  }
}

existing.updatedAt = new Date().toISOString();
fs.writeFileSync(QUIZ_PATH, JSON.stringify(existing, null, 2), 'utf8');

console.log('\n=== Done ===');
console.log('Old GK_Data removed: ' + (before - existing.questions.length + added));
console.log('New questions added: ' + added);
console.log('Total in quiz.json: ' + existing.questions.length);

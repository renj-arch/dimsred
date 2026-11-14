const fs = require('fs');
const path = require('path');
const https = require('https');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

// ── Fetch helpers (from fetch-wiki-gk.js) ──
function fetchJSON(url, retries) {
  retries = retries || 5;
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'FillFromWiki/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) {
          if (retries > 0 && (data.includes('You are') || data.includes('<html'))) {
            const wait = (6 - retries) * 10000;
            console.log('(rate limited, retrying in ' + wait/1000 + 's...)');
            setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), wait);
          } else {
            reject(new Error('Invalid JSON: ' + data.substring(0, 80)));
          }
        }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanText(text) {
  return text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchArticle(query, maxRetries) {
  maxRetries = maxRetries || 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
      const data = await fetchJSON(searchUrl);
      const results = (data.query ? data.query.search || [] : []);
      const titles = results.map(r => r.title).filter(t => !t.includes(':') && !t.includes('(disambiguation)') && t.length > 3).slice(0, 2);
      if (titles.length === 0) return null;
      // Get intro section for explanation (no exintro to get full first section)
      const extUrl = `${WIKI_API}?action=query&prop=extracts|description&explaintext&exchars=800&exlimit=1&titles=${encodeURIComponent(titles.join('|'))}&format=json`;
      const extData = await fetchJSON(extUrl);
      const pages = extData.query ? extData.query.pages : {};
      const page = Object.values(pages).find(p => p && p.title && !p.missing && (p.extract||'').length > 50);
      if (!page) return null;
      return {
        title: page.title,
        extract: cleanText(page.extract || ''),
        description: cleanText(page.description || ''),
      };
    } catch (err) {
      if (err.message.includes('too many requests') && attempt < maxRetries - 1) {
        const wait = (attempt + 1) * 5000;
        console.log('(rate limit, waiting ' + wait + 'ms)');
        await delay(wait);
        continue;
      }
      throw err;
    }
  }
  return null;
}

function buildQuery(ss, cat) {
  // Remove parentheticals, special chars
  let q = ss.replace(/\([^)]*\)/g, '').replace(/[&,]/g, '').trim();
  // Category-specific context
  if (/India/i.test(cat)) q += ' India';
  if (cat === 'Polity' || cat === 'Constitution') q += ' India constitution';
  if (cat === 'International Relations') q += ' ' + cat;
  return q;
}

function generateQuestion(article, cat, ss) {
  const { title, extract, description } = article;
  const text = description || extract;
  if (!text || text.length < 15) return null;

  // Try to create a fill-in-the-blank question from the content
  const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 20);
  if (sentences.length === 0) {
    return null;
  }

  // Pick the best sentence (longer, more informative)
  const bestSent = sentences.sort((a, b) => b.length - a.length)[0];
  
  let qText, answer, fact;
  
  // Try to create a fill-in by masking the title within the sentence
  const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleRegex = new RegExp(titleEsc, 'i');
  
  if (titleRegex.test(bestSent)) {
    qText = bestSent.replace(titleRegex, '_____');
    answer = title;
    fact = extract.substring(0, 600);
  } else {
    // Try extracting a key entity (capitalized word or phrase)
    const words = bestSent.split(/\s+/);
    const entities = words.filter(w => /^[A-Z][a-z]+/.test(w) && w.length > 3 && w !== title && !['This', 'The', 'Its', 'They', 'Their', 'These', 'Those'].includes(w));
    
    if (entities.length > 0) {
      const entity = entities[Math.floor(entities.length / 2)];
      const entityEsc = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      qText = bestSent.replace(new RegExp('\\b' + entityEsc + '\\b'), '_____');
      answer = entity;
      fact = extract.substring(0, 600);
    } else {
      return null;
    }
  }

  // ── Quality filters ──

  // Reject if answer is purely numeric (year extracted without context)
  if (/^\d+$/.test(answer)) return null;

  // Reject if answer is too short
  if (answer.length < 3) return null;

  // Reject tautological fact (starts with "Answer: " — means fact was just prefixed)
  const answerEsc = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('^' + answerEsc + '[:,]').test(fact)) return null;

  // Reject if category is Indian but article doesn't mention India
  if (/^Indian/i.test(cat) && !/India/i.test(fact)) return null;

  // Reject fragment-like questions (starts lowercase or date-range)
  if (/^[a-z]/.test(qText)) return null;
  if (/^\d{4}[-–]/.test(qText)) return null;

  return {
    question: qText,
    answer: answer,
    fact: fact,
    hint: '',
  };
}

// ── Main ──
async function main() {
  // Read build script for SUB_TAX
  const buildCode = fs.readFileSync(path.join(__dirname, 'build-archive.js'), 'utf8');
  const subTaxMatch = buildCode.match(/const SUB_TAX\s*=\s*({[\s\S]*?});\s*(?:\/\/|const CAT_MAP|function classifySub)/);
  if (!subTaxMatch) { console.error('Could not find SUB_TAX'); process.exit(1); }
  const SUB_TAX = eval('(' + subTaxMatch[1] + ')');

  // Read existing quiz
  const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const existingQuestions = new Set(quiz.questions.map(q => q.question.replace(/\s+/g, ' ').trim()));

  // Build current tree
  const tree = {};
  quiz.questions.forEach(q => {
    const c = q.category || 'Misc', s = q.subject || 'General';
    const ss = q.subSubject || 'General';
    if (!tree[c]) tree[c] = {};
    if (!tree[c][s]) tree[c][s] = {};
    if (!tree[c][s][ss]) tree[c][s][ss] = [];
    tree[c][s][ss].push(q);
  });

  // Find empty subSubjects
  const filledKeys = new Set();
  Object.entries(tree).forEach(([cat, subs]) => {
    Object.entries(subs).forEach(([subj, ssList]) => {
      Object.keys(ssList).forEach(ss => filledKeys.add(cat + '||' + ss));
    });
  });

  let toFill = [];
  Object.entries(SUB_TAX).forEach(([cat, ssList]) => {
    ssList.forEach(ss => {
      if (!filledKeys.has(cat + '||' + ss)) {
        toFill.push({ category: cat, subSubject: ss });
      }
    });
  });

  // Also include generated questions (source === 'Generated') to replace with wiki-sourced ones
  // First, remove old generated questions
  const oldGenerated = quiz.questions.filter(q => q.source === 'Generated');
  const oldGeneratedCount = oldGenerated.length;
  
  // Remove old generated questions and also add their subSubjects to fill list
  const oldGeneratedKeys = new Set();
  oldGenerated.forEach(q => {
    const key = (q.category || '') + '||' + (q.subSubject || '');
    oldGeneratedKeys.add(key);
  });
  
  // Remove old generated questions from quiz
  quiz.questions = quiz.questions.filter(q => q.source !== 'Generated');
  
  // Add their subSubjects to fill list if not already there
  oldGeneratedKeys.forEach(key => {
    if (!toFill.some(f => f.category + '||' + f.subSubject === key)) {
      const [cat, ss] = key.split('||');
      toFill.push({ category: cat, subSubject: ss });
    }
  });

  console.log('Questions to fill via Wikipedia: ' + toFill.length + ' (removed ' + oldGeneratedCount + ' old hardcoded)');

  let newCount = 0;
  let failed = 0;
  const usedArticles = new Set(); // category||title -> dedup within category

  for (let i = 0; i < toFill.length; i++) {
    const { category, subSubject } = toFill[i];
    
    const query = buildQuery(subSubject, category);
    
    process.stdout.write('[' + (i+1) + '/' + toFill.length + '] ' + category + ' > ' + subSubject + '... ');

    try {
      const article = await fetchArticle(query);
      if (!article || !article.extract) {
        console.log('SKIP — no Wikipedia article found');
        failed++;
        continue;
      }

      // Dedup: skip if same article already used for this category
      const articleKey = category + '||' + article.title;
      if (usedArticles.has(articleKey)) {
        console.log('SKIP — duplicate article "' + article.title + '" already used for ' + category);
        failed++;
        continue;
      }

      const gen = generateQuestion(article, category, subSubject);
      if (!gen) {
        console.log('SKIP — could not generate question from article');
        failed++;
        continue;
      }

      // Check duplicate question text
      const norm = gen.question.replace(/\s+/g, ' ').trim();
      if (existingQuestions.has(norm)) {
        console.log('SKIP — duplicate question');
        failed++;
        continue;
      }

      usedArticles.add(articleKey);

      const newQ = {
        id: 'wiki-' + category.replace(/[^a-z0-9]/gi, '') + '-' + Date.now() + '-' + i,
        type: 'fill_blank',
        category: category,
        region: '',
        source: 'Wiki',
        pubDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        subject: category,
        subSubject: subSubject,
        emoji: '',
        question: gen.question,
        answer: gen.answer,
        hint: gen.hint || '',
        fact: gen.fact || '',
      };

      quiz.questions.push(newQ);
      existingQuestions.add(norm);
      newCount++;
      console.log('OK — "' + article.title + '"');
    } catch (err) {
      console.log('ERROR — ' + err.message.substring(0, 80));
      failed++;
    }

    // Save progress every 10 questions
    if (newCount % 10 === 0 && newCount > 0) {
      fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
      console.log('  [saved progress at ' + newCount + ' new questions]');
    }

    // Rate limiting: 5s between requests to avoid Wikipedia throttling
    await delay(5000);
  }

  // Write updated quiz
  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  console.log('\nDone. Added ' + newCount + ' new questions, ' + failed + ' failures. Total: ' + quiz.questions.length);
}

main().catch(err => { console.error(err); process.exit(1); });

const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const quiz = { questions: [] };
let id = 1;
function makeId() { return 'wiki_' + (id++); }

// Read SUB_TAX from build-archive.js
const buildCode = fs.readFileSync(path.join(__dirname, 'build-archive.js'), 'utf8');
const subTaxMatch = buildCode.match(/const SUB_TAX\s*=\s*({[\s\S]*?});\s*(?:\/\/|const CAT_MAP|function classifySub)/);
if (!subTaxMatch) { console.error('Could not read SUB_TAX'); process.exit(1); }
const SUB_TAX = eval('(' + subTaxMatch[1] + ')');

// Collect all subSubjects
const allPairs = [];
for (const [cat, ssList] of Object.entries(SUB_TAX)) {
  for (const ss of ssList) {
    allPairs.push([ss, cat]);
  }
}

console.log('Generating questions for ' + allPairs.length + ' subSubjects from Wikipedia...');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function norm(s) {
  return s.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchArticle(ss, cat) {
  // Build search query from subSubject
  const query = ss.replace(/[&,–]/g, ' ').replace(/\s+/g, ' ').trim();
  const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query + ' ' + cat)}&srlimit=3&format=json`;
  const data = await fetchJSON(searchUrl);
  const results = (data.query ? data.query.search || [] : []);
  const titles = results.map(r => r.title).filter(t => !t.includes(':') && !t.includes('(disambiguation)') && t.length > 3).slice(0, 2);
  if (titles.length === 0) return null;
  const extUrl = `${WIKI_API}?action=query&prop=extracts|description&exintro&explaintext&titles=${encodeURIComponent(titles.join('|'))}&format=json`;
  const extData = await fetchJSON(extUrl);
  const pages = extData.query ? extData.query.pages : {};
  const page = Object.values(pages).find(p => p && p.title && !p.missing && (p.extract||'').length > 50);
  if (!page) return null;
  return {
    title: page.title,
    extract: (page.extract || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(),
    description: (page.description || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(),
  };
}

function makeQuestion(article, ss, cat) {
  const title = article.title;
  const desc = article.description;
  const ext = article.extract;

  // Strategy 1: Description-based direct question
  if (desc && desc.length > 5 && desc.length < 150) {
    const isPerson = /(born|died|known for|scientist|politician|author|king|queen|leader|poet|painter|inventor|explorer|philosopher|saint|actor|singer)/i.test(desc);
    const wh = isPerson ? 'Who' : 'What';
    const qText = wh + ' is ' + desc.replace(/^(the\s+)?/i, '').replace(/^an?\s+/i, '').trim() + '?';
    const cleanQ = qText.charAt(0).toUpperCase() + qText.slice(1);
    if (cleanQ.length > 15 && cleanQ.length < 150 && !cleanQ.toLowerCase().includes(title.toLowerCase())) {
      return { question: cleanQ, answer: title, fact: title + ': ' + desc };
    }
  }

  // Strategy 2: Blank out a key term from extract
  const sentences = ext.split('.').filter(s => s.trim().length > 40).slice(0, 5);
  for (const sent of sentences) {
    const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(titleEsc, 'i').test(sent)) continue;
    const match = sent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
    if (match) {
      const term = match[0];
      if (term.length > 5 && term !== title && !term.includes('The ') && !term.includes('It ')) {
        const context = sent.replace(term, '_____');
        if (context.length > 20 && context.length < 180) {
          return { question: context.trim(), answer: term, fact: article.title + ': ' + ext.substring(0, 300) };
        }
      }
    }
  }

  // Strategy 3: Year-based question
  const years = ext.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
  if (years) {
    const firstSent = ext.split('.')[0];
    if (firstSent.includes('founded') || firstSent.includes('established') || firstSent.includes('created') || firstSent.includes('born') || firstSent.includes('launched')) {
      return { question: article.title + ' — in which year did this occur?', answer: years[0], fact: firstSent };
    }
  }

  // Strategy 4: Simple "What is X?" question
  return { question: 'What is ' + title + '?', answer: title, fact: title + ': ' + ext.substring(0, 300) };
}

(async () => {
  let added = 0;
  for (let i = 0; i < allPairs.length; i++) {
    const [ss, cat] = allPairs[i];
    process.stdout.write('[' + (i+1) + '/' + allPairs.length + '] ' + cat + ' > ' + ss.substring(0, 40) + '... ');

    try {
      const article = await fetchArticle(ss, cat);
      if (!article) { console.log('SKIP (no article)'); continue; }

      const qData = makeQuestion(article, ss, cat);
      if (!qData) { console.log('SKIP (no question)'); continue; }

      const opts = [qData.answer];
      // Build 3 distractors from article text
      const words = article.extract.split(/\s+/).filter(w => w.length > 4 && /^[A-Z]/.test(w));
      const unique = [...new Set(words)].filter(w => w !== qData.answer && w.length > 3).slice(0, 3);
      while (opts.length < 4 && unique.length > 0) {
        const w = unique.shift();
        if (!opts.includes(w)) opts.push(w);
      }
      while (opts.length < 4) opts.push('None of the above');
      // Shuffle
      for (let j = opts.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [opts[j], opts[k]] = [opts[k], opts[j]];
      }

      const newQ = {
        id: makeId(),
        type: 'fill_blank',
        category: cat,
        region: '',
        source: 'Wiki',
        pubDate: new Date().toISOString(),
        subject: cat,
        subSubject: ss,
        emoji: '',
        question: qData.question,
        answer: qData.answer,
        hint: cat,
        fact: (qData.fact || '').substring(0, 1200),
        options: opts,
      };

      quiz.questions.push(newQ);
      added++;
      console.log('OK (' + article.title.substring(0, 50) + ')');
    } catch (err) {
      console.log('ERROR: ' + err.message);
    }

    await delay(6000); // 6s between requests to avoid rate limit
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  console.log('\nDone. Generated ' + added + ' questions from Wikipedia.');
})();

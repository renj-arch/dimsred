const fs = require('fs');
const https = require('https');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = './data/quiz.json';

const SUBJECTS = {
  polity: 'Indian constitution polity fundamental rights directive principles parliament supreme court president prime minister India',
  economy: 'Indian economy gdp inflation rbi banking finance five year plans economic reforms India',
  history: 'Indian history ancient medieval modern independence movement freedom struggle India',
  geography: 'Indian geography physical climate rivers mountains soils agriculture regions India',
  science: 'Indian scientists physics chemistry biology inventions discoveries research India',
  space: 'ISRO Indian space research satellites chandrayaan mangalyaan gaganyaan rocket India',
  defence: 'Indian defence armed forces army navy air force missiles wars exercises India',
  environment: 'environment ecology climate change india biodiversity national parks wildlife conservation',
  culture: 'Indian culture classical dance music festival heritage architecture art UNESCO India',
  sports: 'Indian sports cricket hockey olympic athletes tournaments stadium records India',
  agriculture: 'Indian agriculture crops farming green revolution irrigation food security India',
  health: 'Indian health diseases nutrition healthcare ayushman vaccine medical India',
  education: 'Indian education NEP school university IIT IIM literacy scholarship exam India',
  energy: 'Indian energy solar wind nuclear power renewable electricity coal India',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'StudyProGK/2.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function extractYear(text) {
  const m = text.match(/\b(17[5-9]\d|18[0-9]\d|19[0-9]\d|20[0-2]\d)\b/);
  return m ? m[0] : null;
}

function cleanText(text) {
  return text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function buildDistractors(correct, pool, count) {
  const opts = [correct];
  const candidates = pool.filter(t => t.toLowerCase() !== correct.toLowerCase());
  shuffle(candidates);
  for (const t of candidates) {
    if (opts.length >= count) break;
    if (t.length > 2) opts.push(t);
  }
  shuffle(opts);
  return opts;
}

async function fetchArticles(subject, query, limit) {
  const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json`;
  const data = await fetchJSON(searchUrl);
  const results = (data.query ? data.query.search || [] : []);
  const titles = results.map(r => r.title).filter(t => !t.includes(':') && !t.includes('(disambiguation)') && t.length > 3).slice(0, 20);
  if (titles.length === 0) return [];
  const extUrl = `${WIKI_API}?action=query&prop=extracts|description&exintro&explaintext&titles=${encodeURIComponent(titles.join('|'))}&format=json`;
  const extData = await fetchJSON(extUrl);
  const pages = extData.query ? extData.query.pages : {};
  return Object.values(pages).filter(p => p && p.title && !p.missing).map(p => ({
    title: p.title,
    extract: p.extract || '',
    description: p.description || '',
  }));
}

function makeQuestions(articles, subject) {
  const allTitles = articles.map(a => a.title);
  const results = [];

  for (const article of articles) {
    const title = article.title;
    const desc = cleanText(article.description || '');
    const ext = cleanText(article.extract || '');
    const text = desc || ext;

    if (!text || text.length < 10) continue;

    const cat = subject.charAt(0).toUpperCase() + subject.slice(1);
    const questions = [];

    // Type 1: Description-based direct Q
    if (desc && desc.length > 5 && desc.length < 120) {
      const lower = desc.toLowerCase();
      let q = '';
      if (/^(.+?)(?:in India|of India|in the Indian|of the Indian)/i.test(desc)) {
        q = desc.replace(/^(The\s+)?/i, '');
      } else {
        q = desc;
      }
      questions.push({
        question: q.charAt(0).toUpperCase() + q.slice(1) + '?',
        answer: title,
        fact: title + ': ' + desc,
      });
    }

    // Type 2: Year-based Q
    const yr = extractYear(text);
    if (yr) {
      const firstLine = ext.split('.')[0] || '';
      if (firstLine.includes('founded') || firstLine.includes('established') || firstLine.includes('created')) {
        questions.push({
          question: title + ' was established in which year?',
          answer: yr,
          fact: firstLine,
        });
      } else if (firstLine.includes('born') || firstLine.includes('birth')) {
        questions.push({
          question: title + ' — In which year was this personality born?',
          answer: yr,
          fact: firstLine,
        });
      }
    }

    // Type 3: Key term fill-in (find important phrase)
    const sentences = ext.split('.').filter(s => s.trim().length > 30).slice(0, 3);
    for (const sent of sentences) {
      if (questions.length >= 2) break;
      const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hasTitle = new RegExp(titleEsc, 'i').test(sent);
      if (hasTitle) continue; // skip sentences with the title itself

      // Capitalized proper noun phrase (3-5 words) that could be a term
      const match = sent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
      if (match) {
        const term = match[0];
        if (term.length > 5 && !term.includes('The ') && !term.includes('It ') && term !== title) {
          const context = sent.replace(term, '_____');
          if (context.length < 120) {
            questions.push({
              question: context.trim(),
              answer: term,
              fact: title + ': ' + sent,
            });
          }
        }
      }
    }

    for (const q of questions) {
      results.push({
        id: 'wiki-' + subject + '-' + title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 35) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type: 'fill_blank',
        category: cat,
        region: '',
        source: 'Wiki',
        pubDate: new Date().toISOString(),
        subject: cat,
        emoji: '',
        question: q.question,
        answer: q.answer,
        options: buildDistractors(q.answer, allTitles, 4),
        hint: '',
        fact: q.fact || '',
      });
    }
  }
  return results;
}

async function main() {
  console.log('=== Fetching India-focused Wikipedia GK ===\n');

  let existing = { questions: [] };
  try { existing = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8')); } catch (e) {}

  // Remove old Wiki questions
  const before = existing.questions.length;
  existing.questions = existing.questions.filter(q => q.source !== 'Wiki');
  console.log('Removed ' + (before - existing.questions.length) + ' old Wiki questions\n');

  const subjectEntries = Object.entries(SUBJECTS);
  let totalNew = 0;

  for (let si = 0; si < subjectEntries.length; si++) {
    const [subject, query] = subjectEntries[si];
    process.stdout.write('[' + (si + 1) + '/' + subjectEntries.length + '] ' + subject + '... ');

    try {
      const articles = await fetchArticles(subject, query, 30);
      if (articles.length === 0) { console.log('no articles'); continue; }

      const questions = makeQuestions(articles, subject);
      const existingSet = new Set(existing.questions.map(q => (q.question + '|||' + q.answer).toLowerCase()));
      let added = 0;

      for (const q of questions) {
        const key = (q.question + '|||' + q.answer).toLowerCase();
        if (!existingSet.has(key)) {
          existing.questions.push(q);
          existingSet.add(key);
          added++;
        }
      }

      totalNew += added;
      console.log(articles.length + ' articles, ' + questions.length + ' gen, ' + added + ' new');
    } catch (e) {
      console.log('ERROR: ' + e.message);
    }

    await delay(1000);
  }

  existing.updatedAt = new Date().toISOString();
  fs.writeFileSync(QUIZ_PATH, JSON.stringify(existing, null, 2), 'utf8');

  console.log('\n=== Done ===');
  console.log('New questions added: ' + totalNew);
  console.log('Total in quiz.json: ' + existing.questions.length);
}

main().catch(e => console.error(e));

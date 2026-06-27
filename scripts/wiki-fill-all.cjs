const fs = require('fs');
const https = require('https');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = 'data/quiz.json';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchArticleExtract(title, retries) {
  retries = retries || 3;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `${WIKI_API}?action=query&prop=extracts|description&explaintext&exlimit=1&titles=${encodeURIComponent(title)}&format=json`;
      const data = await fetchJSON(url);
      const pages = data.query ? data.query.pages : {};
      const page = Object.values(pages).find(p => p && p.title && !p.missing);
      if (page) {
        return {
          title: page.title,
          extract: (page.extract || '').replace(/\s+/g, ' ').trim(),
          description: (page.description || '').replace(/\s+/g, ' ').trim(),
        };
      }
      return null;
    } catch (err) {
      if (attempt < retries - 1 && err.message.includes('not valid JSON')) {
        console.log('  (rate limited, waiting 15s...)');
        await delay(15000);
        continue;
      }
      throw err;
    }
  }
  return null;
}

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

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

const CATEGORIES = [
  { name: 'Indian History', topics: ['History of India', 'Indian independence movement', 'Mughal Empire'] },
  { name: 'World History', topics: ['World history', 'Cold War', 'French Revolution'] },
  { name: 'Art & Culture', topics: ['Culture of India', 'Indian classical music', 'Indian architecture'] },
  { name: 'Polity', topics: ['Constitution of India', 'Politics of India', 'Election Commission of India'] },
  { name: 'Indian Economy', topics: ['Economy of India', 'Economic liberalisation in India', 'Agriculture in India'] },
  { name: 'Geography', topics: ['Geography of India', 'Climate of India', 'Rivers of India'] },
  { name: 'World Geography', topics: ['World geography', 'Continent', 'Climate'] },
  { name: 'General Science', topics: ['Science', 'Physics', 'Chemistry'] },
  { name: 'Defence', topics: ['Indian Armed Forces', 'Indian Army', 'Indian Navy'] },
  { name: 'Environment & Ecology', topics: ['Environment of India', 'Wildlife of India', 'Climate change in India'] },
  { name: 'International Relations', topics: ['Foreign relations of India', 'United Nations', 'SAARC'] },
  { name: 'Constitution', topics: ['Constitution of India', 'Fundamental rights in India', 'Judiciary of India'] },
  { name: 'ISRO & Space', topics: ['ISRO', 'Chandrayaan', 'Mangalyaan'] },
  { name: 'Computer & IT', topics: ['Information technology in India', 'Computer science', 'Internet in India'] },
  { name: 'Sports', topics: ['Sports in India', 'Cricket in India', 'Hockey in India'] },
  { name: 'Society', topics: ['Indian society', 'Caste system in India', 'Education in India'] },
  { name: 'State GK', topics: ['States and union territories of India', 'Maharashtra', 'Tamil Nadu'] },
  { name: 'Books & Authors', topics: ['Indian literature', 'Rabindranath Tagore', 'Hindi literature'] },
  { name: 'Important Days', topics: ['United Nations observances', 'International days', 'National days of India'] },
  { name: 'Govt Schemes', topics: ['Government of India', 'MGNREGA', 'Ayushman Bharat'] },
  { name: 'Awards', topics: ['National awards of India', 'Bharat Ratna', 'Padma awards'] },
  { name: 'Business & Economy', topics: ['Business in India', 'Startup India', 'Make in India'] },
  { name: 'Tech & Science', topics: ['Technology in India', 'Indian scientists', 'Digital India'] },
  { name: 'Ethics', topics: ['Ethics', 'Moral philosophy', 'Applied ethics'] },
  { name: 'Announcements', topics: ['Public policy of India', 'Union budget of India', 'Government of India'] },
  { name: 'RBI Press Releases', topics: ['Reserve Bank of India', 'Monetary policy of India', 'Banking in India'] },
  { name: 'Personalities', topics: ['List of Indian leaders', 'Indian independence activists', 'Indian scientists'] },
];

async function main() {
  const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const existingQ = new Set(quiz.questions.map(q => norm(q.question)));

  function pushQ(qObj) {
    if (existingQ.has(norm(qObj.question))) return false;
    existingQ.add(norm(qObj.question));
    quiz.questions.push(qObj);
    return true;
  }

  let totalAdded = 0;

  for (const cat of CATEGORIES) {
    console.log('\n=== ' + cat.name + ' ===');
    const articles = [];
    for (const topic of cat.topics) {
      console.log('  Fetching: ' + topic);
      const a = await fetchArticleExtract(topic);
      if (a && a.extract.length > 200) articles.push(a);
      await delay(3000);
    }

    let added = 0;
    for (const article of articles) {
      if (added >= 10) break;
      const ext = article.extract;
      const title = article.title;
      const desc = article.description;
      const allSentences = ext.split('.').filter(s => s.trim().length > 20);
      const sentences = allSentences.filter(s => s.trim().length > 40);

      // Description-based
      if (desc && desc.length > 5 && desc.length < 150 && added < 10) {
        const isPerson = /(born|died|known for|scientist|politician|author|king|queen|leader|poet|painter)/i.test(desc);
        const q = (isPerson ? 'Who' : 'What') + ' is ' + desc.replace(/^(the\s+)?/i, '').trim() + '?';
        if (q.length > 15 && q.length < 150 && pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added,
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: cat.name, emoji: '',
          question: q, answer: title, hint: '',
          fact: getContext(allSentences, title, 3),
        })) added++;
      }

      // Year-based
      for (let si = 0; si < sentences.length && added < 10; si++) {
        const sent = sentences[si];
        const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
        if (!years) continue;
        const low = sent.toLowerCase();
        if ((low.includes('founded') || low.includes('established') || low.includes('born') || low.includes('died') || low.includes('battle') || low.includes('treaty') || low.includes('act') || low.includes('movement') || low.includes('war') || low.includes('reign') || low.includes('rule') || low.includes('invasion') || low.includes('conquest') || low.includes('launched') || low.includes('created') || low.includes('formed') || low.includes('enacted') || low.includes('adopted') || low.includes('signed') || low.includes('discovered') || low.includes('invented')) && sent.length < 200) {
          const context = sent.replace(years[0], '_____');
          if (pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added,
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: cat.name, emoji: '',
            question: context.trim().substring(0, 180), answer: years[0], hint: '',
            fact: getContext(allSentences, sent, 3),
          })) added++;
        }
      }

      // Blank-out key term
      for (let si = 0; si < sentences.length && added < 10; si++) {
        const sent = sentences[si];
        const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(titleEsc, 'i').test(sent)) continue;
        const match = sent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
        if (match) {
          const term = match[0];
          if (term.length > 5 && term !== title && !term.includes('The ') && !term.includes('It ')) {
            const context = sent.replace(term, '_____');
            if (context.length > 20 && context.length < 180 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added,
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: cat.name, emoji: '',
              question: context.trim(), answer: term, hint: '',
              fact: getContext(allSentences, sent, 3),
            })) added++;
          }
        }
      }
    }

    console.log('  Added ' + added + ' new questions for ' + cat.name + ' (total: ' + quiz.questions.length + ')');
    totalAdded += added;
    fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  console.log('\nTotal new: ' + totalAdded + ', Grand total: ' + quiz.questions.length);
}

main().catch(e => { console.error(e); process.exit(1); });

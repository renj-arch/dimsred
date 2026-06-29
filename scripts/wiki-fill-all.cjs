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

function findBestTerm(sent, title) {
  const allMatches = [];
  // Title-case words (proper nouns)
  let re = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})/g, m;
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

  const candidates = allMatches.filter(t => {
    if (t.length < 3) return false;
    if (/^(The|This|It|He|She|They|We|I|You|His|Her|Its|Their|An|A|India)$/i.test(t)) return false;
    if (t === title) return false;
    // Skip if it's a truncated version of a longer match
    const truncated = allMatches.some(x => x !== t && x.includes(t + ' '));
    if (truncated) return false;
    // Skip pure numeric
    if (/^\d+$/.test(t)) return false;
    return true;
  });

  if (!candidates.length) return null;

  const uniqueCands = [...new Set(candidates)];
  const titleLower = title.toLowerCase();
  const titleWords = new Set(titleLower.split(/\s+/));

  const scored = uniqueCands.map(t => {
    const words = t.toLowerCase().split(/\s+/);
    const overlap = words.filter(w => titleWords.has(w)).length;
    const pos = sent.indexOf(t);
    const lengthBonus = t.length > 6 ? 5 : 0;
    const earlyBonus = pos < 30 ? 8 : 0;
    return { term: t, score: overlap * 10 + words.length * 3 + earlyBonus + lengthBonus - pos * 0.1 };
  });

  scored.sort((a, b) => b.score - a.score);
  // Avoid terms that are just single common words unless they appear early
  for (const s of scored) {
    if (s.term.split(/\s+/).length > 1 || s.term.length > 5) return s.term;
  }
  return scored[0] ? scored[0].term : null;
}

function makeDescriptionQuestion(desc, title) {
  const trimmed = desc.replace(/^(the\s+)?/i, '').trim();
  const isSentence = /^[A-Z].*\w{3,} [a-z]/.test(trimmed);
  const isPerson = /(born|died|known for|scientist|politician|author|king|queen|leader|poet|painter)/i.test(desc);
  if (isSentence) return 'What is ' + title + '? ' + trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + '.';
  if (isPerson) return 'Who is ' + trimmed + '?';
  return 'What is ' + trimmed + '?';
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

  let nextId = quiz.questions.length;

  function pushQ(qObj) {
    if (existingQ.has(norm(qObj.question))) return false;
    existingQ.add(norm(qObj.question));
    qObj.id = 'q' + (nextId++);
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

      const ext = article.extract;
      const title = article.title;
      const desc = article.description;
      const allSentences = ext.split('.').filter(s => s.trim().length > 20);
      const sentences = allSentences.filter(s => s.trim().length > 25);
            // Description-based (1 per article)
      if (desc && desc.length > 5 && desc.length < 200) {
        const q = makeDescriptionQuestion(desc, title);
        if (q.length > 15 && q.length < 200 && pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added,
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
          question: q, answer: title, hint: '',
          fact: getContext(allSentences, title, 3),
        })) added++;
      }

      for (let si = 0; si < sentences.length; si++) {
        const sent = sentences[si];
        if (sent.length > 260) continue;
        let made = false;

        // ▸ Year-based (any year, no trigger word filter)
        const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
        if (years && sent.length < 240) {
          const context = sent.replace(years[0], '_____').trim().substring(0, 200);
          if (context.length > 25 && pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 'y',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: years[0], hint: '',
            fact: getContext(allSentences, sent, 3),
          })) { added++; made = true; }
        }

        // ▸ Number-based (%, lakh, crore, million, billion, km, kg)
        if (!made) {
          const numMatch = sent.match(/\b(\d+(?:[.,]\d+)?\s*(%|lakh|crore|million|billion|trillion|sq\s*\.?\s*km|km²|km\b|kg|tonnes?|hectares?|megawatts?|kilometres?))/i);
          if (numMatch && sent.length < 240) {
            const context = sent.replace(numMatch[1], '_____').trim().substring(0, 200);
            if (context.length > 25 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'n',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
              question: context, answer: numMatch[1].trim(), hint: '',
              fact: getContext(allSentences, sent, 3),
            })) { added++; made = true; }
          }
        }

        // ▸ Superlative-based (first, largest, highest, oldest, etc.)
        if (!made) {
          const supMatch = sent.match(/\b(first|second|largest|highest|oldest|deepest|longest|biggest|tallest|smallest|largest|earliest|latest|closest|farthest|most powerful|most populous|most important)\b/i);
          if (supMatch && sent.length < 240) {
            // Try to find a nearby number or entity to blank
            const numberNearby = sent.match(/\b(\d+(?:[.,]\d+)?)\s*(?=%|million|billion|lakh|crore|km|kg)?/);
            if (numberNearby) {
              const context = sent.replace(numberNearby[1], '_____').trim().substring(0, 200);
              if (context.length > 25 && pushQ({
                id: cat.name.substring(0,3).toLowerCase() + added + 's',
                type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
                pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
                question: context, answer: numberNearby[1].trim(), hint: '',
                fact: getContext(allSentences, sent, 3),
              })) { added++; made = true; }
            }
          }
        }

        // ▸ Blank-out key term (every 2nd sentence to limit volume)
        if (!made && si % 2 === 0) {
          if (new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(sent)) continue;
          const bestTerm = findBestTerm(sent, title);
          if (!bestTerm) continue;
          const context = sent.replace(bestTerm, '_____').trim().substring(0, 200);
          if (context.length > 25 && context.length < 200 && pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 't',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: bestTerm, hint: '',
            fact: getContext(allSentences, sent, 3),
          })) added++;
        }
      }
    }

    console.log('  Added ' + added + ' new questions for ' + cat.name + ' (total: ' + quiz.questions.length + ')');
    totalAdded += added;
    fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz));
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz));
  console.log('\nTotal new: ' + totalAdded + ', Grand total: ' + quiz.questions.length);
}

main().catch(e => { console.error(e); process.exit(1); });

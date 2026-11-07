const fs = require('fs');
const https = require('https');
const path = require('path');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

// All exam-relevant Wikipedia categories
const CATEGORIES = [
  'Category:History_of_India', 'Category:Ancient_India', 'Category:Medieval_India', 'Category:Modern_India',
  'Category:Indian_independence_movement', 'Category:Mughal_Empire', 'Category:Maratha_Empire',
  'Category:British_Raj', 'Category:Indian_National_Congress',
  'Category:World_history', 'Category:Ancient_civilizations', 'Category:Roman_Empire',
  'Category:World_War_I', 'Category:World_War_II', 'Category:Cold_War',
  'Category:French_Revolution', 'Category:Industrial_Revolution',
  'Category:Constitution_of_India', 'Category:Government_of_India', 'Category:Indian_judiciary',
  'Category:Politics_of_India', 'Category:Elections_in_India',
  'Category:Economy_of_India', 'Category:Indian_agriculture', 'Category:Banking_in_India',
  'Category:Geography_of_India', 'Category:Rivers_of_India', 'Category:Mountain_ranges_of_India',
  'Category:Climate_of_India', 'Category:World_geography',
  'Category:Indian_scientists', 'Category:Indian_space_program', 'Category:ISRO',
  'Category:Physics', 'Category:Chemistry', 'Category:Biology',
  'Category:Computer_science', 'Category:Information_technology_in_India',
  'Category:Indian_Armed_Forces', 'Category:Indian_Army', 'Category:Indian_Navy', 'Category:Indian_Air_Force',
  'Category:Military_history_of_India',
  'Category:Environment_of_India', 'Category:National_parks_of_India', 'Category:Wildlife_of_India',
  'Category:Climate_change_in_India',
  'Category:Culture_of_India', 'Category:Indian_classical_music', 'Category:Indian_dance',
  'Category:Indian_architecture', 'Category:Indian_literature', 'Category:Indian_festivals',
  'Category:Foreign_relations_of_India', 'Category:United_Nations', 'Category:International_trade',
  'Category:Sports_in_India', 'Category:Cricket_in_India', 'Category:Olympics',
  'Category:Commonwealth_Games', 'Category:Asian_Games',
  'Category:Indian_awards', 'Category:Bharat_Ratna', 'Category:Padma_awards', 'Category:Nobel_laureates',
  'Category:Education_in_India', 'Category:Indian_Institute_of_Technology',
  'Category:Indian_writers', 'Category:Indian_poets',
  'Category:Indian_society', 'Category:Caste_system_in_India',
  'Category:Indian_politicians', 'Category:Indian_freedom_fighters',
  'Category:States_and_union_territories_of_India',
  'Category:Indian_railways', 'Category:Energy_in_India',
  'Category:Indian_philosophy', 'Category:Indian_religions',
  'Category:Indian_languages', 'Category:Indian_media',
  'Category:Science_and_technology_in_India', 'Category:Indian_inventions',
  'Category:Indian_Nobel_laureates', 'Category:Indian_businesspeople',
  'Category:Indian_cuisine', 'Category:Indian_clothing',
  'Category:Reserve_Bank_of_India', 'Category:Taxation_in_India',
  'Category:Indian_foreign_aid', 'Category:Indian_diaspora',
  'Category:Water_resources_of_India', 'Category:Natural_disasters_in_India',
  'Category:Indian_medical_doctors', 'Category:Drugs_in_India',
  'Category:Indian_festivals', 'Category:Fairs_in_India',
  'Category:UNESCO_World_Heritage_Sites_in_India',
  'Category:Railway_stations_in_India', 'Category:Indian_airports',
  'Category:Indian_museums', 'Category:Indian_libraries',
  'Category:Indian_newspapers', 'Category:Indian_television',
  'Category:Bollywood', 'Category:Indian_film',
];

const CAT_MAP = {};
CATEGORIES.forEach(c => {
  const cn = c.replace('Category:', '');
  if (/History|Independence|Mughal|Maratha|British_Raj|Congress/i.test(cn)) CAT_MAP[c] = 'Indian History';
  else if (/World_War|Cold_War|French_Revolution|Industrial|Ancient_civilizations|Roman_Empire|World_history/i.test(cn)) CAT_MAP[c] = 'World History';
  else if (/Constitution|Government_of_India|Judiciary|Politics|Elections/i.test(cn)) CAT_MAP[c] = 'Polity';
  else if (/Economy|Agriculture|Banking|Taxation|Reserve_Bank/i.test(cn)) CAT_MAP[c] = 'Indian Economy';
  else if (/Geography_of_India|Rivers|Mountain|Climate|Water_resources|Natural_disasters/i.test(cn)) CAT_MAP[c] = 'Geography';
  else if (/World_geography/i.test(cn)) CAT_MAP[c] = 'World Geography';
  else if (/Scientists|Space|ISRO|Physics|Chemistry|Biology|Computer|Information|Science_and_technology|Inventions/i.test(cn)) CAT_MAP[c] = 'General Science';
  else if (/Armed_Forces|Army|Navy|Air_Force|Military/i.test(cn)) CAT_MAP[c] = 'Defence';
  else if (/Environment|National_parks|Wildlife|Climate_change/i.test(cn)) CAT_MAP[c] = 'Environment & Ecology';
  else if (/Culture|Music|Dance|Architecture|Literature|Festivals|Philosophy|Religions|Languages|Cuisine|Clothing|UNESCO/i.test(cn)) CAT_MAP[c] = 'Art & Culture';
  else if (/Foreign_relations|United_Nations|International_trade|Foreign_aid|Diaspora/i.test(cn)) CAT_MAP[c] = 'International Relations';
  else if (/Sports|Cricket|Olympics|Commonwealth|Asian_Games/i.test(cn)) CAT_MAP[c] = 'Sports';
  else if (/Awards|Bharat_Ratna|Padma|Nobel/i.test(cn)) CAT_MAP[c] = 'Awards';
  else if (/Education|IIT|Medical/i.test(cn)) CAT_MAP[c] = 'Society';
  else if (/Writers|Poets|Newspapers|Television|Media|Bollywood|Film/i.test(cn)) CAT_MAP[c] = 'Books & Authors';
  else if (/Society|Caste|Drugs/i.test(cn)) CAT_MAP[c] = 'Society';
  else if (/Politicians|Freedom_fighters|Businesspeople/i.test(cn)) CAT_MAP[c] = 'Personalities';
  else if (/States_and_union/i.test(cn)) CAT_MAP[c] = 'State GK';
  else if (/Railways|Airports|Railway_stations/i.test(cn)) CAT_MAP[c] = 'Computer & IT';
  else if (/Energy/i.test(cn)) CAT_MAP[c] = 'Indian Economy';
  else if (/Museums|Libraries/i.test(cn)) CAT_MAP[c] = 'Art & Culture';
  else CAT_MAP[c] = 'General';
});

function fetchJSON(url, retries) {
  retries = retries || 5;
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'GenAllWiki/3.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) {
          if (retries > 0 && (data.includes('You are') || data.includes('too many'))) {
            const wait = (6 - retries) * 12000;
            console.log(`  (rate limited, retrying in ${wait/1000}s...)`);
            setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), wait);
          } else {
            reject(new Error(data.substring(0, 100)));
          }
        }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Get category members + extracts in ONE API call using generator
async function getCategoryPages(catTitle, maxPages) {
  maxPages = maxPages || 500;
  let allPages = [];
  let gcmcontinue = null;

  while (allPages.length < maxPages) {
    let url = `${WIKI_API}?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(catTitle)}&gcmtype=page&gcmlimit=max&prop=extracts|description&exintro&explaintext&exlimit=max&format=json`;
    if (gcmcontinue) url += '&gcmcontinue=' + encodeURIComponent(gcmcontinue);

    const data = await fetchJSON(url);
    const pages = data.query ? data.query.pages || {} : {};

    for (const [id, page] of Object.entries(pages)) {
      if (page.title && !page.title.includes(':') && !page.title.includes('(disambiguation)') && page.extract && page.extract.length > 100) {
        allPages.push({
          title: page.title,
          extract: page.extract.replace(/\s+/g, ' ').trim(),
          description: (page.description || '').replace(/\s+/g, ' ').trim(),
        });
      }
    }

    if (!data.continue || !data.continue.gcmcontinue || allPages.length >= maxPages) break;
    gcmcontinue = data.continue.gcmcontinue;
    await delay(1500);
  }

  return allPages.slice(0, maxPages);
}

function generateQuestions(article, category, subSubject) {
  const { title, extract, description } = article;
  const text = description || extract;
  if (!text || text.length < 15) return [];

  const results = [];
  const allSentences = extract.split(/\.\s+/).filter(s => s.trim().length > 20);
  const sentences = allSentences.filter(s => s.trim().length > 40);

  // Type 1: Description-based Q
  if (description && description.length > 5 && description.length < 150) {
    const isPerson = /(born|died|known for|scientist|politician|author|king|queen|leader|poet|painter)/i.test(description);
    const qType = isPerson ? 'Who' : 'What';
    const descClean = description.replace(/^(the\s+)?/i, '').trim();
    const qText = qType + ' is ' + descClean + '?';
    if (qText.length > 15 && qText.length < 200) {
      results.push({ question: qText, answer: title, fact: extract.substring(0, 500) });
    }
  }

  // Type 2: Year fill-in
  for (const sent of sentences) {
    if (results.length >= 4) break;
    const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
    if (!years) continue;
    const low = sent.toLowerCase();
    if (low.includes('founded') || low.includes('established') || low.includes('born') ||
        low.includes('died') || low.includes('battle') || low.includes('treaty') ||
        low.includes('act') || low.includes('movement') || low.includes('war') ||
        low.includes('reign') || low.includes('launched') || low.includes('created') ||
        low.includes('formed') || low.includes('enacted') || low.includes('adopted') ||
        low.includes('signed') || low.includes('discovered') || low.includes('invented')) {
      const context = sent.replace(years[0], '_____');
      if (context.length > 15 && context.length < 200) {
        results.push({ question: context.trim(), answer: years[0], fact: title + ': ' + sent });
      }
    }
  }

  // Type 3: Key term blank-out
  for (const sent of sentences) {
    if (results.length >= 5) break;
    const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(titleEsc, 'i').test(sent)) continue;
    const match = sent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
    if (match) {
      const term = match[0];
      if (term.length > 5 && term !== title && !term.includes('The ') && !term.includes('It ')) {
        const context = sent.replace(term, '_____');
        if (context.length > 20 && context.length < 180) {
          results.push({ question: context.trim(), answer: term, fact: title + ': ' + sent });
        }
      }
    }
  }

  // Type 4: Title fill-in
  for (const sent of sentences) {
    if (results.length >= 6) break;
    const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(titleEsc, 'i');
    if (re.test(sent) && sent.length < 200) {
      const context = sent.replace(re, '_____');
      if (context.length > 20 && !results.some(r => r.question === context.trim())) {
        results.push({ question: context.trim(), answer: title, fact: extract.substring(0, 600) });
      }
    }
  }

  return results;
}

async function main() {
  console.log('=== COMPREHENSIVE WIKI GENERATOR v3 (batch API) ===\n');

  const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const existingSet = new Set(quiz.questions.map(q => q.question.replace(/\s+/g, ' ').trim().toLowerCase()));
  let totalAdded = 0;
  let totalSkipped = 0;
  const processedTitles = new Set();

  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const wikiCat = CATEGORIES[ci];
    const ourCategory = CAT_MAP[wikiCat] || 'General';
    const catShort = wikiCat.replace('Category:', '');
    console.log(`\n[${ci+1}/${CATEGORIES.length}] ${catShort} → ${ourCategory}`);

    try {
      const pages = await getCategoryPages(wikiCat, 200);
      if (pages.length === 0) { console.log('  No pages with extracts'); continue; }

      const newPages = pages.filter(p => !processedTitles.has(p.title));
      if (newPages.length === 0) { console.log('  All pages already processed'); continue; }
      newPages.forEach(p => processedTitles.add(p.title));

      let added = 0;
      let skipped = 0;
      for (const article of newPages) {
        const genQs = generateQuestions(article, ourCategory, catShort);
        for (const gq of genQs) {
          const norm = gq.question.replace(/\s+/g, ' ').trim().toLowerCase();
          if (existingSet.has(norm)) { skipped++; continue; }
          existingSet.add(norm);

          quiz.questions.push({
            id: 'gw' + Date.now() + Math.random().toString(36).slice(2, 8),
            type: 'fill_blank',
            category: ourCategory,
            region: '', source: 'Wiki',
            pubDate: new Date().toISOString(),
            subject: ourCategory,
            subSubject: catShort,
            emoji: '',
            question: gq.question,
            answer: gq.answer,
            hint: '',
            fact: gq.fact || '',
          });
          added++;
          totalAdded++;
        }
      }

      console.log(`  +${added} new, ${skipped} dupes (${newPages.length} articles)`);

      if (totalAdded % 200 === 0 && totalAdded > 0) {
        fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
        console.log(`  [saved: ${totalAdded} new, ${quiz.questions.length} total]`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message.substring(0, 80)}`);
    }

    await delay(3000);
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  console.log(`\n=== FINISHED ===`);
  console.log(`Added: ${totalAdded}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Total: ${quiz.questions.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });

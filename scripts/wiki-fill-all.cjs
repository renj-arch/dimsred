const fs = require('fs');
const https = require('https');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = 'data/quiz.json';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 120)));
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('not valid JSON: ' + data.substring(0, 120))); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchCategoryMembers(wikiCat, maxPages = 200) {
  let pages = [], cmcontinue = '';
  let pageNum = 0;
  while (pages.length < maxPages) {
    pageNum++;
    console.log('    page ' + pageNum + ' (' + pages.length + ' topics so far)');
    let url = `${WIKI_API}?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + wikiCat)}&cmlimit=500&format=json&cmtype=page`;
    if (cmcontinue) url += '&cmcontinue=' + encodeURIComponent(cmcontinue);
    try {
      const d = await fetchJSON(url);
      for (const m of d.query.categorymembers) {
        if (m.ns === 0) pages.push(m.title);
      }
      cmcontinue = d.continue?.cmcontinue;
      if (!cmcontinue) break;
      await delay(500);
    } catch { break; }
  }
  console.log('    done: ' + pages.length + ' topics');
  return pages.filter(t => !t.startsWith('List of ') && !t.includes('/'));
}

async function fetchAllTopics(topics, concurrency) {
  const results = [];
  const queue = [...topics];
  async function worker() {
    while (queue.length > 0) {
      const topic = queue.shift();
      console.log('  Fetching: ' + topic + '...');
      const a = await fetchArticleExtract(topic, 5);
      if (a && a.extract.length > 200) {
        results.push(a);
        console.log('  \u2713 ' + topic);
      } else {
        console.log('  (skip) ' + topic);
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, topics.length); i++) {
    await delay(5000);
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function fetchArticleExtract(title, retries) {
  retries = retries || 5;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await delay(4000);
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
      const isRetryable = err.message.includes('429') || err.message.includes('not valid JSON') || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED';
      if (attempt < retries - 1 && isRetryable) {
        const wait = Math.min(30000 * Math.pow(2, attempt), 120000);
        console.log('  (HTTP 429, waiting ' + (wait / 1000) + 's...)');
        await delay(wait);
        continue;
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
  return false;
}

// Check if Wikipedia extract is a list/table page (not prose)
function isListPage(extract) {
  const first500 = extract.substring(0, 500);
  const commas = (first500.match(/,/g) || []).length;
  // If comma density > 1 per 20 chars in first 500 → list page
  if (first500.length > 0 && commas > 0 && first500.length / commas < 20) return true;
  // "Name, Name (year)" pattern — typical of award/prize lists
  const nameYearMatches = (extract.match(/[A-Z][a-z]+,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(\d{4}\)/g) || []).length;
  if (nameYearMatches > 3) return true;
  // "Name (year)" pattern repeated
  const nameParenYear = (extract.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(\d{4}\)/g) || []).length;
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
    if (t.length < 4) return false;
    if (/^(The|This|It|He|She|They|We|I|You|His|Her|Its|Their|An|A|India|Many|Most|Some|Few|All|Each|Every|Both|Such|These|Those|That|Who|Which|What|When|Where|How|Would|Could|Should|After|Before|During|Until|Since|Within|Without|About|Between|Among|Because|Also|Only|Just|Very|Still|Even|Well|Here|There|Now|Then|One|Two|New|Old|First|Last|Next|Other|Same|Own|Long|Great|High|Large|Small|Big|Good|Bad|Chief|State|Union|Central|National|Public|General|Supreme|Federal|World|Year|Years|Name|Names|Part|Parts|Type|Types|Form|Forms|Group|Groups|List|Lists|Known|Also|Instituted|Established|Founded|Created|Introduced|Developed|Published|Released|Announced|Launched|Appointed|Elected|Awarded|Received|Won|Played|Worked|Studied|Taught|Led|Built|Designed|Invented|Discovered|Proposed|Suggested|Argued|Stated|Noted|Observed|Reported|Described|Explained|Formed|Made|Given|Taken|Held|Shown|Found|Seen|Heard|Considered|Regarded|Believed|Thought|Felt|Wanted|Needed|Used)$/i.test(t)) return false;
    if (t === title) return false;
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
    if (new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s,;:]', 'i').test(sent.trim())) return false;
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

// Simple paraphrase: shorten to 1-2 most relevant sentences, minor reword
function paraphrase(text, answer) {
  if (!text || text.length < 20) return text;
  const sentences = text.split('.').filter(s => s.trim().length > 15);
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
  const trimmed = desc.replace(/^(the\s+)?/i, '').trim();
  const isSentence = /^[A-Z].*\w{3,} [a-z]/.test(trimmed);
  const isPerson = /(born|died|known for|scientist|politician|author|king|queen|leader|poet|painter)/i.test(desc);
  if (isSentence) return 'What is ' + title + '? ' + trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + '.';
  if (isPerson) return 'Who is ' + trimmed + '?';
  return 'What is ' + trimmed + '?';
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
  { name:'ISRO & Space', wikiCat:'Indian_Space_Research_Organisation', topics:[
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
  { name:'Awards & Honours', wikiCat:'Awards_in_India', topics:[
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
  { name:'Disaster Management', wikiCat:'Disaster_management_in_India', topics:[
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
];

// Daily rotation groups
const DAY_GROUPS = [
  [0,1,2,3],       // Sun: Ancient India, Medieval & Modern India, World History, Indian Geography
  [4,5,6,7],       // Mon: World Geography, Polity & Governance, Indian Economy, General Science
  [8,9,10,11],     // Tue: Science & Technology, Art & Culture, Defence & Security, Environment & Ecology
  [12,13,14,15],   // Wed: International Relations, Indian Society, Ethics & Integrity, ISRO & Space
  [16,17,18,19],   // Thu: Sports, Books & Authors, Awards & Honours, Govt Schemes
  [20,21,22,23],   // Fri: Indian States, Important Days, Personalities, Disaster Management
  [24,25,26,27,28,29,30,31,32], // Sat: Business & Economy, RBI & Banking, Indian National Symbols, Agriculture & Food, Health & Medicine, Constitution, Computer & IT, Railways & Transport, Energy & Power
];

async function main() {
  console.log('Loading quiz.json (' + (fs.statSync(QUIZ_PATH).size / 1024 / 1024).toFixed(0) + ' MiB)...');
  let quiz;
  try { quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8')); }
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

  // Determine which categories to process today
  const processAll = process.env.WIKI_FILL_ALL === '1';
  const GROUPS_PER_DAY = parseInt(process.env.WIKI_FILL_GROUPS || '2', 10);
  let activeCategories;
  if (processAll) {
    activeCategories = CATEGORIES;
    console.log('Processing ALL categories (WIKI_FILL_ALL=1)');
  } else {
    const dayIdx = new Date().getDay();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const groupIdxs = [];
    for (let i = 0; i < GROUPS_PER_DAY; i++) {
      groupIdxs.push((dayIdx * GROUPS_PER_DAY + i) % DAY_GROUPS.length);
    }
    const activeIdxs = new Set(groupIdxs.flatMap(gi => DAY_GROUPS[gi]));
    activeCategories = [...activeIdxs].map(i => CATEGORIES[i]);
    console.log('Day: ' + dayNames[dayIdx] + ' — processing ' + activeCategories.length + ' of ' + CATEGORIES.length + ' categories (groups: ' + groupIdxs.join(',') + ')');
    CATEGORIES.forEach((c, i) => {
      if (!activeIdxs.has(i)) console.log('  (skipping: ' + c.name + ')');
    });
  }

  const CONCURRENCY = 2; // Wikipedia rate-limits; 2 concurrent is safe
  for (const cat of activeCategories) {
    console.log('\n=== ' + cat.name + ' ===');
    let allTopics = [...cat.topics];
    if (cat.wikiCat) {
      console.log('  Fetching category members from Category:' + cat.wikiCat + '...');
      const wikiTopics = await fetchCategoryMembers(cat.wikiCat, 150);
      const existing = new Set(allTopics.map(t => t.toLowerCase()));
      const newTopics = wikiTopics.filter(t => !existing.has(t.toLowerCase()));
      if (newTopics.length) {
        console.log('  Auto-discovered ' + newTopics.length + ' topics from Category:' + cat.wikiCat);
        allTopics = allTopics.concat(newTopics.slice(0, 100));
      }
    }
    const articles = await fetchAllTopics(allTopics, CONCURRENCY);

    let added = 0;
    for (const article of articles) {

      const ext = article.extract;
      const title = article.title;
      const desc = article.description;

      // Skip list/table pages — they produce garbled fragments
      if (isListPage(ext)) {
        console.log('  (skipping list page: ' + title + ')');
        continue;
      }

      const allSentences = ext.split('.').filter(s => s.trim().length > 20 && !isBadSentence(s));
      const sentences = allSentences.filter(s => s.trim().length > 25 && !isBadSentence(s));
            // Description-based (1 per article)
      if (desc && desc.length > 5 && desc.length < 200) {
        const q = makeDescriptionQuestion(desc, title);
        if (q.length > 15 && q.length < 200 && pushQ({
          id: cat.name.substring(0,3).toLowerCase() + added,
          type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
          pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
          question: q, answer: title, hint: '',
          fact: paraphrase(getContext(allSentences, title, 3), title),
        })) added++;
      }

      const MAX_PER_ARTICLE = 20;
      let articleQ = 0;
      for (let si = 0; si < sentences.length && articleQ < MAX_PER_ARTICLE; si++) {
        const sent = sentences[si];
        if (sent.length > 260) continue;
        const sentKey = title + '::' + si;
        let sentUsed = false;

        // ▸ Year-based (any year, no trigger word filter)
        if (!sentUsed) {
          const years = sent.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
          if (years && sent.length < 240) {
            const context = sent.replace(years[0], '_____').trim().substring(0, 200);
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
              question: context, answer: years[0], hint: '',
              fact: paraphrase(getContext(allSentences, sent, 3), years[0]),
            })) { added++; articleQ++; sentUsed = true; }
          }
        }

        // ▸ Number-based (%, lakh, crore, million, billion, km, kg)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed) {
          const numMatch = sent.match(/\b(\d+(?:[.,]\d+)?\s*(%|lakh|crore|million|billion|trillion|sq\s*\.?\s*km|km²|km\b|kg|tonnes?|hectares?|megawatts?|kilometres?))/i);
          if (numMatch && sent.length < 240) {
            const context = sent.replace(numMatch[1], '_____').trim().substring(0, 200);
            if (context.length > 25 && pushQ({
              id: cat.name.substring(0,3).toLowerCase() + added + 'n',
              type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
              pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: numMatch[1].trim(), hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), numMatch[1].trim()),
            })) { added++; articleQ++; sentUsed = true; }
          }
        }

        // ▸ Superlative-based (first, largest, highest, oldest, etc.)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed) {
          const supMatch = sent.match(/\b(first|second|largest|highest|oldest|deepest|longest|biggest|tallest|smallest|largest|earliest|latest|closest|farthest|most powerful|most populous|most important)\b/i);
          if (supMatch && sent.length < 240) {
            const numberNearby = sent.match(/\b(\d+(?:[.,]\d+)?)\s*(?=%|million|billion|lakh|crore|km|kg)?/);
            if (numberNearby) {
              const context = sent.replace(numberNearby[1], '_____').trim().substring(0, 200);
              if (context.length > 25 && pushQ({
                id: cat.name.substring(0,3).toLowerCase() + added + 's',
                type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
                pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: numberNearby[1].trim(), hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), numberNearby[1].trim()),
              })) { added++; articleQ++; sentUsed = true; }
            }
          }
        }

        // ▸ Blank-out key term (every sentence)
        if (articleQ < MAX_PER_ARTICLE && !sentUsed) {
          if (new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(sent)) continue;
          const bestTerm = findBestTerm(sent, title);
          if (!bestTerm) continue;
          if (new RegExp('^' + bestTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(sent.trim())) continue;
          const context = sent.replace(bestTerm, '_____').trim().substring(0, 200);
          if (context.length > 25 && context.length < 200 && pushQ({
            id: cat.name.substring(0,3).toLowerCase() + added + 't',
            type: 'fill_blank', category: cat.name, region: '', source: 'Wiki',
            pubDate: new Date().toISOString(), subject: cat.name, subSubject: title, emoji: '',
            question: context, answer: bestTerm, hint: '',
            fact: paraphrase(getContext(allSentences, sent, 3), bestTerm),
          })) { added++; articleQ++; sentUsed = true; }
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

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
      if (attempt < retries - 1 && (err.message.includes('not valid JSON') || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED')) {
        console.log('  (' + (err.code || 'rate limited') + ', waiting 15s...)');
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
  // ───────── Ancient & Medieval India ─────────
  { name:'Ancient India', topics:[
    'History of India','Indus Valley Civilisation','Vedic period','Maurya Empire',
    'Gupta Empire','Chola Empire','Vijayanagara Empire'
  ]},
  // ───────── Medieval & Modern India ─────────
  { name:'Medieval & Modern India', topics:[
    'Delhi Sultanate','Mughal Empire','Maratha Empire','Sikh Empire',
    'British Raj','Indian independence movement','Partition of India','History of the Republic of India'
  ]},
  // ───────── World History ─────────
  { name:'World History', topics:[
    'World history','Ancient Egypt','Ancient Greece','Ancient Rome','French Revolution',
    'Russian Revolution','Industrial Revolution','World War I','World War II','Cold War',
    'Great Depression','Renaissance','Age of Discovery','History of China','History of Japan',
    'Mongol Empire','Ottoman Empire','Decolonization','American Revolution','Nazism',
    'History of the United Nations'
  ]},
  // ───────── Geography of India ─────────
  { name:'Indian Geography', topics:[
    'Geography of India','Climate of India','Rivers of India','Soils of India',
    'Minerals of India','Natural vegetation of India','Agriculture in India',
    'Population of India','Urbanization in India','Transport in India','Irrigation in India',
    'Mountain ranges of India','Natural disasters in India'
  ]},
  // ───────── World Geography ─────────
  { name:'World Geography', topics:[
    'Continent','Climate','Ocean','Atmosphere','Biosphere','Ecosystem','Biome',
    'Plate tectonics','Volcano','Earthquake','Water cycle','Desert','Rainforest',
    'List of countries by population','List of countries by area','Tundra','Grassland',
    'Types of rocks'
  ]},
  // ───────── Indian Polity & Governance ─────────
  { name:'Polity & Governance', topics:[
    'Constitution of India','Fundamental rights in India','Directive principles of India',
    'Politics of India','Election Commission of India','Parliament of India',
    'Supreme Court of India','Panchayati Raj','Local government in India',
    'Comptroller and Auditor General of India','Union Public Service Commission',
    'Right to Information','President of India','Prime Minister of India',
    'Governor (India)','Union Council of Ministers','State governments of India',
    'Tribunals in India','Elections in India','E-government in India'
  ]},
  // ───────── Indian Economy ─────────
  { name:'Indian Economy', topics:[
    'Economy of India','Economic liberalisation in India','Agriculture in India',
    'Five-year plans of India','NITI Aayog','Reserve Bank of India','Banking in India',
    'Poverty in India','Unemployment in India','Foreign trade of India','Taxation in India',
    'Budget of India','Infrastructure of India','Energy in India','Insurance in India',
    'Healthcare in India','Make in India','Startup India','Food security in India',
    'Green Revolution','White Revolution','Land reforms in India','Public distribution system'
  ]},
  // ───────── General Science ─────────
  { name:'General Science', topics:[
    'Physics','Chemistry','Biology','Human body','Genetics','Cell biology',
    'Evolution','Ecology','Nutrition','Disease','Atomic physics','Nuclear physics',
    'Optics','Electricity','Magnetism','Thermodynamics','Periodic table',
    'Acid','Base (chemistry)','Organic chemistry','Inorganic chemistry','Biochemistry',
    'List of inventions','List of scientific discoveries','Microbiology','Immunology'
  ]},
  // ───────── Science & Technology ─────────
  { name:'Science & Technology', topics:[
    'Science and technology in India','Biotechnology','Nanotechnology',
    'Renewable energy in India','Nuclear power in India','Robotics','Artificial intelligence',
    'Information technology in India','Internet in India','Software industry in India',
    'Telecommunications in India','Cybersecurity','Defence industry of India'
  ]},
  // ───────── Art, Culture & Heritage ─────────
  { name:'Art & Culture', topics:[
    'Culture of India','Indian classical music','Indian folk music','Indian dance',
    'Indian painting','Indian sculpture','Indian architecture','Indian theatre',
    'Indian cinema','Indian clothing','Indian cuisine','Indian literature',
    'Festivals in India','Fairs in India','Handicrafts of India',
    'UNESCO Intangible Cultural Heritage','UNESCO World Heritage Sites in India',
    'Languages of India','Religion in India','Indian philosophy'
  ]},
  // ───────── Defence & Internal Security ─────────
  { name:'Defence & Security', topics:[
    'Indian Armed Forces','Indian Army','Indian Navy','Indian Air Force',
    'Indian Coast Guard','Nuclear weapons of India','Defence industry of India',
    'Internal security of India','Terrorism in India',
    'Naxalite–Maoist insurgency','Border security of India',
    'Indian Police Service','Central Armed Police Forces','Paramilitary forces of India',
    'National security of India','Insurgency in Jammu and Kashmir'
  ]},
  // ───────── Environment, Ecology & Climate ─────────
  { name:'Environment & Ecology', topics:[
    'Environment of India','Wildlife of India','Climate change in India',
    'Biodiversity of India','Deforestation in India','Pollution in India',
    'Waste management in India','National parks of India',
    'Biosphere reserves of India','Ramsar sites in India',
    'Wildlife sanctuaries of India','Environmental issues in India',
    'Water pollution in India','Air pollution in India','Forestry in India',
    'Endangered species of India','Conservation in India','Climate change'
  ]},
  // ───────── International Relations ─────────
  { name:'International Relations', topics:[
    'Foreign relations of India','United Nations','SAARC','BRICS','G20',
    'Shanghai Cooperation Organisation','ASEAN','World Trade Organization',
    'International Monetary Fund','World Bank','Non-Aligned Movement',
    'India–United States relations','India–China relations','India–Pakistan relations',
    'India–Russia relations','India–Japan relations','India–Bangladesh relations',
    'India–Nepal relations','India–Sri Lanka relations',
    'South Asia','Indian Ocean','Indian diaspora',
    'Nuclear Suppliers Group','Missile Technology Control Regime',
    'Nuclear disarmament','International Atomic Energy Agency'
  ]},
  // ───────── Indian Society & Social Issues ─────────
  { name:'Indian Society', topics:[
    'Indian society','Caste system in India','Education in India',
    'Demographics of India','Health in India','Women in India',
    'Child labour in India','Human rights in India','Hunger in India',
    'Malnutrition in India','Tribes of India','Religious minorities in India',
    'Poverty in India','Unemployment in India','Slums in India',
    'Social issues in India','Public health in India','Sanitation in India',
    'Gender inequality in India','Dowry system in India','Corruption in India',
    'Midday Meal Scheme','Integrated Child Development Services'
  ]},
  // ───────── Ethics & Integrity ─────────
  { name:'Ethics & Integrity', topics:[
    'Ethics','Moral philosophy','Applied ethics','Business ethics',
    'Medical ethics','Environmental ethics','Corporate governance',
    'Code of conduct','Conflict of interest','Whistleblower','Transparency (behavior)',
    'Accountability','Good governance','Civil service','Public administration',
    'Emotional intelligence','Attitude (psychology)','Aptitude'
  ]},
  // ───────── ISRO, Space & Nuclear ─────────
  { name:'ISRO & Space', topics:[
    'ISRO','Chandrayaan','Mangalyaan','Gaganyaan','Satellite navigation',
    'Space research','Indian Space Research Organisation','List of Indian satellites',
    'Launch vehicles of India','Nuclear power in India','Nuclear programme of India'
  ]},
  // ───────── Sports ─────────
  { name:'Sports', topics:[
    'Sports in India','Cricket in India','Hockey in India','Football in India',
    'Olympic Games','Asian Games','Commonwealth Games','Chess','Badminton','Tennis',
    'Kabbadi','Wrestling in India','Boxing in India','Shooting sports',
    'History of cricket in India','Indian Premier League','Rugby in India',
    'National Games of India','Athletics in India'
  ]},
  // ───────── Books, Authors & Literature ─────────
  { name:'Books & Authors', topics:[
    'Indian literature','Hindi literature','Indian English literature',
    'Sanskrit literature','Tamil literature','Bengali literature',
    'Rabindranath Tagore','Mahatma Gandhi','B. R. Ambedkar','Jawaharlal Nehru',
    'Premchand','Bankim Chandra Chattopadhyay','Kalidasa','Bhagavad Gita',
    'Constitution of India','Indian epic poetry','Vedas','Upanishads','Puranas'
  ]},
  // ───────── Awards & Honours ─────────
  { name:'Awards & Honours', topics:[
    'National awards of India','Bharat Ratna','Padma awards','Sahitya Akademi Award',
    'Jnanpith Award','Dadasaheb Phalke Award','Arjuna Award','Dronacharya Award',
    'Major Dhyan Chand Khel Ratna','Gallantry awards in India',
    'Param Vir Chakra','Ashoka Chakra','Nobel Prize','Booker Prize',
    'Man Booker Prize','Pulitzer Prize','Oscar','Grammy','Academy Awards'
  ]},
  // ───────── Government Schemes ─────────
  { name:'Govt Schemes', topics:[
    'Government of India','MGNREGA','Ayushman Bharat','Swachh Bharat Mission',
    'Digital India','Make in India','Startup India','Skill India',
    'Pradhan Mantri Jan Dhan Yojana','Pradhan Mantri Awas Yojana',
    'Pradhan Mantri Ujjwala Yojana','Pradhan Mantri Fasal Bima Yojana',
    'Pradhan Mantri Kisan Samman Nidhi','National Health Mission',
    'Midday Meal Scheme','Sarva Shiksha Abhiyan','Beti Bachao Beti Padhao',
    'Atal Pension Yojana','Soil Health Card Scheme','National Food Security Act',
    'Direct Benefit Transfer','Goods and Services Tax','Demonetisation'
  ]},
  // ───────── Indian States ─────────
  { name:'Indian States', topics:[
    'States and union territories of India','Maharashtra','Tamil Nadu',
    'Uttar Pradesh','Karnataka','Kerala','Gujarat','Rajasthan','West Bengal',
    'Bihar','Madhya Pradesh','Punjab, India','Haryana','Andhra Pradesh',
    'Telangana','Odisha','Assam','Jharkhand','Chhattisgarh','Uttarakhand',
    'Himachal Pradesh','Jammu and Kashmir (union territory)','Delhi',
    'Goa','Puducherry','Chandigarh','Manipur','Mizoram','Nagaland','Tripura',
    'Meghalaya','Arunachal Pradesh','Sikkim'
  ]},
  // ───────── Important Days ─────────
  { name:'Important Days', topics:[
    'United Nations observances','International days','National days of India',
    'List of International Years','Public holidays in India','Indian calendar'
  ]},
  // ───────── Personaliies ─────────
  { name:'Personalities', topics:[
    'List of Indian leaders','Indian independence activists','Indian scientists',
    'List of Indian philosophers','List of Indian writers','List of Indian poets',
    'List of Indian artists','List of Indian musicians','List of Indian film actors',
    'List of Indian sportspeople','List of Indian inventors',
    'List of Indian businesspeople','List of Indian economists',
    'List of Indian social reformers','List of Indian women',
    'Prime Minister of India','President of India','Chief Minister (India)',
    'Governor (India)','List of Nobel laureates by country'
  ]},
  // ───────── Disaster Management ─────────
  { name:'Disaster Management', topics:[
    'Disaster management in India','National Disaster Management Authority',
    'Floods in India','Cyclones in India','Earthquakes in India',
    'Drought in India','Tsunami','Landslide','Heat wave','Climate change adaptation',
    'Disaster risk reduction','Emergency management'
  ]},
  // ───────── Business & Economy ─────────
  { name:'Business & Economy', topics:[
    'Business in India','Startup India','Make in India','E-commerce in India',
    'Retail in India','Microfinance in India','Small and medium enterprises',
    'Stock exchanges in India','Bombay Stock Exchange','National Stock Exchange of India',
    'Foreign direct investment in India','Outsourcing in India',
    'Multinational corporations in India','Indian rupee','Cryptocurrency in India'
  ]},
  // ───────── RBI & Banking ─────────
  { name:'RBI & Banking', topics:[
    'Reserve Bank of India','Monetary policy of India','Banking in India',
    'National Bank for Agriculture and Rural Development',
    'Securities and Exchange Board of India','Insurance in India',
    'Indian Banking system','Demonetisation','Non-performing asset',
    'Financial inclusion','Digital payment in India','Unified Payments Interface'
  ]},
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

const fs = require('fs');
const path = require('path');
const https = require('https');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

let ID_COUNTER = Date.now();
function makeId() { return 'restore-' + (ID_COUNTER++); }

// ── Wikipedia fetch (same pattern) ──
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'RestoreAndFetch/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON response')); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanText(text) {
  return text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchCategoryArticle(category, maxRetries) {
  maxRetries = maxRetries || 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Build query based on category
      const queries = {
        'Indian History': 'History of India',
        'World History': 'World history',
        'Art & Culture': 'Culture of India',
        'International Relations': 'Foreign relations of India',
        'Polity': 'Politics of India',
        'Geography': 'Geography of India',
        'World Geography': 'World geography',
        'General Science': 'Science',
        'Indian Economy': 'Economy of India',
        'Sports': 'Sports',
        'Environment & Ecology': 'Environment of India',
        'Defence': 'Indian Armed Forces',
        'Constitution': 'Constitution of India',
        'ISRO & Space': 'ISRO',
        'Computer & IT': 'Computer science',
        'Society': 'Indian society',
        'Govt Schemes': 'Government of India',
        'Important Days': 'United Nations observances',
        'State GK': 'States and union territories of India',
        'Personalities': 'List of Indian leaders',
        'Ethics': 'Ethics',
        'Books & Authors': 'Indian literature',
        'Awards': 'National awards of India',
        'Announcements': 'Public policy of India',
        'RBI Press Releases': 'Reserve Bank of India',
        'Business & Economy': 'Business in India',
        'Tech & Science': 'Technology in India',
      };
      const query = queries[category] || category;
      const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
      const data = await fetchJSON(searchUrl);
      const results = (data.query ? data.query.search || [] : []);
      const titles = results.map(r => r.title).filter(t => !t.includes(':') && !t.includes('(disambiguation)') && t.length > 3).slice(0, 2);
      if (titles.length === 0) return null;
      const extUrl = `${WIKI_API}?action=query&prop=extracts|description&explaintext&exlimit=1&exchars=1500&titles=${encodeURIComponent(titles.join('|'))}&format=json`;
      const extData = await fetchJSON(extUrl);
      const pages = extData.query ? extData.query.pages : {};
      const page = Object.values(pages).find(p => p && p.title && !p.missing && (p.extract||'').length > 100);
      if (!page) return null;
      return cleanText(page.extract || '');
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const wait = (attempt + 1) * 6000;
        await delay(wait);
        continue;
      }
      return null;
    }
  }
  return null;
}

// ── Generate Q&A automatically for any subSubject ──
function autoQA(subSubject, category, idx) {
  const clean = subSubject.replace(/\([^)]*\)/g, '').replace(/[&,–]/g, ' ').replace(/\s+/g, ' ').trim();
  // Singularize only safely: strip trailing 's' only if word doesn't end in -ics, -ss, -sis, -us
  const name = /(ics|ss|sis|us|ance|ence|ion|ism|ment)$/i.test(clean) ? clean : clean.replace(/s$/, '');

  const templates = {
    'Art & Culture': [
      'Which of the following best describes ' + name + ' in Indian art and culture?',
      'The term ' + name + ' in Indian culture refers to which of the following?',
      'Which Indian art form is closely associated with ' + name + '?',
      'Who is considered a notable figure in the field of ' + name + ' in India?',
    ],
    'Awards': [
      'Which category does ' + name + ' fall under in the Indian awards system?',
      'Which of the following is associated with ' + name + '?',
      'Which Indian award is given for excellence in ' + name + '?',
      'Who was the first Indian recipient of the ' + name + ' award?',
    ],
    'Books & Authors': [
      'Which of the following is a notable work in the category of ' + name + '?',
      'The term ' + name + ' in literature refers to which of the following?',
      'Which author is best known for their work in ' + name + '?',
      'Which book is considered a classic in the genre of ' + name + '?',
    ],
    'Geography': [
      'Which of the following is a key aspect of ' + name + ' in Indian geography?',
      'The concept of ' + name + ' in geography refers to which of the following?',
      'Which region of India is best known for its ' + name + '?',
      'What is the primary characteristic of ' + name + ' in a geographical context?',
    ],
    'World Geography': [
      'Which of the following is a key aspect of ' + name + ' in world geography?',
      'The concept of ' + name + ' in geography refers to which of the following?',
      'Which continent is most associated with ' + name + '?',
      'What is the primary characteristic of ' + name + ' in a global geographical context?',
    ],
    'Constitution': [
      'Which article or provision of the Indian Constitution deals with ' + name + '?',
      'The ' + name + ' in the Indian Constitution refers to which of the following?',
      'Under which part of the Indian Constitution is ' + name + ' addressed?',
      'Which constitutional amendment is related to ' + name + '?',
    ],
    'Defence': [
      'Which of the following is associated with ' + name + ' in the Indian defence system?',
      'The ' + name + ' plays what role in Indias defence setup?',
      'Which Indian military exercise is related to ' + name + '?',
      'Which organization oversees ' + name + ' in India?',
    ],
    'Environment & Ecology': [
      'Which of the following best describes ' + name + ' in the Indian environmental context?',
      'The term ' + name + ' in ecology refers to which of the following?',
      'Which Indian national park or reserve is known for its ' + name + '?',
      'What is the primary environmental concern related to ' + name + ' in India?',
    ],
    'Polity': [
      'Which of the following best describes ' + name + ' in Indian Polity?',
      'The ' + name + ' in the Indian political system refers to which of the following?',
      'Which article of the Indian Constitution is related to ' + name + '?',
      'Which body or institution handles matters related to ' + name + ' in India?',
    ],
    'General Science': [
      'Which of the following is a fundamental concept in ' + name + '?',
      'The term ' + name + ' in science refers to which of the following?',
      'Which scientist is most associated with the discovery or development of ' + name + '?',
      'What is the practical application of ' + name + ' in everyday life?',
    ],
    'Sports': [
      'Which of the following is associated with ' + name + ' in Indian sports?',
      'Which Indian sportsperson is best known in the field of ' + name + '?',
      'Which international tournament is related to ' + name + '?',
      'Which Indian stadium or venue is associated with ' + name + '?',
    ],
    'Indian Economy': [
      'Which of the following best describes ' + name + ' in the Indian economy?',
      'The term ' + name + ' in economics refers to which of the following?',
      'Which government policy is related to ' + name + ' in India?',
      'What is the impact of ' + name + ' on Indias economic growth?',
    ],
    'International Relations': [
      'Which of the following best describes ' + name + ' in international relations?',
      'The term ' + name + ' in foreign policy refers to which of the following?',
      'Which international organization deals with ' + name + '?',
      'Which country is most associated with ' + name + ' in global affairs?',
    ],
    'ISRO & Space': [
      'Which ISRO mission is associated with ' + name + '?',
      'The term ' + name + ' in space exploration refers to which of the following?',
      'Which Indian satellite is related to ' + name + '?',
      'What is the significance of ' + name + ' in Indias space program?',
    ],
    'Computer & IT': [
      'Which of the following best describes ' + name + ' in computing?',
      'The term ' + name + ' in information technology refers to which of the following?',
      'Which programming language or technology is associated with ' + name + '?',
      'What is the primary use of ' + name + ' in the IT industry?',
    ],
    'Society': [
      'Which of the following best describes ' + name + ' in Indian society?',
      'The term ' + name + ' in a social context refers to which of the following?',
      'Which social reformer worked on issues related to ' + name + ' in India?',
      'Which government scheme addresses ' + name + ' in India?',
    ],
    'Ethics': [
      'Which of the following best describes ' + name + ' in ethics?',
      'The term ' + name + ' in moral philosophy refers to which of the following?',
      'Which philosopher is most associated with the concept of ' + name + '?',
      'What is the practical significance of ' + name + ' in ethical decision-making?',
    ],
    'State GK': [
      'Which Indian state is best known for its ' + name + '?',
      'The ' + name + ' is a key feature of which Indian state?',
      'Which of the following is true about ' + name + ' in India?',
      'What is the significance of ' + name + ' in the context of Indian states?',
    ],
    'Important Days': [
      'On which date is ' + name + ' observed?',
      'The observance of ' + name + ' is associated with which of the following?',
      'Which organization or body is behind the observance of ' + name + '?',
      'What is the theme of ' + name + ' in the current or most recent year?',
    ],
    'Govt Schemes': [
      'Which ministry oversees ' + name + '?',
      'The ' + name + ' scheme is primarily focused on which of the following?',
      'When was ' + name + ' launched in India?',
      'What is the main objective of ' + name + ' scheme?',
    ],
    'Business & Economy': [
      'Which sector does ' + name + ' primarily belong to in India?',
      'The term ' + name + ' in business refers to which of the following?',
      'Which Indian company is a leader in the field of ' + name + '?',
      'What is the economic significance of ' + name + ' in India?',
    ],
    'Tech & Science': [
      'Which of the following best describes ' + name + ' in the context of technology?',
      'The term ' + name + ' in science refers to which of the following?',
      'Which recent Indian innovation is related to ' + name + '?',
      'What is the primary application of ' + name + ' in modern technology?',
    ],
    'Announcements': [
      'Which government ministry made the recent announcement regarding ' + name + '?',
      'The recent announcement about ' + name + ' is related to which of the following?',
      'What is the purpose of the recent government announcement on ' + name + '?',
      'Which budget or policy announcement addressed ' + name + '?',
    ],
    'RBI Press Releases': [
      'What is the key highlight of the recent RBI announcement on ' + name + '?',
      'The RBI directive on ' + name + ' primarily affects which sector?',
      'Which monetary policy tool is related to ' + name + ' as per RBI?',
      'What is the impact of the recent RBI decision on ' + name + '?',
    ],
    'Personalities': [
      'Which field is ' + name + ' most associated with?',
      'The personality ' + name + ' is best known for which of the following?',
      'Which award or recognition was received by ' + name + '?',
      'What is the major contribution of ' + name + ' to Indian society?',
    ],
  };

  const tpls = templates[category];
  if (tpls) {
    const q = tpls[(idx || 0) % tpls.length];
    return [subSubject, category, q, name];
  }

  // Fallback for any category not in templates
  const fallbacks = [
    'What is the significance of ' + name + ' in the context of ' + category + '?',
    'Which of the following best describes ' + name + ' in ' + category + '?',
    'The term ' + name + ' in ' + category + ' refers to which of the following?',
    'What is the primary role of ' + name + ' in ' + category + '?',
  ];
  return [subSubject, category, fallbacks[(idx || 0) % fallbacks.length], name];
}

// ── Hardcoded Q&A data for major categories ──
// Format: [subSubject, category, question, answer]
const QA_DATA = [
  // World History (35)
  ['Ancient Mesopotamia & Egypt', 'World History', 'Which civilization built the Great Pyramid of Giza?', 'Ancient Egyptian'],
  ['Ancient China & Japan', 'World History', 'Which philosophy emphasizing harmony with nature was founded by Laozi?', 'Taoism'],
  ['Ancient Greece & Rome', 'World History', 'Which form of government meaning rule by the people originated in Athens around 508 BCE?', 'Democracy'],
  ['Mesoamerican Civilizations', 'World History', 'Which Mesoamerican civilization is known for its calendar system and the city of Tikal?', 'Maya'],
  ['Central Asian & Steppe Empires', 'World History', 'Which empire founded by Genghis Khan became the largest contiguous land empire in history?', 'Mongol Empire'],
  ['Medieval Europe (Feudalism & Crusades)', 'World History', 'What was the dominant socio-economic system in medieval Europe based on land tenure and loyalty?', 'Feudalism'],
  ['Byzantine & Ottoman Empires', 'World History', 'Which city renamed Istanbul was the capital of the Byzantine and later Ottoman Empire?', 'Constantinople'],
  ['Islamic Golden Age & Caliphates', 'World History', 'Which caliphate centered in Baghdad oversaw the Islamic Golden Age from the 8th to 13th centuries?', 'Abbasid Caliphate'],
  ['Mongol Empire & Pax Mongolica', 'World History', 'What term describes the period of relative peace across Eurasia under Mongol rule?', 'Pax Mongolica'],
  ['Medieval Africa (Ghana–Mali–Songhai)', 'World History', 'Which West African empire ruled by Mansa Musa was famous for its wealth and the city of Timbuktu?', 'Mali Empire'],
  ['Medieval Southeast Asia (Khmer–Srivijaya–Majapahit)', 'World History', 'Which Hindu-Buddhist empire built the temple complex of Angkor Wat in present-day Cambodia?', 'Khmer Empire'],
  ['Renaissance & Reformation', 'World History', 'Which Italian city is considered the birthplace of the Renaissance?', 'Florence'],
  ['Age of Exploration & Colonization', 'World History', 'Which explorer sponsored by Spain reached the Americas in 1492?', 'Christopher Columbus'],
  ['American Revolution (1776)', 'World History', 'Which document adopted on July 4 1776 declared the American colonies independence from Britain?', 'Declaration of Independence'],
  ['French Revolution & Napoleon', 'World History', 'Which fortress-prison was stormed on July 14 1789 marking the start of the French Revolution?', 'Bastille'],
  ['Industrial Revolution & Capitalism', 'World History', 'Which invention patented by James Watt in 1769 was crucial to the Industrial Revolution?', 'Steam engine'],
  ['Nationalism & Unification (Italy–Germany)', 'World History', 'Which Prussian statesman unified Germany through a policy of blood and iron?', 'Otto von Bismarck'],
  ['Imperialism & Scramble for Africa', 'World History', 'Which 1884-85 conference regulated European colonization and trade in Africa?', 'Berlin Conference'],
  ['World War I', 'World History', 'Which event in June 1914 is considered the immediate trigger of World War I?', 'Assassination of Archduke Franz Ferdinand'],
  ['Russian Revolution & Soviet Union', 'World History', 'Which Marxist revolutionary led the October 1917 Bolshevik Revolution in Russia?', 'Vladimir Lenin'],
  ['Interwar Period & Great Depression', 'World History', 'Which 1929 stock market crash triggered the Great Depression worldwide?', 'Wall Street Crash of 1929'],
  ['World War II', 'World History', 'Which 1941 Japanese attack led the United States to enter World War II?', 'Attack on Pearl Harbor'],
  ['Cold War (1947–1991)', 'World History', 'Which US policy announced in 1947 aimed to contain the spread of communism?', 'Truman Doctrine'],
  ['Decolonization & UN System', 'World History', 'Which year is known as the Year of Africa when 17 African nations gained independence?', '1960'],
  ['Post-Cold War World (1991–2001)', 'World History', 'Which 1991 event formally ended the Cold War and the Soviet Union?', 'Dissolution of the Soviet Union'],
  ['War on Terror & Middle East (2001–)', 'World History', 'Which US law passed weeks after 9/11 expanded surveillance and security powers?', 'USA PATRIOT Act'],
  ['Globalization & International Trade', 'World History', 'Which international organization founded in 1995 regulates global trade?', 'World Trade Organization (WTO)'],
  ['Contemporary World Politics', 'World History', 'Which intergovernmental organization founded in 1945 aims to maintain international peace?', 'United Nations (UN)'],
  ['World Economy & Global Crises', 'World History', 'Which 2008 financial crisis was triggered by the collapse of a major US investment bank?', 'Global Financial Crisis'],
  ['Human Rights & International Law', 'World History', 'Which 1948 document proclaimed fundamental human rights to be protected globally?', 'Universal Declaration of Human Rights (UDHR)'],
  ['Nuclear Proliferation & Disarmament', 'World History', 'Which 1968 treaty aims to prevent the spread of nuclear weapons?', 'Treaty on the Non-Proliferation of Nuclear Weapons (NPT)'],
  ['Global Environmental Governance', 'World History', 'Which 2015 international agreement aims to limit global warming to well below 2 degrees Celsius?', 'Paris Agreement'],
  ['Pandemics & Global Health Governance', 'World History', 'Which organization coordinates international responses to health emergencies like COVID-19?', 'World Health Organization (WHO)'],
  ['Cyberspace & Digital Divide', 'World History', 'What term describes the gap between those with access to digital technology and those without?', 'Digital divide'],
  ['Space Race & Global Space Programs', 'World History', 'Which US program first landed humans on the Moon in 1969?', 'Apollo 11'],

  // Indian History (68)
  ['Palaeolithic & Mesolithic India', 'Indian History', 'Which site in Madhya Pradesh is famous for its Palaeolithic cave paintings?', 'Bhimbetka'],
  ['Neolithic & Chalcolithic India', 'Indian History', 'Which Neolithic site in Kashmir is known for evidence of pit dwelling?', 'Burzahom'],
  ['IVC & Harappan', 'Indian History', 'Which Harappan site is known for its Great Bath and granary?', 'Mohenjo-Daro'],
  ['Early Vedic Period', 'Indian History', 'Which river mentioned in the Rigveda as the Sapta Sindhu is considered sacred in early Vedic texts?', 'Saraswati'],
  ['Later Vedic Period', 'Indian History', 'Which philosophical texts attached to the Vedas explore the nature of reality and the self?', 'Upanishads'],
  ['Mahajanapadas & Rise of Magadha', 'Indian History', 'Which of the sixteen Mahajanapadas had its capital at Rajagriha?', 'Magadha'],
  ['Buddhism', 'Indian History', 'Which Buddhist council compiled the Tripitaka?', 'First Buddhist Council'],
  ['Jainism', 'Indian History', 'Who was the first Tirthankara of Jainism?', 'Rishabhanatha'],
  ['Mauryan Empire', 'Indian History', 'Which Greek ambassador visited the court of Chandragupta Maurya?', 'Megasthenes'],
  ['Ashoka & His Edicts', 'Indian History', 'Which style of pillars did Ashoka erect across his empire inscribed with his edicts?', 'Pillars of Ashoka'],
  ['Shunga & Kanva', 'Indian History', 'Which dynasty succeeded the Mauryas in Magadha and ruled from about 185 BCE?', 'Shunga Empire'],
  ['Indo-Greeks, Shakas & Kushans', 'Indian History', 'Which Kushan ruler convened the Fourth Buddhist Council in Kashmir?', 'Kanishka'],
  ['Satavahana Dynasty', 'Indian History', 'Which Satavahana ruler is known for his naval power and captured the island of Ganjam?', 'Gautamiputra Satakarni'],
  ['Sangam Age', 'Indian History', 'Which three kingdoms are celebrated in Sangam Tamil literature?', 'Chera, Chola, and Pandya'],
  ['Gupta Empire', 'Indian History', 'Which Gupta ruler is known as the Napoleon of India for his military conquests?', 'Samudragupta'],
  ['Vakataka & Post-Gupta', 'Indian History', 'Which Vakataka ruler is associated with the patronage of the Ajanta Caves?', 'Harishena'],
  ['Harsha & Vardhanas', 'Indian History', 'Which Chinese Buddhist monk visited Harshas court and left detailed accounts?', 'Xuanzang'],
  ['Pallava Dynasty', 'Indian History', 'Which Pallava ruler built the Shore Temple at Mahabalipuram?', 'Narasimhavarman II'],
  ['Chalukya & Rashtrakuta', 'Indian History', 'Which Rashtrakuta ruler built the Kailasa Temple at Ellora?', 'Krishna I'],
  ['Chola Empire', 'Indian History', 'Which Chola ruler conquered Sri Lanka and built the Brihadeeswarar Temple?', 'Raja Raja Chola I'],
  ['Pala & Sena Kingdoms', 'Indian History', 'Which university in Bihar flourished under the Pala dynasty?', 'Nalanda'],
  ['Rajput Kingdoms (North & West)', 'Indian History', 'Which Rajput ruler defeated Muhammad Ghori in the First Battle of Tarain in 1191?', 'Prithviraj Chauhan'],
  ['Rajput Kingdoms (Central & East)', 'Indian History', 'Which Rajput kingdom in central India is associated with the Paramara dynasty?', 'Malwa'],
  ['Arab Invasions of Sindh', 'Indian History', 'Which Arab general conquered Sindh in 712 CE?', 'Muhammad bin Qasim'],
  ['Ghaznavid & Ghurid Invasions', 'Indian History', 'Which Ghaznavid ruler invaded India 17 times and plundered the Somnath Temple?', 'Mahmud of Ghazni'],
  ['Delhi Sultanate (Slave & Khalji)', 'Indian History', 'Which ruler of the Slave Dynasty built the Qutb Minar?', 'Qutb-ud-din Aibak'],
  ['Delhi Sultanate (Tughlaq, Sayyid & Lodi)', 'Indian History', 'Which Tughlaq ruler transferred his capital from Delhi to Daulatabad?', 'Muhammad bin Tughlaq'],
  ['Vijayanagara Empire', 'Indian History', 'Which battle in 1565 led to the decline of the Vijayanagara Empire?', 'Battle of Talikota'],
  ['Bahmani & Deccan Sultanates', 'Indian History', 'Which Bahmani ruler divided the kingdom into four tarafs or provinces?', 'Ala-ud-din Bahman Shah'],
  ['Bhakti Movement (Alvars & Nayanars)', 'Indian History', 'Which group of 63 Tamil Shaiva saints composed devotional hymns between the 6th and 9th centuries?', 'Nayanars'],
  ['Bhakti Movement (North Indian Saints)', 'Indian History', 'Which 16th century Bhakti saint composed the Ramcharitmanas in Awadhi?', 'Tulsidas'],
  ['Sufi Movement & Orders', 'Indian History', 'Which Sufi order was established in India by Moinuddin Chishti?', 'Chishti Order'],
  ['Sikhism (Guru Period)', 'Indian History', 'Which Guru compiled the Adi Granth the holy scripture of Sikhism?', 'Guru Arjan Dev'],
  ['Sikh Empire (Ranjit Singh)', 'Indian History', 'Which Sikh ruler unified the Punjab and ruled the Sikh Empire from 1801 to 1839?', 'Maharaja Ranjit Singh'],
  ['Mughal Empire (1526–1605)', 'Indian History', 'Which Mughal ruler built the Din-e-Ilahi religion?', 'Akbar'],
  ['Mughal Empire (1605–1707)', 'Indian History', 'Which Mughal ruler built the Taj Mahal?', 'Shah Jahan'],
  ['Mughal Administration & Culture', 'Indian History', 'Which Mughal administrative unit was a province governed by a subadar?', 'Subah'],
  ['Maratha Empire (Shivaji Era)', 'Indian History', 'Which fort was Shivajis birthplace and a key stronghold of the Maratha Empire?', 'Shivneri Fort'],
  ['Maratha Confederacy (Peshwa Era)', 'Indian History', 'Which Maratha Peshwa expanded the empire to its greatest territorial extent?', 'Bajirao I'],
  ['Provincial Kingdoms (Bengal–Gujarat–Kashmir)', 'Indian History', 'Which independent Sultanate ruled Bengal from 1342 to 1576?', 'Bengal Sultanate'],
  ['North-East & Hill Kingdoms', 'Indian History', 'Which Ahom ruler defeated the Mughals at the Battle of Saraighat in 1671?', 'Lachit Borphukan'],
  ['Portuguese & Colonial Beginnings', 'Indian History', 'Which Portuguese explorer reached Calicut India in 1498?', 'Vasco da Gama'],
  ['Dutch, French & Other Europeans', 'Indian History', 'Which French governor-general established French power in India and fought the Carnatic Wars?', 'Joseph Francois Dupleix'],
  ['East India Company (1612–1765)', 'Indian History', 'Which Mughal ruler granted the British East India Company the diwani of Bengal in 1765?', 'Shah Alam II'],
  ['British Expansion & Wars (1765–1857)', 'Indian History', 'Which British Governor-General introduced the Subsidiary Alliance system?', 'Lord Wellesley'],
  ['British Land Revenue & Economic Policy', 'Indian History', 'Which revenue settlement system was introduced by Thomas Munro in Madras Presidency?', 'Ryotwari System'],
  ['British Social, Education & Cultural Policy', 'Indian History', 'Which 1835 educational resolution promoted English education in India?', 'Macaulays Minute'],
  ['Hindu Reform Movements', 'Indian History', 'Which 19th century reform movement founded by Raja Ram Mohan Roy campaigned against sati?', 'Brahmo Samaj'],
  ['Muslim, Sikh & Parsi Reform Movements', 'Indian History', 'Which reformer founded the Aligarh Muslim University?', 'Sir Syed Ahmad Khan'],
  ['Revolt of 1857', 'Indian History', 'Which Mughal emperor was proclaimed the leader of the 1857 revolt?', 'Bahadur Shah Zafar'],
  ['Tribal Movements', 'Indian History', 'Which tribal leader led the Munda rebellion Ulgulan in 1899-1900?', 'Birsa Munda'],
  ['Peasant Movements', 'Indian History', 'Which 1917 peasant movement in Bihar was Gandhis first major satyagraha in India?', 'Champaran Satyagraha'],
  ['Congress (Moderate Phase, 1885–1905)', 'Indian History', 'Who was the first president of the Indian National Congress?', 'Womesh Chunder Bonnerjee'],
  ['Congress (Extremist, Swadeshi & Split, 1905–1915)', 'Indian History', 'Which extremist leader was known as Lokmanya and led the Swadeshi movement?', 'Bal Gangadhar Tilak'],
  ['Revolutionary & Armed Struggle', 'Indian History', 'Which revolutionary threw a bomb in the Central Legislative Assembly in 1929?', 'Bhagat Singh'],
  ['Gandhian Era (1915–1934)', 'Indian History', 'Which 1930 movement involved marching to the sea to make salt?', 'Dandi March'],
  ['Gandhian Era (1935–1947)', 'Indian History', 'Which 1942 movement called for the British to Quit India?', 'Quit India Movement'],
  ['Constitutional Development (1909–1935)', 'Indian History', 'Which 1909 Act introduced separate electorates for Muslims in India?', 'Indian Councils Act 1909'],
  ['Constitutional Development (1935–1947)', 'Indian History', 'Which 1935 Act provided for a federal structure and provincial autonomy in India?', 'Government of India Act 1935'],
  ['Partition & Independence', 'Indian History', 'Which British lawyer chaired the boundary commission that drew the India-Pakistan border?', 'Sir Cyril Radcliffe'],
  ['Integration of Princely States', 'Indian History', 'Which instrument was used by Sardar Patel to integrate princely states into India?', 'Instrument of Accession'],
  ['Nehruvian Era & Planning (1947–1964)', 'Indian History', 'Which five-year plan focused on agriculture and irrigation in India?', 'First Five-Year Plan'],
  ['Reorganization of States', 'Indian History', 'Which 1956 Act reorganized Indian states on linguistic lines?', 'States Reorganisation Act'],
  ['Wars & Foreign Policy (1947–1971)', 'Indian History', 'Which 1971 war resulted in the creation of Bangladesh?', 'Indo-Pakistani War of 1971'],
  ['Wars & Foreign Policy (1971–)', 'Indian History', 'Which 1999 conflict between India and Pakistan took place in the Kargil district?', 'Kargil War'],
  ['Emergency & JP Movement', 'Indian History', 'Which year did India impose a national Emergency?', '1975'],
  ['Economic Reforms (1991)', 'Indian History', 'Which Finance Minister is credited with the 1991 economic reforms in India?', 'Manmohan Singh'],
  ['Nuclear Programme', 'Indian History', 'Which 1998 nuclear tests by India were codenamed Operation Shakti?', 'Pokhran-II'],
  ['Space Programme', 'Indian History', 'Which was Indias first satellite launched in 1975?', 'Aryabhata'],
  ['Contemporary India (1980s–1990s)', 'Indian History', 'Which 1990 agitation demanded implementation of the Mandal Commission recommendations?', 'Mandal Agitation'],
  ['Contemporary India (2000s–)', 'Indian History', 'Which 2001 attack on the Indian Parliament led to increased counter-terrorism measures?', '2001 Parliament attack'],

  // Polity (23)
  ['Constitution Framework & Philosophy', 'Polity', 'Which feature does NOT describe Indias Constitution: Federal Unitary Quasi-federal or Presidential?', 'Presidential'],
  ['Preamble & Basic Structure', 'Polity', 'Which word was added to the Preamble by the 42nd Amendment?', 'Socialist'],
  ['Fundamental Rights', 'Polity', 'Which Article of the Indian Constitution abolishes untouchability?', 'Article 17'],
  ['Directive Principles & Fundamental Duties', 'Polity', 'Which Part of the Indian Constitution contains the Directive Principles of State Policy?', 'Part IV'],
  ['Parliament (Lok Sabha & Rajya Sabha)', 'Polity', 'What is the maximum strength of the Lok Sabha?', '552'],
  ['President & Vice President', 'Polity', 'Who is the constitutional head of the Indian Union?', 'President of India'],
  ['Prime Minister & Council of Ministers', 'Polity', 'Who appoints the Prime Minister of India?', 'President of India'],
  ['Supreme Court & High Courts', 'Polity', 'What is the retirement age of a Supreme Court judge?', '65 years'],
  ['Judicial Review & Activism', 'Polity', 'Which constitutional case established the basic structure doctrine in India?', 'Kesavananda Bharati case (1973)'],
  ['Federal System & Centre–State Relations', 'Polity', 'Which type of federation does India have?', 'Quasi-federal'],
  ['Local Government (Panchayats & Municipalities)', 'Polity', 'Which constitutional amendment gave constitutional status to Panchayati Raj institutions?', '73rd Amendment Act (1992)'],
  ['Election Commission & Electoral Reforms', 'Polity', 'Which body conducts elections to the Parliament and State Legislatures in India?', 'Election Commission of India'],
  ['Union Public Service Commission', 'Polity', 'Which constitutional body advises the President on appointments to civil services?', 'Union Public Service Commission (UPSC)'],
  ['Comptroller & Auditor General', 'Polity', 'Who audits the accounts of the Union and state governments in India?', 'Comptroller and Auditor General (CAG)'],
  ['Attorney General & Advocate General', 'Polity', 'Who is the highest law officer of India?', 'Attorney General of India'],
  ['Special Status (J&K, Article 371)', 'Polity', 'Which article of the Indian Constitution granted special status to Jammu and Kashmir?', 'Article 370'],
  ['Emergency Provisions', 'Polity', 'Under which article can a national emergency be proclaimed in India?', 'Article 352'],
  ['Amendment Process & Major Amendments', 'Polity', 'Which type of majority is required to amend most provisions of the Indian Constitution?', 'Special majority'],
  ['Constitutional Bodies (CAG, EC, UPSC, etc.)', 'Polity', 'Which constitutional body is mentioned in Article 315 of the Constitution?', 'Union Public Service Commission (UPSC)'],
  ['Non-Constitutional Bodies (NITI Aayog, etc.)', 'Polity', 'Which body replaced the Planning Commission in India?', 'NITI Aayog'],
  ['Rights Issues (RTI, PIL, etc.)', 'Polity', 'Which 2005 Act gave Indian citizens the right to access information from public authorities?', 'Right to Information Act (RTI)'],
  ['Political Parties & Pressure Groups', 'Polity', 'Which political party in India is symbolized by the lotus?', 'Bharatiya Janata Party (BJP)'],
  ['Anti-Defection Law & Representation', 'Polity', 'Which Schedule of the Indian Constitution deals with the anti-defection law?', 'Tenth Schedule'],

  // International Relations (25)
  ['India–Pakistan Relations', 'International Relations', 'Which line of control divides Indian and Pakistani administered Kashmir?', 'Line of Control (LoC)'],
  ['India–China Relations', 'International Relations', 'Which disputed region is a major flashpoint between India and China?', 'Arunachal Pradesh'],
  ['India–Nepal–Bhutan Relations', 'International Relations', 'Which river is a source of dispute between India and Nepal?', 'Kalapani'],
  ['India–Bangladesh–Myanmar Relations', 'International Relations', 'Which 2015 agreement between India and Bangladesh resolved their land border dispute?', 'Land Boundary Agreement (LBA)'],
  ['India–Sri Lanka–Maldives Relations', 'International Relations', 'Which maritime boundary between India and Sri Lanka was defined by the 1974 agreement?', 'Palk Strait'],
  ['India–Afghanistan–Iran–Central Asia', 'International Relations', 'Which Indian-built dam in Afghanistan was inaugurated in 2016?', 'Salma Dam'],
  ['India–US Relations', 'International Relations', 'Which 2008 agreement marked a new phase in India-US relations?', 'India-US Civil Nuclear Agreement'],
  ['India–Russia Relations', 'International Relations', 'Which is Indias longest serving strategic partner in defence?', 'Russia'],
  ['India–Europe Relations', 'International Relations', 'Which European Union institution is responsible for foreign affairs?', 'European External Action Service (EEAS)'],
  ['India–Japan–Australia–Indo-Pacific', 'International Relations', 'Which strategic grouping includes India Japan Australia and the US?', 'Quad'],
  ['India–Gulf & West Asia', 'International Relations', 'Which GCC country is Indias largest trading partner in the Gulf region?', 'UAE'],
  ['India–Africa Relations', 'International Relations', 'Which summit forum brings together India and African nations?', 'India-Africa Forum Summit'],
  ['India–ASEAN & East Asia Summit', 'International Relations', 'Which regional organization includes 10 Southeast Asian nations?', 'ASEAN'],
  ['United Nations & Reform', 'International Relations', 'Which organ of the UN is responsible for maintaining international peace and security?', 'Security Council'],
  ['WTO, IMF, World Bank & Bretton Woods', 'International Relations', 'Which international organization founded in 1995 regulates global trade?', 'World Trade Organization (WTO)'],
  ['BRICS, SCO, G20 & Multilateral Forums', 'International Relations', 'Which group of major economies includes Brazil Russia India China and South Africa?', 'BRICS'],
  ['SAARC, BIMSTEC & Regional Organisations', 'International Relations', 'Which regional organization includes India Nepal Bhutan Bangladesh Myanmar Sri Lanka and Thailand?', 'BIMSTEC'],
  ['Nuclear Disarmament & Non-Proliferation', 'International Relations', 'Which international treaty does India refuse to sign citing discrimination?', 'Nuclear Non-Proliferation Treaty (NPT)'],
  ['Climate Change & Global Commons', 'International Relations', 'Which 2015 climate agreement did India ratify?', 'Paris Agreement'],
  ['Terrorism & Global Security', 'International Relations', 'Which UNSC committee monitors sanctions against Al-Qaeda and the Taliban?', 'UNSC 1267 Committee'],
  ['Diaspora & Soft Power', 'International Relations', 'What is Indias diaspora outreach program called?', 'Pravasi Bharatiya Divas'],
  ['Look East / Act East Policy', 'International Relations', 'Which Indian government initiative replaced the Look East Policy in 2014?', 'Act East Policy'],
  ['Neighbourhood First Policy', 'International Relations', 'Which Indian policy prioritizes relations with immediate neighbors?', 'Neighbourhood First'],
  ['Maritime Security & Indian Ocean', 'International Relations', 'Which Indian initiative focuses on maritime security in the Indian Ocean region?', 'SAGAR'],
  ['Border Disputes & Cross-Border Infrastructure', 'International Relations', 'Which India-Bangladesh border fencing project aims to prevent illegal immigration?', 'India-Bangladesh border fencing'],

  // Sports (18)
  ['Olympic Games (Summer & Winter)', 'Sports', 'Which country hosted the 2020 Tokyo Olympics?', 'Japan'],
  ['Commonwealth Games', 'Sports', 'Which Indian city hosted the 2010 Commonwealth Games?', 'Delhi'],
  ['Asian Games & Asian Championships', 'Sports', 'Which country hosted the 2022 Asian Games held in 2023?', 'China (Hangzhou)'],
  ['Cricket (World Cup, T20, IPL)', 'Sports', 'Which year did India win its first Cricket World Cup?', '1983'],
  ['Hockey (World Cup, Olympics)', 'Sports', 'How many Olympic gold medals has India won in mens hockey?', '8'],
  ['Tennis (Grand Slams, Davis Cup)', 'Sports', 'Which Indian tennis player won the 1996 Olympic bronze medal in singles?', 'Leander Paes'],
  ['Football (FIFA World Cup, AFC Cup)', 'Sports', 'Which country has won the most FIFA World Cup titles?', 'Brazil'],
  ['Badminton (Thomas & Uber Cup, World C\'ships)', 'Sports', 'Which Indian shuttler won the silver medal at the 2023 World Badminton Championships?', 'K. Srikanth Kidambi'],
  ['Wrestling (Olympic, World C\'ships)', 'Sports', 'Which Indian wrestler won a bronze medal at the 2020 Tokyo Olympics?', 'Bajrang Punia'],
  ['Boxing (Olympic, World C\'ships)', 'Sports', 'Which Indian boxer won a bronze medal at the 2012 London Olympics?', 'M. C. Mary Kom'],
  ['Athletics (World C\'ships, Diamond League)', 'Sports', 'Which Indian athlete won the gold medal in javelin throw at the 2020 Tokyo Olympics?', 'Neeraj Chopra'],
  ['Shooting (ISSF World C\'ships, Olympics)', 'Sports', 'Which Indian shooter won the gold medal in 10m air rifle at the 2022 ISSF World Championships?', 'Rudrankksh Patil'],
  ['Chess (World Championship, Olympiad)', 'Sports', 'Which Indian chess grandmaster became the youngest undisputed World Chess Champion?', 'Gukesh Dommaraju'],
  ['Kabaddi (World Cup, Pro Kabaddi)', 'Sports', 'Which Indian team has won the most Pro Kabaddi League titles?', 'Patna Pirates'],
  ['National Games & Domestic Sports', 'Sports', 'Which Indian state hosted the 38th National Games in 2023?', 'Goa'],
  ['Sports Awards (Rajiv Gandhi Khel Ratna, Arjuna)', 'Sports', 'Which is Indias highest sports honor?', 'Major Dhyan Chand Khel Ratna Award'],
  ['Sports Policy & Governance', 'Sports', 'Which Indian government program promotes sports at the grassroots level?', 'Khelo India'],
  ['E-Sports & Emerging Sports', 'Sports', 'Which year did e-sports receive official recognition as a sport in India?', '2022'],
];

// ── Main ──
async function main() {
  const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const existingQuestions = new Set(quiz.questions.map(q => q.question.replace(/\s+/g, ' ').trim().toLowerCase()));
  const bucketCount = {};
  quiz.questions.filter(q => q.subSubject).forEach(q => { const k = q.category + '||' + q.subSubject; bucketCount[k] = (bucketCount[k] || 0) + 1; });

  // Auto-detect: default to max existing count + 1 (always adds one more per bucket)
  const argVal = process.argv.find(a => a.startsWith('--fill-multiple='));
  const fillMultiple = argVal ? parseInt(argVal.split('=')[1], 10) : (Math.max(0, ...Object.values(bucketCount)) + 1);

  // Fetch Wikipedia explanations per category (ALL 27 SUB_TAX categories)
  const allCats = ['Indian History','World History','Art & Culture','Polity','Indian Economy','Geography','World Geography','General Science','Defence','Environment & Ecology','International Relations','Constitution','ISRO & Space','Computer & IT','Sports','Society','State GK','Books & Authors','Important Days','Govt Schemes','Awards','Business & Economy','Tech & Science','Ethics','Announcements','RBI Press Releases','Personalities'];
  const categoryFacts = {};

  console.log('Target: ' + fillMultiple + ' per bucket. Fetching Wikipedia articles for ' + allCats.length + ' categories...');
  for (let i = 0; i < allCats.length; i++) {
    const cat = allCats[i];
    process.stdout.write('[' + (i+1) + '/' + allCats.length + '] ' + cat + '... ');
    const extract = await fetchCategoryArticle(cat);
    if (extract) {
      categoryFacts[cat] = extract;
      console.log('OK (' + extract.length + ' chars)');
    } else {
      console.log('SKIP (no article)');
    }
    await delay(3000); // 3s between categories
  }

  // Now add questions for subSubjects that are still empty
  let added = 0;
  let skipped = 0;

  // Read SUB_TAX
  const buildCode = fs.readFileSync(path.join(__dirname, 'build-archive.js'), 'utf8');
  const subTaxMatch = buildCode.match(/const SUB_TAX\s*=\s*({[\s\S]*?});\s*(?:\/\/|const CAT_MAP|function classifySub)/);
  const SUB_TAX = subTaxMatch ? eval('(' + subTaxMatch[1] + ')') : {};

  // Collect all (subSubject, category) pairs from QA_DATA + SUB_TAX
  const allPairs = [];
  // From QA_DATA
  for (const [subSubject, category] of QA_DATA) {
    allPairs.push([subSubject, category, category + '||' + subSubject]);
  }
  // From SUB_TAX (avoid duplicates)
  const pairKeys = new Set(allPairs.map(p => p[2]));
  for (const [cat, ssList] of Object.entries(SUB_TAX)) {
    for (const ss of ssList) {
      const key = cat + '||' + ss;
      if (!pairKeys.has(key)) {
        allPairs.push([ss, cat, key]);
        pairKeys.add(key);
      }
    }
  }

  // Fill each bucket up to fillMultiple
  for (const [subSubject, category, key] of allPairs) {
    const existing = bucketCount[key] || 0;
    const needed = fillMultiple - existing;
    if (needed <= 0) { skipped += existing; continue; }

    // Try QA_DATA first
    const qaEntries = QA_DATA.filter(d => d[1] === category && d[0] === subSubject);
    const candidateQA = [...qaEntries];
    const addedForBucket = 0;

    // Use QA_DATA entries
    for (const [, , question, answer] of candidateQA) {
      if (addedForBucket >= needed) break;
      const norm = question.replace(/\s+/g, ' ').trim().toLowerCase();
      if (existingQuestions.has(norm)) continue;
      const fact = categoryFacts[category] || '';
      quiz.questions.push({
        id: makeId(), type: 'fill_blank', category, region: '', source: 'Restored',
        pubDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        subject: category, subSubject, emoji: '', question, answer, hint: '',
        fact: fact.substring(0, 1200),
      });
      existingQuestions.add(norm);
      bucketCount[key] = (bucketCount[key] || 0) + 1;
      added++;
    }

    // Fill remaining via autoQA — pass index for template variety
    const alreadyAdded = bucketCount[key] || 0;
    const stillNeeded = fillMultiple - alreadyAdded;
    for (let i = 0; i < stillNeeded; i++) {
      const [, , question, answer] = autoQA(subSubject, category, i);
      const norm = question.replace(/\s+/g, ' ').trim().toLowerCase();
      if (existingQuestions.has(norm)) { skipped++; continue; }
      const fact = categoryFacts[category] || '';
      quiz.questions.push({
        id: makeId(), type: 'fill_blank', category, region: '', source: 'Restored',
        pubDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        subject: category, subSubject, emoji: '', question, answer, hint: '',
        fact: fact.substring(0, 1200),
      });
      existingQuestions.add(norm);
      bucketCount[key] = (bucketCount[key] || 0) + 1;
      added++;
    }
  }

  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
  const emptyCount = Object.keys(SUB_TAX).reduce((sum, cat) => sum + SUB_TAX[cat].filter(ss => (bucketCount[cat+'||'+ss]||0) < 1).length, 0);
  console.log('\nDone. Added: ' + added + ', Skipped: ' + skipped + ', Total: ' + quiz.questions.length + ', Empty buckets: ' + emptyCount);
}

main().catch(err => { console.error(err); process.exit(1); });

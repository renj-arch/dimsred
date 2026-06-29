const fs = require('fs');
const https = require('https');
const path = require('path');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const QUESTIONS_DIR = path.join(__dirname, '..', 'questions');
const BUILD_SCRIPT = path.join(__dirname, 'build-archive.js');

// ── Broad per-category Wikipedia search queries ──
// Each category can have multiple queries (comma-separated) to get diverse articles
const CAT_QUERIES = {
  'Indian History': 'History of India,Indian independence movement,Ancient India,Medieval India,Mughal Empire,Maratha Empire,British Raj,Gupta Empire,Chola dynasty,Vijayanagara Empire,Delhi Sultanate,Harsha,Pallava dynasty,Bhakti movement,Sikhism,Indo-Greek,Sangam period',
  'World History': 'World history,Ancient civilization,World war,Industrial Revolution,Cold War,Renaissance,Byzantine Empire,Ottoman Empire,Mongol Empire,Age of Exploration,Decolonization,World War I,World War II,Islamic Golden Age,Human rights,Mongol Empire',
  'Art & Culture': 'Culture of India,Indian classical music,Indian dance,Indian architecture,UNESCO India',
  Polity: 'Politics of India,Indian constitution,Indian government,Election India,Supreme Court India',
  'Indian Economy': 'Economy of India,Indian budget,RBI,Indian banking,GST India,Make in India',
  Geography: 'Geography of India,Climate of India,Indian monsoon,Rivers of India,Soil India',
  'World Geography': 'World geography,Continent,Country capital,Mountain range,Desert',
  'General Science': 'Science and technology in India,Physics,Chemistry,Biology,Biotechnology Indian',
  Defence: 'Indian Armed Forces,Indian Army,Indian Navy,Indian Air Force,DRDO,Defence India',
  'Environment & Ecology': 'Environment of India,National park India,Wildlife India,Climate change India,Pollution India',
  'International Relations': 'Foreign relations of India,India Pakistan,India China,India United States,SAARC,BRICS',
  Constitution: 'Constitution of India,Fundamental rights India,Indian federalism,Constitutional amendment India',
  'ISRO & Space': 'ISRO,Indian space research,Chandrayaan,Mangalyaan,Gaganyaan,PSLV',
  'Computer & IT': 'Information technology in India,Cybersecurity India,Artificial intelligence India,Software India',
  Sports: 'Sports in India,Indian cricket,Indian hockey,Indian Olympic,Chess India,Kabaddi',
  Society: 'Caste system in India,Indian society,Social issues India,Demographics India',
  Personalities: 'List of Indian scientists,Indian freedom fighters,Indian authors,Indian business tycoons',
  'State GK': 'States and union territories of India,Indian state government,State symbols India',
  'Books & Authors': 'Indian literature,Indian author,Booker prize India,Jnanpith award,Sahitya Akademi',
  'Important Days': 'Public holidays in India,United Nations days,National days India',
  'Govt Schemes': 'Government schemes in India,Central government schemes,Welfare schemes India',
  Awards: 'National awards of India,Nobel prize India,Oscar India,Padma awards,Bharat Ratna',
  'Business & Economy': 'Business process outsourcing in India,Indian startup,Stock market India,Indian unicorn',
  'Tech & Science': 'Science and technology in India,Indian scientists,Indian research,Indian innovation',
  Ethics: 'Ethics,Ethical theory,Applied ethics,Business ethics,Medical ethics',
  Announcements: 'Union budget of India,Government of India announcement,Cabinet decision India',
  'RBI Press Releases': 'Reserve Bank of India,RBI monetary policy,Indian banking regulation',
};

// ── Sub-subject keyword matchers (compact) ──
// For each sub-subject, a list of keywords/phrases to match against article titles + extracts
const SUB_KEYWORDS = {
  'Indian History': {
    'Palaeolithic & Mesolithic India': ['palaeolithic', 'paleolithic', 'mesolithic', 'bhimbetka', 'stone age', 'microlith', 'soan'],
    'Neolithic & Chalcolithic India': ['neolithic', 'chalcolithic', 'mehrgarh', 'burzahom', 'copper age', 'megalith'],
    'IVC & Harappan': ['indus valley', 'harappa', 'mohenjo', 'daro', 'sindhu', 'saraswati', 'dholavira', 'lothal'],
    'Early Vedic Period': ['rigveda', 'rig veda', 'sapta sindhu', 'early vedic', 'ashvamedha', 'soma'],
    'Later Vedic Period': ['later vedic', 'yajur', 'samaveda', 'atharva', 'upanishad', 'brahmana'],
    'Mahajanapadas & Rise of Magadha': ['mahajanapada', 'magadha', 'bimbisara', 'ajatashatru', 'nanda'],
    'Buddhism': ['buddha', 'buddhism', 'buddhist', 'sangha', 'tripitaka', 'stupa', 'nalanda'],
    'Jainism': ['jain', 'jaina', 'mahavira', 'tirthankara', 'digambara', 'sallekhana'],
    'Mauryan Empire': ['maurya', 'chandragupta maurya', 'chanakya', 'kautilya', 'arthashastra', 'bindusara'],
    'Ashoka & His Edicts': ['ashoka', 'kalinga', 'dhamma', 'edict', 'pillar', 'lion capital'],
    'Shunga & Kanva': ['shunga', 'pushyamitra', 'kanva', 'besnagar'],
    'Indo-Greeks, Shakas & Kushans': ['indo-greek', 'menander', 'shaka', 'kushan', 'kanishka', 'gandhara'],
    'Satavahana Dynasty': ['satavahana', 'simuka', 'satakarni', 'gautamiputra'],
    'Sangam Age': ['sangam', 'muvendar', 'cheran', 'karikala', 'silappadikaram', 'tamilakam'],
    'Gupta Empire': ['gupta empire', 'samudragupta', 'chandragupta vikramaditya', 'prayag prashasti', 'kalidas'],
    'Vakataka & Post-Gupta': ['vakataka', 'ajanta cave', 'post-gupta', 'mihirakula', 'hun'],
    'Harsha & Vardhanas': ['harsha', 'vardhana', 'pushyabhuti', 'banabhatta', 'xuanzang', 'kannauj'],
    'Pallava Dynasty': ['pallava', 'mahendravarman', 'mahabalipuram', 'pancha ratha', 'shore temple'],
    'Chalukya & Rashtrakuta': ['chalukya', 'pulakeshin', 'badami', 'kailasa temple', 'ellora', 'rashtrakuta'],
    'Chola Empire': ['chola', 'rajendra', 'rajaraja', 'brihadeeswarar', 'thanjavur'],
    'Pala & Sena Kingdoms': ['pala empire', 'dharmapala', 'devapala', 'vikramashila', 'sena'],
    'Rajput Kingdoms (North & West)': ['prithviraj', 'chauhan', 'rana sanga', 'rana pratap', 'sisodia', 'mewar', 'solanki'],
    'Rajput Kingdoms (Central & East)': ['paramara', 'bhoj', 'chandela', 'khajuraho', 'gahadavala', 'bundela'],
    'Arab Invasions of Sindh': ['muhammad bin qasim', 'debal', 'sindh', 'raja dahir'],
    'Ghaznavid & Ghurid Invasions': ['ghaznavid', 'mahmud ghazni', 'ghurid', 'muhammad ghori'],
    'Delhi Sultanate (Slave & Khalji)': ['slave dynasty', 'mamluk', 'ilitutmish', 'razia', 'balban', 'khalji', 'alauddin'],
    'Delhi Sultanate (Tughlaq, Sayyid & Lodi)': ['tughlaq', 'muhammad bin tughlaq', 'firuz shah', 'sayyid', 'lodi', 'ibrahim lodi'],
    'Vijayanagara Empire': ['vijayanagara', 'krishnadevaraya', 'hampi', 'talikota'],
    'Bahmani & Deccan Sultanates': ['bahmani', 'golconda', 'bijapur', 'deccan sultanate', 'ahmadnagar'],
    'Bhakti Movement (Alvars & Nayanars)': ['bhakti', 'alvar', 'nayanar', 'divya prabandha', 'ramanuja'],
    'Bhakti Movement (North Indian Saints)': ['kabir', 'namdev', 'mira bai', 'surdas', 'tulsidas', 'chaitanya', 'tukaram'],
    'Sufi Movement & Orders': ['sufi', 'chishti', 'nizamuddin aulia', 'moinuddin', 'silsila', 'khanqah'],
    'Sikhism (Guru Period)': ['guru nanak', 'guru angad', 'guru arjan', 'guru gobind', 'sikh', 'khalsa', 'amritsar'],
    'Sikh Empire (Ranjit Singh)': ['ranjit singh', 'sikh empire', 'anglo-sikh'],
    'Mughal Empire (1526–1605)': ['babur', 'humayun', 'akbar', 'mughal empire', 'panipat', 'fatehpur sikri'],
    'Mughal Empire (1605–1707)': ['jahangir', 'shah jahan', 'aurangzeb', 'taj mahal', 'dara shikoh'],
    'Mughal Administration & Culture': ['mansabdar', 'jagir', 'mughal administration', 'mughal culture', 'mughal architecture'],
    'Maratha Empire (Shivaji Era)': ['shivaji', 'maratha', 'raigarh', 'swarajya', 'bhonsle'],
    'Maratha Confederacy (Peshwa Era)': ['peshwa', 'baji rao', 'panipat', 'maratha confederacy', 'scindia', 'holkar'],
    'Provincial Kingdoms (Bengal–Gujarat–Kashmir)': ['bengal sultanate', 'gujarat sultanate', 'kashmir sultanate', 'zain ul abidin', 'sharqi'],
    'North-East & Hill Kingdoms': ['ahom', 'sukapha', 'lachit', 'kamarupa', 'manipur', 'sikkim', 'sutiya'],
    'Portuguese & Colonial Beginnings': ['portuguese india', 'vasco da gama', 'alfonso albuquerque', 'goa'],
    'Dutch, French & Other Europeans': ['dutch india', 'french india', 'pondicherry', 'dupleix', 'carnatic war'],
    'East India Company (1612–1765)': ['east india company', 'plassey', 'buxar', 'clive', 'presidency'],
    'British Expansion & Wars (1765–1857)': ['british expansion', 'anglo-mysore', 'subsidiary alliance', 'doctrine lapse', 'warren hastings'],
    'British Land Revenue & Economic Policy': ['permanent settlement', 'ryotwari', 'mahalwari', 'drain theory'],
    'British Social, Education & Cultural Policy': ['macaulay', 'wood despatch', 'sati abolition', 'widow remarriage', 'brahmo samaj'],
    'Hindu Reform Movements': ['brahmo samaj', 'aryan samaj', 'ramakrishna', 'vivekananda', 'dayanand', 'theosophical'],
    'Muslim, Sikh & Parsi Reform Movements': ['aligarh', 'sir syed', 'deoband', 'faraizi', 'akali', 'rahnumai'],
    'Revolt of 1857': ['1857', 'sepoy', 'mangal pandey', 'nana saheb', 'tantia tope', 'jhansi ki rani'],
    'Tribal Movements': ['santhal', 'munda', 'birsa munda', 'tribal revolt', 'naxal', 'bhil'],
    'Peasant Movements': ['champaran', 'indigo', 'deccan riot', 'tebhaga', 'bardoli', 'kheda', 'kisan'],
    'Congress (Moderate Phase, 1885–1905)': ['indian national congress moderate', 'a o hume', 'naoroji', 'gokhale', 'surendranath'],
    'Congress (Extremist, Swadeshi & Split, 1905–1915)': ['extremist', 'swadeshi', 'tilak', 'bengal partition 1905', 'surat split'],
    'Revolutionary & Armed Struggle': ['bhagat singh', 'chandrashekhar azad', 'revolutionary', 'hindi republican', 'kakori', 'savarkar'],
    'Gandhian Era (1915–1934)': ['gandhi', 'satyagraha', 'non cooperation', 'dandi march', 'jallianwala', 'rowlatt', 'khilafat'],
    'Gandhian Era (1935–1947)': ['quit india', '1942', 'cripps', 'subhas chandra bose', 'ina', 'azad hind'],
    'Constitutional Development (1909–1935)': ['morley minto', 'montagu chelmsford', 'simon commission', 'nehru report', 'round table conference'],
    'Constitutional Development (1935–1947)': ['government of india act 1935', 'cabinet mission', 'wavell plan', 'independence act'],
    'Partition & Independence': ['partition of india', 'independence 1947', 'radcliffe line', 'mountbatten'],
    'Integration of Princely States': ['integration of princely states', 'sardar patel', 'instrument accession', 'operation polo', 'hyderabad'],
    'Nehruvian Era & Planning (1947–1964)': ['nehru', 'five year plan', 'planning commission', 'panchsheel', 'non alignment', 'green revolution'],
    'Reorganization of States': ['states reorganization', 'linguistic states', 'andhra 1953', 'sarkaria'],
    'Wars & Foreign Policy (1947–1971)': ['indo pak war', '1962 sino', '1965 war', '1971 war', 'simla agreement', 'tashkent'],
    'Wars & Foreign Policy (1971–)': ['kargil', 'siachen', 'surgical strike', 'pokhran', 'nuclear doctrine', 'look east', 'act east'],
    'Emergency & JP Movement': ['emergency 1975', 'jp movement', 'jayaprakash narayan', 'janata party'],
    'Economic Reforms (1991)': ['1991 economic reforms', 'liberalization', 'lpg', 'manmohan singh', 'privatization'],
    'Nuclear Programme': ['pokhran', 'nuclear test', 'smiling buddha', 'operation shakti', 'drdo'],
    'Space Programme': ['isro', 'chandrayaan', 'mangalyaan', 'gaganyaan', 'pslv', 'gslv'],
    'Contemporary India (1980s–1990s)': ['mandal commission', 'babri masjid', '1984 riots', 'assam accord', 'rajiv gandhi'],
    'Contemporary India (2000s–)': ['demonetization', 'gst', 'aadhaar', 'caa', 'nrc', 'ayodhya temple', 'article 370'],
  },
  'World History': {
    'Ancient Mesopotamia & Egypt': ['mesopotamia', 'sumer', 'babylon', 'assyria', 'ancient egypt', 'pharaoh', 'pyramid', 'nile'],
    'Ancient China & Japan': ['ancient china', 'shang dynasty', 'qin', 'sil road', 'ancient japan', 'shogun', 'samurai', 'meiji'],
    'Ancient Greece & Rome': ['ancient greece', 'athens', 'sparta', 'alexander great', 'roman empire', 'julius caesar', 'colosseum'],
    'Mesoamerican Civilizations': ['maya', 'aztec', 'inca', 'olmec', 'teotihuacan', 'machu picchu'],
    'Central Asian & Steppe Empires': ['steppe empire', 'mongol', 'scythian', 'seljuk', 'timur', 'golden horde'],
    'Medieval Europe (Feudalism & Crusades)': ['feudalism', 'medieval europe', 'crusade', 'manor', 'serf', 'magna carta', 'charlemagne'],
    'Byzantine & Ottoman Empires': ['byzantine', 'constantinople', 'hagia sophia', 'ottoman', 'suleiman', 'janissary'],
    'Islamic Golden Age & Caliphates': ['caliphate', 'umayyad', 'abbasid', 'islamic golden age', 'house wisdom', 'ibn sina'],
    'Mongol Empire & Pax Mongolica': ['mongol empire', 'genghis khan', 'kublai khan', 'pax mongolica', 'yuan dynasty'],
    'Medieval Africa (Ghana–Mali–Songhai)': ['ghana empire', 'mali empire', 'songhai', 'mansa musa', 'timbuktu'],
    'Medieval Southeast Asia (Khmer–Srivijaya–Majapahit)': ['khmer', 'angkor wat', 'srivijaya', 'majapahit', 'ayutthaya'],
    'Renaissance & Reformation': ['renaissance', 'medici', 'da vinci', 'michelangelo', 'protestant', 'luther', 'calvin', 'shakespeare'],
    'Age of Exploration & Colonization': ['age exploration', 'columbus', 'magellan', 'conquistador', 'columbian exchange'],
    'American Revolution (1776)': ['american revolution', 'declaration independence', 'george washington', 'thomas jefferson'],
    'French Revolution & Napoleon': ['french revolution', 'napoleon', 'reign terror', 'robespierre', 'bastille'],
    'Industrial Revolution & Capitalism': ['industrial revolution', 'steam engine', 'factory', 'capitalism', 'adam smith', 'karl marx'],
    'Nationalism & Unification (Italy–Germany)': ['unification', 'garibaldi', 'bismarck', 'risorgimento', 'italy unification', 'german unification'],
    'Imperialism & Scramble for Africa': ['imperialism', 'scramble africa', 'berlin conference', 'colonization'],
    'World War I': ['world war I', 'great war', 'trench warfare', 'allied powers', 'treaty versailles'],
    'Russian Revolution & Soviet Union': ['russian revolution', 'lenin', 'stalin', 'soviet union', 'gulag', 'collectivization', 'cold war'],
    'Interwar Period & Great Depression': ['great depression', 'interwar', 'new deal', 'fdr', 'nazi', 'fascist'],
    'World War II': ['world war II', 'holocaust', 'd-day', 'pearl harbor', 'atomic bomb', 'nuremberg'],
    'Cold War (1947–1991)': ['cold war', 'nato', 'warsaw pact', 'berlin wall', 'cuban missile', 'vietnam war', 'détente'],
    'Decolonization & UN System': ['decolonization', 'united nations', 'bandung conference', 'non aligned'],
    'Post-Cold War World (1991–2001)': ['post cold war', 'gulf war', 'yugoslavia war', 'rwanda genocide'],
    'War on Terror & Middle East (2001–)': ['war on terror', 'al qaeda', 'iraq war', 'afghanistan war', 'isis', 'arab spring'],
    'Globalization & International Trade': ['globalization', 'wto', 'free trade', 'fdi', 'brexit', 'trade war'],
    'Contemporary World Politics': ['contemporary world politics', 'g7', 'g20', 'brics', 'multilateral'],
    'World Economy & Global Crises': ['world economy', 'global financial crisis', 'inflation', 'recession', 'imf', 'world bank'],
    'Human Rights & International Law': ['human rights', 'international law', 'geneva convention', 'icc', 'war crime'],
    'Nuclear Proliferation & Disarmament': ['nuclear proliferation', 'npt', 'ctbt', 'disarmament', 'iaea'],
    'Global Environmental Governance': ['climate change', 'paris agreement', 'kyoto protocol', 'unfccc', 'ipcc'],
    'Pandemics & Global Health Governance': ['pandemic', 'who', 'covid', 'global health', 'vaccine', 'ebola'],
    'Cyberspace & Digital Divide': ['cyber security', 'internet governance', 'digital divide', 'data privacy'],
    'Space Race & Global Space Programs': ['space race', 'nasa', 'apollo', 'iss', 'spacex', 'artemis'],
  },
  'Art & Culture': {
    'Classical Dance': ['classical dance', 'bharatanatyam', 'kathak', 'kathakali', 'kuchipudi', 'odissi', 'manipuri', 'mohiniyattam', 'sattriya'],
    'Music': ['indian music', 'hindustani', 'carnatic', 'raga', 't tabla', 'sitar', 'sarode', 'veena'],
    'Paintings & Sculpture': ['indian painting', 'madhubani', 'warli', 'pattachitra', 'ajanta painting', 'miniature'],
    'Architecture': ['indian architecture', 'indo islamic', 'nagara', 'dravida', 'stupa', 'temple architecture'],
    'UNESCO Sites': ['unesco world heritage', 'unesco site india'],
    'Fairs & Festivals': ['indian festival', 'diwali', 'holi', 'eid', 'pongal', 'durga puja', 'fair india'],
    'Language & Literature': ['indian language', 'sanskrit', 'tamil', 'hindi', 'bengali', 'indian literature', 'veda', 'epic'],
  },
  Polity: {
    'Constitution Framework & Philosophy': ['constitution founding', 'constituent assembly', 'constitution making', 'philosophy constitution'],
    'Preamble & Basic Structure': ['preamble constitution', 'basic structure', 'kesavananda bharati'],
    'Fundamental Rights': ['fundamental right', 'article 14', 'right equality', 'right freedom', 'right life', 'writ'],
    'Directive Principles & Fundamental Duties': ['directive principle', 'dpsp', 'uniform civil code', 'fundamental duty'],
    'Parliament (Lok Sabha & Rajya Sabha)': ['parliament', 'lok sabha', 'rajya sabha', 'speaker', 'bill', 'session'],
    'President & Vice President': ['president india', 'vice president', 'president election', 'impeachment'],
    'Prime Minister & Council of Ministers': ['prime minister india', 'council minister', 'cabinet', 'collective responsibility'],
    'Supreme Court & High Courts': ['supreme court india', 'high court', 'chief justice', 'collegium', 'judicial review'],
    'Judicial Review & Activism': ['judicial review', 'judicial activism', 'pil', 'public interest'],
    'Federal System & Centre–State Relations': ['federal system', 'centre state relation', 'union list', 'state list', 'sarkaria'],
    'Local Government (Panchayats & Municipalities)': ['panchayati raj', 'municipality', 'local government', '73rd amendment', '74th'],
    'Election Commission & Electoral Reforms': ['election commission', 'electoral reform', 'model code', 'evm', 'voter id'],
    'Union Public Service Commission': ['upsc', 'union public service', 'civil service', 'ias', 'ips'],
    'Comptroller & Auditor General': ['cag', 'comptroller auditor', 'audit india'],
    'Attorney General & Advocate General': ['attorney general', 'advocate general', 'law officer'],
    'Special Status (J&K, Article 371)': ['article 370', 'jammu kashmir special status', 'article 371'],
    'Emergency Provisions': ['emergency provision', 'national emergency', 'president rule', 'article 356'],
    'Amendment Process & Major Amendments': ['constitutional amendment', '42nd amendment', '44th amendment', '73rd amendment'],
    'Constitutional Bodies (CAG, EC, UPSC, etc.)': ['constitutional body', 'election commission', 'finance commission', 'upsc', 'cag'],
    'Non-Constitutional Bodies (NITI Aayog, etc.)': ['niti aayog', 'nhrc', 'cbi', 'sebi', 'trai', 'rbi'],
    'Rights Issues (RTI, PIL, etc.)': ['right information', 'rti', 'right education', 'right health', 'consumer right'],
    'Political Parties & Pressure Groups': ['political party india', 'bjp', 'congress', 'national party', 'pressure group'],
    'Anti-Defection Law & Representation': ['anti defection', 'tenth schedule', 'disqualification', 'representation people'],
  },
  'Indian Economy': {
    'National Income & GDP': ['national income', 'gdp', 'gnp', 'gdp growth', 'economic growth'],
    'Budget & Taxation': ['union budget', 'fiscal deficit', 'taxation', 'gst', 'direct tax', 'indirect tax'],
    'Banking & Finance': ['banking', 'rbi', 'commercial bank', 'nbftc', 'payment bank', 'financial inclusion'],
    'Inflation & Monetary Policy': ['inflation', 'monetary policy', 'repo rate', 'cpi', 'wpi', 'mpc'],
    'Agriculture & Food Security': ['indian agriculture', 'crop', 'food security', 'green revolution', 'irrigation'],
    'Industry & Services': ['indian industry', 'manufacturing', 'service sector', 'make india', 'msme'],
    'External Sector & Trade': ['export', 'import', 'foreign trade', 'fdi', 'current account', 'balance payment'],
    'Economic Reforms': ['economic reform', 'liberalization', 'privatization', 'globalization', '1991'],
  },
  Geography: {
    'Physical Geography': ['physical geography india', 'himalaya', 'peninsular plateau', 'coastal plain', 'desert'],
    'Climate & Monsoon': ['climate india', 'monsoon', 'southwest monsoon', 'retreating monsoon', 'el nino'],
    'Soils & Agriculture': ['soil india', 'alluvial soil', 'black soil', 'red soil', 'crop pattern'],
    'Natural Vegetation': ['forest india', 'tropical forest', 'mangrove', 'vegetation', 'national park'],
    'Mineral & Energy Resources': ['mineral india', 'coal', 'petroleum', 'iron ore', 'energy resource'],
    'Human & Economic Geography': ['population india', 'urbanization', 'migration', 'agriculture geography'],
  },
  'World Geography': {
    'Continents & Oceans': ['continent', 'ocean', 'asia', 'africa', 'europe', 'north america', 'south america', 'australia', 'antarctica'],
    'Countries & Capitals': ['country capital', 'largest country', 'smallest country', 'population country'],
    'Major Landforms': ['mountain range', 'river', 'lake', 'desert', 'plateau', 'island'],
    'Climate & Biomes': ['climate zone', 'biome', 'tropical', 'temperate', 'tundra', 'taiga', 'savanna'],
  },
  'General Science': {
    'Physics': ['physics', 'newton law', 'thermodynamics', 'optics', 'electricity', 'magnetism', 'quantum', 'relativity'],
    'Chemistry': ['chemistry', 'element', 'compound', 'reaction', 'acid', 'base', 'organic', 'periodic table'],
    'Biology': ['biology', 'cell', 'dna', 'genetics', 'human body', 'plant', 'animal', 'ecosystem', 'evolution'],
    'Biotechnology & Health': ['biotechnology', 'genetic engineering', 'vaccine', 'disease', 'health'],
    'Environment & Ecology': ['ecology', 'ecosystem', 'food chain', 'biodiversity', 'conservation'],
  },
  Defence: {
    'Indian Army': ['indian army', 'army chief', 'infantry', 'regiment', 'northern command'],
    'Indian Navy': ['indian navy', 'warship', 'aircraft carrier', 'navy chief', 'western command'],
    'Indian Air Force': ['indian air force', 'aircraft', 'fighter jet', 'air chief', 'squadron'],
    'Missiles & Nuclear': ['missile india', 'brahmos', 'agni', 'prithvi', 'nuclear weapon', 'drdo'],
    'Defence Exercises': ['military exercise', 'malabar', 'yudh abhyas', 'garuda', 'varuna', 'shakti'],
    'Paramilitary & Special Forces': ['paramilitary india', 'bsf', 'crpf', 'itbp', 'assam rifles', 'special forces'],
  },
  'Environment & Ecology': {
    'National Parks & Sanctuaries': ['national park india', 'wildlife sanctuary', 'tiger reserve', 'kajiranga', 'gir'],
    'Climate Change & Policy': ['climate change india', 'paris agreement', 'nationally determined', 'climate policy'],
    'Conservation & Acts': ['conservation india', 'wildlife act', 'forest act', 'environment protection'],
    'Biodiversity & Wildlife': ['biodiversity india', 'endangered species', 'tiger', 'elephant', 'rhino'],
    'Pollution & Waste': ['pollution india', 'air quality', 'water pollution', 'waste management', 'swachh bharat'],
  },
  'International Relations': {
    'India–Pakistan Relations': ['india pakistan', 'kashmir dispute', 'loac', 'ceasefire', 'simla agreement', 'wagah'],
    'India–China Relations': ['india china', 'border dispute', 'doklam', 'galwan', 'lac', 'bilateral'],
    'India–Nepal–Bhutan Relations': ['india nepal', 'india bhutan', 'kalapani', 'lipulekh'],
    'India–Bangladesh–Myanmar Relations': ['india bangladesh', 'teesta', 'farakka', 'land boundary', 'india myanmar'],
    'India–Sri Lanka–Maldives Relations': ['india sri lanka', 'katchatheevu', 'india maldives', 'ipkf'],
    'India–Afghanistan–Iran–Central Asia': ['india afghanistan', 'chabahar', 'india iran', 'nstc', 'india central asia'],
    'India–US Relations': ['india us', 'i2u2', 'quad', 'civil nuclear', 'malabar', 'defence deal'],
    'India–Russia Relations': ['india russia', 'brahmos', 's400', 'sukhoi', 'mig', 'kudankulam'],
    'India–Europe Relations': ['india europe', 'eu india', 'india france', 'india germany', 'india uk'],
    'India–Japan–Australia–Indo-Pacific': ['india japan', 'india australia', 'quad', 'indo pacific', 'shinkansen'],
    'India–Gulf & West Asia': ['india uae', 'india saudi', 'india israel', 'gulf india', 'west asia'],
    'India–Africa Relations': ['india africa', 'africa india summit', 'e-network', 'india nigeria'],
    'India–ASEAN & East Asia Summit': ['india asean', 'act east', 'look east', 'india vietnam', 'india singapore'],
    'United Nations & Reform': ['united nations', 'un reform', 'security council', 'peacekeeping', 'general assembly'],
    'WTO, IMF, World Bank & Bretton Woods': ['wto', 'imf', 'world bank', 'bretton woods', 'trade dispute'],
    'BRICS, SCO, G20 & Multilateral Forums': ['brics', 'sco', 'g20', 'multilateral', 'new development bank'],
    'SAARC, BIMSTEC & Regional Organisations': ['saarc', 'bimstec', 'regional organisation'],
    'Nuclear Disarmament & Non-Proliferation': ['nuclear disarmament', 'npt', 'ctbt', 'non proliferation'],
    'Climate Change & Global Commons': ['climate change', 'global warming', 'paris agreement', 'ipcc', 'unfccc'],
    'Terrorism & Global Security': ['terrorism', 'counter terror', 'un security terror', 'fatf'],
    'Diaspora & Soft Power': ['indian diaspora', 'nri', 'soft power', 'yoga', 'bollywood', 'modi diaspora'],
    'Look East / Act East Policy': ['look east', 'act east', 'india asean', 'connectivity'],
    'Neighbourhood First Policy': ['neighbourhood first', 'south asia', 'sagar doctrine', 'gujral doctrine'],
    'Maritime Security & Indian Ocean': ['indian ocean', 'maritime security', 'navy exercise', 'blue economy'],
    'Border Disputes & Cross-Border Infrastructure': ['border dispute', 'border infrastructure', 'connectivity project'],
  },
  Constitution: {
    'Making & Features': ['constitution making', 'constituent assembly', 'union list', 'state list', 'federal'],
    'Fundamental Rights': ['fundamental right', 'right equality', 'right freedom', 'constitutional remedy', 'article 32'],
    'DPSP': ['directive principle', 'dpsp', 'article 36', 'gandhian principle'],
    'Amendment Process': ['constitutional amendment', 'amendment bill', 'article 368'],
    'Schedules': ['scheduled constitution', '8th schedule', 'language schedule', 'anti defection 10th'],
  },
  'ISRO & Space': {
    'Satellites': ['satellite india', 'insat', 'irs', 'navic', 'cartosat', 'risat'],
    'Launch Vehicles': ['pslv', 'gslv', 'sslv', 'launch vehicle', 'lvm3'],
    'Space Missions': ['chandrayaan', 'mangalyaan', 'gaganyaan', 'aditya l1', 'mars mission'],
    'Space Research': ['isro', 'space research', 'vsysc', 'sdsc', 'shar', 'ursc'],
  },
  'Computer & IT': {
    'Computer Fundamentals': ['computer fundamentals', 'cpu', 'memory', 'software', 'hardware'],
    'Internet & Networks': ['internet', 'network', 'lan', 'wan', 'protocol', 'tcp ip', 'www'],
    'Cybersecurity': ['cybersecurity', 'hacker', 'malware', 'firewall', 'encryption', 'phishing'],
    'AI & Emerging Tech': ['artificial intelligence', 'machine learning', 'deep learning', 'robotics', 'blockchain'],
    'Databases': ['database', 'sql', 'dbms', 'rdbms', 'nosql', 'mongodb'],
  },
  Sports: {
    'Olympic Games (Summer & Winter)': ['olympic game', 'olympic medal', 'summer olympic', 'winter olympic', 'tokyo 2020', 'paris 2024'],
    'Commonwealth Games': ['commonwealth game', 'birmingham 2022'],
    'Asian Games & Asian Championships': ['asian game', 'hangzhou 2022'],
    'Cricket (World Cup, T20, IPL)': ['cricket', 'world cup', 't20', 'ipl', 'bcci', 'indian cricket'],
    'Hockey (World Cup, Olympics)': ['hockey', 'field hockey', 'dhyan chand', 'hockey world cup'],
    'Tennis (Grand Slams, Davis Cup)': ['tennis', 'grand slam', 'wimbledon', 'davis cup', 'australian open', 'french open', 'us open'],
    'Football (FIFA World Cup, AFC Cup)': ['football', 'fifa world cup', 'premier league', 'fifa'],
    'Badminton (Thomas & Uber Cup, World C\'ships)': ['badminton', 'thomas cup', 'sindhu', 'saina', 'bwf'],
    'Wrestling (Olympic, World C\'ships)': ['wrestling', 'phogat', 'sushil kumar', 'bajrang'],
    'Boxing (Olympic, World C\'ships)': ['boxing', 'mary kom', 'lovlina', 'world championship boxing'],
    'Athletics (World C\'ships, Diamond League)': ['athletics', 'neeraj chopra', 'javelin', 'track field'],
    'Shooting (ISSF World C\'ships, Olympics)': ['shooting', 'bindra', 'manu bhaker', 'issf'],
    'Chess (World Championship, Olympiad)': ['chess', 'anand', 'gukesh', 'olympiad', 'grandmaster', 'fide'],
    'Kabaddi (World Cup, Pro Kabaddi)': ['kabaddi', 'pro kabaddi'],
    'National Games & Domestic Sports': ['national game india', 'khelo india', 'domestic sport'],
    'Sports Awards (Rajiv Gandhi Khel Ratna, Arjuna)': ['khel ratna', 'arjuna award', 'dronacharya', 'dhyan chand award'],
    'Sports Policy & Governance': ['sports policy', 'anti doping', 'nada', 'wada', 'ioa'],
    'E-Sports & Emerging Sports': ['e sport', 'esport', 'gaming', 'emerging sport'],
  },
  Society: {
    'Social Issues': ['social issue india', 'poverty', 'unemployment', 'inequality', 'health', 'education'],
    'Women & Child': ['women india', 'child india', 'gender equality', 'beti bachao', 'women safety'],
    'Caste & Communalism': ['caste system india', 'communalism', 'dalit', 'reservation', 'mandal'],
    'Demography & Urbanization': ['demography india', 'population', 'census', 'urbanization', 'migration'],
  },
  Personalities: {
    'Ancient & Medieval': ['chandragupta', 'ashoka', 'samudragupta', 'harsha', 'akbar', 'shivaji', 'prithviraj'],
    'Modern India': ['gandhi', 'nehru', 'patel', 'ambedkar', 'subhas bose', 'bhagat singh', 'tilak'],
    'Scientists & Reformers': ['raman', 'bhabha', 'kalam', 'sarabhai', 'vivekananda', 'dayanand', 'phule'],
    'Artists & Writers': ['tagore', 'ravi shankar', 'bimsen joshi', 'satyajit ray', 'm f hussain'],
  },
  'State GK': {
    'States & Capitals': ['indian state capital', 'state formation', 'union territory'],
    'State Schemes': ['state government scheme', 'state policy', 'state budget'],
    'State Geography': ['state geography', 'state river', 'state mountain', 'state climate'],
    'State Culture': ['state culture', 'state dance', 'state festival', 'state language'],
  },
  'Books & Authors': {
    'Classic Literature': ['classic literature', 'veda', 'epic', 'shakespeare', 'tagore', 'premchand'],
    'Modern Works': ['modern literature', 'booker prize', 'midnight children', 'god small thing'],
    'Award Winners': ['booker', 'nobel literature', 'sahitya akademi', 'jnanpith', 'pulitzer'],
    'Autobiographies': ['autobiography', 'memoir', 'wings fire', 'experiment truth', 'discovery india'],
  },
  'Important Days': {
    'National Days': ['national day india', 'republic day', 'independence day', 'gandhi jayanti'],
    'International Days': ['international day', 'world health day', 'women day', 'environment day'],
    'UN Observances': ['united nations day', 'world day', 'international decade'],
  },
  'Govt Schemes': {
    'Central Schemes': ['central government scheme', 'ayushman', 'pm kisan', 'jal jeevan', 'swachh bharat'],
    'State Schemes': ['state scheme', 'state government yojana'],
    'Welfare Programs': ['welfare program', 'social security', 'pension', 'subsidy'],
  },
  Awards: {
    'National Awards': ['bharat ratna', 'padma award', 'national award india'],
    'International Awards': ['nobel prize', 'oscar', 'booker', 'pulitzer', 'nobel peace'],
    'Sports Awards': ['sports award india', 'khel ratna', 'arjuna', 'dronacharya'],
    'Arts & Literature Awards': ['sahitya akademi', 'jnanpith', 'dadasaheb phalke', 'national film award'],
  },
  'Business & Economy': {
    'Corporate News': ['corporate india', 'company', 'merger', 'acquisition', 'stock market'],
    'Markets & Trade': ['stock market', 'sensex', 'nifty', 'sebi', 'commodity market'],
    'Startups & Innovation': ['startup india', 'unicorn', 'innovation', 'entrepreneur'],
  },
  'Tech & Science': {
    'Emerging Tech': ['emerging technology', 'ai', 'blockchain', 'quantum computing', '5g', 'iot'],
    'Scientific Discoveries': ['scientific discovery', 'research breakthrough', 'nobel science'],
    'Innovation India': ['innovation india', 'indigenisation', 'patent india', 'indian invention'],
  },
  Ethics: {
    'Ethical Theories': ['ethics theory', 'utilitarianism', 'deontology', 'virtue ethics', 'kant'],
    'Applied Ethics': ['applied ethics', 'bioethics', 'environmental ethics', 'business ethics'],
    'Governance & Ethics': ['governance ethics', 'integrity', 'transparency', 'accountability', 'probity'],
  },
  Announcements: {
    'Government Announcements': ['government announcement india', 'cabinet decision', 'policy announcement'],
    'Policy Updates': ['policy update india', 'new policy', 'regulation change'],
  },
  'RBI Press Releases': {
    'Monetary Policy': ['monetary policy rbi', 'repo rate', 'reverse repo', 'mpc'],
    'Banking Regulation': ['banking regulation', 'rbi circular', 'bank license', 'capital adequacy'],
    'Financial Stability': ['financial stability', 'rbi report', 'financial sector', 'bank health'],
  },
};

// ── Helpers ──
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'StudyProGK/3.0' } }, (res) => {
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

function classifySubSubject(category, title, questionText, answer) {
  const subMap = SUB_KEYWORDS[category];
  if (!subMap) return null;
  const text = (title + ' ' + questionText + ' ' + answer).toLowerCase();
  const matches = [];
  for (const [ss, keywords] of Object.entries(subMap)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > 0) matches.push({ ss, score });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.length > 0 ? matches[0].ss : null;
}

async function fetchArticles(query, limit) {
  const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json`;
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      const wait = Math.min(5000 * Math.pow(1.5, attempt), 60000);
      console.log(`  rate limited, retrying in ${wait/1000}s...`);
      await delay(wait);
    }
    try {
      const data = await fetchJSON(searchUrl);
      const results = (data.query ? data.query.search || [] : []);
      const titles = results.map(r => r.title).filter(t => !t.includes(':') && !t.includes('(disambiguation)') && t.length > 3).slice(0, 40);
      if (titles.length === 0) return [];
      const extUrl = `${WIKI_API}?action=query&prop=extracts|description&exintro&explaintext&titles=${titles.map(t => encodeURIComponent(t)).join('|')}&format=json`;
      const extData = await fetchJSON(extUrl);
      const pages = extData.query ? extData.query.pages : {};
      return Object.values(pages).filter(p => p && p.title && !p.missing).map(p => ({
        title: p.title,
        extract: p.extract || '',
        description: p.description || '',
      }));
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('You are mak') || msg.includes('rate limit') || msg.includes('too many')) {
        continue; // retry
      }
      console.error('  fetchArticles ERROR:', e.message);
      return [];
    }
  }
  console.error('  fetchArticles failed after 10 retries');
  return [];
}

function generateQuestions(articles, category) {
  const allTitles = articles.map(a => a.title);
  const results = [];

  for (let ai = 0; ai < articles.length; ai++) {
    const article = articles[ai];
    const title = article.title;
    const desc = cleanText(article.description || '');
    const ext = cleanText(article.extract || '');
    const text = desc || ext;

    if (!text || text.length < 10) continue;

    const questions = [];

    // Type 1: Description
    if (desc && desc.length > 5 && desc.length < 180) {
      let qText = 'What is described as: "' + desc + '"?';
      questions.push({ question: qText, answer: title, fact: desc });
    }

    // Type 2: Year
    const yr = extractYear(text);
    if (yr) {
      const firstLine = ext.split('.')[0] || '';
      if (firstLine.includes('founded') || firstLine.includes('established')) {
        questions.push({
          question: 'In which year was ' + title + ' ' + (firstLine.match(/founded|established/)[0] || 'founded') + '?',
          answer: yr,
          fact: firstLine,
        });
      } else if (firstLine.includes('born') || firstLine.includes('birth')) {
        questions.push({
          question: 'In which year was ' + title + ' born?',
          answer: yr,
          fact: firstLine,
        });
      }
    }

    // Type 3: Key term fill-in
    const sentences = ext.split('.').filter(s => s.trim().length > 30).slice(0, 4);
    for (const sent of sentences) {
      if (questions.length >= 4) break;
      const trimSent = sent.trim();
      const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(titleEsc, 'i').test(trimSent)) continue;

      const match = trimSent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g);
      if (match) {
        for (const term of match) {
          if (questions.length >= 4) break;
          if (term.length > 4 && !/^(The |It |This |They )/.test(term) && term !== title && !allTitles.includes(term)) {
            const context = trimSent.replace(term, '_____');
            if (context.length < 160) {
              questions.push({
                question: 'Fill in the blank: ' + context,
                answer: term,
                fact: title + ': ' + trimSent,
              });
            }
          }
        }
      }
    }

    // Type 4: Year from sentences
    const yearSentences = ext.split('.').filter(s => /\b(18[0-9]\d|19[0-9]\d|20[0-2]\d)\b/.test(s) && s.trim().length > 15);
    for (const ys of yearSentences) {
      if (questions.length >= 6) break;
      const y = extractYear(ys);
      if (y && !questions.some(q => q.answer === y) && !ys.toLowerCase().includes('isbn') && !ys.toLowerCase().includes('doi') && !/\b\d{4}\s*pp/i.test(ys)) {
        const context = ys.trim().replace(y, '_____');
        if (context.length < 170) {
          questions.push({
            question: 'What year is referenced here? ' + context,
            answer: y,
            fact: title + ': ' + ys.trim(),
          });
        }
      }
    }

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const subSubject = classifySubSubject(category, title, q.question, q.answer) || 'General';
      results.push({
        id: 'fill-' + category.replace(/[^a-z0-9]/gi, '') + '-' + title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20) + '-' + Date.now() + '-' + qi + '-' + Math.random().toString(36).slice(2, 6),
        type: 'fill_blank',
        category: category,
        region: '',
        source: 'Wiki',
        pubDate: new Date().toISOString(),
        subject: category,
        subSubject: subSubject,
        emoji: '',
        question: q.question.length > 200 ? q.question.slice(0, 197) + '...' : q.question,
        answer: q.answer.length > 80 ? q.answer.slice(0, 77) + '...' : q.answer,
        options: buildDistractors(q.answer, allTitles, 4),
        hint: '',
        fact: (q.fact || '').length > 1000 ? (q.fact || '').slice(0, 997) + '...' : (q.fact || ''),
      });
    }
  }
  return results;
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── MAIN ──
async function main() {
  console.log('=== Filling ALL sub-topics with Wikipedia questions ===\n');

  // 1. Read existing quiz.json
  let quiz = { questions: [] };
  try { quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8')); } catch (e) {}
  const existingQuestions = quiz.questions;

  // 2. Build existing dedup set
  const existingSet = new Set();
  existingQuestions.forEach(q => {
    existingSet.add((q.question + '|||' + q.answer).toLowerCase().trim());
  });

  // 3. Count existing coverage per (category, subSubject)
  const coverage = {};
  existingQuestions.forEach(q => {
    const cat = q.category || 'Misc';
    const ss = q.subSubject || 'General';
    const key = cat + '|||' + ss;
    coverage[key] = (coverage[key] || 0) + 1;
  });

  // 4. Report current coverage
  let uncoveredCount = 0;
  let totalSubSub = 0;
  for (const [cat, subs] of Object.entries(SUB_KEYWORDS)) {
    for (const ss of Object.keys(subs)) {
      totalSubSub++;
      const key = cat + '|||' + ss;
      if (!coverage[key] || coverage[key] === 0) {
        uncoveredCount++;
      }
    }
  }
  console.log('Categories with keyword maps: ' + Object.keys(SUB_KEYWORDS).length);
  console.log('Mapped sub-subjects: ' + totalSubSub);
  console.log('Sub-subjects with 0 coverage: ' + uncoveredCount);
  console.log('Existing questions: ' + existingQuestions.length + '\n');

  const TARGET_PER_SUBSUBJECT = 20;
  const allNewQuestions = [];
  const perCategoryCounts = {};
  let catIdx = 0;

  // Process high-priority categories first (most uncovered)
  const priorityOrder = [
    'International Relations', 'Indian History', 'World History', 'State GK',
    'Important Days', 'World Geography', 'Art & Culture', 'General Science',
    'RBI Press Releases', 'Tech & Science', 'Govt Schemes', 'Indian Economy',
    'Computer & IT', 'Books & Authors', 'Polity', 'Constitution',
    'Indian Economy', 'Geography', 'Defence', 'Environment & Ecology',
    'ISRO & Space', 'Sports', 'Society', 'Personalities', 'Awards',
    'Business & Economy', 'Ethics', 'Announcements',
  ];
  const sortedEntries = priorityOrder.map(c => [c, CAT_QUERIES[c]]).filter(e => e[1]);
  for (const [category, queriesStr] of sortedEntries) {
    catIdx++;
    const queries = queriesStr.split(',').map(q => q.trim()).filter(Boolean);

    // Check how many sub-subjects need coverage
    const subMap = SUB_KEYWORDS[category];
    if (!subMap) { console.log('[' + catIdx + '] ' + category + ': no sub-map'); continue; }

    const subKeys = Object.keys(subMap);
    let neededCount = 0;
    for (const ss of subKeys) {
      const key = category + '|||' + ss;
      if ((coverage[key] || 0) < TARGET_PER_SUBSUBJECT) neededCount++;
    }

    if (neededCount === 0) {
      console.log('[' + catIdx + '] ' + category + ': already filled');
      continue;
    }

    process.stdout.write('[' + catIdx + '/' + Object.keys(CAT_QUERIES).length + '] ' + category + ' (' + queries.length + ' queries)... ');

    // Fetch articles from multiple queries, deduplicate by title
    const allArticles = [];
    const seenTitles = new Set();
    const existingArticles = new Set(existingQuestions.filter(q => q.category === category).map(q => q.answer));
    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      try {
        const articles = await fetchArticles(query, 30);
        for (const a of articles) {
          if (!seenTitles.has(a.title) && !existingArticles.has(a.title)) {
            seenTitles.add(a.title);
            allArticles.push(a);
          }
        }
      } catch (e) {
        continue;
      }
      await delay(2000); // small delay between sub-queries
    }

    if (allArticles.length === 0) {
      console.log('no new articles');
      continue;
    }

    // Generate questions
    const newQs = generateQuestions(allArticles, category);

    // Deduplicate and check sub-subject coverage
    let added = 0;
    const subAdded = {};
    for (const q of newQs) {
      const key = (q.question + '|||' + q.answer).toLowerCase().trim();
      if (!existingSet.has(key)) {
        const ss = q.subSubject || 'General';
        if ((subAdded[ss] || 0) < TARGET_PER_SUBSUBJECT) {
          const covKey = category + '|||' + ss;
          const existingCov = coverage[covKey] || 0;
          if ((existingCov + (subAdded[ss] || 0)) < TARGET_PER_SUBSUBJECT) {
            subAdded[ss] = (subAdded[ss] || 0) + 1;
            existingSet.add(key);
            allNewQuestions.push(q);
            added++;
          }
        }
      }
    }

    perCategoryCounts[category] = { articles: allArticles.length, generated: newQs.length, added };
    console.log('articles=' + allArticles.length + ' generated=' + newQs.length + ' new=' + added + ' subs-covered=' + Object.keys(subAdded).length + '/' + subKeys.length);

    await delay(20000);
  }

  // 5. Merge new questions
  console.log('\n=== Adding ' + allNewQuestions.length + ' new questions ===');
  for (const q of allNewQuestions) {
    existingQuestions.push(q);
  }

  quiz.questions = existingQuestions;
  quiz.updatedAt = new Date().toISOString();
  fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2), 'utf8');
  console.log('Written to quiz.json. Total: ' + existingQuestions.length);

  // 6. Generate question HTML pages for new questions only
  console.log('\n=== Generating question HTML pages ===');
  if (!fs.existsSync(QUESTIONS_DIR)) {
    fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  }

  let htmlGenerated = 0;
  for (let i = 0; i < allNewQuestions.length; i++) {
    const q = allNewQuestions[i];
    const prevId = i > 0 ? allNewQuestions[i - 1].id : null;
    const nextId = i < allNewQuestions.length - 1 ? allNewQuestions[i + 1].id : null;
    try {
      const qText = q.question;
      const answer = q.answer;
      const cat = q.category || '';
      const date = q.pubDate ? new Date(q.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      let explain = q.fact || '';
      if (q.hint) explain += '<br><br>💡 ' + q.hint;
      if (!explain) explain = 'Answer: ' + answer;
      explain += '<br><br>Source: Wiki, ' + date;
      const safeTitle = qText.replace(/<[^>]+>/g, '').slice(0, 60);

      const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>' + escHtml(safeTitle) + ' — ' + escHtml(cat) + ' GK Question</title>\n<meta name="description" content="' + escHtml(safeTitle) + ' Answer: ' + escHtml(answer) + '. Free GK practice for competitive exams.">\n<link rel="canonical" href="https://vlymbooq.qzz.io/questions/q-' + q.id + '.html">\n<link rel="icon" type="image/svg+xml" href="../favicon.svg">\n<link rel="icon" type="image/png" href="../logo.png">\n<link rel="stylesheet" href="../css/style.css">\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\n:root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--red:#ef4444;--amber:#f59e0b;--radius:12px}\nbody{font-family:\'Inter\',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}\na{color:var(--purple);text-decoration:none}\na:hover{text-decoration:underline}\n.nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n.nav-inner{max-width:800px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05em;color:var(--text)}\n.container{max-width:800px;margin:0 auto;padding:40px 24px}\n.q-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.82em;color:var(--text-sec)}\n.q-cat{background:rgba(167,139,250,.1);color:var(--purple);padding:2px 10px;border-radius:100px;font-size:.82em}\n.q-date{color:var(--text-muted)}\n.q-text{font-size:1.15em;font-weight:600;margin-bottom:20px;line-height:1.7}\n.q-answer{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px}\n.q-answer .label{font-size:.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}\n.q-answer .value{font-size:1em;color:var(--emerald);font-weight:600}\n.explain-btn{background:var(--bg-card);border:1px solid var(--border);color:var(--text);padding:10px 18px;border-radius:100px;cursor:pointer;font-size:.85em;margin-bottom:16px}\n.explain-btn:hover{background:var(--bg-hover)}\n.q-explain{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;font-size:.88em;color:var(--text-sec);line-height:1.7;display:none}\n.q-explain.show{display:block}\n.nav-links{display:flex;justify-content:space-between;gap:12px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)}\n.nav-links a{padding:8px 16px;border-radius:100px;border:1px solid var(--border);font-size:.85em;color:var(--text);transition:all .2s}\n.nav-links a:hover{background:var(--bg-card);text-decoration:none}\n.breadcrumb{font-size:.82em;color:var(--text-muted);margin-bottom:24px}\n.breadcrumb a{color:var(--text-sec)}\n.breadcrumb .sep{margin:0 6px;color:var(--text-muted)}\n.breadcrumb .current{color:var(--text)}\n@media(max-width:600px){.container{padding:24px 16px}}\n</style>\n</head>\n<body>\n<nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand">vlymbooq</a><a href="../archive.html">Archive</a></div></nav>\n<div class="container">\n<div class="breadcrumb"><a href="../archive.html">Archive</a><span class="sep">›</span><a href="../archive.html">' + escHtml(cat) + '</a><span class="sep">›</span><span class="current">Question</span></div>\n\n<div class="q-header">\n<span class="q-cat">' + escHtml(cat) + '</span>\n<span class="q-date">' + date + '</span>\n</div>\n\n<div class="q-text">' + qText + '</div>\n\n<div class="q-answer">\n<div class="label">Answer</div>\n<div class="value">' + escHtml(answer) + '</div>\n</div>\n\n<button class="explain-btn" onclick="this.nextElementSibling.classList.toggle(\'show\');this.textContent=this.nextElementSibling.classList.contains(\'show\')?\'Hide Explanation\':\'Show Explanation\'">Show Explanation</button>\n<div class="q-explain">' + explain + '</div>\n\n<div class="nav-links">\n' + (prevId ? '<a href="q-' + prevId + '.html">← Previous</a>' : '<span></span>') + '\n<a href="../archive.html">Back to Archive</a>\n' + (nextId ? '<a href="q-' + nextId + '.html">Next →</a>' : '<span></span>') + '\n</div>\n</div>\n</body>\n</html>';

      fs.writeFileSync(path.join(QUESTIONS_DIR, 'q-' + q.id + '.html'), html, 'utf8');
      htmlGenerated++;
    } catch (e) {
      // skip individual failures
    }
  }
  console.log('Generated ' + htmlGenerated + ' question HTML files');

  // 7. Rebuild archive.html
  console.log('\n=== Rebuilding archive.html ===');
  try {
    const { execSync } = require('child_process');
    const buildScript = path.join(__dirname, 'build-archive.js');
    execSync('node "' + buildScript + '"', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    console.error('Build script failed:', e.message);
  }

  console.log('\n=== Done ===');
  console.log('New questions added: ' + allNewQuestions.length);
  console.log('Total in quiz.json: ' + existingQuestions.length);

  // Coverage report
  console.log('\nCoverage by sub-subject:');
  for (const [cat, subs] of Object.entries(SUB_KEYWORDS)) {
    for (const ss of Object.keys(subs)) {
      const key = cat + '|||' + ss;
      console.log('  ' + cat + ' → ' + ss + ': ' + (coverage[key] || 0) + ' → ' + ((coverage[key] || 0) + Object.keys(allNewQuestions.filter(q => q.category === cat && q.subSubject === ss)).length));
    }
  }
}

main().catch(e => console.error('FATAL:', e));

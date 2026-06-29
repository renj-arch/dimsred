const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
const outPath = path.join(__dirname, '..', 'archive.html');

const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const allQuestions = quiz.questions;

// ── Auto-filter: skip trash / low-value questions ──
const TRASH_RULES = [
  /Appeal No\.?\s*_{3,}/i,
  /Money Market Operations as on/i,
  /Reserve Money for the fortnight/i,
  /RBI Bulletin.*?_{3,}/i,
  /Admit Card.*to be Released/i,
  /Exam City.*Out at/i,
  /News Live Updates/i,
  /vs\s+\S+\s+on\s+_{3,}\s+June/i,
  /Sensex Today Trades Higher/i,
  /Progress of Area Coverage under Kharif/i,
  /bus (crashes|overturns|accident)/i,
  /\bAdd?a?\d?247\b/i,
  /Key decisions taken in the SEBI Board Meeting/i,
  /Launch of Securities Market TechSprint/i,
  /Six people are killed/i,
  /In a global development/i,
  /Members of Mexico/i,
  /Scientists confirm that Major Oak/i,
  /Double Engine Government Advancing Journey/i,
  /U\.S\. Secretary of State Marco Rubio/i,
  /Australian Government agrees to pay/i,
  /Rajasthan CET Notification/i,
  /Model Private School.*Abu Dhabi/i,
  /Asian Americans in science/i,
  /Science and technology in (Germany|Italy|Iran)/i,
  /Economy of Africa/i,
  /Islamic economics/i,
  /Wood science/i,
  /Alzahra University/i,
  /Czech Academy of Sciences/i,
  /School in Abu Dhabi/i,
  /List of Cornell University/i,
  /List of TWAS/i,
  /University College of Science, Technology/i,
  /National Science Talent Contest.*Pakistan/i,
  /Pakistan Institute of Nuclear/i,
  /Public university in Iran/i,
  /Annual science competition in Pakistan/i,
  /National laboratory site in Nilore/i,
  /Complete: List of /i,
  /"Scientific discipline"/i,
  /"Academy of sciences"/i,
  /Overview of (scientific|German|Iran)/i,
  /Contributions of women/i,
  /Physics Olympiad coordinator/i,
  /Secondary education leaving exams in India/i,
  /Largest Reefs|Highest Mountains.*country|Oceans is a country|Climate Zones.*largest city|Seven Continents.*largest city|UN Member States.*largest city|Largest Islands.*borders/i,
  /Which term is described as/i,
  /Belly dance/i,
  /culture of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /economy of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /geography of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /film (?:career|actress|actor|director|producer|industry|award|festival)|movie|reality (?:tv|show|television|series)/i,
];

function isTrash(q) {
  const text = q.question + ' ' + (q.source || '') + ' ' + (q.category || '');
  if (TRASH_RULES.some(re => re.test(text))) return true;
  if ((q.question.match(/_+/g) || []).length > 3) return true;
  if (q.question.length < 25) return true;
  // Reject if answer is a year and already appears verbatim in question (blank already filled in)
  if (/^\d{4}$/.test(q.answer) && q.question.includes(q.answer)) return true;
  // Reject tautological fact (starts with answer + colon/equals)
  if (q.fact) {
    const aEsc = q.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('^' + aEsc + '[:,]').test(q.fact)) return true;
  }
  if (q.source === 'SEBI' && /Appeal/i.test(q.question)) return true;
  if (q.source === 'Wikipedia' && /In a global|Members of Mexico|Major Oak|Six people|bus crashes|bus overturns|Marco Rubio|Australian Government/i.test(q.question)) return true;
  if (q.source === 'Wiki') {
    if (q.question.length < 25) return true;
    if (q.answer.length < 3) return true;
    if (/of Nigeria|of Pakistan|of Indonesia|of Italy|of Mozambique|of the Netherlands|of the Russian|of the United Kingdom|of the United Arab|of the Uzbekistan|of the United States|of Israel|of Bangladesh|of Singapore|of Germany|of Iran|of Africa|Hong Kong/i.test(q.subject || q.question)) return true;
    if (/Cricket ground at Fairplex|Military of Singapore|Sports associated with Western|Hong Kong policy/i.test(q.question)) return true;
    if (/birth control in the medieval|ancient history of the African|medieval and early modern history of the African/i.test(q.question.toLowerCase())) return true;
    // Reject if answer is a year and already appears in question (blank already filled)
    if (/^\d{4}$/.test(q.answer) && q.question.includes(q.answer)) return true;
    // Reject tautological fact (starts with "Answer: ")
    if (q.fact) {
      const ansEsc = q.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('^' + ansEsc + '[:,]').test(q.fact)) return true;
    }
    // Reject fragment questions (starts with lowercase or year range)
    if (/^[a-z]/.test(q.question)) return true;
    if (/^\d{4}[-–]/.test(q.question)) return true;
  }
  return false;
}

const questions = allQuestions.filter(q => {
  if (isTrash(q)) {
    console.log('  [FILTERED] ' + q.question.slice(0, 80));
    return false;
  }
  return true;
});

console.log('Total: ' + allQuestions.length + ' → Kept: ' + questions.length + ' (filtered: ' + (allQuestions.length - questions.length) + ')');

// ── Sub-category taxonomy (compact keyword matching) ──
const SUB_TAX = {
  'Indian History': ['Palaeolithic & Mesolithic India', 'Neolithic & Chalcolithic India', 'IVC & Harappan', 'Early Vedic Period', 'Later Vedic Period', 'Mahajanapadas & Rise of Magadha', 'Buddhism', 'Jainism', 'Mauryan Empire', 'Ashoka & His Edicts', 'Shunga & Kanva', 'Indo-Greeks, Shakas & Kushans', 'Satavahana Dynasty', 'Sangam Age', 'Gupta Empire', 'Vakataka & Post-Gupta', 'Harsha & Vardhanas', 'Pallava Dynasty', 'Chalukya & Rashtrakuta', 'Chola Empire', 'Pala & Sena Kingdoms', 'Rajput Kingdoms (North & West)', 'Rajput Kingdoms (Central & East)', 'Arab Invasions of Sindh', 'Ghaznavid & Ghurid Invasions', 'Delhi Sultanate (Slave & Khalji)', 'Delhi Sultanate (Tughlaq, Sayyid & Lodi)', 'Vijayanagara Empire', 'Bahmani & Deccan Sultanates', 'Bhakti Movement (Alvars & Nayanars)', 'Bhakti Movement (North Indian Saints)', 'Sufi Movement & Orders', 'Sikhism (Guru Period)', 'Sikh Empire (Ranjit Singh)', 'Mughal Empire (1526–1605)', 'Mughal Empire (1605–1707)', 'Mughal Administration & Culture', 'Maratha Empire (Shivaji Era)', 'Maratha Confederacy (Peshwa Era)', 'Provincial Kingdoms (Bengal–Gujarat–Kashmir)', 'North-East & Hill Kingdoms', 'Portuguese & Colonial Beginnings', 'Dutch, French & Other Europeans', 'East India Company (1612–1765)', 'British Expansion & Wars (1765–1857)', 'British Land Revenue & Economic Policy', 'British Social, Education & Cultural Policy', 'Hindu Reform Movements', 'Muslim, Sikh & Parsi Reform Movements', 'Revolt of 1857', 'Tribal Movements', 'Peasant Movements', 'Congress (Moderate Phase, 1885–1905)', 'Congress (Extremist, Swadeshi & Split, 1905–1915)', 'Revolutionary & Armed Struggle', 'Gandhian Era (1915–1934)', 'Gandhian Era (1935–1947)', 'Constitutional Development (1909–1935)', 'Constitutional Development (1935–1947)', 'Partition & Independence', 'Integration of Princely States', 'Nehruvian Era & Planning (1947–1964)', 'Reorganization of States', 'Wars & Foreign Policy (1947–1971)', 'Wars & Foreign Policy (1971–)', 'Emergency & JP Movement', 'Economic Reforms (1991)', 'Nuclear Programme', 'Space Programme', 'Contemporary India (1980s–1990s)', 'Contemporary India (2000s–)'],
  'World History': ['Ancient Mesopotamia & Egypt','Ancient China & Japan','Ancient Greece & Rome','Mesoamerican Civilizations','Central Asian & Steppe Empires','Medieval Europe (Feudalism & Crusades)','Byzantine & Ottoman Empires','Islamic Golden Age & Caliphates','Mongol Empire & Pax Mongolica','Medieval Africa (Ghana–Mali–Songhai)','Medieval Southeast Asia (Khmer–Srivijaya–Majapahit)','Renaissance & Reformation','Age of Exploration & Colonization','American Revolution (1776)','French Revolution & Napoleon','Industrial Revolution & Capitalism','Nationalism & Unification (Italy–Germany)','Imperialism & Scramble for Africa','World War I','Russian Revolution & Soviet Union','Interwar Period & Great Depression','World War II','Cold War (1947–1991)','Decolonization & UN System','Post-Cold War World (1991–2001)','War on Terror & Middle East (2001–)','Globalization & International Trade','Contemporary World Politics','World Economy & Global Crises','Human Rights & International Law','Nuclear Proliferation & Disarmament','Global Environmental Governance','Pandemics & Global Health Governance','Cyberspace & Digital Divide','Space Race & Global Space Programs'],
  'Art & Culture': ['Classical Dance', 'Music', 'Paintings & Sculpture', 'Architecture', 'UNESCO Sites', 'Fairs & Festivals', 'Language & Literature'],
  Polity: ['Constitution Framework & Philosophy', 'Preamble & Basic Structure', 'Fundamental Rights', 'Directive Principles & Fundamental Duties', 'Parliament (Lok Sabha & Rajya Sabha)', 'President & Vice President', 'Prime Minister & Council of Ministers', 'Supreme Court & High Courts', 'Judicial Review & Activism', 'Federal System & Centre–State Relations', 'Local Government (Panchayats & Municipalities)', 'Election Commission & Electoral Reforms', 'Union Public Service Commission', 'Comptroller & Auditor General', 'Attorney General & Advocate General', 'Special Status (J&K, Article 371)', 'Emergency Provisions', 'Amendment Process & Major Amendments', 'Constitutional Bodies (CAG, EC, UPSC, etc.)', 'Non-Constitutional Bodies (NITI Aayog, etc.)', 'Rights Issues (RTI, PIL, etc.)', 'Political Parties & Pressure Groups', 'Anti-Defection Law & Representation'],
  'Indian Economy': ['National Income & GDP', 'Budget & Taxation', 'Banking & Finance', 'Inflation & Monetary Policy', 'Agriculture & Food Security', 'Industry & Services', 'External Sector & Trade', 'Economic Reforms'],
  Geography: ['Physical Geography', 'Climate & Monsoon', 'Soils & Agriculture', 'Natural Vegetation', 'Mineral & Energy Resources', 'Human & Economic Geography'],
  'World Geography': ['Continents & Oceans', 'Countries & Capitals', 'Major Landforms', 'Climate & Biomes'],
  'General Science': ['Physics', 'Chemistry', 'Biology', 'Biotechnology & Health', 'Environment & Ecology'],
  Defence: ['Indian Army', 'Indian Navy', 'Indian Air Force', 'Missiles & Nuclear', 'Defence Exercises', 'Paramilitary & Special Forces'],
  'Environment & Ecology': ['National Parks & Sanctuaries', 'Climate Change & Policy', 'Conservation & Acts', 'Biodiversity & Wildlife', 'Pollution & Waste'],
  'International Relations': ['India–Pakistan Relations', 'India–China Relations', 'India–Nepal–Bhutan Relations', 'India–Bangladesh–Myanmar Relations', 'India–Sri Lanka–Maldives Relations', 'India–Afghanistan–Iran–Central Asia', 'India–US Relations', 'India–Russia Relations', 'India–Europe Relations', 'India–Japan–Australia–Indo-Pacific', 'India–Gulf & West Asia', 'India–Africa Relations', 'India–ASEAN & East Asia Summit', 'United Nations & Reform', 'WTO, IMF, World Bank & Bretton Woods', 'BRICS, SCO, G20 & Multilateral Forums', 'SAARC, BIMSTEC & Regional Organisations', 'Nuclear Disarmament & Non-Proliferation', 'Climate Change & Global Commons', 'Terrorism & Global Security', 'Diaspora & Soft Power', 'Look East / Act East Policy', 'Neighbourhood First Policy', 'Maritime Security & Indian Ocean', 'Border Disputes & Cross-Border Infrastructure'],
  Constitution: ['Making & Features', 'Fundamental Rights', 'DPSP', 'Amendment Process', 'Schedules'],
  'ISRO & Space': ['Satellites', 'Launch Vehicles', 'Space Missions', 'Space Research'],
  'Computer & IT': ['Computer Fundamentals', 'Internet & Networks', 'Cybersecurity', 'AI & Emerging Tech', 'Databases'],
  Sports: ['Olympic Games (Summer & Winter)', 'Commonwealth Games', 'Asian Games & Asian Championships', 'Cricket (World Cup, T20, IPL)', 'Hockey (World Cup, Olympics)', 'Tennis (Grand Slams, Davis Cup)', 'Football (FIFA World Cup, AFC Cup)', 'Badminton (Thomas & Uber Cup, World C\'ships)', 'Wrestling (Olympic, World C\'ships)', 'Boxing (Olympic, World C\'ships)', 'Athletics (World C\'ships, Diamond League)', 'Shooting (ISSF World C\'ships, Olympics)', 'Chess (World Championship, Olympiad)', 'Kabaddi (World Cup, Pro Kabaddi)', 'National Games & Domestic Sports', 'Sports Awards (Rajiv Gandhi Khel Ratna, Arjuna)', 'Sports Policy & Governance', 'E-Sports & Emerging Sports'],
  Society: ['Social Issues', 'Women & Child', 'Caste & Communalism', 'Demography & Urbanization'],
  Personalities: ['Ancient & Medieval', 'Modern India', 'Scientists & Reformers', 'Artists & Writers'],
  'State GK': ['States & Capitals', 'State Schemes', 'State Geography', 'State Culture'],
  'Books & Authors': ['Classic Literature', 'Modern Works', 'Award Winners', 'Autobiographies'],
  'Important Days': ['National Days', 'International Days', 'UN Observances'],
  'Govt Schemes': ['Central Schemes', 'State Schemes', 'Welfare Programs'],
  Awards: ['National Awards', 'International Awards', 'Sports Awards', 'Arts & Literature Awards'],
  'Business & Economy': ['Corporate News', 'Markets & Trade', 'Startups & Innovation'],
  'Tech & Science': ['Emerging Tech', 'Scientific Discoveries', 'Innovation India'],
  Ethics: ['Ethical Theories', 'Applied Ethics', 'Governance & Ethics'],
  Announcements: ['Government Announcements', 'Policy Updates'],
  'RBI Press Releases': ['Monetary Policy', 'Banking Regulation', 'Financial Stability'],
};

// ── Category fallback map ──
// When classifySub finds no match in q.category, try these mapped categories
const CAT_MAP = {
  'Geography': ['World Geography'],
  'World Geography': ['World History'],
  'General Science': ['Tech & Science'],
  'General': ['World History', 'General Science', 'Tech & Science'],
  'Misc': ['World History'],
  'Indian History': ['World History'],
  'Art & Culture': ['World History'],
  'International Relations': ['World History'],
  'Environment & Ecology': ['World History'],
  'Polity': ['World History'],
  'Indian Economy': ['World History'],
  'Defence': ['World History'],
  'ISRO & Space': ['World History'],
  'Sports': ['World History'],
  'Announcements': ['World History'],
  'Awards': ['World History'],
  'Books & Authors': ['World History'],
  'Business & Economy': ['World History'],
  'Computer & IT': ['World History'],
  'Constitution': ['World History'],
  'Ethics': ['World History'],
  'Govt Schemes': ['World History'],
  'Important Days': ['World History'],
  'Personalities': ['World History'],
  'RBI Press Releases': ['World History'],
  'Society': ['World History'],
  'State GK': ['World History'],
  'Tech & Science': ['World History'],
};

function classifySub(q, altCat) {
  const t = (q.question + ' ' + (q.answer || '') + ' ' + (q.hint || '')).toLowerCase();
  const cat = altCat || q.category || '';
  const subs = SUB_TAX[cat];
  if (!subs) return '';
  const kw = {
    'Palaeolithic & Mesolithic India': /paleolithic|palaeolithic|mesolithic|bhimbetka|rock.?art|microlith|hand.?axe|cleaver|soan|stone.?age|hunter.*gatherer|belan|son.*valley|hunsgi|bagor|langhnaj|adamgarh/i,
    'Neolithic & Chalcolithic India': /neolithic|chalcolithic|mehrgarh|burzahom|gufkral|copper.*age|ash.?mound|megalith|urn.*burial|navdatoli|malwa|jorwe|kayatha|pgw|painted.*grey.*ware|ocp|ochre.*coloured|nbp|northern.*black.*polished/i,
    'IVC & Harappan': /indus|harappa|mohenjo|daro|sindhu|saraswati|ivc|dholavira|lothal|kalibangan|banawali|chanhudaro|great.?bath|pashupati|priest.*king|dockyard|granary|seal|unicorn|script.*indus/i,
    'Early Vedic Period': /rig.*veda|sapta.*sindhu|early.*vedic|ashvamedha|rajasnya|vajapeya|purohita|senani|gramini|soma|indra|agni|varuna|purusha.*sukta|hiranyagarbha|nasadiya/i,
    'Later Vedic Period': /later.*vedic|yajur|samaveda|atharva|brahmana|aranyaka|upanisad|smriti|gotra|ashrama|gurukul|kuru|panchala|videha|shravan|shatapatha|upanishad|vedanga|shrauta|grihya|dharma.*sutra|puran.*vedic|hastinapur/i,
    'Mahajanapadas & Rise of Magadha': /mahajanapada|magadha|bimbisara|ajatashatru|shishunaga|nanda|dhana.*nanda|gana.*sangha|haryanka|sisunaga|kashi|koshala|avanti|vatsa|ashtadhyayi|panini|jivaka|rajagriha|pataliputra|vaishali|shravasti/i,
    'Buddhism': /buddha|buddhism|buddhist|sangha|tripitaka|jataka|dhammapada|ananda|sariputta|moggallana|bodhi|nirvana|parinirvana|sarnath|lumbini|stupa|chitya|vihara|sanchi|bharhut|nalanda|vikramashila|four.*noble.*truth|eightfold.*path|hina?yana|maha?yana|vajrayana|theravada|bodhisattva|bhikkhu|bhikkhuni/i,
    'Jainism': /jain|jaina|mahavira|tirthankara|parshvanath|digambara|shvetambara|kalpa.*sutra|ratnatraya|sallekhana|anuvrata|dilwara|mount.*abu|shravana.*belgola|gomat|pawapuri|kevala|kaivalya|anga|upanga|jain.*(temple|literature|art|philosophy|dynasty)/i,
    'Mauryan Empire': /maurya|chandragupta.*(not.*gupta)|chanakya|kautilya|arthashastra|bindusara|mudra.*rakshasa|mauryan|empire.*mauryan/i,
    'Ashoka & His Edicts': /ashoka|kalinga.*(war|edict)|dhamma.*(mahamatra|policy)|ashokan|pillar.*(edict|ashoka)|edict.*ashoka|lion.*capital|sarnath.*capital|kalsi|girnar|shahbazgarhi|mansehra|maski|rumindei|lauriya|bhabru/i,
    'Shunga & Kanva': /shunga|shunga|pushyamitra|agnimitra|kanva|vasudeva|bharhut.*stupa|besnagar|helidorus|garuda.*pillar/i,
    'Indo-Greeks, Shakas & Kushans': /indo.?greek|menander|demetrius|heliodorus|shaka|kshatrapa|rudradaman|kushan|kanishka|vima|huvishka|vasudeva.*kushan|gandhara.*(art|school)|mathura.*(art|school)|taxila|purushapura|kharoshthi/i,
    'Satavahana Dynasty': /satavahana|simuka|satakarni|gautamiputra|pulumavi|pratishthana|paithan|amravati|nagarjunakonda|nanaghat|cave.*(nasik|karle|kanheri)/i,
    'Sangam Age': /sangam.*(age|literature|period)|muvendar|cheran|karikala|tolkappiyam|ettutokai|pattupattu|silappadikaram|manimekalai|senguttuvan|korkai|muziris|tamil.*(sangam|akam|puram)|tolkap|tirukkural|thiruvalluvar|tamilakam|pandya.*(early|sangam)|chera.*(early|sangam)|chola.*(early|sangam)/i,
    'Gupta Empire': /gupta|samudragupta|chandragupta.*(vikramaditya|i|ii)|kumaragupta|skandagupta|prayag.*prashasti|harishena|mehrauli|arya.?bhata|kalidasa|navaratna|tamralipti|gupta.*(age|golden|dynasty|empire|art|coin|literature)/i,
    'Vakataka & Post-Gupta': /vakataka|vindhyashakti|pravara|rudrasena|ajanta.*(cave|vakataka)|bagh.*cave|post.?gupta|hun|mihirakula|toramana|mandasor|deogarh|bhitargaon|bhitari|ratnagiri/i,
    'Harsha & Vardhanas': /harsha|vardhana|pushyabhuti|banabhatta|harshacharita|hiuen.?tsang|xuanzang|si.?yuki|nagasena|kannauj|thanesar|prabhakara|maukhari|ratnavali|nagananda/i,
    'Pallava Dynasty': /pallava|mahendravarman|narasimhavarman|mamallapuram|mahabalipuram|pancha.*ratha|shore.*temple|kailasanta|pallava.*(dynasty|art|architecture|temple|inscription)|mandagapattu|kanchipuram.*pallava/i,
    'Chalukya & Rashtrakuta': /chalukya|pulakeshin|aihole|badami|kailasa.*(temple|ellora)|elephanta|pattadakal|rashtrakuta|dantidurga|amoghavarsha|kavirajamarga|ellora.*(rashtrakuta|kailasa)|solanki.*(not.*gujarat)|vengi|kalyani.*chalukya/i,
    'Chola Empire': /chola.*(empire|dynasty|kingdom|art|architecture|navy|bronze)|rajendra.*(chola|gangaikonda)|rajaraja.*chola|brihadeeswarar|gangaikonda|thanjavur.*(temple|chola)|uttaramerur|darasuram|chola.*(bronze|nataraja|inscription)/i,
    'Pala & Sena Kingdoms': /pala.*(empire|dynasty|art|sculpture|school)|dharmapala|devapala|mahipala|nalanda.*(university|pala)|vikramashila|somapura|odantapuri|sena|vijayasena|ballalasena|laksmanasena|paharpur/i,
    'Rajput Kingdoms (North & West)': /prithviraj.*chauhan|chauhan|chahamana|shakambhari|rana.*(sanga|kumbha|pratap)|sisodia|guhil|mewar|chittor|solanki|chaulukya|anhilwada|kumarapala|rathore|marwar|jodha|tomar|gwalior.*(tomar|fort)|katoch|kangra|rajput.*north|rajput.*west/i,
    'Rajput Kingdoms (Central & East)': /paramara|bhoj.*paramara|malwa.*paramara|chandela|khajuraho|dhangadeva|gahadavala|jayachandra|jaichand|kalinjar|bundela|orchha|garha.*katanga|gondwana|kannauj.*(gahadavala|rajput)|rajput.*central|rajput.*east/i,
    'Arab Invasions of Sindh': /muhammad.*bin.*qasim|debal|sindh.*(arab|712|conquest)|hajjaj|raja.*dahir|brahmanabad|arab.*(invasion|conquest|sindh)|hindu.*shahi|kabul.*shahi|jaipala/i,
    'Ghaznavid & Ghurid Invasions': /ghaznavid|ghazni|mahmud.*(ghazni|ghaznavid)|subuktigin|ghur|ghurid|muhammad.*ghori|muizz.*din|shahabuddin|taraori|kasahrada|som*nath.*(mahmud|ghazni)/i,
    'Delhi Sultanate (Slave & Khalji)': /slave.*dynasty|mamluk.*(delhi|dynasty)|qutb.*ud.*din.*aybak|ilitutmish|razia|balban|khalji|alauddin.*(khalji|market|price|conquest)|khilji|quwwat.*ul.*islam|siri.*fort|alai.*darwaza|qutub.*minar/i,
    'Delhi Sultanate (Tughlaq, Sayyid & Lodi)': /tughlaq|muhammad.*bin.*tughlaq|firuz.*shah.*tughlaq|tughlaqabad|daulatabad|sayyid|khizr.*khan|lodi|bahlul.*lodi|sikandar.*lodi|ibrahim.*lodi|tarikh.*firuz.*shahi|fatwa.*jahandari|barani|iqta|jizya/i,
    'Vijayanagara Empire': /vijayanagara|krishnadevaraya|hampi|talikota|sangama.*(dynasty|king)|saluva|tuluva|aravidu|vidyaranya|harihara|bukka|raichur|karnata.*empire|virupaksha|elephant.*stables|lotus.*mahal|kishkinda/i,
    'Bahmani & Deccan Sultanates': /bahmani|bahamani|muhammad.*(gawan|shah.*bahmani)|mahmud.*gawan|gulbarga|bidar|golconda|qutb.*shahi|bijapur|adil.*shahi|ahmadnagar|nizam.*shahi|berar|imad.*shahi|barid.*shahi|deccan.*(sultanate|medieval)|chand.*minar/i,
    'Bhakti Movement (Alvars & Nayanars)': /alvar|alwar|nayanar|nayanmar|divya.*prabandha|andal|kulashekara|tirumazhisai|nammalvar|sambandar|appar|sundarar|manikkavasagar|bhakti.*(south|tamil)|tevaram|tiruvasagam|periyapuranam|ramanuja|vishishtadvaita|bhakti.*shiva|bhakti.*vishnu/i,
    'Bhakti Movement (North Indian Saints)': /bhakti.*(north|hindi|sant|poet)|ramananda|kabir|namdev|mira.*bai|sur.*das|tulsi.*das|chaitanya|ramdas|vithoba|pandharpur|vallabha|nimbarak|madhva|sant.*(poet|kabir|tulsi)|nirguna|saguna|varkari|tukaram|eknath|jnaneshwar|pusti.*marg/i,
    'Sufi Movement & Orders': /sufi|chishti|nizamuddin.*aulia|moinuddin.*chishti|baba.*farid|salim.*chishti|suhrawardi|qadri|naqshbandi|silsila|darvesh|dervish|pir|khanqah|langar|sama.*(mystic|khanqah)|wajd|shah.*jalal|sufi.*(saint|order|shrine)/i,
    'Sikhism (Guru Period)': /guru.*(nanak|angad|amardas|ramdas|arjan|hargobind|tegh|gobind)|sikh.*(guru|religion|panth|khalsa)|khalsa.*(founded|panth)|panj.*piyara|khande.*di.*pahul|harmandir|amritsar|akal.*takht|ad.*granth|dasam.*granth|gurudwara|banda.*singh|deep.*singh|sikh.*misl|gurmatta|sarbat.*khalsa|singh.*sabha/i,
    'Sikh Empire (Ranjit Singh)': /ranjit.*singh|lakhpat|sher.*punjab|sikh.*(empire|kingdom|misl|confederacy)|misal|sukerchakia|dal.*khalsa|lion.*punjab|anglo.?sikh|sutlej.*sikh|kashmir.*sikh|multan.*sikh|peshawar.*sikh/i,
    'Mughal Empire (1526–1605)': /babur|babar.*mughal|humayun|akbar.*(mughal|fatehpur|sikri|reign|policy|navaratna)|bairam.*khan|fatehpur.*sikri|ibadat.*khana|buland.*darwaza|din.*i.*ilahi|sulh.*kul|panipat.*(1526|1556)|khanwa|ghaghra|chausa|kannauj|mughal.*(akbar|babur)/i,
    'Mughal Empire (1605–1707)': /jahangir|nur.*jahan|shah.*jahan|aurangzeb|dara.*shiko|mumtaz.*mahal|taj.*mahal|red.*fort|lal.*qila|jama.*masjid|aurangzeb.*(deccan|maratha|sikh|jizya|reign|policy)|tuzuk.*jahangiri|shah.*jahan.*(architecture|period|taj|throne)/i,
    'Mughal Administration & Culture': /mansabdar|jagir|zamindar|subah|subadar|sardeshmukhi|chauth|mughal.*(administration|revenue|bureaucracy|economy|culture|painting|architecture|garden|literature|language|dress|food|zenana|harem|navy|army|weapon|artillery|technology|science|calendar|chronicle|historiography)/i,
    'Maratha Empire (Shivaji Era)': /shivaji|bhosle|raigarh|torna|swarajya|ashta.*pradhan|ashtapradhan|rajgad|sajjangad|pratapgad|shivaji.*(couronation|admin|navy|fort|battle|treaty|death)|afzal.*khan|shaista.*khan|purandar|bhonsle|maratha.*(shivaji|swarajya)/i,
    'Maratha Confederacy (Peshwa Era)': /peshwa|baji.*rao|balaji.*(vishwanath|baji)|nana.*sahib|madhav.*rao|nana.*fadnavis|panipat.*(third|1761)|maratha.*(confederacy|peshwa|bhonsle|scindia|holkar|gaekwad)|anglo.?maratha.*(war|treaty)|assaye|laswari|bharatpur|khadki|ashti/i,
    'Provincial Kingdoms (Bengal–Gujarat–Kashmir)': /bengal.*(sultanate|iliyas|hussain|shahi|goud|nawab|independent|medieval)|iliyas.*shahi|hussain.*shahi|sonargaon|pandua|gujarat.*(sultanate|ahmedabad|muzaffar|bahadur.*shah)|mahmud.*begada|kashmir.*(sultanate|medieval|zain.*ul.*abidin|shah.*mir|budshah)|zain.*ul.*abidin|kalhana|rajatarangini|jaunpur.*(sultanate|sharqi)|sharqi|malwa.*(sultanate|mandu|hoshang)|baz.*bahadur|rupmati|mandu/i,
    'North-East & Hill Kingdoms': /ahom|sukapha|lachit.*bor|burhagohain|majuli|garhgaon|rangpur|sivasagar|kareng.*ghar|talatal.*ghar|koch|kamata|dimasa|kachari|jaintia|manipur|meitei|tripura|sutiya|ladakh.*(kingdom|namgyal)|namgyal|sikkim.*(history|kingdom|chogyal)|kamarupa|bhaskara.*varman|pragjyotish|naga.*(tribe|history)/i,
    'Portuguese & Colonial Beginnings': /portuguese|vasco.*da.*gama|alfonso.*albuquerque|goa.*(colony|inquisition|history)|cochin.*portuguese|daman|diu|bassein|salsette|portuguese.*(india|settlement|trade|fort|church|navy|viceroy|inquisition|jesuit|missionary|cannon|spice|pepper)/i,
    'Dutch, French & Other Europeans': /dutch|voc|ostend|danish|tranquebar|serampore|french|pondicherry|chandernagore|mahe|karikal|yanam|dupleix|french.*(india|east.*india|company|carnatic|war)|carnatic.*(war|battle)|english.*east.*india|dutch.*(east.*india|india|trade)/i,
    'East India Company (1612–1765)': /east.*india.*company|surat.*(factory|english)|madras.*(fort.*st.*george|1639)|bombay.*(1661|1668|dowry)|calcutta.*(1690|fort.*william)|job.*charnock|clive|plassey|buxar|mir.*jafar|siraj|presidency.*(madras|bombay|calcutta)|masulipatnam|carnatic.*war|company.*(rule|trade|army|fort|factory)/i,
    'British Expansion & Wars (1765–1857)': /warren.*hastings|cornwallis|wellesley|hastings.*(governor|marquis)|bentinck|robert.*clive(?!.*plassey)|anglo.*(mysore|maratha|sikh|nepal|burma|afghan|gurkha)|subsidiary.*alliance|doctrine.*lapse|ring.*fence|governor.*general|pitt.*india.*act|regulating.*act/i,
    'British Land Revenue & Economic Policy': /permanent.*settlement|ryotwari|mahalwari|drain.*theory|dadu|naukar|chowdhury|lakhiraj|land.*revenue.*british|village.*community|famine.*(policy|commission)|salt.*tax|forest.*act|commercial.*(policy|drain)/i,
    'British Social, Education & Cultural Policy': /macaulay.*(education|minute)|wood.*despatch|orientalist|anglicist|english.*(education|act).*india|missionary.*(school|college|education)|printing.*press.*india|vernacular.*press.*act|ilbert.*bill|age.*of.*consent|widow.*remarriage.*(act|1856)|sati.*(abolition|act.*1829)|brahmo.*samaj|rama.*krishna|vivekananda|dayanand|arya.*samaj|ram.*mohan.*roy|sharda.*act/i,
    'Hindu Reform Movements': /brahmo.*samaj|rama.*krishna.*(mission|paramahansa)|vivekananda|dayanand.*saraswati|arya.*samaj|ram.*mohan.*roy|sati.*(abolition|act)|widow.*remarriage|sharda.*act|prarthana.*samaj|ranade|phule|shahu|ambedkar|periyar|self.*respect|aryan.*mission|mithila|mandal|bhagat|ram.*krishna|theosophical|annie.*besant|sivananda|yoga.*(india|vedanta)|chinmayananda/i,
    'Muslim, Sikh & Parsi Reform Movements': /aligarh|sir.*syed|mohammadan.*anglo.*oriental|mao.*(college|140*127)|d?oband|nadwa|faraizi|wahabi.*india|sikh.*(sabha|reform|gurdwara)|sgpc|shiromani|akali|parsi.*(reform|panchayat|religion)|rahnumai|mazdayasni|islamic.*(reform|modernism|revival)/i,
    'Revolt of 1857': /sepoy|1857|revolt.*1857|mangal.*pandey|nana.*saheb|tantia.*tope|bahadur.*shah.*zafar|jhansi.*(rani|laxmi|ki)|rani.*of.*jhansi|kunwar.*singh|queen.*proclamation|vernacular.*press.*act|arms.*act.*1878|royal.*title.*act.*1876/i,
    'Tribal Movements': /santhal|munda|birsa.*munda|ulgulan|hul|bhil.*(revolt|uprising|movement)|koya|varli|tana.*bhagat|kherwar|savara|damin|tribal.*(revolt|uprising|movement|insurgency)|naga.*revolt|mizo.*(revolt|insurgency)|naxal|naxalite|left.*wing.*extremism/i,
    'Peasant Movements': /indigo.*(revolt|cultivation)|champaran|deccan.*(riots|agric)|rasta.*kari|pabna|tebhaga|sanyasi.*(revolt|fakir)|pagal.*panthi|peasant.*(revolt|movement|uprising)|kisan.*(sabha|movement)|bardoli|kheda|moplah|mappila|telangana.*(1946|1948)/i,
    'Congress (Moderate Phase, 1885–1905)': /moderate.*(phase|congress)|a.o.*hume|naoroji|gokhale|banerjea|surendra|pherozeshah|r.c.*datta|w.c.*banerjee|congress.*(session|1885|found|founding)|early.*congress|grand.*old.*man.*india|petition|prayer|right|constitutional.*(agitation|method)/i,
    'Congress (Extremist, Swadeshi & Split, 1905–1915)': /extremist|extremism|swadeshi|boycott|bonfires|vande.*mataram|bengal.*partition.*1905|partition.*of.*bengal|surat.*(split|session|lucknow|1907)|tilak|bipin.*pal|lala.*lajpat|aravinda|ghose|lahiri|anushilan|samiti|nationalist.*(extremist|militant)|seditious.*meeting/i,
    'Revolutionary & Armed Struggle': /revolutionary|ghadar|gadar|bhagat.*singh|sukhdev|rajguru|chandrasekhar.*azad|azad.*(revolution|british)|hindu.*republican|hsra|kakori|chittagong.*(armoury|raids)|masterda|surya.*sen|jatin.*das|batukeshwar|savarkar|abhinav.*bharat|jugantar|anushilan|hindustan.*socialist|bombay.*(conspiracy|presidency)|lahore.*conspiracy|delhi.*(case|conspiracy)/i,
    'Gandhian Era (1915–1934)': /gandhi|mahatma|satyagraha|non.?cooperation|khilafat|dandi.*march|salt.*satyagraha|jallianwala|rowlatt|amritsar.*(massacre|tragedy)|hartal|bardoli|gandhi.?irwin|purna.*swaraj|chauri.*chaura|poona.?pact|fast.*unto.*death|mohandas|khan.*abdul.?gaffar|frontier.*gandhi|harijan|bhoodan|naokhali|noakhali/i,
    'Gandhian Era (1935–1947)': /quit.*india|cripps|individual.*satyagraha|1942|august.*(movement|revolution|kranti)|do.*or.*die|parallel.*(govt|government)|underground.*(movement|activist)|subhas.*chandra.*bose|ina|azad.*hind|netaji|indian.*national.*army|forward.*bloc|rss|hindutva|mahatma.*(assassination|murder)|gandhi.*(death|assassination)/i,
    'Constitutional Development (1909–1935)': /morley.?minto|montagu.?chelmsford|government.*of.*india.*act.*1919|simon.*commission|nehru.*report|round.*table.*conference|communal.*award|poona.*pact|dyarchy|diarchy|provincial.*autonomy|separate.*electorate/i,
    'Constitutional Development (1935–1947)': /government.*of.*india.*act.*1935|cabinet.*mission|cripps.*mission|wavell.*plan|indian.*independence.*act|august.*offer|1947.*(act|independence)|federation|partition.*plan|constituent.*assembly|dominion.*(status|india)/i,
    'Partition & Independence': /partition.*(india|bengal|punjab)|radcliffe.*line|mountbatten.*(plan|partition)|independence.*(day|1947|act)|boundary.*commission|transfer.*of.*power|bengal.*partition.*1947|punjab.*partition.*1947|divided.*families|refugee.*(partition|1947)|1947.*(partition|independence)/i,
    'Integration of Princely States': /integration.*(princely|state|india)|sardar.*patel.*(integration|unific)|instrument.*accession|hyderabad.*(police|action|operation)|operation.*polo|junagadh|kashmir.*accession|sikkim.*(1975|merger)|pondicherry.*merger|goa.*(1961|liberation|operation)|state.*merger.*(1947|1948|1949)/i,
    'Nehruvian Era & Planning (1947–1964)': /nehru|jawaharlal|planning.*commission|five.*year.*plan|panchsheel|non.?alignment|community.*development|national.*(laboratory|institute)|steel.*plant|public.*sector|mixed.*economy|nehru.*(era|vian|model)|shastri|food.*crisis|green.*revolution|iit|iisc|dam|bhakra|hirakud|scientific.*temper|kamraj|tashkent|education.*(commission|kothari)/i,
    'Reorganization of States': /reorganization.*(states|linguistic)|state.*reorganization|linguistic.*states|andhra.*(1953|1956)|sarkaria|fazal.*ali|maharashtra.*(1960|gujarat)|nagaland.*state|mizoram|arunachal|goa.*state|chhattisgarh|uttarakhand|jharkhand|telangana|union.*territory.*(formation|creation)/i,
    'Wars & Foreign Policy (1947–1971)': /1947.*(war|kashmir|operation)|1962.*(war|china|attack)|1965.*(war|indo)|1971.*(war|bangladesh|liberation)|simla.*agreement|tashkent.*agreement|lhasa.*agreement|operation.*(vijay|meghdoot)|ceasefire.*(1948|1965|1971)|line.*control|panchsheel|nonalign|non.?align|neutral.*india|bangladesh.*liberation.*war/i,
    'Wars & Foreign Policy (1971–)': /kargil|operation.*(parakram|snow|cactus|pawan)|siachen|surgical.*strike|balakot|pulwama|uri|pathankot|26.?11.*(mumbai|attack)|mumbai.*(attack|26.?11)|ipkf|rafale|tejas|border.*(skirmish|standoff|confront).*(india|china|pak)|doklam|galwan|pokhran|nuclear.*doctrine|no.?first.?use|look.*east|act.*east|neighbourhood.*(first|policy)|india.*(us.*nuclear|japan|australia|russia|china|pakistan|nepal|sri.*lanka|bangladesh|myanmar|maldives|afghanistan|iran|israel).*[0-9]{4}|foreign.*policy.*india.*[0-9]{4}|nonalign|quad|malabar.*exercise|brics|sco.*india|g20.*india/i,
    'Emergency & JP Movement': /emergency.*(1975|1977|india|internal)|misa|diss.*row|jp.*(movement|andolan)|jayaprakash.*narayan|sampoorna.*kranti|navnirman|janata.*(party|government)|morarji.*desai|1977.*(election|landmark)|chandra.*shekhar|socialist.*party.*india|total.*revolution/i,
    'Economic Reforms (1991)': /1991.*(economic|reform|budget|liberalization|crisis)|liberalization.*1991|lpg.*(reform|india)|manmohan.*singh.*(1991|budget|reform)|balance.*of.*payment.*(1991|crisis)|new.*economic.*policy.*1991|disinvestment|privatization|globalization.*india|rupee.*(devalue|devaluation).*1991|fdi.*(reform|policy.*1991)|reform.*era.*india|narsimha.*rao|p.v.*(narsimha|rao)/i,
    'Nuclear Programme': /pokhran|operation.*shakti|nuclear.*(test|weapon|program|explosion)|smiling.*buddha|nuclear.*doctrine|no.?first.?use|atomic.*energy.*commission|uranium.*india|thorium|kudankulam|indira.*gandhi.*(atomic|nuclear)|drdo|nuclear.*supplier|nsg.*india|civil.*(nuclear|liability).*act/i,
    'Space Programme': /isro|space.*(research|program|mission|organisation).*india|chandrayaan|mangalyaan|gaganyaan|indian.*space|rocket.*india|satellite.*india|slv|aslv|pslv|gsvl|gslv|bahubali|launch.*vehicle.*india|mars.*orbiter.*mission|moon.*(mission|india)|insat|irnss|navic|rythm|astrosat|cartosat|hysi|risat|spadex|scramjet|reusable.*(launch|vehicle).*india|vssc|sdsc|satish.*dhawan|sslv|semission|tv.*(d2|d3)|nbyp|prarambh|vikram.*(lander|sarabhai)|kalam|sarabhai.*space|space.*(commission|department|policy).*india/i,
    'Contemporary India (1980s–1990s)': /mandal.*commission|ayodhya|babri.*(masjid|demolition)|ram.*(mandir|janmabhoomi)|1984.*(riots|anti.?sikh|operation)|1989.*(election|mandal)|1990.*(mandal|economic)|1992.*(ayodhya|babri|demolish)|kashmir.*(militancy|insurgency|terrorism)|punjab.*(militancy|insurgency)|assam.*(accord|agitation)|bodo.*(movement|accord)|naga.*(accord|insurgency)|mizo.*accord|anandpur.*sahib|rss.*(ban|government)|rajiv.*gandhi.*(assassination|death)|sikh.*(riots|violence)|liberation.*tigers.*tamil.*eelam|lttE|nepal.*(civil|congress|maoist)|sri.*lanka.*(civil.*war|ejp|indian.*peace)|malaysia.*(indian|1987)|gorkha.*(movement|land)|separatist.*(movement|india)|remote.*area.*development|insurgency.*(north.?east|kashmir|punjab)/i,
        'Contemporary India (2000s–)': /2001.*(?:parliament|attack|gujarat|earthquake)|2002.*(?:gujarat|riots|godhra)|2008.*(?:mumbai|attack|26[.?]11)|2014.*(?:election|modi|bjp|narendra)|2016.*(?:demonetization|note[._]?ban)|2019.*(?:pulwama|balakot|election|article[._]?370|abrogation|caa|nrc|citizenship)|2020.*(?:covid|pandemic|lockdown|galwan|labor|farm[._]?law)|2021.*(?:covid|vaccine|delta|omicron)|2022.*(?:ukraine|russia|g20|70th|election|vigilance)|2023.*(?:g20|chandrayaan|ayodhya|parliament|session)|2024.*(?:election|budget|economic|policy|space|mission)|demonetization|gst|aadhaar|citizenship[._]?(?:amendment|act[._]?2019)|caa|nrc|npr|ayodhya[._]?(?:temple|bhoomi|consecration|pran|pratishtha|22[._]?january|2024)|ram[._]?mandir[._]?(?:inauguration|temple|ayodhya[._]?2024)|ucc|uniform[._]?civil[._]?code|triple[._]?talaq|sabarimala|lingayat[._]?(?:reservation|status)|maratha[._]?(?:reservation|quota)|patidar|jatt[._]?(?:reservation|quota)|gurjar[._]?(?:reservation|meet)|dhobi|valmiki[._]?community|kashmir[._]?(?:article[._]?370|abrogation|2019|reorganization|union[._]?territory)|jammu[._]?kashmir[._]?(?:reorganization|2019|downgrade)|ladakh[._]?(?:union[._]?territory|2019)|naxal[._]?(?:movement|insurgency|attack)|left[._]?wing[._]?extremism|militancy[._]?(?:kashmir|jammu|northeast)|insurgency[._]?(?:manipur|assam|nagaland|mizoram|tripura|meghalaya|sikkim|jammu|kashmir)|cyber[._]?(?:attack|crime|security|warfare)[._]?india|climate[._]?(?:change|action|policy)[._]?india|renewable[._]?(?:energy|target|capacity)[._]?india|electric[._]?(?:vehicle|mobility|policy)[._]?india|startup[._]?(?:india|ecosystem|policy)|unicorn[._]?india|fintech|digital[._]?(?:payment|india|transaction|economy)|upi|bhims|npci|account[._]?aggre|data[._]?(?:protection|privacy|governance)[._]?india|5g[._]?india|6g|semiconductor[._]?(?:mission|policy|plant)[._]?india|chip[._]?(?:manufacturing|design)[._]?india|phased[._]?manufacturing|pli[._]?(?:scheme|policy)|make[._]?in[._]?india|atmanirbhar[._]?bharat|vocal[._]?local|local[._]?global|vishwakarma[._]?(?:yojana|scheme)|skill[._]?india|digital[._]?india|smart[._]?city|amrut|swachh[._]?bharat|ganga[._]?(?:action[._]?plan|clean|mission)|air[._]?(?:quality|pollution|index)[._]?india|environment[._]?(?:india|policy|act[._]?2022)|green[._]?(?:hydrogen|energy|mission)[._]?india|e[._]?(?:waste|vehicle|governance)[._]?india|covid[._]?(?:vaccine|india|pandemic|efficacy|delta|omicron|wave|cases|death|recovery|lockdown|unlock|economic|vaccination|drive|production|export|diplomacy|aid|assistance|neighbour|world|global|herd[._]?immunity|mutation|variant|strain|dose|booster|precaution|pediatric|adult|geriatric|comorbidity|hospital|icu|oxygen|concentrator|ventilator|remdesivir|tociliz|fabi|fluvox|molnu|paxlov|covax|covishield|sputnik|moderna|pfizer|johnson|astra[._]?zeneca|bharat[._]?biotech|serum[._]?institute|zycov|corbevax)/i,

    'Ancient Mesopotamia & Egypt': /mesopotamia|sumer|akkad|babylon|assyria|hammurabi|ziggurat|cuneiform|egypt.*(ancient|pharaoh|pyramid|old.*kingdom|middle.*kingdom|new.*kingdom)|nile|hieroglyph|tutankhamun|cleopatra|ramses|abu.*simbel|valley.*kings|giza|sphinx|papyrus|osiris|isis|horus|anubis|ra.*(god|sun)|imhotep|hyksos|nubia|kush|akhenaten|nefertiti/i,
    'Ancient China & Japan': /shang.*(dynasty|china)|zhou|qin.*(dynasty|shi.*huang)|terracotta.*army|great.*wall.*china|han.*dynasty|tang|song|yuan.*(dynasty|mongol)|ming|qing|mandate.*heaven|silk.*road|confucius|lao.*tzu|daoism|tea.*(china|japan)|japan.*(ancient|feudal|shogun|samurai|meiji|edo|tokugawa|nara|heian|kamakura|muromachi|azuchi|momoyama)|shinto|kofun|asuka|taika|bushido|ninja|geisha|jomon|yayoi|sakoku|meiji.*restoration/i,
    'Ancient Greece & Rome': /ancient.*greece|athens|sparta|delian.*league|peloponnesian.*war|alexander.*(great|macedon)|hellenistic|acropolis|parthenon|democracy.*(athens|greek)|socrates|plato|aristotle|pericles|macedon|philip.*macedon|trojan.*war|homer|iliad|odyssey|ancient.*rome|roman.*(republic|empire|senate|legion|caesar|emperor|forum|colosseum|aqueduct|pax.*romana|law|road|gladiator|latifundia)|julius.*caesar|augustus|punic.*war|carthage|hannibal|byzantine|constantinople|justinian|corpus.*juris|fall.*rome|gracchi|tiberius.*gracchus|spartacus|catiline|cicero|nero|trajan|diocletian|constantine/i,
    'Mesoamerican Civilizations': /maya|aztec|inca|olmec|teotihuacan|tenochtitlan|machu.*picchu|quetzalcoatl|chichen.*itza|tikal|palenque|nazca|moche|chavin|tiahuanaco|cuzco|moctezuma|atahualpa|pizarro|cortes|mesoamerica|chinampas|quipu/i,
    'Central Asian & Steppe Empires': /steppe.*(empire|nomad)|scythian|sarmatian|xiongnu|hun.*(attila|empire)|turkic.*(khaganate|empire)|khazar|seljuk|timur|tamerlane|timurid|moghulistan|uzbek.*khanate|kazakh.*khanate|golden.*horde|khan.*(mongol|tatar)|kurultai|yurt|steppe.*route|karakorum|samarkand|bukhara|khiva/i,
    'Medieval Europe (Feudalism & Crusades)': /feudalism|feudal.*(system|lord|hierarchy)|manor.*system|serf|vassal|knight|chivalry|medieval.*(europe|church|castle|catholic|monk|nun|monastery|pilgrim)|crusade|crusader.*(state|kingdom)|holy.*land|jerusalem.*(crusade|kingdom)|richard.*lionheart|saladin|pope.*(urban|crusade)|holy.*roman.*empire|charlemagne|norman.*conquest|1066|hastings|magna.*carta|hundred.*years.*war|joan.*arc|black.*death|plague.*(bubonic|europe)|inquisition|gothic.*(architecture|cathedral)|scholasticism|thomas.*aquinas|roger.*bacon|gutenberg|medici|hanseatic/i,
    'Byzantine & Ottoman Empires': /byzantine.*empire|constantinople.*(byzantine|capital|fall)|justinian|theodora|hagia.*sophia|iconoclast|eastern.*orthodox|greek.*fire|belisarius|theme.*system|basil.*(byzantine|macedonian)|paleologos|ottoman|osman|orhan|murad|mehmed.*(ii|conqueror)|fatih|fall.*constantinople|1453|suleiman.*(magnificent|ottoman)|janissary|devshirme|millet.*system|tulip.*period|sick.*man.*europe|tanzimat|young.*turk|dhimmi|pasha|bey|vizier|sublime.*porte/i,
    'Islamic Golden Age & Caliphates': /rashidun|umayyad|abbasid|caliphate|fatimid|mamluk|sultanate.*(mamluk|delhi)|islamic.*golden.*age|house.*wisdom|bayt.*hikma|baghdad.*(abbasid|round.*city)|cairo.*(fatimid|mamluk)|cordoba.*(caliphate|umayyad)|granada.*nasrid|alhambra|arabian.*nights|al.*khwarizmi|ibn.*sina|avicenna|ibn.*rushd|averroes|al.*farabi|al.*ghazali|ibn.*khaldun|razi|rhazes|al.*biruni|algebra|algorithm|astrolabe|calligraphy.*islamic|arabic.*(science|medicine|philosophy)/i,
    'Mongol Empire & Pax Mongolica': /mongol.*(empire|invasion|conquest|peace|pax)|chinggis.*khan|genghis|ogodei|guyuk|mongke|kublai.*khan|yuan.*dynasty|pax.*mongolica|golden.*horde|ilkhanate|chagatai|khagan|kuriltai|yasa|mongol.*(horse|archer|tactic)|karakorum|shangdu|xanadu|timur.*(mongol|lame)|mogul.*empire|tamerlane|moghulistan|steppe.*route|silk.*road.*mongol/i,
    'Medieval Africa (Ghana–Mali–Songhai)': /ghana.*(empire|medieval)|mali.*(empire|medieval)|songhai|timbuktu|mansa.*musa|askia.*mohammad|sundiata|epic.*sundiata|sahel|trans.?saharan.*trade|salt.*(trade|gold|mali)|gobar|kanem.*bornu|benin.*(kingdom|bronze)|zimbabwe.*(great|empire)|axum|aksum|ethiopia.*(medieval|solomonic)|lalibela|swahili.*(coast|city|trade)|kilwa|sofala|monomotapa|congo.*kingdom|african.*(kingdom|empire).*medieval/i,
    'Medieval Southeast Asia (Khmer–Srivijaya–Majapahit)': /khmer.*(empire|kingdom)|angkor.*(wat|thom|empire)|suryavarman|jayavarman|srivijaya|majapahit|gajah.*mada|pagaruyung|champa|dai.*viet|tran.*dynasty|le.*dynasty|ayutthaya|sukhothai|thailand.*(medieval|kingdom)|burma.*(pagan|medieval)|pagan.*kingdom|anawrahta|bayinnaung|taungoo|vietnam.*(medieval|dynasty)|nguyen|trinh|khmer.*(art|temple|sculpture)|baray|bayon|ta.*prohm/i,
    'Renaissance & Reformation': /renaissance|medici|florence.*renaissance|da.*vinci|michelangelo|raphael|donatello|botticelli|titian|humanism|printing.*press|gutenberg|shakespeare|protestant.*reformation|luther|martin.*luther|95.*theses|calvin|zwingli|anglican|church.*(of.*england|anglican)|counter.*reformation|council.*trent|jesuit|society.*jesus|ignatius.*loyola|trent.*council|inquisition.*(spanish|roman)|sola.*fide|sola.*scriptura|indulgence|predestination|puritan|huguenot|anabaptist|peace.*westphalia/i,
    'Age of Exploration & Colonization': /age.*exploration|columbus|vasco.*da.*gama|magellan|circumnavigation|conquistador|spanish.*(empire|colonization|conquest)|portuguese.*(empire|colonization|exploration)|treaty.*tordesillas|dutch.*(east.*india|empire|colonization)|british.*empire|french.*(empire|colonization)|english.*(colonization|settlement)|jamestown|plymouth|mayflower|thirteen.*colonies|mercantilism|triangular.*trade|middle.*passage|plantation.*(colony|economy)|columbian.*exchange|encomienda|viceroy|audiencia|cabot|hudson|cartier|la.*salle|james.*(cook|town)|captain.*cook/i,
    'American Revolution (1776)': /american.*revolution|thirteen.*colonies|declaration.*independence.*(1776|american)|thomas.*jefferson|george.*washington|benjamin.*franklin|paul.*revere|boston.*(tea.*party|massacre)|stamp.*act|intolerable.*act|continental.*congress|lexington.*concord|yorktown|saratoga|valley.*forge|federalist|anti.?federalist|constitution.*(us|american).*1787|bill.*rights.*(us|american)|constitutional.*convention|founding.*father|no.*taxation.*without.*representation/i,
    'French Revolution & Napoleon': /french.*revolution|1789|estates.*general|national.*assembly|tennis.*court.*oath|bastille|declaration.*rights.*man|reign.*terror|robespierre|danton|marat|guillotine|jacobin|girondin|cordelier|sans.?culotte|directory|napoleon.*(bonaparte|empire|wars|campaign|exile)|napoleonic.*(code|war)|battle.*(waterloo|austerlitz|trafalgar|borodino|leipzig)|continental.*system|holy.*alliance|congress.*vienna|metternich|restoration.*(french|bourbon)/i,
    'Industrial Revolution & Capitalism': /industrial.*revolution|steam.*engine|james.*watt|spinning.*jenny|power.*loom|cotton.*(gin|mill)|factory.*(system|town)|urbanization.*(industrial|19th)|railroad.*(industrial|revolution)|iron.*(bridge|smelting)|coal.*(mine|industrial)|capitalism|adam.*smith|karl.*marx|communist.*manifesto|dickens.*(industrial|london)|child.*labor.*(industrial|factory)|luddite|chartist|labor.*(movement|union).*industrial|enclosure.*movement/i,
    'Nationalism & Unification (Italy–Germany)': /nationalism.*(19th|europe|unification)|unification.*(italy|german)|italian.*unification|risorgimento|garibaldi|cavour|mazzini|red.*shirts|kingdom.*italy.*(1861|1870)|german.*unification|otto.*von.*bismarck|iron.*chancellor|zollverein|north.*german.*confederation|frankfurt.*parliament|prussia.*(german|unification)|realpolitik|1871.*(german|empire|unification)|william.*(i|ii).*german|balkan.*nationalism|pan.?slavism|austro.?hungarian|dual.*monarchy|habsburg/i,
    'Imperialism & Scramble for Africa': /imperialism.*(19th|europe|africa|asia)|scramble.*africa|berlin.*conference.*(1884|1885)|colonization.*(africa|asia)|white.*man.*burden|rudyard.*kipling|british.*(raj|empire|imperial)|french.*(indochina|west.*africa|north.*africa|colonial)|belgian.*congo|king.*leopold|congo.*free.*state|dutch.*(indies|east.*indies)|spanish.*(empire|american.*war)|portuguese.*(angola|mozambique)|opium.*wars|boxer.*rebellion|sphere.*influence|gunboat.*diplomacy|crown.*(colony|jewel)|dominion|jingoism|social.*darwinism|mission.*civilisatrice|indirect.*rule|assimilation.*(french|colonial)/i,
    'World War I': /world.*war.*(1|i|one)|great.*war|1914.*(war|france|germany)|1918.*(armistice|november|end.*war)|trench.*warfare|western.*front|eastern.*front|gallipoli|somme|verdun|marne|yspres|passchendaele|luisitania|sinking.*lusitania|unrestricted.*submarine.*warfare|zeppelin|tank.*(wwi|world.*war.*i)|mustard.*gas|machine.*gun.*(wwi|war)|fokker|red.*baron|richthofen|central.*powers|allied.*powers.*(wwi|war)|triple.*entente|triple.*alliance|schlieffen.*plan|archduke.*franz.*ferdinand|sarajevo.*(assassination|1914)|fourteen.*points|wilson.*(14|fourteen)|league.*nations|treaty.*versailles|reparations.*(german|wwi)|weimar.*republic|war.*guilt.*clause/i,
    'Russian Revolution & Soviet Union': /russian.*revolution.*(1917|february|october)|bolshevik|menshevik|lenin|trotsky|red.*army|white.*army|civil.*war.*(russia|russian)|tsar.*nicholas.*(ii|romanov)|romanov.*(family|execution)|soviet.*(union|socialist|republic|state|system)|stalin|collectivization|five.*year.*plan|gulag|great.*purge|show.*trial|khrushchev|destalinization|brezhnev|gorbachev|perestroika|glasnost|dissident.*(soviet|russia)|solidarity.*(poland|shipyard)|warsaw.*pact|comintern|nep.*(lenin|soviet)|war.*communism|russian.*(civil.*war|famine|revolution)/i,
    'Interwar Period & Great Depression': /interwar|great.*depression|1929.*(crash|depression|wall.*street)|stock.*market.*crash.*1929|wall.*street.*crash|new.*deal|franklin.*roosevelt|fdr.*(new.*deal|president)|dust.*bowl|hoover|roaring.*twenties|jazz.*age|prohibition.*(us|18th)|speakeasy|flapper|depression.*(1930s|economic)|keynes|keynesian|brown.*shirt|nazi|fascist.*(italy|europe)|mussolini|hitler.*(rise|mein.*kampf|nazi)|spanish.*civil.*war|franco|appeasement|munich.*agreement|anschluss|sudetenland|nazi.?soviet.*pact|locarno.*treaty|kellogg.?briand/i,
    'World War II': /world.*war.*(2|ii|two)|second.*world.*war|1939.*(war|poland|germany)|1945.*(war.*end|hiroshima|nagasaki|victory)|blitzkrieg|phoney.*war|battle.*(britain|stalingrad|midway|normandy|bulge|berlin).*ww2|d.?day|normandy.*(invasion|landing)|pearl.*harbor|holocaust|auschwitz|final.*solution|nuremberg.*(trial|rally|law)|genocide.*(jewish|holocaust)|lend.?lease|atlantic.*charter|allied.*powers.*(ww2|war)|axis.*powers|nazi.*(party|germany|ideology)|fascist.*italy|imperial.*japan|manhattan.*project|atomic.*(bomb|weapon).*ww2|hiroshima|nagasaki|yalta|potsdam|united.*nations.*(charter|1945)|marshall.*plan|berlin.*(blockade|airlift)|cold.*war/i,
    'Cold War (1947–1991)': /cold.*war|truman.*doctrine|marshall.*plan|berlin.*(blockade|airlift|crisis.*(1948|wall))|berlin.*wall|nato|warsaw.*pact|korean.*war|cuban.*missile.*crisis|vietnam.*war|sputnik|space.*race|arms.*race|nuclear.*(deterrence|proliferation).*cold.*war|detente|salt.*(i|ii|treaty)|reagan.*(cold.*war|star.*wars|sdi)|iron.*curtain|churchill.*iron.*curtain|containment|domino.*theory|proxy.*war|afghanistan.*(soviet|1979|war)|angola.*(civil.*war|cold.*war)|cambodia.*(khmer.*rouge|cold.*war)|cia|kgb|eastern.*bloc|non.?aligned.*movement|nam|prague.*spring|hungary.*(1956|revolution)|solidarity.*poland|glasnost|perestroika|fall.*berlin.*wall|1989.*(revolutions|fall.*wall|tiananmen)|collapse.*(soviet|ussr).*1991|yeltsin|cis/i,
    'Decolonization & UN System': /decolonization|independence.*(africa|asia|colony)|united.*nations.*(founding|general.*assembly|security.*council|charter|system)|un.*(peacekeeping|human.*rights|council|agency)|general.*assembly|security.*council.*(reform|permanent|veto)|secretary.*general|international.*court.*justice|bandung.*conference|non.?aligned|palestine.*(partition|1947|un)|israel.*(creation|1948)|suez.*crisis|algeria.*(war|independence)|kenya.*(mau.*mau|independence)|ghana.*(independent|nkrumah)|nasser.*(egypt|pan.?arab)|sukarno|african.*union|oau|commonwealth.*(nations|organization)|french.*(indochina|algeria.*war)|portuguese.*(decolonization|africa)|belgian.*congo.*(independence|congo.*crisis)|mozambique.*(frelimo|independence)|angola.*(independence|civil.*war)/i,
    'Post-Cold War World (1991–2001)': /post.?cold.*war|new.*world.*order|1991.*(gulf.*war|soviet.*collapse|yugoslavia.*war)|gulf.*war.*(1991|first|desert.*storm)|iraq.*(kuwait.*invasion|gulf.*war)|yugoslavia.*(dissolution|wars|civil.*war)|bosnia.*(war|genocide)|srebrenica|kosovo.*(war|intervention)|rwanda.*(genocide|1994)|somalia.*(civil.*war|united.*nations)|haiti.*(coup|intervention)|east.*timor.*(independence|referendum)|chechnya.*(war|russia)|russian.*(crisis|1998)|asian.*financial.*crisis.*(1997|1998)|wto.*(founding|1995)|european.*union.*(euro|treaty.*maastricht|1993)|maastricht.*treaty|euro.*(currency|introduction)|nato.*(expansion|enlargement)|dayton.*agreement|oslo.*accords|middle.*east.*peace.*(process|oslo)/i,
    'War on Terror & Middle East (2001–)': /9.?11|september.*11|al.?qaeda|osama.*bin.*laden|war.*terror|afghanistan.*(2001|war|invasion|taliban|isaf|enduring.*freedom)|iraq.*(2003|war|invasion|surge|weapons.*mass.*destruction)|isis|isil|syria.*(civil.*war|revolution|assad)|arab.*spring|libya.*(2011|civil.*war|gaddafi)|yemen.*(civil.*war|houthi)|drone.*(strike|warfare)|guantanamo|abu.*ghraib|snowden|wikileaks|iran.*(nuclear.*deal|jCPOA|sanctions|revolution.*(1979|guard))|hezbollah|hamas|gaza.*(war|conflict)|israel.*(gaza|hezbollah|palestine.*conflict)|middle.*east.*(conflict|war|peace)/i,
    'Globalization & International Trade': /globalization|international.*trade|wto|world.*trade.*organization|trade.*(war|tariff|barrier|agreement|liberalization)|global.*supply.*chain|multinational.*(corporation|enterprise)|foreign.*direct.*investment|fdi|global.*financial.*crisis.*2008|subprime.*(mortgage|crisis)|great.*recession|economic.*(integration|interdependence)|regional.*(trade|integration).*agreement|free.*trade.*(agreement|zone)|tpp|rcep|usmca|nafta.*(replacement|usmca)|european.*union.*(single.*market|euro|crisis|brexit)|brexit|gatt|washington.*consensus|neoliberalism|global.*(inequality|south|north)|offshoring|outsourcing|global.*value.*chain/i,
    'Contemporary World Politics': /contemporary.*(world|global).*politics|global.*(politics|governance)|multilateral|unipolar.*world|multipolar|g7|g20.*(summit|politics)|brics|sco.*(summit|politics)|european.*union.*(politics|policy|commission|parliament)|us.*(election|politics|foreign.*policy|president|biden|trump|obama|bush)|china.*(rise|power|belt.*road|bri|global.*influence|political|party|xi.*jinping|foreign.*policy|south.*china.*sea|taiwan.*(strait|status))|russia.*(ukraine|war|putin|foreign.*policy|sanctions)|ukraine.*(war|russia|crisis|conflict|2022)|north.*korea.*(nuclear|missile|kim)|iran.*(nuclear|sanctions|foreign.*policy)|turkey.*(erdogan|foreign.*policy)|middle.*east.*(politics|conflict|peace)/i,
    'World Economy & Global Crises': /global.*(economy|economic.*crisis|recession|financial.*crisis|inflation|recovery)|world.*(economy|economic.*outlook|bank)|imf.*(program|loan|crisis)|world.*bank|gdp.*(global|world)|recession.*(global|world)|inflation.*(global|world)|supply.*chain.*(crisis|disruption)|commodity.*(price|boom|crisis)|oil.*(price|crisis|shock)|energy.*(crisis|price|security)|food.*(crisis|price|security)|debt.*(crisis|global|developing)|sovereign.*debt|cryptocurrency|bitcoin|blockchain|fintech.*(global|world)|digital.*(currency|economy).*global|pandemic.*(economic|recovery)|stimulus.*(package|global)|monetary.*policy.*(global|fed)|federal.*reserve|interest.*rate.*(global|fed)|taper.*tantrum|quantitative.*easing|currency.*(war|devaluation)/i,
    'Human Rights & International Law': /human.*rights|universal.*declaration.*human.*rights|udhr|international.*(human.*rights|covenant|court.*justice|law|criminal.*court|tribunal)|geneva.*convention|war.*crime|crime.*(against.*humanity|war)|genocide.*convention|refugee.*(convention|status|crisis)|migrant.*(crisis|rights)|asylum.*(seek|policy)|icc|icj|nuremberg.*trial|tokyo.*trial|tribunal.*(yugoslavia|rwanda|cambodia)|truth.*commission|apartheid|south.*africa.*(apartheid|mandela|truth.*commission)|transitional.*justice|human.*rights.*(watch|council|commission)|un.*human.*rights.*council|freedom.*(speech|press|assembly|religion)|civil.*(rights|liberty)|torture.*(ban|convention)|death.*penalty.*(international|human.*rights)|lgbtq.*(rights|international)|women.*rights.*(international|global)|child.*rights.*(convention|international)|indigenous.*(rights|people).*international/i,
    'Nuclear Proliferation & Disarmament': /nuclear.*(proliferation|non.?proliferation|disarmament|weapon|test|treaty|agreement)|npt|non.?proliferation.*treaty|ctbt|comprehensive.*test.*ban.*treaty|test.*ban.*treaty|fissile.*material.*cut.?off.*treaty|fmct|iaea|nuclear.*(supplier.*group|safeguard)|nuclear.*(free.*zone|weapon.*free)|nuclear.*(deterrence|umbrella|posture)|disarmament.*(conference|negotiation)|strategic.*(arms.*reduction|weapon)|new.*start|salt.*(treaty|agreement)|abm.*treaty|inf.*treaty|iran.*(nuclear.*deal|jCPOA)|north.*korea.*(nuclear|denuclearization|six.*party)|nuclear.*(latency|hedging)|weapon.*of.*mass.*destruction|wmd|chemical.*weapon.*(convention|ban)|biological.*weapon.*(convention|ban)/i,
    'Global Environmental Governance': /global.*environment|climate.*change.*(global|international|un|paris|kyoto|copenhagen|cop)|paris.*agreement.*(climate|2015)|kyoto.*protocol|cop.*(unfccc|climate|summit)|unfccc|ipcc.*(report|assessment|climate)|global.*(commons|environment|governance|south.*climate|warming|emission|carbon|temperature)|climate.*(justice|equity|finance|loss.*damage|adaptation|mitigation|resilience|technology|transition)|green.*(climate.*fund|new.*deal|transition)|sustainable.*development.*(goal|climate)|ozone.*(layer|depletion)|biodiversity.*(loss|conservation|convention)|cbd|antartic.*(treaty|consensus|environment)|high.*seas.*(treaty|conservation)|outer.*space.*(treaty|commons)/i,
    'Pandemics & Global Health Governance': /pandemic.*(global|world|health)|covid.*(pandemic|global|world|who|vaccine|health)|who|world.*health.*organization|global.*health.*(governance|security|crisis)|epidemic.*(global|world)|ebola.*(outbreak|global)|zika.*(virus|outbreak)|h1n1|sars.*(2003|outbreak)|mers.*(coronavirus|outbreak)|vaccine.*(global|distribution|equity|covax)|covax|global.*fund.*(aids|tuberculosis|malaria)|gavi|vaccine.*alliance|global.*(health|disease).*outbreak|health.*(emergency|security).*global|pandemic.*(preparedness|response|treaty)|universal.*health.*coverage.*(global|uhc)|non.?communicable.*disease.*(global|who)|tobacco.*(control|who.*fctc)|mental.*health.*(global|who)/i,
    'Cyberspace & Digital Divide': /cyberspace|cyber.*(space|security|attack|crime|warfare)|internet.*(governance|freedom|censorship|regulation|access)|digital.*(divide|inclusion|economy|transformation)|ict.*(global|development)|artificial.*intelligence.*(global|governance|ethics)|data.*(privacy|protection|governance).*global|net.*neutrality|cyber.*(treaty|norm|policy)|icann|internet.*governance.*forum|digital.*(public.*good|cooperation|sovereignty)|surveillance.*(state|global)|encryption|dark.*web|cyber.*(domain|threat|attack|security).*global|critical.*infrastructure.*(cyber|protection)|cyber.*diplomacy|technology.*(divide|gap)/i,
    'Space Race & Global Space Programs': /space.*(race|exploration|program|mission|agency).*(global|us|soviet|russia|china|europe|japan|india)|sputnik|apollo.*(program|moon|11)|moon.*(landing|mission|race)|nasa.*(space|mission|program|exploration)|esa|european.*space.*agency|roscosmos|russian.*space|cnsa|china.*space|jaxa|japan.*space|artemis.*(program|moon)|mars.*(rover|mission|exploration)|perseverance|curiosity|opportunity|spirit|voyager|hubble.*(telescope|space)|james.*webb|international.*space.*station|iss|spacex|falcon|starship|dragon.*(spacex|crew)|commercial.*space|space.*(tourism|mining|colony|laboratory|station)|satellite.*(communication|navigation|remote.*sensing)|gps|galileo.*(satellite|navigation)|glonass|space.*(science|research|technology|debris)/i,
    'India–Pakistan Relations': /india.*pakistan|pakistan.*india|indo.?pak|kashmir.*(dispute|conflict)|siachen|line.*control|ceasefire.*(violation|border)|wular.*(lake|barrage)|kishanganga|baglihar|tulbul.*navigation|most.*favored.*nation.*(india|pakistan)|sir.*creek|wagh.*border|attari.*border|samjhauta|shimla.*agreement|labor.*delhi.*bus|composite.*dialogue|pathankot.*(attack|uri)|uri.*attack|pulwama|balakot|cross.*border.*terrorism|hafiz.*saeed|masood.*azhar|jem|let|fidayeen|surgical.*strike|nuclear.*(india.*pakistan|south.*asia)|bilateral.*(india|pakistan)|trade.*(india.*pakistan|wagah)/i,
    'India–China Relations': /india.*china|china.*india|sino.?indian|doklam|galwan|pantroops|border.*(dispute|standoff|confrontation).*(india|china)|line.*actual.*control|lac|panchen.*lam.*(india|china)|fdi.*(china|india.*china)|belt.*road.*(india|china)|bri.*(india|chinese)|chinese.*(encroachment|incursion|aggression)|india.*(chinese|china).*border|india.*china.*(trade|investment|culture|relation)/i,
    'India–Nepal–Bhutan Relations': /india.*nepal|nepal.*india|india.*bhutan|bhutan.*india|kalapani|lipulekh|limpiyadhura|susta|mahakali.*(treaty|river)|sharda.*(treaty|river)|tanakpur|gandak|kosi.*(treaty|barrage)|peace.*friendship.*treaty.*(india|nepal)|nepal.*(communist|maoist|prime.*minister|king).*india|bhutan.*(hydropower|india|relation)|hydro.?electric.*(nepal|bhutan).*india|bhutan.*(gross.*national.*happiness|king)|saarc.*(nepal|bhutan)|bilateral.*(india|nepal|bhutan)/i,
    'India–Bangladesh–Myanmar Relations': /india.*bangladesh|bangladesh.*india|teesta.*(river|water.*sharing)|ganga.*water.*treaty|farakka.*(barrage|treaty)|land.*boundary.*agreement.*(india|bangladesh)|enclave.*(india|bangladesh)|chitmahal|muhuri.*river|india.*myanmar|myanmar.*india|kaladan.*(project|multimodal)|sittwe.*port|india.*myanmar.*(border|trade)|bilateral.*(india|bangladesh|myanmar)|rohingya.*(india|bangladesh)|india.*(bangladesh|myanmar).*(border|trade)/i,
    'India–Sri Lanka–Maldives Relations': /india.*sri.*lanka|sri.*lanka.*india|katchatheevu|fish.*(india.*sri.*lanka|tamil.*nadu.*sri.*lanka)|tamil.*(sri.*lanka|issue).*(india|sri.*lanka)|ipkf|indian.*peace.*keeping.*force|ltte|sri.*lanka.*(civil.*war|buddhist|sinhalese)|india.*maldives|maldives.*india|maldives.*(china|india.*relation)|gan.*(maldives|addu)|bilateral.*(india|sri.*lanka|maldives)|indian.*ocean.*(security|island).*(sri.*lanka|maldives)/i,
    'India–Afghanistan–Iran–Central Asia': /india.*afghanistan|afghanistan.*india|chabahar.*(port|india)|india.*iran|iran.*india|north.?south.*transport.*corridor|nstc|ashgabat.*agreement|india.*central.*asia|central.*asia.*india|uzbekistan.*india|kazakhstan.*india|turkmenistan.*india|tajikistan.*india|kyrgyzstan.*india|afghan.*(peace|tapi|war|taliban).*india|tapi.*(pipeline|india)|india.*(afghanistan|iran).*development|bilateral.*(india|afghanistan|iran|central.*asia)/i,
    'India–US Relations': /india.*united.*states|us.*india|usa.*india|indo.?us|india.*us.*(nuclear|civil|deal|2\+2|defence|trade|strategic|i2u2|quad|malabar)|i2u2|us.*india.*(nuclear|civil|deal|defence|trade)|us.?india.*(nuclear|deal|agreement|strategic)|india.*america|america.*india|defence.*(india.*us|us.*india)|trade.*(india.*us|us.*india)|bilateral.*(india|us).*(trade|defence|nuclear)|h1b.*(india|visa)|india.*(us.*visit|washington|obama|trump|biden|bush|clinton)|us.*(india.*visit|delhi|mumbai|modi)/i,
    'India–Russia Relations': /india.*russia|russia.*india|indo.?russia|soviet.*india|india.*soviet|brahmos|s400.*(india|triumf)|sukhoi.*(india|su.?30)|mig.*(india|russian)|t.?90.*(tank|india)|kalashnikov|ak.*(india|russian)|india.*russia.*(defence|trade|nuclear|energy|oil|gas|drill|kudankulam)|russia.*india.*(defence|trade|nuclear)|bilateral.*(india|russia).*(defence|trade|nuclear)|eastern.*economic.*forum.*(india|russia)|vostok.*(exercise|india)|india.*(russia.*visit|putin|moscow)|russia.*(india.*visit|delhi|modi)|ukraine.*(india|russia).*position|india.*ukraine.*(russia|war)/i,
    'India–Europe Relations': /india.*europe|europe.*india|eu.*india|european.*union.*india|india.*eu|india.*(france|germany|uk|britain|italy|spain|netherlands|sweden|finland|poland|portugal|belgium|austria|switzerland|denmark|norway|europe).*(trade|deal|summit|visit|defence|investment|strategic|technology)|france.*india.*(defence|nuclear|rafale|scorpene|strategic)|germany.*india.*(trade|investment|skilled.*worker|green|hydrogen)|uk.*india.*(trade|deal|partnership|commonwealth)|bilateral.*(india|eu|europe).*(trade|investment|defence)/i,
    'India–Japan–Australia–Indo-Pacific': /india.*japan|japan.*india|india.*australia|australia.*india|india.*(japan|australia).*(trade|deal|investment|defence|maritime|strategic|infrastructure|tech)|japan.*india.*(shinkansen|bullet.*train|high.?speed.*rail|mumbai.*ahmedabad|defence|investment|technology)|australia.*india.*(trade|coal|uranium|lithium|education|migration|strategic)|quad|quadrilateral.*security.*dialogue|quad.*(summit|naval|exercise)|indo.?pacific.*(strategy|policy|oceans|free.*open)|indian.*ocean.*(indo.?pacific|rim|security)|malabar.*exercise|maritime.*(cooperation|security).*(india|japan|australia)/i,
    'India–Gulf & West Asia': /india.*(gulf|west.*asia|middle.*east|saudi|uae|qatar|oman|bahrain|kuwait|israel|palestine|jordan|lebanon|syria|yemen|iraq|turkey|west.*asia)|gulf.*(india|council|cooperation).*india|gcc|saudi.*india|uae.*india|israel.*india|india.*israel|india.*(gulf|middle.*east|west.*asia).*(trade|oil|energy|diaspora|remittance|labour|defence|intelligence|security|terrorism|culture)/i,
    'India–Africa Relations': /india.*africa|africa.*india|india.?africa.*(summit|forum|partnership|trade|investment|defence|maritime|culture)|african.*union.*india|india.*(south.*africa|nigeria|kenya|ethiopia|tanzania|uganda|ghana|senegal|mozambique|mauritius|seychelles|madagascar|rwanda|angola|zambia|zimbabwe|botswana|namibia|morocco|egypt|algeria|tunisia|sudan|drc|congo).*(trade|investment|aid|defence|maritime|culture|diaspora)|pan.?african.*(india|e.?network)|e.?network.*(india|africa)|india.*(africa).*(oil|energy|resources|agriculture|pharma|health)|bilateral.*(india|africa)/i,
    'India–ASEAN & East Asia Summit': /india.*asean|asean.*india|india.*(south.*east.*asia|east.*asia|vietnam|indonesia|malaysia|singapore|thailand|philippines|cambodia|laos|myanmar|brunei|east.*timor|south.*korea|korea|mongolia|taiwan)|act.*east|look.*east.*(policy|asia)|east.*asia.*summit|india.*(vietnam|indonesia|malaysia|singapore|thailand|philippines|cambodia|laos|korea).*(trade|defence|maritime|investment|culture|strategic)|bilateral.*(india|asean|vietnam|indonesia|singapore|thailand|malaysia|korea)/i,
    'United Nations & Reform': /united.*nation.*(system|reform|security.*council|general.*assembly|secretary.*general|charter|peacekeeping|agency|program)|un.*(reform|security.*council|general.*assembly|secretary.*general|peacekeeping|agency)|security.*council.*(reform|expansion|permanent.*seat|veto)|india.*un.*(security.*council|reform|seat|veto)|g4.*(un|india)|un.*(peacekeeping|mission|force).*india|india.*un.*(peacekeeping)/i,
    'WTO, IMF, World Bank & Bretton Woods': /wto|world.*trade.*organization|imf|international.*monetary.*fund|world.*bank|bretton.*woods|gatt|trade.*(dispute|war|tariff|barrier|negotiation|round|doha|uruguay|tokyo).*(wto|global)|doha.*(round|development.*agenda)|wto.*(india|developing|dispute|agriculture|subsidy|patent|trips|services)|imf.*(loan|program|quota|reform|sdr|india|developing)|world.*bank.*(loan|project|india|developing|poverty|infrastructure)|new.*development.*bank|ndb.*(bank|brics)|asian.*infrastructure.*investment.*bank|aiib/i,
    'BRICS, SCO, G20 & Multilateral Forums': /brics|sco|shanghai.*cooperation.*organisation|g20|g.?20|group.*(twenty|seven|eight|77)|g7|g8|g77|new.*development.*bank|ndb.*(bank|brics)|brics.*(summit|bank|currency|expansion)|sco.*(summit|security|exercise|expansion)|g20.*(summit|finance|trade|digital|health|climate|pandemic|debt|crisis)|quad|malabar.*exercise|i2u2|group.*(india|china|russia|developing|emerging)|emerging.*(economy|market).*forum/i,
    'SAARC, BIMSTEC & Regional Organisations': /saarc|bimstec|bbin|mekong.*ganga|india.*(saarc|bimstec|bbin|mekong|ganga.*cooperation)|regional.*(forum|organisation|cooperation|integration).*(south.*asia|bay.*bengal|himalaya|indo.?pacific)|sub.?regional.*(cooperation|group).*(india|south.*asia)|south.*asian.*(association|region|cooperation)|bay.*bengal.*(initiative|region)|sagq|indian.*ocean.*(rim|association|forum)|iora|iorn|commonwealth.*(forum|summit|india)/i,
    'Nuclear Disarmament & Non-Proliferation': /nuclear.*(disarmament|non.?proliferation|weapon.*free|npt|ctbt|fmct)|npt|non.?proliferation.*treaty|ctbt|comprehensive.*test.*ban.*treaty|fissile.*material.*cut.?off.*treaty|fmct|iaea|nuclear.*(safeguard|supplier.*group|free.*zone|weapon.*free)|disarmament.*(conference|india)|nuclear.*(doctrine|posture|deterrence|umbrella).*(india)|india.*nuclear.*(doctrine|policy|no.?first.?use)|nuclear.*(deal|agreement|cooperation).*(india|us|france|russia|canada|japan|australia|argentina|kazakhstan)/i,
    'Climate Change & Global Commons': /climate.*(change|action|policy|finance|adaptation|mitigation|resilience|conference|negotiation).*(global|un|india|paris|kyoto|cop|ipcc)|paris.*(agreement|accord|climate)|kyoto.*protocol|cop.*(unfccc|climate|summit)|unfccc|ipcc.*(report|assessment|climate)|global.*(commons|environment|governance|south.*climate|warming|emission|carbon|temperature)|climate.*(justice|equity|finance|loss.*damage|adaptation|mitigation|resilience|technology|transition)|green.*(climate.*fund|new.*deal|transition)|sustainable.*development.*(goal|climate)|ozone.*(layer|depletion)|biodiversity.*(loss|conservation|convention)|antartic.*(treaty|consensus|environment)|high.*seas.*(treaty|conservation)|outer.*space.*(treaty|commons)/i,
    'Terrorism & Global Security': /terrorism.*(global|international|india|security)|counter.?terrorism|terrorist.*(attack|organization|group|financing|sanction)|un.*(terrorism|counter.?terrorism|security.*council.*terror)|global.*(terrorism|security|threat|challenge)|india.*(terrorism|counter.*terror|terror|security).*(pakistan|china|nepal|bangladesh|myanmar|afghanistan|sri.*lanka)|cross.?border.*terrorism|fidayeen|suicide.*(attack|bomber)|hawala|terror.*(finance|funding)|fatf|global.*(counter.?terror|security.*forum)|international.*(security|peace|conflict|war).*(india|global)/i,
    'Diaspora & Soft Power': /indian.*diaspora|diaspora.*india|nri|overseas.*indian|pio|oci|remittance.*india|soft.*power.*(india|culture|yoga|ayurveda|bollywood|cuisine|spirituality|festival|diwali|holi|buddhism)|cultural.*(diplomacy|exchange|festival).*india|bollywood.*(global|international|india)|yoga.*(international|diplomacy|day)|ayurveda.*(global|international)|food.*(india|diaspora|culture).*soft|indian.*(festival|cuisine|spirituality|philosophy|language|literature|cinema|music|dance|art).*abroad|india.*(soft|diaspora|image|brand|global.*outreach)|modi.*(diaspora|howdy|namaste|welcome).*(us|uk|canada|australia|germany|france|japan|uae|singapore|israel|dubai|sydney|london|new.*york|san.*jose|washington)/i,
    'Look East / Act East Policy': /look.*east|act.*east|act.?east.*(policy|initiative)|india.*(east.*asia|asean|pacific|indo.?pacific|vietnam|indonesia|singapore|malaysia|thailand|philippines|cambodia|laos|myanmar|japan|south.*korea|australia|new.*zealand|fiji|png|timor).*(policy|strategy|relation|engagement|trade|defence|maritime|culture|connectivity)|east.*(asia.*summit|policy)|india.*(east|south.*east|asia.*pacific).*(engagement|outreach|integration)|india.*(myanmar|thailand).*(highway|trilateral|connectivity)|india.*(vietnam|indonesia).*(oil|gas|defence|maritime)/i,
    'Neighbourhood First Policy': /neighbourhood.*first|neighbourhood.*(policy|initiative|priority)|india.*(neighbour|neighbourhood|south.*asia|saarc|bimstec|bbin|nepal|bhutan|bangladesh|sri.*lanka|maldives|myanmar|afghanistan|pakistan|china).*(policy|engagement|relation|aid|assistance|development|connectivity|trade|investment|security)|gujral.*(doctrine|principle)|india.*(doctrine|neighbourhood|priority.*neighbour)/i,
    'Maritime Security & Indian Ocean': /indian.*ocean.*(security|region|strategy|policy|navy|dominance|island|rim|commission|association|ior|iorn|maritime|trade|route|choke.*point|sea.*lane|security|conflict|hegemony|naval.*base|cooperation)|maritime.*(security|strategy|policy|domain|awareness|cooperation|exercise|law|boundary|dispute|zone).*(india|indian.*ocean)|navy.*(india|indian.*ocean|exercise|operation|drill|blue.*water)|sea.*(lane|route|trade).*(india|indian.*ocean|security)|coast.*guard.*(india|exercise|security)|blue.*(economy|water|navy).*(india)|andaman.*(nicobar|sea|island|naval|base)|lakshadweep.*(security|base)|choke.*point.*(india|indian.*ocean)|malacca.*(strait|india|security)|sunda.*(strait|india)|hormuz.*(strait|india)|bab.?el.?mandeb.*(india|strait)/i,
    'Border Disputes & Cross-Border Infrastructure': /border.*(dispute|conflict|standoff|incursion|management|infrastructure|road|fence|post|village|trade|market|haat|pass|connectivity|bridge|tunnel).*(india|china|pakistan|nepal|bhutan|bangladesh|myanmar|sri.*lanka)|line.*(actual.*control|control|boundary).*(india|china|pakistan)|border.*(haat|trade|connectivity).*(india|bangl.*nepal|bhutan|myanmar)|border.*(infrastructure|road|fence).*(india|china|pakistan)|cross.?border.*(trade|connectivity|infrastructure|pipeline|highway|railway|bridge|tunnel|power.*grid|electricity).*(india|nepal|bhutan|bangladesh|myanmar|pakistan|china)|connectivity.*(india|south.*asia|east.*asia)/i,
    'Constitution Framework & Philosophy': /constitution.*(of.*india|indian|framework|philosophy|making|adoption|enactment|assembly)|constituent.*assembly.*(india|debate|drafting|committee)|framing.*constitution|republic.*(india|constitution)|sovereign.*socialist.*secular.*democratic|we.*the.*people/i,
    'Preamble & Basic Structure': /preamble.*(constitution|india|amendment)|basic.*structure.*doctrine|kesavananda.*bharati|minerva.*mills|sovereign.*socialist.*secular.*democratic.*republic|justice.*(social|economic|political)|liberty.*(thought|expression|belief|faith|worship)|equality.*(status|opportunity)|fraternity.*(dignity|unity|integrity)/i,
    'Fundamental Rights': /fundamental.*right|right.*(equality|freedom|exploitation|religion|constitutional.*remedy|life|personal.*liberty|education|information|speech|expression|assembly|association|movement|residence|profession|conscience|faith|worship|petition|constitution)|article.*(14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35).*(right|fundamental)|writ.*(habeas.*corpus|mandamus|prohibition|quo.*warranto|certiorari)|public.*interest.*litigation|pil.*(india|court)|right.*(privacy|internet|health|education).*india|right.*information.*(act|rti)|right.*education.*(act|rte)/i,
    'Directive Principles & Fundamental Duties': /directive.*principle|dpsp|state.*policy.*principle|article.*(36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51).*(directive|principle)|gandhian.*principle|uniform.*civil.*code|ucc|panchayati.*raj.*(directive|constitution)|fundamental.*duty|article.*51a|citizen.*(duty|responsibility).*constitution|swaran.*singh.*committee/i,
    'Parliament (Lok Sabha & Rajya Sabha)': /parliament.*(india|indian|lok.*sabha|rajya.*sabha|session|house|member|bill|act|question.*hour|zero.*hour|adjournment|motion|debate|committee|summon|prorogue|dissolve)|lok.*sabha.*(speaker|deputy|member|election|constituency|seat|reservation|strength|power|function)|rajya.*sabha.*(chairman|deputy|member|election|seat|strength|power|function)|budget.*session|monsoon.*session|winter.*session|question.*(hour|time)|zero.*hour|no.?confidence.*motion|adjournment.*motion|censure.*motion|privilege.*motion|money.*bill|finance.*bill|ordinary.*bill|constitutional.*amendment.*bill|private.*member.*bill|parliamentary.*committee|select.*committee|standing.*committee|joint.*committee/i,
    'President & Vice President': /president.*(india|of.*india|election|power|function|role|impeachment|vacancy|oath|term|qualification|privilege|pardon|veto|ordinance|emergency|rule|address|message|reference|nomination|appointment)|vice.*president.*(india|of.*india|election|power|function|role|vacancy|oath|term|qualification)|president.*(rule|emergency|ordinance|pardon|veto|address|nomination|appointment)|election.*(president|vice.*president).*india|impeachment.*president/i,
    'Prime Minister & Council of Ministers': /prime.*minister.*(india|of.*india|appointment|power|function|role|oath|resignation|removal|vacancy|council.*minister|office)|council.*minister.*(india|union|appointment|power|function|role|responsibility|collective|individual)|cabinet.*(minister|india|union|committee|meeting|decision|power)|minister.*(union|cabinet|state|deputy|independent.*charge)|collective.*responsibility|individual.*responsibility|government.*(formation|reshuffle|expansion|ministry|portfolio)/i,
    'Supreme Court & High Courts': /supreme.*court.*(india|judge|chief.*justice|power|jurisdiction|judgment|case|appeal|review|writ|contempt|rule|bench|division.*bench|constitution.*bench|collegium|appointment|transfer|impeachment|retirement)|high.*court.*(india|judge|chief.*justice|power|jurisdiction|judgment|appeal|review|writ|contempt|rule|bench|collegium|appointment|transfer|impeachment|retirement)|chief.*justice.*india|collegium.*system|judicial.*(appointment|transfer|review|activism|reform|accountability|independence|overreach)/i,
    'Judicial Review & Activism': /judicial.*(review|activism|overreach|restraint|independence|accountability|reform|appointment|transfer)|judicial.*review.*(constitution|india|power|scope)|judicial.*activism.*(india|public.*interest|pil|environment|social|right)|public.*interest.*litigation|pil.*(india|environment|social|court)|writ.*(jurisdiction|power).*(supreme.*court|high.*court)|collegium.*(system|controversy|replacement)|njac.*(case|judgment)|national.*judicial.*appointment.*commission|judicial.*(accountability|reform|corruption)/i,
    'Federal System & Centre–State Relations': /federal.*(system|structure|india|polity|government|relation|division.*power)|centre.?state.*(relation|financial|legislative|administrative|dispute|commission|conflict|cooperation)|union.?state.*(relation|financial|legislative|administrative|dispute|commission)|federalism.*(india|indian|cooperative|competitive|asymmetric)|union.*list|state.*list|concurrent.*list|residuary.*power|article.*(245|246|247|248|249|250|251|252|253|254|255|256|257|258|259|260|261|262|263).*(centre|state|federal)|inter.?state.*(council|dispute|river|water|border)|sarkaria.*(commission|report)|punchi.*(commission|report)|rajamannar.*(committee|report)|finance.*commission.*centre.?state|gst.*(centre|state|federal|council)/i,
    'Local Government (Panchayats & Municipalities)': /panchayati.*raj|panchayat.*(raj|institution|election|act|constitution|73rd|amendment|schedule)|73rd.*amendment|gram.*sabha|gram.*panchayat|panchayat.*samiti|zilla.*parishad|district.*(panchayat|rural.*development)|municipal.*(corporation|council|committee|ward|election|act|constitution|74th|amendment)|74th.*amendment|nagar.*(palika|nigam|panchayat)|urban.*local.*body|municipality.*(constitution|election|act|function|power|finance)|local.*(government|self.?government|body|rural|urban).*india|article.*(243|244|245|246|247|248|249|250|251|252|253|254|255|256|257|258|259|260|261|262|263|264|265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286|287|288|289|290|291|292|293|294|295|296|297|298|299|300|301|302|303|304|305|306|307|308|309|310|311|312|313|314|315|316|317|318|319|320|321|322|323|324|325|326|327|328|329|330|331|332|333|334|335|336|337|338|339|340|341|342|343|344|345|346|347|348|349|350|351|352|353|354|355|356|357|358|359|360|361|362|363|364|365|366|367|368|369|370|371|372|373|374|375|376|377|378|379|380|381|382|383|384|385|386|387|388|389|390|391|392|393|394|395)/i,
    'Election Commission & Electoral Reforms': /election.*commission.*(india|power|function|role|composition|independence|commissioner|election)|eci|election.*(india|commission|process|reform|campaign|code.*conduct|expenditure|voter|registration|id|card|roll|poll|booth|machine|evm|vvpat|turnout|result)|electoral.*(reform|bond|funding|expenditure|campaign|code|offence|dispute|system|process)|model.*code.*conduct|mcc|voter.*(id|card|registration|roll|list|turnout|awareness|education)|election.*(symbol|allotment|recognition|reservation|constituency|delimitation|seat|quota)|delimitation.*(commission|constituency)|nota|none.*of.*above|voter.*(verifiable|paper.*audit|trail)|evm|electronic.*voting.*machine|vvpat|right.*reject|election.*petition|anti.?defection|representative.*(people.*act|act.*1950|act.*1951)|rpa|rp.*act/i,
    'Union Public Service Commission': /union.*public.*service.*commission|upsc|civil.*service.*(?:examination|commission)|public.*service.*(?:commission|examination|recruitment)|upsc.*(?:exam|examination|cse|ias|ifs|ips|civil.*services.*(?:exam|preliminary|mains|interview))|union.*public.*service|commission.*(?:upsc|public.*service)/i,
    'Comptroller & Auditor General': /comptroller.*auditor.*general|cag.*(?:india|report|audit|role|power|function|appointment|removal)|auditor.*general.*india|audit.*(?:cag|comptroller|government|public.*sector|account|expenditure|revenue)|cag.*(?:report|audit|finding|criticism|committee|pac|public.*account)/i,
    'Attorney General & Advocate General': /attorney.*general.*india|advocate.*general.*(state|india)|law.*officer.*(india|state)|solicitor.*general.*india|additional.*solicitor.*general|government.*(pleader|advocate|lawyer).*india|attorney.*general.*(appointment|role|power|function|duty|privilege|removal)|advocate.*general.*(appointment|role|power|function|duty|privilege|removal)/i,
    'Special Status (J&K, Article 371)': /article.*(370|371).*(jammu|kashmir|special|status)|jammu.*kashmir.*(special.*status|article.*370|reorganization|2019|abrogation|downgrade|union.*territory)|special.*(status|provision).*(states|india|constitution)|article.*371.*(a|b|c|d|e|f|g|h|i|j).*(nagaland|assam|manipur|mizoram|arunachal|goa|sikkim|karnataka|gujarat|maharashtra|andhra|telangana)|asymmetric.*(federalism|arrangement|provision)/i,
    'Emergency Provisions': /emergency.*(provision|article|power|india|national|president|state|financial)|national.*emergency|article.*352|president.*rule|state.*emergency|article.*356|financial.*emergency|article.*360|emergency.*(effect|impact|fundamental.*right|right.*suspend|democracy|limitation|revocation)|failure.*constitutional.*(machinery|government)/i,
    'Amendment Process & Major Amendments': /amendment.*(constitution|india|process|procedure|bill|act|article|schedule|list)|constitutional.*amendment.*(india|bill|act|procedure)|major.*(amendment|constitutional.*amendment).*india|42nd.*amendment|44th.*amendment|73rd.*amendment|74th.*amendment|61st.*amendment|86th.*amendment|97th.*amendment|101st.*amendment|103rd.*amendment|105th.*amendment|106th.*amendment/i,
    'Constitutional Bodies (CAG, EC, UPSC, etc.)': /constitutional.*body|constitutional.*(commission|authority|body|office).*(cag|election|commission|upsc|spc|finance|commission|state.*public.*service|national.*commission.*scheduled.*caste|national.*commission.*scheduled.*tribe|national.*commission.*backward.*class|official.*language)|cag|election.*commission|upsc|finance.*commission|national.*commission.*(sc|st|obc|minority|women|child|human.*right|backward.*class)|official.*language.*commission|special.*officer.*(linguistic|sc|st|obc|minority)/i,
    'Non-Constitutional Bodies (NITI Aayog, etc.)': /non.?constitutional.*(body|commission|authority|office)|statutory.*(body|commission|authority)|regulatory.*(body|commission|authority|board)|niti.*aayog|planning.*commission|national.*human.*right.*commission|nhrc|national.*commission.*(women|minority|child|backward.*class)|national.*investigation.*agency|nia|central.*bureau.*investigation|cbi|enforcement.*directorate|ed|serious.*fraud.*investigation.*office|sfio|central.*information.*commission|cic|state.*information.*commission|sic|competition.*commission.*india|cci|securities.*exchange.*board.*india|sebi|insurance.*regulatory.*development.*authority.*india|irdai|reserve.*bank.*india|rbi|telecom.*regulatory.*authority.*india|trai|central.*electricity.*regulatory.*commission|cerc|oil.*regulatory.*board|atomic.*energy.*commission|national.*security.*council|national.*disaster.*management.*authority|ndma|national.*green.*tribunal|ngt/i,
    'Rights Issues (RTI, PIL, etc.)': /right.*(information|education|health|food|work|privacy|internet|protest|peaceful.*assembly|speech|expression|life|liberty|equality|exploitation|religion|culture|language|minority|constitutional.*remedy|property|compensation|clean.*environment|water|electricity|education|information|public.*service|services|consumer|employment|pension|maternity|child|women|disabled|elderly|transgender|justice).*(india|act|constitution|right)|right.*act|rte|rti|right.*information.*act|human.*right.*(india|commission|court|violation)|pil|public.*interest.*litigation|lok.*adalat|legal.*services.*authority|consumer.*protection.*(act|right)/i,
    'Political Parties & Pressure Groups': /political.*party.*(india|national|regional|state|registration|recognition|symbol|alliance|coalition|defection|merger|split|election|campaign|funding|expenditure|accountability|regulation)|national.*party.*(india|election|commission|recognition|symbol)|regional.*party.*(india|state|recognition|symbol)|recognized.*(party|political.*party)|election.*symbol|party.*(alliance|coalition|front|defection|merger|split|registration|recognition|symbol|funding|accountability|regulation)|pressure.*group.*(india|interest|political|social|economic|environmental|cultural|religious|caste|community|farmer|labour|trade.*union|student|youth|women|professional|business|corporate|civil.*society|ngo|voluntary|advocacy|lobbying)/i,
    'Anti-Defection Law & Representation': /anti.?defection.*(law|act|schedule|provision|tenth.*schedule)|defection.*(law|act|india|provision|schedule|parliament|assembly|member|party|disqualification)|tenth.*schedule.*(constitution|defection|anti)|disqualification.*(member|defection|parliament|assembly|ground|procedure)|speaker.*(disqualification|defection|power|role)|representative.*(people.*act|act.*1950|act.*1951)|representation.*(people.*act|parliament|assembly|constituency|reservation|delimitation|seat|quota)|proportional.*representation|first.?past.?the.*post|fptp|reservation.*(seat|constituency).*(parliament|assembly|local|panchayat|municipality)|women.*reservation.*(bill|parliament|assembly)|women.*quota.*(bill|parliament|assembly)/i,
    'Olympic Games (Summer & Winter)': /olympic.*(game|summer|winter|medal|gold|silver|bronze|team|event|sport|athlete|record|qualification|torch|ceremony|committee|federation|charter|spirit|flag|cauldron|podium|doping|paralympic|youth.*olympic)|olympic.*(2022|2024|2026|2028|2030|2032)|paris.*2024|los.*angeles.*2028|brisbane.*2032|tokyo.*(2020|olympic)|beijing.*(2022|olympic)/i,
    'Commonwealth Games': /commonwealth.*game|commonwealth.*(medal|gold|silver|bronze|team|event|sport|athlete|record|host|city|committee|federation|charter|mascot|torch|ceremony)|birmingham.*2022|victoria.*2026|glasgow.*2026|delhi.*(2010|commonwealth)|gold.*coast.*2018/i,
    'Asian Games & Asian Championships': /asian.*game|asian.*(medal|gold|silver|bronze|team|event|sport|athlete|record|host|city|committee|council|federation|charter|mascot|torch|ceremony)|hangzhou.*2022|aichi.*2026|doha.*2030|riyadh.*2034/i,
    'Cricket (World Cup, T20, IPL)': /cricket|world.*cup.*cricket|t20.*(world.*cup|cricket|ipl)|ipl|indian.*premier.*league|cricket.*(test|odi|t20|world.*cup|champions.*trophy|asia.*cup|series|match|tour|tournament|league|cup|trophy|record|ranking)|bcci|icc|cricket.*(border.?gavaskar|ashes|virat|rohit|dhoni|sachin|kohli|sharma|bumrah|jadeja|pant|gill|iyer|rahul|surya|hardik|ashwin|pujara)/i,
    'Hockey (World Cup, Olympics)': /hockey|field.*hockey|hockey.*(world.*cup|olympic|champions.*trophy|asia.*cup|pro.*league|tournament|league|cup|trophy|medal|record|ranking)|indian.*(hockey|hockey.*team|hockey.*player)|manpreet|dhyan.*chand|balbir|sardar|drag.*flick|penalty.*corner|shoot.?out.*hockey/i,
    'Tennis (Grand Slams, Davis Cup)': /tennis|grand.*slam|australian.*open|french.*open|wimbledon|us.*open|davis.*cup|fed.*cup|billie.*jean.*king.*cup|atp.*(tour|ranking|final|championship|title|match|player)|wta.*(tour|ranking|final|championship|title|match|player)|tennis.*(india|indian.*player|leander|paes|bhupathi|bopanna|sania|mirza|nagal|ramkumar|somdev|yuki|bhambri|myneni|sharan)/i,
    'Football (FIFA World Cup, AFC Cup)': /football|soccer|fifa.*(world.*cup|cup|confederation|rankings)|world.*cup.*(football|soccer|fifa)|premier.*league|la.*liga|bundesliga|serie.*a|ligue.*1|afc.*(cup|asian.*cup|champions.*league)|european.*(championship|cup|euro)|copa.*america|africa.*cup.*nations|indian.*(football|super.*league|isl|i.?league)|rugby|nba|basketball.*(nba|world.*cup|olympic)|volleyball.*(world.*cup|nations.*league|championship)/i,
    'Badminton (Thomas & Uber Cup, World C\ships)': /badminton|thomas.*cup|uber.*cup|sudirman.*cup|bwf.*(world.*championship|ranking)|world.*championship.*badminton|all.*england.*(badminton|open)|badminton.*(india|indian.*player|saina|nehwal|sindhu|pusarla|srikanth|prannoy|lakshya|sen|satwik|chirag|rankireddy|shetty|jwala|gutta|ashwini|ponnappa)/i,
    'Wrestling (Olympic, World C\ships)': /wrestling|olympic.*wrestling|world.*championship.*wrestling|freestyle.*wrestling|greco.*roman.*wrestling|women.*wrestling|wrestling.*(india|indian.*wrestler|phogat|geeta|babita|sakshi|malik|vinesh|yogeshwar|dutt|sushil|kumar|narsingh|bajrang|punia|ravi|dahiya|deepak)/i,
    'Boxing (Olympic, World C\ships)': /boxing|olympic.*boxing|world.*championship.*boxing|professional.*boxing|amateur.*boxing|boxing.*(india|indian.*boxer|mary.*kom|nikhat|zareen|lovlina|borgohain|shiva|thapa|vikas|kaushik|manish|simranjit|kaur|sakshi|chaudhary)/i,
    'Athletics (World C\ships, Diamond League)': /athletics|track.*field|world.*championship.*(athletics|track)|diamond.*league|sprint|marathon|hurdle|steeplechase|jump.*(long|high|triple|pole.*vault)|throw.*(shot|discus|hammer|javelin)|decathlon|relay.*(4x100|4x400)|walk|athletics.*(india|indian.*athlete|neeraj|chopra|javelin|hima.*das|dutee.*chand|milkha.*singh|p.t.*usha|avinash|sable|tajinder|toor|sreeshankar|jeswin|parul|chaudhary|jyothi|yarraji)/i,
    'Shooting (ISSF World C\ships, Olympics)': /shooting|rifle|pistol|shotgun|trap|skeet|issf.*(world.*championship|world.*cup)|world.*championship.*(shooting|rifle|pistol)|olympic.*shooting|shooting.*(india|indian.*shooter|bindra|abhiraj|jitu|rai|saurabh|chaudhary|apurvi|chandela|anjum|moudgil|manu|bhaker|rahi|sarnobat|yashaswini|deswal|ramita|jindal|swapnil|kusale|divyansh|panwar|arjun|babuta|shreerang)/i,
    'Chess (World Championship, Olympiad)': /chess|world.*chess.*(championship|candidate|olympiad|cup|tournament|champion|grandmaster)|fide|grandmaster.*(chess|india|anand|gukesh|pragg|vidit|harika|koneru|humpy|vaishali|tania|adhiban|sethuraman|karthik|lalith|nihal|sarin|mendonca)|anand|viswanathan|candidates.*(chess)|chess.*(olympiad|championship|rating|blitz|rapid|classical)/i,
    'Kabaddi (World Cup, Pro Kabaddi)': /kabaddi|pro.*kabaddi|pkl|world.*cup.*kabaddi|asian.*game.*kabaddi|kabaddi.*(india|indian.*player|anup|kumar|deepak|niwas|manjeet|chillar|rakesh|rahul|chaudhari|sandeep|narwal|parvesh|surender|naveen|abhishek|meraj|shelar)/i,
    'National Games & Domestic Sports': /national.*game.*(india|indian|sport|competition|championship)|domestic.*(sport|competition|championship|tournament|league|cup|trophy)|indian.*(sport|championship|tournament|league|cup|trophy)|sports.*(india|indian|national|domestic|league|cup|trophy|championship|ministry|council|academy|scheme|development|nada|wada)/i,
    'Sports Awards (Rajiv Gandhi Khel Ratna, Arjuna)': /rajiv.*gandhi.*khel.*ratna|khel.*ratna|arjuna.*(award|winner|recipient)|dronacharya.*(award|coach|recipient)|dhyan.*chand.*(award|winner|recipient)|maulana.*azad.*(award|trophy)|national.*sports.*(award|winner)|sports.*award.*(india|indian|national|winner)|padma.*sri.*(sports|sportsperson)|padma.*bhushan.*(sports|sportsperson)|padma.*vibhushan.*(sports|sportsperson)/i,
    'Sports Policy & Governance': /sports.*(policy|act|bill|governance|administration|board|association|federation|ministry|department|authority|mission|scheme|doping|anti.?doping|nada|wada|testing|code)|national.*sports.*(policy|act|bill|code|development|governance)|sports.*authority.*india|sai|national.*anti.?doping.*agency|nada|wada|indian.*olympic.*association|ioa/i,
    'E-Sports & Emerging Sports': /e.?sport|esport|electronic.*sport|gaming.*(competition|event|championship|tournament|league|cup)|video.*game.*(competition|event|sport)|pubg|fortnite|valorant|league.*legends|dota.*2|counter.*strike|overwatch|sport.*(emerging|new|alternative|extreme|adventure)|emerging.*(sport|market)|skateboard|surfing|climbing|sport.*climbing|triathlon|cycling|parkour/i,
  };
  for (const s of subs) {
    if (kw[s] && kw[s].test(t)) return s;
  }
  return '';
}

// Build 3-level tree: category → subject → subSubject → questions
const tree = {};
questions.forEach(q => {
  const c = q.category || 'Misc', s = q.subject || 'General';
  let ss = classifySub(q) || q.subSubject;
  if (!ss && CAT_MAP[c]) {
    for (const mappedCat of CAT_MAP[c]) {
      ss = classifySub(q, mappedCat);
      if (ss) break;
    }
  }
  ss = ss || 'General';
  if (!tree[c]) tree[c] = {};
  if (!tree[c][s]) tree[c][s] = {};
  if (!tree[c][s][ss]) tree[c][s][ss] = [];
  tree[c][s][ss].push(q);
});

const sortedCats = Object.keys(tree).sort();

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function makeExplanation(q) {
  if (q.fact) {
    let exp = q.fact;
    if (q.hint) exp += '\n\n\u{1F4A1} ' + q.hint;
    return exp;
  }
  let exp = 'Q: ' + q.question + '\nA: ' + q.answer;
  if (q.hint) exp += '\n\n\u{1F4A1} ' + q.hint;
  if (q.category) exp += ' \u{2022} ' + q.category;
  if (q.pubDate) {
    const d = new Date(q.pubDate);
    exp += ' \u{2022} ' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }
  return exp;
}

function renderQuestion(q, idx) {
  const qText = q.question;
  const answer = q.answer;
  const ss = classifySub(q);
  const emoji = q.emoji || '';
  let tags = '';
  if (q.category) tags += '\n      <span class="tag cat-tag">' + esc(q.category) + '</span>';
  if (q.subject && q.subject !== q.category) tags += '\n      <span class="tag subj-tag">' + esc(q.subject) + '</span>';
  if (ss) tags += '\n      <span class="tag subsub-tag">' + esc(ss) + '</span>';
  if (q.isTrueFalse === true || q.question.includes('True') || q.question.includes('False')) tags += '\n      <span class="tag tf-tag">TF</span>';
  if (q.pubDate) {
    const d = new Date(q.pubDate);
    tags += '\n      <span class="tag date-tag">' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) + '</span>';
  }
  if (emoji) tags += '\n      <span class="tag emoji-tag">' + emoji + '</span>';
  const permalink = 'questions/q-' + q.id + '.html';
  return '<div class="q-item" data-category="' + esc(q.category||'') + '" data-subject="' + esc(q.subject||'') + '" data-subsub="' + esc(ss) + '" data-type="' + esc(q.type||'') + '">\n    <div class="q-num">#' + (idx+1) + '</div>\n    <div class="q-tags">' + tags + '\n    </div>\n    <div class="q-question"><a href="' + permalink + '" style="color:inherit;text-decoration:none">' + qText + '</a></div>\n    <div class="q-answer"><span class="a-label">Answer:</span> <span class="a-value">' + esc(answer) + '</span></div>\n    <button class="explain-btn" onclick="toggleExplain(this)">\uD83D\uDCD6 Explanation</button>\n    <div class="q-explain">' + esc(makeExplanation(q)).replace(/\n/g,'<br>') + '</div>\n    <div style="margin-top:6px;font-size:.72em"><a href="' + permalink + '" style="color:var(--text-muted)">\uD83D\uDD17 Permalink</a></div>\n  </div>';
}

// ── Pagination ──
const Q_PER_PAGE = 5000;
const totalPages = Math.max(1, Math.ceil(questions.length / Q_PER_PAGE));

// Build view→page map so sidebar links can redirect to the correct page
const viewPageMap = {};
for (let p = 0; p < totalPages; p++) {
  const si = p * Q_PER_PAGE;
  const ei = Math.min(si + Q_PER_PAGE, questions.length);
  const pageQs = questions.slice(si, ei);
  const pageCats = new Set(), pageSubj = new Set(), pageSS = new Set();
  pageQs.forEach(q => {
    const c = q.category || 'Misc', s = q.subject || 'General';
    let ss = classifySub(q) || q.subSubject;
    if (!ss && CAT_MAP[c]) { for (const mc of CAT_MAP[c]) { ss = classifySub(q, mc); if (ss) break; } }
    ss = ss || 'General';
    pageCats.add(c); pageSubj.add(c + '||' + s); pageSS.add(c + '||' + s + '||' + ss);
  });
  pageCats.forEach(c => { const ci = sortedCats.indexOf(c); if (ci >= 0) viewPageMap['catView-' + ci] = p; });
  pageSubj.forEach(k => { viewPageMap['subjView-' + k] = p; });
  pageSS.forEach(k => { viewPageMap['ssView-' + k] = p; });
}

function renderOnePage(pageIdx) {
  const startIdx = pageIdx * Q_PER_PAGE;
  const endIdx = Math.min(startIdx + Q_PER_PAGE, questions.length);
  const pageQs = questions.slice(startIdx, endIdx);
  const pageLabel = pageIdx + 1;

  // Build per-page tree for content only
  const pageTree = {};
  pageQs.forEach(q => {
    const c = q.category || 'Misc', s = q.subject || 'General';
    let ss = classifySub(q) || q.subSubject;
    if (!ss && CAT_MAP[c]) {
      for (const mappedCat of CAT_MAP[c]) { ss = classifySub(q, mappedCat); if (ss) break; }
    }
    ss = ss || 'General';
    if (!pageTree[c]) pageTree[c] = {};
    if (!pageTree[c][s]) pageTree[c][s] = {};
    if (!pageTree[c][s][ss]) pageTree[c][s][ss] = [];
    pageTree[c][s][ss].push(q);
  });

  const sortedPageCats = Object.keys(pageTree).sort();

  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>GK Current Affairs Archive (Page ' + pageLabel + ') — vlymbooq</title>\n<meta name="description" content="Complete archive of ' + questions.length + ' GK & Current Affairs questions with explanations. Free practice for competitive exams. Browse by subject tree.">\n<link rel="icon" type="image/svg+xml" href="favicon.svg">\n<link rel="icon" type="image/png" href="logo.png">\n';
  if (pageIdx === 0) html += '<link rel="canonical" href="https://vlymbooq.qzz.io/archive.html">\n';
  html += '<link rel="stylesheet" href="css/style.css">\n<style>\n@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap\');\n*{margin:0;padding:0;box-sizing:border-box}\n:root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--border-hover:rgba(255,255,255,.1);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--red:#ef4444;--amber:#f59e0b;--cyan:#22d3ee;--radius:12px;--radius-lg:16px}\nbody{font-family:\'Inter\',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\na{color:var(--text);text-decoration:none}\n.pager{text-align:center;padding:16px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}\n.pager a{display:inline-block;padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:100px;font-size:.85em;color:var(--text);transition:all .15s}\n.pager a:hover{background:var(--bg-hover);border-color:var(--border-hover);text-decoration:none}\n.pager .active{background:var(--purple);border-color:var(--purple);color:#fff;cursor:default}\n.nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n.nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.brand{display:flex;align-items:center;gap:8px}\n.brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n.nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:var(--text-sec);transition:all .2s;white-space:nowrap}\n.nav-links a.active,.nav-links a:hover{background:rgba(167,139,250,.1);color:var(--purple)}.page-wrap{display:flex;max-width:1100px;margin:0 auto;padding:24px;gap:24px}.sidebar{width:280px;flex-shrink:0;position:sticky;top:80px;align-self:flex-start;max-height:calc(100vh-96px);overflow-y:auto}.sidebar-title{font-size:.8em;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px}.sidebar-cat{margin-bottom:2px}.sidebar-link,.sidebar-subj-link,.sidebar-subsub-link{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-radius:8px;font-size:.85em;color:var(--text-sec);transition:all .12s;cursor:pointer}.sidebar-link:hover,.sidebar-subj-link:hover,.sidebar-subsub-link:hover,.sidebar-link.active,.sidebar-subj-link.active,.sidebar-subsub-link.active{background:rgba(167,139,250,.08);color:var(--text)}.sidebar-link.active{background:rgba(167,139,250,.12)}.sidebar-icon{margin-right:6px}.sidebar-count{font-size:.78em;color:var(--text-muted);padding:1px 6px;border-radius:4px;background:var(--bg-card)}.sidebar-subjects{display:none;margin-left:12px}.sidebar-subjects.open{display:block}.sidebar-subj-link{padding:4px 10px;font-size:.82em}.sidebar-subsubs{display:none;margin-left:12px}.sidebar-subsubs.open{display:block}.sidebar-subsub-link{padding:3px 8px;font-size:.78em}.main-content{flex:1;min-width:0}.breadcrumb{font-size:.85em;color:var(--text-muted);margin-bottom:20px}.breadcrumb a{color:var(--text-sec);cursor:pointer}.breadcrumb .sep{margin:0 6px;color:var(--text-muted)}.breadcrumb .current{color:var(--text)}.page-title{font-size:1.6em;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}.page-sub{color:var(--text-sec);font-size:.9em;margin-bottom:24px}.subj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px}.subj-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;transition:all .2s}.subj-card:hover{background:var(--bg-hover);border-color:var(--border-hover)}.subj-card-name{font-weight:600;font-size:.95em;margin-bottom:4px}.subj-card-count{font-size:.8em;color:var(--text-muted);margin-bottom:8px}.subj-card-preview{font-size:.75em;color:var(--text-muted);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}.question-list{display:flex;flex-direction:column;gap:12px}.q-item{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:all .2s}.q-item:hover{background:var(--bg-hover)}.q-num{font-size:.75em;color:var(--text-muted);margin-bottom:4px}.q-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}.tag{font-size:.7em;padding:2px 8px;border-radius:100px;font-weight:500}.cat-tag{background:rgba(167,139,250,.12);color:var(--purple)}.subj-tag{background:rgba(52,211,153,.1);color:var(--emerald)}.subsub-tag{background:rgba(245,158,11,.1);color:var(--amber)}.date-tag{background:rgba(34,211,238,.08);color:var(--cyan)}.emoji-tag{background:transparent}.tf-tag{background:rgba(239,68,68,.1);color:var(--red)}.q-question{font-size:.95em;font-weight:500;margin-bottom:8px;line-height:1.6}.q-answer{font-size:.85em;margin-bottom:6px}.a-label{color:var(--text-muted)}.a-value{color:var(--emerald);font-weight:600}.explain-btn{background:transparent;border:1px solid var(--border);color:var(--text-sec);padding:5px 12px;border-radius:100px;cursor:pointer;font-size:.78em;transition:all .2s}.explain-btn:hover{background:var(--bg-hover);border-color:var(--border-hover)}.q-explain{background:rgba(167,139,250,.05);border-radius:8px;padding:12px;margin-top:8px;font-size:.82em;color:var(--text-sec);line-height:1.7;display:none}.q-explain.show{display:block}@media(max-width:768px){.sidebar{display:none}.page-wrap{padding:16px;flex-direction:column}.subj-grid{grid-template-columns:1fr}}\n<\/style>\n<\/head>\n<body>\n';
  html += '\n<nav class="nav"><div class="nav-inner"><div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple)"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"\/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\/><\/svg><span class="brand-text">vlymbooq<\/span><\/div><div class="nav-links"><a href="index.html">Home<\/a><a href="current-affairs.html">Quiz<\/a><a href="dashboard.html">Dashboard<\/a><a class="active" href="archive.html">Archive<\/a><a href="about.html">About<\/a><\/div><\/div><\/nav>';

  // Pager
  html += '<div class="pager">';
  for (let p = 0; p < totalPages; p++) {
    const href = p === 0 ? 'archive.html' : 'archive-p' + (p+1) + '.html';
    const active = p === pageIdx ? ' class="active"' : '';
    html += '<a href="' + href + '"' + active + '>' + (p+1) + '</a>';
  }
  html += '</div>';

  // Sidebar
  const CAT_ICONS = { 'Indian History':'📜','World History':'🌍','Art & Culture':'🎨','Polity':'🏛️','Indian Economy':'📊','Geography':'🗺️','World Geography':'🌏','General Science':'🔬','Defence':'⚔️','Environment & Ecology':'🌿','International Relations':'🤝','Constitution':'📜','ISRO & Space':'🚀','Computer & IT':'💻','Sports':'🏆','Society':'👥','Personalities':'👤','State GK':'🗺️','Books & Authors':'📚','Important Days':'📅','Govt Schemes':'📋','Awards':'🏅','Business & Economy':'💼','Tech & Science':'⚙️','Ethics':'⚖️','Announcements':'📢','RBI Press Releases':'🏦' };
  html += '<div class="page-wrap"><aside class="sidebar"><div class="sidebar-title">Categories</div>';
  sortedCats.forEach((c, ci) => {
    const subs = tree[c];
    const totalQ = Object.values(subs).reduce((sum, sub) => sum + Object.values(sub).reduce((s, qs) => s + qs.length, 0), 0);
    html += '<div class="sidebar-cat">';
    html += '<a href="#" class="sidebar-link" data-cat="' + esc(c) + '" onclick="return selectCategory(' + ci + ')">';
    html += '<span class="sidebar-icon">' + (CAT_ICONS[c] || '📌') + '</span>';
    html += '<span class="sidebar-label">' + esc(c) + '</span>';
    html += '<span class="sidebar-count">' + totalQ + '</span></a>';
    html += '<div class="sidebar-subjects" id="subj-' + ci + '">';
    Object.keys(subs).forEach(subj => {
      const ssList = subs[subj];
      const subjQ = Object.values(ssList).reduce((s, qs) => s + qs.length, 0);
      const subjPair = esc(c) + '||' + esc(subj);
      html += '<a href="#" class="sidebar-subj-link" data-subj="' + subjPair + '" onclick="return selectSubject(\'' + subjPair + '\')">';
      html += '<span class="sidebar-label">' + esc(subj) + '</span>';
      html += '<span class="sidebar-count">' + subjQ + '</span></a>';
      const safeSubjId = 'ss_' + ci + '_' + esc(c).replace(/[^a-zA-Z0-9]/g,'_') + '_' + esc(subj).replace(/[^a-zA-Z0-9]/g,'_');
      html += '<div class="sidebar-subsubs" id="' + safeSubjId + '">';
      Object.keys(ssList).forEach(ss => {
        const qs = ssList[ss];
        const ssPair = esc(c) + '||' + esc(subj) + '||' + esc(ss);
        html += '<a href="#" class="sidebar-subsub-link" data-subsub="' + ssPair + '" onclick="return selectSubSubject(\'' + ssPair + '\')">';
        html += '<span class="sidebar-label">' + esc(ss) + '</span>';
        html += '<span class="sidebar-count">' + qs.length + '</span></a>';
      });
      html += '</div>';
    });
    html += '</div></div>';
  });
  html += '</aside>';

  // Main content
  html += '<main class="main-content">';
  html += '<div class="breadcrumb" id="breadcrumb"><a href="#" onclick="return showWelcome()">Archive</a> <span class="sep">›</span> <span class="current">All Categories</span></div>';

  // Welcome view
  html += '<div class="content-panel" id="view-welcome">';
  html += '<h1 class="page-title">📚 GK Current Affairs Archive</h1>';
  html += '<p class="page-sub">' + questions.length + ' questions across ' + sortedCats.length + ' categories (Page ' + pageLabel + '/' + totalPages + '). Hover sidebar to navigate.</p>';
  html += '<div class="subj-grid" data-level="categories">';
  sortedPageCats.forEach((c, ci) => {
    const subs = pageTree[c];
    const totalQ = Object.values(subs).reduce((sum, sub) => sum + Object.values(sub).reduce((s, qs) => s + qs.length, 0), 0);
    const ciFull = sortedCats.indexOf(c);
    const preview = Object.values(subs).flatMap(sub => Object.values(sub).flat()).slice(0, 3).map(q => q.question.substring(0, 80)).join('<br>');
    html += '<div class="subj-card" onclick="return selectCategory(' + ciFull + ')">';
    html += '<div class="subj-card-name">' + (CAT_ICONS[c] || '📌') + ' ' + esc(c) + '</div>';
    html += '<div class="subj-card-count">' + totalQ + ' question' + (totalQ > 1 ? 's' : '') + '</div>';
    html += '<div class="subj-card-preview">' + preview + '</div></div>';
  });
  html += '</div></div>';

  // Category views
  sortedPageCats.forEach((c, ci) => {
    const subs = pageTree[c];
    const ciFull = sortedCats.indexOf(c);
    html += '<div class="content-panel" id="catView-' + ciFull + '" style="display:none">';
    html += '<h2 class="page-title">' + (CAT_ICONS[c] || '📌') + ' ' + esc(c) + '</h2>';
    html += '<p class="page-sub">Choose a subject:</p>';
    html += '<div class="subj-grid" data-level="subjects" data-category="' + esc(c) + '">';
    Object.keys(subs).forEach(subj => {
      const qs = Object.values(subs[subj]).flat();
      const preview = qs.slice(0, 3).map(q => q.question.substring(0, 80)).join('<br>');
      const subjPair = esc(c) + '||' + esc(subj);
      html += '<div class="subj-card" onclick="return selectSubject(\'' + subjPair + '\')">';
      html += '<div class="subj-card-name">' + esc(subj) + '</div>';
      html += '<div class="subj-card-count">' + qs.length + ' question' + (qs.length > 1 ? 's' : '') + '</div>';
      html += '<div class="subj-card-preview">' + preview + '</div></div>';
    });
    html += '</div></div>';
  });

  // Subject views
  sortedPageCats.forEach((c, ci) => {
    const subs = pageTree[c];
    Object.keys(subs).forEach(subj => {
      const ssList = subs[subj];
      const subjPair = esc(c) + '||' + esc(subj);
      html += '<div class="content-panel" id="subjView-' + subjPair + '" style="display:none">';
      html += '<h2 class="page-title">' + (CAT_ICONS[c] || '📌') + ' ' + esc(c) + '</h2>';
      html += '<p class="page-sub">' + esc(subj) + ' — choose a sub-topic:</p>';
      html += '<div class="subj-grid" data-level="subsubs" data-subject="' + subjPair + '">';
      Object.keys(ssList).forEach(ss => {
        const qs = ssList[ss];
        const preview = qs.slice(0, 3).map(q => q.question.substring(0, 80)).join('<br>');
        const ssPair = esc(c) + '||' + esc(subj) + '||' + esc(ss);
        html += '<div class="subj-card" onclick="return selectSubSubject(\'' + ssPair + '\')">';
        html += '<div class="subj-card-name">' + esc(ss) + '</div>';
        html += '<div class="subj-card-count">' + qs.length + ' question' + (qs.length > 1 ? 's' : '') + '</div>';
        html += '<div class="subj-card-preview">' + preview + '</div></div>';
      });
      html += '</div></div>';
    });
  });

  // subSubject views (question lists)
  sortedPageCats.forEach((c, ci) => {
    const subs = pageTree[c];
    Object.keys(subs).forEach(subj => {
      const ssList = subs[subj];
      Object.keys(ssList).forEach(ss => {
        const qs = ssList[ss];
        const ssPair = esc(c) + '||' + esc(subj) + '||' + esc(ss);
        html += '<div class="content-panel" id="ssView-' + ssPair + '" style="display:none">';
        html += '<h2 class="page-title">' + (CAT_ICONS[c] || '📌') + ' ' + esc(ss) + '</h2>';
        html += '<p class="page-sub">' + esc(subj) + ' — ' + esc(c) + '</p>';
        html += '<div class="question-list">';
        qs.forEach((q, qi) => { html += renderQuestion(q, qi); });
        html += '</div></div>';
      });
    });
  });

  html += '</main></div>';

  // Inline JS
  html += '<script>\nvar catData = [';
  sortedCats.forEach((c, i) => { html += (i ? ',' : '') + '\'' + esc(c) + '\''; });
  html += '];\n';
  html += 'var viewPageMap = ' + JSON.stringify(viewPageMap) + ';\n';
  html += 'var pageIdx = ' + pageIdx + ';\n';
  html += 'var pageFile = function(p){return p===0?"archive.html":"archive-p"+(p+1)+".html"};\n';

  html += 'function goToPage(tag) {\n  var target = viewPageMap[tag];\n  if (target !== undefined && target !== pageIdx) { window.location.href = pageFile(target) + \'#\' + encodeURIComponent(tag); return false; }\n  return true;\n}\n';

  html += 'function selectCategory(ci) {\n  if (!goToPage(\'catView-\' + ci)) return false;\n  var cat = catData[ci];\n  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n  var link = document.querySelector(\'.sidebar-link[data-cat="\' + cat + \'"]\');\n  if(link) link.classList.add(\'active\');\n  var subjs = document.getElementById(\'subj-\' + ci);\n  if(subjs) subjs.classList.add(\'open\');\n  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return showWelcome()">Archive</a> <span class="sep">›</span> <span class="current">\' + escHtml(cat) + \'</span>\';\n  showView(\'catView-\' + ci);\n  return false;\n}\n';

  html += 'function selectSubject(subjId) {\n  var _s = subjId.replace(/&amp;/g,\'&\');\n  if (!goToPage(\'subjView-\' + _s)) return false;\n  var parts = _s.split(\'||\');\n  var cat = parts[0], subj = parts[1];\n  var catIdx = catData.indexOf(cat);\n  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n  var catLink = document.querySelector(\'.sidebar-link[data-cat="\' + cat + \'"]\');\n  if(catLink) catLink.classList.add(\'active\');\n  var subjsEl = document.getElementById(\'subj-\' + catIdx);\n  if(subjsEl) subjsEl.classList.add(\'open\');\n  var subjLink = document.querySelector(\'.sidebar-subj-link[data-subj="\' + subjId + \'"]\');\n  if(subjLink) subjLink.classList.add(\'active\');\n  var safeSubjId = \'ss_\' + catIdx + \'_\' + cat.replace(/[^a-z0-9]/gi,\'_\') + \'_\' + subj.replace(/[^a-z0-9]/gi,\'_\');\n  var subsubEl = document.getElementById(safeSubjId);\n  if(subsubEl) subsubEl.classList.add(\'open\');\n  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return showWelcome()">Archive</a> <span class="sep">›</span> <a href="#" onclick="return selectCategory(\' + catIdx + \')">\' + escHtml(cat) + \'</a> <span class="sep">›</span> <span class="current">\' + escHtml(subj) + \'</span>\';\n  showView(\'subjView-\' + _s);\n  return false;\n}\n';

  html += 'function selectSubSubject(ssId) {\n  var _s = ssId.replace(/&amp;/g,\'&\');\n  if (!goToPage(\'ssView-\' + _s)) return false;\n  var parts = ssId.split(\'||\');\n  var catEnc = parts[0], subjEnc = parts[1], ssEnc = parts[2];\n  var pd = _s.split(\'||\');\n  var cat = pd[0], subj = pd[1], ss = pd[2];\n  var catIdx = catData.indexOf(cat);\n  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n  var catLink = document.querySelector(\'.sidebar-link[data-cat="\' + catEnc + \'"]\');\n  if(catLink) catLink.classList.add(\'active\');\n  var subjsEl = document.getElementById(\'subj-\' + catIdx);\n  if(subjsEl) subjsEl.classList.add(\'open\');\n  var subjLink = document.querySelector(\'.sidebar-subj-link[data-subj="\' + catEnc + \'||\' + subjEnc + \'"]\');\n  if(subjLink) subjLink.classList.add(\'active\');\n  var safeSubjId = \'ss_\' + catIdx + \'_\' + cat.replace(/[^a-z0-9]/gi,\'_\') + \'_\' + subj.replace(/[^a-z0-9]/gi,\'_\');\n  var subsubEl = document.getElementById(safeSubjId);\n  if(subsubEl) subsubEl.classList.add(\'open\');\n  var ssLink = document.querySelector(\'.sidebar-subsub-link[data-subsub="\' + ssId + \'"]\');\n  if(ssLink) ssLink.classList.add(\'active\');\n  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return showWelcome()">Archive</a> <span class="sep">›</span> <a href="#" onclick="return selectCategory(\' + catIdx + \')">\' + escHtml(cat) + \'</a> <span class="sep">›</span> <a href="#" onclick="return selectSubject(\\\'\' + escHtml(cat + \'||\' + subj) + \'\\\')">\' + escHtml(subj) + \'</a> <span class="sep">›</span> <span class="current">\' + escHtml(ss) + \'</span>\';\n  showView(\'ssView-\' + _s);\n  return false;\n}\n';

  html += 'function showWelcome() {\n  document.querySelectorAll(\'.content-panel\').forEach(function(p){p.style.display=\'none\'});\n  document.getElementById(\'view-welcome\').style.display=\'block\';\n  document.querySelectorAll(\'.sidebar-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subj-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subsub-link\').forEach(function(l){l.classList.remove(\'active\')});\n  document.querySelectorAll(\'.sidebar-subjects\').forEach(function(s){s.classList.remove(\'open\')});\n  document.querySelectorAll(\'.sidebar-subsubs\').forEach(function(s){s.classList.remove(\'open\')});\n  document.getElementById(\'breadcrumb\').innerHTML = \'<a href="#" onclick="return showWelcome()">Archive</a> <span class="sep">›</span> <span class="current">All Categories</span>\';\n  return false;\n}\n';

  html += 'function showView(viewId) {\n  document.querySelectorAll(\'.content-panel\').forEach(function(p){p.style.display=\'none\'});\n  var el = document.getElementById(viewId);\n  if(el) el.style.display=\'block\';\n}\n';

  html += 'function escHtml(s) {\n  if(!s) return \'\';\n  return String(s).replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\').replace(/\'/g,\'&#39;\');\n}\n';

  html += 'function toggleExplain(btn) {\n  var explain = btn.nextElementSibling;\n  var isOpen = explain.classList.toggle(\'show\');\n  btn.textContent = isOpen ? \'📘 Hide Explanation\' : \'📖 Explanation\';\n}\n';

  html += 'window.addEventListener(\'DOMContentLoaded\',function(){\n  var h = window.location.hash.replace(/^#/,\'\');\n  if (h) {\n    var parts = h.split(\'-\');\n    if (parts[0] === \'catView\') selectCategory(parseInt(parts[1]));\n    else if (parts[0] === \'subjView\') selectSubject(decodeURIComponent(parts.slice(1).join(\'-\')));\n    else if (parts[0] === \'ssView\') selectSubSubject(decodeURIComponent(parts.slice(1).join(\'-\')));\n  }\n});\n';

  html += '<\/script>';
  html += '<script>if(\'serviceWorker\' in navigator){navigator.serviceWorker.register(\'/sw.js\').catch(function(){})}<\/script>';
  html += '<\/body>\n<\/html>';

  const fileName = pageIdx === 0 ? 'archive.html' : 'archive-p' + pageLabel + '.html';
  const filePath = path.join(__dirname, '..', fileName);
  fs.writeFileSync(filePath, html);
  const sizeMb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  console.log('Wrote ' + fileName + ' — questions ' + (startIdx+1) + '-' + endIdx + ' of ' + questions.length + ' (' + sizeMb + ' MiB)');
}

for (let p = 0; p < totalPages; p++) renderOnePage(p);
console.log('Done: ' + totalPages + ' archive page(s) generated.');
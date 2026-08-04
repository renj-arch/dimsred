// Builds data/timeline.json — a zoomable chronological knowledge map.
// Every sub-topic + seed entity gets a time span (from topic names + fact-text years),
// a type, an era, and question counts per category.
// Usage: node scripts/build-timeline.js
var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data', 'questions');
var OUT = path.join(__dirname, '..', 'data', 'timeline.json');

// All year signals in text: { min, max, trusted } where trusted marks years that
// were written with BC/BCE/AD/CE or a century (safe to keep even below 1800).
// - "2500 BCE" / "326 BC"  -> negative year (2500 BC = -2500)
// - "AD 200" / "320 AD"    -> positive year
// - "3rd century BC"       -> range [-300, -201]
// - bare "1857"            -> positive year (trusted only by caller rules)
// - "1950s" / "1960s"      -> the decade's starting year (e.g. 1950)
// - bare "5th century"     -> AD range 400–499 (no BC/AD suffix means AD)
function yearSignals(text) {
  var t = String(text || '');
  // Normalize era-before-number ("AD 200", "BC 300") into number-before-era.
  t = t.replace(/\b(BC|BCE|AD|CE)\s*(\d{1,4})\b/gi, function (mm, era, num) { return num + ' ' + era; });
  var points = [];
  var trusted = {};
  function add(y, trust) {
    if (y < -10000 || y > 2026) return;
    points.push(y);
    if (trust) trusted[y] = true;
  }
  var m;
  // "3rd century BC" / "3rd century AD" — an explicit era suffix.
  var re1 = /\b(\d{1,4})\s*(st|nd|rd|th)\s+centur(?:y|ies)\s+(BC|BCE|AD|CE)\b/gi;
  while ((m = re1.exec(t))) {
    var n = +m[1], isBC = /^BC/i.test(m[3]);
    var lo, hi;
    if (isBC) { lo = -n * 100; hi = -(n * 100 - 99); }
    else { lo = (n - 1) * 100; hi = Math.min(n * 100 - 1, 2026); }
    if (lo > 2026) continue;
    add(lo, true); add(hi, true);
  }
  // "2500 BCE" / "320 AD" — an explicit year + era.
  var re2 = /\b(\d{1,4})\s*(BC|BCE|AD|CE)\b/gi;
  while ((m = re2.exec(t))) {
    var y2 = +m[1];
    add(/^BC/i.test(m[2]) ? -y2 : y2, true);
  }
  // Bare century with no era suffix ("5th century") — implied AD.
  var re3 = /\b(\d{1,2})\s*(st|nd|rd|th)\s+centur(?:y|ies)\b(?!\s*(BC|BCE|AD|CE))/gi;
  while ((m = re3.exec(t))) {
    var lo3 = (m[1] - 1) * 100, hi3 = Math.min(m[1] * 100 - 1, 2026);
    if (lo3 > 2026) continue;
    add(lo3, true); add(hi3, true);
  }
  // Decade ("1950s", "in the 1990s") — take the starting year.
  var re4 = /\b(1[0-9]{3}|20[0-2][0-9])s\b/gi;
  while ((m = re4.exec(t))) { add(+m[1], true); }
  // Bare year "1857" — but NOT when it is a quantity, e.g. "1500 metres",
  // "1500-metre run", "about 1000 tractors", "1000 li", "1000 years",
  // "Masters 1000", or part of a distance list "200, 300, 400, 600, 1000
  // & 1200 kilometres". Units are blocked both before and after the number.
  var UNITS = '(?:metres?|meters?|m\\b|km\\b|kgs?|kilograms?|kilometres?|kilometers?|miles?|li\\b|feet|ft\\b|inches?|cm\\b|mm\\b|acres?|hectares?|tonnes?|tons?|grams?|litres?|liters?|ml\\b|points?|pts\\b|percent|%|rupees?|rs\\b|lakh|crore|dollars?|paise|tractors|markets?|messages?|people|persons|students|soldiers|troops|workers|farmers|villagers|monks?|nuns?|monasteries?|horses?|elephants?|cattle\\b|cows?|camels?|sheep\\b|goats?|buffaloes?|houses?|buildings?|villages?|states?|districts?|coins?|years?|yrs?|masters?)';
  var re5 = new RegExp('(?<!\\b(?:' + UNITS + ')[\\s-]|&\\s)\\b(1[0-9]{3}|20[0-2][0-9])\\b(?!' + '[\\s-]*(?:' + UNITS + ')\\b|' + '[\\s-]*&[\\s-]*\\d)', 'gi');
  while ((m = re5.exec(t))) { add(+m[1]); }
  if (!points.length) return null;
  return { min: Math.min.apply(null, points), max: Math.max.apply(null, points), trusted: trusted };
}

function yearsFrom(text) {
  var s = yearSignals(text);
  return s ? { min: s.min, max: s.max } : null;
}

// A year embedded in a topic NAME is only trusted when the name clearly frames it as a
// year — "Revolt of 1857", "Indo-Pakistani War of 1965", "1857 rebellion" — not when it
// is a quantity or part of a title ("ATP Masters 1000", "1500 metres", "1000 Islands").
function nameYears(name) {
  var s = yearSignals(name);
  if (!s) return null;
  var n = ' ' + String(name).toLowerCase().replace(/\s+/g, ' ') + ' ';
  var yf = /(^|\s)(of|in|from|since|by|the|and|around|circa|during|after|before|post)\s+(1[0-9]{3}|20[0-2][0-9])(\s|$)/.test(n)
    || /(^|\s)(1[0-9]{3}|20[0-2][0-9])\s+(revolt|rebellion|revolution|movement|war|battle|act|mutiny|partition|uprising|massacre|era|period|decade)(\s|$)/.test(n)
    || /^\s*(1[0-9]{3}|20[0-2][0-9])\s*$/.test(name);
  return yf ? s : null;
}

// Birth–death span for a person, e.g. "14 April 1891 – 6 December 1956" or "(1869–1948)".
function bioSpan(text) {
  var m = String(text || '').match(/\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})\s*[-\u2013]\s*\d{1,2}\s+[A-Z][a-z]+\.?\s+(\d{3,4})/);
  if (m) return { min: +m[1], max: +m[2] };
  m = String(text || '').match(/\(\s*(\d{3,4})\s*[-\u2013]\s*(\d{3,4})\s*\)/);
  if (m && +m[1] < +m[2] && +m[2] <= 2026) return { min: +m[1], max: +m[2] };
  return null;
}

var ERAS = [
  { id: 'ancient',       label: 'Ancient India',       min: -3300, max: 1199 },
  { id: 'medieval',      label: 'Medieval India',      min: 1200,  max: 1799 },
  { id: 'colonial',      label: 'Colonial Era',        min: 1800,  max: 1856 },
  { id: 'freedom',       label: 'Freedom Struggle',    min: 1857,  max: 1947 },
  { id: 'republic',      label: 'Republic / Post-independence', min: 1948, max: 1990 },
  { id: 'contemporary',  label: 'Contemporary India',  min: 1991,  max: 2026 }
];

// Curated spine: every group has an explicit type + zoom level.
// level 1 = era/movement scale · 2 = people/events · 3 = orgs/schemes/diseases · 4 = fine topics
var SEED = {
  movements: { type: 'event', level: 1, list: [
    'Indian independence movement', 'Non-cooperation movement', 'Civil disobedience movement', 'Quit India movement',
    'Khilafat movement', 'Partition of India', 'Simon Commission', 'Salt march', 'Jallianwala Bagh massacre',
    'Revolt of 1857', 'Swadeshi movement', 'Indian National Congress', 'Constituent Assembly of India',
    'Sepoy Mutiny', 'Bardoli Satyagraha', 'Champaran Satyagraha', 'Dandi March',
    'Ghadar Movement', 'Azad Hind Fauj', 'Radcliffe Line'
  ]},
  wars: { type: 'event', level: 1, list: [
    'Battle of Plassey', 'Battle of Buxar', 'First Battle of Panipat', 'Second Battle of Panipat',
    'Third Battle of Panipat', 'Battle of Haldighati', 'Battle of Talikota', 'Battle of Wandiwash',
    'Anglo-Mysore Wars', 'Anglo-Maratha Wars', 'First Anglo-Sikh War', 'Second Anglo-Sikh War',
    'Sino-Indian War', 'Indo-Pakistani War of 1965', 'Bangladesh Liberation War', 'Kargil War'
  ]},
  reforms: { type: 'event', level: 1, list: [
    'Economic liberalisation in India', 'LPG reforms', 'Demonetisation in India',
    'Goods and Services Tax (India)', 'Five-Year Plans (India)', 'Bank nationalisation in India',
    '73rd Constitutional Amendment', 'Railway Budget'
  ]},
  people: { type: 'person', level: 2, list: [
    'Mahatma Gandhi', 'B. R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Subhas Chandra Bose',
    'Bal Gangadhar Tilak', 'Gopal Krishna Gokhale', 'Bhagat Singh', 'Mohammad Ali Jinnah', 'Rabindranath Tagore',
    'Lal Bahadur Shastri', 'Indira Gandhi', 'Sarojini Naidu', 'Rajendra Prasad', 'C. Rajagopalachari',
    'Mangal Pandey', 'Rani Lakshmibai', 'Vinayak Damodar Savarkar', 'Annie Besant', 'Dadabhai Naoroji',
    'Lala Lajpat Rai', 'Bipin Chandra Pal',
    'Gautama Buddha', 'Mahavira', 'Chandragupta Maurya', 'Ashoka', 'Chanakya', 'Samudragupta',
    'Harsha', 'Kanishka', 'Panini', 'Charaka', 'Sushruta', 'Kalidasa', 'Aryabhata', 'Alexander the Great',
    'Moggaliputta-Tissa', 'Faxian', 'Yijing', 'Julius Caesar', 'Augustus', 'Cleopatra', 'Genghis Khan',
    'Confucius', 'Sun Yat-sen', 'Justinian', 'Charlemagne', 'Marco Polo', 'Mehmed', 'Suleiman',
    'Christopher Columbus', 'Ferdinand Magellan', 'Martin Luther', 'Johannes Gutenberg', 'Isaac Newton',
    'Charles Darwin', 'Napoleon', 'Abraham Lincoln', 'Adolf Hitler', 'Vladimir Lenin', 'Joseph Stalin',
    'Franklin D. Roosevelt', 'Winston Churchill', 'Mao Zedong', 'Nelson Mandela', 'Martin Luther King Jr.',
    'Zhu Yuanzhang', 'Yongle Emperor', 'Zheng He', 'Xu Da', 'Chang Yuchun', 'Tang He', 'Liao Yongzhong', 'Hu Mei',
    'Ranjit Singh', 'C V Raman',
    'Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Marie Curie', 'Louis Pasteur', 'Galileo Galilei',
    'Mahmud of Ghazni', 'Mohammad Ghori', 'Prithviraj Chauhan', 'Jahangir', 'Kabir', 'Nur Jahan', 'Bajirao I',
    'Sambhaji', 'Guru Tegh Bahadur',     'Guru Arjan', 'Chaitanya Mahaprabhu', 'Tukaram', 'Basavanna',
    'Bimbisara', 'Ajatashatru', 'Bindusara', 'Pushyamitra Sunga', 'Gautamiputra Satakarni', 'Rudradaman',
    'Kujula Kadphises', 'Chandragupta I', 'Chandragupta II', 'Skandagupta', 'Varahamihira', 'Brahmagupta',
    'Bhaskara', 'Banabhatta', 'Rajaraja Chola I', 'Rajendra Chola', 'Pulakeshin II', 'Narasimhavarman',
    'Krishnadevaraya', 'Harihara', 'Bukka', 'Iltutmish', 'Razia Sultana', 'Balban', 'Alauddin Khilji',
    'Muhammad bin Tughlaq', 'Firoz Shah Tughlaq', 'Timur', 'Ibrahim Lodi', 'Babur', 'Humayun', 'Akbar',
    'Bahadur Shah Zafar', 'Hemu', 'Balaji Vishwanath', 'Madhavrao', 'Mahadji Scindia', 'Nana Saheb',
    'Tantia Tope', 'Ramananda', 'Vallabhacharya', 'Guru Ramdas', 'Mahatma Phule', 'Savitribai Phule',
    'Surendranath Banerjee', 'Madan Mohan Malaviya', 'Chandra Shekhar Azad', 'Sukhdev', 'Rajguru',
    'Sri Aurobindo', 'Swami Dayananda Saraswati', 'Ramakrishna Paramahamsa',
    'Cyrus the Great', 'Darius', 'Nebuchadnezzar', 'Pericles', 'Socrates', 'Plato', 'Homer', 'Hannibal',
    'Scipio Africanus', 'Spartacus', 'Marcus Aurelius', 'Constantine', 'Prophet Muhammad', 'Harun al-Rashid',
    'Saladin', 'William the Conqueror', 'Richard the Lionheart', 'Kublai Khan', 'Ibn Sina', 'Al-Biruni',
    'Leonardo da Vinci', 'Michelangelo', 'William Shakespeare', 'Copernicus', 'Voltaire', 'Rousseau',
    'Adam Smith', 'Bismarck', 'Queen Victoria', 'Garibaldi', 'Karl Marx', 'John F. Kennedy', 'Rosa Parks',
    'Mikhail Gorbachev', 'Ronald Reagan', 'Margaret Thatcher', 'Deng Xiaoping', 'Lee Kuan Yew', 'Xi Jinping',
    'Mahathir',
    'Srinivasa Ramanujan', 'Maharishi Patanjali', 'Raja Ram Mohan Roy', 'Ishwar Chandra Vidyasagar',
    'Chittaranjan Das', 'Motilal Nehru', 'Maulana Abul Kalam Azad', 'Muhammad Iqbal',
    'Shyama Prasad Mukherjee', 'Vinoba Bhave', 'Jayaprakash Narayan', 'Periyar', 'K. Kamaraj',
    'C. N. Annadurai', 'Narayana Guru', 'Jagadish Chandra Bose', 'Meghnad Saha', 'Vikram Sarabhai',
    'Homi Bhabha', 'A. P. J. Abdul Kalam', 'Salim Ali', 'Prafulla Chandra Ray', 'Subramania Bharati',
    'Ram Prasad Bismil', 'Birsa Munda', 'Bahadur Shah I', 'Shah Alam II', 'Baji Rao II', 'Dara Shikoh',
    'Joan of Arc', 'Raphael', 'Kepler', 'Sigmund Freud'
  ]},
  religion: { type: 'event', level: 2, list: [
    'First Buddhist Council', 'Second Buddhist Council', 'Third Buddhist Council', 'Fourth Buddhist Council',
    'Buddhist missions under Ashoka', 'Mahaparinirvana of the Buddha'
  ]},
  sites: { type: 'concept', level: 3, list: [
    'Lumbini', 'Kushinagar', 'Rajgir', 'Pataliputra', 'Gandhara', 'Mathura', 'Vatsa', 'Rigveda',
    'Mohenjo-daro', 'Kanchi', 'Vaishali', 'Kurukshetra', 'Magadha', 'Mahajanapadas'
  ]},
  classical: { type: 'event', level: 2, list: [
    'Roman Republic', 'Hellenistic period', 'Parthian Empire', 'Sasanian Empire'
  ]},
  greekStates: { type: 'concept', level: 3, list: [
    'Athens', 'Sparta'
  ]},
  conquests: { type: 'event', level: 2, list: [
    'Huna invasions of India', 'Huns', 'Vikings'
  ]},
  china: { type: 'event', level: 2, list: [
    'Qin dynasty', 'Han dynasty', 'Song dynasty', 'Ming dynasty', 'Qing dynasty',
    'Cultural Revolution', 'Long March', 'Taiping Rebellion', 'Boxer Rebellion',
    'Red Turban Rebellion', 'Battle of Lake Poyang', 'Jingnan Campaign', 'Ming conquest of Yunnan',
    'Treasure voyages', 'Forbidden City', 'Yongle Encyclopedia'
  ]},
  chinaSites: { type: 'concept', level: 3, list: [
    'Great Wall of China'
  ]},
  worldAncient: { type: 'event', level: 1, list: [
    'Ancient Egypt', 'Sumer', 'Babylon', 'Assyria', 'Phoenicia', 'Hittite Empire',
    'Mycenaean civilization', 'Minoan civilization', 'Carthage', 'Persian Empire', 'Roman Empire'
  ]},
  medievalWorld: { type: 'event', level: 1, list: [
    'Byzantine Empire', 'Holy Roman Empire', 'Norman Conquest', 'Umayyad Caliphate', 'Abbasid Caliphate',
    'Islamic Golden Age', 'Crusades', 'Mongol Empire', 'Ottoman Empire', 'Hundred Years\u2019 War'
  ]},
  earlyModern: { type: 'event', level: 1, list: [
    'Age of Discovery', 'Protestant Reformation', 'Scientific Revolution', 'Enlightenment',
    'Congress of Vienna', 'American Revolution', 'French Revolution', 'Industrial Revolution',
    'British East India Company'
  ]},
  modernWorld: { type: 'event', level: 1, list: [
    'Meiji Restoration', 'American Civil War', 'Scramble for Africa', 'Russian Revolution',
    'Great Depression', 'Weimar Republic', 'World War I', 'Nazism', 'World War II', 'Holocaust'
  ]},
  contemporary: { type: 'event', level: 1, list: [
    'Cold War', 'Marshall Plan', 'Berlin Wall', 'Korean War', 'Vietnam War', 'Cuban Missile Crisis',
    'Space Race', 'Civil Rights Movement', 'Apartheid', 'Dissolution of the Soviet Union',
    'War on Terror', 'Arab Spring', '9/11 attacks'
  ]},
  globalConcepts: { type: 'concept', level: 1, list: [
    'Internet', 'GPS', 'Bollywood', 'El Niño', 'La Niña'
  ]},
  wildlife: { type: 'concept', level: 3, list: [
    'Gir'
  ]},
  spaceTech: { type: 'event', level: 2, list: [
    'Sputnik', 'Hubble Space Telescope', 'James Webb Space Telescope', 'Voyager program'
  ]},
  digital: { type: 'concept', level: 2, list: [
    'Smartphone', 'Microsoft', 'Linux', 'Microsoft Windows', 'Twitter', 'Instagram', 'YouTube', 'Bitcoin', 'Cryptocurrency'
  ]},
  agriConcepts: { type: 'concept', level: 3, list: [
    'Handloom', 'Jute', 'Fisheries', 'Poultry', 'Helicopter'
  ]},
  constitutionalPosts: { type: 'concept', level: 3, list: [
    'Vice President of India', 'Speaker of the Lok Sabha', 'Lokpal'
  ]},
  canon: { type: 'concept', level: 3, list: [
    'Tipiṭaka (Pali Canon)'
  ]},
  empires: { type: 'event', level: 1, list: [
    'Indus Valley Civilization', 'Vedic period', 'Maurya Empire', 'Gupta Empire', 'Kalinga War',
    'Kushan Empire', 'Sunga Empire', 'Chola Empire', 'Harsha Empire', 'Rashtrakuta Empire',
    'Delhi Sultanate', 'Vijayanagara Empire', 'Mughal Empire', 'Maratha Empire'
  ]},
  sportspeople: { type: 'person', level: 2, list: [
    'Milkha Singh', 'Dhyan Chand', 'Kapil Dev', 'Sachin Tendulkar', 'P. T. Usha', 'Mary Kom',
    'Neeraj Chopra', 'Abhinav Bindra', 'Saina Nehwal', 'Viswanathan Anand'
  ]},
  science: { type: 'event', level: 2, list: [
    'Chandrayaan-1', 'Chandrayaan-3', 'Mangalyaan', 'Pokhran-II', 'Nuclear tests of India', 'Smallpox eradication',
    'INS Vikrant'
  ]},
  sports: { type: 'event', level: 2, list: [
    'Olympic Games', 'Commonwealth Games', 'Asian Games', 'Cricket World Cup', 'T20 World Cup',
    'Hockey World Cup', 'Khelo India'
  ]},
  diseases: { type: 'disease', level: 3, list: [
    'COVID-19', 'Smallpox', 'Cholera', 'Plague', 'Tuberculosis', 'Leprosy', 'Polio', 'Malaria',
    'Dengue', 'Spanish flu', 'Chikungunya', 'Kala-azar', 'Famine', 'Black Death'
  ]},
  schemes: { type: 'scheme', level: 3, list: [
    'National Health Mission', 'Swachh Bharat Mission', 'Poshan Abhiyan', 'Ayushman Bharat',
    'National Rural Health Mission', 'Green Revolution', 'Operation Flood',
    'Pradhan Mantri Jan Dhan Yojana', 'Bharat Nirman', 'MGNREGA', 'Blue Revolution'
  ]},
  commissions: { type: 'org', level: 3, list: [
    'Sarkaria Commission', 'Mandal Commission', 'Kothari Commission', 'Finance Commission of India',
    'Election Commission of India', 'Law Commission of India', 'National Human Rights Commission of India',
    'Second Administrative Reforms Commission'
  ]},
  orgs: { type: 'org', level: 3, list: [
    'Indian Space Research Organisation', 'Defence Research and Development Organisation',
    'Bhabha Atomic Research Centre', 'Council of Scientific and Industrial Research', 'Indian Institute of Technology',
    'Reserve Bank of India', 'State Bank of India', 'Coal India', 'Oil and Natural Gas Corporation',
    'Indian Oil Corporation', 'Nuclear power in India'
  ]},
  globalOrgs: { type: 'org', level: 1, list: [
    'United Nations', 'European Union', 'Life Insurance Corporation of India', 'Export-Import Bank of India',
    'Central Industrial Security Force'
  ]},
  geography: { type: 'concept', level: 4, list: [
    'Suez Canal', 'Panama Canal', 'McMahon Line', 'Line of Actual Control', 'Line of Control',
    'Siachen Glacier', 'Doklam'
  ]}
};

// Extra colloquial / shortened names per entity (merged with the auto aliases).
var EXTRA_ALIASES = {
  'Demonetisation in India': ['demonetisation', 'notebandi'],
  'Economic liberalisation in India': ['liberalisation', 'new economic policy'],
  'Bangladesh Liberation War': ['bangladesh war', 'liberation war 1971', '1971 war'],
  'Indo-Pakistani War of 1965': ['1965 war', 'indo-pak war'],
  'Sino-Indian War': ['1962 war', 'sino-indian conflict'],
  'Goods and Services Tax (India)': ['gst', 'goods and services tax'],
  'Five-Year Plans (India)': ['five year plan', 'planning commission'],
  'Swadeshi movement': ['swadeshi'],
  'Smallpox eradication': ['smallpox'],
  'National Rural Health Mission': ['nrh'],
  'Pradhan Mantri Jan Dhan Yojana': ['jan dhan'],
  'Indian National Congress': ['congress'],
  'Reserve Bank of India': ['rbi'],
  'State Bank of India': ['sbi'],
  'Oil and Natural Gas Corporation': ['ongc'],
  'Indian Oil Corporation': ['ioc'],
  'Election Commission of India': ['eci'],
  'Chandrayaan-1': ['chandrayaan 1'],
  'Mangalyaan': ['mars orbiter mission'],
  'Alexander the Great': ['alexander', 'alexander invasion'],
  'Indus Valley Civilization': ['harappan civilization', 'indus valley'],
  'Gupta Empire': ['guptas'],
  'Maurya Empire': ['mauryan empire', 'mauryas'],
  'Mughal Empire': ['mughals'],
  'Delhi Sultanate': ['sultanate'],
  'Ashoka': ['ashoka the great', 'asoka'],
  'Gautama Buddha': ['siddhartha', 'gautam buddha'],
  'Mahavira': ['mahavir', 'vardhamana'],
  'Moggaliputta-Tissa': ['moggaliputta', 'moggali', 'moggaliputta tissa'],
  'First Buddhist Council': ['first buddhist council', 'council of rajagriha', 'rajagriha council', 'sattapani'],
  'Second Buddhist Council': ['second buddhist council', 'council of vaishali', 'vaishali council'],
  'Third Buddhist Council': ['third buddhist council', 'council of pataliputra', 'pataliputra council'],
  'Fourth Buddhist Council': ['fourth buddhist council', 'council of aluvihara', 'aluvihara council'],
  'Buddhist missions under Ashoka': ['buddhist missions', 'mauryan missions'],
  'Tipiṭaka (Pali Canon)': ['tipitaka', 'pali canon'],
  'Mahaparinirvana of the Buddha': ['mahaparinirvana', 'parinirvana', 'parinibhana'],
  'Lumbini': ['lumbini'], 'Kushinagar': ['kushinagar', 'kusinagara', 'kusinara'],
  'Rajgir': ['rajgir', 'rajagriha', 'rajagriha', 'raigir'],
  'Pataliputra': ['pataliputra', 'patliputra', 'pataliputram'],
  'Gandhara': ['gandhara'], 'Mathura': ['mathura'],
  'Vatsa': ['vatsa'], 'Rigveda': ['rigveda', 'rig veda'],
  'Roman Republic': ['roman republic', 'res publica'],
  'Hellenistic period': ['hellenistic', 'hellenistic period', 'hellenism'],
  'Parthian Empire': ['parthian', 'parthia'],
  'Sasanian Empire': ['sasanian', 'sassanian', 'sassanid'],
  'Ancient Greece': ['greek city-states', 'hellas'],
  'Athens': ['athens', 'athenian'],
  'Sparta': ['sparta', 'spartan'],
  'Huna invasions of India': ['huna invasion', 'huna invasions', 'hunas', 'alchon', 'toramana', 'mihirakula'],
  'Huns': ['huns', 'hunnic', 'attila'],
  'Vikings': ['vikings', 'viking age', 'viking raids', 'norse'],
  'Julius Caesar': ['julius caesar', 'gaius julius caesar'],
  'Augustus': ['augustus', 'octavian', 'augustus caesar'],
  'Cleopatra': ['cleopatra', 'cleopatra vii'],
  'Faxian': ['faxian', 'fa-hien', 'fahien', 'fa hsien'],
  'Yijing': ['i-tsing', 'itsing', 'yijing'],
  'Genghis Khan': ['genghis khan', 'chinggis khan', 'temujin'],
  'Confucius': ['confucius', 'kong qiu', 'kongzi'],
  'Sun Yat-sen': ['sun yat-sen', 'sun yat sen', 'sun zhongshan', 'sun wen'],
  'Qin dynasty': ['qin dynasty', 'qin', 'qin shi huang'],
  'Han dynasty': ['han dynasty', 'han'],
  'Song dynasty': ['song dynasty', 'song china'],
  'Ming dynasty': ['ming dynasty', 'ming', 'red turban', 'zhu yuanzhang', 'hongwu', 'yongle', 'zheng he',
    'treasure voyages', 'treasure fleet', 'jingnan', 'lake poyang', 'poyang', 'hu weiyong', 'xu da',
    'chang yuchun', 'tang he', 'liao yongzhong', 'hu mei', 'guo zixing', 'zhang shicheng', 'chen youliang',
    'forbidden city', 'yongle encyclopedia', 'ming conquest of yunnan', 'jianwen', 'zhu di', 'han shantong',
    'da ming baochao', 'naghachu', 'buir lake', 'fang guozhen', 'ming-mong mao war'],
  'Red Turban Rebellion': ['red turban rebellion', 'red turbans', 'red turban'],
  'Battle of Lake Poyang': ['battle of lake poyang', 'battle of poyang', 'lake poyang'],
  'Jingnan Campaign': ['jingnan campaign', 'jingnan'],
  'Ming conquest of Yunnan': ['ming conquest of yunnan', 'conquest of yunnan'],
  'Treasure voyages': ['treasure voyages', 'treasure voyage', 'treasure fleet', 'zheng he voyages', 'seven voyages'],
  'Forbidden City': ['forbidden city', 'zijincheng', 'palace museum'],
  'Yongle Encyclopedia': ['yongle encyclopedia', 'yongle encyclopaedia', 'yongle dadian'],
  'Zhu Yuanzhang': ['zhu yuanzhang', 'hongwu emperor', 'hongwu'],
  'Yongle Emperor': ['yongle emperor', 'yongle', 'zhu di'],
  'Zheng He': ['zheng he', 'cheng ho', 'ma he'],
  'Xu Da': ['xu da', 'hsu ta'],
  'Chang Yuchun': ['chang yuchun', 'chang ch\u2019un'],
  'Tang He': ['tang he', 'tang ho'],
  'Liao Yongzhong': ['liao yongzhong', 'liao yung-chung'],
  'Hu Mei': ['hu mei', 'hu tingrui'],
  'Mohenjo-daro': ['mohenjo-daro', 'mohenjodaro', 'moenjo-daro', 'mohenjo daro'],
  'Kanchi': ['kanchi', 'kanchipuram', 'conjeevaram'],
  'Vaishali': ['vaishali', 'vesali'],
  'Kurukshetra': ['kurukshetra', 'kuruksetra'],
  'Ranjit Singh': ['ranjit singh', 'maharaja ranjit singh'],
  'C V Raman': ['c v raman', 'cv raman', 'chandrasekhara venkata raman', 'raman effect'],
  'Ghadar Movement': ['ghadar movement', 'ghadar party', 'gadar movement', 'ghadar rebellion', 'ghadar conspiracy'],
  'Azad Hind Fauj': ['azad hind fauj', 'azad hind', 'indian national army', 'ina', 'azad hind government', 'provisional government of free india'],
  'Radcliffe Line': ['radcliffe line', 'radcliffe boundary', 'radcliffe award', 'radcliffe'],
  '73rd Constitutional Amendment': ['73rd constitutional amendment', '73rd amendment', 'seventy-third amendment', 'panchayati raj act 1992', '73rd amendment act'],
  'INS Vikrant': ['ins vikrant', 'vikrant'],
  'GPS': ['gps', 'global positioning system'],
  'Bollywood': ['bollywood', 'hindi cinema', 'bombay film industry'],
  'Gir': ['gir forest', 'gir national park', 'gir sanctuary', 'gir', 'sasan gir'],
  'Thomas Edison': ['thomas edison', 'edison'],
  'Alexander Graham Bell': ['alexander graham bell', 'graham bell'],
  'Nikola Tesla': ['nikola tesla', 'tesla'],
  'Marie Curie': ['marie curie', 'marie curie-sklodowska', 'marie sklodowska curie'],
  'Louis Pasteur': ['louis pasteur', 'pasteur'],
  'Galileo Galilei': ['galileo galilei', 'galileo'],
  'Mahmud of Ghazni': ['mahmud of ghazni', 'mahmud ghaznavi', 'mahmood ghaznavi', 'sultan mahmud', 'muhammad of ghazni'],
  'Mohammad Ghori': ['mohammad ghori', 'muhammad ghori', 'mohammed ghori', 'shahabuddin ghori', 'muhammad of ghor'],
  'Prithviraj Chauhan': ['prithviraj chauhan', 'prithviraj iii', 'rai pithora'],
  'Jahangir': ['jahangir', 'nur-ud-din jahangir'],
  'Kabir': ['kabir', 'sant kabir', 'kabir das'],
  'Nur Jahan': ['nur jahan', 'mehr-un-nissa', 'nurjahan'],
  'Bajirao I': ['bajirao i', 'bajirao', 'bajirao ballal', 'peshwa bajirao'],
  'Sambhaji': ['sambhaji', 'sambhaji maharaj', 'sambhaji bhonsle'],
  'Guru Tegh Bahadur': ['guru tegh bahadur', 'guru teg bahadur', 'tegh bahadur'],
  'Guru Arjan': ['guru arjan', 'guru arjun', 'arjan dev'],
  'Chaitanya Mahaprabhu': ['chaitanya mahaprabhu', 'sri chaitanya', 'chaitanya'],
  'Tukaram': ['tukaram', 'sant tukaram'],
  'Basavanna': ['basavanna', 'basava'],
  'Sputnik': ['sputnik', 'sputnik 1', 'sputnik program'],
  'Hubble Space Telescope': ['hubble space telescope', 'hubble telescope', 'hubble', 'hst'],
  'James Webb Space Telescope': ['james webb space telescope', 'james webb telescope', 'webb telescope', 'jwst'],
  'Voyager program': ['voyager program', 'voyager', 'voyager 1', 'voyager 2'],
  'Smartphone': ['smartphone', 'smart phone', 'smartphones'],
  'Microsoft': ['microsoft'],
  'Linux': ['linux', 'linux operating system', 'gnu/linux'],
  'Microsoft Windows': ['microsoft windows', 'windows'],
  'Twitter': ['twitter'],
  'Instagram': ['instagram', 'insta'],
  'YouTube': ['youtube', 'you tube'],
  'Bitcoin': ['bitcoin', 'btc'],
  'Cryptocurrency': ['cryptocurrency', 'crypto currency', 'cryptocurrencies', 'digital currency'],
  'Life Insurance Corporation of India': ['life insurance corporation of india', 'lic of india', 'lic'],
  'Export-Import Bank of India': ['export-import bank of india', 'exim bank', 'exim'],
  'Central Industrial Security Force': ['central industrial security force', 'cisf'],
  'Lokpal': ['lokpal', 'lok pal', 'lokpal and lokayuktas'],
  'Vice President of India': ['vice president of india', 'vice-president of india', 'indian vice president'],
  'Speaker of the Lok Sabha': ['speaker of the lok sabha', 'speaker of lok sabha', 'lok sabha speaker'],
  'MGNREGA': ['mgnrega', 'nrega', 'mahatma gandhi national rural employment guarantee act', 'national rural employment guarantee'],
  'Railway Budget': ['railway budget', 'rail budget'],
  'Blue Revolution': ['blue revolution', 'fish revolution'],
  'El Niño': ['el nino', 'el niño', 'el-nino', 'el nino southern oscillation'],
  'La Niña': ['la nina', 'la niña', 'la-nina'],
  'Handloom': ['handloom', 'hand loom', 'handloom sector'],
  'Jute': ['jute', 'jute industry', 'jute mill'],
  'Fisheries': ['fisheries', 'fishery', 'fishing industry', 'fisheries sector'],
  'Poultry': ['poultry', 'poultry farming', 'poultry industry'],
  'Helicopter': ['helicopter', 'helicopters'],
  'Bimbisara': ['bimbisara', 'shrenika'],
  'Ajatashatru': ['ajatashatru', 'ajatasattu', 'kunika'],
  'Bindusara': ['bindusara', 'amitraghata'],
  'Pushyamitra Sunga': ['pushyamitra sunga', 'pushyamitra', 'pusyamitra'],
  'Gautamiputra Satakarni': ['gautamiputra satakarni', 'gautamiputra'],
  'Rudradaman': ['rudradaman', 'rudradaman i'],
  'Kujula Kadphises': ['kujula kadphises', 'kujula'],
  'Chandragupta I': ['chandragupta i'],
  'Chandragupta II': ['chandragupta ii', 'chandragupta vikramaditya', 'vikramaditya'],
  'Skandagupta': ['skandagupta'],
  'Varahamihira': ['varahamihira', 'varaha mihira'],
  'Brahmagupta': ['brahmagupta'],
  'Bhaskara': ['bhaskara', 'bhaskaracharya', 'bhaskara ii'],
  'Banabhatta': ['banabhatta', 'bana bhatta'],
  'Rajaraja Chola I': ['rajaraja chola', 'rajaraja chola i', 'raja raja chola', 'rajaraja the great'],
  'Rajendra Chola': ['rajendra chola', 'rajendra chola i'],
  'Pulakeshin II': ['pulakeshin ii', 'pulakesin ii', 'pulakesi ii'],
  'Narasimhavarman': ['narasimhavarman', 'narasimha varman', 'mamalla'],
  'Krishnadevaraya': ['krishnadevaraya', 'krishna deva raya', 'sri krishnadevaraya'],
  'Harihara': ['harihara', 'harihara i', 'hakka'],
  'Bukka': ['bukka', 'bukka raya', 'bukka i'],
  'Iltutmish': ['iltutmish', 'shams-ud-din iltutmish', 'shams ud din iltutmish'],
  'Razia Sultana': ['razia sultana', 'raziya sultana', 'razia'],
  'Balban': ['balban', 'ghiyas ud din balban', 'ulugh khan'],
  'Alauddin Khilji': ['alauddin khilji', 'alau-ud-din khilji', 'ala ud din khilji', 'alaluddin khilji'],
  'Muhammad bin Tughlaq': ['muhammad bin tughlaq', 'mohammad bin tughlaq', 'muhammad tughlaq', 'mohammed bin tughlaq'],
  'Firoz Shah Tughlaq': ['firoz shah tughlaq', 'firuz shah tughlaq', 'firoz shah'],
  'Timur': ['timur', 'tamerlane', 'timur lang', 'timur the lame', 'amir timur'],
  'Ibrahim Lodi': ['ibrahim lodi', 'ibrahim lodhi'],
  'Babur': ['babur', 'zahir-ud-din muhammad', 'zahiruddin babur'],
  'Humayun': ['humayun', 'nasir-ud-din humayun', 'nasiruddin humayun'],
  'Akbar': ['akbar', 'akbar the great', 'jalal-ud-din akbar', 'jalaluddin akbar', 'akbar mughal'],
  'Bahadur Shah Zafar': ['bahadur shah zafar', 'bahadur shah ii', 'zafar'],
  'Hemu': ['hemu', 'hemu vikramaditya', 'hem chandra'],
  'Balaji Vishwanath': ['balaji vishwanath', 'balaji vishvanath'],
  'Madhavrao': ['madhavrao', 'madhava rao', 'peshwa madhavrao', 'madhavrao i'],
  'Mahadji Scindia': ['mahadji scindia', 'mahadji sindhia', 'mahadji'],
  'Nana Saheb': ['nana saheb', 'nana sahib', 'dhondu pant'],
  'Tantia Tope': ['tantia tope', 'tantya tope'],
  'Ramananda': ['ramananda', 'sant ramananda'],
  'Vallabhacharya': ['vallabhacharya', 'vallabha'],
  'Guru Ramdas': ['guru ramdas', 'guru ram dass', 'guru ram das'],
  'Mahatma Phule': ['jyotirao phule', 'jyotiba phule', 'mahatma phule', 'mahadev govind rao phule', 'phule'],
  'Savitribai Phule': ['savitribai phule', 'savitri bai phule'],
  'Surendranath Banerjee': ['surendranath banerjee', 'surendranath bannerjee', 'surendranath'],
  'Madan Mohan Malaviya': ['madan mohan malaviya', 'pandit malaviya', 'malaviya'],
  'Chandra Shekhar Azad': ['chandra shekhar azad', 'chandrashekhar azad', 'azad'],
  'Sukhdev': ['sukhdev', 'sukhdev thapar'],
  'Rajguru': ['rajguru', 'shivaram rajguru', 'shivaram hari rajguru'],
  'Sri Aurobindo': ['sri aurobindo', 'aurobindo ghose', 'aurobindo'],
  'Swami Dayananda Saraswati': ['swami dayananda', 'dayananda saraswati', 'dayanand'],
  'Ramakrishna Paramahamsa': ['ramakrishna paramahamsa', 'sri ramakrishna', 'ramakrishna'],
  'Cyrus the Great': ['cyrus the great', 'cyrus ii', 'cyrus'],
  'Darius': ['darius', 'darius i', 'darius the great'],
  'Nebuchadnezzar': ['nebuchadnezzar', 'nebuchadnezzar ii', 'nabuchadnezzar'],
  'Pericles': ['pericles'],
  'Socrates': ['socrates'],
  'Plato': ['plato'],
  'Homer': ['homer'],
  'Hannibal': ['hannibal'],
  'Scipio Africanus': ['scipio africanus', 'scipio'],
  'Spartacus': ['spartacus'],
  'Marcus Aurelius': ['marcus aurelius', 'marcus aurelius antoninus'],
  'Constantine': ['constantine', 'constantine the great', 'constantine i'],
  'Prophet Muhammad': ['prophet muhammad', 'muhammad', 'mohammad the prophet', 'holy prophet'],
  'Harun al-Rashid': ['harun al-rashid', 'haroon al rashid', 'harun al rashid'],
  'Saladin': ['saladin', 'salah ad-din', 'salahuddin ayubi'],
  'William the Conqueror': ['william the conqueror', 'william i'],
  'Richard the Lionheart': ['richard the lionheart', 'richard i of england', 'richard coeur de lion'],
  'Kublai Khan': ['kublai khan', 'kubla khan', 'khubilai'],
  'Ibn Sina': ['ibn sina', 'avicenna', 'abu ali sina'],
  'Al-Biruni': ['al-biruni', 'alberuni', 'abu raihan biruni'],
  'Leonardo da Vinci': ['leonardo da vinci', 'leonardo', 'da vinci'],
  'Michelangelo': ['michelangelo', 'michelangelo buonarroti'],
  'William Shakespeare': ['william shakespeare', 'shakespeare'],
  'Copernicus': ['copernicus', 'nicolaus copernicus', 'mikolaj kopernik'],
  'Voltaire': ['voltaire', 'francois-marie arouet'],
  'Rousseau': ['rousseau', 'jean-jacques rousseau', 'jean jacques rousseau'],
  'Adam Smith': ['adam smith'],
  'Bismarck': ['bismarck', 'otto von bismarck'],
  'Queen Victoria': ['queen victoria'],
  'Garibaldi': ['garibaldi', 'giuseppe garibaldi'],
  'Karl Marx': ['karl marx'],
  'John F. Kennedy': ['john f kennedy', 'john f. kennedy', 'jfk', 'kennedy'],
  'Rosa Parks': ['rosa parks'],
  'Mikhail Gorbachev': ['mikhail gorbachev', 'gorbachev'],
  'Ronald Reagan': ['ronald reagan', 'reagan'],
  'Margaret Thatcher': ['margaret thatcher', 'thatcher'],
  'Deng Xiaoping': ['deng xiaoping'],
  'Lee Kuan Yew': ['lee kuan yew'],
  'Xi Jinping': ['xi jinping'],
  'Mahathir': ['mahathir', 'mahathir mohamad', 'tun mahathir'],
  'Srinivasa Ramanujan': ['srinivasa ramanujan', 'ramanujan'],
  'Maharishi Patanjali': ['patanjali', 'maharishi patanjali', 'sage patanjali'],
  'Raja Ram Mohan Roy': ['raja ram mohan roy', 'ram mohan roy', 'raja rammohan roy', 'r r m roy'],
  'Ishwar Chandra Vidyasagar': ['ishwar chandra vidyasagar', 'ishvar chandra vidyasagar', 'vidyasagar', 'ishwar chandra'],
  'Chittaranjan Das': ['chittaranjan das', 'chitta ranjan das', 'deshbandhu', 'c r das'],
  'Motilal Nehru': ['motilal nehru', 'pandit motilal nehru'],
  'Maulana Abul Kalam Azad': ['maulana azad', 'maulana abul kalam azad', 'abul kalam azad', 'azad'],
  'Muhammad Iqbal': ['muhammad iqbal', 'allama iqbal', 'sir muhammad iqbal'],
  'Shyama Prasad Mukherjee': ['shyama prasad mukherjee', 'syama prasad mukherjee', 's p mukherjee'],
  'Vinoba Bhave': ['vinoba bhave', 'acharya vinoba bhave', 'vinoba'],
  'Jayaprakash Narayan': ['jayaprakash narayan', 'jp narayan', 'j p narayan'],
  'Periyar': ['periyar', 'e v ramasamy', 'ev ramasamy', 'ramasamy naicker'],
  'K. Kamaraj': ['k kamaraj', 'kamaraj', 'kamaraj nadar', 'kumarasami kamaraj'],
  'C. N. Annadurai': ['c n annadurai', 'cn annadurai', 'annadurai', 'conjeevaram annadurai'],
  'Narayana Guru': ['narayana guru', 'sree narayana guru', 'narayana guru swami'],
  'Jagadish Chandra Bose': ['jagadish chandra bose', 'jagdish chandra bose', 'j c bose', 'acharya jagadish chandra'],
  'Meghnad Saha': ['meghnad saha', 'm n saha', 'saha'],
  'Vikram Sarabhai': ['vikram sarabhai', 'vikram ambalal sarabhai', 'sarabhai'],
  'Homi Bhabha': ['homi bhabha', 'homi jehangir bhabha', 'bhabha'],
  'A. P. J. Abdul Kalam': ['a p j abdul kalam', 'apj abdul kalam', 'abdul kalam'],
  'Salim Ali': ['salim ali', 'sálim ali'],
  'Prafulla Chandra Ray': ['prafulla chandra ray', 'p c ray', 'acharya p c ray'],
  'Subramania Bharati': ['subramania bharati', 'subramanya bharathi', 'maha kavi bharathi'],
  'Ram Prasad Bismil': ['ram prasad bismil', 'ramprasad bismil', 'bismil'],
  'Birsa Munda': ['birsa munda', 'bhagwan birsa munda'],
  'Bahadur Shah I': ['bahadur shah i', 'muazzam', 'qutb-ud-din muazzam'],
  'Shah Alam II': ['shah alam ii', 'ali gauhar'],
  'Baji Rao II': ['baji rao ii', 'bajirao ii'],
  'Dara Shikoh': ['dara shikoh', 'dara shukoh'],
  'Joan of Arc': ['joan of arc', 'jeanne d\u2019arc', 'jeanne d\u2019 arc'],
  'Raphael': ['raphael', 'raffaello sanzio', 'raffaello'],
  'Kepler': ['johannes kepler', 'kepler'],
  'Sigmund Freud': ['sigmund freud', 'freud'],
  'Magadha': ['magadha', 'magadha kingdom', 'magadha empire', 'magadha janapada'],
  'Mahajanapadas': ['mahajanapada', 'mahajanapadas', 'sixteen mahajanapadas'],
  'Qing dynasty': ['qing dynasty', 'qing'],
  'Cultural Revolution': ['cultural revolution', 'great proletarian cultural revolution', 'red guards'],
  'Long March': ['long march', 'the long march'],
  'Taiping Rebellion': ['taiping', 'taiping rebellion', 'taiping heavenly kingdom'],
  'Boxer Rebellion': ['boxer rebellion', 'boxer revolt', 'yihetuan', 'righteous harmony society'],
  'Great Wall of China': ['great wall of china', 'great wall'],
  'Chanakya': ['kautilya', 'vishnugupta'],
  'Charaka': ['charak'],
  'Aryabhata': ['aryabhatta'],
  'Harsha': ['harshavardhana', 'harsha vardhana'],
  'Samudragupta': ['samudra gupta'],
  'Mahatma Gandhi': ['mohandas karamchand gandhi', 'gandhi ji'],
  'B. R. Ambedkar': ['babasaheb', 'bhimrao ambedkar', 'bhimrao ramji ambedkar'],
  'Jawaharlal Nehru': ['pandit nehru'],
  'Sardar Vallabhbhai Patel': ['sardar patel', 'vallabhbhai patel'],
  'Subhas Chandra Bose': ['netaji', 'subhas bose', 'subhash chandra bose', 'subhash bose'],
  'Bal Gangadhar Tilak': ['lokmanya tilak'],
  'Mohammad Ali Jinnah': ['mohammed ali jinnah'],
  'Vinayak Damodar Savarkar': ['veer savarkar'],
  'C. Rajagopalachari': ['rajaji', 'chakravarti rajagopalachari'],
  'P. T. Usha': ['pt usha', 'p t usha'],
  'Rani Lakshmibai': ['rani lakshmi bai', 'lakshmi bai', 'rani of jhansi'],
  'Lala Lajpat Rai': ['lajpat rai'],
  'Viswanathan Anand': ['vishwanathan anand'],
  'Five-Year Plans (India)': ['five year plan', 'five-year plan', 'five year plans'],
  'Ancient Egypt': ['ancient egypt', 'egyptian civilization', 'ancient egyptian', 'pharaohs'],
  'Sumer': ['sumer', 'sumerians', 'sumerian civilization'],
  'Babylon': ['babylon', 'babylonia', 'babylonian empire', 'babylonians'],
  'Assyria': ['assyria', 'assyrian empire', 'assyrians', 'neo-assyrian'],
  'Phoenicia': ['phoenicia', 'phoenicians', 'phoenician civilization'],
  'Hittite Empire': ['hittite empire', 'hittites', 'hittite civilization'],
  'Mycenaean civilization': ['mycenaean', 'mycenaean greece', 'mycenae'],
  'Minoan civilization': ['minoan', 'minoan civilization', 'minoans', 'minoa'],
  'Carthage': ['carthage', 'carthaginians', 'punic wars'],
  'Persian Empire': ['persian empire', 'achaemenid empire', 'achaemenid', 'achaemenids'],
  'Roman Empire': ['roman empire', 'imperial rome'],
  'Byzantine Empire': ['byzantine empire', 'byzantium', 'byzantines', 'eastern roman empire'],
  'Holy Roman Empire': ['holy roman empire', 'holy roman emperor'],
  'Norman Conquest': ['norman conquest', 'battle of hastings'],
  'Umayyad Caliphate': ['umayyad caliphate', 'umayyads', 'umayyad dynasty'],
  'Abbasid Caliphate': ['abbasid caliphate', 'abbasids', 'abbasid dynasty'],
  'Islamic Golden Age': ['islamic golden age', 'golden age of islam'],
  'Black Death': ['black death', 'bubonic plague'],
  'Age of Discovery': ['age of discovery', 'age of exploration'],
  'Protestant Reformation': ['protestant reformation', 'protestantism', 'reformation'],
  'Scientific Revolution': ['scientific revolution'],
  'Enlightenment': ['age of enlightenment'],
  'Congress of Vienna': ['congress of vienna', 'vienna congress'],
  'American Revolution': ['american revolution', 'american war of independence'],
  'British East India Company': ['british east india company', 'east india company'],
  'Meiji Restoration': ['meiji restoration', 'meiji'],
  'American Civil War': ['american civil war', 'us civil war', 'war between the states'],
  'Scramble for Africa': ['scramble for africa', 'partition of africa'],
  'Russian Revolution': ['russian revolution', 'october revolution', 'bolshevik revolution'],
  'Great Depression': ['great depression'],
  'Weimar Republic': ['weimar republic', 'weimar'],
  'World War I': ['world war i', 'world war one', 'first world war', 'great war', 'wwi'],
  'Nazism': ['nazism', 'nazi party', 'nazis', 'third reich', 'national socialism'],
  'World War II': ['world war ii', 'world war two', 'second world war', 'wwii'],
  'Holocaust': ['holocaust', 'the holocaust', 'shoah'],
  'Cold War': ['cold war'],
  'Marshall Plan': ['marshall plan'],
  'Berlin Wall': ['berlin wall'],
  'Korean War': ['korean war'],
  'Vietnam War': ['vietnam war'],
  'Cuban Missile Crisis': ['cuban missile crisis'],
  'Space Race': ['space race'],
  'Civil Rights Movement': ['civil rights movement', 'american civil rights movement'],
  'Apartheid': ['apartheid'],
  'Dissolution of the Soviet Union': ['dissolution of the soviet union', 'fall of the soviet union', 'collapse of the soviet union', 'end of the ussr'],
  'War on Terror': ['war on terror'],
  'Arab Spring': ['arab spring'],
  '9/11 attacks': ['9/11 attacks', 'september 11 attacks', 'september 11, 2001'],
  'United Nations': ['united nations', 'the un', 'united nations organization', 'uno'],
  'European Union': ['european union', 'the eu', 'european communities'],
  'Internet': ['internet', 'world wide web', 'worldwide web'],
  'Justinian': ['justinian', 'justinian the great', 'justinian i'],
  'Charlemagne': ['charlemagne', 'charles the great'],
  'Marco Polo': ['marco polo'],
  'Mehmed': ['mehmed', 'mehmed ii', 'mehmed the conqueror'],
  'Suleiman': ['suleiman', 'suleiman the magnificent', 'suleiman i'],
  'Christopher Columbus': ['christopher columbus', 'columbus'],
  'Ferdinand Magellan': ['ferdinand magellan', 'magellan'],
  'Martin Luther': ['martin luther'],
  'Johannes Gutenberg': ['johannes gutenberg', 'gutenberg'],
  'Isaac Newton': ['isaac newton', 'newton'],
  'Charles Darwin': ['charles darwin', 'darwin'],
  'Napoleon': ['napoleon', 'napoleon bonaparte', 'napoleonic'],
  'Abraham Lincoln': ['abraham lincoln', 'lincoln'],
  'Adolf Hitler': ['adolf hitler', 'hitler'],
  'Vladimir Lenin': ['vladimir lenin', 'lenin'],
  'Joseph Stalin': ['joseph stalin', 'stalin'],
  'Franklin D. Roosevelt': ['franklin d roosevelt', 'franklin roosevelt', 'fdr'],
  'Winston Churchill': ['winston churchill', 'churchill'],
  'Mao Zedong': ['mao zedong', 'mao tse-tung', 'chairman mao'],
  'Nelson Mandela': ['nelson mandela', 'mandela'],
  'Martin Luther King Jr.': ['martin luther king', 'martin luther king jr', 'mlk']
};

// Homonym guards: when the alias also names a DIFFERENT entity (same words), exclude
// questions that clearly refer to the other one. Keeps profiles from cross-contaminating.
var NEGATIVE_ALIASES = {
  'Bhagat Singh': ['koshyari', 'thind'],
  'Mahatma Gandhi': ['indira gandhi', 'rajiv gandhi', 'rahul gandhi', 'sonia gandhi', 'feroze gandhi'],
  'Jawaharlal Nehru': ['nehru university', 'nehru stadium', 'nehru park', 'nehru port'],
  'Sachin Tendulkar': ['tendulkar committee'],
  'Neeraj Chopra': ['priyanka chopra'],
  'C. Rajagopalachari': ['rajaji national park'],
  'Ashoka': ['ashoka tree', 'ashoka university'],
  'Alexander the Great': ['alexander graham bell', 'alexander fleming'],
  'Julius Caesar': ['caesar cipher', "caesar's cipher", 'caesars cipher'],
  'Athens': ['olympics', 'olympiad', 'athens olympic'],
  'Yijing': ['i ching', 'book of changes', 'yijing (i ching)'],
  'Vikings': ['vikas engine', 'french viking', 'viking engine', 'viking rocket', 'viking orbiter', 'viking lander', 'viking spacecraft', 'viking probes'],
  'Song dynasty': ['song of songs', 'song', 'songs'],
  'Boxer Rebellion': ['boxing', 'boxer', 'boxers', 'wba', 'heavyweight'],
  'Long March': ['long march to democracy', 'long march of'],
  'Persian Empire': ['persian gulf', 'persian cat', 'persian language', 'persian poetry', 'persian literature', 'persian carpet', 'persian miniature'],
  'Enlightenment': ['nirvana', 'spiritual enlightenment', 'buddhist enlightenment', 'enlightenment in buddhism', 'jain enlightenment', 'european enlightenment', 'french enlightenment'],
  'Carthage': ['carthage college', 'carthage missouri'],
  'Russian Revolution': ['russian revolution of 1905', '1905 russian revolution'],
  'Nazism': ['neo-nazi', 'neo-nazis', 'nazi gold'],
  'World War II': ['post-world war ii', 'world war ii memorial', 'world war ii veterans'],
  'Meiji Restoration': ['meiji shrine', 'meiji university'],
  'Black Death': ['black death (band)'],
  'Adolf Hitler': ['hitler youth', 'hitler diaries', 'hitler speeches', 'mein kampf'],
  'Martin Luther': ['martin luther king', 'mlk', 'martin luther king jr'],
  'Yongle Emperor': ['yongle encyclopedia', 'yongle dadian'],
  'Forbidden City': ['national palace museum'],
  'GPS': ['gram panchayat', 'gram panchayats'],
  'Bollywood': ['bollywood dance'],
  'Nikola Tesla': ['tesla inc', 'tesla motors', 'tesla model', 'tesla car'],
  'Galileo Galilei': ['galileo navigation', 'galileo satellite', 'galileo positioning', 'galileo spacecraft'],
  'Voyager program': ['star trek voyager'],
  'Jahangir': ['jahangir khan', 'jahangirpuri'],
  'Kabir': ['kabir khan', 'kabir bedi', 'kabir singh'],
  'Prithviraj Chauhan': ['prithviraj sukumaran', 'prithviraj (film)'],
  'Bajirao I': ['bajirao mastani'],
  'Guru Arjan': ['arjan singh'],
  'Chaitanya Mahaprabhu': ['chaitanya month'],
  'Microsoft Windows': ['stained glass window', 'stained glass windows', 'bay window', 'bay windows'],
  'Marco Polo': ['marco polo airport', 'marco polo games'],
  'Suleiman': ['suleiman mosque', 'suleymaniye'],
  'Mehmed': ['mehmed vi', 'mehmed v', 'sultan mehmed'],
  'United Nations': ['united nations association', 'united nations university'],
  'European Union': ['european union law', 'european union institutions'],
  'Internet': ['internet protocol', 'internet of things', 'internet archive'],
  'Isaac Newton': ['newton (unit)', 'newtons', 'newton\u2019s laws', "newton's laws"],
  'Chandragupta I': ['chandragupta ii', 'chandragupta vikramaditya'],
  'Chandragupta II': ['chandragupta i', 'ins vikramaditya', 'vikramaditya singh', 'vikramaditya motwane'],
  'Bhaskara': ['bhaskara misra', 'bhaskaran', 'bhaskara rao', 'bhaskar jyoti'],
  'Timur': ['timurid', 'timurids', 'timurid dynasty'],
  'Muhammad bin Tughlaq': ['muhammad ali', 'mohammed rafi', 'muhammad ghori', 'muhammad of ghazni', 'muhammad bin qasim', 'muhammad shah', 'muhammad v', 'muhammad yunus', 'muhammadan', 'muhammadiyah'],
  'Babur': ['baburao'],
  'Humayun': ['humayun tomb', "humayun's tomb", 'humayun memorial'],
  'Akbar': ['sirr-i-akbar', 'akbar ali', 'akbar khan'],
  'Madhavrao': ['madhava rao scindia', 'madhavrao scindia'],
  'Chandra Shekhar Azad': ['azad maidan', 'azad nagar', 'maulana azad', 'azad foundation', 'azad india', 'azad bhawan'],
  'Sri Aurobindo': ['aurobindo pharma', 'aurobindo university', 'aurobindo college'],
  'Cyrus the Great': ['cyrus mistry', 'cyrus the younger', 'cyrus broacha'],
  'Darius': ['darius iii', 'darius ii'],
  'Homer': ['homer simpson', 'homer (asteroid)'],
  'Hannibal': ['hannibal lecter', 'hannibal (tv', 'hannibal (film)'],
  'Constantine': ['constantine xi', 'constantine ii', 'constantine the african', 'constantine palaiologos', 'constantine (film)'],
  'Prophet Muhammad': ['muhammad ali', 'mohammed rafi', 'muhammad bin tughlaq', 'muhammad ghori', 'muhammad of ghazni', 'muhammad bin qasim', 'muhammad shah', 'muhammad v', 'muhammad yunus', 'muhammadan', 'muhammadiyah', 'mohammad ali', 'mohammad ali jinnah', 'mohammad ghori', 'mohammad bin qasim', 'mohammad bin tughlaq', 'mohammad shah', 'mohammad yunus', 'mohammed ali', 'mohammed ghori', 'mohammed bin tughlaq', 'mohammed shah'],
  'William the Conqueror': ['william the silent', 'william of orange'],
  'Leonardo da Vinci': ['leonardo dicaprio', 'leonardo (tmnt)'],
  'Queen Victoria': ['victoria memorial', 'victoria falls', 'victoria university', 'victoria park', 'victoria station', 'victoria cross'],
  'Karl Marx': ['marx brothers', 'groucho marx', 'harpo marx'],
  'John F. Kennedy': ['kennedy space center', 'kennedy airport', 'kennedy international airport', 'robert f kennedy', 'rfk'],
  'Ronald Reagan': ['reagan airport', 'washington reagan'],
  'Bismarck': ['bismarck (battleship)', 'bismarck ship', 'bismarck archipel'],
  'Garibaldi': ['garibaldi biscuit', 'garibaldi (biscuit)'],
  'Maharishi Patanjali': ['patanjali ayurveda', 'patanjali foods', 'patanjali products', 'patanjali yogpeeth', 'patanjali herbal'],
  'Motilal Nehru': ['jawaharlal nehru', 'pandit nehru', 'nehru university', 'nehru stadium', 'nehru park', 'nehru port'],
  'Maulana Abul Kalam Azad': ['chandra shekhar azad', 'chandrashekhar azad', 'azad maidan', 'azad nagar', 'azad india', 'azad bhawan', 'azad foundation', 'azad hind', 'azad kashmir'],
  'Shyama Prasad Mukherjee': ['pranab mukherjee', 'mukherjee nagar', 'mukherjee house'],
  'Jayaprakash Narayan': ['swaminarayan', 'narayan murthy', 'narayana guru', 'sathya narayana', 'narayan rao'],
  'Periyar': ['periyar university', 'periyar tiger reserve', 'periyar wildlife', 'periyar national park', 'periyar sanctuary'],
  'Jagadish Chandra Bose': ['subhas chandra bose', 'satyendra nath bose', 'bose-einstein', 'bose einstein', 'bose-einstein condensate', 'bose institute'],
  'Vikram Sarabhai': ['sarabhai vs sarabhai', 'sarabhai v/s sarabhai'],
  'A. P. J. Abdul Kalam': ['kalam sea', 'kalamkari', 'kalam (film)'],
  'Salim Ali': ['ali (actor)', 'ali zafar', 'ali baba'],
  'Prafulla Chandra Ray': ['x-ray', 'x-rays', 'x ray', 'gamma ray', 'cosmic ray', 'cathode ray', 'ray (film)'],
  'Subramania Bharati': ['bharati telecom', 'bharati shipyard', 'bharati axa', 'bharati vidyapeeth', 'bharati university', 'bharati malhotra'],
  'Birsa Munda': ['munda tribe', 'munda language', 'austroasiatic', 'munda peoples'],
  'Bahadur Shah I': ['bahadur shah zafar', 'bahadur shah ii', 'shah alam ii'],
  'Shah Alam II': ['shah alam (malaysia)'],
  'Baji Rao II': ['bajirao i', 'baji rao i', 'bajirao mastani'],
  'Kepler': ['kepler-', 'kepler mission', 'kepler space telescope', 'kepler telescope', 'kepler 22b'],
  'Raphael': ['raphael (tmnt)', 'raphael (ninja', 'raphael sanzio'],
  'Magadha': ['magadha (district)']
};

// Manual, authoritative time spans for the curated spine (stable well-known facts).
// Auto-extraction from fact text remains the fallback for everything else.
var MANUAL_SPANS = {
  'Mahatma Gandhi': [1869, 1948], 'B. R. Ambedkar': [1891, 1956], 'Jawaharlal Nehru': [1889, 1964],
  'Sardar Vallabhbhai Patel': [1875, 1950], 'Subhas Chandra Bose': [1897, 1945], 'Bal Gangadhar Tilak': [1856, 1920],
  'Gopal Krishna Gokhale': [1866, 1915], 'Bhagat Singh': [1907, 1931], 'Mohammad Ali Jinnah': [1876, 1948],
  'Rabindranath Tagore': [1861, 1941], 'Lal Bahadur Shastri': [1904, 1966], 'Indira Gandhi': [1917, 1984],
  'Sarojini Naidu': [1879, 1949], 'Rajendra Prasad': [1884, 1963], 'C. Rajagopalachari': [1878, 1972],
  'Mangal Pandey': [1827, 1857], 'Rani Lakshmibai': [1828, 1858], 'Vinayak Damodar Savarkar': [1883, 1966],
  'Annie Besant': [1847, 1933], 'Dadabhai Naoroji': [1825, 1917], 'Lala Lajpat Rai': [1865, 1928],
  'Bipin Chandra Pal': [1858, 1932],
  'Gautama Buddha': [-563, -483], 'Mahavira': [-599, -527], 'Chandragupta Maurya': [-340, -298],
  'Ashoka': [-304, -232], 'Chanakya': [-350, -275], 'Samudragupta': [335, 380], 'Harsha': [590, 647],
  'Kanishka': [78, 144], 'Panini': [-500, -400], 'Charaka': [100, 200], 'Sushruta': [-600, -500],
  'Kalidasa': [400, 455], 'Aryabhata': [476, 550], 'Alexander the Great': [-356, -323],
  'Moggaliputta-Tissa': [-327, -247],
  'Faxian': [337, 422], 'Yijing': [635, 713],
  'Julius Caesar': [-100, -44], 'Augustus': [-63, 14], 'Cleopatra': [-69, -30], 'Genghis Khan': [1162, 1227],
  'Mahaparinirvana of the Buddha': [-483, -483],
  'Lumbini': [-563, -563], 'Kushinagar': [-483, -483], 'Rajgir': [-600, -400], 'Pataliputra': [-490, 550],
  'Gandhara': [-600, 500], 'Mathura': [-600, 500], 'Vatsa': [-600, -300], 'Rigveda': [-1500, -1000],
  'Roman Republic': [-509, -27], 'Hellenistic period': [-323, -31], 'Parthian Empire': [-247, 224],
  'Sasanian Empire': [224, 651],
  'Athens': [-600, -146], 'Sparta': [-650, -146],
  'Huna invasions of India': [450, 570], 'Huns': [370, 469], 'Vikings': [793, 1066],
  'Confucius': [-551, -479], 'Sun Yat-sen': [1866, 1925],
  'Qin dynasty': [-221, -206], 'Han dynasty': [-206, 220], 'Song dynasty': [960, 1279],
  'Ming dynasty': [1368, 1644], 'Qing dynasty': [1644, 1912],
  'Cultural Revolution': [1966, 1976], 'Long March': [1934, 1936],
  'Taiping Rebellion': [1850, 1864], 'Boxer Rebellion': [1899, 1901],
  'Great Wall of China': [-221, 1644],
  'First Buddhist Council': [-483, -483], 'Second Buddhist Council': [-383, -383],
  'Third Buddhist Council': [-250, -250], 'Fourth Buddhist Council': [-29, -29],
  'Buddhist missions under Ashoka': [-250, -230],
  'Tipiṭaka (Pali Canon)': [-483, -29],
  'Milkha Singh': [1929, 2021], 'Dhyan Chand': [1905, 1979], 'Kapil Dev': [1959, 2026], 'Sachin Tendulkar': [1973, 2026],
  'P. T. Usha': [1964, 2026], 'Mary Kom': [1982, 2026], 'Neeraj Chopra': [1997, 2026], 'Abhinav Bindra': [1982, 2026],
  'Saina Nehwal': [1990, 2026], 'Viswanathan Anand': [1969, 2026],
  'Indian independence movement': [1857, 1947], 'Non-cooperation movement': [1920, 1922],
  'Civil disobedience movement': [1930, 1934], 'Quit India movement': [1942, 1942], 'Khilafat movement': [1919, 1924],
  'Partition of India': [1947, 1947], 'Simon Commission': [1928, 1928], 'Salt march': [1930, 1930],
  'Jallianwala Bagh massacre': [1919, 1919], 'Revolt of 1857': [1857, 1857], 'Swadeshi movement': [1905, 1908],
  'Indian National Congress': [1885, 2026], 'Constituent Assembly of India': [1946, 1950], 'Sepoy Mutiny': [1857, 1857],
  'Bardoli Satyagraha': [1928, 1928], 'Champaran Satyagraha': [1917, 1917], 'Dandi March': [1930, 1930],
  'Battle of Plassey': [1757, 1757], 'Battle of Buxar': [1764, 1764], 'First Battle of Panipat': [1526, 1526],
  'Second Battle of Panipat': [1556, 1556], 'Third Battle of Panipat': [1761, 1761], 'Battle of Haldighati': [1576, 1576],
  'Battle of Talikota': [1565, 1565], 'Battle of Wandiwash': [1760, 1760], 'Anglo-Mysore Wars': [1767, 1799],
  'Anglo-Maratha Wars': [1775, 1819], 'First Anglo-Sikh War': [1845, 1846], 'Second Anglo-Sikh War': [1848, 1849],
  'Sino-Indian War': [1962, 1962], 'Indo-Pakistani War of 1965': [1965, 1965], 'Bangladesh Liberation War': [1971, 1971],
  'Kargil War': [1999, 1999],
  'Indus Valley Civilization': [-3300, -1300], 'Vedic period': [-1500, -500], 'Maurya Empire': [-322, -185],
  'Gupta Empire': [320, 550], 'Kalinga War': [-261, -261], 'Kushan Empire': [30, 375], 'Sunga Empire': [-185, -73],
  'Chola Empire': [850, 1279], 'Harsha Empire': [606, 647], 'Rashtrakuta Empire': [753, 982],
  'Delhi Sultanate': [1206, 1526], 'Vijayanagara Empire': [1336, 1646], 'Mughal Empire': [1526, 1857],
  'Maratha Empire': [1674, 1818],
  'Economic liberalisation in India': [1991, 1991], 'LPG reforms': [1991, 1991], 'Demonetisation in India': [2016, 2016],
  'Goods and Services Tax (India)': [2017, 2026], 'Five-Year Plans (India)': [1951, 2017],
  'Bank nationalisation in India': [1969, 1980],
  'Chandrayaan-1': [2008, 2009], 'Chandrayaan-3': [2023, 2023], 'Mangalyaan': [2013, 2014], 'Pokhran-II': [1998, 1998],
  'Nuclear tests of India': [1974, 1998], 'Smallpox eradication': [1975, 1980],
  'Olympic Games': [1896, 2026], 'Commonwealth Games': [1930, 2026], 'Asian Games': [1951, 2026],
  'Cricket World Cup': [1975, 2026], 'T20 World Cup': [2007, 2026], 'Hockey World Cup': [1971, 2026],
  'Khelo India': [2018, 2026],
  'COVID-19': [2019, 2026], 'Smallpox': [1800, 1980], 'Cholera': [1817, 2026], 'Plague': [1896, 2026],
  'Tuberculosis': [1800, 2026], 'Leprosy': [1800, 2026], 'Polio': [1900, 2014], 'Malaria': [1800, 2026],
  'Dengue': [1900, 2026], 'Spanish flu': [1918, 1920], 'Chikungunya': [1950, 2026], 'Kala-azar': [1800, 2026],
  'Famine': [1769, 1943],
  'National Health Mission': [2005, 2026], 'Swachh Bharat Mission': [2014, 2026], 'Poshan Abhiyan': [2018, 2026],
  'Ayushman Bharat': [2018, 2026], 'National Rural Health Mission': [2005, 2026], 'Green Revolution': [1960, 1980],
  'Operation Flood': [1970, 1996], 'Pradhan Mantri Jan Dhan Yojana': [2014, 2026], 'Bharat Nirman': [2005, 2014],
  'Sarkaria Commission': [1983, 1988], 'Mandal Commission': [1979, 1990], 'Kothari Commission': [1964, 1966],
  'Finance Commission of India': [1951, 2026], 'Election Commission of India': [1950, 2026],
  'Law Commission of India': [1955, 2026], 'National Human Rights Commission of India': [1993, 2026],
  'Second Administrative Reforms Commission': [2005, 2009],
  'Indian Space Research Organisation': [1969, 2026], 'Defence Research and Development Organisation': [1958, 2026],
  'Bhabha Atomic Research Centre': [1954, 2026], 'Council of Scientific and Industrial Research': [1942, 2026],
  'Indian Institute of Technology': [1951, 2026], 'Reserve Bank of India': [1935, 2026], 'State Bank of India': [1955, 2026],
  'Coal India': [1975, 2026], 'Oil and Natural Gas Corporation': [1956, 2026], 'Indian Oil Corporation': [1964, 2026],
  'Nuclear power in India': [1969, 2026],
  'Suez Canal': [1869, 2026], 'Panama Canal': [1914, 2026], 'McMahon Line': [1914, 2026],
  'Line of Actual Control': [1962, 2026], 'Line of Control': [1972, 2026], 'Siachen Glacier': [1984, 2026],
  'Doklam': [2017, 2026],
  'Ancient Egypt': [-3100, -332], 'Sumer': [-4000, -1900], 'Babylon': [-1894, -539], 'Assyria': [-2025, -609],
  'Phoenicia': [-1500, -300], 'Hittite Empire': [-1650, -1178], 'Mycenaean civilization': [-1600, -1100],
  'Minoan civilization': [-2700, -1450], 'Carthage': [-814, -146], 'Persian Empire': [-550, -330],
  'Roman Empire': [-27, 476],
  'Byzantine Empire': [330, 1453], 'Holy Roman Empire': [800, 1806], 'Norman Conquest': [1066, 1066],
  'Umayyad Caliphate': [661, 750], 'Abbasid Caliphate': [750, 1258], 'Islamic Golden Age': [750, 1258],
  'Crusades': [1095, 1291], 'Mongol Empire': [1206, 1368], 'Ottoman Empire': [1299, 1922],
  'Hundred Years\u2019 War': [1337, 1453], 'Black Death': [1347, 1351],
  'Age of Discovery': [1400, 1600], 'Protestant Reformation': [1517, 1648], 'Scientific Revolution': [1543, 1687],
  'Enlightenment': [1685, 1815], 'Congress of Vienna': [1814, 1815], 'American Revolution': [1765, 1783],
  'French Revolution': [1789, 1799], 'Industrial Revolution': [1760, 1840],
  'British East India Company': [1600, 1874],
  'Meiji Restoration': [1868, 1912], 'American Civil War': [1861, 1865], 'Scramble for Africa': [1881, 1914],
  'Russian Revolution': [1917, 1917], 'Great Depression': [1929, 1939], 'Weimar Republic': [1918, 1933],
  'World War I': [1914, 1918], 'Nazism': [1919, 1945], 'World War II': [1939, 1945], 'Holocaust': [1941, 1945],
  'Cold War': [1947, 1991], 'Marshall Plan': [1948, 1952], 'Berlin Wall': [1961, 1989], 'Korean War': [1950, 1953],
  'Vietnam War': [1955, 1975], 'Cuban Missile Crisis': [1962, 1962], 'Space Race': [1955, 1975],
  'Civil Rights Movement': [1954, 1968], 'Apartheid': [1948, 1994], 'Dissolution of the Soviet Union': [1991, 1991],
  'War on Terror': [2001, 2021], 'Arab Spring': [2010, 2012], '9/11 attacks': [2001, 2001],
  'United Nations': [1945, 2026], 'European Union': [1957, 2026], 'Internet': [1969, 2026],
  'Justinian': [482, 565], 'Charlemagne': [742, 814], 'Marco Polo': [1254, 1324], 'Mehmed': [1432, 1481],
  'Suleiman': [1494, 1566], 'Christopher Columbus': [1451, 1506], 'Ferdinand Magellan': [1480, 1521],
  'Martin Luther': [1483, 1546], 'Johannes Gutenberg': [1400, 1468], 'Isaac Newton': [1643, 1727],
  'Charles Darwin': [1809, 1882], 'Napoleon': [1769, 1821], 'Abraham Lincoln': [1809, 1865],
  'Adolf Hitler': [1889, 1945], 'Vladimir Lenin': [1870, 1924], 'Joseph Stalin': [1878, 1953],
  'Franklin D. Roosevelt': [1882, 1945], 'Winston Churchill': [1874, 1965], 'Mao Zedong': [1893, 1976],
  'Nelson Mandela': [1918, 2013], 'Martin Luther King Jr.': [1929, 1968],
  'Red Turban Rebellion': [1351, 1368], 'Battle of Lake Poyang': [1363, 1363], 'Jingnan Campaign': [1399, 1402],
  'Ming conquest of Yunnan': [1381, 1382], 'Treasure voyages': [1405, 1433], 'Forbidden City': [1406, 1420],
  'Yongle Encyclopedia': [1403, 1408],
  'Zhu Yuanzhang': [1328, 1398], 'Yongle Emperor': [1360, 1424], 'Zheng He': [1371, 1433], 'Xu Da': [1332, 1385],
  'Chang Yuchun': [1330, 1369], 'Tang He': [1326, 1395], 'Liao Yongzhong': [1323, 1375], 'Hu Mei': [1363, 1384],
  'Mohenjo-daro': [-2600, -1900], 'Kanchi': [-300, 900], 'Vaishali': [-600, -400], 'Kurukshetra': [-1000, -500],
  'Ranjit Singh': [1780, 1839], 'C V Raman': [1888, 1970],
  'Ghadar Movement': [1913, 1918], 'Azad Hind Fauj': [1942, 1945], 'Radcliffe Line': [1947, 1947],
  '73rd Constitutional Amendment': [1992, 1993], 'INS Vikrant': [1961, 2026],
  'GPS': [1973, 2026], 'Bollywood': [1913, 2026], 'Gir': [1965, 2026],
  'Thomas Edison': [1847, 1931], 'Alexander Graham Bell': [1847, 1922], 'Nikola Tesla': [1856, 1943],
  'Marie Curie': [1867, 1934], 'Louis Pasteur': [1822, 1895], 'Galileo Galilei': [1564, 1642],
  'Mahmud of Ghazni': [971, 1030], 'Mohammad Ghori': [1149, 1206], 'Prithviraj Chauhan': [1166, 1192],
  'Jahangir': [1569, 1627], 'Kabir': [1440, 1518], 'Nur Jahan': [1577, 1645], 'Bajirao I': [1700, 1740],
  'Sambhaji': [1657, 1689], 'Guru Tegh Bahadur': [1621, 1675], 'Guru Arjan': [1563, 1606],
  'Chaitanya Mahaprabhu': [1486, 1534], 'Tukaram': [1608, 1649], 'Basavanna': [1105, 1167],
  'Sputnik': [1957, 1961], 'Hubble Space Telescope': [1990, 2026], 'James Webb Space Telescope': [2021, 2026],
  'Voyager program': [1977, 2026],
  'Smartphone': [1992, 2026], 'Microsoft': [1975, 2026], 'Linux': [1991, 2026], 'Microsoft Windows': [1985, 2026],
  'Twitter': [2006, 2026], 'Instagram': [2010, 2026], 'YouTube': [2005, 2026], 'Bitcoin': [2009, 2026],
  'Cryptocurrency': [2009, 2026],
  'Life Insurance Corporation of India': [1956, 2026], 'Export-Import Bank of India': [1982, 2026],
  'Central Industrial Security Force': [1969, 2026], 'Lokpal': [2013, 2026],
  'Vice President of India': [1952, 2026], 'Speaker of the Lok Sabha': [1952, 2026],
  'MGNREGA': [2005, 2026], 'Railway Budget': [1924, 2016], 'Blue Revolution': [1970, 2026],
  'El Niño': [1900, 2026], 'La Niña': [1900, 2026],
  'Handloom': [1800, 2026], 'Jute': [1855, 2026], 'Fisheries': [1951, 2026], 'Poultry': [1951, 2026],
  'Helicopter': [1939, 2026],
  'Bimbisara': [-558, -491], 'Ajatashatru': [-492, -461], 'Bindusara': [-297, -273], 'Pushyamitra Sunga': [-185, -151],
  'Gautamiputra Satakarni': [78, 130], 'Rudradaman': [130, 150], 'Kujula Kadphises': [30, 80],
  'Chandragupta I': [320, 335], 'Chandragupta II': [335, 415], 'Skandagupta': [455, 467],
  'Varahamihira': [505, 587], 'Brahmagupta': [598, 668], 'Bhaskara': [1114, 1185], 'Banabhatta': [600, 660],
  'Rajaraja Chola I': [985, 1014], 'Rajendra Chola': [1012, 1044], 'Pulakeshin II': [610, 642],
  'Narasimhavarman': [630, 668],
  'Krishnadevaraya': [1471, 1529], 'Harihara': [1336, 1356], 'Bukka': [1356, 1377],
  'Iltutmish': [1211, 1236], 'Razia Sultana': [1236, 1240], 'Balban': [1266, 1287], 'Alauddin Khilji': [1296, 1316],
  'Muhammad bin Tughlaq': [1325, 1351], 'Firoz Shah Tughlaq': [1351, 1388], 'Timur': [1336, 1405],
  'Ibrahim Lodi': [1517, 1526], 'Babur': [1483, 1530], 'Humayun': [1508, 1556], 'Akbar': [1542, 1605],
  'Bahadur Shah Zafar': [1775, 1862], 'Hemu': [1501, 1556],
  'Balaji Vishwanath': [1662, 1720], 'Madhavrao': [1745, 1772], 'Mahadji Scindia': [1730, 1794],
  'Nana Saheb': [1824, 1859], 'Tantia Tope': [1814, 1859],
  'Ramananda': [1400, 1476], 'Vallabhacharya': [1479, 1531], 'Guru Ramdas': [1534, 1581],
  'Mahatma Phule': [1827, 1890], 'Savitribai Phule': [1831, 1897],
  'Surendranath Banerjee': [1848, 1925], 'Madan Mohan Malaviya': [1861, 1946],
  'Chandra Shekhar Azad': [1906, 1931], 'Sukhdev': [1907, 1931], 'Rajguru': [1908, 1931],
  'Sri Aurobindo': [1872, 1950], 'Swami Dayananda Saraswati': [1824, 1883], 'Ramakrishna Paramahamsa': [1836, 1886],
  'Cyrus the Great': [-600, -530], 'Darius': [-522, -486], 'Nebuchadnezzar': [-605, -562], 'Pericles': [-495, -429],
  'Socrates': [-470, -399], 'Plato': [-427, -347], 'Homer': [-800, -700], 'Hannibal': [-247, -183],
  'Scipio Africanus': [-236, -183], 'Spartacus': [-111, -71], 'Marcus Aurelius': [121, 180],
  'Constantine': [272, 337], 'Prophet Muhammad': [570, 632], 'Harun al-Rashid': [763, 809], 'Saladin': [1137, 1193],
  'William the Conqueror': [1028, 1087], 'Richard the Lionheart': [1157, 1199], 'Kublai Khan': [1215, 1294],
  'Ibn Sina': [980, 1037], 'Al-Biruni': [973, 1048],
  'Leonardo da Vinci': [1452, 1519], 'Michelangelo': [1475, 1564], 'William Shakespeare': [1564, 1616],
  'Copernicus': [1473, 1543], 'Voltaire': [1694, 1778], 'Rousseau': [1712, 1778], 'Adam Smith': [1723, 1790],
  'Bismarck': [1815, 1898], 'Queen Victoria': [1819, 1901], 'Garibaldi': [1807, 1882], 'Karl Marx': [1818, 1883],
  'John F. Kennedy': [1917, 1963], 'Rosa Parks': [1913, 2005], 'Mikhail Gorbachev': [1931, 2022],
  'Ronald Reagan': [1911, 2004], 'Margaret Thatcher': [1925, 2013], 'Deng Xiaoping': [1904, 1997],
  'Lee Kuan Yew': [1923, 2015], 'Xi Jinping': [1953, 2026], 'Mahathir': [1925, 2026],
  'Srinivasa Ramanujan': [1887, 1920], 'Maharishi Patanjali': [-200, 200],
  'Raja Ram Mohan Roy': [1772, 1833], 'Ishwar Chandra Vidyasagar': [1820, 1891],
  'Chittaranjan Das': [1870, 1925], 'Motilal Nehru': [1861, 1931], 'Maulana Abul Kalam Azad': [1888, 1958],
  'Muhammad Iqbal': [1877, 1938], 'Shyama Prasad Mukherjee': [1901, 1953], 'Vinoba Bhave': [1895, 1982],
  'Jayaprakash Narayan': [1902, 1979], 'Periyar': [1879, 1973], 'K. Kamaraj': [1903, 1975],
  'C. N. Annadurai': [1909, 1969], 'Narayana Guru': [1855, 1928], 'Jagadish Chandra Bose': [1858, 1937],
  'Meghnad Saha': [1893, 1956], 'Vikram Sarabhai': [1919, 1971], 'Homi Bhabha': [1909, 1966],
  'A. P. J. Abdul Kalam': [1931, 2015], 'Salim Ali': [1896, 1987], 'Prafulla Chandra Ray': [1861, 1944],
  'Subramania Bharati': [1882, 1921], 'Ram Prasad Bismil': [1897, 1927], 'Birsa Munda': [1875, 1900],
  'Bahadur Shah I': [1643, 1712], 'Shah Alam II': [1728, 1806], 'Baji Rao II': [1775, 1851],
  'Dara Shikoh': [1615, 1659], 'Joan of Arc': [1412, 1431], 'Raphael': [1483, 1520], 'Kepler': [1571, 1630],
  'Sigmund Freud': [1856, 1939], 'Magadha': [-800, -300], 'Mahajanapadas': [-600, -325]
};

// Curated spans for sub-topics (non-seed) where extracted year clusters cannot
// separate the topic's genuine dates from reception/reference years — e.g. the
// Manusmriti's composition (~200 BCE–200 CE) vs centuries of commentaries,
// editions and colonial-era publications.
var TOPIC_OVERRIDES = {
  'Manusmriti': [-200, 200],
  '1885 Kashmir earthquake': [1885, 1885],
  // Buddhist Jataka tales: canonical Pali-canon stories of the Buddha's past lives,
  // traditionally taught by the Buddha himself and canonized ~4th-3rd century BCE.
  'Vessantara Jātaka': [-563, -483],
  'Mahakapi Jataka': [-563, -483],
  'Sibi Jataka': [-563, -483],
  'Mahānipāta Jātaka': [-563, -483],
  'Brihat Jataka': [505, 587],
  // Era-inferred topics that actually have defensible dates.
  'Airavatesvara Temple': [1166, 1172],
  'Amaravati Stupa': [-200, 250],
  'Amaravati Marbles': [-100, 200],
  'Amurru kingdom': [-2000, -1200],
  'Ancestral Puebloans': [-1200, 1300],
  'Andhra Ikshvaku': [225, 300],
  'Charaka': [100, 200],
  'Panini': [-500, -400],
  'Surdas': [1478, 1583],
  'Ahom language': [1228, 1826],
  'Anandalahari': [700, 800],
  'Bhakti movement': [700, 1700],
  'Charaka Samhita': [100, 200],
  'Gandhinagar': [1960, 2026],
  'Hindustani language': [1200, 2026],
  'Pallava dynasty': [275, 897],
  'Gandhi Mandela Awards': [1995, 2026],
  'Indira Gandhi Prize': [1985, 2026],
  'Lokmanya Tilak National Award': [1983, 2026],
  'Article 14 of the Constitution of India': [1950, 1950],
  'Article 51 of the Constitution of India': [1950, 1950],
  'Article 47 of the Constitution of India': [1950, 1950],
  'Constitution bench (India)': [1950, 2026],
  'Constitutional body (India)': [1950, 2026],
  'Adilabad Lok Sabha constituency': [1952, 2026],
  'Alappuzha Lok Sabha constituency': [1957, 2026],
  'Anand Lok Sabha constituency': [1957, 2026],
  'Bahraich Lok Sabha constituency': [1952, 2026],
  'Banka Lok Sabha constituency': [1952, 2026],
  'Barmer Lok Sabha constituency': [1952, 2026],
  'Barpeta Lok Sabha constituency': [1957, 2026],
  'Agra Lok Sabha constituency': [1952, 2026],
  'Dadra and Nagar Haveli Lok Sabha constituency': [1961, 2026],
  'Abd al-Rahman al-Sufi': [903, 986],
  'Al-Baladhuri': [820, 892],
  'Anglo-Maratha Wars': [1775, 1819],
  'Cholamandalam MS General Insurance': [2002, 2026],
  'Agencies of British India': [1800, 1947],
  'Army of the Mughal Empire': [1526, 1857],
  'Battle of Panipat': [1526, 1761],
  'Sepoy': [1800, 1857],
  'Election Commission & Electoral Reforms': [1950, 2026],
  'GST': [2017, 2026],
  'Aryabhata Award': [1976, 2026],
  'United States Congress': [1789, 2026],
  'Abbeydale Industrial Hamlet': [1785, 1900],
  'Ajuran Sultanate': [1200, 1650],
  'Bahmani & Deccan Sultanates': [1347, 1687],
  'Congress (Extremist, Swadeshi & Split, 1905–1915)': [1905, 1915],
  'Delhi Sultanate (Tughlaq, Sayyid & Lodi)': [1320, 1526],
  'Early Vedic Period': [-1500, -1000],
  'Gandhian Era (1915–1934)': [1915, 1934],
  'Gandhian Era (1935–1947)': [1935, 1947],
  'IVC & Harappan': [-3300, -1300],
  'Mughal Empire (1605–1707)': [1605, 1707],
  'Agnicayana': [-1500, -500],
  'Ahraura': [-260, -260],
  'Ancient Somali city-states': [200, 1500],
  'Beryllium': [1798, 1798],
  'Abhidhamma Piṭaka': [-250, -29],
  'Ancient Greece': [-800, -146],
  // Events/wars/persons whose auto-extracted spans leaked reference years across centuries.
  'French Revolution': [1789, 1799], 'Nazism': [1919, 1945], 'World War I': [1914, 1918],
  'American Revolution': [1765, 1783], 'Seven Years\u2019 War': [1756, 1763], 'Thirty Years\u2019 War': [1618, 1648],
  'Ottoman Empire': [1299, 1922], 'British Raj': [1858, 1947], 'Renaissance': [1300, 1600],
  'Industrial Revolution': [1760, 1840], 'Indian independence movement': [1857, 1947],
  'Mongol Empire': [1206, 1368], 'Crusades': [1095, 1291],
  'Mahavira': [-599, -527], 'Samudragupta': [335, 380], 'Chanakya': [-350, -275],
  'Aryabhata': [476, 550], 'Kalidasa': [400, 455], 'Nagarjuna': [150, 250], 'Shivaji': [1630, 1680],
  'Vedic period': [-1500, -500], 'Indus Valley Civilisation': [-3300, -1300], 'Nalanda mahavihara': [427, 1197],
  // Sub-topics sharing names with the curated world spine — pin their spans too so
  // auto-extracted reference years (e.g. Roman Empire -148..1970) don't show twice.
  'Roman Empire': [-27, 476], 'Joseph Stalin': [1878, 1953], 'Winston Churchill': [1874, 1965],
  'Franklin D. Roosevelt': [1882, 1945], 'Vladimir Lenin': [1870, 1924], 'Mao Zedong': [1893, 1976],
  'Nelson Mandela': [1918, 2013], 'Korean War': [1950, 1953], 'Russian Revolution': [1917, 1917],
  'Abbasid Caliphate': [750, 1258], 'Hundred Years\u2019 War': [1337, 1453], 'Soviet Union': [1922, 1991],
  'Fall of the Berlin Wall': [1989, 1990], 'Great Depression': [1929, 1939], 'French Revolution & Napoleon': [1789, 1815],
  'Renaissance & Reformation': [1400, 1648], 'Ashoka': [-304, -232], 'Maurya Empire': [-322, -185],
  'Crusades': [1095, 1291], 'Mongol Empire': [1206, 1368], 'Ottoman Empire': [1299, 1922],
  'Meiji Restoration': [1868, 1912], 'World War II': [1939, 1945], 'Cold War': [1947, 1991],
  'Vietnam War': [1955, 1975], 'Space Race': [1955, 1975], 'Apartheid': [1948, 1994],
  'United Nations': [1945, 2026], 'European Union': [1957, 2026], 'Napoleon': [1769, 1821],
  'Sikh Empire': [1799, 1849], 'Panchayati raj': [1959, 2026], 'Constitution of India': [1949, 1950],
  'Securities and Exchange Board of India': [1988, 2026], 'National Bank for Agriculture and Rural Development': [1982, 2026],
  'Small Industries Development Bank of India': [1990, 2026], 'Central Bureau of Investigation': [1963, 2026],
  'Central Reserve Police Force': [1939, 2026], 'Pradhan Mantri Kisan Samman Nidhi': [2019, 2026]
};

// Curated, authoritative descriptors for the curated-spine persons.
var PERSON_DESCS = {
  'Mahatma Gandhi': 'Indian independence leader', 'B. R. Ambedkar': 'jurist and social reformer',
  'Jawaharlal Nehru': 'first Prime Minister of India', 'Sardar Vallabhbhai Patel': 'independence leader and first Deputy PM of India',
  'Subhas Chandra Bose': 'Indian nationalist leader', 'Bal Gangadhar Tilak': 'freedom fighter and social reformer',
  'Gopal Krishna Gokhale': 'freedom fighter and politician', 'Bhagat Singh': 'revolutionary freedom fighter',
  'Mohammad Ali Jinnah': 'founder of Pakistan', 'Rabindranath Tagore': 'poet and Nobel laureate',
  'Lal Bahadur Shastri': 'third Prime Minister of India', 'Indira Gandhi': 'first woman Prime Minister of India',
  'Sarojini Naidu': 'poet and freedom fighter', 'Rajendra Prasad': 'first President of India',
  'C. Rajagopalachari': 'freedom fighter and statesman', 'Mangal Pandey': 'sepoy of the Revolt of 1857',
  'Rani Lakshmibai': 'queen and freedom fighter', 'Vinayak Damodar Savarkar': 'freedom fighter and writer',
  'Annie Besant': 'theosophist and social reformer', 'Dadabhai Naoroji': 'Indian political leader',
  'Lala Lajpat Rai': 'freedom fighter', 'Bipin Chandra Pal': 'freedom fighter',
  'Gautama Buddha': 'founder of Buddhism', 'Mahavira': 'founder of Jainism',
  'Chandragupta Maurya': 'founder of the Maurya Empire', 'Ashoka': 'Mauryan emperor',
  'Chanakya': 'ancient Indian philosopher and strategist', 'Samudragupta': 'Gupta emperor',
  'Harsha': 'Indian emperor', 'Kanishka': 'Kushan emperor', 'Panini': 'Sanskrit grammarian',
  'Charaka': 'ancient Indian physician', 'Sushruta': 'ancient Indian surgeon',
  'Kalidasa': 'Sanskrit poet and playwright', 'Aryabhata': 'ancient Indian mathematician and astronomer',
  'Alexander the Great': 'Macedonian conqueror',
  'Moggaliputta-Tissa': 'Theravada elder who presided over the Third Buddhist Council',
  'Julius Caesar': 'Roman general and dictator', 'Augustus': 'first Roman emperor',
  'Cleopatra': 'last pharaoh of Ptolemaic Egypt', 'Faxian': 'Chinese Buddhist pilgrim',
  'Yijing': 'Chinese Buddhist pilgrim', 'Genghis Khan': 'founder of the Mongol Empire',
  'Confucius': 'Chinese philosopher', 'Sun Yat-sen': 'founder of the Republic of China',
  'Milkha Singh': 'Indian sprinter', 'Dhyan Chand': 'Indian hockey player',
  'Kapil Dev': 'Indian cricketer', 'Sachin Tendulkar': 'Indian cricketer',
  'P. T. Usha': 'Indian sprinter', 'Mary Kom': 'Indian boxer',
  'Neeraj Chopra': 'Indian javelin thrower', 'Abhinav Bindra': 'Indian shooter',
  'Saina Nehwal': 'Indian badminton player', 'Viswanathan Anand': 'Indian chess grandmaster',
  'Xuanzang': 'Chinese Buddhist monk and scholar',
  'Prem Behari Narain Raizada': 'Indian calligrapher',
  'Roy Mugerwa': 'Ugandan physician and academic',
  'Ali Sardar Jafri': 'Indian writer',
  'Justinian': 'Byzantine emperor', 'Charlemagne': 'Holy Roman Emperor',
  'Marco Polo': 'Venetian explorer', 'Mehmed': 'Ottoman sultan',
  'Suleiman': 'Ottoman sultan', 'Christopher Columbus': 'Italian explorer',
  'Ferdinand Magellan': 'Portuguese explorer', 'Martin Luther': 'leader of the Protestant Reformation',
  'Johannes Gutenberg': 'inventor of the printing press', 'Isaac Newton': 'English physicist and mathematician',
  'Charles Darwin': 'English naturalist', 'Napoleon': 'French military and political leader',
  'Abraham Lincoln': 'US President during the Civil War', 'Adolf Hitler': 'dictator of Nazi Germany',
  'Vladimir Lenin': 'leader of the Russian Revolution', 'Joseph Stalin': 'Soviet leader',
  'Franklin D. Roosevelt': 'US President during the Depression and World War II',
  'Winston Churchill': 'British Prime Minister during World War II', 'Mao Zedong': 'founder of the PRC',
  'Nelson Mandela': 'South African anti-apartheid leader', 'Martin Luther King Jr.': 'American civil rights leader',
  'Zhu Yuanzhang': 'founder of the Ming dynasty (Hongwu Emperor)', 'Yongle Emperor': 'Ming emperor who moved the capital to Beijing',
  'Zheng He': 'Ming admiral and explorer', 'Xu Da': 'Ming founding general',
  'Chang Yuchun': 'Ming founding general', 'Tang He': 'Ming founding general',
  'Liao Yongzhong': 'Ming founding admiral', 'Hu Mei': 'Ming founding general',
  'Ranjit Singh': 'founder of the Sikh Empire', 'C V Raman': 'Nobel Prize-winning physicist (Raman effect)',
  'Thomas Edison': 'inventor of the electric light bulb', 'Alexander Graham Bell': 'inventor of the telephone',
  'Nikola Tesla': 'inventor and electrical engineer', 'Marie Curie': 'physicist and chemist, double Nobel laureate',
  'Louis Pasteur': 'microbiologist and chemist', 'Galileo Galilei': 'Italian astronomer and physicist',
  'Mahmud of Ghazni': 'Ghaznavid ruler who invaded India', 'Mohammad Ghori': 'Ghurid sultan who invaded India',
  'Prithviraj Chauhan': 'Rajput king of Ajmer and Delhi', 'Jahangir': 'fourth Mughal emperor',
  'Kabir': 'mystic poet and saint', 'Nur Jahan': 'Mughal empress', 'Bajirao I': 'Peshwa of the Maratha Empire',
  'Sambhaji': 'second ruler of the Maratha Empire', 'Guru Tegh Bahadur': 'ninth Sikh Guru',
  'Guru Arjan': 'fifth Sikh Guru', 'Chaitanya Mahaprabhu': 'Vaishnava saint and reformer',
  'Tukaram': 'Marathi saint-poet', 'Basavanna': 'Kannada philosopher and founder of the Lingayat movement',
  'Bimbisara': 'king of Magadha', 'Ajatashatru': 'king of Magadha', 'Bindusara': 'Mauryan emperor',
  'Pushyamitra Sunga': 'founder of the Sunga dynasty', 'Gautamiputra Satakarni': 'Satavahana emperor',
  'Rudradaman': 'Western Kshatrapa ruler', 'Kujula Kadphises': 'founder of the Kushan Empire',
  'Chandragupta I': 'founder of the Gupta dynasty', 'Chandragupta II': 'Gupta emperor (Vikramaditya)',
  'Skandagupta': 'Gupta emperor', 'Varahamihira': 'Indian astronomer and mathematician',
  'Brahmagupta': 'Indian mathematician and astronomer', 'Bhaskara': 'Indian mathematician and astronomer',
  'Banabhatta': 'Sanskrit writer and court poet', 'Rajaraja Chola I': 'greatest Chola emperor',
  'Rajendra Chola': 'Chola emperor', 'Pulakeshin II': 'Chalukya emperor', 'Narasimhavarman': 'Pallava emperor',
  'Krishnadevaraya': 'Vijayanagara emperor', 'Harihara': 'co-founder of the Vijayanagara Empire',
  'Bukka': 'co-founder of the Vijayanagara Empire', 'Iltutmish': 'Delhi Sultanate ruler',
  'Razia Sultana': 'only woman ruler of the Delhi Sultanate', 'Balban': 'Delhi Sultanate ruler',
  'Alauddin Khilji': 'Khilji dynasty ruler of Delhi', 'Muhammad bin Tughlaq': 'Tughlaq dynasty ruler of Delhi',
  'Firoz Shah Tughlaq': 'Tughlaq dynasty ruler of Delhi', 'Timur': 'Central Asian conqueror',
  'Ibrahim Lodi': 'last Lodi Sultan of Delhi', 'Babur': 'founder of the Mughal Empire',
  'Humayun': 'second Mughal emperor', 'Akbar': 'greatest Mughal emperor',
  'Bahadur Shah Zafar': 'last Mughal emperor', 'Hemu': 'Hindu general in the Mughal wars',
  'Balaji Vishwanath': 'first Maratha Peshwa', 'Madhavrao': 'Maratha Peshwa', 'Mahadji Scindia': 'Maratha statesman',
  'Nana Saheb': 'leader of the Revolt of 1857', 'Tantia Tope': 'general of the Revolt of 1857',
  'Ramananda': 'Bhakti saint of the Ramanandi sect', 'Vallabhacharya': 'founder of the Pushti Marg',
  'Guru Ramdas': 'fourth Sikh Guru', 'Mahatma Phule': 'social reformer and educationist',
  'Savitribai Phule': 'social reformer and first female teacher', 'Surendranath Banerjee': 'Indian nationalist leader',
  'Madan Mohan Malaviya': 'educationist and founder of BHU', 'Chandra Shekhar Azad': 'revolutionary freedom fighter',
  'Sukhdev': 'revolutionary freedom fighter', 'Rajguru': 'revolutionary freedom fighter',
  'Sri Aurobindo': 'philosopher and freedom fighter', 'Swami Dayananda Saraswati': 'founder of the Arya Samaj',
  'Ramakrishna Paramahamsa': 'mystic and spiritual guru', 'Cyrus the Great': 'founder of the Persian Empire',
  'Darius': 'Persian emperor', 'Nebuchadnezzar': 'Neo-Babylonian king', 'Pericles': 'Athenian statesman',
  'Socrates': 'Greek philosopher', 'Plato': 'Greek philosopher', 'Homer': 'Greek epic poet',
  'Hannibal': 'Carthaginian general', 'Scipio Africanus': 'Roman general', 'Spartacus': 'Roman gladiator rebel',
  'Marcus Aurelius': 'Roman emperor and philosopher', 'Constantine': 'first Christian Roman emperor',
  'Prophet Muhammad': 'founder of Islam', 'Harun al-Rashid': 'Abbasid caliph', 'Saladin': 'Ayyubid sultan',
  'William the Conqueror': 'first Norman king of England', 'Richard the Lionheart': 'king of England',
  'Kublai Khan': 'Mongol emperor of China', 'Ibn Sina': 'Persian polymath (Avicenna)',
  'Al-Biruni': 'Persian scholar', 'Leonardo da Vinci': 'Renaissance polymath', 'Michelangelo': 'Renaissance artist',
  'William Shakespeare': 'English playwright', 'Copernicus': 'astronomer who proposed heliocentrism',
  'Voltaire': 'French Enlightenment writer', 'Rousseau': 'French Enlightenment philosopher',
  'Adam Smith': 'father of modern economics', 'Bismarck': 'German statesman, first Chancellor',
  'Queen Victoria': 'British queen and Empress of India', 'Garibaldi': 'Italian revolutionary and general',
  'Karl Marx': 'philosopher and founder of Marxism', 'John F. Kennedy': 'US President',
  'Rosa Parks': 'American civil rights activist', 'Mikhail Gorbachev': 'last leader of the Soviet Union',
  'Ronald Reagan': 'US President', 'Margaret Thatcher': 'British Prime Minister', 'Deng Xiaoping': 'Chinese leader',
  'Lee Kuan Yew': 'founding father of Singapore', 'Xi Jinping': 'President of China', 'Mahathir': 'Malaysian Prime Minister',
  'Srinivasa Ramanujan': 'Indian mathematician', 'Maharishi Patanjali': 'author of the Yoga Sutras',
  'Raja Ram Mohan Roy': 'father of the Indian Renaissance', 'Ishwar Chandra Vidyasagar': 'social reformer and educationist',
  'Chittaranjan Das': 'Indian nationalist leader', 'Motilal Nehru': 'Indian freedom fighter and lawyer',
  'Maulana Abul Kalam Azad': 'first Education Minister of India', 'Muhammad Iqbal': 'national poet of Pakistan',
  'Shyama Prasad Mukherjee': 'founder of the Bharatiya Jana Sangh', 'Vinoba Bhave': 'Gandhian and Bhoodan leader',
  'Jayaprakash Narayan': 'socialist and Sarvodaya leader', 'Periyar': 'social reformer and Dravidian leader',
  'K. Kamaraj': 'Tamil Nadu Chief Minister and freedom fighter', 'C. N. Annadurai': 'founder of the DMK',
  'Narayana Guru': 'Kerala social reformer', 'Jagadish Chandra Bose': 'plant physiologist and physicist',
  'Meghnad Saha': 'astrophysicist (Saha equation)', 'Vikram Sarabhai': 'father of the Indian space programme',
  'Homi Bhabha': 'father of the Indian nuclear programme', 'A. P. J. Abdul Kalam': 'scientist and President of India',
  'Salim Ali': 'Indian ornithologist', 'Prafulla Chandra Ray': 'founder of Indian pharmaceutical industry',
  'Subramania Bharati': 'Tamil poet and freedom fighter', 'Ram Prasad Bismil': 'revolutionary freedom fighter',
  'Birsa Munda': 'tribal freedom fighter', 'Bahadur Shah I': 'Mughal emperor', 'Shah Alam II': 'Mughal emperor',
  'Baji Rao II': 'last Peshwa of the Maratha Empire', 'Dara Shikoh': 'Mughal prince and scholar',
  'Joan of Arc': 'French heroine of the Hundred Years\u2019 War', 'Raphael': 'Renaissance painter',
  'Kepler': 'astronomer who formulated the laws of planetary motion', 'Sigmund Freud': 'founder of psychoanalysis',
  'Magadha': 'ancient Indian kingdom', 'Mahajanapadas': 'sixteen ancient Indian republics'
};

// Person-role keyword gate: an auto-extracted descriptor is only attached when it
// reads like a person's role/profession, so a topic like "World War II" ("Global
// conflict (1939–1945)") never gets a descriptor.
var PERSON_ROLE = /\b(?:monk|nun|scholar|philosopher|poet|writer|author|novelist|playwright|painter|artist|sculptor|musician|singer|vocalist|composer|dancer|actor|actress|filmmaker|director|producer|athlete|cricketer|footballer|boxer|wrestler|shooter|archer|sprinter|runner|hockey player|badminton|chess grandmaster|grandmaster|tennis|javelin|swimmer|gymnast|king|queen|emperor|empress|prince|princess|ruler|monarch|sultan|raja|maharaja|nawab|politician|statesman|president|minister|governor|parliamentarian|senator|diplomat|ambassador|jurist|judge|lawyer|advocate|reformer|activist|revolutionary|leader|saint|guru|mystic|prophet|founder|pioneer|scientist|physicist|chemist|biologist|astronomer|mathematician|botanist|zoologist|geologist|engineer|physician|doctor|surgeon|psychologist|economist|sociologist|anthropologist|archaeologist|historian|linguist|philologist|orientalist|missionary|philanthropist|industrialist|businessman|entrepreneur|banker|educator|academic|professor|journalist|editor|photographer|explorer|navigator|conqueror|warrior|general|admiral|commander|soldier|officer|astronaut|pilot|inventor|administrator|bureaucrat|agronomist|planter|craftsman|priest|bishop|cardinal|pope|caliph|imam|chancellor|viceroy|governor-general|politician|spiritualist|theologian|reformer|economist|activist)\b/i;

function normNameForDesc(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function nameMatchesForDesc(qName, topic) {
  var a = normNameForDesc(qName), b = normNameForDesc(topic);
  if (!a || !b) return false;
  if (a === b) return true;
  var bBase = b.replace(/\s*\(.*\)\s*$/, '').trim();
  if (a === bBase) return true;
  if (b.length >= 4 && a.indexOf(b) === 0) return true;
  if (a.length >= 4 && b.indexOf(a) === 0) return true;
  return false;
}
function cleanDesc(s) {
  var d = String(s).replace(/[}\]]+$/, '').trim();
  d = d.split(/\.\s+|\u2014\s+|\u2013\s+/)[0];
  return d.replace(/[,;\s]+$/, '').replace(/\s+/g, ' ').trim();
}
// Extract a person's descriptor ("profession") from the topic's own questions, e.g.
// "What is Xuanzang? Chinese Buddhist monk and scholar (602–664)". Only returns when
// the quoted name is the topic itself, the descriptor reads as a person role, and the
// year range looks like a lifespan (so wars/conflicts are excluded).
function personDescFor(name, qs) {
  if (PERSON_DESCS[name]) return PERSON_DESCS[name];
  var reA = /What is\s+([A-Z][^?()]{1,60}?)\??\s*[:.\u2013-]?\s*([A-Za-z][^()?]{2,90}?)\s*\(\s*(?:c\.?\s*)?(-?\d{3,4})\s*[-\u2013]\s*(-?\d{3,4})\s*\)/gi;
  var reB = /(?:The|A|An)\s*_\s+(?:was|is)\s+([A-Za-z][^()?]{2,90}?)\s*\(\s*(?:c\.?\s*)?(-?\d{3,4})\s*[-\u2013]\s*(-?\d{3,4})\s*\)/gi;
  for (var i = 0; i < qs.length; i++) {
    var q = qs[i];
    var txt = [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' ');
    var m;
    reA.lastIndex = 0;
    while ((m = reA.exec(txt))) {
      var d = cleanDesc(m[2]);
      if (nameMatchesForDesc(m[1], name) && PERSON_ROLE.test(d) && (+m[4] - +m[3]) >= 20 && (+m[4] - +m[3]) <= 130) return d;
    }
    reB.lastIndex = 0;
    while ((m = reB.exec(txt))) {
      var d2 = cleanDesc(m[1]);
      if (PERSON_ROLE.test(d2) && (+m[3] - +m[2]) >= 20 && (+m[3] - +m[2]) <= 130) return d2;
    }
  }
  return null;
}

function loadAll() {
  var cats = {};
  var all = [];
  for (var f of fs.readdirSync(DATA)) {
    if (!f.endsWith('.json') || f === 'manifest.json') continue;
    var key = f.replace('.json', '');
    var parsed = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    var label = Object.keys(parsed)[0] || key;
    var questions = [];
    for (var subj of Object.keys(parsed)) {
      var subs = parsed[subj].subSubjects || {};
      for (var ss of Object.keys(subs)) {
        var arr = subs[ss];
        if (Array.isArray(arr)) {
          for (var q of arr) { q._topic = ss; questions.push(q); }
        }
      }
    }
    cats[key] = { key: key, label: label, questions: questions };
    all = all.concat(questions.map(function (q) { return { cat: key, q: q }; }));
  }
  return { cats: cats, all: all };
}

function archiveYears(qs) {
  var py = [];
  for (var q of qs) {
    var d = q.pubDate ? new Date(q.pubDate).getUTCFullYear() : null;
    if (d && d >= 1000 && d <= 2026) py.push(d);
  }
  if (!py.length) return null;
  return { min: Math.min.apply(null, py), max: Math.max.apply(null, py) };
}

// News/time-stamped feeds — for these, the date the question entered the archive
// is a fair proxy for when the topic is relevant, so archive-anchoring stays on.
var NEWS_CATS = ['current-affairs', 'pib-archive', 'announcements', 'rbi-press-releases'];

// Keyword → era classifier. Used ONLY when a topic has no dateable content, so a
// year-less topic still lands in the right era band instead of being dumped at "now".
var ERA_KEYWORDS = {
  ancient: /indus|harappa|vedic|vedas|maurya|gupta|sunga|kushan|satavahana|nanda|saka|pallava|chalukya|chola|chera|pandya|sangam|buddha|ashoka|kalinga|panini|aryabhata|sushruta|charaka|kalidasa|mahajanapada|bhimbetka|prehistoric|stone age|bronze age|iron age|ganapati/i,
  medieval: /sultanate|mughal|mamluk|khilji|tughlaq|sayyid|lodi|vijayanagara|maratha|rashtrakuta|pratihara|gurjara|bhakti|sufi|bahmani|ahom|rajput|kakatiya|adil shahi|qutub|iqta|mansabdar|delhi sultanate/i,
  freedom: /1857|sepoy|mutiny|swadeshi|satyagraha|non-cooperation|civil disobedience|quit india|partition|jallianwala|khilafat|salt march|bardoli|champaran|gandhi|nehru|tilak|gokhale|bose|congress|independence movement|revolt of 1857|british|east india|viceroy/i,
  republic: /constitution|planning commission|five year|green revolution|liberalisation|gst|election commission|rajya sabha|lok sabha|republic day|sarkaria|mandal commission|nehruvian/i
};
var CATEGORY_ERA = {
  'ancient-india': 'ancient',
  'medieval-modern-india': 'medieval'
};

function eraForTopic(tname, catKey) {
  var t = String(tname || '').toLowerCase();
  for (var eid of ['ancient', 'medieval', 'freedom', 'republic']) {
    if (ERA_KEYWORDS[eid].test(t)) return eid;
  }
  return CATEGORY_ERA[catKey] || null;
}

// A topic's question text often cross-references years in answers/facts (e.g. "Battle
// of Plassey" mentions 1885, 1994, 2025), so naive min..max stretches the span across
// centuries. BUT trimming by raw count is also wrong: a topic like "World Trade
// Organization" has questions that skew toward recent years, so the densest cluster
// (2012–2026) wrongly deletes its real history (GATT 1947 → WTO 1995 → present).
// Rule: drop a separated cluster only when it is BOTH isolated by a large gap AND a
// minority of the points; keep everything connected by small gaps as the true range.
// A very large internal gap (>= HUGE) means the years are about two different subjects
// (e.g. Indus Valley's ancient era vs its 1920s–2020s excavation references). For
// categories with a known era, keep the side that holds more of that era's years, but
// ONLY when the losing side is essentially outside the era (<= 10% of its own points in
// it) — otherwise both sides are real chronological content and the ordinary minority
// rule decides. And never drop a minority side when the surviving side still spans most
// of the range: a sparse-but-huge side ("Human history"'s ancient era) is real content,
// not cross-reference noise.
function robustSpan(ys, catKey, trustedSet) {
  var GAP = 60;         // years — a larger gap separates distinct periods
  var HUGE = 300;       // years — different subject/reference era
  var MIN_FRAC = 0.25;  // a separated cluster is noise only if it holds < this fraction
  var s = ys.slice().sort(function (a, b) { return a - b; });
  if (s.length <= 2) return { min: s[0], max: s[s.length - 1] };
  var changed = true;
  while (changed && s.length > 2) {
    changed = false;
    var bestGap = -1, bestIdx = -1;
    for (var i = 1; i < s.length; i++) {
      var g = s[i] - s[i - 1];
      if (g > bestGap) { bestGap = g; bestIdx = i; }
    }
    if (bestGap < GAP) break; // connected series — keep the whole range
    var left = bestIdx, right = s.length - bestIdx, n = s.length;
    if (bestGap > HUGE) {
      // Trusted-anchor: years written with BC/AD/CE or a century are authoritative.
      // When one side of a huge gap is a coherent cluster of trusted years (span < 200y,
      // >= 2 distinct) and the other side is almost entirely untrusted, the untrusted
      // side is reference/citation noise (Xuanzang's 7th-century life vs 19th–21st
      // century book citations and "1000 li" quantities) and is dropped.
      if (trustedSet) {
        var lT = trustedStats(s, 0, bestIdx, trustedSet);
        var rT = trustedStats(s, bestIdx, s.length, trustedSet);
        // The kept side must be a coherent trusted cluster that is also a
        // substantial part of the topic's own years (>= 20% of points) — a stray
        // ancient "7th century" mention inside a modern topic must not override the
        // majority. The dropped side must be a scattered, mostly-untrusted reference
        // range spanning >= 150 years (book citations, quantities).
        var dropR = lT.fraction >= 0.5 && lT.span < 200 && lT.distinct >= 2 && left / n >= 0.2 && rT.fraction <= 0.15 && (s[s.length - 1] - s[bestIdx]) >= 150;
        var dropL = rT.fraction >= 0.5 && rT.span < 200 && rT.distinct >= 2 && right / n >= 0.2 && lT.fraction <= 0.15 && (s[bestIdx - 1] - s[0]) >= 150;
        if (dropR) { s = s.slice(0, bestIdx); changed = true; continue; }
        if (dropL) { s = s.slice(bestIdx); changed = true; continue; }
      }
      var pref = CATEGORY_ERA[catKey];
      if (pref) {
        var lCnt = countInEra(s, 0, bestIdx, pref);
        var rCnt = countInEra(s, bestIdx, s.length, pref);
        var lFrac = lCnt / bestIdx, rFrac = rCnt / (s.length - bestIdx);
        if (lCnt > rCnt && rFrac <= 0.1) { s = s.slice(0, bestIdx); changed = true; continue; }
        if (rCnt > lCnt && lFrac <= 0.1) { s = s.slice(bestIdx); changed = true; continue; }
      }
      // else fall through to the ordinary minority rule
    }
    // Drop a separated cluster only when it is a clear minority. A 1–2 year cluster is
    // cross-reference noise (a Red Fort question mentioning "2600 BCE Harappa") and is
    // always dropped. A multi-year minority is real chronological content only if the
    // surviving side is also broad (e.g. "History of Eurasia", "Human history") — when
    // the surviving side is tight, the minority is noise there too (e.g. Plassey's
    // stray 1400/1500/2025 references).
    var dropSide = null;
    if (left < right && left / n < MIN_FRAC) dropSide = 'R';
    else if (right < left && right / n < MIN_FRAC) dropSide = 'L';
    if (dropSide) {
      var dropArr = dropSide === 'R' ? s.slice(0, bestIdx) : s.slice(bestIdx);
      var distinct = {}, nD = 0;
      for (var d of dropArr) { if (!distinct[d]) { distinct[d] = 1; nD++; } }
      if (nD > 2) {
        var remain = dropSide === 'R' ? s.slice(bestIdx) : s.slice(0, bestIdx);
        var remainRange = remain[remain.length - 1] - remain[0];
        var totalRange = s[s.length - 1] - s[0];
        if (remainRange / totalRange > 0.6) dropSide = null;
      }
    }
    if (dropSide === 'R') { s = s.slice(bestIdx); changed = true; }
    else if (dropSide === 'L') { s = s.slice(0, bestIdx); changed = true; }
    else break;
  }
  return { min: s[0], max: s[s.length - 1] };
}
function countInEra(s, a, b, eraId) {
  var n = 0;
  for (var i = a; i < b; i++) if (eraOf(s[i]) === eraId) n++;
  return n;
}
function trustedStats(s, a, b, trustedSet) {
  var cnt = 0, mn = Infinity, mx = -Infinity, distinct = {};
  for (var i = a; i < b; i++) {
    if (trustedSet[s[i]]) {
      cnt++;
      if (s[i] < mn) mn = s[i];
      if (s[i] > mx) mx = s[i];
      distinct[s[i]] = 1;
    }
  }
  return {
    fraction: (b - a) ? cnt / (b - a) : 0,
    span: (mx === -Infinity) ? Infinity : mx - mn,
    distinct: Object.keys(distinct).length
  };
}

// A blank-fill ANSWER that is a pure number is a year only when the blank asks for a
// year. If the blank sits right next to a measurement word ("the _____ metres run",
// "about _____ tractors"), the number is a quantity and must not date the topic.
var MEAS_NEAR_BLANK = /_+[- ]?(?:metres?|meters?|m\b|km\b|kg\b|kgs?|kilometres?|kilometers?|miles?|li\b|feet|ft\b|inches?|cm\b|mm\b|grams?|tonnes?|tons?|litres?|liters?|ml\b|points?|pts\b|percent|%|rupees?|rs\b|lakh|crore|tractors|markets?|messages?|altitude|height|distance|weight|mass|speed|monks?|nuns?|monasteries?|monastaries?|soldiers|troops|students|workers|farmers|people|persons|years?|yrs?)/i;

function topicYears(name, qs, catKey) {
  var ys = [];
  var trusted = {};
  for (var q of qs) {
    var qtext = [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' ');
    var ansIsNum = /^\s*(1[0-9]{3}|20[0-2][0-9])\s*$/.test(q.answer || '');
    if (ansIsNum && MEAS_NEAR_BLANK.test(String(q.question || ''))) {
      qtext = [q.question, q.fact, q.hint].filter(Boolean).join(' ');
    }
    var fy = yearSignals(qtext);
    if (fy) {
      ys.push(fy.min); ys.push(fy.max);
      for (var k of Object.keys(fy.trusted)) trusted[k] = true;
    }
  }
  // A sub-topic's own questions are topically coherent, so every extracted year is
  // about the topic — keep BC/AD/century years always, and bare years 1000+ too
  // (previously bare 1000–1799 like "1066" or "1757" were wrongly dropped).
  var fl = ys.filter(function (y) { return trusted[y] || y < 0 || (y >= 1000 && y <= 2026); });
  var nY = nameYears(name);
  if (nY) { fl.push(nY.min); fl.push(nY.max); }
  if (TOPIC_OVERRIDES[name]) {
    return { min: TOPIC_OVERRIDES[name][0], max: TOPIC_OVERRIDES[name][1] };
  }
  if (!fl.length) return null;
  return robustSpan(fl, catKey, trusted);
}

function typeOf(name) {
  var n = name.toLowerCase();
  if (/movement|rebellion|revolt|revolution|protest|uprising|agitation|campaign|satyagraha|march|massacre|mutiny|jallianwala/i.test(n)) return 'event';
  if (/scheme|yojana|mission|programme|program|policy|act\b|treaty|agreement|organisation|organization|department|commission|committee|bank|corporation|authority|university|institute|association/i.test(n)) return 'org';
  if (/disease|virus|flu|pandemic|epidemic|malaria|cholera|smallpox|polio|leprosy|tuberculosis|covid|famine|plague|dengue|chikungunya/i.test(n)) return 'disease';
  return 'concept';
}

function eraOf(y) {
  if (y == null) return null;
  for (var e of ERAS) { if (y >= e.min && y <= e.max) return e.id; }
  return null;
}

// Surnames too common in India to act as a person's alias (they match unrelated people,
// e.g. "Singh" -> Manmohan Singh, "Bose" -> Bose-Einstein, "Chand" -> Chandigarh).
var COMMON_SURNAMES = ['singh', 'kumar', 'kumari', 'sharma', 'prasad', 'lal', 'ram', 'das', 'dev', 'roy', 'rao', 'nair', 'menon', 'iyer', 'iyengar', 'pillai', 'patil', 'khan', 'ahmed', 'ali', 'begum', 'kaur', 'pal', 'anand', 'rai', 'patel', 'bose', 'chand', 'pandey', 'naidu', 'chopra'];

// Trailing words that are NOT surnames (e.g. "Alexander the Great" -> "Great").
var NON_SURNAMES = ['great', 'the', 'of', 'de', 'junior', 'senior', 'saint', 'ii', 'iii', 'iv', 'v',
  'emperor', 'empress', 'king', 'queen', 'prince', 'princess', 'sultan', 'caliph', 'pope', 'tsar', 'czar',
  'shah', 'raja', 'maharaja', 'nawab', 'pasha', 'grand', 'duke', 'duchess', 'jr', 'sr', 'baba', 'ji', 'saheb'];

// Entities whose bare surname is too ambiguous to reuse — match full name only.
// ("Gandhi" usually means Mahatma; Indira must be named explicitly.)
var NO_SURNAME_ALIAS = ['Indira Gandhi', 'Hu Mei', 'Alexander Graham Bell', 'Guru Tegh Bahadur', 'Rosa Parks', 'Adam Smith', 'Queen Victoria', 'Karl Marx', 'Motilal Nehru', 'Maulana Abul Kalam Azad', 'Jayaprakash Narayan', 'Periyar', 'Jagadish Chandra Bose', 'Meghnad Saha', 'Vikram Sarabhai', 'A. P. J. Abdul Kalam', 'Salim Ali', 'Prafulla Chandra Ray', 'Subramania Bharati', 'Birsa Munda', 'Narayana Guru', 'Joan of Arc', 'Shyama Prasad Mukherjee'];

function aliasesFor(name, isPerson) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) {
    a.push(parts.join(' '));
    if (isPerson && NO_SURNAME_ALIAS.indexOf(name) === -1) {
      var sur = parts[parts.length - 1].toLowerCase().replace(/\.$/, '');
      // distinctive surnames only (never "Singh"/"Patel"/"Bose"/"Great"...)
      if (sur.length >= 3 && COMMON_SURNAMES.indexOf(sur) === -1 && NON_SURNAMES.indexOf(sur) === -1) a.push(parts[parts.length - 1]);
    }
  }
  return a;
}

// Common adjectival/possessive tails that still refer to the same entity:
// "Gandhian" -> Gandhi, "Ashokan" -> Ashoka, "Gandhiji" -> Gandhi, "Gandhi's" -> Gandhi.
// Anything else after the alias (e.g. "GandhiNagar", "Chandigarh") is NOT a hit.
var INFLEX = ['an', 'ian', 'vian', 'ean', 'in', 'ine', 'ite', 'ist', 'ese', 'ers', 'ans', 'ians', 'ites', 'ji', 's', "'s"];

function buildAliasRe(aliases) {
  var seen = {};
  var alts = [];
  for (var a of aliases) {
    if (!a) continue;
    var k = a.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    alts.push(a);
  }
  if (!alts.length) return null;
  alts.sort(function (x, y) { return y.length - x.length; });
  return new RegExp('(^|[^a-z0-9])(' + alts.map(escapeRe).join('|') + ')([a-z]*)(?=[^a-z0-9]|$)', 'gi');
}

// Whole-word match with a short whitelist of inflections; resets lastIndex safely.
function aliasHit(re, txt) {
  if (!re) return false;
  re.lastIndex = 0;
  var m;
  while ((m = re.exec(txt))) {
    var alias = m[2];
    var suffix = m[3].toLowerCase();
    if (suffix === '' ) return true;
    if (alias.length >= 4 && INFLEX.indexOf(suffix) !== -1) return true;
  }
  return false;
}

// Full-name aliases only (no bare surnames) — used for cross-entity links to avoid noise.
function linkAliasesFor(name) {
  var a = [name];
  a.push(name.replace(/\b(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/g, ''));
  var parts = name.split(/[\s,]+/).filter(function (p) { return p; });
  if (parts.length === 1) a.push(parts[0]);
  if (parts.length >= 2) a.push(parts.join(' '));
  return a;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function modeSpan(spans) {
  var freq = {};
  for (var sp of spans) {
    if (!sp) continue;
    var k = sp.min + '-' + sp.max;
    freq[k] = (freq[k] || 0) + 1;
  }
  var bestK = null, bestN = 0;
  for (var kk of Object.keys(freq)) { if (freq[kk] > bestN) { bestN = freq[kk]; bestK = kk; } }
  if (!bestK) return null;
  var b = bestK.split('-');
  return { min: +b[0], max: +b[1] };
}

function main() {
  var all = loadAll();
  var nodes = [];
  var seen = {};

  // Sub-topic nodes
  for (var key of Object.keys(all.cats)) {
    var c = all.cats[key];
    var byTopic = {};
    for (var q of c.questions) {
      var t = q.subSubject || q._topic || 'General';
      (byTopic[t] = byTopic[t] || []).push(q);
    }
    for (var tname of Object.keys(byTopic)) {
      var id = key + '|' + tname;
      if (seen[id]) {
        seen[id].cats.push({ key: key, label: c.label, count: byTopic[tname].length });
        seen[id].count += byTopic[tname].length;
        continue;
      }
      var qs = byTopic[tname];
      var span = topicYears(tname, qs, key);
      var timebase = null;
      var eraId = null;
      if (!span) {
        // No dateable content. Prefer a proper home over a fake "2026":
        // 1) news feeds keep their archive date, 2) historical topics land in
        // their era band, 3) everything else is left genuinely undated.
        if (NEWS_CATS.indexOf(key) !== -1) {
          var ap = archiveYears(qs);
          if (ap) { span = { min: ap.min, max: ap.max }; timebase = 'archive'; }
        }
        if (!span) {
          eraId = eraForTopic(tname, key);
          if (eraId) {
            var eobj = ERAS.find(function (x) { return x.id === eraId; });
            var mid = Math.round((eobj.min + eobj.max) / 2);
            span = { min: mid, max: mid };
            timebase = 'era';
          } else {
            timebase = 'undated';
          }
        }
      }
      var node = {
        id: id,
        name: tname,
        type: typeOf(tname),
        span: span,
        era: timebase === 'era' ? eraId : eraOf(span && span.min),
        timebase: timebase,
        level: 4,
        cats: [{ key: key, label: c.label, count: qs.length }],
        count: qs.length,
        desc: personDescFor(tname, qs)
      };
      seen[id] = node;
      nodes.push(node);
    }
  }

  // Seed entity nodes: match aliases across all questions
  var seedNodes = [];
  for (var grp of Object.keys(SEED)) {
    var g = SEED[grp];
    for (var ename of g.list) {
      var isPerson = g.type === 'person';
      var aliases = aliasesFor(ename, isPerson).concat(EXTRA_ALIASES[ename] || []);
      var alRe = buildAliasRe(aliases);
      var negatives = (NEGATIVE_ALIASES[ename] || []).map(function (x) { return x.toLowerCase(); });
      var hitQs = [];
      var catMap = {};
      for (var it of all.all) {
        var txt = [it.q.question, it.q.answer, it.q.fact, it.q.hint].filter(Boolean).join(' ').toLowerCase();
        var negHit = negatives.length && negatives.some(function (x) { return txt.indexOf(x) !== -1; });
        if (!negHit && aliasHit(alRe, txt)) {
          hitQs.push(it);
          catMap[it.cat] = catMap[it.cat] || 0;
          catMap[it.cat]++;
        }
      }
      var ys = [];
      var trusted = {};
      var bioSpans = [];
      var ownTopics = {}; // sub-topic name -> {n, firstBioSpan}
      var canonical = ename.replace(/^(Dr\.?|Sir|Saint|Mahatma|Sardar|Bapu)\s+/i, '').replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      for (var hq of hitQs) {
        var allText = [hq.q.question, hq.q.answer, hq.q.fact, hq.q.hint].filter(Boolean).join(' ');
        var fy = yearSignals(allText);
        if (fy) {
          ys.push(fy.min); ys.push(fy.max);
          for (var tk of Object.keys(fy.trusted)) trusted[tk] = true;
        }
        var bs = bioSpan(allText);
        if (bs) bioSpans.push(bs);
        if (isPerson) {
          var tname = hq.q.subSubject || hq.q._topic || '';
          var tnorm = tname.replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          var tnormStrip = tnorm.replace(/^(dr|sir|saint|mahatma|sardar|bapu)\s+/, '');
          if (tnorm === canonical || tnormStrip === canonical || tnorm === ename.toLowerCase()) {
            if (!ownTopics[tname]) ownTopics[tname] = { n: 0, first: null };
            ownTopics[tname].n++;
            if (ownTopics[tname].first === null && bs) ownTopics[tname].first = bs;
          }
        }
      }
      var span = null;
      if (MANUAL_SPANS[ename]) {
        span = { min: MANUAL_SPANS[ename][0], max: MANUAL_SPANS[ename][1] };
      } else if (isPerson) {
        // Prefer the largest own-topic's first (birth–death) span.
        var bestTopic = null;
        for (var tn of Object.keys(ownTopics)) {
          if (!bestTopic || ownTopics[tn].n > bestTopic.n) bestTopic = ownTopics[tn];
        }
        span = bestTopic && bestTopic.first ? bestTopic.first : modeSpan(bioSpans);
      }
      if (!span && ys.length) {
        var fl = ys.filter(function (y) { return trusted[y] || y < 0 || y >= 1800; });
        if (fl.length) span = robustSpan(fl, null, trusted);
      }
      if (!span) {
        var ap = archiveYears(hitQs);
        if (ap) span = { min: ap.min, max: ap.max, archive: true };
      }
      var node = {
        id: 'seed|' + ename,
        name: ename,
        type: g.type,
        level: g.level,
        span: span,
        era: eraOf(span && span.min),
        cats: Object.keys(catMap).map(function (k) { return { key: k, label: all.cats[k] ? all.cats[k].label : k, count: catMap[k] }; }),
        count: hitQs.length,
        seed: true,
        aliases: aliases,
        desc: isPerson ? personDescFor(ename, hitQs) : null
      };
      if (span && span.archive) node.timebase = 'archive';
      nodes.push(node);
      seedNodes.push(node);
    }
  }

  // Cross-entity links: co-occurrence of two seed entities inside one question.
  var aliasMap = {};
  for (var sn of seedNodes) {
    for (var al of linkAliasesFor(sn.name)) aliasMap[al.toLowerCase()] = sn.id;
  }
  var aliasList = Object.keys(aliasMap).sort(function (x, y) { return y.length - x.length; });
  var linkRe = new RegExp('(^|[^a-z0-9])(' + aliasList.map(escapeRe).join('|') + ')([a-z]*)(?=[^a-z0-9]|$)', 'gi');
  var pairCount = {};
  for (var it2 of all.all) {
    var lt = [it2.q.question, it2.q.answer, it2.q.fact, it2.q.hint].filter(Boolean).join(' ').toLowerCase();
    var found = {};
    var m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(lt))) {
      var al = m[2].toLowerCase();
      var suffix = m[3].toLowerCase();
      if (suffix !== '' && (al.length < 4 || INFLEX.indexOf(suffix) === -1)) continue;
      var id = aliasMap[al];
      if (id) {
        var negs = NEGATIVE_ALIASES[id.slice(5)] || [];
        var negHit = negs.length && negs.some(function (x) { return lt.indexOf(x.toLowerCase()) !== -1; });
        if (!negHit) found[id] = true;
      }
    }
    var ids = Object.keys(found);
    if (ids.length >= 2 && ids.length <= 10) {
      for (var i = 0; i < ids.length; i++) {
        for (var j = i + 1; j < ids.length; j++) {
          var k = ids[i] < ids[j] ? ids[i] + '\u0000' + ids[j] : ids[j] + '\u0000' + ids[i];
          pairCount[k] = (pairCount[k] || 0) + 1;
        }
      }
    }
  }
  var links = [];
  for (var pk of Object.keys(pairCount)) {
    if (pairCount[pk] >= 2) {
      var sp = pk.split('\u0000');
      links.push({ a: sp[0], b: sp[1], w: pairCount[pk] });
    }
  }
  links.sort(function (x, y) { return y.w - x.w; });

  var MANUAL_LINKS = [
    ['seed|Mahatma Gandhi', 'seed|Indian independence movement', 5],
    ['seed|Mahatma Gandhi', 'seed|Indian National Congress', 4],
    ['seed|Mahatma Gandhi', 'seed|Non-cooperation movement', 4],
    ['seed|Mahatma Gandhi', 'seed|Civil disobedience movement', 4],
    ['seed|Mahatma Gandhi', 'seed|Salt march', 3],
    ['seed|Mahatma Gandhi', 'seed|Dandi March', 3],
    ['seed|Mahatma Gandhi', 'seed|Champaran Satyagraha', 3],
    ['seed|Mahatma Gandhi', 'seed|Quit India movement', 3],
    ['seed|Mahatma Gandhi', 'seed|Jawaharlal Nehru', 3],
    ['seed|Mahatma Gandhi', 'seed|B. R. Ambedkar', 3],
    ['seed|Mahatma Gandhi', 'seed|Rabindranath Tagore', 3],
    ['seed|Mahatma Gandhi', 'seed|Gopal Krishna Gokhale', 3],
    ['seed|Mahatma Gandhi', 'seed|Sardar Vallabhbhai Patel', 2],
    ['seed|Mahatma Gandhi', 'seed|C. Rajagopalachari', 2],
    ['seed|Mahatma Gandhi', 'seed|Jallianwala Bagh massacre', 2],
    ['seed|Indian National Congress', 'seed|Quit India movement', 3],
    ['seed|Indian National Congress', 'seed|Jawaharlal Nehru', 3],
    ['seed|Indian National Congress', 'seed|Indira Gandhi', 3],
    ['seed|Indian National Congress', 'seed|Partition of India', 2],
    ['seed|Indian National Congress', 'seed|Swadeshi movement', 2],
    ['seed|Indian National Congress', 'seed|Sarojini Naidu', 2],
    ['seed|Indian National Congress', 'seed|Annie Besant', 2],
    ['seed|Indian National Congress', 'seed|C. Rajagopalachari', 2],
    ['seed|Jawaharlal Nehru', 'seed|Five-Year Plans (India)', 3],
    ['seed|Jawaharlal Nehru', 'seed|Bangladesh Liberation War', 2],
    ['seed|Indira Gandhi', 'seed|Bangladesh Liberation War', 3],
    ['seed|Indira Gandhi', 'seed|Bank nationalisation in India', 3],
    ['seed|Indira Gandhi', 'seed|Pokhran-II', 2],
    ['seed|Subhas Chandra Bose', 'seed|Indian independence movement', 3],
    ['seed|Subhas Chandra Bose', 'seed|Quit India movement', 2],
    ['seed|B. R. Ambedkar', 'seed|Constituent Assembly of India', 3],
    ['seed|B. R. Ambedkar', 'seed|Partition of India', 2],
    ['seed|Sardar Vallabhbhai Patel', 'seed|Partition of India', 3],
    ['seed|Sardar Vallabhbhai Patel', 'seed|Constituent Assembly of India', 2],
    ['seed|Bhagat Singh', 'seed|Indian independence movement', 3],
    ['seed|Bhagat Singh', 'seed|Jallianwala Bagh massacre', 2],
    ['seed|Mohammad Ali Jinnah', 'seed|Partition of India', 3],
    ['seed|Mohammad Ali Jinnah', 'seed|Indian National Congress', 2],
    ['seed|Bal Gangadhar Tilak', 'seed|Swadeshi movement', 3],
    ['seed|Bal Gangadhar Tilak', 'seed|Indian National Congress', 2],
    ['seed|Lala Lajpat Rai', 'seed|Simon Commission', 3],
    ['seed|Mangal Pandey', 'seed|Revolt of 1857', 3],
    ['seed|Mangal Pandey', 'seed|Sepoy Mutiny', 3],
    ['seed|Rani Lakshmibai', 'seed|Revolt of 1857', 3],
    ['seed|Rani Lakshmibai', 'seed|Sepoy Mutiny', 2],
    ['seed|Rani Lakshmibai', 'seed|Indian independence movement', 2],
    ['seed|Khilafat movement', 'seed|Non-cooperation movement', 3],
    ['seed|Chandragupta Maurya', 'seed|Maurya Empire', 3],
    ['seed|Chanakya', 'seed|Chandragupta Maurya', 3],
    ['seed|Chanakya', 'seed|Maurya Empire', 2],
    ['seed|Ashoka', 'seed|Maurya Empire', 3],
    ['seed|Ashoka', 'seed|Kalinga War', 3],
    ['seed|Ashoka', 'seed|Buddhist missions under Ashoka', 3],
    ['seed|Ashoka', 'seed|Third Buddhist Council', 3],
    ['seed|Moggaliputta-Tissa', 'seed|Third Buddhist Council', 3],
    ['seed|Moggaliputta-Tissa', 'seed|Ashoka', 2],
    ['seed|First Buddhist Council', 'seed|Gautama Buddha', 3],
    ['seed|First Buddhist Council', 'seed|Tipiṭaka (Pali Canon)', 3],
    ['seed|Second Buddhist Council', 'seed|First Buddhist Council', 2],
    ['seed|Second Buddhist Council', 'seed|Third Buddhist Council', 2],
    ['seed|Third Buddhist Council', 'books-authors|Abhidhamma Piṭaka', 3],
    ['seed|Third Buddhist Council', 'seed|Maurya Empire', 2],
    ['seed|Fourth Buddhist Council', 'seed|Tipiṭaka (Pali Canon)', 3],
    ['seed|Fourth Buddhist Council', 'books-authors|Abhidhamma Piṭaka', 2],
    ['seed|Buddhist missions under Ashoka', 'seed|Third Buddhist Council', 2],
    ['seed|Gautama Buddha', 'seed|Tipiṭaka (Pali Canon)', 2],
    ['books-authors|Abhidhamma Piṭaka', 'seed|Tipiṭaka (Pali Canon)', 3],
    ['seed|Mahaparinirvana of the Buddha', 'seed|Gautama Buddha', 3],
    ['seed|Mahaparinirvana of the Buddha', 'seed|First Buddhist Council', 3],
    ['seed|Mahaparinirvana of the Buddha', 'seed|Kushinagar', 3],
    ['seed|Lumbini', 'seed|Gautama Buddha', 3],
    ['seed|Rajgir', 'seed|First Buddhist Council', 3],
    ['seed|Pataliputra', 'seed|Maurya Empire', 3],
    ['seed|Pataliputra', 'seed|Gupta Empire', 2],
    ['seed|Gandhara', 'seed|Kushan Empire', 3],
    ['seed|Mathura', 'seed|Kushan Empire', 2],
    ['seed|Rigveda', 'seed|Vedic period', 3],
    ['seed|Rigveda', 'seed|Indus Valley Civilization', 2],
    ['seed|Roman Republic', 'seed|Julius Caesar', 3],
    ['seed|Roman Republic', 'seed|Augustus', 3],
    ['seed|Julius Caesar', 'seed|Cleopatra', 3],
    ['seed|Cleopatra', 'seed|Augustus', 2],
    ['seed|Hellenistic period', 'seed|Alexander the Great', 3],
    ['seed|Hellenistic period', 'seed|Cleopatra', 3],
    ['seed|Hellenistic period', 'world-history|Ancient Greece', 3],
    ['world-history|Ancient Greece', 'seed|Athens', 3],
    ['world-history|Ancient Greece', 'seed|Sparta', 3],
    ['seed|Athens', 'seed|Sparta', 3],
    ['seed|Parthian Empire', 'seed|Sasanian Empire', 3],
    ['seed|Sasanian Empire', 'seed|Huns', 2],
    ['seed|Huna invasions of India', 'seed|Gupta Empire', 3],
    ['seed|Qin dynasty', 'seed|Han dynasty', 3],
    ['seed|Qin dynasty', 'seed|Great Wall of China', 3],
    ['seed|Han dynasty', 'seed|Song dynasty', 2],
    ['seed|Song dynasty', 'seed|Ming dynasty', 2],
    ['seed|Ming dynasty', 'seed|Qing dynasty', 3],
    ['seed|Ming dynasty', 'seed|Zhu Yuanzhang', 3],
    ['seed|Ming dynasty', 'seed|Yongle Emperor', 3],
    ['seed|Ming dynasty', 'seed|Zheng He', 3],
    ['seed|Ming dynasty', 'seed|Red Turban Rebellion', 3],
    ['seed|Ming dynasty', 'seed|Treasure voyages', 3],
    ['seed|Ming dynasty', 'seed|Battle of Lake Poyang', 2],
    ['seed|Ming dynasty', 'seed|Jingnan Campaign', 2],
    ['seed|Ming dynasty', 'seed|Ming conquest of Yunnan', 2],
    ['seed|Ming dynasty', 'seed|Forbidden City', 2],
    ['seed|Ming dynasty', 'seed|Yongle Encyclopedia', 2],
    ['seed|Ming dynasty', 'seed|Great Wall of China', 2],
    ['seed|Red Turban Rebellion', 'seed|Zhu Yuanzhang', 3],
    ['seed|Red Turban Rebellion', 'seed|Battle of Lake Poyang', 2],
    ['seed|Zhu Yuanzhang', 'seed|Battle of Lake Poyang', 2],
    ['seed|Zhu Yuanzhang', 'seed|Xu Da', 3],
    ['seed|Zhu Yuanzhang', 'seed|Chang Yuchun', 3],
    ['seed|Zhu Yuanzhang', 'seed|Tang He', 3],
    ['seed|Zhu Yuanzhang', 'seed|Liao Yongzhong', 2],
    ['seed|Zhu Yuanzhang', 'seed|Hu Mei', 2],
    ['seed|Battle of Lake Poyang', 'seed|Liao Yongzhong', 2],
    ['seed|Jingnan Campaign', 'seed|Yongle Emperor', 3],
    ['seed|Yongle Emperor', 'seed|Zheng He', 3],
    ['seed|Yongle Emperor', 'seed|Forbidden City', 3],
    ['seed|Yongle Emperor', 'seed|Yongle Encyclopedia', 3],
    ['seed|Yongle Emperor', 'seed|Treasure voyages', 3],
    ['seed|Zheng He', 'seed|Treasure voyages', 3],
    ['seed|Mohenjo-daro', 'seed|Indus Valley Civilization', 3],
    ['seed|Kanchi', 'art-culture|Pallava dynasty', 3],
    ['seed|Vaishali', 'seed|Gautama Buddha', 3],
    ['seed|Vaishali', 'seed|Mahavira', 3],
    ['seed|Kurukshetra', 'seed|Vedic period', 2],
    ['seed|Ranjit Singh', 'medieval-modern-india|Sikh Empire', 3],
    ['seed|Ghadar Movement', 'seed|Indian independence movement', 3],
    ['seed|Ghadar Movement', 'seed|Bal Gangadhar Tilak', 2],
    ['seed|Azad Hind Fauj', 'seed|Subhas Chandra Bose', 3],
    ['seed|Azad Hind Fauj', 'seed|Indian independence movement', 3],
    ['seed|Azad Hind Fauj', 'seed|Quit India movement', 2],
    ['seed|Radcliffe Line', 'seed|Partition of India', 3],
    ['seed|73rd Constitutional Amendment', 'indian-society|Panchayati raj', 3],
    ['seed|73rd Constitutional Amendment', 'constitution|Constitution of India', 3],
    ['seed|C V Raman', 'seed|Bhabha Atomic Research Centre', 2],
    ['seed|Gir', 'environment-ecology|Asiatic lion', 3],
    ['seed|Thomas Edison', 'seed|Nikola Tesla', 3],
    ['seed|Thomas Edison', 'seed|Alexander Graham Bell', 2],
    ['seed|Alexander Graham Bell', 'seed|Nikola Tesla', 2],
    ['seed|Galileo Galilei', 'seed|Scientific Revolution', 3],
    ['seed|Galileo Galilei', 'seed|Isaac Newton', 2],
    ['seed|Louis Pasteur', 'seed|Smallpox', 2],
    ['seed|Mahmud of Ghazni', 'seed|Mohammad Ghori', 3],
    ['seed|Mahmud of Ghazni', 'seed|Delhi Sultanate', 2],
    ['seed|Mohammad Ghori', 'seed|Delhi Sultanate', 3],
    ['seed|Prithviraj Chauhan', 'seed|Mohammad Ghori', 3],
    ['seed|Prithviraj Chauhan', 'seed|Delhi Sultanate', 2],
    ['seed|Jahangir', 'seed|Mughal Empire', 3],
    ['seed|Jahangir', 'seed|Nur Jahan', 3],
    ['seed|Jahangir', 'seed|Guru Arjan', 3],
    ['seed|Guru Arjan', 'seed|Guru Tegh Bahadur', 2],
    ['seed|Guru Tegh Bahadur', 'seed|Mughal Empire', 2],
    ['seed|Nur Jahan', 'seed|Mughal Empire', 2],
    ['seed|Bajirao I', 'seed|Maratha Empire', 3],
    ['seed|Sambhaji', 'seed|Maratha Empire', 3],
    ['seed|Sambhaji', 'seed|Shivaji', 3],
    ['seed|Kabir', 'seed|Guru Nanak', 2],
    ['seed|Basavanna', 'seed|Kabir', 2],
    ['seed|Tukaram', 'seed|Chaitanya Mahaprabhu', 2],
    ['seed|Sputnik', 'seed|Space Race', 3],
    ['seed|Hubble Space Telescope', 'seed|Space Race', 2],
    ['seed|James Webb Space Telescope', 'seed|Hubble Space Telescope', 3],
    ['seed|Voyager program', 'seed|Sputnik', 2],
    ['seed|Voyager program', 'seed|Space Race', 2],
    ['seed|Smartphone', 'seed|Internet', 2],
    ['seed|Smartphone', 'seed|GPS', 2],
    ['seed|Microsoft', 'seed|Microsoft Windows', 3],
    ['seed|Microsoft', 'seed|Linux', 2],
    ['seed|Microsoft Windows', 'seed|Internet', 2],
    ['seed|Twitter', 'seed|Internet', 2],
    ['seed|Instagram', 'seed|Twitter', 2],
    ['seed|YouTube', 'seed|Instagram', 2],
    ['seed|Bitcoin', 'seed|Cryptocurrency', 3],
    ['seed|Bitcoin', 'seed|Internet', 2],
    ['seed|Cryptocurrency', 'seed|Internet', 2],
    ['seed|Life Insurance Corporation of India', 'seed|Reserve Bank of India', 2],
    ['seed|Export-Import Bank of India', 'seed|Reserve Bank of India', 2],
    ['seed|MGNREGA', 'seed|Five-Year Plans (India)', 2],
    ['seed|Blue Revolution', 'seed|Fisheries', 3],
    ['seed|Blue Revolution', 'seed|Green Revolution', 2],
    ['seed|El Niño', 'seed|La Niña', 3],
    ['seed|Qing dynasty', 'seed|Sun Yat-sen', 3],
    ['seed|Han dynasty', 'seed|Confucius', 2],
    ['seed|Qing dynasty', 'seed|Boxer Rebellion', 3],
    ['seed|Taiping Rebellion', 'seed|Qing dynasty', 3],
    ['seed|Cultural Revolution', 'seed|Long March', 2],
    ['seed|Vedic period', 'seed|Maurya Empire', 2],
    ['seed|Samudragupta', 'seed|Gupta Empire', 3],
    ['seed|Gupta Empire', 'seed|Kushan Empire', 2],
    ['seed|Gupta Empire', 'seed|Chola Empire', 2],
    ['seed|Delhi Sultanate', 'seed|Vijayanagara Empire', 2],
    ['seed|Delhi Sultanate', 'seed|First Battle of Panipat', 3],
    ['seed|Mughal Empire', 'seed|Second Battle of Panipat', 3],
    ['seed|Mughal Empire', 'seed|Maratha Empire', 3],
    ['seed|Mughal Empire', 'seed|Battle of Plassey', 2],
    ['seed|Maratha Empire', 'seed|Third Battle of Panipat', 3],
    ['seed|Battle of Plassey', 'seed|Battle of Buxar', 3],
    ['seed|Anglo-Mysore Wars', 'seed|Anglo-Maratha Wars', 2],
    ['seed|First Anglo-Sikh War', 'seed|Second Anglo-Sikh War', 3],
    ['seed|Battle of Plassey', 'seed|Anglo-Mysore Wars', 2],
    ['seed|Sino-Indian War', 'seed|Indo-Pakistani War of 1965', 2],
    ['seed|Indo-Pakistani War of 1965', 'seed|Bangladesh Liberation War', 2],
    ['seed|Kargil War', 'seed|Sino-Indian War', 2],
    ['seed|Green Revolution', 'seed|Five-Year Plans (India)', 2],
    ['seed|Operation Flood', 'seed|Green Revolution', 2],
    ['seed|Economic liberalisation in India', 'seed|Demonetisation in India', 2],
    ['seed|Goods and Services Tax (India)', 'seed|Economic liberalisation in India', 2],
    ['seed|Reserve Bank of India', 'seed|Bank nationalisation in India', 2],
    ['seed|Chandrayaan-1', 'seed|Indian Space Research Organisation', 3],
    ['seed|Chandrayaan-1', 'seed|Chandrayaan-3', 3],
    ['seed|Mangalyaan', 'seed|Indian Space Research Organisation', 3],
    ['seed|Pokhran-II', 'seed|Nuclear tests of India', 3],
    ['seed|Polio', 'seed|Smallpox', 2],
    ['seed|Olympic Games', 'seed|Neeraj Chopra', 3],
    ['seed|Olympic Games', 'seed|Abhinav Bindra', 3],
    ['seed|Olympic Games', 'seed|Mary Kom', 2],
    ['seed|Olympic Games', 'seed|Saina Nehwal', 2],
    ['seed|Olympic Games', 'seed|Asian Games', 2],
    ['seed|Olympic Games', 'seed|Khelo India', 2],
    ['seed|Cricket World Cup', 'seed|T20 World Cup', 3],
    ['seed|Cricket World Cup', 'seed|Kapil Dev', 3],
    ['seed|Cricket World Cup', 'seed|Sachin Tendulkar', 3],
    ['seed|T20 World Cup', 'seed|Sachin Tendulkar', 2],
    ['seed|Milkha Singh', 'seed|P. T. Usha', 2],
    ['seed|Sumer', 'seed|Babylon', 3],
    ['seed|Babylon', 'seed|Assyria', 3],
    ['seed|Assyria', 'seed|Phoenicia', 2],
    ['seed|Phoenicia', 'seed|Carthage', 3],
    ['seed|Ancient Egypt', 'seed|Carthage', 2],
    ['seed|Minoan civilization', 'seed|Mycenaean civilization', 3],
    ['seed|Mycenaean civilization', 'seed|Hellenistic period', 2],
    ['seed|Hittite Empire', 'seed|Assyria', 2],
    ['seed|Hittite Empire', 'seed|Ancient Egypt', 2],
    ['seed|Persian Empire', 'seed|Hellenistic period', 3],
    ['seed|Persian Empire', 'seed|Carthage', 2],
    ['seed|Persian Empire', 'seed|Sasanian Empire', 2],
    ['seed|Roman Empire', 'seed|Byzantine Empire', 3],
    ['seed|Roman Empire', 'seed|Roman Republic', 3],
    ['seed|Roman Empire', 'seed|Augustus', 3],
    ['seed|Byzantine Empire', 'seed|Justinian', 3],
    ['seed|Byzantine Empire', 'seed|Ottoman Empire', 3],
    ['seed|Justinian', 'seed|Charlemagne', 2],
    ['seed|Charlemagne', 'seed|Holy Roman Empire', 3],
    ['seed|Holy Roman Empire', 'seed|Ottoman Empire', 2],
    ['seed|Norman Conquest', 'seed|Charlemagne', 2],
    ['seed|Umayyad Caliphate', 'seed|Abbasid Caliphate', 3],
    ['seed|Abbasid Caliphate', 'seed|Islamic Golden Age', 3],
    ['seed|Umayyad Caliphate', 'seed|Ottoman Empire', 2],
    ['seed|Crusades', 'seed|Byzantine Empire', 3],
    ['seed|Crusades', 'seed|Ottoman Empire', 2],
    ['seed|Mongol Empire', 'seed|Genghis Khan', 3],
    ['seed|Mongol Empire', 'seed|Huns', 2],
    ['seed|Hundred Years\u2019 War', 'seed|Norman Conquest', 2],
    ['seed|Black Death', 'seed|Hundred Years\u2019 War', 2],
    ['seed|Marco Polo', 'seed|Mongol Empire', 3],
    ['seed|Age of Discovery', 'seed|Christopher Columbus', 3],
    ['seed|Age of Discovery', 'seed|Marco Polo', 2],
    ['seed|Christopher Columbus', 'seed|Ferdinand Magellan', 3],
    ['seed|Christopher Columbus', 'seed|Vasco da Gama', 2],
    ['seed|Ferdinand Magellan', 'seed|Vasco da Gama', 2],
    ['seed|Johannes Gutenberg', 'seed|Protestant Reformation', 2],
    ['seed|Martin Luther', 'seed|Protestant Reformation', 3],
    ['seed|Protestant Reformation', 'seed|Thirty Years\u2019 War', 2],
    ['seed|Mehmed', 'seed|Ottoman Empire', 3],
    ['seed|Mehmed', 'seed|Byzantine Empire', 3],
    ['seed|Suleiman', 'seed|Ottoman Empire', 3],
    ['seed|Scientific Revolution', 'seed|Isaac Newton', 3],
    ['seed|Enlightenment', 'seed|Scientific Revolution', 2],
    ['seed|Enlightenment', 'seed|French Revolution', 3],
    ['seed|French Revolution', 'seed|Napoleon', 3],
    ['seed|Napoleon', 'seed|Congress of Vienna', 3],
    ['seed|Congress of Vienna', 'seed|British East India Company', 2],
    ['seed|Industrial Revolution', 'seed|British East India Company', 3],
    ['seed|American Revolution', 'seed|French Revolution', 2],
    ['seed|American Civil War', 'seed|Abraham Lincoln', 3],
    ['seed|American Revolution', 'seed|Abraham Lincoln', 2],
    ['seed|Charles Darwin', 'seed|Industrial Revolution', 2],
    ['seed|Meiji Restoration', 'seed|Qing dynasty', 2],
    ['seed|Scramble for Africa', 'seed|British East India Company', 2],
    ['seed|World War I', 'seed|Nazism', 3],
    ['seed|World War I', 'seed|Russian Revolution', 3],
    ['seed|Russian Revolution', 'seed|Vladimir Lenin', 3],
    ['seed|Vladimir Lenin', 'seed|Joseph Stalin', 3],
    ['seed|Weimar Republic', 'seed|Nazism', 3],
    ['seed|Nazism', 'seed|Adolf Hitler', 3],
    ['seed|Adolf Hitler', 'seed|World War II', 3],
    ['seed|World War II', 'seed|Holocaust', 3],
    ['seed|World War II', 'seed|Winston Churchill', 3],
    ['seed|World War II', 'seed|Franklin D. Roosevelt', 3],
    ['seed|Joseph Stalin', 'seed|World War II', 2],
    ['seed|Mao Zedong', 'seed|Long March', 3],
    ['seed|Mao Zedong', 'seed|Cultural Revolution', 3],
    ['seed|Great Depression', 'seed|Franklin D. Roosevelt', 3],
    ['seed|Great Depression', 'seed|Weimar Republic', 2],
    ['seed|Cold War', 'seed|World War II', 3],
    ['seed|Cold War', 'seed|Marshall Plan', 3],
    ['seed|Cold War', 'seed|Korean War', 3],
    ['seed|Cold War', 'seed|Vietnam War', 3],
    ['seed|Cold War', 'seed|Berlin Wall', 3],
    ['seed|Cold War', 'seed|Cuban Missile Crisis', 3],
    ['seed|Cold War', 'seed|Space Race', 3],
    ['seed|United Nations', 'seed|World War II', 3],
    ['seed|United Nations', 'seed|Korean War', 2],
    ['seed|Marshall Plan', 'seed|European Union', 3],
    ['seed|European Union', 'seed|Cold War', 2],
    ['seed|Space Race', 'seed|Internet', 3],
    ['seed|Internet', 'seed|United Nations', 2],
    ['seed|Berlin Wall', 'seed|Dissolution of the Soviet Union', 3],
    ['seed|Dissolution of the Soviet Union', 'seed|Cold War', 3],
    ['seed|Apartheid', 'seed|Nelson Mandela', 3],
    ['seed|Civil Rights Movement', 'seed|Martin Luther King Jr.', 3],
    ['seed|Nelson Mandela', 'seed|Civil Rights Movement', 2],
    ['seed|War on Terror', 'seed|9/11 attacks', 3],
    ['seed|9/11 attacks', 'seed|United Nations', 2],
    ['seed|Arab Spring', 'seed|War on Terror', 2],
    ['seed|Vietnam War', 'seed|Civil Rights Movement', 2],
    ['seed|American Revolution', 'seed|British East India Company', 2],
    ['seed|Bimbisara', 'seed|Ajatashatru', 3],
    ['seed|Ajatashatru', 'seed|Chandragupta Maurya', 2],
    ['seed|Chandragupta Maurya', 'seed|Bindusara', 3],
    ['seed|Bindusara', 'seed|Ashoka', 3],
    ['seed|Chandragupta Maurya', 'seed|Chanakya', 3],
    ['seed|Ashoka', 'seed|Maurya Empire', 3],
    ['seed|Chandragupta Maurya', 'seed|Maurya Empire', 3],
    ['seed|Maurya Empire', 'seed|Pushyamitra Sunga', 3],
    ['seed|Pushyamitra Sunga', 'seed|Sunga Empire', 3],
    ['seed|Sunga Empire', 'seed|Gautamiputra Satakarni', 2],
    ['seed|Kujula Kadphises', 'seed|Kushan Empire', 3],
    ['seed|Kushan Empire', 'seed|Kanishka', 3],
    ['seed|Chandragupta I', 'seed|Gupta Empire', 3],
    ['seed|Chandragupta I', 'seed|Chandragupta II', 3],
    ['seed|Chandragupta II', 'seed|Skandagupta', 3],
    ['seed|Chandragupta II', 'seed|Kalidasa', 2],
    ['seed|Skandagupta', 'seed|Gupta Empire', 2],
    ['seed|Samudragupta', 'seed|Gupta Empire', 3],
    ['seed|Samudragupta', 'seed|Chandragupta I', 3],
    ['seed|Gupta Empire', 'seed|Harsha', 2],
    ['seed|Harsha', 'seed|Harsha Empire', 3],
    ['seed|Varahamihira', 'seed|Aryabhata', 3],
    ['seed|Brahmagupta', 'seed|Varahamihira', 2],
    ['seed|Bhaskara', 'seed|Brahmagupta', 2],
    ['seed|Banabhatta', 'seed|Harsha', 3],
    ['seed|Rajaraja Chola I', 'seed|Rajendra Chola', 3],
    ['seed|Rajaraja Chola I', 'seed|Chola Empire', 3],
    ['seed|Rajendra Chola', 'seed|Chola Empire', 2],
    ['seed|Pulakeshin II', 'seed|Rashtrakuta Empire', 2],
    ['seed|Narasimhavarman', 'seed|Rajaraja Chola I', 2],
    ['seed|Krishnadevaraya', 'seed|Vijayanagara Empire', 3],
    ['seed|Harihara', 'seed|Bukka', 3],
    ['seed|Harihara', 'seed|Vijayanagara Empire', 3],
    ['seed|Bukka', 'seed|Vijayanagara Empire', 2],
    ['seed|Delhi Sultanate', 'seed|Iltutmish', 3],
    ['seed|Iltutmish', 'seed|Razia Sultana', 3],
    ['seed|Razia Sultana', 'seed|Balban', 2],
    ['seed|Balban', 'seed|Alauddin Khilji', 2],
    ['seed|Alauddin Khilji', 'seed|Delhi Sultanate', 3],
    ['seed|Alauddin Khilji', 'seed|Muhammad bin Tughlaq', 3],
    ['seed|Muhammad bin Tughlaq', 'seed|Firoz Shah Tughlaq', 3],
    ['seed|Firoz Shah Tughlaq', 'seed|Delhi Sultanate', 2],
    ['seed|Timur', 'seed|Muhammad bin Tughlaq', 2],
    ['seed|Timur', 'seed|Mongol Empire', 2],
    ['seed|Ibrahim Lodi', 'seed|Delhi Sultanate', 2],
    ['seed|Babur', 'seed|Ibrahim Lodi', 3],
    ['seed|Babur', 'seed|First Battle of Panipat', 3],
    ['seed|Babur', 'seed|Mughal Empire', 3],
    ['seed|Babur', 'seed|Humayun', 3],
    ['seed|Humayun', 'seed|Akbar', 3],
    ['seed|Humayun', 'seed|Second Battle of Panipat', 2],
    ['seed|Akbar', 'seed|Mughal Empire', 3],
    ['seed|Akbar', 'seed|Maharana Pratap', 3],
    ['seed|Akbar', 'seed|Battle of Haldighati', 3],
    ['seed|Akbar', 'seed|Jahangir', 3],
    ['seed|Jahangir', 'seed|Nur Jahan', 3],
    ['seed|Jahangir', 'seed|Shah Jahan', 3],
    ['seed|Shah Jahan', 'seed|Mughal Empire', 2],
    ['seed|Mughal Empire', 'seed|Bahadur Shah Zafar', 2],
    ['seed|Hemu', 'seed|Second Battle of Panipat', 3],
    ['seed|Hemu', 'seed|Mughal Empire', 2],
    ['seed|Balaji Vishwanath', 'seed|Maratha Empire', 3],
    ['seed|Balaji Vishwanath', 'seed|Bajirao I', 3],
    ['seed|Bajirao I', 'seed|Maratha Empire', 3],
    ['seed|Bajirao I', 'seed|Madhavrao', 2],
    ['seed|Madhavrao', 'seed|Mahadji Scindia', 2],
    ['seed|Mahadji Scindia', 'seed|Maratha Empire', 2],
    ['seed|Nana Saheb', 'seed|Revolt of 1857', 3],
    ['seed|Tantia Tope', 'seed|Revolt of 1857', 3],
    ['seed|Tantia Tope', 'seed|Nana Saheb', 3],
    ['seed|Ramananda', 'seed|Kabir', 3],
    ['seed|Kabir', 'seed|Tulsidas', 3],
    ['seed|Tulsidas', 'seed|Mirabai', 2],
    ['seed|Vallabhacharya', 'seed|Mirabai', 2],
    ['seed|Guru Nanak', 'seed|Guru Ramdas', 3],
    ['seed|Guru Ramdas', 'seed|Guru Arjan', 3],
    ['seed|Guru Arjan', 'seed|Guru Tegh Bahadur', 3],
    ['seed|Mahatma Phule', 'seed|Savitribai Phule', 3],
    ['seed|Mahatma Phule', 'seed|Indian independence movement', 2],
    ['seed|Surendranath Banerjee', 'seed|Indian National Congress', 3],
    ['seed|Madan Mohan Malaviya', 'seed|Indian National Congress', 2],
    ['seed|Chandra Shekhar Azad', 'seed|Bhagat Singh', 3],
    ['seed|Sukhdev', 'seed|Bhagat Singh', 3],
    ['seed|Rajguru', 'seed|Bhagat Singh', 3],
    ['seed|Sri Aurobindo', 'seed|Indian independence movement', 2],
    ['seed|Swami Dayananda Saraswati', 'seed|Swami Vivekananda', 2],
    ['seed|Ramakrishna Paramahamsa', 'seed|Swami Vivekananda', 3],
    ['seed|Cyrus the Great', 'seed|Persian Empire', 3],
    ['seed|Darius', 'seed|Persian Empire', 3],
    ['seed|Cyrus the Great', 'seed|Darius', 3],
    ['seed|Nebuchadnezzar', 'seed|Babylon', 3],
    ['seed|Pericles', 'seed|Athens', 3],
    ['seed|Socrates', 'seed|Plato', 3],
    ['seed|Socrates', 'seed|Pericles', 2],
    ['seed|Plato', 'seed|Athens', 2],
    ['seed|Homer', 'seed|Mycenaean civilization', 2],
    ['seed|Hannibal', 'seed|Carthage', 3],
    ['seed|Scipio Africanus', 'seed|Hannibal', 3],
    ['seed|Spartacus', 'seed|Roman Republic', 2],
    ['seed|Marcus Aurelius', 'seed|Roman Empire', 3],
    ['seed|Constantine', 'seed|Roman Empire', 3],
    ['seed|Constantine', 'seed|Byzantine Empire', 3],
    ['seed|Prophet Muhammad', 'seed|Umayyad Caliphate', 3],
    ['seed|Harun al-Rashid', 'seed|Abbasid Caliphate', 3],
    ['seed|Saladin', 'seed|Crusades', 3],
    ['seed|William the Conqueror', 'seed|Norman Conquest', 3],
    ['seed|Richard the Lionheart', 'seed|Crusades', 3],
    ['seed|Richard the Lionheart', 'seed|William the Conqueror', 2],
    ['seed|Kublai Khan', 'seed|Mongol Empire', 3],
    ['seed|Kublai Khan', 'seed|Marco Polo', 3],
    ['seed|Ibn Sina', 'seed|Islamic Golden Age', 3],
    ['seed|Al-Biruni', 'seed|Mahmud of Ghazni', 3],
    ['seed|Al-Biruni', 'seed|Islamic Golden Age', 2],
    ['seed|Leonardo da Vinci', 'seed|Michelangelo', 3],
    ['seed|Leonardo da Vinci', 'seed|Scientific Revolution', 2],
    ['seed|Michelangelo', 'seed|Age of Discovery', 2],
    ['seed|William Shakespeare', 'seed|Elizabethan era', 2],
    ['seed|Copernicus', 'seed|Scientific Revolution', 3],
    ['seed|Galileo Galilei', 'seed|Copernicus', 3],
    ['seed|Galileo Galilei', 'seed|Scientific Revolution', 3],
    ['seed|Isaac Newton', 'seed|Galileo Galilei', 2],
    ['seed|Voltaire', 'seed|Enlightenment', 3],
    ['seed|Rousseau', 'seed|Enlightenment', 3],
    ['seed|Voltaire', 'seed|Rousseau', 3],
    ['seed|Adam Smith', 'seed|Industrial Revolution', 2],
    ['seed|Bismarck', 'seed|Unification of Germany', 2],
    ['seed|Queen Victoria', 'seed|British East India Company', 2],
    ['seed|Queen Victoria', 'seed|Mughal Empire', 2],
    ['seed|Garibaldi', 'seed|Unification of Italy', 2],
    ['seed|Karl Marx', 'seed|Industrial Revolution', 2],
    ['seed|John F. Kennedy', 'seed|Cold War', 3],
    ['seed|John F. Kennedy', 'seed|Cuban Missile Crisis', 3],
    ['seed|Rosa Parks', 'seed|Civil Rights Movement', 3],
    ['seed|Rosa Parks', 'seed|Martin Luther King Jr.', 3],
    ['seed|Mikhail Gorbachev', 'seed|Dissolution of the Soviet Union', 3],
    ['seed|Mikhail Gorbachev', 'seed|Cold War', 3],
    ['seed|Ronald Reagan', 'seed|Cold War', 3],
    ['seed|Ronald Reagan', 'seed|Mikhail Gorbachev', 3],
    ['seed|Margaret Thatcher', 'seed|Cold War', 2],
    ['seed|Deng Xiaoping', 'seed|Cultural Revolution', 2],
    ['seed|Lee Kuan Yew', 'seed|Cold War', 2],
    ['seed|Xi Jinping', 'seed|War on Terror', 2],
    ['seed|Maharishi Patanjali', 'seed|Panini', 2],
    ['seed|Magadha', 'seed|Bimbisara', 3],
    ['seed|Magadha', 'seed|Ajatashatru', 3],
    ['seed|Magadha', 'seed|Gautama Buddha', 3],
    ['seed|Magadha', 'seed|Mahavira', 2],
    ['seed|Mahajanapadas', 'seed|Magadha', 3],
    ['seed|Mahajanapadas', 'seed|Gautama Buddha', 2],
    ['seed|Srinivasa Ramanujan', 'seed|C V Raman', 2],
    ['seed|Srinivasa Ramanujan', 'seed|Aryabhata', 2],
    ['seed|Raja Ram Mohan Roy', 'seed|Ishwar Chandra Vidyasagar', 3],
    ['seed|Raja Ram Mohan Roy', 'seed|Indian independence movement', 2],
    ['seed|Ishwar Chandra Vidyasagar', 'seed|Swami Vivekananda', 2],
    ['seed|Chittaranjan Das', 'seed|Indian National Congress', 3],
    ['seed|Motilal Nehru', 'seed|Jawaharlal Nehru', 3],
    ['seed|Motilal Nehru', 'seed|Indian National Congress', 2],
    ['seed|Maulana Abul Kalam Azad', 'seed|Indian National Congress', 2],
    ['seed|Maulana Abul Kalam Azad', 'seed|Partition of India', 2],
    ['seed|Muhammad Iqbal', 'seed|Mohammad Ali Jinnah', 3],
    ['seed|Muhammad Iqbal', 'seed|Partition of India', 2],
    ['seed|Shyama Prasad Mukherjee', 'seed|Partition of India', 2],
    ['seed|Vinoba Bhave', 'seed|Mahatma Gandhi', 3],
    ['seed|Vinoba Bhave', 'seed|Jayaprakash Narayan', 3],
    ['seed|Jayaprakash Narayan', 'seed|Indian National Congress', 2],
    ['seed|Periyar', 'seed|C. N. Annadurai', 3],
    ['seed|C. N. Annadurai', 'seed|K. Kamaraj', 3],
    ['seed|Narayana Guru', 'seed|Periyar', 2],
    ['seed|Jagadish Chandra Bose', 'seed|C V Raman', 3],
    ['seed|Jagadish Chandra Bose', 'seed|Srinivasa Ramanujan', 2],
    ['seed|Meghnad Saha', 'seed|Jagadish Chandra Bose', 2],
    ['seed|Vikram Sarabhai', 'seed|Homi Bhabha', 3],
    ['seed|Vikram Sarabhai', 'seed|Indian Space Research Organisation', 3],
    ['seed|Homi Bhabha', 'seed|Nuclear power in India', 3],
    ['seed|A. P. J. Abdul Kalam', 'seed|Indian Space Research Organisation', 2],
    ['seed|A. P. J. Abdul Kalam', 'seed|Pokhran-II', 2],
    ['seed|Salim Ali', 'seed|Gir', 2],
    ['seed|Prafulla Chandra Ray', 'seed|Jagadish Chandra Bose', 2],
    ['seed|Subramania Bharati', 'seed|Indian independence movement', 2],
    ['seed|Ram Prasad Bismil', 'seed|Bhagat Singh', 3],
    ['seed|Ram Prasad Bismil', 'seed|Chandra Shekhar Azad', 3],
    ['seed|Birsa Munda', 'seed|Indian independence movement', 2],
    ['seed|Bahadur Shah I', 'seed|Shah Alam II', 3],
    ['seed|Shah Alam II', 'seed|British East India Company', 3],
    ['seed|Shah Alam II', 'seed|Battle of Buxar', 3],
    ['seed|Shah Alam II', 'seed|Battle of Plassey', 2],
    ['seed|Baji Rao II', 'seed|Anglo-Maratha Wars', 3],
    ['seed|Dara Shikoh', 'seed|Mughal Empire', 3],
    ['seed|Joan of Arc', 'seed|Hundred Years\u2019 War', 3],
    ['seed|Raphael', 'seed|Leonardo da Vinci', 3],
    ['seed|Raphael', 'seed|Michelangelo', 3],
    ['seed|Kepler', 'seed|Galileo Galilei', 3],
    ['seed|Kepler', 'seed|Copernicus', 3],
    ['seed|Sigmund Freud', 'seed|Enlightenment', 2]
  ];
  var linkMap = {};
  for (var li of links) linkMap[li.a + '\u0000' + li.b] = li.w;
  var addedManual = 0;
  for (var ml of MANUAL_LINKS) {
    var mk = ml[0] + '\u0000' + ml[1];
    var prev = linkMap[mk] || 0;
    if (ml[2] > prev) { linkMap[mk] = ml[2]; if (!prev) addedManual++; }
  }
  links = Object.keys(linkMap).map(function (k) {
    var sp = k.split('\u0000');
    return { a: sp[0], b: sp[1], w: linkMap[k] };
  });
  links.sort(function (x, y) { return y.w - x.w; });

  var out = { builtAt: new Date().toISOString(), eras: ERAS, nodes: nodes, links: links };
  fs.writeFileSync(OUT, JSON.stringify(out));
  var withSpan = nodes.filter(function (n) { return n.span; }).length;
  console.log('Wrote ' + OUT);
  console.log('nodes: ' + nodes.length + ' (with time span: ' + withSpan + ', ' + (withSpan / nodes.length * 100).toFixed(1) + '%)');
  var totalSeeds = 0;
  var seedTypeCounts = {};
  for (var gk of Object.keys(SEED)) { totalSeeds += SEED[gk].list.length; seedTypeCounts[SEED[gk].type] = (seedTypeCounts[SEED[gk].type] || 0) + SEED[gk].list.length; }
  console.log('seed entities: ' + totalSeeds + ' across ' + JSON.stringify(seedTypeCounts));
  console.log('links: ' + links.length + ' (manual added: ' + addedManual + ', top: ' + links.slice(0, 5).map(function (l) { return l.a.replace('seed|', '') + '↔' + l.b.replace('seed|', '') + ':' + l.w; }).join(', ') + ')');
}

main();

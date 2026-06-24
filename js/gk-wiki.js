var WIKI = {};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

WIKI._seenTitles = [];
WIKI._seenValues = [];
WIKI._pool = [];
WIKI._poolSize = 100;
WIKI._prefetching = false;
WIKI._sourceIndex = 0;

WIKI._genericFallback = [
  'India', 'China', 'United States', 'United Kingdom', 'Russia', 'Japan', 'Brazil', 'France', 'Germany', 'Australia',
  'Asia', 'Africa', 'Europe', 'South America', 'North America',
  'Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad',
  'Ganga', 'Yamuna', 'Brahmaputra', 'Godavari', 'Krishna', 'Kaveri', 'Narmada', 'Indus',
  'Himalayas', 'Western Ghats', 'Eastern Ghats', 'Thar Desert', 'Deccan Plateau',
  'Cricket', 'Football', 'Hockey', 'Tennis', 'Badminton', 'Kabaddi', 'Volleyball', 'Wrestling',
  'Bollywood', 'Hollywood', 'Tollywood', 'Kollywood', 'Sandalwood', 'Marathi cinema',
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Geology', 'Economics', 'Psychology',
  'Supreme Court', 'Parliament', 'High Court', 'Election Commission', 'Lok Sabha', 'Rajya Sabha', 'Cabinet',
  '1947', '1950', '1962', '1971', '1991', '1998', '2000', '2014', '2016', '2019',
  'Gandhi', 'Nehru', 'Patel', 'Ambedkar', 'Bose', 'Shastri', 'Vajpayee', 'Modi',
  'Linux', 'Windows', 'macOS', 'Android', 'iOS', 'Python', 'C++', 'JavaScript',
  'Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Samsung',
  'United Nations', 'WHO', 'IMF', 'World Bank', 'UNESCO', 'UNICEF', 'NATO', 'WTO', 'SAARC', 'BRICS',
  'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Jaipur', 'Lucknow', 'Chandigarh', 'Bhopal',
  'Summer', 'Winter', 'Spring', 'Autumn', 'Monsoon',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Red', 'Blue', 'Green', 'Yellow', 'White', 'Black', 'Orange', 'Purple',
  'World War I', 'World War II', 'Cold War', 'Industrial Revolution', 'Renaissance',
  'President', 'Prime Minister', 'Governor', 'Chief Minister', 'Speaker', 'Chief Justice',
  'Football World Cup', 'Olympics', 'Asian Games', 'Commonwealth Games', 'Cricket World Cup', 'T20 World Cup'
];

// Type-specific distractor pools for same-category options
WIKI._distractorTypes = {
  person: ['Gandhi', 'Nehru', 'Patel', 'Ambedkar', 'Bose', 'Shastri', 'Vajpayee', 'Modi',
    'Newton', 'Einstein', 'Shakespeare', 'Plato', 'Aristotle', 'Buddha', 'Alexander', 'Caesar',
    'Napoleon', 'Lincoln', 'Washington', 'Churchill', 'Mandela', 'Raman', 'Tagore', 'Teresa',
    'Bhabha', 'Kalam', 'Sachin', 'Lata', 'Premchand', 'Vivekananda', 'Ramanujan', 'Aryabhata',
    'Chanakya', 'Ashoka', 'Akbar', 'Shivaji', 'Tipu', 'Lakshmibai', 'Bhagat Singh', 'Tilak',
    'Indira', 'Rajiv', 'Kohli', 'Dhoni', 'Tendulkar', 'Messi', 'Ronaldo', 'Pele', 'Federer', 'Bolt',
    'Mirabai', 'Kabir', 'Tulsidas', 'Aurobindo', 'Radhakrishnan', 'Susruta', 'Charaka',
    'President', 'Prime Minister', 'Governor', 'Chief Minister', 'Speaker', 'Chief Justice'],
  place: ['India', 'China', 'United States', 'United Kingdom', 'Russia', 'Japan', 'Brazil',
    'France', 'Germany', 'Australia', 'Canada', 'Italy', 'Spain', 'South Korea', 'Indonesia',
    'Bangladesh', 'Pakistan', 'Nepal', 'Sri Lanka', 'Egypt', 'South Africa', 'Nigeria',
    'Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad',
    'London', 'Paris', 'New York', 'Tokyo', 'Beijing', 'Berlin', 'Rome', 'Moscow', 'Sydney',
    'Ganga', 'Yamuna', 'Brahmaputra', 'Godavari', 'Krishna', 'Kaveri', 'Narmada', 'Indus',
    'Nile', 'Amazon', 'Yangtze', 'Mississippi', 'Danube', 'Himalayas', 'Western Ghats',
    'Thar Desert', 'Deccan Plateau', 'Alps', 'Andes', 'Rockies', 'Everest', 'K2',
    'Asia', 'Africa', 'Europe', 'South America', 'North America', 'Bay of Bengal',
    'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arabian Sea', 'Mediterranean'],
  org: ['United Nations', 'WHO', 'IMF', 'World Bank', 'UNESCO', 'UNICEF', 'NATO', 'WTO',
    'SAARC', 'BRICS', 'European Union', 'African Union', 'ASEAN', 'OPEC',
    'ISRO', 'NASA', 'DRDO', 'BARC', 'Supreme Court', 'Parliament', 'Election Commission',
    'RBI', 'SEBI', 'NITI Aayog', 'UPSC', 'AIIMS', 'IIT', 'IIM',
    'Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Samsung'],
  event: ['World War I', 'World War II', 'Cold War', 'Industrial Revolution', 'Renaissance',
    'French Revolution', 'American Revolution', 'Russian Revolution', 'Green Revolution',
    'Battle of Plassey', 'Battle of Panipat', 'Jallianwala Bagh',
    'Quit India', 'Salt March', 'Kargil War', 'Gulf War', 'Vietnam War'],
  concept: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Geology',
    'Economics', 'Psychology', 'Sociology', 'Philosophy', 'History', 'Geography',
    'Democracy', 'Communism', 'Socialism', 'Capitalism', 'Secularism'],
  living: ['Tiger', 'Lion', 'Elephant', 'Peacock', 'Eagle', 'Shark', 'Whale', 'Dolphin',
    'Python', 'Cobra', 'Rose', 'Lotus', 'Sandalwood', 'Neem', 'Banyan', 'Peepal'],
  work: ['Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Vedas', 'Upanishads', 'Arthashastra',
    'Godan', 'Gitanjali', 'Guide', 'Malgudi Days', 'Harry Potter', '1984', 'Animal Farm'],
  year: ['1947', '1950', '1962', '1971', '1991', '1998', '2000', '2014', '2016', '2019']
};
WIKI._seenTypes = {};

// Topic banks — each maps to a Wikipedia category for bulk fetching
WIKI._categoryTopics = [
  'Category:Indian_civilisation', 'Category:World_history', 'Category:Science',
  'Category:Technology', 'Category:Geography', 'Category:Culture',
  'Category:Indian_politics', 'Category:Indian_economy', 'Category:Sports',
  'Category:Indian_literature', 'Category:Indian_music', 'Category:Indian_dance',
  'Category:Indian_festivals', 'Category:Indian_temples', 'Category:Indian_monuments',
  'Category:Indian_Nobel_laureates', 'Category:Indian_scientists',
  'Category:Ancient_India', 'Category:Medieval_India', 'Category:Modern_India',
  'Category:World_War_II', 'Category:United_Nations', 'Category:Climate_change',
  'Category:Computer_science', 'Category:Physics', 'Category:Chemistry', 'Category:Biology',
  'Category:Astronomy', 'Category:Mathematics', 'Category:Economics',
  'Category:Indian_rivers', 'Category:Himalayas', 'Category:National_parks_of_India',
  'Category:Indian_agriculture', 'Category:Indian_space_program',
  'Category:Olympics', 'Category:Cricket', 'Category:Football',
  'Category:Indian_constitution', 'Category:Indian_judiciary',
  'Category:Indian_government', 'Category:Indian_defence',
  'Category:Indian_education', 'Category:Bollywood',
  'Category:Indian_authors', 'Category:Indian_art', 'Category:Indian_philosophy',
  'Category:Indian_mythology', 'Category:World_geography', 'Category:World_politics',
  'Category:Nobel_laureates', 'Category:Natural_disasters',
  'Category:Renewable_energy', 'Category:Artificial_intelligence', 'Category:Robotics',
  'Category:Indian_railways', 'Category:Indian_armed_forces', 'Category:Indian_foreign_relations',
  'Category:Indian_nuclear_program', 'Category:Indian_companies',
  'Category:Indian_writers', 'Category:Indian_poets', 'Category:Indian_film_directors',
  'Category:Indian_actors', 'Category:Indian_singers', 'Category:Indian_entrepreneurs',
  'Category:Ancient_Egypt', 'Category:Ancient_Greece', 'Category:Roman_Empire',
  'Category:Mughal_Empire', 'Category:Maratha_Empire', 'Category:British_Empire',
  'Category:Indian_languages', 'Category:Indian_religions', 'Category:Indian_textiles',
  'Category:Indian_cuisine', 'Category:Indian_wildlife', 'Category:Indian_coastal_geography',
  'Category:Indian_astronomy', 'Category:Indian_medicine', 'Category:Indian_meteorology',
  'Category:Human_body', 'Category:Animal_biology', 'Category:Plant_biology',
  'Category:Nobel_Peace_Prize_laureates', 'Category:Nobel_Prize_in_Physics',
  'Category:Nobel_Prize_in_Chemistry', 'Category:Nobel_Prize_in_Physiology_or_Medicine',
  'Category:Indian_Olympic_medalists', 'Category:Indian_cricketers',
  'Category:UNESCO_World_Heritage_Sites_in_India', 'Category:Indian_newspapers',
  'Category:Environmental_issues_in_India', 'Category:Indian_law',
  'Category:Indian_philanthropists', 'Category:Indian_architects',
  'Category:Indian_mathematicians', 'Category:Indian_physicists', 'Category:Indian_chemists',
  'Category:Indian_biologists', 'Category:Indian_engineers',
  'Category:Indian_classical_musicians', 'Category:Indian_folk_music',
  'Category:Indian_classical_dancers', 'Category:Indian_sculptors',
  'Category:Indian_painters', 'Category:Indian_photographers'
];

WIKI._buildOpts = function(correct, entityType) {
  var distractors = [];
  var pool = [];

  // Prefer same-type distractors
  if (entityType && WIKI._distractorTypes[entityType]) {
    pool = pool.concat(WIKI._distractorTypes[entityType]);
  }
  for (var t in WIKI._seenTypes) {
    if (WIKI._seenTypes[t] === entityType) pool.push(t);
  }
  pool = pool.concat(WIKI._seenTitles).concat(WIKI._seenValues).concat(WIKI._genericFallback);

  var shuffled = pool.slice().sort(function() { return Math.random() - 0.5; });
  for (var i = 0; i < shuffled.length && distractors.length < 3; i++) {
    if (String(shuffled[i]) !== String(correct) && distractors.indexOf(shuffled[i]) < 0) {
      distractors.push(shuffled[i]);
    }
  }
  while (distractors.length < 3) {
    distractors.push('None');
  }
  var opts = [correct].concat(distractors);
  opts.sort(function() { return Math.random() - 0.5; });
  return opts;
};

WIKI._examTopics = ['India history','Geography of India','Indian Constitution','Indian economy','Indian culture','Indian art','Indian literature','Indian music','Indian dance','Indian architecture','Physics','Chemistry','Biology','World history','United Nations','Climate change','Computer science','Indian astronomy','Indian mathematics','Indian philosophy','Indian independence movement','Indian freedom fighters','World wars','Indian scientists','Indian Nobel laureates','Indian rivers','Himalayas','Indian agriculture','Indian defence','Indian space program','Indian democracy','Indian elections','Indian government','Indian judiciary','Indian education','Indian tribes','Biodiversity','Indian national parks','Indian states','Indian dance forms','Indian music instruments','Indian festivals','Indian temples','Indian monuments','Indian literature works','Indian authors','Indian sports','Olympics'];

WIKI.randomQuestion = function() {
  return WIKI._batchRandom(10);
};

WIKI._batchRandom = function(count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=random&rnlimit=' + count + '&rnnamespace=0&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.random;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && !/^Outline of/i.test(t) && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchRandom failed:', e); return []; });
};

WIKI._batchCategory = function(category, count) {
  var cat = category.indexOf('Category:') === 0 ? category : 'Category:' + category;
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + encodeURIComponent(cat) + '&cmlimit=' + count + '&cmtype=page&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.categorymembers;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchCategory failed:', e); return []; });
};

WIKI._batchRecentChanges = function(count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rcprop=title&rclimit=' + count + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.recentchanges;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchRecentChanges failed:', e); return []; });
};

WIKI._batchSummaries = function(titles) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&exintro&explaintext&exlimit=max&titles=' + encodeURIComponent(titles.join('|')) + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.pages;
      if (!pages) return [];
      var results = [];
      for (var id in pages) {
        var p = pages[id];
        if (!p || !p.title || id === '-1') continue;
        if (!p.description || p.description.length < 5) continue;
        var extract = (p.extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (extract.length < 60) continue;
        var qs = WIKI._makeQuestions({ title: p.title, extract: extract, description: p.description || '' });
        for (var qi = 0; qi < qs.length; qi++) results.push(qs[qi]);
      }
      return results;
    })
    .catch(function(e) { console.error('[WIKI] _batchSummaries failed:', e); return []; });
};

WIKI._batchSearch = function(topic, count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(topic) + '&srlimit=' + count + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.search;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) { return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t); });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchSearch failed:', e); return []; });
};

WIKI.searchQuestion = function() {
  var topic = pick(WIKI._examTopics);
  return WIKI._batchSearch(topic, 10);
};

WIKI.onThisDay = function(dateStr) {
  var parts = dateStr.split('-');
  if (parts.length !== 3) return Promise.resolve([]);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  return fetch('https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/' + month + '/' + day)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var events = data.events || [];
      var births = data.births || [];
      var deaths = data.deaths || [];
      if (events.length === 0 && births.length === 0 && deaths.length === 0) return [];
      var items = [];
      for (var i = 0; i < Math.min(events.length, 20); i++) {
        items.push({ type: 'event', year: events[i].year, text: events[i].text, pages: events[i].pages || [] });
      }
      for (var i = 0; i < Math.min(births.length, 10); i++) {
        items.push({ type: 'birth', year: births[i].year, text: births[i].text, pages: births[i].pages || [] });
      }
      for (var i = 0; i < Math.min(deaths.length, 10); i++) {
        items.push({ type: 'death', year: deaths[i].year, text: deaths[i].text, pages: deaths[i].pages || [] });
      }
      return items;
    })
    .catch(function(e) { console.error('[WIKI] onThisDay failed:', e); return []; });
};

WIKI._loadKnown = function() {
  if (WIKI._known) return;
  WIKI._known = {};
  function add(arr) {
    if (arr && arr.length) {
      for (var i = 0; i < arr.length; i++) {
        WIKI._known[String(arr[i]).toLowerCase().trim()] = true;
      }
    }
  }
  if (typeof GK_DISTRACTORS !== 'undefined') {
    for (var k in GK_DISTRACTORS) add(GK_DISTRACTORS[k]);
  }
  add(WIKI._genericFallback);
};

WIKI._isKnown = function(entity) {
  if (!entity) return false;
  var e = String(entity).toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  if (!e) return false;
  if (WIKI._known && WIKI._known[e]) return true;
  var words = e.split(/\s+/);
  var lastWord = words.length > 1 ? words[words.length - 1] : '';
  if (lastWord && lastWord.length > 3 && WIKI._known[lastWord]) return true;
  for (var k in WIKI._known) {
    if (k.length > 3 && e.indexOf(k) >= 0) {
      if (k.indexOf(' ') > 0) return true;
      if (k.length > 6) return true;
    }
    if (e.length > 3 && k.indexOf(e) >= 0) return true;
  }
  return false;
};

WIKI.prefetch = function() {
  if (WIKI._prefetching) { console.log('[WIKI] already prefetching'); return; }
  WIKI._prefetching = true;
  WIKI._loadKnown();
  console.log('[WIKI] prefetch started, pool size:', WIKI._pool.length);

  function fetchBatch() {
    var poolFull = WIKI._pool.length >= WIKI._poolSize;
    if (poolFull) { setTimeout(fetchBatch, 500); return; }

    WIKI._sourceIndex = (WIKI._sourceIndex + 1) % 4;

    var promise;
    if (WIKI._sourceIndex === 0) {
      var topic = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(topic, 20);
    } else if (WIKI._sourceIndex === 1) {
      promise = WIKI._batchRandom(20);
    } else if (WIKI._sourceIndex === 2) {
      var cat = pick(WIKI._categoryTopics);
      promise = WIKI._batchCategory(cat, 20);
    } else {
      promise = WIKI._batchRecentChanges(20);
    }

    promise.then(function(qs) {
      if (qs && qs.length) {
        for (var i = 0; i < qs.length && WIKI._pool.length < WIKI._poolSize; i++) {
          WIKI._pool.push(qs[i]);
        }
      }
      setTimeout(fetchBatch, 500);
    }).catch(function() { console.error('[WIKI] fetchBatch failed, retrying...'); setTimeout(fetchBatch, 1000); });
  }

  function fetchOnThisDay() {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var todayKey = now.getFullYear() + '-' + m + '-' + d;
    WIKI.onThisDay(todayKey).then(function(items) {
      if (items && items.length) {
        var otdQuestions = WIKI._makeFromOnThisDay(items);
        for (var i = 0; i < otdQuestions.length; i++) {
          if (WIKI._pool.length < WIKI._poolSize * 2) WIKI._pool.push(otdQuestions[i]);
        }
      }
    }).catch(function() {});
  }

  fetchOnThisDay();
  WIKI.prefetchCurrentEvents();
  fetchBatch();
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._entityType = function(desc, firstSentence) {
  var c = (desc + ' ' + firstSentence).toLowerCase();
  if (/(was a|was an|born|died|known for|scientist|politician|author|actor|artist|musician|philosopher|king |queen |leader|engineer|physicist|chemist|biologist|mathematician|poet|writer|novelist|painter|sculptor|composer|singer|dancer|inventor|explorer|entrepreneur|philanthropist|reformer|activist|freedom fighter|guru|saint|prime minister|president |governor|chief minister|minister|judge|lawyer|doctor|surgeon|nobel laureate|athlete|cricketer|footballer|sportsman|sportswoman|general|admiral|marshal|chief)/.test(c)) return 'person';
  if (/(country|city|town|village|state|province|region|island|river|mountain|lake|ocean|sea|capital|located in|situated in|flows through|lies in|peninsula|bay|gulf|desert|plateau|valley|continent|archipelago|delta|strait|canyon|basin|border|zone|plain|hill)/.test(c)) return 'place';
  if (/(organization|company|agency|institute|university|college|committee|commission|bureau|council|board|fund|bank|party|association|society|ministry|department|corporation|firm|foundation|centre|center|mission|programme|program|initiative|authority|forum|group|club|union|league)/.test(c)) return 'org';
  if (/(war|battle|conflict|revolution|movement|disaster|earthquake|flood|storm|pandemic|epidemic|treaty|conference|summit|festival|event|incident|accident|invasion|rebellion|uprising|campaign|expedition|crusade|siege|massacre|genocide|holocaust|famine|drought|tsunami|hurricane|tornado|explosion|attack)/.test(c)) return 'event';
  if (/(species|genus|mammal|bird|fish|insect|reptile|amphibian|plant|tree|flower|animal|organism|fungus|bacteria|virus|breed|variety|cultivar)/.test(c)) return 'living';
  if (/(book|novel|poem|play|film|movie|painting|sculpture|song|album|article|essay|story|literature|work|composition|biography|autobiography|memoir)/.test(c)) return 'work';
  if (/(is a|refers to|concept|theory|principle|law|effect|phenomenon|process|method|technique|system|field|branch|discipline|science|art|practice)/.test(c)) return 'concept';
  return 'other';
};

WIKI._ARTICLE_WORDS = { 'a':1, 'an':1, 'the':1, 'and':1, 'of':1, 'in':1, 'for':1, 'on':1, 'at':1, 'by':1, 'to':1, 'from':1, 'with':1 };

WIKI._makeQuestions = function(data) {
  var title = data.title;
  var extract = (data.extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  var desc = data.description || '';
  var lower = extract.toLowerCase();
  var allSentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var firstSentence = extract;
  for (var fsi = 0; fsi < allSentences.length; fsi++) {
    if (allSentences[fsi].trim().length >= 20) { firstSentence = allSentences[fsi].trim(); break; }
  }

  if (extract.length < 120) return [];
  if (title.length > 60) return [];
  if (/^Outline of/i.test(title)) return [];
  if (/^(List of|Timeline of)/i.test(title)) return [];

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 200) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];

  var factSentences = [title];
  if (desc) factSentences.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 15); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factSentences.join('. ').length + sf.length < 3000) factSentences.push(sf);
  }
  var richFact = factSentences.join('. ');

  var results = [];
  var titleLower = title.toLowerCase();
  var entityType = WIKI._entityType(desc, firstSentence);
  WIKI._seenTypes[title] = entityType;

  function isValid(a) {
    if (!a) return false;
    var s = String(a).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length < 2 || s.length > 200) return false;
    var sl = s.toLowerCase();
    if (sl.indexOf('various') >= 0 || sl.indexOf('multiple') >= 0 || sl.indexOf('unknown') >= 0 || sl.indexOf('none') >= 0) return false;
    return true;
  }

  function pushQ(q) {
    if (!q) return;
    if (results.length >= 3) return;
    q.a = String(q.a).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!isValid(q.a)) return;
    if (q.q.toLowerCase().indexOf(q.a.toLowerCase()) >= 0) return;
    if (!WIKI._isKnown(q.a)) return;
    q._source = 'wiki';
    q._wikiCat = catName;
    results.push(q);
  }

  // — PRIORITY 1: Description-based direct question —
  // Wikipedia descriptions are clean phrases like "Indian physicist" or "River in South India"
  if (desc && desc.length >= 5 && desc.length < 120 && desc.toLowerCase().indexOf(titleLower) < 0) {
    var wh = entityType === 'person' ? 'Who' : 'What';
    var qText = wh + ' is ' + desc + '?';
    qText = qText.charAt(0).toUpperCase() + qText.slice(1);
    if (qText.length > 15 && qText.length < 130) {
      pushQ({ q: qText, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 2: Type-specific sentence extraction —
  var titleClean = title.replace(/\s*\(.*?\)/g, '').trim();
  var titleWords = title.split(/\s+/);
  var lastName = '';
  if (titleWords.length > 1) {
    var last = titleWords[titleWords.length - 1].replace(/[.,()]/g, '');
    if (last.length > 4 && !WIKI._ARTICLE_WORDS[last.toLowerCase()]) lastName = last;
  }
  var titleForms = [title, titleClean];
  if (lastName) titleForms.push(lastName);

  for (var si = 0; si < sentences.length && results.length < 3; si++) {
    var s = sentences[si].trim();
    if (s.length < 30 || s.length > 250) continue;

    var sLower = s.toLowerCase();
    var foundForm = null;
    for (var tf = 0; tf < titleForms.length; tf++) {
      if (titleForms[tf].length < 3) continue;
      if (sLower.indexOf(titleForms[tf].toLowerCase()) >= 0) { foundForm = titleForms[tf]; break; }
    }
    if (!foundForm || s.length - foundForm.length < 15) continue;

    var startIdx = sLower.indexOf(foundForm.toLowerCase());
    var before = s.substring(0, startIdx).trim();
    var after = s.substring(startIdx + foundForm.length).trim();

    if (foundForm === lastName && before.length > 0) continue;

    after = after.replace(/^\([^)]*\)\s*/, '').trim();
    after = after.replace(/^[,\s]+/, '').trim();

    var wh = 'What';
    if (entityType === 'person' || /^(was a|was an|is a|is an|born|died|known for|scientist|politician|author|actor|artist|musician|philosopher|king|queen|leader|engineer|physicist|chemist|biologist|mathematician|prime minister|president|governor|minister|judge|doctor|singer|dancer|poet|writer|nobel)/i.test(after)) {
      wh = 'Who';
    } else if (entityType === 'place' || /located in|situated in|flows|lies in|found in/i.test(after)) {
      wh = 'Where';
    } else if (entityType === 'org' || /headquartered|based in|founded|established/i.test(after)) {
      wh = 'Which organization';
    } else if (entityType === 'event' || /occurred|happened|took place|began|ended|started/i.test(after)) {
      wh = 'What';
    }

    var verbMatch = after.match(/^(is|are|was|were)\s+/i);
    var verb = verbMatch ? verbMatch[0] : '';
    var rest = after.replace(/^(is|are|was|were)\s+/i, '').trim();
    var simpleQ = wh + ' ' + verb + rest;
    simpleQ = simpleQ.replace(/\s+/g, ' ').trim();
    simpleQ = simpleQ.charAt(0).toUpperCase() + simpleQ.slice(1);
    if (simpleQ.endsWith('.')) simpleQ = simpleQ.slice(0, -1) + '?';
    else if (!simpleQ.endsWith('?')) simpleQ += '?';
    if (simpleQ.length > 20 && simpleQ.length < 130) {
      pushQ({ q: simpleQ, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 3: Birth / death year —
  if (results.length < 3) {
    var birthMatch = extract.match(/born\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    var deathMatch = extract.match(/died\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    if (birthMatch) {
      var ctx = extract.substr(Math.max(0, extract.indexOf(birthMatch[0]) - 10), birthMatch[0].length + 40);
      if (ctx.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who was born in ' + birthMatch[1] + '?', a: title, hint: 'Birth year', fact: richFact, opts: WIKI._buildOpts(title, entityType) });
      }
    }
    if (deathMatch && deathMatch[1] !== (birthMatch && birthMatch[1])) {
      var ctx2 = extract.substr(Math.max(0, extract.indexOf(deathMatch[0]) - 10), deathMatch[0].length + 40);
      if (ctx2.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who died in ' + deathMatch[1] + '?', a: title, hint: 'Death year', fact: richFact, opts: WIKI._buildOpts(title, entityType) });
      }
    }
  }

  // — PRIORITY 4: Established / founded year —
  if (results.length < 3 && years.length > 0) {
    var y = years[0];
    var verb = 'established';
    if (/founded/i.test(extract)) verb = 'founded';
    else if (/created/i.test(extract)) verb = 'created';
    var yCtx = extract.substr(Math.max(0, extract.indexOf(y) - 50), y.length + 60);
    if (yCtx.toLowerCase().indexOf(titleLower) < 0) {
      pushQ({ q: 'What was ' + verb + ' in ' + y + '?', a: title, hint: 'Founded ' + y, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 5: Location / headquartered —
  if (results.length < 3) {
    var locPatterns = [
      /(?:located|based|situated|headquartered)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    ];
    for (var lpi = 0; lpi < locPatterns.length; lpi++) {
      var lm = extract.match(locPatterns[lpi]);
      if (lm && lm[1] && lm[1].length < 60) {
        var loc = lm[1];
        var locCtx = extract.substr(Math.max(0, extract.indexOf(lm[0]) - 20), lm[0].length + 30);
        if (locCtx.toLowerCase().indexOf(titleLower) < 0) {
          pushQ({ q: 'What is headquartered in ' + loc + '?', a: title, hint: 'Location: ' + loc, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
        }
        break;
      }
    }
  }

  // — PRIORITY 6: Description blanking —
  if (results.length === 0 && desc && desc.length >= 15 && desc.length < 120) {
    var blank = '______';
    var blanked = desc.replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), blank);
    if (blanked !== desc && blanked.length > 20 && blanked.length < 150) {
      blanked = blanked.replace(/\s+/g, ' ').trim();
      pushQ({ q: blanked, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  return results;
};

WIKI._classify = function(desc, extract) {
  var l = (desc + ' ' + extract).toLowerCase();
  var cats = {
    biology: ['biology','species','plant','animal','organism','cell','genetic','evolution','ecology','bacteria','virus','protein','dna','gene','enzyme','hormone','mammal','bird','fish','insect','fungus','flower','tree','leaf','seed','root','photosynthesis','pollination','antibody','vaccine','chromosome','mitosis','meiosis','metabolism','habitat','predator','prey','ecosystem','biodiversity','conservation','extinct','endangered','ornithology','botany','zoology','mycology','entomology','marine biology','microbiology','neuroscience','anatomy','physiology'],
    chemistry: ['chemistry','chemical','element','compound','molecule','atom','reaction','acid','base','salt','oxidation','reduction','catalyst','enzyme','polymer','organic','inorganic','periodic table','isotope','ion','bond','electron','proton','neutron','ph','solution','concentration','distillation','chromatography','spectroscopy','nuclear','radioactive','alkali','halogen','noble gas','metal','nonmetal','metalloid','covalent','ionic','metallic'],
    physics: ['physics','quantum','relativity','gravity','electromagnetism','thermodynamics','nuclear','particle','wave','optics','mechanics','energy','force','motion','velocity','acceleration','momentum','angular','frequency','wavelength','amplitude','diffraction','interference','polarization','laser','photon','electron','proton','neutron','quark','lepton','boson','fermion','string theory','dark matter','dark energy','cosmology','astrophysics','plasma','superconductor','semiconductor','transistor','capacitor','inductor','resistor','circuit','voltage','current'],
    history: ['history','historical','century','ancient','medieval','modern','empire','kingdom','dynasty','revolution','war','battle','treaty','invasion','colonization','independence','civilization','archaeology','prehistoric','stone age','bronze age','iron age','renaissance','reformation','enlightenment','industrial','world war','cold war','genocide','holocaust','dictator','monarchy','republic','democracy','communism','fascism','nationalism','imperialism','colonialism','feudalism','slavery','abolition','suffrage','civil rights','apartheid','migration','nomad','barbarian','crusade','exploration','age of discovery'],
    geography: ['geography','geological','mountain','river','ocean','sea','lake','desert','forest','tundra','taiga','savanna','grassland','rainforest','coral reef','island','continent','country','capital','city','population','climate','weather','latitude','longitude','equator','tropic','arctic','antarctic','monsoon','hurricane','tornado','earthquake','volcano','tsunami','erosion','glacier','plateau','peninsula','gulf','bay','strait','isthmus','delta','archipelago','atoll','fjord','canyon','valley','plain','basin','watershed','border','province','state','region','zone'],
    culture: ['culture','art','music','dance','literature','poetry','novel','painting','sculpture','architecture','theatre','film','cinema','photography','language','religion','philosophy','mythology','folklore','tradition','festival','cuisine','fashion','craft','pottery','weaving','embroidery','calligraphy','origami','martial arts','yoga','meditation','ritual','ceremony','symbol','icon','heritage','museum','gallery','exhibition','performance','orchestra','symphony','opera','ballet','jazz','blues','rock','pop','folk','classical','modern','contemporary','abstract','realism','impressionism','cubism','surrealism'],
    technology: ['technology','computer','software','hardware','internet','digital','data','algorithm','programming','coding','database','network','cybersecurity','artificial intelligence','machine learning','robotics','automation','electronics','engineering','telecommunication','smartphone','tablet','laptop','wearable','cloud computing','blockchain','cryptocurrency','virtual reality','augmented reality','quantum computing','nanotechnology','biotechnology','renewable energy','solar','wind','hydroelectric','nuclear','battery','electric vehicle','autonomous','drone','satellite','gps','iot','5g','broadband','wifi','bluetooth','nfc','rfid','sensor','actuator','microcontroller','arduino','raspberry pi','linux','python','javascript','html','css','api','microservice','docker','kubernetes'],
    sports: ['sports','athlete','olympic','world cup','championship','tournament','league','football','cricket','hockey','tennis','badminton','kabaddi','wrestling','boxing','weightlifting','gymnastics','swimming','athletics','running','jumping','throwing','cycling','skiing','skating','surfing','sailing','rowing','canoeing','equestrian','archery','shooting','fencing','taekwondo','judo','karate','basketball','volleyball','baseball','rugby','golf','snooker','darts','chess','esports','marathon','sprint','relay','decathlon','triathlon','biathlon','coach','manager','umpire','referee','stadium','arena','pitch','court','track','field','medal','trophy'],
    polity: ['politics','government','parliament','constitution','democracy','election','president','prime minister','cabinet','minister','senate','congress','legislature','judiciary','supreme court','high court','law','bill','act','amendment','rights','fundamental','directive','federal','unitary','sovereign','socialist','secular','republic','panchayat','municipality','autonomous','commission','committee','bureau','authority','board','council','assembly','party','coalition','opposition','majority','minority','veto','impeachment','referendum','plebiscite','diplomacy','embassy','consulate','treaty','alliance','sanction','embargo','tariff','subsidy','welfare','taxation','budget','audit','ombudsman','vigilance','corruption','transparency'],
    economics: ['economics','economy','finance','banking','market','trade','commerce','industry','manufacturing','agriculture','service','gdp','growth','inflation','recession','depression','deflation','unemployment','employment','labor','wage','salary','income','wealth','poverty','inequality','tax','budget','deficit','surplus','debt','bond','stock','share','dividend','interest','rate','exchange','currency','export','import','tariff','quota','subsidy','monopoly','oligopoly','competition','regulation','deregulation','privatization','nationalization','globalization','liberalization','investment','saving','consumption','production','supply','demand','elasticity','utility','marginal','opportunity cost','comparative advantage','protectionism','fiscal','monetary','central bank','reserve','inflation targeting','cpi','wpi','purchasing power'],
    space: ['space','astronomy','astrophysics','planet','star','galaxy','moon','satellite','asteroid','comet','meteor','telescope','observatory','rocket','launch','orbit','spacecraft','astronaut','cosmonaut','space station','solar system','black hole','neutron star','supernova','nebula','constellation','exoplanet','dark matter','dark energy','big bang','cosmic','celestial','lunar','solar','martian','jovian','saturnian','uranian','neptunian','plutonian','interstellar','intergalactic','milky way','andromeda','gravity','relativity','quantum gravity','cosmology','nasa','isro','esa','roscosmos','spacex','blue origin','virgin galactic','hubble','james webb','chandrayaan','mangalyaan','gaganyaan','artemis','apollo','voyager','cassini','new horizons'],
    environment: ['environment','ecology','conservation','pollution','climate change','global warming','greenhouse gas','carbon','emission','renewable','sustainable','biodiversity','ecosystem','deforestation','reforestation','afforestation','wetland','mangrove','coral reef','endangered','extinct','national park','wildlife sanctuary','biosphere reserve','ramsar','unesco','wildlife','forestation','recycling','composting','waste management','water conservation','air quality','carbon footprint','carbon neutral','net zero','climate action','green energy','solar power','wind power','hydropower','geothermal','biomass','biofuel','electric vehicle','public transport','green building','organic farming','permaculture','agroforestry','ecotourism','environmental impact','sustainable development','sdg','unfccc','ipcc','kyoto protocol','paris agreement','montreal protocol','cbd','unep','wwf','greenpeace'],
    defence: ['defence','military','army','navy','air force','marine','soldier','weapon','missile','tank','aircraft','ship','submarine','drone','nuclear','warfare','strategy','tactics','intelligence','security','border','patrol','surveillance','reconnaissance','commando','special forces','peacekeeping','alliance','nato','joint exercise','arms','ammunition','artillery','infantry','cavalry','battalion','brigade','division','corps','commander','general','admiral','marshal','chief of staff','ministry of defence','defence budget','indigenous','manufacturing','research','laboratory','drdo','hal','bel','ordnance','shipyard','aerospace','radar','sonar','electronic warfare','cyber warfare','space defence','ballistic missile','cruise missile','interceptor','air defence','anti-tank','anti-ship','anti-submarine'],
    personalities: ['born','died','known for','was a','was an','scientist','author','philosopher','politician','prime minister','president','king','queen','leader','artist','musician','actor','actress','singer','dancer','painter','sculptor','writer','poet','novelist','playwright','composer','conductor','inventor','explorer','entrepreneur','philanthropist','reformer','activist','revolutionary','freedom fighter','spiritual','guru','saint','philosopher','mathematician','physicist','chemist','biologist','engineer','architect','doctor','surgeon','nobel','award','prize','medal','honour','achievement','contribution','legacy','influence','biography','autobiography','memoir','profile','portrait','career','life','work']
  };
  for (var c in cats) {
    for (var ci = 0; ci < cats[c].length; ci++) {
      if (l.indexOf(cats[c][ci]) >= 0) return c;
    }
  }
  return null;
};

WIKI._makeFromOnThisDay = function(items) {
  var questions = [];
  var langHints = {
    'event': 'Historical event',
    'birth': 'Birth anniversary',
    'death': 'Death anniversary'
  };
  for (var i = 0; i < items.length && questions.length < 15; i++) {
    var item = items[i];
    var pages = item.pages || [];
    if (pages.length === 0) continue;
    var firstPage = pages[0];
    if (!firstPage || !firstPage.text) continue;
    var t = firstPage.text;
    if (WIKI._seenValues.indexOf(t) >= 0 || WIKI._seenTitles.indexOf(t) >= 0) continue;
    WIKI._seenValues.push(t);
    if (WIKI._seenValues.length > 200) WIKI._seenValues.shift();

    var year = item.year;
    var text = item.text.replace(/<[^>]+>/g, '').trim();
    if (!year || !text || text.length < 10) continue;

    var hint = langHints[item.type] || 'On this day';
    var detail = item.type === 'event' ? (year + ': ' + text.substring(0, 120)) : (t + ' - ' + text.substring(0, 120));
    var fact = t + ' - ' + hint + ' (' + year + '): ' + text.substring(0, 200);

    if (item.type === 'event') {
      // Skip — "What happened in X" with snippet as answer is weak
      continue;
    } else if (item.type === 'birth') {
      questions.push({
        q: 'Who was born in ' + year + '?',
        a: t,
        hint: 'Birth: ' + text.substring(0, 80),
        fact: fact,
        _source: 'wiki',
        _wikiCat: 'personalities',
        opts: WIKI._buildOpts(t, 'person')
      });
    } else if (item.type === 'death') {
      questions.push({
        q: 'Who died in ' + year + '?',
        a: t,
        hint: 'Death: ' + text.substring(0, 80),
        fact: fact,
        _source: 'wiki',
        _wikiCat: 'personalities',
        opts: WIKI._buildOpts(t, 'person')
      });
    }
  }
  return questions;
};

WIKI.fetchCurrentEvents = function() {
  return fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events&prop=text&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.parse || !data.parse.text) return [];
      var html = data.parse.text['*'] || '';
      var items = [];
      var listRe = /<li>(.*?)<\/li>/g;
      var m;
      while ((m = listRe.exec(html)) !== null) {
        var txt = m[1].replace(/<[^>]+>/g, '').trim();
        if (txt.length > 30 && txt.length < 300) items.push(txt);
      }
      return items;
    })
    .catch(function(e) { console.error('[WIKI] fetchCurrentEvents failed:', e); return []; });
};

WIKI._makeEventQuestions = function(eventText) {
  var results = [];
  if (!eventText || eventText.length < 30) return results;

  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+)(?:#[^"]*)?"[^>]*>/g;
  var links = [];
  var lm;
  while ((lm = linkRe.exec(eventText)) !== null) {
    var pageTitle = decodeURIComponent(lm[1].replace(/_/g, ' '));
    if (pageTitle.length > 2 && pageTitle.length < 80) links.push(pageTitle);
  }

  var cleanText = eventText.replace(/<[^>]+>/g, '').trim();
  var sentences = cleanText.match(/[^.!?]+[.!?]/g) || [];
  if (sentences.length === 0) sentences = [cleanText];

  for (var si = 0; si < sentences.length && results.length < 2; si++) {
    var s = sentences[si].trim();
    if (s.length < 30 || s.length > 250) continue;

    var yearMatch = s.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    var year = yearMatch ? yearMatch[0] : null;

    if (links.length > 0) {
      var entity = links[0];
      if (WIKI._seenTitles.indexOf(entity) < 0 && entity.length > 3) {
        // Skip if answer text appears in the question
        var qText = year ? 'What happened in ' + year + ' involving ' + entity + '?' : '';
        if (!qText || qText.length < 20 || qText.length > 130) continue;
        if (qText.toLowerCase().indexOf(entity.toLowerCase()) >= 0) continue;
        results.push({
          q: qText,
          a: entity,
          hint: 'Current affairs: ' + entity,
          fact: cleanText.substring(0, 200),
          _source: 'wiki',
          _wikiCat: 'current_events',
          opts: WIKI._buildOpts(entity)
        });
      }
    }
  }
  return results;
};

WIKI.prefetchCurrentEvents = function() {
  return WIKI.fetchCurrentEvents().then(function(events) {
    WIKI._currentEventCache = events;
    for (var ei = 0; ei < Math.min(events.length, 30); ei++) {
      var qs = WIKI._makeEventQuestions(events[ei]);
      for (var qi = 0; qi < qs.length; qi++) {
        if (WIKI._pool.length < WIKI._poolSize * 2) WIKI._pool.push(qs[qi]);
      }
    }
  }).catch(function() {});
};

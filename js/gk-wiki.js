var WIKI = {};

WIKI._seenTitles = [];
WIKI._seenValues = [];
WIKI._pool = [];
WIKI._poolSize = 30;
WIKI._prefetching = false;

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

WIKI._buildOpts = function(correct) {
  var distractors = [];
  var pool = WIKI._seenTitles.concat(WIKI._seenValues).concat(WIKI._genericFallback);
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
  return fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.title) return WIKI.randomQuestion();
      return WIKI._makeQuestions(data);
    })
    .catch(function() { return []; });
};

WIKI.searchQuestion = function() {
  var topic = pick(WIKI._examTopics);
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(topic) + '&srlimit=50&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.search;
      if (!pages || pages.length === 0) return [];
      var selected = pick(pages);
      return fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(selected.title))
        .then(function(r2) { return r2.json(); })
        .then(function(data) {
          if (!data || !data.title) return [];
          return WIKI._makeQuestions(data);
        });
    })
    .catch(function() { return []; });
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
    .catch(function() { return []; });
};

WIKI.prefetch = function() {
  if (WIKI._prefetching) return;
  WIKI._prefetching = true;

  // Prime the population by fetching multiple sources
  function fetchOne() {
    if (WIKI._pool.length >= WIKI._poolSize) return;
    WIKI.randomQuestion().then(function(qs) {
      if (qs && qs.length) {
        for (var i = 0; i < qs.length; i++) {
          if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(qs[i]);
        }
      }
      if (WIKI._pool.length < WIKI._poolSize) setTimeout(fetchOne, 100);
    }).catch(function() { setTimeout(fetchOne, 300); });
  }

  // Also fetch On This Day in parallel for bulk history questions
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

  function fetchSearch() {
    if (WIKI._pool.length >= WIKI._poolSize) return;
    WIKI.searchQuestion().then(function(qs) {
      if (qs && qs.length) {
        for (var i = 0; i < qs.length; i++) {
          if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(qs[i]);
        }
      }
      if (WIKI._pool.length < WIKI._poolSize) setTimeout(fetchSearch, 100);
    }).catch(function() { setTimeout(fetchSearch, 300); });
  }

  // Launch all sources
  fetchOnThisDay();
  for (var pi = 0; pi < 3; pi++) { setTimeout(fetchOne, pi * 50); }
  for (var si = 0; si < 2; si++) { setTimeout(fetchSearch, 200 + si * 100); }
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._makeQuestions = function(data) {
  var title = data.title;
  var extract = (data.extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  var desc = data.description || '';
  var firstSentence = extract.split('.')[0] || extract;

  if (extract.length < 100) return [];
  if (/^Outline of/i.test(title)) return [];

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 200) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  // Build rich fact from article extract
  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var factParts = [title];
  if (desc) factParts.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 15); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factParts.join('. ').length + sf.length < 3000) factParts.push(sf);
  }
  var richFact = factParts.join('. ');

  // Build a single content card per article — no templated questions
  var qText = title;
  if (desc) qText += ' — ' + desc;
  var shortExtract = extract.length > 400 ? extract.substr(0, 397) + '...' : extract;

  return [{
    q: qText,
    a: title,
    hint: catName,
    fact: richFact,
    opts: WIKI._buildOpts(title),
    _source: 'wiki',
    _wikiCat: catName
  }];
};

WIKI._makeFromOnThisDay = function(items) {
  var questions = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var label = item.text;
    var year = item.year || '';
    var pages = item.pages || [];
    var pageTitle = pages.length > 0 ? pages[0].title || pages[0].displaytitle || '' : '';

    if (!label || label.length < 10) continue;

    // Event/birth/death year question
    if (year) {
      var q = {
        q: 'In which year did this happen? ' + label.substr(0, 80),
        a: year,
        hint: 'Event: ' + label.substr(0, 60),
        fact: year + ': ' + label,
        _source: 'wiki',
        _wikiCat: 'history',
        opts: WIKI._buildOpts(year)
      };
      questions.push(q);
    }

    // Shortened clue
    var shortLabel = label.length > 100 ? label.substr(0, 100) + '...' : label;
    var clues = [
      { q: 'What happened on this day? ' + shortLabel, a: year + ' — ' + (pageTitle || 'historical event'), hint: 'A notable event in history', fact: year + ': ' + label },
      { q: 'When did this event occur? ' + shortLabel, a: year, hint: 'The year of the event', fact: year + ': ' + label },
      { q: 'Why is this date significant? ' + shortLabel, a: year + ' — ' + (pageTitle || 'historical event'), hint: 'Historical importance', fact: year + ': ' + label },
    ];
    if (pageTitle) {
      clues.push({ q: 'Who/what is associated with this event? ' + shortLabel, a: pageTitle, hint: 'Think about the key person/place involved', fact: pageTitle + ' — ' + year + ': ' + label });
      clues.push({ q: 'By whom/what is this event remembered? ' + shortLabel, a: pageTitle, hint: 'Key figure or location linked to the event', fact: pageTitle + ' — ' + year + ': ' + label });
      clues.push({ q: 'Whose birth/death is noted? ' + shortLabel, a: pageTitle, hint: 'Person linked to this date', fact: pageTitle + ' — ' + year + ': ' + label });
    }
    for (var ci = 0; ci < clues.length; ci++) {
      var clueQ = clues[ci];
      clueQ._source = 'wiki';
      clueQ._wikiCat = 'history';
      clueQ.opts = WIKI._buildOpts(clueQ.a);
      questions.push(clueQ);
    }
  }
  return questions;
};

WIKI._classify = function(desc, extract) {
  var text = (desc + ' ' + extract).toLowerCase();
  var categories = [
    { id: 'history', keywords: ['history', 'historical', 'century', 'medieval', 'ancient', 'war', 'battle', 'kingdom', 'empire', 'dynasty', 'revolution', 'independence', 'colonial', 'freedom'] },
    { id: 'geography', keywords: ['geography', 'river', 'mountain', 'country', 'city', 'capital', 'ocean', 'sea', 'lake', 'island', 'desert', 'forest', 'climate', 'region', 'continent', 'national park'] },
    { id: 'polity', keywords: ['constitution', 'parliament', 'government', 'politics', 'election', 'president', 'prime minister', 'legislature', 'judiciary', 'law', 'amendment', 'federal', 'democracy'] },
    { id: 'economy', keywords: ['economy', 'economic', 'gdp', 'inflation', 'budget', 'tax', 'bank', 'finance', 'trade', 'market', 'industry', 'business', 'commerce', 'currency'] },
    { id: 'science', keywords: ['science', 'physics', 'chemistry', 'biology', 'scientist', 'invention', 'discovery', 'element', 'molecule', 'cell', 'gene', 'quantum', 'nuclear', 'laboratory'] },
    { id: 'space', keywords: ['space', 'satellite', 'rocket', 'isro', 'nasa', 'moon', 'mars', 'planet', 'astronomy', 'telescope', 'orbit', 'launch', 'astronaut', 'cosmos'] },
    { id: 'environment', keywords: ['environment', 'climate', 'pollution', 'forest', 'wildlife', 'species', 'endangered', 'conservation', 'ecology', 'biodiversity', 'greenhouse', 'emission'] },
    { id: 'culture', keywords: ['culture', 'art', 'music', 'dance', 'painting', 'architecture', 'temple', 'festival', 'heritage', 'tradition', 'classical', 'folk', 'literature'] },
    { id: 'sports', keywords: ['sport', 'game', 'olympic', 'cricket', 'football', 'tennis', 'athlete', 'champion', 'tournament', 'medal', 'world cup', 'stadium'] },
    { id: 'ir', keywords: ['international', 'foreign', 'diplomacy', 'treaty', 'alliance', 'united nations', 'bilateral', 'multilateral', 'embassy', 'global'] },
    { id: 'computers', keywords: ['computer', 'software', 'hardware', 'programming', 'internet', 'digital', 'cyber', 'data', 'algorithm', 'artificial intelligence', 'technology', 'electronic'] },
    { id: 'personalities', keywords: ['born', 'died', 'known for', 'biography', 'award', 'achievement', 'founder', 'leader', 'scientist', 'author', 'artist', 'philosopher'] },
    { id: 'books', keywords: ['book', 'novel', 'author', 'writer', 'poem', 'literature', 'fiction', 'non-fiction', 'biography', 'memoir', 'publish', 'chapter'] },
    { id: 'awards', keywords: ['award', 'prize', 'medal', 'honour', 'nobel', 'padma', 'bharat ratna', 'oscar', 'academy award', 'winner', 'laureate'] },
    { id: 'defence', keywords: ['defence', 'military', 'army', 'navy', 'air force', 'missile', 'weapon', 'soldier', 'war', 'border', 'security', 'drdo'] },
    { id: 'dams', keywords: ['dam', 'river', 'reservoir', 'irrigation', 'hydroelectric', 'canal', 'water', 'project', 'barrage'] },
  ];

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    for (var j = 0; j < cat.keywords.length; j++) {
      if (text.indexOf(cat.keywords[j]) >= 0) {
        return cat.id;
      }
    }
  }
  return 'general';
};

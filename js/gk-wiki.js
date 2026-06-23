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
  WIKI.prefetchCurrentEvents();
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
  var lower = extract.toLowerCase();
  var allSentences = extract.match(/[^.!?]+[.!?]/g) || [];
  // Find first real sentence (skip abbreviation fragments)
  var firstSentence = extract;
  for (var fsi = 0; fsi < allSentences.length; fsi++) {
    if (allSentences[fsi].trim().length >= 20) { firstSentence = allSentences[fsi].trim(); break; }
  }

  if (extract.length < 100) return [];
  if (/^Outline of/i.test(title)) return [];

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 200) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];
  var numbers = extract.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+)\b/g) || [];

  var factSentences = [title];
  if (desc) factSentences.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 15); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factSentences.join('. ').length + sf.length < 3000) factSentences.push(sf);
  }
  var richFact = factSentences.join('. ');

  var results = [];

  function isValid(a) {
    if (!a) return false;
    var s = String(a).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length < 3 || s.length > 200) return false;
    var sl = s.toLowerCase();
    if (sl.indexOf('various') >= 0 || sl.indexOf('multiple') >= 0 || sl.indexOf('unknown') >= 0 || sl.indexOf('none') >= 0) return false;
    return true;
  }

  function pushQ(q) {
    if (!q) return;
    if (results.length >= 4) return;
    q.a = String(q.a).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!isValid(q.a)) return;
    q._source = 'wiki';
    q._wikiCat = catName;
    results.push(q);
  }

  function isPersonLike() {
    var d = (desc + ' ' + firstSentence + ' ' + extract.substr(0, 500)).toLowerCase();
    return (d.indexOf('born') >= 0 || d.indexOf('died') >= 0) || d.indexOf('known for') >= 0 || d.indexOf(' was an ') >= 0 || d.indexOf(' was a ') >= 0 || d.indexOf('king ') >= 0 || d.indexOf('queen ') >= 0 || d.indexOf('president ') >= 0 || d.indexOf('scientist') >= 0 || d.indexOf('author') >= 0 || d.indexOf('artist') >= 0 || d.indexOf('philosopher') >= 0 || d.indexOf('founder') >= 0 || d.indexOf('inventor') >= 0;
  }

  function isPlaceLike() {
    var d = (desc + ' ' + firstSentence).toLowerCase();
    return d.indexOf('city') >= 0 || d.indexOf('country') >= 0 || d.indexOf('town') >= 0 || d.indexOf('village') >= 0 || d.indexOf('region') >= 0 || d.indexOf('state') >= 0 || d.indexOf('river') >= 0 || d.indexOf('mountain') >= 0 || d.indexOf('island') >= 0 || d.indexOf('continent') >= 0 || d.indexOf('lake') >= 0 || d.indexOf('ocean') >= 0 || d.indexOf('sea') >= 0 || d.indexOf('desert') >= 0 || d.indexOf('national park') >= 0 || d.indexOf('located') >= 0 || d.indexOf('capital') >= 0 || d.indexOf('province') >= 0;
  }

  var isPerson = isPersonLike();
  var isPlace = isPlaceLike();

  // ── WHEN: extract years ──
  if (!isPerson && years.length > 0) {
    var uniqY = [];
    var seenY = {};
    for (var yi = 0; yi < years.length; yi++) {
      if (!seenY[years[yi]]) { seenY[years[yi]] = true; uniqY.push(years[yi]); }
    }
    var whenYear = uniqY[0];
    var whenVerbs = ['established', 'created', 'founded', 'formed', 'occur', 'happen', 'take place'];
    var whenV = 'established';
    for (var wvi = 0; wvi < whenVerbs.length; wvi++) {
      if (lower.indexOf(whenVerbs[wvi]) >= 0) { whenV = whenVerbs[wvi]; break; }
    }
    var whenQ = 'When was ' + title + ' ' + whenV + '?';
    if (whenV === 'occur' || whenV === 'happen') whenQ = 'When did ' + title + ' ' + whenV + '?';
    if (whenV === 'take place') whenQ = 'When did ' + title + ' take place?';
    pushQ({ q: whenQ, a: whenYear, hint: 'Historical year', fact: richFact, opts: WIKI._buildOpts(whenYear) });
  }

  // ── WHERE: extract location ──
  if (!isPerson) {
    var locPatterns = [
      /(?:located|based|situated|headquartered|situated)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /(?:found|native|present|common)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /(?:of|in)\s+(northern|southern|eastern|western|central|north|south|east|west)\s+([A-Z][a-z]+)/
    ];
    var locAns = null;
    for (var lpi = 0; lpi < locPatterns.length; lpi++) {
      var lm = extract.match(locPatterns[lpi]);
      if (lm && lm[1] && lm[1].length < 60) { locAns = lm[1]; break; }
    }
    if (locAns) {
      pushQ({ q: 'Where is ' + title + ' located?', a: locAns, hint: 'Geographical location', fact: richFact, opts: WIKI._buildOpts(locAns) });
    }
  }

  // ── WHO: person articles ──
  if (isPerson) {
    var whoAns = desc && desc.length < 100 ? desc : firstSentence.substr(0, 100);
    if (whoAns && whoAns.length > 5) {
      pushQ({ q: 'Who is ' + title + '?', a: whoAns, hint: 'Notable personality', fact: richFact, opts: WIKI._buildOpts(whoAns) });
      pushQ({ q: 'What is ' + title + ' known for?', a: whoAns, hint: 'Key achievement', fact: richFact, opts: WIKI._buildOpts(whoAns) });
    }
    // When born/died
    var birthY = extract.match(/born\s+(\d{1,2}\s+\w+\s+)?(\d{4})/i);
    var deathY = extract.match(/died\s+(\d{1,2}\s+\w+\s+)?(\d{4})/i);
    if (birthY) pushQ({ q: 'When was ' + title + ' born?', a: birthY[2], hint: 'Birth year', fact: richFact, opts: WIKI._buildOpts(birthY[2]) });
    if (deathY) pushQ({ q: 'When did ' + title + ' die?', a: deathY[2], hint: 'Death year', fact: richFact, opts: WIKI._buildOpts(deathY[2]) });
  }

  // ── WHAT: general ──
  if (desc && desc.length >= 8 && desc.length < 150) {
    pushQ({ q: 'What is ' + title + '?', a: desc, hint: catName, fact: richFact, opts: WIKI._buildOpts(desc) });
  }

  // ── WHICH: category ──
  if (category !== 'general') {
    pushQ({ q: 'Which field does ' + title + ' belong to?', a: catName, hint: 'Subject area', fact: richFact, opts: WIKI._buildOpts(catName) });
  }

  // ── HOW: measurements ──
  (function() {
    var meas = [
      { pat: /(\d[\d,]*)\s*(?:km|kilometre|kilometer)/i, unit: 'km', qT: 'far' },
      { pat: /(\d[\d,]*)\s*(?:m|metre|meter)\b/i, unit: 'm', qT: 'tall' },
      { pat: /(\d[\d,]*)\s*(?:sq\s*km|km2)/i, unit: 'sq km', qT: 'large' },
      { pat: /(\d[\d,]*)\s*(?:kg|kilogram)/i, unit: 'kg', qT: 'heavy' },
      { pat: /(\d[\d,]*)\s*(?:MW|megawatt)/i, unit: 'MW', qT: 'capacity' },
    ];
    for (var mi = 0; mi < meas.length; mi++) {
      var m2 = meas[mi];
      var match2 = extract.match(m2.pat);
      if (match2) {
        var ans2 = match2[1] + ' ' + m2.unit;
        var qT = m2.qT;
        pushQ({ q: 'How ' + qT + ' is ' + title + '?', a: ans2, hint: 'Measurement', fact: richFact, opts: WIKI._buildOpts(ans2) });
        break;
      }
    }
    // How many (numbers with context)
    if (results.length < 3 && numbers.length > 0) {
      for (var ni2 = 0; ni2 < Math.min(numbers.length, 3); ni2++) {
        var n2 = numbers[ni2];
        if (n2.length > 6 || n2 === '0' || n2.indexOf('.') >= 0) continue;
        var ctx2 = extract.substr(Math.max(0, extract.indexOf(n2) - 40), n2.length + 80).toLowerCase();
        var hint2 = '';
        if (ctx2.indexOf('km') >= 0 || ctx2.indexOf('kilometer') >= 0) hint2 = 'distance';
        else if (ctx2.indexOf('kg') >= 0 || ctx2.indexOf('kilogram') >= 0) hint2 = 'weight';
        else if (ctx2.indexOf('%') >= 0 || ctx2.indexOf('percent') >= 0) hint2 = 'percentage';
        else if (ctx2.indexOf('million') >= 0 || ctx2.indexOf('billion') >= 0 || ctx2.indexOf('population') >= 0) hint2 = 'quantity';
        else if (ctx2.indexOf('year') >= 0 || ctx2.indexOf('century') >= 0) { if (years.indexOf(n2) >= 0) continue; hint2 = 'time'; }
        else continue;
        WIKI._seenValues.push(n2);
        if (WIKI._seenValues.length > 200) WIKI._seenValues.shift();
        pushQ({ q: 'How many ' + hint2 + ' are associated with ' + title + '?', a: n2 + ' ' + hint2, hint: 'Numerical data', fact: richFact, opts: WIKI._buildOpts(n2 + ' ' + hint2) });
        break;
      }
    }
  })();

  // ── WHOSE: for person articles ──
  if (isPerson) {
    pushQ({ q: 'Whose biography is described by ' + title + '?', a: desc || title, hint: 'Life story', fact: richFact, opts: WIKI._buildOpts(desc || title) });
  }

  // ── CONTENT CARD FALLBACK (only if no template produced questions) ──
  if (results.length === 0) {
    var clue = desc || firstSentence.substr(0, 120);
    if (!clue || clue.length < 5) clue = extract.substr(0, 100);
    pushQ({ q: clue, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title) });
  }

  return results;
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

// ── CURRENT EVENTS PORTAL PIPELINE ──
// Fetches Portal:Current_events, parses daily events, generates WH-questions

var COMMON_COUNTRIES = [
  'India', 'China', 'United States', 'United Kingdom', 'Russia', 'Japan', 'Brazil',
  'France', 'Germany', 'Australia', 'Canada', 'Italy', 'South Korea', 'North Korea',
  'Iran', 'Iraq', 'Israel', 'Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Myanmar',
  'Afghanistan', 'Turkey', 'Syria', 'Saudi Arabia', 'Yemen', 'Egypt', 'Libya', 'Sudan',
  'South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Argentina', 'Mexico', 'Colombia',
  'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Poland', 'Ukraine',
  'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Philippines', 'Singapore'
];

WIKI.fetchCurrentEvents = function() {
  return fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events&prop=text&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var html = data && data.parse && data.parse.text && data.parse.text['*'];
      if (!html) return [];
      return WIKI._parseCurrentEvents(html);
    })
    .catch(function() { return []; });
};

WIKI._parseCurrentEvents = function(html) {
  var events = [];
  // Remove script/style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

  // Split by date navbar markers to get daily blocks
  var dayBlocks = html.split(/<ul class="current-events-navbar[^>]*>[\s\S]*?<\/ul>/g);

  for (var d = 0; d < dayBlocks.length; d++) {
    var block = dayBlocks[d];
    // Match only leaf <li> (no child <li> or <ul>)
    var leafLi = /<li>((?!<li)[\s\S]*?)<\/li>/g;
    var match;
    while ((match = leafLi.exec(block)) !== null) {
      var raw = match[1];
      if (raw.indexOf('<li') >= 0 || raw.indexOf('<ul') >= 0) continue;
      var text = raw.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
      // Filter: too short, navigation, meta
      if (text.length < 35) continue;
      if (/^(This portal|Worldwide|Sports events|Recent deaths|Nominate|Topics|Ongoing)/i.test(text)) continue;
      if (/^\d[\d,]*\s+(barrel|killed|injured|people)/i.test(text) && text.length < 70) continue;

      // Extract linked article titles
      var links = [];
      var linkRe = /<a[^>]*href="\/wiki\/([^"#]+)(?:#[^"]*)?"[^>]*>/g;
      var lm;
      while ((lm = linkRe.exec(raw)) !== null) {
        var t = decodeURIComponent(lm[1].replace(/_/g, ' '));
        if (t.indexOf(':') < 0 && links.indexOf(t) < 0) links.push(t);
      }

      var cat = WIKI._classify('', text);
      events.push({ text: text, links: links, cat: cat });
    }
  }
  return events;
};

WIKI._makeEventQuestions = function(ev) {
  var text = ev.text;
  var links = ev.links;
  var catName = ev.cat || 'current affairs';
  var lower = text.toLowerCase();
  var results = [];
  var factParts = [text];

  function isValid(a) {
    if (!a) return false;
    var s = String(a).trim();
    if (s.length < 2 || s.length > 200) return false;
    var sl = s.toLowerCase();
    if (sl.indexOf('various') >= 0 || sl.indexOf('multiple') >= 0 || sl.indexOf('unknown') >= 0) return false;
    return true;
  }

  function pushQ(q) {
    if (!q) return;
    if (results.length >= 4) return;
    q.a = String(q.a).trim();
    if (!isValid(q.a)) return;
    q._source = 'current_events';
    q._wikiCat = catName;
    results.push(q);
  }

  // Find mentioned country from links
  var mentionedCountry = null;
  for (var li = 0; li < links.length; li++) {
    if (COMMON_COUNTRIES.indexOf(links[li]) >= 0) { mentionedCountry = links[li]; break; }
  }

  // Numbers in text
  var nums = text.match(/\b(\d{1,3}(?:,\d{3})*)\b/g) || [];

  // ── WHAT happened ──
  var shortText = text.length > 120 ? text.substr(0, 117) + '...' : text;
  pushQ({ q: 'What happened? ' + shortText, a: text.substr(0, 150), hint: 'Current event', fact: text, opts: WIKI._buildOpts(text.substr(0, 60)) });

  // ── WHICH country ──
  if (mentionedCountry) {
    var whatVerb = 'did this happen';
    if (lower.indexOf('launch') >= 0 || lower.indexOf('announce') >= 0) whatVerb = 'is involved';
    if (lower.indexOf('kill') >= 0 || lower.indexOf('attack') >= 0) whatVerb = 'was affected';
    if (lower.indexOf('elect') >= 0 || lower.indexOf('vote') >= 0) whatVerb = 'held the election';
    pushQ({ q: 'Which country ' + whatVerb + '? ' + shortText, a: mentionedCountry, hint: 'Country involved', fact: text, opts: WIKI._buildOpts(mentionedCountry) });
  }

  // ── WHERE ──
  var locMatch = text.match(/(?:in|at|near|off)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (locMatch && locMatch[1] && locMatch[1].length < 50) {
    pushQ({ q: 'Where did this occur? ' + shortText, a: locMatch[1], hint: 'Location of event', fact: text, opts: WIKI._buildOpts(locMatch[1]) });
  }

  // ── HOW MANY ──
  if (nums.length > 0) {
    var nContexts = ['killed', 'injured', 'dead', 'people', 'million', 'billion', 'barrel', 'soldier'];
    for (var ni = 0; ni < nums.length; ni++) {
      var n = nums[ni];
      var ctx = text.substr(Math.max(0, text.indexOf(n) - 30), n.length + 60).toLowerCase();
      for (var nci = 0; nci < nContexts.length; nci++) {
        if (ctx.indexOf(nContexts[nci]) >= 0) {
          pushQ({ q: 'How many ' + nContexts[nci] + ' are reported? ' + shortText, a: n, hint: 'Number reported', fact: text, opts: WIKI._buildOpts(n) });
          ni = nums.length; break;
        }
      }
    }
  }

  // ── TRUE/FALSE ──
  if (mentionedCountry) {
    var falseCountry = null;
    for (var fi = 0; fi < COMMON_COUNTRIES.length; fi++) {
      if (COMMON_COUNTRIES[fi] !== mentionedCountry && text.indexOf(COMMON_COUNTRIES[fi]) < 0) {
        falseCountry = COMMON_COUNTRIES[fi]; break;
      }
    }
    if (falseCountry) {
      pushQ({ q: 'True or False: ' + falseCountry + ' was involved in this event. ' + shortText, a: 'False', hint: 'Verify the country', fact: text, opts: ['True', 'False'] });
    }
  }

  // ── WHO (if person mentioned in links) ──
  for (var pli = 0; pli < Math.min(links.length, 5); pli++) {
    var l = links[pli];
    if (l !== mentionedCountry && l.indexOf(',') < 0 && l.indexOf(' ') > 0 && l.indexOf('(') < 0 && l.length > 5 && l.length < 60) {
      pushQ({ q: 'Who is mentioned in this event? ' + shortText, a: l, hint: 'Person or entity', fact: text, opts: WIKI._buildOpts(l) });
      break;
    }
  }

  return results;
};

WIKI._currentEventCache = [];

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

// ── WIKINEWS PIPELINE (reserved for future use) ──
// Wikinews API tested: recentchanges namespace 0 returns 0 articles.
// Alternative: parse Wikinews main page for latest headlines.

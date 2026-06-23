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
  var titleLower = title.toLowerCase();

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
    if (q.q.toLowerCase().indexOf(q.a.toLowerCase()) >= 0) return; // answer not hidden
    q._source = 'wiki';
    q._wikiCat = catName;
    results.push(q);
  }

  // New approach: find sentences mentioning the title, replace title with What/Who
  // This makes the user IDENTIFY the topic from its description

  // Build alternate title forms for sentence matching
  var titleClean = title.replace(/\s*\(.*?\)/g, '').trim();
  var titleWords = title.split(/\s+/);
  // Only use last-name matching if distinctive (>4 chars, capitalized, not a common word)
  var COMMON_WORDS = ['United', 'Nations', 'International', 'National', 'World', 'Global', 'General', 'University', 'Institute', 'Association', 'Committee', 'Commission', 'Organization', 'Government', 'Republic', 'State', 'States', 'Kingdom', 'Democratic', 'Federal', 'Union', 'Party', 'Front', 'Movement', 'Group', 'Council', 'Board', 'Fund', 'Bank', 'Center', 'Centre', 'System', 'Force', 'Force'];
  var lastName = '';
  if (titleWords.length > 1) {
    var last = titleWords[titleWords.length - 1].replace(/[.,()]/g, '');
    if (last.length > 4 && COMMON_WORDS.indexOf(last) < 0) lastName = last;
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
    // Skip if sentence is just the title (no additional content)
    if (!foundForm || s.length - foundForm.length < 15) continue;

    var startIdx = sLower.indexOf(foundForm.toLowerCase());
    var before = s.substring(0, startIdx).trim();
    var after = s.substring(startIdx + foundForm.length).trim();

    // Skip lastName matches that appear mid-phrase (part of larger entity name)
    if (foundForm === lastName && before.length > 0) continue;

    // Strip parenthetical references and trailing punctuation from after
    after = after.replace(/^\([^)]*\)\s*/, '').trim();
    after = after.replace(/^[,\s]+/, '').trim();

    // Determine WH-word
    var wh = 'What';
    var personCheck = (desc + ' ' + s).toLowerCase();
    if (personCheck.indexOf('born') >= 0 || personCheck.indexOf(' died') >= 0 || personCheck.indexOf('known for') >= 0 ||
        personCheck.indexOf(' was a ') >= 0 || personCheck.indexOf(' was an ') >= 0 ||
        personCheck.indexOf('scientist') >= 0 || personCheck.indexOf('author') >= 0 || personCheck.indexOf('philosopher') >= 0 ||
        personCheck.indexOf('politician') >= 0 || personCheck.indexOf('prime minister') >= 0 || personCheck.indexOf('president ') >= 0 ||
        personCheck.indexOf('king ') >= 0 || personCheck.indexOf('queen ') >= 0 || personCheck.indexOf(' leader') >= 0 ||
        personCheck.indexOf('artist ') >= 0 || personCheck.indexOf('musician') >= 0 || personCheck.indexOf('actor') >= 0) wh = 'Who';

    // Build question: "X is/was a Y" → "What/Who is/was a Y?"
    var verbMatch = after.match(/^(is|are|was|were)\s+/i);
    var verb = verbMatch ? verbMatch[0] : '';
    var rest = after.replace(/^(is|are|was|were)\s+/i, '').trim();
    var simpleQ = wh + ' ' + verb + rest;
    simpleQ = simpleQ.replace(/\s+/g, ' ').trim();
    simpleQ = simpleQ.charAt(0).toUpperCase() + simpleQ.slice(1);
    if (simpleQ.endsWith('.')) simpleQ = simpleQ.slice(0, -1) + '?';
    else if (!simpleQ.endsWith('?')) simpleQ += '?';
    if (simpleQ.length > 20 && simpleQ.length < 130) {
      pushQ({ q: simpleQ, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title) });
    }
  }

  // ── BIRTH/DEATH YEAR (for persons, alternate format) ──
  if (results.length < 3) {
    var birthMatch = extract.match(/born\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    var deathMatch = extract.match(/died\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    if (birthMatch) {
      var ctx = extract.substr(Math.max(0, extract.indexOf(birthMatch[0]) - 10), birthMatch[0].length + 40);
      if (ctx.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who was born in ' + birthMatch[1] + '?', a: title, hint: 'Birth year', fact: richFact, opts: WIKI._buildOpts(title) });
      }
    }
    if (deathMatch && deathMatch[1] !== (birthMatch && birthMatch[1])) {
      var ctx2 = extract.substr(Math.max(0, extract.indexOf(deathMatch[0]) - 10), deathMatch[0].length + 40);
      if (ctx2.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who died in ' + deathMatch[1] + '?', a: title, hint: 'Death year', fact: richFact, opts: WIKI._buildOpts(title) });
      }
    }
  }

  // ── YEAR + ESTABLISHED (for non-persons) ──
  if (results.length < 3 && years.length > 0) {
    var y = years[0];
    var verb = 'established';
    if (/founded/i.test(extract)) verb = 'founded';
    else if (/created/i.test(extract)) verb = 'created';
    var yCtx = extract.substr(Math.max(0, extract.indexOf(y) - 50), y.length + 60);
    if (yCtx.toLowerCase().indexOf(titleLower) < 0) {
      pushQ({ q: 'What was ' + verb + ' in ' + y + '?', a: title, hint: 'Founded ' + y, fact: richFact, opts: WIKI._buildOpts(title) });
    }
  }

  // ── LOCATION ──
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
          pushQ({ q: 'What is headquartered in ' + loc + '?', a: title, hint: 'Location: ' + loc, fact: richFact, opts: WIKI._buildOpts(title) });
        }
        break;
      }
    }
  }

  // ── FALLBACK: description-based clue ──
  if (results.length === 0) {
    if (desc && desc.length >= 10 && desc.length < 150) {
      var wh2 = desc.toLowerCase().indexOf('born') >= 0 || desc.toLowerCase().indexOf('known for') >= 0 ? 'Who' : 'What';
      pushQ({ q: wh2 + ' is described as: "' + desc + '"?', a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title) });
    } else {
      var clue = firstSentence.substr(0, 120);
      if (!clue || clue.length < 5) clue = extract.substr(0, 100);
      pushQ({ q: clue, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title) });
    }
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
    if (results.length >= 3) return;
    q.a = String(q.a).trim();
    if (!isValid(q.a)) return;
    // Reject Q == A
    if (q.q.toLowerCase().indexOf(q.a.toLowerCase()) >= 0) return;
    q._source = 'current_events';
    q._wikiCat = catName;
    results.push(q);
  }

  // Find mentioned country from links
  var mentionedCountry = null;
  for (var li = 0; li < links.length; li++) {
    if (COMMON_COUNTRIES.indexOf(links[li]) >= 0) { mentionedCountry = links[li]; break; }
  }

  var nums = text.match(/\b(\d{1,3}(?:,\d{3})*)\b/g) || [];

  function wordBoundRe(word) {
    return new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
  }

  // ── WHICH country ──
  if (mentionedCountry) {
    var masked = text.replace(wordBoundRe(mentionedCountry), '______');
    var ctx = masked.length > 120 ? masked.substr(0, 117) + '...' : masked;
    pushQ({ q: 'Which country is involved in this event: "' + ctx + '"?', a: mentionedCountry, hint: 'Country in the news', fact: text, opts: WIKI._buildOpts(mentionedCountry) });
  }

  // ── WHERE ──
  if (results.length < 3) {
    var locMatch = text.match(/(?:in|at|near|off)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (locMatch && locMatch[1] && locMatch[1].length < 50 && locMatch[1] !== mentionedCountry) {
      var loc = locMatch[1];
      var masked = text.replace(wordBoundRe(loc), '______');
      var ctx2 = masked.length > 120 ? masked.substr(0, 117) + '...' : masked;
      pushQ({ q: 'Where did this event take place? "' + ctx2 + '"?', a: loc, hint: 'Location', fact: text, opts: WIKI._buildOpts(loc) });
    }
  }

  // ── HOW MANY ──
  if (results.length < 3 && nums.length > 0) {
    var nContexts = ['killed', 'injured', 'dead', 'people', 'million', 'billion', 'barrel', 'soldier'];
    for (var ni = 0; ni < nums.length; ni++) {
      var n = nums[ni];
      var ctx3 = text.substr(Math.max(0, text.indexOf(n) - 30), n.length + 60).toLowerCase();
      for (var nci = 0; nci < nContexts.length; nci++) {
        if (ctx3.indexOf(nContexts[nci]) >= 0) {
          var masked3 = text.replace(wordBoundRe(n), '______');
          var ctx3short = masked3.length > 120 ? masked3.substr(0, 117) + '...' : masked3;
          pushQ({ q: 'What number is reported in this event? "' + ctx3short + '"?', a: n, hint: 'Numerical fact', fact: text, opts: WIKI._buildOpts(n) });
          ni = nums.length; break;
        }
      }
    }
  }

  // ── WHO (person/organization name from links) ──
  if (results.length < 3) {
    for (var pli = 0; pli < Math.min(links.length, 5); pli++) {
      var l = links[pli];
      if (l === mentionedCountry) continue;
      if (l.match(/^\d/)) continue; // skip year-prefixed titles
      if (l.length < 5 || text.toLowerCase().indexOf(l.toLowerCase()) < 0) continue;
      var masked4 = text.replace(wordBoundRe(l), '______');
      var ctx4 = masked4.length > 120 ? masked4.substr(0, 117) + '...' : masked4;
      pushQ({ q: 'Who or what organization is mentioned? "' + ctx4 + '"?', a: l, hint: 'Key entity', fact: text, opts: WIKI._buildOpts(l) });
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

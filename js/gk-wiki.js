var WIKI = {};

WIKI._seenTitles = [];
WIKI._pool = [];
WIKI._poolSize = 30;
WIKI._prefetching = false;

WIKI._genericFallback = [
  'India', 'China', 'United States', 'United Kingdom',
  'Asia', 'Africa', 'Europe', 'Australia',
  'Mumbai', 'Delhi', 'Kolkata', 'Chennai',
  'Ganga', 'Yamuna', 'Brahmaputra', 'Godavari',
  'Himalayas', 'Western Ghats', 'Thar Desert', 'Deccan Plateau',
  'Cricket', 'Football', 'Hockey', 'Tennis',
  'Bollywood', 'Hollywood', 'Tollywood', 'Kollywood',
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
  'Supreme Court', 'Parliament', 'High Court', 'Election Commission',
  '1947', '1950', '1991', '2014',
  'Gandhi', 'Nehru', 'Patel', 'Ambedkar',
  'Linux', 'Windows', 'macOS', 'Android',
  'Amazon', 'Google', 'Microsoft', 'Apple',
  'United Nations', 'WHO', 'IMF', 'World Bank',
  'Bengaluru', 'Hyderabad', 'Pune', 'Chennai'
];

WIKI._buildOpts = function(correct) {
  var distractors = [];
  var pool = WIKI._seenTitles.concat(WIKI._genericFallback);
  var shuffled = pool.slice().sort(function() { return Math.random() - 0.5; });
  for (var i = 0; i < shuffled.length && distractors.length < 3; i++) {
    if (shuffled[i] !== correct && distractors.indexOf(shuffled[i]) < 0) {
      distractors.push(shuffled[i]);
    }
  }
  while (distractors.length < 3) {
    distractors.push('None of the above');
  }
  var opts = [correct].concat(distractors);
  opts.sort(function() { return Math.random() - 0.5; });
  return opts;
};

WIKI.randomQuestion = function() {
  return fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.title) return WIKI.randomQuestion();
      return WIKI._makeQuestion(data);
    })
    .catch(function() { return null; });
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
  var fill = function() {
    while (WIKI._pool.length < WIKI._poolSize) {
      WIKI.randomQuestion().then(function(q) {
        if (q) WIKI._pool.push(q);
        if (WIKI._pool.length < WIKI._poolSize) setTimeout(fill, 200);
      }).catch(function() { setTimeout(fill, 500); });
      break;
    }
  };
  fill();
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._makeQuestion = function(data) {
  var title = data.title;
  var extract = data.extract || '';
  var desc = data.description || '';
  var firstSentence = extract.split('.')[0] || extract;
  var category = WIKI._classify(desc, extract);

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 100) WIKI._seenTitles.shift();

  var templates = [
    function() {
      if (!desc || desc.length > 80) return null;
      return {
        q: 'What is ' + title + '?',
        a: desc,
        hint: 'Description: ' + desc,
        fact: title + ': ' + desc + '. ' + firstSentence,
        opts: WIKI._buildOpts(desc)
      };
    },
    function() {
      var clue = firstSentence.length > 100 ? firstSentence.substr(0, 100) + '...' : firstSentence;
      if (clue.length < 20) return null;
      return {
        q: 'Which topic is described by: "' + clue + '"',
        a: title,
        hint: 'Think about which famous topic matches this description',
        fact: title + ': ' + (desc || firstSentence),
        opts: WIKI._buildOpts(title)
      };
    },
    function() {
      var yearMatch = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
      if (!yearMatch) return null;
      return {
        q: title + ' is associated with which year?',
        a: yearMatch[0],
        hint: 'Look for the key date in: ' + firstSentence.substr(0, 60),
        fact: title + ' — ' + yearMatch[0] + '. ' + firstSentence,
        opts: WIKI._buildOpts(yearMatch[0])
      };
    },
    function() {
      var catName = category ? category.replace(/_/g, ' ') : 'GK';
      return {
        q: title + ' belongs to which field?',
        a: catName,
        hint: 'Consider what subject area this topic falls under',
        fact: title + ': ' + catName + '. ' + (desc || firstSentence),
        opts: WIKI._buildOpts(catName)
      };
    },
    function() {
      var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
      if (sentences.length < 2) return null;
      var sent = sentences[1].trim();
      if (sent.length < 20 || sent.length > 200) return null;
      return {
        q: 'True or False: ' + sent,
        a: 'True',
        hint: 'This is a factual statement from Wikipedia',
        fact: 'True statement from ' + title + ' article',
        opts: ['True', 'False']
      };
    },
    function() {
      if (!desc || (desc.indexOf('was a') < 0 && desc.indexOf('is a') < 0 && desc.indexOf('person') < 0 && desc.indexOf('known for') < 0 && desc.indexOf('born') < 0)) return null;
      return {
        q: 'Who is ' + title + '?',
        a: desc,
        hint: 'Think about what this person is known for',
        fact: title + ': ' + desc + '. ' + firstSentence,
        opts: WIKI._buildOpts(desc)
      };
    },
    function() {
      if (!desc || (desc.indexOf('country') < 0 && desc.indexOf('city') < 0 && desc.indexOf('region') < 0 && desc.indexOf('state') < 0 && desc.indexOf('river') < 0 && desc.indexOf('mountain') < 0 && desc.indexOf('island') < 0 && desc.indexOf('capital') < 0)) return null;
      return {
        q: 'What is ' + title + ' known as?',
        a: desc,
        hint: 'Consider the geographical or political description',
        fact: title + ': ' + desc + '. ' + firstSentence,
        opts: WIKI._buildOpts(desc)
      };
    }
  ];

  for (var tries = 0; tries < 15; tries++) {
    var tpl = pick(templates);
    var result = tpl();
    if (result) {
      result._source = 'wiki';
      result._wikiCat = category || 'general';
      return result;
    }
  }
  return null;
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

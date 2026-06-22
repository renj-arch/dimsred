// Wikipedia API integration for infinite GK questions
// Facts used under fair use: facts are not copyrightable, only expression is original

var WIKI = {};

// Fetch a random Wikipedia article and turn it into a quiz question
WIKI.randomQuestion = function() {
  return fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.title) return WIKI.randomQuestion(); // retry
      return WIKI._makeQuestion(data);
    })
    .catch(function() {
      return null; // fallback to local data
    });
};

// Fetch On This Day events for a given date
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
      // Pick events
      for (var i = 0; i < Math.min(events.length, 20); i++) {
        items.push({
          type: 'event',
          year: events[i].year,
          text: events[i].text,
          pages: events[i].pages || []
        });
      }
      // Pick births
      for (var i = 0; i < Math.min(births.length, 10); i++) {
        items.push({
          type: 'birth',
          year: births[i].year,
          text: births[i].text,
          pages: births[i].pages || []
        });
      }
      // Pick deaths
      for (var i = 0; i < Math.min(deaths.length, 10); i++) {
        items.push({
          type: 'death',
          year: deaths[i].year,
          text: deaths[i].text,
          pages: deaths[i].pages || []
        });
      }
      return items;
    })
    .catch(function() { return []; });
};

// Pre-fetch a pool of Wikipedia questions for fast access
WIKI._pool = [];
WIKI._poolSize = 30;
WIKI._prefetching = false;

WIKI.prefetch = function() {
  if (WIKI._prefetching) return;
  WIKI._prefetching = true;
  var fill = function() {
    while (WIKI._pool.length < WIKI._poolSize) {
      WIKI.randomQuestion().then(function(q) {
        if (q) WIKI._pool.push(q);
        if (WIKI._pool.length < WIKI._poolSize) setTimeout(fill, 200);
      }).catch(function() { setTimeout(fill, 500); });
      break; // one at a time to avoid rate limiting
    }
  };
  fill();
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null; // caller should fall back
};

// Transform Wikipedia article data into a quiz question
WIKI._makeQuestion = function(data) {
  var title = data.title;
  var extract = data.extract || '';
  var desc = data.description || '';
  var firstSentence = extract.split('.')[0] || extract;
  var thumbnail = data.thumbnail ? data.thumbnail.source : null;
  
  // Determine category based on description/categories
  var category = WIKI._classify(desc, extract);
  
  // Multiple template types
  var templates = [
    // Type 1: What is X?
    function() {
      var snippet = extract.length > 150 ? extract.substr(0, 150) + '...' : extract;
      return {
        q: 'What is ' + title + '?',
        a: desc || firstSentence,
        hint: 'Think about what this topic covers',
        fact: title + ': ' + (desc || firstSentence)
      };
    },
    // Type 2: Reverse - describe it, ask for title
    function() {
      var clue = firstSentence.length > 120 ? firstSentence.substr(0, 120) + '...' : firstSentence;
      return {
        q: 'Which topic is described by: "' + clue + '"',
        a: title,
        hint: 'Match the description to the correct term',
        fact: title + ': ' + (desc || firstSentence)
      };
    },
    // Type 3: Year/period question
    function() {
      var yearMatch = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
      if (yearMatch) {
        return {
          q: title + ' is associated with which year/period?',
          a: yearMatch[0],
          hint: 'Look for dates in: ' + firstSentence,
          fact: title + ': ' + (desc || firstSentence)
        };
      }
      return null;
    },
    // Type 4: Category-based question
    function() {
      var catName = category ? category.replace(/_/g, ' ') : 'GK';
      return {
        q: title + ' belongs to which field of study?',
        a: catName,
        hint: 'Think about what category this topic falls under',
        fact: title + ': ' + catName + ' — ' + (desc || firstSentence)
      };
    },
    // Type 5: True/False
    function() {
      var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
      if (sentences.length < 2) return null;
      var sent = sentences[1].trim();
      if (sent.length < 20 || sent.length > 200) return null;
      return {
        q: 'True or False: ' + sent,
        a: 'True',
        hint: 'This statement is from Wikipedia — it should be true',
        fact: title + ': ' + (desc || firstSentence)
      };
    },
    // Type 6: Person-based question
    function() {
      if (desc && (desc.indexOf('who') >= 0 || desc.indexOf('was a') >= 0 || desc.indexOf('is a') >= 0 || desc.indexOf('person') >= 0)) {
        return {
          q: 'Who is ' + title + '?',
          a: desc || firstSentence,
          hint: 'Think about what this person is known for',
          fact: title + ': ' + (desc || firstSentence)
        };
      }
      return null;
    },
    // Type 7: Place-based question
    function() {
      if (desc && (desc.indexOf('country') >= 0 || desc.indexOf('city') >= 0 || desc.indexOf('region') >= 0 || desc.indexOf('state') >= 0 || desc.indexOf('river') >= 0 || desc.indexOf('mountain') >= 0)) {
        var snippet = firstSentence.length > 120 ? firstSentence.substr(0, 120) + '...' : firstSentence;
        return {
          q: 'What is the significance of ' + title + '?',
          a: desc || snippet,
          hint: 'Think about where this is located and what it is known for',
          fact: title + ': ' + (desc || firstSentence)
        };
      }
      return null;
    },
    // Type 8: Match extract question
    function() {
      var snippet = extract.length > 100 ? extract.substr(0, 100) + '...' : extract;
      return {
        q: 'Complete: ' + title + ' is known as the ' + (desc ? desc.split(' ').slice(0, 5).join(' ') + '...' : '...'),
        a: desc || 'a significant topic in ' + (category || 'general knowledge'),
        hint: 'The description gives the answer',
        fact: title + ': ' + (desc || firstSentence)
      };
    }
  ];
  
  // Pick a valid template
  for (var tries = 0; tries < 10; tries++) {
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

// Classify Wikipedia article into our GK categories
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

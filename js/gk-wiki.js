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

WIKI.randomQuestion = function() {
  return fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.title) return WIKI.randomQuestion();
      return WIKI._makeQuestions(data);
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

  // Launch both
  fetchOnThisDay();
  for (var pi = 0; pi < 3; pi++) { setTimeout(fetchOne, pi * 50); }
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._makeQuestions = function(data) {
  var title = data.title;
  var extract = data.extract || '';
  var desc = data.description || '';
  var firstSentence = extract.split('.')[0] || extract;
  var lower = extract.toLowerCase();

  if (extract.length < 100) return [];

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 200) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];
  var numbers = extract.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+)\b/g) || [];
  var capitalizedWords = extract.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  var singleCapWords = extract.match(/\b[A-Z][a-z]{2,}\b/g) || [];

  var results = [];

  function pushQ(q) {
    if (!q) return;
    var a = String(q.a);
    var aLower = a.toLowerCase();
    if (aLower.indexOf('various') >= 0 || aLower.indexOf('multiple') >= 0 || aLower.indexOf('unknown') >= 0 || aLower.indexOf('none') >= 0) return;
    if (a.length < 3) return;
    q._source = 'wiki';
    q._wikiCat = catName;
    results.push(q);
  }

  function isPerson(t) {
    var d = (desc + ' ' + firstSentence).toLowerCase();
    return d.indexOf('born') >= 0 || d.indexOf(' was a ') >= 0 || d.indexOf(' is a ') >= 0 || d.indexOf('known for') >= 0 || d.indexOf('king') >= 0 || d.indexOf('queen') >= 0 || d.indexOf('president') >= 0 || d.indexOf('scientist') >= 0 || d.indexOf('author') >= 0 || d.indexOf('artist') >= 0 || d.indexOf('leader') >= 0 || d.indexOf('philosopher') >= 0 || d.indexOf('founder') >= 0 || d.indexOf('inventor') >= 0;
  }

  function isPlace(t) {
    var d = (desc + ' ' + firstSentence).toLowerCase();
    return d.indexOf('city') >= 0 || d.indexOf('country') >= 0 || d.indexOf('town') >= 0 || d.indexOf('village') >= 0 || d.indexOf('region') >= 0 || d.indexOf('state') >= 0 || d.indexOf('river') >= 0 || d.indexOf('mountain') >= 0 || d.indexOf('island') >= 0 || d.indexOf('continent') >= 0 || d.indexOf('lake') >= 0 || d.indexOf('ocean') >= 0 || d.indexOf('sea') >= 0 || d.indexOf('desert') >= 0 || d.indexOf('national park') >= 0 || d.indexOf('located') >= 0 || d.indexOf('capital') >= 0 || d.indexOf('province') >= 0;
  }

  var isPersonFlag = isPerson(title);
  var isPlaceFlag = isPlace(title);
  var factSentences = [title];
  if (desc) factSentences.push(desc);
  var siMax = Math.min(sentences.length, 15);
  for (var fi = 0; fi < siMax; fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factSentences.join('. ').length + sf.length < 3000) factSentences.push(sf);
  }
  var richFact = factSentences.join('. ');

  // ── YEAR / WHEN QUESTIONS ────────────────────────────────────
  (function() {
    if (isPersonFlag) return;
    var seen = {};
    for (var yi = 0; yi < years.length; yi++) {
      var y = years[yi];
      if (seen[y]) continue;
      seen[y] = true;
      var yVariants = [
        'When was ' + title + ' established?',
        title + ' is associated with which year?',
        'In which year did ' + title + ' occur?',
        'What year is related to ' + title + '?',
        'How many years ago did ' + title + ' happen? (approximate)'
      ];
      for (var yv = 0; yv < yVariants.length; yv++) {
        pushQ({
          q: yVariants[yv],
          a: y,
          hint: 'Related year: ' + y,
          fact: richFact,
          opts: WIKI._buildOpts(y)
        });
      }
    }
  })();

  // ── LOCATION / WHERE QUESTIONS ───────────────────────────────
  (function() {
    if (isPersonFlag) return;
    var locAnswers = [];
    if (desc && desc.length < 200) locAnswers.push(desc);
    var locSent = firstSentence.length > 80 ? firstSentence.substr(0, 80) + '...' : firstSentence;
    if (locSent.length >= 15) locAnswers.push(locSent);
    if (locAnswers.length === 0) locAnswers.push(title);

    for (var li = 0; li < locAnswers.length; li++) {
      var la = locAnswers[li];
      pushQ({ q: 'Where is ' + title + ' located?', a: la, hint: 'Geographical location of ' + title, fact: richFact, opts: WIKI._buildOpts(la) });
      pushQ({ q: 'Where did ' + title + ' take place?', a: la, hint: 'Think about the location', fact: richFact, opts: WIKI._buildOpts(la) });
      pushQ({ q: 'Where can ' + title + ' be found?', a: la, hint: 'Look up: ' + title, fact: richFact, opts: WIKI._buildOpts(la) });
      pushQ({ q: 'From where does ' + title + ' originate?', a: la, hint: 'Origin location', fact: richFact, opts: WIKI._buildOpts(la) });
    }
  })();

  // ── WHO / PERSON QUESTIONS ──────────────────────────────────
  (function() {
    if (!isPersonFlag) return;
    pushQ({ q: 'Who is ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'A notable personality', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'Who was ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'Historical figure', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'What is ' + title + ' known for?', a: desc || firstSentence.substr(0, 120), hint: 'Their main achievement', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
    pushQ({ q: 'Why is ' + title + ' famous?', a: desc || firstSentence.substr(0, 120), hint: 'Key accomplishment', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
    // Whose / Whom variants for persons
    pushQ({ q: 'Whose biography is ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'Life story of a notable figure', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'By whom is ' + title + ' best remembered?', a: desc || firstSentence.substr(0, 100), hint: 'Legacy of this figure', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'To whom does the description of ' + title + ' refer?', a: desc || firstSentence.substr(0, 100), hint: 'Identity of the person', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
  })();

  // ── WHAT QUESTIONS ──────────────────────────────────────────
  (function() {
    pushQ({ q: 'What is ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'General description', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    if (desc && desc.length >= 8) {
      pushQ({ q: 'What does ' + title + ' refer to?', a: desc, hint: 'Definition', fact: richFact, opts: WIKI._buildOpts(desc) });
    }
    pushQ({ q: 'What is special about ' + title + '?', a: desc || firstSentence.substr(0, 120), hint: 'Unique feature', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
    pushQ({ q: 'What makes ' + title + ' significant?', a: firstSentence.substr(0, 120), hint: 'Its importance', fact: richFact, opts: WIKI._buildOpts(firstSentence.substr(0, 80)) });
    pushQ({ q: 'What category does ' + title + ' fall under?', a: catName, hint: 'Subject field', fact: richFact, opts: WIKI._buildOpts(catName) });
    pushQ({ q: 'For what purpose is ' + title + ' used?', a: desc || firstSentence.substr(0, 100), hint: 'Utility or function', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
  })();

  // ── WHY QUESTIONS ──────────────────────────────────────────
  (function() {
    pushQ({ q: 'Why is ' + title + ' important?', a: desc || firstSentence.substr(0, 120), hint: 'Significance of ' + title, fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
    pushQ({ q: 'Why is ' + title + ' known?', a: desc || firstSentence.substr(0, 120), hint: 'Reason for fame', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
    pushQ({ q: 'For what reason is ' + title + ' notable?', a: desc || firstSentence.substr(0, 120), hint: 'What makes it stand out', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 80)) });
  })();

  // ── HOW QUESTIONS ──────────────────────────────────────────
  (function() {
    pushQ({ q: 'How is ' + title + ' described?', a: desc || firstSentence.substr(0, 100), hint: 'Official description', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'How did ' + title + ' come to be?', a: firstSentence.substr(0, 150), hint: 'Origin story', fact: richFact, opts: WIKI._buildOpts(firstSentence.substr(0, 80)) });
    if (years.length > 0) {
      pushQ({ q: 'How old is ' + title + '? (approximate century)', a: years[0], hint: 'Related time period', fact: richFact, opts: WIKI._buildOpts(years[0]) });
    }
    // Measurement-based How questions from context
    (function() {
      var ctx = extract.toLowerCase();
      var measurements = [
        { pattern: /(\d[\d,]*)\s*(?:km|kilometre|kilometer)/gi, unit: 'kilometres', qFn: function(v,u){ return 'How far is ' + title + '? (' + v + ' ' + u + ')'; } },
        { pattern: /(\d[\d,]*)\s*(?:m|metre|meter)\b/gi, unit: 'metres', qFn: function(v,u){ return 'How tall is ' + title + '? (' + v + ' ' + u + ')'; } },
        { pattern: /(\d[\d,]*)\s*(?:kg|kilogram)/gi, unit: 'kg', qFn: function(v,u){ return 'How heavy is ' + title + '? (' + v + ' ' + u + ')'; } },
        { pattern: /(\d[\d,]*)\s*(?:MW|mega.?watt)/gi, unit: 'MW', qFn: function(v,u){ return 'What is the capacity of ' + title + '? (' + v + ' ' + u + ')'; } },
        { pattern: /(\d[\d,]*)\s*(?:sq\s*km|km2|km²)/gi, unit: 'sq km', qFn: function(v,u){ return 'How large is ' + title + '? (' + v + ' ' + u + ')'; } },
        { pattern: /(\d[\d,]*)\s*(?:million|billion|trillion)/gi, unit: '', qFn: function(v,u){ return 'How many ' + u + ' are associated with ' + title + '? (' + v + ')'; } },
      ];
      for (var mi = 0; mi < measurements.length; mi++) {
        var m = measurements[mi];
        var match = m.pattern.exec(ctx);
        if (match) {
          pushQ({ q: m.qFn(match[1], m.unit), a: match[1] + ' ' + m.unit, hint: 'Measurement related to ' + title, fact: richFact, opts: WIKI._buildOpts(match[1] + ' ' + m.unit) });
          break;
        }
      }
    })();
  })();

  // ── WHICH QUESTIONS ────────────────────────────────────────
  (function() {
    pushQ({ q: 'Which field is ' + title + ' associated with?', a: catName, hint: 'Subject area', fact: richFact, opts: WIKI._buildOpts(catName) });
    pushQ({ q: 'Which category best describes ' + title + '?', a: catName, hint: 'Classification', fact: richFact, opts: WIKI._buildOpts(catName) });
    pushQ({ q: 'Which of the following is ' + title + '?', a: desc || firstSentence.substr(0, 80), hint: 'Choose the correct description', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    pushQ({ q: 'Which year is ' + title + ' most closely linked to?', a: years.length > 0 ? years[0] : 'unknown', hint: 'Annual association', fact: richFact, opts: WIKI._buildOpts(years.length > 0 ? years[0] : 'unknown') });
  })();

  // ── WHOSE QUESTIONS ────────────────────────────────────────
  (function() {
    if (isPersonFlag) {
      pushQ({ q: 'Whose achievements include the description of ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'Identity of the achiever', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    }
    // Entity-level whose questions
    var possessiveIndicators = ['of', "'s", 'belonging to'];
    for (var psi = 0; psi < capitalizedWords.length; psi++) {
      var pw = capitalizedWords[psi];
      if (pw === title || pw.length < 4 || pw.indexOf(' ') < 0) continue;
      var lowerPw = pw.toLowerCase();
      if (lowerPw.indexOf("'s") > 0) {
        pushQ({ q: 'Whose ' + lowerPw.replace("'s", '') + ' is ' + title + ' associated with?', a: pw, hint: 'A possessive entity in the article', fact: richFact, opts: WIKI._buildOpts(pw) });
        break;
      }
    }
  })();

  // ── WHOM / BY WHOM / TO WHOM QUESTIONS ──────────────────────
  (function() {
    if (isPersonFlag) {
      pushQ({ q: 'By whom is ' + title + ' remembered?', a: desc || firstSentence.substr(0, 100), hint: 'Legacy keeper', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
      pushQ({ q: 'With whom is ' + title + ' most associated?', a: desc || firstSentence.substr(0, 100), hint: 'Key association', fact: richFact, opts: WIKI._buildOpts(desc || firstSentence.substr(0, 60)) });
    }
    // Scan sentences for passive voice for "By whom" questions
    for (var swi = 0; swi < Math.min(sentences.length, 3); swi++) {
      var sw = sentences[swi].trim();
      if (sw.length < 30 || sw.length > 200) continue;
      var byMatch = sw.match(/was\s+(\w+ed)\s+by\s+(\w+)/i);
      if (byMatch) {
        pushQ({ q: 'By whom was ' + title + ' ' + byMatch[1] + '?', a: byMatch[2], hint: 'Agent of the action', fact: richFact, opts: WIKI._buildOpts(byMatch[2]) });
        break;
      }
    }
  })();

  // ── HOW MANY / HOW MUCH QUESTIONS ─────────────────────────
  (function() {
    var seen = {};
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      if (seen[n] || n.length > 6 || n === '0') continue;
      seen[n] = true;
      WIKI._seenValues.push(n);
      if (WIKI._seenValues.length > 200) WIKI._seenValues.shift();
      var ctx = extract.substr(Math.max(0, extract.indexOf(n) - 50), n.length + 100).toLowerCase();
      var unit = '';
      if (ctx.indexOf('km') >= 0 || ctx.indexOf('kilometer') >= 0) unit = ' (distance)';
      else if (ctx.indexOf('kg') >= 0 || ctx.indexOf('kilogram') >= 0) unit = ' (weight)';
      else if (ctx.indexOf('%') >= 0 || ctx.indexOf('percent') >= 0) unit = ' (percentage)';
      else if (ctx.indexOf('million') >= 0 || ctx.indexOf('billion') >= 0 || ctx.indexOf('population') >= 0) unit = ' (quantity)';
      else if (ctx.indexOf('year') >= 0 || ctx.indexOf('century') >= 0) unit = ' (time)';
      else if (ctx.indexOf('metre') >= 0 || ctx.indexOf('meter') >= 0 || ctx.indexOf('m ') >= 0) unit = ' (length)';
      else if (ctx.indexOf('sq') >= 0 || ctx.indexOf('area') >= 0) unit = ' (area)';
      else if (ctx.indexOf('rupee') >= 0 || ctx.indexOf('rs') >= 0 || ctx.indexOf('₹') >= 0 || ctx.indexOf('dollar') >= 0 || ctx.indexOf('crore') >= 0 || ctx.indexOf('lakh') >= 0) unit = ' (currency)';

      pushQ({ q: 'What number is associated with ' + title + '?', a: n, hint: 'Numerical data' + unit, fact: richFact, opts: WIKI._buildOpts(n) });
      pushQ({ q: 'How many' + unit + ' are related to ' + title + '?', a: n, hint: 'Count or measure', fact: richFact, opts: WIKI._buildOpts(n) });
      pushQ({ q: 'How much is the value for ' + title + '?', a: n, hint: 'Numerical value', fact: richFact, opts: WIKI._buildOpts(n) });
      pushQ({ q: 'What is the total ' + unit.replace(/[()]/g,'') + ' of ' + title + '?', a: n, hint: 'Total measure', fact: richFact, opts: WIKI._buildOpts(n) });
    }
  })();

  // ── IS/ARE/DO/DOES/CAN (YES/NO) QUESTIONS ────────────────
  (function() {
    if (desc && desc.length < 120) {
      pushQ({ q: 'Is ' + title + ' a ' + catName + ' topic?', a: 'Yes', hint: 'Category confirmation', fact: richFact, opts: ['Yes', 'No'] });
    }
    var negDesc = desc ? desc.replace(/\bis\b/, 'is not').replace(/\bare\b/, 'are not') : '';
    if (negDesc && negDesc.length < 120 && negDesc !== desc) {
      pushQ({ q: 'Is it true that ' + negDesc + '?', a: 'No', hint: 'Negated description check', fact: richFact, opts: ['Yes', 'No'] });
    }
    // Can questions
    if (extract.toLowerCase().indexOf('can be') >= 0) {
      pushQ({ q: 'Can ' + title + ' be considered part of ' + catName + '?', a: 'Yes', hint: 'Category relevance', fact: richFact, opts: ['Yes', 'No'] });
    }
    // Does questions
    if (desc && desc.length < 100) {
      pushQ({ q: 'Does ' + title + ' relate to ' + catName + '?', a: 'Yes', hint: 'Subject relation', fact: richFact, opts: ['Yes', 'No'] });
    }
  })();

  // ── HOW LONG / HOW OFTEN / HOW FAR QUESTIONS ─────────────
  (function() {
    var ctx = extract.toLowerCase();
    // How long (duration)
    var durationMatch = ctx.match(/(\d+)\s*(?:year|month|week|day|hour|minute|second)s?\s+(?:long|period|duration)/i);
    if (!durationMatch) durationMatch = ctx.match(/(?:over|for|during)\s+(\d+)\s*(?:year|month|week|day|hour)s?/i);
    if (durationMatch) {
      pushQ({ q: 'How long did ' + title + ' last / take?', a: durationMatch[0].trim().substr(0, 30), hint: 'Duration of the event', fact: richFact, opts: WIKI._buildOpts(durationMatch[0].trim().substr(0, 30)) });
    }
    // How often (frequency)
    var freqMatch = ctx.match(/(\w+)\s+(?:annually|yearly|monthly|weekly|daily|every\s+\w+)/i);
    if (freqMatch) {
      pushQ({ q: 'How often does ' + title + ' occur?', a: freqMatch[0].trim().substr(0, 30), hint: 'Frequency pattern', fact: richFact, opts: WIKI._buildOpts(freqMatch[0].trim().substr(0, 30)) });
    }
    // How far (distance measurement in context)
    var farMatch = ctx.match(/(\d[\d,]*)\s*(?:km|kilometre|kilometer|mile|mi)\s+(?:from|away|north|south|east|west)/i);
    if (farMatch) {
      pushQ({ q: 'How far is ' + title + ' from its reference point?', a: farMatch[1] + ' ' + (farMatch[0].indexOf('km') >= 0 || farMatch[0].indexOf('kilomet') >= 0 ? 'km' : 'mi'), hint: 'Distance measurement', fact: richFact, opts: WIKI._buildOpts(farMatch[1] + ' km') });
    }
  })();

  // ── FIRST SENTENCE CLUE ────────────────────────────────────
  (function() {
    if (firstSentence.length >= 15) {
      var clue = firstSentence.length > 100 ? firstSentence.substr(0, 100) + '...' : firstSentence;
      pushQ({ q: 'Identify: "' + clue + '"', a: title, hint: desc ? 'Lookup: ' + desc : 'What does this describe?', fact: richFact, opts: WIKI._buildOpts(title) });
      pushQ({ q: 'What is being described? "' + clue + '"', a: title, hint: 'Clue from article', fact: richFact, opts: WIKI._buildOpts(title) });
    }
  })();

  // ── SENTENCE CLUES (each sentence → multiple question words) ──
  (function() {
    for (var si = 0; si < Math.min(sentences.length, 5); si++) {
      var s = sentences[si].trim();
      if (s.length < 25 || s.length > 250) continue;
      var shortClue = s.length > 80 ? s.substr(0, 80) + '...' : s;
      pushQ({ q: 'What does this describe? "' + shortClue + '"', a: title, hint: 'Sentence from the article', fact: richFact, opts: WIKI._buildOpts(title) });
      pushQ({ q: 'What happened? "' + shortClue + '"', a: title, hint: 'Historical or factual clue', fact: richFact, opts: WIKI._buildOpts(title) });
      pushQ({ q: 'How would you explain this? "' + shortClue + '"', a: title, hint: 'Think about the context', fact: richFact, opts: WIKI._buildOpts(title) });
    }
  })();

  // ── ENTITY QUESTIONS (multi-word) ── who/which/what ──────
  (function() {
    var seen = {};
    var placeIndicators = ['city', 'country', 'state', 'river', 'mountain', 'island', 'region', 'capital', 'province', 'town', 'village', 'ocean', 'sea', 'lake', 'desert', 'valley', 'plateau', 'continent'];
    for (var ci = 0; ci < capitalizedWords.length; ci++) {
      var w = capitalizedWords[ci];
      if (w === title || w.length < 4 || seen[w]) continue;
      if (w.indexOf(' ') < 0) continue;
      seen[w] = true;
      var wLower = w.toLowerCase();
      var isPlace = false;
      for (var pi = 0; pi < placeIndicators.length; pi++) {
        if (wLower.indexOf(placeIndicators[pi]) >= 0) { isPlace = true; break; }
      }
      // Check context too
      var ctx = extract.substr(Math.max(0, extract.indexOf(w) - 40), w.length + 80).toLowerCase();
      if (ctx.indexOf('river') >= 0 || ctx.indexOf('city') >= 0 || ctx.indexOf('country') >= 0 || ctx.indexOf('mountain') >= 0) isPlace = true;

      pushQ({ q: isPlace ? 'Which place is related to ' + title + '?' : 'Which is related to ' + title + '?', a: w, hint: 'Key entity: ' + w, fact: richFact, opts: WIKI._buildOpts(w) });
      pushQ({ q: 'What is the name of the entity linked to ' + title + '?', a: w, hint: 'Mentioned in the article', fact: richFact, opts: WIKI._buildOpts(w) });
      if (isPlace) {
        pushQ({ q: 'Where is ' + w + '?', a: title + ' — ' + w, hint: 'A location associated with ' + title, fact: richFact, opts: WIKI._buildOpts(title + ' — ' + w) });
      } else {
        pushQ({ q: 'How is ' + w + ' related to ' + title + '?', a: w + ' is connected to ' + title, hint: 'Entity connection', fact: richFact, opts: WIKI._buildOpts(w + ' is connected to ' + title) });
      }
    }
  })();

  // ── SINGLE WORD ENTITIES ── who/which ─────────────────
  (function() {
    var seen = {};
    var skip = ['The', 'This', 'That', 'These', 'Those', 'What', 'Which', 'Where', 'When', 'How', 'Who', 'Whom', 'Whose', 'Why', 'His', 'Her', 'Its', 'Their', 'Our', 'Your', 'Me', 'My', 'Mine', 'We', 'Us', 'Our', 'Ours', 'You', 'Your', 'Yours', 'He', 'She', 'It', 'They', 'Them', 'And', 'But', 'Or', 'For', 'Nor', 'Yet', 'So', 'Not', 'All', 'Each', 'Every', 'Both', 'Few', 'Many', 'Most', 'Some', 'Any', 'No', 'None', 'Other', 'Another', 'Such', 'Own', 'Same', 'Different'];
    for (var sci = 0; sci < singleCapWords.length; sci++) {
      var w = singleCapWords[sci];
      if (w === title || w.length < 3 || seen[w]) continue;
      if (skip.indexOf(w) >= 0) continue;
      if (capitalizedWords.indexOf(w + ' ') >= 0) continue;
      seen[w] = true;
      pushQ({ q: 'Who is mentioned in the article about ' + title + '?', a: w, hint: 'A notable entity referenced', fact: richFact, opts: WIKI._buildOpts(w) });
      pushQ({ q: 'Which name appears in ' + title + '?', a: w, hint: 'Person or place mentioned', fact: richFact, opts: WIKI._buildOpts(w) });
      pushQ({ q: 'How is ' + w + ' connected to ' + title + '?', a: w + ' — ' + title, hint: 'Entity connection', fact: richFact, opts: WIKI._buildOpts(w + ' — ' + title) });
    }
  })();

  // ── TRUE / FALSE ───────────────────────────────────────
  (function() {
    for (var tfi = 0; tfi < Math.min(sentences.length, 6); tfi++) {
      var s = sentences[tfi].trim();
      if (s.length < 20 || s.length > 250) continue;
      pushQ({ q: 'True or False: ' + s, a: 'True', hint: 'Statement from the article on ' + title, fact: richFact, opts: ['True', 'False'] });
      // Also generate a False version with negation
      if (s.indexOf('is') >= 0 || s.indexOf('was') >= 0 || s.indexOf('are') >= 0) {
        var neg = s.replace(/\bis\b/, 'is not').replace(/\bwas\b/, 'was not').replace(/\bare\b/, 'are not');
        if (neg !== s && neg.length < 250) {
          pushQ({ q: 'True or False: ' + neg, a: 'False', hint: 'Modified statement from article about ' + title, fact: richFact, opts: ['True', 'False'] });
        }
      }
    }
  })();

  // ── DESCRIPTION (multi-template) ─────────────────────
  (function() {
    if (!desc || desc.length < 8) return;
    pushQ({ q: 'What is ' + title + '?', a: desc, hint: 'Description: ' + desc, fact: richFact, opts: WIKI._buildOpts(desc) });
    pushQ({ q: 'What is ' + title + ' known for?', a: desc, hint: 'Main feature', fact: richFact, opts: WIKI._buildOpts(desc) });
    pushQ({ q: 'Why is ' + title + ' noteworthy?', a: desc, hint: 'Significance', fact: richFact, opts: WIKI._buildOpts(desc) });
    pushQ({ q: 'How is ' + title + ' best described?', a: desc, hint: 'Official description', fact: richFact, opts: WIKI._buildOpts(desc) });
  })();

  // ── CATEGORY ──────────────────────────────────────────────
  (function() {
    pushQ({ q: title + ' belongs to which field?', a: catName, hint: 'Subject area', fact: richFact, opts: WIKI._buildOpts(catName) });
    pushQ({ q: 'What subject does ' + title + ' relate to?', a: catName, hint: 'Academic or general field', fact: richFact, opts: WIKI._buildOpts(catName) });
    pushQ({ q: 'Which category does ' + title + ' belong to?', a: catName, hint: 'Classification of ' + title, fact: richFact, opts: WIKI._buildOpts(catName) });
  })();

  // ── ASSOCIATION / MISCELLANEOUS ─────────────────────────
  (function() {
    var fb = desc || firstSentence.substr(0, 80);
    if (fb.length >= 8) {
      pushQ({ q: 'What do you know about ' + title + '?', a: fb, hint: 'General knowledge', fact: richFact, opts: WIKI._buildOpts(fb) });
      pushQ({ q: 'Which of these is true about ' + title + '?', a: fb, hint: 'Factual statement', fact: richFact, opts: WIKI._buildOpts(fb) });
    }
    // How did ... happen? from first few sentences
    if (sentences.length >= 2) {
      var howClue = (sentences[0] + ' ' + sentences[1]).trim();
      if (howClue.length > 40 && howClue.length < 200) {
        pushQ({ q: 'How did ' + title + ' develop?', a: howClue.substr(0, 120), hint: 'Historical development', fact: richFact, opts: WIKI._buildOpts(howClue.substr(0, 80)) });
      }
    }
  })();

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

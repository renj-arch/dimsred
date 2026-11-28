/* News and magazine study layer.
 *
 * The wire and the magazine carry only publisher-supplied titles and
 * summaries. This file does not fetch, guess or invent facts. It does three
 * deterministic things a reader can check against the linked story:
 *
 *   1. keyPoints  - sentence extracts from the publisher's own summary.
 *   2. angles     - the UPSC paper and syllabus theme the story sits in.
 *   3. terms      - short, stable definitions for exam vocabulary that occurs
 *                   in the story, so a reader can revise the concept without
 *                   leaving the page.
 *
 * Browser: window.NewsEnhance. Node: module.exports (used by feed audit
 * scripts and tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NewsEnhance = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOPICS = [
    {
      paper: 'GS2', subject: 'Polity & Constitution',
      why: 'Constitutional bodies, legislative procedure and centre-state relations are core GS2 and prelims polity.',
      keywords: ['constitution', 'supreme court', 'high court', 'parliament', 'bill', 'president', 'state governor', 'election commission', 'panchayat', 'amendment', 'judiciary', 'fundamental right', 'article ', 'money bill', 'ordinance', 'federal', 'rajya sabha', 'lok sabha', 'assembly poll', 'cag', 'finance commission']
    },
    {
      paper: 'GS2', subject: 'Governance & Social Justice',
      why: 'Schemes, service delivery and welfare design are tested through implementation gaps, not slogans.',
      keywords: ['scheme', 'ministry', 'welfare', 'subsidy', 'ration', 'nutrition', 'poverty', 'social justice', 'tribal', 'disability', 'gender budget', 'mission', 'governance', 'civil servant', 'accountability', 'transparency', 'corruption']
    },
    {
      paper: 'GS2', subject: 'International Relations',
      why: 'India’s foreign policy is asked through bilateral relations, groupings and global governance.',
      keywords: ['united nations', 'unsc', 'bilateral', 'treaty', 'sanction', 'ceasefire', 'brics', 'g20', 'g7', 'sco', 'quad', 'wto', 'imf', 'world bank', 'foreign minister', 'ambassador', 'diplomatic', 'indo-pacific', 'neighbour', 'pakistan', 'china', 'bangladesh', 'sri lanka', 'nepal', 'myanmar', 'israel', 'iran', 'russia', 'ukraine', 'united states', 'trump', 'tariff']
    },
    {
      paper: 'GS2', subject: 'Health & Education',
      why: 'Public health capacity and education policy bridge GS2 social sectors with GS3 human capital.',
      keywords: ['hospital', 'health', 'disease', 'outbreak', 'vaccine', 'who', 'mental health', 'insurance', 'medical', 'school', 'university', 'ugc', 'neet', 'exam', 'education', 'teacher', 'student', 'literacy', 'nep ']
    },
    {
      paper: 'GS3', subject: 'Economy & Banking',
      why: 'Monetary and fiscal decisions test the transmission chain, the inflation target and the budget framework.',
      keywords: ['rbi', 'repo', 'inflation', 'gdp', 'budget', 'fiscal', 'tax', 'gst', 'bank', 'npa', 'stock market', 'sensex', 'rupee', 'trade', 'export', 'import', 'msme', 'disinvestment', 'monetary', 'credit', 'loan', 'interest rate', 'sebi', 'insurance', 'pension', 'upi', 'economy']
    },
    {
      paper: 'GS3', subject: 'Agriculture & Food Security',
      why: 'MSP, procurement, irrigation and food security sit at the agriculture–economy junction.',
      keywords: ['farmer', 'agriculture', 'crop', 'irrigation', 'fertilizer', 'msp', 'food security', 'harvest', 'kharif', 'rabi', 'sugarcane', 'wheat', 'paddy', 'livestock', 'dairy', 'fisheries', 'land acquisition']
    },
    {
      paper: 'GS3', subject: 'Environment & Climate',
      why: 'Climate commitments, conservation law and pollution control link GS3 environment with GS2 governance.',
      keywords: ['climate', 'emission', 'cop2', 'cop3', 'biodiversity', 'forest', 'wildlife', 'pollution', 'plastic', 'solar', 'renewable', 'tiger', 'wetland', 'glacier', 'carbon', 'net zero', 'green hydrogen', 'air quality', 'heatwave', 'monsoon', 'cyclone', 'flood', 'drought', 'earthquake', 'landslide', 'disaster']
    },
    {
      paper: 'GS3', subject: 'Science & Technology',
      why: 'Indigenous capability, regulation and dual-use risk are recurring GS3 science questions.',
      keywords: ['isro', 'satellite', 'artificial intelligence', ' ai ', 'semiconductor', 'genome', 'vaccine', 'nuclear', 'quantum', 'drone', 'cyber', 'space', 'rocket', 'biotech', 'research', 'innovation', 'digital', 'data protection', 'algorithm']
    },
    {
      paper: 'GS3', subject: 'Security & Defence',
      why: 'Internal security, defence procurement and border management are GS3 security topics.',
      keywords: ['army', 'missile', 'defence', 'terror', 'border', 'navy', 'air force', 'security force', 'naxal', 'insurgency', 'cyber attack', 'drone attack', 'ceasefire violation']
    },
    {
      paper: 'GS1', subject: 'Society & Social Change',
      why: 'Caste, gender, migration and urbanisation are GS1 society themes with prelims linkages.',
      keywords: ['caste', 'religion', 'women', 'migration', 'urbanisation', 'population', 'marriage', 'family', 'youth', 'elderly', 'lgbt', 'protest', 'movement', 'inequality', 'slum', 'labour']
    },
    {
      paper: 'GS1', subject: 'Art, Culture & Heritage',
      why: 'Art, architecture and heritage questions appear in prelims and GS1 culture.',
      keywords: ['temple', 'monument', 'heritage', 'excavation', 'inscription', 'museum', 'festival', 'dance', 'music', 'painting', 'sculpture', 'literature', 'classical', 'unesco', 'archaeology']
    },
    {
      paper: 'GS1', subject: 'History & Freedom Struggle',
      why: 'Modern Indian history is asked through causes, consequences and institutional continuity.',
      keywords: ['colonial', 'freedom struggle', 'independence', 'partition', 'revolt', 'gandhi', 'nehru', 'ambedkar', 'constitution assembly', 'ancient india', 'medieval', 'british rule', 'viceroy']
    },
    {
      paper: 'GS4', subject: 'Ethics & Probity',
      why: 'Accountability, conflict of interest and public-service values are GS4 themes.',
      keywords: ['ethics', 'probity', 'conflict of interest', 'whistleblower', 'integrity', 'empathy', 'bias', 'discrimination', 'harassment']
    }
  ];

  // Sections whose stories are usually softer than the exam core. They can
  // still be useful, but they should not win a "high yield" label on a single
  // keyword hit.
  var LOW_YIELD_SECTIONS = { sports: 1, entertainment: 1, trending: 1, opinion: 1 };

  // Headline patterns that describe a ceremony, a listicle or a result rather
  // than a policy development. They cap the label at "useful".
  var SOFT_NEWS = /\b(diwali|deepotsav|greetings|celebrat|festival|melody|song|video|photos?|topper|topped|tops?|rank|fair|fashion|film|actor|actress|box office|match|cricket|bollywood|wedding|birthday|recipe|trailer)\b/i;

  // Stable exam vocabulary. Definitions are deliberately short and conceptual;
  // they do not restate any contested claim from the linked story.
  var GLOSSARY = {
    'inflation': 'Sustained rise in the general price level; in India tracked through CPI and WPI.',
    'repo rate': 'Policy rate at which the RBI lends to banks against government securities.',
    'monetary policy': 'RBI actions on money supply and interest rates to meet the inflation target.',
    'inflation targeting': 'Framework in which the RBI targets CPI inflation of 4% with a band of plus or minus 2%.',
    'fiscal deficit': 'Gap between total expenditure and total receipts excluding borrowings.',
    'revenue deficit': 'Gap between revenue expenditure and revenue receipts.',
    'gdp': 'Money value of final goods and services produced in an economy in a year.',
    'gst': 'Indirect tax on supply of goods and services, governed by the GST Council.',
    'current account deficit': 'Excess of imports of goods, services and transfers over exports.',
    'msp': 'Minimum Support Price announced for specified crops to shield farmers from distress sales.',
    'food security': 'Reliable access to sufficient, safe and nutritious food for an active life.',
    'subsidy': 'Government payment that lowers the cost of a good or service for a target group.',
    'disinvestment': 'Sale of government equity in public sector undertakings.',
    'npa': 'A loan on which principal or interest is overdue for more than 90 days.',
    'upi': 'Unified Payments Interface, India’s instant retail payment system.',
    'digital public infrastructure': 'Shared digital rails such as Aadhaar, UPI and DigiLocker.',
    'money bill': 'A Bill dealing only with taxation, borrowing or Consolidated Fund matters; introduced only in the Lok Sabha with the President’s recommendation.',
    'finance bill': 'A Bill giving effect to the taxation proposals of the Union Budget.',
    'annual financial statement': 'Article 112 statement of estimated receipts and expenditure — the constitutional name for the Union Budget.',
    'judicial review': 'Power of courts to test laws and executive action against the Constitution.',
    'basic structure': 'Constitutional features the Supreme Court has held immune from amendment; Kesavananda Bharati (1973).',
    'ordinance': 'Executive order issued when Parliament is not in session; it must be approved within six weeks of reassembly.',
    'cooperative federalism': 'Centre–state collaboration through bodies such as the GST Council, NITI Aayog and Finance Commission.',
    'finance commission': 'Constitutional body under Article 280 that recommends division of taxes between the Centre and states.',
    'election commission': 'Constitutional body under Article 324 that conducts elections to Parliament, state legislatures and the offices of President and Vice-President.',
    'cag': 'Comptroller and Auditor General, the constitutional auditor of Union and state accounts under Article 148.',
    'fundamental rights': 'Part III rights enforceable through writs under Articles 32 and 226.',
    'directive principles': 'Part IV principles that are non-justiciable but fundamental in governance.',
    'uniform civil code': 'A common civil code for marriage, divorce, inheritance and adoption across communities.',
    'federalism': 'Constitutional division of powers between the Union and states under the Seventh Schedule.',
    'climate change': 'Long-term change in temperature and weather patterns, driven mainly by greenhouse-gas emissions.',
    'net zero': 'Balance between greenhouse gases emitted and removed from the atmosphere.',
    'carbon sink': 'A reservoir such as a forest or ocean that absorbs more carbon than it releases.',
    'biodiversity': 'Variety of life at genetic, species and ecosystem levels.',
    'mitigation': 'Actions that reduce greenhouse-gas emissions.',
    'adaptation': 'Adjustments that reduce vulnerability to climate impacts.',
    'el niño': 'Warming of the central and eastern equatorial Pacific that weakens the Walker circulation and is often associated with a weak Indian monsoon.',
    'la niña': 'Cooling of the central and eastern equatorial Pacific with stronger trade winds, often associated with a good Indian monsoon.',
    'monsoon': 'Seasonal reversal of winds; the southwest monsoon brings most of India’s annual rainfall from June to September.',
    'tropical cyclone': 'Low-pressure system over warm oceans with organised thunderstorms and closed circulation.',
    'disaster management': 'Preparedness, response, recovery and mitigation under the Disaster Management Act, 2005.',
    'artificial intelligence': 'Systems that perform tasks associated with human intelligence, such as learning and language generation.',
    'semiconductor': 'A chip made from a semiconducting material that underpins electronics and computing.',
    'quantum computing': 'Computation using quantum states, promising speed-ups for specific problem classes.',
    'isro': 'Indian Space Research Organisation, India’s national space agency.',
    'g20': 'Forum of major economies; India hosted the 2023 summit.',
    'brics': 'Grouping of Brazil, Russia, India, China and partner countries for emerging-economy coordination.',
    'quad': 'India, the United States, Japan and Australia grouping focused on a free and open Indo-Pacific.',
    'sco': 'Shanghai Cooperation Organisation, a Eurasian political and security grouping.',
    'unsc': 'UN Security Council with five permanent and ten elected members.',
    'sanctions': 'Restrictive measures imposed by states or bodies to change another state’s behaviour.',
    'ceasefire': 'A halt to fighting, usually agreed between the parties to a conflict.',
    'wto': 'World Trade Organization, the rules-based trade body and dispute-settlement forum.',
    'imf': 'International Monetary Fund, which provides balance-of-payments support and surveillance.',
    'green hydrogen': 'Hydrogen produced using renewable electricity and water electrolysis.',
    'circular economy': 'A model that keeps materials in use through reuse, repair and recycling.',
    'nep 2020': 'National Education Policy 2020, which restructures school and higher education.',
    'women’s reservation': 'Constitutional reservation of one-third of seats in the Lok Sabha and state assemblies for women.'
  };

  function clip(text, max) {
    var s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    s = s.slice(0, max - 1);
    return s.replace(/\s+\S*$/, '') + '…';
  }

  function sentences(text) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return [];
    // Avoid lookbehind so older Safari still parses the file.
    var marked = s.replace(/([.!?])(\s+)(?=[A-Z0-9“"'])/g, '$1|');
    return marked.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function keyPoints(item) {
    var summary = String(item && item.summary || '');
    if (summary.trim().length < 30) return [];
    var out = [];
    var seen = {};
    sentences(summary).forEach(function (sentence) {
      var point = clip(sentence, 220);
      var key = point.toLowerCase();
      if (point.length < 25 || seen[key]) return;
      seen[key] = 1;
      out.push(point);
    });
    if (!out.length) out.push(clip(summary, 220));
    return out.slice(0, 3);
  }

  function haystack(item) {
    return (' ' + String(item && item.title || '') + ' ' + String(item && item.summary || '') + ' ' + String(item && item.section || '') + ' ').toLowerCase();
  }

  function angles(item) {
    var text = haystack(item);
    var scored = TOPICS.map(function (topic) {
      var score = 0;
      topic.keywords.forEach(function (word) {
        var w = word.toLowerCase();
        if (text.indexOf(w) !== -1) score += w.length > 5 ? 2 : 1;
      });
      return { topic: topic, score: score };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    var out = [];
    var seen = {};
    scored.forEach(function (x) {
      if (out.length >= 2 || seen[x.topic.subject]) return;
      seen[x.topic.subject] = 1;
      out.push({ paper: x.topic.paper, subject: x.topic.subject, why: x.topic.why });
    });
    if (!out.length) {
      out.push({
        paper: 'Prelims',
        subject: 'Current affairs',
        why: 'Use the 4W1H frame: what happened, who is affected, why it matters and what the state should do next.'
      });
    }
    return out;
  }

  // All syllabus topics with a substantive keyword hit. A score of 1 is a
  // single short word such as "bill"; 2 or more means a longer keyword or a
  // cluster of words, which is a better signal that the story is about the
  // topic rather than merely mentioning it.
  function topicScores(item) {
    var text = haystack(item);
    return TOPICS.map(function (topic) {
      var score = 0;
      topic.keywords.forEach(function (word) {
        var w = word.toLowerCase();
        if (text.indexOf(w) !== -1) score += w.length > 5 ? 2 : 1;
      });
      return { paper: topic.paper, subject: topic.subject, why: topic.why, score: score };
    }).filter(function (x) { return x.score >= 2; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  // A deterministic "how much syllabus does this touch" label. It is not an
  // editorial judgement and it does not claim the story will be asked. It only
  // reports the paper/subject keywords found in the publisher's own title and
  // summary, so a reader can see why a card is ranked where it is.
  function importance(item) {
    var matched = topicScores(item);
    var papers = [];
    matched.forEach(function (m) {
      if (papers.indexOf(m.paper) === -1) papers.push(m.paper);
    });
    var termHits = terms(item);
    var termCount = termHits.length;
    var lowYield = !!(item && LOW_YIELD_SECTIONS[item.section]);
    var soft = SOFT_NEWS.test(String(item && item.title || ''));
    var hardPaper = papers.indexOf('GS3') !== -1 ||
      papers.indexOf('GS4') !== -1 ||
      (papers.indexOf('GS2') !== -1 && termCount >= 1);

    var high = !lowYield && !soft && papers.length >= 2 && matched.length >= 2 &&
      hardPaper && (termCount >= 1 || matched.length >= 3);
    if (!high && !soft && termCount >= 3) high = true;

    var level = high ? 'high' : (((papers.length >= 1 && matched.length >= 1) || termCount >= 1) ? 'medium' : 'general');
    if (lowYield && level === 'high' && !(papers.length >= 3 && termCount >= 2)) level = 'medium';

    var labels = { high: 'High yield', medium: 'Useful', general: 'General' };
    var reasons = [];
    if (matched.length) {
      reasons.push('Maps to ' + matched.slice(0, 3).map(function (m) {
        return m.paper + ' ' + m.subject;
      }).join(', '));
    } else {
      reasons.push('No strong GS-paper keyword match');
    }
    reasons.push(termCount ? termCount + ' exam term' + (termCount === 1 ? '' : 's') : 'no glossary terms');
    if (lowYield) reasons.push('soft section');
    if (soft) reasons.push('soft-news headline');

    return {
      level: level,
      label: labels[level],
      papers: papers,
      topics: matched,
      termCount: termCount,
      lowYield: lowYield,
      soft: soft,
      reason: reasons.join('; ') + '. Deterministic syllabus match, not an editorial judgement.'
    };
  }

  function terms(item) {
    var text = haystack(item);
    var hits = [];
    Object.keys(GLOSSARY).forEach(function (term) {
      var needle = term.toLowerCase();
      var at = text.indexOf(needle);
      if (at === -1) return;
      // Word-boundary check without regex lookbehind.
      var before = text.charAt(at - 1);
      var after = text.charAt(at + needle.length);
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) return;
      hits.push({ term: term, def: GLOSSARY[term], at: at });
    });
    hits.sort(function (a, b) { return b.term.length - a.term.length || a.at - b.at; });
    return hits.slice(0, 4).map(function (h) { return { term: h.term, def: h.def }; });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Return summary HTML with matched exam terms circled. Every non-term run is
  // escaped, so publisher text can never inject markup.
  function highlight(text, matchedTerms) {
    var list = (matchedTerms || []).map(function (t) { return typeof t === 'string' ? t : t.term; })
      .filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    if (!list.length) return escapeHtml(text);
    var re = new RegExp('\\b(' + list.map(escapeRegExp).join('|') + ')\\b', 'gi');
    var out = '';
    var last = 0;
    var m;
    while ((m = re.exec(String(text || ''))) !== null) {
      out += escapeHtml(String(text).slice(last, m.index));
      out += '<mark class="kw" title="' + escapeHtml(defFor(m[1])) + '">' + escapeHtml(m[0]) + '</mark>';
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    out += escapeHtml(String(text || '').slice(last));
    return out;
  }

  function defFor(term) {
    var key = String(term || '').toLowerCase();
    if (GLOSSARY[key]) return GLOSSARY[key];
    var found = Object.keys(GLOSSARY).filter(function (k) { return k.toLowerCase() === key; })[0];
    return found ? GLOSSARY[found] : 'Exam term';
  }

  function analyze(item) {
    var matched = terms(item);
    return {
      keyPoints: keyPoints(item),
      angles: angles(item),
      terms: matched,
      summaryHtml: highlight(item && item.summary || '', matched)
    };
  }

  return {
    analyze: analyze,
    keyPoints: keyPoints,
    angles: angles,
    importance: importance,
    topicScores: topicScores,
    terms: terms,
    highlight: highlight,
    glossary: GLOSSARY,
    topics: TOPICS
  };
});

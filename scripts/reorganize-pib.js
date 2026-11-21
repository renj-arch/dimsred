// Reorganize PIB subtopics into correct categories.
// Moves whole subtopics (not individual questions).
// Creates new categories if none match.
var fs = require('fs');
var ARCHIVE = 'data/questions/pib-archive.json';

var archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf8'));
var subs = archive['PIB Releases'].subSubjects;

// Map subtopic names to correct categories based on content
var CATEGORY_MAP = {
  'Announcements': null, // will be split by content
  'Health': 'Health',
  'Defence & Security': 'Defence & Security',
  'Education': 'Education',
  'Agriculture': 'Agriculture',
  'Energy': 'Energy',
  'Environment & Climate': 'Environment & Climate',
  'Economy': 'Economy',
  'Infrastructure': 'Infrastructure',
  'Technology': 'Technology',
  'Law & Justice': 'Law & Justice',
  'Foreign Affairs': 'Foreign Affairs',
  'Sports': 'Sports',
  'Culture': 'Culture',
  'Science & Technology': 'Science & Technology',
};

// Content-based categorization rules
var CONTENT_RULES = [
  { cat: 'Health', patterns: /health|hospital|medical|doctor|patient|disease|ayushman|medicine|vaccine|pharma|drug|nutrition|wellness|healthcare|ayush|dengue|malaria|tuberculosis|covid|ayurveda/i },
  { cat: 'Defence & Security', patterns: /defence|defense|army|navy|air force|drdo|military|soldier|border|missile|submarine|warship|terrorism|insurgency|coast guard|paramilitary|peacekeeping|rafale|tejas/i },
  { cat: 'Education', patterns: /education|school|college|university|student|teacher|exam|scholarship|fellowship|ncert|nep|skill development|vocational|iit|iim|aiims/i },
  { cat: 'Agriculture', patterns: /agriculture|farmer|kisan|crop|food grain|wheat|rice|paddy|fertiliser|irrigation|soil health|msp|horticulture|dairy|fisher|animal husbandry/i },
  { cat: 'Energy', patterns: /energy|electricity|coal|oil|petroleum|natural gas|solar|wind|renewable|hydrogen|biofuel|ethanol|power project|power plant|power sector/i },
  { cat: 'Environment & Climate', patterns: /environment|climate|forest|wildlife|pollution|ecology|emission|carbon|biodiversity|conservation|wetland|ganga|swachh|green/i },
  { cat: 'Economy', patterns: /economy|economic|gdp|inflation|fiscal|monetary|budget|tax|gst|import|export|trade|investment|financial|banking|rbi|sebi/i },
  { cat: 'Infrastructure', patterns: /infrastructure|road|highway|railway|airport|port|metro|smart city|housing|urban|construction|bridge|tunnel/i },
  { cat: 'Technology', patterns: /technology|digital|software|ai |artificial intelligence|cyber|space|isro|satellite|rocket|semiconductor|electronics/i },
  { cat: 'Law & Justice', patterns: /law|justice|court|judicial|legal|act |bill |amendment|constitution|supreme court|high court|legislation/i },
  { cat: 'Foreign Affairs', patterns: /foreign|diplomatic|embassy|bilateral|multilateral|summit|united nations|un |nato|brics|g20|scoop/i },
  { cat: 'Sports', patterns: /sports|olympic|cricket|football|hockey|athlete|tournament|championship|medal|commonwealth/i },
  { cat: 'Culture', patterns: /culture|heritage|monument|museum|festival|art|dance|music|literature|language|tourism/i },
  { cat: 'Science & Technology', patterns: /science|research|laboratory|nuclear|biotech|quantum|space mission|lunar|mars/i },
];

function categorizeQuestions(questions) {
  var result = {};
  questions.forEach(function(q) {
    var text = (q.question || '') + ' ' + (q.fact || '') + ' ' + (q.hint || '');
    var assigned = false;
    for (var i = 0; i < CONTENT_RULES.length; i++) {
      if (CONTENT_RULES[i].patterns.test(text)) {
        var cat = CONTENT_RULES[i].cat;
        if (!result[cat]) result[cat] = [];
        result[cat].push(q);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      // Use existing subSubject or default to Announcements
      var cat = q.subSubject || 'Announcements';
      if (!result[cat]) result[cat] = [];
      result[cat].push(q);
    }
  });
  return result;
}

// Collect all questions from all subtopics
var allQuestions = [];
Object.keys(subs).forEach(function(sub) {
  (subs[sub] || []).forEach(function(q) { allQuestions.push(q); });
});

console.log('Total questions:', allQuestions.length);
console.log('Original subtopics:', Object.keys(subs).length);

// Recategorize
var newSubs = categorizeQuestions(allQuestions);

// Log results
Object.keys(newSubs).forEach(function(cat) {
  console.log('  ' + cat + ': ' + newSubs[cat].length + ' questions');
});

// Update subSubject field on each question
Object.keys(newSubs).forEach(function(cat) {
  newSubs[cat].forEach(function(q) { q.subSubject = cat; });
});

archive['PIB Releases'].subSubjects = newSubs;
fs.writeFileSync(ARCHIVE, JSON.stringify(archive), 'utf8');
console.log('Saved. New categories:', Object.keys(newSubs).length);

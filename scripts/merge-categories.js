// Merge overlapping archive categories into clean taxonomy.
// Moves whole subtopics, not individual questions.
var fs = require('fs');
var path = require('path');

var DIR = 'data/questions';

// Merge map: source categories -> destination category
var MERGE_MAP = {
  // Awards
  'Awards': 'Awards & Honours',
  // Defence
  'Defence': 'Defence & Security',
  // Ethics
  'Ethics': 'Ethics & Integrity',
  // Farm machinery
  'Farm Machinery': 'Farm Machinery & Power',
  // Polity
  'Polity': 'Polity & Governance',
  // Society
  'Society': 'Indian Society',
  // Tech
  'Tech & Science': 'Science & Technology',
  'General': 'General Science',
  // History -> consolidate under Indian History
  'Ancient India': 'Indian History',
  'Medieval & Modern India': 'Indian History',
  // Geography
  'Geography': 'Indian Geography',
  // PIB
  'PIB': 'PIB Releases',
  // Agriculture subcategories -> Agriculture
  'Agricultural Engineering': 'Agriculture',
  'Agricultural Entomology': 'Agriculture',
  'Agricultural Extension & Marketing': 'Agriculture',
  'Agronomy & Crop Production': 'Agriculture',
  'Animal Husbandry & Dairy': 'Agriculture',
  'Farm Machinery & Power': 'Agriculture',
  'Fisheries & Aquaculture': 'Agriculture',
  'Floriculture & Landscaping': 'Agriculture',
  'Food Processing': 'Agriculture',
  'Horticulture': 'Agriculture',
  'Horticulture - Fruit & Vegetable Production': 'Agriculture',
  'Hydrology & Soil Conservation': 'Agriculture',
  'Plant Breeding & Genetics': 'Agriculture',
  'Plant Pathology & Crop Protection': 'Agriculture',
  'Plant Physiology & Nutrition': 'Agriculture',
  'Seed Science & Technology': 'Agriculture',
  'Soil & Watershed': 'Agriculture',
  'Spices & Plantation Crops': 'Agriculture',
  // World History is fine but huge — keep separate
  // Meteorology & Climate is huge — keep separate
  // International Relations is huge — keep separate
  // World Geography is huge — keep separate
};

// Final clean taxonomy (target categories)
var CLEAN_TAXONOMY = [
  'Indian History', 'World History', 'Ancient India', 'Medieval & Modern India',
  'Indian Geography', 'World Geography', 'Geography',
  'Indian Economy', 'Business & Economy', 'Economy',
  'Polity & Governance', 'Constitution', 'Indian Judiciary',
  'Art & Culture', 'Indian Heritage', 'Indian Music & Fine Arts',
  'Personalities', 'Books & Authors', 'Awards & Honours',
  'Defence & Security', 'Science & Technology', 'General Science',
  'Environment & Ecology', 'Health & Medicine',
  'Sports', 'International Relations', 'Society', 'Indian Society',
  'Education in India', 'Govt Schemes', 'Current Affairs',
  'Indian States', 'State GK', 'Important Days',
  'ISRO & Space', 'Indian Wildlife & National Parks',
  'Indian Cinema', 'Indian Languages', 'Indian Literature & Poets',
  'Indian Philosophy & Thinkers', 'Indian Tribes', 'Women & Society',
  'Ethics & Integrity', 'RBI & Banking', 'Railways & Transport',
  'Telecom & Postal', 'Disaster Management', 'Energy & Power',
  'Agriculture', 'Agriculture & Food', 'General',
  'Computer & IT', 'Statistics & Mathematics', 'Engineering & Technical',
  'Meteorology & Climate', 'Indian Archaeology & Epigraphy',
  'Indian Architecture', 'Indian Aviation & Shipping', 'Indian Battles',
  'Indian Demographics & Census', 'Indian Festivals & Fairs',
  'Indian Handicrafts & Coins', 'Indian National Symbols',
  'Indian Rivers & Water Resources', 'Library & Information Science',
  'Geology & Hydrogeology', 'Mining & Minerals', 'Ayurveda & Traditional Medicine',
  'Courts Cases & Verdicts', 'Applied Sciences',
  'PIB Releases', 'RBI Press Releases',
  'Announcements', 'Personalities',
];

function processFile(filePath) {
  try {
    var data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    var changed = false;

    Object.keys(data).forEach(function(subjectKey) {
      if (!data[subjectKey] || !data[subjectKey].subSubjects) return;
      var subs = data[subjectKey].subSubjects;
      var newSubs = {};

      Object.keys(subs).forEach(function(sub) {
        var questions = subs[sub] || [];
        var targetSub = MERGE_MAP[sub] || sub;

        if (!newSubs[targetSub]) newSubs[targetSub] = [];
        newSubs[targetSub] = newSubs[targetSub].concat(questions);

        // Update each question's subSubject field
        questions.forEach(function(q) { q.subSubject = targetSub; });

        if (targetSub !== sub) changed = true;
      });

      data[subjectKey].subSubjects = newSubs;
    });

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
      console.log('Merged: ' + path.basename(filePath));
    }
  } catch (e) {
    // Skip unreadable files
  }
}

// Process all question files
var files = fs.readdirSync(DIR).filter(function(f) { return f.endsWith('.json'); });
console.log('Processing ' + files.length + ' files...');
files.forEach(function(f) {
  processFile(path.join(DIR, f));
});

// Report final category count
var totalCats = new Set();
files.forEach(function(f) {
  try {
    var data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    Object.keys(data).forEach(function(sk) {
      if (data[sk] && data[sk].subSubjects) {
        Object.keys(data[sk].subSubjects).forEach(function(sub) { totalCats.add(sub); });
      }
    });
  } catch(e) {}
});
console.log('Final categories:', totalCats.size);
console.log(Array.from(totalCats).sort().join(', '));

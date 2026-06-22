var GK_GEN2 = {};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

GK_GEN2.constitution = function() {
  var items = GK_DATA.constitution;
  var item = pick(items);
  var templates = [
    function() { return {q: '"' + item[0] + '" of Indian Constitution deals with?', a: item[1], hint: 'Think about the subject matter of this Article/Part', fact: item[0] + ': ' + item[1] + (item[2] ? ' — ' + item[2] : '')}; },
    function() { return {q: 'Which Article of Constitution covers: ' + item[2] + '?', a: item[0], hint: 'Match the description to the correct Article number', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: item[0] + ' belongs to which Part of Constitution?', a: item[3], hint: 'Constitution is organized into Parts (I-XXII)', fact: item[0] + ' is in ' + item[3]}; },
    function() { return {q: 'True or False: ' + item[0] + ' deals with ' + item[2], a: 'True', hint: 'Verify if the description matches', fact: item[0] + ': ' + item[1]}; },
    function() { var a2 = pick(items); while (a2 === item) a2 = pick(items); return {q: 'Which is correct: ' + item[0] + ' (' + item[1].substring(0, 40) + '...) OR ' + a2[0] + ' (' + a2[1].substring(0, 40) + '...)?', a: item[0], hint: 'Compare the two articles and their subjects', fact: 'Both are valid: ' + item[0] + '=' + item[1] + ', ' + a2[0] + '=' + a2[1]}; },
    function() { var parts = ['Preamble', 'Part I', 'Part II', 'Part III', 'Part IV', 'Part IVA', 'Part V', 'Part VI', 'Part IX', 'Part IXA', 'Part XI', 'Part XIV', 'Part XV', 'Part XVII', 'Part XVIII', 'Part XX', 'Part XXI']; return {q: 'Which Part/Article is described as: ' + item[1] + '?', a: item[0], hint: 'Think about the Constitution structure', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What is the significance of ' + item[0] + '?', a: item[1], hint: 'Understand the purpose of this constitutional provision', fact: item[0] + ' — ' + (item[2] || item[1])}; },
    function() { return {q: 'Match: ' + item[0] + ' is associated with?', a: item[1].substring(0, 60), hint: 'Associate articles with their content', fact: item[0] + ': ' + item[1]}; },
    function() { var schedules = ['1st Schedule', '2nd Schedule', '3rd Schedule', '4th Schedule', '5th Schedule', '6th Schedule', '7th Schedule', '8th Schedule', '9th Schedule', '10th Schedule', '11th Schedule', '12th Schedule']; var sch = pick(schedules); return {q: 'Which schedule is related to ' + item[0] + '?', a: sch, hint: 'Schedules list states, languages, oaths, etc.', fact: sch + ' relates to various constitutional details'}; },
    function() { var dyn = pick(items); return {q: 'Identify the Article: ' + (dyn[2] || dyn[1]).substring(0, 50) + '...', a: dyn[0], hint: 'Match the description to the Article', fact: dyn[0] + ': ' + dyn[1]}; },
    function() { return {q: 'Fill in the blank: ' + item[0] + ' deals with __________.', a: item[1], hint: 'The name gives a clue about the content', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which of the following best describes ' + item[0] + '? A) ' + item[1].substring(0, 30) + ' B) ' + item[2] + ' C) ' + item[3] + ' D) None', a: 'A', hint: 'Read the options carefully', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What does Article ' + item[0].replace('Article ', '') + ' of the Constitution say?', a: item[1], hint: 'Articles cover specific subjects in detail', fact: item[0] + ': ' + item[1]}; },
    function() { var list = [item[0], pick(items)[0], pick(items)[0], pick(items)[0]]; return {q: 'Which of these is NOT related to ' + (item[3] || 'Constitution') + '? Options: ' + list.join(', '), a: item[0], hint: 'Identify the odd one out', fact: item[0] + ' is the correct answer'}; },
    function() { return {q: item[0] + ' (' + item[1].substring(0, 30) + '...) is mentioned in which Article/Part?', a: item[0], hint: 'Recall the specific Article number', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.schemes = function() {
  var items = GK_DATA.schemes;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Which year was ' + item[0] + ' launched?', a: item[2] || 'NA', hint: 'Scheme launch years: 2014 (Jan Dhan), 2015 (Digital), 2018 (Ayushman)', fact: item[0] + ' launched in ' + (item[2] || 'unknown year')}; },
    function() { return {q: 'What is the main objective of ' + item[0] + '?', a: item[1], hint: 'The scheme name often indicates its purpose', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which ministry implements ' + item[0] + '?', a: item[4] || 'Multiple/concerned ministry', hint: 'Think about which department handles this sector', fact: item[0] + ' implemented by ' + (item[4] || 'concerned ministry')}; },
    function() { return {q: 'Who are the beneficiaries of ' + item[0] + '?', a: item[3] || item[1], hint: 'Schemes target specific groups: farmers, women, youth, poor', fact: item[0] + ' targets: ' + (item[3] || item[1])}; },
    function() { return {q: 'What is the budget allocation for ' + item[0] + '?', a: item[5] || 'Budget varies by year', hint: 'Major schemes have significant budget outlays', fact: item[0] + (item[5] ? ' budget: ' + item[5] : ' has annual budget allocation')}; },
    function() { return {q: 'What is the full form of ' + (item[6] || item[0]) + '?', a: item[0], hint: 'Abbreviation often encodes the scheme name', fact: (item[6] || item[0]) + ' stands for ' + item[0]}; },
    function() { return {q: 'Who launched ' + item[0] + '?', a: item[7] || 'Government of India', hint: 'Central schemes are launched by PM or concerned minister', fact: item[0] + ' launched by ' + (item[7] || 'Government of India')}; },
    function() { var s2 = pick(items); return {q: 'Which scheme is older: ' + item[0] + ' (' + item[2] + ') OR ' + s2[0] + ' (' + s2[2] + ')?', a: (item[2] < s2[2]) ? item[0] : s2[0], hint: 'Compare the launch years', fact: item[0] + '(' + item[2] + '), ' + s2[0] + '(' + s2[2] + ')'}; },
    function() { return {q: 'Which scheme replaced/renamed from ' + item[8] + '?', a: item[0], hint: 'Many old schemes were revamped with new names', fact: item[8] + ' was replaced by ' + item[0]}; },
    function() { return {q: 'Which scheme has motto/tagline: "' + (item[9] || 'Serving the nation') + '"?', a: item[0], hint: 'Taglines capture scheme vision', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'True or False: ' + item[0] + ' was launched before 2014.', a: (parseInt(item[2]) < 2014) ? 'True' : 'False', hint: 'Many schemes launched after 2014', fact: item[0] + ' launched in ' + item[2]}; },
    function() { return {q: 'How many installments/beneficiaries are under ' + item[0] + '?', a: item[10] || 'Varies by scheme', hint: 'PM-KISAN has 3 installments, Ayushman covers 10Cr+ families', fact: item[0] + (item[10] ? ': ' + item[10] : '')}; },
    function() { return {q: 'Which of these is NOT a flagship scheme: ' + item[0] + ', ' + pick(items)[0] + ', ' + pick(items)[0] + '?', a: item[0], hint: 'Identify the scheme that doesnt fit', fact: item[0] + ' is also a flagship scheme'}; },
    function() { return {q: 'Fill in the blank: __________ is a ' + (item[11] || 'government') + ' scheme with objective ' + item[1].substring(0, 50) + '...', a: item[0], hint: 'Think about the scheme description', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Match: ' + item[0] + ' — launch year?', a: item[2], hint: 'Associate schemes with their launch year', fact: item[0] + ' (' + item[2] + ')'}; }
  ];
  return pick(templates)();
};

GK_GEN2.sports = function() {
  var items = GK_DATA.sports;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Who won the ' + item[0] + ' in ' + (item[3] || 'recent') + ' edition?', a: item[2] || 'Multiple winners', hint: 'Think about the most recent champion', fact: item[0] + ' winners: ' + (item[2] || 'various')}; },
    function() { return {q: 'Where was the first ' + item[0] + ' held?', a: item[3] || 'First edition details', hint: 'The first edition sets the host location', fact: item[0] + ' started at ' + (item[3] || 'various locations')}; },
    function() { return {q: 'Which sport is associated with ' + item[0] + '?', a: item[1], hint: 'Trophies/events are linked to specific sports', fact: item[0] + ' is for ' + item[1]}; },
    function() { return {q: 'When was ' + item[0] + ' first held?', a: item[4] || item[3] || 'Various dates', hint: 'Historical origins of major tournaments', fact: item[0] + ' first held in ' + (item[4] || item[3] || 'various years')}; },
    function() { return {q: 'Which country/team dominates ' + item[0] + '?', a: item[2] || 'Varies', hint: 'Think about historical performance', fact: item[0] + ' dominated by ' + (item[2] || 'various teams')}; },
    function() { return {q: 'What format/type is ' + item[0] + '?', a: item[1], hint: 'Understand if it is league, tournament, championship', fact: item[0] + ' is a ' + item[1]}; },
    function() { var s2 = pick(items); return {q: 'Which event is older: ' + item[0] + ' OR ' + s2[0] + '?', a: (item[3] < s2[3]) ? item[0] : s2[0], hint: 'Compare the inaugural years', fact: item[0] + '(' + (item[3] || '?') + '), ' + s2[0] + '(' + (s2[3] || '?') + ')'}; },
    function() { return {q: 'Name the trophy/medal awarded for ' + item[0] + '.', a: item[0], hint: 'The trophy name is often the event name', fact: item[0] + ' awards: ' + item[0]}; },
    function() { return {q: 'Which Indian sportsperson is famous in ' + item[1] + '?', a: 'Sachin Tendulkar/Neeraj Chopra/PV Sindhu/Viswanathan Anand depending on sport', hint: 'Think about Indian legends in this sport', fact: 'India has many achievers in ' + item[1]}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a ' + item[1] + ' tournament.', a: 'True', hint: 'Verify the sport association', fact: item[0] + ' is indeed a ' + item[1] + ' event'}; },
    function() { return {q: 'How often is ' + item[0] + ' held?', a: item[5] || 'Every 1-4 years', hint: 'Major tournaments: FIFA WC (4yr), Olympics (4yr), IPL (annual)', fact: item[0] + (item[5] ? ' held ' + item[5] : ' frequency varies')}; },
    function() { return {q: 'Which of the following describes ' + item[0] + '? A) ' + item[1] + ' B) ' + pick(items)[1] + ' C) ' + pick(items)[1], a: 'A', hint: 'Select the correct description', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Fill in: __________ is the premier ' + item[1] + ' event in the world.', a: item[0], hint: 'Think about global championships', fact: item[0] + ' is a premier ' + item[1] + ' event'}; },
    function() { return {q: 'Which country has the most titles in ' + item[0] + '?', a: item[2] || 'Various', hint: 'Look at historical winners', fact: item[0] + ' most titles: ' + (item[2] || 'various countries')}; }
  ];
  return pick(templates)();
};

GK_GEN2.books = function() {
  var items = GK_DATA.books;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Who wrote "' + item[0] + '"?', a: item[1], hint: 'Think about famous authors of that era', fact: '"' + item[0] + '" by ' + item[1]}; },
    function() { return {q: '"' + item[0] + '" is about?', a: item[2], hint: 'The title gives clues about the theme', fact: '"' + item[0] + '" covers ' + item[2]}; },
    function() { return {q: item[1] + ' is the author of which famous book?', a: item[0], hint: 'Match the author to their iconic work', fact: item[1] + ' wrote "' + item[0] + '"'}; },
    function() { return {q: 'Which award did "' + item[0] + '" win?', a: item[3] || 'Literary acclaim', hint: 'Booker, Pulitzer, Sahitya Akademi, Jnanpith awards', fact: item[0] + (item[3] ? ' won ' + item[3] : ' is critically acclaimed')}; },
    function() { return {q: 'When was "' + item[0] + '" published?', a: item[4] || 'Varies', hint: 'Publication years reflect historical context', fact: item[0] + ' published in ' + (item[4] || 'various editions')}; },
    function() { return {q: 'Which genre does "' + item[0] + '" belong to?', a: item[5] || item[2], hint: 'Fiction, non-fiction, autobiography, mythology', fact: item[0] + ' genre: ' + (item[5] || item[2])}; },
    function() { var b2 = pick(items); return {q: 'Compare: "' + item[0] + '" vs "' + b2[0] + '" — which one is written by ' + item[1] + '?', a: item[0], hint: 'Identify the correct author-book pair', fact: item[1] + ' wrote ' + item[0] + ', not ' + b2[0]}; },
    function() { return {q: 'Who is the protagonist/central figure in "' + item[0] + '"?', a: item[6] || 'Various characters', hint: 'Think about the main character', fact: item[0] + ' features ' + (item[6] || 'various characters')}; },
    function() { return {q: 'True or False: "' + item[0] + '" was written by ' + pick(items)[1] + '.', a: 'False', hint: 'Verify the author attribution', fact: '"' + item[0] + '" is by ' + item[1]}; },
    function() { return {q: '"' + item[0] + '" belongs to which series/trilogy?', a: item[7] || 'Standalone work', hint: 'Many books are part of series', fact: item[0] + (item[7] ? ' is part of ' + item[7] : ' is a standalone work')}; },
    function() { return {q: 'Fill blank: The book "' + item[0] + '" by ' + item[1] + ' deals with __________.', a: item[2], hint: 'Complete the description', fact: item[0] + ': ' + item[2]}; },
    function() { return {q: 'Which Indian author won ' + (item[3] || 'international acclaim') + ' for "' + item[0] + '"?', a: item[1], hint: 'Indian authors who won international awards', fact: item[1] + ' won acclaim for ' + item[0]}; },
    function() { return {q: 'How many pages/volumes does "' + item[0] + '" have?', a: item[8] || 'Standard length', hint: 'Epic novels have many pages', fact: item[0] + (item[8] ? ': ' + item[8] : '')}; },
    function() { return {q: 'Match: ' + item[0] + ' — ' + item[2].substring(0, 40) + '?', a: item[1], hint: 'Link books to their authors', fact: '"' + item[0] + '" by ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.space = function() {
  var items = GK_DATA.space;
  var item = pick(items);
  var templates = [
    function() { return {q: 'When was ' + item[0] + ' launched?', a: item[2] || 'Various dates', hint: 'ISRO milestones: 1975 (Aryabhata), 2008 (Chandrayaan-1), 2013 (Mangalyaan)', fact: item[0] + ' launched in ' + (item[2] || 'various years')}; },
    function() { return {q: 'What is the purpose of ' + item[0] + '?', a: item[1], hint: 'ISRO missions: communication (INSAT), remote sensing (IRS), navigation (NavIC)', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which launch vehicle carried ' + item[0] + '?', a: item[3] || 'PSLV/GSLV/LVM3', hint: 'PSLV for polar, GSLV for geosynchronous, LVM3 for heavy', fact: item[0] + ' launched by ' + (item[3] || 'PSLV/GSLV')}; },
    function() { return {q: 'Which ISRO centre developed ' + item[0] + '?', a: item[4] || 'URSC/SAC/VSSC', hint: 'URSC (satellites), VSSC (launch vehicles), SAC (payloads)', fact: item[0] + ' developed at ' + (item[4] || 'ISRO centres')}; },
    function() { return {q: 'What is unique about ' + item[0] + '?', a: item[5] || item[1], hint: 'First Indian satellite, first moon mission, record launch', fact: item[0] + ': ' + (item[5] || item[1])}; },
    function() { return {q: 'Which country/agency collaborated on ' + item[0] + '?', a: item[6] || 'ISRO alone', hint: 'NASA (NISAR), ESA (Chandrayaan-1 payloads), Russia (Aryabhata)', fact: item[0] + (item[6] ? ' with ' + item[6] : ' by ISRO')}; },
    function() { return {q: 'True or False: ' + item[0] + ' was a successful mission.', a: (item[7] === 'success') ? 'True' : (item[7] === 'partial' ? 'Partly' : 'True'), hint: 'Most ISRO missions are successful', fact: item[0] + (item[7] ? ': ' + item[7] : '')}; },
    function() { var s2 = pick(items); return {q: 'Which mission came first: ' + item[0] + ' or ' + s2[0] + '?', a: (item[2] < s2[2]) ? item[0] : s2[0], hint: 'Compare the launch years', fact: item[0] + '(' + item[2] + '), ' + s2[0] + '(' + s2[2] + ')'}; },
    function() { return {q: 'What payloads/instruments did ' + item[0] + ' carry?', a: item[8] || 'Multiple scientific instruments', hint: 'Missions carry specific instruments for research', fact: item[0] + ' carried ' + (item[8] || 'various payloads')}; },
    function() { return {q: 'How long did ' + item[0] + ' operate?', a: item[9] || 'Designed for 5-10 years', hint: 'Satellites have designed mission life', fact: item[0] + (item[9] ? ' operated for ' + item[9] : '')}; },
    function() { return {q: 'Which orbit does ' + item[0] + ' operate in?', a: item[10] || 'GEO/LEO/SSO', hint: 'GEO (communication), LEO (remote sensing), SSO (sun-synchronous)', fact: item[0] + ' in ' + (item[10] || 'Earth orbit')}; },
    function() { return {q: 'What is the scientific significance of ' + item[0] + '?', a: item[1], hint: 'Water on Moon (Chandrayaan-1), Mars atmosphere (Mangalyaan), solar studies (Aditya)', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which was the first: ' + item[0] + '? (Choose: ' + pick(items)[0] + ', ' + pick(items)[0] + ', ' + pick(items)[0] + ')', a: item[0], hint: 'First Indian satellite, first moon mission, etc.', fact: item[0] + ' is a significant first'}; },
    function() { return {q: 'Fill in: __________ is a ' + (item[11] || 'ISRO') + ' mission for ' + item[1] + '.', a: item[0], hint: 'Complete the mission description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.defence = function() {
  var items = GK_DATA.defence;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' responsible for?', a: item[1], hint: 'Think about the force/organization role', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'When was ' + item[0] + ' established?', a: item[2] || 'Various dates', hint: 'Army (1778), Navy (1612), Air Force (1932), DRDO (1958)', fact: item[0] + ' established ' + (item[2] || 'historically')}; },
    function() { return {q: 'Who is the current chief of ' + item[0] + '?', a: item[3] || 'Current chief varies', hint: 'Army: Gen, Navy: Admiral, Air Force: ACM, Coast Guard: DG', fact: item[0] + ' chief: ' + (item[3] || 'varies')}; },
    function() { return {q: 'Where is the HQ of ' + item[0] + '?', a: item[4] || 'New Delhi', hint: 'Most defence HQ are in New Delhi', fact: item[0] + ' HQ: ' + (item[4] || 'New Delhi')}; },
    function() { return {q: 'What is the strength/personnel of ' + item[0] + '?', a: item[5] || 'Classified/varying', hint: 'Army 1.2M+, Navy 65K+, Air Force 170K+', fact: item[0] + ' personnel: ' + (item[5] || 'classified')}; },
    function() { return {q: 'Which exercise involves ' + item[0] + '?', a: item[6] || 'Multiple exercises', hint: 'Joint exercises with other countries', fact: item[0] + ' participates in ' + (item[6] || 'various exercises')}; },
    function() { return {q: 'What equipment/weapons does ' + item[0] + ' use?', a: item[7] || 'Various equipment', hint: 'Tanks, ships, aircraft, missiles depending on force', fact: item[0] + ' uses ' + (item[7] || 'advanced equipment')}; },
    function() { return {q: 'True or False: ' + item[0] + ' comes under Ministry of Defence.', a: (item[8] === 'MHA') ? 'False' : 'True', hint: 'Most forces under MoD, some paramilitary under MHA', fact: item[0] + ' under ' + (item[8] || 'MoD')}; },
    function() { return {q: 'Which is the ' + item[0] + ' equivalent in other countries?', a: item[9] || 'Similar forces exist globally', hint: 'Army (all), Navy (all), Marines (USMC)', fact: item[0] + ' similar to ' + (item[9] || 'global counterparts')}; },
    function() { return {q: 'What is the motto of ' + item[0] + '?', a: item[10] || 'Service before self', hint: 'Army: Sev Parmo Dharma, Navy: Sham No Varunah, AF: Nabha Sparsham Deeptam', fact: item[0] + ' motto: ' + (item[10] || 'various')}; },
    function() { return {q: 'Which operation was conducted by ' + item[0] + '?', a: item[11] || 'Various operations', hint: 'Op Vijay (Kargil), Op Meghdoot (Siachen), Op Parakram', fact: item[0] + ' conducted ' + (item[11] || 'various operations')}; },
    function() { return {q: 'How many commands does ' + item[0] + ' have?', a: item[12] || 'Multiple commands', hint: 'Army 7, Navy 3, Air Force 7 commands', fact: item[0] + ' has ' + (item[12] || 'several') + ' commands'}; },
    function() { return {q: 'Which academy trains officers for ' + item[0] + '?', a: item[13] || 'IMA/INA/AFA', hint: 'IMA (Dehradun), INA (Ezhimala), AFA (Hyderabad)', fact: item[0] + ' training: ' + (item[13] || 'IMA/INA/AFA')}; },
    function() { return {q: 'Fill in: __________ is the ' + item[1].substring(0, 40) + '... force/establishment.', a: item[0], hint: 'Identify from the description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.national_parks = function() {
  var items = GK_DATA.national_parks;
  var item = pick(items);
  var templates = [
    function() { return {q: item[0] + ' National Park is located in which state?', a: item[1], hint: 'Corbett (Uttarakhand), Kaziranga (Assam), Gir (Gujarat)', fact: item[0] + ' NP is in ' + item[1]}; },
    function() { return {q: 'Which national park is known for ' + (item[3] || 'its wildlife') + '?', a: item[0], hint: 'Match the feature to the park', fact: item[0] + ' NP: ' + (item[3] || item[2])}; },
    function() { return {q: 'When was ' + item[0] + ' National Park established?', a: item[2] || 'Various years', hint: 'Corbett (1936), Kanha (1955), Kaziranga (1974)', fact: item[0] + ' est. ' + (item[2] || 'various')}; },
    function() { return {q: 'Which animal is ' + item[0] + ' National Park famous for?', a: item[3] || 'Multiple species', hint: 'Kaziranga (rhino), Gir (lion), Sundarbans (tiger)', fact: item[0] + ' famous for ' + (item[3] || 'biodiversity')}; },
    function() { return {q: 'Which river/water body flows through ' + item[0] + ' National Park?', a: item[4] || 'Various rivers', hint: 'Many parks are along major rivers', fact: item[0] + ' has ' + (item[4] || 'various water bodies')}; },
    function() { return {q: 'What type of vegetation/terrain does ' + item[0] + ' have?', a: item[5] || 'Forest/grassland/mountain', hint: 'Tropical, deciduous, mangrove, alpine, desert', fact: item[0] + ' terrain: ' + (item[5] || 'various')}; },
    function() { return {q: 'Is ' + item[0] + ' a UNESCO World Heritage site?', a: item[6] || 'No', hint: 'Kaziranga, Manas, Sundarbans, Nanda Devi are UNESCO', fact: item[0] + (item[6] ? ' is UNESCO' : ' is not UNESCO')}; },
    function() { return {q: 'Which tribe/local community lives near ' + item[0] + '?', a: item[7] || 'Various tribal groups', hint: 'Many parks have indigenous communities nearby', fact: item[0] + ' area: ' + (item[7] || 'tribal areas')}; },
    function() { return {q: 'What is the area of ' + item[0] + ' National Park?', a: item[8] || 'Area varies', hint: 'Hemis (largest), Corbett (520 sq km), Kaziranga (430 sq km)', fact: item[0] + ' area: ' + (item[8] || 'varies')}; },
    function() { return {q: 'Which is the nearest city/town to ' + item[0] + '?', a: item[9] || 'Nearest town', hint: 'Ramnagar (Corbett), Dhubri (Manas), Sasan (Gir)', fact: item[0] + ' near ' + (item[9] || 'various towns')}; },
    function() { return {q: 'What is the best time to visit ' + item[0] + '?', a: item[10] || 'Oct-Jun', hint: 'Most parks closed during monsoon (Jul-Sep)', fact: item[0] + ' best time: ' + (item[10] || 'Oct-Jun')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a tiger reserve.', a: item[11] ? 'True' : (item[0].indexOf('Tiger') >= 0 ? 'True' : 'False'), hint: 'Many national parks are also tiger reserves', fact: item[0] + (item[11] ? ' is a tiger reserve' : '')}; },
    function() { return {q: 'Which endangered species is protected in ' + item[0] + '?', a: item[3] || 'Various endangered species', hint: 'One-horned rhino, Asiatic lion, snow leopard, sangai deer', fact: item[0] + ' protects ' + (item[3] || 'endangered species')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' National Park is located in ' + item[1] + ', famous for __________.', a: item[3] || 'wildlife', hint: 'Complete the park description', fact: item[0] + ' (' + item[1] + '): ' + (item[3] || 'diverse wildlife')}; }
  ];
  return pick(templates)();
};

GK_GEN2.dance = function() {
  var items = GK_DATA.dance;
  var item = pick(items);
  var templates = [
    function() { return {q: item[0] + ' is a dance form from which state?', a: item[1], hint: 'Classical: Bharatanatyam (TN), Kathak (UP), Odissi (Odisha)', fact: item[0] + ' is from ' + item[1]}; },
    function() { return {q: 'Is ' + item[0] + ' a classical or folk dance?', a: item[2], hint: '8 classical dances: Bharatanatyam, Kathak, Kathakali, Kuchipudi, Odissi, Manipuri, Mohiniyattam, Sattriya', fact: item[0] + ' is ' + item[2]}; },
    function() { return {q: 'Which dance form is famous for ' + (item[3] || 'its unique style') + '?', a: item[0], hint: 'Descriptive clues about the dance style', fact: item[0] + ': ' + (item[3] || item[1] + ' tradition')}; },
    function() { return {q: 'Who is a famous exponent of ' + item[0] + '?', a: item[4] || 'Various artists', hint: 'Birju Maharaj (Kathak), Rukmini Devi (Bharatanatyam), Kelucharan (Odissi)', fact: item[0] + ' exponent: ' + (item[4] || 'various')}; },
    function() { return {q: 'Which costume is associated with ' + item[0] + '?', a: item[5] || 'Traditional attire', hint: 'Kathakali (elaborate makeup), Odissi (saree), Manipuri (Pungcholom)', fact: item[0] + ' costume: ' + (item[5] || 'traditional')}; },
    function() { return {q: 'Which musical instruments accompany ' + item[0] + '?', a: item[6] || 'Tabla/Mridangam/Veena', hint: 'Bharatanatyam (mridangam), Kathak (tabla), Odissi (pakhawaj)', fact: item[0] + ' music: ' + (item[6] || 'traditional instruments')}; },
    function() { return {q: 'What is the main theme/story of ' + item[0] + '?', a: item[7] || 'Mythological/social themes', hint: 'Kathakali (epics), Bharatanatyam (devotion), Manipuri (Rasleela)', fact: item[0] + ' themes: ' + (item[7] || item[3])}; },
    function() { return {q: 'Which festival features ' + item[0] + ' prominently?', a: item[8] || 'Various festivals', hint: 'Navratri (Garba), Onam (Kathakali), Pongal (folk dances)', fact: item[0] + ' during ' + (item[8] || 'festivals')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is recognized by Sangeet Natak Akademi as classical.', a: (item[2] === 'classical') ? 'True' : 'False', hint: 'SNA recognizes 8 classical dance forms', fact: item[0] + (item[2] === 'classical' ? ' is classical' : ' is folk')}; },
    function() { return {q: 'Which UNESCO tag does ' + item[0] + ' have?', a: item[9] || 'Intangible Cultural Heritage (some)', hint: 'Chhau, Kalbelia, Vedic chanting are UNESCO Intangible Heritage', fact: item[0] + (item[9] ? ': ' + item[9] : '')}; },
    function() { return {q: 'What are the basic steps/movements in ' + item[0] + '?', a: item[10] || item[3], hint: 'Bharatanatyam (adavus), Kathak (chakkars), Odissi (tribhangi)', fact: item[0] + ' features ' + (item[10] || item[3])}; },
    function() { return {q: 'Which state dance is ' + item[0] + '?', a: item[1], hint: 'Origin states of major dance forms', fact: item[0] + ' originated in ' + item[1]}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a ' + item[2] + ' dance from ' + item[1] + ' known for __________.', a: item[3] || 'its grace', hint: 'Complete the dance form description', fact: item[0] + ': ' + (item[3] || 'traditional dance')}; },
    function() { return {q: 'Which is NOT a ' + item[2] + ' dance: ' + item[0] + ', ' + pick(items)[0] + ', ' + pick(items)[0] + '?', a: item[0], hint: 'Identify if the dance is classical or folk', fact: item[0] + ' is ' + item[2]}; }
  ];
  return pick(templates)();
};

GK_GEN2.orgs = function() {
  var items = GK_DATA.orgs;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What does ' + item[0] + ' stand for and what is its purpose?', a: item[1], hint: 'Think about global organizations and their mandates', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'When was ' + item[0] + ' established?', a: item[2] || 'Various years', hint: 'UN (1945), NATO (1949), BRICS (2009), WTO (1995)', fact: item[0] + ' est. ' + (item[2] || 'various')}; },
    function() { return {q: 'Where is the HQ of ' + item[0] + '?', a: item[3] || 'Various locations', hint: 'UN (NY), WHO (Geneva), IMF (Washington DC), UNESCO (Paris)', fact: item[0] + ' HQ: ' + (item[3] || 'various')}; },
    function() { return {q: 'How many members does ' + item[0] + ' have?', a: item[4] || 'Multiple members', hint: 'UN (193), EU (27), NATO (32), ASEAN (10)', fact: item[0] + ' has ' + (item[4] || 'many') + ' members'}; },
    function() { return {q: 'Which countries are the founding/lead members of ' + item[0] + '?', a: item[5] || 'Multiple founding countries', hint: 'Founding members shaped the organization', fact: item[0] + ' founders: ' + (item[5] || 'various')}; },
    function() { return {q: 'What is India\'s role in ' + item[0] + '?', a: item[6] || 'Active member', hint: 'India is founding member of UN, active in G20, BRICS, SCO', fact: 'India in ' + item[0] + ': ' + (item[6] || 'active member')}; },
    function() { return {q: 'Which reports does ' + item[0] + ' publish?', a: item[7] || 'Various reports', hint: 'UNDP (HDI), WHO (World Health Report), IMF (WEO), World Bank (WDR)', fact: item[0] + ' publishes ' + (item[7] || 'reports')}; },
    function() { return {q: 'Who is the current head of ' + item[0] + '?', a: item[8] || 'Current head varies', hint: 'UN (Guterres), WHO (Tedros), IMF (Georgieva), World Bank (Bang)', fact: item[0] + ' head: ' + (item[8] || 'varies')}; },
    function() { return {q: 'What is the official language(s) of ' + item[0] + '?', a: item[9] || 'Multiple languages', hint: 'UN (6 languages), EU (24), ASEAN (English)', fact: item[0] + ' languages: ' + (item[9] || 'multiple')}; },
    function() { return {q: 'True or False: India is a founding member of ' + item[0] + '.', a: (item[10] === 'yes') ? 'True' : 'False', hint: 'India is founding member of UN, NAM, WTO but not NATO, EU', fact: item[0] + (item[10] === 'yes' ? ' India is founding member' : '')}; },
    function() { return {q: 'Which committee/body governs ' + item[0] + '?', a: item[11] || 'Governing body/council', hint: 'UNSC (UN), Executive Board (WHO), Board of Governors (IMF)', fact: item[0] + ' governed by ' + (item[11] || 'governing body')}; },
    function() { return {q: 'What is the budget of ' + item[0] + '?', a: item[12] || 'Billion dollar budget', hint: 'UN budget ~$3B, WHO ~$6B, World Bank ~$100B lending', fact: item[0] + ' budget: ' + (item[12] || 'large budget')}; },
    function() { return {q: 'Which country contributes most to ' + item[0] + '?', a: item[13] || 'USA/China', hint: 'USA is largest contributor to UN, WHO, IMF', fact: item[0] + ' top contributor: ' + (item[13] || 'USA')}; },
    function() { return {q: 'Fill blank: __________ is a ' + (item[14] || 'global') + ' organization working for ' + item[1].substring(0, 50) + '...', a: item[0], hint: 'Identify from description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.awards = function() {
  var items = GK_DATA.awards;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is the ' + item[0] + ' awarded for?', a: item[1], hint: 'Civilian, gallantry, literary, film, sports awards categories', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Who was the first recipient of ' + item[0] + '?', a: item[2] || 'First recipient varies', hint: 'Bharat Ratna: Radhakrishnan, Padma: various', fact: item[0] + ' first: ' + (item[2] || 'various')}; },
    function() { return {q: 'When was ' + item[0] + ' instituted?', a: item[3] || 'Various years', hint: 'Bharat Ratna (1954), Padma (1954), Khel Ratna (1991-92)', fact: item[0] + ' instituted ' + (item[3] || 'various')}; },
    function() { return {q: 'Which year did ' + item[4] + ' win the ' + item[0] + '?', a: item[5] || 'Various years', hint: 'Think about notable recipients and years', fact: item[4] + ' won ' + item[0] + ' in ' + (item[5] || 'various years')}; },
    function() { return {q: 'Who among the following won ' + item[0] + ' recently?', a: item[4] || 'Recent recipients', hint: 'Recent awardees of major Indian awards', fact: item[0] + ' recent: ' + (item[4] || 'various')}; },
    function() { return {q: 'What is the prize money for ' + item[0] + '?', a: item[6] || 'Prize details vary', hint: 'Nobel (~$1M), Bharat Ratna (certificate), Booker (£50K)', fact: item[0] + ' prize: ' + (item[6] || 'varies')}; },
    function() { return {q: 'Which field/domain does ' + item[0] + ' recognize?', a: item[1], hint: 'Civilian (all fields), Gallantry (bravery), Literary (books), Sports', fact: item[0] + ' for ' + item[1]}; },
    function() { return {q: 'Is ' + item[0] + ' a civilian or military award?', a: item[7] || 'Civilian', hint: 'Bharat Ratna (civilian), Param Vir Chakra (military)', fact: item[0] + ' is ' + (item[7] || 'civilian')}; },
    function() { return {q: 'Which organization presents ' + item[0] + '?', a: item[8] || 'Government/Foundation', hint: 'Padma awards (Govt of India), Nobel (Swedish/Norwegian committees)', fact: item[0] + ' by ' + (item[8] || 'respective authority')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is India\'s highest ' + (item[7] || 'civilian') + ' award.', a: (item[9] === 'highest') ? 'True' : 'False', hint: 'Bharat Ratna is highest civilian, PVC is highest gallantry', fact: item[0] + (item[9] === 'highest' ? ' is highest' : '')}; },
    function() { return {q: 'How many people have received ' + item[0] + ' so far?', a: item[10] || 'Limited recipients', hint: 'Bharat Ratna: 53, Nobel: hundreds', fact: item[0] + ' recipients: ' + (item[10] || 'various')}; },
    function() { return {q: 'Which category of ' + item[0] + ' is most prestigious?', a: item[11] || 'Top category', hint: 'Padma award has 4 categories: Ratna > Vibhushan > Bhushan > Shri', fact: item[0] + ': ' + (item[11] || 'top category')}; },
    function() { return {q: 'Fill blank: The ' + item[0] + ' is awarded for ' + item[1].substring(0, 50) + '...', a: item[0], hint: 'Complete the award description', fact: item[0] + ' recognizes ' + item[1]}; },
    function() { return {q: 'Which of these is NOT a ' + item[7] + ' award: ' + item[0] + ', ' + pick(items)[0] + ', ' + pick(items)[0] + '?', a: item[0], hint: 'Categorize the awards correctly', fact: item[0] + ' belongs to ' + (item[7] || 'civilian') + ' category'}; }
  ];
  return pick(templates)();
};

GK_GEN2.dams = function() {
  var items = GK_DATA.dams;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Which river is ' + item[0] + ' dam built on?', a: item[2] || 'Various rivers', hint: 'Bhakra (Sutlej), Hirakud (Mahanadi), Tehri (Bhagirathi)', fact: item[0] + ' on ' + (item[2] || 'river')}; },
    function() { return {q: item[0] + ' dam is located in which state?', a: item[1], hint: 'Dams are concentrated in specific river basins', fact: item[0] + ' in ' + item[1]}; },
    function() { return {q: 'What is the height/length of ' + item[0] + ' dam?', a: item[3] || 'Height varies', hint: 'Tehri (260m tallest), Hirakud (4.8km longest), Bhakra (226m)', fact: item[0] + ' dimensions: ' + (item[3] || 'varies')}; },
    function() { return {q: 'What is the purpose of ' + item[0] + ' dam?', a: item[4] || 'Irrigation/Hydro/Flood control', hint: 'Multipurpose: irrigation + hydro + flood control', fact: item[0] + ' purpose: ' + (item[4] || 'multipurpose')}; },
    function() { return {q: 'When was ' + item[0] + ' dam completed?', a: item[5] || 'Various years', hint: 'Bhakra (1963), Hirakud (1957), Tehri (2006)', fact: item[0] + ' completed ' + (item[5] || 'varies')}; },
    function() { return {q: 'What is the capacity of ' + item[0] + ' dam?', a: item[6] || 'Capacity varies', hint: 'Indira Sagar (12.2B m3 largest reservoir capacity)', fact: item[0] + ' capacity: ' + (item[6] || 'varies')}; },
    function() { return {q: 'Which type of dam is ' + item[0] + '?', a: item[7] || 'Gravity/Arch/Embankment', hint: 'Bhakra (gravity), Idukki (arch), Tehri (embankment)', fact: item[0] + ' is a ' + (item[7] || 'dam')}; },
    function() { return {q: 'Which city/region benefits from ' + item[0] + ' dam?', a: item[8] || 'Downstream regions', hint: 'Dams provide water/ power to specific regions', fact: item[0] + ' benefits ' + (item[8] || 'downstream area')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a multipurpose dam.', a: (item[4] && item[4].indexOf('irrigation') >= 0) ? 'True' : 'True', hint: 'Most major Indian dams are multipurpose', fact: item[0] + ' is multipurpose'}; },
    function() { return {q: 'Which is older: ' + item[0] + ' or ' + pick(items)[0] + '?', a: item[0], hint: 'Compare completion years', fact: item[0] + ' vs other dams'}; },
    function() { return {q: 'What disputes surround ' + item[0] + ' dam?', a: item[9] || 'Interstate disputes', hint: 'Cauvery (TN/KA), Krishna (AP/TG), Narmada (multi-state), Mullaperiyar (KL/TN)', fact: item[0] + (item[9] ? ': ' + item[9] : '')}; },
    function() { return {q: 'Which agency built ' + item[0] + '?', a: item[10] || 'State/Central agencies', hint: 'NHPC, NTPC, state irrigation departments, WAPCOS', fact: item[0] + ' built by ' + (item[10] || 'govt agency')}; },
    function() { return {q: 'What is the hydroelectric capacity of ' + item[0] + '?', a: item[11] || 'MW capacity varies', hint: 'Koyna (1960 MW), Tehri (1000 MW), Bhakra (1325 MW)', fact: item[0] + ' generates ' + (item[11] || 'hydro power')}; },
    function() { return {q: 'Fill blank: The ' + item[0] + ' dam is constructed across the ' + (item[2] || 'river') + ' river in ' + item[1] + '.', a: item[0], hint: 'Complete the dam details', fact: item[0] + ': ' + item[1] + ', ' + (item[2] || 'river')}; }
  ];
  return pick(templates)();
};

GK_GEN2.important_days = function() {
  var items = GK_DATA.important_days;
  var item = pick(items);
  var templates = [
    function() { return {q: 'When is ' + item[0] + ' celebrated?', a: item[1], hint: 'Match the day to its date', fact: item[0] + ' on ' + item[1] + ': ' + item[2]}; },
    function() { return {q: 'Why is ' + item[0] + ' observed?', a: item[2], hint: 'Understand the significance behind the observance', fact: item[0] + ': ' + item[2]}; },
    function() { return {q: 'Which day is observed on ' + item[1] + '?', a: item[0], hint: 'Think about national and international days on this date', fact: item[1] + ' is ' + item[0] + ': ' + item[2]}; },
    function() { return {q: 'Who/which event is commemorated on ' + item[0] + '?', a: item[3] || item[2], hint: 'Birth anniversaries, historical events, UN observances', fact: item[0] + ' commemorates ' + (item[3] || item[2])}; },
    function() { return {q: 'Since when is ' + item[0] + ' observed?', a: item[4] || 'Various start years', hint: 'Some days started recently, some are decades old', fact: item[0] + ' since ' + (item[4] || 'various years')}; },
    function() { return {q: 'Which organization/UN body sponsors ' + item[0] + '?', a: item[5] || 'UN/National agencies', hint: 'UNESCO, WHO, UNEP, UNGA, Government of India', fact: item[0] + ' sponsored by ' + (item[5] || 'various')}; },
    function() { return {q: 'What is the theme of ' + item[0] + ' in the current year?', a: item[6] || 'Theme varies annually', hint: 'Each year has a specific theme for major days', fact: item[0] + ' theme: ' + (item[6] || 'varies')}; },
    function() { return {q: 'Is ' + item[0] + ' a national or international day?', a: item[7] || 'National/International', hint: 'National (India-specific) vs International (UN global)', fact: item[0] + ' is ' + (item[7] || 'a day')}; },
    function() { return {q: 'Which colour/symbol is associated with ' + item[0] + '?', a: item[8] || 'Various symbols', hint: 'Red ribbon (AIDS), Pink (Cancer), Blue (UN)', fact: item[0] + ' symbol: ' + (item[8] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a gazetted holiday in India.', a: (item[9] === 'holiday') ? 'True' : 'False', hint: 'Republic Day, Independence Day, Gandhi Jayanti are holidays', fact: item[0] + (item[9] === 'holiday' ? ' is holiday' : '')}; },
    function() { return {q: 'Which related days are close to ' + item[0] + '?', a: item[10] || 'Nearby observances', hint: 'Many days cluster in the same month/week', fact: item[0] + ' nearby: ' + (item[10] || 'other days')}; },
    function() { return {q: 'How is ' + item[0] + ' typically observed?', a: item[11] || 'Events/awareness campaigns', hint: 'Flag hoisting, parades, seminars, campaigns', fact: item[0] + ' observed with ' + (item[11] || 'various activities')}; },
    function() { return {q: 'Fill blank: __________ is observed on ' + item[1] + ' to ' + item[2].substring(0, 60) + '...', a: item[0], hint: 'Complete the day name from date and purpose', fact: item[0] + ': ' + item[1] + ' — ' + item[2]}; },
    function() { return {q: 'Which of these days falls on ' + item[1] + ': ' + item[0] + ', ' + pick(items)[0] + ', ' + pick(items)[0] + '?', a: item[0], hint: 'Select the correct day for this date', fact: item[1] + ' is ' + item[0]}; }
  ];
  return pick(templates)();
};

GK_GEN2.history = function() {
  var items = GK_DATA.history;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What period does ' + item[0] + ' belong to?', a: item[1], hint: 'Ancient, medieval, modern periods in Indian history', fact: item[0] + ': ' + item[1] + '. ' + item[3]}; },
    function() { return {q: 'Who were the key rulers of ' + item[0] + '?', a: item[2], hint: 'Think about founders and great rulers of the dynasty', fact: item[0] + ' rulers: ' + item[2]}; },
    function() { return {q: 'What is ' + item[0] + ' known for?', a: item[3], hint: 'Each period has distinctive achievements', fact: item[0] + ': ' + item[3]}; },
    function() { return {q: 'Which year/century did ' + item[0] + ' begin?', a: item[1], hint: 'Match the period to its timeframe', fact: item[0] + ' timeline: ' + item[1]}; },
    function() { return {q: 'Which modern state/region corresponds to ' + item[0] + '?', a: item[4] || 'Various regions', hint: 'Maurya (Bihar), Gupta (UP/MP), Chola (TN), Mughal (North India)', fact: item[0] + ' in ' + (item[4] || 'multiple regions')}; },
    function() { return {q: 'What caused the decline of ' + item[0] + '?', a: item[5] || 'Multiple factors', hint: 'Invasions, internal conflicts, economic decline', fact: item[0] + ' declined due to ' + (item[5] || 'various factors')}; },
    function() { return {q: 'Which important battle involves ' + item[0] + '?', a: item[6] || 'Key battles', hint: 'Plassey (1757), Panipat (1526/1556/1761), Plassey (1757)', fact: item[0] + ' battles: ' + (item[6] || 'various')}; },
    function() { return {q: 'Which religion/literature flourished in ' + item[0] + '?', a: item[7] || 'Various religions', hint: 'Buddhism (Maurya), Hinduism (Gupta), Islam (Delhi Sultanate)', fact: item[0] + ' saw ' + (item[7] || 'cultural development')}; },
    function() { return {q: 'What is the archaeological evidence for ' + item[0] + '?', a: item[8] || 'Various sites', hint: 'Harappa (IVC), Sanchi (Maurya), Hampi (Vijayanagara)', fact: item[0] + ' sites: ' + (item[8] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' existed before the Common Era.', a: (item[1] && item[1].indexOf('BC') >= 0) ? 'True' : 'False', hint: 'Check the time period for BC/AD', fact: item[0] + (item[1].indexOf('BC') >= 0 ? ' is BCE' : ' is CE')}; },
    function() { return {q: 'Which contemporary civilization/dynasty coexisted with ' + item[0] + '?', a: item[9] || 'Various contemporaries', hint: 'Gupta coexisted with Huns, Mughal with Maratha, Vijayanagara', fact: item[0] + ' contemporaries: ' + (item[9] || 'various')}; },
    function() { return {q: 'What was the capital of ' + item[0] + '?', a: item[10] || 'Various capitals', hint: 'Pataliputra (Maurya/Gupta), Delhi (Sultanate/Mughal), Hampi (Vijayanagara)', fact: item[0] + ' capital: ' + (item[10] || 'varies')}; },
    function() { return {q: 'Which foreign traveler visited ' + item[0] + '?', a: item[11] || 'Various travelers', hint: 'Megasthenes (Maurya), Hiuen Tsang (Harsha), Ibn Battuta (Tughlaq)', fact: item[0] + ' visited by ' + (item[11] || 'various travelers')}; },
    function() { return {q: 'Fill blank: The __________ period (' + item[1] + ') is known for ' + item[3] + '.', a: item[0], hint: 'Complete the historical period', fact: item[0] + ': ' + item[3]}; }
  ];
  return pick(templates)();
};

GK_GEN2.geography = function() {
  var items = GK_DATA.geography;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Where is ' + item[0] + ' located?', a: item[1], hint: 'Think about the region/state/country', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What is the highest point of ' + item[0] + '?', a: item[2] || 'Various peaks', hint: 'Mountains have specific highest peaks', fact: item[0] + ' highest: ' + (item[2] || 'various')}; },
    function() { return {q: 'Why is ' + item[0] + ' geographically significant?', a: item[3], hint: 'Rivers, mountains, deserts, forests — each has unique importance', fact: item[0] + ' significance: ' + item[3]}; },
    function() { return {q: 'What is the climate/vegetation of ' + item[0] + '?', a: item[4] || 'Various climates', hint: 'Tropical, desert, alpine, monsoon, coastal', fact: item[0] + ' climate: ' + (item[4] || 'varies')}; },
    function() { return {q: 'Which rivers flow through ' + item[0] + '?', a: item[5] || 'Various rivers', hint: 'Major rivers flow through specific regions', fact: item[0] + ' rivers: ' + (item[5] || 'various')}; },
    function() { return {q: 'What is the area/extent of ' + item[0] + '?', a: item[6] || 'Area varies', hint: 'Thar (200K sq km), Himalayas (2400 km length)', fact: item[0] + ' area: ' + (item[6] || 'varies')}; },
    function() { return {q: 'Which states/regions does ' + item[0] + ' cover?', a: item[7] || 'Multiple states', hint: 'Western Ghats (MH/KA/KL/TN), Himalayas (multiple states)', fact: item[0] + ' covers: ' + (item[7] || 'various')}; },
    function() { return {q: 'What minerals/resources are found in ' + item[0] + '?', a: item[8] || 'Various resources', hint: 'Coal (Damodar), Iron (Odisha), Oil (Mumbai High)', fact: item[0] + ' resources: ' + (item[8] || 'various')}; },
    function() { return {q: 'Which cities/towns are located in ' + item[0] + '?', a: item[9] || 'Various cities', hint: 'Major cities are located in specific geographic regions', fact: item[0] + ' cities: ' + (item[9] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is part of the Deccan Plateau.', a: (item[10] === 'deccan') ? 'True' : 'False', hint: 'Peninsular India is mostly Deccan Plateau', fact: item[0] + (item[10] === 'deccan' ? ' is in Deccan' : '')}; },
    function() { return {q: 'Which national park/wildlife sanctuary is in ' + item[0] + '?', a: item[11] || 'Various parks', hint: 'Many parks are located in specific geographic features', fact: item[0] + ' parks: ' + (item[11] || 'various')}; },
    function() { return {q: 'What is the economic importance of ' + item[0] + '?', a: item[3], hint: 'Agriculture, tourism, minerals, hydropower, trade routes', fact: item[0] + ' economic role: ' + item[3]}; },
    function() { return {q: 'Which is the ' + item[0] + ' equivalent in other continents?', a: item[12] || 'Similar features globally', hint: 'Himalayas (Andes), Thar (Sahara), Western Ghats (Andes)', fact: item[0] + ' similar to ' + (item[12] || 'global features')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a ' + (item[13] || 'geographic') + ' feature located in ' + item[1] + '.', a: item[0], hint: 'Complete the geographic description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.economy = function() {
  var items = GK_DATA.economy;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in the Indian economy context?', a: item[1], hint: 'Economic concepts: GDP, inflation, fiscal deficit, repo rate', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What is the current value/rate of ' + item[0] + '?', a: item[2] || 'Value varies annually', hint: 'Repo rate ~6.5%, GDP growth ~7%, inflation ~5%', fact: item[0] + ' currently: ' + (item[2] || 'varies')}; },
    function() { return {q: 'Who regulates ' + item[0] + ' in India?', a: item[3] || 'RBI/SEBI/IRDAI/PFRDA', hint: 'RBI (banking), SEBI (markets), IRDAI (insurance)', fact: item[0] + ' regulated by ' + (item[3] || 'regulatory body')}; },
    function() { return {q: 'Which year was ' + item[0] + ' introduced/established?', a: item[4] || 'Various years', hint: 'GST (2017), Insolvency Code (2016), RBI (1935)', fact: item[0] + ' established ' + (item[4] || 'varies')}; },
    function() { return {q: 'What is the impact of ' + item[0] + ' on the common citizen?', a: item[5] || item[1], hint: 'Inflation affects purchasing power, interest rates affect loans', fact: item[0] + ' impacts: ' + (item[5] || item[1])}; },
    function() { return {q: 'How does ' + item[0] + ' compare with other countries?', a: item[6] || 'India-specific context', hint: 'India GDP 5th largest, inflation moderate, forex reserves $600B+', fact: item[0] + ' comparison: ' + (item[6] || 'varies')}; },
    function() { return {q: 'Which recent budget/reform affected ' + item[0] + '?', a: item[7] || 'Various reforms', hint: 'Union Budget, GST Council, Monetary Policy Committee decisions', fact: item[0] + ' reforms: ' + (item[7] || 'various')}; },
    function() { return {q: 'What is the budget allocation for ' + item[0] + '?', a: item[8] || 'Budget varies', hint: 'Major sectors: defence, health, education, agriculture', fact: item[0] + ' budget: ' + (item[8] || 'varies by year')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a direct tax.', a: (item[9] === 'direct') ? 'True' : 'False', hint: 'Direct (income/corporate) vs Indirect (GST/customs/excise)', fact: item[0] + (item[9] === 'direct' ? ' is direct tax' : ' is indirect tax')}; },
    function() { return {q: 'Which index measures ' + item[0] + '?', a: item[10] || 'Various indices', hint: 'CPI/WPI (inflation), GDP deflator, IIP (industry), Nifty/Sensex (markets)', fact: item[0] + ' measured by ' + (item[10] || 'indices')}; },
    function() { return {q: 'What is the contribution of ' + item[0] + ' to GDP?', a: item[11] || 'Percentage varies', hint: 'Agriculture ~16%, Industry ~28%, Services ~56%', fact: item[0] + ' GDP share: ' + (item[11] || 'varies')}; },
    function() { return {q: 'Which committee recommended reforms in ' + item[0] + '?', a: item[12] || 'Various committees', hint: 'Kelkar (fiscal), Narasimham (banking), Urjit Patel (monetary)', fact: item[0] + ' committee: ' + (item[12] || 'various')}; },
    function() { return {q: 'What is the target/goal for ' + item[0] + ' under current policy?', a: item[13] || 'Policy target varies', hint: 'Inflation target 4%+/-2%, fiscal deficit <4.5% by 2025-26', fact: item[0] + ' target: ' + (item[13] || 'varies')}; },
    function() { return {q: 'Fill blank: __________ is ' + item[1].substring(0, 60) + '... in the Indian economy.', a: item[0], hint: 'Complete the economic term from description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.science = function() {
  var items = GK_DATA.science;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + '?', a: item[1], hint: 'Basic definitions in physics, chemistry, biology', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What is the formula/law for ' + item[0] + '?', a: item[2] || item[1], hint: 'F=ma (Newton), E=mc^2 (Einstein), V=IR (Ohm)', fact: item[0] + ' formula: ' + (item[2] || item[1])}; },
    function() { return {q: 'Who discovered ' + item[0] + '?', a: item[3] || 'Various scientists', hint: 'Newton (gravity), Einstein (relativity), Pasteur (vaccination)', fact: item[0] + ' discovered by ' + (item[3] || 'various scientists')}; },
    function() { return {q: 'What is the unit of ' + item[0] + '?', a: item[4] || 'SI unit', hint: 'Force (Newton), Energy (Joule), Power (Watt), Current (Ampere)', fact: item[0] + ' unit: ' + (item[4] || 'SI unit')}; },
    function() { return {q: 'What are the applications of ' + item[0] + '?', a: item[5] || item[1], hint: 'Real-world uses of scientific principles', fact: item[0] + ' applications: ' + (item[5] || item[1])}; },
    function() { return {q: 'Which part of the human body relates to ' + item[0] + '?', a: item[6] || 'Various organs', hint: 'Heart (circulation), Lungs (respiration), Brain (nervous system)', fact: item[0] + ' in ' + (item[6] || 'human body')}; },
    function() { return {q: 'What is the speed/rate/value of ' + item[0] + '?', a: item[7] || 'Standard value', hint: 'Speed of light 3x10^8 m/s, gravity 9.8 m/s^2', fact: item[0] + ' value: ' + (item[7] || 'standard value')}; },
    function() { return {q: 'Which branch of science studies ' + item[0] + '?', a: item[8] || 'Physics/Chemistry/Biology', hint: 'Mechanics (physics), Organic (chemistry), Genetics (biology)', fact: item[0] + ' in ' + (item[8] || 'science')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a fundamental force of nature.', a: (item[9] === 'force') ? 'True' : 'False', hint: '4 fundamental forces: gravitational, electromagnetic, strong, weak nuclear', fact: item[0] + (item[9] === 'force' ? ' is fundamental force' : '')}; },
    function() { return {q: 'How is ' + item[0] + ' different from ' + pick(items)[0] + '?', a: item[1] + ' vs ' + pick(items)[1], hint: 'Compare related scientific concepts', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which Indian scientist contributed to ' + item[0] + '?', a: item[10] || 'C.V. Raman/APJ Kalam/Homi Bhabha', hint: 'Raman (Raman Effect), Bose (Boson), Kalam (missiles)', fact: item[0] + ' Indian contribution: ' + (item[10] || 'various')}; },
    function() { return {q: 'What is the environmental impact of ' + item[0] + '?', a: item[11] || 'Various impacts', hint: 'Pollution, climate change, renewable energy applications', fact: item[0] + ' impact: ' + (item[11] || 'varies')}; },
    function() { return {q: 'Which year was ' + item[0] + ' discovered/formulated?', a: item[12] || 'Year varies', hint: 'Quantum mechanics (1900), Relativity (1905), DNA (1953)', fact: item[0] + ' discovered ' + (item[12] || 'varies')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is the study of ' + item[1].substring(0, 60) + '...', a: item[0], hint: 'Complete the scientific concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.environment = function() {
  var items = GK_DATA.environment;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + '?', a: item[1], hint: 'Ecological concepts: ecosystem, biodiversity, biome, food chain', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Why is ' + item[0] + ' important for the environment?', a: item[2] || item[1], hint: 'Biodiversity, climate regulation, resource provision', fact: item[0] + ' importance: ' + (item[2] || item[1])}; },
    function() { return {q: 'Which species is associated with ' + item[0] + '?', a: item[3] || 'Various species', hint: 'Keystone species, flagship species, indicator species', fact: item[0] + ' species: ' + (item[3] || 'various')}; },
    function() { return {q: 'What are the threats to ' + item[0] + '?', a: item[4] || 'Various threats', hint: 'Deforestation, pollution, climate change, poaching, habitat loss', fact: item[0] + ' threats: ' + (item[4] || 'various')}; },
    function() { return {q: 'Which Indian location/region is known for ' + item[0] + '?', a: item[5] || 'Various regions', hint: 'Western Ghats (biodiversity), Himalayas (glaciers), Sundarbans (mangroves)', fact: item[0] + ' in India: ' + (item[5] || 'various')}; },
    function() { return {q: 'What conservation measures protect ' + item[0] + '?', a: item[6] || 'Various measures', hint: 'Protected areas, legislations, international conventions', fact: item[0] + ' conservation: ' + (item[6] || 'various')}; },
    function() { return {q: 'Which international convention relates to ' + item[0] + '?', a: item[7] || 'UNFCCC/CBD/Ramsar/CITES', hint: 'Climate (UNFCCC), Biodiversity (CBD), Wetlands (Ramsar), Trade (CITES)', fact: item[0] + ' convention: ' + (item[7] || 'various')}; },
    function() { return {q: 'What is the current status/trend of ' + item[0] + '?', a: item[8] || 'Status varies', hint: 'Forest cover increasing, glaciers melting, species endangered', fact: item[0] + ' status: ' + (item[8] || 'varies')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is found only in India.', a: (item[9] === 'endemic') ? 'True' : 'False', hint: 'Many species are endemic to specific regions', fact: item[0] + (item[9] === 'endemic' ? ' is endemic' : '')}; },
    function() { return {q: 'Which report/assessment covers ' + item[0] + '?', a: item[10] || 'Various reports', hint: 'IPCC (climate), ISFR (forest), Living Planet (WWF)', fact: item[0] + ' report: ' + (item[10] || 'various')}; },
    function() { return {q: 'What is the economic value of ' + item[0] + '?', a: item[11] || 'Ecosystem services value', hint: 'Ecotourism, carbon sequestration, water purification', fact: item[0] + ' value: ' + (item[11] || 'significant')}; },
    function() { return {q: 'How does climate change affect ' + item[0] + '?', a: item[12] || 'Various impacts', hint: 'Glacial melt, sea level rise, species migration', fact: item[0] + ' & climate change: ' + (item[12] || 'impacted')}; },
    function() { return {q: 'Which Indian law protects ' + item[0] + '?', a: item[13] || 'Wildlife Protection Act/EPA/FCA', hint: 'Wildlife Act 1972, Forest Act 1980, EPA 1986', fact: item[0] + ' legal protection: ' + (item[13] || 'various laws')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is ' + item[1].substring(0, 60) + '... found in ' + (item[5] || 'various regions') + '.', a: item[0], hint: 'Complete environment concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.culture = function() {
  var items = GK_DATA.culture;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in Indian culture?', a: item[1], hint: 'Art forms, music, paintings, architecture, festivals', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which region/state is ' + item[0] + ' from?', a: item[2] || item[1], hint: 'Each art form originates from a specific region', fact: item[0] + ' from ' + (item[2] || item[1])}; },
    function() { return {q: 'Who is a famous artist of ' + item[0] + '?', a: item[3] || 'Various artists', hint: 'Master artists associated with specific art forms', fact: item[0] + ' artist: ' + (item[3] || 'various')}; },
    function() { return {q: 'Which period/dynasty saw the development of ' + item[0] + '?', a: item[4] || 'Various periods', hint: 'Mughal (miniature), Chola (bronze), Gupta (sculpture)', fact: item[0] + ' flourished in ' + (item[4] || 'various periods')}; },
    function() { return {q: 'What materials/techniques are used in ' + item[0] + '?', a: item[5] || item[1], hint: 'Oil on canvas, marble, bronze, cloth, natural dyes', fact: item[0] + ' technique: ' + (item[5] || item[1])}; },
    function() { return {q: 'Which UNESCO tag does ' + item[0] + ' have?', a: item[6] || 'Intangible/World Heritage', hint: 'UNESCO Intangible Cultural Heritage lists many Indian traditions', fact: item[0] + (item[6] ? ': ' + item[6] : '')}; },
    function() { return {q: 'What is the religious/spiritual significance of ' + item[0] + '?', a: item[7] || item[1], hint: 'Temples, dances, music often have spiritual roots', fact: item[0] + ' significance: ' + (item[7] || item[1])}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a UNESCO World Heritage site.', a: (item[6] && item[6].indexOf('World Heritage') >= 0) ? 'True' : 'False', hint: '42 UNESCO World Heritage sites in India', fact: item[0] + (item[6] && item[6].indexOf('World Heritage') >= 0 ? ' is UNESCO' : '')}; },
    function() { return {q: 'Which festival features ' + item[0] + '?', a: item[8] || 'Various festivals', hint: 'Diwali, Navratri, Pongal, Onam, Durga Puja', fact: item[0] + ' during ' + (item[8] || 'festivals')}; },
    function() { return {q: 'How old is the tradition of ' + item[0] + '?', a: item[9] || 'Centuries old', hint: 'Many Indian traditions are thousands of years old', fact: item[0] + ' age: ' + (item[9] || 'ancient')}; },
    function() { return {q: 'Which modern museum/institution preserves ' + item[0] + '?', a: item[10] || 'National Museum/NGMA', hint: 'National Museum (Delhi), CSMVS (Mumbai), Indian Museum (Kolkata)', fact: item[0] + ' preserved at ' + (item[10] || 'various museums')}; },
    function() { return {q: 'What is the main theme/subject of ' + item[0] + '?', a: item[11] || item[1], hint: 'Mythology, nature, royal court, daily life', fact: item[0] + ' themes: ' + (item[11] || item[1])}; },
    function() { return {q: 'Which other culture influenced ' + item[0] + '?', a: item[12] || 'Various influences', hint: 'Persian, Central Asian, European influences on Indian art', fact: item[0] + ' influenced by ' + (item[12] || 'various')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a traditional ' + (item[13] || 'Indian art/cultural') + ' form from ' + (item[2] || 'India') + '.', a: item[0], hint: 'Complete the cultural description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.world_geo = function() {
  var items = GK_DATA.world_geo;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is the capital of ' + item[0] + '?', a: item[1], hint: 'Major countries: China=Beijing, USA=DC, UK=London, France=Paris', fact: item[0] + ' capital: ' + item[1]}; },
    function() { return {q: 'What is the currency of ' + item[0] + '?', a: item[2], hint: 'Major currencies: USD, Euro, Yen, Yuan, Pound, Rupee', fact: item[0] + ' currency: ' + item[2]}; },
    function() { return {q: 'Which country has ' + item[1] + ' as its capital?', a: item[0], hint: 'Match the capital to the country', fact: item[1] + ' is capital of ' + item[0]}; },
    function() { return {q: 'Which continent is ' + item[0] + ' in?', a: item[3], hint: '7 continents: Asia, Africa, N America, S America, Europe, Australia, Antarctica', fact: item[0] + ' is in ' + item[3]}; },
    function() { return {q: 'What is ' + item[0] + ' famous for?', a: item[4] || item[1], hint: 'Think about unique features, landmarks, resources', fact: item[0] + ': ' + (item[4] || item[1])}; },
    function() { return {q: 'Which is the largest city of ' + item[0] + '?', a: item[5] || item[1], hint: 'Many countries have largest cities different from capital', fact: item[0] + ' largest city: ' + (item[5] || item[1])}; },
    function() { return {q: 'What language(s) are spoken in ' + item[0] + '?', a: item[6] || 'Multiple languages', hint: 'National/official languages of various countries', fact: item[0] + ' language: ' + (item[6] || 'various')}; },
    function() { return {q: 'What is the population of ' + item[0] + '?', a: item[7] || 'Population varies', hint: 'China (1.4B), India (1.4B), USA (330M), Indonesia (270M)', fact: item[0] + ' population: ' + (item[7] || 'varies')}; },
    function() { return {q: 'Which border/fence/feature separates ' + item[0] + ' from its neighbours?', a: item[8] || 'Geographic boundaries', hint: 'Himalayas (India-China), Rio Grande (US-Mexico), English Channel (UK-France)', fact: item[0] + ' borders: ' + (item[8] || 'various')}; },
    function() { return {q: 'What is the area/rank of ' + item[0] + '?', a: item[9] || 'Area varies', hint: 'Russia (largest), Canada (2nd), USA (3rd), China (4th)', fact: item[0] + ' area rank: ' + (item[9] || 'varies')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a landlocked country.', a: (item[10] === 'landlocked') ? 'True' : 'False', hint: 'Landlocked: Nepal, Bhutan, Austria, Hungary, Switzerland', fact: item[0] + (item[10] === 'landlocked' ? ' is landlocked' : ' has coastline')}; },
    function() { return {q: 'Which is the national animal/bird of ' + item[0] + '?', a: item[11] || 'Various national symbols', hint: 'India (tiger/peacock), USA (bald eagle), Australia (kangaroo)', fact: item[0] + ' symbol: ' + (item[11] || 'various')}; },
    function() { return {q: 'What is the time zone of ' + item[0] + '?', a: item[12] || 'UTC+ varies', hint: 'India (UTC+5:30), Japan (UTC+9), UK (UTC+0), USA (UTC-5 to -8)', fact: item[0] + ' time zone: ' + (item[12] || 'varies')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a country in ' + item[3] + ' with capital ' + item[1] + ' and currency ' + item[2] + '.', a: item[0], hint: 'Complete the country profile', fact: item[0] + ': ' + item[1] + ', ' + item[2] + ', ' + item[3]}; }
  ];
  return pick(templates)();
};

GK_GEN2.computers = function() {
  var items = GK_DATA.computers;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in computing?', a: item[1], hint: 'Hardware, software, networking, security concepts', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which technology/concept is described as: ' + item[1] + '?', a: item[0], hint: 'Identify from definition', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What are the key features of ' + item[0] + '?', a: item[2] || item[1], hint: 'Speed, capacity, reliability, compatibility, security', fact: item[0] + ' features: ' + (item[2] || item[1])}; },
    function() { return {q: 'Which real-world applications use ' + item[0] + '?', a: item[3] || item[1], hint: 'Business, education, healthcare, defence, entertainment', fact: item[0] + ' applications: ' + (item[3] || item[1])}; },
    function() { return {q: 'Who invented ' + item[0] + '?', a: item[4] || 'Various inventors', hint: 'Babbage (computer), Berners-Lee (web), Torvalds (Linux)', fact: item[0] + ' invented by ' + (item[4] || 'various')}; },
    function() { return {q: 'What is the difference between ' + item[0] + ' and ' + pick(items)[0] + '?', a: item[1] + ' vs ' + pick(items)[1], hint: 'Compare related technologies', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which company/products are associated with ' + item[0] + '?', a: item[5] || 'Various companies', hint: 'Microsoft (Windows), Intel (CPU), NVIDIA (GPU), Oracle (DB)', fact: item[0] + ' companies: ' + (item[5] || 'various')}; },
    function() { return {q: 'What is the latest version of ' + item[0] + '?', a: item[6] || 'Latest version varies', hint: 'Windows 11, Python 3.13, Android 15, iOS 19', fact: item[0] + ' latest: ' + (item[6] || 'varies')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is an open-source technology.', a: (item[7] === 'open') ? 'True' : 'False', hint: 'Linux/Python/VS Code (open), Windows/MS Office (proprietary)', fact: item[0] + (item[7] === 'open' ? ' is open source' : '')}; },
    function() { return {q: 'What security issues affect ' + item[0] + '?', a: item[8] || 'Various issues', hint: 'Viruses, hacking, data breaches, phishing, ransomware', fact: item[0] + ' security: ' + (item[8] || 'various')}; },
    function() { return {q: 'How has ' + item[0] + ' evolved over time?', a: item[9] || item[1], hint: 'Generations: vacuum tubes, transistors, ICs, microprocessors, AI', fact: item[0] + ' evolution: ' + (item[9] || item[1])}; },
    function() { return {q: 'Which programming language is best for ' + item[0] + '?', a: item[10] || 'Various languages', hint: 'Python (AI/ML), C++ (games), Java (enterprise), JavaScript (web)', fact: item[0] + ' language: ' + (item[10] || 'various')}; },
    function() { return {q: 'What is the market share of ' + item[0] + '?', a: item[11] || 'Market share varies', hint: 'Windows (~70%), Android (~70%), Intel CPU (~80%)', fact: item[0] + ' market: ' + (item[11] || 'varies')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is ' + item[1].substring(0, 60) + '... used in ' + (item[3] || 'computing') + '.', a: item[0], hint: 'Complete the computer concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.polity = function() {
  var items = GK_DATA.polity;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + '?', a: item[1], hint: 'Key concepts in Indian Constitution, Parliament, Judiciary', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which Article/Part of Constitution deals with ' + item[0] + '?', a: item[2] || 'Various articles', hint: 'Art 14 (equality), Art 32 (remedies), Part III (FRs)', fact: item[0] + ' under ' + (item[2] || 'Constitution')}; },
    function() { return {q: 'Which institution is responsible for ' + item[0] + '?', a: item[3] || 'Parliament/Courts/Executive', hint: 'SC (judiciary), EC (elections), CAG (audit), UPSC (recruitment)', fact: item[0] + ' institution: ' + (item[3] || 'various')}; },
    function() { return {q: 'What is the composition of ' + item[0] + '?', a: item[4] || item[1], hint: 'Lok Sabha (543), Rajya Sabha (245), SC (34 judges)', fact: item[0] + ' composition: ' + (item[4] || item[1])}; },
    function() { return {q: 'What is the term/tenure of ' + item[0] + '?', a: item[5] || 'Fixed term', hint: 'LS (5yr), RS (6yr), President (5yr), SC judge (65yr)', fact: item[0] + ' term: ' + (item[5] || 'varies')}; },
    function() { return {q: 'Which case/law established ' + item[0] + '?', a: item[6] || 'Landmark cases', hint: 'Kesavananda (basic structure), Maneka Gandhi (Art 21), Golaknath', fact: item[0] + ' established by ' + (item[6] || 'various cases')}; },
    function() { return {q: 'How is the head of ' + item[0] + ' appointed?', a: item[7] || 'Appointment procedure varies', hint: 'President (elected), CJI (by President), CEC (by President)', fact: item[0] + ' appointment: ' + (item[7] || 'varies')}; },
    function() { return {q: 'What are the powers/functions of ' + item[0] + '?', a: item[8] || item[1], hint: 'Legislative, executive, judicial, financial, electoral powers', fact: item[0] + ' powers: ' + (item[8] || item[1])}; },
    function() { return {q: 'Which amendment changed ' + item[0] + '?', a: item[9] || 'Various amendments', hint: '42nd (mini-Constitution), 73rd (Panchayat), 101st (GST)', fact: item[0] + ' amended by ' + (item[9] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a constitutional body.', a: (item[10] === 'constitutional') ? 'True' : 'False', hint: 'Constitutional (EC/CAG/UPSC) vs Statutory (NHRC/CVC) bodies', fact: item[0] + (item[10] === 'constitutional' ? ' is constitutional' : '')}; },
    function() { return {q: 'What is the relation between ' + item[0] + ' and ' + pick(items)[0] + '?', a: item[1] + ' — checks and balances', hint: 'Separation of powers, federal structure, parliamentary system', fact: item[0] + ' & ' + pick(items)[0] + ' interaction'}; },
    function() { return {q: 'Which country\'s constitution influenced India\'s ' + item[0] + '?', a: item[11] || 'Various constitutions', hint: 'UK (parliamentary), USA (FRs), Ireland (DPSP), Canada (federal)', fact: item[0] + ' borrowed from ' + (item[11] || 'various')}; },
    function() { return {q: 'What is the budget/expenditure of ' + item[0] + '?', a: item[12] || 'Budget varies', hint: 'Election Commission, Supreme Court, CAG budgets', fact: item[0] + ' budget: ' + (item[12] || 'varies')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is ' + item[1].substring(0, 60) + '... under ' + (item[2] || 'Constitution') + '.', a: item[0], hint: 'Complete the polity concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.state_gk = function() {
  var items = GK_DATA.state_gk;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is the capital of ' + item[0] + '?', a: item[1], hint: 'Jaipur (Rajasthan), Bengaluru (Karnataka), Chennai (TN), Lucknow (UP)', fact: item[0] + ' capital: ' + item[1]}; },
    function() { return {q: 'Who is the current Chief Minister of ' + item[0] + '?', a: item[2] || 'Current CM', hint: 'CMs of major states change periodically', fact: item[0] + ' CM: ' + (item[2] || 'varies')}; },
    function() { return {q: 'Which state has ' + item[1] + ' as its capital?', a: item[0], hint: 'Match the capital to its state', fact: item[1] + ' is capital of ' + item[0]}; },
    function() { return {q: 'What is the official language of ' + item[0] + '?', a: item[3] || item[0], hint: 'Hindi (UP/Bihar/MP/Raj), Telugu (AP/TG), Tamil (TN), Kannada (KA)', fact: item[0] + ' language: ' + (item[3] || 'varies')}; },
    function() { return {q: 'Which dance form is associated with ' + item[0] + '?', a: item[4] || 'Various dances', hint: 'Kathak (UP), Odissi (Odisha), Bhangra (Punjab), Garba (Gujarat)', fact: item[0] + ' dance: ' + (item[4] || 'various')}; },
    function() { return {q: 'What is the state animal of ' + item[0] + '?', a: item[5] || 'Varies', hint: 'Tiger (MP/WB), Lion (Gujarat), Rhino (Assam), Elephant (KA/KL)', fact: item[0] + ' animal: ' + (item[5] || 'various')}; },
    function() { return {q: 'What is the state bird of ' + item[0] + '?', a: item[6] || 'Varies', hint: 'Indian Roller (KA/AP/TG), Peacock (Punjab), Great Hornbill (KL/AP)', fact: item[0] + ' bird: ' + (item[6] || 'various')}; },
    function() { return {q: 'When was ' + item[0] + ' formed?', a: item[7] || 'Formation date varies', hint: 'Nov 1, 1956 (reorganization), Nov 2000 (new states), 2014 (Telangana)', fact: item[0] + ' formed: ' + (item[7] || 'varies')}; },
    function() { return {q: 'Which tourist destination is ' + item[0] + ' famous for?', a: item[8] || item[1], hint: 'Taj Mahal (UP), Hampi (KA), Khajuraho (MP), Mysore (KA)', fact: item[0] + ' tourism: ' + (item[8] || 'various')}; },
    function() { return {q: 'What is the state flower/tree of ' + item[0] + '?', a: item[9] || item[10] || 'Varies', hint: 'Lotus (several states), Banyan (many), Ashoka, Neem, Peepal', fact: item[0] + ' symbols: flower=' + (item[9] || 'varies') + ', tree=' + (item[10] || 'varies')}; },
    function() { return {q: 'What is the area rank of ' + item[0] + '?', a: item[11] || 'Rank varies', hint: 'Rajasthan (largest, 1st), MP (2nd), Maharashtra (3rd), UP (4th)', fact: item[0] + ' area rank: ' + (item[11] || 'varies')}; },
    function() { return {q: 'Which major river flows through ' + item[0] + '?', a: item[12] || 'Various rivers', hint: 'Ganga (UP/Bihar/WB), Godavari (MH/TG/AP), Krishna (KA/TG/AP)', fact: item[0] + ' rivers: ' + (item[12] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' has a coastline.', a: (item[13] === 'coastal') ? 'True' : 'False', hint: 'Coastal states: GJ/MH/KA/KL/TN/AP/OD/WB', fact: item[0] + (item[13] === 'coastal' ? ' has coastline' : ' is landlocked')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a state in ' + (item[14] || 'India') + ' with capital ' + item[1] + '.', a: item[0], hint: 'Complete the state profile', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.personalities = function() {
  var items = GK_DATA.personalities;
  var item = pick(items);
  var templates = [
    function() { return {q: 'Who is ' + item[0] + '?', a: item[1], hint: 'Think about their field: freedom fighter, scientist, artist, sportsperson', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which personality is described as: ' + item[1] + '?', a: item[0], hint: 'Match the description to the famous person', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'When was ' + item[0] + ' born and died?', a: item[2] || 'Dates vary', hint: 'Gandhi (1869-1948), Nehru (1889-1964), Kalam (1931-2015)', fact: item[0] + ' life: ' + (item[2] || 'varies')}; },
    function() { return {q: 'What is the famous quote/contribution of ' + item[0] + '?', a: item[3] || item[1], hint: 'Famous words and achievements define these personalities', fact: item[0] + ': ' + (item[3] || item[1])}; },
    function() { return {q: 'Which award did ' + item[0] + ' win?', a: item[4] || 'Various awards', hint: 'Bharat Ratna, Nobel, Padma, Oscar, Khel Ratna', fact: item[0] + ' awards: ' + (item[4] || 'various')}; },
    function() { return {q: 'What is the educational background of ' + item[0] + '?', a: item[5] || 'Various', hint: 'Many great leaders studied abroad or at top Indian institutions', fact: item[0] + ' education: ' + (item[5] || 'varies')}; },
    function() { return {q: 'Which organisation/institution did ' + item[0] + ' found?', a: item[6] || 'Various institutions', hint: 'Tata (Tata Group), Bhabha (BARC), Sarabhai (ISRO), Ambedkar (Buddhist)', fact: item[0] + ' founded ' + (item[6] || 'various')}; },
    function() { return {q: 'What movement/campaign is ' + item[0] + ' associated with?', a: item[7] || item[1], hint: 'Non-cooperation (Gandhi), Swadeshi (Tilak), Self-respect (Periyar)', fact: item[0] + ' movement: ' + (item[7] || item[1])}; },
    function() { return {q: 'Which book/autobiography did ' + item[0] + ' write?', a: item[8] || 'Various books', hint: 'Wings of Fire (Kalam), Discovery of India (Nehru), Gitanjali (Tagore)', fact: item[0] + ' wrote: ' + (item[8] || 'various')}; },
    function() { return {q: 'True or False: ' + item[0] + ' received Bharat Ratna.', a: (item[9] === 'bharat ratna') ? 'True' : 'False', hint: 'Bharat Ratna recipients include Gandhi (not), Nehru, Ambedkar, Kalam', fact: item[0] + (item[9] === 'bharat ratna' ? ' got Bharat Ratna' : '')}; },
    function() { return {q: 'Which position/office did ' + item[0] + ' hold?', a: item[10] || 'Various positions', hint: 'President, PM, CM, Governor, Chief Justice, Speaker', fact: item[0] + ' held: ' + (item[10] || 'various offices')}; },
    function() { return {q: 'How is ' + item[0] + ' remembered today?', a: item[11] || item[1], hint: 'Legacy of great personalities in modern India', fact: item[0] + ' legacy: ' + (item[11] || item[1])}; },
    function() { return {q: 'Which family/dynasty does ' + item[0] + ' belong to?', a: item[12] || 'Various families', hint: 'Nehru-Gandhi family, Patel family, Tata family', fact: item[0] + ' family: ' + (item[12] || 'varies')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is known as ' + (item[13] || 'a famous Indian') + ' who ' + item[1].substring(0, 50) + '...', a: item[0], hint: 'Complete the personality profile', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.ir = function() {
  var items = GK_DATA.ir;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in international relations?', a: item[1], hint: 'Global groupings, treaties, organizations, doctrines', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'When was ' + item[0] + ' formed/signed?', a: item[2] || 'Various dates', hint: 'Quad (2017), BRICS (2009), NAM (1961), Paris Agreement (2015)', fact: item[0] + ' established ' + (item[2] || 'varies')}; },
    function() { return {q: 'Which countries are members of ' + item[0] + '?', a: item[3] || 'Multiple countries', hint: 'Quad (US/India/Japan/Australia), SAARC (8 S Asian), BRICS (11)', fact: item[0] + ' members: ' + (item[3] || 'various')}; },
    function() { return {q: 'What is India\'s role in ' + item[0] + '?', a: item[4] || 'Active participant', hint: 'India is member/founder/observer in various groupings', fact: 'India & ' + item[0] + ': ' + (item[4] || 'active member')}; },
    function() { return {q: 'Where is the headquarters of ' + item[0] + '?', a: item[5] || 'Various HQs', hint: 'UN (NY), WHO (Geneva), IMF (Washington DC), BRICS (Shanghai)', fact: item[0] + ' HQ: ' + (item[5] || 'varies')}; },
    function() { return {q: 'What is the main objective of ' + item[0] + '?', a: item[6] || item[1], hint: 'Peace, security, trade, development, climate action', fact: item[0] + ' objective: ' + (item[6] || item[1])}; },
    function() { return {q: 'Which recent summit/meeting of ' + item[0] + ' was notable?', a: item[7] || 'Various summits', hint: 'G20 Delhi (2023), BRICS Johannesburg (2023), COP28 (2023)', fact: item[0] + ' summit: ' + (item[7] || 'varies')}; },
    function() { return {q: 'What controversies surround ' + item[0] + '?', a: item[8] || 'Various issues', hint: 'Reform, membership expansion, funding, effectiveness debates', fact: item[0] + ' issues: ' + (item[8] || 'various')}; },
    function() { return {q: 'True or False: India is a permanent member of ' + item[0] + '.', a: (item[9] === 'permanent') ? 'True' : 'False', hint: 'India is not permanent member of UNSC, but is founding member of NAM/WTO', fact: item[0] + (item[9] === 'permanent' ? ' India is permanent member' : '')}; },
    function() { return {q: 'How does ' + item[0] + ' compare with similar organizations?', a: item[10] || item[1], hint: 'UN vs NATO, BRICS vs G7, SAARC vs ASEAN', fact: item[0] + ' comparison: ' + (item[10] || item[1])}; },
    function() { return {q: 'What funding/budget does ' + item[0] + ' have?', a: item[11] || 'Budget varies', hint: 'UN ($3B), IMF ($1T lending), World Bank ($100B+), BRICS ($100B NDB)', fact: item[0] + ' funding: ' + (item[11] || 'varies')}; },
    function() { return {q: 'Which agreements/treaties fall under ' + item[0] + '?', a: item[12] || 'Various agreements', hint: 'Paris Agreement (UNFCCC), NPT (IAEA), WTO agreements', fact: item[0] + ' treaties: ' + (item[12] || 'various')}; },
    function() { return {q: 'What is the future outlook for ' + item[0] + '?', a: item[13] || item[1], hint: 'Reforms, expansion, relevance in changing world order', fact: item[0] + ' future: ' + (item[13] || item[1])}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a ' + (item[14] || 'global/regional') + ' organization formed in ' + (item[2] || 'various years') + '.', a: item[0], hint: 'Complete the IR concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.society = function() {
  var items = GK_DATA.society;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in the Indian social context?', a: item[1], hint: 'Social issues: caste, poverty, education, health, gender', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'What are the key statistics related to ' + item[0] + '?', a: item[2] || item[1], hint: 'Sex ratio 940, poverty 11%, literacy 74%, SC 16.6%', fact: item[0] + ' stats: ' + (item[2] || item[1])}; },
    function() { return {q: 'Which government scheme addresses ' + item[0] + '?', a: item[3] || 'Various schemes', hint: 'PM Jan Dhan (financial), Beti Bachao (gender), Ayushman (health)', fact: item[0] + ' schemes: ' + (item[3] || 'various')}; },
    function() { return {q: 'What legal framework addresses ' + item[0] + '?', a: item[4] || 'Various laws', hint: 'SC/ST Act, POCSO, Domestic Violence Act, RTE, EPA', fact: item[0] + ' laws: ' + (item[4] || 'various')}; },
    function() { return {q: 'Which NGOs/movements work on ' + item[0] + '?', a: item[5] || 'Various organizations', hint: 'MKSS (RTI), Bachpan Bachao (child), Pratham (education)', fact: item[0] + ' organizations: ' + (item[5] || 'various')}; },
    function() { return {q: 'What are the challenges in addressing ' + item[0] + '?', a: item[6] || 'Various challenges', hint: 'Implementation gaps, awareness, funding, social resistance', fact: item[0] + ' challenges: ' + (item[6] || 'various')}; },
    function() { return {q: 'How does ' + item[0] + ' vary across Indian states?', a: item[7] || 'State-wise variation', hint: 'Kerala (high literacy, low poverty), Bihar (low literacy, high poverty)', fact: item[0] + ' regional: ' + (item[7] || 'varies')}; },
    function() { return {q: 'What is the historical background of ' + item[0] + '?', a: item[8] || item[1], hint: 'Caste (ancient), Poverty (colonial legacy), Education (post-independence)', fact: item[0] + ' history: ' + (item[8] || item[1])}; },
    function() { return {q: 'What international comparisons exist for ' + item[0] + '?', a: item[9] || 'Global context', hint: 'India\'s HDI rank, gender gap index, poverty rate vs other nations', fact: item[0] + ' globally: ' + (item[9] || 'varies')}; },
    function() { return {q: 'True or False: ' + item[0] + ' has improved in the last decade.', a: (item[10] === 'improved') ? 'True' : 'True', hint: 'Most social indicators are gradually improving', fact: item[0] + ' trend: ' + (item[10] || 'improving')}; },
    function() { return {q: 'Which recent policy reform impacted ' + item[0] + '?', a: item[11] || 'Recent reforms', hint: 'NEP 2020 (education), 106th Amendment (women), labour codes', fact: item[0] + ' reforms: ' + (item[11] || 'various')}; },
    function() { return {q: 'What is the urban-rural divide in ' + item[0] + '?', a: item[12] || item[1], hint: 'Urban areas have better access to education, health, infrastructure', fact: item[0] + ' urban vs rural: ' + (item[12] || item[1])}; },
    function() { return {q: 'Which constitutional provisions relate to ' + item[0] + '?', a: item[13] || 'Various articles', hint: 'Art 15 (caste/sex), Art 17 (untouchability), Art 21A (education)', fact: item[0] + ' constitutional: ' + (item[13] || 'various')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is a key social issue in India affecting ' + (item[2] || 'millions') + ' people.', a: item[0], hint: 'Complete the social issue description', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

GK_GEN2.ethics = function() {
  var items = GK_DATA.ethics;
  var item = pick(items);
  var templates = [
    function() { return {q: 'What is ' + item[0] + ' in ethics?', a: item[1], hint: 'Ethical theories: Utilitarianism, Deontology, Virtue, Justice', fact: item[0] + ': ' + item[1]}; },
    function() { return {q: 'Which philosopher is associated with ' + item[0] + '?', a: item[2] || 'Various philosophers', hint: 'Kant (deontology), Bentham/Mill (utilitarianism), Aristotle (virtue)', fact: item[0] + ' philosopher: ' + (item[2] || 'various')}; },
    function() { return {q: 'What is the main criticism of ' + item[0] + '?', a: item[3] || 'Various criticisms', hint: 'Utilitarianism (minority rights), Deontology (rigidity), Virtue (vague)', fact: item[0] + ' criticism: ' + (item[3] || 'various')}; },
    function() { return {q: 'How is ' + item[0] + ' applied in public administration/civil services?', a: item[4] || item[1], hint: 'Transparency, accountability, integrity, impartiality in governance', fact: item[0] + ' in admin: ' + (item[4] || item[1])}; },
    function() { return {q: 'What is the difference between ' + item[0] + ' and ' + pick(items)[0] + '?', a: item[1] + ' vs ' + pick(items)[1], hint: 'Compare different ethical frameworks', fact: item[0] + ' vs ' + pick(items)[0]}; },
    function() { return {q: 'Which case study/example illustrates ' + item[0] + '?', a: item[5] || 'Various examples', hint: 'Kesavananda (basic structure), Bhopal gas (utilitarian vs rights)', fact: item[0] + ' example: ' + (item[5] || 'various')}; },
    function() { return {q: 'What core values does ' + item[0] + ' emphasize?', a: item[6] || item[1], hint: 'Justice, care, rights, duty, character, welfare', fact: item[0] + ' values: ' + (item[6] || item[1])}; },
    function() { return {q: 'True or False: ' + item[0] + ' is a consequentialist ethical theory.', a: (item[7] === 'consequentialist') ? 'True' : 'False', hint: 'Consequentialist: utilitarianism. Non-consequentialist: deontology, rights', fact: item[0] + (item[7] === 'consequentialist' ? ' is consequentialist' : '')}; },
    function() { return {q: 'How does ' + item[0] + ' relate to Indian Constitutional values?', a: item[8] || item[1], hint: 'Justice, liberty, equality, fraternity in the Preamble', fact: item[0] + ' & Constitution: ' + (item[8] || item[1])}; },
    function() { return {q: 'Which global ethical framework aligns with ' + item[0] + '?', a: item[9] || 'Various frameworks', hint: 'UN Declaration of Human Rights, SDGs, Paris Agreement', fact: item[0] + ' global: ' + (item[9] || 'various')}; },
    function() { return {q: 'What is the contemporary relevance of ' + item[0] + '?', a: item[10] || item[1], hint: 'AI ethics, climate ethics, business ethics, bioethics', fact: item[0] + ' today: ' + (item[10] || item[1])}; },
    function() { return {q: 'Which ethical dilemma involves ' + item[0] + '?', a: item[11] || 'Various dilemmas', hint: 'Trolley problem (utilitarian vs deontological), whistleblowing', fact: item[0] + ' dilemma: ' + (item[11] || 'various')}; },
    function() { return {q: 'What books/references cover ' + item[0] + '?', a: item[12] || 'Various texts', hint: 'Nicomachean Ethics (Aristotle), Groundwork (Kant), Utilitarianism (Mill)', fact: item[0] + ' references: ' + (item[12] || 'various')}; },
    function() { return {q: 'Fill blank: ' + item[0] + ' is ' + item[1].substring(0, 60) + '... emphasizing ' + (item[6] || 'ethical values') + '.', a: item[0], hint: 'Complete the ethical concept', fact: item[0] + ': ' + item[1]}; }
  ];
  return pick(templates)();
};

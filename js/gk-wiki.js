var WIKI = {};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

WIKI._seenTitles = [];
WIKI._seenValues = [];
WIKI._pool = [];
WIKI._poolSize = 5000;
WIKI._prefetching = false;
WIKI._sourceIndex = 0;

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

// Type-specific distractor pools for same-category options
WIKI._distractorTypes = {
  person: ['Gandhi', 'Nehru', 'Patel', 'Ambedkar', 'Bose', 'Shastri', 'Vajpayee', 'Modi',
    'Newton', 'Einstein', 'Shakespeare', 'Plato', 'Aristotle', 'Buddha', 'Alexander', 'Caesar',
    'Napoleon', 'Lincoln', 'Washington', 'Churchill', 'Mandela', 'Raman', 'Tagore', 'Teresa',
    'Bhabha', 'Kalam', 'Sachin', 'Lata', 'Premchand', 'Vivekananda', 'Ramanujan', 'Aryabhata',
    'Chanakya', 'Ashoka', 'Akbar', 'Shivaji', 'Tipu', 'Lakshmibai', 'Bhagat Singh', 'Tilak',
    'Indira', 'Rajiv', 'Kohli', 'Dhoni', 'Tendulkar', 'Messi', 'Ronaldo', 'Pele', 'Federer', 'Bolt',
    'Mirabai', 'Kabir', 'Tulsidas', 'Aurobindo', 'Radhakrishnan', 'Susruta', 'Charaka',
    'President', 'Prime Minister', 'Governor', 'Chief Minister', 'Speaker', 'Chief Justice'],
  place: ['India', 'China', 'United States', 'United Kingdom', 'Russia', 'Japan', 'Brazil',
    'France', 'Germany', 'Australia', 'Canada', 'Italy', 'Spain', 'South Korea', 'Indonesia',
    'Bangladesh', 'Pakistan', 'Nepal', 'Sri Lanka', 'Egypt', 'South Africa', 'Nigeria',
    'Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad',
    'London', 'Paris', 'New York', 'Tokyo', 'Beijing', 'Berlin', 'Rome', 'Moscow', 'Sydney',
    'Ganga', 'Yamuna', 'Brahmaputra', 'Godavari', 'Krishna', 'Kaveri', 'Narmada', 'Indus',
    'Nile', 'Amazon', 'Yangtze', 'Mississippi', 'Danube', 'Himalayas', 'Western Ghats',
    'Thar Desert', 'Deccan Plateau', 'Alps', 'Andes', 'Rockies', 'Everest', 'K2',
    'Asia', 'Africa', 'Europe', 'South America', 'North America', 'Bay of Bengal',
    'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arabian Sea', 'Mediterranean'],
  org: ['United Nations', 'WHO', 'IMF', 'World Bank', 'UNESCO', 'UNICEF', 'NATO', 'WTO',
    'SAARC', 'BRICS', 'European Union', 'African Union', 'ASEAN', 'OPEC',
    'ISRO', 'NASA', 'DRDO', 'BARC', 'Supreme Court', 'Parliament', 'Election Commission',
    'RBI', 'SEBI', 'NITI Aayog', 'UPSC', 'AIIMS', 'IIT', 'IIM',
    'Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Samsung'],
  event: ['World War I', 'World War II', 'Cold War', 'Industrial Revolution', 'Renaissance',
    'French Revolution', 'American Revolution', 'Russian Revolution', 'Green Revolution',
    'Battle of Plassey', 'Battle of Panipat', 'Jallianwala Bagh',
    'Quit India', 'Salt March', 'Kargil War', 'Gulf War', 'Vietnam War'],
  concept: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Geology',
    'Economics', 'Psychology', 'Sociology', 'Philosophy', 'History', 'Geography',
    'Democracy', 'Communism', 'Socialism', 'Capitalism', 'Secularism'],
  living: ['Tiger', 'Lion', 'Elephant', 'Peacock', 'Eagle', 'Shark', 'Whale', 'Dolphin',
    'Python', 'Cobra', 'Rose', 'Lotus', 'Sandalwood', 'Neem', 'Banyan', 'Peepal'],
  work: ['Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Vedas', 'Upanishads', 'Arthashastra',
    'Godan', 'Gitanjali', 'Guide', 'Malgudi Days', 'Harry Potter', '1984', 'Animal Farm'],
  year: ['1947', '1950', '1962', '1971', '1991', '1998', '2000', '2014', '2016', '2019']
};
WIKI._seenTypes = {};

// Topic banks — each maps to a Wikipedia category for bulk fetching
WIKI._categoryTopics = [
  // === HISTORY — World ===
  'Category:World_history','Category:Ancient_history','Category:Medieval_history','Category:Modern_history',
  'Category:Ancient_Egypt','Category:Ancient_Greece','Category:Ancient_Rome','Category:Roman_Empire',
  'Category:Byzantine_Empire','Category:Persian_Empire','Category:Mongol_Empire','Category:Ottoman_Empire',
  'Category:Chinese_dynasties','Category:History_of_China','Category:History_of_Japan','Category:History_of_Russia',
  'Category:History_of_France','Category:History_of_Germany','Category:History_of_United_Kingdom',
  'Category:History_of_the_United_States','Category:History_of_Africa','Category:History_of_South_America',
  'Category:History_of_Australia','Category:History_of_the_Middle_East','Category:European_history',
  'Category:Asian_history','Category:African_history','Category:American_history',
  'Category:World_War_I','Category:World_War_II','Category:Cold_War','Category:French_Revolution',
  'Category:Industrial_Revolution','Category:Renaissance','Category:Age_of_Exploration',
  'Category:Colonialism','Category:Imperialism','Category:Decolonization',
  // === HISTORY — India ===
  'Category:History_of_India','Category:Ancient_India','Category:Medieval_India','Category:Modern_India',
  'Category:Indus_Valley_Civilisation','Category:Vedic_period','Category:Maurya_Empire','Category:Gupta_Empire',
  'Category:Delhi_Sultanate','Category:Mughal_Empire','Category:Maratha_Empire','Category:Vijayanagara_Empire',
  'Category:British_Raj','Category:Indian_independence_movement','Category:Indian_freedom_fighters',
  'Category:Indian_National_Army','Category:Partition_of_India','Category:Post-independence_history_of_India',
  // === GEOGRAPHY — World ===
  'Category:Geography','Category:Physical_geography','Category:Human_geography','Category:Political_geography',
  'Category:World_geography','Category:Continents','Category:Countries','Category:Capitals',
  'Category:Rivers','Category:Mountains','Category:Oceans','Category:Seas','Category:Lakes','Category:Islands',
  'Category:Deserts','Category:Forests','Category:Volcanoes','Category:Peninsulas','Category:Gulfs','Category:Bays',
  'Category:Straits','Category:Canals','Category:Waterfalls','Category:Glaciers','Category:Caves',
  'Category:Climate','Category:Biomes','Category:Time_zones','Category:Map_projections',
  // === GEOGRAPHY — India ===
  'Category:Geography_of_India','Category:Indian_rivers','Category:Himalayas','Category:Western_Ghats',
  'Category:Eastern_Ghats','Category:Indian_coastal_geography','Category:Indian_climate','Category:Indian_monsoon',
  'Category:Indian_soil','Category:Indian_vegetation','Category:Indian_ports','Category:Indian_states_and_territories',
  'Category:Indian_borders','Category:Indian_geological_regions','Category:Indian_islands',
  // === SCIENCE — General ===
  'Category:Science','Category:Scientific_method','Category:History_of_science','Category:Nobel_laureates_in_science',
  'Category:Physics','Category:Classical_mechanics','Category:Thermodynamics','Category:Electromagnetism',
  'Category:Quantum_mechanics','Category:Relativity','Category:Nuclear_physics','Category:Particle_physics',
  'Category:Optics','Category:Acoustics','Category:Fluid_dynamics','Category:Astrophysics',
  'Category:Chemistry','Category:Organic_chemistry','Category:Inorganic_chemistry','Category:Physical_chemistry',
  'Category:Analytical_chemistry','Category:Biochemistry','Category:Polymer_chemistry','Category:Environmental_chemistry',
  'Category:Biology','Category:Cell_biology','Category:Genetics','Category:Evolutionary_biology','Category:Ecology',
  'Category:Molecular_biology','Category:Microbiology','Category:Zoology','Category:Botany','Category:Anatomy',
  'Category:Physiology','Category:Neuroscience','Category:Immunology','Category:Virology','Category:Bacteriology',
  'Category:Human_body','Category:Animal_biology','Category:Plant_biology','Category:Marine_biology',
  'Category:Astronomy','Category:Solar_System','Category:Stars','Category:Galaxies','Category:Planetary_science',
  'Category:Cosmology','Category:Space_exploration','Category:Mathematics','Category:Algebra','Category:Geometry',
  'Category:Calculus','Category:Statistics','Category:Number_theory','Category:Logic',
  'Category:Geology','Category:Mineralogy','Category:Seismology','Category:Volcanology','Category:Oceanography',
  'Category:Meteorology','Category:Paleontology','Category:Archaeology','Category:Anthropology',
  // === TECHNOLOGY ===
  'Category:Technology','Category:History_of_technology','Category:Inventions','Category:Discoveries',
  'Category:Computer_science','Category:Artificial_intelligence','Category:Robotics','Category:Machine_learning',
  'Category:Data_science','Category:Cybersecurity','Category:Telecommunications','Category:Internet',
  'Category:Software_engineering','Category:Computer_hardware','Category:Programming_languages',
  'Category:Space_technology','Category:Nuclear_technology','Category:Biotechnology','Category:Nanotechnology',
  'Category:Renewable_energy','Category:Electrical_engineering','Category:Mechanical_engineering',
  'Category:Civil_engineering','Category:Chemical_engineering','Category:Aerospace_engineering',
  'Category:Genetic_engineering','Category:Medical_technology','Category:Digital_technology',
  // === ECONOMICS & FINANCE ===
  'Category:Economics','Category:Macroeconomics','Category:Microeconomics','Category:International_economics',
  'Category:Development_economics','Category:Economic_history','Category:Economic_systems',
  'Category:Finance','Category:Banking','Category:Stock_market','Category:International_trade',
  'Category:Taxation','Category:Monetary_policy','Category:Fiscal_policy','Category:Economic_indicators',
  'Category:Indian_economy','Category:Indian_budget','Category:Indian_banking','Category:Indian_financial_system',
  'Category:Indian_taxation','Category:Indian_agriculture','Category:Indian_industry','Category:Indian_energy',
  'Category:Indian_minerals','Category:Indian_companies','Category:Indian_brands','Category:Indian_startups',
  'Category:RBI','Category:SEBI','Category:NITI_Aayog','Category:Five-Year_Plans_of_India',
  // === POLITY & POLITICS ===
  'Category:Political_science','Category:Forms_of_government','Category:Political_ideologies',
  'Category:Democracy','Category:Dictatorship','Category:Monarchy','Category:Federalism',
  'Category:International_relations','Category:United_Nations','Category:World_Trade_Organization',
  'Category:International_Monetary_Fund','Category:World_Bank','Category:NATO','Category:European_Union',
  'Category:African_Union','Category:ASEAN','Category:SAARC','Category:BRICS','Category:G20','Category:Commonwealth',
  'Category:Indian_politics','Category:Indian_constitution','Category:Indian_judiciary','Category:Indian_government',
  'Category:Indian_parliament','Category:Indian_president','Category:Indian_prime_minister',
  'Category:Indian_elections','Category:Indian_election_commission','Category:Indian_political_parties',
  'Category:Indian_emergency_provisions','Category:Indian_fundamental_rights','Category:Indian_directive_principles',
  'Category:Indian_federalism','Category:Indian_local_government','Category:Indian_union_territories',
  'Category:Indian_law','Category:Indian_foreign_relations','Category:Indian_defence','Category:Indian_armed_forces',
  'Category:Indian_missiles','Category:Indian_nuclear_program','Category:Indian_borders',
  'Category:Government_schemes_of_India','Category:Indian_awards','Category:Indian_national_symbols',
  // === CULTURE — World ===
  'Category:Culture','Category:World_culture','Category:Philosophy','Category:Religion','Category:Mythology',
  'Category:Literature','Category:World_literature','Category:Poetry','Category:Drama','Category:Novels',
  'Category:Music','Category:World_music','Category:Painting','Category:Sculpture','Category:Architecture',
  'Category:Cinema','Category:Theatre','Category:Dance','Category:Photography','Category:Art_movements',
  'Category:World_Heritage_Sites','Category:UNESCO','Category:Nobel_Prize_in_Literature',
  'Category:Nobel_Peace_Prize_laureates',
  // === CULTURE — India ===
  'Category:Indian_culture','Category:Indian_art','Category:Indian_architecture','Category:Indian_sculpture',
  'Category:Indian_painting','Category:Indian_philosophy','Category:Indian_religions','Category:Indian_mythology',
  'Category:Indian_literature','Category:Indian_writers','Category:Indian_poets','Category:Indian_authors',
  'Category:Indian_music','Category:Indian_classical_musicians','Category:Indian_folk_music',
  'Category:Indian_musical_instruments','Category:Indian_dance','Category:Indian_classical_dancers',
  'Category:Indian_folk_dance','Category:Indian_cinema','Category:Bollywood','Category:Indian_film_directors',
  'Category:Indian_actors','Category:Indian_singers','Category:Indian_festivals','Category:Indian_temples',
  'Category:Indian_monuments','Category:Indian_languages','Category:Indian_textiles','Category:Indian_cuisine',
  'Category:Indian_tribes','Category:Indian_costumes','Category:Indian_jewelry','Category:Indian_calendars',
  'Category:UNESCO_World_Heritage_Sites_in_India',
  // === SPORTS ===
  'Category:Sports','Category:Olympics','Category:Olympic_sports','Category:Olympic_medalists',
  'Category:Cricket','Category:Football','Category:Tennis','Category:Basketball','Category:Baseball',
  'Category:Hockey','Category:Badminton','Category:Chess','Category:Athletics','Category:Swimming',
  'Category:Boxing','Category:Wrestling','Category:Judo','Category:Taekwondo','Category:Weightlifting',
  'Category:Gymnastics','Category:Cycling','Category:Archery','Category:Shooting','Category:Equestrian',
  'Category:Rugby','Category:Golf','Category:Formula_One','Category:Motor_sports','Category:Volleyball',
  'Category:Table_tennis','Category:Kabaddi','Category:Indian_sports','Category:Indian_cricketers',
  'Category:Indian_Olympic_medalists','Category:Cricket_in_India','Category:Hockey_in_India',
  'Category:Indian_tennis_players','Category:Indian_badminton','Category:Indian_chess',
  'Category:Sports_in_India','Category:Indian_sports_personalities',
  // === ENVIRONMENT & ECOLOGY ===
  'Category:Environment','Category:Ecology','Category:Biodiversity','Category:Conservation',
  'Category:Climate_change','Category:Climate_change_in_India','Category:Environmental_issues',
  'Category:Environmental_issues_in_India','Category:Natural_disasters','Category:Endangered_species',
  'Category:National_parks','Category:National_parks_of_India','Category:Wildlife_sanctuaries_of_India',
  'Category:Bird_sanctuaries_of_India','Category:Biosphere_reserves_of_India','Category:Ramsar_sites_in_India',
  'Category:Indian_wildlife','Category:Indian_forests','Category:Indian_mangroves','Category:Indian_coral_reefs',
  'Category:Indian_wetlands','Category:Pollution','Category:Air_pollution','Category:Water_pollution',
  'Category:Deforestation','Category:Global_warming','Category:Renewable_energy_in_India',
  // === EDUCATION ===
  'Category:Education','Category:Education_in_India','Category:Indian_education','Category:Indian_schools',
  'Category:Indian_universities','Category:IIT','Category:IIM','Category:AIIMS','Category:Central_universities_of_India',
  'Category:Indian_institutes_of_technology','Category:Indian_institutes_of_management',
  'Category:Medical_colleges_in_India','Category:Indian_educational_boards','Category:NCERT',
  // === HEALTH & MEDICINE ===
  'Category:Medicine','Category:Health','Category:Diseases_and_disorders','Category:Public_health',
  'Category:Health_in_India','Category:Indian_healthcare','Category:Ayurveda','Category:Yoga',
  'Category:Indian_medicine','Category:Vaccines','Category:Nutrition','Category:Epidemiology',
  // === TRANSPORT ===
  'Category:Transport','Category:Railways','Category:Indian_railways','Category:Rail_transport_in_India',
  'Category:Aviation','Category:Airports_in_India','Category:Indian_airlines',
  'Category:Road_transport_in_India','Category:Indian_highways','Category:Water_transport_in_India',
  'Category:Indian_ports_and_harbours','Category:Indian_shipping',
  // === PERSONALITIES ===
  'Category:Indian_scientists','Category:Indian_mathematicians','Category:Indian_physicists','Category:Indian_chemists',
  'Category:Indian_biologists','Category:Indian_engineers','Category:Indian_entrepreneurs',
  'Category:Indian_Nobel_laureates','Category:Nobel_Prize_in_Physics','Category:Nobel_Prize_in_Chemistry',
  'Category:Nobel_Prize_in_Physiology_or_Medicine','Category:Nobel_Peace_Prize',
  'Category:Indian_philanthropists','Category:Indian_architects','Category:Indian_painters',
  'Category:Indian_sculptors','Category:Indian_photographers',
  // === CLassical WORLD ===
  'Category:Ancient_Egyptian_culture','Category:Greek_mythology','Category:Roman_mythology',
  'Category:Norse_mythology','Category:Hindu_mythology','Category:World_philosophy',
  'Category:Indian_inventions','Category:Indian_holidays','Category:Indian_media','Category:Indian_newspapers',
  'Category:Indian_television','Category:Indian_radio','Category:Indian_postal_system',
  'Category:Indian_census','Category:Indian_demographics','Category:Indian_poverty','Category:Indian_social_issues',
  'Category:Indian_caste_system','Category:Indian_women','Category:Indian_youth'
];

WIKI._buildOpts = function(correct, entityType) {
  var distractors = [];
  var pool = [];

  // Prefer same-type distractors
  if (entityType && WIKI._distractorTypes[entityType]) {
    pool = pool.concat(WIKI._distractorTypes[entityType]);
  }
  for (var t in WIKI._seenTypes) {
    if (WIKI._seenTypes[t] === entityType) pool.push(t);
  }
  pool = pool.concat(WIKI._seenTitles).concat(WIKI._seenValues).concat(WIKI._genericFallback);

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

WIKI._examTopics = [
  // === HISTORY ===
  'World history','Ancient history','Medieval history','Modern history','European history','Asian history','African history','American history',
  'Indian history','Ancient India','Medieval India','Modern India','Indus Valley Civilisation','Vedic period','Maurya Empire','Gupta Empire',
  'Delhi Sultanate','Mughal Empire','Maratha Empire','Vijayanagara Empire','British Raj','Indian independence movement','Indian freedom fighters',
  'World War I','World War II','Cold War','French Revolution','Industrial Revolution','Renaissance','Age of Exploration',
  'Ancient Egypt','Ancient Greece','Ancient Rome','Roman Empire','Byzantine Empire','Persian Empire','Mongol Empire','Ottoman Empire',
  'Chinese history','Japanese history','Russian history','American Revolution','Colonialism','Imperialism','Decolonization',
  // === GEOGRAPHY ===
  'Geography','World geography','Physical geography','Human geography','Political geography',
  'Continents','Countries and capitals','World currencies','Rivers of the world','Mountains of the world',
  'Oceans and seas','Lakes of the world','Islands of the world','Deserts of the world','Forests of the world',
  'Volcanoes','Waterfalls','Glaciers','Climate zones','Biomes','Map reading',
  'Geography of India','Indian rivers','Himalayas','Western Ghats','Eastern Ghats','Indian coastal geography',
  'Indian climate','Indian monsoon','Indian soil','Indian vegetation','Indian states and union territories',
  'Indian ports','Indian borders','Indian islands','Indian geological regions',
  // === SCIENCE: PHYSICS ===
  'Physics','Classical mechanics','Thermodynamics','Electromagnetism','Optics','Acoustics','Quantum mechanics',
  'Relativity','Nuclear physics','Particle physics','Fluid dynamics','Astrophysics','Units and measurements',
  'Motion and force','Work energy power','Gravitation','Waves','Electricity','Magnetism','Electronic devices',
  // === SCIENCE: CHEMISTRY ===
  'Chemistry','Organic chemistry','Inorganic chemistry','Physical chemistry','Analytical chemistry','Biochemistry',
  'Atomic structure','Chemical bonding','Periodic table','Chemical reactions','Acids bases salts',
  'Thermochemistry','Electrochemistry','Chemical kinetics','Environmental chemistry','Polymer chemistry',
  // === SCIENCE: BIOLOGY ===
  'Biology','Cell biology','Genetics','Evolution','Ecology','Molecular biology','Microbiology',
  'Zoology','Botany','Anatomy','Physiology','Neuroscience','Immunology','Virology','Bacteriology',
  'Human body systems','Vitamins and minerals','Diseases and medicines','Nutrition','Plant kingdom','Animal kingdom',
  'Classification of living organisms','Photosynthesis','Respiration','Reproduction','Biotechnology',
  // === ASTRONOMY & SPACE ===
  'Astronomy','Solar system','Stars','Galaxies','Planets','Constellations','Space exploration',
  'Indian space program','ISRO missions','Indian satellites','Chandrayaan','Mangalyaan','Gaganyaan',
  'Astronauts','Space missions','Telescopes','Cosmology','Black holes',
  // === MATHEMATICS ===
  'Mathematics','Algebra','Geometry','Calculus','Statistics','Number theory','Trigonometry','Probability',
  'Indian mathematics','Indian mathematicians','Arithmetic','Mathematical symbols',
  // === TECHNOLOGY ===
  'Technology','Inventions and discoveries','Computer science','Artificial intelligence','Machine learning',
  'Robotics','Cybersecurity','Internet','Telecommunications','Software','Hardware',
  'Indian IT industry','Indian startups','Indian unicorns','Indian digital payment','Indian computer science',
  'Space technology','Nuclear technology','Biotechnology','Nanotechnology','Renewable energy technology',
  'Indian nuclear program','Indian missiles','Indian defence technology',
  // === ECONOMICS ===
  'Economics','Macroeconomics','Microeconomics','International economics','Development economics',
  'Indian economy','Indian budget','Indian banking','Indian financial system','Indian taxation','GST',
  'Indian inflation','Indian GDP','Five Year Plans','NITI Aayog','Indian agriculture economics',
  'Indian food security','Indian public distribution system','Indian foreign trade',
  'Indian economic reforms','LPG reforms','Make in India','Digital India','Startup India',
  'World Bank','IMF','WTO','G20','BRICS','SAARC','ASEAN','European Union',
  'International trade','Stock market','Banking terms','Monetary policy','Fiscal policy',
  // === POLITY ===
  'Political science','Indian constitution','Indian constitution amendments','Indian fundamental rights',
  'Indian directive principles','Indian fundamental duties','Indian emergency provisions',
  'Indian president','Indian prime minister','Indian parliament','Indian supreme court',
  'Indian election commission','Indian political parties','Indian federalism','Indian local government',
  'Indian judiciary','Indian government','Indian democracy','Indian elections','Indian law',
  'Indian foreign policy','Indian international relations','Indian neighbours','Defence forces of India',
  'Indian armed forces','Indian defence','Indian nuclear doctrine','Indian border disputes',
  'International relations','United Nations','Security Council','International organizations',
  // === CULTURE ===
  'Indian culture','Indian art','Indian architecture','Indian sculpture','Indian painting',
  'Indian literature','Indian authors','Indian poets','Indian literature awards','Indian books',
  'Indian music','Indian classical music','Indian folk music','Indian musical instruments',
  'Indian dance','Indian classical dance','Indian folk dance','Indian cinema','Bollywood',
  'Indian film directors','Indian actors','Indian festivals','Indian temples','Indian monuments',
  'Indian languages','Indian religions','Indian philosophy','Indian mythology','Indian cuisine',
  'Indian textiles','Indian costumes','Indian tribes','Indian social customs',
  'World culture','World literature','World music','World art','World architecture',
  'World cinema','World heritage sites','UNESCO World Heritage',
  // === SPORTS ===
  'Sports','Olympics','Olympic sports','Olympic medalists','Commonwealth Games','Asian Games',
  'Cricket','World Cup cricket','IPL','Football','World Cup football','Tennis','Grand Slam',
  'Badminton','Hockey','Chess','Athletics','Swimming','Boxing','Wrestling','Weightlifting',
  'Archery','Shooting','Kabaddi','Formula One','Golf','Table tennis','Volleyball',
  'Indian sports','Indian cricketers','Indian Olympic medalists','Indian tennis players',
  'Indian badminton players','Indian chess players','Indian hockey','Indian sports personalities',
  'Sports awards','Arjuna Award','Rajiv Gandhi Khel Ratna','Dronacharya Award',
  // === ENVIRONMENT ===
  'Environment','Ecology','Biodiversity','Conservation','Climate change','Global warming',
  'Indian environment','Indian biodiversity','Indian wildlife','Indian national parks',
  'Indian wildlife sanctuaries','Indian biosphere reserves','Indian wetlands','Ramsar sites',
  'Indian forests','Indian mangroves','Indian coral reefs','Indian climate change policy',
  'Natural disasters','Endangered species','Pollution','Air pollution','Water pollution',
  'Environmental issues in India','National Action Plan on Climate Change',
  'Renewable energy','Green energy','Environmental treaties','Paris Agreement',
  // === EDUCATION ===
  'Education','Education in India','Indian education system','Indian schools','Indian universities',
  'IIT','IIM','AIIMS','NIT','IIIT','Central universities','Indian institutes',
  'Scholarships','Higher education','Primary education','Right to Education','NEP 2020',
  'NCERT','Indian educational boards','Skill development',
  // === HEALTH ===
  'Health','Medicine','Diseases','Public health','Health in India','Indian healthcare',
  'Ayurveda','Yoga','Indian medicine','Vaccines','Nutrition','Epidemiology',
  'Health schemes of India','Ayushman Bharat','National Health Mission',
  // === PERSONALITIES ===
  'Indian scientists','Indian Nobel laureates','Nobel Prize winners',
  'Indian mathematicians','Indian physicists','Indian chemists','Indian biologists',
  'Indian engineers','Indian entrepreneurs','Indian philanthropists',
  'Indian architects','Indian painters','Indian sculptors',
  'Indian classical musicians','Indian classical dancers','Indian singers',
  'World scientists','World Nobel laureates','Famous inventors',
  // === CURRENT AFFAIRS ===
  'Current events','Recent events India','International current events',
  'Indian politics current affairs','Indian economy current affairs',
  'Science and technology current affairs','Sports current affairs',
  'Environment current affairs','Awards and honours current affairs',
  'Appointments current affairs','Summits and conferences current affairs'
];

WIKI.randomQuestion = function() {
  return WIKI._batchRandom(10);
};

WIKI._batchRandom = function(count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=random&rnlimit=' + count + '&rnnamespace=0&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.random;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && !/^Outline of/i.test(t) && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchRandom failed:', e); return []; });
};

WIKI._batchCategory = function(category, count) {
  var cat = category.indexOf('Category:') === 0 ? category : 'Category:' + category;
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + encodeURIComponent(cat) + '&cmlimit=' + count + '&cmtype=page&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.categorymembers;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchCategory failed:', e); return []; });
};

WIKI._batchRecentChanges = function(count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rcprop=title&rclimit=' + count + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.recentchanges;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchRecentChanges failed:', e); return []; });
};

WIKI._batchSummaries = function(titles) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&explaintext&exlimit=max&exchars=2000&titles=' + encodeURIComponent(titles.join('|')) + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.pages;
      if (!pages) return [];
      var results = [];
      for (var id in pages) {
        var p = pages[id];
        if (!p || !p.title || id === '-1') continue;
        if (!p.description || p.description.length < 2) continue;
        var extract = (p.extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (extract.length < 30) continue;
        var qs = WIKI._makeQuestions({ title: p.title, extract: extract, description: p.description || '' });
        for (var qi = 0; qi < qs.length; qi++) results.push(qs[qi]);
      }
      return results;
    })
    .catch(function(e) { console.error('[WIKI] _batchSummaries failed:', e); return []; });
};

WIKI._batchSearch = function(topic, count) {
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(topic) + '&srlimit=' + count + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.search;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) { return t && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t); });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchSearch failed:', e); return []; });
};

WIKI.searchQuestion = function() {
  var topic = pick(WIKI._examTopics);
  return WIKI._batchSearch(topic, 30);
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
    .catch(function(e) { console.error('[WIKI] onThisDay failed:', e); return []; });
};

WIKI._loadKnown = function() {
  if (WIKI._known) return;
  WIKI._known = {};
  function add(arr) {
    if (arr && arr.length) {
      for (var i = 0; i < arr.length; i++) {
        WIKI._known[String(arr[i]).toLowerCase().trim()] = true;
      }
    }
  }
  if (typeof GK_DISTRACTORS !== 'undefined') {
    for (var k in GK_DISTRACTORS) add(GK_DISTRACTORS[k]);
  }
  add(WIKI._genericFallback);
};

WIKI._isKnown = function(entity) {
  if (!entity) return false;
  var e = String(entity).toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  if (!e || e.length < 2) return false;
  if (/^(list of|timeline of|outline of)/i.test(e)) return false;
  // Accept any reasonable entity — the known-set check is a bonus for quality distractors
  if (WIKI._known && WIKI._known[e]) return true;
  var words = e.split(/\s+/);
  var lastWord = words.length > 1 ? words[words.length - 1] : '';
  if (lastWord && lastWord.length > 3 && WIKI._known[lastWord]) return true;
  for (var k in WIKI._known) {
    if (k.length > 3 && e.indexOf(k) >= 0) {
      if (k.indexOf(' ') > 0) return true;
      if (k.length > 6) return true;
    }
    if (e.length > 3 && k.indexOf(e) >= 0) return true;
  }
  // Accept any entity that looks like a proper noun (starts with capital) or is long enough
  if (/^[A-Z]/.test(entity) && entity.length > 3) return true;
  return entity.length > 5;
};

WIKI.prefetch = function() {
  if (WIKI._prefetching) { console.log('[WIKI] already prefetching'); return; }
  WIKI._prefetching = true;
  WIKI._loadKnown();
  console.log('[WIKI] prefetch started, pool size:', WIKI._pool.length);

  function fetchBatch() {
    // No limits — always fetch aggressively to fill pool from all GK domains
    WIKI._sourceIndex = (WIKI._sourceIndex + 1) % 5;

    var promise;
    if (WIKI._sourceIndex === 0) {
      var topic = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(topic, 50);
    } else if (WIKI._sourceIndex === 1) {
      promise = WIKI._batchRandom(50);
    } else if (WIKI._sourceIndex === 2) {
      var cat = pick(WIKI._categoryTopics);
      promise = WIKI._batchCategory(cat, 50);
    } else if (WIKI._sourceIndex === 3) {
      promise = WIKI._batchRecentChanges(50);
    } else {
      // Source 4: direct exam topic search (wide coverage)
      var et = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(et, 50);
    }

    promise.then(function(qs) {
      if (qs && qs.length) {
        for (var i = 0; i < qs.length; i++) {
          if (WIKI._pool.length < WIKI._poolSize * 5) WIKI._pool.push(qs[i]);
        }
      }
      setTimeout(fetchBatch, 100);
    }).catch(function() { console.error('[WIKI] fetchBatch failed, retrying...'); setTimeout(fetchBatch, 300); });
  }

  function fetchOnThisDay() {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var todayKey = now.getFullYear() + '-' + m + '-' + d;
    WIKI.onThisDay(todayKey).then(function(items) {
      if (items && items.length) {
        // Populate cache for Quick Fact additional info
        WIKI._onThisDayCache = items.slice(0, 30);
        var otdQuestions = WIKI._makeFromOnThisDay(items);
        for (var i = 0; i < otdQuestions.length; i++) {
          if (WIKI._pool.length < WIKI._poolSize * 3) WIKI._pool.push(otdQuestions[i]);
        }
      }
    }).catch(function() {});
  }

  fetchOnThisDay();
  WIKI.prefetchCurrentEvents();
  // Kick off background historical on-this-day prefetching (covers BC to CE)
  if (typeof _fetchRandomHistoricalOnThisDay === 'function') {
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 1000);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 2500);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 4000);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 6000);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 8000);
  }
  fetchBatch();
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._entityType = function(desc, firstSentence) {
  var c = (desc + ' ' + firstSentence).toLowerCase();
  if (/(was a|was an|born|died|known for|scientist|politician|author|actor|artist|musician|philosopher|king |queen |leader|engineer|physicist|chemist|biologist|mathematician|poet|writer|novelist|painter|sculptor|composer|singer|dancer|inventor|explorer|entrepreneur|philanthropist|reformer|activist|freedom fighter|guru|saint|prime minister|president |governor|chief minister|minister|judge|lawyer|doctor|surgeon|nobel laureate|athlete|cricketer|footballer|sportsman|sportswoman|general|admiral|marshal|chief)/.test(c)) return 'person';
  if (/(country|city|town|village|state|province|region|island|river|mountain|lake|ocean|sea|capital|located in|situated in|flows through|lies in|peninsula|bay|gulf|desert|plateau|valley|continent|archipelago|delta|strait|canyon|basin|border|zone|plain|hill)/.test(c)) return 'place';
  if (/(organization|company|agency|institute|university|college|committee|commission|bureau|council|board|fund|bank|party|association|society|ministry|department|corporation|firm|foundation|centre|center|mission|programme|program|initiative|authority|forum|group|club|union|league)/.test(c)) return 'org';
  if (/(war|battle|conflict|revolution|movement|disaster|earthquake|flood|storm|pandemic|epidemic|treaty|conference|summit|festival|event|incident|accident|invasion|rebellion|uprising|campaign|expedition|crusade|siege|massacre|genocide|holocaust|famine|drought|tsunami|hurricane|tornado|explosion|attack)/.test(c)) return 'event';
  if (/(species|genus|mammal|bird|fish|insect|reptile|amphibian|plant|tree|flower|animal|organism|fungus|bacteria|virus|breed|variety|cultivar)/.test(c)) return 'living';
  if (/(book|novel|poem|play|film|movie|painting|sculpture|song|album|article|essay|story|literature|work|composition|biography|autobiography|memoir)/.test(c)) return 'work';
  if (/(is a|refers to|concept|theory|principle|law|effect|phenomenon|process|method|technique|system|field|branch|discipline|science|art|practice)/.test(c)) return 'concept';
  return 'other';
};

WIKI._onThisDayCache = [];
WIKI._currentEventCache = [];

WIKI._ARTICLE_WORDS = { 'a':1, 'an':1, 'the':1, 'and':1, 'of':1, 'in':1, 'for':1, 'on':1, 'at':1, 'by':1, 'to':1, 'from':1, 'with':1 };

WIKI._makeQuestions = function(data) {
  var title = data.title;
  var extract = (data.extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  var desc = data.description || '';
  var lower = extract.toLowerCase();
  var allSentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var firstSentence = extract;
  for (var fsi = 0; fsi < allSentences.length; fsi++) {
    if (allSentences[fsi].trim().length >= 20) { firstSentence = allSentences[fsi].trim(); break; }
  }

  if (extract.length < 80) return [];
  if (title.length > 60) return [];
  if (/^Outline of/i.test(title)) return [];
  if (/^(List of|Timeline of)/i.test(title)) return [];

  WIKI._seenTitles.push(title);
  if (WIKI._seenTitles.length > 500) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];

  var factSentences = [title];
  if (desc) factSentences.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 15); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factSentences.join('. ').length + sf.length < 3000) factSentences.push(sf);
  }
  var richFact = factSentences.join('. ');

  var results = [];
  var titleLower = title.toLowerCase();
  var entityType = WIKI._entityType(desc, firstSentence);
  WIKI._seenTypes[title] = entityType;

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
    if (q.q.toLowerCase().indexOf(q.a.toLowerCase()) >= 0) return;
    if (!WIKI._isKnown(q.a)) return;
    q._source = 'wiki';
    q._wikiCat = catName;
    q.pubDate = new Date().toISOString();
    results.push(q);
  }

  // — PRIORITY 1: Description-based direct question —
  // Wikipedia descriptions are clean phrases like "Indian physicist" or "River in South India"
  if (desc && desc.length >= 2 && desc.length < 120 && desc.toLowerCase().indexOf(titleLower) < 0) {
    var wh = entityType === 'person' ? 'Who' : 'What';
    var qText = wh + ' is ' + desc + '?';
    qText = qText.charAt(0).toUpperCase() + qText.slice(1);
    if (qText.length > 15 && qText.length < 130) {
      pushQ({ q: qText, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 2: Type-specific sentence extraction —
  var titleClean = title.replace(/\s*\(.*?\)/g, '').trim();
  var titleWords = title.split(/\s+/);
  var lastName = '';
  if (titleWords.length > 1) {
    var last = titleWords[titleWords.length - 1].replace(/[.,()]/g, '');
    if (last.length > 4 && !WIKI._ARTICLE_WORDS[last.toLowerCase()]) lastName = last;
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
    if (!foundForm || s.length - foundForm.length < 15) continue;

    var startIdx = sLower.indexOf(foundForm.toLowerCase());
    var before = s.substring(0, startIdx).trim();
    var after = s.substring(startIdx + foundForm.length).trim();

    if (foundForm === lastName && before.length > 0) continue;

    after = after.replace(/^\([^)]*\)\s*/, '').trim();
    after = after.replace(/^[,\s]+/, '').trim();

    var wh = 'What';
    if (entityType === 'person' || /^(was a|was an|is a|is an|born|died|known for|scientist|politician|author|actor|artist|musician|philosopher|king|queen|leader|engineer|physicist|chemist|biologist|mathematician|prime minister|president|governor|minister|judge|doctor|singer|dancer|poet|writer|nobel)/i.test(after)) {
      wh = 'Who';
    } else if (entityType === 'place' || /located in|situated in|flows|lies in|found in/i.test(after)) {
      wh = 'Where';
    } else if (entityType === 'org' || /headquartered|based in|founded|established/i.test(after)) {
      wh = 'Which organization';
    } else if (entityType === 'event' || /occurred|happened|took place|began|ended|started/i.test(after)) {
      wh = 'What';
    }

    var verbMatch = after.match(/^(is|are|was|were)\s+/i);
    var verb = verbMatch ? verbMatch[0] : '';
    var rest = after.replace(/^(is|are|was|were)\s+/i, '').trim();
    var simpleQ = wh + ' ' + verb + rest;
    simpleQ = simpleQ.replace(/\s+/g, ' ').trim();
    simpleQ = simpleQ.charAt(0).toUpperCase() + simpleQ.slice(1);
    if (simpleQ.endsWith('.')) simpleQ = simpleQ.slice(0, -1) + '?';
    else if (!simpleQ.endsWith('?')) simpleQ += '?';
    if (simpleQ.length > 20 && simpleQ.length < 130) {
      pushQ({ q: simpleQ, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 3: Birth / death year —
  if (results.length < 3) {
    var birthMatch = extract.match(/born\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    var deathMatch = extract.match(/died\s+(?:\d{1,2}\s+\w+\s+)?(\d{4})/i);
    if (birthMatch) {
      var ctx = extract.substr(Math.max(0, extract.indexOf(birthMatch[0]) - 10), birthMatch[0].length + 40);
      if (ctx.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who was born in ' + birthMatch[1] + '?', a: title, hint: 'Birth year', fact: richFact, opts: WIKI._buildOpts(title, entityType) });
      }
    }
    if (deathMatch && deathMatch[1] !== (birthMatch && birthMatch[1])) {
      var ctx2 = extract.substr(Math.max(0, extract.indexOf(deathMatch[0]) - 10), deathMatch[0].length + 40);
      if (ctx2.toLowerCase().indexOf(titleLower) < 0) {
        pushQ({ q: 'Who died in ' + deathMatch[1] + '?', a: title, hint: 'Death year', fact: richFact, opts: WIKI._buildOpts(title, entityType) });
      }
    }
  }

  // — PRIORITY 4: Established / founded year —
  if (results.length < 3 && years.length > 0) {
    var y = years[0];
    var verb = 'established';
    if (/founded/i.test(extract)) verb = 'founded';
    else if (/created/i.test(extract)) verb = 'created';
    var yCtx = extract.substr(Math.max(0, extract.indexOf(y) - 50), y.length + 60);
    if (yCtx.toLowerCase().indexOf(titleLower) < 0) {
      pushQ({ q: 'What was ' + verb + ' in ' + y + '?', a: title, hint: 'Founded ' + y, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 5: Location / headquartered —
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
          pushQ({ q: 'What is headquartered in ' + loc + '?', a: title, hint: 'Location: ' + loc, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
        }
        break;
      }
    }
  }

  // — PRIORITY 6: Description blanking —
  if (results.length === 0 && desc && desc.length >= 15 && desc.length < 120) {
    var blank = '______';
    var blanked = desc.replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), blank);
    if (blanked !== desc && blanked.length > 20 && blanked.length < 150) {
      blanked = blanked.replace(/\s+/g, ' ').trim();
      pushQ({ q: blanked, a: title, hint: catName, fact: richFact, opts: WIKI._buildOpts(title, entityType) });
    }
  }

  // — PRIORITY 7: Varied sentence-based questions (any informative sentence) —
  // Generates different question styles from sentences the title appears in
  if (results.length < 2) {
    var entityPool = (extract.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []).filter(function(t) { return t.length > 5 && t !== title; });
    entityPool = entityPool.concat(WIKI._seenTitles.slice(-15));

    for (var ri = 0; ri < allSentences.length && results.length < 1; ri++) {
      var rSent = allSentences[ri].trim();
      if (rSent.length < 40 || rSent.length > 250) continue;
      if (rSent.toLowerCase().indexOf(titleLower) < 0) continue;

      // Randomly pick a question style
      var style = Math.floor(Math.random() * 5);
      var q, a, opts;

      if (style === 0) {
        // True/False: "X happened. True or False?"
        var tfStmt = rSent.substring(0, 100).replace(/\.$/, '');
        if (tfStmt.length < 30) continue;
        var truthiness = Math.random() < 0.5; // 50% chance the statement is true
        if (!truthiness) {
          // Flip a key word to make it false
          var words = tfStmt.split(' ');
          if (words.length < 6) continue;
          var swapWord = words[Math.floor(words.length / 2)];
          // Simple negation: add "not"
          tfStmt = tfStmt.replace(swapWord, 'not ' + swapWord);
          a = 'False';
        } else {
          a = 'True';
        }
        q = tfStmt + '. True or False?';
        opts = ['True', 'False', 'Cannot be determined', 'None of the above'];

      } else if (style === 1) {
        // "What is the main idea of this statement: '...'?"
        var mainEntities = (rSent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []).filter(function(t) { return t.length > 4; });
        if (mainEntities.length === 0) continue;
        a = mainEntities[0];
        q = 'What/Who is the focus of: "' + rSent.substring(0, 80) + '..."?';
        opts = [a].concat(entityPool.slice(0, 3));

      } else if (style === 2) {
        // "Which of the following is true about [title]?"
        var relEntities = (rSent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []).filter(function(t) { return t.length > 4 && t !== title; });
        if (relEntities.length === 0) continue;
        a = relEntities[Math.floor(Math.random() * relEntities.length)];
        q = 'According to this, which of the following is associated with ' + title + '?';
        opts = [a].concat(entityPool.slice(0, 3));

      } else if (style === 3) {
        // "What is the context of: '...'?"
        var sentences = rSent.match(/[^.!?]+[.!?]/g) || [rSent];
        var firstClause = (sentences[0] || rSent).trim();
        // Extract a key term (noun phrase) to blank out
        var nouns = rSent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        nouns = nouns.filter(function(n) { return n.length > 4 && n !== title && n !== firstClause; });
        if (nouns.length === 0) continue;
        var blanks = '______';
        var keyNoun = nouns[Math.floor(Math.random() * nouns.length)];
        q = firstClause.replace(new RegExp(keyNoun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), blanks);
        if (q === firstClause) continue;
        a = keyNoun;
        opts = [a].concat(entityPool.slice(0, 3));

      } else {
        // "What does X refer to in the context of Y?"
        var ctxEntities = (rSent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []).filter(function(t) { return t.length > 5; });
        if (ctxEntities.length < 2) continue;
        var ctxA = ctxEntities[0];
        var ctxB = ctxEntities[ctxEntities.length - 1];
        if (ctxA === ctxB && ctxEntities.length > 1) ctxB = ctxEntities[1];
        if (ctxA === ctxB) continue;
        q = 'In the context of "' + title + '", what/ who does ' + ctxA + ' refer to?';
        a = ctxB;
        opts = [a].concat(entityPool.slice(0, 3));
      }

      while (opts.length < 4) opts.push('None');
      opts.sort(function() { return Math.random() - 0.5; });
      if (opts.indexOf(a) < 0) continue;
      pushQ({ q: q, a: a, hint: catName, fact: richFact, opts: opts });
    }
  }

  return results;
};

WIKI._classify = function(desc, extract) {
  var l = (desc + ' ' + extract).toLowerCase();
  var cats = {
    biology: ['biology','species','plant','animal','organism','cell','genetic','evolution','ecology','bacteria','virus','protein','dna','gene','enzyme','hormone','mammal','bird','fish','insect','fungus','flower','tree','leaf','seed','root','photosynthesis','pollination','antibody','vaccine','chromosome','mitosis','meiosis','metabolism','habitat','predator','prey','ecosystem','biodiversity','conservation','extinct','endangered','ornithology','botany','zoology','mycology','entomology','marine biology','microbiology','neuroscience','anatomy','physiology'],
    chemistry: ['chemistry','chemical','element','compound','molecule','atom','reaction','acid','base','salt','oxidation','reduction','catalyst','enzyme','polymer','organic','inorganic','periodic table','isotope','ion','bond','electron','proton','neutron','ph','solution','concentration','distillation','chromatography','spectroscopy','nuclear','radioactive','alkali','halogen','noble gas','metal','nonmetal','metalloid','covalent','ionic','metallic'],
    physics: ['physics','quantum','relativity','gravity','electromagnetism','thermodynamics','nuclear','particle','wave','optics','mechanics','energy','force','motion','velocity','acceleration','momentum','angular','frequency','wavelength','amplitude','diffraction','interference','polarization','laser','photon','electron','proton','neutron','quark','lepton','boson','fermion','string theory','dark matter','dark energy','cosmology','astrophysics','plasma','superconductor','semiconductor','transistor','capacitor','inductor','resistor','circuit','voltage','current'],
    history: ['history','historical','century','ancient','medieval','modern','empire','kingdom','dynasty','revolution','war','battle','treaty','invasion','colonization','independence','civilization','archaeology','prehistoric','stone age','bronze age','iron age','renaissance','reformation','enlightenment','industrial','world war','cold war','genocide','holocaust','dictator','monarchy','republic','democracy','communism','fascism','nationalism','imperialism','colonialism','feudalism','slavery','abolition','suffrage','civil rights','apartheid','migration','nomad','barbarian','crusade','exploration','age of discovery'],
    geography: ['geography','geological','mountain','river','ocean','sea','lake','desert','forest','tundra','taiga','savanna','grassland','rainforest','coral reef','island','continent','country','capital','city','population','climate','weather','latitude','longitude','equator','tropic','arctic','antarctic','monsoon','hurricane','tornado','earthquake','volcano','tsunami','erosion','glacier','plateau','peninsula','gulf','bay','strait','isthmus','delta','archipelago','atoll','fjord','canyon','valley','plain','basin','watershed','border','province','state','region','zone'],
    culture: ['culture','art','music','dance','literature','poetry','novel','painting','sculpture','architecture','theatre','film','cinema','photography','language','religion','philosophy','mythology','folklore','tradition','festival','cuisine','fashion','craft','pottery','weaving','embroidery','calligraphy','origami','martial arts','yoga','meditation','ritual','ceremony','symbol','icon','heritage','museum','gallery','exhibition','performance','orchestra','symphony','opera','ballet','jazz','blues','rock','pop','folk','classical','modern','contemporary','abstract','realism','impressionism','cubism','surrealism'],
    technology: ['technology','computer','software','hardware','internet','digital','data','algorithm','programming','coding','database','network','cybersecurity','artificial intelligence','machine learning','robotics','automation','electronics','engineering','telecommunication','smartphone','tablet','laptop','wearable','cloud computing','blockchain','cryptocurrency','virtual reality','augmented reality','quantum computing','nanotechnology','biotechnology','renewable energy','solar','wind','hydroelectric','nuclear','battery','electric vehicle','autonomous','drone','satellite','gps','iot','5g','broadband','wifi','bluetooth','nfc','rfid','sensor','actuator','microcontroller','arduino','raspberry pi','linux','python','javascript','html','css','api','microservice','docker','kubernetes'],
    sports: ['sports','athlete','olympic','world cup','championship','tournament','league','football','cricket','hockey','tennis','badminton','kabaddi','wrestling','boxing','weightlifting','gymnastics','swimming','athletics','running','jumping','throwing','cycling','skiing','skating','surfing','sailing','rowing','canoeing','equestrian','archery','shooting','fencing','taekwondo','judo','karate','basketball','volleyball','baseball','rugby','golf','snooker','darts','chess','esports','marathon','sprint','relay','decathlon','triathlon','biathlon','coach','manager','umpire','referee','stadium','arena','pitch','court','track','field','medal','trophy'],
    ir: ['international relations','foreign policy','diplomacy','diplomat','ambassador','embassy','consulate','high commission','treaty','alliance','sanction','summit','bilateral','multilateral','united nations','un','nato','wto','imf','world bank','g20','brics','sco','asean','saarc','european union','african union','global south','north-south','foreign minister','foreign secretary','minister of external affairs','ministry of external affairs','mea','visa','passport','consular','diaspora','expatriate','non-resident','nri','pio','oci','goi','india-france','india-usa','india-russia','india-japan','india-uk','india-australia','india-germany','india-china','india-pakistan','india-nepal','india-bangladesh','india-sri lanka','act east','neighbourhood first','sagar','quad','i2u2','ipef','vaccine diplomacy','soft power','public diplomacy','cultural diplomacy','strategic partnership','comprehensive partnership','joint statement','joint communique','geopolitics','geopolitical','international community','global governance','multilateralism','international organization','foreign aid','development cooperation','capacity building','it ec','icc r'],
    polity: ['politics','government','parliament','constitution','democracy','election','president','prime minister','cabinet','minister','senate','congress','legislature','judiciary','supreme court','high court','law','bill','act','amendment','rights','fundamental','directive','federal','unitary','sovereign','socialist','secular','republic','panchayat','municipality','autonomous','commission','committee','bureau','authority','board','council','assembly','party','coalition','opposition','majority','minority','veto','impeachment','referendum','plebiscite','diplomacy','embassy','consulate','treaty','alliance','sanction','embargo','tariff','subsidy','welfare','taxation','budget','audit','ombudsman','vigilance','corruption','transparency'],
    economics: ['economics','economy','finance','banking','market','trade','commerce','industry','manufacturing','agriculture','service','gdp','growth','inflation','recession','depression','deflation','unemployment','employment','labor','wage','salary','income','wealth','poverty','inequality','tax','budget','deficit','surplus','debt','bond','stock','share','dividend','interest','rate','exchange','currency','export','import','tariff','quota','subsidy','monopoly','oligopoly','competition','regulation','deregulation','privatization','nationalization','globalization','liberalization','investment','saving','consumption','production','supply','demand','elasticity','utility','marginal','opportunity cost','comparative advantage','protectionism','fiscal','monetary','central bank','reserve','inflation targeting','cpi','wpi','purchasing power'],
    space: ['space','astronomy','astrophysics','planet','star','galaxy','moon','satellite','asteroid','comet','meteor','telescope','observatory','rocket','launch','orbit','spacecraft','astronaut','cosmonaut','space station','solar system','black hole','neutron star','supernova','nebula','constellation','exoplanet','dark matter','dark energy','big bang','cosmic','celestial','lunar','solar','martian','jovian','saturnian','uranian','neptunian','plutonian','interstellar','intergalactic','milky way','andromeda','gravity','relativity','quantum gravity','cosmology','nasa','isro','esa','roscosmos','spacex','blue origin','virgin galactic','hubble','james webb','chandrayaan','mangalyaan','gaganyaan','artemis','apollo','voyager','cassini','new horizons'],
    environment: ['environment','ecology','conservation','pollution','climate change','global warming','greenhouse gas','carbon','emission','renewable','sustainable','biodiversity','ecosystem','deforestation','reforestation','afforestation','wetland','mangrove','coral reef','endangered','extinct','national park','wildlife sanctuary','biosphere reserve','ramsar','unesco','wildlife','forestation','recycling','composting','waste management','water conservation','air quality','carbon footprint','carbon neutral','net zero','climate action','green energy','solar power','wind power','hydropower','geothermal','biomass','biofuel','electric vehicle','public transport','green building','organic farming','permaculture','agroforestry','ecotourism','environmental impact','sustainable development','sdg','unfccc','ipcc','kyoto protocol','paris agreement','montreal protocol','cbd','unep','wwf','greenpeace'],
    defence: ['defence','military','army','navy','air force','marine','soldier','weapon','missile','tank','aircraft','ship','submarine','drone','nuclear','warfare','strategy','tactics','intelligence','security','border','patrol','surveillance','reconnaissance','commando','special forces','peacekeeping','alliance','nato','joint exercise','arms','ammunition','artillery','infantry','cavalry','battalion','brigade','division','corps','commander','general','admiral','marshal','chief of staff','ministry of defence','defence budget','indigenous','manufacturing','research','laboratory','drdo','hal','bel','ordnance','shipyard','aerospace','radar','sonar','electronic warfare','cyber warfare','space defence','ballistic missile','cruise missile','interceptor','air defence','anti-tank','anti-ship','anti-submarine'],
    personalities: ['born','died','known for','was a','was an','scientist','author','philosopher','politician','prime minister','president','king','queen','leader','artist','musician','actor','actress','singer','dancer','painter','sculptor','writer','poet','novelist','playwright','composer','conductor','inventor','explorer','entrepreneur','philanthropist','reformer','activist','revolutionary','freedom fighter','spiritual','guru','saint','philosopher','mathematician','physicist','chemist','biologist','engineer','architect','doctor','surgeon','nobel','award','prize','medal','honour','achievement','contribution','legacy','influence','biography','autobiography','memoir','profile','portrait','career','life','work'],
    health: ['health','healthcare','medical','medicine','hospital','clinic','doctor','surgeon','nurse','patient','disease','illness','symptom','diagnosis','treatment','therapy','surgery','vaccine','vaccination','immunization','pharmaceutical','drug','prescription','epidemic','pandemic','cancer','diabetes','heart disease','stroke','hypertension','malaria','dengue','tuberculosis','hiv','aids','covid','coronavirus','nutrition','malnutrition','anaemia','maternal','infant','child health','public health','hygiene','sanitation','mental health','depression','anxiety','wellness','fitness','ayurveda','homeopathy','telemedicine','ayushman','generic medicine','clinical trial','blood','organ','transplant','pharmacy','biomedical','physician','pediatric','cardiology','neurology','oncology','psychiatry'],
    education: ['education','school','college','university','institute','academic','student','teacher','professor','lecturer','principal','vice chancellor','dean','curriculum','syllabus','textbook','scholarship','fellowship','degree','diploma','certificate','baccalaureate','masters','doctorate','phd','graduate','postgraduate','undergraduate','exam','examination','board exam','cbse','icse','ncert','nep 2020','national education policy','literacy','illiteracy','enrollment','attendance','dropout','classroom','pedagogy','learning','teaching','vocational','skill development','training','apprenticeship','internship','research','publication','journal','accreditation','naac','nba','nirf','iit','iim','aiims','central university','deemed university','open university','distance education','online learning','e-learning','swayam','diksha','right to education'],
    agriculture: ['agriculture','farming','farmer','cultivation','crop','harvest','irrigation','soil','fertilizer','pesticide','organic farming','natural farming','food grain','wheat','rice','paddy','millet','maize','corn','pulses','soybean','groundnut','mustard','sugarcane','cotton','jute','tea','coffee','rubber','horticulture','vegetable','fruit','dairy','milk','livestock','poultry','animal husbandry','fishery','aquaculture','plantation','seed','hybrid','gm crop','bt cotton','plant breeding','agronomy','agroforestry','permaculture','farm mechanization','tractor','harvester','msp','minimum support price','procurement','pds','public distribution','food security','food corporation','kisan','pm-kisan','kisan credit card','soil health card','e-nam','apmc','cold storage','warehouse','food processing','agri export','farmers producer organisation','fpo'],
    energy: ['energy','power','electricity','renewable energy','solar energy','solar power','solar panel','solar cell','photovoltaic','wind energy','wind power','wind turbine','hydro power','hydroelectric','biomass','biofuel','biogas','ethanol','biodiesel','geothermal','tidal energy','wave energy','green hydrogen','hydrogen fuel','fuel cell','thermal power','coal power','gas power','nuclear power','atomic energy','power plant','electricity grid','smart grid','transmission line','substation','power distribution','discom','electricity tariff','power sector','energy transition','decarbonisation','net zero','energy efficiency','energy conservation','bureau of energy efficiency','pat scheme','energy audit','electric vehicle','ev charging','battery storage','lithium ion','energy security','strategic petroleum reserve','oil refinery','natural gas','lng','coal mining','coal india','ongc','gail','power minister','ministry of power','ministry of new and renewable energy']
  };
  for (var c in cats) {
    for (var ci = 0; ci < cats[c].length; ci++) {
      if (l.indexOf(cats[c][ci]) >= 0) return c;
    }
  }
  return null;
};

WIKI._makeFromOnThisDay = function(items) {
  var questions = [];
  var langHints = {
    'event': 'Historical event',
    'birth': 'Birth anniversary',
    'death': 'Death anniversary'
  };
  for (var i = 0; i < items.length && questions.length < 15; i++) {
    var item = items[i];
    var pages = item.pages || [];
    if (pages.length === 0) continue;
    var firstPage = pages[0];
    if (!firstPage || !firstPage.text) continue;
    var t = firstPage.text;
    if (WIKI._seenValues.indexOf(t) >= 0 || WIKI._seenTitles.indexOf(t) >= 0) continue;
    WIKI._seenValues.push(t);
    if (WIKI._seenValues.length > 500) WIKI._seenValues.shift();

    var year = item.year;
    var text = item.text.replace(/<[^>]+>/g, '').trim();
    if (!year || !text || text.length < 10) continue;

    var hint = langHints[item.type] || 'On this day';
    var detail = item.type === 'event' ? (year + ': ' + text.substring(0, 120)) : (t + ' - ' + text.substring(0, 120));
    var fact = t + ' - ' + hint + ' (' + year + '): ' + text.substring(0, 200);

    if (item.type === 'event') {
      var eventText = text.substring(0, 120);
      questions.push({
        q: 'What happened on this day in ' + year + '?',
        a: eventText.length > 60 ? eventText.substring(0, 57) + '...' : eventText,
        hint: 'On this day: ' + year,
        fact: fact,
        _source: 'wiki',
        _wikiCat: 'current_events',
        opts: WIKI._buildOpts(eventText)
      });
    } else if (item.type === 'birth') {
      questions.push({
        q: 'Who was born in ' + year + '?',
        a: t,
        hint: 'Birth: ' + text.substring(0, 80),
        fact: fact,
        _source: 'wiki',
        _wikiCat: 'personalities',
        opts: WIKI._buildOpts(t, 'person')
      });
    } else if (item.type === 'death') {
      questions.push({
        q: 'Who died in ' + year + '?',
        a: t,
        hint: 'Death: ' + text.substring(0, 80),
        fact: fact,
        _source: 'wiki',
        _wikiCat: 'personalities',
        opts: WIKI._buildOpts(t, 'person')
      });
    }
  }
  return questions;
};

WIKI.fetchCurrentEvents = function() {
  return fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events&prop=text&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.parse || !data.parse.text) return [];
      var html = data.parse.text['*'] || '';
      var items = [];
      var listRe = /<li>(.*?)<\/li>/g;
      var m;
      while ((m = listRe.exec(html)) !== null) {
        var txt = m[1].replace(/<[^>]+>/g, '').trim();
        if (txt.length > 30 && txt.length < 300) items.push(txt);
      }
      return items;
    })
    .catch(function(e) { console.error('[WIKI] fetchCurrentEvents failed:', e); return []; });
};

WIKI._makeEventQuestions = function(eventText) {
  var results = [];
  if (!eventText || eventText.length < 30) return results;

  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+)(?:#[^"]*)?"[^>]*>/g;
  var links = [];
  var lm;
  while ((lm = linkRe.exec(eventText)) !== null) {
    var pageTitle = decodeURIComponent(lm[1].replace(/_/g, ' '));
    if (pageTitle.length > 2 && pageTitle.length < 80) links.push(pageTitle);
  }

  var cleanText = eventText.replace(/<[^>]+>/g, '').trim();
  var sentences = cleanText.match(/[^.!?]+[.!?]/g) || [];
  if (sentences.length === 0) sentences = [cleanText];

  for (var si = 0; si < sentences.length && results.length < 2; si++) {
    var s = sentences[si].trim();
    if (s.length < 30 || s.length > 250) continue;

    var yearMatch = s.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    var year = yearMatch ? yearMatch[0] : null;

    if (links.length > 0) {
      var entity = links[0];
      if (WIKI._seenTitles.indexOf(entity) < 0 && entity.length > 3) {
        // Skip if answer text appears in the question
        var qText = year ? 'What happened in ' + year + ' involving ' + entity + '?' : '';
        if (!qText || qText.length < 20 || qText.length > 130) continue;
        if (qText.toLowerCase().indexOf(entity.toLowerCase()) >= 0) continue;
        results.push({
          q: qText,
          a: entity,
          hint: 'Current affairs: ' + entity,
          fact: cleanText.substring(0, 200),
          _source: 'wiki',
          _wikiCat: 'current_events',
          opts: WIKI._buildOpts(entity)
        });
      }
    }
  }
  return results;
};

WIKI.prefetchCurrentEvents = function() {
  return WIKI.fetchCurrentEvents().then(function(events) {
    WIKI._currentEventCache = events;
    for (var ei = 0; ei < Math.min(events.length, 30); ei++) {
      var qs = WIKI._makeEventQuestions(events[ei]);
      for (var qi = 0; qi < qs.length; qi++) {
        if (WIKI._pool.length < WIKI._poolSize * 3) WIKI._pool.push(qs[qi]);
      }
    }
  }).catch(function() {});
};

// ===== HISTORICAL CURRENT EVENTS (Wikipedia per-day archive) =====
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

WIKI._dayEventCache = {};

WIKI.fetchDayEvents = function(year, month, day) {
  var cacheKey = year + '-' + month + '-' + day;
  if (WIKI._dayEventCache[cacheKey]) return Promise.resolve(WIKI._dayEventCache[cacheKey]);
  var page = 'Portal:Current_events/' + year + '_' + MONTHS[month - 1] + '_' + day;
  return fetch('https://en.wikipedia.org/w/api.php?action=parse&page=' + page + '&prop=text&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.parse || !data.parse.text) return [];
      var html = data.parse.text['*'] || '';
      var items = [];
      var liRe = /<li>(.*?)<\/li>/g;
      var lm;
      while ((lm = liRe.exec(html)) !== null) {
        var txt = lm[1].replace(/<[^>]+>/g, '').trim();
        if (txt.length > 30 && txt.length < 400) items.push(txt);
      }
      WIKI._dayEventCache[cacheKey] = items;
      return items;
    })
    .catch(function() { return []; });
};

WIKI._monthEventCache = {};

WIKI.fetchMonthEvents = function(year, month) {
  var cacheKey = year + '-' + month;
  if (WIKI._monthEventCache[cacheKey]) return Promise.resolve(WIKI._monthEventCache[cacheKey]);
  var page = 'Portal:Current_events/' + MONTHS[month - 1] + '_' + year;
  return fetch('https://en.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent(page) + '&prop=text&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.parse || !data.parse.text) return [];
      var html = data.parse.text['*'] || '';
      var items = [];
      var liRe = /<li>(.*?)<\/li>/g;
      var lm;
      while ((lm = liRe.exec(html)) !== null) {
        var txt = lm[1].replace(/<[^>]+>/g, '').trim();
        if (txt.length > 30 && txt.length < 400) items.push(txt);
      }
      WIKI._monthEventCache[cacheKey] = items;
      return items;
    })
    .catch(function() { return []; });
};

// ===== LIVE FACT FETCHING FOR QUIZ QUICK FACTS =====
WIKI._factCache = {};
WIKI._factFetching = {};

WIKI.fetchFact = function(title) {
  if (WIKI._factCache[title]) return Promise.resolve(WIKI._factCache[title]);
  if (WIKI._factFetching[title]) return WIKI._factFetching[title];
  var url = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&exlimit=1&titles=' + encodeURIComponent(title) + '&format=json&origin=*';
  WIKI._factFetching[title] = fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    var pages = data.query && data.query.pages || {};
    for (var id in pages) {
      if (id === '-1') continue;
      var extract = (pages[id].extract || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (extract.length > 30) {
        var sentences = extract.match(/[^.!?]+[.!?]/g) || [extract];
        var shortFact = sentences[0] || extract;
        if (shortFact.length > 300) shortFact = shortFact.substring(0, 300) + '...';
        WIKI._factCache[title] = shortFact;
        return shortFact;
      }
    }
    return '';
  }).catch(function() { return ''; });
  return WIKI._factFetching[title];
};

WIKI._factTopics = ['Commonwealth Games','Olympic Games','Asian Games','FIFA World Cup','Wimbledon','Cricket World Cup','Indian Premier League','Thomas Cup','Neeraj Chopra','PV Sindhu','Chess World Championship','Paris 2024 Olympics','Khelo India','IPL 2025'];

WIKI.prefetchFacts = function() {
  for (var fi = 0; fi < WIKI._factTopics.length; fi++) {
    WIKI.fetchFact(WIKI._factTopics[fi]);
  }
};

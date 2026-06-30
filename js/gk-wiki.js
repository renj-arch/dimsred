var WIKI = {};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

WIKI._seenTitles = [];
WIKI._seenValues = [];
WIKI._pool = [];
WIKI._poolSize = 50000;
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
  'Football World Cup', 'Olympics', 'Asian Games', 'Commonwealth Games', 'Cricket World Cup', 'T20 World Cup',
  'Antarctica', 'Arctic', 'Indian Ocean', 'Pacific Ocean', 'Atlantic Ocean', 'Bay of Bengal', 'Arabian Sea',
  'Taj Mahal', 'Eiffel Tower', 'Statue of Liberty', 'Great Wall of China', 'Pyramids of Giza',
  'UNESCO', 'ISRO', 'NASA', 'DRDO', 'BARC', 'AIIMS', 'IIT', 'IIM', 'UPSC', 'RBI', 'SEBI',
  'Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Vedas', 'Upanishads',
  'Tiger', 'Lion', 'Elephant', 'Peacock', 'Lotus', 'Banyan', 'Neem',
  'Sanskrit', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam',
  'Nobel Prize', 'Bharat Ratna', 'Padma Shri', 'Padma Bhushan', 'Padma Vibhushan',
  'Renaissance', 'Industrial Revolution', 'French Revolution', 'Russian Revolution',
  'Maurya Empire', 'Gupta Empire', 'Mughal Empire', 'Maratha Empire', 'Vijayanagara Empire',
  'Delhi Sultanate', 'Chola Empire', 'Pandya Empire', 'Chera Empire', 'Kushan Empire',
  'Constitution of India', 'Fundamental Rights', 'Directive Principles', 'Panchayati Raj',
  'Sangam literature', 'Silk Road', 'Grand Trunk Road', 'Golden Quadrilateral',
  '8,848', '29,028', '100', '500', '1,000', '10,000', '50,000', '1,000,000', '1,400,000,000',
  'Plato', 'Aristotle', 'Socrates', 'Confucius', 'Buddha', 'Mahavira', 'Guru Nanak', 'Shankara',
  'C V Raman', 'Ramanujan', 'Tagore', 'Amartya Sen', 'Abdul Kalam', 'Vikram Sarabhai', 'Homi Bhabha',
  'M S Swaminathan', 'Birla', 'Tata', 'Reliance', 'Infosys', 'Wipro', 'TCS',
  'Maldives', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Myanmar', 'Afghanistan',
  'G20', 'G7', 'ASEAN', 'European Union', 'African Union', 'Shanghai Cooperation Organisation',
  'Chandrayaan', 'Mangalyaan', 'Gaganyaan', 'Aditya-L1', 'Aryabhata satellite',
  'Param Vir Chakra', 'Ashoka Chakra', 'Arjuna Award', 'Dronacharya Award', 'Khel Ratna',
  'Ayushman Bharat', 'Swachh Bharat', 'Make in India', 'Digital India', 'Skill India',
  'Article 370', 'Article 356', 'Article 21', 'Article 32', 'Article 14',
  'Sindhu', 'Ganges', 'Brahmaputra', 'Indus Valley Civilisation', 'Harappa', 'Mohenjo-daro'
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
    'President', 'Prime Minister', 'Governor', 'Chief Minister', 'Speaker', 'Chief Justice',
    'Socrates', 'Confucius', 'Galileo', 'Darwin', 'Freud', 'Marx', 'Adam Smith', 'Descartes',
    'Kafka', 'Tolstoy', 'Dostoevsky', 'Homer', 'Virgil', 'Dante', 'Milton', 'Goethe',
    'Mozart', 'Beethoven', 'Bach', 'Picasso', 'Van Gogh', 'Da Vinci', 'Michelangelo',
    'Neeraj Chopra', 'P V Sindhu', 'Saina Nehwal', 'Milkha Singh', 'PT Usha', 'Abhinav Bindra',
    'Viswanathan Anand', 'Mary Kom', 'Dhyan Chand', 'Sunil Chhetri',
    'Kautilya', 'Megasthenes', 'Fa Hien', 'Xuanzang', 'Ibn Battuta', 'Al Beruni',
    'Rani Lakshmibai', 'Bhagat Singh', 'Subhas Chandra Bose', 'Bhagat Singh', 'Lala Lajpat Rai',
    'Dadabhai Naoroji', 'Gopal Krishna Gokhale', 'Bal Gangadhar Tilak', 'Bipin Chandra Pal',
    'Maharana Pratap', 'Prithviraj Chauhan', 'Samudragupta', 'Chandragupta Maurya', 'Ashoka',
    'Harsha', 'Rajendra Chola', 'Krishnadevaraya', 'Shivaji Maharaj', 'Guru Gobind Singh',
    'Ramanuja', 'Madhvacharya', 'Chaitanya', 'Meera Bai', 'Tukaram', 'Jnaneshwar'],
  place: ['India', 'China', 'United States', 'United Kingdom', 'Russia', 'Japan', 'Brazil',
    'France', 'Germany', 'Australia', 'Canada', 'Italy', 'Spain', 'South Korea', 'Indonesia',
    'Bangladesh', 'Pakistan', 'Nepal', 'Sri Lanka', 'Egypt', 'South Africa', 'Nigeria',
    'Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad',
    'London', 'Paris', 'New York', 'Tokyo', 'Beijing', 'Berlin', 'Rome', 'Moscow', 'Sydney',
    'Ganga', 'Yamuna', 'Brahmaputra', 'Godavari', 'Krishna', 'Kaveri', 'Narmada', 'Indus',
    'Nile', 'Amazon', 'Yangtze', 'Mississippi', 'Danube', 'Himalayas', 'Western Ghats',
    'Thar Desert', 'Deccan Plateau', 'Alps', 'Andes', 'Rockies', 'Everest', 'K2',
    'Asia', 'Africa', 'Europe', 'South America', 'North America', 'Bay of Bengal',
    'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arabian Sea', 'Mediterranean',
    'Sahara', 'Gobi', 'Siberia', 'Amazon Rainforest', 'Antarctica', 'Arctic Ocean',
    'Persian Gulf', 'Strait of Gibraltar', 'Suez Canal', 'Panama Canal', 'Mekong', 'Danube',
    'Varanasi', 'Jaipur', 'Chandigarh', 'Bhopal', 'Lucknow', 'Guwahati', 'Patna', 'Bhubaneswar',
    'Ayodhya', 'Mathura', 'Tirupati', 'Madurai', 'Thrissur', 'Udaipur', 'Jodhpur', 'Amritsar',
    'Ladakh', 'Kashmir', 'Kerala', 'Goa', 'Sikkim', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Kanyakumari', 'Rameswaram', 'Diu', 'Pondicherry', 'Andaman Islands', 'Lakshadweep'],
  org: ['United Nations', 'WHO', 'IMF', 'World Bank', 'UNESCO', 'UNICEF', 'NATO', 'WTO',
    'SAARC', 'BRICS', 'European Union', 'African Union', 'ASEAN', 'OPEC',
    'ISRO', 'NASA', 'DRDO', 'BARC', 'Supreme Court', 'Parliament', 'Election Commission',
    'RBI', 'SEBI', 'NITI Aayog', 'UPSC', 'AIIMS', 'IIT', 'IIM',
    'Amazon', 'Google', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Samsung',
    'UNHCR', 'FAO', 'ILO', 'WHO', 'UNEP', 'UNDP', 'World Food Programme',
    'INTERPOL', 'ICC', 'ICJ', 'Amnesty International', 'Red Cross',
    'CERN', 'ESA', 'JAXA', 'Roscosmos', 'SpaceX', 'Blue Origin',
    'BHEL', 'SAIL', 'ONGC', 'Coal India', 'Indian Oil', 'NTPC', 'Power Grid',
    'LIC', 'SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra',
    'Tata Group', 'Reliance Industries', 'Adani Group', 'Birla Group', 'Infosys', 'Wipro', 'TCS',
    'HAL', 'BEL', 'BDL', 'Mazagon Dock', 'Cochin Shipyard',
    'NITI Aayog', 'Finance Commission', 'CAG', 'Election Commission', 'UPSC', 'SSC'],
  event: ['World War I', 'World War II', 'Cold War', 'Industrial Revolution', 'Renaissance',
    'French Revolution', 'American Revolution', 'Russian Revolution', 'Green Revolution',
    'Battle of Plassey', 'Battle of Panipat', 'Jallianwala Bagh',
    'Quit India', 'Salt March', 'Kargil War', 'Gulf War', 'Vietnam War',
    'Korean War', 'American Civil War', 'Spanish Civil War', 'Napoleonic Wars', 'Crusades',
    'Battle of Waterloo', 'Battle of Stalingrad', 'Battle of Gettysburg', 'Battle of Haldighati',
    'Battle of Buxar', 'Battle of Talikota', 'Battle of Karnal', 'Battle of Wandiwash',
    'September 11 attacks', 'Moon landing', 'Fall of Berlin Wall', 'Cuban Missile Crisis',
    'Indian independence', 'Partition of India', 'Bangladesh Liberation War', 'Kargil War',
    'Pokhran I', 'Pokhran II', 'Operation Blue Star', 'Operation Vijay',
    'COVID-19 pandemic', '2004 Indian Ocean tsunami', '2015 Nepal earthquake',
    'Paris Agreement', 'Kyoto Protocol', 'Montreal Protocol'],
  concept: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Geology',
    'Economics', 'Psychology', 'Sociology', 'Philosophy', 'History', 'Geography',
    'Democracy', 'Communism', 'Socialism', 'Capitalism', 'Secularism',
    'Nationalism', 'Imperialism', 'Colonialism', 'Globalization', 'Feminism',
    'Buddhism', 'Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Jainism', 'Judaism',
    'Stoicism', 'Existentialism', 'Rationalism', 'Empiricism', 'Idealism', 'Materialism',
    'Relativity', 'Quantum Mechanics', 'Evolution', 'Thermodynamics', 'Electromagnetism',
    'Federalism', 'Unitary state', 'Presidential system', 'Parliamentary system', 'Theocracy'],
  living: ['Tiger', 'Lion', 'Elephant', 'Peacock', 'Eagle', 'Shark', 'Whale', 'Dolphin',
    'Python', 'Cobra', 'Rose', 'Lotus', 'Sandalwood', 'Neem', 'Banyan', 'Peepal',
    'Royal Bengal Tiger', 'Asiatic Lion', 'Indian Elephant', 'Snow Leopard', 'Red Panda',
    'Great Indian Bustard', 'Bengal Florican', 'Gharial', 'Kashmir Stag', 'Nilgiri Tahr',
    'Indian Rhinoceros', 'Wild Water Buffalo', 'Swamp Deer', 'Blackbuck', 'Chinkara',
    'Ganges River Dolphin', 'Indian Pangolin', 'Indian Star Tortoise', 'King Cobra',
    'Himalayan Brown Bear', 'Sloth Bear', 'Indian Wolf', 'Golden Mahseer',
    'Mango', 'Tulsi', 'Ashwagandha', 'Turmeric', 'Saffron', 'Cardamom', 'Black Pepper'],
  work: ['Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Vedas', 'Upanishads', 'Arthashastra',
    'Godan', 'Gitanjali', 'Guide', 'Malgudi Days', 'Harry Potter', '1984', 'Animal Farm',
    'Indica', 'Discovery of India', 'The Republic', 'The Prince', 'Das Kapital', 'Wealth of Nations',
    'Origin of Species', 'Principia Mathematica', 'Critique of Pure Reason',
    'Mughal-e-Azam', 'Sholay', 'Pather Panchali', 'Mother India', 'Lagaan', 'RRR',
    'Meghaduta', 'Abhijnanasakuntalam', 'Silappadikaram', 'Manimekalai', 'Shahnama',
    'Divine Comedy', 'Don Quixote', 'War and Peace', 'Ulysses', 'The Great Gatsby',
    'Mahabhashya', 'Ashtadhyayi', 'Charaka Samhita', 'Sushruta Samhita', 'Yoga Sutras'],
  year: ['1947', '1950', '1962', '1971', '1991', '1998', '2000', '2014', '2016', '2019',
    '1857', '1905', '1919', '1930', '1935', '1942', '1965', '1975', '1984', '1992',
    '1492', '1498', '1526', '1556', '1600', '1757', '1761', '1764', '1853', '1885',
    '1906', '1911', '1914', '1939', '1945', '1948', '1952', '1957', '1966', '1973',
    '1990', '1997', '2001', '2004', '2008', '2011', '2013', '2015', '2018', '2020']
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
  'Category:History_of_Europe','Category:History_of_Asia','Category:History_of_Southeast_Asia',
  'Category:History_of_Central_Asia','Category:History_of_South_Asia','Category:History_of_West_Asia',
  'Category:History_of_Latin_America','Category:History_of_North_America','Category:History_of_Oceania',
  'Category:History_of_the_Indian_subcontinent','Category:History_of_Pakistan','Category:History_of_Bangladesh',
  'Category:History_of_Nepal','Category:History_of_Sri_Lanka','Category:History_of_Afghanistan',
  'Category:History_of_Myanmar','Category:History_of_Indonesia','Category:History_of_Thailand',
  'Category:History_of_Vietnam','Category:History_of_Korea','Category:History_of_Spain',
  'Category:History_of_Portugal','Category:History_of_the_Netherlands','Category:History_of_Switzerland',
  'Category:History_of_Poland','Category:History_of_Ukraine','Category:History_of_Turkey',
  'Category:History_of_Greece','Category:History_of_Italy','Category:History_of_Iran',
  'Category:History_of_Iraq','Category:History_of_Israel','Category:History_of_Saudi_Arabia',
  'Category:History_of_Egypt','Category:History_of_Ethiopia','Category:History_of_Nigeria',
  'Category:History_of_South_Africa','Category:History_of_Kenya','Category:History_of_Mexico',
  'Category:History_of_Brazil','Category:History_of_Argentina','Category:History_of_Canada',
  'Category:Korean_War','Category:Vietnam_War','Category:Gulf_War','Category:War_on_terror',
  'Category:American_Revolution','Category:Russian_Revolution','Category:American_Civil_War',
  'Category:Napoleonic_Wars','Category:Crusades','Category:Spanish_Civil_War',
  'Category:Ancient_warfare','Category:Medieval_warfare','Category:Naval_history','Category:Military_history',
  // === HISTORY — India ===
  'Category:History_of_India','Category:Ancient_India','Category:Medieval_India','Category:Modern_India',
  'Category:Indus_Valley_Civilisation','Category:Vedic_period','Category:Maurya_Empire','Category:Gupta_Empire',
  'Category:Delhi_Sultanate','Category:Mughal_Empire','Category:Maratha_Empire','Category:Vijayanagara_Empire',
  'Category:British_Raj','Category:Indian_independence_movement','Category:Indian_freedom_fighters',
  'Category:Indian_National_Army','Category:Partition_of_India','Category:Post-independence_history_of_India',
  'Category:Indian_princely_states','Category:History_of_Indian_foreign_relations','Category:Indian_coinage',
  'Category:Indian_feudalism','Category:Indian_rebellions','Category:Indian_National_Congress',
  'Category:Muslim_period_in_the_Indian_subcontinent','Category:Portuguese_India','Category:French_India',
  'Category:East_India_Company','Category:Indian_Rebellion_of_1857','Category:Bengal_Renaissance',
  // === GEOGRAPHY — World ===
  'Category:Geography','Category:Physical_geography','Category:Human_geography','Category:Political_geography',
  'Category:World_geography','Category:Continents','Category:Countries','Category:Capitals',
  'Category:Rivers','Category:Mountains','Category:Oceans','Category:Seas','Category:Lakes','Category:Islands',
  'Category:Deserts','Category:Forests','Category:Volcanoes','Category:Peninsulas','Category:Gulfs','Category:Bays',
  'Category:Straits','Category:Canals','Category:Waterfalls','Category:Glaciers','Category:Caves',
  'Category:Climate','Category:Biomes','Category:Time_zones','Category:Map_projections',
  'Category:Countries_by_continent','Category:Dependent_territories','Category:Disputed_territories',
  'Category:Landforms','Category:Plateaus','Category:Plains','Category:Valleys','Category:Deltas',
  'Category:Archipelagoes','Category:Atolls','Category:Fjords','Category:Geographical_regions',
  'Category:Geographical_centres','Category:Extreme_points_of_the_world',
  'Category:Urban_geography','Category:Economic_geography','Category:Cultural_geography',
  // === GEOGRAPHY — India ===
  'Category:Geography_of_India','Category:Indian_rivers','Category:Himalayas','Category:Western_Ghats',
  'Category:Eastern_Ghats','Category:Indian_coastal_geography','Category:Indian_climate','Category:Indian_monsoon',
  'Category:Indian_soil','Category:Indian_vegetation','Category:Indian_ports','Category:Indian_states_and_territories',
  'Category:Indian_borders','Category:Indian_geological_regions','Category:Indian_islands',
  'Category:Indian_union_territories','Category:Indian_districts','Category:Indian_cities',
  'Category:Indian_metropolitan_areas','Category:Indian_mountains','Category:Indian_plateaus',
  'Category:Indian_coastal_ecosystems','Category:Indian_deserts','Category:Indian_forests',
  'Category:Indian_natural_disasters','Category:Indian_water_resources','Category:Indian_minerals',
  'Category:Indian_agricultural_regions','Category:Indian_industrial_regions',
  // === SCIENCE — General ===
  'Category:Science','Category:Scientific_method','Category:History_of_science','Category:Nobel_laureates_in_science',
  'Category:Physics','Category:Classical_mechanics','Category:Thermodynamics','Category:Electromagnetism',
  'Category:Quantum_mechanics','Category:Relativity','Category:Nuclear_physics','Category:Particle_physics',
  'Category:Optics','Category:Acoustics','Category:Fluid_dynamics','Category:Astrophysics',
  'Category:Condensed_matter_physics','Category:Atomic_physics','Category:Molecular_physics',
  'Category:Plasma_physics','Category: Solid-state_physics','Category:Computational_physics',
  'Category:Chemistry','Category:Organic_chemistry','Category:Inorganic_chemistry','Category:Physical_chemistry',
  'Category:Analytical_chemistry','Category:Biochemistry','Category:Polymer_chemistry','Category:Environmental_chemistry',
  'Category:Medicinal_chemistry','Category:Organometallic_chemistry','Category:Quantum_chemistry',
  'Category:Food_chemistry','Category:Green_chemistry','Category:Supramolecular_chemistry',
  'Category:Biology','Category:Cell_biology','Category:Genetics','Category:Evolutionary_biology','Category:Ecology',
  'Category:Molecular_biology','Category:Microbiology','Category:Zoology','Category:Botany','Category:Anatomy',
  'Category:Physiology','Category:Neuroscience','Category:Immunology','Category:Virology','Category:Bacteriology',
  'Category:Human_body','Category:Animal_biology','Category:Plant_biology','Category:Marine_biology',
  'Category:Biophysics','Category:Systematic_biology','Category:Developmental_biology','Category:Ethology',
  'Category:Bioinformatics','Category:Computational_biology','Category:Synthetic_biology','Category:Systems_biology',
  'Category:Astronomy','Category:Solar_System','Category:Stars','Category:Galaxies','Category:Planetary_science',
  'Category:Cosmology','Category:Space_exploration','Category:Constellations','Category:Asteroids','Category:Comets',
  'Category:Nebulae','Category:Black_holes','Category:Neutron_stars','Category:Exoplanets',
  'Category:Mathematics','Category:Algebra','Category:Geometry','Category:Calculus','Category:Statistics',
  'Category:Number_theory','Category:Logic','Category:Topology','Category:Trigonometry','Category:Probability',
  'Category:Combinatorics','Category:Set_theory','Category:Category_theory','Category:Graph_theory',
  'Category:Geology','Category:Mineralogy','Category:Seismology','Category:Volcanology','Category:Oceanography',
  'Category:Meteorology','Category:Paleontology','Category:Archaeology','Category:Anthropology',
  'Category:Petrology','Category:Stratigraphy','Category:Geomorphology','Category:Hydrology',
  'Category:Climatology','Category:Atmospheric_sciences','Category:Earth_sciences',
  // === TECHNOLOGY ===
  'Category:Technology','Category:History_of_technology','Category:Inventions','Category:Discoveries',
  'Category:Computer_science','Category:Artificial_intelligence','Category:Robotics','Category:Machine_learning',
  'Category:Data_science','Category:Cybersecurity','Category:Telecommunications','Category:Internet',
  'Category:Software_engineering','Category:Computer_hardware','Category:Programming_languages',
  'Category:Space_technology','Category:Nuclear_technology','Category:Biotechnology','Category:Nanotechnology',
  'Category:Renewable_energy','Category:Electrical_engineering','Category:Mechanical_engineering',
  'Category:Civil_engineering','Category:Chemical_engineering','Category:Aerospace_engineering',
  'Category:Genetic_engineering','Category:Medical_technology','Category:Digital_technology',
  'Category:Quantum_computing','Category:Blockchain','Category:Cryptocurrency','Category:Cloud_computing',
  'Category:Internet_of_things','Category:Virtual_reality','Category:Augmented_reality',
  'Category:3D_printing','Category:Automation','Category:Autonomous_vehicles','Category:Drone_technology',
  'Category:Semiconductors','Category:Photonics','Category:Satellite_technology','Category:Radar_technology',
  'Category:Laser_technology','Category:Sensor_technology','Category:Display_technology',
  'Category:Food_technology','Category:Construction_technology','Category:Agricultural_technology',
  'Category:Educational_technology','Category:Energy_technology','Category:Environmental_technology',
  // === ECONOMICS & FINANCE ===
  'Category:Economics','Category:Macroeconomics','Category:Microeconomics','Category:International_economics',
  'Category:Development_economics','Category:Economic_history','Category:Economic_systems',
  'Category:Finance','Category:Banking','Category:Stock_market','Category:International_trade',
  'Category:Taxation','Category:Monetary_policy','Category:Fiscal_policy','Category:Economic_indicators',
  'Category:Indian_economy','Category:Indian_budget','Category:Indian_banking','Category:Indian_financial_system',
  'Category:Indian_taxation','Category:Indian_agriculture','Category:Indian_industry','Category:Indian_energy',
  'Category:Indian_minerals','Category:Indian_companies','Category:Indian_brands','Category:Indian_startups',
  'Category:RBI','Category:SEBI','Category:NITI_Aayog','Category:Five-Year_Plans_of_India',
  'Category:Indian_insurance','Category:Indian_cooperatives','Category:Indian_labour','Category:Indian_poverty',
  'Category:Indian_food_security','Category:Public_distribution_system_in_India',
  'Category:Labour_economics','Category:Public_finance','Category:Behavioural_economics',
  'Category:Environmental_economics','Category:Health_economics','Category:Agricultural_economics',
  'Category:Urban_economics','Category:Welfare_economics','Category:Game_theory',
  'Category:World_economy','Category:Global_financial_system','Category:Development_finance',
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
  'Category:Indian_panchayati_raj','Category:Indian_reservation_policy','Category:Indian_constitutional_amendments',
  'Category:Indian_central_ministries','Category:Indian_regulatory_bodies','Category:Indian_commissions',
  'Category:Indian_foreign_aid','Category:Indian_diplomatic_missions','Category:Indian_diaspora',
  'Category:Urban_governance_in_India','Category:Rural_development_in_India',
  'Category:Comparative_politics','Category:Political_philosophy','Category:Geopolitics',
  'Category:Human_rights','Category:Civil_rights','Category:Diplomacy','Category:Foreign_policy',
  'Category:International_law','Category:Humanitarian_law','Category:Environmental_law',
  // === CULTURE — World ===
  'Category:Culture','Category:World_culture','Category:Philosophy','Category:Religion','Category:Mythology',
  'Category:Literature','Category:World_literature','Category:Poetry','Category:Drama','Category:Novels',
  'Category:Music','Category:World_music','Category:Painting','Category:Sculpture','Category:Architecture',
  'Category:Cinema','Category:Theatre','Category:Dance','Category:Photography','Category:Art_movements',
  'Category:World_Heritage_Sites','Category:UNESCO','Category:Nobel_Prize_in_Literature',
  'Category:Nobel_Peace_Prize_laureates',
  'Category:World_philosophy','Category:Greek_mythology','Category:Roman_mythology','Category:Norse_mythology',
  'Category:Egyptian_mythology','Category:Chinese_mythology','Category:Japanese_mythology',
  'Category:Christianity','Category:Islam','Category:Hinduism','Category:Buddhism','Category:Sikhism',
  'Category:Jainism','Category:Confucianism','Category:Taoism','Category:Zoroastrianism',
  'Category:Judaism','Category:Shinto','Category:Bahai','Category:Indigenous_religions',
  'Category:Abrahamic_religions','Category:Dharmic_religions','Category:Eastern_philosophy',
  'Category:Western_philosophy','Category:Greek_philosophers','Category:Roman_philosophers',
  'Category:Modern_philosophers','Category:Political_philosophers',
  'Category:Artists','Category:Architects','Category:Composers','Category:Musicians',
  'Category:Fashion','Category:Design','Category:Animation','Category:Comics',
  'Category:Television','Category:Radio','Category:Journalism','Category:Publishing',
  'Category:Festivals','Category:Holidays','Category:National_symbols',
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
  'Category:Indian_folk_art','Category:Indian_miniature_painting','Category:Indian_murals',
  'Category:Indian_pottery','Category:Indian_metalwork','Category:Indian_woodwork',
  'Category:Indian_saints','Category:Indian_gurus','Category:Indian_ascetics',
  'Category:Indian_classical_music_ragas','Category:Indian_classical_music_gharanas',
  'Category:Indian_folk_singers','Category:Indian_playback_singers','Category:Indian_music_composers',
  'Category:Indian_television_series','Category:Indian_web_series','Category:Indian_documentary_films',
  'Category:Indian_comedy','Category:Indian_theatre','Category:Indian_soap_operas',
  'Category:Indian_sweet_dishes','Category:Indian_breads','Category:Indian_rice_dishes',
  'Category:Indian_spices','Category:Indian_dairy_products','Category:Indian_beverages',
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
  'Category:Winter_Olympics','Category:Paralympic_sports','Category:Commonwealth_Games',
  'Category:Asian_Games','Category:South_Asian_Games','Category:African_Games',
  'Category:World_Championships','Category:World_Cups','Category:Grand_Slam_tennis_tournaments',
  'Category:Marathon_running','Category:Triathlon','Category:Surfing','Category:Skateboarding',
  'Category:Snooker','Category:Darts','Category:Bowling','Category:Polo',
  'Category:Indian_Premier_League','Category:IPL','Category:Big_Bash_League',
  'Category:English_Premier_League','Category:La_Liga','Category:Serie_A','Category:Bundesliga','Category:Ligue_1',
  'Category:UEFA_Champions_League','Category:FIFA_World_Cup','Category:Cricket_World_Cup',
  'Category:Rugby_World_Cup','Category:Hockey_World_Cup',
  'Category:Indian_football','Category:Indian_Super_League','Category:Santosh_Trophy',
  'Category:Indian_women_cricketers','Category:Women_cricket',
  'Category:Esports','Category:Video_game_competitions',
  // === ENVIRONMENT & ECOLOGY ===
  'Category:Environment','Category:Ecology','Category:Biodiversity','Category:Conservation',
  'Category:Climate_change','Category:Climate_change_in_India','Category:Environmental_issues',
  'Category:Environmental_issues_in_India','Category:Natural_disasters','Category:Endangered_species',
  'Category:National_parks','Category:National_parks_of_India','Category:Wildlife_sanctuaries_of_India',
  'Category:Bird_sanctuaries_of_India','Category:Biosphere_reserves_of_India','Category:Ramsar_sites_in_India',
  'Category:Indian_wildlife','Category:Indian_forests','Category:Indian_mangroves','Category:Indian_coral_reefs',
  'Category:Indian_wetlands','Category:Pollution','Category:Air_pollution','Category:Water_pollution',
  'Category:Deforestation','Category:Global_warming','Category:Renewable_energy_in_India',
  'Category:Soil_pollution','Category:Noise_pollution','Category:Light_pollution','Category:Plastic_pollution',
  'Category:Hazardous_waste','Category:Electronic_waste','Category:Waste_management',
  'Category:Water_conservation','Category:Rainwater_harvesting','Category:Watershed_management',
  'Category:Afforestation','Category:Reforestation','Category:Urban_greening',
  'Category:Sustainable_agriculture','Category:Organic_farming','Category:Permaculture',
  'Category:Wildlife_conservation','Category:Marine_conservation','Category:Forest_conservation',
  'Category:Tiger_reserves_of_India','Category:Elephant_reserves_of_India',
  'Category:Zoos_in_India','Category:Botanical_gardens_in_India',
  'Category:Environmental_policy','Category:Environmental_treaties','Category:Paris_Agreement',
  'Category:SDGs','Category:United_Nations_Environment_Programme',
  'Category:Floods_in_India','Category:Cyclones_in_India','Category:Earthquakes_in_India',
  'Category:Tsunamis_in_India','Category:Droughts_in_India','Category:Landslides_in_India',
  // === EDUCATION ===
  'Category:Education','Category:Education_in_India','Category:Indian_education','Category:Indian_schools',
  'Category:Indian_universities','Category:IIT','Category:IIM','Category:AIIMS','Category:Central_universities_of_India',
  'Category:Indian_institutes_of_technology','Category:Indian_institutes_of_management',
  'Category:Medical_colleges_in_India','Category:Indian_educational_boards','Category:NCERT',
  'Category:Indian_institutes_of_science_education_and_research','Category:Indian_institutes_of_information_technology',
  'Category:National_Institutes_of_Technology','Category:Indian_agricultural_universities',
  'Category:Indian_law_schools','Category:Indian_design_schools','Category:Indian_art_schools',
  'Category:State_universities_of_India','Category:Deemed_universities_of_India','Category:Private_universities_of_India',
  'Category:Open_universities_in_India','Category:Distance_education_in_India',
  'Category:Indian_scholarships','Category:Indian_educational_programmes','Category:Right_to_Education',
  'Category:National_Education_Policy_2020','Category:Skill_India','Category:Vocational_education_in_India',
  'Category:Indian_academic_degrees','Category:Indian_competitive_exams','Category:Indian_civil_services_examination',
  // === HEALTH & MEDICINE ===
  'Category:Medicine','Category:Health','Category:Diseases_and_disorders','Category:Public_health',
  'Category:Health_in_India','Category:Indian_healthcare','Category:Ayurveda','Category:Yoga',
  'Category:Indian_medicine','Category:Vaccines','Category:Nutrition','Category:Epidemiology',
  'Category:Pathology','Category:Pharmacology','Category:Toxicology','Category:Psychiatry',
  'Category:Cardiology','Category:Neurology','Category:Oncology','Category:Pediatrics',
  'Category:Orthopedics','Category:Ophthalmology','Category:Dermatology','Category:Gynecology',
  'Category:Anesthesiology','Category:Radiology','Category:Surgery','Category:Dentistry',
  'Category:Mental_health','Category:Psychology','Category:Counselling','Category:Psychotherapy',
  'Category:Alternative_medicine','Category:Homeopathy','Category:Unani_medicine','Category:Siddha_medicine',
  'Category:Traditional_Chinese_medicine','Category:Herbalism','Category:Meditation',
  'Category:Tropical_diseases','Category:Infectious_diseases','Category:Non-communicable_diseases',
  'Category:Lifestyle_diseases','Category:Genetic_disorders','Category:Autoimmune_diseases',
  'Category:Indian_pharmaceutical_industry','Category:Generic_drugs','Category:Clinical_trials_in_India',
  'Category:National_health_programmes_of_India','Category:Ayushman_Bharat',
  'Category:Hospital_networks_in_India','Category:Medical_tourism_in_India',
  // === TRANSPORT ===
  'Category:Transport','Category:Railways','Category:Indian_railways','Category:Rail_transport_in_India',
  'Category:Aviation','Category:Airports_in_India','Category:Indian_airlines',
  'Category:Road_transport_in_India','Category:Indian_highways','Category:Water_transport_in_India',
  'Category:Indian_ports_and_harbours','Category:Indian_shipping',
  'Category:Rapid_transit_in_India','Category:Metro_systems_in_India','Category:Suburban_rail_in_India',
  'Category:Indian_bus_transport','Category:Indian_auto_rickshaw','Category:Indian_taxi_services',
  'Category:Electric_vehicles_in_India','Category:Indian_space_transport',
  'Category:Indian_highway_network','Category:Golden_Quadrilateral','Category:North-East_India_road_network',
  'Category:Indian_bridges','Category:Indian_tunnels','Category:Indian_waterways',
  'Category:Indian_shipping_corporation','Category:Indian_coastal_shipping','Category:Indian_inland_waterways',
  'Category:Aviation_in_India','Category:Indian_air_force','Category:Indian_helicopters',
  'Category:Indian_train_disasters','Category:Indian_railway_zones',
  // === PERSONALITIES ===
  'Category:Indian_scientists','Category:Indian_mathematicians','Category:Indian_physicists','Category:Indian_chemists',
  'Category:Indian_biologists','Category:Indian_engineers','Category:Indian_entrepreneurs',
  'Category:Indian_Nobel_laureates','Category:Nobel_Prize_in_Physics','Category:Nobel_Prize_in_Chemistry',
  'Category:Nobel_Prize_in_Physiology_or_Medicine','Category:Nobel_Peace_Prize',
  'Category:Indian_philanthropists','Category:Indian_architects','Category:Indian_painters',
  'Category:Indian_sculptors','Category:Indian_photographers',
  'Category:World_scientists','Category:World_mathematicians','Category:World_physicists','Category:World_chemists',
  'Category:World_biologists','Category:World_inventors','Category:World_explorers',
  'Category:Nobel_laureates_by_country','Category:Nobel_laureates_by_field',
  'Category:Freedom_fighters','Category:Social_reformers','Category:Humanitarians',
  'Category:Indian_industrialists','Category:Indian_businesspeople','Category:Indian_billionaires',
  'Category:Indian_women_in_business','Category:Indian_startup_founders',
  'Category:Indian_politicians','Category:Indian_diplomats','Category:Indian_administrators',
  'Category:Indian_judges','Category:Indian_lawyers','Category:Indian_advocates',
  'Category:Indian_civil_servants','Category:Indian_armed_forces_personnel',
  'Category:Indian_freedom_fighters_from_Indian_states',
  'Category:Indian_activists','Category:Indian_environmentalists','Category:Indian_women_activists',
  'Category:Indian_social_workers','Category:Indian_educationists','Category:Indian_economists',
  // === CLassical WORLD & GENERAL KNOWLEDGE ===
  'Category:Ancient_Egyptian_culture','Category:Greek_mythology','Category:Roman_mythology',
  'Category:Norse_mythology','Category:Hindu_mythology','Category:World_philosophy',
  'Category:Indian_inventions','Category:Indian_holidays','Category:Indian_media','Category:Indian_newspapers',
  'Category:Indian_television','Category:Indian_radio','Category:Indian_postal_system',
  'Category:Indian_census','Category:Indian_demographics','Category:Indian_poverty','Category:Indian_social_issues',
  'Category:Indian_caste_system','Category:Indian_women','Category:Indian_youth',
  'Category:Indian_law_commission','Category:Indian_election_law','Category:Indian_citizenship_law',
  'Category:Indian_criminal_law','Category:Indian_civil_law','Category:Indian_contract_law',
  'Category:Indian_property_law','Category:Indian_labour_law','Category:Indian_tax_law',
  'Category:Indian_currency','Category:Indian_postage_stamps','Category:Indian_passport',
  'Category:Indian_identity_documents','Category:Indian_voter_id',
  'Category:Indian_awards_and_decorations','Category:Civilian_awards_in_India',
  'Category:Military_awards_and_decorations_of_India',
  'Category:Indian_books','Category:Indian_magazines','Category:Indian_journals',
  'Category:Indian_encyclopedias','Category:Indian_dictionaries',
  'Category:Indian_museums','Category:Indian_libraries','Category:Indian_archives',
  'Category:Indian_zoo','Category:Indian_botanical_gardens',
  'Category:Indian_coins','Category:Indian_banknotes','Category:Indian_commemorative_coins',
  'Category:Indian_flags','Category:Indian_emblems','Category:Indian_national_anthems',
  'Category:Indian_oaths','Category:Indian_mottos',
  'Category:Indian_titles','Category:Indian_honorifics',
  'Category:Indian_calendar','Category:Indian_era','Category:Indian_astrology',
  'Category:Indian_epigraphy','Category:Indian_paleography','Category:Indian_numismatics',
  // === ADDITIONAL DEEP COVERAGE (2025-2026 complete) ===
  // Indian Law & Constitution Deep
  'Category:Indian_constitutional_law','Category:Indian_criminal_law','Category:Indian_evidence_act',
  'Category:Indian_contract_law','Category:Indian_tort_law','Category:Indian_property_law',
  'Category:Indian_company_law','Category:Indian_labour_law','Category:Indian_tax_law',
  'Category:Indian_environmental_law','Category:Indian_human_rights_law',
  'Category:Indian_family_law','Category:Indian_succession_law','Category:Indian_negotiable_instruments',
  'Category:Indian_arbitration_law','Category:Indian_insolvency_law',
  'Category:Supreme_Court_of_India_cases','Category:High_Courts_of_India',
  'Category:District_courts_of_India','Category:Indian_tribunals',
  'Category:Indian_legal_profession','Category:Indian_legal_education',
  'Category:Indian_bar_council','Category:Indian_law_commission_reports',
  // Indian Economy Deep
  'Category:Indian_macroeconomic_data','Category:Indian_monetary_policy',
  'Category:Indian_fiscal_policy','Category:Indian_public_finance',
  'Category:Indian_financial_markets','Category:Indian_capital_market',
  'Category:Indian_money_market','Category:Indian_government_securities',
  'Category:Indian_foreign_exchange_market','Category:Indian_commodity_market',
  'Category:Indian_futures_exchange','Category:Indian_derivatives_market',
  'Category:Indian_microfinance','Category:Indian_financial_inclusion',
  'Category:Indian_digital_payments','Category:Indian_credit_market',
  'Category:Indian_development_finance','Category:Indian_infrastructure_finance',
  'Category:Indian_agricultural_finance','Category:Indian_industrial_finance',
  'Category:Indian_exim_policy','Category:Indian_foreign_trade',
  'Category:Indian_export_zones','Category:Indian_special_economic_zones',
  'Category:Indian_balance_of_payments','Category:Indian_external_debt',
  'Category:Indian_foreign_investment','Category:Indian_overseas_investment',
  'Category:Indian_economic_planning','Category:Indian_development_strategy',
  'Category:Indian_poverty_alleviation','Category:Indian_employment_programmes',
  'Category:Indian_food_security','Category:Indian_public_distribution_system',
  'Category:Indian_land_reforms','Category:Indian_tenancy_laws',
  // Indian Polity Deep
  'Category:Indian_local_self_government','Category:Indian_municipal_governance',
  'Category:Indian_panchayat_system','Category:Indian_rural_development',
  'Category:Indian_urban_development','Category:Indian_housing_policy',
  'Category:Indian_water_policy','Category:Indian_sanitation_policy',
  'Category:Indian_social_security','Category:Indian_pension_system',
  'Category:Indian_public_health_system','Category:Indian_hospital_system',
  'Category:Indian_medical_regulation','Category:Indian_pharmacy_regulation',
  'Category:Indian_nursing_regulation','Category:Indian_dental_regulation',
  'Category:Indian_medical_education','Category:Indian_nursing_education',
  'Category:Indian_paramedical_education','Category:Indian_pharmacy_education',
  // Indian Environment & Ecology Deep
  'Category:Indian_forest_policy','Category:Indian_wildlife_policy',
  'Category:Indian_coastal_management','Category:Indian_wetland_conservation',
  'Category:Indian_mangrove_conservation','Category:Indian_coral_reef_conservation',
  'Category:Indian_marine_protected_areas','Category:Indian_community_reserves',
  'Category:Indian_conservation_reserves','Category:Indian_ecosensitive_zones',
  'Category:Indian_environmental_impact_assessment','Category:Indian_green_tribunal',
  'Category:Indian_environmental_clearance','Category:Indian_forest_clearance',
  'Category:Indian_carbon_market','Category:Indian_climate_finance',
  'Category:Indian_clean_energy_fund','Category:Indian_national_green_hydrogen_mission',
  // Indian Agriculture Deep
  'Category:Indian_cropping_patterns','Category:Indian_crop_insurance',
  'Category:Indian_agricultural_marketing','Category:Indian_food_processing',
  'Category:Indian_cold_storage','Category:Indian_agricultural_exports',
  'Category:Indian_farm_mechanization','Category:Indian_agricultural_research',
  'Category:Indian_soil_conservation','Category:Indian_watershed_development',
  'Category:Indian_drought_management','Category:Indian_flood_management',
  'Category:Indian_dairy_industry','Category:Indian_poultry_industry',
  'Category:Indian_fisheries_sector','Category:Indian_sericulture',
  'Category:Indian_horticulture','Category:Indian_plantation_crops',
  'Category:Indian_organic_farming','Category:Indian_natural_farming',
  'Category:Indian_farmer_welfare','Category:Indian_agricultural_extension',
  // Indian Science & Tech Deep
  'Category:Indian_biotechnology_policy','Category:Indian_intellectual_property',
  'Category:Indian_patent_law','Category:Indian_copyright_law',
  'Category:Indian_trademark_law','Category:Indian_geographical_indications',
  'Category:Indian_scientific_institutions','Category:Indian_research_institutes',
  'Category:Indian_national_laboratories','Category:Indian_CSIR_laboratories',
  'Category:Indian_DRDO_laboratories','Category:Indian_ICAR_institutes',
  'Category:Indian_ICMR_institutes','Category:Indian_DBT_institutes',
  'Category:Indian_DST_programmes','Category:Indian_STI_policy',
  'Category:Indian_nuclear_establishments','Category:Indian_atomic_research',
  'Category:Indian_nuclear_reactors','Category:Indian_nuclear_fuel_cycle',
  'Category:Indian_nuclear_safety','Category:Indian_radiation_protection',
  'Category:Indian_space_establishments','Category:Indian_satellite_applications',
  'Category:Indian_remote_sensing','Category:Indian_communication_satellites',
  'Category:Indian_navigation_satellites','Category:Indian_earth_observation',
  'Category:Indian_space_science_missions','Category:Indian_interplanetary_missions',
  // Indian Defence Deep
  'Category:Indian_army_commands','Category:Indian_navy_commands',
  'Category:Indian_air_force_commands','Category:Indian_army_corps',
  'Category:Indian_military_academies','Category:Indian_defence_training',
  'Category:Indian_war_college','Category:Indian_defence_establishments',
  'Category:Indian_military_bases','Category:Indian_naval_bases',
  'Category:Indian_air_force_bases','Category:Indian_military_exercises',
  'Category:Indian_defence_procurement','Category:Indian_defence_production',
  'Category:Indian_defence_research','Category:Indian_missile_systems',
  'Category:Indian_ballistic_missiles','Category:Indian_cruise_missiles',
  'Category:Indian_air_defence_systems','Category:Indian_radar_systems',
  'Category:Indian_sonar_systems','Category:Indian_electronic_warfare',
  'Category:Indian_nuclear_command','Category:Indian_strategic_forces',
  'Category:Indian_special_forces','Category:Indian_paramilitary_forces',
  'Category:Indian_coast_guard','Category:Indian_border_security',
  'Category:Indian_counter_terrorism','Category:Indian_internal_security',
  'Category:Indian_cyber_security','Category:Indian_naval_ships',
  'Category:Indian_submarines','Category:Indian_aircraft',
  'Category:Indian_military_helicopters','Category:Indian_unmanned_aerial_vehicles',
  // Indian Social Issues Deep
  'Category:Indian_caste_politics','Category:Indian_reservation_policy',
  'Category:Indian_affirmative_action','Category:Indian_social_movements',
  'Category:Indian_peasant_movements','Category:Indian_labour_movements',
  'Category:Indian_womens_movements','Category:Indian_environmental_movements',
  'Category:Indian_tribal_movements','Category:Indian_regional_movements',
  'Category:Indian_linguistic_politics','Category:Indian_religious_movements',
  'Category:Indian_reform_movements','Category:Indian_social_reformers',
  'Category:Indian_education_reforms','Category:Indian_health_reforms',
  'Category:Indian_land_reforms_movements','Category:Indian_food_movements',
  'Category:Indian_housing_movements','Category:Indian_civil_rights_movements',
  // Indian Personalities Deep
  'Category:Indian_presidents','Category:Indian_prime_ministers',
  'Category:Indian_chief_justices','Category:Indian_supreme_court_judges',
  'Category:Indian_high_court_judges','Category:Indian_chief_election_commissioners',
  'Category:Indian_cabinet_ministers','Category:Indian_chief_ministers',
  'Category:Indian_governors','Category:Indian_union_ministers',
  'Category:Indian_ambassadors','Category:Indian_high_commissioners',
  'Category:Indian_diplomats','Category:Indian_civil_servants',
  'Category:Indian_administrators','Category:Indian_police_officers',
  'Category:Indian_military_officers','Category:Indian_paramilitary_officers',
  'Category:Indian_intelligence_officers','Category:Indian_nobel_laureates',
  'Category:Indian_social_activists','Category:Indian_environmental_activists',
  'Category:Indian_womens_rights_activists','Category:Indian_human_rights_activists',
  'Category:Indian_philanthropists','Category:Indian_entrepreneurs',
  'Category:Indian_industrialists','Category:Indian_businesspeople',
  'Category:Indian_startup_entrepreneurs','Category:Indian_innovators',
  'Category:Indian_inventors','Category:Indian_scientists_and_engineers',
  'Category:Indian_academics','Category:Indian_educators',
  'Category:Indian_educationists','Category:Indian_university_leaders',
  'Category:Indian_economists','Category:Indian_statisticians',
  'Category:Indian_historians','Category:Indian_archaeologists',
  'Category:Indian_linguists','Category:Indian_philologists',
  'Category:Indian_anthropologists','Category:Indian_sociologists',
  'Category:Indian_geographers','Category:Indian_demographers',
  'Category:Indian_journalists','Category:Indian_commentators',
  'Category:Indian_writers','Category:Indian_poets',
  'Category:Indian_novelists','Category:Indian_playwrights',
  'Category:Indian_short_story_writers','Category:Indian_essayists',
  'Category:Indian_biographers','Category:Indian_memoirists',
  'Category:Indian_artists','Category:Indian_painters',
  'Category:Indian_sculptors','Category:Indian_photographers',
  'Category:Indian_filmmakers','Category:Indian_film_directors',
  'Category:Indian_film_producers','Category:Indian_screenwriters',
  'Category:Indian_actors','Category:Indian_actresses',
  'Category:Indian_singers','Category:Indian_musicians',
  'Category:Indian_composers','Category:Indian_lyricists',
  'Category:Indian_dancers','Category:Indian_choreographers',
  'Category:Indian_sportspeople','Category:Indian_cricketers',
  'Category:Indian_footballers','Category:Indian_hockey_players',
  'Category:Indian_tennis_players','Category:Indian_badminton_players',
  'Category:Indian_chess_players','Category:Indian_athletes',
  'Category:Indian_swimmers','Category:Indian_boxers',
  'Category:Indian_wrestlers','Category:Indian_shooters',
  'Category:Indian_archers','Category:Indian_golfers',
  'Category:Indian_olympic_medalists','Category:Indian_paralympic_medalists',
  'Category:Indian_commonwealth_games_medalists','Category:Indian_asian_games_medalists',
  // Places in India
  'Category:Cities_in_India','Category:Towns_in_India','Category:Villages_in_India',
  'Category:Historical_cities_of_India','Category:Planned_cities_in_India',
  'Category:Industrial_cities_in_India','Category:Port_cities_in_India',
  'Category:Hill_stations_in_India','Category:Pilgrimage_sites_of_India',
  'Category:Tourist_attractions_in_India','Category:Heritage_sites_in_India',
  'Category:Archaeological_sites_in_India','Category:World_Heritage_Sites_in_India',
  'Category:Indian_forts','Category:Indian_palaces',
  'Category:Indian_historical_residences','Category:Indian_gardens',
  'Category:Indian_parks','Category:Indian_zoos',
  'Category:Indian_museums','Category:Indian_libraries',
  'Category:Indian_art_galleries','Category:Indian_auditoriums',
  'Category:Indian_convention_centers','Category:Indian_exhibition_centers',
  'Category:Indian_stadiums','Category:Indian_sports_venues',
  'Category:Indian_race_courses','Category:Indian_golf_courses',
  // World culture comprehensive
  'Category:Cultural_history','Category:Cultural_movements','Category:Cultural_studies',
  'Category:World_philosophy','Category:Ancient_philosophy','Category:Medieval_philosophy',
  'Category:Modern_philosophy','Category:Contemporary_philosophy',
  'Category:Eastern_philosophy','Category:Western_philosophy',
  'Category:African_philosophy','Category:Islamic_philosophy',
  'Category:Indian_philosophy_schools','Category:Chinese_philosophy',
  'Category:Japanese_philosophy','Category:Greek_philosophy',
  'Category:Renaissance_philosophy','Category:Enlightenment_philosophy',
  'Category:19th_century_philosophy','Category:20th_century_philosophy',
  'Category:Epistemology','Category:Metaphysics','Category:Ethics','Category:Aesthetics',
  'Category:Logic','Category:Political_philosophy','Category:Philosophy_of_science',
  'Category:Philosophy_of_mind','Category:Philosophy_of_religion',
  'Category:Philosophy_of_language','Category:Philosophy_of_mathematics',
  'Category:Philosophy_of_history','Category:Philosophy_of_law',
  'Category:History_of_art','Category:History_of_music','Category:History_of_literature',
  'Category:History_of_theatre','Category:History_of_cinema','Category:History_of_dance',
  'Category:History_of_architecture','Category:History_of_sculpture',
  'Category:History_of_photography','Category:History_of_printing',
  'Category:History_of_publishing','Category:History_of_journalism',
  'Category:History_of_broadcasting','Category:History_of_television',
  'Category:History_of_radio','Category:History_of_advertising',
  'Category:History_of_fashion','Category:History_of_design',
  'Category:World_music_genres','Category:World_dance_styles',
  'Category:World_theatre','Category:World_cinema_by_country',
  'Category:World_literature_by_country','Category:World_architecture_by_country',
  'Category:World_painting','Category:World_sculpture',
  'Category:World_photography','Category:World_festivals',
  'Category:World_cuisine','Category:World_food',
  'Category:World_dress','Category:World_costume',
  'Category:World_jewelry','Category:World_textiles',
  'Category:World_ceramics','Category:World_pottery',
  'Category:Folk_culture','Category:Folk_music','Category:Folk_dance',
  'Category:Folk_art','Category:Folk_literature','Category:Folk_tales',
  'Category:Mythology_by_culture','Category:Folklore_by_country',
  'Category:Legendary_creatures','Category:Supernatural_beings',
  'Category:Symbolism','Category:Iconography','Category:Heraldry',
  'Category:Vexillology','Category:Phaleristics','Category:Numismatics',
  // World Science
  'Category:History_of_biology','Category:History_of_chemistry','Category:History_of_physics',
  'Category:History_of_astronomy','Category:History_of_mathematics',
  'Category:History_of_medicine','Category:History_of_technology',
  'Category:History_of_engineering','Category:History_of_computing',
  'Category:History_of_artificial_intelligence','Category:History_of_robotics',
  'Category:History_of_aviation','Category:History_of_rail_transport',
  'Category:History_of_shipping','Category:History_of_automobiles',
  'Category:History_of_telecommunications','Category:History_of_broadcasting',
  'Category:History_of_recording','Category:History_of_photography',
  'Category:Scientific_revolution','Category:History_of_scientific_method',
  'Category:Scientists_by_country','Category:Scientists_by_field',
  'Category:Women_in_science','Category:Women_in_engineering',
  'Category:Nobel_laureates_in_Physics','Category:Nobel_laureates_in_Chemistry',
  'Category:Nobel_laureates_in_Medicine','Category:Nobel_laureates_in_Literature',
  'Category:Nobel_Peace_Prize_laureates','Category:Nobel_laureates_in_Economics',
  'Category:Fields_Medalists','Category:Abel_Prize_laureates',
  'Category:Turing_Award_laureates','Category:National_Medal_of_Science_laureates',
  'Category:Indian_science_awards','Category:Shanti_Swarup_Bhatnagar_awardees',
  // World Economy
  'Category:World_economy_by_country','Category:Economies_by_country',
  'Category:Economic_indicators_by_country','Category:GDP_by_country',
  'Category:GNI_by_country','Category:HDI_by_country',
  'Category:Inequality_by_country','Category:Poverty_by_country',
  'Category:Unemployment_by_country','Category:Inflation_by_country',
  'Category:Trade_by_country','Category:Exports_by_country',
  'Category:Imports_by_country','Category:Foreign_direct_investment_by_country',
  'Category:Currency_by_country','Category:Central_banks_by_country',
  'Category:Stock_exchanges_by_country','Category:Taxation_by_country',
  'Category:Government_budgets_by_country','Category:Public_debt_by_country',
  'Category:Social_security_by_country','Category:Pension_systems_by_country',
  'Category:Healthcare_systems_by_country','Category:Education_systems_by_country',
  'Category:International_development','Category:Foreign_aid_by_country',
  'Category:Multilateral_development_banks','Category:Regional_development_banks',
  'Category:Sustainable_development_goals','Category:Millennium_development_goals',
  // World Geography Complete
  'Category:Geography_by_country','Category:Physical_geography_by_country',
  'Category:Human_geography_by_country','Category:Economic_geography_by_country',
  'Category:Political_geography_by_country','Category:Urban_geography_by_country',
  'Category:Rural_geography_by_country','Category:Historical_geography',
  'Category:Regional_geography','Category:World_regions',
  'Category:Geographical_zones','Category:Climate_zones_by_continent',
  'Category:Time_zones_by_country','Category:Cartography',
  'Category:Geographic_information_systems','Category:Remote_sensing',
  'Category:Geodesy','Category:Surveying',
  'Category:Topography','Category:Geomorphology',
  'Category:Glaciology','Category:Hydrology',
  'Category:Oceanography','Category:Climatology',
  'Category:Meteorology','Category:Atmospheric_sciences',
  'Category:Soil_science','Category:Land_use',
  'Category:Natural_resource_management','Category:Conservation_biology',
  'Category:Environmental_management','Category:Disaster_management',
  'Category:Natural_hazards','Category:Earthquakes',
  'Category:Volcanic_eruptions','Category:Tsunamis',
  'Category:Floods','Category:Droughts',
  'Category:Cyclones','Category:Tornadoes',
  'Category:Landslides','Category:Wildfires',
  'Category:Climate_change_effects','Category:Global_warming_effects',
  'Category:Sea_level_rise','Category:Climate_adaptation',
  'Category:Climate_mitigation','Category:Climate_resilience',
  'Category:Green_building','Category:Sustainable_transport',
  'Category:Sustainable_energy','Category:Circular_economy',
  'Category:Zero_waste','Category:Carbon_footprint',
  'Category:Ecological_footprint','Category:Water_footprint',
  // World History Complete
  'Category:Prehistory','Category:Ancient_history_by_country',
  'Category:Medieval_history_by_country','Category:Modern_history_by_country',
  'Category:Contemporary_history','Category:Constitutional_history',
  'Category:Diplomatic_history','Category:Economic_history_by_country',
  'Category:Social_history','Category:Cultural_history_by_country',
  'Category:Political_history_by_country','Category:Military_history_by_country',
  'Category:Naval_history_by_country','Category:Intellectual_history',
  'Category:Environmental_history','Category:Oral_history',
  'Category:Women_in_history','Category:Children_in_history',
  'Category:History_of_slavery','Category:History_of_colonialism',
  'Category:History_of_imperialism','Category:History_of_nationalism',
  'Category:History_of_democracy','Category:History_of_socialism',
  'Category:History_of_communism','Category:History_of_capitalism',
  'Category:History_of_fascism','Category:History_of_terrorism',
  'Category:History_of_piracy','Category:History_of_crime',
  'Category:History_of_punishment','Category:History_of_prisons',
  'Category:History_of_law_enforcement','Category:History_of_courts',
  'Category:History_of_police','Category:History_of_intelligence',
  'Category:History_of_diplomacy','Category:History_of_treaties',
  'Category:History_of_alliances','Category:History_of_balance_of_power',
  'Category:History_of_geopolitics','Category:History_of_international_relations',
  'Category:History_of_peace','Category:History_of_war',
  'Category:History_of_revolutions','Category:History_of_civil_wars',
  'Category:History_of_interstate_conflicts','Category:History_of_insurgency',
  'Category:History_of_resistance','Category:History_of_collaboration',
  'Category:History_of_occupation','Category:History_of_liberation',
  'Category:History_of_decolonization','Category:History_of_nation_building',
  'Category:History_of_state_formation','Category:History_of_border_disputes',
  // Literary works & authors comprehensive
  'Category:Indian_classical_literature','Category:Indian_medieval_literature',
  'Category:Indian_modern_literature','Category:Indian_contemporary_literature',
  'Category:Indian_childrens_literature','Category:Indian_science_fiction',
  'Category:Indian_fantasy_literature','Category:Indian_historical_fiction',
  'Category:Indian_detective_fiction','Category:Indian_romance_novels',
  'Category:Indian_tragicomedy','Category:Indian_travel_writing',
  'Category:Indian_autobiographies','Category:Indian_biographies',
  'Category:Indian_short_story_collections','Category:Indian_essay_collections',
  'Category:Indian_poetry_collections','Category:Indian_plays',
  'Category:Indian_screenplays','Category:Indian_lyrics',
  'Category:Indian_epics','Category:Indian_puranas',
  'Category:Indian_vedas','Category:Indian_upanishads',
  'Category:Indian_smritis','Category:Indian_agamas',
  'Category:Indian_tantras','Category:Indian_darshanas',
  'Category:Indian_itihasas','Category:Indian_bhakti_literature',
  'Category:Indian_sufi_literature','Category:Indian_modern_poetry',
  'Category:Indian_dalit_literature','Category:Indian_tribal_literature',
  'Category:Indian_womens_writing','Category:Indian_diaspora_literature',
  'Category:World_classical_literature','Category:World_epics',
  'Category:World_poetry','Category:World_drama',
  'Category:World_novels','Category:World_short_stories',
  'Category:World_essays','Category:World_speeches',
  'Category:World_letters','Category:World_diaries',
  'Category:World_travel_literature','Category:World_adventure_literature',
  'Category:World_mystery','Category:World_thriller',
  'Category:World_horror','Category:World_fantasy',
  'Category:World_science_fiction','Category:World_historical_fiction',
  'Category:World_literary_movements','Category:World_literary_genres',
  // Specific exam topics (UPSC, SSC, etc.)
  'Category:UPSC','Category:Union_Public_Service_Commission',
  'Category:Staff_Selection_Commission','Category:SSC_CGL',
  'Category:Civil_services_examination','Category:UPSC_Civil_Services_Examination',
  'Category:Indian_engineering_services','Category:Indian_forest_service',
  'Category:Indian_foreign_service','Category:Indian_police_service',
  'Category:Indian_administrative_service','Category:State_civil_services_of_India',
  'Category:Professional_examinations_in_India','Category:Competitive_examinations_in_India',
  'Category:National_Eligibility_Test','Category:Joint_Entrance_Examination',
  'Category:Graduate_Aptitude_Test_in_Engineering','Category:Common_Admission_Test',
  'Category:Chartered_Accountant_examination','Category:Company_Secretary_examination',
  'Category:Cost_and_Management_Accountant','Category:Law_entrance_examinations_in_India',
  'Category:Medical_entrance_examinations_in_India','Category:Management_entrance_examinations_in_India',
  'Category:Pharmacy_entrance_examinations_in_India','Category:Architecture_entrance_examinations_in_India',
  'Category:Design_entrance_examinations_in_India','Category:Fashion_entrance_examinations_in_India',
  'Category:Hotel_management_entrance_examinations_in_India',
  // Days & Events
  'Category:Public_holidays_in_India','Category:National_days_of_India',
  'Category:International_observances','Category:United_Nations_days',
  'Category:World_days','Category:World_years',
  'Category:Week_of_solidarity','Category:Decade_of_action',
  'Category:Awareness_days','Category:Awareness_months',
  'Category:Health_awareness_days','Category:Environmental_awareness_days',
  'Category:Social_awareness_days','Category:Cultural_awareness_days',
  'Category:Commemorative_days','Category:Commemorative_years',
  'Category:Remembrance_days','Category:Festivals_by_country',
  'Category:Festivals_in_India','Category:Indian_festival_days',
  'Category:Hindu_festivals','Category:Muslim_festivals',
  'Category:Christian_festivals_in_India','Category:Sikh_festivals',
  'Category:Jain_festivals','Category:Buddhist_festivals',
  'Category:Zoroastrian_festivals','Category:Tribal_festivals_of_India',
  'Category:Indian_fair','Category:Indian_mela',
  'Category:Indian_carnivals','Category:Indian_parades',
  'Category:Indian_processions','Category:Indian_celebrations',
  // Sports deep
  'Category:Olympic_games_by_year','Category:Olympic_events',
  'Category:Olympic_records','Category:Olympic_statistics',
  'Category:Commonwealth_games_by_year','Category:Commonwealth_games_events',
  'Category:Asian_games_by_year','Category:Asian_games_events',
  'Category:South_Asian_games','Category:National_games_of_India',
  'Category:Indian_sports_leagues','Category:Indian_sports_championships',
  'Category:Indian_sports_awards','Category:Indian_sports_organizations',
  'Category:Indian_sports_governing_bodies','Category:Indian_sports_teams',
  'Category:Indian_women_sports','Category:Indian_men_sports',
  'Category:Indian_sports_rivalries','Category:Indian_sports_controversies',
  'Category:World_sports_events','Category:World_sports_championships',
  'Category:World_sports_records','Category:World_sports_organizations',
  'Category:World_sports_governing_bodies','Category:World_sports_awards',
  'Category:World_sports_rivalries','Category:World_sports_controversies',
  // Health & Medicine complete
  'Category:Medical_specialties','Category:Surgical_specialties',
  'Category:Diagnostic_methods','Category:Medical_treatments',
  'Category:Medications','Category:Vaccines_by_disease',
  'Category:Medical_equipment','Category:Medical_procedures',
  'Category:Medical_examinations','Category:Medical_tests',
  'Category:Medical_devices','Category:Medical_imaging',
  'Category:Hospital_types','Category:Health_facilities',
  'Category:Hospitals_in_India','Category:Medical_colleges_in_India',
  'Category:Medical_research_institutes_in_India','Category:Indian_medical_journals',
  'Category:Indian_pharmaceutical_companies','Category:Indian_generic_drugs',
  'Category:Indian_vaccines','Category:Indian_medical_tourism',
  'Category:Indian_traditional_medicine','Category:Ayurvedic_medicines',
  'Category:Yoga_postures','Category:Pranayama',
  'Category:Meditation_techniques','Category:Indian_massage',
  'Category:Unani_medicines','Category:Siddha_medicines',
  'Category:Homeopathic_remedies','Category:Alternative_medicine_systems',
  // Education complete
  'Category:Indian_educational_institutions_by_type','Category:Indian_schools_by_state',
  'Category:Indian_universities_by_state','Category:Indian_colleges_by_state',
  'Category:Indian_research_institutes_by_type','Category:Indian_centers_of_excellence',
  'Category:Indian_scholarship_programmes','Category:Indian_educational_schemes',
  'Category:Indian_educational_reforms','Category:Indian_educational_policies',
  'Category:Indian_curriculum_frameworks','Category:Indian_textbook_boards',
  'Category:Indian_examination_boards','Category:Indian_standardized_tests',
  'Category:Indian_educational_statistics','Category:Indian_literacy_programmes',
  'Category:Indian_skill_development_programmes','Category:Indian_vocational_training',
  'Category:Indian_technical_education','Category:Indian_management_education',
  'Category:Indian_medical_education_institutions','Category:Indian_law_education',
  'Category:Indian_teacher_education','Category:Indian_nursing_education_institutions',
  'Category:Indian_pharmacy_colleges','Category:Indian_dental_colleges',
  'Category:Indian_architecture_schools','Category:Indian_design_schools',
  'Category:Indian_fashion_schools','Category:Indian_hotel_management_schools',
  // Transport
  'Category:Indian_road_network','Category:Indian_expressways',
  'Category:Indian_national_highways','Category:Indian_state_highways',
  'Category:Indian_district_roads','Category:Indian_rural_roads',
  'Category:Indian_railway_lines','Category:Indian_railway_stations',
  'Category:Indian_railway_zones_and_divisions','Category:Indian_passenger_trains',
  'Category:Indian_freight_trains','Category:Indian_high_speed_rail',
  'Category:Indian_metro_systems','Category:Indian_suburban_rail',
  'Category:Indian_tram_systems','Category:Indian_monorail_systems',
  'Category:Indian_airports','Category:Indian_airlines',
  'Category:Indian_air_cargo','Category:Indian_helicopter_services',
  'Category:Indian_seaports','Category:Indian_inland_ports',
  'Category:Indian_shipping_companies','Category:Indian_ferry_services',
  'Category:Indian_water_transport_terminals','Category:Indian_canals',
  'Category:Indian_inland_waterways','Category:Indian_river_transport',
  'Category:Indian_pipeline_transport','Category:Indian_cable_cars',
  'Category:Indian_ropeways','Category:Indian_cable_railways',
  'Category:Indian_bus_transport_companies','Category:Indian_bus_rapid_transit',
  'Category:Indian_taxi_services','Category:Indian_auto_rickshaw_services',
  'Category:Indian_cycle_rickshaws','Category:Indian_horse_drawn_vehicles',
  'Category:Indian_electric_vehicle_charging_stations','Category:Indian_hydrogen_refueling_stations',
  'Category:Indian_fuel_stations','Category:Indian_rest_areas',
  'Category:Indian_toll_roads','Category:Indian_toll_bridges',
  'Category:Indian_road_tunnels','Category:Indian_railway_tunnels',
  'Category:Indian_metro_tunnels','Category:Indian_cable_stayed_bridges',
  'Category:Indian_suspension_bridges','Category:Indian_arch_bridges',
  'Category:Indian_beam_bridges','Category:Indian_culverts',
  'Category:Indian_causeways','Category:Indian_viaducts',
  'Category:Indian_overpasses','Category:Indian_flyovers',
  'Category:Indian_underpasses','Category:Indian_roundabouts',
  'Category:Indian_traffic_signals','Category:Indian_road_signs',
  // Media & Communication
  'Category:Indian_newspapers_by_language','Category:Indian_news_channels',
  'Category:Indian_news_websites','Category:Indian_news_agencies',
  'Category:Indian_magazines_by_language','Category:Indian_journals_by_subject',
  'Category:Indian_radio_stations','Category:Indian_television_channels',
  'Category:Indian_television_networks','Category:Indian_television_series_by_language',
  'Category:Indian_documentaries','Category:Indian_web_series',
  'Category:Indian_streaming_services','Category:Indian_media_companies',
  'Category:Indian_film_studios','Category:Indian_film_industries',
  'Category:Indian_film_awards','Category:Indian_film_festivals',
  'Category:Indian_film_technicians','Category:Indian_film_editors',
  'Category:Indian_cinematographers','Category:Indian_sound_designers',
  'Category:Indian_music_directors','Category:Indian_lyricists',
  'Category:Indian_playback_singers_by_language','Category:Indian_background_singers',
  'Category:Indian_music_labels','Category:Indian_music_instruments_manufacturers',
  'Category:Indian_music_schools','Category:Indian_music_competitions',
  'Category:Indian_music_awards','Category:Indian_music_festivals'
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
  'Appointments current affairs','Summits and conferences current affairs',
  // === SPECIFIC EXAM GK TERMS (for comprehensive coverage) ===
  // Indian Tribes & Communities
  'Gaon Buras','Bodo tribe','Mishing tribe','Naga tribe','Santhal tribe','Gond tribe','Bhils tribe',
  'Jarawa tribe','Sentinelese tribe','Great Andamanese tribe','Onges tribe','Shompens tribe',
  'Toda tribe','Kota tribe','Badaga tribe','Irula tribe','Panchayat system in India',
  'Gram Panchayat','Panchayati Raj','Village council','Village headman',
  'Khasi tribe','Garo tribe','Mizo tribe','Angami tribe','Ao tribe','Sema tribe','Konyak tribe',
  'Munda tribe','Oraon tribe','Ho tribe','Kharia tribe','Saharia tribe','Bhil tribe','Meena tribe',
  'Banjara tribe','Lambani tribe','Gaddi tribe','Gujjar tribe','Bakarwal tribe','Ladakh tribe',
  'Changpa tribe','Monpa tribe','Sherpa tribe','Lepcha tribe','Bhutia tribe',
  // Indian Cultural & Heritage Terms
  'Bihu dance','Bhangra dance','Garba dance','Kathak dance','Bharatanatyam dance','Kuchipudi dance',
  'Odissi dance','Kathakali dance','Manipuri dance','Mohiniyattam dance','Sattriya dance',
  'Chhau dance','Yakshagana','Therukoothu','Ramlila','Rasleela','Ghoomar dance','Kalbelia dance',
  'Pungi dance','Cham dance','Mask dance of Ladakh','Bardo Chham',
  'Muga silk','Patola silk','Banarasi silk','Kanjivaram silk','Pochampally silk',
  'Chanderi silk','Paithani silk','Tant sarees','Baluchari sarees','Dokra art',
  'Madhubani painting','Warli painting','Pattachitra painting','Kalamkari painting',
  'Gond painting','Tanjore painting','Miniature painting','Mughal painting','Rajasthani painting',
  'Bastar art','Dhokra art','Bidriware','Channapatna toys','Chikankari embroidery',
  'Kashmir shawl','Pashmina','Kani shawl','Zari work','Bandhani','Leheriya','Sanganeri print',
  'Bagru print','Ajrakh print','Kalamkari print','Ikat fabric','Patachitra cloth',
  'Naga shawl','Rajasthani mirror work','Phulkari embroidery','Kantha embroidery',
  'Kashmiri embroidery','Chamba rumal','Kasuti embroidery','Pochampally ikat',
  // Indian Festivals
  'Onam festival','Pongal festival','Makar Sankranti','Lohri festival','Baisakhi festival',
  'Durga Puja','Diwali festival','Holi festival','Navratri festival','Raksha Bandhan',
  'Eid festival','Christmas celebration in India','Maha Shivaratri','Janmashtami',
  'Ganesh Chaturthi','Kumbh Mela','Ardh Kumbh','Magh Mela','Pushkar fair','Sonepur cattle fair',
  'Hemis festival','Losar festival','Zanskar festival','Kashmir shikara festival',
  'Goa carnival','Mysore Dasara','Kerala Theyyam','Kerala Pooram','Thrissur Pooram',
  'Madurai Meenakshi festival','Konark festival','Khajuraho dance festival',
  'Ellora festival','Hampi festival','Taj Mahotsav','Surajkund craft fair',
  // Constitutional & Polity Terms
  'Fundamental Rights India','Constitution of India','Preamble of India','Directive Principles',
  'Union List India','State List India','Concurrent List India','Article 370','Article 356',
  'Article 21','Article 32','Article 14','Article 15','Article 16','Right to Equality',
  'Right to Freedom','Right against Exploitation','Right to Religion',
  'Cultural and Educational Rights','Right to Constitutional Remedies',
  'Writ of Habeas Corpus','Writ of Mandamus','Writ of Certiorari','Writ of Quo Warranto',
  'Writ of Prohibition','Indian citizenship','NRI meaning','OCI card','PIO card',
  'Election Commission of India','Union Public Service Commission','Finance Commission',
  'CAG of India','Attorney General of India','Solicitor General of India',
  'Lok Sabha','Rajya Sabha','Vidhan Sabha','Vidhan Parishad','Budget session India',
  'Monsoon session','Winter session','Zero hour India','Question hour India',
  'No-confidence motion','Censure motion','Adjournment motion','Calling attention motion',
  'President rule India','Ordinance making power','Pardoning power of President',
  'Immunity of President','Vice President of India','Chief Election Commissioner',
  'Finance Bill India','Money Bill India','Budget India',
  // Government Schemes
  'PM Kisan Samman Nidhi','PM Awas Yojana','PM Jan Dhan Yojana','PM Mudra Yojana',
  'PM Ujjwala Yojana','PM Fasal Bima Yojana','PM Kaushal Vikas Yojana',
  'PM SVANidhi','PM Street Vendor scheme','PM Matru Vandana Yojana',
  'PM Suraksha Bima Yojana','PM Jeevan Jyoti Bima Yojana','PM Atal Pension Yojana',
  'AMRUT scheme','Smart Cities Mission','Digital India','Make in India',
  'Skill India','Standup India','Startup India','Swachh Bharat Abhiyan',
  'Beti Bachao Beti Padhao','Ayushman Bharat','Ayushman Bharat Digital Mission',
  'Poshan Abhiyan','Sansad Adarsh Gram Yojana','Rashtriya Swasthya Bima Yojana',
  'National Food Security Act','Mid Day Meal scheme','Integrated Child Development Services',
  'Janani Suraksha Yojana','Janani Shishu Suraksha Karyakram',
  'Sukanya Samriddhi Yojana','PM Vaya Vandana Yojana',
  'One Rank One Pension','Soil Health Card scheme','Neeranchal project',
  'National Health Mission','Ayushman Bharat','National Education Policy 2020',
  // Geographical Terms
  'Loktak Lake','Chilika Lake','Sambhar Lake','Pulicat Lake','Kolleru Lake','Wular Lake',
  'Dal Lake','Dal lake srinagar','Nainital lake','Bhimtal lake','Lonar lake',
  'Ganga river','Yamuna river','Brahmaputra river','Godavari river','Krishna river',
  'Kaveri river','Narmada river','Tapti river','Mahanadi river','Indus river',
  'Sutlej river','Beas river','Ravi river','Chenab river','Jhelum river',
  'Peninsular rivers of India','Himalayan rivers','Perennial rivers India',
  'Western Ghats','Eastern Ghats','Himalaya mountain range','Karakhoram range',
  'Zaskar range','Ladakh range','Pir Panjal range','Aravalli range','Vindhya range',
  'Satpura range','Nilgiri mountains','Anamudi peak','Kanchenjunga peak',
  'Karakoram pass','Zoji La pass','Nathu La pass','Bomdi La pass',
  'Thar desert','Rann of Kutch','Chambal valley','Brahmaputra valley',
  'Mahanadi delta','Krishna delta','Kaveri delta','Godavari delta',
  // Historical Terms & Events
  'Battle of Plassey','Battle of Buxar','Battle of Panipat','First war of Indian Independence 1857',
  'Jalianwala Bagh massacre','Quit India Movement','Salt Satyagraha','Non Cooperation Movement',
  'Civil Disobedience Movement','Simon Commission','Rowlatt Act','Government of India Act 1935',
  'Indian Councils Act 1909','Regulating Act 1773','Pitt India Act 1784',
  'Charter Act 1813','Charter Act 1833','Charter Act 1853',
  'Vijayanagara empire','Hampi ruins','Mughal architecture','Taj Mahal','Qutub Minar',
  'Red Fort','India Gate','Gateway of India','Sanchi stupa','Ajanta caves',
  'Ellora caves','Elephanta caves','Mahabalipuram temples','Khajuraho temples',
  'Konark Sun Temple','Jagannath Puri temple','Meenakshi temple','Somnath temple',
  'Kashi Vishwanath temple','Golden Temple','Badrinath temple','Kedarnath temple',
  'Rameswaram temple','Tirupati Balaji temple','Shirdi Sai Baba temple',
  // Scientific Terms
  'DNA structure','RNA types','Genetic code','Chromosome','Gene mutation','CRISPR Cas9',
  'Photosynthesis process','Respiration types','Nitrogen cycle','Carbon cycle',
  'Water cycle','Ozone layer depletion','Greenhouse effect','Global warming effects',
  'Acid rain','Eutrophication','Biomagnification','Bioaccumulation',
  'Newton laws of motion','Laws of thermodynamics','Ohm law','Coulomb law',
  'Faraday law','Lenz law','Bernoulli principle','Archimedes principle',
  'Atomic number','Atomic mass','Isotopes','Isobars','Isotones',
  'Periodic table groups','Periodic table trends','Chemical bonding types',
  'Valence electrons','Oxidation number','Redox reactions',
  'Force and pressure','Work and energy','Power and efficiency',
  'Electric current','Magnetic field','Electromagnetic induction','Alternating current',
  'Reflection of light','Refraction of light','Dispersion of light','Scattering of light',
  'Human eye structure','Human ear structure','Human heart structure',
  'Human brain parts','Nervous system','Endocrine system','Digestive system',
  'Respiratory system','Circulatory system','Excretory system','Reproductive system',
  'Vitamins and their functions','Minerals and their sources','Deficiency diseases',
  'Common diseases and their causes','Vaccines and their uses',
  // Sports Terms
  'Olympic Games history','Olympic symbols','Olympic medals','Asian Games',
  'Commonwealth Games','Cricket World Cup','T20 World Cup','IPL tournament',
  'FIFA World Cup','World Cup football','Hockey World Cup','Badminton World Championship',
  'Thomas Cup','Uber Cup','Davis Cup','Wimbledon','French Open','US Open','Australian Open',
  'Grand Slam','Arjuna Award','Dronacharya Award','Rajiv Gandhi Khel Ratna',
  'Major Dhyan Chand Award','Sachin Tendulkar','Milkha Singh','PT Usha',
  'M S Dhoni','Virat Kohli','Neeraj Chopra','P V Sindhu','Saina Nehwal',
  'Viswanathan Anand','Dipa Karmakar','Abhinav Bindra','Mary Kom',
  // Awards & Honours
  'Bharat Ratna','Padma Vibhushan','Padma Bhushan','Padma Shri',
  'Param Vir Chakra','Ashoka Chakra','Maha Vir Chakra','Vir Chakra',
  'Gallantry awards India','Sahitya Akademi Award','Jnanpith Award',
  'Dadasaheb Phalke Award','National Film Awards','Ramon Magsaysay Award',
  'Nobel Prize categories','Nobel Peace Prize','Nobel Literature Prize',
  'Nobel Physics Prize','Nobel Chemistry Prize','Nobel Medicine Prize',
  // === ADDITIONAL DEEP COVERAGE (2025-2026 exam syllabus comprehensive) ===
  // Agriculture & Allied
  'Agriculture in India','Agro climatic zones','Irrigation in India','Rainfed agriculture',
  'Dryland farming','Crop rotation','Mixed cropping','Intercropping','Precision farming',
  'Fertilizer types','Biofertilizers','Integrated pest management','Organic certification',
  'Animal husbandry in India','Poultry farming','Dairy development','Fisheries in India',
  'Blue revolution','White revolution','Yellow revolution','Golden revolution','Pink revolution',
  // Defence & Security
  'Indian Army','Indian Navy','Indian Air Force','Coast Guard','Central Armed Police Forces',
  'Defence production in India','Make in India defence','Indian defence exports',
  'Counter terrorism','Internal security','Cyber security India','Border security India',
  'Intelligence agencies India','RAW','IB','NIA','CBI','Enforcement Directorate',
  'Paramilitary forces in India','Assam Rifles','BSF','CRPF','ITBP','SSB',
  'Naval exercises','Air force exercises','Joint military exercises India',
  'Strategic nuclear command','Nuclear triad','No first use policy',
  // Energy & Power
  'Energy sector in India','Power generation in India','Electricity act 2003',
  'Thermal power plants India','Hydroelectric power in India','Solar energy in India',
  'Wind energy in India','Nuclear power in India','Uranium reserves India','Thorium reserves India',
  'Renewable energy target 2030','Green hydrogen mission','Energy efficiency India',
  'Oil and gas reserves India','Strategic petroleum reserves','Coal reserves India',
  'Electric vehicles India','FAME scheme','Battery swapping policy',
  // Environment Specific
  'Wildlife conservation India','Project Tiger','Project Elephant','Project Snow Leopard',
  'Vulture conservation','Crocodile conservation','Sea turtle conservation',
  'Climate action plan India','State action plan on climate change','Carbon credit India',
  'Green India Mission','National adaptation fund','Clean energy fund',
  'Forest rights act','Wildlife protection act 1972','Environment protection act 1986',
  'Air act 1981','Water act 1974','Biological diversity act 2002',
  'Wetland conservation rules','Coastal regulation zone','Ecomark scheme',
  // Science & Tech Updates
  'Semiconductor mission India','AI mission India','Quantum computing India',
  'National supercomputing mission','Deep ocean mission','National hydrogen mission',
  'BioE3 policy','Anusandhan national research foundation','National research foundation',
  'Genome India project','Mission Mausam','National quantum mission',
  'Digital public infrastructure','UPI payment system','OCEN','Account aggregator',
  'Open network for digital commerce','Data protection bill India','Digital personal data protection',
  '5G in India','6G','Bharat 6G alliance','Satellite internet India','Space based internet',
  // Polity & Constitution Advanced
  'Indian parliamentary committees','Public accounts committee','Estimates committee',
  'Committee on public undertakings','Department related parliamentary committees',
  'Joint parliamentary committee','Select committee','Standing committee',
  'State legislature','Legislative council','Legislative assembly',
  'Governor powers','Chief minister','Council of ministers','Cabinet committees',
  'Coalition government India','Anti defection law','Tenth schedule',
  'President rule','National emergency','State emergency','Financial emergency',
  'Interstate council','Zonal council','North eastern council',
  'Election process India','Model code of conduct','Electoral bonds','NOTA',
  'Voter verified paper audit trail','Electronic voting machine','Simultaneous elections',
  'Delimitation commission','Representation of people act',
  'Right to information','Lokpal','Lokayukta','Citizen charter',
  // Indian Society & Social Issues
  'Urbanization in India','Migration in India','Rural urban divide','Slums in India',
  'Poverty alleviation programmes','MGNREGA','Day-NULM','Sansad Adarsh Gram',
  'Gender issues India','Women empowerment','Welfare schemes for women',
  'Child labour India','Child marriage','Juvenile justice','POSCO act',
  'Human trafficking','Bonded labour','Transgender rights India',
  'Minorities in India','Sachar committee','Justice Ranganath Mishra committee',
  'SC ST reservation','OBC reservation','Economically weaker section','Creamy layer',
  'National commission for SC','National commission for ST','National commission for OBC',
  'Tribal development','PVTG','Primitive vulnerable tribal groups',
  'Disability rights India','RPWD act','Mental healthcare act',
  'Drug abuse India','Alcohol policy India','Tobacco control India',
  // International Relations Depth
  'India US relations','India China relations','India Pakistan relations',
  'India Russia relations','India Japan relations','India EU relations',
  'India UK relations','India France relations','India Germany relations',
  'India Australia relations','India Israel relations','India Iran relations',
  'India Central Asia relations','India Africa relations','India Latin America relations',
  'India ASEAN relations','India Pacific island countries','India Gulf relations',
  'Neighbourhood first policy','Act East policy','Think West policy',
  'SAGAR initiative','Indian Ocean Rim Association','Quadrilateral security dialogue',
  'Indo Pacific strategy','South China Sea dispute','Afghanistan peace process',
  'United Nations reforms','UN Security Council reforms','G4 countries',
  'Nuclear Suppliers Group','Missile Technology Control Regime','Wassenaar arrangement',
  'Australia group','International solar alliance','Coalition for disaster resilient infrastructure',
  'Global biofuel alliance','LeadIT','One Earth one family one future',
  'Climate finance','Loss and damage fund','Green climate fund',
  // Indian Economy Advanced
  'National income India','GDP growth','Gross domestic product','Gross national product',
  'Net national product','Factor cost vs market price','GVA','GVA vs GDP',
  'Inflation types','CPI','WPI','GDP deflator','Core inflation',
  'Monetary policy committee','Repo rate','Reverse repo rate','CRR','SLR','MSF','Bank rate',
  'Open market operations','Quantitative easing','Liquidity trap',
  'Fiscal policy India','Union budget','Revenue budget','Capital budget','Fiscal deficit',
  'Revenue deficit','Primary deficit','Effective revenue deficit','FRBM act',
  'Goods and services tax','GST council','GST slabs','Compensation cess',
  'Direct taxes','Indirect taxes','Income tax','Corporate tax','Capital gains tax',
  'Tax buoyancy','Tax elasticity','Black money','Benami transactions','Demonetization',
  'Banking sector India','NPA crisis','Insolvency and bankruptcy code','Bad bank',
  'Basel norms','Ind AS','Prompt corrective action','Financial stability report',
  'Insurance sector India','IRDAI','Pension sector','NPS','Atal pension yojana',
  'Capital market India','SEBI','Stock exchanges','NSE','BSE','SENSEX','NIFTY',
  'Primary market','Secondary market','FPO','IPO','Mutual funds','Debt market',
  'Foreign direct investment','Foreign portfolio investment','External commercial borrowings',
  'Balance of payments','Current account deficit','Capital account','Forex reserves',
  'Export promotion','Special economic zones','Export oriented units','Foreign trade policy',
  'World Trade Organization','Trade remedies','Anti dumping','Countervailing duties',
  // Additional Cultural Depth
  'Folk music India','Folk dance India','Folk theatre India','Folk painting India',
  'Classical music ragas','Hindustani music','Carnatic music','Indian muscial instruments',
  'Indian sculpture schools','Indian architecture styles','Nagara style','Dravida style',
  'Vesara style','Rock cut architecture India','Cave architecture India',
  'Temple architecture India','Indo Islamic architecture','Colonial architecture India',
  'Modern architecture India','Indian painting styles','Rajput painting','Mughal painting',
  'Pahari painting','Company painting','Bengal school of art',
  'Indian literature periods','Sanskrit literature','Pali literature','Prakrit literature',
  'Bhakti literature','Sufi literature','Indian epic poetry','Indian drama tradition',
  'Indian literary awards','Sahitya akademi','Jnanpith','Vyasa samman','Saraswati samman',
  // Historical Depth
  'Prehistoric India','Paleolithic India','Mesolithic India','Neolithic India','Chalcolithic India',
  'Harappan civilization','IVC people','IVC religion','IVC trade','IVC decline',
  'Vedic age','Rigvedic period','Later vedic period','Vedic society','Vedic economy',
  'Mahajanapadas','Haryanka dynasty','Shishunaga dynasty','Nanda empire','Magadha empire',
  'Persian invasion India','Alexander invasion India','Indo Greek kingdom','Saka kingdom',
  'Parthian kingdom','Kushana empire','Satavahana dynasty','Western Kshatrapas',
  'Pallava dynasty','Chalukya dynasty','Rashtrakuta dynasty','Chola empire','Chera empire',
  'Pandya empire','Kakatiya dynasty','Hoysala empire','Yadavas of Devagiri',
  'Vijayanagara empire administration','Bahmani sultanate','Deccan sultanates',
  'Delhi sultanate dynasties','Slave dynasty','Khilji dynasty','Tughlaq dynasty',
  'Sayyid dynasty','Lodi dynasty','Delhi sultanate administration',
  'Mughal administration','Mansabdari system','Zamindari system','Ryotwari system',
  'Mahalwari system','Permanent settlement','British economic policy India',
  'Revenue settlements India','Commercialization agriculture India',
  'Deindustrialization India','Drain of wealth','Famine policy British India',
  'Indian councils acts','Minto Morley reforms','Montagu Chelmsford reforms',
  'Government of India acts','Cripps mission','Cabinet mission','Mountbatten plan',
  'Constituent assembly India','Drafting committee','Adoption of constitution',
  // Science & Tech Experimental
  'Indian nuclear tests','Smiling Buddha','Pokhran','Operation Shakti',
  'Civil nuclear agreement','Nuclear liability law','Nuclear fuel cycle India',
  'Indian space missions','Mars orbiter mission','Chandrayaan 1','Chandrayaan 2',
  'Chandrayaan 3','Aditya L1','XPoSat','Gaganyaan human spaceflight',
  'Venus orbiter mission','Shukrayaan','Indian space station','Bharatiya Antariksha station',
  'Launch vehicles India','SLV','ASLV','PSLV','GSLV','LVM3','SSLV','Reusable launch vehicle',
  'Indian remote sensing','Cartosat','IRS','Resourcesat','Oceansat','Scatsat',
  'Indian navigation','NAVIC','IRNSS','GPS aided geo augmented navigation',
  'Chandrasekhar limit','Raman effect','Bose Einstein statistics','Saha ionization equation',
  'Indian physicists contributions','Indian mathematicians contributions',
  'Ancient Indian science','Indian astronomy ancient','Indian medicine ancient',
  'Indian chemistry ancient','Indian metallurgy ancient',
  'Council of scientific and industrial research','ICAR','ICMR','DBT','DST',
  // Geography Applied
  'Indian agriculture types','Cropping seasons India','Kharif crops','Rabi crops','Zaid crops',
  'Minerals India','Iron ore belts','Coal fields India','Oil reserves India','Gas reserves India',
  'Industrial regions India','Textile industry India','Steel industry India',
  'IT industry India','Pharmaceutical industry India','Automobile industry India',
  'Industrial corridors India','Delhi Mumbai industrial corridor','Amritsar Kolkata corridor',
  'Vizag Chennai corridor','Chennai Bengaluru corridor','Bengaluru Mumbai corridor',
  'Transport network India','Road network India','Rail network India','Air network India',
  'Major ports India','Major airports India','Major railway stations India',
  'Human geography India','Population distribution','Population density','Sex ratio India',
  'Literacy rate India','Life expectancy India','Urbanization trends India',
  'Migration patterns India','Census 2011 India','NFHS surveys India',
  'World physical geography','Major volcanoes','Major earthquakes zones','Major biomes',
  'Major ocean currents','Major wind systems','Major climate types','Major soil types',
  // Ethics & Integrity
  'Ethics definition','Moral philosophy','Applied ethics','Business ethics',
  'Administrative ethics','Probity in governance','Integrity','Objectivity',
  'Impartiality','Non partisanship','Empathy','Tolerance','Compassion',
  'Emotional intelligence','Aptitude','Attitude','Moral courage',
  'Conflict of interest','Code of conduct','Code of ethics','Whistleblower protection',
  'Citizen charter','Right to information','Social audit','Public accountability',
  'Corruption types','Prevention of corruption act','Lokpal act',
  'Vigilance machinery','Central vigilance commission','Vigilance commissioner',
  // Mental Ability & Reasoning
  'Logical reasoning','Analytical reasoning','Critical reasoning','Verbal reasoning',
  'Non verbal reasoning','Abstract reasoning','Spatial reasoning',
  'Data interpretation','Data sufficiency','Puzzles','Seating arrangement',
  'Blood relations','Direction sense','Number series','Letter series',
  'Coding decoding','Inequalities','Syllogism','Statement assumption',
  'Statement conclusion','Statement argument','Course of action',
  'Input output','Order ranking','Clock calendar',
  // Maths & Quantitative
  'Percentage','Profit and loss','Discount','Simple interest','Compound interest',
  'Ratio and proportion','Partnership','Average','Mixture and allegation',
  'Time and work','Pipe and cistern','Speed distance and time','Boat and river',
  'Number system','HCF LCM','Simplification','Approximation','Square root',
  'Surds and indices','Power and exponents','Quadratic equations',
  'Arithmetic progression','Geometric progression','Coordinate geometry',
  'Percentage data interpretation','Bar graph','Line graph','Pie chart','Table data',
  // English & Grammar
  'English grammar','Vocabulary','Synonyms','Antonyms','One word substitution',
  'Idioms and phrases','Phrasal verbs','Spelling errors','Sentence correction',
  'Sentence improvement','Para jumbles','Reading comprehension','Cloze test',
  'Spotting error','Fill in the blanks','Active passive','Direct indirect',
  'Parts of speech','Tenses','Modals','Articles','Prepositions','Conjunctions',
  'Subject verb agreement','Conditional sentences','Question tags',
  'Comprehension passages','Theme detection','Title selection',
  'Indian English literature','Commonly confused words',
  // Current Affairs Specific
  'India in 2025','India in 2026','Parliament session 2025','Budget 2025',
  'Economic survey 2025','India economic outlook','G20 India presidency outcomes',
  'India UNSC presidency','India space 2025','India defence 2025',
  'India foreign visits 2025','India summits 2025','India bilateral 2025',
  'State elections 2025','General elections India','By elections India',
  'New bills India 2025','New laws India 2025','Ordinances India',
  'Government schemes new 2025','Government schemes new 2026',
  'International organizations India role','World events 2025',
  'Important committees 2025','Important appointments 2025',
  'Sports events 2025','Sports events 2026','Olympics updates',
  'Awards 2025','Awards 2026','Nobel Prize 2025','Nobel Prize 2026',
  'Books and authors 2025','Books and authors 2026',
  'Summits conferences 2025','Days and themes 2025','Days and themes 2026',
  'MoUs India signed 2025','Agreements India 2025',
  'Environment COP','Climate commitments India','Green credit programme',
  'India index rankings','Ease of doing business','Global hunger index',
  'Human development index','Global innovation index','Corruption perception index',
  'Press freedom index','World happiness report','Global gender gap index'
];

WIKI.randomQuestion = function() {
  return WIKI._batchRandom(50);
};

WIKI._batchRandom = function(count) {
  count = count || 80;
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
  count = count || 80;
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

WIKI._discoverSubcategories = function() {
  // Pick a random known category and fetch its subcategories to expand coverage
  var cat = pick(WIKI._categoryTopics);
  if (!cat) return Promise.resolve([]);
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + encodeURIComponent(cat) + '&cmtype=subcat&cmlimit=20&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var subs = res && res.query && res.query.categorymembers;
      if (!subs || subs.length === 0) return [];
      var titles = [];
      subs.forEach(function(s) {
        var t = s.title;
        if (t && t.indexOf('Category:') === 0 && WIKI._categoryTopics.indexOf(t) < 0) {
          WIKI._categoryTopics.push(t);
          titles.push(t);
        }
      });
      // Fetch pages from the discovered subcategories
      var results = [];
      var fetchPromises = titles.slice(0, 5).map(function(subcat) {
        return WIKI._batchCategory(subcat, 20);
      });
      return Promise.all(fetchPromises).then(function(batches) {
        batches.forEach(function(qs) {
          if (qs && qs.length) {
            qs.forEach(function(q) { if (q && q.q && q.a) results.push(q); });
          }
        });
        return results;
      });
    })
    .catch(function(e) { console.error('[WIKI] _discoverSubcategories failed:', e); return []; });
};

WIKI._batchRecentChanges = function(count) {
  count = count || 80;
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
  return fetch('https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&explaintext&exlimit=max&exchars=3000&titles=' + encodeURIComponent(titles.join('|')) + '&format=json&origin=*')
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

WIKI._batchAllPages = function(count) {
  // Fetch from Wikipedia's ENTIRE main namespace (6M+ articles) by sampling
  count = count || 80;
  var offset = Math.floor(Math.random() * 6000000);
  return fetch('https://en.wikipedia.org/w/api.php?action=query&list=allpages&apnamespace=0&aplimit=' + count + '&apoffset=' + offset + '&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.allpages;
      if (!pages || pages.length === 0) return [];
      var titles = pages.map(function(p) { return p.title; }).filter(function(t) {
        return t && !/^List of/i.test(t) && !/^Timeline of/i.test(t) && !/^Outline of/i.test(t) && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t);
      });
      if (titles.length === 0) return [];
      return WIKI._batchSummaries(titles);
    })
    .catch(function(e) { console.error('[WIKI] _batchAllPages failed:', e); return []; });
};

WIKI._followLinks = function() {
  // Follow outgoing links from seen titles to discover more articles
  if (WIKI._seenTitles.length < 20) return Promise.resolve([]);
  var seedTitles = [];
  var used = {};
  for (var si = WIKI._seenTitles.length - 1; si >= 0 && seedTitles.length < 3; si--) {
    var st = WIKI._seenTitles[si];
    if (st && !used[st] && st.length > 3 && !/^Category:/i.test(st)) { seedTitles.push(st); used[st] = true; }
  }
  if (seedTitles.length === 0) return Promise.resolve([]);
  var titlesParam = encodeURIComponent(seedTitles.join('|'));
  return fetch('https://en.wikipedia.org/w/api.php?action=query&prop=links&titles=' + titlesParam + '&plnamespace=0&pllimit=50&format=json&origin=*')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var pages = res && res.query && res.query.pages;
      if (!pages) return [];
      var linked = [];
      for (var id in pages) {
        var pl = pages[id].links;
        if (pl && pl.length) {
          pl.forEach(function(l) {
            if (linked.length >= 30) return;
            var t = l.title;
            if (t && !/^List of/i.test(t) && WIKI._seenTitles.indexOf(t) < 0 && WIKI._isKnown(t)) linked.push(t);
          });
        }
      }
      if (linked.length === 0) return [];
      return WIKI._batchSummaries(linked);
    })
    .catch(function(e) { console.error('[WIKI] _followLinks failed:', e); return []; });
};

WIKI._batchSearch = function(topic, count) {
  count = count || 80;
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
  return WIKI._batchSearch(topic, 80);
};

WIKI.onThisDay = function(dateStr) {
  var parts = dateStr.split('-');
  if (parts.length !== 3) return Promise.resolve([]);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  return fetch('https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/' + month + '/' + day)
    .then(function(r) { if (!r.ok) throw new Error('onThisDay HTTP ' + r.status); return r.json(); })
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
  // Also add all distractor items (they're all valid known entities)
  for (var dt in WIKI._distractorTypes) add(WIKI._distractorTypes[dt]);
};

WIKI._isKnown = function(entity) {
  if (!entity) return false;
  var e = String(entity).toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  if (!e || e.length < 2) return false;
  if (/^(list of|timeline of|outline of)/i.test(e)) return false;
  if (/^(the |a |an )/i.test(e)) return false;
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
  // Accept any multi-word entity with length > 5
  if (entity.split(' ').length > 1 && entity.length > 5) return true;
  return entity.length > 4;
};

WIKI.prefetch = function() {
  if (WIKI._prefetching) return;
  WIKI._prefetching = true;
  WIKI._loadKnown();

  var _fetchBackoff = 0;
  function fetchBatch() {
    // Rotate through 12 diverse sources for maximum Wikipedia-wide coverage
    WIKI._sourceIndex = (WIKI._sourceIndex + 1) % 12;

    var promise;
    var srcIdx = WIKI._sourceIndex;
    if (srcIdx === 0) {
      var topic = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(topic);
    } else if (srcIdx === 1) {
      promise = WIKI._batchRandom();
    } else if (srcIdx === 2) {
      var cat = pick(WIKI._categoryTopics);
      promise = WIKI._batchCategory(cat);
    } else if (srcIdx === 3) {
      promise = WIKI._batchRecentChanges();
    } else if (srcIdx === 4) {
      var et = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(et);
    } else if (srcIdx === 5) {
      var cat2 = pick(WIKI._categoryTopics);
      promise = WIKI._batchCategory(cat2);
    } else if (srcIdx === 6) {
      var et2 = pick(WIKI._examTopics);
      promise = WIKI._batchSearch(et2);
    } else if (srcIdx === 7) {
      var cat3 = pick(WIKI._categoryTopics);
      promise = WIKI._batchCategory(cat3);
    } else if (srcIdx === 8) {
      // Source 8: ALLPAGES — sample from Wikipedia's ENTIRE 6M+ article corpus
      promise = WIKI._batchAllPages();
    } else if (srcIdx === 9) {
      // Source 9: Follow links from already-seen articles to discover related content
      promise = WIKI._followLinks();
    } else if (srcIdx === 10) {
      // Source 10: Discover new subcategories from existing categories and fetch their pages
      promise = WIKI._discoverSubcategories();
    } else {
      // Source 11: Systematic on-this-day for ALL 365 days (historical events BC-CE)
      promise = WIKI._fetchNextOnThisDay();
    }

    promise.then(function(qs) {
      _fetchBackoff = Math.max(0, _fetchBackoff - 200);
      if (qs && qs.length) {
        for (var i = 0; i < qs.length; i++) {
          if (qs[i] && qs[i].q && qs[i].a) {
            if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(qs[i]);
          }
        }
      }
      // Dynamically adjust fetch speed based on pool fill level
      var delay = WIKI._pool.length < WIKI._poolSize ? 1500 : 3000;
      delay += Math.random() * 1000; // jitter
      delay += _fetchBackoff;
      setTimeout(fetchBatch, delay);
    }).catch(function() { console.error('[WIKI] fetchBatch failed, retrying...'); _fetchBackoff += 1000; setTimeout(fetchBatch, 2000 + Math.random() * 1000 + _fetchBackoff); });
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
          if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(otdQuestions[i]);
        }
      }
    }).catch(function() {});
  }

  // Initialize systematic on-this-day queue for ALL 366 days
  WIKI._queueAllOnThisDay();
  fetchOnThisDay();
  WIKI.prefetchCurrentEvents();
  // Kick off background historical on-this-day prefetching (covers BC to CE) — throttled
  if (typeof _fetchRandomHistoricalOnThisDay === 'function') {
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 3000);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 8000);
    setTimeout(function() { if (typeof _fetchRandomHistoricalOnThisDay === 'function') _fetchRandomHistoricalOnThisDay(); }, 15000);
  }
  // Start the rotating fetchBatch cycle (rate-limited internally)
  setTimeout(function() { fetchBatch(); }, 1500);
};

WIKI.poolQuestion = function() {
  if (WIKI._pool.length > 0) return WIKI._pool.shift();
  return null;
};

WIKI._entityType = function(desc, firstSentence) {
  var c = (desc + ' ' + firstSentence).toLowerCase();
  if (/(was a|was an|born|died|known for|scientist|politician|author|actor|artist|musician|philosopher|king |queen |leader|engineer|physicist|chemist|biologist|mathematician|poet|writer|novelist|painter|sculptor|composer|singer|dancer|inventor|explorer|entrepreneur|philanthropist|reformer|activist|freedom fighter|guru|saint|prime minister|president |governor|chief minister|minister|judge|lawyer|doctor|surgeon|nobel laureate|athlete|cricketer|footballer|sportsman|sportswoman|general|admiral|marshal|chief|politician|administrator|bureaucrat|diplomat|ambassador|raja|maharaja|nawab|begum|sultan|empress|emperor|prince|princess)/.test(c)) return 'person';
  if (/(country|city|town|village|state|province|region|island|river|mountain|lake|ocean|sea|capital|located in|situated in|flows through|lies in|peninsula|bay|gulf|desert|plateau|valley|continent|archipelago|delta|strait|canyon|basin|border|zone|plain|hill|port|airport|national park|sanctuary|biosphere|waterfall|glacier|cave)/.test(c)) return 'place';
  if (/(organization|company|agency|institute|university|college|committee|commission|bureau|council|board|fund|bank|party|association|society|ministry|department|corporation|firm|foundation|centre|center|mission|programme|program|initiative|authority|forum|group|club|union|league|squadron|regiment|division|department|directorate)/.test(c)) return 'org';
  if (/(war|battle|conflict|revolution|movement|disaster|earthquake|flood|storm|pandemic|epidemic|treaty|conference|summit|festival|event|incident|accident|invasion|rebellion|uprising|campaign|expedition|crusade|siege|massacre|genocide|holocaust|famine|drought|tsunami|hurricane|tornado|explosion|attack|competition|championship|tournament|olympics|game|match|series)/.test(c)) return 'event';
  if (/(species|genus|mammal|bird|fish|insect|reptile|amphibian|plant|tree|flower|animal|organism|fungus|bacteria|virus|breed|variety|cultivar|fauna|flora|wildlife|butterfly|beetle|frog|toad|lizard)/.test(c)) return 'living';
  if (/(book|novel|poem|play|film|movie|painting|sculpture|song|album|article|essay|story|literature|work|composition|biography|autobiography|memoir|treatise|commentary|translation|anthology|collection|journal|magazine|newspaper)/.test(c)) return 'work';
  if (/(is a|refers to|concept|theory|principle|law|effect|phenomenon|process|method|technique|system|field|branch|discipline|science|art|practice|doctrine|ideology|philosophy|religion|faith|sect|school|movement)/.test(c)) return 'concept';
  if (/(tribe|clan|caste|community|ethnic group|nomad|pastoralist|hunter gatherer)/.test(c)) return 'person';
  if (/(language|dialect|script|alphabet|grammar|vocabulary)/.test(c)) return 'concept';
  if (/(dynasty|kingdom|empire|sultanate|caliphate|emirate)/.test(c)) return 'event';
  if (/(instrument|tool|device|machine|apparatus|equipment|vehicle|aircraft|ship|boat|submarine)/.test(c)) return 'concept';
  if (/(dance|music|song|rhythm|melody|instrumental)/.test(c)) return 'work';
  return 'other';
};

WIKI._onThisDayCache = [];
WIKI._currentEventCache = [];
WIKI._fetchedOnThisDayDays = {};
WIKI._onThisDayQueue = [];

WIKI._queueAllOnThisDay = function() {
  // Queue ALL 366 days for systematic historical event fetching
  if (WIKI._onThisDayQueue.length > 0) return;
  for (var m = 1; m <= 12; m++) {
    var maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    for (var d = 1; d <= maxDay; d++) {
      WIKI._onThisDayQueue.push({ m: m, d: d });
    }
  }
  // Shuffle so we get random days across the year
  for (var si = WIKI._onThisDayQueue.length - 1; si > 0; si--) {
    var sj = Math.floor(Math.random() * (si + 1));
    var tmp = WIKI._onThisDayQueue[si]; WIKI._onThisDayQueue[si] = WIKI._onThisDayQueue[sj]; WIKI._onThisDayQueue[sj] = tmp;
  }
};

WIKI._fetchNextOnThisDay = function() {
  if (WIKI._onThisDayQueue.length === 0) { WIKI._queueAllOnThisDay(); }
  if (!WIKI._onThisDayQueue.length) return Promise.resolve([]);
  var day = WIKI._onThisDayQueue.shift();
  var key = day.m + '-' + day.d;
  if (!WIKI._fetchedOnThisDayDays[key]) {
    WIKI._fetchedOnThisDayDays[key] = true;
    var mm = String(day.m).padStart(2, '0');
    var dd = String(day.d).padStart(2, '0');
    var dateKey = '0000-' + mm + '-' + dd;
    return WIKI.onThisDay(dateKey).then(function(items) {
      if (!items || items.length === 0) return;
      var otdQs = WIKI._makeFromOnThisDay(items);
      for (var qi = 0; qi < otdQs.length; qi++) {
        if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(otdQs[qi]);
      }
    }).catch(function() {});
  }
  return Promise.resolve([]);
};

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
  if (WIKI._seenTitles.length > 2000) WIKI._seenTitles.shift();

  var category = WIKI._classify(desc, extract);
  var catName = category ? category.replace(/_/g, ' ') : 'GK';

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];

  var factSentences = [title];
  if (desc) factSentences.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 20); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15 && factSentences.join('. ').length + sf.length < 4000) factSentences.push(sf);
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
    if (results.length >= 5) return;
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
    if (WIKI._seenValues.length > 2000) WIKI._seenValues.shift();

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
        if (WIKI._pool.length < WIKI._poolSize) WIKI._pool.push(qs[qi]);
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

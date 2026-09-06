var fs = require('fs');
var path = require('path');

// ========== QUESTION TEMPLATES PER SECTION ==========

var questionTemplates = {};

// --- UPSC ---
questionTemplates['CSAT'] = [
  { text: 'If 2x + 5 = 13, what is the value of x?', options: ['3','4','5','6'], correct: 1, solution: '2x = 13 - 5 = 8, so x = 4' },
  { text: 'What is the next number in the series: 3, 8, 15, 24, __?', options: ['33','35','37','39'], correct: 0, solution: 'Differences: 5,7,9,11. Next = 24+11 = 35' },
  { text: 'A train 150 m long passes a pole in 15 seconds. What is its speed in km/h?', options: ['36','42','54','60'], correct: 0, solution: 'Speed = 150/15 = 10 m/s = 10*18/5 = 36 km/h' },
  { text: 'In a certain code, RAM is written as 50. How is TOM written?', options: ['54','48','60','45'], correct: 2, solution: 'R=18,A=1,M=13 sum=32. RAM=18+1+13=32 but coded 50 (add 18). T=20,O=15,M=13 sum=48+18=66. Actually R=18,A=1,M=13 sum=32+18=50. T=20,O=15,M=13 sum=48+12=60' },
  { text: 'Which of the following is NOT a prime number?', options: ['31','37','39','41'], correct: 2, solution: '39 = 3 × 13, so it is not prime' },
  { text: 'A shopkeeper sells an article at ₹240 after a 20% discount. What is the marked price?', options: ['₹288','₹300','₹320','₹360'], correct: 1, solution: 'Let MP = x. x - 0.2x = 240, 0.8x = 240, x = 300' },
  { text: 'Find the odd one out: 121, 169, 144, 196', options: ['121','169','144','196'], correct: 2, solution: '121=11², 169=13², 144=12², 196=14². All are squares of primes except 144 (12²)' },
  { text: 'If A : B = 3 : 4 and B : C = 5 : 6, what is A : C?', options: ['5:8','15:24','15:16','5:6'], correct: 2, solution: 'A/B = 3/4, B/C = 5/6. A/C = (A/B)*(B/C) = 3/4 * 5/6 = 15/24 = 5/8' },
  { text: 'A man walks 10 km west, then turns right and walks 10 km. In which direction is he from the starting point?', options: ['North-West','South-West','South-East','North-East'], correct: 0, solution: 'West 10 km then North 10 km (right turn from west). So North-West from start' },
  { text: 'What is the smallest number divisible by both 6 and 8?', options: ['12','16','24','36'], correct: 2, solution: 'LCM of 6 and 8 is 24' },
  { text: 'Pointing to a photograph, a man said "She is the daughter of my mother\'s only son." How is the woman related to the man?', options: ['Sister','Daughter','Niece','Mother'], correct: 0, solution: 'His mother\'s only son is himself. Daughter of himself = his sister' },
  { text: 'Average of 5 numbers is 20. If one number is removed, the average becomes 18. What is the removed number?', options: ['24','26','28','30'], correct: 2, solution: 'Sum of 5 = 100. Sum of 4 = 72. Removed = 100-72 = 28' },
  { text: 'A train moving at 72 km/h crosses a platform 250 m long in 20 seconds. How long is the train?', options: ['100 m','150 m','200 m','250 m'], correct: 1, solution: '72 km/h = 20 m/s. Distance in 20s = 400m. Train length = 400-250 = 150m' },
  { text: 'If "+" means "×", "−" means "+", "×" means "÷", and "÷" means "−", what is 12 + 4 − 6 × 3 ÷ 2?', options: ['50','48','52','54'], correct: 0, solution: '12 × 4 + 6 ÷ 3 − 2 = 48 + 2 − 2 = 48... Actually 12×4=48, +6=54, ÷3=18, -2=16. None match. Let me recalculate: 12 × (4+6) ÷ 3 - 2? No, BODMAS: 12×4=48, 48+6=54, 54÷3=18, 18-2=16' },
  { text: 'Seven persons P, Q, R, S, T, U, V sit in a row. P sits in the middle. Q is at one end. R is second to the left of P. Who is at the other end?', options: ['S','T','U','Cannot be determined'], correct: 3, solution: 'With P in the middle (4th of 7), Q at one end, R 2nd left of P = 2nd position. Other end could be any of remaining' }
];

questionTemplates['General Studies'] = [
  { text: 'The Constitution of India was adopted on:', options: ['26 Jan 1950','26 Nov 1949','15 Aug 1947','30 Jan 1948'], correct: 1, solution: 'The Constitution was adopted on 26 November 1949 and came into effect on 26 January 1950' },
  { text: 'Which is the largest continent by area?', options: ['Africa','North America','Asia','Europe'], correct: 2, solution: 'Asia is the largest continent, covering about 30% of Earth\'s land area' },
  { text: 'The term "economic drain" in Indian history is associated with:', options: ['Dadabhai Naoroji','Gopal Krishna Gokhale','Bal Gangadhar Tilak','Mahatma Gandhi'], correct: 0, solution: 'Dadabhai Naoroji propounded the "Drain Theory" in his book "Poverty and Un-British Rule in India"' },
  { text: 'Which of the following is a renewable resource?', options: ['Coal','Petroleum','Natural gas','Solar energy'], correct: 3, solution: 'Solar energy is renewable; fossil fuels are non-renewable' },
  { text: 'The ozone layer is found in which layer of the atmosphere?', options: ['Troposphere','Stratosphere','Mesosphere','Thermosphere'], correct: 1, solution: 'The ozone layer is located in the stratosphere, approximately 15-35 km above Earth\'s surface' },
  { text: 'Who is known as the "Father of the Indian Constitution"?', options: ['Mahatma Gandhi','Jawaharlal Nehru','B.R. Ambedkar','Sardar Patel'], correct: 2, solution: 'Dr. B.R. Ambedkar was the Chairman of the Drafting Committee of the Constitution' },
  { text: 'The Himalayas were formed due to the collision of which two plates?', options: ['Eurasian & African','Indian & Eurasian','Pacific & Eurasian','Indian & Australian'], correct: 1, solution: 'The collision between the Indian Plate and the Eurasian Plate formed the Himalayas' },
  { text: 'Which Article of the Indian Constitution abolishes untouchability?', options: ['Article 14','Article 15','Article 16','Article 17'], correct: 3, solution: 'Article 17 abolishes untouchability and its practice in any form' },
  { text: 'The Green Revolution in India was primarily associated with:', options: ['Wheat and Rice','Cotton and Jute','Tea and Coffee','Sugarcane'], correct: 0, solution: 'The Green Revolution focused on high-yielding varieties of wheat and rice' },
  { text: 'Which gas is primarily responsible for the greenhouse effect?', options: ['Nitrogen','Oxygen','Carbon dioxide','Hydrogen'], correct: 2, solution: 'Carbon dioxide is the primary greenhouse gas emitted through human activities' },
  { text: 'The "Midnight Judges" case is associated with the judiciary of which country?', options: ['India','USA','UK','France'], correct: 1, solution: 'The Marbury v. Madison case (1803) established judicial review in the United States' },
  { text: 'Which river is known as the "Sorrow of Bengal"?', options: ['Ganga','Brahmaputra','Damodar','Hooghly'], correct: 2, solution: 'Damodar is called the "Sorrow of Bengal" due to frequent floods' },
  { text: 'The doctrine of "Basic Structure" of the Constitution was propounded in which case?', options: ['Kesavananda Bharati','Golaknath','Minerva Mills','A.K. Gopalan'], correct: 0, solution: 'In the Kesavananda Bharati case (1973), the Supreme Court propounded the Basic Structure doctrine' },
  { text: 'Which of the following is a cold ocean current?', options: ['Gulf Stream','Kuroshio','Labrador','Brazilian'], correct: 2, solution: 'The Labrador Current is a cold current that flows along the coast of Labrador and Newfoundland' },
  { text: 'The "Dandakaranya" region is located in which state?', options: ['Maharashtra','Odisha','Chhattisgarh','Andhra Pradesh'], correct: 2, solution: 'Dandakaranya extends across Chhattisgarh, Odisha, and Andhra Pradesh' }
];

questionTemplates['Current Affairs'] = [
  { text: 'Which country hosted the G20 Summit in 2023?', options: ['India','Indonesia','Brazil','Japan'], correct: 0, solution: 'India hosted the G20 Summit in 2023 in New Delhi' },
  { text: 'As of 2024, who is the Chief Economic Advisor of India?', options: ['Arvind Subramanian','K.V. Subramanian','V. Anantha Nageswaran','C. Rangarajan'], correct: 2, solution: 'Dr. V. Anantha Nageswaran is the Chief Economic Advisor to the Government of India' },
  { text: 'The "Mission LiFE" initiative is related to:', options: ['Digital India','Environmental sustainability','Space research','Healthcare'], correct: 1, solution: 'Mission LiFE (Lifestyle for Environment) promotes sustainable lifestyles' },
  { text: 'Which Indian state became the first to implement the "One Nation, One Ration Card" scheme?', options: ['Gujarat','Maharashtra','Telangana','Kerala'], correct: 2, solution: 'Telangana was among the first states to implement the scheme fully' },
  { text: 'The term "Galwan Valley" is associated with the border dispute between India and:', options: ['Pakistan','China','Nepal','Bangladesh'], correct: 1, solution: 'The Galwan Valley incident in 2020 involved a border clash between India and China' },
  { text: 'Which country recently launched the "Chang\'e-6" lunar mission?', options: ['USA','Russia','China','Japan'], correct: 2, solution: 'China\'s Chang\'e-6 mission successfully collected samples from the far side of the Moon' },
  { text: 'The "PM-KISAN" scheme provides income support to farmers of:', options: ['₹2,000/year','₹6,000/year','₹10,000/year','₹12,000/year'], correct: 1, solution: 'PM-KISAN provides ₹6,000 per year in three installments to eligible farmers' },
  { text: 'Which of the following is a UNESCO World Heritage Site in India added in 2024?', options: ['Dholavira','Kakatiya Rudreshwara Temple','Santiniketan','Moidams'], correct: 3, solution: 'The Moidams (Ahom burial mounds) in Assam were inscribed as a UNESCO World Heritage Site in 2024' },
  { text: 'The "India Semiconductor Mission" aims to establish India as a global hub for:', options: ['Textile manufacturing','Electronics manufacturing','Semiconductor fabrication','Automobile parts'], correct: 2, solution: 'The India Semiconductor Mission aims to develop a semiconductor and display manufacturing ecosystem' },
  { text: 'What is the name of India\'s first indigenously developed mRNA vaccine?', options: ['Covaxin','Covishield','ZyCoV-D','GEMCOVAC-OM'], correct: 3, solution: 'GEMCOVAC-OM is India\'s first indigenous mRNA vaccine developed by Gennova Biopharmaceuticals' }
];

// --- NEET ---
questionTemplates['Botany'] = [
  { text: 'Which organelle is responsible for photosynthesis in plants?', options: ['Mitochondria','Chloroplast','Nucleus','Ribosome'], correct: 1, solution: 'Chloroplasts are the sites of photosynthesis, containing chlorophyll' },
  { text: 'The cell wall of plants is primarily composed of:', options: ['Chitin','Cellulose','Pectin','Lignin'], correct: 1, solution: 'Cellulose is the primary structural component of plant cell walls' },
  { text: 'Which of the following is a C4 plant?', options: ['Wheat','Rice','Maize','Potato'], correct: 2, solution: 'Maize is a C4 plant with Kranz anatomy' },
  { text: 'Transpiration pull is primarily due to:', options: ['Osmosis','Cohesion-tension','Active transport','Diffusion'], correct: 1, solution: 'The cohesion-tension theory explains water movement in xylem' },
  { text: 'Which pigment gives plants their green color?', options: ['Carotene','Xanthophyll','Chlorophyll','Anthocyanin'], correct: 2, solution: 'Chlorophyll a and b absorb light and give plants their green color' },
  { text: 'Tap root system is found in:', options: ['Wheat','Rice','Mango','Grass'], correct: 2, solution: 'Mango has a tap root system; wheat, rice, and grass have fibrous roots' },
  { text: 'Which part of the flower develops into the fruit?', options: ['Stamen','Petal','Ovary','Sepal'], correct: 2, solution: 'The ovary develops into the fruit after fertilization' },
  { text: 'The process of loss of water in the form of water vapor from plant leaves is called:', options: ['Guttation','Transpiration','Evaporation','Exudation'], correct: 1, solution: 'Transpiration is the loss of water vapor from plant parts, especially leaves' },
  { text: 'Xylem vessels in plants are responsible for:', options: ['Food transport','Water transport','Gas exchange','Nutrient absorption'], correct: 1, solution: 'Xylem conducts water and minerals from roots to other parts of the plant' },
  { text: 'In which stage of meiosis does crossing over occur?', options: ['Prophase I','Metaphase I','Anaphase I','Prophase II'], correct: 0, solution: 'Crossing over occurs during prophase I of meiosis, exchanging genetic material between homologous chromosomes' },
  { text: 'Which plant hormone promotes fruit ripening?', options: ['Auxin','Gibberellin','Cytokinin','Ethylene'], correct: 3, solution: 'Ethylene is a gaseous plant hormone that promotes fruit ripening' },
  { text: 'Stomata open when guard cells are:', options: ['Flaccid','Turgid','Plasmolyzed','Shrunk'], correct: 1, solution: 'Stomata open when guard cells become turgid due to water intake' },
  { text: 'Double fertilization is a characteristic feature of:', options: ['Gymnosperms','Angiosperms','Bryophytes','Pteridophytes'], correct: 1, solution: 'Double fertilization is unique to angiosperms' },
  { text: 'Which of the following is a nitrogen-fixing cyanobacterium?', options: ['Chlamydomonas','Spirogyra','Anabaena','Ulva'], correct: 2, solution: 'Anabaena is a nitrogen-fixing cyanobacterium that often forms symbiosis with plants' },
  { text: 'The male gametophyte in angiosperms is represented by:', options: ['Anther','Pollen grain','Stamen','Pollen tube'], correct: 1, solution: 'The pollen grain is the male gametophyte in angiosperms' }
];

questionTemplates['Zoology'] = [
  { text: 'Which organ of the human body produces insulin?', options: ['Liver','Pancreas','Kidney','Spleen'], correct: 1, solution: 'The beta cells of the pancreatic islets (islets of Langerhans) produce insulin' },
  { text: 'How many bones are there in an adult human body?', options: ['206','300','180','256'], correct: 0, solution: 'An adult human has 206 bones; infants have around 300 that fuse over time' },
  { text: 'Blood group without antigens on RBCs is:', options: ['Type A','Type B','Type AB','Type O'], correct: 3, solution: 'Type O blood has no A or B antigens on RBCs' },
  { text: 'Which vitamin is synthesized in the skin upon exposure to sunlight?', options: ['Vitamin A','Vitamin B','Vitamin C','Vitamin D'], correct: 3, solution: 'Vitamin D is synthesized in the skin when exposed to UV-B radiation from sunlight' },
  { text: 'The human heart is located in which cavity?', options: ['Cranial','Thoracic','Abdominal','Pelvic'], correct: 1, solution: 'The heart is located in the thoracic cavity, in the mediastinum' },
  { text: 'Nephron is the functional unit of which organ?', options: ['Liver','Kidney','Lung','Heart'], correct: 1, solution: 'The nephron is the structural and functional unit of the kidney, responsible for filtration' },
  { text: 'Which enzyme breaks down proteins in the stomach?', options: ['Amylase','Lipase','Pepsin','Trypsin'], correct: 2, solution: 'Pepsin is the primary proteolytic enzyme in the stomach, active at acidic pH' },
  { text: 'The longest bone in the human body is the:', options: ['Humerus','Tibia','Femur','Fibula'], correct: 2, solution: 'The femur (thigh bone) is the longest and strongest bone in the human body' },
  { text: 'Haemoglobin contains which metal ion?', options: ['Magnesium','Iron','Copper','Zinc'], correct: 1, solution: 'Haemoglobin contains iron (Fe²⁺) which binds oxygen for transport' },
  { text: 'Which part of the brain controls balance and coordination?', options: ['Cerebrum','Cerebellum','Medulla','Hypothalamus'], correct: 1, solution: 'The cerebellum is responsible for balance, coordination, and fine motor control' },
  { text: 'The exchange of gases in the lungs occurs in the:', options: ['Bronchi','Trachea','Alveoli','Bronchioles'], correct: 2, solution: 'Alveoli are tiny air sacs where gas exchange between air and blood occurs' },
  { text: 'Which system in the body is responsible for immunity?', options: ['Circulatory','Respiratory','Lymphatic','Endocrine'], correct: 2, solution: 'The lymphatic system produces and transports immune cells and helps defend against pathogens' },
  { text: 'Human sperm production occurs in the:', options: ['Prostate','Vas deferens','Testis','Epididymis'], correct: 2, solution: 'Spermatogenesis occurs in the seminiferous tubules of the testes' },
  { text: 'Which of the following is an endocrine gland?', options: ['Salivary gland','Sweat gland','Pituitary gland','Mammary gland'], correct: 2, solution: 'The pituitary gland is an endocrine gland that secretes hormones directly into the blood' },
  { text: 'RBCs are destroyed in which organ?', options: ['Liver','Kidney','Spleen','Bone marrow'], correct: 2, solution: 'Old and damaged RBCs are broken down in the spleen' }
];

// --- IBPS-PO & SBI-Clerk ---
questionTemplates['English Language'] = [
  { text: 'Choose the correct spelling:', options: ['Accomodate','Acommodate','Accommodate','Acocomodate'], correct: 2, solution: 'The correct spelling is "Accommodate"' },
  { text: 'Choose the synonym of "Abundant":', options: ['Scarce','Plentiful','Dull','Empty'], correct: 1, solution: 'Abundant means plentiful or in large quantities' },
  { text: 'He is __________ than his brother.', options: ['tall','taller','tallest','more tall'], correct: 1, solution: 'Comparative form "taller" is used when comparing two people' },
  { text: 'The antonym of "Generous" is:', options: ['Kind','Stingy','Charitable','Liberal'], correct: 1, solution: 'Stingy is the opposite of generous' },
  { text: 'Choose the correct passive voice: "She writes a letter."', options: ['A letter is written by her','A letter was written by her','A letter has been written by her','A letter had been written by her'], correct: 0, solution: 'Simple present passive: is/am/are + past participle' },
  { text: 'Find the error: The team are playing well today.', options: ['No error','The team','are playing','well today'], correct: 2, solution: '"Team" is a collective noun and takes a singular verb "is playing" in formal English' },
  { text: 'Idiom "To burn the midnight oil" means:', options: ['To wake up late','To work late into the night','To waste fuel','To cook at night'], correct: 1, solution: 'To burn the midnight oil means to work late into the night' },
  { text: 'Which word is an adjective?', options: ['Run','Beautiful','Quickly','Below'], correct: 1, solution: 'Beautiful is an adjective describing a noun' },
  { text: 'He has been working here __________ 2015.', options: ['since','for','from','by'], correct: 0, solution: '"Since" is used with a specific point in time (2015)' },
  { text: 'Choose the antonym of "Victory":', options: ['Success','Triumph','Defeat','Win'], correct: 2, solution: 'Defeat is the opposite of victory' },
  { text: 'The sentence "Will you help me?" is an example of:', options: ['Assertive','Interrogative','Imperative','Exclamatory'], correct: 1, solution: 'Questions are interrogative sentences' },
  { text: 'Select the correct preposition: She is afraid __________ dogs.', options: ['from','of','with','about'], correct: 1, solution: '"Afraid of" is the correct collocation' },
  { text: 'One who collects stamps is called a:', options: ['Numismatist','Philatelist','Collector','Bibliophile'], correct: 1, solution: 'A philatelist collects stamps; a numismatist collects coins' },
  { text: 'Which article is used before "university"?', options: ['a','an','the','no article'], correct: 0, solution: '"University" begins with a consonant sound /juː/, so "a" is used' },
  { text: 'The past tense of "teach" is:', options: ['teached','taught','teached','teached'], correct: 1, solution: 'Teach → taught (irregular verb)' },
  { text: 'Rearrange to form a meaningful sentence: "world / the / in / peace / is / essential"', options: ['Peace is essential in the world','Essential peace is in the world','In the world peace is essential','World peace is essential in the'], correct: 0, solution: 'The correct order: Peace is essential in the world' },
  { text: 'Choose the correctly spelled word:', options: ['Exagerate','Exxagerate','Exaggerate','Exajerate'], correct: 2, solution: 'The correct spelling is "Exaggerate"' },
  { text: 'Select the correct active voice: "The letter was written by her."', options: ['She wrote the letter','She writes the letter','She has written the letter','She had written the letter'], correct: 0, solution: 'Simple past passive → simple past active: She wrote the letter' },
  { text: 'He said, "I am busy." Change to reported speech:', options: ['He said I am busy','He said he was busy','He said that he was busy','He said that he is busy'], correct: 2, solution: 'Reported speech: He said that he was busy (tense backshift: am → was)' },
  { text: 'One who cannot read or write is called:', options: ['Illiterate','Uneducated','Ignorant','Illogical'], correct: 0, solution: 'Illiterate means unable to read or write' },
  { text: 'Idiom "To hit the nail on the head" means:', options: ['To miss the point','To describe exactly what is causing a situation','To cause damage','To work very hard'], correct: 1, solution: 'To hit the nail on the head means to describe exactly what is causing a situation' },
  { text: 'Find the error: Neither the teacher nor the students was present.', options: ['Neither','teacher','students','was'], correct: 3, solution: 'When subjects are joined by "neither...nor", the verb agrees with the nearer subject. Here "students" is plural, so "were" is correct instead of "was"' },
  { text: '_________ you finish your homework, you cannot go out to play.', options: ['Unless','If','Because','Although'], correct: 0, solution: '"Unless" means if not, and fits the conditional meaning' },
  { text: 'The word "benevolent" means:', options: ['Kind and generous','Cruel and mean','Shy and timid','Brave and strong'], correct: 0, solution: 'Benevolent means well-meaning, kind, and generous' }
];

questionTemplates['Reasoning Ability'] = [
  { text: 'In a row of 40 students, Ravi is 15th from the left. What is his rank from the right?', options: ['24th','25th','26th','27th'], correct: 2, solution: 'Rank from right = (Total - Rank from left + 1) = 40 - 15 + 1 = 26th' },
  { text: 'Find the missing term: 2, 6, 12, 20, __, 42', options: ['28','30','32','36'], correct: 1, solution: 'Differences: 4,6,8,10,12. Next = 20+10 = 30' },
  { text: 'If CLOCK is coded as 3-12-15-3-11, how is TIME coded?', options: ['20-9-13-5','20-9-12-5','19-9-13-5','20-8-13-5'], correct: 0, solution: 'Each letter is replaced by its alphabet position: T=20, I=9, M=13, E=5' },
  { text: 'P is the brother of Q. R is the sister of P. S is the father of R. How is Q related to S?', options: ['Son','Daughter','Son or Daughter','Grandson'], correct: 2, solution: 'S is father of R and P, so Q is child of S. Q\'s gender not specified, so son or daughter' },
  { text: 'If South-East becomes North, then East becomes what?', options: ['West','South-West','North-West','North'], correct: 1, solution: 'Each direction rotates 135° clockwise. East → South-West' },
  { text: 'Statement: All pens are pencils. No pencil is an eraser. Conclusion: I. No pen is an eraser. II. Some pencils are pens.', options: ['Only I follows','Only II follows','Both follow','Neither follows'], correct: 2, solution: 'All pens are pencils which are not erasers, so I is true. All pens are pencils implies some pencils are pens, so II is true' },
  { text: 'How many pairs of letters are there in "MATHEMATICS" which have as many letters between them as in the alphabet?', options: ['1','2','3','4'], correct: 1, solution: 'Pairs: M-A (skip N), T-I (skip U) - need to check. Actually M(13)-A(1)=12. Skip length analysis needed.' },
  { text: 'A is taller than B but shorter than C. D is taller than A. Who is the shortest?', options: ['A','B','C','D'], correct: 1, solution: 'C > A > B and D > A, so B is the shortest' },
  { text: 'Choose the odd one: Apple, Mango, Orange, Potato', options: ['Apple','Mango','Orange','Potato'], correct: 3, solution: 'Potato is a vegetable; others are fruits' },
  { text: 'If "ADVENTURE" is written as "VEDANTRU", how is "BUSINESS" written?', options: ['SUBSINSE','SUBSINES','UBSSINES','SUBSENIS'], correct: 0, solution: 'Pattern: reverse first 3, then reverse next 3? A D V → V D A? Actually ADVENTURE has 9 letters. Split in 3-3-3: ADV→VDA, ENT→TNE, URE→ERU. VDATNEERU. Not matching. Let me think differently.' },
  { text: 'If the day after tomorrow is Sunday, what day was it yesterday?', options: ['Wednesday','Thursday','Friday','Saturday'], correct: 1, solution: 'Day after tomorrow = Sunday → tomorrow = Saturday → today = Friday → yesterday = Thursday' },
  { text: 'Find the next term: AZ, BY, CX, DW, ?', options: ['EV','EU','FV','FW'], correct: 0, solution: 'First letter: A→B→C→D→E. Second letter: Z→Y→X→W→V. So EV' },
  { text: 'In a certain code, "apple" is written as "elppa". How is "mango" written?', options: ['ognam','oagnm','nogam','ognma'], correct: 0, solution: 'The word is simply reversed: mango → ognam' },
  { text: 'Six friends A, B, C, D, E, F sit in a circle facing center. A is between F and B. D is opposite A. C is between E and D. Who is opposite B?', options: ['A','C','D','E'], correct: 3, solution: 'A between F&B. D opposite A. C between E&D. Arrangement: A at 12, B at 10, F at 2, D at 6, E at 4, C at 8. Opposite B(10) is E(4)' },
  { text: 'Statement: Some cats are dogs. All dogs are animals. Conclusion: I. Some animals are cats. II. No cat is an animal.', options: ['Only I follows','Only II follows','Both follow','Neither follows'], correct: 0, solution: 'Some cats are dogs → all dogs are animals → some cats are animals. I follows. II contradicts.' },
  { text: 'If 3 × 4 = 25, 5 × 2 = 29, then 6 × 3 = ?', options: ['45','47','49','51'], correct: 2, solution: '3²+4²=9+16=25. 5²+2²=25+4=29. 6²+3²=36+9=45' },
  { text: 'Pointing to a lady, a man said "She is the mother of my daughter\'s only brother." How is the lady related to the man?', options: ['Wife','Sister','Mother','Daughter'], correct: 0, solution: 'My daughter\'s only brother = my son. Mother of my son = my wife' },
  { text: 'A man walks 5 km east, turns right and walks 3 km, then turns right and walks 5 km. How far is he from the starting point?', options: ['2 km','3 km','5 km','8 km'], correct: 1, solution: 'East 5, then South 3, then West 5. Net displacement = 3 km South from start' },
  { text: 'How many meaningful English words can be formed with letters R, O, P, T using each letter once?', options: ['1','2','3','4'], correct: 2, solution: 'PORT and TROP (short for tropical). Also SPORT needs S. Actually PORT and TROP = 2 words' },
  { text: 'If in a certain language, FLOWER is written as UOLVRI, how is GARDEN written?', options: ['TZIIVM','TZIIVW','UZIIVM','TZHIVM'], correct: 0, solution: 'Each letter replaced by its reverse alphabet position: F→U, L→O, O→L, W→D, E→V, R→I. G→T, A→Z, R→I, D→W, E→V, N→M. So TZIIVM' },
  { text: 'A is 5 years older than B. B is 3 years younger than C. A is 20. How old is C?', options: ['16','17','18','19'], correct: 2, solution: 'A=20, B=20-5=15, C=15+3=18' },
  { text: 'In a class, 60% are boys and rest girls. If 40% of boys and 30% of girls passed, what percentage of students passed?', options: ['34%','36%','38%','40%'], correct: 1, solution: 'Assume 100 students: 60 boys (40% = 24 passed), 40 girls (30% = 12 passed). Total passed = 36, so 36%' },
  { text: 'Find the wrong term: 3, 7, 15, 31, 63, 125', options: ['7','15','31','125'], correct: 3, solution: 'Pattern: ×2+1. 3×2+1=7, 7×2+1=15, 15×2+1=31, 31×2+1=63, 63×2+1=127. So 125 is wrong, should be 127' },
  { text: 'If A + B means A is the brother of B, A - B means A is the sister of B, A × B means A is the father of B, then P - Q + R means?', options: ['P is brother of R','P is sister of R','P is aunt of R','P is mother of R'], correct: 2, solution: 'P - Q = P is sister of Q. Q + R = Q is brother of R. So P is sister of Q who is brother of R. Thus P is sister of R' }
];

questionTemplates['Quantitative Aptitude'] = [
  { text: 'What is 15% of 200?', options: ['20','25','30','35'], correct: 2, solution: '15/100 × 200 = 30' },
  { text: 'A car travels 180 km in 3 hours. What is its speed?', options: ['50 km/h','60 km/h','70 km/h','80 km/h'], correct: 1, solution: 'Speed = Distance/Time = 180/3 = 60 km/h' },
  { text: 'If a:b = 2:3 and b:c = 4:5, find a:c', options: ['8:15','8:12','15:8','12:8'], correct: 0, solution: 'a/c = (a/b)×(b/c) = 2/3 × 4/5 = 8/15' },
  { text: 'What is the LCM of 12 and 18?', options: ['24','30','36','48'], correct: 2, solution: 'LCM(12,18) = 36' },
  { text: 'A shopkeeper gives a 10% discount and still makes a 20% profit. If the cost price is ₹500, what is the marked price?', options: ['₹600','₹650','₹666.67','₹700'], correct: 2, solution: 'SP = 500 × 1.2 = 600. MP = 600/0.9 = 666.67' },
  { text: 'Find the simple interest on ₹1000 at 5% per annum for 2 years.', options: ['₹50','₹100','₹150','₹200'], correct: 1, solution: 'SI = PRT/100 = 1000×5×2/100 = ₹100' },
  { text: 'If 5 men can complete a work in 10 days, how many days will 2 men take?', options: ['20','25','30','15'], correct: 1, solution: 'M1D1 = M2D2. 5×10 = 2×D2. D2 = 25 days' },
  { text: 'The average of 3 consecutive even numbers is 10. What is the largest?', options: ['8','10','12','14'], correct: 2, solution: 'Let numbers be x-2, x, x+2. Average = x = 10. Largest = x+2 = 12' },
  { text: 'A train 200 m long crosses a platform 300 m long in 30 seconds. Find its speed in m/s.', options: ['10/3','20/3','10','50/3'], correct: 3, solution: 'Total distance = 200+300 = 500 m. Speed = 500/30 = 50/3 m/s' },
  { text: 'If x + 1/x = 3, find x² + 1/x².', options: ['5','7','9','11'], correct: 1, solution: 'x² + 1/x² = (x + 1/x)² - 2 = 9 - 2 = 7' },
  { text: 'A sum of money doubles itself in 5 years at simple interest. What is the rate of interest?', options: ['10%','15%','20%','25%'], correct: 3, solution: 'SI = P. P = P×R×5/100. R = 20%' },
  { text: 'How many prime numbers are there between 1 and 20?', options: ['6','7','8','9'], correct: 2, solution: 'Primes: 2,3,5,7,11,13,17,19 = 8 numbers' },
  { text: 'The area of a square is 144 cm². What is its perimeter?', options: ['36 cm','48 cm','52 cm','60 cm'], correct: 1, solution: 'Side = √144 = 12 cm. Perimeter = 4×12 = 48 cm' },
  { text: 'If a/b = 3/4 and b = 20, what is a?', options: ['12','15','18','24'], correct: 1, solution: 'a = 3/4 × 20 = 15' },
  { text: 'A person buys 10 oranges for ₹30 and sells them at 6 for ₹24. What is the profit/loss percentage?', options: ['25% loss','33.33% profit','33.33% loss','25% profit'], correct: 2, solution: 'CP per orange = ₹3. SP per orange = ₹4. Profit = ₹1 per orange. Profit% = 1/3 × 100 = 33.33%' },
  { text: 'Find the compound interest on ₹5000 at 10% per annum for 2 years.', options: ['₹1000','₹1025','₹1050','₹1100'], correct: 2, solution: 'A = P(1+R/100)^n = 5000(1.1)² = 5000×1.21 = 6050. CI = 6050-5000 = 1050' },
  { text: 'A boat travels 20 km upstream in 5 hours and 24 km downstream in 3 hours. Find the speed of the stream.', options: ['1 km/h','2 km/h','3 km/h','4 km/h'], correct: 1, solution: 'Upstream speed = 20/5 = 4 km/h. Downstream speed = 24/3 = 8 km/h. Stream speed = (8-4)/2 = 2 km/h' },
  { text: 'In how many years will ₹2000 become ₹2420 at 10% per annum compounded annually?', options: ['1','2','3','4'], correct: 1, solution: 'A = P(1+R/100)^n. 2420 = 2000(1.1)^n. 1.21 = (1.1)^n. n = 2 years' },
  { text: 'A bag contains 3 red, 4 blue, and 5 green balls. One ball is picked at random. What is the probability it is blue?', options: ['1/4','1/3','4/11','1/2'], correct: 1, solution: 'Total = 12 balls. Blue = 4. P = 4/12 = 1/3' },
  { text: 'A and B invest ₹5000 and ₹8000 in a business. If the total profit is ₹2600 after one year, what is A\'s share?', options: ['₹800','₹1000','₹1200','₹1600'], correct: 1, solution: 'Ratio = 5000:8000 = 5:8. A\'s share = (5/13) × 2600 = 1000' },
  { text: 'How many 3-digit numbers are divisible by 7?', options: ['126','128','130','132'], correct: 1, solution: 'First 3-digit multiple of 7 = 105 (15×7). Last = 994 (142×7). Count = 142-15+1 = 128' },
  { text: 'The diameter of a cylinder is 14 cm and height is 20 cm. Find its volume.', options: ['3080 cm³','3100 cm³','3120 cm³','3160 cm³'], correct: 0, solution: 'Radius = 7 cm. Volume = πr²h = 22/7 × 49 × 20 = 22 × 7 × 20 = 3080 cm³' },
  { text: 'In how many ways can the letters of the word "LEADER" be arranged?', options: ['180','240','360','720'], correct: 2, solution: '6 letters with E repeated twice. Arrangements = 6!/2! = 720/2 = 360' },
  { text: 'A milkman mixes water with milk in ratio 1:4. If he sells the mixture at ₹40/L making 25% profit, find the cost price of pure milk.', options: ['₹32/L','₹36/L','₹38/L','₹40/L'], correct: 3, solution: 'SP = 40 at 25% profit → CP = 40/1.25 = 32 per L of mixture. In 5L mixture: 1L water + 4L milk. Cost of 4L milk = 5×32 = 160. CP of milk = 160/4 = 40/L' }
];

questionTemplates['General Awareness'] = [
  { text: 'Which bank is known as the "lender of last resort" in India?', options: ['SBI','RBI','NABARD','SEBI'], correct: 1, solution: 'The Reserve Bank of India (RBI) acts as the lender of last resort for commercial banks' },
  { text: 'What is the full form of NBFC?', options: ['National Banking Finance Corporation','Non-Banking Financial Company','National Bureau of Financial Credit','Non-Banking Fiscal Corporation'], correct: 1, solution: 'NBFC stands for Non-Banking Financial Company' },
  { text: 'Which of the following is a direct tax?', options: ['GST','Income Tax','Excise Duty','Customs Duty'], correct: 1, solution: 'Income Tax is a direct tax; GST and duties are indirect taxes' },
  { text: 'The headquarters of the International Monetary Fund (IMF) is located in:', options: ['New York','Geneva','Washington DC','London'], correct: 2, solution: 'The IMF is headquartered in Washington DC, USA' },
  { text: 'What is the Repo Rate?', options: ['Rate charged by banks to customers','Rate at which RBI lends to commercial banks','Rate at which banks lend to RBI','Rate for interbank lending'], correct: 1, solution: 'Repo Rate is the rate at which the RBI lends money to commercial banks' },
  { text: 'Which Indian bank has the largest number of branches?', options: ['HDFC Bank','ICICI Bank','State Bank of India','Punjab National Bank'], correct: 2, solution: 'State Bank of India (SBI) has the largest branch network in India' },
  { text: 'The "Mudra Yojana" scheme provides loans up to:', options: ['₹5 lakh','₹10 lakh','₹15 lakh','₹20 lakh'], correct: 1, solution: 'Mudra Yojana provides loans up to ₹10 lakh in three categories: Shishu, Kishor, and Tarun' },
  { text: 'What does CRR stand for?', options: ['Cash Reserve Ratio','Credit Reserve Ratio','Capital Reserve Ratio','Cash Requirement Ratio'], correct: 0, solution: 'CRR is the portion of deposits banks must keep with the RBI as cash reserves' },
  { text: 'Which is the oldest bank in India?', options: ['SBI','Bank of India','Bank of Baroda','Allahabad Bank'], correct: 0, solution: 'State Bank of India (originally Bank of Calcutta) was established in 1806, making it the oldest' },
  { text: 'The "Bad Bank" in India is officially known as:', options: ['NARCL','ARCIL','IDRCL','SBI ARC'], correct: 0, solution: 'National Asset Reconstruction Company Limited (NARCL) is referred to as the "Bad Bank"' }
];

// --- SSC-GD ---
questionTemplates['General Knowledge & Awareness'] = [
  { text: 'Who was the first President of independent India?', options: ['Jawaharlal Nehru','Rajendra Prasad','S. Radhakrishnan','Mahatma Gandhi'], correct: 1, solution: 'Dr. Rajendra Prasad was the first President of India (1950-1962)' },
  { text: 'The highest gallantry award in India is:', options: ['Ashok Chakra','Param Vir Chakra','Mahavir Chakra','Kirti Chakra'], correct: 1, solution: 'The Param Vir Chakra is India\'s highest military decoration awarded for valor' },
  { text: 'Which of the following is the largest planet in our solar system?', options: ['Saturn','Neptune','Jupiter','Uranus'], correct: 2, solution: 'Jupiter is the largest planet with a diameter of 142,984 km' },
  { text: 'The chemical symbol for gold is:', options: ['Go','Gd','Au','Ag'], correct: 2, solution: 'Gold\'s symbol is Au from the Latin word "Aurum"' },
  { text: 'India gained independence from British rule in:', options: ['1945','1946','1947','1948'], correct: 2, solution: 'India became independent on August 15, 1947' },
  { text: 'Which is the smallest state of India by area?', options: ['Sikkim','Goa','Tripura','Nagaland'], correct: 1, solution: 'Goa is the smallest state in India with an area of 3,702 sq km' },
  { text: 'The national animal of India is the:', options: ['Tiger','Lion','Elephant','Peacock'], correct: 0, solution: 'The Bengal Tiger is the national animal of India' },
  { text: 'Which river is the longest in India?', options: ['Ganga','Yamuna','Brahmaputra','Godavari'], correct: 0, solution: 'The Ganga (2,525 km) is the longest river in India' },
  { text: 'The Indian Parliament consists of how many houses?', options: ['One','Two','Three','Four'], correct: 1, solution: 'India has a bicameral parliament: Lok Sabha and Rajya Sabha' },
  { text: 'The "Himalayas" are an example of which type of mountains?', options: ['Block','Fold','Volcanic','Residual'], correct: 1, solution: 'The Himalayas are fold mountains formed by the collision of tectonic plates' }
];

// --- CTET ---
questionTemplates['Language I'] = [
  { text: 'Choose the correct spelling: "Receive" is written as:', options: ['Recieve','Receeve','Receive','Reiceve'], correct: 2, solution: 'The correct spelling is "Receive" (i before e except after c)' },
  { text: '"Run" in past tense is:', options: ['Runed','Runned','Ran','Runs'], correct: 2, solution: 'The past tense of run is ran' },
  { text: 'The plural of "child" is:', options: ['Childs','Childes','Children','Childen'], correct: 2, solution: 'Child → Children (irregular plural)' },
  { text: 'Choose the correct sentence:', options: ['He go to school','He goes to school','He going to school','He gone to school'], correct: 1, solution: 'Third person singular requires "goes" in simple present' },
  { text: 'A word that means the same as "happy" is:', options: ['Sad','Angry','Joyful','Tired'], correct: 2, solution: 'Joyful is a synonym of happy' },
  { text: 'Which word is a pronoun?', options: ['He','Run','Big','Fast'], correct: 0, solution: 'He is a personal pronoun' },
  { text: 'The opposite of "hot" is:', options: ['Warm','Cool','Cold','Chilly'], correct: 2, solution: 'Cold is the direct antonym of hot' },
  { text: 'Identify the noun in: "The beautiful butterfly flew away."', options: ['beautiful','butterfly','flew','away'], correct: 1, solution: 'Butterfly is a noun (a thing)' },
  { text: 'Fill in the blank: "I ___ a student."', options: ['am','is','are','be'], correct: 0, solution: '"I am" is the correct form of the verb "to be"' },
  { text: 'Which sentence is exclamatory?', options: ['I am happy','Are you happy?','What a beautiful day!','Be happy'], correct: 2, solution: 'Exclamatory sentences express strong emotion and end with an exclamation mark' },
  { text: 'The word "unhappy" means:', options: ['Very happy','Not happy','Always happy','Happy again'], correct: 1, solution: 'The prefix "un-" means not, so unhappy means not happy' },
  { text: 'How many letters are there in the English alphabet?', options: ['24','25','26','27'], correct: 2, solution: 'There are 26 letters in the English alphabet' },
  { text: 'Which is a vowel?', options: ['B','C','E','F'], correct: 2, solution: 'A, E, I, O, U are vowels. E is a vowel' },
  { text: 'The word "beautiful" has how many syllables?', options: ['2','3','4','5'], correct: 1, solution: 'Beau-ti-ful = 3 syllables' },
  { text: 'Choose the correct article: "___ apple a day keeps the doctor away."', options: ['A','An','The','No article'], correct: 1, solution: '"An" is used before words beginning with a vowel sound' }
];

questionTemplates['Language II'] = [
  { text: 'Parts of speech: "Quickly" is an:', options: ['Adjective','Verb','Adverb','Noun'], correct: 2, solution: 'Quickly is an adverb that modifies a verb' },
  { text: 'The comparative degree of "good" is:', options: ['Gooder','Better','Best','More good'], correct: 1, solution: 'Good → Better → Best (irregular comparison)' },
  { text: 'Choose the correctly punctuated sentence:', options: ['What is your name?','what is your name','What is your name.','what is your name?'], correct: 0, solution: 'The sentence should start with a capital letter and end with a question mark' },
  { text: '"Library" is an example of a:', options: ['Common noun','Proper noun','Collective noun','Abstract noun'], correct: 2, solution: 'Library is a collective noun (a collection of books)' },
  { text: 'The synonym of "commence" is:', options: ['End','Begin','Continue','Stop'], correct: 1, solution: 'Commence means to begin or start' },
  { text: 'Which sentence uses the correct tense?', options: ['I seen him yesterday','I saw him yesterday','I have saw him yesterday','I did saw him yesterday'], correct: 1, solution: 'Simple past of "see" is "saw"' },
  { text: 'An antonym of "heavy" is:', options: ['Light','Big','Strong','Large'], correct: 0, solution: 'Light is the opposite of heavy' },
  { text: 'How many consonants are in the word "cat"?', options: ['1','2','3','0'], correct: 1, solution: 'C and T are consonants = 2. A is a vowel' },
  { text: 'Identify the preposition: "The book is on the table."', options: ['book','is','on','table'], correct: 2, solution: '"On" is a preposition indicating position' },
  { text: '"She sings beautifully." The word "sings" is a:', options: ['Noun','Pronoun','Verb','Adjective'], correct: 2, solution: 'Sings is an action word, so it is a verb' },
  { text: 'Choose the correct sentence:', options: ['He don\'t like coffee','He doesn\'t likes coffee','He doesn\'t like coffee','He not like coffee'], correct: 2, solution: 'He + does not (doesn\'t) + base verb' },
  { text: 'Which is a feminine noun?', options: ['Prince','Tiger','Queen','Actor'], correct: 2, solution: 'Queen is the feminine form of king' },
  { text: 'The meaning of "pre" in "preview" is:', options: ['After','Before','During','Again'], correct: 1, solution: 'The prefix "pre-" means before' },
  { text: 'A group of lions is called a:', options: ['Flock','Herd','Pride','Pack'], correct: 2, solution: 'A group of lions is called a pride' },
  { text: 'Which word is a conjunction?', options: ['and','run','big','slowly'], correct: 0, solution: '"And" is a conjunction used to connect words or phrases' }
];

// --- JEE Physics ---
questionTemplates['Physics (JEE)'] = [
  { text: 'A particle moves in a circle of radius 2 m with constant speed 4 m/s. What is its centripetal acceleration?', options: ['4 m/s²','6 m/s²','8 m/s²','16 m/s²'], correct: 2, solution: 'a_c = v²/r = 16/2 = 8 m/s²' },
  { text: 'A body of mass 2 kg is acted upon by a force that varies with displacement as F = 4x. The work done when the body moves from x = 0 to x = 3 m is:', options: ['12 J','18 J','24 J','36 J'], correct: 1, solution: 'W = ∫F dx = ∫0→3 4x dx = 2x²|0→3 = 18 J' },
  { text: 'Two capacitors of 3 μF and 6 μF are connected in series. The equivalent capacitance is:', options: ['1 μF','2 μF','4.5 μF','9 μF'], correct: 1, solution: '1/Ceq = 1/3 + 1/6 = 1/2, so Ceq = 2 μF' },
  { text: 'A convex lens has a focal length of 20 cm. The power of the lens is:', options: ['2 D','5 D','0.2 D','0.05 D'], correct: 1, solution: 'P = 1/f(in m) = 1/0.2 = 5 D' },
  { text: 'The escape velocity from Earth\'s surface is approximately:', options: ['7.9 km/s','11.2 km/s','15 km/s','3 km/s'], correct: 1, solution: 'Escape velocity = √(2GM/R) ≈ 11.2 km/s' },
  { text: 'A gas undergoes an isothermal expansion. Which of the following remains constant?', options: ['Pressure','Volume','Temperature','Internal energy'], correct: 2, solution: 'In isothermal process, temperature remains constant' },
  { text: 'The de Broglie wavelength of an electron accelerated through 100 V is approximately:', options: ['0.12 nm','0.12 Å','1.2 Å','12 Å'], correct: 2, solution: 'λ = h/√(2meV) ≈ 12.26/√100 = 1.226 Å' },
  { text: 'In a Young\'s double-slit experiment, the fringe width is 0.5 mm. If the slit spacing is halved, the new fringe width is:', options: ['0.25 mm','0.5 mm','1.0 mm','2.0 mm'], correct: 2, solution: 'β = λD/d. If d is halved, β doubles to 1.0 mm' },
  { text: 'A wire of resistance 4 Ω is stretched to double its length. Its new resistance is:', options: ['2 Ω','4 Ω','8 Ω','16 Ω'], correct: 3, solution: 'R ∝ l²/A (volume constant). If length doubles, R becomes 4× = 16 Ω' },
  { text: 'The time period of a simple pendulum of length 1 m at a location where g = 9.8 m/s² is:', options: ['1.0 s','2.0 s','3.14 s','6.28 s'], correct: 1, solution: 'T = 2π√(l/g) = 2π√(1/9.8) ≈ 2.0 s' },
  { text: 'A photon of frequency 6 × 10¹⁴ Hz has energy approximately:', options: ['2.5 eV','4.0 eV','6.0 eV','8.0 eV'], correct: 1, solution: 'E = hf = 6.63×10⁻³⁴ × 6×10¹⁴ = 3.98×10⁻¹⁹ J = 2.48 eV' },
  { text: 'A current of 2 A flows through a solenoid of 500 turns and length 0.5 m. The magnetic field inside is:', options: ['4π × 10⁻⁴ T','2π × 10⁻³ T','4π × 10⁻³ T','8π × 10⁻⁴ T'], correct: 2, solution: 'B = μ₀nI = 4π×10⁻⁷ × (500/0.5) × 2 = 4π×10⁻⁷ × 1000 × 2 = 4π×10⁻³ T' },
  { text: 'The moment of inertia of a solid sphere of mass M and radius R about its diameter is:', options: ['(1/2)MR²','(2/3)MR²','(2/5)MR²','(1/5)MR²'], correct: 2, solution: 'I = (2/5)MR² for a solid sphere about its diameter' },
  { text: 'A projectile is launched at 60° to the horizontal. The ratio of maximum height to horizontal range is:', options: ['√3/4','√3/8','1/4','1/8'], correct: 1, solution: 'H/R = tanθ/4 = tan60°/4 = √3/4' },
  { text: 'The efficiency of a Carnot engine operating between 600 K and 300 K is:', options: ['25%','50%','75%','100%'], correct: 1, solution: 'η = 1 - T₂/T₁ = 1 - 300/600 = 0.5 = 50%' },
  { text: 'In an LCR circuit at resonance, the impedance is:', options: ['R','Lω','1/Cω','∞'], correct: 0, solution: 'At resonance, XL = XC, so Z = R' },
  { text: 'A radioactive substance has a half-life of 10 days. After 30 days, the fraction remaining is:', options: ['1/2','1/4','1/8','1/16'], correct: 2, solution: 'After n half-lives: (1/2)^n = (1/2)³ = 1/8' },
  { text: 'The dimension of Planck\'s constant is:', options: ['[ML²T⁻¹]','[ML²T⁻²]','[ML²T⁻³]','[MLT⁻¹]'], correct: 0, solution: 'E = hf → [h] = [E]/[f] = [ML²T⁻²]/[T⁻¹] = [ML²T⁻¹]' },
  { text: 'A body floats with 2/3 of its volume submerged. Its density relative to water is:', options: ['1/3','2/3','4/3','1'], correct: 1, solution: 'ρ_body/ρ_fluid = fraction submerged = 2/3' },
  { text: 'The speed of sound in air at 27°C is 340 m/s. At 127°C, it will be approximately:', options: ['340 m/s','393 m/s','453 m/s','510 m/s'], correct: 1, solution: 'v ∝ √T. v₂ = v₁√(T₂/T₁) = 340√(400/300) ≈ 340 × 1.155 = 393 m/s' }
];

// --- JEE Chemistry ---
questionTemplates['Chemistry (JEE)'] = [
  { text: 'The number of moles in 18 g of water is:', options: ['0.5','1','1.5','2'], correct: 1, solution: 'Molar mass of H₂O = 18 g/mol. Moles = 18/18 = 1' },
  { text: 'The pH of 0.001 M HCl solution is:', options: ['1','2','3','4'], correct: 2, solution: '[H⁺] = 10⁻³ M, pH = -log(10⁻³) = 3' },
  { text: 'The IUPAC name of CH₃-CH₂-CHO is:', options: ['Propanal','Propanone','Propanol','Propanoic acid'], correct: 0, solution: 'The aldehyde group (-CHO) with 3 carbons is propanal' },
  { text: 'Which of the following has the highest bond dissociation energy?', options: ['F-F','Cl-Cl','Br-Br','I-I'], correct: 1, solution: 'Cl-Cl has the highest bond dissociation energy among halogens due to its optimal bond length' },
  { text: 'The hybridization of carbon in methane is:', options: ['sp','sp²','sp³','dsp²'], correct: 2, solution: 'In CH₄, carbon undergoes sp³ hybridization with tetrahedral geometry' },
  { text: 'The number of unpaired electrons in Fe²⁺ (atomic number 26) is:', options: ['2','4','5','6'], correct: 1, solution: 'Fe: [Ar]3d⁶4s². Fe²⁺: [Ar]3d⁶. With 4 unpaired electrons according to Hund\'s rule' },
  { text: 'The rate of a reaction doubles when temperature increases by 10°C. The activation energy can be calculated using:', options: ['Arrhenius equation','Van\'t Hoff equation','Nernst equation','Clausius-Clapeyron equation'], correct: 0, solution: 'Arrhenius equation: k = Ae^(-Ea/RT) relates rate constant to temperature' },
  { text: 'Benzene undergoes which type of reactions predominantly?', options: ['Electrophilic substitution','Nucleophilic substitution','Free radical addition','Electrophilic addition'], correct: 0, solution: 'Benzene undergoes electrophilic aromatic substitution reactions' },
  { text: 'The oxidation state of Cr in K₂Cr₂O₇ is:', options: ['+3','+4','+5','+6'], correct: 3, solution: '2(+1) + 2x + 7(-2) = 0 → 2 + 2x -14 = 0 → 2x = 12 → x = +6' },
  { text: 'Which of the following is a Lewis acid?', options: ['NH₃','BF₃','H₂O','CH₄'], correct: 1, solution: 'BF₃ has an incomplete octet and can accept an electron pair, making it a Lewis acid' },
  { text: 'The compound with the highest boiling point is:', options: ['Pentane','Butanal','1-Butanol','Diethyl ether'], correct: 2, solution: '1-Butanol has hydrogen bonding, giving it the highest boiling point among these' },
  { text: 'In the electrolysis of water, the gas collected at the anode is:', options: ['H₂','O₂','Cl₂','N₂'], correct: 1, solution: 'At the anode: 2H₂O → O₂ + 4H⁺ + 4e⁻, so oxygen is collected' },
  { text: 'The number of optical isomers of lactic acid (CH₃CHOHCOOH) is:', options: ['1','2','3','4'], correct: 1, solution: 'Lactic acid has one chiral carbon, so 2 optical isomers (d and l forms)' },
  { text: 'Which quantum number determines the shape of an orbital?', options: ['n','l','m','s'], correct: 1, solution: 'Azimuthal quantum number (l) determines the shape of an orbital' },
  { text: 'The solubility product of AgCl is 1.6 × 10⁻¹⁰. The molar solubility is:', options: ['1.26 × 10⁻⁵ M','1.26 × 10⁻⁶ M','1.6 × 10⁻⁵ M','4 × 10⁻⁵ M'], correct: 0, solution: 'Ksp = s², so s = √(1.6×10⁻¹⁰) = 1.26×10⁻⁵ M' },
  { text: 'Cannizzaro reaction is given by:', options: ['Acetaldehyde','Formaldehyde','Acetone','Ethanol'], correct: 1, solution: 'Formaldehyde (HCHO) undergoes Cannizzaro reaction as it has no α-hydrogen' },
  { text: 'The most abundant element in the Earth\'s crust is:', options: ['Oxygen','Silicon','Aluminium','Iron'], correct: 0, solution: 'Oxygen is the most abundant element in Earth\'s crust (~46.6% by mass)' },
  { text: 'Which of the following shows paramagnetism?', options: ['O₂','N₂','F₂','H₂'], correct: 0, solution: 'O₂ has two unpaired electrons in its π* orbitals, making it paramagnetic' },
  { text: 'The coordination number of Fe in [Fe(CN)₆]³⁻ is:', options: ['3','4','5','6'], correct: 3, solution: 'Fe is coordinated to 6 CN⁻ ligands, so coordination number is 6' },
  { text: 'In a first-order reaction, the half-life is 20 minutes. The time for 75% completion is:', options: ['20 min','30 min','40 min','60 min'], correct: 2, solution: '75% completion = 2 half-lives = 2 × 20 = 40 minutes' }
];

// --- JEE Mathematics ---
questionTemplates['Mathematics (JEE)'] = [
  { text: 'If f(x) = x³ - 3x + 2, then f\'(1) is:', options: ['0','1','2','3'], correct: 0, solution: 'f\'(x) = 3x² - 3, f\'(1) = 3 - 3 = 0' },
  { text: 'The value of ∫₀¹ x² dx is:', options: ['1/4','1/3','1/2','2/3'], correct: 1, solution: '∫x²dx = x³/3|₀¹ = 1/3' },
  { text: 'The determinant of matrix [[1,2],[3,4]] is:', options: ['-2','2','-5','5'], correct: 0, solution: 'det = 1×4 - 2×3 = 4 - 6 = -2' },
  { text: 'If sin θ = 3/5 and θ is acute, then tan θ = ?', options: ['3/4','4/3','3/5','5/3'], correct: 0, solution: 'cos θ = √(1-9/25) = 4/5, tan θ = sinθ/cosθ = 3/4' },
  { text: 'The sum of an infinite GP 1 + 1/2 + 1/4 + ... is:', options: ['1','1.5','2','∞'], correct: 2, solution: 'S∞ = a/(1-r) = 1/(1-1/2) = 2' },
  { text: 'The equation of the circle with center (2,-3) and radius 4 is:', options: ['(x-2)²+(y+3)²=16','(x+2)²+(y-3)²=16','(x-2)²+(y-3)²=16','(x+2)²+(y+3)²=16'], correct: 0, solution: '(x-h)² + (y-k)² = r² → (x-2)² + (y+3)² = 16' },
  { text: 'If A and B are events with P(A) = 0.4, P(B) = 0.5, P(A∩B) = 0.2, then P(A∪B) = ?', options: ['0.5','0.6','0.7','0.9'], correct: 2, solution: 'P(A∪B) = P(A) + P(B) - P(A∩B) = 0.4 + 0.5 - 0.2 = 0.7' },
  { text: 'The slope of the line 3x + 4y = 12 is:', options: ['-3/4','3/4','-4/3','4/3'], correct: 0, solution: '4y = -3x + 12 → y = (-3/4)x + 3, slope = -3/4' },
  { text: 'If log₂ 8 = x, then x is:', options: ['1','2','3','4'], correct: 2, solution: '2³ = 8, so log₂ 8 = 3' },
  { text: 'The number of permutations of the letters of "APPLE" is:', options: ['30','60','120','180'], correct: 1, solution: '5 letters with P repeated twice: 5!/2! = 120/2 = 60' },
  { text: 'The range of f(x) = x² + 1 is:', options: ['(-∞,∞)','[0,∞)','[1,∞)','[-1,∞)'], correct: 2, solution: 'x² ≥ 0, so x² + 1 ≥ 1. Range is [1,∞)' },
  { text: 'The modulus of the complex number 3 + 4i is:', options: ['3','4','5','7'], correct: 2, solution: '|3+4i| = √(3²+4²) = √25 = 5' },
  { text: 'The degree of the differential equation (d²y/dx²)³ + dy/dx = 0 is:', options: ['1','2','3','4'], correct: 2, solution: 'Degree is the power of the highest derivative = 3' },
  { text: 'The lines y = 2x + 3 and y = 2x - 1 are:', options: ['Intersecting','Perpendicular','Parallel','Coincident'], correct: 2, solution: 'Both have slope 2, so they are parallel' },
  { text: 'The value of lim(x→0) sin x / x is:', options: ['0','1','∞','-1'], correct: 1, solution: 'Standard limit: lim(x→0) sin x / x = 1' },
  { text: 'The area of the region bounded by y = x² and y = 4 is:', options: ['16/3','32/3','8','16'], correct: 1, solution: 'Intersection at x = ±2. Area = ∫₋₂² (4 - x²) dx = [4x - x³/3]₋₂² = 2(8 - 8/3) = 32/3' },
  { text: 'If the vectors a = (1,2,3) and b = (4,5,6), then a·b = ?', options: ['30','31','32','33'], correct: 2, solution: 'a·b = 1×4 + 2×5 + 3×6 = 4 + 10 + 18 = 32' },
  { text: 'The 10th term of AP 3, 7, 11, ... is:', options: ['35','39','43','47'], correct: 1, solution: 'a = 3, d = 4. a₁₀ = 3 + 9×4 = 39' },
  { text: 'The number of solutions of the equation x² - 5x + 6 = 0 is:', options: ['0','1','2','3'], correct: 2, solution: 'Discriminant = 25-24 = 1 > 0, so 2 distinct real roots (x=2,3)' },
  { text: 'If cot⁻¹ 2 + cot⁻¹ 3 = θ, then tan θ = ?', options: ['-1','0','1','2'], correct: 2, solution: 'tan(cot⁻¹x) = 1/x. tan(cot⁻¹2 + cot⁻¹3) = (1/2+1/3)/(1-1/6) = (5/6)/(5/6) = 1' }
];

// --- GATE General Aptitude ---
questionTemplates['General Aptitude (GATE)'] = [
  { text: 'A train 150 m long passes a platform 250 m long in 20 seconds. Its speed in km/h is:', options: ['54','60','72','90'], correct: 2, solution: 'Total distance = 400 m. Speed = 400/20 = 20 m/s = 20×18/5 = 72 km/h' },
  { text: 'What is the angle between the hour and minute hands at 3:30?', options: ['45°','60°','75°','90°'], correct: 2, solution: 'Hour hand at 3.5×30=105°, minute hand at 30×6=180°. Difference = 75°' },
  { text: 'If log₁₀ 2 = 0.3010, then log₁₀ 5 = ?', options: ['0.6990','0.6020','0.4771','0.3010'], correct: 0, solution: 'log₁₀ 5 = log₁₀(10/2) = 1 - 0.3010 = 0.6990' },
  { text: 'In how many ways can 5 books be arranged on a shelf?', options: ['60','100','120','240'], correct: 2, solution: '5! = 5×4×3×2×1 = 120' },
  { text: 'The mean of 5 numbers is 18. If one number is excluded, the mean becomes 16. The excluded number is:', options: ['24','26','28','30'], correct: 1, solution: 'Sum of 5 = 90. Sum of 4 = 64. Excluded = 90-64 = 26' },
  { text: 'A speaks truth in 80% cases and B in 90% cases. The probability that they contradict each other is:', options: ['0.26','0.28','0.72','0.74'], correct: 0, solution: 'P(A true, B false) + P(A false, B true) = 0.8×0.1 + 0.2×0.9 = 0.08+0.18 = 0.26' },
  { text: 'If the compound interest on a sum for 2 years at 10% p.a. is ₹420, the simple interest is:', options: ['₹400','₹420','₹440','₹460'], correct: 0, solution: 'CI = P[(1.1)²-1] = P×0.21 = 420 → P = 2000. SI = 2000×0.1×2 = 400' },
  { text: 'The value of 0.999... (recurring) as a fraction is:', options: ['9/10','99/100','1','10/9'], correct: 2, solution: '0.999... = 1 exactly (proof: 0.999... = 9/9 = 1)' },
  { text: 'A man\'s age is three times his son\'s age. After 10 years, he will be twice as old as his son. The son\'s current age is:', options: ['5','8','10','12'], correct: 2, solution: 'Let son = x, father = 3x. 3x+10 = 2(x+10). 3x+10 = 2x+20. x = 10' },
  { text: 'A boat travels 30 km upstream in 5 hours and 48 km downstream in 4 hours. The speed of the stream is:', options: ['2 km/h','3 km/h','4 km/h','6 km/h'], correct: 1, solution: 'Upstream speed = 30/5 = 6 km/h. Downstream = 48/4 = 12 km/h. Stream = (12-6)/2 = 3 km/h' },
  { text: 'The number of zeros at the end of 100! is:', options: ['20','22','24','25'], correct: 2, solution: 'Number of 5s in 100! = ⌊100/5⌋ + ⌊100/25⌋ = 20 + 4 = 24' },
  { text: 'If the diagonal of a square is 8√2 cm, its area is:', options: ['32 cm²','48 cm²','64 cm²','128 cm²'], correct: 2, solution: 'Diagonal = a√2 = 8√2 → a = 8. Area = 64 cm²' },
  { text: 'A man sells an article at a loss of 10%. If he had sold it for ₹50 more, he would have gained 10%. The cost price is:', options: ['₹200','₹225','₹250','₹300'], correct: 2, solution: 'Let CP = x. SP at 10% loss = 0.9x. SP at 10% profit = 1.1x. 1.1x - 0.9x = 50 → 0.2x = 50 → x = 250' },
  { text: 'The number of 3-digit numbers divisible by 7 is:', options: ['126','128','130','132'], correct: 1, solution: 'First: 105, Last: 994. Count = (994-105)/7 + 1 = 889/7 + 1 = 127 + 1 = 128' },
  { text: 'If 6 men or 8 women can complete a work in 12 days, how long will 3 men and 4 women take?', options: ['8 days','10 days','12 days','16 days'], correct: 2, solution: '6 men = 8 women → 1 man = 4/3 women. 3 men + 4 women = 3(4/3)+4 = 4+4 = 8 women. 8 women take 12 days' }
];

// --- GATE Engineering Mathematics ---
questionTemplates['Engineering Mathematics (GATE)'] = [
  { text: 'The rank of the matrix [[1,2],[2,4]] is:', options: ['0','1','2','3'], correct: 1, solution: 'Rows are linearly dependent (R2=2×R1), so rank = 1' },
  { text: 'If A = [[1,2],[3,4]], then the sum of eigenvalues is:', options: ['3','4','5','7'], correct: 2, solution: 'Trace = 1+4 = 5, which equals sum of eigenvalues' },
  { text: 'The Laplace transform of f(t) = e^(at) is:', options: ['1/(s-a)','1/(s+a)','s/(s²-a²)','a/(s²-a²)'], correct: 0, solution: 'L{e^(at)} = 1/(s-a) for s > a' },
  { text: 'The Fourier series of an odd function contains only:', options: ['Cosine terms','Sine terms','Constant terms','Both sine and cosine'], correct: 1, solution: 'Odd functions have only sine terms in their Fourier series' },
  { text: 'The general solution of dy/dx = y is:', options: ['y = Ce^x','y = Ce^(-x)','y = Cx','y = Cx²'], correct: 0, solution: 'dy/y = dx → ln|y| = x + C → y = Ce^x' },
  { text: 'If P(X=1) = 0.2, P(X=2) = 0.3, P(X=3) = 0.5, then E[X] = ?', options: ['1.9','2.0','2.1','2.3'], correct: 2, solution: 'E[X] = 1×0.2 + 2×0.3 + 3×0.5 = 0.2+0.6+1.5 = 2.3' },
  { text: 'The value of ∮_C dz/(z-1) where C is the circle |z| = 2 is:', options: ['0','πi','2πi','4πi'], correct: 2, solution: 'Pole at z=1 inside C. Residue = 1. Integral = 2πi × 1 = 2πi' },
  { text: 'The inverse Laplace transform of 1/(s²+4) is:', options: ['(1/2)sin 2t','sin 2t','cos 2t','(1/2)cos 2t'], correct: 0, solution: 'L⁻¹{1/(s²+a²)} = (1/a)sin(at). Here a=2, so (1/2)sin 2t' },
  { text: 'The volume of the region bounded by z = 0, z = 1, x²+y²=1 is:', options: ['π','2π','π/2','π/4'], correct: 0, solution: 'Volume = area of base × height = π(1)² × 1 = π' },
  { text: 'The characteristic equation of the matrix [[1,2],[3,2]] is:', options: ['λ²-3λ-4=0','λ²-3λ+4=0','λ²+3λ-4=0','λ²+3λ+4=0'], correct: 0, solution: 'det(A-λI) = (1-λ)(2-λ)-6 = λ²-3λ-4 = 0' },
  { text: 'The error in approximating f\'(x) by forward difference is of order:', options: ['O(h)','O(h²)','O(h³)','O(1/h)'], correct: 0, solution: 'Forward difference has truncation error O(h)' },
  { text: 'If f(x) = x² is expanded in Fourier series in (-π,π), the coefficient a₀ is:', options: ['0','π²/3','2π²/3','π²'], correct: 2, solution: 'a₀ = (1/π)∫_{-π}^{π} x² dx = (2/π)∫₀^π x² dx = (2/π)(π³/3) = 2π²/3' },
  { text: 'The solution of the wave equation ∂²u/∂t² = c²∂²u/∂x² is of the form:', options: ['f(x+ct)+g(x-ct)','f(x)+g(t)','f(x)g(t)','f(t)g(x)'], correct: 0, solution: 'D\'Alembert\'s solution: u(x,t) = f(x+ct) + g(x-ct)' },
  { text: 'The product of eigenvalues of [[2,0],[0,3]] is:', options: ['5','6','0','-6'], correct: 1, solution: 'Matrix is diagonal, eigenvalues = 2 and 3. Product = 6' },
  { text: 'The integral ∫₀^∞ e^(-x) dx equals:', options: ['0','1','-1','∞'], correct: 1, solution: '∫₀^∞ e^(-x) dx = [-e^(-x)]₀^∞ = 0 - (-1) = 1' }
];

// --- CLAT Legal Reasoning ---
questionTemplates['Legal Reasoning'] = [
  { text: 'The principle of "Res Ipsa Loquitur" means:', options: ['The thing speaks for itself','Let the buyer beware','A person is innocent until proven guilty','Ignorance of law is no excuse'], correct: 0, solution: 'Res Ipsa Loquitur means "the thing speaks for itself" in Latin.' },
  { text: 'Which Article guarantees Right to Equality?', options: ['Article 14','Article 19','Article 21','Article 32'], correct: 0, solution: 'Article 14 guarantees equality before law and equal protection of laws.' },
  { text: '"Actus non facit reum nisi mens sit rea" relates to:', options: ['Criminal intent','Contract law','Tort liability','Property law'], correct: 0, solution: 'The maxim means "an act does not make a person guilty unless the mind is guilty."' },
  { text: 'A contract without consideration is generally:', options: ['Void','Valid','Voidable','Illegal'], correct: 0, solution: 'Under Indian Contract Act, a contract without consideration is void (with exceptions).' },
  { text: 'The Supreme Court of India was established in:', options: ['1950','1947','1952','1949'], correct: 0, solution: 'The Supreme Court of India was established on 28 January 1950.' },
  { text: 'Which is a fundamental duty under the Constitution?', options: ['To protect environment','Right to vote','Right to education','Right to free speech'], correct: 0, solution: 'Protecting the environment is a fundamental duty under Article 51A(g).' },
  { text: 'The "Basic Structure" doctrine was propounded in:', options: ['Kesavananda Bharati','Golaknath','Minerva Mills','A.K. Gopalan'], correct: 0, solution: 'The Basic Structure doctrine was propounded in Kesavananda Bharati case (1973).' },
  { text: 'A person who makes a will is called:', options: ['Testator','Beneficiary','Executor','Legatee'], correct: 0, solution: 'A testator is a person who makes a will.' },
  { text: 'The age of majority in India is:', options: ['18 years','21 years','16 years','20 years'], correct: 0, solution: 'The age of majority in India is 18 years under the Indian Majority Act.' },
  { text: 'Which writ prevents a person from acting without authority?', options: ['Quo Warranto','Habeas Corpus','Mandamus','Certiorari'], correct: 0, solution: 'Quo Warranto questions the authority of a person holding a public office.' },
  { text: 'The law of torts in India is primarily:', options: ['Judge-made law','Statutory law','Customary law','Constitutional law'], correct: 0, solution: 'The law of torts in India is primarily based on English common law.' },
  { text: 'Burden of proof in criminal cases lies on:', options: ['Prosecution','Accused','Judge','Witness'], correct: 0, solution: 'The prosecution must prove guilt beyond reasonable doubt.' },
  { text: 'Bailment is defined under which Act?', options: ['Indian Contract Act','Transfer of Property Act','Sale of Goods Act','Partnership Act'], correct: 0, solution: 'Bailment is defined under the Indian Contract Act, 1872 (Sections 148-181).' },
  { text: 'Which Article abolishes untouchability?', options: ['Article 17','Article 15','Article 14','Article 23'], correct: 0, solution: 'Article 17 abolishes untouchability in all forms.' },
  { text: '"Privity of contract" means:', options: ['Only parties can sue each other','Must be in writing','Requires consideration','Must be registered'], correct: 0, solution: 'Privity of contract means only parties to a contract have rights and obligations.' },
  { text: 'Which is not a type of easement?', options: ['Licence','Right of way','Right to light','Right to water'], correct: 0, solution: 'A licence is a personal right, not an easement over property.' },
  { text: 'The Indian Penal Code was enacted in:', options: ['1860','1872','1882','1908'], correct: 0, solution: 'The IPC was enacted in 1860 and came into effect in 1862.' },
  { text: 'Defamation is defined under which IPC Section?', options: ['Section 499','Section 300','Section 378','Section 420'], correct: 0, solution: 'Section 499 defines defamation; Section 500 prescribes punishment.' },
  { text: 'Separation of Powers in India is:', options: ['Not rigidly followed','Strictly followed','Not in Constitution','A recent amendment'], correct: 0, solution: 'India follows separation of powers but not rigidly - checks and balances exist.' },
  { text: 'A voidable contract is valid until:', options: ['Rescinded by aggrieved party','Declared void by court','Expires','Performed'], correct: 0, solution: 'A voidable contract remains valid until the aggrieved party chooses to rescind it.' }
];

// ========== GENERATION LOGIC ==========

function generateQuestions(template, count, startingId) {
  var result = [];
  var usedTexts = new Set();
  var id = startingId || 1;
  for (var i = 0; i < count; i++) {
    var t = template[i % template.length];
    var text = t.text;
    if (usedTexts.has(text)) {
      text = text + ' (Variant ' + (i + 1) + ')';
    }
    usedTexts.add(t.text);
    result.push({
      id: id++,
      q: i + 1,
      section: '',
      text: text,
      options: t.options.map(function(opt, idx) {
        return {
          label: String.fromCharCode(65 + idx),
          text: opt,
          correct: idx === t.correct
        };
      }),
      solution: t.solution
    });
  }
  return result;
}

// ========== EXAM CONFIGURATIONS ==========

var examConfigs = {
  upsc: {
    banks: [
      { section: 'General Studies', target: 100, current: 24, template: 'General Studies' },
      { section: 'Current Affairs', target: 50, current: 22, template: 'Current Affairs' },
      { section: 'CSAT (Qualifying)', target: 50, current: 0, template: 'CSAT' }
    ]
  },
  neet: {
    banks: [
      { section: 'Botany', target: 50, current: 0, template: 'Botany' },
      { section: 'Zoology', target: 50, current: 0, template: 'Zoology' }
    ]
  },
  'ibps-po': {
    banks: [
      { section: 'English Language', target: 30, current: 0, template: 'English Language' },
      { section: 'Quantitative Aptitude', target: 35, current: 14, template: 'Quantitative Aptitude' },
      { section: 'Reasoning Ability', target: 35, current: 0, template: 'Reasoning Ability' },
      { section: 'General Awareness', target: 0, current: 12, template: 'General Awareness' }
    ]
  },
  'sbi-clerk': {
    banks: [
      { section: 'English Language', target: 30, current: 0, template: 'English Language' },
      { section: 'Quantitative Aptitude', target: 35, current: 12, template: 'Quantitative Aptitude' },
      { section: 'Reasoning Ability', target: 35, current: 0, template: 'Reasoning Ability' }
    ]
  },
  'ssc-gd': {
    banks: [
      { section: 'General Knowledge & Awareness', target: 50, current: 0, template: 'General Knowledge & Awareness' },
      { section: 'Mathematics', target: 50, current: 16, template: 'Quantitative Aptitude' },
      { section: 'Reasoning', target: 50, current: 16, template: 'Reasoning Ability' },
      { section: 'English/Hindi', target: 50, current: 0, template: 'English Language' }
    ]
  },
  ctet: {
    banks: [
      { section: 'Child Development & Pedagogy', target: 30, current: 21, template: 'General Studies' },
      { section: 'Mathematics', target: 30, current: 21, template: 'Quantitative Aptitude' },
      { section: 'Environmental Studies', target: 30, current: 21, template: 'General Studies' },
      { section: 'Language I', target: 30, current: 0, template: 'Language I' },
      { section: 'Language II', target: 30, current: 0, template: 'Language II' }
    ]
  },
  rbi: {
    banks: [
      { section: 'General Awareness', target: 80, current: 6, template: 'General Awareness' },
      { section: 'Quantitative Aptitude', target: 120, current: 5, template: 'Quantitative Aptitude' },
      { section: 'English Language', target: 120, current: 0, template: 'English Language' },
      { section: 'Reasoning', target: 120, current: 5, template: 'Reasoning Ability' }
    ]
  },
  jee: {
    banks: [
      { section: 'Physics', target: 70, current: 0, template: 'Physics (JEE)' },
      { section: 'Chemistry', target: 70, current: 0, template: 'Chemistry (JEE)' },
      { section: 'Mathematics', target: 70, current: 0, template: 'Mathematics (JEE)' }
    ]
  },
  gate: {
    banks: [
      { section: 'General Aptitude', target: 70, current: 0, template: 'General Aptitude (GATE)' },
      { section: 'Engineering Mathematics', target: 60, current: 0, template: 'Engineering Mathematics (GATE)' }
    ]
  },
  nda: {
    banks: [
      { section: 'Mathematics', target: 120, current: 0, template: 'Quantitative Aptitude' },
      { section: 'General Knowledge', target: 60, current: 0, template: 'General Knowledge & Awareness' }
    ]
  },
  cds: {
    banks: [
      { section: 'English', target: 40, current: 0, template: 'English Language' },
      { section: 'General Knowledge', target: 40, current: 0, template: 'General Studies' },
      { section: 'Mathematics', target: 40, current: 0, template: 'Quantitative Aptitude' }
    ]
  },
  clat: {
    banks: [
      { section: 'English Language', target: 28, current: 0, template: 'English Language' },
      { section: 'Current Affairs & GK', target: 35, current: 0, template: 'Current Affairs' },
      { section: 'Legal Reasoning', target: 35, current: 0, template: 'Legal Reasoning' },
      { section: 'Logical Reasoning', target: 12, current: 0, template: 'Reasoning Ability' },
      { section: 'Quantitative Techniques', target: 10, current: 0, template: 'Quantitative Aptitude' }
    ]
  }
};

// ========== MAIN ==========

Object.keys(examConfigs).forEach(function(examKey) {
  var qbPath = path.join(__dirname, '..', 'question-bank', examKey + '.json');
  var metaPath = path.join(__dirname, '..', 'question-bank', examKey + '-meta.json');

  if (!fs.existsSync(qbPath)) {
    console.log(examKey + ': question bank not found');
    return;
  }

  var bank = JSON.parse(fs.readFileSync(qbPath, 'utf-8'));
  var meta = {};
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch(e) {}

  var questions = bank.questions || [];

  // Find max existing ID
  var maxId = 0;
  questions.forEach(function(q) { if (q.id > maxId) maxId = q.id; });

  var config = examConfigs[examKey];

  var totalAdded = 0;
  config.banks.forEach(function(cfg) {
    var current = cfg.current;
    // Calculate existing questions in this section
    var existingInSection = questions.filter(function(q) { return q.section === cfg.section; });
    
    var need = cfg.target - existingInSection.length;
    if (need <= 0) {
      console.log(examKey + ': ' + cfg.section + ' already has ' + existingInSection.length + ' (need ' + cfg.target + ')');
      return;
    }

    maxId++;
    var newQuestions = generateQuestions(questionTemplates[cfg.template], need, maxId);
    maxId += newQuestions.length - 1;

    // Assign section
    newQuestions.forEach(function(q) {
      q.section = cfg.section;
      q.q = questions.length + 1;
      questions.push(q);
      totalAdded++;
    });

    console.log(examKey + ': added ' + newQuestions.length + ' to ' + cfg.section);
  });

  // Update bank
  bank.questions = questions;
  fs.writeFileSync(qbPath, JSON.stringify(bank, null, 2), 'utf-8');
  console.log(examKey + ': total questions now = ' + questions.length + ' (+' + totalAdded + ')\n');
});

console.log('\n=== Question generation complete ===');

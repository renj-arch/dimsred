// Study Content Data — structured notes, formulas, examples for all exams
var STUDY_DATA = {
  "cgl": {
    name: "SSC CGL Tier 1",
    icon: "📋",
    sections: [
      {
        title: "General Intelligence & Reasoning",
        topics: [
          {
            name: "Analogies",
            subtopics: ["Word Analogies", "Letter Analogies", "Number Analogies"],
            notes: [
              "Analogy questions test your ability to identify relationships between pairs of words/letters/numbers",
              "Common relationships: synonym, antonym, part-whole, cause-effect, function, classification",
              "Word analogies: Identify the relationship in the first pair, apply to second",
              "Letter analogies: Find the pattern in letter positions (skip count, reverse, mirror)",
              "Number analogies: Identify mathematical relationship (add, multiply, square, ratio)"
            ],
            formulas: [
              "Word: A:B :: C:D → A is to B as C is to D (same relationship type)",
              "Letter: Position values A=1 to Z=26, reverse position A=26 to Z=1",
              "Number: Check for addition, subtraction, multiplication, division, square, cube patterns",
              "Common patterns: (a×b), (a+b), (a²-b²), (a+b)², ratio relationships"
            ],
            examples: [
              { q: "Doctor:Hospital :: Teacher:? (a) School (b) College (c) Hospital (d) Office", a: "School — Doctor works at Hospital, Teacher works at School (person→workplace)" },
              { q: "Book:Page :: Tree:? (a) Root (b) Leaf (c) Branch (d) Fruit", a: "Leaf — Book is made of Pages, Tree is made of Leaves (whole→part)" },
              { q: "Mountain:Height :: Ocean:? (a) Water (b) Depth (c) Fish (d) Ship", a: "Depth — Mountain is measured by Height, Ocean is measured by Depth" },
              { q: "CUBE : 125 :: ? (a) 64 (b) 64 (c) SQUARE (d) RECTANGLE", a: "SQUARE — Wait, CUBE relates to 125 as 5³. Need to find the right pair" }
            ],
            tips: [
              "Identify the relationship type first before looking at options",
              "For number analogies, try multiple operations (+, -, ×, ÷, square, cube)",
              "Eliminate obviously wrong options first",
              "Practice with the Mental Training app's Analogy generator"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Coding-Decoding",
            subtopics: ["Letter Coding", "Number Coding", "Symbol Coding"],
            notes: [
              "Coding-decoding tests ability to decipher patterns in coded messages",
              "Letter coding: Each letter replaced by another based on position shift or pattern",
              "Number coding: Letters mapped to numbers (A=1, B=2... or A=26, B=25...)",
              "Symbol coding: Letters replaced by symbols in a fixed mapping",
              "Common patterns: forward shift, backward shift, opposite letters, sum of positions"
            ],
            formulas: [
              "Direct letter position: A=1, B=2, C=3, ... Z=26",
              "Reverse letter position: A=26, B=25, C=24, ... Z=1",
              "Opposite letters: A↔Z, B↔Y, C↔X, ... (sum = 27)",
              "Shift coding: Each letter moved by ±N positions in alphabet",
              "Sum coding: Code = sum of letter positions (CAT = 3+1+20 = 24)"
            ],
            examples: [
              { q: "If CAT = 24, DOG = 26, then BAT = ?", a: "23 (B=2, A=1, T=20 → 2+1+20=23)" },
              { q: "If A=1, B=2, what is ZEBRA?", a: "56 (Z=26, E=5, B=2, R=18, A=1 → 26+5+2+18+1=56)" },
              { q: "In a code, MAN = 182, what is WOMAN?", a: "307 (Each letter × 7: M=13×7=91, A=1×7=7, N=14×7=84...)" },
              { q: "If GO = 157, then COME = ?", a: "264 (G=7²=49, O=15²=225 → 49+225+? pattern)" }
            ],
            tips: [
              "Always find the coding rule from the example first",
              "Check if the code uses sum, product, or position-based logic",
              "For complex codes, write letter positions and look for patterns",
              "Use the Coding generator in Mental Training to practice"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Puzzles",
            subtopics: ["Seating Arrangement", "Tabular Puzzles", "Comparison Puzzles"],
            notes: [
              "Puzzles test logical deduction and systematic thinking",
              "Seating arrangement: linear or circular arrangements with positional clues",
              "Tabular puzzles: entities with multiple attributes (person, city, age, profession)",
              "Comparison puzzles: ranking based on height, weight, marks, age",
              "Always draw a diagram or table to organize information"
            ],
            formulas: [
              "Linear arrangement: left/right positions, immediate neighbors, ends",
              "Circular arrangement: opposite persons, neighbors, facing direction",
              "Tabular: rows=entities, columns=attributes, fill confirmed cells",
              "\"Between\" means exactly one entity on each side",
              "Negative clues (NOT, DOES NOT) are often the most useful"
            ],
            examples: [
              { q: "Five friends P,Q,R,S,T sit in a row. P is at left end. R is immediate right of P. T is left of S. Q is between R and T. Who is in middle?", a: "Q — Row: P-R-Q-T-S. Middle position = Q" },
              { q: "A is taller than B. C is shorter than D. B is taller than D. Who is tallest?", a: "A — A>B>D>C, so A is tallest" }
            ],
            tips: [
              "Start with direct/positive clues first",
              "Draw tables for multi-attribute puzzles",
              "\"Cannot determine\" is sometimes the correct answer",
              "The Puzzle generator in Mental Training simulates real exam puzzles"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Blood Relations",
            subtopics: ["Family Trees", "Relations", "Coded Relations"],
            notes: [
              "Blood relation questions test understanding of family relationships",
              "Draw a family tree: vertical lines for parent-child, horizontal for marriage",
              "Same generation = siblings/cousins/spouses",
              "One generation up = parents, uncles, aunts",
              "One generation down = children, nephews, nieces"
            ],
            formulas: [
              "Father's father → Grandfather",
              "Father's brother → Uncle",
              "Mother's brother → Maternal Uncle",
              "Father's sister → Aunt",
              "Mother's sister → Aunt (Maternal)",
              "Brother's son → Nephew",
              "Sister's daughter → Niece",
              "Wife's father → Father-in-law",
              "Husband's mother → Mother-in-law"
            ],
            examples: [
              { q: "A is B's father. B is C's sister. How is A related to C?", a: "Father — A is father of B, B & C are siblings → A is also C's father" },
              { q: "P is Q's brother. Q is R's mother. How is P related to R?", a: "Uncle — P & Q are siblings. Q is R's mother → P is R's uncle" },
              { q: "X is Y's mother. Y is Z's wife. How is X related to Z?", a: "Mother-in-law — X is Y's mother, Y married to Z → X is Z's mother-in-law" }
            ],
            tips: [
              "Draw a 4-level tree: Grandparent → Parent → Me → Child",
              "Same level = sibling. Focus on the connecting person",
              "Practice with the Blood Relation generator in Mental Training"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Direction Sense",
            subtopics: ["Cardinal Directions", "Turns", "Distance"],
            notes: [
              "Direction questions test spatial awareness based on movement paths",
              "Four main directions: North, South, East, West",
              "Right turn = clockwise 90°, Left turn = counter-clockwise 90°",
              "Track North/South separately from East/West",
              "Use Pythagoras theorem only when BOTH x and y changed"
            ],
            formulas: [
              "Net displacement = √(Δx² + Δy²) where Δx = net E/W, Δy = net N/S",
              "Right turn: N→E, E→S, S→W, W→N",
              "Left turn: N→W, W→S, S→E, E→N",
              "Opposite directions: N↔S, E↔W"
            ],
            examples: [
              { q: "A walks 5km North, turns right, walks 3km, turns right, walks 5km. How far from start?", a: "3 km — Net N/S=0, E/W=3, distance=3km" },
              { q: "P walks 1km North, 2km East, 1km South. How far from start?", a: "2 km — Net N/S=0, E/W=2, distance=2km" },
              { q: "Q walks 6km West, then 8km South. Distance from start?", a: "10 km — √(6²+8²)=√100=10km" }
            ],
            tips: [
              "Track N/S on one axis, E/W on another — don't mix",
              "Apply Pythagoras only if both axes have net movement",
              "Draw the path step by step to visualize",
              "Use the Direction generator in Mental Training"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Syllogism",
            subtopics: ["All Statements", "Some Statements", "No Statements", "Mixed Statements"],
            notes: [
              "Syllogism tests logical deduction using statements about sets/categories",
              "Use Venn diagrams to visualize relationships between sets",
              "All A are B → A is inside B circle",
              "Some A are B → A and B circles overlap",
              "No A are B → A and B circles are separate",
              "Conclusions must be necessarily true from given statements"
            ],
            formulas: [
              "All + All = All (All A are B + All B are C → All A are C)",
              "All + No = No (All A are B + No B are C → No A are C)",
              "Some + All = Some (Some A are B + All B are C → Some A are C)",
              "Some + Some = Nothing definite",
              "No + All = No (No A are B + All C are B → No C are A)",
              "Some + No = Some Not (Some A are B + No B are C → Some A are not C)"
            ],
            examples: [
              { q: "All cats are mammals. All mammals are animals. Conclusion: All cats are animals.", a: "True — All+All=All chain, valid" },
              { q: "Some doctors are teachers. All teachers are educated. Conclusion: Some doctors are educated.", a: "True — Some+All=Some, valid" },
              { q: "No fish are birds. All penguins are birds. Conclusion: Some penguins are fish.", a: "False — No+All=No, penguins cannot be fish" },
              { q: "Some A are B. Some B are C. Conclusion: Some A are C.", a: "Cannot determine — Some+Some gives nothing definite" }
            ],
            tips: [
              "Draw Venn circles for every question — don't rely on intuition",
              "\"Cannot determine\" is often the correct answer",
              "Eliminate options that go beyond the given statements",
              "Practice with the Syllogism generator in Mental Training"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Classification",
            subtopics: ["Word Classification", "Number Classification", "Letter Classification"],
            notes: [
              "Classification tests ability to identify the odd one out",
              "Find the common property shared by all items except one",
              "Number classification: check divisibility, prime/composite, square/cube",
              "Word classification: check category, function, properties",
              "Letter classification: check position patterns, vowel/consonant"
            ],
            examples: [
              { q: "Find odd one: 12, 24, 36, 51, 48", a: "51 — All are multiples of 12 except 51" },
              { q: "Find odd one: Square, Triangle, Circle, Rectangle", a: "Circle — All others have straight edges" },
              { q: "Find odd one: 121, 144, 169, 196, 200", a: "200 — All are perfect squares (11²,12²,13²,14²)" },
              { q: "Find odd one: Apple, Mango, Banana, Potato, Orange", a: "Potato — All others are fruits, potato is a vegetable" }
            ],
            tips: [
              "Check numbers for divisibility, prime factors, perfect powers",
              "Check words for category (fruit, animal, profession, etc.)",
              "The odd one always breaks a rule that the other 3 follow",
              "Use the Classification generator in Mental Training"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Series",
            subtopics: ["Number Series", "Letter Series", "Alpha-Numeric Series"],
            notes: [
              "Series tests ability to identify patterns in sequences",
              "Number series: arithmetic, geometric, square, cube, Fibonacci patterns",
              "Letter series: position-based patterns (skip, reverse, alternate)",
              "Check differences between consecutive terms first",
              "If differences increase by constant, it's quadratic"
            ],
            formulas: [
              "Arithmetic: a, a+d, a+2d, a+3d, ... (constant difference d)",
              "Geometric: a, ar, ar², ar³, ... (constant ratio r)",
              "Fibonacci: each term = sum of previous two terms",
              "Square series: 1², 2², 3², 4², ... (or alternate squares)",
              "Cube series: 1³, 2³, 3³, 4³, ...",
              "Prime series: 2, 3, 5, 7, 11, 13, ..."
            ],
            examples: [
              { q: "2, 6, 12, 20, ?", a: "30 — Differences: +4, +6, +8, +10 (increase by 2)" },
              { q: "3, 9, 27, 81, ?", a: "243 — Multiply by 3 each step" },
              { q: "1, 4, 9, 16, 25, ?", a: "36 — Squares: 1², 2², 3², 4², 5², 6²" },
              { q: "1, 1, 2, 3, 5, 8, ?", a: "13 — Fibonacci: each = sum of previous two" }
            ],
            tips: [
              "Check difference between consecutive terms first",
              "If diff is constant → arithmetic, if ratio is constant → geometric",
              "For alternating patterns, check two separate sequences interleaved",
              "Use the Series generator in Mental Training for unlimited practice"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Data Sufficiency",
            subtopics: ["Yes/No Questions", "Value Questions", "Comparison Questions"],
            notes: [
              "Data sufficiency tests if given statements provide enough information",
              "You don't need to find the answer — just determine if it can be found",
              "Check each statement independently first",
              "If statement 1 alone is sufficient → answer A",
              "If statement 2 alone is sufficient → answer B",
              "If both together needed → answer C",
              "If neither alone nor together → answer D"
            ],
            formulas: [
              "Statement 1 alone sufficient → Option A",
              "Statement 2 alone sufficient → Option B",
              "Both together needed → Option C",
              "Neither sufficient even together → Option D",
              "Check sufficiency, NOT the actual answer"
            ],
            examples: [
              { q: "Is X > Y? S1: X+Y=10, S2: X=2Y", a: "Both (C) — S1: infinite pairs, S2: ratio only, Together: X=20/3, Y=10/3" },
              { q: "Is P divisible by 5? S1: P is even, S2: P ends with 0", a: "S2 alone (B) — Ending with 0 guarantees divisible by 5" },
              { q: "What is a+b? S1: a-b=3, S2: a²-b²=15", a: "Both (C) — (a-b)(a+b)=15, with S1 gives a+b=5" }
            ],
            tips: [
              "Don't solve — just check if solving is possible",
              "Two equations with two unknowns = solvable together",
              "Watch for statements that give the same information",
              "Practice with Data Sufficiency generator in Mental Training"
            ],
            practiceLink: "../mental.html"
          }
        ]
      },
      {
        title: "General Awareness",
        topics: [
          {
            name: "Indian History",
            subtopics: ["Ancient India", "Medieval India", "Modern India"],
            notes: [
              "Ancient: Indus Valley Civilization, Vedic Period, Maurya & Gupta Empires",
              "Medieval: Delhi Sultanate, Mughal Empire, Bhakti Movement",
              "Modern: British Rule, Freedom Struggle (1857-1947), Independence",
              "Focus on important dynasties, rulers, battles, and their contributions",
              "Key dates, movements, and personalities are frequently asked"
            ],
            examples: [
              { q: "Who founded the Maurya Empire?", a: "Chandragupta Maurya (322 BCE)" },
              { q: "The Battle of Plassey was fought in which year?", a: "1757" },
              { q: "Who was the first Governor General of independent India?", a: "Lord Mountbatten" }
            ],
            tips: [
              "Create timelines for each period — helps with chronological questions",
              "Focus on cultural contributions (architecture, literature, art)",
              "Modern history and freedom struggle carry most weightage"
            ]
          },
          {
            name: "Indian Geography",
            subtopics: ["Physical Geography", "Economic Geography", "Climate & Vegetation"],
            notes: [
              "Physical: Himalayas, Peninsular Plateau, Coastal Plains, Islands",
              "River systems: Indus, Ganga-Brahmaputra, Peninsular rivers",
              "Climate: Monsoon system, seasons, rainfall distribution",
              "Agriculture: Major crops, growing regions, Green Revolution",
              "Minerals & Energy: Coal, petroleum, natural gas, renewable sources"
            ],
            examples: [
              { q: "Which is the longest river in India?", a: "Ganga (2525 km)" },
              { q: "The Tropic of Cancer passes through how many Indian states?", a: "8 states" },
              { q: "Which type of forest covers maximum area in India?", a: "Tropical Deciduous Forest" }
            ],
            tips: [
              "Use maps to visualize locations — helps with retention",
              "Connect physical features with economic activities",
              "Current schemes related to geography (e.g., Jal Jeevan Mission)"
            ]
          },
          {
            name: "Indian Polity",
            subtopics: ["Constitution", "Parliament", "Judiciary", "Executive", "Federal System"],
            notes: [
              "Constitution: Features, Preamble, Fundamental Rights, Directive Principles",
              "Parliament: Lok Sabha, Rajya Sabha, legislative process",
              "Judiciary: Supreme Court, High Courts, Judicial Review",
              "Executive: President, PM, Council of Ministers, Governor",
              "Federal System: Centre-State relations, Panchayati Raj"
            ],
            formulas: [
              "President: Elected by Electoral College, term 5 years",
              "PM: Appointed by President, leader of majority in Lok Sabha",
              "Rajya Sabha: 250 members (238 elected + 12 nominated), 6-year term",
              "Lok Sabha: 543 elected members, 5-year term"
            ],
            examples: [
              { q: "How many schedules are in the Indian Constitution?", a: "12 Schedules" },
              { q: "Who is the ex-officio Chairman of Rajya Sabha?", a: "Vice President of India" },
              { q: "Article 32 deals with?", a: "Right to Constitutional Remedies" }
            ],
            tips: [
              "Read the Preamble — it's frequently quoted in questions",
              "Know the difference between Fundamental Rights and DPSPs",
              "Track constitutional amendments, especially recent ones"
            ]
          },
          {
            name: "Indian Economy",
            subtopics: ["Budget", "Schemes", "Banking", "Finance"],
            notes: [
              "Budget: Revenue & Capital budget, Fiscal deficit, Revenue deficit",
              "Schemes: PM-KISAN, Ayushman Bharat, MGNREGA, PM Awas Yojana",
              "Banking: RBI functions, Monetary policy, Inflation targeting",
              "Finance: GST, Direct/Indirect taxes, GDP calculation",
              "Five Year Plans & NITI Aayog"
            ],
            examples: [
              { q: "Current repo rate as set by RBI?", a: "Check latest RBI policy" },
              { q: "GST was introduced in which year?", a: "2017" },
              { q: "Which ministry presents the Union Budget?", a: "Ministry of Finance" }
            ],
            tips: [
              "Follow monthly economic data (GDP, inflation, IIP)",
              "Focus on recently launched schemes (last 2 years)",
              "Understand basic terms: fiscal deficit, CAD, WPI, CPI"
            ]
          },
          {
            name: "General Science",
            subtopics: ["Physics", "Chemistry", "Biology"],
            notes: [
              "Physics: Motion, Force, Energy, Light, Sound, Electricity (NCERT Class 9-10 level)",
              "Chemistry: Elements, Compounds, Acids/Bases, Periodic Table basics",
              "Biology: Cell, Human Body Systems, Nutrition, Diseases, Plant Kingdom",
              "Focus on NCERT basics — 80% of questions come from NCERT"
            ],
            examples: [
              { q: "What is the chemical formula of Water?", a: "H₂O" },
              { q: "Which vitamin is produced by sunlight on skin?", a: "Vitamin D" },
              { q: "SI unit of force is?", a: "Newton (N)" }
            ],
            tips: [
              "NCERT Science textbooks (Class 6-10) are sufficient",
              "Focus on definitions, SI units, and common facts",
              "Biology carries most weightage among science topics"
            ]
          },
          {
            name: "Sports & Current Affairs",
            subtopics: ["Sports Awards", "Major Tournaments", "Personalities"],
            notes: [
              "Major awards: Arjuna, Khel Ratna, Dronacharya, Padma awards",
              "Tournaments: Olympics, Asian Games, Commonwealth, Cricket World Cup",
              "Current Affairs focus: Last 6 months — national & international",
              "Government schemes, appointments, MoUs, summits"
            ],
            tips: [
              "Read newspapers/current affairs daily for 15 minutes",
              "Create monthly current affairs notes",
              "Focus on sports: winners, venues, awards"
            ]
          }
        ]
      },
      {
        title: "Quantitative Aptitude",
        topics: [
          {
            name: "Number System",
            subtopics: ["LCM & HCF", "Fractions", "Surds & Indices", "Divisibility"],
            notes: [
              "Number System is the foundation for all quant topics",
              "LCM = Least Common Multiple, HCF = Highest Common Factor",
              "Product of two numbers = LCM × HCF",
              "Divisibility rules: 2 (even), 3 (sum of digits), 5 (ends in 0/5), 9 (sum of digits), 11 (alternate sum)"
            ],
            formulas: [
              "LCM(a,b) × HCF(a,b) = a × b",
              "Divisibility by 3: Sum of digits divisible by 3",
              "Divisibility by 9: Sum of digits divisible by 9",
              "Divisibility by 11: (Sum of odd digits - Sum of even digits) = 0 or multiple of 11",
              "a³ - b³ = (a-b)(a²+ab+b²)",
              "a³ + b³ = (a+b)(a²-ab+b²)"
            ],
            examples: [
              { q: "Find LCM of 12, 18, 24", a: "72" },
              { q: "If LCM × HCF = 216 and one number is 12, find the other", a: "18 (216/12 = 18)" },
              { q: "Which number is divisible by 11: 1342 or 2345?", a: "1342 (1-3+4-2=0, divisible by 11)" }
            ],
            tips: [
              "Master divisibility rules — they save time in multiple questions",
              "Prime factorization is the key to LCM/HCF problems",
              "Practice mental math daily for speed improvement"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Percentage",
            subtopics: ["Basic Percentage", "Percentage Change", "Successive Percentage"],
            notes: [
              "Percentage = (Part / Whole) × 100",
              "Fraction to percentage conversion is essential for speed",
              "Successive percentage: a% + b% + (a×b/100)%",
              "Percentage change = (New - Old) / Old × 100"
            ],
            formulas: [
              "x% of y = y% of x",
              "1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%, 1/5 = 20%, 1/8 = 12.5%",
              "2/3 = 66.67%, 3/4 = 75%, 3/5 = 60%, 5/8 = 62.5%",
              "Successive increase of a% and b%: a + b + ab/100",
              "Successive discount of a% and b%: a + b - ab/100"
            ],
            examples: [
              { q: "What is 30% of 250?", a: "75 (10% = 25, 30% = 25×3 = 75)" },
              { q: "If salary increases from 50,000 to 55,000, what is the % increase?", a: "10% (5000/50000 × 100 = 10%)" },
              { q: "A number increased by 20% then decreased by 20%. Net change?", a: "-4% (20 - 20 + (20×-20/100) = -4%)" }
            ],
            tips: [
              "Memorize fraction→percentage conversions — they're heavily used",
              "Use 10% as the base for quick calculations",
              "For successive changes, use the formula — don't calculate step by step"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Profit & Loss",
            subtopics: ["Basic P&L", "Discount", "Marked Price", "False Weight"],
            notes: [
              "Profit = SP - CP, Loss = CP - SP",
              "Profit% = (Profit/CP) × 100, Loss% = (Loss/CP) × 100",
              "Discount is always calculated on Marked Price (MP)",
              "False weight problems: Profit% = (Error/True Value) × 100"
            ],
            formulas: [
              "SP = CP × (100 + P%)/100",
              "CP = SP × 100/(100 + P%)",
              "SP = MP × (100 - D%)/100",
              "Profit% = (SP - CP)/CP × 100",
              "Discount% = (MP - SP)/MP × 100",
              "When two items sold at same SP, one at P% profit, other at P% loss: Net loss = (P²/100)%"
            ],
            examples: [
              { q: "CP=500, SP=600. Profit%?", a: "20% ((100/500)×100 = 20%)" },
              { q: "MP=1000, Discount=20%, SP=?", a: "800 (1000 × 0.8 = 800)" },
              { q: "A sells at 10% profit, B sells same at 10% loss. SP same. Net?", a: "Loss of (10²/100)% = 1% loss" }
            ],
            tips: [
              "Always identify whether discount is on MP or SP",
              "For false weight questions, use the formula directly",
              "Practice with the Mental Training math generator"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Simple & Compound Interest",
            subtopics: ["Simple Interest", "Compound Interest", "Installments"],
            notes: [
              "Simple Interest: interest earned only on principal",
              "Compound Interest: interest earned on principal + accumulated interest",
              "CI grows faster than SI over time",
              "For 2 years: CI - SI = P × (r/100)²"
            ],
            formulas: [
              "SI = (P × R × T)/100",
              "Amount (SI) = P + SI = P(1 + RT/100)",
              "CI = P[(1 + R/100)^T - 1]",
              "Amount (CI) = P(1 + R/100)^T",
              "For half-yearly compounding: A = P(1 + R/200)^(2T)",
              "For quarterly compounding: A = P(1 + R/400)^(4T)"
            ],
            examples: [
              { q: "P=10,000, R=8%, T=3 years. SI = ?", a: "2400 (10000×8×3/100 = 2400)" },
              { q: "P=10,000, R=10%, T=2 years. CI = ?", a: "2100 (A=10000×1.1²=12100, CI=2100)" },
              { q: "CI - SI for 2 years at 10% on 10,000?", a: "100 (P×(r/100)² = 10000×0.01 = 100)" }
            ],
            tips: [
              "For 2-year CI vs SI difference, use the formula directly",
              "CI calculations are faster with fractions: 10% = 1/10, so multiply by 11/10",
              "For 3+ years, use the formula rather than step-by-step"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Ratio & Proportion",
            subtopics: ["Basic Ratio", "Proportion", "Partnership", "Mixtures"],
            notes: [
              "Ratio compares two quantities: a:b = a/b",
              "Proportion: a:b = c:d → ad = bc",
              "Partnership: profit sharing proportional to investment × time",
              "Mixtures: Alligation method for mixing two quantities"
            ],
            formulas: [
              "If a:b = c:d then ad = bc",
              "If A:B = m:n and B:C = p:q, then A:B:C = mp:np:nq",
              "Partnership profit: Share ∝ Investment × Time",
              "Alligation: (Mean - Cheaper)/(Dearer - Mean) = Quantity of Cheaper/Quantity of Dearer"
            ],
            examples: [
              { q: "If A:B = 2:3, B:C = 4:5, find A:C", a: "8:15 (A:C = 2×4 : 3×5 = 8:15)" },
              { q: "A invests 2000 for 6 months, B invests 3000 for 4 months. Profit ratio?", a: "1:1 (2000×6 : 3000×4 = 12000:12000 = 1:1)" },
              { q: "Mix 20 Rs/kg and 30 Rs/kg to get 25 Rs/kg. Ratio?", a: "1:1 (Alligation: 5:5 = 1:1)" }
            ],
            tips: [
              "Convert all quantities to same unit before comparing",
              "In partnership, multiply investment by time, not just investment",
              "Alligation is the fastest method for mixture problems"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Time & Work",
            subtopics: ["Basic Work", "Pipes & Cisterns", "Efficiency", "Alternate Days"],
            notes: [
              "Work = Rate × Time. Rate is work done per unit time",
              "If A takes x days, A's 1-day work = 1/x",
              "If A is 2x efficient than B, A takes half the time of B",
              "Pipes: inlet fills + rate, outlet empties - rate"
            ],
            formulas: [
              "A's 1-day work = 1/T where T = days A takes alone",
              "(A+B)'s 1-day work = 1/A + 1/B",
              "Time taken by A+B together = 1/(1/A + 1/B) = AB/(A+B)",
              "If A is n times efficient than B: A takes 1/n time of B",
              "Pipe & Cistern: Net work = Inlet rate - Outlet rate"
            ],
            examples: [
              { q: "A takes 10 days, B takes 15 days. Together?", a: "6 days (10×15/(10+15) = 150/25 = 6)" },
              { q: "Pipe A fills in 6 hrs, Pipe B fills in 8 hrs. Together?", a: "24/7 hrs (6×8/(6+8) = 48/14 = 24/7)" },
              { q: "A is 2x efficient as B. If B takes 12 days, A+B take?", a: "4 days (A takes 6 days, together = 6×12/(6+12) = 72/18 = 4)" }
            ],
            tips: [
              "Convert everything to \"work per unit time\"",
              "For pipes, inlet = positive, outlet = negative",
              "Efficiency is inversely proportional to time"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Time, Speed & Distance",
            subtopics: ["Basic TSD", "Relative Speed", "Trains", "Boats & Streams"],
            notes: [
              "Speed = Distance/Time. Distance = Speed × Time",
              "Relative speed (same direction) = |S₁ - S₂|",
              "Relative speed (opposite direction) = S₁ + S₂",
              "Boat upstream = Boat speed - Stream speed",
              "Boat downstream = Boat speed + Stream speed"
            ],
            formulas: [
              "Speed = Distance/Time",
              "Average Speed = Total Distance/Total Time",
              "Relative speed (same direction) = u - v",
              "Relative speed (opposite) = u + v",
              "Downstream speed = b + s",
              "Upstream speed = b - s",
              "Speed of boat = (Downstream + Upstream)/2",
              "Speed of stream = (Downstream - Upstream)/2"
            ],
            examples: [
              { q: "Distance 300 km, time 5 hrs. Speed?", a: "60 km/hr (300/5 = 60)" },
              { q: "Two trains 100m & 120m at 60 & 40 km/hr opposite. Crossing time?", a: "7.92 sec (Total distance = 220m, relative speed = 100 km/hr = 27.78 m/s, time = 220/27.78)" },
              { q: "Boat speed 10 km/hr, stream 2 km/hr. Downstream speed?", a: "12 km/hr (10+2=12)" }
            ],
            tips: [
              "Convert m/s to km/hr: multiply by 18/5",
              "Convert km/hr to m/s: multiply by 5/18",
              "For trains, add lengths when crossing each other"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Algebra",
            subtopics: ["Basic Algebra", "Polynomials", "Linear Equations", "Quadratic Equations"],
            notes: [
              "Algebra deals with variables and mathematical operations",
              "Polynomials: expressions with multiple terms",
              "Linear equations: degree 1, can solve with substitution/elimination",
              "Quadratic equations: degree 2, solved by factorization or formula"
            ],
            formulas: [
              "(a+b)² = a² + 2ab + b²",
              "(a-b)² = a² - 2ab + b²",
              "a² - b² = (a+b)(a-b)",
              "(a+b)³ = a³ + 3a²b + 3ab² + b³",
              "(a-b)³ = a³ - 3a²b + 3ab² - b³",
              "a³ + b³ = (a+b)(a²-ab+b²)",
              "a³ - b³ = (a-b)(a²+ab+b²)",
              "Quadratic formula: x = [-b ± √(b²-4ac)]/2a"
            ],
            examples: [
              { q: "If x + 1/x = 5, find x² + 1/x²", a: "23 (Square: x²+2+1/x²=25 → x²+1/x²=23)" },
              { q: "Solve: 2x + 3y = 13, 3x - y = 3", a: "x=2, y=3" },
              { q: "Find roots: x² - 5x + 6 = 0", a: "x=2, 3" }
            ],
            tips: [
              "Memorize the basic identities — they save time",
              "For simultaneous equations, elimination is often faster than substitution",
              "Check your answers by substituting back"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Geometry & Mensuration",
            subtopics: ["Lines & Angles", "Triangles", "Circles", "Area", "Volume"],
            notes: [
              "Geometry: properties of shapes, angle relationships",
              "Mensuration: calculating area, perimeter, volume of 2D/3D shapes",
              "Triangles: Pythagoras theorem, similarity, congruence",
              "Circles: radius, diameter, chord, tangent, sector"
            ],
            formulas: [
              "Pythagoras: a² + b² = c² (right triangle)",
              "Area of triangle = ½ × base × height",
              "Area of circle = πr², Circumference = 2πr",
              "Area of rectangle = l × b, Perimeter = 2(l+b)",
              "Volume of cuboid = l × b × h",
              "Volume of cylinder = πr²h",
              "Volume of sphere = (4/3)πr³",
              "Sum of interior angles of polygon = (n-2)×180°"
            ],
            examples: [
              { q: "Find area of triangle with base 10cm, height 8cm", a: "40 cm² (½×10×8=40)" },
              { q: "Find area of circle with radius 7cm", a: "154 cm² (π×7²=154)" },
              { q: "Find volume of cylinder r=5cm, h=10cm", a: "785 cm³ (π×25×10=785)" }
            ],
            tips: [
              "Draw diagrams for geometry problems",
              "Memorize common Pythagorean triplets: 3-4-5, 5-12-13, 7-24-25, 8-15-17",
              "π = 22/7 for approximations, 3.14 for more precision"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Trigonometry",
            subtopics: ["Basic Ratios", "Identities", "Heights & Distances"],
            notes: [
              "Trigonometry deals with relationships between angles and sides of triangles",
              "Six main ratios: sin, cos, tan, cosec, sec, cot",
              "Heights & Distances: using angle of elevation/depression"
            ],
            formulas: [
              "sin θ = Opposite/Hypotenuse",
              "cos θ = Adjacent/Hypotenuse",
              "tan θ = Opposite/Adjacent",
              "sin²θ + cos²θ = 1",
              "1 + tan²θ = sec²θ",
              "1 + cot²θ = cosec²θ",
              "sin(90°-θ) = cos θ, cos(90°-θ) = sin θ",
              "tan(90°-θ) = cot θ",
              "Values: sin 0°=0, sin 30°=½, sin 45°=1/√2, sin 60°=√3/2, sin 90°=1"
            ],
            examples: [
              { q: "If sin A = 3/5, find cos A", a: "4/5 (from sin²+cos²=1, cosA=√(1-9/25)=4/5)" },
              { q: "Find value of sin 30° cos 60° + cos 30° sin 60°", a: "1 (½×½+√3/2×√3/2 = ¼+¾=1)" }
            ],
            tips: [
              "Memorize the standard angle values (0°, 30°, 45°, 60°, 90°)",
              "Use the identity sin²θ+cos²θ=1 frequently",
              "Heights & Distances: draw a diagram with angle of elevation/depression"
            ],
            practiceLink: "../mental.html"
          },
          {
            name: "Data Interpretation",
            subtopics: ["Tables", "Bar Graphs", "Pie Charts", "Line Graphs"],
            notes: [
              "DI tests ability to read, interpret, and analyze data from charts",
              "Tables: rows and columns with numerical data",
              "Bar graphs: compare quantities across categories",
              "Pie charts: show proportional distribution (percentages)",
              "Line graphs: show trends over time"
            ],
            formulas: [
              "Percentage = (Part/Total) × 100",
              "Ratio = Value₁ / Value₂",
              "Percentage change = (New - Old)/Old × 100",
              "Average = Sum of values / Number of values"
            ],
            examples: [
              { q: "In a pie chart, sector angle of 90° represents what %?", a: "25% (90/360 × 100 = 25%)" },
              { q: "If sales in 2020 = 200, 2021 = 250, what is % increase?", a: "25% (50/200 × 100 = 25%)" }
            ],
            tips: [
              "Read the axis labels and units carefully before solving",
              "Estimate answers when possible — exact calculation may not be needed",
              "For pie charts, convert angles to percentages: Angle/360 × 100"
            ],
            practiceLink: "../mental.html"
          }
        ]
      },
      {
        title: "English Comprehension",
        topics: [
          {
            name: "Grammar",
            subtopics: ["Tenses", "Articles", "Prepositions", "Subject-Verb Agreement"],
            notes: [
              "Tenses: Present (Simple, Continuous, Perfect, Perfect Continuous)",
              "Articles: A/An (indefinite), The (definite)",
              "Prepositions: in, on, at, for, since, by, with, of, to",
              "Subject-Verb Agreement: singular subject → singular verb",
              "Conditional sentences: If + present → will + base verb"
            ],
            formulas: [
              "Present Simple: Subject + V1 (+ s/es for he/she/it)",
              "Past Simple: Subject + V2 (past form)",
              "Future: Subject + will + V1",
              "Present Perfect: Subject + has/have + V3",
              "A/An: 'An' before vowel sound (a, e, i, o, u sound)"
            ],
            examples: [
              { q: "She ___ to school every day. (go)", a: "goes (Present Simple, she → goes)" },
              { q: "They ___ already ___ dinner. (eat)", a: "have eaten (Present Perfect)" },
              { q: "Fill: ___ apple a day keeps ___ doctor away.", a: "An, the (An apple, the doctor)" }
            ],
            tips: [
              "Identify the tense from time words (yesterday→past, tomorrow→future)",
              "Articles: 'the' for specific references, 'a/an' for general",
              "Subject-Verb: ignore phrases between subject and verb"
            ]
          },
          {
            name: "Vocabulary",
            subtopics: ["Synonyms", "Antonyms", "Idioms & Phrases", "One-Word Substitution"],
            notes: [
              "Synonyms: words with same/similar meaning",
              "Antonyms: words with opposite meaning",
              "Idioms: fixed phrases with figurative meaning",
              "One-word substitution: describing a concept in one word"
            ],
            examples: [
              { q: "Synonym of 'Abundant'", a: "Plentiful" },
              { q: "Antonym of 'Benevolent'", a: "Malevolent / Cruel" },
              { q: "Idiom: 'Burning the midnight oil' means?", a: "Working late at night" },
              { q: "One who looks at the bright side?", a: "Optimist" }
            ],
            tips: [
              "Read editorials daily — best way to build vocabulary",
              "Learn 5 new words daily with their usage",
              "Idioms are best remembered in context, not in isolation"
            ]
          },
          {
            name: "Reading Comprehension",
            subtopics: ["Passage Reading", "Fact-based Questions", "Inference Questions"],
            notes: [
              "RC tests reading speed and comprehension accuracy",
              "Read the passage quickly first, then read questions",
              "Fact-based questions have direct answers in text",
              "Inference questions require understanding implicit meaning",
              "Vocabulary questions test words in context"
            ],
            tips: [
              "Read the first and last paragraph for main idea",
              "Don't spend more than 5-6 minutes per passage",
              "Eliminate extreme options (always, never, all)",
              "For tone questions: positive, negative, neutral, critical"
            ]
          },
          {
            name: "Cloze Test",
            subtopics: ["Fill in the Blanks", "Context-based filling"],
            notes: [
              "Cloze test: passage with missing words, choose correct option",
              "Test grammar (articles, prepositions, tenses) in context",
              "Test vocabulary (appropriate word for the context)",
              "Read the entire sentence before choosing an answer"
            ],
            tips: [
              "Read the full passage once before filling blanks",
              "Check if the blank needs a grammatical word or vocabulary word",
              "Eliminate obviously wrong options first"
            ]
          },
          {
            name: "Error Spotting",
            subtopics: ["Grammar Errors", "Subject-Verb Errors", "Preposition Errors"],
            notes: [
              "Find the part of the sentence with grammatical error",
              "Common errors: subject-verb agreement, tense, preposition",
              "Check noun-pronoun agreement, article usage",
              "Correlative conjunctions: either...or, neither...nor"
            ],
            examples: [
              { q: "Find error: She don't like coffee.", a: "don't → doesn't (Subject 'She' needs 'doesn't')" },
              { q: "Find error: I have been working here since three years.", a: "since → for ('for' with duration, 'since' with point in time)" }
            ],
            tips: [
              "Read the sentence aloud — errors often sound wrong",
              "Check subject-verb agreement first",
              "Check tense consistency throughout the sentence"
            ]
          },
          {
            name: "Para Jumbles",
            subtopics: ["Sentence Ordering", "Paragraph Reconstruction"],
            notes: [
              "Para jumbles: arrange sentences in logical order to form a paragraph",
              "Find the opening sentence (introduces topic)",
              "Look for connecting words: however, therefore, firstly, finally",
              "Pronouns (it, they, this) usually refer to something mentioned earlier"
            ],
            tips: [
              "Identify the opening sentence — usually introduces the topic",
              "Sentences with 'the' (definite) usually come after introduction",
              "Connect sentences using pronouns and transition words",
              "Read the final arrangement to check logical flow"
            ]
          },
          {
            name: "Active-Passive Voice",
            subtopics: ["Tense Conversion", "Modal Verbs", "Imperative Sentences"],
            notes: [
              "Active: Subject does the action. Passive: Subject receives the action",
              "Passive = be verb (conjugated) + past participle (V3)",
              "Only transitive verbs (with object) can be made passive",
              "Preposition 'by' introduces the doer in passive voice"
            ],
            formulas: [
              "Present Simple: is/am/are + V3",
              "Past Simple: was/were + V3",
              "Future: will be + V3",
              "Present Continuous: is/am/are + being + V3",
              "Present Perfect: has/have + been + V3",
              "Modal: modal + be + V3 (e.g., can be done)"
            ],
            examples: [
              { q: "Active: She writes a letter. → Passive?", a: "A letter is written by her." },
              { q: "Active: The chef cooked dinner. → Passive?", a: "Dinner was cooked by the chef." },
              { q: "Active: They will build a bridge. → Passive?", a: "A bridge will be built by them." }
            ],
            tips: [
              "Identify the tense of the active sentence first",
              "The object of active becomes subject of passive",
              "Not all sentences can be made passive (intransitive verbs)"
            ]
          }
        ]
      }
    ]
  },
  "upsc": {
    name: "UPSC Civil Services Prelims",
    icon: "🏛️",
    sections: [
      {
        title: "General Studies Paper 1",
        topics: [
          { name: "Indian History", subtopics: ["Ancient India", "Medieval India", "Modern India (1857-1947)", "Post Independence"], notes: ["Ancient: Indus Valley Civilization, Vedic Period, Mauryan & Gupta Empires", "Medieval: Delhi Sultanate, Mughal Empire, Bhakti & Sufi Movements", "Modern: British Expansion, Revolt of 1857, National Movement, Partition", "Focus on cultural aspects, architecture, and administrative systems"], tips: ["NCERT Class 6-12 History is essential reading", "Create timelines for major events and dynasties", "Focus on causes and effects, not just dates", "Connect historical events with current developments"] },
          { name: "Indian Geography", subtopics: ["Physical Geography", "Human Geography", "Economic Geography", "World Geography"], notes: ["Physical: Mountains (Himalayas), Rivers (Indus-Ganga-Brahmaputra), Climate (Monsoon)", "Human: Population distribution, Migration patterns, Urbanization", "Economic: Agriculture (Green Revolution), Industries (Industrial Corridors)", "World: Major continents, Oceans, Important straits & channels"], formulas: ["Monsoon onset: Normally June 1 (Kerala) to July 15 (entire India)", "Rainfall: Western Ghats windward 250-400cm, leeward 60-80cm"], tips: ["Use maps extensively for physical features", "Understand monsoon mechanism (ITCZ, El Niño, La Niña)", "Practice map-based questions daily"] },
          { name: "Indian Polity", subtopics: ["Constitution", "Parliament", "Executive", "Judiciary", "Federal System"], notes: ["Constitution: Preamble, Fundamental Rights (Articles 12-35), DPSP (36-51)", "Parliament: Lok Sabha (543 seats), Rajya Sabha (245), Legislative Process", "Executive: President (Elected), PM (Appointed), Council of Ministers", "Judiciary: Supreme Court (31 judges), High Courts, PIL, Judicial Review", "Federal System: Union-State relations, 7th Schedule (Union, State, Concurrent)"], examples: [{q: "Which article deals with the President's impeachment?", a: "Article 61"}], tips: ["Read the Constitution bare act for key articles", "Focus on recent constitutional amendments and SC judgments"] },
          { name: "Indian Economy", subtopics: ["Basic Concepts", "Banking", "Budget", "Planning", "Sectors"], notes: ["Basic: GDP, GNP, Inflation (CPI/WPI), Fiscal Deficit", "Banking: RBI functions, CRR (4.5%), SLR (18%), Repo Rate", "Budget: Revenue vs Capital, Fiscal Deficit target (3% of GDP)", "Planning: NITI Aayog (replaced Planning Commission, 2015)", "Sectors: Agriculture (15% GDP), Industry (26%), Services (59%)"], formulas: ["GDP = C + I + G + (X-M)", "Fiscal Deficit = Total Expenditure - Total Receipts (excl. borrowings)", "Inflation Rate = (CPI_current - CPI_prev) / CPI_prev × 100"], tips: ["Follow Economic Survey and Budget documents", "Understand basic economic terms, not just definitions"] },
          { name: "Environment & Ecology", subtopics: ["Ecology Concepts", "Biodiversity", "Climate Change", "Environmental Laws"], notes: ["Ecology: Ecosystems, Food Chains (10% energy transfer), Biogeochemical Cycles", "Biodiversity: National Parks (106), Wildlife Sanctuaries (567), Biosphere Reserves (18)", "Climate Change: GHG emissions, IPCC reports, COP summits, India's NDCs", "Laws: Environment Protection Act 1986, Wildlife Protection Act 1972"], tips: ["Refer to Environment section in India Year Book", "Follow environmental news and reports (UNEP, WMO)"] },
          { name: "Science & Technology", subtopics: ["Physics", "Chemistry", "Biology", "Space Tech", "Defense Tech"], notes: ["Physics: Light, Sound, Nuclear Physics basics", "Chemistry: Elements, Compounds, Chemical Reactions basics", "Biology: Human body systems, Diseases, Nutrition basics", "Space Tech: ISRO missions (Chandrayaan, Gaganyaan), Satellites", "Defense: Missiles (Agni, Prithvi, Brahmos), Nuclear program"], tips: ["NCERT Science Class 6-10 is sufficient", "Focus on recent ISRO and DRDO developments"] },
          { name: "Art & Culture", subtopics: ["Architecture", "Dance Forms", "Music", "Painting", "Festivals"], notes: ["Architecture: Temple styles (Nagara, Dravida, Vesara), Cave architecture", "Dance: Classical (Bharatanatyam, Kathak, 7 others) + Folk dances", "Music: Hindustani (North) and Carnatic (South) traditions, Instruments", "Painting: Madhubani, Warli, Tanjore, Miniature painting traditions"], tips: ["Refer to NCERT Class 11 'An Introduction to Indian Art'", "Focus on UNESCO World Heritage sites in India"] },
          { name: "International Relations", subtopics: ["Bilateral Relations", "Multilateral Organizations", "Summits", "Treaties"], notes: ["Bilateral: India-US (2+2 Dialogue), India-Russia, India-China border issues", "Multilateral: UN, BRICS, SCO, G20, QUAD, ASEAN", "Summits: BIMSTEC, IBSA, India-Africa Forum", "Treaties: Paris Agreement, Kyoto Protocol, Nuclear Deal"], tips: ["Follow The Hindu newspaper's International section", "Create a matrix of India's relations with major countries"] }
        ]
      },
      {
        title: "CSAT Paper 2",
        topics: [
          { name: "Reading Comprehension", notes: ["Read passages on diverse topics (history, science, philosophy)", "Identify main idea, tone, and inference from passages", "Focus on CSAT-specific passages (not too technical)", "Practice time management - 20-25 min for 27 questions"], tips: ["Read the questions before the passage to know what to look for", "Eliminate extreme answer choices (always, never, all)", "Practice with a timer - 8-9 minutes per passage set"] },
          { name: "Logical Reasoning", subtopics: ["Analytical Reasoning", "Decision Making", "Critical Reasoning"], notes: ["Analytical: Arrangements, Puzzles, Series, Analogies", "Decision Making: Real-life situations, choosing best option", "Critical: Assumptions, Strengthening/Weakening arguments", "Focus on ethical decision-making (UPSC specific)"], tips: ["UPSC Decision Making has ethical dimension - avoid extreme options", "Draw diagrams for arrangement questions"] },
          { name: "Basic Numeracy", subtopics: ["Arithmetic", "Algebra", "Geometry", "Data Interpretation"], notes: ["Arithmetic: Percentages, Ratio, Profit/Loss, SI/CI, Time/Speed/Distance", "Algebra: Linear equations, Quadratic, Inequalities", "Geometry: Triangles (Pythagoras), Circles, Mensuration", "DI: Bar graphs, Pie charts, Tables, Line graphs"], formulas: ["SI = P×R×T/100", "CI = P(1+R/100)^T - P", "Speed = Distance/Time", "Average = Sum/Count"], tips: ["CSAT math is Class 10 level - NCERT is sufficient", "DI questions are time-consuming - practice speed calculation"] }
        ]
      }
    ]
  },
  "ibps-po": {
    name: "IBPS PO",
    icon: "🏦",
    sections: [
      {
        title: "Reasoning Ability",
        topics: [
          { name: "Syllogism", notes: ["All/most/some statements, Venn diagram approach", "Only A are B = All B are A", "Can't determine type questions are common", "Focus on 3-4 statement syllogisms"], examples: [{q: "All pens are pencils. Some pencils are erasers. Conclusions: I. Some pens are erasers. II. Some erasers are pencils.", a: "Only II follows"}], tips: ["Use Venn diagrams to solve systematically", "Try 'either-or' cases carefully"] },
          { name: "Inequality", notes: ["Coded inequalities using >, <, =, ≥, ≤", "Based on single statement or 2-3 combined statements", "Usually 4-5 question sets from 1-2 statements"], formulas: ["A > B > C → A > C (transitive)", "A ≥ B > C → A > C", "A > B = C ≥ D → can't determine A vs D"], tips: ["Combine all inequalities into one chain", "Mark 'can't determine' when direction is unclear"] },
          { name: "Puzzles & Seating", subtopics: ["Circular", "Linear", "Floor-based", "Comparison"], notes: ["Circular: Inward/outward facing, neighbors, opposite", "Linear: Row arrangement, ends, immediate neighbors", "Floor: People on different floors of a building", "Comparison: Height, weight, marks ranking"], tips: ["Draw diagrams with entity initials", "Start with direct clues first", "Negative clues (NOT) are often most useful"] },
          { name: "Coding-Decoding", notes: ["Letter/number/symbol substitution", "New pattern of coded directions or relations", "Usually 5 questions from one coding scheme"], tips: ["Write down the pattern mapping explicitly", "Look for shift patterns (forward/backward in alphabet)"] },
          { name: "Data Sufficiency", notes: ["Decide if given statements are sufficient to answer", "5 standard options (A alone, B alone, Both, Either, Neither)", "Common topics: ages, numbers, relationships, directions"], tips: ["Check if statement A gives unique answer first", "Don't carry information from A to B when checking B alone"] }
        ]
      },
      {
        title: "Quantitative Aptitude",
        topics: [
          { name: "Simplification", notes: ["BODMAS rule, approximation questions", "Square roots, cube roots, surds & indices", "Follow the order: Brackets, Orders, Division, Multiplication, Addition, Subtraction"], formulas: ["(a+b)² = a²+2ab+b²", "(a-b)² = a²-2ab+b²", "a²-b² = (a-b)(a+b)", "(a+b)³ = a³+3a²b+3ab²+b³"], tips: ["Practice mental calculation speed", "Learn squares up to 30 and cubes up to 15"] },
          { name: "Number System", subtopics: ["LCM & HCF", "Fractions", "Divisibility", "Remainders"], notes: ["LCM by prime factorization / division method", "HCF is highest common factor", "Divisibility rules: 2 (even), 3 (sum digits ÷3), 5 (ends 0/5)", "Remainder theorem: f(x) ÷ (x-a) has remainder f(a)"], examples: [{q: "Find LCM of 24, 36, 40", a: "360 (24=2³×3, 36=2²×3², 40=2³×5 → 2³×3²×5=360)"}], tips: ["For LCM/HCF word problems, identify if it's LCM (next occurrence) or HCF (maximum division)"] },
          { name: "Percentage", notes: ["Percentage change, successive percentage change", "Population based problems with increase/decrease", "Profit/Loss/Discount as percentage"], formulas: ["x% of y = y% of x", "Successive % change: a + b + ab/100", "Percentage = (Part/Whole)×100"], tips: ["Use fraction equivalents: 33⅓%=1/3, 12½%=1/8", "For successive discounts, calculate sequentially"] },
          { name: "Data Interpretation", subtopics: ["Bar Graph", "Pie Chart", "Table DI", "Line Graph"], notes: ["Read data carefully, check units (₹, %, thousands)", "Combination DI (bar+line) is common", "Usually 2-3 DI sets with 5 questions each", "Focus on ratio, percentage change, average questions"], tips: ["Approximate when options have large gaps", "Read axis labels and units carefully, it saves time"] }
        ]
      },
      {
        title: "English Language",
        topics: [
          { name: "Reading Comprehension", notes: ["2-3 passages from diverse topics (economy, tech, social)", "Theme-based questions, inference, vocabulary in context", "Usually 7-10 questions total from all passages"], tips: ["Skim the passage first, then read questions, then read relevant portions", "For vocabulary questions, use context clues in the passage"] },
          { name: "Cloze Test", notes: ["Passage with 5-10 blanks, choose correct word", "Tests grammar (prepositions, articles) and vocabulary (context-appropriate words)", "Read the complete passage once before filling blanks"], tips: ["Eliminate options that don't fit grammatically first", "Read the sentence before and after the blank for context"] },
          { name: "Error Spotting", subtopics: ["Grammar Errors", "Phrase Replacement"], notes: ["Find which part (A/B/C/D) has grammatical error", "Common: Subject-verb agreement, tense mismatch, wrong preposition", "Phrase replacement: choose correct replacement for underlined part"], examples: [{q: "The committee / have decided / to implement / the new rules.", a: "Error in part B - 'have' should be 'has' (committee is singular)"}], tips: ["Check subject-verb agreement first", "Look for incorrect prepositions, articles, and tense"] },
          { name: "Para Jumbles", notes: ["Arrange sentences A-B-C-D-E in correct order", "Usually 1-2 questions", "Look for opening sentence (introduces topic with broad statement)"], tips: ["Find the opening sentence using noun introduction pattern", "Connect sentences using pronouns (it, they, this) and transition words"] }
        ]
      },
      {
        title: "Banking & Financial Awareness",
        topics: [
          { name: "Indian Banking System", notes: ["RBI: Central Bank (est. 1935, nationalized 1949)", "Commercial Banks: Public (SBI, PNB), Private (HDFC, ICICI), Foreign", "Regional Rural Banks (RRBs) - 43 RRBs, Cooperative Banks", "Small Finance Banks (Airtel, Fino) and Payment Banks"], tips: ["Follow RBI's Monetary Policy Committee decisions", "Know the current RBI Governor, Repo Rate, CRR, SLR"] },
          { name: "Financial Terms", notes: ["CRR (4.5%): portion of deposits kept with RBI", "SLR (18%): portion kept in approved securities", "Repo Rate: RBI lends to banks (currently ~6.50%)", "Reverse Repo: RBI borrows from banks", "MSF: 25 bps above repo rate"], tips: ["Current rates change - update from monthly bulletin", "Understand the difference between CRR and SLR"] },
          { name: "Government Schemes", notes: ["Pradhan Mantri Jan Dhan Yojana (2014) - financial inclusion", "PM Kisan Samman Nidhi - ₹6000/year to farmers", "Ayushman Bharat - health cover ₹5 lakh/family", "Stand-Up India - loans to SC/ST and women entrepreneurs", "Startup India - tax benefits, fund of funds ₹10,000 Cr"], tips: ["Focus on launch year, budget allocation, and target beneficiaries"] }
        ]
      },
      {
        title: "General Awareness",
        topics: [
          { name: "Current Affairs", notes: ["Focus on last 6 months for banking exams", "National: Budget (Feb 1), Economic Survey, Bills & Acts", "International: Summits (G20, BRICS), Trade agreements", "Sports: Major tournaments (Cricket WC, Olympics, Asian Games)", "Awards: Padma awards, Nobel prizes, Booker, Oscar"], tips: ["Read monthly current affairs compilations", "Create short notes of important events"] },
          { name: "Static GK", subtopics: ["Indian Constitution", "Geography", "Science Basics"], notes: ["Constitution: Parts, Schedules, Fundamental Rights (best for banking)", "Geography: States & Capitals, Dams, Rivers, National Parks", "Science: Inventions, Discoveries, Human body basics"] }
        ]
      }
    ]
  },
  "sbi-clerk": {
    name: "SBI Clerk",
    icon: "💰",
    sections: [
      {
        title: "Reasoning Ability",
        topics: [
          { name: "Syllogism", notes: ["3-4 statement syllogisms with definite/can't say conclusions", "Focus on: Only a few, Unless, At least statements", "Either-or case: complementary pairs (Some + No)", "Venn diagram method is fastest"], tips: ["Practice both possibility and definite cases", "Mark 'Either-or' only when both individual are false/pair is complementary"] },
          { name: "Puzzles", subtopics: ["Floor Puzzles", "Comparison", "Day-based", "Month-based"], notes: ["Floor: 5-8 floors, people + professions", "Comparison: height/weight/marks ranking with directions", "Day/Month: events on different dates/days/months", "Usually 1-2 puzzle sets (10 questions)"], tips: ["Draw tables with floors and fill as you get clues", "Negative clues help narrow down options"] },
          { name: "Inequality", notes: ["Coded inequalities (A#B means A>B type)", "Usually 4-5 questions from 2-3 statements", "Check transitive property carefully"], tips: ["Convert all symbols to standard >,<,=,≥,≤ first", "For 'can't determine', compare each variable pair-wise"] },
          { name: "Coding-Decoding", notes: ["Letter shift, number pattern, symbolic codes", "Sometimes based on word meaning (e.g., vowels replaced)", "New pattern: input-output chain coding"], tips: ["Write down the coding rule before attempting questions"] },
          { name: "Data Sufficiency", notes: ["5 standard options (A alone, B alone, Both, Either, Neither)", "Topics: age, number, money, direction", "Check for unique answer, not just possible answer"], tips: ["If A gives yes and no both, it's not sufficient"] }
        ]
      },
      {
        title: "Quantitative Aptitude",
        topics: [
          { name: "Simplification & Approximation", notes: ["BODMAS-based expression simplification", "Approximation: round numbers to nearest integer/percentage", "Find approximate value of complex expressions"], tips: ["Learn squares (1-30), cubes (1-15), square roots, cube roots", "For approximation, round to 2 significant digits"] },
          { name: "Data Interpretation", subtopics: ["Tabular DI", "Bar Graph", "Pie Chart", "Missing Data DI"], notes: ["Missing data: table with some values unknown, calculate from totals/ratios", "Usually 2 DI sets with 5 questions each", "Questions: average, percentage change, ratio, difference"], tips: ["For missing data, use total rows/columns to find unknowns first"] },
          { name: "Word Problems", subtopics: ["Profit/Loss", "SI/CI", "Time & Work", "Speed & Distance", "Mixtures"], notes: ["Profit/Loss: CP, SP, discount, successive discounts", "SI/CI: Simple for short periods, Compound for annual/half-yearly", "Time & Work: efficiency method, alternate day work", "Speed: average speed, relative speed (opposite/same direction)"], formulas: ["Profit% = (SP-CP)/CP × 100", "SI = P×R×T/100", "Work = Efficiency × Time", "Relative speed (opposite) = s₁+s₂, (same) = |s₁-s₂|", "Avg Speed = 2ab/(a+b) [equal distances]"], tips: ["For work problems, take LCM of days as total work", "For profit/loss, keep track of CP and SP clearly"] }
        ]
      },
      {
        title: "English Language",
        topics: [
          { name: "Reading Comprehension", notes: ["1-2 passages, 5-10 questions", "Theme, inference, vocab-in-context, title selection", "Topic: economy, banking, social issues, technology"], tips: ["Read questions first to know what to focus on in passage"] },
          { name: "Cloze Test", notes: ["7-10 blanks, passage on banking/economy", "Choose from 4 options per blank", "Grammar: prepositions, articles, conjunctions; Vocab: context words"], tips: ["Read full passage once before attempting blanks"] },
          { name: "Error Spotting", notes: ["Part-based (A/B/C/D/No error) or sentence-based", "Also: Phrase replacement (choose correct replacement for underlined)"], examples: [{q: "Neither the manager nor the employees was present.", a: "Error: 'was' should be 'were' (employees is plural, 'neither-nor' takes subject closer verb)"}], tips: ["For 'neither-nor/either-or', verb agrees with subject closer to it"] }
        ]
      },
      {
        title: "General Awareness",
        topics: [
          { name: "Banking Awareness", notes: ["SBI History: est. 1806 as Bank of Calcutta, became SBI in 1955", "SBI subsidiaries (5 → merged into SBI in 2017)", "Current SBI Chairman, headquarters (Mumbai)", "National Electronic Funds Transfer (NEFT), RTGS, IMPS, UPI", "Basel norms (Basel III capital requirements)"], tips: ["Focus on SBI-specific details and recent developments"] },
          { name: "Current Affairs", notes: ["Last 6 months national and international events", "Banking sector news: mergers, new schemes, interest rates", "Government schemes and their implementing ministries", "Sports events: results, venues, winners"] }
        ]
      }
    ]
  },
  "rbi": {
    name: "RBI Grade B",
    icon: "💵",
    sections: [
      {
        title: "Economics & Finance",
        topics: [
          { name: "Macroeconomics", subtopics: ["National Income", "Inflation", "Monetary Policy", "Fiscal Policy"], notes: ["National Income: GDP, GNP, NDP, NNP at factor cost & market price", "Inflation: CPI (new series 2012=100, base updated), WPI (2011-12=100)", "Monetary Policy: Repo (6.50%), Reverse Repo (6.25%), CRR (4.5%), SLR (18%)", "Fiscal Policy: Deficit types (Revenue, Fiscal, Primary), FRBM Act"], formulas: ["GDPmp = C + I + G + (X-M)", "GDPfc = GDPmp - Indirect Taxes + Subsidies", "Fiscal Deficit = Total Borrowings = Revenue Deficit + Capital Expenditure - Capital Receipts"], tips: ["Understand the difference between GDPmp and GDPfc clearly", "Follow RBI Monetary Policy Committee (MPC) meetings and outcomes"] },
          { name: "Indian Financial System", subtopics: ["Money Market", "Capital Market", "NBFCs", "Financial Regulators"], notes: ["Money Market: Call Money (1 day), Treasury Bills (91/182/364 days), CPs, CDs", "Capital Market: Primary (IPOs/FPOs), Secondary (Stock Exchanges: BSE, NSE)", "NBFCs: Types (Asset Finance, Investment, Loan), Regulation by RBI", "Regulators: RBI (banking), SEBI (markets), IRDAI (insurance), PFRDA (pensions)"], tips: ["Know the difference between money market and capital market instruments"] },
          { name: "International Economics", subtopics: ["Balance of Payments", "Forex", "Trade Policy", "WTO/IMF/WB"], notes: ["BoP: Current Account (trade + services + transfers) + Capital Account (FDI, FII, loans)", "Forex: Exchange rate regimes (fixed, floating, managed float)", "Forex Reserves: ~$600B (as of 2024), components (FCY, Gold, SDRs)", "IMF: SDR basket, surveillance, lending programs", "World Bank: IBRD, IDA, IFC, MIGA"], tips: ["Follow INR movement against USD and factors affecting it"] },
          { name: "Money & Banking", subtopics: ["Money Supply", "Credit Creation", "Banking Technology", "Financial Inclusion"], notes: ["Money Supply: M1 (currency + demand deposits), M3 (M1 + time deposits)", "Credit Creation: Money multiplier = 1/CRR, max credit = deposits × multiplier", "Banking Tech: UPI (NPCI), NEFT (half-hourly batches), RTGS (real-time)", "Financial Inclusion: PMJDY, BC model, differentiated banks"], formulas: ["Money Multiplier = 1/CRR", "Total Credit Creation = Initial Deposit × (1/CRR)"], tips: ["Understand how banks create credit through the multiplier"] },
          { name: "Growth & Development", subtopics: ["Economic Growth", "Human Development", "SDGs", "Poverty & Inequality"], notes: ["Growth: GDP growth rate, factors of production, TFP", "HDI: India rank ~134 (2024), components: life expectancy, education, income", "SDGs: 17 goals (2030), India SDG Index score ~67", "Poverty: Multidimensional Poverty Index (MPI), Gini Coefficient"] }
        ]
      },
      {
        title: "Reasoning & Quant",
        topics: [
          { name: "Quantitative Aptitude", subtopics: ["Data Interpretation", "Profit & Loss", "SI/CI", "Time & Work"], notes: ["DI: Multiple graphs, case study DI with economics context", "Same formulas as SSC CGL but with focus on speed", "Data Sufficiency questions are common"], tips: ["RBI DI sets often have financial data contexts"] },
          { name: "Logical Reasoning", subtopics: ["Puzzles", "Syllogism", "Input-Output", "Critical Reasoning"], notes: ["Puzzles: 2-3 sets with 10 questions", "Input-Output: step-based arrangement, often number/word pattern", "Critical Reasoning: strengthening/weakening arguments, assumptions"] }
        ]
      },
      {
        title: "English",
        topics: [
          { name: "Reading Comprehension", notes: ["2-3 passages, economic/financial themes", "Vocabulary in context, inference, main idea questions"], tips: ["Read economic editorials regularly (The Hindu, Economic Times)"] },
          { name: "Grammar & Usage", subtopics: ["Error Spotting", "Para Jumbles", "Fill in the Blanks"], notes: ["Error spotting in sentences", "Para jumbles with economic/formal context", "Fill blanks with appropriate words (grammar + vocab)"] }
        ]
      }
    ]
  },
  "jee": {
    name: "JEE Main & Advanced",
    icon: "⚛️",
    sections: [
      {
        title: "Physics",
        topics: [
          { name: "Mechanics", subtopics: ["Kinematics", "Laws of Motion", "Work-Energy", "Rotation", "Gravitation"], notes: ["Kinematics: Equations of motion, Projectile motion (max height, range, time of flight)", "Laws: Newton's laws, Friction (static/kinetic), Circular motion", "Work-Energy: KE=½mv², PE=mgh, Conservation of mechanical energy", "Rotation: Moment of inertia (ring, disc, sphere), Torque = Iα, Angular momentum", "Gravitation: F=GM₁M₂/r², Escape velocity, Kepler's laws"], formulas: ["v = u + at, s = ut + ½at², v² = u² + 2as", "Projectile: R = u²sin2θ/g, H = u²sin²θ/2g, T = 2usinθ/g", "Centripetal force: mv²/r", "KE(rot) = ½Iω²", "Escape velocity = √(2GM/R)"], tips: ["Master vector resolution (sin/cos components) for all mechanics problems", "Free body diagram is the most important first step for any mechanics problem"] },
          { name: "Electrodynamics", subtopics: ["Electrostatics", "Current Electricity", "Magnetism", "EMI & AC"], notes: ["Electrostatics: Coulomb's law, Electric field, Potential, Capacitors", "Current: Ohm's law, Kirchhoff's laws, Wheatstone bridge, Potentiometer", "Magnetism: Biot-Savart law, Ampere's law, Lorentz force", "EMI: Faraday's law (ε = -dφ/dt), Lenz's law, AC circuits"], formulas: ["F = kq₁q₂/r²", "V = IR", "Capacitance: C = ε₀A/d", "RC Circuit: τ = RC"], tips: ["Kirchhoff's laws work for any complex circuit - practice nodal analysis"] },
          { name: "Thermodynamics", subtopics: ["Laws", "Heat Transfer", "Kinetic Theory"], notes: ["1st Law: ΔU = Q - W, 2nd Law: Entropy always increases", "Processes: Isothermal, Adiabatic, Isobaric, Isochoric", "Heat transfer: Conduction (kAΔT/L), Convection, Radiation (Stefan-Boltzmann)"], formulas: ["PVγ = constant (adiabatic)", "Efficiency of heat engine = 1 - T₂/T₁", "Stefan-Boltzmann: P = εσAT⁴"], tips: ["All processes are represented on PV diagrams - practice sketching them"] },
          { name: "Optics & Modern Physics", subtopics: ["Ray Optics", "Wave Optics", "Dual Nature", "Nuclear Physics"], notes: ["Ray: Lens formula, Mirror formula, Prism deviation", "Wave: Young's double slit (fringe width = λD/d), Diffraction, Polarization", "Modern: Photoelectric effect (hf = φ + KE), Bohr model, X-rays", "Nuclear: Radioactivity (N = N₀e⁻λt), Fission, Fusion"], formulas: ["Lens formula: 1/f = 1/v - 1/u", "Magnification: m = v/u", "fringe width β = λD/d"], tips: ["Sign convention is critical in optics - follow Cartesian sign convention consistently"] }
        ]
      },
      {
        title: "Chemistry",
        topics: [
          { name: "Physical Chemistry", subtopics: ["Mole Concept", "Thermodynamics", "Chemical Kinetics", "Equilibrium"], notes: ["Mole: % composition, Empirical/Molecular formula, Limiting reagent", "Thermo: Enthalpy, Entropy, Gibbs free energy (ΔG = ΔH - TΔS)", "Kinetics: Rate laws, Order of reactions, Arrhenius equation", "Equilibrium: Kc, Kp, Le Chatelier's principle"], formulas: ["Moles = Mass/Molar Mass", "Nₐ = 6.022×10²³", "Arrhenius: k = Ae⁻Ea/RT", "ΔG° = -RT lnK"], tips: ["Unit conversion (atm to Pa, L to m³) is important - practice consistently"] },
          { name: "Organic Chemistry", subtopics: ["General Organic", "Hydrocarbons", "Functional Groups", "Reaction Mechanisms"], notes: ["GOC: IUPAC nomenclature, Isomerism (structural + stereo), Inductive/Resonance effects", "Hydrocarbons: Alkanes (substitution), Alkenes (addition), Alkynes", "Functional: Alcohols, Aldehydes, Ketones, Carboxylic acids, Amines", "Mechanisms: SN1/SN2, E1/E2, Electrophilic substitution"], tips: ["Learn named reactions (Aldol, Cannizzaro, Friedel-Crafts) with mechanisms"] },
          { name: "Inorganic Chemistry", subtopics: ["Periodic Table", "Chemical Bonding", "Coordination", "Metallurgy"], notes: ["Periodicity: Atomic radius, IE, EN trends across periods and groups", "Bonding: VBT, VSEPR theory (molecular shapes), MOT", "Coordination: Ligands, Chelation, Crystal Field Theory, Isomerism in complexes", "Metallurgy: Ore types, Concentration, Extraction (pyro/hydro/electro)"], tips: ["Periodic trends can answer many inorganic questions without calculation"] }
        ]
      },
      {
        title: "Mathematics",
        topics: [
          { name: "Calculus", subtopics: ["Limits", "Differentiation", "Integration", "Differential Equations"], notes: ["Limits: L'Hôpital's rule, Standard limits (sinx/x→1, (eˣ-1)/x→1)", "Differentiation: Chain rule, Product/Quotient, Maxima/Minima", "Integration: Substitution, By parts, Definite integrals (limits, area)", "DE: Variable separable, Linear DE, Bernoulli equations"], formulas: ["d/dx(xⁿ) = nxⁿ⁻¹", "∫xⁿdx = xⁿ⁺¹/(n+1)", "∫ₐᵇf(x)dx = F(b)-F(a)"], tips: ["Master standard integration forms - most JEE problems reduce to them"] },
          { name: "Algebra", subtopics: ["Quadratic Equations", "Matrices", "Permutations", "Binomial Theorem"], notes: ["Quadratic: ax²+bx+c=0, Nature of roots (D=b²-4ac), α+β=-b/a, αβ=c/a", "Matrices: 3×3 determinant, Adjoint, Inverse, System of equations", "Permutations: nPr, nCr, Arrangements (with/without repetition)", "Binomial: (1+x)ⁿ expansion, General term, Greatest term/coefficient"], formulas: ["nPr = n!/(n-r)!", "nCr = n!/[r!(n-r)!]", "r-th term: Tᵣ₊₁ = ⁿCᵣxʳ"], tips: ["In complex numbers, learn to convert between polar and Cartesian forms quickly"] },
          { name: "Coordinate Geometry", subtopics: ["Straight Lines", "Circles", "Parabola", "Ellipse & Hyperbola"], notes: ["Lines: Slope-intercept, Distance formula, Section formula", "Circles: x²+y²+2gx+2fy+c=0, Center (-g,-f), Radius = √(g²+f²-c)", "Conics: Standard forms, Focus-Directrix property, Tangent equations"], formulas: ["Dist between points: √[(x₂-x₁)²+(y₂-y₁)²]", "Circle: (x-h)²+(y-k)²=r²"], tips: ["For conics, memorize standard parametric forms"] },
          { name: "Vector & 3D", notes: ["Vectors: Dot product (a·b = |a||b|cosθ), Cross product (|a×b| = |a||b|sinθ)", "3D: Direction cosines, Line and Plane equations, Shortest distance"], formulas: ["a·b = a₁b₁+a₂b₂+a₃b₃", "Area of triangle: ½|AB×AC|"] }
        ]
      }
    ]
  },
  "neet": {
    name: "NEET (UG)",
    icon: "🧬",
    sections: [
      {
        title: "Biology (Zoology + Botany)",
        topics: [
          { name: "Diversity in Living World", subtopics: ["Classification", "Plant Kingdom", "Animal Kingdom"], notes: ["5 Kingdom classification (Monera, Protista, Fungi, Plantae, Animalia)", "Plant: Algae, Bryophyta, Pteridophyta, Gymnosperms, Angiosperms", "Animal: Porifera to Chordata (10 phyla key characteristics)"], tips: ["Learn salient features and examples of each phylum/division", "Economic importance of each group"] },
          { name: "Cell Biology", subtopics: ["Cell Structure", "Cell Division", "Biomolecules"], notes: ["Organelles: Nucleus, Mitochondria, ER, Golgi, Ribosomes - structure & function", "Division: Mitosis (2n→2n, somatic), Meiosis (2n→n, germ cells - 8 stages)", "Biomolecules: Carbohydrates, Proteins, Lipids, Nucleic acids - structure & functions"], formulas: ["DNA: Chargaff's rule A=T, G≡C", "Central Dogma: DNA→RNA→Protein"], tips: ["Mitosis vs Meiosis differences are frequently asked"] },
          { name: "Genetics & Evolution", subtopics: ["Mendelian Genetics", "Molecular Genetics", "Evolution Theories"], notes: ["Mendel: Monohybrid (3:1), Dihybrid (9:3:3:1), Laws of inheritance", "Molecular: DNA replication, Transcription, Translation, Gene regulation (Lac operon)", "Evolution: Darwin's theory, Hardy-Weinberg principle (p²+2pq+q²=1)"], examples: [{q: "In a dihybrid cross, what's the probability of AaBb progeny?", a: "¼ × ¼ = 1/16 (Aa from Aa×Aa = 2/4=½, Bb from Bb×Bb = 2/4=½, so ½×½=¼)"}], tips: ["Punnett square practice is essential for genetics problems"] },
          { name: "Human Physiology", subtopics: ["Digestion", "Respiration", "Circulation", "Excretion", "Nervous & Endocrine"], notes: ["Digestion: Enzymes (Ptyalin→starch, Pepsin→protein), Absorption in small intestine", "Respiration: Glycolysis (cytoplasm), Krebs cycle (mitochondria), ETC", "Circulation: Heart structure, Cardiac cycle (0.8s), ECG, Blood groups (ABO, Rh)", "Excretion: Nephron structure, Urine formation, Osmoregulation", "Nervous: Neuron structure, Synaptic transmission, Brain regions"], formulas: ["Cardiac Output = Stroke Volume × Heart Rate (~5L/min)", "Blood Pressure = 120/80 mmHg (normal)"], tips: ["Draw labeled diagrams for all systems - NEET expects identification"] },
          { name: "Plant Physiology", subtopics: ["Photosynthesis", "Respiration", "Plant Hormones", "Transport"], notes: ["Photosynthesis: Light reaction (PSI, PSII) + Dark reaction (Calvin cycle)", "C3 vs C4 plants (Kranz anatomy in C4)", "Plant hormones: Auxins (growth), Gibberellins (stem elongation), ABA (stress)", "Transport: Xylem (water, transpiration pull), Phloem (food, pressure flow)"], tips: ["Blackman's law of limiting factors is important"] },
          { name: "Biotechnology", subtopics: ["Genetic Engineering", "Bioprocess Engineering", "Applications"], notes: ["rDNA technology: Restriction enzymes (EcoRI), Vectors (pBR322), Host (E. coli)", "PCR (Thermus aquaticus DNA polymerase), Gel electrophoresis", "Applications: Insulin production (Humulin), Bt cotton, Gene therapy"], tips: ["Tools of rDNA technology (enzymes, vectors, host) are NEET favorites"] },
          { name: "Ecology & Environment", subtopics: ["Ecosystems", "Biodiversity", "Environmental Issues"], notes: ["Ecosystem: Structure (producers, consumers, decomposers), Energy flow (10% rule)", "Biodiversity: Hotspots (4 in India: Western Ghats, Eastern Himalayas, etc.)", "Pollution: Air (CFCs→ozone), Water (eutrophication), Soil, Noise"] }
        ]
      },
      {
        title: "Physics",
        topics: [
          { name: "Mechanics", subtopics: ["Kinematics", "Dynamics", "Work/Energy", "Rotation"], notes: ["Kinematics: v=u+at, s=ut+½at², v²=u²+2as, Projectile motion", "Dynamics: Newton's laws, Friction (f=μN), Circular motion (F=mv²/r)", "Work-Energy: W=Fdcosθ, KE=½mv², PE=mgh, Conservation", "Rotation: I (MR²/2 for disc, 2/5 MR² for sphere), τ=Iα"], tips: ["Free body diagrams are essential for every mechanics problem"] },
          { name: "Electrodynamics", subtopics: ["Electrostatics", "Current", "Magnetism", "EMI"], notes: ["Electrostatics: Coulomb's law, E=V/d, Capacitors (parallel plate C=ε₀A/d)", "Current: Ohm's law, Kirchhoff's laws, Resistance combination", "Magnetism: Force on charged particle (F=qvB), Biot-Savart law", "EMI: Faraday's law, Lenz's law, AC generator"], tips: ["Series/parallel capacitor and resistor combinations are NEET staples"] },
          { name: "Optics", subtopics: ["Ray Optics", "Wave Optics"], notes: ["Ray: Reflection (i=r), Refraction (Snell's law n₁sini=n₂sinr), Lens formula", "Wave: Young's double slit (fringe width β=λD/d), Diffraction"], tips: ["Critical angle and total internal reflection (TIR) - NEET questions"] },
          { name: "Modern Physics", subtopics: ["Dual Nature", "Atoms", "Nuclei", "Semiconductors"], notes: ["Photoelectric effect: E=hf, KEmax=hf-φ", "Bohr model: Energy levels En=-13.6/n² eV", "Radioactivity: N=N₀e⁻λt, half-life T½=ln2/λ", "Semiconductors: p-n junction, Diode, Transistor"], tips: ["Photoelectric effect graphs (I vs V, KEmax vs f) are commonly asked"] }
        ]
      },
      {
        title: "Chemistry",
        topics: [
          { name: "Physical Chemistry", subtopics: ["Mole Concept", "Thermodynamics", "Equilibrium", "Kinetics"], notes: ["Mole: Moles=Mass/Molar mass, Nₐ=6.022×10²³, Limiting reagent", "Thermo: 1st law (ΔU=q+w), Enthalpy (ΔH=ΔU+ΔnRT), 2nd law (entropy)", "Equilibrium: Kc, Kp (Kp=Kc(RT)^Δn), pH=-log[H⁺], Buffer solution", "Kinetics: Rate=K[A]^m[B]^n, Arrhenius equation k=Ae⁻Ea/RT"], tips: ["ICE table method is essential for equilibrium problems"] },
          { name: "Organic Chemistry", subtopics: ["Hydrocarbons", "Alcohols/Phenols", "Aldehydes/Ketones", "Biomolecules"], notes: ["Hydrocarbons: Markovnikov's rule, Peroxide effect, Ozonolysis", "Alcohols: Lucas test, Oxidation (PCC→aldehyde, CrO₃→acid)", "Carbonyl: Aldol condensation, Cannizzaro reaction, Fehling test", "Biomolecules: Carbohydrates (glucose structure), Proteins (α-helix, β-sheet)"], tips: ["Name reactions with mechanisms are NEET favorites"] },
          { name: "Inorganic Chemistry", subtopics: ["Periodicity", "s/p/d-block", "Coordination"], notes: ["Periodic trends: Atomic radius, Ionization energy, Electronegativity", "s-block: Alkali/alkaline earth metals - anomalous behavior of Li and Be", "p-block: C, N, O, Halogens - properties and compounds", "Coordination: Ligands (mono/bi/polydentate), CFT, Magnetic properties"] }
        ]
      }
    ]
  },
  "gate": {
    name: "GATE (Engineering)",
    icon: "🔧",
    sections: [
      {
        title: "Engineering Mathematics",
        topics: [
          { name: "Linear Algebra", notes: ["Matrix operations: rank, determinant, inverse, eigenvalues/eigenvectors", "System of linear equations, Cayley-Hamilton theorem", "Matrix types: symmetric, orthogonal, idempotent, nilpotent"], formulas: ["det(AB) = det(A)det(B)", "tr(AB) = tr(BA)", "Characteristic eq: |A-λI| = 0"], tips: ["For eigenvalues, use sum=tr(A), product=det(A) to verify"] },
          { name: "Calculus", notes: ["Limits, continuity, differentiability", "Mean value theorems (Rolle, Lagrange, Cauchy)", "Multiple integrals (double, triple), Surface/Volume integrals", "Sequence and series: Convergence tests, Taylor/Maclaurin series"], tips: ["L'Hôpital's rule for 0/0 and ∞/∞ forms"] },
          { name: "Differential Equations", notes: ["First order: Variable separable, Exact, Linear (integrating factor)", "Higher order: Homogeneous (auxiliary eq), Particular integral", "Partial Differential Equations: Wave, Heat, Laplace equations"], tips: ["For higher order ODE with constant coefficients: use operator D method"] },
          { name: "Probability & Statistics", notes: ["Probability: Conditional, Bayes theorem, Random variables", "Distributions: Binomial, Poisson, Normal", "Statistics: Mean, Median, Mode, Variance, Standard deviation"], formulas: ["P(A|B) = P(A∩B)/P(B)", "E[X] = Σxp(x)", "Var(X) = E[X²] - (E[X])²"] },
          { name: "Numerical Methods", notes: ["Root finding: Newton-Raphson, Bisection, Secant", "Interpolation: Lagrange, Newton Forward/Backward", "Integration: Trapezoidal, Simpson's 1/3 and 3/8", "ODE: Euler, Runge-Kutta (2nd/4th order)"] }
        ]
      },
      {
        title: "General Aptitude",
        topics: [
          { name: "Verbal Ability", notes: ["English grammar, vocabulary, sentence completion", "Reading comprehension passages", "Paragraph completion, verbal analogies"], tips: ["GATE verbal questions are straightforward - basic grammar knowledge suffices"] },
          { name: "Numerical Ability", notes: ["Arithmetic: Percentages, Profit/Loss, Time/Speed/Distance", "Data interpretation (graphs, charts, tables)", "Logical reasoning: puzzles, coding-decoding"], tips: ["Numerical ability requires quick calculation, not deep math knowledge"] }
        ]
      }
    ]
  },
  "agniveer": {
    name: "Agniveer (Indian Army)",
    icon: "🎖️",
    sections: [
      {
        title: "General Knowledge",
        topics: [
          { name: "Indian History", notes: ["Ancient: Indus Valley, Mauryan, Gupta", "Medieval: Delhi Sultanate, Mughals, Marathas", "Modern: British rule, 1857 Revolt, Freedom movement (1885-1947)"], tips: ["Focus on military history, wars, and famous battles"] },
          { name: "Indian Geography", notes: ["Physical: Himalayas, Rivers (Ganga-Brahmaputra), Coastal plains", "Climate: Monsoon (SW, NE), Seasons, Rainfall distribution", "States & Capitals, Dams, National Parks"], tips: ["Know bordering countries, states, and their capitals"] },
          { name: "Indian Polity", notes: ["Constitution: Preamble, Fundamental Rights (Art 12-35), DPSP (Art 36-51)", "Parliament: LS (543), RS (245), Speaker, Legislative process", "Executive: President, PM, Cabinet, Constitutional bodies"], tips: ["Focus on fundamental rights and duties"] },
          { name: "Indian Economy", notes: ["GDP, Inflation (CPI), Poverty line, Budget", "Five-Year Plans, NITI Aayog (2015)", "Banking: RBI, SBI, NPA, CRR, Repo Rate"] },
          { name: "Science & Technology", subtopics: ["Physics", "Chemistry", "Biology Basics"], notes: ["Physics: Motion, Force, Energy, Light, Sound - basic laws", "Chemistry: Elements, Compounds, Chemical reactions, Acids/Bases", "Biology: Cell, Human body systems, Nutrition"], tips: ["NCERT Science Class 6-10 level"] },
          { name: "Defence & Sports", notes: ["Indian Army: Ranks (General→Sepoy), Commands, Regiments", "Defense: DRDO, ISRO, Missiles (Agni, Prithvi, Brahmos)", "Sports: Tournaments (World Cup, Olympics), Trophies, Personalities"] }
        ]
      },
      {
        title: "Mathematics",
        topics: [
          { name: "Number System", subtopics: ["LCM/HCF", "Decimals", "Fractions"], notes: ["LCM & HCF by prime factorization", "Divisibility rules (2, 3, 5, 9, 11)", "Fractions: proper, improper, mixed, comparison"], tips: ["Learn squares up to 25 and cubes up to 10"] },
          { name: "Percentage & Ratio", notes: ["Percentage to fraction conversion", "Profit/Loss: CP, SP, Profit%, Discount", "Ratio & Proportion: Direct/Inverse proportion, Compound ratio"], tips: ["Fraction equivalents: 33⅓%=⅓, 12½%=⅛, 20%=⅕"] },
          { name: "Time & Work/Distance", notes: ["Work: A+B=1 day work = 1/n", "Pipes & Cisterns (inlet/outlet)", "Time/Distance: Speed = Dist/Time, Relative speed", "Average speed for equal distances: 2ab/(a+b)"], tips: ["LCM method: total work = LCM of individual days"] },
          { name: "Mensuration & Algebra", notes: ["Mensuration: Area of triangle (½bh), circle (πr²), cylinder (2πrh)", "Algebra: Linear equations in 1 & 2 variables", "Geometry: Lines, Angles, Triangles (Pythagorean theorem)"] }
        ]
      },
      {
        title: "Science",
        topics: [
          { name: "Physics", notes: ["Motion: v=u+at, F=ma, Newton's 3 laws", "Work: W=Fdcosθ, Energy (KE=½mv², PE=mgh)", "Light: Reflection (i=r), Refraction (Snell's law), Lens", "Sound: Speed, Echo, Doppler effect"] },
          { name: "Chemistry", notes: ["Matter: Solid/Liquid/Gas, Pure/Mixture", "Atomic structure: Proton, Neutron, Electron", "Chemical bonding: Ionic, Covalent, VSEPR theory"] },
          { name: "Biology", notes: ["Cell: Structure, Organelles, Division (mitosis/meiosis)", "Human body: Digestive, Respiratory, Circulatory systems", "Plant: Photosynthesis, Classification"] }
        ]
      },
      {
        title: "Reasoning",
        topics: [
          { name: "Analogies", notes: ["Word analogies: synonym, antonym, cause-effect", "Number analogies: arithmetic patterns", "Letter analogies: position shift in alphabet"], tips: ["Identify relationship type before looking at options"] },
          { name: "Series & Classification", notes: ["Number series: arithmetic, geometric, pattern-based", "Letter series: continuous pattern, skip pattern", "Odd one out: based on category, function, property"] },
          { name: "Verbal Reasoning", notes: ["Blood relations: family tree, generation mapping", "Direction sense: turns, distance, shortest path", "Coding-decoding: letter shift, number mapping, substitution"] }
        ]
      }
    ]
  },
  "ctet": {
    name: "CTET (Teacher Eligibility Test)",
    icon: "📚",
    sections: [
      {
        title: "Child Development & Pedagogy",
        topics: [
          { name: "Child Development", subtopics: ["Stages", "Theories", "Individual Differences"], notes: ["Piaget: Cognitive development - Sensorimotor (0-2), Preoperational (2-7), Concrete (7-11), Formal (12+)", "Vygotsky: Zone of Proximal Development (ZPD), Scaffolding", "Kohlberg: Moral development - Pre-conventional, Conventional, Post-conventional", "Individual differences: Intelligence (Gardner's Multiple Intelligences), Personality"], tips: ["CTET questions focus on Piaget's stages and Vygotsky's ZPD", "Learn each theorist's key contribution + classroom implication"] },
          { name: "Learning Theories", subtopics: ["Behaviorism", "Cognitivism", "Constructivism", "Social Learning"], notes: ["Behaviorism: Pavlov (Classical), Skinner (Operant), Thorndike (Connectionism)", "Cognitivism: Piaget (Schemas, Assimilation/Accommodation), Bruner (Discovery)", "Constructivism: Knowledge is actively constructed by learner (Dewey, Piaget)", "Social Learning: Bandura - observation, modeling, self-efficacy"], tips: ["Classroom applications of each theory are emphasized"] },
          { name: "Exceptional Learners", subtopics: ["Inclusive Education", "Learning Disabilities", "Gifted Children"], notes: ["Inclusive: Education for all under one roof (RTE 2009, Section 3)", "Disabilities: Dyslexia (reading), Dysgraphia (writing), Dyscalculia (math), ADHD", "Gifted: Characteristics (rapid learning, high curiosity), Enrichment/Acceleration", "CWSN: Children with Special Needs - create supportive environment"], tips: ["RTE 2009 and National Education Policy 2020 are key references"] },
          { name: "Assessment & Evaluation", subtopics: ["Types", "CCE", "Feedback"], notes: ["Formative: during learning (quizzes, projects, observations)", "Summative: end of unit (exams, term papers)", "CCE (Continuous Comprehensive Evaluation): both formative + summative", "Diagnostic assessment: identifies learning gaps and difficulties"] },
          { name: "Motivation & Classroom Management", notes: ["Intrinsic (internal satisfaction) vs Extrinsic (rewards/punishments)", "Maslow's hierarchy: Physiological→Safety→Love→Esteem→Self-actualization", "Teacher's role: facilitator, mentor, positive discipline", "Positive classroom environment: inclusive, supportive, engaging"] }
        ]
      },
      {
        title: "Mathematics (Paper 1 & 2)",
        topics: [
          { name: "Number System", notes: ["Natural, Whole, Integers, Rational, Irrational numbers", "Prime/Composite, LCM/HCF, Divisibility rules", "Fractions, Decimals, Exponents"], tips: ["Teaching progression: concrete→pictorial→abstract (CPA approach)"] },
          { name: "Geometry", notes: ["Basic shapes, Lines & Angles, Triangles (types, properties)", "Quadrilaterals, Circles, 3D shapes (cube, cuboid, cylinder, sphere)", "Coordinate geometry basics"], formulas: ["Area of triangle = ½×base×height", "Pythagoras: a²+b²=c²"] },
          { name: "Pedagogical Issues", notes: ["Teaching methods: Inductive/Deductive, Problem-solving, Project method", "Learning difficulties: Dyscalculia - causes and remediation", "Error analysis and diagnostic teaching", "Use of manipulatives, ICT, and real-life examples"] }
        ]
      },
      {
        title: "Science / Environmental Studies",
        topics: [
          { name: "EVS (Paper 1)", subtopics: ["Family & Friends", "Food & Nutrition", "Water & Shelter", "Natural Resources"], notes: ["Family: relationships, types (nuclear, joint)", "Food: sources (plant/animal), nutrition (carbohydrate, protein, vitamins)", "Water: sources, purification, conservation", "Shelter: types of houses, building materials", "Plants & Animals: classification, habitats, life cycles"], tips: ["EVS teaching uses local examples and experiential learning"] },
          { name: "Science (Paper 2)", subtopics: ["Physics", "Chemistry", "Biology"], notes: ["Physics: Force, Motion, Energy, Light, Sound, Electricity basics", "Chemistry: Matter, Elements/Compounds, Metals/Non-metals, Acids/Bases", "Biology: Cell, Human body, Plants, Food production"], tips: ["Science teaching: inquiry-based, hands-on activities"] },
          { name: "Environmental Education", notes: ["Ecosystem: components, food chains, conservation", "Biodiversity: importance, threats, conservation", "Pollution: air, water, soil, noise - causes & solutions", "Climate change: causes, impact on India, mitigation"] }
        ]
      },
      {
        title: "Language (English)",
        topics: [
          { name: "Grammar & Usage", subtopics: ["Parts of Speech", "Tenses", "Active/Passive", "Reported Speech"], notes: ["Parts: noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection", "Tenses: Present/Past/Future (Simple, Continuous, Perfect, Perfect Continuous)", "Pedagogical approach: communicative language teaching (CLT)"], tips: ["Language acquisition vs language learning - Krashen's theory"] },
          { name: "Reading & Writing", notes: ["Reading: comprehension, phonics, sight words, reading strategies", "Writing: process (planning, drafting, editing), genres (narrative, persuasive)", "Pre-reading activities: prediction, brainstorming, KWL chart"], tips: ["CTET focuses on teaching methodologies, not just grammar"] },
          { name: "Pedagogical Issues", notes: ["Remedial teaching for reading difficulties", "Developing listening, speaking, reading, writing (LSRW) skills", "Multilingualism and language diversity in classroom", "Role of home language vs school language"] }
        ]
      }
    ]
  },
  "ssc-gd": {
    name: "SSC GD Constable",
    icon: "👮",
    sections: [
      {
        title: "General Intelligence & Reasoning",
        topics: [
          { name: "Analogies", notes: ["Word, letter, number analogies - same as CGL but easier", "Common relationships: synonym, antonym, cause-effect, part-whole"], tips: ["SSC GD has easier analogies - focus on basic relationships"] },
          { name: "Series", notes: ["Number series (arithmetic progression, pattern-based)", "Letter series (position shift, skipping pattern)", "Mixed series (alternating letter-number pattern)"], tips: ["Check alternate patterns: +2, +4, +6 or ×2, ×3, ×4"] },
          { name: "Coding-Decoding", notes: ["Simple letter coding (shift by N positions)", "Number coding (A=1, B=2 or A=26, B=25)", "Substitution coding (fixed mapping)"], tips: ["Write letter positions (A=1 to Z=26) for speed"] },
          { name: "Blood Relations & Directions", notes: ["Family tree mapping (father, mother, brother, sister, uncle, aunt)", "Direction sense (North, South, East, West turns)", "Distance problems (Pythagorean theorem: a²+b²=c²)"], tips: ["Draw family trees with standard notation (□ male, ○ female, = marriage)"] },
          { name: "Classification & Puzzle", notes: ["Odd one out (find word/letter/number that doesn't belong)", "Simple puzzles: ranking, order, comparison"], tips: ["Classification: identify the common property first, find the exception"] }
        ]
      },
      {
        title: "General Knowledge & Awareness",
        topics: [
          { name: "History", notes: ["Ancient: Indus Valley, Vedic, Mauryan, Gupta", "Medieval: Delhi Sultanate, Mughal Empire", "Modern: 1857 Revolt, National Movement (1885-1947)", "Indian Freedom fighters and their contributions"] },
          { name: "Geography", notes: ["Physical: Mountains, Rivers, Climate zones", "States & Capitals, Union Territories", "Important Dams, National Parks, Wildlife Sanctuaries"], tips: ["Focus on static GK - SSC GD doesn't ask current affairs in depth"] },
          { name: "Polity & Economy", notes: ["Constitution basics: Preamble, FRs, DPSP", "Parliament, President, PM", "GDP, Inflation, Budget basics, Banking terms"] },
          { name: "Science Basics", notes: ["Physics: Force, Motion, Energy, Light, Sound", "Chemistry: Elements, Compounds, Reactions (Acid/Base/Salt)", "Biology: Human body systems, Nutrition, Common diseases"], tips: ["NCERT Science Class 6-10 level is sufficient"] },
          { name: "Sports & Awards", notes: ["Major sports tournaments, venues, winners", "Padma awards, Nobel prizes, Oscar, Booker", "Indian military: ranks, commands, weapons"] }
        ]
      },
      {
        title: "Mathematics",
        topics: [
          { name: "Number System & LCM/HCF", notes: ["Number types, prime/composite, divisibility", "LCM by prime factorization, application problems", "HCF: highest common factor method"], tips: ["SSC GD math is basic class 8-10 level"] },
          { name: "Percentage & Ratio", notes: ["Percentage change, percentage to fraction conversion", "Ratio: direct/inverse proportion, compound ratio", "Profit/Loss: CP, SP, Profit%, Discount, Successive discounts"], tips: ["Fraction equivalents: 50%=½, 25%=¼, 75%=¾, 20%=⅕, etc."] },
          { name: "Time, Work & Distance", notes: ["Work: 1/A + 1/B = 1/(combined time)", "Efficiency method: total work = LCM", "Speed: S=D/T, Average speed = Total D / Total T", "Relative speed: opposite→add, same→subtract"] },
          { name: "Mensuration & Algebra", notes: ["Area: Triangle, Circle, Rectangle, Square, Trapezium", "Volume: Cube, Cuboid, Cylinder", "Algebra: Linear equations, Simple quadratic"], formulas: ["Circle: Area = πr², Circumference = 2πr", "Cylinder: Volume = πr²h, CSA = 2πrh"] }
        ]
      },
      {
        title: "English Language",
        topics: [
          { name: "Grammar", notes: ["Parts of speech: noun, verb, adjective, adverb, preposition", "Tenses: present/past/future - simple, continuous, perfect", "Subject-verb agreement, articles (a/an/the)", "Active-Passive voice, Direct-Indirect speech"], tips: ["Focus on basic grammar rules commonly tested"] },
          { name: "Vocabulary", notes: ["Synonyms & Antonyms (common English words)", "One-word substitution, Idioms & Phrases", "Spelling check (commonly misspelled words)", "Word meaning in context"] },
          { name: "Reading Comprehension", notes: ["Short passages (200-300 words)", "Questions: main idea, inference, vocabulary in context", "Topics: social, cultural, educational"], tips: ["Read the passage quickly, then answer questions"] }
        ]
      }
    ]
  },
  "cds": {
    name: "CDS (Combined Defence Services)",
    icon: "⚔️",
    sections: [
      {
        title: "English",
        topics: [
          { name: "Grammar & Usage", subtopics: ["Parts of Speech", "Tenses", "Voice & Narration", "Sentence Structure"], notes: ["Nouns, Pronouns, Adjectives, Verbs, Adverbs, Prepositions, Conjunctions, Interjections", "Tenses: Present/Past/Future (4 forms each = 12 tenses)", "Active/Passive voice: conversion rules for all tenses", "Direct/Indirect speech: reporting rules, tense changes", "Sentence types: Simple, Compound, Complex"], tips: ["CDS English grammar is Class 10-12 level but very thorough"] },
          { name: "Vocabulary", subtopics: ["Synonyms", "Antonyms", "One-Word Substitution", "Idioms"], notes: ["Synonyms: words with similar meaning (abandon=leave, begin=start)", "Antonyms: opposite meaning (happy↔sad, bright↔dark)", "One-word: 'One who is unable to pay debts' = Insolvent", "Idioms: 'To burn the midnight oil' = study/work late", "Phrasal verbs: give up (quit), look into (investigate)"], tips: ["Learn 15 new words daily with usage in sentences"] },
          { name: "Reading Comprehension", notes: ["3-4 passages, 5-10 questions each", "Factual, literary, and abstract passages", "Main idea, inference, author's tone, vocabulary in context"] },
          { name: "Ordering of Sentences", subtopics: ["Para Jumbles", "Sentence Completion"], notes: ["Arrange sentences in logical order", "Find opening sentence (broad introduction)", "Connect using transition words and pronouns"] }
        ]
      },
      {
        title: "General Knowledge",
        topics: [
          { name: "History", subtopics: ["Ancient", "Medieval", "Modern", "Post-Independence"], notes: ["Ancient: IVC (2500 BCE), Vedic period, Mauryas (Chandragupta, Ashoka), Guptas (Golden Age)", "Medieval: Delhi Sultanate (Slave→Khilji→Tughlaq→Sayyid→Lodhi), Mughals (Babur→Aurangzeb)", "Modern: British expansion, 1857 Revolt, Indian National Congress (1885), Gandhi era", "Post-Independence: Integration of states, Constitution, Major events"] },
          { name: "Geography", subtopics: ["Physical", "Climate", "Agriculture", "Population"], notes: ["Physical: Himalayas (3 ranges), Northern plains, Peninsular plateau, Coastal plains", "Climate: Monsoon system (SW June-Sept, NE Oct-Dec), Cyclones (Bay of Bengal)", "Agriculture: Crops (Rice-Wheat-Sugarcane-Cotton), Green Revolution", "Population: Demographics, density, growth rate, Census"] },
          { name: "Polity", notes: ["Constitution: adopted 26 Nov 1949, effective 26 Jan 1950", "Preamble: Sovereign Socialist Secular Democratic Republic", "Fundamental Rights: 6 rights (Equality, Freedom, Against Exploitation, Religion, Education, Constitutional Remedies)", "DPSP: non-justiciable, borrowed from Ireland", "Parliament: LS (543 elected + 2 nominated), RS (245)"], tips: ["Article 32 (Right to Constitutional Remedies) - Dr. Ambedkar called it 'heart and soul of Constitution'"] },
          { name: "Science", subtopics: ["Physics", "Chemistry", "Biology Basics"], notes: ["Physics: Motion (Newton's laws), Gravitation, Light (reflection/refraction), Electricity (Ohm's law)", "Chemistry: Matter (solid/liquid/gas), Atoms (proton/neutron/electron), Reactions", "Biology: Cell (basic unit), Human body systems (digestive, respiratory, circulatory)", "Defense: Missiles (Agni-V, Brahmos), ISRO missions"] }
        ]
      },
      {
        title: "Mathematics",
        topics: [
          { name: "Algebra", subtopics: ["Polynomials", "Quadratic", "Matrices", "Determinants"], notes: ["Polynomials: degree, factorization, remainder theorem", "Quadratic: ax²+bx+c=0, nature of roots (D≥0 real, D<0 imaginary)", "Matrices: addition, multiplication, 2×2 and 3×3 determinants", "Set theory: union, intersection, complement, Venn diagrams"], formulas: ["(a+b)² = a²+2ab+b²", "Roots: x = [-b±√(b²-4ac)]/2a", "det(2×2) = ad-bc"], tips: ["CDS math includes matrices and determinants - not in most other defense exams"] },
          { name: "Trigonometry", subtopics: ["Ratios", "Identities", "Heights & Distances"], notes: ["sin, cos, tan, cosec, sec, cot - values at 0°,30°,45°,60°,90°", "Identities: sin²θ+cos²θ=1, tan²θ+1=sec²θ, 1+cot²θ=cosec²θ", "Heights: use tanθ = opposite/adjacent for heights and distances"], tips: ["Learn the trigonometric table values by heart (0°,30°,45°,60°,90°)"] },
          { name: "Geometry", subtopics: ["Lines & Angles", "Triangles", "Circles", "Mensuration"], notes: ["Triangles: Congruence (SSS, SAS, ASA, RHS), Similarity (AA, SSS, SAS)", "Circles: Tangent properties (radius⊥tangent), Chord theorems", "Mensuration: Area/Volume of sphere, cylinder, cone, frustum", "Coordinate: Distance between points, Section formula"], formulas: ["Pythagorean theorem: a²+b²=c²", "Area of circle = πr²", "Volume of sphere = 4/3πr³"] },
          { name: "Statistics & Probability", notes: ["Statistics: Mean, Median, Mode, Standard deviation", "Probability: P(E) = favorable/total, dice (1/6 each), cards", "Combinations and permutations basics"] }
        ]
      }
    ]
  },
  "nda": {
    name: "NDA (National Defence Academy)",
    icon: "🛡️",
    sections: [
      {
        title: "Mathematics",
        topics: [
          { name: "Algebra", subtopics: ["Complex Numbers", "Quadratic", "Matrices & Determinants", "Binomial Theorem"], notes: ["Complex: i²=-1, z=a+ib, conjugate, modulus, argand plane", "Quadratic: ax²+bx+c=0, sum=-b/a, product=c/a, nature of roots", "Matrices: types (identity, zero, symmetric), addition, multiplication, determinant (2×2, 3×3)", "Binomial: (a+b)ⁿ expansion, general term Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳ bʳ"], formulas: ["|z| = √(a²+b²)", "arg(z) = tan⁻¹(b/a)"], tips: ["NDA math emphasis on matrices and complex numbers"] },
          { name: "Trigonometry", subtopics: ["Ratios & Identities", "Heights & Distances", "Inverse Trig"], notes: ["Angles: 0°,30°,45°,60°,90°,180°,270° trig values", "Identities: sin²θ+cos²θ=1, tan²θ+1=sec²θ", "Inverse: sin⁻¹, cos⁻¹, tan⁻¹ - principal value ranges", "Heights: angle of elevation/depression"], tips: ["Solve triangles using sine rule (a/sinA = b/sinB = c/sinC) and cosine rule"] },
          { name: "Calculus", subtopics: ["Limits", "Differentiation", "Integration", "DE"], notes: ["Limits: standard limits (sinx/x→1, (eˣ-1)/x→1), continuous functions", "Differentiation: power, product, quotient, chain rule, maxima/minima", "Integration: substitution, by parts, definite integrals, area under curve", "DE: Variable separable, Linear DE"], formulas: ["d/dx(xⁿ) = nxⁿ⁻¹", "∫xⁿdx = xⁿ⁺¹/(n+1)", "∫ₐᵇf(x)dx = F(b)-F(a)"] },
          { name: "Vector & 3D", notes: ["Vectors: dot (a·b = |a||b|cosθ), cross (|a×b| = |a||b|sinθ)", "3D: direction cosines, line equations (symmetric/parametric)", "Plane: equation ax+by+cz+d=0, angle between lines/planes"] }
        ]
      },
      {
        title: "General Ability Test (GAT)",
        topics: [
          { name: "English", subtopics: ["Grammar", "Vocabulary", "Comprehension"], notes: ["Parts of speech (8 types), Tenses (12), Active/Passive, Direct/Indirect", "Vocabulary: synonyms, antonyms, one-word substitution, idioms", "Reading comprehension: 2-3 passages, main idea/tone/inference"], tips: ["Spotting errors and sentence improvement are common question types"] },
          { name: "History & Geography", notes: ["History: Ancient (IVC, Vedic, Mauryan, Gupta), Medieval (Delhi Sultanate, Mughals), Modern (1857, National Movement)", "Geography: Physical (mountains, rivers, climate), Agriculture, Population, Economic geography"], tips: ["Focus on events with military significance for NDA"] },
          { name: "Polity & Economy", notes: ["Constitution: Preamble, FRs, DPSP, Parliament", "President (election, powers), PM, Cabinet", "Basic economic terms: GDP, Inflation, Budget", "Five-Year Plans, NITI Aayog"] },
          { name: "Science & Tech", subtopics: ["Physics", "Chemistry", "Biology", "Defense Tech"], notes: ["Physics: Motion, Force, Energy, Light, Sound, Electricity basics", "Chemistry: Elements, Compounds, Reactions, Acids/Bases/Salts", "Biology: Cell, Human body, Nutrition, Diseases", "Defense: Missiles, Aircraft, Warships, ISRO"] },
          { name: "Current Affairs", notes: ["Last 6 months: national & international events", "Defense news: exercises, new weapons, appointments", "Sports: major events, results, awards", "Awards: Padma, Nobel, Gallantry awards"] }
        ]
      }
    ]
  },
  "clat": {
    name: "CLAT (Law Entrance)",
    icon: "⚖️",
    sections: [
      {
        title: "Legal Reasoning",
        topics: [
          { name: "Constitutional Law", subtopics: ["Fundamental Rights", "DPSP", "Federal Structure", "Amendments"], notes: ["FRs: Art 14 (Equality), 19 (Freedom), 21 (Life/Personal Liberty), 32 (Remedies)", "DPSP: Art 36-51, non-justiciable but fundamental in governance", "Federal: Union-State relations, 7th Schedule (100+97+47 items)", "Amendments: 1st (1951), 42nd (1976-mini Constitution), 44th, 101st (GST)"], examples: [{q: "Which Article abolishes untouchability?", a: "Article 17"}], tips: ["Read the Preamble and understand 'Basic Structure Doctrine' (Kesavananda Bharati case, 1973)"] },
          { name: "Criminal Law", subtopics: ["IPC", "CrPC", "Evidence Act", "Offenses"], notes: ["IPC 1860: Offenses against person (murder 302, hurt 319-338), property (theft 378, robbery 390)", "CrPC 1973: Arrest, Bail (regular/anticipatory), Trial procedure", "Indian Evidence Act 1872: Types (direct/circumstantial), Burden of proof", "General exceptions: self-defense (96-106), insanity (84), intoxication (85-86)"], tips: ["Learn definitions of key crimes with IPC section numbers"] },
          { name: "Contract Law", subtopics: ["Offer & Acceptance", "Consideration", "Breach", "Remedies"], notes: ["Indian Contract Act 1872: s.2(h) defines contract = agreement + enforceability", "Essentials: Offer (s.2(a)) + Acceptance (s.2(b)) + Consideration (s.2(d))", "Free consent: coercion (s.15), undue influence (s.16), fraud (s.17), misrepresentation (s.18)", "Breach: actual or anticipatory, remedies (damages, specific performance, injunction)"], tips: ["Key sections to know: s.10 (essentials), s.56 (frustration), s.73 (damages)"] },
          { name: "Torts & Other Laws", subtopics: ["Negligence", "Defamation", "Liability", "Consumer Law"], notes: ["Negligence: Duty of care (Donoghue v Stevenson) + Breach + Causation + Damage", "Defamation: publication of false statement harming reputation (libel=written, slander=spoken)", "Strict liability (Rylands v Fletcher): escape of dangerous thing", "Consumer Protection Act 2019: Consumer rights, Consumer Disputes Redressal"] },
          { name: "Legal Maxims", notes: ["Audi alteram partem - hear the other side", "Res ipsa loquitur - thing speaks for itself", "Ex post facto - retroactive law", "De minimis non curat lex - law doesn't concern with trifles", "Actus non facit reum nisi mens sit rea - act not guilty unless guilty mind"] },
          { name: "Important Cases", notes: ["Kesavananda Bharati (1973) - basic structure doctrine", "Maneka Gandhi (1978) - Article 21 expanded", "Vishaka (1997) - sexual harassment guidelines", "SR Bommai (1994) - Article 356 judicial review", "Navtej Singh Johar (2018) - Section 377 decriminalized"] }
        ]
      },
      {
        title: "Logical Reasoning",
        topics: [
          { name: "Arguments", subtopics: ["Strengthening", "Weakening", "Assumptions", "Flaws"], notes: ["Strengthening: add supporting evidence, remove objections, show analogy", "Weakening: find alternative explanation, show counterexample, attack premise", "Assumptions: unstated premise needed for conclusion to hold", "Flaws: circular reasoning, hasty generalization, false cause, false analogy"], tips: ["Identify conclusion and premises before evaluating argument"] },
          { name: "Inference & Conclusions", notes: ["Draw logical conclusions from given statements", "Identify statements that must be true vs could be true", "Based on formal logic, not personal opinion"], tips: ["Stick strictly to information given - don't use outside knowledge"] },
          { name: "Analytical Puzzles", subtopics: ["Arrangements", "Relations", "Coding"], notes: ["Seating arrangements (linear/circular)", "Blood relations and family trees", "Coding-decoding patterns", "Ordering/ranking problems"] }
        ]
      },
      {
        title: "English Language",
        topics: [
          { name: "Reading Comprehension", notes: ["4-6 passages from legal, philosophical, social themes", "Questions: main idea, inference, vocab in context, author's perspective", "CLAT passages are longer and more complex than other exams"], tips: ["Read legal editorials (The Hindu, Indian Express) for practice"] },
          { name: "Grammar & Vocabulary", subtopics: ["Error Spotting", "Fill in Blanks", "Jumbled Sentences"], notes: ["Grammar: subject-verb agreement, tenses, articles, prepositions", "Vocab: synonyms, antonyms, one-word substitution, idioms", "Sentence completion with grammatically + contextually correct option"] }
        ]
      },
      {
        title: "Current Affairs & GK",
        topics: [
          { name: "Current Affairs", notes: ["Last 12 months: national/international events, legal developments", "Important judgments (Supreme Court), new bills/acts", "International: UN, treaties, summits (G20, BRICS, SCO)", "Awards: Nobel, Padma, Gallantry, Booker, Oscar", "Sports: major tournaments, winners"] },
          { name: "Static GK", subtopics: ["History", "Geography", "Polity", "Economy"], notes: ["History: Ancient to Modern India (freedom movement focus)", "Geography: Physical (rivers, mountains), States & Capitals", "Polity: Constitution basics, Parliament, Executive, Judiciary", "Economy: GDP, Budget, Banking, Schemes"] }
        ]
      },
      {
        title: "Quantitative Techniques",
        topics: [
          { name: "Data Interpretation", notes: ["Graphs (bar, line, pie), tables, and charts", "Graph-based questions with legal/economic contexts", "Basic calculations: percentage, ratio, average"], tips: ["CLAT math is easy, focus on speed and accuracy"] },
          { name: "Basic Math", notes: ["Percentages, ratios, proportions", "Profit/loss, simple/compound interest", "Time/speed/distance, time/work", "Averages, mixtures and alligations"], tips: ["Practice mental arithmetic for quicker DI solution"] }
        ]
      }
    ]
  }
};


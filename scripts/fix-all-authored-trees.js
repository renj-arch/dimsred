const fs = require('fs');
const t = JSON.parse(fs.readFileSync('data/topic-layers.json', 'utf8'));

const authored = {};

// Gandhi already fixed
// Champaran already fixed

authored['dandi march'] = {
  "name": "Dandi March",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Gandhi's 24-day salt march from Sabarmati to Dandi (Mar–Apr 1930).",
      "items": [
        {"name": "Start: Sabarmati Ashram (12 Mar 1930)", "type": "event", "desc": "Gandhi + 78 satyagrahis depart."},
        {"name": "Route: 385 km through Gujarat", "type": "place", "desc": "Villages joined en route; international press coverage."},
        {"name": "Arrival: Dandi (5 Apr 1930)", "type": "event", "desc": "Gandhi picks up salt from shore; breaks British salt law."},
        {"name": "Aftermath: Mass civil disobedience", "type": "event", "desc": "Millions make/buy illegal salt; 60,000+ arrested."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "participant",
      "desc": "Key participants.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Leader."},
        {"name": "Abbas Tyabji", "type": "person", "desc": "Took over after Gandhi's arrest."},
        {"name": "Sarojini Naidu", "type": "person", "desc": "Led raid on Dharasana Salt Works."}
      ]
    },
    {
      "title": "Outcome",
      "type": "concept",
      "rel": "result",
      "desc": "Results.",
      "items": [
        {"name": "Gandhi–Irwin Pact (1931)", "type": "event", "desc": "Salt tax concessions; Round Table Conference."},
        {"name": "Global attention", "type": "concept", "desc": "Turned Indian independence into world news."}
      ]
    }
  ]
};

authored['salt march'] = authored['dandi march']; // alias
authored['salt satyagraha'] = {
  "name": "Salt Satyagraha",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Nationwide civil disobedience against British salt monopoly (1930–34).",
      "items": [
        {"name": "Dandi March (Mar–Apr 1930)", "type": "event", "desc": "Catalyst."},
        {"name": "Dharasana Salt Works raid (May 1930)", "type": "event", "desc": "Sarojini Naidu led; brutal lathi charge; global outrage."},
        {"name": "Wadala / Bombay salt pans", "type": "event", "desc": "Mass illegal salt production."},
        {"name": "Gandhi–Irwin Pact (Mar 1931)", "type": "event", "desc": "Truce; Gandhi attends 2nd Round Table Conference."},
        {"name": "Renewal (1932–34)", "type": "event", "desc": "Gandhi re-arrested; movement continues till 1934."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Architect."},
        {"name": "Sarojini Naidu", "type": "person", "desc": "Dharasana leader."},
        {"name": "C. Rajagopalachari", "type": "person", "desc": "Led Vedaranyam march (Tamil Nadu)."},
        {"name": "K. Kelappan", "type": "person", "desc": "Led Payyannur march (Malabar)."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "site",
      "desc": "Key sites.",
      "items": [
        {"name": "Dandi (Gujarat)", "type": "place", "desc": "Gandhi's endpoint."},
        {"name": "Vedaranyam (Tamil Nadu)", "type": "place", "desc": "Rajaji's march."},
        {"name": "Payyannur (Kerala)", "type": "place", "desc": "Kelappan's march."},
        {"name": "Dharasana (Gujarat)", "type": "place", "desc": "Salt works raid."}
      ]
    }
  ]
};

authored['non cooperation movement'] = {
  "name": "Non-Cooperation Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Gandhi-led mass movement (1920–22) — boycott of British institutions.",
      "items": [
        {"name": "Launch (Sep 1920)", "type": "event", "desc": "Calcutta Congress; Khilafat merged."},
        {"name": "Boycotts: schools, courts, councils, foreign cloth", "type": "event", "desc": "Students left govt schools; lawyers quit courts."},
        {"name": "Chauri Chaura (Feb 1922)", "type": "event", "desc": "Police station burnt; 22 policemen killed."},
        {"name": "Withdrawal (Feb 1922)", "type": "event", "desc": "Gandhi calls off movement; arrested Mar 1922."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Key leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Called off after Chauri Chaura."},
        {"name": "Ali Brothers (Shaukat, Mohammad)", "type": "person", "desc": "Khilafat leaders."},
        {"name": "C.R. Das", "type": "person", "desc": "Congress president 1921; Swaraj Party later."},
        {"name": "Motilal Nehru", "type": "person", "desc": "Gave up practice; Swaraj Party."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "site",
      "desc": "Key centres.",
      "items": [
        {"name": "Calcutta (Kolkata)", "type": "place", "desc": "Launch."},
        {"name": "Chauri Chaura (UP)", "type": "place", "desc": "Flashpoint."},
        {"name": "Bombay (Mumbai)", "type": "place", "desc": "Bonfire of foreign cloth."}
      ]
    }
  ]
};

authored['quit india movement'] = {
  "name": "Quit India Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Mass uprising demanding British withdrawal (Aug 1942).",
      "items": [
        {"name": "Quit India Resolution (8 Aug 1942)", "type": "event", "desc": "Bombay AICC; 'Do or Die'."},
        {"name": "Mass arrests (9 Aug 1942)", "type": "event", "desc": "Gandhi, Nehru, Patel, Azad jailed immediately."},
        {"name": "Underground leadership", "type": "event", "desc": "Jayaprakash Narayan, Ram Manohar Lohia, Aruna Asaf Ali."},
        {"name": "Parallel governments", "type": "event", "desc": "Satara, Tamluk, Ballia — 'Prati Sarkar'."},
        {"name": "Suppression (1942–44)", "type": "event", "desc": "10,000+ killed; 60,000+ arrested."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Key leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Issued 'Do or Die'; jailed in Aga Khan Palace."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Jailed Ahmednagar Fort."},
        {"name": "Sardar Patel", "type": "person", "desc": "Jailed Ahmednagar Fort."},
        {"name": "Jayaprakash Narayan", "type": "person", "desc": "Escaped Hazaribagh jail; led underground."},
        {"name": "Aruna Asaf Ali", "type": "person", "desc": "Hoisted flag at Gowalia Tank."},
        {"name": "Usha Mehta", "type": "person", "desc": "Ran Congress Radio underground."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "site",
      "desc": "Key sites.",
      "items": [
        {"name": "Gowalia Tank (Bombay)", "type": "place", "desc": "Quit India resolution passed."},
        {"name": "Aga Khan Palace (Pune)", "type": "place", "desc": "Gandhi detained (Kasturba died here)."},
        {"name": "Ahmednagar Fort", "type": "place", "desc": "Nehru, Patel, Azad detained."},
        {"name": "Satara (Maharashtra)", "type": "place", "desc": "Parallel govt."},
        {"name": "Tamluk (Bengal)", "type": "place", "desc": "Parallel govt."},
        {"name": "Ballia (UP)", "type": "place", "desc": "Parallel govt."}
      ]
    }
  ]
};

authored['civil disobedience movement'] = {
  "name": "Civil Disobedience Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Two phases: 1930–31 (Salt) and 1932–34 (renewal).",
      "items": [
        {"name": "Phase I: Salt Satyagraha (1930–31)", "type": "event", "desc": "Dandi March; Gandhi–Irwin Pact; 1st RTC."},
        {"name": "Phase II: Renewal (1932–34)", "type": "event", "desc": "Gandhi re-arrested; Communal Award; Poona Pact."},
        {"name": "Constructive programme", "type": "concept", "desc": "Khadi, harijan uplift, village industries."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Architect."},
        {"name": "Khan Abdul Ghaffar Khan", "type": "person", "desc": "Frontier Gandhi; Khudai Khidmatgar."},
        {"name": "Rajendra Prasad", "type": "person", "desc": "Bihar leader."}
      ]
    },
    {
      "title": "Outcome",
      "type": "concept",
      "rel": "result",
      "desc": "Results.",
      "items": [
        {"name": "Gandhi–Irwin Pact (1931)", "type": "event", "desc": "Political prisoners released."},
        {"name": "Poona Pact (1932)", "type": "event", "desc": "Reserved seats for Depressed Classes."},
        {"name": "Government of India Act 1935", "type": "event", "desc": "Provincial autonomy; fed legislature."}
      ]
    }
  ]
};

authored['bardoli satyagraha'] = {
  "name": "Bardoli Satyagraha",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Peasant no-tax campaign in Bardoli, Gujarat (1928).",
      "items": [
        {"name": "22% revenue hike (1927)", "type": "event", "desc": "Bombay Presidency raised land revenue despite crop failure."},
        {"name": "Vallabhbhai Patel leads (Feb 1928)", "type": "event", "desc": "Organised no-tax campaign; women's volunteer corps."},
        {"name": "Government climbdown (Aug 1928)", "type": "event", "desc": "Revenue restored; seized land returned."},
        {"name": "Patel earns 'Sardar' title", "type": "event", "desc": "Women of Bardoli conferred title."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Key people.",
      "items": [
        {"name": "Sardar Vallabhbhai Patel", "type": "person", "desc": "Lead organiser; earned 'Sardar'."},
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Guided from afar; visited Bardoli."},
        {"name": "Mithuben Petit", "type": "person", "desc": "Women's volunteer corps leader."},
        {"name": "Maniben Patel", "type": "person", "desc": "Patel's daughter; organiser."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "site",
      "desc": "Location.",
      "items": [
        {"name": "Bardoli (Surat district, Gujarat)", "type": "place", "desc": "Taluka HQ; cotton-growing region."}
      ]
    }
  ]
};

authored['jallianwala bagh massacre'] = {
  "name": "Jallianwala Bagh Massacre",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "British troops fired on unarmed crowd in Amritsar (13 Apr 1919).",
      "items": [
        {"name": "Rowlatt Act protests (Mar 1919)", "type": "event", "desc": "Nationwide hartals; Amritsar tense."},
        {"name": "Baisakhi gathering (13 Apr 1919)", "type": "event", "desc": "~20,000 in walled garden; Dyer blocks exits."},
        {"name": "Firing (10–15 min, 1650 rounds)", "type": "event", "desc": "Official: 379 dead; Congress: 1000+."},
        {"name": "Crawling order & martial law", "type": "event", "desc": "Indians forced to crawl on street; public floggings."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "perpetrator",
      "desc": "Key figures.",
      "items": [
        {"name": "General Reginald Dyer", "type": "person", "desc": "Ordered firing; 'to produce moral effect'."},
        {"name": "Sir Michael O'Dwyer", "type": "person", "desc": "Punjab Lt-Gov; endorsed Dyer."},
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Renounced Kaiser-i-Hind medal; Non-Cooperation."},
        {"name": "Rabindranath Tagore", "type": "person", "desc": "Renounced knighthood."},
        {"name": "Udham Singh", "type": "person", "desc": "Assassinated O'Dwyer in London (1940)."}
      ]
    },
    {
      "title": "Inquiry",
      "type": "event",
      "rel": "investigation",
      "desc": "Official investigations.",
      "items": [
        {"name": "Hunter Commission (1919–20)", "type": "event", "desc": "Condemned Dyer; no criminal action."},
        {"name": "Congress Inquiry (1919)", "type": "event", "desc": "Motilal Nehru, C.R. Das, Abbas Tyabji."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "site",
      "desc": "Site.",
      "items": [
        {"name": "Jallianwala Bagh (Amritsar, Punjab)", "type": "place", "desc": "Walled garden; bullet marks preserved."}
      ]
    }
  ]
};

authored['partition of india'] = {
  "name": "Partition of India",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Division of British India into India and Pakistan (Aug 1947).",
      "items": [
        {"name": "Mountbatten Plan (3 Jun 1947)", "type": "event", "desc": "Dominion status; partition agreed."},
        {"name": "Indian Independence Act (18 Jul 1947)", "type": "event", "desc": "Royal assent; 15 Aug 1947 transfer."},
        {"name": "Radcliffe Award (17 Aug 1947)", "type": "event", "desc": "Boundary lines announced late; Bengal, Punjab split."},
        {"name": "Mass migration & violence", "type": "event", "desc": "14–18 million displaced; 1–2 million dead."},
        {"name": "Refugee crisis", "type": "event", "desc": "Delhi camps; Punjab blood trains."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "architect",
      "desc": "Key decision-makers.",
      "items": [
        {"name": "Lord Mountbatten", "type": "person", "desc": "Last Viceroy; accelerated timeline."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "Muslim League; demanded Pakistan."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Accepted partition; 1st PM India."},
        {"name": "Sardar Patel", "type": "person", "desc": "Convinced Congress; integrated states."},
        {"name": "Sir Cyril Radcliffe", "type": "person", "desc": "Chaired boundary commissions."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "border",
      "desc": "Partitioned regions.",
      "items": [
        {"name": "Punjab (West/East)", "type": "place", "desc": "Worst violence; Lahore, Amritsar."},
        {"name": "Bengal (West/East)", "type": "place", "desc": "Calcutta riots; Noakhali."},
        {"name": "Sindh", "type": "place", "desc": "Hindu exodus to India."},
        {"name": "NWFP", "type": "place", "desc": "Referendum; joined Pakistan."}
      ]
    }
  ]
};

authored['subhas chandra bose'] = {
  "name": "Subhas Chandra Bose",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Life",
      "type": "person",
      "rel": "life of",
      "desc": "Netaji (1897–1945); radical nationalist; INA leader.",
      "items": [
        {"name": "Birth: Cuttack (23 Jan 1897)", "type": "event", "desc": "Odisha."},
        {"name": "ICS resignation (1921)", "type": "event", "desc": "Joined Non-Cooperation; mentored by C.R. Das."},
        {"name": "Congress President (1938, 1939)", "type": "event", "desc": "Haripura, Tripuri; resigned over differences."},
        {"name": "Escape to Germany (1941)", "type": "event", "desc": "House arrest → Kabul → Moscow → Berlin."},
        {"name": "INA & Azad Hind (1943–45)", "type": "event", "desc": "Singapore; Rani Jhansi Regiment; Imphal campaign."},
        {"name": "Death: Taipei (18 Aug 1945)", "type": "event", "desc": "Plane crash; mystery persists."}
      ]
    },
    {
      "title": "Organisations",
      "type": "org",
      "rel": "founded",
      "desc": "Organisations.",
      "items": [
        {"name": "Forward Bloc (1939)", "type": "org", "desc": "Left-wing Congress faction."},
        {"name": "Azad Hind Government (1943)", "type": "org", "desc": "Provisional govt; recognised by 9 Axis states."},
        {"name": "Indian National Army (INA)", "type": "org", "desc": "40,000+ POWs; fought with Japan."}
      ]
    },
    {
      "title": "Key Associates",
      "type": "person",
      "rel": "colleague",
      "desc": "Close associates.",
      "items": [
        {"name": "Rash Behari Bose", "type": "person", "desc": "Handed INA leadership in Singapore."},
        {"name": "Lakshmi Sahgal", "type": "person", "desc": "Rani Jhansi Regiment commander."},
        {"name": "Shah Nawaz Khan", "type": "person", "desc": "INA officer; Red Fort trial."},
        {"name": "Prem Sahgal, Gurbaksh Dhillon", "type": "person", "desc": "Red Fort trial co-accused."}
      ]
    }
  ]
};

authored['sardar vallabhbhai patel'] = {
  "name": "Sardar Vallabhbhai Patel",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Life",
      "type": "person",
      "rel": "life of",
      "desc": "Iron Man (1875–1950); 1st Deputy PM & Home Minister.",
      "items": [
        {"name": "Birth: Nadiad, Gujarat (1875)", "type": "event", "desc": "Farmer family."},
        {"name": "Kheda Satyagraha (1918)", "type": "event", "desc": "First major leadership role with Gandhi."},
        {"name": "Bardoli Satyagraha (1928)", "type": "event", "desc": "Earned 'Sardar' title."},
        {"name": "Integration of princely states (1947–49)", "type": "event", "desc": "562 states merged; Hyderabad, Junagadh, Kashmir."},
        {"name": "Death: Bombay (15 Dec 1950)", "type": "event", "desc": ""}
      ]
    },
    {
      "title": "Key Achievements",
      "type": "concept",
      "rel": "achievement",
      "desc": "Major contributions.",
      "items": [
        {"name": "562 princely states integration", "type": "concept", "desc": "Bloodless except Hyderabad (Operation Polo)."},
        {"name": "All India Services (IAS/IPS)", "type": "concept", "desc": "Steel frame of administration."},
        {"name": "Constitution: Article 1 (Union of States)", "type": "concept", "desc": "Drafted with V.P. Menon."}
      ]
    },
    {
      "title": "Associates",
      "type": "person",
      "rel": "colleague",
      "desc": "Key colleagues.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Mentor; called him 'my right hand'."},
        {"name": "V.P. Menon", "type": "person", "desc": "Secretary, States Ministry; integration architect."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "PM; differences on Kashmir, but united on integration."}
      ]
    }
  ]
};

authored['jawaharlal nehru'] = {
  "name": "Jawaharlal Nehru",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Life",
      "type": "person",
      "rel": "life of",
      "desc": "1st PM (1889–1964); architect of modern India.",
      "items": [
        {"name": "Birth: Allahabad (1889)", "type": "event", "desc": "Kashmiri Brahmin family; Motilal Nehru."},
        {"name": "Education: Harrow, Cambridge, Inner Temple", "type": "event", "desc": "Returned 1912."},
        {"name": "Non-Cooperation (1920–22)", "type": "event", "desc": "Arrested; radicalised."},
        {"name": "Congress President (1929 Lahore)", "type": "event", "desc": "Poorna Swaraj declaration."},
        {"name": "Interim Govt VP (1946)", "type": "event", "desc": "De facto PM."},
        {"name": "PM (1947–64)", "type": "event", "desc": "17 years; longest-serving."},
        {"name": "Death (27 May 1964)", "type": "event", "desc": ""}
      ]
    },
    {
      "title": "Key Policies",
      "type": "concept",
      "rel": "policy",
      "desc": "Signature policies.",
      "items": [
        {"name": "Non-Alignment (1955 Bandung)", "type": "concept", "desc": "NAM founder with Tito, Nasser, Sukarno."},
        {"name": "Five-Year Plans (1951–)", "type": "concept", "desc": "Planning Commission; heavy industry focus."},
        {"name": "Scientific institutions (IITs, IISc, AIIMS, BARC)", "type": "concept", "desc": "Temples of modern India."},
        {"name": "Hindi-Chini Bhai Bhai → 1962 war", "type": "event", "desc": "Border defeat; death blow."}
      ]
    },
    {
      "title": "Associates",
      "type": "person",
      "rel": "colleague",
      "desc": "Key colleagues.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Mentor; 'inheritor of my mantle'."},
        {"name": "Sardar Patel", "type": "person", "desc": "Deputy PM; integration partner."},
        {"name": "Maulana Azad", "type": "person", "desc": "Education Minister; Congress president."},
        {"name": "K. Kamaraj", "type": "person", "desc": "Kamaraj Plan; Congress revival."}
      ]
    }
  ]
};

authored['b r ambedkar'] = {
  "name": "B. R. Ambedkar",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Life",
      "type": "person",
      "rel": "life of",
      "desc": "Babasaheb (1891–1956); Constitution architect; Dalit leader.",
      "items": [
        {"name": "Birth: Mhow (1891)", "type": "event", "desc": "Mahar caste; faced untouchability."},
        {"name": "Education: Columbia (PhD), LSE (DSc)", "type": "event", "desc": "1913–23; economics, law."},
        {"name": "Mahad Satyagraha (1927)", "type": "event", "desc": "Tank water right; burned Manusmriti."},
        {"name": "Poona Pact (1932)", "type": "event", "desc": "With Gandhi; reserved seats vs separate electorates."},
        {"name": "Constitution Drafting Chair (1947–49)", "type": "event", "desc": "Chairman, Drafting Committee."},
        {"name": "Law Minister (1947–51)", "type": "event", "desc": "Hindu Code Bill; resigned 1951."},
        {"name": "Conversion to Buddhism (1956)", "type": "event", "desc": "Nagpur; 500,000 followers."},
        {"name": "Death (6 Dec 1956)", "type": "event", "desc": "Delhi."}
      ]
    },
    {
      "title": "Key Works",
      "type": "concept",
      "rel": "work",
      "desc": "Major contributions.",
      "items": [
        {"name": "Constitution: Fundamental Rights (Art 14–32)", "type": "concept", "desc": "Equality, abolition of untouchability (Art 17)."},
        {"name": "Reservations (Art 15(4), 16(4), 330, 332)", "type": "concept", "desc": "SC/ST in legislature, services, education."},
        {"name": "Annihilation of Caste (1936)", "type": "concept", "desc": "Undelivered speech; caste critique."},
        {"name": "States Reorganisation (1955)", "type": "concept", "desc": "Linguistic states; advocated in 1953."}
      ]
    },
    {
      "title": "Organisations",
      "type": "org",
      "rel": "founded",
      "desc": "Founded.",
      "items": [
        {"name": "Bahishkrit Hitakarini Sabha (1924)", "type": "org", "desc": "Dalit welfare."},
        {"name": "Independent Labour Party (1936)", "type": "org", "desc": "Labour + Dalit."},
        {"name": "Scheduled Castes Federation (1942)", "type": "org", "desc": "Political party."},
        {"name": "Republican Party of India (1956)", "type": "org", "desc": "Posthumous."}
      ]
    }
  ]
};

authored['indian independence movement'] = {
  "name": "Indian Independence Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Phases",
      "type": "event",
      "rel": "phase",
      "desc": "Major phases (1857–1947).",
      "items": [
        {"name": "1857 Revolt / First War", "type": "event", "desc": "Sepoy mutiny → civilian uprising; crushed."},
        {"name": "Moderate phase (1885–1905)", "type": "event", "desc": "INC founded; petitions, prayers."},
        {"name": "Swadeshi / Extremist (1905–18)", "type": "event", "desc": "Bengal Partition; Tilak, Lajpat Rai, Bipin Pal."},
        {"name": "Gandhian mass phase (1919–42)", "type": "event", "desc": "Non-Coop, Salt, Quit India."},
        {"name": "Final push (1942–47)", "type": "event", "desc": "INA trials, RIN Mutiny, Cabinet Mission, Mountbatten."}
      ]
    },
    {
      "title": "Key Organisations",
      "type": "org",
      "rel": "organisation",
      "desc": "Major organisations.",
      "items": [
        {"name": "Indian National Congress (1885)", "type": "org", "desc": "Main nationalist platform."},
        {"name": "Muslim League (1906)", "type": "org", "desc": "Separate electorates; Pakistan demand."},
        {"name": "Hindu Mahasabha (1915)", "type": "org", "desc": "Hindu nationalist."},
        {"name": "Communist Party (1925)", "type": "org", "desc": "Workers/peasants; banned 1934–42."},
        {"name": "Forward Bloc (1939)", "type": "org", "desc": "Bose's radical faction."},
        {"name": "INA / Azad Hind (1942–45)", "type": "org", "desc": "Armed struggle from SE Asia."}
      ]
    },
    {
      "title": "Key Leaders",
      "type": "person",
      "rel": "leader",
      "desc": "Principal leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Mass mobilisation."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "PM-in-waiting; modernist."},
        {"name": "Sardar Patel", "type": "person", "desc": "Organisation; integration."},
        {"name": "Subhas Chandra Bose", "type": "person", "desc": "Armed struggle."},
        {"name": "B.R. Ambedkar", "type": "person", "desc": "Dalit rights; Constitution."},
        {"name": "Maulana Azad", "type": "person", "desc": "Congress president; Hindu-Muslim unity."}
      ]
    }
  ]
};

authored['khilafat movement'] = {
  "name": "Khilafat Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Pan-Islamic movement to protect Ottoman Caliphate (1919–24).",
      "items": [
        {"name": "Ottoman defeat (WWI)", "type": "event", "desc": "Treaty of Sèvres (1920) dismembered empire."},
        {"name": "Ali Brothers lead (1919)", "type": "event", "desc": "Shaukat Ali, Mohammad Ali."},
        {"name": "Gandhi merges with Non-Cooperation (1920)", "type": "event", "desc": "Hindu-Muslim unity; joint programme."},
        {"name": "Abolition of Caliphate (1924)", "type": "event", "desc": "Atatürk abolishes; movement ends."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Leaders.",
      "items": [
        {"name": "Mohammad Ali Jauhar", "type": "person", "desc": "Khilafat Committee president."},
        {"name": "Shaukat Ali", "type": "person", "desc": "Organiser."},
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Allied; saw Hindu-Muslim unity chance."},
        {"name": "Hasrat Mohani", "type": "person", "desc": "Poet; 'Inquilab Zindabad'."},
        {"name": "Abul Kalam Azad", "type": "person", "desc": "Supported; later Congress president."}
      ]
    }
  ]
};

authored['swadeshi movement'] = {
  "name": "Swadeshi Movement",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Anti-partition of Bengal; boycott of British goods (1905–11).",
      "items": [
        {"name": "Bengal Partition (16 Oct 1905)", "type": "event", "desc": "Curzon; 'divide and rule'."},
        {"name": "Boycott: foreign cloth, salt, sugar", "type": "event", "desc": "Bonfires of Manchester cloth."},
        {"name": "National education: Bengal National College", "type": "event", "desc": "Aurobindo Ghosh principal."},
        {"name": "Annulment (1911)", "type": "event", "desc": "Delhi Durbar; capital shifted to Delhi."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Extremist trio + others.",
      "items": [
        {"name": "Bal Gangadhar Tilak", "type": "person", "desc": "'Swaraj is my birthright'."},
        {"name": "Lala Lajpat Rai", "type": "person", "desc": "Punjab Kesari."},
        {"name": "Bipin Chandra Pal", "type": "person", "desc": "Orator; 'father of revolutionary thought'."},
        {"name": "Aurobindo Ghosh", "type": "person", "desc": "National College; later Pondicherry."},
        {"name": "Rabindranath Tagore", "type": "person", "desc": "Composed 'Amar Sonar Bangla'; withdrew later."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "centre",
      "desc": "Centres.",
      "items": [
        {"name": "Calcutta (Kolkata)", "type": "place", "desc": "Epicentre."},
        {"name": "Dhaka (East Bengal)", "type": "place", "desc": "Muslim majority; separate league later."}
      ]
    }
  ]
};

authored['revolt of 1857'] = {
  "name": "Revolt of 1857",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "First major uprising against British rule (1857–58).",
      "items": [
        {"name": "Meerut mutiny (10 May 1857)", "type": "event", "desc": "Sepoys refuse greased cartridges; march to Delhi."},
        {"name": "Delhi capture: Bahadur Shah II proclaimed Emperor", "type": "event", "desc": "Mughal restoration symbol."},
        {"name": "Cawnpore (Nana Sahib)", "type": "event", "desc": "Massacre at Satichaura Ghat; Bibighar."},
        {"name": "Lucknow (Begum Hazrat Mahal)", "type": "event", "desc": "Siege of Residency; Havelock, Outram, Campbell relieve."},
        {"name": "Jhansi (Rani Lakshmibai)", "type": "event", "desc": "Fought till death at Gwalior (Jun 1858)."},
        {"name": "Suppression (1858)", "type": "event", "desc": "British Crown takes over; Govt of India Act 1858."}
      ]
    },
    {
      "title": "Leaders",
      "type": "person",
      "rel": "leader",
      "desc": "Key leaders.",
      "items": [
        {"name": "Bahadur Shah II (Zafar)", "type": "person", "desc": "Last Mughal; exiled to Rangoon."},
        {"name": "Nana Sahib (Dhondu Pant)", "type": "person", "desc": "Adopted son of Peshwa; disappeared."},
        {"name": "Rani Lakshmibai", "type": "person", "desc": "Jhansi; iconic woman warrior."},
        {"name": "Tantia Tope", "type": "person", "desc": "Nana's general; guerilla warfare."},
        {"name": "Kunwar Singh", "type": "person", "desc": "80-year-old zamindar; Bihar."},
        {"name": "Begum Hazrat Mahal", "type": "person", "desc": "Awadh regent."},
        {"name": "Mangal Pandey", "type": "person", "desc": "Barrackpore; first spark (Mar 1857)."}
      ]
    },
    {
      "title": "Geography",
      "type": "place",
      "rel": "centre",
      "desc": "Major centres.",
      "items": [
        {"name": "Delhi", "type": "place", "desc": "Symbolic centre."},
        {"name": "Cawnpore (Kanpur)", "type": "place", "desc": "Nana Sahib."},
        {"name": "Lucknow", "type": "place", "desc": "Residency siege."},
        {"name": "Jhansi", "type": "place", "desc": "Rani Lakshmibai."},
        {"name": "Gwalior", "type": "place", "desc": "Final stand."},
        {"name": "Meerut", "type": "place", "desc": "Starting point."},
        {"name": "Bareilly, Faizabad, Arrah", "type": "place", "desc": "Other centres."}
      ]
    }
  ]
};

authored['simon commission'] = {
  "name": "Simon Commission",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "All-British statutory commission on constitutional reform (1927–30).",
      "items": [
        {"name": "Appointed (Nov 1927)", "type": "event", "desc": "Sir John Simon chair; 7 British MPs; NO Indians."},
        {"name": "Arrival: 'Go Back Simon' (Feb 1928)", "type": "event", "desc": "Black flags; hartals nationwide."},
        {"name": "Lala Lajpat Rai lathi-charged (Lahore, Oct 1928)", "type": "event", "desc": "Died Nov 1928; Bhagat Singh revenge."},
        {"name": "Report (May 1930)", "type": "event", "desc": "Provincial autonomy; no central responsibility; rejected."},
        {"name": "Round Table Conferences (1930–32)", "type": "event", "desc": "Followed Simon; Gandhi attended 2nd."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "member",
      "desc": "Commission members / opponents.",
      "items": [
        {"name": "Sir John Simon", "type": "person", "desc": "Chair."},
        {"name": "Clement Attlee", "type": "person", "desc": "Member; later PM (1945)."},
        {"name": "Lala Lajpat Rai", "type": "person", "desc": "Opposed; died from injuries."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "Boycotted; 14 Points (1929)."},
        {"name": "Motilal Nehru", "type": "person", "desc": "Nehru Report (1928) alternative."}
      ]
    }
  ]
};

authored['round table conferences'] = {
  "name": "Round Table Conferences",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Three conferences in London (1930–32) on constitutional reform.",
      "items": [
        {"name": "First (Nov 1930–Jan 1931)", "type": "event", "desc": "No Congress; princes, Muslims, Sikhs, liberals."},
        {"name": "Gandhi–Irwin Pact (Mar 1931)", "type": "event", "desc": "Gandhi released; attends 2nd."},
        {"name": "Second (Sep–Dec 1931)", "type": "event", "desc": "Gandhi sole Congress rep; deadlock on minorities."},
        {"name": "Communal Award (Aug 1932)", "type": "event", "desc": "Ramsay MacDonald; separate electorates for Depressed Classes."},
        {"name": "Poona Pact (Sep 1932)", "type": "event", "desc": "Gandhi fast; Ambedkar agrees to reserved seats."},
        {"name": "Third (Nov–Dec 1932)", "type": "event", "desc": "Congress absent; outcome → Govt of India Act 1935."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "delegate",
      "desc": "Key delegates.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "2nd Conference only."},
        {"name": "B.R. Ambedkar", "type": "person", "desc": "All three; Depressed Classes rep."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "Muslim League."},
        {"name": "Teja Singh", "type": "person", "desc": "Sikh delegate."},
        {"name": "Aga Khan III", "type": "person", "desc": "Muslim delegate."},
        {"name": "Maharajas (Bikaner, Patiala, etc.)", "type": "person", "desc": "Princely states."}
      ]
    }
  ]
};

authored['cabinet mission'] = {
  "name": "Cabinet Mission",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "British mission to negotiate transfer of power (Mar–Jun 1946).",
      "items": [
        {"name": "Arrival (24 Mar 1946)", "type": "event", "desc": "Pethick-Lawrence, Cripps, Alexander."},
        {"name": "Plan (16 May 1946)", "type": "event", "desc": "3-tier: Centre (defence, foreign, comms), Groups, Provinces."},
        {"name": "Congress accepts (24 Jun)", "type": "event", "desc": "Enters Constituent Assembly; rejects grouping compulsion."},
        {"name": "League accepts then withdraws (Jul 1946)", "type": "event", "desc": "Direct Action Day (16 Aug) → Calcutta killings."},
        {"name": "Interim Govt (Sep 1946)", "type": "event", "desc": "Nehru VP; Liaqat Ali Finance; deadlock."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "member",
      "desc": "Mission members / Indian leaders.",
      "items": [
        {"name": "Lord Pethick-Lawrence", "type": "person", "desc": "Sec of State; chair."},
        {"name": "Sir Stafford Cripps", "type": "person", "desc": "President, Board of Trade."},
        {"name": "A.V. Alexander", "type": "person", "desc": "First Lord Admiralty."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Congress; VP Interim Govt."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "League; demanded Pakistan."},
        {"name": "Sardar Patel", "type": "person", "desc": "Congress; Home in Interim."}
      ]
    }
  ]
};

authored['cripps mission'] = {
  "name": "Cripps Mission",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "British offer of dominion status post-WWII (Mar–Apr 1942).",
      "items": [
        {"name": "Arrival (22 Mar 1942)", "type": "event", "desc": "Stafford Cripps; war cabinet member."},
        {"name": "Offer: Dominion status after war", "type": "event", "desc": "Constituent Assembly; provinces can opt out."},
        {"name": "Congress rejects (Apr 1942)", "type": "event", "desc": "'Post-dated cheque on crashing bank' — Gandhi."},
        {"name": "League rejects (no Pakistan guarantee)", "type": "event", "desc": ""},
        {"name": "Failure → Quit India (Aug 1942)", "type": "event", "desc": "Gandhi launches movement."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "negotiator",
      "desc": "Key figures.",
      "items": [
        {"name": "Sir Stafford Cripps", "type": "person", "desc": "Mission leader; socialist."},
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Rejected; called it 'post-dated cheque'."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Negotiated; wanted immediate transfer."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "Rejected; no explicit Pakistan."}
      ]
    }
  ]
};

authored['wavell plan'] = {
  "name": "Wavell Plan",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Viceroy's plan for interim government (Jun–Jul 1945).",
      "items": [
        {"name": "Simla Conference (25 Jun–14 Jul 1945)", "type": "event", "desc": "22 Indian leaders invited."},
        {"name": "Proposal: Equal Hindu/Muslim in Executive", "type": "event", "desc": "Caste Hindus, Muslims, Sikhs, Depressed Classes, Parsis."},
        {"name": "Jinnah demands League sole Muslim rep", "type": "event", "desc": "Vetoed non-League Muslims."},
        {"name": "Conference fails", "type": "event", "desc": "Wavell abandons plan; elections announced."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "participant",
      "desc": "Key participants.",
      "items": [
        {"name": "Lord Wavell", "type": "person", "desc": "Viceroy (1943–47)."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "League; veto power demand."},
        {"name": "Maulana Azad", "type": "person", "desc": "Congress president."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Congress."},
        {"name": "B.R. Ambedkar", "type": "person", "desc": "Depressed Classes."},
        {"name": "Master Tara Singh", "type": "person", "desc": "Sikh."}
      ]
    }
  ]
};

authored['mountbatten plan'] = {
  "name": "Mountbatten Plan",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Final plan for partition and transfer of power (3 Jun 1947).",
      "items": [
        {"name": "Announcement (3 Jun 1947)", "type": "event", "desc": "Mountbatten radio broadcast."},
        {"name": "Key terms", "type": "concept", "desc": "Partition; dominion status; referendums in NWFP, Sylhet; boundary commission."},
        {"name": "Indian Independence Act (18 Jul 1947)", "type": "event", "desc": "Royal assent."},
        {"name": "Transfer (15 Aug 1947)", "type": "event", "desc": "Midnight; Nehru 'Tryst with Destiny'."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "architect",
      "desc": "Key architects.",
      "items": [
        {"name": "Lord Mountbatten", "type": "person", "desc": "Last Viceroy; accelerated to Aug 1947."},
        {"name": "V.P. Menon", "type": "person", "desc": "Drafted plan; Patel's aide."},
        {"name": "Jawaharlal Nehru", "type": "person", "desc": "Accepted; 1st PM."},
        {"name": "Sardar Patel", "type": "person", "desc": "Convinced Congress."},
        {"name": "M.A. Jinnah", "type": "person", "desc": "Accepted; 1st Gov-Gen Pakistan."}
      ]
    }
  ]
};

authored['kheda satyagraha'] = {
  "name": "Kheda Satyagraha",
  "rel": "covers",
  "_gen": false,
  "branches": [
    {
      "title": "Event",
      "type": "event",
      "rel": "event",
      "desc": "Peasant no-tax campaign in Kheda, Gujarat (1918).",
      "items": [
        {"name": "Crop failure + plague (1917–18)", "type": "event", "desc": "Peasants unable to pay revenue."},
        {"name": "Gandhi + Patel lead (Mar–Jun 1918)", "type": "event", "desc": "First Gandhi-Patel collaboration."},
        {"name": "Government suspends collection", "type": "event", "desc": "Revenue waived for poor; rich still pay."}
      ]
    },
    {
      "title": "People",
      "type": "person",
      "rel": "leader",
      "desc": "Leaders.",
      "items": [
        {"name": "Mahatma Gandhi", "type": "person", "desc": "Guided."},
        {"name": "Sardar Vallabhbhai Patel", "type": "person", "desc": "Field organiser; first major role."},
        {"name": "Indulal Yagnik", "type": "person", "desc": "Gujarati activist."},
        {"name": "Shankarlal Banker", "type": "person", "desc": "Organiser."}
      ]
    }
  ]
};

// Apply all authored trees
let count = 0;
for (const [key, val] of Object.entries(authored)) {
  t[key] = val;
  count++;
}

fs.writeFileSync('data/topic-layers.json', JSON.stringify(t, null, 1));
console.log('Applied', count, 'authored trees. Total topics:', Object.keys(t).length);
console.log('Authored now:', Object.values(t).filter(x => !x._gen).length);
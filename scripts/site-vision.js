// SITE VISION — the agent reads this to understand what the site IS and what it SHOULD BE
// This file is the single source of truth for the agent's decisions.

module.exports = {
  siteName: 'DIMSRED Study Platform',
  url: 'https://studypro-1j6.pages.dev',
  audience: 'Indian competitive exam aspirants (UPSC, SSC, RRB, JEE, NEET, GATE, Banking, etc.)',

  // What pages exist and what they SHOULD contain
  pages: {
    'index.html': {
      role: 'Homepage — entry point to all exam preparation',
      mustHave: [
        'Working nav links to every section',
        'Exam category cards linking to correct destination pages',
        'No placeholder (#) links that lead nowhere',
        'Clear CTAs: Start Quiz, Browse Papers, Ask Question, Mega Test'
      ],
      examRouting: {
        'UPSC': 'papers.html',
        'SSC': 'ssc-je.html',
        'RRB': 'mega-test.html?exam=RRB',
        'JEE': 'science.html',
        'NEET': 'science.html',
        'GATE': 'polytechnic.html',
        'Banking': 'mega-test.html?exam=Banking',
        'CTET': 'mega-test.html?exam=CTET',
        'NDA': 'ssc-je.html',
        'CDS': 'ssc-je.html',
        'CLAT': 'papers.html'
      }
    },

    'papers.html': {
      role: 'Previous Year Papers with full explanations',
      mustHave: [
        'Year-wise tabs (2023, 2022, 2021, 2020, 2019...)',
        'Exam type tabs: Prelims / Mains / Interview / Sectional',
        'Subject-wise filtering within each paper',
        'Per-question: correct answer + explanation on click',
        'Answer All button with progress',
        'Real question text with options — not truncated'
      ],
      papersAvailable: [
        { id: 'upsc-2023-gs1', exam: 'UPSC', year: 2023, type: 'Prelims', subject: 'General Studies', totalQ: 100 },
        { id: 'upsc-2022-gs1', exam: 'UPSC', year: 2022, type: 'Prelims', subject: 'General Studies', totalQ: 100 },
        { id: 'upsc-2021-gs1', exam: 'UPSC', year: 2021, type: 'Prelims', subject: 'General Studies', totalQ: 100 },
        { id: 'upsc-2020-gs1', exam: 'UPSC', year: 2020, type: 'Prelims', subject: 'General Studies', totalQ: 100 },
        { id: 'upsc-2019-gs1', exam: 'UPSC', year: 2019, type: 'Prelims', subject: 'General Studies', totalQ: 100 },
        { id: 'ssc-cgl-2023-t1', exam: 'SSC CGL', year: 2023, type: 'Tier 1', subject: 'All', totalQ: 100 },
        { id: 'ssc-cgl-2022-t1', exam: 'SSC CGL', year: 2022, type: 'Tier 1', subject: 'All', totalQ: 100 },
        { id: 'rrb-ntpc-2023-cbt1', exam: 'RRB NTPC', year: 2023, type: 'CBT 1', subject: 'All', totalQ: 100 },
        { id: 'ibps-po-2023-pre', exam: 'IBPS PO', year: 2023, type: 'Prelims', subject: 'All', totalQ: 100 }
      ]
    },

    'mega-test.html': {
      role: 'Non-stop quiz across all subjects',
      mustHave: ['Subject filter', 'Question count options', 'Instant explanations', 'Score tracking']
    },

    'mental.html': {
      role: 'Mental ability / reasoning practice',
      mustHave: ['Topic-wise generators', 'Timed practice', 'Progress tracking']
    },

    'science.html': {
      role: 'JEE / NEET science preparation',
      mustHave: ['Physics, Chemistry, Biology sections', 'Topic-wise questions', 'Formula sheets']
    },

    'polytechnic.html': {
      role: 'GATE / polytechnic engineering preparation',
      mustHave: ['Branch-wise sections', 'Engineering maths', 'Technical subjects']
    },

    'ssc-je.html': {
      role: 'SSC JE / NDA / CDS / defence exams',
      mustHave: ['General awareness', 'Technical sections', 'Previous year questions']
    },

    'ask.html': {
      role: 'AI question answering',
      mustHave: ['Natural language input', 'Retrieve + compose pipeline', 'WebLLM fallback']
    },

    'dashboard.html': {
      role: 'Student progress dashboard',
      mustHave: ['Score history', 'Weak areas', 'Streak tracking']
    },

    'figures/index.html': {
      role: 'Diagrams and visual aids',
      mustHave: ['Subject-wise figures', 'Clickable labels', 'Search']
    },

    'map.html': {
      role: 'Interactive world map',
      mustHave: ['Country selection', 'Exam-relevant facts', 'Clickable regions']
    },

    'timeline.html': {
      role: 'Historical timeline',
      mustHave: [
        'ONLY exam-relevant content (Indian history, world history for UPSC)',
        'NO fictional content (Walking Dead, Gundam, Spider-Man, anime)',
        'NO random Wikipedia list pages',
        'Filter by era: Ancient, Medieval, Modern, Contemporary',
        'Indian independence movement, Mughal empire, British raj, etc.'
      ],
      contentFilter: {
        include: [
          'Indian history', 'World wars', 'Indian independence', 'Mughal',
          'British Raj', 'Ancient India', 'Medieval India', 'Modern India',
          'Freedom struggle', 'Post-independence', 'Contemporary India',
          'Art and culture', 'Geography of India', 'Indian polity'
        ],
        exclude: [
          'Walking Dead', 'Gundam', 'Spider-Man', 'anime', 'comics',
          'TV series', 'fictional', 'Marvel', 'DC Comics', 'Final Fantasy',
          'Pokémon', 'video game', 'cartoon', 'Star Wars', 'Star Trek',
          'Battlestar', 'Dragon Ball', 'Naruto', 'One Piece'
        ]
      }
    },

    'improve.html': {
      role: 'Admin panel showing agent activity',
      mustHave: ['Agent log', 'Browser test results', 'Memory lessons', 'Proposals']
    }
  },

  // Content quality rules
  contentRules: {
    questionQuality: {
      // Questions must be meaningful, not blank-filling nonsense
      badPatterns: [
        'The _____ was City in Illinois',
        'The X was Y in Z, US.',
        '_____ is a _____ of _____'
      ],
      goodQuestionTypes: [
        'Multiple choice with 4 options',
        'Assertion-Reasoning',
        'Match the following',
        'Statement-based (A and B)',
        'Chronological ordering'
      ],
      factsShouldRemainFacts: true
    },

    timelineFilter: {
      // Remove fictional/pop-culture entries from timeline
      blacklistPatterns: [
        /Walking Dead/i, /Gundam/i, /Spider-Man/i, /anime/i,
        /Pok[ée]mon/i, /Final Fantasy/i, /Star Wars/i, /Marvel/i,
        /DC Comics/i, /Dragon Ball/i, /Naruto/i, /One Piece/i,
        /Battlestar/i, /Star Trek/i, /cartoon/i, /TV series/i,
        /comic/i, /fictional/i, /video game/i
      ],
      // Keep only exam-relevant historical content
      minRelevanceScore: 0.3
    }
  },

  // Agent behavior rules
  agentRules: [
    'NEVER replace links with # — always map to a real page',
    'Always check what the site SHOULD have vs what it DOES have',
    'Fix placeholder links automatically using examRouting map',
    'When a page has broken content, fix the source not just the symptom',
    'Quality over quantity — 10 good questions beat 100 bad ones',
    'Timeline must filter out fictional content automatically',
    'Papers page needs year-wise AND exam-type tabs',
    'Each exam card must route to the CORRECT subject page',
    'When adding content, follow the page role defined in this file',
    'Self-check: after any fix, verify the page still works'
  ]
};

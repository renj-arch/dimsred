const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'data', 'current-affairs-quiz.json');

// PIB-style current affairs question templates based on static exam-relevant facts.
// In production this is enriched by the PIB feed pipeline; here we seed a
// starter set so the quiz page works immediately.
const seedQuestions = [
  {
    id: 1,
    date: '2026-11-15',
    question: 'Which article of the Indian Constitution deals with the amendment procedure?',
    options: ['Article 356', 'Article 368', 'Article 370', 'Article 324'],
    correct: 1,
    explanation: 'Article 368 in Part XX of the Constitution deals with the powers of Parliament to amend the Constitution and its procedure.',
    topic: 'Polity',
    source: 'PIB'
  },
  {
    id: 2,
    date: '2026-11-15',
    question: 'The "Gaganyaan" mission is associated with which organisation?',
    options: ['DRDO', 'ISRO', 'HAL', 'BARC'],
    correct: 1,
    explanation: 'Gaganyaan is ISRO\u2019s crewed orbital spacecraft programme aimed at sending Indian astronauts to low Earth orbit.',
    topic: 'Science & Technology',
    source: 'PIB'
  },
  {
    id: 3,
    date: '2026-11-14',
    question: 'Which state topped the NITI Aayog SDG India Index 2025-26?',
    options: ['Kerala', 'Tamil Nadu', 'Himachal Pradesh', 'Uttarakhand'],
    correct: 0,
    explanation: 'Kerala has consistently ranked high on the SDG India Index due to strong health and education outcomes.',
    topic: 'Governance',
    source: 'PIB'
  },
  {
    id: 4,
    date: '2026-11-14',
    question: 'RBI\u2019s repo rate as of November 2026 is:',
    options: ['6.50%', '6.25%', '6.00%', '5.75%'],
    correct: 1,
    explanation: 'The Reserve Bank of India maintained the repo rate at 6.25% in its October 2026 policy review.',
    topic: 'Economy',
    source: 'PIB'
  },
  {
    id: 5,
    date: '2026-11-13',
    question: 'Which river is known as the "Ganga of the South"?',
    options: ['Godavari', 'Krishna', 'Kaveri', 'Mahanadi'],
    correct: 0,
    explanation: 'The Godavari River is often referred to as the Ganga of the South due to its length and cultural significance.',
    topic: 'Geography',
    source: 'PIB'
  },
  {
    id: 6,
    date: '2026-11-13',
    question: 'The 2026 Nobel Prize in Physics was awarded for:',
    options: ['Quantum computing', 'Attosecond physics', 'Gravitational waves', 'Dark matter'],
    correct: 1,
    explanation: 'The 2026 Nobel Prize in Physics recognised pioneering work in attosecond science — observing electron dynamics at the attosecond timescale.',
    topic: 'Science & Technology',
    source: 'PIB'
  },
  {
    id: 7,
    date: '2026-11-12',
    question: 'Which Article provides for the imposition of President\u2019s Rule in a state?',
    options: ['Article 352', 'Article 356', 'Article 360', 'Article 371'],
    correct: 1,
    explanation: 'Article 356 empowers the President to impose President\u2019s Rule if the constitutional machinery in a state has failed.',
    topic: 'Polity',
    source: 'PIB'
  },
  {
    id: 8,
    date: '2026-11-12',
    question: 'The "Project Cheetah" relates to reintroduction of cheetahs in which national park?',
    options: ['Jim Corbett', 'Kuno National Park', 'Ranthambore', 'Bandhavgarh'],
    correct: 1,
    explanation: 'Project Cheetah reintroduced African cheetahs into Kuno National Park, Madhya Pradesh.',
    topic: 'Environment',
    source: 'PIB'
  }
];

function buildQuiz(){
  const out = {
    generatedAt: new Date().toISOString(),
    totalQuestions: seedQuestions.length,
    questions: seedQuestions
  };
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + outFile + ' with ' + seedQuestions.length + ' questions');
}

buildQuiz();

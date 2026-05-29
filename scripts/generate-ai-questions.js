var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');

var EXAM_CONFIG = {
  neet: {
    name: 'NEET UG',
    subjects: {
      Physics: '#6366f1',
      Chemistry: '#f59e0b',
      Biology: '#34d399'
    },
    topics: [
      'Physics: Mechanics, Thermodynamics, Optics, Electrostatics, Magnetism, Modern Physics (Class 11-12 NCERT)',
      'Chemistry: Physical, Organic, Inorganic Chemistry (Class 11-12 NCERT)',
      'Biology: Zoology, Botany, Human Physiology, Genetics, Ecology (Class 11-12 NCERT)'
    ]
  },
  jee: {
    name: 'JEE Main',
    subjects: {
      Physics: '#6366f1',
      Chemistry: '#f59e0b',
      Mathematics: '#34d399'
    },
    topics: [
      'Physics: Mechanics, Electrostatics, Optics, Thermodynamics, Modern Physics (Class 11-12)',
      'Chemistry: Physical Chemistry, Organic Chemistry, Inorganic Chemistry (Class 11-12)',
      'Mathematics: Algebra, Calculus, Coordinate Geometry, Trigonometry, Vectors'
    ]
  },
  gate: {
    name: 'GATE',
    subjects: {
      'General Aptitude': '#a855f7',
      'Core Subject': '#6366f1',
      'Engineering Mathematics': '#34d399'
    },
    topics: [
      'General Aptitude: Numerical ability, Logical reasoning, Verbal ability',
      'Core Subject: Engineering core topics (varies by branch - CS, EC, ME, CE)',
      'Engineering Mathematics: Linear algebra, Calculus, Differential equations, Probability'
    ]
  },
  rbi: {
    name: 'RBI Grade B',
    subjects: {
      'General Awareness': '#a855f7',
      'Quantitative Aptitude': '#60a5fa',
      'Reasoning': '#34d399',
      'English': '#fb923c'
    },
    topics: [
      'General Awareness: Banking, Economy, Finance, Current Affairs, Indian Polity',
      'Quantitative Aptitude: Arithmetic, Algebra, Data Interpretation, Statistics',
      'Reasoning: Logical reasoning, Puzzles, Data sufficiency, Coding-decoding',
      'English: Reading comprehension, Grammar, Vocabulary, Sentence correction'
    ]
  },
  cgl: {
    name: 'CGL (SSC)',
    subjects: {
      'General Intelligence': '#a855f7',
      'General Awareness': '#60a5fa',
      'Mathematics': '#34d399',
      'English': '#fb923c'
    },
    topics: [
      'General Intelligence: Analogies, Coding-decoding, Puzzles, Spatial reasoning',
      'General Awareness: Indian History, Geography, Polity, Economy, Science, Current Affairs',
      'Mathematics: Arithmetic, Algebra, Geometry, Trigonometry, Data Interpretation',
      'English: Grammar, Vocabulary, Comprehension, Cloze test, Sentence improvement'
    ]
  },
  agniveer: {
    name: 'Agniveer',
    subjects: {
      'General Knowledge': '#a855f7',
      'Mathematics': '#60a5fa',
      'Science': '#34d399',
      'Reasoning': '#fb923c'
    },
    topics: [
      'General Knowledge: Indian History, Geography, Polity, Sports, Current Affairs',
      'Mathematics: Arithmetic, Algebra, Geometry, Mensuration, Trigonometry',
      'Science: Physics, Chemistry, Biology basics (up to Class 10 level)',
      'Reasoning: Analogies, Series, Coding-decoding, Blood relations, Directions'
    ]
  }
};

function buildPrompt(exam, count) {
  var cfg = EXAM_CONFIG[exam];
  if (!cfg) { console.error('Unknown exam: ' + exam); return null; }

  var sectionsJson = JSON.stringify(cfg.subjects);
  var topicsStr = cfg.topics.join('\n- ');

  return 'You are an expert question writer for ' + cfg.name + ' exam. Generate ' + count + ' multiple choice questions.\n\n' +
    'Topics to cover (pick evenly from these):\n- ' + topicsStr + '\n\n' +
    'Rules:\n' +
    '- Each question must have exactly 4 options (A, B, C, D)\n' +
    '- Exactly one option must be marked correct\n' +
    '- Include a brief solution/explanation\n' +
    '- The "section" field must be one of these exact names: ' + Object.keys(cfg.subjects).join(', ') + '\n' +
    '- Questions should be exam-level difficulty\n' +
    '- Distribute questions evenly across sections\n\n' +
    'Return ONLY valid JSON (no markdown, no code fences, no backticks, no extra text) in this exact format:\n' +
    '{"questions":[{"section":"SubjectName","text":"Question text here?","options":[{"label":"A","text":"Option text","correct":true},{"label":"B","text":"Option text","correct":false},{"label":"C","text":"Option text","correct":false},{"label":"D","text":"Option text","correct":false}],"solution":"Explanation here."}]}';
}

function cleanJson(text) {
  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim();

  // Try direct parse first
  try { return JSON.parse(text); } catch(e) {}

  // Find first { and try parsing progressively shorter text
  var start = text.indexOf('{"questions"');
  if (start === -1) start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found');

  for (var end = text.length; end > start + 10; end--) {
    try {
      var parsed = JSON.parse(text.substring(start, end));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch(e) { /* try shorter */ }
  }

  throw new Error('Could not parse JSON from response');
}

function addToBank(exam, newQuestions) {
  var bankPath = path.join(bankDir, exam + '.json');
  var bank = { questions: [] };
  if (fs.existsSync(bankPath)) {
    bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  }

  var maxId = 0;
  for (var i = 0; i < bank.questions.length; i++) {
    if (bank.questions[i].id > maxId) maxId = bank.questions[i].id;
  }

  // If bank newly created, set metadata
  if (!bank.exam) {
    var cfg = EXAM_CONFIG[exam];
    bank.exam = cfg.name;
    bank.folder = exam;
    bank.sections = Object.keys(cfg.subjects).map(function(s) { return { name: s, color: cfg.subjects[s] }; });
    bank.timerMinutes = 60;
    bank.paperDefaults = {
      titlePrefix: cfg.name + ' Practice Set',
      pageTitleTemplate: cfg.name + ' Practice Set {number} — Solved Paper',
      pageDescTemplate: 'Free ' + cfg.name + ' practice paper set {number} with detailed solutions.',
      metaTemplate: '{questionCount} Q · Solved with answers'
    };
    bank.generatedPapers = [];
  }

  for (var i = 0; i < newQuestions.length; i++) {
    maxId++;
    bank.questions.push({
      id: maxId,
      q: maxId,
      section: newQuestions[i].section,
      text: newQuestions[i].text,
      options: newQuestions[i].options,
      solution: newQuestions[i].solution || ''
    });
  }

  fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf-8');
  return newQuestions.length;
}

async function generateQuestions(exam, count) {
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Try reading from a local file for development
    var keyPath = path.join(root, '.gemini-key');
    if (fs.existsSync(keyPath)) {
      apiKey = fs.readFileSync(keyPath, 'utf-8').trim();
    } else {
      console.error('ERROR: Set GEMINI_API_KEY environment variable or create .gemini-key file');
      process.exit(1);
    }
  }

  var prompt = buildPrompt(exam, count);
  if (!prompt) return;

  var models = ['gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];

  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });

  var success = false;

  for (var attempt = 0; attempt < 3 && !success; attempt++) {
    if (attempt > 0) {
      console.log('  Retry attempt ' + (attempt + 1) + '...');
      await new Promise(function(r) { setTimeout(r, 2000); });
    }

    for (var i = 0; i < models.length && !success; i++) {
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent?key=' + apiKey;
      console.log('  Calling ' + models[i] + ' (' + count + ' questions)...');

      try {
        var response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        });

        var data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          var text = data.candidates[0].content.parts[0].text;
          fs.writeFileSync(path.join(bankDir, '_last-response.txt'), text, 'utf-8');

          try {
            var parsed = cleanJson(text);
            var questions = parsed.questions || parsed;
            if (!Array.isArray(questions)) continue;

            var valid = [];
            for (var qi = 0; qi < questions.length; qi++) {
              var q = questions[qi];
              var hasCorrect = false;
              if (q.text && q.options && q.options.length === 4) {
                for (var ji = 0; ji < q.options.length; ji++) {
                  if (q.options[ji].correct) { hasCorrect = true; break; }
                }
                if (hasCorrect) valid.push(q);
              }
            }

            if (valid.length > 0) {
              addToBank(exam, valid);
              var metaPath = path.join(bankDir, exam + '-meta.json');
              if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
              console.log('  Added ' + valid.length + ' new questions to ' + exam + ' bank');
              success = true;
            }
          } catch (e) {
            continue;
          }
        } else {
          console.log('  ' + models[i] + ' unavailable, trying next...');
        }
      } catch (e) {
        console.log('  ' + models[i] + ' error, trying next...');
      }
    }
  }

  if (!success) {
    console.error('  Failed to generate questions after 3 attempts');
  }
}

async function run() {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/generate-ai-questions.js <exam1> [exam2] ...');
    console.log('Exams: neet, jee, gate, rbi, cgl, agniveer');
    console.log('Use "all" to generate for all exams');
    console.log('Set count with --count=N (default 15)');
    return;
  }

  var count = 15;
  var exams = [];
  for (var i = 0; i < args.length; i++) {
    var m = args[i].match(/^--count=(\d+)$/);
    if (m) { count = parseInt(m[1]); continue; }
    exams.push(args[i]);
  }

  if (exams.length === 1 && exams[0] === 'all') {
    exams = Object.keys(EXAM_CONFIG);
  }

  for (var i = 0; i < exams.length; i++) {
    var exam = exams[i];
    if (!EXAM_CONFIG[exam]) {
      console.log('Unknown exam: ' + exam);
      continue;
    }
    console.log('\n' + exam + ':');
    await generateQuestions(exam, count);
    // Delay between exams to avoid rate limiting
    if (i < exams.length - 1) {
      console.log('  Waiting 3s before next exam...');
      await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }

  console.log('\nDone!');
}

run().catch(function(e) { console.error(e); process.exit(1); });

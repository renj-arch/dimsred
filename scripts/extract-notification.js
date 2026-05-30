var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'data');
var notifPath = path.join(dataDir, 'notifications.json');

var EXAM_LINKS = {
  'ssc cgl': '/cgl/', 'cgl': '/cgl/',
  'rbi grade b': '/rbi/', 'rbi': '/rbi/',
  'ibps po': '/ibps-po/', 'ibps': '/ibps-po/',
  'sbi clerk': '/sbi-clerk/',
  'upsc': '/upsc/',
  'ctet': '/ctet/',
  'ssc gd': '/ssc-gd/',
  'agniveer': '/agniveer/',
  'gate': '/gate/',
  'neet': '/neet/',
  'jee': '/jee/',
};

function getApiKey(name) {
  if (process.env[name]) return process.env[name];
  var FILE_MAP = { GROQ_API_KEY: '.groq-key', GEMINI_API_KEY: '.gemini-key', HUGGINGFACE_API_KEY: '.hf-key' };
  var keyFile = path.join(root, FILE_MAP[name] || '');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf-8').trim();
  return null;
}

function cleanJson(text) {
  if (!text) return null;
  text = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}') + 1;
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.substring(start, end)); }
  catch (e) { return null; }
}

function findExamLink(tag, title) {
  var lower = (tag + ' ' + title).toLowerCase();
  for (var key in EXAM_LINKS) {
    if (lower.indexOf(key) !== -1) return EXAM_LINKS[key];
  }
  return null;
}

function months() { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; }

async function callGroq(apiKey, prompt) {
  var models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  for (var m = 0; m < models.length; m++) {
    console.log('  Groq model: ' + models[m]);
    for (var r = 0; r < 3; r++) {
      try {
        var resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: models[m], messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2048 })
        });
        if (resp.status === 429) { console.log('    Rate limited, waiting 15s...'); await new Promise(function(r) { setTimeout(r, 15000); }); continue; }
        if (!resp.ok) { console.log('    HTTP ' + resp.status); await new Promise(function(r) { setTimeout(r, 3000); }); continue; }
        var data = await resp.json();
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      } catch (e) { console.log('    Error: ' + e.message); await new Promise(function(r) { setTimeout(r, 3000); }); }
    }
  }
  return null;
}

async function callGemini(apiKey, prompt) {
  var models = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001'];
  var body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  for (var m = 0; m < models.length; m++) {
    console.log('  Gemini model: ' + models[m]);
    try {
      var resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[m] + ':generateContent?key=' + apiKey, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body
      });
      var data = await resp.json();
      if (data.error) { console.log('    ' + (data.error.status || data.error.message)); continue; }
      var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0].text || '';
      if (text) return text;
    } catch (e) { console.log('    Error: ' + e.message); }
  }
  return null;
}

async function callHuggingFace(apiKey, prompt) {
  var models = ['mistralai/Mistral-7B-Instruct-v0.3', 'HuggingFaceH4/zephyr-7b-beta', 'microsoft/Phi-3-mini-4k-instruct'];
  var body = JSON.stringify({ inputs: prompt, parameters: { temperature: 0.1, max_new_tokens: 2048, return_full_text: false } });
  for (var m = 0; m < models.length; m++) {
    console.log('  HF model: ' + models[m]);
    try {
      var resp = await fetch('https://api-inference.huggingface.co/models/' + models[m], {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: body
      });
      if (resp.status === 429) { console.log('    Rate limited'); continue; }
      if (!resp.ok) { var err = await resp.text(); console.log('    HTTP ' + resp.status); continue; }
      var data = await resp.json();
      var text = data[0] && data[0].generated_text || '';
      if (text) return text;
    } catch (e) { console.log('    Error: ' + e.message); }
  }
  return null;
}

async function extract(text) {
  var prompt = 'You are an expert data extraction assistant. Extract exam notification details from the text below.\n\n' +
    'Return ONLY valid JSON (no markdown) in this exact format:\n' +
    '{\n  "exam_name": "NEET UG",\n  "board": "National Testing Agency",\n  "exam_date": "May 15, 2026",\n  "application_deadline": "March 30, 2026",\n  "syllabus_url": "https://nta.ac.in/neet-syllabus"\n}\n\n' +
    'Rules:\n' +
    '- exam_name: short recognizable name (SSC CGL, NEET UG, JEE Main, UPSC CSE, RBI Grade B, IBPS PO, etc.)\n' +
    '- board: the conducting body name\n' +
    '- exam_date: the exam date if mentioned, otherwise null\n' +
    '- application_deadline: the last date to apply if mentioned, otherwise null\n' +
    '- syllabus_url: the official syllabus URL if mentioned, otherwise null\n' +
    '- If a field is not found in the text, set it to null. Do NOT make up values.\n' +
    '- CRITICAL: Only extract dates that are explicitly stated in the text. Do not invent or guess.\n\n' +
    'Text to extract from:\n' +
    text;

  var groqKey = getApiKey('GROQ_API_KEY');
  var geminiKey = getApiKey('GEMINI_API_KEY');
  var hfKey = getApiKey('HUGGINGFACE_API_KEY');
  var result = '';

  if (groqKey) {
    console.log('Trying Groq...');
    result = await callGroq(groqKey, prompt);
  } else { console.log('No GROQ_API_KEY found'); }

  if (!result && geminiKey) {
    console.log('Trying Gemini...');
    result = await callGemini(geminiKey, prompt);
  } else if (!result) { console.log('No GEMINI_API_KEY found'); }

  if (!result && hfKey) {
    console.log('Trying HuggingFace...');
    result = await callHuggingFace(hfKey, prompt);
  } else if (!result) { console.log('No HUGGINGFACE_API_KEY found'); }

  return cleanJson(result);
}

function toNotifFormat(extracted) {
  if (!extracted || !extracted.exam_name) return null;

  var tag = extracted.exam_name;
  var title = extracted.exam_name;
  if (extracted.board) title = extracted.exam_name + ' - ' + extracted.board;

  // Parse application_deadline to closing (DD/MM/YYYY)
  var closing = null;
  if (extracted.application_deadline) {
    var d = new Date(extracted.application_deadline);
    if (!isNaN(d.getTime())) {
      var dd = String(d.getDate()).padStart(2,'0');
      var mm = String(d.getMonth() + 1).padStart(2,'0');
      var yyyy = d.getFullYear();
      closing = dd + '/' + mm + '/' + yyyy;
    }
  }

  // Parse exam_date to startDay, startMonth, startYear
  var startDay = null, startMonth = null, startYear = null;
  if (extracted.exam_date) {
    var d = new Date(extracted.exam_date);
    if (!isNaN(d.getTime())) {
      startDay = d.getDate();
      startMonth = months()[d.getMonth()];
      startYear = d.getFullYear();
    }
  }

  // If no exam date, use today as start (notification release date approximation)
  if (!startDay) {
    var now = new Date();
    startDay = now.getDate();
    startMonth = months()[now.getMonth()];
    startYear = now.getFullYear();
  }

  var link = findExamLink(tag, '');

  return {
    tag: tag,
    title: title,
    startDay: startDay,
    startMonth: startMonth,
    startYear: startYear,
    closing: closing || 'Check website',
    vacancy: extracted.board || '',
    source: extracted.syllabus_url ? new URL(extracted.syllabus_url).hostname : '',
    link: link,
    addedAt: new Date().toISOString().split('T')[0]
  };
}

async function saveToFile(notif) {
  var existing = [];
  if (fs.existsSync(notifPath)) {
    try { existing = JSON.parse(fs.readFileSync(notifPath, 'utf-8')); }
    catch (e) { existing = []; }
  }

  // Check for duplicates
  var isDup = false;
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].tag === notif.tag && existing[i].title === notif.title) {
      isDup = true;
      break;
    }
  }
  if (isDup) {
    console.log('Duplicate — already exists. Skipping.');
    return;
  }

  existing.push(notif);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(notifPath, JSON.stringify({ notifications: existing, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('Saved to notifications.json (' + existing.length + ' total).');
}

async function run() {
  // Read text from command-line arg or stdin
  var inputText = process.argv[2];
  if (!inputText) {
    // Try reading from stdin
    var chunks = [];
    if (!process.stdin.isTTY) {
      for await (var chunk of process.stdin) chunks.push(chunk);
      inputText = Buffer.concat(chunks).toString('utf-8').trim();
    }
  }

  if (!inputText) {
    console.log('Usage: node scripts/extract-notification.js "<notification text>"');
    console.log('   or: cat notification.txt | node scripts/extract-notification.js');
    process.exit(1);
  }

  console.log('Extracting from provided text...');
  var extracted = await extract(inputText);
  if (!extracted) {
    console.log('Failed to extract. Check API keys.');
    process.exit(1);
  }

  console.log('\n--- Extracted Data ---');
  console.log(JSON.stringify(extracted, null, 2));

  var notif = toNotifFormat(extracted);
  if (!notif) {
    console.log('Could not convert to notification format.');
    process.exit(1);
  }

  console.log('\n--- Notification Format ---');
  console.log(JSON.stringify(notif, null, 2));

  // Ask to save
  console.log('\nSave to notifications.json? (y/n)');
  // Non-interactive: auto-save with --save flag
  if (process.argv.indexOf('--save') !== -1) {
    await saveToFile(notif);
  } else {
    console.log('Pass --save flag to append to notifications.json');
  }
}

run().catch(function(e) { console.error(e); process.exit(1); });

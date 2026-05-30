var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'data');

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
  var keyFile = path.join(root, name === 'GROQ_API_KEY' ? '.groq-key' : '.gemini-key');
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

function isExpired(closingStr) {
  if (!closingStr) return false;
  var parts = closingStr.split('/');
  if (parts.length !== 3) return false;
  var d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return d < new Date();
}

function mergeNotifications(existing, incoming) {
  var seen = {};
  for (var i = 0; i < existing.length; i++) {
    var n = existing[i];
    if (isExpired(n.closing)) continue;
    var key = n.tag + '|' + n.title;
    seen[key] = n;
  }
  for (var i = 0; i < incoming.length; i++) {
    var n = incoming[i];
    if (!n.tag || !n.title || !n.closing) continue;
    if (isExpired(n.closing)) continue;
    var key = n.tag + '|' + n.title;
    if (!seen[key]) {
      n.link = findExamLink(n.tag, n.title);
      n.addedAt = new Date().toISOString().split('T')[0];
      seen[key] = n;
    }
  }
  var result = [];
  for (var key in seen) { result.push(seen[key]); }
  result.sort(function(a, b) {
    return (a.closing || '').localeCompare(b.closing || '');
  });
  return result;
}

async function callGroq(apiKey, prompt) {
  var models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  for (var m = 0; m < models.length; m++) {
    console.log('  Groq model: ' + models[m]);
    for (var r = 0; r < 3; r++) {
      try {
        var resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: models[m], messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 })
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

async function run() {
  var prompt = 'You are a helpful assistant that provides current exam and recruitment notifications in India. ' +
    'Return ONLY valid JSON (no markdown) in this exact format:\n' +
    '{\n  "notifications": [\n    {\n      "tag": "SSC CGL",\n      "title": "Combined Graduate Level Exam 2026",\n      "startDay": 20,\n      "startMonth": "Jun",\n      "startYear": 2026,\n      "closing": "19/07/2026",\n      "vacancy": "~8,000+ vacancies",\n      "source": "ssc.nic.in"\n    }\n  ]\n}\n\n' +
    'Rules:\n' +
    '- tag should be short exam name (SSC CGL, RBI Grade B, IBPS PO, SBI Clerk, UPSC, CTET, SSC GD, NEET UG, JEE Main, GATE, RRB, Agniveer, etc.)\n' +
    '- title should be the full post/recruitment name\n' +
    '- startDay, startMonth, startYear are when the notification was released (number, 3-letter abbrev, 4-digit year)\n' +
    '- closing is the last date to apply in DD/MM/YYYY format\n' +
    '- vacancy is a short description like "~8,000+ vacancies" or "Eligibility exam"\n' +
    '- source is the official website domain\n' +
    '- Only include notifications that are currently open (closing date has not passed yet)\n' +
    '- DO NOT include any notification whose closing date has already passed\n' +
    '- Include 8-12 notifications covering different exams (banking, railway, SSC, UPSC, teaching, medical, engineering)\n' +
    '- Use realistic dates and titles based on actual exam cycles\n' +
    '- CRITICAL: Ensure closing dates are accurate. Do NOT guess or make up dates. Only include exams you are confident about.\n' +
    '- Today is ' + new Date().toISOString().split('T')[0] + '. All closing dates should be in the future (between today and Dec 2026).';

  var notifPath = path.join(dataDir, 'notifications.json');
  var existing = [];
  if (fs.existsSync(notifPath)) {
    try { existing = JSON.parse(fs.readFileSync(notifPath, 'utf-8')); }
    catch (e) { existing = []; }
  }

  var text = '';
  var groqKey = getApiKey('GROQ_API_KEY');
  var geminiKey = getApiKey('GEMINI_API_KEY');

  // Try Groq first, then Gemini, then keep existing
  if (groqKey) {
    console.log('Trying Groq...');
    text = await callGroq(groqKey, prompt);
  } else {
    console.log('No GROQ_API_KEY found');
  }

  if (!text && geminiKey) {
    console.log('Trying Gemini...');
    text = await callGemini(geminiKey, prompt);
  } else if (!text) {
    console.log('No GEMINI_API_KEY found');
  }

  if (!text) {
    if (existing.length > 0) {
      console.log('All providers failed. Keeping existing (' + existing.length + ' notifications).');
      return;
    }
    console.log('All providers failed, no existing data. Using built-in fallback.');
    var now = new Date();
    var dd = String(now.getDate()).padStart(2,'0');
    var mm = String(now.getMonth() + 1).padStart(2,'0');
    var yyyy = now.getFullYear();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var currentMonth = months[now.getMonth()];
    var fallback = [
      { tag:'SSC CGL', title:'Combined Graduate Level Examination ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit ssc.nic.in', link:'/cgl/' },
      { tag:'RBI Grade B', title:'Grade B Officer Recruitment ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit rbi.org.in', link:'/rbi/' },
      { tag:'UPSC', title:'Civil Services Examination ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit upsc.gov.in', link:'/upsc/' },
      { tag:'NEET UG', title:'Undergraduate Medical Entrance ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit nta.nic.in', link:'/neet/' },
      { tag:'IBPS PO', title:'Probationary Officer Recruitment ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit ibps.in', link:'/ibps-po/' },
      { tag:'SBI Clerk', title:'Junior Associate Recruitment ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit sbi.co.in', link:'/sbi-clerk/' },
      { tag:'SSC GD', title:'Constable General Duty Exam ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit ssc.nic.in', link:'/ssc-gd/' },
      { tag:'CTET', title:'Central Teacher Eligibility Test ' + yyyy, startDay:now.getDate(), startMonth:currentMonth, startYear:yyyy, closing:'30/06/' + yyyy, vacancy:'Visit ctet.nic.in', link:'/ctet/' },
    ];
    fs.writeFileSync(notifPath, JSON.stringify({ notifications: fallback, updatedAt: now.toISOString() }, null, 2), 'utf-8');
    console.log('Saved ' + fallback.length + ' fallback notifications');
    return;
  }

  var parsed = cleanJson(text);
  if (!parsed || !parsed.notifications || !Array.isArray(parsed.notifications)) {
    console.log('Failed to parse response. Keeping existing.');
    return;
  }

  var incoming = parsed.notifications.filter(function(n) {
    if (!n.tag || !n.title || !n.closing) return false;
    var parts = n.closing.split('/');
    if (parts.length !== 3) return false;
    return true;
  });
  console.log('Received ' + incoming.length + ' notifications from AI');

  var merged = mergeNotifications(existing, incoming);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(notifPath, JSON.stringify({ notifications: merged, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('Saved ' + merged.length + ' active notifications');
}

run().catch(function(e) { console.error(e); process.exit(1); });

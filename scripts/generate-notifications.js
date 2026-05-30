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

async function callGroq(apiKey, prompt, model) {
  if (!model) model = 'llama3-70b-8192';
  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var body = JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096
  });

  for (var retry = 0; retry < 3; retry++) {
    try {
      var response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: body
      });
      if (response.status === 429) {
        console.log('  Rate limited, waiting 10s...');
        await new Promise(function(r) { setTimeout(r, 10000); });
        continue;
      }
      if (!response.ok) {
        console.log('  HTTP ' + response.status + ', retry ' + (retry + 1));
        await new Promise(function(r) { setTimeout(r, 3000); });
        continue;
      }
      var data = await response.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } catch (e) {
      console.log('  Error: ' + e.message + ', retry ' + (retry + 1));
      await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }
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

async function run() {
  var apiKey = getApiKey('GROQ_API_KEY');
  if (!apiKey) {
    console.log('No GROQ_API_KEY found, skipping notification generation');
    process.exit(0);
  }

  var notifPath = path.join(dataDir, 'notifications.json');
  var existing = [];
  if (fs.existsSync(notifPath)) {
    try { existing = JSON.parse(fs.readFileSync(notifPath, 'utf-8')); }
    catch (e) { existing = []; }
  }

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
    '- Use realistic dates and titles based on actual exam cycles — verify that the application window is genuinely open\n' +
    '- CRITICAL: Ensure closing dates are accurate. Do NOT guess or make up dates. Only include exams you are confident about.\n' +
    '- Today is ' + new Date().toISOString().split('T')[0] + '. All closing dates should be in the future (between today and Dec 2026).';

  console.log('Calling Groq for exam notifications...');
  var text = await callGroq(apiKey, prompt);
  if (!text) {
    console.log('Failed to get response from Groq, keeping existing notifications');
    return;
  }

  var parsed = cleanJson(text);
  if (!parsed || !parsed.notifications || !Array.isArray(parsed.notifications)) {
    console.log('Failed to parse notifications from response, keeping existing');
    return;
  }

  var incoming = parsed.notifications.filter(function(n) {
    if (!n.tag || !n.title || !n.closing) return false;
    var parts = n.closing.split('/');
    if (parts.length !== 3) return false;
    var dd = parseInt(parts[0]), mm = parseInt(parts[1]) - 1, yy = parseInt(parts[2]);
    if (yy < 2025 || yy > 2027) return false;
    return true;
  });
  console.log('Received ' + incoming.length + ' notifications from AI');

  var merged = mergeNotifications(existing, incoming);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(notifPath, JSON.stringify({ notifications: merged, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');

  console.log('Saved ' + merged.length + ' active notifications');
}

run().catch(function(e) { console.error(e); process.exit(1); });

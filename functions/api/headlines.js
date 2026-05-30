var GROUPS = [
  { emoji: '🎯', topics: 'government schemes, policy decisions, parliamentary bills' },
  { emoji: '💰', topics: 'economy, GDP, inflation, banking, stock market, fiscal policy' },
  { emoji: '🚀', topics: 'ISRO, space missions, defence, DRDO, nuclear' },
  { emoji: '🔬', topics: 'science, technology, health, medicine, research, vaccine' },
  { emoji: '🌏', topics: 'foreign policy, trade deals, international relations, summits' },
  { emoji: '📊', topics: 'economic data, surveys, reports, rankings, indices' },
  { emoji: '🏗️', topics: 'infrastructure, highways, railways, urban development' },
  { emoji: '📱', topics: 'digital India, UPI, tech, startups, IT, telecom' },
  { emoji: '🌾', topics: 'agriculture, MSP, farmers, rural development' },
  { emoji: '⚡', topics: 'energy, renewable, power, oil, coal, solar, wind' },
  { emoji: '📚', topics: 'education, NEP, exams, universities, research' },
  { emoji: '🏛️', topics: 'judiciary, supreme court, legal reforms, constitutional' },
  { emoji: '🛡️', topics: 'armed forces, paramilitary, security, cyber security' },
  { emoji: '🏆', topics: 'sports, olympics, world cup, championships, medals' },
  { emoji: '🌱', topics: 'environment, climate change, pollution, conservation' },
];

var MODELS = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

async function callGroq(apiKey, prompt, model) {
  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var body = JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 1024
  });

  for (var retry = 0; retry < 2; retry++) {
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: body
      });
      if (!resp.ok) { await new Promise(function(r) { setTimeout(r, 2000); }); continue; }
      var data = await resp.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } catch (e) { await new Promise(function(r) { setTimeout(r, 2000); }); }
  }
  return null;
}

function cleanJson(text) {
  if (!text) return null;
  text = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  var start = text.indexOf('[');
  var end = text.lastIndexOf(']') + 1;
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.substring(start, end)); } catch (e) { return null; }
}

export async function onRequestGet(context) {
  var apiKey = context.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  var group = GROUPS[Math.floor(Math.random() * GROUPS.length)];
  var prompt = 'Generate 3 short India current-affairs headlines (max 12 words each) about ' + group.topics + '. ' +
    'Return ONLY a JSON array (no markdown, no extra text):\n' +
    '["headline one here", "headline two here", "headline three here"]\n' +
    'Today is ' + new Date().toISOString().split('T')[0] + '. Include specific facts/numbers when possible.';

  var text = '';
  for (var i = 0; i < MODELS.length; i++) {
    text = await callGroq(apiKey, prompt, MODELS[i]);
    if (text) break;
  }

  if (!text) {
    return new Response(JSON.stringify({ error: 'Failed to generate' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  var headlines = cleanJson(text);
  if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid response' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ headlines: headlines, emoji: group.emoji, topic: group.topics }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  });
}

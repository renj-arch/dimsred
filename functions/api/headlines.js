var EMOJIS = ['🎯','💰','🚀','🔬','🌏','📊','🏗️','📱','🌾','⚡','📚','🏛️','🛡️','🏆','🌱'];
var RSS_FEEDS = [
  'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-IN&gl=IN&ceid=IN:en',
  'https://feeds.feedburner.com/ndtvnews-latest',
];

async function fetchRss(url) {
  try {
    var resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return null;
    var xml = await resp.text();
    var titles = [];
    var regex = /<title[^>]*>([^<]+)<\/title>/gi;
    var m;
    while ((m = regex.exec(xml)) !== null) {
      var t = m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (t && t.toLowerCase().indexOf('google') === -1 && t.toLowerCase().indexOf('skip') === -1 && titles.indexOf(t) === -1) {
        if (t.length > 15 && t.length < 200) titles.push(t);
      }
    }
    return titles.length >= 3 ? titles : null;
  } catch (e) { return null; }
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

export async function onRequestGet(context) {
  var all = [];

  for (var i = 0; i < RSS_FEEDS.length; i++) {
    var titles = await fetchRss(RSS_FEEDS[i]);
    if (titles) { all = all.concat(titles); }
  }

  if (all.length >= 3) {
    shuffle(all);
    var pick = all.slice(0, 3);
    var emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return new Response(JSON.stringify({ headlines: pick, emoji: emoji }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  }

  // Fallback to Groq if RSS fails
  var apiKey = context.env.GROQ_API_KEY;
  if (apiKey) {
    var prompt = 'Generate 3 short India current-affairs headlines (max 12 words each) about recent news. ' +
      'Return ONLY a JSON array: ["h1","h2","h3"]\nToday is ' + new Date().toISOString().split('T')[0];
    var models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    for (var i = 0; i < models.length; i++) {
      var text = await callGroq(apiKey, prompt, models[i]);
      if (text) {
        var parsed = cleanJson(text);
        if (parsed && Array.isArray(parsed) && parsed.length >= 3) {
          return new Response(JSON.stringify({ headlines: parsed.slice(0, 3), emoji: '📡' }), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ error: 'No news available' }), {
    status: 502, headers: { 'Content-Type': 'application/json' }
  });
}

async function callGroq(apiKey, prompt, model) {
  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var body = JSON.stringify({
    model: model || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8, max_tokens: 512
  });
  for (var r = 0; r < 2; r++) {
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: body
      });
      if (!resp.ok) { await new Promise(function(x) { setTimeout(x, 2000); }); continue; }
      var data = await resp.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } catch (e) { await new Promise(function(x) { setTimeout(x, 2000); }); }
  }
  return null;
}

function cleanJson(text) {
  if (!text) return null;
  text = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  var s = text.indexOf('['), e = text.lastIndexOf(']') + 1;
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(text.substring(s, e)); } catch (x) { return null; }
}

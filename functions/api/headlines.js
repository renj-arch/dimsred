var EMOJIS = ['🎯','💰','🚀','🔬','🌏','📊','🏗️','📱','🌾','⚡','📚','🏛️','🛡️','🏆','🌱'];

var RSS_FEEDS = [
  'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  'https://www.thehindu.com/news/national/feeder/default.rss',
  'https://indianexpress.com/feed/',
  'https://feeds.feedburner.com/ndtvnews-latest',
  'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-IN&gl=IN&ceid=IN:en',
];

async function fetchRss(url) {
  try {
    var resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS-reader)' } });
    if (!resp.ok) return null;
    var xml = await resp.text();
    var titles = [];
    var regex = /<title[^>]*>([^<]+)<\/title>/gi;
    var m;
    while ((m = regex.exec(xml)) !== null) {
      var t = m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<!\[CDATA\[([^\]]*)\]\]>/g, '$1').trim();
      if (!t || t.length < 20 || t.length > 250) continue;
      if (/google|feedburner|ads|advertisement/i.test(t)) continue;
      if (titles.indexOf(t) !== -1) continue;
      titles.push(t);
    }
    return titles.length >= 2 ? titles : null;
  } catch (e) { return null; }
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

var FALLBACK = [
  'PM Modi to launch multiple development projects this week',
  'India GDP growth projected to lead major economies',
  'New education policy reforms take effect from July',
  'Stock market hits record high on foreign investment inflow',
  'ISRO successfully tests new satellite launch vehicle',
  'Supreme Court issues landmark judgment on data privacy',
  'Digital payments cross record 20 billion transactions',
  'Government announces new scheme for startup funding',
  'India wins bid to host major international conference',
  'Monsoon arrives early, covers most parts of country',
];

export async function onRequest(context) {
  var all = [];

  for (var i = 0; i < RSS_FEEDS.length; i++) {
    var titles = await fetchRss(RSS_FEEDS[i]);
    if (titles) { all = all.concat(titles); }
  }

  if (all.length >= 3) {
    var unique = [];
    var seen = {};
    for (var i = 0; i < all.length; i++) {
      if (!seen[all[i]]) { seen[all[i]] = true; unique.push(all[i]); }
    }
    shuffle(unique);
    var pick = unique.slice(0, 3);
    var emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return new Response(JSON.stringify({ headlines: pick, emoji: emoji }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  }

  // Try Groq as fallback
  var apiKey = context.env.GROQ_API_KEY;
  if (apiKey) {
    var models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    for (var i = 0; i < models.length; i++) {
      var text = await callGroq(apiKey, 'Generate 3 short India current-affairs headlines. Return ONLY a JSON array: ["h1","h2","h3"]', models[i]);
      if (text) {
        try {
          var parsed = JSON.parse(text.replace(/```json\s*/gi, '').replace(/```/g, '').trim());
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return new Response(JSON.stringify({ headlines: parsed.slice(0, 3), emoji: '📡' }), {
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
            });
          }
        } catch(e) {}
      }
    }
  }

  // Ultimate fallback: static list
  shuffle(FALLBACK);
  return new Response(JSON.stringify({ headlines: FALLBACK.slice(0, 3), emoji: '📡' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
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

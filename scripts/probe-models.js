'use strict';
// Probe the hosted model routes with one tiny call each and print which answer.
// "Listed in /v1/models" is not enough: the NVIDIA account also returns models
// it cannot invoke (404) or that are retired (410). Only a real POST counts.
//
//   NVIDIA_API_KEY=... OPENROUTER_API_KEY=... node scripts/probe-models.js
//
// Prints: <status> <ms> <route> <model> [error snippet], then a LIVE summary.
const NIM = 'https://integrate.api.nvidia.com/v1/chat/completions';
const OR = 'https://openrouter.ai/api/v1/chat/completions';

const NVIDIA_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'mistralai/mistral-large-4-1t-a52b',
  'mistralai/mistral-large-2-instruct',
  'nvidia/nemotron-3.5-super-vl-120b-a12b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/nemotron-3.5-bolt-e4b',
  'minimaxai/minimax-m3.1-flash',
  'z-ai/glm-5.3-flash',
  'qwen/qwen3-next-80b-a3b-instruct',
  'deepseek-ai/deepseek-v4.1-flash'
];

const OR_MODELS = [
  'mistralai/mistral-large',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it',
  'google/gemma-4-31b-it:free',
  'google/gemma-3-27b-it',
  'google/gemma-3-27b-it:free'
];

// Print the OpenRouter ids that actually exist, so a probe never tests a slug
// the provider does not serve.
async function discover(key) {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { authorization: 'Bearer ' + key } });
    const j = await r.json();
    const ids = (j.data || []).map(m => m.id);
    console.log('=== OpenRouter ids matching gemma | mistral-large | qwen3 (' + ids.length + ' models listed) ===');
    ids.filter(id => /gemma|mistral-large|qwen3/i.test(id)).forEach(id => console.log('  ' + id));
    console.log('');
  } catch (e) {
    console.log('OpenRouter model-list discovery failed: ' + e.message + '\n');
  }
}

async function probe(route, url, key, model, extra) {
  const t0 = Date.now();
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 120000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', authorization: 'Bearer ' + key }, extra || {}),
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 8, temperature: 0 }),
      signal: ctl.signal
    });
    clearTimeout(to);
    const ms = Date.now() - t0;
    const body = await r.text();
    console.log(String(r.status).padEnd(4) + ' ' + String(ms + 'ms').padStart(8) + '  ' + route.padEnd(10) + ' ' + model + '  ' + (r.ok ? '' : body.slice(0, 110).replace(/\s+/g, ' ')));
    return r.ok;
  } catch (e) {
    clearTimeout(to);
    console.log('ERR  ' + String(Date.now() - t0 + 'ms').padStart(8) + '  ' + route.padEnd(10) + ' ' + model + '  ' + e.message);
    return false;
  }
}

(async () => {
  const results = [];
  const nv = process.env.NVIDIA_API_KEY;
  if (nv) {
    for (const m of NVIDIA_MODELS) results.push(['nvidia', m, await probe('nvidia', NIM, nv, m)]);
  } else {
    console.log('NVIDIA_API_KEY not set — skipping NVIDIA probes');
  }
  const or = process.env.OPENROUTER_API_KEY;
  if (or) {
    await discover(or);
    for (const m of OR_MODELS) results.push(['openrouter', m, await probe('openrouter', OR, or, m, { 'HTTP-Referer': 'https://vlymbooq.qzz.io', 'X-Title': 'model-probe' })]);
  } else {
    console.log('OPENROUTER_API_KEY not set — skipping OpenRouter probes');
  }
  const thUrl = process.env.TOKENHARBOR_URL || '';
  const thKey = process.env.TOKENHARBOR_API_KEY || '';
  const thModel = process.env.TOKENHARBOR_MODEL || 'deepseek-v4.1-flash';
  if (thKey && thUrl) {
    results.push(['tokenharbor', thModel, await probe('tokenharbor', thUrl, thKey, thModel)]);
  } else {
    console.log('TOKENHARBOR_URL / TOKENHARBOR_API_KEY not set — skipping Token Harbor probe');
  }
  console.log('\n=== LIVE (answered 200) ===');
  results.filter(r => r[2]).forEach(r => console.log('  ' + r[0] + '  ' + r[1]));
  console.log('live: ' + results.filter(r => r[2]).length + '/' + results.length);
})();

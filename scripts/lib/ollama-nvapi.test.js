// Tests the optional NVIDIA NIM backend in scripts/lib/ollama.js.
// Plain node, no framework: exits non-zero on failure so it can gate CI.
const path = require('path');
const fs = require('fs');
const os = require('os');

const MOD = path.resolve(__dirname, 'ollama.js');
let pass = 0, fail = 0;

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' -- ' + extra : '')); }
}

// The module reads its env at require time, so each case loads a fresh copy.
function fresh(env) {
  delete require.cache[require.resolve(MOD)];
  delete require.cache[require.resolve(path.join(__dirname, 'opencode-zen.js'))];
  for (const k of Object.keys(process.env)) {
    if (/^(NVAPI|NVIDIA_|GROQ|OPENROUTER|OPENCODE|OLLAMA_|GH_MODELS|OD_FAKE_TEXT)/.test(k)) delete process.env[k];
  }
  Object.assign(process.env, env);
  return require(MOD);
}

function captureLogs(fn) {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => { logs.push(a.join(' ')); };
  return Promise.resolve()
    .then(fn)
    .finally(() => { console.log = orig; })
    .then(() => logs, (e) => { logs.push('THREW:' + e.message); return logs; });
}

(async () => {
  console.log('\nCASE 1: NVAPI=1 + key routes to NVIDIA and sends the model id');
  let seen = null;
  global.fetch = async function (url, init) {
    seen = { url: url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '  hello from nvidia  ' } }] }) };
  };
  let m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', NVIDIA_MODEL: 'nvidia/nemotron-3-ultra-550b-a55b' });
  let out = await m.callLLM([{ role: 'user', content: 'hi' }], { numPredict: 100 });
  ok('returns the model text, trimmed', out.text === 'hello from nvidia', JSON.stringify(out.text));
  ok('posts to the NVIDIA chat endpoint', /integrate\.api\.nvidia\.com\/v1\/chat\/completions/.test(seen.url), seen.url);
  ok('sends the configured model', seen.body.model === 'nvidia/nemotron-3-ultra-550b-a55b', seen.body.model);
  ok('sends the bearer key', seen.auth === 'Bearer nvapi-test', seen.auth);
  ok('never streams (NVIDIA json path)', seen.body.stream === false);

  console.log('\nCASE 2: max_tokens is clamped to the documented 16384');
  await m.callLLM([{ role: 'user', content: 'hi' }], { numPredict: 999999 });
  ok('clamped', seen.body.max_tokens === 16384, String(seen.body.max_tokens));

  console.log('\nCASE 3: NOT wired when NVAPI is unset (default stays local)');
  let called = false;
  global.fetch = async function () { called = true; return { ok: true, json: async () => ({}) }; };
  m = fresh({ NVIDIA_API_KEY: 'nvapi-test' });
  try { await m.callLLM([{ role: 'user', content: 'hi' }], {}); } catch (e) { /* local host is dead on purpose */ }
  ok('did not call NVIDIA', called === false);

  console.log('\nCASE 4: a 403/404 explains playground-only instead of looking like a bad key');
  global.fetch = async function () {
    return { ok: false, status: 404, text: async () => 'Function Not Found' };
  };
  m = fresh({
    NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', NVIDIA_MODEL: 'moonshotai/kimi-k3.1-pro',
    OLLAMA_HOST: 'http://127.0.0.1:9'   // closed port: local fallback fails fast
  });
  const logs = await captureLogs(() => m.callLLM([{ role: 'user', content: 'hi' }], { timeoutMs: 2000 }));
  const joined = logs.join('\n');
  ok('mentions playground-only', /playground-only/.test(joined), joined);
  ok('says HTTP 404', /HTTP 404/.test(joined), joined);
  ok('falls through to the next backend', /trying the next backend/.test(joined), joined);

  console.log('\nCASE 5: short aliases resolve to full NVIDIA ids');
  seen = null;
  global.fetch = async function (url, init) {
    seen = { body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
  };
  m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', NVIDIA_MODEL: 'nemotron-3-ultra' });
  await m.callLLM([{ role: 'user', content: 'hi' }], {});
  ok('alias sent as the full id', seen.body.model === 'nvidia/nemotron-3-ultra-550b-a55b', seen.body.model);
  ok('module exports the resolved id', m.NVIDIA_MODEL === 'nvidia/nemotron-3-ultra-550b-a55b', m.NVIDIA_MODEL);

  console.log('\nCASE 5b: an empty NVIDIA_MODEL resolves to the catalogue default');
  m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test' });
  ok('default is a verified-live model', m.NVIDIA_MODEL === 'nvidia/nemotron-3-ultra-550b-a55b', m.NVIDIA_MODEL);

  console.log('\nCASE 6: the catalogue itself');
  const cat = require(path.join(__dirname, 'nvidia-models.js'));
  ok('nemotron-3-ultra -> recommended', cat.resolve('nemotron-3-ultra').id === 'nvidia/nemotron-3-ultra-550b-a55b' && cat.resolve('nemotron-3-ultra').tier === 'recommended');
  ok('glm-5.3-flash -> trial', cat.resolve('glm-5.3-flash').id === 'z-ai/glm-5.3-flash' && cat.resolve('glm-5.3-flash').tier === 'trial');
  ok('every alias maps to a full id', Object.keys(cat.all()).every(a => /^[a-z0-9.-]+\/[a-z0-9._-]+$/.test(cat.all()[a])));
  ok('full id passes through', cat.resolve('nvidia/nemotron-3-ultra-550b-a55b').id === 'nvidia/nemotron-3-ultra-550b-a55b');
  ok('unknown alias passes through unaltered', cat.resolve('does-not-exist').id === 'does-not-exist' && cat.resolve('does-not-exist').known === false);
  ok('k3.1-pro is NOT in the callable catalogue', cat.resolve('moonshotai/kimi-k3.1-pro').known === false);
  // These were the stale-docs "recommended" set. All returned 410 end-of-life
  // on a real call (2026-11-13), so none may resolve as usable.
  ok('retired kimi-k3 is not a usable alias', cat.resolve('kimi-k3').known === false);
  ok('retired deepseek-v4-pro is not a usable alias', cat.resolve('deepseek-v4-pro').known === false);
  ok('retired glm-5.3 is not a usable alias', cat.resolve('glm-5.3').known === false);
  ok('the default id is in the catalogue', Object.keys(cat.all()).some(a => cat.all()[a] === cat.DEFAULT_ID));

  console.log('\nCASE 7: GROQ=1 routes to Groq with the verified model');
  seen = null;
  global.fetch = async function (url, init) {
    seen = { url: url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '  hello from groq  ' } }] }) };
  };
  m = fresh({ GROQ: '1', GROQ_API_KEY: 'gsk-test' });
  out = await m.callLLM([{ role: 'user', content: 'hi' }], { numPredict: 100 });
  ok('returns the Groq text, trimmed', out.text === 'hello from groq', JSON.stringify(out.text));
  ok('posts to the Groq chat endpoint', /api\.groq\.com\/openai\/v1\/chat\/completions/.test(seen.url), seen.url);
  ok('sends the verified default model', seen.body.model === 'openai/gpt-oss-120b', seen.body.model);
  ok('sends the bearer key', seen.auth === 'Bearer gsk-test', seen.auth);

  console.log('\nCASE 8: NVIDIA outranks Groq when both are configured');
  seen = null;
  global.fetch = async function (url, init) {
    seen = { url: url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'nvidia' } }] }) };
  };
  m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', GROQ: '1', GROQ_API_KEY: 'gsk-test' });
  await m.callLLM([{ role: 'user', content: 'hi' }], {});
  ok('NVIDIA endpoint wins', /integrate\.api\.nvidia\.com/.test(seen.url), seen.url);

  console.log('\nCASE 9: a reasoning-only reply fails loudly instead of becoming lesson prose');
  global.fetch = async function () {
    return {
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'length', message: { content: '', reasoning: 'private chain of thought' } }]
      })
    };
  };
  m = fresh({
    GROQ: '1', GROQ_API_KEY: 'gsk-test',
    OLLAMA_HOST: 'http://127.0.0.1:9'
  });
  const rLogs = await captureLogs(() => m.callLLM([{ role: 'user', content: 'hi' }], { timeoutMs: 2000 }));
  const rJoined = rLogs.join('\n');
  ok('names the reasoning/token-budget cause', /spent its whole token budget on reasoning/.test(rJoined), rJoined);
  ok('does not return the reasoning text', !/private chain of thought/.test(rJoined), rJoined);
  ok('falls through to the next backend', /Groq failed/.test(rJoined), rJoined);

  console.log('\nCASE 10: OPENROUTER=1 routes to the free Nemotron id');
  seen = null;
  global.fetch = async function (url, init) {
    seen = { url: url, body: JSON.parse(init.body), auth: init.headers.Authorization, referer: init.headers['HTTP-Referer'] };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'openrouter' } }] }) };
  };
  m = fresh({ OPENROUTER: '1', OPENROUTER_API_KEY: 'or-test' });
  await m.callLLM([{ role: 'user', content: 'hi' }], {});
  ok('posts to OpenRouter', /openrouter\.ai\/api\/v1\/chat\/completions/.test(seen.url), seen.url);
  ok('defaults to the free Nemotron id', seen.body.model === 'nvidia/nemotron-3-ultra-550b-a55b:free', seen.body.model);
  ok('sends the bearer key', seen.auth === 'Bearer or-test', seen.auth);
  ok('identifies the site', seen.referer === 'https://vlymbooq.qzz.io', String(seen.referer));

  console.log('\nCASE 11: a Groq HTTP failure falls through to OpenRouter');
  let calls = [];
  global.fetch = async function (url) {
    calls.push(url);
    if (/api\.groq\.com/.test(url)) {
      return { ok: false, status: 429, text: async () => 'rate limited' };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'from openrouter' } }] }) };
  };
  m = fresh({ GROQ: '1', GROQ_API_KEY: 'gsk-test', OPENROUTER: '1', OPENROUTER_API_KEY: 'or-test' });
  out = await m.callLLM([{ role: 'user', content: 'hi' }], {});
  ok('returns the OpenRouter answer', out.text === 'from openrouter', JSON.stringify(out.text));
  ok('tried Groq then OpenRouter', calls.length === 2 && /groq/.test(calls[0]) && /openrouter/.test(calls[1]), JSON.stringify(calls));

  console.log('\nCASE 12: OpenCode Zen route gating, event parsing and auth file');
  delete require.cache[require.resolve(path.join(__dirname, 'opencode-zen.js'))];
  const zen = require(path.join(__dirname, 'opencode-zen.js'));
  const parsed = zen.parseEvents([
    '{"type":"step_start"}',
    '{"type":"text","part":{"text":"Here is the section:\\n"}}',
    '{"type":"text","part":{"text":"<h2 id=\\"deep-1\\">Heading</h2><p>Body</p>"}}',
    'not json'
  ].join('\n'));
  ok('parses text events', /<h2 id="deep-1">Heading<\/h2><p>Body<\/p>/.test(parsed), parsed);
  ok('strips the preamble', parsed.startsWith('<h2'), parsed.slice(0, 24));
  ok('default model is the free DeepSeek id', zen.MODEL === 'opencode/deepseek-v4.1-flash-free', zen.MODEL);
  ok('disabled unless OPENCODE_ZEN=1', zen.ENABLED === false, String(zen.ENABLED));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-auth-'));
  process.env.OPENCODE_DATA_DIR = tmpDir;
  process.env.OPENCODE_API_KEY = 'zen-test-key';
  delete require.cache[require.resolve(path.join(__dirname, 'opencode-zen.js'))];
  const zen2 = require(path.join(__dirname, 'opencode-zen.js'));
  zen2.ensureAuth();
  const authJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'auth.json'), 'utf8'));
  ok('writes the CLI auth file', authJson.opencode && authJson.opencode.type === 'api' && authJson.opencode.key === 'zen-test-key', JSON.stringify(authJson));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.OPENCODE_DATA_DIR;
  delete process.env.OPENCODE_API_KEY;

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
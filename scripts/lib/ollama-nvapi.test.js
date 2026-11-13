// Tests the optional NVIDIA NIM backend in scripts/lib/ollama.js.
// Plain node, no framework: exits non-zero on failure so it can gate CI.
const path = require('path');

const MOD = path.resolve(__dirname, 'ollama.js');
let pass = 0, fail = 0;

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' -- ' + extra : '')); }
}

// The module reads its env at require time, so each case loads a fresh copy.
function fresh(env) {
  delete require.cache[require.resolve(MOD)];
  for (const k of Object.keys(process.env)) {
    if (/^(NVAPI|NVIDIA_|OLLAMA_|GH_MODELS|OD_FAKE_TEXT)/.test(k)) delete process.env[k];
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
  let m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', NVIDIA_MODEL: 'moonshotai/kimi-k3' });
  let out = await m.callLLM([{ role: 'user', content: 'hi' }], { numPredict: 100 });
  ok('returns the model text, trimmed', out.text === 'hello from nvidia', JSON.stringify(out.text));
  ok('posts to the NVIDIA chat endpoint', /integrate\.api\.nvidia\.com\/v1\/chat\/completions/.test(seen.url), seen.url);
  ok('sends the configured model', seen.body.model === 'moonshotai/kimi-k3', seen.body.model);
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
  ok('falls back to local Ollama', /falling back to Ollama/.test(joined), joined);

  console.log('\nCASE 5: short aliases resolve to full NVIDIA ids');
  seen = null;
  global.fetch = async function (url, init) {
    seen = { body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
  };
  m = fresh({ NVAPI: '1', NVIDIA_API_KEY: 'nvapi-test', NVIDIA_MODEL: 'deepseek-v4-pro' });
  await m.callLLM([{ role: 'user', content: 'hi' }], {});
  ok('alias sent as the full id', seen.body.model === 'deepseek-ai/deepseek-v4-pro', seen.body.model);
  ok('module exports the resolved id', m.NVIDIA_MODEL === 'deepseek-ai/deepseek-v4-pro', m.NVIDIA_MODEL);

  console.log('\nCASE 6: the catalogue itself');
  const cat = require(path.join(__dirname, 'nvidia-models.js'));
  ok('kimi-k3 -> recommended', cat.resolve('kimi-k3').id === 'moonshotai/kimi-k3' && cat.resolve('kimi-k3').tier === 'recommended');
  ok('glm-5.3 -> recommended', cat.resolve('glm-5.3').id === 'z-ai/glm-5.3' && cat.resolve('glm-5.3').tier === 'recommended');
  ok('every alias maps to a full id', Object.keys(cat.all()).every(a => /^[a-z0-9.-]+\/[a-z0-9._-]+$/.test(cat.all()[a])));
  ok('full id passes through', cat.resolve('deepseek-ai/deepseek-v4-pro').id === 'deepseek-ai/deepseek-v4-pro');
  ok('unknown alias passes through unaltered', cat.resolve('does-not-exist').id === 'does-not-exist' && cat.resolve('does-not-exist').known === false);
  ok('k3.1-pro is NOT in the callable catalogue', cat.resolve('moonshotai/kimi-k3.1-pro').known === false);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
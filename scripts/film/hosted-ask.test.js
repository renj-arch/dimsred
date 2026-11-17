#!/usr/bin/env node
/**
 * hosted-ask.test.js — the hosted route must be inert without keys.
 *
 * The film lane now asks hosted models first and the local GGUF second. The
 * dangerous regression is the opposite: a runner with no keys must not think
 * it has a provider (which would make ask() throw instead of falling back), and
 * the provider order must stay strongest-first.
 *
 * No network here. This checks provider selection and ordering only; the
 * model ids themselves are pinned in the module and mirrored from
 * scripts/lib/ollama.js on main.
 */

'use strict';

const assert = require('assert');

const KEYS = [
  'NVIDIA_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'GH_MODELS_TOKEN',
  'GEMINI_API_KEY', 'HOSTED_PROVIDERS', 'NVIDIA_MODEL', 'OPENROUTER_MODEL'
];

function withEnv(vars, fn) {
  const saved = {};
  for (const k of KEYS) saved[k] = process.env[k];
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

// Fresh module each time so any cached env reads are not reused.
function fresh() {
  delete require.cache[require.resolve('./hosted-ask')];
  return require('./hosted-ask');
}

function testNoKeys() {
  withEnv({}, () => {
    const h = fresh();
    assert.strictEqual(h.enabled(), false, 'no keys must mean no provider');
    assert.deepStrictEqual(h.providers(), []);
    assert.throws(() => h.ask({ system: 's', prompt: 'p' }), /no hosted provider/);
    console.log('  no keys: inert, and ask() fails loudly');
  });
}

function testOrderAndModels() {
  withEnv({
    GEMINI_API_KEY: 'g',
    GROQ_API_KEY: 'r',
    OPENROUTER_API_KEY: 'o',
    NVIDIA_API_KEY: 'n',
    GH_MODELS_TOKEN: 't'
  }, () => {
    const h = fresh();
    const names = h.providers().map((p) => p.name);
    assert.deepStrictEqual(names, ['NVIDIA NIM', 'OpenRouter', 'Groq', 'GitHub Models', 'Gemini'],
      'provider order must be strongest-first');
    const models = h.providers().map((p) => p.model);
    assert.strictEqual(models[0], 'nvidia/nemotron-3-ultra-550b-a55b', 'NVIDIA default is the 550B Nemotron');
    assert.strictEqual(models[1], 'nvidia/nemotron-3-ultra-550b-a55b:free', 'OpenRouter default is the free 550B Nemotron');
    console.log('  order: ' + names.join(' -> '));
    console.log('  NVIDIA: ' + models[0] + '  |  OpenRouter: ' + models[1]);
  });
}

function testOverrideAndFilter() {
  withEnv({ NVIDIA_API_KEY: 'n', NVIDIA_MODEL: 'nvidia/some-other', HOSTED_PROVIDERS: 'nvidia' }, () => {
    const h = fresh();
    const list = h.providers();
    assert.strictEqual(list.length, 1, 'HOSTED_PROVIDERS narrows the list');
    assert.strictEqual(list[0].model, 'nvidia/some-other', 'NVIDIA_MODEL overrides the default');
    console.log('  override + filter: one provider, custom model');
  });
}

const tests = [testNoKeys, testOrderAndModels, testOverrideAndFilter];
let failed = 0;
for (const t of tests) {
  try {
    t();
  } catch (e) {
    failed++;
    console.error(`FAIL ${t.name}: ${e.message}`);
  }
}
console.log(failed ? `\n${failed} failed` : '\nall hosted-ask tests passed');
if (failed) process.exitCode = 1;
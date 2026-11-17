#!/usr/bin/env node
/**
 * hosted-ask.js — a synchronous hosted-model call for the film lane.
 *
 * The authoring lane was local-only: scripts/film/llama.js shells out to
 * llama.cpp with a pinned 7B GGUF on every runner. That is the reason a whole
 * night of authoring produced nothing — the runtime failed to initialise its
 * samplers and there was no other route to ask.
 *
 * main already has a shared async router (scripts/lib/ollama.js) with NVIDIA
 * NIM, OpenRouter, Groq, GitHub Models and Gemini. It is async and built for
 * lanes that can await. author.js calls ask() synchronously from inside a
 * dozen places, so this module is the synchronous equivalent: same providers,
 * same model ids, curl + spawnSync instead of fetch.
 *
 * Provider order is strongest-first, and any provider without a key is simply
 * skipped. The caller falls back to the local GGUF when every route fails, so
 * a laptop with no keys still works exactly as before.
 *
 * Env (all optional; a lane opts in by having any one of the keys):
 *   NVIDIA_API_KEY      NVIDIA NIM      model: NVIDIA_MODEL   (nemotron-3-ultra = 550B)
 *   OPENROUTER_API_KEY  OpenRouter      model: OPENROUTER_MODEL (nemotron 550, :free)
 *   GROQ_API_KEY        Groq            model: GROQ_MODEL
 *   GH_MODELS_TOKEN     GitHub Models   model: GH_MODELS_MODEL
 *   GEMINI_API_KEY      Gemini          model: GEMINI_MODEL
 *
 * Usage:
 *   node scripts/film/hosted-ask.js --prompt "..."      # one-shot probe
 */

'use strict';

const { spawnSync } = require('child_process');

// Model ids mirror scripts/lib/ollama.js + scripts/lib/nvidia-models.js on
// main. Do not add an id from a docs page: every NVIDIA entry there answered a
// real call on 2026-11-13/16, and the aliases below are the short forms.
const DEFAULTS = {
  nvidia: { model: 'nvidia/nemotron-3-ultra-550b-a55b' },
  openrouter: { model: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  groq: { model: 'openai/gpt-oss-120b' },
  gh: { model: 'gpt-4o-mini' },
  gemini: { model: 'gemini-2.5-flash' }
};

const NVIDIA_MAX_TOKENS = 16384;
const timeoutMs = () => Number(process.env.HOSTED_TIMEOUT_MS || 300000);

function providers() {
  const list = [];
  const use = (name) => !process.env.HOSTED_PROVIDERS || process.env.HOSTED_PROVIDERS.split(',').map((s) => s.trim()).includes(name);

  if (process.env.NVIDIA_API_KEY && use('nvidia')) {
    list.push({
      name: 'NVIDIA NIM',
      url: process.env.NVIDIA_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL || DEFAULTS.nvidia.model,
      maxTokens: NVIDIA_MAX_TOKENS
    });
  }
  if (process.env.OPENROUTER_API_KEY && use('openrouter')) {
    list.push({
      name: 'OpenRouter',
      url: process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || DEFAULTS.openrouter.model,
      maxTokens: 8192
    });
  }
  if (process.env.GROQ_API_KEY && use('groq')) {
    list.push({
      name: 'Groq',
      url: process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || DEFAULTS.groq.model,
      maxTokens: 8192
    });
  }
  if (process.env.GH_MODELS_TOKEN && use('gh')) {
    list.push({
      name: 'GitHub Models',
      url: 'https://models.github.ai/inference/chat/completions',
      key: process.env.GH_MODELS_TOKEN,
      model: process.env.GH_MODELS_MODEL || DEFAULTS.gh.model,
      maxTokens: 8000
    });
  }
  if (process.env.GEMINI_API_KEY && use('gemini')) {
    list.push({
      name: 'Gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || DEFAULTS.gemini.model,
      maxTokens: 8192
    });
  }
  return list;
}

function enabled() {
  return providers().length > 0;
}

function describe() {
  const list = providers();
  return list.length ? list.map((p) => `${p.name} (${p.model})`).join(' -> ') : 'none';
}

/**
 * Ask every configured provider in order until one answers with text.
 * Returns { text, provider, model, wallMs }.
 * Throws only when every route fails, with all the reasons attached.
 */
function ask({ system, prompt, tokens = 1200, temperature = 0.3 }) {
  const list = providers();
  if (!list.length) throw new Error('no hosted provider is configured');

  const wanted = Math.max(Number(tokens) || 0, 1200);
  const reasons = [];

  for (const p of list) {
    const body = {
      model: p.model,
      messages: [
        { role: 'system', content: String(system == null ? '' : system) },
        { role: 'user', content: String(prompt == null ? '' : prompt) }
      ],
      temperature,
      max_tokens: Math.min(wanted, p.maxTokens),
      stream: false
    };
    const started = Date.now();
    const res = spawnSync('curl', [
      '-sS', '--max-time', String(Math.round(timeoutMs() / 1000)),
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Bearer ${p.key}`,
      '-d', '@-',
      p.url
    ], {
      input: JSON.stringify(body),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: timeoutMs()
    });

    if (res.error) {
      reasons.push(`${p.name}: ${res.error.message}`);
      continue;
    }
    const raw = (res.stdout || '').trim();
    if (res.status !== 0) {
      reasons.push(`${p.name}: curl exit ${res.status} ${(res.stderr || '').slice(0, 160)}`);
      continue;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      reasons.push(`${p.name}: not JSON (${raw.slice(0, 120)})`);
      continue;
    }
    if (parsed.error) {
      reasons.push(`${p.name}: ${parsed.error.message || parsed.error.code || 'error'}`);
      continue;
    }
    const choice = parsed.choices && parsed.choices[0];
    const text = choice && choice.message && choice.message.content;
    if (!text || !String(text).trim()) {
      reasons.push(`${p.name}: empty content`);
      continue;
    }
    return {
      text: String(text),
      provider: p.name,
      model: p.model,
      wallMs: Date.now() - started
    };
  }

  throw new Error(`every hosted route failed (${reasons.join(' | ')})`);
}

module.exports = { ask, enabled, providers, describe, DEFAULTS };

if (require.main === module) {
  const i = process.argv.indexOf('--prompt');
  if (i < 0) {
    console.log('providers: ' + describe());
    process.exit(0);
  }
  try {
    const out = ask({ system: 'Answer with one short sentence.', prompt: process.argv[i + 1], tokens: 200 });
    console.log(`[hosted] ${out.provider} ${out.model} ${out.wallMs}ms`);
    console.log(out.text.trim());
  } catch (e) {
    console.error(`[hosted] FAIL ${e.message}`);
    process.exitCode = 1;
  }
}
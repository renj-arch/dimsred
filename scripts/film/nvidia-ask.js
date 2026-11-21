#!/usr/bin/env node
/*
 * One NVIDIA NIM model call, same shape as scripts/film/llama.js ask():
 *   ask({ system, prompt, schema, tokens, outDir, label })
 * returns { value, attempt, wallMs, stderr }.
 *
 * Reads NVIDIA_API_KEY (required) and NVIDIA_MODEL (default
 * nvidia/nemotron-3.5-super-vl-120b-a12b). No weights download, no local
 * binary, no llama.cpp. The model answers over HTTP in ~5s.
 *
 * NVIDIA NIM does not guarantee a json-schema sampler, so we request JSON
 * mode and let extractJson pull the first complete object out of the reply,
 * exactly like llama.js does.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function extractJson(text) {
  if (!text) return null;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let fallback = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = text.slice(start, i + 1);
        try {
          const value = JSON.parse(slice);
          if (value && typeof value === 'object') {
            if (Array.isArray(value.lines) || Array.isArray(value.shots)) return value;
            if (!fallback) fallback = value;
          }
        } catch { /* keep scanning */ }
        start = -1;
      }
    }
  }
  return fallback;
}

async function ask({
  system,
  prompt,
  schema,
  tokens = 800,
  outDir,
  label = 'ask',
}) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY is not set');
  const model = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
  const dir = outDir || path.join(ROOT, 'out', 'nvidia');
  fs.mkdirSync(dir, { recursive: true });

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ];
  if (schema) messages.push({
    role: 'user',
    content: 'Return only a JSON object matching this schema: ' + JSON.stringify(schema) + '\n' + prompt,
  });

  const started = Date.now();
  const payload = JSON.stringify({
    model,
    messages,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: tokens,
    stream: false,
  });

  const promptFile = path.join(dir, `prompt-${label}.txt`);
  fs.writeFileSync(promptFile, prompt);

  let lastErr = null;
  for (const attempt of ['primary', 'retry']) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'Accept': 'application/json',
        },
        body: payload,
        signal: AbortSignal.timeout(180000),
      });
      const text = await res.text();
      const wall = Date.now() - started;
      fs.writeFileSync(path.join(dir, `out-${label}-${attempt}.txt`), text);
      if (!res.ok) {
        lastErr = new Error(`NVIDIA HTTP ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }
      let data;
      try { data = JSON.parse(text); } catch (e) {
        lastErr = new Error(`NVIDIA non-JSON: ${e.message}`);
        continue;
      }
      const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      const value = extractJson(content);
      if (value) return { value, attempt, wallMs: wall, stderr: '' };
      lastErr = new Error(`no JSON in NVIDIA reply (${content.trim().length} chars)`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`no JSON from NVIDIA model (${lastErr && lastErr.message})`);
}

module.exports = { ask, extractJson };

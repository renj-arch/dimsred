#!/usr/bin/env node
/*
 * One local model call, with the fallback the pinned runtime needs.
 *
 * b11890 refuses to start the grammar sampler for a schema and still exits 0,
 * so the caller cannot tell "the sampler failed" from "the model said nothing"
 * except by looking at the answer. This tries the schema first, then one flat
 * prompt in Qwen chat markers, and returns the first answer that parses as a
 * JSON object. The caller audits the content; this only gets a shape back.
 *
 * Environment: LM_BIN (default llama-cli), LM_MODEL (required), LM_CTX,
 * LM_THREADS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function capabilities(bin) {
  const res = spawnSync(bin, ['--help'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const help = `${res.stdout || ''}${res.stderr || ''}`;
  return { has: (flag) => !help || help.includes(flag) };
}

/* The first complete object in the output: models like to preface it with prose. */
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
        } catch {
          /* keep scanning: a malformed candidate may be followed by a good one */
        }
        start = -1;
      }
    }
  }
  return fallback;
}

function ask({
  system,
  prompt,
  schema,
  tokens = 800,
  ctx = Number(process.env.LM_CTX || 8192),
  threads = Number(process.env.LM_THREADS || 4),
  bin = process.env.LM_BIN || 'llama-cli',
  model = process.env.LM_MODEL,
  outDir,
  label = 'ask',
}) {
  if (!model) throw new Error('LM_MODEL is not set');
  const dir = outDir || path.join(ROOT, 'out', 'llama');
  fs.mkdirSync(dir, { recursive: true });

  const cap = capabilities(bin);
  const common = ['-m', model, '-n', String(tokens), '-c', String(ctx), '-t', String(threads)];
  for (const [flag, value] of [
    ['--temp', '0.3'],
    ['--top-p', '0.9'],
    ['--top-k', '40'],
    ['--repeat-penalty', '1.05'],
    ['--seed', '424242'],
    ['--no-warmup', null],
    ['--reasoning-budget', '0'],
  ]) {
    if (!cap.has(flag)) continue;
    common.push(flag);
    if (value !== null) common.push(value);
  }
  const noConversation = ['-no-cnv', '--no-conversation'].find(cap.has);
  // b11890 sometimes emits an end token in the middle of a JSON object. With
  // the model's own stop suppressed, the object gets finished and the parser
  // takes the first complete answer instead of a truncated one.
  const ignoreEos = cap.has('--ignore-eos');

  const promptFile = path.join(dir, `prompt-${label}.txt`);
  const flatFile = path.join(dir, `flat-${label}.txt`);
  fs.writeFileSync(promptFile, prompt);
  if (schema) fs.writeFileSync(path.join(dir, `schema-${label}.json`), JSON.stringify(schema, null, 2));
  fs.writeFileSync(flatFile, [
    '<|im_start|>system', system, '<|im_end|>',
    '<|im_start|>user', prompt, '<|im_end|>',
    '<|im_start|>assistant', '',
  ].join('\n'));

  const attempts = [];
  if (schema && cap.has('--json-schema')) {
    attempts.push({
      label: 'grammar',
      args: [
        ...common, '-sys', system, '-f', promptFile,
        ...(cap.has('--jinja') ? ['--jinja'] : []),
        ...(cap.has('--chat-template-kwargs') ? ['--chat-template-kwargs', '{"enable_thinking":false}'] : []),
        '--json-schema', JSON.stringify(schema),
      ],
    });
  }
  attempts.push({
    label: 'flat',
    args: [...common, ...(noConversation ? [noConversation] : []), ...(ignoreEos ? ['--ignore-eos'] : []), '-f', flatFile],
  });
  // One more flat sample. A truncated object is a sampling accident, not a
  // reason to fail a scene; the audit still decides whether the answer is true.
  attempts.push({
    label: 'flat2',
    args: [...common, ...(noConversation ? [noConversation] : []), ...(ignoreEos ? ['--ignore-eos'] : []), '-f', flatFile],
  });

  const failures = [];
  for (const attempt of attempts) {
    const started = Date.now();
    const res = spawnSync(bin, attempt.args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env },
    });
    const wall = Date.now() - started;
    const stdout = res.stdout || '';
    const stderr = res.stderr || '';
    fs.writeFileSync(path.join(dir, `out-${label}-${attempt.label}.txt`), stdout);
    const value = extractJson(stdout);
    if (value) return { value, attempt: attempt.label, wallMs: wall, stderr };
    failures.push(`${attempt.label}: exit ${res.status}, ${stdout.trim().length} chars, ${stderr.trim().split('\n').slice(-2).join(' ')}`);
  }
  throw new Error(`no JSON from the model (${failures.join(' | ')})`);
}

module.exports = { ask, extractJson };

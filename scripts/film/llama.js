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

/* The last balanced object in the output: models like to preface it with prose. */
function extractJson(text) {
  if (!text) return null;
  const end = text.lastIndexOf('}');
  if (end === -1) return null;
  for (let start = text.indexOf('{'); start !== -1 && start < end; start = text.indexOf('{', start + 1)) {
    const slice = text.slice(start, end + 1);
    try {
      const value = JSON.parse(slice);
      if (value && typeof value === 'object') return value;
    } catch {
      /* keep widening */
    }
  }
  return null;
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
    args: [...common, ...(noConversation ? [noConversation] : []), '-f', flatFile],
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

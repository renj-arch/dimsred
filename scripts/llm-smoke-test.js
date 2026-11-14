'use strict';
// Proves the model layer in ONE cheap call before any multi-hour agent pays
// for it. Historically this drove a local Ollama daemon; the lanes now use the
// shared hosted router (NVIDIA NIM -> Groq -> OpenRouter -> GitHub Models),
// with local Ollama only as the last-resort path when no route is configured.
//
// Exit codes: 0 pass, 1 fail (empty content, wrong content, timeout).
const router = require('./lib/ollama');

const CAP_MS = Number(process.env.SMOKE_CAP_MIN || 6) * 60000;

async function main() {
  const started = Date.now();
  const call = router.callLLM([
    { role: 'system', content: 'You are a terse assistant.' },
    { role: 'user', content: 'Reply with exactly this word and nothing else: READY' }
  ], { temperature: 0, numPredict: 40 });

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('smoke cap ' + (CAP_MS / 60000) + 'min reached')), CAP_MS);
  });

  let r;
  try {
    r = await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }

  const text = String((r && r.text) || '').trim();
  const secs = Math.round((Date.now() - started) / 1000);
  console.log('smoke: done total=' + secs + 's content=' + JSON.stringify(text.slice(0, 120)));
  if (!text) {
    console.error('RESULT: FAIL — empty content (a reasoning-only reply is not usable)');
    process.exit(1);
  }
  if (!/ready/i.test(text)) {
    console.error('RESULT: FAIL — content did not contain READY');
    process.exit(1);
  }
  console.log('RESULT: PASS — model answered directly in ' + secs + 's');
}

main().catch((err) => {
  console.error('RESULT: FAIL — ' + (err && err.message));
  process.exit(1);
});
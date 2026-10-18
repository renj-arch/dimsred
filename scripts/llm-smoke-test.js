'use strict';
// Proves the CI LLM layer in ONE cheap call, before any multi-hour agent pays
// for it: the daemon accepts think:false, the model answers directly (no long
// silent reasoning phase), and content comes back non-empty.
//
// Why this exists: on 2026-10-17 Question Quality #15 and the Site Agent run
// both wedged for hours because qwen3.8:27b's default THINKING mode streams at
// a fraction of a token per second on a 4-vCPU runner; every generation call
// hit curl's 90-minute cap with message.content still empty. The agents now
// send think:false (see site-agent.js / llm-autofix.js). This script is the
// fast verdict on whether that actually works on the installed daemon+model.
//
// Transport: curl via spawn, exactly like the agents. Node's fetch carries
// undici's hidden ~5-min headers timeout, which false-failed cold loads and
// made the canary itself unreliable — the canary must never be the thing
// that breaks. Watchdogs instead: CALL_CAP_MIN total, FIRST_BYTE_MIN of
// silence before the first byte is normal (cold load + prompt eval), and
// STALL_MIN of mid-stream silence means wedged.
//
// Exit codes: 0 pass, 1 fail (empty/late/wrong content), 2 the daemon returned
// HTTP 400 for think:false (agents auto-retry without the flag, but knowing
// early matters).
var HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
var MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';
var CALL_CAP_MIN = Number(process.env.SMOKE_CAP_MIN || 35);
var FIRST_BYTE_MIN = Number(process.env.SMOKE_FIRST_BYTE_MIN || 25);
var STALL_MIN = Number(process.env.SMOKE_STALL_MIN || 12);
var cp = require('child_process');

var t0 = Date.now();
var firstByteAt = 0;
var lastByteAt = t0;
var chunkCount = 0;
var content = '', thinking = '';
var beacon = null; // progress beacon, armed once the call starts

function consume(chunkText) {
  var lines = chunkText.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (!t || t.charAt(0) !== '{') continue;
    try {
      var j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') content += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') content += j.response;
    } catch (e) { /* partial line; ignore */ }
  }
}

console.log('smoke: model=' + MODEL + ' host=' + HOST + ' cap=' + CALL_CAP_MIN + 'min think=false');

var child = cp.spawn('curl', [
  '-sS', '--max-time', String(CALL_CAP_MIN * 60 + 120), '-w', '\\n%{http_code}',
  HOST + '/api/chat',
  '-H', 'Content-Type: application/json',
  '-d', '@-'
], { stdio: ['pipe', 'pipe', 'pipe'] });

var out = '';
var stderr = '';
var buf = '';
var settled = false;

function verdict(exitCode, lines) {
  if (settled) return;
  settled = true;
  clearInterval(beacon);
  clearInterval(mon);
  try { child.kill('SIGKILL'); } catch (e) { /* already gone */ }
  lines.forEach(function (l) { console.log(l); });
  process.exit(exitCode);
}

beacon = setInterval(function () {
  console.log('smoke: t=' + Math.round((Date.now() - t0) / 1000) + 's chunks=' + chunkCount +
    ' contentChars=' + content.length + ' thinkingChars=' + thinking.length);
}, 120000);

var mon = setInterval(function () {
  var now = Date.now();
  var mins = (now - t0) / 60000;
  if (mins > CALL_CAP_MIN) {
    verdict(1, [
      'smoke: CALL CAP ' + CALL_CAP_MIN + 'min reached',
      'RESULT: FAIL — call did not finish within ' + CALL_CAP_MIN + ' minutes (firstByte=' +
        (firstByteAt ? Math.round((firstByteAt - t0) / 1000) + 's' : 'never') + '; thinking-mode wedge suspected)'
    ]);
  } else if (!firstByteAt && mins > FIRST_BYTE_MIN) {
    verdict(1, [
      'smoke: no first byte in ' + FIRST_BYTE_MIN + 'min (cold load/prompt eval over budget)',
      'RESULT: FAIL — no streamed bytes before the watchdog deadline'
    ]);
  } else if (firstByteAt && (now - lastByteAt) / 60000 > STALL_MIN) {
    verdict(1, [
      'smoke: no byte for ' + STALL_MIN + 'min mid-stream (wedged)',
      'RESULT: FAIL — stream stalled'
    ]);
  }
}, 5000);

child.stdout.on('data', function (d) {
  if (settled) return;
  if (!firstByteAt) {
    firstByteAt = Date.now();
    console.log('smoke: first bytes at ' + Math.round((firstByteAt - t0) / 1000) + 's');
  }
  lastByteAt = Date.now();
  chunkCount++;
  var s = d.toString('utf8');
  out += s;
  buf += s;
  var nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    consume(buf.slice(0, nl + 1));
    buf = buf.slice(nl + 1);
  }
});
child.stderr.on('data', function (d) { stderr += d.toString('utf8'); });
child.on('error', function (e) {
  verdict(1, ['smoke: error: ' + (e && e.message), 'RESULT: FAIL — transport error']);
});
child.on('close', function (code) {
  if (settled) return;
  settleClose(code);
});

function settleClose(code) {
  consume(buf);
  buf = '';
  var lines = String(out || '').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  var httpCode = '';
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) httpCode = lines[lines.length - 1].trim();
  var totalS = Math.round((Date.now() - t0) / 1000);
  if (httpCode === '400') {
    verdict(2, [
      'smoke: HTTP 400 from daemon',
      'RESULT: REJECTED — daemon/model does not accept think:false; agent scripts fall back automatically, but the thinking-mode wedge risk remains. Investigate.'
    ]);
  }
  if (code !== 0) {
    verdict(1, [
      'smoke: curl exit ' + code + ' after ' + totalS + 's' + (stderr.trim() ? ' | stderr: ' + stderr.trim().slice(0, 200) : ''),
      'RESULT: FAIL — transport error'
    ]);
  }
  if (httpCode && httpCode !== '200') {
    verdict(1, ['smoke: HTTP ' + httpCode, 'RESULT: FAIL — server error']);
  }
  var text = content.trim();
  console.log('smoke: done total=' + totalS + 's chunks=' + chunkCount +
    ' content=' + JSON.stringify(text.slice(0, 120)) + ' thinkingChars=' + thinking.trim().length);
  if (!text) {
    verdict(1, ['RESULT: FAIL — empty content (thinking=' + thinking.trim().length + ' chars)' +
      (thinking.trim() ? ' — the model still reasoned instead of answering' : '')]);
  }
  if (!/ready/i.test(text)) {
    verdict(1, ['RESULT: FAIL — content did not contain READY']);
  }
  verdict(0, ['RESULT: PASS — think:false answered directly in ' + totalS + 's' +
    (thinking.trim().length ? ' (WARNING: ' + thinking.trim().length + ' thinking chars still emitted)' : ' (no thinking emitted)')]);
}

child.stdin.on('error', function () { /* curl died before reading stdin */ });
child.stdin.write(JSON.stringify({
  model: MODEL,
  messages: [
    { role: 'system', content: 'You are a terse assistant.' },
    { role: 'user', content: 'Reply with exactly this word and nothing else: READY' }
  ],
  stream: true,
  think: false,
  options: { temperature: 0, num_predict: 40 }
}));
child.stdin.end();

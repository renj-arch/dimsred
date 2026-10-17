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
// Exit codes: 0 pass, 1 fail (empty/late/wrong content), 2 the daemon returned
// HTTP 400 for think:false (agents auto-retry without the flag, but knowing
// early matters).
var HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
var MODEL = process.env.OLLAMA_MODEL || 'qwen3.8:27b';
var CALL_CAP_MIN = Number(process.env.SMOKE_CAP_MIN || 35);

var t0 = Date.now();
var firstByteAt = 0;
var chunkCount = 0;
var content = '', thinking = '';
var beacon = null; // progress beacon, armed once the call starts

var ctl = new AbortController();
var cap = setTimeout(function () { ctl.abort(); }, CALL_CAP_MIN * 60 * 1000);

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

fetch(HOST + '/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  signal: ctl.signal,
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a terse assistant.' },
      { role: 'user', content: 'Reply with exactly this word and nothing else: READY' }
    ],
    stream: true,
    think: false,
    options: { temperature: 0, num_predict: 40 }
  })
}).then(function (res) {
  if (res.status === 400) {
    return res.text().then(function (body) {
      clearTimeout(cap); clearInterval(beacon);
      console.log('smoke: HTTP 400 from daemon: ' + String(body).slice(0, 300));
      console.log('RESULT: REJECTED — daemon/model does not accept think:false; agent scripts fall back automatically, but the thinking-mode wedge risk remains. Investigate.');
      process.exit(2);
    });
  }
  if (!res.ok) {
    clearTimeout(cap); clearInterval(beacon);
    console.log('smoke: HTTP ' + res.status);
    console.log('RESULT: FAIL — server error');
    process.exit(1);
  }
  var decoder = new TextDecoder();
  var buf = '';
  var reader = res.body.getReader();
  beacon = setInterval(function () {
    console.log('smoke: t=' + Math.round((Date.now() - t0) / 1000) + 's chunks=' + chunkCount +
      ' contentChars=' + content.length + ' thinkingChars=' + thinking.length);
  }, 120000);
  function pump() {
    return reader.read().then(function (r) {
      if (r.done) return;
      if (!firstByteAt) {
        firstByteAt = Date.now();
        console.log('smoke: first bytes at ' + Math.round((firstByteAt - t0) / 1000) + 's');
      }
      chunkCount++;
      buf += decoder.decode(r.value, { stream: true });
      var nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        consume(buf.slice(0, nl + 1));
        buf = buf.slice(nl + 1);
      }
      return pump();
    });
  }
  return pump().then(function () {
    clearTimeout(cap); clearInterval(beacon);
    consume(buf);
    var totalS = Math.round((Date.now() - t0) / 1000);
    console.log('smoke: done total=' + totalS + 's chunks=' + chunkCount +
      ' content=' + JSON.stringify(content.trim().slice(0, 120)) +
      ' thinkingChars=' + thinking.trim().length);
    var text = content.trim();
    if (!text) {
      console.log('RESULT: FAIL — empty content (thinking=' + thinking.trim().length + ' chars)' +
        (thinking.trim() ? ' — the model still reasoned instead of answering' : ''));
      process.exit(1);
    }
    if (!/ready/i.test(text)) {
      console.log('RESULT: FAIL — content did not contain READY');
      process.exit(1);
    }
    console.log('RESULT: PASS — think:false answered directly in ' + totalS + 's' +
      (thinking.trim().length ? ' (WARNING: ' + thinking.trim().length + ' thinking chars still emitted)' : ' (no thinking emitted)'));
    process.exit(0);
  });
}).catch(function (e) {
  clearTimeout(cap); clearInterval(beacon);
  var aborted = e && (e.name === 'AbortError' || String(e.message || '').match(/abort/i));
  console.log('smoke: ' + (aborted ? 'CALL CAP ' + CALL_CAP_MIN + 'min reached' : 'error: ' + (e && e.message)));
  if (aborted) {
    console.log('RESULT: FAIL — call did not finish within ' + CALL_CAP_MIN + ' minutes' +
      ' (firstByte=' + (firstByteAt ? Math.round((firstByteAt - t0) / 1000) + 's' : 'never') +
      '; thinking-mode wedge suspected)');
  } else {
    console.log('RESULT: FAIL — transport error');
  }
  process.exit(1);
});

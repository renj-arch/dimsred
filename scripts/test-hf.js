var fs = require('fs');
var key = fs.readFileSync('.hf-key', 'utf-8').trim();
var models = ['mistralai/Mistral-7B-Instruct-v0.3', 'HuggingFaceH4/zephyr-7b-beta', 'microsoft/Phi-3-mini-4k-instruct'];

async function test(m) {
  try {
    var r = await fetch('https://api-inference.huggingface.co/models/' + m, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: 'Return ONLY valid JSON: {"notifications":[{"tag":"SSC CGL","title":"Test","startDay":30,"startMonth":"May","startYear":2026,"closing":"30/06/2026","vacancy":"Test"}]}',
        parameters: { temperature: 0.1, max_new_tokens: 200 }
      })
    });
    var t = await r.text();
    console.log(m + ': HTTP ' + r.status + ' | ' + t.slice(0, 150));
  } catch (e) {
    console.log(m + ': ' + e.message);
  }
}

Promise.all(models.map(test)).then(function() { console.log('Done'); });

const fs = require('fs');
let content = fs.readFileSync('micro-test.html', 'utf8');
const oldHTML = '<div class="q-opt-grid" id="qOptions"></div>\n            <button class="action-btn primary" id="nextBtn" disabled>Next Question</button>';
const newHTML = '<div class="q-opt-grid" id="qOptions"></div>\n            <div id="qExplanation" class="q-explanation" style="display:none"></div>\n            <button class="action-btn primary" id="nextBtn" disabled>Next Question</button>';
if (content.includes(oldHTML)) {
  content = content.replace(oldHTML, newHTML);
  fs.writeFileSync('micro-test.html', content, 'utf8');
  console.log('micro-test.html updated with qExplanation div');
} else {
  console.log('micro-test.html old text not found');
  const idx = content.indexOf('qOpt-grid');
  console.log(JSON.stringify(content.substring(idx-50, idx+150)));
}

// Fix CSS
let cssOld = '.q-opt.show-correct{border-color:var(--emerald);background:rgba(52,211,153,.04);color:var(--emerald)}';
const cssNew = '.q-opt.show-correct{border-color:var(--emerald);background:rgba(52,211,153,.04);color:var(--emerald)}\n.q-explanation{margin-top:12px;padding:14px;border-radius:8px;background:rgba(255,255,255,.03);color:var(--text-sec);font-size:.85em;line-height:1.6}\n.q-explanation .rev-sol{margin-top:6px;padding:8px 12px;background:rgba(167,139,250,.08);border-radius:6px;color:var(--text)}\n.q-explanation .rev-sol strong{color:var(--emerald)}\n.q-explanation .ref{font-size:.78em;color:var(--text-muted);margin-top:4px}';
if (content.includes(cssOld)) {
  content = content.replace(cssOld, cssNew);
  fs.writeFileSync('micro-test.html', content, 'utf8');
  console.log('micro-test.html CSS updated');
} else {
  console.log('micro-test.html CSS pattern not found');
}

// Fix JS
let js = fs.readFileSync('js/micro-test.js', 'utf8');
const oldJS1 = '  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n}';
const newJS1 = '  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n\n  var explDiv = document.getElementById(\'qExplanation\');\n  if(explDiv){\n    explDiv.innerHTML = \'<div class="rev-sol">' + (q.solution || \'Correct answer: \' + q.options[q.answer].label + \'. \' + q.options[q.answer].text) + \'</div>\';\n    explDiv.style.display = \'block\';\n  }\n}';
if (js.includes(oldJS1)) {
  js = js.replace(oldJS1, newJS1);
  console.log('js/micro-test.js selectAnswer updated');
} else {
  console.log('selectAnswer pattern not found');
}
const oldJS2 = '  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = \'\';';
const newJS2 = '  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = \'\';\n  var explDiv = document.getElementById(\'qExplanation\');\n  if(explDiv) explDiv.style.display = \'none\';';
if (js.includes(oldJS2)) {
  js = js.replace(oldJS2, newJS2);
  console.log('js/micro-test.js showQuestion updated');
} else {
  console.log('showQuestion pattern not found');
}
fs.writeFileSync('js/micro-test.js', js, 'utf8');
console.log('Done!');
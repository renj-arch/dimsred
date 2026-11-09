const fs = require('fs');
let js = fs.readFileSync('js/micro-test.js', 'utf8');

// Fix 1: add explanation display in selectAnswer
const old1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n}";
const newJS1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n\n  var explDiv = document.getElementById('qExplanation');\n  if(explDiv){\n    explDiv.innerHTML = '<div class=\"rev-sol\">' + (q.solution || 'Correct answer: ' + q.options[q.answer].label + '. ' + q.options[q.answer].text) + '</div>';\n    explDiv.style.display = 'block';\n  }\n}";
if (js.includes(oldJS1)) {
  js = js.replace(oldJS1, newJS1);
  console.log('selectAnswer updated');
} else {
  console.log('selectAnswer pattern not found');
}

// Fix 2: hide explanation in showQuestion
const oldJS2 = '  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = \'\';';
const newJS2 = '  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = \'\';\n  var explDiv = document.getElementById(\'qExplanation\');\n  if(explDiv) explDiv.style.display = \'none\';';
if (js.includes(oldJS2)) {
  js = js.replace(oldJS2, newJS2);
  console.log('showQuestion updated');
} else {
  console.log('showQuestion pattern not found');
}

fs.writeFileSync('js/micro-test.js', js, 'utf8');
console.log('Done!');
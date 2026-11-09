const fs = require('fs');
let js = fs.readFileSync('js/micro-test.js', 'utf8');

// Fix selectAnswer
const s1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n}";
const n1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n  var ex = document.getElementById('qExplanation');\n  if(explDiv){\n    explDiv.innerHTML = '<div class=\"rev-sol\">' + (q.solution || 'Correct answer: ' + q.options[q.answer].label + '. ' + q.options[q.answer].text) + '</div>';\n    explDiv.style.display = 'block';\n  }\n}";
if (js.includes(s1)) {
  js = js.replace(s1, n1);
  console.log('selectAnswer updated');
} else {
  console.log('selectAnswer NOT found');
}

// Fix showQuestion
const s2 = "  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = '';";
const n2 = "  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = '';\n  var explDiv = document.getElementById('qExplanation');\n  if(explDiv) explDiv.style.display = 'none';";
if (js.includes(s2)) {
  js = js.replace(s2, n2);
  console.log('showQuestion updated');
} else {
  console.log('showQuestion NOT found');
}

fs.writeFileSync('js/micro-test.js', js, 'utf8');
console.log('Done!');
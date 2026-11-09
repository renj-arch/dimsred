$js = Get-Content 'js/micro-test.js' -Raw

# Fix 1: Add explanation display in selectAnswer
$s1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });`n  nextBtn.disabled = false;}"
$n1 = "  results.push({ question: q, chosen: idx, correct: idx === q.answer });\n  nextBtn.disabled = false;\n  var explDiv = document.getElementById('qExplanation');\n  if(explDiv){\n    explDiv.innerHTML = '<div class=\"rev-sol\">' + (q.solution || 'Correct answer: ' + q.options[q.answer].label + '. ' + q.options[q.answer].text) + '</div>';\n    explDiv.style.display = 'block';\n  }\n}"
if ($js.Contains($s1)) {
  $js = $js.Replace($s1, $n1)
  Write-Host 'selectAnswer updated'
} else {
  Write-Host 'selectAnswer NOT found'
}

# Fix 2: Hide explanation in showQuestion
$s2 = "  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = '';"
$n2 = "  qText.textContent = q.text;\n  renderDiagram(q);\n  qOptions.innerHTML = '';\n  var explDiv = document.getElementById('qExplanation');\n  if(explDiv) explDiv.style.display = 'none';"
if ($js.Contains($s2)) {
  $js = $js.Replace($s2, $n2)
  console.log('showQuestion updated')
} else {
  console.log('showQuestion pattern NOT found')
}

fs.writeFileSync('js/micro-test.js', js, 'utf8');
console.log('Done!')
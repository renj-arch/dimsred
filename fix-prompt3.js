const fs = require('fs');
let content = fs.readFileSync('scripts/model-fill-bank.js', 'utf8');
const oldText = "- Return exactly ' + count + ' items.'";
const newText = "- SHORTCUT RULES: Every question must test a shortcut-eligible concept (ratio elimination, percentage shortcuts, approximation, option-elimination, unit-digit patterns, divisibility rules, etc.).\\n      '- Every solution MUST include: (a) a short exam-time shortcut/trick method, AND (b) a full step-by-step worked solution. Never just 'calculate normally' without showing a faster method.\\n      '- Quantitative: show percentage shortcuts, ratio elimination, unit-digit tricks, approximation methods.\\n      '- Reasoning: show pattern-recognition shortcuts (letter positions, mirror positions, coded relationships).\\n      '- English: show elimination technique (eliminate wrong options first, then choose between remaining).\\n      '- Return exactly ' + count + ' items.'";
if (content.includes(oldText)) {
  content = content.replace(oldText, newText);
  fs.writeFileSync('scripts/model-fill-bank.js', content, 'utf8');
  console.log('model-fill-bank.js updated successfully');
} else {
  console.log('Old text not found!');
  const idx = content.indexOf("Return exactly");
  console.log(JSON.stringify(content.substring(idx-100, idx+100)));
}
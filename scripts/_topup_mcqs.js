const fs = require('fs');
const P = 'scripts/course-practice.json';
const p = JSON.parse(fs.readFileSync(P, 'utf8'));

function q(id, text, options, correct, sol) {
  return {
    id,
    text,
    options: options.map((t, i) => ({ l: String.fromCharCode(97 + i), t, c: i === correct })),
    sol
  };
}

// Civil Engineering Paper I: replace a duplicated beam-support question and
// add two more covering geotechnical and water-resources topics.
p['opt-civil-engineering/paper1'][2] = q(
  3903,
  'In a simply supported beam of span L carrying a uniformly distributed load w per unit length, the maximum bending moment is:',
  ['wL²/8', 'wL²/4', 'wL²/2', 'wL²/12'],
  0,
  'For a simply supported beam under a UDL, the maximum bending moment is wL²/8 at mid-span.'
);
p['opt-civil-engineering/paper1'].push(q(
  3904,
  "Rankine's coefficient of active earth pressure for a cohesionless soil with angle of internal friction φ = 30° is:",
  ['1/3', '1/2', '√3', '1'],
  0,
  'Ka = (1 − sin φ)/(1 + sin φ). For φ = 30°, sin φ = 0.5, so Ka = 0.5/1.5 = 1/3.'
));
p['opt-civil-engineering/paper1'].push(q(
  3905,
  'Duty (D) and delta (Δ) of canal water are related by (B = base period in days):',
  ['D = 8.64B/Δ', 'D = 8.64Δ/B', 'D = Δ/(8.64B)', 'D = B/(8.64Δ)'],
  0,
  'Duty in hectares per cumec is D = 8.64B/Δ, where B is the base period in days and Δ is the depth of water in metres.'
));

// Psychology Paper II: add a fifth question on projective testing.
p['opt-psychology/paper2'].push(q(
  3305,
  'Which of the following is a projective test?',
  ['Rorschach Inkblot Test', 'Minnesota Multiphasic Personality Inventory (MMPI)', '16 Personality Factor Questionnaire (16PF)', 'Beck Depression Inventory'],
  0,
  'The Rorschach Inkblot Test is projective: ambiguous stimuli are used to elicit responses projected from the unconscious. MMPI, 16PF and the Beck Depression Inventory are self-report inventories.'
));

fs.writeFileSync(P, JSON.stringify(p, null, 2) + '\n', 'utf8');
console.log('civil questions:', p['opt-civil-engineering/paper1'].length);
console.log('psychology questions:', p['opt-psychology/paper2'].length);

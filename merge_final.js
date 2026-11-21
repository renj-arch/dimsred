const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

let main = fs.readFileSync(mainFile, 'utf8');

// Parse JSON files properly — this gives us correctly unescaped values
const chemObj = JSON.parse(fs.readFileSync(chemFile, 'utf8'));
const bioObj = JSON.parse(fs.readFileSync(bioFile, 'utf8'));
const mathObj = JSON.parse(fs.readFileSync(mathFile, 'utf8'));

// Extract generators from JSON objects
// Top-level has: new_topics (object with topic: "GENERATORS.xxx") + deepened_topics
const chemNew = chemObj.new_topics || {};
const chemDeep = chemObj.deepened_topics || {};
const bioNew = bioObj.new_topics || {};
const bioDeep = bioObj.deepened_topics || {};
const mathNew = mathObj.new_topics || {};
const mathDeep = mathObj.deepened_topics || {};

const chemNames = chemObj.new_topic_names || [];
const bioNames = bioObj.new_topic_names || [];
const mathNames = mathObj.new_topic_names || [];

console.log('Chemistry: ' + Object.keys(chemNew).length + ' new, ' + Object.keys(chemDeep).length + ' deepened. names: ' + chemNames.join(','));
console.log('Biology: ' + Object.keys(bioNew).length + ' new, ' + Object.keys(bioDeep).length + ' deepened. names: ' + bioNames.join(','));
console.log('Math: ' + Object.keys(mathNew).length + ' new, ' + Object.keys(mathDeep).length + ' deepened. names: ' + mathNames.join(','));

const physicsNewTopics = ['mechanics_solids','mechanics_fluids','thermal_properties','electromagnetic_waves','ac_circuits'];
const chemNewNames = chemNames.length ? chemNames : ["solid_state","solutions","metallurgy","salt_analysis","environmental"];
const bioNewNames = bioNames.length ? bioNames : ["animal_kingdom","morphology_plants","anatomy_plants","structural_animals","health_disease","microbes_welfare","biotechnology_principles"];
const mathNewNames = mathNames.length ? mathNames : ["sets_relations","probability","mathematical_reasoning","linear_programming","inverse_trigonometry","continuity"];

// ---- 1. Update SCI_TOPICS ----
function updateSciTopics(text, newTopics, subject) {
  const regex = new RegExp('(' + subject + ': \\[)([^\\]]+)(\\])');
  return text.replace(regex, (match, prefix, existing, suffix) => {
    const arr = existing.split(',').map(s => s.trim().replace(/'/g, ''));
    for (const t of newTopics) {
      if (!arr.includes(t)) arr.push(t);
    }
    return prefix + arr.map(t => "'" + t + "'").join(',') + suffix;
  });
}

main = updateSciTopics(main, physicsNewTopics, 'physics');
main = updateSciTopics(main, chemNewNames, 'chemistry');
main = updateSciTopics(main, bioNewNames, 'biology');
main = updateSciTopics(main, mathNewNames, 'math');

// ---- 2. Build insertion block ----
let insertBlock = '\n\n  // ==================== GENERATED EXPANSIONS ====================\n\n';

// Physics: raw JS
let physicsContent = fs.readFileSync(physicsFile, 'utf8');
insertBlock += physicsContent.replace(/^\/\/.*$/gm, '').trim() + '\n\n';

// Helper: extract JS code from a JSON string value
// The values are "GENERATORS.xxx = [function...];" etc.
// JSON.parse already unescaped them, but there might be leftover \' that are
// invalid in single-quoted JS strings. We need to fix those.
function fixJsApostrophes(code) {
  let result = '';
  let inSingle = false;
  let escape = false;
  
  function prevNonSpace(i) { for (let j = i - 1; j >= 0; j--) { if (!' \n\r\t'.includes(code[j])) return code[j]; } return '\0'; }
  
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\') { result += ch; escape = true; continue; }
    if (ch === "'") {
      if (inSingle) {
        const nextCh = i + 1 < code.length ? code[i + 1] : '\0';
        if (nextCh === "'") { result += "\\'"; continue; }
        if (/[+,;\]}:]/.test(nextCh)) { inSingle = false; result += "'"; continue; }
        if (nextCh === ')') {
          let close = true;
          for (let j = i + 2; j < code.length; j++) { if (!' \n\r\t'.includes(code[j])) { close = /[+,;\]}:]/.test(code[j]); break; } }
          if (close) { inSingle = false; result += "'"; continue; }
        }
        const prev = prevNonSpace(i);
        if (prev === '(') { inSingle = false; result += "'"; continue; }
        if (/[a-zA-Z0-9=?']/.test(prev)) { result += "\\'"; continue; }
        inSingle = false; result += "'";
      } else {
        inSingle = true;
        result += "'";
      }
      continue;
    }
    result += ch;
  }
  return result;
}

// Chem new topics
for (const [t, code] of Object.entries(chemNew)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}
// Chem deepened
for (const [t, code] of Object.entries(chemDeep)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}
// Bio new topics
for (const [t, code] of Object.entries(bioNew)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}
// Bio deepened
for (const [t, code] of Object.entries(bioDeep)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}
// Math new topics
for (const [t, code] of Object.entries(mathNew)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}
// Math deepened
for (const [t, code] of Object.entries(mathDeep)) {
  insertBlock += fixJsApostrophes(code) + '\n\n';
}

// ---- 3. Insert ----
const marker = '  // MATH DEEPENED FROM SYLLABUS';
const idx = main.indexOf(marker);
if (idx === -1) { console.error('ERROR: marker not found'); process.exit(1); }
main = main.slice(0, idx) + insertBlock + '\n\n  ' + main.slice(idx);

// ---- 4. Write ----
const outFile = mainFile + '.new';
fs.writeFileSync(outFile, main, 'utf8');
console.log('Written to ' + outFile + ' (' + (main.length/1024).toFixed(0) + ' KB)');

const opens = (main.match(/[{[]/g) || []).length;
const closes = (main.match(/[}\]]/g) || []).length;
console.log('Braces: ' + opens + ' open, ' + closes + ' close, balanced=' + (opens === closes));

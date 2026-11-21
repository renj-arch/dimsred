const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

// Read all files as raw text
let main = fs.readFileSync(mainFile, 'utf8');

// Physics: read raw JS 
let physicsCode = fs.readFileSync(physicsFile, 'utf8');

// For JSON files, extract the value strings directly, skipping JSON.parse
// Pattern: "topic_name": "GENERATORS...",
function extractCodeBlocks(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const blocks = {};
  // Match "key": "value", or "key": "value"\n  }
  // The values are extremely long, so we use a non-greedy approach
  // Find all "topic_name": "..."
  const regex = /"(\w+)":\s*"(GENERATORS\..*?)"(?=\s*,?\s*[}"])/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1];
    let val = match[2];
    // Unescape: \\" -> \"  and \' -> '  
    val = val.replace(/\\\\"/g, '\\"'); // double-escaped quote
    val = val.replace(/\\'/g, "'");
    blocks[key] = val;
  }
  return blocks;
}

let chemBlocks = extractCodeBlocks(chemFile);
let bioBlocks = extractCodeBlocks(bioFile);
let mathBlocks = extractCodeBlocks(mathFile);

// Separate new_topics from deepened_topics
function separateBlocks(blocks, newTopicNames) {
  const newTopics = {};
  const deepened = {};
  for (const [key, val] of Object.entries(blocks)) {
    if (newTopicNames.includes(key)) {
      newTopics[key] = val;
    } else {
      deepened[key] = val;
    }
  }
  return { newTopics, deepened };
}

const chemNewNames = ["solid_state","solutions","metallurgy","salt_analysis","environmental"];
const bioNewNames = ["animal_kingdom","morphology_plants","anatomy_plants","structural_animals","health_disease","microbes_welfare","biotechnology_principles"];
const mathNewNames = ["sets_relations","probability","mathematical_reasoning","linear_programming","inverse_trigonometry","continuity"];
const physicsNewNames = ["mechanics_solids","mechanics_fluids","thermal_properties","electromagnetic_waves","ac_circuits"];

const chem = separateBlocks(chemBlocks, chemNewNames);
const bio = separateBlocks(bioBlocks, bioNewNames);
const math = separateBlocks(mathBlocks, mathNewNames);

console.log('Chemistry: ' + Object.keys(chem.newTopics).length + ' new, ' + Object.keys(chem.deepened).length + ' deepened');
console.log('Biology: ' + Object.keys(bio.newTopics).length + ' new, ' + Object.keys(bio.deepened).length + ' deepened');
console.log('Math: ' + Object.keys(math.newTopics).length + ' new, ' + Object.keys(math.deepened).length + ' deepened');

// ---- 1. Update SCI_TOPICS ----
function updateSciTopics(text, newTopics, subject) {
  const regex = new RegExp(`(${subject}: \\[)([^\\]]+)(\\])`);
  return text.replace(regex, (match, prefix, existing, suffix) => {
    const existingArr = existing.split(',').map(s => s.trim().replace(/'/g, ''));
    for (const t of newTopics) {
      if (!existingArr.includes(t)) existingArr.push(t);
    }
    return `${prefix}${existingArr.map(t => `'${t}'`).join(',')}${suffix}`;
  });
}

main = updateSciTopics(main, physicsNewNames, 'physics');
main = updateSciTopics(main, chemNewNames, 'chemistry');
main = updateSciTopics(main, bioNewNames, 'biology');
main = updateSciTopics(main, mathNewNames, 'math');

// ---- 2. Build insertion block ----
let insertBlock = '\n\n  // ==================== GENERATED EXPANSIONS ====================\n\n';

// Physics: raw JS code (already has GENERATORS.physics.X = [...] and .push(...))
insertBlock += physicsCode.replace(/^\/\/.*$/gm, '').trim() + '\n\n';

// Chemistry: new + deepened
for (const [topic, code] of Object.entries(chem.newTopics)) {
  insertBlock += 'GENERATORS.chemistry.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(chem.deepened)) {
  insertBlock += 'GENERATORS.chemistry.' + topic + code + ';\n\n';
}

// Biology: new + deepened  
for (const [topic, code] of Object.entries(bio.newTopics)) {
  insertBlock += 'GENERATORS.biology.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(bio.deepened)) {
  insertBlock += 'GENERATORS.biology.' + topic + code + ';\n\n';
}

// Math: new + deepened
for (const [topic, code] of Object.entries(math.newTopics)) {
  insertBlock += 'GENERATORS.math.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(math.deepened)) {
  insertBlock += 'GENERATORS.math.' + topic + code + ';\n\n';
}

// ---- 3. Insert before "MATH DEEPENED FROM SYLLABUS" comment ----
const marker = '  // MATH DEEPENED FROM SYLLABUS';
const idx = main.indexOf(marker);
if (idx === -1) {
  console.error('ERROR: marker not found');
  process.exit(1);
}
main = main.slice(0, idx) + insertBlock + '\n\n' + main.slice(idx);

// ---- 4. Write output ----
fs.writeFileSync(mainFile + '.new', main, 'utf8');
console.log('Written to ' + mainFile + '.new');
console.log('New file size: ' + main.length + ' bytes');

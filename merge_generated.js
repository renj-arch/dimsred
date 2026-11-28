const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

// Read all files
let main = fs.readFileSync(mainFile, 'utf8');
let physicsCode = fs.readFileSync(physicsFile, 'utf8');
let chemJson = JSON.parse(fs.readFileSync(chemFile, 'utf8'));
let bioJson = JSON.parse(fs.readFileSync(bioFile, 'utf8'));
let mathJson = JSON.parse(fs.readFileSync(mathFile, 'utf8'));

// Physics new topics (from the generated file, not JSON)
const physicsNewTopics = ['mechanics_solids','mechanics_fluids','thermal_properties','electromagnetic_waves','ac_circuits'];

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

main = updateSciTopics(main, physicsNewTopics, 'physics');
main = updateSciTopics(main, chemJson.new_topic_names, 'chemistry');
main = updateSciTopics(main, bioJson.new_topic_names, 'biology');
main = updateSciTopics(main, mathJson.new_topic_names, 'math');

// ---- 2. Build insertion block ----
let insertBlock = '\n\n  // ==================== GENERATED EXPANSIONS ====================\n\n';

// Physics: the whole file content (new topics + deepened)
// The physics file is raw JS containing both `GENERATORS.physics.X = [...]` and `.push(...)` calls
insertBlock += physicsCode.replace(/^\/\/.*$/gm, '').trim() + '\n\n';

// Chemistry: new topics + deepened
for (const [topic, code] of Object.entries(chemJson.new_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
}
for (const [topic, code] of Object.entries(chemJson.deepened_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
}

// Biology: new topics + deepened
for (const [topic, code] of Object.entries(bioJson.new_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
}
for (const [topic, code] of Object.entries(bioJson.deepened_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
}

// Math: new topics + deepened
for (const [topic, code] of Object.entries(mathJson.new_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
}
for (const [topic, code] of Object.entries(mathJson.deepened_topics)) {
  insertBlock += code.replace(/^\/\/.*$/gm, '').trim() + '\n\n';
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

// Basic verification
const newTopicCount = physicsNewTopics.length + chemJson.new_topic_names.length + bioJson.new_topic_names.length + mathJson.new_topic_names.length;
const deepenedCount = Object.keys(chemJson.deepened_topics).length + Object.keys(bioJson.deepened_topics).length + Object.keys(mathJson.deepened_topics).length;
console.log('New topics added: ' + newTopicCount);
console.log('Deepened sections: ' + deepenedCount);

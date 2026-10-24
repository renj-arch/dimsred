const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

let main = fs.readFileSync(mainFile, 'utf8');
let physicsCode = fs.readFileSync(physicsFile, 'utf8');

// Raw extraction: read JSON as text and extract GENERATORS code blocks
function extractCodeBlocksFromJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const blocks = {};
  // Pattern: "topicname":  "GENERATORS.
  // Extract from GENERATORS. to the end of the ;" closing
  const regex = /"(\w+)":\s*"(GENERATORS\.\w+\.\w+\s*(?:=\s*\[|\.push\())/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const topic = match[1];
    const prefix = match[2]; // e.g., "GENERATORS.chemistry.solid_state = ["
    let startIdx = match.index + match[0].length; // Start after the opening "
    let depth = 0;
    let result = prefix;
    let inStr = false;
    let escape = false;
    
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      
      if (escape) { result += ch; escape = false; continue; }
      if (ch === '\\' && inStr) { result += ch; escape = true; continue; }
      
      if (ch === '"' && !inStr) {
        // End of JSON string value - the code block is complete
        // But we need to verify this is really the end (not a quote inside the code)
        if (depth === 0) break;
        // Inside array brackets — this is a quote inside the code, keep going
        result += ch;
        continue;
      }
      
      if (ch === '"' && inStr) {
        inStr = false;
        result += ch;
        continue;
      }
      
      if (inStr) { result += ch; continue; }
      
      if (ch === '[' || ch === '(') { depth++; result += ch; continue; }
      if (ch === ']' || ch === ')') { 
        depth--; 
        result += ch; 
        if (depth <= 0) {
          // End of array/push - look ahead for ;"
          let j = i + 1;
          while (j < text.length && text[j] === ' ') j++;
          if (text[j] === ';') { result += ';'; j++; }
          while (j < text.length && text[j] === ' ') j++;
          if (text[j] === '"') break; // End of JSON value
        }
        continue; 
      }
      
      result += ch;
    }
    
    blocks[topic] = result;
  }
  
  // Also extract new_topic_names
  const namesMatch = text.match(/"new_topic_names":\s*\[([^\]]+)\]/);
  if (namesMatch) {
    blocks._new_topic_names = namesMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
  }
  
  return blocks;
}

console.log('Extracting chemistry blocks...');
let chemBlocks = extractCodeBlocksFromJson(chemFile);
console.log('  Found: ' + Object.keys(chemBlocks).filter(k => k !== '_new_topic_names').length);

console.log('Extracting biology blocks...');
let bioBlocks = extractCodeBlocksFromJson(bioFile);
console.log('  Found: ' + Object.keys(bioBlocks).filter(k => k !== '_new_topic_names').length);

console.log('Extracting math blocks...');
let mathBlocks = extractCodeBlocksFromJson(mathFile);
console.log('  Found: ' + Object.keys(mathBlocks).filter(k => k !== '_new_topic_names').length);

const physicsNewTopics = ['mechanics_solids','mechanics_fluids','thermal_properties','electromagnetic_waves','ac_circuits'];
const chemNewNames = chemBlocks._new_topic_names || ["solid_state","solutions","metallurgy","salt_analysis","environmental"];
const bioNewNames = bioBlocks._new_topic_names || ["animal_kingdom","morphology_plants","anatomy_plants","structural_animals","health_disease","microbes_welfare","biotechnology_principles"];
const mathNewNames = mathBlocks._new_topic_names || ["sets_relations","probability","mathematical_reasoning","linear_programming","inverse_trigonometry","continuity"];

function separate(blocks, newNames) {
  const newTopics = {};
  const deepened = {};
  for (const [k, v] of Object.entries(blocks)) {
    if (k === '_new_topic_names') continue;
    if (newNames.includes(k)) newTopics[k] = v;
    else deepened[k] = v;
  }
  return { newTopics, deepened };
}

const chem = separate(chemBlocks, chemNewNames);
const bio = separate(bioBlocks, bioNewNames);
const math = separate(mathBlocks, mathNewNames);

console.log('Chemistry: ' + Object.keys(chem.newTopics).length + ' new, ' + Object.keys(chem.deepened).length + ' deepened');
console.log('Biology: ' + Object.keys(bio.newTopics).length + ' new, ' + Object.keys(bio.deepened).length + ' deepened');
console.log('Math: ' + Object.keys(math.newTopics).length + ' new, ' + Object.keys(math.deepened).length + ' deepened');

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
insertBlock += physicsCode.replace(/^\/\/.*$/gm, '').trim() + '\n\n';

// Chemistry
for (const [topic, code] of Object.entries(chem.newTopics)) {
  insertBlock += code + '\n\n';
}
for (const [topic, code] of Object.entries(chem.deepened)) {
  insertBlock += code + '\n\n';
}

// Biology
for (const [topic, code] of Object.entries(bio.newTopics)) {
  insertBlock += code + '\n\n';
}
for (const [topic, code] of Object.entries(bio.deepened)) {
  insertBlock += code + '\n\n';
}

// Math
for (const [topic, code] of Object.entries(math.newTopics)) {
  insertBlock += code + '\n\n';
}
for (const [topic, code] of Object.entries(math.deepened)) {
  insertBlock += code + '\n\n';
}

// ---- 3. Insert before "MATH DEEPENED FROM SYLLABUS" ----
const marker = '  // MATH DEEPENED FROM SYLLABUS';
const idx = main.indexOf(marker);
if (idx === -1) {
  console.error('ERROR: marker not found');
  process.exit(1);
}
main = main.slice(0, idx) + insertBlock + '\n\n  ' + main.slice(idx);

// ---- 4. Write ----
const outFile = mainFile + '.new';
fs.writeFileSync(outFile, main, 'utf8');
console.log('Written to ' + outFile);
console.log('Size: ' + main.length + ' bytes');

// Count braces
const opens = (main.match(/[{[]/g) || []).length;
const closes = (main.match(/[}\]]/g) || []).length;
console.log('Braces: ' + opens + ' open, ' + closes + ' close, balanced=' + (opens === closes));

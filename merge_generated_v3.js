const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

let main = fs.readFileSync(mainFile, 'utf8');

// Helper: extract JS code blocks from a JSON-like file
// The file has "key": "GENERATORS...code...", patterns
// We extract by finding GENERATORS. and tracking balanced braces/parens
function extractBlocks(text) {
  const blocks = {};
  // Find all "topicname": patterns followed by GENERATORS.
  const re = /"(\w+)":\s*"(GENERATORS\.)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const topic = match[1];
    let start = match.index + match[0].length - match[2].length;
    let i = match.index + match[0].length;
    let depth = 0;
    let inStr = false;
    let escape = false;
    let code = '';
    while (i < text.length) {
      const ch = text[i];
      if (escape) { escape = false; code += ch; i++; continue; }
      if (ch === '\\') { escape = true; code += ch; i++; continue; }
      if (ch === '"' && !inStr) { // end of JSON string value
        // Check if this is the closing quote by looking ahead
        break;
      }
      if (ch === '\\' && !inStr) { code += ch; i++; continue; }
      code += ch;
      i++;
    }
    // Remove trailing " if present
    if (code.endsWith('"')) code = code.slice(0, -1);
    blocks[topic] = code;
  }
  return blocks;
}

// Actually, let me use a different, simpler approach:
// Read file as text, split by known topic patterns

function extractByPrefix(text, prefix) {
  const results = {};
  // Find "topicname": "GENERATORS.subject.topicname = [\n...\n];" or ".push(\n...\n);"
  // The value ends at ",\n    "topicname" or "\n  }"
  const topicRegex = /"(\w+)":\s*"(GENERATORS\.\w+\.\w+\s*(?:=\s*\[|\.push\())/g;
  let match;
  while ((match = topicRegex.exec(text)) !== null) {
    const topic = match[1];
    const prefixCode = match[2];
    let i = match.index + match[0].length;
    let depth = 0;
    let result = prefixCode;
    // We need to find the end: either ]; or ); that closes the array
    // Track nesting of [ ] ( ) { }
    // Also track JSON string boundaries
    let inStr = false;
    let escape = false;
    while (i < text.length) {
      const ch = text[i];
      if (escape) { escape = false; result += ch; i++; continue; }
      if (ch === '\\') { escape = true; result += ch; i++; continue; }
      if (ch === '"') { 
        inStr = !inStr;
        // If we just entered a string, we need different handling
        // Actually, the JSON value is delimited by outer ". When we're outside
        // the inner code, a " ends the JSON value.
        if (!inStr && depth === 0) {
          // This is likely the closing " of the JSON value
          break;
        }
        result += ch; i++; continue;
      }
      if (!inStr) {
        if (ch === '[' || ch === '(' || ch === '{') depth++;
        if (ch === ']' || ch === ')' || ch === '}') {
          depth--;
          result += ch; i++;
          if (depth <= 0 && (ch === ']' || ch === ')')) {
            // End of array/function call
            // Check if next chars are ");
            let j = i;
            while (j < text.length && (text[j] === ' ' || text[j] === '\n' || text[j] === '\r')) j++;
            if (text[j] === '"') {
              // Skip more and more...
            }
            break;
          }
          continue;
        }
      }
      result += ch;
      i++;
    }
    // Verify we got a complete expression
    if (depth === 0) {
      results[topic] = result;
    } else {
      console.log('Warning: unbalanced depth for ' + topic + ': ' + depth);
    }
  }
  return results;
}

// Read raw text from files
let physicsCode = fs.readFileSync(physicsFile, 'utf8');
let chemText = fs.readFileSync(chemFile, 'utf8');
let bioText = fs.readFileSync(bioFile, 'utf8');
let mathText = fs.readFileSync(mathFile, 'utf8');

// Extract blocks from each
let chemBlocks = extractByPrefix(chemText, 'chemistry');
let bioBlocks = extractByPrefix(bioText, 'biology');
let mathBlocks = extractByPrefix(mathText, 'math');

console.log('Extracted chemistry blocks: ' + Object.keys(chemBlocks).length);
console.log('Extracted biology blocks: ' + Object.keys(bioBlocks).length);
console.log('Extracted math blocks: ' + Object.keys(mathBlocks).length);

// List what we got
if (Object.keys(chemBlocks).length > 0) console.log('Chem keys: ' + Object.keys(chemBlocks).join(', '));
if (Object.keys(bioBlocks).length > 0) console.log('Bio keys: ' + Object.keys(bioBlocks).join(', '));
if (Object.keys(mathBlocks).length > 0) console.log('Math keys: ' + Object.keys(mathBlocks).join(', '));

// Separate new vs deepened
const chemNewNames = ["solid_state","solutions","metallurgy","salt_analysis","environmental"];
const bioNewNames = ["animal_kingdom","morphology_plants","anatomy_plants","structural_animals","health_disease","microbes_welfare","biotechnology_principles"];
const mathNewNames = ["sets_relations","probability","mathematical_reasoning","linear_programming","inverse_trigonometry","continuity"];
const physicsNewNames = ["mechanics_solids","mechanics_fluids","thermal_properties","electromagnetic_waves","ac_circuits"];

function separate(blocks, newNames) {
  const newTopics = {};
  const deepened = {};
  for (const [k, v] of Object.entries(blocks)) {
    if (newNames.includes(k)) newTopics[k] = v;
    else deepened[k] = v;
  }
  return { newTopics, deepened };
}

const chem = separate(chemBlocks, chemNewNames);
const bio = separate(bioBlocks, bioNewNames);
const math = separate(mathBlocks, mathNewNames);

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

// Physics: raw JS
insertBlock += physicsCode.replace(/^\/\/.*$/gm, '').trim() + '\n\n';

// Chemistry: new + deepened
for (const [topic, code] of Object.entries(chem.newTopics)) {
  // If code already has GENERATORS prefix, use as-is; otherwise wrap
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.chemistry.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(chem.deepened)) {
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.chemistry.' + topic + code + ';\n\n';
}

// Biology: new + deepened
for (const [topic, code] of Object.entries(bio.newTopics)) {
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.biology.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(bio.deepened)) {
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.biology.' + topic + code + ';\n\n';
}

// Math: new + deepened
for (const [topic, code] of Object.entries(math.newTopics)) {
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.math.' + topic + ' = ' + code + ';\n\n';
}
for (const [topic, code] of Object.entries(math.deepened)) {
  if (code.startsWith('GENERATORS.')) insertBlock += code + '\n\n';
  else insertBlock += 'GENERATORS.math.' + topic + code + ';\n\n';
}

// ---- 3. Insert before "MATH DEEPENED FROM SYLLABUS" ----
const marker = '  // MATH DEEPENED FROM SYLLABUS';
const idx = main.indexOf(marker);
if (idx === -1) {
  console.error('ERROR: marker not found in main file');
  process.exit(1);
}
main = main.slice(0, idx) + insertBlock + '\n\n' + main.slice(idx);

// ---- 4. Write output ----
const outFile = mainFile + '.new';
fs.writeFileSync(outFile, main, 'utf8');
console.log('Written to ' + outFile);
console.log('New file size: ' + main.length + ' bytes');
console.log('Original: ' + (main.length - insertBlock.length) + ' bytes');

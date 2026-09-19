const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

let main = fs.readFileSync(mainFile, 'utf8');
let physicsCode = fs.readFileSync(physicsFile, 'utf8');

// Raw text approach: find all GENERATORS. blocks in the JSON, extract them
// without needing valid JSON parsing
// Fix broken JSON escaping in raw text
function fixJsonEscaping(text) {
  // Remove \' (invalid JSON escape) — just keep the '
  text = text.replace(/\\'/g, "'");
  // Replace \\\\" (4 backslashes + quote) with just " — unnecessary escaping
  text = text.replace(/\\\\"/g, '"');
  // Replace \\" (2 backslashes + quote) with just " — also unnecessary
  text = text.replace(/\\"/g, '"');
  return text;
}

function extractGenBlocks(text) {
  // First fix broken escaping
  text = fixJsonEscaping(text);
  
  const blocks = {};
  // Find "topicname": "GENERATORS. 
  // The value starts with GENERATORS. which we know
  const genRegex = /"(\w+)":\s*"(GENERATORS\.)/g;
  let match;
  while ((match = genRegex.exec(text)) !== null) {
    const topic = match[1];
    let i = match.index + match[0].length; // right after GENERATORS.
    let result = match[2]; // "GENERATORS."
    
    // Now read the rest of the JSON string value
    // since we fixed \\" -> ", the only " terminator should be the real closing "
    // But there might be remaining " inside the code that are real quotes
    // We track JSON escape state to find the real closing "
    let escape = false;
    while (i < text.length) {
      const ch = text[i];
      if (escape) { result += ch; escape = false; i++; continue; }
      if (ch === '\\') { result += ch; escape = true; i++; continue; }
      if (ch === '"') {
        // End of JSON string value (since we stripped all \, this should be the closing ")
        break;
      }
      result += ch;
      i++;
    }
    
    blocks[topic] = result;
  }
  return blocks;
}

// Also extract new_topic_names
function extractNames(text) {
  const m = text.match(/"new_topic_names":\s*\[([^\]]+)\]/);
  return m ? m[1].replace(/"\s*/g, '').split(',').map(s => s.trim()) : [];
}

console.log('Extracting blocks...');
const chemText = fs.readFileSync(chemFile, 'utf8');
const bioText = fs.readFileSync(bioFile, 'utf8');
const mathText = fs.readFileSync(mathFile, 'utf8');

const chemBlocks = extractGenBlocks(chemText);
const bioBlocks = extractGenBlocks(bioText);
const mathBlocks = extractGenBlocks(mathText);

const chemNames = extractNames(chemText);
const bioNames = extractNames(bioText);
const mathNames = extractNames(mathText);

console.log('Chemistry: ' + Object.keys(chemBlocks).length + ' blocks, names: ' + chemNames.join(','));
console.log('Biology: ' + Object.keys(bioBlocks).length + ' blocks, names: ' + bioNames.join(','));
console.log('Math: ' + Object.keys(mathBlocks).length + ' blocks, names: ' + mathNames.join(','));

const physicsNewTopics = ['mechanics_solids','mechanics_fluids','thermal_properties','electromagnetic_waves','ac_circuits'];
const chemNewNames = chemNames.length ? chemNames : ["solid_state","solutions","metallurgy","salt_analysis","environmental"];
const bioNewNames = bioNames.length ? bioNames : ["animal_kingdom","morphology_plants","anatomy_plants","structural_animals","health_disease","microbes_welfare","biotechnology_principles"];
const mathNewNames = mathNames.length ? mathNames : ["sets_relations","probability","mathematical_reasoning","linear_programming","inverse_trigonometry","continuity"];

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

function addBlock(block) {
  // Clean up the block: remove unnecessary backslash before quote inside single-quoted strings
  let cleaned = block;
  // Remove \" -> " (backslash before quote is unnecessary in single-quoted JS strings)
  // Also escape any unescaped ' inside single-quoted strings
  // Walk through char by char
  let result = '';
  let inSingle = false;
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && inSingle) { result += ch; escape = true; continue; }
    if (ch === "'") {
      if (inSingle) {
        // See if this ' closes the string or is an apostrophe
        let nextChar = '';
        for (let j = i + 1; j < cleaned.length; j++) {
          if (cleaned[j] !== ' ' && cleaned[j] !== '\n' && cleaned[j] !== '\r') { nextChar = cleaned[j]; break; }
        }
        let prevChar = '';
        for (let j = i - 1; j >= 0; j--) {
          if (cleaned[j] !== ' ' && cleaned[j] !== '\n' && cleaned[j] !== '\r') { prevChar = cleaned[j]; break; }
        }
        const isDelimiter = !/[a-zA-Z0-9)]/.test(prevChar) || /[,);\]}+:]/.test(nextChar);
        if (isDelimiter) { inSingle = false; result += ch; }
        else { result += "\\'"; }
      } else {
        inSingle = true;
        result += ch;
      }
      continue;
    }
    result += ch;
  }
  insertBlock += result + '\n\n';
}

for (const [t, c] of Object.entries(chem.newTopics)) addBlock(c);
for (const [t, c] of Object.entries(chem.deepened)) addBlock(c);
for (const [t, c] of Object.entries(bio.newTopics)) addBlock(c);
for (const [t, c] of Object.entries(bio.deepened)) addBlock(c);
for (const [t, c] of Object.entries(math.newTopics)) addBlock(c);
for (const [t, c] of Object.entries(math.deepened)) addBlock(c);

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

const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'js', 'science-training.js');
const physicsFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\physics_gen\\physics_generated.js';
const chemFile = 'C:\\Users\\Renjith\\AppData\\Local\\Temp\\chem_complete.json';
const bioFile = path.join(__dirname, 'biology_generators_complete.json');
const mathFile = path.join(__dirname, 'math_generators.json');

let main = fs.readFileSync(mainFile, 'utf8');
let physicsCode = fs.readFileSync(physicsFile, 'utf8');

let chem = JSON.parse(fs.readFileSync(chemFile, 'utf8'));
let bio = JSON.parse(fs.readFileSync(bioFile, 'utf8'));
let math = JSON.parse(fs.readFileSync(mathFile, 'utf8'));

const physicsNewTopics = ['mechanics_solids','mechanics_fluids','thermal_properties','electromagnetic_waves','ac_circuits'];

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
main = updateSciTopics(main, chem.new_topic_names, 'chemistry');
main = updateSciTopics(main, bio.new_topic_names, 'biology');
main = updateSciTopics(main, math.new_topic_names, 'math');

// ---- 2. Build insertion block ----
let insertBlock = '\n\n  // ==================== GENERATED EXPANSIONS ====================\n\n';

// Physics: raw JS (already has GENERATORS.physics.X = [...] etc)
insertBlock += fixApostrophes(physicsCode.replace(/^\/\/.*$/gm, '').trim()) + '\n\n';

function fixApostrophes(code) {
  // Walk through code, properly escaping apostrophes inside single-quoted JS strings
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && (inSingle || inDouble)) { result += ch; escape = true; continue; }
    
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue; }
    
    if (ch === "'" && !inDouble) {
      if (inSingle) {
        // Inside a single-quoted string — check if this ' closes the string or is an apostrophe
        // Look at prev non-whitespace char
        let prevIdx = i - 1;
        let prevChar = '';
        while (prevIdx >= 0 && /\s/.test(code[prevIdx])) prevIdx--;
        if (prevIdx >= 0) prevChar = code[prevIdx];
        
        // Look at next non-whitespace char
        let nextIdx = i + 1;
        let nextChar = '';
        while (nextIdx < code.length && /\s/.test(code[nextIdx])) nextIdx++;
        if (nextIdx < code.length) nextChar = code[nextIdx];
        
        const prevIsAlnum = /[a-zA-Z0-9)]/.test(prevChar);
        const nextIsDelimiter = /[,);\]}+:]/.test(nextChar);
        
        // Closing delimiter if prev is NOT alnum (prev is : , ( [ etc.) OR next is a valid delimiter
        const isClosingDelimiter = !prevIsAlnum || nextIsDelimiter;
        
        if (isClosingDelimiter) {
          inSingle = false;
          result += ch;
        } else {
          result += "\\'";
        }
      } else {
        inSingle = true;
        result += ch;
      }
      continue;
    }
    
    result += ch;
  }
  
  return result;
}

// Chemistry
for (const [topic, code] of Object.entries(chem.new_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
}
for (const [topic, code] of Object.entries(chem.deepened_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
}

// Biology
for (const [topic, code] of Object.entries(bio.new_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
}
for (const [topic, code] of Object.entries(bio.deepened_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
}

// Math
for (const [topic, code] of Object.entries(math.new_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
}
for (const [topic, code] of Object.entries(math.deepened_topics)) {
  insertBlock += fixApostrophes(code) + '\n\n';
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

// Check balance of braces
const opens = (main.match(/[{[]/g) || []).length;
const closes = (main.match(/[}\]]/g) || []).length;
console.log('Braces: open=' + opens + ' close=' + closes + ' balanced=' + (opens === closes));

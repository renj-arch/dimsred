const fs = require('fs');

// Copy the exact esc function from fill-globe-part11.js
function clean(s) {
  return (s || '')
    .replace(/\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g, '$1')
    .replace(/\]\]/g, '')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function esc(s) {
  return clean(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

// Test various inputs
const tests = [
  "India's largest",
  "PSU's such as",
  "goats' hooves",
  "Ashoka's period",
  "visitor's attraction",
  "range's highest",
  "world's largest",
  "Colonel Bailey's Dungeon",
  "Nepal's Taplejung",
  "Kollam's coastal",
  "Minicoy's reef",
  "plateau's western",
  "India's area",
];

for (const t of tests) {
  const e = esc(t);
  console.log(`Input:  "${t}"`);
  console.log(`Output: "${e}"`);
  // Check if output has any unescaped ' in the middle
  for (let i = 1; i < e.length - 1; i++) {
    if (e[i] === "'" && e[i-1] !== '\\') {
      console.log(`  ^^^ BUG: unescaped ' at position ${i}`);
    }
  }
  console.log('');
}

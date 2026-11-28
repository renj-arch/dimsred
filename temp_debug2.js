const fs = require('fs');
const html = fs.readFileSync('3d-globe.html', 'utf8');

const startIdx = html.indexOf('D.physiographic = [');
const afterOpen = html.indexOf('[', startIdx) + 1;
const chunk = html.slice(afterOpen, afterOpen + 2000);
console.log('First 500 chars of array content:');
console.log(chunk.substring(0, 500));
console.log('---');
console.log('After 1500:', chunk.substring(1500, 2000));

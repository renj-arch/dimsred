var fs = require('fs');
var path = require('path');

var BANK = path.join(__dirname, '..', 'question-bank', 'agniveer.json');
var data = JSON.parse(fs.readFileSync(BANK, 'utf-8'));

var questions = data.questions;

// ----- DEDUPLICATION (by exact text) -----
var seen = {};
var deduped = [];
questions.forEach(function(q){
  var key = q.text.trim().toLowerCase();
  if (seen[key]) return;
  seen[key] = true;
  deduped.push(q);
});

console.log('Before: ' + questions.length + ' questions');
console.log('Dupes removed: ' + (questions.length - deduped.length));
console.log('After dedup: ' + deduped.length + ' questions');

// ----- RE-ID -----
deduped.forEach(function(q, i){
  q.id = i + 1;
  q.q = i + 1;
});

// ----- COMBINE AND SAVE -----
data.questions = deduped;
fs.writeFileSync(BANK, JSON.stringify(data, null, 2), 'utf-8');
console.log('Saved ' + deduped.length + ' deduplicated questions to ' + BANK);

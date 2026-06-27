const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));
const qs = data.questions;

// Indices to KEEP (exam-relevant / important news only)
const keepIndices = new Set([
  3,   // ISRO Gaganyaan air drop test
  13,  // Odisha Lakhpati Didis (women empowerment)
  14,  // APEDA BHARATI Programme (trade)
  20,  // Monetary Asset Accounting discussion paper (economy)
  22,  // National Youth Parliament Competition
  24,  // Critical Mineral Mission (economy/defence)
  25,  // HP hydropower projects (energy)
  29,  // Sai Cabinet Rural Jobs Scheme
  30,  // Defence IT Committee meeting
  31,  // Padma Awards 2026
  34,  // Kavach deployment (railways safety)
  39,  // PM interacts with IAS trainees
  40,  // INCOIS El Niño Bulletins
  42,  // Chief Labour Commissioner court camp
  45,  // Uniform Civil Code Maharashtra
  47,  // Aadhaar app 31 million downloads
  48,  // Panchayati Raj workshop
  49,  // India top ship recycling nation
  50,  // NAFED e-auction launch
  51,  // CCI Honda acquisition approval
  52,  // IAS e-Civil List launch
  53,  // Chhattisgarh FIR Vedanta Anil Agarwal
  54,  // Bihar farmer relief package
  55,  // RBI TReDS directions
  57,  // HP hydropower agreements
  58,  // Gujarat reservation for ex-servicemen
  59,  // Sports initiatives
  61,  // Maharashtra AI Policy
  63,  // RBI Bulletin
  65,  // Arjan Singh Memorial Hockey Tournament
  66,  // Assam Olympic values programme
  69,  // RBI VRR auction
  71,  // Index of Eight Core Industries base year
  78,  // RBI monetary penalty
  79,  // Swarna Andhra Vision 2047
  81,  // FAO Agricola Medal
]);

const filtered = qs.filter((_, i) => keepIndices.has(i));

data.questions = filtered;
data.updatedAt = new Date().toISOString();

fs.writeFileSync('./data/quiz.json', JSON.stringify(data, null, 2), 'utf8');
console.log('Before: ' + qs.length + ' questions');
console.log('After: ' + filtered.length + ' questions');
console.log('Removed: ' + (qs.length - filtered.length) + ' trash questions');

// Show kept questions
filtered.forEach((q, i) => {
  console.log('  [' + q.category + '] ' + q.question.slice(0, 80));
});

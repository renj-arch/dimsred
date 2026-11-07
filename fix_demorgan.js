const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', 'utf8');

// Replace broken De Morgan q: lines directly
c = c.replace(
  "q:'Which law is (A∪B)' + ' = A\\'∩B\\'?'",
  'q:"Which law is (A∪B)\' = A\'∩B\'?"'
);
c = c.replace(
  "q:'Which law is (A∩B)' = A'∪B\\'?'",
  'q:"Which law is (A∩B)\' = A\'∪B\'?"'
);

// Fix solutions
c = c.replace(
  "solution:'Concept: (A∪B)' = A'∩B\\' is De Morgan\\'s first law'",
  'solution:"Concept: (A∪B)\' = A\'∩B\' is De Morgan\'s first law"'
);
c = c.replace(
  "solution:'Concept: (A∩B)' = A'∪B\\' is De Morgan\\'s second law'",
  'solution:"Concept: (A∩B)\' = A\'∪B\' is De Morgan\'s second law"'
);

fs.writeFileSync('C:\\Users\\Renjith\\Desktop\\icode (2)\\study\\js\\st-test.js', c, 'utf8');
console.log('Fixed De Morgan');
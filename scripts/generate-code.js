const crypto = require('crypto');

var ALL_EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer'];

function generateCode() {
  var prefix = 'VLYM';
  var seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  var seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return prefix + '-' + seg1 + '-' + seg2;
}

function generateExpiry(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

var days = 30;
var exams = [];
for (var i = 2; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === '--exam' && i + 1 < process.argv.length) {
    exams.push(process.argv[i + 1].toLowerCase());
    i++;
  } else if (!isNaN(parseInt(arg))) {
    days = parseInt(arg);
  }
}

var code = generateCode();
var expiry = generateExpiry(days);
var examsField = exams.length > 0 ? '"exams":["' + exams.join('","') + '"],' : '';

console.log('\nNew premium code:');
console.log('  Code:      ' + code);
console.log('  Expires:   ' + expiry);
console.log('  Duration:  ' + days + ' days');
if (exams.length > 0) {
  console.log('  Exams:     ' + exams.join(', '));
} else {
  console.log('  Exams:     all (unlimited)');
}
console.log('\nAdd to Cloudflare CODES env var:');
console.log('  "' + code + '": {' + examsField + '"plan":"monthly","expiresAt":"' + expiry + '"}');
console.log('\nExamples:');
console.log('  node scripts/generate-code.js 30 --exam agniveer');
console.log('  node scripts/generate-code.js 30 --exam cgl --exam rbi');
console.log('  node scripts/generate-code.js 30  (all exams)\n');

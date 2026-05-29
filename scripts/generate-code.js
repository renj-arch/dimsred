const crypto = require('crypto');

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

var days = parseInt(process.argv[2]) || 30;
var code = generateCode();
var expiry = generateExpiry(days);

console.log('\nNew premium code:');
console.log('  Code:      ' + code);
console.log('  Expires:   ' + expiry);
console.log('  Duration:  ' + days + ' days');
console.log('\nAdd to Cloudflare CODES env var:');
console.log('  "' + code + '": {"plan":"monthly","expiresAt":"' + expiry + '"}');
console.log('\nOr via wrangler:');
console.log('  First read current: wrangler pages secret list');
console.log('  Then set new value including this code\n');

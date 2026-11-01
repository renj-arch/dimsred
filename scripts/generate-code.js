// Generate premium codes for vlymbooq
// Usage: node scripts/generate-code.js [count] [plan] [days]
//   count: number of codes (default 1)
//   plan: monthly or yearly (default monthly)
//   days: expiry in days (default 30/365)
//
// Output: JSON to paste into Cloudflare Pages → Settings → Environment variables → CODES
// The CODES variable is NOT stored in git — only in Cloudflare dashboard.

function randomPart(len) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', s = '';
  for (var i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function generateCode() {
  return 'VLYM-' + randomPart(4) + '-' + randomPart(4);
}

var args = process.argv.slice(2);
var count = parseInt(args[0]) || 1;
var plan = (args[1] || 'monthly').toLowerCase();
var days = parseInt(args[2]) || (plan === 'yearly' ? 365 : 30);

var codes = {};
for (var i = 0; i < count; i++) {
  var code = generateCode();
  var expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  codes[code] = {
    plan: plan,
    expiresAt: expiresAt.toISOString(),
    exams: []  // empty = all exams; or ["cgl","rbi"] for specific
  };
}

console.log('\n=== Paste this into Cloudflare Pages → CODES env var ===\n');
console.log(JSON.stringify(codes, null, 2));
console.log('\n=== Codes ===');
Object.keys(codes).forEach(function(k) {
  console.log('  ' + k + ' → ' + plan + ', expires ' + codes[k].expiresAt.slice(0, 10) + ', exams: all');
});

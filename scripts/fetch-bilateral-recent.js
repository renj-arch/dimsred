// Append a "Recent Developments" section to each India diplomatic-relations question
// using the latest PIB feed items that mention India + the country + a bilateral keyword.
// Idempotent: the Recent Developments section is rebuilt from scratch on every run.
var fs = require('fs');
var path = require('path');

var CA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var FEED_PATH = path.resolve(__dirname, '..', 'data/pib-feed.json');
var MAX_POINTS = 5;

var KW = /\bbilateral\b|\bdiplomat\w*|\bambassador\b|relations\b|\bcooperation\b|\bagreement\b|\bvisit\w*|\bties\b|\bmou\b|\bpartnership\b|defence\b|defense\b|\bsummit\b|\bdelegation\b|external affairs|foreign minister|high commissioner|consulate/i;

function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtDate(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || '').slice(0, 10);
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

function main() {
  if (!fs.existsSync(FEED_PATH)) { console.error('pib-feed.json not found, skipping recent developments'); return; }
  var ca = JSON.parse(fs.readFileSync(CA_PATH, 'utf8'));
  var feed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
  var items = feed.items || [];
  var subKey = 'International Relations';
  var ir = ca['Current Affairs'] && ca['Current Affairs'].subSubjects && ca['Current Affairs'].subSubjects[subKey];
  if (!ir || !ir.length) { console.error('No International Relations questions found'); return; }

  var now = new Date();
  var today = fmtDate(now.toISOString());
  var updated = 0;
  ir.forEach(function(q) {
    var country = q.answer;
    if (!country) return;
    var countryRe = new RegExp('\\b' + esc(country) + '\\b', 'i');
    var hits = items.filter(function(it) {
      var text = clean(it.title) + ' ' + clean(it.description);
      return countryRe.test(text) && /india\b|indian\b/i.test(text) && KW.test(text);
    }).sort(function(a, b) {
      return String(b.pubDate || '').localeCompare(String(a.pubDate || ''));
    }).slice(0, MAX_POINTS);

    var newRecent = hits.map(function(h) {
      return '• ' + fmtDate(h.pubDate) + ': ' + clean(h.title);
    }).join('\n');

    var fact = String(q.fact || '');
    var staticBase = fact.split('\nRecent Developments:')[0].replace(/\s+$/, '');
    if (!staticBase) return;

    var existingRecent = (fact.match(/\nRecent Developments:\n([\s\S]*?)\nLast updated:/) || [])[1] || '';
    var existingStamp = (fact.match(/Last updated:\s*(\S+)/) || [])[1] || '';

    var changed = newRecent.trim() !== existingRecent.trim() || !existingStamp;
    if (!changed) return;

    q.fact = staticBase + (newRecent ? '\n\nRecent Developments:\n' + newRecent : '') + '\nLast updated: ' + today;
    q.updatedAt = now.toISOString();
    updated++;
  });

  fs.writeFileSync(CA_PATH, JSON.stringify(ca), 'utf8');
  console.log('Recent developments / edited dates updated for ' + updated + ' countries');
}

main();

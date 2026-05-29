var fs = require('fs');
var path = require('path');

var root = __dirname;
var BASE = 'https://vlymbooq.qzz.io';
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer'];

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

var urls = [];

// Static pages
var staticPages = [
  { loc: '/', priority: '1.0' },
  { loc: '/privacy.html', priority: '0.6' },
  { loc: '/lab.html', priority: '0.7' },
  { loc: '/dashboard.html', priority: '0.5' },
  { loc: '/leaderboard.html', priority: '0.5' },
  { loc: '/mistakes.html', priority: '0.5' },
  { loc: '/premium.html', priority: '0.7' },
  { loc: '/badges.html', priority: '0.5' },
];

staticPages.forEach(function(p) {
  urls.push({ loc: BASE + p.loc, priority: p.priority });
});

// Exam index pages + all practice sets
EXAMS.forEach(function(e) {
  // Index page
  urls.push({ loc: BASE + '/' + e + '/', priority: '0.9' });

  var papersDir = path.join(root, '..', e, 'papers');
  if (!fs.existsSync(papersDir)) return;

  var files = fs.readdirSync(papersDir).filter(function(f) { return f.endsWith('.html'); }).sort();
  files.forEach(function(f) {
    urls.push({ loc: BASE + '/' + e + '/papers/' + f, priority: '0.8' });
  });
});

// PDF listing pages or latest.json reference
// (PDFs themselves are behind premium, skip them)

var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
urls.forEach(function(u) {
  xml += '  <url>\n    <loc>' + u.loc + '</loc>\n    <lastmod>' + today() + '</lastmod>\n    <priority>' + u.priority + '</priority>\n  </url>\n';
});
xml += '</urlset>\n';

fs.writeFileSync(path.join(root, '..', 'sitemap.xml'), xml, 'utf-8');
console.log('Sitemap generated: ' + urls.length + ' URLs');

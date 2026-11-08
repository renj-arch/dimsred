var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var BASE = 'https://vlymbooq.qzz.io';

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// The site is served with clean URLs: every *.html request 308-redirects to
// the extensionless form. Submit the final URL, never the redirecting one.
function cleanUrl(rel) {
  var u = '/' + String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
  u = u.replace(/index\.html$/i, '');
  u = u.replace(/\.html$/i, '');
  return u || '/';
}

var urls = [];
var seen = Object.create(null);
function add(rel, priority) {
  var loc = cleanUrl(rel);
  if (seen[loc]) return;
  seen[loc] = true;
  urls.push({ loc: BASE + loc, priority: priority });
}

// Static pages
var staticPages = [
  { loc: 'index.html', priority: '1.0' },
  { loc: 'papers.html', priority: '0.9' },
  { loc: 'privacy.html', priority: '0.6' },
  { loc: 'dashboard.html', priority: '0.8' },
  { loc: 'community.html', priority: '0.8' },
  { loc: 'leaderboard.html', priority: '0.5' },
  { loc: 'mistakes.html', priority: '0.5' },
  { loc: 'recall.html', priority: '0.8' },
  { loc: 'premium.html', priority: '0.7' },
  { loc: 'badges.html', priority: '0.5' },
  { loc: 'knowledge-graph.html', priority: '0.8' },
  { loc: 'adaptive.html', priority: '0.8' },
  { loc: 'progress.html', priority: '0.7' },
  { loc: 'ask.html', priority: '0.8' },
  { loc: 'map.html', priority: '0.7' },
  { loc: 'flowchart.html', priority: '0.7' },
  { loc: 'news.html', priority: '0.9' },
  { loc: 'magazine.html', priority: '0.9' },
  { loc: 'current-affairs.html', priority: '0.8' },
  { loc: 'archive.html', priority: '0.8' },
  { loc: 'mains.html', priority: '0.9' },
  { loc: 'figures.html', priority: '0.8' },
  { loc: 'subject-figures-index.html', priority: '0.7' },
  { loc: 'revision.html', priority: '0.8' }
];

staticPages.forEach(function (p) { add(p.loc, p.priority); });

// Walk a directory recursively and submit every .html file.
function walkHtml(dir, relBase, priority) {
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return 0; }
  var n = 0;
  entries.forEach(function (e) {
    var full = path.join(dir, e.name);
    var rel = relBase ? relBase + '/' + e.name : e.name;
    if (e.isDirectory()) n += walkHtml(full, rel, priority);
    else if (/\.html$/i.test(e.name)) { add(rel, priority); n++; }
  });
  return n;
}

// Every top-level exam directory that publishes content pages. The list is
// discovered from disk so new exams are covered without editing this file.
var examDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter(function (e) {
    if (!e.isDirectory()) return false;
    if (e.name.charAt(0) === '.' || e.name === 'node_modules' || e.name === 'scripts' || e.name === 'css' || e.name === 'js') return false;
    var base = path.join(root, e.name);
    return ['papers', 'chapters', 'course', 'mock-tests'].some(function (sub) {
      return fs.existsSync(path.join(base, sub));
    });
  })
  .map(function (e) { return e.name; })
  .sort();

examDirs.forEach(function (exam) {
  add(exam + '/index.html', '0.9');
  var base = path.join(root, exam);
  if (fs.existsSync(path.join(base, 'papers'))) walkHtml(path.join(base, 'papers'), exam + '/papers', '0.8');
  if (fs.existsSync(path.join(base, 'chapters'))) walkHtml(path.join(base, 'chapters'), exam + '/chapters', '0.8');
  if (fs.existsSync(path.join(base, 'mock-tests'))) walkHtml(path.join(base, 'mock-tests'), exam + '/mock-tests', '0.7');
  if (fs.existsSync(path.join(base, 'course'))) {
    add(exam + '/course/index.html', '0.8');
    walkHtml(path.join(base, 'course'), exam + '/course', '0.7');
  }
});

var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
urls.forEach(function (u) {
  xml += '  <url>\n    <loc>' + u.loc + '</loc>\n    <lastmod>' + today() + '</lastmod>\n    <priority>' + u.priority + '</priority>\n  </url>\n';
});
xml += '</urlset>\n';

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml, 'utf-8');
console.log('Sitemap generated: ' + urls.length + ' URLs (' + examDirs.length + ' exam directories)');

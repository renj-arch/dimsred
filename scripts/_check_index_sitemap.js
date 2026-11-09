// Check the UPSC course index covers all optional subjects and lessons, and
// validate the generated sitemap.
const fs = require('fs');
const c = require('./exam-configs.json');

const index = fs.readFileSync('upsc/course/index.html', 'utf8');
const subs = c.upsc.moduleOrder.filter(k => k.startsWith('opt-'));
const missingSubs = subs.filter(k => !index.includes('href="' + k + '/lesson-overview.html"'));
let lessonLinks = 0;
subs.forEach(k => {
  (c.upsc.modules[k].lessons || []).forEach(l => {
    if (index.includes('href="' + k + '/lesson-' + l.slug + '.html"')) lessonLinks++;
  });
});
console.log('optional subjects in config:', subs.length);
console.log('missing overview links in course index:', missingSubs.length, missingSubs.join(', '));
console.log('optional lesson links in course index:', lessonLinks);

const xml = fs.readFileSync('sitemap.xml', 'utf8');
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
console.log('sitemap URLs:', locs.length);
console.log('sitemap URLs ending in .html:', locs.filter(u => /\.html$/i.test(u)).length);
console.log('duplicate sitemap URLs:', locs.length - new Set(locs).size);
const optLocs = locs.filter(u => /\/upsc\/course\/opt-/.test(u));
console.log('optional lesson URLs in sitemap:', optLocs.length);
const missingOpt = [];
subs.forEach(k => {
  (c.upsc.modules[k].lessons || []).forEach(l => {
    const url = 'https://vlymbooq.qzz.io/upsc/course/' + k + '/lesson-' + l.slug;
    if (!locs.includes(url)) missingOpt.push(url);
  });
});
console.log('optional lessons missing from sitemap:', missingOpt.length, missingOpt.slice(0, 5).join(', '));

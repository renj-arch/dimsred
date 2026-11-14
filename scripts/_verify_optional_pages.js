// Verify every optional lesson page has real content, valid embedded practice
// questions, and script-correct language samples.
// Run: node scripts/_verify_optional_pages.js
const fs = require('fs');
const path = require('path');
const verify = require('./lib/language-verify');

const dirs = fs.readdirSync('upsc/course').filter(d => d.startsWith('opt-') && fs.statSync(path.join('upsc/course', d)).isDirectory());
const scriptBySlug = {
  bodo: 'devanagari', dogri: 'devanagari', kashmiri: 'arabic', santali: 'olchiki'
};
let pages = 0;
const issues = [];
const counts = {};
dirs.forEach(d => {
  fs.readdirSync(path.join('upsc/course', d)).filter(f => /^lesson-.*\.html$/.test(f)).forEach(f => {
    pages++;
    const p = path.join('upsc/course', d, f);
    const h = fs.readFileSync(p, 'utf8');
    if (!h.includes('class="lesson-body"')) issues.push(p + ': no lesson-body');
    if (/Below is a structured overview of the core concepts you need to master/.test(h)) issues.push(p + ': placeholder body');
    if (h.includes('\uFFFD')) issues.push(p + ': replacement character');

    const m = h.match(/<div class="lesson-body">([\s\S]*?)<h3[^>]*>Practice Questions<\/h3>/);
    if (m) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.split(' ').length < 300) issues.push(p + ': body only ' + text.split(' ').length + ' words');
    } else {
      issues.push(p + ': no practice heading');
    }

    const qm = h.match(/var practiceQs\s*=\s*(\[[\s\S]*?\]);/);
    if (!qm) {
      issues.push(p + ': no embedded practiceQs');
    } else {
      let qs;
      try { qs = JSON.parse(qm[1]); } catch (e) { issues.push(p + ': practiceQs JSON invalid'); }
      if (qs) {
        counts[qs.length] = (counts[qs.length] || 0) + 1;
        qs.forEach((q, i) => {
          const texts = q.options.map(o => o.t);
          const correct = q.options.filter(o => o.c);
          if (texts.length !== 4 || texts.some(t => !t) || new Set(texts).size !== 4 || correct.length !== 1) {
            issues.push(p + ': malformed q' + (i + 1));
          }
        });
      }
    }

    const slug = d.replace(/^opt-/, '');
    if (scriptBySlug[slug] && /lesson-paper[12]\.html$/.test(f)) {
      const sm = h.match(/Model-generated practice passage[\s\S]*?<div class="ex-text"[^>]*>([\s\S]*?)<\/div>/);
      if (!sm) {
        issues.push(p + ': missing script sample');
      } else {
        const stats = verify.scriptStats(sm[1], scriptBySlug[slug]);
        if (stats.coverage < 0.9 || stats.latin > 0) {
          issues.push(p + ': sample script coverage ' + (stats.coverage * 100).toFixed(1) + '% latin=' + stats.latin);
        }
      }
    }
  });
});
console.log('optional pages:', pages);
console.log('question-count distribution:', JSON.stringify(counts));
console.log('issues:', issues.length);
issues.slice(0, 40).forEach(i => console.log('  ' + i));

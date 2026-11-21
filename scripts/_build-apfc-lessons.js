// Assemble APFC course lesson pages from the shared site shell.
// Each lesson's `body` field contains: lesson-body inner HTML + the
// lesson-body close + practice chrome + `<script>var practiceQs=[...]`.
// Usage: node scripts/_build-apfc-lessons.js
const fs = require('fs');
const path = require('path');
const DATA = require('./_apfc-lessons-data.js');

const headTpl = fs.readFileSync(path.join(__dirname, '_tmp-shell-head.html'), 'utf8');
const tailTpl = fs.readFileSync(path.join(__dirname, '_tmp-shell-tail.js'), 'utf8');

const NAV = [
  ['lesson-general-knowledge.html', 'General Knowledge'],
  ['lesson-mathematics.html', 'Mathematics'],
  ['lesson-mental-ability.html', 'Mental Ability'],
  ['lesson-english.html', 'English'],
  ['lesson-current-affairs.html', 'Current Affairs'],
  ['lesson-industrial-relations.html', 'Industrial Relations'],
  ['lesson-accountancy.html', 'Accountancy & Insurance']
];

function sidebar(active) {
  return NAV.map(([href, label]) =>
    '                    <a href="' + href + '"' + (href === active ? ' class="active"' : '') + '>' + label + '</a>'
  ).join('\n');
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const SPLIT = '\n                </div>\n                <h3 style="margin-top:24px';

for (const L of DATA) {
  let head = headTpl
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(L.title) + ' | vlymbooq</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(L.desc) + '">')
    .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://vlymbooq.qzz.io/apfc/course/' + L.slug + '.html">');

  const side = '            <div class="side">\n                <div class="sidebar-nav">\n                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">UPSC APFC</div>\n' + sidebar(L.slug + '.html') + '\n                </div>\n            </div>\n            <div class="main">';

  const header = '                <div style="margin-bottom:16px">\n' +
    '                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">' + esc(L.kicker) + '</div>\n' +
    '                    <h1 style="font-size:1.5em;font-weight:900">' + esc(L.h1) + '</h1>\n' +
    '                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">' + esc(L.sub) + '</div>\n' +
    '                    <div style="display:flex;gap:8px;margin-top:10px">\n' +
    '                        <button onclick="window.print()" class="download-btn">&#x1f4c4; Download PDF</button>\n' +
    '                        <a href="../mock-tests/index.html" class="download-btn">&#x1f3af; Take Mock Test</a>\n' +
    '                    </div>\n' +
    '                </div>\n';

  const idx = L.body.indexOf(SPLIT);
  if (idx === -1) throw new Error('body split marker not found in ' + L.slug);
  const lessonInner = L.body.slice(0, idx);
  const rest = L.body.slice(idx + '\n                </div>\n'.length); // starts at <h3 ...>Practice Questions

  const tail = tailTpl.replace(/apfc-mathematics/g, L.slug);

  const out = head + '        <div class="flex-row">\n' + side + header +
    '                <div class="lesson-body">\n' + lessonInner + '\n                </div>\n' +
    rest + ';\n' + tail;

  fs.writeFileSync(path.join(__dirname, '..', 'apfc', 'course', L.slug + '.html'), out);
  console.log('wrote', L.slug + '.html', out.length, 'bytes');
}

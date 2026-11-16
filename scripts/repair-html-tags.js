// Conservative HTML tag repair for course pages.
//
// Closes unclosed tags at end of document in proper LIFO nesting order.
// Only closes tags that affect visible layout/structure:
//   div, p, li, td, tr, th, ul, ol, table, thead, tbody, caption,
//   strong, em, span, h3, h4, button, a, example-box-related wrappers
//
// NEVER closes document-structure tags: html, head, body, style, nav, script.
//
// Safe: only APPENDS </tag> at end-of-document (before </body> if present).
// Never removes, reorders, or rewrites existing content.
//
// Usage: node scripts/repair-html-tags.js        (write fixes)
//        node scripts/repair-html-tags.js --dry  (report only)

const fs = require('fs');
const path = require('path');

const ROOT = 'upsc/course';
const DRY = process.argv.includes('--dry');

// Closing these at end-of-document is safe and fixes layout bleed.
const CLOSABLE_TAGS = new Set([
  'div','p','li','td','tr','th','ul','ol','table','thead','tbody','caption',
  'strong','em','span','h3','h4','button','a','example-box','tip-box','framework-box','pyq-box','diagram-box','q-card','q-opt','progress-bar','module-card'
]);

// Document structure — browsers auto-close these; never touch them.
const STRUCTURE_TAGS = new Set(['html','head','body','head','style','nav','script']);

const voidElements = new Set(['img','br','hr','input','meta','link','source','track','wbr','area','base','col','embed']);
const svgVoid = new Set(['stop','circle','rect','line','polygon','path','use','image','mesh','swap','switch','symbol','marker','clipPath','mask','pattern','foreignObject','title','desc','defs','linearGradient','radialGradient']);

function collectHtmlFiles(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectHtmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = collectHtmlFiles(ROOT, []);
const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

let changed = 0;
let totalFixed = 0;

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const lines = cleaned.split('\n');

  // Stack of tag NAMES (strings) so lastIndexOf works correctly.
  const stack = [];
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    let m;
    tagRegex.lastIndex = 0;
    while ((m = tagRegex.exec(line)) !== null) {
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase();
      if (voidElements.has(tag) || svgVoid.has(tag)) continue;
      if (isClose) {
        const idx = stack.lastIndexOf(tag);
        if (idx !== -1) {
          while (stack.length - 1 > idx) stack.pop();
          stack.pop();
        }
        // stray close with no match: ignore
      } else {
        stack.push(tag);
      }
    }
  }

  // Filter to closable, non-structure tags still open at end of document.
  const toClose = stack.filter(t => CLOSABLE_TAGS.has(t) && !STRUCTURE_TAGS.has(t));
  if (toClose.length === 0) continue;

  const closes = toClose.slice().reverse().map(t => '</' + t + '>').join('');
  const summary = toClose.map(t => t + '@L?').join(', ');

  if (DRY) {
    console.log('WOULD FIX ' + f + ' — close ' + toClose.length + ' tag(s): ' + summary);
    changed++;
    totalFixed += toClose.length;
    continue;
  }

  let fixedHtml;
  const bodyCloseIdx = html.lastIndexOf('</body>');
  if (bodyCloseIdx !== -1) {
    fixedHtml = html.slice(0, bodyCloseIdx) + closes + html.slice(bodyCloseIdx);
  } else {
    fixedHtml = html + closes;
  }
  fs.writeFileSync(f, fixedHtml, 'utf8');
  changed++;
  totalFixed += toClose.length;
  console.log('FIXED ' + f + ' — closed ' + toClose.length + ' tag(s): ' + summary);
}

console.log('');
console.log('========================================');
console.log('Files scanned: ' + files.length);
console.log(DRY ? 'WOULD FIX' : 'Files fixed' + ':   ' + changed);
console.log(DRY ? 'WOULD CLOSE' : 'Tags closed' + ':   ' + totalFixed);
if (DRY) console.log('(dry run — no files modified)');
process.exit(changed > 0 ? 1 : 0);

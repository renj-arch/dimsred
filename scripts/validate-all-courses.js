const fs = require('fs');
const path = require('path');

const ROOT = 'upsc/course';
const voidElements = ['img','br','hr','input','meta','link','source','track','wbr','area','base','col','embed'];
const svgVoid = ['stop','circle','rect','line','polygon','path','use','image','mesh','swap','switch','symbol','marker','clipPath','mask','pattern','foreignObject','title','desc','defs','linearGradient','radialGradient'];

function collectHtmlFiles(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectHtmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = collectHtmlFiles(ROOT, []);

function validateFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  // Strip script content before validation (JS string literals contain fake <div> tags)
  const cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  const lines = cleaned.split('\n');

  const stack = [];
  const tagRegex = /<(\/?)([a-zA-Z0-9]+)[^>]*>/g;
  let errors = 0;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    let m;
    while ((m = tagRegex.exec(line)) !== null) {
      const isClose = m[1] === '/';
      const tagName = m[2].toLowerCase();
      if (voidElements.includes(tagName) || svgVoid.includes(tagName)) continue;
      if (isClose) {
        if (stack.length === 0) {
          console.log('  [' + path.basename(filePath) + '] Line ' + lineNum + ': Unmatched close </' + tagName + '>');
          errors++;
        } else if (stack[stack.length - 1] !== tagName) {
          console.log('  [' + path.basename(filePath) + '] Line ' + lineNum + ': Mismatch close </' + tagName + '> expected </' + stack[stack.length - 1] + '>');
          errors++;
        } else {
          stack.pop();
        }
      } else {
        stack.push(tagName);
      }
    }
  }

  if (stack.length > 0) {
    console.log('  [' + path.basename(filePath) + '] Unclosed tags at end: ' + stack.join(', '));
    errors += stack.length;
  }

  const dOpen = (html.match(/<div\b/g) || []).length;
  const dClose = (html.match(/<\/div>/g) || []).length;
  const divDiff = dOpen - dClose;

  // Check for digit-starting tags like <50m>, <1>, <10>, etc. (outside script tags)
  const digitTagRegex = /<([0-9][a-zA-Z0-9]*)[^>]*>/g;
  let digitTags = [];
  let dm;
  while ((dm = digitTagRegex.exec(cleaned)) !== null) {
    const idx = dm.index;
    const ln = cleaned.substring(0, idx).split('\n').length;
    digitTags.push('Line ' + ln + ': ' + JSON.stringify(dm[0]));
  }

  // Check for </framework>, </tip>, </practiceqs>, </framework-box>, </tip-box>
  const badCloses = ['</framework>', '</tip>', '</practiceqs>', '</framework-box>', '</tip-box>'];
  let badCloseFound = [];
  for (const bc of badCloses) {
    const c = (cleaned.match(new RegExp('\\' + bc, 'g')) || []).length;
    if (c > 0) badCloseFound.push(bc + ' x' + c);
  }

  return {
    file: filePath,
    errors,
    unclosed: stack.length,
    divOpen: dOpen,
    divClose: dClose,
    divDiff,
    digitTags,
    badCloses: badCloseFound,
    matched: errors === 0 && stack.length === 0 && divDiff === 0
  };
}

let totalErrors = 0;
let totalDivDiff = 0;
let totalFiles = 0;
let anyIssues = false;

for (const f of files) {
  totalFiles++;
  const r = validateFile(f);
  totalErrors += r.errors;
  totalDivDiff += Math.abs(r.divDiff);
  if (!r.matched || r.digitTags.length > 0 || r.badCloses.length > 0) {
    anyIssues = true;
    console.log('');
    console.log('FILE: ' + f);
    console.log('  Errors: ' + r.errors + ', Unclosed: ' + r.unclosed + ', Div diff: ' + r.divDiff + ' (' + r.divOpen + ' open / ' + r.divClose + ' close)');
    if (r.digitTags.length > 0) {
      console.log('  Digit-starting tags:');
      r.digitTags.forEach(t => console.log('    ' + t));
    }
    if (r.badCloses.length > 0) {
      console.log('  Bad closing tags: ' + r.badCloses.join(', '));
    }
  } else {
    console.log('OK: ' + path.basename(f) + ' (divs ' + r.divOpen + '/' + r.divClose + ', errors 0)');
  }
}

console.log('');
console.log('========================================');
console.log('TOTAL: ' + totalFiles + ' files checked');
console.log('Total HTML errors (reported only): ' + totalErrors);
console.log('Total div imbalance (build-failing): ' + totalDivDiff);

// Deploy gate stays green unless a page has unclosed/mismatched <div> tags —
// that's the defect class that bleeds borders/backgrounds to the page bottom
// (the "colored lines" defect). Other tag issues are reported for incremental
// fixing but do not fail the build.
const divFail = totalDivDiff > 0;
console.log('Div-balance gate: ' + (divFail ? 'RED' : 'GREEN'));

process.exit(divFail ? 1 : 0);

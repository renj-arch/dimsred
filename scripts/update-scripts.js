const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function fixFile(fp) {
  let content = fs.readFileSync(fp, 'utf-8');
  const orig = content;

  const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);

  // Remove old individual scripts (with or without version query)
  const scriptsToRemove = [
    /<script[^>]*src=["'][^"']*\/?theme\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /<script[^>]*src=["'][^"']*\/?shared\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /<script[^>]*src=["'][^"']*\/?study-content\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /<script[^>]*src=["'][^"']*\/?study-engine\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /<script[^>]*src=["'][^"']*\/?calendar\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /<script[^>]*src=["'][^"']*\/?pagination\.js[^"']*["'][^>]*><\/script>\s*/gi,
  ];
  scriptsToRemove.forEach(function(rx) {
    content = content.replace(rx, '');
  });

  // Ensure core.js is present
  const coreRef = prefix + 'js/bundles/core.js';
  const coreTag = '<script src="' + coreRef + '"></script>';
  if (content.indexOf(coreRef) === -1) {
    content = content.replace('<head>', '<head>\n    ' + coreTag + '\n    ');
  }

  // Add study bundle if page has study data
  if (content.indexOf('study-data') !== -1 || content.indexOf('study-content') !== -1 || content.indexOf('STUDY_DATA') !== -1) {
    const studyRef = prefix + 'js/bundles/study.js';
    const studyTag = '<script src="' + studyRef + '"></script>';
    if (content.indexOf(studyRef) === -1) {
      content = content.replace(coreTag, coreTag + '\n    ' + studyTag);
    }
  }

  // Add exam bundle if page has calendar
  if (content.indexOf('exam-calendar') !== -1) {
    const examRef = prefix + 'js/bundles/exam.js';
    const examTag = '<script src="' + examRef + '"></script>';
    if (content.indexOf(examRef) === -1) {
      content = content.replace(coreTag, coreTag + '\n    ' + examTag);
    }
  }

  if (content !== orig) {
    fs.writeFileSync(fp, content, 'utf-8');
    return true;
  }
  return false;
}

function walk(dir) {
  let changed = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      changed += walk(fp);
    } else if (e.name.endsWith('.html')) {
      if (fixFile(fp)) changed++;
    }
  }
  return changed;
}

const total = walk(ROOT);
console.log('Updated ' + total + ' files');

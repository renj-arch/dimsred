const fs = require('fs');

let content = fs.readFileSync('archive.html', 'utf8');

// Step 1: Parse all ssView panels and count actual questions
const panelCounts = new Map(); // "Category||Subject||SubSubject" -> count

// Match each ssView content panel with its question-list
let idx = 0;
let panelStart, panelEnd, ssViewId;

while (true) {
  panelStart = content.indexOf('<div class="content-panel" id="ssView-', idx);
  if (panelStart === -1) break;

  const idStart = panelStart + '<div class="content-panel" id="ssView-'.length;
  const idEnd = content.indexOf('"', idStart);
  ssViewId = content.substring(idStart, idEnd);

  // Find the matching closing </div> for this content-panel
  let depth = 0;
  let pos = panelStart;
  while (pos < content.length) {
    const openTag = content.indexOf('<div', pos);
    const closeTag = content.indexOf('</div>', pos);
    if (closeTag === -1) break;
    if (openTag !== -1 && openTag < closeTag) {
      depth++;
      pos = openTag + 4;
    } else {
      depth--;
      pos = closeTag + 6;
      if (depth === 0) {
        panelEnd = pos;
        break;
      }
    }
  }

  const panelContent = content.substring(panelStart, panelEnd);

  // Count q-item elements in this panel
  let qCount = 0;
  let searchPos = 0;
  while (true) {
    const qi = panelContent.indexOf('<div class="q-item"', searchPos);
    if (qi === -1) break;
    qCount++;
    searchPos = qi + 1;
  }

  panelCounts.set(ssViewId, qCount);
  idx = panelEnd;
}

console.log(`Found ${panelCounts.size} subsubject panels with questions`);

// Step 2: Update sidebar subsub counts
for (const [ssViewId, count] of panelCounts) {
  const escaped = ssViewId.replace(/&/g, '&amp;');
  const regex = new RegExp(
    '(data-subsub="' + escapeRegex(escaped) + '"[^>]*>[\\s\\S]*?<span class="sidebar-count">)(\\d+)(</span>)'
  );
  let match = content.match(regex);
  if (match) {
    const oldCount = parseInt(match[2]);
    if (oldCount !== count && count > 0) {
      content = content.substring(0, match.index) + match[1] + count + match[3] + content.substring(match.index + match[0].length);
    }
  } else {
    // Try without escaping (some might use & directly)
    const regex2 = new RegExp(
      '(data-subsub="' + escapeRegex(ssViewId) + '"[^>]*>[\\s\\S]*?<span class="sidebar-count">)(\\d+)(</span>)'
    );
    match = content.match(regex2);
    if (match) {
      const oldCount = parseInt(match[2]);
      if (oldCount !== count && count > 0) {
        content = content.substring(0, match.index) + match[1] + count + match[3] + content.substring(match.index + match[0].length);
      }
    }
  }
}

// Step 3: Calculate subject and category totals
const subjectTotals = new Map();
for (const [ssViewId, count] of panelCounts) {
  const parts = ssViewId.split('||');
  if (parts.length >= 2) {
    const key = parts[0] + '||' + parts[1];
    subjectTotals.set(key, (subjectTotals.get(key) || 0) + count);
  }
}

// Step 4: Update subject-level counts
for (const [subjectKey, count] of subjectTotals) {
  const escaped = subjectKey.replace(/&/g, '&amp;');
  const regex = new RegExp(
    '(data-subj="' + escapeRegex(escaped) + '"[^>]*>[\\s\\S]*?<span class="sidebar-count">)(\\d+)(</span>)'
  );
  const match = content.match(regex);
  if (match) {
    const oldCount = parseInt(match[2]);
    if (oldCount !== count) {
      content = content.substring(0, match.index) + match[1] + count + match[3] + content.substring(match.index + match[0].length);
    }
  }
}

// Step 5: Calculate category totals
const catTotals = new Map();
for (const [subjectKey, count] of subjectTotals) {
  const catKey = subjectKey.split('||')[0];
  catTotals.set(catKey, (catTotals.get(catKey) || 0) + count);
}

// Step 6: Update category-level counts
for (const [catKey, count] of catTotals) {
  const escaped = catKey.replace(/&/g, '&amp;');
  const regex = new RegExp(
    '(data-cat="' + escapeRegex(escaped) + '"[^>]*>[\\s\\S]*?<span class="sidebar-count">)(\\d+)(</span>)'
  );
  const match = content.match(regex);
  if (match) {
    const oldCount = parseInt(match[2]);
    if (oldCount !== count) {
      content = content.substring(0, match.index) + match[1] + count + match[3] + content.substring(match.index + match[0].length);
    }
  }
}

// Step 7: Update meta description total
const totalQuestions = Array.from(panelCounts.values()).reduce((a, b) => a + b, 0);
const metaMatch = content.match(
  /(Complete archive of )(\d+)( GK & Current Affairs questions)/
);
if (metaMatch) {
  const oldTotal = parseInt(metaMatch[2]);
  if (oldTotal !== totalQuestions) {
    content = content.replace(metaMatch[0], metaMatch[1] + totalQuestions + metaMatch[3]);
    console.log(`Updated meta total: ${oldTotal} -> ${totalQuestions}`);
  }
}

fs.writeFileSync('archive.html', content, 'utf8');
console.log('Sidebar counts updated successfully!');
console.log(`Total questions remaining: ${totalQuestions}`);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

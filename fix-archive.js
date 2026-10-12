const fs = require('fs');

const content = fs.readFileSync('archive.html', 'utf8');
const originalLength = content.length;

// Bad question detection patterns
function isBadQuestion(block) {
  // Extract the question text from inside q-question div's <a> tag
  const qMatch = block.match(/<div class="q-question"><a[^>]*>([\s\S]*?)<\/a><\/div>/);
  if (!qMatch) return false;
  
  const qText = qMatch[1].trim();
  const aMatch = block.match(/<span class="a-value">([^<]*)<\/span>/);
  const answer = aMatch ? aMatch[1].trim() : '';

  // Check if this is an old-style (q-q) question
  const isOldStyle = /href="questions\/q-q\d+\.html"/.test(block);
  if (!isOldStyle) return false; // Keep new-style questions

  // BAD PATTERN 1: Contains Wikipedia section headers (=== or ==)
  // But not inside quoted strings
  if (/={2,}\s/.test(qText) && !/"[^"]*={2,}[^"]*"/.test(qText)) {
    console.log(`  REMOVE [WikiHeader]: ${qText.substring(0, 80)}...`);
    return true;
  }

  // BAD PATTERN 2: Text starts with lowercase letter (mid-sentence continuation)
  if (/^[a-z][a-z]/.test(qText) && !qText.startsWith('pH') && !qText.startsWith('e.g')) {
    console.log(`  REMOVE [LowerCaseStart]: ${qText.substring(0, 80)}...`);
    return true;
  }

  // BAD PATTERN 3: Text starts with a digit (continuation from numbered list)
  if (/^\d/.test(qText)) {
    console.log(`  REMOVE [DigitStart]: ${qText.substring(0, 80)}...`);
    return true;
  }

  // BAD PATTERN 4: Text starts with "Notes:" 
  if (/^Notes:/i.test(qText)) {
    console.log(`  REMOVE [NotesPrefix]: ${qText.substring(0, 80)}...`);
    return true;
  }

  // BAD PATTERN 5: Text is cut off at end - ends with single capital letter or incomplete word
  // Ends with single char before closing tag
  const endsWithSingleLetter = /[A-Z]\.?$/.test(qText) && qText.length > 5;
  const endsWithTruncated = /[A-Z][a-z]?,\s*$/.test(qText) || /,\s*[A-Z]?$/.test(qText);
  
  if (endsWithSingleLetter) {
    console.log(`  REMOVE [TruncatedEnd]: ${qText.substring(0, 80)}...`);
    return true;
  }

  // BAD PATTERN 6: Answer looks like it was extracted from section header
  // Answer matches a section header pattern that appears in the question
  if (/^[A-Z][a-z]+\s[A-Z]/.test(answer) && answer.length < 30) {
    if (qText.startsWith(answer) || qText.includes(`=== ${answer}`) || qText.includes(`== ${answer}`)) {
      console.log(`  REMOVE [HeaderAnswer]: Q="${qText.substring(0, 60)}..." A="${answer}"`);
      return true;
    }
  }

  // BAD PATTERN 7: Question text is very short and seems incomplete
  // (Less than 15 chars and doesn't look like a proper question)
  if (qText.length < 15 && !qText.includes('?') && !qText.startsWith('What')) {
    console.log(`  REMOVE [TooShort]: ${qText}`);
    return true;
  }

  return false;
}

// Parse the file and find all q-item blocks
const result = [];
let i = 0;
let removed = 0;
let kept = 0;
let oldTotal = 0;
let newTotal = 0;

while (i < content.length) {
  // Find next q-item start
  const itemStart = content.indexOf('<div class="q-item"', i);
  
  if (itemStart === -1) {
    // No more items, append remaining content
    result.push(content.substring(i));
    break;
  }

  // Append content before this q-item
  result.push(content.substring(i, itemStart));

  // Find the matching closing </div> for this q-item
  // The block starts after the opening tag
  let depth = 0;
  let pos = itemStart;
  let found = false;

  while (pos < content.length) {
    const openTag = content.indexOf('<div', pos);
    const closeTag = content.indexOf('</div>', pos);

    if (closeTag === -1) break;

    if (openTag !== -1 && openTag < closeTag) {
      depth++;
      pos = openTag + 4; // skip past '<div'
    } else {
      depth--;
      pos = closeTag + 6; // skip past '</div>'
      if (depth === 0) {
        found = true;
        break;
      }
    }
  }

  if (!found) {
    // If we can't find the matching close, just keep going
    result.push(content.substring(itemStart));
    break;
  }

  // Extract the full block
  const block = content.substring(itemStart, pos);
  
  // Count stats
  if (/href="questions\/q-q\d+\.html"/.test(block)) {
    oldTotal++;
    if (isBadQuestion(block)) {
      removed++;
      // Don't push this block (remove it)
      i = pos;
      continue;
    }
  } else {
    newTotal++;
  }

  kept++;
  result.push(block);
  i = pos;
}

const fixedContent = result.join('');

fs.writeFileSync('archive.html', fixedContent, 'utf8');

console.log('\n=== SUMMARY ===');
console.log(`File size: ${(originalLength / 1024 / 1024).toFixed(2)}MB -> ${(fixedContent.length / 1024 / 1024).toFixed(2)}MB`);
console.log(`Old-style (q-q) questions found: ${oldTotal}`);
console.log(`New-style (q-fill) questions found: ${newTotal}`);
console.log(`Bad questions removed: ${removed}`);
console.log(`Total questions kept: ${kept}`);

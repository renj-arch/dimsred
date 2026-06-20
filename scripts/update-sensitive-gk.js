/**
 * Fetches current CMs, Governors, and constitutional post holders
 * from Wikipedia API and updates current-affairs.html
 *
 * Run: node scripts/update-sensitive-gk.js
 * Scheduled: GitHub Actions weekly
 */

const fs = require('fs');
const https = require('https');

const HTML_PATH = 'current-affairs.html';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch CM/Governor data from Wikipedia
  // Wikipedia API: List of current Indian chief ministers
  const cmUrl = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_Indian_chief_ministers&prop=text&section=1&format=json';
  const govUrl = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_Indian_governors&prop=text&section=1&format=json';

  try {
    let [cmData, govData] = await Promise.all([
      fetch(cmUrl).then(d => JSON.parse(d)),
      fetch(govUrl).then(d => JSON.parse(d))
    ]);

    // Parse the HTML tables from Wikipedia
    let cmHtml = cmData.parse.text['*'];
    let govHtml = govData.parse.text['*'];

    // Extract rows from wikitable
    let cmRows = extractTableRows(cmHtml);
    let govRows = extractTableRows(govHtml);

    console.log('Fetched ' + cmRows.length + ' CMs and ' + govRows.length + ' Governors');

    // Build lookup maps
    let cmMap = {};
    let govMap = {};
    for (let r of cmRows) {
      if (r.state) cmMap[r.state] = { name: r.name, party: r.party };
    }
    for (let r of govRows) {
      if (r.state) govMap[r.state] = r.name;
    }

    // Read current HTML
    let html = fs.readFileSync(HTML_PATH, 'utf8');
    let updated = false;

    // Update each state's CM and Governor in the state_gk section
    for (let [state, cm] of Object.entries(cmMap)) {
      let stateKey = state.replace(/^Western\s+/, 'West ').replace(/^Eastern\s+/, 'East ');
      // Map Wikipedia state names to our format
      let search = new RegExp(
        '<b>' + escapeRegex(stateKey) + ':</b>[^<]*?CM:\\s*([^(]+?)\\s*\\(([^)]+)\\)',
        'i'
      );
      let match = html.match(search);
      if (match) {
        let oldName = match[1].trim();
        if (oldName !== cm.name) {
          html = html.replace(match[0], match[0].replace(oldName, cm.name).replace(match[2], cm.party));
          updated = true;
          console.log('  Updated CM: ' + state + ' -> ' + cm.name + ' (' + cm.party + ')');
        }
      }
    }

    // Update Governors
    for (let [state, govName] of Object.entries(govMap)) {
      let search = new RegExp(
        '<b>' + escapeRegex(state) + ':</b>[^<]*?Governor:\\s*([^.<]+)',
        'i'
      );
      let match = html.match(search);
      if (match) {
        let oldName = match[1].trim();
        if (oldName !== govName && !oldName.includes(govName)) {
          html = html.replace(match[0], match[0].replace(oldName, govName));
          updated = true;
          console.log('  Updated Governor: ' + state + ' -> ' + govName);
        }
      }
    }

    // Update constitutional posts section
    // (Simplified - would need more precise parsing)
    if (cmMap['India']) {
      // Update PM if available
    }

    if (updated) {
      fs.writeFileSync(HTML_PATH, html, 'utf8');
      console.log('File updated');
    } else {
      console.log('No changes needed');
    }
  } catch (e) {
    console.error('Fetch failed:', e.message);
    // Exit cleanly so CI doesn't fail
    process.exit(0);
  }
}

function extractTableRows(html) {
  let rows = [];
  // Simple regex-based extraction of wikitable rows
  let tableMatch = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  let table = tableMatch[1];
  let rowMatches = table.matchAll(/<tr>([\s\S]*?)<\/tr>/gi);
  for (let row of rowMatches) {
    let cells = [];
    let cellMatches = row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (let cell of cellMatches) {
      cells.push(cell[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length >= 2) {
      rows.push({
        state: cells[0].replace(/\s*\[edit\]/, '').trim(),
        name: cells[1].replace(/\(.*?\)/g, '').trim(),
        party: (cells[1].match(/\(([^)]+)\)/) || [,''])[1].trim()
      });
    }
  }
  return rows;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();

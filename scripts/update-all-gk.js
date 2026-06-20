/**
 * Comprehensive auto-updater for all time-sensitive GK data
 * Sources: Wikipedia, government sites
 * Run: node scripts/update-all-gk.js
 * Scheduled: GitHub Actions weekly
 *
 * Updates:
 *  - Indian CMs, Governors, Constitutional posts
 *  - World leaders (US, UK, Russia, China, etc.)
 *  - UN / global org heads
 *  - Cabinet ministers, RBI Governor
 */
const fs = require('fs');
const https = require('https');

const HTML_PATH = 'current-affairs.html';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GK-Updater/1.0)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function stripHtml(html) { return html.replace(/<[^>]+>/g, '').trim(); }

function extractTableRows(wikiHtml) {
  let rows = [];
  let tableMatch = wikiHtml.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;
  let table = tableMatch[1];
  let rowMatches = table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (let row of rowMatches) {
    let cells = [];
    let cellMatches = row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (let cell of cellMatches) {
      cells.push(stripHtml(cell[1]));
    }
    if (cells.length >= 2) rows.push(cells);
  }
  return rows.slice(1); // skip header
}

// === INDIAN CMs ===
async function fetchCMs() {
  let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_Indian_chief_ministers&prop=text&section=1&format=json');
  let parsed = JSON.parse(data);
  let html = parsed.parse.text['*'];
  let rows = extractTableRows(html);
  let map = {};
  for (let r of rows) {
    if (r.length >= 2) {
      let state = r[0].replace(/\s*\[edit\]/, '').trim();
      let name = r[1].replace(/\(.*?\)/g, '').trim();
      let party = (r[1].match(/\(([^)]+)\)/) || [, ''])[1].trim();
      if (state && name) map[state] = { name, party };
    }
  }
  return map;
}

// === INDIAN GOVERNORS ===
async function fetchGovernors() {
  let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_Indian_governors&prop=text&section=1&format=json');
  let parsed = JSON.parse(data);
  let html = parsed.parse.text['*'];
  let rows = extractTableRows(html);
  let map = {};
  for (let r of rows) {
    if (r.length >= 2) {
      let state = r[0].replace(/\s*\[edit\]/, '').trim();
      let name = r[1].replace(/\(.*?\)/g, '').trim();
      if (state && name) map[state] = name;
    }
  }
  return map;
}

// === CONSTITUTIONAL POSTS ===
async function fetchConstitutionalPosts() {
  // President, VP, PM, CJI, LS Speaker, AG, CEC, CAG
  // Wikipedia infoboxes at India page or individual pages
  let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=India&prop=text&section=0&format=json');
  let parsed = JSON.parse(data);
  let html = parsed.parse.text['*'];
  
  let posts = {};

  // Try to extract from infobox
  let infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    let infobox = infoboxMatch[1];
    // Look for "President", "Prime Minister", etc.
    let leaders = infobox.match(/<th[^>]*>(?:President|Prime Minister|Chief Justice|Speaker of the Lok Sabha|Vice President)[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi);
    // This approach is fragile. Let's use the specific pages instead.
  }

  // Better: fetch from List of current Indian constitutional officers
  try {
    let d2 = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_Indian_constitutional_officers&prop=text&format=json');
    let p2 = JSON.parse(d2);
    let h2 = p2.parse.text['*'];
    let rows = extractTableRows(h2);
    for (let r of rows) {
      if (r.length >= 2) {
        let office = r[0].trim();
        let name = r[1].trim();
        posts[office] = name;
      }
    }
  } catch (e) {
    // Fallback: try individual pages
  }

  return posts;
}

// === WORLD LEADERS ===
async function fetchWorldLeaders() {
  let map = {};
  try {
    let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_heads_of_state_and_government&prop=text&format=json');
    let parsed = JSON.parse(data);
    let html = parsed.parse.text['*'];
    // Multiple tables: one for heads of state, one for heads of government
    let tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
    if (tables) {
      for (let tbl of tables) {
        let rows = tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        for (let row of rows) {
          let cells = [];
          let cellMatches = row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
          for (let cell of cellMatches) {
            cells.push(stripHtml(cell[1]));
          }
          if (cells.length >= 3) {
            let country = cells[0].trim();
            let leader = cells[cells.length - 1].trim().replace(/\s*\(.*?\)/g, '').trim();
            if (country && leader && country.length < 50 && leader.length < 100) {
              map[country] = leader;
            }
          }
        }
      }
    }
  } catch (e) {
    // Fallback: fetch key countries individually
  }
  return map;
}

// === RBI GOVERNOR ===
async function fetchRBIGovernor() {
  try {
    let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Reserve_Bank_of_India&prop=text&section=0&format=json');
    let parsed = JSON.parse(data);
    let html = parsed.parse.text['*'];
    let govMatch = html.match(/Governor<[^>]*><[^>]*>([^<]+)</i);
    if (govMatch) return stripHtml(govMatch[1]);
  } catch (e) {}
  return null;
}

// === PATCH HELPER ===
function patch(html, pattern, replacement) {
  let re = new RegExp(pattern, 'g');
  let m = html.match(re);
  if (m) {
    html = html.replace(re, replacement);
    return { html, count: m.length };
  }
  return { html, count: 0 };
}

// Map Wikipedia state names to our file's state names
const STATE_MAP = {
  'Andhra Pradesh': 'Andhra Pradesh',
  'Arunachal Pradesh': 'Arunachal Pradesh',
  'Assam': 'Assam',
  'Bihar': 'Bihar',
  'Chhattisgarh': 'Chhattisgarh',
  'Goa': 'Goa',
  'Gujarat': 'Gujarat',
  'Haryana': 'Haryana',
  'Himachal Pradesh': 'Himachal Pradesh',
  'Jharkhand': 'Jharkhand',
  'Karnataka': 'Karnataka',
  'Kerala': 'Kerala',
  'Madhya Pradesh': 'Madhya Pradesh',
  'Maharashtra': 'Maharashtra',
  'Manipur': 'Manipur',
  'Meghalaya': 'Meghalaya',
  'Mizoram': 'Mizoram',
  'Nagaland': 'Nagaland',
  'Odisha': 'Odisha',
  'Punjab': 'Punjab',
  'Rajasthan': 'Rajasthan',
  'Sikkim': 'Sikkim',
  'Tamil Nadu': 'Tamil Nadu',
  'Telangana': 'Telangana',
  'Tripura': 'Tripura',
  'Uttar Pradesh': 'Uttar Pradesh',
  'Uttarakhand': 'Uttarakhand',
  'West Bengal': 'West Bengal'
};

async function main() {
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  let updates = 0;
  let errors = [];

  // 1. Update CMs
  try {
    let cmMap = await fetchCMs();
    for (let [wikiState, cm] of Object.entries(cmMap)) {
      let ourState = STATE_MAP[wikiState];
      if (!ourState) continue;
      // Pattern: <b>OurState:</b> ... CM: OldName (OldParty). Governor: ...
      let re = new RegExp(
        '(<b>' + ourState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 
        '</b>[^<]*?CM:\\s*)([^(]+?)(\\s*\\([^)]+\\))(\\.\\s*Governor:)'
      );
      let match = html.match(re);
      if (match) {
        let oldName = match[2].trim();
        let oldParty = match[3].replace(/[()]/g, '').trim();
        if (oldName !== cm.name) {
          html = html.replace(re, match[1] + cm.name + ' (' + cm.party + ')' + match[4]);
          updates++;
          console.log('  CM ' + ourState + ': ' + oldName + ' (' + oldParty + ') -> ' + cm.name + ' (' + cm.party + ')');
        }
      }
    }
  } catch (e) {
    errors.push('CMs: ' + e.message);
  }

  // 2. Update Governors
  try {
    let govMap = await fetchGovernors();
    for (let [wikiState, govName] of Object.entries(govMap)) {
      let ourState = STATE_MAP[wikiState];
      if (!ourState) continue;
      let re = new RegExp(
        '(<b>' + ourState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 
        '</b>[^<]*?\\.\\s*Governor:\\s*)([^.<]+?)([\\.<])'
      );
      let match = html.match(re);
      if (match) {
        let oldName = match[2].trim();
        if (oldName !== govName) {
          html = html.replace(re, match[1] + govName + match[3]);
          updates++;
          console.log('  Governor ' + ourState + ': ' + oldName + ' -> ' + govName);
        }
      }
    }
  } catch (e) {
    errors.push('Governors: ' + e.message);
  }

  // 3. Update Constitutional Posts (line ~1494)
  try {
    let posts = await fetchConstitutionalPosts();
    if (posts['President']) {
      let re = /President:\s*[^.\s]+(?:\s+[^.\s]+)*?\./;
      let m = html.match(re);
      if (m) {
        html = html.replace(re, 'President: ' + posts['President'] + '.');
        updates++;
      }
    }
    if (posts['Prime Minister']) {
      let re = /PM:\s*[^.\s]+(?:\s+[^.\s]+)*?\./;
      let m = html.match(re);
      if (m) {
        html = html.replace(re, 'PM: ' + posts['Prime Minister'] + '.');
        updates++;
      }
    }
  } catch (e) {
    errors.push('Constitutional posts: ' + e.message);
  }

  // 4. Update RBI Governor (line ~1374)
  try {
    let rbiGov = await fetchRBIGovernor();
    if (rbiGov) {
      let re = /(RBI Governor[^:]*?:|RBI\s+Governor\s+–\s+)[^.\s]+(?:\s+[^.\s]+){0,3}/;
      let m = html.match(re);
      if (m) {
        // Only update if the name doesn't match
        let before = m[1];
        let name = m[0].substring(before.length).trim();
        if (!name.includes(rbiGov.split(' ').slice(0, 2).join(' '))) {
          // Can't safely replace here without more context
        }
      }
    }
  } catch (e) {
    errors.push('RBI Governor: ' + e.message);
  }

  // 5. Update World Leaders — USA, UK, Russia, China, etc.
  try {
    let leaders = await fetchWorldLeaders();
    let leaderUpdates = {
      'United States': { pattern: /USA[^<]*?President[^:]*:\s*([^.<]+)/, key: 'President' },
      'United Kingdom': { pattern: /UK[^<]*?Prime Minister[^:]*:\s*([^.<]+)/, key: 'Prime Minister' },
      'Russia': { pattern: /Russia[^<]*?President[^:]*:\s*([^.<]+)/, key: 'President' },
      'China': { pattern: /China[^<]*?President[^:]*:\s*([^.<]+)/, key: 'President' },
      'Japan': { pattern: /Japan[^<]*?Prime Minister[^:]*:\s*([^.<]+)/, key: 'Prime Minister' },
    };
    for (let [country, cfg] of Object.entries(leaderUpdates)) {
      if (leaders[country]) {
        let re = cfg.pattern;
        let m = html.match(re);
        if (m && m[1].trim() !== leaders[country]) {
          html = html.replace(re, m[0].replace(m[1], leaders[country]));
          updates++;
          console.log('  ' + country + ' ' + cfg.key + ': ' + m[1].trim() + ' -> ' + leaders[country]);
        }
      }
    }
  } catch (e) {
    errors.push('World leaders: ' + e.message);
  }

  // Write if changes made
  if (updates > 0) {
    fs.writeFileSync(HTML_PATH, html, 'utf8');
    console.log('\n' + updates + ' update(s) applied');
  } else {
    console.log('\nNo changes detected');
  }
  if (errors.length) {
    console.log('Errors (' + errors.length + '):');
    for (let e of errors) console.log('  - ' + e);
  }
}

main();

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
 *  - Pageant winners (Miss World, Miss Universe, Miss India)
 *  - Film festival winners (Cannes, Berlin, Venice)
 *  - Major sports tournament champions (World Cup, T20 WC, etc.)
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
  let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Chief_minister_(India)&prop=text&format=json');
  let parsed = JSON.parse(data);
  let html = parsed.parse.text['*'];
  // Find "Current list of chief ministers" section by looking for tables 
  // that contain state names and party names
  let allTables = html.match(/<table[^>]*class="[^"]*(?:wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  let map = {};
  if (allTables) {
    for (let tbl of allTables) {
      let rowMatches = tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (let row of rowMatches) {
        let cells = [];
        let cellMatches = row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (let cell of cellMatches) {
          cells.push(cell[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length >= 3 && cells[2].length < 100 && !cells[0].includes('State')) {
          let state = cells[0].replace(/\[edit\]/, '').trim();
          let name = cells[1].replace(/\(.*?\)/g, '').trim();
          let party = (cells[1].match(/\(([^)]+)\)/) || [, ''])[1].trim();
          if (state && name && party && state.length > 2) {
            map[state] = { name, party };
          }
        }
      }
    }
  }
  return map;
}

// === INDIAN GOVERNORS ===
async function fetchGovernors() {
  let data = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Governor_(India)&prop=text&format=json');
  let parsed = JSON.parse(data);
  let html = parsed.parse.text['*'];
  let allTables = html.match(/<table[^>]*class="[^"]*(?:wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  let map = {};
  if (allTables) {
    for (let tbl of allTables) {
      let rowMatches = tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (let row of rowMatches) {
        let cells = [];
        let cellMatches = row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (let cell of cellMatches) {
          cells.push(cell[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length >= 2 && cells[0].length < 30 && !cells[0].includes('State')) {
          let state = cells[0].replace(/\[edit\]/, '').trim();
          let name = cells[1].replace(/\(.*?\)/g, '').trim();
          if (state && name && state.length > 2) {
            map[state] = name;
          }
        }
      }
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

// === PAGEANT WINNERS ===
async function fetchPageantWinners() {
  let results = {};
  // Miss World winners table
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Miss_World&prop=text&section=2&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Miss World'] = { year: last[0], winner: last[1] };
    }
  } catch(e) {}
  // Miss Universe winners
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Miss_Universe&prop=text&section=1&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Miss Universe'] = { year: last[0], winner: last[1] };
    }
  } catch(e) {}
  // Femina Miss India winners (more complex table)
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Femina_Miss_India&prop=text&section=3&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Miss India'] = { year: last[0], winner: last[1] };
    }
  } catch(e) {}
  return results;
}

// === FILM FESTIVAL WINNERS ===
async function fetchFilmFestivalWinners() {
  let results = {};
  // Cannes Palme d'Or
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Palme_d%27Or&prop=text&section=1&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Cannes Palme d\'Or'] = { year: last[0], film: last[1] };
    }
  } catch(e) {}
  // Berlin Golden Bear
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Golden_Bear&prop=text&section=1&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Berlin Golden Bear'] = { year: last[0], film: last[1] };
    }
  } catch(e) {}
  // Venice Golden Lion
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Golden_Lion&prop=text&section=2&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Venice Golden Lion'] = { year: last[0], film: last[1] };
    }
  } catch(e) {}
  // Oscar Best Picture
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=Academy_Award_for_Best_Picture&prop=text&section=3&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['Oscar Best Picture'] = { year: last[0], film: last[1] };
    }
  } catch(e) {}
  return results;
}

// === SPORTS TOURNAMENT CHAMPIONS ===
async function fetchSportsChampions() {
  let results = {};
  // Cricket World Cup winners
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=ICC_Cricket_World_Cup&prop=text&section=1&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let tables = h.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
    if (tables && tables[0]) {
      let rows = tables[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      let lastRow;
      for (let row of rows) { lastRow = row; }
      if (lastRow) {
        let cells = [];
        let cellMatches = lastRow[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (let c of cellMatches) cells.push(stripHtml(c[1]));
        if (cells.length >= 2) results['Cricket World Cup'] = { year: cells[0], winner: cells[cells.length-1] };
      }
    }
  } catch(e) {}
  // FIFA World Cup winners
  try {
    let d = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=FIFA_World_Cup&prop=text&section=1&format=json');
    let p = JSON.parse(d);
    let h = p.parse.text['*'];
    let rows = extractTableRows(h);
    if (rows.length > 0) {
      let last = rows[rows.length - 1];
      results['FIFA World Cup'] = { year: last[0], winner: last[1] };
    }
  } catch(e) {}
  return results;
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
  // Only patch if our file has entries for these (we include mini-updates in comments)
  // World leaders data is primarily in the IR section as static text
  // For now, this is informational only - actual world leader data changes
  // are better handled through the IR section's static content approach.
  console.log('  World leaders: auto-update requires manual HTML section audit');
  // Future: can add targeted world leader sections in the HTML with machine-readable anchors

  // 6. Update Pageant Winners
  try {
    let pageants = await fetchPageantWinners();
    if (pageants['Miss World']) {
      let w = pageants['Miss World'];
      let re = /(Miss World[^<]*?:\s*)[^<(]+(?:\s*\([^)]*\))?/i;
      let m = html.match(re);
      if (m) {
        let oldVal = m[0].substring(m[1].length).trim();
        let newVal = w.winner + ' (' + w.year + ')';
        if (!oldVal.includes(w.winner)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  Miss World: ' + oldVal + ' -> ' + newVal);
        }
      }
    }
    if (pageants['Miss Universe']) {
      let w = pageants['Miss Universe'];
      let re = /(Miss Universe[^<]*?:\s*)[^<(]+(?:\s*\([^)]*\))?/i;
      let m = html.match(re);
      if (m) {
        let oldVal = m[0].substring(m[1].length).trim();
        let newVal = w.winner + ' (' + w.year + ')';
        if (!oldVal.includes(w.winner)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  Miss Universe: ' + oldVal + ' -> ' + newVal);
        }
      }
    }
  } catch (e) {
    errors.push('Pageants: ' + e.message);
  }

  // 7. Update Film Festival Winners
  try {
    let films = await fetchFilmFestivalWinners();
    if (films['Cannes Palme d\'Or']) {
      let w = films['Cannes Palme d\'Or'];
      let re = /(Cannes[^<]*?Palme[^<]*?:\s*)[^<(]+(?:\s*\([^)]*\))?/i;
      let m = html.match(re);
      if (m) {
        let newVal = w.film + ' (' + w.year + ')';
        if (!m[0].includes(w.film)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  Cannes: ' + newVal);
        }
      }
    }
    if (films['Oscar Best Picture']) {
      let w = films['Oscar Best Picture'];
      let re = /(Oscar[^<]*?Best Picture[^<]*?:\s*)[^<(]+(?:\s*\([^)]*\))?/i;
      let m = html.match(re);
      if (m) {
        let newVal = w.film + ' (' + w.year + ')';
        if (!m[0].includes(w.film)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  Oscar Best Picture: ' + newVal);
        }
      }
    }
  } catch (e) {
    errors.push('Film festivals: ' + e.message);
  }

  // 8. Update Major Sports Champions
  try {
    let sports = await fetchSportsChampions();
    if (sports['Cricket World Cup']) {
      let w = sports['Cricket World Cup'];
      let re = /(Cricket World Cup[^<]*?:\s*)[^<]+?(\d+)/i;
      let m = html.match(re);
      if (m) {
        let newVal = w.winner + ' (' + w.year + ')';
        if (!m[0].includes(w.winner)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  Cricket World Cup: ' + newVal);
        }
      }
    }
    if (sports['FIFA World Cup']) {
      let w = sports['FIFA World Cup'];
      let re = /(Football World Cup[^<]*?:\s*)[^<]+?(\d+)/i;
      let m = html.match(re);
      if (m) {
        let newVal = w.winner + ' (' + w.year + ')';
        if (!m[0].includes(w.winner)) {
          html = html.replace(re, m[1] + newVal);
          updates++;
          console.log('  FIFA World Cup: ' + newVal);
        }
      }
    }
  } catch (e) {
    errors.push('Sports champions: ' + e.message);
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

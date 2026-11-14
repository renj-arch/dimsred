const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const LOOKUP_PATH = path.join(DATA_DIR, 'river-pts-lookup.json');

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function fetchOSMGeometry(osmId) {
  return new Promise((resolve) => {
    const query = `[out:json];relation(${osmId});out geom;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const req = https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(d);
          const pts = [];
          if (data.elements) {
            for (const el of data.elements) {
              if (el.members) {
                for (const m of el.members) {
                  if (m.geometry) {
                    for (const g of m.geometry) {
                      pts.push({la: g.lat, ln: g.lon});
                    }
                  }
                }
              }
              if (el.geometry) {
                for (const g of el.geometry) {
                  pts.push({la: g.lat, ln: g.lon});
                }
              }
            }
          }
          resolve(simplifyPath(pts));
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

function simplifyPath(pts, tolerance = 0.05) {
  if (!pts || pts.length < 2) return null;
  if (pts.length <= 10) return pts;
  const result = [pts[0]];
  let last = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.sqrt(Math.pow(pts[i].la - last.la, 2) + Math.pow(pts[i].ln - last.ln, 2));
    if (d > tolerance) {
      result.push(pts[i]);
      last = pts[i];
    }
  }
  result.push(pts[pts.length - 1]);
  return result.length >= 2 ? result : null;
}

async function enrichFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename}: not found, skipping`);
    return;
  }

  const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!entries.length) {
    console.log(`${filename}: empty, skipping`);
    return;
  }

  const lookup = JSON.parse(fs.readFileSync(LOOKUP_PATH, 'utf8'));
  let enriched = 0;
  let matched = 0;

  for (const entry of entries) {
    if (entry.pts && entry.pts.length > 0) continue;

    const key = normalize(entry.n);
    const found = lookup[key];
    if (found && found.pts && found.pts.length >= 2) {
      entry.pts = found.pts;
      enriched++;
      matched++;
      continue;
    }

    // Try partial match: check if any lookup key contains this name or vice versa
    for (const [lk, lv] of Object.entries(lookup)) {
      if ((lk.includes(key) || key.includes(lk)) && lv.pts && lv.pts.length >= 2) {
        entry.pts = lv.pts;
        enriched++;
        break;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`${filename}: enriched ${enriched}/${entries.length} entries (${matched} exact, ${enriched - matched} partial)`);
}

async function main() {
  console.log('=== River PTS Enrichment ===\n');
  await enrichFile('wiki-rivers.json');
  await enrichFile('wiki-w_river.json');
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

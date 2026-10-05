const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_FILE = path.resolve(__dirname, 'wikidata-np-output.txt');
const MANUAL_FILE = path.resolve(__dirname, '..', 'data', 'globe-manual.json');
const PREV_FILE = path.resolve(__dirname, 'wikidata-np-output.prev.txt');

// Non-park name patterns — reject if name matches any of these and NOT any good pattern
const BAD_NAMES = [/project/i, /canal/i, /complex/i, /pipeline/i, /refinery/i, /shipping/i, /fertilizer/i, /cement/i, /giga/i, /power\s+plant/i, /steel\s+plant/i, /industrial/i, /irrigation/i, /waterway/i, /dfc/i, /metro/i, /corridor/i, /highway/i, /border\s+road/i, /railway/i, /rl_zone/i, /airport/i, /oil/i, /tunnel/i, /tower/i, /lighthouse/i, /bridge/i];
const GOOD_NAMES = [/national park/i, /tiger reserve/i, /wildlife sanctuary/i, /biosphere reserve/i, /\bNP\b/, /\bTR\b/, /\bWLS\b/, /sanctuary/i, /reserve/i, /protected area/i];

function httpGet(url, acceptJson = true) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' };
    const req = https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(acceptJson ? JSON.parse(d) : d);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
  // Longer timeout for SPARQL which can be slow
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = { 'User-Agent': 'studypro-wiki/1.0 (gk-bot)' };
    const req = https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(d.slice(0, 200)));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function wikiSummary(title) {
  if (!title) return null;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const d = await httpGet(url);
    if (d.type === 'disambiguation' || !d.extract) return null;
    return { extract: d.extract, thumbnail: d.thumbnail?.source };
  } catch {
    try {
      const u2 = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title + ' National Park')}`;
      const d2 = await httpGet(u2);
      if (d2.type === 'disambiguation' || !d2.extract) return null;
      return { extract: d2.extract, thumbnail: d2.thumbnail?.source };
    } catch { return null; }
  }
}

function coordFromWKT(wkt) {
  const m = wkt.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!m) return [0, 0];
  return [parseFloat(m[2]), parseFloat(m[1])];
}

function esc(s) {
  if (!s) return '';
  return s.replace(/'/g, "\\'").replace(/\n/g, ' ').trim();
}

function normName(n) {
  return n.replace(/['’]/g, '').replace(/[-\s]+/g, ' ').replace(/\./g, '').replace(/\bNP\b/g, 'National Park').replace(/\bTR\b/g, 'Tiger Reserve').replace(/\bWLS\b/g, 'Wildlife Sanctuary').trim().toLowerCase();
}

// —— Text cleanup ——

function cleanText(s) {
  if (!s) return '';
  return s
    .replace(/\s+\.\s*(\d)/g, '.$1')        // "1,456. 3" → "1,456.3"
    .replace(/(\d)\s+km2/g, '$1 km²')        // "123 km2" → "123 km²"
    .replace(/�/g, '')                         // remove unicode replacement chars
    .replace(/\s{2,}/g, ' ')                   // collapse multiple spaces
    .replace(/^[,.\s]+|[,.\s]+$/g, '')          // trim leading/trailing punctuation
    .trim();
}

// —— Boilerplate / quality checks ——

function isBoilerplate(s) {
  const t = s.toLowerCase();
  if (/^(it|this|the)\s+is\s+a(n)?\s+(national park|tiger reserve|wildlife sanctuary|protected area|biosphere reserve)/i.test(t)) return true;
  if (/^(the\s+)?(park|sanctuary|reserve|area)\s+is\s+(located|situated|spread|one\s+of)/i.test(t)) return true;
  return false;
}

// Is the desc mostly boilerplate?
function isMostlyBoilerplate(text) {
  if (!text || text.length < 30) return false;
  const sents = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (!sents.length) return false;
  const bpCount = sents.filter(s => isBoilerplate(s)).length;
  return bpCount / sents.length > 0.5;
}

function sentenceScore(s) {
  let score = 0;
  const t = s.toLowerCase();
  const kw = ['largest','smallest','oldest','newest','highest','lowest','deepest','longest','only','first','unique','only place','world heritage','biosphere reserve','tiger reserve','ramsar site','endangered','critically endangered','known for','famous for','rare','discovered','reintroduc','relocated','origin','meaning','myth','legend','species','flora','fauna','tribal','sacred','holy','population'];
  for (const k of kw) { if (t.includes(k)) score += 2; }
  const nums = s.match(/[\d,]+/g);
  if (nums) score += Math.min(nums.length, 3);
  if (s.length > 30 && s.length < 180) score += 1;
  if (s.length >= 180) score -= 1;
  if (isBoilerplate(s)) score -= 3;
  if (/^(the\s+)?(park|sanctuary|reserve|area|national park)\s+/i.test(t)) score -= 1;
  if (/river|mountain|lake|valley|peak|range|forest|temple|fort|tribe|species|bird|animal|plant|tree|flower/i.test(t)) score += 1;
  if (s.endsWith(')') || s.includes('  ')) score -= 1;
  return score;
}

function buildDesc(text) {
  if (!text) return '';
  const raw = cleanText(text.replace(/\([^)]*\)/g, ''));
  const sents = raw.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15 && !/^[,.\s]*$/.test(s));
  if (!sents.length) return '';
  const scored = sents.map((s, i) => ({ s, i, score: sentenceScore(s) }));
  const kept = scored.filter(x => x.score > -1);
  kept.sort((a, b) => b.score - a.score);
  const top = kept.slice(0, 3);
  top.sort((a, b) => a.i - b.i);
  if (!top.length) return sents.slice(0, 2).join('. ') + '.';
  let out = top.map(x => x.s).join('. ');
  if (!out.endsWith('.')) out += '.';
  return out;
}

function buildFacts(text, wikidataFields) {
  if (!text) return '';
  const raw = cleanText(text.replace(/\([^)]*\)/g, ''));
  const sents = raw.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15 && !/^[,.\s]*$/.test(s));
  if (!sents.length) return '';
  const scored = sents.map(s => ({ s, score: sentenceScore(s) }));
  let selected = scored.filter(x => x.score >= 3);
  selected = selected.concat(scored.filter(x => x.score >= 1 && x.score < 3 && /(only|first|largest|smallest|oldest|unesco|world heritage|ramsar|endangered|reintroduc|origin|meaning|species)/i.test(x.s)));
  const seen = new Set();
  const deduped = [];
  for (const x of selected) {
    const key = x.s.slice(0, 40).toLowerCase().replace(/\s+/g, '');
    if (!seen.has(key)) { seen.add(key); deduped.push(x); }
  }
  let factSents = deduped.slice(0, 5).map(x => x.s);
  if (factSents.length < 2) {
    factSents = scored.sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.s);
  }
  let result = factSents.join(' · ');
  if (wikidataFields && wikidataFields.length) {
    const structured = wikidataFields.filter(Boolean).join(', ');
    if (structured && !result.includes(structured.slice(0, 30))) {
      result = structured + ' · ' + result;
    }
  }
  return result.slice(0, 600);
}

// —— Quality assessment ——

function assessQuality(e) {
  let score = 0;
  if (e.desc && e.desc.length >= 30 && !/^[,.\s]*$/.test(e.desc)) score += 2;
  if (e.desc && e.desc.length >= 60) score += 1;
  if (e.fact && e.fact.length >= 30 && !/^[,.\s]*$/.test(e.fact)) score += 2;
  if (e.fact && e.fact.length >= 60) score += 1;
  if (e.sub && e.sub.length > 5) score += 2;
  if (e.la && e.ln && e.la !== 0 && e.ln !== 0) score += 1;
  if (e.desc && !isBoilerplate(e.desc) && !isMostlyBoilerplate(e.desc)) score += 2;
  if (e.desc && e.desc.includes('�')) score -= 3;
  if (e.fact && e.fact.includes('�')) score -= 3;
  if (e.desc && isMostlyBoilerplate(e.desc)) score -= 2;
  if (score >= 6) return 'good';
  if (score >= 2) return 'low';
  return 'poor';
}

// —— Auto-entry filter ——

function isNonParkName(name) {
  const matchesBad = BAD_NAMES.some(r => r.test(name));
  const matchesGood = GOOD_NAMES.some(r => r.test(name));
  return matchesBad && !matchesGood;
}

function shouldSkipAutoEntry(e) {
  if (!e.n || isNonParkName(e.n)) return true;
  if (!e.la && !e.ln) return true;
  if (!e.desc || e.desc.length < 20 || /^[,.\s]*$/.test(e.desc)) return true;
  if (!e.fact || e.fact.length < 15 || /^[,.\s]*$/.test(e.fact)) return true;
  if (!e.sub || e.sub.length < 3) return true;
  if (e.sub.includes('�') || e.desc.includes('�')) return true;
  return false;
}

// —— Validation ——

function validate(entries) {
  const issues = [];
  for (const e of entries) {
    if (!e.la && !e.ln) issues.push(`✗ ${e.n}: missing coordinates`);
    if (!e.desc || e.desc.length < 15) issues.push(`✗ ${e.n}: desc too short (${(e.desc||'').length} chars)`);
    if (!e.fact || e.fact.length < 15) issues.push(`✗ ${e.n}: fact too short (${(e.fact||'').length} chars)`);
    if (!e.sub) issues.push(`✗ ${e.n}: missing sub`);
    if (e.desc && isMostlyBoilerplate(e.desc)) issues.push(`⚠ ${e.n}: desc is mostly boilerplate`);
    if (e.desc && e.desc.includes('�')) issues.push(`✗ ${e.n}: unicode corruption in desc`);
    if (e.fact && e.fact.includes('�')) issues.push(`✗ ${e.n}: unicode corruption in fact`);
    if (e._quality === 'poor') issues.push(`⚠ ${e.n}: overall quality poor`);
    if (e._src === 'auto' && e._quality === 'low') issues.push(`⚡ ${e.n}: quality low — consider adding to globe-manual.json`);
  }
  return issues;
}

// —— Main ——

async function main() {
  // 1. Load manual entries
  let manualEntries = [];
  try {
    manualEntries = JSON.parse(fs.readFileSync(MANUAL_FILE, 'utf8'));
    console.log(`Loaded ${manualEntries.length} manual entries from globe-manual.json`);
  } catch {
    console.log('No manual patches found, proceeding with auto only');
  }
  const manualMap = new Map();
  for (const m of manualEntries) {
    manualMap.set(normName(m.n), m);
  }

  // 2. Backup
  if (fs.existsSync(OUT_FILE)) {
    fs.copyFileSync(OUT_FILE, PREV_FILE);
    console.log('Backed up previous output → wikidata-np-output.prev.txt');
  }

  // 3. SPARQL query — only national parks
  const query = `
    SELECT ?item ?itemLabel ?coord ?area ?inception ?stateLabel ?desc ?image ?iucnLabel ?heritageLabel WHERE {
      { ?item wdt:P31 wd:Q46169. }
      ?item wdt:P17 wd:Q668.
      ?item wdt:P625 ?coord.
      OPTIONAL { ?item wdt:P2046 ?area. }
      OPTIONAL { ?item wdt:P571 ?inception. }
      OPTIONAL { ?item wdt:P131 ?state. }
      OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc) = 'en') }
      OPTIONAL { ?item wdt:P18 ?image. }
      OPTIONAL { ?item wdt:P141 ?iucn. }
      OPTIONAL { ?item wdt:P1435 ?heritage. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }
    ORDER BY ?itemLabel
  `;

  console.log('Querying Wikidata for Indian national parks...');
  let result;
  try {
    result = await sparql(query);
  } catch (e) {
    console.error('SPARQL query failed:', e.message);
    if (fs.existsSync(PREV_FILE)) {
      console.log('Falling back to previous output');
      fs.copyFileSync(PREV_FILE, OUT_FILE);
    }
    process.exit(1);
  }

  // 4. Deduplicate by item ID (keep largest area)
  const seenAreas = new Map();
  for (const b of result.results.bindings) {
    const id = b.item.value;
    const areaVal = parseFloat(b.area?.value || '0');
    if (seenAreas.has(id)) {
      if (areaVal > seenAreas.get(id).area) seenAreas.get(id).area = areaVal;
      continue;
    }
    seenAreas.set(id, { id, item: b, area: areaVal });
  }

  console.log(`Fetched ${seenAreas.size} items from Wikidata`);

  // 5. Generate auto entries
  const rawAuto = [];
  let count = 0;

  for (const [id, { item: b, area: areaVal }] of seenAreas) {
    count++;
    const [la, ln] = coordFromWKT(b.coord?.value || '');
    if (!la && !ln) continue;
    const label = b.itemLabel?.value || '';
    if (!label) continue;
    if (isNonParkName(label)) continue;

    const state = b.stateLabel?.value || '';
    const areaStr = areaVal > 0 ? areaVal + ' km²' : '';
    const incept = b.inception?.value ? b.inception.value.slice(0, 4) : '';
    const iucn = b.iucnLabel?.value || '';
    const heritage = b.heritageLabel?.value || '';

    let wikiData = await wikiSummary(label);
    if (!wikiData) wikiData = await wikiSummary(label + ' National Park');
    if (!wikiData) wikiData = await wikiSummary(label.replace(/\b(NP|TR|WLS)\b/g, 'National Park').replace(/\s+/g, ' ').trim());

    const extraTags = [];
    if (heritage && heritage.toLowerCase().includes('world heritage')) extraTags.push('UNESCO WHS');
    if (iucn && !iucn.toLowerCase().includes('not')) extraTags.push(iucn);

    const subParts = [state, areaStr, incept ? 'est. ' + incept : ''].filter(Boolean);
    if (extraTags.length) subParts.push(extraTags.join(', '));

    const wikiText = wikiData?.extract || b.desc?.value || '';
    const rawDesc = buildDesc(wikiText);
    const rawFact = buildFacts(wikiText, [state + (areaStr ? ', ' + areaStr : '')]);

    const entry = {
      n: label,
      la: parseFloat(la.toFixed(6)),
      ln: parseFloat(ln.toFixed(6)),
      sub: subParts.join(' · '),
      desc: rawDesc || cleanText((b.desc?.value || '').slice(0, 250)),
      fact: rawFact || rawDesc,
      img: wikiData?.thumbnail || b.image?.value || '',
      _src: 'auto'
    };
    entry._quality = assessQuality(entry);
    rawAuto.push(entry);
    if (count % 3 === 0) await new Promise(r => setTimeout(r, 600));
  }

  // 6. Filter out poor auto entries
  const autoOk = [];
  const autoSkipped = [];
  for (const e of rawAuto) {
    if (shouldSkipAutoEntry(e) || e._quality === 'poor') {
      autoSkipped.push(e);
    } else {
      autoOk.push(e);
    }
  }

  console.log(`Generated ${rawAuto.length} auto entries, kept ${autoOk.length}, skipped ${autoSkipped.length} (poor quality)`);
  if (autoSkipped.length) {
    console.log('  Skipped:');
    for (const e of autoSkipped) {
      const reasons = [];
      if (e._quality === 'poor') reasons.push('quality poor');
      if (isNonParkName(e.n)) reasons.push('non-park name');
      if (!e.desc || e.desc.length < 20) reasons.push('desc too short (' + (e.desc?.length||0) + ' chars)');
      if (!e.fact || e.fact.length < 15) reasons.push('fact too short (' + (e.fact?.length||0) + ' chars)');
      if (!e.sub) reasons.push('missing sub');
      if (e.sub && e.sub.includes('�')) reasons.push('corrupted sub');
      console.log('    • ' + e.n + ' — ' + reasons.join(', '));
    }
  }

  // 7. Merge manual overrides
  const merged = [];
  const manualMatched = new Set();

  for (const a of autoOk) {
    const key = normName(a.n);
    const manual = manualMap.get(key);
    if (manual) {
      merged.push({
        n: a.n,
        la: manual.la || a.la,
        ln: manual.ln || a.ln,
        sub: manual.sub || a.sub,
        desc: manual.desc || a.desc,
        fact: manual.fact || a.fact,
        img: a.img || manual.img || '',
        _src: 'manual',
        _quality: 'good'
      });
      manualMatched.add(key);
    } else {
      merged.push({ ...a });
    }
  }

  for (const m of manualEntries) {
    const key = normName(m.n);
    if (!manualMatched.has(key)) {
      merged.push({
        n: m.n,
        la: m.la,
        ln: m.ln,
        sub: m.sub,
        desc: m.desc,
        fact: m.fact,
        img: m.img || '',
        _src: 'manual',
        _quality: 'good'
      });
    }
  }

  console.log(`After merge: ${merged.length} entries (${manualMatched.size} manual overlaid)`);

  // 8. Final validation
  const issues = validate(merged);
  if (issues.length) {
    console.log(`\n── VALIDATION REPORT (${issues.length} issues) ──`);
    for (const issue of issues) console.log('  ' + issue);
    console.log('');
  } else {
    console.log('\n── VALIDATION: All entries clean ✓\n');
  }

  // 9. Write output
  const good = merged.filter(e => e._quality === 'good');
  const low = merged.filter(e => e._quality === 'low');
  let output = '// Auto-generated from Wikidata+Wikipedia — filtered pipeline\n';
  output += '// Run: node scripts/wikidata-fetch.js\n';
  output += '// Generated: ' + new Date().toISOString().slice(0, 10) + '\n';
  output += '// Total: ' + merged.length + ' entries (good: ' + good.length + ', low: ' + low.length + ', manual: ' + merged.filter(e => e._src === 'manual').length + ')\n\n';
  output += 'const WIKI_NP = [\n';
  for (const e of merged) {
    output += `  {n:'${esc(e.n)}',la:${e.la},ln:${e.ln},sub:'${esc(e.sub)}',desc:'${esc(e.desc)}',fact:'${esc(e.fact)}',_src:'${e._src}',_quality:'${e._quality}'`;
    if (e.img) output += `,img:'${esc(e.img)}'`;
    output += '},\n';
  }
  output += '];\n';

  fs.writeFileSync(OUT_FILE, output, 'utf8');
  console.log(`✓ Wrote ${merged.length} entries to wikidata-np-output.txt`);
  console.log(`  Quality: ${good.length} good, ${low.length} low, ${merged.filter(e => e._src === 'manual').length} manual`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

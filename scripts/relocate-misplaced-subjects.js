// Content-based misplacement classifier + mover.
//
// A sub-subject is a single unit: when it is moved, the WHOLE `sub` key (every
// question under it) is relocated together — questions are never picked out
// individually, because every question under a sub-subject is about that topic.
//
// Detection: a sub-subject is misplaced when its actual question text is
// explained by ANOTHER category's curated `topics` list (the authoritative,
// hand-curated vocabulary in wiki-fill-all.cjs) much better than by its own
// category's curated topics. Coverage = share of the sub-subject's weighted
// token mass that the curated topic names explain. Scoring against curated
// lists (not the category's own dirty question text) keeps it precise: catch-all
// categories have short curated vocabularies, so nothing routes there by size.
//
// Only the wiki-fill scrape categories (which carry a curated `topics` list) are
// move SOURCES — that is exactly where leaked/misplaced content accumulates.
// Legacy manual categories (Indian History, Society, Polity, ...) are untouched.
// Feed categories (PIB Releases, Current Affairs, ...) are never sources either.
//
// Moving requires: (a) the best OTHER category to explain >= HIGH of the token
// mass, (b) a clear gap over the current category, (c) the target to be a real
// home. Nothing is ever dropped.
//
// Dry-run by default: node scripts/relocate-misplaced-subjects.js --dry
// To apply:           node scripts/relocate-misplaced-subjects.js

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const FILL_SCRIPT = path.join(__dirname, 'wiki-fill-all.cjs');

const HIGH = parseFloat(process.env.RMS_HIGH || '0.30');   // min best-other coverage
const GAP = parseFloat(process.env.RMS_GAP || '0.20');     // min coverage gap over own
const MIN_TARGET_QS = parseInt(process.env.RMS_MIN_TARGET || '40', 10);
const DRY = process.argv.includes('--dry');

// Feed/curated categories with intentional section-heading sub-subjects — never
// move SOURCES (they have no curated topics list so they are excluded anyway;
// listed for clarity).
const SKIP_SOURCES = new Set([
  'Current Affairs', 'PIB Releases', 'RBI Press Releases', 'Announcements',
  'PIB', 'General', 'Disambiguation'
]);

// Explicit remap override for residuals the token/vocab signals can't resolve
// (single-token names, foreign figures/institutions, generic-word phrases).
// Keyed `sourceSubject\u0000subSubject` -> target subject. Whole-sub moves.
const REMAP = {
  // ── Himachal Pradesh / Indian places (single tokens or generic words) ──
  'Agricultural Extension & Marketing\u0000Jogindernagar': 'Indian States',
  'Agricultural Extension & Marketing\u0000Karsog': 'Indian States',
  'Agricultural Extension & Marketing\u0000Manikaran': 'Indian States',
  'Agricultural Extension & Marketing\u0000Kullu': 'Indian States',
  'Agricultural Extension & Marketing\u0000Jaidevi': 'Indian States',
  'Agricultural Extension & Marketing\u0000Kasol': 'Indian States',
  'Agricultural Extension & Marketing\u0000Bhuntar': 'Indian States',
  'Agricultural Extension & Marketing\u0000Khanahr': 'Indian States',
  'Agricultural Extension & Marketing\u0000Bagsiad': 'Indian States',
  'Agricultural Extension & Marketing\u0000Parvati Valley': 'Indian States',
  'Agricultural Extension & Marketing\u0000Kullu Valley': 'Indian States',
  'Agricultural Extension & Marketing\u0000Parvati River (Himachal Pradesh)': 'Indian Rivers & Water Resources',
  'Agricultural Extension & Marketing\u0000Mandi Gobindgarh': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi Dabwali': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi Lampi': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi, Jalandhar': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi, Phagi': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi, Mirpur': 'Indian States',
  'Agricultural Extension & Marketing\u0000Mandi House': 'Railways & Transport',
  'Agricultural Extension & Marketing\u0000Mandi House metro station': 'Railways & Transport',
  'Agricultural Extension & Marketing\u0000Buldhana district': 'Indian States',
  'Agricultural Extension & Marketing\u0000Prehistory and protohistory of Himachal Pradesh': 'Ancient India',
  'Agricultural Extension & Marketing\u0000British rule in Himachal Pradesh': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Mughal rule in Himachal Pradesh': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Arts and crafts of Himachal Pradesh': 'Art & Culture',
  'Agricultural Extension & Marketing\u00002017 Himachal Pradesh Legislative Assembly election': 'Polity & Governance',
  'Agricultural Extension & Marketing\u0000Jai Ram Thakur': 'Personalities',
  'Agricultural Extension & Marketing\u0000Satyananda Stokes': 'Personalities',
  'Agricultural Extension & Marketing\u0000Baba Kanshi Ram': 'Personalities',
  'Agricultural Extension & Marketing\u0000Sansar Chand': 'Personalities',
  // ── Indian princely states / history ──
  'Agricultural Extension & Marketing\u0000Chamba State': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Kangra State': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Siba State': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Suket State': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Princely state': 'Medieval & Modern India',
  'Agricultural Extension & Marketing\u0000Punjab States Agency': 'Medieval & Modern India',
  // ── World history / foreign figures & events ──
  'Agricultural Extension & Marketing\u0000Napoleon': 'World History',
  'Agricultural Extension & Marketing\u0000Queen Victoria': 'World History',
  'Agricultural Extension & Marketing\u0000French invasion of Russia': 'World History',
  'Agricultural Extension & Marketing\u0000Alexandra Kollontai': 'World History',
  'Agricultural Extension & Marketing\u0000Amadeo Bordiga': 'World History',
  'Agricultural Extension & Marketing\u0000Guge': 'World History',
  'Agricultural Extension & Marketing\u0000Alaska Natives': 'World History',
  'Agricultural Extension & Marketing\u00002020 China floods': 'World Geography',
  'Agricultural Extension & Marketing\u00002021 heat waves': 'Meteorology & Climate',
  'Agricultural Extension & Marketing\u00002025 hunger crisis in Syria': 'World History',
  'Agricultural Extension & Marketing\u0000Anti-Dühring': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Anti-Oedipus': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Anuradha Ghandy': 'Personalities',
  // ── Economics / politics theory ──
  'Agricultural Extension & Marketing\u0000Austerity': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Business cycle': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Authoritarian capitalism': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Capitalism and Islam': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Capitalist Realism': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Capitalist propaganda': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Capital (economics)': 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Capitalist state': 'Business & Economy',
  "Agricultural Extension & Marketing\u0000Stigler's law of eponymy": 'Business & Economy',
  'Agricultural Extension & Marketing\u0000Technocracy movement': 'World History',
  'Agricultural Extension & Marketing\u0000Better Regulation Commission': 'World History',
  // ── Energy / environment / materials ──
  'Agricultural Extension & Marketing\u0000International Energy Agency': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy conversion efficiency': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Efficient energy use': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy quality': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy management': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy management software': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy management system (building management)': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy accounting': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Energy consumption': 'Energy & Power',
  'Agricultural Extension & Marketing\u0000Steam engine': 'Applied Sciences',
  'Agricultural Extension & Marketing\u0000Natural environment': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Material flow analysis': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Material flow management': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Material flow accounting': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Industrial metabolism': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Social metabolism': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Anthropogenic metabolism': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Urban metabolism': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Life-cycle assessment': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Brown trout': 'Fisheries & Aquaculture',
  'Agricultural Extension & Marketing\u0000Frederick Soddy': 'Personalities',
  'Agricultural Extension & Marketing\u0000Matthew Henry Phineas Riall Sankey': 'Personalities',
  'Agricultural Extension & Marketing\u0000Allan Pred': 'Personalities',
  'Agricultural Extension & Marketing\u0000Eugene Garfield': 'Personalities',
  'Agricultural Extension & Marketing\u0000Geomechanics': 'Applied Sciences',
  // ── Journals / publishers / bibliometrics ──
  'Agricultural Extension & Marketing\u0000Harcourt (publisher)': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Ovid Technologies': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Social Sciences Citation Index': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Highly Cited Researchers': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Institute for Scientific Information': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Cell Press': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Estates Gazette': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Biochimica et Biophysica Acta': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Bepress': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Embase': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Ei Compendex': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000GEOBASE': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000EMBiology': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000AGRICOLA': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Current Contents': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Current Opinion (Elsevier)': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Butterworth-Heinemann': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Churchill Livingstone': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Bibliographic database': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Scientific literature': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Imprint (trade name)': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Applied Geography': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Agriculture, Ecosystems & Environment': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000ClinicalTrials.gov': 'Health & Medicine',
  // ── IT / data viz ──
  'Agricultural Extension & Marketing\u0000Knowledge graph': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Software as a service': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Asset tracking': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Flow map': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Sankey diagram': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Parallel coordinates': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Alluvial diagram': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Flow diagram': 'Computer & IT',
  'Agricultural Extension & Marketing\u0000Time geography': 'World Geography',
  'Agricultural Extension & Marketing\u0000Activity space': 'World Geography',
  // ── Sports bodies / athletes ──
  'Agricultural Extension & Marketing\u0000Dutch Lacrosse Association': 'Sports',
  'Agricultural Extension & Marketing\u0000All Japan Judo Federation': 'Sports',
  'Agricultural Extension & Marketing\u0000All Japan Taekwondo Association': 'Sports',
  'Agricultural Extension & Marketing\u0000All Japan Kendo Federation': 'Sports',
  'Agricultural Extension & Marketing\u0000Dutch Bridge Federation': 'Sports',
  'Agricultural Extension & Marketing\u0000Dutch Orienteering Federation': 'Sports',
  'Agricultural Extension & Marketing\u0000Badminton Nederland': 'Sports',
  'Agricultural Extension & Marketing\u0000Dutch Waterski Association': 'Sports',
  'Agricultural Extension & Marketing\u0000Dutch Squash Federation': 'Sports',
  'Agricultural Extension & Marketing\u0000Colombia Federation of Skating Sports': 'Sports',
  'Agricultural Extension & Marketing\u0000Equitana': 'Sports',
  'Agricultural Extension & Marketing\u0000Gyula Mándi': 'Sports',
  'Agricultural Extension & Marketing\u0000Aïssa Mandi': 'Sports',
  'Agricultural Extension & Marketing\u0000Imre Mándi': 'Sports',
  // ── Conventions / expos ──
  'Agricultural Extension & Marketing\u0000EGX (expo)': 'Art & Culture',
  'Agricultural Extension & Marketing\u0000Chicago Comic & Entertainment Expo': 'Art & Culture',
  'Agricultural Extension & Marketing\u0000Florida Supercon': 'Art & Culture',
  'Agricultural Extension & Marketing\u0000Emerald City Comic Con': 'Art & Culture',
  'Agricultural Extension & Marketing\u0000Global Gaming Expo': 'Art & Culture',
  // ── Foreign agriculture (belongs to Agriculture & Food) ──
  'Agricultural Extension & Marketing\u0000Agriculture in China': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Agriculture in Mexico': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Agriculture in Mozambique': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Agriculture in Singapore': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Ancient Egyptian agriculture': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Agricultural policy of the United States': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Agricultural policy': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000United States Department of Agriculture': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u00002022–2023 global food crises': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Human nutrition': 'Health & Medicine',
  'Agricultural Extension & Marketing\u0000Regulated market': 'Agriculture & Food',
  'Agricultural Extension & Marketing\u0000Van Vigyan Kendra': 'Environment & Ecology',
  'Agricultural Extension & Marketing\u0000Nagar panchayat': 'Polity & Governance',
  'Agricultural Extension & Marketing\u0000HESI exam': 'Health & Medicine',
  'Agricultural Extension & Marketing\u0000Yashwantrao Chavan Maharashtra Open University': 'Education in India',
  'Agricultural Extension & Marketing\u0000Shanghai Jiao Tong University': 'World Geography',
  // ── Misc ──
  'Agricultural Extension & Marketing\u0000Mandeali': 'Indian Languages',
  'Agricultural Extension & Marketing\u0000Kullui': 'Indian Languages',
  'Agricultural Extension & Marketing\u0000Heera Mandi': 'World Geography',
  'Agricultural Extension & Marketing\u0000Mandi (Mandaeism)': 'Ethics & Integrity',
  'Agricultural Extension & Marketing\u0000Mandi (food)': 'Food Processing',
  'Agricultural Extension & Marketing\u0000Mandi (legendary creature)': 'Art & Culture',
  'Agricultural Extension & Marketing\u0000Mandi Bahauddin': 'World Geography',
  'Agricultural Extension & Marketing\u0000Mandi Bahauddin District': 'World Geography',
  // ── Transport / aviation (routed straight, single tokens or generic words) ──
  'Agricultural Extension & Marketing\u0000Bhanupli–Leh line': 'Railways & Transport',
  'Agricultural Extension & Marketing\u0000National Highway 3 (India)': 'Railways & Transport',
  'Agricultural Extension & Marketing\u0000National Highway 30 (India)': 'Railways & Transport',
  'Agricultural Extension & Marketing\u0000Kullu–Manali Airport': 'Indian Aviation & Shipping',
  // ── Databases / libraries not caught by single-token title signal ──
  'Agricultural Extension & Marketing\u0000Scopus': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Clarivate': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Arts and Humanities Citation Index': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000National Agricultural Library Thesaurus and Glossary': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000United States National Agricultural Library': 'Books & Authors',
  'Agricultural Extension & Marketing\u0000Eurostat': 'World Geography',
  'Agricultural Extension & Marketing\u0000Technical Alliance': 'World History',
  'Agricultural Extension & Marketing\u0000Intensive and extensive properties': 'General Science',
  'Agricultural Extension & Marketing\u0000Agronomy': 'Agronomy & Crop Production',
};

// Global override keyed ONLY on subSubject — corrects name-collision mis-directs
// (e.g. athelete vs musician sharing a name) no matter which source they sit in.
const GLOBAL_MOVE = {
  'Zakir Hussain (field hockey)': 'Sports',
  'Ravi Shankar Prasad': 'Personalities',
  'Bhagat Singh Koshyari': 'Personalities',
  'Guru Gobind Singh Indraprastha University': 'Education in India',
  'Azerbaijani pop music': 'Art & Culture',
  'Ho Chi Minh City': 'World Geography',
  // ── New in run #418: energy clusters scraped into agri-extension ──
  'Concentrated solar power': 'Energy & Power',
  'Electric energy consumption': 'Energy & Power',
  'Cogeneration': 'Energy & Power',
  'Basal metabolic rate': 'Health & Medicine',
  'Dark energy': 'Energy & Power',
  'Electric battery': 'Energy & Power',
  'Elastic energy': 'Energy & Power',
  'Binding energy': 'Energy & Power',
  'Efficiency': 'Energy & Power',
  'Electric potential energy': 'Energy & Power',
  'Domestic energy consumption': 'Energy & Power',
  'Electrical energy': 'Energy & Power',
  // ── New in run #418: recycling/circular-economy clusters ──
  'Container-deposit legislation': 'Environment & Ecology',
  'Blue box recycling system': 'Environment & Ecology',
  'Aluminium recycling': 'Environment & Ecology',
  'Cotton recycling': 'Environment & Ecology',
  'Concrete recycling': 'Environment & Ecology',
  'Cradle-to-cradle design': 'Environment & Ecology',
  'Downcycling': 'Environment & Ecology',
  'Drug recycling': 'Environment & Ecology',
  'Blue bag': 'Environment & Ecology',
  'Bottle cutting': 'Environment & Ecology',
  'Circular economy': 'Environment & Ecology',
  'Dematerialization (economics)': 'Environment & Ecology',
  'Dematerialization (products)': 'Environment & Ecology',
  'DPSIR': 'Environment & Ecology',
  // ── New in run #418: leftist politics / foreign political figures ──
  'Anarchism in Italy': 'World History',
  'Anti-Stalinist left': 'World History',
  'Anti-Parliamentary Communist Federation': 'World History',
  'Alessandro Natta': 'World History',
  'Altiero Spinelli': 'World History',
  'Alberto Toscano': 'World History',
  'Angelo Tasca': 'World History',
  'Aldo Tortorella': 'World History',
  'Achille Occhetto': 'World History',
  'Allgemeine Arbeiter-Union – Einheitsorganisation': 'World History',
  'Anglo-Soviet Trade Agreement': 'World History',
  '2004 Greek financial audit': 'World History',
  '2009 Greek parliamentary election': 'World History',
  '2004 Greek parliamentary election': 'World History',
  '2021–2023 global supply chain crisis': 'Business & Economy',
  // ── New in run #418: foreign universities / institutions ──
  'California State University, Chico': 'Education in India',
  'Peking University': 'Education in India',
  'University of Utah': 'Education in India',
  // ── New in run #418: people scraped into agri-extension ──
  'Anagarika Govinda': 'Personalities',
  'Brooke Rollins': 'Personalities',
  'Dan Glickman': 'Personalities',
  'Deborah Griscom Passmore': 'Personalities',
  'Amanda Newton (illustrator)': 'Personalities',
  'Aaron B. Grosh': 'Personalities',
  'David Kirsh': 'Personalities',
  // ── Misc agri-extension stragglers ──
  'Army Service Corps (India)': 'Defence & Security',
  'Ambala City railway station': 'Railways & Transport',
  'Dehnasar Lake': 'Indian States',
  'Baltoro Muztagh': 'World Geography',
  'Animal and Plant Health Inspection Service': 'Agriculture & Food',
  'Commodity Credit Corporation': 'Agriculture & Food',
  'Economic Research Service': 'Agriculture & Food',
  'Agricultural Marketing Service': 'Agriculture & Food',
  'Agricultural Research, Extension, and Education Reform Act of 1998': 'Agriculture & Food',
  'Agriculture Network Information Center': 'Agriculture & Food',
  'Center for Nutrition Policy and Promotion': 'Agriculture & Food',
  'Supermarket': 'Food Processing',
  'Dietitian': 'Health & Medicine',
  'Diet (nutrition)': 'Health & Medicine',
  'Dietary Reference Intake': 'Health & Medicine',
  'Social science': 'Indian Economy',
  'Sociology of space': 'Indian Society',
  'Social space': 'Indian Society',
  'Spatial analysis': 'Computer & IT',
  'Spatial memory': 'General Science',
  'Method of loci': 'General Science',
  'Autopoiesis': 'General Science',
  'Bougainvillea': 'Floriculture & Landscaping',
  'Annona': 'Horticulture',
  'Centrifuge': 'Agricultural Engineering',
  // ── Regulated market: authored intent is Agriculture & Food; suppress the
  //    title-signal re-pull so the sub never ping-pongs between the two. ──
  'Regulated market': 'Agriculture & Food',
};

const STOP = new Set([
  'a','an','the','of','in','on','for','and','or','to','at','by','with','from','as','is','are',
  'was','were','be','been','being','it','its','their','this','that','they','them','he','she',
  'indian','india','which','what','when','where','who','whom','whose','how','why','does','do',
  'has','have','had','will','would','shall','should','can','could','may','might','not','no',
  'only','also','etc','per','according','following','correct','statement','consider','regarding',
  'refer','match','code','choose','select','answer','option','options','asked','question',
  'known','called','also','one','two','first','second','year','years','new','world','all','any',
  'some','such','most','more','than','about','over','into','out','up','down','under','above',
  'between','among','during','since','until','after','before','am','pm','etc','e.g','i.e',
  'category','categories','subsubject','sub-subject','', '–', '-', '&', 'mr', 'mrs', 'ms',
  'de','la','le','du','des','en','el','del','van','von','der','di','da','na','no','of'
]);

function tokenize(s) {
  return (String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/['’]/g, ' ')
    .replace(/[0-9]/g, ' ')
    .replace(/[^a-z&]+/g, ' ')
    .split(' ')
    .filter(t => t.length > 2 && !STOP.has(t)));
}

// ---- Parse the curated CATEGORIES (name -> topics[]) from the fill script. ----
function curatedCategories() {
  const src = fs.readFileSync(FILL_SCRIPT, 'utf8').replace(/\r/g, '');
  const m = src.match(/const CATEGORIES = \[([\s\S]*?)\n\];/);
  if (!m) { console.error('Could not find CATEGORIES in ' + FILL_SCRIPT); process.exit(2); }
  const arr = m[1];
  const blocks = [...arr.matchAll(/\{\s*name:\s*'([^']+)'([\s\S]*?)(?=\n\s*\]\},)/g)];
  const out = {};
  for (const b of blocks) {
    const ti = b[2].indexOf('topics:[');
    if (ti === -1) continue;
    const body = b[2].slice(ti + 8);
    out[b[1]] = [...body.matchAll(/'([^']+)'/g)].map(x => x[1]);
  }
  return out;
}

function loadAll() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && !['catalog.json', 'manifest.json'].includes(f));
  const subjects = {};   // subject -> { files:[{file,data}] }
  for (const file of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch { continue; }
    const subject = Object.keys(data)[0];
    if (!subjects[subject]) subjects[subject] = { files: [] };
    subjects[subject].files.push({ file, data });
  }
  return subjects;
}

function slugFor(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function main() {
  const subjects = loadAll();
  const names = Object.keys(subjects);
  const curated = curatedCategories();
  const curatedNames = Object.keys(curated);
  console.log('Subjects loaded: ' + names.length + ', curated vocabularies: ' + curatedNames.length);

  // Curated token vocabulary per category + idf over curated lists only.
  const catVocab = Object.create(null);   // category -> {t:1}
  const df = Object.create(null);
  for (const c of curatedNames) {
    const v = Object.create(null);
    const toks = curated[c].flatMap(tokenize);
    for (const t of new Set(toks)) { v[t] = 1; df[t] = (df[t] || 0) + 1; }
    catVocab[c] = v;
  }
  const totalCats = curatedNames.length;
  const weight = t => Math.log(1 + totalCats / (1 + (df[t] || 0)));
  // token -> curated categories containing it (candidate prefilter).
  const tokenCats = Object.create(null);
  for (const c of curatedNames) {
    for (const t of Object.keys(catVocab[c])) (tokenCats[t] = tokenCats[t] || []).push(c);
  }

  // Per-category question totals (for MIN_TARGET_QS).
  const catQs = {};
  for (const s of names) {
    catQs[s] = 0;
    for (const { data } of subjects[s].files) {
      for (const qs of Object.values(data[s].subSubjects || {})) catQs[s] += qs.length;
    }
  }

  // Build per-sub-subject token profiles once; sources are only curated cats.
  const subProfiles = {};   // `${src}\u0000${sub}` -> {t:count}
  const subCounts = {};     // `${src}\u0000${sub}` -> question count
  for (const src of curatedNames) {
    if (SKIP_SOURCES.has(src)) continue;
    const subKeys = new Set();
    for (const { data } of (subjects[src] ? subjects[src].files : [])) {
      for (const sub2 of Object.keys((data[src] && data[src].subSubjects) || {})) subKeys.add(sub2);
    }
    for (const sub of subKeys) {
      if (/^general$/i.test(sub)) continue;
      const prof = Object.create(null);
      let n = 0;
      for (const { data } of subjects[src].files) {
        const qs = (data[src].subSubjects || {})[sub];
        if (!qs) continue;
        for (const q of qs) {
          for (const t of tokenize((q.question || '') + ' ' + (q.answer || '') + ' ' + (q.fact || ''))) prof[t] = (prof[t] || 0) + 1;
          n++;
        }
      }
      const key = src + '\u0000' + sub;
      subProfiles[key] = prof;
      subCounts[key] = n;
    }
  }

  // Score each sub-subject against candidate curated categories.
  // A sub-subject is a unit — the whole `sub` moves together.
  const moves = {};   // sourceSubject -> [{sub, n, to, covOther, covOwn}]
  let totalQs = 0;

  for (const [key, prof] of Object.entries(subProfiles)) {
    const [src, sub] = key.split('\u0000');
    const n = subCounts[key];
    totalQs += n;

    // Explicit remap override — deterministic, checked before any signal.
    const remapTo = REMAP[key];
    const globalTo = GLOBAL_MOVE[sub];
    if (globalTo) {
      if (globalTo !== src) {
        if (!moves[src]) moves[src] = [];
        moves[src].push({ sub, n, to: globalTo, covOther: 1, covOwn: 0, title: 0, titleOwn: 0, srcTitle: false, remap: true });
      }
      continue;
    }
    if (remapTo) {
      if (remapTo !== src) {
        if (!moves[src]) moves[src] = [];
        moves[src].push({ sub, n, to: remapTo, covOther: 1, covOwn: 0, title: 0, titleOwn: 0, srcTitle: false, remap: true });
      }
      continue;
    }

    const profMass = Object.entries(prof).reduce((a, [t, c]) => a + c * weight(t), 0);
    if (!profMass) continue;
    const candidates = new Set();
    for (const t of Object.keys(prof)) for (const c of (tokenCats[t] || [])) candidates.add(c);

    const cov = {};
    for (const tgt of candidates) {
      let mass = 0;
      for (const [t, c] of Object.entries(prof)) if (catVocab[tgt][t]) mass += c * weight(t);
      cov[tgt] = mass / profMass;
    }

    // TITLE signal: does the sub-subject NAME belong to another category's
    // curated topics? Titles are clean and precise — a name like
    // "Mandi, Himachal Pradesh" matches "Uttar Pradesh"/"Himachal" in Indian
    // States' curated list while matching nothing in its current agri category.
    // Count curated topics of each candidate whose tokens appear in the title.
    const subToks = tokenize(sub);
    const titleHit = {};   // category -> sum of matched-phrase token lengths
    for (const tgt of candidates) {
      let hitTokens = 0;
      for (const tp of (curated[tgt] || [])) {
        const tt = tokenize(tp);
        // The curated phrase must appear as a CONTIGUOUS run inside the
        // sub-subject's title (order preserved): "Himachal Pradesh" is inside
        // "Mandi, Himachal Pradesh", but cricket's "One Day International" is
        // NOT inside "International Day of Peace" (order differs), which kills
        // the worst false positive.
        if (tt.length >= 2) {
          // Discriminative phrase: EVERY token must be fairly rare across
          // categories. A phrase with a generic token ("life cycle" via
          // "Life cycle (insect)") cannot pin a topic to one home; "Himachal
          // Pradesh" (himachal df=1, pradesh df=2) can.
          const maxDf = Math.max(...tt.map(t => df[t] || 0));
          if (maxDf > 4) continue;
          for (let i = 0; i + tt.length <= subToks.length; i++) {
            let ok = true;
            for (let j = 0; j < tt.length; j++) if (subToks[i + j] !== tt[j]) { ok = false; break; }
            if (ok) { hitTokens += tt.length; break; }
          }
        }
      }
      titleHit[tgt] = hitTokens;
    }
    const subTitleLen = subToks.length;
    const titleScore = (tgt) => (subTitleLen ? titleHit[tgt] / subTitleLen : 0);
    const bestTitle = { cat: '', n: 0 };
    for (const [tgt, h] of Object.entries(titleHit)) if (tgt !== src && h > bestTitle.n) { bestTitle.n = h; bestTitle.cat = tgt; }
    const ownTitle = titleHit[src] || 0;

    // Content signal (curated-vocab coverage).
    let best = '', bestCov = 0;
    for (const [tgt, v] of Object.entries(cov)) {
      if (tgt !== src && v > bestCov) { bestCov = v; best = tgt; }
    }
    const ownCov = cov[src] || 0;
    // Decide: move when EITHER signal is strong.
    // - TITLE: the sub-subject name contains a contiguous curated phrase of
    //   ANOTHER category (>=3 tokens, OR >=2 tokens covering >=45% of the
    //   title's meaningful tokens) while matching NOTHING of its own curated
    //   list. ownTitle==0 keeps legitimate cross-listed topics (Sino-Indian War
    //   in Medieval & Modern India, National Education Policy 2020 in Govt
    //   Schemes) in place. The coverage rule stops a 2-token phrase in a long
    //   title (e.g. "European Union" inside "Accession of Ukraine to the
    //   European Union") from forcing a move.
    // - CONTENT: the sub-subject's question text is explained by another
    //   category's curated vocabulary much better than its own.
    const titleCov = subToks.length ? bestTitle.n / subToks.length : 0;
    // Title matches are self-evident when the matched phrase covers most of the
    // subject's name ("Mandi, Himachal Pradesh" → Himachal Pradesh is 2/3 of
    // the title). When the phrase is merely EMBEDDED in a longer title
    // ("Subhas Chandra Bose" inside "Netaji Subhas Chandra Bose International
    // Airport"), the airport's own name wins unless the questions' content
    // actually agrees with the phrase's category (Jim Corbett National Park's
    // questions really are about the park; the airport's are about aviation).
    const titleContent = cov[bestTitle.cat] || 0;
    // A parenthetical disambiguator ("(1932 film)") carries entity identity:
    // "Bird of Paradise (1932 film)" is a MOVIE despite "Bird of Paradise"
    // being a curated flower topic. Such titles can't be moved on the
    // self-evident tier; the content must confirm the category.
    const hasParen = /\(/.test(sub);
    const titleStrong = !hasParen && titleCov >= 0.6;
    const titleConfirmed = (bestTitle.n >= 3 || (bestTitle.n >= 2 && titleCov >= 0.45)) && titleContent >= 0.12;
    const titleWin = ownTitle === 0 && (titleStrong || titleConfirmed) &&
      (catQs[bestTitle.cat] || 0) >= MIN_TARGET_QS;
    const contentWin = best && bestCov >= HIGH && bestCov - ownCov >= GAP && ownCov < 0.15 && (catQs[best] || 0) >= MIN_TARGET_QS;
    if (titleWin || contentWin) {
      const to = titleWin ? bestTitle.cat : best;
      if (!moves[src]) moves[src] = [];
      moves[src].push({ sub, n, to, covOther: bestCov, covOwn: ownCov, title: bestTitle.n, titleOwn: ownTitle, srcTitle: titleWin });
    }
  }

  // ---- Report. ----
  let movedTotal = 0;
  const sorted = Object.entries(moves).map(([s, items]) => [s, items, items.reduce((a, x) => a + x.n, 0)]).sort((a, b) => b[2] - a[2]);
  console.log('Sub-subjects scanned, ' + totalQs + ' questions');
  console.log('Would move (whole sub-subjects): ' + sorted.reduce((a, [, , t]) => a + t, 0) + ' questions, in ' +
    sorted.reduce((a, [, items]) => a + items.length, 0) + ' sub-subjects\n');
  for (const [src, items, total] of sorted) {
    console.log(src + ': ' + total + ' qs in ' + items.length + ' subs');
    items.sort((a, b) => b.n - a.n).slice(0, 12).forEach(d =>
      console.log('   ' + d.sub + ' (' + d.n + ') -> ' + d.to +
        (d.remap ? ' [REMAP]' : d.srcTitle ? ' [TITLE hits=' + d.title + ' own=' + d.titleOwn + ']' : ' [content other=' + d.covOther.toFixed(2) + ' own=' + d.covOwn.toFixed(2) + ']')));
    if (items.length > 12) console.log('   ... and ' + (items.length - 12) + ' more');
  }

  if (DRY) { console.log('\nDRY-RUN — nothing written.'); return; }

  // ---- Apply moves: private, whole-sub-subject relocation, in memory. ----
  const targetFiles = {};
  const ensureCat = (subject) => {
    if (targetFiles[subject]) return targetFiles[subject];
    const existing = subjects[subject] && subjects[subject].files[0];
    if (existing) { targetFiles[subject] = existing; return existing; }
    const entry = { file: slugFor(subject) + '.json', data: { [subject]: { subSubjects: {} } } };
    subjects[subject] = { files: [entry] };
    targetFiles[subject] = entry;
    return entry;
  };

  let applied = 0;
  const appliedByTarget = {};
  for (const src of Object.keys(moves)) {
    for (const { sub, to } of moves[src]) {
      let qs = [];
      for (const { data } of subjects[src].files) {
        const ss = data[src].subSubjects || {};
        if (ss[sub]) { qs = qs.concat(ss[sub]); delete ss[sub]; }
      }
      if (!qs.length) continue;
      const t = ensureCat(to);
      const tSubs = t.data[to].subSubjects;
      for (const q of qs) { q.category = to; q.subject = to; }
      if (!tSubs[sub]) tSubs[sub] = [];
      tSubs[sub] = tSubs[sub].concat(qs);
      applied += qs.length;
      appliedByTarget[to] = (appliedByTarget[to] || 0) + qs.length;
    }
  }

  let written = 0;
  for (const s of Object.keys(subjects)) {
    for (const { file, data } of subjects[s].files) {
      fs.writeFileSync(path.join(QUESTIONS_DIR, file), JSON.stringify(data));
      written++;
    }
  }
  console.log('\nMOVED ' + applied + ' questions (whole sub-subjects, nothing dropped). Wrote ' + written + ' files.');
  Object.entries(appliedByTarget).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log('  ' + n + '  ->  ' + c));
}

main();
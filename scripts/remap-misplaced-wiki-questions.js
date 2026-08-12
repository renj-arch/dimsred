const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');

// subSubject -> correct category name. Anything not listed here stays put.
const REMAP = {
  // ── Mandi town/film/person disambiguation junk (from the 'Mandi' topic) ──
  'Mandi, Himachal Pradesh': 'Indian States',
  'Mandi, Jalandhar': 'Indian States',
  'Mandi, Mirpur': 'Indian States',
  'Mandi, Phagi': 'Indian States',
  'Mandi, Uttar Pradesh': 'Indian States',
  'Mandi Dabwali': 'Indian States',
  'Mandi Gobindgarh': 'Indian States',
  'Mandi district': 'Indian States',
  'Mandi State': 'Indian History',
  'Mandi House': 'Indian Architecture',
  'Mandi House metro station': 'Railways & Transport',
  'Mandi Bahauddin': 'World Geography',
  'Mandi Bahauddin District': 'World Geography',
  'Heera Mandi': 'World Geography',
  'Mandi (1956 film)': 'Indian Cinema',
  'Mandi (1983 film)': 'Indian Cinema',
  'Mandi (Mandaeism)': 'World History',
  'Mandi (legendary creature)': 'General',
  'Mandi (food)': 'General',
  'Mandeali': 'Indian Languages',
  'Aïssa Mandi': 'Sports',
  'Gyula Mándi': 'Sports',
  'Imre Mándi': 'Sports',
  'Mandi Lampi': 'Sports',

  // ── Himachal Pradesh geography/history (pulled in via Mandi link traversal) ──
  'Bagsiad': 'Indian States',
  'Barot, Himachal Pradesh': 'Indian States',
  'Bhadarwar, Himachal Pradesh': 'Indian States',
  'Bhuntar': 'Indian States',
  'Bijani': 'Indian States',
  'Chambi, Himachal Pradesh': 'Indian States',
  'Chauntra, Himachal Pradesh': 'Indian States',
  'Jaidevi': 'Indian States',
  'Jogindernagar': 'Indian States',
  'Kamand, Mandi district': 'Indian States',
  'Karsog': 'Indian States',
  'Kasol': 'Indian States',
  'Khanahr': 'Indian States',
  'Kotli, Himachal Pradesh': 'Indian States',
  'Kullu': 'Indian States',
  'Kullu district': 'Indian States',
  'Manali, Himachal Pradesh': 'Indian States',
  'Manikaran': 'Indian States',
  'Shamshi, Himachal Pradesh': 'Indian States',
  'Buldhana district': 'Indian States',
  'Kullu Valley': 'Indian Geography',
  'Parvati Valley': 'Indian Geography',
  'Kullui': 'Indian Languages',
  'Bhanupli–Leh line': 'Railways & Transport',
  'National Highway 30 (India)': 'Railways & Transport',
  'National Highway 3 (India)': 'Railways & Transport',
  'Kullu–Manali Airport': 'Indian Aviation & Shipping',
  'Parvati River (Himachal Pradesh)': 'Indian Rivers & Water Resources',
  'Brown trout': 'Fisheries & Aquaculture',
  'Chamba State': 'Indian History',
  'Kangra State': 'Indian History',
  'Siba State': 'Indian History',
  'Suket State': 'Indian History',
  'Princely state': 'Indian History',
  'Punjab States Agency': 'Indian History',
  'History of Himachal Pradesh': 'Indian History',
  'Sansar Chand': 'Indian History',
  'British rule in Himachal Pradesh': 'Medieval & Modern India',
  'Freedom struggle in Himachal Pradesh': 'Medieval & Modern India',
  'Mughal rule in Himachal Pradesh': 'Medieval & Modern India',
  'Prehistory and protohistory of Himachal Pradesh': 'Ancient India',
  'Guge': 'World History',
  'Queen Victoria': 'World History',
  'Chamba district': 'Indian States',
  '2017 Himachal Pradesh Legislative Assembly election': 'Polity & Governance',
  'Hamirpur, Himachal Pradesh Lok Sabha constituency': 'Polity & Governance',
  'Nagar panchayat': 'Polity & Governance',
  'Arts and crafts of Himachal Pradesh': 'Art & Culture',
  'Baba Kanshi Ram': 'Personalities',
  'Satyananda Stokes': 'Personalities',
  'Yashwantrao Chavan Maharashtra Open University': 'Education in India',

  // ── Bandy (a winter sport, 186 questions of it) ──
  'Bandy': 'Sports',
  'Bandy Federation of India': 'Sports',
  'Bandy Bond Nederland': 'Sports',
  'Bandy Federation of Denmark': 'Sports',
  'Bandy Federation of Kyrgyzstan': 'Sports',
  'Bandy Federation of Mongolia': 'Sports',
  'Bandy World Championship': 'Sports',
  'Bandy World Cup': 'Sports',
  'Bandy World Cup Women': 'Sports',
  'Bandy and Field Hockey Federation of the USSR': 'Sports',
  'Bandy at the 2011 Asian Winter Games': 'Sports',
  'Canada Bandy': 'Sports',
  'China Bandy Federation': 'Sports',
  'Colombia Federation of Skating Sports': 'Sports',
  'Czech Association of Bandy': 'Sports',
  'Estonian Bandy Association': 'Sports',
  'Federation of International Bandy': 'Sports',
  'Federation of Swiss Bandy': 'Sports',
  "Finland's Bandy Association": 'Sports',
  'German Bandy Federation': 'Sports',
  'Great Britain Bandy Association': 'Sports',
  'Hungarian Bandy Federation': 'Sports',
  'Italian Bandy Federation': 'Sports',
  'Japan Bandy Federation': 'Sports',

  // ── Economics theory & figures (from Category:Agricultural_economics recursion) ──
  'Anarcho-capitalism': 'Business & Economy',
  'Anti-capitalism': 'Business & Economy',
  'Arthur Laffer': 'Business & Economy',
  'Austerity': 'Business & Economy',
  'Austrian school of economics': 'Business & Economy',
  'Authoritarian capitalism': 'Business & Economy',
  'Better Regulation Commission': 'Business & Economy',
  'Business cycle': 'Business & Economy',
  'Capital (economics)': 'Business & Economy',
  'Capital market': 'Business & Economy',
  'Capitalism and Islam': 'Business & Economy',
  'Capitalist Realism': 'Business & Economy',
  'Capitalist propaganda': 'Business & Economy',
  'Capitalist state': 'Business & Economy',
  'Anti-Dühring': 'Books & Authors',
  'Anti-Oedipus': 'Books & Authors',
  'Alexandra Kollontai': 'Personalities',
  'Amadeo Bordiga': 'Personalities',
  'Anuradha Ghandy': 'Personalities',

  // ── Libraries, databases, citation indexes, journals ──
  'Library of Congress': 'Library & Information Science',
  'Scopus': 'Library & Information Science',
  'Google Scholar': 'Library & Information Science',
  'Clarivate': 'Library & Information Science',
  'Institute for Scientific Information': 'Library & Information Science',
  'Bibliographic database': 'Library & Information Science',
  'Embase': 'Library & Information Science',
  'Current Contents': 'Library & Information Science',
  'GEOBASE': 'Library & Information Science',
  'EMBiology': 'Library & Information Science',
  'Arts and Humanities Citation Index': 'Library & Information Science',
  'Social Sciences Citation Index': 'Library & Information Science',
  'Ovid Technologies': 'Library & Information Science',
  'Bepress': 'Library & Information Science',
  'Biochimica et Biophysica Acta': 'Library & Information Science',
  'Butterworth-Heinemann': 'Library & Information Science',
  'Cell (journal)': 'Library & Information Science',
  'Cell Press': 'Library & Information Science',
  'Churchill Livingstone': 'Library & Information Science',
  'Current Opinion (Elsevier)': 'Library & Information Science',
  'Ei Compendex': 'Library & Information Science',
  'Estates Gazette': 'Library & Information Science',
  'Geomechanics': 'Library & Information Science',
  'Online (magazine)': 'Library & Information Science',
  'Antipode (journal)': 'Library & Information Science',
  'Scientific literature': 'Library & Information Science',
  'Highly Cited Researchers': 'Library & Information Science',
  'Eugene Garfield': 'Personalities',
  'Natural environment': 'Environment & Ecology',
  'ClinicalTrials.gov': 'Health & Medicine',
  'Human nutrition': 'Agriculture & Food',
  'Alaska Natives': 'World Geography',
  'Shanghai Jiao Tong University': 'General',
  '2020 China floods': 'Disaster Management',
  '2021 heat waves': 'Disaster Management',
  'Asset tracking': 'Computer & IT',
  'Knowledge graph': 'Computer & IT',
  'Software as a service': 'Computer & IT',
  'Sankey diagram': 'Statistics & Mathematics',
  'Chicago Comic & Entertainment Expo': 'General',
  'EGX (expo)': 'General',
  'Emerald City Comic Con': 'General',
  'Florida Supercon': 'General',
  'Equitana': 'General',
};

function slugFor(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function loadCategory(fileName) {
  const p = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(p)) return { file: p, data: null };
  return { file: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function writeCategory(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
}

function main() {
  const srcName = 'agricultural-extension-marketing.json';
  const src = loadCategory(srcName);
  if (!src.data) { console.error('Missing source file ' + srcName); process.exit(1); }
  const srcSubject = Object.keys(src.data)[0];
  const srcSubs = src.data[srcSubject].subSubjects;

  const targets = {}; // catName -> { file, data, subject }
  const moved = {};

  for (const [subSub, cat] of Object.entries(REMAP)) {
    if (!srcSubs[subSub]) {
      console.log('  (not in source, skip) ' + subSub);
      continue;
    }
    const qs = srcSubs[subSub];
    if (!targets[cat]) {
      const slug = slugFor(cat);
      const t = loadCategory(slug + '.json');
      if (!t.data) {
        t.data = {};
        t.data[cat] = { subSubjects: {} };
      }
      targets[cat] = t;
    }
    const t = targets[cat];
    const targetSubject = Object.keys(t.data)[0];
    const targetSubs = t.data[targetSubject].subSubjects;
    for (const q of qs) {
      q.category = cat;
      q.subject = cat;
    }
    if (!targetSubs[subSub]) targetSubs[subSub] = [];
    targetSubs[subSub] = targetSubs[subSub].concat(qs);
    moved[cat] = (moved[cat] || 0) + qs.length;
    delete srcSubs[subSub];
  }

  writeCategory(src.file, src.data);
  let targetSummary = '';
  for (const [cat, t] of Object.entries(targets)) {
    writeCategory(t.file, t.data);
    const subCount = Object.keys(t.data[Object.keys(t.data)[0]].subSubjects).length;
    targetSummary += '  ' + cat + ': +' + moved[cat] + ' Qs (now ' + subCount + ' sub-subjects) -> ' + path.basename(t.file) + '\n';
  }

  const remaining = Object.keys(srcSubs).length;
  console.log('Moved questions by target category:');
  console.log(targetSummary);
  console.log('Source ' + srcSubject + ' now has ' + remaining + ' sub-subjects (was ' + (remaining + Object.keys(REMAP).length) + ' requested).');
}

main();

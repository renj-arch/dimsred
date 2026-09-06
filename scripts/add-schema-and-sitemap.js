const fs = require('fs');
const path = require('path');

var pages = [
  // NEET chapter pages
  { file:'neet/chapters/biology-chapter-1-the-living-world.html', name:'NEET Biology Chapter 1: The Living World MCQ', desc:'Free NEET Biology Chapter 1 The Living World MCQ with solutions. Diversity in living world, taxonomy, nomenclature.' },
  { file:'neet/chapters/biology-chapter-2-biological-classification.html', name:'NEET Biology Chapter 2: Biological Classification MCQ', desc:'Free NEET Biology Chapter 2 Biological Classification MCQ with solutions. Five kingdoms, viruses, lichens.' },
  { file:'neet/chapters/biology-chapter-3-plant-kingdom.html', name:'NEET Biology Chapter 3: Plant Kingdom MCQ', desc:'Free NEET Biology Chapter 3 Plant Kingdom MCQ with solutions. 30+ practice questions for NEET preparation.' },
  { file:'neet/chapters/biology-chapter-4-animal-kingdom.html', name:'NEET Biology Chapter 4: Animal Kingdom MCQ', desc:'Free NEET Biology Chapter 4 Animal Kingdom MCQ with solutions. 30+ practice questions covering Porifera to Chordata.' },
  { file:'neet/chapters/biology-chapter-5-morphology-of-flowering-plants.html', name:'NEET Biology Chapter 5: Morphology of Flowering Plants MCQ', desc:'Free NEET Biology Chapter 5 Morphology of Flowering Plants MCQ with solutions. Root, stem, leaf, flower, fruit, seed.' },
  { file:'neet/chapters/biology-chapter-6-anatomy-of-flowering-plants.html', name:'NEET Biology Chapter 6: Anatomy of Flowering Plants MCQ', desc:'Free NEET Biology Chapter 6 Anatomy of Flowering Plants MCQ with solutions. Tissues, anatomy, secondary growth.' },
  { file:'neet/chapters/biology-chapter-7-structural-organization-in-animals.html', name:'NEET Biology Chapter 7: Structural Organization in Animals MCQ', desc:'Free NEET Biology Chapter 7 Structural Organization MCQ with solutions. Earthworm, cockroach, frog anatomy.' },
  { file:'neet/chapters/biology-chapter-8-cell-the-unit-of-life.html', name:'NEET Biology Chapter 8: Cell The Unit of Life MCQ', desc:'Free NEET Biology Chapter 8 Cell The Unit of Life MCQ with solutions. Cell theory, organelles, prokaryotic vs eukaryotic.' },
  { file:'neet/chapters/biology-chapter-9-biomolecules.html', name:'NEET Biology Chapter 9: Biomolecules MCQ', desc:'Free NEET Biology Chapter 9 Biomolecules MCQ with solutions. Carbohydrates, proteins, lipids, nucleic acids, enzymes.' },
  { file:'neet/chapters/biology-chapter-10-cell-cycle-and-cell-division.html', name:'NEET Biology Chapter 10: Cell Cycle and Cell Division MCQ', desc:'Free NEET Biology Chapter 10 Cell Cycle and Cell Division MCQ with solutions. Mitosis, meiosis, cell cycle phases.' },
  // JEE Important Questions pages
  { file:'jee/chapters/physics-important-questions.html', name:'JEE 2027 Physics Important Questions', desc:'Free JEE 2027 Physics important questions with solutions. Mechanics, Electrodynamics, Modern Physics practice.' },
  { file:'jee/chapters/chemistry-important-questions.html', name:'JEE 2027 Chemistry Important Questions', desc:'Free JEE 2027 Chemistry important questions with solutions. Physical, Inorganic & Organic Chemistry practice.' },
  { file:'jee/chapters/maths-important-questions.html', name:'JEE 2027 Maths Important Questions', desc:'Free JEE 2027 Maths important questions with solutions. Algebra, Calculus, Coordinate Geometry practice.' },
  // CGL Important Questions pages
  { file:'cgl/chapters/reasoning-important-questions.html', name:'SSC CGL Reasoning Important Questions', desc:'Free SSC CGL Reasoning important questions with solutions. Analogy, series, coding, blood relation, direction.' },
  { file:'cgl/chapters/quantitative-aptitude-important-questions.html', name:'SSC CGL Quantitative Aptitude Important Questions', desc:'Free SSC CGL Quantitative Aptitude important questions with solutions. Number System, Algebra, Geometry, Mensuration.' },
  // Agniveer Important Questions pages
  { file:'agniveer/chapters/general-knowledge-important-questions.html', name:'Agniveer General Knowledge Important Questions', desc:'Free Agniveer GK important questions with solutions. History, Geography, Polity, Science.' },
  { file:'agniveer/chapters/mathematics-important-questions.html', name:'Agniveer Mathematics Important Questions', desc:'Free Agniveer Math important questions with solutions. Arithmetic, Algebra, Geometry.' },
  { file:'agniveer/chapters/science-important-questions.html', name:'Agniveer Science Important Questions', desc:'Free Agniveer Science important questions with solutions. Physics, Chemistry, Biology.' },
  { file:'agniveer/chapters/reasoning-important-questions.html', name:'Agniveer Reasoning Important Questions', desc:'Free Agniveer Reasoning important questions with solutions. Analogy, Series, Coding, Blood Relation.' },
  // CTET Important Questions pages
  { file:'ctet/chapters/child-development-pedagogy-important-questions.html', name:'CTET CDP Important Questions', desc:'Free CTET Child Development & Pedagogy important questions with solutions. Theories, learning, motivation.' },
  { file:'ctet/chapters/mathematics-important-questions.html', name:'CTET Mathematics Important Questions', desc:'Free CTET Math important questions with solutions. Number System, Arithmetic, Geometry, Mensuration.' },
  { file:'ctet/chapters/environmental-studies-important-questions.html', name:'CTET EVS Important Questions', desc:'Free CTET Environmental Studies important questions with solutions. Science, Social Science, Pedagogy.' },
  { file:'ctet/chapters/language-important-questions.html', name:'CTET Language Important Questions', desc:'Free CTET English & Hindi Language important questions with solutions. Grammar, comprehension, pedagogy.' },
  // UPSC Important Questions pages
  { file:'upsc/chapters/general-studies-important-questions.html', name:'UPSC General Studies Important Questions', desc:'Free UPSC GS important questions with solutions. History, Geography, Polity, Economy, Environment.' },
  { file:'upsc/chapters/csat-important-questions.html', name:'UPSC CSAT Important Questions', desc:'Free UPSC CSAT important questions with solutions. Comprehension, reasoning, numeracy, data interpretation.' },
  { file:'upsc/chapters/current-affairs-important-questions.html', name:'UPSC Current Affairs Important Questions', desc:'Free UPSC Current Affairs important questions with solutions. National & international events, schemes, awards.' },
  // IBPS PO Important Questions pages
  { file:'ibps-po/chapters/reasoning-important-questions.html', name:'IBPS PO Reasoning Important Questions', desc:'Free IBPS PO Reasoning important questions with solutions. Puzzles, seating, syllogism, coding, inequality.' },
  { file:'ibps-po/chapters/quantitative-aptitude-important-questions.html', name:'IBPS PO Quantitative Aptitude Important Questions', desc:'Free IBPS PO Quantitative Aptitude important questions with solutions. DI, arithmetic, algebra, number series.' },
  { file:'ibps-po/chapters/english-important-questions.html', name:'IBPS PO English Important Questions', desc:'Free IBPS PO English important questions with solutions. Reading comprehension, cloze test, error spotting.' },
  { file:'ibps-po/chapters/general-awareness-important-questions.html', name:'IBPS PO General Awareness Important Questions', desc:'Free IBPS PO General Awareness important questions with solutions. Banking, economy, current affairs, static GK.' },
  // SBI Clerk Important Questions pages
  { file:'sbi-clerk/chapters/reasoning-important-questions.html', name:'SBI Clerk Reasoning Important Questions', desc:'Free SBI Clerk Reasoning important questions with solutions. Puzzles, inequalities, syllogism, coding.' },
  { file:'sbi-clerk/chapters/quantitative-aptitude-important-questions.html', name:'SBI Clerk Quantitative Aptitude Important Questions', desc:'Free SBI Clerk Quantitative Aptitude important questions with solutions. Arithmetic, DI, number series.' },
  { file:'sbi-clerk/chapters/english-important-questions.html', name:'SBI Clerk English Important Questions', desc:'Free SBI Clerk English important questions with solutions. Comprehension, cloze, error detection.' },
  { file:'sbi-clerk/chapters/general-awareness-important-questions.html', name:'SBI Clerk General Awareness Important Questions', desc:'Free SBI Clerk General Awareness important questions with solutions. Banking, finance, current affairs.' },
  // SSC GD Important Questions pages
  { file:'ssc-gd/chapters/general-knowledge-important-questions.html', name:'SSC GD General Knowledge Important Questions', desc:'Free SSC GD GK important questions with solutions. History, Geography, Polity, Science, Current Affairs.' },
  { file:'ssc-gd/chapters/mathematics-important-questions.html', name:'SSC GD Mathematics Important Questions', desc:'Free SSC GD Math important questions with solutions. Number System, Arithmetic, Algebra, Geometry.' },
  { file:'ssc-gd/chapters/reasoning-important-questions.html', name:'SSC GD Reasoning Important Questions', desc:'Free SSC GD Reasoning important questions with solutions. Analogy, series, classification, coding.' },
  { file:'ssc-gd/chapters/english-important-questions.html', name:'SSC GD English Important Questions', desc:'Free SSC GD English important questions with solutions. Grammar, vocabulary, comprehension.' },
  // GATE Important Questions pages
  { file:'gate/chapters/general-aptitude-important-questions.html', name:'GATE General Aptitude Important Questions', desc:'Free GATE GA important questions with solutions. Numerical ability, verbal ability, logical reasoning.' },
  { file:'gate/chapters/engineering-mathematics-important-questions.html', name:'GATE Engineering Mathematics Important Questions', desc:'Free GATE Engineering Mathematics important questions with solutions. Linear Algebra, Calculus, ODE, Probability.' },
  // Dashboard and Community
  { file:'dashboard.html', name:'Study Dashboard — Daily Quiz, Current Affairs, Mock Tests', desc:'Daily quiz, current affairs, weekly mock countdown, progress tracking for competitive exam preparation.' },
  { file:'community.html', name:'Community — Telegram, WhatsApp, Instagram Study Groups', desc:'Join vlymbooq community on Telegram, WhatsApp, Instagram for competitive exam study groups and updates.' }
];

var ROOT = path.resolve(__dirname, '..');

function escJS(s) {
  return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'');
}

function addSchema(filePath, name, desc) {
  var fullPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(fullPath)) { console.log('Missing: ' + filePath); return; }
  var html = fs.readFileSync(fullPath, 'utf-8');
  // Check if schema already exists
  if (html.indexOf('application/ld+json') !== -1) { console.log('Schema exists: ' + filePath); return; }
  var url = 'https://vlymbooq.qzz.io/' + filePath.replace(/\\/g,'/');
  var schema = JSON.stringify({
    '@context':'https://schema.org',
    '@type':'WebPage',
    name: name,
    description: desc,
    url: url,
    educationalLevel:'Competitive Exam',
    audience: { '@type':'EducationalAudience', 'educationalRole':'student' },
    publisher: { '@type':'Organization', name:'vlymbooq', url:'https://vlymbooq.qzz.io' }
  });
  var insert = '    <script type="application/ld+json">' + schema + '</script>\n';
  html = html.replace('<meta property="og:image"', insert + '    <meta property="og:image"');
  fs.writeFileSync(fullPath, html, 'utf-8');
  console.log('Added schema: ' + filePath);
}

// Add schema to each page
for (var i = 0; i < pages.length; i++) {
  addSchema(pages[i].file, pages[i].name, pages[i].desc);
}

// Update sitemap
var sitemapPath = path.resolve(ROOT, 'sitemap.xml');
var sitemap = fs.readFileSync(sitemapPath, 'utf-8');

var newUrls = [
  'https://vlymbooq.qzz.io/jee/chapters/chemistry-important-questions.html',
  'https://vlymbooq.qzz.io/jee/chapters/maths-important-questions.html',
  'https://vlymbooq.qzz.io/cgl/chapters/general-awareness-important-questions.html',
  'https://vlymbooq.qzz.io/cgl/chapters/english-important-questions.html',
  'https://vlymbooq.qzz.io/agniveer/chapters/general-knowledge-important-questions.html',
  'https://vlymbooq.qzz.io/agniveer/chapters/mathematics-important-questions.html',
  'https://vlymbooq.qzz.io/agniveer/chapters/science-important-questions.html',
  'https://vlymbooq.qzz.io/agniveer/chapters/reasoning-important-questions.html',
  'https://vlymbooq.qzz.io/ctet/chapters/child-development-pedagogy-important-questions.html',
  'https://vlymbooq.qzz.io/ctet/chapters/mathematics-important-questions.html',
  'https://vlymbooq.qzz.io/ctet/chapters/environmental-studies-important-questions.html',
  'https://vlymbooq.qzz.io/ctet/chapters/language-important-questions.html',
  'https://vlymbooq.qzz.io/upsc/chapters/general-studies-important-questions.html',
  'https://vlymbooq.qzz.io/upsc/chapters/csat-important-questions.html',
  'https://vlymbooq.qzz.io/upsc/chapters/current-affairs-important-questions.html',
  'https://vlymbooq.qzz.io/ibps-po/chapters/reasoning-important-questions.html',
  'https://vlymbooq.qzz.io/ibps-po/chapters/quantitative-aptitude-important-questions.html',
  'https://vlymbooq.qzz.io/ibps-po/chapters/english-important-questions.html',
  'https://vlymbooq.qzz.io/ibps-po/chapters/general-awareness-important-questions.html',
  'https://vlymbooq.qzz.io/sbi-clerk/chapters/reasoning-important-questions.html',
  'https://vlymbooq.qzz.io/sbi-clerk/chapters/quantitative-aptitude-important-questions.html',
  'https://vlymbooq.qzz.io/sbi-clerk/chapters/english-important-questions.html',
  'https://vlymbooq.qzz.io/sbi-clerk/chapters/general-awareness-important-questions.html',
  'https://vlymbooq.qzz.io/ssc-gd/chapters/general-knowledge-important-questions.html',
  'https://vlymbooq.qzz.io/ssc-gd/chapters/mathematics-important-questions.html',
  'https://vlymbooq.qzz.io/ssc-gd/chapters/reasoning-important-questions.html',
  'https://vlymbooq.qzz.io/ssc-gd/chapters/english-important-questions.html',
  'https://vlymbooq.qzz.io/gate/chapters/general-aptitude-important-questions.html',
  'https://vlymbooq.qzz.io/gate/chapters/engineering-mathematics-important-questions.html'
];

var added = 0;
for (var i = 0; i < newUrls.length; i++) {
  if (sitemap.indexOf(newUrls[i]) === -1) {
    // Insert before closing urlset
    var entry = '  <url>\n    <loc>' + newUrls[i] + '</loc>\n    <lastmod>2026-06-02</lastmod>\n    <priority>0.8</priority>\n  </url>\n';
    sitemap = sitemap.replace('</urlset>', entry + '</urlset>');
    added++;
  }
}
fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log('Added ' + added + ' URLs to sitemap');
console.log('Sitemap total URL count: ' + (sitemap.match(/<loc>/g) || []).length);

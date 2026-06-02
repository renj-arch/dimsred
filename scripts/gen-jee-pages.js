const fs = require('fs');
const path = require('path');

function q(id, topic, text, opts, sol) {
  return { id, topic, text, options: opts.map(function(o){return {l:o[0],t:o[1],c:o[2]}}), sol };
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

var chemQs = [
  q(1,'Mole Concept','The number of atoms in 52 g of He (atomic mass 4 u) is:',[['A','7.83×10²³',false],['B','7.83×10²⁴',true],['C','1.56×10²⁴',false],['D','3.92×10²³',false]],'Moles = 52/4 = 13 mol. Number of atoms = 13 × 6.022×10²³ = 7.83×10²⁴.'),
  q(2,'Atomic Structure','The energy of an electron in the nth Bohr orbit of hydrogen is -13.6/n² eV. The energy required to ionize H atom from n=2 is:',[['A','3.4 eV',true],['B','6.8 eV',false],['C','13.6 eV',false],['D','1.51 eV',false]],'E₂ = -13.6/4 = -3.4 eV. Ionization from n=2: ΔE = 0 - (-3.4) = 3.4 eV.'),
  q(3,'Periodic Table','Element with highest electronegativity:',[['A','F',true],['B','Cl',false],['C','O',false],['D','N',false]],'Fluorine has the highest electronegativity (4.0 on Pauling scale).'),
  q(4,'Chemical Bonding','Which molecule has a linear shape?',[['A','H₂O',false],['B','CO₂',true],['C','NH₃',false],['D','CH₄',false]],'CO₂ has sp hybridization with 180° bond angle, giving a linear shape.'),
  q(5,'Thermodynamics','For a spontaneous reaction, ΔG is:',[['A','Positive',false],['B','Negative',true],['C','Zero',false],['D','Constant',false]],'ΔG = ΔH - TΔS. For spontaneity, ΔG < 0 (negative).'),
  q(6,'Chemical Kinetics','The half-life of a first order reaction is 100 s. The rate constant is:',[['A','6.93×10⁻³ s⁻¹',true],['B','3.47×10⁻³ s⁻¹',false],['C','1.39×10⁻² s⁻¹',false],['D','2.77×10⁻³ s⁻¹',false]],'k = 0.693/t₁/₂ = 0.693/100 = 6.93×10⁻³ s⁻¹.'),
  q(7,'Equilibrium','The pH of 10⁻³ M HCl solution is:',[['A','2',false],['B','3',true],['C','4',false],['D','5',false]],'pH = -log[H⁺] = -log(10⁻³) = 3. HCl is a strong acid.'),
  q(8,'Redox','Oxidation number of S in H₂SO₄:',[['A','+4',false],['B','+6',true],['C','+2',false],['D','-2',false]],'2(+1) + x + 4(-2) = 0 → 2 + x - 8 = 0 → x = +6.'),
  q(9,'Hydrocarbons','Which hydrocarbon gives only one monochlorination product?',[['A','Ethane',true],['B','Propane',false],['C','Butane',false],['D','Pentane',false]],'Ethane (CH₃CH₃) has only one type of H, so monochlorination gives only CH₃CH₂Cl.'),
  q(10,'Haloalkanes','SN2 reaction proceeds with:',[['A','Racemization',false],['B','Inversion of configuration',true],['C','Retention',false],['D','Both retention and inversion',false]],'SN2 involves backside attack, causing Walden inversion (inversion of configuration).'),
  q(11,'Alcohols','The product of Lucas test with tertiary alcohol is:',[['A','Chloride',true],['B','Bromide',false],['C','Iodide',false],['D','Ester',false]],'Tertiary alcohols react immediately with Lucas reagent (ZnCl₂/HCl) to form a cloudy alkyl chloride.'),
  q(12,'Carbonyl Compounds','The IUPAC name of CH₃COCH₃ is:',[['A','Acetone',false],['B','Propanone',true],['C','Propanal',false],['D','Methyl ketone',false]],'CH₃COCH₃ = propan-2-one (IUPAC: Propanone). Common name: acetone.'),
  q(13,'Coordination Compounds','The coordination number of Fe in K₃[Fe(CN)₆] is:',[['A','3',false],['B','4',false],['C','6',true],['D','8',false]],'Six CN⁻ ligands surround Fe, so coordination number = 6.'),
  q(14,'s-block','Alkali metals are stored under:',[['A','Water',false],['B','Kerosene',true],['C','Alcohol',false],['D','Acid',false]],'Alkali metals are highly reactive with air/moisture, so stored under kerosene.'),
  q(15,'p-block','Boron shows anomalous behavior due to:',[['A','Small size',false],['B','Lack of d-orbitals',false],['C','High ionization energy',false],['D','All of these',true]],'Boron is anomalous in group 13 due to small size, high IE, and no d-orbitals.'),
  q(16,'d-block','The color of transition metal ions is due to:',[['A','s-s transitions',false],['B','d-d transitions',true],['C','p-p transitions',false],['D','f-f transitions',false]],'Color in transition metal compounds arises from d-d electron transitions (crystal field splitting).'),
  q(17,'Solutions','Mole fraction of solute in 1 molal aqueous solution is:',[['A','0.018',false],['B','0.0177',true],['C','0.15',false],['D','0.2',false]],'1 molal = 1 mole in 1000 g water. Moles water = 1000/18 = 55.55. X_solute = 1/(1+55.55) = 1/56.55 = 0.0177.'),
  q(18,'Electrochemistry','The emf of a Daniel cell with [Zn²⁺] = 0.1 M and [Cu²⁺] = 1 M (E° = 1.1 V) at 298 K is:',[['A','1.07 V',false],['B','1.13 V',true],['C','1.1 V',false],['D','1.2 V',false]],'E = E° - (0.059/2) log([Zn²⁺]/[Cu²⁺]) = 1.1 - 0.0295 log(0.1) = 1.1 - 0.0295(-1) = 1.1295 V ≈ 1.13 V.'),
  q(19,'GOC','Which is the most stable carbocation?',[['A','CH₃⁺',false],['B','CH₃CH₂⁺',false],['C','(CH₃)₂CH⁺',false],['D','(CH₃)₃C⁺',true]],'Tertiary carbocation (3°) is most stable due to +I effect of three methyl groups.'),
  q(20,'Biomolecules','The linkage between amino acids in proteins is:',[['A','Glycosidic',false],['B','Peptide',true],['C','Phosphodiester',false],['D','Hydrogen',false]],'Peptide bond (-CO-NH-) links amino acids. Glycosidic in carbs, phosphodiester in DNA.'),
  q(21,'Mole Concept','The volume occupied by 4 g of H₂ at STP is:',[['A','22.4 L',false],['B','44.8 L',true],['C','11.2 L',false],['D','67.2 L',false]],'Moles H₂ = 4/2 = 2 mol. Volume at STP = 2 × 22.4 = 44.8 L.'),
  q(22,'Atomic Structure','The maximum number of electrons in d-subshell is:',[['A','6',false],['B','10',true],['C','14',false],['D','2',false]],'d-subshell has 5 orbitals, each with 2 electrons, so max = 10.'),
  q(23,'Equilibrium','If Kp = Kc for a reaction at a given temperature, then Δn =:',[['A','0',true],['B','1',false],['C','2',false],['D','-1',false]],'Kp = Kc(RT)^Δn. When Kp = Kc, Δn = 0 (no change in moles of gas).'),
  q(24,'Chemical Bonding','Which has the highest bond dissociation energy?',[['A','F-F',false],['B','N≡N',true],['C','O=O',false],['D','Cl-Cl',false]],'N≡N has a triple bond with bond energy ~945 kJ/mol, highest of these.'),
  q(25,'Alcohols','Glycerol on reaction with HNO₃ gives:',[['A','Glyceryl trinitrate',true],['B','Glyceraldehyde',false],['C','Glyceric acid',false],['D','Oxalic acid',false]],'Nitration of glycerol produces glyceryl trinitrate (nitroglycerine), an explosive.'),
  q(26,'Carbonyl Compounds','Cannizzaro reaction is given by:',[['A','CH₃CHO',false],['B','HCHO',true],['C','CH₃COCH₃',false],['D','C₂H₅OH',false]],'Cannizzaro: aldehydes without α-H (e.g., HCHO, benzaldehyde) give alcohol + carboxylic acid salt.'),
  q(27,'Coordination','The IUPAC name of [Co(NH₃)₆]Cl₃ is:',[['A','Hexaamminecobalt(III) chloride',true],['B','Cobalt hexaammine chloride',false],['C','Ammonia cobalt chloride',false],['D','Cobalt(III) ammine chloride',false]],'[Co(NH₃)₆]Cl₃ = Hexaamminecobalt(III) chloride. Cobalt is in +3 state.'),
  q(28,'Thermodynamics','Enthalpy of formation of which is zero?',[['A','H₂O(g)',false],['B','H₂(g)',true],['C','HCl(g)',false],['D','CO₂(g)',false]],'Enthalpy of formation of elements in their standard state (H₂ gas) is zero by convention.'),
  q(29,'Chemical Kinetics','The unit of rate constant for zero order reaction is:',[['A','s⁻¹',false],['B','mol L⁻¹ s⁻¹',true],['C','L mol⁻¹ s⁻¹',false],['D','L² mol⁻² s⁻¹',false]],'Rate = k [A]⁰ = k. k has units of concentration/time = mol L⁻¹ s⁻¹.'),
  q(30,'Hydrocarbons','Which of the following is aromatic?',[['A','Cyclopentadiene',false],['B','Benzene',true],['C','Cyclooctatetraene',false],['D','Cyclobutadiene',false]],'Benzene satisfies Hückel rule (4n+2 π electrons, n=1, planar, cyclic). Others are anti-aromatic.')
];

function genPage(which) {
  var qs, title, desc, color, subject, badge;
  if (which === 'chem') {
    qs = chemQs;
    subject = 'Chemistry';
    title = 'JEE 2027 Chemistry Important Questions with Solutions | Free PDF';
    desc = 'Free JEE 2027 Chemistry important questions with detailed solutions. 30 handpicked problems covering Physical, Inorganic & Organic Chemistry.';
    color = '#a78bfa';
    badge = 'JEE Main 2027 · Chemistry';
    var h1 = 'JEE 2027 Chemistry Important Questions — Handpicked Problems with Solutions';
    var sub = 'Top 30 most important Chemistry questions for JEE Main 2027. Covers Class 11 & 12: Physical Chemistry, Inorganic Chemistry, and Organic Chemistry. Each problem includes a step-by-step solution.';
    var seoH2 = 'Why These JEE Chemistry Questions Matter for 2027';
    var seoP = 'JEE Main 2027 Chemistry requires conceptual clarity across Physical, Inorganic, and Organic Chemistry. These 30 handpicked questions cover every major topic from the JEE Chemistry syllabus.';
    var seoItems = ['30 JEE Main pattern MCQs with detailed solutions','Covers Mole Concept, Atomic Structure, Bonding, Thermodynamics, Equilibrium, Hydrocarbons, Coordination, and more','Follows JEE Main (+4, -1) marking scheme','Free PDF download for offline practice','Track your accuracy and identify weak topics'];
    var related = '<a href="physics-important-questions.html">JEE Physics Important Questions</a> · <a href="maths-important-questions.html">JEE Maths Important Questions</a> · <a href="../index.html">JEE Full Mock Tests</a>';
    var pages = [
      {href:'physics-important-questions.html',label:'Physics Important Qs'},
      {href:'chemistry-important-questions.html',label:'Chemistry Important Qs',active:true},
      {href:'maths-important-questions.html',label:'Maths Important Qs'},
      {href:'#',label:'Ch 1: Some Basic Concepts'},
      {href:'#',label:'Ch 2: Structure of Atom'},
      {href:'#',label:'Ch 3: Classification'},
      {href:'#',label:'Ch 4: Chemical Bonding'},
      {href:'#',label:'Ch 5: States of Matter'},
      {href:'#',label:'Ch 6: Thermodynamics'}
    ];
    var fileName = 'chemistry-important-questions.html';
  } else {
    qs = [
      q(1,'Complex Numbers','If i² = -1, then the value of i¹⁰⁵ is:',[['A','i',true],['B','-i',false],['C','1',false],['D','-1',false]],'i^105 = i^(4×26+1) = (i⁴)^26 × i = 1²⁶ × i = i.'),
      q(2,'Quadratic','If α and β are roots of x² - 5x + 6 = 0, then α + β =:',[['A','5',true],['B','6',false],['C','-5',false],['D','-6',false]],'Sum of roots = -b/a = -(-5)/1 = 5.'),
      q(3,'Sequences','The nth term of an AP is 3n + 2. The common difference is:',[['A','2',false],['B','3',true],['C','5',false],['D','1',false]],'t_n = 3n+2. t_(n+1) = 3(n+1)+2 = 3n+5. d = t_(n+1)-t_n = (3n+5)-(3n+2) = 3.'),
      q(4,'Trigonometry','sin 60° =',[['A','1/2',false],['B','√3/2',true],['C','1/√2',false],['D','1',false]],'sin 60° = √3/2 ≈ 0.866.'),
      q(5,'Limits','lim(x→0) sin x / x =',[['A','0',false],['B','1',true],['C','∞',false],['D','-1',false]],'lim(x→0) sin x / x = 1. This is the standard limit.'),
      q(6,'Differentiation','If y = x³ + 2x² - 5x + 7, then dy/dx at x = 1 is:',[['A','2',false],['B','5',true],['C','7',false],['D','9',false]],'dy/dx = 3x² + 4x - 5. At x=1: 3+4-5 = 2.'),
      q(7,'Integration','∫ 2x dx =',[['A','x² + C',true],['B','2x² + C',false],['C','x²/2 + C',false],['D','x + C',false]],'∫ 2x dx = 2·x²/2 + C = x² + C.'),
      q(8,'Co-ordinate','The distance between points (1,2) and (4,6) is:',[['A','3',false],['B','4',false],['C','5',true],['D','6',false]],'d = √[(4-1)²+(6-2)²] = √(9+16) = √25 = 5.'),
      q(9,'Circles','The center of circle x² + y² - 4x + 6y - 12 = 0 is:',[['A','(2,-3)',true],['B','(-2,3)',false],['C','(4,-6)',false],['D','(-4,6)',false]],'Center = (-g,-f) where 2g = -4 → g = -2, 2f = 6 → f = 3. So center = (2,-3).'),
      q(10,'Vectors','If a = 2i + 3j and b = 4i - j, then a·b =:',[['A','5',true],['B','8',false],['C','11',false],['D','3',false]],'a·b = (2)(4) + (3)(-1) = 8 - 3 = 5.'),
      q(11,'Probability','A coin is tossed 3 times. The probability of getting exactly 2 heads is:',[['A','1/8',false],['B','3/8',true],['C','1/2',false],['D','5/8',false]],'Total outcomes = 8. Favorable (HHT, HTH, THH) = 3. P = 3/8.'),
      q(12,'Permutations','The number of ways to arrange the letters of the word MATH is:',[['A','4',false],['B','12',false],['C','24',true],['D','48',false]],'4 distinct letters: 4! = 4 × 3 × 2 × 1 = 24.'),
      q(13,'Binomial','The number of terms in (x + y)¹⁰ is:',[['A','9',false],['B','10',false],['C','11',true],['D','12',false]],'Number of terms = n + 1 = 10 + 1 = 11.'),
      q(14,'Trigonometry','cos 0° =',[['A','0',false],['B','1',true],['C','-1',false],['D','√3/2',false]],'cos 0° = 1.'),
      q(15,'Limits','lim(x→0) (eˣ - 1)/x =',[['A','0',false],['B','1',true],['C','e',false],['D','∞',false]],'lim(x→0) (eˣ-1)/x = 1. Standard limit.'),
      q(16,'Differentiation','If y = sin x, then dy/dx =',[['A','cos x',true],['B','-cos x',false],['C','sin x',false],['D','-sin x',false]],'d(sin x)/dx = cos x.'),
      q(17,'Integration','∫₀¹ x dx =',[['A','0',false],['B','1/2',true],['C','1',false],['D','2',false]],'∫₀¹ x dx = [x²/2]₀¹ = 1/2 - 0 = 1/2.'),
      q(18,'3D Geometry','The direction ratios of line joining (1,2,3) and (4,5,6) are:',[['A','(3,3,3)',true],['B','(5,7,9)',false],['C','(1,2,3)',false],['D','(4,5,6)',false]],'DR = (4-1, 5-2, 6-3) = (3,3,3).'),
      q(19,'Sets','If A = {1,2,3} and B = {2,3,4}, then A ∩ B =',[['A','{1,2,3,4}',false],['B','{2,3}',true],['C','{1,4}',false],['D','{}',false]],'Intersection: elements common to both = {2,3}.'),
      q(20,'Functions','If f(x) = 2x + 1, then f(3) =',[['A','5',false],['B','6',false],['C','7',true],['D','8',false]],'f(3) = 2(3) + 1 = 6 + 1 = 7.'),
      q(21,'Quadratic','The discriminant of x² - 4x + 4 = 0 is:',[['A','0',true],['B','4',false],['C','-4',false],['D','16',false]],'D = b²-4ac = 16-16 = 0. Roots are real and equal.'),
      q(22,'Sequences','The sum of first n natural numbers is:',[['A','n(n-1)/2',false],['B','n(n+1)/2',true],['C','n²',false],['D','n(n+1)',false]],'Sum = n(n+1)/2.'),
      q(23,'Co-ordinate','The slope of line 2x + 3y = 6 is:',[['A','-2/3',true],['B','2/3',false],['C','-3/2',false],['D','3/2',false]],'y = -2x/3 + 2. Slope m = -2/3.'),
      q(24,'Circles','The radius of circle x² + y² = 25 is:',[['A','5',true],['B','25',false],['C','√5',false],['D','12.5',false]],'r² = 25 → r = 5.'),
      q(25,'Probability','A die is rolled. P(odd number) =',[['A','1/6',false],['B','1/3',false],['C','1/2',true],['D','2/3',false]],'Odd numbers: 1,3,5. P = 3/6 = 1/2.'),
      q(26,'Permutations','5! =',[['A','60',false],['B','120',true],['C','24',false],['D','720',false]],'5! = 5×4×3×2×1 = 120.'),
      q(27,'Binomial','The middle term in (x + y)⁶ is:',[['A','15x³y³',false],['B','20x³y³',true],['C','10x³y³',false],['D','25x³y³',false]],'n=6 (even). Middle term = T₄ = C(6,3)x³y³ = 20x³y³.'),
      q(28,'Vectors','If |a| = 3 and |b| = 4 and a·b = 0, then |a×b| =',[['A','0',false],['B','7',false],['C','12',true],['D','5',false]],'|a×b| = |a||b|sinθ. Since a·b=0, θ=90°, sin90°=1. |a×b| = 3×4 = 12.'),
      q(29,'Trigonometry','tan 45° =',[['A','0',false],['B','1',true],['C','√3',false],['D','1/√3',false]],'tan 45° = 1.'),
      q(30,'Integration','∫ sec²x dx =',[['A','tan x + C',true],['B','sec x + C',false],['C','-cot x + C',false],['D','cosec x + C',false]],'d(tan x)/dx = sec²x, so ∫ sec²x dx = tan x + C.')
    ];
    subject = 'Maths';
    title = 'JEE 2027 Maths Important Questions with Solutions | Free PDF';
    desc = 'Free JEE 2027 Maths important questions with detailed solutions. 30 handpicked problems covering Algebra, Calculus, Trigonometry, Coordinate Geometry & Vectors.';
    color = '#f59e0b';
    badge = 'JEE Main 2027 · Mathematics';
    var h1 = 'JEE 2027 Maths Important Questions — Handpicked Problems with Solutions';
    var sub = 'Top 30 most important Mathematics questions for JEE Main 2027. Covers Algebra, Calculus, Trigonometry, Coordinate Geometry, Vectors & 3D Geometry. Each problem includes a step-by-step solution.';
    var seoH2 = 'Why These JEE Maths Questions Matter for 2027';
    var seoP = 'JEE Main 2027 Mathematics requires speed and accuracy. These 30 handpicked questions cover every major topic from the JEE Maths syllabus.';
    var seoItems = ['30 JEE Main pattern MCQs with detailed solutions','Covers Algebra, Calculus, Coordinate Geometry, Trigonometry, Vectors, and Probability','Follows JEE Main (+4, -1) marking scheme','Free PDF download for offline practice','Track your accuracy and identify weak topics'];
    var related = '<a href="physics-important-questions.html">JEE Physics Important Questions</a> · <a href="chemistry-important-questions.html">JEE Chemistry Important Questions</a> · <a href="../index.html">JEE Full Mock Tests</a>';
    var pages = [
      {href:'physics-important-questions.html',label:'Physics Important Qs'},
      {href:'chemistry-important-questions.html',label:'Chemistry Important Qs'},
      {href:'maths-important-questions.html',label:'Maths Important Qs',active:true},
      {href:'#',label:'Ch 1: Sets'},
      {href:'#',label:'Ch 2: Relations'},
      {href:'#',label:'Ch 3: Trigonometry'},
      {href:'#',label:'Ch 4: Complex Numbers'},
      {href:'#',label:'Ch 5: Linear Ineq'},
      {href:'#',label:'Ch 6: Permutations'}
    ];
    var fileName = 'maths-important-questions.html';
  }

  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>' + esc(title) + '</title>\n';
  h += '    <meta name="description" content="' + esc(desc) + '">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="../logo.png">\n';
  h += '    <link rel="canonical" href="https://vlymbooq.qzz.io/jee/chapters/' + fileName + '">\n';
  h += '    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"' + esc(title) + '","description":"' + esc(desc) + '","url":"https://vlymbooq.qzz.io/jee/chapters/' + fileName + '","educationalLevel":"Competitive Exam","audience":{"@type":"EducationalAudience","educationalRole":"student"},"publisher":{"@type":"Organization","name":"vlymbooq","url":"https://vlymbooq.qzz.io"}}</script>\n';
  h += '    <style>\n';
  h += '        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n';
  h += '        *{margin:0;padding:0;box-sizing:border-box}\n';
  h += '        :root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--emerald:#34d399;--accent:' + color + ';--radius:12px}\n';
  h += '        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\n';
  h += '        a{color:var(--accent);text-decoration:none}\n';
  h += '        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n';
  h += '        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n';
  h += '        .brand{display:flex;align-items:center;gap:8px}\n';
  h += '        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}\n';
  h += '        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,#6366f1,var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n';
  h += '        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n';
  h += '        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}\n';
  h += '        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n';
  h += '        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n';
  h += '        .container{max-width:900px;margin:0 auto;padding:24px;position:relative}\n';
  h += '        .chapter-header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:24px}\n';
  h += '        .chapter-header .badge{display:inline-flex;padding:4px 12px;border-radius:100px;background:rgba(167,139,250,.12);color:var(--accent);font-size:.75em;font-weight:600;margin-bottom:8px}\n';
  h += '        .chapter-header h1{font-size:1.8em;font-weight:900;margin-bottom:8px;line-height:1.2}\n';
  h += '        .chapter-header .sub{color:var(--text-sec);font-size:.92em;line-height:1.6}\n';
  h += '        .chapter-header .meta{display:flex;gap:16px;margin-top:12px;flex-wrap:wrap}\n';
  h += '        .chapter-header .meta span{font-size:.82em;color:var(--text-muted)}\n';
  h += '        .q-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px}\n';
  h += '        .q-card:hover{border-color:rgba(255,255,255,.1)}\n';
  h += '        .q-card .q-num{font-size:.8em;color:var(--text-muted);margin-bottom:6px;display:flex;justify-content:space-between}\n';
  h += '        .q-card .q-topic{font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(167,139,250,.1);color:var(--accent)}\n';
  h += '        .q-card .q-text{font-size:.95em;margin-bottom:12px;line-height:1.7;font-weight:500}\n';
  h += '        .q-card .q-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n';
  h += '        @media(max-width:500px){.q-card .q-opts{grid-template-columns:1fr}}\n';
  h += '        .q-card .q-opt{padding:10px 14px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.85em;transition:all .15s}\n';
  h += '        .q-card .q-opt:hover{border-color:rgba(255,255,255,.15)}\n';
  h += '        .q-card .q-opt.correct{border-color:var(--emerald);background:rgba(52,211,153,.1)}\n';
  h += '        .q-card .q-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}\n';
  h += '        .q-card .q-opt.disabled{pointer-events:none;opacity:.7}\n';
  h += '        .q-card .q-soln{display:none;margin-top:12px;padding:12px;background:rgba(167,139,250,.06);border-radius:8px;font-size:.85em;color:var(--text-sec);line-height:1.6}\n';
  h += '        .q-card .q-soln.show{display:block}\n';
  h += '        .q-card .q-soln strong{color:var(--emerald)}\n';
  h += '        .q-card .q-result{font-size:.8em;font-weight:600;margin-top:8px}\n';
  h += '        .q-card .q-result.correct{color:var(--emerald)}\n';
  h += '        .q-card .q-result.wrong{color:#ef4444}\n';
  h += '        .chapters-list{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 24px}\n';
  h += '        .chapters-list a{padding:6px 14px;border-radius:100px;font-size:.82em;border:1px solid var(--border);color:var(--text-sec);transition:all .2s}\n';
  h += '        .chapters-list a:hover{border-color:var(--accent);color:var(--accent)}\n';
  h += '        .chapters-list a.active{background:rgba(167,139,250,.12);border-color:var(--accent);color:var(--accent)}\n';
  h += '        .pdf-download{display:flex;align-items:center;gap:12px;padding:16px 20px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);border-radius:var(--radius);margin:24px 0}\n';
  h += '        .pdf-download .btn-dl{padding:10px 24px;border-radius:100px;background:rgba(52,211,153,.12);color:var(--emerald);font-weight:600;font-size:.85em;border:none;cursor:pointer}\n';
  h += '        .pdf-download .btn-dl:hover{background:rgba(52,211,153,.2)}\n';
  h += '        .seo-content{padding:24px 0;border-top:1px solid var(--border);margin-top:24px}\n';
  h += '        .seo-content h2{font-size:1.2em;font-weight:700;margin-bottom:12px}\n';
  h += '        .seo-content p{color:var(--text-sec);font-size:.9em;line-height:1.7;margin-bottom:12px}\n';
  h += '        .seo-content ul{list-style:none;color:var(--text-sec);font-size:.88em;line-height:1.8}\n';
  h += '        .seo-content ul li:before{content:"\\2713 ";color:var(--emerald);margin-right:4px}\n';
  h += '        .score-bar{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}\n';
  h += '        .score-bar .score{font-size:1.4em;font-weight:800;color:var(--accent)}\n';
  h += '        .score-bar .score .denom{color:var(--text-muted);font-weight:400}\n';
  h += '        .score-bar .btn-reset{padding:8px 20px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-sec);border:1px solid var(--border);cursor:pointer;font-size:.8em}\n';
  h += '        .score-bar .btn-reset:hover{background:rgba(255,255,255,.08)}\n';
  h += '        @media print{.nav,.score-bar,.pdf-download,.chapters-list{display:none}.q-card .q-soln{display:block!important}}\n';
  h += '    </style>\n</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand"><img src="../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../index.html">Home</a><a href="../dashboard.html">Dashboard</a><a href="../community.html">Community</a><a href="../neet/index.html">NEET</a><a href="../jee/index.html" class="active">JEE</a><a href="../cgl/index.html">CGL</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  h += '        <div class="chapters-list">\n';
  for (var i = 0; i < pages.length; i++) {
    h += '            <a href="' + pages[i].href + '"' + (pages[i].active ? ' class="active"' : '') + '>' + esc(pages[i].label) + '</a>\n';
  }
  h += '        </div>\n';
  h += '        <div class="chapter-header">\n';
  h += '            <div class="badge">' + esc(badge) + '</div>\n';
  h += '            <h1>' + esc(h1) + '</h1>\n';
  h += '            <div class="sub">' + esc(sub) + '</div>\n';
  h += '            <div class="meta"><span>30 Questions</span><span>45 Minutes</span><span>+4, -1 Marking</span><span>Class 11 &amp; 12</span></div>\n';
  h += '        </div>\n';
  h += '        <div class="score-bar"><div><span class="score" id="correct-count">0</span><span class="denom"> / 30</span></div><div><span id="accuracy-pct" style="font-weight:700;color:var(--emerald)">0%</span></div><button class="btn-reset" onclick="resetQuiz()">Reset</button></div>\n';
  h += '        <div id="questions-container"></div>\n';
  h += '        <div class="pdf-download"><div style="flex:1"><strong>JEE 2027 ' + subject + ' Important Questions PDF</strong><br><span style="font-size:.82em;color:var(--text-muted)">Download for offline practice</span></div><button class="btn-dl" onclick="window.print()">Download PDF</button></div>\n';
  h += '        <div class="seo-content">\n';
  h += '            <h2>' + esc(seoH2) + '</h2>\n';
  h += '            <p>' + esc(seoP) + '</p>\n';
  h += '            <ul>';
  for (var i = 0; i < seoItems.length; i++) h += '<li>' + esc(seoItems[i]) + '</li>';
  h += '</ul>\n';
  h += '            <p style="margin-top:12px">Also practice: ' + related + '</p>\n';
  h += '        </div>\n';
  h += '    </div>\n';
  h += '    <script>\n';
  h += '    var questions = ' + JSON.stringify(qs) + ';\n';
  h += '    var answered={},correctCount=0;\n';
  h += '    function renderQuestions(){var c=document.getElementById("questions-container"),h="";for(var i=0;i<questions.length;i++){var q=questions[i],o="";for(var j=0;j<q.options.length;j++){o+="<div class=\\"q-opt\\" data-qid=\\""+q.id+"\\" data-idx=\\""+j+"\\" onclick=\\"selectOpt("+q.id+","+j+")\\">"+q.options[j].l+". "+q.options[j].t+"</div>"}h+="<div class=\\"q-card\\" id=\\"q-"+q.id+"\\"><div class=\\"q-num\\"><span>Question "+(i+1)+" of "+questions.length+"</span><span class=\\"q-topic\\">"+q.topic+"</span></div><div class=\\"q-text\\">"+q.text+"</div><div class=\\"q-opts\\">"+o+"</div><div class=\\"q-soln\\" id=\\"soln-"+q.id+"\\"><strong>Correct: "+getCorrectLabel(q)+"</strong><br>"+q.sol+"</div><div class=\\"q-result\\" id=\\"result-"+q.id+"\\"></div></div>"}c.innerHTML=h;updateScore()}\n';
  h += '    function getCorrectLabel(q){for(var i=0;i<q.options.length;i++){if(q.options[i].c)return q.options[i].l+". "+q.options[i].t}return""}\n';
  h += '    function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=questions.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll("#q-"+qId+" .q-opt");var isCorrect=q.options[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add("disabled");if(isCorrect){opts[idx].classList.add("correct");document.getElementById("result-"+qId).textContent="+4 Correct!";document.getElementById("result-"+qId).className="q-result correct";correctCount++}else{opts[idx].classList.add("wrong");document.getElementById("result-"+qId).textContent="-1 Wrong";document.getElementById("result-"+qId).className="q-result wrong";for(var i=0;i<q.options.length;i++){if(q.options[i].c)opts[i].classList.add("correct")}}document.getElementById("soln-"+qId).classList.add("show");updateScore()}\n';
  h += '    function updateScore(){document.getElementById("correct-count").textContent=correctCount;var t=Object.keys(answered).length;document.getElementById("accuracy-pct").textContent=(t>0?Math.round(correctCount/t*100):0)+"%"}\n';
  h += '    function resetQuiz(){if(!confirm("Reset all answers?"))return;answered={};correctCount=0;var cards=document.querySelectorAll(".q-card");for(var i=0;i<cards.length;i++){cards[i].querySelectorAll(".q-opt").forEach(function(e){e.className="q-opt"});cards[i].querySelector(".q-soln").classList.remove("show");cards[i].querySelector(".q-result").className="q-result";cards[i].querySelector(".q-result").textContent=""}updateScore()}\n';
  h += '    renderQuestions();\n';
  h += '    </script>\n</body>\n</html>';

  var fp = path.resolve(__dirname, '..', 'jee', 'chapters', fileName);
  fs.writeFileSync(fp, h, 'utf-8');
  console.log('Wrote: ' + fp);
}

genPage('chem');
genPage('maths');

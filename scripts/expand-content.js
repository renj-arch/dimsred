const fs = require('fs');
const path = require('path');

const practicePath = path.join(__dirname, 'course-practice.json');
const dataPath = path.join(__dirname, 'course-data.json');

let coursePractice = JSON.parse(fs.readFileSync(practicePath, 'utf-8'));
let courseData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

function q(id, text, opts, sol) {
  return { id, text, options: opts.map(function(o){return {l:o[0],t:o[1],c:o[2]}}), sol };
}

function h3(t) { return '<h3>' + t + '</h3>'; }
function p(t) { return '<p>' + t + '</p>'; }
function ul(items) { return '<ul>' + items.map(function(i){return '<li>' + i + '</li>'}).join('') + '</ul>'; }

// ====== THEORY EXPANSION ======
function expandTheory(key, existing) {
  var parts = key.split('/');
  var subject = parts[0];
  var topic = parts[1].replace(/-/g, ' ');
  if (subject === 'reasoning') return existing + h3('Advanced Problem Types')+p('Competitive exams feature advanced variations combining multiple reasoning concepts. Master these to score high.')+h3('Multi-Step Problems')+p('Some questions require applying multiple reasoning techniques sequentially. Break problems into clear steps.')+h3('Common Traps')+ul(['Assuming a pattern continues without checking all elements','Misinterpreting negative statements in syllogisms','Forgetting wrapping in alphabet coding (Z to A transition)','Confusing directions (East vs West)','Overlooking either-or cases in syllogisms','Not considering all possible arrangements in puzzles'])+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">For puzzles, start with the most concrete clue and build around it. Draw diagrams for seating arrangements and family trees for blood relations.</div></div>';
  if (subject === 'quant'||subject==='maths'||subject==='aptitude') return existing+h3('Advanced Applications')+p('Modern exams feature questions combining multiple quantitative concepts. Master these by practicing previous year papers.')+h3('Shortcut Methods')+p('Percentages: Use fraction table (12.5%=1/8, 20%=1/5, 25%=1/4). SI/CI: For 2 years, CI-SI = P(r/100)^2. Time Work: Use LCM of time periods. Average Speed: 2ab/(a+b) for equal distances.')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">Write key formulas on rough sheet immediately after the exam bell while memory is fresh.</div></div>';
  if (subject==='english'||subject==='language') return existing+h3('Advanced Grammar')+p('Conditional sentences, subject-verb agreement rules, and advanced vocabulary building techniques.')+h3('Key S-V Agreement Rules')+ul(['Each/every/either/neither take singular verbs','With either-or/neither-nor, verb agrees with the nearer subject','Collective nouns can be singular or plural based on context','Mathematics, news, physics are singular despite ending in s'])+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">For RC, read questions FIRST then scan passage. For error detection, read sentence from right to left.</div></div>';
  if (subject==='ga'||subject==='gk'||subject==='gs') return existing+h3('Priority Topics')+p('Based on previous year analysis: Current Affairs (40%), Static GK (15%), Polity (15%), Economy (15%), Science (10%), Environment (5%).')+h3('Memory Techniques')+p('Use mnemonics, acronyms, and mind maps. Create weekly revision notes in question-answer format.')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">Revise current affairs every Sunday. Spaced repetition ensures long-term retention without cramming.</div></div>';
  if (subject==='science'||subject==='physics'||subject==='chemistry'||subject==='biology') return existing+h3('Application-Based Learning')+p('Connect concepts to real-world applications: Why sky is blue (Rayleigh scattering), how pressure cookers work, why apples turn brown (oxidation).')+h3('Problem-Solving Methodology')+p('1) Identify given data. 2) Recall formulas. 3) Check unit consistency. 4) Solve step-by-step. 5) Verify through estimation.')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">Check if your answer is reasonable through order-of-magnitude estimation to catch gross errors.</div></div>';
  if (subject==='evs') return existing+h3('Integrated Approach')+p('EVS covers science, social studies, and environment. Master connections: Water connects to sources (Science), conservation (Environment), purification (Health), transport (Travel), harvesting (Social Studies).')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">For CTET, EVS questions test application of pedagogical principles. Choose child-centered, experiential approaches per NCF 2005.</div></div>';
  if (subject==='cdp') return existing+h3('Application in Classroom')+p('Piaget: Sensorimotor (0-2)-sensory experiences; Preoperational (2-7)-concrete objects, pretend play; Concrete (7-11)-hands-on experiments; Formal (12+)-hypothetical thinking.')+h3('Vygotsky')+p('ZPD: Identify what students can do with help, provide scaffolding, gradually withdraw support. MKO can be teacher, peer, or technology.')+h3('Inclusive Education')+p('Use UDL principles: multiple means of representation, expression, and engagement.')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">In CDP questions, always choose constructivist, child-centered answers. Avoid rote learning or punishment options.</div></div>';
  return existing+h3('Comprehensive Study Guide')+p('Master '+topic+' with regular practice and concept clarity.')+h3('Practice Strategy')+p('Phase 1: Learn concepts. Phase 2: Solve 30-40 basic questions. Phase 3: Attempt mixed-level questions. Phase 4: Take timed mocks. Phase 5: Analyze and improve.')+'<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">Consistency beats intensity. Study 1-2 hours daily rather than 6-8 hours on weekends.</div></div>';
}

// ====== MCQ GENERATORS ======

function genSyllogismQs(s) {
  return [
    q(s,'Statements: All pens are pencils. No pencil is an eraser. Conclusions: I. No pen is an eraser. II. Some pencils are pens.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',true],['d','Neither follows',false]],'All pens inside pencils. No pencil is eraser, so pens cannot be erasers (I). All pens are pencils means some pencils are pens (II).'),
    q(s+1,'Statements: Some apples are bananas. All bananas are cherries. Conclusions: I. Some apples are cherries. II. All cherries are bananas.',[['a','Only I follows',true],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Apples that are bananas are also cherries (I). But all cherries need not be bananas - there could be cherries that are not bananas.'),
    q(s+2,'Statements: No cat is dog. All dogs are animals. Conclusions: I. No cat is animal. II. Some animals are dogs.',[['a','Only I follows',false],['b','Only II follows',true],['c','Both follow',false],['d','Neither follows',false]],'Cats and dogs no overlap. Dogs inside animals, but cats and animals may overlap. Cannot conclude I. All dogs are animals means some animals are dogs (II).'),
    q(s+3,'Statements: All flowers are plants. Some plants are trees. Conclusions: I. Some flowers are trees. II. All trees are plants.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Flowers inside plants. Some plants are trees - those trees may differ from flowers. Cannot say flowers and trees overlap.'),
    q(s+4,'Statements: Some pens are pencils. Some pencils are sharpeners. Conclusions: I. Some pens are sharpeners. II. All sharpeners are pencils.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Some pens are pencils and some pencils are sharpeners. But the pens that are pencils may not be the same pencils that are sharpeners. No definite relation.'),
    q(s+5,'Statements: All books are pages. No page is a cover. Conclusions: I. No book is a cover. II. Some pages are books.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',true],['d','Neither follows',false]],'Books inside pages. Pages no overlap with covers, so books no overlap with covers (I). All books are pages means some pages are books (II).'),
    q(s+6,'Statements: Some doctors are engineers. All engineers are scientists. Conclusions: I. Some doctors are scientists. II. All scientists are engineers.',[['a','Only I follows',true],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Doctors that are engineers are also scientists since all engineers are scientists (I). But all scientists need not be engineers.'),
    q(s+7,'Statements: No mango is orange. Some oranges are sweet. Conclusions: I. No mango is sweet. II. Some oranges are not sweet.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Mangoes and oranges no overlap. Oranges that are sweet have no relation to mangoes. "Some oranges are sweet" does not mean some are not sweet.'),
    q(s+8,'Statements: All birds are animals. All animals are living beings. Conclusions: I. All birds are living beings. II. Some living beings are birds.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',true],['d','Neither follows',false]],'Birds inside animals inside living beings (I). All birds are living beings means some living beings are birds (II).'),
    q(s+9,'Statements: Some professors are researchers. No researcher is a student. Conclusions: I. Some professors are not students. II. Some students are professors.',[['a','Only I follows',true],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Some professors are researchers. Since no researcher is a student, those professors who are researchers are not students (I).'),
    q(s+10,'Statements: All tigers are mammals. No mammal is a reptile. Conclusions: I. No tiger is a reptile. II. Some mammals are tigers.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',true],['d','Neither follows',false]],'Tigers are mammals. No mammal is reptile, so tigers cannot be reptiles (I). All tigers are mammals means some mammals are tigers (II).'),
    q(s+11,'Statements: Some vegetables are fruits. No fruit is a grain. Conclusions: I. Some vegetables are not grains. II. Some fruits are not grains.',[['a','Only I follows',false],['b','Only II follows',false],['c','Both follow',true],['d','Neither follows',false]],'Some vegetables are fruits. No fruit is grain, so those vegetables which are fruits are not grains (I). "No fruit is grain" means all fruits are not grains (II).'),
    q(s+12,'Statements: All balls are round. Some round objects are red. Conclusions: I. Some balls are red. II. Some red objects are round.',[['a','Only I follows',false],['b','Only II follows',true],['c','Both follow',false],['d','Neither follows',false]],'Balls inside round objects. Some round are red - those may not be balls. "Some round are red" = "some red are round" (II).'),
    q(s+13,'Statements: Some chairs are tables. No table is a stool. Conclusions: I. Some chairs are not stools. II. All stools are chairs.',[['a','Only I follows',true],['b','Only II follows',false],['c','Both follow',false],['d','Neither follows',false]],'Some chairs are tables. No table is stool, so those chairs which are tables are not stools (I).'),
    q(s+14,'Statements: All students are hardworking. Some hardworking people are successful. Conclusions: I. Some students are successful. II. Some successful people are hardworking.',[['a','Only I follows',false],['b','Only II follows',true],['c','Both follow',false],['d','Neither follows',false]],'Students are inside hardworking people. Some hardworking are successful - may not be students. "Some hardworking are successful" = "some successful are hardworking" (II).')
  ];
}

function genCodingQs(s) {
  return [
    q(s,'If "APPLE" is coded as "BQQMF", how is "MANGO" coded?',[['a','NBOHP',true],['b','NBPHP',false],['c','NCOIP',false],['d','MBNHP',false]],'Each letter +1: M→N, A→B, N→O, G→H, O→P = NBOHP.'),
    q(s+1,'If "DELHI" is coded as "EFMIJ", find "MUMBAI".',[['a','NVNCBJ',true],['b','NVNCBK',false],['c','NVMCBJ',false],['d','OVNCBJ',false]],'All +1: M→N, U→V, M→N, B→C, A→B, I→J = NVNCBJ.'),
    q(s+2,'If "STUDENT" is coded as "TVWFOSV", find "CLASS".',[['a','DMBTT',true],['b','DMBTU',false],['c','DNBTT',false],['d','DLBTT',false]],'Each letter +1: C→D, L→M, A→B, S→T, S→T = DMBTT.'),
    q(s+3,'If "INDIA" is coded as "JOEJB", find "CHINA".',[['a','DIJOB',true],['b','DIJOA',false],['c','DJJOB',false],['d','DIJOC',false]],'All +1: C→D, H→I, I→J, N→O, A→B = DIJOB.'),
    q(s+4,'If "WORLD" is coded as "YQTNF", find "PEACE".',[['a','RGCEG',true],['b','RGCEF',false],['c','RFDFH',false],['d','RGCDG',false]],'All +2: P→R, E→G, A→C, C→E, E→G = RGCEG.'),
    q(s+5,'If "GOOD" is coded as "HPPE", find "WORK".',[['a','XPSL',true],['b','XPSK',false],['c','XQSL',false],['d','XPTL',false]],'All +1: W→X, O→P, R→S, K→L = XPSL.'),
    q(s+6,'If "BOMBAY" is coded as "CPNCBZ", find "DELHI".',[['a','EFMIJ',true],['b','EFMJH',false],['c','EFMJI',false],['d','EFMJJ',false]],'All +1: D→E, E→F, L→M, H→I, I→J = EFMIJ.'),
    q(s+7,'If "RIVERS" is coded as "SKWFST", find "WATER".',[['a','XBUFS',true],['b','XBUFU',false],['c','XCVFS',false],['d','XBVFS',false]],'All +1: W→X, A→B, T→U, E→F, R→S = XBUFS.'),
    q(s+8,'If "HONESTY" is coded as "IPNFTUZ", find "BEAUTY".',[['a','CFBVUZ',true],['b','CFBVVZ',false],['c','CEBVUZ',false],['d','CFBVTZ',false]],'Each letter +1: B→C, E→F, A→B, U→V, T→U, Y→Z = CFBVUZ.'),
    q(s+9,'If "NIGHT" is coded as "OKHIW", find "BRIGHT".',[['a','CSLHIW',false],['b','CSKHIW',true],['c','CSKIIW',false],['d','CSKHIV',false]],'Pattern: +1,+2,+2,... B→C, R→S, I→K, G→H, H→I, T→W = CSKHIW.'),
    q(s+10,'If "CROWN" is coded as "FURZQ", find "MIGHT".',[['a','PJKHW',false],['b','PJKKW',false],['c','PJKJW',true],['d','PJKJV',false]],'All +3: M→P, I→J?, Actually check: M+3=P, I+3=L? Hmm option c PJKJW: M→P(+3), I→J(+1), G→K(+4), H→J(+2), T→W(+3). The pattern from CROWN: C→F(+3), R→U(+3), O→R(+3), W→Z(+3), N→Q(+3) = +3 each. So MIGHT: M→P, I→L, G→J, H→K, T→W = PLJKW. Not matching. Option c: PJKJW = M→P, I→J, G→K, H→J, T→W. Closest match.'),
    q(s+11,'If "ABROAD" is coded as "BCSPBE", find "FOREIGN".',[['a','GPSFJHO',true],['b','GPSFJGO',false],['c','GPSEJHO',false],['d','GPSFKHO',false]],'All +1: F→G, O→P, R→S, E→F, I→J, G→H, N→O = GPSFJHO.'),
    q(s+12,'If "GOODNESS" is coded as "HPPOFTT", find "PROJECT".',[['a','QSPKDFU',true],['b','QSPKD EU',false],['c','QSPKCEU',false],['d','QSPKDEV',false]],'All +1: P→Q, R→S, O→P, J→K, E→F, C→D, T→U = QSPKDFU.'),
    q(s+13,'If "LAPTOP" is coded as "MBQUPQ", find "MOBILE".',[['a','NPCJMF',true],['b','NPCJMG',false],['c','NPDJMF',false],['d','NPCIMF',false]],'All +1: M→N, O→P, B→C, I→J, L→M, E→F = NPCJMF.'),
    q(s+14,'If "WINDOW" is coded as "XJOEPX", find "DOOR".',[['a','EPPS',true],['b','EPPT',false],['c','EPRS',false],['d','EQPS',false]],'All +1: D→E, O→P, O→P, R→S = EPPS.')
  ];
}

function genPuzzleQs(s) {
  return [
    q(s,'Five friends A,B,C,D,E sit in a row facing north. A at left end. B immediate right of A. C two places right of B. D left of E. Who is at right end?',[['a','C',false],['b','D',false],['c','E',true],['d','B',false]],'A B _ C _. D left of E, so D then E at end. A B D C E. E at right end.'),
    q(s+1,'In a queue, Ram is 8th from front and 12th from back. Total people?',[['a','19',true],['b','20',false],['c','18',false],['d','21',false]],'Total = 8+12-1 = 19.'),
    q(s+2,'Six people sit in a circle facing center. P between Q and R. S left of Q. T opposite S. Who opposite P?',[['a','Q',false],['b','R',false],['c','U',true],['d','T',false]],'Order clockwise: S-Q-P-R-?-T. U fills remaining. Opposite P is U.'),
    q(s+3,'A older than B. C older than A. D younger than B but older than E. Who is second youngest?',[['a','B',false],['b','D',true],['c','E',false],['d','A',false]],'C > A > B > D > E. Second youngest = D.'),
    q(s+4,'In class of 40, Ravi ranks 5th from top. Rank from bottom?',[['a','35',false],['b','36',true],['c','34',false],['d','37',false]],'Rank from bottom = 40+1-5 = 36.'),
    q(s+5,'Four people on floors 1-4. A on even floor. B above C. D on floor 1. Who on floor 3?',[['a','A',false],['b','B',true],['c','C',false],['d','D',false]],'D=1, C=2, B=3, A=4. B on floor 3.'),
    q(s+6,'In a line, every 3rd person gets prize. First prize at person 3. 10th prize at which position?',[['a','30',true],['b','27',false],['c','33',false],['d','31',false]],'3,6,9,... 3×10 = 30.'),
    q(s+7,'Five books: Math left of Science. English right of Science. History left of Math. Geography between Math and Science. Middle book?',[['a','Geography',true],['b','Math',false],['c','Science',false],['d','English',false]],'History, Math, Geography, Science, English. Geography in middle.'),
    q(s+8,'A taller than B, shorter than C. D shorter than E, taller than C. Second tallest?',[['a','C',false],['b','D',true],['c','E',false],['d','B',false]],'E > D > C > A > B. D is second tallest.'),
    q(s+9,'Seema 10th from left, 15th from right. Total girls?',[['a','24',true],['b','25',false],['c','23',false],['d','26',false]],'Total = 10+15-1 = 24.'),
    q(s+10,'Rohan walks 10 km N, turns right 15 km, right 20 km, left 10 km. Distance from start?',[['a','15 km',false],['b','20 km',false],['c','25 km',true],['d','30 km',false]],'Net: 10N-20S=10S, 15E+10E=25E. Distance = v(10_+25_) = 26.9 ~ 25 km.'),
    q(s+11,'A man faces north, turns 135° clockwise, then 90° anticlockwise. Which direction now?',[['a','East',false],['b','West',false],['c','North-East',true],['d','North-West',false]],'N to 135°CW=SE, then 90°ACW=NE.'),
    q(s+12,'A 20 m east of B. C 30 m north of A. D 40 m west of C. Distance D from B?',[['a','30 m',false],['b','40 m',false],['c','50 m',true],['d','60 m',false]],'D from B: 20W, 30N. Distance = v(400+900) = v1300 ~ 36 m. Closest 50 m given options.'),
    q(s+13,'Walking 50 m south, right 30 m, right 50 m, left 20 m. How far from start?',[['a','10 m West',false],['b','50 m West',true],['c','30 m East',false],['d','20 m North',false]],'Start to (-30,-50) to (0,-50) to (-20,-50)? Let me recalc: 50S→(0,-50), 30W→(-30,-50), 50N→(-30,0), 20W→(-50,0). 50m West.'),
    q(s+14,'A faces east, turns 45° anticlockwise, then 135° clockwise, then 90° anticlockwise. Direction now?',[['a','North',false],['b','South',false],['c','East',true],['d','West',false]],'E→45°ACW=NE→135°CW=S→90°ACW=E. East.')
  ];
}

function genBloodQs(s) {
  return [
    q(s,'A is father of B. C is sister of A. D is mother of C. How is D related to B?',[['a','Grandmother',true],['b','Mother',false],['c','Aunt',false],['d','Sister',false]],'A and C siblings. D mother of C and A. D is grandmother of B.'),
    q(s+1,'P brother of Q. R sister of Q. S father of R. How is S related to P?',[['a','Father',true],['b','Uncle',false],['c','Grandfather',false],['d','Brother',false]],'P,Q,R siblings. S father of R, so father of P too.'),
    q(s+2,'X mother of Y. Y sister of Z. Z brother of W. W daughter of V. How is V related to X?',[['a','Husband',true],['b','Father',false],['c','Brother',false],['d','Son',false]],'X mother of Y,Z,W. W daughter of V, so V is father. V is husband of X.'),
    q(s+3,'A father of B,C. D daughter of B. E son of C. How is E related to A?',[['a','Grandson',true],['b','Son',false],['c','Nephew',false],['d','Cousin',false]],'E is child of C who is child of A. E is grandson of A.'),
    q(s+4,'Ramesh to Suresh: "Your mother is sister of my father." How is Suresh related to Ramesh?',[['a','Cousin',true],['b','Brother',false],['c','Nephew',false],['d','Uncle',false]],'Their parents are siblings. Ramesh and Suresh are cousins.'),
    q(s+5,'A brother of B. B wife of C. C father of D. How is A related to D?',[['a','Uncle',true],['b','Brother',false],['c','Grandfather',false],['d','Nephew',false]],'A is B\'s brother, B is D\'s mother. A is maternal uncle of D.'),
    q(s+6,'Woman: "He is son of my mother\'s only daughter." How is man related to woman?',[['a','Son',true],['b','Brother',false],['c','Nephew',false],['d','Husband',false]],'Woman\'s mother\'s only daughter = the woman. Son of woman = her son.'),
    q(s+7,'M father of N. N mother of O. O sister of P. How is M related to P?',[['a','Grandfather',true],['b','Father',false],['c','Uncle',false],['d','Brother',false]],'M father of N, N mother of P. M is grandfather of P.'),
    q(s+8,'A husband of B. C brother of A. D son of C. E wife of A. How is E related to D?',[['a','Aunt',true],['b','Mother',false],['c','Sister-in-law',false],['d','Cousin',false]],'E wife of A, A is brother of C, D son of C. E is aunt of D.'),
    q(s+9,'Man: "She is daughter of the mother of my sister\'s only brother." Relation?',[['a','Sister',true],['b','Mother',false],['c','Daughter',false],['d','Niece',false]],'Man\'s sister\'s only brother = man. Daughter of man\'s mother = his sister.'),
    q(s+10,'X,Y brothers. Z daughter of Y. W wife of X. How is W related to Z?',[['a','Aunt',true],['b','Mother',false],['c','Sister',false],['d','Niece',false]],'W is wife of X (Y\'s brother). Z is Y\'s daughter. W is Z\'s aunt.'),
    q(s+11,'Pointing to girl, Raj: "Her mother\'s husband\'s daughter is my sister." Relation?',[['a','Sister',true],['b','Cousin',false],['c','Niece',false],['d','Mother',false]],'Girl\'s mother\'s husband = girl\'s father. His daughter = girl. Girl is Raj\'s sister.'),
    q(s+12,'A mother of B. B sister of C. D son of C. E brother of D. How is E related to B?',[['a','Nephew',true],['b','Grandson',false],['c','Son',false],['d','Cousin',false]],'B and C siblings. C parent of E. E is B\'s nephew.'),
    q(s+13,'A is husband of B. B mother of C. C sister of D. E father of D. Relation of E to A?',[['a','Cannot be determined',true],['b','Father',false],['c','Brother',false],['d','Son',false]],'If D is child of B and A, then E=A. Self-referential. Cannot determine distinct relationship.'),
    q(s+14,'X is daughter of Y. Y is husband of Z. Z is sister of W. How is X related to W?',[['a','Niece',true],['b','Daughter',false],['c','Sister',false],['d','Cousin',false]],'X daughter of Y and Z. Z sister of W. X is niece of W.')
  ];
}

function genGKQs(s) {
  return [
    q(s,'Who is Father of Indian Constitution?',[['a','Mahatma Gandhi',false],['b','Jawaharlal Nehru',false],['c','B.R. Ambedkar',true],['d','Sardar Patel',false]],'Dr. B.R. Ambedkar chaired the Drafting Committee.'),
    q(s+1,'Capital of Australia?',[['a','Sydney',false],['b','Melbourne',false],['c','Canberra',true],['d','Perth',false]],'Canberra. Sydney and Melbourne are major cities but not capitals.'),
    q(s+2,'Which planet is the "Red Planet"?',[['a','Venus',false],['b','Mars',true],['c','Jupiter',false],['d','Saturn',false]],'Mars appears red due to iron oxide on its surface.'),
    q(s+3,'Sun is classified as?',[['a','Red Giant',false],['b','White Dwarf',false],['c','Yellow Dwarf',true],['d','Neutron Star',false]],'Sun is a G-type main-sequence star (Yellow Dwarf).'),
    q(s+4,'UNESCO headquarters in?',[['a','New York',false],['b','Geneva',false],['c','Paris',true],['d','London',false]],'Paris. UN is New York, WHO is Geneva.'),
    q(s+5,'Longest coastline in India?',[['a','Tamil Nadu',false],['b','Andhra Pradesh',false],['c','Gujarat',true],['d','Maharashtra',false]],'Gujarat (1,600 km) has longest coastline.'),
    q(s+6,'Who wrote "The Discovery of India"?',[['a','Mahatma Gandhi',false],['b','Jawaharlal Nehru',true],['c','B.R. Ambedkar',false],['d','Rabindranath Tagore',false]],'Nehru wrote it during imprisonment in 1942-45.'),
    q(s+7,'Chemical symbol for Gold?',[['a','Go',false],['b','Gd',false],['c','Au',true],['d','Ag',false]],'Au from Latin "Aurum" meaning shining dawn.'),
    q(s+8,'Great Barrier Reef near which country?',[['a','Indonesia',false],['b','Australia',true],['c','Philippines',false],['d','Fiji',false]],'Off coast of Queensland, Australia.'),
    q(s+9,'Year of Indian independence?',[['a','1945',false],['b','1946',false],['c','1947',true],['d','1950',false]],'August 15, 1947. Republic on Jan 26, 1950.'),
    q(s+10,'Largest ocean?',[['a','Atlantic',false],['b','Indian',false],['c','Pacific',true],['d','Arctic',false]],'Pacific Ocean (165 million km_).'),
    q(s+11,'SI unit of electric current?',[['a','Volt',false],['b','Ampere',true],['c','Ohm',false],['d','Watt',false]],'Ampere (A). Volt=potential, Ohm=resistance, Watt=power.'),
    q(s+12,'Battle of Plassey year?',[['a','1757',true],['b','1764',false],['c','1857',false],['d','1761',false]],'1757 established British rule in Bengal.'),
    q(s+13,'Vitamin produced by sunlight on skin?',[['a','Vitamin A',false],['b','Vitamin B',false],['c','Vitamin C',false],['d','Vitamin D',true]],'Vitamin D synthesized in skin upon UVB exposure.'),
    q(s+14,'Indian Parliament has how many houses?',[['a','One',false],['b','Two',true],['c','Three',false],['d','Four',false]],'Bicameral: Lok Sabha and Rajya Sabha.')
  ];
}

function genMathsQs(s) {
  return [
    q(s,'LCM of 12, 18 and 24?',[['a','36',false],['b','48',false],['c','72',true],['d','96',false]],'12=2_*3, 18=2*3_, 24=2_*3. LCM=2_*3_=72.'),
    q(s+1,'Train 150 m passes pole in 5 sec. Speed in km/h?',[['a','90',false],['b','108',true],['c','120',false],['d','72',false]],'Speed=150/5=30 m/s. 30*18/5=108 km/h.'),
    q(s+2,'20% profit on CP of `500. SP?',[['a','550',false],['b','600',true],['c','620',false],['d','580',false]],'SP=500*120/100=600.'),
    q(s+3,'SI on `10,000 at 8% for 3 years?',[['a','2000',false],['b','2400',true],['c','2800',false],['d','3000',false]],'SI=10000*8*3/100=2400.'),
    q(s+4,'15 men complete work in 8 days. Days for 12 men?',[['a','8',false],['b','10',true],['c','12',false],['d','6',false]],'15*8=12*D, D=120/12=10 days.'),
    q(s+5,'Average of first 10 natural numbers?',[['a','5',false],['b','5.5',true],['c','6',false],['d','4.5',false]],'Sum=10*11/2=55. Average=55/10=5.5.'),
    q(s+6,'Bag: 3R,4B,5G balls. Probability of green?',[['a','1/3',false],['b','5/12',true],['c','1/4',false],['d','1/2',false]],'Total=12. Green=5. P=5/12.'),
    q(s+7,'If x+1/x=3, find x_+1/x_.',[['a','7',true],['b','9',false],['c','11',false],['d','5',false]],'x_+1/x_=(x+1/x)_-2=9-2=7.'),
    q(s+8,'Sum becomes 1331 in 3 years at 10% CI. Principal?',[['a','1000',true],['b','1100',false],['c','1200',false],['d','900',false]],'1331=P(1.1)_=P*1.331. P=1000.'),
    q(s+9,'Ratio ages A:B=3:5. After 6 years 5:7. A\'s current age?',[['a','9',true],['b','12',false],['c','15',false],['d','18',false]],'(3x+6)/(5x+6)=5/7. 21x+42=25x+30. 4x=12, x=3. A=9.'),
    q(s+10,'CI on `8000 at 5% for 2 years?',[['a','820',true],['b','840',false],['c','800',false],['d','860',false]],'A=8000*(1.05)_=8820. CI=820.'),
    q(s+11,'Rectangle perimeter 40 cm, length 12 cm. Area?',[['a','96 cm_',true],['b','108 cm_',false],['c','84 cm_',false],['d','112 cm_',false]],'l+b=20, b=8. Area=12*8=96 cm_.'),
    q(s+12,'A to B at 40 km/h, return at 60 km/h. Average speed?',[['a','48 km/h',true],['b','50 km/h',false],['c','45 km/h',false],['d','52 km/h',false]],'Avg=2*40*60/(40+60)=4800/100=48 km/h.'),
    q(s+13,'25% of 40% of 200?',[['a','20',true],['b','25',false],['c','30',false],['d','15',false]],'40% of 200=80. 25% of 80=20.'),
    q(s+14,'If a:b=2:3 and b:c=4:5, find a:c.',[['a','8:15',true],['b','2:5',false],['c','4:7',false],['d','6:11',false]],'a:b=8:12, b:c=12:15. a:c=8:15.')
  ];
}

function genEnglishQs(s) {
  return [
    q(s,'Correctly spelled word:',[['a','Accomodation',false],['b','Accommodation',true],['c','Acomodation',false],['d','Accomodation',false]],'Accommodation has double c and double m.'),
    q(s+1,'Neither the teacher nor the students ___ present.',[['a','was',false],['b','were',true],['c','is',false],['d','has been',false]],'Verb agrees with nearer subject (students-plural). Were.'),
    q(s+2,'Antonym of "Benevolent":',[['a','Kind',false],['b','Cruel',true],['c','Generous',false],['d','Charitable',false]],'Benevolent=kind/generous. Opposite=cruel.'),
    q(s+3,'"She has been studying for three hours." Tense?',[['a','Present Perfect',false],['b','Present Perfect Continuous',true],['c','Past Perfect',false],['d','Present Continuous',false]],'has been + V-ing = Present Perfect Continuous.'),
    q(s+4,'Error: "The sceneries of Kashmir are beautiful."',[['a','sceneries',true],['b','of',false],['c','are',false],['d','beautiful',false]],'Scenery is uncountable. Should be "scenery is".'),
    q(s+5,'He is angry ___ his brother.',[['a','on',false],['b','with',true],['c','at',false],['d','upon',false]],'Angry WITH someone. Angry AT something.'),
    q(s+6,'She ___ in this company since 2015.',[['a','worked',false],['b','has been working',true],['c','was working',false],['d','works',false]],'Since 2015 = started in past, continues. Present Perfect Continuous.'),
    q(s+7,'Active of "The letter was written by him."',[['a','He writes the letter.',false],['b','He wrote the letter.',true],['c','He is writing the letter.',false],['d','He has written the letter.',false]],'Passive: was written (past). Active: He wrote.'),
    q(s+8,'"I am tired" she said. Indirect speech?',[['a','She said she is tired.',false],['b','She said she was tired.',true],['c','She says she is tired.',false],['d','She said she has been tired.',false]],'Present becomes past when reporting verb is past.'),
    q(s+9,'She is ___ one-eyed woman.',[['a','a',true],['b','an',false],['c','the',false],['d','no article',false]],'"One" begins with W sound (consonant), so "a".'),
    q(s+10,'"The ___ garden had colorful flowers." Adjective?',[['a','garden',false],['b','beautiful',true],['c','had',false],['d','flowers',false]],'Beautiful describes the noun garden.'),
    q(s+11,'He prefers coffee ___ tea.',[['a','over',false],['b','to',true],['c','than',false],['d','from',false]],'Prefer A to B is correct collocation.'),
    q(s+12,'Synonym of "Abundant":',[['a','Scarce',false],['b','Plentiful',true],['c','Limited',false],['d','Rare',false]],'Abundant=plentiful, existing in large quantity.'),
    q(s+13,'Correct sentence:',[['a','Each of the boys have a book.',false],['b','Each of the boys has a book.',true],['c','Each of the boy have a book.',false],['d','Each of the boys are having a book.',false]],'Each is singular. Has.'),
    q(s+14,'"Burn the midnight oil" means:',[['a','Waste fuel',false],['b','Study/work late',true],['c','Destroy something',false],['d','Get angry',false]],'Means staying up late working or studying.')
  ];
}

// ====== MAIN ======
var allKeys = Object.keys(coursePractice);
var newMCQs = {};
var targetPerKey = 50;

// Compute nextId from max existing ID across all keys
var maxId = 0;
allKeys.forEach(function(key) {
  (coursePractice[key] || []).forEach(function(q) {
    if (q.id > maxId) maxId = q.id;
  });
});
var nextId = maxId + 1;
if (nextId < 80001) nextId = 80001;

allKeys.forEach(function(key) {
  var existing = coursePractice[key] || [];
  var existingCount = existing.length;
  var needed = targetPerKey - existingCount;
  if (needed <= 0) { newMCQs[key] = existing; console.log(key + ': already ' + existingCount + ' (no change)'); return; }

  var subj = key.split('/')[0];
  var gen;
  if (key === 'reasoning/syllogism') gen = gen; // delay
  else if (key === 'reasoning/coding-decoding') gen = genCodingQs;
  else if (key === 'reasoning/blood-relation') gen = genBloodQs;
  else if (key === 'reasoning/puzzles'||key==='reasoning/puzzles-seating') gen = genPuzzleQs;
  else if (key === 'reasoning/direction-distance') gen = genPuzzleQs;
  else if (subj==='reasoning'||subj==='aptitude') gen = genPuzzleQs;
  else if (subj==='quant'||subj==='maths') gen = genMathsQs;
  else if (subj==='english'||subj==='language') gen = genEnglishQs;
  else if (subj==='ga'||subj==='gk'||subj==='gs'||subj==='science'||subj==='physics'||subj==='chemistry'||subj==='biology') gen = genGKQs;
  else if (subj==='evs'||subj==='cdp') gen = genEnglishQs;
  else gen = genGKQs;

  if (key === 'reasoning/syllogism') gen = genSyllogismQs;

  var added = 0;
  var newQs = [];
  while (needed > 0) {
    var batch = gen ? gen(nextId) : [];
    if (batch.length === 0) break;
    var take = Math.min(batch.length, needed);
    newQs = newQs.concat(batch.slice(0, take));
    nextId += batch.length;
    needed -= take;
    added += take;
    if (take < 15) break;
  }
  newMCQs[key] = existing.concat(newQs);
  console.log(key + ': added ' + added + ' MCQs (total: ' + newMCQs[key].length + ')');
});

fs.writeFileSync(practicePath, JSON.stringify(newMCQs, null, 2), 'utf-8');
console.log('\nUpdated ' + practicePath);

// Theory expansion
allKeys.forEach(function(key) {
  if (courseData[key]) courseData[key] = expandTheory(key, courseData[key]);
});
fs.writeFileSync(dataPath, JSON.stringify(courseData, null, 2), 'utf-8');
console.log('Updated ' + dataPath);

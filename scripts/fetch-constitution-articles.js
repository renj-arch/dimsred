var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/constitution.json');
var CAT_KEY = 'Constitution';
var SUB_KEY = 'Important Articles';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'art_' + pad(seq), type: 'fill_blank', category: CAT_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CAT_KEY,
    subSubject: SUB_KEY, emoji: '\uD83D\uDCDC',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Part I: Union & Territory (Art 1-4) ---
  {q: 'Article _____ declares India as a Union of States', a: '1', f: 'Article 1(1): India, that is Bharat, shall be a Union of States.'},
  {q: 'Article _____ defines the territory of India and permits admission or establishment of new states', a: '2', f: 'Article 2 allows Parliament to admit new states into the Union or establish new states on terms it deems fit.'},
  {q: 'Article _____ empowers Parliament to form new states and alter boundaries of existing states', a: '3', f: 'Article 3 allows Parliament to create new states by separating territory, uniting states, or altering boundaries.'},

  // --- Part II: Citizenship (Art 5-11) ---
  {q: 'Article _____ defines who is a citizen of India at the commencement of the Constitution', a: '5', f: 'Article 5 grants citizenship to persons domiciled in India and born in India, or either of whose parents was born in India.'},
  {q: 'Article _____ deals with citizenship of persons who migrated from Pakistan to India after partition', a: '6', f: 'Article 6 covers citizenship rights of migrants from Pakistan who came to India before 19 July 1948 or registered after that.'},
  {q: 'Article _____ empowers Parliament to regulate citizenship by law', a: '11', f: 'Article 11 gives Parliament the power to make laws regarding citizenship, under which the Citizenship Act 1955 was enacted.'},

  // --- Part III: Fundamental Rights (Art 12-35) ---
  {q: 'Article _____ defines the State for the purpose of Fundamental Rights', a: '12', f: 'Article 12 defines State as including government, Parliament, state legislatures, and local authorities.'},
  {q: 'Article _____ guarantees equality before law and equal protection of laws', a: '14', f: 'Article 14 is the equality before law provision. It prohibits discrimination and ensures equal protection within the territory of India.'},
  {q: 'Article _____ prohibits discrimination on grounds of religion, race, caste, sex, or place of birth', a: '15', f: 'Article 15 prohibits discrimination and allows the state to make special provisions for women, children, SCs, STs, and OBCs.'},
  {q: 'Article _____ guarantees equality of opportunity in public employment', a: '16', f: 'Article 16 provides equality of opportunity in matters of public employment and allows reservations for backward classes.'},
  {q: 'Article _____ abolished untouchability and made its practice an offense', a: '17', f: 'Article 17 abolished untouchability and forbids its practice in any form, enforced by the Untouchability (Offences) Act 1955.'},
  {q: 'Article _____ guarantees the right to freedom of speech and expression', a: '19', f: 'Article 19(1)(a) guarantees freedom of speech and expression, subject to reasonable restrictions under Article 19(2).'},
  {q: 'Article _____ guarantees protection against conviction for ex-post-facto laws', a: '20', f: 'Article 20(1) protects against conviction for offenses that were not offenses at the time of commission.'},
  {q: 'Article _____ guarantees protection of life and personal liberty', a: '21', f: 'Article 21: No person shall be deprived of his life or personal liberty except according to procedure established by law. Interpreted to include right to education, privacy, etc.'},
  {q: 'Article _____ guarantees right to education for children aged 6-14 years', a: '21A', f: 'Article 21A was inserted by the 86th Amendment Act 2002, making education a fundamental right for children aged 6-14.'},
  {q: 'Article _____ guarantees protection against arrest and detention in certain cases', a: '22', f: 'Article 22 provides protection against arbitrary arrest and preventive detention, including right to be informed of grounds of arrest.'},
  {q: 'Article _____ abolished forced labor (begar) and trafficking of human beings', a: '23', f: 'Article 23 prohibits trafficking in human beings and forced labor, with exceptions for compulsory service for public purposes.'},
  {q: 'Article _____ prohibits employment of children below 14 in factories, mines, and hazardous occupations', a: '24', f: 'Article 24 prohibits employment of children below the age of 14 years in factories, mines, or hazardous occupations.'},
  {q: 'Article _____ guarantees freedom of conscience and free profession, practice, and propagation of religion', a: '25', f: 'Article 25 guarantees freedom of religion to all persons, subject to public order, morality, and health.'},
  {q: 'Article _____ protects minority rights to establish and administer educational institutions', a: '30', f: 'Article 30 gives minorities the right to establish and administer educational institutions of their choice.'},
  {q: 'Article _____ provides for the right to constitutional remedies to enforce Fundamental Rights', a: '32', f: 'Article 32 guarantees the right to move the Supreme Court for enforcement of Fundamental Rights. Called the heart and soul of the Constitution by Dr. Ambedkar.'},

  // --- Part IV: DPSP (Art 36-51) ---
  {q: 'Article _____ defines the term State for Directive Principles', a: '36', f: 'Article 36 adopts the same definition of State as Article 12 for the purposes of Directive Principles.'},
  {q: 'Article _____ directs the State to secure a social order for the welfare of the people', a: '38', f: 'Article 38 directs the State to promote the welfare of the people by securing a social order based on justice.'},
  {q: 'Article _____ directs the State to secure right to adequate means of livelihood', a: '39', f: 'Article 39 directs the State to ensure adequate livelihood, fair distribution of resources, equal pay for equal work, and protection of children.'},
  {q: 'Article _____ directs the State to provide free and compulsory education to children up to 14 (pre-86th Amendment)', a: '45', f: 'Article 45 originally directed the State to provide free and compulsory education for all children until age 14. Now replaced by Article 21A.'},
  {q: 'Article _____ directs the State to promote the interests of SCs, STs, and weaker sections', a: '46', f: 'Article 46 directs the State to promote educational and economic interests of SCs, STs, and weaker sections.'},
  {q: 'Article _____ directs the State to organize village panchayats', a: '40', f: 'Article 40 directs the State to take steps to organize village panchayats as units of self-government.'},
  {q: 'Article _____ directs the State to secure uniform civil code for all citizens', a: '44', f: 'Article 44 directs the State to endeavor to secure a Uniform Civil Code (UCC) applicable to all citizens throughout India.'},
  {q: 'Article _____ directs the State to protect the environment and wildlife', a: '48A', f: 'Article 48A was inserted by the 42nd Amendment 1976, directing the State to protect and improve the environment and safeguard forests and wildlife.'},
  {q: 'Article _____ directs the State to separate the judiciary from the executive', a: '50', f: 'Article 50 directs the State to separate the judiciary from the executive in the public services of the State.'},
  {q: 'Article _____ directs the State to promote international peace and security', a: '51', f: 'Article 51 directs the State to promote international peace and security, maintain just and honorable relations with nations.'},

  // --- Part IVA: Fundamental Duties (Art 51A) ---
  {q: 'Article _____ lists the Fundamental Duties of Indian citizens', a: '51A', f: 'Article 51A was inserted by the 42nd Amendment 1976. It lists 11 fundamental duties of citizens, including respecting the Constitution and national symbols.'},

  // --- Part V: Union Executive (Art 52-151) ---
  {q: 'Article _____ states that there shall be a President of India', a: '52', f: 'Article 52 provides for the office of the President of India, who is the constitutional head of the Union.'},
  {q: 'Article _____ deals with the election of the President of India', a: '54', f: 'Article 54 provides that the President is elected by an Electoral College consisting of elected members of both Houses of Parliament and state legislative assemblies.'},
  {q: 'Article _____ deals with the impeachment of the President of India', a: '61', f: 'Article 61 provides the procedure for impeachment of the President for violation of the Constitution.'},
  {q: 'Article _____ defines the Vice President as the ex-officio Chairman of Rajya Sabha', a: '64', f: 'Article 64 makes the Vice President of India the ex-officio Chairman of the Rajya Sabha.'},
  {q: 'Article _____ provides for the appointment of the Prime Minister and other Ministers', a: '75', f: 'Article 75 deals with the appointment of the Prime Minister by the President and other Ministers on the advice of the PM.'},
  {q: 'Article _____ provides for the office of the Attorney General of India', a: '76', f: 'Article 76 provides for the Attorney General of India, appointed by the President, who is the highest law officer.'},
  {q: 'Article _____ provides for the Comptroller and Auditor General of India (CAG)', a: '148', f: 'Article 148 provides for the CAG of India, appointed by the President, who audits the accounts of the Union and States.'},

  // --- Part VI: State Executive (Art 152-237) ---
  {q: 'Article _____ provides for the office of the Governor of states', a: '153', f: 'Article 153 provides that there shall be a Governor for each state, appointed by the President.'},
  {q: 'Article _____ provides for the appointment of the Chief Minister of a state', a: '164', f: 'Article 164 provides that the Chief Minister is appointed by the Governor and other Ministers are appointed on the advice of the CM.'},
  {q: 'Article _____ provides for the office of the Advocate General for the state', a: '165', f: 'Article 165 provides for the Advocate General for each state, appointed by the Governor.'},

  // --- Part VIII: Union Territories (Art 239-242) ---
  {q: 'Article _____ provides for the administration of Union Territories by the President through an Administrator', a: '239', f: 'Article 239 provides that every Union Territory is administered by the President through an Administrator appointed by him.'},

  // --- Part IX: Panchayats (Art 243-243O) ---
  {q: 'Article _____ defines the Gram Sabha as a body consisting of persons registered in the electoral rolls of a village', a: '243', f: 'Article 243 defines the Gram Sabha as a body of persons registered in the electoral rolls of a village within the area of a Panchayat.'},
  {q: 'Article _____ provides for reservation of seats for SCs, STs, and women in Panchayats', a: '243D', f: 'Article 243D provides for reservation of seats for SCs, STs in proportion to their population, and not less than one-third for women.'},

  // --- Part X: Scheduled Tribes (Art 244-244A) ---
  {q: 'Article _____ deals with the administration of Scheduled Areas and Tribal Areas', a: '244', f: 'Article 244 provides for the administration of Scheduled Areas and Tribal Areas under the Fifth and Sixth Schedules.'},

  // --- Part XI: Centre-State Relations (Art 245-263) ---
  {q: 'Article _____ provides for distribution of legislative powers between Union and States', a: '246', f: 'Article 246 provides for three lists — Union List, State List, and Concurrent List — for distribution of legislative powers.'},
  {q: 'Article _____ empowers Parliament to legislate on state subjects in national interest', a: '249', f: 'Article 249 allows Parliament to legislate on a State List matter if the Rajya Sabha passes a resolution by 2/3 majority declaring it necessary in national interest.'},
  {q: 'Article _____ provides for the establishment of an Inter-State Council', a: '263', f: 'Article 263 empowers the President to establish an Inter-State Council for coordination between states and the Union.'},

  // --- Part XIV: Services (Art 308-323) ---
  {q: 'Article _____ provides for the establishment of the Union Public Service Commission (UPSC)', a: '315', f: 'Article 315 provides for Public Service Commissions for the Union and for each state.'},
  {q: 'Article _____ empowers UPSC to advise the government on recruitment matters', a: '320', f: 'Article 320 outlines the functions of UPSC including conducting examinations and advising on recruitment.'},

  // --- Part XIVA: Tribunals (Art 323A-323B) ---
  {q: 'Article _____ empowers Parliament to establish administrative tribunals', a: '323A', f: 'Article 323A allows Parliament to establish administrative tribunals for resolving disputes related to public services.'},

  // --- Part XV: Elections (Art 324-329) ---
  {q: 'Article _____ provides for the establishment of the Election Commission of India', a: '324', f: 'Article 324 vests the superintendence, direction, and control of elections in the Election Commission of India.'},
  {q: 'Article _____ provides for adult suffrage (universal adult franchise)', a: '326', f: 'Article 326 provides that elections to the Lok Sabha and state assemblies shall be based on adult suffrage, i.e., every citizen aged 18+ can vote.'},

  // --- Part XVI: Special Provisions (Art 330-342) ---
  {q: 'Article _____ provides for reservation of seats for SCs and STs in the Lok Sabha', a: '330', f: 'Article 330 provides for reservation of seats for SCs and STs in the Lok Sabha in proportion to their population.'},
  {q: 'Article _____ defines Scheduled Castes', a: '341', f: 'Article 341 empowers the President to specify castes, races, or tribes as Scheduled Castes in relation to a state or UT.'},
  {q: 'Article _____ defines Scheduled Tribes', a: '342', f: 'Article 342 empowers the President to specify tribes or tribal communities as Scheduled Tribes in relation to a state or UT.'},

  // --- Part XVII: Official Language (Art 343-351) ---
  {q: 'Article _____ declares Hindi in Devanagari script as the official language of the Union', a: '343', f: 'Article 343(1): Hindi in Devanagari script shall be the official language of the Union. English to continue for 15 years.'},
  {q: 'Article _____ provides for the language of the Supreme Court and High Courts', a: '348', f: 'Article 348 provides that all proceedings in the Supreme Court and High Courts shall be in English, with exceptions for Hindi in some states.'},

  // --- Part XVIII: Emergency (Art 352-360) ---
  {q: 'Article _____ provides for the proclamation of National Emergency', a: '352', f: 'Article 352 empowers the President to proclaim a National Emergency if the security of India is threatened by war, external aggression, or armed rebellion.'},
  {q: 'Article _____ provides for the proclamation of State Emergency (Presidents Rule)', a: '356', f: 'Article 356 empowers the President to assume control of a states administration if the state government cannot function per constitutional provisions.'},
  {q: 'Article _____ provides for Financial Emergency', a: '360', f: 'Article 360 empowers the President to proclaim a Financial Emergency if the financial stability or credit of India is threatened.'},

  // --- Part XX: Amendment (Art 368) ---
  {q: 'Article _____ provides for the power of Parliament to amend the Constitution', a: '368', f: 'Article 368 grants Parliament the power to amend the Constitution by a special majority and, in some cases, ratification by states.'},
  {q: '_____ Amendment (1976) added the words Socialist, Secular, and Integrity to the Preamble', a: '42nd', f: 'The 42nd Amendment (1976), also called the Mini-Constitution, made extensive changes including adding Socialist, Secular, and Integrity to the Preamble.'},
  {q: '_____ Amendment (1972) reduced the minimum voting age from 21 to 18 years', a: '61st', f: 'The 61st Amendment (1988) lowered the voting age from 21 to 18 years by amending Article 326.'},
  {q: '_____ Amendment (1992) granted constitutional status to Panchayati Raj institutions', a: '73rd', f: 'The 73rd Amendment (1992) added Part IX (Articles 243-243O) to the Constitution, granting constitutional status to Panchayats.'},
  {q: '_____ Amendment (1992) granted constitutional status to municipalities', a: '74th', f: 'The 74th Amendment (1992) added Part IXA (Articles 243P-243ZG) providing for constitutional status to municipalities.'},
  {q: '_____ Amendment (2002) made the right to education a fundamental right', a: '86th', f: 'The 86th Amendment (2002) inserted Article 21A making education a fundamental right for children aged 6-14.'},
  {q: '_____ Amendment (2003) provided for the creation of a National Judicial Appointments Commission', a: '99th', f: 'The 99th Amendment (2014) was enacted to create NJAC but was struck down by the Supreme Court in 2015 as unconstitutional.'},

  // --- Part XXI: Special Provisions (Art 370-371J) ---
  {q: 'Article _____ granted special autonomous status to the state of Jammu and Kashmir (abrogated 2019)', a: '370', f: 'Article 370 granted special autonomous status to J&K. It was abrogated on 5 August 2019 by the 99th Constitutional Order.'},
  {q: 'Article _____ provides special provisions for the state of Nagaland regarding religious and social practices', a: '371A', f: 'Article 371A provides special provisions for Nagaland, exempting Naga customary law and procedures from parliamentary legislation.'},

  // --- Part XXII: Short Title, Commencement (Art 393-395) ---
  {q: 'The Constitution of India came into effect on _____, celebrated as Republic Day', a: '26 January 1950', f: 'The Constitution was adopted on 26 November 1949 and came into force on 26 January 1950, marking the birth of the Republic of India.'},
  {q: 'Article _____ repeals the Indian Independence Act 1947 and the Government of India Act 1935', a: '395', f: 'Article 395 repealed the Indian Independence Act 1947 and the Government of India Act 1935, among other pre-independence laws.'},
];

function main() {
  var existing = {};
  if (fs.existsSync(DATA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (e) { console.error('Error reading file, starting fresh'); }
  }
  if (!existing[CAT_KEY]) existing[CAT_KEY] = { subSubjects: {} };
  if (!existing[CAT_KEY].subSubjects[SUB_KEY]) existing[CAT_KEY].subSubjects[SUB_KEY] = [];

  var existingKeys = {};
  existing[CAT_KEY].subSubjects[SUB_KEY].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CAT_KEY].subSubjects[SUB_KEY].length + 1;

  QUESTIONS.forEach(function(item) {
    var q = makeQuestion(item.q, item.a, seq++, item.f);
    if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
  });

  newQuestions.forEach(function(q) { existing[CAT_KEY].subSubjects[SUB_KEY].push(q); });
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Important Articles: ' + existing[CAT_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }

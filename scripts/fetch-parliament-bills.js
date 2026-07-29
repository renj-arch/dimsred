var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/current-affairs.json');
var CA_KEY = 'Current Affairs';
var SUB_KEY = 'Parliament & Bills';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'pb_' + pad(seq), type: 'fill_blank', category: CA_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CA_KEY,
    subSubject: SUB_KEY, emoji: '\uD83C\uDFDB\uFE0F',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Parliament basics ---
  {q: 'The Indian Parliament consists of the President and the two Houses: _____ and Rajya Sabha', a: 'Lok Sabha', f: 'Under Article 79, the Parliament of India comprises the President, Lok Sabha (House of the People), and Rajya Sabha (Council of States).'},
  {q: 'The maximum strength of the Lok Sabha as per the Constitution is _____ members', a: '552', f: 'Article 81 provides for maximum 552 members: 530 from states, 20 from UTs, and 2 nominated Anglo-Indians (before the 104th Amendment).'},
  {q: 'The maximum strength of the Rajya Sabha as per the Constitution is _____ members', a: '250', f: 'Article 80 provides for 250 Rajya Sabha members: 238 elected from states and UTs, and 12 nominated by the President.'},
  {q: 'Rajya Sabha members are elected for a term of _____ years', a: '6', f: 'Rajya Sabha is a permanent House. One-third of its members retire every two years. Each member serves a 6-year term.'},
  {q: 'Lok Sabha members are elected for a term of _____ years, unless dissolved earlier', a: '5', f: 'Lok Sabha has a 5-year term but can be dissolved earlier by the President. The term was extended during the 1975-77 Emergency (42nd Amendment).'},
  {q: 'The _____ is the presiding officer of the Lok Sabha', a: 'Speaker', f: 'The Speaker is elected by Lok Sabha members. The current Speaker is Om Birla. The Speaker is the constitutional head of the Lok Sabha.'},
  {q: 'The _____ is the ex-officio Chairman of the Rajya Sabha', a: 'Vice President', f: 'The Vice President of India serves as the Chairman of Rajya Sabha under Article 64. The current Vice President is Jagdeep Dhankhar.'},
  {q: 'A _____ Bill is a bill that exclusively deals with financial matters like taxation, expenditure, and borrowing', a: 'Money', f: 'Money Bills (Article 110) can only be introduced in Lok Sabha. Rajya Sabha can only recommend amendments, not reject them.'},
  {q: 'A _____ Bill is a bill that contains provisions related to expenditure charged on the Consolidated Fund of India', a: 'Finance', f: 'Finance Bill is a Money Bill that deals with taxation proposals. It is introduced along with the Budget.'},
  {q: 'A _____ Bill is a bill that seeks to amend the Constitution and requires a special majority', a: 'Constitutional Amendment', f: 'Constitutional amendment bills (Article 368) require a 2/3 majority of members present and voting in both Houses, and in some cases, ratification by at least half the states.'},

  // --- Types of bills and legislative process ---
  {q: 'An _____ Bill is a bill introduced by a private member (not a minister) in Parliament', a: 'Private Members', f: 'Private Members Bills have very low success rates. Only 14 have been passed in Indias parliamentary history. The last was in 2016.'},
  {q: 'A _____ Bill is a bill introduced by a minister in Parliament', a: 'Government', f: 'Government Bills constitute the majority of bills passed by Parliament. They are introduced by ministers on behalf of the cabinet.'},
  {q: 'The _____ is the authorized publication of parliamentary debates and proceedings', a: 'Lok Sabha Secretariat', f: 'The Lok Sabha Secretariat publishes the debates, synopsis, and committee reports. Official records are available on the Lok Sabha website.'},
  {q: 'The _____ Committee examines the financial estimates and suggests economies in government expenditure', a: 'Estimates', f: 'The Estimates Committee consists of 30 Lok Sabha members. It examines the budget estimates and suggests improvements in efficiency.'},
  {q: 'The _____ Committee examines the annual accounts of the government and reports on financial irregularities', a: 'Public Accounts', f: 'The Public Accounts Committee (PAC) has 15 Lok Sabha and 7 Rajya Sabha members. It examines the CAG reports on government accounts.'},
  {q: 'The _____ Committee examines bills referred to it and submits detailed reports with recommendations', a: 'Select', f: 'Select Committees are formed for detailed examination of specific bills. Joint Parliamentary Committees (JPC) include members from both Houses.'},

  // --- Sessions and Parliamentary terms ---
  {q: 'Parliament has _____ sessions every year: Budget, Monsoon, and Winter sessions', a: 'three', f: 'The three sessions are: Budget Session (Feb-May), Monsoon Session (Jul-Sep), and Winter Session (Nov-Dec). The Budget Session is the longest.'},
  {q: 'The _____ Session is the first session of the year and includes the presentation of the Union Budget', a: 'Budget', f: 'The Budget Session begins with the Presidents Address on the first day. The Union Budget is presented on February 1.'},
  {q: 'The _____ of the President to address both Houses of Parliament at the start of the Budget Session', a: 'address', f: 'Article 87 requires the President to address both Houses at the commencement of the first session after each general election and at the start of the Budget Session.'},

  // --- Important recent acts/bills ---
  {q: 'The _____ Act 2019 amended the Citizenship Act 1955 to fast-track citizenship for non-Muslim migrants from Pakistan, Afghanistan, and Bangladesh', a: 'Citizenship Amendment', f: 'CAA 2019 provides citizenship to persecuted minorities (Hindu, Sikh, Jain, Parsi, Buddhist, Christian) from three neighboring countries who arrived in India by 31 Dec 2014.'},
  {q: 'The _____ Act 2020 replaced the Indian Medical Council Act 1956 and established the National Medical Commission', a: 'National Medical Commission', f: 'NMC Act 2020 replaced the MCI. It established NMC as the apex regulator of medical education and practice in India.'},
  {q: 'The _____ Act 2020 replaced 9 labor laws and consolidated them into a single code on wages and working conditions', a: 'Code on Social Security', f: 'The government consolidated 29 central labor laws into 4 labor codes: Code on Wages, Industrial Relations Code, Social Security Code, and OSH Code.'},
  {q: 'The _____ Act 2023 replaced the Indian Penal Code 1860 as the criminal code of India', a: 'Bharatiya Nyaya Sanhita', f: 'BNS 2023 replaced the IPC 1860. Two other laws replaced CrPC and Evidence Act. These came into effect on 1 July 2024.'},
  {q: 'The _____ Amendment Act 2023 provides for reservation of one-third seats for women in Lok Sabha and state assemblies', a: 'Womens Reservation', f: 'The 128th Constitutional Amendment Bill (Nari Shakti Vandan Adhiniyam) was passed in 2023. It will be implemented after the next delimitation.'},
  {q: 'The _____ Act 2019 abolished the practice of instant triple talaq (talaq-e-biddat) by Muslim men', a: 'Muslim Women (Protection of Rights on Marriage)', f: 'The Act declared instant triple talaq void and illegal, making it a cognizable offense punishable with up to 3 years imprisonment.'},
  {q: 'The _____ Act 2019 merged the states of Jammu and Kashmir and Ladakh as Union Territories', a: 'Jammu and Kashmir Reorganisation', f: 'The Act received presidential assent on 9 August 2019, reorganizing the state of J&K into two UTs: J&K and Ladakh.'},
  {q: 'The _____ Act 2017 provides for goods and services tax (GST) — One Nation One Tax', a: 'Central Goods and Services Tax', f: 'CGST Act 2017 along with IGST Act, SGST Act, and UTGST Act implemented GST from 1 July 2017, subsuming multiple indirect taxes.'},
  {q: 'The _____ Act 2016 provided for the insolvency and bankruptcy code for resolving corporate and individual insolvency', a: 'Insolvency and Bankruptcy', f: 'IBC 2016 established a time-bound process (180+90 days) for insolvency resolution. It created the Insolvency and Bankruptcy Board of India.'},
  {q: 'The _____ Act 2013 provides for corporate social responsibility (CSR) spending by companies above a certain threshold', a: 'Companies', f: 'Section 135 of the Companies Act 2013 mandates companies with net worth of Rs 500 crore+ or turnover of Rs 1,000 crore+ to spend 2% of profit on CSR.'},

  // --- Parliamentary committees and terms ---
  {q: 'The _____ committee is a committee of members of Parliament that examines the action taken by the government on the recommendations of various committees', a: 'Business Advisory', f: 'The Business Advisory Committee of each House determines the time allocation for different items of business.'},
  {q: 'The _____ is the final authority for interpreting the Constitution in case of dispute over whether a bill is a Money Bill', a: 'Speaker', f: 'The Speakers decision on whether a bill is a Money Bill is final under Article 110(3), binding all other authorities.'},
  {q: 'A _____ session refers to the period when both Houses of Parliament sit together for deliberation', a: 'joint', f: 'Joint sittings are rare. They are called to resolve deadlocks between Lok Sabha and Rajya Sabha on a bill. The last joint sitting was on the POTA bill in 2002.'},
  {q: 'The _____ is the minimum number of members required to be present for the transaction of parliamentary business', a: 'quorum', f: 'The quorum for either House is one-tenth of its total membership (Article 100). Without quorum, the House cannot function.'},
];

function main() {
  var existing = {};
  if (fs.existsSync(DATA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (e) { console.error('Error reading file, starting fresh'); }
  }
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects[SUB_KEY]) existing[CA_KEY].subSubjects[SUB_KEY] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[SUB_KEY].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects[SUB_KEY].length + 1;

  QUESTIONS.forEach(function(item) {
    var q = makeQuestion(item.q, item.a, seq++, item.f);
    if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
  });

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[SUB_KEY].push(q); });
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Parliament & Bills: ' + existing[CA_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }

var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/indian-society.json');
var CAT_KEY = 'Indian Society';
var SUB_KEY = 'Census of India';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'census_' + pad(seq), type: 'fill_blank', category: CAT_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CAT_KEY,
    subSubject: SUB_KEY, emoji: '\uD83D\uDCCA',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Census basics ---
  {q: 'The first complete census of India was conducted in the year _____', a: '1881', f: 'The first synchronous decennial census in India was conducted in 1881 under British rule by W. C. Plowden.'},
  {q: 'The Census of India is conducted every _____ years under the Census Act of 1948', a: '10', f: 'The Census Act 1948 provides the legal framework for conducting the decennial census in India. The Census of India is the largest administrative exercise in the world.'},
  {q: 'The 2021 Census of India has been postponed due to the COVID-19 pandemic and is now scheduled for _____', a: '2026', f: 'The 2021 Census was postponed and is now expected to be conducted in 2026, marking the first time in Indian history that the decennial census was delayed.'},
  {q: 'The Registrar General and Census Commissioner of India operates under the Ministry of _____', a: 'Home Affairs', f: 'The Office of the Registrar General and Census Commissioner functions under the Ministry of Home Affairs, Government of India.'},

  // --- 2011 Census data ---
  {q: 'As per the 2011 Census, the total population of India is _____ crores', a: '121.09', f: 'Indias population as per the 2011 Census was 1,21,09,42,93 (121.09 crore), accounting for 17.5% of the worlds population.'},
  {q: 'As per the 2011 Census, the decadal population growth rate of India during 2001-2011 was _____ percent', a: '17.64', f: 'The decadal growth rate declined from 21.54% (1991-2001) to 17.64% (2001-2011), indicating a slowing of population growth.'},
  {q: 'As per the 2011 Census, the population density of India was _____ persons per sq km', a: '382', f: 'Population density increased from 325 (2001) to 382 (2011). The highest density is in Delhi (11,320) and the lowest in Arunachal Pradesh (17).'},
  {q: 'As per the 2011 Census, the sex ratio of India is _____ females per 1000 males', a: '943', f: 'The sex ratio improved from 933 (2001) to 943 (2011). Kerala has the highest (1,084) and Haryana the lowest (879).'},
  {q: 'As per the 2011 Census, the child sex ratio (0-6 years) in India is _____ females per 1000 males', a: '919', f: 'The child sex ratio (0-6 years) declined from 927 (2001) to 919 (2011), a matter of concern indicating female foeticide.'},
  {q: 'As per the 2011 Census, the overall literacy rate of India is _____ percent', a: '74.04', f: 'Literacy rate increased from 64.83% (2001) to 74.04% (2011). Male literacy is 82.14% and female literacy is 65.46%.'},
  {q: 'As per the 2011 Census, the state with the highest literacy rate in India is _____', a: 'Kerala', f: 'Kerala has the highest literacy rate at 93.91% (2011), followed by Mizoram (91.58%) and Lakshadweep (92.28%).'},
  {q: 'As per the 2011 Census, the state with the lowest literacy rate in India is _____', a: 'Bihar', f: 'Bihar has the lowest literacy rate at 63.82% (2011), followed by Arunachal Pradesh (66.95%) and Rajasthan (67.06%).'},
  {q: 'As per the 2011 Census, the percentage of urban population in India is _____ percent', a: '31.16', f: 'Urban population percentage increased from 27.81% (2001) to 31.16% (2011). The highest urbanization is in Delhi (97.5%) and lowest in Himachal Pradesh (10%).'},
  {q: 'As per the 2011 Census, the state with the highest population in India is _____', a: 'Uttar Pradesh', f: 'Uttar Pradesh has the highest population (19.96 crore, 16.5% of India) followed by Maharashtra (11.24 crore) and Bihar (10.41 crore).'},

  // --- State-wise highlights 2011 ---
  {q: 'The population of _____ as per 2011 Census crossed the 10-crore mark for the first time', a: 'Bihar', f: 'Bihars population reached 10.41 crore in 2011. It has the highest population density (1,106 per sq km) among major states.'},
  {q: 'The state of _____ has the lowest population as per the 2011 Census', a: 'Sikkim', f: 'Sikkim has the lowest population among states at 6.10 lakhs (0.61 million) as per 2011 Census.'},
  {q: 'Which state has the highest population density as per the 2011 Census?', a: 'Bihar', f: 'Bihar has the highest population density of 1,106 persons per sq km, followed by West Bengal (1,028) and Kerala (860).'},
  {q: 'The state with the lowest population density as per 2011 Census is _____', a: 'Arunachal Pradesh', f: 'Arunachal Pradesh has the lowest population density of 17 persons per sq km, followed by Mizoram (52) and Nagaland (119).'},

  // --- Union Territories ---
  {q: 'The Union Territory of _____ has the highest literacy rate in India (96.2% as per 2011 Census)', a: 'Kerala', f: 'Kerala has the highest literacy rate among states (93.91%). Among UTs, Lakshadweep has 92.28% literacy.'},
  {q: 'The Union Territory of _____ has the highest sex ratio in India (1,084 females per 1000 males as per 2011)', a: 'Kerala', f: 'Kerala too has the highest sex ratio (1,084). Among UTs, Puducherry has 1,038.'},
  {q: 'The Union Territory of _____ has the lowest sex ratio in India', a: 'Daman and Diu', f: 'Daman and Diu has the lowest sex ratio at 618 (2011), followed by Dadra and Nagar Haveli at 775.'},

  // --- Social indicators ---
  {q: 'The _____ of a population is defined as number of females per 1,000 males', a: 'sex ratio', f: 'Sex ratio is a key demographic indicator showing the number of females per 1,000 males. Indias sex ratio has improved from 933 (2001) to 943 (2011).'},
  {q: 'The _____ ratio indicates the number of children (0-6 years) per woman in the reproductive age group', a: 'child-woman', f: 'The child-woman ratio helps assess fertility levels and is used to estimate the child sex ratio.'},
  {q: 'The _____ population as per Census 2011 includes persons who live in villages and are engaged in agriculture', a: 'rural', f: 'Rural population was 68.84% as per 2011 Census. About 54.6% of the workforce is engaged in agriculture.'},
  {q: 'The _____ Census was the first census to use hand-held electronic devices for data collection', a: '2021', f: 'The 2021 Census was planned to be the first digital census using a mobile app for data collection, though it has been postponed.'},

  // --- Demographic terms and concepts ---
  {q: 'The total number of live births per 1,000 population per year is called the ____ rate', a: 'crude birth', f: 'Crude Birth Rate (CBR) is the number of live births per 1,000 population per year. Indias CBR declined from 25.8 (2000) to 19.5 (2020).'},
  {q: 'The total number of deaths per 1,000 population per year is called the ____ rate', a: 'crude death', f: 'Crude Death Rate (CDR) is the number of deaths per 1,000 population. Indias CDR declined from 8.9 (2000) to 6.0 (2020).'},
  {q: 'The _____ Rate (TFR) is the average number of children a woman would have in her lifetime', a: 'Total Fertility', f: 'Indias Total Fertility Rate (TFR) declined from 3.2 (2000) to 2.0 (2020), reaching replacement level fertility.'},
  {q: 'The _____ Rate (IMR) is the number of infant deaths per 1,000 live births', a: 'Infant Mortality', f: 'Indias Infant Mortality Rate declined from 57 (2005-06) to 28 (2020) per 1,000 live births, showing significant improvement.'},
  {q: 'The _____ Rate (MMR) is the number of maternal deaths per 100,000 live births', a: 'Maternal Mortality', f: 'Indias Maternal Mortality Ratio declined from 130 (2014-16) to 97 (2018-20) per 100,000 live births.'},
  {q: 'The _____ Ratio is defined as the number of dependents (aged 0-14 and 65+) per 100 working-age population (15-64)', a: 'dependency', f: 'Indias dependency ratio declined from 62.7% (2011) to about 52% (2021), reflecting the demographic dividend.'},
  {q: 'The _____ of a population refers to the relative proportion of people in different age groups', a: 'age structure', f: 'Indias age structure shows a young population with 27% aged 0-14, 67% in 15-64 working-age, and 6% aged 65+ (as per 2020 estimates).'},
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
  console.error('Census of India: ' + existing[CAT_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }

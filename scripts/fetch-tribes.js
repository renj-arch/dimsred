var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/indian-society.json');
var CAT_KEY = 'Indian Society';
var SUB_KEY = 'Tribes in India';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'tribe_' + pad(seq), type: 'fill_blank', category: CAT_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CAT_KEY,
    subSubject: SUB_KEY, emoji: '\uD83C\uDFD4\uFE0F',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Key tribal groups by state ---
  {q: 'The _____ tribe of Rajasthan is known for its intricate mirror-work embroidery and performing arts', a: 'Bhil', f: 'Bhils are one of the largest tribal groups in India, primarily found in Rajasthan, Madhya Pradesh, Gujarat, and Maharashtra.'},
  {q: 'The _____ tribe of Madhya Pradesh is known for their Pardhan oral epics and distinctive wall paintings', a: 'Gond', f: 'Gonds are one of the largest tribal groups in central India, found in MP, Chhattisgarh, Maharashtra, and Odisha.'},
  {q: 'The _____ tribe of Nagaland is known for their head-taking tradition and Hornbill Festival', a: 'Naga', f: 'The Naga tribe comprises several sub-tribes like Angami, Ao, Sema, and Konyak, known for the Hornbill Festival held annually in Nagaland.'},
  {q: 'The _____ tribe of Arunachal Pradesh practices the Tawang and Torgya festivals and follows Tibetan Buddhism', a: 'Monpa', f: 'Monpa tribe is primarily in Tawang and West Kameng districts of Arunachal Pradesh, known for their Buddhist culture and Thanka paintings.'},
  {q: 'The _____ tribe of Meghalaya is known for their matrilineal society and living root bridges', a: 'Khasi', f: 'Khasis of Meghalaya follow a matrilineal system where property and lineage pass through the female line. They are known for living root bridges.'},
  {q: 'The _____ tribe of Meghalaya is known for their matrilineal system and dance festivals like Nongkrem', a: 'Garo', f: 'Garos are one of the major tribes of Meghalaya, known for matrilineal society, the Wangala harvest festival, and Nongkrem dance.'},
  {q: 'The _____ tribe of Mizoram is the largest tribal group and celebrates Chapchar Kut festival', a: 'Mizo', f: 'Mizos are the predominant tribe of Mizoram, known for the Chapchar Kut spring festival and their traditional bamboo dance (Cheraw).'},
  {q: 'The _____ tribe of Himachal Pradesh is known for their polyandrous society and Kullu Dussehra', a: 'Kinnauri', f: 'Kinnauris of Himachal Pradesh are known for their distinct culture, polyandry (in some areas), and participation in Kullu Dussehra.'},
  {q: 'The _____ tribe of Odisha is known for their Sun God worship and the Rath Yatra of Puri', a: 'Santal', f: 'Santals are one of the largest tribes in Odisha, known for their Sohrai harvest festival and distinctive Sari dance.'},
  {q: 'The _____ tribe of Jharkhand is the second largest tribal group in India and celebrates Karma Puja', a: 'Oraon', f: 'Oraons are mainly found in Jharkhand, Chhattisgarh, and Odisha. They celebrate the Karma Puja for good harvest and prosperity.'},
  {q: 'The _____ tribe of West Bengal is known for their Tusu and Bhadu festivals and Chau dance', a: 'Munda', f: 'Mundas are found in Jharkhand, West Bengal, and Odisha. They are known for their Sohrai and Mage Parab festivals.'},

  // --- Particularly Vulnerable Tribal Groups (PVTGs) ---
  {q: 'The _____ are a Particularly Vulnerable Tribal Group of the Andaman and Nicobar Islands, known to be uncontacted', a: 'Sentinelese', f: 'The Sentinelese are an uncontacted tribe living on North Sentinel Island. They are one of the 75 PVTGs identified by the Government of India.'},
  {q: 'The _____ are a PVTG of the Nilgiri Hills in Tamil Nadu, known for their distinct language and hunting-gathering lifestyle', a: 'Toda', f: 'Todas are a pastoral tribal community in the Nilgiris, known for their distinctive embroidered shawls and dairy culture.'},
  {q: 'The _____ are a PVTG found in Kerala and Tamil Nadu, practicing shifting agriculture and known for their black-buck horn dance', a: 'Kurumbas', f: 'Kurumbas are a PVTG in the Nilgiri hills. They practice shifting cultivation and are known for traditional medicine and bamboo craft.'},
  {q: 'The _____ are a PVTG of Rajasthan and Gujarat, once a nomadic hunting tribe now known for their folk music', a: 'Kathodi', f: 'Kathodis are one of the smallest PVTGs, found in Rajasthan and Gujarat, known for their hunting-gathering traditions.'},
  {q: 'The _____ are a PVTG of Odisha known for their unique language (Sora) and shifting agriculture', a: 'Saura', f: 'Sauras (or Sabaras) are a PVTG in Odisha, known for their Ittal mural paintings and the Saura language.'},
  {q: 'The _____ are a PVTG of Chhattisgarh known for their Gondi language and Ghotul dormitory system', a: 'Abhuj Maria', f: 'Abhuj Maria is a subgroup of Gonds in Chhattisgarh. Their Ghotul system is a youth dormitory for social and cultural training.'},
  {q: 'The _____ are a PVTG of Madhya Pradesh and Maharashtra, traditionally food gatherers and hunters', a: 'Bhil', f: 'Bhils are also classified as a PVTG in certain areas. They are one of the most widespread tribal communities.'},

  // --- Tribal revolts ---
  {q: 'The _____ Rebellion (1855-56) was led by Sidhu and Kanhu Murmu against British landlords and the revenue system', a: 'Santhal', f: 'The Santhal Rebellion (1855-56) was led by Sidhu and Kanhu Murmu against the Permanent Settlement and oppressive landlord practices.'},
  {q: 'The _____ Rebellion (1879-80) in Andhra Pradesh was led by Alluri Sitarama Raju against the Madras Forest Act', a: 'Rampa', f: 'The Rampa Rebellion (1879-80) was against the Madras Forest Act of 1882 which restricted tribal access to forests. Later, Alluri Sitarama Raju led another Rampa rebellion in 1922-24.'},
  {q: 'The _____ Rebellion (1913) in Chhotanagpur was led by Birsa Munda against British land policies', a: 'Munda', f: 'Birsa Munda led the Munda Rebellion (Ulugulan) against the British and Christian missionaries. He is a revered tribal leader.'},
  {q: 'The _____ Rebellion (1831-32) was led by the Kol tribes of Chhotanagpur against British rule and moneylenders', a: 'Kol', f: 'The Kol Rebellion (1831-32) was against British rule, moneylenders, and the Brahminical system imposed on tribals.'},

  // --- Tribal culture and festivals ---
  {q: 'The _____ is a colorful dance festival of the Bhil tribe of Madhya Pradesh', a: 'Bhagoria', f: 'Bhagoria Haat is a tribal fair/festival where young Bhil men and women choose their life partners, celebrated in MP.'},
  {q: 'The _____ festival of the Nagas is a post-harvest festival celebrated with traditional dances and songs', a: 'Hornbill', f: 'The Hornbill Festival is celebrated by the Naga tribes in Kohima, Nagaland from 1-10 December annually.'},
  {q: 'The _____ festival of the Mizos is a spring festival celebrated with bamboo dances and feasts', a: 'Chapchar Kut', f: 'Chapchar Kut is the Mizo spring festival celebrated in March, featuring the Cheraw (bamboo dance) and traditional cuisines.'},
  {q: 'The _____ festival of Odisha is celebrated by the Kondh tribe as a harvest festival', a: 'Nua Khai', f: 'Nua Khai is the harvest festival of the Kondh tribe in Odisha and Jharkhand, celebrated with new rice offerings.'},
  {q: 'The _____ tribe of Jammu & Kashmir is known for their transhumance practices and their traditional dress (pheran)', a: 'Gujjar', f: 'Gujjars are a pastoral nomadic community in J&K, known for buffalo rearing and seasonal migration between highland pastures and lowlands.'},

  // --- Constitutional provisions for tribes ---
  {q: 'The _____ Schedule of the Constitution provides for the administration of Scheduled Areas and Tribal Areas', a: 'Fifth', f: 'The Fifth Schedule deals with the administration and control of Scheduled Areas and Scheduled Tribes in states other than Assam, Meghalaya, Tripura, and Mizoram.'},
  {q: 'The _____ Schedule provides for the administration of tribal areas in the states of Assam, Meghalaya, Tripura, and Mizoram', a: 'Sixth', f: 'The Sixth Schedule provides for autonomous district councils to govern tribal areas in the northeastern states.'},
  {q: 'The National Commission for Scheduled Tribes was established under Article _____ of the Constitution', a: '338A', f: 'Article 338A provides for the National Commission for Scheduled Tribes to safeguard the interests of STs.'},
  {q: '_____ is the term used for tribal communities that are particularly vulnerable and have declining population', a: 'PVTG', f: 'Particularly Vulnerable Tribal Groups (PVTGs) are a special category of tribal communities identified as having declining population, low literacy, and pre-agricultural technology.'},

  // --- Important tribal areas ---
  {q: 'Which state has the highest population of Scheduled Tribes in India?', a: 'Madhya Pradesh', f: 'Madhya Pradesh has the highest ST population (15.3 million as per 2011 Census), followed by Maharashtra, Odisha, Rajasthan, and Gujarat.'},
  {q: 'Which state has the highest percentage of Scheduled Tribes in its population?', a: 'Mizoram', f: 'Mizoram has the highest percentage of ST population (94.4% as per 2011 Census), followed by Lakshadweep (94.2%) and Nagaland (86.5%).'},
  {q: 'The _____ tribe of Lakshadweep follows Islam and is known for their matrilineal system', a: 'Mappila', f: 'Mappilas (or Moplahs) are the main community in Lakshadweep, following Islam with a matrilineal inheritance system.'},
  {q: 'The _____ tribe of Kerala (Wayanad) is known for their Nattukali (folk dance) and Koothu performances', a: 'Paniya', f: 'Paniyas are a tribal community in Wayanad, Kerala, known for agricultural labor and their folk dances like Nattukali.'},
  {q: 'The _____ tribe of Karnataka is known for their Yakshagana folk theatre and Bhagavatha tradition', a: 'Halakki', f: 'Halakkis are a tribal community in Uttara Kannada district of Karnataka, known for their distinct dialect and Yakshagana performances.'},
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
  console.error('Tribes in India: ' + existing[CAT_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }

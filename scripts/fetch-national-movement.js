var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/indian-history.json');
var CAT_KEY = 'Indian History';
var SUB_KEY = 'Indian Independence Movement';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'freedom_' + pad(seq), type: 'fill_blank', category: CAT_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CAT_KEY,
    subSubject: SUB_KEY, emoji: '\uD83C\uDFF5\uFE0F',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Early Resistance (1857-1885) ---
  {q: 'The Indian Rebellion of _____ was a major uprising against British rule led by sepoys and later joined by various Indian rulers', a: '1857', f: 'The Indian Rebellion of 1857 began on 10 May 1857 at Meerut as a mutiny of sepoys and later escalated into a broader rebellion across north-central India.'},
  {q: 'The immediate cause of the 1857 Revolt was the introduction of the _____ rifle cartridges greased with cow and pig fat', a: 'Enfield', f: 'The new Enfield P-53 rifle cartridges required biting off the end, which offended both Hindu and Muslim soldiers due to the grease.'},
  {q: 'Who was the last Mughal emperor who was exiled after the 1857 Revolt?', a: 'Bahadur Shah Zafar', f: 'Bahadur Shah Zafar was declared the emperor of India during the 1857 Revolt. After its failure, he was exiled to Rangoon where he died in 1862.'},
  {q: 'The _____ Act of 1858 transferred control of Indian administration from the East India Company to the British Crown', a: 'Government of India', f: 'The Government of India Act 1858 ended the East India Company rule and established the British Raj under the British Crown.'},
  {q: 'Who was the first Viceroy of India under the British Crown?', a: 'Lord Canning', f: 'Lord Canning was the last Governor-General under the East India Company and became the first Viceroy of India after the 1858 Act.'},
  {q: 'The _____ of 1861 allowed Indians to be nominated to the Viceroys legislative council for the first time', a: 'Indian Councils Act', f: 'The Indian Councils Act 1861 introduced the principle of Indian representation by nominating Indians to the Viceroys council.'},

  // --- Rise of Nationalism (1885-1905) ---
  {q: 'The Indian National Congress was founded in the year _____', a: '1885', f: 'The INC was founded on 28 December 1885 at Gokuldas Tejpal Sanskrit College, Bombay, by Allan Octavian Hume.'},
  {q: 'Who was the first President of the Indian National Congress?', a: 'Womesh Chunder Bonnerjee', f: 'Womesh Chunder Bonnerjee was the first president of INC. He presided over its first session in Bombay.'},
  {q: 'The _____ movement (1875) by Dayananda Saraswati sought to revive Vedic Hinduism and reform society', a: 'Arya Samaj', f: 'The Arya Samaj, founded in 1875, was a reform movement that rejected idol worship and caste discrimination based on birth.'},
  {q: 'The _____ (1875) was founded by Sir Syed Ahmed Khan to promote modern education among Muslims', a: 'Aligarh Muslim University', f: 'The Muhammadan Anglo-Oriental College (MAO College) was founded in 1875 at Aligarh and later became Aligarh Muslim University.'},
  {q: 'Who founded the Indian National Army (INA) in 1942?', a: 'Subhas Chandra Bose', f: 'Subhas Chandra Bose formed the Indian National Army (Azad Hind Fauj) in 1942 with Japanese support to fight against British rule.'},

  // --- Swadeshi & Partition (1905-1915) ---
  {q: 'The Partition of Bengal was announced in the year _____ by Lord Curzon', a: '1905', f: 'The Partition of Bengal was announced on 19 July 1905 and came into effect on 16 October 1905, dividing Bengal into East Bengal and Assam and West Bengal.'},
  {q: 'The _____ movement (1905-1908) emerged in response to the Partition of Bengal and advocated boycott of British goods', a: 'Swadeshi', f: 'The Swadeshi movement promoted the use of Indian-made goods and boycott of British products. It also included national education and arbitration courts.'},
  {q: 'The _____ was formed in 1907 by the extremist faction led by Bal Gangadhar Tilak after the Surat Split of INC', a: 'Swadeshi League', f: 'After the Surat Split in 1907, Tilak formed the Swadeshi League while the moderates retained the INC.'},
  {q: 'The Muslim League was founded in the year _____ at Dhaka', a: '1906', f: 'The All-India Muslim League was founded on 30 December 1906 in Dhaka, with the support of Nawab Salimullah of Dhaka.'},
  {q: 'The _____ Act of 1909 introduced separate electorates for Muslims', a: 'Indian Councils', f: 'The Indian Councils Act 1909 (Morley-Minto Reforms) introduced separate electorates for Muslims, marking a step towards communal representation.'},
  {q: 'Who was the founder of the Ghadar Party (1913)?', a: 'Sohan Singh Bhakna', f: 'The Ghadar Party was founded by Indian expatriates in the USA in 1913, with Sohan Singh Bhakna as president and Lala Hardayal as a key leader.'},
  {q: 'The Komagata Maru incident occurred in the year _____', a: '1914', f: 'The Komagata Maru, a ship carrying 376 Indian immigrants, was denied entry to Canada in 1914 and forced to return. Upon arrival in India, 19 passengers were killed by British police.'},
  {q: 'The _____ was founded by Annie Besant in 1916 to promote self-government for India', a: 'Home Rule League', f: 'Annie Besant founded the Home Rule League in 1916, following the model of the Irish Home Rule movement. Tilak also formed a parallel league.'},

  // --- Gandhian Era (1915-1925) ---
  {q: 'Mahatma Gandhi returned to India from South Africa in the year _____', a: '1915', f: 'Gandhi returned to India on 9 January 1915. He first experimented with Satyagraha in India at Champaran, Bihar in 1917.'},
  {q: 'Gandhis first Satyagraha in India was the _____ Satyagraha of 1917', a: 'Champaran', f: 'The Champaran Satyagraha (1917) was against the forced cultivation of indigo by British planters on peasants in Bihar.'},
  {q: 'The _____ Satyagraha (1918) was led by Gandhi in support of mill workers demanding higher wages', a: 'Ahmedabad', f: 'Gandhi led the Ahmedabad mill workers strike in 1918, using a fast as a tool of protest.'},
  {q: 'The _____ Satyagraha (1918) was against the land revenue tax imposed by the British in Gujarat', a: 'Kheda', f: 'The Kheda Satyagraha in Gujarat was against the British decision to levy full land tax despite crop failure due to floods.'},
  {q: 'The _____ Act of 1919 (Rowlatt Act) allowed detention of political prisoners without trial', a: 'Rowlatt', f: 'The Rowlatt Act (Anarchical and Revolutionary Crimes Act 1919) gave the British government powers to arrest and detain suspects without trial.'},
  {q: 'The _____ massacre took place on 13 April 1919 in Amritsar', a: 'Jallianwala Bagh', f: 'On 13 April 1919, British troops under Colonel Reginald Dyer fired on unarmed civilians at Jallianwala Bagh, killing at least 379 people.'},
  {q: 'Who was the British commander responsible for the Jallianwala Bagh massacre?', a: 'Reginald Dyer', f: 'Colonel Reginald Dyer ordered the firing on unarmed civilians. He was initially supported by the British but later condemned.'},
  {q: 'The _____ Party was formed in 1919 by the extremists who were expelled from INC', a: 'Swaraj', f: 'The Swaraj Party was formed by Motilal Nehru and Chittaranjan Das in 1923 after the failure of the Non-Cooperation movement.'},
  {q: 'The Government of India Act _____ introduced dyarchy in provinces', a: '1919', f: 'The Government of India Act 1919 (Montagu-Chelmsford Reforms) introduced dyarchy — divided provincial subjects into reserved and transferred.'},
  {q: 'The _____ movement was launched by Gandhi in 1920 as a mass protest against British rule', a: 'Non-Cooperation', f: 'The Non-Cooperation Movement (1920-1922) was the first nationwide mass movement led by Gandhi, involving boycott of British goods, schools, and titles.'},
  {q: 'The Non-Cooperation movement was called off in ____ after the Chauri Chaura incident', a: '1922', f: 'On 5 February 1922, protesters set fire to a police station in Chauri Chaura, UP, killing 22 policemen. Gandhi called off the movement on 12 Feb 1922.'},
  {q: 'The _____ incident (1922) led to the withdrawal of the Non-Cooperation movement', a: 'Chauri Chaura', f: 'The Chauri Chaura incident involved violent clashes between protesters and police that resulted in the death of 22 policemen.'},

  // --- Revolutionary Activity & Simon Commission (1925-1930) ---
  {q: 'The _____ (1924) was a conspiracy case against HRA members for planning to overthrow British rule', a: 'Kakori', f: 'The Kakori Conspiracy (1924) involved the robbery of a government train by Hindustan Republican Association members including Ram Prasad Bismil and Ashfaqulla Khan.'},
  {q: 'The Simon Commission arrived in India in the year _____', a: '1928', f: 'The Simon Commission (1928) was a British commission to review the working of the Government of India Act 1919. It was boycotted by Indians as it had no Indian member.'},
  {q: 'The slogan _____ was raised by Lala Lajpat Rai during the Simon Commission protests', a: 'Simon Go Back', f: 'Lala Lajpat Rai led the protest against the Simon Commission and was fatally lathi-charged. He died on 17 November 1928.'},
  {q: 'The _____ Report (1928) was an attempt by Indian leaders to draft a constitution for India', a: 'Nehru', f: 'The Nehru Report (1928) was the first Indian attempt to draft a constitutional framework. It proposed dominion status for India.'},
  {q: 'The _____ demanded a separate nation for Muslims and was presented in 1940', a: 'Pakistan Resolution', f: 'The Lahore Resolution (Pakistan Resolution) was passed on 23 March 1940 at the All-India Muslim League session in Lahore.'},
  {q: 'Bhagat Singh along with Batukeshwar Dutt threw bombs in the Central Legislative Assembly in the year _____', a: '1929', f: 'On 8 April 1929, Bhagat Singh and Batukeshwar Dutt threw smoke bombs in the Central Legislative Assembly to protest against the Defence of India Rules.'},

  // --- Civil Disobedience (1930-1935) ---
  {q: 'The _____ was issued by INC on 26 January 1930 declaring Purna Swaraj (complete independence) as its goal', a: 'Declaration of Purna Swaraj', f: 'The Declaration of Purna Swaraj was adopted at the Lahore session of INC in December 1929, and 26 January 1930 was celebrated as the first Independence Day.'},
  {q: 'The _____ March (1930) by Gandhi was a protest against the British salt monopoly', a: 'Dandi', f: 'The Dandi March (Salt Satyagraha) began on 12 March 1930 from Sabarmati Ashram and reached Dandi on 6 April 1930, where Gandhi broke the salt law.'},
  {q: 'The _____ (1930) was a protest by tribal leader Rani Gaidinliu against British rule in the Northeast', a: 'Heraka Movement', f: 'Rani Gaidinliu led the Heraka movement in the Naga hills against British rule and was imprisoned for 14 years.'},
  {q: 'The _____ Pacts (1931) was signed between Gandhi and Lord Irwin ending the Civil Disobedience movement', a: 'Gandhi-Irwin', f: 'The Gandhi-Irwin Pact was signed on 5 March 1931. Gandhi agreed to suspend the Civil Disobedience movement and attend the Second Round Table Conference.'},
  {q: 'The _____ Conference (1931) discussed Indias constitutional future with British authorities', a: 'Second Round Table', f: 'The Second Round Table Conference (Sep-Dec 1931) was attended by Gandhi as the sole representative of INC. No significant agreement was reached.'},
  {q: 'The Government of India Act _____ proposed a federal structure for India', a: '1935', f: 'The Government of India Act 1935 proposed an All-India Federation, provincial autonomy, and separate electorates. It was the basis for the 1950 Constitution.'},

  // --- Post-1935 & Quit India (1936-1945) ---
  {q: 'The _____ was formed in 1938 by Subhas Chandra Bose as a progressive wing within INC', a: 'Forward Bloc', f: 'The Forward Bloc was founded on 22 June 1939 by Subhas Chandra Bose after he was forced to resign as INC President.'},
  {q: 'The _____ Movement was launched by the Communist Party of India in 1939 against Indian involvement in WWII', a: 'Anti-Imperialist', f: 'The CPI initially opposed WWII and organized an anti-imperialist movement, but shifted its stance after the Soviet Union joined the Allies.'},
  {q: 'The _____ Resolution was passed at the Lahore session of Muslim League in 1940 demanding separate Muslim state', a: 'Lahore', f: 'The Lahore Resolution was passed on 23 March 1940, demanding independent states for Muslims in northwestern and eastern zones of India.'},
  {q: 'The _____ Mission (1942) was sent by Britain to secure Indian cooperation in WWII', a: 'Cripps', f: 'The Cripps Mission (March 1942) offered dominion status after the war but was rejected by INC for not promising immediate independence.'},
  {q: 'Gandhi launched the _____ Movement on 8 August 1942 at the AICC session in Bombay', a: 'Quit India', f: 'The Quit India Movement (August Kranti) was launched on 8 August 1942 with the slogan Do or Die. It led to the arrest of Gandhi and other leaders.'},
  {q: 'Who gave the famous slogan _____ during the Quit India Movement?', a: 'Do or Die', f: 'Gandhi gave the slogan Do or Die (Karo ya Maro) in his Quit India speech at the AICC session in Bombay on 8 August 1942.'},
  {q: 'The _____ was formed in 1942 by Subhas Chandra Bose in Singapore to fight British rule', a: 'Indian National Army', f: 'The INA (Azad Hind Fauj) was formed on 1 September 1942 by Subhas Chandra Bose with Japanese support.'},
  {q: 'The _____ trials of INA prisoners at Red Fort in 1945 sparked widespread protests across India', a: 'Red Fort', f: 'The Red Fort Trials (1945) of INA officers Shah Nawaz Khan, Prem Sahgal, and Gurbaksh Singh Dhillon led to mass public support for their release.'},

  // --- Towards Independence (1945-1947) ---
  {q: 'The _____ Tribunal (1946) was a military tribunal for INA prisoners held at Red Fort', a: 'INA', f: 'The INA Tribunal was the first military tribunal of its kind in India, where three INA officers were tried for waging war against the King.'},
  {q: 'The _____ Cabinet Mission (1946) proposed a federal union of India', a: 'Cabinet Mission', f: 'The Cabinet Mission (March 1946) proposed a federal union preserving Indias unity while accommodating Muslim League demands for autonomy.'},
  {q: '_____ was elected President of the interim government formed in 1946', a: 'Jawaharlal Nehru', f: 'Jawaharlal Nehru was elected leader of the interim government formed on 2 September 1946 under the Cabinet Mission plan.'},
  {q: 'The _____ Plan (3 June 1947) announced the partition of India', a: 'Mountbatten', f: 'The Mountbatten Plan (3 June Plan) proposed the partition of India into India and Pakistan, with independence on 15 August 1947.'},
  {q: 'The Indian Independence Act was passed by the British Parliament in the year _____', a: '1947', f: 'The Indian Independence Act 1947 was passed on 18 July 1947, providing for the partition of India and the creation of two dominions.'},
  {q: 'Who served as the last Viceroy of India and the first Governor-General of independent India?', a: 'Lord Mountbatten', f: 'Lord Mountbatten was the last Viceroy (1947) and served as the first Governor-General of independent India from 1947 to 1948.'},
  {q: 'The _____ Commission was appointed in 1947 to demarcate the boundary between India and Pakistan', a: 'Radcliffe', f: 'The Radcliffe Commission under Sir Cyril Radcliffe drew the boundary line dividing Punjab and Bengal between India and Pakistan.'},

  // --- Key Personalities (misc) ---
  {q: 'Who is known as the Father of the Indian Nation?', a: 'Mahatma Gandhi', f: 'Mahatma Gandhi (1869-1948) is revered as the Father of the Nation for his leadership in Indias freedom struggle through non-violent means.'},
  {q: 'Who was the first Indian to pass the ICS (Indian Civil Service) examination?', a: 'Satyendranath Tagore', f: 'Satyendranath Tagore was the first Indian to pass the ICS examination in 1863. He was the brother of Rabindranath Tagore.'},
  {q: '_____ was the first Indian woman president of the Indian National Congress', a: 'Annie Besant', f: 'Annie Besant was the first woman president of INC in 1917. Sarojini Naidu was the first Indian woman president in 1925.'},
  {q: '_____ founded the Secret Society of the Ghadar Party to overthrow British rule', a: 'Lala Hardayal', f: 'Lala Hardayal was one of the key founders of the Ghadar Party along with Sohan Singh Bhakna. He was a revolutionary intellectual.'},
  {q: 'Who wrote the book _____ (1909) which inspired revolutionary nationalism?', a: 'Hind Swaraj', f: 'Gandhi wrote Hind Swaraj (Indian Home Rule) in 1909 on his return from South Africa, criticizing modern civilization and British rule.'},
  {q: 'The _____ assassination (1907) was carried out by Khudiram Bose against British magistrate Kingsford', a: 'Muzaffarpur', f: 'Khudiram Bose and Prafulla Chaki attempted to assassinate Magistrate Kingsford in Muzaffarpur in 1908. Khudiram was executed.'},
  {q: '_____ was the founder of the Abhinav Bharat Society (1904)', a: 'Vinayak Damodar Savarkar', f: 'V. D. Savarkar founded the Abhinav Bharat Society in 1904 as a revolutionary organization. He was sentenced to life imprisonment in the Kakori case.'},
  {q: 'The _____ movement (1942-1944) in central India was led by the All India Kisan Sabha against feudal oppression', a: 'Telangana', f: 'The Telangana movement (1942-44) was a peasant uprising against the Nizam of Hyderabad, demanding land reforms and against feudal exploitation.'},
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
  console.error('Indian Independence Movement: ' + existing[CAT_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }

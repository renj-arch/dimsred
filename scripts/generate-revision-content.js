// Auto-generate UPSC revision content from existing data
// Usage: node scripts/generate-revision-content.js
//
// Two sources feed the output:
//   1. CURATED — hand-written, exam-ready content for core UPSC topics.
//   2. Auto-extraction — sourced from the timeline knowledge graph
//      (data/timeline.json + data/timeline.nodes.*.json): node summaries,
//      date spans, eras, subject tags and real typed relations. A topic-layers
//      fallback is only used for names when a topic has no timeline node.

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data');
var TOPIC_LAYERS = path.join(DATA_DIR, 'topic-layers.json');
var OUTPUT = path.join(DATA_DIR, 'revision-content.json');

// ---------------------------------------------------------------------------
// CURATED CONTENT — authoritative, exam-ready notes for core UPSC topics.
// Keys must match topic-layers.json topic names exactly.
// ---------------------------------------------------------------------------
var CURATED = {
  'revolt of 1857': {
    summary: 'The Revolt of 1857, also called the First War of Indian Independence, began on 10 May 1857 at Meerut when sepoys of the East India Company’s Bengal Army mutinied against the greased cartridge episode. It spread across northern India and ended Company rule, leading to the transfer of power to the British Crown in 1858.',
    bullets: [
      'Began at Meerut on 10 May 1857 when sepoy Mangal Pandey-type incidents and greased cartridges (rumoured to be smeared with cow and pig fat) triggered mutiny.',
      'Bahadur Shah Zafar was proclaimed Emperor of India at Delhi; he was later exiled to Rangoon and died there in 1862.',
      'Major centres and leaders: Delhi, Kanpur (Nana Saheb), Jhansi (Rani Lakshmibai), Lucknow (Begum Hazrat Mahal), Bareilly (Khan Bahadur Khan) and Arrah (Kunwar Singh).',
      'Rani Lakshmibai died fighting near Gwalior in June 1858; Tantia Tope was captured and hanged in 1859.',
      'The revolt remained limited — Punjab, Sindh, Bengal, the South and most of the Rajput states stayed loyal to the British.',
      'Aftermath: Government of India Act 1858 abolished the Company, brought India under the Crown through a Secretary of State and Viceroy, and reorganised the army to prevent further mutinies.'
    ],
    facts: [
      '10 May 1857 — revolt begins at Meerut',
      'Sep–Nov 1857 — fall of Delhi; Lucknow and Jhansi captured in 1858',
      '1858 — East India Company rule ends; India under the Crown',
      'Lord Canning was Governor-General during the revolt',
      '1859 — Parliament enacted the Government of India Act, 1858'
    ],
    comparisons: ['sepoy mutiny', 'indian independence movement']
  },

  'indian independence movement': {
    summary: 'The Indian independence movement (1857–1947) was the long struggle of the Indian people against British colonial rule. It began as constitutional petitions under the moderates, radicalised into mass movements under the extremists, and reached its peak under Mahatma Gandhi witnessed by the transfer of power on 15 August 1947.',
    bullets: [
      'The Indian National Congress (1885) initially worked for constitutional reforms through petitions and the demand for ICS examinations in India.',
      'Partition of Bengal (1905) and the Swadeshi movement radicalised politics; the Surat Split (1907) divided moderates and extremists.',
      'Gandhian era began with Champaran (1917), Kheda (1918) and Ahmedabad (1918), followed by Non-Cooperation (1920–22), Civil Disobedience (1930–31) and Quit India (1942).',
      'Revolutionaries like Bhagat Singh, Chandrashekhar Azad and Surya Sen inspired the youth; Subhas Chandra Bose raised the Azad Hind Fauj during World War II.',
      'The Royal Indian Navy mutiny (February 1946) and the Cabinet Mission (1946) hastened the British decision to leave India.',
      'India became independent on 15 August 1947 under the Indian Independence Act 1947, with the country partitioned into India and Pakistan.'
    ],
    facts: [
      '1885 — Indian National Congress founded',
      '1920 — Non-Cooperation Movement launched',
      '1930 — Dandi March begins Civil Disobedience',
      '1942 — Quit India Movement launched',
      '15 Aug 1947 — India gains independence'
    ],
    comparisons: ['non-cooperation movement', 'civil disobedience movement', 'quit india movement']
  },

  'non-cooperation movement': {
    summary: 'The Non-Cooperation Movement (1920–22), the first major nationwide Gandhian mass movement, combined the Khilafat grievance with the demand for Swaraj. It was launched on 1 August 1920 and withdrawn on 12 February 1922 after the Chauri Chaura incident.',
    bullets: [
      'Approved at the Calcutta special session (September 1920) and ratified at the Nagpur session (December 1920) of the INC.',
      'Launched on 1 August 1920 with Gandhi combining the Khilafat and Swaraj causes; renunciation of titles, surrender of law practice and boycott of legislatures, courts and foreign cloth.',
      'Thousands of students left government schools and colleges; lawyers such as C. R. Das and Motilal Nehru gave up practice.',
      'Withdrawn on 12 February 1922 by Gandhi after the violent Chauri Chaura incident (4 February 1922) in which a police station was burned.',
      'Though it failed to win Swaraj, it massively widened the nationalist base, spread khadi and weakened landlord-imperialist symbolism.',
      'Khilafat movement collapsed in 1924 after the Turkish Republic abolished the caliphate.'
    ],
    facts: [
      '1 Aug 1920 — movement launched',
      'Feb 1922 — Chauri Chaura incident',
      '12 Feb 1922 — movement withdrawn',
      'Nagpur session 1920 — ratified the programme'
    ],
    comparisons: ['civil disobedience movement', 'khilafat movement', 'quit india movement']
  },

  'civil disobedience movement': {
    summary: 'The Civil Disobedience Movement (1930–34) was Gandhi’s second great national mass movement, launched after the Lahore Congress demanded Purna Swaraj (December 1929). It began with the Salt March to Dandi in March–April 1930 and ruptured the empire’s moral authority.',
    bullets: [
      'Purna Swaraj resolution was passed at the Lahore Congress (December 1929) under Jawaharlal Nehru; 26 January 1930 was observed as Independence Day.',
      'Gandhi launched the movement by marching from Sabarmati Ashram to Dandi (12 March – 6 April 1930) and breaking the salt law.',
      'Satyagrahis boycotted foreign cloth, liquor and salt tax; manufactured salt at various coastal stretches.',
      'Gandhi–Irwin Pact (5 March 1931) suspended the movement and secured the right to make salt for domestic use and participation in the Second Round Table Conference.',
      'The movement was resumed around January 1932 after talks failed; Poona Pact (September 1932) settled the separate-electorate question for depressed classes.',
      'Officially withdrawn in May 1934.'
    ],
    facts: [
      'Dec 1929 — Purna Swaraj resolution at Lahore',
      '12 Mar 1930 — Dandi March begins',
      '5 Mar 1931 — Gandhi–Irwin Pact',
      'Sep 1932 — Poona Pact after civil disobedience resumption'
    ],
    comparisons: ['salt march', 'non-cooperation movement', 'dandi march']
  },

  'quit india movement': {
    summary: 'The Quit India Movement (8 August 1942), launched by Gandhi from Bombay on the AICC session, demanded immediate British withdrawal from India. The Cripps Mission’s failure had left the Congress frustrated; the call was “Do or Die”.',
    bullets: [
      'Launched on 8 August 1942 with Gandhi’s “Do or Die” call; the entire Congress leadership was arrested within hours.',
      'Mass uprisings followed across the country — strikes, attacks on railways, telegraph lines and police stations — especially in Bihar, Eastern UP and Bengal.',
      'Underground leaders like Aruna Asaf Ali, Jayaprakash Narayan and Ram Manohar Lohia ran parallel networks and a secret radio station.',
      'The British suppressed the revolt brutally; thousands were killed and lakhs imprisoned.',
      'Provincial governments, railways and administration carried on under the wartime emergency of World War II.',
      'The movement proved that British rule could not continue without Indian consent; the final transfer of power came five years later in 1947.'
    ],
    facts: [
      '8 Aug 1942 — Quit India resolution',
      '“Do or Die” — Gandhi’s slogan',
      '1942 — Cripps Mission had just failed',
      'By 1944 the rebellion was fully suppressed'
    ],
    comparisons: ['non-cooperation movement', 'civil disobedience movement', 'salt march']
  },

  'khilafat movement': {
    summary: 'The Khilafat movement (1919–24) was organised by Indian Muslims to protect the Ottoman caliphate after World War I. Gandhi linked it with the non-cooperation programme to forge Hindu–Muslim unity against the British.',
    bullets: [
      'Demanded that Britain safeguard the Ottoman Turkish emperor (Khalifa), the spiritual head of Sunni Muslims, after the defeat of Turkey in World War I.',
      'The Khilafat Committee formed under the Ali brothers (Shaukat and Mohammad Ali) and Maulana Abul Kalam Azad.',
      'Gandhi supported the Khilafat cause, making it the pivot of the Non-Cooperation Movement (1920).',
      'Turkey abolished the caliphate in 1924 under Atatürk, and the movement collapsed.',
      'It briefly achieved Hindu–Muslim unity but could not prevent the widening communal divide in later years.'
    ],
    facts: [
      '1919–24 — period of the movement',
      '1920 — linked with Non-Cooperation Movement',
      '1924 — caliphate abolished by Turkey'
    ],
    comparisons: ['non-cooperation movement', 'caliphate']
  },

  'partition of india': {
    summary: 'The Partition of India (June–August 1947) divided British India into India and Pakistan under the Mountbatten Plan of 3 June 1947. The Radcliffe Line demarcated boundaries on 17 August 1947 amid one of history’s largest and most violent transfers of population.',
    bullets: [
      'The 3 June Plan (Mountbatten Plan) was accepted by the Congress, the League and the Sikh leaders; the Indian Independence Act 1947 gave effect to it.',
      'Punjab and Bengal were partitioned; East Bengal became East Pakistan and West Punjab went to Pakistan.',
      'The Radcliffe Line, drawn by Sir Cyril Radcliffe, was announced on 17 August 1947, after both states had become independent.',
      'Massive forced migration of roughly 10–15 million people followed; communal violence killed lakhs.',
      'Punjab’s assets, army, and civil services were divided between the two dominions.',
      'Kashmir acceded to India in October 1947, leading to the first India–Pakistan war.'
    ],
    facts: [
      '3 Jun 1947 — Mountbatten Plan',
      '15 Aug 1947 — India independent',
      '17 Aug 1947 — Radcliffe Line announced',
      '1947 — first Indo-Pak war over Kashmir'
    ],
    comparisons: ['radcliffe line', 'indian independence movement']
  },

  'simon commission': {
    summary: 'The Simon Commission (1927–28), headed by Sir John Simon, was an all-white, seven-member British commission to review India’s constitutional progress. Its appointment, without a single Indian member, triggered nationwide protest with the slogan “Simon Go Back”.',
    bullets: [
      'Appointed in November 1927 to review the working of the Government of India Act 1919; all seven members were British.',
      'Boycotted across India with black flags and “Simon Go Back” slogans wherever it went.',
      'Lala Lajpat Rai was fatally lathi-charged during its protest at Lahore on 30 October 1928; he died on 17 November 1928.',
      'The boycott pressured the British to concede an Indian round table; the Nehru Report (1928) was drafted as India’s response.',
      'Its report (1930) fed into the three Round Table Conferences and eventually the Government of India Act 1935.'
    ],
    facts: [
      '1927 — all-white Commission appointed',
      'Oct 1928 — Lajpat Rai lathi-charged at Lahore',
      '1928 — Nehru Report in response'
    ],
    comparisons: ['neheru report', 'lala lajpat rai']
  },

  'salt march': {
    summary: 'The Salt March (12 March – 6 April 1930), also called the Dandi March, was Gandhi’s march from Sabarmati to Dandi to break the British salt monopoly. It inaugurated the Civil Disobedience Movement of 1930.',
    bullets: [
      'Gandhi chose salt as the symbol because the salt tax hit rich and poor alike and was enforced with a legal monopoly.',
      'Marched about 390 km (241 miles) from Sabarmati Ashram to Dandi on the Gujarat coast from 12 March to 6 April 1930.',
      'He broke the salt law ceremonially on 6 April 1930 at Dandi with 78 followers.',
      'The march attracted worldwide press coverage and energised civil disobedience across the coast.',
      'It led to the Gandhi–Irwin Pact (March 1931) and Gandhi’s participation in the Second Round Table Conference.'
    ],
    facts: [
      '12 Mar 1930 — march starts',
      '6 Apr 1930 — salt law broken at Dandi',
      '390 km — distance covered',
      '1931 — Gandhi–Irwin Pact'
    ],
    comparisons: ['civil disobedience movement', 'dandi march']
  },

  'dandi march': {
    summary: 'The Dandi March of 12 March – 6 April 1930 was Gandhi’s mahatma-led 390 km salt satyagraha to Dandi in Gujarat. By breaking the salt law, it launched the Civil Disobedience Movement.',
    bullets: [
      'Started from Sabarmati Ashram on 12 March 1930 with 78 followers.',
      'Walked over 24 days to reach Dandi, stopping in villages to spread the message of satyagraha.',
      'On 6 April 1930 Gandhi picked up natural salt, symbolically breaking the British salt law.',
      'The march was a masterstroke of symbolism that drew world attention and swelled the civil disobedience movement.'
    ],
    facts: [
      '12 Mar 1930 — departure from Sabarmati',
      '6 Apr 1930 — salt law broken',
      '78 followers accompanied Gandhi'
    ],
    comparisons: ['salt march', 'civil disobedience movement']
  },

  'jallianwala bagh massacre': {
    summary: 'The Jallianwala Bagh massacre of 13 April 1919 was the indiscriminate firing by British troops under Brigadier-General R. E. H. Dyer on a peaceful Baisakhi gathering in Amritsar. It is a watershed moment in the Indian freedom struggle.',
    bullets: [
      'On 13 April 1919 (Baisakhi day) a crowd had gathered in Jallianwala Bagh to protest the Rowlatt Act and arrests of leaders.',
      'General Dyer surrounded the only entrance and ordered continuous firing until ammunition ran out; official figures counted 379 dead, unofficial estimates exceeded 1,000.',
      'Dyer was investigated by the Hunter Committee and was eventually removed from his command.',
      'Rabindranath Tagore renounced his knighthood in protest; Gandhi suspended the Rowlatt satyagraha.',
      'Udham Singh later assassinated General Dyer in London in 1940 as retribution.'
    ],
    facts: [
      '13 Apr 1919 — massacre at Amritsar',
      '379+ officially killed; over 1,000 by many estimates',
      '1919 — Rowlatt Act protests led to the tragedy',
      '1940 — Udham Singh kills Dyer in London'
    ],
    comparisons: ['rowlatt act', 'salt march']
  },

  'swadeshi movement': {
    summary: 'The Swadeshi movement (1905–1911) arose in protest against the partition of Bengal in 1905 and urged the boycott of British goods and the use of indigenous products. It radicalised Indian nationalism under leaders like Lal, Bal and Pal.',
    bullets: [
      'Curzon’s partition of Bengal on 16 October 1905 into Bengal and Eastern Bengal–Assam provoked national outrage.',
      'The movement combined boycott of foreign cloth and salt with the promotion of swadeshi goods and national education.',
      'Leaders like Bal Gangadhar Tilak, Bipin Chandra Pal and Lala Lajpat Rai (Lal–Bal–Pal) gave it an extremist colour.',
      'Surat Split (1907) between moderates and extremists weakened the movement.',
      'Partition of Bengal was annulled in 1911 by King George V at the Delhi Durbar.'
    ],
    facts: [
      '16 Oct 1905 — partition of Bengal',
      '1905–1908 — peak Swadeshi phase',
      '1907 — Surat Split',
      '1911 — partition annulled'
    ],
    comparisons: ['indian national congress', 'partition of bengal']
  },

  'indian national congress': {
    summary: 'The Indian National Congress, founded on 28 December 1885 in Bombay by A. O. Hume, became the principal organ of India’s freedom struggle. It evolved from moderate constitutionalism to the mass movements of the Gandhian era.',
    bullets: [
      'First president was W. C. Bonnerjee; the founders included Dadabhai Naoroji, Ferozeshah Mehta and Surendranath Banerjee.',
      'Moderate phase (1885–1905): constitutional methods, petitions, and demand for ICS examinations in India.',
      'Extremist phase after 1905 pushed for Swaraj; the Surat Split (1907) divided the party, healed at Lucknow (1916).',
      'Lahore Session (1929) under Nehru declared Purna Swaraj (complete independence) as the goal.',
      'Under Gandhi the party led Non-Cooperation, Civil Disobedience and Quit India; the Quit India movement peaked in 1942.',
      'The Congress negotiated the transfer of power in 1947 as mass organisations nationwide accepted its leadership.'
    ],
    facts: [
      '28 Dec 1885 — founded at Bombay',
      '1907 — Surat split',
      '1929 — Purna Swaraj at Lahore',
      '1942 — Quit India resolution'
    ],
    comparisons: ['swadeshi movement', 'indian independence movement']
  },

  'constituent assembly of india': {
    summary: 'The Constituent Assembly of India, elected in 1946 on the Cabinet Mission scheme, drafted the Constitution over almost three years. It adopted the Constitution on 26 November 1949 and brought it into force on 26 January 1950.',
    bullets: [
      'First met on 9 December 1946; Dr Sachchidananda Sinha was the temporary president and Dr Rajendra Prasad was elected permanent president.',
      'Nehru moved the Objective Resolution (13 December 1946, adopted 22 January 1947) which guided the draft.',
      'The Drafting Committee under B. R. Ambedkar was formed on 29 August 1947.',
      'Took 2 years, 11 months and 18 days; met for 11 sessions over roughly 165 days.',
      'Constitution was adopted on 26 November 1949 and came into force on 26 January 1950, making India a republic.',
      'It borrowed features from many constitutions — parliamentary system from Britain, fundamental rights from the USA, directive principles from Ireland.'
    ],
    facts: [
      '9 Dec 1946 — first sitting',
      '26 Nov 1949 — Constitution adopted',
      '26 Jan 1950 — Constitution in force',
      'B. R. Ambedkar led the Drafting Committee'
    ],
    comparisons: ['b. r. ambedkar', 'indian independence movement']
  },

  'champaran satyagraha': {
    summary: 'The Champaran Satyagraha (April 1917) was Mahatma Gandhi’s first civil disobedience campaign in India. It secured a commission of inquiry into the oppressive tinkathia indigo-planting system of British planters in Bihar.',
    bullets: [
      'Began on 10 April 1917 when Gandhi, invited by peasant Rajkumar Shukla, reached Champaran in Bihar to investigate the indigo tinkathia system.',
      'The tinkathia system forced ryots to grow indigo on a fixed 3/20ths (tinkathia) of their land for the planters.',
      'Gandhi was ordered to leave Champaran by the district magistrate but refused; he was tried and asked to enter a civil disobedience plea.',
      'The government formed a Commission of Inquiry with Gandhi as a member; the tinkathia system was abolished.',
      'Champaran established the method of satyagraha and made Champaran the laboratory of Gandhi’s political technique.'
    ],
    facts: [
      'Apr 1917 — Champaran satyagraha',
      'Tinkathia system — 3/20 of land to indigo',
      'Rajkumar Shukla brought Gandhi to Champaran'
    ],
    comparisons: ['mahatma gandhi', 'satyagraha']
  },

  'ghadar movement': {
    summary: 'The Ghadar movement (1913–1917) was a revolutionary movement of Indian émigrés, chiefly in North America, aimed at overthrowing British rule. Its secret organisation and newspaper, both called “Ghadar”, planned an armed rebellion during World War I.',
    bullets: [
      'Founded in 1913 in San Francisco (California) by Lala Har Dayal along with Indians in the USA and Canada.',
      'Newspaper “Ghadar” (lit. Mutiny) was published in Urdu and Punjabi and smuggled into India.',
      'Ghadarites tried to instigate a mutiny in the Indian Army during World War I in February 1915, coordinated with Rash Behari Bose.',
      'The Komagata Maru incident (1914), in which 400 Indians were turned back from Canada, inflamed the community.',
      'The plot failed because of British intelligence, and many leaders were hanged, including Kartar Singh Sarabha.',
      'Although crushed, it kept the flame of armed revolution alive and influenced later revolutionaries.'
    ],
    facts: [
      '1913 — Ghadar Party founded in San Francisco',
      '1914 — Komagata Maru incident',
      '1915 — failed February uprising'
    ],
    comparisons: ['azad hind fauj', 'revolutionary movement']
  },

  'azad hind fauj': {
    summary: 'The Azad Hind Fauj (Indian National Army, INA) was raised during World War II from Indian prisoners of war with Japanese help. Revived and led by Subhas Chandra Bose from 1943, it fought for India’s freedom under the Azad Hind provisional government.',
    bullets: [
      'First formed in 1942 in Singapore by Captain Mohan Singh with Japanese aid, and later reorganised by Subhas Chandra Bose in 1943.',
      'Bose assumed command in July 1943 with the slogan “Give me blood, I will give you freedom” and “Chalo Delhi”.',
      'The Azad Hind provisional government was proclaimed in October 1943; it had its own currency, bank and civilian wing.',
      'The INA fought alongside Japanese forces in Burma and advanced to Kohima and Imphal before retreating.',
      'Bose disappeared in a reported plane crash on 18 August 1945 over Taiwan.',
      'The INA trials (1945–46) and the Royal Indian Navy mutiny (1946) shook the British and hastened Indian independence.'
    ],
    facts: [
      '1942 — INA formed at Singapore',
      '1943 — Bose takes command',
      '18 Aug 1945 — Bose’s plane crash',
      '1945–46 — Red Fort INA trials'
    ],
    comparisons: ['subhas chandra bose', 'indian independence movement']
  },

  'anglo-mysore wars': {
    summary: 'The four Anglo-Mysore wars (1767–99) were fought between the British East India Company and the Kingdom of Mysore under Hyder Ali and his son Tipu Sultan. Tipu’s defeat in the Fourth War (1799) extinguished Mysore as a threat to the Company.',
    bullets: [
      'First war (1767–69): Hyder Ali defeated the combined forces of the British, Nizam and Marathas; Treaty of Madras (1769).',
      'Second war (1780–84): Hyder Ali and Tipu fought the British; Treaty of Mangalore (1784) restored the status quo.',
      'Third war (1790–92): Cornwallis defeated Tipu; Tipu surrendered half his territories under the Treaty of Seringapatam (1792).',
      'Fourth war (1799): Wellesley launched the final offensive; Tipu Sultan died defending Seringapatam on 4 May 1799.',
      'Mysore was restored to the Wodeyar dynasty with a subsidiary alliance, ending Mysorean power.'
    ],
    facts: [
      '1st war 1767–69 — Treaty of Madras',
      '2nd war 1780–84 — Treaty of Mangalore',
      '3rd war 1790–92 — Treaty of Seringapatam',
      '4th war 1799 — Tipu dies at Seringapatam'
    ],
    comparisons: ['tipu sultan', 'anglo-maratha wars']
  },

  'anglo-maratha wars': {
    summary: 'The three Anglo-Maratha wars (1775–1818) broke the Maratha confederacy and made the British paramount in India. The Third Maratha War (1817–18) ended Maratha sovereignty and placed Peshwa Baji Rao II under British protection at Bithur.',
    bullets: [
      'First war (1775–82): ended with the Treaty of Salbai (1782); nothing was gained or lost by either side.',
      'Second war (1803–05): after the Treaty of Bassein (1802) between the Company and forced-out Peshwa Baji Rao II, Weilley defeated the Scindia and Bhonsle forces.',
      'Third war (1817–18): final struggle against the Peshwa, Bhonsle, Holkar and the Pindaris; Maratha power was destroyed.',
      'Baji Rao II surrendered in 1818 and was pensioned at Bithur near Kanpur.',
      'The wars ended the dream of Maratha hegemony in India and left the East India Company as the paramount power.'
    ],
    facts: [
      '1st war 1775–82 — Treaty of Salbai',
      '1802 — Treaty of Bassein',
      '3rd war 1817–18 — Maratha power ended',
      '1818 — Baji Rao II pensioned'
    ],
    comparisons: ['anglo-mysore wars', 'maratha empire']
  },

  'mahatma gandhi': {
    summary: 'Mohandas Karamchand Gandhi (1869–1948), the “Father of the Nation”, led India’s freedom struggle through satyagraha and non-violence. His campaigns—Champaran, Non-Cooperation, Civil Disobedience and Quit India—transformed the movement into a mass struggle.',
    bullets: [
      'Born 2 October 1869 at Porbandar (Gujarat); studied law in London and developed his Satyagraha method in South Africa (1893–1914).',
      'Returned to India in 1915; his first experiments were Champaran (1917), Kheda (1918) and Ahmedabad (1918).',
      'Led Non-Cooperation (1920–22), Civil Disobedience via the Dandi March (1930) and Quit India (1942).',
      'Core teaching: Satya (truth), Ahimsa (non-violence), Satyagraha (truth-force), Swaraj (self-rule) and trusteeship.',
      'He fought against untouchability (calling Harijans “Harijan”), championed the spinning wheel (khadi) and Hindu–Muslim unity.',
      'Assassinated by Nathuram Godse on 30 January 1948; his favourite hymn “Raghupati Raghava” and observation of silence are remembered.'
    ],
    facts: [
      '2 Oct 1869 — born at Porbandar',
      '1893–1914 — South Africa years',
      '1917 — Champaran Satyagraha',
      '1948 — assassinated on 30 January'
    ],
    comparisons: ['champaran satyagraha', 'non-cooperation movement', 'civil disobedience movement']
  },

  'b. r. ambedkar': {
    summary: 'Bhimrao Ramji Ambedkar (1891–1956) was the principal architect of the Indian Constitution and the greatest champion of Dalit rights. He is revered as the “Father of the Constitution”.',
    bullets: [
      'Born 14 April 1891 into a Mahar (untouchable) family at Mhow (MP); he fought caste discrimination throughout life.',
      'Educated at Columbia University and the London School of Economics; one of India’s first Dalit doctorate holders.',
      'Led the Mahad satyagraha (1927) for access to water and the Kalaram temple entry movement (1930).',
      'Opposed separate electorates for the depressed classes in the Communal Award, leading to the Poona Pact (September 1932) with Gandhi.',
      'Chairman of the Drafting Committee of the Constituent Assembly, he is called the “Father of the Indian Constitution”.',
      'Authored “Annihilation of Caste” (1936); converted to Buddhism in 1956; died 6 December 1956 (Mahaparinirvan Diwas).'
    ],
    facts: [
      '14 Apr 1891 — birth',
      '1927 — Mahad satyagraha',
      '1932 — Poona Pact',
      '6 Dec 1956 — death'
    ],
    comparisons: ['constituent assembly of india', 'mahatma gandhi']
  },

  'jawaharlal nehru': {
    summary: 'Jawaharlal Nehru (1889–1964) was the first Prime Minister of India (1947–64) and a leading figure of the freedom struggle. He anchored planning, non-alignment and parliamentary democracy in India.',
    bullets: [
      'Born 14 November 1889 at Allahabad; educated at Harrow and Cambridge; Gandhi’s close lieutenant and chosen successor.',
      'President of the INC at the Lahore session (1929) which adopted the Purna Swaraj goal; raised the tricolour on the Ravi on 31 December 1929.',
      'Drafted the Nehru Report (1928), the first Indian blueprint for dominion-status constitution.',
      'His “Tryst with Destiny” speech (14–15 August 1947) inaugurated independent India.',
      'Set up the Planning Commission (1950) and led the First and Second Five-Year Plans; championed science, industry and non-alignment (Panchsheel, 1954).',
      'Died 27 May 1964; his daughter Indira Gandhi became Prime Minister in 1966.'
    ],
    facts: [
      '14 Nov 1889 — birth',
      '1929 — Lahore session Purna Swaraj',
      '1950 — Planning Commission set up',
      '27 May 1964 — death'
    ],
    comparisons: ['mahatma gandhi', 'indian national congress']
  },

  'sardar vallabhbhai patel': {
    summary: 'Vallabhbhai Patel (1875–1950), the “Iron Man of India”, was Deputy Prime Minister and Home Minister who integrated over 500 princely states into the Indian Union. His Bardoli satyagraha (1928) gave him the title “Sardar”.',
    bullets: [
      'Born 31 October 1875 at Nadiad (Gujarat); a barrister who joined Gandhi during the Kheda satyagraha (1918).',
      'Led the Bardoli satyagraha (1928) against a 30% land revenue hike; the women gave him the title “Sardar”.',
      'As Home Minister and Deputy PM, he integrated 562 princely states into the Union by diplomacy and pressure.',
      'Operation Polo (September 1948) annexed Hyderabad; Junagadh was first militarily and then merged.',
      'Known for strict discipline, he is often remembered as the architect of a united India.',
      'The Statue of Unity (182 m) at Kevadia, Gujarat, was inaugurated in 2018 paying tribute to him.'
    ],
    facts: [
      '31 Oct 1875 — birth',
      '1928 — Bardoli satyagraha',
      '1948 — Operation Polo annexes Hyderabad',
      '2018 — Statue of Unity inaugurated'
    ],
    comparisons: ['bardoli satyagraha', 'mahatma gandhi']
  },

  'subhas chandra bose': {
    summary: 'Subhas Chandra Bose (1897–1945), called “Netaji”, was a charismatic nationalist leader who raised the Azad Hind Fauj during World War II to win India’s freedom by force. He believed in armed struggle and defiance of British rule.',
    bullets: [
      'Born 23 January 1897 at Cuttack; a brilliant ICS candidate who resigned to join the national movement.',
      'Served as INC president at Haripura (1938) and Tripuri (1939), resigning over differences on the Working Committee.',
      'Founded the Forward Bloc (1939) within the Congress; escaped house arrest in January 1941 and reached Germany.',
      'Took command of the Indian National Army in Singapore in July 1943 with slogans “Jai Hind” and “Delhi Chalo”.',
      'His death in a plane crash on 18 August 1945 over Taiwan remains debated; his record “Give me blood and I will give you freedom” is legendary.',
      'His birthday (23 January) is observed as Parakram Diwas.'
    ],
    facts: [
      '23 Jan 1897 — birth',
      '1939 — Forward Bloc founded',
      '1943 — INA command',
      '18 Aug 1945 — reported death'
    ],
    comparisons: ['azad hind fauj', 'indian national congress']
  },

  'bal gangadhar tilak': {
    summary: 'Bal Gangadhar Tilak (1856–1920), the “Lokmanya”, was a leading extremist nationalist who declared “Swaraj is my birthright and I shall have it”. He used festivals and newspapers to mobilise the masses.',
    bullets: [
      'Born 23 July 1856 at Ratnagiri; became a prominent Marathi journalist through “Kesari” and “The Maratha”.',
      'Promoted the Ganpati and Shivaji festivals (1893–96) to mobilise public sentiment.',
      'Imprisoned (1897) after the Chapekar killings; sentenced in 1908 for sedition to six years at Mandalay.',
      'Founded the Home Rule League (April 1916) with Annie Besant to press for self-government.',
      'Wrote the “Gita Rahasya”; the Lucknow Pact (1916) owed much to his joint efforts with the Muslim League.',
      'Coined the slogan “Swaraj is my birthright and I shall have it.”'
    ],
    facts: [
      '23 Jul 1856 — birth',
      '1916 — Home Rule League founded',
      '1908 — six years’ imprisonment at Mandalay'
    ],
    comparisons: ['gopal krishna gokhale', 'lala lajpat rai']
  },

  'gopal krishna gokhale': {
    summary: 'Gopal Krishna Gokhale (1866–1915) was a leading moderate nationalist, social reformer and mentor of Gandhi. He believed in constitutional methods and gradual reforms.',
    bullets: [
      'Born 9 May 1866 at Kothagud (Maharashtra); a disciple of Ranade and a member of the imperial legislative council.',
      'Founded the Servants of India Society (1905) for national service.',
      'Worked with the Congress moderates for constitutional reforms; supported the Minto–Morley Reforms (1909).',
      'Gandhi called him his “political guru”.',
      'His programme of reforms ran on Indianising higher education, moderating land revenue and expanding railways ethically.'
    ],
    facts: [
      '1866 — birth',
      '1905 — Servants of India Society',
      '1909 — Minto–Morley reforms',
      '1915 — death'
    ],
    comparisons: ['bal gangadhar tilak', 'mahatma gandhi']
  },

  'bhagat singh': {
    summary: 'Bhagat Singh (1907–1931) was a revolutionary socialist martyr who gave his life in the struggle against British rule. His hunger strike in jail and his trial made him an icon of the youth.',
    bullets: [
      'Born 27 September 1907 at Lyallpur; influenced by the Jallianwala Bagh massacre as a boy.',
      'Founded the Naujawan Bharat Sabha (1926) and worked with the Hindustan Socialist Republican Association (HSRA).',
      'Retaliated for Lala Lajpat Rai’s death by assassinating police officer J. P. Saunders (17 December 1928) in Lahore.',
      'With Batukeshwar Dutt he threw a smoke bomb in the Central Legislative Assembly (8 April 1929) and courted arrest.',
      'Observed a long hunger strike for better treatment of political prisoners; drafted radical essays on revolution and socialism.',
      'Hanged on 23 March 1931 at Lahore with Rajguru and Sukhdev; the day is observed as Shaheed Diwas.'
    ],
    facts: [
      '27 Sep 1907 — birth',
      '8 Apr 1929 — assembly protest',
      '23 Mar 1931 — hanged with Rajguru and Sukhdev'
    ],
    comparisons: ['chandra shekhar azad', 'lala lajpat rai']
  },

  'mohammad ali jinnah': {
    summary: 'Mohammad Ali Jinnah (1876–1948), the “Quaid-e-Azam”, was the leader of the Muslim League and the founding father of Pakistan. His two-nation theory and Lahore Resolution (1940) laid the basis for partition.',
    bullets: [
      'Born 25 December 1876 at Karachi; a successful barrister in Bombay and early Congress member.',
      'Joined the Muslim League (1913); brought Congress and League together in the Lucknow Pact (1916) as “Ambassador of Hindu–Muslim Unity”.',
      'The Lahore Resolution (March 1940) demanded separate Muslim-majority states — later called Pakistan.',
      'Rejected the Cabinet Mission Plan (1946) and called “Direct Action” (16 August 1946) which sparked the Calcutta killings.',
      'Accepted the Mountbatten Plan in 1947 and became the first Governor-General of Pakistan.',
      'His spirited advocacy of two nations is credited with the creation of Pakistan.'
    ],
    facts: [
      '25 Dec 1876 — birth',
      '1916 — Lucknow Pact',
      '1940 — Lahore Resolution',
      '1947 — first Governor-General of Pakistan'
    ],
    comparisons: ['mahatma gandhi', 'partition of india']
  },

  'indus valley civilization': {
    summary: 'The Indus Valley (Harappan) civilization (c. 2600–1900 BCE mature phase) was India’s first urban civilization, spread across the Indus and Saraswati basins. Its planned cities, drainage and undeciphered script mark its greatness.',
    bullets: [
      'Major sites: Harappa (1921) and Mohenjo-daro (1922) in Pakistan; Dholavira and Lothal in Gujarat; Kalibangan (Rajasthan) and Rakhigarhi (Haryana) in India.',
      'Grid-planned cities with brick-houses, covered drains, citadel and lower town; the Great Bath at Mohenjo-daro is iconic.',
      'Agriculture, trade with Mesopotamia (Magan and Dilmun), cubical weights and seals; bronze and terracotta crafts flourished.',
      'The dancing-girl bronze and the Pashupati-style seal are among the most famous artefacts.',
      'The writings remain undeciphered; the decline (c. 1900 BCE) is linked to climatic and river-shift factors.',
      'It was a Bronze Age civilization with no evidence of large-scale weapons, armies or temples.'
    ],
    facts: [
      'c. 2600–1900 BCE — mature Harappan phase',
      '1921 — Harappa excavated',
      '1922 — Mohenjo-daro excavated',
      'Dholavira and Lothal are in India (Gujarat)'
    ],
    comparisons: ['vedic period', 'mohenjo-daro']
  },

  'vedic period': {
    summary: 'The Vedic age (c. 1500–600 BCE) saw the migration of Indo-Aryan tribes into India and the composition of the Vedas. It is divided into the early Rigvedic and the later Vedic phases with the movement towards cities and states.',
    bullets: [
      'Early Vedic period (c. 1500–1000 BCE): the Rigveda, composed in the Punjab–Sindh region, records tribes (janas) like the Bharatas and Purus.',
      'The Rigvedic society was tribal and pastoral; cows were the unit of value; the sabha and samiti were early assemblies.',
      'The later Vedic period (c. 1000–600 BCE) saw iron (shyama ayas), settled agriculture, and the growth of janapadas and mahajanapadas.',
      'The four Vedas — Rig, Yajur, Sama and Atharva — are the oldest literary sources.',
      'The varna (social) order, gotra system and early kingdoms developed; Kuru and Panchala became prominent.',
      'The end of the Vedic period (c. 600 BCE) saw the rise of cities, the Buddha period and the 16 mahajanapadas.'
    ],
    facts: [
      'c. 1500 BCE — Rigvedic phase begins',
      'c. 1000 BCE — later Vedic phase (iron age)',
      'Four Vedas: Rig, Yajur, Sama, Atharva',
      '16 mahajanapadas by c. 600 BCE'
    ],
    comparisons: ['indus valley civilization', 'janapadas', 'mahajanapadas']
  },

  'maurya empire': {
    summary: 'The Maurya Empire (321–185 BCE) was the first great pan-Indian empire, founded by Chandragupta Maurya with the counsel of Chanakya. Under Ashoka it reached its greatest extent and influence.',
    bullets: [
      'Founded by Chandragupta Maurya in 321 BCE after destroying the Nanda dynasty; Kautilya (Chanakya) authored the Arthashastra.',
      'Capital at Pataliputra (Patna); Megasthenes, the Greek envoy of Seleucus Nicator, wrote the Indica describing it.',
      'Selective treaties with Seleucus (305 BCE) extended the empire west up to the Hindu Kush.',
      'Ashoka conquered Kalinga (261 BCE) and thereafter turned to Dhamma (righteous rule) and non-violence.',
      'The Sarnath Lion Capital became the national emblem; Ashokan pillars and edicts survive across the subcontinent.',
      'The empire declined after Ashoka; the last ruler Brihadratha was killed by his general Pushyamitra in 185 BCE.'
    ],
    facts: [
      '321 BCE — founding',
      '261 BCE — Kalinga war',
      '185 BCE — end of dynasty',
      'Arthashastra — Chanakya’s manual'
    ],
    comparisons: ['chandragupta maurya', 'ashoka', 'gupta empire']
  },

  'ashoka': {
    summary: 'Ashoka (r. c. 268–232 BCE), the third Mauryan emperor, converted to Buddhism after the Kalinga war and propagated Dhamma through edicts. He is remembered as the greatest imperial patron of Buddhism.',
    bullets: [
      'Grandson of Chandragupta and son of Bindusara; became emperor c. 268 BCE.',
      'The brutal Kalinga war (261 BCE) turned his heart; he embraced Buddhism under Upagupta/Moggaliputta-Tissa tradition.',
      'Propagated Dhamma — toleration, non-violence and welfare — through rock and pillar edicts in Prakrit, Brahmi and Kharosthi.',
      'Sent missionaries to Sri Lanka, Burma, and as far west as the Mediterranean world; his own son Mahinda went to Ceylon.',
      'The Sarnath Pillar’s Lion Capital is India’s national emblem; the Ashoka Chakra on the flag is from his pillars.',
      'Held the Third Buddhist Council at Pataliputra (c. 250 BCE) under Moggaliputta Tissa.'
    ],
    facts: [
      'r. c. 268–232 BCE',
      '261 BCE — Kalinga war',
      'Dhamma via rock and pillar edicts',
      'Third Buddhist Council at Pataliputra'
    ],
    comparisons: ['kalinga war', 'maurya empire', 'buddhism']
  },

  'kalinga war': {
    summary: 'The Kalinga war (261 BCE) between Ashoka and the Kalinga state of Odisha was the turning point that converted the emperor to Buddhism and non-violence. It is considered one of the most significant wars in Indian history for its moral consequences.',
    bullets: [
      'Fought around 261 BCE between Ashoka’s Mauryan forces and the independent kingdom of Kalinga (modern Odisha coast).',
      'The war was brutal — Ashoka’s own edicts record 1,50,000 deported, 1,00,000 killed and many more dead.',
      'Asoka was horrified by the destruction and embraced Dhamma, dedicating his rule to non-violence and welfare.',
      'Kalinga was annexed but governed through righteous administration; the Ashokan edicts elaborate the change of heart.',
      'The war illustrates both the empire’s might and the birth of moral kingship.'
    ],
    facts: [
      '261 BCE — year of the war',
      '1,00,000 killed per Ashoka’s edicts',
      'Led Ashoka to embrace Buddhism'
    ],
    comparisons: ['ashoka', 'maurya empire']
  },

  'gupta empire': {
    summary: 'The Gupta Empire (c. 320–550 CE), initiated by Chandragupta I, is regarded as the Golden Age of classical India. It witnessed momentous achievements in science, mathematics, art and literature.',
    bullets: [
      'Founded by Chandragupta I (c. 320 CE), whose marriage alliance with the Licchavis strengthened the empire; he adopted the title Maharajadhiraja.',
      'Samudragupta (r. c. 335–375 CE) expanded the empire from the Ganga valley to the Deccan; V. A. Smith called him the “Napoleon of India”.',
      'Chandragupta II (Vikramaditya) conquered the western Sakas and patronised the navratna scholars.',
      'Golden Age contributions: Aryabhata (mathematics, astronomy), Varahamihira, Sushruta’s surgery, Kalidasa’s plays, and the Ajanta–Gupta art.',
      'The Chinese traveller Fa-Hien (Faxian) visited during Chandragupta II’s reign and described prosperous governance.',
      'The empire declined under later sovereigns after the Huna invasions around 500–550 CE.'
    ],
    facts: [
      'c. 320 CE — Chandragupta I founds empire',
      'Samudragupta — “Napoleon of India”',
      'Golden age of science and art',
      'Fa-Hien visited during Chandragupta II'
    ],
    comparisons: ['maurya empire', 'chandragupta ii', 'samudragupta']
  },

  'chandragupta maurya': {
    summary: 'Chandragupta Maurya (r. c. 321–297 BCE) founded the Maurya Empire, aided by Chanakya. He is credited with the conquest of the Nandas and the creation of India’s first great unified empire.',
    bullets: [
      'Overthrew the Nanda dynasty (c. 321 BCE) with the help of Chanakya (Kautilya) as his minister and strategist.',
      'His empire stretched across the Gangetic plain, Punjab and parts of the Deccan, with Pataliputra as capital.',
      'Defeated the Greek general Seleucus Nicator c. 305 BCE; Megasthenes came as the Greek envoy and wrote the Indica.',
      'Adopted Jainism in his last years; he is said to have breathed his last at Shravanabelagola by sallekhana (fast unto death).',
      'The Arthashastra attributed to Chanakya describes the rigorous state machinery of his empire.'
    ],
    facts: [
      'r. c. 321–297 BCE',
      'c. 305 BCE — treaty with Seleucus',
      'Megasthenes — Greek ambassador (Indica)',
      'Guru/mentor — Chanakya'
    ],
    comparisons: ['maurya empire', 'ashoka', 'chanakya']
  },

  'delhi sultanate': {
    summary: 'The Delhi Sultanate (1206–1526) was a series of five Islamic dynasties ruling from Delhi — Slave, Khalji, Tughlaq, Sayyid and Lodi. It ended when Babur defeated Ibrahim Lodi at the First Battle of Panipat in 1526.',
    bullets: [
      'Founded by Qutbuddin Aibak in 1206 after the Ghurid conquests; the Slave dynasty produced Iltutmish and later Razia Sultana.',
      'Alauddin Khalji (1296–1316) repelled the Mongols, fixed market prices and expanded to the Deccan.',
      'Muhammad bin Tughlaq shifted the capital to Daulatabad (1327) and introduced token currency — both failed.',
      'The Sayyid dynasty (1414–51) and Lodi dynasty (1451–1526) ruled a shrinking Sultanate.',
      'Ibrahim Lodi was defeated at Panipat (1526) by Babur, ending the Sultanate.',
      'The Sultanate introduced new revenue systems (iqta), reached widespread inter-regional trade, and employed Persianised administration.'
    ],
    facts: [
      '1206 — Aibak founds the Sultanate',
      '1327 — Tughlaq moves capital to Daulatabad',
      '1526 — Babur defeats Ibrahim Lodi at Panipat'
    ],
    comparisons: ['mughal empire', 'alauddin khilji', 'muhammad bin tughlaq']
  },

  'mughal empire': {
    summary: 'The Mughal Empire (1526–1857) was founded by Babur after the First Battle of Panipat and reached its zenith under Akbar, Jahangir, Shah Jahan and Aurangzeb. Its decline after 1707 paved the way for British ascendancy.',
    bullets: [
      'Babur defeated Ibrahim Lodi in 1526 at Panipat; Akbar expanded and consolidated the empire.',
      'Akbar’s policies — religious tolerance (sulh-i-kul), abolition of jizya (1564), mansabdari system and Din-i-Ilahi (1582).',
      'Shah Jahan’s reign gave the Taj Mahal (1632–1653), Jama Masjid and the Red Fort; the golden age of Indo-Persian art.',
      'Aurangzeb (1658–1707) extended the empire to its largest extent but overstretched it with Deccan wars and orthodoxy.',
      'The empire declined after 1707 under later emperors, with Marathas, Sikhs, Jats and the British rising.',
      'The last emperor Bahadur Shah Zafar was exiled after the Revolt of 1857, ending the dynasty.'
    ],
    facts: [
      '1526 — Battle of Panipat I',
      '1564 — jizya abolished by Akbar',
      '1632–1653 — Taj Mahal built',
      '1857 — empire ends with Bahadur Shah Zafar'
    ],
    comparisons: ['akbar', 'shah jahan', 'aurangzeb', 'delhi sultanate']
  },

  'akbar': {
    summary: 'Akbar (r. 1556–1605) was the greatest Mughal emperor, who built a vast empire through conquest and diplomacy and synthesised an inclusive imperial culture. He is celebrated for religious tolerance and administrative reforms.',
    bullets: [
      'Ascended at 13; the regent Bairam Khan defeated Hemu at the Second Battle of Panipat (1556).',
      'Won the loyalty of Rajput houses through marriage alliances and honourable service.',
      'Defeated Maharana Pratap at Haldighati (1576), though the field victory did not end Mewar’s resistance.',
      'Introduced the mansabdari (rank-holding) system, land revenue reforms (Todar Mal) and a uniform coinage.',
      'Built the Ibadat Khana (1575–78) for religious discussions and proclaimed Din-i-Ilahi (1582) from the principle of sulh-i-kul.',
      'Abolished jizya (1564) and promoted an all-India nobility of Hindus and Muslims; his Navratnas included Todar Mal and Birbal.'
    ],
    facts: [
      'r. 1556–1605',
      '1556 — Second Battle of Panipat',
      '1564 — jizya abolished',
      '1576 — Battle of Haldighati'
    ],
    comparisons: ['mughal empire', 'shivaji', 'shah jahan']
  },

  'shivaji': {
    summary: 'Shivaji Bhosale (1630–1680) founded an independent Maratha kingdom and the Maratha navy, defying the Adilshahi and the Mughal empire. He was crowned Chhatrapati at Raigad in 1674.',
    bullets: [
      'Born 19 February 1630 at Shivneri fort near Pune; father Shahaji served the Deccan sultanates.',
      'Conquered Torna fort (1646) and later built a string of forts including Raigad and Pratapgad.',
      'Killed the Adilshahi general Afzal Khan at Pratapgad (1659) in a celebrated encounter.',
      'Sneaked into Pune and cut off Shaista Khan’s fingers (1663); raided Surat (1664, 1670).',
      'Signed the Treaty of Purandar (1665) with Raja Jai Singh I; his famous escape from Agra (1666) is legendary.',
      'Crowned Chhatrapati at Raigad on 6 June 1674; established the ashtapradhan (eight-minister) council and a navy.'
    ],
    facts: [
      '19 Feb 1630 — birth',
      '1659 — Afzal Khan killed at Pratapgad',
      '6 Jun 1674 — coronation at Raigad',
      'Ashtapradhan — eight-minister council'
    ],
    comparisons: ['maratha empire', 'mughal empire', 'aurangzeb']
  },

  'maratha empire': {
    summary: 'The Maratha empire, founded by Shivaji in the 17th century, became the dominant power in India by the mid-18th century under the Peshwas. Its defeat at the Third Battle of Panipat (1761) and the Anglo-Maratha wars gradually ended its sway.',
    bullets: [
      'Rise began with Shivaji’s kingdom in Maharashtra; after his death (1680) the Bhonsle family and the Peshwa rose.',
      'Balaji Vishwanath became the first Peshwa (1713); his son Baji Rao I (1720–40) carried the Maratha banner north and made Pune the capital.',
      'The Marathas captured Delhi (1737-58 era) and dominated north India, extracting chauth and sardeshmukhi.',
      'Third Battle of Panipat (14 January 1761): Ahmad Shah Abdali crushed the Marathas; Sadashivrao Bhau died.',
      'Under Madhavrao and later Mahadji Scindia, the confederacy revived but was split among Scindia, Holkar, Bhonsle and Gaekwad houses.',
      'The Anglo-Maratha wars (1775–1818) ended Maratha power; the last Peshwa Baji Rao II was pensioned in 1818.'
    ],
    facts: [
      '1674 — Chhatrapati Shivaji crowned',
      '1761 — Third Battle of Panipat',
      '1818 — Peshwa rule ends',
      'Chauth and sardeshmukhi — Maratha levies'
    ],
    comparisons: ['shivaji', 'third battle of panipat', 'anglo-maratha wars']
  },

  'vijayanagara empire': {
    summary: 'The Vijayanagara Empire (1336–1646), ruled from Hampi on the Tungabhadra, was the most powerful kingdom of south India, patronising art, architecture and temple culture. Its greatest king was Krishnadevaraya.',
    bullets: [
      'Founded in 1336 by Harihara and Bukka of the Sangama dynasty, likely under the guidance of sage Vidyaranya.',
      'Capital Hampi (Karnataka) is today a UNESCO World Heritage Site known for its grand temples and bazaars.',
      'Krishnadevaraya (1509–29) of the Tuluva dynasty was the greatest ruler — the “Andhra Bhoja”; he defeated the Deccan sultanates and patronised Telugu literature.',
      'The empire followed the amara-nayaka system of provinces with local military governors.',
      'Defeated at the Battle of Talikota (1565) by a coalition of the Deccan sultanates; Hampi was sacked.',
      'Successor dynasties (Tuluva and Aravidu) ruled a declining kingdom until 1646.'
    ],
    facts: [
      '1336 — founding at Hampi',
      '1509–29 — reign of Krishnadevaraya',
      '1565 — Battle of Talikota',
      'Hampi — UNESCO World Heritage Site'
    ],
    comparisons: ['battle of talikota', 'krishnadevaraya']
  },

  'lpg reforms': {
    summary: 'The LPG reforms of 1991 liberalised, privatised and globalised the Indian economy in response to the balance-of-payments crisis. Under PM Narasimha Rao and Finance Minister Manmohan Singh, India dismantled the licence-permit raj and opened markets.',
    bullets: [
      'Triggered by the 1991 balance-of-payments crisis when foreign exchange reserves fell to about two weeks of imports.',
      'Finance Minister Manmohan Singh devalued the rupee, pledged gold with the IMF (47 tonnes airlifted to London), and secured a bailout.',
      'Industrial licensing was virtually abolished; private investment and FDI were opened across sectors.',
      'The rupee was made partially convertible (1992–93), import tariffs were cut, and the public sector was disinvested.',
      'RBI’s priority-sector lending and the new industrial policy (July 1991) defined the reforms.',
      'The reforms set India on a higher growth path and integrated it with global trade and finance.'
    ],
    facts: [
      '1991 — reforms launched',
      '47 tonnes of gold pledged in 1991',
      'P. V. Narasimha Rao — PM, Manmohan Singh — FM',
      'July 1991 — new industrial policy'
    ],
    comparisons: ['economic liberalisation in india', 'five-year plans (india)']
  },

  'five-year plans (india)': {
    summary: 'India’s Five-Year Plans (1951–2017) were centralised economic plans drawn by the Planning Commission, modelled on the Soviet pattern. They balanced industry, agriculture and social welfare until replaced by NITI Aayog.',
    bullets: [
      'Planning Commission set up in March 1950 with Nehru as chair; the First Plan (1951–56) stressed agriculture and infrastructure.',
      'Second Plan (1956–61) — Mahalanobis strategy of heavy industry; built steel plants at Bhilai, Durgapur and Rourkela.',
      'Later plans addressed green revolution (Third/Fourth), nationalisation (Fourth), poverty removal (Fifth) and Garibi Hatao.',
      'The plans ran to the Twelfth Plan (2012–17); overall targets were often missed but the framework guided the economy.',
      'NITI Aayog replaced the Planning Commission on 1 January 2015, ending the Five-Year Plan era.',
      'Annual plans and state-drawn plans now follow the NITI approach of cooperative federalism.'
    ],
    facts: [
      '1950 — Planning Commission set up',
      '1st Plan 1951–56 — agriculture focus',
      '2nd Plan 1956–61 — heavy industry (Mahalanobis)',
      '2015 — NITI Aayog replaces the Commission'
    ],
    comparisons: ['lpg reforms', 'economic liberalisation in india']
  },

  'demonetisation in india': {
    summary: 'Demonetisation was announced on 8 November 2016, withdrawing Rs 500 and Rs 1,000 notes from circulation, striking down about 86% of the currency by value. New Rs 500 and Rs 2,000 notes were issued, revamping the monetary system.',
    bullets: [
      'Announced by PM Narendra Modi on 8 November 2016 with the aim of curbing black money, counterfeits and terror funding.',
      'The old notes could be exchanged or deposited in banks with limits; cash withdrawals were curtailed.',
      'More than 99% of the demonetised currency returned to the banking system, weakening the black-money argument.',
      'It accelerated digital payments (UPI), aided formalisation of the economy, and created a cash crunch.',
      'Critics point to the loss of informal employment and dampened growth; supporters credit it with the GST-era formalisation.',
      'Validity of holding demonstration hard cash beyond limits was shut after December 2016.'
    ],
    facts: [
      '8 Nov 2016 — announcement',
      'Rs 500 and Rs 1,000 notes withdrawn',
      '86% of currency in value affected',
      '2016–17 — surge in digital payments'
    ],
    comparisons: ['goods and services tax (india)', 'reserve bank of india']
  },

  'goods and services tax (india)': {
    summary: 'The Goods and Services Tax (GST), rolled out on 1 July 2017, unified India’s multiple indirect taxes into one tax under the 101st Constitutional Amendment Act (2016). It is administered through the GST Council.',
    bullets: [
      'Rolled out nationally on 1 July 2017, replacing central and state taxes such as excise, service tax, VAT, octroi and CST.',
      'Backed by the 101st Constitutional Amendment Act (2016) and Article 246A.',
      'Dual structure: CGST (central), SGST (state) on intra-state sales and IGST on inter-state supplies.',
      'The GST Council, chaired by the Union Finance Minister, decides rates and rules with states as members.',
      'Slabs of 0, 5, 12, 18 and 28% apply; the cess on demerit goods funds compensation.',
      'Advantages listed: one-nation-one-tax, input-credit chain, removal of check-posts and better compliance.'
    ],
    facts: [
      '1 Jul 2017 — GST launch',
      '101st Amendment (2016) enabled it',
      'Rates: 0, 5, 12, 18, 28%',
      'GST Council chaired by Union FM'
    ],
    comparisons: ['demonetisation in india', 'economic liberalisation in india']
  },

  'reserve bank of india': {
    summary: 'The Reserve Bank of India, established on 1 April 1935 under the RBI Act 1934, is India’s central bank. It issues currency, conducts monetary policy, regulates banks and manages the country’s foreign exchange reserves.',
    bullets: [
      'Founded on 1 April 1935 under the RBI Act, 1934, following the Hilton Young Commission (1926); nationalised in 1949.',
      'First Governor was Osborne Smith; Sir James Braid Taylor was the first Indian-named succession of the office.',
      'Monetary policy is set through the Monetary Policy Committee (MPC) under Section 45ZB since 2016, targeting 4% retail inflation (±2%).',
      'It is the banker to the government, banker to banks, issuer of currency, custodian of reserves and lender of last resort.',
      'RBI’s development wing handles priority-sector lending, financial inclusion and payment systems (UPI).',
      'It regulates commercial banks, NBFCs and the securities of the money market within the monetary framework.'
    ],
    facts: [
      '1 Apr 1935 — established',
      '1949 — nationalised',
      '2016 — MPC-based inflation targeting announced',
      '4% inflation target with 2% band'
    ],
    comparisons: ['demonetisation in india', 'gst']
  },

  'lokpal': {
    summary: 'The Lokpal is an anti-corruption ombudsman to inquire into complaints against public functionaries including the Prime Minister, ministers, MPs and central officials. It was created by the Lokpal and Lokayuktas Act, 2013.',
    bullets: [
      'The Act received assent in January 2014; the first Lokpal, Justice Pinaki Chandra Ghose, took oath in March 2019.',
      'The Lokpal is a multi-member body headed by a chairperson (a serving or former Chief Justice or judge) with judicial and other members.',
      'Jurisdiction covers the PM (except on matters of international relations, security, etc.), Union ministers, MPs and Group A central officials.',
      'The Anna Hazare-led Jan Lokpal movement (2011) propelled the legislation into public discourse.',
      'Every state has the Lokayukta counterpart established by state law.',
      'Complaints must be accompanied by affidavit; preliminary inquiry and full inquiry procedures follow.'
    ],
    facts: [
      '2013 — Lokpal and Lokayuktas Act',
      'Mar 2019 — first Lokpal sworn in',
      'Anna Hazare’s 2011 movement',
      'Lokayukta — state-level equivalent'
    ],
    comparisons: ['election commission of india', 'national human rights commission of india']
  },

  'election commission of india': {
    summary: 'The Election Commission of India (ECI), constituted on 25 January 1950 under Article 324, supervises free and fair elections to Parliament, state legislatures, and the offices of President and Vice-President.',
    bullets: [
      'Set up on 25 January 1950; the day is observed as National Voters’ Day.',
      'Originally a single-member commission — first CEC Sukumar Sen; a three-member body was formed in 1993.',
      'Commissioners are appointed by the President and enjoy security of tenure; their conduct cannot be questioned except in specified ways.',
      'Powers include preparation of electoral rolls, delimitation, conduct and supervision of elections, and recognition of parties.',
      'It has advised on electoral reforms and used EVM-VVPAT in modern elections.',
      'Note: Article 324 also covers elections to the offices of President and Vice-President.'
    ],
    facts: [
      '25 Jan 1950 — established',
      'Article 324 — constitutional basis',
      '1993 — three-member commission',
      'National Voters’ Day on 25 January'
    ],
    comparisons: ['lokpal', 'finance commission of india']
  },

  '73rd constitutional amendment': {
    summary: 'The 73rd Constitutional Amendment (1992, effective 24 April 1993) strengthened panchayati raj as a third tier of government. It made the gram sabha and periodic elections to panchayats constitutionally mandatory.',
    bullets: [
      'Provided three tiers — village, intermediate and district — in states with a population above 20 lakh.',
      'Made the gram sabha (village assembly) the constitutional fulcrum of the panchayat system.',
      'Reserved seats for SC/ST proportional to population and not less than one-third for women.',
      'Added the Eleventh Schedule with 29 subjects falling under panchayat jurisdiction.',
      'Required State Election Commissions, State Finance Commissions and a District Planning Committee.',
      'Gave effect to Article 40 of the Directive Principles (organisation of village panchayats).'
    ],
    facts: [
      '1992 — Amendment passed',
      '24 Apr 1993 — came into force',
      'Eleventh Schedule — 29 subjects',
      'Not less than 1/3 seats for women'
    ],
    comparisons: ['election commission of india', '74th constitutional amendment']
  },

  'finance commission of india': {
    summary: 'The Finance Commission is a constitutional body under Article 280 appointed every five years to recommend the distribution of taxes between the Union and the states. It sustains the fiscal architecture of Indian federalism.',
    bullets: [
      'Constituted by the President under Article 280 every five years, with its recommendations binding in effect.',
      'First Finance Commission was set up in 1951 under K. C. Neogy.',
      'It recommend: sharing of Union taxes, grants-in-aid to the states, and principles governing borrowings of states.',
      'The Fifteenth FC (2021–26), chaired by N. K. Singh, recommended a 41% share of the divisible pool.',
      'The Sixteenth FC was constituted in 2023 under Arvind Panagariya.',
      'Its recommendations shape centre-state fiscal transfers and are pivotal to GST-era federal finance.'
    ],
    facts: [
      'Article 280 — constitutional basis',
      '1951 — First FC under K. C. Neogy',
      '15th FC (2021–26) — 41% share',
      '16th FC — Arvind Panagariya (2023)'
    ],
    comparisons: ['election commission of india', 'lokpal']
  },

  'economic liberalisation in india': {
    summary: 'Economic liberalisation in India, launched in July 1991, dismantled the licence-permit raj, opened the economy to private and foreign investment and simplified the tax and trade regime. It marked India’s transition from a controlled to a market-oriented economy.',
    bullets: [
      'The New Industrial Policy (July 1991) abolished most industrial licensing and reserved areas were privatised.',
      'FDI was welcomed in most sectors; foreign exchange rules were eased.',
      'Imported raw materials and capital goods became cheaper as tariffs fell.',
      'Public sector disinvestment began; the sick-unit (BIFR) regime and SICA’s curbs were relaxed.',
      'The reforms freed the economy from the “Hindu rate of growth” and accelerated growth, foreign investment and employment.',
      'Often used synonymously with the LPG reforms of 1991 under Narasimha Rao and Manmohan Singh.'
    ],
    facts: [
      'July 1991 — New Industrial Policy',
      'Industrial licensing virtually abolished',
      'FDI opened across sectors',
      '1991 — balance-of-payments crisis trigger'
    ],
    comparisons: ['lpg reforms', 'five-year plans (india)']
  },

  'rajendra prasad': {
    summary: 'Dr Rajendra Prasad (1884–1963) was the first President of India (1950–62) and the permanent president of the Constituent Assembly. A Gandhian freedom fighter from Bihar, he was renowned for integrity and constitutionalism.',
    bullets: [
      'Born 3 December 1884 at Zeradei (Bihar); a lawyer who joined Gandhi in the Champaran movement (1917).',
      'President of the Constituent Assembly from 1946, he presided over the framing of the Constitution.',
      'Became the first President of the Republic on 26 January 1950.',
      'As Union Minister of Agriculture earlier, he shaped policy on rural regeneration.',
      'He wrote his memoir “India Divided” (1946) and authored works on village self-government.'
    ],
    facts: [
      '3 Dec 1884 — birth',
      '1946 — Constituent Assembly president',
      '26 Jan 1950 — first President'
    ],
    comparisons: ['c. rajagopalachari', 'constituent assembly of india']
  },

  'c. rajagopalachari': {
    summary: 'Chakravarti Rajagopalachari (1878–1972), called “Rajaji”, was the last Governor-General of India (1948–50) and a veteran Congress leader. He later founded the Swatantra Party and championed free-market conservatism.',
    bullets: [
      'Born 10 December 1878 at Thorapalli (Tamil Nadu); a brilliant lawyer and Gandhi’s close associate in the South.',
      'Served as Governor-General of India from 21 June 1948 to 26 January 1950 — the only Indian to hold the post.',
      'Earlier he was the chief minister of Madras Presidency, and later took charge of Home and Education portfolios.',
      'Founded the Swatantra Party (1959) against planned socialism, supporting free markets and individual liberty.',
      'Awarded Bharat Ratna (1954); authored the Tamil classic “Chakravarti Thirumagan” on Ramayana themes.'
    ],
    facts: [
      '10 Dec 1878 — birth',
      '1948–50 — last Governor-General of India',
      '1959 — Swatantra Party founded',
      '1954 — Bharat Ratna'
    ],
    comparisons: ['rajendra prasad', 'mahatma gandhi']
  },

  'lala lajpat rai': {
    summary: 'Lala Lajpat Rai (1865–1928), the “Punjab Kesari”, was a nationalist leader of the Lal–Bal–Pal trio and an Arya Samajist. He died after being lathi-charged while protesting the Simon Commission at Lahore.',
    bullets: [
      'Born 28 January 1865 at Dhudhike (Firozpur); educated at Government College, Lahore; active in the Arya Samaj.',
      'Founded the Dayanand Anglo-Vedic (DAV) college movement spirit and served in the Punjab politics and Congress.',
      'Led agitations against the Rowlatt Act during World War I; was imprisoned (1907–08) for sedition.',
      'Left for the USA (1917) and encouraged Indian youth; supported Swadeshi and the boycott of British goods.',
      'On 30 October 1928 he was severely lathi-charged during the Simon Commission protest in Lahore and died on 17 November 1928.',
      'His death radicalised the youth and fed the revolutionary movement in Punjab.'
    ],
    facts: [
      '28 Jan 1865 — birth',
      '30 Oct 1928 — lathi charge at Lahore',
      '17 Nov 1928 — death',
      'Lal–Bal–Pal trio'
    ],
    comparisons: ['simon commission', 'bal gangadhar tilak', 'bhagat singh']
  },

  'rani lakshmibai': {
    summary: 'Rani Lakshmibai (1828–1858), the Rani of Jhansi, was a major leader of the Revolt of 1857. She fought the British cavalry and infantry courageously near Gwalior and died on the battlefield in June 1858.',
    bullets: [
      'Born Manikarnika at Kashi (Varanasi) in 1828; married Gangadhar Rao, Maharaja of Jhansi, in 1842.',
      'After her husband’s death (1853), the British applied the Doctrine of Lapse to annex Jhansi — a flashpoint for revolts.',
      'She took command during the Revolt of 1857, defending Jhansi from the British under Hugh Rose.',
      'Escaped from Jhansi (1858) to join Tantia Tope in Gwalior, where the final battle occurred.',
      'She died fighting near Gwalior on 17/18 June 1858, immortalised in poems like “Jhansi Ki Rani”.'
    ],
    facts: [
      '1853 — Jhansi annexed by Doctrine of Lapse',
      '1857-58 — defends Jhansi',
      'Jun 1858 — martyrdom near Gwalior'
    ],
    comparisons: ['revolt of 1857', 'tantia tope', 'nana saheb']
  },

  'battle of plassey': {
    summary: 'The Battle of Plassey (23 June 1757) was fought between the British East India Company under Robert Clive and the Nawab of Bengal Siraj-ud-Daulah. Clive’s victory, aided by Mir Jafar’s betrayal, laid the foundation of British rule in India.',
    bullets: [
      'Fought at Plassey on the Bhagirathi river on 23 June 1757.',
      'Robert Clive won over Mir Jafar, Mir Kasim and the Jagat Seth bank by secret treaty; Clive’s forces were far smaller.',
      'Siraj-ud-Daulah’s army was defeated; he was captured and executed, and Mir Jafar was made Nawab.',
      'The Company obtained the zamindari of the 24 Parganas and trade privileges under Mir Jafar.',
      'Plassey is seen as the starting point of the British conquest of Bengal and India.',
      'The victory was partly due to the defection of the Nawab’s commander Mir Madan and a heavy rainfall wetting the Nawab’s gunpowder.'
    ],
    facts: [
      '23 Jun 1757 — battle',
      'Robert Clive vs Siraj-ud-Daulah',
      'Mir Jafar’s defection decided the result',
      'Company gained the 24 Parganas'
    ],
    comparisons: ['battle of buxar', 'british east india company']
  },

  'battle of buxar': {
    summary: 'The Battle of Buxar (22 October 1764) was won by the British East India Company under Hector Munro over the combined forces of Mir Kasim of Bengal, Shuja-ud-Daulah of Awadh and Emperor Shah Alam II. It completed the conquest of Bengal and Awadh.',
    bullets: [
      'Fought on 22 October 1764 near Buxar in Bihar.',
      'Combined foes — Nawab of Bengal Mir Kasim, Nawab of Awadh Shuja-ud-Daulah and the Mughal Emperor Shah Alam II — were crushed by Hector Munro’s disciplined sepoys.',
      'The Battle effectively ended the independence of Bengal and made Awadh a client state.',
      'Treaty of Allahabad (1765): the Company gained diwani (right to collect revenue) for Bengal, Bihar and Orissa from Shah Alam II.',
      'The Company paid an annual tribute to the Emperor and obtained Kora and Allahabad districts from Awadh.',
      'Buxar and Plassey together established Company dominance in eastern India.'
    ],
    facts: [
      '22 Oct 1764 — battle',
      'Treaty of Allahabad 1765 — diwani of Bengal',
      'Company defeated Mir Kasim, Shuja-ud-Daulah and Shah Alam II'
    ],
    comparisons: ['battle of plassey', 'british east india company']
  },

  'first battle of panipat': {
    summary: 'The First Battle of Panipat (21 April 1526) was fought between Babur and the Delhi Sultan Ibrahim Lodi, the last Lodi ruler. Babur’s victory founded the Mughal Empire in India.',
    bullets: [
      'Fought on 21 April 1526 at Panipat (Haryana) with Babur’s gunpowder and Ottoman-style (Tulghuma) tactics.',
      'Ibrahim Lodi’s larger army and war elephants failed against Babur’s field fortifications, matchlocks and cannons.',
      'Ibrahim Lodi was killed on the battlefield.',
      'Babur proclaimed himself Emperor; the victory ended the Delhi Sultanate and founded the Mughal Empire.',
      'Babur secured the Delhi and Agra treasuries, beginning Mughal rule that lasted until 1857.'
    ],
    facts: [
      '21 Apr 1526 — battle',
      'Babur vs Ibrahim Lodi',
      'End of the Delhi Sultanate; start of the Mughal Empire'
    ],
    comparisons: ['second battle of panipat', 'third battle of panipat', 'mughal empire']
  },

  'second battle of panipat': {
    summary: 'The Second Battle of Panipat (5 November 1556) was won by the Mughal forces under Akbar and Bairam Khan over Hemu, the Hindu general of the Sur dynasty. It secured Mughal rule over north India.',
    bullets: [
      'Fought on 5 November 1556 near Panipat between Akbar’s forces, led by his regent Bairam Khan, and Hemu (Hemchandra Vikramaditya).',
      'Hemu, who had seized Delhi as the rebel general under Adil Shah Sur, fielded a large army with elephants.',
      'An arrow struck Hemu’s eye, disorienting his army; Bairam Khan’s cavalry sealed the victory.',
      'Hemu was captured and beheaded; his head was sent to Kabul.',
      'The battle consolidated Mughal authority in northern India after the years of Humayun’s death (1556).'
    ],
    facts: [
      '5 Nov 1556 — battle',
      'Akbar and Bairam Khan vs Hemu',
      'Hemu’s wound turned the battle',
      'Secured Mughal north India'
    ],
    comparisons: ['first battle of panipat', 'third battle of panipat', 'akbar']
  },

  'third battle of panipat': {
    summary: 'The Third Battle of Panipat (14 January 1761) was a catastrophic defeat of the Marathas by the Afghan invader Ahmad Shah Abdali. The Maratha confederacy lost thousands of troops and its northern ascendancy.',
    bullets: [
      'Fought on 14 January 1761 at Panipat between the Maratha army under Sadashivrao Bhau and Ahmad Shah Abdali’s Afghan forces.',
      'The Marathas marched north to challenge Abdali and reassert Mughal overlordship; the Mughal emperor was a nominal sponsor.',
      'Maratha supplies were cut by Afghan light cavalry; food and fodder ran out during the winter blockade.',
      'The Marathas lost an estimated 60,000–70,000 fighters; the famous sons of many leaders, including Vishwasrao, died.',
      'Abdali withdrew, leaving north India weakened; the British benefitted most from Maratha decline.',
      'The Maratha empire never fully recovered, although it revived partially under Madhavrao.'
    ],
    facts: [
      '14 Jan 1761 — battle',
      'Marathas vs Ahmad Shah Abdali',
      'About 60,000+ Marathas perished',
      'Broke Maratha power in the north'
    ],
    comparisons: ['first battle of panipat', 'second battle of panipat', 'maratha empire']
  },

  'battle of haldighati': {
    summary: 'The Battle of Haldighati (18 June 1576) was fought between the Mughal forces of Akbar, led by Man Singh, and the Rajput king of Mewar, Maharana Pratap. Pratap was defeated in the field but never accepted Mughal suzerainty.',
    bullets: [
      'Fought on 18 June 1576 at Haldighati pass near Gogunda (Rajasthan).',
      'Akbar’s forces under Raja Man Singh and Asaf Khan faced Maharana Pratap’s Rajputs aided by the Bhil chieftain Hakim Khan Sur.',
      'Pratap’s famous horse Chetak carried him from the battlefield and died of wounds; Pratap survived.',
      'After the battle Pratap regrouped in the Aravalli hills and recovered fort after fort, keeping Mewar’s independence.',
      'The Mughals never fully subdued Mewar; the field defeat of Haldighati is often mythologised as a moral victory for Pratap.',
      'Jai Singh I later signed the Treaty of Chittor (1615) between Mewar and the Mughals.'
    ],
    facts: [
      '18 Jun 1576 — battle',
      'Maharana Pratap vs Man Singh',
      'Battle at Haldighati pass',
      'Mewar kept its independence'
    ],
    comparisons: ['maharana pratap', 'mughal empire']
  },

  'battle of talikota': {
    summary: 'The Battle of Talikota (26 January 1565) destroyed the Vijayanagara Empire. The combined armies of the Deccan sultanates — Bijapur, Ahmadnagar, Golconda and Bidar — routed Vijayanagara’s forces at the Krishna–Tungabhadra doab.',
    bullets: [
      'Fought on 26 January 1565 near Talikota (Raichur doab) on the south bank of the Krishna river.',
      'The four Deccan sultanates united against Vijayanagara’s Rama Raya, whose overconfidence divided his army.',
      'Rama Raya was captured and beheaded at the start, at his own orders to have the messengers executed.',
      'Vijayanagara’s capital Hampi was sacked and the empire disintegrated into successor kingdoms.',
      'The battle is a landmark in south Indian history — the end of the last great Hindu kingdom of the Deccan.',
      'Surviving kingdoms (Ikkeri, Mysore, Rayadurgam etc.) kept its traditions alive.'
    ],
    facts: [
      '26 Jan 1565 — battle',
      'Vijayanagara vs Deccan sultanates',
      'Rama Raya killed',
      'Hampi sacked'
    ],
    comparisons: ['vijayanagara empire', 'rama raya']
  },

  'first anglo-sikh war': {
    summary: 'The First Anglo-Sikh War (1845–46) was fought between the British East India Company and the Sikh Empire of Lahore. The Treaty of Lahore (1846) made the Sikh state a subsidiary ally and ceded Kashmir.',
    bullets: [
      'Fought in 1845–46 after the British massed troops on the Sutlej and the Lahore durbar crossed it into British territory.',
      'Deaths included the decisive Battles of Mudki, Ferozeshah, Aliwal and Sobraon.',
      'The Sardars’ internal factionalism and the army’s poor ammunition supply contributed to defeat.',
      'Treaty of Lahore (March 1846) imposed a war indemnity and ceded Jalandhar Doab.',
      'Kashmir was sold to Gulab Singh (1846) so he could pay the indemnity, creating the princely state of Jammu and Kashmir.',
      'A British Resident was posted at Lahore, making the Sikh state a subsidiary ally.'
    ],
    facts: [
      '1845–46 — war years',
      'Battles: Mudki, Ferozeshah, Aliwal, Sobraon',
      '1846 — Treaty of Lahore',
      'Kashmir sold to Gulab Singh'
    ],
    comparisons: ['second anglo-sikh war', 'british east india company']
  },

  'second anglo-sikh war': {
    summary: 'The Second Anglo-Sikh War (1848–49) ended Sikh sovereignty. The British under Lord Dalhousie annexed the entire Punjab after defeating the Sikh forces at Chillianwala and Gujarat.',
    bullets: [
      'Broke out in 1848 when Mulraj of Multan rebelled; the Sikh Khalsa army rose against the British.',
      'The Company defeated the Sikhs at Ramnagar, Chillianwala and finally Gujarat (February 1849).',
      'The British victory at Gujarat forced the surrender of the Sikh army.',
      'Dalhousie annexed the Punjab on 29 March 1849; the minor Maharaja Dalip Singh was pensioned.',
      'The famous Koh-i-Noor diamond was confiscated by the British in the aftermath.',
      'The annexation completed the consolidation of British power in north-west India.'
    ],
    facts: [
      '1848–49 — war years',
      'Battles: Chillianwala, Gujarat (1849)',
      '29 Mar 1849 — Punjab annexed',
      'Koh-i-Noor taken to Britain'
    ],
    comparisons: ['first anglo-sikh war', 'sikh empire']
  },

  'indo-pakistani war of 1965': {
    summary: 'The Indo-Pakistani war of 1965 (September 1965) was fought mainly over Kashmir after Pakistan’s Operation Gibraltar infiltrations. It ended with the UN-mediated Tashkent Declaration on 10 January 1966.',
    bullets: [
      'Pakistan launched Operation Gibraltar (August 1965) to infiltrate forces into Jammu and Kashmir.',
      'India retaliated across the international border, with major tank battles at Assal Uttar (Khemkaran) and Chawinda.',
      'The war lasted about 17 days and was largely indecisive, with no territory exchange.',
      'The Tashkent Declaration was signed on 10 January 1966 by Lal Bahadur Shastri and Ayub Khan under Soviet mediation.',
      'Shastri died in Tashkent the very next day (11 January 1966).',
      'India celebrates 23 September as the ceasefire day of the war.'
    ],
    facts: [
      'Sep 1965 — war',
      '10 Jan 1966 — Tashkent Declaration',
      'Shastri died 11 Jan 1966 in Tashkent',
      'Operation Gibraltar — Pakistani infiltration'
    ],
    comparisons: ['kargil war', 'bangladesh liberation war', 'lal bahadur shastri']
  },

  'bangladesh liberation war': {
    summary: 'The Bangladesh Liberation War (1971) saw East Pakistan gain independence as Bangladesh with decisive Indian military support. The 1971 war, culminating in the surrender of Pakistani forces in Dhaka on 16 December 1971, created Bangladesh.',
    bullets: [
      'East Pakistanis rebelled in March 1971 after the Pakistani military crackdown (Operation Searchlight) rejected the Awami League’s electoral mandate under Sheikh Mujibur Rahman.',
      'India supported the Mukti Bahini guerrillas and flew air cover; Operation Cactus Lily (December 1971) involved a two-front assault.',
      'The Indian Navy’s Eastern Fleet and the VIII (Ghoda) corps cut off Pakistani forces in East Bengal.',
      'The Pakistan High Command surrendered on 16 December 1971 — the largest surrender of forces since World War II.',
      'India celebrates 16 December as Vijay Diwas.',
      'Bangladesh became independent under Sheikh Mujibur Rahman; the war also normalised India’s position in South Asia.'
    ],
    facts: [
      'Mar 1971 — rebellion begins',
      '16 Dec 1971 — Pakistani surrender, Vijay Diwas',
      '93,000+ Pakistani POWs',
      'Sheikh Mujibur Rahman — first leader of Bangladesh'
    ],
    comparisons: ['indo-pakistani war of 1965', 'kargil war']
  },

  'kargil war': {
    summary: 'The Kargil War (May–July 1999) was fought when Pakistani soldiers and infiltrators occupied heights in Jammu and Kashmir’s Kargil sector. Operation Vijay evicted them; India regained control of all peaks by 26 July 1999.',
    bullets: [
      'Pakistani troops and infiltrators, backed by the army, crossed the Line of Control (LoC) in the Kargil–Dras–Batalik sector in May 1999.',
      'India launched Operation Vijay; the Indian Army and Air Force conducted mountain warfare at heights around 5,000 m.',
      'Key battles: Tololing, Tiger Hill, Point 5140 and points near Batalik.',
      'The coalition government under PM Atal Bihari Vajpayee directed the operations without crossing the LoC.',
      '26 July is observed as Kargil Vijay Diwas.',
      'Marks like the killing of Pakistani intruders and the recovery of their warnings exposed the intrusion.'
    ],
    facts: [
      'May 1999 — intrusions detected',
      '26 Jul 1999 — victory, Kargil Vijay Diwas',
      'Operation Vijay',
      'Fought along the LoC'
    ],
    comparisons: ['indo-pakistani war of 1965', 'line of control']
  },

  'rabindranath tagore': {
    summary: 'Rabindranath Tagore (1861–1941) was a poet, writer, composer, painter and the first non-European Nobel laureate (Literature, 1913). He composed the national anthems of India and Bangladesh.',
    bullets: [
      'Born 7 May 1861 at Jorasanko, Calcutta; the author of “Gitanjali” for which he won the Nobel Prize in 1913.',
      'He renounced his knighthood in 1919 in protest against the Jallianwala Bagh massacre.',
      'Composed “Jana Gana Mana” (India’s national anthem) and “Amar Shonar Bangla” (Bangladesh’s national anthem).',
      'Founded the Visva-Bharati at Santiniketan (1921) to blend Indian and international learning.',
      'His works shaped modern Bengali literature and the Bengal Renaissance.',
      'Gandhi called him “Gurudev”; his death on 7 August 1941 ended an era.'
    ],
    facts: [
      '7 May 1861 — birth',
      '1913 — Nobel Prize in Literature',
      '1930 — renounced knighthood (1919)',
      'Founded Visva-Bharati at Santiniketan'
    ],
    comparisons: ['mahatma gandhi', 'subhas chandra bose']
  },

  'lal bahadur shastri': {
    summary: 'Lal Bahadur Shastri (1904–1966) was India’s second Prime Minister (1964–66). He is remembered for the slogan “Jai Jawan, Jai Kisan” and the Tashkent Declaration; he died in Tashkent in 1966.',
    bullets: [
      'Born 2 October 1904 at Mughalsarai (UP); a follower of Gandhi from the non-cooperation strain.',
      'Held cabinet portfolios including Home, Railways and Finance; resigned as Railways Minister after a train accident (1956).',
      'Became Prime Minister after Nehru’s death in 1964.',
      'Coined “Jai Jawan, Jai Kisan” during the 1965 India–Pakistan war and food crisis.',
      'Signed the Tashkent Declaration (10 January 1966) with Ayub Khan; died of a cardiac arrest in Tashkent the next day.',
      'His death remains a subject of debate; he is recalled as a man of simple integrity.'
    ],
    facts: [
      '2 Oct 1904 — birth',
      '1964 — becomes PM',
      '10 Jan 1966 — Tashkent Declaration',
      '11 Jan 1966 — death in Tashkent'
    ],
    comparisons: ['jawaharlal nehru', 'indo-pakistani war of 1965']
  },

  'indira gandhi': {
    summary: 'Indira Gandhi (1917–1984), daughter of Nehru, was India’s first (and only) woman Prime Minister (1966–77; 1980–84). Her tenure saw nationalisation, the 1971 war, the Emergency and her own assassination.',
    bullets: [
      'Born 19 November 1917; became Congress president (1959) and later succeeded Lal Bahadur Shastri as PM in 1966.',
      'Nationalised 14 major commercial banks (1969) and spearheaded the Green Revolution and Operation Flood.',
      'Led India to victory in the 1971 war creating Bangladesh; signed the Shimla Agreement (1972) and carried out Pokhran-I (1974).',
      'Imposed the Emergency (1975–77) suspending civil liberties; the Janata government followed her electoral defeat in 1977.',
      'Returned to power in 1980; initiated Operation Blue Star (June 1984) in Amritsar.',
      'Assassinated on 31 October 1984 by her Sikh bodyguards.'
    ],
    facts: [
      '19 Nov 1917 — birth',
      '1971 — Bangladesh liberation',
      '1975–77 — the Emergency',
      '31 Oct 1984 — assassination'
    ],
    comparisons: ['jawaharlal nehru', 'bangladesh liberation war']
  },

  'sarojini naidu': {
    summary: 'Sarojini Naidu (1879–1949), the “Nightingale of India”, was a poet and a leading Congresswoman in the freedom struggle. She became the first woman Governor of an Indian state (UP, 1947).',
    bullets: [
      'Born 13 February 1879 at Hyderabad; a child prodigy poet educated in England.',
      'Worked with Gandhi in Champaran and the Dandi March; led the salt satyagraha at Wadala (1930).',
      'President of the Indian National Congress (Kanpur, 1925) — the second woman after Annie Besant.',
      'Her poetry volumes include “The Golden Threshold”, “The Bird of Time” and “The Broken Wing”.',
      'First woman Governor of an Indian state — United Provinces from 15 August 1947.',
      'Dubbed “Nightingale of India” for her lyrical verse.'
    ],
    facts: [
      '13 Feb 1879 — birth',
      '1925 — Congress president (Kanpur)',
      '1930 — led salt satyagraha at Wadala',
      '1947 — first woman Governor (UP)'
    ],
    comparisons: ['annie besant', 'mahatma gandhi', 'indian national congress']
  },

  'annie besant': {
    summary: 'Annie Besant (1847–1933) was a British socialist, theosophist and champion of Indian home rule. She launched the Home Rule League and became the first woman president of the Indian National Congress (1917).',
    bullets: [
      'Came to India in 1893 as a Theosophical Society leader; founded the Central Hindu College at Banaras.',
      'Launched the Home Rule League in September 1916, with Bal Gangadhar Tilak starting his own league.',
      'First woman President of the Indian National Congress (Calcutta, 1917).',
      'Advocated self-government for India by constitutional means; she educated Indians through “New India” newspaper.',
      'Her arrest in 1917 unified nationalist sentiment and hastened the Montagu Declaration.',
      'She continued social service until her death in 1933.'
    ],
    facts: [
      '1893 — came to India',
      '1916 — Home Rule League',
      '1917 — first woman Congress president',
      '1933 — death'
    ],
    comparisons: ['bal gangadhar tilak', 'sarojini naidu']
  },

  'dadabhai naoroji': {
    summary: 'Dadabhai Naoroji (1825–1917) was a prominent moderate nationalist and the first Indian elected to the British House of Commons. His “Drain of Wealth” theory exposed colonial exploitation of India.',
    bullets: [
      'Born 4 September 1825 in Bombay; a mathematician-turned-politician and professor.',
      'First Indian to be elected to the British House of Commons (1892, for Central Finsbury).',
      'Repeatedly elected Congress president — 1886, 1893 and 1906 — the first Indian president thrice.',
      'Formulated the Drain of Wealth theory in “Poverty and Un-British Rule in India” (1901).',
      'A founder of the Indian National Congress; he argued for fiscal reform and self-rule.',
      'Gandhi and the moderates regarded him as the “Grand Old Man of India”.'
    ],
    facts: [
      '4 Sep 1825 — birth',
      '1892 — first Indian MP in Britain',
      'Congress president — 1886, 1893, 1906',
      '“Poverty and Un-British Rule in India” — drain theory'
    ],
    comparisons: ['gopal krishna gokhale', 'surendranath banerjee', 'indian national congress']
  },

  'maulana abul kalam azad': {
    summary: 'Maulana Abul Kalam Azad (1888–1958) was a scholar, freedom fighter and India’s first Education Minister. He was the youngest Congress president (1923) and a champion of Hindu–Muslim unity.',
    bullets: [
      'Born 11 November 1888 at Mecca; a noted Islamic scholar and journalist of “Al-Hilal”.',
      'Joined the Khilafat and Congress movements; became Congress president at 35 in 1923 (special session).',
      'Rejected the two-nation theory; was imprisoned several times during the Quit India movement.',
      'First Education Minister (1947–58); helped establish the UGC, IIT system and Indian Council of Cultural Relations.',
      'His 21 November birthday is observed as National Education Day.',
      'Bharat Ratna (1992) awarded posthumously.'
    ],
    facts: [
      '11 Nov 1888 — birth',
      '1923 — Congress president (special session)',
      'First Education Minister 1947–58',
      'National Education Day on 11 November'
    ],
    comparisons: ['khilafat movement', 'mahatma gandhi']
  },

  'chandra shekhar azad': {
    summary: 'Chandra Shekhar Azad (1906–1931) was a revolutionary hero of the Indian independence movement and a leader of the HSRA. He died in a shootout with the police at Alfred Park, Allahabad, in 1931.',
    bullets: [
      'Born 23 July 1906 at Bhavra (MP); was jailed in the Non-Cooperation years and joined the Hindustan Republican Association.',
      'Renamed himself Azad after a court appearance at 15; said “we will never be enslaved”.',
      'Rebuilt the Hindustan Socialist Republican Association (HSRA) with Bhagat Singh after Kakori (1925).',
      'Trained revolutionaries in arms and was involved in the assembly bomb case and the Saunders killing.',
      'At Alfred Park, Allahabad, on 27 February 1931, he fought the police alone and shot himself to avoid capture — “Azad will always remain Azad”.'
    ],
    facts: [
      '23 Jul 1906 — birth',
      '1928 — HSRA with Bhagat Singh',
      '27 Feb 1931 — martyrdom at Alfred Park'
    ],
    comparisons: ['bhagat singh', 'rajguru']
  },

  'raja ram mohan roy': {
    summary: 'Raja Ram Mohan Roy (1772–1833) was the father of the Indian Renaissance and social reform. He founded the Brahmo Samaj and fought for widow remarriage, women’s rights and modern education.',
    bullets: [
      'Born 22 May 1772 at Radhanagar (Bengal); a polyglot scholar of Hindu, Islamic and Western learning.',
      'Founded the Brahmo Samaj (1828) to promote monotheism and reform Hinduism.',
      'Struggled against sati (widow immolation); the practice was abolished by Regulation in 1829.',
      'Established English-medium education, aided the foundation of Hindu College (Calcutta) and Anglo-Hindu School.',
      'Endorsed freedom of the press and opposed idolatry and casteism.',
      'Went to England in 1830 and died at Bristol on 27 September 1833.'
    ],
    facts: [
      '22 May 1772 — birth',
      '1828 — Brahmo Samaj founded',
      '1829 — sati abolished',
      '1833 — death at Bristol'
    ],
    comparisons: ['swami dayananda saraswati', 'ishwar chandra vidyasagar']
  },

  'swami dayananda saraswati': {
    summary: 'Swami Dayananda Saraswati (1824–1883) founded the Arya Samaj in 1875 and preached “Back to the Vedas”. His call “Go back to the Vedas” and “India for Indians” energised the Hindu renaissance.',
    bullets: [
      'Born 12 February 1824 at Tankara (Gujarat); a wandering ascetic who studied the Vedas.',
      'Founded the Arya Samaj at Bombay (1875) to revive Vedic ideals and reform Hindu society.',
      'Opposed idolatry, polytheism, caste rigidity and untouchability; propounded monotheism and the infallibility of the Vedas.',
      'Wrote the “Satyarth Prakash” (light of truth) and established Gurukuls with Vedic education.',
      'The Arya Samaj later instituted shuddhi (reconversion) and spread through Punjabi and Hindi regions.',
      'Convinced many to boycott untouchability; promoted women’s education and widow remarriage.'
    ],
    facts: [
      '12 Feb 1824 — birth',
      '1875 — Arya Samaj founded',
      '“Satyarth Prakash” — major work',
      '“India for Indians” — his call'
    ],
    comparisons: ['raja ram mohan roy', 'aryabhatta']
  },

  'mahatma phule': {
    summary: 'Jyotirao Phule (1827–1890) was a Maharashtrian social reformer who fought caste oppression and championed education for women and the lower castes. He and Savitribai founded the first school for girls in Pune.',
    bullets: [
      'Born 11 April 1827 at Satara district; educated at the Scottish Mission School.',
      'Founded the first girls’ school in Pune (1848) with his wife Savitribai Phule.',
      'Started the Satyashodhak Samaj (1873) to fight casteism and work for the “truth-seekers” of lower castes.',
      'Coined the term “Dalit” for the oppressed and coined the banner of “Gulamgiri” (slavery) to critique Brahminical dominance.',
      'Opposed the caste-based exploitation and advocated equal opportunity for all through education.',
      'His birth anniversary (11 April) is observed as Jyotiba Phule Jayanti.'
    ],
    facts: [
      '11 Apr 1827 — birth',
      '1848 — first girls’ school at Pune',
      '1873 — Satyashodhak Samaj',
      '“Gulamgiri” — his critique of slavery'
    ],
    comparisons: ['savitribai phule', 'b. r. ambedkar']
  },

  'savitribai phule': {
    summary: 'Savitribai Phule (1831–1897) was a pioneering social reformer and the first woman teacher in India. She and her husband Jyotirao opened schools for girls and fought against caste and gender discrimination.',
    bullets: [
      'Born 3 January 1831 at Naigaon (Maharashtra); first Indian woman teacher.',
      'Taught at and led the first girls’ school in Bhide wada, Pune (1848).',
      'Supported widow remarriage and opened a home for widows (Balhatya Pratibandhak Griha).',
      'Helped the Satyashodhak Samaj and worked during famines and plague.',
      'Died on 10 March 1897 of plague contracted while nursing patients.',
      'Bharat Ratna-equivalent first woman teacher memorialised in statues and the Savitribai Phule Pune University.'
    ],
    facts: [
      '3 Jan 1831 — birth',
      '1848 — first girls’ school in Pune',
      'First woman teacher in India',
      '10 Mar 1897 — death'
    ],
    comparisons: ['mahatma phule', 'raja ram mohan roy']
  },

  'harsha': {
    summary: 'Harshavardhana (r. 606–647 CE) was the last great ruler of ancient northern India, who re-united the Gangetic plain after the fall of the Guptas. His court produced Banabhatta and Xuanzang’s travels were in his reign.',
    bullets: [
      'Became king of Thanesar (Sthanvishvara) in 606 CE after his brother Rajyavardhana’s death; later ruled Kannauj.',
      'Brought large parts of Punjab, UP, Bihar and Rajasthan under his rule; was stopped by Pulakeshin II at the Narmada.',
      'His reign is documented by Bana’s “Harshacharita” and the travels of the Chinese pilgrim Xuanzang (Hiuen Tsang).',
      'Patronised Nalanda University and convened a great assembly at Prayag (Kumbha) every five years.',
      'A poet himself — authored “Ratnavali”, “Priyadarshika” and “Nagananda”.',
      'Empire declined after his death (647), and the north fragmented again.'
    ],
    facts: [
      'r. 606–647 CE',
      'Capital — Kannauj',
      'Stopped at the Narmada by Pulakeshin II',
      'Xuanzang visited during his reign'
    ],
    comparisons: ['harsha empire', 'pulakeshin ii', 'gupta empire']
  },

  'chola empire': {
    summary: 'The Chola empire (c. 850–1279 CE) was the most powerful medieval Tamil kingdom, ruling the Coromandel coast, Sri Lanka and parts of Southeast Asia. Rajaraja I and Rajendra I made it a maritime and temple-building power.',
    bullets: [
      'Revived under Vijayalaya in the 9th century from Thanjavur; at peak under Rajaraja I (985–1014) and Rajendra I (1012–44).',
      'Rajaraja built the Brihadisvara temple at Thanjavur; Rajendra built the Gangaikondacholapuram temple.',
      'Rajendra I carried Chola arms to the Ganges and invaded Srivijaya (Malay peninsula) c. 1025 CE.',
      'Great temples at Thanjavur, Gangaikondacholapuram and Darasuram are UNESCO sites.',
      'The Cholas were a thalassocracy with a strong navy; they annexed northern Sri Lanka.',
      'The empire declined in the 13th century with the rise of the Hoysalas and Pandya infighting.'
    ],
    facts: [
      'c. 850–1279 CE — period',
      'Rajaraja I — Thanjavur temple (c. 1010 CE)',
      'Rajendra I — Gangaikondacholapuram',
      'c. 1025 CE — invasion of Srivijaya'
    ],
    comparisons: ['rajaraja chola i', 'rajendra chola', 'vijayanagara empire']
  },

  'alauddin khilji': {
    summary: 'Alauddin Khalji (r. 1296–1316) was the greatest ruler of the Khalji dynasty of the Delhi Sultanate. He repelled the Mongols, introduced market controls and extended the Sultanate to the Deccan.',
    bullets: [
      'Took the throne in 1296 after killing his uncle Jalaluddin; ruled until 1316.',
      'Repulsed several Mongol invasions from 1298–1308 and fortified their frontiers.',
      'Introduced the market (bazar) reforms and price control through the “Sultani” economy, with grain stores (royal granaries).',
      'His Deccan campaigns under Malik Kafur reached Madurai and the far south.',
      'Delhi’s expansion symbolised the Sultanate at its greatest real extent; he controlled gold, land revenue and the nobility rigidly.',
      'His administrative rigour and repression of nobles are famous in the history of the Sultanate.'
    ],
    facts: [
      'r. 1296–1316',
      'Market reform — price control',
      'Mongol invasions repulsed',
      'Malik Kafur reached the far south'
    ],
    comparisons: ['delhi sultanate', 'muhammad bin tughlaq']
  },

  'muhammad bin tughlaq': {
    summary: 'Muhammad bin Tughlaq (r. 1325–1351) was the most learned but controversial Sultan of Delhi. His experiments — shifting the capital to Daulatabad and token currency — failed and are legendary in UPSC history.',
    bullets: [
      'Third Tughlaq sultan, ruled 1325–51 with administrative schemes aimed at centralisation.',
      'Transferred the capital from Delhi to Daulatabad (1327–29), causing dislocation; the project was later reversed.',
      'Introduced copper token currency (1329) pegged to gold and silver, which failed due to widespread forgery.',
      'Organised a “land revenue” assessment of the Doab and a Khusrau-Malik-style agro expedition that proved costly.',
      'Expanded the Sultanate to the Deccan including Madurai and Qutb Mihtar expeditions.',
      'Ibn Battuta visited his court; after his death in 1351, the Sultanate faced crises under his successors.'
    ],
    facts: [
      'r. 1325–1351',
      '1327 — capital shifted to Daulatabad',
      '1329 — token currency introduced',
      'Ibn Battuta in his court'
    ],
    comparisons: ['alauddin khilji', 'delhi sultanate', 'firoz shah tughlaq']
  },

  'sher shah suri': {
    summary: 'Sher Shah Suri (r. 1540–1545), founder of the Sur dynasty, displaced Humayun and reformed the whole administration. His revenue system, currency and the Grand Trunk Road survived for centuries.',
    bullets: [
      'Born Farid Khan; rose under Babur and later governor, defeating Humayun at Chausa (1539) and Kannauj (1540).',
      'Built the sturdy administrative machinery — land revenue survey and the karori system — that Akbar later refined.',
      'Introduced the silver rupiya (rupee) and standardised coinage.',
      'Built the Grand Trunk Road (Sarak-i-Azam), the Rohtas Fort and the Sarai system from Bengal to Kabul.',
      'The Dina-i build (Qila-i-Kuhna) mosque at Delhi and the Purana Qila survived.',
      'Died in a gunpowder explosion at Kalinjar (1545); his empire did not outlive him.'
    ],
    facts: [
      'r. 1540–1545',
      'Silver rupiya standardised',
      'Grand Trunk Road built',
      'Died at Kalinjar, 1545'
    ],
    comparisons: ['humayun', 'akbar', 'mughal empire']
  },

  'tipu sultan': {
    summary: 'Tipu Sultan (1750–1799), the “Tiger of Mysore”, was a powerful ruler who defied the British in the Anglo-Mysore wars. He was a modernising monarch — the first to use rockets and a proponent of the factory system.',
    bullets: [
      'Son of Hyder Ali; ruled Mysore 1782–1799 after his father’s death.',
      'Fought the Second, Third and Fourth Anglo-Mysore wars against the British.',
      'Won the Second war but was forced to surrender in the Third; Treaty of Seringapatam (1792) took half his kingdom.',
      'Introduced the rocket artillery in India and built a modernised army with French help.',
      'Fostered trade, a new coinage, sericulture and the ship-building at Mangalore.',
      'Killed defending Seringapatam on 4 May 1799; the British restored the Wodeyar dynasty.'
    ],
    facts: [
      'r. 1782–1799',
      'First to deploy iron rockets in India',
      '1792 — Treaty of Seringapatam',
      '4 May 1799 — killed at Seringapatam'
    ],
    comparisons: ['hyder ali', 'anglo-mysore wars']
  },

  'hyder ali': {
    summary: 'Hyder Ali (1720–1782) was the ruler of Mysore who fought the British in the First and Second Anglo-Mysore wars. He created a powerful state from a cavalry condottiere to a kingdom.',
    bullets: [
      'A cavalry commander who rose to power in Mysore, placing puppet rajas from 1761.',
      'Fought the First Anglo-Mysore war (1767–69) and forced the Treaty of Madras (1769).',
      'Captured Maratha territories and controlled parts of the Carnatic coast.',
      'His army blended French-trained infantry with modern artillery; he was a master of guerrilla tactics.',
      'Died on 7 December 1782 during the Second Anglo-Mysore war; his son Tipu continued the struggle.'
    ],
    facts: [
      '1720 — birth',
      '1761 — power in Mysore',
      '1767–69 — First Anglo-Mysore war',
      '7 Dec 1782 — death'
    ],
    comparisons: ['tipu sultan', 'anglo-mysore wars']
  },

  'maharana pratap': {
    summary: 'Maharana Pratap (1540–1597), the Rajput ruler of Mewar, refused Mughal suzerainty and fought Akbar’s forces at Haldighati (1576). He is remembered as the symbol of defiant Rajput heroism.',
    bullets: [
      'Succeeded Rana Udai Singh II as ruler of Mewar with Chittoor lost and Udaipur as his base (1572).',
      'Refused to accept Akbar’s overtures and Mughal overlordship, despite being offered honourable rank.',
      'Fought the Battle of Haldighati (18 June 1576) against Man Singh and Asaf Khan; defeated but never captured.',
      'Regained forts like Kumbhalgarh and Gogunda through guerrilla warfare in the Aravallis.',
      'His famous horse Chetak died carrying him to safety after Haldighati.',
      'Died 19 January 1597; his memory is honoured on his memorial day in Rajasthan.'
    ],
    facts: [
      '1540 — birth',
      '1572 — became Rana of Mewar',
      '18 Jun 1576 — Battle of Haldighati',
      '19 Jan 1597 — death'
    ],
    comparisons: ['battle of haldighati', 'akbar']
  },

  'aurangzeb': {
    summary: 'Aurangzeb (r. 1658–1707) was the last great Mughal emperor. He extended the empire to its greatest territorial extent but his Deccan wars, religious policies and overreliance on orthodoxy exhausted the empire.',
    bullets: [
      'Third son of Shah Jahan; usurped the throne after a war of succession and imprisoned his father (1658).',
      'Crowned with the title Alamgir; ruled 1658–1707 — the longest Mughal reign.',
      'Extended the empire in the Deccan by annexing Bijapur (1686) and Golconda (1687).',
      'His religious policies (reimposition of jizya 1679, destruction of temples, discriminating appointments) alienated the Rajputs, Sikhs and Marathas.',
      'Waged prolonged wars against the Marathas; Shivaji’s successors and later the rise of Guru Gobind Singh challenged him.',
      'His death in 1707 plunged the empire into decline; the Mughals never recovered.'
    ],
    facts: [
      'r. 1658–1707',
      '1679 — jizya reimposed',
      '1686–87 — Bijapur and Golconda annexed',
      '1707 — death at Ahmadnagar'
    ],
    comparisons: ['akbar', 'shah jahan', 'shivaji', 'mughal empire']
  },

  'guru nanak': {
    summary: 'Guru Nanak (1469–1539) founded Sikhism, preaching the unity of god, equality of all and selfless service. He gave humanity the concept of nam japna, kirt karna and vand chhakna.',
    bullets: [
      'Born 15 April 1469 at Talwandi (Nankana Sahib, now Pakistan).',
      'After enlightenment, he travelled widely (udasis) across India and beyond spreading his message.',
      'Preached ek onkar (one god), rejection of caste and ritual, and the equality of men and women.',
      'His hymns form the Japji Sahib and the foundation of the Adi Granth (later Guru Granth Sahib).',
      'Established the Sikh community on congregation (sangat) and fellowship (pangat).',
      'Appointed Guru Angad as his successor at Kartarpur before his death on 22 September 1539.'
    ],
    facts: [
      '15 Apr 1469 — birth',
      'Japji Sahib — his composition',
      '22 Sep 1539 — death at Kartarpur',
      'Preached ek onkar (one god)'
    ],
    comparisons: ['guru gobind singh', 'guru arjan']
  },

  'kushan empire': {
    summary: 'The Kushan empire (c. 30–375 CE), of Yuezhi origin, ruled from Central Asia to the Gangetic plain, connecting India with China and Rome. Kanishka was its greatest ruler; Gandhara art flourished under them.',
    bullets: [
      'The Kushans rose from the Yuezhi tribes and crossed into India c. 1st century CE.',
      'Kanishka (r. c. 127–151 CE) ruled over Kashmir, Punjab, Mathura and parts of Central Asia.',
      'Kanishka convened the Fourth Buddhist Council at Kundalvana (Kashmir).',
      'The empire lay astride the Silk Route; coins show trade with Rome, China and the central Asian world.',
      'Gandhara (Hellenistic-influenced) and Mathura schools of art reached their heights.',
      'The Sassanians and later the Guptas absorbed the Kushans in the 3rd–4th centuries.'
    ],
    facts: [
      'c. 30–375 CE — period',
      'Kanishka r. c. 127–151 CE',
      'Fourth Buddhist Council under Kanishka',
      'Silk Route trade hub'
    ],
    comparisons: ['scythian rule', 'gupta empire']
  },

  'el niño': {
    summary: 'El Niño is the warm phase of the El Niño–Southern Oscillation (ENSO), marked by warming of the central and eastern Pacific. It is a major driver of India’s monsoon, usually associated with weak or delayed monsoons.',
    bullets: [
      'El Niño-Southern Oscillation has three phases: El Niño, La Niña and neutral.',
      'During El Niño the trade winds weaken and warm water pools in the eastern Pacific.',
      'Historically, many Indian monsoons in El Niño years are deficient, affecting agriculture and inflation.',
      'The phenomenon recurs every 2–7 years and lasts 9–12 months.',
      'It is linked with the “equatorial” warming pattern and climate teleconnections worldwide.',
      'Along with the South Asian monsoon, the Indian Ocean Dipole (IOD) modulates its impact on India.'
    ],
    facts: [
      'Warm phase of ENSO',
      'Affects the Indian monsoon',
      'Recurs every 2–7 years',
      '1997 and 2015 were strong El Niño years'
    ],
    comparisons: ['la niña', 'indian ocean dipole', 'monsoon']
  },

  'la niña': {
    summary: 'La Niña is the cool phase of ENSO, with cooler-than-normal sea surface temperatures in the central and eastern Pacific. It often brings stronger and above-normal monsoons to India.',
    bullets: [
      'Cool phase of the El Niño–Southern Oscillation.',
      'Strengthens the east–west trade winds and deepens the eastern Pacific cold pool.',
      'Generally associated with better-than-normal Indian monsoons.',
      'Often follows a strong El Niño, as in 2020 after 2019’s deficit monsoon.',
      'Can cause flooding in some regions and drought elsewhere across the globe.',
      'The joint monsoon-ENSO relationship is monitored by IMD and the World Meteorological Organization.'
    ],
    facts: [
      'Cool phase of ENSO',
      'Generally strengthens Indian monsoon',
      '2020–21 — strong La Niña period'
    ],
    comparisons: ['el niño', 'monsoon']
  },

  'chandrayaan-3': {
    summary: 'Chandrayaan-3, launched on 14 July 2023, was ISRO’s successful soft-landing mission on the Moon. The Vikram lander landed near the lunar south pole on 23 August 2023, making India the first nation to land there.',
    bullets: [
      'Launched from Sriharikota on 14 July 2023 on LVM3-M4.',
      'Vikram lander touched down near the south pole at 68.36°S on 23 August 2023 — the first near the lunar south pole.',
      'The Pragyan rover deployed and confirmed the presence of sulphur, iron and oxygen near the landing site.',
      'The mission survived the lunar day (≈14 earth days) and conducted seismology on the far side.',
      'ISRO put the spacecraft in a fuel-efficient trajectory using Earth gravity assists.',
      'India became the fourth country to soft-land on the Moon and the first near the south pole.'
    ],
    facts: [
      '14 Jul 2023 — launch',
      '23 Aug 2023 — landing near south pole',
      'LVM3-M4 rocket',
      'First south-pole landing by any nation'
    ],
    comparisons: ['chandrayaan-1', 'mangalyaan', 'indian space research organisation']
  },

  'mangalyaan': {
    summary: 'Mangalyaan (Mars Orbiter Mission, MOM) was India’s first interplanetary mission, launched on 5 November 2013. It reached Mars orbit on 24 September 2014 on its very first attempt — a world first.',
    bullets: [
      'Launched by ISRO on 5 November 2013 from Sriharikota on a PSLV-XL.',
      'Reached Martian orbit on 24 September 2014 on the first attempt — the first nation to do so.',
      'Studied Martian surface, morphology, mineralogy and the thin CO2 atmosphere.',
      'Operated around Mars for over eight years, well beyond its planned six-month mission.',
      'The mission’s total cost was remarkably low, showcasing frugal engineering.',
      'MOM also carried instruments for methane detection and dust storms.'
    ],
    facts: [
      '5 Nov 2013 — launch',
      '24 Sep 2014 — Mars orbit insertion',
      'First attempt success',
      'PSLV-XL rocket'
    ],
    comparisons: ['chandrayaan-3', 'indian space research organisation']
  },

  'pokhran-ii': {
    summary: 'Pokhran-II (Operation Shakti) was India’s second underground nuclear series, conducted on 11 and 13 May 1998 at Pokhran, Rajasthan. It included the Shakti-III hydrogen-bombs and established India as a nuclear-weapon state.',
    bullets: [
      'Led by the government of PM Atal Bihari Vajpayee on 11 May 1998 (three devices) and 13 May 1998 (two sub-kiloton devices).',
      'The site was the Rajasthan desert near Jaisalmer; code named Operation Shakti.',
      'The tests included a thermonuclear (hydrogen) device and fission devices.',
      'India declared itself a nuclear weapon state and imposed a moratorium on further tests.',
      'The tests drew sanctions from the US and Japan but changed India’s strategic standing.',
      'Thereafter India maintained a “first-use-not-rule” doctrine, later questioned in doctrinal statements.'
    ],
    facts: [
      '11–13 May 1998 — tests',
      'Operation Shakti',
      'Pokhran, Rajasthan',
      'First tests were the 1974 Smiling Buddha'
    ],
    comparisons: ['smiling buddha nuclear test', 'defence research and development organisation']
  },

  'indian space research organisation': {
    summary: 'The Indian Space Research Organisation (ISRO), headquartered in Bengaluru, is India’s national space agency, formed in 1969. From Aryabhata to Chandrayaan and Mangalyaan, it has made India a leading space power.',
    bullets: [
      'Founded in 1969, succeeding the INCOSPAR (1962) under Vikram Sarabhai.',
      'Headquartered at Bengaluru; developed the PSLV, GSLV and LVM3 launch vehicles.',
      'Indigenous satellites (INSAT, IRS, IRNSS/NavIC) serve communication, meteorology and navigation.',
      'Milestones: Aryabhata (1975), SLV-3 (1980), PSLV (1993), Chandrayaan-1 (2008), Mars Orbiter Mission (2013) and Chandrayaan-3 (2023).',
      'Known for cost-effective space exploration and commercial launches (Antrix).',
      'Its 2023 Chandrayaan-3 south-pole landing and the Aditya-L1 solar observatory (2023–24) are recent landmarks.'
    ],
    facts: [
      '1969 — ISRO formed',
      '1975 — Aryabhata satellite',
      '2013 — Mangalyaan (MOM)',
      '2023 — Chandrayaan-3 south-pole landing'
    ],
    comparisons: ['chandrayaan-3', 'mangalyaan', 'vikram sarabhai']
  },

  'green revolution': {
    summary: 'The Green Revolution of the 1960s–70s was India’s cereal-boom triggered by high-yielding varieties, irrigation and fertilisers. It made India self-sufficient in food grains but with regional disparities and environmental costs.',
    bullets: [
      'Based on Norman Borlaug’s high-yielding dwarf wheat varieties introduced with US help.',
      'Launched nationally from 1966–67 with the Navdanya-era new seeds, fertilisers and irrigation.',
      'M. S. Swaminathan led India’s adaptation; the C-306 and Lok1 wheats and IR8 rice spread in Punjab, Haryana and western UP.',
      'Production of wheat and rice rose sharply, ending India’s dependence on PL-480 food imports.',
      'The revolution concentrated on irrigated areas, widening the regional imbalance and creating tube-well groundwater depletion.',
      'It was complemented by price procurement, the Food Corporation of India and the Minimum Support Price.'
    ],
    facts: [
      '1966-67 — launch in India',
      'High-yielding varieties — wheat, rice',
      'M. S. Swaminathan — leading Indian authority',
      'Made India food-grain self-sufficient'
    ],
    comparisons: ['operation flood', 'five-year plans (india)']
  },

  'mgnrega': {
    summary: 'MGNREGA (2005) is the flagship rights-based rural employment guarantee, providing 100 days of unskilled work per household in a financial year. It is built on the principle that employment is a legal right.',
    bullets: [
      'Enacted in 2005 as NREGA, renamed Mahatma Gandhi NREGA in 2009 by the UPA government.',
      'Guarantees 100 days of wage employment per rural household in a financial year.',
      'Provides work within 15 days of the application; unemployment allowance if not provided.',
      'Poverty-trap themes: works must be development-oriented — water conservation, land development, rural roads.',
      'Aim: strengthen rural livelihood, women’s participation and transparency (social audit).',
      'Funded jointly by the Centre (wages) and States; governance via PRIs and gram sabhas.'
    ],
    facts: [
      '2005 — NREGA Act',
      '100 days per rural household per year',
      'Renamed MGNREGA in 2009',
      'Rights-based rural employment law'
    ],
    comparisons: ['bharat nirman', 'blue revolution']
  },

  'sarkaria commission': {
    summary: 'The Sarkaria Commission (1983–88), chaired by Justice R. S. Sarkaria, examined centre–state relations in India. Its 247 recommendations largely favoured the status quo but shaped later intergovernmental ties.',
    bullets: [
      'Set up in 1983 by the Central government to review centre–state relations.',
      'Examined the reservation of states vis-à-vis the Union, finance and constitutional offices.',
      'Recommended a permanent inter-state council; the Inter-State Council was formed in 1990.',
      'Advocated a more collegial and advisory approach to Article 356 utilisation.',
      'The Punchhi Commission (2007–10) built further on its findings on federal relations.',
      'Largely considered the institutional foundation of cooperative federalism debates.'
    ],
    facts: [
      '1983 — Commission set up',
      'Justice R. S. Sarkaria chaired it',
      '247 recommendations',
      '1990 — Inter-State Council created'
    ],
    comparisons: ['mandal commission', 'kothari commission']
  },

  'mandal commission': {
    summary: 'The Mandal Commission (1979–80), chaired by B. P. Mandal, was created to identify the socially or educationally backward classes and recommend reservation. Its 27% OBC reservation notification in 1990 sparked nationwide upheaval.',
    bullets: [
      'Appointed in December 1979 under the Janata government with B. P. Mandal (former Bihar CM) as chair.',
      'Reported in 1980, estimating 52% of the population as OBCs and recommending 27% reservation in central jobs.',
      'The recommendation was notified in August 1990 by PM V. P. Singh.',
      'Widespread anti-reservation protests and self-immolations followed; the Supreme Court in Indra Sawhney (1992) upheld 27% but excluded the “creamy layer”.',
      'The report also touched on land reform and local self-government.',
      'It catalysed the emergence of OBC politics and social justice in Indian democracy.'
    ],
    facts: [
      '1979 — Commission appointed',
      '1980 — report submitted',
      '27% OBC reservation recommended',
      '1990 — notification by V. P. Singh'
    ],
    comparisons: ['sarkaria commission', 'kothari commission']
  },

  'vice president of india': {
    summary: 'The Vice-President of India is the second-highest constitutional office, elected by an electoral college of both houses of Parliament. He is the ex-officio Chairman of the Rajya Sabha and acts as President in a vacancy.',
    bullets: [
      'Elected by members of both Houses of Parliament (nominated members excluded) by single transferable vote.',
      'Must be a citizen of India aged at least 35, qualified for election to the Rajya Sabha.',
      'Ex-officio Chairman of the Rajya Sabha; presides over parliamentary business.',
      'Can officiate as President for not more than six months when the office falls vacant.',
      'Removal requires a resolution passed by a majority in the Rajya Sabha and agreed by the Lok Sabha.',
      'The present Vice-President is elected for five years with no constitutional ceiling on re-election.'
    ],
    facts: [
      'Article 63–73 — office of the VP',
      'Chairman of the Rajya Sabha',
      'Elected by both houses of Parliament',
      'Minimum age — 35 years'
    ],
    comparisons: ['president of india', 'speaker of the lok sabha']
  },

  'speaker of the lok sabha': {
    summary: 'The Speaker of the Lok Sabha is the presiding officer of the lower house, elected from among its members. He maintains order, issues money-bill certificates and is the guardian of members’ privileges.',
    bullets: [
      'Elected by the members of the Lok Sabha from among themselves, invariably from the majority.',
      'Presides over the House, regulates proceedings and has a casting vote in ties (but must abstain on the merits of a bill).',
      'Decides whether a bill is a Money Bill under Article 110 — a decision not subject to outside review.',
      'Maintains discipline (suspension of members), presides over joint sitting (if not from the house) — actually a joint sitting is chaired by the Speaker.',
      'Enjoys a position independent of the executive; can continue after the dissolution of the House until the new House convenes.',
      'Can be removed by a majority resolution of the Lok Sabha on a 14-day notice.'
    ],
    facts: [
      'Presiding officer of the Lok Sabha',
      'Article 93 — election of Speaker',
      'Casting vote only in a tie',
      'Decides money bills under Article 110'
    ],
    comparisons: ['vice president of india', 'deputy speaker of the lok sabha']
  },

  'world war i': {
    summary: 'The First World War (1914–1918) was a global conflict between the Triple Entente and the Central Powers, ignited by the assassination of Archduke Franz Ferdinand. It reshaped world order, empires and India’s national movement.',
    bullets: [
      'Began 28 July 1914 after the assassination of Archduke Franz Ferdinand at Sarajevo (28 June 1914).',
      'Fought between the Allies (Britain, France, Russia, later USA) and the Central Powers (Germany, Austria-Hungary, Ottoman Turkey).',
      'Lead to war of attrition with trench warfare, submarines and new weapons; the US entered in 1917.',
      'India contributed over a million soldiers; the war swelling nationalism and the Home Rule demands.',
      'Ended with the Armistice of 11 November 1918 and the Treaty of Versailles (1919).',
      'The war destroyed empires (Ottoman, Austro-Hungarian, Russian, German) and planted the seeds of World War II.'
    ],
    facts: [
      '1914–18 — war years',
      '11 Nov 1918 — armistice',
      'Treaty of Versailles 1919',
      'Over a million Indian soldiers served'
    ],
    comparisons: ['world war ii', 'treaty of versailles', 'russian revolution']
  },

  'world war ii': {
    summary: 'The Second World War (1939–1945) was the deadliest conflict in history, fought between the Allies and the Axis powers. It ended with the defeat of Germany (May 1945) and Japan (August 1945), and its aftershocks divided the world into Cold War blocs.',
    bullets: [
      'Began when Germany invaded Poland on 1 September 1939; Britain and France declared war.',
      'Major campaigns: German blitzkrieg in Europe, the Battle of Britain, the Eastern front, and the Pacific war against Japan.',
      'India was drawn in as a British colony; millions of Indians fought, and the Cripps Mission and Quit India happened against the backdrop.',
      'The US entered after Pearl Harbor (7 December 1941); the Axis surrendered step by step through 1945.',
      'Germany surrendered on 7–8 May 1945 (VE Day); Japan surrendered on 15 August 1945 after the atomic bombings of Hiroshima and Nagasaki.',
      'The United Nations was founded in 1945; Cold War between the USA and the USSR followed.'
    ],
    facts: [
      '1 Sep 1939 — war begins',
      '7 Dec 1941 — Pearl Harbor',
      '8 May 1945 — VE Day',
      '15 Aug 1945 — Japan surrenders'
    ],
    comparisons: ['world war i', 'azad hind fauj', 'holocaust']
  },

  'french revolution': {
    summary: 'The French Revolution (1789–1799) overthrew the Bourbon monarchy and feudal privileges, proclaiming liberty, equality and fraternity. It remade modern political thought and inspired the world, including Indian nationalists.',
    bullets: [
      'Began with the storming of the Bastille on 14 July 1789.',
      'Estate-General → National Assembly; the Declaration of the Rights of Man and the Citizen (26 August 1789).',
      'Abolition of feudalism, the guillotine terror under Robespierre (1793–94), and the rise of Napoleon.',
      'Louis XVI was executed on 21 January 1793; the Republic replaced the monarchy.',
      'Impact: spread of democratic ideas, nationalism and the end of absolute monarchy in France.',
      'Its ideals of liberty and equality influenced revolutionary movements across Europe and educated opinion in India.'
    ],
    facts: [
      '14 Jul 1789 — Bastille stormed',
      '26 Aug 1789 — Rights of Man and Citizen',
      '21 Jan 1793 — Louis XVI executed',
      '1799 — Napoleon takes power'
    ],
    comparisons: ['american revolution', 'russian revolution', 'indian independence movement']
  },

  'russian revolution': {
    summary: 'The Russian Revolution of 1917 overthrew the Tsarist autocracy and created the world’s first socialist state. The February Revolution ended the Tsar; the October Revolution brought the Bolsheviks under Lenin to power.',
    bullets: [
      'February 1917: food riots and mutiny in Petrograd forced Tsar Nicholas II to abdicate (15 March 1917).',
      'The Provisional Government and the soviets competed for power until Lenin’s Bolsheviks seized power on 25 October (7 November) 1917.',
      'Vladimir Lenin’s slogan “Peace, Land and Bread” and the soviets (workers’ councils) fuelled the Bolshevik coup.',
      'The new regime nationalised banks and land, withdrew from World War I (Treaty of Brest-Litovsk, March 1918).',
      'Civil war (1918–21) between Reds and Whites ended with Soviet victory; the USSR was created in 1922.',
      'The revolution reshaped the 20th-century world and inspired communism across Asia, including India’s left movement.'
    ],
    facts: [
      'Feb 1917 — Tsar abdicates',
      'Oct 1917 — Bolshevik revolution',
      'Lenin — leader of the revolution',
      '1922 — USSR created'
    ],
    comparisons: ['french revolution', 'world war i', 'cold war']
  },

  'american revolution': {
    summary: 'The American Revolution (1775–1783) won independence for the thirteen American colonies from Britain. The Declaration of Independence (1776) and the ensuing constitution established the world’s premier modern republic.',
    bullets: [
      'Triggered by taxation without representation — stamps, tea duty — leading to the Boston Tea Party (1773).',
      'War began at Lexington and Concord (April 1775); George Washington commanded the Continental Army.',
      'Declaration of Independence adopted 4 July 1776.',
      'French and Spanish support proved decisive; the British surrendered at Yorktown (1781).',
      'Treaty of Paris (1783) recognised US independence.',
      'The US Constitution (1787) created a federal republic that influenced later constitutionalism worldwide.'
    ],
    facts: [
      '4 Jul 1776 — Declaration of Independence',
      '1775–83 — war years',
      '1783 — Treaty of Paris',
      '1787 — US Constitution'
    ],
    comparisons: ['french revolution', 'industrial revolution']
  },

  'cold war': {
    summary: 'The Cold War (1947–1991) was the ideological, military and economic rivalry between the capitalist USA-led bloc and the socialist USSR-led bloc. India’s non-alignment platform was forged in this bipolar world.',
    bullets: [
      'Began after World War II; the USA and USSR became superpowers with rival blocs (NATO 1949, Warsaw Pact 1955).',
      'Proxy wars, espionage and arms races (nuclear stockpiles) marked the rivalry, with direct war avoided.',
      'The period saw the space race, Cuban Missile Crisis (1962) and decolonisation.',
      'India championed the Non-Aligned Movement (NAM, 1961) with Nehru, Nasser and Tito as founders.',
      'The Berlin Wall fell in 1989 and the USSR dissolved in 1991, ending the Cold War.',
      'The unipolar and later multipolar orders followed the collapse.'
    ],
    facts: [
      '1947–91 — Cold War period',
      'NAM founded at Belgrade 1961',
      '1962 — Cuban Missile Crisis',
      '1991 — USSR dissolved'
    ],
    comparisons: ['world war ii', 'marshall plan', 'berlin wall']
  },

  'great depression': {
    summary: 'The Great Depression (1929–1939) was the deepest economic downturn of the industrial era, beginning with the US Wall Street crash of October 1929. It devastated global trade, agriculture and caused mass unemployment; it lasted until the eve of World War II.',
    bullets: [
      'Begun with the US share-market crash on 29 October 1929 (Black Tuesday).',
      'Production fell and banks failed across the US and Europe; unemployment reached about 25% in the US.',
      'Spread worldwide through trade collapse; commodity prices crashed, hurting colonial economies including India.',
      'The US response — the New Deal (1933) — expanded public works and regulation under Roosevelt.',
      'Economic nationalism (tariffs, protectionism) deepened the depression; currencies were devalued.',
      'Recovery came only with World War II-era spending.'
    ],
    facts: [
      '1929 — Wall Street crash',
      '1933 — FDR’s New Deal',
      '1939 — ends with WWII-like revival',
      '~25% US unemployment at peak'
    ],
    comparisons: ['world war ii', 'american revolution']
  }
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

var TEPLATED = /^the\s+(people|key events|key concepts|works|battles|places|monuments|documents|sites|landmarks|groups|organs)\s+(linked to|associated with|related to|of)\b/i;

function cleanRawText(text) {
  if (!text) return '';
  var t = String(text);
  // Strip wiki markdown noise
  t = t.replace(/\[edit\]/gi, ' ')
       .replace(/[|{]{2,}[^|{}\n]*(?:[|][^|{}\n]*)*[|}]{2}/g, ' ')
       .replace(/[[\]]{2,}/g, ' ')
       .replace(/==+[^=\n]+==+/g, ' ')
       .replace(/<ref[^>]*>.*?<\/ref>/gi, ' ')
       .replace(/<ref[^>]*\/>/gi, ' ')
       .replace(/&#?\w+;/g, ' ')
       .replace(/[-–_]\s*$/gm, '')
       .replace(/\b(?:[0-9]+)\s*\]/g, ' ');
  t = t.replace(/[Ã©Ã£â€]*[\u0080-\uFFFF]/g, function(m) {
    // drop mojibake fragments
    return /[a-zA-Z0-9 .,!?;\-():%]/.test(m) ? m : ' ';
  });
  t = t.replace(/\s{2,}/g, ' ');
  return t.trim();
}

var JUNK_TERMS = [
  'see also', 'external links', 'further reading', 'this article', 'the article',
  'this list', 'references', 'citation needed', 'cite web', 'http', 'https',
  'wiktionary', 'disambiguation', 'is a stub', 'stub page', 'carries info',
  'infobox', 'look up', 'retrieved', 'retrieved on', 'archived', 'in election',
  'members currently hold', 'as of ',
];

var TEMPLATE_PHRASES = [
  /^the (people|key events|key concepts|works|battles|places|sites|documents|landmarks) (linked to|associated with|related to|of)\b/i,
  /^(this is|these are|here is|the following|list of)\b/i,
  /^the year (of|in)\b/i
];

// ---------------------------------------------------------------------------
// TIMELINE KNOWLEDGE GRAPH — the primary source for auto-generated topics.
// Every node has {id:"cat|Name", name, type, span:{min,max}, era, cats, count,
// desc}. timeline.json adds typed edges (rel) and weighted co-mention links (w).
// ---------------------------------------------------------------------------
var TIMELINE_FILE = path.join(DATA_DIR, 'timeline.json');

var T_NODES_BY_CANON = {};
var T_NODE_BY_ID = {};
var T_EDGES = {}; // id -> {otherId: rel}
var T_LINKS = {}; // id -> {otherId: w}

function canonName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim(); }
function typeTitle(t) { return String(t || 'misc').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
// The timeline build mistypes some civilizations/cities as 'person' or 'event';
// same overrides the flowchart's EXTRA_TYPE uses, so revision Type facts match.
var EXTRA_TYPE = {
  'delhi sultanate': 'empire', 'abbasid caliphate': 'empire', 'umayyad caliphate': 'empire',
  'rashidun caliphate': 'empire', 'fatimid caliphate': 'empire', 'ottoman caliphate': 'empire',
  'mongol empire': 'empire', 'chola empire': 'empire', 'gupta empire': 'empire', 'maurya empire': 'empire',
  'athens': 'place', 'sparta': 'place', 'babylon': 'place', 'assyria': 'place', 'carthage': 'place',
  'thrace': 'place', 'britannia': 'place', 'phoenicia': 'place', 'persia': 'place', 'mesopotamia': 'place',
  'byzantium': 'place', 'meiji restoration': 'event', 'tang dynasty': 'dynasty'
};
function effectiveType(topicName, t) { return EXTRA_TYPE[canonName(topicName)] || t; }
function fmtYear(y) { return y == null ? '' : (y < 0 ? (-y) + ' BC' : String(y)); }
function spanLabel(span) {
  if (!span || (span.min == null && span.max == null)) return '';
  return fmtYear(span.min) + (span.max > span.min ? '\u2013' + fmtYear(span.max) : '');
}
// Person spans are the corpus mention window, not the lifespan: Washington
// "1699–2026", LBJ "1900–1999", Idi Amin "1889–2025" all read as lifespans
// but are band artifacts. Return '' when the window is implausible for one life.
function personSpan(n) {
  var s = n && n.span;
  if (!s || s.min == null || s.max == null) return spanLabel(s);
  var r = s.max - s.min;
  if (r > 125) return '';
  if (r >= 80 && (s.min % 100 === 0 || s.max % 100 === 99)) return '';
  return spanLabel(s);
}
function cleanDesc(d) { return String(d || '').replace(/(\.\.\.|\u2026)\s*$/, '').replace(/\s+/g, ' ').trim(); }
function isNodeUseful(n) {
  if (!n) return false;
  var c = canonName(n.name);
  if (!c) return false;
  if (/^(the\s+)?(people|key events|key concepts|things|timeline|list|index)\s/i.test(c)) return false;
  return true;
}
function prettyName(t) {
  return String(t || '').split(/\s+/).filter(Boolean).map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}
function loadTimeline() {
  var tl = JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8'));
  var nodes = [];
  if (Array.isArray(tl.nodes)) {
    nodes = tl.nodes;
  } else {
    var parts = tl.nodesParts || 0;
    for (var i = 0; i < parts; i++) {
      var arr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'timeline.nodes.' + i + '.json'), 'utf8'));
      nodes = nodes.concat(arr);
    }
  }
  nodes.forEach(function (n) {
    T_NODE_BY_ID[n.id] = n;
    var c = canonName(n.name);
    if (!c) return;
    (T_NODES_BY_CANON[c] = T_NODES_BY_CANON[c] || []).push(n);
  });
  (tl.links || []).forEach(function (l) {
    if (!T_NODE_BY_ID[l.a] || !T_NODE_BY_ID[l.b]) return;
    (T_LINKS[l.a] = T_LINKS[l.a] || {})[l.b] = l.w;
    (T_LINKS[l.b] = T_LINKS[l.b] || {})[l.a] = l.w;
  });
  (tl.edges || []).forEach(function (e) {
    if (!T_NODE_BY_ID[e.a] || !T_NODE_BY_ID[e.b]) return;
    (T_EDGES[e.a] = T_EDGES[e.a] || {})[e.b] = e.rel;
    (T_EDGES[e.b] = T_EDGES[e.b] || {})[e.a] = e.rel;
  });
  Object.keys(T_NODES_BY_CANON).forEach(function (k) {
    T_NODES_BY_CANON[k].sort(function (a, b) {
      return String(b.desc || '').length - String(a.desc || '').length;
    });
  });
}
function timelineNodesFor(topicName) {
  return (T_NODES_BY_CANON[canonName(topicName)] || []).filter(isNodeUseful)
    .sort(function (a, b) { return (b.count || 0) - (a.count || 0) || String(b.desc || '').length - String(a.desc || '').length; });
}
function mergeCats(nodes) {
  var agg = {};
  nodes.forEach(function (n) {
    (n.cats || []).forEach(function (c) {
      var label = typeof c === 'string' ? c : (c && c.label) || '';
      if (!label) return;
      var e = agg[label] || (agg[label] = { count: 0, n: 0 });
      e.count += (c && typeof c === 'object' && c.count) || 1;
      e.n++;
    });
  });
  return Object.keys(agg).map(function (k) { return { label: k, count: agg[k].count }; })
    .sort(function (a, b) { return b.count - a.count; });
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map(function (s) { return s.trim().replace(/^["'“`]+|["'”`]+$/g, ''); })
    .filter(function (s) { return s.length > 0; });
}

function hasRepeatedCore(s) {
  var core = s.trim().replace(/\s+/g, ' ').toLowerCase();
  var short = core.substring(0, 40);
  var first = core.indexOf(short);
  var second = core.indexOf(short, first + short.length >= core.length - 5 ? 40 : first + 1);
  var chunk = core.substring(0, 24);
  return core.indexOf(chunk, 24) !== -1;
}

function isJunkSentence(s) {
  var low = s.toLowerCase();
  for (var i = 0; i < JUNK_TERMS.length; i++) {
    if (low.indexOf(JUNK_TERMS[i]) !== -1) return true;
  }
  if (TEMPLATE_PHRASES.some(function (rx) { return rx.test(low); })) return true;
  if (low.indexOf('may refer to') !== -1) return true;
  if (low.indexOf('this article is about') !== -1) return true;
  if (low.indexOf('—') !== -1) return true;
  if (s.length < 25 || s.length > 320) return true;
  if (/(\.\.\.|…)\s*$/.test(s)) return true;
  if (/\b(?:freedom struggle|colonial era|ancient era|medieval era|modern era|independent india|moving picture era)\b[\s,:-]*\d{4}/i.test(s)) return true;
  if (/\b\d{4}[–]\d{4}\b/.test(s) && !/\b(?:r\.\s*|reign|flourished|lived|taken|c\.)/i.test(s)) return true;
  if (hasRepeatedCore(s)) return true;
  if (!/^[A-Z0-9(]/.test(s.trim())) return true;
  return false;
}

function sentenceScore(s) {
  var score = 0;
  if (/(?:18|19|20)\d{2}/.test(s)) score += 3;
  if (/\b(?:\d{1,4})\s*(?:bce|ce|ad|bc)\b/i.test(s)) score += 3;
  if (/\b\d+\s*(?:%|percent|million|billion|crore|lakh|thousand|km|tonnes)\b/i.test(s)) score += 2;
  if (/^(?:the|a|an)\s+[A-Z]/.test(s)) score += 1;
  if (/\b(?:was|became|founded|established|built|defeated|died|born|lived|ruled|fought|launched|signed|introduced|abolished|partition|declared|elected|appointed|invented|discovered)\b/i.test(s)) score += 2;
  if (/\b(?:india|indian|british|bengal|punjab|delhi|bihar|mumbai|kolkata|gandhi|nehru|ambedkar|ashoka|maurya|gupta|mughal|congress|constitution|parliament|raj)\b/i.test(s)) score += 1;
  if (/^[a-z]/.test(s)) score -= 1;
  if (/\[|\]|::|'''/.test(s)) score -= 2;
  return score;
}

function extractCandidates(topicData) {
  var cands = [];
  (topicData.branches || []).forEach(function (branch) {
    (branch.items || []).forEach(function (item) {
      // 1: prefer long descriptive notes
      var raw = cleanRawText(item.desc) + ' ' + cleanRawText(item.note);
      splitSentences(cleanRawText(raw)).forEach(function (s) { cands.push({ s: s, it: item.name }); });
      // 2: evidence text often contains complete factual sentences
      var ev = cleanRawText(item.ev);
      if (ev.length > 80) {
        splitSentences(ev).forEach(function (s) { cands.push({ s: s, it: item.name, ev: true }); });
      }
    });
  });
  return cands;
}

function dedupe(rows) {
  var seen = {};
  return rows.filter(function (r) {
    var key = r.s.toLowerCase().replace(/\s+/g, ' ').substring(0, 60);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function pickTop(rows, n) {
  var picked = [];
  var used = {};
  rows.sort(function (a, b) { return b.score - a.score; });
  for (var i = 0; i < rows.length && picked.length < n; i++) {
    picked.push(rows[i]);
  }
  return picked;
}

function topicCoreToken(name) {
  var toks = canonName(name).split(' ');
  for (var i = toks.length - 1; i >= 0; i--) {
    if (toks[i].length >= 4 && !/^\d+$/.test(toks[i])) return toks[i];
  }
  return toks[0] || '';
}
function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// --- typed-relation guards -------------------------------------------------
// The mined edge table is noisy: a disease node can carry "founded: Quebec"
// and a place node "niece: Germanicus" (paragraph co-mentions absorbed by the
// kin/founder miners). Revision bullets only surface relations that pass
// category + naming + span checks so the cards never assert false "facts".
var REL_KIN_R = /^(father of|mother of|son of|daughter of|brother of|sister of|spouse of|wife of|husband of|married|married to|uncle of|aunt of|cousin of|grandfather of|grandmother of|grandson of|granddaughter of|grandparent of|grandchild of|nephew of|niece of|ancestor of|descendant of|descends from|relative of|heir of)$/i;
var REL_FOUND_R = /^(founded|founded by|founded in|founder of|founder|established|established by|established in|created|created by|created in|inaugurated)$/i;
var REL_POL_R = /^(succeeded by|succeeded|preceded by|preceded|predecessor of|successor of|ruled|rule of|ruler of|dynasty of|capital of|head of|leader of|member of|joined|abolished|revived|annexed|partitioned|commanded|commander of|defeated|defeated by|defeated at|invaded|conquered|conquering|killed|killed at|assassinated|ally of|rival of|fought|fought against|fought at|siege of|took part in)$/i;
var REL_FOUNDER_TYPES = /^(person|ruler|emperor|king|queen|sultan|prince|chieftain|leader|empire|dynasty|kingdom|republic|state)$/i;
var NAME_TITLE_R = /^[A-Z][A-Za-z]+(\s+[A-Z][A-Za-z]+)*$/;
var REL_JUNK_CANON = {};
'originally eventually ultimately meanwhile moreover however following during subsequently previously finally formerly newly later early soon secondly first next then while younger older elder junior senior royal colonial nal media minister governor general historian anthropologist chancellor regent ruler monarch emperor queen king sultan wife husband father mother son daughter brother sister cousin uncle aunt ancestor descendant founder roman transport'.split(' ').forEach(function (w) { REL_JUNK_CANON[w] = 1; });
function relMidYear(n) {
  if (!n || !n.span) return null;
  var s = n.span;
  if (s.min == null && s.max == null) return null;
  return ((s.min == null ? 0 : s.min) + (s.max == null ? 0 : s.max)) / 2;
}
function isPlaceType(t) { return /^(place|country|geography|city|state|territory|location|river|island|region|province|county|mountain|sea|ocean|valley|desert|forest)$/i.test(String(t || '')); }
// Allow a single-token neighboring entity only when it is itself a full
// revision topic (a one-name UPSC key) or its type marks it as a real
// place/org — not the weak "this word recurs near the topic" heuristic.
function singleTokenOK(n, hasRevKey) {
  if (!n || !n.name) return false;
  var nm = String(n.name).trim();
  if (nnTokCount(nm) > 1) return true;
  if (hasRevKey) return true;
  return isPlaceType(n.type) || /^(empire|dynasty|kingdom|org|institution|university|temple|state|war|battle|revolution|movement)$/i.test(String(n.type || ''));
}
function relRowOK(topicNode, rel, n, hasRevKey) {
  var type = topicNode ? String(topicNode.type || '') : '';
  var r = String(rel || '').toLowerCase().trim();
  if (!n || !n.name) return false;
  var nm = String(n.name).trim();
  // single-token ghost words ("Originally", "Younger", "Royal", "Colonial",
  // role nouns) are paragraph fragments the miners absorb, never real entities
  if (nnTokCount(nm) === 1 && REL_JUNK_CANON[canonName(nm)]) return false;
  if (REL_KIN_R.test(r)) {
    if (!/^(person|ruler|emperor|king|queen|prince)$/i.test(type) || n.type !== 'person') return false;
    if (!NAME_TITLE_R.test(nm)) return false;
    var a = relMidYear(topicNode), b = relMidYear(n);
    if (a != null && b != null && Math.abs(a - b) > 150) return false;
    return true;
  }
  if (REL_FOUND_R.test(r)) {
    if (!REL_FOUNDER_TYPES.test(type)) return false;
    if (!NAME_TITLE_R.test(nm)) return false;
    // a founder's target is an empire/movement/place/school — never a person;
    // person→person "founded" edges are dynasty/succession reversals the miner
    // mislabels (Jahangir "founded" Humayun, Reagan "founded" Carter)
    if (n.type === 'person') return false;
    if (!singleTokenOK(n, hasRevKey)) return false;
    return true;
  }
  if (REL_POL_R.test(r)) {
    if (!NAME_TITLE_R.test(nm)) return false;
    if (n.type === 'concept' && !/dynasty of|ruled|rule of|ruler of|capital of/.test(r)) return false;
    // a person is never the "rival of" a river, state or island: place-type
    // targets for clashes/successions/ally relations are co-mention noise
    if (isPlaceType(n.type) &&
        /^(rival of|ally of|friend of|succeeded by|succeeded|preceded by|preceded|predecessor of|successor of|member of|joined|killed|defeated|fought|fought against)/.test(r)) return false;
    return true;
  }
  return false;
}
function nnTokCount(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

// Timeline-driven auto content: summaries/span/era/cats come from the knowledge
// graph nodes; bullets and comparisons from typed edges + weighted co-mentions.
function buildAutoContent(topicName, topicData) {
  var nodes = timelineNodesFor(topicName);
  var primary = nodes[0] || null;
  if (!primary) return buildLayerContent(topicName, topicData);

  var desc = cleanDesc(primary.desc);
  // sentence-fragment descs ("then ruled by a Hindu chief…", "In 1848, Charles
  // Dickens invited…") are corpus co-mention snippets, not definitions — drop
  // them so the summary falls back to the templated name + span form
  if (desc && /^(then|that|which|who|while|when|after|before|because|during|ruled by|led by|followed by|under|so|but|and|or|although|despite|after being|having been)\b/i.test(desc)) desc = '';
  var span = (primary.type === 'person') ? personSpan(primary) : spanLabel(primary.span);
  var era = primary.era ? String(primary.era) : '';
  var pretty = prettyName(topicName);
  var summary;
  if (desc) {
    var core = topicCoreToken(topicName);
    summary = (desc.toLowerCase().indexOf(core) === -1 && core) ? (pretty + ' \u2014 ' + capFirst(desc)) : capFirst(desc);
    if (summary.length < 30) {
      var extra = [pretty, span ? span : ''].filter(Boolean).join(' \u00b7 ');
      summary = capFirst(desc) + (extra ? ' (' + extra + ')' : '');
    }
  } else {
    summary = pretty + (span ? ' (' + span + ')' : '') + ' \u2014 key facts for UPSC revision.';
  }

  // merge all nodes sharing the topic's canonical name so spans/cats/relations
  // combine across categories (same topic can exist in several cat shards)
  var ids = nodes.map(function (n) { return n.id; });

  var bullets = [];
  if (span) bullets.push('Timeline: ' + span);
  else bullets.push('Timeline: undated');
  if (primary.type && primary.type !== 'misc') bullets.push('Type: ' + typeTitle(effectiveType(topicName, primary.type)));

  // typed relations (real edges in the graph, guarded against mined kin/founder
  // noise so bullets never assert false "facts" like a disease founding a city)
  var seenRel = {};
  var relRows = [];
  ids.forEach(function (id) {
    var fa = T_EDGES[id] || {};
    Object.keys(fa).forEach(function (nb) {
      var nn = T_NODE_BY_ID[nb];
      if (!nn || !isNodeUseful(nn)) return;
      var nm = String(nn.name).trim();
      if (canonName(nm) === canonName(topicName) || seenRel[nm]) return;
      if (!relRowOK(primary, fa[nb], nn, !!REV_KEY_BY_CANON[canonName(nm)])) return;
      seenRel[nm] = 1;
      relRows.push({ name: nm, rel: fa[nb] });
    });
  });
  relRows.slice(0, 3).forEach(function (r) {
    bullets.push(capFirst(r.rel) + ': ' + r.name);
  });

  // weighted co-mentions (strong only, to avoid paragraph noise)
  var seenLink = {};
  var linkRows = [];
  ids.forEach(function (id) {
    var la = T_LINKS[id] || {};
    Object.keys(la).forEach(function (nb) {
      var lw = la[nb] || 0;
      if (lw < 4) return;
      var nn = T_NODE_BY_ID[nb];
      if (!nn || !isNodeUseful(nn)) return;
      var nm = String(nn.name).trim();
      if (canonName(nm) === canonName(topicName) || seenLink[nm]) return;
      // single-token place/ghost co-mentions ("York", "London") are corpus
      // clustering, not revision facts; keep multi-word or keyed/geo targets
      if (!singleTokenOK(nn, !!REV_KEY_BY_CANON[canonName(nm)])) return;
      seenLink[nm] = 1;
      linkRows.push({ name: nm, w: lw });
    });
  });
  linkRows.sort(function (a, b) { return b.w - a.w; });
  linkRows.slice(0, 2).forEach(function (r) {
    bullets.push('Co-mentioned with ' + r.name + ' (weight ' + r.w + ')');
  });

  // limit bullets but keep a minimum so every card has content
  if (bullets.length < 2 && !primary.type && !era) {
    (nodes.slice(0, 1)).forEach(function () { bullets.push('Topic is present in the timeline knowledge graph.'); });
  }
  bullets = bullets.slice(0, 6);

  // facts: dates, era, subject coverage, mention counts
  var facts = [];
  if (span) facts.push('Dates: ' + span);
  if (primary.type && primary.type !== 'misc') facts.push('Type: ' + typeTitle(effectiveType(topicName, primary.type)));
  var cats = mergeCats(nodes);
  cats.slice(0, 3).forEach(function (p) { facts.push(p.label + ': ' + p.count + ' questions'); });
  if (primary.count) facts.push(primary.count + ' mentions in the knowledge graph');

  return { summary: summary, bullets: bullets, facts: facts };
}

// Fallback auto-extraction from topic-layers when a topic has no timeline node.
function buildLayerContent(topicName, topicData) {
  var cands = dedupe(extractCandidates(topicData)
    .filter(function (c) { return !isJunkSentence(c.s); })
    .map(function (c) { return { s: c.s, it: c.it, score: sentenceScore(c.s) }; }));
  cands.sort(function (a, b) { return b.score - a.score; });

  var bullets = cands.slice(0, 6).map(function (c) { return '\u2022 ' + c.s; });

  var summaryS = cands.filter(function (c) { return c.score >= 2; }).slice(0, 2).map(function (c) { return c.s; });
  var summary = summaryS.length ? summaryS.join(' ') : (topicData.name ? topicName + ' \u2014 key people, events and concepts for UPSC revision.' : '');

  var facts = [];
  cands.forEach(function (c) {
    var isYear = /(?:18|19|20)\d{2}/.test(c.s) || /\b(?:bce|ce|ad|bc)\b/i.test(c.s);
    var isStat = /\b\d+\s*(?:%|percent|million|billion|crore|lakh|thousand|km|tonnes)\b/i.test(c.s);
    if ((isYear || isStat) && c.s.length <= 130 && facts.length < 5) {
      facts.push((isStat && !isYear ? '\uD83D\uDCCA ' : '\uD83D\uDCC5 ') + c.s.replace(/\s+/g, ' '));
    }
  });
  if (facts.length === 0) {
    cands.filter(function (c) { return /^[A-Z0-9(]/.test(c.s.trim()); }).slice(0, 3).forEach(function (c) {
      if (facts.length < 3) facts.push('\uD83D\uDCCC ' + c.s.replace(/\s+/g, ' '));
    });
  }

  return { summary: summary, bullets: bullets, facts: facts };
}

function buildFallbackContent(topicName, topicData) {
  var items = [];
  (topicData.branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      var desc = it.desc ? String(it.desc) : '';
      if (/^(the\s+(people|key events|key concepts)\s+(linked to|associated with|related to|of)\b)/i.test(desc)) desc = '';
      desc = desc.replace(/(\.\.\.|…)\s*$/, '').trim();
      var d = desc.length > 10 ? ': ' + desc.charAt(0).toUpperCase() + desc.slice(1) : '';
      items.push('• ' + it.name + d);
    });
  });
  var bullets = [];
  items.forEach(function (b) {
    if (!bullets.some(function (x) { return x === b; })) bullets.push(b);
  });
  bullets = bullets.slice(0, 6);
  var facts = [];
  (topicData.branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      if (facts.length >= 4) return;
      var m = /([12]\d{3})\s*[–-]\s*([12]\d{3})/.exec(it.desc || '');
      if (m) facts.push('📅 ' + it.name + ' — ' + m[1] + ' to ' + m[2]);
    });
  });
  if (facts.length === 0) {
    (topicData.branches || []).forEach(function (b) {
      (b.items || []).slice(0, 3).forEach(function (it) {
        if (facts.length < 3 && it.name) facts.push('📌' + ' Known associate: ' + it.name);
      });
    });
  }
  return {
    summary: topicName.charAt(0).toUpperCase() + topicName.slice(1) + ' — key figures, events and concepts for UPSC revision.',
    bullets: bullets,
    facts: facts
  };
}

// Related topics come from the timeline graph: nodes sharing an edge or a strong
// co-mention with the topic, ranked by (typed rel > weight > word overlap).
// Names that are also revision topics resolve to their summary for the table.
function buildComparisons(topicName, contentMap) {
  // contentMap keys are topic-layers names; resolve a graph node name to its key
  var keyByCanon = {};
  Object.keys(contentMap).forEach(function (k) { keyByCanon[canonName(k)] = k; });

  var nodes = timelineNodesFor(topicName);
  var rows = [];
  var seen = {};
  var ids = nodes.map(function (n) { return n.id; });

  function consider(nb, edge, w) {
    var nn = T_NODE_BY_ID[nb];
    if (!nn || !isNodeUseful(nn)) return;
    var nm = String(nn.name).trim();
    if (canonName(nm) === canonName(topicName) || seen[nm]) return;
    seen[nm] = 1;
    var key = keyByCanon[canonName(nm)];
    if (!key) return;
    var overlap = 0;
    var tw = canonName(topicName).split(' ');
    var nw = canonName(nm).split(' ');
    tw.forEach(function (w1) { if (w1.length > 3 && nw.indexOf(w1) !== -1) overlap++; });
    rows.push({ name: nm, key: key || '', score: (edge ? 12 : 0) + (Number(w) || 0) + (key ? 6 : 0) + overlap * 2 });
  }
  ids.forEach(function (id) {
    var fa = T_EDGES[id] || {};
    Object.keys(fa).forEach(function (nb) { consider(nb, true, 0); });
    var la = T_LINKS[id] || {};
    Object.keys(la).forEach(function (nb) { if (la[nb] >= 3) consider(nb, false, la[nb]); });
  });
  rows.sort(function (a, b) { return b.score - a.score; });
  var top = rows.slice(0, 2);
  if (!top.length) return [];

  var keyOf = function (r) {
    if (r.key && contentMap[r.key]) {
      var sum = contentMap[r.key].summary || '';
      var t = String(sum).trim();
      var end = t.indexOf('.');
      return (end > 20 ? t.substring(0, end + 1) : t.substring(0, 140));
    }
    var arr = T_NODES_BY_CANON[canonName(r.name)] || [];
    var d = arr.length ? cleanDesc(arr[0].desc) : '';
    if (d) {
      var e2 = d.indexOf('.');
      return (e2 > 20 ? d.substring(0, e2 + 1) : d.substring(0, 140));
    }
    return r.name;
  };

  return [{
    title: 'Related Topics: ' + top.map(function (r) { return r.key || r.name; }).join(', '),
    table: top.map(function (r) { return { topic: r.key || r.name, keyPoint: keyOf(r) }; })
  }];
}

// ---------------------------------------------------------------------------
// GENERATE
// ---------------------------------------------------------------------------
var topicLayers = JSON.parse(fs.readFileSync(TOPIC_LAYERS, 'utf8'));
var revisionContent = {};
var generatedAt = new Date().toISOString();
var TIMELINE_SOURCED = 0;
var REV_KEY_BY_CANON = {};
Object.keys(topicLayers).forEach(function (k) { REV_KEY_BY_CANON[canonName(k)] = 1; });

try {
  loadTimeline();
} catch (err) {
  console.error('Warning: timeline load failed (' + err.message + '); auto topics will fall back to topic-layers only.');
}

Object.keys(topicLayers).forEach(function (topicName) {
  var topicData = topicLayers[topicName] || {};
  var curated = CURATED[topicName];

  if (curated) {
    var comps = [];
    var rel = (curated.comparisons || []).filter(function (r) { return r !== topicName && topicLayers[r]; });
    if (rel.length) {
      comps.push({
        title: 'Related Topics: ' + rel.join(', '),
        table: rel.map(function (n) {
          var other = CURATED[n] || revisionContent[n] || {};
          return {
            topic: n,
            keyPoint: (function () {
              var sum = other.summary || '';
              var dot = sum.indexOf('.');
              return (dot > 20 ? sum.substring(0, dot + 1) : (sum || n).substring(0, 140));
            })()
          };
        })
      });
    }
    revisionContent[topicName] = {
      summary: curated.summary,
      bullets: curated.bullets.map(function (b) { return '• ' + b.replace(/^•\s*/, ''); }),
      facts: curated.facts,
      comparisons: comps,
      curated: true,
      generatedAt: generatedAt
    };
    return;
  }

  var auto = buildAutoContent(topicName, topicData);
  if (auto.facts.length === 0) auto.facts = buildFallbackContent(topicName, topicData).facts;
  if (timelineNodesFor(topicName).length) TIMELINE_SOURCED++;
  revisionContent[topicName] = {
    summary: auto.summary,
    bullets: auto.bullets,
    facts: auto.facts,
    comparisons: [], // filled below once all topics exist
    generatedAt: generatedAt
  };
});

// Build comparisons after all entries exist so related topics can reuse curated summaries.
Object.keys(revisionContent).forEach(function (topicName) {
  if (CURATED[topicName]) return; // curated handles its own
  revisionContent[topicName].comparisons = buildComparisons(topicName, revisionContent);
});

fs.writeFileSync(OUTPUT, JSON.stringify(revisionContent, null, 2));
console.log('Generated revision content for ' + Object.keys(revisionContent).length + ' topics');
console.log('Curated topics: ' + Object.keys(CURATED).filter(function (k) { return topicLayers[k]; }).length);
console.log('Auto topics sourced from timeline graph: ' + TIMELINE_SOURCED);
console.log('Saved to: ' + OUTPUT);
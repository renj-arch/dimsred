const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'course-data.json');
const PRACTICE = path.join(__dirname, 'course-practice.json');

function inject(key, content, qs) {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  data[key] = content;
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const practice = JSON.parse(fs.readFileSync(PRACTICE, 'utf8'));
  practice[key] = qs.map((q, i) => ({
    id: 2301 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-history/overview', `<h3>History Optional — Overview</h3>
<p>History Optional covers ancient, medieval, modern India and world history. It has significant overlap with GS I (History, Art & Culture) and Essay. The subject is factual, chronological, and analytical — ideal for aspirants with a humanities background.</p>
<h3>Paper I — Ancient & Medieval India</h3>
<ul>
<li><strong>Prehistoric & Ancient India:</strong> Paleolithic, Mesolithic, Neolithic, Chalcolithic cultures; Indus Valley Civilization (Harappa, Mohenjo-daro, Lothal, Dholavira — town planning, drainage, trade, decline); Vedic period (Early & Later Vedic — society, polity, religion, economy); Jainism & Buddhism (Buddha, Mahavira, teachings, councils, spread); Mauryan Empire (Chandragupta, Bindusara, Ashoka — edicts, dhamma, administration); Post-Mauryan (Indo-Greeks, Shakas, Parthians, Kushanas — Kanishka, Kanishka's council); Gupta Empire (Golden Age — Samudragupta, Chandragupta II, administration, art, literature, science); Post-Gupta (Vardhana dynasty — Harsha, Nalanda University).</li>
<li><strong>Early Medieval India (750-1200 CE):</strong> Regional kingdoms (Palas, Pratiharas, Rashtrakutas, Cholas, Cheras, Pandyas); South Indian polities (Chola administration, local self-government); Arab conquest of Sindh (Muhammad bin Qasim 712 CE); Turko-Afghan invasions (Mahmud of Ghazni, Muhammad Ghori); Delhi Sultanate (Mamluk, Khalji, Tughlaq, Sayyid, Lodi dynasties); Vijayanagara & Bahmani kingdoms.</li>
<li><strong>Bhakti & Sufi movements:</strong> Bhakti saints (Ramanuja, Kabir, Nanak, Chaitanya, Mirabai, Tulsidas, Eknath, Tukaram); Sufi saints (Moinduddin Chishti, Nizamuddin Auliya, Fariduddin Ganjshakar); impact on society & culture.</li>
</ul>
<h3>Paper II — Modern India & World History</h3>
<ul>
<li><strong>Modern India (1750-1947):</strong> European advent (Portuguese, Dutch, French, British); East India Company rule (Battle of Plassey 1757, Battle of Buxar 1764, Diwani rights 1765); Company administration (Regulating Act 1773, Pitt's India Act 1784, Charter Acts); land revenue settlements (Permanent Settlement 1793, Ryotwari, Mahalwari); Revolt of 1857 (causes, course, consequences); Indian National Congress (1885) & early phase; Swadeshi & Boycott (1905); Extremist phase; Home Rule Movement; Lucknow Pact (1916); Gandhian era (Non-Cooperation 1920-22, Civil Disobedience 1930-34, Quit India 1942); Constitutional developments (Morley-Minto 1909, Montagu-Chelmsford 1919, Simon Commission, Nehru Report, Round Table Conferences, Government of India Act 1935); Provincial autonomy & provincial elections (1937); Cripps Mission (1942); Wavell Plan (1945); Cabinet Mission (1946); Mountbatten Plan (1947); Indian Independence Act 1947; Partition & Partition violence; Integration of princely states (Sardar Patel); Constitution making (Constituent Assembly, Dr. B.R. Ambedkar, Constitution adopted 26 Nov 1949, enforced 26 Jan 1950).</li>
<li><strong>World History:</strong> Renaissance & Reformation (15th-16th centuries); American Revolution (1776); French Revolution (1789) — causes, phases, impact; Napoleonic Wars; Industrial Revolution (18th-19th century — causes, impact, spread); American Civil War (1861-65); Unification of Italy (1861) & Germany (1871); Russian Revolution (1917); World War I (1914-18) — causes, course, consequences, Treaty of Versailles; League of Nations; Russian Revolution (1917) — Bolshevik Revolution, Lenin, Stalin; Great Depression (1929); Rise of Fascism (Mussolini, Italy 1922) & Nazism (Hitler, Germany 1933); World War II (1939-45) — causes, course, consequences, Holocaust, atomic bombing; UNO (1945); Cold War (1947-1991) — Cold War origins, Cold War blocs (NATO, Warsaw Pact), Cold War conflicts (Korean War 1950-53, Vietnam War, Cuban Missile Crisis 1962), decolonization (India 1947, Indonesia 1949, Algeria 1962, African countries 1960s), Non-Aligned Movement (1961), end of Cold War (1989-91), collapse of USSR (1991), globalization.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: Revolt of 1857 answer</div><div class="ex-text">Question: 'Examine the causes & nature of the Revolt of 1857.'</div><div class="ex-soln">Answer: Causes: Political (Doctrine of Lapse, annexation of Awadh, disrespect to Mughal emperor), Economic (land revenue policies, destruction of handicrafts, drain of wealth), Military (greased cartridges, disparity in pay & promotion, discrimination), Social (interference in customs & traditions, Christian missionaries), Immediate cause (greased cartridges of Enfield rifle). Nature of Revolt: Debated — Sepoy Mutiny (British view), First War of Independence (Savarkar & nationalist view), combination of grievances without unified leadership, localized revolts without coordinated leadership. Consequences: End of Company rule (1858), Crown rule (Queen's Proclamation 1858), end of Doctrine of Lapse, reorganization of army (proportion of British troops increased), racial antagonism increased.</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Mughal emperors:</strong> Babur (1526), Humayun (1530), Akbar (1556), Jahangir (1605), Shah Jahan (1627), Aurangzeb (1658).</li>
<li><strong>Delhi Sultanate dynasties:</strong> Mamluk (1206-1290), Khalji (1290-1320), Tughlaq (1320-1414), Sayyid (1414-1451), Lodi (1451-1526).</li>
<li><strong>Maratha Empire:</strong> Shivaji (1674 coronation), Sambhaji, Rajaram, Tarabai, Shahu, Peshwas (Balaji Vishwanath 1713, Baji Rao I, Balaji Baji Rao), Third Battle of Panipat (1761).</li>
<li><strong>Important dates:</strong> 1757 (Plassey), 1764 (Buxar), 1793 (Permanent Settlement), 1857 (Revolt), 1885 (INC founded), 1905 (Swadeshi), 1920-22 (Non-Cooperation), 1930-34 (Civil Disobedience), 1942 (Quit India), 1947 (Independence & Partition).</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">History answers: chronology → causes → course → consequences → significance. Draw maps (extent of empires, battle sites, trade routes). Quote dates, rulers, battles, treaties, acts, commissions. Use source material (travelers' accounts — Megasthenes, Fa-Hien, Xuanzang, Al-Biruni, Ibn Battuta, Marco Polo; foreign travelers' accounts). Quote archaeological evidence (Harappan sites, Ashokan edicts, temple inscriptions, copper plates, coins). Quote literary sources (Vedas, Puranas, epics, Buddhist Jataka tales, Jain texts, court poet accounts — Banabhuta's Harshacharita, Kalhana's Rajatarangini).</div></div>`, [
  {
    text: "Which battle is considered the turning point in establishing British political power in India?",
    options: ["Battle of Plassey (1757)", "Battle of Buxar (1764)", "Battle of Wandiwash (1760)", "Battle of Calcutta (1756)"],
    correct: 0,
    sol: "Battle of Plassey (1757) — Robert Clive defeated Siraj-ud-Daulah, marking the beginning of British political power in India." },
  {
    text: "Which revolt is known as the First War of Indian Independence?",
    options: ["Revolt of 1857", "Santhal Rebellion (1855-56)", "Indigo Revolt (1859-60)", "Deccan Riots (1875)"],
    correct: 0,
    sol: "Revolt of 1857 is considered the First War of Indian Independence (Savarkar & nationalist historians)." },
  {
    text: "Which battle marked the end of the Maratha Empire?",
    options: ["Third Battle of Panipat (1761)", "Battle of Assaye (1803)", "Battle of Koregaon (1818)", "Battle of Wadgaon (1779)"],
    correct: 2,
    sol: "Battle of Koregaon (1818) — British victory over Marathas, effectively ending Maratha power." },
  {
    text: "Which act abolished the East India Company's trading privileges?",
    options: ["Regulating Act 1773", "Pitt's India Act 1784", "Charter Act 1813", "Charter Act 1833"],
    correct: 2,
    sol: "Charter Act 1813 abolished EIC's trade monopoly (except tea & opium), opening India to British private trade." },
  {
    text: "Which Indian ruler signed the Treaty of Seringapatam (1792)?",
    options: ["Tipu Sultan", "Hyder Ali", "Maratha Peshwa", "Nizam of Hyderabad"],
    correct: 0,
    sol: "Tipu Sultan signed the Treaty of Seringapatam (1792) after the Third Anglo-Mysore War, ceding half his territory to the British." }
]);

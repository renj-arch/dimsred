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
    id: 1001 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('clat/gk/static-gk', `<h3>Static General Knowledge for CLAT</h3>
<p>Static GK forms a significant portion of the CLAT General Knowledge section. It covers facts that remain constant — history, geography, polity, awards, books and authors, national symbols, international organisations, sports, and important days.</p>
<ul>
<li><strong>History:</strong> Important dynasties (Maurya, Gupta, Mughal, Maratha), freedom movement leaders and events, constitutional developments (Regulating Act 1773 to Independence Act 1947), viceroys and governor-generals, battles (Plassey, Buxar, Panipat), ancient and medieval Indian history, world history (French Revolution, World Wars, Industrial Revolution).</li>
<li><strong>Geography:</strong> Indian physical features (Himalayas, plains, plateaus, deserts, islands), river systems, climate, soil types, natural vegetation, mineral distribution, world geography (continents, oceans, major countries, capitals, currencies), international boundaries, demographic data.</li>
<li><strong>Polity:</strong> Constitution — salient features, preamble, fundamental rights and duties, directive principles, union and state executive, legislature, judiciary, election commission, constitutional and non-constitutional bodies, amendment procedure, important articles.</li>
<li><strong>Awards and Honours:</strong> Bharat Ratna, Padma awards, Nobel Prize (Indian laureates), Pulitzer, Booker Prize, Magsaysay Award, Sahitya Akademi, Dadasaheb Phalke, Arjuna/Dronacharya/Khel Ratna, national sports awards.</li>
<li><strong>Books and Authors:</strong> Famous books by Indian and foreign authors, autobiographies of prominent personalities, literary classics.</li>
<li><strong>National Symbols:</strong> National flag, anthem, song, emblem, animal (tiger), bird (peacock), flower (lotus), fruit (mango), tree (banyan), river (Ganga), calendar (Saka), currency (rupee), oath/pledge.</li>
<li><strong>International Organisations:</strong> UN and its agencies (UNESCO, UNICEF, WHO, UNDP, FAO, ILO), World Bank, IMF, WTO, ASEAN, SAARC, BRICS, NATO, OPEC, G20, Commonwealth, Non-Aligned Movement — headquarters, heads, member countries, India's role.</li>
<li><strong>Sports:</strong> Major tournaments (Olympics, Asian Games, Commonwealth Games, FIFA World Cup, cricket World Cup), Indian sportspersons, national sports, stadiums, recent championships, Olympics medals by India.</li>
<li><strong>Important Days:</strong> National and international observance days (Republic Day, Independence Day, Gandhi Jayanti, Human Rights Day, Environment Day, Women's Day, etc.) with dates and themes.</li>
<li><strong>Science and Technology:</strong> Indian space programme (ISRO missions), nuclear programme, defence missiles, health and disease, Nobel laureates in science, inventions and discoveries.</li>
</ul>

<div class="example-box"><div class="ex-title">Technique: Elimination in GK MCQs</div><div class="ex-text">Question: Which of the following is NOT a permanent member of the UN Security Council?</div><div class="ex-soln">Answer: Options: USA, UK, Germany, France. Eliminate USA, UK, France (permanent members with veto). Germany is not a permanent member. Answer: Germany. Permanent members: USA, UK, France, Russia, China.</div></div>

<div class="example-box"><div class="ex-title">Technique: Date association</div><div class="ex-text">Question: When is World Environment Day observed?</div><div class="ex-soln">Answer: 5 June every year, established by UN General Assembly in 1972, first celebrated 1974. Theme-based annual host country. Common confusion with Earth Day (22 April) — distinguish them.</div></div>

<h3>Common Traps</h3>
<ul>
<li>Confusing similar awards (Bharat Ratna vs Padma Vibhushan vs Padma Bhushan vs Padma Shri — order of precedence).</li>
<li>Mixing up headquarters (e.g., WHO — Geneva, World Bank — Washington DC, ICJ — The Hague).</li>
<li>Incorrect dates for national/international days.</li>
<li>Assuming all Nobel laureates are Indian — know Indian Nobel winners specifically.</li>
<li>Mixing up national symbols (e.g., national aquatic animal — river dolphin; national heritage animal — elephant).</li>
</ul>

<h3>Memory Tricks</h3>
<ul>
<li><strong>UNSC P5:</strong> USA, UK, France, Russia, China — "USA UK France Russia China" or remember the WWII victors.</li>
<li><strong>National symbols:</strong> Tiger (animal), Peacock (bird), Lotus (flower), Mango (fruit), Banyan (tree), Ganga (river).</li>
<li><strong>Key dates:</strong> Jan 26 (Republic), Aug 15 (Independence), Oct 2 (Gandhi), Dec 10 (Human Rights), June 5 (Environment), Apr 7 (Health), Mar 8 (Women).</li>
</ul>

<div class="tip-box"><div class="tip-title">CLAT GK strategy</div><div class="tip-text">CLAT GK now leans towards current affairs with static context. Read newspapers daily (The Hindu, Indian Express), note important events with dates, and revise static facts weekly. For passage-based GK, read the passage carefully — answers may be derivable even without prior knowledge.</div></div>`, [
  {
    text: "Which of the following is NOT a permanent member of the UN Security Council?",
    options: ["USA", "UK", "Germany", "France"],
    correct: 2,
    sol: "The five permanent members (P5) with veto power are USA, UK, France, Russia, and China. Germany is not a permanent member."
  },
  {
    text: "World Environment Day is observed on",
    options: ["5 June", "22 April", "5 December", "22 March"],
    correct: 0,
    sol: "World Environment Day is observed on 5 June every year, established by the UN in 1972."
  },
  {
    text: "The headquarters of the World Health Organization (WHO) is located in",
    options: ["New York", "Geneva", "Paris", "Washington DC"],
    correct: 1,
    sol: "WHO headquarters is in Geneva, Switzerland."
  },
  {
    text: "Which of the following is India's national aquatic animal?",
    options: ["Tiger", "Elephant", "River Dolphin", "Peacock"],
    correct: 2,
    sol: "The Ganges River Dolphin is India's national aquatic animal (notified in 2009). Tiger is the national animal."
  },
  {
    text: "Bharat Ratna is India's highest",
    options: ["Civilian award", "Military award", "Sports award", "Literary award"],
    correct: 0,
    sol: "Bharat Ratna is the highest civilian award of India, instituted in 1954."
  }
]);

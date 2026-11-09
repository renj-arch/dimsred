// Repair opt-sociology/overview: the stored content was a complete HTML page
// pasted into the lesson body. Replace it with a clean lesson fragment.
const fs = require('fs');
const DATA = 'scripts/course-data.json';
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const html = `<h3>Sociology Optional — Syllabus Map &amp; Strategy</h3>
<p>Sociology is a two-paper optional of 250 marks each. Paper I covers the fundamentals of sociology; Paper II applies them to Indian society. The optional overlaps with GS I (Indian society, social justice) and GS II (governance, welfare schemes), so preparation does double duty.</p>
<h3>Paper I — Fundamentals of Sociology</h3>
<ul>
<li><strong>Introducing sociology:</strong> emergence, nature and scope; relationship with history, economics, political science, psychology and anthropology.</li>
<li><strong>Research methods and analysis:</strong> qualitative and quantitative methods; ethnography, survey, case study, participant observation, interview, questionnaire and content analysis; objectivity and reflexivity.</li>
<li><strong>Basic concepts:</strong> society, culture, social structure, social stratification, groups, institutions, social change, socialization, social control and social mobility.</li>
<li><strong>Social institutions:</strong> family, marriage, kinship, religion, education, economy and polity — forms, functions and changing patterns.</li>
<li><strong>Social stratification:</strong> caste, class, gender, race and ethnicity; functionalist, conflict and Weberian theories.</li>
<li><strong>Social change:</strong> factors and processes; evolutionary, cyclical, conflict, modernization and globalization perspectives.</li>
<li><strong>Socialization:</strong> agencies (family, school, peer group, media and religion), stages and gender socialization.</li>
</ul>
<h3>Paper II — Indian Society</h3>
<ul>
<li><strong>Introducing Indian society:</strong> Indological, structural-functional, Marxist and subaltern perspectives; pluralism, hierarchy and holism.</li>
<li><strong>Colonialism and its impact:</strong> changes in economy, polity, culture and education; emergence of nationalism.</li>
<li><strong>Social structure:</strong> village community, jajmani system and caste ties; urbanization, slums and urban poverty; agrarian structure, land reforms and the Green Revolution.</li>
<li><strong>Social change in India:</strong> Sanskritization, Westernization, modernization, globalization and liberalization; Dalit, women’s, environmental, farmers’ and tribal movements.</li>
<li><strong>Social problems:</strong> poverty, unemployment, child labour, child marriage, domestic violence, communalism, regionalism and ethnic conflict.</li>
<li><strong>Population:</strong> growth, policy, family planning, demographic transition, ageing and sex ratio.</li>
<li><strong>Social policy and welfare:</strong> social justice, social security and schemes such as MGNREGA, NFSA, PMJAY, ICDS and Mid-Day Meal; implementation challenges.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Sanskritization</div><div class="ex-text">Question: Explain Sanskritization with examples.</div><div class="ex-soln">Answer: M.N. Srinivas defined Sanskritization as the process by which a lower caste or tribe emulates the customs, rituals, diet and lifestyle of a higher caste to claim higher ritual status. Examples include Yadavs and Kurmis claiming Kshatriya status and tribal groups adopting vegetarianism and Sanskritic rituals. Critique: it changes ritual status more than structural hierarchy and can reinforce Sanskritic norms; Dalit assertion and regional variation qualify the model.</div></div>
<h3>Key Thinkers</h3>
<ul>
<li><strong>Auguste Comte:</strong> coined the term sociology in 1838; law of three stages.</li>
<li><strong>Karl Marx:</strong> historical materialism, class conflict and alienation.</li>
<li><strong>Emile Durkheim:</strong> social facts, division of labour, suicide and anomie.</li>
<li><strong>Max Weber:</strong> interpretive sociology, ideal types, bureaucracy and the Protestant ethic.</li>
<li><strong>Talcott Parsons and Robert Merton:</strong> structural functionalism; manifest and latent functions.</li>
<li><strong>M.N. Srinivas, Andre Beteille and Yogendra Singh:</strong> Indian society, caste, village and social change.</li>
</ul>
<h3>Standard Sources</h3>
<ul>
<li>Haralambos &amp; Holborn, <em>Sociology: Themes and Perspectives</em></li>
<li>Anthony Giddens, <em>Sociology</em></li>
<li>T.B. Bottomore, <em>Sociology</em></li>
<li>Yogendra Singh, <em>Modernization of Indian Tradition</em>; <em>Social Stratification in India</em></li>
<li>A.R. Desai, <em>Social Background of Indian Nationalism</em></li>
<li>M.N. Srinivas, <em>Caste in Modern India</em>; <em>The Remembered Village</em></li>
<li>Andre Beteille, <em>Caste, Class and Power</em></li>
<li>NCERT Sociology, Classes XI–XII</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Confusing sociology with individual psychology; sociology studies social relationships and structures.</li>
<li>Treating Sanskritization as a change in the material class structure rather than primarily ritual status.</li>
<li>Using caste and class interchangeably; they are distinct but related forms of stratification.</li>
<li>Presenting Indian society as static; emphasise change, contestation and regional variation.</li>
<li>Quoting outdated statistics without a date. Use Census 2011 (sex ratio 943; literacy 74.0%; SC 16.6%, ST 8.6%) and label later survey estimates separately.</li>
</ul>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Four pillars:</strong> society, culture, social structure, social institutions — SSCI.</li>
<li><strong>Classical thinkers:</strong> Comte, Marx, Durkheim, Weber — CMDW.</li>
<li><strong>Stratification:</strong> caste (ascribed, closed), class (achieved, open), gender, race and ethnicity.</li>
<li><strong>Social change:</strong> Sanskritization, Westernization, modernization, globalization — SWMG.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer structure: concept → definition → theory/theorist → application → Indian example → conclusion. Draw simple diagrams (stratification pyramid, family lineage, social-change model). Quote thinkers accurately. Keep a one-page data sheet from Census 2011 and the latest Economic Survey, and always date the figure you quote.</div></div>`;

data['opt-sociology/overview'] = html;
fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('opt-sociology/overview repaired:', html.length, 'bytes');

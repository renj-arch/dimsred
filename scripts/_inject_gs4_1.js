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
    id: 911 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('mains-gs4/ethics-theory', `<h3>Ethics and Human Interface</h3>
<p>GS IV (Ethics, Integrity, and Aptitude) tests a civil servant's ethical compass, decision-making, and integrity. Ethics theory is the foundation — essence, determinants, consequences, dimensions, and ethics in private and public relationships.</p>
<ul>
<li><strong>Essence of ethics:</strong> Ethics is the branch of philosophy dealing with right and wrong conduct; morality is its social expression. Ethics answers "how ought one to live?" and "what is good?"</li>
<li><strong>Determinants of ethics:</strong> Family (first school of values — honesty, compassion, respect), education (critical thinking, constitutional values), society (norms, customs, peer pressure), religion (moral codes, but ethics is secular/reason-based), law (minimum standard, not maximum), conscience (inner voice), experience.</li>
<li><strong>Consequences of ethics:</strong> Individual — self-respect, peace of mind, credibility; Society — trust, cooperation, reduced corruption, social capital; Nation — good governance, legitimacy, development.</li>
<li><strong>Dimensions of ethics:</strong> Meta-ethics (nature of moral judgments), normative ethics (standards — virtue, duty, consequences), applied ethics (bioethics, business ethics, environmental ethics, media ethics).</li>
<li><strong>Ethics in private relationships:</strong> Family, marriage, friendship, love — trust, loyalty, empathy, care, reciprocity, boundaries. Private ethics informs public ethics (a person who lies at home may lie in office).</li>
<li><strong>Ethics in public relationships:</strong> Citizen-state relationship, public servant-citizen, professional codes — impartiality, accountability, transparency, responsiveness, anonymity, neutrality.</li>
</ul>

<h3>Human Values</h3>
<ul>
<li><strong>Meaning:</strong> Values are principles/standards that guide behaviour — what is good, right, desirable.</li>
<li><strong>Lessons from leaders:</strong> Mahatma Gandhi (truth, non-violence, satyagraha, trusteeship, ends-means purity), Buddha (compassion, middle path, right conduct), Mahavira (ahimsa, aparigraha, anekantavada — multiple perspectives), Confucius (filial piety, ren — benevolence), Socrates (virtue is knowledge, examined life), Swami Vivekananda (service to man is service to God, fearlessness), Dr. B.R. Ambedkar (constitutional morality, equality, fraternity, liberty), Nelson Mandela (reconciliation, forgiveness), Abraham Lincoln (humility, empathy, leadership), APJ Abdul Kalam (integrity, vision, simplicity).</li>
<li><strong>Role of family/society/educational institutions:</strong> Family — primary socialisation; school — peer learning, discipline, values education; society — role models, social control; media — shaping perceptions (both positive and negative).</li>
<li><strong>Inculcation of values:</strong> Storytelling, discussion, role modelling, community service, reflection, value clarification, experiential learning.</li>
</ul>

<h3>Ethics in Governance</h3>
<ul>
<li><strong>Probity in governance:</strong> Integrity, uprightness, honesty, absence of corruption — foundation of public trust.</li>
<li><strong>Philosophical basis of governance and probity:</strong> Social contract (Locke, Rousseau, Hobbes), utilitarianism (Bentham, Mill — greatest good for greatest number), deontology (Kant — duty-based, categorical imperative), virtue ethics (Aristotle — character, golden mean), Gandhian trusteeship (wealth as trust for society).</li>
<li><strong>Information sharing and transparency:</strong> Right to Information Act 2005, citizen's charter, e-governance, social audit, public hearings, proactive disclosure (Section 4 RTI).</li>
<li><strong>Citizen's Charters:</strong> Six principles — quality, choice, standards, value, accountability, transparency; Sevottam model.</li>
<li><strong>Work culture:</strong> Punctuality, dedication, professionalism, teamwork, meritocracy, ethical leadership.</li>
<li><strong>Quality of service delivery:</strong> Responsiveness, accessibility, affordability, equity, citizen satisfaction.</li>
<li><strong>Utilisation of public funds:</strong> Economy, efficiency, effectiveness, equity, audit (CAG), parliamentary oversight, PAC.</li>
<li><strong>Challenges of corruption:</strong> Causes — discretionary powers, lack of transparency, low accountability, greed, systemic tolerance; effects — inequality, inefficiency, loss of trust, poor service delivery; prevention — e-governance, discretion reduction, technology, vigilance (CVC), Lokpal, whistleblower protection.</li>
</ul>

<div class="example-box"><div class="ex-title">Technique: Ends vs means</div><div class="ex-text">Question: “For a civil servant, the purity of means is as important as the purity of ends.” Comment.</div><div class="ex-soln">Answer: Gandhian view — means and ends are inseparable; corrupt means corrupt the end (e.g., building a road through forced land acquisition undermines development). Utilitarian counter — sometimes lesser means justify greater good (triage in disaster). For civil servants, constitutional means (rules, procedures, natural justice) are non-negotiable — the Constitution itself embodies procedural purity. Shortcuts erode institutional legitimacy even if outcomes appear positive.</div></div>

<div class="example-box"><div class="ex-title">Technique: Ethical dilemma framework</div><div class="ex-text">Question: A district officer must choose between following a rigid rule and helping a deserving but ineligible beneficiary. What should she do?</div><div class="ex-soln">Answer: Identify stakeholders (beneficiary, department, taxpayers, own conscience); options — (a) strict rule (legal but unjust), (b) bypass rule (compassionate but illegal, sets bad precedent), (c) recommend rule relaxation/ex-gratia through proper channel (best — legal + compassionate). Apply tests — publicity (would I defend this publicly?), reversibility (would I accept this if roles reversed?), universalisation (would I want this as a general rule?). Document decision, seek senior guidance if time permits, maintain transparency.</div></div>

<h3>Common Traps</h3>
<ul>
<li>Confusing ethics with legality — something legal may be unethical; something ethical may be illegal (civil disobedience).</li>
<li>Treating values as relative without context — core constitutional values (equality, liberty, fraternity) are non-negotiable.</li>
<li>Giving utopian answers without practical constraints (resources, time, law).</li>
<li>No stakeholder analysis — every ethical decision affects multiple parties.</li>
<li>Missing the civil service-specific lens (anonymity, neutrality, political executive vs permanent executive).</li>
</ul>

<h3>Memory Tricks</h3>
<ul>
<li><strong>Core civil service values:</strong> Integrity, Impartiality, Objectivity, Dedication to public service, Empathy, Compassion, Tolerance, Compassion toward weaker sections.</li>
<li><strong>Ethical tests:</strong> Publicity, Reversibility, Universalisation.</li>
<li><strong>Governance principles:</strong> Transparency, Accountability, Responsiveness, Participation, Rule of law.</li>
</ul>

<div class="tip-box"><div class="tip-title">Mains exam-day strategy</div><div class="tip-text">For ethics theory, define terms precisely, cite thinkers (Gandhi, Aristotle, Kant, Mill, Ambedkar), apply to civil service context (not generic philosophy), use stakeholder analysis for dilemmas, and conclude with a balanced, action-oriented way forward. Structure: definition → dimensions → application → challenges → solution.</div></div>`, [
  {
    text: "Which of the following is NOT a determinant of ethics?",
    options: ["Family", "Education", "Law", "Horoscope"],
    correct: 3,
    sol: "Family, education, society, religion, law, and conscience are determinants. Horoscope is not an ethical determinant."
  },
  {
    text: "The categorical imperative is associated with which philosopher?",
    options: ["Aristotle", "Immanuel Kant", "Jeremy Bentham", "John Stuart Mill"],
    correct: 1,
    sol: "Immanuel Kant proposed deontological ethics with the categorical imperative — act only according to maxims you can universalise."
  },
  {
    text: "Probity in governance primarily means",
    options: ["Strict adherence to rules", "Integrity and uprightness in public service", "Popularity among citizens", "Fast decision-making"],
    correct: 1,
    sol: "Probity means integrity, uprightness, honesty, and absence of corruption in governance."
  },
  {
    text: "Which Act provides citizens the right to seek information from public authorities?",
    options: ["RTI Act 2005", "Consumer Protection Act", "Right to Education Act", "Lokpal Act"],
    correct: 0,
    sol: "The Right to Information Act, 2005 empowers citizens to access information from public authorities, promoting transparency."
  },
  {
    text: "Gandhian trusteeship means",
    options: ["Wealth belongs to the owner absolutely", "Wealth is held in trust for society", "All property should be nationalised", "Charity is compulsory"],
    correct: 1,
    sol: "Trusteeship — the wealthy hold their wealth as trustees for the benefit of society, using it for public good."
  }
]);

inject('mains-gs4/attitude-foundations', `<h3>Attitude — Content, Structure, Function</h3>
<p>Attitude is a learned predisposition to respond favourably or unfavourably towards an object, person, institution, or event. It has cognitive (beliefs/thoughts), affective (feelings), and behavioural (action tendency) components — the ABC model.</p>
<ul>
<li><strong>Structure of attitude:</strong> Cognitive (I believe corruption is wrong), Affective (I feel angry about corruption), Behavioural (I will report/refuse to pay bribe). Components may be inconsistent — cognitive dissonance (Festinger) arises when they clash.</li>
<li><strong>Functions of attitude:</strong> Knowledge (simplifies world), utilitarian (maximises rewards, minimises punishment), ego-defensive (protects self-esteem), value-expressive (expresses central values), social adjustment (group belonging).</li>
<li><strong>Formation of attitude:</strong> Classical conditioning (association), operant conditioning (reward/punishment), observational learning (modelling — parents, teachers, leaders), direct experience, genetic/biological factors, culture, social norms.</li>
<li><strong>Measurement of attitude:</strong> Likert scale, Thurstone scale, semantic differential, Bogardus social distance scale; indirect measures — projective tests, implicit association test (IAT).</li>
<li><strong>Influence of attitude on thought and behaviour:</strong> Attitudes guide perception (selective attention), information processing (confirmation bias), and behaviour (though attitude-behaviour gap exists — LaPiere's study).</li>
</ul>

<h3>Moral and Political Attitudes</h3>
<ul>
<li><strong>Moral attitudes:</strong> Based on moral principles (honesty, justice, compassion); relatively stable; influence professional conduct (doctor's confidentiality, civil servant's impartiality).</li>
<li><strong>Political attitudes:</strong> Preferences toward political parties, ideologies (liberal, conservative, socialist), leaders, policies; shaped by family, education, media, peers, social identity; affect voting, participation, civic engagement.</li>
<li><strong>Attitude change:</strong> Persuasion (source credibility, message, audience, channel — Hovland-Yale model), cognitive dissonance reduction, social influence (conformity — Asch, compliance — foot-in-the-door, obedience — Milgram), new information, emotional appeals, role-playing.</li>
<li><strong>Resistance to attitude change:</strong> Ego involvement, prior commitment, selective exposure, forewarning, reactance.</li>
</ul>

<h3>Social Influence and Persuasion</h3>
<ul>
<li><strong>Social influence:</strong> Conformity (changing behaviour to match group), compliance (public acceptance, private rejection), obedience (authority — Milgram's shock experiments), minority influence (consistent minority can sway majority — Moscovici).</li>
<li><strong>Persuasion in governance:</strong> Behavioural insights (nudge — Thaler &amp; Sunstein), Swachh Bharat messaging, tax compliance campaigns, vaccination drives, climate-friendly behaviour; ethical boundary — persuasion vs manipulation (transparency, consent, welfare-enhancing).</li>
<li><strong>Cialdini's principles:</strong> Reciprocity, commitment/consistency, social proof, liking, authority, scarcity.</li>
</ul>

<h3>Aptitude and Foundational Values for Civil Service</h3>
<ul>
<li><strong>Aptitude:</strong> Natural ability to learn/perform — intellectual, emotional, administrative, leadership aptitude for civil services.</li>
<li><strong>Foundational values (2nd ARC, Civil Service values):</strong> Integrity (honesty, consistency), Impartiality (no bias — caste, religion, gender, party), Non-partisanship (serve any elected government), Objectivity (evidence-based decisions), Dedication to public service, Empathy, Compassion, Tolerance, Objectivity, Accountability, Transparency, Selflessness (Nolan principles — selflessness, integrity, objectivity, accountability, openness, honesty, leadership).</li>
<li><strong>Probity in public life:</strong> Declaration of assets, avoidance of conflict of interest, cooling-off period, gift rules, post-retirement restrictions.</li>
</ul>

<h3>Emotional Intelligence — Concepts and Utilities</h3>
<ul>
<li><strong>EI (Goleman, Salovey &amp; Mayer):</strong> Ability to perceive, understand, manage, and use emotions — self-awareness, self-regulation, motivation, empathy, social skills.</li>
<li><strong>Utilities in administration:</strong> Conflict resolution, stress management, decision-making under pressure, citizen grievance handling, team leadership, crisis management, dealing with diverse stakeholders, preventing burnout.</li>
<li><strong>EI vs IQ:</strong> IQ gets you hired; EI gets you promoted — especially in people-centric public service.</li>
<li><strong>Application in governance:</strong> Empathetic response to marginalised citizens, calming tense situations (riots, protests), motivating subordinates, ethical courage (saying no to illegal orders), work-life balance.</li>
</ul>

<div class="example-box"><div class="ex-title">Technique: Attitude-behaviour gap</div><div class="ex-text">Question: “A civil servant may personally oppose caste discrimination but hesitate to act against influential offenders.” Explain using attitude theory.</div><div class="ex-soln">Answer: This reflects the attitude-behaviour gap — positive attitude (cognitive/affective: discrimination is wrong) does not translate into behaviour due to situational constraints (fear of transfer, political pressure, lack of evidence, career risk). LaPiere's study showed similar gaps. Bridging requires enabling conditions — legal protection (whistleblower law), institutional support, anonymity in reporting, moral courage, and accountability of offenders.</div></div>

<div class="example-box"><div class="ex-title">Technique: Emotional intelligence in crisis</div><div class="ex-text">Question: How does EI help a district magistrate during communal tension?</div><div class="ex-soln">Answer: Self-awareness (recognise own anxiety/anger), self-regulation (stay calm, avoid inflammatory statements), empathy (understand both communities' fears), motivation (stay committed to peace), social skills (engage community leaders, rumour control, coordinate police/administration, communicate transparently). EI prevents escalation and builds trust.</div></div>

<h3>Common Traps</h3>
<ul>
<li>Confusing aptitude (potential) with attitude (predisposition).</li>
<li>Giving generic answers without civil service context.</li>
<li>No stakeholder or consequence analysis.</li>
<li>Treating EI as manipulation rather than empathy + ethical use.</li>
<li>Ignoring constitutional values as the overarching framework.</li>
</ul>

<h3>Memory Tricks</h3>
<ul>
<li><strong>ABC of attitude:</strong> Affective, Behavioural, Cognitive.</li>
<li><strong>Nolan principles:</strong> Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty, Leadership.</li>
<li><strong>EI (Goleman):</strong> Self-awareness, Self-regulation, Motivation, Empathy, Social skills.</li>
<li><strong>Attitude change:</strong> Persuasion, Cognitive dissonance, Social influence.</li>
</ul>

<div class="tip-box"><div class="tip-title">Mains exam-day strategy</div><div class="tip-text">For attitude/EI questions, define concepts, apply to administration (not psychology alone), use real civil service scenarios (law and order, welfare delivery, corruption resistance), and cite thinkers (Gandhi, Goleman, Festinger, Milgram, Cialdini, 2nd ARC/Nolan principles). Conclude with institutionalisation — training, codes of conduct, mentoring, and institutional support for ethical behaviour.</div></div>`, [
  {
    text: "The ABC model of attitude stands for",
    options: ["Action, Belief, Conduct", "Affective, Behavioural, Cognitive", "Attitude, Behaviour, Cognition", "Acceptance, Belief, Commitment"],
    correct: 1,
    sol: "ABC = Affective (feelings), Behavioural (action tendency), Cognitive (beliefs)."
  },
  {
    text: "Cognitive dissonance theory was proposed by",
    options: ["Sigmund Freud", "Leon Festinger", "B.F. Skinner", "Carl Rogers"],
    correct: 1,
    sol: "Leon Festinger proposed cognitive dissonance — mental discomfort when holding conflicting beliefs/attitudes/behaviours."
  },
  {
    text: "Which of the following is NOT a Nolan principle of public life?",
    options: ["Selflessness", "Integrity", "Objectivity", "Popularity"],
    correct: 3,
    sol: "Nolan's 7 principles: selflessness, integrity, objectivity, accountability, openness, honesty, leadership. Popularity is not one."
  },
  {
    text: "Emotional Intelligence does NOT include",
    options: ["Self-awareness", "Self-regulation", "Empathy", "Mathematical ability"],
    correct: 3,
    sol: "EI (Goleman) = self-awareness, self-regulation, motivation, empathy, social skills. Mathematical ability is cognitive/IQ, not EI."
  },
  {
    text: "Impartiality in civil service means",
    options: ["Supporting the ruling party", "Serving without bias of caste/religion/gender/party", "Following personal preferences", "Obeying only senior officers"],
    correct: 1,
    sol: "Impartiality = discharging duties without bias or prejudice based on caste, religion, gender, or political affiliation."
  }
]);
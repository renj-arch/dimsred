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
    id: 921 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('mains-gs4/emotional-intelligence', `<h3>Emotional Intelligence — Concepts, Dimensions, Applications</h3>
<p>Emotional Intelligence (EI) is the capacity to be aware of, control, and express one's emotions, and to handle interpersonal relationships judiciously and empathetically. In civil services, EI determines the quality of public service delivery.</p>
<ul>
<li><strong>Origin:</strong> Salovey &amp; Mayer (1990) defined EI as ability to perceive, understand, manage, and use emotions. Daniel Goleman popularised it (1995) with five domains.</li>
<li><strong>Goleman's five components:</strong>
  <ul>
    <li><strong>Self-awareness:</strong> Recognising one's emotions, strengths, weaknesses, values, drivers; self-confidence.</li>
    <li><strong>Self-regulation:</strong> Managing disruptive emotions/impulses; trustworthiness, conscientiousness, adaptability, innovation.</li>
    <li><strong>Motivation:</strong> Inner drive to achieve for intrinsic reasons; optimism, commitment, initiative.</li>
    <li><strong>Empathy:</strong> Understanding others' emotional makeup; service orientation, developing others, leveraging diversity, political awareness.</li>
    <li><strong>Social skills:</strong> Managing relationships to move people in desired directions; influence, communication, conflict management, leadership, collaboration.</li>
  </ul>
</li>
<li><strong>EI vs IQ:</strong> IQ = cognitive ability (analytical, logical); EI = emotional/social ability. IQ threshold matters; beyond it, EI predicts leadership success, especially in people-centric roles like administration.</li>
<li><strong>Emotional competencies vs technical competencies:</strong> Technical skills get tasks done; emotional competencies determine how well one works with and through others.</li>
</ul>

<h3>Applications of EI in Administration and Governance</h3>
<ul>
<li><strong>Citizen interface:</strong> Empathetic handling of grievances (pension, ration, certificate), patient listening, reducing citizen frustration, dignity in service delivery.</li>
<li><strong>Law and order:</strong> Calm de-escalation during protests/riots, reading crowd mood, avoiding inflammatory language, building community trust.</li>
<li><strong>Team leadership:</strong> Motivating demotivated staff, recognising burnout, delegating based on strengths, giving constructive feedback, resolving interpersonal conflicts.</li>
<li><strong>Decision-making under pressure:</strong> Not being hijacked by anger/fear; pausing before responding; considering emotional impact of decisions on vulnerable groups.</li>
<li><strong>Ethical courage:</strong> Saying no to illegal orders without anger; managing fear of transfer/posting; standing by conscience.</li>
<li><strong>Crisis/disaster:</strong> Calming affected populations, coordinating multiple agencies under stress, compassionate death-notification and relief handling.</li>
<li><strong>Work-life balance:</strong> Managing stress, preventing burnout, compassion fatigue in social sector postings, family support.</li>
</ul>

<h3>Developing EI</h3>
<ul>
<li><strong>Self-awareness:</strong> Reflection, journaling, feedback (360-degree), mindfulness, emotional literacy (naming emotions precisely).</li>
<li><strong>Self-regulation:</strong> Pause-before-respond, reframing, stress tolerance, impulse control, ethical decision frameworks.</li>
<li><strong>Empathy:</strong> Active listening, perspective-taking, field visits, meeting marginalised citizens, suspending judgment.</li>
<li><strong>Social skills:</strong> Communication training, negotiation, conflict resolution, networking, building coalitions.</li>
<li><strong>Institutional:</strong> EI in foundational training (LBSNAA, state academies), mentoring, performance appraisal including behavioural competencies, stress management programmes.</li>
</ul>

<div class="example-box"><div class="ex-title">Technique: EI in a grievance redress scenario</div><div class="ex-text">Question: A pensioner creates a scene in your office, shouting that his pension is stopped. How do you respond using EI?</div><div class="ex-soln">Answer: Self-awareness — notice your own irritation rising; self-regulation — don't shout back or take it personally; empathy — recognise his fear (no money for medicines/food), listen actively, let him vent without interruption; motivation — stay focused on resolving his issue; social skills — explain the reason calmly, offer a concrete next step (check records, escalate, timeline), treat him with dignity. De-escalation through EI converts a conflict into a solvable administrative problem.</div></div>

<div class="example-box"><div class="ex-title">Technique: EI vs manipulation</div><div class="ex-text">Question: “Emotional intelligence can be used to manipulate people.” Is EI value-neutral?</div><div class="ex-soln">Answer: EI skills (reading emotions, influencing) can be used ethically or unethically. A manipulator uses empathy to exploit (e.g., a corrupt officer feigning concern to extract bribes). Ethical EI is anchored in values — integrity, compassion, public service — and transparency. For civil servants, EI must serve citizen welfare and constitutional values, not personal or partisan gain. Intent and outcome matter as much as skill.</div></div>

<h3>Common Traps</h3>
<ul>
<li>Treating EI as merely "being nice" — it includes hard decisions, saying no, and delivering unpleasant news with respect.</li>
<li>Confusing empathy with sympathy — empathy is understanding; sympathy is feeling pity (can create dependency).</li>
<li>No civil service application — answers must tie EI to administration, not just psychology.</li>
<li>Overlooking that EI complements, not replaces, rules and law.</li>
</ul>

<h3>Memory Tricks</h3>
<ul>
<li><strong>EI 5 (Goleman):</strong> Self-awareness, Self-regulation, Motivation, Empathy, Social skills.</li>
<li><strong>EI in admin:</strong> Listen, Pause, Understand, Act, Follow-up.</li>
<li><strong>EI vs IQ:</strong> IQ gets the job; EI keeps and grows it.</li>
</ul>

<div class="tip-box"><div class="tip-title">Mains exam-day strategy</div><div class="tip-text">For EI questions, define EI, break into Goleman's five components, apply each to a concrete administrative scenario (grievance, law-and-order, team, crisis, ethics), and contrast EI with IQ. Use stakeholder impact and ethical anchoring. Conclude with how EI can be institutionalised — training, mentoring, appraisal, and a supportive work culture.</div></div>`, [
  {
    text: "Which of the following is NOT one of Goleman's five components of EI?",
    options: ["Self-awareness", "Empathy", "Mathematical reasoning", "Social skills"],
    correct: 2,
    sol: "Goleman's five: self-awareness, self-regulation, motivation, empathy, social skills. Mathematical reasoning is IQ/cognitive."
  },
  {
    text: "EI helps a civil servant during communal tension by",
    options: ["Joining one community", "Staying calm, empathising with both sides, coordinating peace", "Ignoring emotions", "Using force only"],
    correct: 1,
    sol: "EI enables self-regulation, empathy toward affected communities, and skilled coordination to de-escalate tension."
  },
  {
    text: "Empathy differs from sympathy in that empathy",
    options: ["Feels sorry for the person", "Understands the person's perspective", "Gives money", "Avoids the person"],
    correct: 1,
    sol: "Empathy = understanding another's emotional state from their perspective; sympathy = feeling pity/sorrow for them."
  },
  {
    text: "Emotional intelligence can be developed through",
    options: ["Birth only", "Reflection, feedback, mindfulness, training", "Reading books alone", "It cannot be developed"],
    correct: 1,
    sol: "EI is learnable — through self-reflection, 360-degree feedback, mindfulness, active listening practice, and training."
  },
  {
    text: "Which EI component helps a civil servant say 'no' to an illegal order without anger?",
    options: ["Empathy", "Self-regulation", "Social skills", "Motivation"],
    correct: 1,
    sol: "Self-regulation — managing disruptive impulses (anger, fear) and acting on values rather than emotional reaction."
  }
]);

inject('mains-gs4/case-studies', `<h3>Case Studies in GS IV — Framework and Approach</h3>
<p>Case studies (Section B of GS IV paper, ~125 marks) present real-life administrative/ethical dilemmas. They test integrity, objectivity, empathy, decision-making, and ability to justify actions under constraints.</p>
<ul>
<li><strong>Structure of a case answer:</strong>
  <ol>
    <li><strong>Identify facts and stakeholders:</strong> Who is involved, what happened, what are the interests of each party.</li>
    <li><strong>Identify ethical issues:</strong> Conflict of interest, rule vs compassion, transparency vs secrecy, accountability, whistleblowing, nepotism, gender/caste bias, public vs private good.</li>
    <li><strong>Identify options:</strong> At least 2–3 courses of action (strict rule, compassionate bypass, middle path through proper channel).</li>
    <li><strong>Evaluate options:</strong> Pros/cons of each using ethical tests — legality, constitutionality, publicity, reversibility, universalisation, stakeholder impact, long-term vs short-term.</li>
    <li><strong>Choose the best option:</strong> Justify with reasoning; it need not be perfect but must be defensible.</li>
    <li><strong>Implementation steps:</strong> Concrete, time-bound actions — whom to inform, documents, legal provisions, follow-up.</li>
    <li><strong>Way forward:</strong> Systemic fix so the dilemma doesn't recur (rules change, training, vigilance, citizen charter).</li>
  </ol>
</li>
<li><strong>Ethical tests for decision-making:</strong>
  <ul>
    <li><strong>Publicity test:</strong> Would I defend this action if it appeared in newspapers tomorrow?</li>
    <li><strong>Reversibility test:</strong> Would I accept this if I were in the affected person's place?</li>
    <li><strong>Universalisation test:</strong> Would I want everyone in my position to act this way in similar cases?</li>
    <li><strong>Legality test:</strong> Is it within the law/rules? If rules are unjust, change them through proper channel — don't violate.</li>
  </ul>
</li>
<li><strong>Common case themes:</strong>
  <ul>
    <li>Conflict between personal ethics and official duty.</li>
    <li>Pressures from politicians/influential persons (illegal favours, postings, transfers).</li>
    <li>Compassion for a deserving but ineligible beneficiary.</li>
    <li>Whistleblowing on senior's corruption.</li>
    <li>Sexual harassment at workplace.</li>
    <li>Caste/communal tension handling.</li>
    <li>Disaster response with limited resources (triage).</li>
    <li>Land acquisition and rehabilitation.</li>
    <li>Environment vs development (project vs forest/tribal rights).</li>
    <li>Data privacy vs surveillance.</li>
  </ul>
</li>
</ul>

<h3>Answering a Case Study — Step by Step</h3>
<ol>
<li><strong>Read the case twice:</strong> Underline facts, values, stakeholders, pressures, constraints (time, law, resources).</li>
<li><strong>State the core dilemma in one sentence:</strong> e.g., "Compassion for a poor beneficiary vs adherence to eligibility rules."</li>
<li><strong>List stakeholders and their interests:</strong> citizen, department, public exchequer, your own career, vulnerable groups.</li>
<li><strong>Lay out options (numbered):</strong> Option 1 — strict adherence; Option 2 — discretionary favour; Option 3 — legal flexibility through proper channel (recommended).</li>
<li><strong>Evaluate each option:</strong> Short/long-term, stakeholder impact, precedent, legal risk, ethical defensibility.</li>
<li><strong>State your decision clearly:</strong> "I would adopt Option 3 because..."</li>
<li><strong>Implementation plan:</strong> 1. Verify eligibility documents. 2. Apply for scheme relaxation/ex-gratia through district collector. 3. Inform applicant transparently. 4. Document decision. 5. Suggest rule review if gap is systemic.</li>
<li><strong>Way forward:</strong> Training, citizen's charter, grievance redress, social audit, periodic review.</li>
</ol>

<div class="example-box"><div class="ex-title">Technique: Compassion vs rules</div><div class="ex-text">Question: An old woman, not on the ration card list, comes to your ration shop starving. The shopkeeper says rules bar issuance. What do you do?</div><div class="ex-soln">Answer: Stakeholders — old woman (right to life/food), shopkeeper (rule-bound), department (audit), public exchequer. Options — (a) strict refusal (legal but violates Article 21 right to life), (b) give ration off-record (compassionate but illegal, audit risk), (c) provide immediate relief from available stock/MDCS, initiate inclusion in ration list through proper verification, report gap (recommend doorstep survey for missed households). Decision — Option 3: immediate humanitarian response + legal regularisation. Way forward — revision of exclusion criteria, grievance camp, social audit of PDS list.</div></div>

<div class="example-box"><div class="ex-title">Technique: Political pressure case</div><div class="ex-text">Question: A local MLA pressures you to sanction a contractor's bill without proper verification. What do you do?</div><div class="ex-soln">Answer: Ethical issues — conflict of interest, corruption, abuse of position, accountability to public exchequer. Stakeholders — MLA, contractor, public money, your career, rule of law. Options — (a) yield to pressure (corrupt, illegal), (b) outright refusal with confrontation (principled but may invite transfer/vendetta), (c) politely decline citing rules, document the pressure, route through senior officer, invoke Conduct Rules/Whistleblower Protection if threatened. Decision — Option 3. Way forward — e-tendering, bill tracking, CVC vigilance, asset declaration, standing by constitutional duty over personal cost.</div></div>

<h3>Common Traps</h3>
<ul>
<li>Not stating a clear decision — fence-sitting scores zero.</li>
<li>Suggesting illegal actions (bypassing rules, destroying files) as "compassionate" solutions.</li>
<li>No implementation steps — vague "I will do the right thing" without specifics.</li>
<li>Ignoring stakeholders — decisions affect more than the complainant.</li>
<li>No way forward — systemic fix missing.</li>
<li>Emotional language instead of reasoned ethical framework.</li>
</ul>

<h3>Memory Tricks</h3>
<ul>
<li><strong>CASE framework:</strong> Clarify facts → Analyse stakeholders → Select options → Evaluate → Execute.</li>
<li><strong>Ethical tests:</strong> Publicity, Reversibility, Universalisation.</li>
<li><strong>Answer skeleton:</strong> Facts → Dilemma → Stakeholders → Options → Decision → Steps → Way forward.</li>
</ul>

<div class="tip-box"><div class="tip-title">Mains exam-day strategy</div><div class="tip-text">For case studies, allocate ~20–25 minutes per case (20 marks). Write legibly, use numbered options, bold your final decision, and give concrete implementation steps (who, what, when). Never suggest illegality. End with a forward-looking systemic reform. Time management is critical — don't over-write one case at the cost of another.</div></div>`, [
  {
    text: "Which of the following is NOT an ethical test for decision-making?",
    options: ["Publicity test", "Reversibility test", "Universalisation test", "Popularity test"],
    correct: 3,
    sol: "Ethical tests: publicity (defend in newspaper), reversibility (accept if roles reversed), universalisation (want everyone to act so). Popularity is not an ethical test."
  },
  {
    text: "In a case study, the first step after reading is to",
    options: ["Choose an option immediately", "Identify facts, stakeholders, and ethical issues", "Write the conclusion", "Copy the case"],
    correct: 1,
    sol: "First identify facts, stakeholders, values in conflict, and constraints — then generate and evaluate options."
  },
  {
    text: "The publicity test asks whether you would",
    options: ["Hide the decision", "Defend the decision publicly in a newspaper", "Tell only your friends", "Publish on social media anonymously"],
    correct: 1,
    sol: "Publicity test: would you be comfortable if your decision and reasoning were made public?"
  },
  {
    text: "Which is the best approach when a political leader pressures you to bypass rules?",
    options: ["Yield to pressure", "Refuse politely citing rules and document the pressure", "Ignore the leader completely", "Resign immediately"],
    correct: 1,
    sol: "Politely decline on legal grounds, document the pressure, escalate through proper channel, and use whistleblower protection if threatened."
  },
  {
    text: "In case studies, suggesting illegal actions to help a beneficiary",
    options: ["Is always acceptable", "Is never acceptable — legality is non-negotiable", "Depends on your mood", "Is required by compassion"],
    correct: 1,
    sol: "Civil servants must act within law; if rules cause hardship, change rules through proper channel — never violate them."
  }
]);
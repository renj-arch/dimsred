// Batch 1: fill the partial gaps in already-deep optional subjects.
module.exports = {
  'opt-civil-engineering/overview': {
    html: `<h3>Civil Engineering Optional — Syllabus Map &amp; Strategy</h3>
<p>Civil Engineering is a technical optional: two papers of 250 marks each, dominated by numericals, design problems and IS-code applications. It rewards engineers who can show working steps clearly; non-engineers should think twice because the formula and code load is heavy.</p>
<h3>Paper I — Structural Engineering</h3>
<ul>
<li><strong>Building Materials:</strong> stones, bricks, lime, cement, concrete, timber and steel — properties, standard tests (IS codes), defects and uses.</li>
<li><strong>Solid Mechanics:</strong> stress–strain, elastic constants, shear force and bending moment diagrams, torsion, deflection of beams, columns, springs, strain energy.</li>
<li><strong>Structural Analysis:</strong> determinate and indeterminate structures — slope-deflection, moment distribution, matrix methods, influence lines, arches and cables.</li>
<li><strong>Design of Steel Structures:</strong> limit state design, bolted and welded connections, tension and compression members, beams, plate girders, columns, column bases (IS 800).</li>
<li><strong>Design of Concrete and Masonry Structures:</strong> working stress and limit state methods, singly and doubly reinforced beams, T-beams, slabs, columns, footings, water tanks, prestressed concrete (IS 456, IS 1343).</li>
</ul>
<h3>Paper II — Infrastructure and Environment</h3>
<ul>
<li><strong>Fluid Mechanics and Hydraulics:</strong> fluid statics, Bernoulli's theorem, pipe flow, open channel flow, hydraulic machines (pumps and turbines).</li>
<li><strong>Hydrology:</strong> precipitation, infiltration, runoff, hydrographs, flood estimation, reservoir planning.</li>
<li><strong>Irrigation Engineering:</strong> canals, duty and delta, waterlogging, dams, spillways, cross-drainage works.</li>
<li><strong>Transportation Engineering:</strong> highway geometric design, pavement design, traffic engineering, railway, airport and harbour basics.</li>
<li><strong>Environmental Engineering:</strong> water treatment, sewage treatment, BOD/COD, air pollution control, solid waste management.</li>
<li><strong>Geotechnical and Foundation Engineering:</strong> soil properties, consolidation, shear strength, bearing capacity, shallow and deep foundations.</li>
<li><strong>Surveying and Geodesy:</strong> chain, compass, levelling, theodolite, tacheometry, curves, remote sensing basics.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Degree of Static Indeterminacy</div><div class="ex-text">Question: A fixed beam is supported at both ends with all reactions fixed. Find the degree of static indeterminacy.</div><div class="ex-soln">Answer: A fixed beam has 3 reactions at each end (vertical, horizontal, moment) = 6 reactions. Available equilibrium equations = 3. Degree of static indeterminacy = 6 − 3 = 3.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Solid Mechanics: R.K. Bansal; Timoshenko &amp; Gere</li>
<li>Structural Analysis: S.S. Bhavikatti; C.K. Wang</li>
<li>RCC Design: Pillai &amp; Menon; N. Krishna Raju</li>
<li>Steel Design: S.K. Duggal; N. Subramanian</li>
<li>Fluid Mechanics: R.K. Bansal; K. Subramanya (open channel)</li>
<li>Hydrology and Irrigation: K. Subramanya; S.K. Garg</li>
<li>Transportation: Khanna &amp; Justo; L.R. Kadiyali</li>
<li>Environmental: Peavy, Rowe &amp; Tchobanoglous</li>
<li>Geotechnical: B.C. Punmia; Braja M. Das</li>
<li>Surveying: B.C. Punmia; Arora</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Writing the final answer without showing assumptions, units or IS-code clauses — examiners award step marks.</li>
<li>Confusing working stress method with limit state method; UPSC expects the current IS 456 limit state approach unless the question says otherwise.</li>
<li>Mixing sign conventions in shear force and bending moment diagrams.</li>
<li>Using the wrong formula for degree of indeterminacy (2D vs 3D frames).</li>
<li>Ignoring unit consistency (kN vs N, mm vs m) in numericals.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer format: state the given data → assumptions → governing formula/IS clause → step-by-step calculation with units → sketch (SFD/BMD, reinforcement detail, flow diagram) → brief interpretation. Practise drawing neat, labelled sketches; a good diagram earns marks even when the final number slips. Revise IS 456, IS 800 and IS 1343 clause numbers for design questions.</div></div>`,
    qs: [
      { text: 'The degree of static indeterminacy of a fixed beam is:', options: ['1', '2', '3', '6'], correct: 2, sol: 'A fixed beam has 6 reactions (3 at each end) and 3 equilibrium equations, so the degree of static indeterminacy is 6 − 3 = 3.' },
      { text: 'Limit state design of reinforced concrete structures in India is governed by:', options: ['IS 800', 'IS 456', 'IS 1343', 'IS 1893'], correct: 1, sol: 'IS 456:2000 is the Indian standard for plain and reinforced concrete, based on limit state design.' },
      { text: 'The instrument used for accurate measurement of horizontal and vertical angles in surveying is:', options: ['Chain', 'Compass', 'Theodolite', 'Planimeter'], correct: 2, sol: 'A theodolite measures horizontal and vertical angles precisely; a compass gives magnetic bearings only.' },
      { text: 'BOD of water indicates:', options: ['Total dissolved solids', 'Biodegradable organic matter', 'Hardness', 'Turbidity'], correct: 1, sol: 'Biochemical Oxygen Demand measures the oxygen consumed by microorganisms while decomposing biodegradable organic matter.' },
      { text: 'In soil mechanics, the coefficient of consolidation is determined from:', options: ['Casagrande’s logarithm of time fitting method', 'Standard penetration test', 'Plate load test', 'Vane shear test'], correct: 0, sol: 'The coefficient of consolidation is obtained from the oedometer (consolidation) test using Casagrande’s log-time or Taylor’s square-root-of-time fitting method.' }
    ]
  },
  'opt-economics/overview': {
    html: `<h3>Economics Optional — Syllabus Map &amp; Strategy</h3>
<p>Economics has two papers of 250 marks each: Paper I is economic theory, Paper II is the Indian economy. The optional rewards candidates who can combine diagrams, models and current data — a rare edge in Mains answer writing.</p>
<h3>Paper I — Economic Theory</h3>
<ul>
<li><strong>Advanced Microeconomics:</strong> consumer theory (utility, indifference curves, Slutsky equation), production and cost, market structures (perfect competition, monopoly, monopolistic competition, oligopoly), factor pricing, general equilibrium, welfare economics.</li>
<li><strong>Advanced Macroeconomics:</strong> national income accounting, classical and Keynesian models, IS–LM, aggregate demand and supply, inflation and unemployment (Phillips curve), growth models (Harrod–Domar, Solow), business cycles.</li>
<li><strong>Money and Banking:</strong> money supply and demand, money multiplier, commercial banking, central banking, monetary policy transmission, inflation targeting.</li>
<li><strong>Public Economics:</strong> public goods, externalities, market failure, taxation (incidence, deadweight loss, optimal taxation), public expenditure, public debt, fiscal federalism.</li>
</ul>
<h3>Paper II — Indian Economy</h3>
<ul>
<li><strong>Pre-Independence:</strong> land systems, commercialisation of agriculture, drain theory, deindustrialisation, railways, public finance.</li>
<li><strong>Post-Independence:</strong> planning, poverty and inequality, agriculture, industry, services, foreign trade, balance of payments, fiscal and monetary policy, liberalisation and reforms.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Money Multiplier</div><div class="ex-text">Question: If the reserve–deposit ratio is 0.10 and the currency–deposit ratio is 0.25, find the money multiplier (M = (1 + c)/(c + r)).</div><div class="ex-soln">Answer: M = (1 + 0.25)/(0.25 + 0.10) = 1.25/0.35 ≈ 3.57. A monetary base of ₹100 would support money supply of about ₹357.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Microeconomics: Koutsoyiannis; H.L. Ahuja; Hal Varian (for rigour)</li>
<li>Macroeconomics: Dornbusch &amp; Fischer; Oliver Blanchard; H.L. Ahuja</li>
<li>Public Economics: R.A. Musgrave; Bhatia</li>
<li>Money and Banking: S.B. Gupta; RBI publications</li>
<li>Indian Economy: Uma Kapila; Mishra &amp; Puri; Ramesh Singh; Economic Survey; NCERT</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Describing a model without a diagram — micro and macro answers score with correctly labelled curves.</li>
<li>Quoting outdated data. Use the latest Economic Survey and RBI Annual Report figures.</li>
<li>Confusing fiscal deficit with revenue deficit, or primary deficit with fiscal deficit.</li>
<li>Treating the Phillips curve as stable; mention the expectations-augmented version.</li>
<li>Giving policy opinion without theory — link every Indian-economy answer to a model or concept.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For theory answers: define → state assumptions → diagram → derivation or explanation → limitation. For Indian-economy answers: data point → trend → cause → policy response → evaluation. Keep a one-page data sheet (GDP growth, inflation, fiscal deficit, CAD, unemployment, poverty) updated from the Economic Survey and Budget.</div></div>`,
    qs: [
      { text: 'The money multiplier is higher when:', options: ['The reserve–deposit ratio rises', 'The currency–deposit ratio falls', 'Banks hold more excess reserves', 'The monetary base falls'], correct: 1, sol: 'M = (1 + c)/(c + r). A fall in the currency–deposit ratio (c) raises the multiplier; higher reserves (r) lower it.' },
      { text: 'The Solow growth model predicts that, in the long run, output per worker depends on:', options: ['The saving rate only', 'Population growth only', 'Capital per worker and technology', 'The price level'], correct: 2, sol: 'In the Solow model, steady-state output per worker depends on capital per worker (saving, depreciation, population growth) and on technology (TFP).' },
      { text: 'A public good is characterised by:', options: ['Rivalry and excludability', 'Non-rivalry and non-excludability', 'Rivalry and non-excludability', 'Non-rivalry and excludability'], correct: 1, sol: 'Public goods are non-rival (one person’s use does not reduce another’s) and non-excludable (no one can be kept out), causing market failure.' },
      { text: 'The ‘drain theory’ in Indian economic history referred to:', options: ['Irrigation losses', 'Transfer of wealth from India to Britain', 'Drainage of foreign reserves after 1991', 'Losses in public sector banks'], correct: 1, sol: 'Dadabhai Naoroji’s drain theory described the unrequited transfer of Indian wealth to Britain through trade surpluses, home charges and services.' },
      { text: 'The Phillips curve shows the short-run relationship between:', options: ['Inflation and unemployment', 'Inflation and money supply', 'Output and employment', 'Interest rate and investment'], correct: 0, sol: 'The Phillips curve shows the inverse short-run relationship between inflation and unemployment; the expectations-augmented version explains stagflation.' }
    ]
  },
  'opt-history/paper1': {
    html: `<h3>History Paper I — Ancient and Medieval India</h3>
<p>Paper I covers Indian history from prehistory to the eighteenth century. The examiner tests chronology, source criticism and interpretation — not mere narration.</p>
<h3>Sources and Approaches</h3>
<ul>
<li><strong>Archaeological sources:</strong> excavation reports, inscriptions, coins, monuments, pottery, seals.</li>
<li><strong>Literary sources:</strong> Vedic literature, epics, Puranas, Buddhist and Jaina texts, Sangam literature, Sanskrit drama, Persian chronicles, travelogues.</li>
<li><strong>Approaches:</strong> colonial, nationalist, Marxist, subaltern, feminist and environmental readings of the past.</li>
</ul>
<h3>Ancient India — Key Phases</h3>
<ul>
<li><strong>Prehistory:</strong> Palaeolithic, Mesolithic, Neolithic and Chalcolithic cultures; Bhimbetka, Mehrgarh, Inamgaon.</li>
<li><strong>Indus Valley Civilization:</strong> Harappa, Mohenjodaro, Dholavira, Lothal; town planning, seals, script, economy, religion; debate on decline (climate, floods, river shift, invasion).</li>
<li><strong>Vedic period:</strong> Rigvedic and Later Vedic society, pastoralism to agriculture, sabha and samiti, varna formation, Upanishadic thought.</li>
<li><strong>Mahajanapadas:</strong> sixteen states, rise of Magadha, Jainism and Buddhism as protest movements.</li>
<li><strong>Mauryan Empire:</strong> Chandragupta, Ashoka, Arthashastra, dhamma, administration, economy, decline.</li>
<li><strong>Post-Mauryan:</strong> Shunga, Kushana, Satavahana; Gandhara, Mathura and Amaravati art; silk route trade; Sangam age.</li>
<li><strong>Guptas:</strong> classical age debate, land grants, administrative decentralisation, science and literature.</li>
<li><strong>Post-Gupta:</strong> Harsha, Pallavas, Chalukyas, Rashtrakutas; temple architecture; feudalism debate.</li>
</ul>
<h3>Medieval India — Key Phases</h3>
<ul>
<li><strong>Delhi Sultanate:</strong> Slave, Khalji, Tughlaq, Sayyid and Lodi dynasties; market reforms, administrative experiments, Mongol threat.</li>
<li><strong>Vijayanagara and Bahmani:</strong> trade, temple economy, Indo-Islamic architecture.</li>
<li><strong>Mughal Empire:</strong> Babur to Aurangzeb; mansabdari, jagirdari, zabti revenue, religious policy, art and architecture.</li>
<li><strong>Marathas and eighteenth-century states:</strong> Shivaji’s administration, Peshwas, Sikhs, Rajputs, Jats.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Nature of Harappan Urbanism</div><div class="ex-text">Question: “The Harappan civilisation was urban in character.” Discuss.</div><div class="ex-soln">Answer: Harappan urbanism is shown by planned grid streets, standardised burnt bricks, drainage systems, citadel–lower town division, granaries, seals and weights, craft specialisation and long-distance trade. However, the absence of monumental temples, royal tombs and a deciphered script makes its political character uncertain. Conclusion: it was an urban civilisation with a distinct mercantile–administrative character.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing janapada with mahajanapada, or Harappan with Vedic chronology.</li>
<li>Describing Ashoka’s dhamma as Buddhism — dhamma was a broader civic ethic.</li>
<li>Treating the “classical age” label as settled; mention the debate.</li>
<li>Writing the Sultanate as a single uniform period; distinguish dynastic policies.</li>
<li>Ignoring maps and source quotations in answers.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use the four-part structure: context → evidence (sources) → analysis (historiographical debate) → conclusion. Quote at least one source per answer. Draw simple maps for trade routes, empire extent and battle sites. Revise timelines period-wise rather than dynasty-wise for quick recall.</div></div>`,
    qs: [
      { text: 'The Harappan site of Lothal is best known for:', options: ['A granary', 'A dockyard', 'A Great Bath', 'A stadium'], correct: 1, sol: 'Lothal in Gujarat has a large basin identified as a dockyard, indicating maritime trade with the Persian Gulf.' },
      { text: 'Ashoka’s dhamma primarily emphasised:', options: ['Buddhist monastic discipline', 'Moral conduct and social harmony', 'Vedic sacrifice', 'Military expansion'], correct: 1, sol: 'Dhamma was a civic ethic of tolerance, non-violence, respect for elders and social harmony, not a sectarian Buddhist doctrine.' },
      { text: 'The Arthashastra is attributed to:', options: ['Kalidasa', 'Kautilya', 'Banabhatta', 'Vishakhadatta'], correct: 1, sol: 'The Arthashastra, a treatise on statecraft and economy, is attributed to Kautilya (Chanakya), Chandragupta Maurya’s minister.' },
      { text: 'The mansabdari system was a feature of:', options: ['Delhi Sultanate', 'Mughal administration', 'Chola administration', 'Mauryan administration'], correct: 1, sol: 'Mansabdari was the Mughal system ranking nobles by zat (personal) and sawar (cavalry) numbers, combining military and civil roles.' },
      { text: 'The term ‘Indian feudalism’ is most associated with the historiography of:', options: ['R.S. Sharma', 'Romila Thapar', 'Irfan Habib', 'Sumit Sarkar'], correct: 0, sol: 'R.S. Sharma’s Indian Feudalism argued that land grants and decentralisation produced feudal tendencies in early medieval India.' }
    ]
  },
  'opt-law/overview': {
    html: `<h3>Law Optional — Syllabus Map &amp; Strategy</h3>
<p>UPSC Law optional has two papers of 250 marks each. The syllabus is vast but predictable: constitutional law, administrative law and international law in Paper I; contracts, mercantile law, crimes, torts, family, property and labour law in Paper II. This course spreads the coverage across three lesson pages, with criminal law treated in depth.</p>
<h3>Paper I — Constitutional and Administrative Law; International Law</h3>
<ul>
<li><strong>Constitutional Law:</strong> Constitution and constitutionalism, fundamental rights, directive principles, executive–legislature–judiciary, federalism, emergency provisions, amendment and basic structure.</li>
<li><strong>Administrative Law:</strong> delegated legislation, natural justice, judicial review of administrative action, administrative discretion, remedies, tribunals, ombudsman.</li>
<li><strong>International Law:</strong> sources, relationship with municipal law, recognition, jurisdiction, state responsibility, law of the sea, air and space law, war and neutrality, international organisations, human rights, international environmental law.</li>
</ul>
<h3>Paper II — Private and Penal Law</h3>
<ul>
<li><strong>Law of Contracts and Mercantile Law:</strong> formation, consideration, capacity, free consent, void agreements, performance, breach and remedies; Sale of Goods Act, Partnership Act, Negotiable Instruments Act, Companies Act.</li>
<li><strong>Law of Crimes:</strong> Indian Penal Code — general exceptions and offences against person, property, state and public order; criminal procedure and evidence.</li>
<li><strong>Law of Torts:</strong> negligence, nuisance, defamation, strict and vicarious liability, remedies.</li>
<li><strong>Family Law:</strong> Hindu and Muslim marriage, divorce, maintenance, adoption, inheritance and succession.</li>
<li><strong>Law of Property:</strong> transfer of property, easements, mortgages, leases, gifts.</li>
<li><strong>Industrial and Labour Law:</strong> Industrial Disputes Act, Factories Act, minimum wages, trade unions, workmen’s compensation.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Basic Structure Doctrine</div><div class="ex-text">Question: Explain the basic structure doctrine and its significance.</div><div class="ex-soln">Answer: Propounded in Kesavananda Bharati v. State of Kerala (1973), the doctrine holds that Parliament can amend the Constitution but cannot destroy its basic structure — such as supremacy of the Constitution, republican and democratic form of government, secularism, separation of powers and federalism. It was applied in Indira Nehru Gandhi v. Raj Narain (1975) and Minerva Mills (1980), and remains the strongest judicial check on constitutional amendments.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Constitutional Law: M.P. Jain; D.D. Basu; J.N. Pandey; Brij Kishore Sharma</li>
<li>Administrative Law: C.K. Takwani; I.P. Massey</li>
<li>International Law: S.K. Kapoor; Malcolm Shaw</li>
<li>Contract: R.K. Bangia; Avatar Singh</li>
<li>Criminal Law: Ratan Lal &amp; Dhiraj Lal; K.D. Gaur</li>
<li>Torts: R.K. Bangia; Winfield</li>
<li>Family Law: Paras Diwan; Kusum</li>
<li>Property: R.K. Sinha; Mulla</li>
<li>Labour Law: S.N. Misra; P.L. Malik</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Writing case law without the ratio decidendi — cite the principle, not just the name.</li>
<li>Confusing Article 32 with Article 226, or fundamental rights with directive principles.</li>
<li>Mixing IPC sections (e.g., 299/300 culpable homicide vs murder, 302 punishment).</li>
<li>Ignoring the distinction between civil and criminal liability in torts answers.</li>
<li>Quoting overruled judgments; check the current position.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer structure: legal issue → rule (statute/case) → application to facts → conclusion. Cite at least two authorities per answer. For constitutional answers, link doctrine to recent Supreme Court judgments. Keep a case-law register organised by topic, and revise landmark cases (Kesavananda, Maneka Gandhi, Minerva Mills, Vishaka, Puttaswamy, Sabarimala).</div></div>`,
    qs: [
      { text: 'The basic structure doctrine was propounded in:', options: ['Golaknath v. State of Punjab', 'Kesavananda Bharati v. State of Kerala', 'Minerva Mills v. Union of India', 'Maneka Gandhi v. Union of India'], correct: 1, sol: 'Kesavananda Bharati (1973) held that Parliament cannot amend the basic structure of the Constitution.' },
      { text: 'Article 32 of the Constitution provides for:', options: ['Right to equality', 'Right to constitutional remedies', 'Right to life', 'Right against exploitation'], correct: 1, sol: 'Article 32 empowers individuals to move the Supreme Court directly for enforcement of fundamental rights; it is itself a fundamental right.' },
      { text: 'Culpable homicide is murder if it falls within:', options: ['Section 299 IPC', 'Section 300 IPC', 'Section 302 IPC', 'Section 304 IPC'], correct: 1, sol: 'Section 299 defines culpable homicide; Section 300 defines when culpable homicide amounts to murder; Section 302 provides punishment for murder.' },
      { text: 'The doctrine of ‘res judicata’ means:', options: ['A matter already decided cannot be relitigated', 'A new law applies retrospectively', 'The state cannot be sued', 'A contract without consideration is void'], correct: 0, sol: 'Res judicata (Section 11 CPC) bars re-litigation of a matter finally decided by a competent court between the same parties.' },
      { text: 'Which of the following is a source of international law under Article 38(1) of the ICJ Statute?', options: ['Municipal statutes', 'Judicial decisions and teachings of publicists', 'Executive orders', 'Party manifestos'], correct: 1, sol: 'Article 38(1) lists treaties, custom, general principles, and judicial decisions and teachings of the most highly qualified publicists as subsidiary means.' }
    ]
  },
  'opt-philosophy/overview': {
    html: `<h3>Philosophy Optional — Syllabus Map &amp; Strategy</h3>
<p>Philosophy has two papers of 250 marks each. Paper I covers Western philosophy and philosophical problems; Paper II covers Indian philosophy. The optional suits candidates who enjoy argument, definition and conceptual analysis — answers are judged on clarity of thought, not information density.</p>
<h3>Paper I — History and Problems of Philosophy</h3>
<ul>
<li><strong>Western thinkers:</strong> Plato, Aristotle, Descartes, Spinoza, Leibniz, Locke, Berkeley, Hume, Kant, Hegel, Marx, Moore, Russell, Wittgenstein, existentialism and phenomenology.</li>
<li><strong>Problems:</strong> substance, causality, space and time, universals, mind–body relation, knowledge and scepticism, truth, ethics, freedom and determinism, existence of God.</li>
</ul>
<h3>Paper II — Indian Philosophy</h3>
<ul>
<li><strong>Classical schools:</strong> Charvaka, Jainism, Buddhism, Nyaya, Vaisheshika, Samkhya, Yoga, Mimamsa and Vedanta.</li>
<li><strong>Texts and ideas:</strong> Vedas, Upanishads, Bhagavad Gita, Buddhist and Jaina canon, Brahma Sutras.</li>
<li><strong>Modern Indian thinkers:</strong> Gandhi, Tagore, Aurobindo, Radhakrishnan, Ambedkar, Iqbal and others.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Plato’s Theory of Forms</div><div class="ex-text">Question: Explain Plato’s theory of Forms and its epistemological significance.</div><div class="ex-soln">Answer: Plato distinguishes the world of becoming (sensible objects) from the world of being (Forms). Forms are eternal, unchanging universals; particular things participate in them. Knowledge (episteme) is of Forms, while opinion (doxa) is of sensible things. The Form of the Good illuminates all other Forms and grounds both knowledge and morality. Criticism: Aristotle rejected the separation of Forms from particulars (third-man argument).</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Western Philosophy: Y. Masih; W.T. Stace; Bertrand Russell (History of Western Philosophy); S.E. Stumpf</li>
<li>Indian Philosophy: S. Radhakrishnan; M. Hiriyanna; C.D. Sharma; Datta &amp; Chatterjee</li>
<li>Ethics: William Frankena; Peter Singer</li>
<li>Original texts: Plato’s Republic, Descartes’ Meditations, Kant’s Groundwork, Bhagavad Gita, Upanishads</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Describing a philosopher’s life instead of the argument — examiners want the thesis and its justification.</li>
<li>Presenting Indian philosophy as mere religion; emphasise pramana theory, logic and metaphysics.</li>
<li>Ignoring criticisms — a strong answer states the objection and the reply.</li>
<li>Confusing Nyaya with Vaisheshika, or Samkhya with Vedanta.</li>
<li>Using jargon without defining it.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use the argumentative structure: state the problem → define key terms → explain the thinker’s thesis with reasons → state a criticism → evaluate. Use numbered premises for deductive arguments and examples for abstract ideas. Revise one-page summaries per thinker: central problem, thesis, arguments, criticism.</div></div>`,
    qs: [
      { text: 'Plato’s theory of Forms holds that knowledge is of:', options: ['Sensible particulars', 'Eternal unchanging Forms', 'Mental states', 'Language games'], correct: 1, sol: 'For Plato, knowledge (episteme) is of the eternal Forms; opinion (doxa) is of changing sensible particulars.' },
      { text: 'The Charvaka school is known for:', options: ['Idealism', 'Materialism and sense-perception as the only pramana', 'Monotheism', 'Asceticism'], correct: 1, sol: 'Charvaka (Lokayata) was a materialist school that accepted only perception (pratyaksha) as a valid source of knowledge and rejected soul, afterlife and ritual.' },
      { text: 'Kant’s Copernican revolution in philosophy refers to:', options: ['The earth revolves around the sun', 'Objects conform to our cognition rather than cognition to objects', 'Reason is subordinate to faith', 'Experience is the only source of knowledge'], correct: 1, sol: 'Kant argued that the mind imposes its forms (space, time, categories) on experience, so objects conform to our cognition — reversing the traditional assumption.' },
      { text: 'Syadvada and anekantavada are doctrines of:', options: ['Buddhism', 'Jainism', 'Nyaya', 'Samkhya'], correct: 1, sol: 'Jainism’s syadvada (seven-fold predication) and anekantavada (many-sidedness) express its pluralistic realism.' },
      { text: 'The Bhagavad Gita’s central teaching on action is best described as:', options: ['Renunciation of all action', 'Disinterested action (nishkama karma)', 'Ritual sacrifice', 'Hedonism'], correct: 1, sol: 'The Gita teaches nishkama karma — action performed without attachment to its fruits — as the path to liberation.' }
    ]
  },
  'opt-philosophy/paper2': {
    html: `<h3>Philosophy Paper II — Indian Philosophy</h3>
<p>Indian philosophy is examined as a set of competing systems (darshanas) with shared problems: the nature of the self, sources of knowledge (pramanas), liberation (moksha) and the status of the world.</p>
<h3>Charvaka (Lokayata)</h3>
<ul>
<li>Materialist school; only perception (pratyaksha) is a valid pramana.</li>
<li>Rejects soul, afterlife, karma and ritual; body is conscious matter.</li>
<li>Ethics of pleasure tempered by prudence; criticised for crude hedonism.</li>
</ul>
<h3>Jainism</h3>
<ul>
<li><strong>Anekantavada:</strong> reality is many-sided; every judgment is partial.</li>
<li><strong>Syadvada:</strong> seven-fold predication — “in some sense, it is; in some sense, it is not.”</li>
<li><strong>Karma and jiva:</strong> souls are bound by karma; liberation by right faith, knowledge and conduct; ahimsa central.</li>
<li><strong>Seven tattvas:</strong> jiva, ajiva, asrava, bandha, samvara, nirjara, moksha.</li>
</ul>
<h3>Buddhism</h3>
<ul>
<li><strong>Four Noble Truths:</strong> suffering, its cause, its cessation, the path.</li>
<li><strong>Eightfold Path:</strong> right view, resolve, speech, action, livelihood, effort, mindfulness, concentration.</li>
<li><strong>Pratityasamutpada:</strong> dependent origination; anitya (impermanence), anatman (no-self), nirvana.</li>
<li><strong>Schools:</strong> Theravada, Mahayana (Madhyamaka, Yogachara), Vajrayana.</li>
</ul>
<h3>Nyaya and Vaisheshika</h3>
<ul>
<li><strong>Nyaya:</strong> four pramanas — perception, inference, comparison, testimony; five-membered syllogism; God as creator.</li>
<li><strong>Vaisheshika:</strong> atomism; seven padarthas — dravya, guna, karma, samanya, vishesha, samavaya, abhava.</li>
</ul>
<h3>Samkhya and Yoga</h3>
<ul>
<li><strong>Samkhya:</strong> dualism of purusha (consciousness) and prakriti (matter); three gunas — sattva, rajas, tamas; evolution of tattvas; liberation as isolation (kaivalya).</li>
<li><strong>Yoga:</strong> Patanjali’s eight limbs — yama, niyama, asana, pranayama, pratyahara, dharana, dhyana, samadhi; chitta-vritti-nirodha; Ishvara.</li>
</ul>
<h3>Mimamsa and Vedanta</h3>
<ul>
<li><strong>Mimamsa:</strong> dharma, apurva, authority of the Vedas; ritual action and its unseen results.</li>
<li><strong>Advaita (Shankara):</strong> Brahman alone is real; the world is maya; avidya causes bondage; jiva is ultimately Brahman.</li>
<li><strong>Vishishtadvaita (Ramanuja):</strong> qualified non-dualism; Brahman with attributes; jiva and world are real modes of Brahman.</li>
<li><strong>Dvaita (Madhva):</strong> strict dualism between God, souls and matter.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Buddhism on the Self</div><div class="ex-text">Question: Explain the Buddhist doctrine of anatman.</div><div class="ex-soln">Answer: Buddhism denies a permanent, unchanging self (atman). The person is a bundle of five skandhas — form, feeling, perception, volitional formations and consciousness — in constant flux. The illusion of self arises from clinging to these aggregates. Since everything is impermanent (anitya), attachment to a self causes suffering (dukkha). Liberation (nirvana) is the cessation of craving and the illusion of self. The doctrine is not annihilation but the rejection of a permanent ego.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Treating Charvaka as the only materialist school or dismissing it without argument.</li>
<li>Confusing Jain syadvada with Buddhist relativism.</li>
<li>Mixing Nyaya pramanas with Vedanta; Shankara accepts six pramanas.</li>
<li>Describing Advaita as “world is false” without explaining maya and avidya.</li>
<li>Ignoring the pramana framework in answers on Indian epistemology.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For each school, prepare a one-page sheet: founder/text, central thesis, pramanas, metaphysics, ethics, liberation, criticism. Use Sanskrit terms with brief English glosses. Compare schools explicitly (e.g., Samkhya vs Advaita on causation) — comparison earns higher marks than description.</div></div>`,
    qs: [
      { text: 'The doctrine of syadvada belongs to:', options: ['Buddhism', 'Jainism', 'Nyaya', 'Vedanta'], correct: 1, sol: 'Syadvada is the Jaina doctrine of seven-fold predication, expressing the many-sidedness of reality.' },
      { text: 'In Samkhya philosophy, liberation (kaivalya) is:', options: ['Union with God', 'Isolation of purusha from prakriti', 'Ritual purification', 'Attainment of heaven'], correct: 1, sol: 'Samkhya dualism holds that purusha (pure consciousness) is liberated when it realises its distinction from prakriti (matter).' },
      { text: 'The five skandhas are associated with:', options: ['Jainism', 'Buddhism', 'Nyaya', 'Mimamsa'], correct: 1, sol: 'Buddhism analyses the person into five skandhas: form, feeling, perception, volitional formations and consciousness.' },
      { text: 'Shankara’s Advaita Vedanta holds that:', options: ['The world is ultimately real', 'Brahman alone is real and the world is maya', 'Souls are eternally distinct from God', 'Perception is the only pramana'], correct: 1, sol: 'For Shankara, Brahman is the sole reality; the world is maya (appearance) produced by avidya (ignorance).' },
      { text: 'Patanjali’s Yoga is best described as:', options: ['A materialist school', 'A practical discipline for stilling mental modifications', 'A ritualistic school', 'A school of logic'], correct: 1, sol: 'Patanjali’s Yoga Sutras define yoga as chitta-vritti-nirodha — stilling the modifications of the mind — through the eight limbs.' }
    ]
  },
  'opt-physics/overview': {
    html: `<h3>Physics Optional — Syllabus Map &amp; Strategy</h3>
<p>Physics has two papers of 250 marks each. Paper I is classical physics plus thermodynamics; Paper II is modern physics. The optional is scoring for candidates with strong mathematical physics foundations, but numericals must be shown step by step.</p>
<h3>Paper I — Classical and Statistical Physics</h3>
<ul>
<li><strong>Mechanics of particles and rigid bodies:</strong> Newtonian mechanics, conservation laws, central force motion, rigid body dynamics, moment of inertia, Euler’s equations.</li>
<li><strong>Mechanics of continuous media:</strong> elasticity, fluid dynamics, viscosity, surface tension, Bernoulli and Navier–Stokes equations.</li>
<li><strong>Special theory of relativity:</strong> Lorentz transformations, length contraction, time dilation, relativistic momentum and energy, mass–energy equivalence.</li>
<li><strong>Waves and optics:</strong> wave equation, superposition, interference, diffraction, polarisation, lasers, fibre optics, holography.</li>
<li><strong>Electricity and magnetism:</strong> electrostatics, magnetostatics, Maxwell’s equations, electromagnetic waves, circuits, dielectrics and magnetic materials.</li>
<li><strong>Thermodynamics and statistical physics:</strong> laws of thermodynamics, entropy, thermodynamic potentials, Maxwell relations, kinetic theory, Maxwell–Boltzmann, Fermi–Dirac and Bose–Einstein statistics.</li>
</ul>
<h3>Paper II — Modern Physics</h3>
<ul>
<li><strong>Quantum mechanics:</strong> wave–particle duality, Schrödinger equation, operators, uncertainty principle, angular momentum, hydrogen atom, perturbation theory.</li>
<li><strong>Atomic and molecular physics:</strong> spectra, fine structure, Zeeman and Stark effects, molecular bonding, rotational and vibrational spectra.</li>
<li><strong>Solid state physics:</strong> crystal structure, X-ray diffraction, lattice vibrations, band theory, semiconductors, superconductivity.</li>
<li><strong>Nuclear and particle physics:</strong> nuclear models, radioactivity, fission and fusion, detectors and accelerators, elementary particles and conservation laws.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Time Dilation</div><div class="ex-text">Question: A muon has a proper lifetime of 2.2 μs. If it travels at 0.99c, find its lifetime in the laboratory frame.</div><div class="ex-soln">Answer: γ = 1/√(1 − v²/c²) = 1/√(1 − 0.9801) = 1/√0.0199 ≈ 7.09. Laboratory lifetime = γτ₀ = 7.09 × 2.2 μs ≈ 15.6 μs.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Mechanics: Goldstein; R.P. Feynman (Lectures)</li>
<li>Electrodynamics: Griffiths; Jackson (advanced)</li>
<li>Quantum Mechanics: Griffiths; Bransden &amp; Joachain; Eisberg &amp; Resnick</li>
<li>Statistical Mechanics: Pathria; Reif</li>
<li>Solid State: Kittel; Ashcroft &amp; Mermin</li>
<li>Nuclear Physics: Krane; S.B. Patel</li>
<li>Atomic/Molecular: Bransden &amp; Joachain; C.J. Foot</li>
<li>Optics: Hecht; Ghatak</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Writing only the final formula without derivation — step marks matter.</li>
<li>Using non-relativistic formulas at speeds close to c.</li>
<li>Confusing Fermi–Dirac with Bose–Einstein statistics.</li>
<li>Forgetting boundary conditions in quantum well problems.</li>
<li>Ignoring units and significant figures.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer format: statement of the physical principle → governing equation → derivation or setup → substitution with units → result and interpretation. Draw ray diagrams, energy-level diagrams and circuit sketches. Keep a formula sheet per unit and practise past-year numericals under time limits.</div></div>`,
    qs: [
      { text: 'The Lorentz factor γ becomes large when:', options: ['v is much less than c', 'v approaches c', 'v equals zero', 'mass increases'], correct: 1, sol: 'γ = 1/√(1 − v²/c²) grows without bound as v approaches the speed of light.' },
      { text: 'Fermi–Dirac statistics apply to:', options: ['Photons', 'Fermions such as electrons', 'Bosons', 'Classical particles'], correct: 1, sol: 'Fermi–Dirac statistics describe fermions (half-integer spin) and obey the Pauli exclusion principle; Bose–Einstein statistics apply to bosons.' },
      { text: 'In a one-dimensional infinite square well, the ground-state energy is proportional to:', options: ['L', '1/L', '1/L²', 'L²'], correct: 2, sol: 'Eₙ = n²π²ħ²/(2mL²), so the ground-state energy scales as 1/L².' },
      { text: 'Maxwell’s equations predict that electromagnetic waves travel in vacuum at:', options: ['Speed of sound', '1/√(μ₀ε₀)', 'Infinite speed', 'Speed of light in water'], correct: 1, sol: 'The wave speed is c = 1/√(μ₀ε₀), which equals the speed of light in vacuum.' },
      { text: 'Superconductivity is characterised by:', options: ['Zero resistivity and Meissner effect', 'High resistivity', 'Paramagnetism only', 'Absence of specific heat'], correct: 0, sol: 'Superconductors have zero electrical resistance below the critical temperature and expel magnetic fields (Meissner effect).' }
    ]
  }
};

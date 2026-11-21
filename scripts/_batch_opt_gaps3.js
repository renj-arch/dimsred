// Batch 3: Medical Science (3) + Zoology (3)
module.exports = {
  'opt-medical-science/overview': {
    html: `<h3>Medical Science Optional — Syllabus Map &amp; Strategy</h3>
<p>Medical Science has two papers of 250 marks each. Paper I covers the basic sciences — anatomy, physiology, biochemistry and pathology; Paper II covers clinical and community subjects. The optional is best for MBBS graduates, but non-medical candidates can attempt it with disciplined preparation.</p>
<h3>Paper I — Basic Medical Sciences</h3>
<ul>
<li><strong>Anatomy:</strong> general anatomy, osteology, embryology, histology, neuroanatomy and regional anatomy.</li>
<li><strong>Physiology:</strong> cell and nerve, muscle, cardiovascular, respiratory, renal, gastrointestinal, endocrine, reproductive and central nervous systems.</li>
<li><strong>Biochemistry:</strong> biomolecules, enzymes, metabolism, molecular biology, vitamins, minerals and nutrition.</li>
<li><strong>Pathology:</strong> cell injury and adaptation, inflammation, repair, neoplasia, haematology and systemic pathology.</li>
</ul>
<h3>Paper II — Clinical and Community Sciences</h3>
<ul>
<li><strong>Pharmacology:</strong> general pharmacology, autonomic drugs, CNS drugs, cardiovascular drugs, antimicrobials and chemotherapy.</li>
<li><strong>Medicine:</strong> cardiology, respiratory medicine, gastroenterology, nephrology, endocrinology, neurology and infectious diseases.</li>
<li><strong>Surgery:</strong> general surgery, trauma, tumours, urology, orthopaedics and operative procedures.</li>
<li><strong>Community Medicine:</strong> epidemiology, health programmes, biostatistics, environmental and occupational health, national health policy.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Sensitivity and Specificity</div><div class="ex-text">Question: A screening test has 90 true positives, 10 false negatives, 20 false positives and 80 true negatives. Find sensitivity and specificity.</div><div class="ex-soln">Answer: Sensitivity = TP/(TP + FN) = 90/100 = 90%. Specificity = TN/(TN + FP) = 80/100 = 80%. The test detects 90% of diseased persons and correctly excludes 80% of healthy persons.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Anatomy: B.D. Chaurasia; Gray’s Anatomy</li>
<li>Physiology: Guyton &amp; Hall; Ganong</li>
<li>Biochemistry: Harper; Lippincott</li>
<li>Pathology: Robbins &amp; Cotran; Harsh Mohan</li>
<li>Pharmacology: Katzung; K.D. Tripathi</li>
<li>Medicine: Harrison’s; API Textbook</li>
<li>Surgery: Bailey &amp; Love; SRB</li>
<li>Community Medicine: Park; Mahajan &amp; Gupta</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Writing clinical detail without the underlying mechanism.</li>
<li>Confusing incidence with prevalence.</li>
<li>Mixing sensitivity with positive predictive value.</li>
<li>Quoting outdated drug regimens or health programme targets.</li>
<li>Ignoring diagrams in anatomy and pathology answers.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer structure: definition → mechanism/pathophysiology → clinical features → diagnosis → management → public-health relevance. Use labelled diagrams for anatomy, flowcharts for metabolism and tables for drug comparisons. Link clinical answers to national health programmes wherever possible.</div></div>`,
    qs: [
      { text: 'The largest gland in the human body is:', options: ['Pancreas', 'Liver', 'Thyroid', 'Salivary gland'], correct: 1, sol: 'The liver is the largest gland and the largest internal organ; it performs metabolic, detoxifying and bile-secreting functions.' },
      { text: 'The functional unit of the kidney is:', options: ['Neuron', 'Nephron', 'Alveolus', 'Hepatocyte'], correct: 1, sol: 'Each kidney contains about a million nephrons, the structural and functional units that filter blood and form urine.' },
      { text: 'Deficiency of vitamin C causes:', options: ['Rickets', 'Scurvy', 'Beriberi', 'Pellagra'], correct: 1, sol: 'Vitamin C (ascorbic acid) deficiency impairs collagen synthesis and causes scurvy — bleeding gums, poor wound healing and petechiae.' },
      { text: 'The most abundant plasma protein is:', options: ['Globulin', 'Albumin', 'Fibrinogen', 'Transferrin'], correct: 1, sol: 'Albumin constitutes about 60% of plasma protein and maintains oncotic pressure.' },
      { text: 'A malignant tumour arising from epithelial tissue is called:', options: ['Sarcoma', 'Carcinoma', 'Lymphoma', 'Leukaemia'], correct: 1, sol: 'Carcinomas arise from epithelial cells; sarcomas arise from connective tissue, lymphomas from lymphoid tissue and leukaemias from blood-forming cells.' }
    ]
  },
  'opt-medical-science/paper1': {
    html: `<h3>Medical Science Paper I — Anatomy, Physiology, Biochemistry and Pathology</h3>
<h3>Anatomy</h3>
<ul>
<li><strong>General anatomy:</strong> anatomical position, planes, terms, tissues and systems.</li>
<li><strong>Osteology and arthrology:</strong> bone types, joints, movements, vertebral column, limbs.</li>
<li><strong>Embryology:</strong> gametogenesis, fertilisation, cleavage, implantation, germ layers, organogenesis, fetal circulation.</li>
<li><strong>Histology:</strong> epithelium, connective tissue, muscle, nerve, glandular tissue.</li>
<li><strong>Neuroanatomy:</strong> brain, spinal cord, cranial nerves, autonomic nervous system, pathways.</li>
<li><strong>Regional anatomy:</strong> thorax, abdomen, pelvis, head and neck, upper and lower limbs.</li>
</ul>
<h3>Physiology</h3>
<ul>
<li><strong>Cell and nerve:</strong> membrane transport, resting and action potential, synaptic transmission.</li>
<li><strong>Muscle:</strong> sliding filament theory, excitation–contraction coupling, muscle types.</li>
<li><strong>Cardiovascular:</strong> cardiac cycle, ECG, cardiac output, blood pressure regulation.</li>
<li><strong>Respiratory:</strong> mechanics of breathing, gas exchange, transport of O₂ and CO₂, regulation.</li>
<li><strong>Renal:</strong> glomerular filtration, tubular reabsorption and secretion, acid–base balance.</li>
<li><strong>Endocrine and reproductive:</strong> hypothalamic–pituitary axis, thyroid, adrenal, pancreatic hormones, menstrual cycle.</li>
</ul>
<h3>Biochemistry</h3>
<ul>
<li><strong>Biomolecules:</strong> carbohydrates, lipids, proteins, nucleic acids; enzymes and coenzymes.</li>
<li><strong>Metabolism:</strong> glycolysis, Krebs cycle, oxidative phosphorylation, gluconeogenesis, urea cycle, lipid and amino acid metabolism.</li>
<li><strong>Molecular biology:</strong> DNA replication, transcription, translation, regulation of gene expression.</li>
<li><strong>Nutrition:</strong> vitamins, minerals, energy balance, deficiency diseases.</li>
</ul>
<h3>Pathology</h3>
<ul>
<li><strong>Cell injury:</strong> reversible and irreversible injury, necrosis, apoptosis, adaptation.</li>
<li><strong>Inflammation and repair:</strong> acute and chronic inflammation, mediators, granulation tissue, wound healing.</li>
<li><strong>Neoplasia:</strong> benign vs malignant, carcinogenesis, tumour markers, metastasis.</li>
<li><strong>Haematology:</strong> anaemias, leukaemias, coagulation disorders.</li>
<li><strong>Systemic pathology:</strong> cardiovascular, respiratory, renal, hepatic and endocrine diseases.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Cardiac Output</div><div class="ex-text">Question: If stroke volume is 70 mL and heart rate is 75 beats/min, find cardiac output.</div><div class="ex-soln">Answer: Cardiac output = stroke volume × heart rate = 70 × 75 = 5250 mL/min ≈ 5.25 L/min.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing necrosis with apoptosis — apoptosis is programmed and non-inflammatory.</li>
<li>Mixing afferent and efferent arterioles in the nephron.</li>
<li>Writing biochemical pathways without key enzymes or regulation.</li>
<li>Forgetting embryological derivatives in anatomy answers.</li>
<li>Describing pathology without morphology and mechanism.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For anatomy, draw labelled diagrams; for physiology, use flowcharts of regulation; for biochemistry, show pathway intermediates and rate-limiting enzymes; for pathology, structure answers as aetiology → pathogenesis → morphology → clinical effects. Link basic science to clinical examples.</div></div>`,
    qs: [
      { text: 'The neurotransmitter released at the neuromuscular junction is:', options: ['Dopamine', 'Acetylcholine', 'Noradrenaline', 'GABA'], correct: 1, sol: 'Motor neurons release acetylcholine, which binds nicotinic receptors on the motor end plate to trigger muscle contraction.' },
      { text: 'DNA replication in a eukaryotic cell occurs during:', options: ['G1 phase', 'S phase', 'G2 phase', 'M phase'], correct: 1, sol: 'DNA synthesis occurs in the S (synthesis) phase of interphase, between G1 and G2.' },
      { text: 'The rate-limiting enzyme of glycolysis is:', options: ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Aldolase'], correct: 1, sol: 'Phosphofructokinase-1 (PFK-1) catalyses the committed step of glycolysis and is the main regulatory enzyme.' },
      { text: 'Apoptosis is best described as:', options: ['Accidental cell death with inflammation', 'Programmed cell death without inflammation', 'Cell swelling and lysis', 'Fatty change in the liver'], correct: 1, sol: 'Apoptosis is energy-dependent programmed cell death with cell shrinkage and no inflammatory response.' },
      { text: 'Glomerular filtration rate in a healthy adult is about:', options: ['25 mL/min', '75 mL/min', '125 mL/min', '500 mL/min'], correct: 2, sol: 'Normal GFR is approximately 125 mL/min (about 180 L/day), maintained by autoregulation of renal blood flow.' }
    ]
  },
  'opt-medical-science/paper2': {
    html: `<h3>Medical Science Paper II — Pharmacology, Medicine, Surgery and Community Medicine</h3>
<h3>Pharmacology</h3>
<ul>
<li><strong>General pharmacology:</strong> pharmacokinetics (absorption, distribution, metabolism, excretion), pharmacodynamics, receptors, dose–response curves, first-pass metabolism.</li>
<li><strong>Autonomic drugs:</strong> sympathomimetics, sympatholytics, parasympathomimetics, anticholinergics.</li>
<li><strong>CNS drugs:</strong> anaesthetics, sedatives, anticonvulsants, antipsychotics, antidepressants, opioids.</li>
<li><strong>Cardiovascular drugs:</strong> antihypertensives, antianginals, antiarrhythmics, diuretics, anticoagulants.</li>
<li><strong>Antimicrobials:</strong> antibiotics, antitubercular drugs, antimalarials, antivirals, antifungals; resistance mechanisms.</li>
</ul>
<h3>Medicine</h3>
<ul>
<li><strong>Cardiology:</strong> ischaemic heart disease, myocardial infarction, heart failure, arrhythmias, hypertension.</li>
<li><strong>Respiratory:</strong> asthma, COPD, pneumonia, tuberculosis, pleural diseases.</li>
<li><strong>Gastroenterology and hepatology:</strong> peptic ulcer, liver disease, pancreatitis.</li>
<li><strong>Nephrology and endocrinology:</strong> acute kidney injury, chronic kidney disease, diabetes, thyroid disorders.</li>
<li><strong>Neurology and infectious diseases:</strong> stroke, epilepsy, meningitis, malaria, dengue, HIV.</li>
</ul>
<h3>Surgery</h3>
<ul>
<li><strong>General surgery:</strong> wound healing, shock, fluid and electrolyte management, surgical infections.</li>
<li><strong>Trauma:</strong> ATLS approach, fractures, head injury, abdominal trauma.</li>
<li><strong>Tumours:</strong> staging, biopsy, principles of oncology surgery.</li>
<li><strong>Specialities:</strong> urology, orthopaedics, neurosurgery, paediatric surgery basics.</li>
</ul>
<h3>Community Medicine</h3>
<ul>
<li><strong>Epidemiology:</strong> incidence, prevalence, study designs, association and causation, screening.</li>
<li><strong>National health programmes:</strong> immunisation, tuberculosis, malaria, maternal and child health, non-communicable diseases.</li>
<li><strong>Biostatistics:</strong> measures of central tendency and dispersion, sampling, tests of significance.</li>
<li><strong>Environmental and occupational health:</strong> water, sanitation, air pollution, occupational hazards.</li>
<li><strong>Health policy:</strong> National Health Policy, Ayushman Bharat, health system strengthening.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Positive Predictive Value</div><div class="ex-text">Question: In a screening test, 90 are true positives, 20 are false positives, 10 are false negatives and 80 are true negatives. Find the positive predictive value.</div><div class="ex-soln">Answer: PPV = TP/(TP + FP) = 90/(90 + 20) = 90/110 ≈ 81.8%. Among those who test positive, about 82% actually have the disease.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing incidence (new cases) with prevalence (all existing cases).</li>
<li>Mixing sensitivity with PPV; sensitivity is disease-based, PPV is test-result-based.</li>
<li>Quoting outdated treatment guidelines; use current national programmes.</li>
<li>Describing surgery without indications and complications.</li>
<li>Ignoring preventive and social aspects in clinical answers.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use a clinical case structure: presentation → differential diagnosis → investigations → diagnosis → management → prevention. For community medicine, quote national programme data and epidemiological measures. For pharmacology, compare drug classes in tables (mechanism, uses, adverse effects).</div></div>`,
    qs: [
      { text: 'First-pass metabolism of an orally administered drug occurs mainly in the:', options: ['Kidney', 'Liver', 'Lungs', 'Stomach'], correct: 1, sol: 'Orally absorbed drugs pass through the portal vein to the liver, where they may be metabolised before reaching systemic circulation.' },
      { text: 'The most sensitive biomarker for myocardial infarction is:', options: ['CK-MB', 'Troponin I/T', 'LDH', 'AST'], correct: 1, sol: 'Cardiac troponins are highly sensitive and specific markers of myocardial injury and rise within a few hours of infarction.' },
      { text: 'Incidence measures:', options: ['All existing cases at a point in time', 'New cases occurring over a period', 'Deaths in a population', 'Hospital admissions only'], correct: 1, sol: 'Incidence is the number of new cases in a population over a specified period; prevalence is the total existing cases.' },
      { text: 'The universal donor blood group is:', options: ['A positive', 'B positive', 'AB positive', 'O negative'], correct: 3, sol: 'O negative red cells lack A, B and Rh D antigens, so they can be transfused to recipients of any ABO/Rh type in emergencies.' },
      { text: 'In the ATLS approach to trauma, the first priority is:', options: ['Circulation', 'Airway with cervical spine protection', 'Disability', 'Exposure'], correct: 1, sol: 'The ABCDE sequence begins with airway and cervical spine protection, followed by breathing, circulation, disability and exposure.' }
    ]
  },
  'opt-zoology/overview': {
    html: `<h3>Zoology Optional — Syllabus Map &amp; Strategy</h3>
<p>Zoology has two papers of 250 marks each. Paper I covers animal diversity, physiology, genetics and evolution; Paper II covers ecology, developmental biology, cell biology and applied zoology. The optional rewards candidates who can combine classification, mechanism and diagram.</p>
<h3>Paper I — Animal Diversity and Biology</h3>
<ul>
<li><strong>Animal Diversity:</strong> classification and characteristics of phyla from Protozoa to Chordata, with examples and evolutionary trends.</li>
<li><strong>Animal Physiology:</strong> digestion, respiration, circulation, excretion, nervous and endocrine regulation, reproduction.</li>
<li><strong>Genetics:</strong> Mendelian inheritance, linkage and crossing over, mutations, sex determination, human genetic disorders, population genetics.</li>
<li><strong>Evolution:</strong> Darwinism, neo-Darwinism, Hardy–Weinberg equilibrium, speciation, human evolution.</li>
</ul>
<h3>Paper II — Ecology, Development and Applied Zoology</h3>
<ul>
<li><strong>Ecology:</strong> ecosystem structure, energy flow, biogeochemical cycles, population and community ecology, biodiversity and conservation.</li>
<li><strong>Developmental Biology:</strong> gametogenesis, fertilisation, cleavage, gastrulation, organogenesis, regeneration, metamorphosis.</li>
<li><strong>Cell Biology:</strong> organelles, cell cycle, mitosis and meiosis, membrane transport, signal transduction, cancer.</li>
<li><strong>Applied Zoology:</strong> aquaculture, apiculture, sericulture, poultry, pest control, biotechnology, wildlife management.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Hardy–Weinberg Frequency</div><div class="ex-text">Question: In a population, the frequency of a recessive allele is 0.2. Find the frequency of heterozygotes at equilibrium.</div><div class="ex-soln">Answer: q = 0.2, p = 0.8. Heterozygote frequency = 2pq = 2 × 0.8 × 0.2 = 0.32, i.e. 32%.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Animal Diversity: E.L. Jordan &amp; P.S. Verma; Ruppert, Fox &amp; Barnes</li>
<li>Physiology: Guyton &amp; Hall; Tortora</li>
<li>Genetics: P.S. Verma &amp; V.K. Agarwal; Snustad &amp; Simmons</li>
<li>Evolution: Ridley; Veer Bala Rastogi</li>
<li>Ecology: Odum; P.D. Sharma</li>
<li>Developmental Biology: Gilbert; Balinsky</li>
<li>Cell Biology: De Robertis; Alberts</li>
<li>Applied Zoology: Shukla &amp; Upadhyay; ICAR material</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Listing phylum characteristics without examples.</li>
<li>Confusing mitosis with meiosis stages.</li>
<li>Mixing incidence of ecological pyramids (number, biomass, energy).</li>
<li>Describing genetics without Punnett squares or ratios.</li>
<li>Ignoring Indian examples in applied zoology.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use tables for classification, labelled diagrams for anatomy and development, and flowcharts for physiological regulation. For ecology, quote Indian ecosystems and conservation programmes. For genetics, always show the cross and the expected ratio.</div></div>`,
    qs: [
      { text: 'The phylum with a water vascular system is:', options: ['Mollusca', 'Echinodermata', 'Arthropoda', 'Annelida'], correct: 1, sol: 'Echinoderms (starfish, sea urchins) possess a water vascular system used in locomotion, feeding and respiration.' },
      { text: 'The site of protein synthesis in a cell is the:', options: ['Mitochondria', 'Ribosome', 'Lysosome', 'Golgi apparatus'], correct: 1, sol: 'Ribosomes translate mRNA into polypeptides; free ribosomes make cytosolic proteins and bound ribosomes make secretory and membrane proteins.' },
      { text: 'Hardy–Weinberg equilibrium requires:', options: ['Small population, mutation and selection', 'Large population, random mating, no mutation, no selection and no migration', 'Assortative mating', 'High mutation rate'], correct: 1, sol: 'Allele frequencies remain constant in a large population with random mating and no mutation, selection or migration.' },
      { text: 'Darwin’s theory of evolution is based primarily on:', options: ['Inheritance of acquired characters', 'Natural selection acting on variation', 'Mutation pressure alone', 'Genetic drift'], correct: 1, sol: 'Darwin proposed that heritable variation and differential survival and reproduction (natural selection) drive evolution.' },
      { text: 'Apiculture is the rearing of:', options: ['Silkworms', 'Honey bees', 'Fish', 'Poultry'], correct: 1, sol: 'Apiculture is bee-keeping for honey and beeswax; sericulture is silk-worm rearing and aquaculture is fish farming.' }
    ]
  },
  'opt-zoology/paper1': {
    html: `<h3>Zoology Paper I — Animal Diversity, Animal Physiology, Genetics and Evolution</h3>
<h3>Animal Diversity</h3>
<ul>
<li><strong>Protozoa:</strong> amoeba, paramecium, plasmodium; locomotion, nutrition, reproduction.</li>
<li><strong>Porifera and Coelenterata:</strong> canal system, cnidoblasts, polymorphism, coral reefs.</li>
<li><strong>Platyhelminthes and Nematoda:</strong> parasitic adaptations, life cycles, Aschelminthes.</li>
<li><strong>Annelida and Arthropoda:</strong> metamerism, coelom, jointed appendages, insect mouthparts, metamorphosis.</li>
<li><strong>Mollusca and Echinodermata:</strong> mantle and shell, water vascular system, larval forms.</li>
<li><strong>Chordata:</strong> hemichordates, urochordates, cephalochordates, vertebrates; comparative anatomy of systems.</li>
</ul>
<h3>Animal Physiology</h3>
<ul>
<li><strong>Digestion:</strong> enzymes, absorption, regulation.</li>
<li><strong>Respiration:</strong> gills, lungs, respiratory pigments, gas transport.</li>
<li><strong>Circulation:</strong> heart types, cardiac cycle, blood pressure, lymph.</li>
<li><strong>Excretion and osmoregulation:</strong> nephridia, Malpighian tubules, kidneys, counter-current mechanism.</li>
<li><strong>Nervous and endocrine:</strong> nerve impulse, synapses, hypothalamic–pituitary axis, hormones and their actions.</li>
<li><strong>Reproduction:</strong> gametogenesis, hormonal control, reproductive cycles.</li>
</ul>
<h3>Genetics</h3>
<ul>
<li><strong>Mendelian genetics:</strong> laws, monohybrid and dihybrid crosses, test cross, incomplete dominance, codominance.</li>
<li><strong>Linkage and crossing over:</strong> recombination frequency, genetic mapping.</li>
<li><strong>Mutations:</strong> gene, chromosomal and genomic; mutagens.</li>
<li><strong>Sex determination:</strong> XX–XY, ZW, haplodiploidy, environmental sex determination.</li>
<li><strong>Human genetics:</strong> pedigree analysis, autosomal and sex-linked disorders, blood groups.</li>
<li><strong>Population genetics:</strong> Hardy–Weinberg law, allele frequencies, genetic drift.</li>
</ul>
<h3>Evolution</h3>
<ul>
<li><strong>Lamarckism and Darwinism:</strong> inheritance of acquired characters vs natural selection.</li>
<li><strong>Neo-Darwinism:</strong> mutation, recombination, selection and isolation.</li>
<li><strong>Speciation:</strong> allopatric, sympatric, parapatric; isolating mechanisms.</li>
<li><strong>Human evolution:</strong> Australopithecus, Homo habilis, H. erectus, H. neanderthalensis, H. sapiens.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Dihybrid Cross</div><div class="ex-text">Question: In a dihybrid cross between two heterozygotes (AaBb × AaBb), find the phenotypic ratio.</div><div class="ex-soln">Answer: Assuming independent assortment, the phenotypic ratio is 9:3:3:1 — 9 double dominant, 3 dominant–recessive, 3 recessive–dominant, 1 double recessive.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing protostome and deuterostome development.</li>
<li>Mixing the sites of filtration and reabsorption in the nephron.</li>
<li>Writing genetic crosses without showing gametes.</li>
<li>Confusing homologous with analogous organs in evolution.</li>
<li>Forgetting Indian examples of animal diversity.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use comparative tables for phyla and systems, labelled diagrams for anatomy and life cycles, and Punnett squares for genetics. For evolution answers, define the mechanism, give evidence and mention the modern synthesis.</div></div>`,
    qs: [
      { text: 'Metamerism is a characteristic feature of:', options: ['Mollusca', 'Annelida', 'Echinodermata', 'Porifera'], correct: 1, sol: 'Annelids show true metameric segmentation with repeated body segments and associated coelomic compartments.' },
      { text: 'The counter-current mechanism in the kidney is associated with:', options: ['Glomerular filtration', 'Concentration of urine', 'Secretion of renin', 'Excretion of glucose'], correct: 1, sol: 'The loop of Henle and vasa recta create an osmotic gradient that concentrates urine through the counter-current multiplier.' },
      { text: 'In a monohybrid cross between two heterozygotes (Aa × Aa), the genotypic ratio is:', options: ['3:1', '1:2:1', '9:3:3:1', '1:1'], correct: 1, sol: 'Aa × Aa gives 1 AA : 2 Aa : 1 aa (genotypic ratio) and 3 dominant : 1 recessive (phenotypic ratio).' },
      { text: 'Which of the following is a sex-linked disorder in humans?', options: ['Cystic fibrosis', 'Haemophilia', 'Sickle-cell anaemia', 'Phenylketonuria'], correct: 1, sol: 'Haemophilia is an X-linked recessive disorder; the others are autosomal recessive conditions.' },
      { text: 'Analogous organs are those that:', options: ['Have the same origin but different function', 'Have different origins but similar function', 'Are always vestigial', 'Occur only in plants'], correct: 1, sol: 'Analogous organs (e.g., wings of insects and birds) have different evolutionary origins but perform similar functions — evidence of convergent evolution.' }
    ]
  },
  'opt-zoology/paper2': {
    html: `<h3>Zoology Paper II — Ecology, Developmental Biology, Cell Biology and Applied Zoology</h3>
<h3>Ecology</h3>
<ul>
<li><strong>Ecosystem:</strong> structure, biotic and abiotic components, energy flow, trophic levels, ecological pyramids.</li>
<li><strong>Biogeochemical cycles:</strong> carbon, nitrogen, phosphorus and water cycles.</li>
<li><strong>Population ecology:</strong> density, natality, mortality, age pyramids, growth models, carrying capacity.</li>
<li><strong>Community ecology:</strong> species interactions (competition, predation, parasitism, mutualism), succession, climax.</li>
<li><strong>Biodiversity and conservation:</strong> hotspots, protected areas, in-situ and ex-situ conservation, IUCN categories.</li>
</ul>
<h3>Developmental Biology</h3>
<ul>
<li><strong>Gametogenesis:</strong> spermatogenesis and oogenesis, hormonal control.</li>
<li><strong>Fertilisation:</strong> acrosomal reaction, cortical reaction, prevention of polyspermy.</li>
<li><strong>Cleavage and gastrulation:</strong> patterns, fate maps, germ layer formation.</li>
<li><strong>Organogenesis and differentiation:</strong> induction, competence, morphogens.</li>
<li><strong>Regeneration and metamorphosis:</strong> epimorphosis, morphallaxis, hormonal control in amphibians and insects.</li>
</ul>
<h3>Cell Biology</h3>
<ul>
<li><strong>Organelles:</strong> mitochondria, chloroplasts, ER, Golgi, lysosomes, peroxisomes, nucleus.</li>
<li><strong>Cell cycle:</strong> interphase, mitosis, meiosis, checkpoints and regulation.</li>
<li><strong>Membrane transport:</strong> diffusion, osmosis, active transport, endocytosis, exocytosis.</li>
<li><strong>Signal transduction:</strong> receptors, G-proteins, second messengers.</li>
<li><strong>Cancer:</strong> oncogenes, tumour suppressor genes, apoptosis, metastasis.</li>
</ul>
<h3>Applied Zoology</h3>
<ul>
<li><strong>Aquaculture:</strong> fish, shrimp and prawn culture; induced breeding; composite fish culture.</li>
<li><strong>Apiculture and sericulture:</strong> bee species, honey production; mulberry and non-mulberry silks.</li>
<li><strong>Poultry and dairy:</strong> breeds, nutrition, disease management.</li>
<li><strong>Pest control:</strong> biological control, integrated pest management, insecticides and resistance.</li>
<li><strong>Biotechnology and wildlife:</strong> transgenic animals, cloning, cryopreservation, wildlife management and Indian conservation programmes.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Ecological Efficiency</div><div class="ex-text">Question: If producers fix 10,000 kcal of energy and primary consumers assimilate 1,000 kcal, find the ecological efficiency.</div><div class="ex-soln">Answer: Ecological efficiency = (energy assimilated at the next trophic level / energy available at the lower level) × 100 = (1000/10000) × 100 = 10%. This illustrates the classic 10% law.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing gross primary productivity with net primary productivity.</li>
<li>Mixing mitosis and meiosis stages and outcomes.</li>
<li>Describing succession without naming seral stages.</li>
<li>Confusing in-situ with ex-situ conservation.</li>
<li>Quoting aquaculture or sericulture data without Indian context.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use flow diagrams for energy flow and biogeochemical cycles, labelled diagrams for development and cell structure, and tables for species interactions. For applied zoology, link practices to Indian schemes and rural livelihoods.</div></div>`,
    qs: [
      { text: 'The 10% law of energy transfer in ecosystems was proposed by:', options: ['Odum', 'Lindeman', 'Tansley', 'Darwin'], correct: 1, sol: 'Raymond Lindeman proposed that only about 10% of energy is transferred from one trophic level to the next.' },
      { text: 'The phase of the cell cycle in which DNA replicates is:', options: ['G1', 'S', 'G2', 'M'], correct: 1, sol: 'DNA synthesis occurs in the S phase; G1 and G2 are gap phases and M is mitosis.' },
      { text: 'The acrosomal reaction is associated with:', options: ['Cleavage', 'Fertilisation', 'Gastrulation', 'Metamorphosis'], correct: 1, sol: 'The acrosome of the sperm releases enzymes that digest the zona pellucida, allowing sperm–egg fusion during fertilisation.' },
      { text: 'In-situ conservation includes:', options: ['Zoos', 'Botanical gardens', 'Biosphere reserves and national parks', 'Seed banks'], correct: 2, sol: 'In-situ conservation protects species in their natural habitats — national parks, wildlife sanctuaries and biosphere reserves; zoos and seed banks are ex-situ.' },
      { text: 'Composite fish culture in India typically involves:', options: ['A single species at high density', 'Several compatible species occupying different feeding niches', 'Only prawns', 'Marine fish only'], correct: 1, sol: 'Composite fish culture stocks surface, column and bottom feeders together (e.g., catla, rohu, mrigal, grass carp) to use all food niches.' }
    ]
  }
};

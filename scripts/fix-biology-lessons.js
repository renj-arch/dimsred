const fs = require('fs');
const path = require('path');

const bioDir = path.join(__dirname, '..', 'neet', 'course', 'biology');

const JS_SNIPPET = `
<h3 style="margin-top:24px;margin-bottom:12px;font-size:1.1em">Practice Questions</h3>
<div id="practice-qs"></div>
<div style="display:flex;gap:10px;margin-top:10px">
    <button onclick="resetPractice()" class="btn btn-primary">Reset</button>
    <button onclick="markComplete()" class="btn btn-success" id="complete-btn">Mark Lesson Complete</button>
</div>
<script>
var practiceQs = PRACTICE_QS;
var answered={},correctCount=0,lessonSlug="SLUG";
function renderPractice(){var c=document.getElementById("practice-qs"),h="";if(!practiceQs||!practiceQs.length){h="<p style=\\"color:var(--text-muted);font-size:.85em\\">Practice questions loading...</p>"}else{for(var i=0;i<practiceQs.length;i++){var q=practiceQs[i],o="";for(var j=0;j<q.options.length;j++){o+="<div class=\\"q-opt\\" data-qid=\\""+q.id+"\\" data-idx=\\""+j+"\\" onclick=\\"selectOpt("+q.id+","+j+")\\">"+q.options[j].l+". "+q.options[j].t+"</div>"}h+="<div class=\\"q-card\\" id=\\"q-"+q.id+"\\"><div class=\\"q-text\\">"+(i+1)+". "+q.text+"</div><div class=\\"q-opts\\">"+o+"</div><div class=\\"q-soln\\" id=\\"soln-"+q.id+"\\"><strong>Correct: "+getCL(q)+"</strong><br>"+q.sol+"</div><div class=\\"q-result\\" id=\\"result-"+q.id+"\\"></div></div>"}}c.innerHTML=h;updateProgress()}
function getCL(q){for(var i=0;i<q.options.length;i++){if(q.options[i].c)return q.options[i].l+". "+q.options[i].t}return""}
function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=practiceQs.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll("#q-"+qId+" .q-opt");var cr=q.options[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add("disabled");if(cr){opts[idx].classList.add("correct");document.getElementById("result-"+qId).textContent="✓ Correct";correctCount++}else{opts[idx].classList.add("wrong");document.getElementById("result-"+qId).textContent="✗ Wrong";for(var i=0;i<q.options.length;i++){if(q.options[i].c)opts[i].classList.add("correct")}}document.getElementById("soln-"+qId).classList.add("show");updateProgress()}
function updateProgress(){var t=Object.keys(answered).length;var s=document.getElementById("score-display");if(!s){s=document.createElement("div");s.id="score-display";s.style.cssText="font-size:.85em;color:var(--text-sec);margin-bottom:10px";document.getElementById("practice-qs").before(s)}s.textContent="Attempted: "+t+"/"+(practiceQs.length||0)+" | Correct: "+correctCount+" | Accuracy: "+(t>0?Math.round(correctCount/t*100):0)+"%"}
function resetPractice(){if(!confirm("Reset all answers?"))return;answered={};correctCount=0;document.querySelectorAll("#practice-qs .q-opt").forEach(function(e){e.className="q-opt"});document.querySelectorAll("#practice-qs .q-soln").forEach(function(e){e.classList.remove("show")});document.querySelectorAll("#practice-qs .q-result").forEach(function(e){e.textContent="";e.className="q-result"});var s=document.getElementById("score-display");if(s)s.textContent="";renderPractice()}
function markComplete(){try{var done=JSON.parse(localStorage.getItem("neet-course-done")||"[]");if(done.indexOf(lessonSlug)===-1){done.push(lessonSlug);localStorage.setItem("neet-course-done",JSON.stringify(done));document.getElementById("complete-btn").textContent="✓ Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){alert("Progress saved locally")}}
renderPractice();
try{var done=JSON.parse(localStorage.getItem("neet-course-done")||"[]");if(done.indexOf(lessonSlug)!==-1){document.getElementById("complete-btn").textContent="✓ Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){}
</script>`;

const LESSON_DATA = {
  'cell-biology': {
    slug: 'cell-biology',
    qs: [
      {id:30001,text:'Which scientist first observed living cells?',options:[{l:'a',t:'Robert Hooke',c:false},{l:'b',t:'Antonie van Leeuwenhoek',c:true},{l:'c',t:'Matthias Schleiden',c:false},{l:'d',t:'Rudolf Virchow',c:false}],sol:'Van Leeuwenhoek first observed living cells (bacteria, protozoa) using his single-lens microscope in the 1670s.'},
      {id:30002,text:'Which organelle modifies, sorts, and packages proteins?',options:[{l:'a',t:'Rough ER',c:false},{l:'b',t:'Smooth ER',c:false},{l:'c',t:'Golgi apparatus',c:true},{l:'d',t:'Lysosome',c:false}],sol:'The Golgi apparatus modifies, sorts, and packages proteins into vesicles for transport to their final destinations.'},
      {id:30003,text:'Which is the site of protein synthesis?',options:[{l:'a',t:'Nucleus',c:false},{l:'b',t:'Ribosome',c:true},{l:'c',t:'Mitochondria',c:false},{l:'d',t:'Golgi apparatus',c:false}],sol:'Ribosomes, composed of rRNA and proteins, are the site of protein synthesis (translation) in all cells.'},
      {id:30004,text:'During which phase of mitosis do chromosomes align at the equator?',options:[{l:'a',t:'Prophase',c:false},{l:'b',t:'Metaphase',c:true},{l:'c',t:'Anaphase',c:false},{l:'d',t:'Telophase',c:false}],sol:'In metaphase, chromosomes align at the metaphase plate (equatorial plane) for equal distribution to daughter cells.'},
      {id:30005,text:'Which enzyme breaks down hydrogen peroxide?',options:[{l:'a',t:'Catalase',c:true},{l:'b',t:'Trypsin',c:false},{l:'c',t:'Amylase',c:false},{l:'d',t:'Lipase',c:false}],sol:'Catalase, found in peroxisomes, breaks down H2O2 into H2O and O2, protecting cells from oxidative damage.'},
      {id:30006,text:'Which of the following is NOT membrane-bound?',options:[{l:'a',t:'Nucleus',c:false},{l:'b',t:'Mitochondria',c:false},{l:'c',t:'Ribosome',c:true},{l:'d',t:'Lysosome',c:false}],sol:'Ribosomes are non-membrane-bound organelles. They are composed of rRNA and proteins and can be free in cytoplasm or attached to RER.'},
      {id:30007,text:'The fluid mosaic model of cell membrane was proposed by:',options:[{l:'a',t:'Singer and Nicolson',c:true},{l:'b',t:'Watson and Crick',c:false},{l:'c',t:'Robert Brown',c:false},{l:'d',t:'Camillo Golgi',c:false}],sol:'Singer and Nicolson (1972) proposed the fluid mosaic model where proteins are embedded in a phospholipid bilayer.'},
      {id:30008,text:'How many chromosomes are present in a human somatic cell?',options:[{l:'a',t:'23',c:false},{l:'b',t:'46',c:true},{l:'c',t:'48',c:false},{l:'d',t:'44',c:false}],sol:'Human somatic cells have 46 chromosomes (23 pairs). Gametes have 23 chromosomes (haploid).'},
      {id:30009,text:'Which organelle is responsible for ATP production?',options:[{l:'a',t:'Golgi body',c:false},{l:'b',t:'Mitochondria',c:true},{l:'c',t:'Rough ER',c:false},{l:'d',t:'Chloroplast',c:false}],sol:'Mitochondria are the powerhouses of the cell, producing ATP through oxidative phosphorylation via the electron transport chain.'},
      {id:30010,text:'The semi-fluid matrix inside the nucleus is called:',options:[{l:'a',t:'Cytoplasm',c:false},{l:'b',t:'Nucleoplasm',c:true},{l:'c',t:'Cytosol',c:false},{l:'d',t:'Stroma',c:false}],sol:'Nucleoplasm is the semi-fluid matrix inside the nucleus containing chromatin, nucleolus, and nuclear matrix.'},
    ]
  },
  'genetics-evolution': {
    slug: 'genetics-evolution',
    qs: [
      {id:31001,text:'Who is known as the father of genetics?',options:[{l:'a',t:'Charles Darwin',c:false},{l:'b',t:'Gregor Mendel',c:true},{l:'c',t:'T.H. Morgan',c:false},{l:'d',t:'Watson',c:false}],sol:'Gregor Mendel (1822-1884) is the father of genetics. His experiments on pea plants established the laws of inheritance.'},
      {id:31002,text:'In Mendel\'s monohybrid cross, the phenotypic ratio in F2 generation is:',options:[{l:'a',t:'1:2:1',c:false},{l:'b',t:'3:1',c:true},{l:'c',t:'9:3:3:1',c:false},{l:'d',t:'1:1',c:false}],sol:'In a monohybrid cross, the F2 phenotypic ratio is 3:1 (dominant:recessive). The genotypic ratio is 1:2:1.'},
      {id:31003,text:'ABO blood group system is an example of:',options:[{l:'a',t:'Incomplete dominance',c:false},{l:'b',t:'Co-dominance',c:false},{l:'c',t:'Multiple alleles',c:true},{l:'d',t:'Pleiotropy',c:false}],sol:'ABO blood groups are determined by three alleles (IA, IB, i) — making it a multiple allelic system. IA and IB are co-dominant, both dominant over i.'},
      {id:31004,text:'The DNA polymerase used in PCR is obtained from:',options:[{l:'a',t:'E. coli',c:false},{l:'b',t:'Thermus aquaticus',c:true},{l:'c',t:'Bacillus subtilis',c:false},{l:'d',t:'Agrobacterium',c:false}],sol:'Taq polymerase from Thermus aquaticus is heat-stable and used in PCR. It remains active at the high denaturation temperature (95°C).'},
      {id:31005,text:'The Hardy-Weinberg equilibrium is affected by:',options:[{l:'a',t:'Random mating',c:false},{l:'b',t:'Large population size',c:false},{l:'c',t:'Natural selection',c:true},{l:'d',t:'No migration',c:false}],sol:'Natural selection disrupts Hardy-Weinberg equilibrium by favouring certain alleles. HW requires no selection, no mutation, no migration, random mating, and large population.'},
      {id:31006,text:'Which nitrogen base is present in RNA but not in DNA?',options:[{l:'a',t:'Adenine',c:false},{l:'b',t:'Thymine',c:false},{l:'c',t:'Uracil',c:true},{l:'d',t:'Cytosine',c:false}],sol:'RNA contains uracil (U) instead of thymine (T). Uracil pairs with adenine during transcription and translation.'},
      {id:31007,text:'The operon model of gene regulation was proposed by:',options:[{l:'a',t:'Watson and Crick',c:false},{l:'b',t:'Jacob and Monod',c:true},{l:'c',t:'Kornberg',c:false},{l:'d',t:'Nirenberg',c:false}],sol:'Jacob and Monod (1961) proposed the lac operon model for gene regulation in bacteria. It consists of structural genes, promoter, operator, and regulator.'},
      {id:31008,text:'Down syndrome is caused by trisomy of chromosome:',options:[{l:'a',t:'18',c:false},{l:'b',t:'13',c:false},{l:'c',t:'21',c:true},{l:'d',t:'X',c:false}],sol:'Down syndrome (trisomy 21) is caused by an extra copy of chromosome 21. It results in intellectual disability, characteristic facial features, and heart defects.'},
      {id:31009,text:'Which scientist proposed the theory of natural selection?',options:[{l:'a',t:'Lamarck',c:false},{l:'b',t:'Darwin',c:true},{l:'c',t:'Mendel',c:false},{l:'d',t:'Wallace',c:false}],sol:'Charles Darwin (1809-1882) proposed natural selection as the mechanism of evolution in his book "On the Origin of Species" (1859).'},
      {id:31010,text:'The Central Dogma of molecular biology is:',options:[{l:'a',t:'RNA → DNA → Protein',c:false},{l:'b',t:'DNA → RNA → Protein',c:true},{l:'c',t:'Protein → RNA → DNA',c:false},{l:'d',t:'DNA → Protein → RNA',c:false}],sol:'Central Dogma (Crick, 1958): genetic information flows from DNA → RNA (transcription) → Protein (translation).'},
    ]
  },
  'plant-physiology': {
    slug: 'plant-physiology',
    qs: [
      {id:32001,text:'The correct sequence of electron transport in non-cyclic photophosphorylation is:',options:[{l:'a',t:'PS I → PS II → NADP+',c:false},{l:'b',t:'PS II → PQ → Cyt b6f → PC → PS I → Fd → NADP+',c:true},{l:'c',t:'PS I → Fd → PQ → PS II',c:false},{l:'d',t:'PS II → Fd → PS I → NADP+',c:false}],sol:'Non-cyclic electron flow: PS II → Pheophytin → PQ → Cyt b6f → PC → PS I → Fd → FNR → NADP+.'},
      {id:32002,text:'In C4 plants, the primary CO2 acceptor is:',options:[{l:'a',t:'Phosphoenolpyruvate (PEP)',c:true},{l:'b',t:'RuBP',c:false},{l:'c',t:'Oxaloacetate',c:false},{l:'d',t:'3-PGA',c:false}],sol:'In C4 plants, PEP carboxylase fixes CO2 with PEP (3C) to form OAA (4C) in mesophyll cells.'},
      {id:32003,text:'Which plant hormone causes stomatal closure during water stress?',options:[{l:'a',t:'Auxin',c:false},{l:'b',t:'Abscisic acid',c:true},{l:'c',t:'Gibberellin',c:false},{l:'d',t:'Cytokinin',c:false}],sol:'ABA triggers Ca2+ influx into guard cells, activating K+ efflux channels, reducing turgor, and closing stomata.'},
      {id:32004,text:'The oxygen evolved during photosynthesis comes from:',options:[{l:'a',t:'Water (H2O)',c:true},{l:'b',t:'Carbon dioxide (CO2)',c:false},{l:'c',t:'RuBP',c:false},{l:'d',t:'Glucose',c:false}],sol:'Oxygen comes from water during photolysis at the oxygen-evolving complex of PS II (Ruben & Kamen, 1941).'},
      {id:32005,text:'RuBisCO enzyme is found in:',options:[{l:'a',t:'Cytoplasm',c:false},{l:'b',t:'Thylakoid membrane',c:false},{l:'c',t:'Stroma of chloroplast',c:true},{l:'d',t:'Inner mitochondrial membrane',c:false}],sol:'RuBisCO is located in the stroma of chloroplasts, catalysing carboxylation of RuBP in the Calvin cycle.'},
      {id:32006,text:'Which hormone primarily promotes cell division?',options:[{l:'a',t:'Auxin',c:false},{l:'b',t:'Gibberellin',c:false},{l:'c',t:'Cytokinin',c:true},{l:'d',t:'Ethylene',c:false}],sol:'Cytokinins promote cytokinesis (cell division) and shoot initiation in tissue culture.'},
      {id:32007,text:'The cofactor required for nitrogenase enzyme is:',options:[{l:'a',t:'Calcium',c:false},{l:'b',t:'Zinc',c:false},{l:'c',t:'Molybdenum',c:true},{l:'d',t:'Copper',c:false}],sol:'Nitrogenase is a Mo-Fe protein. It requires 16 ATP to fix one N2 molecule into two NH3 molecules.'},
      {id:32008,text:'In the pressure flow hypothesis, phloem sap moves due to:',options:[{l:'a',t:'Water potential gradient',c:false},{l:'b',t:'Hydrostatic pressure gradient',c:true},{l:'c',t:'Solute concentration gradient',c:false},{l:'d',t:'Temperature gradient',c:false}],sol:'Sap flows from high hydrostatic pressure (source) to low pressure (sink) due to osmotic water movement.'},
      {id:32009,text:'CAM plants fix CO2:',options:[{l:'a',t:'During the day in mesophyll',c:false},{l:'b',t:'At night as malate',c:true},{l:'c',t:'In bundle sheath cells',c:false},{l:'d',t:'Only in the light',c:false}],sol:'CAM plants open stomata at night to fix CO2 into malate, stored in vacuoles and used during the day.'},
      {id:32010,text:'The end-product of glycolysis is:',options:[{l:'a',t:'Acetyl-CoA',c:false},{l:'b',t:'Pyruvate',c:true},{l:'c',t:'Lactate',c:false},{l:'d',t:'Ethanol',c:false}],sol:'Glycolysis breaks one glucose (6C) into two pyruvate (3C) molecules in the cytoplasm, producing net 2 ATP and 2 NADH.'},
    ]
  },
  'human-physiology': {
    slug: 'human-physiology',
    qs: [
      {id:33001,text:'The correct sequence of the alimentary canal is:',options:[{l:'a',t:'Mouth → Oesophagus → Pharynx → Stomach → Small intestine',c:false},{l:'b',t:'Mouth → Pharynx → Oesophagus → Stomach → Small intestine',c:true},{l:'c',t:'Mouth → Oesophagus → Stomach → Pharynx → Small intestine',c:false},{l:'d',t:'Mouth → Stomach → Oesophagus → Pharynx → Small intestine',c:false}],sol:'The correct sequence: Mouth → Pharynx → Oesophagus → Stomach → Small intestine → Large intestine.'},
      {id:33002,text:'The partial pressure of oxygen in alveolar air is approximately:',options:[{l:'a',t:'40 mmHg',c:false},{l:'b',t:'60 mmHg',c:false},{l:'c',t:'104 mmHg',c:true},{l:'d',t:'150 mmHg',c:false}],sol:'Alveolar PO2 is ~104 mmHg. Atmospheric PO2 is ~160 mmHg; it decreases as air is humidified and mixed with alveolar CO2.'},
      {id:33003,text:'The hormone that increases blood calcium by stimulating osteoclasts is:',options:[{l:'a',t:'Calcitonin',c:false},{l:'b',t:'Parathyroid hormone',c:true},{l:'c',t:'Thyroxine',c:false},{l:'d',t:'Vitamin D',c:false}],sol:'PTH increases blood Ca2+ by osteoclast activation, renal Ca2+ reabsorption, and vitamin D activation.'},
      {id:33004,text:'Which WBC is responsible for phagocytosis of bacteria?',options:[{l:'a',t:'Lymphocyte',c:false},{l:'b',t:'Neutrophil',c:true},{l:'c',t:'Basophil',c:false},{l:'d',t:'Platelet',c:false}],sol:'Neutrophils (40-70% of WBCs) are the primary phagocytes for bacteria. Basophils release histamine.'},
      {id:33005,text:'The countercurrent multiplier in the kidney is located in the:',options:[{l:'a',t:'PCT',c:false},{l:'b',t:'Loop of Henle',c:true},{l:'c',t:'DCT',c:false},{l:'d',t:'Collecting duct',c:false}],sol:'The loop of Henle, especially the thick ascending limb, acts as a countercurrent multiplier creating the medullary gradient.'},
      {id:33006,text:'The pacemaker of the heart is the:',options:[{l:'a',t:'AV node',c:false},{l:'b',t:'SA node',c:true},{l:'c',t:'Purkinje fibres',c:false},{l:'d',t:'Bundle of His',c:false}],sol:'The SA node (sinoatrial node) in the right atrium is the natural pacemaker, generating ~72 impulses per minute.'},
      {id:33007,text:'Which part of the brain controls balance and coordination?',options:[{l:'a',t:'Cerebrum',c:false},{l:'b',t:'Cerebellum',c:true},{l:'c',t:'Medulla oblongata',c:false},{l:'d',t:'Thalamus',c:false}],sol:'The cerebellum coordinates voluntary movements, balance, and muscle tone. It receives input from proprioceptors.'},
      {id:33008,text:'The hormone that lowers blood glucose is:',options:[{l:'a',t:'Glucagon',c:false},{l:'b',t:'Insulin',c:true},{l:'c',t:'Cortisol',c:false},{l:'d',t:'Adrenaline',c:false}],sol:'Insulin (from β-cells of pancreas) lowers blood glucose by promoting cellular uptake and glycogenesis.'},
      {id:33009,text:'Bile is produced by the:',options:[{l:'a',t:'Gall bladder',c:false},{l:'b',t:'Liver',c:true},{l:'c',t:'Pancreas',c:false},{l:'d',t:'Stomach',c:false}],sol:'Bile is produced by hepatocytes (liver cells), stored in the gall bladder, and released into the duodenum for fat emulsification.'},
      {id:33010,text:'The structural and functional unit of the kidney is the:',options:[{l:'a',t:'Neuron',c:false},{l:'b',t:'Nephron',c:true},{l:'c',t:'Alveolus',c:false},{l:'d',t:'Cilia',c:false}],sol:'The nephron is the functional unit of the kidney. Each kidney has ~1 million nephrons for blood filtration and urine formation.'},
    ]
  },
  'ecology': {
    slug: 'ecology',
    qs: [
      {id:34001,text:'The pyramid of energy in an ecosystem is always:',options:[{l:'a',t:'Inverted',c:false},{l:'b',t:'Upright',c:true},{l:'c',t:'Sometimes upright, sometimes inverted',c:false},{l:'d',t:'Spindle-shaped',c:false}],sol:'The pyramid of energy is always upright because energy decreases at each trophic level (10% law).'},
      {id:34002,text:'Azotobacter is a:',options:[{l:'a',t:'Symbiotic N2-fixer',c:false},{l:'b',t:'Free-living N2-fixing bacterium',c:true},{l:'c',t:'Nitrifying bacterium',c:false},{l:'d',t:'Denitrifying bacterium',c:false}],sol:'Azotobacter is a free-living aerobic nitrogen-fixing bacterium. Rhizobium is symbiotic; Nitrosomonas and Nitrobacter are nitrifiers.'},
      {id:34003,text:'Which gas is both a greenhouse gas and causes ozone depletion?',options:[{l:'a',t:'CO2',c:false},{l:'b',t:'CH4',c:false},{l:'c',t:'N2O',c:false},{l:'d',t:'CFCs',c:true}],sol:'CFCs are greenhouse gases AND deplete stratospheric ozone by releasing chlorine that catalytically destroys O3.'},
      {id:34004,text:'Competitive exclusion principle states that two species cannot coexist if they:',options:[{l:'a',t:'Occupy the same niche',c:true},{l:'b',t:'Have different predators',c:false},{l:'c',t:'Occupy different habitats',c:false},{l:'d',t:'Are both predators',c:false}],sol:'Gause\'s principle: two species competing for the same limited resource cannot coexist indefinitely.'},
      {id:34005,text:'The transition zone of a biosphere reserve allows:',options:[{l:'a',t:'No human activity',c:false},{l:'b',t:'Only research',c:false},{l:'c',t:'Sustainable human activities',c:true},{l:'d',t:'Industrial development',c:false}],sol:'Transition zone: sustainable activities (agroforestry, settlements). Core: strictly protected. Buffer: research and education.'},
      {id:34006,text:'Biodegradable pollutants are:',options:[{l:'a',t:'DDT',c:false},{l:'b',t:'Plastic',c:false},{l:'c',t:'Sewage',c:true},{l:'d',t:'Mercury',c:false}],sol:'Sewage is biodegradable (decomposed by microorganisms). DDT, plastic, and mercury are non-biodegradable.'},
      {id:34007,text:'The 10% law of energy transfer was given by:',options:[{l:'a',t:'Odum',c:false},{l:'b',t:'Lindeman',c:true},{l:'c',t:'Tansley',c:false},{l:'d',t:'Elton',c:false}],sol:'Lindeman (1942) proposed the 10% law: only ~10% of energy is transferred from one trophic level to the next.'},
      {id:34008,text:'National parks come under which type of conservation?',options:[{l:'a',t:'Ex situ',c:false},{l:'b',t:'In situ',c:true},{l:'c',t:'Both',c:false},{l:'d',t:'Artificial',c:false}],sol:'National parks, wildlife sanctuaries, and biosphere reserves are in situ conservation (protecting species in their natural habitat).'},
      {id:34009,text:'The zone of a lake with rooted vegetation is called:',options:[{l:'a',t:'Littoral zone',c:true},{l:'b',t:'Limnetic zone',c:false},{l:'c',t:'Profundal zone',c:false},{l:'d',t:'Benthic zone',c:false}],sol:'Littoral zone: shallow, rooted vegetation. Limnetic: open water, phytoplankton. Profundal: deep, no light. Benthic: bottom.'},
      {id:34010,text:'The species diversity of a community is measured by:',options:[{l:'a',t:'Simpson\'s index',c:false},{l:'b',t:'Shannon-Weiner index',c:true},{l:'c',t:'Species richness only',c:false},{l:'d',t:'Evenness only',c:false}],sol:'Shannon-Weiner index (H) considers both species richness and evenness. Higher H = greater diversity.'},
    ]
  },
  'biotech': {
    slug: 'biotech',
    qs: [
      {id:35001,text:'Restriction enzymes were discovered by:',options:[{l:'a',t:'Kary Mullis',c:false},{l:'b',t:'Arber, Smith, and Nathans',c:true},{l:'c',t:'Jacob and Monod',c:false},{l:'d',t:'Sanger',c:false}],sol:'Arber (restriction enzymes), Smith (HindII), and Nathans (first use of RE for DNA mapping) shared the 1978 Nobel Prize.'},
      {id:35002,text:'The vector used in gene cloning is usually:',options:[{l:'a',t:'Virus',c:false},{l:'b',t:'Plasmid',c:true},{l:'c',t:'Bacteriophage',c:false},{l:'d',t:'Cosmid',c:false}],sol:'Plasmids are the most common cloning vectors — small circular DNA with ori, selectable marker, and MCS.'},
      {id:35003,text:'PCR technique was invented by:',options:[{l:'a',t:'Arber',c:false},{l:'b',t:'Kary Mullis',c:true},{l:'c',t:'Kornberg',c:false},{l:'d',t:'Nathans',c:false}],sol:'Kary Mullis invented PCR in 1983 (Nobel Prize 1993). It amplifies target DNA using Taq polymerase.'},
      {id:35004,text:'Golden Rice is enriched in:',options:[{l:'a',t:'Vitamin A',c:false},{l:'b',t:'Beta-carotene',c:true},{l:'c',t:'Iron',c:false},{l:'d',t:'Protein',c:false}],sol:'Golden Rice contains beta-carotene (pro-vitamin A) genes from daffodil and Erwinia, addressing vitamin A deficiency.'},
      {id:35005,text:'ELISA is used to detect:',options:[{l:'a',t:'DNA',c:false},{l:'b',t:'RNA',c:false},{l:'c',t:'Antigen or antibody',c:true},{l:'d',t:'Lipids',c:false}],sol:'ELISA (Enzyme-Linked Immunosorbent Assay) detects antigens or antibodies using enzyme-substrate colour change.'},
      {id:35006,text:'Bt toxin is produced by:',options:[{l:'a',t:'Bacillus subtilis',c:false},{l:'b',t:'Bacillus thuringiensis',c:true},{l:'c',t:'E. coli',c:false},{l:'d',t:'Pseudomonas',c:false}],sol:'Bt (Bacillus thuringiensis) produces Cry proteins that are toxic to insects but safe for mammals.'},
      {id:35007,text:'The first recombinant DNA technology product was:',options:[{l:'a',t:'Insulin',c:true},{l:'b',t:'Growth hormone',c:false},{l:'c',t:'Interferon',c:false},{l:'d',t:'Vaccine',c:false}],sol:'Humulin (recombinant human insulin) was the first rDNA therapeutic product, approved in 1982 by Eli Lilly.'},
      {id:35008,text:'The enzyme used to join DNA fragments is:',options:[{l:'a',t:'Restriction endonuclease',c:false},{l:'b',t:'DNA ligase',c:true},{l:'c',t:'DNA polymerase',c:false},{l:'d',t:'Reverse transcriptase',c:false}],sol:'DNA ligase seals the gap between DNA fragments by forming phosphodiester bonds, used in recombinant DNA technology.'},
      {id:35009,text:'Section 3(d) of Indian Patent Act is related to:',options:[{l:'a',t:'Product patents',c:false},{l:'b',t:'Preventing evergreening',c:true},{l:'c',t:'Compulsory licensing',c:false},{l:'d',t:'Plant variety protection',c:false}],sol:'Section 3(d) prevents evergreening by requiring new forms of known substances to demonstrate enhanced efficacy.'},
      {id:35010,text:'RNA interference involves silencing of:',options:[{l:'a',t:'DNA replication',c:false},{l:'b',t:'Transcription',c:false},{l:'c',t:'Specific mRNA',c:true},{l:'d',t:'Translation initiation',c:false}],sol:'RNAi uses siRNA or miRNA to degrade specific mRNA or block its translation, silencing gene expression.'},
    ]
  }
};

const files = [
  { name: 'lesson-cell-biology.html', key: 'cell-biology' },
  { name: 'lesson-genetics-evolution.html', key: 'genetics-evolution' },
  { name: 'lesson-plant-physiology.html', key: 'plant-physiology' },
  { name: 'lesson-human-physiology.html', key: 'human-physiology' },
  { name: 'lesson-ecology.html', key: 'ecology' },
  { name: 'lesson-biotech.html', key: 'biotech' },
];

files.forEach(f => {
  const filePath = path.join(bioDir, f.name);
  let html = fs.readFileSync(filePath, 'utf-8');
  const data = LESSON_DATA[f.key];
  const qsJson = JSON.stringify(data.qs);
  const jsBlock = JS_SNIPPET
    .replace('PRACTICE_QS', qsJson)
    .replace('"SLUG"', '"' + data.slug + '"');

  if (f.key === 'plant-physiology') {
    // This file has content after </html> — restructure it
    const htmlEnd = html.indexOf('</html>');
    const beforeClose = html.substring(0, htmlEnd);
    const afterClose = html.substring(htmlEnd + 7);

    // Remove the premature closing structure
    // Find the pattern: </div>\n    </div>\n    \n    </div>\n    <script> ... </script>\n</body>\n</html>
    // And all content after </html>

    // Find the old practice section end and nav links
    const oldPracticeEnd = beforeClose.lastIndexOf('<div style="display:flex;justify-content:space-between');
    if (oldPracticeEnd >= 0) {
      const mainContent = beforeClose.substring(0, oldPracticeEnd);
      const reorgHtml = mainContent + afterClose;

      // Now find the end of all lesson-body content (last closing of lesson-body)
      // We need to add the practice section after all theory content
      const practiceInsertPoint = reorgHtml.lastIndexOf('</div>') + 6;

      const beforePractice = reorgHtml.substring(0, practiceInsertPoint);
      const afterPractice = reorgHtml.substring(practiceInsertPoint);
      html = beforePractice + jsBlock + afterPractice;
    } else {
      html = beforeClose + afterClose + jsBlock;
    }
  } else {
    // Normal files: find the old practice section and replace it
    // Patterns to detect old practice sections:
    const patterns = [
      { start: /<h[23][^>]*>Practice Questions[^<]*<\/h[23]>/i, end: /<div style="display:flex;justify-content:space-between/i },
      { start: /<h[23][^>]*>Practice MCQs[^<]*<\/h[23]>/i, end: /<div style="display:flex;justify-content:space-between/i },
      { start: /<h[23][^>]*>Additional Practice Questions[^<]*<\/h[23]>/i, end: /<div style="display:flex;justify-content:space-between/i },
    ];

    let replaced = false;
    for (const p of patterns) {
      const startMatch = html.match(p.start);
      if (startMatch) {
        const startIdx = startMatch.index;
        const rest = html.substring(startIdx);
        const endMatch = rest.match(p.end);
        if (endMatch) {
          const endIdx = startIdx + endMatch.index;
          const beforeSection = html.substring(0, startIdx);
          const afterSection = html.substring(endIdx);
          html = beforeSection + jsBlock + afterSection;
          replaced = true;
          break;
        }
      }
    }

    if (!replaced) {
      // If no practice section found, insert before the nav links at end
      const navMatch = html.match(/<div style="display:flex;justify-content:space-between/i);
      if (navMatch) {
        const beforeNav = html.substring(0, navMatch.index);
        const afterNav = html.substring(navMatch.index);
        html = beforeNav + jsBlock + afterNav;
      } else {
        // Insert before </body>
        html = html.replace('</body>', jsBlock + '\n</body>');
      }
    }
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log('Fixed: ' + f.name);
});

console.log('Done! All 6 biology lessons updated.');

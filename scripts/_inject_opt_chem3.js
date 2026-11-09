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
    id: 3801 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-chemistry/paper3', `<h3>Chemistry Paper III — Analytical Chemistry & Modern Topics</h3>
<h3>Analytical Chemistry</h3>
<ul>
<li><strong>Qualitative Analysis:</strong> Qualitative analysis - identification of cations and anions, dry tests, wet tests, confirmatory tests.</li>
<li><strong>Qualitative Analysis:</strong> Systematic analysis of mixtures, separation of cations into groups, confirmatory tests for cations and anions.</li>
<li><strong>Quantitative Analysis:</strong> Gravimetric analysis - precipitation gravimetry, volumetric analysis - titration methods (acid-base, redox, complexometric, precipitation).</li>
<li><strong>Electroanalytical Methods:</strong> Potentiometry, conductometry, polarography, amperometry, coulometry.</li>
<li><strong>Spectroscopic Methods:</strong> UV-Visible spectroscopy, IR spectroscopy, NMR spectroscopy, Mass spectrometry, Atomic absorption spectroscopy (AAS), Atomic emission spectroscopy, Atomic fluorescence spectroscopy, X-ray spectroscopy (XRF, XPS), Electron paramagnetic resonance (EPR), Nuclear magnetic resonance (NMR), Electron spin resonance (ESR).</li>
<li><strong>Chromatography:</strong> Paper chromatography, Paper chromatography, Thin layer chromatography (TLC), Column chromatography, Paper chromatography, Gas chromatography (GC), Gas chromatography-mass spectrometry (GC-MS), High performance liquid chromatography (HPLC), Ion exchange chromatography, Gel electrophoresis, Capillary electrophoresis.</li>
<li><strong>Thermal Analysis:</strong> Thermogravimetric analysis (TGA), Differential thermal analysis (DTA), Differential scanning calorimetry (DSC), Thermogravimetric analysis (TGA), Thermogravimetric analysis (TGA).</li>
<li><strong>Radioanalytical Chemistry:</strong> Radioactive decay, half-life, radioactive dating, tracer techniques, neutron activation analysis (NAA), Neutron activation analysis (NAA), X-ray fluorescence (XRF), Particle induced X-ray emission (PIXE), Particle induced gamma emission (PIXE).</li>
<li><strong>Electroanalytical Techniques:</strong> Potentiometry, Conductometry, Coulometry, Amperometry, Voltammetry, Polarography, Anodic stripping voltammetry (ASV), Stripping voltammetry.</li>
</ul>
<h3>Environmental Chemistry</h3>
<ul>
<li><strong>Environmental Chemistry:</strong> Environmental segments - atmosphere, hydrosphere, lithosphere, biosphere.</li>
<li><strong>Atmospheric Chemistry:</strong> Atmospheric structure, atmospheric chemistry, air pollution (primary pollutants, secondary pollutants), Photochemical smog, Acid rain, Ozone layer depletion, Montreal Protocol, Montreal Protocol, Montreal Protocol.</li>
<li><strong>Water Chemistry:</strong> Water quality parameters, Water quality parameters (pH, DO, BOD, COD, TDS, TSS), Water treatment (coagulation, flocculation, sedimentation, filtration, disinfection), Water pollution (point source, non-point source), Eutrophication.</li>
<li><strong>Soil Chemistry:</strong> Soil composition, soil formation, soil profile, soil pH, soil organic matter, soil organic matter, soil pollution, soil contamination, heavy metals in soil, heavy metal contamination, bioremediation, phytoremediation.</li>
<li><strong>Green Chemistry:</strong> Green chemistry principles (12 principles), Green chemistry principles, Atom economy, E-factor, Atom economy, Renewable feedstocks, Biodegradable polymers, Biodegradable polymers, Green solvents, Supercritical fluids, Supercritical fluid extraction (SFE), Supercritical fluid extraction (SFE), Supercritical CO2 extraction.</li>
<li><strong>Environmental Analysis:</strong> Environmental monitoring, Environmental monitoring (air, water, soil), Bioindicators, Bioindicators, Bioindicators, Bioindicators, Bioindicators.</li>
<li><strong>Nuclear Chemistry:</strong> Nuclear chemistry, Radioactivity, Radioactive decay, Radioactive decay series, Nuclear reactions, Nuclear fission, Nuclear fusion, Nuclear fusion, Nuclear fusion reactors, Nuclear waste management, Radioactive waste management, Radioactive waste disposal, Geological disposal, Deep geological repositories.</li>
</ul>
<h3>Bioinorganic Chemistry</h3>
<ul>
<li><strong>Bioinorganic Chemistry:</strong> Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry.</li>
<li><strong>Metalloenzymes:</strong> Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes, Metalloenzymes.</li>
<li><strong>Bioinorganic Chemistry:</strong> Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry, Bioinorganic chemistry.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: Beer-Lambert Law</div><div class="ex-text">Question: Calculate the absorbance of a 0.005 M solution of a compound with molar absorptivity ε = 2500 L·mol⁻¹cm⁻¹ in a 1 cm cuvette.</div><div class="ex-soln">Answer: Beer-Lambert Law: A = εcl = 2500 × 0.005 × 1 = 12.5. Absorbance A = 12.5 (dimensionless).</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Electromagnetic Spectrum Order:</strong> Radio waves &lt; Microwaves &amp;lt; Infrared &amp;lt; Visible &amp;lt; UV &amp;lt; UV &amp;lt; X-rays &amp;lt; Gamma rays (increasing energy, decreasing wavelength).</li>
<li><strong>NMR Chemical Shifts:</strong> TMS (tetramethylsilane) = 0 ppm reference; alkyl protons ~0.9-1.5 ppm; alkene protons ~4.5-6.5 ppm; aromatic protons 6.5-8.5 ppm; aldehyde protons 9-10 ppm; carboxylic acid protons 10-12 ppm.</li>
<li><strong>NMR Splitting:</strong> n+1 rule: number of neighboring equivalent protons + 1 = number of peaks (multiplicity).</li>
<li><strong>IR Characteristic Absorptions:</strong> O-H stretch ~3200-3600 cm⁻¹ (broad), C=O stretch ~1700-1750 cm⁻¹ (strong), C-H stretch ~2850-3000 cm⁻¹, N-H stretch ~3300-3500 cm⁻¹, C=O stretch ~1700-1750 cm⁻¹.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Chemistry answers: draw structures, show reaction mechanisms step by step, write balanced chemical equations, cite IUPAC names, mention reaction conditions (catalysts, temperature, pressure). Quote standard textbooks (J.D. Lee for inorganic chemistry, Morrison &amp; Boyd for organic chemistry, P. Bahadur for physical chemistry), quote standard data (bond energies, bond lengths, bond angles, lattice energies, standard electrode potentials).</div></div>`, [
  {
    text: "Which of the following is a strong field ligand?",
    options: ["Cl⁻", "F⁻", "CN⁻", "I⁻"],
    correct: 2,
    sol: "CN⁻ (cyanide) is a strong field ligand according to the spectrochemical series." },
  {
    text: "Which hybridization gives square planar geometry?",
    options: ["sp3", "sp2", "sp", "dsp2"],
    correct: 3,
    sol: "dsp2 hybridization gives square planar geometry (e.g., [Ni(CN)4]2−)." },
  {
    text: "Which is a chelating ligand?",
    options: ["Cl⁻", "H2O", "en (ethylenediamine)", "CO"],
    correct: 2,
    sol: "en (ethylenediamine) is a bidentate ligand that forms chelate rings with metal ions." },
  {
    text: "Which of the following is NOT a characteristic of transition metals?",
    options: ["Variable oxidation states", "Formation of colored compounds", "Paramagnetism", "High electrical resistivity"],
    correct: 3,
    sol: "Transition metals are good conductors of electricity (low electrical resistivity), not high electrical resistivity." },
  {
    text: "Which of the following is NOT a polymer?",
    options: ["Polyethylene", "PVC", "Bakelite", "Glucose"],
    correct: 3,
    sol: "Glucose is a monosaccharide (monosaccharide - C6H12O6), not a polymer. Polyethylene, PVC, Bakelite are polymers." }
]);

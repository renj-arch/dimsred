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
    id: 3901 + i,
    text: q.text,
    options: q.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === q.correct })),
    sol: q.sol
  }));
  fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
  console.log('Injected ' + key);
}

inject('opt-chemistry/paper3', `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chemistry Paper III — Environmental Chemistry & Industrial Chemistry | vlymbooq</title>
<meta name="description" content="UPSC Mains Chemistry Optional Paper II: Environmental Chemistry, Green Chemistry, Industrial Chemistry, Water Treatment, Waste Management, Environmental Pollution Control">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="../mains.css">
<style>
.hero{padding:40px 0;text-align:center;background:var(--bg-elevated);border-bottom:1px solid var(--border)}
.hero h1{font-size:2.5em;font-weight:800;margin-bottom:1rem}
.hero .sub{color:var(--text-sec);font-size:1.1em;max-width:65ch;margin:0 auto}
.section{padding:40px 0}
.section h2{font-size:1.5em;font-weight:700;margin-bottom:20px}
.lesson-body{line-height:1.8;color:var(--text-sec)}
ol,ul{margin:1rem 0;padding-left:20px}
ol li,ul li{margin-bottom:8px}
strong{color:var(--text)}
a{color:var(--purple);text-decoration:none}
a:hover{text-decoration:underline}
.tip-box{background:rgba(167,139,250,.06);border:1px solid var(--purple);border-radius:12px;padding:16px 20px;margin:20px 0}
.tip-box .tip-title{font-weight:800;color:var(--purple);font-size:.9em;margin-bottom:8px}
.tip-box .tip-text{color:var(--text-sec);font-size:.95em;line-height:1.7}
pre{background:#0f172a;padding:12px 16px;border-radius:8px;overflow-x:auto;color:#d1d5db;font-family:monospace}
pre code{color:#a5f3fc}
</style>
</head>
<body>
<div class="wrap"><div class="wrap-inner">
<nav class="nav"><div class="nav-inner"><a class="brand" href="../../index.html"><img src="../../../logo.png" alt="">vlymbooq</a><div class="nav-links"><a href="../../../index.html">Home</a><a href="../index.html">UPSC</a><a href="../index.html" class="active">Course</a></div></div></nav>

<section class="hero">
<div class="kicker">Optional Chemistry · Paper II</div>
<h1>Environmental Chemistry</h1>
<p class="lede">Environmental chemistry studies chemical processes occurring in air, water, and soil environments. It covers pollution sources, transport, transformation, effects, and control measures. Understanding environmental chemistry is crucial for addressing pollution, climate change, and sustainable development challenges.</div></section>

<div class="grid three" style="margin:24px 0">
<a class="card" href="lesson-overview.html"><div class="t">Overview</div><div class="d">Overview, syllabus, study plan</div></a>
<a class="card" href="lesson-paper1.html"><div class="t">Paper I</div><div class="d">Inorganic Chemistry, Organic Chemistry, Physical Chemistry</div></a>
<a class="card" href="lesson-paper2.html" class="active"><div class="t">Paper II</div><div class="d">Spectroscopy, Biochemistry, Environmental Chemistry</div></a></div>

<div class="section"><h3>Environmental Chemistry</h3>
<p>Environmental chemistry studies chemical processes occurring in air, water, and soil environments. It covers pollution sources, transport, transformation, effects, and control measures.</p>

<h3>Environmental Pollution</h3>
<ul>
<li><strong>Air Pollution:</strong> Sources: industrial emissions, vehicular emissions, biomass burning, natural sources (volcanic eruptions, dust storms). Pollutants: particulate matter (PM2.5, PM10), nitrogen oxides (NOx), sulfur oxides (SOx), carbon monoxide, ozone, volatile organic compounds (VOCs). Effects: respiratory diseases, acid rain, smog formation, reduced visibility, damage to buildings and monuments.</li>
<li><strong>Water Pollution:</strong> Point source pollution (industrial discharge, sewage treatment plants), non-point source pollution (agricultural runoff, atmospheric deposition). Parameters: BOD, COD, dissolved oxygen, pH, turbidity, heavy metals, coliform bacteria.</li>
<li><strong>Soil Pollution:</strong> Sources: industrial waste, agricultural chemicals (pesticides, fertilizers), mining waste, electronic waste, urban waste. Effects: soil degradation, reduced fertility, groundwater contamination, food chain contamination.</li>
</ul>
<div class="tip-box"><div class="tip-title">Key Concept: Air Quality Index (AQI)</div><div class="tip-text">Air Quality Index (AQI) is a measure of air quality based on concentration of major pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3, lead). Good: 0-50, Satisfactory: 51-100, Moderate: 101-200, Poor: 201-300, Very Poor: 301-400, Severe: 401-500.</div></div>

<h3>Environmental Chemistry Topics</h3>
<ul>
<li><strong>Ozone Layer Depletion:</strong> Chlorofluorocarbons (CFCs), halons, methyl bromide cause ozone layer depletion. Mechanism: Cl + O₃ → ClO + O₂, ClO + O → Cl + O₂. Net effect: O₃ + O → 2O₂. Montreal Protocol (1987) phased out CFCs and other ozone-depleting substances.</li>
<li><strong>Global Warming:</strong> Greenhouse gases: CO₂, CH₄, N₂O, HFCs, PFCs, SF₆, NF₃. Global warming potential (GWP): CO₂ = 1, methane = 28-36 times CO₂, nitrous oxide = 265-298 times CO₂.</li>
<li><strong>Acid Rain:</strong> Formation: SO₂ + H₂O → H₂SO₃ (sulfurous acid), 2SO₂ + O₂ → 2SO₃, SO₃ + H₂O → H₂SO₄. Effects: damage to buildings, monuments, aquatic ecosystems, forests, soil acidification.</li>
</ul>

<h3>Environmental Pollution Control</h3>
<ul>
<li><strong>Air Pollution Control:</strong> Control of particulate matter: electrostatic precipitators, fabric filters (bag filters), wet scrubbers, cyclone separators. Control of gaseous pollutants: absorption, adsorption, combustion, condensation.</li>
<li><strong>Water Pollution Control:</strong> Primary treatment: screening, grit removal, primary sedimentation. Secondary treatment: activated sludge process, trickling filters, oxidation ponds, lagoons. Tertiary treatment: filtration, disinfection (chlorination, UV, ozone), nutrient removal (nitrogen, phosphorus removal).</li>
<li><strong>Solid Waste Management:</strong> Waste hierarchy: reduce, reuse, recycle (3R approach). Waste segregation at source. Landfill design: liner system, leachate collection, gas collection, final cover. Waste-to-energy: incineration with energy recovery, refuse-derived fuel (RDF), biomethanation.</li>
</ul>
<div class="example-box"><div class="ex-title">Technique: BOD Calculation</div><div class="ex-text">Question: Calculate BOD₅ if initial DO = 8.2 mg/L, final DO after 5 days at 20°C = 2.1 mg/L, dilution factor = 1:50.</div><div class="ex-soln">Answer: BOD₅ = (DO₁ - DO₂) × Dilution Factor = (8.5 - 2.3) × 50 = 6.2 × 50 = 310 mg/L.</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Water Quality Parameters:</strong> BOD measures biodegradable organic matter; COD measures total oxidizable organic matter; COD > BOD always (includes non-biodegradable organics).</li>
<li><strong>Air Quality Index:</strong> AQI categories: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (401-500).</li>
<li><strong>Green Chemistry Principles:</strong> 12 principles of green chemistry: prevention, atom economy, less hazardous syntheses, safer chemicals, safer solvents, energy efficiency, use of renewable feedstocks, reduce derivatives, catalysis, design for degradation, real-time analysis, inherently safer chemistry.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Environmental chemistry answers: define concepts → sources → effects → control measures → regulations. Draw diagrams (smog formation, ozone depletion mechanism, water treatment process, air pollution control equipment). Quote regulations: Air (Prevention and Control of Pollution) Act 1981, Water (Prevention and Control of Pollution) Act 1974, Environment (Protection) Act 1986, Hazardous Waste Management Rules, E-waste Management Rules, Plastic Waste Management Rules.</div></div>`, [
  {
    text: "BOD measures:",
    options: ["Dissolved oxygen consumed by microorganisms", "Chemical oxygen demand", "Total dissolved solids", "pH of water"],
    correct: 0,
    sol: "BOD (Biochemical Oxygen Demand) measures the amount of dissolved oxygen consumed by microorganisms during decomposition of organic matter." },
  {
    text: "Which of the following is a greenhouse gas?",
    options: ["Oxygen", "Nitrogen", "Methane", "Oxygen"],
    correct: 0,
    sol: "Methane (CH₄) is a potent greenhouse gas with GWP of 28-36 times CO₂." },
  {
    text: "Which air pollutant causes photochemical smog?",
    options: ["NOx and VOCs", "CO", "SO₂", "Particulate matter"],
    correct: 0,
    sol: "Photochemical smog is formed by reaction of NOx and VOCs in presence of sunlight." },
  {
    text: "Which is NOT a greenhouse gas?",
    options: ["CO₂", "CH₄", "O₂", "N₂O"],
    correct: 3,
    sol: "Oxygen (O₂) is not a greenhouse gas. CO₂, CH₄, N₂O are greenhouse gases." },
  {
    text: "Which scheme promotes micro-irrigation under 'Per Drop More Crop'?",
    options: ["PMFBY", "PMKSY", "e-NAM", "NFSM"],
    correct: 1,
    sol: "PMKSY (Pradhan Mantri Krishi Sinchayee Yojana) - Per Drop More Crop promotes micro-irrigation." }
]);

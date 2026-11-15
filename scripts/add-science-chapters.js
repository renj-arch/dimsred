#!/usr/bin/env node
'use strict';
// Give NEET and JEE real chapter lists.
//
// Measured before this change, every science course was one lesson per broad
// subject area: NEET Physics was six lessons for the whole of physics,
// "Mechanics" and "Thermodynamics" were single pages, and NEET Biology was six
// for the entire syllabus. A candidate cannot revise a paper that way, and the
// expansion lanes cannot deepen a chapter that was never declared.
//
// NEET Physics and JEE Physics declare the same module key (`physics/...`), as
// do the chemistry modules, so one chapter list serves both exams and they
// share the generated content. NEET Biology and JEE Maths are separate.
//
// The original lessons are kept and stay after the new chapters, the same
// arrangement the UPSC map uses: the fine chapters are the reading order, the
// broad lessons remain as full-syllabus coverage. Every new slug has no entry
// in course-data.json, which makes it an empty slot the expansion lanes fill.
//
//   node scripts/add-science-chapters.js
//
// Idempotent: re-running adds nothing.
var fs = require('fs');
var path = require('path');

var FILE = path.join(__dirname, 'exam-configs.json');

var PHYSICS = [
  { slug: 'units-and-motion', title: 'Units, Measurement & Motion in a Straight Line', desc: 'SI units, dimensional analysis, errors, and position, velocity and acceleration graphs.', topics: 'Units, Dimensions, Errors, Kinematics' },
  { slug: 'motion-in-a-plane', title: 'Motion in a Plane & Projectile Motion', desc: 'Vectors, relative velocity, projectile motion and uniform circular motion.', topics: 'Vectors, Projectiles, Relative Velocity, Circular Motion' },
  { slug: 'laws-of-motion', title: 'Laws of Motion, Friction & Circular Motion', desc: 'Newton\'s three laws, free-body diagrams, friction, and circular motion with banking.', topics: 'Newton\'s Laws, Friction, Equilibrium, Banking' },
  { slug: 'work-energy-power', title: 'Work, Energy & Power', desc: 'Work by constant and variable forces, kinetic and potential energy, and collisions.', topics: 'Work, Energy, Conservative Forces, Collisions' },
  { slug: 'rotational-motion', title: 'System of Particles & Rotational Motion', desc: 'Centre of mass, torque, moment of inertia, angular momentum and rolling motion.', topics: 'Centre of Mass, Torque, Moment of Inertia, Rolling' },
  { slug: 'gravitation', title: 'Gravitation & Satellites', desc: 'Newton\'s law of gravitation, variation of g, orbital velocity, escape velocity and Kepler\'s laws.', topics: 'Gravitation, Kepler, Satellites, Escape Velocity' },
  { slug: 'properties-of-matter', title: 'Mechanical Properties of Solids & Fluids', desc: 'Stress and strain, elastic moduli, pressure, buoyancy, Bernoulli and viscosity.', topics: 'Elasticity, Pressure, Bernoulli, Viscosity' },
  { slug: 'thermal-physics', title: 'Thermal Properties, Kinetic Theory & Thermodynamics', desc: 'Thermal expansion and calorimetry, kinetic theory, and the laws of thermodynamics.', topics: 'Calorimetry, Kinetic Theory, Thermodynamics, Heat Engines' },
  { slug: 'oscillations-waves', title: 'Oscillations & Waves', desc: 'SHM, pendulum motion, wave equation, superposition, beats and the Doppler effect.', topics: 'SHM, Waves, Superposition, Doppler' },
  { slug: 'electrostatics', title: 'Electric Charges, Fields & Potential', desc: 'Coulomb\'s law, electric field and flux, Gauss\'s law, potential, capacitance and dielectrics.', topics: 'Coulomb, Gauss, Potential, Capacitance' },
  { slug: 'current-electricity', title: 'Current Electricity & Circuits', desc: 'Ohm\'s law, resistivity, cells and EMF, Kirchhoff\'s rules, and Wheatstone and potentiometer circuits.', topics: 'Ohm, Kirchhoff, Cells, Meters' },
  { slug: 'magnetism-and-emi', title: 'Magnetism, Moving Charges & Electromagnetic Induction', desc: 'Biot-Savart, Ampere\'s law, magnetic materials, AC circuits, and Faraday and Lenz.', topics: 'Magnetic Field, Induction, AC, LCR' },
  { slug: 'optics', title: 'Ray Optics & Wave Optics', desc: 'Reflection, refraction, lenses, optical instruments, interference, diffraction and polarisation.', topics: 'Mirrors, Lenses, Interference, Diffraction' },
  { slug: 'modern-physics', title: 'Dual Nature, Atoms, Nuclei & Semiconductors', desc: 'Photoelectric effect, Bohr model, nuclear structure and binding energy, and semiconductor devices.', topics: 'Photoelectric, Atoms, Nuclei, Semiconductors' }
];

var CHEMISTRY = [
  { slug: 'basic-concepts', title: 'Some Basic Concepts of Chemistry & Mole Concept', desc: 'Atomic and molecular masses, the mole, stoichiometry, and concentration terms.', topics: 'Mole, Stoichiometry, Concentration' },
  { slug: 'atomic-structure', title: 'Atomic Structure & Periodicity', desc: 'Quantum numbers, orbital shapes, electronic configuration, and periodic trends.', topics: 'Quantum Numbers, Configuration, Periodic Trends' },
  { slug: 'chemical-bonding', title: 'Chemical Bonding & Molecular Structure', desc: 'Ionic and covalent bonds, VSEPR, hybridisation, molecular orbital theory and hydrogen bonding.', topics: 'Ionic, Covalent, VSEPR, MOT' },
  { slug: 'thermodynamics-equilibrium', title: 'Thermodynamics, Equilibrium & Redox', desc: 'Laws of thermodynamics, enthalpy, chemical and ionic equilibrium, and redox reactions.', topics: 'Enthalpy, Equilibrium, pH, Redox' },
  { slug: 'solutions-electrochemistry', title: 'Solutions, Electrochemistry & Chemical Kinetics', desc: 'Colligative properties, conductance, cells and Nernst equation, and rate laws.', topics: 'Colligative, Cells, Nernst, Kinetics' },
  { slug: 'p-block-elements', title: 'p-Block Elements', desc: 'Group 13 to 18: trends, important compounds, and the noble gases.', topics: 'Group 13-18, Compounds, Trends' },
  { slug: 'd-f-block-coordination', title: 'd- and f-Block Elements & Coordination Compounds', desc: 'Transition metal trends, lanthanoids and actinoids, and coordination chemistry with CFT.', topics: 'Transition Metals, Lanthanoids, Coordination, CFT' },
  { slug: 'organic-basics-hydrocarbons', title: 'Organic Chemistry Basics & Hydrocarbons', desc: 'IUPAC nomenclature, isomerism, reaction mechanisms, and alkanes, alkenes, alkynes and aromatics.', topics: 'Nomenclature, Isomerism, Mechanisms, Hydrocarbons' },
  { slug: 'organic-functional-groups', title: 'Haloalkanes, Alcohols, Phenols, Ethers & Amines', desc: 'Preparation, properties and named reactions of the main functional-group families.', topics: 'Haloalkanes, Alcohols, Ethers, Amines' },
  { slug: 'biomolecules-polymers', title: 'Aldehydes, Ketones, Biomolecules & Polymers', desc: 'Carbonyl chemistry, carbohydrates, proteins, nucleic acids, vitamins and polymers.', topics: 'Carbonyls, Biomolecules, Polymers' }
];

var BIOLOGY = [
  { slug: 'cell-structure-cycle', title: 'Cell: Structure, Cycle & Division', desc: 'Cell organelles, the cell cycle, mitosis and meiosis.', topics: 'Organelles, Cell Cycle, Mitosis, Meiosis' },
  { slug: 'biomolecules-enzymes', title: 'Biomolecules & Enzymes', desc: 'Carbohydrates, proteins, lipids, nucleic acids and enzyme kinetics.', topics: 'Biomolecules, Enzymes, Kinetics' },
  { slug: 'plant-diversity', title: 'Plant Kingdom, Morphology & Anatomy', desc: 'Algae to angiosperms, plant morphology, and the anatomy of flowering plants.', topics: 'Classification, Morphology, Anatomy' },
  { slug: 'plant-physiology', title: 'Photosynthesis, Respiration & Plant Transport', desc: 'Photosynthesis, respiration, transport in plants, plant growth and hormones.', topics: 'Photosynthesis, Respiration, Transport, Growth' },
  { slug: 'human-physiology-basics', title: 'Digestion, Breathing & Body Fluids', desc: 'Digestive system, breathing and exchange of gases, and circulation and excretion.', topics: 'Digestion, Respiration, Circulation, Excretion' },
  { slug: 'human-control-systems', title: 'Nervous System, Endocrine & Locomotion', desc: 'Neural control, chemical coordination, and movement and locomotion.', topics: 'Nervous, Endocrine, Locomotion' },
  { slug: 'human-reproduction', title: 'Human Reproduction & Reproductive Health', desc: 'Reproductive systems, gametogenesis, the menstrual cycle, and reproductive health.', topics: 'Reproduction, Gametogenesis, Health' },
  { slug: 'genetics-inheritance', title: 'Principles of Inheritance & Molecular Basis', desc: 'Mendelian genetics, linkage, sex determination, and DNA, RNA and gene expression.', topics: 'Mendel, Linkage, DNA, Gene Expression' },
  { slug: 'evolution', title: 'Evolution & Origin of Life', desc: 'Origin of life, evidence for evolution, Darwinian theory and human evolution.', topics: 'Origin, Evidence, Darwin, Human Evolution' },
  { slug: 'human-health', title: 'Human Health, Disease & Immunity', desc: 'Pathogens, immunity, vaccination, cancer, drugs and AIDS.', topics: 'Pathogens, Immunity, Cancer, AIDS' },
  { slug: 'ecology-ecosystem', title: 'Organisms, Populations, Ecosystem & Energy Flow', desc: 'Ecological adaptations, population interactions, ecosystem productivity and nutrient cycling.', topics: 'Populations, Interactions, Ecosystem, Cycles' },
  { slug: 'biodiversity', title: 'Biodiversity & Conservation', desc: 'Biodiversity patterns, loss and causes, and in-situ and ex-situ conservation.', topics: 'Biodiversity, Loss, Conservation' },
  { slug: 'biotechnology', title: 'Biotechnology: Principles & Applications', desc: 'Recombinant DNA tools, processes, and applications in agriculture, medicine and industry.', topics: 'rDNA, Tools, Applications' },
  { slug: 'microbes-food', title: 'Microbes in Human Welfare & Food Production', desc: 'Microbes in food, industry, sewage treatment, biogas, and as biocontrol agents.', topics: 'Microbes, Food, Sewage, Biocontrol' }
];

var MATHS = [
  { slug: 'quadratic-sequences', title: 'Quadratic Equations, Sequences & Series', desc: 'Quadratic equations and roots, arithmetic and geometric progressions, and special series.', topics: 'Quadratics, AP, GP, Series' },
  { slug: 'complex-binomial', title: 'Complex Numbers & Binomial Theorem', desc: 'Argand plane, modulus and argument, roots of unity, and binomial expansion.', topics: 'Complex Numbers, Argand, Binomial' },
  { slug: 'matrices-determinants', title: 'Matrices & Determinants', desc: 'Matrix algebra, determinants, adjoint and inverse, and systems of linear equations.', topics: 'Matrices, Determinants, Systems' },
  { slug: 'permutations-probability', title: 'Permutations, Combinations & Probability', desc: 'Counting principles, combinations, and conditional probability with Bayes and distributions.', topics: 'Permutations, Combinations, Probability' },
  { slug: 'limits-continuity', title: 'Limits, Continuity & Differentiability', desc: 'Limits, standard results, continuity, and differentiability including the mean value theorems.', topics: 'Limits, Continuity, Differentiability, MVT' },
  { slug: 'differentiation-applications', title: 'Differentiation & Its Applications', desc: 'Derivative rules, tangents and normals, monotonicity, maxima and minima.', topics: 'Derivatives, Tangents, Maxima, Monotonicity' },
  { slug: 'integration', title: 'Indefinite & Definite Integration', desc: 'Standard integrals, substitution, partial fractions, by parts, and definite integral properties.', topics: 'Integration, Substitution, Definite Integrals' },
  { slug: 'differential-equations', title: 'Differential Equations', desc: 'Order and degree, variable separable equations, homogeneous equations and linear ODEs.', topics: 'Order, Separable, Linear ODE' },
  { slug: 'coordinate-geometry', title: 'Straight Lines, Circles & Conic Sections', desc: 'Straight lines, circles, parabola, ellipse and hyperbola with their standard results.', topics: 'Lines, Circles, Conics' },
  { slug: 'vectors-3d', title: 'Vectors & Three-Dimensional Geometry', desc: 'Vector algebra, dot and cross products, lines and planes in space, and shortest distance.', topics: 'Vectors, Planes, Lines, Distance' }
];

function die(msg) { console.error('add-science-chapters: ' + msg); process.exit(1); }

var raw = fs.readFileSync(FILE, 'utf8');
var crlf = raw.indexOf('\r\n') !== -1;
var bom = raw.charCodeAt(0) === 0xFEFF;
var cfg = JSON.parse(bom ? raw.slice(1) : raw);

// [exam, module, chapters]
var PLAN = [
  ['neet', 'physics', PHYSICS],
  ['jee', 'physics', PHYSICS],
  ['neet', 'chemistry', CHEMISTRY],
  ['jee', 'chemistry', CHEMISTRY],
  ['neet', 'biology', BIOLOGY],
  ['jee', 'maths', MATHS]
];

var added = 0;
PLAN.forEach(function (step) {
  var exam = cfg[step[0]];
  var mod = exam && exam.modules && exam.modules[step[1]];
  if (!mod) die('missing module ' + step[0] + '.' + step[1]);
  var have = {};
  (mod.lessons || []).forEach(function (l) { have[l.slug] = 1; });
  var fresh = step[2].filter(function (l) { return !have[l.slug]; });
  if (!fresh.length) { console.log(step[0] + '/' + step[1] + ': already has every chapter'); return; }
  // Keep the original broad lessons after the new chapters, matching the UPSC
  // map: the fine chapters are the reading order, the broad ones stay as
  // full-syllabus coverage.
  mod.lessons = (mod.lessons || []).concat(fresh);
  added += fresh.length;
  console.log(step[0] + '/' + step[1] + ': +' + fresh.length + ' chapters -> ' + mod.lessons.length + ' total');
});

if (!added) { console.log('nothing to do'); process.exit(0); }

var out = JSON.stringify(cfg, null, 2) + '\n';
if (crlf) out = out.replace(/\n/g, '\r\n');
if (bom) out = '\uFEFF' + out;
fs.writeFileSync(FILE, out, 'utf8');
console.log('added ' + added + ' science chapter(s)');
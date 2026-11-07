// Gap-finder: diffs every exam syllabus this site serves against the Wikipedia
// CATEGORIES list that wiki-fill-all.cjs actually fills. A syllabus unit with
// no covering category is a blind spot: ask.html cannot ground it, the tutor
// cannot retrieve it, the fine-tune loop cannot learn it. The report names the
// gap and suggests a Wikipedia category + seed articles that would close it.
//
// Usage: node scripts/gap-finder.js
// CI:    wired into fault-status.yml before fault-report.js
// Out:   data/topic-gaps.json

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'topic-gaps.json');

// ── what wiki-fill currently covers ─────────────────────────────────────────
function currentCategories() {
  const src = fs.readFileSync(path.join(__dirname, 'wiki-fill-all.cjs'), 'utf8');
  const i = src.search(/CATEGORIES\s*=\s*\[/);
  if (i < 0) return [];
  const start = src.indexOf('[', i);
  let depth = 0, end = -1;
  for (let k = start; k < src.length; k++) {
    if (src[k] === '[') depth++;
    else if (src[k] === ']') { depth--; if (!depth) { end = k; break; } }
  }
  const names = [];
  const re = /name:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src.slice(start, end + 1))) !== null) names.push(m[1]);
  return names;
}

// ── exam syllabi (mirrors what the site's banks + published PYQ weightage say) ──
// weight = relative importance (PYQ questions per paper or share %), used to
// sort the gap list so the biggest blind spots surface first.
const SYLLABI = {
  'ssc-je-mech': {
    label: 'SSC JE Mechanical (Paper I technical, 100 Q)',
    // map: syllabus unit -> [keywords that would match an existing cat name]
    units: [
      ['Fluid Mechanics', 30, ['fluid']],
      ['Power Plant Engineering', 18, ['power plant', 'energy & power', 'nuclear energy']],
      ['Refrigeration & Air Conditioning', 11, ['refrigeration', 'air conditioning', 'hvac']],
      ['Production / Manufacturing Engineering', 10, ['manufacturing', 'production', 'machine shop']],
      ['Thermodynamics', 11, ['thermodynamic']],
      ['Internal Combustion Engines', 10, ['combustion engine', 'ic engine']],
      ['Heat Transfer', 3, ['heat transfer']],
      ['Strength of Materials', 3, ['strength of material', 'solid mechanics']],
      ['Engineering Mechanics', 3, ['engineering mechanics', 'statics', 'dynamics']],
      ['Theory of Machines', 2, ['theory of machine', 'kinematics', 'mechanism']],
      ['Machine Design', 2, ['machine design', 'mechanical design']],
      ['Engineering Materials & Metallurgy', 3, ['metallurg', 'material science', 'materials']],
      ['Boilers & Steam Turbines', 5, ['boiler', 'steam turbine', 'steam engine']],
      ['Gas Turbines & Jet Propulsion', 3, ['gas turbine', 'jet engine', 'propulsion']],
      ['Hydraulic Machines (Turbines & Pumps)', 4, ['hydraulic machine', 'pump', 'water turbine', 'hydroelectric']],
      ['Air Compressors', 2, ['compressor']],
      ['Nuclear Power Engineering', 2, ['nuclear']],
      ['Renewable Energy Engineering', 2, ['renewable', 'solar', 'wind power']],
      ['Mechatronics & Control Systems', 2, ['mechatronic', 'control system', 'automation']],
      ['Industrial Engineering & Production Planning', 2, ['industrial engineering', 'production planning', 'operations research', 'quality control']],
      ['Workshop Technology & Welding', 2, ['welding', 'workshop', 'metalworking']],
      ['Automobile Engineering', 2, ['automobile', 'vehicle']]
    ]
  },
  'neet-bio': {
    label: 'NEET Biology (90 Q, 360 marks)',
    units: [
      ['Human Physiology', 20, ['physiology', 'health & human body', 'digestive', 'respiratory', 'circulatory', 'nervous system', 'endocrine']],
      ['Genetics & Evolution', 15, ['genetic', 'evolution', 'dna', 'molecular biology']],
      ['Ecology & Environment', 12, ['ecology', 'ecosystem', 'biodiversity', 'environment']],
      ['Cell Biology', 10, ['cell biology', 'cell (', 'cytology']],
      ['Plant Physiology', 8, ['plant physiology', 'photosynthesis', 'plant biology', 'botany']],
      ['Reproduction (Plant & Human)', 10, ['reproduction', 'embryology', ' reproductive']],
      ['Diversity & Classification', 12, ['classification', 'taxonomy', 'zoology', 'animal biology', 'plant kingdom']],
      ['Biotechnology', 5, ['biotech']],
      ['Biomolecules & Biochemistry', 4, ['biochemistry', 'biomolecule', 'enzyme']],
      ['Immunology', 3, ['immunology', 'immune', 'vaccin']],
      ['Microbiology', 3, ['microbiology', 'bacter', 'virus']],
      ['Anatomy & Morphology', 5, ['anatomy', 'morphology', 'histology', 'tissue']]
    ]
  },
  'neet-pc': {
    label: 'NEET Physics + Chemistry (50 + 50 Q)',
    units: [
      ['Mechanics (Kinematics, Laws, Rotational, Gravitation)', 10, ['mechanics', 'kinematics', 'newton', 'gravitation']],
      ['Electrostatics & Current Electricity', 8, ['electrostatic', 'current electricity', 'circuit', 'ohm']],
      ['Magnetism, EMI & AC', 7, ['magnet', 'electromagnetic induction', 'alternating current']],
      ['Optics (Ray & Wave)', 5, ['optics', 'refraction', 'interference', 'diffraction']],
      ['Thermal Physics & Thermodynamics', 4, ['thermal', 'heat', 'kinetic theory', 'thermodynamic']],
      ['Modern Physics & Semiconductors', 6, ['quantum', 'radioactive', 'nuclear physics', 'semiconductor', 'photoelectric']],
      ['Oscillations & Waves', 4, ['oscillation', 'wave', 'shm', 'sound']],
      ['Physical Chemistry (Moles, Equilibrium, Electrochem)', 12, ['stoichiometry', 'equilibrium', 'electrochemistry', 'thermochemistry', 'chemical kinetics', 'surface chemistry']],
      ['Inorganic Chemistry (Periodic, Bonding, p/d/f-block)', 14, ['periodic table', 'chemical bonding', 'coordination chemistry', 'p-block', 'd-block', 'metallurgy']],
      ['Organic Chemistry (GOC, Mechanisms, Named Reactions)', 14, ['organic chemistry', 'hydrocarbon', 'alcohol', 'aldehyde', 'carboxylic', 'amine', 'biomolecule', 'polymer', 'reaction mechanism']]
    ]
  },
  'jee-pcm': {
    label: 'JEE Main (Physics 25, Chemistry 25, Maths 25 Q)',
    units: [
      ['Algebra & Coordinate Geometry', 8, ['algebra', 'quadratic', 'coordinate geometry', 'conic section', 'complex number', 'binomial', 'sequence and series', 'permutation', 'probability']],
      ['Calculus (Differential + Integral)', 10, ['calculus', 'differential equation', 'integration', 'derivative', 'continuity']],
      ['Vectors & 3D Geometry', 5, ['vector', 'three-dimensional', '3d geometry']],
      ['Trigonometry', 5, ['trigonometry', 'trigonometric']],
      ['Mechanics (Full)', 10, ['mechanics', 'projectile', 'circular motion', 'work energy', 'rotational']],
      ['Electromagnetism (Full)', 10, ['electromagnet', 'capacitor', 'induction', 'maxwell']],
      ['Modern Physics', 5, ['atomic physics', 'nuclear physics', 'photoelectric', 'bohr']],
      ['Physical Chemistry', 8, ['mole concept', 'gaseous state', 'thermodynamic', 'equilibrium', 'electrochemistry']],
      ['Inorganic Chemistry', 8, ['periodic', 'chemical bonding', 'coordination', 'metallurgy']],
      ['Organic Chemistry', 9, ['organic', 'hydrocarbon', 'aldehyde', 'carboxylic', 'amine', 'haloalkane']]
    ]
  },
  'polytechnic-diploma': {
    label: 'Polytechnic diploma (26 subjects)',
    units: [
      ['Basic Electrical Engineering', 4, ['electrical', 'circuit', 'ohm', 'transformer']],
      ['Basic Electronics & Instrumentation', 3, ['electron', 'diode', 'transistor', 'instrumentation', 'sensor']],
      ['Civil Engineering (Surveying, Soil, Structures)', 4, ['civil engineering', 'survey', 'soil mechanics', 'concrete', 'structure']],
      ['Engineering Drawing & Drafting', 2, ['technical drawing', 'drafting', 'engineering drawing', 'projection']],
      ['Computer Applications & Programming', 3, ['programming', 'algorithm', 'database', 'operating system']],
      ['Applied Mechanics & Engineering Mechanics', 2, ['applied mechanics', 'statics', 'dynamics']],
      ['Basic Science (Maths, Physics, Chemistry)', 3, ['mathematics', 'physics', 'chemistry']],
      ['Environmental Studies', 1, ['pollution', 'environmental engineering', 'waste']]
    ]
  },
  'cgl-ga': {
    label: 'SSC CGL Tier-1 General Awareness + Quant/Reasoning static bases',
    units: [
      ['Physics (Light, Sound, Electricity, Units)', 2, ['physics', 'optics', 'sound', 'electricity', 'unit']],
      ['Chemistry (Elements, Compounds, Reactions)', 2, ['chemistry', 'element', 'compound', 'periodic']],
      ['Biology (Cells, Diseases, Nutrition)', 2, ['biology', 'cell', 'disease', 'vitamin']],
      ['Indian History static (ancient/medieval quick facts)', 3, ['ancient', 'medieval', 'maurya', 'mughal']],
      ['Static GK (National symbols, First in India, Awards)', 4, ['national symbol', 'first in india', 'award', 'honour']]
    ]
  }
};

// ── match a unit against covered category names ─────────────────────────────
function covered(unitName, keywords, cats) {
  const u = unitName.toLowerCase();
  for (const c of cats) {
    const lc = c.toLowerCase();
    for (const k of keywords) {
      if (lc.includes(k)) return c;
    }
    // whole-word-ish match of distinctive unit words
    const words = u.split(/[^a-z]+/).filter(w => w.length > 4);
    for (const w of words) {
      if (lc.includes(w)) return c;
    }
  }
  return null;
}

function main() {
  const cats = currentCategories();
  const generated = new Date().toISOString().slice(0, 10);
  const exams = {};
  const totalGaps = [];

  for (const [examKey, def] of Object.entries(SYLLABI)) {
    const gaps = [];
    const coveredUnits = [];
    for (const [unit, weight, keys] of def.units) {
      const hit = covered(unit, keys, cats);
      if (hit) coveredUnits.push({ unit, by: hit, weight });
      else gaps.push({ unit, weight });
    }
    gaps.sort((a, b) => b.weight - a.weight);
    totalGaps.push(...gaps.map(g => ({ exam: examKey, ...g })));
    exams[examKey] = {
      label: def.label,
      unitsTotal: def.units.length,
      unitsCovered: coveredUnits.length,
      coveragePct: Math.round(coveredUnits.length / def.units.length * 100),
      gaps: gaps.map(g => ({ unit: g.unit, weight: g.weight }))
    };
  }

  totalGaps.sort((a, b) => b.weight - a.weight);

  const report = {
    generated,
    categoriesCovering: cats.length,
    exams,
    totalGaps: totalGaps.length,
    gaps: totalGaps.slice(0, 40),
    note: 'Each gap = a syllabus unit this site serves with NO covering Wikipedia category in wiki-fill-all.cjs CATEGORIES. Ask/tutor cannot ground these; closing them = add a category entry (wikiCat + topics) to wiki-fill-all.cjs.'
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log('categories covering:', cats.length);
  for (const [k, v] of Object.entries(exams)) {
    console.log('  ' + k.padEnd(20), v.coveragePct + '%', '(' + v.unitsCovered + '/' + v.unitsTotal + ')', v.gaps.length ? 'gaps: ' + v.gaps.slice(0, 3).map(g => g.unit).join('; ') : 'full');
  }
  console.log('total gaps:', totalGaps.length, '-> wrote', OUT);
}

main();

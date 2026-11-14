// Batch 2: Geology (3) + Mechanical Engineering (3)
module.exports = {
  'opt-geology/overview': {
    html: `<h3>Geology Optional — Syllabus Map &amp; Strategy</h3>
<p>Geology is a two-paper optional of 250 marks each. Paper I is physical geology and petrology; Paper II is stratigraphy, palaeontology, economic geology and applied geology. Diagrams and field evidence carry heavy weight.</p>
<h3>Paper I — Physical and Structural Geology</h3>
<ul>
<li><strong>Geomorphology:</strong> weathering, mass wasting, fluvial, glacial, aeolian, coastal and karst landforms; drainage patterns; geomorphic cycles (Davis, Penck); plate tectonics.</li>
<li><strong>Structural Geology:</strong> strike and dip, folds, faults, joints, unconformities, cleavage and foliation, stereographic projection.</li>
<li><strong>Crystallography and Mineralogy:</strong> crystal systems, symmetry, optical mineralogy, classification of rock-forming minerals, Mohs scale.</li>
<li><strong>Petrology:</strong> igneous rocks (Bowen’s series, differentiation), sedimentary rocks (classification, structures, diagenesis), metamorphic rocks (facies, grades, P–T conditions).</li>
</ul>
<h3>Paper II — Historical and Applied Geology</h3>
<ul>
<li><strong>Stratigraphy:</strong> principles, geological time scale, Indian stratigraphy — Dharwar, Cuddapah, Vindhyan, Gondwana, Mesozoic, Tertiary and Quaternary.</li>
<li><strong>Palaeontology:</strong> fossil preservation, microfossils, index fossils, evolution, Gondwana flora and Siwalik fauna.</li>
<li><strong>Economic Geology:</strong> ore genesis, mineral deposits of India, coal and petroleum, exploration methods.</li>
<li><strong>Hydrogeology:</strong> aquifers, Darcy’s law, wells, recharge, groundwater quality and provinces of India.</li>
<li><strong>Remote Sensing and Applied Geology:</strong> electromagnetic spectrum, sensors, resolutions, GIS, engineering geology and mining geology.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Stream Gradient</div><div class="ex-text">Question: A stream falls from 250 m to 200 m over a horizontal distance of 5 km. Find its gradient.</div><div class="ex-soln">Answer: Gradient = drop/length = 50 m / 5000 m = 0.01, i.e. 1% (10 m per km).</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Geomorphology: Savindra Singh; Thornbury</li>
<li>Structural Geology: M.P. Billings; Haakon Fossen</li>
<li>Mineralogy: Dana; Klein &amp; Hurlbut</li>
<li>Petrology: Tyrrell; Best</li>
<li>Stratigraphy: M.S. Krishnan; Ravindra Kumar</li>
<li>Palaeontology: Jain &amp; Anantharaman; Moore, Lalicker &amp; Fischer</li>
<li>Economic Geology: Umeshwar Prasad; Bateman</li>
<li>Hydrogeology: Todd; Raghunath</li>
<li>Remote Sensing: Sabins; Bhatia</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Confusing strike with dip direction; always state both with bearings.</li>
<li>Mixing the geological time scale periods and eras.</li>
<li>Describing ore deposits without naming the genetic process.</li>
<li>Ignoring Indian examples — UPSC expects Indian stratigraphy and mineral belts.</li>
<li>Drawing unlabelled cross-sections.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Use labelled diagrams for folds, faults, unconformities, landforms and stratigraphic columns. Answer structure: definition → process/mechanism → Indian example → diagram → significance. Prepare a one-page geological time scale and an Indian mineral map for revision.</div></div>`,
    qs: [
      { text: 'The hardness of quartz on Mohs scale is:', options: ['5', '6', '7', '8'], correct: 2, sol: 'Mohs scale: talc 1, gypsum 2, calcite 3, fluorite 4, apatite 5, orthoclase 6, quartz 7, topaz 8, corundum 9, diamond 10.' },
      { text: 'The most abundant mineral group in the Earth’s crust is:', options: ['Quartz', 'Feldspar', 'Mica', 'Olivine'], correct: 1, sol: 'Feldspars (plagioclase and orthoclase) make up about 60% of the crust, followed by quartz.' },
      { text: 'New oceanic crust is formed at:', options: ['Convergent boundaries', 'Divergent boundaries', 'Transform boundaries', 'Passive margins'], correct: 1, sol: 'At divergent (constructive) boundaries, magma rises and solidifies to form new oceanic crust, as at the Mid-Atlantic Ridge.' },
      { text: 'The Deccan Traps are composed mainly of:', options: ['Granite', 'Basalt', 'Limestone', 'Sandstone'], correct: 1, sol: 'The Deccan Traps are flood basalts erupted around 66 million years ago during the Cretaceous–Palaeogene transition.' },
      { text: 'The attitude of a rock bed is described by:', options: ['Strike and dip', 'Colour and texture', 'Grain size and sorting', 'Porosity and permeability'], correct: 0, sol: 'Strike is the direction of the line of intersection of a bed with the horizontal; dip is the angle of inclination perpendicular to strike.' }
    ]
  },
  'opt-geology/paper1': {
    html: `<h3>Geology Paper I — Geomorphology, Structural Geology, Petrology and Stratigraphy</h3>
<h3>Geomorphology</h3>
<ul>
<li><strong>Weathering:</strong> physical (frost, exfoliation, salt), chemical (solution, oxidation, hydrolysis), biological; produces regolith and soils.</li>
<li><strong>Fluvial landforms:</strong> V-shaped valleys, waterfalls, meanders, oxbow lakes, floodplains, deltas, alluvial fans; erosion and deposition processes.</li>
<li><strong>Glacial landforms:</strong> cirques, arêtes, horns, U-shaped valleys, moraines, drumlins, eskers, outwash plains.</li>
<li><strong>Aeolian and coastal:</strong> barchans, seif dunes, loess; cliffs, wave-cut platforms, spits, bars, lagoons.</li>
<li><strong>Karst:</strong> limestone solution — sinkholes, caves, stalactites, stalagmites, karst topography.</li>
<li><strong>Geomorphic cycles:</strong> Davis’s cycle of erosion (youth, maturity, old age) and Penck’s alternative; polycyclic landscapes.</li>
</ul>
<h3>Structural Geology</h3>
<ul>
<li><strong>Folds:</strong> anticline, syncline, monocline, recumbent, isoclinal; hinge, limb, axial plane, plunge.</li>
<li><strong>Faults:</strong> normal, reverse, thrust, strike-slip, oblique; hanging wall and footwall; fault breccia and gouge.</li>
<li><strong>Joints and fractures:</strong> systematic and non-systematic; joint sets and their relation to stress.</li>
<li><strong>Unconformities:</strong> angular, non-conformity, disconformity, paraconformity.</li>
<li><strong>Cleavage and foliation:</strong> slaty cleavage, schistosity, gneissosity; relation to folding.</li>
</ul>
<h3>Petrology</h3>
<ul>
<li><strong>Igneous:</strong> classification by composition (felsic–mafic) and texture (phaneritic, aphanitic, porphyritic, glassy, vesicular); Bowen’s reaction series; magmatic differentiation, assimilation, fractional crystallisation.</li>
<li><strong>Sedimentary:</strong> clastic, chemical and organic; textures, sorting, roundness, sedimentary structures (cross-bedding, graded bedding, ripples); diagenesis.</li>
<li><strong>Metamorphic:</strong> contact and regional metamorphism; facies series; index minerals; P–T paths; migmatites.</li>
</ul>
<h3>Stratigraphy</h3>
<ul>
<li><strong>Principles:</strong> superposition, original horizontality, lateral continuity, cross-cutting relations, faunal succession.</li>
<li><strong>Geological time scale:</strong> Archaean, Proterozoic, Palaeozoic, Mesozoic, Cenozoic; key boundaries and events.</li>
<li><strong>Indian stratigraphy:</strong> Dharwar Supergroup, Cuddapah, Vindhyan, Palaeozoic Tethyan sequences, Gondwana coal measures, Deccan Traps, Siwaliks.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Normal vs Reverse Fault</div><div class="ex-text">Question: Distinguish a normal fault from a reverse fault.</div><div class="ex-soln">Answer: In a normal fault the hanging wall moves down relative to the footwall, caused by extension; the fault plane dips steeply. In a reverse fault the hanging wall moves up relative to the footwall, caused by compression; a low-angle reverse fault is a thrust. Normal faults produce grabens and horsts; reverse faults produce thrust sheets and fold-thrust belts.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Reversing hanging wall and footwall in fault diagrams.</li>
<li>Confusing cleavage with bedding.</li>
<li>Naming a rock by colour instead of mineral composition and texture.</li>
<li>Mixing Gondwana and Vindhyan ages.</li>
<li>Forgetting to label the geological time scale correctly.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Draw block diagrams for faults and folds, labelled stratigraphic columns and P–T diagrams for metamorphism. Use Indian examples in every answer (Deccan Traps, Aravalli, Himalaya, Gondwana basins). Quote field evidence and textures rather than only definitions.</div></div>`,
    qs: [
      { text: 'In a normal fault, the hanging wall moves:', options: ['Up relative to the footwall', 'Down relative to the footwall', 'Parallel to strike only', 'Horizontally past the footwall'], correct: 1, sol: 'Normal faults form under extension; the hanging wall drops down relative to the footwall.' },
      { text: 'An unconformity where sedimentary beds lie on folded and eroded older rocks is called:', options: ['Disconformity', 'Angular unconformity', 'Paraconformity', 'Non-conformity'], correct: 1, sol: 'An angular unconformity shows tilted or folded older beds truncated by erosion and overlain by flat-lying younger beds.' },
      { text: 'Bowen’s reaction series predicts that the first mineral to crystallise from a cooling mafic magma is:', options: ['Quartz', 'Olivine', 'Muscovite', 'Orthoclase'], correct: 1, sol: 'Olivine crystallises first at high temperature in the discontinuous branch of Bowen’s series; quartz crystallises last at low temperature.' },
      { text: 'Gondwana coal measures in India belong to the:', options: ['Archaean', 'Palaeozoic–Mesozoic', 'Tertiary', 'Quaternary'], correct: 1, sol: 'The Gondwana Supergroup ranges from the Upper Carboniferous to the Jurassic, hosting most of India’s coal.' },
      { text: 'Slaty cleavage is best developed in:', options: ['Granite', 'Basalt', 'Low-grade metamorphosed shale', 'Limestone'], correct: 2, sol: 'Slaty cleavage forms in low-grade regional metamorphism of shale, aligning platy minerals perpendicular to maximum stress.' }
    ]
  },
  'opt-geology/paper2': {
    html: `<h3>Geology Paper II — Palaeontology, Economic Geology, Hydrogeology and Remote Sensing</h3>
<h3>Palaeontology</h3>
<ul>
<li><strong>Fossilisation:</strong> petrification, carbonisation, moulds and casts, trace fossils, amber and ice preservation.</li>
<li><strong>Microfossils:</strong> foraminifera, ostracods, conodonts, spores and pollen; biostratigraphy and palaeoclimate.</li>
<li><strong>Index fossils:</strong> short stratigraphic range and wide geographic distribution — ammonites, graptolites, trilobites.</li>
<li><strong>Indian fossil records:</strong> Gondwana flora (Glossopteris), Siwalik mammals, dinosaurs of Lameta beds, marine Cretaceous faunas.</li>
</ul>
<h3>Economic Geology</h3>
<ul>
<li><strong>Ore genesis:</strong> magmatic segregation, hydrothermal, sedimentary, residual, metamorphic and supergene enrichment.</li>
<li><strong>Indian deposits:</strong> iron ore (Bailadila, Kudremukh, Noamundi), manganese (Balaghat, Keonjhar), bauxite (Odisha), copper (Khetri, Malanjkhand), gold (Kolar, Hutti), coal and petroleum.</li>
<li><strong>Exploration:</strong> geological mapping, geophysical methods (gravity, magnetic, seismic, resistivity), geochemical sampling, drilling.</li>
</ul>
<h3>Hydrogeology</h3>
<ul>
<li><strong>Aquifers:</strong> confined and unconfined; porosity, permeability, specific yield, transmissivity.</li>
<li><strong>Darcy’s law:</strong> Q = K·A·(dh/dL), where K is hydraulic conductivity and dh/dL is the hydraulic gradient.</li>
<li><strong>Wells:</strong> water table, drawdown, cone of depression, pumping tests, specific capacity.</li>
<li><strong>Groundwater provinces of India:</strong> Indo-Gangetic alluvial plains, peninsular crystalline, Deccan trap, coastal and Himalayan provinces.</li>
</ul>
<h3>Remote Sensing and Applied Geology</h3>
<ul>
<li><strong>Remote sensing:</strong> electromagnetic spectrum, passive and active sensors, platforms (satellite, airborne), resolutions — spatial, spectral, radiometric, temporal.</li>
<li><strong>GIS and GPS:</strong> layers, raster and vector data, overlay analysis, digital elevation models.</li>
<li><strong>Applications:</strong> mineral exploration, groundwater targeting, landslide hazard mapping, land-use planning, environmental monitoring.</li>
<li><strong>Engineering geology:</strong> rock mass classification, slope stability, tunnel and dam site investigation.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Darcy’s Law</div><div class="ex-text">Question: An aquifer has hydraulic conductivity 10 m/day, cross-sectional area 100 m² and hydraulic gradient 0.1. Find the discharge.</div><div class="ex-soln">Answer: Q = K·A·i = 10 × 100 × 0.1 = 100 m³/day.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Confusing porosity with permeability.</li>
<li>Naming an ore deposit without its genetic class.</li>
<li>Mixing spectral with spatial resolution.</li>
<li>Using distant foreign examples instead of Indian mineral belts.</li>
<li>Forgetting units in Darcy’s law calculations.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Pair every concept with an Indian example and a sketch: a stratigraphic range chart for fossils, a mineral belt map, a groundwater cross-section, a remote-sensing workflow. For applied questions, structure answers as site investigation → method → interpretation → recommendation.</div></div>`,
    qs: [
      { text: 'An index fossil should have:', options: ['A long stratigraphic range and narrow distribution', 'A short stratigraphic range and wide distribution', 'No hard parts', 'Only a local distribution'], correct: 1, sol: 'Index (zone) fossils are geographically widespread but existed for a short time, allowing precise correlation.' },
      { text: 'Darcy’s law describes:', options: ['Groundwater flow through porous media', 'Magmatic differentiation', 'Seismic wave propagation', 'Radioactive decay'], correct: 0, sol: 'Darcy’s law relates discharge to hydraulic conductivity, cross-sectional area and hydraulic gradient in porous media.' },
      { text: 'The highest grade of coal is:', options: ['Peat', 'Lignite', 'Bituminous', 'Anthracite'], correct: 3, sol: 'Coal rank increases from peat → lignite → bituminous → anthracite, with anthracite having the highest carbon content.' },
      { text: 'Kudremukh iron ore deposits are located in:', options: ['Jharkhand', 'Odisha', 'Karnataka', 'Chhattisgarh'], correct: 2, sol: 'Kudremukh in Karnataka is a major magnetite iron ore deposit; Bailadila is in Chhattisgarh and Noamundi in Jharkhand.' },
      { text: 'The number of spectral bands recorded by a sensor determines its:', options: ['Spatial resolution', 'Spectral resolution', 'Radiometric resolution', 'Temporal resolution'], correct: 1, sol: 'Spectral resolution refers to the number and width of wavelength bands a sensor can distinguish.' }
    ]
  },
  'opt-mechanical-engineering/overview': {
    html: `<h3>Mechanical Engineering Optional — Syllabus Map &amp; Strategy</h3>
<p>Mechanical Engineering has two papers of 250 marks each. Paper I is thermodynamics, fluid mechanics and mechanics of materials (with theory of machines); Paper II is manufacturing, design, heat transfer and industrial engineering. Numericals and neat sketches decide the score.</p>
<h3>Paper I — Thermal, Fluid and Solid Mechanics</h3>
<ul>
<li><strong>Thermodynamics:</strong> laws, entropy, availability, thermodynamic cycles (Carnot, Rankine, Brayton, Otto, Diesel), steam and psychrometry, refrigeration.</li>
<li><strong>Fluid Mechanics:</strong> fluid properties, statics, Bernoulli, viscous flow, pipe losses, boundary layers, drag and lift, turbomachinery.</li>
<li><strong>Mechanics of Materials:</strong> stress–strain, Mohr’s circle, bending and shear, torsion, columns, failure theories, strain energy.</li>
<li><strong>Theory of Machines:</strong> kinematics, cams, gears, governors, balancing, vibrations.</li>
</ul>
<h3>Paper II — Design, Manufacturing and Industrial Engineering</h3>
<ul>
<li><strong>Manufacturing Processes:</strong> casting, forming, machining, welding, metrology, CNC and automation.</li>
<li><strong>Machine Design:</strong> static and fatigue design, joints, shafts, bearings, gears, springs, brakes, clutches, belts.</li>
<li><strong>Heat Transfer:</strong> conduction, convection, radiation, heat exchangers (LMTD, NTU).</li>
<li><strong>Industrial Engineering:</strong> work study, production planning, inventory control (EOQ), quality control, operations research.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Carnot Efficiency</div><div class="ex-text">Question: A heat engine operates between 600 K and 300 K. Find its maximum possible efficiency.</div><div class="ex-soln">Answer: η = 1 − T_c/T_h = 1 − 300/600 = 0.5 = 50%. No real engine between these temperatures can exceed this.</div></div>
<h3>Standard Sources</h3>
<ul>
<li>Thermodynamics: P.K. Nag; Cengel &amp; Boles</li>
<li>Fluid Mechanics: R.K. Bansal; Fox &amp; McDonald</li>
<li>Mechanics of Materials: R.K. Bansal; Hibbeler; Gere &amp; Timoshenko</li>
<li>Theory of Machines: S.S. Rattan; R.S. Khurmi</li>
<li>Manufacturing: P.N. Rao; Kalpakjian &amp; Schmid</li>
<li>Machine Design: V.B. Bhandari; Shigley</li>
<li>Heat Transfer: D.S. Kumar; Incropera</li>
<li>Industrial Engineering: O.P. Khanna; Buffa &amp; Sarin</li>
</ul>
<h3>Common Traps</h3>
<ul>
<li>Using the wrong sign convention in thermodynamics.</li>
<li>Forgetting to convert units (bar to Pa, °C to K).</li>
<li>Applying Bernoulli across a pump or turbine without the work term.</li>
<li>Confusing endurance limit with yield strength.</li>
<li>Skipping free-body diagrams in mechanics of materials answers.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Answer format: given data → assumptions → governing equation → substitution with units → result → sketch. Draw T–s, p–v, h–s diagrams and free-body diagrams. Practise past-year numericals and keep formula sheets per unit.</div></div>`,
    qs: [
      { text: 'The efficiency of a Carnot engine depends only on:', options: ['The working fluid', 'Source and sink temperatures', 'Engine speed', 'Piston material'], correct: 1, sol: 'Carnot efficiency η = 1 − T_c/T_h depends only on the absolute temperatures of the source and sink, not on the working fluid.' },
      { text: 'Bernoulli’s equation is valid for:', options: ['Compressible viscous flow', 'Steady, incompressible, inviscid flow along a streamline', 'Turbulent flow only', 'Flow through porous media'], correct: 1, sol: 'Bernoulli’s equation applies to steady, incompressible, frictionless flow along a streamline.' },
      { text: 'The maximum shear stress in a material subjected to principal stresses σ₁ and σ₂ (σ₁ > σ₂) is:', options: ['(σ₁ + σ₂)/2', '(σ₁ − σ₂)/2', 'σ₁ − σ₂', 'σ₁σ₂'], correct: 1, sol: 'Maximum shear stress τ_max = (σ₁ − σ₂)/2, represented by the radius of Mohr’s circle.' },
      { text: 'The Reynolds number for transition from laminar to turbulent flow in a pipe is approximately:', options: ['200', '2000–4000', '20000', '200000'], correct: 1, sol: 'Pipe flow is generally laminar below Re ≈ 2000 and turbulent above Re ≈ 4000; between them the flow is transitional.' },
      { text: 'In a Rankine cycle, efficiency can be improved by:', options: ['Reducing boiler pressure', 'Superheating steam and regeneration', 'Increasing condenser pressure', 'Using wet steam only'], correct: 1, sol: 'Superheating raises the average temperature of heat addition; regeneration and reheating also improve Rankine cycle efficiency.' }
    ]
  },
  'opt-mechanical-engineering/paper1': {
    html: `<h3>Mechanical Engineering Paper I — Thermodynamics, Fluid Mechanics and Mechanics of Materials</h3>
<h3>Thermodynamics</h3>
<ul>
<li><strong>Zeroth law:</strong> thermal equilibrium and temperature.</li>
<li><strong>First law:</strong> energy conservation; closed-system and steady-flow energy equations.</li>
<li><strong>Second law:</strong> Kelvin–Planck and Clausius statements; entropy; reversible and irreversible processes; availability and irreversibility.</li>
<li><strong>Cycles:</strong> Carnot, Rankine, Brayton, Otto, Diesel, dual; mean effective pressure; air-standard assumptions.</li>
<li><strong>Steam and psychrometry:</strong> properties, Mollier chart, dry and wet bulb temperature, humidity ratio.</li>
<li><strong>Refrigeration:</strong> vapour-compression cycle, COP, refrigerants.</li>
</ul>
<h3>Fluid Mechanics</h3>
<ul>
<li><strong>Properties:</strong> density, viscosity, surface tension, capillarity, compressibility.</li>
<li><strong>Statics:</strong> pressure distribution, manometers, forces on submerged surfaces, buoyancy.</li>
<li><strong>Dynamics:</strong> continuity, Bernoulli, momentum equation, flow measurement (orifice, venturi, notches).</li>
<li><strong>Viscous flow:</strong> laminar and turbulent pipe flow, Darcy–Weisbach friction factor, minor losses, boundary layer, separation, drag and lift.</li>
<li><strong>Turbomachinery:</strong> pumps, turbines, specific speed, cavitation.</li>
</ul>
<h3>Mechanics of Materials</h3>
<ul>
<li><strong>Stress–strain:</strong> elastic constants, Hooke’s law, Poisson’s ratio, thermal stresses.</li>
<li><strong>Shear force and bending moment:</strong> diagrams for beams under point, uniform and varying loads.</li>
<li><strong>Bending and shear stresses:</strong> flexure formula, shear formula, section modulus.</li>
<li><strong>Torsion:</strong> circular shafts, power transmission, combined bending and torsion.</li>
<li><strong>Columns:</strong> Euler and Rankine–Gordon formulas, slenderness ratio.</li>
<li><strong>Failure theories:</strong> maximum principal stress, maximum shear stress, von Mises, strain energy.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Thermal Stress</div><div class="ex-text">Question: A steel rod of length 2 m, area 500 mm², E = 200 GPa is heated by 50°C with both ends fixed. Find the thermal stress (α = 12 × 10⁻⁶/°C).</div><div class="ex-soln">Answer: Free expansion = αLΔT; prevented strain = αΔT = 12 × 10⁻⁶ × 50 = 6 × 10⁻⁴. Stress = E × strain = 200 × 10⁹ × 6 × 10⁻⁴ = 120 × 10⁶ Pa = 120 MPa (compressive).</div></div>
<h3>Common Traps</h3>
<ul>
<li>Mixing gauge and absolute pressures.</li>
<li>Using Bernoulli across a machine without including work or head terms.</li>
<li>Drawing bending moment diagrams with wrong sign conventions.</li>
<li>Forgetting stress concentration in combined loading.</li>
<li>Using Euler’s formula beyond the elastic limit.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Always draw the system, free-body diagram and T–s or p–v sketch. State assumptions explicitly (ideal gas, steady flow, neglect losses). Show unit conversions in a separate line. For derivation questions, define every symbol before using it.</div></div>`,
    qs: [
      { text: 'For an ideal gas, the relation between Cp and Cv is:', options: ['Cp = Cv', 'Cp − Cv = R', 'Cp + Cv = R', 'Cp/Cv = R'], correct: 1, sol: 'For an ideal gas, Mayer’s relation gives Cp − Cv = R, the gas constant.' },
      { text: 'The hydraulic diameter of a circular pipe of diameter D is:', options: ['D', 'D/2', '2D', '4D'], correct: 0, sol: 'Hydraulic diameter D_h = 4A/P = 4(πD²/4)/(πD) = D for a full circular pipe.' },
      { text: 'Euler’s buckling load for a column with both ends hinged is:', options: ['π²EI/L²', '4π²EI/L²', 'π²EI/(4L²)', '2π²EI/L²'], correct: 0, sol: 'For hinged–hinged ends the effective length equals L, so P_cr = π²EI/L².' },
      { text: 'The maximum principal stress theory is most suitable for:', options: ['Ductile materials', 'Brittle materials', 'Rubber', 'Composite laminates only'], correct: 1, sol: 'Brittle materials fail by fracture, so the maximum principal stress (Rankine) theory predicts failure reasonably well.' },
      { text: 'In a steady-flow energy equation for a turbine, the work output appears as:', options: ['A negative enthalpy change plus kinetic and potential changes', 'A rise in internal energy only', 'Zero', 'Heat added only'], correct: 0, sol: 'For a turbine, work output equals the decrease in enthalpy plus kinetic and potential energy changes of the fluid.' }
    ]
  },
  'opt-mechanical-engineering/paper2': {
    html: `<h3>Mechanical Engineering Paper II — Manufacturing, Machine Design, Heat Transfer and Industrial Engineering</h3>
<h3>Manufacturing Processes</h3>
<ul>
<li><strong>Casting:</strong> sand casting, patterns, gating and risering, shrinkage, defects; investment, die and centrifugal casting.</li>
<li><strong>Forming:</strong> forging, rolling, extrusion, drawing, sheet-metal operations; hot and cold working.</li>
<li><strong>Machining:</strong> turning, milling, drilling, grinding; tool geometry, tool wear, cutting forces, machinability.</li>
<li><strong>Welding:</strong> arc, gas, resistance, TIG, MIG, submerged arc; weld defects and inspection.</li>
<li><strong>Metrology and automation:</strong> limits, fits, tolerances, gauges; NC, CNC and robotics.</li>
</ul>
<h3>Machine Design</h3>
<ul>
<li><strong>Design philosophy:</strong> static and fatigue design, factor of safety, stress concentration, S–N curve, endurance limit.</li>
<li><strong>Joints:</strong> bolted, riveted, welded; eccentric loading.</li>
<li><strong>Components:</strong> shafts, keys, couplings, bearings, gears, springs, belts, brakes and clutches.</li>
<li><strong>Codes and standards:</strong> preferred numbers, fits, materials selection.</li>
</ul>
<h3>Heat Transfer</h3>
<ul>
<li><strong>Conduction:</strong> Fourier’s law, composite walls, fins, transient conduction.</li>
<li><strong>Convection:</strong> Newton’s law of cooling, forced and free convection, dimensionless numbers (Re, Pr, Nu, Gr), correlations.</li>
<li><strong>Radiation:</strong> Stefan–Boltzmann law, blackbody and greybody, view factors.</li>
<li><strong>Heat exchangers:</strong> LMTD and NTU methods, effectiveness, fouling.</li>
</ul>
<h3>Industrial Engineering</h3>
<ul>
<li><strong>Work study:</strong> method study, time study, work measurement, ergonomics.</li>
<li><strong>Production planning and control:</strong> forecasting, scheduling, MRP, lean manufacturing.</li>
<li><strong>Inventory control:</strong> EOQ, safety stock, ABC analysis.</li>
<li><strong>Quality control:</strong> control charts, acceptance sampling, Six Sigma; operations research basics.</li>
</ul>
<div class="example-box"><div class="ex-title">Solved Example: LMTD of a Heat Exchanger</div><div class="ex-text">Question: A heat exchanger has terminal temperature differences of 100°C and 50°C. Find the LMTD.</div><div class="ex-soln">Answer: LMTD = (ΔT₁ − ΔT₂)/ln(ΔT₁/ΔT₂) = (100 − 50)/ln(100/50) = 50/0.693 ≈ 72.1°C.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Forgetting the riser in casting questions — it compensates solidification shrinkage.</li>
<li>Confusing endurance limit with yield strength.</li>
<li>Using arithmetic mean temperature difference instead of LMTD.</li>
<li>Mixing EOQ carrying and ordering costs.</li>
<li>Ignoring tool wear and surface finish in machining answers.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For design answers: state the load, material, failure criterion and factor of safety, then show the calculation. For manufacturing, use flow diagrams and sketch tool–work interaction. For heat transfer, always draw the temperature profile and label boundary conditions.</div></div>`,
    qs: [
      { text: 'In sand casting, the riser is provided to:', options: ['Increase mould strength', 'Compensate solidification shrinkage', 'Remove gases', 'Improve surface finish'], correct: 1, sol: 'The riser acts as a reservoir of molten metal that feeds the casting as it solidifies and shrinks.' },
      { text: 'The S–N curve is used to determine:', options: ['Fatigue strength', 'Yield strength', 'Hardness', 'Toughness'], correct: 0, sol: 'The S–N curve plots stress amplitude against number of cycles to failure and gives the fatigue (endurance) limit.' },
      { text: 'Fourier’s law of conduction states that heat flux is proportional to:', options: ['Temperature difference', 'Temperature gradient', 'Surface area only', 'Time'], correct: 1, sol: 'q = −kA(dT/dx); heat flow is proportional to the temperature gradient and area, with k as thermal conductivity.' },
      { text: 'The economic order quantity (EOQ) is given by:', options: ['√(2DS/H)', '√(DS/H)', '2DS/H', '√(D/2SH)'], correct: 0, sol: 'EOQ = √(2DS/H), where D is annual demand, S ordering cost and H holding cost per unit per year.' },
      { text: 'TIG welding uses:', options: ['A consumable electrode', 'A non-consumable tungsten electrode', 'Only oxy-acetylene flame', 'Friction only'], correct: 1, sol: 'Tungsten inert gas (TIG) welding uses a non-consumable tungsten electrode with an inert shielding gas.' }
    ]
  }
};

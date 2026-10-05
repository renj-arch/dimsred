(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC3_PROD = {};
SSC_JE_ENC3_PROD.production = [
      P("Which geometry is CORRECT for an HSS single-point turning tool cutting mild steel?",
        "Positive back rake of about 8°–15° and a side clearance of 6°–8°",
        "Rake guides the chip; clearance avoids rubbing",
        "HSS turning tools use a positive back rake (roughly 8°–15°) so chips escape up the face easily on mild steel, and a side clearance of 6°–8° so the flank never rubs the fresh surface. Carbide and hard workpieces move toward small or negative rakes."),

      P("Which material is assigned a machinability rating of 100 % in machinability tables?",
        "AISI 1112 (free-cutting sulphurised mild steel)",
        "The benchmark is a resulphurised free-cutting steel",
        "Machinability index compares everything to AISI 1112, taken as 100 %. Free-cutting brasses and aluminium rate above 100 %; alloy and stainless steels fall to 40–70 %. Higher is easier to machine."),

      P("Calculate cutting speed Z from Z = πDN/1000 for a 100 mm diameter job turning at 300 rpm.",
        "94.25 m/min",
        "π × 100 × 300 / 1000",
        "Z = πDN/1000 = π × 100 × 300/1000 = 94247.8/1000 = 94.25 m/min. Diameter in mm and rpm in rev/min give speed in m/min directly."),

      P("Find the spindle rpm needed to turn an 80 mm shaft at a cutting speed of 120 m/min.",
        "477.5 rpm",
        "N = 1000Z / (πD)",
        "N = 1000 × 120/(π × 80) = 120000/251.33 = 477.5 rpm. Small diameters must spin faster for the same cutting speed."),

      P("Turning 150 mm length once at feed 0.5 mm/rev and 300 rpm. What is the machining time?",
        "1 minute",
        "T = L/(f × N)",
        "T = L/(fN) = 150/(0.5 × 300) = 150/150 = 1 min. For several passes, multiply by the number of passes."),

      P("At cutting speed 100 m/min, feed 0.25 mm/rev and depth of cut 2 mm, the metal removal rate is...",
        "50 cm³/min",
        "MRR = v × f × d",
        "MRR = 100 × 0.25 × 2 = 50 cm³/min. Doubling feed or depth roughly doubles MRR, limited by tool and spindle power."),

      P("Power to cut: axial force 800 N at a cutting speed of 120 m/min. What is the power in kW?",
        "1.6 kW",
        "P = F × v / 60000",
        "P = F × v/60000 = 800 × 120/60000 = 96000/60000 = 1.6 kW. The 60000 factor converts N·m/min to kilowatts."),

      P("Assertion (A): An M10 × 1.5 thread calls for an 8.5 mm tapping drill. Reason (R): tapping drill diameter ≈ nominal diameter minus pitch.",
        "Both A and R are true and R explains A",
        "Drill = D − p",
        "Drill dia = 10 − 1.5 = 8.5 mm, giving about 75 % thread engagement — strong yet easy to tap. The D − p rule holds for ISO coarse threads; fine threads or special engagement need adjustment."),

      P("Select the correct tapping drill size for an M12 × 1.75 thread.",
        "10.25 mm",
        "12 − 1.75",
        "Tapping drill = 12 − 1.75 = 10.25 mm. It gives roughly 75 % thread height. For blind holes allow extra depth and use plug then bottoming taps."),

      P("Which statement about reaming is CORRECT?",
        "Removes only 0.1–0.4 mm stock at about half the drilling speed, with higher feed, and must never be reversed in the hole",
        "Light stock, slow speed, never reverse",
        "Reaming removes a thin allowance to size a hole accurately (0.1–0.4 mm) at roughly 50 % of drilling speed with 2–3 times the feed. Reversing a reamer snaps its edges; running it fast dulls and bell-mouths the cut."),

      P("The FINEST surface finish among these processes is given by...",
        "Lapping (Ra ≈ 0.05–0.1 µm, superfinishing to ≈ 0.012 µm)",
        "Turn 1.6–6.3, grind 0.4–1.6, hone 0.1–0.4, lap 0.05–0.1 µm",
        "Finishes: turning/milling Ra ≈ 1.6–6.3 µm, grinding 0.4–1.6 µm, honing 0.1–0.4 µm, lapping 0.05–0.1 µm and superfinishing better. Lapping rubs loose abrasive between lap and part for mirror finishes."),

      P("For ordinary turned surfaces, Rmax expressed against the CLA (Ra) value is usually about...",
        "4 to 5 times the CLA value",
        "Peak-to-valley far exceeds the average",
        "Rmax (total peak-to-valley height) is typically 4–5 times the centre-line average. A 3.2 µm CLA (N8) finish may read 13–16 µm Rmax. The ratio depends on the profile shape, not a fixed law."),

      P("Surface-finish grade N7 corresponds to a CLA (Ra) of...",
        "1.6 µm",
        "N6 0.8, N7 1.6, N8 3.2 µm",
        "Ra values double per grade from N1: N5 0.4, N6 0.8, N7 1.6, N8 3.2, N9 6.3, N10 12.5 µm. N7 (1.6 µm) is a typical finish-turning or grinding result."),

      P("Grinding wheel marked A46K5V is decoded as...",
        "A = aluminium oxide, 46 = grit size, K = medium grade, 5 = fairly open structure, V = vitrified bond",
        "Abrasive, grit, grade, structure, bond",
        "A46K5V: A = aluminium oxide abrasive, 46 = grain number (about 0.35 mm), K = medium hardness, 5 = open structure for coolant access, V = vitrified bond, the favourite for tool-room grinding."),

      P("Choose the TRUE statement about the vitrified bond in grinding wheels.",
        "It is rigid, strong and porous, holds grains firmly, resists coolant, and is the standard bond for precision grinding wheels",
        "Vitrified = glassy ceramic bond",
        "Vitrified wheels bond grains with fired clay and glass, giving exactly the rigidity and porosity a precision wheel needs. They cut cool with coolant but are brittle — a dropped or unguarded wheel is dangerous."),

      P("SMAW electrode E6013: the designation means...",
        "E = electrode, 60 = 60000 psi tensile, 1 = all-position welding, 3 = rutile (titanium-dioxide) coating usable on AC and DC",
        "Tensile psi, position, coating",
        "E6013: 60000 psi, position 1 = all positions, coating 3 = rutile — a smooth, low-spatter AC/DC electrode ideal for clean thin sheet and downhand work. E7018 is the basic low-hydrogen coating needing DC+ and dry storage."),

      P("Assertion (A): Hardenable steels need preheating before welding. Reason (R): Preheating slows the cooling rate and avoids hard, crack-prone martensite and hydrogen entrapment in the HAZ.",
        "Both A and R are true and R explains A",
        "Control the cooling gradient",
        "Preheating reduces the cooling rate so the heat-affected zone forms ferrite and pearlite rather than untempered martensite, and lets hydrogen diffuse away before it embrittles. Alloy and thick sections raise preheat to 150–400 °C."),

      P("Correct statement for TIG welding of aluminium.",
        "Tungsten, non-consumable; argon shielding; alternating current for the cathodic cleaning of the oxide film",
        "Aluminium needs AC cleaning",
        "In TIG the tungsten tip does not melt into the weld. DCEN penetrates steel best, but aluminium's tenacious oxide skin is broken by the positive half cycle of AC, which scrubs the surface, so AC with argon is the aluminium recipe."),

      P("Welding current for a 5 mm SMAW electrode if I ≈ 45–55 A per mm of core-wire diameter.",
        "225–275 A",
        "45 × 5 to 55 × 5",
        "I = 45 × 5 = 225 A up to 55 × 5 = 275 A. Too low a current fuses poorly; too high spatters and undercuts. A 4 mm electrode runs about 180–220 A."),

      P("Deep drawing: blank diameter D = √(d² + 4dh) for a cup 50 mm in diameter and 30 mm deep.",
        "92.2 mm",
        "D = √(d² + 4dh)",
        "D = √(50² + 4 × 50 × 30) = √(2500 + 6000) = √8500 = 92.2 mm. Area is conserved in drawing; a trimming allowance is added to this theoretical value."),

      P("Force to blank a 50 mm disc from 2 mm sheet whose shear strength is 300 N/mm².",
        "94.2 kN ≈ 9.6 tonne-force",
        "F = πDtτ",
        "F = π × 50 × 2 × 300 = 94248 N = 94.2 kN ≈ 9.6 tonne-force (divide by 9.81). Choose a press rated well above this; sharpened blanking edges and a shear angle on the die reduce the peak force."),

      P("Recommended rivet shank diameter for plates of 16 mm combined thickness using d ≈ 1.5√t to 1.75√t.",
        "6 to 7 mm",
        "1.5 × 4 and 1.75 × 4",
        "√16 = 4, therefore d = 1.5 × 4 = 6 mm up to 1.75 × 4 = 7 mm. The rivet is proportioned to fill the hole completely and still form a sound closing head."),

      P("A gating ratio of 4 : 8 : 3 (sprue : runner : ingate) describes...",
        "An unpressurised system choked at the ingate; the runner runs full and metal enters the mould gently with little turbulence",
        "The ingate is the choke here",
        "With 4:8:3 the smallest area is the ingate (3), which alone controls the flow; sprue and runner stay full at low velocity so filling is calm and clean. The 1:2:4 system is the pressurised alternative choked at the sprue."),

      P("For steel castings the riser is normally sized to...",
        "Feed the roughly 3 % liquid shrinkage with a modulus 1.1–1.2 times the casting modulus and riser-to-casting volume ratios of about 3 : 1",
        "Steel liquid shrinkage ≈ 3 %",
        "Steel contracts about 3 % from pouring to freezing, so the riser must outlive the casting (modulus 1.1–1.2 × Mc) and hold several times the shrinkage volume. Aluminium and ductile iron shrink far less and need smaller risers."),

      P("Estimate the melting rate in tonnes/hour of a 1 m internal-diameter cold-blast cupola using M ≈ 0.9D².",
        "0.9 tonne/hour",
        "M = 0.9 × 1²",
        "M = 0.9 × 1² = 0.9 tonnes/hour. Cold-blast cupolas melt near 0.7–1.0 t/h per square metre of grate area; more blast or a richer coke ratio lifts the figure, and hot-blast recuperators add another 20–30 %."),

      P("The draft (taper) allowance applied to vertical pattern faces is normally...",
        "1° to 3° per side",
        "Just enough to withdraw without tearing the mould",
        "A draft of 1°–3° lets the pattern lift out of the sand without breaking the mould walls. Shallow patterns take near 1°, tall or deep-pocketed faces move toward 3°, and internal (core) surfaces get slightly more."),

      P("Select the INCORRECT statement about pattern allowances.",
        "Finish (machining) allowance is provided on surfaces that will not be machined",
        "Finish allowance sits on machined faces",
        "The false statement: machining allowance is given exactly on the faces that WILL be machined. Draft aids pattern withdrawal, shrinkage allowance compensates contraction, camber counters distortion and shake allowance lets the pattern be loosened."),

      P("In pattern colour coding, the faces of a wooden pattern that must be machined are painted...",
        "Red",
        "Red = machined, black = unmachined, yellow = core prints",
        "Red marks surfaces to be machined; black or natural wood shows as-cast surfaces; yellow identifies core prints and core seats. These conventions appear on foundry drawings and pattern-shop practice."),

      P("Why must the riser modulus Mr exceed the casting modulus Mc?",
        "So the riser solidifies after the casting and keeps feeding the liquid needed for final shrinkage",
        "The largest modulus solidifies last",
        "Solidification time rises with the modulus V/A. When Mr > Mc the riser stays molten longer and feeds the casting through the last contraction. Practice sets Mr = 1.1 to 1.2 × Mc for safe feeding."),

      P("The permeability number of a foundry sand measures its...",
        "Gas-transmitting ability — the air flow in cm³/min through a rammed 50.8 mm specimen under a standard pressure",
        "How well the mould vents gases",
        "A permeability test forces air through a rammed cylindrical sand specimen and the flow gives the permeability number. Typical green moulding sands sit at 50–80; too low gives blowholes, too high spoils surface finish."),

      P("Green-sand moulding: which statement is CORRECT?",
        "Adding clay or moisture beyond the optimum raises green strength but cuts permeability, inviting blowholes",
        "Water fills the voids between grains",
        "Clay and water bind the sand grains (green strength) but also fill the voids, choking permeability. The balance decides quality: a mix too stiff cannot vent gas, so gas defects bubble under the surface. Optimum moisture is roughly 3–6 %."),

      P("Assertion (A): Finer moulding sand shows a higher AFS grain fineness number. Reason (R): GFN is a weighted average of retained sieve fractions, and the finer sieves carry higher factors.",
        "Both A and R are true and R explains A",
        "Coarse retentions pull GFN down",
        "Each retained fraction is multiplied by its sieve factor (the mesh number), so fine grains retained on 140-mesh drive the average up. Typical green sand GFN lies between 40 and 70; very fine sands exceed 100."),

      P("Which property belongs to SHELL moulding rather than green-sand moulding?",
        "A thin 6–10 mm resin-bonded sand shell cures on a heated metal pattern, giving accurate castings with smooth surfaces",
        "Resin-bound thin shell",
        "Shell moulding mixes fine silica with about 3–5 % thermosetting resin; the heated pattern cures a thin shell (6–10 mm) which is backed and poured. It yields better accuracy and finish than conventional green sand at higher mould cost."),

      P("Investment (lost-wax) casting is preferred when...",
        "Complex, precise and hard-to-machine shapes such as turbine blades are needed; a wax pattern and ceramic shell remove draft and parting lines",
        "The wax melts out of the shell",
        "In investment casting a wax pattern cluster is dipped in ceramic slurry to build a shell; the wax is melted away, leaving a seamless cavity. Zero draft, superb detail and near-net shape make it ideal for blades, valve bodies and jewellery."),

      P("Which of the following is NOT a casting defect?",
        "Galling",
        "Galling is adhesive wear of rubbing metals",
        "Blowholes, cold shuts, misruns, scabs, hot tears and shifts are genuine sand-casting defects. Galling is the tearing and seizure of sliding metal surfaces, typical of threads and bearings — it belongs to tribology, not the foundry."),

      P("In the true centrifugal casting of a pipe, slag and inclusions collect...",
        "On the inner (bore) surface, which is then machined away",
        "Dense metal flies outward",
        "Centrifugal force drives dense molten metal to the mould wall and floats the lighter slag and inclusions to the free inner surface. Machining the bore removes them, leaving a clean, dense pipe wall outward."),

      P("Hot-chamber die casting is the correct route for...",
        "Zinc, tin and lead alloys, whose liquid metal does not attack the gooseneck; not for aluminium",
        "Aluminium erodes a hot-chamber gooseneck",
        "Hot-chamber machines keep the shot mechanism submerged in the melt — fine for zinc and lead alloys. Aluminium is too hot and chemically reactive, dissolving ferrous goosenecks, so it is cast on cold-chamber machines that ladle metal each cycle."),

      P("The general-purpose twist-drill point angle is...",
        "118°",
        "118° for steel, 130°–140° for hard, 90° for brass",
        "A standard HSS drill is ground to a 118° included point angle, which suits steel and cast iron. Harder materials prefer 130°–140°, brass about 90° for its free-cutting nature; the two lips must cut equally or the hole wanders."),

      P("The web (core) thickness at the point of a standard twist drill equals approximately...",
        "10–15 % of the drill diameter, thickening toward the shank",
        "Web = the central core",
        "The web runs 0.10–0.15 D at the tip and grows toward the shank for rigidity. After repeated sharpening long drills get their web thinned; otherwise the thick chisel edge drags and thrust climbs."),

      P("Drilling a 20 mm hole 60 mm deep: spindle 500 rpm, feed 0.2 mm/rev, approach travel L = depth + 0.3D. What is the machining time?",
        "0.66 minute",
        "L = 60 + 6 = 66; T = 66/(0.2 × 500)",
        "L = 60 + 0.3 × 20 = 66 mm, so T = 66/(0.2 × 500) = 66/100 = 0.66 minute. The 0.3D term covers point engagement and chisel-edge travel."),

      P("Which statement about HONING is correct?",
        "Rotating, reciprocating bonded stones cut a cross-hatch in bores, giving Ra ≈ 0.1–0.4 µm with micron-level size and roundness control",
        "That is the cylinder-bore cross hatch",
        "Honing rotates and oscillates the stones to generate the oil-holding cross-hatch of cylinder bores, with Ra 0.1–0.4 µm. It removes very little stock and corrects size, roundness and finish but cannot alter a hole's position or alignment."),

      P("Boring compared with reaming: which sentence is TRUE?",
        "A single-point boring bar can enlarge a hole and correct its position and straightness; a reamer only sizes it",
        "A reamer follows its own axis",
        "Boring cuts with a single point, so the tool can shift the axis and straighten a drilled hole. A reamer cuts along its own axis — the sized hole is only as straight and centred as the pilot drilled. Boring is the process for positional accuracy."),

      P("Taylor tool-life law: a tool lasts 60 min at 100 m/min. Using VT^0.25 = C, estimate the speed for a 90 min life.",
        "≈ 90 m/min",
        "C = 100 × 60^0.25 = 278.3; V = 278.3/90^0.25",
        "60^0.25 = 2.783, so C = 100 × 2.783 = 278.3. 90^0.25 = 3.081, so V = 278.3/3.081 = 90.3 ≈ 90 m/min. Cutting speed dominates tool life; a small speed rise above the curve destroys the edge."),

      P("The accepted flank-wear limit for carbide turning tools before replacing or regrinding is about...",
        "0.3 to 0.5 mm of wear land (0.4 mm typical)",
        "A bright, growing flank land means tool breakdown",
        "Tools are withdrawn at uniform flank wear VB ≈ 0.4 mm (range 0.3–0.5 mm), or when cratering reaches about 0.1 mm depth or the nose chips. Past this, surface finish and size drift and fracture accelerates."),

      P("Which comparison between HSS and carbide tooling is CORRECT?",
        "Carbide keeps hardness to about 1000 °C and runs 3–5 times faster than HSS; HSS stays tougher for interrupted cuts",
        "HSS softens near 600 °C",
        "HSS loses hardness near 600 °C, capping turning speeds at about 30 m/min on mid steel. Carbide holds to ~1000 °C, permitting 100 m/min and more. But HSS absorbs shock, so it survives interrupted and heavy roughing better than brittle carbide."),

      P("Which cutting-speed window matches textbook practice for steel?",
        "HSS ≈ 25–35 m/min, cemented carbide ≈ 100–150 m/min, ceramic and CBN/PCD reaching 500 m/min and beyond on suitable work",
        "Roughly 30, 120, 500 m/min",
        "Starting points on mid steel: HSS 25–35 m/min and carbide 100–150 m/min. Ceramic and CBN machine cast iron and hardened steel at 300–500 m/min; PCD diamond works aluminium above 1000 m/min. Each tool–work pair has an optimum band."),

      P("Assertion (A): Finish passes on a CNC lathe use constant surface speed. Reason (R): G96 keeps Z = πDN/1000 constant by raising rpm as the diameter falls.",
        "Both A and R are true and R explains A",
        "Small diameter, high rpm",
        "Under G96 the control speeds the spindle as the tool moves to smaller diameters so cutting speed, finish and edge life stay uniform. G97 holds fixed rpm; near the centre G96 would over-rev the spindle, so a G50 clamp is programmed."),

      P("Which CNC code pairing is INCORRECT?",
        "G03 = clockwise arc",
        "G02 is clockwise, G03 counterclockwise",
        "G02 sets a clockwise arc and G03 a counterclockwise one. G00 is rapid traverse, G01 linear feed, G90 absolute programming and G91 incremental. Spindle on clockwise is M03, counterclockwise M04, and M05 stops it."),

      P("In CNC turning, G96 commands...",
        "Constant surface speed — the spindle rpm varies so the surface speed at the tool stays at the programmed m/min",
        "G96 = CSS, G97 = constant rpm",
        "G96 recalculates spindle rpm from the current diameter so the tool always sees one fixed cutting speed, giving uniform finish and tool life. G97 pins a constant rpm regardless of diameter; feed per revolution keeps chip load constant."),

      P("Cutting 24 teeth with a 40 : 1 dividing head: 40/24 = 1⅔ turns. The correct index-plate set-up is...",
        "1 full turn plus 10 holes on the 15-hole circle",
        "40/24 = 1 + 8/24 = 1 + 2/3 = 1 + 10/15",
        "40/24 reduces to 1⅔ = 1 + 10/15, so crank 1 complete turn and 10 holes on a 15-hole circle (10/15 = 2/3). Set the sector arms to span from the start hole through the 10-hole advance."),

      P("The standard worm-to-wheel ratio of a plain dividing head is...",
        "40 : 1 — the crank turns 40 times for one revolution of the workpiece",
        "40 crank turns per work revolution",
        "A 40:1 worm pair means the crank makes 40 turns for every work revolution. Simple indexing then needs n = 40/N turns to generate N teeth, divisions or sides."),

      P("Differential (compound) indexing is used when...",
        "No available hole circle can express the fraction for simple indexing; change gears rotate the plate itself, covering primes like 127",
        "The plate rotates while cranking",
        "Geared or compound indexing drives the index plate through a change-wheel train so the plate moves relative to the crank as you index. It reaches divisions that simple indexing from 40/N cannot express with standard hole circles."),

      P("Which BROACHING statement is TRUE?",
        "A single stroke removes all stock and gives finished size — fast, unskilled work ideal for mass-produced keyways, splines and gear teeth",
        "Rough and finish teeth in one pass",
        "A broach's teeth progress from roughing to semi-finish to finishing, so one pass cuts a keyway, spline or internal tooth form to size. Speed and finish are excellent; the cost lies in the tool, which is shape-dedicated."),

      P("Why is broaching uneconomical for small batches?",
        "Each broach is an expensive, shape-specific tool that only pays off when thousands of identical parts amortise it",
        "One tool, one form",
        "A broach profile is ground for one shape and cannot be reused elsewhere, so tooling cost and regrind burden are high. Large runs of keyways, splines and gear bores repay that cost; a few parts are cheaper by milling or slotting."),

      P("Ultrasonic testing: the TRUE statement is...",
        "It uses 0.5–15 MHz sound pulses and needs a couplant (water, gel or oil) because ultrasonics will not cross an air gap",
        "An air gap blocks the beam",
        "UT runs from about 0.5 MHz (deep penetration in coarse-grained, thick metal) to 15 MHz (finer resolution). A liquid couplant links probe to part; without it nearly all the sound is reflected at the air film and nothing is seen."),

      P("Radiography: plain X-ray tubes can practically penetrate only about...",
        "75–100 mm of steel, beyond which gamma sources (Ir-192, Co-60) or accelerators take over",
        "Tube voltage caps penetration",
        "Conventional 300–400 kV X-ray tubes penetrate about 75–100 mm of steel. Thicker vessels use gamma radiography with Ir-192 or Co-60, or linear accelerators. Radiography reveals internal voids, cracks and inclusions as a shadow image."),

      P("Dye-penetrant testing is the NDT of choice when the part is...",
        "Non-magnetic — aluminium, austenitic stainless or titanium — because MPI will not work on non-ferrous metals",
        "MPI needs a ferromagnetic material",
        "Penetrant testing draws dye into surface-breaking cracks by capillary action and works on any clean, non-porous material. It is chosen specifically for the non-ferrous and stainless parts that magnetic particle inspection cannot magnetise."),

      P("Eddy-current testing requires the workpiece to be...",
        "An electrical conductor, because the probe coils induce eddy currents only in conductive material",
        "Induction needs moving electrons",
        "Eddy-current testing induces circulating currents with a probe coil; insulators generate none. It finds surface and near-surface cracks in rails, tubes and sheets, and measures coatings and conductivity — depth limited by skin effect."),

      P("Process capability: find Cp for the dimension 20.00 ± 0.05 mm when the process sigma is 0.01 mm.",
        "Cp = 1.67",
        "Cp = 0.10/(6 × 0.01)",
        "Tolerance = 0.10 mm and 6σ = 0.06 mm, so Cp = 0.10/0.06 = 1.67. A capability above 1.33–1.67 comfortably holds the tolerance; below 1.0 the natural spread already exceeds the limits."),

      P("Cpk versus Cp: which statement is TRUE?",
        "Cpk falls as the mean drifts from centre; Cp alone cannot detect an off-centre process",
        "Cpk = smaller margin divided by 3σ",
        "Cp = (USL − LSL)/6σ is a width-only measure. Cpk = min((USL − mean)/3σ, (mean − LSL)/3σ) penalises offset, so a process whose mean shifts toward one limit loses capability there long before Cp warns."),

      P("An 87-piece metric slip-gauge set can build dimensions...",
        "From 1.001 mm upward in 0.001 mm steps to about 80 mm, usually wrung from at most three or four blocks",
        "Micrometre steps, few blocks",
        "The 87-piece set packs fine steps such as 1.001, 1.002, 1.003 ... up to 60 mm. A target size is reached by wringing 3–4 blocks whose decimal parts sum correctly. Grades 0 and 1 carry tolerances of ±0.25 µm and ±0.5 µm."),

      P("Fit designation H7/g6 denotes...",
        "A clearance (precision sliding) fit — a zero-deviation H7 hole over a g6 shaft whose minus deviation leaves a running clearance",
        "Lower-case g sits below the zero line",
        "In H7/g6 the hole H has a zero lower deviation while the shaft g lies below nominal, so the pair gives a clearance fit — the classic for slideways, valve stems, clutch spindles and shift forks needing free controlled motion."),

      P("Which of these hole–shaft pairings is an INTERFERENCE (press) fit?",
        "H7/p6",
        "p, r and s shafts sit above the hole size",
        "Shaft letters p and beyond (r, s, u) place the shaft above nominal, forcing overlap with the hole tolerance — interference, as for bushes and races pressed on shafts. H7/g6 gives clearance; H7/k6 and H7/m6 are transition fits."),

      P("The ISO limits-and-fits system defines how many IT grades, and which is the everyday working grade?",
        "18 grades (IT01, IT0, IT1–IT16), with IT7 the general-purpose reference grade",
        "Two special grades plus sixteen",
        "The IT scale runs IT01 to IT16 — 18 grades altogether. IT7 is the usual ground working grade for general parts, with shafts typically IT6–IT7 and holes IT7–IT8 in common matched fits."),

      P("The IT7 tolerance for the 18–30 mm basic step is...",
        "21 µm (0.021 mm)",
        "i = 0.45 × cube root of D + 0.001D; IT7 = 16i",
        "Tolerance unit i = 0.45 × cube root of D + 0.001D with D = √(18 × 30) = 23.24 mm, giving i ≈ 1.31 µm. IT7 = 16 × 1.31 = 20.9 ≈ 21 µm, so a 25 H7 hole spans 25.000–25.021 mm."),

      P("Which thread-form angle list is CORRECT?",
        "ISO metric 60°, Whitworth 55°, ACME 29°, buttress 45° pressure flank, square thread 90°",
        "60, 55, 29, 45, 90",
        "Metric M threads cut a symmetric 60° V; Whitworth (BSW) uses 55° with rounded crests and roots; ACME is a 29° trapezoid for leadscrews; buttress threads carry a 45° flank for heavy one-way loads; square threads transmit power at maximum efficiency."),

      P("The ACME thread is characterised by...",
        "A 29° included angle, trapezoidal form, high strength and wear resistance, and simple tool grinding — hence lathe leadscrews",
        "29° trapezoid, split-nut friendly",
        "ACME's 29° flat-topped trapezoid is strong, durable and easy to lay out with one threading tool, so lathe leadscrews and actuators use it. Its efficiency is only slightly below a square thread, which is why square threads linger in specialist presses."),

      P("The best-wire diameter for three-wire pitch measurement of a 60° metric thread is...",
        "0.577 × pitch — p/(2 cos 30°)",
        "Best wire touches at the pitch line",
        "Best wire size = p/(2 cos 30°) = 0.5774 p. Such a wire rests at the pitch diameter, where flank-angle error barely influences the over-wire reading; the micrometer then reads over three equally spaced wires."),

      P("Square versus ACME threads: which comparison is TRUE?",
        "Square threads transmit power most efficiently but are hard to cut and measure; ACME is nearly as efficient yet far easier to make and adjust for wear",
        "Square = best efficiency, harder manufacture",
        "The square thread's perpendicular flanks turn machinery at low friction but create awkward tool and measurement problems. ACME's 29° form cuts cleanly, resists wear and can be split and adjusted for backlash — the engineering compromise."),

      P("Deep drawing: blank diameter for a cup of 60 mm diameter and 45 mm height using D = √(d² + 4dh).",
        "120 mm",
        "√(3600 + 10800) = √14400",
        "D = √(60² + 4 × 60 × 45) = √(3600 + 10800) = √14400 = 120 mm. Add a trimming margin to this theoretical blank size, which is based on the conservation of sheet area."),

      P("Turning a 250 mm shaft: 400 rpm, feed 0.25 mm/rev, two passes. Total machining time?",
        "5 minutes (2.5 min per pass)",
        "250/(0.25 × 400) = 2.5 per pass",
        "One pass: T = L/(fN) = 250/(0.25 × 400) = 250/100 = 2.5 min, so two passes take 5 min. Pass count equals stock to remove divided by depth of cut."),

      P("In G90 absolute CNC programming the destination coordinate is...",
        "Measured from the program-zero datum; in G91 it is measured from the current tool position",
        "Absolute = from the origin",
        "G90 addresses the workpiece zero so programs are easy to verify and restart. G91 offsets from wherever the tool stands. Lathes usually operate in G90; mixed use is common, so the active mode must always be checked."),

      P("A six-axis articulated robot can position AND orient its wrist because...",
        "Three arm joints locate the wrist in space and three wrist joints (pitch, yaw, roll) set its orientation",
        "6 DOF = 3 to position + 3 to orient",
        "Articulated arms use three revolute joints for reach and three wrist rotations for full orientation, reaching any pose inside the envelope. Payload, reach and repeatability (often ±0.05 mm) define the welding, painting or palletising cell."),

      P("A typical FDM 3D-printing layer height is...",
        "0.1–0.3 mm, commonly 0.2 mm; resin (SLA) printers resolve 25–100 µm layers",
        "FDM ≈ 0.2 mm",
        "FDM parts grow in 0.1–0.3 mm layers — 0.2 mm is the everyday balance of speed and finish, and strength is anisotropic across layers. Stereolithography cures 25–100 µm strata for fine detail but needs supports and post-curing."),

      P("Category-A lifting accessories (slings, hooks, chains) require...",
        "Proof loading to twice the safe working load before first use, plus periodic re-certification and marking",
        "Cat-A: proof load = 2 × SWL",
        "Category-A equipment is proof-tested to twice its safe working load at manufacture and on a set schedule, with the SWL stamped and a certificate held. Category-B fittings such as pins and rings carry lighter tests — always check marking before a lift."),

      P("MQL versus flood coolant: which statement is TRUE?",
        "MQL sprays millilitres per hour of oil mist for near-dry cutting with low cost and no coolant mess; flood gives far stronger cooling but heavy management and disposal",
        "MQL ≈ tens of millilitres per hour",
        "Flood chillers pump litres per minute of water-based coolant, controlling heat and flushing chips at the price of tanks, spray and disposal. MQL meters a fine oil mist (millilitres/hour) for drilling and machining, keeping work dry and tools long-lived."),

      P("Thread rolling versus thread cutting: which statement is TRUE?",
        "Rolling displaces metal so the grain follows the thread — stronger, smoother, faster and chip-free for mass-produced screws",
        "Grain flow follows the thread contour",
        "Thread rolling cold-flows metal into the die form, aligning the grain along the thread profile and work-hardening the flanks: superior fatigue strength and finish at high output. Cutting severs fibres, so it is kept for small lots, large diameters and fine forms."),

      P("Standard M16 × 2 hexagon bolt: the across-flats width that the spanner grips is...",
        "24 mm (s ≈ 1.5 × d)",
        "1.5 × 16 = 24",
        "ISO M16 hexagon heads and nuts measure 24 mm across flats — the 1.5d rule — so a 24 mm spanner fits. M12 → 18 mm, M20 → 30 mm; spanner sizes follow the standard across-flats table, not the thread diameter."),

      P("A fatigue-critical, small-batch component demanding smooth defect-free surfaces should be...",
        "Forged or machined from solid rather than sand cast, because castings harbour porosity, shrinkage and crack-starting skins",
        "Casting defects kill fatigue parts",
        "Sand-cast surfaces, gas holes, inclusions and shrinkage pores act as stress raisers and fatigue origins, and properties vary with section. Forged-then-machined or bar-stock machining keeps grain flow and mirror finish for cyclic loading."),

      P("Choosing E6013 versus E7018 electrodes: which statement is CORRECT?",
        "E6013 rutile welds on AC or DC on clean thin sheet; E7018 low-hydrogen needs dry storage and DC+ to avoid hydrogen porosity and cracking",
        "E7018 must be baked and run DC+",
        "Rutile E6013 manages AC/DC and gives a smooth finish on light sheet. Basic E7018 absorbs moisture, which releases hydrogen into hot steel — bake it, keep it dry and weld DC+ for reliable structural joints."),
    ];
SSC_JE_ENC3_PROD.workshop = [
      P("Vernier caliper with LC 0.02 mm: the main scale reads 12 mm and the 17th vernier division coincides with a main line. What is the thickness?",
        "12.34 mm",
        "12 + 17 × 0.02",
        "Reading = 12 + 17 × 0.02 = 12 + 0.34 = 12.34 mm. Each vernier division adds 0.02 mm, so multiply the aligned division number by the least count."),

      P("A vernier where 50 vernier divisions equal 49 main-scale divisions of 1 mm has a least count of...",
        "0.02 mm",
        "LC = 1 − 49/50 mm",
        "LC = 1 M.S.D. − 1 V.S.D. = 1 − 49/50 = 1/50 = 0.02 mm. Verniers with 10 divisions over 9 mm give 0.1 mm; the 50-division type is the standard 0.02 mm workshop instrument."),

      P("Micrometer least count: spindle pitch 0.5 mm, thimble divided into 50 parts.",
        "0.01 mm",
        "0.5/50 = 0.01",
        "LC = pitch ÷ number of divisions = 0.5/50 = 0.01 mm. The thimble adds hundredths of a millimetre to the barrel reading as it makes each half turn."),

      P("Micrometer reading: the sleeve shows 8.5 mm and the thimble index sits on 28.",
        "8.78 mm",
        "8.5 + 28 × 0.01",
        "Reading = 8.5 + 28 × 0.01 = 8.5 + 0.28 = 8.78 mm. Always check whether the 8.5 line is exposed before adding the thimble contribution."),

      P("If a micrometer reads 0.03 mm when closed on the anvil, a workpiece reading 15.62 mm actually measures...",
        "15.59 mm",
        "Subtract the positive zero error",
        "The closed-instrument reading of 0.03 mm is a positive zero error, so actual = 15.62 − 0.03 = 15.59 mm. If the closed reading sits below zero you add instead; check zero error before precise sessions."),

      P("Sine bar: 200 mm between roller centres; a 100 mm slip-gauge stack lifts one roller. The set angle is...",
        "30°",
        "sin θ = 100/200 = 0.5",
        "sin θ = h/L = 100/200 = 0.5, so θ = 30°. The sine bar converts a gauge stack into an exact angle along its hypotenuse; standard bars measure 200 mm or 250 mm between centres."),

      P("Which slip-gauge stack under a 200 mm sine bar sets an angle of 45°?",
        "141.4 mm",
        "h = 200 × sin 45°",
        "h = L sin θ = 200 × 0.7071 = 141.4 mm. Beyond about 45° the sine-bar method loses resolution, so the table surface is preferred there; small angles read best on long bars."),

      P("A feeler gauge is intended to...",
        "Measure and set small clearances such as valve gaps, spark-plug gaps and bearing end float",
        "Thin calibrated blades from 0.04 to 1 mm",
        "Feeler blades of calibrated thickness (commonly 0.04–1.0 mm) slip into a gap; the blade that just fits, or a stack that fits snugly, gives the clearance. Never force blades or probe moving or hot parts."),

      P("A spark-plug gap near 0.6–0.9 mm is best checked with...",
        "A wire-type feeler gauge, which seats a round wire between the two electrodes",
        "Flat blades bridge a cylindrical gap",
        "Wire-type gap gauges present a round wire that cradles both plug electrodes, so the true gap is read. Flat feeler blades bridge across the electrode ends and overstate the gap. Wire gauges also set some valve and injector clearances."),

      P("A centre punch differs from a prick punch in that it...",
        "Has a blunter (60°–90°) point to open a seat that guides the drill start; the prick punch is sharp (30°–40°) for fine layout dots",
        "Bigger angle = a drill seat",
        "A centre punch point of 60°–90° gives the drill tip a firm, non-wandering seat; a prick punch with its sharp 30°–40° point marks fine layout intersections. Punch on the crossover and use light blows on thin sheet."),

      P("Odd-leg calipers (jenny calipers) are used for...",
        "Scribing lines at a set distance parallel to a straight edge",
        "One flat leg rides the edge, one scribes",
        "Odd-leg calipers have one flat leg that rides the workpiece edge while the other leg's point scribes a line parallel to it. Dividers step off equal divisions and scribe circles; inside and outside calipers transfer diameters."),

      P("Cold-chisel point angle for cutting HARD steel should be about...",
        "70°–75° (soft materials like copper drop to 30°–40°)",
        "Hard metal needs a stronger, blunter point",
        "The chisel is ground to about 70°–75° for hard steel so its edge resists chipping, about 60° for mild steel, and 30°–40° for soft copper and aluminium. A too-slender angle on hard metal crumbles the cutting edge."),

      P("Which file cross-section is used to sharpen handsaw teeth and reach acute corners?",
        "Triangular (three-square) file",
        "Acute corners need a triangle",
        "Triangular files reach into acute inside corners — saw teeth, grooves, dovetail corners. Half-round files finish concave forms; flat and ridding files handle flats and slots. Choose the section that matches the corner."),

      P("File cut grading from coarsest to finest is...",
        "Rough, bastand, second cut, smooth, dead smooth",
        "Rough removes, dead smooth fits",
        "Rough and bastand cuts hog stock fastest and leave deep scratches; second cut is the general all-purpose choice; smooth and dead smooth finish and fit. On soft metals double-cut files clog, so single-cut and a chalk rub help."),

      P("Hacksaw blade choice for HARD thin steel is...",
        "A fine 24–32 TPI blade so two or three teeth span the section being cut",
        "Never let a pitch span the web",
        "Fine 24–32 TPI blades suit hard, thin and tubular sections where at least 2–3 teeth must engage the work. Coarse 14–18 TPI blades cut soft metals and heavy stock faster; 18 TPI is the general all-rounder."),

      P("When fitting a hacksaw blade, the teeth must point...",
        "Forward away from the handle, because the cutting stroke is the forward push",
        "Push stroke does the cutting",
        "Teeth face away from the handle so the forward (power) stroke cuts; the return stroke rides over the work. Apply pressure only on the forward stroke and keep blade tension firm to stop wander and wobble."),

      P("Tapping a THROUGH hole needs the sequence...",
        "A taper tap then a plug tap; a bottoming tap only if full threads must reach the far end of the hole",
        "Through holes rarely need bottoming",
        "The taper tap starts easily and cuts part of the thread; the plug tap opens it to full depth along the hole. A bottoming tap finishes threads right at the bottom and is only needed for blind holes. Back out a quarter turn frequently to break chips."),

      P("For a BLIND tapped hole the correct tap sequence is...",
        "Taper, then plug, then bottoming tap for the final threads at the hole bottom",
        "Taper, plug, bottoming",
        "The taper tap engages and starts the cut, the plug tap extends the thread, and the bottoming tap reaches the floor. Drill the blind hole deeper than the thread (roughly thread depth plus 4 × pitch) to give chips room."),

      P("The tapping drill size for an M6 × 1.0 thread is...",
        "5 mm (D − p)",
        "6 − 1 = 5",
        "Tapping drill = 6 − 1.0 = 5 mm, about 75 % thread. The D − p rule extends to M8 × 1.25 → 6.75 mm, M10 × 1.5 → 8.5 mm and M12 × 1.75 → 10.25 mm for ISO coarse metric taps."),

      P("Hand taps and machine taps differ in that...",
        "Hand taps are straight-fluted and turned in a tap wrench; machine taps carry spiral points or flutes that drive chips ahead in powered spindles",
        "Spiral flutes extract chips",
        "Hand taps (straight flutes) are driven by tap wrenches and suit through holes where chips drop below. Machine taps have spiral-point or spiral-flute geometry that pushes chips forward — essential for deep blind holes in power feeding."),

      P("External thread cutting on a lathe sets the compound slide at...",
        "Half the included thread angle — 30° for ISO metric — and feeds it forwards between passes",
        "Half of 60° is 30°",
        "The compound is swivelled to 30° for a 60° metric thread and advanced about 0.2 mm per pass while the tool moves along the axis at threading speed; the half-nut disengages at the stop. The tool must sit square to the axis."),

      P("Soldering and brazing are divided by the temperature of...",
        "450 °C — soldering below it, brazing above it, giving far stronger filler-metal joints",
        "450 °C is the boundary",
        "Soldering (tin-lead soft solder) runs below 450 °C for electronics and light sheet metal; brazing above 450 °C uses brass or silver filler rod (spelter) strong enough for machine parts. Flux keeps oxides away in both."),

      P("Which flux suits ELECTRICAL soldering work?",
        "Rosin — non-corrosive; acid fluxes must never reach electrical connections",
        "Rosin leaves an insulating, inert residue",
        "Rosin flux cleans copper mildly and leaves an insulating residue; acid fluxes such as zinc chloride strip oxides aggressively but stay corrosive — ruinous to electronic joints. Electronics stay with rosin-core solder."),

      P("Which extinguishing agent must NOT be used on an oil fire?",
        "Water",
        "Water sinks under oil and spreads it",
        "Water is denser than oil and goes to the bottom, floating and spreading the burning oil. Foam, dry powder and CO2 blanket oil fires; water is safe only on Class A solid-fuel fires."),

      P("Class C fires involve...",
        "Flammable gases, while Class D covers combustible metals",
        "A solids, B liquids, C gases, D metals",
        "Class A = wood, paper, textiles; B = flammable liquids; C = flammable gases; D = combustible metals such as magnesium and sodium needing special dry-powder agents. Matching the agent to the class is the first rule — water is wrong for B, C and D."),

      P("An extinguishant chosen for fires in live electrical panels is...",
        "CO2 or dry powder — electrically non-conductive — never water or foam",
        "Non-conducting agent for live gear",
        "CO2 and dry-powder agents are electrically non-conductive, so they attack live switchgear and motor fires safely. Water and foam conduct and can electrocute the operator. Isolate the power where safe before discharging."),

      P("Minimum eye protection at a bench grinder is...",
        "Safety goggles or a face shield, with the tool rest gapped under 3 mm and the wheel dressed true",
        "Goggles plus guards",
        "A bench grinder throws abrasives, sparks and wheel fragments at face level; ordinary spectacles are not enough. Goggles or a face shield, correct rests (gap ≤ 3 mm), a true-dressed wheel and standing aside at start-up keep the operation safe."),

      P("Before mounting a new grinding wheel you should...",
        "Ring-test it, verify the rated rpm against the grinder speed, fit blotters, guard the wheel and run briefly at low speed",
        "Sound, speed and guard",
        "Tap a mounted-in-suspension wheel: a clear ring means sound, a dull thud means cracked. Check the moulded maximum speed against the machine, fit blotting washers, tighten the flange nut squarely, guard the wheel and let it idle while standing clear."),

      P("Clearing swarf from a lathe, the safe tool is...",
        "A brush or chip hook with the machine stopped, never bare hands or compressed air aimed at the cut",
        "Air pressure drives chips into the skin",
        "Chip strings are sharp and hot; stop the spindle and sweep them away with a brush or hook. Compressed air blastes grit into eyes and forces chips into clothing and skin, and hands or gloves near a rotating job can be dragged in."),

      P("The safe way to stop a lathe chuck is...",
        "To let it coast down or use the brake lever — never grab the spinning chuck with the hand",
        "Keep hands off rotating mass",
        "A chuck stores large rotational energy; grasping it can twist the wrist and arm badly. Let the spindle slow on its own, use the brake, and keep sleeves, gloves and ties well clear while anything rotates."),

      P("Loose clothing, hair or rings near a rotating spindle are dangerous because...",
        "A spinning job can wrap fabric and drag the operator into the machine — so tuck clothing in, tie hair back and remove rings and bracelets",
        "Rotating stock winds up fabric",
        "The lathe catches a loose sleeve in one turn and winds it around the job, pulling the arm toward the chuck. Fitted clothing, contained hair, no jewellery, and the chuck guard in place are the first line of defence."),

      P("A bench vice is correctly used when...",
        "Work is gripped between hardened serrated jaws with the heavy end against the fixed jaw, and never hammered or over-torqued",
        "Fixed jaw takes the force",
        "Heavy blows and long levers break cast-iron vice bodies, so hammer work belongs elsewhere. Serrated jaws mark soft work — slip copper or aluminium jaw covers — and the quick-action lever must be closed firmly, not hammered."),

      P("Engineer's (layout) blue is applied before scribing in order to...",
        "Give the sharp scriber line contrast on bright steel; chalk does the same on wood",
        "Dye makes the line visible",
        "Scribing a clean bright surface leaves a line that is hard to see; Prussian blue or a modern layout dye gives dark contrast while chalk and pencil serve woodwork. Lines, crossed arcs and punch dots then define the cut."),

      P("The point of a scriber is made of...",
        "Hardened and tempered carbon or alloy steel, and sometimes carbide-tipped, drawn across the rule to cut the layout line",
        "A hardened point marks metal",
        "Scribers are drawn once across a rule or straight edge to cut a fine line in the dye. The bent (offset) scriber reaches past obstructions; the straight scriber follows straight edges. One pull gives a true line."),

      P("Circles and stepped divisions on a metal layout are best made with...",
        "Dividers, which pivot at the centre punch and scribe arcs or step equal pitches",
        "Dividers = arcs and spacing",
        "Dividers pivot at a prick-punch centre to scribe circles and step equal divisions; odd-leg calipers scribe parallels from an edge; the try square transposes right angles. For round stock the centre head finds the axis."),

      P("The centre head of a combination square is used to...",
        "Locate the centre of round bars by scribing along its two 45° slots from two positions",
        "A 90° V bisects the diameter",
        "Seat the centre head's V on the bar and scribe along the rule-edge, then repeat a quarter turn away; the crossing is the centre. The protractor head reads angles and the square head squares and levels — a centre hole can then be drilled."),

      P("Sheet-metal gauge: 18 SWG (Standard Wire Gauge) is approximately...",
        "1.22 mm thick",
        "18 SWG ≈ 1.22 mm",
        "18 SWG ≈ 1.22 mm (16 SWG ≈ 1.63, 20 SWG ≈ 0.91, 22 SWG ≈ 0.71 mm). Higher gauge numbers mean thinner sheet. Tinplate, galvanised iron and aluminium sheet are all traded by SWG number."),

      P("A hatchet stake in sheet-metal work is used to...",
        "Form straight bends and flanges over its narrow tapered edge",
        "Straight flanging needs a hatchet-type stake",
        "Hatchet (T) stakes carry a narrow tapered working edge for straight flanging and bending; half-moon and blowhorn stakes shape curved and cylindrical work; the flat anvil face smooths panels. Each nests in a holder or vice."),

      P("Wiring (rolling) the edge of a sheet-metal article gives...",
        "A smooth, rigid, rounded, finger-safe edge reinforced by a wire rolled inside the fold",
        "A wire core stiffens the edge",
        "Wiring folds the sheet round a wire core, producing a springy, dent-resistant, safe edge on trays and buckets; a double hem with two plain folds stiffens edges without wire. Both are formed over matched stakes."),

      P("A snap-head rivet is set so that the shank protruding beyond the plates is about...",
        "1.5 times the rivet diameter, giving enough metal to form a full closing head",
        "Protrusion ≈ 1.5 d",
        "The shank should stand out roughly 1.5 × its diameter so the snap moulds a complete dome; too little makes a small head and too much a mushroomed rim. Countersunk rivets need less protrusion. Set against a dolly with the snap side beaten."),

      P("Pipe dies for BSP (British Standard Pipe) threads cut...",
        "The 55° Whitworth thread form, tapered 1 in 16 for pressure-tight joints",
        "BSP = 55° tapered pipe thread",
        "Pipe threading uses the Whitworth 55° flank form, and BSPT tapers 1 in 16 so the joint wedges tight as it screws home. Start the die square, cut with oil and back it off frequently to clear chips — an oversize die gives leaking joints."),

      P("A mortise gauge differs from a marking gauge in that it...",
        "Carries two scribing pins to mark both sides of a mortise or tenon in one setting",
        "Double pin for mortises",
        "A mortise gauge sets two pins to the width of the mortise so both shoulder lines scribe together from one fence; the single-pin marking gauge draws one parallel line for general cuts. Both lock firmly on the beam."),

      P("A tenon saw is preferred for...",
        "Straight, accurate cross-cuts and square shoulders of joints, thanks to its stiffened back",
        "The brass back keeps the thin blade true",
        "Tenon and dovetail saws carry a strong back that stiffens a thin blade, holding a true line for shoulder and dovetail cuts. Rip-saws cut along the grain and cross-cut saws across; the dovetail saw is the finer cousin for bench joints."),

      P("The sequence of bench planes from stock removal to finish is...",
        "Jack plane first, then trying/jointer for straightness, then smoothing plane for the final surface",
        "Jack removes, smoothing finishes",
        "The jack plane hogs stock, the trying or jointer straightens edges dead square, and the smoothing plane leaves the finish surface. Rebate and plough planes cut shoulders and grooves. Set a whisper-thin shaving with a close cap iron."),

      P("Firmer chisels are distinguished from mortise chisels because...",
        "Firmer chisels are general-purpose blades; mortise chisels are thick and square-edged to lever waste out of sockets",
        "Mortise chisels resist twisting",
        "Firmer chisels pare and trim with a sturdy flat blade, and bevel-edge versions reach dovetail corners. Mortise chisels are heavier with square corners to absorb mallet blows and pry waste from deep sockets. Never use a chisel as a screwdriver or pry bar."),

      P("A dial indicator with 0.01 mm graduations reports runout as...",
        "Pointer sweep in divisions × 0.01 mm — e.g., a 12-division swing is 0.12 mm total variation",
        "Dial divisions × least count",
        "Total indicator reading (TIR) = maximum minus minimum pointer position in divisions times the least count. On a shaft in V-blocks, TIR reports eccentricity and roundness; the magnetic base must hold the gauge rigid and perpendicular."),

      P("For cutting curved internal cut-outs in sheet metal the right tool is...",
        "Curved or aviation snips, whose shaped jaws chase the arc",
        "Curved blades follow arcs",
        "Straight snips cut straight lines, curved snips ride inside and outside curves, and aviation snips (red, yellow or green-coded handles) multiply force for heavier gauges. The waste side folds downward; keep the good side smooth."),

      P("Draw-filing with a flat file gives a fine edge because...",
        "The drawn stroke presents a single-cut file broadside, curling thin burrs and smoothing marks left by cross-filing",
        "Pulled stroke = fine finish",
        "Cross-filing removes bulk quickly; draw-filing rubs a single-cut file sideways along the work, knocking down burrs and fattening the surface before the final fit. Use the full file length, and keep the blade clean with a file card."),

      P("A Woodruff key is chosen when...",
        "The shaft is light or tapered and the keyway is an undercut, requiring the self-aligning semicircular key",
        "Half-moon key for small and tapered shafts",
        "Woodruff keys are semicircular, seating in milling-machine undercuts; they self-align, resist tipping and suit light and tapered shafts. Rectangular sunk keys carry heavier torque; feather and gib keys are for sliding and withdrawal applications."),

      P("A tap wrench rather than pliers must drive taps because...",
        "It turns the tap square with its axis at controlled torque; pliers skew the tap and snap it in the hole",
        "Taps go straight, not skewed",
        "Tap wrenches clamp the square tang axially so force stays on the tap axis; pliers drag at an angle and break slim taps in the hole. The T-handle wrench gives a light feel for M3–M6 taps; adjustable wrenches clamp larger squares."),

      P("Left-hand threads are found on...",
        "Bicycle pedals and rotating shafts whose normal left-thread direction would otherwise unscrew — they tighten anticlockwise",
        "Anti-loosening for rotation",
        "Any shaft that would tend to loosen a right-hand thread by rotation gets a left-hand thread, as on pedals and flywheel pins. Normal fasteners are right-hand and tighten clockwise. Check the direction before forcing — a stuck nut may be left-handed."),

      P("A hardened flat washer under a hex nut serves to...",
        "Spread the clamping load over a larger bearing area and protect the surface from the nut's rotation",
        "Load spreading and a clean bearing face",
        "Plain washers spread the load, protect paint and finish, and give a stable torque face; spring and shake-proof washers add moderate vibration locking. Always fit the correct bore and grade — a battered or oversized washer ruins the joint."),

      P("Knurling a handle on the lathe is done by...",
        "Pressing hardened serrated knurl wheels into the rotating work at slow speed with oil, raising a diamond or straight pattern",
        "Forming pressure at slow rpm",
        "Knurls cold-form ridges by impression: low rpm, firm pressure and oil protect both the wheels and the work. Diamond knurling grips best for spanners and knobs; straight knurls suit torque surfaces. Once formed, the pattern cannot be dressed away."),

      P("Soluble oil is used when drilling steel because it...",
        "Cools the cutting edges, lubricates the flutes and washes chips away, preventing the built-up edge that dulls drills",
        "Cool, wash and lubricate",
        "Steel drilled dry softens at the point and welds a built-up edge onto the lips. Soluble-oil coolant cools, lubricates and flushes swarf along the flutes; aluminium gets kerosene to prevent clogging, while cast iron drills dry because graphite self-lubricates."),

      P("Checking a turned face with a try square, the reliable method is...",
        "To square the blade against the face at four positions around the piece and compare each light gap",
        "One application proves nothing",
        "A single square sit can slip or rest on a burr; rotating the square through four positions shows whether the face truly stands at 90° or leans. Remove any burr first, then set, and re-read after any facing pass."),

      P("When hacksawing a pipe, rolling the pipe as you cut...",
        "Keeps the cut at the crown so the teeth cannot snag on the far wall as the blade breaks through",
        "Roll the tube; teeth snag at the far side",
        "A held-still tube makes the blade drag and tear as it breaks through the far wall; rotating the work keeps the cut on the crown and the teeth continuously engaged. Support short offcuts and deburr the bore after the last cut."),

      P("The first rule of drill-press work is...",
        "To clamp the job or fixture down — a small part can seize and spin dangerously in a large drill",
        "Never hold work by hand",
        "A drilled piece can grab the twist drill and swing like a blade into the operator. Vises, clamps and drilling jigs hold the work square while a centre-punch seat starts the hole; steel gets coolant and speed is matched to drill size."),

      P("Arc welding without a proper helmet causes arc eye because...",
        "The electric arc emits intense ultraviolet light that burns the cornea — a shade 10–13 helmet is mandatory",
        "UV burns the cornea",
        "The arc's ultraviolet flashes the eye — effectively sunburn of the cornea that hurts hours later, and plain glass lets it through. Arc helmets carry dark glass of shade 10–13, and bystanders need screens or tinted side shields. Never look at the arc bare-eyed."),

      P("Oxy-fuel gas welding requires...",
        "Green-tinted goggles of shade 4–6, because the gas flame is far less intense than the electric arc",
        "Gas flame, moderate glass",
        "The gas flame radiates far less ultraviolet than the arc, so green goggles of shade 4–6 protect the eyes while the weld stays visible. Arc helmets are far too dark for gas work, and gas goggles are far too light for the arc."),

      P("A hammer in poor condition is dangerous because...",
        "A loose or splintered head can fly off in mid-swing, and a mushroomed striking face flakes steel splinters",
        "Flying heads, flying chips",
        "Hammer heads work loose and eject at speed; a peened-over face sheds steel splinters toward the eyes and skin every blow. Keep the head firmly wedged, dress mushrooming flush, and wear goggles whenever striking metal on metal."),

      P("After tightening a lathe or drill chuck, the chuck key must be...",
        "Removed before the spindle starts — a key left in the chuck comes out like a missile",
        "Keys throw at spindle speed",
        "A key left in the scroll rides at spindle speed and can kill an onlooker. The safe habit: tighten, drop the key on the bench, then start. Many machines carry interlocks that refuse to start with the key in place."),

      P("Adjusting belts or changing machine speeds while running is prohibited because...",
        "Contact with moving belts and pulleys grabs clothing and fingers — isolate and wait for all motion to stop first",
        "Adjust only at standstill",
        "Belts, pulleys and open gears take in sleeves, fingers and hair in a fraction of a second, and a running change also strains the mechanism. Switch off, wait for the spindle to stop fully, then tension belts, change gears or load stock."),

      P("A casting is centred in a four-jaw independent chuck by...",
        "Moving each jaw in turn while a dial indicator reads the surface, pairing opposite jaws to cancel runout",
        "Opposite jaws balance each other",
        "Independent jaws move alone, so sweep a DTI around the boss and turn opposing jaws alternately until the reading holds at every position. The four-jaw clamps irregular castings and squares them to the machine axis — work that a self-centring three-jaw cannot."),

      P("Starting a round split die on a bolt, the correct habit is...",
        "To engage it square against the end face, cut a little, then back off a quarter turn, oiling until the thread progresses",
        "A square start avoids drunken threads",
        "A die started off-square cuts a sloping drunken thread that jams and leaks. Seat it squarely with light pressure, advance a few turns, back off to break chips, oil steadily and finish the thread turning the die stock only."),

      P("A broken stud is withdrawn using...",
        "An extractor — a hardened left-hand taper screwed into a pilot-drilled hole and turned anticlockwise",
        "Left-hand taper screw bites in",
        "Drill a pilot hole in the broken stud, tap in a hardened left-hand extractor, and turn anticlockwise; the taper bites and the thread drags the stud out. Heat and penetrating oil free a seized stud, but never force the extractor or it snaps inside the hole."),

      P("Tapping steel versus aluminium: the correct cutting lubricants are...",
        "Sulphurised cutting oil for steel, and kerosene or light machine oil for aluminium",
        "Steel cuts oily; aluminium uses kerosene",
        "Steel taps need sulphurised or conventional cutting oil to lubricate and cool the cut; soft, sticky aluminium taps cleanly with kerosene or light oil that stops the flutes loading. Never tap dry — the tap seizes, breaks and leaves the thread torn."),

      P("A centre drill combines...",
        "A small pilot and a 60° countersink so its centre hole exactly matches the angle of lathe and grinder centres",
        "Pilot plus 60° countersink",
        "The centre drill cuts a piloted hole and the 60° countersink in one pass, so the part seats cleanly between dead and live centres in lathes and grinding machines. The 60° angle matches machine centres; a damaged centre hole turns eccentric."),

      P("A round bar in a V-block is measured with a height gauge or DTI because...",
        "The V centres the axis whatever the diameter, so heights and runout are read from a true datum",
        "The V-block centres the axis",
        "A V-block seats a cylindrical bar consistently on its axis, so a height gauge or DTI reads the top surface and the true centre height follows. This is exactly how concentricity, runout and keyway depth are checked on round work."),

      P("Reaming on a drill press or lathe works cleanly when the reamer...",
        "Is aligned by a floating holder or pilot bushing and run at about half drilling speed with steady feed",
        "Floating holders steer the reamer",
        "A misaligned reamer bell-mouths the hole and snaps its teeth; floating chucks and pilot bushings let the reamer follow the existing axis. Run reaming at roughly 50 % of drilling speed, feed in fully, and never reverse while engaged."),

      P("When hammering metal at the anvil you must...",
        "Wear eye protection against flying scale and never strike with a loose or mushroomed hammer — hardened faces shatter",
        "Scale flies at every blow",
        "Hot scale and sparks peel off the hammer and work at every blow, so goggles and a clear swing arc matter; never strike hardened cold steel or another hammer face. A loose handle or a flare at the pane turns the hammer into a missile."),
    ];
  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC3_PROD;
  if (typeof window !== "undefined") window.SSC_JE_ENC3_PROD = SSC_JE_ENC3_PROD;
})();

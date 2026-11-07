(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC2_PROD = {};
SSC_JE_ENC2_PROD.production = [
      P("What is the linear shrinkage allowance for aluminium castings?",
        "1.3 %",
        "Al ≈ 1.3 %, steel ≈ 2.1 %",
        "Linear shrinkage of aluminium castings is approximately 1.3 %. This allowance is added to the pattern dimensions so that the final cooled casting matches the required size. Steel castings need a larger allowance of about 2.1 % due to higher thermal contraction."),

      P("What linear shrinkage allowance is used for steel castings?",
        "2.1 %",
        "Steel ≈ 2.1 % linear",
        "Steel castings require a linear shrinkage allowance of approximately 2.1 %, which is greater than aluminium (1.3 %) because steel solidifies and cools through a wider temperature range, producing more total contraction."),

      P("State Chvorinov's rule for solidification time and compute t when B = 2 min/cm², V = 200 cm³, A = 150 cm².",
        "t = B (V/A)²; t = 3.56 min",
        "t = B × (V/A)²",
        "Chvorinov's rule: t = B × (V/A)² where t = solidification time, B = mould constant, V = casting volume, A = surface area. Substituting: t = 2 × (200/150)² = 2 × (1.333)² = 2 × 1.778 = 3.56 min. The ratio V/A is called the casting modulus M."),

      P("Using the modulus method, find the minimum riser volume if the casting modulus Mc = 1.33 cm and the riser modulus must be 1.2 × Mc.",
        "Mr = 1.2 × 1.33 = 1.60 cm; for H = D riser, modulus = D/6 → D = 9.6 cm, V = πD³/4 ≈ 696 cm³",
        "Riser modulus Mr = 1.2 × Mc",
        "Riser modulus must exceed casting modulus: Mr = 1.2 × 1.33 = 1.60 cm. For a side riser with H = D, the modulus M = V/A = (πD³/4)/(πD² + πDH) = D/6 = 1.60 → D = 9.6 cm. Volume V = π(9.6)³/4 = 696 cm³. This ensures the riser solidifies after the casting, feeding shrinkage."),

      P("What is the purpose of a gating ratio of 1 : 2 : 4 (sprue : runner : ingate) in a sand mould?",
        "The choke is at the sprue; it controls flow rate and prevents aspiration",
        "Choked gating at sprue base",
        "A gating ratio of 1:2:4 means the sprue base area is the smallest (choke area), runner is double, and ingate is four times the sprue. This ensures the runner and gate are always full of metal, preventing air aspiration and oxidation. The sprue acts as the flow-control element."),

      P("Why is the sprue tapered in a gravity die-casting or sand-mould system?",
        "To prevent aspiration by keeping the metal stream full as it accelerates",
        "Continuous metal stream avoids air entrapment",
        "As molten metal falls under gravity it accelerates, so the stream diameter naturally reduces (vena contracta effect). If the sprue were cylindrical, a gap would form between the metal and the sprue wall, aspirating air. A tapered sprue matches the accelerating stream diameter, keeping it full and avoiding air pick-up."),

      P("What is the typical machining (finish) allowance added to a pattern for a sand casting?",
        "1.5 to 3 mm per side",
        "Al = 1.5 mm, steel = 2.5–3 mm",
        "A machining or finish allowance is added to pattern surfaces that will later be machined. For aluminium castings 1.5 mm per side is common; for steel castings 2.5–3 mm per side because of rougher as-cast surfaces and greater oxidation scale. This extra material is removed during subsequent machining."),

      P("What is the typical green compression strength of moulding sand?",
        "10 to 25 kN/m²",
        "Higher clay/moisture → higher green strength",
        "Green compression strength of moulding sand typically ranges from 10 to 25 kN/m². It depends on clay content, moisture percentage, and ramming intensity. Insufficient green strength causes mould walls to collapse; excessive strength makes the sand hard to handle and透气性 may drop."),

      P("What is the typical permeability number range for moulding sand?",
        "80 to 200",
        "Permeability allows gases to escape",
        "Permeability number of moulding sand generally ranges from 80 to 200. It measures the ability of the sand to allow gases (steam, binder fumes) to pass through. Low permeability causes blow holes and gas defects; very high permeability may allow metal penetration and rough surface."),

      P("What is the normal moisture content in green moulding sand?",
        "2 to 8 %",
        "Moisture activates clay bond",
        "Moisture content in green sand is typically 2–8 % by weight. Water activates the clay (bentonite/kaolin) to form the bond between sand grains. Too little moisture gives insufficient green strength; too much causes gas defects and reduced permeability. Optimal is around 3–5 % for most foundry sands."),

      P("What is the typical clay content in moulding sand?",
        "8 to 20 %",
        "Clay is the binder in green sand",
        "Clay content in green moulding sand ranges from 8 to 20 % by weight. Bentonite (sodium-activated) is the most common clay used. Higher clay gives more green strength but reduces permeability. Typical foundry mix: 80–90 % silica sand, 8–15 % clay, 3–6 % moisture."),

      P("For a small cupola melting 1 tonne of iron per hour, state the approximate coke-to-metal ratio and limestone percentage.",
        "Coke : metal ≈ 1 : 10 (10 %); limestone ≈ 2–5 % of metal charge",
        "Coke 8–12 %, limestone 2–5 %",
        "In a cupola, coke consumption is about 8–12 % of the metal charge weight (commonly taken as 1:10 ratio). Limestone flux is 2–5 % of the metal charge. For 1 tonne/hr iron, approximately 100 kg coke and 30–50 kg limestone per hour are needed. The flux removes sulphur and manganese impurities as slag."),

      P("What is the typical hot-blast temperature in a cupola?",
        "250 to 300 °C",
        "Pre-heated air via hot blast stoves or recuperator",
        "The cupola blast air is preheated to 250–300 °C using a hot-blast stove or recuperator. Hot blast raises the cupola efficiency, increases melting rate, reduces coke consumption by 15–20 %, and gives more uniform metal temperature. Cold blast cupolas run at ambient air temperature."),

      P("Name a casting defect caused by insufficient risering.",
        "Shrinkage cavity (pipe shrinkage or centre-line shrinkage)",
        "Riser feeds liquid metal during solidification",
        "Shrinkage cavities form when there is insufficient liquid metal feed during solidification. A pipe shrinkage is a conical void extending from the top; centre-line shrinkage runs along the centre. Proper riser design (modulus method, Chvorinov's rule) ensures the riser solidifies last and feeds the casting."),

      P("Identify the defect: round or oval cavities found just below the casting surface.",
        "Blow holes",
        "Caused by trapped gas or moisture",
        "Blow holes are smooth, rounded cavities formed when gases (steam from moisture, binder decomposition) are trapped in the solidifying metal. Remedies include reducing sand moisture, improving venting, using permeable sand, and applying mould coatings."),

      P("What causes hot tears in castings?",
        "Restricted contraction of the casting during cooling in the mould",
        "Fillets and proper shake-out timing prevent hot tears",
        "Hot tears (hot cracks) occur when the casting is still hot and weak but its contraction is restrained by the mould, cores, or its own geometry. Stress concentrates at sharp corners. Remedies: generous fillets and radii, proper core composition for collapsibility, timely shake-out, and uniform wall thickness."),

      P("Compute welding heat input when arc voltage = 25 V, current = 200 A, travel speed = 300 mm/min.",
        "1.0 kJ/mm",
        "Q = (V × I × 60) / (speed × 1000)",
        "Heat input Q = (V × I × 60) / (v × 1000) kJ/mm. Substituting: Q = (25 × 200 × 60) / (300 × 1000) = 300 000 / 300 000 = 1.0 kJ/mm. Higher heat input gives deeper penetration but more distortion and wider HAZ. This formula converts from J/mm to kJ/mm."),

      P("What SMAW electrode diameter is recommended for welding 8 mm thick mild steel plate?",
        "4.0 mm diameter electrode",
        "3.15 mm for 3–6 mm; 4 mm for 6–12 mm; 5 mm for 12–20 mm",
        "For SMAW of mild steel, electrode diameter is chosen based on plate thickness: 2.5 mm for thin sheet (up to 3 mm), 3.15 mm for 3–6 mm, 4.0 mm for 6–12 mm, and 5.0 mm for 12–20 mm. For 8 mm plate, a 4.0 mm electrode gives good penetration and deposition rate without excessive heat input."),

      P("In GMAW/MIG welding of mild steel, what shielding gas is preferred and why?",
        "CO₂ or 75 % Ar + 25 % CO₂ mix; CO₂ gives deeper penetration, Ar reduces spatter",
        "CO₂: deep penetration; Ar/CO₂ mix: less spatter",
        "For GMAW of mild steel, pure CO₂ provides deep penetration and good economy but more spatter. An Argon + 25 % CO₂ mix gives a smoother arc, less spatter, and easier starts. For stainless steel, 90 % Ar + 10 % CO₂ or tri-mix (Ar/He/CO₂) is used. Pure Argon is used for aluminium with pulsed spray transfer."),

      P("In spot welding, state the typical current range and weld time for mild steel sheet of 1 mm thickness.",
        "Current 6–8 kA, time 0.1–0.2 s",
        "F = k × t^1.2 for electrode force",
        "For resistance spot welding of 1 mm mild steel, the current is typically 6–8 kA with a weld time of 0.1–0.2 s (6–12 cycles at 50 Hz). Electrode force is about 1.5–2 kN. The nugget diameter should be approximately 5√t = 5 mm for 1 mm sheet."),

      P("What is the composition of a common silver brazing alloy (50-50) and its melting range?",
        "50 % Ag, 50 % Cu; melting range 620–700 °C",
        "Silver brazing: strong joint, lower temp than base metals",
        "A 50-50 silver brazing alloy contains 50 % silver and 50 % copper, melting in the range 620–700 °C. This is well below the melting point of mild steel (~1400 °C) or copper (~1080 °C), allowing joining without melting the base metals. Silver content increases fluidity, ductility, and joint strength."),

      P("Compute the blank diameter for deep drawing a cylindrical cup of diameter 80 mm and height 40 mm.",
        "D = √(d² + 4dh) = √(6400 + 12 800) = √19 200 ≈ 138.6 mm",
        "D = √(d² + 4dh)",
        "Blank diameter for deep drawing: D = √(d² + 4dh) where d = cup diameter, h = cup height. D = √(80² + 4 × 80 × 40) = √(6400 + 12 800) = √19 200 = 138.6 mm. In practice, add 3–5 % for trimming allowance, giving ~143 mm."),

      P("Calculate the blanking force for a circular blank of diameter 50 mm from 2 mm mild steel sheet (shear strength = 300 MPa).",
        "F = π × D × t × τ = π × 50 × 2 × 300 = 94 248 N ≈ 94.2 kN",
        "F = perimeter × thickness × shear strength",
        "Blanking force: F = π × D × t × τ. Substituting: F = π × 50 × 2 × 300 = 94 248 N ≈ 94.2 kN. This is the shear force along the cutting perimeter. The press must have a capacity exceeding this with a safety factor of at least 1.3."),

      P("What is the recommended die clearance per side for blanking 2 mm mild steel?",
        "5 to 10 % of sheet thickness per side → 0.1 to 0.2 mm per side",
        "Clearance depends on material and thickness",
        "For blanking mild steel, the die clearance is 5–10 % of sheet thickness per side. For 2 mm sheet, clearance = 0.1–0.2 mm per side. Too small clearance increases force and tool wear; too large gives excessive burr and ragged edge. Softer materials need less clearance, harder materials more."),

      P("Write the bend allowance formula and compute BA when R = 5 mm, t = 3 mm, bend angle = 90°, K = 0.33.",
        "BA = θ(R + Kt) = π/2 × (5 + 0.99) = 9.41 mm",
        "θ in radians; K = 0.33 for R < 2t",
        "Bend allowance: BA = θ × (R + K × t) where θ is the bend angle in radians, R is inside bend radius, K is the K-factor (0.33 for R < 2t). For 90°: θ = π/2 = 1.5708 rad. BA = 1.5708 × (5 + 0.33 × 3) = 1.5708 × 5.99 = 9.41 mm. This is the length of the neutral axis in the bend zone."),

      P("What are the five common types of rolling mills?",
        "Two-high, three-high, four-high, cluster (Sendzimir), and tandem",
        "Four-high reduces roll bending; cluster for thin foil",
        "Two-high: two rolls, most basic. Three-high: three rolls for hot rolling. Four-high: two small work rolls backed by two large backup rolls to reduce bending. Cluster (Sendzimir): multiple backup rolls for very thin rolling. Tandem: multiple stands in series for high-speed continuous rolling."),

      P("For a rolling operation with roll radius R = 150 mm and draft a = 2 mm, compute the contact arc length.",
        "L = √(R × a) = √(150 × 2) = 17.32 mm",
        "L = √(R × draft)",
        "Contact arc length in flat rolling: L = √(R × a) where R = roll radius and a = draft (reduction in thickness). L = √(150 × 2) = √300 = 17.32 mm. This length determines the roll force and torque; roll separating force F = Y_avg × w × L where w = strip width and Y_avg = mean flow stress."),

      P("State the sequence of open-die forging operations to form a connecting rod blank from a round billet.",
        "Fullering → edging → blocking → finishing",
        "Fullering distributes metal; blocking approximates shape; finishing refines",
        "Fullering: reduces cross-section and distributes metal along the length. Edging: gathers metal at specific points. Blocking: approximates the final shape in a blocking die. Finishing: produces final dimensions in a finishing impression with flash. Flash in impression-die forging builds pressure to fill die cavities."),

      P("For a forging upset operation, a 50 mm diameter, 80 mm long billet is upset to 35 mm height. Compute the true strain.",
        "ε = ln(h₀/h₁) = ln(50/35) = 0.357",
        "True strain = ln(original height / final height)",
        "In upsetting, true strain ε = ln(h₀/h₁) where h₀ is original height and h₁ is final height. However, the billet was 50 mm dia × 80 mm long, and is upset to 35 mm height. So ε = ln(80/35) = ln(2.286) = 0.827. This high strain requires multiple blows to avoid surface cracking."),

      P("Compute the spindle speed (RPM) when cutting speed v = 30 m/min and workpiece diameter d = 50 mm.",
        "n = 1000v / (πd) = 30 000 / 157.08 = 191 RPM",
        "n = 1000v / (πd)",
        "Spindle speed: n = 1000v / (πd) where v is in m/min and d in mm. n = 1000 × 30 / (π × 50) = 30 000 / 157.08 = 191 RPM. Cutting speed v depends on work material and tool material: HSS on mild steel ≈ 30 m/min; carbide ≈ 150 m/min."),

      P("Calculate the machining time for turning a 100 mm long job at feed f = 0.2 mm/rev and spindle speed N = 600 RPM.",
        "t = L / (f × N) = 100 / (0.2 × 600) = 0.833 min = 50 s",
        "t = L / (feed × RPM)",
        "Machining time: t = L / (f × N) where L = length of cut, f = feed per revolution, N = RPM. t = 100 / (0.2 × 600) = 100 / 120 = 0.833 min = 50 s. Adding approach and overtravel (say 5 mm each) gives L = 110 mm → t = 0.917 min."),

      P("Calculate the drilling time for a through-hole of depth 40 mm, drill diameter 20 mm, feed 0.25 mm/rev, speed 500 RPM. (Approach ≈ 0.3d.)",
        "L = 40 + 6 = 46 mm; t = 46 / (0.25 × 500) = 0.368 min ≈ 22 s",
        "Approach = 0.3 × d for standard twist drill",
        "Drilling time: total length L = hole depth + approach. Approach for standard twist drill ≈ 0.3 × d = 0.3 × 20 = 6 mm. L = 40 + 6 = 46 mm. t = L / (f × N) = 46 / (0.25 × 500) = 46 / 125 = 0.368 min ≈ 22.1 s."),

      P("Calculate the table feed rate for a 4-tooth end mill at spindle speed 200 RPM and feed per tooth 0.1 mm.",
        "f_m = N × z × f_t = 200 × 4 × 0.1 = 80 mm/min",
        "f_m = RPM × number of teeth × feed per tooth",
        "Table feed: f_m = N × z × f_t = 200 × 4 × 0.1 = 80 mm/min. Feed per tooth (chip load) is selected based on cutter diameter and material: too high causes chatter and tool breakage, too low causes rubbing and work hardening."),

      P("For taper turning by the tailstock offset method, compute the offset if D = 40 mm, d = 30 mm, total job length = 200 mm, and length of tapered portion = 100 mm.",
        "Offset = (D − d)/2 × (L_total / L_taper) = 5 × 2 = 10 mm",
        "Offset = (D−d)/2 × (L_full / L_taper)",
        "Tailstock offset for taper: offset = (D − d)/2 × (L_total / L_taper). Here, (40−30)/2 = 5 mm, L_total/L_taper = 200/100 = 2. Offset = 5 × 2 = 10 mm. This method can only produce small tapers (typically < 1°) due to tailstock shift limitations."),

      P("Compute the number of full turns and fractional turn for the dividing head crank to cut 21 teeth on a gear blank (40:1 worm).",
        "Turns = 40/21 = 1 + 19/21; use 21-hole circle, crank 1 full turn + 19 holes",
        "Crank turns = 40 / N (N = number of teeth)",
        "Dividing head ratio 40:1: crank turns = 40/N = 40/21 = 1.9048. This is 1 full turn + 19/21 of a turn. Use a 21-hole circle plate, set the sector to skip 19 holes (actually include 19 holes), crank 1 full turn plus 19 holes. This indexes the job by 1/21 of a revolution."),

      P("Using Taylor's tool life equation VT^0.25 = 200, compute tool life at V = 30 m/min.",
        "T = (200/30)^(1/0.25) = (6.667)^4 = 1975 min",
        "T = (C/V)^(1/n)",
        "Taylor equation: VT^n = C → T = (C/V)^(1/n). T = (200/30)^(1/0.25) = (6.667)^4 = 1975 min ≈ 32.9 hours. If speed increases to 60 m/min: T₂ = (200/60)^4 = (3.333)^4 = 123.5 min. Doubling speed reduces tool life by about 93.75 %."),

      P("In Taylor's equation, if doubling the cutting speed reduces tool life from 60 min to 10 min, find the tool life exponent n.",
        "n = 0.387",
        "Use V₁T₁^n = V₂T₂^n; solve for n",
        "From VT^n = C: V₁T₁^n = V₂T₂^n → (V₂/V₁) = (T₁/T₂)^n. With V₂ = 2V₁, T₁ = 60, T₂ = 10: 2 = (60/10)^n = 6^n. Taking logs: ln 2 = n × ln 6 → n = 0.693/1.792 = 0.387. This is a typical value for carbide tooling on steel."),

      P("Compute the material removal rate (MRR) in turning when v = 80 m/min, f = 0.3 mm/rev, d = 2 mm.",
        "MRR = v × f × d = 80 × 1000 × 0.3 × 2 = 48 000 mm³/min = 48 cm³/min",
        "MRR = cutting speed (mm/min) × feed × depth",
        "MRR in turning: Q = v × f × d where v must be in mm/min. v = 80 m/min = 80 000 mm/min. Q = 80 000 × 0.3 × 2 = 48 000 mm³/min = 48 cm³/min = 800 mm³/s. This represents the volume of metal removed per unit time and is used to estimate power and machining time."),

      P("Compute the cutting force Fc when specific cutting force Kc = 2200 N/mm² and the undeformed chip area is 0.6 mm².",
        "Fc = Kc × A = 2200 × 0.6 = 1320 N",
        "Cutting force = specific cutting energy × chip area",
        "Cutting force: Fc = Kc × A where Kc = specific cutting force (N/mm²) and A = undeformed chip area = f × d (feed × depth). For turning with f = 0.3 mm/rev and d = 2 mm: A = 0.6 mm². Fc = 2200 × 0.6 = 1320 N. Power = Fc × v / 60 000 kW."),

      P("What is the recommended clearance (relief) angle for an HSS tool turning mild steel?",
        "6 to 8 degrees",
        "Clearance prevents tool flank rubbing",
        "The clearance (relief) angle is typically 6–8° for HSS tools on mild steel. Too small an angle causes excessive rubbing and heat; too large weakens the cutting edge. Carbide tools use smaller clearance (4–6°) because the edge is stronger. For aluminium, clearance of 8–12° is used."),

      P("State the least count of a standard vernier caliper where 50 vernier scale divisions coincide with 49 main scale divisions (1 MSD = 1 mm).",
        "LC = 1 MSD − 1 VSD = 1 − 49/50 = 0.02 mm",
        "LC = MSD − VSD",
        "Least count: LC = 1 MSD − 1 VSD = 1 − (49/50) = 1 − 0.98 = 0.02 mm. The main scale division (MSD) is 1 mm, and 50 vernier scale divisions (VSD) span 49 mm. Each VSD = 49/50 = 0.98 mm. The difference gives the resolution of 0.02 mm."),

      P("A vernier caliper main scale reads 34 mm and the 12th vernier division coincides with a main scale division. What is the reading?",
        "Reading = 34 + (12 × 0.02) = 34.24 mm",
        "Main scale + (coinciding VSD × LC)",
        "Total reading = main scale reading + vernier coincidence × LC = 34 + (12 × 0.02) = 34 + 0.24 = 34.24 mm. First read the main scale to the left of the vernier zero, then find which vernier line coincides with a main scale line, and multiply by the least count."),

      P("A micrometer has a sleeve reading of 12.5 mm and thimble reading of 0.34 mm. What is the total reading?",
        "12.5 + 0.34 = 12.84 mm",
        "Sleeve + thimble = total reading",
        "Micrometer reading = sleeve scale reading + thimble reading. The sleeve shows main divisions (0.5 mm pitch) and the thimble has 50 divisions. Sleeve = 12.5 mm (12 mm + half division visible), thimble = 0.34 mm (34th division × 0.01). Total = 12.5 + 0.34 = 12.84 mm."),

      P("Build a slip gauge stack for 43.725 mm using a standard 87-piece set.",
        "1.005 + 1.220 + 1.500 + 40.000 = 43.725 mm (4 gauges)",
        "Build from the last decimal place upward",
        "Slip gauge build (standard set): 43.725 → 1.005 (leaves 42.720), then 1.220 (leaves 41.500), then 1.500 (leaves 40.000), then 40.000. Stack: 1.005 + 1.220 + 1.500 + 40.000 = 43.725 mm. Start from the thousandths place, select the gauge that brings the remainder to three decimal zeros, and repeat."),

      P("Compute the sine bar angle when gauge block height h = 12.5 mm and sine bar length L = 100 mm.",
        "sin θ = h/L = 12.5/100 = 0.125; θ = 7.18°",
        "sin θ = h / L",
        "Sine bar: sin θ = h/L where h = slip gauge height, L = sine bar length. sin θ = 12.5/100 = 0.125. θ = arcsin(0.125) = 7.18°. Verify: cos θ = √(1 − 0.125²) = √0.9844 = 0.9922. The sine bar is placed on a surface plate with slip gauges under one roller to set the angle for inspection."),

      P("For an external metric thread of pitch P = 1.5 mm measured by the three-wire method, state the formula for the best wire diameter and compute it.",
        "d_w = 0.5774 × P = 0.5774 × 1.5 = 0.866 mm",
        "Best wire sits on thread flank at pitch line",
        "Best wire diameter for metric 60° thread: d_w = 0.5774 × P. For P = 1.5 mm: d_w = 0.5774 × 1.5 = 0.866 mm. The three-wire measurement: D = M − 3d_w + 0.866P = M − 3(0.866) + 0.866(1.5) = M − 2.598 + 1.299 = M − 1.299 mm."),

      P("For a 25 mm shaft with H7/g6 fit, state the hole and shaft limits. (H7: 0 to +21 µm; g6: −7 to −20 µm.)",
        "Hole: 25.000 to 25.021 mm; Shaft: 24.980 to 24.993 mm",
        "H7/g6 is a sliding/clearance fit",
        "H7 hole for 25 mm: 25.000 (lower) to 25.021 mm (upper), tolerance = 21 µm. g6 shaft: 24.980 (lower) to 24.993 (upper), tolerance = 13 µm. Max clearance = 25.021 − 24.980 = 0.041 mm. Min clearance = 25.000 − 24.993 = 0.007 mm. This is a precision clearance fit for location."),

      P("What sizes would a go gauge and no-go gauge have for a 25 H7 hole?",
        "Go = 25.000 mm; No-Go = 25.021 mm",
        "Go checks lower limit; No-Go checks upper limit",
        "For a 25 H7 hole (limits 25.000 to 25.021 mm): Go gauge = 25.000 mm (minimum hole size), No-Go gauge = 25.021 mm (maximum hole size). The Go gauge must pass through; the No-Go gauge must not pass through. This confirms the hole is within tolerance."),

      P("A dial test indicator with a least count of 0.01 mm shows a deflection of 15 divisions. What is the measured value?",
        "15 × 0.01 = 0.15 mm",
        "Reading = divisions × LC",
        "Dial indicator reading = number of divisions × least count = 15 × 0.01 = 0.15 mm. Dial indicators are used on surface plates to measure runout, flatness, alignment, and small displacements. The pointer movement is magnified by an internal gear train."),

      P("What frequency range is used in ultrasonic testing (UT) of metals?",
        "0.5 to 25 MHz",
        "Couplant: oil, glycerine, or water-based gel",
        "Ultrasonic testing uses frequencies from 0.5 to 25 MHz. Lower frequencies (0.5–2 MHz) penetrate deeper in coarse-grained materials; higher frequencies (5–25 MHz) give better resolution for thin sections. A couplant (oil, glycerine, gel) is essential to transmit sound from the transducer into the workpiece since air would reflect the beam."),

      P("In dye penetrant testing (DPT), what is the typical dwell time for the penetrant on an aluminium surface?",
        "5 to 30 minutes depending on material and defect type",
        "Longer dwell for fine cracks; shorter for gross defects",
        "Dye penetrant dwell time on aluminium is typically 5–30 minutes. For fine cracks in low-porosity metals, use 15–30 min; for gross surface-breaking defects, 5–10 min. After dwell, excess penetrant is cleaned off, developer is applied, and after a further developer dwell of 10–30 min, inspection is done under UV or visible light depending on penetrant type."),

      P("In which types of materials can magnetic particle inspection (MPI) be used?",
        "Ferromagnetic materials only: iron, steel, cobalt, nickel alloys",
        "Non-ferromagnetic (Al, Cu, SS austenitic) cannot be tested by MPI",
        "Magnetic particle inspection works only on ferromagnetic materials because it relies on the material being capable of carrying a magnetic field. Defects cause flux leakage that attracts fine iron particles, making them visible. Non-ferromagnetic materials such as aluminium, copper, and austenitic stainless steel require other NDT methods."),

      P("In CNC programming, what is the difference between absolute and incremental positioning?",
        "Absolute: all coordinates from fixed origin (G90); incremental: from current position (G91)",
        "G90 = absolute; G91 = incremental (fanuc)",
        "In absolute programming (G90), all tool positions are referenced from a single fixed program origin (workpiece zero). In incremental (G91), each move is specified relative to the current tool position. Absolute is easier to edit and debug; incremental is useful for repetitive patterns."),

      P("What is the difference between G00 and G01 in CNC?",
        "G00 = rapid traverse (non-cutting positioning); G01 = linear interpolation at programmed feed rate",
        "G00 is fastest move, no cutting",
        "G00 commands the machine to move at maximum rapid traverse rate to the specified coordinate, with no cutting taking place. G01 commands linear interpolation at the programmed feed rate (F value), used for actual cutting moves. G00 follows the machine's rapid rate (e.g., 15–30 m/min); G01 uses the F value."),

      P("What is a tool offset in CNC machining?",
        "A stored value compensating for tool length and/or diameter deviations from the program reference",
        "Geometry offset and wear offset",
        "Tool offsets compensate for differences between the programmed tool position and the actual tool tip. Geometry offset defines the tool length and diameter relative to the tool holder reference. Wear offset allows fine adjustment to compensate for gradual tool wear without reprogramming. Both are stored in the tool offset register."),

      P("What does spindle speed override do on a CNC machine?",
        "Adjusts the programmed spindle speed as a percentage (e.g., 50–150 %) in real time",
        "Override allows operator to fine-tune speed",
        "Spindle speed override lets the operator adjust the actual spindle speed as a percentage of the programmed S value, typically in 5–10 % increments over a range of 50–150 %. This is used to optimise cutting conditions, reduce chatter, or compensate for material hardness variation without modifying the program."),

      P("For a turning operation with cutting speed v = 40 m/min and tool life exponent n = 0.25, by what percentage does tool life decrease when speed is increased from 40 to 80 m/min?",
        "93.75 % decrease",
        "V₁T₁^n = V₂T₂^n → T₂ = T₁ × (V₁/V₂)^(1/n)",
        "Taylor: V₁T₁^n = V₂T₂^n. T₂/T₁ = (V₁/V₂)^(1/n) = (40/80)^(1/0.25) = (0.5)^4 = 0.0625. So T₂ = 6.25 % of T₁, meaning a decrease of 93.75 %. Doubling speed with n = 0.25 drastically reduces tool life."),

      P("What is the specific cutting energy for mild steel and for aluminium?",
        "Mild steel ≈ 2500 N/mm²; aluminium ≈ 700 N/mm²",
        "Harder materials need more energy per unit volume",
        "Specific cutting energy (Kc): mild steel ≈ 2000–2500 N/mm², stainless steel ≈ 2500–3500 N/mm², aluminium ≈ 600–800 N/mm², cast iron ≈ 900–1200 N/mm². This value is used in power and force calculations: P = Kc × MRR / 60 000 kW."),

      P("Compute the machining power required when MRR = 48 000 mm³/min and specific cutting energy Kc = 2200 N/mm².",
        "P = Kc × MRR / 60 000 = 2200 × 48 000 / 60 000 = 1760 W = 1.76 kW",
        "P (kW) = Fc (N) × v (m/min) / 60 000",
        "Power: P = Kc × MRR / 60 000 = 2200 × 48 000 / 60 000 = 105 600 / 60 = 1760 W = 1.76 kW. This is the net cutting power at the tool tip. The motor must be sized higher (typically × 1.5–2) to account for transmission losses."),

      P("What is the chip thickness ratio r in metal cutting, and what does a value of r < 1 indicate?",
        "r = t₀/t_c (undeformed / deformed chip thickness); r < 1 means chip is thicker than cut, indicating shear and compression",
        "r is always ≤ 1 for orthogonal cutting",
        "Chip thickness ratio: r = t₀/t_c where t₀ = undeformed chip thickness (uncut chip) and t_c = deformed (actual) chip thickness. Since metal is compressed during shearing, t_c > t₀, so r < 1 typically (0.2–0.6). A higher r means more efficient cutting with less deformation. r = 1 implies no plastic deformation."),

      P("Compute the shear angle φ when chip thickness ratio r = 0.4 and rake angle α = 10°.",
        "tan φ = r cos α / (1 − r sin α) = 0.4 cos 10° / (1 − 0.4 sin 10°) = 0.3939 / 0.9305 = 0.423; φ = 22.9°",
        "Merchant's relation: φ = 45° + α/2 − β/2",
        "Shear angle: tan φ = r cos α / (1 − r sin α). cos 10° = 0.9848, sin 10° = 0.1736. tan φ = (0.4 × 0.9848) / (1 − 0.4 × 0.1736) = 0.3939 / 0.9305 = 0.4234. φ = arctan(0.4234) = 22.9°. Higher rake angle → higher shear angle → less cutting force."),

      P("Compute the torque required when cutting force Fc = 1320 N and workpiece diameter d = 50 mm on a lathe.",
        "T = Fc × d / 2 = 1320 × 25 = 33 000 N·mm = 33 N·m",
        "Torque = Force × radius",
        "Torque: T = Fc × (d/2) = 1320 × 25 = 33 000 N·mm = 33 N·m. Power from torque: P = 2πNT/60 = 2π × 600 × 33 / 60 = 2073 W ≈ 2.07 kW. This must be within the lathe's spindle motor capacity at the given speed."),

      P("What is the recommended stock allowance (reaming allowance) left after drilling before reaming a 20 mm hole?",
        "0.15 to 0.5 mm on diameter (0.075–0.25 mm per side)",
        "Reaming removes small amount for finish",
        "Before reaming, leave 0.15–0.5 mm on diameter (0.075–0.25 mm per side). For a 20 mm reamed hole, drill at 19.5–19.85 mm diameter. Too much stock increases reamer loading and heat; too little causes the reamer to rub rather than cut, giving poor surface finish and dimensional inaccuracy."),

      P("State the approximate HSS cutting speed for mild steel and for cast iron in m/min.",
        "Mild steel: 25–35 m/min; cast iron: 20–30 m/min",
        "Cutting speed depends on tool and work material",
        "HSS cutting speeds (m/min): mild steel 25–35, medium carbon steel 20–30, stainless steel 15–25, cast iron 20–30, brass 60–100, aluminium 100–300. Carbide tools can run 3–5× faster. These values are starting points; actual speed depends on rigidity, coolant, depth, and finish required."),

      P("State the approximate carbide cutting speed for mild steel in m/min.",
        "150 to 250 m/min",
        "Carbide ≈ 4–6× faster than HSS",
        "Carbide (uncoated) cutting speed for mild steel: 150–250 m/min. Coated carbide (TiN, TiAlN): 200–350 m/min. Ceramics: 500–1000 m/min. CBN: 300–800 m/min for hardened steel. Diamond (PCD): 500–2000 m/min for non-ferrous metals."),

      P("In peripheral milling, compute the table feed when spindle speed = 400 RPM, cutter has 6 teeth, feed per tooth = 0.08 mm.",
        "f_m = N × z × f_t = 400 × 6 × 0.08 = 192 mm/min",
        "Table feed = RPM × teeth × feed/tooth",
        "Peripheral (slab) milling: f_m = N × z × f_t = 400 × 6 × 0.08 = 192 mm/min. Feed per tooth for peripheral milling is typically lower than face milling because more teeth are engaged simultaneously, distributing the load. Too high feed causes chatter and poor finish."),

      P("What is the formula for cutting speed v in m/min from RPM n and diameter d in mm?",
        "v = π × d × n / 1000 m/min",
        "v = πdN/1000",
        "Cutting speed: v = π × d × n / 1000 m/min where d is in mm and n in RPM. This is the surface speed at the workpiece/tool interface. Rearranging: n = 1000v / (πd). For d = 50 mm, n = 200 RPM: v = π × 50 × 200 / 1000 = 31.4 m/min."),

      P("In a CNC machine, what is G41 and G42 used for?",
        "G41 = cutter radius compensation LEFT; G42 = cutter radius compensation RIGHT",
        "Compensates for tool radius so programmed path = part profile",
        "G41 offsets the tool to the left of the programmed path; G42 to the right, by the radius stored in the tool offset register. This allows programming the actual part contour without calculating offset paths. The tool must approach the work with a lead-in move of sufficient length (≥ tool radius)."),

      P("What is climb milling versus conventional milling?",
        "Climb: cutter rotation same direction as feed; conventional: opposite direction",
        "Climb gives better finish; conventional is safer on older machines",
        "In climb (down) milling, the cutter rotates in the same direction as table feed, engaging maximum chip thickness first. Gives better surface finish and longer tool life but can pull the work into the cutter on machines with backlash. In conventional (up) milling, chip starts thin and builds up; safer on older machines with backlash."),

      P("For a face milling operation with cutter diameter 63 mm, 5 teeth, feed per tooth 0.1 mm, at 300 RPM, compute the table feed.",
        "f_m = N × z × f_t = 300 × 5 × 0.1 = 150 mm/min",
        "Table feed = RPM × number of teeth × feed per tooth",
        "Face milling table feed: f_m = N × z × f_t = 300 × 5 × 0.1 = 150 mm/min. With effective number of teeth ≈ 3 (for partial engagement) and width of cut, the actual MRR and forces can be estimated. Adjust feed per tooth based on work material and surface finish requirement."),

      P("What is the quick-return mechanism ratio in a shaper if the cutting stroke takes 3 s and the return stroke takes 1 s?",
        "Ratio = 3:1 (cutting : return)",
        "Return stroke is faster to reduce idle time",
        "In a shaper, the quick-return mechanism (crank and slotted lever or Whitworth) makes the return stroke faster than the cutting stroke. Here cutting : return = 3:1, so the return takes 1/4 of the total cycle. Cutting speed on the return stroke is 3× the forward speed. Total cycle = 4 s."),

      P("State the formula for shaper stroke length when the work length is L and the tool overtravel is C on each side.",
        "S = L + 2C",
        "Overtravel ensures complete machining and clearance",
        "Shaper stroke length: S = L + 2C where L = length of work to be machined and C = overtravel on each side (typically 15–25 mm). If L = 150 mm and C = 20 mm, S = 150 + 40 = 190 mm. The stroke must be set slightly longer than the work to ensure full coverage."),

      P("In a grinding wheel marking A46K5V, what does '46' represent?",
        "46 = grit (grain) size; medium grain suitable for general grinding",
        "A=alumina, 46=grain, K=grade, 5=structure, V=vitrified",
        "In grinding wheel designation A46K5V: A = abrasive type (aluminium oxide), 46 = grain size (medium, suitable for general purpose), K = grade (medium-hard, resisting wheel wear), 5 = structure (open, allowing chip clearance), V = bond type (vitrified). Coarser grains (24) for rough grinding; finer (80+) for finish."),

      P("What is the maximum permissible gap between the bench grinder wheel and the tool rest / spark deflector?",
        "Tool rest gap ≤ 3 mm; spark deflector gap ≤ 1.6 mm (⅟₁₆ inch)",
        "Gap must be small to prevent work being drawn in",
        "For bench grinder safety: the tool rest must be within 3 mm (⅛ inch) of the wheel, and the spark deflector/cuard within 1.6 mm (¹⁄₁₆ inch). Larger gaps risk the workpiece being pulled between the wheel and guard. Never use the side of the wheel unless it is specifically designed for side grinding."),

      P("What is the material removal rate formula for surface grinding?",
        "Q = v_w × d × b where v_w = table speed, d = depth of cut, b = width of cut",
        "Q in mm³/min: v_w (mm/min) × d (mm) × b (mm)",
        "Surface grinding MRR: Q = v_w × d × b. For v_w = 15 m/min = 15 000 mm/min, d = 0.02 mm, b = 50 mm: Q = 15 000 × 0.02 × 50 = 15 000 mm³/min. Grinding removes very small chips; MRR is low compared to turning but gives excellent surface finish (Ra 0.2–1.6 µm)."),

      P("Compute the surface roughness (theoretical) in turning with feed f = 0.2 mm/rev and tool nose radius r = 0.8 mm.",
        "Ra = f² / (32r) = 0.04 / 25.6 = 0.00156 mm ≈ 1.56 µm",
        "Ra = f² / (32 × nose radius)",
        "Theoretical surface roughness: Ra = f² / (32r). Ra = (0.2)² / (32 × 0.8) = 0.04 / 25.6 = 0.00156 mm = 1.56 µm. To improve finish, reduce feed or increase nose radius. Practical Ra is higher due to vibrations, built-up edge, and material properties."),

      P("What is the purpose of using cutting fluid in machining?",
        "Cooling, lubrication, chip flushing, and surface finish improvement",
        "Coolant reduces temperature; lubricant reduces friction",
        "Cutting fluids serve four purposes: (1) Cooling: reduce temperature at tool-chip interface, extending tool life. (2) Lubrication: reduce friction between tool and chip, lowering cutting forces. (3) Chip flushing: wash away chips from the cutting zone. (4) Surface finish: improve finish by reducing built-up edge formation. Water-soluble oils are most common."),

      P("What type of cutting fluid is used for machining aluminium and why?",
        "Dry or soluble oil (water-soluble) or kerosene; avoid sulphurised oils",
        "Sulphurised oils stain aluminium; kerosene prevents BUE",
        "Aluminium is best machined dry or with soluble oil, kerosene, or light mineral oil. Sulphurised and chlorinated EP oils cause staining and corrosion on aluminium. Kerosene or paraffin helps prevent built-up edge (BUE) which aluminium is prone to. High cutting speeds with sharp tools reduce BUE tendency."),

      P("State the recommended clearance angle for a carbide tool turning mild steel.",
        "4 to 6 degrees",
        "Smaller than HSS (6–8°) because carbide edge is stronger",
        "Carbide tools need smaller clearance angles (4–6°) than HSS (6–8°) because the carbide edge is harder and more wear-resistant but more brittle. A larger clearance angle would weaken the edge. For ceramic tools, clearance is even smaller (3–5°). For aluminium, larger clearance (8–12°) is used to prevent BUE."),

      P("What is the ideal rake angle for machining aluminium with carbide tools?",
        "15 to 25° positive rake",
        "Soft, ductile materials need large positive rake",
        "Aluminium is soft and ductile, requiring large positive rake angles (15–25°) to reduce cutting forces, prevent built-up edge, and promote chip flow. Negative rake angles (−5° to −10°) are used for hardened steel, cast iron, and interrupted cuts where edge strength is critical."),

      P("Compute the MRR in drilling a 25 mm hole to 50 mm depth at feed 0.3 mm/rev and 400 RPM.",
        "Q = (π/4) × d² × f × N = (π/4) × 625 × 0.3 × 400 = 58 905 mm³/min",
        "Q = (π/4) × d² × feed × RPM",
        "Drilling MRR: Q = (π/4) × d² × f × N = 0.7854 × 625 × 0.3 × 400 = 0.7854 × 75 000 = 58 905 mm³/min ≈ 58.9 cm³/min. This is a volumetric rate; the power requirement = Kc × Q / 60 000."),

      P("Estimate the thrust force in drilling a 20 mm hole at 0.3 mm/rev when the specific thrust coefficient Kt = 2000 N/mm².",
        "F_t = Kt × d × f = 2000 × 20 × 0.3 = 12 000 N = 12 kN",
        "Thrust ≈ Kt × d × f for standard 118° twist drills",
        "Drilling thrust is estimated empirically: F_t ≈ Kt × d × f where d = drill diameter (mm), f = feed per revolution (mm/rev), Kt = specific thrust coefficient (~2000 N/mm² for mild steel). F_t = 2000 × 20 × 0.3 = 12 000 N = 12 kN. Torque ≈ F_t × d/6 = 12 000 × 20/6 = 40 000 N·mm = 40 N·m. The thrust is resisted by the tailstock quill; typical thrust is 0.2–0.5 of the tangential cutting force."),

      P("What change gears are needed to cut an M2 × 0.4 mm pitch thread when the lathe leadscrew pitch is 6 mm?",
        "Ratio = pitch / leadscrew = 0.4 / 6 = 1/15; e.g., drivers 24 and 20, driven 60 and 120: (24 × 20)/(60 × 120) = 1/15",
        "Gear ratio = thread pitch (mm) / leadscrew pitch (mm)",
        "Thread cutting gear ratio = required thread pitch / leadscrew pitch = 0.4 / 6 = 1/15. A compound gear train is set: drivers 24 and 20 connect to driven gears 60 and 120: (24 × 20)/(60 × 120) = 480 / 7200 = 1/15. The ratio is verified against the lathe change-gear chart; standard change gears include 20, 24, 25, 30, 35, 40, 45, 48, 50, 55, 60, 65, 70, 75, 80, 90, 95, 100 and 120 teeth. The reverse lever selects right-hand or left-hand threading."),

      P("State the formula for taper turning by the tool offset (compound rest) method.",
        "tan α = (D − d) / (2L); compound rest set at half taper angle α",
        "Compound rest swivelled to half the included angle",
        "For taper turning by compound rest: the half-angle α = arctan[(D − d) / (2L)] where D = large diameter, d = small diameter, L = tapered length. The compound rest is swivelled to angle α, and the tool is fed by the compound slide. For D = 40 mm, d = 30 mm, L = 100 mm: α = arctan(5/100) = arctan(0.05) = 2.86°."),

      P("For a cylindrical grinding operation, compute the metal removal parameter Z_w when wheel speed vs = 30 m/s, work speed vw = 0.5 m/s, depth d = 0.02 mm, and specific energy U = 30 Ws/mm³.",
        "MRR = vw × width × d; Z_w depends on wheel-work combination",
        "Grinding MRR ≈ v_w × b × d",
        "In cylindrical grinding, MRR = v_w × b × d where v_w = work surface speed (m/s → mm/s), b = width of cut, d = infeed depth. For v_w = 500 mm/s, b = 20 mm, d = 0.02 mm: MRR = 500 × 20 × 0.02 = 200 mm³/s = 12 000 mm³/min. Power = U × MRR = 30 × 200 = 6000 W = 6 kW."),

      P("What is the recommended feed per tooth for a face milling cutter (50 mm dia, 4 teeth) on mild steel with carbide inserts?",
        "0.1 to 0.2 mm per tooth",
        "Larger cutter = higher feed per tooth",
        "Feed per tooth for face milling with carbide on mild steel: 0.1–0.2 mm per tooth for general purpose. Roughing: 0.15–0.25 mm; finishing: 0.05–0.1 mm. For a 50 mm cutter at 400 RPM: f_m = 400 × 4 × 0.15 = 240 mm/min. Too high feed causes insert chipping; too low causes rubbing and work hardening."),

      P("What is the depth of cut recommended for roughing and finishing in turning mild steel with carbide tools?",
        "Roughing: 2–5 mm; finishing: 0.25–0.5 mm",
        "Roughing prioritises MRR; finishing prioritises accuracy",
        "Roughing depth of cut: 2–5 mm (limited by machine power and rigidity). Finishing depth: 0.25–0.5 mm. For roughing, use higher feed (0.2–0.4 mm/rev) and moderate speed. For finishing, use lower feed (0.05–0.15 mm/rev) and higher speed to achieve Ra 0.8–3.2 µm."),

      P("What is the built-up edge (BUE) and how is it prevented?",
        "BUE: material welded to tool tip at low speed/high feed; prevent by increasing speed, using coolant, sharp tool",
        "BUE forms at low cutting speed on ductile materials",
        "Built-up edge (BUE) is a lump of work material pressure-welded to the tool tip due to high temperature and pressure at low cutting speeds. It periodically breaks off, damaging the surface finish. Prevent by: increasing cutting speed, using cutting fluid, increasing rake angle, using coated tools, and selecting proper feed rate."),

      P("State the advantages of using coated carbide inserts over uncoated.",
        "Higher speed (30–50 % more), longer tool life (2–5×), reduced BUE, better finish",
        "TiN, TiCN, Al₂O₃ coatings reduce wear and friction",
        "Coated carbide inserts (TiN, TiCN, Al₂O₃, TiAlN) offer: (1) 30–50 % higher cutting speeds. (2) 2–5× longer tool life. (3) Reduced friction and BUE tendency. (4) Better surface finish. (5) Thermal barrier protecting the carbide substrate. The coating is applied by CVD or PVD, typically 5–15 µm thick."),

      P("What is the formula for power in turning and compute it for Fc = 1320 N and v = 80 m/min?",
        "P = Fc × v / 60 000 = 1320 × 80 / 60 000 = 1.76 kW",
        "P (kW) = Fc (N) × v (m/min) / 60 000",
        "Cutting power: P = Fc × v / 60 000 kW. P = 1320 × 80 / 60 000 = 105 600 / 60 000 = 1.76 kW. Include transmission efficiency (typically 0.75–0.85) to find motor power: P_motor = P / η = 1.76 / 0.8 = 2.2 kW minimum motor required."),

      P("What is chatter in machining and how is it prevented?",
        "Self-excited vibration between tool and work; prevent by changing speed, increasing rigidity, reducing overhang",
        "Chatter reduces finish and tool life",
        "Chatter is a self-excited vibration caused by regenerative cutting forces. The tool leaves a wavy surface on one pass; on the next pass, the varying chip thickness causes oscillating forces. Prevention: (1) Change spindle speed (move out of resonant range). (2) Increase rigidity (shorter tool overhang, stiffer setup). (3) Reduce depth of cut. (4) Use variable helix/pitch cutters."),

      P("What is the purpose of a chip breaker on a carbide insert?",
        "Curls and breaks long continuous chips into small manageable pieces",
        "Prevents long chips from tangling around work/tool",
        "Chip breakers are grooves or moulded geometries on the rake face of carbide inserts that force chips to curl tightly and break. Without them, ductile materials produce long continuous chips that wrap around the work, damage the surface, and are hazardous. Chip breaker geometry is selected based on feed rate and material: lighter for low feed, aggressive for high feed."),

      P("Compute the shear force Fs when Fc = 1320 N, φ = 22.9°, and α = 10°.",
        "Fs = Fc cos(φ + β − α)... Using Merchant's circle: Fs ≈ Fc × cos(45° + α/2) ≈ 820 N",
        "Merchant circle relates forces via shear angle",
        "Using Merchant's relationship: the shear force Fs = Fc × cos(φ + β − α) − Ft × sin(φ + β − α). Simplified for estimation: Fs ≈ Fc × cos(φ + β − α). With typical friction angle β ≈ 25°: φ + β − α = 22.9 + 25 − 10 = 37.9°. Fs = 1320 × cos 37.9° = 1320 × 0.789 = 1041 N. The shear force acts along the shear plane."),

      P("What is the function of a centre drill?",
        "Drills a conical centre hole to locate a workpiece between dead and live centres",
        "60° conical seat for lathe centres",
        "A centre drill combines a small pilot drill with a 60° countersink. It is used to drill a precise centre hole in the end of a workpiece so it can be mounted between centres on a lathe or grinding machine. The 60° angle matches standard lathe dead/live centres. Centre holes must be clean and accurately drilled for precision work."),

      P("What are the standard angles on a general-purpose HSS twist drill?",
        "Point angle 118°, lip relief 8–12°, helix angle 25–35°",
        "118° for general; 135° for harder materials",
        "Standard HSS twist drill: point angle = 118° (for general purpose), lip clearance/relief angle = 8–12°, helix angle = 25–35° (for general materials). For stainless steel and harder materials, a 135° point angle is used to reduce thrust. For aluminium, 90–118° point angle with larger clearance."),

      P("State the force required to shear a 50 mm diameter blank from 2 mm sheet with shear strength 300 MPa.",
        "F = π × D × t × τ = π × 50 × 2 × 300 = 94 248 N ≈ 94.2 kN",
        "Blanking force = perimeter × thickness × shear strength",
        "Blanking force: F = π × D × t × τ = π × 50 × 2 × 300 = 94 248 N ≈ 94.2 kN. Press capacity should be at least 1.3 × 94.2 = 122 kN. For punch and die clearance: punch-die gap = 6–10 % of thickness per side = 0.12–0.20 mm for 2 mm mild steel."),

      P("What is the purpose of stagging (stepped) punches in blanking thick plates?",
        "Reduces maximum blanking force by shearing in stages rather than all at once",
        "Staggered punch tips reduce peak force",
        "Stagging (stepped) punches have tips at different heights so that the blanking force is applied progressively around the perimeter. This reduces the maximum press force needed (up to 30–40 % reduction) but increases the stroke length and may produce a slightly uneven edge. Used for thick plates where full perimeter force would exceed press capacity."),

      P("What is the drawing ratio in deep drawing and what is its typical limit for a single draw?",
        "Drawing ratio = D_blank / d_cup; limit ≈ 2.0 for single draw",
        "DR > 2.0 risks tearing; use multiple draws",
        "Drawing ratio = blank diameter / cup diameter. For a single draw, the maximum drawing ratio is about 2.0 (some sources say 1.8–2.0 for mild steel). If D = 200 mm, d = 100 mm → DR = 2.0 (at limit). For DR > 2, multiple draws are needed, with each draw reducing diameter by 30–40 % max. A draw reduction of 30 % is safe: d₂ = 0.7 × d₁."),

      P("For a resistance spot weld on 2 mm mild steel, state the approximate electrode force needed.",
        "F = k × t^1.2 ≈ 2.5 × 2^1.2 ≈ 5.7 kN for 2 mm sheet (4–6 kN in practice)",
        "Force increases with sheet thickness",
        "Electrode force for spot welding mild steel: F ≈ k × t^1.2 kN where t is sheet thickness in mm. For t = 2 mm: F ≈ 2.5 × 2^1.2 ≈ 2.5 × 2.30 = 5.75 kN. Standard values for 2 mm mild steel: current 8–12 kA, force 4–6 kN, time 0.2–0.4 s (12–20 cycles at 50 Hz). Nugget diameter ≈ 5√t = 7 mm."),

      P("What is the minimum number of spot welds per metre recommended for overlapping sheet joints in structural applications?",
        "About 5 to 10 per metre depending on sheet thickness and load",
        "Spacing and edge distance guidelines apply",
        "Spot weld spacing depends on sheet thickness, loading, and codes. Typical: minimum pitch (centre-to-centre) = 4√t × 25 mm (minimum 25 mm), minimum edge distance = 2d (d = nugget diameter). For 2 mm sheet with 7 mm nuggets: minimum pitch ≈ 35 mm, giving about 28 welds/m. In practice, 5–10 per metre suffices for moderate loads."),

    ];

SSC_JE_ENC2_PROD.workshop = [
      P("What is a jack plane and what is its primary use?",
        "A long-bodied bench plane (350–450 mm) used for rough flattening and truing timber surfaces",
        "First plane applied to rough-sawn timber",
        "The jack plane (typically 350–450 mm overall) is the first plane applied to rough-sawn timber. Its relatively long sole bridges high spots and planes them down, progressively flattening the board. The iron (blade) is often set with a slight camber for rapid stock removal. It is followed by the try plane and smoothing plane for progressively finer finish."),

      P("What is a try square and how is it used?",
        "An L-shaped tool with a 90° angle used to check squareness of edges and faces",
        "Blade slides in stock for adjustable reach",
        "The try square consists of a stock (handle) and a blade set at exactly 90°. The stock is pressed against one face while the blade is checked against the adjacent face — any gap indicates non-squareness. Used in carpentry, joinery, and metal fitting. Some have a 45° bevel on one edge for checking mitre angles."),

      P("What is a sliding bevel and how does it differ from a try square?",
        "An adjustable-angle tool with a blade that locks at any angle; used for marking and checking non-90° angles",
        "Try square is fixed at 90°; bevel is adjustable",
        "The sliding bevel has a stock with a locking screw that allows the blade to be set and locked at any angle. Used to mark and transfer angles other than 90°, such as roof pitches, dovetails, and compound mitres. Unlike the try square (fixed 90°), the bevel can replicate any angle. The angle is typically set from a protractor, drawing, or existing workpiece."),

      P("What is a marking gauge and what does it do?",
        "A tool that scribes a line parallel to an edge of timber at a set distance",
        "Has a beam, fence, and scriber pin or knife",
        "The marking gauge consists of a beam with a fence (cross-piece) that slides along the timber edge, and a sharpened pin or knife at the end of the beam that scribes a line parallel to that edge. The beam is set to the desired distance using its built-in scale or by referencing the workpiece. Used for marking mortise lines, tenon shoulders, and parallel cuts."),

      P("What is a mortise gauge and how does it differ from a marking gauge?",
        "A gauge with two adjustable pins to mark both sides of a mortise simultaneously",
        "Two pins set to mortise width; single pin for marking gauge",
        "A mortise gauge has two pins (or one pin and a fixed reference) on the stem that can be adjusted to the exact width of a mortise. When slid along the timber, both pins scribe the two parallel lines defining the mortise walls. A standard marking gauge has only one scriber. Some mortise gauges combine both functions in one tool."),

      P("What is the purpose of a tenon saw in joinery?",
        "A fine-toothed back saw used for cutting tenon shoulders and precise crosscuts",
        "Stiffening back (brass or steel) prevents blade bending",
        "The tenon saw has a fine-toothed blade (15–22 TPI) with a heavy brass or steel back that stiffens the blade and prevents it from buckling. Designed for precise, straight crosscuts and tenon shoulder cuts. The thin kerf and fine teeth leave a smooth cut surface. Used with a bench hook or mitre block for accuracy."),

      P("What is the purpose of a wooden mallet in carpentry?",
        "Striking chisels and assembling joints without damaging tool handles or workpiece",
        "Wood-on-wood prevents splintering and damage",
        "A wooden mallet (beech or lignum vitae head on a wooden handle) is used to strike chisel handles and to tap joints together. Unlike a steel hammer, it does not mushroom or split the chisel handle and does not dent the workpiece. The flat striking faces deliver controlled force. Weight is typically 300–600 g."),

      P("What is the function of a bevel-edge chisel?",
        "A chisel with bevelled (angled) sides for fitting into tight corners such as mortise joints",
        "Bevelled sides allow access to confined spaces",
        "Bevel-edge chisels have the sides of the blade angled (bevelled) so the cutting edge can reach into tight corners such as the inside of a mortise, between dovetails, or into rebates. The thin cross-section near the cutting edge allows access where a standard chisel cannot fit. Available in widths from 3 mm to 50 mm."),

      P("Name two types of hand saws used in carpentry and state their tooth pitch.",
        "Crosscut saw: 12–15 TPI (cuts across grain); rip saw: 5–8 TPI (cuts along grain)",
        "Rip saw teeth shaped like chisels; crosscut like knives",
        "Crosscut saw (12–15 TPI): teeth sharpened like knives to sever wood fibres across the grain. Rip saw (5–8 TPI): teeth sharpened like chisels to chip away wood along the grain. Both are 500–700 mm long. Tenon saw (15–22 TPI) for fine work, bow saw for curves. Hacksaw (14–32 TPI) is for metal, not wood."),

      P("What are knots in timber and how do they affect strength?",
        "Knots are branch inclusions; they weaken the timber, especially in tension, and cause warping",
        "Dead knots may fall out; live knots are integral",
        "Knots are remnants of branches that were embedded as the tree grew. They disrupt grain continuity, reducing tensile and bending strength by 10–50 % depending on size and position. Dead (loose) knots can fall out, leaving holes. Live (tight) knots are firmly attached. Large knots near the tension face are most detrimental. Knots also cause uneven drying and warping."),

      P("What are shakes in timber and how do they differ from cracks?",
        "Shakes are separations along the grain that develop during growth or drying; not caused by external force",
        "Ring shake: between growth rings; star shake: radial",
        "Shakes are longitudinal separations along the grain. Ring shakes follow the growth rings; star shakes radiate from the centre. They develop due to wind stress during growth, frost, or uneven drying. Unlike cracks (which result from external loads or impact), shakes are natural defects. Timber with extensive shakes is unsuitable for structural use."),

      P("What are the three types of warp in timber?",
        "Bow (longitudinal curve), cup (cross-section curve), and twist (spiral distortion)",
        "Twist is the most problematic for joinery",
        "Bow: the board curves along its length when laid flat. Cup: the board curves across its width (cross-section becomes concave/convex). Twist: the board spirals along its length — the most serious warp for joinery. All are caused by uneven shrinkage during drying due to uneven grain, density, or moisture content. Proper seasoning with even airflow prevents warping."),

      P("What is a single-cut file and when is it used?",
        "A file with one set of parallel diagonal teeth; for smooth finishing and deburring",
        "Double-cut is faster; single-cut gives smoother finish",
        "A single-cut file has one row of parallel teeth cut at about 65–85° across the face. Used for finishing, smoothing, and honing. Produces a smoother surface than a double-cut file because there are no cross-grooves. Used on metal for final fit of joints, sharpening lawnmower blades, and general finishing. Stroke direction: push only."),

      P("What is a double-cut file and how does it differ from a single-cut?",
        "Two sets of diagonal teeth crossing each other; removes material faster",
        "Rasp: individual raised teeth for very rough work",
        "A double-cut file has two sets of diagonal teeth crossing each other at about 50–80°. The crossing pattern creates sharp cutting edges that remove material faster than a single-cut file. Used for rough filing and rapid stock removal on metal or soft materials. A rasp has individual raised pointed teeth for very coarse work on wood and plastic."),

      P("What is a safe edge on a file?",
        "One edge of the file that has no teeth, allowing filing in corners without damaging adjacent surfaces",
        "Safe edge is smooth (filed smooth) to prevent marking",
        "A safe (safe-edge) file has one edge that has been deliberately filed smooth, removing all teeth from that edge. This allows the file to be used in corners, slots, and against adjacent surfaces without marking or damaging them. For example, filing the inside of a rebate: the safe edge rides along the adjacent face while the toothed face cuts the bottom."),

      P("What TPI hacksaw blade should be selected for cutting a 25 mm mild steel round bar?",
        "18 to 24 TPI (teeth per inch)",
        "At least 3 teeth in contact at all times",
        "For hacksaw blade selection, at least 3 teeth must be in contact with the workpiece at all times. For 25 mm round mild steel: circumference ≈ 78 mm ≈ 3 inches. Use 18–24 TPI blade. General rule: mild steel 18–24 TPI, aluminium/copper 14 TPI, thin wall tube 24–32 TPI, sheet metal 32 TPI. Tension the blade until it pings when plucked."),

      P("What is the formula for calculating tap drill size?",
        "Drill diameter = O.D. − pitch. For M10 × 1.5: drill = 10 − 1.5 = 8.5 mm",
        "Tap drill size = major diameter − pitch",
        "Tap drill diameter = major diameter minus pitch for standard 75 % thread. For M10 × 1.5: drill = 10 − 1.5 = 8.5 mm. For M8 × 1.25: drill = 8 − 1.25 = 6.75 mm. For M6 × 1: drill = 6 − 1 = 5 mm. This gives approximately 75 % thread engagement. For 50 % thread (softer materials): drill = O.D. − 1.2 × pitch."),

      P("What is the purpose of a reamer and how much stock should be left before reaming?",
        "A finishing tool for sizing holes to precise tolerance; leave 0.15–0.5 mm on diameter",
        "Reaming improves finish, size, and concentricity",
        "A reamer enlarges a pre-drilled or bored hole to a precise size with excellent surface finish (Ra 0.4–1.6 µm). Stock allowance: 0.15–0.5 mm on diameter (0.075–0.25 mm per side). For a 20 mm reamed hole, drill at 19.5–19.85 mm. Reaming speed is typically 50–75 % of drilling speed, with feed 2–3× drilling feed. Use cutting fluid for best results."),

      P("What is a countersink and what angle does it produce?",
        "A conical cutter for creating a recess to seat flat-head screws; standard angles 82° or 90°",
        "82° for inch-series screws; 90° for metric",
        "A countersink is a conical cutting tool used to create a conical recess in a drilled hole so that a flat-head (countersunk) screw sits flush with or below the surface. Inch-series screws use 82° included angle; metric screws use 90°. Available in sizes matched to standard screw sizes. Countersinking speed is low (similar to reaming) with light feed."),

      P("What is the least count of a standard micrometer (pitch 0.5 mm, 50 thimble divisions)?",
        "LC = 0.5 / 50 = 0.01 mm",
        "Pitch / thimble divisions = LC",
        "Standard metric micrometer: main scale pitch = 0.5 mm (one revolution advances 0.5 mm), thimble has 50 divisions. Least count = 0.5 / 50 = 0.01 mm. Reading: sleeve reading (0.5 mm increments) + thimble reading (× 0.01 mm). For example: sleeve shows 6 mm + 0.5 mm division visible = 6.5 mm, thimble reads 23 → total = 6.5 + 0.23 = 6.73 mm."),

      P("Read a micrometer: sleeve shows 12 mm and the 0.5 mm division is visible, thimble reads 38. What is the measurement?",
        "12.5 + 0.38 = 12.88 mm",
        "Sleeve (with half-mm) + thimble × LC",
        "The sleeve reading shows 12 mm plus the 0.5 mm subdivision is exposed, so sleeve = 12.5 mm. The thimble reads 38 × 0.01 = 0.38 mm. Total reading = 12.5 + 0.38 = 12.88 mm. Always check if the 0.5 mm mark is visible; if it is just appearing but the thimble reading is near zero, the reading is close to the next 0.5 mm mark."),

      P("What is the least count of a vernier caliper with 1 MSD = 1 mm and 50 VSD = 49 mm?",
        "LC = 1 − 49/50 = 1 − 0.98 = 0.02 mm",
        "LC = MSD − VSD",
        "Least count = 1 MSD − 1 VSD = 1 − (49/50) = 1 − 0.98 = 0.02 mm. Some calipers have 20 VSD = 19 mm giving LC = 0.05 mm, or 10 VSD = 9 mm giving LC = 0.1 mm. The 0.02 mm caliper is the most common and provides good resolution for workshop measurements."),

      P("Read a vernier caliper: main scale shows 52 mm to the left of vernier zero, and the 15th vernier division coincides.",
        "52 + (15 × 0.02) = 52.30 mm",
        "Main scale + (coinciding VSD × LC)",
        "Reading = main scale + (coinciding vernier division × least count). Main scale = 52 mm (last mark before vernier zero). Vernier coincidence = 15th division. Reading = 52 + (15 × 0.02) = 52 + 0.30 = 52.30 mm. Always read the main scale first, then identify the vernier line that best aligns with a main scale line."),

      P("What are the four main uses of a combination square?",
        "90° angle, 45° angle, depth gauge, and scriber for marking",
        "Also used as a straight edge and ruler",
        "A combination square consists of a graduated ruler (blade) with a sliding head that can be locked at any position. The head provides: (1) 90° face for checking squareness. (2) 45° face for checking mitres. (3) A depth bar on the head bottom for depth measurement. (4) A scriber stored in the head for marking. The blade also functions as a ruler and straight edge."),

      P("What are slip gauges (gauge blocks) and how are they used?",
        "Precision-ground hardened steel blocks wrung together to build exact dimensions for calibration",
        "Wringing: thin oil film causes blocks to adhere",
        "Slip gauges are hardened steel or ceramic blocks ground and lapped to extremely precise thickness (Grade 0: ±0.05 µm). Multiple blocks are wrung together (oil film causes adhesion) to build any dimension within the set range. Used to calibrate micrometers, set sine bars, check dial indicators, and as reference standards in inspection. A standard set of 87 pieces builds 0.5–100 mm."),

      P("How does the sine bar principle work for angle measurement?",
        "h = L × sin θ; set slip gauges of height h under one roller to tilt the sine bar to angle θ",
        "Surface plate + sine bar + dial indicator for angle inspection",
        "A sine bar of known length L (usually 100 mm or 200 mm) is placed on a surface plate. Slip gauges of height h = L × sin θ are placed under one roller to tilt the bar to angle θ. A workpiece is placed on the bar and its angle is checked with a dial indicator: the indicator reading should be constant across the workpiece surface if the angle is correct. Accurate to about ±5 arc-seconds."),

      P("What is the three-wire method used for?",
        "Measuring the pitch diameter of external threads (screws, bolts)",
        "Three wires: one on one side, two on the other; micrometer reads M",
        "The three-wire method measures the pitch diameter of an external thread. Three precision wires of known diameter are placed in the thread grooves — one on one side, two on the other. A micrometer measures the distance M over the wires. The pitch diameter is calculated from M using a formula involving the wire diameter and thread angle. Best wire diameter = 0.5774 × pitch for 60° threads."),

      P("What do H7 and g6 mean in the ISO fit system?",
        "H7: hole tolerance, lower deviation zero (basic hole system); g6: shaft tolerance, small clearance zone below zero",
        "H7/g6 is a precision sliding/clearance fit",
        "H7: capital H = hole with lower deviation = 0 (basic hole), 7 = IT7 tolerance grade. For 25 mm: H7 = 25.000 to 25.021 mm. g6: lowercase g = shaft with upper deviation below zero (always clearance), 6 = IT6 grade. For 25 mm: g6 = 24.980 to 24.993 mm. Together H7/g6 provides a small clearance (7–41 µm) for precision sliding fits."),

      P("What is the maximum and minimum clearance in a 25 mm H7/g6 fit?",
        "Max clearance = 0.041 mm (41 µm); min clearance = 0.007 mm (7 µm)",
        "Always clearance; shaft is always smaller than hole",
        "Hole H7: 25.000 to 25.021 mm. Shaft g6: 24.980 to 24.993 mm. Max clearance = hole max − shaft min = 25.021 − 24.980 = 0.041 mm. Min clearance = hole min − shaft max = 25.000 − 24.993 = 0.007 mm. Since even min clearance is positive, this is always a clearance fit (never interference). Suitable for precision location and sliding."),

      P("What is a go/no-go gauge and how is it used?",
        "A limit gauge: go end must pass through; no-go end must not; confirms hole/shaft within tolerance",
        "Go checks minimum material condition; no-go checks maximum",
        "Go/no-go (single limit) gauges check whether a feature is within tolerance without reading actual dimensions. For a 25 H7 hole: go end = 25.000 mm (must pass through — hole not undersize), no-go end = 25.021 mm (must not pass — hole not oversize). For a shaft: go end = shaft max, no-go end = shaft min. Quick pass/fail inspection for production."),

      P("What is the function of a dial test indicator (DTI) in inspection?",
        "Measures small displacements, runout, flatness, alignment; least count 0.01 mm or 0.001 mm",
        "Magnifies mechanical movement via gear train",
        "A dial test indicator converts small linear displacement of a stylus into pointer movement on a graduated dial via an internal gear train. Least count: 0.01 mm (standard) or 0.001 mm (precision). Used to check: runout of rotating work, flatness on a surface plate, alignment of machine tool components, and concentricity. The stylus has a small contact ball at the tip."),

      P("What is the purpose of a V-block in inspection?",
        "Holding cylindrical workpieces for inspection, marking, or light machining",
        "V-angle typically 90°; pairs used for longer workpieces",
        "A V-block is a precision-machined block with a 90° V-groove that cradles cylindrical workpieces. Used on surface plates for inspection, layout marking, and grinding. The V automatically centres the workpiece. Pairs of matched V-blocks support longer shafts. Made from hardened and ground steel or granite. Various sizes available for different diameter ranges."),

      P("What is a surface plate and what material is it typically made from?",
        "A precision reference flat for inspection and layout; typically granite or cast iron",
        "Granite: stable, hard, resistant to scratches; cast iron: magnetic work holding",
        "A surface plate is a flat, level, precision-ground surface used as a reference for inspection, measurement, and layout work. Granite plates are most common: they are hard (Mohs 7), stable, resist scratches, and are not affected by magnetic work holding. Cast iron plates allow magnetic clamping. Grades: laboratory (±3 µm over 300 mm), inspection (±12 µm), workshop (±25 µm)."),

      P("In foundry sand ramming, what is the correct pattern for ramming a drag mould?",
        "Ram the edges first (closer to pattern), then the centre; light near pattern, firm away from it",
        "Over-ramming near pattern makes extraction difficult",
        "When ramming the drag: (1) Place pattern face-down on the board. (2) Fill with facing sand. (3) Ram edges first with fingers, ensuring sand is firm around pattern details. (4) Fill with backing sand and ram progressively firmer away from the pattern. (5) Over-ramming near the pattern causes mould wall shift and makes pattern withdrawal difficult. Under-ramming causes soft spots and metal penetration."),

      P("What is the significance of the parting line in a mould?",
        "It is the plane where cope and drag separate; determines draft direction and joint finish",
        "Parting line location affects casting quality and cost",
        "The parting line (parting surface) is where the cope (top half) and drag (bottom half) of the mould separate. Its placement determines: (1) Draft direction — pattern must taper toward the parting line for withdrawal. (2) Joint finish — the flash line (fin) appears at the parting. (3) Core placement. (4) Gating and risering convenience. Best placed where it minimises casting defects and finishing work."),

      P("What is the function of a core in sand casting?",
        "Creates internal cavities, passages, or hollow features in a casting",
        "Made from core sand with stronger binder (e.g., oil or resin)",
        "A core is a pre-formed sand shape placed inside the mould cavity to create internal features that cannot be formed by the pattern alone — holes, passages, cavities, undercuts. Cores are made from finer sand with stronger binders (oil sand, resin-bonded sand) than moulding sand, because they must withstand molten metal flow. Core prints extend from the core to locate and support it in the mould."),

      P("What are core prints and why are they needed?",
        "Extensions on a core that locate and support it within the mould cavity",
        "Core prints sit in matching recesses (prints) in the mould",
        "Core prints are extensions added to both ends of a core that fit into matching recesses (also called prints) moulded into the cope and drag. They: (1) Locate the core precisely in the mould. (2) Support the core against the buoyancy of molten metal. (3) Seal the core ends to prevent metal ingress. Core print size must be adequate for the core length and metal density."),

      P("What are chaplets used for in foundry moulding?",
        "Metal supports that hold cores in position within the mould where core prints are insufficient",
        "Made from same metal as casting; they fuse into the casting",
        "Chaplets are small metal projections (supports) placed in the mould to support cores that are too long or heavy to be adequately supported by core prints alone. They must be made from the same metal as the casting so they fuse into the casting during pouring. Before placing, they are coated with a refractory wash. Excessive chaplet use can cause冷 shuts or structural weakness."),

      P("What is the purpose of vents in a mould?",
        "Provide passages for gases (steam, binder fumes) to escape from the mould cavity",
        "Insufficient venting causes blow holes and gas porosity",
        "Vents are channels or holes made in the mould to allow gases to escape. During pouring, the molten metal generates steam from moisture and fumes from binder decomposition. If these gases cannot escape, they become trapped and form blow holes or porosity. Vents are made by pushing thin wires (vent wires) through the sand, or by using vent holes in the cope."),

      P("State the correct charging sequence for a small cupola.",
        "Coke → light wood/ignition → coke → limestone → iron charges; repeat layers",
        "Bottom layer: coke only; then alternate metal-coke-limestone",
        "Cupola charging sequence from bottom: (1) Close the bottom with a sand bed and coke. (2) Light and build up coke bed (first layer: coke only). (3) Add light wood and ignition material. (4) Add first layer of coke (coke bed). (5) Then alternate: limestone → metal charge → coke → limestone → metal → coke, etc. The first metal charge sits on the coke bed; limestone flux goes on top of each metal layer."),

      P("What is the blast (air supply) in a cupola and what is its typical temperature?",
        "Preheated air forced through tuyeres at 250–300 °C for hot blast",
        "Cold blast cupolas use ambient air; hot blast is more efficient",
        "The cupola blast is air forced through tuyeres (openings in the cupola wall) into the coke bed to support combustion. Cold blast cupolas use ambient air (~25 °C). Hot blast cupolas preheat air to 250–300 °C using a stove or recuperator, improving thermal efficiency by 15–20 %, increasing melt rate, and reducing coke consumption. Blast pressure is typically 0.1–0.3 bar."),

      P("How do you identify a shrinkage cavity defect on a finished casting?",
        "Depression or conical void on the last area to solidify; often near the riser or thick section",
        "Rough, irregular surface; internal shrinkage found by NDT",
        "Shrinkage cavities appear as depressions, voids, or spongy areas on or below the casting surface, typically in the last region to solidify (hot spots). External shrinkage: visible depression, often near thick sections or opposite the riser. Internal shrinkage: found by radiography or sectioning — appears as interconnected voids or dendritic porosity. Cause: inadequate risering or feeding."),

      P("How do you visually identify blow holes on a casting?",
        "Smooth, rounded, gas-filled cavities just below or on the casting surface",
        "Often in the cope (top) side where gas rises",
        "Blow holes are smooth, rounded, gas-filled cavities found on or just below the casting surface. They appear as dark holes when the casting is broken or machined. Typically found on the cope (upper) side of the casting where gas rises. Caused by: moisture in sand, insufficient venting, gas from core binder. Different from shrinkage (irregular/rough) and sand inclusion (sand particles embedded)."),

      P("How do you identify a hot tear (hot crack) on a casting?",
        "Jagged, irregular crack at a corner or section change; oxide discolouration on fracture surface",
        "Occurs while casting is still hot; fracture surface is oxidised",
        "Hot tears are jagged, irregular cracks that form at elevated temperature when the casting is weak and its contraction is restrained. They typically appear at sharp corners, sudden section changes, or where cores restrict movement. The fracture surface is oxidised (discoloured) because it formed at high temperature. Unlike cold cracks, hot tears have no bright metallic fracture surface."),

      P("What is the difference between upsetting and drawing out in smithy operations?",
        "Upsetting: increases cross-section by reducing length; drawing out: decreases cross-section by increasing length",
        "Upsetting = thicker and shorter; drawing out = thinner and longer",
        "Upsetting (jumping up): the workpiece is heated and struck on its end to increase the cross-sectional area while reducing length. Example: forming a bolt head. Drawing out (hammering out): the workpiece is heated and hammered to reduce cross-section while increasing length. Example: forming a tapered point. Both are fundamental forging operations performed on the anvil with hammers."),

      P("What is the difference between swaging and fullering?",
        "Swaging: reduces diameter using shaped dies; fullering: distributes metal along the length using grooved tools",
        "Swaging = uniform diameter reduction; fullering = selective metal movement",
        "Swaging reduces the diameter of a round bar by hammering between shaped dies (swage blocks or top/bottom swages). Fullering uses a fuller (rounded tool) to spread metal along the length, creating grooves or reducing sections. Fullering is used to distribute metal before final shaping, while swaging produces a more uniform cross-section. Both are done at forging temperature."),

      P("What is the function of a fuller and a set hammer in forging?",
        "Fuller spreads metal and creates grooves; set hammer finishes flat surfaces and corners",
        "Fuller has rounded face; set hammer has flat face with angled handle",
        "A fuller has a rounded (convex) face and is used to spread metal, create grooves, and rough-shape forgings. Driven with a hammer while the fuller is held on the work. A set hammer has a flat face and is used to finish surfaces, flatten areas, and create sharp corners that the hammer face cannot reach. Both are handled tools struck with a separate hammer."),

      P("State the approximate temperature ranges for forge glow colours.",
        "Black heat: 400–500 °C; dark red: 500–600 °C; cherry red: 700–800 °C; bright red: 800–900 °C; orange: 1000–1100 °C; bright orange: 1100–1300 °C; white: >1300 °C",
        "Colour depends on ambient light; check with pyrometer for accuracy",
        "Forge temperatures by glow colour (in dim light): black heat 400–500 °C, dark red 500–600 °C, cherry red 700–800 °C, bright red 800–900 °C, dark orange 900–1000 °C, bright orange 1000–1100 °C, yellow-orange 1100–1200 °C, light yellow 1200–1300 °C, white heat above 1300 °C. Mild steel forging range: 1100–1300 °C (bright orange to yellow). Forging below 800 °C (red heat) causes cracking."),

      P("State the temperature ranges for specific forge colours with the metals they correspond to.",
        "Cherry red (700–800 °C): start of forging for mild steel; bright orange (1100–1300 °C): ideal forging range for mild steel",
        "Brass: yellow (600–700 °C); aluminium: dull red equivalent (~500 °C) — use pyrometer",
        "Mild steel: bright orange to yellow (1100–1300 °C) for forging, cherry red (700–800 °C) minimum. Cast iron: cherry red to bright red (700–900 °C). Brass: yellow heat (600–700 °C). Aluminium: no visible glow — reaches forging temperature at ~400–500 °C, must use pyrometer. Copper: bright red (800–900 °C). Stainless steel: bright orange (1100–1200 °C)."),

      P("What are the three types of oxy-acetylene flames and their applications?",
        "Neutral: equal O₂ and C₂H₂, for mild steel; Oxidising: excess O₂, for brass/bronze; Carburising: excess C₂H₂, for aluminium and hard-facing",
        "Neutral flame: inner cone sharp, no feather; oxidising: blue inner cone; carburising: white feather",
        "Neutral flame (O₂:C₂H₂ ≈ 1:1): inner cone is rounded and clear, used for welding mild steel, cast iron, and most metals. Oxidising flame (excess O₂): shorter inner cone with hissing sound, used for brass, bronze, and silver brazing. Carburising/reducing flame (excess C₂H₂): white feather around inner cone, used for aluminium, nickel alloys, and hard-facing (carburising surface)."),

      P("What is the principle of an oxy-acetylene cutting torch?",
        "Preheat flames heat metal to ignition temperature, then high-pressure O₂ jet burns/oxidises the metal",
        "Cutting is oxidation, not melting; O₂ jet blows away slag",
        "The cutting torch has multiple preheat flames (oxy-acetylene) surrounding a central oxygen jet. The preheat flames heat the metal to its ignition temperature (~1300 °C for steel). A trigger then releases a high-pressure oxygen jet that oxidises (burns) the heated metal. The oxygen jet blows away the iron oxide (slag) and cuts through the metal. Cutting speed depends on thickness, oxygen purity, and preheat."),

      P("What are the effects of DCEN (straight polarity) and DCEP (reverse polarity) in arc welding?",
        "DCEN (straight): deeper penetration; DCEP (reverse): more deposition, shallower penetration, better cleaning action",
        "DCEN: ⅔ heat at workpiece; DCEP: ⅔ heat at electrode",
        "DCEN (DC Electrode Negative, straight polarity): electrode is negative, workpiece positive. ⅔ of heat at workpiece → deeper penetration, faster travel. Used for thick sections. DCEP (DC Electrode Positive, reverse polarity): ⅔ of heat at electrode → more electrode melting and deposition, shallower penetration. Provides cleaning action (oxide removal) on aluminium. Used for thin materials and aluminium."),

      P("What causes excessive spatter in SMAW and how is it controlled?",
        "Current too high, arc too long, wrong polarity, wet electrodes; reduce current, correct polarity, use dry electrodes",
        "Spatter is wasted metal droplets around the weld",
        "Excessive spatter causes: (1) Current above recommended range for electrode size. (2) Arc length too long (voltage too high). (3) Wrong polarity for electrode type. (4) Wet or damaged electrode coating. (5) Contaminated workpiece surface. Control: reduce current to recommended range, maintain short arc (1.5–3 mm), use correct polarity (DCEP for most E6010/E7018), store electrodes properly, clean workpiece."),

      P("What is a grooved seam in sheet metal work?",
        "Sheets are locked together by forming a groove along the joint with a grooving tool",
        "Used for joining thin sheets in ductwork and containers",
        "A grooved seam joins two sheet metal edges by locking them together. The edges are folded to interlock, then a grooving tool (groover) pressed along the seam to close and lock the folds. Types: single grooved seam, double grooved seam, and grooved seam with solder. Used in ductwork, canisters, and light-gauge fabrications. Requires a grooving machine or hand groover."),

      P("What is a box seam (double-lock seam)?",
        "A double-folded seam used in can making; both edges are folded and locked together",
        "Stronger than a grooved seam; used for tin cans and containers",
        "A box seam (double-lock or double-seamed seam) is formed by folding the edges of two sheets together in a double interlock. The first fold hooks the edges; the second fold locks them flat. Widely used in can making (food cans, paint cans). Produces a gas-tight joint without solder. Requires a seaming machine or hand seamer with appropriate rolls."),

      P("What is a wiring edge (wired edge) in sheet metal?",
        "A wire is inserted into a hemmed edge to provide rigidity and a smooth rounded profile",
        "Used on bucket rims, tray edges, and container lips",
        "A wiring edge is formed by bending the sheet metal edge around a wire (typically mild steel or copper wire) and crimping it closed. The wire provides: (1) Increased stiffness and rigidity to the edge. (2) A smooth, rounded profile for safety and appearance. (3) Resistance to denting. Common on bucket rims, dustpan edges, food trays, and circular containers. The wire diameter matches the hem width."),

      P("What is hemming in sheet metal work?",
        "Folding the edge of a sheet over on itself to create a smooth, safe, stiff edge",
        "Types: flat hem, rounded hem, wired hem",
        "Hemming folds the sheet metal edge back on itself to eliminate sharp edges and add stiffness. Types: (1) Flat hem: edge folded flat (double thickness). (2) Open/rounded hem: edge folded with a radius for appearance. (3) Wired hem: wire inserted before folding for extra rigidity. Performed using a folder, brake, or hand tools. Hem width is typically 3–6 mm for thin sheet."),

      P("What is a hatchet stake and when is it used?",
        "A T-shaped anvil stake with a flat, tapered head for forming straight edges and flanges",
        "Used with a mallet for light sheet metal forming",
        "A hatchet stake (also called a T-stake) has a flat, tapered head shaped like a hatchet blade, mounted on a vertical shank that fits into a stake holder or anvil hole. Used for: forming straight edges, bending flanges, setting beads, and light forming on straight sections of sheet metal. The thin tapered edge reaches into narrow areas. Used with a rawhide or plastic mallet to avoid marking."),

      P("What is a half-moon stake and when is it used?",
        "A curved, half-moon shaped anvil stake for forming concave and convex curved surfaces",
        "Used for dome shapes, hemispheres, and curved panels",
        "A half-moon stake has a smooth, convex (half-round) working surface, used for forming concave shapes in sheet metal. The curved surface allows the metal to be shaped over it using hammers and mallets. Used for: dome shapes, hemispherical ends, curved panels, and curved duct sections. Available in various radii. Work is done from the inside (concave side up) or outside depending on the shape required."),

      P("When should a mallet be used instead of a hammer in sheet metal work?",
        "Mallet for light forming, shaping without marking; hammer for heavier work, riveting, and textured forming",
        "Mallet materials: rubber, wood (beech), rawhide, plastic",
        "Use a mallet when: (1) Forming light-gauge sheet that would be dented by a steel hammer. (2) Working on finished surfaces that must remain unmarked. (3) Bending or shaping in the early stages. Use a steel hammer when: (1) Heavier forming force is needed. (2) Riveting or peening. (3) Stretching or shrinking metal aggressively. Mallet types: rawhide (medium), rubber (soft), wooden/beech (general), plastic/nylon (non-marking)."),

      P("What are the two types of rivet heads (snap head and jolly head)?",
        "Snap head: rounded dome finish; jolly head: countersunk (flat) finish",
        "Snap head is structural; jolly head is for flush surfaces",
        "Snap head rivets have a hemispherical (dome) finished head formed by a snap (dolly) set in the riveting hammer or press. Provides good clamping area and strength. Jolly (countersunk) rivets have a conical head that sits flush with the surface in a countersunk hole. Used where a flush surface is required (aerodynamic surfaces, sliding surfaces). Head angle is typically 90° for jolly heads."),

      P("What is the recommended rivet diameter relative to plate thickness?",
        "Diameter ≈ 1.5 × plate thickness for structural joints",
        "Pitch = 3d to 4d; edge distance ≥ 2d",
        "Rivet diameter d ≈ 1.5 × t (plate thickness) for general structural work. For example: 6 mm plate → 9 mm rivets. Some codes specify d = 1.75t for maximum strength. Rivet pitch (centre-to-centre spacing): 3d to 4d minimum. Edge distance (centre of rivet to sheet edge): minimum 2d to prevent edge tearing. Length of rivet = sum of plate thicknesses + 1.5d for head formation."),

      P("What are common pipe fittings and their uses?",
        "Coupling: joins two pipes; elbow: changes direction (90°/45°); tee: branch; reducer: changes size",
        "Threaded (small pipe) or welded (large pipe)",
        "Pipe fittings: (1) Coupling — joins two pipes of same diameter. (2) Reducing coupling — joins pipes of different diameters. (3) Elbow — changes direction, commonly 90° or 45°. (4) Tee — creates a branch from a straight run. (5) Union — allows disconnection without turning pipe. (6) Cap — closes the end. (7) Bushing — reduces internal diameter. Small pipes use threaded fittings; large pipes use welded or flanged connections."),

      P("What is the difference between soldering and sweating (brazing) a copper pipe?",
        "Soldering: soft solder (<450 °C), for water pipes; sweating = capillary soldering of copper plumbing joints",
        "Sweating: flux + solder drawn into tight joint by capillary action",
        "Soldering in plumbing ('sweating'): copper pipe and fitting are cleaned, flux is applied, the joint is heated with a torch, and solder (typically 95/5 tin/antimony or lead-free) is touched to the joint — capillary action draws it into the gap. Temperature <450 °C. Brazing uses higher temperature (>450 °C) filler (brass/bronze) for higher-strength joints. Silver brazing is even stronger."),

      P("What sizes of fuse wire are commonly used in domestic wiring?",
        "Lighting circuit: 5 A (0.75 mm²); socket circuits: 13 A or 16 A (2.5 mm²); cooker/shower: 32–45 A (6–10 mm²)",
        "Fuse rating must be slightly above normal operating current",
        "Domestic fuse wire (rewirable fuses): 3 A (red) for low-power circuits, 5 A (brown) for lighting, 13 A (brown) for socket outlets. Wire cross-section: 3 A = 0.5 mm², 5 A = 0.75 mm², 13 A = 1.25 mm². MCBs (miniature circuit breakers) are now standard: 6 A (lighting), 16–32 A (power circuits). Fuse must carry normal current but blow on overload within the cable's current rating."),

      P("What do the wiring colours mean in UK/EU standard (harmonised)?",
        "Brown = live (L); blue = neutral (N); green-yellow = protective earth (PE)",
        "Old UK: red = live; black = neutral; green = earth",
        "Current UK/EU harmonised colours: brown = line/live conductor, blue = neutral, green-yellow stripe = protective earth/ground. Old UK convention (pre-2004): red = live, black = neutral, green = earth. Always verify before working on wiring. The green-yellow earth wire must never carry current in normal operation — it provides a safety path for fault current to trip protective devices."),

      P("What is the purpose of earthing (grounding) in an electrical installation?",
        "Provides a low-resistance path for fault current to flow to earth, tripping protective devices and preventing electric shock",
        "Earth wire carries fault current only, not normal current",
        "Earthing connects exposed metallic parts of electrical equipment to earth via a low-resistance conductor. If a live conductor touches the metal casing (fault), the earth path allows high fault current to flow, rapidly tripping the fuse or MCB (within 0.4 s for 230 V systems). Without earthing, the casing could remain live at 230 V, causing fatal shock. Bonding connects metal pipes and structural steel to the earthing system."),

      P("What is the procedure for centring a workpiece in a lathe 3-jaw chuck?",
        "Tighten jaws progressively in star pattern; check runout with dial indicator; adjust if needed",
        "3-jaw is self-centring; 4-jaw requires manual alignment",
        "3-jaw chuck is self-centring (scroll mechanism moves all jaws equally). Procedure: (1) Clean chuck jaws and scroll. (2) Insert workpiece. (3) Tighten jaws progressively in star pattern (tighten one, then the opposite, then the next). (4) Check runout with a dial test indicator. (5) If runout > tolerance, tap workpiece lightly or reposition. For precision work, use a 4-jaw independent chuck with indicator alignment."),

      P("What is the purpose of a facing operation on a lathe?",
        "Produces a flat surface perpendicular to the workpiece axis; cleans up the end face",
        "Tool feeds from outside toward centre or centre outward",
        "Facing cuts the end of a workpiece to produce a flat, smooth surface perpendicular to the rotation axis. The tool feeds radially (cross-slide) from the outer diameter toward the centre (or vice versa). Used to: establish correct length, create a reference surface for subsequent operations, and clean up a rough-sawn end. Final facing feed: 0.05–0.15 mm/rev for good finish."),

      P("What is the basic gear train arrangement for thread cutting on a lathe?",
        "Spindle → gear train → lead screw; ratio = required pitch / leadscrew pitch",
        "Change gears set the ratio; reverse gear changes direction",
        "Thread cutting gear train: spindle gear → intermediate (change) gears → lead screw gear. The gear ratio determines how many turns of the lead screw per revolution of the spindle. Ratio = thread pitch / lead screw pitch. For M6 × 1 mm on a 6 mm leadscrew: ratio = 1/6. The reverse gear (banjo gear) changes thread direction (right-hand or left-hand thread). Metric leadscrews are used for metric threads."),

    ];

SSC_JE_ENC2_PROD.workshopB = [
      P("What does a grinding wheel marking A46K5V mean?",
        "A=alumina abrasive, 46=medium grain size, K=medium-hard grade, 5=open structure, V=vitrified bond",
        "Each letter/number defines a wheel property",
        "A46K5V breakdown: A = aluminium oxide abrasive (most common). 46 = grit/grain size (medium: 36 is coarse, 60 is fine, 80+ is very fine). K = grade/hardness (A is softest, Z is hardest; K is medium-hard). 5 = structure/spacing (1 is dense, 9 is very open). V = vitrified bond (glassy, rigid, good for precision). Resinoid bond (B) is tougher but less precise."),

      P("What is a diamond point wheel dresser and how is it used?",
        "A diamond-tipped tool used to true (re-shape) and dress (re-sharpen) a grinding wheel",
        "Hold at 10–15° to wheel rotation; traverse slowly across the face",
        "A diamond dresser has a natural or synthetic diamond mounted on a steel shank. Used to: (1) True the wheel — restore its geometric shape (round, flat). (2) Dress the wheel — remove dull grain and bonding material to expose fresh, sharp abrasive. Method: set diamond at wheel centre height, 10–15° to rotation direction, traverse slowly across wheel face with light cuts (0.01–0.02 mm per pass). Cool with cutting fluid."),

      P("What are the safety rules for using a bench grinder?",
        "Eye protection mandatory; spark deflector gap ≤ 1.6 mm; tool rest gap ≤ 3 mm; never use side of wheel",
        "Stand to one side when starting; wheel must be ring-tested",
        "Bench grinder safety: (1) Always wear safety goggles. (2) Spark deflector within 1.6 mm of wheel. (3) Tool rest within 3 mm of wheel. (4) Never use the side of the wheel unless designed for it. (5) Stand to one side when starting (wheel may burst). (6) Ring-test new wheels (hold by finger, tap — rings true = good, thud = cracked). (7) Allow wheel to reach full speed before grinding. (8) Use workpiece rest, not fingers for small items."),

      P("What safety precautions must be followed when using a pillar drill or bench drill?",
        "Clamp workpiece securely; never hold by hand; use correct speed; clear chips with brush, not hands",
        "Never wear gloves near rotating drill; tie back loose hair",
        "Drilling safety: (1) Always clamp the workpiece — never hold it by hand. (2) Use appropriate speed (higher for small drills, lower for large). (3) Clear swarf with a brush, never hands. (4) Never wear gloves near rotating machinery. (5) Tie back loose hair and remove jewellery. (6) Use cutting fluid for metal drilling. (7) Break through slowly to prevent drill grabbing. (8) Wear eye protection."),

      P("What is the quick-return mechanism in a shaper and what is the stroke length formula?",
        "Crank and slotted lever mechanism; return stroke is faster than cutting stroke; S = work length + 2C",
        "Stroke length = L_work + 2 × overtravel",
        "The quick-return mechanism converts rotary motor motion into reciprocating ram motion. A crank drives a slotted lever, and the geometry ensures the return stroke (idle) is faster than the forward stroke (cutting). Stroke length S = L + 2C where L = work length and C = overtravel each side (typically 15–25 mm). The ram speed ratio (cutting:return) is typically 2:1 to 3:1."),

      P("How is the stroke length set on a shaper?",
        "Adjust the crank pin position on the bull gear to change the throw radius",
        "Longer throw = longer stroke",
        "Stroke length is adjusted by changing the crank pin position on the bull gear (drive gear). Moving the pin further from the gear centre increases the throw radius, which increases the stroke length. Moving it toward the centre shortens the stroke. The stroke must be slightly longer than the work to ensure full coverage. After adjustment, verify the ram clears the work and fixture at both ends of the stroke."),

      P("What is a dial test indicator used for on a surface plate?",
        "Checking flatness, parallelism, height differences, and runout of workpieces placed on the plate",
        "Indicator mounted on a stand; stylus contacts the workpiece",
        "A dial test indicator (DTI) on a surface plate is used to: (1) Check flatness by sweeping the indicator across the workpiece surface — uniform reading means flat. (2) Check parallelism of two surfaces. (3) Measure height differences by comparing to a gauge block stack. (4) Check runout of a cylindrical workpiece on V-blocks. The DTI is mounted on a magnetic or granite stand. Move the workpiece or indicator and observe the dial."),

      P("What is the function of V-blocks when used with a dial indicator?",
        "Support cylindrical work for checking concentricity and runout",
        "Place shaft on V-blocks; rotate and observe DTI",
        "V-blocks hold cylindrical workpieces for inspection. To check concentricity/runout: (1) Place the shaft on two V-blocks (one at each bearing surface). (2) Place a dial test indicator with stylus touching the surface to be checked. (3) Rotate the shaft 360°. (4) The total indicator reading (TIR) gives the runout. For a shaft with 0.02 mm runout tolerance, the TIR must not exceed 0.02 mm during one full rotation."),

      P("What are the classes of fire and what extinguisher is used for each?",
        "A: ordinary combustibles (water/foam); B: flammable liquids (CO₂/foam); C: electrical (CO₂); D: metals (special powder)",
        "Never use water on Class C or D fires",
        "Class A: ordinary combustibles (wood, paper, cloth) — water, foam, or powder extinguishers. Class B: flammable liquids (oil, petrol, paint) — CO₂, foam, or powder. Class C: electrical fires (equipment live) — CO₂ or dry powder (never water — conductor). Class D: combustible metals (magnesium, titanium) — special dry powder (Met-X, copper powder). CO₂ is clean but dissipates quickly; foam is effective for liquid spills."),

      P("What is the correct first aid procedure for a burn from a welding arc or hot metal?",
        "Cool under running cold water for 20 minutes; do not apply ice, butter, or creams; cover with sterile dressing",
        "Remove clothing/jewellery from burned area; seek medical help for severe burns",
        "Burn first aid: (1) Cool immediately under cold running water for 20 minutes — this is the single most important step. (2) Do not apply ice, butter, toothpaste, or home remedies. (3) Remove jewellery and tight clothing from the burned area (unless stuck to skin). (4) Cover with a clean, sterile, non-fluffy dressing. (5) Do not burst blisters. (6) Seek medical help for burns larger than the palm, on face/hands/joints, or full-thickness burns."),

      P("What PPE is required in a welding shop?",
        "Welding helmet (shade 10–14), leather apron, gauntlet gloves, steel-toe boots, fire-resistant clothing",
        "Ear protection if grinding; fume extraction mandatory",
        "Welding PPE: (1) Welding helmet with auto-darkening filter (shade 10–14 for SMAW). (2) Leather welding apron. (3) Leather gauntlet gloves (cuff type for SMAW). (4) Steel-toe safety boots. (5) Long-sleeved fire-resistant clothing (no synthetic fabrics). (6) Ear protection when grinding. (7) Fume extraction or respiratory protection. Never wear lighter fluid, matches, or lighter in pockets. Keep flammable materials 10 m away."),

      P("What are the key differences between hard soldering (brazing) and soft soldering?",
        "Soft soldering: <450 °C, tin-lead alloys; brazing: >450 °C, brass/bronze/silver alloys; stronger joints",
        "Brazing joints withstand higher temperatures and loads",
        "Soft soldering: filler melts below 450 °C (tin-lead alloys: Sn60/Pb40 melts at ~190 °C). Joint strength: 30–50 MPa. For electrical connections, plumbing. Brazing (hard soldering): filler melts above 450 °C (brass, bronze, silver alloys). Joint strength: 200–500 MPa. For structural joints, higher temperatures, and higher loads. Silver brazing (50%Ag/50%Cu) melts at 620–700 °C with excellent strength."),

      P("What is the principle of magnetic particle inspection (MPI)?",
        "Magnetic field is induced in ferromagnetic workpiece; defects cause flux leakage attracting iron particles",
        "Only works on ferromagnetic materials (iron, steel, nickel, cobalt alloys)",
        "MPI principle: (1) Magnetise the workpiece (using prods, yoke, or coil). (2) Apply fine iron particles (dry or suspended in liquid) to the surface. (3) At defect locations, the magnetic field leaks out of the surface, attracting particles to form visible indications. (4) Inspect under UV light (fluorescent) or visible light (dry/wet black). (5) Demagnetise after inspection. Defects: cracks, laps, inclusions, incomplete fusion."),

      P("What is the dwell time in dye penetrant testing (DPT)?",
        "Time the penetrant must remain on the surface to seep into defects; 5–30 min for aluminium/steel",
        "Too short: missed defects; too long: difficult to clean",
        "Dwell time is the period the liquid penetrant is left on the cleaned surface to seep into surface-breaking defects by capillary action. For aluminium and steel: 5–30 minutes depending on material condition and expected defect type. Fine cracks need longer dwell (15–30 min). Excessive dwell (>60 min) makes removal difficult. After dwell, excess penetrant is cleaned, developer applied, and another dwell of 10–30 min before inspection."),

      P("What is the frequency range and typical couplant used in ultrasonic testing?",
        "0.5–25 MHz; couplant: oil, glycerine, water-based gel",
        "Lower frequency for deeper penetration; higher for better resolution",
        "UT frequency range: 0.5–25 MHz. 0.5–2 MHz: thick sections, coarse-grained materials (castings, forgings). 2–5 MHz: general purpose (welds, plate). 5–25 MHz: thin sections, fine defect detection. Couplant is essential to transmit sound between transducer and workpiece — air would reflect 99.9 %+ of the sound. Common couplants: engine oil, glycerine, water-based gel, cellulose paste."),

      P("What are the advantages of CNC over conventional (manual) machines?",
        "Higher accuracy (±0.005 mm), repeatability, complex contours, faster production, reduced operator skill",
        "CNC stores programs; can be reprogrammed for new parts",
        "CNC advantages: (1) Accuracy to ±0.005 mm. (2) Perfect repeatability across hundreds of parts. (3) Complex 3D contours and curves. (4) Faster production via optimised tool paths. (5) Reduced skilled labour — operator loads/unloads, machine does the work. (6) Automatic tool changes (ATC). (7) Easy program storage, recall, and modification. (8) Monitoring and adaptive control. Initial cost is higher."),

      P("What does G-code do in CNC programming?",
        "G-codes control axis movements: G00 rapid, G01 linear, G02/G03 circular interpolation",
        "G-codes are geometry/motion commands",
        "G-codes (Geometric codes) control axis motion and machine functions: G00 = rapid traverse (positioning), G01 = linear interpolation at feed rate, G02 = circular interpolation clockwise, G03 = circular interpolation counter-clockwise, G04 = dwell (pause), G17/G18/G19 = plane selection, G40/G41/G42 = cutter compensation, G90 = absolute, G91 = incremental. M-codes control auxiliary functions (spindle, coolant, tool change)."),

      P("What is the difference between absolute and incremental (relative) programming in CNC?",
        "Absolute (G90): all coordinates from one fixed origin; incremental (G91): coordinates from current position",
        "Absolute is easier to read; incremental is useful for repetitive patterns",
        "In absolute programming (G90), every coordinate is referenced from the program origin (workpiece zero). All moves specify the final position. In incremental (G91), each coordinate specifies the distance and direction from the current position. Example: G90 X50 Y25 means move to (50,25) from origin. G91 X50 Y25 means move 50 mm in X and 25 mm in Y from wherever you are."),

      P("What is a tool offset in CNC machining?",
        "Stored values compensating for tool length and diameter relative to the program reference point",
        "Geometry offset + wear offset = total offset",
        "Tool offsets compensate for the actual tool position relative to the programmed reference. Geometry offset: the difference between the tool tip position and the tool change position (set during tool measurement). Wear offset: gradual adjustment to compensate for tool wear without modifying the program. Both are stored in the tool offset table. Geometry offset is set once; wear offset is adjusted during production."),

      P("What is spindle speed override and how is it used?",
        "Operator control to adjust programmed spindle speed by 50–150 % in real time",
        "Used to fine-tune cutting conditions, reduce chatter, compensate for material variation",
        "Spindle speed override lets the operator adjust the actual RPM as a percentage of the programmed S value, typically in 5–10 % increments. Range: 50–150 %. Applications: (1) Reduce speed if chatter occurs. (2) Increase speed to improve finish. (3) Compensate for material hardness variation. (4) Break in new tools at reduced speed. (5) Adjust for different work materials without reprogramming."),

      P("What is a steady rest on a lathe and when is it used?",
        "A support mounted on the bed to prevent long, slender workpieces from deflecting under cutting forces",
        "Used when length-to-diameter ratio exceeds 4:1",
        "A steady rest is clamped to the lathe bed and supports the workpiece at an intermediate point to prevent deflection and vibration. Used when: (1) L/D ratio exceeds 4:1. (2) Boring long holes. (3) Turning slender shafts. Has three adjustable fingers (brass or bronze tips) that contact the work. Must be lubricated and set accurately. A follow rest moves with the carriage for continuous support."),

      P("What is a follow rest (travelling rest) on a lathe?",
        "A rest attached to the carriage that travels with the tool, providing continuous support near the cutting point",
        "Used for long, thin shafts where steady rest is impractical",
        "A follow rest is mounted on the lathe carriage and moves with the cutting tool. Two adjustable fingers support the workpiece close to the cutting point, preventing deflection where the tool is cutting. Unlike a steady rest (fixed on bed), it provides continuous support along the length. Used for long, slender shafts being turned between centres. Finger tips must be brass or bronze to avoid marking the work."),

      P("What is the difference between roughing and finishing cuts in machining?",
        "Roughing: high MRR, lower speed, higher feed, 2–5 mm depth; Finishing: low MRR, high speed, low feed, 0.25–0.5 mm depth",
        "Roughing removes bulk material; finishing achieves dimensions and surface",
        "Roughing: maximum MRR with moderate speed and high feed (0.2–0.4 mm/rev). Depth 2–5 mm. Removes bulk material quickly. Surface finish Ra 6.3–25 µm. Finishing: higher speed, low feed (0.05–0.15 mm/rev), depth 0.25–0.5 mm. Achieves final dimensions, tolerances, and surface finish Ra 0.8–3.2 µm. Always rough first, then finish. Combining in one setup ensures concentricity."),

      P("What is the significance of the shear plane angle in metal cutting?",
        "Higher shear angle → shorter shear plane → less cutting force → less energy and heat",
        "Shear angle depends on rake angle and friction",
        "The shear plane angle φ determines the thickness of the shear zone. From Merchant's relation: φ = 45° + α/2 − β/2 (α = rake angle, β = friction angle). Higher φ means: (1) Shorter shear plane → less shear force. (2) Less plastic deformation → less heat. (3) Lower cutting forces. (4) Thinner chips. Reducing friction (cutting fluid, coated tools) increases φ and reduces forces."),

      P("What is the purpose of back rake and side rake angles on a lathe tool?",
        "Back rake: controls chip flow direction; side rake: affects cutting force component and chip curl",
        "Positive rake reduces forces but weakens edge",
        "Back rake angle: angle between the tool face and a line parallel to the tool shank axis. Controls chip flow direction — positive back rake makes chips flow over the tool. Side rake angle: angle between the tool face and a line perpendicular to the shank axis. Affects cutting force components and chip curl. Combined effect: positive rake angles reduce cutting forces and power but weaken the cutting edge. Typical values: 5–20° for HSS on steel."),

      P("What is the recommended clearance angle for a carbide tool when turning aluminium?",
        "8 to 12 degrees (larger than for steel to prevent BUE)",
        "Aluminium is soft and tends to adhere to the tool",
        "Aluminium is soft and adhesive, prone to built-up edge (BUE). A larger clearance angle (8–12°) is needed to prevent the tool flank from rubbing and welding to the workpiece. For comparison: mild steel needs 6–8°, cast iron 4–6°, hardened steel 3–5°. Combine with positive rake (15–25°), high cutting speed (200+ m/min), and sharp tools to minimise BUE on aluminium."),

      P("What is a boring head and how does it differ from a boring bar?",
        "Boring head: adjustable single-point tool for precise hole sizing; boring bar: fixed or adjustable for lathe boring",
        "Boring head is for drill press/milling; boring bar is for lathe",
        "A boring head is a tool holder mounted on a drill press or milling machine spindle. It has an adjustable single-point cutting tool that can be set to enlarge a hole by small increments (0.01 mm resolution via micrometer dial). A boring bar is a long-reach tool holder for lathe boring of internal diameters. Boring bars can be single-point or use indexable inserts. For deep holes (L/D > 4), anti-vibration boring bars with dampeners are used."),

      P("What are the types of cutting fluids and when is each used?",
        "Soluble oil (emulsion): general purpose; straight oil: heavy cutting; synthetic: high-speed; dry: cast iron, aluminium",
        "Choose based on material, operation, and coolant system",
        "Cutting fluid types: (1) Soluble oil/water emulsion (5–10 % concentration): general purpose, good cooling and some lubrication. (2) Straight cutting oil (neat oil): heavy-duty cutting, threading, grinding — best lubrication. (3) Synthetic fluids: high-speed machining, CNC — excellent cooling, no residue. (4) Semi-synthetic: balance of cooling and lubrication. (5) Dry machining: cast iron (self-lubricating graphite), aluminium (high speed, sharp tools), and when coolant contamination is a concern."),

      P("What is the procedure for reaming a hole to 20 H7 tolerance?",
        "Drill at 19.5–19.85 mm → bore if needed → ream at 50–75 % of drilling speed, feed 2–3× drilling feed",
        "Use cutting fluid; never reverse the reamer",
        "Reaming procedure: (1) Drill undersize (drill size = 20 − 0.15 to 20 − 0.5 mm = 19.5–19.85 mm). (2) Optionally bore for better concentricity. (3) Ream at 50–75 % of drilling speed (e.g., if drilling at 500 RPM, ream at 250–375 RPM). (4) Feed 2–3× drilling feed (f = 0.5–0.75 mm/rev). (5) Use cutting fluid. (6) Never reverse the reamer while in the hole ( damages cutting edges). (7) Ensure hole is clean and free of chips."),

      P("What is the reading of a dial test indicator with LC = 0.01 mm if the pointer moves from −8 to +12 divisions?",
        "Total movement = 12 − (−8) = 20 divisions = 0.20 mm",
        "Read the change, not individual readings",
        "Dial indicator total indicator reading (TIR) = difference between maximum and minimum. If pointer moves from −8 to +12: change = 12 − (−8) = 20 divisions. Reading = 20 × 0.01 = 0.20 mm. This represents the total variation (runout, flatness error, etc.) over the measured range. Always take the TIR for runout and flatness checks."),

    ];

  SSC_JE_ENC2_PROD.workshop = SSC_JE_ENC2_PROD.workshop.concat(SSC_JE_ENC2_PROD.workshopB);
  delete SSC_JE_ENC2_PROD.workshopB;

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC2_PROD;
  if (typeof window !== "undefined") window.SSC_JE_ENC2_PROD = SSC_JE_ENC2_PROD;
})();

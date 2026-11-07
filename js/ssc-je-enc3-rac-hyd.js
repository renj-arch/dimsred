(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC3_RACHYD = {};
  SSC_JE_ENC3_RACHYD.rac = [
    P("1 TR (Ton of Refrigeration) is equivalent to which set of values?",
      "1 TR = 3.5 kW = 210 kJ/min = 3024 kcal/h",
      "TR conversion is a favorite SSC-JE numeric",
      "1 TR = heat to melt 1 short ton of ice in 24 h = 12000 Btu/h; 12000 × 0.252 = 3024 kcal/h; 3.517 kW ≈ 3.5 kW; 3.5 × 60 = 210 kJ/min"),

    P("COP of a Carnot refrigerator operating between evaporator at 260 K and condenser at 300 K is:",
      "6.5",
      "COP_Carnot = T_L / (T_H − T_L)",
      "COP = T_L/(T_H − T_L) = 260/(300 − 260) = 260/40 = 6.5; actual COP is always less due to irreversibilities"),

    P("Which statement is CORRECT about the standard vapor compression refrigeration cycle?",
      "The refrigerant enters the compressor as dry saturated or slightly superheated vapor",
      "VCC component states",
      "In an ideal VCC: evaporator outlet is dry saturated vapor, compressor outlet is superheated vapor, condenser outlet is saturated liquid, expansion is isenthalpic"),

    P("What is the normal boiling point of R-22 (chlorodifluoromethane) at 1 atm?",
      "−40.8°C",
      "R-22 boiling point",
      "R-22 boils at −40.8°C at 1 atm; widely used in split AC systems; being phased out under Montreal Protocol due to ODP = 0.055"),

    P("What is the normal boiling point of R-134a at 1 atm?",
      "−26.1°C",
      "R-134a boiling point",
      "R-134a (1,1,1,2-tetrafluoroethane) boils at −26.1°C; replaced R-12 in automobile AC; ODP = 0 but GWP ≈ 1430"),

    P("What is the normal boiling point of R-12 (dichlorodifluoromethane) at 1 atm?",
      "−29.8°C",
      "R-12 boiling point",
      "R-12 boils at −29.8°C; was the most widely used refrigerant before Montreal Protocol; ODP = 0.82"),

    P("What is the normal boiling point of ammonia (NH₃) at 1 atm?",
      "−33.3°C",
      "Ammonia (R-717) boiling point",
      "Ammonia boils at −33.3°C; latent heat of vaporization ≈ 1370 kJ/kg (very high); used in industrial refrigeration; toxic and mildly flammable (B2L)"),

    P("Assertion: R-11 has ODP = 1.0. Reason: R-11 is the reference gas for ozone depletion potential.",
      "Both Assertion and Reason are correct, and Reason is the correct explanation",
      "ODP reference gas",
      "R-11 (CCl₃F) is the internationally agreed reference for ODP; ODP of all refrigerants is measured relative to R-11 by definition"),

    P("The ODP of R-12 (CCl₂F₂) is approximately:",
      "0.82",
      "R-12 ozone depletion potential",
      "R-12 ODP ≈ 0.82; each chlorine atom contributes to ozone destruction; ODP depends on Cl content and atmospheric lifetime"),

    P("Which statement is CORRECT about ODP of R-22?",
      "R-22 is an HCFC with ODP ≈ 0.055, much lower than CFCs due to the hydrogen atom enabling faster atmospheric breakdown",
      "HCFC ODP advantage",
      "R-22 (CHClF₂) has ODP ≈ 0.055; the H atom allows UV breakdown in the troposphere, so less Cl reaches the stratosphere; still being phased out by 2030"),

    P("The ODP of R-134a is:",
      "Zero (0.0)",
      "R-134a is ozone friendly",
      "R-134a (CH₂FCF₃) contains no chlorine atoms; ODP = 0; developed specifically as an ozone-safe replacement for R-12"),

    P("The GWP₁₀₀ of R-134a is approximately:",
      "1300 to 1500 (IPCC AR4 value ≈ 1430)",
      "R-134a global warming potential",
      "Despite ODP = 0, R-134a has high GWP ≈ 1430; now being phased down under Kigali Amendment; HFO-1234yf (GWP < 1) is the replacement"),

    P("Which statement is INCORRECT about R-410a?",
      "R-410a has GWP close to zero and is considered an eco-friendly refrigerant",
      "R-410a GWP and properties",
      "R-410a (50% R-32 + 50% R-125) has GWP ≈ 2088, which is very high; operates at high pressure; the claim of near-zero GWP is FALSE"),

    P("Comfort air conditioning for summer typically maintains dry bulb temperature in the range of:",
      "22–27°C",
      "Comfort DBT range",
      "ASHRAE 55 and IS 3215 recommend 22–27°C DBT for summer comfort; 24°C is often the design setpoint for offices"),

    P("The recommended relative humidity range for thermal comfort is:",
      "40–60%",
      "Comfort RH range",
      "40–60% RH is the comfort zone; below 30% causes dry skin and static electricity; above 70% promotes mold and bacterial growth"),

    P("The recommended air velocity at occupied zone for comfort conditioning is:",
      "0.15 to 0.5 m/s",
      "Comfort air velocity",
      "ASHRAE 55 specifies 0.15–0.5 m/s for seated occupants; higher velocities cause draft discomfort; air distribution must target this range at floor level"),

    P("Minimum fresh air ventilation per person for office spaces is approximately:",
      "5 to 15 cfm (about 2.5 to 7.5 L/s per person)",
      "Ventilation requirement",
      "ASHRAE 62.1 specifies 5 cfm/person minimum for offices (low activity); up to 15 cfm for high-activity areas; essential for indoor air quality"),

    P("The bypass factor of a cooling coil in a central air conditioning system typically ranges from:",
      "0.1 to 0.2",
      "Central AC bypass factor",
      "Central AC coils have 6–8 rows; BF = (T_out − ADP)/(T_in − ADP); more rows = lower BF = better contact; BF of 0.15 means 85% of air contacts the coil"),

    P("The bypass factor of a window or split air conditioning unit typically ranges from:",
      "0.2 to 0.3",
      "Unit AC bypass factor",
      "Window/split units have only 2–3 rows; BF = 0.2–0.3; lower row count means more air bypasses the coil, hence lower dehumidification efficiency"),

    P("Apparatus dew point (ADP) of a cooling coil is defined as:",
      "The effective surface temperature at which the extended air stream would become saturated if it made full contact with the coil",
      "ADP definition",
      "ADP lies between coolant temperature and leaving air temperature; if all air contacted the coil, it would leave at ADP; BF = (T_out − ADP)/(T_in − ADP)"),

    P("Assertion: Effective temperature (ET) is an empirical comfort index. Reason: It combines the effects of DBT, WBT, and air velocity.",
      "Both Assertion and Reason are correct, and Reason explains the Assertion",
      "Effective temperature concept",
      "ET was developed by Houghton and Yaglou; ET = 25°C at 50% RH and 0.1 m/s is the standard reference; it is a single-number index for thermal sensation"),

    P("A sling psychrometer is primarily used to measure:",
      "Wet bulb temperature (WBT) for determining air humidity",
      "Sling psychrometer purpose",
      "The sling psychrometer has wet and dry bulb thermometers; swinging ensures air velocity over the wet bulb; from DBT and WBT, relative humidity is found from psychrometric charts or tables"),

    P("Room sensible heat factor (RSHF) is calculated as:",
      "RSHF = Q_sensible / (Q_sensible + Q_latent)",
      "RSHF formula",
      "RSHF = Q_s/(Q_s + Q_l); RSHF = 1 means all cooling is sensible; RSHF = 0.7 means 70% sensible and 30% latent; the RSHF line slope on the psychrometric chart determines the coil process"),

    P("Which statement is CORRECT about GSHF versus RSHF?",
      "GSHF considers fresh air load in addition to room load, so it is usually lower than RSHF in summer when fresh air is hot and humid",
      "GSHF vs RSHF comparison",
      "GSHF = (Room sensible + Fresh air sensible)/(Room total + Fresh air total); fresh air adds latent load in summer, typically lowering GSHF below RSHF"),

    P("Effective sensible heat factor (ESHF) accounts for:",
      "The combined effect of room load and bypass air on the cooling coil process",
      "ESHF definition",
      "ESHF considers that the bypass factor fraction of fresh air bypasses the coil and mixes with conditioned air; it is the true coil load ratio used to draw the coil process line on the psychrometric chart"),

    P("A thermostatic expansion valve (TXV) is set to maintain a superheat of approximately:",
      "5 to 7°C at the evaporator outlet",
      "TXV superheat setting",
      "TXV senses evaporator outlet temperature via a sensing bulb; maintains 5–7°C superheat (typically 6°C factory preset); prevents liquid slugging while maximizing evaporator surface"),

    P("The temperature difference (ΔT) across a condenser typically ranges from:",
      "5 to 10°C",
      "Condenser approach ΔT",
      "Condenser ΔT = condensing temperature − entering coolant temperature; water-cooled: 5–8°C; air-cooled: 8–15°C; lower ΔT means larger condenser and better heat rejection"),

    P("The temperature difference (ΔT) across an evaporator typically ranges from:",
      "10 to 15°C",
      "Evaporator approach ΔT",
      "Evaporator ΔT = leaving medium temperature − refrigerant saturation temperature; DX coils: 10–15°C; chilled water coils: 5–8°C; higher ΔT gives a compact coil but lower COP"),

    P("The cooling range of a cooling tower is defined as:",
      "The temperature difference between the warm water inlet and the cold water outlet of the tower",
      "Cooling tower range",
      "Range = T_warm_in − T_cold_out; typical range = 5–15°C; range is determined by heat load and water flow rate; larger range means more heat rejected per unit water flow"),

    P("The cooling approach of a cooling tower is defined as:",
      "The difference between the cold water outlet temperature and the ambient wet bulb temperature",
      "Cooling tower approach",
      "Approach = T_cold_out − T_WBT; typical approach = 3–6°C; smaller approach requires a larger tower; approach and range together define tower performance"),

    P("The ACH for a hospital operating room should typically be:",
      "15 to 25 ACH",
      "Operating room ventilation",
      "Operating rooms require 15–25 ACH per ASHRAE 170; high ACH with HEPA filtration ensures a sterile environment; lower rates increase surgical site infection risk"),

    P("The ACH for a residential bedroom is typically:",
      "0.5 to 1.0 ACH",
      "Residential ventilation rate",
      "Residential spaces need 0.5–1 ACH for basic ventilation; combined with fresh air requirement of 5–7.5 L/s per person per ASHRAE 62.1"),

    P("The ACH for a gymnasium or indoor sports hall is typically:",
      "8 to 15 ACH",
      "Gymnasium ventilation",
      "High occupancy and physical activity demand 8–15 ACH; IS 3215 recommends higher rates for sports facilities to remove heat and CO₂ from active occupants"),

    P("Which statement is CORRECT about centrifugal fans versus axial fans?",
      "Centrifugal fans handle higher pressures and are used in long duct runs; axial fans move large volumes at low pressures",
      "Fan type comparison",
      "Centrifugal fans (backward/forward curved blades) develop high static pressure for long duct runs; axial fans (propeller, tube-axial, vane-axial) move large volumes at low pressure for ventilation and condensers"),

    P("The equal friction method of duct design maintains:",
      "A constant friction loss per unit length (typically 0.1 mm water gauge per meter) throughout the duct system",
      "Equal friction duct sizing",
      "In equal friction method, ΔP/L = constant for all duct sections; simpler to design but does not guarantee equal air distribution; static regain method is preferred for precise balancing"),

    P("The typical friction loss used in commercial duct design is approximately:",
      "0.1 mm WG per meter of duct length",
      "Duct friction loss value",
      "0.1 mm WG/m ≈ 0.8 Pa/m is the standard design value; lower values (0.06–0.08) for quiet systems; higher values (0.15) for space-constrained designs; based on ASHRAE duct friction chart"),

    P("Which statement is CORRECT about defrosting in refrigeration systems?",
      "Electric heating, hot gas bypass, and reverse cycle are common defrosting methods for evaporators in sub-zero environments",
      "Defrosting methods",
      "Ice builds on evaporator below 0°C reducing heat transfer; electric defrost uses heaters on coils; hot gas bypass routes warm discharge gas; reverse cycle switches to heating mode"),

    P("Moisture in a refrigeration system causes which problems?",
      "Ice formation at the expansion valve, corrosion of metal parts, and formation of sludges with oil",
      "Effects of moisture in system",
      "Moisture freezes at the expansion device causing blockage; reacts with refrigerant to form acids (e.g., HCl from R-22); degrades oil; filter-driers and vacuum evacuation prevent moisture entry"),

    P("Oil in a refrigeration system primarily serves which purpose?",
      "Lubrication of compressor moving parts and sealing of compressor clearances",
      "Oil function in refrigeration",
      "Refrigerant oil lubricates bearings, cylinders, and scrolls; also seals clearances to reduce leakage; oil separators return oil to crankcase in large systems"),

    P("The primary function of a filter-drier in a refrigeration system is:",
      "To remove moisture, acid, and solid contaminants from the refrigerant",
      "Filter-drier purpose",
      "Filter-drier contains desiccant (molecular sieve/silica gel) for moisture, acid scavenger, and filter mesh for particles; located before expansion device"),

    P("The primary purpose of a suction line accumulator is:",
      "To prevent liquid refrigerant from entering the compressor during off-cycle or low-load conditions",
      "Accumulator function",
      "Accumulator stores excess liquid refrigerant from the evaporator during off-cycle; prevents liquid slugging that damages compressor valves and pistons"),

    P("VRF systems operate on which principle?",
      "Simultaneous control of refrigerant flow to multiple indoor units via electronic expansion valves and inverter-driven compressors",
      "VRF system operation",
      "VRF uses inverter-driven compressors and EEVs to vary refrigerant flow; one outdoor unit connects to many indoor units; each indoor unit has individual temperature control"),

    P("Which statement is CORRECT about heat recovery VRF systems?",
      "They can provide simultaneous heating and cooling by transferring heat from cooling zones to heating zones via a three-pipe system",
      "Heat recovery VRF",
      "Three-pipe heat recovery VRF allows simultaneous heating and cooling; heat from zones needing cooling is piped to zones needing heating via a branch selector box"),

    P("Which compressor type is best suited for LARGE capacity commercial air conditioning above 300 TR?",
      "Centrifugal compressor",
      "Compressor selection by capacity",
      "Scroll: 2–40 TR; screw: 30–500 TR; centrifugal: 150–5000+ TR; reciprocating: 1–100 TR; centrifugal uses a high-speed impeller for very large capacities"),

    P("A screw compressor operates on which principle?",
      "Trapping and compressing gas between meshing twin rotors in a tapered casing with capacity controlled by a slide valve",
      "Screw compressor working",
      "Twin-screw compressor has male (4–5 lobes) and female (6–7 flutes) rotors; gas enters at one end and is compressed as rotor volume decreases; oil injected for sealing and cooling"),

    P("Refrigerant safety group A1 indicates which characteristics?",
      "Non-toxic and non-flammable under all operating conditions",
      "ASHRAE 34 safety classification",
      "First letter = toxicity (A = lower, B = higher); second number = flammability (1 = none, 2L = lower, 2 = higher, 3 = highest); R-134a, R-22, R-410a are all A1"),

    P("Ammonia (R-717) belongs to which ASHRAE 34 safety group?",
      "B2L — higher toxicity with lower flammability",
      "Ammonia safety classification",
      "Ammonia is toxic (B, TLV ≈ 25 ppm) and mildly flammable (2L); ODP = 0 and GWP = 0; widely used in industrial refrigeration due to excellent thermodynamic properties"),

    P("If a refrigeration system absorbs 5 kW from the cold space and the compressor consumes 1.25 kW, the COP is:",
      "4.0",
      "COP = Q_evap / W_compressor",
      "COP = 5/1.25 = 4.0; higher COP means more cooling per unit of work; Carnot COP is always the theoretical maximum for given temperature limits"),

    P("A room requires 20 kW of sensible cooling with an air temperature drop of 10°C. The required air flow is approximately:",
      "3510 CFM (1.667 m³/s)",
      "Q = 1.2 × V̇ × ΔT (SI); Q(Btu/h) = 1.08 × CFM × ΔT(°F)",
      "SI: 20 = 1.2 × V̇ × 10 → V̇ = 1.667 m³/s; Imperial: 20 kW = 68,240 Btu/h, ΔT = 18°F → CFM = 68240/(1.08 × 18) = 3510"),

    P("The specific enthalpy of moist air at 25°C DBT and humidity ratio 0.010 kg/kg dry air is approximately:",
      "50.6 kJ/kg dry air",
      "h = 1.005t + w(2501 + 1.86t)",
      "h = 1.005(25) + 0.010(2501 + 1.86 × 25) = 25.125 + 25.475 = 50.6 kJ/kg; commonly read as ≈ 50 kJ/kg from psychrometric chart"),

    P("A cooling coil removes 10 kW with an enthalpy drop of 20 kJ/kg. The air mass flow rate through the coil is:",
      "0.5 kg/s",
      "Q = ṁ × Δh",
      "ṁ = Q/Δh = 10/20 = 0.5 kg/s; 0.5 kg/s ≈ 0.417 m³/s ≈ 883 CFM for standard air"),

    P("If room sensible heat is 15 kW and room latent heat is 5 kW, the RSHF is:",
      "0.75",
      "RSHF = Q_sensible / Q_total",
      "RSHF = 15/(15 + 5) = 0.75; means 75% of room cooling is sensible; on the psychrometric chart the RSHF line slope = 0.75; coil must follow a process below this line for adequate dehumidification"),

    P("Which process occurs when air is cooled below its dew point temperature on a cooling coil?",
      "Simultaneous cooling and dehumidification as moisture condenses on the cold coil surface",
      "Dehumidification process",
      "Air cooled below dew point follows the saturation curve downward; water vapor condenses and is drained; the overall process line goes from entering condition toward the coil ADP"),

    P("Evaporative cooling works on which thermodynamic principle?",
      "Adiabatic saturation — water evaporates using sensible heat from air, lowering its temperature at approximately constant enthalpy",
      "Evaporative cooling principle",
      "Dry air passes over wet media; water evaporates absorbing latent heat; air temperature drops while humidity rises; enthalpy remains nearly constant; effective in dry climates"),

    P("An air washer performs which combination of functions?",
      "Cooling, heating, humidification, dehumidification, and air cleaning depending on water spray conditions",
      "Air washer capabilities",
      "Air washer sprays water through nozzles; chilled water below dew point: cooling + dehumidification; warm water: humidification; also removes dust and pollen"),

    P("Which type of condenser uses both air and water for heat rejection?",
      "Evaporative (wet) condenser, combining evaporative cooling with forced air convection",
      "Evaporative condenser",
      "Evaporative condenser sprays water on condenser tubes while air flows over them; lower approach temperature (2–3°C above WBT) than air-cooled; less water use than full water-cooled"),

    P("Flash gas percentage in a refrigeration system is defined as:",
      "The fraction of refrigerant that flashes to vapor during throttling from condenser to evaporator pressure",
      "Flash gas calculation",
      "Flash gas % = (h_f_cond − h_f_evap) / h_fg_evap × 100; flash gas reduces effective evaporator capacity; subcooling reduces flash gas"),

    P("Subcooling of liquid refrigerant before the expansion device primarily:",
      "Increases the refrigerating effect and reduces flash gas, thereby improving system COP and capacity",
      "Subcooling advantage",
      "Subcooling moves the state point further left on the p-h diagram; each degree of subcooling ≈ 0.5–1% capacity improvement; typical 3–8°C subcooling is maintained"),

    P("Superheating of refrigerant at the evaporator outlet serves which purpose?",
      "Ensures only vapor enters the compressor, preventing liquid slugging and mechanical damage",
      "Superheat purpose",
      "Superheat of 5–7°C protects compressor from liquid carryover; too much superheat reduces evaporator capacity and increases discharge temperature"),

    P("Head pressure in a refrigeration system is the pressure on which side?",
      "The high-pressure (discharge) side, between compressor outlet and expansion device inlet",
      "Head pressure definition",
      "Head pressure = discharge/condensing pressure; high head pressure increases compressor work and reduces COP; causes include dirty condenser, overcharge, or non-condensables"),

    P("An overcharged system typically shows which symptoms?",
      "High head pressure, high current draw, and potentially compressor motor burnout",
      "Overcharge symptoms",
      "Excess refrigerant floods the condenser raising head pressure; compressor works harder (high amps); subcooling increases abnormally; remedy is to recover excess refrigerant"),

    P("Which statement is CORRECT about TXV versus capillary tube as expansion devices?",
      "TXV is a variable-orifice device that adjusts to load changes via a sensing bulb; capillary tube is a fixed-orifice with no load adaptation",
      "TXV vs capillary tube",
      "TXV modulates to maintain constant superheat; capillary tube is a fixed-length tube calibrated for specific conditions; TXV for variable-load systems; capillary for small hermetic units"),

    P("Which statement is INCORRECT about R-410a?",
      "R-410a can be used directly in systems designed for R-22 without any modifications to components or operating pressures",
      "R-410a compatibility",
      "R-410a operates at ≈ 40% higher pressure than R-22; requires thicker copper tubing, different compressor, and different expansion device; this statement is incorrect and potentially dangerous"),

    P("The bypass factor of a cooling coil is calculated as:",
      "BF = (T_leaving_air − ADP) / (T_entering_air − ADP)",
      "BF calculation formula",
      "BF = (T_out − ADP)/(T_in − ADP); fewer rows and higher face velocity give higher BF; central AC BF = 0.1–0.2; unit AC BF = 0.2–0.3"),

    P("For a cooling coil with ADP = 10°C, entering air 27°C and leaving air 13°C, the bypass factor is:",
      "0.176 (≈ 0.18)",
      "BF = (T_out − ADP)/(T_in − ADP)",
      "BF = (13 − 10)/(27 − 10) = 3/17 = 0.176; this falls within the central AC range of 0.1–0.2"),

    P("In psychrometry, the sensible heat ratio (SHR) line represents:",
      "The ratio of sensible to total heat for a given process, shown as a slope line from the room condition through the coil ADP on the chart",
      "SHR line on psych chart",
      "SHR = Q_s/Q_total; steeper line = more sensible cooling; flatter = more dehumidification; RSHF determines the room-side slope; the coil processes along this line or below it"),

    P("Which statement is CORRECT about R-22 in the context of current regulations?",
      "R-22 is being phased out globally with production ending by 2030 under the Montreal Protocol; R-410a and R-32 are common replacements",
      "R-22 phase-out status",
      "R-22 ODP = 0.055; developed countries banned production from 2020; developing countries by 2030; R-410a (GWP 2088), R-32 (GWP 675), and R-290 (GWP 3) are alternatives"),

    P("The cooling coil in a central air conditioning system performs which combined process?",
      "Simultaneous sensible cooling and dehumidification, with moisture condensing on the wet coil surface below the air dew point",
      "Coil cooling process",
      "Air contacts the cold coil; sensible heat removed first until dew point; then latent heat removed as moisture condenses; the overall process line on the psychrometric chart goes from entering condition toward ADP"),

    P("Which type of humidification adds moisture without changing dry bulb temperature?",
      "Isothermal (steam injection) humidification, which adds moisture at constant DBT",
      "Isothermal humidification",
      "Steam injection adds moisture at the same air temperature; adiabatic (spray/wetted media) methods lower DBT while raising humidity; steam is preferred when DBT must not drop"),

    P("Which statement is CORRECT about R-32 compared to R-410a?",
      "R-32 is a single-component refrigerant with GWP ≈ 675 (lower than R-410a at 2088) but is classified A2L (mildly flammable), requiring charge limits in occupied spaces",
      "R-32 comparison with R-410a",
      "R-32 (CH₂F₂) BP = −51.7°C; slightly higher discharge temperature than R-410a; requires less charge; better COP; used in new inverter split ACs; A2L flammability means limits on charge amount"),
  ];
  SSC_JE_ENC3_RACHYD.hydmach = [
P("The specific speed of a Pelton turbine is in the range of:",
      "8.5 to 30 (SI units: rpm, m³/s, m)",
      "Pelton specific speed range",
      "N_s = N√Q / H^(3/4); Pelton: 8.5–30 SI; suitable for high head low flow; specific speed is the speed at which a geometrically similar turbine would run producing unit power under unit head"),

    P("The specific speed of a Francis turbine is in the range of:",
      "60 to 300 (SI units)",
      "Francis specific speed range",
      "Francis N_s = 60–300 SI; handles medium head and medium flow; the most widely used turbine type worldwide; specific speed lies between Pelton (low) and Kaplan (high)"),

    P("The specific speed of a Kaplan turbine is in the range of:",
      "300 to 1000 (SI units)",
      "Kaplan specific speed range",
      "Kaplan N_s = 300–1000 SI; suitable for low head high flow; axial flow runner with adjustable blades; highest specific speed among hydraulic turbines"),

    P("Which statement is CORRECT about head ranges of different turbines?",
      "Pelton is used for 150–2000 m head, Francis for 30–500 m, and Kaplan for 2–30 m",
      "Turbine head ranges",
      "Head determines turbine type: Pelton for very high head, Francis for medium head, Kaplan for low head; overlap exists between types at boundary heads"),

    P("The speed ratio (φ) of a Pelton wheel is defined as:",
      "φ = u/V₁ ≈ 0.44 to 0.46, where u is bucket speed and V₁ is the jet velocity",
      "Pelton speed ratio",
      "For maximum efficiency the bucket moves at 44–46% of the jet speed; V₁ = √(2gH); φ = 0.46 gives maximum theoretical efficiency; practical Pelton efficiency is 85–92%"),

    P("The jet ratio (m) of a Pelton turbine is typically:",
      "12 to 16 (m = D/d, where D is runner diameter and d is jet diameter)",
      "Pelton jet ratio",
      "Jet ratio m = D/d = 12–16; it also determines the number of buckets Z = m/2 + 15; too high a value means the jet is too small and friction dominates"),

    P("Which statement is CORRECT about the number of Pelton buckets?",
      "The number of buckets ≈ D/(2d) + 15, where D is the runner diameter and d is the jet diameter",
      "Pelton bucket formula",
      "Empirical formula Z ≈ D/(2d) + 15; for m = D/d = 12: Z ≈ 21 buckets; for m = 16: Z ≈ 23; too few buckets leave gaps for water and too many increase friction"),

    P("The runaway speed of a Pelton turbine is typically:",
      "1.8 to 2.0 times the rated speed",
      "Pelton runaway speed",
      "Runaway speed occurs at full gate no-load; if the governor fails, the Pelton runner accelerates to 1.8–2.0 N_rated; the generator rotor must withstand these centrifugal stresses"),

    P("The runaway speed of a Kaplan turbine is typically:",
      "2.5 to 3.0 times the rated speed, the highest among all turbine types",
      "Kaplan runaway speed",
      "Kaplan has the highest runaway ratio due to its axial flow design and large blade area; Francis: 2.0–2.5 N; Pelton: 1.8–2.0 N; design must safely carry runaway centrifugal loads"),

    P("The Thoma cavitation factor (σ) is defined as:",
      "σ = NPSH / H, the ratio of net positive suction head to the net head acting on the machine",
      "Thoma σ definition",
      "A lower actual σ than the critical σ causes cavitation; typical critical values: Francis ≈ 0.06–0.5, Kaplan ≈ 0.3–2.0; σ depends on turbine type, loading, and runner geometry"),

    P("Net positive suction head (NPSH) is defined as:",
      "The total suction head minus the vapor pressure head of the liquid, expressed in metres of liquid column",
      "NPSH definition",
      "NPSH_a = P_atm/ρg − P_vapour/ρg − h_suction_lift − h_friction − V²/2g; it must exceed NPSH_required for cavitation-free operation at the pump inlet"),

    P("The specific speed range for a radial flow centrifugal pump is:",
      "10 to 35 (SI units)",
      "Radial pump specific speed",
      "Low specific speed corresponds to radial flow; medium to mixed flow (35–80); high to axial flow (80–140); specific speed selects the correct impeller geometry for the duty"),

    P("The specific speed range for a mixed flow centrifugal pump is:",
      "35 to 80 (SI units)",
      "Mixed flow pump specific speed",
      "Mixed flow impeller has both radial and axial velocity components; covers medium head, medium discharge duties between radial and axial pumps"),

    P("The specific speed range for an axial flow pump is:",
      "80 to 140 (SI units)",
      "Axial pump specific speed",
      "Axial flow (propeller) pumps have the highest specific speed; very high discharge at low head; used for irrigation drainage, flood control, and cooling water circulation"),

    P("The manometric efficiency of centrifugal pumps typically ranges from:",
      "80% to 90%",
      "Manometric efficiency range",
      "η_man = gH_m / (V_w2 × u₂); V_w2 is the whirl velocity at the impeller outlet; well-designed pumps achieve 80–90%; small pumps reach 70–80%, large pumps 85–92%"),

    P("Slip in a reciprocating pump is defined as:",
      "The difference between theoretical displacement and actual delivery, expressed as a percentage of theoretical displacement",
      "Recip pump slip definition",
      "Slip = (Q_theoretical − Q_actual)/Q_theoretical × 100; positive slip arises from valve leakage and air entrainment; typical 2–8% at rated speed"),

    P("Air vessels on a reciprocating pump serve which purpose?",
      "They damp pressure pulsations, make the discharge nearly uniform, and reduce acceleration head losses",
      "Air vessel benefit",
      "Compressed air in the vessel absorbs flow surges during the acceleration phase and releases water during deceleration; reduces power consumption and allows higher operating speeds"),

    P("Water hammer is caused by:",
      "Sudden valve closure that converts the kinetic energy of flowing water into a pressure wave travelling along the pipe",
      "Water hammer phenomenon",
      "Pressure rise Δp = ρcΔV; c = wave speed ≈ 1430 m/s in water; can burst pipes; prevented by slow-closing valves, surge tanks, air chambers, and relief valves"),

    P("Which statement is CORRECT about surge tank types?",
      "Simple, throttled (restricted orifice), and differential surge tanks exist; the differential type has a central riser for faster response",
      "Surge tank types",
      "Simple: open standpipe; throttled: orifice at the base adds damping; differential: central riser rises fast while the annular tank refills slowly, giving rapid response to load swings"),

    P("An elbow (bent) draft tube is used when:",
      "The turbine tailrace is deep and vertical space for a straight conical draft tube is limited or impractical",
      "Elbow draft tube application",
      "Elbow draft tube discharges horizontally or downward when vertical space is short; kinetic energy recovery 80–85%, lower than the 85–90% of a straight conical tube"),

    P("Which statement is CORRECT about cavitation prevention in hydraulic turbines?",
      "Setting the runner lower relative to the tailrace and maintaining NPSH_a > NPSH_r are the primary prevention measures",
      "Cavitation prevention",
      "Lowering the runner increases submergence and NPSH_a; other methods include proper specific speed selection, anti-cavitation blade profiles, and operating within the specified head range"),

    P("Which statement is CORRECT about impulse versus reaction turbines?",
      "In impulse turbines the pressure is constant across the runner; in reaction turbines a pressure drop occurs across the moving blades",
      "Impulse vs reaction distinction",
      "Pelton is impulse: all head is converted to jet kinetic energy before the runner; Francis and Kaplan are reaction: water under pressure passes through the runner; reaction turbines require a draft tube"),

    P("Unit speed, unit discharge, and unit power are used to:",
      "Compare the performance of geometrically similar turbines operating under different heads by referring all to a unit head machine",
      "Unit quantities purpose",
      "N_u = N/√H; Q_u = Q/√H; P_u = P/H^(3/2); these dimensionless-like values let model test results predict prototype performance at any head"),

    P("The kinetic energy recovery within a draft tube is based on:",
      "Bernoulli's principle — the diverging section decelerates water, converting velocity head into pressure head",
      "Draft tube recovery mechanism",
      "Velocity at the draft tube inlet is high; the diverging shape reduces it; recovered energy ≈ η_dt × (V₁² − V₂²)/(2g); the optimal conical included angle is 7–8°"),

    P("Specific speed is significant because it:",
      "Determines the type of turbine or pump required for a given duty, independent of the actual machine size",
      "Specific speed significance",
      "Specific speed characterizes machine geometry; it selects Pelton/Francis/Kaplan turbines and radial/mixed/axial pumps regardless of the actual head and discharge values"),

    P("Main characteristic curves of a hydraulic turbine plot:",
      "Head versus discharge, power versus discharge, and efficiency versus discharge at constant speed",
      "Turbine characteristic curves",
      "These curves are drawn at constant speed and constant guide vane opening; hill charts superimpose iso-efficiency contours for many openings to show the optimum operating zone"),

    P("The runaway speed of a Francis turbine is typically:",
      "2.0 to 2.5 times the rated speed",
      "Francis runaway speed",
      "At full gate and no load a Francis runner reaches 2.0–2.5 N_rated; the mechanical design must accommodate runaway centrifugal stresses in case the governor fails"),

    P("A well-designed conical draft tube recovers what fraction of the runner exit velocity head?",
      "85 to 90%",
      "Conical draft tube efficiency",
      "Conical tube with included angle 7–8° recovers 85–90% of the exit kinetic energy; an elbow draft tube manages only 80–85%; steeper angles cause separation losses"),

    P("A Francis turbine with N = 250 rpm, Q = 15 m³/s and H = 40 m has a specific speed of approximately:",
      "60.9 SI — right at the lower boundary of the Francis range",
      "N_s = N√Q / H^(3/4)",
      "N_s = 250 × √15 / 40^(3/4) = 250 × 3.873 / 15.91 = 60.9; 40^0.75 = (40³)^0.25 = 15.91; just inside Francis range 60–300"),

    P("A Pelton turbine with N = 450 rpm, Q = 2 m³/s and H = 150 m has a specific speed of approximately:",
      "14.9 SI — well within the Pelton range",
      "N_s = N√Q / H^(3/4)",
      "N_s = 450 × √2 / 150^(3/4) = 450 × 1.414 / 42.86 = 636.3 / 42.86 = 14.85 ≈ 14.9; Pelton range is 8.5–30"),

    P("A Kaplan turbine with N = 200 rpm, Q = 100 m³/s and H = 5 m has a specific speed of approximately:",
      "598 SI — well within the Kaplan range",
      "N_s = N√Q / H^(3/4)",
      "N_s = 200 × √100 / 5^(3/4) = 200 × 10 / 3.344 = 2000 / 3.344 = 598; 5^0.75 = e^(0.75 × ln5) = 3.344; Kaplan range is 300–1000"),

    P("A Pelton wheel turbine has which type of flow through the runner?",
      "Tangential flow — the jet strikes the buckets tangentially at the runner periphery",
      "Pelton flow type",
      "Pelton is an impulse turbine; water from the nozzle strikes double-hemispherical buckets at atmospheric pressure; the entire head is converted to kinetic energy before the runner"),

    P("A Francis turbine has which type of flow through the runner?",
      "Mixed flow (radial-inward to axial-outward) — water enters radially through guide vanes and leaves axially into the draft tube",
      "Francis flow type",
      "Francis is a reaction turbine; water passes through guide vanes (radial inward) and exits the runner axially into the draft tube; flow is partially radial and partially axial"),

    P("A Kaplan turbine has which type of flow through the runner?",
      "Axial flow — water flows parallel to the shaft through the propeller-type runner",
      "Kaplan flow type",
      "Kaplan is an axial-flow reaction turbine with an adjustable-blade propeller runner; the blade angle and guide vanes can both change to maintain high efficiency over a wide range"),

    P("In a Francis turbine the guide vanes (wicket gates) serve which function?",
      "They regulate the flow rate into the runner and impart a vortex (swirl) component to the water",
      "Guide vane function",
      "Guide vanes control flow rate and hence power output; they provide the tangential velocity component that creates the vortex; operated by the governor; close fully for emergency shutdown"),

    P("The draft tube in a reaction turbine has which two functions?",
      "It converts the runner exit kinetic energy into pressure energy and allows the turbine to be set above tailrace level",
      "Draft tube dual function",
      "The diverging duct decelerates water recovering kinetic energy (Bernoulli) and it effectively extends the runner outlet to the tailrace, letting the turbine sit high without losing head"),

    P("Cavitation in hydraulic machines occurs when:",
      "Local static pressure falls below the vapor pressure of the liquid, forming vapor bubbles that later collapse violently",
      "Cavitation mechanism",
      "At low-pressure zones (blade tips, draft tube inlet) water vaporizes into bubbles; collapse at higher pressure causes pitting, noise, vibration, and efficiency loss; Thoma σ = NPSH/H quantifies the risk"),

    P("Which statement is CORRECT about surge tanks in hydropower systems?",
      "They absorb water-hammer pressure fluctuations and supply or receive water to protect the penstock during load changes",
      "Surge tank purpose",
      "On sudden load rejection the water column surges; the surge tank provides an open surface to absorb it; on load increase it supplies extra water instantly; located near the turbine on the penstock"),

    P("Which statement is CORRECT about the hydraulic ram?",
      "It uses the water hammer effect to lift a portion of the supply water to a higher elevation without any external power source",
      "Hydraulic ram principle",
      "Supply water flows through the drive pipe; sudden valve closure creates water hammer; the pressure forces some water through a delivery valve to a higher reservoir; typical efficiency 60–80%"),

P("The hydraulic accumulator stores energy in the form of:",
      "Pressurized fluid acting against a compressed gas (nitrogen) spring or an elevated weight",
      "Accumulator energy storage",
      "Types: bladder/diaphragm (gas pre-charged), piston (gas or spring), weight-loaded; the accumulator supplements pump flow, absorbs shocks, and maintains system pressure; gas in the bulb follows pVⁿ = constant"),

    P("A hydraulic intensifier differs from an accumulator in that:",
      "An intensifier multiplies input pressure using the area ratio of two cylinders, while an accumulator stores energy at system pressure",
      "Intensifier vs accumulator",
      "Intensifier: large piston driven by low-pressure oil pushes a small piston, creating higher pressure; pressure ratio = A_large/A_small; accumulator simply stores fluid under pressure for later use"),

    P("A hydraulic jack works on which principle?",
      "Pascal's law — pressure applied to a confined fluid is transmitted equally in all directions, so a small force on a small piston lifts a large load on a big piston",
      "Hydraulic jack principle",
      "p = F₁/A₁ = F₂/A₂; mechanical advantage = A₂/A₁ = (D₂/D₁)²; a 100 N force on a 20 mm piston gives 100 × (200/20)² = 10,000 N on a 200 mm piston"),

    P("A hydraulic press uses the same principle as a jack but is primarily used for:",
      "Forming, shaping, and compressing operations in manufacturing such as forging, stamping, and molding",
      "Hydraulic press application",
      "The press provides very large force (up to thousands of tonnes) at the platen; speed is low but force is enormous; Pascal's law governs the force multiplication"),

    P("A hydraulic lift ram of area 0.01 m² receives oil at 0.005 m³/s. The lifting speed is:",
      "0.5 m/s",
      "v = Q / A",
      "v = Q/A = 0.005/0.01 = 0.5 m/s; to lift 50 tonnes (490.5 kN): pressure = 490500/0.01 = 49.05 MPa; power = pQ = 49.05×10⁶ × 0.005 = 245 kW"),

    P("Which statement is CORRECT about a fluid coupling versus a torque converter?",
      "A fluid coupling has torque ratio = 1 at all speeds, while a torque converter can multiply torque by 2–5 times at stall using a stator",
      "Coupling vs converter comparison",
      "The stator redirects oil in a torque converter causing torque multiplication; a fluid coupling has only impeller and runner, so input torque equals output torque always; converter at coupling point behaves like a coupling"),

    P("The typical slip in a fluid coupling at rated load is approximately:",
      "2 to 3% (efficiency ≈ 97%)",
      "Fluid coupling slip",
      "Slip = (N_in − N_out)/N_in × 100; about 2–3% at full load and ≈ 0.5% at no load; slip produces heat equal to torque × slip speed; zero slip means no torque transmission"),

    P("Which statement is INCORRECT about a fluid coupling?",
      "A fluid coupling can multiply torque at low output speeds",
      "Fluid coupling misconception",
      "This is incorrect: without a stator a fluid coupling cannot multiply torque; torque ratio is always 1; only a torque converter (with stator) multiplies torque"),

    P("The stall torque ratio of a typical torque converter is:",
      "2 to 5 (typically around 2.5 to 3)",
      "Torque converter multiplication",
      "At stall (output shaft locked) the torque converter multiplies input torque by 2–5; multiplication falls as output speed rises; at the coupling point (≈ 85–90% of input speed) it becomes a fluid coupling"),

    P("The K-factor of a torque converter is defined as:",
      "K = N_in / √(T_in), the speed per unit square root of input torque",
      "K-factor definition",
      "K-factor characterizes the size and loading of a converter; it is used to match the converter to the engine; a small K means the converter absorbs more torque at a given speed"),

    P("The efficiency of a torque converter at the coupling point is approximately:",
      "85 to 95% (typically ≈ 90%)",
      "Torque converter efficiency at coupling",
      "At the coupling point efficiency = T_out × N_out / (T_in × N_in) with torque ratio ≈ 1; peak efficiency ≈ 90% at about 85% speed ratio; the lock-up clutch gives 100% at cruising speed"),

    P("A torque converter achieves maximum efficiency when:",
      "Operating near the coupling point, where the stator freewheels and rotation losses are minimized",
      "Torque converter peak efficiency",
      "Below the coupling point the stator redirects flow giving torque multiplication but higher losses; at the coupling point the stator freewheels (one-way clutch) and efficiency peaks ≈ 90%; above it efficiency drops again"),

    P("The hydraulic power output of a turbine is given by which formula?",
      "P = ρ × g × Q × H × η_o (overall efficiency included)",
      "Turbine power formula",
      "P = ρgQHη_o; ρ = 1000 kg/m³, g = 9.81 m/s²; e.g., Pelton Q = 2 m³/s, H = 400 m, η_o = 0.9: P = 1000 × 9.81 × 2 × 400 × 0.9 = 7.06 MW"),

    P("The specific speed (N_s) of a turbine is defined by which formula?",
      "N_s = N × √Q / H^(3/4), with N in rpm, Q in m³/s and H in m",
      "Turbine specific speed formula",
      "N_s = N√Q/H^(3/4) in SI; the dimensionless form includes √g and ρ; specific speed identifies the turbine type: Pelton 8.5–30, Francis 60–300, Kaplan 300–1000"),

    P("The shaft power of a centrifugal pump is given by which formula?",
      "P = ρ × g × Q × H_m / η_overall (in watts)",
      "Pump power formula",
      "P = ρgQH_m/η_o with H_m the manometric head; η_o = η_vol × η_mech × η_man; for Q = 0.05 m³/s, H_m = 30 m, η = 0.75: P = 1000 × 9.81 × 0.05 × 30 / 0.75 = 19.6 kW"),

    P("For a pump at 25°C with suction lift 4 m, vapor pressure head 0.33 m, velocity head 0.2 m and atmospheric pressure head 10.33 m, the NPSH available is:",
      "5.80 m",
      "NPSH_a = P_atm/ρg − P_v/ρg − h_s − V²/2g",
      "NPSH_a = 10.33 − 0.33 − 4.0 − 0.2 = 5.80 m; must exceed NPSH_r (typically 2–5 m); if NPSH_a < NPSH_r cavitation occurs; lowering the pump improves NPSH_a"),

    P("A reciprocating pump with 100 mm bore, 300 mm stroke, at 60 rpm and volumetric efficiency 92% delivers approximately:",
      "0.130 m³/min (about 2.17 L/s), with 8% slip",
      "Q = (π/4) × D² × L × N × η_vol",
      "Q_theo = (π/4)(0.1)² × 0.3 × 60 = 0.1414 m³/min; Q_actual = 0.92 × 0.1414 = 0.130 m³/min = 2.17 L/s; slip = 1 − 0.92 = 8%"),

    P("The energy stored in a constant-pressure hydraulic accumulator discharging 5 L of oil at 12 MPa is:",
      "60 kJ",
      "E = p × V",
      "E = pV = 12 × 10⁶ × 0.005 = 60,000 J = 60 kJ; a weight-loaded accumulator delivers at constant pressure, so energy is simply pressure times displaced volume"),

    P("A hydraulic intensifier has large cylinder diameter 200 mm and small cylinder diameter 50 mm. The pressure multiplication ratio is:",
      "16 : 1",
      "Ratio = (D_large / D_small)²",
      "Ratio = (200/50)² = 4² = 16; force balance p₁A₁ = p₂A₂ gives p₂/p₁ = A₁/A₂ = (D₁/D₂)²; at 10 MPa input the output reaches 160 MPa"),

    P("A reaction turbine developing 5 MW at 100 m net head with 88% overall efficiency requires a flow of approximately:",
      "5.79 m³/s",
      "Q = P / (ρ × g × H × η_o)",
      "Q = 5 × 10⁶ / (1000 × 9.81 × 100 × 0.88) = 5000000/863280 = 5.79 m³/s; check: 1000 × 9.81 × 5.79 × 100 × 0.88 ≈ 5.0 MW"),

    P("A centrifugal pump delivering 0.08 m³/s against 25 m manometric head at 78% efficiency requires shaft power of approximately:",
      "25.2 kW",
      "P = ρ × g × Q × H_m / η_o",
      "P = 1000 × 9.81 × 0.08 × 25 / 0.78 = 19620 / 0.78 = 25,154 W ≈ 25.2 kW; a motor of at least 25.2 kW (with margin ≈ 28 kW) is selected"),

    P("A pump with NPSH_r = 4 m operates with atmospheric head 10.33 m, vapor head 0.5 m, suction lift 3.5 m and suction friction 1.0 m. Will cavitation occur?",
      "No — NPSH_a = 5.33 m exceeds NPSH_r = 4 m with a safe margin of 1.33 m",
      "NPSH_a = 10.33 − 0.5 − 3.5 − 1.0",
      "NPSH_a = 10.33 − 0.5 − 3.5 − 1.0 = 5.33 m; since 5.33 > 4 the pump runs cavitation-free; conventional margin 0.5–1.0 m is exceeded, so the installation is safe"),

    P("A single-acting reciprocating pump with 150 mm bore and 200 mm stroke at 80 rpm and 8% slip delivers approximately:",
      "0.260 m³/min",
      "Q_actual = (π/4) × D² × L × N × η_vol",
      "Q_theo = (π/4)(0.15)² × 0.2 × 80 = 0.2827 m³/min; η_vol = 0.92; Q_actual = 0.92 × 0.2827 = 0.260 m³/min; slip = 0.0227 m³/min (8%)"),

    P("A gas-loaded accumulator is pre-charged to 10 MPa with 2 L of gas, then compressed to 25 MPa with polytropic index n = 1.3. The stored energy is approximately:",
      "15.7 kJ",
      "V₂ = V₁(p₁/p₂)^(1/n); E = (p₂V₂ − p₁V₁)/(1 − n)",
      "V₂ = 2 × (10/25)^(1/1.3) = 2 × 0.4^0.769 = 0.988 L; E = (25 × 0.988 − 10 × 2)/(1 − 1.3) = (24.7 − 20)/(−0.3) = −15.7 kJ, giving 15.7 kJ of stored work"),

    P("A hydraulic intensifier with a 300 mm diameter large piston driven at 10 MPa and 75 mm small piston produces an output pressure of:",
      "160 MPa",
      "p_out = p_in × (D_large/D_small)²",
      "Ratio = (300/75)² = 16; p_out = 10 × 16 = 160 MPa; if the large piston moves 0.1 m/s the small piston moves 0.1/16 = 0.00625 m/s — force is gained at the cost of speed (power is conserved)"),

    P("A hydraulic crane lifting 20 tonnes (196.2 kN) at 0.3 m/s with a 100 mm bore cylinder requires:",
      "About 25 MPa pressure and 2.36 L/s flow (≈ 58.9 kW power)",
      "p = F/A; Q = A × v",
      "A = (π/4)(0.1)² = 0.00785 m²; p = 196200/0.00785 = 24.98 MPa ≈ 25 MPa; Q = 0.00785 × 0.3 = 0.00236 m³/s = 2.36 L/s; power = pQ = 25 × 10⁶ × 0.00236 ≈ 58.9 kW"),

    P("Which statement is CORRECT about altitude and pump cavitation?",
      "At higher altitudes atmospheric pressure decreases, reducing NPSH_available and increasing cavitation risk",
      "Altitude effect on NPSH",
      "Sea level P_atm ≈ 101.3 kPa (10.33 m); at 2000 m ≈ 79.5 kPa (8.1 m); lower P_atm directly lowers NPSH_a, so pumps at altitude must be set lower or the suction lift reduced"),

    P("Negative slip in a reciprocating pump occurs when:",
      "Actual delivery exceeds theoretical displacement, caused by air leakage into the suction pipe combined with a leaking delivery valve",
      "Negative slip explanation",
      "Trapped air in the suction pipe compresses and acts as an extra piston, pushing extra water through the leaking delivery valve; Q_actual > Q_theoretical; seen at long suction pipes with high suction head"),

    P("What is the function of a governor in a hydraulic power plant?",
      "It continuously adjusts the guide vanes (or spear valve) so that power developed matches the load and speed stays constant",
      "Turbine governor function",
      "On load increase the governor opens the guide vanes and speeds up the response; on load decrease the reverse; modern governors use oil pressure feedback and are essential to keep frequency stable"),

    P("Which statement is CORRECT about the Moody draft tube?",
      "A Moody draft tube has an inverted-cone (withdrawing cone) at its inlet that improves pressure recovery and is used in large vertical Francis turbines",
      "Moody draft tube",
      "The central low-pressure core at the draft tube inlet causes energy loss; the Moody inverted cone fills this core improving the velocity distribution and raising overall draft tube efficiency"),

    P("Which statement is INCORRECT about the operation of hydraulic machines?",
      "The efficiency of a Pelton turbine is maximum when the bucket speed is exactly equal to the jet velocity",
      "Pelton speed ratio misconception",
      "Maximum Pelton efficiency occurs at φ = u/V₁ ≈ 0.46, not 1.0; at u = V₁ the relative velocity of water leaving the bucket is zero and no power is transferred; this statement is incorrect")
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC3_RACHYD;
  if (typeof window !== "undefined") window.SSC_JE_ENC3_RACHYD = SSC_JE_ENC3_RACHYD;
})();
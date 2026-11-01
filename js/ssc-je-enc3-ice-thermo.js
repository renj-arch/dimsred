(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC3_ICETHERMO = {};
  SSC_JE_ENC3_ICETHERMO.ice = [
    P("What is the typical compression ratio range for a petrol (SI) engine?",
      "8 to 10",
      "Think about the limit imposed by knock in SI engines.",
      "Petrol engines use 8–10:1 CR to prevent knock. Higher CR improves efficiency per η = 1 − 1/r^(γ−1) but causes auto-ignition of the end gas before the flame front arrives."),

    P("What is the typical compression ratio range for a diesel (CI) engine?",
      "16 to 20",
      "CI engines need very high CR for auto-ignition.",
      "CI engines require 16–20:1 CR so that air temperature exceeds diesel auto-ignition point (~210°C) at the end of compression without a spark plug."),

    P("What is the typical compression ratio for a Dual Combustion (Mixed Cycle) engine?",
      "12 to 16",
      "Between petrol and diesel ranges.",
      "The dual cycle has both constant-volume and constant-pressure heat addition. High-speed diesel engines operate at 12–16:1 CR combining advantages of both Otto and Diesel cycles."),

    P("In a Variable Compression Ratio (VCR) engine, how is the CR varied?",
      "By changing piston stroke or effective cylinder volume using linkages or tilting mechanisms",
      "Recall Nissan VC-Turbo or multi-link VCR systems.",
      "VCR engines use mechanisms like multi-link systems (Nissan VC-Turbo), tilting cylinder blocks, or eccentric crankshaft bearings to adjust CR from about 8:1 to 14:1 depending on load."),

    P("Which statement is correct about the Miller Cycle engine?",
      "Intake valve closes well before BDC (or well after BDC) to create effective over-expansion",
      "Miller cycle decouples geometric CR from effective CR.",
      "The Miller cycle closes the intake valve significantly before BDC (early-closing) or after BDC (late-closing), reducing effective stroke while maintaining high geometric CR, improving part-load thermal efficiency."),

    P("The inlet valve of a typical petrol engine opens approximately how many degrees before TDC?",
      "0° to 15° BTDC",
      "Inlet valve needs to be open by TDC for good induction.",
      "The inlet valve opens 0–15° before TDC so that by the time the piston starts the intake stroke the valve is already sufficiently open, improving the breathing capacity at high speeds."),

    P("The inlet valve of a typical petrol engine closes approximately how many degrees after BDC?",
      "40° to 80° ABDC",
      "Late closing exploits ram/inertia effect of incoming charge.",
      "Inlet valve closes 40–80° after BDC. The inertia of the incoming charge continues to fill the cylinder even after the piston starts moving up, increasing volumetric efficiency at rated RPM."),

    P("The exhaust valve of a typical petrol engine opens approximately how many degrees before BDC?",
      "30° to 50° BBDC",
      "Early opening allows blow-down before piston reaches BDC.",
      "Exhaust valve opens 30–50° before BDC to allow blow-down. Blow-down reduces the pressure in the cylinder before the piston begins the exhaust stroke, reducing pumping work significantly."),

    P("The exhaust valve of a typical petrol engine closes approximately how many degrees after TDC?",
      "5° to 15° ATDC",
      "Exhaust valve remains open briefly after TDC.",
      "Exhaust valve closes 5–15° after TDC. Combined with inlet opening before TDC, this creates a valve overlap period of about 10–30° crank angle for improved scavenging."),

    P("What is the typical valve overlap period in a high-performance petrol engine?",
      "20° to 40° crank angle",
      "Overlap = degrees inlet opens BTDC + degrees exhaust closes ATDC.",
      "Valve overlap of 20–40° in performance engines improves high-speed volumetric efficiency by using exhaust momentum to draw in fresh charge. It worsens idle quality and increases HC emissions."),

    P("What is the typical BMEP value for a naturally aspirated SI engine?",
      "8 to 10 bar",
      "BMEP = work per cycle / swept volume, independent of engine size.",
      "BMEP for NA SI engines is 8–10 bar. It represents the constant pressure that, if applied over the entire power stroke, would produce the same work. Turbocharged SI engines reach 12–16 bar."),

    P("What is the typical BMEP value for a naturally aspirated CI engine?",
      "6 to 9 bar",
      "CI engines run lean, producing lower BMEP at NA conditions.",
      "NA CI engines produce 6–9 bar BMEP due to lean operation. Turbocharged CI engines achieve much higher BMEP of 15–25 bar because the turbo supplies denser air enabling more fuel per cycle."),

    P("What is the typical spark advance at full load and rated speed in a petrol engine?",
      "30° to 40° BTDC",
      "Spark must fire earlier at higher speeds because flame propagation needs fixed time.",
      "At full load and rated speed, spark advance is 30–40° BTDC. Advance increases with speed because the piston moves faster but flame speed stays roughly constant, requiring earlier ignition."),

    P("What is the recommended spark plug gap for a typical petrol engine?",
      "0.6 mm to 0.9 mm",
      "Gap must be wide enough for reliable spark yet narrow enough for high-RPM operation.",
      "Spark plug gap is 0.6–0.9 mm. A wider gap gives a stronger spark but may cause misfire at high RPM when coil dwell time is short. CDI ignition systems allow wider gaps up to 1.1 mm."),

    P("What is the firing order of a 4-cylinder inline engine?",
      "1-3-4-2 or 1-2-4-3",
      "Firing order ensures even crankshaft loading and smooth operation.",
      "1-3-4-2 (most common) and 1-2-4-3 provide even 180° firing intervals in a 4-cyl inline engine. This balances crankshaft loads and minimizes torsional vibration."),

    P("What is the firing order of a 6-cylinder inline engine?",
      "1-5-3-6-2-4",
      "Six cylinders give even 120° firing intervals.",
      "Inline-6 firing order 1-5-3-6-2-4 provides 120° firing intervals with excellent primary and secondary balance, making it one of the smoothest engine configurations."),

    P("What does a Research Octane Number (RON) of 91 indicate?",
      "The fuel resists knock equivalent to a blend of 91% iso-octane and 9% n-heptane",
      "Higher octane number means better knock resistance.",
      "RON 91 means the fuel has knock resistance equal to a blend of 91% iso-octane (zero knock rating) and 9% n-heptane (severe knock) tested at 600 RPM. Typical petrol RON range: 87–98."),

    P("What does a cetane number of 50 indicate for diesel fuel?",
      "Ignition delay matches a blend of 50% cetane and 50% α-methylnaphthalene",
      "Higher cetane number means shorter ignition delay.",
      "Cetane number 50 means the fuel's ignition delay is equivalent to a reference blend of 50% cetane (CN=100) and 50% α-methylnaphthalene (CN=0). Typical diesel CN range: 40–55."),

    P("Which of the following is used as an octane number improver?",
      "Ethanol or Methyl tert-butyl ether (MTBE)",
      "TEL is now banned; modern improvers are oxygenates.",
      "Tetraethyl lead (TEL) was the classic octane improver but is now banned. Modern improvers include ethanol (up to 10–15% blend) and MTBE. Each raises the RON by providing high-octane blending components."),

    P("Which compound is used as a cetane number improver?",
      "Ethyl nitrate or Di-tert-butyl peroxide (DTBP)",
      "Cetane improvers decompose easily and shorten ignition delay.",
      "Ethyl nitrate and DTBP are cetane improvers that decompose at low temperatures, producing radicals that initiate pre-flame reactions earlier, reducing the ignition delay period by 30–50%."),

    P("What is the lower calorific value (LCV) of petrol?",
      "Approximately 44 MJ/kg",
      "LCV excludes the latent heat of water vapor formed during combustion.",
      "Petrol LCV ≈ 44 MJ/kg (gross/HCV ≈ 46–47 MJ/kg). The difference of 2–3 MJ/kg is the latent heat of vaporization of water produced from hydrogen in the fuel."),

    P("What is the lower calorific value (LCV) of diesel?",
      "Approximately 42.5 MJ/kg",
      "Diesel has slightly lower LCV per kg than petrol.",
      "Diesel LCV ≈ 42.5 MJ/kg (gross ≈ 45 MJ/kg). Although diesel has lower LCV per kg, its higher density (≈0.83 kg/L vs petrol ≈0.74 kg/L) gives higher energy per litre."),

    P("What is the lower calorific value of CNG (methane)?",
      "Approximately 47.5 MJ/kg or 36 MJ/m³ at STP",
      "CNG has high gravimetric but low volumetric energy density.",
      "CNG (CH₄) has LCV ≈ 47.5 MJ/kg (highest among hydrocarbons) but only ≈36 MJ/m³ at STP, requiring high-pressure storage at 200–250 bar for practical on-board use."),

    P("What is the stoichiometric air-fuel ratio for petrol?",
      "14.7:1 by mass",
      "Complete combustion of petrol needs about 14.7 parts air to 1 part fuel.",
      "Petrol stoichiometric AFR = 14.7:1. From C₈H₁₈ + 12.5(O₂ + 3.76N₂) → 8CO₂ + 9H₂O + 47N₂, the mass ratio of air to fuel works out to approximately 14.7."),

    P("What is the stoichiometric air-fuel ratio for diesel?",
      "14.3:1 by mass",
      "Diesel stoichiometric AFR is slightly lower than petrol.",
      "Diesel stoichiometric AFR ≈ 14.3:1. Diesel (approx C₁₂H₂₃) has a slightly different H/C ratio than petrol, resulting in a marginally lower theoretical air requirement per unit mass of fuel."),

    P("What is the typical laminar flame speed of a stoichiometric petrol-air mixture?",
      "0.4 to 0.5 m/s under standard conditions",
      "Turbulence in the engine cylinder increases effective flame speed 3–5 times.",
      "Laminar flame speed of petrol-air is 0.4–0.5 m/s. In engines, intake swirl and tumble create turbulence that raises effective flame speed to 1.5–2.0 m/s, reducing combustion duration to ~2 ms at 3000 RPM."),

    P("What is the typical combustion duration (burn angle) for a petrol engine at rated speed?",
      "55° to 75° crank angle",
      "Burn duration measured from 10% to 90% mass fraction burned.",
      "Combustion duration is 55–75° crank angle (10% to 90% MFB). At 3000 RPM, this equals approximately 3–4 ms. Shorter burn duration improves thermal efficiency but increases pressure rise rate and noise."),

    P("What causes knock in SI engines?",
      "Auto-ignition of the unburned end-gas before the flame front reaches it",
      "Multiple factors: high CR, advanced timing, low octane, high intake temp.",
      "Knock occurs when the end-gas reaches its auto-ignition temperature and pressure before the propagating flame arrives. Contributing factors: high CR, over-advanced spark, low octane fuel, high coolant temperature, and lean mixture."),

    P("Assertion (A): Diesel knock is caused by very rapid burning of the fuel-air bulk that accumulates during the ignition delay period. Reason (R): Every extra degree of ignition delay adds more premixed fuel, so the subsequent pressure-rise rate is higher. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Diesel knock scales with premixed quantity; SI knock scales with end-gas auto-ignition.",
      "During the ignition delay period, injected fuel evaporates and premixes with air. When auto-ignition finally occurs, this whole charge burns almost instantly, giving a pressure-rise rate above 4–6 bar/degree. Longer delay => more premixed fuel => stronger knock, so R explains A."),

    P("Which type of scavenging is most efficient in two-stroke engines?",
      "Uniflow scavenging (inlet port at bottom, exhaust valve at top)",
      "Uniflow gives the best scavenging efficiency of 80–90%.",
      "Uniflow scavenging uses inlet ports at the bottom and an exhaust valve at the top, directing fresh charge upward in one direction. It achieves 80–90% scavenging efficiency, compared to 60–70% for loop and 40–50% for cross scavenging."),

    P("What is the maximum boost pressure typically allowed for supercharging a petrol engine?",
      "0.5 to 0.8 bar above atmospheric",
      "SI supercharging is limited by knock boundary.",
      "Petrol engines are limited to 0.5–0.8 bar boost to stay below the knock limit. Direct injection cooling effect and intercooling allow up to ~1.0 bar in high-performance applications. Diesel engines tolerate 1.5–3.0 bar."),

    P("What does the SAE oil grade 10W-30 signify?",
      "10W = winter viscosity (max 7000 cP at −25°C); 30 = summer viscosity (9.3–12.5 cSt at 100°C)",
      "Multi-grade oil uses viscosity index improver polymers.",
      "SAE 10W-30: '10W' indicates cold-weather cranking ability (maximum viscosity at −25°C), while '30' indicates kinematic viscosity at 100°C (9.3–12.5 cSt). Viscosity index improver polymers enable this dual-grade performance."),
    P("Assertion (A): A thermostat keeps engine coolant at 85–95°C during normal running. Reason (R): An overcooled engine wastes heat and burns fuel poorly, while an overheated one risks pre-ignition and oil breakdown. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Thermostat begins opening at roughly 82°C and modulates radiator flow.",
      "Below 80°C fuel vaporizes poorly and HC emissions rise; above 100°C there is pre-ignition risk and lubricant degradation. The thermostat bypasses the radiator until coolant warms, so the reason correctly explains the target 85–95°C band."),

    P("How does a radiator pressure cap affect the coolant boiling point?",
      "Each psi of cap pressure raises boiling point by approximately 1.4°C (2°F)",
      "Higher pressure → higher boiling point → better cooling capacity.",
      "A 13 psi (0.9 bar) radiator cap raises the boiling point by ≈18°C, allowing coolant to operate safely at 105–110°C without boiling. Typical caps are rated 0.9–1.1 bar (13–16 psi)."),

    P("What is the primary coolant used in engine cooling systems?",
      "Ethylene glycol (50–60%) mixed with water",
      "Ethylene glycol lowers freezing point and raises boiling point.",
      "A 50:50 ethylene glycol-water mix freezes at −37°C and boils at 106°C at atmospheric pressure. Propylene glycol is used as a less toxic alternative. Never use 100% glycol — it has poor heat transfer."),

    P("Which is correct about battery ignition vs magneto ignition?",
      "Magneto ignition is self-contained and does not need a battery",
      "Magneto generates its own voltage from engine rotation.",
      "A magneto generates high voltage directly from engine rotation, making it ideal for small engines and aircraft. Battery ignition provides more consistent energy at low RPM but depends on battery charge. Aircraft use both systems for redundancy."),

    P("What is the main advantage of CDI (Capacitor Discharge Ignition) over conventional coil ignition?",
      "Extremely rapid voltage rise time (about 1 μs) preventing spark scatter at high RPM",
      "CDI charges a capacitor and discharges it through the ignition coil.",
      "CDI charges a capacitor to 200–400V then rapidly discharges through the coil, producing a voltage rise in ~1 μs. This eliminates timing scatter at high RPM that affects conventional inductive systems."),

    P("What is the typical fuel injection pressure in a CRDI (Common Rail Direct Injection) diesel system?",
      "1000 to 2500 bar (up to 3000 bar in latest systems)",
      "CRDI pressure is electronically controlled independent of engine speed.",
      "CRDI systems operate at 1000–2500 bar (latest systems up to 3000 bar). The high pressure is maintained in a common rail and electronically controlled injectors fire multiple injections per cycle (pilot, main, post)."),

    P("How does CRDI differ from conventional mechanical diesel injection?",
      "In CRDI, injection pressure is independent of engine speed and is electronically controlled",
      "Conventional systems generate pressure per injection event via cam-driven pumps.",
      "Conventional systems: injection pressure varies with engine speed (low pressure at idle). CRDI: high pressure is always available in the rail, enabling precise control of injection timing, duration, and pressure at all speeds."),

    P("What does a 3-way catalytic converter (TWC) simultaneously reduce?",
      "NOₓ, CO, and unburned HC",
      "TWC requires stoichiometric AFR (λ = 1) for all three conversions.",
      "A TWC reduces NOₓ to N₂, oxidizes CO to CO₂, and oxidizes HC to CO₂ and H₂O simultaneously. It only works within a narrow AFR window around stoichiometric (λ = 0.98–1.02), requiring an oxygen sensor for closed-loop control."),

    P("Assertion (A): EGR is used in a diesel engine to cut NOₓ emissions. Reason (R): Recirculated exhaust gas dilutes the charge and drives the peak flame temperature below the NOₓ formation threshold. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Thermal NOₓ forms mainly above roughly 1800°C via the Zeldovich mechanism.",
      "EGR of 10–30% feeds inert CO₂ and H₂O into the intake; their heat capacity lowers the peak combustion temperature below the Zeldovich NOₓ formation threshold, directly reducing NOₓ. Excess EGR instead raises PM and hurts efficiency."),

    P("What is the primary function of a DPF (Diesel Particulate Filter)?",
      "Traps and burns off soot (particulate matter) from diesel exhaust",
      "DPF uses wall-flow monolith to trap PM; periodic regeneration burns soot.",
      "A DPF uses a wall-flow ceramic monolith to trap diesel soot particles (>90% capture). When the soot load reaches a threshold, regeneration occurs by raising exhaust temperature to ~600°C to burn the soot to ash."),

    P("What is the function of a PCV (Positive Crankcase Ventilation) system?",
      "Routes blow-by gases from the crankcase back into the intake manifold for re-burning",
      "PCV prevents crankcase pressure buildup and reduces HC emissions.",
      "PCV valve draws blow-by gases (unburned HC that leak past piston rings) from the crankcase into the intake manifold. This prevents crankcase pressure buildup and eliminates a major source of HC emissions."),

    P("What percentage of fuel energy typically appears as brake work in a modern petrol engine?",
      "25% to 35%",
      "The rest is lost to exhaust, coolant, friction, and radiation.",
      "Brake thermal efficiency of a modern petrol engine is 25–35%. The remaining 65–75% is lost: exhaust 30–35%, cooling water 25–30%, friction and radiation 5–10%. Diesel engines achieve 35–45% brake efficiency."),

    P("What percentage of fuel energy is typically lost through exhaust gases?",
      "30% to 35%",
      "Exhaust carries away sensible heat of hot gases.",
      "Exhaust loss is 30–35% of fuel energy. This is the largest single loss in SI engines. Turbocharging and waste heat recovery can partially recover this energy. Exhaust temperature is typically 400–700°C."),

    P("What percentage of fuel energy is typically absorbed by cooling water?",
      "25% to 30%",
      "Heat is transferred through cylinder walls to coolant.",
      "Cooling water absorbs 25–30% of fuel energy through the cylinder head, liner, and piston surfaces. This heat must be removed to maintain material temperatures. Losses are higher at part load when the coolant-to-gas temperature ratio is higher."),

    P("What percentage of fuel energy is lost to friction and radiation combined?",
      "5% to 10%",
      "Friction includes piston rings, bearings, valve train, and auxiliaries.",
      "Friction and radiation losses total 5–10%. Piston assembly friction alone accounts for 40–55% of total friction. Remaining friction comes from bearings (25–30%), valve train (10–15%), and auxiliaries like oil and water pumps."),

    P("What does the Morse test determine?",
      "Indicated power of a multi-cylinder engine by cutting one cylinder at a time",
      "Morse test: cut one cylinder, measure power drop = IP of that cylinder.",
      "Morse test cuts ignition to one cylinder at a time while running at constant speed. The power drop equals the indicated power of that cylinder (assuming other cylinders maintain same IP). Total IP = Σ individual IPs. Works only for multi-cylinder engines."),

    P("What is the relationship between indicated power (IP) and brake power (BP)?",
      "IP = BP + FP (friction power), or BP = IP × ηₘ",
      "Mechanical efficiency ηₘ = BP/IP, typically 80–85%.",
      "Indicated power is the total power developed inside the cylinders. Brake power is the useful output at the crankshaft. The difference is friction power (FP). ηₘ = BP/IP = 1 − FP/IP. Typical ηₘ = 80–85% for petrol, 82–88% for diesel."),

    P("What is the typical mechanical efficiency of a petrol engine?",
      "80% to 85%",
      "Lower than diesel due to throttling losses at part load.",
      "Petrol engine mechanical efficiency is 80–85% at full load, dropping to 40–50% at idle due to pumping losses from throttling. Diesel engines have no throttle, so ηₘ remains higher (82–88%) across the load range."),

    P("Which of the following methods can measure friction power?",
      "Motoring test, Willans line method, and Morse test (indirectly)",
      "Motoring: run engine on electric motor and measure input power.",
      "Friction power methods: (1) Motoring test — drive the engine with a motor at test speed and measure input power. (2) Willans line — extrapolate fuel consumption vs BP curve to zero fuel. (3) Morse test — IP from cylinder cut-out minus BP. Motoring overestimates FP as it doesn't account for hot-gas expansion work."),

    P("What is the typical volumetric efficiency of a naturally aspirated petrol engine?",
      "75% to 85%",
      "Volumetric efficiency = actual air volume / swept volume at NTP.",
      "Volumetric efficiency ηᵥ = mass of air actually induced / (ρ_air × V_s). NA petrol engines achieve 75–85%. Tuned intake runners can exceed 100% at certain RPM due to ram effect. Turbocharged engines reach 120–150%."),

    P("What does the area enclosed by the indicator diagram (p-V diagram) represent?",
      "Work done per cycle per cylinder",
      "Area = ∫p dV = indicated work for that cylinder.",
      "The area inside the p-V indicator diagram equals the net indicated work per cycle per cylinder. Dividing by the swept volume gives the Mean Effective Pressure (MEP), a size-independent performance parameter."),

    P("How does compression ratio affect the efficiency of an Otto cycle?",
      "η_Otto = 1 − 1/r^(γ−1); efficiency increases with CR but with diminishing returns",
      "Going from CR = 8 to 10 raises η from 56% to 60% (for γ = 1.4).",
      "Otto cycle thermal efficiency η = 1 − 1/r^(γ−1). For γ = 1.4: at r = 8, η = 56.5%; at r = 10, η = 60.2%; at r = 12, η = 63.0%. Diminishing returns limit practical CR to 8–12 for petrol engines to avoid knock."),

    P("What is the formula for BMEP?",
      "BMEP = (n × W) / V_s for 2-stroke; BMEP = (n × W) / (2 × V_s) for 4-stroke",
      "Where n = power strokes per revolution, W = work per power stroke, V_s = swept volume.",
      "BMEP (bar) = (P × 600) / (N × V_s) for 4-stroke where P is power in kW, N is RPM, V_s is swept volume in litres. Equivalently, BMEP = (2π × T) / V_s where T is torque in Nm and V_s in m³."),

    P("What is the specific output of an engine?",
      "Power developed per unit swept volume (kW/litre or bhp/litre)",
      "Specific output = BP / V_s; indicates engine performance density.",
      "Specific output is the brake power per litre of swept volume. Typical values: naturally aspirated petrol 40–60 kW/L, turbocharged petrol 60–100 kW/L, turbocharged diesel 30–50 kW/L. Higher specific output means a smaller, lighter engine for the same power."),

    P("What is the function of a lambda (O₂) sensor in an engine?",
      "Measures exhaust oxygen content to maintain stoichiometric AFR for 3-way catalyst operation",
      "Narrowband sensors switch at λ = 1; wideband sensors measure continuous λ.",
      "The lambda sensor (ZrO₂ type) generates a voltage signal based on oxygen difference between exhaust and ambient. It enables closed-loop fuel control, maintaining λ = 1.0 ± 0.02 for optimal TWC conversion efficiency of all three pollutants."),

    P("At what temperature does a catalytic converter reach light-off (effective operation)?",
      "250°C to 350°C",
      "Below light-off temperature, conversion efficiency drops sharply.",
      "Catalytic converter light-off temperature is 250–350°C. Below this, the catalyst is inactive and conversion efficiency is negligible. Modern close-coupled catalysts and electrically heated catalysts reduce warm-up time to meet cold-start emission standards."),

    P("What are the advantages of gasoline direct injection (GDI) over port fuel injection (PFI)?",
      "Higher volumetric efficiency, precise fuel metering, stratified charge at part load, and better fuel economy",
      "GDI injects fuel directly into the combustion chamber at 50–300 bar.",
      "GDI advantages: (1) No fuel films on intake port walls → better transient response. (2) Charge cooling effect → higher volumetric efficiency. (3) Stratified charge at part load → lean burn → 10–15% better fuel economy. (4) Higher compression ratios possible."),

    P("How does the oil consumption of a two-stroke engine compare to a four-stroke?",
      "Two-stroke engines consume significantly more lubricating oil",
      "Two-stroke engines mix oil with fuel for crankcase lubrication.",
      "Two-stroke engines consume 5–10 times more oil than four-strokes because lubricating oil is mixed with fuel and partly burned during combustion. Modern oil-injection systems and low-smoke oils have reduced this, but consumption remains higher."),

    P("What is the auto-ignition temperature of petrol and diesel?",
      "Petrol: ~280°C; Diesel: ~210°C",
      "Diesel ignites at lower temperature, enabling compression ignition.",
      "Petrol auto-ignition temperature ≈ 280°C (varies with pressure and mixture). Diesel ≈ 210°C. The lower auto-ignition temperature of diesel allows it to ignite from compression heating alone, while petrol's higher value requires a spark plug."),

    P("What is the BSFC (Brake Specific Fuel Consumption) of a modern petrol engine at best point?",
      "240 to 270 g/kWh",
      "BSFC = fuel consumption rate / brake power; lower is better.",
      "Best-point BSFC for petrol engines is 240–270 g/kWh (equivalent to η_brake ≈ 31–35%). Diesel engines achieve 190–220 g/kWh (η ≈ 38–45%) due to higher CR and no throttling losses."),

    P("How does thermal efficiency of a diesel engine compare to a petrol engine at the same compression ratio?",
      "At the same CR and with the same heat input, the Otto (petrol) cycle is the more efficient air-standard cycle",
      "Real diesels beat petrol engines only because they can run at far higher CR (16–20 vs 8–12).",
      "Air-standard analysis at equal CR and equal heat input gives η_Otto > η_Diesel, because constant-volume heat addition keeps the average temperature of heat supply higher than constant-pressure addition. In practice diesel engines show 35–45% brake efficiency vs 25–35% for petrol, but almost entirely due to their much higher compression ratio."),

    P("Assertion (A): A large valve overlap improves the power output at high engine speeds. Reason (R): At high RPM the momentum of the outgoing exhaust helps pull fresh charge into the cylinder during overlap. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Overlap helps high-speed breathing but causes rough, unstable running at idle.",
      "At high RPM, exhaust blow-down momentum creates a low-pressure pulse that assists fresh-charge induction across the open inlet valve, raising volumetric efficiency and hence power. At low speed the flow reverses and charge is lost, so R explains A only in the high-speed regime."),

    P("What is the pre-chamber (indirect injection) combustion chamber?",
      "A small chamber connected to the main cylinder where fuel is first ignited, then flame jets into the main chamber",
      "Pre-chamber promotes better mixing and smoother combustion.",
      "In pre-chamber diesel engines (e.g., Ricardo Comet), fuel is injected into a small pre-chamber where combustion starts. Hot gas jets through a narrow throat into the main chamber, creating intense turbulence for rapid mixing and combustion. Used in high-speed light diesels."),

    P("What is swirl in a diesel engine and why is it important?",
      "Controlled rotational motion of air about the cylinder axis; improves fuel-air mixing",
      "Swirl is generated by tangential intake ports or pre-chamber geometry.",
      "Swirl is the organized rotation of air about the cylinder axis, generated by tangential intake ports (40–80% of air through tangential port). It breaks up the fuel spray and improves air-fuel mixing, reducing combustion duration and smoke. Swirl ratio typically 1.5–3.0."),

    P("What is the typical idling speed of a petrol engine?",
      "600 to 900 RPM",
      "Idle speed set to ensure smooth operation with accessories running.",
      "Petrol engine idle speed is 600–900 RPM. It must be high enough to: prevent stalling, power accessories (AC, alternator, power steering), maintain oil pressure, and provide acceptable NVH. Modern engines with VVT can idle at 600 RPM."),

    P("What is the knock limit of a supercharged petrol engine?",
      "Typically 0.5 to 0.8 bar boost at full load without intercooling",
      "Intercooling and direct injection can extend the knock limit.",
      "The knock limit restricts boost in SI engines. Without intercooling, knock occurs above ~0.5 bar boost. Intercooling lowers intake temperature by 30–50°C, extending the limit to ~0.8 bar. Direct injection provides additional charge cooling, allowing up to 1.0 bar."),

    P("What is the purpose of the piston ring pack in an engine?",
      "Seal combustion gases, control oil consumption, and transfer heat from piston to liner",
      "Typical 3-ring pack: 2 compression rings + 1 oil control ring.",
      "The piston ring pack performs three functions: (1) Gas sealing — prevents blow-by of combustion gases past the piston. (2) Oil control — scrapes excess oil from the liner. (3) Heat transfer — conducts ~70% of piston heat to the cylinder liner and coolant."),

    P("What is the air-standard efficiency of a Diesel cycle at CR = 18 with a cutoff ratio of 2.5 (γ = 1.4)?",
      "60.9%",
      "η = 1 − (1/r^(γ−1)) × (rc^γ − 1)/(γ(rc − 1)).",
      "With r = 18, rc = 2.5, γ = 1.4: r^0.4 = 18^0.4 = 3.178, so 1/r^0.4 = 0.3147. rc^γ = 2.5^1.4 = 3.607. η = 1 − 0.3147 × (3.607 − 1)/(1.4 × 1.5) = 1 − 0.3147 × 1.2414 = 1 − 0.391 = 0.609 = 60.9%. The cutoff ratio penalizes the Diesel cycle; the Otto cycle at CR 18 would reach 68.5% but knock makes it unachievable."),

    ];

  SSC_JE_ENC3_ICETHERMO.thermo = [
    P("What is the value of the specific gas constant R for air?",
      "0.287 kJ/kg·K",
      "Derived from R_u = 8.314 kJ/kmol·K divided by molar mass 28.97 kg/kmol.",
      "R_air = R_u/M = 8.314/28.97 = 0.287 kJ/kg·K. It appears in pV = mRT, so memorizing 0.287 lets you check nearly every air-state calculation."),

    P("What is the ratio of specific heats γ for air?",
      "1.4",
      "γ = Cp/Cv where Cp = 1.005 and Cv = 0.718 kJ/kg·K.",
      "γ = Cp/Cv = 1.005/0.718 = 1.4. It governs isentropic relations: T2/T1 = (P2/P1)^((γ−1)/γ) and pV^γ = constant."),

    P("What are the standard specific heats of air at room temperature?",
      "Cp ≈ 1.005 kJ/kg·K and Cv ≈ 0.718 kJ/kg·K",
      "Their difference exactly equals R_air = 0.287 kJ/kg·K.",
      "Cp − Cv = R = 0.287 kJ/kg·K. This relation follows from h = u + pv = u + RT, so dh = du + R·dT, giving Cp = Cv + R."),

    P("Which relation connects Cp, Cv, and the gas constant R?",
      "Cp − Cv = R",
      "Also valid on a molar basis: Cp̄ − Cv̄ = R_u.",
      "For an ideal gas, Cp − Cv = R. For air: 1.005 − 0.718 = 0.287 kJ/kg·K. The ratio form γ = Cp/Cv is the other key combination."),

    P("What is the value of the universal gas constant R_u?",
      "8.314 kJ/kmol·K",
      "Also written 8314 J/kmol·K; the per-kg constant is R_u/M.",
      "R_u = 8.314 kJ/kmol·K = 8314 J/kmol·K. Per-species constant R = R_u/M: for N₂ (28), R = 0.297; for O₂ (32), R = 0.260 kJ/kg·K."),

    P("What is Avogadro's number?",
      "6.022 × 10²³ molecules per kilomole",
      "One kilomole of any substance contains the same number of molecules.",
      "Avogadro's constant = 6.022 × 10²³ molecules/kmol (or 6.022 × 10²⁶ per kmol using molecular counting). One kmol of any ideal gas occupies 22.414 m³ at STP."),

    P("What are the STP (Standard Temperature and Pressure) conditions?",
      "0°C (273.15 K) and 101.325 kPa (1 atm)",
      "At STP, one kilomole of any ideal gas occupies 22.414 m³.",
      "STP = 0°C and 1 atm. Molar volume at STP = R_u·T/P = 8.314 × 273.15/101.325 = 22.414 m³/kmol. This volume is identical for all ideal gases."),

    P("What is the NTP (Normal Temperature and Pressure) as per Indian standard?",
      "20°C and 101.325 kPa (1 atm)",
      "NTP uses 293 K; the molar volume then becomes about 24.05 m³/kmol.",
      "Indian convention: NTP = 20°C (293.15 K), 1 atm. Molar volume = 8.314 × 293.15/101.325 = 24.05 m³/kmol. Engine volumetric efficiency is often corrected to NTP conditions."),

    P("What are the triple point conditions of water?",
      "273.16 K (0.01°C) and 611.65 Pa",
      "All three phases of water coexist in equilibrium only at this state.",
      "The triple point of water is 0.01°C and 611.65 Pa (0.6117 kPa, about 0.006 atm). It is exact and is used in the ITS-90 temperature scale definition of the kelvin (1 K on this scale fixes 273.16 K)."),

    P("What are the critical point conditions of water?",
      "374.15°C (647.1 K) and 22.064 MPa (220.64 bar)",
      "Above the critical pressure, liquid and vapor become indistinguishable.",
      "The critical point of water is 374.15°C and 22.064 MPa. At this point hf = hg and sfg = 0. Beyond it, only a supercritical fluid exists; above 22.1 MPa no boiling is observed."),

    P("What is the work done in an isothermal process for an ideal gas?",
      "W = mRT ln(V2/V1) = P1V1 ln(V2/V1)",
      "For isothermal, pV = constant, so W = ∫p dV = mRT ln(V2/V1).",
      "W = mRT ln(V2/V1). For 1 kg air at 300 K doubling in volume: W = 0.287 × 300 × ln 2 = 59.7 kJ/kg. Since ΔU = 0 for ideal gas, heat supplied equals this work."),

    P("What is the work done in a reversible adiabatic (isentropic) process?",
      "W = (P1V1 − P2V2)/(γ − 1) = mR(T1 − T2)/(γ − 1)",
      "Also equals ΔU with a sign change for an ideal gas.",
      "For isentropic expansion, work output W = mR(T1 − T2)/(γ − 1). For 1 kg air from 500 K to 300 K: W = 0.287 × 200/0.4 = 143.5 kJ/kg. Since Q = 0, this work equals the drop in internal energy."),

    P("What is the work done in a polytropic process with index n?",
      "W = (P1V1 − P2V2)/(n − 1) = mR(T1 − T2)/(n − 1)",
      "Same form as adiabatic but with index n instead of γ.",
      "The polytropic formula generalizes all pV^n processes: W = mR(T1 − T2)/(n − 1). For n = 1 (isothermal) this formula is singular, so the logarithmic form must be used."),

    P("What is the work done when 1 kg of air at 300 K doubles its volume isothermally?",
      "59.7 kJ/kg",
      "Use W = mRT ln(V2/V1) with m = 1, R = 0.287, T = 300.",
      "W = 1 × 0.287 × 300 × ln 2 = 86.1 × 0.6931 = 59.7 kJ/kg. Internal energy does not change (ΔU = 0), hence Q = W = 59.7 kJ/kg."),

    P("What is the work output of 1 kg of air expanding isentropically from 500 K to 300 K?",
      "143.5 kJ/kg",
      "Use W = mR(T1 − T2)/(γ − 1) with γ − 1 = 0.4.",
      "W = 0.287 × (500 − 300)/0.4 = 0.287 × 200/0.4 = 143.5 kJ/kg. This equals the internal energy drop cv(T1 − T2) = 0.718 × 200 = 143.6 kJ/kg, consistent with Q = 0."),

    P("What is the work done when 1 kg of air expands polytropically (n = 1.2) from 800 K to 500 K?",
      "430.5 kJ/kg",
      "Use W = mR(T1 − T2)/(n − 1) = 0.287 × 300/0.2.",
      "W = 0.287 × (800 − 500)/(1.2 − 1) = 0.287 × 300/0.2 = 430.5 kJ/kg. More work than the isentropic case because heat is supplied during the polytropic expansion (n < γ)."),

    P("What is the work done during a constant-pressure process?",
      "W = p(V2 − V1) = pΔV = mR(T2 − T1)",
      "For an ideal gas, pΔV = mRΔT automatically.",
      "At constant pressure, W = pΔV = mRΔT. For 1 kg air heated at 1 bar from 300 K to 600 K: W = 0.287 × 300 = 86.1 kJ/kg. The heat supplied is cpΔT = 1.005 × 300 = 301.5 kJ/kg."),

    P("What is the work done in a constant-volume (isochoric) process?",
      "Zero",
      "No volume change means no boundary work, W = ∫p dV = 0.",
      "For a rigid closed vessel, W = 0 because dV = 0. All heat added goes into raising internal energy: Q = mcv(T2 − T1). The entire energy appears as ΔU."),

    P("What is the isentropic temperature-pressure relation?",
      "T2/T1 = (P2/P1)^((γ−1)/γ)",
      "Companion relations: T2/T1 = (V1/V2)^(γ−1) and P2/P1 = (V1/V2)^γ.",
      "For isentropic ideal gas, T2/T1 = (P2/P1)^((γ−1)/γ). For air (γ = 1.4), exponent = 0.2857. This relation is essential for compressor and turbine exit temperature calculations."),

    P("Air at 300 K is compressed isentropically to 8 bar. What is its final temperature?",
      "543 K",
      "T2 = 300 × 8^0.2857 = 300 × 1.811.",
      "T2 = 300 × 8^0.2857 = 300 × 1.811 = 543 K. The isentropic temperature ratio 8^0.2857 ≈ 1.811 is a recurring figure; doubling it doubles the 300 K baseline to 600 K? No — it multiplies: 300 × 1.811 = 543 K."),

    P("What are the special values of the polytropic index n and the processes they represent?",
      "n = 0 isobaric; n = 1 isothermal; n = γ isentropic; n = ∞ is isochoric",
      "The process equation pV^n = constant reduces to each standard process.",
      "pV^n = constant: n = 0 gives p = const (isobaric); n = 1 gives pV = const (isothermal); n = γ gives adiabatic/isentropic; n = ∞ gives V = const (isochoric). Intermediate n values fit real compression and expansion curves."),

    P("What is the air-standard efficiency of an Otto cycle with compression ratio r?",
      "η = 1 − 1/r^(γ−1)",
      "Derived assuming constant-volume heat addition and ideal gas behavior.",
      "η_Otto = 1 − 1/r^(γ−1) for γ = 1.4. For r = 9: η = 1 − 1/9^0.4 = 1 − 1/2.408 = 58.5%. This is the maximum theoretical efficiency for that CR, independent of the heat added."),

    P("What is the air-standard efficiency of an Otto cycle at a compression ratio of 10, γ = 1.4?",
      "60.2%",
      "Compute 10^0.4 = 2.512, so 1/2.512 = 0.398.",
      "η = 1 − 1/10^0.4 = 1 − 1/2.5119 = 1 − 0.3981 = 0.6019 = 60.2%. Raising CR from 9 to 10 improves efficiency by only about 1.7 percentage points — the famous diminishing-return curve."),

    P("Assertion (A): On the same compression ratio and with the same heat input, the Otto cycle is more efficient than the Diesel cycle. Reason (R): Constant-volume heat addition keeps the average temperature of heat supply higher than constant-pressure addition. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Compare the average temperature at which heat is added in each cycle.",
      "With equal CR and equal heat added, η_Otto > η_Diesel because the Otto cycle adds heat at the smallest volume, giving the highest mean heat-addition temperature and hence the best Carnot-like efficiency. The reason is the correct mechanism."),

    P("On the same maximum pressure and with the same heat input, which cycle gives the highest efficiency?",
      "Diesel cycle",
      "Heat addition at constant pressure allows more expansion work at fixed peak pressure.",
      "At fixed maximum pressure and heat input: η_Diesel > η_Dual > η_Otto. The Diesel cycle does not push pressure to the peak instantly; its constant-pressure addition yields bigger expansion ratio and more useful work."),

    P("What is the efficiency of a Carnot cycle operating between 600 K and 300 K?",
      "50%",
      "η = 1 − T_cold/T_hot = 1 − 300/600.",
      "η_Carnot = 1 − T2/T1 = 1 − 300/600 = 0.5 = 50%. No real engine can exceed this between the same reservoirs. For comparison, a 700 K/300 K Carnot engine reaches 57.1%."),

    P("Which cycle components make up the Carnot cycle?",
      "Two isothermal processes and two isentropic (adiabatic) processes",
      "Two heat transfers, each at a fixed reservoir temperature.",
      "Carnot: isothermal heat addition → isentropic expansion → isothermal heat rejection → isentropic compression. Efficiency depends only on reservoir temperatures: η = 1 − T2/T1."),

    P("State the Kelvin-Planck statement of the second law.",
      "It is impossible to construct a device operating in a cycle that converts all the heat drawn from one reservoir into work",
      "Some heat must always be rejected to a low-temperature reservoir.",
      "Kelvin-Planck: no cyclic engine can have 100% thermal efficiency; a condenser or exhaust stream must always reject heat. This rules out perpetual motion machines of the second kind (PMM2)."),

    P("State the Clausius statement of the second law.",
      "It is impossible to transfer heat from a cold body to a hot body without doing work",
      "Refrigerators and heat pumps need work input precisely because of this law.",
      "Clausius: heat cannot flow spontaneously from cold to hot. Work input is required to pump heat uphill; even a perfect refrigerator has COP equal to the Carnot value, never infinite."),

    P("What is the coefficient of performance (COP) of a refrigerator?",
      "COP = Q_cold/W_net (heat removed divided by work input)",
      "For a Carnot refrigerator: COP = T_cold/(T_hot − T_cold).",
      "COP_ref = Q_c/W. For Carnot between 253 K and 298 K: COP = 253/45 = 5.62. The COP drops as the temperature lift increases; deep-freezing (−40°C) gives much lower COP than milk storage (+4°C)."),

    P("A Carnot refrigerator operates between 253 K (−20°C) and 298 K (25°C). What is its COP?",
      "5.62",
      "COP = T_cold/(T_hot − T_cold) = 253/(298 − 253).",
      "COP = 253/(298 − 253) = 253/45 = 5.62. For every kW of shaft power input, it can remove 5.62 kW of heat from the cold space — the theoretical limit for these temperatures."),

    P("What is the COP of a heat pump?",
      "COP = Q_hot/W_net (heat delivered divided by work input)",
      "For Carnot heat pump: COP = T_hot/(T_hot − T_cold), always greater than 1.",
      "COP_hp = Q_h/W. For Carnot between 310 K and 270 K: COP = 310/40 = 7.75. A heat pump COP is always 1 higher than an equivalent refrigerator COP because it delivers Q_hot = Q_cold + W."),

    P("A Carnot heat pump delivers heat at 310 K from a reservoir at 270 K. What is its COP?",
      "7.75",
      "COP = T_hot/(T_hot − T_cold) = 310/40.",
      "COP = 310/(310 − 270) = 310/40 = 7.75. It delivers 7.75 kW of heating for each kW of work input — three to four times better than electric resistance heating."),

    P("What is entropy?",
      "A measure of molecular disorder, with S = ∫(δQ_rev/T); its units are kJ/K",
      "Entropy is an extensive property and a measure of irreversibility.",
      "Entropy S = ∫δQ_rev/T. For reversible heat addition Q at constant T, ΔS = Q/T. In an irreversible process, total entropy of the universe always increases: ΔS_universe = S_gen ≥ 0."),

    P("What is the entropy change of 2 kg of water heated from 300 K to 380 K at constant pressure?",
      "1.98 kJ/K",
      "Use ΔS = mc ln(T2/T1) = 2 × 4.18 × ln(380/300).",
      "ΔS = mc_p ln(T2/T1) = 2 × 4.18 × ln(380/300) = 8.36 × ln(1.2667) = 8.36 × 0.2364 = 1.98 kJ/K. The positive sign confirms heating increases disorder; cooling by the same span would give −1.98 kJ/K."),

    P("In a free or unrestrained expansion of an ideal gas into a vacuum, what changes occur?",
      "Temperature unchanged, work done is zero, but entropy increases by mR·ln(V2/V1)",
      "No boundary work, no heat transfer — yet the process is irreversible.",
      "Free expansion: Q = 0, W = 0, hence ΔU = 0 and T stays constant for an ideal gas. Since the process is irreversible, entropy still grows: ΔS = mR ln(V2/V1). For 1 kg of air doubling its volume: ΔS = 0.287 × 0.693 = 0.199 kJ/K."),

    P("Assertion (A): A throttling process is irreversible. Reason (R): Entropy always increases across a throttling valve even though its enthalpy stays constant. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Throttling is a steady adiabatic flow with no work: h1 = h2 but s2 > s1.",
      "Across a valve or porous plug, Q = 0 and W = 0, so h1 = h2, yet the pressure loss and internal turbulence generate entropy, making s2 > s1. Entropy generation marks irreversibility, so R correctly explains A."),

    P("Assertion (A): The Joule-Thomson coefficient of an ideal gas is zero. Reason (R): For an ideal gas, enthalpy depends on temperature alone, so a constant-enthalpy throttling process cannot change its temperature. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "μ_JT = (∂T/∂P)_h; constant h with h = cp·T forces constant T.",
      "Since h = cp·T for an ideal gas, keeping h constant keeps T constant, so μ_JT = (∂T/∂P)_h = 0. Real gases below their inversion temperature cool on throttling (μ_JT > 0), while hydrogen and helium at room temperature warm up."),

    P("What is availability (exergy) of a system?",
      "The maximum useful work that can be obtained as the system comes to equilibrium with the environment (dead state)",
      "Availability A = (U − U₀) + P₀(V − V₀) − T₀(S − S₀) ignoring kinetics and gravity.",
      "Availability is the work potential relative to the dead state at (T₀, P₀). Lost work (irreversibility) = T₀ × S_gen. The second-law efficiency compares actual work to the reversible (availability) work."),

    P("What is the irreversibility (lost work) when the entropy generation is 0.5 kJ/K in surroundings at 300 K?",
      "150 kJ",
      "Use I = T₀ × S_gen = 300 × 0.5.",
      "Irreversibility I = T₀·S_gen = 300 × 0.5 = 150 kJ of work potential destroyed. Any irreversibility (friction, throttling, mixing, heat transfer across finite ΔT) consumes availability."),

    P("Steam enters a nozzle with negligible velocity and stagnates through a drop of 180 kJ/kg in enthalpy. What is the exit velocity?",
      "600 m/s",
      "Energy balance on a nozzle: v2 = √(2(h1 − h2)) with h in J/kg.",
      "SFEE for a nozzle (Q = 0, W = 0, Δz = 0): v2 = √(2 × 180 × 1000) = √360000 = 600 m/s. The velocity gained equals the enthalpy drop converted to kinetic energy."),

    P("What is the work output of a turbine when steam expands from h1 = 3100 kJ/kg to h2 = 2500 kJ/kg adiabatically?",
      "600 kJ/kg",
      "SFEE for adiabatic turbine with negligible KE/PE: W = h1 − h2.",
      "W = h1 − h2 = 3100 − 2500 = 600 kJ/kg. For a mass flow of 100 kg/s the power would be 60,000 kW = 60 MW. Real turbines give slightly less due to internal losses (isentropic efficiency < 100%)."),

    P("A boiler converts feed water at h1 = 500 kJ/kg to steam at h2 = 2800 kJ/kg at steady flow. What heat is added?",
      "2300 kJ/kg",
      "SFEE for boiler: Q = h2 − h1 (no work, negligible KE/PE).",
      "Q = h2 − h1 = 2800 − 500 = 2300 kJ/kg. This is the energy absorbed in heating, vaporizing, and superheating the water — the boiler duty per kg of steam."),

    P("Air enters a steady-flow adiabatic compressor at h1 = 290 kJ/kg and leaves at h2 = 580 kJ/kg. What is the power per kg/s?",
      "290 kW per kg/s",
      "SFEE for adiabatic compressor: W_in = h2 − h1.",
      "W = h2 − h1 = 580 − 290 = 290 kJ/kg, so 290 kW per kg/s of mass flow. Compressor work of gas turbines is this enthalpy rise divided by the compressor isentropic efficiency."),

    P("Write the steady flow energy equation (SFEE) for a general steady device.",
      "Q − W = (h2 − h1) + (v2² − v1²)/2 + g(z2 − z1), per unit mass",
      "Special cases: boiler Q = Δh; turbine W = h1 − h2; throttle h constant; nozzle ΔKE = −Δh.",
      "SFEE: Q − W = Δh + ΔKE + ΔPE per kg. It reduces to: boiler → Q = Δh; nozzle → ΔKE = h1 − h2; throttling → h1 = h2; adiabatic turbine → W = h1 − h2."),

    P("What is the mean effective pressure (MEP)?",
      "A hypothetical constant pressure which, acting on the piston over the whole stroke, produces the same work as the actual cycle",
      "MEP = Net work per cycle / Swept volume; widely used to compare engines of any size.",
      "MEP = W_net/V_s. It converts any p-V diagram into a rectangle of equal area. For air-standard cycles, the Otto MEP depends on pressure at state 1, CR, and cutoff/pressure ratio. It is a pressure-like measure, so it lets different engines be compared independently of displacement."),

    P("List the four basic processes of the Rankine cycle.",
      "Isentropic pumping (1–2), constant-pressure heat addition in boiler (2–3), isentropic expansion in turbine (3–4), constant-pressure heat rejection in condenser (4–1)",
      "The Rankine cycle is the steam/water version of the Carnot ideal with an isobaric boiler instead of isothermal.",
      "Rankine processes: pump compresses saturated liquid isentropically; boiler evaporates and superheats at constant pressure; turbine expands steam isentropically; condenser condenses exhaust steam at constant (low) pressure. Efficiency = net work/heat added."),

    P("Assertion (A): Superheating the steam slightly improves the Rankine cycle efficiency. Reason (R): Superheating raises the average temperature at which heat is added to the cycle. Which is correct?",
      "Both A and R are true, and R is the correct explanation of A",
      "Efficiency follows the mean heat-addition temperature; superheat also dries turbine exhaust.",
      "Superheated steam adds heat above the saturation temperature, lifting the average temperature of heat addition and nudging efficiency upward. In addition it moves the turbine exhaust into the superheated zone, cutting moisture and blade erosion, so R is the valid mechanism."),

    P("What is the effect of reheating steam in a Rankine cycle?",
      "Increases the turbine exhaust dryness fraction; may slightly lower or maintain efficiency but improves cycle with feed heating",
      "Reheat extracts high-pressure steam after partial expansion, heats it, then expands again.",
      "Reheating keeps the exhaust dryness fraction safely above 90% and enables high boiler pressures without wet-turbine damage. Reheat alone can slightly reduce efficiency, but combined with superheat and feed-heating it improves overall performance and plant output."),

    P("What is the effect of regenerative feed-water heating in a Rankine cycle?",
      "Increases thermal efficiency by raising the average temperature of heat addition",
      "Bleed steam from the turbine preheats the feed water instead of dumping all heat to the condenser.",
      "Feed-water heaters route some turbine steam (bleed) to preheat the condensate, so the boiler receives warmer water and the average temperature of heat supply rises — a direct efficiency gain. Each stage of feed heating adds about 1–2 percentage points."),

    P("What is the theoretical (Carnot) efficiency of a steam cycle between a boiler at 200°C and a condenser at 40°C?",
      "33.8%",
      "η = 1 − (313)/(473) using absolute temperatures.",
      "η = 1 − T2/T1 = 1 − 313/473 = 1 − 0.6617 = 0.338 = 33.8%. This is the ceiling for ideal operation; actual Rankine efficiencies are typically 25–35%, and superheat/feed-heating push real plants toward 40%+."),

    P("What is the work ratio of a cycle?",
      "Net work divided by gross (turbine) work",
      "Rankine work ratio ≈ 0.95; simple Brayton ≈ 0.4–0.5 (needs optimization).",
      "Work ratio = W_net/W_turbine. The Rankine cycle has a work ratio near 0.95 because pumping work is small. Gas turbines have far lower work ratios (0.4–0.5) because the compressor consumes roughly half the turbine output — hence back-work ratio is high."),

    P("What is the air-standard efficiency of a Brayton (gas turbine) cycle with pressure ratio rp?",
      "η = 1 − 1/rp^((γ−1)/γ)",
      "For γ = 1.4 the exponent is 0.2857; equivalent to 1 − (T1/T2).",
      "η_Brayton = 1 − 1/rp^((γ−1)/γ) for the ideal cold-air standard cycle. For rp = 12: η = 1 − 1/12^0.2857 = 1 − 1/2.033 = 50.8%. Efficiency rises monotonically with rp for the simple cycle."),

    P("What is the efficiency of an ideal Brayton cycle with a pressure ratio of 16?",
      "54.7%",
      "16^0.2857 = 2.208, so η = 1 − 1/2.208.",
      "η = 1 − 1/16^0.2857 = 1 − 1/2.208 = 1 − 0.4529 = 0.547 = 54.7%. Doubling rp from 8 to 16 gains about 10 percentage points — but raises compressor exit temperature, forcing high-temperature materials for the turbine."),

    P("What is the effect of regeneration in a gas turbine cycle?",
      "Increases thermal efficiency by preheating the compressed air with exhaust gas, reducing fuel input",
      "Regenerator is only beneficial when turbine exhaust is hotter than compressor discharge.",
      "Regeneration transfers exhaust heat (T4 ≈ 600–680°C) to the compressor outlet air before combustion. It raises efficiency but does not change turbine work. Above a certain rp, exhaust temperature falls below the compressor-discharge temperature and regeneration becomes useless."),

    P("What is the effect of reheating in a gas turbine cycle?",
      "Increases specific work output but reduces thermal efficiency when used alone",
      "Reheat adds fuel between high-pressure and low-pressure turbines.",
      "Reheating raises the average temperature of heat addition and increases turbine work per unit flow, boosting specific output. However, extra heat is added at lower pressure, so efficiency drops unless regeneration is combined with reheat — then both efficiency and work improve."),

    P("What is the effect of intercooling in a gas turbine cycle?",
      "Reduces compressor work by cooling the air between compression stages",
      "Intercooling alone reduces efficiency; combine with reheat and regeneration for the full benefit.",
      "Intercooling between the low-pressure and high-pressure compressors keeps the compressed air close to isothermal, cutting compressor work and improving specific work. Used alone it lowers efficiency (final temperature falls), so it is combined with reheat and regeneration."),

    P("What is a combined gas-steam power plant?",
      "A gas turbine topping cycle whose still-hot exhaust generates steam in a heat recovery steam generator (HRSG) to drive a bottoming Rankine cycle",
      "Modern combined cycles reach 60%+ LHV efficiency.",
      "In a combined cycle, the GT exhaust (500–650°C) produces steam in an HRSG for a steam turbine without extra fuel. Thermal efficiency reaches 60–64%, far above either cycle alone — hence the dominance of combined cycles in modern power plants."),

    P("What is the dryness fraction x of steam?",
      "The mass fraction of vapor in a wet (two-phase) mixture: x = m_vapor/(m_vapor + m_liquid)",
      "Enthalpy of wet steam: h = hf + x·hfg; entropy: s = sf + x·sfg.",
      "x = m_g/(m_g + m_f). At x = 1 steam is dry saturated, at x = 0 it is saturated liquid. All wet-steam properties are linearly interpolated as, for example, h = hf + x·hfg."),

    P("What is the enthalpy of steam at 2 bar with a dryness fraction of 0.9?",
      "2486 kJ/kg",
      "At 2 bar: hf = 504.7, hfg = 2201.6; h = 504.7 + 0.9 × 2201.6.",
      "h = hf + x·hfg = 504.7 + 0.9 × 2201.6 = 504.7 + 1981.4 = 2486.1 kJ/kg. Compare hg = 2706 kJ/kg at 2 bar — the wet mixture carries 220 kJ/kg less enthalpy than dry saturated steam."),

    P("What is the entropy of wet steam at 5 bar with a dryness fraction of 0.9?",
      "6.325 kJ/kg·K",
      "At 5 bar: sf = 1.8607, sfg = 4.9606; s = sf + 0.9 × sfg.",
      "s = sf + x·sfg = 1.8607 + 0.9 × 4.9606 = 1.8607 + 4.4645 = 6.3252 kJ/kg·K. The saturated-vapor entropy at 5 bar is 6.8213 kJ/kg·K, so the wet mixture is noticeably lower."),

    P("What is the Mollier diagram?",
      "A plot of enthalpy h against entropy s, used directly to read expansion processes of steam",
      "In the Mollier diagram, a vertical line is a reversible adiabatic (constant entropy) expansion.",
      "The Mollier (h–s) chart shows steam expansion work directly: for an isentropic expansion, W = h1 − h2 is read off vertically. Wet, superheated, and constant-dryness-fraction regions are drawn, making turbine design calculations fast."),

    P("How is the gas constant of a specific gas related to the universal gas constant?",
      "R = R_u/M, where M is the molar mass in kg/kmol",
      "For O₂: R = 8.314/32 = 0.2598 kJ/kg·K.",
      "R = R_u/M. For O₂ (M = 32): R = 8.314/32 = 0.2598 kJ/kg·K; for N₂ (M = 28): R = 0.2969; for CO₂ (M = 44): R = 0.1889 kJ/kg·K. Each gas has its own R."),

    P("What is the gas constant of a mixture of 25% O₂ and 75% N₂ by mass?",
      "0.2876 kJ/kg·K",
      "R_mix = Σ (mf_i × R_i) = 0.25 × 0.2598 + 0.75 × 0.2968.",
      "R_mix = 0.25 × 0.2598 + 0.75 × 0.2968 = 0.06495 + 0.2226 = 0.28755 ≈ 0.2876 kJ/kg·K. This is very close to the 0.287 value for real air, confirming the mixture models air well."),

    P("What is the specific heat Cp of a gas mixture whose R = 0.2876 kJ/kg·K and γ = 1.4?",
      "1.006 kJ/kg·K",
      "Cp = γR/(γ − 1) = 1.4 × 0.2876/0.4.",
      "Cp = γR/(γ − 1) = 1.4 × 0.2876/0.4 = 0.40264/0.4 = 1.0066 ≈ 1.006 kJ/kg·K. The companion Cv = R/(γ − 1) = 0.2876/0.4 = 0.719 kJ/kg·K."),

    P("How much heat is needed to raise 2 kg of air by 100°C at constant pressure?",
      "201 kJ",
      "Q = mcp ΔT = 2 × 1.005 × 100.",
      "Q = m·cp·ΔT = 2 × 1.005 × 100 = 201 kJ. Part of this (143.6 kJ) raises internal energy, and the remainder (57.4 kJ) is the pΔV work of expansion."),

    P("How much heat is needed to raise 2 kg of air by 100°C at constant volume?",
      "143.6 kJ",
      "Q = mcv ΔT = 2 × 0.718 × 100.",
      "Q = m·cv·ΔT = 2 × 0.718 × 100 = 143.6 kJ. No boundary work is done at constant volume, so all heat becomes internal-energy increase. The difference from the constant-pressure case (201 kJ) is exactly the expansion work."),

    P("What is the change in internal energy of 1 kg of air heated from 300 K to 500 K?",
      "143.6 kJ/kg",
      "Δu = cv(T2 − T1) = 0.718 × 200.",
      "Δu = cv·ΔT = 0.718 × 200 = 143.6 kJ/kg. Internal energy of an ideal gas depends only on temperature, so the path (constant V or P) does not matter for Δu."),

    P("What is the change in enthalpy of 1 kg of air heated from 300 K to 500 K?",
      "201 kJ/kg",
      "Δh = cp(T2 − T1) = 1.005 × 200.",
      "Δh = cp·ΔT = 1.005 × 200 = 201 kJ/kg. The difference Δh − Δu = 201 − 143.6 = 57.4 kJ/kg equals R·ΔT = 0.287 × 200, again confirming Cp − Cv = R."),

    P("What is the first law for a closed system undergoing any process?",
      "Q = W + ΔU, or δQ = δW + dU (work and heat transfer sign conventions as defined)",
      "Energy is conserved; mass does not cross the boundary.",
      "First law for closed systems: Q − W = ΔU (heat in minus work out equals energy stored). Special cases: adiabatic → W = −ΔU; isochoric → Q = ΔU; cyclic → Q = W."),

    P("What is a perpetual motion machine of the first kind (PMM1)?",
      "A device that produces work without consuming an equal amount of energy — impossible by the first law",
      "PMM1 violates conservation of energy.",
      "PMM1 is a hypothetical machine creating energy from nothing, forbidden by the first law. PMM2 (no work input yet transferring heat from cold to hot) violates the second law and is equally impossible."),

    P("What is the propulsive efficiency η_p of a turbojet?",
      "η_p = 2V_a/(V_e + V_a), where V_a is aircraft speed and V_e is jet exit velocity",
      "Higher exhaust velocity wastes kinetic energy in the wake.",
      "η_p = 2V_a/(V_e + V_a). As jet velocity approaches aircraft speed, wake loss vanishes and η_p → 100%. A turbofan achieves high η_p by accelerating a large air mass to a modest jet velocity."),

    P("What is the area under a reversible process curve on a T-s diagram?",
      "Heat transfer for that reversible process",
      "For a cycle, the area enclosed equals the net work and net heat.",
      "On the T-s diagram, ∫T dS = Q_rev. Thus the enclosed area of any reversible cycle equals both net heat and net work (first law). This is why Carnot appears as a rectangle between T_hot and T_cold."),

    P("What is the entropy change when 1000 kJ of heat is added reversibly to a system at constant 500 K?",
      "2 kJ/K",
      "ΔS = Q_rev/T = 1000/500.",
      "ΔS = Q/T = 1000/500 = 2 kJ/K. Entropy change scales inversely with the temperature at which heat is added — heat at lower temperature creates more disorder per kJ."),

    P("What is SSFC (Steam Specific Fuel Consumption) in a steam plant?",
      "The mass of fuel burned per unit of electrical energy generated, typically kg/kWh",
      "SSFC is to steam plants what BSFC is to IC engines.",
      "SSFC = fuel mass/electrical energy in kg/kWh, typically 0.3–0.5 kg/kWh for coal plants. Its inverse (kWh/kg) is a direct measure of plant thermal efficiency; improving cycle efficiency directly reduces SSFC."),

    P("What is second-law (exergetic) efficiency?",
      "The ratio of actual useful work to the maximum (reversible) work available",
      "η_II = W_actual/W_rev = W_actual/A; it compares performance against the ideal.",
      "η_II = W_actual/W_reversible. A heat engine may have high first-law efficiency but poor second-law efficiency if it destroys availability through large irreversibilities. Exergy analysis pinpoints where work potential is wasted."),

    P("A Carnot engine rejects 300 kJ to a 300 K sink while producing 300 kJ of work. What is the source temperature?",
      "600 K",
      "η = W/Q_in = 300/600 = 0.5; also η = 1 − 300/T_H, so T_H = 600 K.",
      "Heat input Q_in = W + Q_rej = 300 + 300 = 600 kJ. η = 300/600 = 0.5 = 1 − 300/T_H → T_H = 300/0.5 = 600 K. The Carnot efficiency equation pins the source temperature uniquely."),

    P("A throttling calorimeter measures steam dryness fraction. On what principle does it work?",
      "Enthalpy is constant through the throttling valve, so the superheat temperature after throttling fixes h, from which x = (h − hf)/hfg is found",
      "Steam at high pressure is throttled to atmospheric pressure where it becomes superheated, and its temperature is measured.",
      "Total enthalpy is conserved: h(main steam at p1, dryness x) = h(superheated steam at p_atm, measured T). Since h_after is known from measured temperature, x_before = (h_after − hf1)/hfg1 at the high pressure, solving the dryer-fraction problem."),

P("One kilogram of CO₂ (R = 0.1889 kJ/kg·K) is compressed isentropically (γ = 1.3) from 300 K to 420 K. What is the work input?",
      "75.6 kJ/kg",
      "W = mR(T2 − T1)/(γ − 1) = 0.1889 × 120/0.3.",
      "W_in = mR(T2 − T1)/(γ − 1) = 0.1889 × 120/0.3 = 22.67/0.3 = 75.6 kJ/kg. The smaller R of CO₂ makes its compression work about half that of air for the same temperature rise."),

    P("What is the specific volume and density of air at STP?",
      "0.7734 m³/kg; density = 1.293 kg/m³",
      "ρ = P/(RT) = 101.325/(0.287 × 273.15); v = 1/ρ.",
      "ρ = P/(RT) = 101.325/(0.287 × 273.15) = 101.325/78.39 = 1.293 kg/m³. Specific volume v = 1/1.293 = 0.7734 m³/kg. These STP values of air underpin volumetric efficiency calculations in engine tests."),
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC3_ICETHERMO;
  if (typeof window !== "undefined") window.SSC_JE_ENC3_ICETHERMO = SSC_JE_ENC3_ICETHERMO;
})();

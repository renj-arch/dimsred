(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC5_GASTURB = {};
  SSC_JE_ENC5_GASTURB.gasturb = [

    P("The ideal Brayton cycle consists of which four processes?",
      "Two constant-pressure heat exchanges and two isentropic processes.",
      "Brayton cycle = Joule cycle.",
      "The ideal Brayton (Joule) cycle has four processes: 1→2 isentropic compression, 2→3 constant-pressure heat addition, 3→4 isentropic expansion, and 4→1 constant-pressure heat rejection."),

    P("The thermal efficiency of an ideal air-standard Brayton cycle depends on which parameter?",
      "It depends only on the pressure ratio rp and the specific heat ratio γ.",
      "Ideal Brayton η = 1 − 1/rp^((γ−1)/γ).",
      "For the ideal air-standard Brayton cycle, η = 1 − 1/(rp^((γ−1)/γ)). It depends only on pressure ratio and γ, not on temperature limits."),

    P("For an ideal Brayton cycle with pressure ratio rp and γ = 1.4, what is the formula for thermal efficiency?",
      "η = 1 − 1/rp^((γ−1)/γ) where γ = 1.4.",
      "Exponent is (γ−1)/γ = 0.4/1.4 ≈ 0.2857.",
      "The ideal Brayton cycle efficiency is η = 1 − 1/(rp^(0.2857)) for γ = 1.4. Higher pressure ratio gives higher efficiency."),

    P("In the P-V diagram of an ideal Brayton cycle, what is the shape of each process?",
      "1→2 and 3→4 are vertical (isentropic), while 2→3 and 4→1 are horizontal (constant pressure).",
      "P-V: vertical lines for isentropics, horizontal for constant pressure.",
      "In the P-V diagram, isentropic processes (1→2 compression, 3→4 expansion) appear as steep curves (approximately vertical), and the two constant-pressure processes appear as horizontal lines."),

    P("In the T-s diagram of an ideal Brayton cycle, what are the shapes of the processes?",
      "1→2 and 3→4 are vertical (isentropic), while 2→3 and 4→1 are horizontal (constant pressure).",
      "T-s: vertical lines for isentropics, horizontal for constant pressure.",
      "In the T-s diagram, isentropic processes are vertical lines (constant entropy), and constant-pressure processes are horizontal lines (constant temperature at constant pressure in ideal air-standard analysis)."),

    P("As the pressure ratio of an ideal Brayton cycle increases, what happens to thermal efficiency?",
      "The thermal efficiency increases monotonically with pressure ratio.",
      "Higher rp → higher η in ideal cycle.",
      "From η = 1 − 1/rp^((γ−1)/γ), as rp increases, the term 1/rp^((γ−1)/γ) decreases, so η increases. There is no maximum; efficiency keeps rising with rp."),

    P("For an ideal Brayton cycle with rp = 8 and γ = 1.4, what is the approximate thermal efficiency?",
      "44.8%",
      "8^0.2857 ≈ 1.8115; η = 1 − 1/1.8115.",
      "η = 1 − 1/(8^0.2857) = 1 − 1/1.8115 = 1 − 0.5520 = 0.4480 ≈ 44.8%. The exponent 0.2857 = (1.4−1)/1.4."),

    P("For an ideal Brayton cycle with rp = 10 and γ = 1.4, what is the thermal efficiency?",
      "48.2%",
      "10^0.2857 ≈ 1.9307; η = 1 − 1/1.9307.",
      "η = 1 − 1/(10^0.2857) = 1 − 1/1.9307 = 1 − 0.5179 = 0.4821 ≈ 48.2%. Raising rp from 8 to 10 raised η from 44.8% to 48.2%."),

    P("In an open-cycle gas turbine, how does the working fluid path differ from a closed-cycle plant?",
      "In an open cycle, atmospheric air is drawn in, combusted, expanded, and exhausted to the atmosphere; in a closed cycle, the working fluid is recirculated.",
      "Open: no recirculation; closed: sealed loop.",
      "Open-cycle gas turbines draw fresh air from atmosphere, compress it, add heat by combustion, expand through turbine, and exhaust to atmosphere. Closed-cycle plants recirculate the working fluid through a heat exchanger."),

    P("What is a key advantage of a closed-cycle gas turbine over an open-cycle plant?",
      "A closed cycle can use working fluids other than air and can employ a heat exchanger for external heating, potentially achieving higher efficiency.",
      "Closed cycle allows non-air fluids and external heating.",
      "Closed-cycle plants use a sealed working fluid (possibly helium or another gas) heated externally via a heat exchanger. This allows fuel flexibility, higher temperatures, and potentially higher efficiency than open-cycle plants."),

    P("What is the main reason a closed-cycle gas turbine plant is heavier than an open-cycle equivalent?",
      "The closed cycle requires a heat exchanger and pressurized housing for the recirculated working fluid, adding significant weight and complexity.",
      "Heat exchanger and sealed pressure vessel add weight.",
      "Closed-cycle plants need a heat exchanger (instead of direct combustion) to add heat to the sealed working fluid, plus a pressurized vessel to contain it. This makes the plant heavier and more complex than a simple open-cycle arrangement."),

    P("What is the primary purpose of a regenerator (recuperator) in a gas turbine cycle?",
      "To recover heat from turbine exhaust and use it to preheat the compressed air before it enters the combustion chamber, thereby improving efficiency.",
      "Regenerator preheats air using exhaust heat.",
      "A regenerator (recuperator) is a heat exchanger that transfers heat from the hot turbine exhaust to the cooler compressed air leaving the compressor. This reduces the fuel needed in the combustion chamber and raises overall cycle efficiency."),

    P("At which pressure ratios is a regenerator most beneficial in a gas turbine cycle?",
      "At low pressure ratios, because the turbine exhaust temperature is higher relative to compressor outlet temperature at low rp.",
      "Regeneration best at low rp.",
      "At low pressure ratios, the turbine exit temperature is well above the compressor exit temperature, so there is a large temperature difference available for heat recovery. At high rp, the compressor exit temperature approaches the turbine exit temperature, diminishing the regenerator benefit."),

    P("What is the effect of intercooling between compressor stages in a gas turbine?",
      "Intercooling reduces the total compressor work input by cooling the air toward the inlet temperature before further compression.",
      "Intercooling → less compressor work.",
      "Intercooling between compressor stages cools the air toward the inlet temperature before further compression. Since compressor work equals cp(T2−T1), reducing the average temperature of compression lowers the total work input."),

    P("What is the effect of reheating between turbine stages in a gas turbine cycle?",
      "Reheating increases the total turbine work output by expanding the gas at higher average temperatures.",
      "Reheating → more turbine work.",
      "Reheating between turbine stages re-heats the gas before further expansion, increasing the average temperature of expansion and thus the total turbine work output. Combined with intercooling, it can increase net work significantly."),

    P("When both regeneration and intercooling with reheating are used together, what happens to cycle efficiency?",
      "Regeneration combined with intercooling and reheating can raise cycle efficiency to values close to or exceeding that of a higher rp simple cycle.",
      "Regen + intercool + reheat → higher η.",
      "Intercooling reduces compressor work and reheating increases turbine work, both raising net work. When combined with regeneration, the cooler compressor exit (from intercooling) allows more heat recovery, and the net effect is significantly improved efficiency."),

    P("In which cycle arrangement is regeneration most effective in improving efficiency?",
      "Regeneration is most effective when combined with intercooling and reheating at moderate pressure ratios.",
      "Best with intercooling + reheating at moderate rp.",
      "When intercooling reduces compressor discharge temperature and reheating raises turbine exhaust temperature, the temperature difference available for regeneration increases. This combination at moderate pressure ratios yields the greatest efficiency improvement."),

    P("The optimum pressure ratio for maximum specific work output in an ideal simple Brayton cycle is given by which formula?",
      "rp_opt = (T3/T1)^(γ/(2(γ−1)))",
      "Maximum work at T3/T1 raised to γ/(2(γ−1)).",
      "For maximum specific work in an ideal simple Brayton cycle, the optimum pressure ratio is rp_opt = (T3/T1)^(γ/(2(γ−1))). This balances compressor work input against turbine work output."),

    P("For an ideal Brayton cycle with T3 = 1200 K, T1 = 300 K, and γ = 1.4, what is the optimum pressure ratio for maximum specific work?",
      "rp_opt ≈ 11.3",
      "rp_opt = (1200/300)^(1.4/(2×0.4)) = 4^1.75.",
      "T3/T1 = 1200/300 = 4. rp_opt = 4^(1.4/0.8) = 4^1.75. 4^1.5 = 8 and 4^0.25 = √(√4) ≈ 1.4142, so rp_opt = 8 × 1.4142 ≈ 11.3."),

    P("If T3/T1 = 5 in an ideal Brayton cycle with γ = 1.4, what is the optimum pressure ratio for maximum specific work?",
      "rp_opt ≈ 16.7",
      "rp_opt = 5^1.75 = 5^1.5 × 5^0.25.",
      "rp_opt = 5^(1.4/0.8) = 5^1.75. 5^1.5 = 5√5 ≈ 11.180 and 5^0.25 = √(√5) ≈ 1.4953, so rp_opt ≈ 11.180 × 1.4953 ≈ 16.7."),

    P("What is the definition of work ratio in a gas turbine cycle?",
      "Work ratio = net work output / turbine work output.",
      "Work ratio = W_net / W_turbine.",
      "Work ratio is defined as the ratio of net work output to the total turbine work output: rw = W_net/W_t = (W_t − W_c)/W_t = 1 − W_c/W_t. A higher work ratio means less of the turbine output is consumed by the compressor."),

    P("How does raising the turbine inlet temperature (TIT) affect the specific work output of a gas turbine cycle?",
      "Raising TIT increases the specific work output and also shifts the optimum pressure ratio to a higher value.",
      "Higher TIT → more specific work and higher optimal rp.",
      "Increasing TIT raises the turbine work more than the compressor work (which is unchanged for fixed T1 and rp), so net specific work increases. The optimum pressure ratio also shifts upward: rp_opt = (T3/T1)^(γ/(2(γ−1))), so a higher T3 means a higher rp_opt."),

    P("What is the specific work output of a gas turbine cycle defined as?",
      "Specific work output is the net work produced per unit mass of working fluid, expressed in kJ/kg.",
      "Specific work = net work per unit mass.",
      "Specific work output is the net work output divided by the mass flow rate of the working fluid. It is expressed in kJ/kg and represents how much useful work each kilogram of air (or gas) produces."),

    P("What is the optimum pressure ratio for maximum specific work when T3 = 1000 K and T1 = 300 K with γ = 1.4?",
      "rp_opt ≈ 8.2",
      "rp_opt = (1000/300)^1.75 = 3.333^1.75.",
      "T3/T1 = 1000/300 = 3.333. rp_opt = 3.333^(1.4/0.8) = 3.333^1.75. ln(3.333) = 1.2040, so 1.75 × 1.2040 = 2.1070 and e^2.1070 ≈ 8.2. Therefore rp_opt ≈ 8.2."),

    P("In a gas turbine, which type of compressor is more rugged and has fewer stages but slightly lower efficiency?",
      "Centrifugal compressor.",
      "Centrifugal: rugged, few stages, compact.",
      "Centrifugal compressors are more rugged, simpler, and can achieve high pressure ratios per stage (up to about 4:1), but they have slightly lower isentropic efficiency and a larger frontal area compared to axial-flow compressors."),

    P("Which type of compressor is preferred in large gas turbines due to high isentropic efficiency and ability to handle high mass flow rates?",
      "Axial-flow compressor.",
      "Axial: high η, many stages, high mass flow.",
      "Axial-flow compressors offer higher isentropic efficiency (85–90%) and can handle large mass flow rates with low frontal area. They use many stages, each with a modest pressure ratio, making them ideal for large gas turbines."),

    P("What is the typical temperature rise across a gas turbine combustion chamber?",
      "Approximately 300 to 450 K.",
      "Combustion chamber: ΔT ≈ 300–450 K.",
      "The combustion chamber in a gas turbine typically raises the air temperature by about 300 to 450 K. The air temperature rises from the compressor outlet temperature (around 600–800 K) to the turbine inlet temperature (around 1100–1400 K)."),

    P("Which of the following is NOT a requirement of a gas turbine combustion chamber?",
      "Maximum pressure recovery (zero pressure loss).",
      "Zero pressure loss is impossible; some loss is acceptable.",
      "A good combustion chamber must provide stable combustion, uniform exit temperature distribution, low pressure loss (not zero), good ignition, and high combustion efficiency. Zero pressure loss is physically impossible."),

    P("What is the purpose of the recirculation zone in a gas turbine combustion chamber?",
      "To stabilize the flame by recirculating hot combustion products back to the incoming fresh air-fuel mixture.",
      "Recirculation zone stabilizes flame.",
      "The recirculation zone behind the swirler or bluff body creates a region of hot combustion products that continuously ignites the incoming fresh air-fuel mixture, ensuring flame stability over a wide range of operating conditions."),

    P("What are dilution holes in a gas turbine combustion chamber used for?",
      "To mix cold bypass air with hot combustion gases to achieve a uniform temperature distribution at the combustor exit.",
      "Dilution holes → uniform exit temperature.",
      "Dilution holes allow cooler bypass air to mix with the hot combustion gases in the latter part of the flame tube. This reduces the peak temperature and creates a more uniform temperature profile before the gas enters the turbine, preventing hot spots on blades."),

    P("Which blade cooling method involves passing coolant air through internal passages within the turbine blade?",
      "Internal (convection) blade cooling.",
      "Internal cooling: air through blade passages.",
      "Internal or convection cooling involves routing compressor bleed air through serpentine passages inside the turbine blade. The air absorbs heat from the blade material by convection. This is one of the most common blade cooling methods in modern gas turbines."),

    P("In a gas turbine cycle with regeneration, where is the regenerator placed?",
      "Between the compressor outlet and the combustion chamber inlet, using exhaust gas from the turbine outlet as the heat source.",
      "Regenerator: compressor outlet → combustion chamber inlet.",
      "The regenerator is placed so that the hot turbine exhaust gas heats the cooler compressed air before it enters the combustion chamber. The compressed air flows through one side of the heat exchanger and the exhaust gas through the other."),

    P("What is the typical isentropic efficiency range for a modern gas turbine compressor?",
      "80% to 90%.",
      "Compressor ηc ≈ 80–90%.",
      "Modern axial-flow compressors achieve isentropic efficiencies in the range of 80% to 90%. Centrifugal compressors may be slightly lower. The actual work input exceeds the ideal isentropic work by a factor of 1/ηc."),

    P("What is the typical isentropic efficiency range for a modern gas turbine expansion turbine?",
      "85% to 92%.",
      "Turbine ηt ≈ 85–92%.",
      "Modern gas turbine expansion turbines achieve isentropic efficiencies of 85% to 92%. The actual work output is less than the ideal isentropic work by the factor ηt. Friction, tip clearance losses, and secondary flows cause the deviation."),

    P("How does a finite compressor isentropic efficiency (ηc < 1) affect the net work and thermal efficiency of a gas turbine cycle?",
      "It increases the compressor work input, thereby reducing both the net work output and the thermal efficiency.",
      "Lower ηc → more W_c → less W_net and lower η.",
      "With ηc < 1, the actual compressor work is W_c = cp(T2a−T1) = cp(T2s−T1)/ηc, which is greater than the ideal work. This increases the work consumed by the compressor, reducing net work (W_net = W_t − W_c) and overall efficiency."),

    P("How does a finite turbine isentropic efficiency (ηt < 1) affect the net work output?",
      "It decreases the turbine work output, thereby reducing the net work output.",
      "Lower ηt → less W_t → less W_net.",
      "With ηt < 1, the actual turbine work is W_t = ηt × cp(T3−T4s), which is less than the ideal isentropic work. This reduces the turbine output and consequently the net work (W_net = W_t − W_c) of the cycle."),

    P("What is the back-work ratio (BWR) of a gas turbine cycle?",
      "Back-work ratio = compressor work / turbine work = W_c / W_t.",
      "BWR = W_c / W_t; typically 40–60%.",
      "Back-work ratio is the fraction of turbine work consumed by the compressor: BWR = W_c/W_t. In gas turbines, BWR is typically 40% to 60%, meaning a large portion of turbine output goes to drive the compressor, leaving less for useful output."),

    P("For a gas turbine with W_c = 281.4 kJ/kg and W_t = 421.9 kJ/kg, what is the back-work ratio?",
      "66.7%",
      "BWR = 281.4 / 421.9 = 0.667.",
      "BWR = W_c/W_t = 281.4/421.9 = 0.667 = 66.7%. This means 66.7% of the turbine work is used to drive the compressor, leaving only 33.3% as net work output."),

    P("What is the typical thermal efficiency range of a simple open-cycle gas turbine?",
      "Approximately 20% to 35%.",
      "Simple cycle η ≈ 20–35%.",
      "A simple open-cycle gas turbine typically achieves thermal efficiencies in the range of 20% to 35%, depending on pressure ratio, TIT, and component efficiencies. Modern machines with high TIT and advanced compressor designs achieve the higher end."),

    P("If a gas turbine has turbine work Wt = 350 kJ/kg and compressor work Wc = 180 kJ/kg, what is the back-work ratio?",
      "51.4%",
      "BWR = Wc/Wt = 180/350.",
      "Back-work ratio = Wc/Wt = 180/350 = 0.5143 ≈ 51.4%. This means about 51.4% of the turbine output is consumed by the compressor."),

    P("For a gas turbine cycle, T1 = 300 K, T2a = 590 K (actual compressor exit), T3 = 1200 K, T4a = 740 K (actual turbine exit), and cp = 1.005 kJ/kg·K. What is the thermal efficiency?",
      "27.9%",
      "η = W_net/Q_in = (Wt−Wc)/(cp(T3−T2a)).",
      "Wc = 1.005(590−300) = 291.5 kJ/kg. Wt = 1.005(1200−740) = 462.3 kJ/kg. Q_in = 1.005(1200−590) = 613.1 kJ/kg. W_net = 462.3−291.5 = 170.8 kJ/kg. η = 170.8/613.1 = 0.2786 ≈ 27.9%. Actual efficiency is lower than the ideal value due to component irreversibilities."),

    P("Which of the following is a key advantage of combined-cycle gas turbine (CCGT) power plants over simple-cycle plants?",
      "CCGT plants utilize the waste heat from the gas turbine to generate additional power through a steam turbine, achieving a much higher overall efficiency.",
      "CCGT: waste heat recovery via steam cycle.",
      "In a CCGT plant, the hot exhaust from the gas turbine passes through a Heat Recovery Steam Generator (HRSG) to produce steam, which drives a steam turbine. This bottoming cycle captures waste heat that would otherwise be lost, pushing overall efficiency to 50–60%."),

    P("What is an HRSG in a combined-cycle power plant?",
      "Heat Recovery Steam Generator — a heat exchanger that uses gas turbine exhaust to produce steam for a steam turbine.",
      "HRSG produces steam from gas turbine exhaust.",
      "The HRSG (Heat Recovery Steam Generator) is a large heat exchanger that captures thermal energy from the gas turbine exhaust gases and uses it to generate steam. This steam then drives a steam turbine in the bottoming cycle, producing additional electrical power."),

    P("Why is the efficiency of a combined-cycle plant higher than either the gas turbine cycle or the steam cycle alone?",
      "Because the combined cycle utilizes energy that would be wasted in the simple gas turbine exhaust, adding the steam bottoming cycle to capture it.",
      "Combined: gas turbine top + steam bottom → less waste.",
      "A gas turbine alone wastes significant energy in its hot exhaust (typically 500–600°C). A steam cycle alone is limited by its heat source temperature. Combining them allows the high-temperature gas turbine to operate efficiently while the steam cycle captures the waste heat, yielding a combined efficiency greater than either alone."),

    P("What is cogeneration in the context of gas turbine plants?",
      "Cogeneration is the simultaneous production of useful electrical power and process heat from the same fuel input.",
      "Cogeneration: power + useful heat together.",
      "Cogeneration (combined heat and power, CHP) uses gas turbine exhaust heat for industrial heating, district heating, or other thermal needs instead of (or in addition to) generating steam for a power cycle. This can raise overall fuel utilization to 70–80%."),

    P("What is the approximate thermal efficiency of a combined-cycle gas turbine (CCGT) power plant?",
      "50% to 60%.",
      "Combined cycle η ≈ 50–60%.",
      "Combined-cycle plants use the gas turbine exhaust to generate steam via an HRSG, then drive a steam turbine. Modern CCGT plants achieve thermal efficiencies of 50% to 60%, significantly higher than either the gas or steam cycle alone."),

    P("In a combined-cycle power plant, which cycle is the topping cycle and which is the bottoming cycle?",
      "The gas turbine cycle is the topping cycle and the steam cycle is the bottoming cycle.",
      "Gas turbine on top, steam on bottom.",
      "In a combined-cycle plant, the high-temperature gas turbine cycle operates first (topping) and rejects heat to the HRSG, which generates steam for the steam turbine cycle (bottoming). The bottoming cycle thus extracts additional work from the exhaust energy of the topping cycle."),

    P("Statement: Modern combined-cycle power plants can achieve thermal efficiencies as high as about 60%. Is this statement true or false?",
      "True.",
      "CCGT up to ~60% efficiency.",
      "Modern CCGT plants with advanced gas turbines, high TIT, single- and multi-pressure HRSGs, and efficient steam turbines achieve thermal efficiencies of about 55% to 60%. This is much higher than a simple-cycle gas turbine (20–35%) or a steam power plant alone."),

    P("What is the thermal efficiency of a combined-cycle plant where the gas turbine has η_GT = 35% and the steam turbine bottoming cycle has η_ST = 25%, and 40% of the gas turbine fuel energy is available to the steam cycle?",
      "Combined efficiency = 35% + (0.25 × 40%) = 45%",
      "η_combined = η_GT + η_ST × fraction_recovered.",
      "The gas turbine converts 35% of fuel energy to work. If 40% of the total fuel energy is available to the steam cycle and the steam cycle converts 25% of that into work, the steam contribution is 0.25 × 40% = 10%. Total η_combined = 35% + 10% = 45%. Modern plants with better heat recovery achieve 50–60%."),

    P("Which type of aircraft engine provides thrust by accelerating a large mass of air through a fan at relatively low velocity?",
      "Turbofan engine.",
      "Turbofan: high bypass, low jet velocity, efficient.",
      "A turbofan engine uses a large fan to accelerate a bypass stream of air around the core. The high bypass ratio means a large mass of air is accelerated to a relatively low velocity, giving high propulsive efficiency and low specific fuel consumption at subsonic speeds."),

    P("What is the bypass ratio of a turbofan engine?",
      "Bypass ratio = mass of air bypassing the core / mass of air through the core.",
      "BPR = m_bypass / m_core.",
      "Bypass ratio is defined as the ratio of the mass flow rate of air that bypasses the engine core (goes around it through the fan duct) to the mass flow rate of air that passes through the core (compressor, combustor, turbine). High BPR engines are quieter and more fuel efficient."),

    P("Which propulsion device operates without any compressor or turbine and relies solely on ram compression?",
      "Ramjet.",
      "Ramjet: no rotating parts, ram compression only.",
      "A ramjet has no compressor or turbine. Air is compressed entirely by the ram effect as the aircraft moves at high speed. Fuel is burned in the compressed air, and the hot gases expand through a nozzle to produce thrust. It operates efficiently at Mach 2 to 5."),

    P("At what speed range does a ramjet operate most efficiently?",
      "Mach 2 to Mach 5.",
      "Ramjet effective at supersonic speeds.",
      "Ramjets require high forward speeds to generate sufficient ram pressure for compression. They become effective around Mach 2 and can operate up to about Mach 5. Below Mach 2, the ram compression is insufficient for efficient operation."),

    P("What is the key difference between a ramjet and a scramjet?",
      "In a ramjet, air is decelerated to subsonic speed before combustion; in a scramjet, combustion occurs with supersonic airflow.",
      "Scramjet: supersonic combustion.",
      "A scramjet (supersonic combustion ramjet) maintains supersonic flow throughout the engine, including the combustion chamber. This avoids the large temperature rise and losses associated with decelerating to subsonic speeds, enabling operation at hypersonic speeds (Mach 5+)."),

    P("Which aircraft engine type uses a propeller driven by a gas turbine for efficient propulsion at low to moderate flight speeds?",
      "Turboprop engine.",
      "Turboprop: turbine drives propeller, efficient at low speed.",
      "A turboprop engine uses a gas turbine to drive a propeller through a reduction gearbox. The propeller accelerates a large mass of air at low velocity, giving high propulsive efficiency at low to moderate flight speeds (up to about Mach 0.6–0.7)."),

    P("What is an afterburner in a turbojet engine?",
      "A device that burns additional fuel in the exhaust stream to increase jet velocity and thrust, at the cost of high specific fuel consumption.",
      "Afterburner: fuel in exhaust for extra thrust.",
      "An afterburner injects and burns additional fuel in the hot exhaust gases downstream of the turbine. This dramatically increases the jet velocity and thrust, but at very high fuel consumption rates. Afterburners are used for takeoff, climb, and combat maneuvers."),

    P("What is the main disadvantage of using an afterburner?",
      "Very high specific fuel consumption (SFC), significantly reducing range and endurance.",
      "Afterburner: high SFC, poor fuel economy.",
      "While an afterburner provides a substantial thrust boost (up to 50% or more), it does so at extremely high specific fuel consumption because the additional fuel is burned at a relatively low efficiency. This severely reduces range and endurance."),

    P("What is the general thrust equation for a jet engine?",
      "F = ṁ(Vj − Va) + (Pj − Pa)Aj.",
      "Thrust = momentum thrust + pressure thrust.",
      "The thrust of a jet engine has two components: the momentum thrust ṁ(Vj−Va) from the change in velocity of the air, and the pressure thrust (Pj−Pa)Aj from the difference between nozzle exit pressure and ambient pressure. For a properly expanded nozzle, Pj = Pa and only the momentum thrust remains."),

    P("What is specific fuel consumption (SFC) in the context of jet engines?",
      "SFC = fuel mass flow rate / thrust = ṁf / F, typically in kg/(N·s) or kg/(N·h).",
      "SFC measures fuel per unit thrust.",
      "Specific fuel consumption is the mass flow rate of fuel divided by the thrust produced. Lower SFC indicates better fuel efficiency. It is commonly expressed in kg/(N·h) or lb/(lbf·h). High bypass turbofans have the lowest SFC among air-breathing engines."),

    P("How does a turbojet differ from a turbofan in terms of specific fuel consumption at subsonic cruise?",
      "A turbofan has significantly lower SFC than a turbojet at subsonic cruise due to higher propulsive efficiency from the bypass air stream.",
      "Turbofan SFC < turbojet SFC at subsonic speeds.",
      "At subsonic cruise, a high-bypass turbofan accelerates a large mass of air to a small velocity increment, achieving a higher propulsive efficiency (60–80%) compared to a turbojet (30–40%). This results in a significantly lower specific fuel consumption for the turbofan."),

    P("Why does propulsive efficiency approach 100% as jet velocity approaches flight velocity?",
      "Because ηp = 2Va/(Vj+Va) → 2Va/(Va+Va) = 1 as Vj → Va, but net thrust simultaneously approaches zero.",
      "High ηp but near-zero thrust as Vj → Va.",
      "As Vj approaches Va, the propulsive efficiency formula ηp = 2Va/(Vj+Va) approaches 1. However, the thrust F = ṁ(Vj−Va) also approaches zero. So while efficiency is theoretically 100%, there is no useful thrust. Practical design balances efficiency against required thrust."),

    P("How do rockets differ from air-breathing engines like turbojets in terms of oxidizer supply?",
      "Rockets carry both fuel and oxidizer onboard, while air-breathing engines use atmospheric oxygen.",
      "Rockets: self-contained oxidizer; air-breathers: atmospheric O2.",
      "Rockets must carry both fuel and oxidizer since they operate outside the atmosphere or independently of it. Air-breathing engines (turbojets, turbofans, ramjets) draw oxygen from the atmosphere, making them lighter and more fuel-efficient within the atmosphere."),

    P("What is the purpose of a diffuser ahead of a ramjet combustion chamber?",
      "To decelerate the incoming supersonic air to subsonic speed and convert kinetic energy to pressure energy for efficient combustion.",
      "Diffuser: decelerate air, recover pressure.",
      "A diffuser in a ramjet slows the incoming supersonic air to subsonic speeds before combustion. This conversion of kinetic energy to pressure (ram recovery) increases the static pressure and temperature of the air, enabling stable and efficient combustion."),

    P("What is the propulsive efficiency of a turbojet when the flight velocity Va = 250 m/s and the jet velocity Vj = 500 m/s?",
      "66.7%",
      "ηp = 2Va/(Vj+Va) = 500/750.",
      "Propulsive efficiency ηp = 2Va/(Vj+Va) = 2×250/(500+250) = 500/750 = 0.667 = 66.7%. This represents the fraction of kinetic energy in the jet that is usefully converted to propulsive work."),

    P("A turbojet has Va = 300 m/s and Vj = 700 m/s. What is the propulsive efficiency?",
      "60%",
      "ηp = 2×300/(700+300) = 600/1000.",
      "ηp = 2Va/(Vj+Va) = 2×300/(700+300) = 600/1000 = 0.60 = 60%. The propulsive efficiency is the fraction of the jet kinetic energy converted to useful propulsive work."),

    P("For a jet engine with mass flow rate 45 kg/s, flight velocity 250 m/s, jet velocity 550 m/s, and ambient and exit pressures equal, what is the thrust?",
      "13,500 N",
      "F = ṁ(Vj−Va) when Pj = Pa.",
      "Since Pj = Pa, the pressure thrust term is zero. F = ṁ(Vj−Va) = 45 × (550−250) = 45 × 300 = 13,500 N = 13.5 kN."),

    P("For a jet engine with ṁ = 40 kg/s, Va = 280 m/s, Vj = 580 m/s, Pj = 105 kPa, Pa = 100 kPa, and exit area Aj = 0.15 m², what is the total thrust?",
      "12,750 N",
      "F = ṁ(Vj−Va) + (Pj−Pa)Aj.",
      "Momentum thrust = 40 × (580−280) = 40 × 300 = 12,000 N. Pressure thrust = (105000−100000) × 0.15 = 5000 × 0.15 = 750 N. Total F = 12,000 + 750 = 12,750 N."),

    P("What is the net specific work of an ideal Brayton cycle with T1 = 300 K, T3 = 1200 K, rp = 10, γ = 1.4, and cp = 1.005 kJ/kg·K?",
      "Net specific work ≈ 300.8 kJ/kg.",
      "W_net = cp(T3−T4) − cp(T2−T1).",
      "T2 = 300 × 10^0.2857 = 300 × 1.9307 = 579.2 K. T4 = 1200/1.9307 = 621.5 K. W_c = 1.005(579.2−300) = 280.6 kJ/kg. W_t = 1.005(1200−621.5) = 581.4 kJ/kg. W_net = 581.4 − 280.6 = 300.8 kJ/kg."),

    P("What is the net specific work of an ideal Brayton cycle with T1 = 300 K, T3 = 900 K, rp = 6, γ = 1.4, and cp = 1.005 kJ/kg·K?",
      "Net specific work ≈ 160.8 kJ/kg.",
      "T2 = 300×6^0.2857 = 500.6 K; T4 = 900/1.6685 = 539.4 K.",
      "T2 = 300 × 1.6685 = 500.6 K. T4 = 900/1.6685 = 539.4 K. W_c = 1.005(500.6−300) = 201.6 kJ/kg. W_t = 1.005(900−539.4) = 362.4 kJ/kg. W_net = 362.4 − 201.6 = 160.8 kJ/kg."),

    P("A gas turbine operates with T1 = 288 K, pressure ratio = 12, T3 = 1200 K, γ = 1.4, and cp = 1.005 kJ/kg·K. What is the ideal net specific work output?",
      "Net specific work ≈ 313.9 kJ/kg",
      "Find T2 and T4 using isentropic relations, then compute W_net.",
      "T2 = 288 × 12^0.2857 = 288 × 2.0337 = 585.7 K. T4 = 1200/2.0337 = 590.0 K. W_c = 1.005(585.7−288) = 299.2 kJ/kg. W_t = 1.005(1200−590.0) = 613.1 kJ/kg. W_net = 613.1 − 299.2 = 313.9 kJ/kg."),

    P("In an ideal Brayton cycle, if T1 = 300 K, T2 = 560 K, T3 = 1100 K, and cp = 1.005 kJ/kg·K, what is the work ratio?",
      "49.1%",
      "rw = 1 − Wc/Wt = 1 − (T2−T1)/(T3−T4); find T4 from the isentropic relation.",
      "Wc = cp(T2−T1) = 1.005(560−300) = 261.3 kJ/kg. For the ideal cycle T4 = T3×(T1/T2) = 1100×(300/560) = 589.3 K. Wt = cp(T3−T4) = 1.005(1100−589.3) = 513.3 kJ/kg. rw = 1 − 261.3/513.3 = 1 − 0.509 = 0.491 ≈ 49.1%."),

    P("In an ideal Brayton cycle with T1 = 290 K, T3 = 1000 K, and rp = 7, what is the thermal efficiency? (γ = 1.4)",
      "42.5%",
      "η = 1 − 1/7^0.2857; 7^0.2857 ≈ 1.7436.",
      "η = 1 − 1/7^0.2857 = 1 − 1/1.7436 = 1 − 0.5735 = 0.4265 ≈ 42.5%. Efficiency depends only on rp for the ideal cycle."),

    P("For an afterburner operating on a turbojet with ṁ = 38 kg/s and Vj increasing from 520 m/s to 720 m/s, what is the additional thrust produced?",
      "7,600 N",
      "ΔF = ṁ × ΔVj = 38 × (720−520).",
      "Additional thrust from the afterburner = ṁ(Vj_new−Vj_old) = 38 × (720−520) = 38 × 200 = 7,600 N = 7.6 kN. This thrust boost comes at the expense of much higher fuel consumption."),

    P("If a gas turbine has Wc = 250 kJ/kg, Wt = 400 kJ/kg, and Q_in = 480 kJ/kg, what are the back-work ratio and thermal efficiency?",
      "BWR = 62.5% and η = 31.3%",
      "BWR = Wc/Wt; η = (Wt−Wc)/Q_in.",
      "BWR = Wc/Wt = 250/400 = 0.625 = 62.5%. Net work = Wt−Wc = 400−250 = 150 kJ/kg. η = W_net/Q_in = 150/480 = 0.3125 = 31.3%. The high BWR indicates a large fraction of the turbine work goes to the compressor."),

    P("For an ideal Brayton cycle with rp = 5 and γ = 1.4, what is the thermal efficiency?",
      "36.9%",
      "5^0.2857 ≈ 1.5836; η = 1 − 1/1.5836.",
      "η = 1 − 1/(5^0.2857) = 1 − 1/1.5836 = 1 − 0.6315 = 0.3685 ≈ 36.9%. Lower pressure ratios give lower ideal efficiencies."),

    P("If the propulsive efficiency of a jet engine is ηp = 2Va/(Vj+Va) and Vj = 500 m/s with ηp = 66.7%, what is the flight velocity Va?",
      "Va = 250 m/s",
      "2Va/(Va+500) = 0.667 → 2Va = 0.667Va + 333.3.",
      "2Va = 0.667(Va + 500) = 0.667Va + 333.3. So 1.333Va = 333.3 and Va = 250 m/s. This is the reverse of the standard ηp = 2×250/750 = 66.7% example."),

    P("For an ideal Brayton cycle with T1 = 300 K, pressure ratio 6, and γ = 1.4, what is the compressor outlet temperature T2?",
      "T2 ≈ 500.6 K",
      "T2 = T1 × rp^((γ−1)/γ) = 300 × 6^0.2857.",
      "T2 = T1×rp^((γ−1)/γ) = 300 × 6^0.2857 = 300 × 1.6685 = 500.6 K. This is the ideal isentropic discharge temperature of the compressor."),

    P("A combined-cycle plant has a gas turbine of 38% efficiency and a steam bottoming cycle of 27% efficiency. If 45% of the gas turbine fuel energy is available to the steam cycle, what is the plant efficiency?",
      "Combined efficiency ≈ 50.2%",
      "η = η_GT + η_ST × fraction_to_steam = 38% + 0.27 × 45%.",
      "Gas turbine contribution = 38%. Steam cycle contribution = 0.27 × 45% = 12.15%. Total η_combined = 38% + 12.15% = 50.15% ≈ 50.2%. This illustrates why combined cycles exceed the efficiency of either plant alone."),

    P("What is the optimum pressure ratio for maximum specific work when T3/T1 = 6 and γ = 1.4?",
      "rp_opt ≈ 23.0",
      "rp_opt = 6^1.75 = 6^1.5 × 6^0.25.",
      "rp_opt = 6^(1.4/0.8) = 6^1.75. 6^1.5 = 6√6 ≈ 14.697 and 6^0.25 = √(√6) ≈ 1.5651, so rp_opt ≈ 14.697 × 1.5651 ≈ 23.0. A higher T3/T1 ratio pushes the optimum pressure ratio upward."),

    P("For a turbojet with ṁ = 50 kg/s, Va = 240 m/s, Vj = 560 m/s, and Pj = Pa, what is the thrust?",
      "16,000 N",
      "F = ṁ(Vj−Va) = 50 × (560−240).",
      "Since Pj = Pa, only the momentum thrust remains: F = ṁ(Vj−Va) = 50 × (560−240) = 50 × 320 = 16,000 N = 16 kN.")
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC5_GASTURB;
  if (typeof window !== "undefined") window.SSC_JE_ENC5_GASTURB = SSC_JE_ENC5_GASTURB;
})();
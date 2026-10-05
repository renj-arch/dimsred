(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC5_NUCLEAR = {};
  SSC_JE_ENC5_NUCLEAR.nuclear = [

    P("What is nuclear fission?",
      "Nuclear fission is the splitting of a heavy atomic nucleus such as uranium-235 into two lighter fragments, releasing a large amount of energy (about 200 MeV per fission event) along with free neutrons and gamma radiation.",
      "Heavy nucleus splits into lighter fragments",
      "When a heavy nucleus like U-235 absorbs a neutron, it becomes unstable and splits into two medium-mass fission fragments, typically releasing 2 to 3 neutrons and approximately 200 MeV of energy. Most of this energy appears as kinetic energy of the fission fragments, which is converted to heat through collisions with surrounding atoms. The released neutrons can trigger further fissions, enabling a self-sustaining chain reaction."),

    P("What is the approximate energy released per fission of a uranium-235 nucleus?",
      "Approximately 200 MeV (million electron volts), which is equivalent to about 3.2 times 10 to the power minus 11 joules, is released per fission of a uranium-235 nucleus.",
      "About 200 MeV per fission event",
      "Each fission event in U-235 releases about 200 MeV of energy distributed among fission fragment kinetic energy (~165 MeV), neutron kinetic energy (~5 MeV), prompt gamma rays (~7 MeV), and energy from fission product decay (~23 MeV). Since 1 MeV = 1.602 times 10 to the power minus 13 J, the energy per fission = 200 times 1.602 times 10 to the power minus 13 = 3.204 times 10 to the power minus 11 J. This energy is ultimately converted to heat in the reactor fuel."),

    P("Which materials are classified as fissile in nuclear reactor physics?",
      "Uranium-235, plutonium-239, and uranium-233 are classified as fissile materials because they can sustain a chain reaction by fissioning with thermal (slow) neutrons.",
      "U-235, Pu-239, U-233 are fissile",
      "Fissile nuclei have a high probability of undergoing fission when they absorb a thermal neutron. U-235 occurs naturally (0.7% of natural uranium), Pu-239 is bred from U-238 in reactors, and U-233 is bred from Th-232. By contrast, U-238 and Th-232 are fertile — they do not readily fission with thermal neutrons but can be converted to fissile isotopes through neutron absorption and subsequent beta decay."),

    P("Why must neutrons be slowed down (thermalised) in a uranium-fuelled reactor?",
      "Neutrons must be slowed to thermal energies (about 0.025 eV) because the fission probability (cross-section) of U-235 is much higher for slow neutrons than for fast neutrons (~2 MeV), making a sustained chain reaction feasible.",
      "Slow neutrons have much higher fission cross-section for U-235",
      "Neutrons born from fission are fast (~2 MeV), but the fission cross-section of U-235 for fast neutrons is only about 1 to 2 barns. At thermal energies (~0.025 eV), it rises to roughly 585 barns, a factor of several hundred. A moderator such as graphite, heavy water, or light water slows neutrons through elastic collisions with light nuclei, dramatically increasing the chance that neutrons will cause further fissions and sustain the chain reaction."),

    P("What is meant by critical mass in the context of nuclear reactors?",
      "Critical mass is the minimum quantity of fissile material needed for a self-sustaining chain reaction, where neutron production equals neutron losses through absorption and leakage.",
      "Minimum mass for chain reaction where neutrons produced = neutrons lost",
      "Below critical mass, too many neutrons escape the fissile material surface and the chain reaction dies out. At critical mass, enough neutrons are retained to sustain fission. In an operating reactor, criticality is achieved with a mass far below the bare critical mass thanks to moderators which increase fission probability, reflectors which reduce leakage, and fuel geometry. The neutron multiplication factor k-effective describes this: k = 1 means critical, k less than 1 means subcritical, k greater than 1 means supercritical."),

    P("What energy equivalence exists between 1 kg of uranium-235 and coal?",
      "The complete fission of 1 kg of uranium-235 releases approximately 8.2 times 10 to the power 13 joules, which is roughly equivalent to burning about 3000 tonnes of coal (precisely about 2830 tonnes at 29 MJ/kg).",
      "1 kg U-235 yields about 8.2 times 10 to the power 13 J, equal to roughly 3000 tonnes of coal",
      "Atoms in 1 kg U-235 = (1000/235) times 6.022 times 10 to the power 23 = 2.56 times 10 to the power 24. Energy = 2.56 times 10 to the power 24 times 200 MeV times 1.602 times 10 to the power minus 13 J/MeV = 8.2 times 10 to the power 13 J. Coal energy content is about 29 MJ/kg = 29 times 10 to the power 6 J/kg. Equivalent coal = 8.2 times 10 to the power 13 / 29 times 10 to the power 6 = 2.83 times 10 to the power 6 kg which is about 2830 tonnes. This demonstrates the extraordinary energy density of nuclear fuel compared to chemical fuels."),

    P("What is the fundamental difference between nuclear fission and nuclear fusion?",
      "Nuclear fission splits heavy nuclei such as U-235 into lighter fragments releasing energy, while nuclear fusion combines light nuclei such as deuterium and tritium into a heavier nucleus, also releasing energy.",
      "Fission = splitting heavy nuclei; fusion = joining light nuclei",
      "Fission involves bombarding heavy nuclei (U-235, Pu-239) with neutrons to split them, releasing about 200 MeV per event. Fusion requires bringing light nuclei (hydrogen isotopes) together at extreme temperatures around 100 million degrees Celsius to overcome electrostatic repulsion, releasing about 17.6 MeV per D-T fusion event. Fusion powers the Sun and hydrogen bombs, while fission powers all current nuclear reactors. Fusion reactors remain experimental due to the extreme conditions required for sustained plasma containment."),

    P("Which of the following is a fertile material used in nuclear reactors?",
      "Uranium-238 is a fertile material that, upon absorbing a neutron, eventually transmutes into plutonium-239, which is fissile and can sustain a chain reaction.",
      "U-238 and Th-232 are fertile, not fissile; they absorb neutrons and become fissile",
      "Fertile materials cannot sustain a chain reaction with thermal neutrons but can be converted into fissile materials. U-238 absorbs a neutron to become U-239, which beta-decays to Np-239 and then to Pu-239 with half-lives of 23.5 minutes and 2.4 days respectively. Th-232 similarly absorbs a neutron and decays to U-233 which is fissile. This conversion process is the basis of breeder reactor technology, potentially extending uranium resources by a factor of 60."),

    P("What is the primary purpose of a moderator in a nuclear reactor?",
      "The primary purpose of a moderator is to slow down (thermalise) fast neutrons produced by fission to thermal energies, greatly increasing the probability of fission in U-235 and enabling a sustained chain reaction.",
      "Moderator slows fast neutrons to thermal energies for U-235 fission",
      "Neutrons born from fission have kinetic energies around 2 MeV, but U-235 fission cross-section is much higher at thermal energies around 0.025 eV. A moderator such as graphite, heavy water, or light water slows neutrons through repeated elastic collisions with light nuclei. The moderator must have a low neutron absorption cross-section to avoid wasting neutrons. Common moderators include light water (H2O), heavy water (D2O), and graphite (carbon)."),

    P("Which of the following is NOT used as a moderator in commercial nuclear reactors?",
      "Lead is not used as a moderator in commercial nuclear reactors because it does not effectively slow down neutrons and has a relatively high neutron absorption cross-section compared to graphite or heavy water.",
      "Lead is not a moderator; graphite, D2O, and H2O are common moderators",
      "Effective moderators must scatter neutrons efficiently, and a low atomic mass helps with that, while absorbing very few. Light water, heavy water, and graphite meet these criteria. Lead is heavy with atomic mass about 207, so it does not slow neutrons efficiently through elastic collisions because a light nucleus is needed for effective energy transfer. While lead has been used as a coolant in some reactor designs such as Soviet fast reactors, it is never used as a moderator."),

    P("Which elements are commonly used as neutron absorbers in nuclear reactor control rods?",
      "Boron (as boron carbide, B4C) and cadmium are commonly used in control rods because they have very high neutron absorption cross-sections, allowing effective control of reactor reactivity.",
      "Boron and cadmium absorb neutrons strongly, controlling reactivity",
      "Control rods contain materials with high thermal neutron absorption cross-sections: boron-10 has about 3840 barns, cadmium has about 2450 barns, and hafnium has about 105 barns. Inserting control rods into the core absorbs neutrons, reducing the multiplication factor (k-effective) and decreasing reactor power. Withdrawing them increases reactivity. In an emergency SCRAM, all control rods are rapidly inserted to shut down the chain reaction. Boron can also be dissolved in coolant for slow bulk reactivity control."),

    P("What is the function of a neutron reflector surrounding a reactor core?",
      "A neutron reflector scatters escaping neutrons back into the reactor core, reducing neutron leakage and thereby lowering the critical mass required for sustained fission.",
      "Reflects escaping neutrons back into core, reducing critical mass",
      "The reflector is made of materials with high scattering and low absorption cross-sections such as graphite, beryllium, or water. By reflecting neutrons that would otherwise leave the core, it improves neutron economy so more neutrons remain available to cause fission. This reduces the critical mass, improves fuel utilisation, and helps achieve more uniform power distribution across the core. Some reactors use water as both moderator and reflector."),

    P("What is the purpose of the biological shield in a nuclear power plant?",
      "The biological shield is a thick layer of reinforced concrete surrounding the reactor to attenuate neutron and gamma radiation to safe levels for plant personnel and the public.",
      "Thick reinforced concrete absorbs neutrons and gamma rays from the core",
      "The reactor core produces intense neutron and gamma radiation during operation. The biological shield, typically 1.5 to 3 metres of heavy reinforced concrete sometimes with added lead or barite, absorbs and attenuates this radiation. It is designed to reduce dose rates outside the shield to permissible limits typically less than 0.5 mSv per year for public areas. The biological shield is distinct from the containment structure which provides the primary pressure boundary and structural protection."),

    P("What is the role of the pressuriser in a pressurised water reactor (PWR)?",
      "The pressuriser maintains the primary coolant loop at approximately 155 bar to prevent the light water coolant from boiling in the reactor core even at operating temperatures of 320 to 330 degrees Celsius.",
      "Maintains about 155 bar pressure to prevent boiling in the core",
      "The pressuriser is a vertical pressure vessel connected to the primary loop, containing electric heaters to raise pressure and spray nozzles to reduce pressure by condensing steam. During normal operation it maintains pressure around 155 bar (15.5 MPa). At this pressure, water boiling point exceeds 340 degrees Celsius, ensuring the coolant remains subcooled even at core outlet temperatures of 320 to 330 degrees Celsius. This prevents bulk boiling in the core, which is the defining feature of the PWR design."),

    P("Why is heavy water (D2O) preferred over light water (H2O) as a moderator in CANDU reactors?",
      "Heavy water is preferred because it absorbs far fewer neutrons than light water, allowing the CANDU reactor to sustain a chain reaction using natural unenriched uranium fuel at 0.7% U-235.",
      "D2O absorbs far fewer neutrons so natural uranium fuel can sustain criticality",
      "The key difference is neutron absorption. Hydrogen (protium in H2O) has a thermal neutron absorption cross-section of about 0.66 barns, while deuterium (in D2O) has only about 0.0005 barns, roughly 1300 times lower. This means light water wastes too many neutrons for natural uranium fuel to sustain criticality. Heavy water preserves enough neutrons to achieve k-effective of at least 1 with natural uranium, eliminating the costly uranium enrichment step required by light-water reactors."),

    P("What is the primary function of the containment building in a nuclear power plant?",
      "The containment building is a massive reinforced concrete and steel structure that encloses the reactor, preventing the release of radioactive materials into the environment in case of a severe accident.",
      "Final barrier against radioactive release during severe accidents",
      "Designed to withstand internal pressure from a loss-of-coolant accident (LOCA) and external threats including earthquakes, aircraft impact, and tornadoes, the containment is the ultimate safety barrier. Typical walls are 1 to 1.5 metres thick reinforced concrete with a steel liner. It houses the reactor pressure vessel, steam generators, and primary piping. All commercial reactors must have containment as a fundamental safety feature, and its integrity is continuously monitored during operation."),

    P("In a pressurised water reactor (PWR), what serves as both the moderator and the coolant?",
      "Ordinary (light) water serves as both the moderator and the coolant in a PWR, circulating at high pressure around 155 bar to prevent boiling while simultaneously thermalising neutrons.",
      "Light water is both moderator and coolant in a PWR",
      "In a PWR, enriched uranium fuel at 3 to 5% U-235 heats light water to about 320 to 330 degrees Celsius at the core outlet. The high pressure around 155 bar maintained by the pressuriser keeps the water from boiling. The same water thermalises neutrons enabling the chain reaction. Hot pressurised water then passes through a steam generator, transferring heat to a secondary loop that produces steam for the turbine. This two-loop design isolates radioactivity from the turbine system."),

    P("What is the fundamental difference between how a PWR and a BWR generate steam?",
      "In a PWR, steam is produced in an external steam generator from a clean secondary loop, while in a BWR, water boils directly inside the reactor core and the steam goes straight to the turbine.",
      "BWR boils in core and sends steam direct to turbine; PWR uses a steam generator",
      "The PWR keeps the primary loop (radioactive) separate from the secondary loop via a steam generator heat exchanger. The BWR eliminates this separation because water boils within the reactor core at about 70 bar, and steam produced is piped directly to the turbine. This simplifies the design by eliminating steam generators but means the turbine receives slightly radioactive steam from nitrogen-16 activation, requiring shielding around the turbine building. Both designs use light water as moderator and coolant."),

    P("What type of fuel does a CANDU (PHWR) reactor use, and what is its moderator?",
      "A CANDU reactor uses natural uranium fuel (0.7% U-235, no enrichment needed) and heavy water (D2O) as both its moderator and coolant.",
      "Natural uranium fuel plus D2O moderator and coolant",
      "CANDU (Canada Deuterium Uranium) reactors use heavy water because its very low neutron absorption allows criticality with natural uranium. The fuel is natural UO2 loaded into horizontal pressure tubes rather than a single pressure vessel. A distinctive feature is on-power refuelling where new fuel can be loaded while the reactor operates, eliminating lengthy shutdowns for refuelling and improving the capacity factor. India's PHWR programme is based on this Canadian design."),

    P("What is the distinguishing feature of a fast breeder reactor?",
      "A fast breeder reactor uses fast unmoderated neutrons and converts fertile U-238 into more fissile Pu-239 than it consumes, achieving a breeding ratio greater than 1.",
      "No moderator; breeds more fissile fuel than it consumes",
      "Fast breeder reactors operate without a moderator, using fast neutrons around 1 to 2 MeV from fission. A core of fissile fuel (Pu-239 or enriched U-235) is surrounded by a blanket of fertile U-238. Fast neutrons convert U-238 to Pu-239 via neutron capture and beta decay. When the breeding ratio exceeds 1, the reactor produces more fuel than it uses, potentially extending uranium resources 60-fold. Liquid sodium is typically used as coolant because it does not moderate fast neutrons."),

    P("What coolant and moderator are used in a Magnox (gas-cooled) reactor?",
      "In a Magnox reactor, carbon dioxide (CO2) gas is used as the coolant and graphite serves as the moderator, with natural uranium metal fuel clad in a magnesium alloy casing.",
      "CO2 coolant and graphite moderator with natural uranium fuel",
      "Magnox reactors are British-designed gas-cooled reactors using natural uranium metal fuel. The cladding is a magnesium alloy called Magnox, hence the reactor name, chosen for its low neutron absorption. Graphite moderator slows neutrons to thermal energies. CO2 gas is circulated through the fuel channels at high pressure to extract heat, which is transferred to water in boilers to produce steam. The AGR (advanced gas-cooled reactor) evolved from this concept with higher temperatures and slightly enriched fuel."),

    P("What coolant is typically used in a fast breeder reactor and why?",
      "Liquid sodium is typically used as coolant in fast breeder reactors because it has excellent heat transfer properties, a high boiling point, and does not significantly moderate fast neutrons.",
      "Sodium has good heat transfer, high boiling point, and no neutron moderation",
      "Fast breeder reactors require a coolant that preserves the fast neutron spectrum. Liquid sodium has excellent thermal conductivity, a high boiling point of 883 degrees Celsius at one atmosphere, and operates at near-atmospheric pressure reducing pipe-burst risk. It does not absorb neutrons significantly and does not slow them down. The main drawback is sodium reactivity with water and air, requiring an intermediate sodium loop between the primary circuit and the steam generator to prevent contact between sodium and water."),

    P("What is the primary difference between a PHWR and a PWR regarding fuel enrichment?",
      "A PHWR uses natural uranium fuel at 0.7% U-235 with no enrichment needed because heavy water absorbs fewer neutrons, while a PWR requires enriched uranium at 3 to 5% U-235 because light water absorbs more neutrons.",
      "PHWR uses natural U; PWR uses enriched U because light water absorbs more neutrons",
      "The key difference lies in neutron economy. Light water (PWR coolant and moderator) absorbs a significant fraction of neutrons due to hydrogen relatively high absorption cross-section of about 0.66 barns. This parasitic loss requires enriching uranium to 3 to 5% U-235 to maintain criticality. Heavy water (PHWR coolant and moderator) absorbs far fewer neutrons with only about 0.0005 barns for deuterium, so natural uranium at 0.7% U-235 suffices. The trade-off is that heavy water production is expensive and energy-intensive."),

    P("Which reactor type uses a graphite moderator and CO2 gas coolant with natural uranium fuel?",
      "The gas-cooled reactor (GCR), including the Magnox and advanced gas-cooled reactor (AGR) types, uses a graphite moderator and CO2 coolant with natural or slightly enriched uranium fuel.",
      "GCR and Magnox reactors use graphite moderator with CO2 coolant",
      "Gas-cooled reactors, developed primarily in the UK, use graphite as moderator and pressurised CO2 as coolant. The original Magnox design uses natural uranium metal fuel, while the later AGR uses slightly enriched UO2 fuel at higher temperatures for improved efficiency. CO2 coolant allows higher outlet temperatures up to 650 degrees Celsius in AGR compared to water-cooled designs, yielding better thermal efficiency of about 40% for AGR versus 33% for PWR."),

    P("What is the concept of a high-temperature gas-cooled reactor (HTGR)?",
      "An HTGR uses graphite as moderator, helium gas as coolant, and TRISO-coated particle fuel, achieving outlet temperatures above 700 degrees Celsius for high thermal efficiency and process heat applications.",
      "HTGR uses graphite plus helium coolant and TRISO fuel at high outlet temperature",
      "HTGRs use helium which is inert and has no activation as coolant and graphite as moderator. The fuel consists of tiny uranium oxide particles about 0.5 mm coated with layers of carbon and silicon carbide known as TRISO particles, each acting as a miniature containment. Outlet temperatures of 700 to 950 degrees Celsius are achievable, far higher than water-cooled reactors, enabling thermal efficiency above 40% and potential use for hydrogen production, desalination, and industrial process heat. Examples include the US Dragon reactor and the Chinese HTR-PM."),

    P("What is the function of a steam generator in a PWR nuclear power plant?",
      "The steam generator transfers heat from the radioactive primary coolant loop to the clean secondary water loop, producing non-radioactive steam for the turbine while keeping radioactive water isolated.",
      "Heat exchanger between radioactive primary loop and clean secondary loop",
      "The steam generator is a large shell-and-tube heat exchanger. Hot pressurised water at about 320 degrees Celsius and 155 bar from the reactor flows through thousands of U-shaped Inconel tubes. Feedwater from the secondary loop surrounds these tubes, absorbing heat and boiling into steam at about 280 degrees Celsius. This steam drives the turbine. The two fluids never mix, ensuring radioactive primary water is completely isolated from the turbine and condenser systems."),

    P("What material is commonly used for nuclear fuel cladding and why?",
      "Zirconium alloy (Zircaloy) is commonly used for nuclear fuel cladding because it has a very low neutron absorption cross-section, good corrosion resistance, and maintains strength at reactor temperatures.",
      "Zirconium alloy has low neutron absorption and resists corrosion",
      "Nuclear fuel is manufactured as UO2 ceramic pellets stacked inside fuel rods enclosed in zirconium-alloy cladding such as Zircaloy-2 or Zircaloy-4. Zirconium is chosen because its thermal neutron absorption cross-section of about 0.18 barns is very low, allowing neutrons to pass through efficiently. It also resists corrosion in high-temperature water and maintains mechanical integrity under irradiation and the pressure differential between the coolant and the fuel rod interior which is filled with helium for heat transfer."),

    P("Why is a two-loop (dual circuit) design used in PWR nuclear power plants?",
      "The two-loop design isolates the radioactive primary coolant loop from the secondary steam loop, preventing radioactive contamination of the turbine and simplifying maintenance and radiation protection.",
      "Isolates radioactive primary loop from clean turbine loop",
      "In a PWR, the primary loop water has been in direct contact with the reactor core and is radioactive. The steam generator couples the primary and secondary loops thermally but not physically. This ensures the steam driving the turbine is non-radioactive under normal operation. Benefits include reduced radiation exposure for turbine maintenance personnel, simplified decontamination, and prevention of radioactive contamination spreading through the turbine, condenser, and feedwater systems."),

    P("Where is spent nuclear fuel stored immediately after removal from the reactor?",
      "Spent fuel is immediately stored in water-filled cooling pools at the plant site, where the water provides both cooling of intense decay heat and radiation shielding.",
      "Water cooling pools at reactor site for cooling and shielding",
      "Freshly discharged spent fuel is intensely radioactive and generates significant decay heat at about 1 to 2% of full power for a recently operating core. It is placed in deep pools typically 12 metres filled with demineralised borated water. The water absorbs decay heat through natural or forced circulation and provides shielding because the 12-metre depth reduces dose rates at the pool surface to safe levels. After 5 to 10 years of cooling, fuel may be transferred to dry cask storage or shipped for reprocessing."),

    P("What is the role of the condenser in the secondary loop of a nuclear power plant?",
      "The condenser cools and condenses exhaust steam from the turbine back into liquid water by rejecting heat to an external cooling water source, allowing the water to be recycled to the steam generator.",
      "Condenses turbine exhaust steam back into water for recycling",
      "After passing through the turbine, low-pressure steam enters the condenser where it flows over tubes carrying cooling water from a river, ocean, or cooling tower. The steam condenses back into liquid water (condensate) which is pumped back to the steam generator via feedwater heaters. The condenser operates under vacuum typically around 0.05 bar to maximise the pressure difference across the turbine, improving cycle efficiency. The heat rejected is approximately 65 to 72% of the thermal power input."),

    P("What is the primary function of the reactor pressure vessel?",
      "The reactor pressure vessel is a thick-walled steel container that houses the reactor core, withstands high pressure and temperature, and forms part of the primary coolant pressure boundary.",
      "Houses the core; contains high-pressure, high-temperature coolant",
      "In a PWR, the reactor pressure vessel (RPV) is typically 20 to 25 cm thick carbon steel with stainless steel cladding, operating at about 155 bar and 320 to 330 degrees Celsius. It contains fuel assemblies, control rod guide tubes, core support structures, and the core baffle. The RPV is a critical safety component whose failure would cause a large-break LOCA. It is designed with significant safety margins and undergoes regular in-service inspection using ultrasonic testing throughout the plants 40 to 60 year lifetime."),

    P("What is the purpose of the primary coolant circulating pump in a nuclear reactor?",
      "The primary coolant circulating pump maintains continuous forced circulation of coolant through the reactor core and steam generator, ensuring efficient heat removal from the fuel assemblies.",
      "Forces coolant flow through core and steam generator continuously",
      "Primary coolant pumps are large high-reliability machines circulating pressurised water (in a PWR) at high flow rates around 20,000 cubic metres per hour per loop in a large 4-loop PWR. They must operate continuously to remove fission heat. Loss of forced flow due to loss of offsite power is a design-basis accident, and natural circulation driven by density differences between hot and cold water provides partial cooling while emergency systems are needed for full safety. Pump reliability is critical for reactor safety."),

    P("What type of fuel pellets are used in most commercial nuclear water-cooled reactors?",
      "Ceramic uranium dioxide (UO2) pellets are used in most commercial reactors, stacked inside zirconium-alloy cladding tubes to form fuel rods which are bundled into fuel assemblies.",
      "UO2 ceramic pellets inside Zircaloy-clad fuel rods",
      "UO2 is a ceramic with a very high melting point of about 2865 degrees Celsius, providing a large safety margin against fuel damage. Pellets are typically about 1 cm diameter and about 1 cm height, with a central hole in some designs. They are stacked inside thin-walled zirconium-alloy tubes (fuel rods) which are sealed with helium-filled plenums. About 200 to 300 fuel rods are arranged in a square lattice to form a fuel assembly. Multiple assemblies, typically 150 to 250, make up a large reactor core."),

    P("Why is the thermal efficiency of a nuclear power plant typically lower than that of a modern coal-fired plant?",
      "Nuclear plants operate at lower steam temperatures and pressures with saturated steam at about 280 degrees Celsius due to safety constraints on fuel temperature, limiting thermal efficiency to 28 to 33 percent compared to 40 to 45 percent for modern coal plants.",
      "Lower steam conditions (saturated, moderate temperature) limit efficiency",
      "Thermal efficiency depends on the temperature difference between the heat source and the environment following the Carnot principle. Nuclear reactors produce steam at relatively modest conditions, about 280 degrees Celsius in BWRs and about 325 degrees Celsius in PWRs, because the fuel must be kept well below its melting point with reliable cooling. Coal and gas plants burn fuel externally at much higher temperatures, enabling superheated steam at 540 to 600 degrees Celsius. This larger temperature difference gives fossil plants 40 to 45% efficiency versus 28 to 33% for nuclear."),

    P("Why do nuclear power plants typically operate as baseload power sources?",
      "Nuclear plants operate as baseload sources because their high capital costs and low fuel costs make full-power operation most economical, and frequent load changes cause thermal stress and xenon poisoning complications.",
      "High capital plus low fuel cost means running at full power is optimal",
      "Nuclear plants cost 2 to 6 billion dollars to build but have extremely low marginal fuel costs because uranium provides enormous energy per unit mass. Running at maximum output maximises return on capital investment. Additionally, frequent power changes cause thermal cycling stress on reactor components and complications with xenon-135, a strong neutron absorber produced from fission which can cause spatial power oscillations. Most nuclear plants achieve capacity factors of 85 to 95%."),

    P("What is decay heat and why is it a safety concern after reactor shutdown?",
      "Decay heat is heat produced by radioactive decay of fission products after the chain reaction stops, and it is about 6 to 7 percent of full power immediately after shutdown, requiring continued active cooling to prevent fuel damage.",
      "About 6 to 7 percent of full power remains as decay heat after SCRAM",
      "Even after a SCRAM (rapid shutdown), fission products trapped in the fuel continue to undergo radioactive decay releasing heat. Immediately after shutdown this decay heat is about 6 to 7 percent of rated thermal power, and for a 3000 MWt reactor that is about 200 MW, more than enough to melt fuel if cooling is lost. Decay heat decreases roughly as time to the power minus 0.2 but requires cooling for days to weeks. This was the fundamental cause of the Fukushima Daiichi accident in 2011."),

    P("What is the concept of half-life in the context of nuclear waste management?",
      "Half-life is the time required for half of the radioactive atoms in a sample to decay, and for nuclear waste it determines how long the waste remains hazardous, influencing storage and disposal strategies.",
      "Time for half the activity to decay; determines how long waste stays hazardous",
      "Radioactive decay follows an exponential law where after one half-life 50% of atoms remain, after two half-lives 25% remain, and after ten half-lives about 0.1% remains. For nuclear waste, isotopes vary enormously: Cs-137 has a half-life of about 30 years, Sr-90 about 29 years, while Pu-239 has about 24100 years and I-129 has about 15.7 million years. High-level waste containing long-lived actinides requires deep geological disposal repositories designed to contain radioactivity for hundreds of thousands of years."),

    P("What are the three fundamental principles of radiation protection?",
      "The three principles of radiation protection are time (minimise exposure duration), distance (maximise distance from the source), and shielding (use appropriate shielding material between the source and personnel).",
      "Time, distance, and shielding are the three pillars of radiation protection",
      "These principles underpin the ALARA (As Low As Reasonably Achievable) philosophy. Time means shorter exposure results in less dose. Distance means radiation intensity from a point source decreases with the square of distance following the inverse-square law. Shielding means lead or concrete attenuates gamma rays while hydrogen-rich materials such as water or polyethylene slow and absorb neutrons. In a nuclear plant these are applied through access controls, remote handling equipment, thick biological shields, and strict radiation work permits."),

    P("How is emergency core cooling achieved during a loss-of-coolant accident (LOCA)?",
      "Emergency core cooling is achieved through accumulator tanks (passive) and high-pressure and low-pressure injection pumps that flood the core with borated water, preventing fuel overheating and meltdown.",
      "ECCS uses accumulators plus injection pumps to flood core with borated water",
      "In a LOCA, a pipe break causes rapid coolant loss. The ECCS responds in stages: first, accumulators (passive nitrogen-pressurised tanks) inject borated water at intermediate pressure; second, high-pressure injection pumps handle small breaks; third, low-pressure injection and flooding systems reflood the core for large breaks. Borated water absorbs neutrons keeping the reactor subcritical and removes decay heat. Core damage must be prevented within seconds to minutes, and the ECCS design-basis requirement is to reflood the core before fuel temperatures reach dangerous levels."),

    P("What was the first nuclear power station established in India?",
      "Tarapur Atomic Power Station (TAPS) in Maharashtra, commissioned in 1969, was India's first nuclear power station, initially using boiling water reactors (BWR) with enriched uranium fuel.",
      "Tarapur (TAPS) was India's first nuclear plant, using BWR design",
      "Tarapur Atomic Power Station began commercial operation in 1969 with two 160 MWe boiling water reactors supplied by General Electric. These were among the first BWR units in Asia. Later, two indigenous 540 MWe pressurised heavy water reactors (TAPS-3 and TAPS-4) were added. Tarapur demonstrated India's early nuclear capability and paved the way for the indigenous PHWR programme. It is operated by NPCIL."),

    P("What is India's three-stage nuclear power programme designed to achieve?",
      "India's three-stage programme aims to eventually utilise the country's abundant thorium reserves: Stage 1 produces plutonium via PHWRs, Stage 2 uses fast breeders to create fissile material from U-238 and Th-232, and Stage 3 uses thorium-based reactors for long-term energy independence.",
      "PHWR to Fast Breeder to Thorium reactors for energy independence",
      "Conceived by Homi Bhabha, the programme exploits India's large thorium reserves which are the world's largest. Stage 1 uses PHWRs that burn natural uranium, producing plutonium as a by-product. Stage 2 uses fast breeder reactors that employ plutonium as fuel, converting U-238 and Th-232 into Pu-239 and U-233. Stage 3 uses thorium-based reactors that employ the bred U-233 as fuel. The PFBR at Kalpakkam is the bridge between Stages 1 and 2, and full realisation of Stage 3 could provide energy for centuries."),

    P("What type of reactors are installed at the Kudankulam Nuclear Power Plant?",
      "The Kudankulam Nuclear Power Plant uses VVER-1000 pressurised water reactors supplied by Russia, with enriched uranium fuel at about 4.4% U-235 and light water as both moderator and coolant.",
      "VVER-1000 Russian PWR design at Kudankulam in Tamil Nadu",
      "Kudankulam in Tamil Nadu uses VVER-1000 reactors, which are Russia's advanced pressurised water reactor design. Each unit generates 1000 MWe. The VVER-1000 uses enriched uranium fuel at about 4.4% U-235, light water as moderator and coolant, and operates at about 155 bar primary pressure with core outlet temperature around 320 degrees Celsius. Units 1 and 2 were built with Russian assistance and achieved full commercial operation. Additional units are under construction, making Kudankulam one of India's largest nuclear power complexes."),

    P("Where is India's prototype fast breeder reactor (PFBR) located and what is its purpose?",
      "India's PFBR is located at Kalpakkam near Chennai in Tamil Nadu, and it is a 500 MWe sodium-cooled fast breeder reactor designed to demonstrate Stage 2 of India's three-stage nuclear programme.",
      "PFBR at Kalpakkam: 500 MWe sodium-cooled fast breeder reactor",
      "The PFBR, built by the Indira Gandhi Centre for Atomic Research (IGCAR), uses plutonium-239 as fissile fuel and depleted uranium (U-238) as blanket material, with liquid sodium as coolant. It aims to demonstrate breeding, which means producing more fissile material (Pu-239 from U-238) than it consumes, with a breeding ratio greater than 1. Success of the PFBR would validate the fast breeder stage and pave the way for thorium-based reactors using India's vast thorium reserves."),

    P("Which organisation operates nuclear power plants in India?",
      "The Nuclear Power Corporation of India Limited (NPCIL), a government-owned corporation under the Department of Atomic Energy, operates and maintains all nuclear power plants in India.",
      "NPCIL operates all Indian nuclear power stations",
      "NPCIL is responsible for the design, construction, commissioning, and operation of nuclear power reactors in India. It operates plants including Tarapur, Rajasthan (Rawatbhata), Kakrapar, Kaiga, Kudankulam, and others, with a growing fleet of PHWRs and imported reactor designs. NPCIL works under the administrative control of the Department of Atomic Energy (DAE) and follows safety regulations set by the Atomic Energy Regulatory Board (AERB)."),

    P("How many atoms are present in 1 kg of uranium-235?",
      "1 kg of uranium-235 contains approximately 2.56 times 10 to the power 24 atoms.",
      "N equals (1000/235) times 6.022 times 10 to the power 23",
      "The number of atoms is calculated using Avogadro's relation: N = (mass / molar mass) times Avogadro's number = (1000 g / 235 g per mol) times 6.022 times 10 to the power 23 atoms per mol. This gives (1000/235) times 6.022 times 10 to the power 23 = 4.2553 times 6.022 times 10 to the power 23 = 2.562 times 10 to the power 24 atoms. This number is fundamental for calculating the total energy released by complete fission of 1 kg of U-235."),

    P("Calculate the total energy released by the complete fission of 1 kg of uranium-235.",
      "The complete fission of 1 kg of U-235 releases approximately 8.2 times 10 to the power 13 joules (about 82 terajoules).",
      "E equals 2.56 times 10 to the power 24 times 200 MeV times 1.602 times 10 to the power minus 13 J per MeV",
      "Number of atoms = (1000/235) times 6.022 times 10 to the power 23 = 2.562 times 10 to the power 24. Energy per fission = 200 MeV. Since 1 MeV = 1.602 times 10 to the power minus 13 J, energy per fission = 200 times 1.602 times 10 to the power minus 13 = 3.204 times 10 to the power minus 11 J. Total energy = 2.562 times 10 to the power 24 times 3.204 times 10 to the power minus 11 = 8.208 times 10 to the power 13 J, which is approximately 8.2 times 10 to the power 13 J. This is equivalent to about 22.8 million kWh of thermal energy."),

    P("How many tonnes of coal with calorific value 29 MJ/kg contain the same energy as 1 kg of uranium-235?",
      "Approximately 2830 tonnes of coal with a calorific value of 29 MJ/kg contain the same energy as 1 kg of uranium-235.",
      "8.2 times 10 to the power 13 J divided by 29 MJ per kg equals about 2830 tonnes",
      "From the energy calculation, 1 kg U-235 releases 8.2 times 10 to the power 13 J. Coal calorific value = 29 MJ/kg = 29 times 10 to the power 6 J/kg. Mass of equivalent coal = 8.2 times 10 to the power 13 / 29 times 10 to the power 6 = 2.828 times 10 to the power 6 kg = 2828 tonnes, approximately 2830 tonnes. This enormous ratio of roughly 3 million to one by mass illustrates why nuclear fuel, despite its high cost per kg, is extremely economical on an energy-per-rupee basis."),

    P("A nuclear reactor operates at 1000 MWt with a thermal efficiency of 33%. What is the electrical output and how much heat is rejected to the environment?",
      "The electrical output is 330 MWe and the heat rejected to the environment is 670 MWt.",
      "P elec = 1000 times 0.33 = 330 MWe; rejected = 670 MWt",
      "Electrical output = Thermal power times efficiency = 1000 MWt times 0.33 = 330 MWe. By energy balance, heat rejected = Thermal power input minus Electrical output = 1000 minus 330 = 670 MWt. This rejected heat is transferred to the environment via the condenser cooling system using a river, ocean, or cooling tower. The relatively low 33% efficiency means two-thirds of the thermal energy is rejected as waste heat, which is a significant design consideration for the cooling system capacity."),

    P("A reactor core has 150 fuel assemblies each containing 264 fuel rods, with each rod containing 280 UO2 pellets of mass 8 g each. What is the total fuel mass in the core?",
      "The total fuel mass in the core is 88,704 kg, which is approximately 88.7 tonnes of UO2.",
      "150 times 264 times 280 times 8 g = 88,704,000 g = 88,704 kg",
      "Total pellets = 150 assemblies times 264 rods per assembly times 280 pellets per rod = 11,088,000 pellets. Total mass = 11,088,000 times 8 g = 88,704,000 g = 88,704 kg = approximately 88.7 tonnes of UO2. Since UO2 is about 88% uranium by mass, the uranium content is approximately 88.7 times 0.88 = about 78 tonnes. This is consistent with the fuel inventory of a large 1000 MWe PWR reactor core."),

    P("A 500 MWe nuclear plant operates at a capacity factor of 85%. How much electrical energy does it generate in one year?",
      "The plant generates approximately 3,723,000 MWh, which is about 3.72 TWh, of electrical energy per year.",
      "500 times 0.85 times 8760 hours = 3,723,000 MWh",
      "Annual energy generation = Rated capacity times Capacity factor times Hours in a year = 500 MWe times 0.85 times 8760 h = 3,723,000 MWh = approximately 3.72 TWh. This demonstrates the significant energy output of nuclear plants. Even at 85% capacity factor, a single 500 MWe unit generates enough electricity to power approximately 1.2 million Indian homes for a year, assuming 3000 kWh per household per year.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC5_NUCLEAR;
  if (typeof window !== "undefined") window.SSC_JE_ENC5_NUCLEAR = SSC_JE_ENC5_NUCLEAR;
})();

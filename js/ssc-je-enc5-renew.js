(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC5_RENEW = {};
  SSC_JE_ENC5_RENEW.renew = [

    P("In a silicon photovoltaic cell, sunlight generates electricity by:",
      "Direct conversion of photon energy into electric current via the photovoltaic effect in a semiconductor p–n junction.",
      "PV cells convert light directly.",
      "When photons with energy greater than the bandgap (~1.1 eV for silicon) strike the p–n junction, they create electron–hole pairs. The built-in electric field sweeps electrons toward the n-side and holes toward the p-side, producing a current. This is the photovoltaic effect, requiring no moving parts."),

    P("What is the typical efficiency range of modern commercial crystalline silicon PV modules?",
      "15 % to 22 %.",
      "Commercial Si modules today.",
      "Monocrystalline modules typically achieve 18–22 %, while polycrystalline (multi-crystalline) modules are around 15–18 %. Laboratory records exceed 26 %, but commercial module efficiencies remain in the 15–22 % range due to packaging, wiring losses, and temperature derating."),

    P("The standard solar irradiance used for rating PV panels (AM 1.5 spectrum) at Earth's surface is approximately:",
      "1000 W per square metre.",
      "Standard test condition (STC) irradiance.",
      "STC defines irradiance as 1000 W/m², cell temperature 25 °C, and air mass 1.5. The solar constant at the top of the atmosphere is about 1367 W/m²; after atmospheric absorption and scattering roughly 1000 W/m² reaches the surface on a clear day, which is the standard for panel rating."),

    P("A flat-plate solar collector works on the greenhouse principle because:",
      "Short-wave solar radiation passes through the glass cover while long-wave thermal radiation emitted by the absorber plate is trapped inside.",
      "Greenhouse effect in collectors.",
      "Glass is transparent to incoming short-wave solar radiation but largely opaque to the longer-wavelength infrared radiation re-emitted by the heated absorber plate. This trapping of thermal energy raises the fluid temperature, enabling collection of useful heat up to about 60–70 °C for domestic hot water."),

    P("A parabolic trough solar concentrating collector can achieve a temperature range of approximately:",
      "300 °C to 400 °C for steam generation.",
      "Concentrating solar thermal (CST).",
      "The trough focuses sunlight onto a receiver tube along the focal line, achieving concentration ratios of 30–80. This produces temperatures in the 300–400 °C range, sufficient to generate steam for a Rankine-cycle turbine in solar thermal power plants."),

    P("Why is solar PV power generation classified as intermittent?",
      "Because it depends on sunlight availability, varying with time of day, cloud cover, seasons, and latitude.",
      "Solar intermittency.",
      "PV output is zero at night and drops during cloudy or rainy periods. Seasonal variation in sun angle and day length also change output. This variability makes solar an intermittent source, necessitating energy storage or backup generation for reliable supply."),

    P("A typical capacity factor for a solar PV plant in India is approximately:",
      "15 % to 25 %.",
      "Capacity factor of solar.",
      "Capacity factor = actual energy output / (rated capacity × hours in period). Despite a peak irradiance of ~1000 W/m², output is zero at night and reduced during morning, evening, clouds, and monsoon. Plants in high-irradiance regions like Rajasthan achieve about 20–25 %, while the national average is closer to 15–20 %."),

    P("A solar pond achieves high temperature storage by:",
      "Using a salinity gradient to suppress convection, allowing the bottom layer to reach high temperatures (up to ~90 °C).",
      "Solar pond — salinity gradient.",
      "In a salt-gradient solar pond, increasing salt concentration with depth creates a density gradient. This prevents hot water at the bottom (heated by absorbed sunlight) from rising by convection. The non-convecting zone acts as insulation, trapping heat and raising bottom temperatures up to 90 °C or more."),

    P("The power available in the wind is proportional to:",
      "The cube of wind velocity — P = ½ ρ A V³.",
      "P ∝ V³ — cubic law.",
      "From kinetic energy theory, power = ½ mass flow rate × V² = ½ (ρAV) × V² = ½ ρAV³. Doubling wind speed increases available power eightfold. With ρ ≈ 1.225 kg/m³, the cubic relationship is the fundamental principle governing wind turbine design and wind farm siting."),

    P("Calculate the wind power available through an area of 1 m² when wind speed is 10 m/s and air density is 1.225 kg/m³.",
      "612.5 W.",
      "Wind power calculation: P = ½ ρ A V³.",
      "Using P = ½ ρ A V³ = ½ × 1.225 × 1 × (10)³ = ½ × 1.225 × 1000 = 612.5 W. This is the total kinetic power crossing 1 m²; only a fraction (Betz limit and mechanical losses) can be extracted as useful electrical power."),

    P("The Betz limit states that a wind turbine can extract a maximum of approximately what fraction of wind power?",
      "59.3 % (16/27 of the kinetic energy in the wind).",
      "Betz limit = 16/27.",
      "Albert Betz proved in 1919 that no turbine can capture more than 16/27 ≈ 59.3 % of the kinetic energy. Real turbines achieve 35–45 % (overall efficiency accounting for mechanical and electrical losses). This is a theoretical upper bound from momentum theory."),

    P("The cut-in speed of a wind turbine is the minimum wind speed below which:",
      "No power is generated because the rotor does not have enough torque to overcome friction and begin meaningful rotation.",
      "Cut-in speed ~3 m/s.",
      "Below the cut-in speed (typically 3–4 m/s), the aerodynamic torque is insufficient to drive the generator profitably. The turbine remains stationary or idling. Above cut-in, power rises steeply (proportional to V³) until rated speed is reached at 12–15 m/s."),

    P("What is the cut-out (gale) speed of a wind turbine?",
      "Typically about 25 m/s, above which the turbine is shut down for structural safety.",
      "Cut-out speed ~25 m/s.",
      "At very high wind speeds (~25 m/s), mechanical loads exceed safe design limits. The turbine is feathered or braked to prevent damage. Some modern turbines have a cut-out of 25–30 m/s and may include storm-ride-through capabilities."),

    P("A Horizontal Axis Wind Turbine (HAWT) differs from a Vertical Axis Wind Turbine (VAWT) mainly in that:",
      "HAWTs have the rotor axis horizontal and must yaw into the wind; VAWTs accept wind from any direction without yawing.",
      "HAWT vs VAWT.",
      "HAWTs (Darrieus and propeller types) are more common and efficient at utility scale; they require a yaw mechanism to face the wind. VAWTs (Savonius, Darrieus) accept wind from any direction but generally have lower efficiency and are suited for smaller or urban installations."),

    P("The yaw mechanism in a wind turbine is used to:",
      "Rotate the nacelle so that the rotor faces the wind direction for maximum energy capture.",
      "Yaw = orientation control.",
      "An anemometer and wind vane feed data to the yaw motor, which turns the nacelle on the tower to keep the rotor axis aligned with the wind. This maximises power extraction and reduces asymmetric loading on blades."),

    P("A micro hydropower plant is typically defined as having an installed capacity of:",
      "Less than 100 kW.",
      "Micro hydro < 100 kW.",
      "Various classifications exist: micro hydro is generally < 100 kW; mini hydro is 100 kW to a few MW. These small installations are cost-effective for remote or hilly areas with perennial streams and sufficient head."),

    P("Pelton turbines are best suited for hydroelectric sites with:",
      "High head and relatively low flow.",
      "Pelton = impulse turbine, high head.",
      "Pelton is an impulse turbine where a jet strikes buckets at atmospheric pressure. It works efficiently at heads above ~100 m. For low heads (below ~50 m), reaction turbines like Kaplan or Francis are preferred."),

    P("A pumped storage hydroelectric plant stores energy by:",
      "Pumping water from a lower reservoir to an upper reservoir during off-peak hours and releasing it through turbines during peak demand.",
      "Pumped storage = energy storage.",
      "Pumped storage acts like a giant rechargeable battery. At night or when electricity is cheap (off-peak), surplus power pumps water uphill. During daytime peak demand, water flows down through reversible pump-turbines, generating electricity with a round-trip efficiency of about 70–80 %."),

    P("A run-of-river hydropower plant:",
      "Diverts a portion of river flow through a turbine without a large storage dam, relying on natural river flow.",
      "Run-of-river — minimal storage.",
      "Run-of-river plants use the natural flow and elevation drop of a river with minimal or no reservoir storage. They have lower environmental impact than large dams but are dependent on seasonal river flow, making output variable during dry seasons."),

    P("The primary composition of biogas produced in a typical biogas plant is approximately:",
      "50 % to 65 % methane (CH₄) and 35 % to 50 % carbon dioxide (CO₂), with traces of H₂S and water vapour.",
      "Biogas ~60 % CH₄.",
      "Anaerobic digestion of organic matter by bacteria produces biogas. The methane content is typically 50–65 %, with CO₂ being the main other component. The exact ratio depends on feedstock and digester conditions."),

    P("The calorific value of biogas (with ~60 % methane) is approximately:",
      "21 MJ per cubic metre (about 5.8 kWh per cubic metre).",
      "Biogas CV ~ 21 MJ/m³.",
      "Pure methane has a CV of ~36 MJ/m³ (lower heating value). With ~60 % methane, the biogas CV ≈ 0.6 × 36 = ~21.6 MJ/m³. In kWh: 21.6 / 3.6 ≈ 6 kWh/m³. This makes biogas a useful fuel for cooking, lighting, and small power generation."),

    P("The KVIC floating-drum type biogas plant features:",
      "A cylindrical gas holder that floats on the slurry and rises as gas accumulates, maintaining constant gas pressure.",
      "KVIC plant — floating drum.",
      "Developed by the Khadi and Village Industries Commission, the floating-drum design has a steel drum floating on the fermented slurry. As biogas is produced, the drum rises, providing a visible gas volume indicator and relatively steady pressure. The drum requires periodic painting to prevent corrosion."),

    P("In a fixed-dome (Deenbandhu) type biogas plant, gas pressure is maintained by:",
      "The displacement of slurry between the digester and the outlet tank as gas accumulates in the fixed dome.",
      "Fixed dome — pressure via slurry displacement.",
      "The Deenbandhu or Janata design has a fixed hemispherical dome. As gas builds up above the slurry, it pushes slurry into the outlet tank. The difference in slurry levels creates hydrostatic pressure to deliver gas. This design has no moving parts and lower cost."),

    P("Producer gas obtained from biomass gasification typically has a calorific value of approximately:",
      "4 to 6 MJ per cubic metre.",
      "Producer gas — low CV.",
      "Biomass gasification with air produces producer gas containing N₂, CO, H₂, and small CH₄. Because of the large nitrogen fraction from air, the CV is only about 4–6 MJ/m³, significantly lower than biogas. It is used in engines and industrial furnaces."),

    P("The geothermal gradient in the Earth's crust is approximately:",
      "25 °C to 30 °C per kilometre of depth.",
      "Geothermal gradient ~25–30 °C/km.",
      "Temperature increases with depth in the Earth. On average the gradient is about 25–30 °C/km in continental crust. This means at 3 km depth, rock temperature is roughly 75–90 °C above surface temperature, which can be exploited for geothermal energy."),

    P("In a dry-steam geothermal power plant:",
      "Steam from an underground reservoir is piped directly to a turbine, which drives a generator.",
      "Dry steam — simplest geothermal type.",
      "Dry-steam plants are the oldest and simplest geothermal plants. Saturated or superheated steam from a naturally occurring reservoir flows directly to a turbine. The Geysers in California is the largest dry-steam field. No separate steam separation is needed."),

    P("A flash-steam geothermal power plant operates by:",
      "Taking high-pressure geothermal fluid and 'flashing' it to lower pressure to produce steam that drives a turbine.",
      "Flash steam — most common type.",
      "Hot geothermal water (>180 °C) from deep wells is brought to the surface at high pressure. When pressure is reduced in a flash tank, a portion 'flashes' into steam. This steam drives a turbine. Single-flash and double-flash designs are common in countries like Iceland, Philippines, and Indonesia."),

    P("A binary-cycle geothermal plant uses an organic Rankine cycle because:",
      "It can generate electricity from moderate-temperature geothermal resources (100–180 °C) by using a secondary working fluid with a lower boiling point than water.",
      "Binary cycle — low-temp resource.",
      "In a binary plant, hot geothermal water heats a secondary fluid (such as isobutane or isopentane) in a heat exchanger. The secondary fluid vaporises at a lower temperature and drives a turbine. This allows electricity generation from resources too cool for flash steam plants."),

    P("Enhanced Geothermal Systems (EGS) involve:",
      "Injecting water into hot dry rock at depth, fracturing it, and circulating the heated water back to the surface to generate power.",
      "EGS — hot dry rock technology.",
      "EGS targets hot rock formations that lack natural permeability or fluid. Water is injected under pressure to create artificial fractures, then circulated to extract heat. This technology could greatly expand geothermal potential beyond conventional hydrothermal sites."),

    P("The minimum tidal range required for an economically viable tidal barrage power plant is approximately:",
      "2.5 metres to 5 metres.",
      "Tidal range requirement.",
      "Tidal power depends on the height difference between high and low tides. A minimum range of about 5 m is generally needed for economic viability, though some sources cite 2.5 m as a lower threshold. Sites like the Rance River (France, 8.4 m range) and Sihwa Lake (South Korea) are successful examples."),

    P("In a typical tidal barrage power plant, generation most commonly occurs during:",
      "Ebb tide — when water stored in the basin at high tide is released through turbines as the tide goes out.",
      "Ebb-tide generation.",
      "Ebb-tide generation is most common: the basin is filled at high tide through sluice gates, then as the tide falls, the trapped water is released through turbines to the sea. This produces power during the falling tide. Flood-tide and two-way generation are also possible but less common."),

    P("OTEC (Ocean Thermal Energy Conversion) requires a minimum temperature difference between surface and deep ocean water of approximately:",
      "20 °C — typically surface water at ~25 °C and deep water at ~5 °C.",
      "OTEC needs ΔT ≥ 20 °C.",
      "OTEC exploits the temperature gradient in tropical oceans. Warm surface water (~25 °C) vaporises a working fluid; cold deep water (~5 °C from ~1000 m depth) condenses it. The Rankine cycle drives a turbine. The minimum ΔT of 20 °C is needed for practical efficiency."),

    P("In a closed-cycle OTEC system, the working fluid used is typically:",
      "Ammonia or another refrigerant with a low boiling point, which vaporises from warm seawater heat and is condensed by cold deep water.",
      "Closed-cycle OTEC — ammonia.",
      "In a closed-cycle OTEC, a working fluid like ammonia (boiling point −33 °C) circulates in a loop. Warm surface water vaporises it in an evaporator; the vapour drives a turbine; cold deep water condenses it back to liquid in a condenser. Ammonia is preferred for its high latent heat and suitable thermodynamic properties."),

    P("An oscillating water column (OWC) wave energy device works by:",
      "Rising and falling waves inside a partially submerged chamber push air through a bidirectional turbine to generate electricity.",
      "OWC — wave energy device.",
      "As a wave enters the chamber, it compresses the trapped air column, forcing it through a turbine. As the wave recedes, air is drawn back in. Wells turbines or impulse turbines are designed to rotate in both airflow directions, enabling continuous power generation from oscillating waves."),

    P("The Indian Solar Mission (National Solar Mission) initially targeted a cumulative solar PV capacity of:",
      "20 GW by 2022, which was later enhanced to a much higher target of 100 GW by 2022 as part of the overall 175 GW renewable target.",
      "JNNSM targets.",
      "The Jawaharlal Nehru National Solar Mission (JNNSM) launched in 2010 initially set a target of 20 GW solar by 2022. This was enhanced to 100 GW solar (part of 175 GW total renewables) by 2022. India has been among the fastest-growing solar markets globally."),

    P("Green hydrogen is produced by:",
      "Electrolysis of water using electricity from renewable energy sources, splitting H₂O into H₂ and O₂ without carbon emissions.",
      "Green hydrogen — electrolysis.",
      "Green hydrogen is made by passing electric current through water (electrolysis) powered by renewable electricity (solar, wind). This produces pure hydrogen without fossil fuel use or CO₂ emissions. It is considered a key energy carrier for decarbonising industry, transport, and storage."),

    P("Energy storage systems (such as batteries and pumped hydro) are essential for renewable energy sources primarily because:",
      "Renewable sources like solar and wind are intermittent and variable, so storage ensures supply during periods of no generation and balances demand–supply mismatches.",
      "Storage — addresses intermittency.",
      "Solar produces no power at night; wind varies unpredictably. Without storage, grid reliability suffers. Batteries (lithium-ion, flow batteries) and pumped hydro store excess energy when generation exceeds demand and release it when generation falls short. This enables higher renewable penetration on the grid."),

    P("Wave energy devices are broadly classified based on which principle?",
      "They convert the kinetic or potential energy of ocean surface waves into electricity using mechanisms such as oscillating bodies, oscillating water columns, or overtopping devices.",
      "Wave energy conversion principles.",
      "Wave energy devices include point absorbers (buoy moving with waves), oscillating water columns (air-driven turbines), oscillating wave surge converters (hinged paddles), and overtopping devices (water captured above sea level released through turbines). Different designs suit different wave climates."),

    P("Which type of turbine is most suitable for a low-head (below 50 m) hydroelectric installation?",
      "Axial-flow Kaplan turbine.",
      "Kaplan turbine — low head.",
      "The Kaplan turbine is an axial-flow reaction turbine designed for low-head (10–50 m) and high-flow conditions. Its adjustable blade pitch allows efficient operation across varying flow rates. Francis turbines suit medium heads, while Pelton impulse turbines are for high heads above ~100 m."),

    P("India's total installed renewable energy capacity (including large hydro) crossed approximately 175 GW by 2024. Which of the following is NOT a major component?",
      "Conventional coal-based thermal power.",
      "India RE capacity components.",
      "India's renewable portfolio includes solar PV, wind, biomass, small hydro, and large hydro. Coal-based thermal power, while a major part of India's total generation mix, is not classified as renewable energy. The 175 GW target by 2022 included 100 GW solar, 60 GW wind, 10 GW biomass, and 5 GW small hydro."),

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC5_RENEW;
  if (typeof window !== "undefined") window.SSC_JE_ENC5_RENEW = SSC_JE_ENC5_RENEW;
})();
(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC4_HEATT = {};
  SSC_JE_ENC4_HEATT.heatt = [

    P("Which mode of heat transfer does not require a material medium to propagate?",
      "Radiation is the only mode that does not require a material medium; it travels as electromagnetic waves and can pass through a vacuum.",
      "Only one mode works through empty space.",
      "Conduction needs molecular contact and convection needs a fluid medium. Radiation transfers energy by electromagnetic waves such as infrared. Therefore the sun’s heat reaches the Earth across empty space only by radiation. The other two modes cannot operate in a vacuum."),

    P("Which mechanism of heat transfer involves the bulk movement of fluid particles?",
      "Convection involves the bulk motion of fluid particles carrying thermal energy along with the moving fluid.",
      "Think of moving fluid carrying energy.",
      "Conduction transfers energy by molecular interaction without bulk movement. Convection is the transfer of energy by the combined action of fluid motion and mixing. Hot fluid physically carries enthalpy from one place to another. Therefore bulk fluid movement is the signature of convection."),

    P("Heat transfer between two solid bodies in direct contact, with no actual mixing of matter, occurs by which mode?",
      "Conduction, because energy is passed between neighbouring atoms and molecules at the contact interface without any bulk material movement.",
      "Contact without mixing.",
      "Conduction happens through molecular collision and lattice vibration at the contact zone. No particle transport takes place, unlike convection. The heat flows from the hotter body to the cooler one until temperatures equalise. Hence direct-contact transfer is conductive."),

    P("Statement: The three modes of heat transfer are conduction, convection and radiation. Is this statement correct?",
      "Yes, the statement is correct; these three distinct mechanisms are conduction, convection and radiation, and they often act together in real systems.",
      "All three names are exactly the classical modes.",
      "Conduction dominates in solids, convection in moving fluids, and radiation in vacuum and high-temperature processes. Boilers, furnaces and heat exchangers usually experience more than one mode at once. The statement lists exactly the three recognised modes. It is therefore correct."),

    P("Which physical quantity always acts as the driving force for heat transfer?",
      "Temperature difference (temperature gradient) is the driving force; heat always flows spontaneously from the higher-temperature region to the lower-temperature region.",
      "Temperature must differ.",
      "Without a temperature difference no net heat transfer occurs even if bodies are in contact. Heat flows in the direction of decreasing temperature. The larger the gradient, the faster the heat flow. Thus temperature gradient is the true driving potential."),

    P("A metal spoon dipped into a cup of hot tea becomes hot at its upper end mainly by which mode?",
      "Conduction, because heat travels along the metal shank by molecular vibration from the hot end to the cooler end.",
      "Heat travels along the solid metal.",
      "The spoon does not carry fluid with it, so convection is not the main mechanism. Energy moves from lattice vibration to lattice vibration along the steel. The high conductivity of the metal makes the tip heat quickly. This is classic conduction."),

    P("Warm air rising above a room heater and circulating around the room is an example of which kind of convection?",
      "Natural (free) convection, driven by buoyancy from density differences caused by temperature gradients.",
      "Driven by buoyancy alone.",
      "No fan or pump produces this motion. Hot air expands, becomes less dense and rises, while cooler air sinks. The resulting circulation is self-sustaining through gravity and buoyancy. This is free convection."),

    P("The heat received from the Sun across empty space is transferred mainly by which mode?",
      "Radiation, because electromagnetic waves can cross the vacuum between the Sun and the Earth.",
      "Travels through a vacuum.",
      "Conduction and convection both require matter, but the space between Sun and Earth is a vacuum. The Sun radiates electromagnetic energy including visible and infrared light. This energy is absorbed by the Earth’s surface as heat. Hence the transfer is by radiation."),

    P("State the mathematical form of Fourier’s law of heat conduction.",
      "Fourier’s law is q = -k·A·(dT/dx), where q is heat flow in W, k is thermal conductivity, A is cross-sectional area and dT/dx is the temperature gradient.",
      "Proportional to gradient, area and conductivity.",
      "Fourier’s law says heat flow is proportional to area and temperature gradient. The minus sign shows heat flows down the gradient, from hot to cold. In one-dimensional steady form it becomes Q = k·A·(T1 - T2)/L. It is the fundamental law of conduction."),

    P("What are the SI units of thermal conductivity k?",
      "Thermal conductivity k has SI units of W/(m·K), watts per metre per kelvin.",
      "Watts per metre-kelvin.",
      "From Fourier’s law k = q/(A·ΔT/Δx). The heat flow q is in W, area A in m² and gradient ΔT/Δx in K/m. Cancelling units gives W/(m·K). It measures how well a material conducts heat. Typical steel is about 45 and air about 0.026 W/(m·K)."),

    P("Among copper, aluminium, steel and glass wool, which gives the best thermal insulation?",
      "Glass wool is the best insulator because its thermal conductivity, about 0.04 W/(m·K), is far below that of the metals.",
      "Lowest conductivity means best insulator.",
      "Insulation quality depends on low k. Copper is about 385, aluminium about 205 and steel about 45 W/(m·K). Glass wool is about 0.04 W/(m·K), roughly 1000 times lower than steel. Lower conductivity means less heat conduction. Therefore glass wool insulates best."),

    P("Among copper, aluminium and steel, which material conducts heat the best?",
      "Copper, with a thermal conductivity of approximately 385 W/(m·K), which is higher than aluminium (about 205) and steel (about 45).",
      "Copper, then aluminium, then steel.",
      "The ranking follows the thermal conductivity values. Copper is about 385 W/(m·K). Aluminium is about 205 W/(m·K). Steel is only about 45 W/(m·K). Higher k means faster conduction. Copper therefore conducts best."),

    P("The thermal conductivity of still air is approximately what?",
      "Still air has a thermal conductivity of about 0.026 W/(m·K), which is why trapped air gives excellent insulation.",
      "A very low value near 0.03.",
      "Air is a poor conductor of heat, with k ≈ 0.026 W/(m·K). Water is about 0.6, which is over twenty times higher. Insulating materials like glass wool work by trapping layers of still air. Hence the low conductivity of air makes it an excellent insulator."),

    P("In the flat wall conduction formula Q = k·A·(T1 - T2)/L, what does L represent?",
      "L represents the wall thickness, through which the heat must be conducted from the hot face T1 to the cold face T2.",
      "The distance the heat travels.",
      "In Fourier’s law the temperature gradient is ΔT/Δx, and for a uniform wall Δx equals the thickness L. A thicker wall gives a smaller gradient and lower heat flow. The area A is the face area perpendicular to the heat flow. Hence L is the wall thickness."),

    P("In a series composite wall at steady state, how is the total thermal resistance obtained?",
      "The total thermal resistance is the arithmetic sum of the individual layer resistances, R = Σ(L/(k·A)) for all layers in series.",
      "Series resistances simply add.",
      "Each layer offers R_i = L_i/(k_i·A). Layers in series behave like electrical resistances in series. The total resistance is the sum of all the R_i values. The total heat flow is then the total ΔT divided by the total resistance. This is the electrical analogy for conduction."),

    P("Why does cylindrical heat conduction use the logarithmic ratio ln(r2/r1) instead of a simple thickness?",
      "Because the conduction area changes continuously with radius, and integrating the shell equations over the radial direction produces the logarithmic form ln(r2/r1).",
      "The area grows with radius.",
      "For a cylinder the area 2πrL grows as r increases. Combining with Fourier’s law for each shell and integrating from r1 to r2 gives Q = 2πkL(T1 - T2)/ln(r2/r1). The logarithm accounts for the varying area. A plain thickness formula would be wrong."),

    P("Which single change will most directly increase the rate of heat conduction through a wall?",
      "Increasing the thermal conductivity k of the wall material, increasing the area, reducing the thickness, or raising the temperature difference will each increase the conduction rate.",
      "Q = k·A·ΔT/L.",
      "Fourier’s law for a wall is Q = k·A·ΔT/L. Q rises with larger k and larger A. Q falls when L increases because the path gets longer. A larger ΔT directly increases Q. These are the four controlling factors."),

    P("In steady one-dimensional conduction through a flat slab of constant conductivity, the temperature profile is parabolic. Is this true or false?",
      "False; for constant k the steady temperature profile through a flat slab is linear, because the heat flux is uniform.",
      "Uniform flux gives a straight line.",
      "With constant k and steady heat flow, each unit of thickness must drop the same temperature. The gradient dT/dx is therefore constant through the slab. A constant gradient integrates to a straight line. Parabolic profiles appear only when k varies or when there is internal heat generation."),

    P("In steady-state conduction across a series composite wall, how does the heat flow compare in the different layers?",
      "The heat flow is identical in every layer, because steady state means no heat is stored or lost inside the wall.",
      "Series flow is the same everywhere.",
      "At steady state the energy entering each interface equals the energy leaving it. If the flow differed between layers, energy would accumulate and temperatures would change with time. Hence Q is equal through each resistive layer. Only the temperature drops across each layer differ."),

    P("Which fluid has the higher thermal conductivity: still air or water?",
      "Water, at about 0.6 W/(m·K), whereas still air is only about 0.026 W/(m·K).",
      "Water is over twenty times higher.",
      "The conductivity of water is roughly 0.6 W/(m·K). Air is about 0.026 W/(m·K). This difference is why water jackets cool engines far more effectively than pockets of air. Higher k lets water carry away heat by conduction. Thus water conducts much better than air."),

    P("What is the overall heat transfer coefficient U and what are its units?",
      "U is the combined conductance that accounts for all series resistances in the heat path, defined from Q = U·A·ΔT, and its SI units are W/(m²·K).",
      "W per square metre kelvin.",
      "U lumps together convective film resistances and conductive wall resistances into a single value. The defining equation is Q = U·A·ΔT with A the area normal to heat flow. Its units come out as W/(m²·K). Small U means well-insulated; large U means a good heat exchanger."),

    P("In overall heat transfer, what does the reciprocal 1/U equal for a plane wall between two fluids?",
      "1/U equals the sum of the inside film resistance 1/hi, the wall conduction L/k and the outside film resistance 1/ho.",
      "Add all the series resistances.",
      "The thermal circuit has three resistances in series: the fluid film, the wall, and the second film. By electrical analogy the total resistance is 1/U = 1/hi + L/k + 1/ho. Each term has units of m²·K/W. This relationship lets us compute U from the individual coefficients. The smallest coefficient often controls the rate."),

    P("What is the effect of fouling on heat-exchanger performance?",
      "Fouling deposits scale on the surfaces, adding extra thermal resistance, so the overall heat transfer coefficient drops and heat exchange becomes poorer.",
      "Deposits block the heat path.",
      "Fouling layers act as an extra conduction resistance in the thermal circuit. Adding resistance lowers U, the overall coefficient. Engineers therefore include a fouling factor in the design. Periodic cleaning restores the performance."),

    P("What does the fouling factor represent in heat-exchanger design?",
      "It is a design allowance for the extra thermal resistance created by scale, dirt or corrosion deposits that accumulate on the heat-transfer surface.",
      "Extra resistance from deposits.",
      "During operation, deposits build up on tube and shell surfaces. The fouling factor adds this unknown resistance into the 1/U sum. Designers select values from experience and standards. It ensures the exchanger still meets the duty before cleaning is scheduled."),

    P("For a cylindrical surface, if the existing radius is smaller than the critical radius rc = k/h, what happens when insulation is added?",
      "Adding insulation actually increases the heat loss until the radius reaches rc, because the added surface area outweighs the added conduction resistance.",
      "Small radii behave strangely.",
      "On a cylinder, extra insulation increases the outer area through which heat can leave. Below rc this area growth dominates the insulation resistance. Hence the heat loss rises with insulation thickness. Beyond rc the conduction resistance dominates and the loss falls. This is the critical radius phenomenon."),

    P("Compute the critical radius of insulation for a pipe with insulation conductivity k = 0.1 W/(m·K) and surface heat transfer coefficient h = 10 W/(m²·K).",
      "The critical radius is 0.01 m, that is 10 mm, from rc = k/h = 0.1/10.",
      "rc = k divided by h.",
      "Use the cylinder formula rc = k/h. Substituting gives 0.1 divided by 10 equals 0.01 m. That is 10 mm. Below this radius extra insulation increases the loss and above it decreases the loss. This governs insulation sizing on small wires and tubes."),

    P("Does the critical radius concept apply to a plane wall?",
      "No, a plane wall has no critical radius, so adding insulation to a flat wall always reduces heat loss.",
      "Only curved surfaces are affected.",
      "For a plane wall the surface area does not change when insulation is added. There is no area-growth effect to counteract the extra conduction resistance. So the heat loss always decreases with thickness. The critical radius only matters for cylinders and spheres."),

    P("Why does a critical radius exist for cylinders but not for plane walls?",
      "Because for a cylinder the outer surface area grows linearly with radius, so thin insulation can increase the area available for convection more than it adds conduction resistance.",
      "The area grows with radius.",
      "For a plane wall the convective area is fixed regardless of insulation thickness. For a cylinder the outer radius r increases with insulation, enlarging the surface area 2πrL. Below rc this extra area dominates. For the sphere a similar effect exists, so both have critical radii."),

    P("What is Newton’s law of cooling and what are the units of the heat transfer coefficient h?",
      "Newton’s law is Q = h·A·ΔT, and the convective heat transfer coefficient h has SI units of W/(m²·K).",
      "h appears in Q = h·A·ΔT.",
      "The law states that convective heat flow equals h times area times temperature difference. h summarises the convection performance at a surface. Its units are W/(m²·K), matching those of U. Typical values range from a few W/(m²·K) for free convection of gases up to many thousands for forced liquids."),

    P("Distinguish forced convection from natural convection by their driving mechanism.",
      "Forced convection is driven by an external device such as a fan or pump, whereas natural convection is driven by buoyancy from density differences.",
      "External agent versus buoyancy.",
      "In forced convection a fan, blower or pump pushes the fluid over the surface. Natural convection relies on hot fluid becoming lighter, rising, and cold fluid settling. Boiling loops and chimney draughts are natural; fans on radiators give forced flow. The forced mode gives higher h values."),

    P("What is the significance of the Grashof number?",
      "The Grashof number is the ratio of buoyancy to viscous forces and characterises the onset of laminar or turbulent flow in natural convection.",
      "It governs natural convection.",
      "The Grashof number, Gr = g·β·ΔT·L³/ν², compares rising buoyancy with the resisting viscosity. It plays in natural convection the role that the Reynolds number plays in forced flow. A high Gr means buoyancy dominates and turbulence is likely. It is therefore the key dimensionless group for free convection."),

    P("What is the Nusselt number and what does it physically represent?",
      "The Nusselt number, Nu = h·L/k, represents the ratio of convective heat transfer to conductive heat transfer through a fluid layer of thickness L.",
      "Convection versus conduction in the fluid.",
      "Nu compares the actual convection with pure conduction in the same fluid. Nu = 1 means heat moves as if by pure conduction. Larger Nu means convection is much more effective. It is used in correlations to compute h from dimensionless groups."),

    P("What is the Prandtl number and which physical properties define it?",
      "The Prandtl number is Pr = μ·cp/k, the ratio of momentum diffusivity to thermal diffusivity of the fluid.",
      "Momentum versus thermal diffusivity.",
      "Pr relates the momentum boundary layer to the thermal boundary layer. Kinematic viscosity ν = μ/ρ and thermal diffusivity α = k/(ρ·cp) give Pr = ν/α. Liquid metals have Pr far below 1, while oils have Pr much greater than 1. Air is about 0.7."),

    P("What does the Reynolds number signify and at what approximate value does pipe flow become turbulent?",
      "The Reynolds number is the ratio of inertia to viscous forces, and pipe flow becomes turbulent at about Re = 2300.",
      "2300 is the transition value.",
      "Re = ρ·u·D/μ compares flow inertia with viscous damping. Below about 2300 pipe flow is laminar with smooth streamlines. Above 2300 it turns turbulent with mixing eddies. Turbulent flow gives much higher convective heat transfer coefficients."),

    P("Define the Stanton number.",
      "The Stanton number is St = Nu/(Re·Pr) = h/(ρ·u·cp), the ratio of heat transferred to the thermal capacity of the flowing fluid.",
      "h divided by capacity flow rate.",
      "St compares the convective heat transfer coefficient with the thermal capacity per unit area of the stream. It appears in correlations for forced convection. Written as Nu over the product Re·Pr it has no length scale. It is useful in turbulent duct heat transfer problems."),

    P("At similar flow conditions, which fluid produces the higher convective heat transfer coefficient: water or air?",
      "Water, because its higher conductivity, density and specific heat give a far larger h than air at comparable velocities.",
      "Water beats air easily.",
      "Water has k of about 0.6 versus 0.026 for air. Water is also dense and has a high specific heat. These properties directly raise the value of h from Nusselt-number correlations. Consequently water-cooling jackets outperform air cooling for equivalent flow rates."),

    P("What is the approximate range of the heat transfer coefficient for free convection of gases?",
      "Free convection of gases gives h of roughly 5 to 25 W/(m²·K).",
      "Low single digit up to about 25.",
      "Without forced flow the buoyant motion is weak, so h stays small. Typical values for free convection of air are about 5 to 25 W/(m²·K). Forced convection of the same gas rises to about 25 to 250 W/(m²·K). This is why fins are needed on gas-cooled surfaces."),

    P("What order of magnitude is the heat transfer coefficient for forced convection of a gas?",
      "For forced convection of a gas, h is typically in the range of about 25 to 250 W/(m²·K).",
      "Tens to a few hundred.",
      "Forced blowers greatly strengthen the velocity and turbulence. That pushes the gas-side h from the free-convection band up to roughly 25 to 250 W/(m²·K). It remains well below forced-liquid values, which can reach thousands. The gas side is usually the controlling resistance, hence the fins."),

    P("What is the thermal boundary layer?",
      "The thermal boundary layer is the thin region adjacent to a heated or cooled surface in which the fluid temperature changes from the surface value to the free-stream value.",
      "Region of changing temperature near the surface.",
      "Far from the surface the fluid temperature equals the free-stream value. Very close to the surface the fluid is at the wall temperature. The layer where this full change happens is the thermal boundary layer. It grows along the flow direction and controls the surface heat transfer."),

    P("How do fins increase the heat that a surface can reject?",
      "Fins increase the effective surface area exposed to the fluid, which raises the total area in Q = h·A·ΔT and so increases heat rejection.",
      "More area, more heat.",
      "Fins are extended surfaces attached to the base. They add area on the fluid side without changing the base area much. Since convective loss is proportional to area, the total dissipation rises. Even though fins add conduction resistance, the area gain dominates when they are designed properly."),

    P("How is fin efficiency defined?",
      "Fin efficiency is the ratio of the actual heat transferred by the fin to the ideal heat that would be transferred if the entire fin were at the base temperature.",
      "Actual compared with the base-temperature ideal.",
      "Because fin material has conduction resistance, temperature falls along its length. The ideal performance assumes every part is at the base temperature, giving the maximum possible h·A·ΔT. Actual performance is lower, so the efficiency is below 1. Good fins have short length, high k and low h, keeping the efficiency close to 1."),

    P("On which side are fins most effective: the high-h liquid side or the low-h gas side?",
      "Fins are most effective on the low-h gas side, where the added surface area produces the largest increase in heat transfer.",
      "Fins cure low-h surfaces.",
      "When h is small, doubling the area nearly doubles the heat flow. On the liquid side h is already huge, so extra area helps little. Air-side surfaces therefore carry fins in radiators and condensers. This is why finned tubes are standard in gas-to-liquid heat exchangers."),

    P("Which application typically uses fins to improve heat dissipation?",
      "Air-cooled engine cylinders, radiator tubes and air-cooled heat exchangers use fins because the air-side heat transfer coefficient is low.",
      "Gas-side surfaces need fins.",
      "Air transfers heat poorly, so engine barrels carry cast fins to enlarge the cooling area. Radiator cores use fins between the water tubes to multiply the air contact surface. Finned-tube heat exchangers use them in air-conditioning. All of these rely on more area to offset the low gas-side h."),

    P("Statement: A fin of high thermal conductivity and short length approaches the ideal heat transfer. Is this true?",
      "True, because high k and short length reduce the conduction resistance, so the fin temperature stays close to the base temperature.",
      "Small temperature drop along the fin.",
      "The temperature drop along the fin depends on the conduction resistance, which falls with high k and short length. A nearly constant temperature means the whole fin acts at near-base temperature. Heat transfer then approaches the ideal value. Hence the efficiency rises towards 1."),

    P("What is a black body?",
      "A black body is an idealised surface that absorbs all incident radiation and, at the same time, is the best possible emitter for its temperature.",
      "Perfect absorber and emitter.",
      "A true black surface reflects no radiation and transmits none, so its absorptivity is 1. Kirchhoff’s law then implies its emissivity is also 1. It sets the upper limit of radiation that any real surface can emit. Real surfaces are compared against it using emissivity ε."),

    P("Write the Stefan–Boltzmann law and give the value of the Stefan–Boltzmann constant.",
      "The Stefan–Boltzmann law is Q = σ·A·T⁴, with σ = 5.67 × 10⁻⁸ W/(m²·K⁴).",
      "Q = σ·A·T⁴.",
      "Total radiation from a surface depends on the absolute temperature raised to the fourth power. For a black body Q = σ·A·T⁴. The constant σ is 5.67 × 10⁻⁸ W/(m²·K⁴). Doubling the absolute temperature raises the emission sixteen-fold, so radiation is decisive at high temperatures."),

    P("Between which limits does the emissivity of a real surface lie?",
      "Emissivity ε ranges from 0 to 1, with 1 for a perfect black body and 0 for a perfect reflector.",
      "Zero to one.",
      "Emissivity compares a real surface with an ideal black body. A mirror-like surface has ε near 0. A matte black surface can exceed 0.95. The value never exceeds 1 because no real surface can emit more than a black body. It also varies with temperature and wavelength."),

    P("For a surface, what is the relation among absorptivity α, reflectivity ρ and transmissivity τ?",
      "They always sum to unity: α + ρ + τ = 1, where α absorbs, ρ reflects and τ transmits the incident radiation.",
      "Absorption plus reflection plus transmission.",
      "Every incoming quantum of radiation is partitioned among the three mechanisms. For opaque solids τ = 0, so α + ρ = 1. For gases τ dominates. Since energy is neither created nor destroyed, the fractions always total one."),

    P("What does Kirchhoff’s law state about absorptivity and emissivity?",
      "At thermal equilibrium the absorptivity of a surface equals its emissivity, that is α = ε.",
      "They are equal at equilibrium.",
      "When a surface is in equilibrium with its surroundings, the energy it absorbs must balance the energy it emits at the same temperature. Radiation exchange then forces α = ε. This allows emissivity data to be used for absorption estimates. It assumes the absorptivity matches radiation at the surface temperature."),

    P("What is a gray body?",
      "A gray body is a real surface whose emissivity is constant and independent of wavelength, absorbing a fixed fraction of incident radiation at all wavelengths.",
      "Constant emissivity at all wavelengths.",
      "Real surfaces have emissivity that changes with wavelength and temperature. A gray surface idealises this with one constant ε. The gray assumption simplifies radiative exchange calculations. It is reasonably accurate for many engineering surfaces and gases."),

    P("What does Planck’s law describe?",
      "Planck’s law gives the spectral distribution of blackbody radiation, showing how emitted energy is spread with wavelength at a given temperature.",
      "Spectrum versus wavelength.",
      "Planck’s law predicts the energy emitted per unit wavelength by a black body. It shows the radiation rising to a peak and then falling with wavelength. The peak position shifts with temperature. Integrating the law over all wavelengths yields the Stefan–Boltzmann result."),

    P("According to Wien’s displacement law, what happens to the wavelength of peak emission as the surface temperature rises?",
      "The peak wavelength shifts to shorter values, because λ_max multiplied by T is constant at 2898 µm·K.",
      "Hotter means a shorter wavelength.",
      "Wien’s law is λ_max·T = 2898 µm·K. If T rises, λ_max must fall to keep the product constant. A red-hot body peaks in the red-infrared, while the much hotter sun peaks in the visible. This shift explains the change in colour with temperature."),

    P("In which wavelength region does the Sun’s peak radiation fall?",
      "The Sun’s peak radiation falls in the visible region, at about 0.5 µm, because its surface temperature is near 5800 K.",
      "Visible light.",
      "Applying Wien’s law with T = 5800 K gives λ_max = 2898/5800 ≈ 0.5 µm. The visible band spans roughly 0.4 to 0.7 µm, so the solar peak sits within it. This is why our eyes are tuned to the solar spectrum. The atmosphere also lets this band reach the ground."),

    P("Describe the greenhouse effect in terms of radiation.",
      "Shortwave solar radiation passes through the glass or atmosphere and is absorbed, while the longwave infrared re-emitted by the warm interior is trapped, raising the temperature.",
      "Shortwave in, longwave trapped.",
      "Incoming solar energy is mostly shortwave and easily transmitted. Surfaces absorb it and re-emit longwave infrared. This longwave cannot escape easily through the glass or the absorbing gases. Energy then accumulates and the temperature rises. The same principle warms closed cars and greenhouses."),

    P("Write the net radiant exchange between two black surfaces at temperatures T1 and T2.",
      "The net exchange is Q = σ·A·(T1⁴ - T2⁴) when the hotter surface at T1 sees the surface at T2.",
      "T1 fourth minus T2 fourth.",
      "Each black surface emits σ·A·T⁴ and absorbs all the radiation that reaches it from the other. The net flow is the emission minus the amount absorbed. That net is σ·A·(T1⁴ - T2⁴). If the temperatures are equal, the net is zero. The relationship requires absolute temperatures, not Celsius."),

    P("What is the net radiant exchange between two infinite parallel gray plates of emissivities ε1 and ε2?",
      "Q = σ·A·(T1⁴ - T2⁴)/(1/ε1 + 1/ε2 - 1) for two large parallel gray plates facing each other.",
      "Denominator with the two emissivities.",
      "Real surfaces emit less than black bodies and reflect some incoming radiation. For infinite parallel plates the reflected components bounce back and forth endlessly. Summing the series gives the factor 1/(1/ε1 + 1/ε2 - 1). If both surfaces are black, the factor becomes 1 and the law reduces to the black-body formula."),

    P("How do radiation shields reduce heat transfer between two surfaces?",
      "Radiation shields are thin low-emissivity sheets placed between surfaces that reflect a large share of the radiation, drastically cutting the net exchange.",
      "Low-emissivity reflectors in between.",
      "Each shield adds two reflection steps and a small gas-gap resistance. The radiant energy must cross these additional resistive steps. Because radiative transfer depends on the fourth power of temperature, small emissivity cuts are powerful. One shield can nearly halve the transfer between large parallel plates."),

    P("What is a view factor in radiation analysis?",
      "The view factor F12 is the fraction of the radiation leaving surface 1 that strikes surface 2 directly, and it depends only on geometry.",
      "Fraction leaving one surface that directly hits the other.",
      "The view factor accounts for the angle and distance between the surfaces. The sum of the view factors from any surface equals 1, since all its radiation reaches some surface. For a small surface enclosed by a large one, the factor approaches 1. Multiply it by the emitted power to get the fraction that arrives."),

    P("Statement: A surface that is a good absorber of radiation is also a good emitter. Is this true or false?",
      "True; by Kirchhoff’s law a good absorber has high absorptivity and therefore high emissivity, so it emits well, and a poor absorber emits poorly.",
      "Absorption and emission go together.",
      "Kirchhoff’s law connects absorptivity to emissivity for surfaces in equilibrium. A matte black paint absorbs strongly and radiates strongly. A bright polished metal both reflects and emits poorly. Hence the rule holds that good absorbers are good emitters. It is a central idea in radiative surface design."),

    P("A black body at 1000 K radiates how much power per square metre?",
      "A black body at 1000 K radiates σ·T⁴ = 5.67 × 10⁻⁸ × (1000)⁴ = 5.67 × 10⁴ W/m², which is 56.7 kW/m².",
      "σ times 1000 to the fourth.",
      "Emission per unit area of a black body is σ·T⁴ with T in kelvin. 1000 raised to the fourth power is 10¹². Multiplying by 5.67 × 10⁻⁸ gives 5.67 × 10⁴ W/m². That is 56.7 kW/m². This shows how intense radiation is at high absolute temperatures."),

    P("What does LMTD stand for in heat-exchanger analysis?",
      "LMTD stands for log mean temperature difference, the effective average temperature driving force between the hot and cold fluids in a heat exchanger.",
      "Log mean temperature difference.",
      "Along the exchanger the temperature difference between the two fluids changes continuously. The LMTD is a weighted average of the end differences ΔT1 and ΔT2. It is defined as (ΔT1 - ΔT2)/ln(ΔT1/ΔT2). Using LMTD together with Q = U·A·LMTD gives the required area."),

    P("In a heat exchanger operating with the same terminal temperatures, which type gives the higher LMTD and hence the smaller area?",
      "Counterflow gives the higher LMTD and therefore requires a smaller heat-transfer area for the same duty.",
      "Counterflow wins.",
      "In counterflow the hot and cold streams move in opposite directions, so the temperature difference stays more uniform. In parallel flow one end difference becomes small, dragging down the LMTD. Since Q = U·A·LMTD, a larger LMTD shrinks A. Counterflow also lets the cold stream approach the hot inlet temperature."),

    P("Write the LMTD formula in terms of the end temperature differences.",
      "LMTD = (ΔT1 - ΔT2)/ln(ΔT1/ΔT2), where ΔT1 and ΔT2 are the temperature differences at the two ends of the exchanger.",
      "Difference divided by the log of the ratio.",
      "ΔT1 and ΔT2 are the hot-minus-cold differences at each end. When the differences are not too unequal, the LMTD lies between them. For a condenser with a saturated vapour, ΔT1 = ΔT2 and the formula reduces to that constant value. The arithmetic mean overestimates the true driving force."),

    P("Define the effectiveness of a heat exchanger.",
      "The effectiveness ε is the ratio of the actual heat transferred to the maximum possible heat that could be transferred with infinite area in counterflow.",
      "Actual over the maximum possible.",
      "The maximum possible transfer is limited by the stream with the smaller capacity rate. Effectiveness is most useful when the inlet temperatures are known but the outlet values are not. It is often plotted against the number of transfer units NTU and the capacity ratio. Values range from 0 to 1."),

    P("Which flow arrangement allows the cold stream to leave at a temperature closest to the hot inlet temperature?",
      "Counterflow, because the hottest part of the hot stream meets the exit of the cold stream, enabling the cold outlet to approach the hot inlet temperature.",
      "Hot inlet meets the cold outlet.",
      "In counterflow the far ends carry the extreme temperatures. The cold outlet faces the hot inlet, so the cold stream can leave hotter than it could in parallel flow. In parallel flow the two streams approach a common temperature, limiting recovery. Hence counterflow recovers the most heat."),

    P("What is the purpose of thermal insulation and which materials are commonly used?",
      "Insulation reduces unwanted heat gain or loss; common materials are glass wool, cork, mineral wool and foamed plastics with trapped-gas structures.",
      "Low-k materials block heat flow.",
      "Insulating materials have very low thermal conductivity, mostly because they trap still air or gas. Glass wool and mineral wool are mats of fine fibres used in buildings and pipes. Cork is a natural cellular insulator for refrigeration. The aim is to keep k as low as possible."),

    P("Why is asbestos no longer recommended as an insulating material?",
      "Asbestos is discouraged because its fibres are a serious health hazard; inhaling them causes lung disease and cancer, so substitutes are now preferred.",
      "Health hazard from fibres.",
      "Asbestos has fine, sharp fibres that scatter when damaged or cut. Inhaled fibres can remain in the lungs and cause asbestosis and mesothelioma. Modern regulations classify it as a carcinogen. Hence materials such as mineral wool and glass wool have replaced it in practice."),

    P("Why do cold storage and refrigeration installations add bright aluminium foils to the insulation?",
      "The foils form low-emissivity reflective barriers that reduce radiant heat gain, which becomes significant when the temperature difference to the surroundings is large.",
      "Radiation matters at low temperatures.",
      "Even with good conductive insulation, radiation across cavities still leaks heat in. Polished aluminium has a very low emissivity, reflecting most infrared. Radiant heat gain is then cut sharply. Combined with the low-k material, this gives effective insulation for cold rooms."),

    P("A parallel-flow heat exchanger has hot fluid entering at 120 °C and leaving at 80 °C while the cold fluid enters at 30 °C and leaves at 60 °C. What is the LMTD?",
      "The LMTD is about 46.5 °C, computed from the end differences of 90 °C and 20 °C as 70/ln(4.5).",
      "ΔT1 = 90, ΔT2 = 20.",
      "For parallel flow, ΔT1 = 120 - 30 = 90 °C at the inlet end and ΔT2 = 80 - 60 = 20 °C at the outlet end. So LMTD = (90 - 20)/ln(90/20) = 70/ln(4.5). Since ln(4.5) ≈ 1.504, the LMTD ≈ 46.5 °C. The value lies between 20 and 90 °C and below the arithmetic mean of 55 °C."),

    P("A counterflow exchanger has hot fluid entering at 120 °C and leaving at 80 °C while the cold fluid enters at 30 °C and leaves at 60 °C. How does its LMTD compare with the parallel-flow value of about 46.5 °C?",
      "The counterflow LMTD is about 54.9 °C, larger than the parallel-flow value, because the end differences are 60 °C and 50 °C.",
      "ΔT1 = 60, ΔT2 = 50.",
      "In counterflow the hot inlet at 120 °C meets the cold outlet at 60 °C, so ΔT1 = 60 °C. The hot outlet at 80 °C meets the cold inlet at 30 °C, so ΔT2 = 50 °C. Then LMTD = (60 - 50)/ln(60/50) = 10/ln(1.2) ≈ 54.9 °C. This exceeds the 46.5 °C of parallel flow, so counterflow needs less area."),

    P("A wall has an area of 10 m², a thickness of 0.2 m and a conductivity of 0.8 W/(m·K), with face temperatures of 100 °C and 60 °C. What is the rate of heat conduction?",
      "The conduction rate is 1600 W, since Q = k·A·ΔT/L = 0.8 × 10 × 40/0.2.",
      "Q = k·A·ΔT/L.",
      "The temperature difference is 100 - 60 = 40 K. Substituting k = 0.8, A = 10, ΔT = 40 and L = 0.2 into Q = k·A·ΔT/L gives 0.8 × 10 × 40 = 320, and 320/0.2 = 1600. The heat flow is therefore 1600 W. All the units cancel correctly to watts."),

    P("A composite wall has two layers with per-area resistances of 0.25 and 0.75 m²·K/W between faces at 100 °C and 0 °C. Find the heat flux and the interface temperature.",
      "The heat flux is 100 W/m² and the interface temperature is 75 °C, because the total resistance is 1.0 m²·K/W over a 100 K drop.",
      "Total R = 1.0; drop across the first layer is 25 K.",
      "The total resistance per area is 0.25 + 0.75 = 1.0 m²·K/W. The total temperature drop is 100 - 0 = 100 K. The heat flux is 100/1.0 = 100 W/m². The drop across the first layer is 100 × 0.25 = 25 K. So the interface sits at 100 - 25 = 75 °C."),

    P("An insulated pipe has an inner radius of 25 mm, an outer radius of 50 mm, a conductivity of 0.25 W/(m·K) and surface temperatures of 150 °C and 50 °C. What is the heat loss per metre of length?",
      "The heat loss is about 227 W/m, from Q/L = 2πk(T1 - T2)/ln(r2/r1) = 2π × 0.25 × 100/ln(2).",
      "Q/L = 2πk·ΔT / ln(r2/r1).",
      "The temperature difference is 150 - 50 = 100 K and r2/r1 = 50/25 = 2, so ln(2) ≈ 0.693. Substituting gives Q/L = 2π × 0.25 × 100/0.693 ≈ 157.08/0.693 ≈ 226.6 W/m. Rounding gives about 227 W/m. This is the heat leaking from each metre of the insulated pipe."),

    P("A furnace wall of conductivity 1 W/(m·K) and thickness 0.1 m has hot gas at 200 °C with h = 5 W/(m²·K) inside and air at 0 °C with h = 10 W/(m²·K) outside. Compute the heat flux.",
      "The heat flux is 500 W/m², because U = 1/(1/5 + 0.1/1 + 1/10) = 2.5 W/(m²·K) and q = U × 200.",
      "Sum the three series resistances.",
      "The film resistances are 1/5 = 0.2 and 1/10 = 0.1 m²·K/W, and the wall adds 0.1/1 = 0.1 m²·K/W. The total resistance is 0.2 + 0.1 + 0.1 = 0.4 m²·K/W. Hence U = 1/0.4 = 2.5 W/(m²·K). With ΔT = 200 K, the flux is q = 2.5 × 200 = 500 W/m²."),

    P("Two black surfaces of area 2 m² face each other at 1000 K and 500 K. What is the net radiant exchange?",
      "The net exchange is about 106.3 kW, given by σ·A·(1000⁴ - 500⁴).",
      "σ·A·(T1⁴ - T2⁴).",
      "1000 to the fourth is 10¹² and 500 to the fourth is 6.25 × 10¹⁰. Their difference is 9.375 × 10¹¹. Multiplying by σ = 5.67 × 10⁻⁸ gives 53156 W per m². Times the 2 m² area yields 106312 W, which is about 106.3 kW."),

    P("Air at 20 °C flows over a plate of area 0.5 m² kept at 100 °C with h = 100 W/(m²·K). How much heat is transferred?",
      "The heat transferred is 4000 W, from Q = h·A·ΔT = 100 × 0.5 × 80.",
      "Q = h·A·ΔT.",
      "The temperature difference is 100 - 20 = 80 K. Multiplying h = 100 by the area 0.5 m² gives a conductance of 50 W/K. Multiplying by 80 K yields 4000 W. The plate rejects 4 kW to the air."),

    P("Using Wien’s law, what is the wavelength of peak emission for a black body at 1000 K?",
      "λ_max is about 2.9 µm, because λ_max = 2898 µm·K divided by 1000 K equals 2.898 µm.",
      "2898 divided by T in kelvin.",
      "Wien’s law is λ_max·T = 2898 µm·K. Setting T = 1000 K gives λ_max = 2898/1000 = 2.898 µm. This lies in the infrared region. A body at 1000 K therefore glows a dull red with the bulk of its radiation in the infrared."),

    P("A fin transfers 30 W in practice, but if the whole fin were at the base temperature it would transfer 40 W. What is the fin efficiency?",
      "The fin efficiency is 75%, found as the ratio 30 W/40 W.",
      "Actual divided by the ideal.",
      "Fin efficiency is the actual heat divided by the ideal heat with the fin uniformly at the base temperature. Dividing 30 by 40 gives 0.75. In percentage this is 75%. The value is below 100% because conduction resistance causes a temperature drop along the fin."),

    P("What is the emissive power per unit area of a black body at 2000 K?",
      "It is 907.2 kW/m², computed as σ × (2000)⁴ = 5.67 × 10⁻⁸ × 1.6 × 10¹³.",
      "σ times T to the fourth.",
      "2000 raised to the fourth power is 1.6 × 10¹³. Multiplying by σ = 5.67 × 10⁻⁸ gives 907200 W/m². Converting to kilowatts gives 907.2 kW/m². The sixteen-fold increase over the 56.7 kW/m² at 1000 K shows how strongly the T⁴ law dominates radiation."),

    P("At approximately what wavelength does the Sun, at 5800 K, emit its maximum radiation?",
      "The Sun’s peak wavelength is about 0.5 µm, since 2898/5800 ≈ 0.5 µm, placing it in the visible region.",
      "2898 divided by 5800.",
      "Wien’s law gives λ_max = 2898 µm·K / 5800 K = 0.4997 µm. This is approximately 0.5 µm. The visible band runs roughly from 0.4 to 0.7 µm, so the solar peak falls in the visible. This confirms why sunlight appears white-bright and drives photosynthesis through visible-light absorption.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC4_HEATT;
  if (typeof window !== "undefined") window.SSC_JE_ENC4_HEATT = SSC_JE_ENC4_HEATT;
})();
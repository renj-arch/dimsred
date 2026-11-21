(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC4_STEAMN = {};
  SSC_JE_ENC4_STEAMN.steamnozz = [

    P("What is the primary function of a steam nozzle?",
      "A steam nozzle converts the pressure energy and the enthalpy (heat drop) of steam into kinetic energy of a high-velocity steam jet.",
      "It is an energy-conversion duct.",
      "A steam nozzle is a duct of gradually varying area through which steam flows and expands. As the pressure falls, the enthalpy drops and this heat drop appears as kinetic energy. The result is a high-velocity steam jet used for driving turbine blades or producing thrust. Thus the nozzle converts heat and pressure energy into kinetic energy."),

    P("What are the two main types of steam nozzles used in practice?",
      "The convergent nozzle and the convergent-divergent (De Laval) nozzle.",
      "One narrows; the other narrows then widens.",
      "The convergent nozzle has a cross-sectional area that decreases continuously toward the outlet. The convergent-divergent or De Laval nozzle first converges to a minimum section called the throat and then diverges toward the exit. The choice between them depends on the pressure ratio to be handled. For subcritical pressure drops a convergent nozzle suffices, while supersonic flow requires the convergent-divergent form."),

    P("When is a simple convergent nozzle sufficient for steam expansion?",
      "When the back pressure is equal to or higher than the critical pressure.",
      "Compare the back pressure with the critical pressure.",
      "A convergent nozzle can reduce the steam pressure only down to the critical pressure. If the back pressure is greater than or equal to the critical pressure, the required pressure drop can be achieved without any divergent section. Under this condition the exit velocity never exceeds the sonic value. Hence a convergent nozzle alone is adequate when the back pressure is at or above the critical pressure."),

    P("When is a convergent-divergent nozzle necessary in steam flow?",
      "When the back pressure is lower than the critical pressure.",
      "Supersonic flow needs a diverging duct.",
      "When the back pressure is less than the critical pressure the steam must expand below the critical value. After the throat the velocity has become sonic and further expansion requires a divergent section to reach supersonic velocity. A convergent-only nozzle can never attain such low outlet pressures. Therefore a convergent-divergent nozzle is used whenever the back pressure is below the critical pressure."),

    P("In a convergent-divergent nozzle, at which section does the steam velocity become equal to the velocity of sound?",
      "At the throat, which is the section of minimum cross-sectional area.",
      "The neck of the nozzle.",
      "The throat is the minimum-area section located between the convergent and divergent parts of a De Laval nozzle. The steam accelerates through the convergent portion and reaches the local velocity of sound exactly at the throat. Here the pressure equals the critical pressure and the Mach number is unity. Beyond the throat the diverging section accelerates the steam further into the supersonic range."),

    P("What is a De Laval nozzle?",
      "A convergent-divergent nozzle that produces supersonic steam velocity for subcritical back pressures.",
      "Named after its inventor.",
      "The De Laval nozzle consists of a convergent portion, a throat of minimum area, and a divergent portion. It is used when the exit pressure is lower than the critical pressure so that the steam must be expanded beyond the sonic point. The throat guides the flow through the sonic condition while the divergent cone completes the expansion. Steam turbines and rocket nozzles commonly employ this type."),

    P("During flow through a nozzle, what happens to the pressure and the enthalpy of the steam?",
      "Both pressure and enthalpy decrease while the velocity increases.",
      "Energy is transferred to kinetic form.",
      "As steam flows through a nozzle its pressure falls continuously along the duct. The corresponding enthalpy drop supplies the energy that appears as kinetic energy of the jet. Hence the pressure and enthalpy decrease while the velocity steadily increases. This is the principle on which all nozzle calculations are based."),

    P("Which energy relation is used to convert the heat drop into kinetic energy in a nozzle?",
      "The steady-flow energy equation, giving exit velocity c = √(2·Δh) for negligible inlet velocity.",
      "Steady flow energy balance.",
      "Applying the steady-flow energy equation to a nozzle with negligible heat loss and no work transfer, the kinetic energy gained equals the enthalpy drop. For negligible inlet velocity the exit velocity is given by c = √(2·Δh) with Δh in J/kg. Expressing the heat drop in kJ/kg, the velocity comes out as 44.72√Δh m/s. This is the fundamental velocity relation for nozzle flow."),

    P("In the convergent portion of a nozzle, how do velocity and pressure vary along the flow direction?",
      "Velocity increases while pressure decreases along the flow.",
      "Acceleration requires falling pressure.",
      "In the convergent section the duct area reduces, so the steam accelerates as required by the continuity equation. The acceleration is produced by a corresponding fall in pressure and enthalpy. Thus along the convergent portion the velocity rises and the pressure falls. This continues until the critical pressure is reached at the throat."),

    P("At the throat of a convergent-divergent nozzle, the pressure of the steam is equal to which value?",
      "The critical pressure corresponding to the given initial conditions.",
      "The throat is the critical section.",
      "The throat is the very section where the velocity of the steam attains the velocity of sound. At this point the pressure equals the critical pressure for the given initial state. The critical pressure is found by multiplying the initial pressure by the critical pressure ratio. Thereafter the pressure continues to fall in the divergent portion toward the back pressure."),

    P("What is meant by the critical pressure ratio of a nozzle?",
      "It is the ratio of the throat pressure to the initial pressure at which the discharge becomes maximum and the throat velocity is sonic.",
      "Ratio of throat pressure to supply pressure.",
      "The critical pressure ratio is defined as the ratio of the critical (throat) pressure to the initial pressure of the steam. For a given initial state it is a fixed value depending only on the index n of expansion. At this ratio the maximum discharge occurs because the throat velocity is sonic. It is usually denoted as pc/p1."),

    P("What is the critical pressure ratio for dry saturated steam expanding in a nozzle?",
      "Approximately 0.577, obtained with the index n equal to 1.135.",
      "Use n = 1.135.",
      "For dry saturated steam the index of expansion n is taken as 1.135. Substituting n = 1.135 in (2/(n+1))^(n/(n-1)) gives about 0.577. This means the throat pressure is 57.7 percent of the initial pressure. It is one of the most commonly quoted critical pressure ratio values in nozzle theory."),

    P("What is the critical pressure ratio for superheated steam flowing through a nozzle?",
      "Approximately 0.546, obtained with the index n equal to 1.30.",
      "Use n = 1.3.",
      "For superheated steam the adiabatic index n is taken as 1.30. Putting n = 1.3 into the critical pressure ratio formula gives 0.5457, rounded to 0.546. Superheated steam therefore has a lower critical pressure ratio than dry saturated steam. This value is used whenever the initial steam is superheated."),

    P("What is the approximate critical pressure ratio for wet steam flowing through a nozzle?",
      "Approximately 0.586, obtained with an index n of about 1.035.",
      "Use n ≈ 1.035.",
      "For wet steam the index of expansion n is taken as about 1.035. Applying the usual formula the critical pressure ratio works out to about 0.586. Wet steam therefore gives a slightly higher critical pressure ratio than dry saturated steam. Many textbooks quote this value for very wet steam conditions."),

    P("Write the general expression for the critical pressure ratio of steam in terms of the index n.",
      "pc/p1 = (2/(n+1))^(n/(n-1)).",
      "Formula involves 2 over n plus 1.",
      "The critical pressure ratio is obtained from the condition for maximum discharge through the nozzle. Differentiating the mass flow equation with respect to pressure and equating to zero gives the result. For steam it is expressed as (2/(n+1))^(n/(n-1)). Substituting the appropriate value of n gives the numerical critical pressure ratio."),

    P("What is special about the velocity of steam at the throat when the discharge is maximum?",
      "It equals the local velocity of sound and the flow is said to be choked or critical.",
      "Sonic velocity at the throat.",
      "At the throat the pressure equals the critical pressure and the velocity equals the local velocity of sound. This condition gives the maximum rate of discharge for the given initial state. Sound waves cannot travel upstream against this flow, so no disturbance can reach the nozzle inlet. The flow is then called choked or critical flow."),

    P("What is the condition for the maximum rate of discharge through a steam nozzle?",
      "The outlet pressure must equal the critical pressure for the given inlet conditions.",
      "Outlet pressure equals the throat pressure.",
      "The rate of discharge through a nozzle reaches its maximum when the pressure at the throat becomes equal to the critical pressure. At this instant the throat velocity equals the velocity of sound. Any further reduction in back pressure does not increase the flow rate. This condition is known as choking and is fundamental to nozzle design."),

    P("Evaluate (2/2.3)^(1.3/0.3) for a nozzle flow problem.",
      "0.5457, which is approximately 0.546.",
      "This is the n = 1.3 case.",
      "The expression is the critical pressure ratio formula with n equal to 1.3. Evaluating 2/2.3 gives 0.8696 while the exponent 1.3/0.3 equals 4.333. Raising 0.8696 to the power 4.333 gives 0.5457. Hence the critical pressure ratio for n = 1.3 is about 0.546."),

    P("Steam at 10 bar is supplied to a nozzle. If the critical pressure ratio is 0.577, what is the critical pressure in bar?",
      "5.77 bar.",
      "Multiply the supply pressure by the ratio.",
      "The critical pressure is found by multiplying the initial pressure by the critical pressure ratio. Here 10 bar × 0.577 equals 5.77 bar. The throat of the nozzle will therefore work at about 5.77 bar before supersonic expansion begins. This value is typical of dry saturated steam using the ratio 0.577."),

    P("Why does superheated steam have a lower critical pressure ratio than dry saturated steam?",
      "Because the index n is higher for superheated steam, and the critical pressure ratio falls as n increases.",
      "Compare n = 1.3 with n = 1.135.",
      "The critical pressure ratio depends directly on the value of the index n. Superheated steam has an index of about 1.30 whereas dry saturated steam has about 1.135. Since a higher n gives a smaller value of (2/(n+1))^(n/(n-1)), the superheated ratio of 0.546 is lower than 0.577. Hence the throat pressure for superheated steam is a smaller fraction of the supply pressure."),

    P("What is the Mach number of steam at the throat of a De Laval nozzle under design conditions?",
      "Exactly 1, because the throat velocity equals the local velocity of sound.",
      "Sonic condition.",
      "Mach number is the ratio of the local velocity to the local velocity of sound. Under the condition of maximum discharge the throat velocity is sonic. Therefore the Mach number at the throat is unity. The flow upstream of the throat is subsonic and downstream in the diverging part it becomes supersonic."),

    P("The velocity of sound in steam is expressed by which relation?",
      "√(n·p·v), or equivalently √(n·R·T).",
      "Sound speed depends on pressure and specific volume.",
      "The velocity of sound in a compressible medium is given by the square root of the product of the index n, the pressure p and the specific volume v. Using the ideal gas law p·v = R·T this may also be written as √(n·R·T). At the throat of a nozzle the critical velocity equals this value. This is why the throat velocity is called the sonic velocity."),

    P("Which formula gives the mass flow rate of steam through a nozzle?",
      "m = A·c/v, where A is the area, c the velocity and v the specific volume.",
      "Continuity equation.",
      "The continuity equation states that the rate of mass flow is the product of area, velocity and density. Since density ρ equals the reciprocal of specific volume, m = A·c/v. This relation is used at the throat to size the nozzle for a required discharge. It applies at every section of the nozzle for one-dimensional steady flow."),

    P("What is the effect on the mass flow rate if the back pressure of a choked nozzle is lowered further below the critical pressure?",
      "The mass flow rate remains unchanged at its maximum value.",
      "Once choked, the flow is fixed.",
      "Once the throat velocity reaches sonic and the throat pressure equals the critical pressure, the discharge is at its maximum. Lowering the back pressure still further does not increase the flow because the disturbance cannot travel upstream past the sonic throat. The nozzle is then said to be choked. Flow can only increase if the inlet pressure is raised or the throat area is enlarged."),

    P("Calculate the mass flow rate in kg/s through a nozzle throat of area 0.001 m² if the steam velocity is 900 m/s and the specific volume is 0.5 m³/kg.",
      "1.8 kg/s.",
      "Use m = A·c/v.",
      "The mass flow rate is obtained from the continuity relation m = A·c/v. Substituting A = 0.001 m², c = 900 m/s and v = 0.5 m³/kg gives m = 0.001 × 900 / 0.5. The result is 1.8 kg/s."),

    P("Determine the throat area in mm² required to pass 2 kg/s of steam at a sonic velocity of 1000 m/s and a specific volume of 0.3 m³/kg.",
      "600 mm².",
      "Area = m·v divided by c.",
      "Rearranging m = A·c/v gives A = m·v/c. Inserting m = 2 kg/s, v = 0.3 m³/kg and c = 1000 m/s gives A = 0.0006 m². Converting to square millimetres by multiplying by 10⁶ gives 600 mm²."),

    P("A nozzle passes 5 kg/s of steam. If the velocity at the throat is 600 m/s and the specific volume is 0.3 m³/kg, what area is needed at the throat in mm²?",
      "2500 mm².",
      "Use A = m·v/c.",
      "From the continuity equation the required area is A = m·v/c. Substituting m = 5 kg/s, v = 0.3 m³/kg and c = 600 m/s gives A = 0.0025 m². Expressing this area in square millimetres gives 2500 mm²."),

    P("Find the mass flow rate in kg/s when steam at 800 m/s and specific volume 0.4 m³/kg flows through a throat of area 0.0005 m².",
      "1 kg/s.",
      "Multiply the area by the velocity and divide by the specific volume.",
      "Using the continuity relation m = A·c/v with A = 0.0005 m², c = 800 m/s and v = 0.4 m³/kg, the mass flow becomes 0.0005 × 800 / 0.4. This evaluates to 1 kg/s. The throat therefore passes exactly one kilogram of steam per second."),

    P("At which pressure ratio does the discharge through a convergent-divergent nozzle become maximum?",
      "At the critical pressure ratio, when the exit pressure equals the critical pressure.",
      "Critical pressure ratio.",
      "The discharge rises as the outlet pressure falls from the supply pressure toward the critical value. When the exit pressure reaches the critical pressure the flow is maximum. Below that pressure the flow remains constant because the throat is choked. Thus the maximum discharge occurs at the critical pressure ratio."),

    P("Compute the throat area in m² for a nozzle passing 1.5 kg/s of steam at 750 m/s with a specific volume of 0.5 m³/kg.",
      "0.001 m².",
      "A = m·v/c.",
      "The required area is A = m·v/c from the continuity relation. With m = 1.5 kg/s, v = 0.5 m³/kg and c = 750 m/s, A = 1.5 × 0.5 / 750. This gives 0.001 m², which is 1000 mm²."),

    P("What is supersaturated steam in a nozzle?",
      "Steam that remains in the vapour phase below the saturation temperature for its pressure without condensing.",
      "Vapour persists below the saturation line.",
      "During very rapid expansion in a nozzle the steam crosses the saturation line but condensation does not occur immediately. The steam then exists in a metastable vapour state below the saturation temperature of its pressure. Such steam is called supersaturated steam. It is also known as metastable steam and behaves partly like a superheated vapour."),

    P("What is the other name commonly used for supersaturated steam?",
      "Metastable steam.",
      "A state of temporary stability.",
      "Supersaturated steam is also called metastable steam because it exists in an unstable equilibrium state. A small disturbance would cause the vapour to condense suddenly. The term metastable indicates that the state is thermodynamically unstable yet persists during the short residence time in the nozzle. The phenomenon is also associated with the Wilson line where condensation finally occurs."),

    P("How does supersaturation affect the mass flow rate through a nozzle compared with equilibrium flow?",
      "The discharge is slightly less than that calculated by the equilibrium analysis.",
      "Standard textbook result for supersaturation.",
      "In supersaturated flow part of the available heat drop is not released because condensation does not occur at the saturation line. As a result the actual discharge of steam is slightly less than the value predicted by the equilibrium wet-steam calculation. The exit velocity is also slightly lower than the theoretical value. This small reduction is a recognised result of the supersaturated or metastable expansion."),

    P("What effect does supersaturation have on the entropy and the reversibility of the expansion process in a nozzle?",
      "It increases entropy and makes the process irreversible.",
      "Loss of available energy.",
      "Supersaturated expansion does not follow the ideal reversible path. Because condensation is delayed and internal readjustment occurs later, the process is accompanied by an increase in entropy. This entropy production represents an irreversible loss of available energy. Hence supersaturated flow is always slightly irreversible compared with ideal equilibrium expansion."),

    P("When is a steam nozzle said to be under-expanded?",
      "When the exit pressure is greater than the back pressure, so the divergent portion is too short.",
      "Exit pressure exceeds the back pressure.",
      "A nozzle is under-expanded when the steam leaves at a pressure higher than the back pressure. This happens when the divergent portion is shorter than the design length. The steam then undergoes further expansion outside the nozzle in the form of a jet. The design intent of full expansion inside the duct is not achieved."),

    P("When is a steam nozzle said to be over-expanded?",
      "When the exit pressure is less than the back pressure, causing a shock wave inside the nozzle.",
      "Exit pressure below the back pressure.",
      "Over-expansion occurs when the divergent portion is longer than required so the exit pressure falls below the back pressure. The steam is expanded too much inside the nozzle and a shock wave forms to match the back pressure. This shock causes a loss of kinetic energy and efficiency. Designers normally size the divergent cone so that the exit pressure equals the back pressure."),

    P("What is meant by the degree of undercooling in supersaturated flow?",
      "The amount by which the steam temperature falls below the saturation temperature corresponding to its pressure.",
      "Temperature shortfall below saturation.",
      "In supersaturated flow the steam continues to expand without condensing, so its temperature falls below the saturation temperature of the prevailing pressure. The degree of undercooling is the difference between the saturation temperature and the actual temperature of the steam. At the point where condensation suddenly occurs the undercooling can be as large as 30 to 40 °C. This measure quantifies how far the metastable vapour travels below the saturation line."),

    P("During supersaturated nozzle expansion, when does the condensation of the steam finally occur?",
      "It is delayed until the steam reaches sufficient undercooling, after which sudden condensation takes place.",
      "Condensation is delayed, not removed.",
      "In a supersaturated expansion the steam passes through the saturation line without condensing. Condensation does not start until the degree of undercooling becomes large enough to trigger nucleation. At that point water droplets form suddenly, releasing the latent heat that was withheld. This sudden condensation occurs along what is known as the Wilson line on the state diagram."),

    P("What is the velocity coefficient of a nozzle?",
      "The ratio of the actual velocity of steam at the exit to the theoretical frictionless velocity.",
      "Actual velocity divided by ideal velocity.",
      "The velocity coefficient accounts for the reduction in velocity caused by friction inside the nozzle. It is defined as the ratio of the actual exit velocity to the ideal or theoretical velocity. Since friction always opposes flow, the coefficient is always less than unity. Its typical value for a well-shaped nozzle lies between 0.95 and 0.99."),

    P("How is the nozzle efficiency defined?",
      "As the ratio of the actual heat drop to the isentropic heat drop, equal to the actual exit velocity squared divided by the ideal velocity squared.",
      "Actual over isentropic heat drop.",
      "Nozzle efficiency η compares the energy actually converted with the maximum possible conversion. It is defined as the actual enthalpy drop divided by the isentropic enthalpy drop between the same pressures. Since kinetic energy is proportional to velocity squared, it is also equal to Vactual²/Videal². Values typically range from 0.85 to 0.95."),

    P("How does friction in a nozzle affect the exit velocity of steam?",
      "It reduces the exit velocity below the ideal frictionless value.",
      "Friction wastes part of the heat drop.",
      "Friction dissipates part of the available heat drop into heat instead of kinetic energy. Consequently the kinetic energy available at the exit is less than the ideal value. The exit velocity therefore falls below the theoretical velocity obtained from the isentropic heat drop. This reduction is quantified using the velocity coefficient."),

    P("What is the effect of friction on the mass flow rate through a nozzle?",
      "It slightly reduces the discharge compared with the frictionless case.",
      "Flow is retarded by wall friction.",
      "Friction retards the steam and increases its entropy and specific volume at a given section. The product of velocity and density is therefore slightly altered. In practice the effect on discharge is small but the mass flow is slightly less than the theoretical value. This is why actual nozzles pass marginally less steam than calculated."),

    P("What is the usual included angle of the divergent cone of a De Laval nozzle?",
      "About 10° to 12°.",
      "Keep the divergence small to avoid losses.",
      "The divergent portion of a De Laval nozzle is made conical with a small included angle. The commonly used included angle is about 10° to 12°. A larger angle would cause separation of the steam from the walls with heavy losses. A smaller angle makes the nozzle unnecessarily long."),

    P("In which portion of a convergent-divergent nozzle is the friction loss greatest?",
      "In the divergent portion, because the steam travels a longer length at high velocity.",
      "Long duct at high speed.",
      "The divergent portion carries the steam at high velocity over a comparatively long length. Friction losses rise roughly with the square of velocity, so most of the loss occurs there. For this reason the divergent cone is kept short with an included angle of about 10° to 12°. This keeps the wall friction within acceptable limits while still completing the expansion."),

    P("If the ideal exit velocity of steam from a nozzle is 600 m/s and the velocity coefficient is 0.95, what is the actual exit velocity in m/s?",
      "570 m/s.",
      "Multiply the ideal velocity by the coefficient.",
      "The actual exit velocity is the ideal velocity multiplied by the velocity coefficient. Multiplying 600 m/s by 0.95 gives 570 m/s. The remaining loss corresponds to the energy dissipated by friction within the nozzle. Hence the actual velocity is 95 percent of the theoretical value."),

    P("How does friction affect the entropy of steam flowing through a nozzle?",
      "It increases the entropy of the steam.",
      "Irreversibility raises entropy.",
      "Friction is an irreversible process that converts kinetic energy into heat. This heat is reabsorbed by the steam without being reconverted into useful work. As a result the entropy of the steam rises along the nozzle. The expansion therefore departs from the ideal isentropic line and follows a slightly inclined path on the Mollier chart."),

    P("A nozzle has a velocity coefficient of 0.95. What is approximately its nozzle efficiency?",
      "About 0.90, because the efficiency equals the velocity coefficient squared.",
      "Square the coefficient.",
      "Nozzle efficiency equals the square of the velocity coefficient because kinetic energy varies with the square of velocity. Squaring 0.95 gives 0.9025. Hence the nozzle efficiency is about 0.90, or 90 percent. The remaining loss appears as frictional heat in the steam."),

    P("How is the actual heat drop in a nozzle related to the isentropic heat drop in the presence of friction?",
      "The actual heat drop is less than the isentropic heat drop over the same pressure range.",
      "Loss of available energy to friction.",
      "Friction converts part of the enthalpy drop into heat instead of kinetic energy. Over the same pressure limits the useful heat drop therefore becomes smaller than the isentropic value. The ratio of the two gives the nozzle efficiency. This usable heat drop is what actually produces the steam velocity."),

    P("Steam expands in a nozzle with an isentropic heat drop of 100 kJ/kg and negligible inlet velocity. What is the exit velocity in m/s?",
      "447.2 m/s.",
      "c = 44.72√Δh.",
      "With negligible inlet velocity the exit velocity is given by c = 44.72√Δh where Δh is the heat drop in kJ/kg. Taking the square root of 100 gives 10. Multiplying 44.72 by 10 gives 447.2 m/s. The steam therefore leaves the nozzle at about 447.2 m/s."),

    P("For an isentropic heat drop of 20 kJ/kg, what is the theoretical exit velocity of the steam in m/s?",
      "200 m/s.",
      "c = 44.72√Δh.",
      "The square root of 20 is approximately 4.472. Multiplying by the constant 44.72 gives 200 m/s. This follows from the relation c = √(2·Δh) expressed in m²/s². Thus a modest heat drop of 20 kJ/kg produces a velocity of 200 m/s when the inlet velocity is negligible."),

    P("Determine the exit velocity in m/s when the isentropic heat drop in a nozzle is 500 kJ/kg and the inlet velocity is negligible.",
      "1000 m/s.",
      "c = 44.72√500.",
      "The square root of 500 is 22.36. Multiplying 22.36 by the constant 44.72 gives very nearly 1000 m/s. This shows that a heat drop of 500 kJ/kg drives the steam to a velocity of about 1000 m/s. The calculation neglects the small inlet velocity as is customary in nozzle problems."),

    P("Steam enters a nozzle with a velocity of 100 m/s and suffers an isentropic heat drop of 50 kJ/kg. What is the exit velocity in m/s?",
      "331.7 m/s.",
      "Use c = √(c₁² + 2000·Δh).",
      "When the inlet velocity is not negligible the exit velocity is c = √(c₁² + 2000·Δh). Here 100² equals 10000 and 2000 × 50 equals 100000, so the total under the root is 110000. The square root of 110000 is 331.7 m/s. The inlet velocity adds a modest amount over the 316.2 m/s obtained from the heat drop alone."),

    P("What heat drop in kJ/kg is required to produce a theoretical nozzle velocity of 894.4 m/s with negligible inlet velocity?",
      "400 kJ/kg.",
      "Δh = c² / 2000.",
      "Rearranging the nozzle velocity relation gives the heat drop as the velocity squared divided by 2000. Squaring 894.4 gives 800,000. Dividing 800,000 by 2000 gives 400 kJ/kg. Hence a heat drop of 400 kJ/kg is needed for this velocity."),

    P("What heat drop in kJ/kg produces a nozzle velocity of 632.5 m/s when the inlet velocity is negligible?",
      "200 kJ/kg.",
      "Δh = c² / 2000.",
      "Using Δh = c²/2000, the square of 632.5 is about 400,000. Dividing by 2000 gives 200 kJ/kg. This is the enthalpy drop that accelerates stationary steam to 632.5 m/s. The relation holds for frictionless adiabatic expansion."),

    P("Steam moving at 200 m/s expands through a heat drop of 20 kJ/kg. What is the final velocity in m/s?",
      "282.8 m/s.",
      "c = √(200² + 2000×20).",
      "The final velocity is found from c = √(c₁² + 2000·Δh). Here 200² equals 40000 and 2000 × 20 equals 40000, giving a total of 80000. The square root of 80000 is 282.8 m/s. The relation holds because kinetic energies add directly even though the velocities do not."),

    P("In the nozzle velocity formula c = 44.72√Δh, what does the constant 44.72 represent?",
      "The square root of 2000, which converts a heat drop in kJ/kg into velocity in m/s.",
      "Origin of the factor 44.72.",
      "The theoretical velocity is √(2·Δh) with Δh in J/kg. If the heat drop is given in kJ/kg it must be multiplied by 1000 before use, giving 2 × 1000 = 2000 inside the square root. The square root of 2000 is 44.72. This yields the handy form c = 44.72√Δh."),

    P("On the Mollier diagram, how is the heat drop of an ideal nozzle expansion measured?",
      "As the vertical distance between the initial and final states along a line of constant entropy.",
      "Read vertically on the h-s chart.",
      "An ideal nozzle expansion is taken as isentropic, so it follows a vertical straight line on the h-s chart. The heat drop is then the vertical difference in enthalpy between the inlet and outlet states. This vertical distance read on the enthalpy scale gives the available energy. All nozzle calculations begin from this vertical enthalpy drop on the Mollier chart."),

    P("What kind of line represents an ideal frictionless expansion in a nozzle on the Mollier chart?",
      "A vertical line of constant entropy, that is an isentropic line.",
      "Constant entropy vertical line.",
      "For a frictionless adiabatic nozzle the process is isentropic, so the entropy remains constant. On the h-s chart constant entropy is represented by a vertical straight line. The enthalpy drop is read directly as the vertical gap between the two end states. Real nozzles with friction deviate slightly from this vertical line because the entropy increases."),

    P("How does a throttling process differ from a nozzle expansion on the Mollier chart?",
      "Throttling is a constant-enthalpy process shown horizontally, while nozzle expansion is approximately constant-entropy and shown vertically.",
      "Horizontal versus vertical on the h-s chart.",
      "Throttling occurs at constant enthalpy with no work output and a drop in pressure, so it appears as a horizontal line on the Mollier chart. A nozzle expansion converts enthalpy into kinetic energy and is approximated as isentropic, appearing as a vertical line. Throttling is used to find the dryness fraction of wet steam. The two processes therefore move in quite different directions on the h-s diagram."),

    P("In a complete expansion nozzle, to what pressure is the steam permitted to expand inside the duct?",
      "Down to the back pressure, giving the maximum possible jet velocity.",
      "Full expansion to the back pressure.",
      "A complete expansion nozzle is designed so that the steam leaves at exactly the back pressure. The heat drop used is the full isentropic drop between the supply and back pressures. This yields the maximum possible jet velocity for the given conditions. A non-expanding or under-sized nozzle uses a smaller heat drop and gives a lower velocity."),

    P("What does the degree of superheat of steam represent?",
      "The excess of the steam temperature above the saturation temperature at the same pressure.",
      "Temperature above saturation.",
      "The degree of superheat is the difference between the actual temperature of superheated steam and its saturation temperature at that pressure. It locates the initial state of superheated steam on the Mollier chart for nozzle problems. A higher degree of superheat moves the initial state further to the right of the saturation line. The value of the index n used for the expansion is then taken as 1.3."),

    P("Why is the isentropic enthalpy drop used as the available energy in nozzle calculations?",
      "Because in an ideal nozzle the kinetic energy gained equals the enthalpy drop obtained through the steady-flow energy equation.",
      "Steady-flow energy balance.",
      "The steady-flow energy equation with no heat loss and no work transfer shows that the change in kinetic energy equals the change in enthalpy. For negligible inlet velocity the exit kinetic energy equals the enthalpy drop. Since the ideal process is adiabatic and frictionless it is also isentropic. This is why nozzle analysis uses the vertical enthalpy drop on the h-s chart."),

    P("Superheated steam at 12 bar enters a nozzle. Taking n = 1.3, what is the critical pressure in bar?",
      "6.55 bar.",
      "Multiply 12 bar by 0.546.",
      "For superheated steam the critical pressure ratio is 0.546. Multiplying the supply pressure of 12 bar by 0.546 gives 6.552 bar. Rounding to two decimals gives 6.55 bar. The throat of the nozzle therefore operates at about 6.55 bar."),

    P("Superheated steam at 20 bar flows through a convergent-divergent nozzle with n = 1.3. What is the critical pressure in bar?",
      "10.92 bar.",
      "Critical pressure = 0.546 × P₁.",
      "The critical pressure ratio for superheated steam is 0.546. Multiplying the initial pressure of 20 bar by 0.546 gives 10.92 bar. This is the pressure that must be established at the throat for maximum discharge. The steam is then expanded down to the back pressure in the divergent part."),

    P("Steam at 15 bar and 300 °C enters a nozzle. Using the superheated critical ratio of 0.546, what is the critical pressure in bar?",
      "8.19 bar.",
      "0.546 × 15 bar.",
      "As the steam is superheated the index n is 1.3 and the critical pressure ratio is 0.546. Multiplying 15 bar by 0.546 gives 8.19 bar. The throat pressure is therefore about 8.19 bar. Any expansion beyond this pressure must occur in the divergent portion."),

    P("Dry saturated steam at 8 bar is supplied to a nozzle with n = 1.135. What is the critical pressure in bar?",
      "4.62 bar.",
      "Multiply 8 bar by the ratio 0.577.",
      "For dry saturated steam the critical pressure ratio is 0.577. Multiplying the supply pressure of 8 bar by 0.577 gives 4.616 bar. Rounding to two decimals gives about 4.62 bar. This is the throat pressure for the condition of maximum discharge."),

    P("Superheated steam at 30 bar is supplied to a nozzle. With n = 1.3, what is the critical pressure in bar?",
      "16.38 bar.",
      "Critical pressure = 0.546 × 30.",
      "The critical pressure ratio for n = 1.3 is 0.546. Multiplying the supply pressure of 30 bar by 0.546 gives 16.38 bar. The throat of the nozzle must be designed for this pressure. The remaining expansion to the back pressure takes place in the divergent cone."),

    P("Dry saturated steam at 6 bar expands in a nozzle. If the critical pressure ratio is 0.577, what is the critical pressure in bar?",
      "3.46 bar.",
      "Critical pressure = 0.577 × P₁.",
      "The critical pressure is obtained by multiplying the initial pressure by the critical pressure ratio. Here 6 bar × 0.577 gives 3.462 bar. Rounding to two decimals gives 3.46 bar. The throat of the nozzle is therefore located where the pressure is about 3.46 bar."),

    P("The ideal exit velocity of steam from a nozzle is 600 m/s. With a velocity coefficient of 0.95, what is the actual exit velocity in m/s?",
      "570 m/s.",
      "Actual velocity = coefficient × ideal velocity.",
      "The actual velocity is the ideal velocity multiplied by the velocity coefficient. Multiplying 600 m/s by 0.95 gives 570 m/s. This accounts for the frictional loss of kinetic energy inside the nozzle. The nozzle efficiency in this case would be about 0.90."),

    P("Find the throat area in mm² for a nozzle discharging 1.8 kg/s of steam at a critical velocity of 600 m/s when the specific volume at the throat is 0.6 m³/kg.",
      "1800 mm².",
      "A = m·v/c.",
      "Using the continuity relation A = m·v/c, insert m = 1.8 kg/s, v = 0.6 m³/kg and c = 600 m/s. This gives A = 0.0018 m². Converting to square millimetres gives 1800 mm²."),

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC4_STEAMN;
  if (typeof window !== "undefined") window.SSC_JE_ENC4_STEAMN = SSC_JE_ENC4_STEAMN;
})();
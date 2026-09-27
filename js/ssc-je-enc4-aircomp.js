(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC4_AIRCOMP = {};
  SSC_JE_ENC4_AIRCOMP.aircomp = [

    P("Which of the following best describes the operating principle of a positive-displacement air compressor?",
      "It traps a fixed volume of air and mechanically reduces that volume to raise its pressure before delivering it to the receiver.",
      "Volume is trapped and then reduced mechanically.",
      "Solution: Positive-displacement compressors lower the volume of a confined air charge so the pressure rises by the gas law. The discharge is essentially pulsating in reciprocating types and smooth in rotary types. Dynamic compressors, by contrast, add kinetic energy rather than reducing a trapped volume."),

    P("Which of the following is a positive-displacement compressor?",
      "A reciprocating piston compressor is a positive-displacement compressor.",
      "Piston machines trap and squeeze air.",
      "Solution: Reciprocating compressors, rotary screw, rotary vane and Roots blowers all trap discrete air charges and compress them positively. Centrifugal and axial types are dynamic machines. Therefore a reciprocating piston compressor is the correct positive-displacement type."),

    P("Which of the following is a dynamic (rotodynamic) compressor?",
      "A centrifugal compressor, which converts high-speed kinetic energy into pressure in its diffuser, is a dynamic compressor.",
      "Centrifugal means high-speed rotor imparting velocity.",
      "Solution: In a centrifugal compressor a high-speed impeller throws air outward, giving it velocity energy that is later converted to pressure. This velocity energy method is the defining feature of the dynamic class. Screw, vane, and Roots machines are positive-displacement types."),

    P("The two broad classes into which all air compressors are divided are:",
      "Positive-displacement compressors and dynamic (rotodynamic) compressors.",
      "One traps volume, the other imparts kinetic energy.",
      "Solution: Classification of compressors is based on the method of pressure rise. Positive-displacement machines reduce the volume of trapped air, while dynamic machines first accelerate the air and then decelerate it in a diffuser to build pressure. Every common compressor falls into one of these two families."),

    P("Which compressor type is best suited for very high pressure ratios at relatively low to moderate flow rates?",
      "The reciprocating (piston) compressor, which can produce the highest discharge pressures among common compressor types.",
      "Piston cylinders can reach very high pressures.",
      "Solution: Reciprocating compressors seal well and can deliver extremely high pressures because each stage is a positive-displacement cylinder. They are therefore used for high-pressure duties where flow is moderate. Screw, vane and centrifugal machines cover lower and medium pressure ranges."),

    P("Dynamic compressors achieve compression mainly by:",
      "Imparting kinetic energy to the air with a high-speed impeller or rotor and then converting that kinetic energy into pressure energy in a diffuser (or across subsequent blading).",
      "Rotor accelerates the air first.",
      "Solution: In a dynamic machine the impeller or rotor speeds up the air, giving it high velocity. The diffuser then decelerates the flow, and the drop in velocity energy appears as an increase in pressure. This is the opposite of the trapped-volume method used by positive-displacement machines."),

    P("A Roots blower is classified as:",
      "A rotary positive-displacement compressor having two meshing lobes with no built-in internal compression.",
      "Two intermeshing lobes, no internal compression.",
      "Solution: The Roots blower moves air in pockets between two meshing lobe rotors, so it is a rotary positive-displacement machine. It has no internal compression: the pressure rise occurs externally as the air meets the higher-pressure discharge. It is limited to low and medium pressure duties."),

    P("Which of the following is NOT a positive-displacement compressor?",
      "A centrifugal compressor is a dynamic compressor and therefore not a positive-displacement type.",
      "Centrifugal is dynamic.",
      "Solution: Centrifugal compressors use a high-speed impeller and a diffuser, the classic dynamic principle. Reciprocating, screw, and vane machines all trap and squeeze fixed volumes, which is positive-displacement behaviour. Hence the centrifugal unit is the machine that is not positive displacement."),

    P("A rotary screw compressor belongs to which compressor family?",
      "It belongs to the rotary positive-displacement family, using two meshing helical rotors to trap and compress air.",
      "Twin helical rotors trap air pockets.",
      "Solution: In a screw compressor, two intermeshing helical rotors form air pockets whose volume shrinks as they travel toward the discharge. This trapped-volume reduction is characteristic of positive displacement. The screw type is therefore a rotary positive-displacement compressor."),

    P("Axial flow compressors are best characterised as:",
      "Dynamic compressors in which air moves axially through alternate rows of rotating and stationary blades, giving a small pressure rise per stage.",
      "Air travels straight along the shaft.",
      "Solution: In an axial compressor rows of rotor blades accelerate the air and stator vanes decelerate it, both arranged around the axis so flow stays axial. Each stage adds only a small pressure rise, about 1.05 to 1.2 ratio, but the machine passes very large flows. It is therefore a dynamic compressor."),

    P("For very large air flows at moderate pressure, the preferred dynamic compressor is:",
      "An axial flow compressor, because it passes the greatest volumes of air of all compressor types.",
      "Axial rotors handle huge flows.",
      "Solution: Axial compressors have a large annular flow area and many stages arranged along the shaft, allowing enormous mass flow. They are used in gas turbines and large plants where flow is huge and pressure per stage is kept modest. Centrifugal and positive-displacement types suit smaller or higher-pressure duties."),

    P("A rotary vane compressor works on the principle of:",
      "Positive displacement, with sliding vanes dividing the space between an eccentric rotor and casing into pockets whose volume changes as the rotor turns.",
      "Sliding vanes form changing pockets.",
      "Solution: The rotor turns eccentrically inside the casing and spring-loaded vanes slide out to contact the wall, dividing the annular space into individual cells. As the rotor turns, these cells first grow (suction) and then shrink (compression). The trapped air is therefore positively compressed without pistons."),

    P("For minimum work of compression in a reciprocating compressor, the compression process should ideally follow:",
      "An isothermal process, because isothermal compression needs the least work for a given pressure ratio.",
      "Constant-temperature compression is cheapest in work.",
      "Solution: Compressing at constant temperature keeps the specific volume as small as possible at every pressure, so the area under the p-V curve is the smallest possible. Any other path, such as adiabatic or polytropic, needs more work for the same ratio. This is why isothermal is taken as the ideal for reciprocating compressors."),

    P("The ideal isothermal work to compress V1 m³ of air from pressure P1 to P2 is given by:",
      "W = P1·V1·ln(P2/P1).",
      "It is P1 times V1 times the natural log of the ratio.",
      "Solution: For an isothermal process the work is the integral of P·dV with PV constant, which evaluates to P1·V1·ln(P2/P1). The pressure ratio makes the value dimensionless inside the log and the pre-factor P1·V1 has energy units. This formula gives the minimum compression work."),

    P("For a given pressure ratio, which compression process requires the least work?",
      "Isothermal compression requires the least work among isothermal, adiabatic and polytropic processes.",
      "Constant temperature gives minimum work.",
      "Solution: Work is the area under the compression curve on the p-V diagram. The isothermal curve lies below the polytropic and adiabatic curves for a fixed ratio, so its area is smallest. Adiabatic gives the greatest temperature rise and the largest work, with polytropic in between."),

    P("During actual compression in an air compressor the polytropic index n is typically:",
      "About 1.35, lying between the isothermal value 1.0 and the adiabatic value 1.4.",
      "Part cooling nudges n above 1 but below 1.4.",
      "Solution: Real compression is neither fully cooled (n = 1) nor fully insulated (n = 1.4), because the cylinder cools partially. Practical values for air compressors fall between about 1.2 and 1.4, with 1.35 commonly quoted. Cooling the cylinder keeps n closer to the isothermal ideal."),

    P("The indicator diagram of a single-stage reciprocating compressor with clearance consists of which processes?",
      "Compression, delivery, expansion of the clearance gas, and suction, repeated every cycle.",
      "Compression, delivery, expansion, suction.",
      "Solution: Starting at the end of suction the piston compresses air (compression), the delivery valve opens and air leaves at nearly constant pressure (delivery), the trapped clearance gas re-expands as the piston returns (expansion), and then suction draws a fresh charge when cylinder pressure falls below inlet pressure. These four curves form the closed indicator diagram."),

    P("In an actual reciprocating compressor the compression stroke is neither isothermal nor adiabatic; it approximates:",
      "A polytropic process with an index n of roughly 1.2 to 1.4, commonly about 1.35.",
      "Polytropic, somewhere between the two extremes.",
      "Solution: Perfect cooling would give n = 1 and perfect insulation n = 1.4. Real cylinders remove some heat, so the process lies between these with an index of about 1.35. The more effective the water jacketing and intercooling, the closer n moves toward the isothermal value of 1."),

    P("Actual compressor work is higher than the ideal isothermal work mainly because:",
      "Cooling cannot remove the heat of compression quickly enough, so the process becomes polytropic rather than isothermal.",
      "Heat removal lags behind compression.",
      "Solution: The isothermal ideal assumes the heat of compression is removed instantly so temperature never rises. In practice heat transfer through the cylinder wall is slow compared with the stroke, so temperature and pressure rise together. The resulting polytropic path requires more work than the isothermal ideal."),

    P("Compute the isothermal work to compress 1 m³ of air from 100 kPa to 500 kPa.",
      "About 161 kJ (W = 100 kPa × 1 m³ × ln5 = 160.9 kJ).",
      "Use W = P1·V1·ln(P2/P1) with robot ratio 5.",
      "Solution: Isothermal work is P1·V1·ln(P2/P1). Substituting P1 = 100 kPa, V1 = 1 m³ and P2/P1 = 5 gives 100 × 1 × ln5 = 100 × 1.609 = 160.9 kJ. The natural logarithm of 5 is used because the process stays at constant temperature, so the answer is about 161 kJ."),

    P("Compute the polytropic work to compress 1 m³ of air from 100 kPa to 500 kPa taking n = 1.35.",
      "About 199.7 kJ (≈ 200 kJ) using W = (n/(n−1))·P1·V1·[(P2/P1)^((n−1)/n) − 1] with n = 1.35.",
      "Use the polytropic work formula with n = 1.35.",
      "Solution: With n = 1.35 the index factor n/(n−1) = 3.857, and (P2/P1)^((n−1)/n) = 5^0.259 = 1.518. The bracket is 0.518, so W = 3.857 × 100 × 0.518 = 199.7 kJ. This exceeds the isothermal value of 161 kJ because the temperature rises during polytropic compression."),

    P("The isothermal compression work is smaller than the polytropic work for the same pressure ratio because:",
      "During isothermal compression heat is removed so the temperature stays constant, keeping the specific volume smaller throughout the stroke.",
      "Constant temperature keeps the gas denser at each pressure.",
      "Solution: Work equals the area under the compression curve on a p-V diagram. Keeping temperature constant holds the pressure–volume product constant, so at every intermediate pressure the volume is the smallest possible. A smaller volume at each pressure means a smaller diagram area and hence less work than the polytropic path."),

    P("In a reciprocating compressor the delivery valve opens when:",
      "The cylinder (inside) pressure just exceeds the delivery line pressure, letting the air be expelled at nearly constant pressure.",
      "Inside pressure rises fractionally above the delivery line.",
      "Solution: The delivery valve is a non-return valve that lifts only when the cylinder pressure rises slightly above the pressure already in the discharge line. Once open, the piston sweeps the air out at almost constant pressure. The small excess pressure needed to lift the valve is a throttling loss."),

    P("The area enclosed by the indicator diagram of a reciprocating compressor represents:",
      "The indicated work done per cycle on the air in the cylinder.",
      "Diagram area is net work per cycle.",
      "Solution: Integrating pressure against volume change around the closed curve gives the net work of one cycle. It equals the compression work minus the work recovered during suction. Multiplying this area by the number of cycles per second gives the indicated power of the compressor."),

    P("Clearance volume of a reciprocating compressor is defined as:",
      "The space that remains in the cylinder above the piston when the piston is at top dead centre (end of the delivery stroke), denoted Vc.",
      "Space left when the piston reaches the top.",
      "Solution: Even at the end of the delivery stroke the piston cannot touch the cylinder head, so a small volume Vc always remains filled with high-pressure air. This trapped charge re-expands at the start of the next suction stroke. Clearance is expressed as a percentage of the swept volume."),

    P("The clearance ratio C of a compressor is defined as:",
      "C = Vc/Vs, the ratio of the clearance volume to the piston swept volume.",
      "Clearance volume divided by swept volume.",
      "Solution: The clearance ratio relates the dead space Vc to the swept volume Vs of one stroke. It is usually expressed as a percentage, commonly 4-10 percent. This ratio C appears directly in the volumetric efficiency formula, so small changes in C strongly affect delivery."),

    P("The volumetric efficiency of a reciprocating compressor with clearance is given by:",
      "ηv = 1 + C − C·(P2/P1)^(1/n), where C is the clearance ratio, P2/P1 the pressure ratio and n the polytropic index.",
      "One plus C minus C times the ratio to the power 1/n.",
      "Solution: The fresh charge drawn equals the swept volume minus the volume lost when the clearance gas re-expands from P2 to P1. That expansion loss is C·(P2/P1)^(1/n), giving ηv = 1 + C − C·(P2/P1)^(1/n). Increasing pressure ratio or clearance reduces the drawn charge and hence ηv."),

    P("The clearance volume of a typical reciprocating air compressor is commonly:",
      "About 4-10 percent of the piston swept volume.",
      "A few percent of the swept volume.",
      "Solution: Practical compressors keep clearance to the minimum consistent with safe piston travel and valve space, usually 4-10 percent of Vs. Higher clearances lower volumetric efficiency sharply at large pressure ratios. This is why clearance is held as small as mechanical design allows."),

    P("Increasing the clearance volume of a compressor at a fixed pressure ratio will:",
      "Decrease the volumetric efficiency, because more of the swept volume is consumed by re-expansion of the trapped charge.",
      "Re-expansion eats into the swept volume.",
      "Solution: A larger residual charge must expand from P2 back down to P1 before suction can begin, occupying a larger share of the stroke. That leaves less stroke volume for fresh air, so ηv falls as C rises. The pressure ratio staying the same, only the lost volume changes."),

    P("The effect of clearance volume on the theoretical work done per kg of air delivered by a compressor is:",
      "Practically none, since the work recovered in re-expanding the clearance gas nearly cancels the extra compression work, while the mass delivered falls in the same proportion.",
      "Re-expansion returns most of the extra work.",
      "Solution: With clearance, more gas is compressed and delivered but an equal extra mass is only re-expanded and not delivered. The compression and re-expansion curves nearly mirror each other, so the work per unit mass of delivered air stays almost unchanged. Clearance therefore mainly reduces delivery, not the specific work."),

    P("As the delivery pressure ratio of a compressor with fixed clearance is increased, the volumetric efficiency:",
      "Decreases continuously and eventually becomes zero at a very high pressure ratio.",
      "Higher ratio means more re-expansion loss.",
      "Solution: The re-expansion volume C·(P2/P1)^(1/n) grows with the pressure ratio, so more of the stroke is lost and ηv falls. At the extreme ratio where (P2/P1)^(1/n) = (1+C)/C the whole swept volume is used for re-expansion and ηv = 0. Increasing the pressure ratio thus weakens the delivery of a fixed machine."),

    P("Compute the volumetric efficiency of a compressor with C = 0.05, pressure ratio P2/P1 = 5 and n = 1.35.",
      "About 88.5 percent (ηv = 1.05 − 0.05 × 5^(1/1.35) = 1.05 − 0.165 = 0.885).",
      "Use ηv = 1 + C − C·(P2/P1)^(1/n).",
      "Solution: The re-expansion term is (P2/P1)^(1/n) = 5^(1/1.35) = 5^0.741 = 3.29. Multiplying by C = 0.05 gives 0.165, so ηv = 1 + 0.05 − 0.165 = 0.885. The machine therefore draws about 88.5 percent of its swept volume as fresh air at this ratio."),

    P("Compute the volumetric efficiency for C = 0.04, pressure ratio 6 and n = 1.35.",
      "About 88.9 percent (ηv = 1.04 − 0.04 × 6^(1/1.35) = 1.04 − 0.151 = 0.889).",
      "Apply ηv = 1 + C − C·(P2/P1)^(1/n).",
      "Solution: Here (P2/P1)^(1/n) = 6^(1/1.35) = 6^0.741 = 3.77. The lost fraction is 0.04 × 3.77 = 0.151, so ηv = 1 + 0.04 − 0.151 = 0.889. Even a modest clearance of 4 percent cuts nearly 11 percent off the air drawn at a ratio of 6."),

    P("If the pressure ratio P2/P1 equals 1 (no compression), the volumetric efficiency of the compressor is:",
      "100 percent, because ηv = 1 + C − C × 1 = 1 for any clearance ratio C.",
      "Both C terms cancel exactly at ratio 1.",
      "Solution: Substituting P2/P1 = 1 into ηv = 1 + C − C·(P2/P1)^(1/n) gives ηv = 1 + C − C = 1, i.e. 100 percent. With no pressure difference the clearance gas neither expands nor blocks the stroke, so the whole swept volume fills with fresh air. The formula confirms clearance matters only when real compression occurs."),

    P("Free Air Delivered (FAD) is defined as:",
      "The volume of air actually delivered by the compressor measured at the free air (atmospheric) conditions of the intake, i.e. at atmospheric pressure and temperature.",
      "Delivery volume referred back to atmospheric conditions.",
      "Solution: Because delivery volume depends on the pressure and temperature in the receiver, it cannot compare machines fairly. FAD refers the delivered mass back to the suction-side free air state, giving a common rating basis. It is normally expressed at a stated reference such as NTP (0 °C, 1.01325 bar)."),

    P("The free air delivered by a compressor is measured at:",
      "Atmospheric pressure and temperature of the free air at the intake, usually reduced to NTP conditions.",
      "Measured at intake-side atmospheric state.",
      "Solution: FAD means the volume the delivered air would occupy at the free atmosphere around the compressor intake. The common reference is NTP of 0 °C and 1.01325 bar. This removes the influence of delivery pressure and temperature so ratings become comparable."),

    P("The standard reference conditions normally used for expressing free air delivered are:",
      "NTP conditions of 0 °C and 1.01325 bar (some test codes use 15 °C and 1.01325 bar).",
      "0 °C and 1.01325 bar, with 15 °C variations.",
      "Solution: NTP is fixed at 0 °C and 1.01325 bar, and this is the reference adopted for FAD in this bank. Several national codes quote 15 °C instead, so the reference must always be stated with a numerical FAD. The gas equation converts any measured state to the chosen reference."),

    P("A compressor draws 10 m³/min of air at suction conditions of 1 bar and 27 °C. What is its FAD at NTP of 0 °C and 1.01325 bar?",
      "About 8.98 m³/min (Vn = 10 × (1/1.01325) × (273/300) = 8.98).",
      "Reduce with P1·V1/T1 = Pn·Vn/Tn and use 0 °C.",
      "Solution: Using the gas law, Vn = V1 × (P1/Pn) × (Tn/T1) = 10 × (1/1.01325) × (273/300). This equals 10 × 0.9869 × 0.91 = 8.98 m³/min. The colder and slightly higher-pressure NTP reference shrinks the measured suction volume."),

    P("If a compressor delivers Q m³/min at its suction conditions (P1, T1), its FAD at NTP (Pn, Tn) is obtained by:",
      "Vn = Q × (P1/Pn) × (Tn/T1), applying the ideal-gas relation between the states.",
      "Scaled by pressure up and temperature down from NTP to suction state.",
      "Solution: For the same mass of air, the product P·V/T is constant, so Vn = Q × (P1/Pn) × (Tn/T1). A suction pressure above NTP increases the reduced volume, while a suction temperature above NTP decreases it. This single relation converts any measured condition to the FAD reference."),

    P("Why is FAD preferred over the actual receiver-side delivery volume for rating a compressor?",
      "Because the receiver-side volume depends on pressure and temperature, while FAD refers the delivered mass to a fixed atmospheric condition so machines can be compared fairly.",
      "Delivery volume varies with receiver temperature and pressure.",
      "Solution: A standard storage tank reveals nothing by itself, since 1 m³ in the tank can represent many different masses depending on pressure and temperature. By referring delivery back to the free-air state the FAD fixes the mass being supplied. Ratings in FAD are therefore consistent across machines and climates."),

    P("The density of standard air at NTP (0 °C, 1.01325 bar) is approximately:",
      "About 1.29 kg/m³ (ρ = P/(R·T) with R = 287 J/kg·K).",
      "ρ = P/(R·T) at NTP.",
      "Solution: Applying ρ = P/(R·T) with P = 101325 Pa, R = 287 J/kg·K and T = 273.15 K gives 101325/(287 × 273.15) = 1.292 kg/m³. This value is used when converting FAD to a mass flow of air. At 15 °C the density falls to about 1.225 kg/m³."),

    P("Free air delivered is expressed in which units?",
      "Volume of free air per unit time at free air (NTP) conditions, e.g. m³/min, m³/s or litres/s.",
      "Volume per time at the free air reference.",
      "Solution: FAD is the volumetric flow of air referred to the free atmosphere, so the natural units are m³/min or m³/s at NTP. Multiplying this volume rate by the NTP density converts it into kg/s of air. All compressor catalogues quote supply in these volume-time terms."),

    P("The main purpose of an intercooler between the stages of a multi-stage compressor is:",
      "To cool the air between stages, reducing the total compressor work and the final delivery temperature.",
      "Cooling between stages cuts work and temperature.",
      "Solution: Cooling the air after the first stage shrinks its specific volume before recompression, so the second stage does less work. It also prevents dangerously high delivery temperatures. The greatest benefit comes when the air is returned to the initial suction temperature, which is called perfect intercooling."),

    P("Perfect intercooling between two compressor stages means:",
      "Cooling the air between the stages back to the initial suction temperature of the first stage before it enters the second stage.",
      "Cooling back to the original intake temperature.",
      "Solution: Perfect intercooling brings the intermediate air down to the temperature at which it entered the first stage, undoing the heating of stage one. Under this condition the optimum intermediate pressure gives equal work in both stages. Intercooling to this degree is the design ideal in two-stage analysis."),

    P("For minimum total work in a two-stage reciprocating compressor with perfect intercooling, the intermediate pressure should be:",
      "P2 = √(P1·P3), the geometric mean of the suction and final delivery pressures.",
      "Geometric mean of the two end pressures.",
      "Solution: Minimising the sum of the two-stage works with perfect intercooling gives P2² = P1·P3, so P2 = √(P1·P3). This choice splits the overall pressure ratio into two equal stages. Any deviation from this geometric mean increases the total work required."),

    P("With optimum intermediate pressure and perfect intercooling, the compression work of a two-stage machine is divided:",
      "Equally between the two stages, each stage working at the same pressure ratio √(P3/P1).",
      "Equal work and equal ratio per stage.",
      "Solution: The optimum intercooler pressure equalises the stage pressure ratios at √(P3/P1), and equal ratios produce equal temperature rises. With equal suction conditions per stage the work splits fifty-fifty. This balance is the basis of design for high-ratio two-stage compressors."),

    P("A two-stage compressor draws air at 1 bar absolute and delivers at 64 bar absolute. What is the optimum intercooler pressure?",
      "8 bar absolute, since P2 = √(1 × 64) = √64 = 8 bar.",
      "Geometric mean √(1 × 64).",
      "Solution: The optimum intermediate pressure is the geometric mean of the end pressures, P2 = √(P1·P3) = √(1 × 64) = 8 bar absolute. Each stage then has the same ratio of 8, giving equal work and temperature rise. The assumption is perfect intercooling back to the intake temperature."),

    P("A two-stage compressor works between 1 bar absolute suction and 25 bar absolute delivery. The optimum intercooler pressure equals:",
      "5 bar absolute, because P2 = √(1 × 25) = 5 bar.",
      "√(1 × 25) = 5.",
      "Solution: Applying P2 = √(P1·P3) with P1 = 1 bar and P3 = 25 bar gives √25 = 5 bar absolute. Both stages then run at the pressure ratio 5, which equalises the work split. This result is independent of the polytropic index provided intercooling is perfect."),

    P("Compared with a single-stage machine of the same overall pressure ratio, two-stage compression with perfect intercooling:",
      "Requires less total work, delivers cooler air, and improves the volumetric efficiency of the high-pressure cylinder.",
      "Saves work, cooler delivery, better volumetric efficiency.",
      "Solution: Intercooling shrinks the volume entering the high-pressure stage, so its compression work falls and the sum of the stage works is below the single-stage value. Consolidated to the same overall ratio, delivery temperature is also lower. Correct sharing of the ratio also keeps the high-pressure cylinder volumetric efficiency high."),

    P("For an optimum two-stage compressor with perfect intercooling, stage ratio r = √(P3/P1) and polytropic index n, the total work is:",
      "W = (n/(n−1))·P1·V1·[2·(P3/P1)^((n−1)/(2n)) − 2], summing equal works in both stages.",
      "Twice the single-stage formula at ratio √(P3/P1).",
      "Solution: Each stage compresses over ratio r = √(P3/P1), so one stage contributes (n/(n−1))·P1·V1·[r^((n−1)/n) − 1] with the second stage having the same value. Summing gives the factor 2 and the exponent (n−1)/(2n) from substituting r. This total is always below the single-stage work at ratio P3/P1."),

    P("If intercooling between the stages is incomplete, the second stage receives air at a higher temperature, so:",
      "Its suction volume is larger and the total work of the two-stage machine increases.",
      "Hotter intake to stage two means more work.",
      "Solution: A higher intercooler outlet temperature gives the same mass a larger volume at the intermediate pressure, so the second stage must push more volume through its compression. That additional work exceeds the simple saving and the total departs from the optimum. Perfect intercooling clearly sets the lower bound on two-stage work."),

    P("A single-stage polytropic compressor handling P1·V1 = 100 kJ at ratio 16 with n = 1.35 needs about 405.7 kJ, while the optimum two-stage machine needs about 333.6 kJ. The work saved by going two-stage is:",
      "About 72 kJ, i.e. about 18 percent of the single-stage work.",
      "405.7 minus 333.6 equals 72 kJ.",
      "Solution: The saving is 405.7 − 333.6 = 72.1 kJ, and 72.1/405.7 = 0.178, about 18 percent. This difference shows the benefit of intercooling at a high overall ratio of 16. At still higher ratios the percentage saving grows further, which is why many stages are used for very high pressures."),

    P("After perfect intercooling, the air enters the high-pressure cylinder of a two-stage compressor at:",
      "Nearly the initial suction temperature of the first stage, at the intermediate pressure.",
      "Intermediate pressure and intake temperature.",
      "Solution: The intercooler removes the heat added by the first stage until the air returns to the intake temperature, while the pressure stays at the intermediate value P2. Both stages then start from the same temperature, which is the key condition for the optimum pressure split. The geometric-mean rule follows directly from this."),

    P("Which of the following is a recognised drawback of multi-staging a compressor?",
      "Higher initial cost and greater mechanical complexity, which are accepted in exchange for the work saved at high pressure ratios.",
      "Cost and complexity rise with extra stages.",
      "Solution: Every added stage brings a piston, valving, an intercooler and piping, raising cost, space and maintenance. Below a certain ratio this extra investment is not repaid by the work saved. Above that threshold, however, the compression power saving and temperature control more than justify the added hardware."),

    P("Isothermal efficiency of a reciprocating air compressor is defined as:",
      "The ratio of the isothermal compression work (or power) to the actual indicated work (or power) for the same mass of air handled.",
      "Isothermal work divided by actual indicated work.",
      "Solution: The isothermal work for the given pressure ratio is taken as the ideal, and it is compared with what the compressor actually indicates. The quotient is the isothermal efficiency, usually expressed as a percentage. It measures how closely the machine approaches the minimum-work ideal of isothermal compression."),

    P("The efficiency normally quoted as the standard for judging a reciprocating air compressor is:",
      "Isothermal efficiency, because isothermal compression is the ideal process for a reciprocating air compressor.",
      "Isothermal is the standard yardstick.",
      "Solution: Since the reciprocating compressor is water-cooled and tries to approach constant-temperature compression, isothermal work is taken as its ideal. Comparing actual work against this ideal gives the standard figure of merit. This is why isothermal efficiency, not adiabatic, is the quoted rating for this machine type."),

    P("Overall isothermal efficiency of a compressor is defined as:",
      "The ratio of isothermal power to the brake (shaft) power input to the compressor.",
      "Isothermal power divided by brake power.",
      "Solution: Overall isothermal efficiency closes the full power account: isothermal power in the numerator and the actual shaft power drawn by the machine in the denominator. It therefore includes mechanical losses as well as compression losses. It is usually lower than the plain isothermal efficiency based on indicated power."),

    P("Mechanical efficiency of a compressor is defined as:",
      "ηm = IP/BP, the ratio of the indicated power to the brake (shaft) power input.",
      "Indicated power over brake power.",
      "Solution: Indicated power is the work done on the air in the cylinders, while brake power is what the driver must supply to the shaft. The difference is absorbed by friction in bearings, packing and valves. The ratio IP/BP expresses how much of the input power survives to compress the air."),

    P("Adiabatic (isentropic) efficiency of a compressor is defined as:",
      "The ratio of isentropic compression work to the actual work for the same pressure ratio; it is the efficiency quoted for dynamic (rotary) compressors.",
      "Isentropic work over actual work.",
      "Solution: In dynamic machines the gas passes through quickly with almost no heat loss, so the isentropic process is the natural ideal. The isentropic work for a given ratio is divided by the actual work to obtain the adiabatic efficiency. Centrifugal and axial compressors are rated this way rather than on isothermal efficiency."),

    P("A good reciprocating air compressor typically has an isothermal efficiency in the range:",
      "About 75-85 percent for a well-designed, adequately cooled machine.",
      "Mostly in the mid-80s percent.",
      "Solution: Because the cylinder wall and water jacket cannot remove heat fast enough, real compressors lag the isothermal ideal by 15-25 percent. Observed isothermal efficiencies of good reciprocating machines therefore spread over about 75-85 percent. Poor cooling or high speed pushes the figure lower."),

    P("The volumetric efficiency of a compressor compares:",
      "The actual volume of air drawn in per stroke (referred to intake conditions) with the piston swept volume of the cylinder.",
      "Actual intake per stroke versus swept volume.",
      "Solution: Volumetric efficiency is ηv = actual free air drawn per stroke divided by the swept volume Vs. It is reduced by clearance re-expansion, valve throttling and heating of the fresh charge. It is a measure of how fully the cylinder fills, not of the thermodynamic compression efficiency."),

    P("The efficiency normally quoted for dynamic (centrifugal and axial) compressors is:",
      "Adiabatic (isentropic) efficiency, since their compression is much closer to adiabatic than to isothermal.",
      "Adiabatic efficiency for dynamic machines.",
      "Solution: In a dynamic compressor the air passes through the machine in milliseconds, so almost no heat leaves the gas and the process is nearly isentropic. Comparing actual work with isentropic work then gives a meaningful adiabatic efficiency. Isothermal efficiency, meaningful for slow reciprocating machines, is not used for these."),

    P("An oil-injected twin-screw compressor typically delivers air at:",
      "About 7-10 bar, with a smooth, pulsation-free and high-speed rotary delivery.",
      "7-10 bar typical, smooth flow.",
      "Solution: Twinned helical rotors trap and compress air continuously, so the discharge is nearly pulsation-free even at high rotor speeds. Oil injected into the machine cools and seals the rotors, allowing pressures around 7-10 bar in one stage. This makes screw compressors very common for workshop compressed-air plants."),

    P("Surging in a centrifugal compressor occurs when:",
      "The flow rate falls below a minimum limit, causing unstable flow, pulsation and periodic reversal of flow through the machine.",
      "Low flow triggering instability and flow reversal.",
      "Solution: Below the surge line the blade angles can no longer sustain a steady forward flow, so the flow pulsates or momentarily reverses. Operation in this region is violent and mechanically damaging. Compressors are therefore kept above the minimum surge flow, often with anti-surge recycling."),

    P("Choking in a centrifugal compressor occurs when:",
      "The flow rate is so high that the Mach number reaches 1 at the impeller inlet or throat and the flow can no longer increase.",
      "High flow, sonic velocity blocks further increase.",
      "Solution: As flow rises the velocity in the narrowest flow areas climbs until it hits the local sonic speed. At that point the flow becomes choked and no further mass can pass however fast the rotor turns. Choking thus sets the maximum flow end of the operating map, while surging sets the minimum."),

    P("A Roots blower differs from a screw compressor mainly because it:",
      "Has no internal compression, the pressure rise occurring externally when the trapped air meets the higher-pressure discharge, so it suits only low to medium pressure.",
      "Compresses externally, no built-in ratio.",
      "Solution: The Roots lobes merely carry air pockets from suction to discharge without shrinking them, so compression happens outside the machine by backflow from the discharge. This is inefficient at high ratios and limits the blower to about 0.5-1 bar gauge. The screw machine, by contrast, compresses internally as the helix volume shrinks."),

    P("Centrifugal compressors are best suited for:",
      "Large air flows at moderate pressures, giving a pressure ratio of about 3-4 per stage.",
      "Big flows, moderate pressure, 3-4 per stage.",
      "Solution: A centrifugal impeller handles a large throughput with a single-stage ratio of roughly 3-4, which is adequate for process and turbocharger duties. Higher ratios simply add more stages in series. Very high ratios or moderate flows are better served by reciprocating or screw machines."),

    P("Which of the following describes an axial flow compressor's characteristics?",
      "Very high efficiency and high air flow, with a low pressure ratio per stage of about 1.05-1.2.",
      "High flow, high efficiency, low ratio per stage.",
      "Solution: Axial stages add only a little velocity and pressure at a time because the blades are slender and the flow area large, giving per-stage ratios around 1.05-1.2. Many stages are stacked to reach the needed total ratio. The smooth flow and good blading efficiency make it the choice for large flows in gas turbines."),

    P("A screw compressor is preferred over a reciprocating machine when:",
      "A steady, pulsation-free delivery at moderate pressure (about 7-10 bar) is required at high speed with compact size and low vibration.",
      "Steady smooth output at medium pressure is the key need.",
      "Solution: The continuous meshing of screw rotors eliminates the reciprocating mass and valve pulsations, so delivery is smooth and vibration is low. Oil-injected units reach about 7-10 bar in one stage, matching most industrial demands. This is why screw packages dominate the modern compressed-air market."),

    P("The sharp fall in the delivery of a centrifugal compressor at low flow is caused by:",
      "Surging, the unstable pulsating condition that occurs when flow drops below the surge limit.",
      "Below surge limit the flow breaks down.",
      "Solution: At low flow the diffuser and impeller can no longer match the pressure required by the downstream system, so the flow repeatedly stalls and reverses. Each reversal is accompanied by a violent pressure fluctuation known as surging. Anti-surge recycling planned the flow above this limit keeps the machine stable."),

    P("Which of the following compressors has no built-in (internal) compression ratio?",
      "The Roots blower, whose entire pressure rise is developed externally by backflow from the higher-pressure discharge.",
      "Roots lobes carry air without shrinking it.",
      "Solution: Both screw and vane machines reduce the pocket volume before discharge, giving them a built-in compression ratio. The Roots blower keeps its pocket volume constant throughout, so compression is entirely external backflow compression. That external compression makes it inefficient at elevated pressure ratios."),

    P("The typical pressure ratio obtained from a single centrifugal compressor stage is:",
      "About 3-4 per stage (with higher ratios from special high-speed impellers).",
      "3-4 ratio each stage.",
      "Solution: A robust single-stage centrifugal impeller normally develops a ratio of 3-4, limited by tip speed and air temperature rise. Special high-strength, high-speed impellers push this further, especially in turbochargers. Staging several impellers multiplies these ratios to reach higher overall pressures."),

    P("The main function of an aftercooler in a compressed-air plant is:",
      "To cool the air after final compression, condensing moisture and lowering the temperature of the air delivered to the system.",
      "Cools final air and drops out moisture.",
      "Solution: Air leaves the last stage hot and carrying moisture vapour that will condense in the piping. The aftercooler brings the air close to ambient, so most of the water condenses and can be drained before the receiver. It also reduces the volume and temperature stresses in the downstream network."),

    P("An aftercooler is installed at which location in the plant?",
      "Immediately downstream of the final compression stage (after the discharge), before the air receiver and distribution line.",
      "After the last stage, before the receiver.",
      "Solution: Its position is between the compressor discharge and the receiver so the hot, saturated air is cooled and drained before storage. A separator after the aftercooler collects the condensed water. This layout keeps the receiver and distribution network dry and cool."),

    P("The air receiver in a compressed-air installation serves to:",
      "Store compressed air, damp out pressure pulsations, allow settling of moisture and oil, and supply a reserve for peak demands.",
      "Storage, smoothing, drain point and peak reserve.",
      "Solution: The receiver is a large vessel that liberalises small flow variations, so the compressor runs evenly instead of hunting. Its volume also lets condensed water and oil settle to the drain. During momentary high demand the stored air cushions the pressure until the compressor correction is made."),

    P("Unloading of a reciprocating compressor can be accomplished by which methods?",
      "Clearance pockets, valve unloaders that hold the suction valves open, variation of speed, and blow-off of surplus delivery.",
      "Clearance pocket, valve lifter, speed, blow-off.",
      "Solution: All four controls reduce or kill the compressor output while the machine keeps running. A clearance pocket enlarges dead volume, valve unloaders bounce the suction valves so no charge is compressed, speed control scales output with rpm, and blow-off simply vents excess air. Each is used where its simplicity and efficiency suit the duty."),

    P("A clearance-pocket unloader reduces compressor output by:",
      "Opening an extra clearance volume so the volumetric efficiency and therefore the delivery fall to nearly zero.",
      "Adding dead volume to collapse volumetric efficiency.",
      "Solution: Enlarging the clearance volume makes the trapped charge re-expand over much of the stroke, leaving almost no room for fresh air. Volumetric efficiency consequently drops, and with it the delivered flow. When the pocket is closed again, normal delivery returns."),

    P("A valve unloader that holds the suction valves permanently open works by:",
      "Causing the air to be drawn in and pushed back out without compression, so the compressor delivers little or no air while running light.",
      "Suction valve held open, no compression occurs.",
      "Solution: With the suction valve lifted, both strokes see nearly atmospheric pressure on both sides of the piston, so no charge is trapped or compressed. The air simply shuttles through the cylinder and the delivery is cut to almost zero. This is a simple and quick air-free unloading for idle running."),

    P("Blow-off control of a compressor is used to:",
      "Vent surplus delivered air to atmosphere so the receiver pressure is held constant, at the cost of wasting some compression power.",
      "Excess air released to hold pressure constant.",
      "Solution: When demand falls, the excess output is dumped through a blow-off valve to keep the receiver pressure from rising beyond the set value. The machine continues running at full load, so the power of the vented air is wasted. It is a simple control that trades a little energy for constant pressure."),

    P("Speed-variation control of a compressor delivers the required output by:",
      "Adjusting the prime-mover speed so the compressor delivery matches the instantaneous demand at constant pressure.",
      "Output follows speed while pressure stays fixed.",
      "Solution: Delivery volume flow of most compressors is proportional to rotor or crank speed, so changing the speed changes output directly. Modern variable-speed drives nudge the motor speed continuously so the machine only produces what the network needs. This avoids unloading losses and saves energy at part load."),

    P("Where is the moisture of compressed air mainly removed in a typical plant?",
      "In the aftercooler and the air receiver, where the cooled air condenses droplets that are drained off.",
      "Condensation happens in aftercooler and receiver.",
      "Solution: Cooling the delivery air in the aftercooler drops its temperature and forces much of its moisture to condense, while the separator removes it. The receiver then lets the still-slightly-saturated air slow down and settle so remaining droplets collect at the bottom. Draining both points keeps the pipe network dry."),

    P("Why is intercooling between stages especially important at high overall pressure ratios?",
      "Because without it the delivery temperature would rise excessively, greatly increasing work and destroying the lubricant and valve materials.",
      "High ratios push temperature and work too far.",
      "Solution: Compressing through a large ratio adiabatically or polytropically multiplies the temperature, which can carbonise oil and damage valves. Intercooling resets the temperature between stages, limiting the maximum temperature and reducing the total work. This is why high-ratio machines always split into several cooled stages."),

    P("Compute the volumetric efficiency of a compressor with C = 0.05, pressure ratio 6 and n = 1.3.",
      "About 85.2 percent (ηv = 1.05 − 0.05 × 6^(1/1.3) = 1.05 − 0.198 = 0.852).",
      "Apply ηv = 1 + C − C·(P2/P1)^(1/n) with n = 1.3.",
      "Solution: With n = 1.3 the re-expansion exponent is 1/1.3 = 0.769, and 6^0.769 = 3.97. The loss is 0.05 × 3.97 = 0.198, giving ηv = 1.05 − 0.198 = 0.852. A smaller polytropic index softens the re-expansion, so the result here is above the value obtained with n = 1.35."),

    P("A two-stage compressor works between 1.1 bar and 10 bar absolute. Find the optimum intercooler pressure.",
      "About 3.32 bar absolute (P2 = √(1.1 × 10) = √11 = 3.317 bar).",
      "P2 = √(P1·P3) = √11.",
      "Solution: The optimum intermediate pressure is the geometric mean of the end pressures, P2 = √(1.1 × 10) = √11 = 3.317 ≈ 3.32 bar. Both stages then operate at the identical ratio of 3.01. Perfect intercooling is assumed between the stages."),

    P("In an optimum two-stage compressor the overall pressure ratio is 36. What is the pressure ratio of each stage?",
      "6, because each stage takes the square root of the overall ratio, √36 = 6.",
      "Per-stage ratio = √36 = 6.",
      "Solution: Equal work per stage requires the stage ratios to be equal, and their product must equal the overall ratio. Each stage therefore runs at √36 = 6. With identical ratios and perfect intercooling, temperature rise and work are the same in both stages."),

    P("A compressor takes in 3 m³/min of free air at 1 bar absolute and delivers it at 6 bar absolute. Assuming isothermal compression, the minimum power required is:",
      "About 8.96 kW (W = 100 kPa × 0.05 m³/s × ln6 = 8.96 kW).",
      "Isothermal power = P1·V̇·ln(P2/P1) with V̇ = 3/60 m³/s.",
      "Solution: Convert flow to per second, V̇ = 3/60 = 0.05 m³/s, and pressure to 100 kPa. Isothermal power = 100 × 0.05 × ln6 = 5 × 1.792 = 8.96 kW. This is the theoretical minimum, so a real compressor draws more due to polytropic and mechanical losses."),

    P("For a compressor the ideal isothermal work for a given ratio is 161 kJ while the actual indicated work is 200 kJ. What is the isothermal efficiency?",
      "About 80.5 percent (ηiso = 161/200 = 0.805).",
      "Isothermal work divided by actual work.",
      "Solution: Isothermal efficiency equals ideal isothermal work divided by the actual indicated work for the same mass of air. Here 161/200 = 0.805, so the efficiency is 80.5 percent. Such a value is typical of a well-cooled reciprocating compressor running at a modest pressure ratio."),

    P("Air at 300 K is compressed adiabatically (n = 1.4) through a pressure ratio of 5. Find the delivery temperature.",
      "About 475 K, i.e. about 202 °C, since T2 = 300 × 5^0.2857 = 475 K.",
      "T2 = T1 × (P2/P1)^((n−1)/n) with n = 1.4.",
      "Solution: For an adiabatic process T2 = T1 × (P2/P1)^((n−1)/n) with n = 1.4, so the exponent is 0.4/1.4 = 0.2857. Then 5^0.2857 = 1.584 and T2 = 300 × 1.584 = 475 K. This equals roughly 202 °C, showing how strong the temperature rise is when cooling is absent."),

    P("A compressor draws 0.5 m³/s of air at 1 bar and 27 °C. What is its FAD at NTP (0 °C, 1.01325 bar)?",
      "About 0.449 m³/s (FAD = 0.5 × (1/1.01325) × (273/300) = 0.449).",
      "Apply Vn = V1 × (P1/Pn) × (Tn/T1).",
      "Solution: Using the gas law, the reduced volume is Vn = 0.5 × (P1/Pn) × (Tn/T1) = 0.5 × (1/1.01325) × (273/300). This gives 0.5 × 0.9869 × 0.91 = 0.449 m³/s. The colder NTP reference shrinks the volume below the intake value."),

    P("With P1·V1 = 100 kJ, n = 1.35 and a single-stage ratio of 9, the polytropic work is about 296 kJ. What is the work of an optimum two-stage machine over the same ratio with perfect intercooling?",
      "About 254 kJ (two stages each at ratio 3, giving 2 × 3.857 × 100 × (3^0.259 − 1) = 254 kJ).",
      "Each stage at √9 = 3, then double the single-stage value.",
      "Solution: The optimum splits ratio 9 into equal ratios of 3 per stage. With n = 1.35, one stage needs 3.857 × 100 × (3^0.259 − 1) = 3.857 × 100 × 0.3295 = 127 kJ. Two stages give 254 kJ, which is 42 kJ (about 14 percent) below the 296 kJ single-stage value, the saving coming from the intercooler."),

    P("The compression ratio left to each stage at its optimum intermediate pressure is the square root of the overall ratio. This is correct because:",
      "Equating the two stage works with perfect intercooling forces the stage ratios to be equal, and their product must equal the overall ratio.",
      "Equal stage works force equal ratios whose product is the total.",
      "Solution: Writing the two stage works for perfect intercooling and differentiating with respect to the intermediate pressure gives the equal-ratio condition. Two equal ratios multiplied together must reproduce the overall ratio P3/P1, so each is √(P3/P1). This geometric-mean rule minimises the total work for that overall ratio."),

    P("For a given overall pressure ratio, the total compression work is least when the pressure rise is achieved:",
      "In a single isothermal process, and among staged ideas with the least cooling, the lower the stage temperatures the lower the work.",
      "Cooler compression paths always need less work.",
      "Solution: Work in compression grows with the gas temperature during the stroke, since a hotter gas occupies a larger volume at each instant. Isothermal compression keeps temperature fixed and gives the minimum work for the ratio. Multi-staging with intercooling approaches this ideal by limiting temperature rise, which is why intercoolers save power."),

    P("The volumetric efficiency formula ηv = 1 + C − C·(P2/P1)^(1/n) reduces to which simple true statement?",
      "Volumetric efficiency is reduced only by the volume the clearance gas needs to re-expand, and grows when the pressure ratio falls or the clearance shrinks.",
      "Loss term is exactly the clearance re-expansion fraction.",
      "Solution: The term C·(P2/P1)^(1/n) is precisely the fraction of the swept volume taken up by the re-expanding residual gas. Subtracting it from unity plus the clearance restored during suction gives the fresh-air fraction. Minimising C and the ratio P2/P1 therefore maximises ηv."),

    P("Two parameters in the volumetric efficiency formula 1 + C − C·(P2/P1)^(1/n) both act to reduce ηv when raised. They are:",
      "The clearance ratio C and the pressure ratio P2/P1, because larger values of either enlarge the re-expansion loss term.",
      "Clearance and pressure ratio both enlarge the loss.",
      "Solution: Raising C increases the trapped residual volume and raising the pressure ratio makes that residual expand further, both inflating C·(P2/P1)^(1/n). Each therefore drives ηv down on its own. This is why high-ratio compressors are built with minimal clearance and, where possible, multiple stages.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC4_AIRCOMP;
  if (typeof window !== "undefined") window.SSC_JE_ENC4_AIRCOMP = SSC_JE_ENC4_AIRCOMP;
})();
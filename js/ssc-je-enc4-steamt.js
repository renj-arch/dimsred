(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC4_STEAMT = {};
  SSC_JE_ENC4_STEAMT.steamturb = [

    P("In a simple impulse turbine, where does the entire pressure drop of the steam take place?",
      "The entire pressure drop occurs only in the fixed nozzles, with practically no pressure drop across the moving blades.",
      "The moving blades only redirect the high-speed jet.",
      "In an impulse turbine the available enthalpy drop is converted into kinetic energy inside the stationary nozzle, which acts as a converging passage. The moving blade row receives this high-velocity stream and simply changes its direction, producing an impulsive (impact) force on the blades. No expansion occurs in the moving blades, so the steam pressure across them remains nearly constant. This constant-pressure feature is what identifies a pure impulse stage."),

    P("In a reaction turbine, how is the pressure drop of the steam distributed along the stage?",
      "The pressure drop occurs partly in the fixed blades and partly in the moving blades.",
      "Both the fixed and the moving rows act as nozzles.",
      "In a reaction turbine, fixed blades shaped as converging nozzles convert a part of the pressure energy into kinetic energy. The row of moving blades is also shaped like a nozzle, so the remaining part of the pressure drop occurs as the steam accelerates through it. The acceleration of the relative velocity through the moving row produces a reactive force that supplements the impulse force. For a Parson's turbine this division is equal, giving a 50% degree of reaction."),

    P("What is the degree of reaction of a pure impulse stage?",
      "The degree of reaction is 0, because no enthalpy drop takes place in the moving blades.",
      "Degree of reaction is the enthalpy drop in the moving blades divided by the total stage drop.",
      "The degree of reaction R is the ratio of the enthalpy drop in the moving blade row to the total enthalpy drop of the stage. In a pure impulse stage the entire drop occurs in the nozzles, so the moving-blade drop is zero and R = 0. In a Parson's reaction turbine the drop is shared equally and R = 0.5. The value of R decides the blade shape, since reaction blades must be convergent."),

    P("What is the degree of reaction of a Parson's reaction turbine?",
      "R = 1/2 (50%), meaning half the stage enthalpy drop occurs in the fixed blades and half in the moving blades.",
      "Parson's turbine has identical fixed and moving blades.",
      "In a Parson's reaction turbine the fixed and moving blade rows are geometrically identical and symmetrical. The enthalpy drop is therefore divided equally, giving a degree of reaction R = 0.5, that is 50%. This makes both rows act as nozzles. The blade speed ratio at optimum is close to u/V1 = cosα, higher than the value for a single-row impulse stage."),

    P("How do the blade profiles of an impulse turbine differ from those of a reaction turbine?",
      "An impulse blade is symmetrical (equiangular, with equal inlet and outlet angles), while a reaction blade is asymmetrical with a converging passage that acts as a nozzle.",
      "Symmetry of the blade profile indicates an impulse stage.",
      "A pure impulse blade has a profile symmetrical about the plane midway across the wheel, so the inlet and outlet blade angles are equal (equiangular). A reaction blade is not symmetrical: its passage converges towards the outlet because it must accelerate the steam like a nozzle. The reaction blade is also twisted when the blade height is large, to keep the correct angle at every radius. These profile differences help identify the two stages."),

    P("In which turbine do the moving blades themselves act as nozzles?",
      "In a reaction turbine, where the steam expands and its relative velocity increases while passing through the moving blades.",
      "Expansion inside the moving row is the reaction feature.",
      "Reaction-stage moving blades are convergent passages, so the steam expands as it passes through them and its relative velocity rises from inlet to outlet. This acceleration creates a reaction force that pushes the blades along the direction of motion. In an impulse stage the relative velocity is ideally constant, since no expansion takes place in the moving row. The extra expansion makes reaction moving blades more prone to tip leakage losses."),

    P("Which turbine is also known as the de Laval turbine?",
      "The single-stage impulse turbine, in which all the pressure drop occurs in one set of nozzles and one row of blades.",
      "de Laval developed the first practical single-stage impulse wheel.",
      "The de Laval turbine is the simplest form of steam turbine: one nozzle ring and one ring of moving blades. Because it must absorb a large enthalpy drop at once, the required blade speed is very high and small machines can run at more than 30000 rpm. Such high speeds necessitate gearing when driving a generator. It is therefore rarely used today except for small high-speed auxiliary drives."),

    P("Which statement about a pure impulse turbine is correct?",
      "The steam pressure remains essentially constant across the moving blades, so it is also called a constant-pressure turbine.",
      "Only the velocity, not the pressure, changes across impulse blades.",
      "The distinguishing feature of an impulse turbine is that the pressure of the steam is reduced to the exhaust value entirely in the nozzles. Across the moving blades only the direction of the stream changes, so pressure is nearly constant. Because of this it is often called a constant-pressure turbine. The kinetic energy of the jet is consumed as the stream reverses part of its tangential momentum."),

    P("How does the driving force on the blade differ between an impulse and a reaction stage?",
      "An impulse blade is driven by the momentum change of a high-velocity jet, whereas a reaction blade receives additional force from the acceleration of steam through its own nozzle-shaped passage.",
      "Impulse force comes from changing the direction of the jet; reaction force comes from acceleration within the moving blade.",
      "In an impulse stage the nozzle produces a high-velocity jet whose direction is turned by the moving blade; the resulting momentum change gives the impulsive force. In a reaction stage the moving blade is itself a nozzle, so the steam accelerates within it and the equal-and-opposite force appears as a reaction force. Practical machines combine both effects. The reaction component makes the velocity diagram and the blade profile asymmetrical."),

    P("Which of the following correctly describes the velocity diagram of a 50% reaction stage compared with a single-row impulse stage?",
      "The reaction stage gives a symmetrical velocity diagram with Vr2 = V1 and V2 = Vr1, while a single-row impulse stage has an exit diagram with a much smaller whirl component.",
      "Symmetry of the diagram follows from symmetrical blades.",
      "With symmetrical blades and 50% reaction, the outlet absolute velocity equals the inlet relative velocity (V2 = Vr1) and the outlet relative velocity equals the inlet absolute velocity (Vr2 = V1), making the diagram symmetrical. In a single-row impulse stage with equiangular blades and friction, the relative speed is unchanged, but the whirl component at exit is much smaller than at inlet. The mirror symmetry of the Parson's diagram is the visual signature of the 50% reaction stage."),

    P("In a steam turbine velocity diagram, what does V1 denote?",
      "V1 is the absolute velocity of the steam entering the moving blades, which makes the nozzle angle α with the direction of blade motion.",
      "V with subscript 1 refers to the inlet side of the moving blade row.",
      "In the velocity-diagram nomenclature, subscript 1 means the entry side of the moving blade row and subscript 2 the exit side. V1 is the absolute jet velocity leaving the nozzle at the nozzle angle α, measured from the wheel tangent. The other symbols are the blade speed u, the relative velocities Vr1 and Vr2, the whirl components Vw1 and Vw2 and the axial flow component Vf. These vectors fix the inlet and outlet triangles."),

    P("What does the symbol u denote in a turbine velocity diagram?",
      "u is the linear peripheral (blade) speed of the rotor at the mean radius, computed as u = πDN/60 with D in m and N in rpm.",
      "u = π·D·N / 60.",
      "The blade speed u is the tangential velocity of the blades at the mean diameter of the rotor. It is found from u = πDN/60, where D is the mean diameter in metres and N the rotational speed in rpm. u typically ranges from 100 to 600 m/s in practice. The blade speed ratio u/V1 is a key design parameter that fixes the efficiency of the stage."),

    P("What is the whirl component Vw1 of the inlet absolute velocity?",
      "Vw1 is the tangential component of V1 in the direction of blade motion, given by Vw1 = V1·cosα.",
      "Whirl is the tangential (useful) component of velocity.",
      "The absolute velocity V1 is resolved into a tangential component Vw1 = V1cosα, called the whirl component, and an axial component Vf1 = V1sinα, called the flow component. Only the whirl component does work on the blades, since work equals blade speed times the change in whirl. The flow component merely carries the steam through the stage axially."),

    P("What does the axial flow component Vf of the velocity diagram represent?",
      "Vf is the axial component of the steam velocity, perpendicular to the wheel tangent, and it remains nearly constant across a single-stage impulse turbine.",
      "Vf = V1 sinα at the nozzle outlet.",
      "The flow component Vf carries the steam in the axial direction through the machine and is not directly involved in work generation. For an impulse stage with no change in annular flow area, Vf is practically the same at inlet and exit of the moving row. It influences the blade angle β, since tanβ relates Vf to the relative whirl. Its magnitude also decides the required blade height and mass flow of the turbine."),

    P("With the nozzle angle α measured from the tangential direction, what is the axial flow component of the inlet velocity?",
      "Vf1 = V1·sinα, in m/s when V1 is in m/s.",
      "Resolve V1 into tangential and axial parts.",
      "The inlet absolute velocity V1 is resolved about the direction of blade motion. Its component along the wheel tangent is Vw1 = V1cosα and its perpendicular (axial) component is Vf1 = V1sinα. These two components fix the inlet velocity triangle together with the blade speed u. The relative velocity Vr1 then closes the triangle."),

    P("Which expression gives the work done per kilogram of steam flowing through a single-row impulse stage?",
      "W = u·(Vw1 + Vw2), with the velocities in m/s, giving the work in J/kg.",
      "Work equals blade speed times the total whirl change.",
      "The tangential force per unit mass flow on the blades is (Vw1 + Vw2), where Vw2 is the magnitude of the exit whirl, normally opposed to blade motion in an impulse stage. Multiplying by the blade speed u gives the work per kilogram, W = u(Vw1 + Vw2). When both whirls are taken in the direction of motion the explanation is the same with algebraically signed components. The result is expressed in J/kg, so the power is obtained by multiplying by the mass flow rate."),

    P("How is the blade efficiency ηb of a turbine stage defined?",
      "ηb = 2u·(Vw1 + Vw2)/V1², the ratio of the blade work to the kinetic energy of the jet.",
      "The jet kinetic energy per kg is V1²/2.",
      "Blade (or diagram) efficiency compares the work delivered to the blades with the kinetic energy carried by the jet. Per kilogram the jet energy is V1²/2 and the blade work is u(Vw1 + Vw2), so ηb = 2u(Vw1 + Vw2)/V1². It measures only the performance of the blade row, ignoring nozzle friction and other losses. Its maximum value for a single-row impulse turbine with equiangular frictionless blades is (1 + cosα)/2."),

    P("For equiangular (symmetrical) impulse blades with negligible friction, what is the relation between the relative velocities at inlet and outlet?",
      "The relative velocities are equal, Vr1 = Vr2, because the symmetrical non-expanding channel neither accelerates nor decelerates the stream.",
      "Vr is unchanged when there is no friction and no expansion.",
      "The blade friction coefficient k = Vr2/Vr1 is unity when friction is neglected. Since an impulse blade passage has a uniform cross-section, a frictionless flow passes through it without changing relative speed. The relative velocity only changes direction, from the inlet angle β1 to the outlet angle β2. With equiangular blades β1 = β2, completing the symmetrical triangle."),

    P("What is the maximum blade efficiency of a single-row impulse turbine with equiangular, frictionless blades and nozzle angle α?",
      "ηb,max = (1 + cosα)/2, obtained at a blade speed ratio u/V1 = (cosα)/2.",
      "Optimize the blade speed ratio; the optimum is half the cosine of the nozzle angle.",
      "For a frictionless equiangular single-row impulse stage the optimum blade speed ratio is u/V1 = cosα/2, at which the steam leaves the blade row axially and the exit whirl Vw2 becomes zero. Substituting this optimum ratio into the blade efficiency expression gives ηb,max = (1 + cosα)/2. For a nozzle angle of 20° this is about 0.97, the highest value such a stage can reach. Beyond the optimum ratio the exit whirl opposes the blade motion and the efficiency falls."),

    P("At the condition of maximum blade efficiency (u/V1 = cosα/2), what happens to the steam leaving a single-row impulse stage?",
      "The exit whirl component becomes zero, so the steam leaves the blade row essentially in the axial direction.",
      "Axial discharge gives the best efficiency point.",
      "The condition Vw2 = 0 means the absolute velocity at exit is purely axial, carrying only the flow component Vf. In this condition the tangential momentum is fully given up to the blades, which is the most work the stage can extract. Any further increase of blade speed makes the exit whirl oppose the motion and reduces the useful work. This is why the optimum ratio u/V1 = cosα/2 is also called the axial-discharge condition."),

    P("A single-row impulse turbine operates with a blade speed ratio u/V1 = 0.3 and the absolute velocity V1 = 600 m/s. What is the blade speed u?",
      "180 m/s, since u = 0.3 × 600 = 180 m/s.",
      "Multiply V1 by the blade speed ratio.",
      "The blade speed ratio is defined as K = u/V1. Rearranging gives u = K·V1 = 0.3 × 600 = 180 m/s. This is a moderate value, below the optimum ratio of about cosα/2. The same number is then used with the mean diameter and speed to fix the rotor geometry."),

    P("A frictionless equiangular impulse stage runs at its optimum blade speed ratio with a nozzle angle α = 30° and blade speed u = 150 m/s. Find the absolute steam velocity V1.",
      "V1 = 346 m/s (346.4 m/s), from V1 = 2u/cosα = 300/0.866 = 346.4 m/s.",
      "At optimum u/V1 = cosα/2, so V1 = 2u/cosα.",
      "For the most efficient running, the blade speed ratio must equal cosα/2. Rearranging gives V1 = 2u/cosα = 2 × 150/0.86603 = 346.4 m/s. Such a velocity corresponds to an enthalpy drop of about V1²/2000, roughly 60 kJ/kg, across the nozzle. The value confirms that a single-stage machine cannot absorb a large drop."),

    P("Steam flows at 5 kg/s through a single-row impulse stage with blade speed u = 150 m/s, inlet whirl Vw1 = 250 m/s and exit whirl Vw2 = 50 m/s. What blade power is developed?",
      "225 kW, from P = m·u·(Vw1 + Vw2) = 5 × 150 × 300 = 225000 W.",
      "Work per kg = u(Vw1 + Vw2), then multiply by mass flow.",
      "The work per kilogram is u(Vw1 + Vw2) = 150 × (250 + 50) = 45000 J/kg = 45 kJ/kg. Multiplying by the mass flow rate, the blade (diagram) power is 5 × 45000 = 225000 W = 225 kW. This is the power at the blade row, before deducting bearing and other mechanical losses. The corresponding shaft power would be lower after those losses."),

    P("Steam enters a single-row impulse stage with V1 = 500 m/s at a nozzle angle α = 30°. For maximum blade efficiency, what blade speed u is required?",
      "u = 216.5 m/s, since u = V1·cosα/2 = 500 × 0.866/2 = 216.5 m/s.",
      "Use u/V1 = cosα/2 at the optimum.",
      "The optimum blade speed ratio for a single-row impulse stage is u/V1 = cosα/2. With cos30° = 0.866, u = 500 × 0.866/2 = 216.5 m/s. At this speed the exit whirl vanishes and the efficiency reaches its maximum value. The corresponding mean diameter and rpm would then be fixed from u = πDN/60."),

    P("What is the main purpose of compounding a steam turbine?",
      "To reduce the rotor rotational speed to a practical value while still absorbing the large enthalpy drop, by dividing the expansion into several stages.",
      "A single stage would need an enormous peripheral speed.",
      "If the total enthalpy drop of a power cycle were absorbed in one single-row impulse stage, the steam velocity V1 would be very high and the blade speed would have to be about half of it. That would force the rotor to rotate at impracticably high revolutions. Compounding lets the expansion be shared among several stages, so each stage works with a modest velocity and blade-speed ratio. The rotor then runs at a practical speed while the total output is unaffected."),

    P("How does a velocity-compounded (Curtis) turbine absorb energy from the steam?",
      "The entire pressure drop occurs in the first nozzle set, and the resulting high kinetic energy is absorbed progressively by two or more moving blade rows separated by reversing (guide) blade rows.",
      "Velocity compounding means several velocity drops after one pressure drop.",
      "In a Curtis stage the total enthalpy drop happens in a single set of nozzles, so the steam leaves them with very high velocity. This kinetic energy is then taken up stage by stage in successive moving rows, each pair separated by a stationary guide row that re-directs the flow. Hence there are multiple velocity drops but only one pressure drop. It is compact and suited to large drops, but its efficiency is lower than pressure compounding."),

    P("How does a pressure-compounded (Rateau) turbine absorb the steam energy?",
      "The total pressure drop is divided into several steps; each step has its own nozzle set and one moving blade row, with essentially constant pressure across the moving blades.",
      "Pressure compounding gives one pressure drop per stage.",
      "A Rateau turbine is divided into a number of pressure stages, each consisting of one nozzle ring and one moving blade row. The steam pressure falls step by step, a fixed amount in every stage, and the velocity gained in each nozzle set is spent in the corresponding moving row. This arrangement keeps every blade speed ratio near the optimum, which is why pressure compounding gives good efficiency. It needs several wheels and separate diaphragms, making the machine longer."),

    P("What is pressure-velocity compounding?",
      "The total enthalpy drop is divided among a few pressure stages, and within each stage the velocity is further compounded over two or three moving rows.",
      "It combines a small number of pressure stages with velocity compounding inside each.",
      "Pressure-velocity compounding splits the total drop into a small number of pressure stages, typically two to four. Inside every such stage the steam velocity is further compounded, that is absorbed in two or three moving rows with guide blades between them. This combines the compactness of velocity compounding with a fair stage efficiency. It is often used in intermediate-size industrial turbines."),

    P("A typical Curtis (velocity-compounded) wheel consists of which arrangement of blade rows?",
      "One nozzle ring, a moving row, a fixed guide (reversing) row and a second moving row, giving two velocity drops in a single pressure drop.",
      "Two moving rows separated by a guide row follow the nozzles.",
      "The classic Curtis wheel uses a single set of nozzles followed by two rings of moving blades. Between the moving rings sits a stationary guide row whose concave channel turns the steam so it enters the second moving row favourably. Both moving rows together absorb the energy of the one high-velocity jet. This two-row arrangement is the most common velocity-compounded stage."),

    P("What is the main advantage and the main drawback of velocity compounding?",
      "It absorbs a large enthalpy drop in one wheel with a single nozzle ring, but its efficiency is lower than that of pressure compounding.",
      "Fewer wheels and one big nozzle, at the price of efficiency.",
      "Because all the expansion is taken in one set of nozzles, a Curtis stage handles a very large temperature and pressure difference in a single wheel, which shrinks the casing length. Only one nozzle ring need be manufactured to suit the high inlet conditions. The drawback is that the large velocity drop raises the blade friction and leaving losses, so the stage efficiency falls. Hence Curtis stages are used where compactness or a big first-stage drop matters more than efficiency."),

    P("Which method of compounding gives the best stage efficiency?",
      "Pressure compounding (Rateau), because each stage works close to its optimum blade speed ratio with small velocity drops.",
      "Small drops per stage keep the velocity triangles efficient.",
      "In pressure compounding every stage has its own nozzle ring and a modest enthalpy drop, so the velocities stay moderate and close to the design value. The blade speed ratio can then be maintained near its optimum in every stage. Velocity compounding must cope with much larger velocities and accordingly larger friction and exit losses. This is why pressure compounding is preferred wherever efficiency dominates over compactness."),

    P("For the first (high-pressure) stage of a large condensing turbine, which compounding scheme is commonly preferred?",
      "A velocity-compounded (Curtis) control stage, which absorbs a large enthalpy drop in one or two wheels to keep the casing compact and allow nozzle-group governing.",
      "The control stage is often a Curtis stage.",
      "The first stage of many large turbines is a Curtis (velocity-compounded) stage rather than a single-row wheel. It swallows a big part of the total enthalpy drop at once, so the remaining reaction stages handle the flow at more modest conditions. Being the control stage, its nozzles are grouped and individually valued for nozzle governing. This layout is a compromise between efficiency and the practical size of the high-pressure casing."),

    P("Why is compounding essential for a single-row impulse turbine used on a large enthalpy drop?",
      "Without compounding the required steam velocity is so high that the rotor would have to spin at an impractically high speed to keep the blade ratio optimum.",
      "u/V1 ≈ cosα/2 forces enormous rpm at high V1.",
      "The optimum single-row impulse ratio is only about u/V1 = 0.4 to 0.5, so a rotor absorbing a drop of about 200 kJ/kg (V1 ≈ 630 m/s) would need a blade speed near 300 m/s. On a rotor of 1 m mean diameter that means roughly 5700 rpm, and far more on smaller wheels. Gearing or very high-speed special machines would then be required. Compounding spreads the drop over several stages and brings the speed back to a practical value."),

    P("In a Rateau (pressure-compounded) turbine, how do the number of pressure drops and the pressure across each moving row behave?",
      "There is one pressure drop for every stage nozzle set, and the pressure remains practically constant across each moving blade row.",
      "Each stage is one pressure drop with constant pressure over its moving row.",
      "Rateau compounding stages the expansion by placing a diaphragm with nozzles before every moving wheel. The steam pressure falls across each nozzle ring, then stays flat through the following moving row. Therefore the number of pressure drops equals the number of stages, while the moving rows see no pressure change. This is exactly the impulse principle repeated stage after stage."),

    P("In a Parson's reaction turbine, what is the relation between the fixed and moving blade profiles?",
      "The fixed and moving blades are identical in shape, making the velocity diagram symmetrical, so that Vr2 = V1 and V2 = Vr1.",
      "Identical blades give a mirrored diagram.",
      "Parson's reaction turbine uses two similar rows of blades, one fixed and one moving, both with the same passage geometry. Because the same area ratio is used twice, the total stage drop splits equally, giving R = 1/2. The equal blading makes the outlet relative velocity of the moving row equal to the inlet absolute velocity, Vr2 = V1. The inlet relative velocity in turn equals the outlet absolute velocity, V2 = Vr1, producing a symmetric diagram."),

    P("In a Parson's reaction stage, what is the value of the outlet relative velocity Vr2 compared with the inlet absolute velocity V1?",
      "Vr2 = V1, since the 50% reaction and identical blading make the two velocity triangles congruent.",
      "Symmetry gives Vr2 = V1 and V2 = Vr1.",
      "For a Parson's stage the velocity diagrams at inlet and outlet are mirror images, so the magnitudes pair up: Vr2 = V1 and V2 = Vr1. This directly follows from identical row geometry and equal enthalpy division. It greatly simplifies the diagram work of reaction stages. The same equality is the reason the stage work reduces to 2uVw in many texts."),

    P("At what blade speed ratio does a Parson's reaction turbine reach its maximum efficiency?",
      "About u/V1 = cosα, much higher than the cosα/2 of a single-row impulse stage.",
      "The reaction optimum ratio is twice that of a single-row impulse stage.",
      "For a 50% reaction stage with symmetrical blading the optimum occurs when the steam leaves the stage axially, which needs a blade speed ratio u/V1 ≈ cosα. The value is roughly double the optimum ratio of a single-row impulse stage. In practice the ratio lies near 0.9 for typical nozzle angles. This is why reaction turbines use larger diameters for the same blade speed."),

    P("How is the stage work of a 50% reaction turbine expressed in terms of the whirl components?",
      "W = u(Vw1 + Vw2), and with the symmetric diagram Vw1 ≈ Vw2, so W = 2u·Vw1 (with Vw1 ≈ V1·cosα).",
      "Symmetry makes both whirls nearly equal.",
      "The general turbine work formula is W = u(Vw1 + Vw2), exactly as for an impulse stage. In a 50% reaction stage the two triangles are mirror images, so the exit whirl component does not reverse but practically equals the inlet whirl, Vw1 ≈ Vw2. Hence W = 2u·Vw1, and since Vw1 = V1cosα, W = 2u·V1·cosα in many simplified expressions. This shows the stage work is proportional to the blade speed at fixed jet velocity."),

    P("Which statement correctly describes the steam velocity through the moving blades of a reaction turbine?",
      "The steam accelerates through the moving blades, so the relative velocity at outlet is larger than at inlet.",
      "The moving row is a nozzle in a reaction stage.",
      "Reaction moving blades form a converging passage, so the steam expands inside them and the relative velocity rises. The acceleration of the relative stream is exactly the reaction effect that makes the diagram give more work. In an impulse stage the relative velocity is ideally constant through the row. Consequently reaction blades are designed with the outlet angle smaller than the inlet angle."),

    P("In a Parson's reaction stage the whirl components are Vw1 = Vw2 = 200 m/s and the blade speed is u = 250 m/s. Find the work done per kilogram of steam.",
      "100 kJ/kg, since W = u(Vw1 + Vw2) = 250 × 400 = 100000 J/kg = 100 kJ/kg.",
      "Use W = u(Vw1 + Vw2); here the whirls add.",
      "For the Parson's stage the two whirl components are both in the direction of motion, so they add rather than subtract. W = u(Vw1 + Vw2) = 250 × (200 + 200) = 100000 J/kg = 100 kJ/kg. This is the blade work per kilogram of steam. Multiplying by the mass flow rate gives the diagram power in watts."),

    P("A Parson's reaction stage has a nozzle angle α = 20° and inlet absolute velocity V1 = 300 m/s. For maximum efficiency the blade speed u should be about what value?",
      "u = 282 m/s, since u = V1·cosα = 300 × 0.9397 = 281.9 m/s.",
      "At optimum u/V1 = cosα.",
      "For a 50% reaction stage the optimum blade speed ratio is u/V1 = cosα. With cos20° = 0.9397, u = 300 × 0.9397 = 281.9 m/s, about 282 m/s. This is roughly double the optimum ratio of a single-row impulse stage at the same nozzle angle. Reaction wheels must therefore run at larger diameter for a given blade speed."),

    P("Why does a reaction turbine develop a large axial thrust, and how is it usually balanced?",
      "The pressure drop across the moving blades creates an axial thrust, which is balanced by a balancing (dummy) piston and a thrust bearing, often with a double-flow or opposed-flow layout.",
      "Expansion in moving blades pushes the rotor axially.",
      "In a reaction stage the steam expands inside the moving blades, so the pressure on the upstream face of the blade exceeds that on the downstream face, pushing the rotor along the shaft axis. The accumulated axial thrust is cancelled by a dummy (balancing) piston at the high-pressure end, sealed by labyrinth glands. The remaining imbalance is taken by a heavy-duty thrust bearing. Large turbines often use opposed (double-flow) blading so the thrusts cancel naturally."),

    P("For the same inlet and exhaust conditions, why does a Parson's reaction turbine need more stages than an impulse turbine?",
      "Because every stage handles only a small enthalpy drop, shared between fixed and moving rows, so more wheels are required for the same total drop.",
      "Each reaction stage drops less enthalpy than an impulse stage.",
      "Each reaction stage handles only a modest enthalpy drop, since half the stage drop is expanded in the moving row and half in the fixed row of every stage. The velocities and blade angles are also small in practice, so the drop per wheel is less than in an impulse machine at the same conditions. More wheels are therefore stacked in series. The reward is a slightly better stage efficiency and smaller losses per stage."),

    P("What is the typical blade speed ratio u/V1 of a Parson's reaction stage at design?",
      "About 0.9 to 1.0, that is u/V1 ≈ cosα, in contrast with around 0.4 to 0.5 for a single-row impulse stage.",
      "Reaction turbines run with near-unity blade speed ratio.",
      "The design of a reaction stage places the blade speed close to the whirl component so that the velocity diagram stays symmetrical and the leaving loss is small. Expressed as a ratio, u/V1 ≈ cosα, which is roughly 0.9 for a 20° to 25° nozzle angle. The value is about twice the optimum of a single-row impulse stage. This high ratio is why reaction rotors are made with larger diameters."),

    P("What is the internal efficiency of a steam turbine?",
      "The ratio of the actual work done on the blades (internal power) to the isentropic enthalpy drop available between the same end states.",
      "Internal efficiency includes nozzle, blade, leakage and wheel-friction losses.",
      "Internal efficiency compares the real expansion with the ideal isentropic expansion at the same inlet and exhaust pressures. While stage efficiency counts only the nozzle and blade losses, the internal efficiency of the whole turbine also includes disk friction, windage, leakage and carry-over losses. It therefore lies below the average stage efficiency. Values typically range from 80% to 90% in modern machines."),

    P("How is the stage efficiency of a turbine defined?",
      "Stage efficiency is the ratio of the actual work output of that stage to the isentropic heat drop of the same stage, counting only the nozzle and blade losses.",
      "Stage efficiency excludes losses outside the stage itself.",
      "The stage efficiency takes the useful heat drop converted into work inside one stage and divides it by the stage's own isentropic drop. It is depressed mainly by nozzle friction and blade friction inside that stage. Leakage, windage and leaving losses between stages are not included. The turbine internal efficiency is the combined value over all stages including those extra losses."),

    P("What is the mechanical efficiency of a steam turbine?",
      "The ratio of the actual brake (shaft) power delivered to the internal (blade) power, accounting for bearing friction, sealing friction and oil-pump drive.",
      "Mechanical efficiency converts internal power to shaft power.",
      "The blades develop the internal (diagram) power, but not all of it reaches the coupling or generator. Bearing friction, seal and gland friction, oil-pump power and some windage consume a portion. Mechanical efficiency is then brake power divided by internal power, typically 95% to 99%. Overall efficiency is the product of this value and the internal efficiency."),

    P("How is the overall efficiency of a turbine related to its internal and mechanical efficiencies?",
      "η_overall = η_internal × η_mechanical, that is brake power divided by the isentropic heat power.",
      "Multiply the internal and mechanical ratios.",
      "The overall efficiency compares the useful shaft power with the power ideally available from the isentropic heat drop. Since the internal efficiency converts the isentropic drop into blade power and the mechanical efficiency turns blade power into shaft power, the two ratios multiply. If an alternator is included, the generator efficiency is also multiplied in. It is the most meaningful figure for comparing complete turbine sets."),

    P("What is the reheat factor of a multi-stage steam turbine?",
      "The reheat factor is the ratio of the sum of the individual stage isentropic heat drops to the total isentropic heat drop between inlet and exhaust, and it is always greater than unity (typically about 1.03 to 1.15).",
      "The sum of stage drops exceeds the single overall drop.",
      "Constant-pressure lines on the h–s chart diverge as entropy increases, so the sum of several small stage isentropic drops between the same end states is slightly larger than the single overall drop. The reheat factor is this sum divided by the overall drop. Since the real expansion is steeper than the isentropic, the factor always exceeds unity. It partly offsets the stage losses and explains why the internal efficiency can exceed the average stage efficiency."),

    P("How is the specific steam consumption of a turbine computed?",
      "SSC = 3600 / (W_net per kg × η_overall) in kg/kWh, where W_net is the useful work per kilogram in kJ/kg.",
      "3600 kJ equals one kWh.",
      "Specific steam consumption is the mass of steam needed to generate one kWh of output. If every kilogram produces W kJ of useful work and the overall efficiency is η, the useful energy is W·η kJ per kilogram. Dividing 3600 kJ/kWh by this product gives the figure in kg/kWh. Lower values of SSC indicate a more efficient turbine."),

    P("A turbine is built with 8 stages; the sum of the stage isentropic heat drops is 1040 kJ/kg while the overall isentropic drop between inlet and exhaust is 1000 kJ/kg. Find the reheat factor.",
      "Reheat factor = 1.04, since RF = 1040/1000 = 1.04.",
      "Divide the summed stage drops by the overall drop.",
      "The reheat factor is defined as the sum of the stage isentropic heat drops divided by the total isentropic heat drop. RF = 1040/1000 = 1.04. Being above unity, it reflects the diverging constant-pressure lines on the Mollier chart. This is a typical value for a multi-stage turbine."),

    P("What is meant by the governing efficiency of a turbine at a given load?",
      "It is the ratio of the actual enthalpy drop to the isentropic enthalpy drop between the same end pressures at that load, and it falls when throttle governing chokes the steam.",
      "Governing efficiency measures how well partial-load throttling preserves the drop.",
      "At partial loads, throttle governing reduces the inlet pressure so the steam loses part of its available drop before it reaches the nozzles. Governing efficiency compares the actual drop realised with the drop available at the fixed end pressures. With nozzle governing, most of the loss is avoided because the opened groups still run at full pressure. High governing efficiency means the machine keeps its economy over a wide load range."),

    P("What is the effect of friction in a steam turbine nozzle?",
      "Friction reduces the exit velocity below the isentropic value and increases the entropy, so the lost kinetic energy reappears as heat in the steam.",
      "Nozzle friction is measured by the nozzle efficiency.",
      "Real nozzles have wall friction, eddies and wetness friction that degrade the kinetic energy of the jet. The actual exit velocity is therefore lower than the ideal, and the exit enthalpy is higher than the isentropic value. The nozzle efficiency, the ratio of actual kinetic energy to isentropic kinetic energy, typically lies between 0.92 and 0.98. The lost drop appears as reheat that raises the entropy of the steam."),

    P("What is the blade velocity coefficient and what is its usual range?",
      "The blade velocity coefficient k = Vr2/Vr1 accounts for blade friction, taking values of about 0.85 to 0.95 in practice.",
      "Vr2 is slightly smaller than Vr1 because of surface friction.",
      "Friction on the blade surfaces slows the relative flow, so the outlet relative velocity is less than the inlet one. The blade velocity (friction) coefficient k = Vr2/Vr1 quantifies this drop, with 1.0 meaning frictionless flow. In good designs k is between 0.85 and 0.95. A lower k reduces the useful work and shows up as heat re-heated into the steam."),

    P("What causes the disk (windage) friction loss in a steam turbine?",
      "The friction and drag between the rotating discs, blades and shaft against the surrounding steam, which grows with rotational speed and must be treated as an internal loss.",
      "Windage friction is drag between the rotor and the steam in the casing.",
      "As the rotor spins in steam, shear drag acts over the disc faces, blade bands and shaft surface. The resisting torque grows about as n²D⁵, so the power lost is roughly proportional to n³D⁵, meaning it becomes severe for large high-speed rotors. The absorbed work is returned to the steam as heat, lowering the useful output. It is accounted as part of the internal losses of the turbine."),

    P("Where does the tip leakage loss occur, and why is it worse in a reaction turbine?",
      "Leakage occurs through the small clearance between the moving blade tips and the casing; reaction turbines lose more because their moving blades carry a pressure drop across them.",
      "Any pressure difference across the blade drives leakage.",
      "A gap must exist between the blade tips and the casing so the blades can turn, and through this gap steam flows from the high-pressure side to the low-pressure side without doing work. In an impulse stage the pressure is equal on both sides of the moving row, so tip leakage is small. In a reaction stage the moving blades themselves expand the steam, creating a pressure difference that drives stronger leakage. Hence reaction turbines suffer a larger tip leakage loss, and shrouding or labyrinth strips are added to restrain it."),

    P("What is the purpose of gland packing or labyrinth glands on a turbine shaft?",
      "To prevent steam leakage where the shaft passes through the casing, using labyrinth or carbon ring seals that throttle the leaking steam along a long serrated path.",
      "Seals are needed wherever the shaft crosses the casing.",
      "The shaft must exit the casing at the high-pressure end and may enter it at the low-pressure end, and steam would escape through these openings. Labyrinth glands force the leaking steam through a long series of fins, dissipating its pressure without allowing a large flow. At the low-pressure gland a little sealing steam is admitted to stop air leaking into the vacuum. The small sealing flow is the gland (packing) loss of the machine."),

    P("How does moisture in the final stages harm a steam turbine?",
      "Moisture causes a wetness loss that lowers the efficiency and erodes the last-stage blades, because water droplets impinge on the blades at high relative speed.",
      "Water droplets at high relative speeds damage the moving blades.",
      "As steam expands into the wet region in the low-pressure stages, fine water droplets form. These droplets travel slower than the vapour and strike the blade surfaces, braking the rotation and scrubbing the metal. The result is a wetness loss and progressive erosion of the blade tips, trailing edges and shrouds. Reheating, steam separation in the casing and erosion-resistant hard facings on the blade inlet edge are the standard remedies."),

    P("What is the carry-over (leaving) loss in a turbine stage?",
      "It is the kinetic energy carried away by the steam leaving the stage, which is lost and reappears only as heat further downstream.",
      "The exit velocity squared represents energy not converted to work.",
      "At the outlet of every stage the steam still possesses a finite velocity, and its kinetic energy V2²/2 is not recovered within that stage. This leaving energy is the carry-over loss; in multi-stage machines a small part may be recovered in the following nozzle, but most becomes reheat. The loss is minimised by designing the exit velocity to be axial and small. In the exhaust stage the whole leaving energy is thrown into the condenser."),

    P("Which part of a turbine is most affected by blade erosion due to wetness?",
      "The last-stage moving blades, especially the tips and the trailing edges near the root, where the high-relative-velocity water droplets strike the surface.",
      "Erosion concentrates where droplet impact energy is greatest.",
      "In the final low-pressure stages the moisture fraction can reach 10% to 15%, and the droplets travel much slower than the vapour. The relative velocity between the fast blade and the slower droplets is highest near the blade tip, so erosion marks appear at the tip of the leading edge and at the trailing edge near the root. Modern blades use hard shields such as Stellite at these zones. Reheating before the low-pressure cylinder keeps the moisture low enough to control the damage."),

    P("How does throttle governing control a steam turbine?",
      "A throttle valve in the main steam line reduces the pressure, and hence the mass flow, of the steam supplied to all nozzle groups, lowering the output.",
      "Oldest method; reduces pressure for all steam.",
      "In throttle governing a single valve throttles the incoming steam so that the pressure at the turbine inlet falls, which reduces the mass flow and therefore the output. The lowering of pressure also lowers the available drop and the stage efficiency at part load. It is simple and cheap, and suited to reaction turbines that are difficult to nozzle-govern. The governing efficiency drops noticeably when the load falls much below the design value."),

    P("How does nozzle (group) governing control the output of a turbine?",
      "The nozzles of the first stage are divided into groups, each fed by its own valve; output is changed by admitting steam to a varying number of groups at full pressure.",
      "Group nozzle control keeps the open groups at full boiler pressure.",
      "Nozzle governing splits the first-stage nozzle ring into several sectors, each with a separate valve. At reduced load some valves close completely, so the open groups still take steam at nearly full pressure and full velocity. The efficiency stays reasonably high because the active groups run at their design condition. The group being throttled at the moment of opening forms a small loss. This method suits impulse turbines."),

    P("What does bypass governing do in a steam turbine?",
      "When the first stages are fully open, extra steam is admitted directly into an intermediate stage through a bypass valve, raising the output beyond the normal rating.",
      "Bypass passes steam around the early stages.",
      "At overload the nozzle groups and even the whole first section can deliver no more steam, since the first stage would choke. Bypass governing opens a valve that feeds additional steam straight into a later stage, around the choked early stages. The extra steam works only through the remaining stages, so the efficiency at overload is lower. It is thus an overload device used together with throttle or nozzle governing."),

    P("At what speed does the emergency overspeed trip of a steam turbine act?",
      "The emergency (overspeed) governor trips at about 110% of the rated speed, rapidly closing the emergency stop valve to shut off the steam.",
      "A rise of about 10% triggers the protective trip.",
      "The emergency governor is an unbalanced lever or pin held by a spring, which flies out only when the speed rises well above normal. Its operating point is set near 110% of rated speed to prevent damage while allowing normal governing swings. On tripping, it releases the emergency stop valve, which snaps shut and cuts steam admission. The machine must then be re-latched and re-started by the operator."),

    P("Why is an overspeed trip essential for a turbine?",
      "If the load is suddenly thrown off, the rotor accelerates towards the runaway speed, which can exceed 150% of the normal speed and destroy the machine.",
      "With no load and full steam the rotor speeds away.",
      "A turbine has little inherent braking torque, so if the electric load is lost while steam admission remains unchanged, almost all the steam energy goes into accelerating the rotor. The rotor can reach 150% or more of rated speed within a short time. At such speeds centrifugal stresses may exceed the material strength and rupture the wheels or blades. The emergency governor trips at about 110% to cut the steam before the danger point."),

    P("Which governing method gives the better part-load efficiency: throttle or nozzle governing?",
      "Nozzle governing, because the open nozzle groups keep running at full pressure and speed ratio, whereas throttle governing chokes all the steam.",
      "Keeping groups at full pressure preserves efficiency.",
      "In nozzle governing the groups that stay open operate at full pressure with design velocity ratios, so their stage efficiency is preserved. The loss appears only in the group that is being opened or shut. In throttle governing every kilogram of steam is throttled at part load, shrinking the available drop. Hence nozzle governing is preferred where economy over a wide load range matters."),

    P("What is the control (governing) stage in a nozzle-governed turbine?",
      "It is the first stage whose nozzles are split into separately valved groups; a Curtis wheel is often used here to absorb the large group drops.",
      "The control stage handles the varying first-stage drop.",
      "The control stage is the first nozzle ring of a nozzle-governed machine, divided into several sectors each fed by its own valve. Whenever the load changes, the drop across this stage changes, reaching its maximum when all groups are shut except one. A velocity-compounded (Curtis) wheel is therefore preferred, as it can absorb that large varying drop in one wheel. The rest of the turbine stages then see almost constant conditions."),

    P("Why are reaction (compounded) turbines normally governed by the throttle method rather than nozzle groups?",
      "Because the many small stages and small blade heights of a reaction machine make group nozzle control impractical, and throttle governing is simple and adequate.",
      "Reaction blading is not suited to separate nozzle groups.",
      "Reaction turbines are built with a large number of low-diameter stages instead of a small number of large nozzle wheels. Dividing reaction blading into separately valved groups is difficult and does not produce a clear control stage. Throttle governing is mechanically simple, and reaction sets usually run base-loaded at high efficiency. Where wide-range load control is essential, a Curtis control stage is added at the inlet."),

    P("What is a back-pressure (non-condensing) turbine?",
      "A turbine that exhausts steam at a pressure above atmospheric for industrial or process use, so no condenser is needed and all the exhaust heat is utilised.",
      "Exhaust pressure above atmosphere; process heating use.",
      "In a back-pressure turbine the exhaust steam, still at a useful pressure, is delivered to a factory process or heating network. There is no condenser, so the back end of the cycle is simple and cheap. Because the exhaust pressure is high, the enthalpy drop and the power per kilogram are small, but the rejected heat is fully used. Such machines dominate cogeneration plants."),

    P("What is a condensing turbine?",
      "A turbine whose exhaust enters a condenser maintained below atmospheric pressure, giving the largest possible enthalpy drop and the highest cycle efficiency.",
      "A condenser pulls the exhaust pressure far below atmosphere.",
      "A condensing turbine discharges into a vacuum of typically 0.04 to 0.1 bar maintained by the condenser. The low exhaust pressure greatly extends the expansion, adding a large extra enthalpy drop and therefore more work per kilogram. This is why condensing sets have the highest thermal efficiencies. The cooling-water consumption and the condenser itself are the penalties."),

    P("What is an extraction (pass-out) turbine?",
      "Steam is withdrawn at one or more intermediate pressures for feed-water heating or process use, and the remaining steam continues to the condenser.",
      "Some steam is bled out part-way along the turbine.",
      "In a pass-out turbine, openings at intermediate stages bleed part of the flow before it reaches the exhaust. The bled steam may serve industrial processes or preheat the boiler feed water, while the rest expands to the condenser. This raises the overall cycle efficiency because heat that would otherwise be rejected in the condenser becomes useful. The bled quantity is controlled by pressure-regulating valves unless it flows to the heaters without control."),

    P("Why is bled (extracted) steam used to heat the feed water in a regenerative cycle?",
      "It returns heat to the boiler feed instead of rejecting it to the condenser, which increases the cycle efficiency, reduces condenser heat rejection and lowers the wetness of the last-stage steam.",
      "Bleeding intercepts heat before it reaches the cold condenser.",
      "Without bleeding, the whole heat of condensation goes to the cooling water and is wasted. By bleeding some steam at an intermediate stage, its heat is delivered to the feed water, raising the mean temperature of heat addition. The feed water therefore enters the boiler hotter, and the efficiency rises. As a bonus, less steam reaches the exhaust, reducing both the condenser duty and the low-pressure wetness."),

    P("What is a topping (superposed) turbine?",
      "It is a high-pressure high-temperature unit placed ahead of an existing turbine, whose exhaust continues through the older turbine to make better use of the steam.",
      "Superposed plant is added at the head of the existing set.",
      "A topping turbine is added upstream of an existing set when the boiler pressure is raised, allowing the steam to do an extra stage of work before it enters the old turbine. Its exhaust simply feeds the existing unit, so the two share the power output. This is a cheap way to modernise an old station. The topping unit usually discharges at the older machine's inlet condition."),

    P("Why is steam reheated between turbine stages?",
      "The steam is taken out after the first expansion, superheated again and re-admitted, which raises the mean temperature of heat reception and reduces the exhaust wetness.",
      "Reheat removes moisture from the low-pressure end.",
      "In a reheat cycle the steam is expanded for a while, withdrawn, reheated to nearly the inlet temperature and sent back for a second expansion. This raises the average temperature at which heat is added, so the cycle efficiency improves slightly. The main benefit is that the final exhaust dryness is much higher, protecting the last-stage blades from erosion. Reheat also raises the output for the same heat input."),

    P("Which benefit of reheating matters most for the low-pressure blades of a condensing turbine?",
      "The exhaust moisture is greatly reduced, so the last-stage blades are protected from wetness erosion and the wetness loss is lowered.",
      "Reheat dries the steam before the final expansion.",
      "Without reheat, an expansion to a deep condenser vacuum would finish with a dryness fraction below 0.85, giving heavy wetness losses and erosion. By re-superheating between the cylinders, the expansion into the low-pressure cylinder starts from a superheated state, so the final moisture drops to acceptable values. The wetness loss and erosion at the exhaust also fall. This is often cited as the chief reason for reheating, apart from the modest efficiency gain."),

    P("How is a modern large power turbine usually arranged in terms of impulse and reaction blading?",
      "It uses a Curtis impulse control stage at the inlet followed by reaction blading in the main cylinders, a configuration called an impulse-reaction combination.",
      "A Curtis control stage plus reaction blading is the common layout.",
      "Large machines typically start with a velocity-compounded (Curtis) impulse wheel as the control stage, which absorbs a large varying drop and suits nozzle governing. The main high, intermediate and low-pressure cylinders then use reaction blading for good stage efficiency. Alternatively, some makers use pure impulse blading throughout. The mixed impulse-reaction design combines the governing advantages of the Curtis wheel with reaction economy."),

    P("At which point is steam bled for regenerative feed heating in a turbine?",
      "At intermediate stages where the steam pressure is above condenser pressure, so its heat can be surrendered to the feed water as it returns to the boiler.",
      "Bleed points sit between inlet and exhaust.",
      "Bleed connections are taken from the intermediate stages of the cylinder, above the exhaust pressure, so the bled steam can heat the feed water progressively. Each heater works with one bleed pressure, and several heaters are cascaded from high to low pressure. The feed temperature rises step by step toward the boiler inlet. This ladder of heaters is the regenerative feed system of the station."),

    P("What does bleeding of steam at intermediate stages primarily reduce in the cycle?",
      "The heat rejected in the condenser and the amount the boiler must supply, thereby increasing the overall cycle efficiency.",
      "Less steam reaches the condenser and less heat is wasted.",
      "Because a portion of the flow is removed before the exhaust, less steam passes through the condenser, shrinking the condenser heat rejection. The same bled steam preheats the feed water, so the boiler needs a smaller heat input for the same steam output. Both effects lift the efficiency of the cycle. The turbine output falls slightly, but the net cycle gain is positive."),

    P("What is the difference between a surface condenser and a jet (mixing) condenser?",
      "In a surface condenser the steam and cooling water are kept apart by tubes, so the condensate is pure; in a jet condenser the two streams mix directly, making the condensate impure.",
      "Surface: separate streams; jet: direct mixing.",
      "The surface condenser transfers heat through tube walls, so the condensate never contacts the cooling water and can be returned to the boiler. The jet condenser sprays cooling water into the steam so they mix and condense together, which is cheap and effective but ruins the condensate for feed purposes. Surface condensers therefore dominate stationary power plants, while jet condensers suit cases where feed purity is not critical. The surface type can also hold the vacuum more stably because less air is entrained."),

    P("How is the vacuum created and maintained in a surface condenser?",
      "Causing the steam to condense reduces its specific volume enormously, which drops the pressure near the saturation value, and an air pump then removes the non-condensable air to maintain the vacuum.",
      "Condensing shrinks the steam to a tiny volume of water.",
      "Steam occupies roughly 1800 times the volume of the water it forms, so the sudden collapse of volume in the condenser sharply lowers the pressure toward the saturation pressure corresponding to the cooling-water temperature. Any air that leaks in with the steam would accumulate and destroy the vacuum, so an air pump or ejector continuously removes it. The residual absolute pressure is typically 0.04 to 0.1 bar. A vacuum gauge then reads the depression below the barometer."),

    P("What are the separate duties of the air pump and the condensate extraction pump of a condenser?",
      "The air pump removes the air and non-condensable gases so that the vacuum is retained, while the condensate extraction pump lifts the condensed water out of the hot well to the feed system.",
      "Air out, condensate forward.",
      "Non-condensable air must be drawn out continuously or it accumulates on top of the pool and raises the condenser pressure, so a dry air pump or air ejector deals with it. The condensed water gathers in the hot well at the condenser bottom and must be pumped away because it lies below the feed-pump suction. Hence a condensate extraction pump is provided in addition to the main condensing duty. Together they keep the vacuum steady and the water circuit closed."),

    P("In a surface condenser, 1 kg of steam with an exhaust enthalpy of 2400 kJ/kg condenses to water of 120 kJ/kg while the cooling water (cp = 4.19 kJ/kg·K) rises 12 °C. How much cooling water is needed per kg of steam?",
      "About 45 kg, since Q = 2400 − 120 = 2280 kJ/kg and m = 2280/(4.19 × 12) = 45.3 kg.",
      "Heat to reject = h_steam − h_condensate, then divide by cp·ΔT.",
      "Each kilogram of steam surrenders 2400 − 120 = 2280 kJ on condensing. The cooling water absorbs cp·ΔT = 4.19 × 12 = 50.28 kJ per kilogram. The required mass flow is therefore m = 2280/50.28 = 45.3 kg per kg of steam. This ratio of about 45 is called the cooling water ratio."),

    P("Which energy balance gives the heat rejected in a surface condenser per kg of steam?",
      "m_steam·(h_exhaust − h_condensate) = m_cw·cp·ΔT, so the steam-side heat is h_exhaust − h_condensate per kilogram.",
      "Steam-side drop equals cooling-water-side gain.",
      "Neglecting small losses, the heat lost by each kilogram of condensing steam, h_exhaust − h_condensate, is absorbed by the cooling water, m_cw·cp·ΔT. The condensate enthalpy is near the saturated-liquid value at the condenser pressure. This balance is the basis for sizing the cooling-water flow and the condenser area. Here h denotes specific enthalpy in kJ/kg."),

    P("Why does fitting a condenser improve the efficiency of a steam power plant?",
      "The condenser pushes the turbine exhaust pressure far below atmospheric, greatly enlarging the specific enthalpy drop available to the turbine, and returns pure condensate to the boiler.",
      "A vacuum exhaust adds a large extra expansion.",
      "Lowering the exhaust pressure from about 1 bar to 0.05 bar adds a substantial extra enthalpy drop to the expansion, increasing the work per kilogram. The thermal efficiency rises because more work is taken from the same boiler heat input. The condenser also turns the exhaust steam back into pure water for the boiler feed. These gains pay for the condenser, pumps and cooling system of a condensing plant."),

    P("A turbine rotor has a mean diameter of 1.2 m and runs at 3000 rpm. What is the blade speed u?",
      "u = 188.5 m/s, from u = πDN/60 = π × 1.2 × 3000/60 = 188.5 m/s.",
      "u = π·D·N / 60 with D in m and N in rpm.",
      "The blade speed is u = πDN/60 = π × 1.2 × 3000/60 = 188.5 m/s. This equals the tangential velocity at the mean diameter of the blade row. Having the speed in m/s lets it combine with the steam velocities in the diagram. It is a typical peripheral speed for a 50 Hz alternator line running at 3000 rpm."),

    P("In an impulse stage the blade speed is u = 120 m/s, the inlet whirl is Vw1 = 200 m/s and the exit whirl is Vw2 = 60 m/s. What is the work per kilogram of steam?",
      "31.2 kJ/kg, since W = u(Vw1 + Vw2) = 120 × (200 + 60) = 31200 J/kg = 31.2 kJ/kg.",
      "Multiply the blade speed by the sum of whirl components.",
      "The blade work per kilogram is u(Vw1 + Vw2) = 120 × 260 = 31200 J/kg. Converting to kilojoules gives 31.2 kJ/kg. This is the energy each kilogram of steam surrenders to the blades. The turbine diagram power is obtained by multiplying this value by the mass flow rate."),

    P("Steam flows at 8 kg/s in an impulse stage with u = 150 m/s, Vw1 = 180 m/s and Vw2 = 40 m/s. What is the blade power?",
      "264 kW, since P = m·u·(Vw1 + Vw2) = 8 × 150 × 220 = 264000 W.",
      "Power = mass flow × work per kg.",
      "The total whirl change is Vw1 + Vw2 = 220 m/s, so the work per kilogram is u × 220 = 150 × 220 = 33000 J/kg = 33 kJ/kg. Multiplying by 8 kg/s gives 264000 W = 264 kW of blade power. Mechanical losses would reduce the shaft output below this figure."),

    P("A turbine has a net work output of 1000 kJ per kg of steam at an overall efficiency of 80%. What is its specific steam consumption?",
      "4.5 kg/kWh, since SSC = 3600/(W·η) = 3600/(1000 × 0.8) = 4.5 kg/kWh.",
      "Divide 3600 kJ/kWh by the useful work per kg.",
      "The useful work per kilogram is W·η = 1000 × 0.8 = 800 kJ. One kWh equals 3600 kJ, so the steam needed is 3600/800 = 4.5 kg/kWh. This is the specific steam consumption. It is a widely used figure for comparing the economy of turbines."),

    P("A two-stage turbine has stage isentropic heat drops of 250 kJ/kg and 350 kJ/kg, while the overall isentropic drop between the same end states is 560 kJ/kg. Find its reheat factor.",
      "About 1.07, since RF = (250 + 350)/560 = 600/560 = 1.071.",
      "Sum of stage drops divided by the overall drop.",
      "The reheat factor is the sum of the stage isentropic heat drops divided by the overall isentropic heat drop. RF = 600/560 = 1.071, about 1.07. Because it exceeds unity, the machine can show a slightly better internal efficiency than the average stage efficiency. The value grows as the number of stages increases."),

    P("A Parson's reaction stage has a blade speed u = 300 m/s, nozzle angle α = 20° and inlet absolute velocity V1 = 360 m/s. Estimate the work per kilogram using W = 2u·V1·cosα.",
      "About 203 kJ/kg, since W = 2 × 300 × 360 × cos20° = 202973 J/kg ≈ 203 kJ/kg.",
      "For 50% reaction W = 2u·V1·cosα.",
      "For a 50% reaction stage with a symmetric diagram, W = 2u·V1·cosα, since the two whirl components are equal. Substituting, W = 2 × 300 × 360 × 0.9397 = 202973 J/kg, about 203 kJ/kg. This is the energy each kilogram of steam yields at the blade row. Dynamic head and practical efficiencies would reduce the shaft output proportionally.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC4_STEAMT;
  if (typeof window !== "undefined") window.SSC_JE_ENC4_STEAMT = SSC_JE_ENC4_STEAMT;
})();
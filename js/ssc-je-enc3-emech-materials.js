(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC3_EMECHMAT = {};

  SSC_JE_ENC3_EMECHMAT.emech = [
    P("Which statement about unit conversions is correct?",
      "1 N = 10⁵ dyn and 1 kgf = 9.81 N",
      "1 kgf is the weight of 1 kg mass under standard gravity.",
      "1 N = 10⁵ dyn (cgs unit), 1 kgf = 9.80665 N ≈ 9.81 N, 1 lbf = 4.448 N. In engineering, 1 kgf = 9.81 N is standard."),

    P("What is the conversion between horsepower (hp) and metric horse power (PS)?",
      "1 hp = 745.7 W and 1 PS = 735.5 W",
      "hp is the British unit, PS is metric (Pferdestärke = metric HP).",
      "1 hp = 745.69987 W ≈ 745.7 W; 1 PS = 735.49875 W ≈ 735.5 W. So 1 PS is about 1.4% smaller than 1 hp."),

    P("Which is the correct expression for the centroid of a semicircular lamina of radius r measured from the diameter base?",
      "ȳ = 4r / (3π)",
      "The centroid lies along the axis of symmetry, away from the diameter.",
      "For a semicircular lamina: ȳ = 4r/(3π) ≈ 0.4244r from the diameter. For a semicircular ARC the centroid is farther: ȳ = 2r/π ≈ 0.6366r. These two are frequently confused."),

    P("What is the centroid distance of a circular sector (half-angle α, radius r) from the centre?",
      "ȳ = 2r sin α / (3α)",
      "α must be expressed in radians.",
      "Sector centroid: ȳ = 2r sin α/(3α). Check: for a semicircle α = π/2 gives ȳ = 2r/(3π/2) = 4r/(3π), matching the semicircular lamina result."),

    P("Where is the centroid of a SOLID hemisphere of radius r measured from the flat face?",
      "3r/8 from the flat face",
      "The centroid of a solid hemisphere is closer to the base than that of a hemispherical shell.",
      "Solid hemisphere: 3r/8 = 0.375r from flat face. Hollow hemispherical shell: r/2 from flat face. Solid cone from base: h/4. Cone surface from apex: 2h/3."),

    P("The moment of inertia of a triangle about ITS BASE (base b, height h) is:",
      "bh³/12",
      "About the centroidal axis parallel to the base the value is bh³/36.",
      "I_base = bh³/12, I_centroid = bh³/36. Parallel axis check: I_base = I_c + A(h/3)² = bh³/36 + (bh/2)(h²/9) = bh³/36 + bh³/18 = bh³/12. Correct."),

    P("What is the radius of gyration of a rectangular lamina of depth d about its centroidal axis parallel to the width?",
      "d/√12",
      "Radius of gyration k = √(I/A). For a rectangle I = bd³/12 and A = bd.",
      "k = √(bd³/12 ÷ bd) = √(d²/12) = d/√12 ≈ 0.2887d. Knowledge of this ratio lets you quickly compute k for any rectangular section."),

    P("The radius of gyration of a solid circular disc about its polar (centroidal axis perpendicular to the plane) axis is:",
      "r/√2",
      "For a disc I_polar = mr²/2. k = √(I/A) works for area as well.",
      "k = √(r²/2) = r/√2. The radius of gyration about the polar axis is larger than about a diameter. Never write polar k of a disc as r/2."),

    P("Which pair of friction coefficient values is correctly matched?",
      "Steel-steel dry = 0.5–0.6 and steel-steel lubricated = 0.1",
      "Dry friction is much larger than lubricated; rubber on concrete is the highest of the listed pairs.",
      "Typical values: steel-steel dry μ ≈ 0.5–0.6, lubricated μ ≈ 0.1; wood-on-wood μ ≈ 0.3–0.5; rubber on concrete μ ≈ 0.6–0.9; leather-on-steel μ ≈ 0.4. The dry/lubricated pair is the classic SSC question."),

    P("The angle of repose of dry sand from the horizontal is approximately:",
      "30° to 35°",
      "Angle of repose equals the angle of friction; for dry sand the friction angle is about 30°–35°.",
      "Angle of repose is the steepest slope at which loose material stays stationary. For dry sand θ ≈ 30°–35°; for wet sand θ ≈ 45°; for gravel ~40°. μ = tan θ gives μ ≈ 0.58–0.70."),

    P("The law of a simple machine states that:",
      "MA / VR = constant for a given machine (equal to its efficiency)",
      "MA = Load/Effort, VR is fixed by geometry alone.",
      "Simple machine law: MA/VR = constant = η. For an ideal frictionless machine η = 1; in practice η < 1 because of friction. VR is determined only by geometry (lever arms, pulley cords, screw lead)."),

    P("In Lami's theorem, three concurrent coplanar forces F₁, F₂, F₃ acting at a point are in equilibrium if:",
      "F₁/sin α₁ = F₂/sin α₂ = F₃/sin α₃",
      "Each force is proportional to the sine of the angle between the other two forces.",
      "Let α₁ be the angle between F₂ and F₃, α₂ between F₁ and F₃, α₃ between F₁ and F₂. Then F₁/sin α₁ = F₂/sin α₂ = F₃/sin α₃. The three angles sum to 360°."),

    P("Varignon's theorem states that:",
      "The moment of the resultant about any point equals the algebraic sum of the moments of the component forces about that point.",
      "It converts a moment problem into a sum of component moments.",
      "Varignon's theorem: M = Σ(Fᵢ × dᵢ) = R × d. It is used repeatedly to locate the line of action of a resultant system, e.g. in finding the point of application of a resultant of parallel forces."),

    P("Which statement about zero-force members in a truss is correct?",
      "If only two non-collinear members meet at an unloaded joint, both members carry zero force.",
      "Zero-force members exist for practical reasons such as stability during erection and buckling support.",
      "Zero-force rules: (1) two members, unloaded joint, non-collinear → both zero-force. (2) three members, two collinear, unloaded joint → the non-collinear third member is zero-force. Both are favourite SSC assertions."),

    P("A flat belt wraps 180° around a pulley with μ = 0.3. The tension ratio T₁/T₂ is approximately:",
      "e^(0.3π) ≈ 2.57",
      "Belt friction: T₁/T₂ = e^(μθ) with θ in radians. 180° = π rad.",
      "T₁/T₂ = e^(0.3 × π) = e^(0.9425) ≈ 2.57. For the same belt at 270° wrap: e^(0.3 × 4.712) = e^(1.414) ≈ 4.11. Doubling the wrap angle hugely increases the ratio."),

    P("What is the centripetal acceleration of a particle moving at 10 m/s on a circle of radius 5 m?",
      "20 m/s²",
      "Centripetal acceleration a = v²/r.",
      "a = v²/r = 10²/5 = 100/5 = 20 m/s². Equivalently a = ω²r with ω = v/r = 2 rad/s: a = 4 × 5 = 20 m/s². Centripetal acceleration always points toward the centre."),

    P("A force of 50 N acts at 60° to a displacement of 4 m. The work done is:",
      "100 J",
      "Work W = F s cos θ in the direction of displacement. cos 60° = 0.5.",
      "W = F s cos θ = 50 × 4 × cos 60° = 50 × 4 × 0.5 = 100 J. Work is negative when θ > 90° (force opposes motion), positive when θ < 90°."),

    P("A 2 kg ball hits a wall at 3 m/s and rebounds at 2 m/s. The magnitude of the impulse on the ball is:",
      "10 N·s, directed away from the wall",
      "Impulse = change in momentum = m(v₂ − v₁), a vector that must include rebound direction.",
      "Taking motion toward the wall as positive: v₁ = +3, v₂ = −2 m/s. Impulse = m(v₂ − v₁) = 2(−2 − 3) = −10 N·s. The magnitude is 10 N·s pointing away from the wall. Neglecting the sign change is the classic trap."),

    P("The coefficient of restitution of a steel ball striking a steel plate is approximately:",
      "0.55",
      "e = (velocity of separation)/(velocity of approach). Steel is intermediate, not fully elastic.",
      "e (steel on steel) ≈ 0.55. For a perfectly elastic collision e = 1; for perfectly plastic e = 0. Reference values: glass on glass ≈ 0.94, wood on wood ≈ 0.5. This is a recurring CET/SSC numeric."),

    P("In projectile motion, the time of flight for a projectile launched at speed u at angle θ to the horizontal is:",
      "T = 2u sin θ / g",
      "Time of flight depends only on the vertical component of the launch velocity.",
      "T = 2u sin θ/g. Maximum height H = u² sin²θ/(2g). Range R = u² sin 2θ/g, greatest at θ = 45° where R_max = u²/g. Time to maximum height = u sin θ/g = T/2."),

    P("A projectile is launched at 20 m/s at 30° to the horizontal. Its horizontal range is approximately:",
      "35.3 m",
      "R = u² sin 2θ / g with g = 9.81 m/s² and θ = 30°.",
      "R = (20² × sin 60°)/9.81 = (400 × 0.8660)/9.81 = 346.4/9.81 ≈ 35.3 m. Time of flight = 2(20)(0.5)/9.81 = 20/9.81 ≈ 2.04 s; max height = 20²(0.25)/(2 × 9.81) ≈ 5.10 m."),

    P("Which of the following statements about moment of inertia is INCORRECT?",
      "The moment of inertia of a body is independent of the position of the axis chosen.",
      "MI is meaningless without specifying the axis; the parallel axis theorem proves axis dependence.",
      "MI depends on shape, size, mass distribution AND the choice of axis. The parallel axis theorem I = I_cm + md² shows the dependence explicitly. The statement given is false and is the correct pick."),

    P("The moment of inertia of a thin circular ring of mass m and radius r about its polar (central plane-normal) axis is:",
      "mr²",
      "All the mass of a thin ring lies at distance r from the centre.",
      "I_polar(ring) = mr² because every element is at radius r. Compare the disc: I_polar = mr²/2. So for equal mass and radius the ring has twice the disc MI. Diameter axes: ring mr²/2, disc mr²/4."),

    P("A 100 N block on a 30° rough incline (μ = 0.5) is just about to move UP the plane under a horizontal force P. The value of P is approximately:",
      "151.5 N",
      "Use two equations: along-plane and normal. N = W cos 30° + P sin 30°.",
      "Normal: N = 100 cos 30° + P sin 30° = 86.6 + 0.5P. Along plane: P cos 30° = 100 sin 30° + 0.5 N = 50 + 0.5(86.6 + 0.5P) = 93.3 + 0.25P. So 0.866P − 0.25P = 93.3 → 0.616P = 93.3 → P ≈ 151.5 N."),

    P("What is the efficiency η of a screw jack with lead angle λ and friction angle φ?",
      "η = tan λ / tan(λ + φ)",
      "Ideal effort ratio is tan λ; actual includes the friction angle.",
      "For a screw jack η = tan λ/tan(λ + φ). VR = 2πr/l. Self-locking requires φ ≥ λ. When φ = 0, η = 1 (impossible in practice). MSS/JE exam favourites include this formula verbatim."),

    P("A uniform rod of length L leans against a smooth vertical wall making 60° with the horizontal. The horizontal reaction at the wall is:",
      "0.289W (i.e. W/(2√3))",
      "Take moments about the base. The rod's weight W acts at mid-length.",
      "Moment about base: R_wall × L sin 60° = W × (L/2) cos 60° → R_wall = W cos 60°/(2 sin 60°) = W × 0.5/(2 × 0.866) = 0.2887W ≈ 0.29W. The floor reaction equals W vertically since the wall is smooth."),

    P("Which statement about a projectile at its maximum height is correct?",
      "The vertical velocity is zero and the speed equals u cos θ.",
      "Horizontal velocity is never lost (no horizontal force); the vertical component vanishes at the top.",
      "At maximum height v_y = 0 but v_x = u cos θ, so the speed equals u cos θ. The magnitude of velocity is minimum there. The trajectory is a parabola; range formula assumes landing height equals launch height."),

    P("The angular momentum of a particle of mass m moving in a circle of radius r with angular velocity ω is:",
      "L = mr²ω",
      "Angular momentum L = r × p; in circular motion r ⊥ v, so L = mvr = mr²ω.",
      "L = mvr = m(rω)r = mr²ω = Iω. Units kg·m²/s. For a rigid body, L = Iω; conservation of angular momentum (I₁ω₁ = I₂ω₂) explains the spinning skater pulling arms inward."),

    P("In an Atwood machine with hanging masses 3 kg and 5 kg over a smooth pulley, the acceleration of the system is:",
      "g/4 = 2.45 m/s²",
      "Atwood machine: a = (m₂ − m₁)g/(m₂ + m₁).",
      "a = (5 − 3)g/(5 + 3) = 2g/8 = g/4 = 2.45 m/s². Tension T = 2m₁m₂g/(m₁ + m₂) = 2(3)(5)(9.81)/8 ≈ 36.8 N. If masses were equal, a = 0 and T = mg."),

    P("The elastic strain energy U stored in a bar of length L and cross-section A under axial load P is:",
      "U = P²L/(2AE)",
      "Equivalently U = σ²AL/(2E) or (½)σε × volume.",
      "U = P²L/(2AE) = σ²AL/(2E). Also U = (½)Pδ where δ = PL/AE. Strain energy per unit volume = σ²/(2E) = ½σε, the area under the linear stress-strain curve. Used in impact loading theory."),

    P("Which statement about the friction circle method is correct?",
      "A friction circle of radius r sin φ is drawn at each pin, and the joint reaction acts tangent to it.",
      "φ = tan⁻¹(μ). The resultant reaction of a pin with friction must be tangent to the friction circle.",
      "Friction circle radius = r sin φ ≈ r tan φ = rμ for small angles. The resultant force at each pin joint must lie tangent to its friction circle. Standard tool for quick-return and slider-crank force analysis."),

    P("The mechanical advantage of a wheel and axle of radii R (wheel) and r (axle) is:",
      "R/r",
      "Effort works on the wheel rim, load hangs on the axle. Ideal MA = VR = R/r.",
      "VR = (2πR)/(2πr) = R/r, so ideal MA = R/r. Actual MA = W/E < VR because of axle friction, and efficiency η = MA/VR = WR/(Er). One revolution moves effort 2πR and load 2πr."),

    P("In a perfectly inelastic (e = 0) head-on collision between an equal moving mass m and a stationary mass m, the fraction of kinetic energy lost is:",
      "1/2 (50%)",
      "After collision both masses move together at v/2 by momentum conservation.",
      "Momentum: mv = 2mv′ → v′ = v/2. KE₁ = ½mv², KE₂ = ½(2m)(v/2)² = ¼mv². Loss = ¼mv², fraction lost = (¼mv²)/(½mv²) = ½ = 50%. Equal masses lose exactly half the energy."),

    P("The relation between the coefficient of friction μ and the angle of friction φ is:",
      "μ = tan φ",
      "The angle of friction is that of the resultant of normal reaction and friction with the normal.",
      "When a body is at limiting equilibrium, the resultant reaction inclines to the normal by the angle of friction φ, and μ = tan φ. Numerically, μ = 0.5 corresponds to φ ≈ 26.57°."),

    P("A body just begins to slide down a rough plane when it is inclined at angle α to the horizontal. Which relation holds?",
      "μ = tan α (angle of repose equals angle of friction)",
      "Angle of repose and angle of friction are equal at limiting equilibrium.",
      "At limiting equilibrium W sin α = μN, N = W cos α → μ = tan α, so α is both the angle of repose and the angle of friction. If α > tan⁻¹(μ) the body slides spontaneously."),

    P("The centroid of a quarter-circular lamina of radius r measured from each of its straight edges is:",
      "4r/(3π) from each straight edge",
      "The two straight edges are the symmetry lines; the centroid is at (4r/3π, 4r/3π).",
      "For a quarter circle, ȳ = x̄ = 4r/(3π) ≈ 0.4244r from each straight edge. This equals the semicircle result because the quarter is half the half. Frequently asked along with semicircle (4r/3π) and quadrant of a circle."),

    P("The centroid of a triangle measured from its base along the median is at:",
      "h/3 from the base",
      "The centroid divides each median in the ratio 2:1 from the vertex.",
      "Centroid of a triangle lies at h/3 above the base (i.e. 2h/3 below the apex). The medians intersect at the centroid, dividing each median in the ratio 2:1 measured from the vertex."),

    P("The moment of inertia of a circular section of diameter d about a diametral axis is:",
      "πd⁴/64",
      "About the polar (central) axis it is πd⁴/32, exactly double.",
      "I_diameter = πd⁴/64 and I_polar = πd⁴/32. For the same section, polar MI = 2 × diametral MI because J = I_x + I_y and I_x = I_y by symmetry."),

    P("In a Mohr's circle for a biaxial stress state with principal stresses σ₁ and σ₂, the centre and radius are:",
      "Centre = (σ₁ + σ₂)/2 and Radius = (σ₁ − σ₂)/2",
      "The centre is the mean of the principal stresses; the radius is half their difference.",
      "For the general (σᵪ, σᵧ, τᵪᵧ) state: centre C = (σᵪ + σᵧ)/2, radius R = √[((σᵪ − σᵧ)/2)² + τᵪᵧ²]. The principal stresses are C ± R. This visualises normal and shear stresses on any plane."),

    P("A rectangular lamina 300 mm × 200 mm has a concentric circular hole of 100 mm diameter. Its moment of inertia about the centroidal horizontal axis is approximately:",
      "1.95 × 10⁸ mm⁴",
      "Both rectangle and hole share the same centroid, so simply subtract I_hole from I_rect.",
      "I_rect = 300 × 200³/12 = 2.0 × 10⁸ mm⁴. I_hole = π(100)⁴/64 = 4.91 × 10⁶ mm⁴. I_net = 2.0 × 10⁸ − 4.91 × 10⁶ ≈ 1.95 × 10⁸ mm⁴. If the hole were offset, add the parallel-axis term md²."),

    P("The moment of inertia of a quarter-circular plate about one of its straight edges is:",
      "πr⁴/16",
      "It equals the full-circle value divided by 4 (by symmetry of the integral).",
      "I of a quarter circle about a straight edge = πr⁴/16. Compare: full circle I_d = πr⁴/4? No — full circle about diameter = πd⁴/64 = πr⁴/4. So quarter = one quarter of that = πr⁴/16. Verify with centroidal shift I_c = πr⁴/16 − Aȳ²."),

    P("The polar moment of inertia of a solid circular shaft of diameter d is:",
      "πd⁴/32",
      "J = I_x + I_y and I_x = I_y = πd⁴/64 for a circle.",
      "J = πd⁴/32. Torsion formula τ = Tr/J; angle of twist φ = TL/(GJ). Compare section modulus in torsion Z_p = πd³/16 which equals J/r."),

    P("The section modulus of a solid circular section of diameter d in bending is:",
      "πd³/32",
      "Section modulus Z = I/y_max and y_max = d/2.",
      "Z = I/(d/2) = (πd⁴/64)/(d/2) = πd³/32. Bending stress σ = M/Z. For a hollow shaft: Z = π(D⁴ − d⁴)/(32D). This is the classic strength calculation for beams."),

    P("The section modulus of a rectangular section of breadth b and depth d is:",
      "bd²/6",
      "Z = I/y_max with y_max = d/2.",
      "Z = (bd³/12)/(d/2) = bd²/6. Bending stress σ = M/Z. To double the bending strength of a rectangular beam, double the DEPTH gives 4× strength (since Z ∝ d²), while doubling breadth only doubles it."),

    P("The radius of gyration of a solid circular section about a diametral axis is:",
      "d/4",
      "k = √(I/A). About a diameter I = πd⁴/64, A = πd²/4.",
      "k = √[(πd⁴/64)/(πd²/4)] = √(d²/16) = d/4. About the polar axis of a solid circle k = d/(2√2) ≈ 0.354d. These two distinct values (d/4 vs d/2√2) are a common trick."),

    P("The radius of gyration of a hollow circular area (outer D, inner d) about its polar axis is:",
      "√((D² + d²)/8)",
      "k = √(J/A) using J = π(D⁴ − d⁴)/32 and A = π(D² − d²)/4.",
      "J/A = [π(D⁴ − d⁴)/32] ÷ [π(D² − d²)/4] = (D⁴ − d⁴)/[8(D² − d²)] = (D² + d²)/8. For a solid circle d = 0 gives k = D/(2√2), matching the solid polar value."),

    P("Two forces of 6 N and 8 N act at a point at 60° to each other. The magnitude of the resultant is:",
      "12.17 N",
      "Parallelogram law: R = √(F₁² + F₂² + 2F₁F₂ cos θ).",
      "R = √(36 + 64 + 2 × 6 × 8 × cos 60°) = √(100 + 48) = √148 ≈ 12.17 N. If θ = 90° the resultant would be 10 N. Direction: tan⁻¹[(8 sin 60°)/(6 + 8 cos 60°)] ≈ 34.7° with the 6 N force."),

    P("For the 6 N and 8 N forces at 60° (above), the resultant makes an angle with the 6 N force of approximately:",
      "34.7°",
      "tan φ = F₂ sin θ / (F₁ + F₂ cos θ).",
      "tan φ = (8 sin 60°)/(6 + 8 cos 60°) = 6.928/10.0 = 0.6928 → φ ≈ 34.7°. The resultant bisects slightly toward the larger force but not at the exact angle because the forces are unequal."),

    P("Two equal forces P act at a point with an included angle θ. Their resultant is:",
      "2P cos(θ/2)",
      "Parallelogram law with F₁ = F₂ = P.",
      "R = √(P² + P² + 2P² cos θ) = √(2P²(1 + cos θ)) = 2P cos(θ/2). For θ = 60°, R = 2P cos 30° = 1.732P; for θ = 120°, R = P."),

    P("A 100 N force makes 40° with the horizontal. Its horizontal component is:",
      "76.6 N",
      "Horizontal component = F cos θ. cos 40° = 0.7660.",
      "F_x = 100 cos 40° = 100 × 0.7660 = 76.6 N. Vertical component = 100 sin 40° = 64.3 N. Components must equal the resultant in magnitude: √(76.6² + 64.3²) = 100 N — this is the resolution check."),

    P("A cantilever 2 m long carries 500 N at the free end. With E = 200 GPa and I = 10⁶ mm⁴, the free-end deflection is:",
      "6.67 mm downward",
      "Deflection δ = PL³/(3EI). Convert I to m⁴.",
      "δ = 500 × 2³/(3 × 200 × 10⁹ × 10⁻⁶) = 4000/(6 × 10⁵) = 6.67 × 10⁻³ m = 6.67 mm. 10⁶ mm⁴ = 10⁻⁶ m⁴. This is the single most asked cantilever formula in JE exams."),

    P("A 10 mm diameter rod, gauge length 200 mm, stretches 0.2 mm under an axial load of 15.7 kN. The modulus of elasticity is approximately:",
      "200 GPa",
      "σ = P/A, ε = δ/L, E = σ/ε.",
      "A = π(10)²/4 = 78.54 mm², σ = 15700/78.54 ≈ 200 MPa. ε = 0.2/200 = 10⁻³. E = 200 × 10⁶/10⁻³ = 200 × 10⁹ Pa = 200 GPa. Any rod that elongates 0.1% at 200 MPa yields 200 GPa."),

    P("A specimen of initial gauge length 100 mm measures 112 mm after fracture. The percentage elongation is:",
      "12%",
      "% elongation = (final − initial)/initial × 100.",
      "% elongation = (112 − 100)/100 × 100 = 12%. Percentage elongation is a ductility index; combined with % reduction in area it grades the ductility of the material in a tensile test."),

    P("Parallel forces 40 N, 60 N and 80 N act at points 0 m, 1 m and 2 m on a bar. The resultant and its location (from the first force) are:",
      "180 N acting at 1.22 m",
      "Resultant R = ΣF = 180 N; x̄ = Σ(F·x)/R.",
      "R = 40 + 60 + 80 = 180 N. x̄ = (40×0 + 60×1 + 80×2)/180 = 220/180 ≈ 1.22 m from the 40 N force. This is Varignon's theorem applied to parallel force systems."),

    P("A 50 kg block rests on a rough horizontal floor with μ = 0.3. The force needed to just start it moving is:",
      "147.15 N",
      "F = μN = μmg. N equals the weight on a horizontal floor.",
      "F = μmg = 0.3 × 50 × 9.81 = 147.15 N. If μ_s = 0.3 and μ_k = 0.2, once moving only 98.1 N is needed. Static friction is slightly greater than kinetic friction for most surfaces."),

    P("For the 400 N tight side and the 180° wrap case (μ = 0.3), the slack-side tension is approximately:",
      "156 N",
      "T₁/T₂ = e^(μθ) ≈ 2.566, so T₂ = T₁/2.566.",
      "T₂ = 400/2.566 ≈ 155.9 ≈ 156 N. The effective driving force ≈ T₁ − T₂ = 244 N. The power transmitted = (T₁ − T₂)v. Belt tensions therefore govern how much power a drive can carry."),

    P("The kinetic energy of a 10 kg body moving at 5 m/s is:",
      "125 J",
      "KE = ½mv² = ½ × 10 × 5².",
      "KE = ½(10)(25) = 125 J. Doubling the speed quadruples KE. Work-energy theorem: the work done by resultant forces equals the change in KE."),

    P("The potential energy of a 2 kg body raised 10 m above the datum is:",
      "196.2 J",
      "PE = mgh = 2 × 9.81 × 10.",
      "PE = 2 × 9.81 × 10 = 196.2 J. On an inclined plane the height used is the vertical rise, not the slope distance. PE is always relative to a chosen datum."),

    P("If 500 J of work is done in 2 seconds, the power developed is:",
      "250 W",
      "Power = Work/time = 500/2.",
      "P = 500/2 = 250 W. In machines: power = torque × angular speed = (2πNT)/60 with N in rpm. 1 hp = 745.7 W and 1 PS = 735.5 W."),

    P("A shaft rotates at 1200 rpm. Its angular velocity in rad/s is approximately:",
      "125.7 rad/s",
      "ω = 2πN/60 = 2π × 1200/60 = 40π.",
      "ω = 2π × 1200/60 = 40π = 125.66 ≈ 125.7 rad/s. Memorised pairs: 600 rpm → 62.8, 1200 rpm → 125.7, 3000 rpm → 314.2 rad/s."),

    P("A point on a mechanism rotates at 80 rad/s at a radius of 0.25 m. Its linear speed is:",
      "20 m/s",
      "v = ωr = 80 × 0.25.",
      "v = 80 × 0.25 = 20 m/s. This is the basic relation v = ωr used for crank pins, pulley rims and gear teeth. Centripetal acceleration here = ω²r = 80² × 0.25 = 1600 m/s²."),

    P("The energy stored in a flywheel of moment of inertia I rotating at angular velocity ω is:",
      "½Iω²",
      "Rotational KE = ½Iω², the direct analogue of ½mv².",
      "E = ½Iω². For a flywheel, the speed range between the highest and lowest ω in an engine cycle determines the coefficient of fluctuation of speed. Flywheels store energy and smooth out fluctuations."),

    P("Which angular kinematics relation is correct for uniformly accelerated rotation?",
      "ω = ω₀ + αt and θ = ω₀t + ½αt²",
      "These mirror the linear equations with ω ≡ v, α ≡ a, θ ≡ s.",
      "Rotational equivalents: ω = ω₀ + αt; θ = ω₀t + ½αt²; ω² = ω₀² + 2αθ. Linear analogues s = ut + ½at²; v² = u² + 2as. Memorise them in one table for quick recall."),

    P("A spring extends 40 mm when a 50 N load is applied. Its stiffness is:",
      "1250 N/m",
      "k = F/x with x in metres: 50/0.04.",
      "k = 50/0.04 = 1250 N/m. Series springs: 1/k_eff = 1/k₁ + 1/k₂ (softer). Parallel springs: k_eff = k₁ + k₂ (stiffer). A 4 mm extension at the same load corresponds to 12.5 kN/m."),

    P("A simply supported beam of 6 m span carries a 10 kN point load 2 m from the left support. The reactions are:",
      "6.67 kN (left) and 3.33 kN (right)",
      "Take moments about the right support: R_A × 6 = 10 × 4.",
      "R_A = 10 × 4/6 = 6.67 kN; R_B = 10 × 2/6 = 3.33 kN. Check: 6.67 + 3.33 = 10 kN. The reaction is larger at the support nearer the load, exactly in inverse proportion to the distance from the load."),

    P("Which statement about a spinning ice skater pulling her arms in is correct?",
      "Her angular velocity increases because her moment of inertia decreases while angular momentum stays constant.",
      "Conservation of angular momentum: I₁ω₁ = I₂ω₂. No external torque on a frictionless ice surface.",
      "With I₂ < I₁ and L conserved, ω₂ = I₁ω₁/I₂ > ω₁. The kinetic energy ½Iω² actually increases, supplied by the internal work of pulling arms in. This is the classic demonstration of angular momentum conservation."),

    P("For a perfectly elastic head-on collision between two equal masses, one initially at rest, the outcome is:",
      "The moving mass stops and the stationary mass moves away with the original velocity (velocities are exchanged).",
      "e = 1 and equal masses swap velocities exactly.",
      "For m₁ = m₂ and e = 1: v₁′ = 0 and v₂′ = u. Energy and momentum are both conserved. This velocity-exchange result generalises: in any perfectly elastic head-on collision the relative speed of separation equals the relative speed of approach."),

    P("Which statement about a body sliding down a frictionless inclined plane from rest at height h is correct?",
      "Its speed at the bottom is √(2gh), independent of mass and incline angle.",
      "Work-energy: mgh = ½mv². Only the vertical drop matters.",
      "v = √(2gh) regardless of mass or slope steepness: a steeper plane gives a shorter time but the same final speed. Time on the plane depends on the angle (t = √(2L/a) with a = g sin θ), but the speed does not."),

    P("A constant force of 25 N acts for 0.2 s on a 2 kg body initially at rest. Its final velocity is:",
      "2.5 m/s",
      "Impulse-momentum: F·t = m·Δv.",
      "v = Ft/m = 25 × 0.2/2 = 2.5 m/s. If the force acts opposite to motion it slows the body. This relation (impulse = change in momentum) is how cricket batsmen and vehicle airbags reduce impact forces — by increasing contact time."),

    P("For the projectile launched at 20 m/s at 30° (previous), the time of flight is approximately:",
      "2.04 s",
      "T = 2u sin θ/g = 2 × 20 × 0.5/9.81.",
      "T = 2 × 20 × sin 30°/9.81 = 20/9.81 ≈ 2.04 s. Time to maximum height is half: ≈ 1.02 s. Maximum height = u² sin²θ/(2g) = 400 × 0.25/19.62 ≈ 5.10 m."),
  ];

  SSC_JE_ENC3_EMECHMAT.materials = [
    P("The atomic packing factor (APF) of a BCC lattice is:",
      "0.68",
      "BCC: 2 atoms per unit cell, body diagonal √3a = 4r.",
      "APF(BCC) = 0.68. Compare FCC/HCP = 0.74 (highest) and simple cubic = 0.52. Atoms per cell: SC = 1, BCC = 2, FCC = 4, HCP = 6. These ratios are the top distribution memory items."),

    P("The atomic packing factor (APF) of FCC and HCP lattices is:",
      "0.74",
      "Both FCC and HCP are close-packed structures with identical packing factor.",
      "APF = 0.74 for both FCC and HCP, the densest possible packing of equal spheres. APF(BCC) = 0.68, APF(SC) = 0.52. Copper (FCC), aluminium (FCC) and magnesium (HCP) always give these densities."),

    P("The coordination number of an atom in an FCC lattice is:",
      "12",
      "Each FCC atom touches 12 nearest neighbours.",
      "Coordination numbers: FCC = 12 (also HCP = 12), BCC = 8, simple cubic = 6. The CN and APF are linked: tighter packing means higher CN. FCC 12-0.74, BCC 8-0.68, SC 6-0.52."),

    P("The coordination number of an atom in a BCC lattice is:",
      "8",
      "In BCC each atom has 8 nearest neighbours along body diagonals.",
      "CN(BCC) = 8, APF = 0.68. Each atom in BCC touches 8 others at the corners of the surrounding cube. Sodium, chromium and iron (α) crystallise in BCC."),

    P("Which statement about the lattice parameter of α-iron (BCC) is correct?",
      "a ≈ 0.287 nm",
      "Armco pure iron at room temperature is BCC with lattice parameter ≈ 0.287 nm.",
      "α-Fe (BCC, stable below 910°C): a ≈ 0.287 nm (2.87 Å). Compare FCC metals: Al a = 0.405 nm, Cu a = 0.3615 nm, γ-Fe (FCC) a ≈ 0.365 nm. These four lattice constants are standard exam data."),

    P("Which pair of FCC lattice parameters is correctly stated?",
      "Aluminium 0.405 nm and copper 0.3615 nm",
      "Al has the larger FCC cell; Cu is smaller and denser.",
      "Al (FCC): a = 0.405 nm, ρ = 2700 kg/m³. Cu (FCC): a = 0.3615 nm, ρ = 8900 kg/m³. The smaller cell plus heavier copper atoms explain why Cu is much denser than Al."),

    P("Which set of densities is correctly matched?",
      "Steel 7850, Al 2700, Cu 8900, Mg 1740 kg/m³",
      "The classic four: steel heaviest of the group, magnesium lightest.",
      "Steel ≈ 7850 kg/m³; pure Al ≈ 2700 kg/m³; Cu ≈ 8900 kg/m³ (8.96); Mg ≈ 1740 kg/m³. These feed the weight-saving logic in design: Mg is ~22% lighter than Al which is ~1/3 the density of steel."),

    P("Which set of melting points is correctly matched?",
      "Fe 1538°C, Cu 1085°C, Al 660°C, Pb 327°C",
      "Iron melts far above copper; lead melts lowest of the four.",
      "Fe 1538°C, Cu 1085°C, Al 660°C, Pb 327°C. Tungsten melts at 3422°C (highest metal). Soldering filler < 450°C and brazing filler > 450°C are fixed relative to these metals."),

    P("Which statement about the Rockwell hardness scales is correct?",
      "The C scale uses a 120° diamond cone with a 150 kgf load; the B scale uses a 1/16 inch ball with 100 kgf.",
      "Rockwell B is for soft metals, C for hardened steel.",
      "Rockwell C: 120° diamond cone, load 150 kgf. Rockwell B: 1/16 in steel ball, load 100 kgf. Brinell uses a 10 mm ball; Vickers uses a 136° diamond pyramid. Hardness scales must never be compared across load/indenter types without tables."),

    P("Which hardness conversion is approximately correct?",
      "50 HRC ≈ 500 HV",
      "On the common conversion curves the 40–60 HRC band maps to roughly 10× the HRC value in Vickers.",
      "ASTM E140 conversions: 50 HRC ≈ 500 HV ≈ 490 HB. 30 HRC ≈ 295 HV, 60 HRC ≈ 654 HV. The approximate identity HRC × 10 ≈ HV holds in the middle range — a fast sanity check in exams."),

    P("What are the main constituents of brass?",
      "Copper with about 30% zinc",
      "Cartridge brass is 70% Cu–30% Zn; yellow brass 60/40.",
      "Brass = Cu–Zn: cartridge brass 70Cu–30Zn, yellow brass 60Cu–40Zn. Adding Zn raises strength while keeping good ductility and corrosion resistance. Do not confuse with bronze which uses Sn."),

    P("What are the main constituents of bronze?",
      "Copper with about 10% tin",
      "Bronze is Cu–Sn; gunmetal adds Zn to this base.",
      "Bronze ≈ 90Cu–10Sn (10% Sn). Gun metal = Cu 88, Sn 10, Zn 2. Phosphor bronze adds 0.5% P for spring applications. Bronze bearings are softer than the shaft and wear preferentially to protect it."),

    P("The composition of gun metal is approximately:",
      "Cu 88, Sn 10, Zn 2",
      "88-10-2 is the accepted gun metal specification (88Cu–10Sn–2Zn).",
      "Gun metal: 88% Cu, 10% Sn, 2% Zn. Used for bearings, glands, valve bodies and hydraulic fittings because of good castability, self-lubricating character and corrosion resistance in sea water."),

    P("Which statement about nickel silver is correct?",
      "It contains copper, nickel and zinc — and no silver at all.",
      "The name is historic; nickel silver has zero silver content.",
      "Nickel silver (German silver) ≈ 60Cu–20Ni–20Zn. The  shiny silver appearance gave it the name but there is no Ag. Used for name plates, jewellery and coins. Silver content questions are a frequent trap."),

    P("The approximate composition of duralumin is:",
      "Aluminium with 4% Cu, 1% Mg and 0.5% Mn",
      "Duralumin is the oldest age-hardening aluminium alloy.",
      "Duralumin: Al + 4% Cu + 1% Mg + 0.5% Mn. The classic AGE-HARDENED aluminium alloy — solution treated at 500°C, quenched, then aged at ~180°C. Its strength can approach that of structural steel at a third of the weight."),

    P("In the AISI-SAE designation 1010 steel, the carbon content is:",
      "0.10%",
      "Last two digits give carbon in hundredths of a percent.",
      "10xx = plain carbon steel; carbon = last two digits × 0.01%. 1010 → 0.10% C, 1040 → 0.40% C, 1095 → 0.95% C. First two digits: 10 plain C, 11 resulphurised, 13 Mn steel, 43/86 Ni-Cr-Mo."),

    P("AISI 4340 is classified as:",
      "A nickel-chromium-molybdenum through-hardening steel",
      "43xx = Ni-Cr-Mo, and 4340 has ~0.40% C.",
      "4340 ≈ 0.40C–0.8Cr–1.85Ni–0.25Mo. Deep-hardenable, high strength, used in crankshafts, gears and axles. 8620 is the Ni-Cr-Mo carburising grade with lower carbon; 4340 is for hardened and tempered parts."),

    P("Which statement about AISI 8620 is correct?",
      "It is a low-carbon Ni-Cr-Mo steel intended for carburising (case hardening).",
      "86xx is the low-carbon Ni-Cr-Mo family; 8620 has about 0.20% C.",
      "8620 ≈ 0.20C–0.55Ni–0.50Cr–0.20Mo. Carburised to produce a hard, wear-resistant case over a tough core for gears. Compare 4340 (0.40C) which is hardened as a whole (through-hardened)."),

    P("EN8 steel is best described as:",
      "A 0.40% carbon medium-carbon steel",
      "EN8 is the standard 0.40C medium-carbon steel in the British EN system.",
      "EN8 = 0.36–0.44% C medium-carbon steel. Readily hardened and tempered, used for shafts, axles and studs. EN24 (~0.4C–1.5Cr–1.4Ni–0.25Mo) is the stronger Ni-Cr-Mo grown-up of EN8."),

    P("The composition implied by the HSS designation 18-4-1 is:",
      "18% tungsten, 4% chromium, 1% vanadium",
      "HSS = high speed steel; the three digits are W-Cr-V.",
      "18-4-1 HSS = 18 W, 4 Cr, 1 V with ~0.7–0.8% C. It retains cutting hardness (red hardness) up to ~600°C, which is why it cuts at speeds where carbon tool steel softens. Mo-based HSS (M2) has largely replaced T-type."),

    P("Stainless steel type 304 contains approximately:",
      "18% chromium and 8% nickel (austenitic)",
      "18-8 stainless. The Ni stabilises the FCC austenite.",
      "304 = 18Cr–8Ni austenitic stainless, non-magnetic, weldable, corrosion resistant. Also written 18/8. 316 adds 2% Mo for pitting resistance in chlorides; 410 is the 12Cr martensitic grade."),

    P("Type 316 stainless steel differs from type 304 mainly in that it:",
      "Contains an extra 2% molybdenum for resistance to chloride pitting.",
      "Mo is the signature addition of 316.",
      "316 ≈ 16-18Cr–10-14Ni–2Mo. The molybdenum sharply improves pitting and crevice corrosion resistance in sea-water/chloride media (marine, chemical, medical implants). 304 has no Mo."),

    P("Which statement about stainless steel type 410 is correct?",
      "It is a martensitic grade with about 12% chromium, hardenable by heat treatment.",
      "410 is the workhorse martensitic 12Cr stainless.",
      "410 = 12Cr martensitic, magnetic, hardenable — used for cutlery, shafts and turbine blades. Its ~12% Cr gives moderate corrosion resistance; the martensite from heat treatment provides hardness and wear resistance."),

    P("Which statement about austenitic stainless steel is correct?",
      "It is non-magnetic because the FCC austenite structure is stable at room temperature.",
      "Austenitic grades (304, 316) are essentially non-magnetic.",
      "The Ni added to 304/316 stabilises FCC austenite at room temperature and the alloy is non-magnetic (slight magnetism can appear after cold work). Ferritic and martensitic grades are magnetic because they are BCC/BCT. This is a guaranteed JE question."),

    P("White cast iron is characterised by:",
      "Carbon present as free cementite, making it very hard and brittle but highly wear resistant.",
      "Rapid cooling prevents graphite formation, leaving all carbon combined as Fe₃C.",
      "White CI: carbon combined as cementite (Fe₃C) — hard, brittle, excellent abrasion resistance, difficult to machine. Alloy white irons (Ni-Hard) line mill liners and pump casings. It is also the starting material for malleable iron."),

    P("Grey cast iron owes its damping and machinability to:",
      "Graphite in the form of flakes dispersed in the ferrite/pearlite matrix.",
      "Graphite occupies no volume load-capacity in tension; it acts as stress raisers but gives damping.",
      "Grey CI: flake graphite; 2–4.5% C, 1–3% Si. Excellent damping capacity, machinability and fluidity for casting; weak in tension because flake ends concentrate stress. Engine blocks and brake drums exploit the damping."),

    P("Ductile (nodular) cast iron obtains its spherical graphite by:",
      "Adding magnesium or cerium during casting to spheroidise the graphite.",
      "Mg/Ce cause graphite to grow as nodules instead of flakes.",
      "Ductile CG/DI: nodular graphite from Mg (or Ce) addition ≈ 0.05%. Nodules cut out the sharp flake ends, so ductility and strength rise dramatically (tensile 400–900 MPa). Used for crankshafts, steering knuckles, pipes."),

    P("Malleable cast iron is produced from:",
      "White cast iron by a long annealing (malleablising) heat treatment.",
      "Malleablising decomposes cementite into graphite (temper carbon).",
      "Malleable iron: white iron castings annealed (stage 1 ~900°C, stage 2 ~700°C) so cementite decomposes to temper-carbon nodules giving a black-heart malleable structure. Combines castability with good ductility for pipe fittings."),

    P("Which statement about quench severity is correct?",
      "The cooling rate increases in the order oil < water < brine.",
      "Brine quenches hardest; oil is the mildest of the three.",
      "Quench severity (H-value): brine ≈ 2.0, water ≈ 1.0, oil ≈ 0.25–0.3 (for circulation), still oil lower. Faster quench = more hardenability achieved but greater risk of distortion and quench cracking."),

    P("The Jominy end-quench test measures:",
      "Hardenability — the depth to which hardness falls off from a quenched end along a test bar.",
      "The bar is water quenched at one end only and hardness is read every few mm.",
      "Jominy: a standard 25 mm round is heated and quenched only at one end; Rockwell readings down the bar trace the hardenability curve. Steeper drop = lower hardenability. Needed to compare 4340 vs 8620 heat-treat response."),

    P("Which statement about martempering is correct?",
      "The part is quenched to just above the Mₛ temperature, held to equalise temperature, then slowly cooled to martensite before tempering.",
      "Martempering (marquenching) avoids uneven thermal gradients, not the transformation.",
      "Martempering: quench into a salt bath just above Mₛ, hold briefly (no bainite allowed), air cool through the martensite range, then TEMPER. Result: martensite with far less distortion/cracking. The steel still ends up tempered martensite."),

    P("Which statement best describes austempering?",
      "The part is quenched to just above Mₛ and held isothermally until the FCC austenite transforms to bainite.",
      "Austempering produces bainite, not martensite, so no tempering is needed.",
      "Austempering: quench to ~250–400°C (above Mₛ), hold isothermally so austenite transforms fully to bainite, then air cool. Bainite is tough, strong, with minimal distortion, and needs NO tempering. Spring steel and truck components use it."),

    P("Typical carburising temperatures and case depths are:",
      "900–950°C giving case depths of about 0.5–1.5 mm",
      "Carburising runs in the fully austenitic range to dissolve carbon.",
      "Carburising (gas/pack/liquid) at 900–950°C enriches the surface to produce a high-carbon case ~0.5–1.5 mm, followed by quench + temper. Core stays low-carbon and tough. Used on gears, camshafts, pins."),

    P("Which statement about nitriding is correct?",
      "It is carried out at 500–550°C in ammonia without any quench and gives a very hard thin case.",
      "Nitriding is diffusion of nitrogen, not carbon; no quench is involved.",
      "Nitriding at 500–550°C in NH₃ builds an iron-nitride case (plus nitride formers Cr, Mo, Al, V) of ~0.1–0.5 mm at hardness up to ~1000 HV. No quench means minimal distortion — done as the FINAL operation after machining."),

    P("The correct sequence of age hardening is:",
      "Solution treatment → quench → ageing",
      "First dissolve the solute, quench to trap it, then heat to precipitate.",
      "Age hardening steps: (1) solution treatment ~500°C (Al–Cu), (2) rapid quench retaining a super-saturated solid solution, (3) AGEING at ~180°C to precipitate the hardening phase (θ′ in Al–Cu). Re-aging after overageing is impossible in the same way."),

    P("Which statement about soldering and brazing is correct?",
      "Soldering uses a filler melting below 450°C, while brazing uses a filler melting above 450°C.",
      "The 450°C boundary is the formal division between soldering and brazing.",
      "Soldering < 450°C (tin-lead fillers) — soft, low strength joints for electronics/plumbing. Brazing > 450°C (copper-silver fillers) — strong joints, base metal never melts. Welding melts the base metal itself; braze/solder do not."),

    P("Powder metallurgy sintering is typically carried out at:",
      "0.7 to 0.9 times the absolute melting temperature of the material.",
      "Sintering bonds powders diffusionally well below the melting point.",
      "Sintering range 0.7–0.9 Tm (absolute). At these temperatures inter-particle necks grow by diffusion, giving strength without melting — that is why refractory metals and cemented carbides are made this way. Below 0.7 Tm diffusion is too slow."),

    P("Babbitt (white) bearing metals are best described as:",
      "Tin- or lead-based soft alloys containing antimony and copper.",
      "Babbitt: Sn–Sb–Cu (or Pb–Sb–Sn). The soft matrix embeds hard particles.",
      "Babbitt = Sn 88–90, Sb 7–8, Cu 3–4 (tin base) or lead-base equivalents. Soft matrix + hard intermetallics allow dirt to embed and conform to shaft misalignment, protecting the journal. Used as thin linings in large bearings."),

    P("Which statement about PTFE (Teflon) is correct?",
      "It has the lowest coefficient of friction of any solid polymer (μ ≈ 0.04) and withstands about 260°C.",
      "PTFE's ultralow friction comes from its strong C–F layers sliding easily over one another.",
      "PTFE: μ ≈ 0.04, service up to ~260°C, chemically inert, no known solvent — but it creeps (flows) under load and has poor wear resistance, so it is filled with bronze/glass or used as a thin liner. The classic non-stick, self-lubricating polymer."),

    P("In fibre-reinforced composites, the rule of mixtures gives the composite density approximately as:",
      "The volume-fraction weighted average of the fibre and matrix densities.",
      "ρ_c = ρ_f·V_f + ρ_m·V_m with V_f + V_m = 1.",
      "Rule of mixtures: ρ_c = ρ_f V_f + ρ_m V_m (parallel), E_c = E_f V_f + E_m V_m for longitudinal modulus. V_f is the volume fraction of fibres. For a 40% glass (ρ 2560) in epoxy (ρ 1200): ρ_c ≈ 0.4×2560 + 0.6×1200 ≈ 1744 kg/m³."),

    P("When zinc and copper are coupled in an electrolyte, which corrodes preferentially?",
      "Zinc, because it is anodic (more electropositive) in the galvanic series.",
      "The more chemically active (less noble) metal becomes the anode and corrodes.",
      "Galvanic series: zinc is far more anodic than copper, so in a Zn–Cu couple zinc corrodes (sacrificial anode) while copper is protected (cathode). This is the basis of galvanised steel and cathodic protection of ships and pipelines."),

    P("Temper colours observed on hardened steel indicate temperature — the straw colour appears at approximately:",
      "220–240°C",
      "Temper colours rise in the order pale yellow → straw → brown → blue as temperature increases.",
      "Temper colours (thin oxide films): pale yellow 200°C, straw 220–240°C, brown 260°C, purple 280°C, blue 300–320°C. Springs need the blue (320°C), cutting tools only pale yellow. Colour is a cheap shop-floor temperature gauge."),

    P("The Brinell hardness test uses as its indenter:",
      "A 10 mm diameter hardened steel (or carbide) ball.",
      "Standard load is 3000 kgf for steels; the ball is 10 mm.",
      "Brinell: 10 mm ball, load 3000 kgf for ferrous materials (500 kgf soft metals). Impression is measured and HB = load ÷ spherical surface area. Suitable for coarse-grained macro-hardness; scale breaks down for very hard steels (>600 HB)."),

    P("The Vickers hardness indenter is:",
      "A diamond square-based pyramid with a 136° included angle.",
      "136° is the pyramid apex angle used by Vickers.",
      "Vickers: diamond pyramid, 136°, loads 1–120 kgf, valid for all materials including thin sections and case depths. HV = load ÷ pyramid surface area of indentation. Its low load option distinguishes Vickers from Brinell."),

    P("In the Charpy and Izod impact tests, the specimen:",
      "Is a notched bar struck by a swinging pendulum to measure fracture energy absorbed.",
      "Charpy is a simply-supported beam with OPPOSITE the notch facing; Izod is cantilevered.",
      "Charpy notched-bar: simply-supported, V-notch facing away from striker; Izod: cantilever with the notch facing the striker. Both report energy absorbed in joules. Used to locate ductile-to-brittle transition temperatures in structural steels."),

    P("Which statement about the fatigue behaviour of steels is correct?",
      "Most steels show an endurance limit — below a limiting stress amplitude they survive 10⁷ cycles or more.",
      "The S-N curve of ferrous materials has a horizontal knee, unlike aluminium which never flattens.",
      "Steel exhibits a true endurance limit (knee of S-N curve at ~10⁷ cycles), typically 0.4–0.5 × UTS. Aluminium alloys do NOT show an endurance limit — failure stress keeps falling. That is why aircraft fatigue life is designed finite."),

    P("Creep is defined as:",
      "Time-dependent plastic deformation under constant stress, significant above about 0.4 of the absolute melting temperature.",
      "Primary, secondary (steady) and tertiary creep stages precede rupture.",
      "Creep proceeds in stages: primary (decreasing rate), secondary/steady (minimum, longest), tertiary (accelerating) → rupture. Relevant above 0.4 Tm; steam pipes (Fe at 500°C), turbine blades (Ni superalloys) are designed around Larson–Miller life."),

    P("Which statement about ductile vs brittle fracture is correct?",
      "Ductile fracture shows necking, a cup-and-cone surface and 45° shear lips; brittle fracture is flat and perpendicular to the stress.",
      "The fracture appearance is the fastest way to identify mode.",
      "Ductile: significant plastic deformation — cup-and-cone with fibre tearing in the centre and shear lips at 45°. Brittle: little deformation, flat cleavage surface. A brittle crack runs at great speed — the reason for notched-bar acceptance tests."),

    P("In a tensile test of mild steel, the yield point phenomenon shows:",
      "An upper yield point followed by a LOWER yield point with discontinuous (Lüders) straining.",
      "The upper yield drop arises from unpinning of dislocations from carbon atoms.",
      "Mild steel shows a sharp upper yield spike, a characteristic drop to the lower yield plateau (Lüders band propagation), then strain hardening to UTS. Removing interstitial C/N (as in rimmed → killed treatment) suppresses this phenomenon."),

    P("Which pair of Young's modulus values is correctly matched?",
      "Steel 200 GPa, aluminium 70 GPa, copper ≈ 110 GPa",
      "Stiffness ranking: steel ≫ copper > aluminium > magnesium.",
      "E values: steel 200 GPa (195–210), Al 70 GPa, Cu 110–130 GPa, Mg 45 GPa, cast iron ~100 GPa. Of the common structural metals, steel is ~3× stiffer than aluminium but nearly the same elastic FLEXIBILITY as cast iron."),

    P("The Poisson's ratio of steel is approximately:",
      "0.3",
      "Poisson's ratio ν = −ε_lateral/ε_axial.",
      "Steel ν ≈ 0.3, aluminium ≈ 0.33, rubber ≈ 0.5 (incompressible), cork ≈ 0, concrete ≈ 0.15–0.2. ν ranges from −1 to 0.5; ν = 0.5 means perfectly incompressible material."),

    P("The relationship between Young's modulus E, shear modulus G and Poisson's ratio ν is:",
      "G = E / [2(1 + ν)]",
      "One equation links all three isotropic elastic constants.",
      "G = E/[2(1 + ν)]. Check steel: G = 200/[2(1.3)] = 76.9 GPa ✓ (published ~80 GPa). Also E = 9KG/(3K + G) and bulk modulus K = E/[3(1 − 2ν)]. Three constants are needed for isotropic elasticity."),

    P("Compute the density of BCC iron using a = 0.287 nm, 2 atoms per cell and Avogadro's number 6.022 × 10²³:",
      "≈ 7850 kg/m³ (7.85 g/cm³)",
      "ρ = nA/(N_a · a³). Use a in cm: a = 2.87 × 10⁻⁸ cm.",
      "a³ = (2.87 × 10⁻⁸)³ = 2.364 × 10⁻²³ cm³. ρ = (2 × 55.85)/(6.022 × 10²³ × 2.364 × 10⁻²³) = 111.7/14.24 = 7.85 g/cm³ = 7850 kg/m³. The crystal calculation reproduces the measured density — exercising the whole Avogadro equation."),

    P("Compute the density of FCC aluminium using a = 0.405 nm and atomic weight 26.98:",
      "≈ 2.70 g/cm³",
      "FCC has 4 atoms per cell; ρ = 4A/(N_a · a³).",
      "a = 4.05 × 10⁻⁸ cm, a³ = 6.64 × 10⁻²³ cm³. ρ = (4 × 26.98)/(6.022 × 10²³ × 6.64 × 10⁻²³) = 107.92/40.0 = 2.698 ≈ 2.70 g/cm³. The same method gives copper (FCC, a = 0.3615 nm) ≈ 8.93 g/cm³."),

    P("In the Pb–Sn system, a 40% Sn alloy at the eutectic temperature consists of α (19.2% Sn) and β (97.5% Sn). The fraction of eutectic β phase is:",
      "≈ 26.6%",
      "Lever rule about the alloy composition: W_β = (C₀ − C_α)/(C_β − C_α).",
      "W_β = (40 − 19.2)/(97.5 − 19.2) = 20.8/78.3 = 0.2656 ≈ 26.6%. W_α = 73.4%. Both phases sum to 1. The lever arm is the horizontal distance from the phase boundary to the overall composition."),

    P("For carbon steels the empirical tensile-strength-from-Brinell rule is σ (MPa) ≈ 3.45 × HB. For a 350 HB steel the tensile strength is:",
      "≈ 1208 MPa",
      "TS ≈ 3.45 × 350 = 1208.",
      "σ ≈ 3.45 × 350 = 1207.5 ≈ 1208 MPa. The rule works for medium carbon steel and gives a quick shop-floor cross-check of hardness reports. Should not be extrapolated to aluminum alloys or white cast iron."),

    P("A steel specimen loaded to a stress of 300 MPa (E = 200 GPa) has an elastic strain of:",
      "1.5 × 10⁻³",
      "ε = σ/E = 300 × 10⁶ / 200 × 10⁹.",
      "ε = 300/200000 = 1.5 × 10⁻³ = 0.15%. For a 200 mm gauge length this is 0.3 mm elastic extension. The same relation gives the modulus when σ and ε are measured in the test."),

    P("A steel rail (α = 12 × 10⁻⁶ /°C, E = 200 GPa) is rigidly fixed between supports and heated by 50°C. The thermally induced stress is:",
      "120 MPa (compressive)",
      "σ = E·α·ΔT. No expansion is possible, so the strain is fully constrained.",
      "σ = 200 × 10⁹ × 12 × 10⁻⁶ × 50 = 120 × 10⁶ = 120 MPa compression. If the material could expand freely there would be no stress, only free strain 6 × 10⁻⁴. This is why rails, bridges and turbine casings need expansion joints."),

    P("The eutectoid carbon content of steel, at which austenite transforms to pearlite, is:",
      "0.77–0.8% C at 727°C",
      "The eutectoid temperature is 727°C; pearlite is ferrite + cementite.",
      "Eutectoid: 0.77% C at 727°C → pearlite (lamellar ferrite + Fe₃C). Below this C = hypoeutectoid (proeutectoid ferrite forms first); above this C = hypereutectoid (proeutectoid cementite). Compare eutectic: 4.3% C at 1147°C in cast iron."),

    P("In a hypoeutectoid steel (e.g. 0.4% C) cooled slowly, the proeutectoid phase formed before the eutectoid is:",
      "Ferrite (α)",
      "Below 0.77% C the austenite rejects ferrite first on cooling.",
      "Hypoeutectoid (<0.77%C): proeutectoid FERRITE nucleates along grain boundaries, then the remaining 0.77% C austenite transforms to pearlite. Final structure: ferrite + pearlite. In hypereutectoid steels it is proeutectoid CEMENTITE instead."),

    P("In a hypereutectoid steel (e.g. 1.2% C) cooled slowly, the proeutectoid phase is:",
      "Cementite (Fe₃C)",
      "Above 0.77% C the austenite rejects carbon-rich cementite first.",
      "Hypereutectoid (>0.77%C): proeutectoid CEMENTITE precipitates at austenite grain boundaries first; the remaining 0.77% C austenite becomes pearlite. The boundary cementite network makes such steels brittle — hence spheroidise annealing."),

    P("Ledeburite, the eutectic of cast iron, forms at the composition and temperature:",
      "4.3% C at 1147°C, as austenite + cementite (ledeburite).",
      "The Fe–Fe₃C eutectic is ledeburite.",
      "Eutectic: 4.3% C at 1147°C gives ledeburite (eutectic mixture of austenite 2.1%C + cementite). Below 727°C the austenite in ledeburite becomes pearlite. White cast iron with a eutectic structure is said to be ledeburitic."),

    P("Which statement compares normalising and annealing correctly?",
      "Normalising air-cools and gives finer pearlite with higher hardness; annealing furnace-cools giving the softest, most ductile condition.",
      "Faster cooling from normalising refines the pearlite.",
      "Normalising: air cool from above A₃ → fine pearlite, moderate hardness, good toughness — relieves forging stresses and refines grain. Annealing: FURNACE cool → coarse pearlite, minimum hardness and internal stress — the standard softening treatment."),

    P("Spheroidise annealing is applied to:",
      "High-carbon and tool steels to improve machinability by spheroidising the cementite.",
      "Rendering lamellar pearlite into globular cementite softens the steel.",
      "Spheroidising: long hold just below A₁ converts lamellar cementite into spheroids, dropping hardness to ~170 HB and greatly improving machining. Applied to 1.0+% C tool steels which would otherwise be very abrasive to cutters."),

    P("Surface hardening by induction:",
      "Uses high-frequency AC coils to heat only the surface layer above A₃, which is then quenched to martensite, leaving a tough core.",
      "The frequency controls the heated depth — higher frequency, thinner case.",
      "Induction hardening: eddy-current heating of a thin surface shell (a few mm) followed by water quench to martensite; the core stays tough. Frequency governs depth: 10 kHz → ~5 mm, 450 kHz → ~1 mm. Gears and crankshaft journals use it."),

    P("Cyaniding differs from carburising in that it:",
      "Adds both carbon and nitrogen, using a molten salt bath at about 800–900°C and giving a very thin, hard, wear-resistant case.",
      "Cyanide bath supplies C + N simultaneously.",
      "Cyaniding: molten NaCN/Na₂CO₃ bath at 800–900°C for minutes, followed by water quench — a thin case (0.025–0.25 mm) of high surface hardness. Carbonitriding is the gas alternative (same C+N idea) in an atmosphere furnace at 850–900°C."),

    P("Fick's first law of diffusion is expressed as:",
      "J = −D(dc/dx)",
      "Flux is proportional to the negative concentration gradient; D is the diffusivity.",
      "Fick's first law: J = −D(dc/dx). D = D₀·e^(−Q/RT) grows exponentially with temperature — which is why carburising runs at 900–950°C and nitriding at 500–550°C. Fick's second law ∂c/∂t = D(∂²c/∂x²) handles time-varying profiles."),

    P("Which statement about pure iron allotropes is correct?",
      "α-Fe (BCC) below 910°C, γ-Fe (FCC) from 910 to 1394°C, and δ-Fe (BCC) from 1394°C to melt.",
      "Temperature bands: <910 BCC, 910–1394 FCC, 1394–1538 BCC.",
      "Allotropic sequence of iron: α (BCC) < 910°C → γ (FCC) 910–1394°C → δ (BCC) 1394–1538°C → liquid. The FCC γ range is what makes austenitic processing and carburising possible. Carbon also changes α-Fe to a BCT martensite structure on quenching."),

    P("Which set of point defects is correctly described as 'lattice site related'?",
      "Vacancy (missing atom), interstitial (extra atom between sites) and substitutional (foreign atom on a site).",
      "These simple defects control diffusion; sintering and heat treatment all rely on them.",
      "Point defects: vacancy (Schottky type), interstitial (Frenkel type), substitutional impurity, interstitial impurity. They are the mechanism of diffusion — carbon diffuses interstitially in steel, while alloying elements diffuse substitutionally (much slower)."),

    P("Which statement about Schottky and Frenkel defects is correct?",
      "A Schottky defect is a pair of vacancies; a Frenkel defect is an atom displaced into an interstitial site, creating a vacancy plus an interstitial.",
      "Schottky: atoms leave to the surface. Frenkel: atom remains inside the crystal at an interstitial.",
      "Schottky pair: one cation + one anion vacancy (ions migrate to the surface); density drops. Frenkel: an atom jumps into an interstitial position — no density change, one vacancy + one interstitial. Both are equilibrium (intrinsic) defects in ionic crystals."),

    P("The Hall–Petch relationship states that:",
      "Yield strength increases as the grain size decreases (σ_y ∝ d⁻¹ᐟ²).",
      "Fine grains provide more boundary area which blocks dislocation motion.",
      "Hall–Petch: σ_y = σ₀ + k d^(−1/2), where d is the average grain diameter. Grain refinement makes steel both stronger AND tougher — refining is the only strengthening mechanism that improves toughness. This drives thermomechanical processing."),

    P("Recrystallisation of cold-worked metals typically begins at about:",
      "0.3–0.5 of the absolute melting temperature.",
      "Recovery, recrystallisation and grain growth occur in order during annealing.",
      "Recrystallisation temperature ≈ 0.3–0.5 Tm (absolute). For Cu (1085°C, Tm = 1358 K): ≈ 0.35 × 1358 ≈ 475 K ≈ 200°C. Above it, new strain-free grains form and hardness drops; still higher temperature causes grain growth. Controls the softening response after cold work."),

    P("Which statement about cold working is correct?",
      "Cold working increases hardness and strength while reducing ductility, because dislocations multiply and tangle.",
      "Strain hardening has no time limit — it is permanent until annealed.",
      "Cold work raises dislocation density up to 10⁷–10⁸ cm/cm³, causing strain hardening: strength and hardness up, ductility and impact toughness down. The softest condition is achieved by hot working or by cold work followed by recrystallisation annealing."),

    P("Cast iron generally contains:",
      "2–4.5% carbon with 1–3% silicon.",
      "The silicon promotes graphitisation and fluidity.",
      "Cast iron: 2–4.5% C, 1–3% Si, plus Mn, P, S. Si controls whether carbon precipitates as graphite (grey) or cementite (white). Below 2% C it is called steel; the C range separates the cast irons from steels — a favourite boundary question."),

    P("Which statement about TTT and CCT diagrams is correct?",
      "A CCT (continuous cooling) diagram is shifted to the right and made larger than the matching TTT diagram because transformation occurs over a range of falling temperature.",
      "Continuous cooling pushes transformations to longer times and the nose moves right.",
      "A TTT (isothermal) diagram applies only to constant-temperature holds. Under continuous cooling, CCT curves lag, so the CCT critical cooling rate is slightly higher and the nose shifts to longer times/lower temperatures. Pearlite, bainite and martensite avoidance are read from the CCT curve for actual quench decisions."),

    P("Compute the density of FCC copper using a = 0.3615 nm and atomic weight 63.55:",
      "≈ 8.93 g/cm³",
      "FCC = 4 atoms per cell; ρ = 4A/(N_a · a³).",
      "a = 3.615 × 10⁻⁸ cm, a³ = 4.72 × 10⁻²³ cm³. ρ = (4 × 63.55)/(6.022 × 10²³ × 4.72 × 10⁻²³) = 254.2/28.4 ≈ 8.93 g/cm³. The Avogadro route reproduces the measured value and links lattice, mass and density."),

    P("Which statement about ferritic stainless steel (type 430) is correct?",
      "It is a magnetic BCC chromium stainless with no nickel, offering good corrosion resistance at moderate strength.",
      "430 is 16–18% Cr, no Ni, essentially the chromium-only stainless.",
      "Ferritic 430 (16–18Cr, 0.1C, no Ni): magnetic, BCC, moderate corrosion resistance, lower cost, poorer toughness than austenitic. Compare martensitic 410 (heat-treatable) and austenitic 304/316 (non-magnetic, Ni-stabilised). These three families cover the stainless identification questions."),

    P("The composite 'cemented carbide' cutting tool is made by:",
      "Sintering tungsten carbide (WC) particles bonded together with a cobalt matrix at a temperature below the melting point of WC.",
      "WC provides hardness, Co provides toughness; sintered at ~1350–1450°C by powder metallurgy.",
      "Cemented carbide: 90–95% WC + Co binder, sintered (not melted) at ~1350–1450°C. Co content trades hardness vs toughness; TiC/TaC are added for machining steel. It is the classic powder metallurgy product — hard, wear resistant, machine-tool grade."),

    P("Which statement distinguishes thermoplastics from thermosets correctly?",
      "Thermoplastics soften reversibly on heating and can be reprocessed, while thermosets cross-link permanently during curing and cannot be re-melted.",
      "Cross-linking is the key: thermosets harden irreversibly.",
      "Thermoplastics (PE, PP, PVC, nylon, PTFE) have linear/lightly branched chains — melt and re-mould repeatedly. Thermosets (phenolics, epoxy, polyester, urea) cross-link during cure into a 3D network — once cured they cannot be re-melted. This reversible/irreversible distinction settles most polymer questions."),

    P("Which statement about the ductile-brittle transition temperature (DBTT) is correct?",
      "BCC metals (e.g. carbon steel) exhibit a DBTT at which impact energy drops sharply, while FCC metals (e.g. copper, aluminium) remain ductile at all temperatures.",
      "BCC iron and its alloys show a transition; FCC metals do not — this is why austenitic stainless is used for cryogenic vessels.",
      "DBTT applies primarily to BCC metals. Below the transition, Charpy energy plummets and fracture changes from ductile to cleavage. FCC metals (austenitic SS, Cu, Al) retain ductility down to cryogenic temperatures — which is the main reason austenitic 304/316 stainless dominates for liquid nitrogen and LNG tanks."),
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC3_EMECHMAT;
  if (typeof window !== "undefined") window.SSC_JE_ENC3_EMECHMAT = SSC_JE_ENC3_EMECHMAT;
})();
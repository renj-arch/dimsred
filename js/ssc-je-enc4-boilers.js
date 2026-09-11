(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC4_BOILERS = {};
  SSC_JE_ENC4_BOILERS.boilers = [

    P("In a fire-tube boiler, how does the hot flue gas flow relative to the water?",
      "The hot flue gases flow through tubes surrounded by water, with the water contained in the shell outside the tubes.",
      "Fire tube = gas inside tubes, water outside.",
      "Solution: In a fire-tube boiler, the combustion gases pass through a series of tubes immersed in a water-filled shell. The heat is transferred from the hot gases through the tube walls to the surrounding water. This is the defining arrangement of fire-tube boilers, distinguishing them from water-tube boilers where the arrangement is reversed."),

    P("Which statement is true about fire-tube boilers compared to water-tube boilers?",
      "Fire-tube boilers are generally limited to lower pressures up to about 25 bar and lower steam capacities compared to water-tube boilers.",
      "Fire tube = low pressure, low capacity.",
      "Solution: Fire-tube boilers have fire inside tubes, limiting the tube diameter and the safe operating pressure. They typically operate up to about 25 bar (2500 kPa) and steam outputs up to about 40,000 kg per hour. Water-tube boilers can operate at much higher pressures, even above 170 bar or at supercritical levels, and produce far larger steam capacities."),

    P("In a water-tube boiler, where is the water and where is the fire?",
      "Water flows inside the tubes while the hot combustion gases pass over the outside surface of the tubes.",
      "Water tube = water inside, fire outside.",
      "Solution: In a water-tube boiler, water circulates inside the tubes and the furnace fire and hot gases are on the outside of the tubes. This arrangement allows higher pressures because the small-diameter tubes can safely withstand high internal pressure. The large heating surface exposed to the hot gases also enables rapid steam generation."),

    P("Which type of boiler responds faster to sudden load changes?",
      "Water-tube boilers respond faster to load changes due to their smaller water content and larger heating surface area.",
      "Less water = quicker response.",
      "Solution: Water-tube boilers contain a smaller quantity of water compared to fire-tube boilers and have a much larger ratio of heating surface to water volume. This means they can raise steam more quickly and respond faster to sudden changes in steam demand. Fire-tube boilers, with their large water volume, take longer to change operating conditions."),

    P("Which of the following is an example of a fire-tube boiler?",
      "The Cochran boiler is an example of a vertical multitubular fire-tube boiler.",
      "Cochran = vertical fire tube.",
      "Solution: The Cochran boiler is a vertical, cylindrical, multitubular fire-tube boiler where the fire tubes are arranged inside a vertical shell. Other examples of fire-tube boilers include the Lancashire, Cornish, and locomotive boilers. Water-tube boiler examples include Babcock and Wilcox and Stirling boilers."),

    P("Which boiler type is classified as a high-pressure boiler?",
      "The Babcock and Wilcox water-tube boiler is classified as a high-pressure boiler suitable for large power plants.",
      "B and W = high pressure water tube.",
      "Solution: The Babcock and Wilcox boiler is a water-tube boiler that operates at high pressures and is widely used in thermal power plants. Fire-tube boilers like the Cochran and Lancashire are considered low-to-medium pressure boilers. High-pressure boilers can operate at pressures well above 80 bar."),

    P("What is the main advantage of a water-tube boiler over a fire-tube boiler?",
      "Water-tube boilers can generate steam at much higher pressures and larger capacities, making them suitable for large power stations.",
      "Water tube = high pressure, large capacity.",
      "Solution: Water-tube boilers have small-diameter tubes that can safely contain very high-pressure water and steam. The large heating surface area enables rapid steam generation. Fire-tube boilers are limited to lower pressures, typically up to 25 bar, and smaller capacities due to the large-diameter shell having to withstand the internal pressure."),

    P("Which type of boiler has a larger water inventory?",
      "Fire-tube boilers have a larger water inventory compared to water-tube boilers, which results in slower steaming.",
      "More water = slower steaming.",
      "Solution: Fire-tube boilers store a large volume of water in the shell surrounding the tubes. This large water mass takes longer to heat and raise to the desired steam pressure. Water-tube boilers have a comparatively small water inventory, enabling quicker steam generation and faster response to load changes."),

    P("A boiler that operates above the critical pressure of water (220.6 bar) without a steam drum is classified as what?",
      "A supercritical once-through boiler, such as the Benson boiler, operates above the critical pressure without a steam drum.",
      "Supercritical = no drum, no phase boundary.",
      "Solution: Above the critical pressure of 220.6 bar, water transitions directly to steam without a distinct phase change. The Benson boiler operates on this principle, with no steam drum required. This once-through design eliminates the need for a steam-water separation drum and is classified as a supercritical water-tube boiler."),

    P("Natural circulation in water-tube boilers depends on what driving force?",
      "The density difference between hot water-rising in the heated tubes and cooler water descending in the downcomers drives natural circulation.",
      "Density difference drives natural circulation.",
      "Solution: In natural circulation boilers, the water in the evaporator tubes is heated and becomes less dense due to steam bubble formation, causing it to rise. The cooler, denser water in the downcomers descends and replaces the rising mixture. This density difference creates a natural circulation loop without requiring a mechanical pump."),

    P("In forced circulation boilers, which device is used to circulate water through the tubes?",
      "A circulation pump is used to force water through the boiler tubes in forced circulation boilers.",
      "Forced = pump assisted.",
      "Solution: Forced circulation boilers use a mechanical pump to circulate water through the evaporator tubes at high velocity. This allows the use of smaller-diameter tubes and more flexible tube arrangements. The Lamont and Loeffler boilers are well-known examples of forced circulation boilers."),

    P("A boiler in which water is converted to steam in a single pass without recirculation is called what?",
      "An once-through boiler, such as the Benson boiler, where water enters at one end and steam exits at the other without recirculation.",
      "Once-through = single pass, no recirculation.",
      "Solution: In an once-through boiler, feed water enters at one end of the tubes and is completely converted to steam by the time it reaches the other end. There is no steam-water separation drum. The Benson boiler is the most well-known example of an once-through supercritical boiler design."),

    P("The Cochran boiler is described as which type?",
      "A vertical, cylindrical, multitubular fire-tube boiler with high efficiency suitable for small-scale steam generation.",
      "Cochran = vertical fire tube.",
      "Solution: The Cochran boiler is a vertical shell with a corbricated furnace tube at the bottom and a large number of small-diameter fire tubes in the upper portion. It is a fire-tube type with combustion gases passing through the tubes. It is compact and widely used in small installations where space is limited."),

    P("The Lancashire boiler has how many internal flue tubes?",
      "Two large internal flue tubes running horizontally through the cylindrical shell, making it a fire-tube boiler.",
      "Lancashire = two internal flues.",
      "Solution: The Lancashire boiler is a horizontal, cylindrical, fire-tube boiler with two large internal flue tubes. The gases from the furnace pass through these flues and then return through the smaller tubes before exiting through the chimney. The water surrounds all the flue tubes inside the shell."),

    P("How does the Cornish boiler differ from the Lancashire boiler?",
      "The Cornish boiler has only one internal flue tube, whereas the Lancashire boiler has two internal flue tubes.",
      "Cornish = one flue, Lancashire = two.",
      "Solution: The Cornish boiler is a horizontal, cylindrical, fire-tube boiler with a single large internal flue. The Lancashire boiler is similar in general design but has two flues. The single-flue Cornish boiler has lower steam-generating capacity compared to the double-flue Lancashire boiler of similar size."),

    P("The locomotive boiler is classified as which type?",
      "A horizontal, multitubular, fire-tube boiler with a superheater, designed for mobile use on railway locomotives.",
      "Locomotive = mobile fire tube.",
      "Solution: The locomotive boiler is a horizontal, fire-tube type with a large number of small-diameter tubes. It has an extended firebox and uses a blast pipe for induced draught through the chimney. It is a portable boiler designed specifically for use on steam locomotives, with the draught created by exhaust steam injection."),

    P("The Babcock and Wilcox boiler is characterized by which arrangement?",
      "Inclined straight water tubes with a steam drum positioned above the tube bank and natural circulation of water.",
      "B and W = inclined tubes, drum above.",
      "Solution: The Babcock and Wilcox boiler consists of a horizontal steam drum connected to inclined straight water tubes. The lower ends of the tubes are connected to a water header. Hot gases pass over the outside of the inclined tubes. Natural circulation is maintained due to the density difference between the hot water in the tubes and cooler water in the downcomer section."),

    P("The Benson boiler is unique because it:",
      "Operates as a supercritical once-through boiler with no steam drum, where water is directly converted to steam without recirculation.",
      "Benson = no drum, once-through, supercritical.",
      "Solution: The Benson boiler is designed to operate at supercritical pressures above 220.6 bar. It has no steam drum since water at supercritical pressure does not exhibit a distinct phase change. Feed water enters at one end and superheated steam exits at the other in a single pass, eliminating the need for steam-water separation equipment."),

    P("The Lamont boiler is an example of which category?",
      "A forced circulation water-tube boiler where a pump circulates water through evaporator tubes at high velocity.",
      "Lamont = forced circulation, water tube.",
      "Solution: The Lamont boiler uses a centrifugal pump to force water through the evaporator tubes at high velocity. This ensures high heat transfer rates and prevents tube burnout. It has a steam separator drum where the steam-water mixture is separated. The forced circulation allows the use of smaller-diameter tubes for better heat transfer."),

    P("In the Loeffler boiler, how is steam generated?",
      "Steam is generated by circulating superheated steam through evaporator tubes, with heat supplied by external combustion gases.",
      "Loffler = steam heats evaporator tubes.",
      "Solution: The Loeffler boiler generates steam by passing superheated steam through evaporator tubes in the furnace. The superheated steam absorbs heat from the furnace and generates additional steam. A portion of the generated steam is recirculated back to the evaporator tubes while the rest is supplied to the plant. This is a forced circulation design."),

    P("The Velox boiler is a type of which boiler?",
      "Pressurized combustion water-tube boiler where combustion takes place under pressure, enabling higher heat transfer rates.",
      "Velox = pressurized combustion.",
      "Solution: The Velox boiler uses pressurized combustion by forcing air into the combustion chamber with a compressor. The flue gases flow at high velocity, giving a high coefficient of heat transfer. It is a water-tube boiler that can produce steam at high rates with a compact design due to the enhanced heat transfer."),

    P("The Stirling boiler is a:",
      "Multi-drum water-tube boiler with three or four steam and water drums connected by bent water tubes.",
      "Stirling = multi-drum, bent tubes.",
      "Solution: The Stirling boiler has multiple steam and water drums, typically three or four, connected by large-radius bent water tubes. Hot gases pass over the outside of these tubes. It is a water-tube boiler widely used in industrial applications due to its reliability and ability to handle varying loads."),

    P("Marine boilers are specifically designed to:",
      "Operate reliably on ships, typically as water-tube type, and withstand the rolling and pitching motion of the vessel at sea.",
      "Marine = designed for shipboard use.",
      "Solution: Marine boilers must be compact, reliable, and able to operate under the dynamic motion of a ship at sea. They are typically water-tube boilers designed to handle variations in water level caused by the rolling of the vessel. They are also built to withstand corrosion from saltwater environments."),

    P("Which of the following boilers uses pressurized combustion to enhance heat transfer?",
      "The Velox boiler uses pressurized combustion to achieve high heat transfer rates in a compact design.",
      "Velox = pressurized combustion.",
      "Solution: In the Velox boiler, the combustion chamber is pressurized by a compressor-driven air supply. The high-pressure, high-velocity combustion gases increase the heat transfer coefficient significantly. This allows a smaller boiler to produce a large amount of steam compared to conventional designs."),

    P("Which of the following is a boiler mounting?",
      "A safety valve is a boiler mounting that is mandatory and fitted directly on the boiler shell for safety protection.",
      "Safety valve = mounting.",
      "Solution: Boiler mountings are safety and control devices that are mandatory on every boiler. They are fitted on the boiler shell and include the safety valve, water level indicator, pressure gauge, steam stop valve, feed check valve, fusible plug, blow-off valve, and manhole. A safety valve prevents dangerous over-pressurization of the boiler."),

    P("An economizer is classified as a boiler:",
      "Accessory, because it is an auxiliary device that improves efficiency by preheating feed water using waste heat from flue gases.",
      "Economizer = accessory.",
      "Solution: Boiler accessories are auxiliary devices that improve the efficiency or performance of the boiler but are not mandatory for safety. The economizer uses waste heat from flue gases to preheat the feed water before it enters the boiler, thereby saving fuel and increasing overall thermal efficiency."),

    P("Which of the following is a boiler accessory and not a mounting?",
      "The superheater is a boiler accessory used to raise the temperature of steam above its saturation temperature.",
      "Superheater = accessory.",
      "Solution: The superheater is fitted in the path of hot flue gases and is used to superheat the steam, raising its temperature above the saturation temperature at a given pressure. It is classified as a boiler accessory because it improves the quality and efficiency of steam but is not a mandatory safety device fitted on the boiler shell."),

    P("The water level indicator is classified as a:",
      "Boiler mounting that shows the water level inside the boiler and is a mandatory safety device on every boiler.",
      "Water level indicator = mounting.",
      "Solution: The water level indicator is fitted on the front of the boiler shell and shows the operator the water level inside. It is a mandatory boiler mounting because maintaining the correct water level is critical for safe operation. If the water level drops too low, the boiler tubes can overheat and fail catastrophically."),

    P("Which boiler mounting is used to remove concentrated impurities from the bottom of the boiler?",
      "The blow-off valve is a boiler mounting used to drain water from the bottom of the boiler to remove sediment and concentrated dissolved solids.",
      "Blow-off valve = mounting, removes sediment.",
      "Solution: The blow-off valve is located at the lowest point of the boiler shell. It is opened periodically to blow out accumulated sediment, scale, and highly concentrated water. This is a boiler mounting because it is essential for maintaining safe boiler water conditions and preventing dangerous scale buildup on heating surfaces."),

    P("An air preheater is classified as a:",
      "Boiler accessory because it preheats combustion air using waste heat from flue gases, improving combustion efficiency.",
      "Air preheater = accessory.",
      "Solution: The air preheater is an auxiliary device that transfers heat from the outgoing flue gases to the incoming combustion air. By preheating the air, more heat is recovered from the fuel and the overall boiler efficiency is improved. It is not a safety device, hence classified as a boiler accessory."),

    P("A feed pump is a boiler:",
      "Accessory used to supply feed water to the boiler against the internal boiler pressure, maintaining the required water level.",
      "Feed pump = accessory.",
      "Solution: The feed pump is required to force feed water into the boiler against its internal pressure. Without the feed pump, water could not be supplied to a high-pressure boiler by gravity. It is classified as a boiler accessory because it is an auxiliary device necessary for operation but not a safety fitting on the boiler shell."),

    P("The fusible plug is classified as a boiler:",
      "Mounting fitted at the crown of the fire box, designed to melt and release steam if the water level drops dangerously low.",
      "Fusible plug = mounting, safety device.",
      "Solution: The fusible plug is a safety mounting installed at the highest point of the fire box crown. It contains a low-melting-point metal core that melts when the water level drops and the crown plate overheats. This allows steam to enter the furnace and extinguish the fire, preventing a catastrophic boiler failure."),

    P("An injector as a boiler device is classified as a:",
      "Accessory that uses a steam jet to force feed water into the boiler without requiring a mechanical pump.",
      "Injector = accessory, steam jet device.",
      "Solution: An injector uses the kinetic energy of a steam jet to entrain and deliver feed water into the boiler against its internal pressure. It has no moving parts and is a compact alternative to mechanical feed pumps. It is classified as a boiler accessory because it is an auxiliary device for water supply."),

    P("A steam separator is a boiler:",
      "Accessory used to remove moisture droplets from wet steam before it is supplied to the plant or turbines.",
      "Steam separator = accessory, removes moisture.",
      "Solution: The steam separator is fitted in the steam line to remove entrained water droplets from wet steam. Dry steam is essential for efficient operation of steam turbines and engines, as wet steam causes blade erosion. It is classified as a boiler accessory because it improves steam quality rather than providing a safety function."),

    P("The pressure gauge on a boiler is a:",
      "Boiler mounting that indicates the steam pressure inside the boiler and is essential for safe operation.",
      "Pressure gauge = mounting.",
      "Solution: The pressure gauge is mounted on the boiler shell to provide a continuous reading of the internal steam pressure. The operator must ensure the pressure does not exceed the maximum allowable working pressure. It is a mandatory boiler mounting for safe operation of every boiler."),

    P("A soot blower is a boiler:",
      "Accessory used to clean soot deposits from the heating surfaces of the boiler to maintain efficient heat transfer.",
      "Soot blower = accessory, cleaning device.",
      "Solution: A soot blower uses jets of steam or air to remove soot and ash deposits from the outer surfaces of fire tubes, superheater tubes, and economizer tubes. Accumulated soot acts as an insulator and reduces heat transfer. It is classified as a boiler accessory because it aids performance and efficiency improvement."),

    P("What is the primary function of a fusible plug in a boiler?",
      "The fusible plug melts when the water level drops dangerously low, allowing steam to enter the furnace and extinguish the fire to prevent overheating.",
      "Fusible plug melts on low water to extinguish fire.",
      "Solution: The fusible plug is fitted at the crown of the fire box. Its core is made of a low-melting-point metal, typically tin or a lead-tin alloy, designed to melt at about 220 to 250 degrees Celsius. When the water level drops and the crown plate overheats, the core melts and steam enters the furnace, extinguishing the fire and preventing boiler damage or explosion."),

    P("A spring-loaded safety valve operates by which principle?",
      "The steam pressure overcomes the spring force, lifting the valve disc and allowing excess steam to escape until pressure is restored to a safe level.",
      "Spring-loaded = steam pressure vs spring force.",
      "Solution: In a spring-loaded safety valve, a spring holds the valve disc tightly against the seat. When the boiler pressure exceeds the set limit, the upward force of the steam overcomes the spring compression and lifts the valve, releasing excess steam. When pressure drops below the set value, the spring pushes the valve closed again."),

    P("In a lever-loaded safety valve, the maximum allowable pressure is controlled by:",
      "The position of the weight along the lever arm, which determines the closing force on the valve seat.",
      "Lever and weight position controls set pressure.",
      "Solution: A lever-loaded safety valve uses a lever with a sliding weight to hold the valve disc against the seat. The pressure at which the valve opens depends on the weight of the mass and its distance from the fulcrum. Moving the weight farther from the fulcrum increases the opening pressure, while moving it closer decreases the opening pressure."),

    P("The function of a feed check valve on a boiler is to:",
      "Prevent the back-flow of water from the boiler into the feed water pipe when the feed pump is stopped.",
      "Check valve = prevents back-flow.",
      "Solution: The feed check valve is installed between the feed pump and the boiler. It allows water to flow into the boiler but prevents it from flowing back when the pump is off. This maintains the water level in the boiler and protects the feed pump. It also allows manual adjustment of the feed water rate."),

    P("A steam stop valve on a boiler is used to:",
      "Control and regulate the flow of steam from the boiler to the main steam pipe and to steam consumers.",
      "Stop valve controls steam output.",
      "Solution: The steam stop valve is mounted on the highest point of the boiler shell and is used to control the discharge of steam. It can be fully opened to allow maximum steam flow or partially closed to regulate the flow rate. It also allows the boiler to be isolated from the steam system for maintenance purposes."),

    P("The purpose of a manhole on a boiler shell is to:",
      "Provide access for personnel to enter, inspect, clean, and repair the internal surfaces of the boiler during maintenance.",
      "Manhole = access for maintenance.",
      "Solution: The manhole is an opening provided on the boiler shell large enough for a person to enter. It is essential for periodic internal inspection, cleaning of scale and sediment, and repair of internal components. The manhole is typically fitted on the front or side of the boiler shell and is securely closed during operation."),

    P("What is the function of a dead-weight safety valve?",
      "A dead-weight safety valve uses the weight of cast-iron discs to hold the valve closed, and opens when steam pressure lifts the weights.",
      "Dead weight = weights hold valve closed.",
      "Solution: In a dead-weight safety valve, heavy cast-iron discs are placed on a spindle attached to the valve. The weight of these discs keeps the valve closed against the boiler pressure. When the steam pressure inside the boiler exceeds the set value, the upward force lifts the valve and weights, allowing steam to escape. It is simple but limited to low-pressure boilers."),

    P("A high steam and low water safety valve is designed to perform which function?",
      "It opens and discharges steam when either the steam pressure is too high or the water level falls too low, providing dual protection.",
      "Dual protection = high pressure or low water.",
      "Solution: The high steam and low water safety valve is a combined safety device. It operates when the steam pressure exceeds the maximum safe limit or when the water level drops below a safe minimum. This dual-action valve provides two critical safety functions in a single fitting, protecting the boiler from both over-pressure and low-water damage."),

    P("What is the primary purpose of an economizer in a boiler?",
      "To preheat the feed water using waste heat from flue gases, thereby saving fuel and increasing boiler efficiency.",
      "Economizer = preheats feed water.",
      "Solution: The economizer is a heat exchanger placed in the flue gas path. It absorbs heat from the hot flue gases and transfers it to the feed water before it enters the boiler. This reduces the amount of fuel needed to raise the feed water to boiling temperature. Typical fuel savings range from about 5 to 10 percent."),

    P("A superheater is used to:",
      "Raise the temperature of saturated steam above its saturation temperature at a given pressure, producing superheated steam.",
      "Superheater = raises steam temperature above saturation.",
      "Solution: The superheater is a bank of tubes placed in the path of hot flue gases. Saturated steam from the boiler drum passes through these tubes and absorbs additional heat, raising its temperature above the saturation temperature. Superheated steam has lower moisture content, which reduces blade erosion in turbines and improves thermal efficiency of the plant."),

    P("The function of an air preheater is to:",
      "Preheat the incoming combustion air using waste heat from flue gases, improving combustion efficiency and overall boiler performance.",
      "Air preheater = heats combustion air.",
      "Solution: An air preheater recovers heat from the outgoing flue gases and transfers it to the incoming air supply before it enters the furnace. Preheated air promotes better combustion, reduces fuel consumption, and increases the overall thermal efficiency of the boiler. It typically improves efficiency by about 3 to 5 percent."),

    P("An injector as a boiler accessory works on the principle of:",
      "Converting the kinetic energy of a high-velocity steam jet into pressure energy to force water into the boiler against its pressure.",
      "Injector uses steam jet to force water in.",
      "Solution: An injector uses a steam nozzle to create a high-velocity jet. This jet entrains feed water and converts its kinetic energy into pressure energy through a convergent-divergent arrangement. The pressurized water is then delivered into the boiler. The injector has no moving parts and operates as a self-contained unit."),

    P("Why is a superheater important for a boiler supplying steam to a turbine?",
      "Superheated steam reduces moisture content, preventing blade erosion in the turbine and improving the overall thermal efficiency of the plant.",
      "Dry steam = no blade erosion, better efficiency.",
      "Solution: When saturated steam passes through a turbine and expands, it becomes wet, and the water droplets can cause erosion of the turbine blades. Superheated steam has a much lower moisture content at the turbine exhaust. Additionally, superheated steam has higher enthalpy, which increases the thermal efficiency of the power cycle."),

    P("The feed pump is essential for a boiler because it:",
      "Supplies feed water into the boiler against the internal boiler pressure, maintaining the required water level during operation.",
      "Feed pump overcomes boiler pressure.",
      "Solution: As steam is continuously drawn from the boiler, the water level drops and must be replenished. Since the boiler is at high internal pressure, feed water cannot enter by gravity alone. The feed pump delivers water at a pressure higher than the boiler pressure, ensuring a continuous and reliable water supply."),

    P("A soot blower in a boiler is used to:",
      "Remove soot and ash deposits from the external surfaces of boiler tubes to maintain efficient heat transfer.",
      "Soot blower cleans tube surfaces.",
      "Solution: Combustion of fuel, especially coal, produces soot that deposits on the outer surfaces of fire tubes, superheater tubes, and economizer tubes. This soot acts as an insulator, reducing heat transfer and lowering boiler efficiency. A soot blower uses steam or compressed air jets to blow off these deposits on a regular basis."),

    P("The purpose of a steam separator in a boiler system is to:",
      "Remove water droplets from wet steam to deliver dry, high-quality steam to the plant and prevent damage to equipment.",
      "Steam separator removes moisture from steam.",
      "Solution: Wet steam containing entrained water droplets can cause water hammer in pipes and erosion of turbine blades. A steam separator is installed in the steam line to remove these moisture droplets through centrifugal action or baffle plates. This ensures that only dry, high-quality steam reaches the consumers."),

    P("Draught in a boiler system is defined as:",
      "The pressure difference that causes the flow of air into the furnace and flue gases through the boiler passages and out through the chimney.",
      "Draught = pressure difference for air and gas flow.",
      "Solution: Draught is the difference in pressure between two points in the boiler system that creates and maintains the flow of combustion air into the furnace and the removal of hot flue gases through the boiler passages. Without adequate draught, the combustion process cannot be sustained and the boiler cannot function properly."),

    P("Natural draught in a boiler is produced by which component?",
      "The chimney, where the difference in density between hot flue gases inside the chimney and cooler outside air creates a pressure difference.",
      "Natural draught = chimney effect.",
      "Solution: A chimney produces natural draught because the hot flue gases inside are less dense than the cooler ambient air. This density difference creates a pressure differential that draws air into the furnace and pushes flue gases up and out of the chimney. The magnitude depends on the chimney height and the temperature difference between the gases and ambient air."),

    P("The formula for natural chimney draught is proportional to:",
      "Height of the chimney multiplied by the difference of the reciprocals of absolute ambient temperature and absolute flue gas temperature, expressed as H times (1/Ta minus 1/Tg).",
      "Draught proportional to H times (1/Ta minus 1/Tg).",
      "Solution: Natural chimney draught in mm of water column can be approximated as h equals H times (1/Ta minus 1/Tg) times 353, where H is chimney height in meters, Ta is ambient air absolute temperature in Kelvin, and Tg is the mean flue gas absolute temperature in Kelvin. Increasing chimney height or flue gas temperature increases the draught."),

    P("Natural chimney draught is less when:",
      "The ambient air temperature is high in summer conditions, because the density difference between hot flue gases and the surrounding air is reduced.",
      "High ambient temp = less draught.",
      "Solution: When the ambient temperature is high, the outside air density is lower and closer to the flue gas density. This reduces the pressure difference that drives natural draught. In hot summer conditions, chimney draught is at its lowest, which can reduce combustion efficiency. Artificial draught systems are not affected by ambient temperature changes in the same way."),

    P("A forced draught system is one where:",
      "A fan is placed before the furnace to force air into it under positive pressure, ensuring adequate combustion air supply.",
      "F.D. fan = before furnace, positive pressure.",
      "Solution: In a forced draught system, a fan is located between the atmosphere and the furnace. It pushes air into the furnace at a pressure slightly above atmospheric. This positive-pressure arrangement ensures a controlled and adequate supply of combustion air regardless of the chimney conditions or ambient temperature variations."),

    P("An induced draught system is one where:",
      "A fan is placed after the boiler to pull flue gases through the system, creating a negative pressure or vacuum in the furnace.",
      "I.D. fan = after boiler, negative pressure.",
      "Solution: In an induced draught system, a fan is located between the boiler and the chimney. It creates a partial vacuum in the furnace by pulling the flue gases through the boiler passages. This negative-pressure arrangement reduces air leakage out of the furnace and provides better combustion control."),

    P("Balanced draught in a boiler system is achieved by:",
      "Using both a forced draught fan before the furnace and an induced draught fan after the boiler, maintaining near-atmospheric pressure in the furnace.",
      "Balanced = F.D. plus I.D. fans together.",
      "Solution: A balanced draught system combines a forced draught fan that supplies air to the furnace and an induced draught fan that removes flue gases. The two fans are balanced so that the furnace operates at approximately atmospheric pressure. This prevents both inward air leakage in positive-pressure systems and outward flue gas leakage in negative-pressure systems."),

    P("The advantages of artificial draught over natural draught include:",
      "Better control of air supply, ability to handle high-resistance boiler systems, and independence from ambient temperature variations.",
      "Artificial draught = controlled, versatile.",
      "Solution: Artificial draught systems using fans can be precisely controlled to match the combustion requirements at all times. They are not limited by chimney height or flue gas temperature. They can overcome the resistance of complex boiler passages, economizers, and air preheaters. Natural draught from a chimney alone may be insufficient for large, high-capacity boilers."),

    P("Draught in a boiler system is measured using which instrument?",
      "A draught gauge or manometer, which measures the small pressure differences in mm of water column at various points.",
      "Draught gauge = manometer.",
      "Solution: A draught gauge is a sensitive manometer that measures the small pressure differences, typically a few mm of water column, at various points in the boiler system. It is connected to the furnace, boiler passages, and chimney to monitor the draught. Proper draught measurement is essential for efficient combustion and safe boiler operation."),

    P("In an induced draught system, the furnace is maintained under which condition?",
      "Negative pressure or partial vacuum, which prevents hot flue gases from leaking out into the boiler room.",
      "I.D. = negative pressure, no gas leakage out.",
      "Solution: The induced draught fan pulls flue gases through the boiler, creating a slight vacuum in the furnace. This negative pressure ensures that flue gases do not leak out into the surrounding boiler room, improving safety. Any air infiltration into the furnace through small openings is inward, which is less harmful than outward gas leakage."),

    P("Boiler efficiency is defined as which ratio?",
      "The ratio of heat absorbed by the steam to the heat supplied by burning fuel, expressed as eta equals ms times (h_steam minus h_feedwater) divided by mf times CV, multiplied by 100.",
      "eta = heat absorbed by steam / heat from fuel.",
      "Solution: Boiler efficiency eta is calculated as the product of steam mass flow rate and the enthalpy rise of the water (h_steam minus h_feedwater), divided by the product of fuel mass flow rate and its calorific value CV, multiplied by 100. This gives the percentage of the fuel energy that is actually used to produce steam. Typical boiler efficiencies range from 70 to 90 percent."),

    P("The factor of evaporation is defined as:",
      "The ratio of the actual enthalpy difference of the steam and feed water to the latent heat of evaporation at 100 degrees Celsius, equal to (h_steam minus h_feedwater) divided by 2257.",
      "Factor of evaporation = enthalpy rise / 2257.",
      "Solution: The factor of evaporation is a dimensionless quantity that compares the actual enthalpy rise of the water to the standard latent heat of evaporation at 100 degrees Celsius, which is 2257 kJ per kg. For example, if h_steam is 2800 kJ per kg and h_feedwater is 420 kJ per kg, the factor of evaporation is (2800 minus 420) divided by 2257, which equals 1.055."),

    P("Equivalent evaporation from and at 100 degrees Celsius means:",
      "The mass of water at 100 degrees Celsius that would be evaporated into dry saturated steam at 100 degrees Celsius using the same heat input as the actual boiler.",
      "Equivalent evaporation = standard evaporation at 100°C.",
      "Solution: Equivalent evaporation converts the actual steam production into an equivalent amount measured under standard conditions, namely evaporating water at 100°C into dry saturated steam at 100°C using the latent heat of 2257 kJ per kg. It allows comparison of different boilers operating under different pressure and temperature conditions."),

    P("The boiler horsepower is defined as the evaporation of:",
      "15.65 kg of water per hour from and at 100 degrees Celsius, which corresponds to approximately 34.5 kg per hour of steam per boiler horsepower.",
      "1 boiler HP = 15.65 kg per hour from and at 100°C.",
      "Solution: One boiler horsepower is equivalent to the evaporation of 15.65 kg of water per hour from feed water at 100°C into dry saturated steam at 100°C. This corresponds to a heat duty of 15.65 times 2257, which equals 35,322 kJ per hour. This is approximately 9.81 kW or about 33,475 BTU per hour."),

    P("A boiler produces 1000 kg per hour of steam at 2800 kJ per kg enthalpy, with feed water entering at 420 kJ per kg. If the boiler efficiency is 70% and the fuel CV is 42,000 kJ per kg, the fuel consumption is approximately:",
      "81.0 kg per hour.",
      "Fuel = ms times delta h / (eta times CV).",
      "Solution: Heat absorbed by steam equals ms times (h_steam minus h_feedwater) equals 1000 times (2800 minus 420) equals 1000 times 2380 equals 2,380,000 kJ per hour. Fuel consumption equals heat absorbed divided by (eta times CV) equals 2,380,000 divided by (0.70 times 42,000) equals 2,380,000 divided by 29,400 equals 81.0 kg per hour."),

    P("For the boiler producing 1000 kg per hour of steam with enthalpy rise of 2380 kJ per kg, the equivalent evaporation from and at 100°C is approximately:",
      "1055 kg per hour.",
      "Equivalent evap = ms times delta h / 2257.",
      "Solution: Factor of evaporation equals (h_steam minus h_feedwater) divided by 2257 equals (2800 minus 420) divided by 2257 equals 2380 divided by 2257 equals 1.0545. Equivalent evaporation equals ms times Factor of evaporation equals 1000 times 1.0545 equals 1054.5 kg per hour, approximately 1055 kg per hour from and at 100 degrees Celsius."),

    P("The major heat loss in a boiler that increases with flue gas exit temperature is:",
      "Dry flue gas loss, which is the heat carried away by the hot flue gases leaving the chimney.",
      "Higher exit temp = more dry flue gas loss.",
      "Solution: The dry flue gas loss is the largest single heat loss in most boilers. It is directly proportional to the mass flow of dry flue gases and their exit temperature above the ambient temperature. Reducing the flue gas exit temperature through economizers and air preheaters is the most effective way to reduce this loss and improve boiler efficiency."),

    P("The evaporation ratio of a boiler is defined as:",
      "The ratio of the mass of steam produced to the mass of fuel consumed, expressed as ms divided by mf.",
      "Evaporation ratio = steam produced / fuel consumed.",
      "Solution: The evaporation ratio is a simple measure of boiler performance expressed as kilograms of steam produced per kilogram of fuel burned. A higher evaporation ratio indicates better performance. Typical evaporation ratios range from 6 to 14 depending on the boiler type, fuel used, and operating conditions."),

    P("In a boiler, the heat loss due to moisture in the fuel depends on:",
      "The moisture content of the fuel and the latent heat required to evaporate this moisture during combustion.",
      "Moisture loss = moisture content times latent heat.",
      "Solution: When fuel contains moisture, energy is consumed to evaporate this water during combustion. The heat loss due to moisture in the fuel equals the mass of moisture multiplied by the latent heat of vaporization, about 2500 kJ per kg at typical combustion temperatures. This loss increases with higher moisture content in the fuel, such as wet coal or biomass."),

    P("If a boiler has a steam-fuel ratio of 8 to 1, it means:",
      "The boiler produces 8 kg of steam for every 1 kg of fuel burned.",
      "Steam-fuel ratio = steam per unit fuel.",
      "Solution: A steam-fuel ratio, also called evaporation ratio, of 8 to 1 means that for every kilogram of fuel consumed, the boiler generates 8 kg of steam. This ratio depends on the fuel calorific value, the boiler efficiency, and the enthalpy of the steam produced. It is a quick indicator of overall boiler performance."),

    P("Scale formation on boiler tubes is caused by:",
      "Deposition of dissolved calcium and magnesium salts, which are hardness compounds, on the hot tube surfaces when water is heated.",
      "Scale = hard deposits from dissolved hardness salts.",
      "Solution: When boiler feed water contains dissolved calcium and magnesium compounds, which represent temporary and permanent hardness, these salts precipitate on the hot heating surfaces as the water temperature rises. The deposits form a hard, tenacious scale layer that adheres to the metal surface and is difficult to remove by ordinary methods."),

    P("The main problem caused by scale on boiler tubes is:",
      "Reduced heat transfer because scale is a poor conductor of heat, leading to higher fuel consumption and risk of tube overheating.",
      "Scale insulates tubes, reducing heat transfer.",
      "Solution: Boiler scale has very low thermal conductivity compared to metal, acting as an insulating layer between the hot flue gases and the water. This reduces heat transfer, increases the tube metal temperature, and raises fuel consumption. In severe cases, the tubes may overheat and fail, leading to costly boiler damage and downtime."),

    P("Sludge formation in a boiler differs from scale in that:",
      "Sludge is a soft, loose, muddy deposit that settles at the bottom of the boiler and can be removed by blow-down, unlike hard scale.",
      "Sludge = soft, removable by blow-down.",
      "Solution: Sludge consists of soft, loose, non-adherent deposits of precipitated compounds, typically magnesium compounds and corrosion products. Unlike hard scale, sludge settles at the bottom of the boiler and can be removed through the blow-off valve. However, if sludge is not regularly blown down, it can eventually harden into scale."),

    P("Priming in a boiler refers to:",
      "The carry-over of water droplets with the steam leaving the boiler, resulting in wet steam being delivered to the steam line.",
      "Priming = water carryover with steam.",
      "Solution: Priming occurs when the water level in the boiler is too high or when the boiler is subjected to sudden load changes, causing water droplets to be carried over with the outgoing steam. It can also occur due to foaming or high impurity concentration in the water. Priming produces wet steam that can cause water hammer and damage to steam equipment."),

    P("Foaming in a boiler is caused by:",
      "The formation of stable bubbles on the water surface due to high concentrations of dissolved solids, oils, or suspended matter in the boiler water.",
      "Foaming = stable bubbles from impurities.",
      "Solution: Foaming occurs when dissolved solids, organic matter, or oil contamination in the boiler water cause stable bubbles to form on the water surface. These bubbles do not break easily and can be carried into the steam space, leading to priming. Foaming is reduced by maintaining proper water treatment and performing periodic blow-down to control dissolved solids."),

    P("Caustic embrittlement in a boiler is defined as:",
      "Cracking of boiler metal in areas of high stress caused by concentrated caustic soda attacking the stressed regions of the boiler plates and tubes.",
      "Caustic embrittlement = stress corrosion cracking.",
      "Solution: Caustic embrittlement occurs when concentrated sodium hydroxide, also known as caustic soda, attacks the boiler metal at areas of high stress, such as around riveted joints and tube ends. The caustic solution penetrates into minute cracks in the metal, causing progressive cracking. This is a dangerous form of corrosion that can lead to sudden boiler failure."),

    P("Internal treatment of boiler feed water involves:",
      "Adding chemicals such as phosphates, carbonates, and sodium sulfite directly into the boiler water to control scale and corrosion.",
      "Internal treatment = chemical dosing inside boiler.",
      "Solution: Internal treatment involves injecting specific chemicals into the boiler water to prevent scale and corrosion. Phosphates convert hardness into soft sludge that can be blown down. Sodium sulfite removes dissolved oxygen. Sodium hydroxide maintains proper pH levels. The resulting soft sludge is removed by regular blow-down operations."),

    P("Deaeration of boiler feed water is necessary to:",
      "Remove dissolved oxygen and carbon dioxide from the feed water to prevent corrosion of boiler tubes and internals.",
      "Deaeration = removes dissolved gases.",
      "Solution: Dissolved oxygen in feed water causes pitting corrosion of boiler tubes and internals, while dissolved carbon dioxide forms carbonic acid that causes general corrosion. Deaeration involves heating the water to near its boiling point in a deaerator vessel to release the dissolved gases. This is an essential step in feed water treatment for ensuring boiler longevity and safe operation.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC4_BOILERS;
  if (typeof window !== "undefined") window.SSC_JE_ENC4_BOILERS = SSC_JE_ENC4_BOILERS;
})();

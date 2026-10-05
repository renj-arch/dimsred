(function () {
  function P(q, a, h, s) { return { q: q, a: a, h: h || "", s: s || "" }; }

  var SSC_JE_ENC5_POWERPLANT = {};
  SSC_JE_ENC5_POWERPLANT.powerplant = [

    P("In a coal-fired thermal power plant, what is the correct order of components in the flue gas path from the furnace to the chimney?",
      "The flue gas path is Furnace water wall → Superheater → Economizer → Air preheater → Chimney, with the economizer preheating feed water and the air preheater preheating combustion air before the gas leaves the stack.",
      "Flue gas gives up its heat to water and then to air before the chimney.",
      "Solution: The flue gas first transfers heat to the water wall and superheater where steam is raised and superheated. The gas then passes through the economizer, which preheats the feed water, and finally through the air preheater, which warms the combustion air. Only after these heat recovery stages does the cooled gas reach the chimney. This arrangement recovers the maximum usable heat from the combustion products."),

    P("What is the typical range of thermal efficiency of a modern coal-fired thermal power plant?",
      "A modern coal-fired thermal power plant typically has a thermal efficiency of about 30% to 38%.",
      "Coal plants convert only about one third of the fuel energy into electricity.",
      "Solution: The heat lost to the condenser, flue gas, and auxiliary systems keeps coal plant efficiency well below 50%. The steam Rankine cycle in coal plants commonly delivers 30% to 38% efficiency. Larger modern supercritical units tend toward the upper end of this range. This is why combined cycle plants, which reach 50% to 60%, are preferred where gas is available."),

    P("What is the station heat rate of a power plant?",
      "The station heat rate is the total heat energy input to the plant per unit of electrical energy output, expressed in kJ per kWh, and is calculated as 3600 divided by the overall plant efficiency.",
      "It links heat input to electrical output of the whole station.",
      "Solution: The station heat rate measures how much fuel energy is needed to produce one kWh of electricity at the generator terminals. Since one kWh equals 3600 kJ of energy, the heat rate in kJ/kWh is 3600 divided by the decimal plant efficiency. A plant with 36% efficiency has a station heat rate of about 10,000 kJ/kWh. Lower heat rate means better overall fuel economy."),

    P("Which components form the closed Rankine steam-water loop of a thermal power plant?",
      "The Rankine steam-water loop is Feed pump → Economizer → Boiler drum and water wall → Superheater → Turbine → Condenser → Condensate extraction pump → back to the feed pump.",
      "Follow the path of the same working fluid, water and steam.",
      "Solution: The same working fluid circulates continuously: feed pump raises its pressure, the economizer and boiler add heat to make steam, the superheater raises its temperature, and the turbine expands it to produce work. The condenser then condenses the exhaust steam back to liquid water, and the condensate pump returns it to the feed pump. All four main processes are pressurisation, heat addition, expansion, and heat rejection."),

    P("In the flue gas loop of a coal-fired plant, which two components act as the final low-grade heat recovery devices before the gases enter the chimney?",
      "The economizer and the air preheater are the final two heat recovery devices in the flue gas loop, placed between the superheater and the chimney.",
      "One heats the feed water and the other heats the combustion air.",
      "Solution: After the high-temperature superheater, the flue gas still carries significant low-grade heat. The economizer captures part of it to preheat the feed water, and the air preheater absorbs the remaining usable heat to warm combustion air. These two units lower the exit gas temperature and raise the boiler efficiency substantially. In most big units the air preheater is the last heat transfer surface before the chimney."),

    P("What is the approximate auxiliary power consumption of a coal-fired thermal power station as a percentage of gross generation?",
      "The auxiliary power consumption of a coal-fired thermal power station is typically about 5% to 10% of the gross power generated.",
      "Think of mills, fans, pumps, and lights inside the plant itself.",
      "Solution: A portion of the generated power is consumed in house, by pulverisers, induced and forced draught fans, boiler feed pumps, cooling water pumps, and lighting. This auxiliary consumption typically lies in the range of 5% to 10% of gross generation. The remaining power is delivered as net output to the grid. This is exactly why the net station efficiency is lower than the boiler thermal efficiency."),

    P("What is the main function of the superheater in a boiler of a thermal power station?",
      "The superheater raises the temperature of the saturated steam from the boiler drum above its saturation temperature, increasing the enthalpy of the steam and improving the cycle efficiency while reducing wetness at the turbine exhaust.",
      "It adds heat without raising pressure, drying and heating the steam.",
      "Solution: Steam leaving the boiler drum is saturated, and expanding it directly in the turbine would produce excessive moisture and reduce efficiency. The superheater adds heat to raise the steam to a high superheat temperature, typically 540°C to 570°C. This increases the available enthalpy drop in the turbine. It also keeps the exhaust steam dry enough to avoid blade erosion at the last stages."),

    P("Through which component does the cooling water loop of a thermal power plant absorb its heat input?",
      "The cooling water loop absorbs heat from the exhaust steam in the condenser, where the steam condenses by rejecting its latent heat to the cooling water, after which the warm water is cooled in a cooling tower or released to a water body.",
      "The condenser is the bridge between the steam loop and the cooling loop.",
      "Solution: The cooling water loop begins at the condenser cooling header, where circulation pumps push water through the condenser tubes. Latent heat released by condensing steam raises the cooling water temperature by typically 8°C to 12°C. The warm water then passes to a cooling tower, spray pond, or natural water body for heat rejection. The cooled water is recirculated or discharged, completing the loop."),

    P("In a surface condenser, on which side of the tube bundle does the condensing steam flow, and on which side does the cooling water flow?",
      "In a surface condenser the steam flows outside the tubes on the shell side and condenses on the tube outer surface, while cooling water flows inside the tubes on the tube side.",
      "The two fluids are separated by the tube wall and never mix.",
      "Solution: Cooling water enters the water boxes and flows through the tube interior in one or more passes. Steam enters the shell side and sweeps across the outside of the tube bundle, losing its latent heat to the water inside the tubes. The condensate drips down to the hotwell at the bottom of the shell. Because there is no direct contact, the condensate remains pure and can be reused as boiler feed water."),

    P("What is the most important advantage of a surface condenser compared with a jet condenser?",
      "The main advantage of a surface condenser is that the condensate remains pure and uncontaminated by the cooling water, so it can be returned directly to the boiler as feed water.",
      "Separation of the two fluids keeps the condensate clean.",
      "Solution: In a surface condenser the steam and cooling water are separated by tube walls, so dissolved minerals, salts, and impurities of the cooling water cannot enter the condensate. The pure condensate is therefore suitable for reuse in the boiler without elaborate treatment. In a jet condenser the two streams mix, contaminating the condensate and requiring extensive purification before reuse. This purity advantage makes surface condensers standard in large central stations."),

    P("How is the vacuum maintained in the condenser shell when air leaks into a power plant condenser?",
      "The vacuum is maintained by removing the non-condensable gases, chiefly air, with an air extraction pump or steam-jet air ejector connected to the condenser shell, while condensation itself creates the vacuum.",
      "Condensation shrinks the steam volume; the trapped air must then be pumped out.",
      "Solution: When steam condenses, its specific volume collapses dramatically, creating a low pressure in the shell. But air that leaks through glands and joints stays behind as a non-condensable gas and must be continuously removed, otherwise it blankets the tubes and destroys the vacuum. A dry air pump or air ejector draws this air out through the air-offtake connection. Continuous removal is essential because even small air leaks can seriously raise the condenser back pressure."),

    P("A surface condenser receives 200 kg per second of steam with a latent heat of 2300 kJ/kg. If the cooling water temperature rise is 10°C, what cooling water flow rate is required? Take the specific heat of water as 4.18 kJ per kg per K.",
      "The required cooling water flow rate is approximately 11,000 kg per second, giving a cooling water ratio of about 55 kg of water per kg of steam.",
      "Heat rejected by steam = heat gained by water: m_s times h_fg = m_w times c_p times ΔT.",
      "Solution: Heat rejected by the steam is 200 multiplied by 2300, which equals 460,000 kW. The water absorbs this heat following m_w times 4.18 times 10 = 460,000 kW, so m_w = 460,000 divided by 41.8, which gives about 11,005 kg per second. Rounded, the flow rate is approximately 11,000 kg per second. The cooling water ratio is therefore 11,000 divided by 200 = 55 kg of water per kg of steam, well within the typical 40 to 80 ratio."),

    P("Approximately what absolute back pressure and vacuum does a large modern thermal power plant condenser typically operate at?",
      "A large condenser typically operates at an absolute back pressure of about 0.04 to 0.07 bar, which corresponds to a vacuum of roughly 95% to 97%, meaning about 700 to 720 mm of mercury below atmospheric.",
      "Atmospheric pressure is about 1.013 bar or 760 mm of mercury.",
      "Solution: Atmospheric pressure is about 1.013 bar, equivalent to 760 mm of mercury. A condenser at 0.05 bar absolute therefore works at a vacuum of about 0.96 bar below atmospheric, that is roughly 96%, which corresponds to about 723 mm of mercury below the atmosphere. Operating at such a high vacuum maximises the enthalpy drop across the turbine. Even a small loss of vacuum measurably reduces the output and efficiency of the unit."),

    P("What is the hotwell in a surface condenser, and which pump draws the condensate from it?",
      "The hotwell is the condensation collection basin at the bottom of the surface condenser shell, from which the condensate extraction pump draws the pure condensate and delivers it to the feed system.",
      "It is the lowest point of the condenser, the collecting sump of the condensate.",
      "Solution: The condensed steam drips from the outside of the tube bundles down into the hotwell, which acts as a storage sump at the bottom of the shell. The condensate extraction pump, sometimes called the condensate pump, takes suction from the hotwell and delivers the water through the air ejector condenser, gland steam condenser, and LP heaters towards the deaerator. Maintaining a proper hotwell level is important to protect the pump and to store the water for the feed system."),

    P("How is condenser efficiency defined for a surface condenser?",
      "Condenser efficiency is the ratio of the actual cooling water temperature rise to the maximum possible rise, which is the steam saturation temperature minus the cooling water inlet temperature, multiplied by 100.",
      "It compares the achieved temperature rise with the theoretical maximum.",
      "Solution: If the cooling water enters at 30°C and exits at 40°C while the steam condensing temperature is 45°C, the actual rise is 10°C and the maximum possible rise is 15°C. Condenser efficiency is therefore 10 divided by 15, which gives 66.7%. This efficiency is a measure of how closely the condenser cools the water towards the steam temperature. Dirty tubes or air ingress reduce this ratio and hence the condenser efficiency."),

    P("What is the typical cooling water ratio, expressed in kg of cooling water per kg of steam condensed, for a surface condenser?",
      "The typical cooling water ratio for a surface condenser is about 40 to 80 kg of cooling water per kg of steam condensed.",
      "Compare the mass of water needed to condense each kg of steam.",
      "Solution: One kilogram of steam releases roughly 2300 to 2400 kJ of latent heat when it condenses, while each kilogram of cooling water can absorb only about 42 kJ for a typical 10°C rise. Several tens of kilograms of water are therefore needed per kilogram of steam to carry the heat away. The commonly quoted range in practice is 40 to 80 kg of water per kg of steam, depending on the allowed temperature rise. Two-pass condensers operate toward the lower end of this range at a larger temperature rise."),

    P("What happens to the condenser vacuum and plant efficiency when scale deposits form on the tube surfaces of a surface condenser?",
      "Scale deposits on the tubes increase the thermal resistance, reduce heat transfer, raise the condenser back pressure, and thereby lower the plant vacuum and overall efficiency.",
      "Scale acts as an insulator between steam and cooling water.",
      "Solution: Scale and fouling act as an additional thermal resistance on the water side of the tubes, which reduces the rate of heat transfer from steam to water. Less heat is rejected, so the condensing temperature and pressure rise, and the vacuum deteriorates. A higher exhaust pressure reduces the available enthalpy drop in the turbine and thus the power output and efficiency. Regular on-load tube cleaning or chlorination is used to keep the tubes clean."),

    P("Why does operating the condenser at a higher vacuum improve the efficiency of the Rankine cycle?",
      "Operating at a higher vacuum lowers the turbine exhaust pressure, which enlarges the enthalpy drop available across the turbine, allowing more work to be extracted from the same heat input.",
      "A lower exhaust pressure means a longer vertical drop on the T-s diagram.",
      "Solution: In the Rankine cycle, the useful work is the enthalpy difference between turbine inlet and exhaust steam. Lowering the exhaust pressure moves the exhaust state lower on the T-s diagram, increasing this enthalpy difference and the work output. Since the heat input stays essentially unchanged, the cycle efficiency rises. The practical trade-off is that a very deep vacuum increases the cost of a larger condenser and cooling system."),

    P("What is the difference between a dry air pump and a wet air pump used with a condenser?",
      "A dry air pump deals only with the non-condensable gases from the condenser, whereas a wet air pump handles a mixture of air and condensate together.",
      "Wet pumps handle liquid along with the air; dry pumps handle air alone.",
      "Solution: In a dry air pump arrangement, the air drawn from the condenser passes through a separator so that only gas reaches the pump, which keeps the pump clear of water. A wet air pump simply lifts the air together with the condensate water that trickles into it, so it must be able to pass liquid. Wet pumps are usually double-acting reciprocating pumps of robust construction. Modern plants prefer dry air extraction with steam-jet ejectors or water-ring vacuum pumps."),

    P("How is condensation achieved in a jet or ejector condenser?",
      "In a jet condenser the exhaust steam mixes directly with the injected cooling water, and condensation takes place by direct contact between the two streams.",
      "No tube bundle separates the steam from the cooling water.",
      "Solution: Cooling water is sprayed or injected in finely divided form into the path of the exhaust steam in a jet condenser. The steam and water come into direct contact, and the latent heat is transferred by mixing, so steam condenses rapidly. The mixture falls to the bottom, and a pump removes the combined water plus condensate. Because the fluids mix, the recovered water is contaminated and needs treatment, which is why jet condensers are little used in large modern stations."),

    P("What is the principal purpose of the deaerator in the feed water system of a thermal power plant?",
      "The deaerator removes dissolved gases, chiefly oxygen and carbon dioxide, from the feed water to prevent corrosion in the boiler and feed system, while also acting as a direct-contact feed water heater.",
      "Dissolved gases are the enemies of the boiler, causing pitting corrosion.",
      "Solution: Oxygen and carbon dioxide dissolved in feed water are highly corrosive, attacking economiser tubes, boiler drums, and turbine blading. The deaerator scrubs the water with steam, which strips these gases and vents them to atmosphere from the top of the vessel. Typically it brings the oxygen content down to below 5 parts per billion. It also heats the water to nearly its saturation temperature, storing deaerated feed water ready for the boiler feed pumps."),

    P("Approximately what temperature does feed water attain at the outlet of a typical deaerator, and what oxygen level does it achieve?",
      "Feed water leaves a typical deaerator at about 103°C to 105°C, which is close to the saturation temperature at its operating pressure, and the dissolved oxygen is reduced to below 0.005 ppm.",
      "The deaerator operates just above one atmosphere, so its exit temperature is just above 100°C.",
      "Solution: The deaerator shell typically operates at about 1.2 bar absolute pressure, whose saturation temperature is roughly 104°C. The treated water leaves the deaerating tray at this temperature, which is close to 103°C to 105°C. Scrubbing with low-pressure steam drives the dissolved oxygen down to values below 0.005 ppm, often written as less than 5 ppb. This low oxygen content protects the boiler and feed circuit from pitting corrosion."),

    P("Why does regenerative feed water heating, using steam bled from the turbine, improve the thermal efficiency of the Rankine cycle?",
      "Regenerative feed heating raises the average temperature at which heat is added to the cycle, reducing the thermal irreversibility of heat addition and therefore improving the cycle efficiency.",
      "Warming the water before it enters the boiler reduces the temperature jump in the boiler.",
      "Solution: In a simple Rankine cycle the feed water enters the boiler at a low temperature, so much of the heat input raises the water only to saturation before any steam is produced. By bleeding steam from the turbine and using its heat to pre-warm the feed water, the average temperature of heat addition is raised. This reduces the temperature difference between the flame and the working fluid where heat is transferred, lowering irreversibility and raising efficiency. The benefit more than offsets the small loss of work in the turbine caused by the bleeding."),

    P("By approximately what amount can an air preheater improve the overall thermal efficiency of a boiler?",
      "An air preheater can improve the overall boiler efficiency by approximately 5% to 10% by recovering low-grade heat from the flue gas to preheat the combustion air entering the furnace.",
      "Warm combustion air means less fuel is needed to sustain the furnace temperature.",
      "Solution: The air preheater traps the residual heat in the flue gas after the economiser and transfers it to the combustion air. Hotter air improves the ignition and combustion of coal, raises the furnace temperature, and reduces the fuel consumption for the same steam output. The recovered heat lowers the flue gas exit temperature and thus the stack losses. The resulting improvement in overall boiler efficiency is commonly quoted as 5% to 10%."),

    P("Why are high-pressure feed water heaters placed close to the boiler in the feed water line?",
      "High pressure feed water heaters are placed close to the boiler because they operate at the highest feed water pressure and receive steam extracted from the higher pressure stages of the turbine.",
      "The heaters nearest the boiler see the highest feed water pressure and temperature.",
      "Solution: The feed water pressure is highest at the boiler feed pump discharge, so the HP heaters are located just downstream of the feed pump, immediately before the economiser. They use steam bled from the higher-pressure turbine stages, whose saturation temperature is higher than that of LP heater bled steam. This allows the feed water to be heated to a high temperature closer to saturation as it enters the boiler. Arranging heaters this way spreads the feed water heating across the LP and HP sections."),

    P("What is the primary function of the economiser in the feed water system of a boiler?",
      "The primary function of the economiser is to preheat the feed water by recovering heat from the flue gases before the water enters the boiler drum, thereby reducing the fuel consumption and ground heat losses.",
      "It is a shell and tube or finned tube heat exchanger on the water side of the boiler.",
      "Solution: The economiser is fitted in the gas duct between the superheater and the air preheater, and the feed water is pumped through its tubes. Flue gas flowing over the tubes transfers heat to the water, raising its temperature close to but below saturation. This reduces the quantity of heat that the evaporator section must supply to convert the water to steam. The resulting saving in fuel is the main economic justification for installing the economiser."),

    P("From where is the steam used for feed water heating in a regenerative cycle obtained?",
      "The heating steam is extracted or bled from intermediate stages of the turbine at pressures corresponding to the feed water temperature required in each heater.",
      "Different stages of the turbine supply steam at different temperatures.",
      "Solution: Tappings are taken from selected stages of the HP and LP turbines where the steam has expanded partially and its saturation temperature suits the given heater. High-pressure steam bleeds feed the HP heaters, and low-pressure bleeds feed the LP heaters. Each bleed is chosen so that the steam condensation temperature is above the feed water outlet temperature of that heater. This staged extraction keeps the temperature differences small and the gains in efficiency high."),

    P("What is meant by the approach of a cooling tower?",
      "The approach of a cooling tower is the difference between the cold water temperature leaving the tower and the ambient wet-bulb temperature, and it shows how close the tower comes to the theoretical minimum achievable temperature.",
      "The smallest cold water temperature possible is the ambient wet-bulb temperature.",
      "Solution: Water cooled by evaporation can never be colder than the local ambient wet-bulb temperature, because enthalpy transfer stops when the air at the exit is saturated at the water temperature. The approach therefore measures the temperature gap achieved above this theoretical floor. A small approach means a large tower or high fan power, hence there is an economic optimum. Values of 3°C to 8°C are typical for well-designed mechanical draught towers."),

    P("What is meant by the range of a cooling tower?",
      "The range of a cooling tower is the temperature difference between the hot water entering the tower and the cold water leaving it, and it represents the actual temperature drop achieved in cooling.",
      "Range is the drop across the tower; approach is the gap to wet-bulb.",
      "Solution: The hot water from the condenser enters the distribution basin at the top of the tower, and the cooled water falls into the pond at the bottom. The range is simply hot water temperature minus cold water temperature, for example 40°C minus 30°C gives a range of 10°C. The range is governed by the condenser heat load and the water circulation rate. A larger range reduces the water flow required for a given heat load."),

    P("What is the fundamental difference between a natural draught and an induced draught cooling tower?",
      "A natural draught tower relies on the buoyancy of the warm saturated air inside its hyperbolic shell to draw air through the fill, while an induced draught tower uses mechanical fans at the top to draw air through the fill.",
      "One needs no fan; the other draws air mechanically.",
      "Solution: In a natural draught tower the difference in density between the hot moist air inside the shell and the cooler ambient air creates an upward air movement, so no fan is required. In an induced draught tower, axial flow fans are mounted at the top outlet, pulling air upward through the packing at a controlled rate. Induced draught towers are smaller and cheaper, but natural draught towers have lower running cost and larger capacity. The hyperbolic shape of the natural draught shell both supports the structure and reduces constriction of the rising air."),

    P("In what type of cooling arrangement is water drawn from a river or lake, passed through the condenser once, and returned directly to the same water body?",
      "In a once-through or open cooling system, the cooling water is taken from a natural water body, passed through the condenser a single time, and discharged back to the same source at a higher temperature.",
      "The name gives it away: the water passes the condenser only once.",
      "Solution: A once-through system needs no cooling tower, because the large body of river, lake, or sea water absorbs the rejected heat. The water is withdrawn, pumped through the condenser tubes, and discharged at a temperature higher by typically 8°C to 12°C. Its appeal lies in simplicity and low initial cost, but it requires a large and reliable water source. Thermal discharge regulations often limit its use today."),

    P("Why are cooling towers essential in a thermal power plant that does not have an abundant natural water body nearby?",
      "Cooling towers are needed to conserve water by recirculating the cooling water, avoid thermal pollution of natural sources, and give consistent performance irrespective of the site water availability.",
      "They allow the same water to be reused over and over.",
      "Solution: In a recirculating system the water that absorbs heat in the condenser is cooled in the tower and returned to the condenser, so only makeup water for evaporation, drift, and blowdown is needed. This conserves water compared with a once-through system and prevents dumping hot water into rivers and lakes. The tower also decouples the plant from the seasonal temperature of the natural water source. The slight penalty is the power consumed by the fans and the makeup water requirement."),

    P("Where are the fans mounted in an induced draught cooling tower, and in which direction do they move the air?",
      "In an induced draught cooling tower the fans are mounted at the top of the tower and draw air upward from the bottom, through the fill material, discharging the saturated warm air from the top.",
      "Induced draught pulls the air through rather than pushing it in.",
      "Solution: The axial fans are installed at the outlet on the roof of the tower, and they create a slight suction inside the tower. Ambient air is drawn in through louvers at the base, rises through the falling water in the fill, and is discharged at the top with a high moisture content. This pulling action avoids re-circulation of the warm discharged air through the inlet, which is a problem in forced draught designs. The fans also allow the water to be distributed more evenly."),

    P("Describe the main elements of the cooling water circuit of a thermal power plant.",
      "The cooling water circuit consists of the cooling water pumps, the condenser water boxes and tubes, the cooling tower or spray pond, and the interconnecting piping, in which water picks up heat in the condenser and rejects it to the atmosphere in the tower.",
      "The circuit is a heat transport loop between condenser and atmosphere.",
      "Solution: In the closed loop, a large circulating water pump takes suction from the cooling tower cold water basin and pushes water through the condenser water box into the tube bundles. The warm water leaves the condenser and is sprayed over the tower packing, where it cools by evaporation. The cooled water collects in the basin and returns to the pump suction, completing the loop. Makeup water replaces the losses by evaporation, drift, and blowdown. Fan power and pump power are the main parasitic loads of this circuit."),

    P("Which cooling tower type is recognised by its tall hyperbolic concrete shell?",
      "A natural draught cooling tower is recognised by its tall hyperbolic reinforced concrete shell, which produces the natural chimney effect without any mechanical fan.",
      "The shell shape both weathers the stack and improves the draught.",
      "Solution: The hyperbolic shape reduces the cost of material while withstanding the ring tension from the dead weight of the concrete, and at the same time provides a smooth accelerating throat for the ascending air. The warm moist air inside the shell is lighter than the outside air, so it rises by natural convection and draws fresh air in at the base. Towers of more than 100 m height are common and can cool water through 10°C to 20°C without any fan. They are quieter and cheaper to run than mechanical draught towers."),

    P("What is meant by draught in a boiler of a thermal power plant?",
      "Draught is the pressure difference maintained between the furnace and flue gas system and the atmosphere, which is required to draw the combustion air into the furnace and to push the flue gas out through the chimney.",
      "It is the driving force that moves air and gas through the boiler.",
      "Solution: For combustion, air must enter the furnace and the resulting products of combustion must be discharged to the atmosphere, and both of these movements require a pressure difference. This differential between the gas side and the atmosphere is called draught. Its magnitude must be enough to overcome the frictional resistance of the fuel bed, tubes, baffles, ducts, and the stack. Draught is measured in millimetres of water column using a U-tube manometer, because these pressure differences are very small."),

    P("Write the formula for the natural draught produced by a chimney in terms of its height and the absolute temperatures of the air and flue gas.",
      "Natural draught in mm of water column is given by h = 353 multiplied by the chimney height H in metres, multiplied by the difference of the reciprocals of the ambient temperature 1/Ta and the flue gas temperature 1/Tg taken in Kelvin.",
      "Draught depends directly on chimney height and on the reciprocal temperature difference.",
      "Solution: The driving force arises from the density difference between the hot column of gas in the chimney and the cooler atmospheric air beside it. Treating both as gases following the ideal gas law, the draught comes to 353H(1/Ta − 1/Tg) mm of water column. For example, a 100 m chimney with air at 300 K and gas at 450 K gives 353 times 100 times 0.001111, which is about 39 mm of water. The formula makes plain that draught rises with chimney height and with the temperature difference."),

    P("Which two fans are used in a balanced draught system, and what pressure is maintained in the furnace?",
      "A balanced draught system uses a forced draught fan to push air into the furnace and an induced draught fan to draw the flue gas out, holding the furnace at a pressure very close to atmospheric.",
      "One fan pushes cold air in, the other pulls the hot gas out.",
      "Solution: The forced draught fan is placed ahead of the furnace, usually after the air preheater, and delivers combustion air at a positive pressure. The induced draught fan is placed in the flue gas path, normally before the chimney or dust collector, and creates a slight negative pressure at the furnace outlet. By balancing the two fans, the furnace operates at almost atmospheric pressure. This combined system is the most common arrangement for large boiler installations."),

    P("Why is the furnace of a large modern boiler normally kept at a slight negative pressure?",
      "Keeping the furnace slightly negative prevents the hot flue gas and flame from leaking out through openings into the boiler room, protecting the operators and nearby equipment from fires and hot gas.",
      "Outward leakage of hot gas is dangerous; inward air leakage is merely wasteful.",
      "Solution: Boiler walls are never perfectly airtight, and the casing contains doors, dampers, and inspection openings. If the furnace pressure were positive, the scorching flue gas and flame could escape through these gaps and seriously injure personnel or ignite accumulations. A moderate negative pressure of a few millimetres of water column ensures that any leakage is inward air rather than outward gas. Induced draught alone usually produces this condition, which is one reason ID fans are preferred for large units."),

    P("What is forced draught, and what pressure condition does it create in the furnace?",
      "Forced draught is the system in which a fan placed before the furnace pushes combustion air into the furnace through the air ducts and grate, creating a slightly positive pressure in the furnace.",
      "The fan is on the cold-air side, ahead of the boiler.",
      "Solution: In forced draught a centrifugal fan is located after the air preheater, and it forces the preheated air into the wind box and fuel bed. Because the fan is pushing the air, the furnace pressure tends to be slightly above atmospheric. This arrangement gives good control of combustion air supply and is compact, since the fan handles cool clean air. The positive furnace pressure, however, makes outward leakage of gas a safety hazard, so forced draught is used alone mostly in smaller boilers."),

    P("What is the typical draught required to overcome the frictional resistances and support combustion in a small boiler?",
      "The draught required to overcome friction and support combustion in a small boiler is typically about 10 to 20 mm of water column.",
      "Bigger boilers need larger draughts of several tens of millimetres.",
      "Solution: The total draught needed must balance the losses in the fuel bed, over the tube banks, through the dampers, and along the ducts and chimney. For small boilers firing coal on a grate, these losses total roughly 10 to 20 mm of water column. Large water-tube and pulverised fuel boilers with high gas velocities require much more, often 50 to 100 mm of water column. Numbers in this range are a good benchmark for examination problems."),

    P("Why is natural draught from a chimney alone usually insufficient for large modern power station boilers?",
      "Natural draught is insufficient at high loads and at warm ambient temperatures because the small pressure difference it creates cannot push the large volume of flue gas through the high-resistance circuits of a large boiler.",
      "The propulsive force of a chimney is small and varies with weather.",
      "Solution: The natural draught depends on the density difference between hot gas and ambient air, which limits it to a few tens of millimetres of water. Large boilers with economisers, air preheaters, and dust collectors impose a resistance much larger than what a practical chimney can overcome. At high ambient temperatures the air density falls and the draught weakens exactly when output is high. Forced or induced draught fans are therefore fitted on all large units, and they also give the controllable airflow that combustion control demands."),

    P("What is induced draught, and where is the fan located relative to the boiler?",
      "Induced draught is the system in which a fan placed after the boiler, usually just before the chimney or dust collector, draws the flue gas through the boiler and creates a slight negative pressure in the furnace.",
      "The fan is on the hot-gas side of the boiler, sucking the gas out.",
      "Solution: The induced draught fan takes its suction from the boiler outlet ductwork, so it pulls the products of combustion through the water tubes, superheater, economiser, air preheater, and any dust collection equipment. Because the fan is downstream, the furnace operates under a small negative pressure, which keeps hot gas from blowing out of the boiler. The fan handles hot, dust-laden gas and so is costlier and more prone to erosion and wear. Despite this, the safety and control advantages make it the standard choice for large plants."),

    P("What is the load factor of a power plant?",
      "The load factor is the ratio of the average load during a given period to the maximum demand during the same period, and it is a measure of the capacity utilisation of the plant.",
      "Average load divided by maximum demand over the same time.",
      "Solution: Load factor is computed as the energy produced divided by the energy the plant would have produced if it ran at its maximum demand for the whole period. A daily load factor of 1 means the plant ran at peak level all day, which never happens in practice. Typical values for base load plants are 60% to 80%, and for peaking plants they are much lower. A high load factor indicates good utilisation of the installed plant."),

    P("A power plant has a maximum demand of 100 MW and produces 350,000 MWh of electrical energy in one year. What is its annual load factor?",
      "The annual load factor is 40%, obtained by dividing 350,000 MWh by the product of 100 MW and 8760 hours per year, which is 350,000 divided by 876,000 = 0.40.",
      "Load factor = energy generated divided by (maximum demand multiplied by hours in the year).",
      "Solution: The maximum possible energy at the maximum demand is 100 MW multiplied by 8760 hours, which is 876,000 MWh. Dividing the actual energy of 350,000 MWh by this maximum gives 350,000 divided by 876,000. This works out to 0.3995, or approximately 0.40. Expressed as a percentage, the annual load factor is therefore 40%."),

    P("What is the diversity factor of a power system?",
      "The diversity factor is the ratio of the sum of the individual maximum demands of the consumers to the maximum demand of the whole group, and its value is always greater than 1.",
      "Individual peaks do not all occur at the same time, so the group peak is smaller than the sum of the peaks.",
      "Solution: Each consumer reaches its maximum demand at a different time of day, so the combined maximum demand of all consumers together is smaller than the sum of their individual maxima. The diversity factor, defined as the sum of the individual maxima divided by the group maximum demand, therefore exceeds unity. A high diversity factor means the plant capacity can be smaller than the sum of all consumer demands. It is a planning parameter for sizing generating stations and feeders."),

    P("What is the demand factor of a power system?",
      "The demand factor is the ratio of the maximum demand on the power system to the total connected load of all the consumers, and its value is always less than 1.",
      "Maximum demand is always less than the total connected load because no consumer operates everything at once.",
      "Solution: The connected load is the sum of the rated capacities of all appliances and devices that may be switched on, while the maximum demand is the highest load that actually occurs. Since consumers never operate every installed device simultaneously, the actual maximum demand is a fraction of the connected load. The demand factor is this fraction, usually between 0.4 and 0.8 for residential systems. Utilities use it to judge how much of the connected load will realistically draw power."),

    P("A power plant has a rated capacity of 120 MW and it supplies an average load of 48 MW throughout the year. What is its annual capacity factor?",
      "The annual capacity factor is 40%, calculated as the average load of 48 MW divided by the rated capacity of 120 MW, which equals 0.40.",
      "Capacity factor = average load divided by rated capacity.",
      "Solution: The capacity factor compares the actual average output with the nameplate rated capacity of the plant. Dividing the average load of 48 MW by the rated capacity of 120 MW gives 48 divided by 120, which equals 0.40. In percentage form this is 40%. The capacity factor indicates how much of the installed capacity is actually exploited year-round, and 40% is typical of an intermediate duty plant."),

    P("What is cogeneration or combined heat and power, and what is its main benefit?",
      "Cogeneration is the simultaneous production of electrical power and useful thermal heat from a single fuel source, and its main benefit is that the overall fuel utilisation efficiency reaches about 70% to 80% instead of the 30% to 40% of power-only plants.",
      "Waste heat that would be rejected to the condenser is put to use instead.",
      "Solution: In a normal condensing plant, around two-thirds of the fuel energy is rejected as low-grade heat to the cooling system. A cogeneration plant captures part of this heat and supplies it for process steam, space heating, or district heating. By producing power and heat together, the overall first-law efficiency of fuel use rises to roughly 70% to 80%. The economic gain is largest when the electricity and the heat can both be used at or near the plant site."),

    P("What is the typical overall efficiency of a combined cycle gas turbine (CCGT) power station?",
      "A combined cycle gas turbine power station typically achieves an overall efficiency of about 50% to 60%.",
      "The gas turbine tops the cycle and the waste-heat steam cycle recovers the rest.",
      "Solution: In a combined cycle plant, the hot exhaust of a gas turbine produces steam in a heat recovery steam generator that drives a steam turbine. The gas turbine contributes about two-thirds of the output and the steam turbine the rest, both from the same fuel. By topping the gas cycle with high-temperature combustion and recovering the exhaust heat, overall efficiencies of 50% to 60% are achieved. This is why CCGT plants are preferred for base and intermediate load where natural gas is available at lower prices."),

    P("What is the utilisation factor of a power plant?",
      "The utilisation factor is the ratio of the maximum demand of a plant to its rated capacity, expressing how much of the installed capacity is called upon to meet the peak load of the system.",
      "Maximum demand divided by rated capacity.",
      "Solution: The utilisation factor compares the maximum demand that actually comes on the plant with the rating at which the plant is capable of operating. If a 200 MW plant is called to serve a peak of 160 MW, its utilisation factor is 160 divided by 200, or 0.8. A low utilisation factor means valuable capacity is idle for most of the time. It is used together with the load factor and demand factor in deciding plant sizing and investment."),

    P("What is a binary vapour cycle, and what is the purpose of the second working fluid?",
      "A binary vapour cycle is a combined cycle in which a high-temperature working fluid, such as mercury heliacol or an organic fluid, drives a topping turbine and rejects heat to a steam cycle that serves as the bottoming plant, the purpose being to raise the cycle efficiency.",
      "Two fluids are used so that the temperature range of heat rejection and addition can be widened.",
      "Solution: No single working fluid gives both a very high critical temperature for heat addition and a low freezing point for heat rejection. In a binary vapour cycle the topping fluid operates over the higher temperature range and rejects its heat to the vapour of the bottoming cycle, which is usually water and steam. This staged arrangement raises the average temperature of heat addition and lowers the temperature of heat rejection. The result is a cycle efficiency higher than either fluid could produce alone."),

    P("Why must boiler feed water be chemically conditioned in a thermal power station?",
      "Feed water is chemically conditioned to prevent scale formation, sludge deposition, and corrosion inside the boiler tubes, economiser, and superheater, which would otherwise reduce heat transfer and cause tube failures.",
      "Untreated water causes hard deposits and corrosion that ruin the boiler.",
      "Solution: Impurities entering with the feed water become concentrated in the boiler as evaporation proceeds, depositing hard scale on the hot tube surfaces. Scale is a poor conductor of heat, so the tube metal overheats and may fail catastrophically. Dissolved oxygen and carbon dioxide cause pitting corrosion that also weakens the tubes. Conditioning the water with treatments and maintaining proper pH and phosphate or amine control keeps the internal surfaces clean and protected."),

    P("What is boiler blowdown, and why is it carried out during operation?",
      "Blowdown is the controlled discharge of a portion of the concentrated boiler water to remove dissolved and suspended impurities, keeping the solids concentration within safe limits and preventing scale and carryover.",
      "It is a deliberate wasting of some water to throw away the concentrated solids.",
      "Solution: As water evaporates to form steam, the dissolved solids left behind become steadily more concentrated in the boiler. Blowdown periodically or continuously drains a small fraction of this concentrated water and replaces it with fresh feed water, limiting the concentration build-up. This prevents scale formation on tubes and avoids foaming and carryover of water with the steam. The blowdown heat can be recovered in a flash tank and heat exchanger to improve efficiency."),

    P("What is the purpose of soot blowing in the economiser and air preheater of a boiler?",
      "Soot blowing removes the ash, soot, and other deposits that collect on the heat transfer surfaces of the economiser and air preheater, restoring heat transfer and preventing a fall in boiler efficiency.",
      "Ash deposits act as an insulating blanket on the heat transfer surfaces.",
      "Solution: Flue gas from coal firing carries fine ash particles that deposit onto the outside of economiser tubes and the plates of the air preheater. These deposits are poor conductors, so the heat transfer falls and the exit gas temperature rises, increasing stack losses. Soot blowers using high-pressure steam or air blast clean the surfaces at regular intervals. Keeping these surfaces clean maintains the flue gas temperature at its design value and protects the fan and chimney from excessive gas temperature."),

    P("What is the difference between the thermal efficiency and the overall or net plant efficiency of a thermal power station?",
      "The overall plant efficiency is lower than the thermal efficiency because it deducts the auxiliary power consumption, about 5% to 10% of gross generation, and other station losses from the gross electrical output before comparing with the fuel input.",
      "Thermal efficiency uses gross generation; overall efficiency uses net sent-out power.",
      "Solution: Thermal efficiency compares the heat input with the gross electrical energy generated at the generator terminals. The net or overall station efficiency compares the heat input with the energy actually sent out to the grid, after subtracting auxiliary consumption for fans, mills, and pumps. Since auxiliary power is typically 5% to 10% of gross generation, the net efficiency is correspondingly lower. Both values are used, but the net figure is the one that matters commercially."),

    P("Which type of generating plant is usually chosen to serve peak loads, and why?",
      "Gas turbines and pumped storage hydro plants are usually chosen for peak load service because they can start quickly, often in a few minutes, and can be loaded and unloaded rapidly, although their generation costs are high.",
      "Peaking plants must respond fast even though they are expensive per kWh.",
      "Solution: Peak loads last only a few hours per day, so the plants that serve them must be able to pick up load rapidly from stand-still. Gas turbines can synchronise and reach full load within minutes, matching the steep morning and evening load rise. Pumped storage plants shift cheap off-peak energy to the peak period by pumping water uphill and generating later. Their high specific fuel cost is acceptable because they run only for short durations. Base load plants, by contrast, are slow to change load but cheap to run."),

    P("Why are renewable energy plants, such as solar and wind, often operated as peaking or intermediate plants?",
      "Renewable plants are intermittent and variable in output, so they cannot be depended upon for continuous base load duty, and they are therefore treated as peaking or intermediate generation.",
      "The wind does not blow and the sun does not shine on command.",
      "Solution: The output of a wind farm changes with the wind speed and of a solar plant with cloud cover, so the dispatchable power is not firm. System operators can only count on a fraction of rated capacity as reliable firm capacity. Renewable plants therefore serve the variable part of the load curve when their resource is available, while controllable thermal and hydro plants provide the firm base. As storage capacity grows, renewables can be shifted toward more base-load-like operation."),

    P("What is the typical plant availability factor of a well-maintained thermal power station?",
      "A well-maintained thermal power station typically achieves a plant availability of about 85% to 95%, meaning it is capable of generating power for that fraction of the time.",
      "Availability measures the time the plant is ready to generate, not how much it actually generates.",
      "Solution: Availability is the percentage of time in a year that the generating unit is in a condition to run, ignoring the periods when it is not required. It is higher than the load factor because a plant may be available but not loaded. Planned maintenance and forced outages reduce availability, so good maintenance planning is essential to hold it above 90%. This KPI is separate from the capacity factor, which reflects the actual energy produced."),

    P("During the shut-down of a boiler, why should the boiler not be left empty and open to the atmosphere?",
      "An empty boiler left open to air would rust and corrode internally because the moisture and oxygen in the atmosphere attack the bare metal, so it is instead kept filled with treated water or blanketed with nitrogen.",
      "Atmospheric oxygen plus moisture is a straight route to rust.",
      "Solution: After a boiler is emptied, the wet internal surfaces are exposed to the oxygen in the atmospheric air that replaces the steam. This produces rust and pitting corrosion on the drum, headers, and tubes, which would later flake off and cause problems. The standard protection is to fill the boiler completely with oxygen-free treated water under a small nitrogen pad. Alternatively, a nitrogen blanket is maintained to exclude air. This lay-up practice prevents damage during the idle period and protects the tubes for a long plant life.")

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = SSC_JE_ENC5_POWERPLANT;
  if (typeof window !== "undefined") window.SSC_JE_ENC5_POWERPLANT = SSC_JE_ENC5_POWERPLANT;
})();